// ===========================================
// PropertyMapView - Airbnb-style property map
// ===========================================
// Price pills for the listings on the current results page, small dots for
// the other matches, and "search as I move the map" using the same settle,
// distance and debounce rules as Airbnb (see utils/mapSearch.ts).

import { useTranslation } from "@/i18n";
import type { Property, PropertyMapPin } from "@/types/property";
import {
  boundsShiftRatio,
  MAP_SEARCH_DEBOUNCE_MS,
  MAP_SEARCH_MIN_SHIFT,
  MAP_SEARCH_PADDING_PX,
  roundBounds,
  sameBounds,
  type MapBounds,
} from "@/utils/mapSearch";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

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

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}

function getPropertyId(p: Property): string {
  return p.id || p._id || "";
}

/** Everything a marker and its preview card need. */
interface MapPin {
  id: string;
  title: string;
  type: string;
  status: string;
  city: string;
  price: number;
  currency: string;
  lat: number;
  lng: number;
  bedrooms?: number;
  area?: number;
  imageUrl?: string;
  // On the current results page: drawn as a price pill, otherwise as a dot
  // (Airbnb's FULL_PIN and MINI_PIN).
  full: boolean;
}

function pinFromProperty(property: Property): MapPin | null {
  const coords = property.address.coordinates;
  const id = getPropertyId(property);
  if (!coords || !id) return null;

  // Same cover photo as the listing card: primary first, then by order.
  const [cover] = [...(property.images ?? [])].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  return {
    id,
    title: property.title,
    type: property.type,
    status: property.status,
    city: property.address.city,
    price: property.price,
    currency: property.currency,
    lat: coords.lat,
    lng: coords.lng,
    bedrooms: property.features?.bedrooms,
    area: property.features?.area,
    imageUrl: cover?.url,
    full: true,
  };
}

function buildPins(properties: Property[], mapPins: PropertyMapPin[] = []) {
  const pins = properties
    .map(pinFromProperty)
    .filter((pin): pin is MapPin => pin !== null);
  const onPage = new Set(pins.map((pin) => pin.id));

  for (const pin of mapPins) {
    if (!onPage.has(pin.id)) pins.push({ ...pin, full: false });
  }
  return pins;
}

function buildIcon(pin: MapPin) {
  const cls = pin.full ? "property-price-marker" : "property-mini-marker";
  const label = escapeHtml(formatPrice(pin.price, pin.currency));
  return L.divIcon({
    className: "",
    html: `<div class="${cls}"><span>${label}</span></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** The visible area minus Airbnb's 16 px edge padding, rounded for URLs. */
function readSearchBounds(map: L.Map): MapBounds {
  const pixels = map.getPixelBounds();
  const zoom = map.getZoom();
  const pad = MAP_SEARCH_PADDING_PX;
  const sw = map.unproject(
    L.point(pixels.min!.x + pad, pixels.max!.y - pad),
    zoom,
  );
  const ne = map.unproject(
    L.point(pixels.max!.x - pad, pixels.min!.y + pad),
    zoom,
  );
  return roundBounds({
    neLat: ne.lat,
    neLng: ne.lng,
    swLat: sw.lat,
    swLng: sw.lng,
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
  pin,
  pos,
  onClose,
}: {
  pin: MapPin;
  pos: { left: number; top: number };
  onClose: () => void;
}) {
  const imageUrl = pin.imageUrl || "/placeholder-property.svg";
  const typeLabel = pin.type.charAt(0).toUpperCase() + pin.type.slice(1);

  return (
    <div
      role="presentation"
      className="map-popup-card"
      style={{ left: pos.left, top: pos.top }}
      // Prevent map click from closing the popup when clicking inside the card
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
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
        to={`/properties/${pin.id}`}
        className="map-popup-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="map-popup-image">
          <img
            src={imageUrl}
            alt={pin.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder-property.svg";
            }}
          />
          <span className={`property-badge ${pin.status}`}>{pin.status}</span>
        </div>

        <div className="map-popup-body">
          <p className="map-popup-type">
            {typeLabel} · {pin.city}
          </p>
          <h3 className="map-popup-title">{pin.title}</h3>

          {(pin.bedrooms !== undefined || pin.area !== undefined) && (
            <p className="map-popup-features">
              {pin.bedrooms !== undefined &&
                `${pin.bedrooms} bed${pin.bedrooms !== 1 ? "s" : ""}`}
              {pin.bedrooms !== undefined && pin.area !== undefined && " · "}
              {pin.area !== undefined && `${pin.area} m²`}
            </p>
          )}

          <p className="map-popup-price">
            {pin.price.toLocaleString()}{" "}
            <span className="map-popup-currency">{pin.currency}</span>
          </p>
        </div>
      </Link>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface PropertyMapViewProps {
  /** Listings on the current results page (price pills). */
  properties: Property[];
  /** Every match the search returned pins for; the rest show as dots. */
  mapPins?: PropertyMapPin[];
  hoveredPropertyId?: string | null;
  onPropertyHover?: (id: string | null) => void;
  /** Map area the results are limited to, if any. */
  searchBounds?: MapBounds;
  /** Changes when a search not made from the map changes the results. */
  fitKey?: string;
  /** Called after the user moves the map and it settles. */
  onSearchArea?: (bounds: MapBounds) => void;
  loading?: boolean;
}

export default function PropertyMapView({
  properties,
  mapPins,
  hoveredPropertyId = null,
  onPropertyHover,
  searchBounds,
  fitKey = "",
  onSearchArea,
  loading = false,
}: PropertyMapViewProps) {
  const t = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(
    new Map<string, { marker: L.Marker; signature: string; full: boolean }>(),
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [autoSearch, setAutoSearch] = useState(true);
  // Moved far enough to search while auto-search is off.
  const [areaChanged, setAreaChanged] = useState(false);
  // Bumped while the map moves so an open preview card follows its pin.
  const [, setViewVersion] = useState(0);

  // Leaflet handlers are bound once; they read the latest values from refs.
  const latest = useRef({ onSearchArea, onPropertyHover, autoSearch });
  latest.current = { onSearchArea, onPropertyHover, autoSearch };
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  // Set before fitting the map ourselves, so the move is not taken as the
  // user's (Airbnb only searches on reason === "user-interaction").
  const programmaticMoveRef = useRef(false);
  // The area the shown results were searched for.
  const searchedBoundsRef = useRef<MapBounds | undefined>(undefined);
  const fittedKeyRef = useRef<string | null>(null);
  const searchTimerRef = useRef<number | undefined>(undefined);

  const pins = useMemo(
    () => buildPins(properties, mapPins),
    [properties, mapPins],
  );

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
    map.on("click", () => setSelectedId(null));

    // A new move cancels a search still waiting for the map to settle.
    map.on("movestart", () => window.clearTimeout(searchTimerRef.current));

    // A window resize also moves the view, but it is not the user exploring
    // the map. Leaflet fires "resize" before the debounced "moveend".
    map.on("resize", () => {
      programmaticMoveRef.current = true;
    });

    map.on("move", () => {
      if (selectedIdRef.current) setViewVersion((v) => v + 1);
    });

    map.on("moveend", () => {
      if (selectedIdRef.current) setViewVersion((v) => v + 1);
      const current = readSearchBounds(map);

      if (programmaticMoveRef.current) {
        programmaticMoveRef.current = false;
        searchedBoundsRef.current = current;
        return;
      }

      const previous = searchedBoundsRef.current;
      const zoom = map.getZoom();
      if (
        previous &&
        boundsShiftRatio(previous, current, (lat, lng) =>
          map.project([lat, lng], zoom),
        ) <= MAP_SEARCH_MIN_SHIFT
      ) {
        return;
      }

      if (!latest.current.autoSearch) {
        setAreaChanged(true);
        return;
      }

      searchTimerRef.current = window.setTimeout(() => {
        searchedBoundsRef.current = current;
        latest.current.onSearchArea?.(current);
      }, MAP_SEARCH_DEBOUNCE_MS);
    });

    mapRef.current = map;
    const markers = markersRef.current;

    return () => {
      window.clearTimeout(searchTimerRef.current);
      map.remove();
      mapRef.current = null;
      markers.clear();
      fittedKeyRef.current = null;
      searchedBoundsRef.current = undefined;
    };
  }, []);

  // ── Follow a map area that did not come from this map (link, Back) ───────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !searchBounds) return;
    if (sameBounds(searchBounds, searchedBoundsRef.current)) return;

    programmaticMoveRef.current = true;
    map.fitBounds(
      [
        [searchBounds.swLat, searchBounds.swLng],
        [searchBounds.neLat, searchBounds.neLng],
      ],
      { padding: [MAP_SEARCH_PADDING_PX, MAP_SEARCH_PADDING_PX], animate: false },
    );
    // Values, not the object: a new object with the same edges is no move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchBounds?.neLat,
    searchBounds?.neLng,
    searchBounds?.swLat,
    searchBounds?.swLng,
  ]);

  // ── Fit to the results of a new, non-map search ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || loading || searchBounds || fittedKeyRef.current === fitKey) {
      return;
    }
    if (pins.length === 0) return;

    fittedKeyRef.current = fitKey;
    programmaticMoveRef.current = true;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], DEFAULT_ZOOM + 2, {
        animate: false,
      });
    } else {
      map.fitBounds(
        pins.map((pin) => [pin.lat, pin.lng] as [number, number]),
        { padding: [50, 50], maxZoom: 15, animate: false },
      );
    }
  }, [pins, loading, searchBounds, fitKey]);

  // ── Add / update / remove markers ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const incoming = new Set<string>();
    for (const pin of pins) {
      incoming.add(pin.id);
      const signature = `${pin.full}|${pin.price}|${pin.currency}`;
      const existing = markersRef.current.get(pin.id);

      if (existing?.signature === signature) {
        existing.marker.setLatLng([pin.lat, pin.lng]);
        continue;
      }
      if (existing) map.removeLayer(existing.marker);

      const marker = L.marker([pin.lat, pin.lng], {
        icon: buildIcon(pin),
        keyboard: true,
      });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedId((current) => (current === pin.id ? null : pin.id));
      });
      marker.on("mouseover", () => latest.current.onPropertyHover?.(pin.id));
      marker.on("mouseout", () => latest.current.onPropertyHover?.(null));
      marker.addTo(map);
      marker
        .getElement()
        ?.setAttribute(
          "aria-label",
          `${pin.title}, ${pin.price.toLocaleString()} ${pin.currency}`,
        );
      markersRef.current.set(pin.id, { marker, signature, full: pin.full });
    }

    for (const [id, { marker }] of markersRef.current) {
      if (!incoming.has(id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    }
  }, [pins]);

  // ── Hover / selection styling ────────────────────────────────────────────
  useEffect(() => {
    for (const [id, { marker, full }] of markersRef.current) {
      const selected = id === selectedId;
      const hovered = id === hoveredPropertyId;
      const bubble = marker.getElement()?.firstElementChild;
      bubble?.classList.toggle("selected", selected);
      bubble?.classList.toggle("highlighted", hovered && !selected);
      marker.setZIndexOffset(
        selected ? 2000 : hovered ? 1000 : full ? 100 : 0,
      );
    }
  }, [pins, hoveredPropertyId, selectedId]);

  const searchCurrentArea = () => {
    const map = mapRef.current;
    if (!map) return;
    const current = readSearchBounds(map);
    searchedBoundsRef.current = current;
    setAreaChanged(false);
    onSearchArea?.(current);
  };

  const toggleAutoSearch = (enabled: boolean) => {
    setAutoSearch(enabled);
    if (enabled && areaChanged) searchCurrentArea();
  };

  // Keep the preview card next to its pin; hide it while the pin is off-map.
  const selectedPin = pins.find((pin) => pin.id === selectedId) ?? null;
  let popupPos: { left: number; top: number } | null = null;
  const map = mapRef.current;
  if (selectedPin && map) {
    const point = map.latLngToContainerPoint([selectedPin.lat, selectedPin.lng]);
    const size = map.getSize();
    if (point.x >= 0 && point.y >= 0 && point.x <= size.x && point.y <= size.y) {
      popupPos = clampPopupPos(point.x, point.y, size.x, size.y);
    }
  }

  return (
    <div
      className="property-map-container"
      role="region"
      aria-label={t.properties.mapRegionLabel.replace(
        "{{count}}",
        String(pins.length),
      )}
    >
      <div ref={containerRef} className="property-map" />

      <div className="map-search-controls">
        {areaChanged && !autoSearch ? (
          <button
            type="button"
            className="map-search-area-btn"
            onClick={searchCurrentArea}
          >
            {t.properties.searchThisArea}
          </button>
        ) : (
          <label className="map-search-toggle">
            <input
              type="checkbox"
              checked={autoSearch}
              onChange={(e) => toggleAutoSearch(e.target.checked)}
            />
            {t.properties.searchAsMapMoves}
          </label>
        )}
      </div>

      {loading && (
        <div className="map-loading-pill" role="status">
          {t.properties.mapUpdating}
        </div>
      )}

      {selectedPin && popupPos && (
        <PropertyPopupCard
          pin={selectedPin}
          pos={popupPos}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
