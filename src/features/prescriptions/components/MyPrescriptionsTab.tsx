"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  CalendarClock,
  Check,
  ChevronDown,
  Eye,
  History,
  Loader2,
  FileText,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import {
  deletePrescription,
  getPrescriptionHistory,
  getPrescriptions,
  prescriptionImageUrl,
  updatePrescription,
  type SavedPrescription,
} from "@/features/prescriptions/api/prescription-api";
import { describeEye } from "@/features/lenses/utils/prescription";
import { formatPd } from "@/features/lenses/constants/optics";
import { Toast } from "@/lib/utils/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** What the prescriber said to make, in the customer's words. */
const PRESCRIBED_LABELS: Record<string, string> = {
  SINGLE_VISION: "Single vision",
  BIFOCAL: "Bifocal",
  PROGRESSIVE: "Progressive",
};

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

/**
 * The customer's prescriptions.
 *
 * Only the current version of each is listed. The older ones are still there —
 * an order was made to them — and open behind "Earlier versions", which is
 * also the honest way to show that an eye test a year ago said something
 * different.
 */
export default function MyPrescriptionsTab() {
  const [rows, setRows] = useState<SavedPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<SavedPrescription | null>(
    null,
  );
  const [history, setHistory] = useState<Record<number, SavedPrescription[]>>({});
  const [openHistory, setOpenHistory] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getPrescriptions());
    } catch {
      Toast.error("Couldn't load your prescriptions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rename = async (id: number) => {
    if (!label.trim()) return;
    setBusy(true);
    try {
      await updatePrescription(id, { label: label.trim() });
      setEditing(null);
      await load();
      Toast.success("Renamed.");
    } catch {
      Toast.error("Couldn't rename it.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pendingRemove) return;
    try {
      const result = await deletePrescription(pendingRemove.id);
      Toast.success(result.message);
      await load();
    } catch {
      Toast.error("Couldn't remove it.");
    } finally {
      setPendingRemove(null);
    }
  };

  const toggleHistory = async (id: number) => {
    if (openHistory === id) return setOpenHistory(null);
    setOpenHistory(id);
    if (history[id]) return;
    try {
      const versions = await getPrescriptionHistory(id);
      setHistory((current) => ({ ...current, [id]: versions }));
    } catch {
      Toast.error("Couldn't load the earlier versions.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((row) => (
          <div
            key={row}
            className="h-40 animate-pulse rounded-2xl border border-gray-3 bg-gray-2"
          />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Eye className="h-7 w-7" />}
        title="No prescriptions saved yet"
        description="When you add prescription lenses to a frame, we'll offer to save the powers here — so the next pair takes one tap instead of a form."
        action={{ label: "Browse frames", href: "/shop-with-sidebar" }}
      />
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 shadow-2">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-3 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-[15px] font-bold text-dark">
              Saved prescriptions
            </h2>
            <p className="mt-0.5 text-[12.5px] text-dark-5">
              Pick one at checkout instead of typing it again
            </p>
          </div>
          <p className="text-[12.5px] font-semibold text-dark">{rows.length}</p>
        </div>

        <ul className="divide-y divide-gray-3">
          {rows.map((row) => {
            const expired =
              row.expiresAt && new Date(row.expiresAt).getTime() < Date.now();
            const versions = history[row.id] ?? [];

            return (
              <li key={row.id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {editing === row.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={label}
                          onChange={(event) => setLabel(event.target.value)}
                          maxLength={60}
                          autoFocus
                          className="h-9 w-[200px] rounded-lg border border-gray-3 bg-white px-3 text-[13.5px] text-dark outline-none focus:border-blue"
                        />
                        <button
                          type="button"
                          onClick={() => rename(row.id)}
                          disabled={busy}
                          aria-label="Save name"
                          className="grid h-9 w-9 place-items-center rounded-lg bg-blue text-white disabled:opacity-50"
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          aria-label="Cancel"
                          className="grid h-9 w-9 place-items-center rounded-lg border border-gray-3 text-dark-4"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <h3 className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-dark">
                        {row.label}
                        {row.version > 1 && (
                          <span className="rounded-full bg-gray-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-dark-4">
                            version {row.version}
                          </span>
                        )}
                        {row.prescribedDesign && (
                          <span className="rounded-full bg-blue/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue">
                            {PRESCRIBED_LABELS[row.prescribedDesign]}
                          </span>
                        )}
                        {row.source === "UPLOAD" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue">
                            <Sparkles className="h-3 w-3" />
                            From a photo
                          </span>
                        )}
                        {expired && (
                          <span className="rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-dark">
                            Out of date
                          </span>
                        )}
                      </h3>
                    )}

                    <p className="mt-1 text-[11.5px] text-dark-5">
                      Saved {formatDate(row.createdAt)}
                      {row.issuedAt && ` · tested ${formatDate(row.issuedAt)}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(row.id);
                        setLabel(row.label);
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-3 bg-white px-3 text-[12px] font-semibold text-dark-3 transition-colors hover:border-blue hover:text-blue"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingRemove(row)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-3 bg-white px-3 text-[12px] font-semibold text-dark-3 transition-colors hover:border-red hover:text-red"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>

                <PowerTable prescription={row} />

                {/* Their own slip, from the authenticated route. Reassures a
                    customer that what we hold matches what their optometrist
                    wrote, and is the same document our optician checks. */}
                {row.hasImage && (
                  <a
                    href={prescriptionImageUrl(row.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-blue underline underline-offset-4 hover:text-blue-dark"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View the prescription you uploaded
                  </a>
                )}

                {/* -------------------- earlier versions ------------------- */}
                {(row.version > 1 || row.rootId) && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => toggleHistory(row.id)}
                      aria-expanded={openHistory === row.id}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-blue underline underline-offset-4"
                    >
                      <History className="h-3.5 w-3.5" />
                      Earlier versions
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${
                          openHistory === row.id ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {openHistory === row.id && (
                      <ul className="mt-3 space-y-2 border-l-2 border-gray-3 pl-4">
                        {versions
                          .filter((version) => version.id !== row.id)
                          .map((version) => (
                            <li key={version.id}>
                              <p className="text-[12px] font-semibold text-dark-4">
                                Version {version.version} ·{" "}
                                {formatDate(version.createdAt)}
                              </p>
                              <p className="mt-0.5 font-mono text-[11.5px] leading-relaxed text-dark-5">
                                {version.summary}
                              </p>
                            </li>
                          ))}
                        {versions.length <= 1 && (
                          <li className="text-[12px] text-dark-5">
                            No earlier versions on file.
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex items-start gap-2.5 border-t border-gray-3 px-5 py-4 sm:px-6">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-dark-4" />
          <p className="text-[12px] leading-relaxed text-dark-5">
            Prescriptions change. When you next order with different powers we
            save them as a new version and keep the old one, so a pair made
            last year can still be matched exactly.{" "}
            <Link
              href="/contact"
              className="font-semibold text-blue underline underline-offset-4"
            >
              Book an eye test
            </Link>
            .
          </p>
        </div>
      </div>

      <AlertDialog
        open={Boolean(pendingRemove)}
        onOpenChange={(open) => !open && setPendingRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingRemove?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              It disappears from your checkout list. If any order was made to
              it, we keep it on that order&apos;s record so the pair can be
              remade exactly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-red hover:bg-red-dark"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** The powers laid out the way the slip is, so they can be checked at a glance. */
function PowerTable({ prescription }: { prescription: SavedPrescription }) {
  const { values } = prescription;
  const pd =
    values.pdRight !== null && values.pdLeft !== null
      ? `${values.pdRight} / ${values.pdLeft} mm`
      : formatPd(values.pdSingle);

  return (
    <div className="mt-3.5 overflow-x-auto rounded-xl border border-gray-3 bg-gray-1">
      <table className="w-full min-w-[380px] text-left">
        <tbody className="divide-y divide-gray-3">
          <tr>
            <th
              scope="row"
              className="w-[110px] px-4 py-2.5 align-top text-[11.5px] font-bold uppercase tracking-[0.1em] text-dark-4"
            >
              OD right
            </th>
            <td className="px-4 py-2.5 font-mono text-[12.5px] text-dark-2">
              {describeEye(values.right)}
            </td>
          </tr>
          <tr>
            <th
              scope="row"
              className="px-4 py-2.5 align-top text-[11.5px] font-bold uppercase tracking-[0.1em] text-dark-4"
            >
              OS left
            </th>
            <td className="px-4 py-2.5 font-mono text-[12.5px] text-dark-2">
              {describeEye(values.left)}
            </td>
          </tr>
          <tr>
            <th
              scope="row"
              className="px-4 py-2.5 align-top text-[11.5px] font-bold uppercase tracking-[0.1em] text-dark-4"
            >
              PD
            </th>
            <td className="px-4 py-2.5 font-mono text-[12.5px] text-dark-2">
              {pd}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
