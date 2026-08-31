"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  ProductFormData,
  EMPTY_EYEWEAR_FIELDS,
  type EyewearFormFields,
  toEyewearPayload,
  toColorStocksPayload,
  colorRowsHaveCounts,
  colorRowsPartiallyCounted,
  sumColorRows,
} from "../types";
import EyewearSpecFields from "../EyewearSpecFields";
import { createProduct } from "@/features/products/api/product-api";
import { uploadApi } from "@/features/uploads/api/upload-api";
import { ProductStatus } from "@/features/products/types/product";
import ImageUpload from "../ImageUpload";
import CatalogueUpload from "../CatalogueUpload";
import { Toast } from "@/lib/utils/toast";
import { useBrands } from "@/features/brands/hooks/use-brands";
import { useCategoriesCache } from "@/features/categories/hooks/use-categories-cache";

interface PrefillData extends Partial<EyewearFormFields> {
  title: string;
  slug: string;
  categoryId: number | null;
  brandId: number | null;
  price: number;
  discountedPrice?: number;
  stock: number;
  unitType: string;
  status: string;
  description: string;
}

interface AddProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefillData?: PrefillData;
}

const AddProductDialog: React.FC<AddProductDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  prefillData,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    images: string[];
    catalogue: string | null;
  }>({ images: [], catalogue: null });
  const [hasSlugBeenTouched, setHasSlugBeenTouched] = useState(false);

  const form = useForm<ProductFormData>({
    defaultValues: {
      title: "",
      slug: "",
      categoryId: null,
      brandId: null,
      stock: undefined,
      sku: "",
      barcode: "",
      price: undefined,
      discountedPrice: undefined,
      status: "ACTIVE",
      unitType: "PIECES",
      description: "",
      images: [],
      catalogueFile: null,
      ...EMPTY_EYEWEAR_FIELDS,
    },
  });

  const { brands: brandOptions } = useBrands();
  const { data: cachedCategories, error: categoriesError } = useCategoriesCache(
    { page: 1, limit: 200 },
    { staleTimeMs: 10 * 60 * 1000, enabled: isOpen }
  );

  const categories = cachedCategories?.categories || [];

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  useEffect(() => {
    if (!categoriesError || !isOpen) return;
    const message =
      (categoriesError as any)?.data?.message ||
      (categoriesError as any)?.data ||
      (categoriesError as any)?.error ||
      "Failed to load categories";
    Toast.error(message);
  }, [categoriesError, isOpen]);

  const watchedTitle = form.watch("title");
  const watchedSlug = form.watch("slug");
  const watchedStock = form.watch("stock");
  const watchedStatus = form.watch("status");
  const watchedColorRows = form.watch("colorStocks");

  // Once any colour carries a count, the total is their sum and the stock
  // box stops being editable — two numbers disagreeing helps no one.
  const stockFromColors = colorRowsHaveCounts(watchedColorRows);
  const colorRowsTotal = sumColorRows(watchedColorRows);

  useEffect(() => {
    if (!stockFromColors) return;
    if (form.getValues("stock") !== colorRowsTotal) {
      form.setValue("stock", colorRowsTotal, { shouldDirty: true });
    }
  }, [form, stockFromColors, colorRowsTotal]);

  useEffect(() => {
    const isSlugDirty = !!form.formState.dirtyFields.slug;
    if (watchedTitle && !watchedSlug && !isSlugDirty && !hasSlugBeenTouched) {
      form.setValue("slug", generateSlug(watchedTitle), { shouldDirty: false });
    }
  }, [form, watchedTitle, watchedSlug, hasSlugBeenTouched]);

  useEffect(() => {
    if (isOpen && prefillData) {
      const newTitle = `Copy of ${prefillData.title}`;
      form.reset({
        title: newTitle,
        slug: generateSlug(newTitle),
        categoryId: prefillData.categoryId,
        brandId: prefillData.brandId,
        price: prefillData.price,
        discountedPrice: prefillData.discountedPrice,
        stock: prefillData.stock,
        unitType: prefillData.unitType as any,
        status: prefillData.status as ProductStatus,
        description: prefillData.description,
        ...EMPTY_EYEWEAR_FIELDS,
        ...Object.fromEntries(
          Object.keys(EMPTY_EYEWEAR_FIELDS).map((key) => [
            key,
            (prefillData as unknown as Record<string, unknown>)[key] ??
              EMPTY_EYEWEAR_FIELDS[key as keyof EyewearFormFields],
          ]),
        ),
        images: [],
        catalogueFile: null,
      });
      setHasSlugBeenTouched(true);
    } else if (!isOpen) {
      setHasSlugBeenTouched(false);
    }
  }, [isOpen, prefillData, form]);

  useEffect(() => {
    if (watchedStock === 0 && watchedStatus !== "OUT_OF_STOCK") {
      form.setValue("status", "OUT_OF_STOCK", { shouldDirty: true });
    }
  }, [form, watchedStock, watchedStatus]);

  const onSubmit = async (data: ProductFormData) => {
    // Validate required fields
    if (!data.title?.trim()) {
      Toast.error("Product title is required");
      return;
    }

    if (data.categoryId == null) {
      Toast.error("Category is required");
      return;
    }

    if (!data.slug?.trim()) {
      Toast.error("SKU code is required");
      return;
    }

    if (!data.description?.trim()) {
      Toast.error("Description is required");
      return;
    }

    if (data.price <= 0) {
      Toast.error("Price must be greater than 0");
      return;
    }

    if (data.discountedPrice && data.discountedPrice >= data.price) {
      Toast.error("Discounted price must be less than regular price");
      return;
    }

    if (data.stock < 0) {
      Toast.error("Stock cannot be negative");
      return;
    }

    if (colorRowsPartiallyCounted(data.colorStocks)) {
      Toast.error(
        "Give every colour a quantity (0 for sold out), or leave them all blank",
      );
      return;
    }

    if (!data.images || data.images.length === 0) {
      form.setError("images", {
        type: "manual",
        message: "At least one product image is required",
      });
      Toast.error("At least one product image is required");
      return;
    }

    setIsLoading(true);
    const toastId = Toast.loading("Creating product...");

    try {
      const productData = {
        title: data.title,
        slug: generateSlug(data.slug?.trim() || data.title),
        description: data.description,
        price: data.price,
        discountedPrice: data.discountedPrice,
        images: data.images || [],
        catalogueFile: data.catalogueFile,
        categoryId: data.categoryId ?? undefined,
        brandId: data.brandId ?? undefined,
        stock: data.stock,
        sku: data.sku?.trim() || null,
        barcode: data.barcode?.trim() || null,
        status: data.status,
        unitType: data.unitType,
        ...toEyewearPayload(data),
        colorStocks: toColorStocksPayload(data.colorStocks),
      };

      await createProduct(productData);

      Toast.update(toastId, {
        render: "Product created successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      // Clear uploaded files tracking (don't delete - product created successfully)
      setUploadedFiles({ images: [], catalogue: null });
      setHasSlugBeenTouched(false);
      form.reset();
      onClose();
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to create product:", error);

      // Clean up uploaded files on failure
      await cleanupUploadedFiles();
      setUploadedFiles({ images: [], catalogue: null });

      Toast.update(toastId, {
        render:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to create product. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupUploadedFiles = async () => {
    const deletePromises: Promise<void>[] = [];

    // Delete uploaded images
    if (uploadedFiles.images.length > 0) {
      uploadedFiles.images.forEach((fileName) => {
        deletePromises.push(uploadApi.deleteFile("product/image", fileName));
      });
    }

    // Delete uploaded catalogue
    if (uploadedFiles.catalogue) {
      deletePromises.push(
        uploadApi.deleteFile("product/catalogue", uploadedFiles.catalogue)
      );
    }

    try {
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error cleaning up uploaded files:", error);
    }
  };

  const handleClose = async () => {
    // Clean up uploaded files if product wasn't created
    if (uploadedFiles.images.length > 0 || uploadedFiles.catalogue) {
      await cleanupUploadedFiles();
    }

    form.reset();
    setHasSlugBeenTouched(false);
    setUploadedFiles({ images: [], catalogue: null });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {prefillData ? "Duplicate Product" : "Add New Product"}
          </DialogTitle>
          <DialogDescription>
            {prefillData
              ? `Copied from "${prefillData.title}". Update the title, SKU, and upload new images.`
              : "Fill in the product details below"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="overflow-y-auto flex-1 px-1">
              <div className="space-y-5">
                {/* Product Title */}
                <FormField
                  control={form.control}
                  name="title"
                  rules={{ required: "Product title is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Product Title{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Ray-Ban Aviator Classic"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* SKU Code */}
                <FormField
                  control={form.control}
                  name="slug"
                  rules={{ required: "SKU code is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        SKU Code <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., rb-aviator-classic"
                          {...field}
                          onChange={(event) => {
                            field.onChange(event);
                            if (!hasSlugBeenTouched) {
                              setHasSlugBeenTouched(true);
                            }
                          }}
                          onFocus={() => {
                            if (!hasSlugBeenTouched) {
                              setHasSlugBeenTouched(true);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="categoryId"
                  rules={{ required: "Category is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Category <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(val) => {
                          const value = Number(val);
                          field.onChange(Number.isNaN(value) ? null : value);
                          // Reset brand when category changes
                          form.setValue("brandId", null);
                        }}
                        value={
                          field.value !== null && field.value !== undefined
                            ? String(field.value)
                            : ""
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories
                            .filter((c) => !c.parentId)
                            .map((category) => (
                              <SelectItem
                                key={category.id}
                                value={String(category.id)}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Brand (optional) */}
                <FormField
                                    control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <Select
                        onValueChange={(val) =>
                          field.onChange(val === "__none__" ? null : Number(val))
                        }
                        value={
                          field.value !== null && field.value !== undefined
                            ? String(field.value)
                            : "__none__"
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select brand (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No brand</SelectItem>
                          {brandOptions.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price and Discounted Price */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    rules={{
                      required: "Price is required",
                      min: {
                        value: 0.01,
                        message: "Price must be greater than 0",
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Price <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="8500"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || value === null) {
                                field.onChange("");
                              } else {
                                const numValue = parseFloat(value);
                                field.onChange(isNaN(numValue) ? "" : numValue);
                              }
                            }}
                            onFocus={(e) => {
                              if (field.value === 0) {
                                e.target.select();
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discountedPrice"
                    rules={{
                      min: {
                        value: 0.01,
                        message: "Discounted price must be greater than 0",
                      },
                      validate: (value) => {
                        const price = form.getValues("price");
                        if (value && value >= price) {
                          return "Discounted price must be less than regular price";
                        }
                        return true;
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discounted Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="7250"
                            {...field}
                            value={
                              field.value !== undefined && field.value !== null
                                ? field.value
                                : ""
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || value === null) {
                                field.onChange(undefined);
                              } else {
                                const numValue = parseFloat(value);
                                field.onChange(
                                  isNaN(numValue) ? undefined : numValue
                                );
                              }
                            }}
                            onFocus={(e) => {
                              if (field.value === 0 || !field.value) {
                                e.target.select();
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Shop code and barcode  used by the counter, not the website */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shop code (SKU)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="MO-RB2140-BLK"
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
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Scan or type the barcode"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Stock */}
                <FormField
                  control={form.control}
                  name="stock"
                  rules={{
                    required: "Stock is required",
                    min: { value: 0, message: "Stock cannot be negative" },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Stock <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="50"
                          {...field}
                          disabled={stockFromColors}
                          value={
                            stockFromColors
                              ? colorRowsTotal
                              : (field.value ?? "")
                          }
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                          onFocus={(e) => {
                            if (field.value === 0) {
                              e.target.select();
                            }
                          }}
                        />
                      </FormControl>
                      {stockFromColors && (
                        <p className="text-custom-xs text-dark-5">
                          Totalled from the colour counts below.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quantity Unit */}
                <FormField
                  control={form.control}
                  name="unitType"
                  rules={{ required: "Quantity unit is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Quantity Unit{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="METER">Meter</SelectItem>
                          <SelectItem value="PIECES">Pieces</SelectItem>
                          <SelectItem value="BOX">Box</SelectItem>
                          <SelectItem value="DRUM">Drum</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  rules={{ required: "Status is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Status <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                          <SelectItem value="OUT_OF_STOCK">
                            Out of Stock
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  rules={{ required: "Description is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Description <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder="Enter product description..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <EyewearSpecFields form={form} />

                {/* Product Images */}
                <FormField
                  control={form.control}
                  name="images"
                  rules={{
                    validate: (value) =>
                      (Array.isArray(value) && value.length > 0) ||
                      "At least one product image is required",
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Images</FormLabel>
                      <FormControl>
                        <ImageUpload
                          images={field.value || []}
                          onChange={(newImages) => {
                            field.onChange(newImages);
                            setUploadedFiles((prev) => ({
                              ...prev,
                              images: newImages,
                            }));
                          }}
                          maxFiles={5}
                          productTitle={form.watch("title")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Catalogue Upload */}
                <FormField
                  control={form.control}
                  name="catalogueFile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Catalogue (PDF)</FormLabel>
                      <FormControl>
                        <CatalogueUpload
                          catalogueFile={field.value}
                          onChange={(newCatalogue) => {
                            field.onChange(newCatalogue);
                            setUploadedFiles((prev) => ({
                              ...prev,
                              catalogue: newCatalogue,
                            }));
                          }}
                          productTitle={form.watch("title")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductDialog;
