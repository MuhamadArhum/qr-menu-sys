import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({ example: "admin@restaurant.com" })
  @IsEmail()
  email!: string;
}
