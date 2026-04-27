'use client';

import { useState } from 'react';
import Image from 'next/image';
import SignInModal from '@/components/SignInModal';

type WelcomeStepProps = {
  advanceStep: (validator: () => boolean) => void;
};

export default function WelcomeStep({ advanceStep }: WelcomeStepProps) {
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100dvh - 48px)",
        padding: "0 8px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "320px" }}>
        {/* Brand logo */}
        <div className="welcome-item stagger-0">
          <Image
            src="/logo/verityflow-icon.png"
            alt="VerityFlow"
            width={64}
            height={64}
            priority
            className="welcome-logo"
            style={{ borderRadius: 14 }}
          />
        </div>

        {/* Title */}
        <div className="welcome-item stagger-1">
          <h1 className="welcome-title">VerityFlow</h1>
        </div>

        {/* Tagline */}
        <div className="welcome-item stagger-2">
          <p className="welcome-tagline">
            Voice in. Invoice out.
          </p>
        </div>

        {/* Sub */}
        <div className="welcome-item stagger-3">
          <p className="welcome-sub">Set up in 2 minutes.</p>
        </div>

        {/* Get Started */}
        <div className="welcome-item stagger-4">
          <button
            type="button"
            className="btn-accent welcome-cta"
            onClick={() => advanceStep(() => true)}
          >
            Get Started
          </button>
        </div>

        {/* Sign in */}
        <div className="welcome-item stagger-5">
          <button
            type="button"
            className="welcome-signin"
            onClick={() => setSignInOpen(true)}
          >
            Already have an account?{" "}
            <span style={{ fontWeight: 500 }}>Sign in</span>
          </button>
        </div>
      </div>

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}
