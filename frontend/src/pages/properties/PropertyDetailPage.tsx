// ===========================================
// SmartProperty - Property Detail Page
// ===========================================

import { HomeFooter, Navbar } from "@/components/layout";
import { propertyService } from "@/services/property.service";
import { useAuthStore } from "@/store";
import type { Property, PropertyImage } from "@/types/property";
import { canManageProperties } from "@/utils";
import L from "leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./properties.css";

// Fix Leaflet default marker icons (Vite asset handling)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

// Custom pin icon — vivid green, larger, stands out on the map
const createPinIcon = () =>
  L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:32px;height:42px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35))">
        <svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg" width="32" height="42">
          <path d="M16 0C9.373 0 4 5.373 4 12c0 9 12 28 12 28S28 21 28 12C28 5.373 22.627 0 16 0z"
            fill="#10b981" stroke="#fff" stroke-width="1.5"/>
          <circle cx="16" cy="12" r="5" fill="#fff" opacity="0.95"/>
          <circle cx="16" cy="12" r="2.5" fill="#10b981"/>
        </svg>
        <div style="
          position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);
          width:12px;height:4px;border-radius:50%;
          background:rgba(0,0,0,0.2);filter:blur(2px);
        "></div>
      </div>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -44],
  });

// ===========================================
// Nominatim geocoding helpers
// ===========================================

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function nominatimSearch(query: string): Promise<NominatimResult | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?format=json&limit=1&addressdetails=1` +
      `&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "SmartProperty-App", "Accept-Language": "en" },
    });
    const data: NominatimResult[] = await res.json();
    return data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

async function geocodeAddress(
  address: Property["address"],
): Promise<{ lat: number; lng: number; zoom: number } | null> {
  const { street, city, state, zipCode, country } = address;

  // Strategy 1 — full precision: street + city + state + zip + country
  const full = [street, city, state, zipCode, country]
    .filter(Boolean)
    .join(", ");
  const r1 = await nominatimSearch(full);
  if (r1) return { lat: parseFloat(r1.lat), lng: parseFloat(r1.lon), zoom: 17 };

  // Strategy 2 — street + city + country
  const mid = [street, city, country].filter(Boolean).join(", ");
  const r2 = await nominatimSearch(mid);
  if (r2) return { lat: parseFloat(r2.lat), lng: parseFloat(r2.lon), zoom: 16 };

  // Strategy 3 — city + state + country (neighbourhood level)
  const broad = [city, state, country].filter(Boolean).join(", ");
  const r3 = await nominatimSearch(broad);
  if (r3) return { lat: parseFloat(r3.lat), lng: parseFloat(r3.lon), zoom: 13 };

  return null;
}

// ===========================================
// Property Map Component (Leaflet)
// ===========================================
interface PropertyMapProps {
  address: Property["address"];
  title: string;
}

function PropertyMap({ address, title }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapError, setMapError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedCoords, setResolvedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [accuracyLabel, setAccuracyLabel] = useState<string>("");

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = (
      lat: number,
      lng: number,
      zoom: number,
      accuracy: string,
    ) => {
      if (!mapRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      }).setView([lat, lng], zoom);

      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Accuracy circle — only show for street-level
      if (zoom >= 16) {
        L.circle([lat, lng], {
          radius: 40,
          color: "#10b981",
          fillColor: "#10b981",
          fillOpacity: 0.08,
          weight: 1.5,
          dashArray: "4 4",
        }).addTo(map);
      }

      const marker = L.marker([lat, lng], { icon: createPinIcon() }).addTo(map);
      marker
        .bindPopup(
          `<div style="min-width:160px">
            <div style="font-weight:700;font-size:0.9rem;margin-bottom:4px;color:#1e293b">${title}</div>
            <div style="font-size:0.78rem;color:#64748b;line-height:1.4">
              ${address.street ? `${address.street}<br>` : ""}
              ${address.city}${address.state ? `, ${address.state}` : ""}<br>
              ${address.country}
            </div>
            ${
              zoom >= 16
                ? `<div style="margin-top:6px;font-size:0.72rem;color:#10b981;font-weight:600">📍 Exact location</div>`
                : `<div style="margin-top:6px;font-size:0.72rem;color:#f59e0b;font-weight:600">📍 Approximate location</div>`
            }
          </div>`,
          { maxWidth: 240 },
        )
        .openPopup();

      setResolvedCoords({ lat, lng });
      setAccuracyLabel(accuracy);
      setIsLoading(false);
    };

    const run = async () => {
      // Priority 1 — use stored coordinates (exact, zoom 17)
      if (address.coordinates?.lat && address.coordinates?.lng) {
        initMap(
          address.coordinates.lat,
          address.coordinates.lng,
          17,
          "Exact location (saved coordinates)",
        );
        return;
      }

      // Priority 2 — geocode the address
      const result = await geocodeAddress(address);
      if (result) {
        const accuracy =
          result.zoom >= 17
            ? "Exact street location"
            : result.zoom >= 16
              ? "Street-level location"
              : "Approximate area";
        initMap(result.lat, result.lng, result.zoom, accuracy);
      } else {
        setMapError(true);
        setIsLoading(false);
      }
    };

    run();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [address, title]);

  const openInMaps = () => {
    if (resolvedCoords) {
      // Deep-link to exact pin on OpenStreetMap
      window.open(
        `https://www.openstreetmap.org/?mlat=${resolvedCoords.lat}&mlon=${resolvedCoords.lng}#map=17/${resolvedCoords.lat}/${resolvedCoords.lng}`,
        "_blank",
        "noopener",
      );
    } else {
      const query = encodeURIComponent(
        [address.street, address.city, address.state, address.country]
          .filter(Boolean)
          .join(", "),
      );
      window.open(
        `https://www.openstreetmap.org/search?query=${query}`,
        "_blank",
        "noopener",
      );
    }
  };

  const openInGoogleMaps = () => {
    if (resolvedCoords) {
      window.open(
        `https://www.google.com/maps?q=${resolvedCoords.lat},${resolvedCoords.lng}`,
        "_blank",
        "noopener",
      );
    } else {
      const query = encodeURIComponent(
        [address.street, address.city, address.state, address.country]
          .filter(Boolean)
          .join(", "),
      );
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${query}`,
        "_blank",
        "noopener",
      );
    }
  };

  return (
    <div className="property-description" style={{ marginTop: "1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>Location</h3>
          {accuracyLabel && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                color: accuracyLabel.toLowerCase().includes("exact")
                  ? "#10b981"
                  : "#f59e0b",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                marginTop: "2px",
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
              </svg>
              {accuracyLabel}
            </span>
          )}
        </div>
        {/* Open in maps buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={openInMaps}
            title="Open in OpenStreetMap"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "var(--color-primary, #10b981)",
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              cursor: "pointer",
              padding: "0.3rem 0.7rem",
              borderRadius: "8px",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(16,185,129,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(16,185,129,0.08)";
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            OpenStreetMap
          </button>
          <button
            onClick={openInGoogleMaps}
            title="Open in Google Maps"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#4285F4",
              background: "rgba(66,133,244,0.08)",
              border: "1px solid rgba(66,133,244,0.2)",
              cursor: "pointer",
              padding: "0.3rem 0.7rem",
              borderRadius: "8px",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(66,133,244,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(66,133,244,0.08)";
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Google Maps
          </button>
        </div>
      </div>

      {/* Map container */}
      <div
        style={{
          position: "relative",
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid var(--color-border, #e2e8f0)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        }}
      >
        {isLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#f8fafc",
              gap: "0.75rem",
            }}
          >
            <div className="loading-spinner" />
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
              Locating property...
            </p>
          </div>
        )}
        {mapError ? (
          <div
            style={{
              height: "380px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
              background: "#f8fafc",
              color: "#64748b",
            }}
          >
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  margin: "0 0 0.25rem",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                Location not found
              </p>
              <p style={{ margin: 0, fontSize: "0.82rem" }}>
                Could not geocode this address
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={openInMaps}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "8px",
                  background: "var(--color-primary, #10b981)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                }}
              >
                OpenStreetMap
              </button>
              <button
                onClick={openInGoogleMaps}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "8px",
                  background: "#4285F4",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                }}
              >
                Google Maps
              </button>
            </div>
          </div>
        ) : (
          <div ref={mapRef} style={{ height: "380px", width: "100%" }} />
        )}
      </div>

      {/* Address footer */}
      <p
        style={{
          fontSize: "0.79rem",
          color: "var(--color-text-muted, #94a3b8)",
          marginTop: "0.5rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.3rem",
          lineHeight: 1.5,
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ marginTop: "2px", flexShrink: 0 }}
          aria-hidden="true"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {[
          address.street,
          address.city,
          address.state,
          address.zipCode,
          address.country,
        ]
          .filter(Boolean)
          .join(", ")}
      </p>
    </div>
  );
}

// ===========================================
// Icons
// ===========================================

const LocationIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const BedIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
    <path d="M21 7H3l2-4h14l2 4z" />
  </svg>
);

const BathIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z" />
    <path d="M6 12V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7" />
  </svg>
);

const AreaIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </svg>
);

const CarIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
    <circle cx="6.5" cy="16.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </svg>
);

const FurnitureIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
    <rect x="2" y="11" width="20" height="8" rx="2" />
    <path d="M4 19v2M20 19v2" />
  </svg>
);

const PetIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5" />
    <path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5" />
    <path d="M8 14v.5" />
    <path d="M16 14v.5" />
    <path d="M11.25 16.25h1.5L12 17l-.75-.75Z" />
    <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a13.152 13.152 0 0 0-.42-3.309" />
  </svg>
);

const BackIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const EditIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DeleteIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// ===========================================
// Image Gallery Component
// ===========================================

interface ImageGalleryProps {
  images: PropertyImage[];
}

function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const sortedImages = [...images].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return (a.order || 0) - (b.order || 0);
  });

  const mainImage = sortedImages[selectedIndex] || sortedImages[0];
  const thumbnails = sortedImages.slice(0, 4);

  if (images.length === 0) {
    return (
      <div className="property-gallery">
        <div className="gallery-main">
          <img src="/placeholder-property.svg" alt="Pas d'image" />
        </div>
      </div>
    );
  }

  return (
    <div className="property-gallery">
      <div className="gallery-main">
        <img
          src={mainImage?.url}
          alt={mainImage?.caption || "Image de la propriété"}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder-property.svg";
          }}
        />
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbnails">
          {thumbnails.slice(1, 3).map((img, index) => (
            <button
              type="button"
              key={img.key || index}
              className="gallery-thumb"
              onClick={() => setSelectedIndex(index + 1)}
              aria-label={`Show image ${index + 2}`}
            >
              <img
                src={img.url}
                alt={img.caption || `Image ${index + 2}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/placeholder-property.svg";
                }}
              />
              {index === 1 && images.length > 3 && (
                <div className="gallery-more">+{images.length - 3} photos</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Main Property Detail Page
// ===========================================

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canManage = canManageProperties(user);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProperty = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await propertyService.getProperty(id);
      setProperty(data);
    } catch (err) {
      console.error("Failed to load property:", err);
      setError("Impossible de charger la propriété. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  const handleDelete = async () => {
    if (!property) return;

    const propertyId = property.id || property._id;
    if (!propertyId) return;

    if (
      window.confirm("Êtes-vous sûr de vouloir supprimer cette propriété ?")
    ) {
      try {
        await propertyService.deleteProperty(propertyId);
        navigate("/properties");
      } catch (err) {
        console.error("Failed to delete property:", err);
        alert("Impossible de supprimer la propriété. Veuillez réessayer.");
      }
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Disponible";
      case "rented":
        return "Loué";
      case "maintenance":
        return "En maintenance";
      case "unlisted":
        return "Non listé";
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "apartment":
        return "Appartement";
      case "house":
        return "Maison";
      case "villa":
        return "Villa";
      case "studio":
        return "Studio";
      case "condo":
        return "Condo";
      case "land":
        return "Terrain";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="property-detail-page">
        <Navbar />
        <main className="property-detail-container">
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Chargement de la propriété...</p>
          </div>
        </main>
        <HomeFooter />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="property-detail-page">
        <Navbar />
        <main className="property-detail-container">
          <div className="empty-state">
            <h3>Propriété non trouvée</h3>
            <p>{error || "Cette propriété n'existe pas ou a été supprimée."}</p>
            <Link to="/properties" className="btn-filter primary">
              Retour aux propriétés
            </Link>
          </div>
        </main>
        <HomeFooter />
      </div>
    );
  }

  return (
    <div className="property-detail-page">
      <Navbar />

      <main className="property-detail-container">
        {/* Back Button */}
        <Link
          to="/properties"
          className="btn-cancel"
          style={{ marginBottom: "1.5rem" }}
        >
          <BackIcon />
          Retour aux propriétés
        </Link>

        {/* Header */}
        <div className="property-detail-header">
          <div>
            <h1 className="property-detail-title">{property.title}</h1>
            <p className="property-detail-address">
              <LocationIcon />
              {property.address.street}, {property.address.city},{" "}
              {property.address.state} {property.address.zipCode},{" "}
              {property.address.country}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="property-detail-price">
              {property.price.toLocaleString()} {property.currency}
            </div>
            <div
              style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}
            >
              <span
                className={`property-badge ${property.status}`}
                style={{ position: "static" }}
              >
                {getStatusLabel(property.status)}
              </span>
              <span
                className="property-type-badge"
                style={{ position: "static" }}
              >
                {getTypeLabel(property.type)}
              </span>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <ImageGallery images={property.images || []} />

        {/* Content */}
        <div className="property-content">
          {/* Main Info */}
          <div className="property-main-info">
            {/* Features */}
            <div className="features-grid">
              {property.features?.bedrooms !== undefined && (
                <div className="feature-item">
                  <BedIcon />
                  <div>
                    <span className="label">Chambres</span>
                    <span className="value">{property.features.bedrooms}</span>
                  </div>
                </div>
              )}
              {property.features?.bathrooms !== undefined && (
                <div className="feature-item">
                  <BathIcon />
                  <div>
                    <span className="label">Salles de bain</span>
                    <span className="value">{property.features.bathrooms}</span>
                  </div>
                </div>
              )}
              {property.features?.area !== undefined && (
                <div className="feature-item">
                  <AreaIcon />
                  <div>
                    <span className="label">Surface</span>
                    <span className="value">{property.features.area} m²</span>
                  </div>
                </div>
              )}
              {property.features?.parkingSpaces !== undefined && (
                <div className="feature-item">
                  <CarIcon />
                  <div>
                    <span className="label">Parking</span>
                    <span className="value">
                      {property.features.parkingSpaces} place
                      {property.features.parkingSpaces > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              )}
              {property.features?.furnished !== undefined && (
                <div className="feature-item">
                  <FurnitureIcon />
                  <div>
                    <span className="label">Meublé</span>
                    <span className="value">
                      {property.features.furnished ? "Oui" : "Non"}
                    </span>
                  </div>
                </div>
              )}
              {property.features?.petFriendly !== undefined && (
                <div className="feature-item">
                  <PetIcon />
                  <div>
                    <span className="label">Animaux acceptés</span>
                    <span className="value">
                      {property.features.petFriendly ? "Oui" : "Non"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {property.description && (
              <div className="property-description">
                <h3>Description</h3>
                <p>{property.description}</p>
              </div>
            )}

            {/* Amenities */}
            {property.features?.amenities &&
              property.features.amenities.length > 0 && (
                <div className="property-description">
                  <h3>Équipements</h3>
                  <div className="amenities-list">
                    {property.features.amenities.map((amenity, index) => (
                      <span key={index} className="amenity-tag">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Map Section */}
            <PropertyMap address={property.address} title={property.title} />
          </div>

          {/* Sidebar */}
          <div className="property-sidebar">
            {/* Actions Card — hidden for tenants */}
            {canManage && (
              <div className="sidebar-card">
                <h3>Actions</h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <Link
                    to={`/properties/${property.id || property._id}/edit`}
                    className="btn-view"
                    style={{ textAlign: "center" }}
                  >
                    <EditIcon />
                    Modifier la propriété
                  </Link>
                  <Link
                    to={`/properties/${property.id || property._id}/images`}
                    className="btn-edit"
                    style={{ textAlign: "center" }}
                  >
                    Gérer les images
                  </Link>
                  <button
                    className="btn-delete"
                    onClick={handleDelete}
                    style={{ width: "100%" }}
                  >
                    <DeleteIcon />
                    Supprimer
                  </button>
                </div>
              </div>
            )}

            {/* Owner Card */}
            {property.owner && (
              <div className="sidebar-card">
                <h3>Propriétaire</h3>
                <div className="owner-info">
                  <div className="owner-avatar">
                    {property.owner.name?.charAt(0) || "P"}
                  </div>
                  <div className="owner-details">
                    <h4>{property.owner.name || "Propriétaire"}</h4>
                    <p>{property.owner.email}</p>
                  </div>
                </div>
                <button className="btn-contact">Contacter</button>
              </div>
            )}

            {/* Informations Card — internal data, hidden for tenants */}
            {canManage && (
              <div className="sidebar-card">
                <h3>Informations</h3>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <p>
                    <strong>ID:</strong> {property.id || property._id}
                  </p>
                  <p>
                    <strong>Créé le:</strong>{" "}
                    {new Date(property.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                  <p>
                    <strong>Mis à jour le:</strong>{" "}
                    {new Date(property.updatedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <HomeFooter />
    </div>
  );
}
