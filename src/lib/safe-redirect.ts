// Only same-origin absolute paths are allowed as post-login redirects.
export function safeRedirectPath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  if (/[\r\n]/.test(value)) return fallback;
  return value;
}
