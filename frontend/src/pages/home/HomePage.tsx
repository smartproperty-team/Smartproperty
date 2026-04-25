// ===========================================
// SmartProperty - Home Page
// Accessible Real Estate Template
// WCAG 2.1 AA Compliant
// ===========================================

import { HomeFooter, Navbar } from "@/components/layout";
import { useTranslation } from "@/i18n";
import { propertyService } from "@/services/property.service";
import type { Property as BackendProperty } from "@/types/property";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./home3.css";

// City data - Famous cities in Tunisia
const cities = [
  { name: "Tunis", properties: 245, image: "/tq_bdn30ebwk5-m0bm-1500h.png" },
  { name: "Sousse", properties: 178, image: "/tq_brzn8uwaca-vatm-1500h.png" },
  { name: "Sfax", properties: 156, image: "/tq_eg61ro6xoc-8z2e-1500h.png" },
  { name: "Hammamet", properties: 134, image: "/tq_ev3u-afbuo-tv-1500h.png" },
  { name: "Djerba", properties: 98, image: "/tq_fqz__chb9i-7br-1500h.png" },
];

// Property Card Component - Accessible
function PropertyCard({ property }: { property: BackendProperty }) {
  const t = useTranslation();
  const propertyId = property.id || property._id || "";
  const primaryImage =
    property.images?.find((img) => img.isPrimary) || property.images?.[0];
  const imageUrl = primaryImage?.url || "/placeholder-property.svg";
  const listingType = property.status === "rented" ? "rent" : "sale";
  const formattedPrice = `${property.price.toLocaleString()} ${property.currency}`;
  const showMonthly = listingType === "rent";

  return (
    <article
      className="property-card"
      aria-label={`${property.title} - ${formattedPrice}${showMonthly ? `/${t.home.month}` : ""}`}
    >
      <div className="property-card-image">
        <img
          src={imageUrl}
          alt={`${property.title} at ${property.address.city}, ${property.address.country}`}
          loading="lazy"
          width={400}
          height={220}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder-property.svg";
          }}
        />
        <span
          className={`property-badge ${listingType}`}
          aria-label={listingType === "sale" ? t.home.forSale : t.home.forRent}
        >
          {listingType === "sale" ? t.home.forSale : t.home.forRent}
        </span>
        {property.status === "available" && (
          <span className="property-featured" aria-label={t.home.featured}>
            {t.home.featured}
          </span>
        )}
      </div>
      <div className="property-card-content">
        <h3 className="property-title">{property.title}</h3>
        <p className="property-address">
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
          <span className="sr-only">Location: </span>
          {property.address.city}, {property.address.country}
        </p>
        <dl className="property-meta" aria-label="Property details">
          <div className="meta-item">
            <dt className="sr-only">{t.home.beds}</dt>
            <dd>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
                <path d="M21 7H3l2-4h14l2 4z" />
              </svg>
              {property.features?.bedrooms ?? 0} {t.home.beds}
            </dd>
          </div>
          <div className="meta-item">
            <dt className="sr-only">{t.home.baths}</dt>
            <dd>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z" />
                <path d="M6 12V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7" />
              </svg>
              {property.features?.bathrooms ?? 0} {t.home.baths}
            </dd>
          </div>
          <div className="meta-item">
            <dt className="sr-only">{t.home.sqft}</dt>
            <dd>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              {property.features?.area ?? 0} {t.home.sqft}
            </dd>
          </div>
        </dl>
        <div className="property-price">
          <span className="price" aria-label="Price">
            {formattedPrice}
          </span>
          {showMonthly && <span className="price-unit">/{t.home.month}</span>}
        </div>
        <Link
          to={`/properties/${propertyId}`}
          className="property-link"
          aria-label={`View details for ${property.title}`}
        >
          {t.home.viewDetails}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

// City Card Component - Accessible
function CityCard({ city }: { city: (typeof cities)[0] }) {
  return (
    <Link
      to={`/properties?city=${encodeURIComponent(city.name)}`}
      className="city-card"
      aria-label={`Browse ${city.properties} properties in ${city.name}`}
    >
      <img src={city.image} alt={`${city.name} cityscape`} loading="lazy" width={400} height={300} />
      <div className="city-overlay">
        <h4>{city.name}</h4>
        <span>{city.properties} Properties</span>
      </div>
    </Link>
  );
}

// Rental Property Card (from backend data)
function RentalPropertyCard({ property }: { property: BackendProperty }) {
  const t = useTranslation();
  const address = property.address
    ? `${property.address.city}, ${property.address.country}`
    : "Location unavailable";
  const beds = property.features?.bedrooms ?? 0;
  const baths = property.features?.bathrooms ?? 0;
  const sqft = property.features?.area ?? 0;
  const primaryImage =
    property.images?.find((img) => img.isPrimary)?.url ??
    property.images?.[0]?.url ??
    "/tq_1s1jvryd0n-ta2j-1500h.png";
  const price = `${property.price.toLocaleString()} ${property.currency}`;

  return (
    <article
      className="property-card"
      aria-label={`${property.title} - ${price}/month`}
    >
      <div className="property-card-image">
        <img
          src={primaryImage}
          alt={property.title}
          loading="lazy"
          width={400}
          height={220}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              "/tq_1s1jvryd0n-ta2j-1500h.png";
          }}
        />
        <span className="property-badge rent" aria-label={t.home.forRent}>
          {t.home.forRent}
        </span>
      </div>
      <div className="property-card-content">
        <h3 className="property-title">{property.title}</h3>
        <p className="property-address">
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
          <span className="sr-only">Location: </span>
          {address}
        </p>
        <dl className="property-meta" aria-label="Property details">
          <div className="meta-item">
            <dt className="sr-only">{t.home.beds}</dt>
            <dd>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
                <path d="M21 7H3l2-4h14l2 4z" />
              </svg>
              {beds} {t.home.beds}
            </dd>
          </div>
          <div className="meta-item">
            <dt className="sr-only">{t.home.baths}</dt>
            <dd>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z" />
                <path d="M6 12V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7" />
              </svg>
              {baths} {t.home.baths}
            </dd>
          </div>
          {sqft > 0 && (
            <div className="meta-item">
              <dt className="sr-only">{t.home.sqft}</dt>
              <dd>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
                {sqft} {t.home.sqft}
              </dd>
            </div>
          )}
        </dl>
        <div className="property-price">
          <span className="price" aria-label="Price">
            {price}
          </span>
          <span className="price-unit">/month</span>
        </div>
        <Link
          to={`/properties/${property.id || property._id}`}
          className="property-link"
          aria-label={`View details for ${property.title}`}
        >
          {t.home.viewDetails}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

export default function HomePage() {
  const t = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"sale" | "rent">("sale");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [properties, setProperties] = useState<BackendProperty[]>([]);
  const mainContentRef = useRef<HTMLElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [rentalProperties, setRentalProperties] = useState<BackendProperty[]>(
    [],
  );
  const [rentalLoading, setRentalLoading] = useState(true);
  const [rentalError, setRentalError] = useState<string | null>(null);

  // Debounced search input handler (INP optimization - reduces re-renders)
  const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 300);
  }, []);

  // Fetch rental properties from backend
  useEffect(() => {
    const fetchRentals = async () => {
      try {
        setRentalLoading(true);
        setRentalError(null);
        const response = await propertyService.getProperties({
          status: "available",
          limit: 6,
        });
        // Filter for rented/available properties — show all available since status is 'available'
        setRentalProperties(response.properties || []);
      } catch (err) {
        console.error("Failed to fetch rental properties:", err);
        setRentalError("Unable to load properties at the moment.");
      } finally {
        setRentalLoading(false);
      }
    };
    fetchRentals();
  }, []);

  useEffect(() => {
    const loadHomeProperties = async () => {
      try {
        const response = await propertyService.getProperties({
          page: 1,
          limit: 12,
        });
        setProperties(response.properties ?? []);
      } catch {
        setProperties([]);
      }
    };

    void loadHomeProperties();
  }, []);

  const bestDealProperties = properties.slice(0, 4);

  // Handle search form submission
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      // Navigate to search results
      const params = new URLSearchParams();
      params.set("listingType", activeTab);
      if (propertyType) params.set("type", propertyType);
      if (searchQuery) params.set("search", searchQuery);
      if (roomFilter) params.set("bedrooms", roomFilter);
      if (priceFilter) params.set("priceRange", priceFilter);
      navigate(`/properties?${params.toString()}`);
    },
    [activeTab, priceFilter, propertyType, roomFilter, searchQuery],
  );

  // Skip to main content
  const skipToMain = useCallback(() => {
    mainContentRef.current?.focus();
    mainContentRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="home-page">
      {/* Skip to Content Link - Accessibility */}
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          skipToMain();
        }}
      >
        Skip to main content
      </a>

      <Navbar />

      {/* Hero Section */}
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-content">
          <p className="hero-kicker">{t.home.featured}</p>
          <h1 id="hero-title" className="hero-title">
            <span className="hero-title-line">{t.home.heroTitle}</span>
            <span className="hero-title-secondary">{t.home.heroSubtitle}</span>
          </h1>

          {/* Search Tabs */}
          <div
            className="search-tabs-standalone"
            role="tablist"
            aria-label="Property type"
          >
            <button
              className={`search-tab-btn ${activeTab === "sale" ? "active" : ""}`}
              onClick={() => setActiveTab("sale")}
              role="tab"
              aria-selected={activeTab === "sale"}
              aria-controls="search-panel"
              id="tab-sale"
            >
              {t.home.forBuy}
            </button>
            <button
              className={`search-tab-btn ${activeTab === "rent" ? "active" : ""}`}
              onClick={() => setActiveTab("rent")}
              role="tab"
              aria-selected={activeTab === "rent"}
              aria-controls="search-panel"
              id="tab-rent"
            >
              {t.home.forRent}
            </button>
          </div>

          {/* Search Box */}
          <form
            className="search-box"
            onSubmit={handleSearch}
            role="search"
            aria-label="Property search"
            id="search-panel"
          >
            <fieldset className="search-box-inner">
              <legend className="sr-only">Property search filters</legend>
              <div className="search-field location-field">
                <label htmlFor="search-location" className="sr-only">
                  Location
                </label>
                <input
                  id="search-location"
                  type="text"
                  placeholder={t.home.locationPlaceholder}
                  value={searchInput}
                  onChange={handleSearchInput}
                  aria-label="Enter location"
                />
              </div>

              <div className="search-field select-field all-properties-field">
                <label htmlFor="property-type" className="sr-only">
                  Property type
                </label>
                <select
                  id="property-type"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  aria-label="Select property type"
                >
                  <option value="">{t.home.allProperties}</option>
                  <option value="apartment">{t.home.apartment}</option>
                  <option value="house">{t.home.house}</option>
                  <option value="villa">{t.home.villa}</option>
                  <option value="office">{t.home.office}</option>
                </select>
              </div>

              <div className="search-field select-field room-field">
                <label htmlFor="room-filter" className="sr-only">
                  Rooms
                </label>
                <select
                  id="room-filter"
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  aria-label="Select room count"
                >
                  <option value="">{t.home.room}</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5+</option>
                </select>
              </div>

              <div className="search-field select-field price-field">
                <label htmlFor="price-filter" className="sr-only">
                  Price range
                </label>
                <select
                  id="price-filter"
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  aria-label="Select price range"
                >
                  <option value="">{t.home.anyPrice}</option>
                  <option value="0-200000">$0 - $200,000</option>
                  <option value="200000-500000">$200,000 - $500,000</option>
                  <option value="500000-1000000">$500,000 - $1,000,000</option>
                  <option value="1000000+">$1,000,000+</option>
                </select>
              </div>

              <button type="submit" className="search-button">
                <span>{t.home.searchNow}</span>
              </button>
            </fieldset>
          </form>
        </div>
        <div className="hero-cityscape" aria-hidden="true"></div>
      </section>

      {/* Main Content */}
      <main id="main-content" ref={mainContentRef} tabIndex={-1}>
        {" "}
        {/* Best Deals Section */}
        <section className="properties-section" aria-labelledby="deals-title">
          <div className="section-container">
            <header className="section-header">
              <span className="section-tag">{t.home.featured}</span>
              <h2 id="deals-title" className="section-title">
                {t.home.bestDeals}
              </h2>
              <p className="section-subtitle">{t.home.bestDealsSubtitle}</p>
            </header>
            {bestDealProperties.length > 0 ? (
              <div className="properties-grid" role="list">
                {bestDealProperties.map((property) => (
                  <PropertyCard
                    key={property.id || property._id}
                    property={property}
                  />
                ))}
              </div>
            ) : (
              <p className="section-subtitle">{t.home.noProperties}</p>
            )}
            <div className="section-cta">
              <Link to="/properties" className="view-all-btn">
                {t.home.viewAllProperties}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
        {/* Explore Cities */}
        <section className="cities-section" aria-labelledby="cities-title">
          <div className="section-container">
            <header className="section-header">
              <span className="section-tag">{t.home.locations}</span>
              <h2 id="cities-title" className="section-title">
                {t.home.exploreCities}
              </h2>
              <p className="section-subtitle">{t.home.exploreCitiesSubtitle}</p>
            </header>
            <div className="cities-grid" role="list">
              {cities.map((city) => (
                <CityCard key={city.name} city={city} />
              ))}
            </div>
          </div>
        </section>
        {/* Recent Properties for Rent */}
        <section
          className="properties-section bg-light"
          aria-labelledby="rent-title"
        >
          <div className="section-container">
            <header className="section-header">
              <span className="section-tag">{t.home.forRent}</span>
              <h2 id="rent-title" className="section-title">
                {t.home.recentRentTitle}
              </h2>
              <p className="section-subtitle">{t.home.recentRentSubtitle}</p>
            </header>
            {rentalLoading ? (
              <div
                className="flex justify-center items-center py-16"
                aria-live="polite"
                aria-label="Loading rental properties"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-600 text-sm">
                    {t.home.loadingProperties}
                  </p>
                </div>
              </div>
            ) : rentalError ? (
              <div
                className="flex flex-col items-center justify-center py-16 gap-3"
                aria-live="polite"
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-gray-400"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
                <p className="text-gray-600">{rentalError}</p>
                <Link
                  to="/properties"
                  className="text-emerald-700 hover:underline text-sm font-medium"
                >
                  {t.home.browseAll}
                </Link>
              </div>
            ) : rentalProperties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <p className="text-gray-600">{t.home.noRental}</p>
                <Link
                  to="/properties"
                  className="text-emerald-700 hover:underline text-sm font-medium"
                >
                  {t.home.browseAll}
                </Link>
              </div>
            ) : (
              <>
                <div className="properties-grid" role="list">
                  {rentalProperties.map((property) => (
                    <RentalPropertyCard
                      key={property.id || property._id}
                      property={property}
                    />
                  ))}
                </div>
                <div className="section-cta">
                  <Link to="/properties" className="view-all-btn">
                    {t.home.viewAllRentals}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
        {/* How It Works */}
        <section className="how-it-works-section" aria-labelledby="how-title">
          <div className="section-container">
            <header className="section-header">
              <span className="section-tag">{t.home.process}</span>
              <h2 id="how-title" className="section-title">
                {t.home.howItWorks}
              </h2>
              <p className="section-subtitle">{t.home.howItWorksSubtitle}</p>
            </header>
            <ol className="steps-grid">
              <li className="step-card">
                <div className="step-number" aria-hidden="true">
                  01
                </div>
                <div className="step-icon" aria-hidden="true">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <h3>{t.home.step1Title}</h3>
                <p>{t.home.step1Desc}</p>
              </li>
              <li className="step-card">
                <div className="step-number" aria-hidden="true">
                  02
                </div>
                <div className="step-icon" aria-hidden="true">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3>{t.home.step2Title}</h3>
                <p>{t.home.step2Desc}</p>
              </li>
              <li className="step-card">
                <div className="step-number" aria-hidden="true">
                  03
                </div>
                <div className="step-icon" aria-hidden="true">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m15 5 4 4" />
                    <path d="M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13" />
                    <path d="m8 6 2-2" />
                    <path d="m2 22 5.5-1.5L21 7l-4-4L3.5 16.5 2 22z" />
                    <path d="m18 15 4 4" />
                    <path d="M15 18 3 6" />
                  </svg>
                </div>
                <h3>{t.home.step3Title}</h3>
                <p>{t.home.step3Desc}</p>
              </li>
            </ol>
          </div>
        </section>
        {/* CTA Section */}
        <section className="cta-section" aria-labelledby="cta-title">
          <div className="cta-content">
            <h2 id="cta-title">{t.home.discoverPlace}</h2>
            <p>{t.home.discoverDesc}</p>
            <Link to="/properties" className="cta-button">
              {t.home.viewProperties}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
        {/* Why Work With Us */}
        <section className="why-us-section" aria-labelledby="why-title">
          <div className="section-container">
            <div className="why-us-content">
              <span className="section-tag">{t.home.whyUs}</span>
              <h2 id="why-title">{t.home.whyUsTitle}</h2>
              <p className="why-us-description">{t.home.whyUsDesc}</p>
              <ul className="why-us-features" role="list">
                <li className="feature">
                  <div className="feature-icon" aria-hidden="true">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div>
                    <h4>{t.home.buyOrRent}</h4>
                    <p>{t.home.buyOrRentDesc}</p>
                  </div>
                </li>
                <li className="feature">
                  <div className="feature-icon" aria-hidden="true">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div>
                    <h4>{t.home.trustedTitle}</h4>
                    <p>{t.home.trustedDesc}</p>
                  </div>
                </li>
              </ul>
              <Link to="/about" className="learn-more-btn">
                {t.home.learnMore}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="why-us-image">
              <img
                src="/tq_n6jpin4sea-6ofk-1500h.png"
                alt="Happy family in their new home"
                loading="lazy"
                width={600}
                height={400}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Newsletter */}
      <section
        className="newsletter-section"
        aria-labelledby="newsletter-title"
      >
        <div className="newsletter-container">
          <h3 id="newsletter-title">{t.home.newsletter}</h3>
          <p>{t.home.newsletterDesc}</p>
          <form
            className="newsletter-form"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Newsletter subscription"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              {t.home.emailPlaceholder}
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder={t.home.emailPlaceholder}
              required
              aria-required="true"
            />
            <button type="submit">{t.home.subscribe}</button>
          </form>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}
