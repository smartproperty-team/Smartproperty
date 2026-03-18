import { LanguageToggle } from "@/components/ui";
import { useTranslation } from "@/i18n";
import { notificationService } from "@/services";
import type { Notification } from "@/services/notification.service";
import { useAuthStore, usePreferencesStore } from "@/store";
import { isOwner, isTenant } from "@/utils";
import {
  BellRing,
  ChevronDown,
  LogOut,
  Menu,
  Monitor,
  Settings,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ReadAloudWidget from "../accessibility/ReadAloudWidget";

export default function HomeNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { getUserPreferences, openOnboarding } = usePreferencesStore();
  const t = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { to: "/", label: t.nav.home, hasDropdown: true },
    { to: "/properties", label: t.nav.listings, hasDropdown: true },
    { to: "/pages", label: t.nav.pages, hasDropdown: true },
    { to: "/blog", label: t.nav.blog, hasDropdown: true },
    { to: "/contact", label: t.nav.contact, hasDropdown: false },
  ];

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
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
  }, [user]);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void fetchNotifications();
    }, 0);

    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userPreferences = user ? getUserPreferences(user.id) : null;
  const showPreferencesReminder =
    isAuthenticated &&
    !!user &&
    isTenant(user) &&
    !!userPreferences &&
    !userPreferences.completed &&
    userPreferences.skipped;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setShowNotifPanel(false);
        setShowUserDropdown(false);
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
      {showPreferencesReminder && (
        <button
          type="button"
          onClick={openOnboarding}
          className="fixed right-6 top-20 z-50 flex animate-bounce items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-200 hover:bg-red-700"
        >
          <BellRing className="h-4 w-4" />
          {t.nav.completeQuestions}
        </button>
      )}
      <nav
        className="fixed inset-x-0 top-0 z-40 border-b border-white/20 bg-[#1A3263] shadow-[0_10px_28px_rgba(20,40,79,0.38)] backdrop-blur"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white transition-colors hover:text-[#FFC570]"
            aria-label="Smart Property - Home"
          >
            <svg
              className="h-7 w-7"
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
            <span className="whitespace-nowrap text-xl font-extrabold tracking-[0.01em]">
              Smart Property
            </span>
          </Link>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 text-white transition-colors hover:bg-white/10 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="hidden items-center gap-3 md:flex" role="menubar">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[15px] font-semibold tracking-[0.01em] transition-colors ${
                    isActive
                      ? "bg-[#FFC570] text-[#1A3263]"
                      : "text-white/95 hover:bg-white/10 hover:text-white"
                  }`}
                  role="menuitem"
                  aria-current={isActive ? "page" : undefined}
                >
                  <span>{link.label}</span>
                  {link.hasDropdown && (
                    <ChevronDown
                      size={15}
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-2.5 md:flex">
            <ReadAloudWidget
              mode="inline"
              showLabel={false}
              className="rounded-full border border-white/25 bg-white/10 px-1.5 text-white"
            />

            {user ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#FFC570] bg-[#FFC570] px-2.5 py-1.5 text-[#1A3263] transition-colors hover:bg-[#f2b75e]"
                  aria-label={`Account: ${user.fullName || user.firstName}`}
                  aria-expanded={showUserDropdown}
                  aria-haspopup="menu"
                  aria-controls="user-menu"
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/75 text-[#1A3263]">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.fullName || user.firstName || "User avatar"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <span className="hidden max-w-32 truncate text-[13px] font-bold text-[#1A3263] sm:inline">
                    {user.fullName || user.firstName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-[#1A3263]" />
                </button>

                {showUserDropdown && (
                  <div
                    id="user-menu"
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                  >
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {user.fullName || user.firstName}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate("/profile");
                      }}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <span className="mr-3 flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-indigo-600">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={
                              user.fullName || user.firstName || "User avatar"
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                      </span>
                      {t.nav.profile}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate("/dashboard");
                      }}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Monitor className="mr-3 h-4 w-4" />
                      {t.nav.dashboard}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate("/settings");
                      }}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      {t.nav.settings}
                    </button>
                    <div className="border-t border-gray-100">
                      <button
                        type="button"
                        onClick={async () => {
                          setShowUserDropdown(false);
                          await logout();
                          navigate("/login");
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        {t.nav.signOut}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#FFC570] bg-[#FFC570] text-[#1A3263] transition-colors hover:bg-[#f2b75e]"
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
            )}

            {user && (
              <div className="relative" ref={notifPanelRef}>
                <button
                  type="button"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/45 bg-white/15 text-white transition-colors hover:bg-white/25"
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                  title="Notifications"
                  onClick={() => setShowNotifPanel(!showNotifPanel)}
                  aria-expanded={showNotifPanel}
                  aria-controls="notifications-panel"
                  aria-haspopup="dialog"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifPanel && (
                  <div
                    id="notifications-panel"
                    className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[#547792]/30 bg-white shadow-xl"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                      <h3 className="text-sm font-semibold text-[#1A3263]">
                        {t.nav.notifications}
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#1A3263] hover:text-[#547792]"
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
                        <div className="flex flex-col items-center gap-2 p-5 text-[#547792]">
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            aria-hidden="true"
                          >
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
                          <p className="text-sm">{t.nav.noNotifications}</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            type="button"
                            key={n.id}
                            className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-palette-background ${
                              !n.isRead ? "bg-[#EFD2B0]/45" : "bg-white"
                            }`}
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
                            aria-label={`Notification: ${n.title}`}
                          >
                            <div className="pt-0.5 text-base">
                              {n.type === "verification_approved"
                                ? "✅"
                                : n.type === "verification_rejected"
                                  ? "❌"
                                  : "🔔"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#1A3263]">
                                {n.title}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-[#547792]">
                                {n.message}
                              </p>
                              <span className="mt-1 inline-block text-[11px] text-gray-500">
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
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isOwner(user) && (
              <Link
                to="/properties/new"
                className="inline-flex items-center gap-2 rounded-full bg-[#FFC570] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#1A3263] transition-colors hover:bg-[#f2b75e]"
              >
                <span>ADD LISTING</span>
                <span aria-hidden="true">+</span>
              </Link>
            )}

            <LanguageToggle
              variant="pill"
              className="border-white/55 bg-white/10 text-white hover:border-[#FFC570] hover:bg-white/20 hover:text-[#FFC570]"
            />
          </div>
        </div>

        <div
          id="mobile-menu"
          ref={mobileMenuRef}
          className={`overflow-hidden border-t border-white/20 bg-[#1A3263] transition-all duration-300 md:hidden ${
            mobileMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
          aria-hidden={!mobileMenuOpen}
        >
          <div className="space-y-1 px-4 py-3 sm:px-6">
            {navLinks.map((link) => (
              <Link
                key={`mobile-${link.to}`}
                to={link.to}
                className="block rounded-lg px-3 py-2.5 text-base font-semibold text-white/95 transition-colors hover:bg-white/10 hover:text-[#FFC570]"
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
