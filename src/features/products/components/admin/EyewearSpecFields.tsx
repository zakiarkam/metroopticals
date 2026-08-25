"use client";

import React from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FRAME_SHAPE_LABELS,
  GENDER_LABELS,
  RIM_TYPE_LABELS,
} from "@/features/products/utils/eyewear";
import type { ProductFormData } from "./types";

/** Sentinel for "no selection"  Radix Select forbids an empty-string value. */
const NONE = "__none__";

interface EyewearSpecFieldsProps {
  form: UseFormReturn<ProductFormData>;
}

export default function EyewearSpecFields({ form }: EyewearSpecFieldsProps) {
  const lensWidth = form.watch("lensWidth");
  const bridgeWidth = form.watch("bridgeWidth");
  const templeLength = form.watch("templeLength");

  const sizeCode =
    lensWidth && bridgeWidth && templeLength
      ? `${lensWidth} □ ${bridgeWidth} - ${templeLength}`
      : null;

  const numberField = (
    name: "lensWidth" | "bridgeWidth" | "templeLength" | "weightGrams",
    label: string,
    placeholder: string,
    hint: string,
    unit: string,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label} <span className="font-normal text-dark-5">({unit})</span>
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="numeric"
              placeholder={placeholder}
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <p className="text-custom-xs text-dark-5">{hint}</p>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const selectField = (
    name: "frameShape" | "rimType" | "gender",
    label: string,
    labels: Record<string, string>,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            value={field.value ? field.value : NONE}
            onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Not specified" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={NONE}>Not specified</SelectItem>
              {Object.entries(labels).map(([value, text]) => (
                <SelectItem key={value} value={value}>
                  {text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <section className="rounded-xl border border-gray-3 bg-gray-1 p-4 sm:p-5">
      <header className="mb-4">
        <h3 className="text-sm font-semibold text-dark">
          Eyewear specification
        </h3>
        <p className="mt-1 text-custom-xs text-body">
          Optional fill these in for frames and sunglasses. Leave blank for
          accessories, solutions and other non-frame products.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {numberField(
          "lensWidth",
          "Lens width",
          "50",
          "Width of one lens, 20–90mm.",
          "mm",
        )}
        {numberField(
          "bridgeWidth",
          "Bridge width",
          "17",
          "Gap between lenses, 8–40mm.",
          "mm",
        )}
        {numberField(
          "templeLength",
          "Temple length",
          "140",
          "Arm length, 100–200mm.",
          "mm",
        )}
      </div>

      {sizeCode && (
        <p className="mt-3 rounded-lg border border-blue/30 bg-blue-light-5 px-3 py-2 text-custom-xs text-blue">
          Size code shown to customers:{" "}
          <span className="font-semibold">{sizeCode}</span>
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="frameColors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Colours</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Tortoise, Black, Havana"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="frameMaterial"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Material</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Acetate"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {numberField(
          "weightGrams",
          "Weight",
          "11",
          "1–200g. Under 20g shows as “Lightweight”.",
          "g",
        )}
        {selectField("frameShape", "Shape", FRAME_SHAPE_LABELS)}
        {selectField("rimType", "Rim", RIM_TYPE_LABELS)}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {selectField("gender", "Suits", GENDER_LABELS)}
      </div>
    </section>
  );
}
