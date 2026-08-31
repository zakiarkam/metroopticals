import axiosInstance from "@/lib/axiosInstance";
import type { TryOnAsset, TryOnAssetInput } from "@/features/try-on/types";

export const getTryOnAssets = async (
  productId: number,
  options: { all?: boolean; signal?: AbortSignal } = {},
): Promise<TryOnAsset[]> => {
  const response = await axiosInstance.get<{ assets: TryOnAsset[] }>(
    `/products/${productId}/tryon`,
    { params: options.all ? { all: 1 } : undefined, signal: options.signal },
  );
  return response.data.assets ?? [];
};

export const saveTryOnAsset = async (
  productId: number,
  input: TryOnAssetInput,
): Promise<TryOnAsset> => {
  const response = await axiosInstance.put<{ asset: TryOnAsset }>(
    `/products/${productId}/tryon`,
    input,
  );
  return response.data.asset;
};

export const deleteTryOnAsset = async (
  productId: number,
  colour: string,
): Promise<void> => {
  await axiosInstance.delete(`/products/${productId}/tryon`, {
    data: { colour },
  });
};
