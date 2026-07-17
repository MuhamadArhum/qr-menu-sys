import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  MaxLength,
} from "class-validator";

export class CreateVariantOptionDto {
  @ApiProperty({ example: "Large" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: 2.5, description: "Price added/subtracted from base price" })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  priceModifier?: number;
}
