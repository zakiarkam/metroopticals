"use client";
import Image from "next/image";
import React, { useState } from "react";
import { X, Upload } from "lucide-react";
import { Toast } from "@/lib/utils/toast";
import { uploadApi } from "@/features/uploads/api/upload-api";
import { getProductImageUrl } from "@/lib/storageUtils";

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxFiles?: number;
  productTitle?: string;
  productId?: number | null;
  /** Only update the form; the parent deletes files once the product is saved. */
  deferDelete?: boolean;
}

const BLOCKED_IMAGE_EXTENSIONS = ["heif", "heic"];
const BLOCKED_IMAGE_MIME_TYPES = ["image/heic", "image/heif"];

const isBlockedImageFile = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return (
    BLOCKED_IMAGE_EXTENSIONS.includes(extension) ||
    BLOCKED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase())
  );
};

const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onChange,
  maxFiles = 5,
  productTitle = "",
  productId,
  deferDelete = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [inputKey, setInputKey] = useState(Date.now());

  const generateFileName = (originalFileName: string) => {
    // Sanitize product title for filename
    const sanitizedTitle = productTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Get current date and time
    const now = new Date();
    const date = now.toISOString().split("T")[0]; // 2025-12-12
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const millis = String(now.getMilliseconds()).padStart(3, "0");
    const time = `${hours}-${minutes}-${seconds}-${millis}`; // 14-12-09-123

    // Get file extension
    const extension = originalFileName.split(".").pop() || "jpg";
    const uniqueSuffix = Math.random().toString(36).slice(2, 8);

    // Format: productname-2025-12-12-14-12.jpg
    return `${sanitizedTitle}-${date}-${time}-${uniqueSuffix}.${extension}`;
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxFiles - images.length;
    if (remainingSlots <= 0) {
      Toast.warning(
        `Only ${maxFiles} image${maxFiles !== 1 ? "s" : ""} are allowed`
      );
      return;
    }

    const filesArray = Array.from(files);
    const allowedFiles: File[] = [];
    const blockedFiles: File[] = [];

    filesArray.forEach((file) => {
      if (isBlockedImageFile(file)) {
        blockedFiles.push(file);
      } else {
        allowedFiles.push(file);
      }
    });

    if (blockedFiles.length > 0) {
      Toast.warning(
        "HEIC/HEIF files are not supported. Please convert them to JPG or PNG."
      );
    }

    if (allowedFiles.length === 0) {
      return;
    }

    const filesToUpload = allowedFiles.slice(0, remainingSlots);

    if (filesToUpload.length < allowedFiles.length) {
      Toast.warning(
        `Only ${remainingSlots} more file${
          remainingSlots !== 1 ? "s" : ""
        } can be uploaded`
      );
    }

    setUploading(true);
    const toastId = Toast.loading(
      `Uploading ${filesToUpload.length} image${
        filesToUpload.length > 1 ? "s" : ""
      }...`
    );

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        const newFileName = generateFileName(file.name);

        const response = await uploadApi.uploadFile(
          file,
          "product/image",
          newFileName
        );
        return response.fileName || newFileName;
      });

      const newFileNames = await Promise.all(uploadPromises);
      onChange([...images, ...newFileNames]);

      Toast.update(toastId, {
        render: `Successfully uploaded ${filesToUpload.length} image${
          filesToUpload.length > 1 ? "s" : ""
        }!`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      // Reset input to allow re-uploading the same file
      setInputKey(Date.now());
    } catch (error: any) {
      console.error("Upload error:", error);

      Toast.update(toastId, {
        render: error?.message || "Failed to upload images. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (index: number) => {
    const fileName = images[index];
    if (deferDelete) {
      onChange(images.filter((_, i) => i !== index));
      return;
    }
    setDeleting(index);
    const toastId = Toast.loading("Deleting image...");

    try {
      if (productId) {
        await uploadApi.deleteProductFile(productId, "image", fileName);
      } else {
        await uploadApi.deleteFile("product/image", fileName);
      }

      onChange(images.filter((_, i) => i !== index));

      Toast.update(toastId, {
        render: "Image deleted successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      // Reset input to allow re-uploading the same file
      setInputKey(Date.now());
    } catch (error: any) {
      console.error("Delete error:", error);

      Toast.update(toastId, {
        render: error?.message || "Failed to delete image. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setDeleting(null);
    }
  };

  const canAddMore = images.length < maxFiles;

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((fileName, index) => (
            <div key={fileName} className="relative group">
              <div className="relative w-full h-32 rounded-lg border border-gray-3 overflow-hidden bg-gray-1">
                <Image
                  src={getProductImageUrl(fileName) ?? "/images/placeholder.jpg"}
                  alt={`Product ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 200px"
                  className="object-cover transition-all duration-200 group-hover:opacity-75"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-40 transition-opacity duration-200" />

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  disabled={deleting === index}
                  className="absolute top-2 right-2 bg-gray-2 rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-50 hover:scale-110 disabled:opacity-50 border border-gray-3"
                  title="Delete image"
                >
                  {deleting === index ? (
                    <div className="w-4 h-4 border-2 border-blue border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <X size={16} className="text-red-500" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue transition-colors">
          <input
            key={inputKey}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            id="image-upload"
            disabled={uploading}
          />
          <label
            htmlFor="image-upload"
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {uploading ? "Uploading..." : "Click to upload images"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {maxFiles - images.length} more file
              {maxFiles - images.length !== 1 ? "s" : ""} allowed
            </p>
            {/* One shape everywhere: the shop, the product page, the till and
                the cart all crop to a square, so shoot square. */}
            <p className="text-xs text-gray-400 mt-0.5">
              Square photos work best (1:1, e.g. 1200 × 1200px) — every page
              shows them square.
            </p>
          </label>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
