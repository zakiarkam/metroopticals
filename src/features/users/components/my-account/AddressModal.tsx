"use client";

import React, { useEffect, useRef } from "react";

type Props = {
  isOpen: boolean;
  closeModal: () => void;
};

export default function AddressModal({ isOpen, closeModal }: Props) {
  const firstInputRef = useRef<HTMLInputElement>(null);

  // lock body scroll when open and set initial focus
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstInputRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-dark/70 px-4 py-6 sm:px-8 sm:py-10 overflow-y-auto"
      onMouseDown={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-modal-title"
      aria-describedby="address-modal-desc"
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          className="w-full max-w-3xl rounded-xl bg-gray-2 shadow-3 p-5 sm:p-7.5 relative border border-gray-3"
          onMouseDown={(e) => e.stopPropagation()}
          role="document"
        >
          <button
            onClick={closeModal}
            aria-label="Close modal"
            title="Close"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-1 text-body hover:text-dark"
            type="button"
          >
            ✕
          </button>

          <p
            id="address-modal-title"
            className="text-dark font-semibold text-lg"
          >
            Address
          </p>
          <p id="address-modal-desc" className="text-custom-sm text-body mt-1">
            Update your saved address details.
          </p>

          <form className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="address-name" className="block mb-2.5">
                  Name
                </label>
                <input
                  ref={firstInputRef}
                  id="address-name"
                  name="name"
                  type="text"
                  className="w-full rounded-xl border border-gray-3 bg-gray-1 px-4 py-3 outline-none focus:shadow-input focus:ring-2 focus:ring-blue/20"
                />
              </div>
              <div>
                <label htmlFor="address-email" className="block mb-2.5">
                  Email
                </label>
                <input
                  id="address-email"
                  name="email"
                  type="email"
                  className="w-full rounded-xl border border-gray-3 bg-gray-1 px-4 py-3 outline-none focus:shadow-input focus:ring-2 focus:ring-blue/20"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="address-phone" className="block mb-2.5">
                  Phone
                </label>
                <input
                  id="address-phone"
                  name="phone"
                  type="text"
                  className="w-full rounded-xl border border-gray-3 bg-gray-1 px-4 py-3 outline-none focus:shadow-input focus:ring-2 focus:ring-blue/20"
                />
              </div>
              <div>
                <label htmlFor="address-line" className="block mb-2.5">
                  Address
                </label>
                <input
                  id="address-line"
                  name="address"
                  type="text"
                  className="w-full rounded-xl border border-gray-3 bg-gray-1 px-4 py-3 outline-none focus:shadow-input focus:ring-2 focus:ring-blue/20"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                className="inline-flex rounded-full bg-blue px-6 py-3 text-sm font-semibold text-white hover:bg-blue-dark"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex rounded-full border border-gray-3 px-6 py-3 text-sm font-semibold text-dark hover:border-blue hover:text-blue"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
