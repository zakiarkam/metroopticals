import { ProductStatus } from "@/features/products/types/product";

export type ProductFormData = {
  title: string;
  slug: string;
  categoryId: number | null;
  subcategoryId?: number | null;
  stock: number;
  price: number;
  discountedPrice?: number;
  status: ProductStatus;
  description: string;
  images: string[];
  catalogueFile: string | null;
  unitType: "METER" | "PIECES" | "BOX" | "DRUM";
};
