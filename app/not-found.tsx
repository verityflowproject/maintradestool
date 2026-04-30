import Link from "next/link";
import Image from "next/image";

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
        gap: 16,
        textAlign: "center",
      }}
    >
      <Image
        src="/logo/verityflow-icon.png"
        alt="VerityFlow"
        width={48}
        height={48}
        style={{ borderRadius: 12, opacity: 0.7 }}
      />

      <p
        style={{
          fontFamily: "var(--font-syne)",
          fontWeight: 700,
          fontSize: 72,
          color: "var(--amber-400)",
          margin: 0,
          lineHeight: 1,
        }}
      >
        404
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
        <p
          style={{
            fontFamily: "var(--font-syne)",
            fontWeight: 600,
            fontSize: 18,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Page not found
        </p>
        <p
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 400,
            fontSize: 14,
            color: "var(--text-secondary)",
            margin: 0,
            maxWidth: 280,
            lineHeight: 1.5,
          }}
        >
          This page doesn&rsquo;t exist or may have been moved.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
        <Link href="/dashboard" className="btn-accent">
          Go to dashboard
        </Link>
        <Link href="/help" className="btn-ghost">
          Help center
        </Link>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 8 }}>
        Need help?{" "}
        <a
          href="mailto:contact@verityflow.io"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          contact@verityflow.io
        </a>
      </p>
    </div>
  );
}
