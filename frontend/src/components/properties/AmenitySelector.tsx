// ===========================================
// SmartProperty - Amenity selector
// ===========================================

import { useMemo, useState } from "react";

/**
 * Amenities used to be a free-text input labelled "Amenities (comma
 * separated)", which asked the owner to remember both the vocabulary and the
 * delimiter. This presents the common options as toggles and keeps a free-text
 * escape hatch for anything unusual.
 *
 * The value stays a comma-separated string so nothing downstream changes: the
 * DTO, the API and the seed data all keep the shape they already had.
 */
const SUGGESTED_AMENITIES = [
  "Air conditioning",
  "Heating",
  "WiFi",
  "Parking",
  "Elevator",
  "Balcony",
  "Terrace",
  "Garden",
  "Pool",
  "Sea view",
  "Furnished",
  "Equipped kitchen",
  "Washing machine",
  "Dishwasher",
  "Security",
  "Concierge",
] as const;

export interface AmenitySelectorProps {
  /** Comma-separated list, as stored on the form. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
  /** Rendered under the control, e.g. "Optional". */
  hint?: string;
}

const parse = (value: string): string[] =>
  value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

export default function AmenitySelector({
  value,
  onChange,
  disabled = false,
  label,
  hint,
}: AmenitySelectorProps) {
  const [custom, setCustom] = useState("");

  const selected = useMemo(() => parse(value), [value]);
  const selectedLower = useMemo(
    () => new Set(selected.map((s) => s.toLowerCase())),
    [selected],
  );

  const commit = (next: string[]) => {
    // De-duplicate case-insensitively while preserving the order chosen.
    const seen = new Set<string>();
    const deduped = next.filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    onChange(deduped.join(", "));
  };

  const toggle = (amenity: string) => {
    if (disabled) return;
    commit(
      selectedLower.has(amenity.toLowerCase())
        ? selected.filter((s) => s.toLowerCase() !== amenity.toLowerCase())
        : [...selected, amenity],
    );
  };

  const addCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed) return;
    commit([...selected, trimmed]);
    setCustom("");
  };

  // Anything the owner typed that is not one of the suggestions.
  const extras = selected.filter(
    (s) => !SUGGESTED_AMENITIES.some((a) => a.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="amenity-selector">
      <span className="amenity-selector__label">{label}</span>
      {hint && <span className="amenity-selector__hint">{hint}</span>}

      <div className="amenity-selector__options" role="group" aria-label={label}>
        {SUGGESTED_AMENITIES.map((amenity) => {
          const isOn = selectedLower.has(amenity.toLowerCase());
          return (
            <button
              key={amenity}
              type="button"
              className={`amenity-chip${isOn ? " amenity-chip--on" : ""}`}
              onClick={() => toggle(amenity)}
              disabled={disabled}
              aria-pressed={isOn}
            >
              {amenity}
            </button>
          );
        })}
      </div>

      {extras.length > 0 && (
        <div className="amenity-selector__options">
          {extras.map((amenity) => (
            <button
              key={amenity}
              type="button"
              className="amenity-chip amenity-chip--on amenity-chip--custom"
              onClick={() => toggle(amenity)}
              disabled={disabled}
              aria-pressed={true}
              title="Remove"
            >
              {amenity}
              <span aria-hidden="true"> &times;</span>
            </button>
          ))}
        </div>
      )}

      <div className="amenity-selector__custom">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds the amenity rather than submitting the form.
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add another amenity"
          disabled={disabled}
          aria-label="Add another amenity"
        />
        <button
          type="button"
          className="amenity-selector__add"
          onClick={addCustom}
          disabled={disabled || !custom.trim()}
        >
          Add
        </button>
      </div>

      <span className="amenity-selector__count" aria-live="polite">
        {selected.length === 0
          ? "None selected"
          : `${selected.length} selected`}
      </span>
    </div>
  );
}
