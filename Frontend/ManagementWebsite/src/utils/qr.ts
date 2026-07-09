const PUBLIC_SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL ?? ''

/** Guest-facing menu URL encoded into a table's QR code. */
export const buildQrValue = (qrToken: string): string =>
  `${PUBLIC_SITE_URL}/menu?token=${qrToken}`
