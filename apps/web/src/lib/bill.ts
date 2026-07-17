import type { MenuItem, VariantOption, AddonOption } from "./api";

export interface SelectedVariant {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceModifier: number;
}

export interface SelectedAddon {
  groupId: string;
  optionId: string;
  optionName: string;
  price: number;
}

export interface BillItem {
  id: string; // unique per line (itemId + variant combo)
  menuItemId: string;
  name: string;
  basePrice: number;
  selectedVariants: SelectedVariant[];
  selectedAddons: SelectedAddon[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export function calcUnitPrice(
  basePrice: number,
  variants: SelectedVariant[],
  addons: SelectedAddon[],
) {
  const variantDelta = variants.reduce((s, v) => s + v.priceModifier, 0);
  const addonTotal = addons.reduce((s, a) => s + a.price, 0);
  return basePrice + variantDelta + addonTotal;
}

export function calcBillTotals(
  items: BillItem[],
  taxRates: { label: string; rate: number }[],
  serviceChargeRate: number,
  serviceChargeEnabled: boolean,
) {
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const taxes = taxRates.map((t) => ({
    label: t.label,
    amount: subtotal * (t.rate / 100),
  }));
  const taxTotal = taxes.reduce((s, t) => s + t.amount, 0);
  const serviceCharge = serviceChargeEnabled ? subtotal * (serviceChargeRate / 100) : 0;
  const total = subtotal + taxTotal + serviceCharge;

  return { subtotal, taxes, taxTotal, serviceCharge, total };
}
