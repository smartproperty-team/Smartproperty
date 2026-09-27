// ===========================================
// PropertyMapView - Airbnb-style property map
// ===========================================

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Property } from "../../types/property";

const DEFAULT_CENTER = { lat: 36.8065, lng: 10.1815 };
const DEFAULT_ZOOM = 11;

// Card dimensions used for smart edge-clamping
const POPUP_W = 280;
const POPUP_H = 330;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency: string): string {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M ${currency}`;
  if (price >= 1_000) return `${Math.round(price / 1_000)}K ${currency}`;
  return `${price.toLocaleString()} ${currency}`;
}

function getPropertyId(p: Property): string {
  return p.id || p._id || "";
}

function buildIcon(price: number, currency: string, selected: boolean, hovered: boolean) {
  const label = formatPrice(price, currency);
  const cls = ["property-price-marker", selected ? "selected" : hovered ? "highlighted" : ""]
    .filter(Boolean)
    .join(" ");
  return L.divIcon({
    className: "",
    html: `<div class="${cls}">${label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Approximate pill marker half-height (used as gap above popup)
const MARKER_HALF_H = 18;

/**
 * Clamp popup position so it stays within the map container,
 * preferring to appear above the marker.
 */
function clampPopupPos(
  px: number,
  py: number,
  mapW: number,
  mapH: number,
): { left: number; top: number } {
  const GAP = 10;

  // Default: centered above the marker pill
  let left = px - POPUP_W / 2;
  let top = py - MARKER_HALF_H - POPUP_H - GAP;

  // Flip below if not enough room above
  if (top < GAP) {
    top = py + MARKER_HALF_H + GAP;
  }

  // Clamp horizontally
  if (left < GAP) left = GAP;
  if (left + POPUP_W > mapW - GAP) left = mapW - POPUP_W - GAP;

  // Clamp vertically (bottom overflow)
  if (top + POPUP_H > mapH - GAP) top = mapH - POPUP_H - GAP;
  if (top < GAP) top = GAP;

  return { left, top };
}

// ─── Popup card ──────────────────────────────────────────────────────────────

function PropertyPopupCard({
  property,
  pos,
  onClose,
}: {
  property: Property;
  pos: { left: number; top: number };
  onClose: () => void;
}) {
  const id = getPropertyId(property);
  const primaryImage =
    property.images?.find((img) => img.isPrimary) || property.images?.[0];
  const imageUrl = primaryImage?.url || "/placeholder-property.svg";
  const typeLabel = property.type.charAt(0).toUpperCase() + property.type.slice(1);

  return (
    <div
      role="presentation"
      className="map-popup-card"
      style={{ left: pos.left, top: pos.top }}
      // Prevent map click from closing the popup when clicking inside the card
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="map-popup-close"
        onClick={onClose}
        aria-label="Close preview"
      >
        ✕
      </button>

      <Link
        to={`/properties/${id}`}
        className="map-popup-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="map-popup-image">
          <img
            src={imageUrl}
            alt={property.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder-property.svg";
            }}
          />
          <span className={`property-badge ${property.status}`}>
            {property.status}
          </span>
        </div>

        <div className="map-popup-body">
          <p className="map-popup-type">
            {typeLabel} · {property.address.city}
          </p>
          <h3 className="map-popup-title">{property.title}</h3>

          {(property.features?.bedrooms !== undefined ||
            property.features?.area !== undefined) && (
            <p className="map-popup-features">
              {property.features?.bedrooms !== undefined &&
                `${property.features.bedrooms} bed${property.features.bedrooms !== 1 ? "s" : ""}`}
              {property.features?.bedrooms !== undefined &&
                property.features?.area !== undefined &&
                " · "}
              {property.features?.area !== undefined && `${property.features.area} m²`}
            </p>
          )}

          <p className="map-popup-price">
            {property.price.toLocaleString()}{" "}
            <span className="map-popup-currency">{property.currency}</span>
          </p>
        </div>
      </Link>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface PropertyMapViewProps {
  properties: Property[];
  hoveredPropertyId?: string | null;
  onPropertyHover?: (id: string | null) => void;
}

interface PopupState {
  id: string;
  pos: { left: number; top: number };
}

export default function PropertyMapView({
  properties,
  hoveredPropertyId,
  onPropertyHover,
}: PropertyMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Stable refs so Leaflet event handlers never go stale
  const hoveredIdRef = useRef<string | null>(null);
  const popupRef = useRef<PopupState | null>(null);
  const propertiesRef = useRef<Property[]>(properties);
  const hasFitBoundsRef = useRef(false);

  const [popup, setPopup] = useState<PopupState | null>(null);

  // Keep refs in sync each render
  hoveredIdRef.current = hoveredPropertyId ?? null;
  popupRef.current = popup;
  propertiesRef.current = properties;

  // ── Rebuild icon for a single marker ─────────────────────────────────────
  function refreshIcon(id: string) {
    const marker = markersRef.current.get(id);
    if (!marker) return;
    const property = propertiesRef.current.find((p) => getPropertyId(p) === id);
    if (!property) return;
    const sel = popupRef.current?.id === id;
    const hov = hoveredIdRef.current === id;
    marker.setIcon(buildIcon(property.price, property.currency, sel, hov));
    marker.setZIndexOffset(sel || hov ? 1000 : 0);
  }

  // ── Initialize map once ───────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    // Keep panes below app-level overlays
    const panes = map.getPanes();
    panes.mapPane.style.zIndex = "1";
    panes.tilePane.style.zIndex = "2";
    panes.overlayPane.style.zIndex = "3";
    panes.shadowPane.style.zIndex = "4";
    panes.markerPane.style.zIndex = "5";
    panes.tooltipPane.style.zIndex = "6";
    panes.popupPane.style.zIndex = "7";

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Clicking the map background closes the popup
    map.on("click", () => {
      setPopup((prev) => {
        if (prev) {
          // Refresh the previously selected marker back to normal
          setTimeout(() => refreshIcon(prev.id), 0);
        }
        return null;
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      hasFitBoundsRef.current = false;
    };
  }, []);

  // ── Add / remove markers when properties change ───────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const incoming = new Set<string>();
    const bounds: [number, number][] = [];

    for (const property of properties) {
      const coords = property.address.coordinates;
      if (!coords) continue;
      const id = getPropertyId(property);
      if (!id) continue;

      incoming.add(id);
      bounds.push([coords.lat, coords.lng]);

      if (!markersRef.current.has(id)) {
        const marker = L.marker([coords.lat, coords.lng], {
          icon: buildIcon(property.price, property.currency, false, false),
        });

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);

          const prevPopup = popupRef.current;
          const isAlreadySelected = prevPopup?.id === id;

          // Deselect if clicking the same marker again
          if (isAlreadySelected) {
            setPopup(null);
            setTimeout(() => refreshIcon(id), 0);
            return;
          }

          // Convert marker lat/lng to pixel coords inside the map container
          const latlng = L.latLng(coords.lat, coords.lng);
          const point = map.latLngToContainerPoint(latlng);
          const mapSize = map.getSize();
          const pos = clampPopupPos(point.x, point.y, mapSize.x, mapSize.y);

          setPopup({ id, pos });

          // Refresh old selected marker back to normal, then new one as selected
          if (prevPopup) setTimeout(() => refreshIcon(prevPopup.id), 0);
          setTimeout(() => refreshIcon(id), 0);
        });

        marker.on("mouseover", () => onPropertyHover?.(id));
        marker.on("mouseout", () => onPropertyHover?.(null));

        marker.addTo(map);
        markersRef.current.set(id, marker);
      }
    }

    // Remove stale markers
    for (const [id, marker] of markersRef.current) {
      if (!incoming.has(id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    }

    // Fit bounds only on first load
    if (!hasFitBoundsRef.current && bounds.length > 0) {
      hasFitBoundsRef.current = true;
      if (bounds.length === 1) {
        map.setView(bounds[0], DEFAULT_ZOOM);
      } else {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
      }
    }
  }, [properties, onPropertyHover]);

  // ── Refresh icons when hover changes ─────────────────────────────────────
  useEffect(() => {
    for (const id of markersRef.current.keys()) refreshIcon(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredPropertyId]);

  // ── Refresh icons when popup changes ─────────────────────────────────────
  useEffect(() => {
    for (const id of markersRef.current.keys()) refreshIcon(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popup?.id]);

  const selectedProperty = popup
    ? (properties.find((p) => getPropertyId(p) === popup.id) ?? null)
    : null;

  return (
    <div className="property-map-container">
      <div ref={containerRef} className="property-map" />

      {selectedProperty && popup && (
        <PropertyPopupCard
          property={selectedProperty}
          pos={popup.pos}
          onClose={() => {
            setPopup(null);
            setTimeout(() => refreshIcon(popup.id), 0);
          }}
        />
      )}
    </div>
  );
}
