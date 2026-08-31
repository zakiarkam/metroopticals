"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateUser } from "@/features/users/api/user-api";
import { User, CUSTOMER_TYPE_LABELS, type CustomerType } from "@/features/users/types/user";
import { Toast } from "@/lib/utils/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
  role: z.enum(["ADMIN", "CUSTOMER", "SUPER_ADMIN"]),
  customerType: z.enum(["END_USER", "WHOLESALER", "RESELLER", "INSTALLER", "PROJECTS", "COMPANY"]).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

type EditUserDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User | null;
};

const EditUserDialog: React.FC<EditUserDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialValues, setInitialValues] = useState<UserFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
    reset,
    watch,
    setValue,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  useEffect(() => {
    if (user && isOpen) {
      const formValues = {
        name: user.name,
        email: user.email,
        role: user.role,
        customerType: user.customerType || "END_USER",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        country: user.country || "",
        postalCode: user.postalCode || "",
        password: "",
      };
      reset(formValues);
      setInitialValues(formValues);
    }
  }, [user, isOpen, reset]);

  const onSubmit = async (data: UserFormData) => {
    if (!user) return;

    // Validate required fields
    if (!data.name?.trim()) {
      Toast.error("Name is required");
      return;
    }

    if (data.name.trim().length < 2) {
      Toast.error("Name must be at least 2 characters");
      return;
    }

    if (!data.email?.trim()) {
      Toast.error("Email is required");
      return;
    }

    if (data.password && data.password.length < 8) {
      Toast.error("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);
    const toastId = Toast.loading("Updating user...");

    try {
      const updateData: any = { ...data };
      // Remove password if not changed
      if (!updateData.password) {
        delete updateData.password;
      }

      await updateUser(user.id, updateData);

      Toast.update(toastId, {
        render: "User updated successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to update user:", err);

      Toast.update(toastId, {
        render:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to update user. Please try again.",
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
    reset();
    setInitialValues(null);
    onClose();
  };

  const hasChanges = () => {
    if (!initialValues) return false;
    const currentValues = {
      name: dirtyFields.name ? watch("name") : initialValues.name,
      email: dirtyFields.email ? watch("email") : initialValues.email,
      role: dirtyFields.role ? watch("role") : initialValues.role,
      customerType: dirtyFields.customerType ? watch("customerType") : initialValues.customerType,
      phone: dirtyFields.phone ? watch("phone") : initialValues.phone,
      address: dirtyFields.address ? watch("address") : initialValues.address,
      city: dirtyFields.city ? watch("city") : initialValues.city,
      country: dirtyFields.country ? watch("country") : initialValues.country,
      postalCode: dirtyFields.postalCode
        ? watch("postalCode")
        : initialValues.postalCode,
      password: watch("password"),
    };
    return (
      JSON.stringify(currentValues) !== JSON.stringify(initialValues) ||
      !!watch("password")
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent hideClose className="max-w-2xl max-h-[90vh] flex flex-col p-0 sm:p-0">
        <DialogHeader className="sticky top-0 z-10 bg-gray-2 border-b border-gray-3 px-6 py-4">
          <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription className="text-custom-sm text-body mb-4">
                  Update the user&apos;s information below
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

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="overflow-y-auto flex-1 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Name <span className="text-red">*</span>
                </label>
                <Input {...register("name")} type="text" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Email <span className="text-red">*</span>
                </label>
                <Input {...register("email")} type="email" />
              </div>

              {/* Password */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Password (leave blank to keep current)
                </label>
                <Input
                  {...register("password")}
                  type="password"
                  placeholder="••••••••"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Role <span className="text-red">*</span>
                </label>
                <Select
                  value={watch("role")}
                  onValueChange={(value) => {
                    setValue(
                      "role",
                      value as "ADMIN" | "CUSTOMER" | "SUPER_ADMIN",
                      {
                        shouldValidate: true,
                        shouldDirty: true,
                      }
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">Customer</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Type */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Customer Type
                </label>
                <Select
                  value={watch("customerType") || "END_USER"}
                  onValueChange={(value) => {
                    setValue("customerType", value as CustomerType, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CUSTOMER_TYPE_LABELS) as [CustomerType, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Phone
                </label>
                <Input {...register("phone")} type="text" />
              </div>

              {/* Address */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Address
                </label>
                <Input {...register("address")} type="text" />
              </div>

              {/* City */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  City
                </label>
                <Input {...register("city")} type="text" />
              </div>

              {/* Country */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Country
                </label>
                <Input {...register("country")} type="text" />
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Postal Code
                </label>
                <Input {...register("postalCode")} type="text" />
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-gray-2 border-t border-gray-3 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !hasChanges()}>
              {isSubmitting ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
