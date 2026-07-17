import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength, MaxLength, Matches } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "Pizza Palace Pvt Ltd" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  legalName!: string;

  @ApiProperty({ example: "Pizza Palace" })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  displayName!: string;

  @ApiProperty({ example: "owner@pizzapalace.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "SecurePass1" })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, {
    message: "Password must contain at least one letter and one number",
  })
  password!: string;
}
