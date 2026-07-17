import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { AuditAction, Status } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MenuItemService } from "../menu-item/menu-item.service";
import { CreateVariantGroupDto } from "./dto/create-variant-group.dto";
import { UpdateVariantGroupDto } from "./dto/update-variant-group.dto";
import { CreateVariantOptionDto } from "./dto/create-variant-option.dto";
import { UpdateVariantOptionDto } from "./dto/update-variant-option.dto";

const GROUP_SELECT = {
  id: true,
  menuItemId: true,
  name: true,
  isRequired: true,
  minSelect: true,
  maxSelect: true,
  sortOrder: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const OPTION_SELECT = {
  id: true,
  variantGroupId: true,
  name: true,
  priceModifier: true,
  sortOrder: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class VariantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly menuItemService: MenuItemService,
  ) {}

  // ─── Groups ───────────────────────────────────────────────────────────────

  async createGroup(restaurantId: string, dto: CreateVariantGroupDto, actorId: string) {
    await this.menuItemService.assertOwnership(dto.menuItemId, restaurantId);

    const maxOrder = await this.prisma.variantGroup.aggregate({
      where: { menuItemId: dto.menuItemId },
      _max: { sortOrder: true },
    });

    const group = await this.prisma.variantGroup.create({
      data: {
        menuItemId: dto.menuItemId,
        name: dto.name,
        isRequired: dto.isRequired ?? true,
        minSelect: dto.minSelect ?? 1,
        maxSelect: dto.maxSelect ?? 1,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      select: GROUP_SELECT,
    });

    await this.audit(actorId, restaurantId, group.id, "VariantGroup", AuditAction.CREATE, null, group);

    return group;
  }

  async findGroups(menuItemId: string, restaurantId: string) {
    await this.menuItemService.assertOwnership(menuItemId, restaurantId);

    return this.prisma.variantGroup.findMany({
      where: { menuItemId, status: { not: Status.ARCHIVED } },
      orderBy: { sortOrder: "asc" },
      select: {
        ...GROUP_SELECT,
        options: {
          where: { status: { not: Status.ARCHIVED } },
          orderBy: { sortOrder: "asc" },
          select: OPTION_SELECT,
        },
      },
    });
  }

  async updateGroup(
    groupId: string,
    restaurantId: string,
    dto: UpdateVariantGroupDto,
    actorId: string,
  ) {
    const before = await this.assertGroupOwnership(groupId, restaurantId);

    const updated = await this.prisma.variantGroup.update({
      where: { id: groupId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
        ...(dto.minSelect !== undefined && { minSelect: dto.minSelect }),
        ...(dto.maxSelect !== undefined && { maxSelect: dto.maxSelect }),
      },
      select: GROUP_SELECT,
    });

    await this.audit(actorId, restaurantId, groupId, "VariantGroup", AuditAction.UPDATE, before, updated);

    return updated;
  }

  async archiveGroup(groupId: string, restaurantId: string, actorId: string) {
    const before = await this.assertGroupOwnership(groupId, restaurantId);

    const updated = await this.prisma.variantGroup.update({
      where: { id: groupId },
      data: { status: Status.ARCHIVED },
      select: GROUP_SELECT,
    });

    await this.audit(actorId, restaurantId, groupId, "VariantGroup", AuditAction.DELETE, before, updated);

    return updated;
  }

  async reorderGroups(menuItemId: string, restaurantId: string, orderedIds: string[]) {
    await this.menuItemService.assertOwnership(menuItemId, restaurantId);

    const groups = await this.prisma.variantGroup.findMany({
      where: { id: { in: orderedIds }, menuItemId },
    });

    if (groups.length !== orderedIds.length) {
      throw new BadRequestException("Some group IDs are invalid");
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.variantGroup.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );

    return { message: "Variant groups reordered successfully" };
  }

  // ─── Options ─────────────────────────────────────────────────────────────

  async createOption(
    groupId: string,
    restaurantId: string,
    dto: CreateVariantOptionDto,
    actorId: string,
  ) {
    await this.assertGroupOwnership(groupId, restaurantId);

    const maxOrder = await this.prisma.variantOption.aggregate({
      where: { variantGroupId: groupId },
      _max: { sortOrder: true },
    });

    const option = await this.prisma.variantOption.create({
      data: {
        variantGroupId: groupId,
        name: dto.name,
        priceModifier: dto.priceModifier ?? 0,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      select: OPTION_SELECT,
    });

    await this.audit(actorId, restaurantId, option.id, "VariantOption", AuditAction.CREATE, null, option);

    return option;
  }

  async updateOption(
    optionId: string,
    restaurantId: string,
    dto: UpdateVariantOptionDto,
    actorId: string,
  ) {
    const before = await this.assertOptionOwnership(optionId, restaurantId);

    const updated = await this.prisma.variantOption.update({
      where: { id: optionId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.priceModifier !== undefined && { priceModifier: dto.priceModifier }),
      },
      select: OPTION_SELECT,
    });

    await this.audit(actorId, restaurantId, optionId, "VariantOption", AuditAction.UPDATE, before, updated);

    return updated;
  }

  async archiveOption(optionId: string, restaurantId: string, actorId: string) {
    const before = await this.assertOptionOwnership(optionId, restaurantId);

    const updated = await this.prisma.variantOption.update({
      where: { id: optionId },
      data: { status: Status.ARCHIVED },
      select: OPTION_SELECT,
    });

    await this.audit(actorId, restaurantId, optionId, "VariantOption", AuditAction.DELETE, before, updated);

    return updated;
  }

  async reorderOptions(groupId: string, restaurantId: string, orderedIds: string[]) {
    await this.assertGroupOwnership(groupId, restaurantId);

    const options = await this.prisma.variantOption.findMany({
      where: { id: { in: orderedIds }, variantGroupId: groupId },
    });

    if (options.length !== orderedIds.length) {
      throw new BadRequestException("Some option IDs are invalid");
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.variantOption.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );

    return { message: "Variant options reordered successfully" };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  async assertGroupOwnership(groupId: string, restaurantId: string) {
    const group = await this.prisma.variantGroup.findFirst({
      where: { id: groupId, menuItem: { is: { restaurantId } } },
    });
    if (!group) throw new ForbiddenException("Variant group not found or access denied");
    return group;
  }

  private async assertOptionOwnership(optionId: string, restaurantId: string) {
    const option = await this.prisma.variantOption.findFirst({
      where: { id: optionId, variantGroup: { is: { menuItem: { is: { restaurantId } } } } },
    });
    if (!option) throw new ForbiddenException("Variant option not found or access denied");
    return option;
  }

  private async audit(
    actorId: string,
    restaurantId: string,
    entityId: string,
    entityType: string,
    action: AuditAction,
    before: object | null,
    after: object | null,
  ) {
    await this.prisma.auditLogEntry.create({
      data: {
        actorUserId: actorId,
        restaurantId,
        entityType,
        entityId,
        action,
        beforeValue: before ?? undefined,
        afterValue: after ?? undefined,
      },
    });
  }
}
