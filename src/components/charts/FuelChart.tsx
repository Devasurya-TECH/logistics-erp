"use client";

import { FuelEntry } from '@/lib/types';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

interface FuelChartProps {
    entries: FuelEntry[];
}

export default function FuelChart({ entries }: FuelChartProps) {
    // Aggregate data by month or simply show recent entries
    const data = entries.map((e) => ({
        name: e.timestamp.slice(0, 10),
        amount: e.amount,
        cost: e.cost,
    }));

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm w-full h-[400px]">
            <h3 className="text-lg font-bold text-slate-800 mb-6 tracking-tight">Fuel Consumption & Cost (Weekly)</h3>
            <ResponsiveContainer width="100%" height="90%">
                <BarChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            color: '#1e293b',
                            fontSize: '12px'
                        }}
                        cursor={{ fill: '#f1f5f9' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="amount" name="Volume (L)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="cost" name="Cost ($)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
