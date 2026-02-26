// ===========================================
// SmartProperty - Home Navbar Component
// ===========================================

import {
  BellRing,
  ChevronDown,
  LogOut,
  Monitor,
  Settings,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../../pages/home/home3.css';
import { notificationService } from '@/services';
import type { Notification } from '@/services/notification.service';
import { useAuthStore, usePreferencesStore } from '@/store';
import { canManageProperties } from '@/utils';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/properties', label: 'Listings' },
  { to: '/members', label: 'Members' },
  { to: '/blog', label: 'Blog' },
  { to: '/pages', label: 'Pages' },
  { to: '/contact', label: 'Contact' },
];

export default function HomeNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { getUserPreferences, openOnboarding } = usePreferencesStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
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
    fetchNotifications();
    // Poll every 30 seconds
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userPreferences = user ? getUserPreferences(user.id) : null;
  const showPreferencesReminder =
    isAuthenticated &&
    !!user &&
    !!userPreferences &&
    !userPreferences.completed &&
    userPreferences.skipped;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      mobileMenuRef.current?.querySelector('a')?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <header>
      {showPreferencesReminder && (
        <button
          type="button"
          onClick={openOnboarding}
          className="fixed right-6 top-20 z-90 flex animate-bounce items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-200 hover:bg-red-700"
        >
          <BellRing className="h-4 w-4" />
          Complete your questions
        </button>
      )}
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar-container">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <span className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}>
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
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
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
            {/* User menu */}
            {user ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="navbar-user-btn flex items-center space-x-2"
                  aria-label={`Account: ${user.fullName || user.firstName}`}
                  aria-expanded={showUserDropdown}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="user-name hidden sm:inline">
                    {user.fullName || user.firstName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {user.fullName || user.firstName}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate('/profile');
                      }}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User className="mr-3 h-4 w-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate('/dashboard');
                      }}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Monitor className="mr-3 h-4 w-4" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate('/sessions');
                      }}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Monitor className="mr-3 h-4 w-4" />
                      Active Sessions
                    </button>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate('/settings');
                      }}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      Settings
                    </button>
                    <div className="border-t border-gray-100">
                      <button
                        onClick={async () => {
                          setShowUserDropdown(false);
                          await logout();
                          navigate('/login');
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
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
            )}
            {user && (
              <div className="navbar-notif-wrapper" ref={notifPanelRef}>
                <button
                  className="navbar-notif-btn"
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                  title="Notifications"
                  onClick={() => setShowNotifPanel(!showNotifPanel)}
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
                    <span className="notif-badge">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifPanel && (
                  <div className="notif-panel">
                    <div className="notif-panel-header">
                      <h3>Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          className="notif-mark-all"
                          onClick={async () => {
                            await notificationService.markAllAsRead();
                            await fetchNotifications();
                          }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="notif-panel-list">
                      {notifications.length === 0 ? (
                        <div className="notif-empty">
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
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`notif-item ${!n.isRead ? 'notif-unread' : ''}`}
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
                            <div className="notif-icon">
                              {n.type === 'verification_approved'
                                ? '✅'
                                : n.type === 'verification_rejected'
                                  ? '❌'
                                  : '🔔'}
                            </div>
                            <div className="notif-content">
                              <p className="notif-title">{n.title}</p>
                              <p className="notif-message">{n.message}</p>
                              <span className="notif-time">
                                {new Date(n.createdAt).toLocaleDateString(
                                  'en-US',
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  },
                                )}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {canManageProperties(user) && (
              <Link to="/properties/new" className="btn-add-property">
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
            )}
          </div>
        </div>

        <div
          id="mobile-menu"
          ref={mobileMenuRef}
          className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}
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
