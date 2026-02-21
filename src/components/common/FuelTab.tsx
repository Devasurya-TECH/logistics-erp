"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FuelEntry } from '@/lib/types';
import { useStore } from '@/lib/store';
import { DocumentPlusIcon } from '@heroicons/react/24/outline';
import Tesseract from 'tesseract.js';

const FuelTab = ({ tripId }: { tripId: string }) => {
    const { user } = useAuth();
    const { addFuelEntry, fuelEntries } = useStore();
    const [amount, setAmount] = useState('');
    const [cost, setCost] = useState('');
    const [odometer, setOdometer] = useState('');
    const [pumpName, setPumpName] = useState('');
    const [fuelType, setFuelType] = useState<'diesel' | 'petrol' | 'ev' | 'cng'>('diesel');
    const [file, setFile] = useState<File | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState('');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsScanning(true);
        setScanError('');

        try {
            const { data: { text } } = await Tesseract.recognize(
                selectedFile,
                'eng',
                { logger: m => console.log(m) }
            );

            console.log("Scanned Text:", text);
            parseBillData(text);
        } catch (err) {
            console.error("OCR Error:", err);
            setScanError('Failed to read bill. Please enter details manually.');
        } finally {
            setIsScanning(false);
        }
    };

    const parseBillData = (text: string) => {
        // Normalize text
        const normalized = text.toLowerCase().replace(/[^\w\s\.\,\₹]/g, '');

        // Convert various currency symbols/formats to standard number
        const extractNumber = (str: string) => {
            const match = str.match(/[\d]+[\.\,][\d]{2}/);
            return match ? match[0].replace(',', '.') : null;
        };

        // Heuristic Parsing logic
        const lines = text.split('\n');
        let foundCost = '';
        let foundVolume = '';

        lines.forEach(line => {
            const lowerLine = line.toLowerCase();

            // Look for Total Amount
            if (lowerLine.includes('total') || lowerLine.includes('amount') || lowerLine.includes('net') || lowerLine.includes('sale')) {
                const num = extractNumber(line);
                if (num) foundCost = num;
            }

            // Look for Volume
            if (lowerLine.includes('vol') || lowerLine.includes('ltr') || lowerLine.includes('quantity') || lowerLine.includes('qty')) {
                const num = extractNumber(line);
                if (num) foundVolume = num;
            }
        });

        // Backup regex if line-by-line fails (look for largest currency-like number for cost)
        if (!foundCost) {
            const numbers = text.match(/\d+\.\d{2}/g)?.map(n => parseFloat(n)) || [];
            if (numbers.length > 0) {
                foundCost = Math.max(...numbers).toString();
            }
        }

        if (foundCost) setCost(foundCost);
        if (foundVolume) setAmount(foundVolume);

        if (!foundCost && !foundVolume) {
            setScanError('Could not auto-detect values. Please verify.');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const entry: FuelEntry = {
            id: `f-${Math.floor(Math.random() * 10000)}`,
            tripId,
            vehicleId: 'current-v', // Mock
            driverId: user?.id || '',
            amount: Number(amount),
            cost: Number(cost),
            currency: 'INR',
            odometer: Number(odometer),
            location: 'Uploaded from Bill',
            pumpName,
            fuelType,
            timestamp: new Date().toISOString(),
            status: 'pending',
            receiptImage: file ? URL.createObjectURL(file) : undefined
        };
        addFuelEntry(entry);
        // Reset form
        setAmount('');
        setCost('');
        setOdometer('');
        setPumpName('');
        setFile(null);
        alert("Fuel entry logged successfully!");
    };

    // Calculate totals - Mock budget logic
    const totalSpent = fuelEntries.reduce((acc, e) => acc + e.cost, 0);
    const budget = 25000;
    const remaining = budget - totalSpent;

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Fuel Spent</p>
                    <h3 className="text-2xl font-bold text-slate-800">₹{totalSpent.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Remaining Budget</p>
                    <h3 className={`text-2xl font-bold ${remaining < 5000 ? 'text-red-500' : 'text-green-600'}`}>₹{remaining.toLocaleString()}</h3>
                </div>
            </div>

            {/* Upload Form */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg relative overflow-hidden">
                {isScanning && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500 mb-4"></div>
                        <p className="text-orange-600 font-bold animate-pulse">Scanning Bill Details...</p>
                        <p className="text-xs text-slate-400 mt-2">Extracting Amount & Volume</p>
                    </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                        <DocumentPlusIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Upload Fuel Bill</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer group ${file ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-orange-300'
                        }`}>
                        <input
                            type="file"
                            className="hidden"
                            id="bill-upload"
                            onChange={handleFileChange}
                            accept="image/*"
                        />
                        <label htmlFor="bill-upload" className="cursor-pointer flex flex-col items-center w-full h-full">
                            {file ? (
                                <>
                                    <span className="text-4xl mb-2">📄</span>
                                    <div className="text-green-700 font-bold">{file.name}</div>
                                    <div className="text-xs text-green-600 mt-1">Tap to change</div>
                                </>
                            ) : (
                                <>
                                    <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📸</span>
                                    <span className="text-sm text-slate-500 font-medium">Tap to capture bill</span>
                                    <span className="text-xs text-orange-500 mt-2 font-bold">Auto-Scan Enabled ✨</span>
                                </>
                            )}
                        </label>
                    </div>

                    {scanError && (
                        <div className="text-xs text-red-500 bg-red-50 p-2 rounded text-center">
                            {scanError}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Amount (₹)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={cost}
                                onChange={e => setCost(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-800 font-bold outline-none ring-2 ring-transparent focus:ring-orange-500 transition-all text-lg"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Volume (L)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-800 font-bold outline-none ring-2 ring-transparent focus:ring-orange-500 transition-all text-lg"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Pump Name / Station</label>
                            <input
                                type="text"
                                value={pumpName}
                                onChange={e => setPumpName(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-800 font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-inner"
                                placeholder="e.g. Indian Oil, Kochi"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Fuel Type</label>
                            <select
                                value={fuelType}
                                onChange={e => setFuelType(e.target.value as any)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-800 font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-inner appearance-none"
                            >
                                <option value="diesel">Diesel</option>
                                <option value="petrol">Petrol</option>
                                <option value="cng">CNG</option>
                                <option value="ev">Electric</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Odometer Reading (km)</label>
                        <input
                            type="number"
                            value={odometer}
                            onChange={e => setOdometer(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-800 font-medium outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-inner"
                            placeholder="Current dashboard reading"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isScanning}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg uppercase tracking-wider text-sm flex items-center justify-center gap-2 transform active:scale-95 transition-transform mt-4"
                    >
                        Save Bill Entry
                    </button>
                </form>
            </div>
        </div>
    );
};

export default FuelTab;
