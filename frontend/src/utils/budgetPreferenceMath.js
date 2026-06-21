/** IVA referencial Chile (solo UI / capa de ajuste sobre total del motor). */
export const CHILE_IVA_RATE = 0.19;

export function withContingency(amount, contingencyPct) {
  const n = Number(amount);
  const pct = Number(contingencyPct);
  if (!Number.isFinite(n)) return null;
  const safePct = Number.isFinite(pct) ? Math.max(0, pct) : 0;
  return n * (1 + safePct / 100);
}

export function ivaOnAmount(amount, includeTax) {
  if (!includeTax) return 0;
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return n * CHILE_IVA_RATE;
}

/**
 * Formatea importes numéricos según moneda preferida.
 * UF/USD: el motor sigue en CLP; se muestra honestamente cuando no hay conversión.
 */
export function formatMoneyByPreference(value, currency) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const v = Number(value);

  if (currency === 'USD') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'USD',
    }).format(v);
  }

  if (currency === 'UF') {
    return `${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(v)} (total motor en CLP; UF sin tipo de cambio)`;
  }

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
  }).format(v);
}
