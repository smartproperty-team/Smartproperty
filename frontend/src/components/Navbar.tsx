import { LogIn, LogOut, Menu, UserCircle, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Properties", to: "/properties" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium transition ${
    isActive ? "text-white" : "text-slate-300 hover:text-white"
  }`;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="gradient-outline">
        <div className="glass-panel">
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                <span className="text-lg font-bold text-white">SP</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  SmartProperty
                </p>
                <p className="text-xs text-slate-400">Real Estate Platform</p>
              </div>
            </Link>

            <div className="hidden items-center gap-2 lg:flex">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClass}>
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white hover:border-blue-500"
                  >
                    <UserCircle className="h-4 w-4" />
                    {user?.firstName || "Dashboard"}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-white hover:border-red-500 hover:text-red-400 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-white hover:border-blue-500"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>

            <button
              className="flex items-center justify-center rounded-lg border border-slate-800 p-2 text-slate-200 lg:hidden"
              onClick={() => setOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </nav>

          {open && (
            <div className="border-t border-slate-800/60 bg-slate-950/80 px-6 py-4 lg:hidden">
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={linkClass}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
                {isAuthenticated ? (
                  <>
                    <NavLink
                      to="/dashboard"
                      className={linkClass}
                      onClick={() => setOpen(false)}
                    >
                      Dashboard
                    </NavLink>
                    <button
                      onClick={() => {
                        handleLogout();
                        setOpen(false);
                      }}
                      className="text-left px-3 py-2 text-sm font-medium text-slate-300 hover:text-red-400 transition"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 pt-3">
                    <Link
                      to="/login"
                      className="rounded-lg border border-slate-800 px-4 py-2 text-center text-sm text-white"
                      onClick={() => setOpen(false)}
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/register"
                      className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-center text-sm font-semibold text-white"
                      onClick={() => setOpen(false)}
                    >
                      Get started
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
