export default function SearchLoading() {
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-8">
      <section className="relative overflow-hidden rounded-[32px] border border-border/80 bg-gradient-to-br from-white/80 via-white/60 to-primary/5 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.55)] md:p-7 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-32 skeleton-shimmer rounded" />
            <div className="h-8 w-72 skeleton-shimmer rounded" />
            <div className="h-4 w-56 skeleton-shimmer rounded" />
          </div>
        </div>
      </section>
      
      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-card/75 p-3">
        <div className="h-6 w-16 skeleton-shimmer rounded-full" />
        <div className="h-6 w-24 skeleton-shimmer rounded-full" />
        <div className="h-6 w-20 skeleton-shimmer rounded-full" />
        <div className="ml-auto h-6 w-24 skeleton-shimmer rounded-full" />
      </section>
      
      <section className="grid gap-6 lg:grid-cols-[0.95fr,1.55fr]">
        <aside className="space-y-4">
          <div className="rounded-[28px] border border-border/70 bg-card/90 p-5 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 skeleton-shimmer rounded-2xl" />
                <div className="space-y-1">
                  <div className="h-4 w-32 skeleton-shimmer rounded" />
                  <div className="h-3 w-24 skeleton-shimmer rounded" />
                </div>
              </div>
              <div className="h-6 w-16 skeleton-shimmer rounded-full" />
            </div>
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 skeleton-shimmer rounded-2xl" />
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-6 w-24 skeleton-shimmer rounded-full" />
              ))}
            </div>
          </div>
          <div className="h-32 skeleton-shimmer rounded-[24px]" />
        </aside>
        
        <div className="space-y-4">
          <div className="rounded-3xl border border-border/70 bg-card/85 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="h-3 w-20 skeleton-shimmer rounded" />
                <div className="mt-1 h-6 w-40 skeleton-shimmer rounded" />
                <div className="mt-2 h-4 w-32 skeleton-shimmer rounded" />
              </div>
              <div className="h-8 w-28 skeleton-shimmer rounded-full" />
            </div>
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="grid gap-4 rounded-3xl border border-border/40 bg-card/70 p-4 md:grid-cols-[260px,1fr,210px]"
              >
                <div className="h-56 w-full skeleton-shimmer rounded-2xl md:h-full" />
                <div className="space-y-3">
                  <div className="h-6 w-3/4 skeleton-shimmer rounded" />
                  <div className="h-4 w-1/2 skeleton-shimmer rounded" />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 skeleton-shimmer rounded-full" />
                    <div className="h-6 w-24 skeleton-shimmer rounded-full" />
                  </div>
                  <div className="h-4 w-2/3 skeleton-shimmer rounded" />
                </div>
                <div className="hidden md:flex md:flex-col md:items-end md:gap-4">
                  <div className="h-20 w-28 skeleton-shimmer rounded-2xl" />
                  <div className="h-10 w-24 skeleton-shimmer rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
