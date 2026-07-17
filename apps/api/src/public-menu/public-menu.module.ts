import { Module } from "@nestjs/common";
import { PublicMenuService } from "./public-menu.service";
import { PublicMenuController } from "./public-menu.controller";
import { QRCodeModule } from "../qr-code/qr-code.module";

@Module({
  imports: [QRCodeModule],
  controllers: [PublicMenuController],
  providers: [PublicMenuService],
})
export class PublicMenuModule {}
