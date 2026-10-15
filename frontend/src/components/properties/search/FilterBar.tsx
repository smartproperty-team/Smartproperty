// ===========================================
// Filter bar above the results
// ===========================================
// As on Airbnb after "Show N places": the Filters button carries a count
// badge, each active filter becomes a chip, and quick filters apply at once.
// Here every active chip also has a visible remove button.

import { useTranslation } from "@/i18n";
import type { PropertyFilters } from "@/types/property";
import {
  activeFilterChips,
  amenityLabel,
  clearPanelFilters,
  countPanelFilters,
  isQuickFilterOn,
  QUICK_FILTERS,
  toggleQuickFilter,
  type QuickFilter,
} from "@/utils/listingFilters";
import { SlidersHorizontal, X } from "lucide-react";
import { amenityIcon, FEATURE_ICONS } from "./searchIcons";
import "./listingSearch.css";

interface FilterBarProps {
  filters: PropertyFilters;
  /** Applies at once: chip removal and quick filters skip the dialog. */
  onChange: (next: PropertyFilters) => void;
  onOpenFilters: () => void;
}

export function FilterBar({
  filters,
  onChange,
  onOpenFilters,
}: FilterBarProps) {
  const t = useTranslation();
  const s = t.listingSearch;
  const count = countPanelFilters(filters);
  const chips = activeFilterChips(filters, t);
  const quick = QUICK_FILTERS.filter(
    (filter) => !isQuickFilterOn(filters, filter),
  );

  const quickLabel = (filter: QuickFilter) =>
    filter === "furnished"
      ? s.furnished
      : filter === "petFriendly"
        ? s.petFriendly
        : filter === "hasParking"
          ? s.parking
          : amenityLabel(filter.slice("amenity:".length), t);

  const quickIcon = (filter: QuickFilter) =>
    filter.startsWith("amenity:")
      ? amenityIcon(filter.slice("amenity:".length))
      : FEATURE_ICONS[filter as keyof typeof FEATURE_ICONS];

  return (
    <div className="lsx lsx-filterbar">
      <button
        type="button"
        className="lsx-filters-btn"
        data-count={count || undefined}
        aria-haspopup="dialog"
        aria-label={
          count
            ? s.filtersApplied.replace("{{count}}", String(count))
            : s.filters
        }
        onClick={onOpenFilters}
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        {s.filters}
        {count > 0 && (
          <span className="lsx-badge" aria-hidden="true">
            {count}
          </span>
        )}
      </button>

      <span className="lsx-filterbar__divider" aria-hidden="true" />

      <div className="lsx-filterbar__rail">
        {chips.length > 0 && (
          <div
            className="lsx-filterbar__group"
            role="group"
            aria-label={s.activeFilters}
          >
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="lsx-chip lsx-chip--active"
                aria-label={s.removeFilter.replace("{{label}}", chip.label)}
                onClick={() => onChange(chip.remove(filters))}
              >
                {chip.label}
                <span className="lsx-chip__x" aria-hidden="true">
                  <X size={13} strokeWidth={2.5} />
                </span>
              </button>
            ))}
          </div>
        )}

        <div
          className="lsx-filterbar__group"
          role="group"
          aria-label={s.quickFilters}
        >
          {quick.map((filter) => {
            const Icon = quickIcon(filter);
            return (
              <button
                key={filter}
                type="button"
                className="lsx-chip"
                aria-pressed={false}
                onClick={() => onChange(toggleQuickFilter(filters, filter))}
              >
                <Icon size={15} aria-hidden="true" />
                {quickLabel(filter)}
              </button>
            );
          })}
        </div>
      </div>

      {chips.length >= 2 && (
        <button
          type="button"
          className="lsx-link"
          onClick={() => onChange(clearPanelFilters(filters))}
        >
          {s.clearAll}
        </button>
      )}
    </div>
  );
}
