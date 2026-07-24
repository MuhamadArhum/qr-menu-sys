export default function MenuLoading() {
  return (
    <main className="min-h-screen pb-36" style={{ background: "var(--paper)" }}>

      {/* Hero skeleton */}
      <div className="relative">
        <div className="h-44 w-full animate-pulse" style={{ background: "var(--char-10)" }} />

        {/* Restaurant info card skeleton */}
        <div className="px-4 -mt-6 relative z-10">
          <div className="rounded-3xl shadow-xl p-4" style={{ background: "var(--paper)" }}>
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div className="w-14 h-14 rounded-2xl shrink-0 animate-pulse" style={{ background: "var(--char-10)" }} />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 rounded-lg animate-pulse" style={{ background: "var(--char-10)" }} />
                <div className="h-3 w-24 rounded-lg animate-pulse" style={{ background: "var(--char-10)" }} />
                <div className="h-3 w-20 rounded-lg animate-pulse" style={{ background: "var(--char-10)" }} />
              </div>
              {/* Table stamp */}
              <div className="w-14 h-14 rounded-full animate-pulse shrink-0" style={{ background: "var(--char-10)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Category nav skeleton */}
      <div className="flex gap-2 overflow-hidden px-4 py-3 mt-3 border-b" style={{ borderColor: "var(--char-10)" }}>
        {[80, 96, 64, 88, 72].map((w, i) => (
          <div key={i} className="h-9 rounded-full shrink-0 animate-pulse" style={{ width: w, background: "var(--char-10)" }} />
        ))}
      </div>

      {/* Category heading + item cards */}
      <div className="px-4 pt-5 space-y-6">
        {[4, 3, 5].map((count, ci) => (
          <section key={ci}>
            {/* Category title */}
            <div className="h-4 w-28 rounded-lg mb-4 animate-pulse" style={{ background: "var(--char-10)" }} />
            {/* Item cards */}
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex gap-3 py-4 border-b last:border-0" style={{ borderColor: "var(--char-10)" }}>
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-2xl shrink-0 animate-pulse" style={{ background: "var(--char-10)" }} />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-16 rounded animate-pulse" style={{ background: "var(--char-10)" }} />
                  <div className="h-4 w-40 rounded animate-pulse" style={{ background: "var(--char-10)" }} />
                  <div className="h-3 w-56 rounded animate-pulse" style={{ background: "var(--char-10)" }} />
                  <div className="flex items-center justify-between mt-2">
                    <div className="h-4 w-16 rounded animate-pulse" style={{ background: "var(--char-10)" }} />
                    <div className="w-7 h-7 rounded-full animate-pulse" style={{ background: "var(--char-10)" }} />
                  </div>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
