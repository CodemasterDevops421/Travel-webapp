export function SearchSkeleton() {
  return (
    <div className="grid gap-4 rounded-3xl border border-border bg-card/90 p-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="h-12 rounded-xl skeleton-shimmer" />
      ))}
    </div>
  );
}
