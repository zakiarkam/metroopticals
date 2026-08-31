export type CameraFailure = "denied" | "unavailable" | "insecure" | "unknown";

export class CameraError extends Error {
  constructor(
    public reason: CameraFailure,
    message: string,
  ) {
    super(message);
    this.name = "CameraError";
  }
}

const classify = (error: unknown): CameraError => {
  const name = (error as DOMException | undefined)?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return new CameraError("denied", "Camera access was refused");
  }
  if (
    name === "NotFoundError" ||
    name === "OverconstrainedError" ||
    name === "NotReadableError" ||
    name === "AbortError"
  ) {
    return new CameraError("unavailable", "No usable camera was found");
  }
  return new CameraError("unknown", "The camera could not be started");
};

/**
 * Opens the front camera into a video element and resolves once the frame
 * size is known. Must be called from a user gesture  iOS refuses otherwise.
 */
export async function openFrontCamera(
  video: HTMLVideoElement,
): Promise<MediaStream> {
  if (typeof navigator.mediaDevices?.getUserMedia !== "function") {
    throw new CameraError(
      window.isSecureContext ? "unavailable" : "insecure",
      "This browser cannot open the camera here",
    );
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch (error) {
    throw classify(error);
  }

  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve) => {
    if (video.readyState >= 1 && video.videoWidth > 0) {
      resolve();
      return;
    }
    video.addEventListener("loadedmetadata", () => resolve(), { once: true });
  });
  // Autoplay can be refused even when muted; tracking still runs on the
  // frames that arrive, so a rejected play() is not fatal.
  await video.play().catch(() => {});

  return stream;
}

export const stopStream = (stream: MediaStream | null | undefined) => {
  stream?.getTracks().forEach((track) => track.stop());
};
