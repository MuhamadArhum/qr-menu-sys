import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
} from "class-validator";

export class CreateTableDto {
  @ApiProperty({ example: "Table 5" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  label!: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  capacity?: number;
}
