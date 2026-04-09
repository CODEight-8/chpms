import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getUserById } from "@/lib/queries/users";
import { logAuditEvent } from "@/lib/audit-log";
import bcrypt from "bcryptjs";
import { z } from "zod";

const userUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").max(200),
  role: z.enum(["OWNER", "MANAGER", "PRODUCTION"]),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128)
    .optional()
    .or(z.literal("")),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth("users", "view");
  if (error) return error;

  const user = await getUserById(params.id);
  if (!user) return errorResponse("User not found", 404);

  return jsonResponse(user);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth("users", "edit");
  if (error || !user) return error!;

  const body = await request.json();
  const parsed = userUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return errorResponse("User not found", 404);

  // Check email uniqueness (exclude current user)
  if (parsed.data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (emailTaken) {
      return errorResponse("A user with this email already exists");
    }
  }

  // Prevent changing the last OWNER's role
  if (existing.role === "OWNER" && parsed.data.role !== "OWNER") {
    const ownerCount = await prisma.user.count({
      where: { role: "OWNER", isActive: true },
    });
    if (ownerCount <= 1) {
      return errorResponse(
        "Cannot change the role of the only active owner account"
      );
    }
  }

  // Only one OWNER allowed
  if (parsed.data.role === "OWNER" && existing.role !== "OWNER") {
    const ownerCount = await prisma.user.count({
      where: { role: "OWNER", isActive: true },
    });
    if (ownerCount > 0) {
      return errorResponse("Only one active owner account is allowed");
    }
  }

  // Build update data
  const updateData: {
    name: string;
    email: string;
    role: "OWNER" | "MANAGER" | "PRODUCTION";
    passwordHash?: string;
  } = {
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
  };

  // Only hash and update password if provided
  if (parsed.data.password && parsed.data.password.length > 0) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  await logAuditEvent({
    user,
    action: "UPDATE",
    entityType: "User",
    entityId: params.id,
    details: {
      before: {
        name: existing.name,
        email: existing.email,
        role: existing.role,
      },
      after: {
        name: updated.name,
        email: updated.email,
        role: updated.role,
      },
      passwordChanged: !!(parsed.data.password && parsed.data.password.length > 0),
    },
  });

  return jsonResponse(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth("users", "delete");
  if (error || !user) return error!;

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return errorResponse("User not found", 404);

  // Prevent self-deactivation
  if (existing.id === user.id) {
    return errorResponse("You cannot deactivate your own account");
  }

  // Prevent deactivating the last OWNER
  if (existing.role === "OWNER") {
    const ownerCount = await prisma.user.count({
      where: { role: "OWNER", isActive: true },
    });
    if (ownerCount <= 1) {
      return errorResponse("Cannot deactivate the only active owner account");
    }
  }

  const deactivated = await prisma.user.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  await logAuditEvent({
    user,
    action: "DELETE",
    entityType: "User",
    entityId: params.id,
    details: { name: deactivated.name, email: deactivated.email },
  });

  return jsonResponse({ success: true });
}
