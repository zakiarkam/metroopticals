import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import ShopDetailsClient from "@/features/products/components/shop-details/ShopDetailsClient";
import { getProductById } from "@/features/products/services/product-service";
import { buildSiteUrl } from "@/lib/seo";
import { normalizeImageArray } from "@/lib/storageUtils";
import type { Product } from "@/features/products/types/product";

const fallbackOgImage = "/images/logo/og-image.png";

const getProduct = cache(async (id: number) => getProductById(id));

const toDescription = (value?: string | null) => {
  if (!value) return "Discover product details, pricing, and availability.";
  const trimmed = value.trim();
  if (!trimmed) return "Discover product details, pricing, and availability.";
  return trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
};

type CategoryLike = NonNullable<Product["category"]> & {
  createdAt: string | Date;
  updatedAt: string | Date;
};

const serializeCategory = (
  category: CategoryLike | null
): Product["category"] => {
  if (!category) return null;
  return {
    ...category,
    createdAt:
      typeof category.createdAt === "string"
        ? category.createdAt
        : (category.createdAt as Date).toISOString(),
    updatedAt:
      typeof category.updatedAt === "string"
        ? category.updatedAt
        : (category.updatedAt as Date).toISOString(),
  };
};

type ShopDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ShopDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId)) {
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
    };
  }

  try {
    const product = await getProduct(productId);
    const description = toDescription(product.description);
    const productUrl = buildSiteUrl(`/shop-details/${product.id}`);
    const images = normalizeImageArray(product.images);
    const ogImages = images.length ? images : [fallbackOgImage];
    const title = `${product.title} | Metro Opticals`;
    const shouldIndex = product.status !== "INACTIVE";

    return {
      title,
      description,
      alternates: {
        canonical: productUrl,
      },
      robots: {
        index: shouldIndex,
        follow: true,
      },
      openGraph: {
        title,
        description,
        type: "website",
        url: productUrl,
        images: ogImages,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImages,
      },
    };
  } catch {
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
    };
  }
}

const ShopDetailsPage = async ({ params }: ShopDetailsPageProps) => {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId)) {
    notFound();
  }

  const product = await getProduct(productId).catch(() => null);

  if (!product) {
    notFound();
  }

  const productUrl = buildSiteUrl(`/shop-details/${product.id}`);
  const images = normalizeImageArray(product.images);
  const offerPrice = product.discountedPrice ?? product.price;
  const availability =
      product.status === "INACTIVE"
      ? "https://schema.org/Discontinued"
      : product.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock";

  const initialProduct: Product = {
    ...product,
    createdAt:
      typeof product.createdAt === "string"
        ? product.createdAt
        : product.createdAt.toISOString(),
    updatedAt:
      typeof product.updatedAt === "string"
        ? product.updatedAt
        : product.updatedAt.toISOString(),
    category: serializeCategory(product.category),
    brand: product.brand ?? null,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: toDescription(product.description),
    image: images.length ? images : [buildSiteUrl(fallbackOgImage)],
    sku: product.slug || undefined,
    brand: {
      "@type": "Brand",
      name: "Metro Opticals",
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "LKR",
      price: offerPrice.toFixed(2),
      availability,
      itemCondition: "https://schema.org/NewCondition",
    },
    aggregateRating:
      typeof product.rating === "number" && product.reviews > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviews,
          }
        : undefined,
  };

  return (
    <>
      <ShopDetailsClient productId={productId} initialProduct={initialProduct} />
      <script
        type="application/ld+json"
        // Structured data for product SEO (JSON-LD).
        // JSON.stringify doesn't escape "<", so a "</script>" inside a product
        // field could otherwise break out of this tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
};

export default ShopDetailsPage;
