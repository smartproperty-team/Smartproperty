// ===========================================
// Price range: histogram, two-handle slider and typed bounds
// ===========================================
// The slider runs on Airbnb's square-root scale (PriceSliderFilterItem):
// cheap listings, where most of them are, get most of the track. Bars of
// the histogram sit under the slider positions they count. Unlike Airbnb,
// the typical (median) price is marked on the chart.

import { useTranslation } from "@/i18n";
import type { PriceHistogram } from "@/types/property";
import {
  formatAmount,
  MIN_PRICE_POSITION_GAP,
  positionToPrice,
  priceToPosition,
  roundPrice,
} from "@/utils/listingFilters";
import { useId, useState, type CSSProperties } from "react";

const STEPS = 1000;
const SKELETON_BARS = 40;

export interface PriceRange {
  minPrice?: number;
  maxPrice?: number;
}

interface PriceRangeFilterProps extends PriceRange {
  /** undefined while loading, null when nothing matches the other filters */
  histogram: PriceHistogram | null | undefined;
  onChange: (range: PriceRange) => void;
  currency?: string;
}

const parseAmount = (text: string): number | undefined => {
  const value = Number(text.replace(/[^\d.]/g, ""));
  return text.trim() && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : undefined;
};

export function PriceRangeFilter({
  histogram,
  minPrice,
  maxPrice,
  onChange,
  currency = "TND",
}: PriceRangeFilterProps) {
  const t = useTranslation();
  const s = t.listingSearch;
  const id = useId();
  // What the user is typing; null shows the applied value instead.
  const [minDraft, setMinDraft] = useState<string | null>(null);
  const [maxDraft, setMaxDraft] = useState<string | null>(null);

  const scale = histogram ?? null;
  const lo =
    scale && minPrice !== undefined
      ? priceToPosition(minPrice, scale.min, scale.max)
      : 0;
  const hi =
    scale && maxPrice !== undefined
      ? priceToPosition(maxPrice, scale.min, scale.max)
      : 1;

  const fromPosition = (position: number) =>
    scale
      ? roundPrice(
          positionToPrice(position, scale.min, scale.max),
          scale.min,
          scale.max,
        )
      : undefined;

  const moveLow = (raw: number) => {
    const position = Math.min(raw / STEPS, hi - MIN_PRICE_POSITION_GAP);
    onChange({
      minPrice: position <= 0 ? undefined : fromPosition(position),
      maxPrice,
    });
  };

  const moveHigh = (raw: number) => {
    const position = Math.max(raw / STEPS, lo + MIN_PRICE_POSITION_GAP);
    onChange({
      minPrice,
      maxPrice: position >= 1 ? undefined : fromPosition(position),
    });
  };

  const commit = (which: "min" | "max", text: string) => {
    let nextMin = which === "min" ? parseAmount(text) : minPrice;
    let nextMax = which === "max" ? parseAmount(text) : maxPrice;
    if (nextMin !== undefined && nextMax !== undefined && nextMin > nextMax) {
      [nextMin, nextMax] = [nextMax, nextMin];
    }
    onChange({ minPrice: nextMin, maxPrice: nextMax });
  };

  const field = (which: "min" | "max") => {
    const isMin = which === "min";
    const draft = isMin ? minDraft : maxDraft;
    const setDraft = isMin ? setMinDraft : setMaxDraft;
    const applied = isMin ? minPrice : maxPrice;
    const placeholder = scale
      ? isMin
        ? formatAmount(scale.min)
        : `${formatAmount(scale.max)}+`
      : s.any;

    return (
      <div className="lsx-price__field">
        <label htmlFor={`${id}-${which}`}>
          {isMin ? s.priceMin : s.priceMax}
        </label>
        <div className="lsx-price__input-row">
          <input
            id={`${id}-${which}`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={placeholder}
            value={
              draft ?? (applied !== undefined ? formatAmount(applied) : "")
            }
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => {
              if (draft !== null) commit(which, e.target.value);
              setDraft(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          <span aria-hidden="true">{currency}</span>
        </div>
      </div>
    );
  };

  const fields = (
    <div className="lsx-price__fields">
      {field("min")}
      <span className="lsx-price__dash" aria-hidden="true" />
      {field("max")}
    </div>
  );

  // The chart changes as the histogram loads; the typed fields stay the same
  // element underneath it, so typing is never interrupted by the data.
  let chart;
  if (histogram === null) {
    chart = <p className="lsx-price__empty">{s.noPrices}</p>;
  } else if (!scale) {
    chart = (
      <div className="lsx-price__hist" aria-hidden="true">
        {Array.from({ length: SKELETON_BARS }, (_, i) => (
          <span
            key={i}
            className="lsx-price__bar"
            style={{
              height: `${20 + 60 * Math.sin((i / SKELETON_BARS) * Math.PI) ** 2}%`,
            }}
          />
        ))}
      </div>
    );
  } else {
    const peak = Math.max(1, ...scale.buckets);
    const medianPosition = priceToPosition(scale.median, scale.min, scale.max);
    const typical = `${formatAmount(scale.median)} ${currency}`;
    const shift =
      medianPosition < 0.15 ? "-15%" : medianPosition > 0.85 ? "-85%" : "-50%";

    chart = (
      <>
        <div
          className="lsx-price__hist"
          role="img"
          aria-label={s.priceSpread.replace(
            "{{price}}",
            formatAmount(scale.median),
          )}
        >
          {scale.buckets.map((count, i) => {
            const center = (i + 0.5) / scale.buckets.length;
            return (
              <span
                key={i}
                className="lsx-price__bar"
                data-in={center >= lo && center <= hi}
                style={{
                  height: count ? `${Math.max(6, (count / peak) * 100)}%` : 0,
                }}
              />
            );
          })}
          <span
            className="lsx-price__median"
            style={{ left: `${medianPosition * 100}%` }}
            aria-hidden="true"
          >
            <span
              className="lsx-price__median-label"
              style={{ transform: `translateX(${shift})` }}
            >
              {s.priceTypical.replace("{{price}}", typical)}
            </span>
          </span>
        </div>

        <div
          className="lsx-price__track"
          style={{ "--lo": lo, "--hi": hi } as CSSProperties}
        >
          <span className="lsx-price__rail" />
          <span className="lsx-price__fill" />
          <input
            type="range"
            min={0}
            max={STEPS}
            step={1}
            value={Math.round(lo * STEPS)}
            onChange={(e) => moveLow(Number(e.target.value))}
            aria-label={s.priceMinSlider}
            aria-valuetext={`${formatAmount(minPrice ?? scale.min)} ${currency}`}
          />
          <input
            type="range"
            min={0}
            max={STEPS}
            step={1}
            value={Math.round(hi * STEPS)}
            onChange={(e) => moveHigh(Number(e.target.value))}
            aria-label={s.priceMaxSlider}
            aria-valuetext={
              maxPrice !== undefined
                ? `${formatAmount(maxPrice)} ${currency}`
                : `${formatAmount(scale.max)}+ ${currency}`
            }
          />
        </div>
      </>
    );
  }

  return (
    <div
      className={
        histogram === undefined ? "lsx-price lsx-price__skeleton" : "lsx-price"
      }
      aria-busy={histogram === undefined}
    >
      <div className="lsx-price__chart">{chart}</div>
      {fields}
    </div>
  );
}
