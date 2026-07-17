import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { AuditAction, Status } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { ReorderCategoryDto } from "./dto/reorder-category.dto";

const CATEGORY_SELECT = {
  id: true,
  restaurantId: true,
  parentCategoryId: true,
  name: true,
  imageUrl: true,
  sortOrder: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { menuItems: true, children: true } },
};

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(restaurantId: string, dto: CreateCategoryDto, actorId: string) {
    if (dto.parentCategoryId) {
      await this.assertOwnership(dto.parentCategoryId, restaurantId);
    }

    const maxOrder = await this.prisma.category.aggregate({
      where: {
        restaurantId,
        parentCategoryId: dto.parentCategoryId ?? null,
        status: { not: Status.ARCHIVED },
      },
      _max: { sortOrder: true },
    });

    const category = await this.prisma.category.create({
      data: {
        restaurantId,
        name: dto.name,
        imageUrl: dto.imageUrl,
        parentCategoryId: dto.parentCategoryId ?? null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      select: CATEGORY_SELECT,
    });

    await this.audit(actorId, restaurantId, category.id, AuditAction.CREATE, null, category);

    return category;
  }

  // ─── List all (tree structure) ────────────────────────────────────────────

  async findAll(restaurantId: string) {
    const categories = await this.prisma.category.findMany({
      where: {
        restaurantId,
        parentCategoryId: null,
        status: { not: Status.ARCHIVED },
      },
      orderBy: { sortOrder: "asc" },
      select: {
        ...CATEGORY_SELECT,
        children: {
          where: { status: { not: Status.ARCHIVED } },
          orderBy: { sortOrder: "asc" },
          select: CATEGORY_SELECT,
        },
      },
    });

    return categories;
  }

  // ─── Get one ─────────────────────────────────────────────────────────────

  async findOne(categoryId: string, restaurantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, restaurantId },
      select: {
        ...CATEGORY_SELECT,
        children: {
          where: { status: { not: Status.ARCHIVED } },
          orderBy: { sortOrder: "asc" },
          select: CATEGORY_SELECT,
        },
      },
    });

    if (!category) throw new NotFoundException("Category not found");

    return category;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(
    categoryId: string,
    restaurantId: string,
    dto: UpdateCategoryDto,
    actorId: string,
  ) {
    const before = await this.assertOwnership(categoryId, restaurantId);

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      },
      select: CATEGORY_SELECT,
    });

    await this.audit(actorId, restaurantId, categoryId, AuditAction.UPDATE, before, updated);

    return updated;
  }

  // ─── Toggle status ────────────────────────────────────────────────────────

  async toggleStatus(
    categoryId: string,
    restaurantId: string,
    status: Status,
    actorId: string,
  ) {
    const before = await this.assertOwnership(categoryId, restaurantId);

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: { status },
      select: CATEGORY_SELECT,
    });

    const action = status === Status.ACTIVE ? AuditAction.ACTIVATE : AuditAction.SUSPEND;
    await this.audit(actorId, restaurantId, categoryId, action, before, updated);

    return updated;
  }

  // ─── Reorder ──────────────────────────────────────────────────────────────

  async reorder(restaurantId: string, dto: ReorderCategoryDto) {
    const categories = await this.prisma.category.findMany({
      where: { id: { in: dto.orderedIds }, restaurantId },
    });

    if (categories.length !== dto.orderedIds.length) {
      throw new BadRequestException("Some category IDs are invalid or don't belong to your restaurant");
    }

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.category.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return { message: "Categories reordered successfully" };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  async assertOwnership(categoryId: string, restaurantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, restaurantId },
    });
    if (!category) throw new ForbiddenException("Category not found or access denied");
    return category;
  }

  private async audit(
    actorId: string,
    restaurantId: string,
    entityId: string,
    action: AuditAction,
    before: object | null,
    after: object | null,
  ) {
    await this.prisma.auditLogEntry.create({
      data: {
        actorUserId: actorId,
        restaurantId,
        entityType: "Category",
        entityId,
        action,
        beforeValue: before ?? undefined,
        afterValue: after ?? undefined,
      },
    });
  }
}
