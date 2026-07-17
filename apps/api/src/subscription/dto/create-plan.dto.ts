import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsEnum, IsNumber, IsPositive, IsObject, MaxLength } from "class-validator";
import { BillingCycle } from "@prisma/client";

export class CreatePlanDto {
  @ApiProperty({ example: "Starter" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 29.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price!: number;

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @ApiPropertyOptional({
    example: { maxBranches: 1, maxMenuItems: 50, maxTables: 10 },
    description: "Feature limits as a JSON object",
  })
  @IsObject()
  featureLimits!: Record<string, unknown>;
}
