import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCmsPageDto } from "./dto/create-cms-page.dto";
import { UpdateCmsPageDto } from "./dto/update-cms-page.dto";

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.cmsPage.findMany({
      orderBy: { createdAt: "asc" },
    });
  }

  async findOne(id: string) {
    const page = await this.prisma.cmsPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("CMS page not found");
    return page;
  }

  async findBySlug(slug: string) {
    const page = await this.prisma.cmsPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException("CMS page not found");
    return page;
  }

  async create(dto: CreateCmsPageDto) {
    const existing = await this.prisma.cmsPage.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    return this.prisma.cmsPage.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        body: dto.body ?? "",
        status: dto.status,
      },
    });
  }

  async update(id: string, dto: UpdateCmsPageDto) {
    await this.findOne(id);
    if (dto.slug) {
      const conflict = await this.prisma.cmsPage.findUnique({ where: { slug: dto.slug } });
      if (conflict && conflict.id !== id) throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    }
    return this.prisma.cmsPage.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.cmsPage.delete({ where: { id } });
  }
}
