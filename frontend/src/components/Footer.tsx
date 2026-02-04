import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-800/60 bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="gradient-outline">
          <div className="grid gap-8 rounded-3xl bg-slate-950/80 px-6 py-10 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                  <span className="text-lg font-bold text-white">SP</span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">
                    SmartProperty
                  </p>
                  <p className="text-xs text-slate-400">Real Estate Platform</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-400">
                Manage properties, tenants, payments, and maintenance in one
                intelligent platform built for modern real estate teams.
              </p>
              <div className="mt-4 flex gap-3 text-slate-400">
                <a
                  className="hover:text-white"
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  className="hover:text-white"
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                <a
                  className="hover:text-white"
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  className="hover:text-white"
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Product</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li>
                  <Link className="hover:text-white" to="/properties">
                    Properties
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-white" to="/pricing">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-white" to="/dashboard">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-white" to="/faq">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Company</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li>
                  <Link className="hover:text-white" to="/about">
                    About
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-white" to="/blog">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-white" to="/careers">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-white" to="/contact">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Get in touch</p>
              <div className="mt-4 space-y-3 text-sm text-slate-400">
                <p>support@smartproperty.io</p>
                <p>+1 (415) 555-0132</p>
                <p>500 Market St, San Francisco, CA</p>
              </div>
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300">
                <p className="font-semibold text-white">Weekly digest</p>
                <p className="mt-1">Property insights and market updates.</p>
                <div className="mt-3 flex gap-2">
                  <input
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500"
                    placeholder="Email address"
                  />
                  <button className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white">
                    Join
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        © 2026 SmartProperty. All rights reserved.
      </div>
    </footer>
  );
}
