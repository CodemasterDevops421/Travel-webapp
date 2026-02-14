export default function BookingLoading() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <section className="rounded-3xl border border-border/80 bg-card/80 p-6 shadow-sm animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-24 skeleton-shimmer rounded" />
            <div className="h-8 w-64 skeleton-shimmer rounded" />
            <div className="h-4 w-96 skeleton-shimmer rounded" />
          </div>
          <div className="h-8 w-28 skeleton-shimmer rounded-full" />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`h-8 w-8 skeleton-shimmer rounded-full ${i === 1 ? 'bg-primary/20' : ''}`} />
              <div className="h-4 w-24 skeleton-shimmer rounded" />
              {i < 3 && <div className="h-px w-8 bg-border" />}
            </div>
          ))}
        </div>
      </section>
      
      <div className="grid gap-6 lg:grid-cols-[1.35fr,0.9fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-5 w-5 skeleton-shimmer rounded" />
              <div className="h-5 w-32 skeleton-shimmer rounded" />
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="h-16 skeleton-shimmer rounded" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-16 skeleton-shimmer rounded" />
                  <div className="h-10 skeleton-shimmer rounded-lg" />
                </div>
              ))}
            </div>
            <div className="mt-4 h-12 skeleton-shimmer rounded-full" />
          </div>
        </div>
        
        <div className="rounded-2xl border border-border glass-card p-5">
          <div className="h-4 w-32 skeleton-shimmer rounded" />
          <div className="mt-4 space-y-3 rounded-xl border border-border/50 bg-background/60 p-4">
            <div className="h-4 skeleton-shimmer rounded" />
            <div className="h-4 skeleton-shimmer rounded" />
          </div>
          <div className="mt-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-24 skeleton-shimmer rounded" />
                <div className="h-4 w-16 skeleton-shimmer rounded" />
              </div>
            ))}
          </div>
          <div className="mt-4 h-10 skeleton-shimmer rounded-full" />
        </div>
      </div>
    </main>
  );
}
