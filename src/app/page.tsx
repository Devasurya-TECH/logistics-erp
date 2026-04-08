"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const featureCards = [
  {
    title: "Role Based Ops",
    description:
      "Managers, supervisors, and drivers each get focused workflows with zero clutter.",
  },
  {
    title: "Live Fleet Signal",
    description:
      "Track vehicle movement, trip progress, and route health from a single command center.",
  },
  {
    title: "Fuel And Cost Control",
    description:
      "Verify fuel spend quickly and watch operating costs in near real time.",
  },
];

const roleCards = [
  { role: "Manager", href: "/manager", tone: "from-emerald-600 to-teal-700" },
  {
    role: "Supervisor",
    href: "/supervisor",
    tone: "from-cyan-600 to-sky-700",
  },
  { role: "Driver", href: "/driver", tone: "from-amber-500 to-orange-600" },
];

export default function HomePage() {
  const { user, isLoading } = useAuth();

  return (
    <main className="min-h-screen px-6 py-10 md:px-10 md:py-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <section className="surface-strong page-enter relative overflow-hidden p-8 md:p-12">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-cyan-200/40 blur-3xl" />

          <div className="relative grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
            <div>
              <p className="section-title mb-4">Logistics ERP Rebuilt</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
                Full stack logistics website ready for live operations
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-slate-600 md:text-base">
                Plan trips, manage fleet health, monitor deliveries, and keep
                drivers synchronized through one streamlined platform.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={user ? `/${user.role}` : "/login"}
                  className="rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:brightness-110"
                >
                  {isLoading
                    ? "Loading session..."
                    : user
                      ? `Continue as ${user.role}`
                      : "Open Login Portal"}
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Switch Role
                </Link>
              </div>
            </div>

            <div className="surface p-5">
              <p className="section-title mb-3">Portal Access</p>
              <div className="space-y-2">
                {roleCards.map((item) => (
                  <Link
                    key={item.role}
                    href={item.href}
                    className={`block rounded-xl bg-gradient-to-r ${item.tone} px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5`}
                  >
                    Enter {item.role} Workspace
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {featureCards.map((feature) => (
            <article key={feature.title} className="surface p-5 page-enter">
              <h2 className="text-lg font-bold text-slate-900">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {feature.description}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
