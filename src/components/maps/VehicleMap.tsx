"use client";

import dynamic from 'next/dynamic';
import { Vehicle } from '@/lib/types';

const VehicleMapContent = dynamic(() => import('./MapComponent'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-50 animate-pulse rounded-xl flex items-center justify-center text-slate-400 font-medium">Loading map...</div>
});

export default function VehicleMap({ vehicles }: { vehicles: Vehicle[] }) {
    return (
        <div className='h-[400px] w-full rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm relative filter hover:brightness-[1.02] transition-all duration-500'>
            <VehicleMapContent vehicles={vehicles} />
        </div>
    );
}
