import { NextRequest, NextResponse } from "next/server";
import { uploadFile, deleteFile, UploadFolder } from "@/lib/storage/r2";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError } from "@/lib/errors";
import { logger, serializeError } from "@/lib/logger";
import { logApiAction, logApiError } from "@/lib/audit";
import { prisma } from "@/lib/db/prisma";

// True while any database record still points at the file. Bare DELETE is
// meant for cleaning up uploads that never got attached (a cancelled form);
// a file a record still uses is deleted through that record's own route,
// which updates the database in the same breath.
async function isFileInUse(
  folder: UploadFolder,
  fileName: string,
): Promise<boolean> {
  switch (folder) {
    case "product/image": {
      const [product, colorRow] = await Promise.all([
        prisma.product.findFirst({
          where: { images: { has: fileName } },
          select: { id: true },
        }),
        prisma.productColorStock.findFirst({
          where: { image: fileName },
          select: { id: true },
        }),
      ]);
      return Boolean(product || colorRow);
    }
    case "product/catalogue":
      return Boolean(
        await prisma.product.findFirst({
          where: { catalogueFile: fileName },
          select: { id: true },
        }),
      );
    case "product/tryon-2d":
      return Boolean(
        await prisma.productTryOnAsset.findFirst({
          where: { overlayImage: fileName },
          select: { id: true },
        }),
      );
    case "product/tryon-3d":
      return Boolean(
        await prisma.productTryOnAsset.findFirst({
          where: { modelGlb: fileName },
          select: { id: true },
        }),
      );
    case "category/image":
      return Boolean(
        await prisma.category.findFirst({
          where: { image: fileName },
          select: { id: true },
        }),
      );
    case "advertisement/image":
      return Boolean(
        await prisma.advertisement.findFirst({
          where: { imageUrl: fileName },
          select: { id: true },
        }),
      );
    case "brand/image":
      return Boolean(
        await prisma.brand.findFirst({
          where: { logo: fileName },
          select: { id: true },
        }),
      );
    default:
      return true;
  }
}

const ALLOWED_FOLDERS: UploadFolder[] = [
  "product/image",
  "product/catalogue",
  "product/tryon-2d",
  "product/tryon-3d",
  "category/image",
  "advertisement/image",
  "brand/image",
];

// Every upload  image or catalogue PDF  is capped at 5 MB. A 3D frame
// model gets more room so an uncompressed export can be checked in the admin
// before it is compressed, but the cap stays per folder, never global.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_MODEL_BYTES = 15 * 1024 * 1024;

// What each folder accepts. The try-on overlay must carry an alpha channel,
// so JPEG is refused there; the 3D folder takes only binary glTF.
const ALLOWED_TYPES_BY_FOLDER: Record<UploadFolder, string[]> = {
  "product/image": ["image/jpeg", "image/png", "image/webp"],
  "category/image": ["image/jpeg", "image/png", "image/webp"],
  "advertisement/image": ["image/jpeg", "image/png", "image/webp"],
  "brand/image": ["image/jpeg", "image/png", "image/webp"],
  "product/catalogue": ["application/pdf"],
  "product/tryon-2d": ["image/png", "image/webp"],
  "product/tryon-3d": ["model/gltf-binary"],
};

const TYPE_LABEL_BY_FOLDER: Record<UploadFolder, string> = {
  "product/image": "Only JPG, PNG or WebP images are allowed",
  "category/image": "Only JPG, PNG or WebP images are allowed",
  "advertisement/image": "Only JPG, PNG or WebP images are allowed",
  "brand/image": "Only JPG, PNG or WebP images are allowed",
  "product/catalogue": "Only PDF files are allowed for catalogues",
  "product/tryon-2d":
    "The try-on overlay must be a PNG or WebP with a transparent background",
  "product/tryon-3d": "Only a binary glTF (.glb) model is allowed",
};

// Browsers report an empty type for a `.glb`, so the declared type falls back
// to the extension. The magic-byte check below still has the final say.
const declaredType = (file: File): string => {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "glb" ? "model/gltf-binary" : "";
};

// Verify the declared MIME type against the file's magic bytes so a
// client-forged Content-Type can't smuggle another format through.
const matchesMagicBytes = (bytes: Uint8Array, mime: string): boolean => {
  // Binary glTF opens with the ASCII magic "glTF".
  if (mime === "model/gltf-binary")
    return (
      bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46
    );
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

    // SVG is deliberately excluded everywhere: it is an active document that
    // can carry script and would be served from our own origin.
    const mime = declaredType(file);
    if (!ALLOWED_TYPES_BY_FOLDER[folder].includes(mime)) {
      return NextResponse.json(
        { error: TYPE_LABEL_BY_FOLDER[folder] },
        { status: 400 },
      );
    }

    const maxBytes =
      folder === "product/tryon-3d" ? MAX_MODEL_BYTES : MAX_UPLOAD_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: `File must be ${Math.round(maxBytes / (1024 * 1024))}MB or smaller`,
        },
        { status: 400 },
      );
    }

    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!matchesMagicBytes(header, mime)) {
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

    if (await isFileInUse(folderValue, fileName)) {
      return NextResponse.json(
        {
          error:
            "That file is still in use. Remove it from its product, category, brand or advertisement instead.",
        },
        { status: 409 },
      );
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
