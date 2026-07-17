import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { VariantService } from "./variant.service";
import { CreateVariantGroupDto } from "./dto/create-variant-group.dto";
import { UpdateVariantGroupDto } from "./dto/update-variant-group.dto";
import { CreateVariantOptionDto } from "./dto/create-variant-option.dto";
import { UpdateVariantOptionDto } from "./dto/update-variant-option.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/strategies/jwt.strategy";

@ApiTags("Variants")
@ApiBearerAuth()
@Controller()
@Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
export class VariantController {
  constructor(private readonly variantService: VariantService) {}

  // ─── Groups ───────────────────────────────────────────────────────────────

  @Post("variant-groups")
  @ApiOperation({ summary: "Create a variant group for a menu item" })
  createGroup(@Body() dto: CreateVariantGroupDto, @CurrentUser() user: AuthUser) {
    return this.variantService.createGroup(user.restaurantId!, dto, user.id);
  }

  @Get("menu-items/:menuItemId/variant-groups")
  @ApiOperation({ summary: "List all variant groups for a menu item" })
  findGroups(
    @Param("menuItemId")menuItemId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.variantService.findGroups(menuItemId, user.restaurantId!);
  }

  @Patch("variant-groups/:id")
  @ApiOperation({ summary: "Update a variant group" })
  updateGroup(
    @Param("id")id: string,
    @Body() dto: UpdateVariantGroupDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.variantService.updateGroup(id, user.restaurantId!, dto, user.id);
  }

  @Delete("variant-groups/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Archive (soft-delete) a variant group" })
  archiveGroup(@Param("id")id: string, @CurrentUser() user: AuthUser) {
    return this.variantService.archiveGroup(id, user.restaurantId!, user.id);
  }

  @Post("menu-items/:menuItemId/variant-groups/reorder")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reorder variant groups for a menu item" })
  reorderGroups(
    @Param("menuItemId")menuItemId: string,
    @Body() body: { orderedIds: string[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.variantService.reorderGroups(menuItemId, user.restaurantId!, body.orderedIds);
  }

  // ─── Options ─────────────────────────────────────────────────────────────

  @Post("variant-groups/:groupId/options")
  @ApiOperation({ summary: "Add an option to a variant group" })
  createOption(
    @Param("groupId")groupId: string,
    @Body() dto: CreateVariantOptionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.variantService.createOption(groupId, user.restaurantId!, dto, user.id);
  }

  @Patch("variant-options/:id")
  @ApiOperation({ summary: "Update a variant option" })
  updateOption(
    @Param("id")id: string,
    @Body() dto: UpdateVariantOptionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.variantService.updateOption(id, user.restaurantId!, dto, user.id);
  }

  @Delete("variant-options/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Archive (soft-delete) a variant option" })
  archiveOption(@Param("id")id: string, @CurrentUser() user: AuthUser) {
    return this.variantService.archiveOption(id, user.restaurantId!, user.id);
  }

  @Post("variant-groups/:groupId/options/reorder")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reorder options within a variant group" })
  reorderOptions(
    @Param("groupId")groupId: string,
    @Body() body: { orderedIds: string[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.variantService.reorderOptions(groupId, user.restaurantId!, body.orderedIds);
  }
}
