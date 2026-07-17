import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsDateString } from "class-validator";

export class AssignSubscriptionDto {
  @ApiProperty({ example: "plan-cuid" })
  @IsString()
  planId!: string;

  @ApiProperty({ example: "2026-07-17" })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: "2027-07-17" })
  @IsDateString()
  endDate!: string;
}
