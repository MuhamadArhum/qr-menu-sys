import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CmsService } from "./cms.service";
import { CreateCmsPageDto } from "./dto/create-cms-page.dto";
import { UpdateCmsPageDto } from "./dto/update-cms-page.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("CMS")
@ApiBearerAuth()
@Controller("cms")
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "List all CMS pages (SA)" })
  findAll() {
    return this.cmsService.findAll();
  }

  @Get("public/:slug")
  @Public()
  @ApiOperation({ summary: "Get CMS page by slug (public)" })
  findBySlug(@Param("slug") slug: string) {
    return this.cmsService.findBySlug(slug);
  }

  @Get(":id")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Get CMS page by id (SA)" })
  findOne(@Param("id") id: string) {
    return this.cmsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Create CMS page (SA)" })
  create(@Body() dto: CreateCmsPageDto) {
    return this.cmsService.create(dto);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Update CMS page (SA)" })
  update(@Param("id") id: string, @Body() dto: UpdateCmsPageDto) {
    return this.cmsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete CMS page (SA)" })
  remove(@Param("id") id: string) {
    return this.cmsService.remove(id);
  }
}
