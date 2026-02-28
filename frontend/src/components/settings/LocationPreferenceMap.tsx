import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { UserLocationPreference } from "../../types/auth";

import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

const DEFAULT_CENTER = { lat: 36.8065, lng: 10.1815 };
const RADIUS_OPTIONS = [1, 2, 5, 11, 20, 50] as const;

interface NominatimSearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface NominatimReverseResult {
  display_name?: string;
}

interface LocationPreferenceMapProps {
  value: string;
  onChange: (location: string) => void;
  selection?: UserLocationPreference;
  onSelectionChange?: (selection: UserLocationPreference) => void;
  disabled?: boolean;
}

const searchLocations = async (
  query: string,
): Promise<NominatimSearchResult[]> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent": "SmartProperty-App",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Location search failed");
  }

  return (await response.json()) as NominatimSearchResult[];
};

const reverseGeocode = async (
  lat: number,
  lng: number,
): Promise<NominatimReverseResult | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          "User-Agent": "SmartProperty-App",
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as NominatimReverseResult;
  } catch {
    return null;
  }
};

export default function LocationPreferenceMap({
  value,
  onChange,
  selection,
  onSelectionChange,
  disabled = false,
}: LocationPreferenceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const searchTimeoutRef = useRef<number | undefined>(undefined);

  const [radiusKm, setRadiusKm] = useState<number>(selection?.radiusKm ?? 11);
  const [selectedCoords, setSelectedCoords] = useState(
    selection?.coordinates ?? DEFAULT_CENTER,
  );
  const [searchQuery, setSearchQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<NominatimSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const emitSelection = (
    nextLabel: string,
    nextRadiusKm: number,
    nextCoords: { lat: number; lng: number },
  ) => {
    onSelectionChange?.({
      label: nextLabel,
      radiusKm: nextRadiusKm,
      coordinates: nextCoords,
    });
  };

  const updateMapSelection = (
    lat: number,
    lng: number,
    nextRadiusKm: number,
    shouldCenter = true,
  ) => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }

    if (!circleRef.current) {
      circleRef.current = L.circle([lat, lng], {
        radius: nextRadiusKm * 1000,
        color: "#3b82f6",
        weight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
      }).addTo(map);
    } else {
      circleRef.current.setLatLng([lat, lng]);
      circleRef.current.setRadius(nextRadiusKm * 1000);
    }

    if (shouldCenter) {
      map.setView([lat, lng], 12);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current).setView(
      [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
      11,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on("click", async (event: L.LeafletMouseEvent) => {
      if (disabled) {
        return;
      }

      const nextCoords = { lat: event.latlng.lat, lng: event.latlng.lng };
      setSelectedCoords(nextCoords);
      updateMapSelection(nextCoords.lat, nextCoords.lng, radiusKm);

      const resolved = await reverseGeocode(nextCoords.lat, nextCoords.lng);
      if (resolved?.display_name) {
        setSearchQuery(resolved.display_name);
        onChange(resolved.display_name);
        emitSelection(resolved.display_name, radiusKm, nextCoords);
      }
    });

    mapRef.current = map;

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, [disabled, onChange, radiusKm]);

  useEffect(() => {
    updateMapSelection(selectedCoords.lat, selectedCoords.lng, radiusKm, false);
    emitSelection(searchQuery.trim(), radiusKm, selectedCoords);
  }, [radiusKm, searchQuery, selectedCoords.lat, selectedCoords.lng]);

  useEffect(() => {
    if (selection?.radiusKm !== undefined) {
      setRadiusKm(selection.radiusKm);
    }
    if (selection?.coordinates) {
      setSelectedCoords(selection.coordinates);
    }
  }, [
    selection?.coordinates?.lat,
    selection?.coordinates?.lng,
    selection?.radiusKm,
  ]);

  useEffect(() => {
    if (!value.trim()) {
      return;
    }

    setSearchQuery(value);

    let cancelled = false;
    const resolveExistingLocation = async () => {
      try {
        const results = await searchLocations(value);
        if (cancelled || results.length === 0) {
          return;
        }

        const lat = Number(results[0].lat);
        const lng = Number(results[0].lon);

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          return;
        }

        setSelectedCoords({ lat, lng });
        updateMapSelection(lat, lng, radiusKm);
      } catch {
        // Ignore initial geocoding errors
      }
    };

    void resolveExistingLocation();

    return () => {
      cancelled = true;
    };
  }, [radiusKm, value]);

  const handleSearchInputChange = (nextValue: string) => {
    setSearchQuery(nextValue);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (nextValue.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await searchLocations(nextValue.trim());
        setSuggestions(results.slice(0, 5));
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleSelectSuggestion = (result: NominatimSearchResult) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return;
    }

    const nextCoords = { lat, lng };
    setSelectedCoords(nextCoords);
    setSearchQuery(result.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    onChange(result.display_name);
    emitSelection(result.display_name, radiusKm, nextCoords);
    updateMapSelection(lat, lng, radiusKm);
  };

  const handleLocateMe = () => {
    if (disabled || !navigator.geolocation) {
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude;
        const lng = coords.longitude;
        const nextCoords = { lat, lng };
        setSelectedCoords(nextCoords);
        updateMapSelection(lat, lng, radiusKm);

        const resolved = await reverseGeocode(lat, lng);
        if (resolved?.display_name) {
          setSearchQuery(resolved.display_name);
          onChange(resolved.display_name);
          emitSelection(resolved.display_name, radiusKm, nextCoords);
        }
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <label
          htmlFor="location-search"
          className="mb-2 block text-sm font-medium text-gray-600"
        >
          Search by city, neighborhood or ZIP code.
        </label>
        <input
          id="location-search"
          type="text"
          value={searchQuery}
          onChange={(event) => handleSearchInputChange(event.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => {
            const trimmedQuery = searchQuery.trim();
            onChange(trimmedQuery);
            emitSelection(trimmedQuery, radiusKm, selectedCoords);
            window.setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder="Search location"
          disabled={disabled}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-900 shadow-sm focus:border-home-primary focus:outline-none focus:ring-2 focus:ring-home-primary/20 disabled:bg-gray-100"
        />
        {isSearching && (
          <span className="pointer-events-none absolute right-4 top-[42px] text-xs text-gray-500">
            Searching...
          </span>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            {suggestions.map((result) => (
              <button
                key={`${result.lat}-${result.lon}`}
                type="button"
                onClick={() => handleSelectSuggestion(result)}
                className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-700 last:border-b-0 hover:bg-gray-50"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-600">
          Radius
        </label>
        <select
          value={radiusKm}
          onChange={(event) => {
            const nextRadius = Number(event.target.value);
            setRadiusKm(nextRadius);
            emitSelection(searchQuery.trim(), nextRadius, selectedCoords);
          }}
          disabled={disabled}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-900 shadow-sm focus:border-home-primary focus:outline-none focus:ring-2 focus:ring-home-primary/20 disabled:bg-gray-100"
        >
          {RADIUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} kilometers
            </option>
          ))}
        </select>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-gray-200">
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={disabled || isLocating}
          className="absolute right-3 top-3 z-10 rounded-xl bg-white p-3 text-gray-700 shadow-md transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LocateFixed className="h-5 w-5" />
        </button>
        <div ref={mapContainerRef} className="h-[420px] w-full" />
      </div>
    </div>
  );
}
