import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = process.env["SUPER_ADMIN_EMAIL"] ?? "superadmin@abytemenu.com";
  const password = process.env["SUPER_ADMIN_PASSWORD"] ?? "SuperAdmin123";

  const exists = await prisma.user.findUnique({ where: { email } });

  if (exists) {
    console.log(`Super Admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      restaurantId: null,
      status: "ACTIVE",
    },
  });

  console.log(`Super Admin created: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
