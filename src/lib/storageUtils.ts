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

/**
 * Advertisement artwork.
 *
 * Ads store one of three shapes in `imageUrl`: a bare R2 file name (uploaded
 * through the admin), a site-relative path (the bundled dummy artwork), or a
 * full URL (pasted in by hand). Only the first needs the bucket prefix.
 */
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

export const normalizeImageArray = (values?: (string | null)[] | null) => {
  if (!values || values.length === 0) return [];
  return values
    .map((value) => getProductImageUrl(value))
    .filter((value): value is string => Boolean(value));
};
