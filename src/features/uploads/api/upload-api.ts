import axiosInstance from "@/lib/axiosInstance";

// Types
export interface UploadResponse {
  url?: string;
  urls?: string[];
  filename?: string;
  fileName?: string;
  publicUrl?: string;
  key?: string;
  message?: string;
}

export interface DeleteFileResponse {
  success?: boolean;
  message?: string;
}

export type UploadFolder =
  | "product/image"
  | "product/catalogue"
  | "category/image"
  | "advertisement/image"
  | "brand/image";

// Upload API Service
export const uploadApi = {
  uploadFile: async (
    file: File,
    folder?: string,
    customFileName?: string
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    if (folder) {
      formData.append("folder", folder);
    }
    if (customFileName) {
      formData.append("customFileName", customFileName);
    }

    const response = await axiosInstance.post<UploadResponse>(
      "/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  uploadMultipleFiles: async (
    files: File[],
    folder?: string
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    if (folder) {
      formData.append("folder", folder);
    }

    const response = await axiosInstance.post<UploadResponse>(
      "/upload/multiple",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  deleteFile: async (
    folder: UploadFolder,
    fileName: string
  ): Promise<void> => {
    await axiosInstance.delete("/upload", {
      data: { folder, fileName },
    });
  },

  deleteProductFile: async (
    productId: number,
    type: "image" | "catalogue",
    fileName: string
  ): Promise<void> => {
    await axiosInstance.delete(`/products/${productId}/file`, {
      data: { type, fileName },
    });
  },
};

export default uploadApi;
