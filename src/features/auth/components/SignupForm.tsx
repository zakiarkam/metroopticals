"use client";

import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronDown,
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
import { signupSchema as serverSignupSchema } from "@/features/auth/validators/auth";

const PasswordStrengthMeter = dynamic(() => import("./PasswordStrengthMeter"), {
  ssr: false,
});

// Same rules the API enforces, plus the confirm field only the form has.
const signupSchema = serverSignupSchema
  .extend({ confirmPassword: z.string() })
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
        address: data.address?.trim() || undefined,
        city: data.city?.trim() || undefined,
        country: data.country?.trim() || undefined,
        postalCode: data.postalCode?.trim() || undefined,
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
            placeholder="Nuwan Perera"
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

      {/* Delivery details are checkout's job; here they are a courtesy. */}
      <details className="group rounded-xl border border-gray-3 bg-gray-1/60 px-4 py-3.5 transition-colors open:bg-gray-1 hover:border-blue-light-2">
        <summary className="flex cursor-pointer select-none list-none items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-blue" aria-hidden />
          <span className="text-[13.5px] font-semibold text-dark">
            Delivery address
            <span className="ml-1.5 font-normal text-dark-5">(optional)</span>
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[12px] text-dark-4">
            <span className="hidden sm:inline">You can add it at checkout</span>
            <ChevronDown
              className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </span>
        </summary>
        <div className="mt-4 space-y-4">
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
                placeholder="45 Galle Road"
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
        </div>
      </details>

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
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue text-sm font-semibold tracking-wide text-white shadow-sm transition-colors hover:bg-blue-dark active:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {isLoading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
});

SignupForm.displayName = "SignupForm";

export default SignupForm;
