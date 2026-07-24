import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsUrl } from "class-validator";

export class CreateCategoryDto {
  @ApiProperty({ example: "Beverages" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: "مشروبات" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nameUr?: string;

  @ApiPropertyOptional({ example: "https://r2.example.com/beverages.png" })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "Parent category ID for sub-categories" })
  @IsOptional()
  @IsString()
  parentCategoryId?: string;
}
