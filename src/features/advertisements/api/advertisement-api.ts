import axiosInstance from "@/lib/axiosInstance";
import {
  Advertisement,
  AdvertisementsResponse,
  CreateAdvertisementInput,
  UpdateAdvertisementInput,
  UpdateAdvertisementStatusInput,
  AdvertisementPlacement,
} from "@/features/advertisements/types/advertisement";

export const getAdvertisements = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
  placement?: AdvertisementPlacement;
}): Promise<AdvertisementsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.placement) queryParams.append("placement", params.placement);

    const response = await axiosInstance.get(
      `/advertisements${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`
    );

    const apiData = response.data;
    const responseData = apiData.data || apiData;

    return {
      advertisements: responseData.advertisements || [],
      pagination: responseData.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      },
    };
  } catch (error) {
    console.error("Error fetching advertisements:", error);
    throw error;
  }
};

export const getAdvertisementById = async (
  id: number
): Promise<Advertisement> => {
  const response = await axiosInstance.get(`/advertisements/${id}`);
  return response.data.data?.advertisement || response.data.advertisement;
};

export const createAdvertisement = async (
  data: CreateAdvertisementInput
): Promise<Advertisement> => {
  const response = await axiosInstance.post("/advertisements", data);
  return response.data.data?.advertisement || response.data.advertisement;
};

export const updateAdvertisement = async (
  id: number,
  data: UpdateAdvertisementInput
): Promise<Advertisement> => {
  const response = await axiosInstance.put(`/advertisements/${id}`, data);
  return response.data.data?.advertisement || response.data.advertisement;
};

export const updateAdvertisementStatus = async (
  id: number,
  data: UpdateAdvertisementStatusInput
): Promise<Advertisement> => {
  const response = await axiosInstance.patch(
    `/advertisements/${id}/status`,
    data
  );
  return response.data.data?.advertisement || response.data.advertisement;
};

export const deleteAdvertisement = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/advertisements/${id}`);
};
