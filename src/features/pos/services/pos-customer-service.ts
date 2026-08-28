import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";
import type {
  CreateCustomerInput,
  CustomerQueryInput,
  PosCustomerInput,
  UpdateCustomerInput,
} from "@/features/pos/validators/pos";

/**
 * The counter's customer book.
 *
 * Phone number is the key: it is what someone gives at the counter and what
 * the cashier types to find them again. Two records for the same phone would
 * split one person's history in half, so the number is unique and a repeat
 * customer is matched to their existing row rather than duplicated.
 */

/**
 * One canonical form per person, so the book cannot hold them twice.
 *
 * Everything that is not a digit goes, and a Sri Lankan number written
 * internationally is folded back to the local form: `+94 76 663 8682`,
 * `0094766638682`, `76 663 8682` and `076 663 8682` are all one customer,
 * not four.
 */
export const normalisePhone = (phone: string): string => {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("0094")) digits = digits.slice(4);
  else if (digits.startsWith("94") && digits.length === 11) digits = digits.slice(2);
  // Nine digits with no leading zero is a local number written without its
  // trunk `0`, which is how it is often dictated at the counter. Anything
  // else is left alone rather than guessed at.
  else if (digits.length !== 9 || digits.startsWith("0")) return digits;
  return digits.startsWith("0") ? digits : `0${digits}`;
};

/** What one customer has been worth to the shop, from their bills. */
const customerStats = async (customerIds: number[]) => {
  if (customerIds.length === 0) return new Map<number, { bills: number; spent: number; owed: number }>();

  const rows = await prisma.order.groupBy({
    by: ["customerId"],
    where: { customerId: { in: customerIds }, status: { not: "CANCELLED" } },
    _count: { _all: true },
    _sum: { totalAmount: true, amountPaid: true },
  });

  return new Map(
    rows.map((row) => [
      row.customerId as number,
      {
        bills: row._count._all,
        spent: Math.round((row._sum.totalAmount || 0) * 100) / 100,
        owed: Math.max(
          0,
          Math.round(((row._sum.totalAmount || 0) - (row._sum.amountPaid || 0)) * 100) / 100,
        ),
      },
    ]),
  );
};

export type CustomerBookRow = Awaited<ReturnType<typeof getCustomers>>["customers"][number];

export async function getCustomers(query: CustomerQueryInput) {
  const { page, limit } = query;
  const search = query.search?.trim();

  // A name search normalises to an empty phone, and `contains: ""` matches
  // every row  which would answer "Kamal" with the whole customer book.
  const digits = search ? normalisePhone(search) : "";
  const where: Prisma.CustomerWhereInput = {
    ...(query.optedInOnly ? { marketingOptIn: true } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            ...(digits ? [{ phone: { contains: digits } }] : []),
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // Spend and visit counts live on the bills, so those two sorts are done in
  // memory over the page's worth of ids after a wider fetch  the book is
  // hundreds of people, not millions.
  const sortInDb: Prisma.CustomerOrderByWithRelationInput =
    query.sort === "name"
      ? { name: "asc" }
      : { lastVisitAt: { sort: "desc", nulls: "last" } };
  const sortByStats = query.sort === "spend" || query.sort === "visits";

  const pageArgs: { skip?: number; take: number } = sortByStats
    ? { take: 2000 }
    : { skip: (page - 1) * limit, take: limit };

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: sortInDb, ...pageArgs }),
    prisma.customer.count({ where }),
  ]);

  const stats = await customerStats(rows.map((row) => row.id));
  let customers = rows.map((row) => ({
    ...row,
    stats: stats.get(row.id) ?? { bills: 0, spent: 0, owed: 0 },
  }));

  if (sortByStats) {
    customers = customers
      .sort((a, b) =>
        query.sort === "spend"
          ? b.stats.spent - a.stats.spent
          : b.stats.bills - a.stats.bills,
      )
      .slice((page - 1) * limit, page * limit);
  }

  const optedIn = await prisma.customer.count({
    where: { ...where, marketingOptIn: true },
  });

  return {
    customers,
    summary: { total, optedIn },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

/** The whole book, for a spreadsheet the shop can market from. */
export async function getCustomersForExport(optedInOnly: boolean) {
  const rows = await prisma.customer.findMany({
    where: optedInOnly ? { marketingOptIn: true } : {},
    orderBy: { lastVisitAt: { sort: "desc", nulls: "last" } },
    take: 10_000,
  });
  const stats = await customerStats(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    stats: stats.get(row.id) ?? { bills: 0, spent: 0, owed: 0 },
  }));
}

export async function findCustomerByPhone(phone: string) {
  const normalised = normalisePhone(phone);
  if (!normalised) return null;
  return prisma.customer.findUnique({ where: { phone: normalised } });
}

export async function getCustomerById(id: number) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          totalAmount: true,
          amountPaid: true,
          paymentStatus: true,
          status: true,
          channel: true,
        },
      },
    },
  });
  if (!customer) throw new NotFoundError("Customer not found");
  return customer;
}

export async function createCustomer(data: CreateCustomerInput) {
  const phone = normalisePhone(data.phone);
  // `((((((` passes the format check and normalises to nothing, which would
  // key a customer on the empty string and then collide with the next one.
  if (!phone) {
    throw new ValidationError("Enter a phone number with digits in it");
  }

  const existing = await prisma.customer.findUnique({ where: { phone } });
  if (existing) {
    throw new ValidationError(
      `${existing.name} is already saved under this phone number`,
    );
  }

  return prisma.customer.create({
    data: {
      name: data.name,
      phone,
      email: data.email || null,
      address: data.address || null,
      city: data.city || null,
      notes: data.notes || null,
      marketingOptIn: !!data.marketingOptIn,
    },
  });
}

export async function updateCustomer(id: number, data: UpdateCustomerInput) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new NotFoundError("Customer not found");

  const phone = data.phone ? normalisePhone(data.phone) : undefined;
  if (data.phone !== undefined && !phone) {
    throw new ValidationError("Enter a phone number with digits in it");
  }
  if (phone && phone !== customer.phone) {
    const clash = await prisma.customer.findUnique({ where: { phone } });
    if (clash) {
      throw new ValidationError(
        `${clash.name} is already saved under this phone number`,
      );
    }
  }

  return prisma.customer.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.address !== undefined ? { address: data.address || null } : {}),
      ...(data.city !== undefined ? { city: data.city || null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      ...(data.marketingOptIn !== undefined
        ? { marketingOptIn: data.marketingOptIn }
        : {}),
    },
  });
}

/**
 * Work out who a bill belongs to.
 *
 * A walk-in who gives no details at all is fine and returns null. Anyone who
 * gives a phone number is saved to the book, so the next time they come in the
 * cashier types the number and their details fill themselves in  and the
 * details they give this time top up anything the record was missing, without
 * wiping what is already there.
 */
export async function resolveCustomerForSale(
  input?: PosCustomerInput,
  /** The sale's own transaction, so a bill that fails leaves no customer behind. */
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  if (!input) return null;

  if (input.id) {
    const existing = await client.customer.findUnique({ where: { id: input.id } });
    if (!existing) throw new NotFoundError("Customer not found");
    return client.customer.update({
      where: { id: existing.id },
      data: {
        lastVisitAt: new Date(),
        ...(input.marketingOptIn && !existing.marketingOptIn
          ? { marketingOptIn: true }
          : {}),
      },
    });
  }

  const phone = input.phone ? normalisePhone(input.phone) : "";
  const name = input.name?.trim();

  // Someone who asked not to be kept is billed by name and number and that is
  // all: nothing is written to the book, and nothing already there is touched.
  // (A balance still needs a number to chase, which the bill itself carries.)
  if (input.saveToBook === false) {
    return name || phone
      ? ({
          id: null,
          name: name || "Walk-in customer",
          phone,
          email: input.email || null,
          address: input.address || null,
          city: input.city || null,
        } as const)
      : null;
  }

  // A name with no phone number is not worth a book entry; it still prints on
  // the bill through the billing fields.
  if (!phone) {
    return name
      ? ({
          id: null,
          name,
          phone: "",
          email: input.email || null,
          address: input.address || null,
          city: input.city || null,
        } as const)
      : null;
  }

  const existing = await client.customer.findUnique({ where: { phone } });
  if (existing) {
    const patch: Prisma.CustomerUpdateInput = { lastVisitAt: new Date() };
    if (name && name !== existing.name) patch.name = name;
    if (input.email && !existing.email) patch.email = input.email;
    if (input.address && !existing.address) patch.address = input.address;
    if (input.city && !existing.city) patch.city = input.city;
    if (input.notes && !existing.notes) patch.notes = input.notes;
    // Consent only ever moves one way from the till: a tick grants it, an
    // untouched box leaves whatever they said last time in place.
    if (input.marketingOptIn && !existing.marketingOptIn) patch.marketingOptIn = true;

    return client.customer.update({ where: { id: existing.id }, data: patch });
  }

  return client.customer.create({
    data: {
      name: name || "Walk-in customer",
      phone,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      notes: input.notes || null,
      marketingOptIn: !!input.marketingOptIn,
      lastVisitAt: new Date(),
    },
  });
}
