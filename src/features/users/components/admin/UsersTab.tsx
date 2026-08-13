"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";

import DeleteAlertDialog from "@/components/modals/DeleteAlertDialog";
import Pagination from "@/components/ui/pagination";
import { deleteUser } from "@/features/users/api/user-api";
import { User, UserRole, CUSTOMER_TYPE_LABELS } from "@/features/users/types/user";
import { useGetUsersQuery } from "@/store/services/api";
import AddUserDialog from "./modals/AddUserDialog";
import EditUserDialog from "./modals/EditUserDialog";
import UserDetailDialog from "./modals/UserDetailDialog";
import { Toast } from "@/lib/utils/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";

type UsersTabProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  dateRange: string;
};

const UsersTab: React.FC<UsersTabProps> = ({
  searchTerm,
  setSearchTerm,
  dateRange,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { data: session } = useCachedSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const queryParams = useMemo(
    () => ({
      search: searchTerm,
      page: currentPage,
      limit,
      role: roleFilter === "all" ? undefined : roleFilter,
    }),
    [searchTerm, currentPage, limit, roleFilter]
  );

  const {
    data: cachedUsers,
    isLoading,
    error,
    refetch: refetchUsers,
  } = useGetUsersQuery(queryParams);

  const users = useMemo(() => cachedUsers?.items || [], [cachedUsers]);
  const totalPages = cachedUsers?.pagination.pages || 1;
  const totalUsers = cachedUsers?.pagination.total || 0;

  // Debounce search input for smoother UX
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(localSearchTerm);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localSearchTerm, setSearchTerm]);

  useEffect(() => {
    if (!error) return;
    const message =
      (error as any)?.data?.message ||
      (error as any)?.data ||
      (error as any)?.error ||
      "Failed to load users";
    Toast.error(message);
  }, [error]);

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsEditUserDialogOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    const toastId = Toast.loading(`Deleting "${userToDelete.name}"...`);

    try {
      await deleteUser(userToDelete.id);

      Toast.update(toastId, {
        render: "User deleted successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      refetchUsers();
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete user:", error);

      Toast.update(toastId, {
        render:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to delete user. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewDetails = (userId: number) => {
    setSelectedUserId(userId);
    setIsDetailDialogOpen(true);
  };

  const handleUsersChanged = useCallback(() => {
    refetchUsers();
  }, [refetchUsers]);

  const rolePill = (role: UserRole) => {
    if (role === "SUPER_ADMIN") {
      return "bg-purple-100 text-purple-700 border border-purple-300";
    }
    return role === "ADMIN"
      ? "bg-blue-light-5 text-blue border border-blue/20"
      : "bg-green-light-6 text-green border border-green/20";
  };

  const metrics = useMemo(
    () => [
      {
        label: "Total customers",
        value: totalUsers.toString(),
        helper: "+1,204 new",
        tone: "bg-blue-light-5 text-blue",
      },
      {
        label: "Returning rate",
        value: "38%",
        helper: "+4.6 pts",
        tone: "bg-green-light-6 text-green",
      },
      {
        label: "VIP members",
        value: "812",
        helper: "Avg LTV Rs 1,240",
        tone: "bg-yellow-light-4 text-yellow-dark",
      },
      {
        label: "Churn risk",
        value: "6%",
        helper: "-1.1 pts",
        tone: "bg-red-light-6 text-red",
      },
    ],
    [totalUsers]
  );

  const filtered = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSegment =
        roleFilter === "all"
          ? true
          : roleFilter === "ADMIN"
            ? user.role === "ADMIN"
            : user.role === "CUSTOMER";

      const matchesSearch =
        normalized.length === 0 ||
        user.name.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized) ||
        (user.city || user.country || "").toLowerCase().includes(normalized);

      return matchesSegment && matchesSearch;
    });
  }, [users, roleFilter, searchTerm]);

  const rangeLabel = useMemo(() => {
    switch (dateRange) {
      case "7":
        return "past 7 days";
      case "30":
        return "last 30 days";
      case "90":
        return "quarter to date";
      default:
        return "year to date";
    }
  }, [dateRange]);

  // Responsive search and filter controls
  return (
    <div className="space-y-7.5">
      <div className="grid gap-7.5">
        <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1 overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 border-b border-gray-3 px-5 py-4">
            <div>
              <h3 className="text-custom-lg font-semibold text-dark">
                All Users
              </h3>
              <p className="text-custom-xs text-body">
                {totalUsers} total users
              </p>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  className="h-8 w-64 rounded-lg border border-gray-3 bg-gray-1 pl-10 pr-4 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-body pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Role Filter */}
              <div className="flex h-8 items-center rounded-full border border-gray-3 bg-gray-1 p-1">
                {(["all", "ADMIN", "CUSTOMER"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() =>
                      setRoleFilter(filter === "all" ? "all" : filter)
                    }
                    className={`h-7 rounded-full px-3 text-custom-xs font-medium transition ${
                      roleFilter === filter
                        ? "bg-gray-2 text-blue shadow-1"
                        : "text-body hover:text-dark"
                    }`}
                  >
                    {filter === "all"
                      ? "All"
                      : filter === "ADMIN"
                        ? "Admin"
                        : "Customer"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_100px] gap-4 border-b border-gray-3 px-4 sm:px-5 py-3 text-custom-xs uppercase text-body tracking-wide">
                <span>User</span>
                <span>Contact</span>
                <span>Location</span>
                <span>Type</span>
                <span>Role</span>
                <span>Actions</span>
              </div>

              {isLoading ? (
                <div className="px-4 sm:px-5 py-10 text-center text-custom-sm text-body">
                  Loading users...
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-4 sm:px-5 py-10 text-center text-custom-sm text-body">
                  No users found. Create your first user to get started.
                </div>
              ) : (
                filtered.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_100px] gap-4 px-4 sm:px-5 py-4 text-custom-sm border-b border-gray-2 last:border-0 hover:bg-gray-1 transition items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-dark truncate">
                        {user.name}
                      </p>
                      <p className="text-custom-xs text-body truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-custom-xs text-body truncate">
                        {user.phone || "N/A"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-custom-xs text-body truncate">
                        {user.city && user.country
                          ? `${user.city}, ${user.country}`
                          : user.city || user.country || "N/A"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-custom-xs text-body truncate">
                        {CUSTOMER_TYPE_LABELS[user.customerType] || "End User"}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-0.5 text-custom-xs font-medium ${rolePill(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(user.id)}
                        className="text-blue hover:text-blue-dark transition hover:scale-110 active:scale-95"
                        title="View Details"
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M10 4.16667C5.83333 4.16667 2.27499 6.73333 0.833328 10.4167C2.27499 14.1 5.83333 16.6667 10 16.6667C14.1667 16.6667 17.725 14.1 19.1667 10.4167C17.725 6.73333 14.1667 4.16667 10 4.16667Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M10 13.3333C11.841 13.3333 13.3333 11.841 13.3333 10C13.3333 8.15905 11.841 6.66667 10 6.66667C8.15905 6.66667 6.66667 8.15905 6.66667 10C6.66667 11.841 8.15905 13.3333 10 13.3333Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      {isSuperAdmin && (
                        <>
                          <button
                            onClick={() => handleEditClick(user)}
                            className="text-blue hover:text-blue-dark transition hover:scale-110 active:scale-95"
                            title="Edit"
                          >
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="none"
                            >
                              <path
                                d="M14.166 2.5C14.3849 2.28113 14.6447 2.10752 14.9307 1.98906C15.2167 1.87061 15.5232 1.80957 15.8327 1.80957C16.1422 1.80957 16.4487 1.87061 16.7347 1.98906C17.0206 2.10752 17.2805 2.28113 17.4993 2.5C17.7182 2.71887 17.8918 2.97871 18.0103 3.26468C18.1287 3.55064 18.1898 3.85714 18.1898 4.16667C18.1898 4.47619 18.1287 4.78269 18.0103 5.06866C17.8918 5.35462 17.7182 5.61446 17.4993 5.83333L6.24935 17.0833L1.66602 18.3333L2.91602 13.75L14.166 2.5Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="text-red hover:text-red-dark transition hover:scale-110 active:scale-95"
                            title="Delete"
                          >
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="none"
                            >
                              <path
                                d="M2.5 5H4.16667H17.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M15.8333 5V16.6667C15.8333 17.5 15 18.3333 14.1667 18.3333H5.83333C5 18.3333 4.16667 17.5 4.16667 16.6667V5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination */}
          {!isLoading && filtered.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalUsers}
              itemsPerPage={limit}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleLimitChange}
              showItemsPerPage={true}
              itemsPerPageOptions={[6, 12, 24, 48, 96]}
            />
          )}
        </div>
      </div>

      <AddUserDialog
        isOpen={isAddUserDialogOpen}
        onClose={() => setIsAddUserDialogOpen(false)}
        onSuccess={handleUsersChanged}
      />

      <EditUserDialog
        isOpen={isEditUserDialogOpen}
        onClose={() => {
          setIsEditUserDialogOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={handleUsersChanged}
        user={selectedUser}
      />

      <UserDetailDialog
        isOpen={isDetailDialogOpen}
        onClose={() => {
          setIsDetailDialogOpen(false);
          setSelectedUserId(null);
        }}
        userId={selectedUserId}
      />

      <DeleteAlertDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
        itemName={userToDelete?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default UsersTab;
