import { IsEnum, IsOptional } from "class-validator";
import { UserRole, Status } from "@prisma/client";

export class UpdateStaffDto {
  @IsOptional()
  @IsEnum([UserRole.BRANCH_MANAGER, UserRole.STAFF])
  role?: UserRole;

  @IsOptional()
  @IsEnum([Status.ACTIVE, Status.INACTIVE])
  status?: Status;
}
