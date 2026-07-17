import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString, ArrayNotEmpty } from "class-validator";

export class ReorderCategoryDto {
  @ApiProperty({
    description: "Category IDs in the new desired order",
    example: ["id1", "id2", "id3"],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderedIds!: string[];
}
