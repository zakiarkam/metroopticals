export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="space-y-4">
          <div className="h-6 w-56 animate-pulse rounded bg-muted" />
          <div className="h-40 w-full animate-pulse rounded bg-muted" />
          <div className="h-40 w-full animate-pulse rounded bg-muted" />
        </div>
      </main>
    </div>
  );
}
