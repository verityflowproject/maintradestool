import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg-void)",
        gap: 12,
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-syne)",
          fontWeight: 700,
          fontSize: 64,
          color: "var(--amber-400)",
          margin: 0,
          lineHeight: 1,
        }}
      >
        404
      </p>

      <p
        style={{
          fontFamily: "var(--font-dm-sans)",
          fontWeight: 400,
          fontSize: 16,
          color: "var(--text-secondary)",
          margin: 0,
        }}
      >
        This page doesn&rsquo;t exist.
      </p>

      <Link href="/dashboard" className="btn-accent" style={{ marginTop: 8 }}>
        Go home
      </Link>
    </div>
  );
}
