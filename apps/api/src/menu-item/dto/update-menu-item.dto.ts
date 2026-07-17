import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsArray,
  IsEnum,
  MaxLength,
  Min,
} from "class-validator";
import { DietaryTag } from "@prisma/client";

export class UpdateMenuItemDto {
  @ApiPropertyOptional({ example: "Margherita Pizza" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 13.99 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  basePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  prepTimeMinutes?: number;

  @ApiPropertyOptional({ enum: DietaryTag, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(DietaryTag, { each: true })
  dietaryTags?: DietaryTag[];
}
