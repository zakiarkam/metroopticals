import { PLACEMENT, type LensTint } from "@/features/try-on/config";
import type { FaceMetrics } from "./measure";

/**
 * The 2D tier: a transparent cut-out of the frame front, drawn at its real
 * width on the tracked face. Convincing while the customer faces the camera;
 * it foreshortens as the head turns, which is what a flat picture can do.
 *
 * Lens tints are painted through a mask of the lens interiors, found once
 * per image as the see-through regions enclosed by the frame.
 */

type Loaded = { image: HTMLImageElement; corsBlocked: boolean };

const loadImage = (url: string) =>
  new Promise<Loaded>((resolve, reject) => {
    // Anonymous CORS keeps the canvas readable (snapshots, lens mask). If the
    // bucket has no CORS rule the image still has to draw, so fall back to a
    // plain load and report it so the admin preview can say what to fix.
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ image: img, corsBlocked: false });
    img.onerror = () => {
      const plain = new Image();
      plain.decoding = "async";
      plain.onload = () => resolve({ image: plain, corsBlocked: true });
      plain.onerror = () => reject(new Error(`Could not load ${url}`));
      plain.src = url;
    };
    img.src = url;
  });

const rgba = (hex: string, alpha: number) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/**
 * White where the lenses are, transparent elsewhere. See-through pixels
 * (alpha under half) that cannot be reached from the image border are
 * enclosed by the frame  those are the lenses, whether the cut-out left
 * them faintly white as the manual asks or fully clear.
 */
const buildLensMask = (image: HTMLImageElement): HTMLCanvasElement | null => {
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  if (!w || !h) return null;

  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sc = src.getContext("2d", { willReadFrequently: true });
  if (!sc) return null;
  sc.drawImage(image, 0, 0);

  let data: Uint8ClampedArray;
  try {
    data = sc.getImageData(0, 0, w, h).data;
  } catch {
    return null; // tainted: no CORS on the bucket
  }

  const seeThrough = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i += 1) seeThrough[i] = data[i * 4 + 3] < 128 ? 1 : 0;

  // Flood the outside from the border; whatever see-through remains is enclosed.
  const outside = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (i: number) => {
    if (!outside[i] && seeThrough[i]) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x += 1) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y += 1) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }

  const mask = document.createElement("canvas");
  mask.width = w;
  mask.height = h;
  const mc = mask.getContext("2d");
  if (!mc) return null;
  const out = mc.createImageData(w, h);
  let count = 0;
  for (let i = 0; i < w * h; i += 1) {
    if (seeThrough[i] && !outside[i]) {
      out.data[i * 4] = 255;
      out.data[i * 4 + 1] = 255;
      out.data[i * 4 + 2] = 255;
      out.data[i * 4 + 3] = 255;
      count += 1;
    }
  }
  // A cut-out with no enclosed area is not a frame front; nothing to tint.
  if (count < w * h * 0.02) return null;
  mc.putImageData(out, 0, 0);
  return mask;
};

export class Overlay2D {
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;
  private url: string | null = null;
  private corsBlocked = false;
  private lensMask: HTMLCanvasElement | null = null;
  private tint: LensTint | null = null;
  private tintLayer: HTMLCanvasElement | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas is not available");
    this.ctx = ctx;
  }

  resize(width: number, height: number) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  async setImage(url: string): Promise<{ corsBlocked: boolean }> {
    if (url === this.url && this.image) return { corsBlocked: this.corsBlocked };
    const { image, corsBlocked } = await loadImage(url);
    this.image = image;
    this.url = url;
    this.corsBlocked = corsBlocked;
    this.lensMask = corsBlocked ? null : buildLensMask(image);
    this.rebuildTint();
    return { corsBlocked };
  }

  get isCorsBlocked() {
    return this.corsBlocked;
  }

  get canTint() {
    return this.lensMask !== null;
  }

  setTint(tint: LensTint | null) {
    this.tint = tint?.color ? tint : null;
    this.rebuildTint();
  }

  private rebuildTint() {
    if (!this.tint?.color || !this.lensMask) {
      this.tintLayer = null;
      return;
    }
    const { width, height } = this.lensMask;
    const layer = document.createElement("canvas");
    layer.width = width;
    layer.height = height;
    const c = layer.getContext("2d");
    if (!c) return;
    c.drawImage(this.lensMask, 0, 0);
    c.globalCompositeOperation = "source-in";
    if (this.tint.gradient) {
      const g = c.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, rgba(this.tint.color, this.tint.opacity));
      g.addColorStop(1, rgba(this.tint.color, this.tint.opacity * 0.12));
      c.fillStyle = g;
    } else {
      c.fillStyle = rgba(this.tint.color, this.tint.opacity);
    }
    c.fillRect(0, 0, width, height);
    this.tintLayer = layer;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(metrics: FaceMetrics, frameWidthMm: number) {
    const { ctx, image } = this;
    this.clear();
    if (!image || !image.naturalWidth) return;

    const width = frameWidthMm * metrics.pxPerMm;
    const height = width * (image.naturalHeight / image.naturalWidth);
    const { yaw, pitch, roll } = metrics.rotation;

    ctx.save();
    ctx.translate(
      metrics.anchor.x,
      metrics.anchor.y + PLACEMENT.verticalOffsetMm * metrics.pxPerMm,
    );
    ctx.rotate(roll);
    ctx.scale(
      Math.max(Math.cos(yaw), PLACEMENT.minYawScale),
      Math.max(Math.cos(pitch), 0.6),
    );
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    if (this.tintLayer) {
      ctx.drawImage(this.tintLayer, -width / 2, -height / 2, width, height);
    }
    ctx.restore();
  }
}
