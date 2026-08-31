"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Eye, ImageIcon, Loader2, Trash2, Upload, X } from "lucide-react";
import { Toast } from "@/lib/utils/toast";
import { uploadApi } from "@/features/uploads/api/upload-api";
import { getColorSwatch } from "@/features/products/utils/colors";
import { frameFrontWidthMm } from "@/features/products/utils/eyewear";
import type { FrameShape } from "@/features/products/types/product";
import {
  deleteTryOnAsset,
  getTryOnAssets,
  saveTryOnAsset,
} from "@/features/try-on/api/tryon-api";
import { toFrameAsset } from "@/features/try-on/utils/assets";
import { TRYON_SOURCES } from "@/features/try-on/validators/asset";
import type {
  FrameFitSpec,
  TryOnAsset,
  TryOnSource,
} from "@/features/try-on/types";

const TryOnModal = dynamic(() => import("../TryOnModal"), { ssr: false });

type Props = {
  productId: number;
  productTitle: string;
  frameColors: string[];
  spec: FrameFitSpec & { frameShape?: FrameShape | null };
};

type Row = {
  saved: TryOnAsset | null;
  overlayImage: string | null;
  modelGlb: string | null;
  frameWidthMm: string;
  source: TryOnSource;
  isActive: boolean;
  checklist: Set<string>;
  /** Files uploaded this session and not yet saved to a row. */
  unsaved: { overlay: string | null; model: string | null };
  uploading: "overlay" | "model" | null;
  saving: boolean;
};

const SOURCE_LABELS: Record<TryOnSource, string> = {
  PHOTO: "Photo cut-out",
  TEMPLATE: "Template model",
  SCAN: "3D scan",
  VENDOR: "Vendor model",
};

// What has to be true before a customer sees it. Ticked by a person, on
// purpose, after looking  the switch stays off until every box is.
const CHECKLIST = [
  { id: "alpha", label: "Transparent background  no white box around the frame" },
  { id: "level", label: "Photographed straight on, frame level, bridge centred" },
  { id: "width", label: "Width measured with a caliper across the hinges and entered here" },
  { id: "preview", label: "Previewed on a face: sits on the nose, right size, not crooked" },
  { id: "colour", label: "Colour matches the product photo" },
];
const MODEL_CHECK = { id: "scale", label: "3D model width matches the caliper (within 5%)" };

const emptyRow = (saved: TryOnAsset | null): Row => ({
  saved,
  overlayImage: saved?.overlayImage ?? null,
  modelGlb: saved?.modelGlb ?? null,
  frameWidthMm: saved?.frameWidthMm != null ? String(saved.frameWidthMm) : "",
  source: saved?.source ?? "PHOTO",
  isActive: saved?.isActive ?? false,
  // A row that is already live has, by definition, been checked.
  checklist: new Set(saved?.isActive ? [...CHECKLIST, MODEL_CHECK].map((c) => c.id) : []),
  unsaved: { overlay: null, model: null },
  uploading: null,
  saving: false,
});

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/**
 * One row per colourway: the cut-out, the model, the caliper width, and a
 * preview on a real face before the switch is thrown. Saves on its own 
 * these rows are not part of the product form's Update button.
 */
export default function TryOnAssetsTab({ productId, productTitle, frameColors, spec }: Props) {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [previewColour, setPreviewColour] = useState<string | null>(null);

  const derivedWidth = useMemo(() => frameFrontWidthMm(spec), [spec]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getTryOnAssets(productId, { all: true })
      .then((assets) => {
        if (!mounted) return;
        const next: Record<string, Row> = {};
        for (const colour of frameColors) {
          const saved =
            assets.find((a) => a.colour.toLowerCase() === colour.toLowerCase()) ?? null;
          next[colour] = emptyRow(saved);
        }
        setRows(next);
      })
      .catch((error: any) => {
        Toast.error(error?.response?.data?.message || "Failed to load try-on assets");
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
    // Colours are read once per open; editing the colour list means saving
    // the product first, which the empty state below says.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const patch = useCallback((colour: string, update: Partial<Row> | ((row: Row) => Partial<Row>)) => {
    setRows((current) => {
      const row = current[colour];
      if (!row) return current;
      const changes = typeof update === "function" ? update(row) : update;
      return { ...current, [colour]: { ...row, ...changes } };
    });
  }, []);

  const upload = async (colour: string, kind: "overlay" | "model", file: File) => {
    const row = rows[colour];
    if (!row) return;

    const isModel = kind === "model";
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (isModel ? extension !== "glb" : !["png", "webp"].includes(extension)) {
      Toast.error(isModel ? "The model must be a .glb file" : "The cut-out must be a PNG or WebP with transparency");
      return;
    }

    patch(colour, { uploading: kind });
    const toastId = Toast.loading(isModel ? "Uploading model…" : "Uploading cut-out…");
    try {
      const name = `${slug(productTitle) || "frame"}-${slug(colour) || "colour"}-tryon-${Date.now().toString(36)}.${extension}`;
      const folder = isModel ? "product/tryon-3d" : "product/tryon-2d";
      const response = await uploadApi.uploadFile(file, folder, name);
      const fileName = response.fileName || name;

      // Replacing a file uploaded a minute ago and never saved: bin the old one.
      const previousUnsaved = isModel ? row.unsaved.model : row.unsaved.overlay;
      if (previousUnsaved) await uploadApi.deleteFile(folder, previousUnsaved).catch(() => {});

      patch(colour, (r) => ({
        [isModel ? "modelGlb" : "overlayImage"]: fileName,
        unsaved: { ...r.unsaved, [isModel ? "model" : "overlay"]: fileName },
        checklist: new Set([...r.checklist].filter((id) => id !== "preview")),
      }));
      Toast.update(toastId, { render: "Uploaded", type: "success", isLoading: false, autoClose: 2000 });
    } catch (error: any) {
      Toast.update(toastId, {
        render: error?.response?.data?.error || error?.message || "Upload failed",
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      patch(colour, { uploading: null });
    }
  };

  const removeFile = async (colour: string, kind: "overlay" | "model") => {
    const row = rows[colour];
    if (!row) return;
    const isModel = kind === "model";
    const unsaved = isModel ? row.unsaved.model : row.unsaved.overlay;
    if (unsaved) {
      await uploadApi
        .deleteFile(isModel ? "product/tryon-3d" : "product/tryon-2d", unsaved)
        .catch(() => {});
    }
    patch(colour, (r) => ({
      [isModel ? "modelGlb" : "overlayImage"]: null,
      unsaved: { ...r.unsaved, [isModel ? "model" : "overlay"]: null },
      isActive: false,
    }));
  };

  const save = async (colour: string) => {
    const row = rows[colour];
    if (!row) return;
    patch(colour, { saving: true });
    try {
      const saved = await saveTryOnAsset(productId, {
        colour,
        overlayImage: row.overlayImage,
        modelGlb: row.modelGlb,
        frameWidthMm: row.frameWidthMm.trim() === "" ? null : Number(row.frameWidthMm),
        source: row.source,
        isActive: row.isActive,
      });
      patch(colour, { saved, unsaved: { overlay: null, model: null } });
      Toast.success(saved.isActive ? `${colour} is live on the product page` : `${colour} saved as a draft`);
    } catch (error: any) {
      Toast.error(error?.response?.data?.message || error?.message || "Could not save");
    } finally {
      patch(colour, { saving: false });
    }
  };

  const remove = async (colour: string) => {
    const row = rows[colour];
    if (!row?.saved) return;
    if (!window.confirm(`Remove the try-on for ${colour}? Its files are deleted.`)) return;
    patch(colour, { saving: true });
    try {
      await deleteTryOnAsset(productId, colour);
      patch(colour, emptyRow(null));
      Toast.success("Removed");
    } catch (error: any) {
      Toast.error(error?.response?.data?.message || "Could not remove");
      patch(colour, { saving: false });
    }
  };

  const previewAsset = previewColour && rows[previewColour]
    ? toFrameAsset({
        id: 0,
        productId,
        colour: previewColour,
        overlayImage: rows[previewColour].overlayImage,
        modelGlb: rows[previewColour].modelGlb,
        frameWidthMm:
          rows[previewColour].frameWidthMm.trim() === "" ? null : Number(rows[previewColour].frameWidthMm),
        source: rows[previewColour].source,
        isActive: true,
        createdAt: "",
        updatedAt: "",
      })
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue" />
      </div>
    );
  }

  if (!frameColors.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-4 p-6 text-center text-custom-sm text-body">
        Add the frame&apos;s colours under Eyewear specification and save the
        product; each colour then gets its own try-on here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-custom-xs leading-relaxed text-dark-5">
        Each colour needs a transparent front-on cut-out (PNG) or a real-scale 3D
        model (GLB), plus the frame&apos;s width across the hinges from a caliper.
        Preview on a face, tick the checks, then switch it on. These save on
        their own  they are not part of Update Product.
      </p>

      {frameColors.map((colour) => {
        const row = rows[colour];
        if (!row) return null;
        const swatch = getColorSwatch(colour);
        const hasFile = Boolean(row.overlayImage || row.modelGlb);
        const width = row.frameWidthMm.trim() === "" ? null : Number(row.frameWidthMm);
        const widthOk = (width != null && Number.isFinite(width)) || derivedWidth != null;
        const checks = row.modelGlb ? [...CHECKLIST, MODEL_CHECK] : CHECKLIST;
        const checksDone = checks.every((c) => row.checklist.has(c.id));
        const canActivate = hasFile && widthOk && checksDone;
        const busy = row.saving || row.uploading !== null;

        const fileZone = (kind: "overlay" | "model") => {
          const isModel = kind === "model";
          const value = isModel ? row.modelGlb : row.overlayImage;
          const id = `tryon-${kind}-${slug(colour)}`;
          return (
            <div className="rounded-lg border border-gray-3 bg-gray-1 p-3">
              <p className="flex items-center gap-1.5 text-custom-xs font-semibold text-dark">
                {isModel ? <Box className="h-3.5 w-3.5 text-blue" /> : <ImageIcon className="h-3.5 w-3.5 text-blue" />}
                {isModel ? "3D model (.glb, to scale)" : "Cut-out (PNG, transparent)"}
              </p>
              {value ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-custom-xs text-body" title={value}>
                    {value}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeFile(colour, kind)}
                    disabled={busy}
                    className="rounded-full border border-gray-3 p-1 text-red hover:bg-red-light-6 disabled:opacity-50"
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor={id}
                  className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-gray-4 px-3 py-3 text-custom-xs text-dark-4 hover:border-blue hover:text-blue"
                >
                  {row.uploading === kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {row.uploading === kind ? "Uploading…" : "Choose file"}
                  <input
                    id={id}
                    type="file"
                    accept={isModel ? ".glb,model/gltf-binary" : "image/png,image/webp"}
                    className="hidden"
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void upload(colour, kind, file);
                      event.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          );
        };

        return (
          <div key={colour} className="rounded-xl border border-gray-3 bg-gray-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-custom-sm font-bold text-dark">
                {swatch && (
                  <span
                    aria-hidden
                    className={`h-4 w-4 rounded-full ${swatch.needsBorder ? "ring-1 ring-inset ring-dark/20" : ""}`}
                    style={{ background: swatch.background }}
                  />
                )}
                {colour}
              </p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  row.saved?.isActive
                    ? "bg-green-light-5 text-green-dark"
                    : row.saved
                      ? "bg-yellow-light-4 text-yellow-dark"
                      : "bg-gray-8 text-dark-4"
                }`}
              >
                {row.saved?.isActive ? "Live" : row.saved ? "Draft" : "Not set up"}
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {fileZone("overlay")}
              {fileZone("model")}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-custom-xs font-semibold text-dark">
                  Frame width across the hinges <span className="font-normal text-dark-5">(mm, caliper)</span>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min={90}
                  max={200}
                  value={row.frameWidthMm}
                  disabled={busy}
                  onChange={(event) => patch(colour, { frameWidthMm: event.target.value })}
                  placeholder={derivedWidth != null ? String(Math.round(derivedWidth)) : "e.g. 138"}
                  className="mt-1 h-9 w-full rounded-md border border-gray-3 bg-gray-1 px-3 text-custom-sm text-dark"
                />
                <span className="mt-1 block text-[11px] text-dark-5">
                  {derivedWidth != null
                    ? `Derived from lens + bridge: ${Math.round(derivedWidth)} mm. A caliper reading is better.`
                    : "Enter lens and bridge widths on the product, or measure it."}
                </span>
              </label>

              <label className="block">
                <span className="text-custom-xs font-semibold text-dark">How it was made</span>
                <select
                  value={row.source}
                  disabled={busy}
                  onChange={(event) => patch(colour, { source: event.target.value as TryOnSource })}
                  className="mt-1 h-9 w-full rounded-md border border-gray-3 bg-gray-1 px-3 text-custom-sm text-dark"
                >
                  {TRYON_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {SOURCE_LABELS[source]}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-dark-5">
                  A template model is labelled on the page as representative in shape, exact in size.
                </span>
              </label>
            </div>

            <fieldset className="mt-3 rounded-lg border border-gray-3 bg-gray-1 p-3">
              <legend className="px-1 text-custom-xs font-semibold text-dark">Before it goes live</legend>
              <div className="space-y-1.5">
                {checks.map((check) => (
                  <label key={check.id} className="flex cursor-pointer items-start gap-2 text-custom-xs text-body">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={row.checklist.has(check.id)}
                      disabled={busy}
                      onChange={(event) =>
                        patch(colour, (r) => {
                          const next = new Set(r.checklist);
                          if (event.target.checked) next.add(check.id);
                          else next.delete(check.id);
                          return { checklist: next, isActive: r.isActive && event.target.checked };
                        })
                      }
                    />
                    {check.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewColour(colour)}
                disabled={!hasFile || !widthOk || busy}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-3 px-3 text-custom-xs font-semibold text-dark hover:border-blue hover:text-blue disabled:opacity-50"
              >
                <Eye className="h-4 w-4" /> Preview on a face
              </button>

              <label className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-custom-xs font-semibold ${canActivate ? "cursor-pointer border-gray-3 text-dark" : "cursor-not-allowed border-gray-3 text-dark-5"}`}>
                <input
                  type="checkbox"
                  checked={row.isActive}
                  disabled={!canActivate || busy}
                  onChange={(event) => patch(colour, { isActive: event.target.checked })}
                />
                Show to customers
              </label>

              <span className="flex-1" />

              {row.saved && (
                <button
                  type="button"
                  onClick={() => void remove(colour)}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-custom-xs font-semibold text-red hover:bg-red-light-6 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              )}
              <button
                type="button"
                onClick={() => void save(colour)}
                disabled={busy || (!hasFile && !row.saved)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-4 text-custom-xs font-bold text-white hover:bg-blue-dark disabled:opacity-50"
              >
                {row.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {row.isActive ? "Save & publish" : "Save draft"}
              </button>
            </div>
          </div>
        );
      })}

      {previewAsset && previewColour && (
        <TryOnModal
          open
          onClose={() => setPreviewColour(null)}
          productId={productId}
          title={productTitle || "Frame"}
          frameSpec={spec}
          frameShape={spec.frameShape}
          assets={[previewAsset]}
          initialColour={previewColour}
          adminPreview
        />
      )}
    </div>
  );
}
