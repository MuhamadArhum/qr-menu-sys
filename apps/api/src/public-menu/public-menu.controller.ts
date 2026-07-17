import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { PublicMenuService } from "./public-menu.service";

@ApiTags("Public Menu")
@Controller("public/menu")
export class PublicMenuController {
  constructor(private readonly publicMenuService: PublicMenuService) {}

  @Get(":codeValue")
  @Public()
  @ApiOperation({ summary: "Resolve QR code and return full menu (no auth)" })
  resolveMenu(@Param("codeValue") codeValue: string) {
    return this.publicMenuService.resolveMenu(codeValue);
  }
}
