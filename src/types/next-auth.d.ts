import "next-auth";

declare module "next-auth" {
  interface User {
    id: number;
    email: string;
    name: string;
    role: "ADMIN" | "CUSTOMER" | "SUPER_ADMIN";
    customerType?: string | null;
    createdAt?: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    postalCode?: string | null;
    provider?: string | null;
  }

  interface Session {
    user: {
      id: number;
      email: string;
      name: string;
      role: "ADMIN" | "CUSTOMER" | "SUPER_ADMIN";
      customerType?: string | null;
      createdAt?: string;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      country?: string | null;
      postalCode?: string | null;
      provider?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number;
    email: string;
    name: string;
    role: "ADMIN" | "CUSTOMER" | "SUPER_ADMIN";
    customerType?: string | null;
    createdAt?: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    postalCode?: string | null;
    provider?: string | null;
    refreshedAt?: number;
  }
}
