"use client";
import React, { useState } from "react";
import { X, Upload, FileText } from "lucide-react";
import { Toast } from "@/lib/utils/toast";
import { uploadApi } from "@/features/uploads/api/upload-api";
import { getProductCatalogueUrl } from "@/lib/storageUtils";

interface CatalogueUploadProps {
  catalogueFile: string | null;
  onChange: (fileName: string | null) => void;
  productTitle?: string;
  productId?: number | null;
}

const CatalogueUpload: React.FC<CatalogueUploadProps> = ({
  catalogueFile,
  onChange,
  productTitle = "",
  productId,
}) => {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    const time = `${hours}-${minutes}`; // 14-12

    // Get file extension
    const extension = originalFileName.split(".").pop();

    // Format: productname-catalogue-2025-12-12-14-12.pdf
    return `${sanitizedTitle}-catalogue-${date}-${time}.${extension}`;
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.type !== "application/pdf") {
      Toast.error("Please upload a PDF file");
      return;
    }

    setUploading(true);
    const toastId = Toast.loading("Uploading catalogue...");

    try {
      const newFileName = generateFileName(file.name);
      const response = await uploadApi.uploadFile(
        file,
        "product/catalogue",
        newFileName
      );
      onChange(response.fileName || newFileName);

      Toast.update(toastId, {
        render: "Catalogue uploaded successfully!",
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
        render:
          error?.message || "Failed to upload catalogue. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setUploading(false);
    }
  };

  const removeCatalogue = async () => {
    if (!catalogueFile) return;

    setDeleting(true);
    const toastId = Toast.loading("Deleting catalogue...");

    try {
      if (productId) {
        await uploadApi.deleteProductFile(productId, "catalogue", catalogueFile);
      } else {
        await uploadApi.deleteFile("product/catalogue", catalogueFile);
      }

      onChange(null);

      Toast.update(toastId, {
        render: "Catalogue deleted successfully!",
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
        render:
          error?.message || "Failed to delete catalogue. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {catalogueFile && (
        <div className="relative group">
          <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-3 bg-gray-1">
            <FileText className="w-10 h-10 text-blue flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark truncate">
                {catalogueFile}
              </p>
              <a
                href={getProductCatalogueUrl(catalogueFile) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue hover:underline"
              >
                View PDF
              </a>
            </div>
            <button
              type="button"
              onClick={removeCatalogue}
              disabled={deleting}
              className="rounded-full p-2 bg-white shadow-md hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Delete catalogue"
            >
              {deleting ? (
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <X size={16} className="text-red-500" />
              )}
            </button>
          </div>
        </div>
      )}

      {!catalogueFile && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue transition-colors">
          <input
            key={inputKey}
            type="file"
            accept="application/pdf"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            id="catalogue-upload"
            disabled={uploading}
          />
          <label
            htmlFor="catalogue-upload"
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {uploading ? "Uploading..." : "Click to upload PDF catalogue"}
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF files only</p>
          </label>
        </div>
      )}
    </div>
  );
};

export default CatalogueUpload;
