import {
  AlertCircle,
  Building2,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Home,
  LogOut,
  Users,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [stats] = useState({
    managedProperties: 15,
    totalTenants: 13,
    maintenanceOpen: 5,
    monthlyCollections: 42000,
    vacantUnits: 2,
    leasesExpiring: 3,
  });

  const properties = [
    {
      id: 1,
      name: "Oakwood Apartments",
      units: 12,
      occupied: 10,
      rent: 28000,
      status: "Good",
    },
    {
      id: 2,
      name: "Pine Street Complex",
      units: 8,
      occupied: 8,
      rent: 19200,
      status: "Good",
    },
    {
      id: 3,
      name: "Riverside Homes",
      units: 6,
      occupied: 5,
      rent: 15000,
      status: "Attention",
    },
  ];

  const tasks = [
    {
      id: 1,
      title: "Inspect AC Unit - Building A",
      priority: "High",
      due: "2026-02-05",
    },
    {
      id: 2,
      title: "Collect rent - Unit 204",
      priority: "Medium",
      due: "2026-02-03",
    },
    {
      id: 3,
      title: "Schedule property showing",
      priority: "Low",
      due: "2026-02-10",
    },
    {
      id: 4,
      title: "Process lease renewal",
      priority: "High",
      due: "2026-02-04",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Manager Dashboard
            </h1>
            <p className="text-white/60">
              Oversee properties and coordinate operations
            </p>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Building2 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white/60 text-sm">Managed Properties</h3>
                <p className="text-3xl font-bold text-white">
                  {stats.managedProperties}
                </p>
              </div>
            </div>
            <p className="text-white/40 text-xs">
              {stats.vacantUnits} vacant units
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white/60 text-sm">Total Tenants</h3>
                <p className="text-3xl font-bold text-white">
                  {stats.totalTenants}
                </p>
              </div>
            </div>
            <p className="text-white/40 text-xs">
              {stats.leasesExpiring} leases expiring soon
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <Wrench className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-white/60 text-sm">Open Requests</h3>
                <p className="text-3xl font-bold text-white">
                  {stats.maintenanceOpen}
                </p>
              </div>
            </div>
            <p className="text-white/40 text-xs">2 urgent</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-white/60 text-sm">Collections</h3>
                <p className="text-3xl font-bold text-white">
                  ${(stats.monthlyCollections / 1000).toFixed(0)}K
                </p>
              </div>
            </div>
            <p className="text-green-400 text-xs">96% collected</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Managed Properties */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                Managed Properties
              </h2>
              <div className="space-y-4">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">
                            {property.name}
                          </h3>
                          <p className="text-white/60 text-sm">
                            {property.occupied}/{property.units} units occupied
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          property.status === "Good"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {property.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">
                        Monthly Revenue
                      </span>
                      <span className="text-white font-bold">
                        ${property.rent.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 mt-3">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-purple-600 h-2 rounded-full"
                        style={{
                          width: `${(property.occupied / property.units) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                Today's Tasks
              </h2>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <div
                      className={`p-2 rounded-lg mt-1 ${
                        task.priority === "High"
                          ? "bg-red-500/20"
                          : task.priority === "Medium"
                            ? "bg-yellow-500/20"
                            : "bg-blue-500/20"
                      }`}
                    >
                      <Clock
                        className={`w-4 h-4 ${
                          task.priority === "High"
                            ? "text-red-400"
                            : task.priority === "Medium"
                              ? "text-yellow-400"
                              : "text-blue-400"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-white/40 text-xs">
                          Due: {new Date(task.due).toLocaleDateString()}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            task.priority === "High"
                              ? "text-red-400"
                              : task.priority === "Medium"
                                ? "text-yellow-400"
                                : "text-blue-400"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all">
                      <CheckCircle className="w-5 h-5 text-white/60" />
                    </button>
                  </div>
                ))}
              </div>
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
                  <Building2 className="w-5 h-5" />
                  <span>Inspect Property</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-xl transition-all text-white text-sm">
                  <Wrench className="w-5 h-5" />
                  <span>Maintenance ({stats.maintenanceOpen})</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl transition-all text-white text-sm">
                  <Users className="w-5 h-5" />
                  <span>Tenant Communications</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-green-500/20 hover:bg-green-500/30 rounded-xl transition-all text-white text-sm">
                  <DollarSign className="w-5 h-5" />
                  <span>Rent Collections</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-all text-white text-sm">
                  <FileText className="w-5 h-5" />
                  <span>Generate Report</span>
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Alerts</h2>
              <div className="space-y-3">
                <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-1" />
                    <div>
                      <p className="text-white text-sm font-medium">
                        Urgent Repair
                      </p>
                      <p className="text-white/60 text-xs mt-1">
                        Unit 304 - Water leak
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                  <div className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-yellow-400 mt-1" />
                    <div>
                      <p className="text-white text-sm font-medium">
                        Lease Expiring
                      </p>
                      <p className="text-white/60 text-xs mt-1">
                        {stats.leasesExpiring} leases in 30 days
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                  <div className="flex items-start gap-2">
                    <FileText className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <p className="text-white text-sm font-medium">
                        Pending Approval
                      </p>
                      <p className="text-white/60 text-xs mt-1">
                        2 maintenance quotes
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
