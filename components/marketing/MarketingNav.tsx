"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { track } from "@vercel/analytics";

interface MarketingNavProps {
  showDashboard?: boolean;
  dashboardHref?: string;
}

export default function MarketingNav({
  showDashboard = false,
  dashboardHref = "/dashboard",
}: MarketingNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="mk-nav" role="banner">
      <div className="mk-container mk-nav__inner">
        {/* Logo */}
        <Link href="/" className="mk-nav__logo" aria-label="VerityFlow home">
          <Image
            src="/logo/verityflow-icon.png"
            alt="VerityFlow"
            width={32}
            height={32}
            style={{ borderRadius: 8 }}
          />
          <span className="mk-nav__wordmark">VerityFlow</span>
        </Link>

        {/* Desktop center links */}
        <nav className="mk-nav__links" aria-label="Site navigation">
          <a href="#features" className="mk-nav__link">Features</a>
          <a href="#pricing" className="mk-nav__link">Pricing</a>
          <a href="#faq" className="mk-nav__link">FAQ</a>
        </nav>

        {/* Desktop right actions */}
        <div className="mk-nav__actions">
          {showDashboard ? (
            <Link href={dashboardHref} className="mk-nav__dashboard-pill">
              <LayoutDashboard size={15} aria-hidden="true" />
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/onboarding?signin=1" className="mk-nav__signin">
                Sign in
              </Link>
              <Link
                href="/onboarding"
                className="mk-nav__cta"
                onClick={() => track("cta_clicked", { location: "nav" })}
              >
                Start free trial
              </Link>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button
          type="button"
          className="mk-hamburger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mk-mobile-menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          id="mk-mobile-menu"
          className="mk-nav__mobile-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <nav
            className="mk-nav__mobile-links"
            aria-label="Mobile site navigation"
          >
            <a href="#features" className="mk-nav__mobile-link" onClick={closeMenu}>
              Features
            </a>
            <a href="#pricing" className="mk-nav__mobile-link" onClick={closeMenu}>
              Pricing
            </a>
            <a href="#faq" className="mk-nav__mobile-link" onClick={closeMenu}>
              FAQ
            </a>
            <hr className="mk-nav__mobile-divider" aria-hidden="true" />
            {showDashboard ? (
              <Link
                href={dashboardHref}
                className="mk-nav__mobile-link"
                onClick={closeMenu}
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/onboarding?signin=1"
                  className="mk-nav__mobile-link"
                  onClick={closeMenu}
                >
                  Sign in
                </Link>
                <div style={{ paddingTop: 12 }}>
                  <Link
                    href="/onboarding"
                    className="mk-btn-primary"
                    style={{ display: "flex", justifyContent: "center" }}
                    onClick={() => {
                      track("cta_clicked", { location: "nav_mobile" });
                      closeMenu();
                    }}
                  >
                    Start free trial →
                  </Link>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
