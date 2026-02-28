// ===========================================
// SmartProperty - Navbar Component (Unified)
// Based on JustHome Figma Design
// ===========================================

import { Bell, ChevronDown, LogOut, Menu, Plus, User, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { notificationService } from "@/services";
import type { Notification } from "@/services/notification.service";
import { useAuthStore } from "@/store";
import { isOwner } from "@/utils";
import { useTranslation } from "@/i18n";
import LanguageToggle from "@/components/ui/LanguageToggle";

// Logo Component
const Logo = () => (
  <div className="flex items-center gap-2">
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="text-indigo-600"
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
    <span className="text-xl font-bold text-gray-900">
      Smart <span className="text-indigo-600">Property</span>
    </span>
  </div>
);

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  hasDropdown?: boolean;
}

const NavLink = ({ to, children, hasDropdown }: NavLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-1 px-4 py-2 text-base font-medium transition-colors rounded-full hover:bg-gray-100 ${
        isActive ? "text-indigo-600" : "text-gray-900"
      }`}
    >
      {children}
      {hasDropdown && <ChevronDown className="w-4 h-4" />}
    </Link>
  );
};

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const canAddProperty = isOwner(user);
  const t = useTranslation();

  // ── Notifications ──
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [allNotifs, count] = await Promise.all([
        notificationService.getAll(),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(allNotifs);
      setUnreadCount(count);
    } catch {
      // silently fail
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close notification panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notifPanelRef.current &&
        !notifPanelRef.current.contains(e.target as Node)
      ) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
      <div className="bg-white rounded-full shadow-lg px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          <NavLink to="/" hasDropdown>{t.nav.home}</NavLink>
          <NavLink to="/properties" hasDropdown>{t.nav.listings}</NavLink>
          <NavLink to="/members" hasDropdown>{t.nav.members}</NavLink>
          <NavLink to="/blog" hasDropdown>{t.nav.blog}</NavLink>
          <NavLink to="/pages" hasDropdown>{t.nav.pages}</NavLink>
          <NavLink to="/contact">{t.nav.contact}</NavLink>
        </div>

        {/* Right Side Actions */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Language Toggle */}
          <LanguageToggle variant="pill" />

          {/* Notification Bell (authenticated only) */}
          {isAuthenticated && (
            <div className="relative" ref={notifPanelRef}>
              <button
                onClick={() => setShowNotifPanel(!showNotifPanel)}
                className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                aria-label={`${t.nav.notifications}${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
              >
                <Bell className="w-5 h-5 text-gray-700" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Panel */}
              {showNotifPanel && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">
                      {t.nav.notifications}
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        onClick={async () => {
                          await notificationService.markAllAsRead();
                          await fetchNotifications();
                        }}
                      >
                        {t.nav.markAllRead}
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Bell className="w-8 h-8 mb-2" />
                        <p className="text-sm">{t.nav.noNotifications}</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? "bg-indigo-50/50" : ""}`}
                          onClick={async () => {
                            if (!n.isRead) {
                              await notificationService.markAsRead(n.id);
                              await fetchNotifications();
                            }
                            if (n.link) {
                              navigate(n.link);
                              setShowNotifPanel(false);
                            }
                          }}
                        >
                          <span className="text-lg mt-0.5">
                            {n.type === "verification_approved"
                              ? "✅"
                              : n.type === "verification_rejected"
                                ? "❌"
                                : "🔔"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {n.title}
                            </p>
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {n.message}
                            </p>
                            <span className="text-[11px] text-gray-400 mt-1 block">
                              {new Date(n.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Button */}
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="flex items-center gap-2 h-10 px-3 rounded-full border border-gray-900 hover:bg-gray-100 transition-colors"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.firstName}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span className="text-sm font-medium text-gray-900 hidden xl:inline max-w-30 truncate">
                {user?.fullName || user?.firstName}
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="w-10 h-10 rounded-full border border-gray-900 flex items-center justify-center hover:bg-gray-100 transition-colors"
              aria-label={t.nav.signIn}
            >
              <User className="w-4 h-4" />
            </Link>
          )}

          {/* Logout Button */}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors"
              aria-label={t.nav.signOut}
              title={t.nav.signOut}
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}

          {/* Add Property Button */}
          {canAddProperty && (
            <Link
              to="/properties/new"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-900 font-medium text-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t.nav.addProperty}
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 rounded-full hover:bg-gray-100"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-2 bg-white rounded-3xl shadow-lg p-4">
          <div className="flex flex-col gap-2">
            <NavLink to="/">{t.nav.home}</NavLink>
            <NavLink to="/properties">{t.nav.listings}</NavLink>
            <NavLink to="/members">{t.nav.members}</NavLink>
            <NavLink to="/blog">{t.nav.blog}</NavLink>
            <NavLink to="/pages">{t.nav.pages}</NavLink>
            <NavLink to="/contact">{t.nav.contact}</NavLink>
          </div>

          <hr className="my-4" />

          <div className="flex flex-col gap-3">
            <div className="flex gap-3 flex-wrap">
              {/* Language toggle in mobile */}
              <LanguageToggle variant="pill" className="shrink-0" />
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="flex-1 py-2.5 rounded-full border border-gray-900 font-medium text-center hover:bg-gray-100"
                  >
                    {t.nav.dashboard}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="py-2.5 px-4 rounded-full border border-red-300 text-red-600 font-medium hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex-1 py-2.5 rounded-full border border-gray-900 font-medium text-center hover:bg-gray-100"
                >
                  {t.nav.signIn}
                </Link>
              )}

              {canAddProperty && (
                <Link
                  to="/properties/new"
                  className="flex-1 py-2.5 rounded-full bg-gray-900 text-white font-medium text-center hover:bg-gray-800"
                >
                  {t.nav.addProperty}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
