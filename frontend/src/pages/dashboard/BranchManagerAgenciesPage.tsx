import { AppSidebar, HomeFooter } from "@/components/layout";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import {
  agencyOnboardingService,
  type AgencyListItem,
} from "@/services/agency-onboarding.service";
import { useAuthStore } from "@/store";
import { canManageAgencyOnboarding } from "@/utils";
import {
  Building2,
  CalendarDays,
  Mail,
  MapPinned,
  Phone,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
}

export default function BranchManagerAgenciesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [agencies, setAgencies] = useState<AgencyListItem[]>([]);
  const [nameQuery, setNameQuery] = useState("");
  const [regionQuery, setRegionQuery] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<AgencyListItem | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const filteredAgencies = useMemo(() => {
    const normalizedName = nameQuery.trim().toLowerCase();
    const normalizedRegion = regionQuery.trim().toLowerCase();

    return agencies.filter((agency) => {
      const matchesName =
        normalizedName.length === 0 ||
        agency.name.toLowerCase().includes(normalizedName);
      const matchesRegion =
        normalizedRegion.length === 0 ||
        agency.region.toLowerCase().includes(normalizedRegion);

      return matchesName && matchesRegion;
    });
  }, [agencies, nameQuery, regionQuery]);

  const loadAgencies = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await agencyOnboardingService.listMyAgencies();
      setAgencies(response);
    } catch (error: unknown) {
      const text =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to load agencies";
      setMessage({ type: "error", text });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAgencies();
  }, []);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedAgency(null);
      }
    };

    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, []);

  if (!canManageAgencyOnboarding(user)) {
    return null;
  }

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gray-50 pt-16 lg:pt-24">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center text-xl text-gray-900">
                    <Building2 className="mr-2 h-5 w-5 text-indigo-600" />
                    My Agencies
                  </CardTitle>
                  <p className="mt-1 text-sm text-gray-600">
                    Review agencies you created and monitor auto-provisioned
                    role accounts.
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/branch-manager/agencies/new")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Agency
                </Button>
              </div>
            </CardHeader>
          </Card>

          {message && (
            <div className="mb-4">
              <Alert
                type={message.type}
                message={message.text}
                onClose={() => setMessage(null)}
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">
                Agency Listing ({filteredAgencies.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <Input
                  label="Search by name"
                  value={nameQuery}
                  onChange={(event) => setNameQuery(event.target.value)}
                  placeholder="Type agency name"
                  icon={<Search className="h-4 w-4" />}
                />
                <Input
                  label="Filter by region"
                  value={regionQuery}
                  onChange={(event) => setRegionQuery(event.target.value)}
                  placeholder="Type region"
                  icon={<MapPinned className="h-4 w-4" />}
                />
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setNameQuery("");
                      setRegionQuery("");
                    }}
                  >
                    Reset filters
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <p className="text-sm text-gray-600">Loading agencies...</p>
              ) : agencies.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
                  <p className="text-sm text-gray-700">
                    No agencies created yet.
                  </p>
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => navigate("/branch-manager/agencies/new")}
                  >
                    Create your first agency
                  </Button>
                </div>
              ) : filteredAgencies.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
                  <p className="text-sm text-gray-700">
                    No agencies match the current filters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-600">
                        <th className="px-3 py-2">Agency</th>
                        <th className="px-3 py-2">Region</th>
                        <th className="px-3 py-2">Created</th>
                        <th className="px-3 py-2">Members</th>
                        <th className="px-3 py-2">Contact</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAgencies.map((agency) => (
                        <tr key={agency.id} className="border-b align-top">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2 font-medium text-gray-900">
                              <Building2 className="h-4 w-4 text-indigo-600" />
                              {agency.name}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              Slug: {agency.slug}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            <span className="inline-flex items-center gap-1">
                              <MapPinned className="h-3.5 w-3.5 text-gray-400" />
                              {agency.region}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                              {formatDate(agency.createdAt)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-gray-400" />
                              {agency.members?.length || 0}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            {agency.contactEmail || "-"}
                          </td>
                          <td className="px-3 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAgency(agency)}
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        <HomeFooter />
      </div>

      {selectedAgency && (
        <div className="fixed inset-0 z-60">
          <button
            type="button"
            aria-label="Close agency details"
            className="absolute inset-0 bg-black/35"
            onClick={() => setSelectedAgency(null)}
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="agency-details-title"
            className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <h2
                  id="agency-details-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  Agency Details
                </h2>
                <p className="text-sm text-gray-600">{selectedAgency.name}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                onClick={() => setSelectedAgency(null)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Name
                </p>
                <p className="flex items-center gap-2 font-medium text-gray-900">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  {selectedAgency.name}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Region
                  </p>
                  <p className="flex items-center gap-2 text-gray-800">
                    <MapPinned className="h-4 w-4 text-indigo-600" />
                    {selectedAgency.region}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Created
                  </p>
                  <p className="flex items-center gap-2 text-gray-800">
                    <CalendarDays className="h-4 w-4 text-indigo-600" />
                    {formatDate(selectedAgency.createdAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Contact
                </p>
                <div className="space-y-1 text-sm text-gray-800">
                  <p className="flex items-center gap-2 break-all">
                    <Mail className="h-4 w-4 text-indigo-600" />
                    {selectedAgency.contactEmail || "-"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-indigo-600" />
                    {selectedAgency.phone || "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Members ({selectedAgency.members?.length || 0})
                </p>
                {selectedAgency.members && selectedAgency.members.length > 0 ? (
                  <div className="space-y-2">
                    {selectedAgency.members.map((member) => (
                      <div
                        key={`${member.userId}-${member.role}`}
                        className="rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs capitalize text-gray-600">
                          {member.role.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-600">{member.email}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No members recorded.</p>
                )}
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Description
                </p>
                <p className="text-sm text-gray-800">
                  {selectedAgency.description || "-"}
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
