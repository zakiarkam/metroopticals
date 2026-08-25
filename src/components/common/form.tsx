import React from "react";

export const inputClasses =
  "h-11 w-full rounded-xl border border-gray-3 bg-gray-1 px-4 text-[14px] text-dark transition-colors placeholder:text-dark-5 hover:border-gray-4 focus:border-blue disabled:opacity-60 aria-[invalid=true]:border-red";

export const textareaClasses =
  "w-full resize-none rounded-xl border border-gray-3 bg-gray-1 p-4 text-[14px] leading-relaxed text-dark transition-colors placeholder:text-dark-5 hover:border-gray-4 focus:border-blue disabled:opacity-60 aria-[invalid=true]:border-red";

export const labelClasses = "mb-2 block text-[12.5px] font-semibold text-dark";

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
        <p
          id={`${htmlFor}-error`}
          className="mt-1.5 text-[12px] font-medium text-red"
        >
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
