import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { UserRole, Status } from "@prisma/client";
import { MenuItemService } from "./menu-item.service";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { UpdateMenuItemDto } from "./dto/update-menu-item.dto";
import { UpdateAvailabilityDto } from "./dto/update-availability.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/strategies/jwt.strategy";

@ApiTags("Menu Items")
@ApiBearerAuth()
@Controller("menu-items")
export class MenuItemController {
  constructor(private readonly menuItemService: MenuItemService) {}

  @Post()
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Create a menu item" })
  create(@Body() dto: CreateMenuItemDto, @CurrentUser() user: AuthUser) {
    return this.menuItemService.create(user.restaurantId!, dto, user.id);
  }

  @Get()
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "List all menu items (optionally filter by category)" })
  @ApiQuery({ name: "categoryId", required: false })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query("categoryId") categoryId?: string,
  ) {
    if (categoryId) {
      return this.menuItemService.findByCategory(categoryId, user.restaurantId!);
    }
    return this.menuItemService.findAll(user.restaurantId!);
  }

  @Get(":id")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Get a menu item with variants and addons" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.menuItemService.findOne(id, user.restaurantId!);
  }

  @Patch(":id")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Update a menu item" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateMenuItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.menuItemService.update(id, user.restaurantId!, dto, user.id);
  }

  @Patch(":id/availability")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update item availability (AVAILABLE / SOLD_OUT / HIDDEN)" })
  updateAvailability(
    @Param("id") id: string,
    @Body() dto: UpdateAvailabilityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.menuItemService.updateAvailability(id, user.restaurantId!, dto, user.id);
  }

  @Patch(":id/activate")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Activate a menu item" })
  activate(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.menuItemService.toggleStatus(id, user.restaurantId!, Status.ACTIVE, user.id);
  }

  @Patch(":id/deactivate")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Deactivate a menu item" })
  deactivate(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.menuItemService.toggleStatus(id, user.restaurantId!, Status.INACTIVE, user.id);
  }

  @Patch(":id/archive")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Archive (soft-delete) a menu item" })
  archive(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.menuItemService.toggleStatus(id, user.restaurantId!, Status.ARCHIVED, user.id);
  }

  @Post("reorder")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reorder menu items within a category" })
  reorder(
    @Body() body: { categoryId: string; orderedIds: string[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.menuItemService.reorder(user.restaurantId!, body.categoryId, body.orderedIds);
  }
}
