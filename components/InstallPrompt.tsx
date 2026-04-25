"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Share, PlusSquare, X } from "lucide-react";

const DISMISS_KEY = "installDismissedAt";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

type Variant = "chrome" | "ios" | null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [variant, setVariant] = useState<Variant>(null);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed — never show
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Dismissed recently
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DURATION_MS) return;

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);

    const show = (v: Variant) => {
      setTimeout(() => setVariant(v), 2000);
    };

    if (isIos) {
      show("ios");
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      show("chrome");
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVariant(null);
  };

  const install = async () => {
    if (!deferredRef.current) return;
    await deferredRef.current.prompt();
    const { outcome } = await deferredRef.current.userChoice;
    if (outcome === "accepted") {
      setVariant(null);
    } else {
      dismiss();
    }
  };

  if (!variant) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Install TradesBrain"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: "0 0 env(safe-area-inset-bottom, 0)",
        animation: "slideUp 0.3s ease",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div
        style={{
          background: "var(--bg-panel)",
          borderTop: "1px solid var(--border-subtle)",
          borderRadius: "16px 16px 0 0",
          padding: "20px 20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <Image
            src="/icons/icon-192.png"
            alt="TradesBrain"
            width={48}
            height={48}
            style={{ borderRadius: 10, flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            {variant === "chrome" ? (
              <>
                <p
                  style={{
                    fontFamily: "var(--font-syne)",
                    fontWeight: 700,
                    fontSize: 16,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  Install TradesBrain
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: 400,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    margin: "4px 0 0",
                  }}
                >
                  Get faster access. Add to your home screen.
                </p>
              </>
            ) : (
              <>
                <p
                  style={{
                    fontFamily: "var(--font-syne)",
                    fontWeight: 700,
                    fontSize: 16,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  Install TradesBrain on your iPhone
                </p>
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: 13,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <Share size={16} color="var(--amber-400)" />
                    1. Tap the Share button
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: 13,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <PlusSquare size={16} color="var(--amber-400)" />
                    2. Tap &ldquo;Add to Home Screen&rdquo;
                  </span>
                </div>
              </>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              padding: 4,
              cursor: "pointer",
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          {variant === "chrome" ? (
            <>
              <button
                className="btn-accent"
                onClick={install}
                style={{ flex: 1 }}
              >
                Install
              </button>
              <button
                className="btn-ghost"
                onClick={dismiss}
                style={{ flex: 1 }}
              >
                Maybe later
              </button>
            </>
          ) : (
            <button
              className="btn-accent"
              onClick={dismiss}
              style={{ flex: 1 }}
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
