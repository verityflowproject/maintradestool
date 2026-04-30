'use client';

import Link from 'next/link';
import { ChevronLeft, ExternalLink, Eye, EyeOff, Phone, Mail } from 'lucide-react';
import PublicBookingClient from '@/app/book/[slug]/PublicBookingClient';

interface BookingProfile {
  headline: string;
  bio: string;
  services: string[];
  serviceArea: string;
  responseTime: string;
  showPhone: boolean;
  showEmail: boolean;
}

interface Props {
  firstName: string;
  businessName: string;
  tradeEmoji: string;
  slug: string | null;
  bookingEnabled: boolean;
  bookingProfile: BookingProfile;
  phone: string | null;
  email: string | null;
}

export default function BookingPreviewClient({
  firstName,
  businessName,
  tradeEmoji,
  slug,
  bookingEnabled,
  bookingProfile,
  phone,
  email,
}: Props) {
  const liveUrl = slug
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://verityflow.io'}/book/${slug}`
    : null;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-void)' }}>
      {/* Sticky top bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(7,7,12,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--quartz-border)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Link
          href="/settings/booking"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 14,
          }}
        >
          <ChevronLeft size={18} />
          Booking Settings
        </Link>

        <span
          style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: 700,
            fontSize: 15,
            color: 'var(--text-primary)',
          }}
        >
          Preview
        </span>

        {liveUrl ? (
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={!bookingEnabled ? 'Booking is disabled — enable the toggle to make this page live' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 13,
              color: bookingEnabled ? 'var(--accent-text)' : 'var(--text-muted)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            {bookingEnabled ? 'Open live link' : 'Link (disabled)'}
            <ExternalLink size={13} />
          </a>
        ) : (
          <span
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            No link yet
          </span>
        )}
      </div>

      {/* Status chip row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          padding: '12px 16px',
          borderBottom: '1px solid var(--quartz-border)',
          background: 'var(--bg-panel)',
        }}
      >
        {/* Enabled/Disabled chip */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 11,
            fontFamily: 'var(--font-syne)',
            fontWeight: 600,
            background: bookingEnabled ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
            color: bookingEnabled ? '#22c55e' : 'var(--text-muted)',
            border: `1px solid ${bookingEnabled ? 'rgba(34,197,94,0.3)' : 'var(--quartz-border)'}`,
          }}
        >
          {bookingEnabled ? <Eye size={11} /> : <EyeOff size={11} />}
          {bookingEnabled ? 'Booking Enabled' : 'Booking Disabled'}
        </span>

        {/* Slug chip */}
        {slug ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontFamily: 'var(--font-jetbrains)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--quartz-border)',
            }}
          >
            /book/{slug}
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontFamily: 'var(--font-dm-sans)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-muted)',
              border: '1px solid var(--quartz-border)',
            }}
          >
            Not yet published
          </span>
        )}

        {/* Phone visibility */}
        {bookingProfile.showPhone && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontFamily: 'var(--font-dm-sans)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--quartz-border)',
            }}
          >
            <Phone size={10} />
            Phone visible
          </span>
        )}

        {/* Email visibility */}
        {bookingProfile.showEmail && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontFamily: 'var(--font-dm-sans)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--quartz-border)',
            }}
          >
            <Mail size={10} />
            Email visible
          </span>
        )}
      </div>

      {/* The booking page itself */}
      <PublicBookingClient
        slug={slug ?? '__preview__'}
        firstName={firstName}
        businessName={businessName}
        tradeEmoji={tradeEmoji}
        bookingProfile={bookingProfile}
        phone={phone}
        email={email}
        previewMode
      />
    </div>
  );
}
