"use client";
import React, { useState, useEffect, useRef } from "react";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import AuthPageSkeleton from "./AuthPageSkeleton";

// Lazy load components for better performance
const AuthIllustrationPanel = dynamic(
  () => import("@/features/auth/components/AuthIllustrationPanel"),
  {
    ssr: false,
    loading: () => (
      <div className="hidden flex-col gap-6 rounded-l-3xl bg-gradient-to-br from-blue to-blue-light-3 p-6 text-white shadow-lg lg:flex">
        <div className="space-y-3">
          <div className="h-3 w-20 animate-pulse rounded bg-white/20" />
          <div className="h-7 w-72 animate-pulse rounded bg-white/20" />
          <div className="h-4 w-80 animate-pulse rounded bg-white/15" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-white/10 p-4">
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-28 w-28 animate-pulse rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </div>
    ),
  }
);

const AuthHeader = dynamic(() => import("./AuthHeader"), {
  ssr: false,
});

const LoginForm = dynamic(() => import("./LoginForm"), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded bg-gray-2 border border-gray-3" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-gray-2 border border-gray-3" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-20 animate-pulse rounded bg-gray-2 border border-gray-3" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-gray-2 border border-gray-3" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded-sm bg-gray-2 border border-gray-3" />
          <div className="h-3 w-24 animate-pulse rounded bg-gray-2 border border-gray-3" />
        </div>
        <div className="h-3 w-28 animate-pulse rounded bg-gray-2 border border-gray-3" />
      </div>
      <div className="h-10 w-full animate-pulse rounded-xl bg-gray-2 border border-gray-3" />
      <div className="flex items-center justify-center pt-2">
        <div className="h-3 w-20 animate-pulse rounded bg-gray-2 border border-gray-3" />
      </div>
      <div className="h-10 w-full animate-pulse rounded-xl bg-gray-2 border border-gray-3" />
    </div>
  ),
});

const SignupForm = dynamic(() => import("./SignupForm"), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      <div className="h-10 bg-gray-2 animate-pulse rounded border border-gray-3"></div>
      <div className="h-10 bg-gray-2 animate-pulse rounded border border-gray-3"></div>
      <div className="h-10 bg-gray-2 animate-pulse rounded border border-gray-3"></div>
    </div>
  ),
});

const ForgotPasswordForm = dynamic(
  () => import("./ForgotPasswordForm"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3">
        <div className="h-10 bg-gray-2 animate-pulse rounded border border-gray-3"></div>
        <div className="h-10 bg-gray-2 animate-pulse rounded border border-gray-3"></div>
      </div>
    ),
  }
);

type TabType = "login" | "signup";

const AuthAdmin = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/admin";
  const { data: session, status, update } = useCachedSession();

  const [activeTab, setActiveTab] = useState<TabType>("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated" && session && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      // Update session once to ensure latest data, then redirect
      update().then(() => {
        router.replace(redirectUrl);
      });
    }
  }, [status, session, router, redirectUrl, update]);

  if (status === "authenticated") {
    return null;
  }

  if (status === "loading") {
    return <AuthPageSkeleton />;
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setShowForgotPassword(false);
    setForgotEmail("");
  };

  const handleSignupSuccess = (email: string) => {
    setActiveTab("login");
  };

  const handleShowForgotPassword = () => {
    setShowForgotPassword(true);
  };

  const handleCancelForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotEmail("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-2 px-4 py-8">
      <div className="w-full max-w-5xl">
        <div className="grid overflow-hidden rounded-3xl bg-gray-2 shadow-lg lg:grid-cols-[1.05fr_0.95fr] border border-gray-3">
          <AuthIllustrationPanel />

          <div className="flex flex-col gap-4 px-6 py-6 sm:px-8 sm:py-8">
            <div className="space-y-3">
              <AuthHeader />
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "login" && !showForgotPassword && (
                <LoginForm
                  redirectUrl={redirectUrl}
                  onShowForgotPassword={handleShowForgotPassword}
                />
              )}

              {activeTab === "login" && showForgotPassword && (
                <ForgotPasswordForm
                  forgotEmail={forgotEmail}
                  setForgotEmail={setForgotEmail}
                  onCancel={handleCancelForgotPassword}
                />
              )}

              {activeTab === "signup" && (
                <SignupForm onSuccess={handleSignupSuccess} />
              )}
            </AnimatePresence>

            <div className="text-center text-sm text-muted-foreground">
              {activeTab === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => handleTabChange("signup")}
                    className="font-medium text-primary hover:underline"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => handleTabChange("login")}
                    className="font-medium text-primary hover:underline"
                  >
                    Log In
                  </button>
                </>
              )}
            </div>

            <div className="text-center text-sm">
              <Link
                href="/"
                className="font-medium text-primary hover:underline"
              >
                ← Back to Store
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthAdmin;
