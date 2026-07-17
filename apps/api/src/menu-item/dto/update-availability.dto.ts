import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { AvailabilityStatus } from "@prisma/client";

export class UpdateAvailabilityDto {
  @ApiProperty({ enum: AvailabilityStatus })
  @IsEnum(AvailabilityStatus)
  availability!: AvailabilityStatus;
}
