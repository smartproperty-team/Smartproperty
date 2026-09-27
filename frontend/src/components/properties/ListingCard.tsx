// ===========================================
// SmartProperty - Listing card
// ===========================================

import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useTranslation } from "../../i18n";
import { listingBadge } from "../../pages/home/homeSearch";
import type { Property } from "../../types/property";
import "./ListingCard.css";

const FALLBACK_IMAGE = "/placeholder-property.svg";

export interface ListingCardProps {
  property: Property;
  /** Let visitors step through the photos with dots. */
  gallery?: boolean;
  /**
   * When to show the listing status: "always" for owners managing their
   * own listings, otherwise only when it is not available.
   */
  showStatus?: "always" | "unavailable";
  /** Page-specific controls under the card: compare, share, remove... */
  actions?: ReactNode;
  /** Emphasise the card, e.g. while its pin is hovered on the map. */
  highlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const PinIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

/**
 * The one card used for listings across the site. The whole card is a
 * single link (the title's ::after stretches over it), so keyboard users
 * get one tab stop per listing; gallery dots and actions sit above that
 * link so they stay clickable.
 *
 * When the property can change in place, give the card a `key` of the
 * property id so the gallery starts again from the first photo.
 */
export function ListingCard({
  property,
  gallery = false,
  showStatus = "unavailable",
  actions,
  highlighted = false,
  onMouseEnter,
  onMouseLeave,
}: ListingCardProps) {
  const t = useTranslation();
  const id = property.id || property._id || "";

  const images = [...(property.images ?? [])].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return (a.order ?? 0) - (b.order ?? 0);
  });
  const [selected, setSelected] = useState(0);
  const current = images[Math.min(selected, images.length - 1)];
  const image = current?.url ?? FALLBACK_IMAGE;

  const badge = listingBadge(property.category);
  const badgeLabel = {
    sale: t.home.forSale,
    rent: t.home.forRent,
    managed: t.home.managed,
  }[badge];

  const statusLabel: Record<string, string> = {
    available: t.properties.available,
    rented: t.properties.rented,
    maintenance: t.properties.maintenance,
    unlisted: t.properties.unlisted,
  };
  const showStatusBadge =
    !!property.status &&
    (showStatus === "always" || property.status !== "available");

  const typeLabel: Record<string, string> = {
    apartment: t.properties.typeApartment,
    house: t.properties.typeHouse,
    villa: t.properties.typeVilla,
    studio: t.properties.typeStudio,
    condo: t.properties.typeCondo,
    land: t.properties.typeLand,
    office: t.home.office,
  };

  const place = property.address
    ? [property.address.city, property.address.country]
        .filter(Boolean)
        .join(", ")
    : "";
  const { bedrooms = 0, bathrooms = 0, area = 0 } = property.features ?? {};

  return (
    <article
      className={`listing-card${highlighted ? " listing-card--highlighted" : ""}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="listing-card-media">
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          width={640}
          height={480}
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
          }}
        />
        <span className={`listing-badge listing-badge--${badge}`}>
          {badgeLabel}
        </span>
        {showStatusBadge && (
          <span className={`listing-status listing-status--${property.status}`}>
            {statusLabel[property.status] ?? property.status}
          </span>
        )}
        {gallery && images.length > 1 && (
          <div className="listing-card-dots">
            {images.map((img, index) => (
              <button
                key={img.url + index}
                type="button"
                className="listing-card-dot"
                aria-label={`${property.title}: photo ${index + 1} of ${images.length}`}
                aria-pressed={current === img}
                onClick={() => setSelected(index)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="listing-card-body">
        <p className="listing-price">
          {property.price.toLocaleString()} {property.currency}
          {badge === "rent" && (
            <span className="listing-price-unit">{t.home.month}</span>
          )}
        </p>
        <h3 className="listing-title">
          <Link to={`/properties/${id}`} className="listing-link">
            {property.title}
          </Link>
        </h3>
        {place && (
          <p className="listing-place">
            <PinIcon />
            <span className="sr-only">{t.home.location}: </span>
            {place}
          </p>
        )}
        <dl className="listing-meta">
          {property.type && (
            <div>
              <dt className="sr-only">{t.properties.typeLabel}</dt>
              <dd>{typeLabel[property.type] ?? property.type}</dd>
            </div>
          )}
          {bedrooms > 0 && (
            <div>
              <dt className="sr-only">{t.home.beds}</dt>
              <dd>
                {bedrooms} {t.home.beds}
              </dd>
            </div>
          )}
          {bathrooms > 0 && (
            <div>
              <dt className="sr-only">{t.home.baths}</dt>
              <dd>
                {bathrooms} {t.home.baths}
              </dd>
            </div>
          )}
          {area > 0 && (
            <div>
              <dt className="sr-only">{t.home.sqft}</dt>
              <dd>
                {area} {t.home.sqft}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {actions && <div className="listing-card-actions">{actions}</div>}
    </article>
  );
}
