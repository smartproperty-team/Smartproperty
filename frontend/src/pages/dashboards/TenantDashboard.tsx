import {
  CreditCard,
  FileText,
  Home,
  LogOut,
  MessageSquare,
  Search,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function TenantDashboard() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [lease] = useState({
    property: "Sunset Villa",
    address: "123 Main St, Downtown",
    monthlyRent: 3500,
    leaseEnd: "2026-12-31",
    nextPayment: "2026-03-01",
    daysUntilPayment: 26,
  });

  const [payments] = useState([
    { id: 1, date: "2026-02-01", amount: 3500, status: "Paid", method: "Card" },
    { id: 2, date: "2026-01-01", amount: 3500, status: "Paid", method: "Card" },
    {
      id: 3,
      date: "2025-12-01",
      amount: 3500,
      status: "Paid",
      method: "Bank Transfer",
    },
  ]);

  const [maintenanceRequests] = useState([
    {
      id: 1,
      title: "Leaking faucet in bathroom",
      status: "In Progress",
      priority: "Medium",
      date: "2026-02-01",
    },
    {
      id: 2,
      title: "AC not cooling properly",
      status: "Completed",
      priority: "High",
      date: "2026-01-25",
    },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Tenant Dashboard
            </h1>
            <p className="text-white/60">Manage your rental and payments</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/20 text-white transition-all"
            >
              <Home className="w-5 h-5" />
            </button>
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white">
              <p className="text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-white/60 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-md rounded-xl border border-red-500/30 text-red-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Lease Info */}
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl border border-white/20 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {lease.property}
              </h2>
              <p className="text-white/80 mb-4">{lease.address}</p>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-white/60 text-sm">Monthly Rent</p>
                  <p className="text-white text-xl font-bold">
                    ${lease.monthlyRent}
                  </p>
                </div>
                <div className="h-12 w-px bg-white/20"></div>
                <div>
                  <p className="text-white/60 text-sm">Lease Ends</p>
                  <p className="text-white text-xl font-bold">
                    {new Date(lease.leaseEnd).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white/10 rounded-xl">
              <Home className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CreditCard className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-white/60 text-sm">Next Payment</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {lease.daysUntilPayment} days
            </p>
            <p className="text-white/40 text-xs mt-1">
              Due on {new Date(lease.nextPayment).toLocaleDateString()}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-white/60 text-sm">Active Lease</h3>
            </div>
            <p className="text-2xl font-bold text-white">310 days</p>
            <p className="text-white/40 text-xs mt-1">Until lease end</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Wrench className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="text-white/60 text-sm">Maintenance</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {maintenanceRequests.length}
            </p>
            <p className="text-white/40 text-xs mt-1">Active requests</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <MessageSquare className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-white/60 text-sm">Messages</h3>
            </div>
            <p className="text-2xl font-bold text-white">3</p>
            <p className="text-white/40 text-xs mt-1">Unread messages</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Payments */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Payment History</h2>
              <button className="text-blue-400 text-sm hover:underline">
                View All
              </button>
            </div>
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <CreditCard className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        ${payment.amount}
                      </p>
                      <p className="text-white/60 text-sm">
                        {new Date(payment.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                      {payment.status}
                    </span>
                    <p className="text-white/40 text-xs mt-1">
                      {payment.method}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all">
              Make a Payment
            </button>
          </div>

          {/* Quick Actions & Maintenance */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl transition-all text-white text-sm">
                  <CreditCard className="w-5 h-5" />
                  <span>Pay Rent</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-xl transition-all text-white text-sm">
                  <Wrench className="w-5 h-5" />
                  <span>Request Maintenance</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl transition-all text-white text-sm">
                  <MessageSquare className="w-5 h-5" />
                  <span>Contact Owner</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-green-500/20 hover:bg-green-500/30 rounded-xl transition-all text-white text-sm">
                  <FileText className="w-5 h-5" />
                  <span>View Lease</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-all text-white text-sm">
                  <Search className="w-5 h-5" />
                  <span>Find New Property</span>
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Maintenance</h2>
              <div className="space-y-3">
                {maintenanceRequests.map((request) => (
                  <div key={request.id} className="p-3 bg-white/5 rounded-xl">
                    <p className="text-white text-sm font-medium">
                      {request.title}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          request.status === "In Progress"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {request.status}
                      </span>
                      <span className="text-white/40 text-xs">
                        {new Date(request.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
