import axiosInstance from "@/lib/axiosInstance";
import {
  CreateUserInput,
  User,
  UserQueryParams,
  UsersResponse,
  UpdateUserInput,
} from "@/features/users/types/user";

export const getUsers = async (
  params?: UserQueryParams
): Promise<UsersResponse> => {
  try {
    const queryParams: Record<string, any> = {
      page: params?.page || 1,
      limit: params?.limit || 12,
    };

    if (params?.search) {
      queryParams.search = params.search;
    }

    if (params?.role) {
      queryParams.role = params.role;
    }

    const response = await axiosInstance.get("/admin/users", {
      params: queryParams,
    });

    // Handle the response structure
    return {
      items: response.data.items || [],
      pagination: response.data.pagination || {
        total: 0,
        page: 1,
        limit: 12,
        pages: 1,
      },
    };
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return {
      items: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 12,
        pages: 1,
      },
    };
  }
};

export const getUserById = async (id: number): Promise<User> => {
  const response = await axiosInstance.get(`/admin/users/${id}`);
  return response.data;
};

export type UpdateProfileInput = {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  customerType?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
};

type UserProfileResponse = {
  data: User;
  message?: string;
};

export const getProfile = async (): Promise<UserProfileResponse> => {
  const response = await axiosInstance.get<UserProfileResponse>("/user/profile");
  const payload = response.data as UserProfileResponse | User;
  const data = (payload as UserProfileResponse)?.data ?? (payload as User);
  return { data };
};

export const updateProfile = async (
  data: UpdateProfileInput
): Promise<UserProfileResponse> => {
  const response = await axiosInstance.patch<UserProfileResponse>(
    "/user/profile",
    data
  );
  const payload = response.data as UserProfileResponse | User;
  const updated = (payload as UserProfileResponse)?.data ?? (payload as User);
  return { data: updated };
};

export const createUser = async (data: CreateUserInput): Promise<User> => {
  const response = await axiosInstance.post("/admin/users", data);
  return response.data;
};

export const updateUser = async (
  id: number,
  data: UpdateUserInput
): Promise<User> => {
  const response = await axiosInstance.patch(`/admin/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/admin/users/${id}`);
};

export const userApi = {
  getProfile,
  updateProfile,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
