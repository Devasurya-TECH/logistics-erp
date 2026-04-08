"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = {
  name: string;
  href: string;
  icon: string;
};

const navByRole: Record<string, NavItem[]> = {
  manager: [
    { name: "Overview", href: "/manager", icon: "📊" },
    { name: "Trips", href: "/manager/trips", icon: "🧭" },
    { name: "Vehicles", href: "/manager/vehicles", icon: "🚛" },
    { name: "Fuel", href: "/manager/fuel", icon: "⛽" },
  ],
  supervisor: [
    { name: "Overview", href: "/supervisor", icon: "🛰️" },
    { name: "Trips", href: "/supervisor/trips", icon: "🧭" },
    { name: "Deliveries", href: "/supervisor/deliveries", icon: "📦" },
    { name: "Drivers", href: "/supervisor/drivers", icon: "👥" },
    { name: "Tracking", href: "/supervisor/tracking", icon: "📍" },
    { name: "Fuel", href: "/supervisor/fuel", icon: "⛽" },
    { name: "Reports", href: "/supervisor/reports", icon: "📈" },
    { name: "Activity", href: "/supervisor/activity", icon: "🗂️" },
    { name: "Settings", href: "/supervisor/settings", icon: "⚙️" },
  ],
  driver: [
    { name: "Overview", href: "/driver", icon: "🚚" },
    { name: "Routes", href: "/driver/routes", icon: "🛣️" },
    { name: "Activity", href: "/driver/activity", icon: "🧾" },
    { name: "Settings", href: "/driver/settings", icon: "⚙️" },
  ],
};

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }
  if (href === "/manager" || href === "/supervisor" || href === "/driver") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  const navItems = useMemo(() => {
    if (!user) {
      return [];
    }
    return navByRole[user.role] ?? [];
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <>
      <aside className="hidden w-[250px] flex-shrink-0 border-r border-white/70 bg-white/70 p-5 backdrop-blur md:flex md:flex-col">
        <Link href="/" className="mb-6 block rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            LogiTrace
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">Ops Console</p>
          <p className="mt-1 text-xs text-slate-500 capitalize">{user.role}</p>
        </Link>

        <nav className="custom-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-emerald-700 text-white shadow-lg shadow-emerald-900/20"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur md:hidden">
        <div className="grid grid-cols-4 gap-2">
          {navItems.slice(0, 4).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                  active
                    ? "bg-emerald-700 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="mt-0.5 truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
