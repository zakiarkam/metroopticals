"use client";

import React, { useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Toast } from "@/lib/utils/toast";
import { authApi } from "@/features/auth/api/auth-api";
import AuthField, { authInputClasses } from "./AuthField";

interface ForgotPasswordFormProps {
  forgotEmail: string;
  setForgotEmail: (email: string) => void;
  onCancel: () => void;
}

const ForgotPasswordForm = React.memo(
  ({ forgotEmail, setForgotEmail, onCancel }: ForgotPasswordFormProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;
      if (!forgotEmail.trim()) {
        Toast.error("Please enter your email address.");
        return;
      }

      setIsSubmitting(true);
      try {
        await authApi.forgotPassword({ email: forgotEmail });
        Toast.success("A reset link has been sent. Please check your inbox.");
        setForgotEmail("");
        onCancel();
      } catch (err: any) {
        console.error("Forgot password error:", err);
        Toast.error(
          err?.response?.data?.message ||
            err.message ||
            "Failed to send reset email. Please try again.",
        );
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <form
        onSubmit={handleSubmit}
        className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
      >
        <div className="rounded-xl border border-blue-light-3 bg-blue-light-5 p-4">
          <p className="text-sm leading-relaxed text-dark-3">
            Enter the email address on your account and we&apos;ll send you a
            link to set a new password.
          </p>
        </div>

        <AuthField id="forgot-email" label="Email address" icon={Mail}>
          <Input
            id="forgot-email"
            type="email"
            required
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isSubmitting}
            className={authInputClasses}
          />
        </AuthField>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(100deg,#A9834B_0%,#8F6A37_55%,#6E5029_100%)] text-sm font-semibold tracking-wide text-white shadow-lg shadow-blue/20 transition-all hover:shadow-xl hover:shadow-blue/25 hover:brightness-[1.06] active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
        >
          {isSubmitting && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          )}
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-3 bg-white text-sm font-semibold text-dark-3 transition-all hover:border-blue-light hover:bg-blue-light-5 disabled:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to sign in
        </button>
      </form>
    );
  },
);

ForgotPasswordForm.displayName = "ForgotPasswordForm";

export default ForgotPasswordForm;
