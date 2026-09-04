"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { ImageIcon, Plus, Trash2 } from "lucide-react";
import { getProductImageUrl } from "@/lib/storageUtils";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

/**
 * One row per colourway: the colour's name, how many are on the shelf, and
 * which gallery photo shows it. Quantities left blank keep the product on a
 * single combined count, so a legacy product can be edited without inventing
 * numbers for its colours; the photo can be tagged either way.
 */
function ColorStockRows({ form }: EyewearSpecFieldsProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "colorStocks",
  });
  const galleryImages: string[] = form.watch("images") ?? [];
  /** Which row's photo strip is open; one at a time keeps the form calm. */
  const [pickerFor, setPickerFor] = useState<number | null>(null);

  return (
    <div className="mt-4">
      {/* A plain Label: FormLabel needs a FormField context, and this heading
          belongs to the whole row group rather than any one field. */}
      <Label>Colours &amp; stock per colour</Label>

      {fields.length > 0 && (
        <div className="mt-2 space-y-2">
          {fields.map((row, index) => (
            <div key={row.id}>
              <div className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`colorStocks.${index}.color`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder="e.g. Tortoise"
                          aria-label={`Colour ${index + 1}`}
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
                  name={`colorStocks.${index}.stock`}
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          placeholder="Qty"
                          aria-label={`Stock for colour ${index + 1}`}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* The colour's photo. Shows the tagged image, or a camera
                    placeholder; clicking opens the gallery strip below. */}
                <FormField
                  control={form.control}
                  name={`colorStocks.${index}.image`}
                  render={({ field }) => (
                    <button
                      type="button"
                      onClick={() =>
                        setPickerFor((open) => (open === index ? null : index))
                      }
                      aria-label={`Photo for colour ${index + 1}`}
                      aria-expanded={pickerFor === index}
                      className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border transition ${
                        pickerFor === index
                          ? "border-blue ring-1 ring-blue/40"
                          : "border-gray-3 hover:border-blue/50"
                      }`}
                    >
                      {field.value ? (
                        <Image
                          src={
                            getProductImageUrl(field.value) ??
                            "/images/placeholder-product.svg"
                          }
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-dark-4">
                          <ImageIcon className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  )}
                />

                <button
                  type="button"
                  onClick={() => {
                    remove(index);
                    setPickerFor(null);
                  }}
                  aria-label={`Remove colour ${index + 1}`}
                  className="mt-1.5 rounded-lg p-2 text-dark-4 transition hover:bg-gray-2 hover:text-red"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {pickerFor === index && (
                <div className="mt-2 rounded-lg border border-gray-3 bg-gray-2 p-2">
                  {galleryImages.length === 0 ? (
                    <p className="text-custom-xs text-dark-5">
                      Upload the product images below first, then tag this
                      colour&apos;s photo here.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {galleryImages.map((fileName) => {
                        const selected =
                          form.watch(`colorStocks.${index}.image`) === fileName;
                        return (
                          <button
                            key={fileName}
                            type="button"
                            onClick={() => {
                              form.setValue(
                                `colorStocks.${index}.image`,
                                selected ? "" : fileName,
                                { shouldDirty: true },
                              );
                              setPickerFor(null);
                            }}
                            aria-pressed={selected}
                            className={`relative h-14 w-14 overflow-hidden rounded-lg border-2 transition ${
                              selected
                                ? "border-blue"
                                : "border-transparent hover:border-blue/50"
                            }`}
                          >
                            <Image
                              src={
                                getProductImageUrl(fileName) ??
                                "/images/placeholder-product.svg"
                              }
                              alt=""
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          form.setValue(`colorStocks.${index}.image`, "", {
                            shouldDirty: true,
                          });
                          setPickerFor(null);
                        }}
                        className="rounded-lg border border-gray-3 px-2.5 py-1.5 text-custom-xs font-medium text-dark-4 transition hover:border-red/40 hover:text-red"
                      >
                        No photo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => append({ color: "", stock: "", image: "" })}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add colour
      </Button>

      <p className="mt-2 text-custom-xs text-dark-5">
        Give each colour its quantity and the product stock adds itself up -
        sold-out colours then show as such in the shop. Leave every quantity
        blank to keep one combined count. The photo button tags which gallery
        image shows the colour; the shop jumps to it when the colour is picked.
      </p>
    </div>
  );
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

      <ColorStockRows form={form} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
