"use client";
import React, { useState } from "react";
import { updateAdvertisementStatus } from "@/features/advertisements/api/advertisement-api";
import { Toast } from "@/lib/utils/toast";

interface AdvertisementStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  advertisementId: number | null;
  advertisementTitle: string;
  currentStatus: "active" | "inactive";
}

const AdvertisementStatusDialog: React.FC<AdvertisementStatusDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  advertisementId,
  advertisementTitle,
  currentStatus,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"active" | "inactive">(
    currentStatus
  );

  React.useEffect(() => {
    setSelectedStatus(currentStatus);
  }, [currentStatus]);

  const handleSubmit = async () => {
    if (!advertisementId) return;

    setIsSubmitting(true);
    const toastId = Toast.loading("Updating status...");

    try {
      await updateAdvertisementStatus(advertisementId, {
        status: selectedStatus,
      });

      Toast.update(toastId, {
        render: "Status updated successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to update status:", error);

      Toast.update(toastId, {
        render:
          error?.response?.data?.message ||
          error?.message ||
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

  if (!isOpen || !advertisementId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-gray-2 p-6 shadow-xl border border-gray-3">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-dark mb-2">
            Update Advertisement Status
          </h2>
          <p className="text-custom-sm text-body">
            Change the status for{" "}
            <span className="font-medium text-dark">
              &ldquo;{advertisementTitle}&rdquo;
            </span>
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {(["active", "inactive"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`w-full rounded-lg border-2 p-4 text-left transition ${
                selectedStatus === status
                  ? "border-blue bg-blue-light-6"
                  : "border-gray-3 hover:border-gray-4"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    selectedStatus === status ? "border-blue" : "border-gray-3"
                  }`}
                >
                  {selectedStatus === status && (
                    <div className="h-3 w-3 rounded-full bg-blue" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-dark capitalize">{status}</p>
                  <p className="text-custom-xs text-body">
                    {status === "active"
                      ? "Advertisement will be visible to users"
                      : "Advertisement will be hidden from users"}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-3 px-4 py-2 text-custom-sm font-medium text-dark hover:bg-gray-1 transition"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-blue px-4 py-2 text-custom-sm font-medium text-white hover:bg-blue-dark transition disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Status"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvertisementStatusDialog;
