const BASE = (process.env.API_INTERNAL_URL ?? "http://localhost:3001") + "/api/v1";

export async function fetchMenu(codeValue: string) {
  const res = await fetch(`${BASE}/public/menu/${codeValue}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error("INVALID_CODE");
    throw new Error("FETCH_FAILED");
  }

  return res.json() as Promise<MenuResponse>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaxRate {
  name: string;
  rate: number;
}

export interface Restaurant {
  id: string;
  displayName: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  defaultCurrency: string;
  accentColor: string;
  themeDefault: string;
  taxRates: TaxRate[] | null;
  serviceCharge: string;
  serviceChargeEnabled: boolean;
}

export interface VariantOption {
  id: string;
  name: string;
  priceModifier: string;
  sortOrder: number;
}

export interface VariantGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  options: VariantOption[];
}

export interface AddonOption {
  id: string;
  name: string;
  price: string;
  sortOrder: number;
}

export interface AddonGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  options: AddonOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  nameUr: string | null;
  description: string | null;
  descriptionUr: string | null;
  basePrice: string;
  imageUrl: string | null;
  calories: number | null;
  prepTimeMinutes: number | null;
  dietaryTags: string[];
  ingredients: string[];
  allergens: string[];
  availability: "AVAILABLE" | "SOLD_OUT" | "HIDDEN";
  sortOrder: number;
  variantGroups: VariantGroup[];
  addonGroups: AddonGroup[];
}

export interface Category {
  id: string;
  name: string;
  nameUr: string | null;
  imageUrl: string | null;
  sortOrder: number;
  menuItems: MenuItem[];
  children: Category[];
}

export interface MenuResponse {
  restaurant: Restaurant;
  branch: {
    id: string;
    name: string;
    address: string;
    businessHours: unknown;
    taxOverride: TaxRate[] | null;
    serviceChargeOverride: string | null;
    serviceChargeEnabled: boolean | null;
  };
  table: { id: string; label: string; capacity: number | null };
  menu: Category[];
}
