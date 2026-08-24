"use client";

import Image from "next/image";
import React, { useState } from "react";
import { Upload, X } from "lucide-react";
import { Toast } from "@/lib/utils/toast";
import { getCategoryImageUrl } from "@/lib/storageUtils";
import { uploadApi } from "@/features/uploads/api/upload-api";

interface CategoryImageUploadProps {
  image?: string | null;
  categoryName?: string;
  inputId?: string;
  onChange: (image?: string | null) => void;
}

const CategoryImageUpload: React.FC<CategoryImageUploadProps> = ({
  image,
  categoryName = "category",
  inputId = "category-image-upload",
  onChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inputKey, setInputKey] = useState(Date.now());

  const getSanitizedTitle = () => {
    return (
      categoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "category"
    );
  };

  const generateFileName = (originalFileName: string) => {
    const sanitizedTitle = getSanitizedTitle();
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const time = `${hours}-${minutes}`;
    const extension = originalFileName.split(".").pop() || "jpg";

    return `${sanitizedTitle}-${date}-${time}.${extension}`;
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (uploading) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      Toast.error("Please upload a valid image file");
      return;
    }

    setUploading(true);
    const toastId = Toast.loading("Uploading category image...");

    try {
      const newFileName = generateFileName(file.name);
      const response = await uploadApi.uploadFile(
        file,
        "category/image",
        newFileName
      );
      onChange(response.fileName || newFileName);

      Toast.update(toastId, {
        render: "Category image uploaded successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      setInputKey(Date.now());
    } catch (error: any) {
      console.error("Category image upload error:", error);

      Toast.update(toastId, {
        render: error?.message || "Failed to upload image. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!image) return;
    if (deleting) return;

    setDeleting(true);
    const toastId = Toast.loading("Removing category image...");

    try {
      await uploadApi.deleteFile("category/image", image);

      onChange(null);

      Toast.update(toastId, {
        render: "Category image removed successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      setInputKey(Date.now());
    } catch (error: any) {
      console.error("Category image delete error:", error);

      Toast.update(toastId, {
        render: error?.message || "Failed to remove image. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setDeleting(false);
    }
  };

  const imageUrl = getCategoryImageUrl(image);

  return (
    <div className="space-y-3">
      {imageUrl && (
        <div className="relative w-full h-36 rounded-lg border border-gray-3 overflow-hidden bg-gray-1">
          <Image
            src={imageUrl}
            alt="Category image"
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
          <button
            type="button"
            disabled={deleting}
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-gray-2 rounded-full p-1.5 shadow-lg hover:bg-red-50 transition-opacity duration-200 flex items-center justify-center disabled:opacity-50 border border-gray-3"
          >
            {deleting ? (
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <X size={16} className="text-red-500" />
            )}
          </button>
        </div>
      )}

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue transition-colors">
        <input
          key={inputKey}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
          id={inputId}
          disabled={uploading}
        />
        <label
          htmlFor={inputId}
          className="flex flex-col items-center justify-center gap-2 cursor-pointer text-center"
        >
          <Upload className="w-8 h-8 text-gray-400" />
          <p className="text-sm text-gray-600">
            {uploading
              ? "Uploading..."
              : imageUrl
                ? "Click to replace category image"
                : "Click to upload category image"}
          </p>
          <p className="text-xs text-gray-400">JPEG, PNG &amp; GIF supported</p>
        </label>
      </div>
    </div>
  );
};

export default CategoryImageUpload;
