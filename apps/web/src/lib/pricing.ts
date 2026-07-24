import type { MenuResponse, TaxRate } from "./api";

export function calcTotal(
  base: number,
  variants: { priceModifier: number }[],
  addons: { price: number }[],
  qty: number,
): number {
  return (
    base +
    variants.reduce((s, v) => s + v.priceModifier, 0) +
    addons.reduce((s, a) => s + a.price, 0)
  ) * qty;
}

export function parseTaxRates(raw: unknown): TaxRate[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).filter(
    (r): r is TaxRate =>
      !!r &&
      typeof (r as TaxRate).name === "string" &&
      typeof (r as TaxRate).rate === "number",
  );
}

export function computeEstimate(
  subtotal: number,
  restaurant: MenuResponse["restaurant"],
  branch: MenuResponse["branch"],
) {
  const taxRates = parseTaxRates(branch.taxOverride ?? restaurant.taxRates);
  const scEnabled =
    branch.serviceChargeEnabled !== null
      ? branch.serviceChargeEnabled
      : restaurant.serviceChargeEnabled;
  const scRate = parseFloat(
    (branch.serviceChargeOverride ?? restaurant.serviceCharge) || "0",
  );
  const taxes = taxRates.map((r) => ({
    name: r.name,
    rate: r.rate,
    amount: (subtotal * r.rate) / 100,
  }));
  const taxTotal = taxes.reduce((s, t) => s + t.amount, 0);
  const scAmount = scEnabled ? (subtotal * scRate) / 100 : 0;
  return { taxes, taxTotal, scAmount, scRate, scEnabled, total: subtotal + taxTotal + scAmount };
}
