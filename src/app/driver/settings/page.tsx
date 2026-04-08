"use client";

import { useEffect, useState } from "react";

type DriverSettings = {
  darkMap: boolean;
  autoOpenNavigation: boolean;
  shareLocationByDefault: boolean;
};

const STORAGE_KEY = "logitrace_driver_settings";

const defaults: DriverSettings = {
  darkMap: false,
  autoOpenNavigation: true,
  shareLocationByDefault: true,
};

export default function DriverSettingsPage() {
  const [settings, setSettings] = useState<DriverSettings>(defaults);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<DriverSettings>;
      setSettings({
        darkMap: parsed.darkMap ?? defaults.darkMap,
        autoOpenNavigation: parsed.autoOpenNavigation ?? defaults.autoOpenNavigation,
        shareLocationByDefault:
          parsed.shareLocationByDefault ?? defaults.shareLocationByDefault,
      });
    } catch {
      setSettings(defaults);
    }
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <section className="surface-strong max-w-xl p-6">
      <h2 className="text-lg font-bold text-slate-900">Driver Preferences</h2>
      <p className="mt-1 text-sm text-slate-600">
        Customize your route and tracking defaults for this device.
      </p>

      <div className="mt-5 space-y-3">
        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">Dark map theme</span>
          <input
            type="checkbox"
            checked={settings.darkMap}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, darkMap: event.target.checked }))
            }
            className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-200"
          />
        </label>

        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">
            Auto-open navigation when trip starts
          </span>
          <input
            type="checkbox"
            checked={settings.autoOpenNavigation}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                autoOpenNavigation: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-200"
          />
        </label>

        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">
            Share location by default
          </span>
          <input
            type="checkbox"
            checked={settings.shareLocationByDefault}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                shareLocationByDefault: event.target.checked,
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
