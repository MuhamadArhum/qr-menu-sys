import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsArray,
  IsBoolean,
  IsString,
  IsNumber,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";

export class TaxRateDto {
  @ApiPropertyOptional({ example: "GST" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @ApiPropertyOptional({ example: 17 })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    type: [TaxRateDto],
    example: [{ name: "GST", percentage: 17 }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxRateDto)
  taxRates?: TaxRateDto[];

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  serviceCharge?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  serviceChargeEnabled?: boolean;

  @ApiPropertyOptional({ example: "light", enum: ["light", "dark"] })
  @IsOptional()
  @IsString()
  themeDefault?: "light" | "dark";

  @ApiPropertyOptional({ example: "#e11d48" })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  accentColor?: string;
}
