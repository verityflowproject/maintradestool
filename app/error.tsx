"use client";

import { AlertTriangle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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

      <AlertTriangle size={36} color="var(--amber-400)" strokeWidth={1.5} />

      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
        <h1
          style={{
            fontFamily: "var(--font-syne)",
            fontWeight: 700,
            fontSize: 20,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 400,
            fontSize: 14,
            color: "var(--text-secondary)",
            margin: 0,
            maxWidth: 300,
            lineHeight: 1.5,
          }}
        >
          An unexpected error occurred. Please try again, or reach out if the problem persists.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
        <button className="btn-accent" onClick={reset}>
          Try again
        </button>
        <Link href="/dashboard" className="btn-ghost">
          Go home
        </Link>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 8 }}>
        Still having trouble?{" "}
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
