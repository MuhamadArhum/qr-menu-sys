import {
  Controller,
  Post,
  Delete,
  UploadedFile,
  UseInterceptors,
  Query,
  BadRequestException,
  Body,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { memoryStorage } from "multer";
import { StorageService, UploadFolder } from "./storage.service";
import { Roles } from "../auth/decorators/roles.decorator";

const VALID_FOLDERS: UploadFolder[] = ["categories", "menu-items", "restaurants", "branches"];

@ApiTags("Storage")
@ApiBearerAuth()
@Controller("storage")
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post("upload")
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload an image to Cloudinary — returns url, thumbnailUrl, publicId" })
  @ApiQuery({ name: "folder", enum: VALID_FOLDERS, required: false })
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query("folder") folder: string = "menu-items",
  ) {
    if (!file) throw new BadRequestException("No file provided");
    if (!VALID_FOLDERS.includes(folder as UploadFolder)) {
      throw new BadRequestException(`folder must be one of: ${VALID_FOLDERS.join(", ")}`);
    }
    return this.storageService.uploadImage(file, folder as UploadFolder);
  }

  @Delete("delete")
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: "Delete an image from Cloudinary by publicId" })
  async remove(@Body("publicId") publicId: string) {
    if (!publicId) throw new BadRequestException("publicId is required");
    await this.storageService.deleteImage(publicId);
    return { message: "Image deleted successfully" };
  }
}
