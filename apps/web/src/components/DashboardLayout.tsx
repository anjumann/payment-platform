"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useTenant } from "@/lib/tenant-context";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const menuItems = [
  { text: "Dashboard", icon: LayoutDashboard, href: "/" },
  { text: "Payments", icon: CreditCard, href: "/payments" },
  { text: "Analytics", icon: BarChart3, href: "/analytics" },
  { text: "Settings", icon: Settings, href: "/settings" },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { tenant } = useTenant();
  const pathname = usePathname();

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "enterprise":
        return <Badge variant="success">{tier.toUpperCase()}</Badge>;
      case "professional":
        return <Badge variant="default">{tier.toUpperCase()}</Badge>;
      default:
        return <Badge variant="secondary">{tier.toUpperCase()}</Badge>;
    }
  };

  const Sidebar = ({ className }: { className?: string }) => (
    <aside className={cn("flex flex-col h-full bg-card border-r", className)}>
      {/* Logo */}
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold text-primary truncate">
          {tenant?.name || "Payment Platform"}
        </h1>
        {tenant && <div className="mt-2">{getTierBadge(tenant.tier)}</div>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-4 w-4" />
              {item.text}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
            {tenant?.name?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Admin</p>
            <p className="text-xs text-muted-foreground truncate">
              {tenant?.slug || "tenant"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-50 flex items-center gap-4 border-b bg-card px-4 h-14">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
        <h1 className="font-semibold">
          {menuItems.find((item) => item.href === pathname)?.text ||
            "Dashboard"}
        </h1>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar />
      </div>

      {/* Desktop layout */}
      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block w-64 fixed inset-y-0">
          <Sidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 lg:ml-64">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
