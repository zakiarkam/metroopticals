export type ProductStatus = "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";

export interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  inventory: number;
  price: string;
  status: ProductStatus;
  description: string;
}

export interface ProductRow extends ProductFormData {
  updatedAt: string;
}
