import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { AuditAction, Status } from "@prisma/client";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTableDto } from "./dto/create-table.dto";
import { BulkCreateTableDto } from "./dto/bulk-create-table.dto";
import { UpdateTableDto } from "./dto/update-table.dto";

const TABLE_SELECT = {
  id: true,
  branchId: true,
  label: true,
  capacity: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  qrCodes: {
    where: { status: "ACTIVE" as const },
    select: { id: true, codeValue: true, status: true, generatedAt: true },
    take: 1,
  },
};

@Injectable()
export class TableService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create single table ──────────────────────────────────────────────────

  async create(
    branchId: string,
    restaurantId: string,
    dto: CreateTableDto,
    actorId: string,
  ) {
    await this.assertBranchOwnership(branchId, restaurantId);

    const table = await this.prisma.table.create({
      data: {
        branchId,
        label: dto.label,
        capacity: dto.capacity,
        qrCodes: { create: { codeValue: this.generateCode() } },
      },
      select: TABLE_SELECT,
    });

    await this.audit(actorId, restaurantId, table.id, AuditAction.CREATE, null, table);

    return table;
  }

  // ─── Bulk create tables ───────────────────────────────────────────────────

  async bulkCreate(
    branchId: string,
    restaurantId: string,
    dto: BulkCreateTableDto,
    actorId: string,
  ) {
    await this.assertBranchOwnership(branchId, restaurantId);

    if (dto.to < dto.from) {
      throw new BadRequestException("'to' must be greater than or equal to 'from'");
    }

    const count = dto.to - dto.from + 1;
    if (count > 100) {
      throw new BadRequestException("Cannot create more than 100 tables at once");
    }

    const tables = await this.prisma.$transaction(
      Array.from({ length: count }, (_, i) => {
        const num = dto.from + i;
        const label = `${dto.prefix} ${num}`;
        return this.prisma.table.create({
          data: {
            branchId,
            label,
            capacity: dto.capacity,
            qrCodes: { create: { codeValue: this.generateCode() } },
          },
          select: TABLE_SELECT,
        });
      }),
    );

    await this.audit(
      actorId,
      restaurantId,
      branchId,
      AuditAction.CREATE,
      null,
      { count: tables.length, prefix: dto.prefix },
    );

    return { created: tables.length, tables };
  }

  // ─── List tables of a branch ──────────────────────────────────────────────

  async findAll(branchId: string, restaurantId: string) {
    await this.assertBranchOwnership(branchId, restaurantId);

    return this.prisma.table.findMany({
      where: { branchId, status: { not: Status.ARCHIVED } },
      orderBy: { label: "asc" },
      select: TABLE_SELECT,
    });
  }

  // ─── Get one table ────────────────────────────────────────────────────────

  async findOne(tableId: string, restaurantId: string) {
    const table = await this.prisma.table.findFirst({
      where: {
        id: tableId,
        branch: { restaurantId },
      },
      select: TABLE_SELECT,
    });

    if (!table) throw new NotFoundException("Table not found");

    return table;
  }

  // ─── Update table ─────────────────────────────────────────────────────────

  async update(
    tableId: string,
    restaurantId: string,
    dto: UpdateTableDto,
    actorId: string,
  ) {
    const table = await this.assertTableOwnership(tableId, restaurantId);

    const updated = await this.prisma.table.update({
      where: { id: tableId },
      data: {
        ...(dto.label && { label: dto.label }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      },
      select: TABLE_SELECT,
    });

    await this.audit(actorId, restaurantId, tableId, AuditAction.UPDATE, table, updated);

    return updated;
  }

  // ─── Delete (soft delete + invalidate QR) ────────────────────────────────

  async remove(tableId: string, restaurantId: string, actorId: string) {
    const table = await this.assertTableOwnership(tableId, restaurantId);

    await this.prisma.$transaction([
      // Invalidate active QR code
      this.prisma.qRCode.updateMany({
        where: { tableId, status: "ACTIVE" },
        data: { status: "INVALIDATED" },
      }),
      // Soft delete table
      this.prisma.table.update({
        where: { id: tableId },
        data: { status: Status.ARCHIVED },
      }),
    ]);

    await this.audit(actorId, restaurantId, tableId, AuditAction.DELETE, table, null);

    return { message: "Table deleted and QR code invalidated" };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private generateCode(): string {
    return crypto.randomBytes(8).toString("hex");
  }

  async assertBranchOwnership(branchId: string, restaurantId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, restaurantId },
    });
    if (!branch) throw new ForbiddenException("Branch not found or access denied");
    return branch;
  }

  private async assertTableOwnership(tableId: string, restaurantId: string) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, branch: { restaurantId } },
    });
    if (!table) throw new ForbiddenException("Table not found or access denied");
    return table;
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
        entityType: "Table",
        entityId,
        action,
        beforeValue: before ?? undefined,
        afterValue: after ?? undefined,
      },
    });
  }
}
