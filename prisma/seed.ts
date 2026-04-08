import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create default Owner account
  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
  const ownerPassword = process.env.OWNER_PASSWORD;

  if (!ownerEmail || !ownerPassword) {
    throw new Error("OWNER_EMAIL and OWNER_PASSWORD environment variables must be set");
  }

  const existingOwner = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });

  if (!existingOwner) {
    const passwordHash = await bcrypt.hash(ownerPassword, 12);
    await prisma.user.create({
      data: {
        name: "Owner",
        email: ownerEmail,
        passwordHash,
        role: "OWNER",
      },
    });
    console.log(`Created owner account: ${ownerEmail}`);
  } else {
    console.log("Owner account already exists");
  }

  // Create the single product — Coconut Husk Chips
  const existing = await prisma.product.findFirst({
    where: { name: "Coconut Husk Chips" },
  });
  if (!existing) {
    await prisma.product.create({
      data: { name: "Coconut Husk Chips", unit: "kg" },
    });
    console.log("Created product: Coconut Husk Chips");
  }

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
