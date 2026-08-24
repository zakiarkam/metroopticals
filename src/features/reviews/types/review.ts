export type ReviewStatus = "PENDING" | "PUBLISHED" | "REJECTED";

export interface ReviewAuthor {
  id: number;
  name: string | null;
}

export interface Review {
  id: number;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
  productId: number;
  userId: number;
  user?: ReviewAuthor | null;
  product?: { id: number; title: string; images: string[] } | null;
}

/** Star histogram plus the headline numbers shown above a review list. */
export interface ReviewSummary {
  average: number | null;
  total: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ReviewsResponse {
  reviews: Review[];
  summary: ReviewSummary;
  /** The signed-in customer's own review, whatever its status. */
  mine?: Review | null;
  canReview?: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
