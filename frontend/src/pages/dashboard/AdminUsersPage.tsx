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
import { adminUsersService } from "@/services/admin-users.service";
import { useAuthStore } from "@/store";
import { UserRole, UserStatus, type User } from "@/types/auth";
import { canAccessAdminUsers } from "@/utils";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Mail,
  Phone,
  Search,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const ROLE_OPTIONS = Object.values(UserRole);
const STATUS_OPTIONS = Object.values(UserStatus);

const formatRole = (role?: string) => role?.replace(/_/g, " ") || "unknown";
const formatStatus = (status?: string) =>
  status?.replace("_", " ") || "unknown";

const getStatusVariant = (status?: string) => {
  switch (status) {
    case UserStatus.ACTIVE:
      return "bg-green-100 text-green-800";
    case UserStatus.SUSPENDED:
      return "bg-red-100 text-red-800";
    case UserStatus.INACTIVE:
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
};

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [limit, total],
  );

  const loadUsers = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await adminUsersService.listUsers({
        page,
        limit,
        search: search.trim() || undefined,
        role,
        status,
      });
      setUsers(response.users);
      setTotal(response.total);
      setPage(response.page);
    } catch (error: unknown) {
      const text =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to load users.";
      setMessage({ type: "error", text });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [page, limit]);

  const handleSearch = () => {
    setPage(1);
    void loadUsers();
  };

  const handleResetFilters = () => {
    setSearch("");
    setRole("");
    setStatus("");
    setPage(1);
    setTimeout(() => void loadUsers(), 0);
  };

  const handleViewDetails = async (targetUserId: string) => {
    setBusyUserId(targetUserId);
    try {
      const details = await adminUsersService.getUserById(targetUserId);
      setSelectedUser(details);
    } catch (error: unknown) {
      const text =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to load user details.";
      setMessage({ type: "error", text });
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleActive = async (targetUser: User) => {
    const nextStatus =
      targetUser.status === UserStatus.ACTIVE
        ? UserStatus.INACTIVE
        : UserStatus.ACTIVE;

    setBusyUserId(targetUser.id);
    try {
      const updated = await adminUsersService.updateUserStatus(
        targetUser.id,
        nextStatus,
      );
      setUsers((current) =>
        current.map((u) => (u.id === updated.id ? updated : u)),
      );
      if (selectedUser?.id === updated.id) {
        setSelectedUser(updated);
      }
      setMessage({
        type: "success",
        text: `User status changed to ${formatStatus(nextStatus)}.`,
      });
    } catch (error: unknown) {
      const text =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to update user status.";
      setMessage({ type: "error", text });
    } finally {
      setBusyUserId(null);
    }
  };

  const handleChangeRole = async (targetUserId: string, nextRole: UserRole) => {
    setBusyUserId(targetUserId);
    try {
      const updated = await adminUsersService.updateUserRole(
        targetUserId,
        nextRole,
      );
      setUsers((current) =>
        current.map((u) => (u.id === updated.id ? updated : u)),
      );
      if (selectedUser?.id === updated.id) {
        setSelectedUser(updated);
      }
      setMessage({
        type: "success",
        text: `User role changed to ${formatRole(nextRole)}.`,
      });
    } catch (error: unknown) {
      const text =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to update user role.";
      setMessage({ type: "error", text });
    } finally {
      setBusyUserId(null);
    }
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedUser) {
        setSelectedUser(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedUser]);

  if (!canAccessAdminUsers(user)) {
    return null;
  }

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gray-50 pt-16 lg:pt-24">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                User Management
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage users, roles, and account status.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>

          {message && (
            <div className="mb-4">
              <Alert
                type={message.type}
                message={message.text}
                onClose={() => setMessage(null)}
              />
            </div>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="mr-2 h-5 w-5 text-indigo-600" />
                Search & Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Input
                  placeholder="Search name or email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as UserRole | "")
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">All roles</option>
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatRole(option)}
                    </option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as UserStatus | "")
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatStatus(option)}
                    </option>
                  ))}
                </select>
                <select
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                  <Button onClick={handleSearch} className="w-full">
                    Search
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleResetFilters}
                    className="w-full"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-indigo-600" />
                Users ({total})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-gray-600">Loading users...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-600">
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((item) => (
                        <tr key={item.id} className="border-b align-top">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-indigo-600">
                                {item.avatar ? (
                                  <img
                                    src={item.avatar}
                                    alt={item.firstName || "User avatar"}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <UserRound className="h-5 w-5" />
                                )}
                              </div>
                              <span className="max-w-[220px] truncate font-medium text-gray-900">
                                {item.fullName ||
                                  `${item.firstName} ${item.lastName}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            {item.email}
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={item.role}
                              onChange={(event) =>
                                void handleChangeRole(
                                  item.id,
                                  event.target.value as UserRole,
                                )
                              }
                              disabled={
                                busyUserId === item.id || item.id === user?.id
                              }
                              className="rounded-md border border-gray-300 px-2 py-1"
                            >
                              {ROLE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {formatRole(option)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusVariant(item.status)}`}
                            >
                              {formatStatus(item.status)}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleViewDetails(item.id)}
                                isLoading={busyUserId === item.id}
                              >
                                Details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleToggleActive(item)}
                                disabled={
                                  busyUserId === item.id || item.id === user?.id
                                }
                              >
                                {item.status === UserStatus.ACTIVE
                                  ? "Deactivate"
                                  : "Activate"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {selectedUser && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-user-modal-title"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4 border-b border-gray-100 pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <h3
                  id="admin-user-modal-title"
                  className="text-2xl font-semibold text-gray-900"
                >
                  User details
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {selectedUser.fullName ||
                    `${selectedUser.firstName} ${selectedUser.lastName}`}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="mb-1 flex items-center gap-2 font-medium text-gray-800">
                  <UserRound className="h-4 w-4 text-indigo-600" />
                  Name
                </p>
                <p className="text-gray-700">
                  {selectedUser.fullName ||
                    `${selectedUser.firstName} ${selectedUser.lastName}`}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="mb-1 flex items-center gap-2 font-medium text-gray-800">
                  <Mail className="h-4 w-4 text-indigo-600" />
                  Email
                </p>
                <p className="break-all text-gray-700">{selectedUser.email}</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="mb-1 flex items-center gap-2 font-medium text-gray-800">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  Role
                </p>
                <p className="capitalize text-gray-700">
                  {formatRole(selectedUser.role)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="mb-1 flex items-center gap-2 font-medium text-gray-800">
                  <Activity className="h-4 w-4 text-indigo-600" />
                  Status
                </p>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusVariant(selectedUser.status)}`}
                >
                  {formatStatus(selectedUser.status)}
                </span>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="mb-1 flex items-center gap-2 font-medium text-gray-800">
                  <Phone className="h-4 w-4 text-indigo-600" />
                  Phone
                </p>
                <p className="text-gray-700">{selectedUser.phone || "N/A"}</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="mb-1 flex items-center gap-2 font-medium text-gray-800">
                  <CalendarDays className="h-4 w-4 text-indigo-600" />
                  Member since
                </p>
                <p className="text-gray-700">
                  {selectedUser.createdAt
                    ? new Date(selectedUser.createdAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <HomeFooter />
    </>
  );
}
