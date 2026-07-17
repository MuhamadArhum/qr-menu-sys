import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsInt, Min, Max, IsOptional, MaxLength } from "class-validator";

export class BulkCreateTableDto {
  @ApiProperty({ example: "Table", description: "Prefix for table labels" })
  @IsString()
  @MaxLength(30)
  prefix!: string;

  @ApiProperty({ example: 1, description: "Starting number" })
  @IsInt()
  @Min(1)
  from!: number;

  @ApiProperty({ example: 20, description: "Ending number (max 100 at once)" })
  @IsInt()
  @Min(1)
  @Max(100)
  to!: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  capacity?: number;
}
