"use client";

import React, { useEffect, useState } from "react";
import { Building2, Landmark, Loader2, Save } from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import { saveSiteContentBlock } from "@/features/site-content/api/site-content-api";
import { getBlockDefinition } from "@/features/site-content/constants/blocks";
import { Toast } from "@/lib/utils/toast";

const BLOCK_KEY = "business.details";

type Values = Record<string, string>;

const inputClass =
  "w-full rounded-lg border border-gray-3 bg-gray-1 px-3.5 py-2.5 text-custom-sm text-dark outline-none transition-colors placeholder:text-dark-5 focus:border-blue focus:ring-1 focus:ring-blue";
const labelClass = "mb-1.5 block text-custom-xs font-semibold text-dark";

const GROUPS: { title: string; icon: React.ElementType; names: string[] }[] = [
  {
    title: "Business",
    icon: Building2,
    names: ["legalName", "registrationNumber", "address", "phone", "email", "website"],
  },
  {
    title: "Bank account (printed on invoices)",
    icon: Landmark,
    names: ["bankAccountName", "bankName", "bankBranch", "bankAccountNumber", "invoiceNote"],
  },
];

const BusinessDetailsCard: React.FC = () => {
  const definition = getBlockDefinition(BLOCK_KEY);
  const [values, setValues] = useState<Values | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get(`/site-content/${BLOCK_KEY}`)
      .then((response) => {
        const payload = response.data?.data ?? response.data;
        const block = payload?.block ?? {};
        if (!cancelled) {
          setValues({ ...(definition?.defaults as Values), ...block });
        }
      })
      .catch(() => {
        if (!cancelled) setValues({ ...(definition?.defaults as Values) });
      });
    return () => {
      cancelled = true;
    };
  }, [definition]);

  if (!definition) return null;

  const fieldByName = new Map(definition.fields.map((f) => [f.name, f]));

  const set = (name: string, value: string) => {
    setValues((prev) => ({ ...(prev ?? {}), [name]: value }));
    setDirty(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values) return;
    setSaving(true);
    try {
      await saveSiteContentBlock(BLOCK_KEY, values);
      setDirty(false);
      Toast.success("Business details saved. They will appear on new invoices.");
    } catch {
      Toast.error("Could not save business details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
      <div className="border-b border-gray-3 px-5 py-4">
        <h3 className="text-custom-lg font-semibold text-dark">
          Business &amp; invoice details
        </h3>
        <p className="text-custom-xs text-body">
          Shown on every customer invoice and receipt
        </p>
      </div>

      {!values ? (
        <div className="flex items-center gap-2 p-5 text-custom-sm text-body">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 p-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="mb-3 flex items-center gap-2">
                <group.icon className="h-4 w-4 text-blue" />
                <p className="text-custom-sm font-semibold text-dark">
                  {group.title}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {group.names.map((name) => {
                  const field = fieldByName.get(name);
                  if (!field) return null;
                  const wide = field.type === "textarea";
                  return (
                    <div key={name} className={wide ? "sm:col-span-2" : ""}>
                      <label htmlFor={`biz-${name}`} className={labelClass}>
                        {field.label}
                      </label>
                      {field.type === "textarea" ? (
                        <textarea
                          id={`biz-${name}`}
                          rows={field.rows ?? 2}
                          maxLength={field.maxLength}
                          value={values[name] ?? ""}
                          onChange={(e) => set(name, e.target.value)}
                          className={inputClass}
                        />
                      ) : (
                        <input
                          id={`biz-${name}`}
                          type="text"
                          maxLength={"maxLength" in field ? field.maxLength : undefined}
                          placeholder={"placeholder" in field ? field.placeholder : undefined}
                          value={values[name] ?? ""}
                          onChange={(e) => set(name, e.target.value)}
                          className={inputClass}
                        />
                      )}
                      {field.help && (
                        <p className="mt-1 text-[11.5px] text-dark-5">{field.help}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-end gap-3 border-t border-gray-3 pt-4">
            {dirty && (
              <span className="text-custom-xs text-dark-5">Unsaved changes</span>
            )}
            <button
              type="submit"
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 rounded-lg bg-blue px-5 py-2.5 text-custom-sm font-medium text-white transition hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save details
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default BusinessDetailsCard;
