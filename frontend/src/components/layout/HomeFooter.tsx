// ===========================================
// SmartProperty - Home Footer Component
// ===========================================

import { Link } from 'react-router-dom';

export default function HomeFooter() {
  return (
    <footer className="footer">
      <div className="footer-shell">
        <div className="footer-head">
          <div className="footer-logo">
            <svg
              className="logo-icon-svg"
              width="28"
              height="28"
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
          </div>
          <div className="footer-follow">
            <span>FOLLOW US</span>
            <nav className="social-links" aria-label="Social media links">
              <a href="#" aria-label="Facebook" className="social-link">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="#" aria-label="Twitter" className="social-link">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="social-link">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </nav>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-main">
          <div className="footer-section footer-about">
            <h4>Smart Property</h4>
            <p>
              Find your perfect property with Smart Property. We make finding
              your dream home easy and enjoyable.
            </p>
          </div>

          <nav className="footer-section" aria-label="Quick links">
            <h4>Quick Links</h4>
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/properties">Properties</Link>
              </li>
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
            </ul>
          </nav>

          <nav className="footer-section" aria-label="Property types">
            <h4>Property Types</h4>
            <ul>
              <li>
                <Link to="/properties?type=apartment">Apartment</Link>
              </li>
              <li>
                <Link to="/properties?type=villa">Villa</Link>
              </li>
              <li>
                <Link to="/properties?type=house">House</Link>
              </li>
              <li>
                <Link to="/properties?type=office">Office</Link>
              </li>
            </ul>
          </nav>

          <div className="footer-section footer-subscribe">
            <h4>Contact Info</h4>
            <address>
              <ul>
                <li>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  1234 Street Name, City, State
                </li>
                <li>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <a href="tel:+1234567890">+1 234 567 890</a>
                </li>
                <li>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <a href="mailto:info@smartproperty.com">
                    info@smartproperty.com
                  </a>
                </li>
              </ul>
            </address>

            <form
              className="footer-subscribe-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="text"
                id="footer-full-name"
                name="fullName"
                placeholder="Full Name"
                aria-label="Full Name"
              />
              <input
                type="email"
                id="footer-email"
                name="email"
                placeholder="Your@email.com"
                aria-label="Email address"
              />
              <button type="submit">Subscribe</button>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 Smart Property. All rights reserved.</p>
          <nav className="footer-legal" aria-label="Legal links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
