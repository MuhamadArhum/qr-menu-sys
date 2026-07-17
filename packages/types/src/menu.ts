import type { Status } from "./common";

export type DietaryTag =
  | "vegetarian"
  | "vegan"
  | "halal"
  | "spicy"
  | "gluten_free";

export type Category = {
  id: string;
  restaurantId: string;
  parentCategoryId: string | null;
  name: string;
  imageUrl: string | null;
  sortOrder: number;
  status: Status;
  children?: Category[];
  items?: MenuItem[];
};

export type VariantOption = {
  id: string;
  variantGroupId: string;
  name: string;
  priceDelta: number;
  status: Status;
};

export type VariantGroup = {
  id: string;
  menuItemId: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: VariantOption[];
};

export type AddonOption = {
  id: string;
  addonGroupId: string;
  name: string;
  price: number;
  status: Status;
};

export type AddonGroup = {
  id: string;
  menuItemId: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: AddonOption[];
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: number;
  images: string[];
  ingredients: string | null;
  allergens: string | null;
  dietaryTags: DietaryTag[];
  availabilityStatus: "available" | "sold_out" | "hidden";
  sortOrder: number;
  variantGroups: VariantGroup[];
  addonGroups: AddonGroup[];
};

// Estimate Cart (client-side only, never persisted as order)
export type EstimateCartLine = {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  selectedVariants: VariantOption[];
  selectedAddons: AddonOption[];
  lineTotal: number;
};

export type EstimateCart = {
  tableId: string;
  lines: EstimateCartLine[];
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  grandTotal: number;
};
