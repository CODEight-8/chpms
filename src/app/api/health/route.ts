import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus = "disconnected";
  let lastBackupAt: string | null = null;
  const mode = process.env.SYSTEM_MODE || "live";

  try {
    const p = new PrismaClient();
    try {
      await p.$queryRaw`SELECT 1`;
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

  // Public health check: only status and db connectivity are exposed without auth.
  // System mode, version, and backup info require authentication to prevent
  // information disclosure to unauthenticated users.
  const response: Record<string, unknown> = {
    status: dbStatus === "connected" ? "ok" : "degraded",
    db: dbStatus,
  };

  const session = await getServerSession(authOptions);
  if (session?.user) {
    response.mode = mode;
    response.version = "1.0.0";
    response.lastBackupAt = lastBackupAt;
  }

  return NextResponse.json(response);
}
