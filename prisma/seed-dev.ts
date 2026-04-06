import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding development database...\n");

  // --- Owner account ---
  const ownerEmail = process.env.OWNER_EMAIL || "owner@chpms.dev";
  const ownerPassword = process.env.OWNER_PASSWORD || "owner123";
  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      name: "Dev Owner",
      email: ownerEmail,
      passwordHash,
      role: "OWNER",
    },
  });
  console.log(`  Owner:    ${ownerEmail} / ${ownerPassword}`);

  // --- Manager account ---
  const managerHash = await bcrypt.hash("manager123", 12);
  const manager = await prisma.user.upsert({
    where: { email: "manager@chpms.dev" },
    update: {},
    create: {
      name: "Dev Manager",
      email: "manager@chpms.dev",
      passwordHash: managerHash,
      role: "MANAGER",
    },
  });
  console.log(`  Manager:  manager@chpms.dev / manager123`);

  // --- Production account ---
  const prodHash = await bcrypt.hash("production123", 12);
  await prisma.user.upsert({
    where: { email: "production@chpms.dev" },
    update: {},
    create: {
      name: "Dev Production",
      email: "production@chpms.dev",
      passwordHash: prodHash,
      role: "PRODUCTION",
    },
  });
  console.log(`  Production: production@chpms.dev / production123`);

  // --- Product ---
  const product = await prisma.product.upsert({
    where: { id: "dev-product-chips" },
    update: {},
    create: {
      id: "dev-product-chips",
      name: "Coconut Husk Chips",
      unit: "kg",
    },
  });

  // --- Suppliers ---
  const supplier1 = await prisma.supplier.upsert({
    where: { id: "dev-supplier-1" },
    update: {},
    create: {
      id: "dev-supplier-1",
      name: "Kamal Perera",
      phone: "0771234567",
      location: "Kurunegala",
      contactPerson: "Kamal",
    },
  });

  const supplier2 = await prisma.supplier.upsert({
    where: { id: "dev-supplier-2" },
    update: {},
    create: {
      id: "dev-supplier-2",
      name: "Nimal Silva",
      phone: "0779876543",
      location: "Puttalam",
      contactPerson: "Nimal",
    },
  });
  console.log("  Suppliers: Kamal Perera, Nimal Silva");

  // --- Supplier Lots ---
  const lot1 = await prisma.supplierLot.upsert({
    where: { lotNumber: "LOT-001" },
    update: {},
    create: {
      lotNumber: "LOT-001",
      invoiceNumber: "INV-LOT-001",
      supplierId: supplier1.id,
      harvestDate: new Date("2026-03-20"),
      dateReceived: new Date("2026-03-22"),
      huskCount: 500,
      availableHusks: 500,
      perHuskRate: 15.0,
      totalCost: 7500.0,
      qualityGrade: "A",
      status: "GOOD_TO_GO",
    },
  });

  const lot2 = await prisma.supplierLot.upsert({
    where: { lotNumber: "LOT-002" },
    update: {},
    create: {
      lotNumber: "LOT-002",
      invoiceNumber: "INV-LOT-002",
      supplierId: supplier2.id,
      harvestDate: new Date("2026-03-25"),
      dateReceived: new Date("2026-03-27"),
      huskCount: 300,
      availableHusks: 300,
      perHuskRate: 12.0,
      totalCost: 3600.0,
      qualityGrade: "B",
      status: "GOOD_TO_GO",
    },
  });

  const lot3 = await prisma.supplierLot.upsert({
    where: { lotNumber: "LOT-003" },
    update: {},
    create: {
      lotNumber: "LOT-003",
      invoiceNumber: "INV-LOT-003",
      supplierId: supplier1.id,
      harvestDate: new Date("2026-04-01"),
      dateReceived: new Date("2026-04-03"),
      huskCount: 200,
      availableHusks: 200,
      perHuskRate: 14.0,
      totalCost: 2800.0,
      status: "AUDIT",
    },
  });
  console.log("  Lots: LOT-001 (A, 500 husks), LOT-002 (B, 300 husks), LOT-003 (audit, 200 husks)");

  // --- Clients ---
  const client1 = await prisma.client.upsert({
    where: { id: "dev-client-1" },
    update: {},
    create: {
      id: "dev-client-1",
      name: "Lanka Exports Ltd",
      companyName: "Lanka Exports (Pvt) Ltd",
      phone: "0112345678",
      email: "info@lankaexports.lk",
      address: "Colombo 03",
      paymentTerms: "Net 30",
    },
  });

  const client2 = await prisma.client.upsert({
    where: { id: "dev-client-2" },
    update: {},
    create: {
      id: "dev-client-2",
      name: "Green Garden Supplies",
      companyName: "Green Garden Supplies",
      phone: "0119876543",
      email: "orders@greengarden.lk",
      address: "Kandy",
      paymentTerms: "COD",
    },
  });
  console.log("  Clients: Lanka Exports Ltd, Green Garden Supplies");

  console.log("\nDev seed completed successfully!");
  console.log("\n--- Login Credentials ---");
  console.log("  Owner:      owner@chpms.dev / owner123");
  console.log("  Manager:    manager@chpms.dev / manager123");
  console.log("  Production: production@chpms.dev / production123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
