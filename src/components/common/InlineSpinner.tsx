"use client";

import React from "react";

export default function InlineSpinner({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-4 border-solid border-blue border-r-transparent ${className}`}
      style={{ width: size, height: size }}
      aria-label="Loading"
      role="status"
    />
  );
}
