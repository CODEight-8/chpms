import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create default Owner account
  const ownerEmail = process.env.OWNER_EMAIL || "owner@chpms.local";
  const ownerPassword = process.env.OWNER_PASSWORD || "chpms2026";

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

  // Create demo users (Manager + Production Manager)
  const demoUsers = [
    { name: "Manager", email: "manager@chpms.local", role: "MANAGER" as const },
    { name: "Production", email: "production@chpms.local", role: "PRODUCTION" as const },
  ];

  for (const u of demoUsers) {
    const exists = await prisma.user.findUnique({ where: { email: u.email } });
    if (!exists) {
      const hash = await bcrypt.hash("chpms2026", 12);
      await prisma.user.create({
        data: { name: u.name, email: u.email, passwordHash: hash, role: u.role },
      });
      console.log(`Created ${u.role} account: ${u.email}`);
    }
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
