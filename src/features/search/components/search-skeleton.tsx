export function SearchSkeleton() {
  return (
    <div className="grid gap-4 rounded-3xl border border-border bg-card/92 p-4 shadow-[0_24px_48px_-40px_rgba(15,23,42,0.5)] supports-[backdrop-filter]:bg-card/88 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="h-12 rounded-xl skeleton-shimmer motion-reduce:animate-none" />
      ))}
    </div>
  );
}
