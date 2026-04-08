"use client";

import { useEffect, useState } from "react";

type SupervisorSettings = {
  refreshSeconds: number;
  autoAssign: boolean;
  notifyCriticalOnly: boolean;
};

const STORAGE_KEY = "logitrace_supervisor_settings";

const defaultSettings: SupervisorSettings = {
  refreshSeconds: 3,
  autoAssign: false,
  notifyCriticalOnly: false,
};

export default function SupervisorSettingsPage() {
  const [settings, setSettings] = useState<SupervisorSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<SupervisorSettings>;
      setSettings({
        refreshSeconds: parsed.refreshSeconds ?? defaultSettings.refreshSeconds,
        autoAssign: parsed.autoAssign ?? defaultSettings.autoAssign,
        notifyCriticalOnly: parsed.notifyCriticalOnly ?? defaultSettings.notifyCriticalOnly,
      });
    } catch {
      setSettings(defaultSettings);
    }
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <section className="surface-strong max-w-2xl p-6">
      <h2 className="text-lg font-bold text-slate-900">Supervisor Preferences</h2>
      <p className="mt-1 text-sm text-slate-600">
        Save your operational defaults for this device.
      </p>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Data refresh interval (seconds)</span>
          <input
            type="number"
            min={1}
            max={30}
            value={settings.refreshSeconds}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                refreshSeconds: Number(event.target.value),
              }))
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
          />
        </label>

        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">Auto-assign available driver on trip creation</span>
          <input
            type="checkbox"
            checked={settings.autoAssign}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                autoAssign: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-200"
          />
        </label>

        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">Receive only high/critical alert notifications</span>
          <input
            type="checkbox"
            checked={settings.notifyCriticalOnly}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                notifyCriticalOnly: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-200"
          />
        </label>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Save Preferences
        </button>
        {saved ? <p className="text-xs font-semibold text-emerald-700">Saved</p> : null}
      </div>
    </section>
  );
}
