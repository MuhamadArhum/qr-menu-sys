export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-xl animate-pulse" style={{ background: "var(--char-10)" }} />
        <div className="h-4 w-64 rounded-lg animate-pulse" style={{ background: "var(--char-10)" }} />
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

      {/* Main card */}
      <div className="rounded-2xl p-5 space-y-4 animate-pulse" style={{ background: "var(--cream)" }}>
        <div className="h-4 w-32 rounded-lg" style={{ background: "var(--char-10)" }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0" style={{ borderColor: "var(--char-10)" }}>
            <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: "var(--char-10)" }} />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 rounded" style={{ width: `${55 + i * 8}%`, background: "var(--char-10)" }} />
              <div className="h-3 w-28 rounded" style={{ background: "var(--char-10)" }} />
            </div>
            <div className="h-6 w-16 rounded-full shrink-0" style={{ background: "var(--char-10)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
