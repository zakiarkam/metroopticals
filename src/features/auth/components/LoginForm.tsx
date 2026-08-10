import React, { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Toast } from "@/lib/utils/toast";
import { authApi } from "@/features/auth/api/auth-api";
import dynamic from "next/dynamic";

const GoogleSignInButton = dynamic(() => import("./GoogleSignInButton"), {
  ssr: false,
  loading: () => (
    <Button variant="outline" disabled className="w-full">
      Loading...
    </Button>
  ),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

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
            "Invalid credentials. Please check your email and password."
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
            router.push("/admin/users");
          } else {
            router.push("/");
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
      <motion.form
        key="login"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        onSubmit={loginForm.handleSubmit(onSubmit)}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            {...loginForm.register("email")}
            type="email"
            placeholder="john@example.com"
          />
          {loginForm.formState.errors.email && (
            <p className="text-xs text-red">
              {loginForm.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              {...loginForm.register("password")}
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
          {loginForm.formState.errors.password && (
            <p className="text-xs text-red">
              {loginForm.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox id="remember" />
            <span className="text-sm text-dark-4">Remember me</span>
          </label>
          <button
            type="button"
            onClick={onShowForgotPassword}
            className="text-sm font-medium text-primary hover:underline"
          >
            Forgot Password?
          </button>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Signing in..." : "Login"}
        </Button>

        <GoogleSignInButton
          redirectUrl={redirectUrl}
          googleLoading={googleLoading}
          setGoogleLoading={setGoogleLoading}
        />
      </motion.form>
    );
  }
);

LoginForm.displayName = "LoginForm";

export default LoginForm;
