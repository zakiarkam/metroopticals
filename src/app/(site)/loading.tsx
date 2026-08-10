import PageSkeleton from "@/components/common/Loaders/PageSkeleton";
import SiteHeaderSkeleton from "@/components/common/SiteHeaderSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeaderSkeleton />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <PageSkeleton />
      </main>
    </div>
  );
}
