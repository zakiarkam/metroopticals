import React from "react";
import Link from "next/link";
import type { Product } from "@/features/products/types/product";
import {
  FRAME_SHAPE_LABELS,
  GENDER_LABELS,
  RIM_TYPE_LABELS,
  formatFrameSizeCode,
  formatWeight,
  getFrameSizeLabel,
} from "@/features/products/utils/eyewear";

/**
 * The full specification table.
 *
 * The product page used to split this across two places: a row of loose chips
 * for the frame measurements and a separate definition list underneath for
 * brand, category and reference  so brand appeared three times on the page
 * (eyebrow, chips, list) and size appeared nowhere near material. One table,
 * grouped, is what a shopper comparing two frames actually needs.
 *
 * Rows whose value the catalogue does not hold are dropped rather than shown
 * as "", so a sparsely filled product gets a short table instead of a long
 * list of blanks.
 */

type Row = { label: string; value: React.ReactNode };
type Group = { title: string; rows: Row[] };

/** `PIECES` is how the column is stored; "Pieces" is how it is read. */
const unitLabel = (unit: string) =>
  unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();

/** Links back into the shop filter that would find more like this one. */
const filterLink = (query: string, label: string) => (
  <Link
    href={`/shop-with-sidebar?${query}`}
    className="font-semibold text-blue underline-offset-2 hover:underline"
  >
    {label}
  </Link>
);

export default function ProductSpecTable({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const spec = {
    lensWidth: product.lensWidth,
    bridgeWidth: product.bridgeWidth,
    templeLength: product.templeLength,
    frameColors: product.frameColors,
    frameMaterial: product.frameMaterial,
    weightGrams: product.weightGrams,
    frameShape: product.frameShape,
    gender: product.gender,
    rimType: product.rimType,
  };

  const sizeCode = formatFrameSizeCode(spec);
  const sizeLabel = getFrameSizeLabel(product.lensWidth);
  const weight = formatWeight(product.weightGrams);

  const groups: Group[] = [
    {
      title: "The frame",
      rows: [
        product.brand?.name && {
          label: "Brand",
          value: product.brand.slug
            ? filterLink(
                `brands=${encodeURIComponent(product.brand.slug)}`,
                product.brand.name,
              )
            : product.brand.name,
        },
        product.category?.name && {
          label: "Category",
          value: product.category.slug
            ? filterLink(
                `categories=${encodeURIComponent(product.category.slug)}`,
                product.category.name,
              )
            : product.category.name,
        },
        product.frameShape && {
          label: "Shape",
          value: filterLink(
            `shapes=${product.frameShape}`,
            FRAME_SHAPE_LABELS[product.frameShape],
          ),
        },
        product.rimType && {
          label: "Rim",
          value: RIM_TYPE_LABELS[product.rimType],
        },
        product.frameMaterial && {
          label: "Material",
          value: product.frameMaterial,
        },
        product.frameColors?.length && {
          label: "Colour",
          value: product.frameColors.join(", "),
        },
        product.gender && {
          label: "Suits",
          value: filterLink(
            `genders=${product.gender}`,
            GENDER_LABELS[product.gender],
          ),
        },
      ].filter(Boolean) as Row[],
    },
    {
      title: "Measurements",
      rows: [
        sizeLabel && { label: "Size", value: sizeLabel },
        product.lensWidth != null && {
          label: "Lens width",
          value: `${product.lensWidth} mm`,
        },
        product.bridgeWidth != null && {
          label: "Bridge width",
          value: `${product.bridgeWidth} mm`,
        },
        product.templeLength != null && {
          label: "Temple length",
          value: `${product.templeLength} mm`,
        },
        sizeCode && {
          label: "Size code",
          value: <span className="tabular-nums">{sizeCode}</span>,
        },
        weight && { label: "Weight", value: weight },
      ].filter(Boolean) as Row[],
    },
    {
      title: "Ordering",
      rows: [
        product.slug && {
          label: "Reference",
          value: (
            <span className="font-mono text-[12.5px] normal-case text-dark-3">
              {product.slug}
            </span>
          ),
        },
        product.unitType && {
          label: "Sold by",
          value: unitLabel(product.unitType),
        },
        typeof product.stock === "number" && {
          label: "In stock",
          value: `${product.stock}`,
        },
      ].filter(Boolean) as Row[],
    },
  ].filter((group) => group.rows.length > 0);

  if (!groups.length) return null;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 ${className}`}
    >
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Specifications for {product.title}
        </caption>
        <tbody>
          {groups.map((group) => (
            <React.Fragment key={group.title}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={2}
                  className="border-b border-gray-3 bg-gray-8 px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-dark-4"
                >
                  {group.title}
                </th>
              </tr>

              {group.rows.map((row) => (
                <tr
                  key={`${group.title}-${row.label}`}
                  className="border-b border-gray-3 last:border-b-0 even:bg-gray-1/60"
                >
                  <th
                    scope="row"
                    className="w-[42%] px-5 py-3 align-top text-[13px] font-medium text-dark-4"
                  >
                    {row.label}
                  </th>
                  <td className="px-5 py-3 align-top text-[13.5px] font-semibold text-dark">
                    {row.value}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
