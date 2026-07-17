import { Type } from "class-transformer";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsNumber,
} from "class-validator";

export class SelectedVariantDto {
  @IsString()
  @IsNotEmpty()
  groupId!: string;

  @IsString()
  @IsNotEmpty()
  groupName!: string;

  @IsString()
  @IsNotEmpty()
  optionId!: string;

  @IsString()
  @IsNotEmpty()
  optionName!: string;

  @IsNumber()
  priceModifier!: number;
}

export class SelectedAddonDto {
  @IsString()
  @IsNotEmpty()
  groupId!: string;

  @IsString()
  @IsNotEmpty()
  groupName!: string;

  @IsString()
  @IsNotEmpty()
  optionId!: string;

  @IsString()
  @IsNotEmpty()
  optionName!: string;

  @IsNumber()
  price!: number;
}

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedVariantDto)
  selectedVariants?: SelectedVariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedAddonDto)
  selectedAddons?: SelectedAddonDto[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  tableId!: string;

  @IsString()
  @IsNotEmpty()
  codeValue!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  note?: string;
}
