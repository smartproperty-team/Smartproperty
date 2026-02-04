import AdminDashboard from "../pages/dashboards/AdminDashboard";
import AgentDashboard from "../pages/dashboards/AgentDashboard";
import ManagerDashboard from "../pages/dashboards/ManagerDashboard";
import OwnerDashboard from "../pages/dashboards/OwnerDashboard";
import TenantDashboard from "../pages/dashboards/TenantDashboard";
import { useAuthStore } from "../store/authStore";

export default function RoleBasedDashboard() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  if (!hasHydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  switch (user.role) {
    case "admin":
      return <AdminDashboard />;
    case "owner":
      return <OwnerDashboard />;
    case "tenant":
      return <TenantDashboard />;
    case "manager":
      return <ManagerDashboard />;
    case "agent":
      return <AgentDashboard />;
    default:
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 text-center">
            <h2 className="text-white text-2xl font-bold mb-4">
              Role Not Configured
            </h2>
            <p className="text-white/60">
              Your account role ({user.role}) does not have a dashboard yet.
            </p>
          </div>
        </div>
      );
  }
}
