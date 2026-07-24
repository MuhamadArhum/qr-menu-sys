import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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

export class CreateMenuItemDto {
  @ApiProperty({ example: "Margherita Pizza" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: "Classic tomato and mozzarella" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 12.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  basePrice!: number;

  @ApiPropertyOptional({ example: "https://r2.example.com/pizza.png" })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: "cjld2cjxh0000qzrmn831i7rn" })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiPropertyOptional({ example: 600, description: "Calories" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @ApiPropertyOptional({ example: 10, description: "Preparation time in minutes" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prepTimeMinutes?: number;

  @ApiPropertyOptional({ enum: DietaryTag, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(DietaryTag, { each: true })
  dietaryTags?: DietaryTag[];

  @ApiPropertyOptional({ type: [String], example: ["Flour", "Tomato", "Mozzarella"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];

  @ApiPropertyOptional({ type: [String], example: ["Gluten", "Dairy"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];
}
