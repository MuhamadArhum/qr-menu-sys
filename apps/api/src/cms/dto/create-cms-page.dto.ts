import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, Matches, IsOptional, IsEnum } from "class-validator";
import { Status } from "@prisma/client";

export class CreateCmsPageDto {
  @ApiProperty({ example: "privacy-policy" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: "slug must be lowercase letters, digits, and hyphens only" })
  slug!: string;

  @ApiProperty({ example: "Privacy Policy" })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: "# Privacy Policy\n\nYour data is safe with us." })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ enum: Status, default: Status.ACTIVE })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
