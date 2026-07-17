import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Response } from "express";
import { QRCodeService, QRFormat } from "./qr-code.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, CurrentUserType } from "../auth/decorators/current-user.decorator";

@ApiTags("QR Code")
@ApiBearerAuth()
@Controller()
export class QRCodeController {
  constructor(private readonly qrCodeService: QRCodeService) {}

  // GET /api/v1/tables/:id/qr-code
  @Get("tables/:id/qr-code")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Get QR code info for a table" })
  getInfo(
    @Param("id") tableId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    this.assertRestaurant(user);
    return this.qrCodeService.getQRCode(tableId, user.restaurantId!);
  }

  // GET /api/v1/tables/:id/qr-code/download?format=png|svg|pdf
  @Get("tables/:id/qr-code/download")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Download QR code as PNG, SVG, or PDF" })
  @ApiQuery({ name: "format", enum: ["png", "svg", "pdf"], required: false })
  async download(
    @Param("id") tableId: string,
    @Query("format") format: QRFormat = "png",
    @CurrentUser() user: CurrentUserType,
    @Res() res: Response,
  ) {
    this.assertRestaurant(user);

    const result = await this.qrCodeService.download(
      tableId,
      user.restaurantId!,
      format,
    );

    res.setHeader("Content-Type", result.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.buffer);
  }

  // GET /api/v1/branches/:branchId/qr-codes/export
  @Get("branches/:branchId/qr-codes/export")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Bulk export all QR codes for a branch as PDF" })
  async bulkExport(
    @Param("branchId") branchId: string,
    @CurrentUser() user: CurrentUserType,
    @Res() res: Response,
  ) {
    this.assertRestaurant(user);

    const buffer = await this.qrCodeService.bulkExport(branchId, user.restaurantId!);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="qr-codes-branch-${branchId}.pdf"`,
    );
    res.send(buffer);
  }

  // POST /api/v1/tables/:id/qr-code/regenerate
  @Post("tables/:id/qr-code/regenerate")
  @Roles(UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Regenerate QR code — invalidates the old one" })
  regenerate(
    @Param("id") tableId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    this.assertRestaurant(user);
    return this.qrCodeService.regenerate(tableId, user.restaurantId!, user.id);
  }

  private assertRestaurant(user: CurrentUserType) {
    if (!user.restaurantId) {
      throw new ForbiddenException("No restaurant associated with this account");
    }
  }
}
