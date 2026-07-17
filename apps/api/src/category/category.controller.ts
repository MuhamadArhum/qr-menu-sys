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
import { UserRole, Status } from "@prisma/client";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { ReorderCategoryDto } from "./dto/reorder-category.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/strategies/jwt.strategy";

@ApiTags("Categories")
@ApiBearerAuth()
@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Create a category" })
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthUser) {
    return this.categoryService.create(user.restaurantId!, dto, user.id);
  }

  @Get()
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "List all categories (tree)" })
  findAll(@CurrentUser() user: AuthUser) {
    return this.categoryService.findAll(user.restaurantId!);
  }

  @Get(":id")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Get a single category with children" })
  findOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.categoryService.findOne(id, user.restaurantId!);
  }

  @Patch(":id")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Update category name or image" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.categoryService.update(id, user.restaurantId!, dto, user.id);
  }

  @Patch(":id/activate")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Activate a category" })
  activate(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.categoryService.toggleStatus(id, user.restaurantId!, Status.ACTIVE, user.id);
  }

  @Patch(":id/deactivate")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Deactivate a category" })
  deactivate(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.categoryService.toggleStatus(id, user.restaurantId!, Status.INACTIVE, user.id);
  }

  @Patch(":id/archive")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Archive (soft-delete) a category" })
  archive(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.categoryService.toggleStatus(id, user.restaurantId!, Status.ARCHIVED, user.id);
  }

  @Post("reorder")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reorder categories" })
  reorder(@Body() dto: ReorderCategoryDto, @CurrentUser() user: AuthUser) {
    return this.categoryService.reorder(user.restaurantId!, dto);
  }
}
