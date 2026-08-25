"use client";

import React, { useState } from "react";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import ContentImageField from "./ContentImageField";
import type { Field } from "@/features/site-content/types/site-content";

const inputClass =
  "w-full rounded-xl border border-gray-3 bg-gray-2 px-3.5 py-2.5 text-[13.5px] text-dark outline-none transition-colors placeholder:text-dark-5 focus:border-blue focus:ring-1 focus:ring-blue";

const labelClass = "mb-1.5 block text-[12.5px] font-semibold text-dark";

/** A repeater row: collapsible, so a 12-link column stays manageable. */
// Item identity survives reorders and removals so per-row UI state follows the item.
const rowKeyMap = new WeakMap<object, string>();
let rowKeySeq = 0;
function getRowKeys(items: unknown[]): string[] {
  return items.map((item, index) => {
    if (item && typeof item === "object") {
      let key = rowKeyMap.get(item);
      if (!key) {
        key = `row-${++rowKeySeq}`;
        rowKeyMap.set(item, key);
      }
      return key;
    }
    return `row-primitive-${index}`;
  });
}

function RepeaterRow({
  index,
  title,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
  children,
}: {
  index: number;
  title: string;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-3 bg-gray-2">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <GripVertical className="h-4 w-4 shrink-0 text-dark-5" />

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-dark-4 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
          <span className="truncate text-[13px] font-semibold text-dark">
            {title || `Item ${index + 1}`}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={!canMoveUp}
            title="Move up"
            className="rounded-md px-1.5 py-1 text-[11px] font-bold text-dark-4 transition-colors hover:bg-gray-1 hover:text-blue disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={!canMoveDown}
            title="Move down"
            className="rounded-md px-1.5 py-1 text-[11px] font-bold text-dark-4 transition-colors hover:bg-gray-1 hover:text-blue disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remove"
            className="rounded-md p-1.5 text-dark-4 transition-colors hover:bg-red-light-6 hover:text-red"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-3.5 border-t border-gray-3 bg-gray-1 px-3 py-3.5">
          {children}
        </div>
      )}
    </div>
  );
}

export default function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: any;
  onChange: (next: any) => void;
}) {
  switch (field.type) {
    case "boolean":
      return (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-3 bg-gray-2 px-3.5 py-3">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-blue"
          />
          <span>
            <span className="block text-[13px] font-semibold text-dark">
              {field.label}
            </span>
            {field.help && (
              <span className="block text-[12px] text-dark-4">{field.help}</span>
            )}
          </span>
        </label>
      );

    case "textarea":
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <textarea
            value={value ?? ""}
            rows={field.rows ?? 3}
            maxLength={field.maxLength}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClass} resize-y leading-relaxed`}
          />
          {field.help && (
            <p className="mt-1 text-[12px] text-dark-4">{field.help}</p>
          )}
        </div>
      );

    case "image":
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <ContentImageField
            field={field}
            value={value ?? ""}
            onChange={onChange}
          />
        </div>
      );

    case "select":
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <select
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );

    case "repeater": {
      const items: any[] = Array.isArray(value) ? value : [];
      const rowKeys = getRowKeys(items);
      const atMax = field.max !== undefined && items.length >= field.max;
      const atMin = field.min !== undefined && items.length <= field.min;

      const update = (index: number, next: any) => {
        const copy = [...items];
        copy[index] = next;
        onChange(copy);
      };

      const move = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= items.length) return;
        const copy = [...items];
        [copy[index], copy[target]] = [copy[target], copy[index]];
        onChange(copy);
      };

      return (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="text-[12.5px] font-semibold text-dark">
              {field.label}
              <span className="ml-1.5 font-normal text-dark-4">
                ({items.length}
                {field.max ? ` / ${field.max}` : ""})
              </span>
            </label>

            <button
              type="button"
              disabled={atMax}
              onClick={() => onChange([...items, { ...field.defaultItem }])}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-3 bg-gray-2 px-3 text-[12.5px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add {field.itemLabel}
            </button>
          </div>

          <div className="space-y-2">
            {items.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-3 px-4 py-5 text-center text-[12.5px] text-dark-4">
                No {field.itemLabel}s yet.
              </p>
            )}

            {items.map((item, index) => (
              <RepeaterRow
                key={rowKeys[index]}
                index={index}
                title={
                  field.titleField
                    ? String(item?.[field.titleField] ?? "")
                    : `${field.itemLabel} ${index + 1}`
                }
                canMoveUp={index > 0}
                canMoveDown={index < items.length - 1}
                onMove={(direction) => move(index, direction)}
                onRemove={() => {
                  if (atMin) return;
                  onChange(items.filter((_, i) => i !== index));
                }}
              >
                {field.fields.map((child) => (
                  <FieldRenderer
                    key={child.name}
                    field={child}
                    value={item?.[child.name]}
                    onChange={(next) =>
                      update(index, { ...item, [child.name]: next })
                    }
                  />
                ))}
              </RepeaterRow>
            ))}
          </div>
        </div>
      );
    }

    case "link":
    case "text":
    default:
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <input
            type="text"
            value={value ?? ""}
            placeholder={"placeholder" in field ? field.placeholder : undefined}
            maxLength={"maxLength" in field ? field.maxLength : undefined}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
          {field.help && (
            <p className="mt-1 text-[12px] text-dark-4">{field.help}</p>
          )}
        </div>
      );
  }
}
