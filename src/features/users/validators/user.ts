import { z } from "zod";

export const userRoleEnum = z.enum(["ADMIN", "CUSTOMER", "SUPER_ADMIN"]);
export const customerTypeEnum = z.enum([
  "END_USER",
  "WHOLESALER",
  "RESELLER",
  "INSTALLER",
  "PROJECTS",
  "COMPANY",
]);

export const adminCreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: userRoleEnum,
  customerType: customerTypeEnum.optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  image: z.string().url().optional(),
});

export const adminUpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: userRoleEnum.optional(),
  customerType: customerTypeEnum.optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  image: z.string().url().optional().nullable(),
});

export const userQuerySchema = z.object({
  search: z.string().optional(),
  role: userRoleEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
