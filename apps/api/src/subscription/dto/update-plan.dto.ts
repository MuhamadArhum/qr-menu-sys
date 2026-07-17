import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsEnum, IsNumber, IsPositive, IsObject, MaxLength } from "class-validator";
import { BillingCycle, Status } from "@prisma/client";

export class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({ enum: BillingCycle })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  featureLimits?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
