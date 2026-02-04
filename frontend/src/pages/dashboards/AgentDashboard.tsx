import {
  Calendar,
  Home,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function AgentDashboard() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [stats] = useState({
    activeListings: 12,
    totalClients: 18,
    viewingsScheduled: 5,
    dealsClosed: 3,
    commission: 15600,
    conversionRate: 24,
  });

  const listings = [
    {
      id: 1,
      property: "Luxury Penthouse",
      location: "Downtown",
      price: 8500,
      views: 145,
      leads: 8,
      status: "Hot",
    },
    {
      id: 2,
      property: "Modern Studio",
      location: "Midtown",
      price: 2200,
      views: 89,
      leads: 5,
      status: "Active",
    },
    {
      id: 3,
      property: "Family House",
      location: "Suburbs",
      price: 4800,
      views: 67,
      leads: 3,
      status: "Active",
    },
    {
      id: 4,
      property: "Beach Condo",
      location: "Coastline",
      price: 6200,
      views: 198,
      leads: 12,
      status: "Hot",
    },
  ];

  const upcomingViewings = [
    {
      id: 1,
      property: "Luxury Penthouse",
      client: "Sarah Johnson",
      time: "2026-02-04 10:00 AM",
    },
    {
      id: 2,
      property: "Beach Condo",
      client: "Mike Davis",
      time: "2026-02-04 02:00 PM",
    },
    {
      id: 3,
      property: "Modern Studio",
      client: "Emily Chen",
      time: "2026-02-05 11:30 AM",
    },
  ];

  const recentLeads = [
    {
      id: 1,
      name: "Alex Turner",
      property: "Family House",
      interest: "High",
      contact: "alex@email.com",
    },
    {
      id: 2,
      name: "Jessica Lee",
      property: "Luxury Penthouse",
      interest: "Medium",
      contact: "jessica@email.com",
    },
    {
      id: 3,
      name: "David Park",
      property: "Beach Condo",
      interest: "High",
      contact: "david@email.com",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Agent Dashboard
            </h1>
            <p className="text-white/60">
              Manage listings, clients, and close deals
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
                <Home className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white/60 text-sm">Active Listings</h3>
                <p className="text-3xl font-bold text-white">
                  {stats.activeListings}
                </p>
              </div>
            </div>
            <p className="text-blue-400 text-xs">+2 this week</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white/60 text-sm">Total Clients</h3>
                <p className="text-3xl font-bold text-white">
                  {stats.totalClients}
                </p>
              </div>
            </div>
            <p className="text-white/40 text-xs">
              {stats.viewingsScheduled} viewings scheduled
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-white/60 text-sm">Deals Closed</h3>
                <p className="text-3xl font-bold text-white">
                  {stats.dealsClosed}
                </p>
              </div>
            </div>
            <p className="text-green-400 text-xs">This month</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <Star className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-white/60 text-sm">Commission</h3>
                <p className="text-3xl font-bold text-white">
                  ${(stats.commission / 1000).toFixed(1)}K
                </p>
              </div>
            </div>
            <p className="text-yellow-400 text-xs">+18% from last month</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Listings */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">My Listings</h2>
                <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all text-sm">
                  + Add Listing
                </button>
              </div>
              <div className="space-y-4">
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-semibold">
                            {listing.property}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              listing.status === "Hot"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {listing.status}
                          </span>
                        </div>
                        <p className="text-white/60 text-sm flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {listing.location}
                        </p>
                      </div>
                      <p className="text-white font-bold text-lg">
                        ${listing.price}/mo
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-white/10">
                      <div>
                        <p className="text-white/40 text-xs">Views</p>
                        <p className="text-white font-semibold">
                          {listing.views}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs">Leads</p>
                        <p className="text-white font-semibold">
                          {listing.leads}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs">Conversion</p>
                        <p className="text-white font-semibold">
                          {((listing.leads / listing.views) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                Recent Leads
              </h2>
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Users className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {lead.name}
                        </p>
                        <p className="text-white/60 text-xs">{lead.property}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          lead.interest === "High"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {lead.interest}
                      </span>
                      <p className="text-white/40 text-xs mt-1 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {lead.contact}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Viewings & Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Upcoming Viewings
              </h2>
              <div className="space-y-3">
                {upcomingViewings.map((viewing) => (
                  <div
                    key={viewing.id}
                    className="p-3 bg-white/5 rounded-xl border border-white/10"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">
                          {viewing.property}
                        </p>
                        <p className="text-white/60 text-xs">
                          {viewing.client}
                        </p>
                      </div>
                    </div>
                    <p className="text-white/40 text-xs ml-6">{viewing.time}</p>
                    <button className="w-full mt-2 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-white text-xs font-medium transition-all">
                      Call Client
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl transition-all text-white text-sm">
                  <Home className="w-5 h-5" />
                  <span>Add New Listing</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl transition-all text-white text-sm">
                  <Calendar className="w-5 h-5" />
                  <span>Schedule Viewing</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-green-500/20 hover:bg-green-500/30 rounded-xl transition-all text-white text-sm">
                  <Phone className="w-5 h-5" />
                  <span>Contact Client</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-xl transition-all text-white text-sm">
                  <TrendingUp className="w-5 h-5" />
                  <span>View Analytics</span>
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl border border-green-500/30 p-6">
              <h3 className="text-white font-bold mb-2">Performance</h3>
              <p className="text-white/80 text-sm mb-4">
                You're in the top 15% of agents this month!
              </p>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/60">Conversion Rate</span>
                    <span className="text-white font-semibold">
                      {stats.conversionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-400 to-emerald-600 h-2 rounded-full"
                      style={{ width: `${stats.conversionRate}%` }}
                    />
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
