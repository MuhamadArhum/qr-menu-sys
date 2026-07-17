import { IsEmail, IsString, MinLength, MaxLength, IsEnum } from "class-validator";
import { UserRole } from "@prisma/client";

export class CreateStaffDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @IsEnum([UserRole.BRANCH_MANAGER, UserRole.STAFF])
  role!: UserRole;
}
