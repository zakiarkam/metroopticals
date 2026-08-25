import SiteContainer from "@/components/common/SiteContainer";

/**
 * Contact page placeholder.
 *
 * The previous version filled the blocks with `bg-gray-800`, which on this
 * ivory palette is near-black  the loading state read as five dark slabs.
 * `gray-8` is the raised-surface tint the rest of the app skeletons use.
 */
const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-gray-8 ${className}`} />
);

export default function Loading() {
  return (
    <div className="bg-gray-1">
      <div className="border-b border-gray-3 bg-gray-2">
        <SiteContainer className="py-8 sm:py-10">
          <Bar className="h-3 w-40" />
          <Bar className="mt-4 h-9 w-72" />
          <Bar className="mt-3 h-4 w-full max-w-xl" />
        </SiteContainer>
      </div>

      <SiteContainer className="py-10 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Bar className="h-[520px] rounded-2xl" />
          <div className="space-y-6">
            <Bar className="h-64 rounded-2xl" />
            <Bar className="h-48 rounded-2xl" />
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
