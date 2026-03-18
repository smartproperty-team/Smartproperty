// ===========================================
// SmartProperty - Address Input Component with OpenStreetMap Nominatim
// ===========================================
// Uses Nominatim (free geocoding service) - No API key needed!
// Based on OpenStreetMap data - 100% FREE
// ESLint disable for external API types

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../i18n";
import MapPicker from "./MapPicker";

export interface AddressData {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface AddressInputProps {
  value: AddressData;
  onChange: (address: AddressData) => void;
  errors?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  disabled?: boolean;
}

// Convert address to searchable string
const addressToSearchString = (address: AddressData): string => {
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zipCode) parts.push(address.zipCode);
  if (address.country) parts.push(address.country);
  return parts.join(", ");
};

// Search using Nominatim (FREE OpenStreetMap geocoding)
const searchAddress = async (query: string) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "SmartProperty-App",
        },
      },
    );
    if (!response.ok) throw new Error("Search failed");
    return await response.json();
  } catch (error) {
    console.error("❌ Address search failed:", error);
    return [];
  }
};

export default function AddressInput({
  value,
  onChange,
  errors,
  disabled = false,
}: AddressInputProps) {
  const t = useTranslation();
  const [searchQuery, setSearchQuery] = useState(addressToSearchString(value));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const searchTimeout = useRef<number | undefined>(undefined);

  // Handle address search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    // Debounce search
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    setSearching(true);
    searchTimeout.current = window.setTimeout(async () => {
      const results = await searchAddress(query);
      setSearchResults(results.slice(0, 5)); // Limit to 5 results
      setShowResults(true);
      setSearching(false);
    }, 500);
  };

  // Handle address selection from search results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelectAddress = async (result: any) => {
    console.log("📍 Selected address:", result.display_name);
    console.log("📦 Address parts:", result.address);

    const addressParts = result.address || {};

    // Extract street (combine house number and road name)
    const streetParts = [];
    if (addressParts.house_number) streetParts.push(addressParts.house_number);
    if (addressParts.road) streetParts.push(addressParts.road);
    if (addressParts.street) streetParts.push(addressParts.street);
    let street = streetParts.join(" ").trim();

    // Extract city (try multiple fields)
    let city = (
      addressParts.city ||
      addressParts.town ||
      addressParts.village ||
      addressParts.municipality ||
      addressParts.hamlet ||
      ""
    ).trim();

    // Extract state/region
    const state = (
      addressParts.state ||
      addressParts.province ||
      addressParts.region ||
      ""
    ).trim();

    // Extract postal code
    const zipCode = (addressParts.postcode || "").trim();

    // Extract country
    let country = (addressParts.country || "").trim();

    // Fallback: If street or city is empty, try to extract from display_name
    if (!street || !city || !country) {
      const displayParts = (result.display_name || "")
        .split(",")
        .map((p: string) => p.trim());

      if (!street && displayParts.length > 0) {
        street = displayParts[0]; // First part is usually the street
        console.log("⚠️ Street extracted from display_name:", street);
      }

      if (!city && displayParts.length > 1) {
        city = displayParts[1]; // Second part is usually the city
        console.log("⚠️ City extracted from display_name:", city);
      }

      if (!country && displayParts.length > 0) {
        country = displayParts[displayParts.length - 1]; // Last part is usually the country
        console.log("⚠️ Country extracted from display_name:", country);
      }
    }

    const newAddress: AddressData = {
      street:
        street || t.properties.form.addressHelper.fallback.streetUnavailable,
      city: city || t.properties.form.addressHelper.fallback.cityUnspecified,
      state: state || "",
      zipCode: zipCode || "",
      country:
        country || t.properties.form.addressHelper.fallback.countryUnspecified,
      coordinates: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      },
    };

    console.log("✅ Parsed address:");
    console.table({
      Rue: newAddress.street,
      Ville: newAddress.city,
      État: newAddress.state || "(vide)",
      "Code postal": newAddress.zipCode || "(vide)",
      Pays: newAddress.country,
      Latitude: newAddress.coordinates?.lat || 0,
      Longitude: newAddress.coordinates?.lng || 0,
    });

    onChange(newAddress);
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setShowResults(false);

    // Show success message
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
  };

  // Handle address selection from map
  const handleMapAddressSelect = (address: AddressData) => {
    console.log("🗺️ Address selected from map:", address);
    onChange(address);
    setSearchQuery(`${address.street}, ${address.city}, ${address.country}`);

    // Show success message
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
  };

  // Handle manual input change
  const handleManualChange = (field: keyof AddressData, val: string) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  // Handle coordinate change
  const handleCoordinateChange = (field: "lat" | "lng", val: string) => {
    const numValue = parseFloat(val);
    if (isNaN(numValue)) return;

    onChange({
      ...value,
      coordinates: {
        lat: field === "lat" ? numValue : value.coordinates?.lat || 0,
        lng: field === "lng" ? numValue : value.coordinates?.lng || 0,
      },
    });
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  return (
    <div className="address-input-container">
      {/* Search with OpenStreetMap */}
      <div className="form-group full-width">
        <label htmlFor="address-search"></label>

        {/* Map Picker Button */}
        <button
          type="button"
          onClick={() => setIsMapPickerOpen(true)}
          disabled={disabled}
          style={{
            width: "100%",
            padding: "0.875rem",
            marginBottom: "1rem",
            backgroundColor: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              (e.target as HTMLElement).style.backgroundColor = "#059669";
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              (e.target as HTMLElement).style.backgroundColor = "#10b981";
            }
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>🗺️</span>
          <span>{t.properties.form.addressHelper.mapButton}</span>
        </button>
        <div style={{ position: "relative" }}>
          <input
            id="address-search"
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder={t.properties.form.addressHelper.searchPlaceholder}
            disabled={disabled}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "0.95rem",
            }}
          />

          {searching && (
            <div
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "0.8rem",
              }}
            >
              ⏳ {t.properties.form.addressHelper.searching}
            </div>
          )}

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: "white",
                border: "1px solid #ddd",
                borderTop: "none",
                borderRadius: "0 0 4px 4px",
                maxHeight: "300px",
                overflowY: "auto",
                zIndex: 1000,
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              {searchResults.map((result, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => handleSelectAddress(result)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderBottom: "1px solid #f0f0f0",
                    borderLeft: "none",
                    borderRight: "none",
                    borderTop: "none",
                    backgroundColor: "white",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "#f5f5f5";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "white";
                  }}
                >
                  <div style={{ fontSize: "0.9rem", fontWeight: "500" }}>
                    📍 {result.display_name.split(",").slice(0, 3).join(", ")}
                  </div>
                  <small style={{ color: "#666" }}>
                    {result.display_name.split(",").slice(3).join(", ")}
                  </small>
                </button>
              ))}
            </div>
          )}

          {searchQuery.length > 0 &&
            searchResults.length === 0 &&
            !searching && (
              <small
                style={{
                  display: "block",
                  color: "#888",
                  marginTop: "0.25rem",
                }}
              ></small>
            )}
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              backgroundColor: "#d4edda",
              color: "#155724",
              border: "1px solid #c3e6cb",
              borderRadius: "4px",
              fontSize: "0.9rem",
            }}
          >
            {t.properties.form.addressHelper.successMessage}
          </div>
        )}
      </div>

      {/* Manual Address Fields */}
      <div className="form-grid" style={{ marginTop: "1.5rem" }}>
        <div className="form-group full-width">
          <label htmlFor="street">
            {t.properties.form.addressHelper.fields.street}{" "}
            <span className="required">*</span>
          </label>
          <input
            id="street"
            name="street"
            type="text"
            value={value.street}
            onChange={(e) => handleManualChange("street", e.target.value)}
            placeholder={t.properties.form.addressHelper.placeholders.street}
            disabled={disabled}
            className={errors?.street ? "error" : ""}
          />
          {errors?.street && (
            <span className="error-message">{errors.street}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="city">
            {t.properties.form.addressHelper.fields.city}{" "}
            <span className="required">*</span>
          </label>
          <input
            id="city"
            name="city"
            type="text"
            value={value.city}
            onChange={(e) => handleManualChange("city", e.target.value)}
            placeholder={t.properties.form.addressHelper.placeholders.city}
            disabled={disabled}
            className={errors?.city ? "error" : ""}
          />
          {errors?.city && <span className="error-message">{errors.city}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="state">
            {t.properties.form.addressHelper.fields.state}
          </label>
          <input
            id="state"
            name="state"
            type="text"
            value={value.state}
            onChange={(e) => handleManualChange("state", e.target.value)}
            placeholder={t.properties.form.addressHelper.placeholders.state}
            disabled={disabled}
          />
        </div>

        <div className="form-group">
          <label htmlFor="zipCode">
            {t.properties.form.addressHelper.fields.zipCode}
          </label>
          <input
            id="zipCode"
            name="zipCode"
            type="text"
            value={value.zipCode}
            onChange={(e) => handleManualChange("zipCode", e.target.value)}
            placeholder={t.properties.form.addressHelper.placeholders.zipCode}
            disabled={disabled}
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="country">
            {t.properties.form.addressHelper.fields.country}{" "}
            <span className="required">*</span>
          </label>
          <input
            id="country"
            name="country"
            type="text"
            value={value.country}
            onChange={(e) => handleManualChange("country", e.target.value)}
            placeholder={t.properties.form.addressHelper.placeholders.country}
            disabled={disabled}
            className={errors?.country ? "error" : ""}
          />
          {errors?.country && (
            <span className="error-message">{errors.country}</span>
          )}
        </div>
      </div>

      {/* Coordinates Display */}
      <details
        style={{
          marginTop: "1.5rem",
          padding: "1rem",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        <summary style={{ fontWeight: "bold", color: "#333" }}>
          📍 {t.properties.form.addressHelper.coordinates.summary}
        </summary>
        <div className="form-grid" style={{ marginTop: "1rem" }}>
          <div className="form-group">
            <label htmlFor="lat">
              {t.properties.form.addressHelper.fields.latitude}
            </label>
            <input
              id="lat"
              type="number"
              step="0.0001"
              value={value.coordinates?.lat || ""}
              onChange={(e) => handleCoordinateChange("lat", e.target.value)}
              placeholder={
                t.properties.form.addressHelper.placeholders.latitudeExample
              }
              disabled={disabled}
            />
            <small style={{ color: "#666" }}>
              {value.coordinates?.lat
                ? `✅ ${value.coordinates.lat}`
                : t.properties.form.addressHelper.coordinates.autoFilled}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="lng">
              {t.properties.form.addressHelper.fields.longitude}
            </label>
            <input
              id="lng"
              type="number"
              step="0.0001"
              value={value.coordinates?.lng || ""}
              onChange={(e) => handleCoordinateChange("lng", e.target.value)}
              placeholder={
                t.properties.form.addressHelper.placeholders.longitudeExample
              }
              disabled={disabled}
            />
            <small style={{ color: "#666" }}>
              {value.coordinates?.lng
                ? `✅ ${value.coordinates.lng}`
                : t.properties.form.addressHelper.coordinates.autoFilled}
            </small>
          </div>
        </div>
        <small
          style={{ color: "#666", display: "block", marginTop: "0.75rem" }}
        >
          {t.properties.form.addressHelper.coordinates.help}
        </small>
      </details>

      {/* Map Picker Modal */}
      <MapPicker
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onSelectAddress={handleMapAddressSelect}
        initialPosition={value.coordinates || { lat: 36.8065, lng: 10.1816 }}
      />
    </div>
  );
}
