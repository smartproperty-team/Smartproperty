import type { PropertyStatus, PropertyType } from "@/types/property";
import { Filter, MapPin, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface AdvancedPropertySearchBarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  cityValue: string;
  onCityChange: (value: string) => void;
  typeValue?: PropertyType;
  onTypeChange: (value: string) => void;
  statusValue?: PropertyStatus;
  onStatusChange: (value: string) => void;
  bedroomsValue: string;
  onBedroomsChange: (value: string) => void;
  bathroomsValue: string;
  onBathroomsChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  onOpenNearbyMap: () => void;
  onClearNearby: () => void;
  hasNearbySelection: boolean;
  nearbySummary: string;
  nearbyHint: string;
  labels: {
    searchPlaceholder: string;
    filters: string;
    search: string;
    type: string;
    status: string;
    city: string;
    bedrooms: string;
    bathrooms: string;
    nearby: string;
    nearbyTrigger: string;
    nearbyPlaceholder: string;
    any: string;
    allTypes: string;
    allStatuses: string;
    available: string;
    rented: string;
    maintenance: string;
    unlisted: string;
    typeApartment: string;
    typeHouse: string;
    typeVilla: string;
    typeStudio: string;
    typeCondo: string;
    typeLand: string;
    reset: string;
    clearNearby: string;
  };
  showCityField?: boolean;
}

const DEFAULT_SUGGESTIONS = [
  "Downtown apartment",
  "Sea view villa",
  "Family house",
  "Modern studio",
  "City center condo",
];

export default function AdvancedPropertySearchBar({
  searchQuery,
  onSearchQueryChange,
  cityValue,
  onCityChange,
  typeValue,
  onTypeChange,
  statusValue,
  onStatusChange,
  bedroomsValue,
  onBedroomsChange,
  bathroomsValue,
  onBathroomsChange,
  onSearch,
  onReset,
  onOpenNearbyMap,
  onClearNearby,
  hasNearbySelection,
  nearbySummary,
  nearbyHint,
  labels,
  showCityField = true,
}: AdvancedPropertySearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    const value = searchQuery.trim().toLowerCase();
    if (value.length < 2) {
      return [];
    }

    return DEFAULT_SUGGESTIONS.filter((item) =>
      item.toLowerCase().includes(value),
    );
  }, [searchQuery]);

  useEffect(() => {
    setShowSuggestions(suggestions.length > 0);
  }, [suggestions.length]);

  const handleClearSearch = () => {
    onSearchQueryChange("");
    setShowSuggestions(false);
  };

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            onBlur={() =>
              window.setTimeout(() => setShowSuggestions(false), 120)
            }
            placeholder={labels.searchPlaceholder}
            className="h-12 w-full rounded-full border border-slate-200 bg-slate-100 pl-10 pr-10 text-sm text-slate-700 outline-none ring-blue-500 transition focus:ring-2"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {showSuggestions && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {suggestions.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                    onMouseDown={() => {
                      onSearchQueryChange(item);
                      setShowSuggestions(false);
                    }}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-blue-500 px-5 text-base font-medium text-slate-700 transition hover:bg-blue-50"
          aria-expanded={showFilters}
          aria-controls="property-advanced-filters"
        >
          <Filter className="h-4 w-4" />
          {labels.filters}
        </button>

        <button
          type="button"
          onClick={onSearch}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-base font-semibold text-white transition hover:bg-blue-700"
        >
          <Search className="h-4 w-4" />
          {labels.search}
        </button>
      </div>

      {showFilters && (
        <div id="property-advanced-filters" className="bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {labels.type}
              </label>
              <select
                value={typeValue || ""}
                onChange={(event) => onTypeChange(event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-blue-500 transition focus:ring-2"
              >
                <option value="">{labels.allTypes}</option>
                <option value="apartment">{labels.typeApartment}</option>
                <option value="house">{labels.typeHouse}</option>
                <option value="villa">{labels.typeVilla}</option>
                <option value="studio">{labels.typeStudio}</option>
                <option value="condo">{labels.typeCondo}</option>
                <option value="land">{labels.typeLand}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {labels.status}
              </label>
              <select
                value={statusValue || ""}
                onChange={(event) => onStatusChange(event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-blue-500 transition focus:ring-2"
              >
                <option value="">{labels.allStatuses}</option>
                <option value="available">{labels.available}</option>
                <option value="rented">{labels.rented}</option>
                <option value="maintenance">{labels.maintenance}</option>
                <option value="unlisted">{labels.unlisted}</option>
              </select>
            </div>

            {showCityField && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {labels.city}
                </label>
                <input
                  type="text"
                  value={cityValue}
                  onChange={(event) => onCityChange(event.target.value)}
                  placeholder={labels.city}
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-blue-500 transition focus:ring-2"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {labels.bedrooms}
              </label>
              <select
                value={bedroomsValue}
                onChange={(event) => onBedroomsChange(event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-blue-500 transition focus:ring-2"
              >
                <option value="">{labels.any}</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {labels.bathrooms}
              </label>
              <select
                value={bathroomsValue}
                onChange={(event) => onBathroomsChange(event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-blue-500 transition focus:ring-2"
              >
                <option value="">{labels.any}</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {labels.nearby}
              </label>
              <button
                type="button"
                onClick={onOpenNearbyMap}
                className="inline-flex h-12 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-blue-500 transition hover:border-blue-400 focus:ring-2"
              >
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="truncate">
                  {hasNearbySelection
                    ? labels.nearbyTrigger
                    : labels.nearbyPlaceholder}
                </span>
              </button>
              <p className="mt-1 truncate text-xs text-slate-500">
                {hasNearbySelection ? nearbySummary : nearbyHint}
              </p>
              {hasNearbySelection && (
                <button
                  type="button"
                  onClick={onClearNearby}
                  className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {labels.clearNearby}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border border-slate-300 bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300"
            >
              {labels.reset}
            </button>
            <button
              type="button"
              onClick={onSearch}
              className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              {labels.search}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
