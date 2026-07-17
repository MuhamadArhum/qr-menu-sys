import type { Status } from "./common";

export type Restaurant = {
  id: string;
  legalName: string;
  displayName: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  defaultCurrency: string;
  defaultLanguage: string;
  cuisineType: string | null;
  status: Status;
  subscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaxRate = {
  name: string;
  percentage: number;
};

export type RestaurantSettings = {
  taxRates: TaxRate[];
  serviceChargePercentage: number;
  serviceChargeEnabled: boolean;
  themeDefault: "light" | "dark";
  accentColor: string;
};
