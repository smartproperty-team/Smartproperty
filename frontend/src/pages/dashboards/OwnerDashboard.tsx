import {
  Building2,
  DollarSign,
  FileText,
  Home,
  LogOut,
  Plus,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [stats] = useState({
    myProperties: 8,
    totalRevenue: 24500,
    activeTenants: 7,
    occupancyRate: 87.5,
    pendingApplications: 3,
    maintenanceRequests: 2,
  });

  const properties = [
    {
      id: 1,
      name: "Sunset Villa",
      location: "Downtown",
      rent: 3500,
      status: "Rented",
      tenant: "John Smith",
    },
    {
      id: 2,
      name: "Modern Apartment",
      location: "Westside",
      rent: 2800,
      status: "Rented",
      tenant: "Sarah Johnson",
    },
    {
      id: 3,
      name: "Cozy Studio",
      location: "Eastside",
      rent: 1500,
      status: "Available",
      tenant: null,
    },
    {
      id: 4,
      name: "Family House",
      location: "Suburbs",
      rent: 4200,
      status: "Rented",
      tenant: "Mike Davis",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Owner Dashboard
            </h1>
            <p className="text-white/60">Manage your properties and tenants</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all">
              <Plus className="w-5 h-5" />
              Add Property
            </button>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Building2 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white/60 text-sm">My Properties</h3>
                <p className="text-3xl font-bold text-white">
                  {stats.myProperties}
                </p>
              </div>
            </div>
            <div className="text-sm text-white/40">
              {stats.myProperties - stats.activeTenants} available
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-white/60 text-sm">Total Revenue</h3>
                <p className="text-3xl font-bold text-white">
                  ${(stats.totalRevenue / 1000).toFixed(1)}K
                </p>
              </div>
            </div>
            <div className="text-sm text-green-400">+12% this month</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white/60 text-sm">Active Tenants</h3>
                <p className="text-3xl font-bold text-white">
                  {stats.activeTenants}
                </p>
              </div>
            </div>
            <div className="text-sm text-white/40">
              {stats.pendingApplications} pending applications
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-white/60 text-sm">Occupancy Rate</h3>
                <p className="text-3xl font-bold text-white">
                  {stats.occupancyRate}%
                </p>
              </div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 mt-2">
              <div
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full"
                style={{ width: `${stats.occupancyRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Properties List */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-6">My Properties</h2>
            <div className="space-y-4">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <Home className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">
                        {property.name}
                      </h3>
                      <p className="text-white/60 text-sm">
                        {property.location}
                      </p>
                      {property.tenant && (
                        <p className="text-white/40 text-xs mt-1">
                          Tenant: {property.tenant}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">${property.rent}/mo</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                        property.status === "Rented"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {property.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions & Alerts */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl transition-all text-white text-sm">
                  <FileText className="w-5 h-5" />
                  <span>View Applications ({stats.pendingApplications})</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-green-500/20 hover:bg-green-500/30 rounded-xl transition-all text-white text-sm">
                  <DollarSign className="w-5 h-5" />
                  <span>Payment History</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl transition-all text-white text-sm">
                  <Users className="w-5 h-5" />
                  <span>Manage Tenants</span>
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Alerts</h2>
              <div className="space-y-3">
                <div className="p-3 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                  <div className="flex items-start gap-2">
                    <Wrench className="w-5 h-5 text-yellow-400 mt-1" />
                    <div>
                      <p className="text-white text-sm font-medium">
                        Maintenance Requests
                      </p>
                      <p className="text-white/60 text-xs mt-1">
                        {stats.maintenanceRequests} pending requests
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                  <div className="flex items-start gap-2">
                    <FileText className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <p className="text-white text-sm font-medium">
                        Lease Expiring Soon
                      </p>
                      <p className="text-white/60 text-xs mt-1">
                        2 leases in next 30 days
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
