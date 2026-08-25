import React from "react";
import InlineSpinner from "./InlineSpinner";

export default function PageLoading({
  className = "min-h-[60vh]",
}: {
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <InlineSpinner size={34} />
      <span className="sr-only">Loading</span>
    </div>
  );
}
