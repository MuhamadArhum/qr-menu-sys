import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from "class-validator";

export class UpdateTableDto {
  @ApiPropertyOptional({ example: "VIP Table 1" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  capacity?: number;
}
