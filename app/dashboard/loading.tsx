export default function DashboardLoading() {
  return (
    <div className="page-padding" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats tiles row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        <div className="skeleton-shimmer skeleton-tile" />
        <div className="skeleton-shimmer skeleton-tile" />
        <div className="skeleton-shimmer skeleton-tile" />
        <div className="skeleton-shimmer skeleton-tile" />
      </div>

      {/* Sparkline card */}
      <div className="skeleton-shimmer skeleton-sparkline" style={{ height: 120 }} />

      {/* Recent jobs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton-shimmer skeleton-recent-card" />
        <div className="skeleton-shimmer skeleton-recent-card" />
        <div className="skeleton-shimmer skeleton-recent-card" />
      </div>
    </div>
  );
}
