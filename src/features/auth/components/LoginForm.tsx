"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Toast } from "@/lib/utils/toast";
import { authApi } from "@/features/auth/api/auth-api";
import dynamic from "next/dynamic";
import AuthField, { authInputClasses, PasswordToggle } from "./AuthField";

const GoogleSignInButton = dynamic(() => import("./GoogleSignInButton"), {
  ssr: false,
  loading: () => (
    <div className="h-11 w-full animate-pulse rounded-xl border border-gray-3 bg-gray-1" />
  ),
});

import { loginSchema } from "@/features/auth/validators/auth";

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  redirectUrl: string;
  onShowForgotPassword: () => void;
}

const LoginForm = React.memo(
  ({ redirectUrl, onShowForgotPassword }: LoginFormProps) => {
    const router = useRouter();
    const { update } = useCachedSession();
    const [isLoading, setIsLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const loginForm = useForm<LoginFormData>({
      resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
      setIsLoading(true);

      try {
        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        });

        if (result?.error) {
          Toast.error(
            "Invalid credentials. Please check your email and password.",
          );
          return;
        }

        if (result?.ok) {
          Toast.success("Login successful!");

          if (typeof window !== "undefined") {
            localStorage.removeItem("authToken");
            localStorage.removeItem("admin_user");
          }

          // Force session update to get latest user data
          await update();

          const session = await authApi.getSession();

          // AccountMenu will handle localStorage saving
          if (session?.user?.role === "SUPER_ADMIN") {
            router.push("/admin");
          } else if (session?.user?.role === "ADMIN") {
            router.push("/admin/pos");
          } else {
            router.push(redirectUrl || "/");
          }
        }
      } catch (err: any) {
        console.error("Login error:", err);
        Toast.error("An unexpected error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <form
        onSubmit={loginForm.handleSubmit(onSubmit)}
        className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
      >
        <AuthField
          id="email"
          label="Email"
          icon={Mail}
          error={loginForm.formState.errors.email?.message}
        >
          <Input
            id="email"
            {...loginForm.register("email")}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={authInputClasses}
          />
        </AuthField>

        <AuthField
          id="password"
          label="Password"
          icon={Lock}
          error={loginForm.formState.errors.password?.message}
          trailing={
            <PasswordToggle
              shown={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
            />
          }
        >
          <Input
            id="password"
            {...loginForm.register("password")}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className={`${authInputClasses} pr-11`}
          />
        </AuthField>

        <div className="flex items-center justify-between">
          <label className="-my-2 flex cursor-pointer items-center gap-2 py-2">
            <Checkbox id="remember" />
            <span className="text-[13px] text-dark-4">Remember me</span>
          </label>
          <button
            type="button"
            onClick={onShowForgotPassword}
            className="-my-2 py-2 text-[13px] font-semibold text-blue transition-colors hover:text-blue-dark hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue text-sm font-semibold tracking-wide text-white shadow-sm transition-colors hover:bg-blue-dark active:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          )}
          {isLoading ? "Signing in..." : "Sign in"}
        </button>

        <GoogleSignInButton
          redirectUrl={redirectUrl}
          googleLoading={googleLoading}
          setGoogleLoading={setGoogleLoading}
        />
      </form>
    );
  },
);

LoginForm.displayName = "LoginForm";

export default LoginForm;
