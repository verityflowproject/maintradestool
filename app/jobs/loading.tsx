export default function JobsLoading() {
  return (
    <div className="page-padding" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton-shimmer skeleton-recent-card" />
      ))}
    </div>
  );
}
