import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import {
  BLOCKS,
  getBlockDefinition,
} from "@/features/site-content/constants/blocks";
import type { BlockData } from "@/features/site-content/types/site-content";

/**
 * Reading and writing storefront content.
 *
 * Every read merges the saved row over the block's shipped defaults, so:
 *  - a block that has never been edited renders the dummy content
 *  - a field added to the registry later appears immediately, populated,
 *    instead of arriving as `undefined` and crashing a component
 *
 * The merge is deliberately shallow. Repeater values are whole arrays and the
 * admin always submits the complete list, so a deep merge would resurrect
 * items the editor just deleted.
 */

const mergeWithDefaults = (key: string, saved?: BlockData | null): BlockData => {
  const definition = getBlockDefinition(key);
  if (!definition) return saved ?? {};
  return { ...definition.defaults, ...(saved ?? {}) };
};

/**
 * One block, ready to render.
 *
 * Wrapped in React's `cache` so a layout and a page asking for the same block
 * in one render share a single query.
 */
export const getSiteBlock = cache(async (key: string): Promise<BlockData> => {
  try {
    const row = await prisma.siteContent.findUnique({ where: { key } });
    return mergeWithDefaults(key, row?.data as BlockData | undefined);
  } catch {
    // Content must never take a page down — fall back to the shipped defaults.
    return mergeWithDefaults(key, null);
  }
});

/** Several blocks in one query, keyed by block key. */
export const getSiteBlocks = cache(
  async (keys: string[]): Promise<Record<string, BlockData>> => {
    let rows: { key: string; data: unknown }[] = [];

    try {
      rows = await prisma.siteContent.findMany({
        where: { key: { in: keys } },
        select: { key: true, data: true },
      });
    } catch {
      rows = [];
    }

    const saved = new Map(rows.map((row) => [row.key, row.data as BlockData]));

    return keys.reduce<Record<string, BlockData>>((acc, key) => {
      acc[key] = mergeWithDefaults(key, saved.get(key));
      return acc;
    }, {});
  }
);

/** Every registered block, for the admin editor. */
export async function getAllSiteBlocks() {
  const rows = await prisma.siteContent.findMany({
    select: { key: true, data: true, updatedAt: true },
  });
  const saved = new Map(rows.map((row) => [row.key, row]));

  return BLOCKS.map((definition) => {
    const row = saved.get(definition.key);
    return {
      key: definition.key,
      data: mergeWithDefaults(definition.key, row?.data as BlockData | undefined),
      updatedAt: row?.updatedAt?.toISOString() ?? null,
      /** False until an admin saves it — the editor labels these as samples. */
      customised: Boolean(row),
    };
  });
}

export async function saveSiteBlock(key: string, data: BlockData) {
  const definition = getBlockDefinition(key);
  if (!definition) {
    throw new Error(`Unknown content block: ${key}`);
  }

  const row = await prisma.siteContent.upsert({
    where: { key },
    create: { key, data },
    update: { data },
  });

  return {
    key: row.key,
    data: row.data as BlockData,
    updatedAt: row.updatedAt.toISOString(),
    customised: true,
  };
}

/** Drop the saved row so the block returns to its shipped sample content. */
export async function resetSiteBlock(key: string) {
  const definition = getBlockDefinition(key);
  if (!definition) {
    throw new Error(`Unknown content block: ${key}`);
  }

  await prisma.siteContent.deleteMany({ where: { key } });

  return {
    key,
    data: { ...definition.defaults },
    updatedAt: null,
    customised: false,
  };
}
