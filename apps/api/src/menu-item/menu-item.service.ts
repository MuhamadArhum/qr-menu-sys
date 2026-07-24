import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { AuditAction, AvailabilityStatus, Status } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CategoryService } from "../category/category.service";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { UpdateMenuItemDto } from "./dto/update-menu-item.dto";
import { UpdateAvailabilityDto } from "./dto/update-availability.dto";

const MENU_ITEM_SELECT = {
  id: true,
  restaurantId: true,
  categoryId: true,
  name: true,
  nameUr: true,
  description: true,
  descriptionUr: true,
  basePrice: true,
  imageUrl: true,
  calories: true,
  prepTimeMinutes: true,
  dietaryTags: true,
  ingredients: true,
  allergens: true,
  availability: true,
  status: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { variantGroups: true, addonGroups: true } },
};

@Injectable()
export class MenuItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: CategoryService,
  ) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(restaurantId: string, dto: CreateMenuItemDto, actorId: string) {
    await this.categoryService.assertOwnership(dto.categoryId, restaurantId);

    // ── Subscription limit check ──────────────────────────────────────────────
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
      include: { plan: true },
    });
    if (subscription?.plan?.featureLimits) {
      const limits = subscription.plan.featureLimits as Record<string, number> | null;
      const maxMenuItems = limits?.["maxMenuItems"];
      if (typeof maxMenuItems === "number" && maxMenuItems > 0) {
        const itemCount = await this.prisma.menuItem.count({
          where: { restaurantId, status: { not: Status.ARCHIVED } },
        });
        if (itemCount >= maxMenuItems) {
          throw new ForbiddenException("Menu item limit reached for your subscription plan");
        }
      }
    }

    const maxOrder = await this.prisma.menuItem.aggregate({
      where: { restaurantId, categoryId: dto.categoryId },
      _max: { sortOrder: true },
    });

    const item = await this.prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId: dto.categoryId,
        name: dto.name,
        nameUr: dto.nameUr,
        description: dto.description,
        descriptionUr: dto.descriptionUr,
        basePrice: dto.basePrice,
        imageUrl: dto.imageUrl,
        calories: dto.calories,
        prepTimeMinutes: dto.prepTimeMinutes,
        dietaryTags: dto.dietaryTags ?? [],
        ingredients: dto.ingredients ?? [],
        allergens: dto.allergens ?? [],
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      select: MENU_ITEM_SELECT,
    });

    await this.audit(actorId, restaurantId, item.id, AuditAction.CREATE, null, item);

    return item;
  }

  // ─── List by category ─────────────────────────────────────────────────────

  async findByCategory(categoryId: string, restaurantId: string) {
    await this.categoryService.assertOwnership(categoryId, restaurantId);

    return this.prisma.menuItem.findMany({
      where: { categoryId, restaurantId, status: { not: Status.ARCHIVED } },
      orderBy: { sortOrder: "asc" },
      select: MENU_ITEM_SELECT,
    });
  }

  // ─── List all for restaurant ──────────────────────────────────────────────

  async findAll(restaurantId: string) {
    return this.prisma.menuItem.findMany({
      where: { restaurantId, status: { not: Status.ARCHIVED } },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
      select: MENU_ITEM_SELECT,
    });
  }

  // ─── Get one ─────────────────────────────────────────────────────────────

  async findOne(itemId: string, restaurantId: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId },
      select: {
        ...MENU_ITEM_SELECT,
        variantGroups: {
          where: { status: { not: Status.ARCHIVED } },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            isRequired: true,
            minSelect: true,
            maxSelect: true,
            sortOrder: true,
            status: true,
            options: {
              where: { status: { not: Status.ARCHIVED } },
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                name: true,
                priceModifier: true,
                sortOrder: true,
                status: true,
              },
            },
          },
        },
        addonGroups: {
          where: { status: { not: Status.ARCHIVED } },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            isRequired: true,
            minSelect: true,
            maxSelect: true,
            sortOrder: true,
            status: true,
            options: {
              where: { status: { not: Status.ARCHIVED } },
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                name: true,
                price: true,
                sortOrder: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!item) throw new NotFoundException("Menu item not found");

    return item;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(
    itemId: string,
    restaurantId: string,
    dto: UpdateMenuItemDto,
    actorId: string,
  ) {
    const before = await this.assertOwnership(itemId, restaurantId);

    if (dto.categoryId) {
      await this.categoryService.assertOwnership(dto.categoryId, restaurantId);
    }

    const updated = await this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.nameUr !== undefined && { nameUr: dto.nameUr }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.descriptionUr !== undefined && { descriptionUr: dto.descriptionUr }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.calories !== undefined && { calories: dto.calories }),
        ...(dto.prepTimeMinutes !== undefined && { prepTimeMinutes: dto.prepTimeMinutes }),
        ...(dto.dietaryTags !== undefined && { dietaryTags: dto.dietaryTags }),
        ...(dto.ingredients !== undefined && { ingredients: dto.ingredients }),
        ...(dto.allergens !== undefined && { allergens: dto.allergens }),
      },
      select: MENU_ITEM_SELECT,
    });

    await this.audit(actorId, restaurantId, itemId, AuditAction.UPDATE, before, updated);

    return updated;
  }

  // ─── Update availability ──────────────────────────────────────────────────

  async updateAvailability(
    itemId: string,
    restaurantId: string,
    dto: UpdateAvailabilityDto,
    actorId: string,
  ) {
    const before = await this.assertOwnership(itemId, restaurantId);

    const updated = await this.prisma.menuItem.update({
      where: { id: itemId },
      data: { availability: dto.availability },
      select: MENU_ITEM_SELECT,
    });

    await this.audit(actorId, restaurantId, itemId, AuditAction.UPDATE, before, updated);

    return updated;
  }

  // ─── Toggle status ────────────────────────────────────────────────────────

  async toggleStatus(
    itemId: string,
    restaurantId: string,
    status: Status,
    actorId: string,
  ) {
    const before = await this.assertOwnership(itemId, restaurantId);

    const updated = await this.prisma.menuItem.update({
      where: { id: itemId },
      data: { status },
      select: MENU_ITEM_SELECT,
    });

    const action = status === Status.ACTIVE ? AuditAction.ACTIVATE : AuditAction.SUSPEND;
    await this.audit(actorId, restaurantId, itemId, action, before, updated);

    return updated;
  }

  // ─── Reorder within a category ────────────────────────────────────────────

  async reorder(restaurantId: string, categoryId: string, orderedIds: string[]) {
    await this.categoryService.assertOwnership(categoryId, restaurantId);

    const items = await this.prisma.menuItem.findMany({
      where: { id: { in: orderedIds }, restaurantId, categoryId },
    });

    if (items.length !== orderedIds.length) {
      throw new BadRequestException("Some item IDs are invalid or don't belong to this category");
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.menuItem.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );

    return { message: "Items reordered successfully" };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  async assertOwnership(itemId: string, restaurantId: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId },
    });
    if (!item) throw new ForbiddenException("Menu item not found or access denied");
    return item;
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
        entityType: "MenuItem",
        entityId,
        action,
        beforeValue: before ?? undefined,
        afterValue: after ?? undefined,
      },
    });
  }
}
