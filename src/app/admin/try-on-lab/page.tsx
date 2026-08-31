"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import type { RimType } from "@/features/products/types/product";

const TryOnModal = dynamic(() => import("@/features/try-on/components/TryOnModal"), { ssr: false });

/**
 * Try-on lab: open the customer try-on on any cut-out or model URL without
 * touching a product. For checking a new asset, tuning placement on a real
 * device, and the first-run checklist in VIRTUAL-TRY-ON.md. Local files can
 * be dropped under public/tryon-runtime/samples/ (git-ignored) and referred
 * to as /tryon-runtime/samples/<file>.
 */
export default function TryOnLabPage() {
  const [overlayUrl, setOverlayUrl] = useState("/tryon-runtime/samples/sample-black-front.png");
  const [modelUrl, setModelUrl] = useState("/tryon-runtime/samples/sample-frame-52-18-140.glb");
  const [use3d, setUse3d] = useState(true);
  const [frameWidthMm, setFrameWidthMm] = useState("135");
  const [lensWidth, setLensWidth] = useState("52");
  const [bridgeWidth, setBridgeWidth] = useState("18");
  const [templeLength, setTempleLength] = useState("140");
  const [weightGrams, setWeightGrams] = useState("22");
  const [rimType, setRimType] = useState<RimType>("FULL_RIM");
  const [open, setOpen] = useState(false);

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const field = (label: string, value: string, set: (v: string) => void, type = "text") => (
    <label className="block">
      <span className="text-custom-xs font-semibold text-dark">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => set(e.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-gray-3 bg-gray-2 px-3 text-custom-sm text-dark"
      />
    </label>
  );

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-bold text-dark">Try-on lab</h1>
      <p className="mt-1 text-custom-sm text-body">
        Opens the customer try-on on any cut-out or 3D model, without touching a
        product. Use it to check an asset before uploading, or to tune placement
        on a real phone.
      </p>

      <div className="mt-5 space-y-3 rounded-xl border border-gray-3 bg-gray-1 p-4">
        {field("Cut-out URL (transparent PNG)", overlayUrl, setOverlayUrl)}
        {field("3D model URL (.glb)", modelUrl, setModelUrl)}
        <label className="flex items-center gap-2 text-custom-sm text-dark">
          <input type="checkbox" checked={use3d} onChange={(e) => setUse3d(e.target.checked)} />
          Use the 3D model (untick to test the cut-out alone)
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {field("Frame width (mm, caliper)", frameWidthMm, setFrameWidthMm, "number")}
          {field("Lens width", lensWidth, setLensWidth, "number")}
          {field("Bridge", bridgeWidth, setBridgeWidth, "number")}
          {field("Temple", templeLength, setTempleLength, "number")}
          {field("Weight (g)", weightGrams, setWeightGrams, "number")}
          <label className="block">
            <span className="text-custom-xs font-semibold text-dark">Rim</span>
            <select
              value={rimType}
              onChange={(e) => setRimType(e.target.value as RimType)}
              className="mt-1 h-9 w-full rounded-md border border-gray-3 bg-gray-2 px-3 text-custom-sm text-dark"
            >
              <option value="FULL_RIM">Full-rim</option>
              <option value="SEMI_RIMLESS">Semi-rimless</option>
              <option value="RIMLESS">Rimless</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 items-center rounded-md bg-blue px-5 text-custom-sm font-bold text-white hover:bg-blue-dark"
        >
          Open try-on
        </button>
      </div>

      <p className="mt-4 text-custom-xs text-dark-5">
        Sample files: run <code>npm run tryon:sample-frame</code> and copy the
        result, plus a cut-out, into <code>public/tryon-runtime/samples/</code>.
      </p>

      {open && (
        <TryOnModal
          open
          onClose={() => setOpen(false)}
          productId={0}
          title="Lab frame"
          frameSpec={{
            lensWidth: num(lensWidth),
            bridgeWidth: num(bridgeWidth),
            templeLength: num(templeLength),
            weightGrams: num(weightGrams),
            rimType,
          }}
          assets={[
            {
              colour: "Lab",
              overlayUrl: overlayUrl.trim() || null,
              modelUrl: use3d ? modelUrl.trim() || null : null,
              frameWidthMm: num(frameWidthMm),
              source: "TEMPLATE",
            },
          ]}
          adminPreview
        />
      )}
    </div>
  );
}
