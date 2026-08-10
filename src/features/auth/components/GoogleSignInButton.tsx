import React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Toast } from "@/lib/utils/toast";

interface GoogleSignInButtonProps {
  redirectUrl: string;
  googleLoading: boolean;
  setGoogleLoading: (loading: boolean) => void;
}

const GoogleSignInButton = React.memo(
  ({
    redirectUrl,
    googleLoading,
    setGoogleLoading,
  }: GoogleSignInButtonProps) => {
    const router = useRouter();

    const handleGoogleSignIn = async () => {
      setGoogleLoading(true);
      try {
        // ✅ OAuth MUST redirect to Google to complete
        await signIn("google", {
          callbackUrl: redirectUrl || "/",
        });
        // no code after this runs because browser navigates
      } catch (e) {
        console.error(e);
        Toast.error("Failed to sign in with Google. Please try again.");
        setGoogleLoading(false);
      }
    };

    return (
      <>
        <div className="relative flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Or login with</span>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.86c-.21 1.16-.86 2.14-1.84 2.8l2.97 2.3c1.74-1.6 2.75-3.97 2.75-6.74z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.97-2.3c-.82.55-1.87.87-2.99.87-2.3 0-4.26-1.55-4.96-3.63H1.94v2.28C3.43 15.9 6 18 9 18z"
              fill="#34A853"
            />
            <path
              d="M4.04 10.77a5.41 5.41 0 0 1 0-3.54V4.95H1.94a9 9 0 0 0 0 8.1l2.1-2.28z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.32 0 2.5.45 3.43 1.34l2.56-2.56C13.47.98 11.43 0 9 0 6 0 3.43 2.1 1.94 4.95l2.1 2.28C4.74 5.13 6.69 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </Button>
      </>
    );
  }
);

GoogleSignInButton.displayName = "GoogleSignInButton";

export default GoogleSignInButton;
