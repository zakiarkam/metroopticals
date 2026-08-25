"use client";

import Image from "next/image";
import React, { useCallback, useRef, useState } from "react";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { Toast } from "@/lib/utils/toast";
import { getAdvertisementImageUrl } from "@/lib/storageUtils";
import { uploadApi } from "@/features/uploads/api/upload-api";
import type { AdPlacementMeta } from "@/features/advertisements/constants/advertisement";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

const buildFileName = (
  title: string,
  placementId: string,
  original: string,
) => {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "advertisement";
  const now = new Date();
  const stamp = `${now.toISOString().split("T")[0]}-${String(
    now.getHours(),
  ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
    now.getSeconds(),
  ).padStart(2, "0")}`;
  const extension = original.split(".").pop()?.toLowerCase() || "jpg";

  return `${placementId}-${slug}-${stamp}.${extension}`;
};

interface AdImageUploadProps {
  value?: string | null;
  placement: AdPlacementMeta;
  title?: string;
  /** Product-linked ads inherit the product photo  uploading is optional. */
  helperText?: string;
  inputId?: string;
  onChange: (value: string | null) => void;
}

const AdImageUpload: React.FC<AdImageUploadProps> = ({
  value,
  placement,
  title = "advertisement",
  helperText,
  inputId = "ad-image-upload",
  onChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewUrl = getAdvertisementImageUrl(value);

  const upload = useCallback(
    async (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        Toast.error("Use a JPG, PNG, WebP or AVIF image.");
        return;
      }

      if (file.size > MAX_BYTES) {
        Toast.error("That image is over 5MB  please compress it first.");
        return;
      }

      setUploading(true);
      const toastId = Toast.loading("Uploading artwork...");

      try {
        const fileName = buildFileName(title, placement.id, file.name);
        const response = await uploadApi.uploadFile(
          file,
          "advertisement/image",
          fileName,
        );

        onChange(response.fileName || fileName);

        Toast.update(toastId, {
          render: "Artwork uploaded.",
          type: "success",
          isLoading: false,
          autoClose: 2500,
          closeButton: true,
        });
      } catch (error: any) {
        Toast.update(toastId, {
          render:
            error?.response?.data?.error ||
            error?.message ||
            "Upload failed. Please try again.",
          type: "error",
          isLoading: false,
          autoClose: 5000,
          closeButton: true,
        });
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onChange, placement.id, title],
  );

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${
          dragging
            ? "border-blue bg-blue-light-5"
            : "border-gray-3 bg-gray-1 hover:border-blue/60"
        }`}
        style={{ aspectRatio: placement.aspect }}
      >
        {previewUrl ? (
          <>
            <Image
              src={previewUrl}
              alt="Advertisement artwork"
              fill
              sizes="(max-width: 768px) 100vw, 560px"
              className="object-cover"
              // Bundled dummy artwork is SVG and skips the optimizer.
              unoptimized={previewUrl.endsWith(".svg")}
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-dark/80 to-transparent p-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-dark transition hover:bg-white disabled:opacity-60"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-red transition hover:bg-white disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-light-5 text-blue">
              <UploadCloud className="h-5 w-5" />
            </span>
            <span className="text-[13.5px] font-semibold text-dark">
              {uploading ? "Uploading…" : "Drop a photo or click to upload"}
            </span>
            <span className="text-[12px] text-dark-4">
              {placement.recommended} · JPG, PNG or WebP · up to 5MB
            </span>
          </button>
        )}

        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-blue border-t-transparent" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      <p className="text-[12px] leading-relaxed text-dark-4">
        {helperText ??
          `Shown at ${placement.recommended} in the "${placement.label}" slot. The image is cropped to fill, so keep the important part centred.`}
      </p>
    </div>
  );
};

export default AdImageUpload;
