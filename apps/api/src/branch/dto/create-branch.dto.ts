import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsArray,
  ValidateNested,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";

export class ShiftDto {
  @ApiProperty({ example: "09:00" })
  @IsString()
  open!: string;

  @ApiProperty({ example: "22:00" })
  @IsString()
  close!: string;
}

export class BusinessHourDto {
  @ApiProperty({ enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] })
  @IsString()
  day!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isOpen!: boolean;

  @ApiProperty({ type: [ShiftDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftDto)
  shifts!: ShiftDto[];
}

export class CreateBranchDto {
  @ApiProperty({ example: "Gulberg Branch" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: "12-A Gulberg III, Lahore" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address!: string;

  @ApiPropertyOptional({ example: "+923001234567" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactNumber?: string;

  @ApiPropertyOptional({ example: 31.5204 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 74.3587 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ type: [BusinessHourDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHourDto)
  businessHours?: BusinessHourDto[];
}
