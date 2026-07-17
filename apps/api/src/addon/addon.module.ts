import { Module } from "@nestjs/common";
import { AddonService } from "./addon.service";
import { AddonController } from "./addon.controller";
import { MenuItemModule } from "../menu-item/menu-item.module";

@Module({
  imports: [MenuItemModule],
  controllers: [AddonController],
  providers: [AddonService],
  exports: [AddonService],
})
export class AddonModule {}
