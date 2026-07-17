import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

export type CurrentUserType = {
  id: string;
  email: string;
  role: string;
  restaurantId: string | null;
  branchIds: string[];
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserType => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as CurrentUserType;
  },
);
