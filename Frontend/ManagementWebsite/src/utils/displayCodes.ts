/**
 * Human-facing short codes derived from backend UUIDs / gateway references.
 *
 * The database keeps full UUIDs as the real identifiers; these helpers only change how
 * an id is *shown* to staff. They never alter the underlying id and are not sent back to
 * the API. The full value should stay reachable in a tooltip / "copy id" affordance for
 * support, while tables, cards and modals show the short code.
 *
 * A UUID's first block is stable and already used across the cashier UI, so we keep that
 * convention: INV-81101925, ORD-1A2B3C4D, PAY-9F8E7D6C.
 */

/** First `length` hex characters of a UUID, dashes removed, upper-cased. */
const shortId = (value: string, length = 8): string =>
  value.replace(/-/g, "").slice(0, length).toUpperCase();

export const formatInvoiceCode = (id: string | null | undefined): string =>
  id ? `INV-${shortId(id)}` : "—";

export const formatOrderCode = (id: string | null | undefined): string =>
  id ? `ORD-${shortId(id)}` : "—";

export const formatPaymentCode = (id: string | null | undefined): string =>
  id ? `PAY-${shortId(id)}` : "—";

/** Neutral short code for ids that carry no domain prefix (e.g. a menu item reference). */
export const formatShortCode = (id: string | null | undefined): string =>
  id ? shortId(id) : "—";

/**
 * QR / external transaction reference, e.g. the gateway ref "MOCK_QR-69C02F3E260E4F11"
 * becomes "QR-69C02F3E". The meaningful part is the hex tail after the provider prefix.
 */
export const formatTransactionCode = (
  ref: string | null | undefined,
): string => {
  if (!ref) return "—";
  const segments = ref.split(/[-_]/).filter(Boolean);
  const tail = segments[segments.length - 1] ?? ref;
  const hex = tail.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  return hex ? `QR-${hex}` : ref.toUpperCase();
};
