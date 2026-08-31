// Cloudflare R2 public read URL (r2.dev subdomain or custom domain).
const BASE_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "").replace(
  /\/+$/,
  ""
);

const hasProtocol = (value: string) => /^(https?:\/\/|\/\/)/i.test(value);
const hasLeadingSlash = (value: string) => value.startsWith("/");

const shouldUseStorage = (value: string) =>
  value.length > 0 && !hasProtocol(value) && !hasLeadingSlash(value);

type StorageFolder =
  | "product/image"
  | "product/catalogue"
  | "product/tryon-2d"
  | "product/tryon-3d"
  | "category/image"
  | "advertisement/image"
  | "brand/image";

const buildStorageUrl = (folder: StorageFolder, fileName: string) =>
  `${BASE_URL}/${folder}/${fileName}`;

export const getProductImageUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!shouldUseStorage(trimmed)) {
    return trimmed;
  }

  return buildStorageUrl("product/image", trimmed);
};

export const getProductCatalogueUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!shouldUseStorage(trimmed)) {
    return trimmed;
  }

  return buildStorageUrl("product/catalogue", trimmed);
};

export const getCategoryImageUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!shouldUseStorage(trimmed)) {
    return trimmed;
  }

  return buildStorageUrl("category/image", trimmed);
};

export const getAdvertisementImageUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!shouldUseStorage(trimmed)) {
    return trimmed;
  }

  return buildStorageUrl("advertisement/image", trimmed);
};

/** Brand logos, stored in their own bucket folder. */
export const getBrandLogoUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!shouldUseStorage(trimmed)) {
    return trimmed;
  }

  return buildStorageUrl("brand/image", trimmed);
};

/** Transparent front-on cut-out a frame is drawn onto a face with. */
export const getTryOnOverlayUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!shouldUseStorage(trimmed)) {
    return trimmed;
  }

  return buildStorageUrl("product/tryon-2d", trimmed);
};

/** Real-scale 3D model (GLB) of a frame, for the rotating try-on. */
export const getTryOnModelUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!shouldUseStorage(trimmed)) {
    return trimmed;
  }

  return buildStorageUrl("product/tryon-3d", trimmed);
};

export const normalizeImageArray = (values?: (string | null)[] | null) => {
  if (!values || values.length === 0) return [];
  return values
    .map((value) => getProductImageUrl(value))
    .filter((value): value is string => Boolean(value));
};
