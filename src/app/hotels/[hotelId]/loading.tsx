export default function HotelDetailLoading() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 md:py-9">
      <section className="space-y-3 rounded-3xl border border-border/80 bg-card/85 p-5 shadow-sm md:p-6 animate-fade-in">
        <div className="h-4 w-24 skeleton-shimmer rounded" />
        <div className="h-10 w-2/3 skeleton-shimmer rounded" />
        <div className="h-4 w-1/2 skeleton-shimmer rounded" />
        <div className="h-4 w-1/3 skeleton-shimmer rounded" />
      </section>

      <section className="grid gap-3 md:grid-cols-[1.2fr,1fr]">
        <div className="h-[360px] skeleton-shimmer rounded-2xl md:h-[430px]" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[210px] skeleton-shimmer rounded-2xl" />
          ))}
        </div>
      </section>

      <nav className="sticky top-2 z-10 flex flex-wrap gap-2 rounded-2xl border border-border/80 glass-card p-2 backdrop-blur">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-8 w-20 skeleton-shimmer rounded-full" />
        ))}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[1.75fr,0.95fr]">
        <div className="space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-border glass-card p-5">
              <div className="h-6 w-40 skeleton-shimmer rounded" />
              <div className="mt-4 space-y-3">
                <div className="h-20 skeleton-shimmer rounded-xl" />
                <div className="h-20 skeleton-shimmer rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border glass-card p-5">
            <div className="h-4 w-20 skeleton-shimmer rounded" />
            <div className="mt-2 h-10 w-32 skeleton-shimmer rounded" />
            <div className="mt-4 h-24 skeleton-shimmer rounded-xl" />
            <div className="mt-4 h-10 skeleton-shimmer rounded-full" />
          </div>
        </aside>
      </div>
    </main>
  );
}
