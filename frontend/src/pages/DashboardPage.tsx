import { LogOut, Settings, User } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { logout } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L9 5.414V17a1 1 0 102 0V5.414l6.293 6.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">SmartProperty</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/settings")}
              className="text-slate-400 hover:text-slate-300 transition"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-slate-300 transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Card */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">
                Welcome, {user.firstName}!
              </h2>
              <p className="text-slate-400">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </p>
            </div>
          </div>

          <div className="bg-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Email:</span>
              <span className="text-white font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Full Name:</span>
              <span className="text-white font-medium">
                {user.firstName} {user.lastName}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Role:</span>
              <span className="text-white font-medium capitalize">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-blue-500 transition cursor-pointer">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Properties
            </h3>
            <p className="text-slate-400 text-sm">
              View and manage your properties
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-blue-500 transition cursor-pointer">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M8.16 5.314l4.897-1.596A1 1 0 0114 4.69v4.622a1 1 0 01-.82.983L9.06 11.49a1 1 0 01-.327 0l-4.12-1.195A1 1 0 014 9.312V4.69a1 1 0 01.82-.983l4.34-1.414z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Analytics</h3>
            <p className="text-slate-400 text-sm">
              View your property analytics
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-blue-500 transition cursor-pointer">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Tenants</h3>
            <p className="text-slate-400 text-sm">Manage your tenants</p>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Getting Started
          </h3>
          <p className="text-slate-400 mb-4">
            Welcome to SmartProperty! You have successfully logged in. Here are
            some next steps:
          </p>
          <ul className="space-y-2 text-slate-400">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Complete your profile setup
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Add your first property
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Invite team members
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Set up analytics dashboard
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
