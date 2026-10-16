// ===========================================
// Filters dialog
// ===========================================
// Works like Airbnb's Filters panel (read with REA): changes are staged,
// each change asks the API only for a count (Airbnb's DynamicFilters
// request with metadataOnly), the newest answer wins, and nothing touches
// the results until "Show N properties". Differences: the count is
// debounced by 200 ms so a dragged slider sends one request, the price
// chart marks the typical price, and features are switches with a hint.

import { useTranslation } from "@/i18n";
import type {
  PriceHistogram,
  PropertyCategory,
  PropertyFilters,
  PropertyStatus,
} from "@/types/property";
import {
  amenityLabel,
  categoryLabel,
  clearPanelFilters,
  countPanelFilters,
  FEATURE_FILTERS,
  FILTER_AMENITIES,
  filtersFromSearchParams,
  filtersToSearchParams,
  LISTING_STATUSES,
  pickPanelFilters,
  PROPERTY_TYPES,
  statusLabel,
  typeLabel,
  type PanelFilters,
} from "@/utils/listingFilters";
import { Check, LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CountStepper, Segmented, SwitchRow } from "./FilterControls";
import { PriceRangeFilter } from "./PriceRangeFilter";
import { amenityIcon, FEATURE_ICONS, TYPE_ICONS } from "./searchIcons";
import "./listingSearch.css";

/** Wait this long after a change before counting, so drags send one request. */
export const COUNT_DELAY_MS = 200;
const AMENITIES_SHOWN = 8;

export type CountFetcher = (
  filters: PropertyFilters,
  withPriceHistogram: boolean,
) => Promise<{ total: number; priceHistogram?: PriceHistogram | null }>;

interface FiltersDialogProps {
  /** The applied search, including location and map area. */
  filters: PropertyFilters;
  fetchCount: CountFetcher;
  onApply: (panel: PanelFilters) => void;
  onClose: () => void;
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? ""));

export function FiltersDialog({
  filters,
  fetchCount,
  onApply,
  onClose,
}: FiltersDialogProps) {
  const t = useTranslation();
  const s = t.listingSearch;
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<PanelFilters>(() =>
    pickPanelFilters(filters),
  );
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [counted, setCounted] = useState<{
    key: string;
    total: number | null;
  } | null>(null);
  const [histogram, setHistogram] = useState<PriceHistogram | null | undefined>(
    undefined,
  );
  const latestRequest = useRef(0);
  const histogramKeyRef = useRef<string | null>(null);

  const update = (patch: Partial<PanelFilters>) =>
    setDraft((current) => ({ ...current, ...patch }));

  // The applied search with the draft panel on top: what the count is for.
  const query = useMemo<PropertyFilters>(
    () => ({ ...clearPanelFilters(filters), ...draft }),
    [filters, draft],
  );
  const queryKey = filtersToSearchParams(query).toString();
  // The histogram ignores the price filter, so moving the price keeps it.
  const histogramKey = filtersToSearchParams({
    ...query,
    minPrice: undefined,
    maxPrice: undefined,
  }).toString();

  // ---- Open as a modal; Escape and the backdrop close it ----
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (dialog.open) dialog.close?.();
    };
  }, []);

  // ---- Live count, newest answer wins ----
  // Keyed on the query's URL form, so a re-render with equal filters does
  // not count again; fetchCount must be stable (a module-level function).
  useEffect(() => {
    const delay = latestRequest.current === 0 ? 0 : COUNT_DELAY_MS;
    const timer = window.setTimeout(() => {
      const requestId = ++latestRequest.current;
      const withHistogram = histogramKey !== histogramKeyRef.current;
      const countQuery = filtersFromSearchParams(new URLSearchParams(queryKey));
      fetchCount(countQuery, withHistogram).then(
        (result) => {
          if (requestId !== latestRequest.current) return;
          setCounted({ key: queryKey, total: result.total });
          if (withHistogram) {
            histogramKeyRef.current = histogramKey;
            setHistogram(result.priceHistogram ?? null);
          }
        },
        () => {
          if (requestId !== latestRequest.current) return;
          setCounted({ key: queryKey, total: null });
          if (withHistogram) setHistogram(null);
        },
      );
    }, delay);
    return () => window.clearTimeout(timer);
  }, [queryKey, histogramKey, fetchCount]);

  const counting = counted?.key !== queryKey;
  const total = counted?.total ?? null;
  const showLabel =
    total === null
      ? s.counting
      : total === 0
        ? s.showNoResults
        : total === 1
          ? s.showResultsOne
          : fill(s.showResults, { count: total.toLocaleString("en-US") });
  const panelCount = countPanelFilters(draft);

  const types = draft.types ?? [];
  const amenities = draft.amenities ?? [];
  const hasAmenity = (amenity: string) =>
    amenities.some((item) => item.toLowerCase() === amenity.toLowerCase());
  const shownAmenities = showAllAmenities
    ? FILTER_AMENITIES
    : FILTER_AMENITIES.slice(0, AMENITIES_SHOWN);

  const categoryOptions: { value: PropertyCategory | "any"; label: string }[] =
    [
      { value: "any", label: s.categoryAny },
      ...(["rental", "sale", "management"] as PropertyCategory[]).map(
        (value) => ({ value, label: categoryLabel(value, t) }),
      ),
    ];
  const statusOptions: { value: PropertyStatus | "any"; label: string }[] = [
    { value: "any", label: s.any },
    ...LISTING_STATUSES.map((value) => ({
      value,
      label: statusLabel(value, t),
    })),
  ];

  return (
    <dialog
      ref={dialogRef}
      className="lsx-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header className="lsx-dialog__head">
        <div>
          <p className="lsx-dialog__eyebrow">{s.filtersSubtitle}</p>
          <h2 id={titleId} className="lsx-dialog__title">
            {s.filters}
          </h2>
        </div>
        <button
          type="button"
          className="lsx-icon-btn"
          aria-label={s.closeFilters}
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="lsx-dialog__body">
        <section className="lsx-section" aria-labelledby={`${titleId}-cat`}>
          <h3 id={`${titleId}-cat`} className="lsx-section__title">
            {s.lookingTo}
          </h3>
          <Segmented
            label={s.lookingTo}
            options={categoryOptions}
            value={draft.category ?? "any"}
            onChange={(value) =>
              update({ category: value === "any" ? undefined : value })
            }
          />
        </section>

        <section className="lsx-section" aria-labelledby={`${titleId}-price`}>
          <h3 id={`${titleId}-price`} className="lsx-section__title">
            {s.priceRange}
          </h3>
          <p className="lsx-section__hint">
            {draft.category === "rental"
              ? s.priceSubtitleRental
              : s.priceSubtitle}
          </p>
          <PriceRangeFilter
            histogram={histogram}
            minPrice={draft.minPrice}
            maxPrice={draft.maxPrice}
            onChange={(range) => update(range)}
          />
        </section>

        <section className="lsx-section" aria-labelledby={`${titleId}-rooms`}>
          <h3 id={`${titleId}-rooms`} className="lsx-section__title">
            {s.rooms}
          </h3>
          <CountStepper
            label={s.bedrooms}
            value={draft.minBedrooms}
            anyLabel={s.any}
            fewerLabel={fill(s.fewer, { name: s.bedrooms.toLowerCase() })}
            moreLabel={fill(s.more, { name: s.bedrooms.toLowerCase() })}
            onChange={(minBedrooms) => update({ minBedrooms })}
          />
          <CountStepper
            label={s.bathrooms}
            value={draft.minBathrooms}
            anyLabel={s.any}
            fewerLabel={fill(s.fewer, { name: s.bathrooms.toLowerCase() })}
            moreLabel={fill(s.more, { name: s.bathrooms.toLowerCase() })}
            onChange={(minBathrooms) => update({ minBathrooms })}
          />
        </section>

        <section className="lsx-section" aria-labelledby={`${titleId}-type`}>
          <h3 id={`${titleId}-type`} className="lsx-section__title">
            {s.propertyType}
          </h3>
          <div className="lsx-tiles">
            {PROPERTY_TYPES.map((type) => {
              const Icon = TYPE_ICONS[type];
              const selected = types.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  className="lsx-tile"
                  aria-pressed={selected}
                  onClick={() => {
                    const next = selected
                      ? types.filter((item) => item !== type)
                      : [...types, type];
                    update({ types: next.length ? next : undefined });
                  }}
                >
                  <Icon size={26} strokeWidth={1.6} aria-hidden="true" />
                  {typeLabel(type, t)}
                  {selected && (
                    <span className="lsx-tile__check" aria-hidden="true">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="lsx-section" aria-labelledby={`${titleId}-feat`}>
          <h3 id={`${titleId}-feat`} className="lsx-section__title">
            {s.features}
          </h3>
          {FEATURE_FILTERS.map((feature) => (
            <SwitchRow
              key={feature}
              icon={FEATURE_ICONS[feature]}
              label={
                feature === "furnished"
                  ? s.furnished
                  : feature === "petFriendly"
                    ? s.petFriendly
                    : s.parking
              }
              hint={
                feature === "furnished"
                  ? s.furnishedHint
                  : feature === "petFriendly"
                    ? s.petFriendlyHint
                    : s.parkingHint
              }
              checked={!!draft[feature]}
              onChange={(on) => update({ [feature]: on || undefined })}
            />
          ))}
        </section>

        <section className="lsx-section" aria-labelledby={`${titleId}-amen`}>
          <h3 id={`${titleId}-amen`} className="lsx-section__title">
            {s.amenities}
          </h3>
          <div className="lsx-pills">
            {shownAmenities.map((amenity) => {
              const Icon = amenityIcon(amenity);
              const selected = hasAmenity(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  className="lsx-pill"
                  aria-pressed={selected}
                  onClick={() => {
                    const next = selected
                      ? amenities.filter(
                          (item) =>
                            item.toLowerCase() !== amenity.toLowerCase(),
                        )
                      : [...amenities, amenity];
                    update({ amenities: next.length ? next : undefined });
                  }}
                >
                  <Icon size={18} aria-hidden="true" />
                  {amenityLabel(amenity, t)}
                </button>
              );
            })}
          </div>
          {FILTER_AMENITIES.length > AMENITIES_SHOWN && (
            <button
              type="button"
              className="lsx-link"
              aria-expanded={showAllAmenities}
              onClick={() => setShowAllAmenities((open) => !open)}
            >
              {showAllAmenities
                ? s.showFewerAmenities
                : fill(s.showAllAmenities, { count: FILTER_AMENITIES.length })}
            </button>
          )}
        </section>

        <section className="lsx-section" aria-labelledby={`${titleId}-stat`}>
          <h3 id={`${titleId}-stat`} className="lsx-section__title">
            {s.listingStatus}
          </h3>
          <Segmented
            label={s.listingStatus}
            options={statusOptions}
            value={draft.status ?? "any"}
            onChange={(value) =>
              update({ status: value === "any" ? undefined : value })
            }
          />
        </section>
      </div>

      <footer className="lsx-dialog__foot">
        <button
          type="button"
          className="lsx-link"
          disabled={panelCount === 0}
          onClick={() => setDraft({})}
        >
          {s.clearAll}
        </button>
        <button
          type="button"
          className="lsx-show"
          disabled={!counting && total === 0}
          aria-busy={counting}
          onClick={() => onApply(draft)}
        >
          {counting && (
            <LoaderCircle size={18} className="lsx-spin" aria-hidden="true" />
          )}
          {showLabel}
        </button>
        <span className="lsx-visually-hidden" aria-live="polite">
          {counting ? "" : showLabel}
        </span>
      </footer>
    </dialog>
  );
}
