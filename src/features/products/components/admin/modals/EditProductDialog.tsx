"use client";
import React, { useCallback, useEffect, useState } from "react";
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
  toEyewearPayload,
  toEyewearFormFields,
} from "../types";
import EyewearSpecFields from "../EyewearSpecFields";
import { updateProduct, getProductById } from "@/features/products/api/product-api";
import { uploadApi } from "@/features/uploads/api/upload-api";
import { ProductStatus } from "@/features/products/types/product";
import ImageUpload from "../ImageUpload";
import CatalogueUpload from "../CatalogueUpload";
import { Toast } from "@/lib/utils/toast";
import { useBrands } from "@/features/brands/hooks/use-brands";
import { useCategoriesCache } from "@/features/categories/hooks/use-categories-cache";

interface EditProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  productId: number | null;
}

const EditProductDialog: React.FC<EditProductDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [initialValues, setInitialValues] = useState<ProductFormData | null>(
    null
  );
  const [newlyUploadedFiles, setNewlyUploadedFiles] = useState<{
    images: string[];
    catalogue: string | null;
  }>({ images: [], catalogue: null });
  // Track files removed from initial values during editing
  const [removedFiles, setRemovedFiles] = useState<{
    images: string[];
    catalogue: string | null;
  }>({ images: [], catalogue: null });

  const form = useForm<ProductFormData>({
    defaultValues: {
      title: "",
      slug: "",
      categoryId: null,
      brandId: null,
      stock: undefined,
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

  const watchedStock = form.watch("stock");
  const watchedStatus = form.watch("status");

  const { brands: brandOptions } = useBrands();
  const { data: cachedCategories, error: categoriesError } = useCategoriesCache(
    { page: 1, limit: 200 },
    { staleTimeMs: 10 * 60 * 1000, enabled: isOpen }
  );

  const categories = cachedCategories?.categories || [];

  const loadProduct = useCallback(async () => {
    if (!productId) return;

    try {
      setIsFetching(true);
      const product = await getProductById(productId);

      const formValues = {
        title: product.title,
        slug: product.slug,
        categoryId: product.category?.id ?? null,
        brandId: (product as any).brand?.id ?? null,
        stock: product.stock,
        price: product.price,
        discountedPrice: product.discountedPrice,
        status: product.status as ProductStatus,
        unitType: (product as any).unitType || "PIECES",
        description: product.description,
        images: Array.isArray(product.images) ? product.images : [],
        catalogueFile: product.catalogueFile || null,
        ...toEyewearFormFields(product),
      };

      form.reset(formValues);
      setInitialValues(formValues);
      setNewlyUploadedFiles({ images: [], catalogue: null });
    } catch (error: any) {
      console.error("Failed to load product:", error);
      Toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load product details"
      );
    } finally {
      setIsFetching(false);
    }
  }, [form, productId]);

  useEffect(() => {
    if (!isOpen) return;
    if (categoriesError) {
      const message =
        (categoriesError as any)?.data?.message ||
        (categoriesError as any)?.data ||
        (categoriesError as any)?.error ||
        "Failed to load categories";
      Toast.error(message);
    }
    if (productId) {
      loadProduct();
    }
  }, [isOpen, productId, categoriesError, loadProduct]);

  useEffect(() => {
    if (watchedStock === 0 && watchedStatus !== "OUT_OF_STOCK") {
      form.setValue("status", "OUT_OF_STOCK", { shouldDirty: true });
    }
  }, [form, watchedStock, watchedStatus]);

  // Reset removedFiles state when dialog opens or product loads
  useEffect(() => {
    if (isOpen) {
      setRemovedFiles({ images: [], catalogue: null });
    }
  }, [isOpen, productId]);

  // Cleanup function for newly uploaded files
  const cleanupNewlyUploadedFiles = async () => {
    const deletePromises: Promise<void>[] = [];

    // Delete newly uploaded images
    if (newlyUploadedFiles.images.length > 0) {
      newlyUploadedFiles.images.forEach((fileName) => {
        deletePromises.push(uploadApi.deleteFile("product/image", fileName));
      });
    }

    // Delete newly uploaded catalogue
    if (newlyUploadedFiles.catalogue) {
      deletePromises.push(
        uploadApi.deleteFile("product/catalogue", newlyUploadedFiles.catalogue)
      );
    }

    try {
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error cleaning up newly uploaded files:", error);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!productId) return;

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

    if (!data.images || data.images.length === 0) {
      form.setError("images", {
        type: "manual",
        message: "At least one product image is required",
      });
      Toast.error("At least one product image is required");
      return;
    }

    setIsLoading(true);
    const toastId = Toast.loading("Updating product...");

    try {
      // If an image was removed, it will not be present in data.images
      // If catalogueFile was removed, it will be null
      const productData = {
        title: data.title,
        slug: generateSlug(data.slug?.trim() || data.title),
        description: data.description,
        price: data.price,
        discountedPrice: data.discountedPrice,
        images: Array.isArray(data.images)
          ? data.images.filter(
              (img) => !!img && typeof img === "string" && img.trim() !== ""
            )
          : [],
        catalogueFile: data.catalogueFile || null,
        categoryId: data.categoryId ?? undefined,
        brandId: data.brandId ?? undefined,
        stock: data.stock,
        status: data.status,
        unitType: data.unitType,
        ...toEyewearPayload(data),
      };

      await updateProduct(productId, productData);

      Toast.update(toastId, {
        render: "Product updated successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      // Clear newly uploaded files tracking (don't delete - product updated successfully)
      setNewlyUploadedFiles({ images: [], catalogue: null });
      form.reset();
      setInitialValues(null);
      onClose();
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to update product:", error);

      // Clean up newly uploaded files on failure
      await cleanupNewlyUploadedFiles();
      setNewlyUploadedFiles({ images: [], catalogue: null });

      Toast.update(toastId, {
        render:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to update product. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup function for removed files (images/catalogue removed during edit)
  const cleanupRemovedFiles = async () => {
    const deletePromises: Promise<void>[] = [];
    // Delete removed images
    if (removedFiles.images.length > 0) {
      removedFiles.images.forEach((fileName) => {
        deletePromises.push(uploadApi.deleteFile("product/image", fileName));
      });
    }
    // Delete removed catalogue
    if (removedFiles.catalogue) {
      deletePromises.push(
        uploadApi.deleteFile("product/catalogue", removedFiles.catalogue)
      );
    }
    try {
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error cleaning up removed files:", error);
    }
  };

  const handleClose = async () => {
    // Clean up newly uploaded files if product wasn't updated
    if (newlyUploadedFiles.images.length > 0 || newlyUploadedFiles.catalogue) {
      await cleanupNewlyUploadedFiles();
    }
    // Clean up removed files if any
    // if (removedFiles.images.length > 0 || removedFiles.catalogue) {
    //   await cleanupRemovedFiles();
    // }
    form.reset();
    setInitialValues(null);
    setNewlyUploadedFiles({ images: [], catalogue: null });
    setRemovedFiles({ images: [], catalogue: null });
    onClose();
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const hasChanges = () => {
    if (!initialValues) return false;
    const currentValues = form.getValues();
    return JSON.stringify(currentValues) !== JSON.stringify(initialValues);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="sticky top-0 z-10 bg-gray-2 border-b border-gray-3 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update the product details below
              </DialogDescription>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-dark-4 transition hover:bg-gray-1 hover:text-dark"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </DialogHeader>

        {isFetching ? (
          <div className="flex items-center justify-center py-12 px-6">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue border-r-transparent"></div>
              <p className="mt-4 text-custom-sm text-body">
                Loading product...
              </p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="overflow-y-auto flex-1 px-6 py-4">
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
                            placeholder="e.g., AeroGlow Sneakers"
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
                          <Input placeholder="e.g., ags-123" {...field} />
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
                              placeholder="199.99"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "" || value === null) {
                                  field.onChange("");
                                } else {
                                  const numValue = parseFloat(value);
                                  field.onChange(
                                    isNaN(numValue) ? "" : numValue
                                  );
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
                              placeholder="149.99"
                              {...field}
                              value={
                                field.value !== undefined &&
                                field.value !== null
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
                            value={field.value ?? ""}
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
                            {/* <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="SCHEDULED">Scheduled</SelectItem> */}
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
                          Description{" "}
                          <span className="text-destructive">*</span>
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
                              const initialImages = initialValues?.images || [];
                              // Track newly added images (not in initial values)
                              const addedImages = newImages.filter(
                                (img) => !initialImages.includes(img)
                              );
                              setNewlyUploadedFiles((prev) => ({
                                ...prev,
                                images: addedImages,
                              }));
                              // Track removed images (in initial, but not in newImages)
                              const removed = initialImages.filter(
                                (img) => !newImages.includes(img)
                              );
                              setRemovedFiles((prev) => ({
                                ...prev,
                                images: removed,
                              }));
                              field.onChange(newImages);
                            }}
                            maxFiles={5}
                            productTitle={form.watch("title")}
                            productId={productId}
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
                              const initialCatalogue =
                                initialValues?.catalogueFile;
                              const isNewCatalogue =
                                newCatalogue &&
                                newCatalogue !== initialCatalogue;
                              setNewlyUploadedFiles((prev) => ({
                                ...prev,
                                catalogue: isNewCatalogue ? newCatalogue : null,
                              }));
                              // Track removed catalogue (was present, now removed)
                              const removedCatalogue =
                                initialCatalogue && !newCatalogue
                                  ? initialCatalogue
                                  : null;
                              setRemovedFiles((prev) => ({
                                ...prev,
                                catalogue: removedCatalogue,
                              }));
                              field.onChange(newCatalogue);
                            }}
                            productTitle={form.watch("title")}
                            productId={productId}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="sticky bottom-0 bg-gray-2 border-t border-gray-3 px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !hasChanges()}>
                  {isLoading ? "Updating..." : "Update Product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditProductDialog;
