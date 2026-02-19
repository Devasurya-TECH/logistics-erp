"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { searchPlacesDebounced, GeocodingResult } from '@/lib/utils/geocoder';
import { MapPinIcon } from '@heroicons/react/24/outline';

interface AddressInputProps {
    value: string;
    onChange: (address: string, lat: number, lng: number) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
    label?: string;
}

export default function AddressInput({
    value,
    onChange,
    placeholder = 'Search any place, shop, company...',
    required = false,
    className = '',
    label
}: AddressInputProps) {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync external value changes
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = useCallback((text: string) => {
        setQuery(text);
        setSelectedIndex(-1);

        if (text.trim().length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        searchPlacesDebounced(text, (results) => {
            setSuggestions(results);
            setIsOpen(results.length > 0);
            setIsLoading(false);
        });
    }, []);

    const handleSelect = (result: GeocodingResult) => {
        setQuery(result.shortName);
        setSuggestions([]);
        setIsOpen(false);
        onChange(result.shortName, result.lat, result.lng);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            handleSelect(suggestions[selectedIndex]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            {label && (
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <MapPinIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    required={required}
                    className="w-full pl-9 pr-8 py-2.5 text-sm text-slate-700 bg-white border border-gray-200 rounded-xl 
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all
                               placeholder:text-slate-300"
                    autoComplete="off"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
                {!isLoading && query.length >= 2 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <span className="text-[10px] text-slate-300 font-medium">🔍</span>
                    </div>
                )}
            </div>

            {/* Suggestions Dropdown — Google Maps Style */}
            {isOpen && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl 
                                max-h-[340px] overflow-y-auto animate-fade-in"
                    style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.12)' }}
                >
                    <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            📍 {suggestions.length} places found
                        </p>
                    </div>

                    {suggestions.map((result, idx) => (
                        <button
                            key={`${result.lat}-${result.lng}-${idx}`}
                            type="button"
                            onClick={() => handleSelect(result)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`w-full text-left px-3 py-2.5 flex items-start gap-3 transition-all border-b border-gray-50 last:border-b-0
                                ${idx === selectedIndex
                                    ? 'bg-blue-50 border-l-2 border-l-blue-500'
                                    : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                                }`}
                        >
                            {/* Type Icon */}
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base
                                ${idx === selectedIndex
                                    ? 'bg-blue-100'
                                    : 'bg-gray-100'
                                }`}
                            >
                                {result.icon}
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                                <p className={`text-sm font-semibold truncate ${idx === selectedIndex ? 'text-blue-700' : 'text-slate-700'
                                    }`}>
                                    {result.shortName}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
                                        ${idx === selectedIndex
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'bg-gray-100 text-slate-400'
                                        }`}
                                    >
                                        {result.type}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                    {result.displayName}
                                </p>
                            </div>
                        </button>
                    ))}

                    <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50">
                        <p className="text-[9px] text-slate-300 text-center font-medium">
                            Powered by OpenStreetMap · Photon
                        </p>
                    </div>
                </div>
            )}

            {/* No results */}
            {isOpen && suggestions.length === 0 && !isLoading && query.length >= 2 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-6 text-center">
                    <p className="text-2xl mb-2">🔍</p>
                    <p className="text-sm font-medium text-slate-500">No places found for &ldquo;{query}&rdquo;</p>
                    <p className="text-xs text-slate-400 mt-1">Try a more specific name or nearby landmark</p>
                </div>
            )}
        </div>
    );
}
