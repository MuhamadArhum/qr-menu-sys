import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { MailModule } from "./mail/mail.module";
import { AuthModule } from "./auth/auth.module";
import { RestaurantModule } from "./restaurant/restaurant.module";
import { BranchModule } from "./branch/branch.module";
import { TableModule } from "./table/table.module";
import { QRCodeModule } from "./qr-code/qr-code.module";
import { CategoryModule } from "./category/category.module";
import { MenuItemModule } from "./menu-item/menu-item.module";
import { VariantModule } from "./variant/variant.module";
import { AddonModule } from "./addon/addon.module";
import { PublicMenuModule } from "./public-menu/public-menu.module";
import { SubscriptionModule } from "./subscription/subscription.module";
import { AuditModule } from "./audit/audit.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { StorageModule } from "./storage/storage.module";
import { OrderModule } from "./order/order.module";
import { CmsModule } from "./cms/cms.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),

    // Rate limiting — applied globally (FR-AUTH-07, NFR-SEC-05)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    PrismaModule,
    MailModule,
    AuthModule,
    RestaurantModule,
    BranchModule,
    TableModule,
    QRCodeModule,
    CategoryModule,
    MenuItemModule,
    VariantModule,
    AddonModule,
    PublicMenuModule,
    SubscriptionModule,
    AuditModule,
    AnalyticsModule,
    StorageModule,
    OrderModule,
    CmsModule,
  ],
  providers: [
    // Global exception handler
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },

    // JWT guard on every route by default — use @Public() to bypass
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // RBAC guard on every route — use @Roles() to restrict
    { provide: APP_GUARD, useClass: RolesGuard },

    // Rate limiting guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
