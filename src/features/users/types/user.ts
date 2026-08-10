export type UserRole = "ADMIN" | "CUSTOMER" | "SUPER_ADMIN";

export type CustomerType =
  | "END_USER"
  | "WHOLESALER"
  | "RESELLER"
  | "INSTALLER"
  | "PROJECTS"
  | "COMPANY";

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  END_USER: "End User",
  WHOLESALER: "Whole Seller",
  RESELLER: "Reseller",
  INSTALLER: "Installer",
  PROJECTS: "Projects",
  COMPANY: "Company",
};

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  customerType: CustomerType;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  image: string | null;
  createdAt: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  image?: string;
};

export type UpdateUserInput = Partial<CreateUserInput>;

export type UserQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
};

export type UsersResponse = {
  items: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};
