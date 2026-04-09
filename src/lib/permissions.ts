import { UserRole } from "@prisma/client";

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

const PERMISSIONS: Record<UserRole, Record<Module, Permission[]>> = {
  OWNER: {
    suppliers: ["view", "create", "edit", "delete"],
    "supplier-lots": ["view", "create", "edit", "delete"],
    production: ["view", "create", "edit", "delete"],
    clients: ["view", "create", "edit", "delete"],
    orders: ["view", "create", "edit", "delete"],
    accounts: ["view", "create", "edit", "delete"],
    dashboard: ["view"],
    users: ["view", "create", "edit", "delete"],
  },
  MANAGER: {
    suppliers: ["view", "create", "edit", "delete"],
    "supplier-lots": ["view", "create", "edit", "delete"],
    production: ["view", "create", "edit"],
    clients: ["view", "create", "edit", "delete"],
    orders: ["view", "create", "edit", "delete"],
    accounts: ["view", "create", "edit", "delete"],
    dashboard: ["view"],
    users: [],
  },
  PRODUCTION: {
    suppliers: ["view"],
    "supplier-lots": ["view"],
    production: ["view", "create", "edit"],
    clients: [],
    orders: ["view"],
    accounts: [],
    dashboard: ["view"],
    users: [],
  },
};

export function hasPermission(
  role: UserRole,
  module: Module,
  permission: Permission
): boolean {
  return PERMISSIONS[role]?.[module]?.includes(permission) ?? false;
}

export function canAccessModule(role: UserRole, module: Module): boolean {
  if (role === "MANAGER" && module === "clients") {
    return false;
  }

  return (PERMISSIONS[role]?.[module]?.length ?? 0) > 0;
}

export function getAccessibleModules(role: UserRole): Module[] {
  return (Object.keys(PERMISSIONS[role]) as Module[]).filter(
    (mod) => canAccessModule(role, mod)
  );
}
