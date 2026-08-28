"use client";
import { safeRedirectPath } from "@/lib/safe-redirect";
import React, { useState, useEffect, useRef } from "react";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import AuthPageSkeleton from "./AuthPageSkeleton";
import AuthHeader from "./AuthHeader";

const AuthBrandPanel = dynamic(() => import("./AuthBrandPanel"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[linear-gradient(155deg,#3E2C15_0%,#6E5029_45%,#A9834B_100%)]" />
  ),
});

const FormFallback = () => (
  <div className="space-y-4">
    {[0, 1].map((row) => (
      <div key={row} className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded bg-gray-8" />
        <div className="h-11 w-full animate-pulse rounded-xl border border-gray-3 bg-gray-1" />
      </div>
    ))}
    <div className="h-11 w-full animate-pulse rounded-xl bg-gray-8" />
  </div>
);

const LoginForm = dynamic(() => import("./LoginForm"), {
  ssr: false,
  loading: () => <FormFallback />,
});

const SignupForm = dynamic(() => import("./SignupForm"), {
  ssr: false,
  loading: () => <FormFallback />,
});

const ForgotPasswordForm = dynamic(() => import("./ForgotPasswordForm"), {
  ssr: false,
  loading: () => <FormFallback />,
});

type TabType = "login" | "signup";

const HEADINGS = {
  login: {
    kicker: "Welcome back",
    title: "Sign in to your account",
    subtitle: "Enter your details to continue.",
  },
  signup: {
    kicker: "Get started",
    title: "Create your account",
    subtitle: "A few details and you're ready to shop.",
  },
  forgot: {
    kicker: "Password reset",
    title: "Forgot your password?",
    subtitle: "We'll email you a secure link.",
  },
} as const;

const AuthAdmin = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { data: session, status, update } = useCachedSession();

  /* `?mode=signup` opens the registration form directly. */
  const [activeTab, setActiveTab] = useState<TabType>(
    searchParams.get("mode") === "signup" ? "signup" : "login",
  );
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated" && session && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      const role = session.user?.role;
      const fallback =
        role === "SUPER_ADMIN" ? "/admin" : role === "ADMIN" ? "/admin/users" : "/";
      const target = safeRedirectPath(redirectParam, fallback);
      update()
        .catch(() => undefined)
        .finally(() => router.replace(target));
    }
  }, [status, session, router, redirectParam, update]);

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

  const isSignup = activeTab === "signup";
  const heading = showForgotPassword
    ? HEADINGS.forgot
    : HEADINGS[isSignup ? "signup" : "login"];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-1 px-4 py-10 sm:px-6">
      {/* Warm ambient wash behind the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-[-12%] h-[30rem] w-[30rem] rounded-full bg-blue-light/20 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 bottom-[-18%] h-[34rem] w-[34rem] rounded-full bg-blue-light-3/40 blur-[120px]"
      />

      <div className="relative w-full max-w-[1060px]">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-dark-4 transition-colors hover:text-blue"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to store
        </Link>

        <div className="relative overflow-hidden rounded-[28px] border border-gray-3 bg-white shadow-[0_28px_70px_-30px_rgba(27,23,19,0.45)]">
          {/* Compact brand ribbon  the panel's stand-in below `lg`. */}
          <div className="relative flex items-center gap-3 overflow-hidden bg-[linear-gradient(120deg,#3E2C15_0%,#6E5029_55%,#A9834B_100%)] px-6 py-5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark p-2 ring-1 ring-blue-light/30">
              <Image
                src={siteConfig.logoMark}
                alt={siteConfig.name}
                width={48}
                height={48}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">
                {siteConfig.name}
              </p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                {siteConfig.tagline}
              </p>
            </div>
          </div>

          <div className="grid lg:h-[680px] lg:grid-cols-2">
            <div
              className={cn(
                "flex flex-col px-6 py-8 sm:px-10 sm:py-10 lg:row-start-1 lg:h-full lg:overflow-y-auto lg:px-12",
                isSignup ? "lg:col-start-2" : "lg:col-start-1",
              )}
            >
              <div className="m-auto w-full">
                {/* Pill tabs stand in for the sliding panel on small screens. */}
                <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-gray-1 p-1 lg:hidden">
                  {(["login", "signup"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => handleTabChange(tab)}
                      className={cn(
                        "h-10 rounded-lg text-[13px] font-semibold transition-all",
                        activeTab === tab
                          ? "bg-white text-dark shadow-sm"
                          : "text-dark-4 hover:text-dark-2",
                      )}
                    >
                      {tab === "login" ? "Sign in" : "Create account"}
                    </button>
                  ))}
                </div>

                <AuthHeader {...heading} />

                <div className="mt-6">
                  {activeTab === "login" && !showForgotPassword && (
                    <LoginForm
                      redirectUrl={safeRedirectPath(redirectParam, "/")}
                      onShowForgotPassword={() => setShowForgotPassword(true)}
                    />
                  )}

                  {activeTab === "login" && showForgotPassword && (
                    <ForgotPasswordForm
                      forgotEmail={forgotEmail}
                      setForgotEmail={setForgotEmail}
                      onCancel={() => {
                        setShowForgotPassword(false);
                        setForgotEmail("");
                      }}
                    />
                  )}

                  {activeTab === "signup" && (
                    <SignupForm onSuccess={handleSignupSuccess} />
                  )}
                </div>

                {/* On `lg` the same invitation lives on the sliding panel. */}
                <p className="mt-6 text-center text-[13px] text-dark-4 lg:hidden">
                  {isSignup ? "Already have an account? " : "New to us? "}
                  <button
                    type="button"
                    onClick={() =>
                      handleTabChange(isSignup ? "login" : "signup")
                    }
                    className="font-semibold text-blue hover:underline"
                  >
                    {isSignup ? "Sign in" : "Create an account"}
                  </button>
                </p>
              </div>

            </div>
          </div>

          <motion.div
            className="absolute inset-y-0 left-0 hidden w-1/2 lg:block"
            initial={false}
            animate={{ x: isSignup ? "0%" : "100%" }}
            transition={{ type: "spring", stiffness: 240, damping: 30 }}
          >
            <AuthBrandPanel
              mode={activeTab}
              onSwitch={() => handleTabChange(isSignup ? "login" : "signup")}
            />
          </motion.div>
        </div>

        <p className="mt-5 text-center text-xs text-dark-5">
          © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AuthAdmin;
