// Comprehensive geocoding utility combining Photon + Nominatim APIs.
// Finds local businesses, shops, companies, temples, hospitals — everything, like Google Maps.
// No API keys required. Results biased towards Kerala, India.

export interface GeocodingResult {
    displayName: string;
    shortName: string;
    lat: number;
    lng: number;
    type: string;       // e.g. 'shop', 'restaurant', 'hospital', 'city', 'road'
    category: string;   // e.g. 'amenity', 'building', 'place', 'highway'
    icon: string;       // emoji for the type
}

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Kerala center for location bias
const KERALA_LAT = 10.0;
const KERALA_LNG = 76.3;

// =============================================
// TYPE → EMOJI MAPPING (like Google Maps icons)
// =============================================
const TYPE_ICONS: Record<string, string> = {
    // Places
    'city': '🏙️', 'town': '🏘️', 'village': '🏡', 'hamlet': '🏠',
    'suburb': '📍', 'neighbourhood': '📍', 'locality': '📍',
    'state': '🗺️', 'district': '🗺️', 'county': '🗺️',

    // Transport
    'bus_stop': '🚌', 'bus_station': '🚌', 'railway_station': '🚂', 'station': '🚂',
    'airport': '✈️', 'ferry_terminal': '⛴️', 'taxi': '🚕',
    'fuel': '⛽', 'parking': '🅿️', 'charging_station': '🔌',

    // Food & Drink
    'restaurant': '🍽️', 'cafe': '☕', 'fast_food': '🍔', 'bar': '🍺',
    'bakery': '🥖', 'confectionery': '🍫', 'ice_cream': '🍦',
    'food_court': '🍽️', 'biryani': '🍚', 'tea': '🍵',

    // Shopping
    'shop': '🛒', 'supermarket': '🛒', 'convenience': '🏪', 'mall': '🏬',
    'clothes': '👕', 'jewelry': '💍', 'electronics': '📱', 'mobile_phone': '📱',
    'hardware': '🔧', 'furniture': '🪑', 'books': '📚', 'stationery': '📝',
    'shoes': '👟', 'optician': '👓', 'beauty': '💅', 'hairdresser': '💇',
    'car_repair': '🔧', 'car': '🚗', 'motorcycle': '🏍️', 'tyres': '🛞',
    'greengrocer': '🥬', 'butcher': '🥩', 'seafood': '🐟', 'wholesale': '📦',

    // Health
    'hospital': '🏥', 'clinic': '🏥', 'doctors': '👨‍⚕️', 'dentist': '🦷',
    'pharmacy': '💊', 'veterinary': '🐾',

    // Education
    'school': '🏫', 'college': '🎓', 'university': '🎓', 'kindergarten': '👶',
    'library': '📚', 'driving_school': '🚗',

    // Religion
    'temple': '🛕', 'place_of_worship': '🛕', 'church': '⛪', 'mosque': '🕌',

    // Government & Services
    'police': '👮', 'fire_station': '🚒', 'post_office': '📮',
    'bank': '🏦', 'atm': '🏧', 'bureau_de_change': '💱',
    'courthouse': '⚖️', 'townhall': '🏛️', 'government': '🏛️',

    // Entertainment & Leisure
    'cinema': '🎬', 'theatre': '🎭', 'park': '🌳', 'garden': '🌺',
    'playground': '🎠', 'sports_centre': '🏟️', 'stadium': '🏟️',
    'swimming_pool': '🏊', 'gym': '💪', 'fitness': '💪',
    'hotel': '🏨', 'guest_house': '🏨', 'hostel': '🏨', 'resort': '🏖️',
    'tourism': '🗿', 'attraction': '📸', 'viewpoint': '👀',
    'beach': '🏖️', 'museum': '🏛️',

    // Business & Office
    'office': '🏢', 'company': '🏢', 'commercial': '🏢', 'industrial': '🏭',
    'warehouse': '📦', 'coworking': '💻',

    // Infrastructure
    'bridge': '🌉', 'dam': '🌊', 'water_tower': '💧',
    'tower': '🗼', 'lighthouse': '🏮',
    'road': '🛣️', 'street': '🛣️', 'highway': '🛣️',
    'residential': '🏠', 'apartments': '🏢',

    // Default
    'yes': '📍', 'house': '🏠',
};

function getTypeIcon(type: string, category: string): string {
    // Check exact type match
    if (TYPE_ICONS[type]) return TYPE_ICONS[type];

    // Check category-based
    if (category === 'amenity') return '🏢';
    if (category === 'shop') return '🛒';
    if (category === 'tourism') return '🗿';
    if (category === 'highway') return '🛣️';
    if (category === 'building') return '🏠';
    if (category === 'leisure') return '🌳';
    if (category === 'office') return '🏢';

    return '📍';
}

function getHumanType(type: string, category: string): string {
    // Make the type human-readable
    const readable = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    if (category === 'shop') return `Shop · ${readable}`;
    if (category === 'amenity') return readable;
    if (category === 'tourism') return `Tourism · ${readable}`;
    if (category === 'highway') return 'Road';
    if (category === 'place') return readable;
    if (category === 'building') return 'Building';

    return readable;
}

// =============================================
// PHOTON API — Best for local POIs (businesses, 
// shops, restaurants, etc.)
// =============================================
async function searchPhoton(query: string): Promise<GeocodingResult[]> {
    try {
        // Append 'Kerala' for better local results if not already included
        const keralaWords = ['kerala', 'kochi', 'ernakulam', 'trivandrum', 'thiruvananthapuram', 'kozhikode', 'calicut', 'thrissur', 'kannur', 'kollam', 'palakkad', 'malappuram', 'kottayam', 'alappuzha', 'idukki', 'wayanad', 'pathanamthitta', 'kasaragod'];
        const queryLower = query.toLowerCase();
        const hasKeralaContext = keralaWords.some(w => queryLower.includes(w));
        const enhancedQuery = hasKeralaContext ? query : `${query} Kerala`;

        const params = new URLSearchParams({
            q: enhancedQuery,
            lat: KERALA_LAT.toString(),
            lon: KERALA_LNG.toString(),
            limit: '8',
            lang: 'en',
        });

        // Also search without Kerala suffix for broader results
        const params2 = new URLSearchParams({
            q: query,
            lat: KERALA_LAT.toString(),
            lon: KERALA_LNG.toString(),
            limit: '4',
            lang: 'en',
        });

        const [res, res2] = await Promise.all([
            fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
                headers: { 'Accept': 'application/json' }
            }),
            hasKeralaContext ? Promise.resolve(null) : fetch(`https://photon.komoot.io/api/?${params2.toString()}`, {
                headers: { 'Accept': 'application/json' }
            })
        ]);

        if (!res.ok) return [];

        const data = await res.json();
        let data2Features: any[] = [];
        if (res2 && res2.ok) {
            const d2 = await res2.json();
            data2Features = d2.features || [];
        }

        const allFeatures = [...(data.features || []), ...data2Features];

        // Deduplicate by coordinates
        const seen = new Set<string>();
        const uniqueFeatures = allFeatures.filter((f: any) => {
            const coords = f.geometry?.coordinates || [0, 0];
            const key = `${coords[0].toFixed(4)},${coords[1].toFixed(4)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        return uniqueFeatures.map((feature: any) => {
            const props = feature.properties || {};
            const coords = feature.geometry?.coordinates || [0, 0]; // [lng, lat]

            // Build display name from parts
            const nameParts: string[] = [];
            if (props.name) nameParts.push(props.name);
            if (props.street) nameParts.push(props.street);
            if (props.city || props.town || props.village) {
                nameParts.push(props.city || props.town || props.village);
            }
            if (props.district) nameParts.push(props.district);
            if (props.state) nameParts.push(props.state);

            const displayName = nameParts.join(', ') || props.name || 'Unknown';
            const shortName = nameParts.slice(0, 3).join(', ');

            const osmType = props.osm_value || props.type || 'place';
            const osmCategory = props.osm_key || 'place';

            return {
                displayName,
                shortName,
                lat: coords[1],
                lng: coords[0],
                type: getHumanType(osmType, osmCategory),
                category: osmCategory,
                icon: getTypeIcon(osmType, osmCategory),
            };
        });
    } catch (error) {
        console.error('Photon geocoding error:', error);
        return [];
    }
}

// =============================================
// NOMINATIM API — Fallback for addresses and
// administrative areas
// =============================================
async function searchNominatim(query: string): Promise<GeocodingResult[]> {
    try {
        // Append Kerala/India to query for better local results
        const keralaWords = ['kerala', 'kochi', 'ernakulam', 'trivandrum', 'india'];
        const queryLower = query.toLowerCase();
        const hasContext = keralaWords.some(w => queryLower.includes(w));
        const enhancedQuery = hasContext ? query : `${query}, Kerala, India`;

        const params = new URLSearchParams({
            q: enhancedQuery,
            format: 'json',
            addressdetails: '1',
            limit: '6',
            viewbox: '74.5,13.0,77.8,8.0', // Kerala + surrounding
            bounded: '0',
        });

        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?${params.toString()}`,
            {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'LogisticsERP/1.0'
                }
            }
        );

        if (!res.ok) return [];

        const data = await res.json();

        return data.map((item: any) => {
            const type = item.type || 'place';
            const category = item.class || 'place';

            // Build short name
            const parts = (item.display_name || '').split(',').map((s: string) => s.trim());
            const filtered = parts.filter((p: string) => {
                if (p.toLowerCase() === 'india') return false;
                if (/^\d{5,6}$/.test(p)) return false;
                return true;
            });
            const shortName = filtered.slice(0, 3).join(', ');

            return {
                displayName: item.display_name,
                shortName,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                type: getHumanType(type, category),
                category,
                icon: getTypeIcon(type, category),
            };
        });
    } catch (error) {
        console.error('Nominatim geocoding error:', error);
        return [];
    }
}

// =============================================
// COMBINED SEARCH — Merge + deduplicate results
// =============================================
export const searchPlaces = async (query: string): Promise<GeocodingResult[]> => {
    if (!query || query.trim().length < 2) return [];

    // Run both APIs in parallel for speed
    const [photonResults, nominatimResults] = await Promise.all([
        searchPhoton(query),
        searchNominatim(query),
    ]);

    // Merge: Photon first (better POI coverage), then Nominatim
    const merged: GeocodingResult[] = [...photonResults];
    const seen = new Set(photonResults.map(r => `${r.lat.toFixed(3)},${r.lng.toFixed(3)}`));

    // Add Nominatim results that aren't duplicates
    for (const result of nominatimResults) {
        const key = `${result.lat.toFixed(3)},${result.lng.toFixed(3)}`;
        if (!seen.has(key)) {
            seen.add(key);
            merged.push(result);
        }
    }

    // Sort: prefer results closer to Kerala
    merged.sort((a, b) => {
        const distA = Math.abs(a.lat - KERALA_LAT) + Math.abs(a.lng - KERALA_LNG);
        const distB = Math.abs(b.lat - KERALA_LAT) + Math.abs(b.lng - KERALA_LNG);
        return distA - distB;
    });

    // Cap at 10 results
    return merged.slice(0, 10);
};

/**
 * Debounced search — waits for user to stop typing
 */
export const searchPlacesDebounced = (
    query: string,
    callback: (results: GeocodingResult[]) => void,
    delay: number = 350
): void => {
    if (debounceTimer) clearTimeout(debounceTimer);

    if (!query || query.trim().length < 2) {
        callback([]);
        return;
    }

    debounceTimer = setTimeout(async () => {
        const results = await searchPlaces(query);
        callback(results);
    }, delay);
};

/**
 * Geocode a single address — returns best match
 */
export const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
    const results = await searchPlaces(address);
    return results.length > 0 ? results[0] : null;
};

/**
 * Shorten a verbose display name for UI
 */
export const shortenDisplayName = (displayName: string): string => {
    const parts = displayName.split(',').map(s => s.trim());
    const filtered = parts.filter(p => {
        if (p.toLowerCase() === 'india') return false;
        if (/^\d{5,6}$/.test(p)) return false;
        return true;
    });
    return filtered.slice(0, 3).join(', ');
};
