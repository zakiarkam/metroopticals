"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  createBrand,
  deleteBrand,
  getBrands,
  updateBrand,
  type Brand,
} from "@/features/brands/api/brand-api";
import { uploadApi } from "@/features/uploads/api/upload-api";
import { getBrandLogoUrl } from "@/lib/storageUtils";
import { Toast } from "@/lib/utils/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Brand management.
 *
 * Brands are catalogue data, not editorial content: products point at them, the
 * shop sidebar filters on them, and the storefront brand strip lists them. So
 * they are managed here like categories rather than typed into a content block.
 *
 * A brand with products cannot be deleted — the service blocks it — so the
 * delete action explains that instead of failing opaquely.
 */

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

type FormState = {
  name: string;
  slug: string;
  logo: string;
  status: "active" | "inactive";
};

const EMPTY: FormState = { name: "", slug: "", logo: "", status: "active" };

function LogoUpload({
  value,
  brandName,
  onChange,
}: {
  value: string;
  brandName: string;
  onChange: (next: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const preview = getBrandLogoUrl(value);

  const upload = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      Toast.error("Use a PNG, JPG, WebP or SVG logo.");
      return;
    }

    setUploading(true);
    try {
      const slug =
        brandName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "brand";
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const fileName = `${slug}-${Date.now()}.${extension}`;

      const response = await uploadApi.uploadFile(file, "brand/image", fileName);
      onChange(response.fileName || fileName);
      Toast.success("Logo uploaded.");
    } catch (error: any) {
      Toast.error(
        error?.response?.data?.error || error?.message || "Upload failed."
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-dark">Logo</p>

      <div className="flex items-center gap-4">
        <div className="relative grid h-20 w-32 shrink-0 place-items-center overflow-hidden rounded-xl border border-gray-3 bg-gray-1">
          {preview ? (
            <Image
              src={preview}
              alt=""
              fill
              sizes="128px"
              unoptimized={preview.endsWith(".svg")}
              className="object-contain p-2"
            />
          ) : (
            <span className="text-[11.5px] text-dark-5">No logo</span>
          )}
          {uploading && (
            <span className="absolute inset-0 grid place-items-center bg-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-blue" />
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-3 px-3.5 text-[13px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue disabled:opacity-50"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {preview ? "Replace" : "Upload"}
          </button>

          {preview && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-left text-[12.5px] font-semibold text-dark-4 transition-colors hover:text-red"
            >
              Remove logo
            </button>
          )}
        </div>
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

export default function BrandsTab() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBrands(await getBrands(true));
    } catch {
      Toast.error("Could not load brands.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setDialogOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setForm({
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo ?? "",
      status: brand.status === "inactive" ? "inactive" : "active",
    });
    setDialogOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      Toast.error("Give the brand a name.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        // Blank means "derive it from the name" — the service slugifies.
        slug: form.slug.trim() || undefined,
        logo: form.logo.trim() || null,
        status: form.status,
      };

      if (editing) await updateBrand(editing.id, payload);
      else await createBrand(payload);

      Toast.success(editing ? "Brand updated." : "Brand added.");
      setDialogOpen(false);
      await load();
    } catch (error: any) {
      Toast.error(
        error?.response?.data?.message || error?.message || "Could not save."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (brand: Brand) => {
    if ((brand.productCount ?? 0) > 0) {
      Toast.error(
        `${brand.name} still has ${brand.productCount} product(s). Move them to another brand first.`
      );
      return;
    }
    if (!window.confirm(`Delete ${brand.name}?`)) return;

    try {
      await deleteBrand(brand.id);
      Toast.success("Brand deleted.");
      await load();
    } catch (error: any) {
      Toast.error(error?.response?.data?.message || "Could not delete.");
    }
  };

  const toggleStatus = async (brand: Brand) => {
    try {
      await updateBrand(brand.id, {
        status: brand.status === "active" ? "inactive" : "active",
      });
      await load();
    } catch {
      Toast.error("Could not change status.");
    }
  };

  const term = search.trim().toLowerCase();
  const visible = term
    ? brands.filter((brand) => brand.name.toLowerCase().includes(term))
    : brands;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight text-dark">
            Brands
          </h2>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-dark-4">
            The designer labels you stock. Products are assigned to a brand, and
            shoppers filter by them in the shop sidebar.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 w-fit items-center gap-2 rounded-xl bg-blue px-6 text-[14px] font-bold text-white transition-colors hover:bg-blue-dark"
        >
          <Plus className="h-4 w-4" />
          Add brand
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brands…"
          className="h-10 w-full rounded-xl border border-gray-3 bg-gray-2 pl-10 pr-4 text-[13.5px] text-dark outline-none focus:border-blue"
        />
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center text-dark-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-3 px-6 py-14 text-center text-[14px] text-dark-4">
          No brands yet. Add your first one to start tagging products.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((brand) => {
            const logo = getBrandLogoUrl(brand.logo);
            const active = brand.status === "active";

            return (
              <article
                key={brand.id}
                className="rounded-2xl border border-gray-3 bg-gray-2 p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="relative grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-gray-3 bg-gray-1">
                    {logo ? (
                      <Image
                        src={logo}
                        alt=""
                        fill
                        sizes="96px"
                        unoptimized={logo.endsWith(".svg")}
                        className="object-contain p-2"
                      />
                    ) : (
                      <span className="text-[15px] font-bold text-dark-5">
                        {brand.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-dark">
                      {brand.name}
                    </p>
                    <p className="truncate text-[12.5px] text-dark-4">
                      /{brand.slug}
                    </p>
                    <p className="mt-1 text-[12.5px] text-dark-4">
                      {brand.productCount ?? 0} product
                      {brand.productCount === 1 ? "" : "s"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleStatus(brand)}
                    title="Toggle visibility"
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide transition-transform hover:scale-105 ${
                      active
                        ? "border-green/25 bg-green-light-6 text-green"
                        : "border-gray-3 bg-gray-1 text-dark-4"
                    }`}
                  >
                    {active ? (
                      <Check className="mr-1 inline h-3 w-3" />
                    ) : (
                      <X className="mr-1 inline h-3 w-3" />
                    )}
                    {active ? "Live" : "Hidden"}
                  </button>
                </div>

                {/* Why a brand is, or is not, in the storefront's Brands menu.
                    The rule (live, stocked, and ideally with a logo) used to be
                    invisible here, so a newly added brand appearing nowhere on
                    the site read as a bug. */}
                <p
                  className={`mt-3 rounded-lg px-3 py-2 text-[12px] leading-relaxed ${
                    active && (brand.productCount ?? 0) > 0
                      ? "bg-green-light-6 text-green"
                      : "bg-gray-1 text-dark-4"
                  }`}
                >
                  {!active
                    ? "Hidden — set it Live to show it in the Brands menu."
                    : (brand.productCount ?? 0) === 0
                      ? "Not in the Brands menu yet — assign at least one product to this brand."
                      : logo
                        ? "Showing in the Brands menu and on the home page."
                        : "In the Brands menu as text — upload a logo to show its mark."}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(brand)}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-3 bg-gray-1 text-[13px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>

                  <Link
                    href={`/shop-with-sidebar?brands=${brand.slug}`}
                    target="_blank"
                    title="View on the shop"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-3 bg-gray-1 text-dark-4 transition-colors hover:border-blue hover:text-blue"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(brand)}
                    title="Delete brand"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-3 bg-gray-1 text-dark-4 transition-colors hover:border-red hover:text-red"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-lg rounded-2xl border border-gray-3 bg-gray-2 p-0">
          <DialogHeader className="border-b border-gray-3 px-6 py-5">
            <DialogTitle className="text-[18px] font-semibold text-dark">
              {editing ? "Edit brand" : "Add brand"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-dark">
                Name <span className="text-red">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ray-Ban"
                className="w-full rounded-xl border border-gray-3 bg-gray-1 px-4 py-2.5 text-[14px] text-dark outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-dark">
                URL slug
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="Leave empty to generate from the name"
                className="w-full rounded-xl border border-gray-3 bg-gray-1 px-4 py-2.5 text-[14px] text-dark outline-none focus:border-blue"
              />
            </div>

            <LogoUpload
              value={form.logo}
              brandName={form.name}
              onChange={(logo) => setForm({ ...form, logo })}
            />

            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-dark">
                Status
              </label>
              <div className="flex gap-2">
                {(["active", "inactive"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setForm({ ...form, status })}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-[13.5px] font-semibold capitalize transition-colors ${
                      form.status === status
                        ? "border-blue bg-blue text-white"
                        : "border-gray-3 bg-gray-1 text-dark hover:border-blue/50"
                    }`}
                  >
                    {status === "active" ? "Live" : "Hidden"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-3 pt-4">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="h-11 rounded-xl border border-gray-3 px-5 text-[14px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue px-6 text-[14px] font-bold text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Add brand"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
