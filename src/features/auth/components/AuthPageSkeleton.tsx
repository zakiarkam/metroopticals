import React from "react";

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-gray-2 ${className}`} />
);

export default function AuthPageSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-2 px-4 py-8">
      <div className="w-full max-w-5xl">
        <div className="grid overflow-hidden rounded-3xl bg-gray-2 shadow-lg lg:grid-cols-[1.05fr_0.95fr] border border-gray-3">
          {/* LEFT: Illustration panel skeleton (matches your actual left panel) */}
          <div className="hidden flex-col gap-6 rounded-l-3xl bg-gradient-to-br from-blue to-blue-light-3 p-6 text-white shadow-lg lg:flex">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20 bg-white/20" />
              <Skeleton className="h-7 w-72 bg-white/20" />
              <Skeleton className="h-4 w-80 bg-white/15" />
            </div>

            <div className="flex flex-1 items-center justify-center">
              <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-white/10 p-4">
                <div className="flex h-full w-full items-center justify-center">
                  <div className="h-28 w-28 rounded-full bg-white/20" />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Form panel skeleton (matches your actual form area) */}
          <div className="flex flex-col gap-4 px-6 py-6 sm:px-8 sm:py-8">
            {/* Header skeleton */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue/10">
                <Skeleton className="h-5 w-5 bg-blue/20" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>

            {/* Form skeleton */}
            <div className="space-y-3">
              {/* Email */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* Remember + forgot */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-28" />
              </div>

              {/* Login button */}
              <Skeleton className="h-10 w-full rounded-xl" />

              {/* Divider + Google */}
              <div className="pt-2">
                <div className="flex items-center justify-center">
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="mt-3">
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              </div>
            </div>

            {/* Bottom links */}
            <div className="space-y-2 pt-2 text-center">
              <div className="flex items-center justify-center gap-2">
                <Skeleton className="h-3 w-40" />
              </div>
              <div className="flex items-center justify-center">
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
