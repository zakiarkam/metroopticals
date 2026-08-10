"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createCategory } from "@/features/categories/api/category-api";
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
  status: z.enum(["active", "inactive"]).optional(),
  parentId: z.string().optional(),
  image: z.string().min(1, "Category image is required"),
});

type CategoryFormData = z.infer<typeof categorySchema>;

type AddCategoryDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  categories: Category[];
};

const AddCategoryDialog: React.FC<AddCategoryDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const {
    data: parentCategoriesData,
    error: parentCategoriesError,
    refresh: refreshParentCategories,
  } = useCategoriesCache(
    { page: 1, limit: 500 },
    { staleTimeMs: 10 * 60 * 1000 }
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

  const parentOptions = useMemo(
    () => {
      const source = parentCategoriesData?.categories ?? categories;
      return source.filter((category) => !category.parentId);
    },
    [categories, parentCategoriesData?.categories]
  );

  useEffect(() => {
    if (parentCategoriesError && isOpen) {
      Toast.error(parentCategoriesError);
    }
  }, [isOpen, parentCategoriesError]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const onSubmit = async (data: CategoryFormData) => {
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
    const toastId = Toast.loading("Creating category...");

    try {
      await createCategory({
        name: data.name,
        slug: generateSlug(data.name),
        description: data.description,
        status: "active",
        parentId:
          data.parentId && data.parentId !== "none"
            ? Number(data.parentId)
            : undefined,
        image: data.image || undefined,
      });

      Toast.update(toastId, {
        render: "Category created successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      reset();
      setUploadedImage(null);
      onClose();
      onSuccess?.();
      refreshParentCategories();
    } catch (error: any) {
      console.error("Failed to create category:", error);
      await cleanupUploadedImage();
      setUploadedImage(null);

      Toast.update(toastId, {
        render:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to create category. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanupUploadedImage = async () => {
    if (!uploadedImage) return;
    try {
      await uploadApi.deleteFile("category/image", uploadedImage);
    } catch (error) {
      console.error("Error cleaning up uploaded category image:", error);
    }
  };

  const handleClose = async () => {
    if (uploadedImage) {
      await cleanupUploadedImage();
    }
    reset();
    setUploadedImage(null);
    onClose();
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      void handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
          <DialogDescription>
            Fill in the category details below
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="overflow-y-auto flex-1 px-1 py-0.5">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-custom-sm font-medium text-dark">
                  Category Name <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("name")}
                  className="w-full rounded-lg border border-gray-3 bg-gray-1 px-4 py-2.5 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                  placeholder="e.g., Fiber Optic Adapters"
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
                  inputId="category-image-upload-add"
                  onChange={(value) => {
                    if (value && value !== uploadedImage) {
                      if (uploadedImage) {
                        void uploadApi
                          .deleteFile("category/image", uploadedImage)
                          .catch((error) => {
                            console.error(
                              "Error cleaning up replaced category image:",
                              error
                            );
                          });
                      }
                      setUploadedImage(value);
                    } else if (!value) {
                      setUploadedImage(null);
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
                    {parentOptions.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={String(category.id)}
                      >
                        {category.name}
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
              {isSubmitting ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCategoryDialog;
