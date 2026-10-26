/**
 * Enlace de donaciones (Ko-fi, Buy Me a Coffee, PayPal...). Se configura con VITE_DONATION_URL;
 * si no está definido, la sección de apoyo no aparece en ninguna parte.
 * Solo se aceptan enlaces https para no abrir nunca un esquema raro.
 */
const raw = String(import.meta.env.VITE_DONATION_URL ?? "").trim();

export const donationUrl: string | null = (() => {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
})();
