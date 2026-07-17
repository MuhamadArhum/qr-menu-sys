import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { Status, AuditAction, Prisma, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateRestaurantDto } from "./dto/update-restaurant.dto";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { QueryRestaurantsDto } from "./dto/query-restaurants.dto";
import { CreateRestaurantDto } from "./dto/create-restaurant.dto";
import { CreateStaffDto } from "./dto/create-staff.dto";
import { UpdateStaffDto } from "./dto/update-staff.dto";

// Fields returned on every restaurant fetch
const RESTAURANT_SELECT = {
  id: true,
  legalName: true,
  displayName: true,
  logoUrl: true,
  coverImageUrl: true,
  description: true,
  cuisineType: true,
  socialLinks: true,
  defaultCurrency: true,
  defaultLanguage: true,
  taxRates: true,
  serviceCharge: true,
  serviceChargeEnabled: true,
  themeDefault: true,
  accentColor: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  subscription: {
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      plan: { select: { name: true, billingCycle: true } },
    },
  },
  _count: {
    select: { branches: true, categories: true, users: true },
  },
};

@Injectable()
export class RestaurantService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Restaurant Admin: Get own restaurant ────────────────────────────────

  async findMine(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: RESTAURANT_SELECT,
    });

    if (!restaurant) throw new NotFoundException("Restaurant not found");

    return restaurant;
  }

  // ─── Restaurant Admin: Update profile ────────────────────────────────────

  async updateProfile(
    restaurantId: string,
    dto: UpdateRestaurantDto,
    actorId: string,
  ) {
    const before = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!before) throw new NotFoundException("Restaurant not found");

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        ...(dto.displayName && { displayName: dto.displayName }),
        ...(dto.legalName && { legalName: dto.legalName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.cuisineType !== undefined && { cuisineType: dto.cuisineType }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
        ...(dto.socialLinks !== undefined && { socialLinks: dto.socialLinks }),
        ...(dto.defaultCurrency && { defaultCurrency: dto.defaultCurrency }),
        ...(dto.defaultLanguage && { defaultLanguage: dto.defaultLanguage }),
      },
      select: RESTAURANT_SELECT,
    });

    await this.writeAuditLog({
      actorId,
      restaurantId,
      entityType: "Restaurant",
      entityId: restaurantId,
      action: AuditAction.UPDATE,
      before,
      after: updated,
    });

    return updated;
  }

  // ─── Restaurant Admin: Update settings ───────────────────────────────────

  async updateSettings(
    restaurantId: string,
    dto: UpdateSettingsDto,
    actorId: string,
  ) {
    const before = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!before) throw new NotFoundException("Restaurant not found");

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        ...(dto.taxRates !== undefined && {
          taxRates: dto.taxRates as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.serviceCharge !== undefined && { serviceCharge: dto.serviceCharge }),
        ...(dto.serviceChargeEnabled !== undefined && {
          serviceChargeEnabled: dto.serviceChargeEnabled,
        }),
        ...(dto.themeDefault !== undefined && { themeDefault: dto.themeDefault }),
        ...(dto.accentColor !== undefined && { accentColor: dto.accentColor }),
      },
      select: RESTAURANT_SELECT,
    });

    await this.writeAuditLog({
      actorId,
      restaurantId,
      entityType: "Restaurant",
      entityId: restaurantId,
      action: AuditAction.UPDATE,
      before,
      after: updated,
    });

    return updated;
  }

  // ─── Super Admin: Create restaurant directly (ACTIVE) ────────────────────

  async createByAdmin(dto: CreateRestaurantDto, actorId: string) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail.toLowerCase() },
    });

    if (exists) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          legalName: dto.legalName,
          displayName: dto.displayName,
          status: "ACTIVE",
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.adminEmail.toLowerCase(),
          passwordHash,
          role: UserRole.RESTAURANT_ADMIN,
          restaurantId: restaurant.id,
          status: "ACTIVE",
        },
      });

      return { restaurant, user };
    });

    await this.writeAuditLog({
      actorId,
      restaurantId: result.restaurant.id,
      entityType: "Restaurant",
      entityId: result.restaurant.id,
      action: AuditAction.CREATE,
      before: null,
      after: result.restaurant,
    });

    return {
      message: "Restaurant created successfully.",
      restaurantId: result.restaurant.id,
      adminEmail: result.user.email,
    };
  }

  // ─── Super Admin: List all restaurants ───────────────────────────────────

  async findAll(query: QueryRestaurantsDto) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { displayName: { contains: search, mode: "insensitive" as const } },
          { legalName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.restaurant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          displayName: true,
          legalName: true,
          logoUrl: true,
          status: true,
          defaultCurrency: true,
          createdAt: true,
          subscription: {
            select: {
              status: true,
              endDate: true,
              plan: { select: { name: true, billingCycle: true } },
            },
          },
          _count: { select: { branches: true } },
        },
      }),
      this.prisma.restaurant.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Super Admin: Get one restaurant ─────────────────────────────────────

  async findOne(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: RESTAURANT_SELECT,
    });

    if (!restaurant) throw new NotFoundException("Restaurant not found");

    return restaurant;
  }

  // ─── Super Admin: Change restaurant status ────────────────────────────────

  async updateStatus(
    restaurantId: string,
    dto: UpdateStatusDto,
    actorId: string,
  ) {
    const before = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!before) throw new NotFoundException("Restaurant not found");

    const action =
      dto.status === Status.ACTIVE
        ? AuditAction.ACTIVATE
        : dto.status === Status.ARCHIVED
          ? AuditAction.DELETE
          : AuditAction.SUSPEND;

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { status: dto.status },
      select: RESTAURANT_SELECT,
    });

    await this.writeAuditLog({
      actorId,
      restaurantId,
      entityType: "Restaurant",
      entityId: restaurantId,
      action,
      before,
      after: updated,
    });

    return updated;
  }

  // ─── Super Admin: Approve pending restaurant ──────────────────────────────

  async approve(restaurantId: string, actorId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { users: { where: { role: "RESTAURANT_ADMIN" }, take: 1 } },
    });

    if (!restaurant) throw new NotFoundException("Restaurant not found");

    if (restaurant.status !== Status.INACTIVE) {
      throw new ForbiddenException("Only inactive restaurants can be approved");
    }

    await this.prisma.$transaction([
      this.prisma.restaurant.update({
        where: { id: restaurantId },
        data: { status: Status.ACTIVE },
      }),
      // Activate the restaurant admin user as well
      this.prisma.user.updateMany({
        where: { restaurantId, status: "INACTIVE" },
        data: { status: "ACTIVE" },
      }),
    ]);

    await this.writeAuditLog({
      actorId,
      restaurantId,
      entityType: "Restaurant",
      entityId: restaurantId,
      action: AuditAction.APPROVE,
      before: restaurant,
      after: { ...restaurant, status: Status.ACTIVE },
    });

    return { message: "Restaurant approved successfully" };
  }

  // ─── Restaurant Admin: Staff Management ──────────────────────────────────

  async listStaff(restaurantId: string) {
    return this.prisma.user.findMany({
      where: {
        restaurantId,
        role: { in: ["BRANCH_MANAGER", "STAFF"] },
        status: { not: "ARCHIVED" },
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        managedBranches: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async createStaff(restaurantId: string, dto: CreateStaffDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) throw new ConflictException("Email already in use");

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
        restaurantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async updateStaff(
    restaurantId: string,
    staffId: string,
    dto: UpdateStaffDto,
  ) {
    const staff = await this.prisma.user.findFirst({
      where: { id: staffId, restaurantId },
    });

    if (!staff) throw new NotFoundException("Staff member not found");

    return this.prisma.user.update({
      where: { id: staffId },
      data: {
        ...(dto.role && { role: dto.role }),
        ...(dto.status && { status: dto.status }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async removeStaff(restaurantId: string, staffId: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id: staffId, restaurantId },
    });

    if (!staff) throw new NotFoundException("Staff member not found");

    await this.prisma.user.update({
      where: { id: staffId },
      data: { status: "ARCHIVED" },
    });

    return { message: "Staff member removed" };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async writeAuditLog(params: {
    actorId: string;
    restaurantId: string;
    entityType: string;
    entityId: string;
    action: AuditAction;
    before: object | null;
    after: object | null;
  }) {
    await this.prisma.auditLogEntry.create({
      data: {
        actorUserId: params.actorId,
        restaurantId: params.restaurantId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        beforeValue: params.before ?? undefined,
        afterValue: params.after ?? undefined,
      },
    });
  }
}
