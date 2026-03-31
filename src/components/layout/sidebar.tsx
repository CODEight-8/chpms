"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { canAccessModule } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import {
  LayoutDashboard,
  Truck,
  Package,
  Factory,
  Users,
  ShoppingCart,
  Wallet,
  Settings,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: UserRole;
  };
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" as const },
  { href: "/suppliers", label: "Suppliers", icon: Truck, module: "suppliers" as const },
  { href: "/supplier-lots", label: "Supplier Lots", icon: Package, module: "supplier-lots" as const },
  { href: "/production", label: "Production", icon: Factory, module: "production" as const },
  { href: "/clients", label: "Clients", icon: Users, module: "clients" as const },
  { href: "/orders", label: "Orders", icon: ShoppingCart, module: "orders" as const },
  { href: "/accounts", label: "Accounts", icon: Wallet, module: "accounts" as const },
  { href: "/users", label: "User Management", icon: Settings, module: "users" as const },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const accessibleItems = navItems.filter((item) =>
    canAccessModule(user.role, item.module)
  );

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-emerald-900 text-white flex flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-emerald-800">
        <span className="text-2xl">🥥</span>
        <div>
          <h1 className="text-lg font-bold leading-tight">CHPMS</h1>
          <p className="text-xs text-emerald-300">Processing Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {accessibleItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-700 text-white"
                      : "text-emerald-200 hover:bg-emerald-800 hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="border-t border-emerald-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-emerald-700 flex items-center justify-center text-sm font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-emerald-300 truncate">{user.role}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
