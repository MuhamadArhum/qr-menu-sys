-- Add ingredients and allergens arrays to menu_items (FR-MENU-02)
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "ingredients" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "allergens" TEXT[] NOT NULL DEFAULT '{}';
