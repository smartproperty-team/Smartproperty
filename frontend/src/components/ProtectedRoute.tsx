import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, hasHydrated } = useAuthStore();

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
export default ProtectedRoute;
