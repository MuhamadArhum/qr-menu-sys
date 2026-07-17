import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, MaxLength, IsUrl } from "class-validator";

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: "Hot Drinks" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
