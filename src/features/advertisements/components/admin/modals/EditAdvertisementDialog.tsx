"use client";

import React, { useEffect, useState } from "react";
import { updateAdvertisement } from "@/features/advertisements/api/advertisement-api";
import { Toast } from "@/lib/utils/toast";
import AdvertisementForm, {
  advertisementToFormValues,
  buildAdvertisementPayload,
  emptyAdFormValues,
  type AdFormValues,
} from "../AdvertisementForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Advertisement } from "@/features/advertisements/types/advertisement";

interface EditAdvertisementDialogProps {
  isOpen: boolean;
  advertisement: Advertisement | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditAdvertisementDialog: React.FC<EditAdvertisementDialogProps> = ({
  isOpen,
  advertisement,
  onClose,
  onSuccess,
}) => {
  const [values, setValues] = useState<AdFormValues>(emptyAdFormValues);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && advertisement) {
      setValues(advertisementToFormValues(advertisement));
    }
  }, [isOpen, advertisement]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!advertisement) return;

    const result = buildAdvertisementPayload(values);
    if (!result.ok) {
      Toast.error(result.message);
      return;
    }

    setIsSubmitting(true);
    const toastId = Toast.loading("Saving changes…");

    try {
      await updateAdvertisement(advertisement.id, result.payload);

      Toast.update(toastId, {
        render: "Advertisement updated.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      Toast.update(toastId, {
        render:
          error?.response?.data?.message ||
          error?.message ||
          "Could not save the advertisement. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!advertisement) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 p-0 shadow-xl">
        <DialogHeader className="border-b border-gray-3 px-6 py-5">
          <DialogTitle className="text-[19px] font-semibold text-dark">
            Edit advertisement
          </DialogTitle>
          <p className="mt-1 truncate text-[13px] text-dark-4">
            {advertisement.title}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <AdvertisementForm values={values} onChange={setValues} disablePlacement />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-3 bg-gray-1 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 rounded-xl border border-gray-3 bg-gray-2 px-6 text-[14px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue px-7 text-[14px] font-bold text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
            >
              {isSubmitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Save changes
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAdvertisementDialog;
