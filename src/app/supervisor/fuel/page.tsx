"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";

function statusBadge(status: string): string {
  if (status === "approved") return "badge badge-success";
  if (status === "verified") return "badge badge-info";
  if (status === "pending") return "badge badge-warning";
  return "badge badge-danger";
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SupervisorFuelPage() {
  const { user } = useAuth();
  const { fuelEntries, vehicles, verifyFuelEntry, rejectFuelEntry } = useStore();

  const sortedEntries = [...fuelEntries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <section className="surface-strong overflow-hidden">
      <div className="custom-scrollbar overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Entry</th>
              <th className="px-5 py-3">Vehicle</th>
              <th className="px-5 py-3">Litres</th>
              <th className="px-5 py-3">Cost</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedEntries.map((entry) => {
              const vehicle = vehicles.find((item) => item.id === entry.vehicleId);
              const canReview = entry.status === "pending";

              return (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-800">#{entry.id.toUpperCase()}</p>
                    <p className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleString()}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{vehicle?.plateNumber ?? entry.vehicleId}</td>
                  <td className="px-5 py-3 text-slate-700">{entry.amount}</td>
                  <td className="px-5 py-3 text-slate-700">{formatMoney(entry.cost)}</td>
                  <td className="px-5 py-3">
                    <span className={statusBadge(entry.status)}>{entry.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!canReview || !user}
                        onClick={() => {
                          if (!user) return;
                          verifyFuelEntry(entry.id, user.id);
                        }}
                        className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        disabled={!canReview || !user}
                        onClick={() => {
                          if (!user) return;
                          rejectFuelEntry(entry.id, user.id);
                        }}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
