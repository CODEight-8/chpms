import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { userSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getUsers } from "@/lib/queries/users";
import { logAuditEvent } from "@/lib/audit-log";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth("users", "view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const activeParam = searchParams.get("active");
  const active =
    activeParam === "true" ? true : activeParam === "false" ? false : undefined;

  const users = await getUsers({ search, active });
  return jsonResponse(users);
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth("users", "create");
  if (error || !user) return error!;

  const body = await request.json();
  const parsed = userSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  // Normalize email
  parsed.data.email = parsed.data.email.toLowerCase().trim();

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return errorResponse("A user with this email already exists");
  }

  // Only one OWNER allowed
  if (parsed.data.role === "OWNER") {
    const ownerCount = await prisma.user.count({
      where: { role: "OWNER", isActive: true },
    });
    if (ownerCount > 0) {
      return errorResponse("Only one active owner account is allowed");
    }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const newUser = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  logAuditEvent({
    user,
    action: "CREATE",
    entityType: "User",
    entityId: newUser.id,
    details: { name: newUser.name, email: newUser.email, role: newUser.role },
  });

  return jsonResponse(newUser, 201);
}
