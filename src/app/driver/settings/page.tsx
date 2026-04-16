"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/lib/notifications";

export default function DriverSettingsPage() {
    const { user } = useAuth();
    const { addNotification } = useNotifications();

    const [fullName, setFullName] = useState(user?.name || "");
    const [phone, setPhone] = useState("+91 ");
    const [shareLiveLocation, setShareLiveLocation] = useState(true);
    const [receiveTripAlerts, setReceiveTripAlerts] = useState(true);
    const [fuelReminder, setFuelReminder] = useState(true);
    const [darkModePreference, setDarkModePreference] = useState(false);

    return (
        <div className="space-y-5">
            <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Profile</h3>
                <div>
                    <label className="block text-xs text-slate-600 mb-1">Full name</label>
                    <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs text-slate-600 mb-1">Email</label>
                    <input
                        value={user?.email || ""}
                        disabled
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500"
                    />
                </div>
                <div>
                    <label className="block text-xs text-slate-600 mb-1">Phone</label>
                    <input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Driver Preferences</h3>
                <ToggleRow label="Share live location" value={shareLiveLocation} onChange={setShareLiveLocation} />
                <ToggleRow label="Receive trip alerts" value={receiveTripAlerts} onChange={setReceiveTripAlerts} />
                <ToggleRow label="Fuel reminders" value={fuelReminder} onChange={setFuelReminder} />
                <ToggleRow label="Dark mode preference" value={darkModePreference} onChange={setDarkModePreference} />
            </section>

            <section>
                <button
                    type="button"
                    onClick={() => {
                        addNotification("success", "Settings Saved", "Driver settings updated.");
                    }}
                    className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                    Save Settings
                </button>
            </section>
        </div>
    );
}

function ToggleRow({
    label,
    value,
    onChange,
}: {
    label: string;
    value: boolean;
    onChange: (nextValue: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-sm text-slate-800">{label}</p>
            <button
                type="button"
                onClick={() => onChange(!value)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                    value ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                }`}
            >
                {value ? "On" : "Off"}
            </button>
        </div>
    );
}

