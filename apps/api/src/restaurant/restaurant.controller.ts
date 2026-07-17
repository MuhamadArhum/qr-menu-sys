import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { RestaurantService } from "./restaurant.service";
import { UpdateRestaurantDto } from "./dto/update-restaurant.dto";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { QueryRestaurantsDto } from "./dto/query-restaurants.dto";
import { CreateRestaurantDto } from "./dto/create-restaurant.dto";
import { CreateStaffDto } from "./dto/create-staff.dto";
import { UpdateStaffDto } from "./dto/update-staff.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, CurrentUserType } from "../auth/decorators/current-user.decorator";

@ApiTags("Restaurant")
@ApiBearerAuth()
@Controller("restaurants")
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  // ─── Restaurant Admin Routes ──────────────────────────────────────────────

  // GET /api/v1/restaurants/me
  @Get("me")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Get own restaurant profile" })
  @ApiResponse({ status: 200, description: "Restaurant profile" })
  getMe(@CurrentUser() user: CurrentUserType) {
    if (!user.restaurantId) {
      throw new ForbiddenException("No restaurant associated with this account");
    }
    return this.restaurantService.findMine(user.restaurantId);
  }

  // PATCH /api/v1/restaurants/me
  @Patch("me")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: "Update own restaurant profile" })
  @ApiResponse({ status: 200, description: "Updated restaurant" })
  updateMe(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: UpdateRestaurantDto,
  ) {
    if (!user.restaurantId) {
      throw new ForbiddenException("No restaurant associated with this account");
    }
    return this.restaurantService.updateProfile(user.restaurantId, dto, user.id);
  }

  // PATCH /api/v1/restaurants/me/settings
  @Patch("me/settings")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: "Update restaurant tax, service charge and theme settings" })
  @ApiResponse({ status: 200, description: "Updated settings" })
  updateSettings(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: UpdateSettingsDto,
  ) {
    if (!user.restaurantId) {
      throw new ForbiddenException("No restaurant associated with this account");
    }
    return this.restaurantService.updateSettings(user.restaurantId, dto, user.id);
  }

  // ─── Restaurant Admin: Staff Management ──────────────────────────────────

  // GET /api/v1/restaurants/me/staff
  @Get("me/staff")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: "List all staff members for own restaurant" })
  @ApiResponse({ status: 200, description: "Staff list" })
  listStaff(@CurrentUser() user: CurrentUserType) {
    if (!user.restaurantId) {
      throw new ForbiddenException("No restaurant associated with this account");
    }
    return this.restaurantService.listStaff(user.restaurantId);
  }

  // POST /api/v1/restaurants/me/staff
  @Post("me/staff")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new staff member for own restaurant" })
  @ApiResponse({ status: 201, description: "Staff member created" })
  @ApiResponse({ status: 409, description: "Email already in use" })
  createStaff(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateStaffDto,
  ) {
    if (!user.restaurantId) {
      throw new ForbiddenException("No restaurant associated with this account");
    }
    return this.restaurantService.createStaff(user.restaurantId, dto);
  }

  // PATCH /api/v1/restaurants/me/staff/:id
  @Patch("me/staff/:id")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: "Update role or status of a staff member" })
  @ApiResponse({ status: 200, description: "Staff member updated" })
  @ApiResponse({ status: 404, description: "Staff member not found" })
  updateStaff(
    @CurrentUser() user: CurrentUserType,
    @Param("id") staffId: string,
    @Body() dto: UpdateStaffDto,
  ) {
    if (!user.restaurantId) {
      throw new ForbiddenException("No restaurant associated with this account");
    }
    return this.restaurantService.updateStaff(user.restaurantId, staffId, dto);
  }

  // DELETE /api/v1/restaurants/me/staff/:id
  @Delete("me/staff/:id")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Archive (soft-delete) a staff member" })
  @ApiResponse({ status: 200, description: "Staff member removed" })
  @ApiResponse({ status: 404, description: "Staff member not found" })
  removeStaff(
    @CurrentUser() user: CurrentUserType,
    @Param("id") staffId: string,
  ) {
    if (!user.restaurantId) {
      throw new ForbiddenException("No restaurant associated with this account");
    }
    return this.restaurantService.removeStaff(user.restaurantId, staffId);
  }

  // ─── Super Admin Routes ───────────────────────────────────────────────────

  // POST /api/v1/restaurants
  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "[Super Admin] Create a restaurant directly (ACTIVE)" })
  @ApiResponse({ status: 201, description: "Restaurant created" })
  @ApiResponse({ status: 409, description: "Email already exists" })
  create(
    @Body() dto: CreateRestaurantDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.restaurantService.createByAdmin(dto, user.id);
  }

  // GET /api/v1/restaurants
  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "[Super Admin] List all restaurant tenants" })
  @ApiResponse({ status: 200, description: "Paginated restaurant list" })
  findAll(@Query() query: QueryRestaurantsDto) {
    return this.restaurantService.findAll(query);
  }

  // GET /api/v1/restaurants/:id
  @Get(":id")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "[Super Admin] Get a specific restaurant" })
  @ApiResponse({ status: 200, description: "Restaurant detail" })
  @ApiResponse({ status: 404, description: "Not found" })
  findOne(@Param("id") id: string) {
    return this.restaurantService.findOne(id);
  }

  // PATCH /api/v1/restaurants/:id/status
  @Patch(":id/status")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "[Super Admin] Activate, suspend, or archive a restaurant" })
  @ApiResponse({ status: 200, description: "Status updated" })
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.restaurantService.updateStatus(id, dto, user.id);
  }

  // POST /api/v1/restaurants/:id/approve
  @Post(":id/approve")
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "[Super Admin] Approve a pending restaurant registration" })
  @ApiResponse({ status: 200, description: "Restaurant approved" })
  approve(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.restaurantService.approve(id, user.id);
  }
}
