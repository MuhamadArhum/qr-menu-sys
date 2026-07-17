import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, MaxLength } from "class-validator";

export class UpdateVariantOptionDto {
  @ApiPropertyOptional({ example: "Large" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  priceModifier?: number;
}
