import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { Readable } from "stream";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export type UploadFolder = "categories" | "menu-items" | "restaurants" | "branches";

@Injectable()
export class StorageService {
  constructor(config: ConfigService) {
    cloudinary.config({
      cloud_name: config.getOrThrow("CLOUDINARY_CLOUD_NAME"),
      api_key: config.getOrThrow("CLOUDINARY_API_KEY"),
      api_secret: config.getOrThrow("CLOUDINARY_API_SECRET"),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: UploadFolder,
  ): Promise<{ url: string; publicId: string; thumbnailUrl: string }> {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException("Only JPEG, PNG, WebP, and GIF images are allowed");
    }

    if (file.size > MAX_BYTES) {
      throw new BadRequestException("Image must be under 5 MB");
    }

    const result = await this.uploadStream(file.buffer, `abyte-menu/${folder}`);

    // Auto-generate thumbnail URL via Cloudinary URL transformation
    const thumbnailUrl = cloudinary.url(result.public_id, {
      width: 400,
      height: 400,
      crop: "fill",
      gravity: "auto",
      quality: "auto",
      fetch_format: "auto",
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      thumbnailUrl,
    };
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  private uploadStream(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          transformation: [
            { width: 1200, crop: "limit" as const },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error("Upload failed"));
          resolve(result);
        },
      );
      Readable.from(buffer).pipe(stream);
    });
  }
}
