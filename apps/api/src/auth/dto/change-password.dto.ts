import { IsString, MinLength, MaxLength, Matches } from "class-validator";

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, {
    message: "Password must contain letters and numbers",
  })
  newPassword!: string;
}
