// ===========================================
// SmartProperty - Unified Settings Page
// ===========================================

import {
  Building2,
  ListChecks,
  Shield,
  SlidersHorizontal,
  UserCog,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppSidebar, HomeFooter } from "../../components/layout";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui";
import SessionsPage from "../../pages/dashboard/SessionsPage";
import { ProfilePage } from "../../pages/profile";
import TwoFactorPage from "../../pages/security/TwoFactorPage";
import { useAuthStore } from "../../store";
import { UserRole } from "../../types/auth";
import { canManageAgencyOnboarding } from "../../utils";
import TenantPreferencesPanel from "./TenantPreferencesPanel";

type SettingsTabId =
  | "account"
  | "security"
  | "sessions"
  | "preferences"
  | "workspace";

type TabDefinition = {
  id: SettingsTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: boolean;
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs = useMemo<TabDefinition[]>(() => {
    const isTenant = user?.role === UserRole.TENANT;
    const canManageWorkspace = canManageAgencyOnboarding(user);

    return [
      {
        id: "account",
        label: "Account",
        icon: UserCog,
        visible: true,
      },
      {
        id: "security",
        label: "Security",
        icon: Shield,
        visible: true,
      },
      {
        id: "sessions",
        label: "Sessions",
        icon: ListChecks,
        visible: true,
      },
      {
        id: "preferences",
        label: "Preferences",
        icon: SlidersHorizontal,
        visible: isTenant,
      },
      {
        id: "workspace",
        label: "Workspace",
        icon: Building2,
        visible: canManageWorkspace,
      },
    ];
  }, [user]);

  const availableTabs = tabs.filter((tab) => tab.visible);
  const requestedTab = searchParams.get("tab") as SettingsTabId | null;
  const activeTab =
    availableTabs.find((tab) => tab.id === requestedTab)?.id ||
    availableTabs[0]?.id ||
    "account";

  useEffect(() => {
    if (!availableTabs.length) {
      return;
    }

    if (
      !requestedTab ||
      !availableTabs.some((tab) => tab.id === requestedTab)
    ) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set("tab", availableTabs[0].id);
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [availableTabs, requestedTab, searchParams, setSearchParams]);

  const selectTab = (tabId: SettingsTabId) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("tab", tabId);
    setSearchParams(nextSearchParams, { replace: true });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "account":
        return <ProfilePage embedded />;
      case "security":
        return <TwoFactorPage embedded />;
      case "sessions":
        return <SessionsPage embedded />;
      case "preferences":
        return <TenantPreferencesPanel />;
      case "workspace":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                  Workspace Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Manage branch-level agency provisioning and operational setup
                  from one place.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => navigate("/branch-manager/agencies")}>
                    My Agencies
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/branch-manager/agencies/new")}
                  >
                    Agency Onboarding
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return <ProfilePage embedded />;
    }
  };

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gray-50 pt-16 lg:pt-24">
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
                Settings
              </h1>
            </div>

            <nav aria-label="Settings tabs" className="flex flex-wrap gap-2">
              {availableTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "border-indigo-200 bg-indigo-50 font-semibold text-indigo-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:bg-indigo-50"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {renderTabContent()}
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
