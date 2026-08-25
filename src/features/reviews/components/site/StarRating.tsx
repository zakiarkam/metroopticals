import React from "react";
import { Star } from "lucide-react";

/**
 * Star display, and the input used by the write form.
 *
 * Rendered as radio inputs when interactive so it is keyboard-operable and
 * announces as a single "Rating" group  a row of clickable icons is invisible
 * to a screen reader.
 */
export function StarRating({
  value,
  size = 16,
  className = "",
}: {
  value: number | null;
  size?: number;
  className?: string;
}) {
  const rating = value ?? 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={value ? `${value} out of 5 stars` : "Not yet rated"}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          style={{ width: size, height: size }}
          className={
            star <= Math.round(rating)
              ? "fill-blue-light text-blue-light"
              : "fill-gray-3 text-gray-3"
          }
        />
      ))}
    </span>
  );
}

export function StarInput({
  value,
  onChange,
  name = "rating",
}: {
  value: number;
  onChange: (next: number) => void;
  name?: string;
}) {
  return (
    <fieldset className="flex items-center gap-1">
      <legend className="sr-only">Rating</legend>

      {[1, 2, 3, 4, 5].map((star) => (
        <label
          key={star}
          className="cursor-pointer p-0.5"
          title={`${star} star${star > 1 ? "s" : ""}`}
        >
          <input
            type="radio"
            name={name}
            value={star}
            checked={value === star}
            onChange={() => onChange(star)}
            className="sr-only peer"
          />
          <Star
            className={`h-7 w-7 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue ${
              star <= value
                ? "fill-blue-light text-blue-light"
                : "fill-gray-3 text-gray-3 hover:fill-blue-light-3 hover:text-blue-light-3"
            }`}
          />
        </label>
      ))}
    </fieldset>
  );
}
