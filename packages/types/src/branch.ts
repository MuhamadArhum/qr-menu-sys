import type { Status } from "./common";
import type { TaxRate } from "./restaurant";

export type BusinessHours = {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  isOpen: boolean;
  shifts: { open: string; close: string }[];
};

export type Branch = {
  id: string;
  restaurantId: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  contactNumber: string | null;
  businessHours: BusinessHours[];
  taxOverride: TaxRate[] | null;
  serviceChargeOverride: number | null;
  serviceChargeEnabled: boolean | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
};
