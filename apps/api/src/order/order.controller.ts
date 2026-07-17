import { Controller, Get, Post, Patch, Param, Body, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { OrderService } from "./order.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, CurrentUserType } from "../auth/decorators/current-user.decorator";

@ApiTags("Orders")
@Controller("orders")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // Customer places order — no auth required (QR code validates identity)
  @Post()
  @Public()
  @ApiOperation({ summary: "Place an order (public — QR code validates)" })
  create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto);
  }

  // Kitchen display — must be before :id routes to avoid route collision
  @Get("kitchen")
  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER, UserRole.KITCHEN_STAFF)
  @ApiOperation({ summary: "Kitchen display — active orders only" })
  kitchen(
    @CurrentUser() user: CurrentUserType,
    @Query("branchId") branchId?: string,
  ) {
    return this.orderService.findAllForKitchen(user.restaurantId!, branchId);
  }

  // Admin/Kitchen — list orders
  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER, UserRole.KITCHEN_STAFF)
  @ApiOperation({ summary: "List orders for restaurant" })
  findAll(
    @CurrentUser() user: CurrentUserType,
    @Query("branchId") branchId?: string,
    @Query("status") status?: string,
  ) {
    return this.orderService.findAll(user.restaurantId!, branchId, status);
  }

  // Update order status
  @Patch(":id/status")
  @ApiBearerAuth()
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER, UserRole.KITCHEN_STAFF)
  @ApiOperation({ summary: "Update order status" })
  updateStatus(
    @Param("id") orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.orderService.updateStatus(orderId, user.restaurantId!, dto.status);
  }

  // Customer checks their table's orders
  @Get("table/:tableId")
  @Public()
  @ApiOperation({ summary: "Get orders for a table (public)" })
  getByTable(@Param("tableId") tableId: string) {
    return this.orderService.getOrdersByTable(tableId);
  }
}
