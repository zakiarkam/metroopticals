import axiosInstance from "@/lib/axiosInstance";
import type {
  CreateBrandInput,
  UpdateBrandInput,
} from "@/features/brands/validators/brand";

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  status: string;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

const unwrap = (response: any) => response.data?.data ?? response.data;

export const getBrands = async (includeInactive = false): Promise<Brand[]> => {
  const response = await axiosInstance.get(
    `/brands${includeInactive ? "?includeInactive=true" : ""}`
  );
  return unwrap(response).brands ?? [];
};

export const createBrand = async (data: CreateBrandInput): Promise<Brand> => {
  const response = await axiosInstance.post("/brands", data);
  return unwrap(response).brand;
};

export const updateBrand = async (
  id: number,
  data: UpdateBrandInput
): Promise<Brand> => {
  const response = await axiosInstance.put(`/brands/${id}`, data);
  return unwrap(response).brand;
};

export const deleteBrand = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/brands/${id}`);
};
