export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 rounded-xl animate-pulse" style={{ background: "var(--char-10)" }} />
          <div className="h-4 w-60 rounded-lg animate-pulse" style={{ background: "var(--char-10)" }} />
        </div>
        <div className="h-10 w-28 rounded-xl animate-pulse" style={{ background: "var(--char-10)" }} />
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-5 space-y-3 animate-pulse" style={{ background: "var(--cream)" }}>
            <div className="h-3 w-20 rounded" style={{ background: "var(--char-10)" }} />
            <div className="h-7 w-14 rounded-lg" style={{ background: "var(--char-10)" }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl overflow-hidden animate-pulse" style={{ border: "1.5px solid var(--char-10)" }}>
        {/* Table header */}
        <div className="flex gap-4 px-5 py-3" style={{ background: "var(--cream)" }}>
          {[120, 160, 90, 100, 80].map((w, i) => (
            <div key={i} className="h-3 rounded" style={{ width: w, background: "var(--char-10)" }} />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-t" style={{ borderColor: "var(--char-10)", background: "var(--paper)" }}>
            <div className="h-4 w-28 rounded" style={{ background: "var(--char-10)" }} />
            <div className="h-4 rounded" style={{ width: 150 + (i % 3) * 20, background: "var(--char-10)" }} />
            <div className="h-6 w-20 rounded-full" style={{ background: "var(--char-10)" }} />
            <div className="h-4 w-24 rounded" style={{ background: "var(--char-10)" }} />
            <div className="h-4 w-16 rounded" style={{ background: "var(--char-10)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
