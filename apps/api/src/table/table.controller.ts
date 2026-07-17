import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { TableService } from "./table.service";
import { CreateTableDto } from "./dto/create-table.dto";
import { BulkCreateTableDto } from "./dto/bulk-create-table.dto";
import { UpdateTableDto } from "./dto/update-table.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, CurrentUserType } from "../auth/decorators/current-user.decorator";

@ApiTags("Table")
@ApiBearerAuth()
@Controller()
export class TableController {
  constructor(private readonly tableService: TableService) {}

  // POST /api/v1/branches/:branchId/tables
  @Post("branches/:branchId/tables")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Create a single table under a branch" })
  create(
    @Param("branchId") branchId: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateTableDto,
  ) {
    this.assertRestaurant(user);
    return this.tableService.create(branchId, user.restaurantId!, dto, user.id);
  }

  // POST /api/v1/branches/:branchId/tables/bulk
  @Post("branches/:branchId/tables/bulk")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Bulk create tables (e.g. Table 1 to Table 20)" })
  bulkCreate(
    @Param("branchId") branchId: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: BulkCreateTableDto,
  ) {
    this.assertRestaurant(user);
    return this.tableService.bulkCreate(branchId, user.restaurantId!, dto, user.id);
  }

  // GET /api/v1/branches/:branchId/tables
  @Get("branches/:branchId/tables")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "List all tables of a branch" })
  findAll(
    @Param("branchId") branchId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    this.assertRestaurant(user);
    return this.tableService.findAll(branchId, user.restaurantId!);
  }

  // GET /api/v1/tables/:id
  @Get("tables/:id")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Get a single table" })
  findOne(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    this.assertRestaurant(user);
    return this.tableService.findOne(id, user.restaurantId!);
  }

  // PATCH /api/v1/tables/:id
  @Patch("tables/:id")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Update table label or capacity" })
  update(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: UpdateTableDto,
  ) {
    this.assertRestaurant(user);
    return this.tableService.update(id, user.restaurantId!, dto, user.id);
  }

  // DELETE /api/v1/tables/:id
  @Delete("tables/:id")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: "Delete table and invalidate its QR code" })
  remove(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    this.assertRestaurant(user);
    return this.tableService.remove(id, user.restaurantId!, user.id);
  }

  private assertRestaurant(user: CurrentUserType) {
    if (!user.restaurantId) {
      throw new ForbiddenException("No restaurant associated with this account");
    }
  }
}
