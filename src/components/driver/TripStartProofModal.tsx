"use client";

import { useState } from "react";
import type { TripCheckpointProof } from "@/lib/types";

function getCurrentPosition() {
    return new Promise<GeolocationPosition>((resolve, reject) => {
        if (typeof window === "undefined" || !navigator.geolocation) {
            reject(new Error("Geolocation unavailable"));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 30000,
        });
    });
}

async function reverseGeocode(lat: number, lng: number) {
    try {
        const params = new URLSearchParams({
            format: "json",
            lat: String(lat),
            lon: String(lng),
            zoom: "17",
            addressdetails: "1",
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
            headers: {
                Accept: "application/json",
                "User-Agent": "LogisticsERP/1.0",
            },
        });
        if (!response.ok) return "";
        const data = await response.json();
        return String(data?.display_name || "").trim();
    } catch {
        return "";
    }
}

interface TripStartProofModalProps {
    tripId: string;
    onClose: () => void;
    onSubmit: (proof: TripCheckpointProof) => Promise<void> | void;
    mode?: "start" | "end";
}

export default function TripStartProofModal({
    tripId,
    onClose,
    onSubmit,
    mode = "start",
}: TripStartProofModalProps) {
    const [odometer, setOdometer] = useState("");
    const [fuelReading, setFuelReading] = useState("");
    const [image, setImage] = useState("");
    const [location, setLocation] = useState("");
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [locating, setLocating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const isEnd = mode === "end";

    const captureLocation = async () => {
        setLocating(true);
        setError("");
        try {
            const position = await getCurrentPosition();
            const nextLat = position.coords.latitude;
            const nextLng = position.coords.longitude;
            setLat(nextLat);
            setLng(nextLng);
            const resolved = await reverseGeocode(nextLat, nextLng);
            setLocation(resolved || `Lat ${nextLat.toFixed(6)}, Lng ${nextLng.toFixed(6)}`);
        } catch {
            setError("Location is required. Enable location permission and try again.");
        } finally {
            setLocating(false);
        }
    };

    const handleSubmit = async () => {
        const parsedOdometer = Number(odometer);
        const parsedFuelReading = Number(fuelReading);

        if (!Number.isFinite(parsedOdometer) || parsedOdometer <= 0) {
            setError("Enter a valid odometer reading.");
            return;
        }
        if (!Number.isFinite(parsedFuelReading) || parsedFuelReading < 0) {
            setError("Enter a valid fuel reading.");
            return;
        }
        if (!image) {
            setError("Upload odometer and fuel reading photo.");
            return;
        }
        if (lat === null || lng === null || !location.trim()) {
            setError(`Capture current location before ${isEnd ? "ending the day" : "starting the trip"}.`);
            return;
        }

        setSubmitting(true);
        setError("");
        try {
            await onSubmit({
                odometer: parsedOdometer,
                fuelReading: parsedFuelReading,
                image,
                capturedAt: new Date().toISOString(),
                lat,
                lng,
                location: location.trim(),
            });
            onClose();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : `Unable to ${isEnd ? "end the day" : "start trip"}.`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/35 p-4 flex items-center justify-center">
            <article className="w-full max-w-xl rounded-xl bg-white border border-gray-200 p-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-slate-900">{isEnd ? "End Day Proof Required" : "Start Trip Proof Required"}</h3>
                <p className="text-xs text-slate-500 mt-1">
                    Trip #{tripId.toUpperCase()} needs odometer, fuel reading, photo, and live location before {isEnd ? "ending the day" : "start"}.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs text-slate-600 mb-1">Odometer Reading</label>
                        <input
                            type="number"
                            value={odometer}
                            onChange={(event) => setOdometer(event.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            placeholder="Example: 120450"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-600 mb-1">Fuel Reading</label>
                        <input
                            type="number"
                            value={fuelReading}
                            onChange={(event) => setFuelReading(event.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            placeholder="Fuel level / litres"
                        />
                    </div>
                </div>

                <div className="mt-3">
                    <label className="block text-xs text-slate-600 mb-1">Odometer + Fuel Reading Photo</label>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                                setImage(typeof reader.result === "string" ? reader.result : "");
                            };
                            reader.readAsDataURL(file);
                        }}
                        className="block w-full text-xs text-slate-600 file:mr-3 file:px-3 file:py-2 file:border-0 file:rounded-lg file:bg-blue-600 file:text-white file:text-xs file:font-semibold hover:file:bg-blue-700"
                    />
                    {image && (
                        <img
                            src={image}
                            alt={isEnd ? "Trip end proof preview" : "Trip start proof preview"}
                            className="mt-2 w-56 h-36 object-cover rounded-lg border border-gray-200"
                        />
                    )}
                </div>

                <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-slate-50">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-700">{isEnd ? "End Location" : "Start Location"}</p>
                        <button
                            type="button"
                            disabled={locating}
                            onClick={() => {
                                void captureLocation();
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {locating ? "Fetching..." : "Use Current Location"}
                        </button>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">{location || "No location captured yet."}</p>
                    {lat !== null && lng !== null && (
                        <p className="text-[11px] text-slate-500 mt-1">
                            Lat: {lat.toFixed(6)} | Lng: {lng.toFixed(6)}
                        </p>
                    )}
                </div>

                {error && <p className="mt-3 text-xs font-semibold text-rose-700">{error}</p>}

                <div className="mt-4 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-slate-600"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                            void handleSubmit();
                        }}
                        className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {submitting ? (isEnd ? "Saving..." : "Starting...") : (isEnd ? "Submit Proof & End Day" : "Submit Proof & Start")}
                    </button>
                </div>
            </article>
        </div>
    );
}
