import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import * as argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is missing");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const user = await prisma.user.findUnique({
      where: { email: "rider.test@bhooko.local" },
      select: { id: true, role: true },
    });

    if (!user || user.role !== UserRole.DELIVERY_PARTNER) {
      throw new Error("Expected test rider not found; no changes made");
    }

    const password = `Rider-${randomBytes(12).toString("hex")}-9!`;
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    const passwordFile = `${process.env.HOME}/.bhooko-rider-test-password`;
    writeFileSync(passwordFile, `${password}\n`, { mode: 0o600 });

    console.log("Test rider password reset successfully.");
    console.log(`Password saved privately to: ${passwordFile}`);
    console.log("User role and other users were not changed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
