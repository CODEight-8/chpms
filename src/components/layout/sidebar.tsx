"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { canAccessModule } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { SystemStatus } from "./system-status";
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
  Menu,
  X,
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const accessibleItems = navItems.filter((item) =>
    canAccessModule(user.role, item.module)
  );

  function handleNavClick() {
    setMobileOpen(false);
  }

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-emerald-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🥥</span>
          <div>
            <h1 className="text-lg font-bold leading-tight">CHPMS</h1>
            <p className="text-xs text-emerald-300">Processing Management</p>
          </div>
        </div>
        {/* Close button - mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1 rounded text-emerald-300 hover:text-white hover:bg-emerald-800"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
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
                  onClick={handleNavClick}
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

      {/* System Status */}
      <div className="px-3 pb-2">
        <SystemStatus />
      </div>

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
    </>
  );

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-emerald-900 text-white flex items-center gap-3 px-4 py-3 border-b border-emerald-800">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1 rounded hover:bg-emerald-800"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <span className="text-lg">🥥</span>
        <span className="font-bold">CHPMS</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 bg-emerald-900 text-white flex flex-col transition-transform duration-200",
          // Desktop: always visible
          "md:translate-x-0",
          // Mobile: hidden by default, slide in when open
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
