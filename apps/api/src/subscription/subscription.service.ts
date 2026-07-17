import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { Status, SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { AssignSubscriptionDto } from "./dto/assign-subscription.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Plans (Super Admin) ──────────────────────────────────────────────────

  async createPlan(dto: CreatePlanDto) {
    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        price: dto.price,
        billingCycle: dto.billingCycle,
        featureLimits: dto.featureLimits as Prisma.InputJsonValue,
      },
    });
  }

  async findAllPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { status: { not: Status.ARCHIVED } },
      orderBy: { price: "asc" },
    });
  }

  async findOnePlan(planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException("Plan not found");
    return plan;
  }

  async updatePlan(planId: string, dto: UpdatePlanDto) {
    await this.findOnePlan(planId);
    return this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.billingCycle && { billingCycle: dto.billingCycle }),
        ...(dto.featureLimits && { featureLimits: dto.featureLimits as Prisma.InputJsonValue }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  // ─── Subscriptions (Super Admin) ──────────────────────────────────────────

  async assign(restaurantId: string, dto: AssignSubscriptionDto) {
    await this.findOnePlan(dto.planId);

    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException("Restaurant not found");

    // Upsert — one subscription per restaurant
    return this.prisma.subscription.upsert({
      where: { restaurantId },
      create: {
        restaurantId,
        planId: dto.planId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: SubscriptionStatus.ACTIVE,
      },
      update: {
        planId: dto.planId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: SubscriptionStatus.ACTIVE,
      },
      include: { plan: true },
    });
  }

  async cancelSubscription(restaurantId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { restaurantId } });
    if (!sub) throw new NotFoundException("No subscription found for this restaurant");

    return this.prisma.subscription.update({
      where: { restaurantId },
      data: { status: SubscriptionStatus.CANCELLED },
    });
  }

  async getSubscription(restaurantId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { restaurantId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException("No subscription found");
    return sub;
  }

  async findAllSubscriptions() {
    return this.prisma.subscription.findMany({
      include: {
        plan: { select: { name: true, billingCycle: true, price: true } },
        restaurant: { select: { displayName: true, legalName: true } },
      },
      orderBy: { endDate: "asc" },
    });
  }

  // ─── Own subscription (Restaurant Admin) ─────────────────────────────────

  async getMySubscription(restaurantId: string) {
    return this.getSubscription(restaurantId);
  }
}
