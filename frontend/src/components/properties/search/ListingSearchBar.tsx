// ===========================================
// Listings search bar: Where / Looking to / Home type
// ===========================================
// Airbnb's Where / When / Who bar, as read with REA: one capsule of
// segments, the open one lifted out; choices are staged until Search; a
// picked place moves on to the next segment; "Where" suggestions come from
// the API, at most one request per 300 ms with the latest text always sent.
// Here suggestions also say how many listings each place has.

import { useTranslation } from "@/i18n";
import type {
  PropertyCategory,
  PropertySearchSuggestion,
  PropertyType,
} from "@/types/property";
import {
  CATEGORIES,
  categoryLabel,
  PROPERTY_TYPES,
  typeLabel,
} from "@/utils/listingFilters";
import {
  Check,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Search,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { CATEGORY_ICONS, TYPE_ICONS } from "./searchIcons";
import "./listingSearch.css";

/** Like Airbnb's autocomplete: at most one request per this many ms. */
export const SUGGEST_THROTTLE_MS = 300;

export interface ListingSearchValue {
  search?: string;
  city?: string;
  category?: PropertyCategory;
  types?: PropertyType[];
}

interface ListingSearchBarProps extends ListingSearchValue {
  onSearch: (next: ListingSearchValue) => void;
  fetchSuggestions: (query: string) => Promise<PropertySearchSuggestion[]>;
  /** Set while a "near a point" filter is on. */
  nearbyLabel?: string;
  onOpenNearby: () => void;
  onClearNearby?: () => void;
}

type Segment = "where" | "category" | "type";
type WhereOption =
  | { kind: "nearby" }
  | { kind: "place"; place: PropertySearchSuggestion };

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? ""));

export function ListingSearchBar({
  search,
  city,
  category: appliedCategory,
  types: appliedTypes,
  onSearch,
  fetchSuggestions,
  nearbyLabel,
  onOpenNearby,
  onClearNearby,
}: ListingSearchBarProps) {
  const t = useTranslation();
  const s = t.listingSearch;
  const id = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState<Segment | null>(null);
  const [whereText, setWhereText] = useState(city ?? search ?? "");
  const [pickedCity, setPickedCity] = useState(city);
  const [category, setCategory] = useState(appliedCategory);
  const [types, setTypes] = useState(appliedTypes ?? []);
  const [suggestions, setSuggestions] = useState<PropertySearchSuggestion[]>(
    [],
  );
  const [activeIndex, setActiveIndex] = useState(-1);
  const lastFetchAt = useRef(0);
  const latestRequest = useRef(0);

  // ---- Suggestions: throttled, newest answer wins ----
  useEffect(() => {
    if (open !== "where") return;
    const wait = Math.max(
      0,
      lastFetchAt.current + SUGGEST_THROTTLE_MS - Date.now(),
    );
    const timer = window.setTimeout(() => {
      lastFetchAt.current = Date.now();
      const requestId = ++latestRequest.current;
      fetchSuggestions(whereText.trim()).then(
        (places) => {
          if (requestId === latestRequest.current) setSuggestions(places);
        },
        () => {
          if (requestId === latestRequest.current) setSuggestions([]);
        },
      );
    }, wait);
    return () => window.clearTimeout(timer);
  }, [whereText, open, fetchSuggestions]);

  // ---- A click elsewhere closes the open segment ----
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const options: WhereOption[] = [
    { kind: "nearby" },
    ...suggestions.map((place) => ({ kind: "place" as const, place })),
  ];
  const listId = `${id}-places`;

  const submit = () => {
    const text = whereText.trim();
    setOpen(null);
    onSearch({
      city: pickedCity,
      search: pickedCity ? undefined : text || undefined,
      category,
      types: types.length ? types : undefined,
    });
  };

  const pick = (option: WhereOption) => {
    if (option.kind === "nearby") {
      setOpen(null);
      onOpenNearby();
      return;
    }
    const { label, kind } = option.place;
    setWhereText(label);
    // A city filters on the city; a region is matched as text (it is in
    // every listing's address).
    setPickedCity(kind === "city" ? label : undefined);
    setActiveIndex(-1);
    setOpen("category");
  };

  const onWhereKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen("where");
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex(
        (index) => (index + step + options.length) % options.length,
      );
    } else if (event.key === "Enter" && open === "where" && activeIndex >= 0) {
      event.preventDefault();
      pick(options[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(null);
    }
  };

  const toggle = (segment: Segment) =>
    setOpen((current) => (current === segment ? null : segment));

  const typesValue = types.length
    ? types.length === 1
      ? typeLabel(types[0], t)
      : fill(s.typesSelected, {
          first: typeLabel(types[0], t),
          count: types.length - 1,
        })
    : s.anyType;

  return (
    <form
      ref={rootRef}
      className="lsx"
      role="search"
      aria-label={s.searchLabel}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(null);
      }}
    >
      <div className="lsx-search" data-open={open !== null}>
        <div
          className="lsx-seg lsx-seg--where"
          data-active={open === "where"}
          onClick={() => inputRef.current?.focus()}
        >
          <label htmlFor={`${id}-where`} className="lsx-seg__eyebrow">
            {s.where}
          </label>
          <div className="lsx-seg__input-row">
            <input
              ref={inputRef}
              id={`${id}-where`}
              className="lsx-seg__input"
              type="text"
              role="combobox"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={open === "where"}
              aria-controls={listId}
              aria-activedescendant={
                open === "where" && activeIndex >= 0
                  ? `${listId}-${activeIndex}`
                  : undefined
              }
              placeholder={
                nearbyLabel
                  ? fill(s.nearbyActive, { label: nearbyLabel })
                  : s.wherePlaceholder
              }
              value={whereText}
              onFocus={() => setOpen("where")}
              onChange={(e) => {
                setWhereText(e.target.value);
                setPickedCity(undefined);
                setActiveIndex(-1);
                setOpen("where");
              }}
              onKeyDown={onWhereKeyDown}
            />
            {(whereText || nearbyLabel) && (
              <button
                type="button"
                className="lsx-clear-x"
                aria-label={s.clearWhere}
                onClick={(e) => {
                  e.stopPropagation();
                  if (whereText) {
                    setWhereText("");
                    setPickedCity(undefined);
                    inputRef.current?.focus();
                  } else {
                    onClearNearby?.();
                  }
                }}
              >
                <X size={13} strokeWidth={2.5} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          className="lsx-seg"
          data-active={open === "category"}
          aria-expanded={open === "category"}
          aria-controls={`${id}-category`}
          onClick={() => toggle("category")}
        >
          <span className="lsx-seg__eyebrow">{s.lookingTo}</span>
          <span className="lsx-seg__value" data-empty={!category}>
            {category ? categoryLabel(category, t) : s.anyCategory}
          </span>
        </button>

        <button
          type="button"
          className="lsx-seg"
          data-active={open === "type"}
          aria-expanded={open === "type"}
          aria-controls={`${id}-type`}
          onClick={() => toggle("type")}
        >
          <span className="lsx-seg__eyebrow">{s.homeType}</span>
          <span className="lsx-seg__value" data-empty={types.length === 0}>
            {typesValue}
          </span>
        </button>

        <button type="submit" className="lsx-search__submit">
          <Search size={18} strokeWidth={2.6} aria-hidden="true" />
          {s.search}
        </button>
      </div>

      {open === "where" && (
        <div className="lsx-pop lsx-pop--where">
          <p className="lsx-pop__title" id={`${listId}-title`}>
            {s.suggestionsLabel}
          </p>
          <ul
            id={listId}
            className="lsx-options"
            role="listbox"
            aria-labelledby={`${listId}-title`}
          >
            {options.map((option, index) => {
              const selected = index === activeIndex;
              const common = {
                id: `${listId}-${index}`,
                role: "option" as const,
                "aria-selected": selected,
                // Keep focus in the input while choosing.
                onMouseDown: (e: MouseEvent) => e.preventDefault(),
                onClick: () => pick(option),
                onMouseEnter: () => setActiveIndex(index),
              };
              if (option.kind === "nearby") {
                return (
                  <li
                    key="nearby"
                    className="lsx-option lsx-option--nearby"
                    {...common}
                  >
                    <span className="lsx-option__icon" aria-hidden="true">
                      <LocateFixed size={20} />
                    </span>
                    <span className="lsx-option__text">
                      <span className="lsx-option__label">{s.nearby}</span>
                      <span className="lsx-option__sub">{s.nearbyHint}</span>
                    </span>
                  </li>
                );
              }
              const { place } = option;
              const Icon = place.kind === "city" ? MapPin : MapIcon;
              return (
                <li
                  key={`${place.kind}:${place.label}`}
                  className="lsx-option"
                  {...common}
                >
                  <span className="lsx-option__icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className="lsx-option__text">
                    <span className="lsx-option__label">{place.label}</span>
                    <span className="lsx-option__sub">
                      {place.kind === "city"
                        ? s.suggestionCity
                        : s.suggestionRegion}
                    </span>
                  </span>
                  <span className="lsx-option__count">
                    {place.count === 1
                      ? s.listingCountOne
                      : fill(s.listingCount, { count: place.count })}
                  </span>
                </li>
              );
            })}
          </ul>
          {whereText.trim() && !pickedCity && (
            <p className="lsx-pop__hint">
              {fill(s.keywordHint, { query: whereText.trim() })}
            </p>
          )}
        </div>
      )}

      {open === "category" && (
        <div
          id={`${id}-category`}
          className="lsx-pop lsx-pop--category lsx-choice-list"
          role="radiogroup"
          aria-label={s.lookingTo}
        >
          {([undefined, ...CATEGORIES] as (PropertyCategory | undefined)[]).map(
            (value) => {
              const Icon = CATEGORY_ICONS[value ?? "any"];
              const checked = value === category;
              return (
                <button
                  key={value ?? "any"}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  className="lsx-choice"
                  onClick={() => {
                    setCategory(value);
                    setOpen("type");
                  }}
                >
                  <span className="lsx-option__icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="lsx-option__text">
                    <span className="lsx-option__label">
                      {value ? categoryLabel(value, t) : s.categoryAny}
                    </span>
                    <span className="lsx-option__sub">
                      {value === "rental"
                        ? s.categoryRentalHint
                        : value === "sale"
                          ? s.categorySaleHint
                          : value === "management"
                            ? s.categoryManagementHint
                            : s.anyCategory}
                    </span>
                  </span>
                  {checked && (
                    <Check
                      size={18}
                      className="lsx-choice__check"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            },
          )}
        </div>
      )}

      {open === "type" && (
        <div
          id={`${id}-type`}
          className="lsx-pop lsx-pop--type"
          role="group"
          aria-label={s.homeType}
        >
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
                  onClick={() =>
                    setTypes((current) =>
                      selected
                        ? current.filter((item) => item !== type)
                        : [...current, type],
                    )
                  }
                >
                  <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
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
          <div className="lsx-pop__foot">
            <button
              type="button"
              className="lsx-link"
              disabled={types.length === 0}
              onClick={() => setTypes([])}
            >
              {s.clear}
            </button>
            <button
              type="button"
              className="lsx-done"
              onClick={() => setOpen(null)}
            >
              {s.done}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
