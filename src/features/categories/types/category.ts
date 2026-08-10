export type Category = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  description?: string;
  status: "active" | "inactive";
  productCount?: number;
  parentId?: number | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
};

export type CreateCategoryInput = {
  name: string;
  slug: string;
  description?: string;
  status: "active" | "inactive";
  parentId?: number | null;
  image?: string | null;
};

export type ApiCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: number | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    products: number;
  };
};
