"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateCategory } from "@/features/categories/api/category-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Category } from "@/features/categories/types/category";
import { Toast } from "@/lib/utils/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CategoryImageUpload from "../CategoryImageUpload";
import { useCategoriesCache } from "@/features/categories/hooks/use-categories-cache";
import { uploadApi } from "@/features/uploads/api/upload-api";

const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  // Remove slug from schema since it's auto-generated
  status: z.enum(["active", "inactive"]),
  parentId: z.string().optional(),
  image: z.string().min(1, "Category image is required"),
});

type CategoryFormData = z.infer<typeof categorySchema>;

type EditCategoryDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  category: Category | null;
  categories: Category[];
};

const EditCategoryDialog: React.FC<EditCategoryDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  category,
  categories,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialValues, setInitialValues] = useState<CategoryFormData | null>(
    null
  );
  const [newlyUploadedImage, setNewlyUploadedImage] = useState<string | null>(
    null
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    setError,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      status: "active",
      parentId: "none",
      image: null,
    },
  });

  const {
    data: parentCategoriesData,
    error: parentCategoriesError,
    refresh: refreshParentCategories,
  } = useCategoriesCache(
    { page: 1, limit: 500 },
    { staleTimeMs: 10 * 60 * 1000 }
  );

  useEffect(() => {
    if (parentCategoriesError && isOpen) {
      Toast.error(parentCategoriesError);
    }
  }, [isOpen, parentCategoriesError]);

  const combinedCategories = useMemo(() => {
    const base = parentCategoriesData?.categories ?? categories;
    if (!category) return base;
    if (base.some((item) => item.id === category.id)) return base;
    return [...base, category];
  }, [categories, category, parentCategoriesData?.categories]);

  const descendantIds = useMemo(() => {
    if (!category) return new Set<number>();

    const collectDescendants = (parentId: number, all: Category[]): number[] =>
      all
        .filter((item) => item.parentId === parentId)
        .flatMap((child) => [child.id, ...collectDescendants(child.id, all)]);

    return new Set(collectDescendants(category.id, combinedCategories));
  }, [category, combinedCategories]);

  const availableParents = useMemo(
    () =>
      combinedCategories.filter(
        (item) =>
          item.id !== category?.id &&
          !item.parentId &&
          !descendantIds.has(item.id)
      ),
    [combinedCategories, category?.id, descendantIds]
  );

  useEffect(() => {
    if (category) {
      const formValues = {
        name: category.name,
        description: category.description || "",
        status: category.status,
        parentId: category.parentId ? String(category.parentId) : "none",
        image: category.image || null,
      };
      reset(formValues);
      setInitialValues(formValues);
      setNewlyUploadedImage(null);
    }
  }, [category, reset]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const onSubmit = async (data: CategoryFormData) => {
    if (!category) return;

    // Validate required fields
    if (!data.name?.trim()) {
      Toast.error("Category name is required");
      return;
    }

    if (data.name.trim().length < 2) {
      Toast.error("Category name must be at least 2 characters");
      return;
    }

    if (!data.image) {
      setError("image", {
        type: "manual",
        message: "Category image is required",
      });
      Toast.error("Category image is required");
      return;
    }

    setIsSubmitting(true);
    const toastId = Toast.loading("Updating category...");

    try {
      await updateCategory(category.id, {
        name: data.name,
        slug: generateSlug(data.name),
        description: data.description,
        status: data.status || "active",
        parentId:
          data.parentId && data.parentId !== "none"
            ? Number(data.parentId)
            : null,
        image: data.image,
      });

      Toast.update(toastId, {
        render: "Category updated successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      setNewlyUploadedImage(null);
      reset();
      onClose();
      onSuccess?.();
      refreshParentCategories();
    } catch (error: any) {
      console.error("Failed to update category:", error);
      await cleanupNewlyUploadedImage();
      setNewlyUploadedImage(null);

      Toast.update(toastId, {
        render:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to update category. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanupNewlyUploadedImage = async () => {
    if (!newlyUploadedImage) return;
    try {
      await uploadApi.deleteFile("category/image", newlyUploadedImage);
    } catch (error) {
      console.error("Error cleaning up uploaded category image:", error);
    }
  };

  const handleClose = async () => {
    if (newlyUploadedImage) {
      await cleanupNewlyUploadedImage();
    }
    reset();
    setInitialValues(null);
    setNewlyUploadedImage(null);
    onClose();
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      void handleClose();
    }
  };

  const hasChanges = () => {
    if (!initialValues) return false;
    const currentValues = {
      name: register("name").name,
      description: register("description").name,
      status: register("status").name,
      parentId: register("parentId").name,
    };
    return JSON.stringify(currentValues) !== JSON.stringify(initialValues);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update the category details below
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="overflow-y-auto flex-1 px-1">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-custom-sm font-medium text-dark">
                  Category Name <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("name")}
                  className="w-full rounded-lg border border-gray-3 bg-gray-1 px-4 py-2.5 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                  placeholder="e.g., Sunglasses"
                />
                {errors.name && (
                  <p className="mt-1 text-custom-xs text-red">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-custom-sm font-medium text-dark">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={4}
                  className="w-full rounded-lg border border-gray-3 bg-gray-1 px-4 py-2.5 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                  placeholder="Brief description of this category..."
                />
              </div>

              <div>
                <label className="mb-2 block text-custom-sm font-medium text-dark">
                  Category Image <span className="text-destructive">*</span>
                </label>
                <CategoryImageUpload
                  image={watch("image") ?? null}
                  categoryName={watch("name")}
                  inputId="category-image-upload-edit"
                  onChange={(value) => {
                    const initialImage = initialValues?.image ?? null;
                    if (value && value !== initialImage) {
                      if (newlyUploadedImage && newlyUploadedImage !== value) {
                        void uploadApi
                          .deleteFile("category/image", newlyUploadedImage)
                          .catch((error) => {
                            console.error(
                              "Error cleaning up replaced category image:",
                              error
                            );
                          });
                      }
                      setNewlyUploadedImage(value);
                    } else {
                      setNewlyUploadedImage(null);
                    }
                    setValue("image", value ?? "", {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                  }}
                />
                {errors.image && (
                  <p className="mt-1 text-custom-xs text-red">
                    {errors.image.message}
                  </p>
                )}
              </div>

              {/* Remove status select field temporarily */}

              <div>
                <label className="mb-2 block text-custom-sm font-medium text-dark">
                  Parent Category (optional)
                </label>
                <Select
                  value={watch("parentId") || "none"}
                  onValueChange={(value) => {
                    setValue("parentId", value, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No parent (top-level)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[50vh]">
                    <SelectItem value="none">No parent (top-level)</SelectItem>
                    {availableParents.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))}
                  </SelectContent>
                </Select>
                {errors.parentId && (
                  <p className="mt-1 text-custom-xs text-red">
                    {errors.parentId.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCategoryDialog;
