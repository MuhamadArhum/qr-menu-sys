import { describe, it, expect } from "vitest";
import { calcTotal, parseTaxRates, computeEstimate } from "@/lib/pricing";
import type { MenuResponse } from "@/lib/api";

// ─── calcTotal ────────────────────────────────────────────────────────────────

describe("calcTotal", () => {
  it("returns base price * qty when no variants or addons", () => {
    expect(calcTotal(100, [], [], 1)).toBe(100);
    expect(calcTotal(100, [], [], 3)).toBe(300);
  });

  it("adds variant price modifiers", () => {
    expect(calcTotal(100, [{ priceModifier: 20 }, { priceModifier: 10 }], [], 1)).toBe(130);
  });

  it("adds addon prices", () => {
    expect(calcTotal(100, [], [{ price: 15 }, { price: 5 }], 1)).toBe(120);
  });

  it("applies all modifiers then multiplies by qty", () => {
    expect(calcTotal(100, [{ priceModifier: 50 }], [{ price: 25 }], 2)).toBe(350);
  });

  it("handles zero base price", () => {
    expect(calcTotal(0, [{ priceModifier: 10 }], [], 2)).toBe(20);
  });

  it("handles negative variant modifiers (discounts)", () => {
    expect(calcTotal(200, [{ priceModifier: -50 }], [], 1)).toBe(150);
  });
});

// ─── parseTaxRates ────────────────────────────────────────────────────────────

describe("parseTaxRates", () => {
  it("returns empty array for null", () => {
    expect(parseTaxRates(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(parseTaxRates(undefined)).toEqual([]);
  });

  it("returns empty array for non-array", () => {
    expect(parseTaxRates("not-array")).toEqual([]);
    expect(parseTaxRates(42)).toEqual([]);
    expect(parseTaxRates({})).toEqual([]);
  });

  it("parses valid tax rate objects", () => {
    const raw = [{ name: "GST", rate: 18 }, { name: "VAT", rate: 5 }];
    expect(parseTaxRates(raw)).toEqual(raw);
  });

  it("filters out invalid entries", () => {
    const raw = [
      { name: "GST", rate: 18 },
      { name: 123, rate: 5 },
      { name: "VAT" },
      null,
      "string",
    ];
    expect(parseTaxRates(raw)).toEqual([{ name: "GST", rate: 18 }]);
  });

  it("returns empty array for empty array input", () => {
    expect(parseTaxRates([])).toEqual([]);
  });
});

// ─── computeEstimate ──────────────────────────────────────────────────────────

function makeRestaurant(overrides: Partial<MenuResponse["restaurant"]> = {}): MenuResponse["restaurant"] {
  return {
    id: "r1",
    displayName: "Test Restaurant",
    logoUrl: null,
    coverImageUrl: null,
    description: null,
    defaultCurrency: "PKR",
    accentColor: "#ff4630",
    themeDefault: "light",
    taxRates: null,
    serviceCharge: "0",
    serviceChargeEnabled: false,
    ...overrides,
  };
}

function makeBranch(overrides: Partial<MenuResponse["branch"]> = {}): MenuResponse["branch"] {
  return {
    id: "b1",
    name: "Main Branch",
    address: "123 Test St",
    businessHours: null,
    taxOverride: null,
    serviceChargeOverride: null,
    serviceChargeEnabled: null,
    ...overrides,
  };
}

describe("computeEstimate", () => {
  it("returns subtotal as total when no taxes or service charge", () => {
    const result = computeEstimate(1000, makeRestaurant(), makeBranch());
    expect(result.total).toBe(1000);
    expect(result.taxes).toEqual([]);
    expect(result.taxTotal).toBe(0);
    expect(result.scAmount).toBe(0);
  });

  it("applies restaurant-level tax rates", () => {
    const restaurant = makeRestaurant({ taxRates: [{ name: "GST", rate: 18 }] });
    const result = computeEstimate(1000, restaurant, makeBranch());
    expect(result.taxes).toHaveLength(1);
    expect(result.taxes[0]!.amount).toBe(180);
    expect(result.taxTotal).toBe(180);
    expect(result.total).toBe(1180);
  });

  it("branch taxOverride takes precedence over restaurant taxRates", () => {
    const restaurant = makeRestaurant({ taxRates: [{ name: "GST", rate: 18 }] });
    const branch = makeBranch({ taxOverride: [{ name: "Local Tax", rate: 5 }] });
    const result = computeEstimate(1000, restaurant, branch);
    expect(result.taxes).toHaveLength(1);
    expect(result.taxes[0]!.name).toBe("Local Tax");
    expect(result.taxes[0]!.amount).toBe(50);
    expect(result.total).toBe(1050);
  });

  it("applies service charge when enabled", () => {
    const restaurant = makeRestaurant({ serviceCharge: "10", serviceChargeEnabled: true });
    const result = computeEstimate(1000, restaurant, makeBranch());
    expect(result.scAmount).toBe(100);
    expect(result.total).toBe(1100);
  });

  it("branch serviceChargeEnabled overrides restaurant setting", () => {
    const restaurant = makeRestaurant({ serviceCharge: "10", serviceChargeEnabled: true });
    const branch = makeBranch({ serviceChargeEnabled: false });
    const result = computeEstimate(1000, restaurant, branch);
    expect(result.scAmount).toBe(0);
    expect(result.total).toBe(1000);
  });

  it("branch serviceChargeOverride rate takes precedence", () => {
    const restaurant = makeRestaurant({ serviceCharge: "10", serviceChargeEnabled: true });
    const branch = makeBranch({ serviceChargeOverride: "5" });
    const result = computeEstimate(1000, restaurant, branch);
    expect(result.scRate).toBe(5);
    expect(result.scAmount).toBe(50);
    expect(result.total).toBe(1050);
  });

  it("applies multiple taxes and service charge together", () => {
    const restaurant = makeRestaurant({
      taxRates: [{ name: "GST", rate: 18 }, { name: "PST", rate: 5 }],
      serviceCharge: "10",
      serviceChargeEnabled: true,
    });
    const result = computeEstimate(1000, restaurant, makeBranch());
    expect(result.taxTotal).toBe(230);
    expect(result.scAmount).toBe(100);
    expect(result.total).toBe(1330);
  });

  it("handles zero subtotal", () => {
    const restaurant = makeRestaurant({ taxRates: [{ name: "GST", rate: 18 }] });
    const result = computeEstimate(0, restaurant, makeBranch());
    expect(result.total).toBe(0);
    expect(result.taxes[0]!.amount).toBe(0);
  });
});
