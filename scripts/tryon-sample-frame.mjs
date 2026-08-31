/**
 * A frame model, to scale, from the catalogue millimetres.
 *
 *   node scripts/tryon-sample-frame.mjs --lens 52 --bridge 18 --temple 140 \
 *        --shape rectangle --colour 1b1713 --out my-frame.glb
 *
 * Options: --shape rectangle|square|round|oval|geometric|browline|cat_eye|aviator
 *          --rim 5 (mm of rim outside the lens)   --depth 4.5 (front thickness, mm)
 *          --colour rrggbb (frame)                --lens-tint rrggbb --lens-alpha 0.22
 *
 * This is the "template" digitisation route: the geometry is built from the
 * numbers, so it cannot be the wrong size, and the file follows the try-on's
 * model convention exactly  metres, origin at the centre of the bridge on
 * the rear plane, front facing +Z, temples towards −Z, a material named
 * "lens", and hinge_left / hinge_right nodes the engine can splay.
 * Enter the printed width as the caliper reading when you upload it.
 */
import { writeFileSync } from "node:fs";
import * as THREE from "three";

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split(/\s+--/).filter(Boolean).map((pair) => {
    const [key, ...rest] = pair.replace(/^--/, "").split(/[\s=]+/);
    return [key, rest.join(" ") || "true"];
  }),
);

const lens = Number(args.lens ?? 52);
const bridge = Number(args.bridge ?? 18);
const temple = Number(args.temple ?? 140);
const rim = Number(args.rim ?? 5);
const depth = Number(args.depth ?? 4.5);
const shape = String(args.shape ?? "rectangle").toLowerCase();
const colour = String(args.colour ?? "1b1713");
const lensTint = String(args["lens-tint"] ?? "9aa7b5");
const lensAlpha = Number(args["lens-alpha"] ?? 0.22);
const out = String(args.out ?? `sample-frame-${lens}-${bridge}-${temple}.glb`);

// Lens outline as a superellipse: the exponent rounds the corners, the aspect
// sets the height, and "lift" makes the top edge straighter than the bottom.
const PROFILES = {
  rectangle: { n: 4.2, aspect: 0.74, lift: 0.08 },
  square: { n: 4.2, aspect: 0.92, lift: 0.06 },
  round: { n: 2, aspect: 1, lift: 0 },
  oval: { n: 2, aspect: 0.76, lift: 0 },
  geometric: { n: 3, aspect: 0.86, lift: 0.05 },
  browline: { n: 3.4, aspect: 0.78, lift: 0.14 },
  cat_eye: { n: 2.6, aspect: 0.72, lift: 0.12 },
  aviator: { n: 2.2, aspect: 0.88, lift: -0.06 },
};
const profile = PROFILES[shape] ?? PROFILES.rectangle;

const superellipse = (a, b, n, lift, steps = 96) => {
  const points = [];
  for (let i = 0; i < steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = a * Math.sign(c) * Math.abs(c) ** (2 / n);
    let y = b * Math.sign(s) * Math.abs(s) ** (2 / n);
    // Flatten the top a little (or the bottom, for an aviator).
    if (lift > 0 && y > 0) y *= 1 - lift * (1 - Math.abs(c));
    if (lift < 0 && y < 0) y *= 1 + lift * (1 - Math.abs(c));
    points.push(new THREE.Vector2(x, y));
  }
  return points;
};

const a = lens / 2;
const b = (lens * profile.aspect) / 2;
const lensCentre = bridge / 2 + a;
const hingeX = bridge / 2 + 2 * a + rim;
const hingeY = b * 0.32;

const rimGeometry = () => {
  const outer = new THREE.Shape(superellipse(a + rim, b + rim, profile.n, profile.lift));
  outer.holes.push(new THREE.Path(superellipse(a, b, profile.n, profile.lift)));
  return new THREE.ExtrudeGeometry(outer, {
    depth: depth - 1.2,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.4,
    bevelSegments: 2,
  }).translate(0, 0, 0.4);
};
const lensGeometry = () =>
  new THREE.ExtrudeGeometry(new THREE.Shape(superellipse(a, b, profile.n, profile.lift)), {
    depth: 1.6,
    bevelEnabled: false,
  }).translate(0, 0, (depth - 1.6) / 2);

const tube = (points, radius, segments = 24) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 10, false);

// Bridge: a bar arching between the inner rims, just above centre.
const bridgeGeometry = tube(
  [
    new THREE.Vector3(-(bridge / 2 + 3), b * 0.35, depth / 2),
    new THREE.Vector3(0, b * 0.48, depth / 2),
    new THREE.Vector3(bridge / 2 + 3, b * 0.35, depth / 2),
  ],
  2.2,
);

// Nose pads: two small ovals behind the front, either side of the nose.
const padGeometry = (side) =>
  new THREE.SphereGeometry(1, 12, 10)
    .scale(2.2, 4.2, 1.4)
    .translate(side * (bridge / 2 + 1.5), -b * 0.3, -3.5);

// Temple: straight run, then a bend down behind the ear.
const templeGeometry = () =>
  tube(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -temple * 0.72),
      new THREE.Vector3(0, -3, -temple * 0.86),
      new THREE.Vector3(0, -14, -temple),
    ],
    1.9,
    36,
  );
const hingeBlock = () => new THREE.BoxGeometry(3.2, 7, 6).translate(0, 0, -1.5);

const parts = [
  { name: "rim_left", geometry: rimGeometry().translate(lensCentre, 0, 0), material: "frame" },
  { name: "rim_right", geometry: rimGeometry().translate(-lensCentre, 0, 0), material: "frame" },
  { name: "lens_left", geometry: lensGeometry().translate(lensCentre, 0, 0), material: "lens" },
  { name: "lens_right", geometry: lensGeometry().translate(-lensCentre, 0, 0), material: "lens" },
  { name: "bridge", geometry: bridgeGeometry, material: "frame" },
  { name: "pad_left", geometry: padGeometry(1), material: "frame" },
  { name: "pad_right", geometry: padGeometry(-1), material: "frame" },
];

const rgb = (hex) => new THREE.Color(`#${hex}`).toArray();
const materials = {
  frame: {
    name: "frame",
    pbrMetallicRoughness: { baseColorFactor: [...rgb(colour), 1], metallicFactor: 0.05, roughnessFactor: 0.3 },
  },
  lens: {
    name: "lens",
    alphaMode: "BLEND",
    doubleSided: true,
    pbrMetallicRoughness: { baseColorFactor: [...rgb(lensTint), lensAlpha], metallicFactor: 0, roughnessFactor: 0.05 },
  },
};

/* ------------------------------ GLB writer ------------------------------ */

const buffers = [];
let byteLength = 0;
const bufferViews = [];
const accessors = [];
const pad4 = (n) => (n + 3) & ~3;

const addView = (typedArray) => {
  const bytes = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
  const padded = Buffer.alloc(pad4(bytes.length));
  bytes.copy(padded);
  bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length, target: 34962 });
  buffers.push(padded);
  byteLength += padded.length;
  return bufferViews.length - 1;
};

const addAccessor = (array, count, withBounds) => {
  const accessor = { bufferView: addView(array), componentType: 5126, count, type: "VEC3" };
  if (withBounds) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < array.length; i += 3) {
      for (let k = 0; k < 3; k += 1) {
        min[k] = Math.min(min[k], array[i + k]);
        max[k] = Math.max(max[k], array[i + k]);
      }
    }
    accessor.min = min;
    accessor.max = max;
  }
  accessors.push(accessor);
  return accessors.length - 1;
};

const materialIndex = { frame: 0, lens: 1 };
const meshes = [];
const addMesh = (name, geometry, material) => {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.computeVertexNormals();
  const count = flat.attributes.position.count;
  meshes.push({
    name,
    primitives: [
      {
        attributes: {
          POSITION: addAccessor(new Float32Array(flat.attributes.position.array), count, true),
          NORMAL: addAccessor(new Float32Array(flat.attributes.normal.array), count, false),
        },
        material: materialIndex[material],
      },
    ],
  });
  return meshes.length - 1;
};

const nodes = [];
const addNode = (node) => nodes.push(node) - 1;

const partNodes = parts.map((part) => addNode({ name: part.name, mesh: addMesh(part.name, part.geometry, part.material) }));
const templeLeft = addNode({ name: "temple_left", mesh: addMesh("temple_left", templeGeometry(), "frame") });
const templeRight = addNode({ name: "temple_right", mesh: addMesh("temple_right", templeGeometry(), "frame") });
const blockLeft = addNode({ name: "hinge_block_left", mesh: addMesh("hinge_block_left", hingeBlock(), "frame") });
const blockRight = addNode({ name: "hinge_block_right", mesh: addMesh("hinge_block_right", hingeBlock(), "frame") });
// The wearer faces +Z, so their left is +X.
const hingeLeft = addNode({ name: "hinge_left", translation: [hingeX, hingeY, 0], children: [templeLeft, blockLeft] });
const hingeRight = addNode({ name: "hinge_right", translation: [-hingeX, hingeY, 0], children: [templeRight, blockRight] });
// Everything above is in millimetres; the root brings it to metres.
const rootIndex = addNode({ name: "frame", scale: [0.001, 0.001, 0.001], children: [...partNodes, hingeLeft, hingeRight] });

const json = {
  asset: { version: "2.0", generator: "metro-opticals tryon-sample-frame" },
  scene: 0,
  scenes: [{ name: "frame", nodes: [rootIndex] }],
  nodes,
  meshes,
  materials: [materials.frame, materials.lens],
  accessors,
  bufferViews,
  buffers: [{ byteLength }],
};

const jsonBuffer = Buffer.from(JSON.stringify(json));
const jsonPadded = Buffer.alloc(pad4(jsonBuffer.length), 0x20);
jsonBuffer.copy(jsonPadded);
const bin = Buffer.concat(buffers);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + bin.length, 8);
const chunk = (length, type) => {
  const c = Buffer.alloc(8);
  c.writeUInt32LE(length, 0);
  c.writeUInt32LE(type, 4);
  return c;
};
writeFileSync(out, Buffer.concat([header, chunk(jsonPadded.length, 0x4e4f534a), jsonPadded, chunk(bin.length, 0x004e4942), bin]));

const widthMm = 2 * hingeX + 3.2; // outer face of one hinge block to the other
console.log(`wrote ${out}`);
console.log(`  ${shape}, ${lens} □ ${bridge} - ${temple}, colour #${colour}, front width ${widthMm.toFixed(1)} mm, ${Math.round(bin.length / 1024)} KB`);
console.log(`  enter ${Math.round(widthMm)} as the caliper reading on the try-on tab`);
