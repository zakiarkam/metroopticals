const FALLBACK_SITE_URL = "https://metroopticals.lk";

const normalizeSiteUrl = (value: string) => value.replace(/\/+$/, "");

export const siteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    FALLBACK_SITE_URL
);

export const buildSiteUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalizedPath}`;
};

/**
 * A JSON-LD block's body, safe to hand to `dangerouslySetInnerHTML`.
 *
 * An HTML parser ends a `<script>` at the first literal `</script>`, wherever
 * it sits - inside a JSON string included. `JSON.stringify` has no reason to
 * escape `<`, so a product title or an FAQ answer carrying that sequence
 * would close the tag early and put whatever follows into the document as
 * markup. Escaping it to its `\u003c` form keeps the JSON identical to a
 * JSON parser and inert to the HTML tokenizer.
 *
 * The CSP would refuse the injected script for want of a nonce; this is the
 * layer that stops the page being mangled in the first place.
 */
export const jsonLdScript = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c");
