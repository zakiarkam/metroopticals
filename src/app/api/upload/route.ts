import { NextRequest, NextResponse } from "next/server";
import { uploadFile, deleteFile, UploadFolder } from "@/lib/storage/r2";
import { logger, serializeError } from "@/lib/logger";
import { logApiAction, logApiError } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as UploadFolder | null;
    const customFileName = formData.get("customFileName") as string | null;
    const allowedFolders: UploadFolder[] = [
      "product/image",
      "product/catalogue",
      "category/image",
      "advertisement/image",
      "brand/image",
    ];

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!folder || !allowedFolders.includes(folder)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    if (
      [
        "product/image",
        "category/image",
        "advertisement/image",
        "brand/image",
      ].includes(folder)
    ) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Only image files are allowed" },
          { status: 400 },
        );
      }

      // SVG is an active document, not just a picture  it can carry script
      // and would be served from our own origin. Banner artwork is photographic
      // anyway, so raster formats only.
      if (file.type === "image/svg+xml") {
        return NextResponse.json(
          { error: "SVG uploads are not supported. Use JPG, PNG or WebP." },
          { status: 400 },
        );
      }
    }

    if (folder === "product/catalogue" && file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed for catalogues" },
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
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error?.message || "Unknown error",
        message: error?.message?.includes("Permission")
          ? "Storage permission denied. Please check service account permissions."
          : "Failed to upload file",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const start = Date.now();
  try {
    const body = await request.json();
    const { folder, fileName } = body;

    if (!folder || !fileName) {
      return NextResponse.json(
        { error: "Folder and fileName are required" },
        { status: 400 },
      );
    }

    const allowedFolders: UploadFolder[] = [
      "product/image",
      "product/catalogue",
      "category/image",
      "advertisement/image",
      "brand/image",
    ];
    const folderValue = folder as UploadFolder;

    if (!allowedFolders.includes(folderValue)) {
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
    return NextResponse.json(
      {
        error: "Failed to delete file",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
