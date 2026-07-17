import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    // 1. Validate QR code and get table/branch/restaurant
    const qrCode = await this.prisma.qRCode.findUnique({
      where: { codeValue: dto.codeValue },
      include: { table: { include: { branch: true } } },
    });
    if (!qrCode || qrCode.status !== "ACTIVE") throw new BadRequestException("Invalid or expired QR code");
    if (qrCode.tableId !== dto.tableId) throw new BadRequestException("QR code does not match table");

    const { table } = qrCode;
    const { branch } = table;

    // 2. Validate all menu items exist and calculate totals
    const menuItemIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, restaurantId: branch.restaurantId, status: { not: "ARCHIVED" } },
    });
    if (menuItems.length !== menuItemIds.length) throw new BadRequestException("One or more menu items not found");

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    // 3. Calculate totals
    let totalAmount = 0;
    const orderItems = dto.items.map((item) => {
      const menuItem = menuItemMap.get(item.menuItemId)!;
      const base = Number(menuItem.basePrice);
      const variantExtra = (item.selectedVariants ?? []).reduce((s, v) => s + v.priceModifier, 0);
      const addonExtra = (item.selectedAddons ?? []).reduce((s, a) => s + a.price, 0);
      const itemTotal = (base + variantExtra + addonExtra) * item.quantity;
      totalAmount += itemTotal;
      return {
        menuItemId: item.menuItemId,
        menuItemName: menuItem.name,
        basePrice: base,
        quantity: item.quantity,
        selectedVariants: (item.selectedVariants ?? []) as any,
        selectedAddons: (item.selectedAddons ?? []) as any,
        itemTotal,
        note: item.note,
      };
    });

    // 4. Create order
    return this.prisma.order.create({
      data: {
        restaurantId: branch.restaurantId,
        branchId: branch.id,
        tableId: table.id,
        note: dto.note,
        totalAmount,
        items: { create: orderItems },
      },
      include: { items: true, table: { select: { label: true } } },
    });
  }

  async findAll(restaurantId: string, branchId?: string, status?: string) {
    return this.prisma.order.findMany({
      where: {
        restaurantId,
        ...(branchId && { branchId }),
        status: status ? (status as any) : { not: "SERVED" as any },
      },
      include: {
        items: true,
        table: { select: { id: true, label: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async findAllForKitchen(restaurantId: string, branchId?: string) {
    return this.prisma.order.findMany({
      where: {
        restaurantId,
        ...(branchId && { branchId }),
        status: { in: ["PENDING", "CONFIRMED", "PREPARING"] as any[] },
      },
      include: {
        items: true,
        table: { select: { id: true, label: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async updateStatus(orderId: string, restaurantId: string, status: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) throw new NotFoundException("Order not found");
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
      include: { items: true, table: { select: { label: true } } },
    });
  }

  async getOrdersByTable(tableId: string) {
    return this.prisma.order.findMany({
      where: { tableId, status: { not: "CANCELLED" as any } },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  }
}
