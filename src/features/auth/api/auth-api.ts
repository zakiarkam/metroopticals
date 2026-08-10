import axiosInstance from "@/lib/axiosInstance";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
}

export interface AuthResponse {
  token?: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    avatar?: string;
    createdAt: string;
  };
  message?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface SessionResponse {
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    image?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    createdAt?: string;
    provider?: string;
  };
}

export const authApi = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>(
      "/auth/signup",
      data
    );
    return response.data;
  },

  verifyToken: async (): Promise<{
    valid: boolean;
    user?: AuthResponse["user"];
  }> => {
    const response = await axiosInstance.get("/auth/verify");
    return response.data;
  },

  changePassword: async (
    data: ChangePasswordData
  ): Promise<{ message: string }> => {
    const response = await axiosInstance.patch<{ message: string }>(
      "/auth/change-password",
      data
    );
    return response.data;
  },

  resetPassword: async (
    data: ResetPasswordData
  ): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>(
      "/auth/reset-password",
      data
    );
    return response.data;
  },

  forgotPassword: async (
    data: ForgotPasswordData
  ): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>(
      "/auth/forgot-password",
      data
    );
    return response.data;
  },

  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>(
      "/auth/forgot-password",
      { email }
    );
    return response.data;
  },

  getSession: async (): Promise<SessionResponse> => {
    const response = await axiosInstance.get<SessionResponse>("/auth/session");
    return response.data;
  },
};

export const adminAuthApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>(
      "/auth/admin/login",
      credentials
    );
    return response.data;
  },

  logout: async (): Promise<void> => {
    await axiosInstance.post("/auth/admin/logout");
  },
};
