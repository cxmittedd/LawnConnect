// Server-side price table. Mirrors the enforce_job_pricing() database trigger so
// checkout amounts are always derived from trusted data, never from the caller.

export const OVERGROWN_TITLE = "Lawn Cut (Overgrown Grass)";

export const lawnSizePrice = (lawnSize: string | null | undefined): number => {
  const size = (lawnSize ?? "").toLowerCase();
  if (size.startsWith("small")) return 7000;
  if (size.startsWith("medium")) return 13000;
  if (size.startsWith("extra large")) return 35000;
  if (size.startsWith("large")) return 18500;
  return 5000;
};

/** Full, undiscounted price for a service, from the stored lawn size and title. */
export const serviceBasePrice = (
  lawnSize: string | null | undefined,
  title: string | null | undefined,
): number => lawnSizePrice(lawnSize) + (title === OVERGROWN_TITLE ? 1500 : 0);

/** Escape user-controlled text before interpolating it into HTML email markup. */
export const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

/** Keep personal data out of logs while staying useful for debugging. */
export const maskEmail = (email: string | null | undefined): string => {
  if (!email) return "none";
  const [local, domain] = String(email).split("@");
  if (!domain) return "redacted";
  return `${local.slice(0, 1)}***@${domain}`;
};

export const maskPhone = (phone: string | null | undefined): string => {
  if (!phone) return "none";
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 4 ? `***${digits.slice(-4)}` : "***";
};
