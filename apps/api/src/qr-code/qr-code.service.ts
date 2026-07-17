import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as QRCode from "qrcode";
import * as crypto from "crypto";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require("pdfkit") as typeof import("pdfkit");
import { PrismaService } from "../prisma/prisma.service";

export type QRFormat = "png" | "svg" | "pdf";

@Injectable()
export class QRCodeService {
  private readonly customerUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.customerUrl = config.get("CUSTOMER_APP_URL", "http://localhost:3000");
  }

  // ─── Get QR code info ─────────────────────────────────────────────────────

  async getQRCode(tableId: string, restaurantId: string) {
    const table = await this.assertTableOwnership(tableId, restaurantId);

    const activeQR = table.qrCodes[0];
    if (!activeQR) throw new NotFoundException("No active QR code for this table");

    return {
      ...activeQR,
      menuUrl: this.buildMenuUrl(activeQR.codeValue),
      tableLabel: table.label,
    };
  }

  // ─── Download QR code ─────────────────────────────────────────────────────

  async download(
    tableId: string,
    restaurantId: string,
    format: QRFormat,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const table = await this.assertTableOwnership(tableId, restaurantId);

    const activeQR = table.qrCodes[0];
    if (!activeQR) throw new NotFoundException("No active QR code for this table");

    const menuUrl = this.buildMenuUrl(activeQR.codeValue);
    const safeLabel = table.label.replace(/[^a-z0-9]/gi, "_");

    switch (format) {
      case "png": {
        const buffer = await QRCode.toBuffer(menuUrl, {
          type: "png",
          width: 512,
          margin: 2,
          color: { dark: "#111827", light: "#ffffff" },
        });
        return {
          buffer,
          contentType: "image/png",
          filename: `qr-${safeLabel}.png`,
        };
      }

      case "svg": {
        const svg = await QRCode.toString(menuUrl, { type: "svg", margin: 2 });
        return {
          buffer: Buffer.from(svg, "utf-8"),
          contentType: "image/svg+xml",
          filename: `qr-${safeLabel}.svg`,
        };
      }

      case "pdf": {
        const buffer = await this.generateQRPdf(
          menuUrl,
          table.label,
          table.branch.restaurant.displayName,
          table.branch.name,
        );
        return {
          buffer,
          contentType: "application/pdf",
          filename: `qr-${safeLabel}.pdf`,
        };
      }
    }
  }

  // ─── Bulk export all QR codes for a branch ────────────────────────────────

  async bulkExport(
    branchId: string,
    restaurantId: string,
  ): Promise<Buffer> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, restaurantId },
      include: {
        restaurant: { select: { displayName: true } },
        tables: {
          where: { status: "ACTIVE" },
          include: { qrCodes: { where: { status: "ACTIVE" }, take: 1 } },
          orderBy: { label: "asc" },
        },
      },
    });

    if (!branch) throw new ForbiddenException("Branch not found or access denied");

    const tablesWithQR = branch.tables.filter((t) => t.qrCodes.length > 0);

    if (tablesWithQR.length === 0) {
      throw new NotFoundException("No active tables with QR codes in this branch");
    }

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    return new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 80;
      const colCount = 2;
      const cellWidth = pageWidth / colCount;
      const cellHeight = 260;
      let x = 40;
      let y = 40;
      let col = 0;

      for (const table of tablesWithQR) {
        const activeQR = table.qrCodes[0];
        if (!activeQR) continue;

        const menuUrl = this.buildMenuUrl(activeQR.codeValue);

        // QR code as data URL → embed in PDF
        QRCode.toDataURL(menuUrl, { width: 180 })
          .then((dataUrl) => {
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
            const imgBuffer = Buffer.from(base64Data, "base64");

            doc
              .rect(x + 5, y + 5, cellWidth - 10, cellHeight - 10)
              .stroke("#e5e7eb");

            doc.image(imgBuffer, x + (cellWidth - 150) / 2, y + 20, { width: 150 });

            doc
              .fontSize(14)
              .fillColor("#111827")
              .text(table.label, x, y + 180, { width: cellWidth, align: "center" });

            doc
              .fontSize(9)
              .fillColor("#6b7280")
              .text(branch.restaurant?.displayName ?? "", x, y + 200, {
                width: cellWidth,
                align: "center",
              });

            col++;
            if (col >= colCount) {
              col = 0;
              x = 40;
              y += cellHeight + 10;
              if (y + cellHeight > doc.page.height - 40) {
                doc.addPage();
                y = 40;
              }
            } else {
              x += cellWidth;
            }
          })
          .catch(reject);
      }

      setTimeout(() => doc.end(), 500);
    });
  }

  // ─── Regenerate QR code ───────────────────────────────────────────────────

  async regenerate(tableId: string, restaurantId: string, actorId: string) {
    await this.assertTableOwnership(tableId, restaurantId);

    const newCode = crypto.randomBytes(8).toString("hex");

    const newQRCode = await this.prisma.$transaction(async (tx) => {
      await tx.qRCode.updateMany({
        where: { tableId, status: "ACTIVE" },
        data: { status: "INVALIDATED" },
      });
      return tx.qRCode.create({
        data: { tableId, codeValue: newCode },
      });
    });

    await this.prisma.auditLogEntry.create({
      data: {
        actorUserId: actorId,
        restaurantId,
        entityType: "QRCode",
        entityId: tableId,
        action: "UPDATE",
        afterValue: { tableId, newCode },
      },
    });

    return {
      ...newQRCode,
      menuUrl: this.buildMenuUrl(newCode),
      message: "QR code regenerated. Previous code is now invalid.",
    };
  }

  // ─── Log scan event (called by public menu resolver) ─────────────────────

  async logScan(tableId: string) {
    await this.prisma.qRScanEvent.create({ data: { tableId } });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private buildMenuUrl(codeValue: string): string {
    return `${this.customerUrl}/menu/${codeValue}`;
  }

  private async assertTableOwnership(tableId: string, restaurantId: string) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, branch: { restaurantId } },
      include: {
        qrCodes: { where: { status: "ACTIVE" }, take: 1 },
        branch: { include: { restaurant: { select: { displayName: true } } } },
      },
    });

    if (!table) throw new ForbiddenException("Table not found or access denied");

    return table;
  }

  private generateQRPdf(
    url: string,
    tableLabel: string,
    restaurantName: string,
    branchName: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: [300, 350], margin: 20 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      QRCode.toBuffer(url, { width: 220, margin: 1 })
        .then((qrBuffer) => {
          doc.image(qrBuffer, 40, 30, { width: 220 });

          doc
            .fontSize(18)
            .fillColor("#111827")
            .text(tableLabel, 0, 265, { align: "center" });

          doc
            .fontSize(11)
            .fillColor("#6b7280")
            .text(restaurantName, 0, 290, { align: "center" });

          doc
            .fontSize(9)
            .fillColor("#9ca3af")
            .text(branchName, 0, 310, { align: "center" });

          doc.end();
        })
        .catch(reject);
    });
  }
}
