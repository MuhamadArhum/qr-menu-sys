import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { SubscriptionService } from "./subscription.service";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { AssignSubscriptionDto } from "./dto/assign-subscription.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/strategies/jwt.strategy";

@ApiTags("Subscriptions")
@ApiBearerAuth()
@Controller()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // ─── Plans ─────────────────────────────────────────────────────────────────

  @Get("plans")
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: "List all active subscription plans" })
  findAllPlans() {
    return this.subscriptionService.findAllPlans();
  }

  @Post("plans")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Create a subscription plan (SA)" })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionService.createPlan(dto);
  }

  @Patch("plans/:id")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Update a subscription plan (SA)" })
  updatePlan(@Param("id") id: string, @Body() dto: UpdatePlanDto) {
    return this.subscriptionService.updatePlan(id, dto);
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  @Get("subscriptions")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "List all restaurant subscriptions (SA)" })
  findAll() {
    return this.subscriptionService.findAllSubscriptions();
  }

  @Post("restaurants/:restaurantId/subscription")
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Assign or update subscription for a restaurant (SA)" })
  assign(
    @Param("restaurantId") restaurantId: string,
    @Body() dto: AssignSubscriptionDto,
  ) {
    return this.subscriptionService.assign(restaurantId, dto);
  }

  @Patch("restaurants/:restaurantId/subscription/cancel")
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancel a restaurant subscription (SA)" })
  cancel(@Param("restaurantId") restaurantId: string) {
    return this.subscriptionService.cancelSubscription(restaurantId);
  }

  @Get("subscription/me")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: "Get own restaurant subscription" })
  getMySubscription(@CurrentUser() user: AuthUser) {
    return this.subscriptionService.getMySubscription(user.restaurantId!);
  }
}
