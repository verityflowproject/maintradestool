import Link from "next/link";
import Image from "next/image";

export default function MarketingFooter() {
  return (
    <footer className="mk-footer" role="contentinfo">
      <div className="mk-container mk-footer__inner">
        <div className="mk-footer__brand">
          <Link href="/" className="mk-footer__logo-link" aria-label="VerityFlow home">
            <Image
              src="/logo/verityflow-icon.png"
              alt="VerityFlow"
              width={28}
              height={28}
              style={{ borderRadius: 6 }}
            />
            <span className="mk-footer__wordmark">VerityFlow</span>
          </Link>
          <p className="mk-footer__tagline">Built for the field.</p>
        </div>

        <div className="mk-footer__links">
          <div className="mk-footer__col">
            <p className="mk-footer__col-label">Product</p>
            <a href="#features" className="mk-footer__link">Features</a>
            <a href="#pricing" className="mk-footer__link">Pricing</a>
            <Link href="/feature-board" className="mk-footer__link">Feature board</Link>
          </div>
          <div className="mk-footer__col">
            <p className="mk-footer__col-label">Company</p>
            <Link href="/contact" className="mk-footer__link">Contact</Link>
            <Link href="/legal/privacy" className="mk-footer__link">Privacy</Link>
            <Link href="/legal/terms" className="mk-footer__link">Terms</Link>
          </div>
        </div>
      </div>

      <div className="mk-footer__bottom">
        <div className="mk-container">
          <p>© 2026 VerityFlow. Made for tradespeople. Powered by indie hustle.</p>
        </div>
      </div>
    </footer>
  );
}
