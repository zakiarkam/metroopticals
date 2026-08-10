export default function SiteHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Left: logo + name */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>

        {/* Middle: search (desktop) */}
        <div className="hidden md:block">
          <div className="h-10 w-[420px] animate-pulse rounded bg-muted" />
        </div>

        {/* Right: icons */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </header>
  );
}
