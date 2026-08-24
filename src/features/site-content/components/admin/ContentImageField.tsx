"use client";

import Image from "next/image";
import React, { useRef, useState } from "react";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { Toast } from "@/lib/utils/toast";
import { uploadApi } from "@/features/uploads/api/upload-api";
import { getAdvertisementImageUrl } from "@/lib/storageUtils";
import type { ImageField } from "@/features/site-content/types/site-content";

/**
 * Image picker for a content field.
 *
 * Content artwork shares the `advertisement/image` bucket rather than getting
 * its own: both are marketing creative uploaded by the same people, and one
 * folder means one set of storage rules to keep straight.
 */

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

export default function ContentImageField({
  field,
  value,
  onChange,
}: {
  field: ImageField;
  value: string;
  onChange: (next: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const preview = getAdvertisementImageUrl(value);

  const upload = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      Toast.error("Use a JPG, PNG, WebP or AVIF image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      Toast.error("That image is over 5MB — compress it first.");
      return;
    }

    setUploading(true);
    const toastId = Toast.loading("Uploading image…");

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const stamp = Date.now();
      const fileName = `content-${field.name}-${stamp}.${extension}`;
      const response = await uploadApi.uploadFile(
        file,
        "advertisement/image",
        fileName
      );
      onChange(response.fileName || fileName);
      Toast.update(toastId, {
        render: "Image uploaded.",
        type: "success",
        isLoading: false,
        autoClose: 2500,
        closeButton: true,
      });
    } catch (error: any) {
      Toast.update(toastId, {
        render:
          error?.response?.data?.error || error?.message || "Upload failed.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-xl border-2 border-dashed border-gray-3 bg-gray-1"
        style={{ aspectRatio: field.aspect || "16 / 9" }}
      >
        {preview ? (
          <>
            <Image
              src={preview}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 420px"
              className="object-cover"
              unoptimized={preview.endsWith(".svg")}
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2 bg-gradient-to-t from-dark/80 to-transparent p-2.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11.5px] font-semibold text-dark hover:bg-white"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11.5px] font-semibold text-red hover:bg-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-4 text-center"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-light-5 text-blue">
              <UploadCloud className="h-4 w-4" />
            </span>
            <span className="text-[12.5px] font-semibold text-dark">
              {uploading ? "Uploading…" : "Upload an image"}
            </span>
            {field.recommended && (
              <span className="text-[11.5px] text-dark-4">
                {field.recommended}
              </span>
            )}
          </button>
        )}

        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue border-t-transparent" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
