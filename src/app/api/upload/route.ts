import { NextRequest, NextResponse } from "next/server";
import { uploadFile, deleteFile, UploadFolder } from "@/lib/storage/r2";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError } from "@/lib/errors";
import { logger, serializeError } from "@/lib/logger";
import { logApiAction, logApiError } from "@/lib/audit";

const ALLOWED_FOLDERS: UploadFolder[] = [
  "product/image",
  "product/catalogue",
  "category/image",
  "advertisement/image",
  "brand/image",
];

// Every upload  image or catalogue PDF  is capped at 5 MB.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Verify the declared MIME type against the file's magic bytes so a
// client-forged Content-Type can't smuggle another format through.
const matchesMagicBytes = (bytes: Uint8Array, mime: string): boolean => {
  if (mime === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png")
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  if (mime === "image/webp")
    return (
      bytes[0] === 0x52 && // RIFF
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 && // WEBP
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  if (mime === "application/pdf")
    return (
      bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
    );
  return false;
};

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as UploadFolder | null;
    const customFileName = formData.get("customFileName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!folder || !ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    const isImageFolder = folder !== "product/catalogue";

    if (isImageFolder) {
      // SVG is deliberately excluded: it is an active document that can carry
      // script and would be served from our own origin.
      const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedImageTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Only JPG, PNG or WebP images are allowed" },
          { status: 400 },
        );
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: "Image must be 5MB or smaller" },
          { status: 400 },
        );
      }
    } else {
      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { error: "Only PDF files are allowed for catalogues" },
          { status: 400 },
        );
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: "PDF must be 5MB or smaller" },
          { status: 400 },
        );
      }
    }

    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!matchesMagicBytes(header, file.type)) {
      return NextResponse.json(
        { error: "File content does not match its declared type" },
        { status: 400 },
      );
    }

    const result = await uploadFile({
      folder,
      file,
      customFileName: customFileName || undefined,
    });

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "file_upload",
      resourceId: result.fileName,
    });

    return NextResponse.json({
      success: true,
      fileName: result.fileName,
      publicUrl: result.publicUrl,
    });
  } catch (error: any) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    logger.error("Upload error", serializeError(error));
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();

    const body = await request.json();
    const { folder, fileName } = body;

    if (!folder || !fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { error: "Folder and fileName are required" },
        { status: 400 },
      );
    }

    const folderValue = folder as UploadFolder;
    if (!ALLOWED_FOLDERS.includes(folderValue)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    await deleteFile(folderValue, fileName);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "file_delete",
      resourceId: fileName,
    });

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error: any) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    logger.error("Delete error", serializeError(error));
    return handleError(error);
  }
}
