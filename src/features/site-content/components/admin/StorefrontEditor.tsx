"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, RotateCcw, Save, Sparkles } from "lucide-react";
import FieldRenderer from "./FieldRenderer";
import {
  BLOCKS,
  BLOCK_GROUPS,
  BLOCK_MAP,
} from "@/features/site-content/constants/blocks";
import {
  getSiteContentBlocks,
  resetSiteContentBlock,
  saveSiteContentBlock,
  type AdminBlock,
} from "@/features/site-content/api/site-content-api";
import { Toast } from "@/lib/utils/toast";
import type { BlockData } from "@/features/site-content/types/site-content";

/**
 * Storefront content editor.
 *
 * A block list on the left, the selected block's generated form on the right.
 * Nothing here is hand-written per block — the form comes from the registry, so
 * a new block appears in this screen the moment it is added to `BLOCKS`.
 */
export default function StorefrontEditor() {
  const [blocks, setBlocks] = useState<Record<string, AdminBlock>>({});
  const [activeKey, setActiveKey] = useState<string>(BLOCKS[0]?.key ?? "");
  const [draft, setDraft] = useState<BlockData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const definition = BLOCK_MAP[activeKey];
  const stored = blocks[activeKey];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getSiteContentBlocks();
      const map = list.reduce<Record<string, AdminBlock>>((acc, block) => {
        acc[block.key] = block;
        return acc;
      }, {});
      setBlocks(map);
    } catch {
      Toast.error("Could not load storefront content.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Re-seed the working copy whenever the selection changes or a save lands.
  useEffect(() => {
    if (stored) setDraft(structuredClone(stored.data));
  }, [stored, activeKey]);

  const dirty = useMemo(() => {
    if (!stored) return false;
    return JSON.stringify(draft) !== JSON.stringify(stored.data);
  }, [draft, stored]);

  const handleSave = async () => {
    if (!definition) return;

    setSaving(true);
    const toastId = Toast.loading("Publishing changes…");

    try {
      const block = await saveSiteContentBlock(definition.key, draft);
      setBlocks((prev) => ({ ...prev, [block.key]: block }));
      Toast.update(toastId, {
        render: "Published — the change is live.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });
    } catch (error: any) {
      Toast.update(toastId, {
        render:
          error?.response?.data?.message || error?.message || "Save failed.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!definition) return;
    if (
      !window.confirm(
        `Restore "${definition.label}" to the sample content? Your edits to this block will be lost.`
      )
    ) {
      return;
    }

    const toastId = Toast.loading("Restoring sample content…");
    try {
      const block = await resetSiteContentBlock(definition.key);
      setBlocks((prev) => ({ ...prev, [block.key]: block }));
      setDraft(structuredClone(block.data));
      Toast.update(toastId, {
        render: "Sample content restored.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });
    } catch (error: any) {
      Toast.update(toastId, {
        render: error?.message || "Could not restore.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[24px] font-bold tracking-tight text-dark">
          Storefront content
        </h2>
        <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-dark-4">
          Every headline, menu, banner and link on the public site. Blocks marked
          <span className="mx-1 font-semibold text-blue">Sample</span>
          are still showing the shipped placeholder content — edit and publish to
          make them yours.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* ------------------------------ block list ----------------------- */}
        <aside className="space-y-5 lg:sticky lg:top-[88px] lg:self-start">
          {BLOCK_GROUPS.map((group) => {
            const groupBlocks = BLOCKS.filter((block) => block.group === group);
            if (!groupBlocks.length) return null;

            return (
              <div key={group}>
                <p className="mb-1.5 px-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-dark-5">
                  {group}
                </p>
                <div className="flex flex-col gap-1">
                  {groupBlocks.map((block) => {
                    const active = block.key === activeKey;
                    const customised = blocks[block.key]?.customised;

                    return (
                      <button
                        key={block.key}
                        type="button"
                        onClick={() => setActiveKey(block.key)}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-semibold transition-colors ${
                          active
                            ? "bg-blue text-white"
                            : "text-dark-3 hover:bg-blue-light-5 hover:text-blue"
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {block.label}
                        </span>
                        {!customised && (
                          <span
                            title="Showing sample content"
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-gray-1 text-dark-5"
                            }`}
                          >
                            Sample
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </aside>

        {/* -------------------------------- editor ------------------------- */}
        <section className="min-w-0 rounded-2xl border border-gray-3 bg-gray-2">
          {loading ? (
            <div className="grid h-64 place-items-center text-dark-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !definition ? (
            <p className="p-6 text-[13.5px] text-dark-4">
              Pick a block to edit.
            </p>
          ) : (
            <>
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[16px] font-bold text-dark">
                      {definition.label}
                    </h3>
                    {stored?.customised ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-green/25 bg-green-light-6 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-green">
                        <Check className="h-3 w-3" />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue/25 bg-blue-light-5 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-blue">
                        <Sparkles className="h-3 w-3" />
                        Sample content
                      </span>
                    )}
                  </div>
                  <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-dark-4">
                    {definition.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {stored?.customised && (
                    <button
                      type="button"
                      onClick={handleReset}
                      title="Restore the shipped sample content"
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-3 px-3.5 text-[13px] font-semibold text-dark-4 transition-colors hover:border-red hover:text-red"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue px-5 text-[13.5px] font-bold text-white transition-colors hover:bg-blue-dark disabled:opacity-45"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {dirty ? "Publish changes" : "Saved"}
                  </button>
                </div>
              </header>

              <div className="space-y-4 px-5 py-5">
                {definition.fields.map((field) => (
                  <FieldRenderer
                    key={field.name}
                    field={field}
                    value={draft[field.name]}
                    onChange={(next) =>
                      setDraft((prev) => ({ ...prev, [field.name]: next }))
                    }
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
