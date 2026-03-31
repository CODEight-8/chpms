import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { UserRole } from "@prisma/client";
import { hasPermission } from "./permissions";

type Module =
  | "suppliers"
  | "supplier-lots"
  | "production"
  | "clients"
  | "orders"
  | "accounts"
  | "dashboard"
  | "users";

type Permission = "view" | "create" | "edit" | "delete";

export async function requireAuth(
  module?: Module,
  permission?: Permission
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (module && permission) {
    const allowed = hasPermission(
      session.user.role as UserRole,
      module,
      permission
    );
    if (!allowed) {
      return {
        user: null,
        error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }
  }

  return { user: session.user, error: null };
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}
