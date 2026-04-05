import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus = "disconnected";
  let lastBackupAt: string | null = null;
  const mode = process.env.SYSTEM_MODE || "live";

  try {
    const p = new PrismaClient();
    try {
      await p.$queryRawUnsafe("SELECT 1");
      dbStatus = "connected";

      try {
        const row = await p.systemStatus.findUnique({
          where: { key: "last_backup_at" },
        });
        lastBackupAt = row?.value ?? null;
      } catch {
        // table may not exist yet
      }
    } finally {
      await p.$disconnect();
    }
  } catch {
    dbStatus = "disconnected";
  }

  return NextResponse.json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    mode,
    db: dbStatus,
    lastBackupAt,
    version: "1.0.0",
  });
}
