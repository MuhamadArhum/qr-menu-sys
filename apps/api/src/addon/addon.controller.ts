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
import { AddonService } from "./addon.service";
import { CreateAddonGroupDto } from "./dto/create-addon-group.dto";
import { UpdateAddonGroupDto } from "./dto/update-addon-group.dto";
import { CreateAddonOptionDto } from "./dto/create-addon-option.dto";
import { UpdateAddonOptionDto } from "./dto/update-addon-option.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/strategies/jwt.strategy";

@ApiTags("Addons")
@ApiBearerAuth()
@Controller()
@Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
export class AddonController {
  constructor(private readonly addonService: AddonService) {}

  // ─── Groups ───────────────────────────────────────────────────────────────

  @Post("addon-groups")
  @ApiOperation({ summary: "Create an addon group for a menu item" })
  createGroup(@Body() dto: CreateAddonGroupDto, @CurrentUser() user: AuthUser) {
    return this.addonService.createGroup(user.restaurantId!, dto, user.id);
  }

  @Get("menu-items/:menuItemId/addon-groups")
  @ApiOperation({ summary: "List all addon groups for a menu item" })
  findGroups(
    @Param("menuItemId")menuItemId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.addonService.findGroups(menuItemId, user.restaurantId!);
  }

  @Patch("addon-groups/:id")
  @ApiOperation({ summary: "Update an addon group" })
  updateGroup(
    @Param("id")id: string,
    @Body() dto: UpdateAddonGroupDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.addonService.updateGroup(id, user.restaurantId!, dto, user.id);
  }

  @Delete("addon-groups/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Archive (soft-delete) an addon group" })
  archiveGroup(@Param("id")id: string, @CurrentUser() user: AuthUser) {
    return this.addonService.archiveGroup(id, user.restaurantId!, user.id);
  }

  @Post("menu-items/:menuItemId/addon-groups/reorder")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reorder addon groups for a menu item" })
  reorderGroups(
    @Param("menuItemId")menuItemId: string,
    @Body() body: { orderedIds: string[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.addonService.reorderGroups(menuItemId, user.restaurantId!, body.orderedIds);
  }

  // ─── Options ─────────────────────────────────────────────────────────────

  @Post("addon-groups/:groupId/options")
  @ApiOperation({ summary: "Add an option to an addon group" })
  createOption(
    @Param("groupId")groupId: string,
    @Body() dto: CreateAddonOptionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.addonService.createOption(groupId, user.restaurantId!, dto, user.id);
  }

  @Patch("addon-options/:id")
  @ApiOperation({ summary: "Update an addon option" })
  updateOption(
    @Param("id")id: string,
    @Body() dto: UpdateAddonOptionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.addonService.updateOption(id, user.restaurantId!, dto, user.id);
  }

  @Delete("addon-options/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Archive (soft-delete) an addon option" })
  archiveOption(@Param("id")id: string, @CurrentUser() user: AuthUser) {
    return this.addonService.archiveOption(id, user.restaurantId!, user.id);
  }

  @Post("addon-groups/:groupId/options/reorder")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reorder options within an addon group" })
  reorderOptions(
    @Param("groupId")groupId: string,
    @Body() body: { orderedIds: string[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.addonService.reorderOptions(groupId, user.restaurantId!, body.orderedIds);
  }
}
