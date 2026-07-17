/*
  Warnings:

  - You are about to drop the column `allergens` on the `menu_items` table. All the data in the column will be lost.
  - You are about to drop the column `availabilityStatus` on the `menu_items` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `menu_items` table. All the data in the column will be lost.
  - You are about to drop the column `ingredients` on the `menu_items` table. All the data in the column will be lost.
  - You are about to drop the column `priceDelta` on the `variant_options` table. All the data in the column will be lost.
  - Added the required column `restaurantId` to the `menu_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "addon_groups" ADD COLUMN     "isRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "addon_options" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "menu_items" DROP COLUMN "allergens",
DROP COLUMN "availabilityStatus",
DROP COLUMN "images",
DROP COLUMN "ingredients",
ADD COLUMN     "availability" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "calories" INTEGER,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "prepTimeMinutes" INTEGER,
ADD COLUMN     "restaurantId" TEXT NOT NULL,
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "variant_groups" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "variant_options" DROP COLUMN "priceDelta",
ADD COLUMN     "priceModifier" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "menu_items_restaurantId_idx" ON "menu_items"("restaurantId");

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
