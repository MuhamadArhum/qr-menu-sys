import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── QR Scan stats ────────────────────────────────────────────────────────

  async getQRScanStats(
    restaurantId: string,
    from?: string,
    to?: string,
  ) {
    const dateFilter = this.buildDateFilter(from, to);

    // Total scans per table
    const scansByTable = await this.prisma.qRScanEvent.groupBy({
      by: ["tableId"],
      where: {
        scannedAt: dateFilter,
        table: { branch: { restaurantId } },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const tableIds = scansByTable.map((s) => s.tableId);
    const tables = await this.prisma.table.findMany({
      where: { id: { in: tableIds } },
      select: { id: true, label: true, branch: { select: { id: true, name: true } } },
    });

    const tableMap = Object.fromEntries(tables.map((t) => [t.id, t]));

    // Total scans per branch
    const scansByBranch = await this.prisma.qRScanEvent.groupBy({
      by: ["tableId"],
      where: {
        scannedAt: dateFilter,
        table: { branch: { restaurantId } },
      },
      _count: { id: true },
    });

    const branchTotals: Record<string, number> = {};
    for (const s of scansByBranch) {
      const table = tableMap[s.tableId];
      if (table) {
        const branchId = table.branch.id;
        branchTotals[branchId] = (branchTotals[branchId] ?? 0) + s._count.id;
      }
    }

    // Daily scan counts (last 30 days if no range provided)
    const effectiveFrom = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const effectiveTo = to ? new Date(to) : new Date();

    const dailyScans = await this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT DATE_TRUNC('day', "scanned_at") as day, COUNT(*) as count
      FROM qr_scan_events qse
      JOIN tables t ON t.id = qse.table_id
      JOIN branches b ON b.id = t.branch_id
      WHERE b.restaurant_id = ${restaurantId}
        AND qse.scanned_at >= ${effectiveFrom}
        AND qse.scanned_at <= ${effectiveTo}
      GROUP BY day
      ORDER BY day ASC
    `;

    const totalScans = scansByTable.reduce((sum, s) => sum + s._count.id, 0);

    return {
      totalScans,
      byTable: scansByTable.map((s) => ({
        tableId: s.tableId,
        label: tableMap[s.tableId]?.label ?? "Unknown",
        branchName: tableMap[s.tableId]?.branch.name ?? "Unknown",
        count: s._count.id,
      })),
      byBranch: Object.entries(branchTotals).map(([branchId, count]) => {
        const branch = tables.find((t) => t.branch.id === branchId)?.branch;
        return { branchId, branchName: branch?.name ?? "Unknown", count };
      }),
      daily: dailyScans.map((d) => ({
        day: d.day,
        count: Number(d.count),
      })),
    };
  }

  // ─── Menu summary ─────────────────────────────────────────────────────────

  async getMenuSummary(restaurantId: string) {
    const [categoryCount, itemCount, variantGroupCount, addonGroupCount] = await Promise.all([
      this.prisma.category.count({ where: { restaurantId, status: "ACTIVE" } }),
      this.prisma.menuItem.count({ where: { restaurantId, status: "ACTIVE" } }),
      this.prisma.variantGroup.count({
        where: { menuItem: { is: { restaurantId } }, status: "ACTIVE" },
      }),
      this.prisma.addonGroup.count({
        where: { menuItem: { is: { restaurantId } }, status: "ACTIVE" },
      }),
    ]);

    const itemsByAvailability = await this.prisma.menuItem.groupBy({
      by: ["availability"],
      where: { restaurantId, status: "ACTIVE" },
      _count: { id: true },
    });

    return {
      categories: categoryCount,
      menuItems: itemCount,
      variantGroups: variantGroupCount,
      addonGroups: addonGroupCount,
      availability: itemsByAvailability.map((a) => ({
        status: a.availability,
        count: a._count.id,
      })),
    };
  }

  // ─── Overview (Super Admin) ───────────────────────────────────────────────

  async getPlatformOverview() {
    const [
      restaurantCount,
      branchCount,
      tableCount,
      totalScans,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.restaurant.count({ where: { status: "ACTIVE" } }),
      this.prisma.branch.count({ where: { status: "ACTIVE" } }),
      this.prisma.table.count({ where: { status: "ACTIVE" } }),
      this.prisma.qRScanEvent.count(),
      this.prisma.subscription.count({ where: { status: "ACTIVE" } }),
    ]);

    return {
      restaurants: restaurantCount,
      branches: branchCount,
      tables: tableCount,
      totalQRScans: totalScans,
      activeSubscriptions,
    };
  }

  // ─── Revenue stats ────────────────────────────────────────────────────────

  async getRevenueStats(restaurantId: string, from?: string, to?: string) {
    const dateFilter = this.buildDateFilter(from, to);
    const where = {
      restaurantId,
      status: "SERVED" as const,
      ...(dateFilter && { createdAt: dateFilter }),
    };

    const [totals, byBranch] = await Promise.all([
      this.prisma.order.aggregate({
        where,
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.order.groupBy({
        by: ["branchId"],
        where,
        _sum: { totalAmount: true },
        _count: { id: true },
        orderBy: { _sum: { totalAmount: "desc" } },
      }),
    ]);

    const branchIds = byBranch.map((b) => b.branchId);
    const branches = await this.prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, name: true },
    });
    const branchMap = Object.fromEntries(branches.map((b) => [b.id, b]));

    const effectiveFrom = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const effectiveTo = to ? new Date(to) : new Date();

    const dailyRevenue = await this.prisma.$queryRaw<
      { day: Date; revenue: number; orders: bigint }[]
    >`
      SELECT
        DATE_TRUNC('day', created_at) AS day,
        SUM(total_amount)             AS revenue,
        COUNT(*)                      AS orders
      FROM orders
      WHERE restaurant_id = ${restaurantId}
        AND status = 'SERVED'
        AND created_at >= ${effectiveFrom}
        AND created_at <= ${effectiveTo}
      GROUP BY day
      ORDER BY day ASC
    `;

    return {
      totalRevenue: Number(totals._sum.totalAmount ?? 0),
      totalOrders: totals._count.id,
      byBranch: byBranch.map((b) => ({
        branchId: b.branchId,
        branchName: branchMap[b.branchId]?.name ?? "Unknown",
        revenue: Number(b._sum.totalAmount ?? 0),
        orders: b._count.id,
      })),
      daily: dailyRevenue.map((d) => ({
        day: d.day,
        revenue: Number(d.revenue),
        orders: Number(d.orders),
      })),
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private buildDateFilter(from?: string, to?: string) {
    if (!from && !to) return undefined;
    return {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }
}
