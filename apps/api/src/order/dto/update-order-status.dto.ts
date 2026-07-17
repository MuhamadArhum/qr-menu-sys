import { IsEnum } from "class-validator";

export class UpdateOrderStatusDto {
  @IsEnum(["CONFIRMED", "PREPARING", "READY", "SERVED", "CANCELLED"])
  status!: string;
}
