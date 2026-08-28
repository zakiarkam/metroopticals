import { ValidationError } from "@/lib/errors";

/**
 * A route's `[id]` segment as a positive integer, or a 400.
 *
 * `Number("abc")` is NaN and `Number("1e3")` is 1000; either reaches Prisma
 * as a `where: { id }` it cannot serve and comes back as a 500 in the error
 * log. Refusing anything that is not a plain positive integer keeps a
 * mistyped URL a client error, which is what it is.
 */
export function parseIdParam(raw: string | undefined, label = "id"): number {
  if (!raw || !/^\d{1,12}$/.test(raw)) {
    throw new ValidationError(`Invalid ${label}`);
  }
  return Number(raw);
}
