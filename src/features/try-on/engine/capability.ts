/**
 * What this browser can do, checked once before anything heavy is loaded.
 * The fallback ladder in the engine is decided from these.
 */
export type Capabilities = {
  /** Camera access needs HTTPS (or localhost). */
  secureContext: boolean;
  camera: boolean;
  webgl2: boolean;
  wasm: boolean;
};

export const detectCapabilities = (): Capabilities => {
  if (typeof window === "undefined") {
    return { secureContext: false, camera: false, webgl2: false, wasm: false };
  }

  const secureContext = window.isSecureContext === true;
  const camera =
    secureContext && typeof navigator.mediaDevices?.getUserMedia === "function";
  const wasm = typeof WebAssembly === "object";

  let webgl2 = false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    webgl2 = gl instanceof WebGL2RenderingContext;
    // Contexts are a scarce resource on phones; give this one back.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2 = false;
  }

  return { secureContext, camera, webgl2, wasm };
};
