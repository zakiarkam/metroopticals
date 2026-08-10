"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateCategoryStatus } from "@/features/categories/api/category-api";
import { Toast } from "@/lib/utils/toast";

interface CategoryStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  categoryId: number | null;
  categoryName: string;
  currentStatus: string;
}

const CategoryStatusDialog: React.FC<CategoryStatusDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categoryId,
  categoryName,
  currentStatus,
}) => {
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentStatus) {
      setStatus(currentStatus as "active" | "inactive");
    }
  }, [currentStatus]);

  const handleSubmit = async () => {
    if (!categoryId) {
      Toast.error("Category ID is missing");
      return;
    }

    if (!status) {
      Toast.error("Please select a status");
      return;
    }

    if (status === currentStatus) {
      Toast.error("Please select a different status");
      return;
    }

    setIsSubmitting(true);
    const toastId = Toast.loading("Updating category status...");

    try {
      await updateCategoryStatus(categoryId, status);

      Toast.update(toastId, {
        render: `Category status updated to ${getStatusLabel(
          status
        )} successfully!`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      onClose();
      onSuccess?.();
    } catch (err: any) {
      console.error("Failed to update status:", err);

      Toast.update(toastId, {
        render:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to update status. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green";
      case "inactive":
        return "text-red";
      default:
        return "text-dark";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      default:
        return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Category Status</DialogTitle>
          <DialogDescription>
            Update the status of this category
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="mb-2 block text-custom-sm font-medium text-dark">
              Category Name
            </label>
            <p className="text-custom-sm text-body">{categoryName}</p>
          </div>

          <div>
            <label className="mb-2 block text-custom-sm font-medium text-dark">
              Current Status
            </label>
            <p
              className={`text-custom-sm font-semibold capitalize ${getStatusColor(
                currentStatus
              )}`}
            >
              {getStatusLabel(currentStatus)}
            </p>
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-2 block text-custom-sm font-medium text-dark"
            >
              New Status *
            </label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as typeof status)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <span className="flex items-center gap-2 capitalize">
                    <span className="h-2 w-2 rounded-full bg-green"></span>
                    Active
                  </span>
                </SelectItem>
                <SelectItem value="inactive">
                  <span className="flex items-center gap-2 capitalize">
                    <span className="h-2 w-2 rounded-full bg-red"></span>
                    Inactive
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status !== currentStatus && (
            <div className="rounded-lg bg-blue-light-5 border border-blue p-3">
              <p className="text-custom-sm text-blue">
                Status will be changed from{" "}
                <span className="font-semibold capitalize">
                  {getStatusLabel(currentStatus)}
                </span>{" "}
                to{" "}
                <span className="font-semibold capitalize">
                  {getStatusLabel(status)}
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || status === currentStatus}
          >
            {isSubmitting ? "Updating..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryStatusDialog;
