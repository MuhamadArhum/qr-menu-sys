export type UserRole =
  | "super_admin"
  | "restaurant_admin"
  | "branch_manager"
  | "staff"
  | "kitchen_staff"
  | "waiter";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  restaurantId: string | null;
  branchIds: string[];
};
