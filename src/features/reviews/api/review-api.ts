import axiosInstance from "@/lib/axiosInstance";
import type {
  Review,
  ReviewStatus,
  ReviewsResponse,
} from "@/features/reviews/types/review";
import type { CreateReviewInput } from "@/features/reviews/validators/review";

const unwrap = (response: any) => response.data?.data ?? response.data;

export const getProductReviews = async (
  productId: number,
  params: { page?: number; limit?: number } = {}
): Promise<ReviewsResponse> => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));

  const response = await axiosInstance.get(
    `/products/${productId}/reviews${query.toString() ? `?${query}` : ""}`
  );
  return unwrap(response);
};

export const submitProductReview = async (
  productId: number,
  data: CreateReviewInput
): Promise<Review> => {
  const response = await axiosInstance.post(
    `/products/${productId}/reviews`,
    data
  );
  return unwrap(response).review;
};

export const deleteMyProductReview = async (productId: number) => {
  await axiosInstance.delete(`/products/${productId}/reviews`);
};

/* ------------------------------------------------------------------ admin */

export const getAdminReviews = async (params: {
  page?: number;
  limit?: number;
  status?: ReviewStatus;
  search?: string;
}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });

  const response = await axiosInstance.get(
    `/reviews${query.toString() ? `?${query}` : ""}`
  );
  return unwrap(response) as {
    reviews: Review[];
    pendingCount: number;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
};

export const setAdminReviewStatus = async (
  id: number,
  status: ReviewStatus
): Promise<Review> => {
  const response = await axiosInstance.patch(`/reviews/${id}/status`, {
    status,
  });
  return unwrap(response).review;
};

export const deleteAdminReview = async (id: number) => {
  await axiosInstance.delete(`/reviews/${id}`);
};
