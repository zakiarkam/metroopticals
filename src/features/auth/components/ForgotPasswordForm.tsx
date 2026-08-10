import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast } from "@/lib/utils/toast";
import { authApi } from "@/features/auth/api/auth-api";

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
          err.message || "Failed to send reset email. Please try again."
        );
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <motion.form
        key="forgot"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        onSubmit={handleSubmit}
        className="space-y-3"
      >
        <div className="space-y-1">
          <p className="text-lg font-semibold">Reset your password</p>
          <p className="text-sm text-muted-foreground">
            Enter the email associated with your account and we&apos;ll send a
            link to reset your password.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="forgot-email">Email Address</Label>
          <Input
            id="forgot-email"
            type="email"
            required
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="john@example.com"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </motion.form>
    );
  }
);

ForgotPasswordForm.displayName = "ForgotPasswordForm";

export default ForgotPasswordForm;
