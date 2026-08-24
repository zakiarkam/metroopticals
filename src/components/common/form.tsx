import React from "react";

/**
 * Form primitives shared by checkout, contact and the account editor.
 *
 * The same 130-character input class string was pasted eleven times across
 * those three files, in three slightly different versions — one had a
 * placeholder colour, one had a disabled state, one had neither — so the same
 * field looked different depending on which page you were filling in.
 *
 * Neither class sets `outline-none`. The global `:focus-visible` ring in
 * style.css is the only focus indicator these controls have, and suppressing it
 * left the border-colour change as the only cue, which is not enough on its own.
 */

export const inputClasses =
  "h-11 w-full rounded-xl border border-gray-3 bg-gray-1 px-4 text-[14px] text-dark transition-colors placeholder:text-dark-5 hover:border-gray-4 focus:border-blue disabled:opacity-60 aria-[invalid=true]:border-red";

export const textareaClasses =
  "w-full resize-none rounded-xl border border-gray-3 bg-gray-1 p-4 text-[14px] leading-relaxed text-dark transition-colors placeholder:text-dark-5 hover:border-gray-4 focus:border-blue disabled:opacity-60 aria-[invalid=true]:border-red";

export const labelClasses = "mb-2 block text-[12.5px] font-semibold text-dark";

/**
 * One labelled control.
 *
 * `error` renders the message under the field and wires `aria-invalid` /
 * `aria-describedby` onto the child, so a validation failure is announced
 * rather than only shown as a toast.
 */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const describedBy = error
    ? `${htmlFor}-error`
    : hint
      ? `${htmlFor}-hint`
      : undefined;

  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelClasses}>
        {label}
        {required && (
          <span className="ml-1 text-red" aria-hidden>
            *
          </span>
        )}
      </label>

      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            id: htmlFor,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": describedBy,
          })
        : children}

      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-[12px] font-medium text-red">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-[12px] text-dark-5">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
