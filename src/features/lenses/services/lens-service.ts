import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { lensTypes as lensGuide } from "@/config/lenses";
import {
  priceFrom,
  quoteLens,
  type LensQuote,
  type PriceableLensType,
} from "@/features/lenses/utils/pricing";
import {
  valuesFromRow,
  type PrescriptionValues,
} from "@/features/lenses/utils/prescription";
import type {
  CreateLensTypeInput,
  LensQuoteBatchInput,
  LensQuoteInput,
  UpdateLensTypeInput,
} from "@/features/lenses/validators/lens";

const bandSelect = {
  id: true,
  label: true,
  sphMin: true,
  sphMax: true,
  cylMin: true,
  cylMax: true,
  addMin: true,
  addMax: true,
  price: true,
  sortOrder: true,
} as const;

const tintSelect = {
  id: true,
  name: true,
  hex: true,
  description: true,
  surcharge: true,
  sortOrder: true,
  isActive: true,
} as const;

const designSelect = {
  id: true,
  kind: true,
  name: true,
  description: true,
  sortOrder: true,
  isActive: true,
} as const;

const lensTypeInclude = {
  designs: {
    select: {
      ...designSelect,
      powerPrices: { select: bandSelect, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  },
  tints: { select: tintSelect, orderBy: { sortOrder: "asc" } },
} as const;

/* ------------------------------ catalogue ------------------------------- */

/**
 * The lens menu the storefront shows.
 *
 * Each type is joined to its guide entry in `src/config/lenses.ts` by slug, so
 * the picker can link to the page that explains what the lens actually does —
 * which is the "Learn about different lens usages" link. A type with no guide
 * simply has no link.
 */
export async function getLensCatalogue({
  includeInactive = false,
}: { includeInactive?: boolean } = {}) {
  const rows = await prisma.lensType.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: lensTypeInclude,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  return rows.map((row) => {
    const guide = lensGuide.find((entry) => entry.slug === row.slug);
    const tints = includeInactive
      ? row.tints
      : row.tints.filter((tint) => tint.isActive);
    const designs = includeInactive
      ? row.designs
      : row.designs.filter((design) => design.isActive);

    return {
      ...row,
      tints,
      designs,
      guideHref: guide ? `/lenses/${guide.slug}` : null,
      guideTagline: guide?.tagline ?? null,
      image: guide?.image ?? null,
      priceFrom: priceFrom({ ...row, designs } as PriceableLensType),
    };
  });
}

export async function getLensTypeById(id: number) {
  const lensType = await prisma.lensType.findUnique({
    where: { id },
    include: lensTypeInclude,
  });
  if (!lensType) throw new NotFoundError("Lens type not found");
  return lensType;
}

/* -------------------------------- quoting -------------------------------- */

/** Powers from a saved row, or from the request when nothing is saved yet. */
async function resolveValues(
  userId: number,
  input: { prescriptionId?: number | null; prescription?: PrescriptionValues | null },
): Promise<PrescriptionValues | null> {
  if (input.prescriptionId) {
    const row = await prisma.prescription.findUnique({
      where: { id: input.prescriptionId },
      select: {
        userId: true,
        rightSph: true, rightCyl: true, rightAxis: true, rightAdd: true,
        rightPrism: true, rightBase: true,
        leftSph: true, leftCyl: true, leftAxis: true, leftAdd: true,
        leftPrism: true, leftBase: true,
        pdSingle: true, pdRight: true, pdLeft: true,
      },
    });

    // Someone else's prescription is not found, not forbidden: a 404 tells a
    // prober nothing about which ids exist.
    if (!row || row.userId !== userId) {
      throw new NotFoundError("Prescription not found");
    }

    return valuesFromRow(row);
  }

  return input.prescription ?? null;
}

/**
 * Price one lens type against one prescription.
 *
 * Everything is read from our own tables — there is no outside call here, and
 * that is the whole point: a shopper trying the same prescription against four
 * lens types costs four cheap queries, not four paid API calls.
 */
export async function quoteLensType(
  userId: number,
  input: LensQuoteInput,
): Promise<
  LensQuote & { lensTypeId: number; lensTintId: number | null }
> {
  const lensType = await getLensTypeById(input.lensTypeId);

  if (!lensType.isActive) {
    throw new ValidationError("That lens is no longer offered");
  }

  const tint = input.lensTintId
    ? lensType.tints.find((entry) => entry.id === input.lensTintId)
    : null;

  if (input.lensTintId && !tint) {
    throw new ValidationError("That lens colour is not available");
  }
  if (tint && !tint.isActive) {
    throw new ValidationError("That lens colour is no longer offered");
  }

  const active = lensType.designs.filter((entry) => entry.isActive);

  // No build named: a lens sold in exactly one way needs no choice made, so
  // take it. Anything else has to be picked, or we would be quoting a
  // progressive price for a single vision order.
  const design = input.lensDesignId
    ? lensType.designs.find((entry) => entry.id === input.lensDesignId)
    : active.length === 1
      ? active[0]
      : null;

  if (input.lensDesignId && !design) {
    throw new ValidationError("That lens build is not available");
  }
  if (design && !design.isActive) {
    throw new ValidationError("That lens build is no longer offered");
  }

  const prescription = await resolveValues(userId, input);

  return {
    ...quoteLens({
      lensType: lensType as PriceableLensType,
      design,
      tint,
      prescription,
    }),
    lensTypeId: lensType.id,
    lensTintId: tint?.id ?? null,
  };
}

/**
 * Price every build of every lens type against one prescription, in a single
 * round trip.
 *
 * This is what makes "what would the progressive cost?" instant: the picker
 * asks once, gets the whole grid back — every coating crossed with every build
 * — and moving around it afterwards is a lookup rather than a request.
 */
export async function quoteLensTypes(
  userId: number,
  input: LensQuoteBatchInput,
) {
  const prescription = await resolveValues(userId, input);

  const lensTypes = await prisma.lensType.findMany({
    where: { id: { in: input.lensTypeIds }, isActive: true },
    include: lensTypeInclude,
  });

  return lensTypes.map((lensType) => {
    const designs = lensType.designs.filter((design) => design.isActive);
    const priceable = { ...lensType, designs } as PriceableLensType;

    return {
      lensTypeId: lensType.id,
      /** One entry per build, priced. Empty when the shop offers no builds. */
      designs: designs.map((design) => ({
        designId: design.id,
        kind: design.kind,
        name: design.name,
        description: design.description,
        ...quoteLens({ lensType: priceable, design, tint: null, prescription }),
      })),
      /** Per-colour surcharges, so the tint step can show its own prices. */
      tints: lensType.tints
        .filter((tint) => tint.isActive)
        .map((tint) => ({ id: tint.id, name: tint.name, surcharge: tint.surcharge })),
    };
  });
}

/* ------------------------------ admin CRUD ------------------------------- */

const blankToNull = (value: string | null | undefined) =>
  value && value.trim() ? value.trim() : null;

/**
 * Two tints called "Grey" would hit the unique index and come back as a bare
 * "record already exists" — true, but useless to the admin staring at a list
 * of twelve colours. Name the colour instead, before the database has to.
 */
function assertNamesUnique(rows: Array<{ name: string }>, noun: string) {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    if (seen.has(key)) {
      throw new ValidationError(
        `Two ${noun}s are both called "${row.name.trim()}" — give one a different name`,
      );
    }
    seen.add(key);
  }
}

const assertTintNamesUnique = (rows: Array<{ name: string }>) =>
  assertNamesUnique(rows, "colour");

const assertDesignNamesUnique = (rows: Array<{ name: string }>) =>
  assertNamesUnique(rows, "build");

export async function createLensType(data: CreateLensTypeInput) {
  assertTintNamesUnique(data.tints);
  assertDesignNamesUnique(data.designs);

  const existing = await prisma.lensType.findUnique({
    where: { slug: data.slug },
  });
  if (existing) {
    throw new ValidationError("A lens with this slug already exists", [
      { path: "slug", message: "Already in use" },
    ]);
  }

  return prisma.lensType.create({
    data: {
      slug: data.slug,
      name: data.name,
      description: blankToNull(data.description),
      groupLabel: blankToNull(data.groupLabel),
      requiresPrescription: data.requiresPrescription,
      basePrice: data.basePrice,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
      designs: {
        create: data.designs.map((design, index) => ({
          kind: design.kind,
          name: design.name.trim(),
          description: blankToNull(design.description),
          sortOrder: design.sortOrder || index,
          isActive: design.isActive,
          powerPrices: {
            create: design.powerPrices.map((band, bandIndex) => ({
              label: blankToNull(band.label),
              sphMin: band.sphMin,
              sphMax: band.sphMax,
              cylMin: band.cylMin,
              cylMax: band.cylMax,
              addMin: band.addMin ?? null,
              addMax: band.addMax ?? null,
              price: band.price,
              sortOrder: band.sortOrder || bandIndex,
            })),
          },
        })),
      },
      tints: {
        create: data.tints.map((tint, index) => ({
          name: tint.name.trim(),
          hex: blankToNull(tint.hex),
          description: blankToNull(tint.description),
          surcharge: tint.surcharge,
          sortOrder: tint.sortOrder || index,
          isActive: tint.isActive,
        })),
      },
    },
    include: lensTypeInclude,
  });
}

/**
 * Save the lens and, when they were sent, its builds, price rows and colours.
 *
 * The lists are replaced rather than merged. A price list is edited as a grid
 * and saved as one, so replacing it is the only way the saved list is
 * guaranteed to be the list that was on screen — a merge would silently keep
 * a row the admin had deleted. Rows that kept their id are updated in place,
 * so a band a cart line was quoted against survives a re-save.
 *
 * The DIFF IS WORKED OUT BEFORE the transaction opens, and only the rows that
 * actually changed are written. That is not an optimisation, it is the fix
 * for a real failure: the first version issued one query per row inside the
 * transaction, and against a database a few hundred milliseconds away a lens
 * with five price rows and six colours spent longer than Prisma's five-second
 * interactive-transaction budget and died with "transaction already closed".
 */
export async function updateLensType(id: number, data: UpdateLensTypeInput) {
  const current = await getLensTypeById(id);

  if (data.tints) assertTintNamesUnique(data.tints);
  if (data.designs) assertDesignNamesUnique(data.designs);

  if (data.slug) {
    const clash = await prisma.lensType.findFirst({
      where: { slug: data.slug, NOT: { id } },
      select: { id: true },
    });
    if (clash) {
      throw new ValidationError("A lens with this slug already exists", [
        { path: "slug", message: "Already in use" },
      ]);
    }
  }

  const designPlan = data.designs
    ? planRows(
        current.designs,
        data.designs.map((design, index) => ({
          id: design.id,
          values: {
            kind: design.kind,
            name: design.name.trim(),
            description: blankToNull(design.description),
            sortOrder: design.sortOrder || index,
            isActive: design.isActive,
          },
        })),
      )
    : null;

  const tintPlan = data.tints
    ? planRows(
        current.tints,
        data.tints.map((tint, index) => ({
          id: tint.id,
          values: {
            name: tint.name.trim(),
            hex: blankToNull(tint.hex),
            description: blankToNull(tint.description),
            surcharge: tint.surcharge,
            sortOrder: tint.sortOrder || index,
            isActive: tint.isActive,
          },
        })),
      )
    : null;

  assertNoRenameClash(
    current.designs,
    designPlan,
    "build",
    "Rename that one first, then save this.",
  );
  assertNoRenameClash(
    current.tints,
    tintPlan,
    "colour",
    "Rename that one first, then save this.",
  );

  await prisma.$transaction(
    async (tx) => {
      await tx.lensType.update({
        where: { id },
        data: {
          ...(data.slug !== undefined ? { slug: data.slug } : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined
            ? { description: blankToNull(data.description) }
            : {}),
          ...(data.groupLabel !== undefined
            ? { groupLabel: blankToNull(data.groupLabel) }
            : {}),
          ...(data.requiresPrescription !== undefined
            ? { requiresPrescription: data.requiresPrescription }
            : {}),
          ...(data.basePrice !== undefined ? { basePrice: data.basePrice } : {}),
          ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });

      if (data.designs && designPlan) {
        if (designPlan.remove.length) {
          await tx.lensDesign.deleteMany({
            where: { id: { in: designPlan.remove }, lensTypeId: id },
          });
        }

        // Designs are created one at a time rather than with createMany,
        // because each one's price rows need the id it comes back with.
        const idByName = new Map(
          current.designs.map((design) => [design.name.trim(), design.id]),
        );

        for (const row of designPlan.create) {
          const created = await tx.lensDesign.create({
            data: { ...row.values, lensTypeId: id },
            select: { id: true, name: true },
          });
          idByName.set(created.name.trim(), created.id);
        }

        for (const row of designPlan.update) {
          const updated = await tx.lensDesign.update({
            where: { id: row.id },
            data: row.values,
            select: { id: true, name: true },
          });
          idByName.set(updated.name.trim(), updated.id);
        }

        // Now the bands, per design, with the same only-what-changed diff.
        for (const design of data.designs) {
          const designId = design.id ?? idByName.get(design.name.trim());
          if (!designId) continue;

          const held =
            current.designs.find((entry) => entry.id === designId)?.powerPrices ??
            [];

          const bandPlan = planRows(
            held,
            design.powerPrices.map((band, index) => ({
              id: band.id,
              values: {
                label: blankToNull(band.label),
                sphMin: band.sphMin,
                sphMax: band.sphMax,
                cylMin: band.cylMin,
                cylMax: band.cylMax,
                addMin: band.addMin ?? null,
                addMax: band.addMax ?? null,
                price: band.price,
                sortOrder: band.sortOrder || index,
              },
            })),
          );

          if (bandPlan.remove.length) {
            await tx.lensPowerPrice.deleteMany({
              where: { id: { in: bandPlan.remove }, lensDesignId: designId },
            });
          }
          if (bandPlan.create.length) {
            await tx.lensPowerPrice.createMany({
              data: bandPlan.create.map((row) => ({
                ...row.values,
                lensDesignId: designId,
              })),
            });
          }
          for (const row of bandPlan.update) {
            await tx.lensPowerPrice.update({
              where: { id: row.id },
              data: row.values,
            });
          }
        }
      }

      if (tintPlan) {
        if (tintPlan.remove.length) {
          await tx.lensTint.deleteMany({
            where: { id: { in: tintPlan.remove }, lensTypeId: id },
          });
        }
        if (tintPlan.create.length) {
          await tx.lensTint.createMany({
            data: tintPlan.create.map((row) => ({ ...row.values, lensTypeId: id })),
          });
        }
        for (const row of tintPlan.update) {
          await tx.lensTint.update({ where: { id: row.id }, data: row.values });
        }
      }
    },
    // Room for an unusually large price list on a slow link. The diff above
    // is what keeps a normal save nowhere near this.
    { timeout: 20_000, maxWait: 10_000 },
  );

  // Read back outside the transaction: it is a plain read and holding the
  // transaction open for it only spends the budget.
  return getLensTypeById(id);
}

/**
 * Renaming two rows into each other ("Grey"->"Green" while "Green"->"Grey")
 * is legal as a final state but passes through one the unique index forbids.
 * Rare enough not to be worth a temporary-name dance, common enough that the
 * database's own "record already exists" would be a baffling thing to read.
 */
function assertNoRenameClash(
  current: Array<{ id: number; name: string }>,
  plan: { remove: number[]; update: Array<{ id: number; values: any }> } | null,
  noun: string,
  advice: string,
) {
  if (!plan) return;

  const surviving = new Map(
    current
      .filter((row) => !plan.remove.includes(row.id))
      .map((row) => [row.id, row.name.trim().toLowerCase()]),
  );

  for (const row of plan.update) {
    const wanted = String(row.values.name ?? "").toLowerCase();
    if (!wanted) continue;
    for (const [otherId, otherName] of surviving) {
      if (otherId !== row.id && otherName === wanted) {
        throw new ValidationError(
          `"${row.values.name}" is already the name of another ${noun} on this lens. ${advice}`,
        );
      }
    }
  }
}

/**
 * What actually has to be written: rows to delete, rows to insert, and only
 * those existing rows whose values really changed.
 *
 * An admin who opens a lens, fixes one price and saves should cost one UPDATE,
 * not one per row on the screen.
 */
function planRows<TRow extends { id: number }, TValues extends object>(
  existing: TRow[],
  incoming: Array<{ id?: number; values: TValues }>,
) {
  const byId = new Map(existing.map((row) => [row.id, row]));
  const kept = new Set<number>();

  const create: Array<{ values: TValues }> = [];
  const update: Array<{ id: number; values: TValues }> = [];

  for (const row of incoming) {
    const held = row.id ? byId.get(row.id) : undefined;

    // An id we do not recognise belongs to another lens, or to a row someone
    // else deleted while this form was open. Treated as new rather than
    // trusted into an update that could rewrite a different lens's price.
    if (!held) {
      create.push({ values: row.values });
      continue;
    }

    kept.add(held.id);

    const changed = Object.entries(row.values).some(
      ([key, value]) => (held as Record<string, unknown>)[key] !== value,
    );
    if (changed) update.push({ id: held.id, values: row.values });
  }

  return {
    create,
    update,
    remove: existing.filter((row) => !kept.has(row.id)).map((row) => row.id),
  };
}

/**
 * Retire a lens type.
 *
 * Deleted outright only while nothing has ever been sold with it. Once an
 * order line points at it, it is switched off instead — the invoice keeps its
 * own copy of the name and price, but throwing the row away would still lose
 * the shop its own history of what it used to sell.
 */
export async function deleteLensType(id: number) {
  await getLensTypeById(id);

  const sold = await prisma.orderItem.count({ where: { lensTypeId: id } });

  if (sold > 0) {
    await prisma.lensType.update({
      where: { id },
      data: { isActive: false },
    });
    return { deactivated: true as const, sold };
  }

  await prisma.lensType.delete({ where: { id } });
  return { deactivated: false as const, sold: 0 };
}

/**
 * Bring the price list into line with the lens guide.
 *
 * The site already explains nine lens types in detail, each with its own
 * colourways; without this the shop would have to retype all nine names,
 * groups and colour lists before it could price a single one. So this runs on
 * its own whenever an admin opens the price list, and again whenever a new
 * lens type or a new colour is added to the guide.
 *
 * Deliberately additive and nothing else. It creates what is missing and
 * touches nothing that exists — never a price, never a name someone has
 * edited, never an `isActive` someone has switched. Running it twice does
 * nothing the second time, which is what makes it safe to run automatically.
 */
export async function syncLensTypesFromGuide() {
  const existing = await prisma.lensType.findMany({
    select: {
      id: true,
      slug: true,
      tints: { select: { name: true } },
    },
  });

  const bySlug = new Map(existing.map((row) => [row.slug, row]));

  let createdTypes = 0;
  let createdTints = 0;

  for (const [index, entry] of lensGuide.entries()) {
    const variants = entry.variants?.items ?? [];
    const row = bySlug.get(entry.slug);

    if (!row) {
      try {
        await prisma.lensType.create({
        data: {
          slug: entry.slug,
          name: entry.shortName || entry.name,
          description: entry.tagline,
          groupLabel: entry.group,
          requiresPrescription: true,
          // Priced by the shop before it is switched on — a lens with no price
          // list and no base price quotes as "call us", never as free.
          basePrice: 0,
          isActive: false,
          sortOrder: index * 10,
          // Every lens starts as a single vision lens; bifocal and progressive
          // builds are added by the shop when it prices them, because whether
          // a coating is offered as a progressive is the shop's decision and
          // its price is a separate row on the sheet.
          designs: {
            create: [
              {
                kind: "SINGLE_VISION" as const,
                name: "Single Vision",
                description: "One power across the whole lens.",
                sortOrder: 0,
              },
            ],
          },
          tints: {
            create: variants.map((variant, order) => ({
              name: variant.name,
              hex: variant.hex,
              description: variant.summary,
              surcharge: 0,
              sortOrder: order * 10,
            })),
          },
        },
        });
        createdTypes += 1;
        createdTints += variants.length;
      } catch (error: any) {
        // Two admins opening the price list at once both try to create the
        // same slug; whoever loses the race simply finds the row in place.
        if (error?.code !== "P2002") throw error;
      }
      continue;
    }

    // A colour the guide has gained since this lens was set up. Matched on the
    // name because that is what the unique index is on, and case-insensitively
    // because "Grey" and "grey" are one colour to a customer.
    const held = new Set(row.tints.map((tint) => tint.name.trim().toLowerCase()));

    for (const [order, variant] of variants.entries()) {
      if (held.has(variant.name.trim().toLowerCase())) continue;

      try {
        await prisma.lensTint.create({
          data: {
            lensTypeId: row.id,
            name: variant.name,
            hex: variant.hex,
            description: variant.summary,
            surcharge: 0,
            sortOrder: order * 10,
          },
        });
        createdTints += 1;
      } catch (error: any) {
        if (error?.code !== "P2002") throw error;
      }
    }
  }

  return { createdTypes, createdTints };
}

/**
 * What each lens in the guide costs, keyed by slug, for the guide pages.
 *
 * The guide is editorial and the price list is the shop's; this is the one
 * seam between them. Only lenses the shop has switched on come back, so a
 * guide page for a lens nobody has priced yet advertises no price and offers
 * to talk to us instead — which is the truth.
 *
 * Never throws. A guide page is worth reading with no prices on it; it is not
 * worth returning a 500 because the price list could not be reached.
 */
export async function getGuideLensPricing(): Promise<
  Map<
    string,
    {
      id: number;
      priceFrom: number;
      designKinds: string[];
      tints: { id: number; name: string; hex: string | null; surcharge: number }[];
    }
  >
> {
  try {
    const rows = await prisma.lensType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        basePrice: true,
        designs: {
          where: { isActive: true },
          select: { kind: true, powerPrices: { select: { price: true } } },
        },
        tints: {
          where: { isActive: true },
          select: { id: true, name: true, hex: true, surcharge: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return new Map(
      rows.map((row) => {
        const bands = row.designs.flatMap((design) => design.powerPrices);
        return [
          row.slug,
          {
            id: row.id,
            priceFrom: bands.length
              ? bands.reduce(
                  (lowest, band) => Math.min(lowest, band.price),
                  Number.POSITIVE_INFINITY,
                )
              : row.basePrice,
            // What the guide page can honestly advertise: whether the shop
            // actually offers this coating as a bifocal or a progressive.
            designKinds: [...new Set(row.designs.map((design) => design.kind))],
            tints: row.tints,
          },
        ];
      }),
    );
  } catch (error) {
    logger.warn("Could not read lens pricing for the guide", {
      error: String(error),
    });
    return new Map();
  }
}
