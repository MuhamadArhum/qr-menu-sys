import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { Status, AuditAction, Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { AssignManagerDto } from "./dto/assign-manager.dto";

const BRANCH_SELECT = {
  id: true,
  restaurantId: true,
  name: true,
  address: true,
  logoUrl: true,
  latitude: true,
  longitude: true,
  contactNumber: true,
  businessHours: true,
  taxOverride: true,
  serviceChargeOverride: true,
  serviceChargeEnabled: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { tables: true } },
  managers: { select: { id: true, email: true } },
};

@Injectable()
export class BranchService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(restaurantId: string, dto: CreateBranchDto, actorId: string) {
    // ── Subscription limit check ──────────────────────────────────────────────
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
      include: { plan: true },
    });
    if (subscription?.plan?.featureLimits) {
      const limits = subscription.plan.featureLimits as Record<string, number> | null;
      const maxBranches = limits?.["maxBranches"];
      if (typeof maxBranches === "number" && maxBranches > 0) {
        const branchCount = await this.prisma.branch.count({
          where: { restaurantId, status: { not: Status.ARCHIVED } },
        });
        if (branchCount >= maxBranches) {
          throw new ForbiddenException("Branch limit reached for your subscription plan");
        }
      }
    }

    const branch = await this.prisma.branch.create({
      data: {
        restaurantId,
        name: dto.name,
        address: dto.address,
        contactNumber: dto.contactNumber,
        latitude: dto.latitude,
        longitude: dto.longitude,
        businessHours: (dto.businessHours ?? this.defaultBusinessHours()) as unknown as Prisma.InputJsonValue,
      },
      select: BRANCH_SELECT,
    });

    await this.audit(actorId, restaurantId, branch.id, AuditAction.CREATE, null, branch);

    return branch;
  }

  // ─── List (scoped by role) ────────────────────────────────────────────────

  async findAll(restaurantId: string) {
    return this.prisma.branch.findMany({
      where: { restaurantId, status: { not: Status.ARCHIVED } },
      orderBy: { createdAt: "asc" },
      select: BRANCH_SELECT,
    });
  }

  // ─── Get one ─────────────────────────────────────────────────────────────

  async findOne(branchId: string, restaurantId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, restaurantId },
      select: BRANCH_SELECT,
    });

    if (!branch) throw new NotFoundException("Branch not found");

    return branch;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(
    branchId: string,
    restaurantId: string,
    dto: UpdateBranchDto,
    actorId: string,
  ) {
    await this.assertOwnership(branchId, restaurantId);

    const updated = await this.prisma.branch.update({
      where: { id: branchId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.address && { address: dto.address }),
        ...(dto.contactNumber !== undefined && { contactNumber: dto.contactNumber }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.businessHours !== undefined && {
          businessHours: dto.businessHours as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.taxOverride !== undefined && {
          taxOverride: dto.taxOverride as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.serviceChargeOverride !== undefined && {
          serviceChargeOverride: dto.serviceChargeOverride,
        }),
        ...(dto.serviceChargeEnabled !== undefined && {
          serviceChargeEnabled: dto.serviceChargeEnabled,
        }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      },
      select: BRANCH_SELECT,
    });

    await this.audit(actorId, restaurantId, branchId, AuditAction.UPDATE, null, updated);

    return updated;
  }

  // ─── Toggle status ────────────────────────────────────────────────────────

  async toggleStatus(
    branchId: string,
    restaurantId: string,
    status: Status,
    actorId: string,
  ) {
    await this.assertOwnership(branchId, restaurantId);

    const updated = await this.prisma.branch.update({
      where: { id: branchId },
      data: { status },
      select: BRANCH_SELECT,
    });

    const action =
      status === Status.ACTIVE ? AuditAction.ACTIVATE : AuditAction.SUSPEND;

    await this.audit(actorId, restaurantId, branchId, action, null, updated);

    return updated;
  }

  // ─── Assign branch manager ────────────────────────────────────────────────

  async assignManager(
    branchId: string,
    restaurantId: string,
    dto: AssignManagerDto,
    actorId: string,
  ) {
    await this.assertOwnership(branchId, restaurantId);

    const manager = await this.prisma.user.findFirst({
      where: {
        id: dto.managerId,
        restaurantId,
        role: UserRole.BRANCH_MANAGER,
        status: Status.ACTIVE,
      },
    });

    if (!manager) {
      throw new NotFoundException(
        "Branch Manager not found in this restaurant",
      );
    }

    const updated = await this.prisma.branch.update({
      where: { id: branchId },
      data: { managers: { connect: { id: dto.managerId } } },
      select: BRANCH_SELECT,
    });

    await this.audit(actorId, restaurantId, branchId, AuditAction.UPDATE, null, updated);

    return updated;
  }

  // ─── Remove branch manager ────────────────────────────────────────────────

  async removeManager(
    branchId: string,
    restaurantId: string,
    managerId: string,
    actorId: string,
  ) {
    await this.assertOwnership(branchId, restaurantId);

    const updated = await this.prisma.branch.update({
      where: { id: branchId },
      data: { managers: { disconnect: { id: managerId } } },
      select: BRANCH_SELECT,
    });

    await this.audit(actorId, restaurantId, branchId, AuditAction.UPDATE, null, updated);

    return updated;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  async assertOwnership(branchId: string, restaurantId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, restaurantId },
    });
    if (!branch) throw new ForbiddenException("Branch not found or access denied");
    return branch;
  }

  private defaultBusinessHours() {
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    return days.map((day) => ({
      day,
      isOpen: day !== "sun",
      shifts: [{ open: "09:00", close: "22:00" }],
    }));
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
        entityType: "Branch",
        entityId,
        action,
        beforeValue: before ?? undefined,
        afterValue: after ?? undefined,
      },
    });
  }
}
