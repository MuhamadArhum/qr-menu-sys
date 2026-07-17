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
import { UserRole, Status } from "@prisma/client";
import { BranchService } from "./branch.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { AssignManagerDto } from "./dto/assign-manager.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, CurrentUserType } from "../auth/decorators/current-user.decorator";

@ApiTags("Branch")
@ApiBearerAuth()
@Controller("branches")
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  // POST /api/v1/branches
  @Post()
  @Roles(UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: "Create a new branch" })
  create(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateBranchDto,
  ) {
    this.assertRestaurant(user);
    return this.branchService.create(user.restaurantId!, dto, user.id);
  }

  // GET /api/v1/branches
  @Get()
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "List all branches of own restaurant" })
  findAll(@CurrentUser() user: CurrentUserType) {
    this.assertRestaurant(user);
    return this.branchService.findAll(user.restaurantId!);
  }

  // GET /api/v1/branches/:id
  @Get(":id")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Get a branch by ID" })
  findOne(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    this.assertRestaurant(user);
    return this.branchService.findOne(id, user.restaurantId!);
  }

  // PATCH /api/v1/branches/:id
  @Patch(":id")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: "Update branch info and settings" })
  update(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: UpdateBranchDto,
  ) {
    this.assertRestaurant(user);
    return this.branchService.update(id, user.restaurantId!, dto, user.id);
  }

  // PATCH /api/v1/branches/:id/activate
  @Patch(":id/activate")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: "Activate a branch" })
  activate(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    this.assertRestaurant(user);
    return this.branchService.toggleStatus(id, user.restaurantId!, Status.ACTIVE, user.id);
  }

  // PATCH /api/v1/branches/:id/deactivate
  @Patch(":id/deactivate")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: "Deactivate a branch" })
  deactivate(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    this.assertRestaurant(user);
    return this.branchService.toggleStatus(id, user.restaurantId!, Status.INACTIVE, user.id);
  }

  // POST /api/v1/branches/:id/manager
  @Post(":id/manager")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: "Assign a branch manager to a branch" })
  assignManager(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: AssignManagerDto,
  ) {
    this.assertRestaurant(user);
    return this.branchService.assignManager(id, user.restaurantId!, dto, user.id);
  }

  // DELETE /api/v1/branches/:id/manager/:managerId
  @Delete(":id/manager/:managerId")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: "Remove a branch manager from a branch" })
  removeManager(
    @Param("id") id: string,
    @Param("managerId") managerId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    this.assertRestaurant(user);
    return this.branchService.removeManager(id, user.restaurantId!, managerId, user.id);
  }

  private assertRestaurant(user: CurrentUserType) {
    if (!user.restaurantId) {
      throw new ForbiddenException("No restaurant associated with this account");
    }
  }
}
