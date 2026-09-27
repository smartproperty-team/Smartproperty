// ===========================================
// SmartProperty - Site footer
// ===========================================

import { Link } from "react-router-dom";

import { useTranslation } from "../../i18n";
import "./HomeFooter.css";

/**
 * Shared footer. Its styles live next to it rather than in the home page
 * stylesheet, so it looks the same on every page that renders it.
 *
 * Only links to routes that exist: the previous About, Contact, Privacy and
 * Terms links, social icons and contact details were placeholders.
 */
export default function HomeFooter() {
  const t = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link to="/" className="site-footer-logo">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            SmartProperty
          </Link>
          <p className="site-footer-tagline">{t.siteFooter.tagline}</p>
        </div>

        <nav className="site-footer-col" aria-labelledby="footer-explore">
          <h2 id="footer-explore">{t.siteFooter.explore}</h2>
          <ul>
            <li>
              <Link to="/properties">{t.siteFooter.allListings}</Link>
            </li>
            <li>
              <Link to="/properties?category=sale">{t.home.forSale}</Link>
            </li>
            <li>
              <Link to="/properties?category=rental">{t.home.forRent}</Link>
            </li>
          </ul>
        </nav>

        <nav className="site-footer-col" aria-labelledby="footer-types">
          <h2 id="footer-types">{t.siteFooter.propertyTypes}</h2>
          <ul>
            <li>
              <Link to="/properties?type=apartment">{t.home.apartment}</Link>
            </li>
            <li>
              <Link to="/properties?type=house">{t.home.house}</Link>
            </li>
            <li>
              <Link to="/properties?type=villa">{t.home.villa}</Link>
            </li>
            <li>
              <Link to="/properties?type=studio">{t.home.studio}</Link>
            </li>
          </ul>
        </nav>

        <nav className="site-footer-col" aria-labelledby="footer-account">
          <h2 id="footer-account">{t.siteFooter.account}</h2>
          <ul>
            <li>
              <Link to="/login">{t.nav.signIn}</Link>
            </li>
            <li>
              <Link to="/register">{t.home.createAccount}</Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="site-footer-bottom">
        <p>
          &copy; {year} SmartProperty. {t.siteFooter.rights}
        </p>
        <nav className="site-footer-legal" aria-label={t.legal.navLabel}>
          <Link to="/privacy">{t.legal.privacy}</Link>
          <Link to="/terms">{t.legal.terms}</Link>
        </nav>
      </div>
    </footer>
  );
}
