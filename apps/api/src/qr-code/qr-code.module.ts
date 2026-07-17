import { Module } from "@nestjs/common";
import { QRCodeController } from "./qr-code.controller";
import { QRCodeService } from "./qr-code.service";

@Module({
  controllers: [QRCodeController],
  providers: [QRCodeService],
  exports: [QRCodeService],
})
export class QRCodeModule {}
