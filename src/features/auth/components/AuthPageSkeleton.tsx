import React from "react";

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-gray-8 ${className}`} />
);

/** Loading state for the auth screen  mirrors the split card in `index.tsx`. */
export default function AuthPageSkeleton() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-1 px-4 py-10 sm:px-6">
      <div className="relative w-full max-w-[1060px]">
        <Skeleton className="mb-4 h-3 w-28" />

        <div className="relative overflow-hidden rounded-[28px] border border-gray-3 bg-white shadow-[0_28px_70px_-30px_rgba(27,23,19,0.45)]">
          <div className="flex items-center gap-3 bg-[linear-gradient(120deg,#3E2C15_0%,#6E5029_55%,#A9834B_100%)] px-6 py-5 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-white/80" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 bg-white/40" />
              <Skeleton className="h-2 w-20 bg-white/25" />
            </div>
          </div>

          <div className="grid lg:min-h-[680px] lg:grid-cols-2">
            {/* Form half */}
            <div className="flex flex-col justify-center gap-6 px-6 py-8 sm:px-10 sm:py-10 lg:col-start-1 lg:row-start-1 lg:px-12">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-60" />
                <Skeleton className="h-3 w-44" />
              </div>

              <div className="space-y-4">
                {[0, 1].map((row) => (
                  <div key={row} className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                ))}

                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-28" />
                </div>

                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="mx-auto h-3 w-32" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>

            {/* Brand half */}
            <div className="relative hidden flex-col justify-between bg-[linear-gradient(155deg,#3E2C15_0%,#6E5029_45%,#A9834B_100%)] p-9 lg:flex xl:p-11">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/80" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28 bg-white/40" />
                  <Skeleton className="h-2 w-20 bg-white/25" />
                </div>
              </div>

              <div className="my-10 space-y-4">
                <Skeleton className="h-3 w-28 bg-white/30" />
                <Skeleton className="h-8 w-64 bg-white/30" />
                <Skeleton className="h-3 w-72 bg-white/20" />
                <Skeleton className="h-11 w-40 rounded-xl bg-white/20" />
              </div>

              <div className="space-y-3 border-t border-white/15 pt-6">
                {[0, 1, 2].map((row) => (
                  <Skeleton key={row} className="h-3 w-56 bg-white/20" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
