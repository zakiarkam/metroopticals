import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast } from "@/lib/utils/toast";
import { authApi } from "@/features/auth/api/auth-api";
import dynamic from "next/dynamic";

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
        err.message || "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form
      key="signup"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      onSubmit={signupForm.handleSubmit(onSubmit)}
      className="space-y-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="signup-name">Full Name</Label>
        <Input
          id="signup-name"
          {...signupForm.register("name")}
          type="text"
          placeholder="John Doe"
        />
        {signupForm.formState.errors.name && (
          <p className="text-xs text-red">
            {signupForm.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-email">Email Address</Label>
        <Input
          id="signup-email"
          {...signupForm.register("email")}
          type="email"
          placeholder="john@example.com"
        />
        {signupForm.formState.errors.email && (
          <p className="text-xs text-red">
            {signupForm.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-phone">Phone Number</Label>
        <Input
          id="signup-phone"
          {...signupForm.register("phone")}
          type="tel"
          placeholder="+1234567890"
        />
        {signupForm.formState.errors.phone && (
          <p className="text-xs text-red">
            {signupForm.formState.errors.phone.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-address">Street Address</Label>
        <Input
          id="signup-address"
          {...signupForm.register("address")}
          type="text"
          placeholder="123 Main St"
        />
        {signupForm.formState.errors.address && (
          <p className="text-xs text-red">
            {signupForm.formState.errors.address.message}
          </p>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="signup-city">City</Label>
          <Input
            id="signup-city"
            {...signupForm.register("city")}
            type="text"
            placeholder="City"
          />
          {signupForm.formState.errors.city && (
            <p className="text-xs text-red">
              {signupForm.formState.errors.city.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-postal">Postal Code</Label>
          <Input
            id="signup-postal"
            {...signupForm.register("postalCode")}
            type="text"
            placeholder="Postal Code"
          />
          {signupForm.formState.errors.postalCode && (
            <p className="text-xs text-red">
              {signupForm.formState.errors.postalCode.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-country">Country</Label>
        <Input
          id="signup-country"
          {...signupForm.register("country")}
          type="text"
          placeholder="Country"
        />
        {signupForm.formState.errors.country && (
          <p className="text-xs text-red">
            {signupForm.formState.errors.country.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Input
            id="signup-password"
            {...signupForm.register("password", {
              onChange: (e) => {
                const strength = calculatePasswordStrength(e.target.value);
                setPasswordStrength(strength);
              },
            })}
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-5 hover:text-dark"
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        </div>
        {signupForm.formState.errors.password && (
          <p className="text-xs text-red">
            {signupForm.formState.errors.password.message}
          </p>
        )}
        <PasswordStrengthMeter strength={passwordStrength} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-confirm-password">Confirm Password</Label>
        <div className="relative">
          <Input
            id="signup-confirm-password"
            {...signupForm.register("confirmPassword")}
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-5 hover:text-dark"
          >
            {showConfirmPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        </div>
        {signupForm.formState.errors.confirmPassword && (
          <p className="text-xs text-red">
            {signupForm.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Creating account..." : "Create Account"}
      </Button>
    </motion.form>
  );
});

SignupForm.displayName = "SignupForm";

export default SignupForm;
