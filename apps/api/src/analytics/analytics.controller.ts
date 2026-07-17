import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { AnalyticsService } from "./analytics.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/strategies/jwt.strategy";

@ApiTags("Analytics")
@ApiBearerAuth()
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Platform-wide overview (SA)" })
  platformOverview() {
    return this.analyticsService.getPlatformOverview();
  }

  @Get("qr-scans")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "QR scan stats for own restaurant" })
  @ApiQuery({ name: "from", required: false, example: "2026-01-01" })
  @ApiQuery({ name: "to", required: false, example: "2026-12-31" })
  qrScans(
    @CurrentUser() user: AuthUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.analyticsService.getQRScanStats(user.restaurantId!, from, to);
  }

  @Get("menu-summary")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Menu item counts and availability breakdown" })
  menuSummary(@CurrentUser() user: AuthUser) {
    return this.analyticsService.getMenuSummary(user.restaurantId!);
  }
}
