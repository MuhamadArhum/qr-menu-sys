import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { Status } from "@prisma/client";

export class UpdateStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "INACTIVE", "ARCHIVED"] })
  @IsEnum(Status)
  status!: Status;
}
