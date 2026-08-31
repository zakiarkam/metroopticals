export type ProductStatus = "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
export type ProductUnit = "METER" | "PIECES" | "BOX" | "DRUM";

export type FrameShape =
  | "RECTANGLE"
  | "SQUARE"
  | "ROUND"
  | "OVAL"
  | "CAT_EYE"
  | "AVIATOR"
  | "GEOMETRIC"
  | "BROWLINE";

export type RimType = "FULL_RIM" | "SEMI_RIMLESS" | "RIMLESS";

export type Gender = "MEN" | "WOMEN" | "UNISEX" | "KIDS";

export type Brand = {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  status: string;
};

/**
 * One colourway's row, serialised with the product. A null stock means the
 * colour has not been counted (it falls back to the product total); `image`
 * names the gallery photo shown when the colour is picked.
 */
export type ProductColorStock = {
  color: string;
  stock: number | null;
  image?: string | null;
};

export type EyewearSpec = {
  /** mm, width of a single lens */
  lensWidth?: number | null;
  /** mm, gap between the two lenses */
  bridgeWidth?: number | null;
  /** mm, length of the arm */
  templeLength?: number | null;
  /** A frame is often sold in several colourways. */
  frameColors?: string[];
  frameMaterial?: string | null;
  weightGrams?: number | null;
  frameShape?: FrameShape | null;
  rimType?: RimType | null;
  gender?: Gender | null;
};

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
  sku?: string | null;
  /** What a barcode scanner reads at the counter. */
  barcode?: string | null;
  description: string;
  price: number;
  discountedPrice: number | null;
  images: string[];
  catalogueFile: string | null;
  categoryId: number | null;
  brandId?: number | null;
  stock: number;
  /**
   * How the total splits across `frameColors`. Absent on products recorded
   * before per-colour counts existed — their colours are all treated as
   * available while the total is above zero.
   */
  colorStocks?: ProductColorStock[];
  unitType: ProductUnit;
  status: ProductStatus;
  /** Denormalised from published reviews  see Review in the schema. */
  rating: number | null;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  category: ProductCategory | null;
  brand?: Brand | null;
} & EyewearSpec;

export type CreateProductInput = {
  title: string;
  slug: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  images?: string[]; // Array of file names
  catalogueFile?: string | null; // Catalogue file name
  categoryId?: number;
  brandId?: number;
  stock: number;
  /** Per-colour counts; when sent, the product's total becomes their sum. */
  colorStocks?: ProductColorStock[];
  sku?: string | null;
  barcode?: string | null;
  unitType: ProductUnit;
  status: ProductStatus;
} & EyewearSpec;

export type ProductQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  categories?: string[];
  /** Brand slugs. */
  brands?: string[];
  genders?: Gender[];
  shapes?: FrameShape[];
  rimTypes?: RimType[];
  /** Free-text materials, matched case-insensitively. */
  materials?: string[];
  /** Colour names, matched case-insensitively against frameColors. */
  colors?: string[];
  /** Frame size buckets derived from lens width. */
  sizes?: FrameSizeBucket[];
  minPrice?: number;
  maxPrice?: number;
  /** Restrict to products whose discounted price undercuts the list price. */
  onSale?: boolean;
  sortBy?: "createdAt" | "price" | "title";
  sortOrder?: "asc" | "desc";
};

export type FrameSizeBucket = "SMALL" | "MEDIUM" | "LARGE";

/** Lens-width ranges backing each size bucket (mm, inclusive). */
export const FRAME_SIZE_RANGES: Record<
  FrameSizeBucket,
  { min: number; max: number }
> = {
  SMALL: { min: 0, max: 47 },
  MEDIUM: { min: 48, max: 53 },
  LARGE: { min: 54, max: 999 },
};

/** Facet counts returned alongside a product list, for the filter sidebar. */
export type ProductFacets = {
  genders: { value: Gender; count: number }[];
  brands: { value: string; label: string; count: number }[];
  sizes: { value: FrameSizeBucket; count: number }[];
  shapes: { value: FrameShape; count: number }[];
  colors: { value: string; count: number }[];
  materials: { value: string; count: number }[];
  rimTypes: { value: RimType; count: number }[];
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
