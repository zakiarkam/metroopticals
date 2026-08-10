export type ProductStatus = "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
export type ProductUnit = "METER" | "PIECES" | "BOX" | "DRUM";

export type ProductCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: number;
  title: string;
  slug: string;
  sku?: string;
  description: string;
  price: number;
  discountedPrice: number | null;
  images: string[];
  catalogueFile: string | null;
  categoryId: number | null;
  subcategoryId?: number | null;
  stock: number;
  unitType: ProductUnit;
  status: ProductStatus;
  reviews: number;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  category: ProductCategory | null;
  subcategory?: ProductCategory | null;
};

export type CreateProductInput = {
  title: string;
  slug: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  images?: string[]; // Array of file names
  catalogueFile?: string | null; // Catalogue file name
  categoryId?: number;
  subcategoryId?: number;
  stock: number;
  unitType: ProductUnit;
  status: ProductStatus;
};

export type ProductQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  subcategory?: string;
  subcategories?: string[];
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "createdAt" | "price" | "title";
  sortOrder?: "asc" | "desc";
};

export type ProductsResponse = {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
