"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="surface-strong flex items-center gap-3 px-5 py-4">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700 border-r-transparent" />
          <p className="text-sm font-semibold text-slate-700">
            Loading workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col md:h-screen md:flex-row">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col md:h-screen">
        <Header />
        <main className="custom-scrollbar flex-1 overflow-y-auto px-4 pb-24 pt-4 md:px-8 md:pb-8 md:pt-6">
          <div className="mx-auto w-full max-w-7xl page-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
