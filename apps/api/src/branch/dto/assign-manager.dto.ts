import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class AssignManagerDto {
  @ApiProperty({ description: "User ID of the Branch Manager to assign" })
  @IsString()
  managerId!: string;
}
