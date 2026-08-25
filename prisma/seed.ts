import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to seed: NODE_ENV is 'production'. The seed data contains known development passwords and must never run against a production database.",
    );
  }

  // ---------- Users ----------
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@metroopticals.lk" },
    update: {},
    create: {
      email: "admin@metroopticals.lk",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const customerPassword = await bcrypt.hash("customer123", 10);
  await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      email: "customer@example.com",
      name: "Test Customer",
      password: customerPassword,
      role: "CUSTOMER",
    },
  });

  // ---------- Brands ----------
  const brandData = [
    { name: "Ray-Ban", slug: "ray-ban" },
    { name: "Oakley", slug: "oakley" },
    { name: "Vogue Eyewear", slug: "vogue-eyewear" },
    { name: "Metro Essentials", slug: "metro-essentials" },
  ];

  const brands: Record<string, { id: number }> = {};
  for (const data of brandData) {
    brands[data.slug] = await prisma.brand.upsert({
      where: { slug: data.slug },
      update: {},
      create: data,
    });
  }

  // ---------- Categories ----------
  const categoryData = [
    {
      name: "Eyeglasses",
      slug: "eyeglasses",
      description: "Prescription frames for everyday wear",
    },
    {
      name: "Sunglasses",
      slug: "sunglasses",
      description: "UV-protective sunglasses, powered and non-powered",
    },
    {
      name: "Contact Lenses",
      slug: "contact-lenses",
      description: "Daily, monthly and coloured contact lenses",
    },
    {
      name: "Reading Glasses",
      slug: "reading-glasses",
      description: "Ready-to-wear readers in a range of powers",
    },
    {
      name: "Accessories",
      slug: "accessories",
      description: "Cases, cleaning kits, chains and lens solutions",
    },
  ];

  const categories: Record<string, { id: number }> = {};
  for (const data of categoryData) {
    categories[data.slug] = await prisma.category.upsert({
      where: { slug: data.slug },
      update: {},
      create: data,
    });
  }

  const products = [
    {
      title: "Classic Black Acetate Frame",
      description:
        "Timeless full-rim acetate frame in matte black. Suits most face shapes and takes single-vision or progressive lenses.",
      price: 8500,
      discountedPrice: 6900,
      stock: 40,
      categorySlug: "eyeglasses",
      unitType: "PIECES" as const,
      brandSlug: "ray-ban",
      gender: "UNISEX" as const,
      frameColors: ["Matte Black", "Tortoise", "Navy"],
      lensWidth: 50,
      bridgeWidth: 17,
      templeLength: 140,
      frameColor: "Matte Black",
      frameMaterial: "Acetate",
      weightGrams: 11,
      frameShape: "RECTANGLE" as const,
      rimType: "FULL_RIM" as const,
    },
    {
      title: "Titanium Rimless Frame",
      description:
        "Ultra-light rimless titanium frame with adjustable nose pads. Barely-there comfort for all-day wear.",
      price: 18500,
      discountedPrice: 15900,
      stock: 20,
      categorySlug: "eyeglasses",
      unitType: "PIECES" as const,
      brandSlug: "metro-essentials",
      gender: "MEN" as const,
      frameColors: ["Gunmetal", "Silver"],
      lensWidth: 52,
      bridgeWidth: 18,
      templeLength: 145,
      frameColor: "Gunmetal",
      frameMaterial: "Titanium",
      weightGrams: 9,
      frameShape: "OVAL" as const,
      rimType: "RIMLESS" as const,
    },
    {
      title: "Blue-Light Computer Glasses",
      description:
        "Anti-glare lenses that filter blue light from screens. Available with or without prescription.",
      price: 6500,
      stock: 60,
      categorySlug: "eyeglasses",
      unitType: "PIECES" as const,
      brandSlug: "vogue-eyewear",
      gender: "UNISEX" as const,
      frameColors: ["Tortoise", "Black", "Crystal"],
      lensWidth: 54,
      bridgeWidth: 16,
      templeLength: 142,
      frameColor: "Tortoise",
      frameMaterial: "TR90",
      weightGrams: 14,
      frameShape: "SQUARE" as const,
      rimType: "FULL_RIM" as const,
    },
    {
      title: "Polarised Aviator Sunglasses",
      description:
        "Metal aviator frame with polarised grey lenses and full UV400 protection.",
      price: 12500,
      discountedPrice: 9900,
      stock: 35,
      categorySlug: "sunglasses",
      unitType: "PIECES" as const,
      brandSlug: "ray-ban",
      gender: "MEN" as const,
      frameColors: ["Gold", "Gunmetal"],
      lensWidth: 58,
      bridgeWidth: 14,
      templeLength: 140,
      frameColor: "Gold",
      frameMaterial: "Metal",
      weightGrams: 24,
      frameShape: "AVIATOR" as const,
      rimType: "FULL_RIM" as const,
    },
    {
      title: "Oversized Cat-Eye Sunglasses",
      description:
        "Bold cat-eye acetate frame with gradient tinted lenses and UV400 protection.",
      price: 9500,
      stock: 25,
      categorySlug: "sunglasses",
      unitType: "PIECES" as const,
      brandSlug: "vogue-eyewear",
      gender: "WOMEN" as const,
      frameColors: ["Havana", "Black", "Rose"],
      lensWidth: 56,
      bridgeWidth: 16,
      templeLength: 145,
      frameColor: "Havana",
      frameMaterial: "Acetate",
      weightGrams: 28,
      frameShape: "CAT_EYE" as const,
      rimType: "FULL_RIM" as const,
    },
    {
      title: "Daily Disposable Contact Lenses (30 Pack)",
      description:
        "Soft hydrogel daily lenses with high oxygen permeability. Box of 30 lenses.",
      price: 4500,
      stock: 100,
      categorySlug: "contact-lenses",
      unitType: "BOX" as const,
    },
    {
      title: "Monthly Contact Lenses (6 Pack)",
      description:
        "Silicone hydrogel monthly lenses for comfortable extended wear. Box of 6 lenses.",
      price: 6800,
      discountedPrice: 5900,
      stock: 80,
      categorySlug: "contact-lenses",
      unitType: "BOX" as const,
    },
    {
      title: "Reading Glasses +1.50",
      description:
        "Lightweight ready-to-wear reading glasses with spring hinges. Also available in +1.00 to +3.00.",
      price: 2500,
      stock: 120,
      categorySlug: "reading-glasses",
      unitType: "PIECES" as const,
      brandSlug: "metro-essentials",
      gender: "UNISEX" as const,
      frameColors: ["Black", "Burgundy"],
      lensWidth: 48,
      bridgeWidth: 19,
      templeLength: 138,
      frameColor: "Black",
      frameMaterial: "Plastic",
      weightGrams: 12,
      frameShape: "RECTANGLE" as const,
      rimType: "FULL_RIM" as const,
    },
    {
      title: "Lens Cleaning Kit",
      description:
        "Includes cleaning spray, microfibre cloth and a compact hard case.",
      price: 1200,
      stock: 200,
      categorySlug: "accessories",
      unitType: "PIECES" as const,
    },
    {
      title: "Contact Lens Solution 360ml",
      description:
        "Multipurpose solution for cleaning, rinsing and storing soft contact lenses.",
      price: 1800,
      stock: 150,
      categorySlug: "accessories",
      unitType: "PIECES" as const,
    },
  ];

  for (const { categorySlug, brandSlug, ...rest } of products as any[]) {
    const slug = slugify(rest.title);

    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        ...rest,
        slug,
        images: [],
        status: "ACTIVE",
        category: {
          connect: { id: categories[categorySlug].id },
        },
        ...(brandSlug
          ? { brand: { connect: { id: brands[brandSlug].id } } }
          : {}),
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
