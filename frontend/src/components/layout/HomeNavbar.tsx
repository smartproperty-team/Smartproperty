// ===========================================
// SmartProperty - Home Navbar Component
// ===========================================

import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../../pages/home/home3.css";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/properties", label: "Listings" },
  { to: "/members", label: "Members" },
  { to: "/blog", label: "Blog" },
  { to: "/pages", label: "Pages" },
  { to: "/contact", label: "Contact" },
];

export default function HomeNavbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      mobileMenuRef.current?.querySelector("a")?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header>
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar-container">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <span className={`hamburger ${mobileMenuOpen ? "active" : ""}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          <div className="navbar-links" role="menubar">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav-link ${isActive ? "active" : ""}`}
                  role="menuitem"
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <Link
            to="/"
            className="navbar-logo"
            aria-label="Smart Property - Home"
          >
            <svg
              className="logo-icon-svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="logo-text">Smart Property</span>
          </Link>

          <div className="navbar-actions">
            <a
              href="tel:+6868588666"
              className="navbar-phone"
              aria-label="Call us at +68 685 88666"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>+68 685 88666</span>
            </a>
            <Link
              to="/login"
              className="navbar-user-btn"
              aria-label="User account"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
            <Link to="/add-property" className="btn-add-property">
              <span className="btn-text">Add Property</span>
              <svg
                className="btn-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Link>
          </div>
        </div>

        <div
          id="mobile-menu"
          ref={mobileMenuRef}
          className={`mobile-menu ${mobileMenuOpen ? "open" : ""}`}
          aria-hidden={!mobileMenuOpen}
        >
          <div className="mobile-menu-content">
            {navLinks.map((link) => (
              <Link
                key={`mobile-${link.to}`}
                to={link.to}
                className="mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
