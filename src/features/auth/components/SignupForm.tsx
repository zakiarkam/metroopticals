"use client";

import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Globe,
  Hash,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Toast } from "@/lib/utils/toast";
import { authApi } from "@/features/auth/api/auth-api";
import dynamic from "next/dynamic";
import AuthField, { authInputClasses, PasswordToggle } from "./AuthField";

const PasswordStrengthMeter = dynamic(() => import("./PasswordStrengthMeter"), {
  ssr: false,
});

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    country: z.string().min(1, "Country is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onSuccess: (email: string) => void;
}

const SignupForm = React.memo(({ onSuccess }: SignupFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "",
    color: "",
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const calculatePasswordStrength = useCallback((password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) {
      return { score: 1, label: "Weak", color: "bg-red" };
    } else if (score <= 4) {
      return { score: 2, label: "Medium", color: "bg-yellow-dark" };
    } else {
      return { score: 3, label: "Strong", color: "bg-green" };
    }
  }, []);

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);

    try {
      const response = await authApi.signup({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country,
        postalCode: data.postalCode,
      });

      if (response.user) {
        Toast.success("Account created successfully! Please login.");
        signupForm.reset();
        setPasswordStrength({ score: 0, label: "", color: "" });
        onSuccess(data.email);
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      Toast.error(
        err?.response?.data?.message ||
          err.message ||
          "An unexpected error occurred. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const errors = signupForm.formState.errors;

  return (
    <form
      onSubmit={signupForm.handleSubmit(onSubmit)}
      className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField
          id="signup-name"
          label="Full name"
          icon={User}
          error={errors.name?.message}
        >
          <Input
            id="signup-name"
            {...signupForm.register("name")}
            type="text"
            autoComplete="name"
            placeholder="John Doe"
            className={authInputClasses}
          />
        </AuthField>

        <AuthField
          id="signup-phone"
          label="Phone"
          icon={Phone}
          error={errors.phone?.message}
        >
          <Input
            id="signup-phone"
            {...signupForm.register("phone")}
            type="tel"
            autoComplete="tel"
            placeholder="+94 77 123 4567"
            className={authInputClasses}
          />
        </AuthField>
      </div>

      <AuthField
        id="signup-email"
        label="Email address"
        icon={Mail}
        error={errors.email?.message}
      >
        <Input
          id="signup-email"
          {...signupForm.register("email")}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className={authInputClasses}
        />
      </AuthField>

      <AuthField
        id="signup-address"
        label="Street address"
        icon={MapPin}
        error={errors.address?.message}
      >
        <Input
          id="signup-address"
          {...signupForm.register("address")}
          type="text"
          autoComplete="street-address"
          placeholder="123 Main Street"
          className={authInputClasses}
        />
      </AuthField>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField
          id="signup-city"
          label="City"
          icon={MapPin}
          error={errors.city?.message}
        >
          <Input
            id="signup-city"
            {...signupForm.register("city")}
            type="text"
            autoComplete="address-level2"
            placeholder="Colombo"
            className={authInputClasses}
          />
        </AuthField>

        <AuthField
          id="signup-postal"
          label="Postal code"
          icon={Hash}
          error={errors.postalCode?.message}
        >
          <Input
            id="signup-postal"
            {...signupForm.register("postalCode")}
            type="text"
            autoComplete="postal-code"
            placeholder="00100"
            className={authInputClasses}
          />
        </AuthField>
      </div>

      <AuthField
        id="signup-country"
        label="Country"
        icon={Globe}
        error={errors.country?.message}
      >
        <Input
          id="signup-country"
          {...signupForm.register("country")}
          type="text"
          autoComplete="country-name"
          placeholder="Sri Lanka"
          className={authInputClasses}
        />
      </AuthField>

      <AuthField
        id="signup-password"
        label="Password"
        icon={Lock}
        error={errors.password?.message}
        trailing={
          <PasswordToggle
            shown={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
          />
        }
      >
        <Input
          id="signup-password"
          {...signupForm.register("password", {
            onChange: (e) => {
              setPasswordStrength(calculatePasswordStrength(e.target.value));
            },
          })}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="••••••••"
          className={`${authInputClasses} pr-11`}
        />
      </AuthField>

      <PasswordStrengthMeter strength={passwordStrength} />

      <AuthField
        id="signup-confirm-password"
        label="Confirm password"
        icon={ShieldCheck}
        error={errors.confirmPassword?.message}
        trailing={
          <PasswordToggle
            shown={showConfirmPassword}
            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
          />
        }
      >
        <Input
          id="signup-confirm-password"
          {...signupForm.register("confirmPassword")}
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="••••••••"
          className={`${authInputClasses} pr-11`}
        />
      </AuthField>

      <button
        type="submit"
        disabled={isLoading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(100deg,#A9834B_0%,#8F6A37_55%,#6E5029_100%)] text-sm font-semibold tracking-wide text-white shadow-lg shadow-blue/20 transition-all hover:shadow-xl hover:shadow-blue/25 hover:brightness-[1.06] active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {isLoading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
});

SignupForm.displayName = "SignupForm";

export default SignupForm;
