import axiosInstance from "@/lib/axiosInstance";
import type { BlockData } from "@/features/site-content/types/site-content";

export interface AdminBlock {
  key: string;
  data: BlockData;
  updatedAt: string | null;
  customised: boolean;
}

export const getSiteContentBlocks = async (): Promise<AdminBlock[]> => {
  const response = await axiosInstance.get("/site-content");
  const payload = response.data?.data ?? response.data;
  return payload?.blocks ?? [];
};

export const saveSiteContentBlock = async (
  key: string,
  data: BlockData
): Promise<AdminBlock> => {
  const response = await axiosInstance.put(
    `/site-content/${encodeURIComponent(key)}`,
    { data }
  );
  const payload = response.data?.data ?? response.data;
  return payload.block;
};

export const resetSiteContentBlock = async (
  key: string
): Promise<AdminBlock> => {
  const response = await axiosInstance.delete(
    `/site-content/${encodeURIComponent(key)}`
  );
  const payload = response.data?.data ?? response.data;
  return payload.block;
};
