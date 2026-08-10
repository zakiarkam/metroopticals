"use client";
import React, { useState } from "react";
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
import { createUser } from "@/features/users/api/user-api";
import { UserRole } from "@/features/users/types/user";
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
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "CUSTOMER", "SUPER_ADMIN"]),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

type AddUserDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const AddUserDialog: React.FC<AddUserDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: "CUSTOMER",
    },
  });

  const onSubmit = async (data: UserFormData) => {
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

    if (!data.password?.trim()) {
      Toast.error("Password is required");
      return;
    }

    if (data.password.length < 8) {
      Toast.error("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);
    const toastId = Toast.loading("Creating user...");

    try {
      await createUser(data);

      Toast.update(toastId, {
        render: "User created successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to create user:", err);

      Toast.update(toastId, {
        render:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to create user. Please try again.",
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
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="sticky top-0 z-10 bg-white border-b border-gray-3 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account with the details below
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
                <Input
                  {...register("name")}
                  type="text"
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="mt-1 text-custom-xs text-red">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Email <span className="text-red">*</span>
                </label>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="user@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-custom-xs text-red">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Password <span className="text-red">*</span>
                </label>
                <Input
                  {...register("password")}
                  type="password"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="mt-1 text-custom-xs text-red">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Role <span className="text-red">*</span>
                </label>
                <Select
                  value={watch("role") || "CUSTOMER"}
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
                {errors.role && (
                  <p className="mt-1 text-custom-xs text-red">
                    {errors.role.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Phone
                </label>
                <Input
                  {...register("phone")}
                  type="text"
                  placeholder="+1234567890"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Address
                </label>
                <Input
                  {...register("address")}
                  type="text"
                  placeholder="123 Main St"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  City
                </label>
                <Input
                  {...register("city")}
                  type="text"
                  placeholder="New York"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Country
                </label>
                <Input {...register("country")} type="text" placeholder="USA" />
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-custom-sm font-medium text-dark mb-2">
                  Postal Code
                </label>
                <Input
                  {...register("postalCode")}
                  type="text"
                  placeholder="10001"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-white border-t border-gray-3 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;
