import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueryAuditDto } from "./dto/query-audit.dto";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: QueryAuditDto, restrictToRestaurantId?: string) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(restrictToRestaurantId
        ? { restaurantId: restrictToRestaurantId }
        : dto.restaurantId
          ? { restaurantId: dto.restaurantId }
          : {}),
      ...(dto.entityType && { entityType: dto.entityType }),
      ...(dto.entityId && { entityId: dto.entityId }),
      ...(dto.action && { action: dto.action }),
      ...(dto.from || dto.to
        ? {
            createdAt: {
              ...(dto.from && { gte: new Date(dto.from) }),
              ...(dto.to && { lte: new Date(dto.to) }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLogEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          entityType: true,
          entityId: true,
          action: true,
          beforeValue: true,
          afterValue: true,
          createdAt: true,
          actor: { select: { id: true, email: true, role: true } },
          restaurant: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.auditLogEntry.count({ where }),
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
}
