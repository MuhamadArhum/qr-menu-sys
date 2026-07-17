import { Module } from "@nestjs/common";
import { VariantService } from "./variant.service";
import { VariantController } from "./variant.controller";
import { MenuItemModule } from "../menu-item/menu-item.module";

@Module({
  imports: [MenuItemModule],
  controllers: [VariantController],
  providers: [VariantService],
  exports: [VariantService],
})
export class VariantModule {}
