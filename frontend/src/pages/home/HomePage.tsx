// ===========================================
// SmartProperty - Home Page
// ===========================================

import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { HomeFooter, Navbar } from "@/components/layout";
import { Reveal } from "@/components/motion/Reveal";
import { AI_FEATURES_ENABLED } from "@/config/features";
import { useReveal } from "@/hooks/useReveal";
import { useTranslation } from "@/i18n";
import { propertyService } from "@/services/property.service";
import { useAuthStore, usePreferencesStore } from "@/store";
import { UserRole } from "@/types/auth";
import type { Property } from "@/types/property";

import "../../styles/motion.css";
import { ListingCard } from "@/components/properties/ListingCard";
import {
  PRICE_BANDS,
  buildHomeSearchParams,
  formatPriceBand,
  topCities,
  type CityCount,
  type ListingMode,
} from "./homeSearch";
import "./home.css";

/** Delay for the page-load entrance sequence (see motion.css). */
const enterDelay = (ms: number) =>
  ({ "--enter-delay": `${ms}ms` }) as CSSProperties;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const ArrowIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

function SectionHeader({
  id,
  eyebrow,
  title,
  subtitle,
  action,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <Reveal as="header" stagger className="section-head-text">
        <p className="section-eyebrow">{eyebrow}</p>
        <h2 id={id} className="section-heading">
          {title}
        </h2>
        {subtitle && <p className="section-lede">{subtitle}</p>}
      </Reveal>
      {action && (
        <Reveal variant="fade" delay={200} className="section-head-action">
          {action}
        </Reveal>
      )}
    </div>
  );
}

function ListingGrid({ properties }: { properties: Property[] }) {
  return (
    <Reveal as="ul" stagger className="listing-grid">
      {properties.map((property) => (
        <li key={property.id || property._id}>
          <ListingCard property={property} />
        </li>
      ))}
    </Reveal>
  );
}

/** Space-reserving placeholders, so the grid does not jump when data lands. */
function ListingSkeletons({ label }: { label: string }) {
  return (
    <div className="listing-grid" role="status" aria-label={label}>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="listing-skeleton" aria-hidden="true">
          <div className="listing-skeleton-media" />
          <div className="listing-skeleton-line" />
          <div className="listing-skeleton-line listing-skeleton-line--short" />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const currentUserPreferences = usePreferencesStore((state) =>
    user?.id ? state.getUserPreferences(user.id) : undefined,
  );
  const mainContentRef = useRef<HTMLElement>(null);

  // Search
  const [mode, setMode] = useState<ListingMode>("sale");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [rooms, setRooms] = useState("");
  const [price, setPrice] = useState("");

  // Listings
  const [latest, setLatest] = useState<Property[]>([]);
  const [latestLoading, setLatestLoading] = useState(true);
  const [rentalProperties, setRentalProperties] = useState<Property[]>([]);
  const [showBestMatch, setShowBestMatch] = useState(false);
  const [rentalLoading, setRentalLoading] = useState(true);
  const [rentalError, setRentalError] = useState<string | null>(null);

  // Cities come from the listings themselves, loaded as the section nears.
  const [cities, setCities] = useState<CityCount[]>([]);
  const [citiesLoaded, setCitiesLoaded] = useState(false);
  const citiesInView = useReveal<HTMLElement>({
    threshold: 0,
    rootMargin: "300px",
  });

  useEffect(() => {
    if (!citiesInView.revealed) return;
    let cancelled = false;
    propertyService
      .getProperties({ page: 1, limit: 100 })
      .then((response) => {
        if (cancelled) return;
        const listings = response.properties ?? [];
        setCities(topCities(listings, response.total ?? listings.length));
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setCitiesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [citiesInView.revealed]);

  // Personalised rentals load only once their section is close to view.
  const rentalsInView = useReveal<HTMLElement>({
    threshold: 0,
    rootMargin: "300px",
  });

  useEffect(() => {
    let cancelled = false;
    propertyService
      .getProperties({ page: 1, limit: 4 })
      .then((response) => {
        if (!cancelled) setLatest(response.properties ?? []);
      })
      .catch(() => {
        if (!cancelled) setLatest([]);
      })
      .finally(() => {
        if (!cancelled) setLatestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user || !rentalsInView.revealed) return;

    const fetchRentals = async () => {
      try {
        setRentalLoading(true);
        setRentalError(null);

        const preferencesCompleted =
          !!currentUserPreferences?.completed || !!user?.preferences?.completed;

        const canUsePreferences =
          isAuthenticated &&
          user?.role === UserRole.TENANT &&
          !!user?.id &&
          preferencesCompleted &&
          // Best-match comes from ai-services; without it the regular feed shows.
          AI_FEATURES_ENABLED;

        setShowBestMatch(canUsePreferences);

        if (canUsePreferences) {
          try {
            const recommendationResponse =
              await propertyService.getBestMatchRecommendations(6);
            const recommended = (recommendationResponse.recommendations || [])
              .map((item) => item.property)
              .filter(Boolean);

            if (recommended.length > 0) {
              setRentalProperties(recommended);
              return;
            }
          } catch {
            // Fall back to the regular rental feed.
          }
        }

        const budgetRange = currentUserPreferences?.budgetRange;
        const hasBudgetRange =
          canUsePreferences &&
          Array.isArray(budgetRange) &&
          budgetRange.length === 2;

        const response = await propertyService.getProperties({
          status: "available",
          category: "rental",
          limit: 4,
          minPrice: hasBudgetRange ? budgetRange[0] : undefined,
          maxPrice: hasBudgetRange ? budgetRange[1] : undefined,
        });
        setRentalProperties(response.properties || []);
      } catch (err) {
        console.error("Failed to fetch rental properties:", err);
        setRentalError(t.home.unableToLoad);
      } finally {
        setRentalLoading(false);
      }
    };
    void fetchRentals();
  }, [
    currentUserPreferences,
    isAuthenticated,
    user,
    rentalsInView.revealed,
    t,
  ]);

  const changeMode = (next: ListingMode) => {
    setMode(next);
    // Sale and rent bands differ; a band from the other mode means nothing.
    setPrice("");
  };

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const params = buildHomeSearchParams({
        mode,
        location,
        type: propertyType,
        rooms,
        price,
      });
      navigate(`/properties?${params.toString()}`);
    },
    [mode, location, propertyType, rooms, price, navigate],
  );

  const scrollToContent = useCallback((focus = false) => {
    const main = mainContentRef.current;
    if (!main) return;
    main.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
    if (focus) main.focus({ preventScroll: true });
  }, []);

  const priceLabels = { upTo: t.home.priceUpTo, currency: t.home.currency };

  return (
    <div className="home-page">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          scrollToContent(true);
        }}
      >
        {t.home.skipToContent}
      </a>

      <Navbar />

      {/* ---------------- Hero ---------------- */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-media enter-settle" aria-hidden="true" />

        <div className="hero-inner">
          <p className="hero-eyebrow enter-rise" style={enterDelay(0)}>
            {t.home.heroEyebrow}
          </p>

          {/* Two real text lines, each sliding up inside its own mask. */}
          <h1 id="hero-title" className="hero-heading">
            <span className="enter-line">
              <span style={enterDelay(90)}>{t.home.heroTitle}</span>
            </span>{" "}
            <span className="enter-line">
              <span className="hero-heading-accent" style={enterDelay(180)}>
                {t.home.heroSubtitle}
              </span>
            </span>
          </h1>

          <p className="hero-lede enter-rise" style={enterDelay(320)}>
            {t.home.heroLede}
          </p>

          <form
            className="hero-search enter-rise"
            style={enterDelay(420)}
            onSubmit={handleSearch}
            role="search"
            aria-label={t.home.searchNow}
          >
            <div
              className="search-mode"
              role="group"
              aria-label={t.home.modeLabel}
            >
              {(["sale", "rent"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className="search-mode-btn"
                  aria-pressed={mode === value}
                  onClick={() => changeMode(value)}
                >
                  {value === "sale" ? t.home.modeBuy : t.home.modeRent}
                </button>
              ))}
            </div>

            <div className="search-fields">
              <div className="search-field search-field--location">
                <label htmlFor="search-location">{t.home.fieldLocation}</label>
                <input
                  id="search-location"
                  type="text"
                  autoComplete="off"
                  placeholder={t.home.locationPlaceholder}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="search-field">
                <label htmlFor="search-type">{t.home.fieldType}</label>
                <select
                  id="search-type"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                >
                  <option value="">{t.home.allProperties}</option>
                  <option value="apartment">{t.home.apartment}</option>
                  <option value="house">{t.home.house}</option>
                  <option value="villa">{t.home.villa}</option>
                  <option value="studio">{t.home.studio}</option>
                </select>
              </div>

              <div className="search-field">
                <label htmlFor="search-rooms">{t.home.fieldRooms}</label>
                <select
                  id="search-rooms"
                  value={rooms}
                  onChange={(e) => setRooms(e.target.value)}
                >
                  <option value="">{t.home.anyRooms}</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </div>

              <div className="search-field">
                <label htmlFor="search-price">
                  {mode === "rent"
                    ? t.home.fieldMonthlyBudget
                    : t.home.fieldBudget}
                </label>
                <select
                  id="search-price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                >
                  <option value="">{t.home.anyPrice}</option>
                  {PRICE_BANDS[mode].map((band) => (
                    <option key={band.value} value={band.value}>
                      {formatPriceBand(band, priceLabels)}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="search-submit">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                {t.home.searchNow}
              </button>
            </div>
          </form>

          <div className="hero-secondary enter-rise" style={enterDelay(520)}>
            <Link to="/properties" className="text-link">
              {t.home.browseAllListings}
              <ArrowIcon />
            </Link>
            <ul className="hero-proof" aria-label={t.home.proofLabel}>
              <li>{t.home.proofApplications}</li>
              <li>{t.home.proofVerification}</li>
              <li>{t.home.proofVirtualVisits}</li>
            </ul>
          </div>
        </div>

        <button
          type="button"
          className="scroll-cue enter-rise"
          style={enterDelay(900)}
          onClick={() => scrollToContent()}
        >
          <span>{t.home.scrollCue}</span>
          <span className="scroll-cue-line" aria-hidden="true" />
        </button>
      </section>

      <main id="main-content" ref={mainContentRef} tabIndex={-1}>
        {/* ---------------- Newly listed ---------------- */}
        <section className="home-section" aria-labelledby="latest-title">
          <div className="home-container">
            <SectionHeader
              id="latest-title"
              eyebrow={t.home.latestEyebrow}
              title={t.home.latestTitle}
              subtitle={t.home.latestSubtitle}
              action={
                <Link to="/properties" className="button-secondary">
                  {t.home.viewAllProperties}
                  <ArrowIcon />
                </Link>
              }
            />
            {latestLoading ? (
              <ListingSkeletons label={t.home.loadingProperties} />
            ) : latest.length > 0 ? (
              <ListingGrid properties={latest} />
            ) : (
              <p className="section-empty">{t.home.noProperties}</p>
            )}
          </div>
        </section>

        {/* ---------------- Rentals, signed-in users only ---------------- */}
        {user && (
          <section
            ref={rentalsInView.ref}
            className="home-section home-section--tinted"
            aria-labelledby="rent-title"
          >
            <div className="home-container">
              <SectionHeader
                id="rent-title"
                eyebrow={t.home.forRent}
                title={
                  showBestMatch ? t.home.bestMatchTitle : t.home.recentRentTitle
                }
                subtitle={
                  showBestMatch
                    ? t.home.bestMatchSubtitle
                    : t.home.recentRentSubtitle
                }
                action={
                  <Link
                    to="/properties?category=rental"
                    className="button-secondary"
                  >
                    {t.home.viewAllRentals}
                    <ArrowIcon />
                  </Link>
                }
              />
              {rentalLoading ? (
                <ListingSkeletons label={t.home.loadingProperties} />
              ) : rentalError || rentalProperties.length === 0 ? (
                <p className="section-empty" aria-live="polite">
                  {rentalError ?? t.home.noRental}{" "}
                  <Link to="/properties" className="text-link">
                    {t.home.browseAll}
                  </Link>
                </p>
              ) : (
                <ListingGrid properties={rentalProperties} />
              )}
            </div>
          </section>
        )}

        {/* ---------------- How it works ---------------- */}
        <section
          className="home-section home-section--steps"
          aria-labelledby="how-title"
        >
          <div className="home-container">
            <SectionHeader
              id="how-title"
              eyebrow={t.home.process}
              title={t.home.howItWorks}
              subtitle={t.home.howItWorksSubtitle}
            />
            <Reveal as="ol" stagger className="steps">
              {[
                [t.home.step1Title, t.home.step1Desc],
                [t.home.step2Title, t.home.step2Desc],
                [t.home.step3Title, t.home.step3Desc],
              ].map(([title, desc], index) => (
                <li key={title} className="step">
                  <span className="step-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="step-title">{title}</h3>
                  <p className="step-text">{desc}</p>
                </li>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ---------------- Why SmartProperty ---------------- */}
        <section
          className="home-section home-section--split"
          aria-labelledby="why-title"
        >
          <div className="home-container split">
            <div className="split-text">
              <SectionHeader
                id="why-title"
                eyebrow={t.home.whyUs}
                title={t.home.whyUsTitle}
                subtitle={t.home.whyUsDesc}
              />
              <Reveal as="ul" stagger className="feature-list">
                {[
                  [t.home.why1Title, t.home.why1Desc],
                  [t.home.why2Title, t.home.why2Desc],
                  [t.home.why3Title, t.home.why3Desc],
                ].map(([title, desc]) => (
                  <li key={title} className="feature-item">
                    <span className="feature-mark" aria-hidden="true" />
                    <div>
                      <h3 className="feature-title">{title}</h3>
                      <p className="feature-text">{desc}</p>
                    </div>
                  </li>
                ))}
              </Reveal>
            </div>
            <Reveal variant="scale" className="split-media">
              <picture>
                <source
                  srcSet="/tq_n6jpin4sea-6ofk-1500h.webp"
                  type="image/webp"
                />
                <img
                  src="/tq_n6jpin4sea-6ofk-1500h.png"
                  alt={t.home.whyImageAlt}
                  loading="lazy"
                  decoding="async"
                  width={720}
                  height={540}
                />
              </picture>
            </Reveal>
          </div>
        </section>

        {/* ---------------- Cities (from real listings) ---------------- */}
        {!(citiesLoaded && cities.length === 0) && (
          <section
            ref={citiesInView.ref}
            className="home-section home-section--tinted"
            aria-labelledby="cities-title"
          >
            <div className="home-container">
              <SectionHeader
                id="cities-title"
                eyebrow={t.home.locations}
                title={t.home.exploreCities}
                subtitle={t.home.exploreCitiesSubtitle}
              />
              {cities.length > 0 && (
                <Reveal as="ul" stagger className="city-grid">
                  {cities.map((city) => (
                    <li key={city.name}>
                      <Link
                        to={`/properties?city=${encodeURIComponent(city.name)}`}
                        className="city-card"
                      >
                        <span className="city-card-pin" aria-hidden="true">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                        </span>
                        <span className="city-card-name">{city.name}</span>
                        <span className="city-card-meta">
                          {city.count === undefined
                            ? t.home.cityListings
                            : `${city.count} ${city.count === 1 ? t.home.cityListingOne : t.home.cityListingMany}`}
                          <ArrowIcon size={14} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </Reveal>
              )}
            </div>
          </section>
        )}

        {/* ---------------- Closing call to action ---------------- */}
        <section className="closing-cta" aria-labelledby="cta-title">
          <Reveal stagger className="closing-cta-inner">
            <h2 id="cta-title" className="closing-cta-title">
              {t.home.discoverPlace}
            </h2>
            <p className="closing-cta-text">{t.home.discoverDesc}</p>
            <div className="closing-cta-actions">
              <Link to="/properties" className="button-primary">
                {t.home.viewProperties}
                <ArrowIcon />
              </Link>
              {!user && (
                <Link to="/register" className="button-ghost">
                  {t.home.createAccount}
                </Link>
              )}
            </div>
          </Reveal>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
