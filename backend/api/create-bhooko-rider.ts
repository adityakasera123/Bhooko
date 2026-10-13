import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import * as argon2 from "argon2";
import { randomUUID } from "node:crypto";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing from backend/api/.env");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const email = "rider.test@bhooko.local";
    const phone = "9000000001";
    const password = `${randomUUID()}-Rider-Test-9!`;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
      select: { id: true, email: true, phone: true, role: true },
    });

    if (existing) {
      console.log("A user with the test email or phone already exists.");
      console.log({
        id: existing.id,
        email: existing.email,
        phone: existing.phone,
        role: existing.role,
      });
      console.log("No existing user was modified.");
      return;
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const user = await prisma.user.create({
      data: {
        name: "BHOOKO Test Rider",
        email,
        phone,
        passwordHash,
        role: UserRole.DELIVERY_PARTNER,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    console.log("Test rider user created:");
    console.log(user);
    console.log("Temporary password for local testing:", password);
    console.log("Save this password locally; don't paste it into chat.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
