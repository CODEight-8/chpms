import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, UserRole } from "@prisma/client";

// Hard cap so a malicious or accidental "no filter" download cannot stall the
// server for hours on a giant table. If a real user needs more, they can run
// narrower date ranges.
const MAX_ROWS = 50000;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((session.user.role as UserRole) !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const entityType = url.searchParams.get("entityType");
  const action = url.searchParams.get("action");

  const where: Prisma.AuditLogWhereInput = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      // Inclusive end-of-day so dateTo=2026-05-28 includes events on that date.
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
  });

  const header = [
    "Timestamp",
    "User Email",
    "Action",
    "Entity Type",
    "Entity ID",
    "Details",
  ].join(",");

  const body = rows.map((r) => {
    const details =
      r.details == null ? "" : JSON.stringify(r.details).replace(/\s+/g, " ");
    return [
      r.createdAt.toISOString(),
      r.userEmail,
      r.action,
      r.entityType,
      r.entityId,
      details,
    ]
      .map(csvCell)
      .join(",");
  });

  const csv = [header, ...body].join("\n");
  const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
