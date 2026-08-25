import React from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One labelled field on the auth screens.
 *
 * The auth pages use a taller, ivory-filled input than the rest of the admin
 * UI  the form is the only thing on the screen, so the controls carry more
 * weight. Keeping that treatment in one component stops the login, signup and
 * reset forms from drifting apart.
 */

interface AuthFieldProps {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  /** Rendered inside the field, right-aligned  the password reveal toggle. */
  trailing?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const authInputClasses =
  "h-11 w-full rounded-xl border-gray-3 bg-gray-1 pl-10 text-[15px] text-dark shadow-none transition-all placeholder:text-dark-5 hover:border-blue-light focus-visible:border-blue focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue/15 md:text-sm";

const AuthField = ({
  id,
  label,
  icon: Icon,
  error,
  trailing,
  className,
  children,
}: AuthFieldProps) => (
  <div className={cn("space-y-1.5", className)}>
    <label
      htmlFor={id}
      className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dark-4"
    >
      {label}
    </label>
    <div className="relative">
      <Icon
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-5"
      />
      {children}
      {trailing}
    </div>
    {error && <p className="text-xs font-medium text-red">{error}</p>}
  </div>
);

export default AuthField;

/** Show / hide control that sits inside a password field. */
export const PasswordToggle = ({
  shown,
  onToggle,
}: {
  shown: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={shown ? "Hide password" : "Show password"}
    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-dark-5 transition-colors hover:text-blue"
  >
    {shown ? (
      <EyeOff className="h-4 w-4" aria-hidden />
    ) : (
      <Eye className="h-4 w-4" aria-hidden />
    )}
  </button>
);
