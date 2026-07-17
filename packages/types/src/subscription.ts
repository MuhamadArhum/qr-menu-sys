export type BillingCycle = "trial" | "monthly" | "yearly" | "enterprise";

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  billingCycle: BillingCycle;
  featureLimits: {
    maxBranches: number;
    maxTablesPerBranch: number;
    maxMenuItems: number;
  };
  status: "active" | "inactive";
};

export type Subscription = {
  id: string;
  restaurantId: string;
  planId: string;
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "cancelled";
};
