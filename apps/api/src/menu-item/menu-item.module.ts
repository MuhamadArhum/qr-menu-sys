import { Module } from "@nestjs/common";
import { MenuItemService } from "./menu-item.service";
import { MenuItemController } from "./menu-item.controller";
import { CategoryModule } from "../category/category.module";

@Module({
  imports: [CategoryModule],
  controllers: [MenuItemController],
  providers: [MenuItemService],
  exports: [MenuItemService],
})
export class MenuItemModule {}
