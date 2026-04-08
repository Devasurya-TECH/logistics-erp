"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/types";

const APP_ROLE = process.env.NEXT_PUBLIC_APP_ROLE as UserRole | undefined;

type RoleConfig = {
  label: string;
  subtitle: string;
  ring: string;
  button: string;
  users: Array<{ name: string; email: string }>;
};

const roleConfig: Record<UserRole, RoleConfig> = {
  manager: {
    label: "Manager",
    subtitle: "Executive analytics and control",
    ring: "ring-emerald-200 border-emerald-200 bg-emerald-50",
    button:
      "bg-gradient-to-r from-emerald-700 to-teal-700 shadow-emerald-900/20",
    users: [{ name: "Arjun", email: "manager@logistics.com" }],
  },
  supervisor: {
    label: "Supervisor",
    subtitle: "Dispatch operations and delivery coordination",
    ring: "ring-cyan-200 border-cyan-200 bg-cyan-50",
    button: "bg-gradient-to-r from-cyan-700 to-sky-700 shadow-cyan-900/20",
    users: [{ name: "Lakshmi", email: "supervisor@logistics.com" }],
  },
  driver: {
    label: "Driver",
    subtitle: "Trip execution, navigation and updates",
    ring: "ring-amber-200 border-amber-200 bg-amber-50",
    button:
      "bg-gradient-to-r from-amber-500 to-orange-600 shadow-orange-900/20",
    users: [
      { name: "Rahul", email: "driver@logistics.com" },
      { name: "Vishnu", email: "driver2@logistics.com" },
      { name: "Fasil", email: "driver3@logistics.com" },
    ],
  },
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(APP_ROLE ?? "manager");
  const [email, setEmail] = useState(roleConfig[APP_ROLE ?? "manager"].users[0].email);
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const singleRole = Boolean(APP_ROLE);
  const config = useMemo(() => roleConfig[role], [role]);

  const onRoleChange = (nextRole: UserRole) => {
    setRole(nextRole);
    setEmail(roleConfig[nextRole].users[0].email);
    setPassword("demo123");
    setError("");
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password !== "demo123") {
      setError('Invalid password. Use "demo123".');
      return;
    }

    setIsSubmitting(true);
    const success = await login(email.trim().toLowerCase(), role);
    setIsSubmitting(false);

    if (!success) {
      setError("User not found for the selected role.");
      return;
    }

    router.push(`/${role}`);
  };

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-14">
      <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[1.1fr_1fr]">
        <section className="surface-strong page-enter p-8 md:p-10">
          <p className="section-title mb-4">LogiTrace Access</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Welcome back to fleet control
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-base">
            Sign in with your role account to manage logistics, deliveries, and
            operational performance from a single workspace.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {(Object.keys(roleConfig) as UserRole[]).map((key) => (
              <button
                key={key}
                type="button"
                disabled={singleRole}
                onClick={() => onRoleChange(key)}
                className={`rounded-xl border p-3 text-left transition ${role === key ? roleConfig[key].ring : "border-slate-200 bg-white hover:bg-slate-50"} ${singleRole ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <p className="text-sm font-semibold text-slate-900">
                  {roleConfig[key].label}
                </p>
                <p className="mt-1 text-xs text-slate-500">{roleConfig[key].subtitle}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="surface p-6 md:p-8">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Quick Accounts
              </p>
              <div className="flex flex-wrap gap-2">
                {config.users.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => setEmail(account.email)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${email === account.email ? config.ring : "border-slate-300 text-slate-600 hover:bg-white"}`}
                  >
                    {account.name}
                  </button>
                ))}
              </div>
            </div>

            {error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${config.button}`}
            >
              {isSubmitting
                ? "Signing in..."
                : `Enter ${config.label} Workspace`}
            </button>

            <p className="text-center text-xs text-slate-500">
              Demo password: <span className="font-semibold">demo123</span>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
