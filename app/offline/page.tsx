'use client';

import Image from 'next/image';

export default function OfflinePage() {
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
        width={80}
        height={80}
        style={{ borderRadius: 18, opacity: 0.75 }}
      />

      <h1
        style={{
          fontFamily: "var(--font-syne)",
          fontWeight: 700,
          fontSize: 22,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        You&rsquo;re offline
      </h1>

      <p
        style={{
          fontFamily: "var(--font-dm-sans)",
          fontWeight: 400,
          fontSize: 14,
          color: "var(--text-secondary)",
          margin: 0,
          maxWidth: 280,
        }}
      >
        Check your connection to continue.
      </p>

      <button
        className="btn-accent"
        onClick={() => window.location.reload()}
        style={{ marginTop: 8 }}
      >
        Try Again
      </button>
    </div>
  );
}
