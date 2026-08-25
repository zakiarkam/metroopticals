"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Toast } from "@/lib/utils/toast";
import { authApi } from "@/features/auth/api/auth-api";
import { resetPasswordSchema } from "@/features/auth/validators/auth";
import AuthField, { authInputClasses } from "@/features/auth/components/AuthField";
import AuthHeader from "@/features/auth/components/AuthHeader";
import PasswordStrengthMeter from "@/features/auth/components/PasswordStrengthMeter";

export default function ResetPasswordClient() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { score: 1, label: "Weak", color: "bg-red" };
    if (score <= 4) return { score: 2, label: "Medium", color: "bg-yellow-dark" };
    return { score: 3, label: "Strong", color: "bg-green" };
  }, [password]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);

    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword(parsed.data);
      Toast.success("Password updated. Please sign in.");
      router.replace("/log-in");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "This reset link is invalid or has expired. Request a new one.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggle = (
    <button
      type="button"
      onClick={() => setShow((value) => !value)}
      className="text-dark-5 transition-colors hover:text-dark"
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-3 bg-white p-6 shadow-1 sm:p-8">
        <AuthHeader
          kicker="Password reset"
          title="Choose a new password"
          subtitle="Use at least 8 characters with an uppercase letter and a number."
        />

        {!token ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">
              This reset link is missing its token. Request a new link from the
              sign-in page.
            </p>
            <Link
              href="/log-in"
              className="flex h-11 w-full items-center justify-center rounded-xl border border-gray-3 text-sm font-semibold text-dark-3 hover:bg-gray-1"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <AuthField id="new-password" label="New password" icon={Lock} trailing={toggle}>
              <Input
                id="new-password"
                type={show ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={isSubmitting}
                className={authInputClasses}
              />
            </AuthField>
            {password && <PasswordStrengthMeter strength={strength} />}

            <AuthField id="confirm-password" label="Confirm password" icon={Lock}>
              <Input
                id="confirm-password"
                type={show ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={isSubmitting}
                className={authInputClasses}
              />
            </AuthField>

            {error && (
              <p className="rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(100deg,#A9834B_0%,#8F6A37_55%,#6E5029_100%)] text-sm font-semibold tracking-wide text-white shadow-lg transition-all hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {isSubmitting ? "Saving..." : "Set new password"}
            </button>

            <Link
              href="/log-in"
              className="block text-center text-sm font-medium text-dark-4 hover:text-dark"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
