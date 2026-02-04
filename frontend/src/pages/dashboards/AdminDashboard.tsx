import {
  AlertTriangle,
  Building2,
  CheckCircle,
  DollarSign,
  FileText,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [stats] = useState({
    totalUsers: 1248,
    totalProperties: 342,
    activeLeases: 285,
    monthlyRevenue: 1250000,
    newUsers: 24,
    pendingApprovals: 12,
  });

  const recentActivities = [
    {
      id: 1,
      type: "user",
      message: "New user registered: John Doe",
      time: "5 min ago",
      status: "info",
    },
    {
      id: 2,
      type: "property",
      message: "New property listed in Downtown",
      time: "12 min ago",
      status: "success",
    },
    {
      id: 3,
      type: "issue",
      message: "Maintenance request flagged as urgent",
      time: "20 min ago",
      status: "warning",
    },
    {
      id: 4,
      type: "payment",
      message: "Payment received: $2,500",
      time: "1 hour ago",
      status: "success",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-white/60">
            Manage and monitor the entire platform
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-green-400 text-sm font-medium">
                +{stats.newUsers} today
              </span>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Total Users</h3>
            <p className="text-3xl font-bold text-white">
              {stats.totalUsers.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Building2 className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-white/60 text-sm">Active</span>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Properties</h3>
            <p className="text-3xl font-bold text-white">
              {stats.totalProperties}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <FileText className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-white/60 text-sm">Current</span>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Active Leases</h3>
            <p className="text-3xl font-bold text-white">
              {stats.activeLeases}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-green-400 text-sm font-medium">+12%</span>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Monthly Revenue</h3>
            <p className="text-3xl font-bold text-white">
              ${(stats.monthlyRevenue / 1000).toFixed(0)}K
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-6">
              Recent Activities
            </h2>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                >
                  <div
                    className={`p-2 rounded-lg ${
                      activity.status === "success"
                        ? "bg-green-500/20"
                        : activity.status === "warning"
                          ? "bg-yellow-500/20"
                          : "bg-blue-500/20"
                    }`}
                  >
                    {activity.status === "success" && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                    {activity.status === "warning" && (
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    )}
                    {activity.status === "info" && (
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.message}</p>
                    <p className="text-white/40 text-xs mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-4 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl transition-all text-white">
                <Users className="w-5 h-5" />
                <span>Manage Users</span>
              </button>
              <button className="w-full flex items-center gap-3 p-4 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl transition-all text-white">
                <Building2 className="w-5 h-5" />
                <span>Review Properties</span>
              </button>
              <button className="w-full flex items-center gap-3 p-4 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-xl transition-all text-white">
                <AlertTriangle className="w-5 h-5" />
                <span>Pending Approvals ({stats.pendingApprovals})</span>
              </button>
              <button className="w-full flex items-center gap-3 p-4 bg-green-500/20 hover:bg-green-500/30 rounded-xl transition-all text-white">
                <DollarSign className="w-5 h-5" />
                <span>Financial Reports</span>
              </button>
              <button className="w-full flex items-center gap-3 p-4 bg-slate-500/20 hover:bg-slate-500/30 rounded-xl transition-all text-white">
                <Settings className="w-5 h-5" />
                <span>System Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
