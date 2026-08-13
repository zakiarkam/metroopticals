import React from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  direction?: "up" | "down";
  caption?: string;
  isLoading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  direction,
  caption,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1 p-5 animate-pulse">
        <div className="h-4 bg-gray-2 rounded w-1/2 mb-3 border border-gray-3"></div>
        <div className="h-8 bg-gray-2 rounded w-3/4 border border-gray-3"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between rounded-xl bg-gray-2 shadow-1 p-4 sm:p-6 border border-gray-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-custom-xs uppercase text-body tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-semibold text-dark mt-2">{value}</p>
        </div>
        {change !== undefined && direction && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-custom-xs font-medium ${
              direction === "up"
                ? "bg-green-light-6 text-green"
                : "bg-red-light-6 text-red"
            }`}
          >
            {direction === "up" ? (
              <svg
                className="h-3 w-3"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M7 2L12 7H8V12H6V7H2L7 2Z" fill="currentColor" />
              </svg>
            ) : (
              <svg
                className="h-3 w-3"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M7 12L2 7H6V2H8V7H12L7 12Z" fill="currentColor" />
              </svg>
            )}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      {caption && (
        <p className="mt-4 text-custom-xs text-body">{caption}</p>
      )}
    </div>
  );
};

export default MetricCard;
