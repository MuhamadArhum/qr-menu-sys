import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { AuditAction, Status } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MenuItemService } from "../menu-item/menu-item.service";
import { CreateAddonGroupDto } from "./dto/create-addon-group.dto";
import { UpdateAddonGroupDto } from "./dto/update-addon-group.dto";
import { CreateAddonOptionDto } from "./dto/create-addon-option.dto";
import { UpdateAddonOptionDto } from "./dto/update-addon-option.dto";

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
  addonGroupId: true,
  name: true,
  price: true,
  sortOrder: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class AddonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly menuItemService: MenuItemService,
  ) {}

  // ─── Groups ───────────────────────────────────────────────────────────────

  async createGroup(restaurantId: string, dto: CreateAddonGroupDto, actorId: string) {
    await this.menuItemService.assertOwnership(dto.menuItemId, restaurantId);

    const maxOrder = await this.prisma.addonGroup.aggregate({
      where: { menuItemId: dto.menuItemId },
      _max: { sortOrder: true },
    });

    const group = await this.prisma.addonGroup.create({
      data: {
        menuItemId: dto.menuItemId,
        name: dto.name,
        isRequired: dto.isRequired ?? false,
        minSelect: dto.minSelect ?? 0,
        maxSelect: dto.maxSelect ?? 10,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      select: GROUP_SELECT,
    });

    await this.audit(actorId, restaurantId, group.id, "AddonGroup", AuditAction.CREATE, null, group);

    return group;
  }

  async findGroups(menuItemId: string, restaurantId: string) {
    await this.menuItemService.assertOwnership(menuItemId, restaurantId);

    return this.prisma.addonGroup.findMany({
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
    dto: UpdateAddonGroupDto,
    actorId: string,
  ) {
    const before = await this.assertGroupOwnership(groupId, restaurantId);

    const updated = await this.prisma.addonGroup.update({
      where: { id: groupId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
        ...(dto.minSelect !== undefined && { minSelect: dto.minSelect }),
        ...(dto.maxSelect !== undefined && { maxSelect: dto.maxSelect }),
      },
      select: GROUP_SELECT,
    });

    await this.audit(actorId, restaurantId, groupId, "AddonGroup", AuditAction.UPDATE, before, updated);

    return updated;
  }

  async archiveGroup(groupId: string, restaurantId: string, actorId: string) {
    const before = await this.assertGroupOwnership(groupId, restaurantId);

    const updated = await this.prisma.addonGroup.update({
      where: { id: groupId },
      data: { status: Status.ARCHIVED },
      select: GROUP_SELECT,
    });

    await this.audit(actorId, restaurantId, groupId, "AddonGroup", AuditAction.DELETE, before, updated);

    return updated;
  }

  async reorderGroups(menuItemId: string, restaurantId: string, orderedIds: string[]) {
    await this.menuItemService.assertOwnership(menuItemId, restaurantId);

    const groups = await this.prisma.addonGroup.findMany({
      where: { id: { in: orderedIds }, menuItemId },
    });

    if (groups.length !== orderedIds.length) {
      throw new BadRequestException("Some group IDs are invalid");
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.addonGroup.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );

    return { message: "Addon groups reordered successfully" };
  }

  // ─── Options ─────────────────────────────────────────────────────────────

  async createOption(
    groupId: string,
    restaurantId: string,
    dto: CreateAddonOptionDto,
    actorId: string,
  ) {
    await this.assertGroupOwnership(groupId, restaurantId);

    const maxOrder = await this.prisma.addonOption.aggregate({
      where: { addonGroupId: groupId },
      _max: { sortOrder: true },
    });

    const option = await this.prisma.addonOption.create({
      data: {
        addonGroupId: groupId,
        name: dto.name,
        price: dto.price ?? 0,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      select: OPTION_SELECT,
    });

    await this.audit(actorId, restaurantId, option.id, "AddonOption", AuditAction.CREATE, null, option);

    return option;
  }

  async updateOption(
    optionId: string,
    restaurantId: string,
    dto: UpdateAddonOptionDto,
    actorId: string,
  ) {
    const before = await this.assertOptionOwnership(optionId, restaurantId);

    const updated = await this.prisma.addonOption.update({
      where: { id: optionId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.price !== undefined && { price: dto.price }),
      },
      select: OPTION_SELECT,
    });

    await this.audit(actorId, restaurantId, optionId, "AddonOption", AuditAction.UPDATE, before, updated);

    return updated;
  }

  async archiveOption(optionId: string, restaurantId: string, actorId: string) {
    const before = await this.assertOptionOwnership(optionId, restaurantId);

    const updated = await this.prisma.addonOption.update({
      where: { id: optionId },
      data: { status: Status.ARCHIVED },
      select: OPTION_SELECT,
    });

    await this.audit(actorId, restaurantId, optionId, "AddonOption", AuditAction.DELETE, before, updated);

    return updated;
  }

  async reorderOptions(groupId: string, restaurantId: string, orderedIds: string[]) {
    await this.assertGroupOwnership(groupId, restaurantId);

    const options = await this.prisma.addonOption.findMany({
      where: { id: { in: orderedIds }, addonGroupId: groupId },
    });

    if (options.length !== orderedIds.length) {
      throw new BadRequestException("Some option IDs are invalid");
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.addonOption.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );

    return { message: "Addon options reordered successfully" };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  async assertGroupOwnership(groupId: string, restaurantId: string) {
    const group = await this.prisma.addonGroup.findFirst({
      where: { id: groupId, menuItem: { is: { restaurantId } } },
    });
    if (!group) throw new ForbiddenException("Addon group not found or access denied");
    return group;
  }

  private async assertOptionOwnership(optionId: string, restaurantId: string) {
    const option = await this.prisma.addonOption.findFirst({
      where: { id: optionId, addonGroup: { is: { menuItem: { is: { restaurantId } } } } },
    });
    if (!option) throw new ForbiddenException("Addon option not found or access denied");
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
