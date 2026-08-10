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
import { updateOrderStatus } from "@/features/orders/api/orders-api";
import { OrderStatus } from "@/features/orders/types/order";
import { Toast } from "@/lib/utils/toast";

interface OrderStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  orderId: number | null;
  orderNumber: string;
  currentStatus: OrderStatus;
}

const OrderStatusDialog: React.FC<OrderStatusDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  orderNumber,
  currentStatus,
}) => {
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentStatus) {
      setStatus(currentStatus);
    }
  }, [currentStatus]);

  const handleSubmit = async () => {
    if (!orderId) return;

    setIsSubmitting(true);
    const toastId = Toast.loading("Updating order status...");

    try {
      await updateOrderStatus(orderId, { status });

      Toast.update(toastId, {
        render: `Order status updated to ${status} successfully!`,
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

  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      PENDING: "text-yellow-dark",
      CONFIRMED: "text-blue",
      PROCESSING: "text-blue",
      SHIPPED: "text-purple",
      DELIVERED: "text-green",
      CANCELLED: "text-red",
    };
    return colors[status];
  };

  const statusOptions: { value: OrderStatus; label: string; color: string }[] =
    [
      { value: "PENDING", label: "Pending", color: "bg-yellow-dark" },
      { value: "CONFIRMED", label: "Confirmed", color: "bg-blue" },
      { value: "PROCESSING", label: "Processing", color: "bg-blue" },
      { value: "SHIPPED", label: "Shipped", color: "bg-purple" },
      { value: "DELIVERED", label: "Delivered", color: "bg-green" },
      { value: "CANCELLED", label: "Cancelled", color: "bg-red" },
    ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md flex flex-col p-0">
        <DialogHeader className="sticky top-0 z-10 bg-white border-b border-gray-3 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Update Order Status</DialogTitle>
              <DialogDescription>
                Change the status of this order
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
                Order Number
              </label>
              <p className="text-custom-sm text-body">{orderNumber}</p>
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
                {currentStatus}
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
                onValueChange={(value) => setStatus(value as OrderStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${option.color}`}
                        ></span>
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {status !== currentStatus && (
              <div className="rounded-lg bg-blue-light-5 border border-blue p-3">
                <p className="text-custom-sm text-blue">
                  Status will be changed from{" "}
                  <span className="font-semibold">{currentStatus}</span> to{" "}
                  <span className="font-semibold">{status}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="bg-white border-t border-gray-3 px-6 py-4">
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

export default OrderStatusDialog;
