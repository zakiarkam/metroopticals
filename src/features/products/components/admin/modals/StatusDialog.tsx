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
import { updateProductStatus } from "@/features/products/api/product-api";
import { Toast } from "@/lib/utils/toast";

interface StatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  productId: number | null;
  productName: string;
  currentStatus: string;
}

const StatusDialog: React.FC<StatusDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productId,
  productName,
  currentStatus,
}) => {
  const [status, setStatus] = useState<
    "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK"
    // | "DRAFT" | "SCHEDULED"
  >("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentStatus) {
      setStatus(currentStatus as "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK");
    }
  }, [currentStatus]);

  const handleSubmit = async () => {
    if (!productId) {
      Toast.error("Product ID is missing");
      return;
    }

    if (!status) {
      Toast.error("Please select a status");
      return;
    }

    setIsSubmitting(true);
    const toastId = Toast.loading("Updating product status...");

    try {
      await updateProductStatus(productId, status);

      Toast.update(toastId, {
        render: `Product status updated to ${getStatusLabel(
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
      case "ACTIVE":
        return "text-green";
      case "INACTIVE":
        return "text-red";
      case "OUT_OF_STOCK":
        return "text-yellow-dark";
      case "DRAFT":
        return "text-dark-3";
      case "SCHEDULED":
        return "text-blue";
      default:
        return "text-dark";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "Active";
      case "INACTIVE":
        return "Inactive";
      case "OUT_OF_STOCK":
        return "Out of Stock";
      case "DRAFT":
        return "Draft";
      case "SCHEDULED":
        return "Scheduled";
      default:
        return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent hideClose className="max-w-md flex flex-col p-0 sm:p-0">
        <DialogHeader className="sticky top-0 z-10 bg-gray-2 border-b border-gray-3 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Change Product Status</DialogTitle>
              <DialogDescription>
                Update the status of this product
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

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-custom-sm font-medium text-dark">
                Product Name
              </label>
              <p className="text-custom-sm text-body">{productName}</p>
            </div>

            <div>
              <label className="mb-2 block text-custom-sm font-medium text-dark">
                Current Status
              </label>
              <p
                className={`text-custom-sm font-semibold ${getStatusColor(
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
                New Status <span className="text-destructive">*</span>
              </label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as typeof status)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green"></span>
                      Active
                    </span>
                  </SelectItem>
                  <SelectItem value="INACTIVE">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red"></span>
                      Inactive
                    </span>
                  </SelectItem>
                  <SelectItem value="OUT_OF_STOCK">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-yellow-dark"></span>
                      Out of Stock
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status !== currentStatus && (
              <div className="rounded-lg bg-blue-light-5 border border-blue p-3">
                <p className="text-custom-sm text-blue">
                  Status will be changed from{" "}
                  <span className="font-semibold">
                    {getStatusLabel(currentStatus)}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold">
                    {getStatusLabel(status)}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="bg-gray-2 border-t border-gray-3 px-6 py-4">
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

export default StatusDialog;
