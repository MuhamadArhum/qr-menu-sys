import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsUrl,
  IsObject,
} from "class-validator";

export class UpdateRestaurantDto {
  @ApiPropertyOptional({ example: "Pizza Palace" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  displayName?: string;

  @ApiPropertyOptional({ example: "Pizza Palace Pvt Ltd" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  legalName?: string;

  @ApiPropertyOptional({ example: "Best pizza in town since 2010." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: "Italian, Fast Food" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cuisineType?: string;

  @ApiPropertyOptional({ example: "https://r2.example.com/logo.png" })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ example: "https://r2.example.com/cover.png" })
  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @ApiPropertyOptional({
    example: { instagram: "pizzapalace", facebook: "pizzapalacepk" },
  })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  @ApiPropertyOptional({ example: "PKR" })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  defaultCurrency?: string;

  @ApiPropertyOptional({ example: "en" })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  defaultLanguage?: string;
}
