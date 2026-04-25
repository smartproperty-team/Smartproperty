type RoutePrefetchRule = {
  key: string;
  match: (path: string) => boolean;
  load: () => Promise<unknown>;
};

const prefetchedChunks = new Set<string>();

const routePrefetchRules: RoutePrefetchRule[] = [
  {
    key: "dashboard",
    match: (path) => path === "/dashboard",
    load: () => import("../pages/dashboard/DashboardPage"),
  },
  {
    key: "verification",
    match: (path) => path === "/verification",
    load: () => import("../pages/dashboard/VerificationPage"),
  },
  {
    key: "admin-verification",
    match: (path) => path === "/super-administrator/verifications",
    load: () => import("../pages/dashboard/AdminVerificationPage"),
  },
  {
    key: "admin-users",
    match: (path) => path === "/super-administrator/users",
    load: () => import("../pages/dashboard/AdminUsersPage"),
  },
  {
    key: "branch-manager-agencies",
    match: (path) => path === "/branch-manager/agencies",
    load: () => import("../pages/dashboard/BranchManagerAgenciesPage"),
  },
  {
    key: "branch-manager-agency-onboarding",
    match: (path) => path === "/branch-manager/agencies/new",
    load: () => import("../pages/dashboard/BranchManagerAgencyOnboardingPage"),
  },
  {
    key: "properties-list",
    match: (path) => path === "/properties",
    load: () => import("../pages/properties/PropertiesPage"),
  },
  {
    key: "properties-mine",
    match: (path) => path === "/properties/mine",
    load: () => import("../pages/properties/MyPropertiesPage"),
  },
  {
    key: "property-detail",
    match: (path) => /^\/properties\/[^/]+$/.test(path),
    load: () => import("../pages/properties/PropertyDetailPage"),
  },
  {
    key: "property-form",
    match: (path) =>
      path === "/properties/new" || /^\/properties\/[^/]+\/edit$/.test(path),
    load: () => import("../pages/properties/PropertyFormPage"),
  },
  {
    key: "settings",
    match: (path) =>
      path === "/settings" || path === "/profile" || path === "/security/2fa",
    load: () => import("../pages/settings/SettingsPage"),
  },
  {
    key: "maintenance-new",
    match: (path) => path === "/maintenance/requests/new",
    load: () => import("../pages/maintenance/MaintenanceRequestFormPage"),
  },
  {
    key: "maintenance-mine",
    match: (path) => path === "/maintenance/requests/mine",
    load: () => import("../pages/maintenance/MyMaintenanceRequestsPage"),
  },
  {
    key: "maintenance-assigned",
    match: (path) => path === "/maintenance/requests/assigned",
    load: () => import("../pages/maintenance/ServiceProviderMaintenancePage"),
  },
];

function normalizePath(path: string): string {
  return path.split(/[?#]/)[0] || "/";
}

export function prefetchRoute(path: string): void {
  const normalizedPath = normalizePath(path);

  for (const rule of routePrefetchRules) {
    if (!rule.match(normalizedPath)) {
      continue;
    }

    if (prefetchedChunks.has(rule.key)) {
      continue;
    }

    prefetchedChunks.add(rule.key);

    void rule.load().catch(() => {
      prefetchedChunks.delete(rule.key);
    });
  }
}
