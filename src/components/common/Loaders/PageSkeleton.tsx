function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export default function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title + subtitle */}
      <div className="space-y-2">
        <Block className="h-7 w-64" />
        <Block className="h-4 w-96 max-w-full" />
      </div>

      {/* Hero / banner */}
      <Block className="h-40 w-full" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-3">
            <Block className="h-32 w-full" />
            <Block className="h-4 w-3/4" />
            <Block className="h-4 w-1/2" />
            <Block className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
