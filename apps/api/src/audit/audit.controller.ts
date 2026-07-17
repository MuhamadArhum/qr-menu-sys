import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { AuditService } from "./audit.service";
import { QueryAuditDto } from "./dto/query-audit.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/strategies/jwt.strategy";

@ApiTags("Audit Logs")
@ApiBearerAuth()
@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "List all audit logs with filters (SA)" })
  findAll(@Query() dto: QueryAuditDto) {
    return this.auditService.findAll(dto);
  }

  @Get("mine")
  @Roles(UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: "List audit logs scoped to own restaurant" })
  findMine(@Query() dto: QueryAuditDto, @CurrentUser() user: AuthUser) {
    return this.auditService.findAll(dto, user.restaurantId!);
  }
}
