"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import type { ReactNode } from "react";

interface TrackCTAProps {
  location: "hero" | "how_it_works" | "pricing" | "final" | "nav" | "nav_mobile";
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

export default function TrackCTA({
  location,
  href,
  className,
  style,
  children,
}: TrackCTAProps) {
  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={() => {
        track("cta_clicked", { location });
        track("signup_started", { location });
      }}
    >
      {children}
    </Link>
  );
}
