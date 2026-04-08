"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";
import { useNotifications } from "@/lib/notifications";

const titleMap: Record<string, { title: string; subtitle: string }> = {
  "/manager": { title: "Manager Overview", subtitle: "Executive fleet health" },
  "/manager/trips": { title: "Trip Ledger", subtitle: "Status and fulfillment" },
  "/manager/vehicles": {
    title: "Vehicle Board",
    subtitle: "Fleet availability and service windows",
  },
  "/manager/fuel": {
    title: "Fuel Governance",
    subtitle: "Spend approvals and variance",
  },
  "/supervisor": { title: "Supervisor Overview", subtitle: "Daily dispatch pulse" },
  "/supervisor/trips": { title: "Trip Queue", subtitle: "Assignment control" },
  "/supervisor/deliveries": {
    title: "Delivery Desk",
    subtitle: "Drop-level progress and risk",
  },
  "/supervisor/drivers": {
    title: "Driver Board",
    subtitle: "Availability and allocation",
  },
  "/supervisor/tracking": { title: "Live Tracking", subtitle: "Vehicle positions" },
  "/supervisor/fuel": { title: "Fuel Review", subtitle: "Verify and resolve claims" },
  "/supervisor/reports": {
    title: "Reports",
    subtitle: "Performance and cost intelligence",
  },
  "/supervisor/activity": { title: "Activity", subtitle: "Operational timeline" },
  "/supervisor/settings": { title: "Settings", subtitle: "Workspace preferences" },
  "/driver": { title: "Driver Overview", subtitle: "Current trip and next actions" },
  "/driver/routes": { title: "Route Plan", subtitle: "Navigation order and ETA" },
  "/driver/activity": { title: "My Activity", subtitle: "Trips and fuel history" },
  "/driver/settings": { title: "Driver Settings", subtitle: "Device and profile" },
};

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const alerts = useStore((state) => state.alerts);
  const { notifications } = useNotifications();

  const page = useMemo(() => {
    if (titleMap[pathname]) {
      return titleMap[pathname];
    }

    const fallback = Object.entries(titleMap).find(([route]) =>
      pathname.startsWith(route),
    );

    return fallback?.[1] ?? { title: "Workspace", subtitle: "Operations" };
  }, [pathname]);

  const unresolvedAlerts = alerts.filter((alert) => !alert.resolved).length;
  const unreadNotifications = notifications.filter((note) => !note.read).length;

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 px-4 py-3 backdrop-blur md:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="section-title">{user?.role ?? "Workspace"}</p>
          <h1 className="truncate text-lg font-bold text-slate-900 md:text-xl">
            {page.title}
          </h1>
          <p className="hidden text-xs text-slate-500 sm:block">{page.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="surface hidden items-center gap-2 px-3 py-1.5 sm:flex">
            <span className="text-xs font-semibold text-slate-600">
              Alerts {unresolvedAlerts}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span className="text-xs font-semibold text-slate-600">
              Inbox {unreadNotifications}
            </span>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
