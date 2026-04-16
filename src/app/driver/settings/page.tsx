"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useNotifications } from "@/lib/notifications";
import {
    UserCircleIcon,
    BellIcon,
    CogIcon,
    ShieldCheckIcon,
    PaintBrushIcon,
    DevicePhoneMobileIcon,
    GlobeAltIcon,
    CheckIcon,
} from "@heroicons/react/24/outline";

interface SettingSection {
    id: string;
    label: string;
    icon: any;
}

const sections: SettingSection[] = [
    { id: 'profile', label: 'Profile', icon: UserCircleIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'appearance', label: 'Appearance', icon: PaintBrushIcon },
    { id: 'system', label: 'System', icon: CogIcon },
];

export default function SettingsPage() {
    const { user } = useAuth();
    const { addNotification } = useNotifications();
    const [activeSection, setActiveSection] = useState('profile');
    const [savedMessage, setSavedMessage] = useState('');

    // Notification preferences
    const [notifPrefs, setNotifPrefs] = useState({
        tripUpdates: true,
        deliveryAlerts: true,
        fuelEntries: true,
        systemAlerts: true,
        soundEnabled: true,
        emailDigest: false,
    });

    // Appearance preferences
    const [appearance, setAppearance] = useState({
        compactMode: false,
        animationsEnabled: true,
        highContrast: false,
    });

    const handleSave = () => {
        setSavedMessage('Settings saved successfully!');
        addNotification('success', 'Settings Updated', 'Your preferences have been saved.');
        setTimeout(() => setSavedMessage(''), 3000);
    };

    const ToggleSwitch = ({ enabled, onChange, label, description }: {
        enabled: boolean;
        onChange: (val: boolean) => void;
        label: string;
        description?: string;
    }) => (
        <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div>
                <p className="text-sm font-bold text-slate-700">{label}</p>
                {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
            </div>
            <button
                onClick={() => onChange(!enabled)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );

    return (
        <div className="space-y-6 pb-24 md:pb-4">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Settings</h1>
                <p className="text-slate-400 text-sm mt-1">Manage your preferences and account</p>
            </div>

            {/* Success Message */}
            {savedMessage && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-bold animate-fade-in-up">
                    <CheckIcon className="w-5 h-5" />
                    {savedMessage}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Section Nav */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-l-4 ${activeSection === section.id
                                        ? 'bg-blue-50 border-l-blue-500 text-blue-700'
                                        : 'border-l-transparent text-slate-500 hover:bg-gray-50 hover:text-slate-700'
                                    }`}
                            >
                                <section.icon className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-bold">{section.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Section Content */}
                <div className="lg:col-span-3">
                    {activeSection === 'profile' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-fade-in space-y-6">
                            <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-200">
                                    {user?.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-800">{user?.name}</h3>
                                    <p className="text-sm text-slate-400 capitalize">{user?.role} · LogiTrace ERP</p>
                                    <p className="text-xs text-slate-300 mt-0.5">{user?.email}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Full Name</label>
                                    <input
                                        type="text"
                                        defaultValue={user?.name}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-slate-800 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Email</label>
                                    <input
                                        type="email"
                                        defaultValue={user?.email}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-slate-800 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Role</label>
                                    <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-slate-500 font-medium capitalize flex items-center gap-2">
                                        <ShieldCheckIcon className="w-4 h-4 text-blue-500" />
                                        {user?.role}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Phone</label>
                                    <input
                                        type="tel"
                                        defaultValue="+91 94XX XXX XXX"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-slate-800 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 text-sm"
                            >
                                Save Changes
                            </button>
                        </div>
                    )}

                    {activeSection === 'notifications' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-fade-in">
                            <div className="mb-5">
                                <h3 className="text-lg font-bold text-slate-800">Notification Preferences</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Control which notifications you receive</p>
                            </div>
                            <div className="space-y-1">
                                <ToggleSwitch
                                    enabled={notifPrefs.tripUpdates}
                                    onChange={(v) => setNotifPrefs({ ...notifPrefs, tripUpdates: v })}
                                    label="Trip Updates"
                                    description="Get notified when trips are created, started, or completed"
                                />
                                <ToggleSwitch
                                    enabled={notifPrefs.deliveryAlerts}
                                    onChange={(v) => setNotifPrefs({ ...notifPrefs, deliveryAlerts: v })}
                                    label="Delivery Alerts"
                                    description="Notifications for successful and failed deliveries"
                                />
                                <ToggleSwitch
                                    enabled={notifPrefs.fuelEntries}
                                    onChange={(v) => setNotifPrefs({ ...notifPrefs, fuelEntries: v })}
                                    label="Fuel Entries"
                                    description="Get alerted when drivers log fuel claims"
                                />
                                <ToggleSwitch
                                    enabled={notifPrefs.systemAlerts}
                                    onChange={(v) => setNotifPrefs({ ...notifPrefs, systemAlerts: v })}
                                    label="System Alerts"
                                    description="Critical system alerts like geofence violations"
                                />
                                <ToggleSwitch
                                    enabled={notifPrefs.soundEnabled}
                                    onChange={(v) => setNotifPrefs({ ...notifPrefs, soundEnabled: v })}
                                    label="Sound Notifications"
                                    description="Play a sound when new notifications arrive"
                                />
                                <ToggleSwitch
                                    enabled={notifPrefs.emailDigest}
                                    onChange={(v) => setNotifPrefs({ ...notifPrefs, emailDigest: v })}
                                    label="Daily Email Digest"
                                    description="Receive a summary of the day's activity via email"
                                />
                            </div>
                            <button
                                onClick={handleSave}
                                className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 text-sm"
                            >
                                Save Preferences
                            </button>
                        </div>
                    )}

                    {activeSection === 'appearance' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-fade-in">
                            <div className="mb-5">
                                <h3 className="text-lg font-bold text-slate-800">Appearance</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Customize the look and feel</p>
                            </div>
                            <div className="space-y-1">
                                <ToggleSwitch
                                    enabled={appearance.compactMode}
                                    onChange={(v) => setAppearance({ ...appearance, compactMode: v })}
                                    label="Compact Mode"
                                    description="Reduce spacing for more content on screen"
                                />
                                <ToggleSwitch
                                    enabled={appearance.animationsEnabled}
                                    onChange={(v) => setAppearance({ ...appearance, animationsEnabled: v })}
                                    label="Animations"
                                    description="Enable smooth transitions and micro-animations"
                                />
                                <ToggleSwitch
                                    enabled={appearance.highContrast}
                                    onChange={(v) => setAppearance({ ...appearance, highContrast: v })}
                                    label="High Contrast"
                                    description="Increase contrast for better visibility"
                                />
                            </div>

                            {/* Theme Preview */}
                            <div className="mt-6 pt-5 border-t border-gray-100">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Theme</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <button className="p-4 bg-white border-2 border-blue-500 rounded-xl text-center shadow-sm">
                                        <div className="w-full h-8 bg-gradient-to-r from-white to-gray-100 rounded-lg mb-2 border border-gray-200" />
                                        <span className="text-xs font-bold text-blue-600">Light</span>
                                    </button>
                                    <button className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-center opacity-50">
                                        <div className="w-full h-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg mb-2" />
                                        <span className="text-xs font-bold text-slate-400">Dark (Soon)</span>
                                    </button>
                                    <button className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-center opacity-50">
                                        <div className="w-full h-8 bg-gradient-to-r from-white to-gray-800 rounded-lg mb-2" />
                                        <span className="text-xs font-bold text-slate-400">Auto (Soon)</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 text-sm"
                            >
                                Save Preferences
                            </button>
                        </div>
                    )}

                    {activeSection === 'system' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-fade-in space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">System Information</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Application details and version info</p>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { label: 'Application', value: 'LogiTrace ERP' },
                                    { label: 'Version', value: 'v2.4.0' },
                                    { label: 'Environment', value: process.env.NODE_ENV || 'development' },
                                    { label: 'API Version', value: 'REST v1' },
                                    { label: 'Framework', value: 'Next.js 16' },
                                    { label: 'Map Provider', value: 'OpenStreetMap (CARTO)' },
                                    { label: 'Timezone', value: Intl.DateTimeFormat().resolvedOptions().timeZone },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50">
                                        <span className="text-sm text-slate-500 font-medium">{item.label}</span>
                                        <span className="text-sm font-bold text-slate-800">{item.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <GlobeAltIcon className="w-5 h-5 text-blue-600" />
                                    <span className="text-sm font-bold text-blue-800">Need Support?</span>
                                </div>
                                <p className="text-xs text-blue-600">Contact the LogiTrace support team at support@logitrace.dev</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
