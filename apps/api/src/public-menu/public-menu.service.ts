import { Injectable, NotFoundException } from "@nestjs/common";
import { Status, AvailabilityStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { QRCodeService } from "../qr-code/qr-code.service";

@Injectable()
export class PublicMenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrCodeService: QRCodeService,
  ) {}

  async resolveMenu(codeValue: string) {
    const qrCode = await this.prisma.qRCode.findUnique({
      where: { codeValue },
      include: {
        table: {
          include: {
            branch: {
              include: {
                restaurant: {
                  select: {
                    id: true,
                    displayName: true,
                    logoUrl: true,
                    coverImageUrl: true,
                    description: true,
                    defaultCurrency: true,
                    defaultLanguage: true,
                    accentColor: true,
                    themeDefault: true,
                    taxRates: true,
                    serviceCharge: true,
                    serviceChargeEnabled: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!qrCode || qrCode.status !== "ACTIVE") {
      throw new NotFoundException("Invalid or expired QR code");
    }

    const { table } = qrCode;
    const { branch } = table;
    const { restaurant } = branch;

    // Log the scan (fire-and-forget)
    void this.qrCodeService.logScan(table.id);

    // Fetch full menu tree for this restaurant
    const categories = await this.prisma.category.findMany({
      where: {
        restaurantId: restaurant.id,
        parentCategoryId: null,
        status: { not: Status.ARCHIVED },
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        nameUr: true,
        imageUrl: true,
        sortOrder: true,
        children: {
          where: { status: { not: Status.ARCHIVED } },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            nameUr: true,
            imageUrl: true,
            sortOrder: true,
            menuItems: {
              where: {
                status: { not: Status.ARCHIVED },
                availability: { not: AvailabilityStatus.HIDDEN },
              },
              orderBy: { sortOrder: "asc" },
              select: itemSelect,
            },
          },
        },
        menuItems: {
          where: {
            status: { not: Status.ARCHIVED },
            availability: { not: AvailabilityStatus.HIDDEN },
          },
          orderBy: { sortOrder: "asc" },
          select: itemSelect,
        },
      },
    });

    return {
      restaurant,
      branch: {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        businessHours: branch.businessHours,
        taxOverride: branch.taxOverride ?? null,
        serviceChargeOverride: branch.serviceChargeOverride?.toString() ?? null,
        serviceChargeEnabled: branch.serviceChargeEnabled ?? null,
      },
      table: {
        id: table.id,
        label: table.label,
        capacity: table.capacity,
      },
      menu: categories,
    };
  }
}

const itemSelect = {
  id: true,
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
  sortOrder: true,
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
      options: {
        where: { status: { not: Status.ARCHIVED } },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          priceModifier: true,
          sortOrder: true,
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
      options: {
        where: { status: { not: Status.ARCHIVED } },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          price: true,
          sortOrder: true,
        },
      },
    },
  },
} as const;
