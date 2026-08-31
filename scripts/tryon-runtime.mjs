/**
 * The virtual try-on runtime: MediaPipe's WebAssembly and face-landmark
 * model, plus the Draco and Basis decoders three.js needs for compressed
 * frame models. About 20 MB that must be served from somewhere.
 *
 *   node scripts/tryon-runtime.mjs prepare [--if-needed]
 *     Copies the runtime under public/tryon-runtime (git-ignored) and
 *     downloads the landmark model, so the try-on works on a dev server.
 *     With --if-needed it does nothing when NEXT_PUBLIC_TRYON_RUNTIME_URL
 *     is set, and a failed model download only warns  a build must not
 *     depend on Google's storage being reachable.
 *
 *   node scripts/tryon-runtime.mjs publish
 *     Prepares, then uploads the runtime to the R2 bucket under a versioned
 *     prefix and prints the NEXT_PUBLIC_TRYON_RUNTIME_URL to set. Serving it
 *     from the bucket costs nothing per download; serving it from the app
 *     container would be billed as egress on every first visit.
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(root, "public", "tryon-runtime");
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const mediapipeDir = join(root, "node_modules/@mediapipe/tasks-vision");
const threeLibs = join(root, "node_modules/three/examples/jsm/libs");
const version = JSON.parse(readFileSync(join(mediapipeDir, "package.json"), "utf8")).version;

const CONTENT_TYPES = {
  ".js": "text/javascript",
  ".wasm": "application/wasm",
  ".task": "application/octet-stream",
};

const copyAll = (from, to, files) => {
  mkdirSync(to, { recursive: true });
  for (const file of files) {
    writeFileSync(join(to, file), readFileSync(join(from, file)));
  }
};

async function prepare({ ifNeeded }) {
  if (ifNeeded && process.env.NEXT_PUBLIC_TRYON_RUNTIME_URL) {
    console.log("tryon-runtime: served from NEXT_PUBLIC_TRYON_RUNTIME_URL, nothing to prepare.");
    return false;
  }

  const wasmDir = join(mediapipeDir, "wasm");
  copyAll(wasmDir, join(OUT, "mediapipe"), readdirSync(wasmDir));
  copyAll(join(threeLibs, "draco/gltf"), join(OUT, "draco"), [
    "draco_decoder.js",
    "draco_decoder.wasm",
    "draco_wasm_wrapper.js",
  ]);
  copyAll(join(threeLibs, "basis"), join(OUT, "basis"), [
    "basis_transcoder.js",
    "basis_transcoder.wasm",
  ]);

  const modelPath = join(OUT, "models", "face_landmarker.task");
  if (!existsSync(modelPath)) {
    mkdirSync(dirname(modelPath), { recursive: true });
    try {
      const response = await fetch(MODEL_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      writeFileSync(modelPath, Buffer.from(await response.arrayBuffer()));
      console.log("tryon-runtime: downloaded face_landmarker.task");
    } catch (error) {
      const message = `tryon-runtime: could not download the landmark model (${error.message}).`;
      if (!ifNeeded) throw new Error(message);
      console.warn(`${message} The try-on will report itself unavailable until it is published or the download succeeds.`);
    }
  }

  console.log(`tryon-runtime: prepared under public/tryon-runtime (MediaPipe ${version}).`);
  return true;
}

/** Reads .env for the R2 variables when they are not already exported. */
const loadEnv = () => {
  const path = join(root, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
};

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

async function publish() {
  await prepare({ ifNeeded: false });
  loadEnv();

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME = "metro",
    NEXT_PUBLIC_R2_PUBLIC_URL,
  } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !NEXT_PUBLIC_R2_PUBLIC_URL) {
    throw new Error("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and NEXT_PUBLIC_R2_PUBLIC_URL must be set.");
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });

  const prefix = `tryon-runtime/v${version}`;
  const files = walk(OUT);
  for (const file of files) {
    const key = `${prefix}/${relative(OUT, file).split("\\").join("/")}`;
    const extension = file.slice(file.lastIndexOf("."));
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: createReadStream(file),
        ContentLength: statSync(file).size,
        ContentType: CONTENT_TYPES[extension] || "application/octet-stream",
        // The prefix carries the version, so the files under it never change.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    console.log(`uploaded ${key}`);
  }

  const base = NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/+$/, "");
  console.log(`\nDone. Set this on Railway and redeploy (it is a build-time value):\n`);
  console.log(`  NEXT_PUBLIC_TRYON_RUNTIME_URL=${base}/${prefix}\n`);
  console.log("The bucket needs a CORS rule allowing GET from the site's origin  see RAILWAY.md.");
}

const [command = "prepare", ...flags] = process.argv.slice(2);
const run = command === "publish" ? publish() : prepare({ ifNeeded: flags.includes("--if-needed") });
run.catch((error) => {
  console.error(error.message);
  process.exit(1);
});
