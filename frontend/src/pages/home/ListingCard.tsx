// ===========================================
// SmartProperty - Home listing card
// ===========================================

import { Link } from "react-router-dom";

import { useTranslation } from "../../i18n";
import type { Property } from "../../types/property";
import { listingBadge } from "./homeSearch";

const FALLBACK_IMAGE = "/placeholder-property.svg";

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
 * One card for every listing on the home page. The whole card is a single
 * link (the title's ::after stretches over it), so keyboard users get one
 * tab stop per listing and screen readers hear the title as the link name.
 */
export function ListingCard({ property }: { property: Property }) {
  const t = useTranslation();
  const id = property.id || property._id || "";
  const image =
    property.images?.find((img) => img.isPrimary)?.url ??
    property.images?.[0]?.url ??
    FALLBACK_IMAGE;
  const badge = listingBadge(property.category);
  const badgeLabel = {
    sale: t.home.forSale,
    rent: t.home.forRent,
    managed: t.home.managed,
  }[badge];
  const place = property.address
    ? [property.address.city, property.address.country]
        .filter(Boolean)
        .join(", ")
    : "";
  const { bedrooms = 0, bathrooms = 0, area = 0 } = property.features ?? {};

  return (
    <article className="listing-card">
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
    </article>
  );
}
