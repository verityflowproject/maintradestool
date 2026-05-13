"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" />
    </svg>
  );
}

type ErrorState =
  | { kind: "incorrect" }
  | { kind: "google-only" }
  | { kind: "generic"; message: string }
  | null;

interface SignInFormProps {
  defaultEmail?: string;
  verifiedBanner?: boolean;
  alreadyVerifiedBanner?: boolean;
}

export default function SignInForm({
  defaultEmail = "",
  verifiedBanner = false,
  alreadyVerifiedBanner = false,
}: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ErrorState>(null);

  useEffect(() => {
    if (defaultEmail) setEmail(defaultEmail);
  }, [defaultEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });

      if (res?.error) {
        // NextAuth v5 can return a false-positive CredentialsSignin error
        // even when the JWT cookie was set. Verify via getSession first.
        const session = await getSession();
        if (session?.user) {
          router.push("/dashboard");
          return;
        }

        try {
          const methodRes = await fetch("/api/auth/check-method", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalizedEmail }),
          });
          const methodJson = await methodRes.json().catch(() => ({}));
          if (methodJson?.method === "google") {
            setError({ kind: "google-only" });
          } else {
            setError({ kind: "incorrect" });
          }
        } catch {
          setError({ kind: "incorrect" });
        }
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError({
        kind: "generic",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="signin-page">
      <div className="signin-card">
        <Link
          href="/"
          aria-label="Back to home"
          className="signin-back-home"
        >
          ← Back to home
        </Link>

        <div className="signin-page__header">
          <Image
            src="/logo/verityflow-icon.png"
            alt="VerityFlow"
            width={56}
            height={56}
            priority
            style={{ borderRadius: 12 }}
          />
          <h1 className="signin-page__title">Welcome back</h1>
          <p className="signin-page__sub">Sign in to your VerityFlow account.</p>
        </div>

        {(verifiedBanner || alreadyVerifiedBanner) && (
          <div className="signin-verified-banner" role="status">
            {alreadyVerifiedBanner
              ? "Your email is already confirmed — sign in to continue."
              : "Your email is confirmed! Sign in to start your trial."}
          </div>
        )}

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="signin-google-btn"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="signin-divider">
          <span aria-hidden="true" />
          <span className="signin-divider__text">or</span>
          <span aria-hidden="true" />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="signin-email">Email address</label>
            <input
              id="signin-email"
              type="email"
              className="input-field"
              placeholder="you@email.com"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="signin-password">Password</label>
            <input
              id="signin-password"
              type="password"
              className="input-field"
              placeholder="Your password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error?.kind === "incorrect" && (
            <p className="signin-error">Incorrect email or password.</p>
          )}
          {error?.kind === "google-only" && (
            <p className="signin-error">
              This email signed up with Google. Use &ldquo;Continue with
              Google&rdquo; above.
            </p>
          )}
          {error?.kind === "generic" && (
            <p className="signin-error">{error.message}</p>
          )}

          <button
            type="submit"
            className="btn-accent step-cta"
            style={{ marginTop: 24 }}
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="signin-switch">
          Don&rsquo;t have an account?{" "}
          <Link href="/onboarding" className="signin-switch-link">
            Start your free trial
          </Link>
        </p>
      </div>
    </div>
  );
}
