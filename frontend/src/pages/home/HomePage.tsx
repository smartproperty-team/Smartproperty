// ===========================================
// SmartProperty - Home Page
// Accessible Real Estate Template
// WCAG 2.1 AA Compliant
// ===========================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HomeFooter, Navbar } from '../../components/layout';
import { propertyService } from '../../services/property.service';
import type { Property as BackendProperty } from '../../types/property';

// Property type for cards
interface Property {
  id: number;
  title: string;
  address: string;
  beds: number;
  baths: number;
  sqft: number;
  price: string;
  priceUnit?: string;
  type: 'sale' | 'rent';
  featured?: boolean;
  image: string;
}

// Sample property data
const properties: Property[] = [
  {
    id: 1,
    title: 'Luxurious Sea View Apartment',
    address: 'La Marsa, Tunis',
    beds: 4,
    baths: 2,
    sqft: 450,
    price: '850,000 TND',
    type: 'sale',
    featured: false,
    image: '/tq_0gdp_lwjwx-pmhk-1500h.png',
  },
  {
    id: 2,
    title: 'Modern Lac 2 Residence',
    address: 'Les Berges du Lac, Tunis',
    beds: 4,
    baths: 2,
    sqft: 400,
    price: '2,500 TND',
    priceUnit: '/month',
    type: 'rent',
    featured: true,
    image: '/tq_1s1jvryd0n-ta2j-1500h.png',
  },
  {
    id: 3,
    title: 'Carthage Heritage Penthouse',
    address: 'Carthage, Tunis',
    beds: 4,
    baths: 2,
    sqft: 450,
    price: '1,200,000 TND',
    type: 'sale',
    featured: true,
    image: '/tq_4mbtfjfs1k-qkmj-1500h.png',
  },
  {
    id: 4,
    title: 'Villa Kantaoui With Pool',
    address: 'Port El Kantaoui, Sousse',
    beds: 3,
    baths: 2,
    sqft: 350,
    price: '3,500 TND',
    priceUnit: '/month',
    type: 'rent',
    featured: true,
    image: '/tq_7wibftipib-omw-1500h.png',
  },
  {
    id: 5,
    title: 'Sidi Bou Said Apartment',
    address: 'Sidi Bou Said, Tunis',
    beds: 4,
    baths: 3,
    sqft: 500,
    price: '920,000 TND',
    type: 'sale',
    featured: true,
    image: '/tq_a7h2f2xeaz-7bp-1500h.png',
  },
  {
    id: 6,
    title: 'Hammamet Beach Villa',
    address: 'Yasmine Hammamet, Nabeul',
    beds: 3,
    baths: 2,
    sqft: 450,
    price: '680,000 TND',
    type: 'sale',
    featured: true,
    image: '/tq_b4rcqm58py-gcw-1500h.png',
  },
];

// City data - Famous cities in Tunisia
const cities = [
  { name: "Tunis", properties: 245, image: "/tq_bdn30ebwk5-m0bm-1500h.png" },
  { name: "Sousse", properties: 178, image: "/tq_brzn8uwaca-vatm-1500h.png" },
  { name: "Sfax", properties: 156, image: "/tq_eg61ro6xoc-8z2e-1500h.png" },
  { name: "Hammamet", properties: 134, image: "/tq_ev3u-afbuo-tv-1500h.png" },
  { name: "Djerba", properties: 98, image: "/tq_fqz__chb9i-7br-1500h.png" },
];

// Property Card Component - Accessible
function PropertyCard({ property }: { property: Property }) {
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
      aria-label={`${property.title} - ${formattedPrice}${showMonthly ? "/month" : ""}`}
    >
      <div className="property-card-image">
        <img
          src={imageUrl}
          alt={`${property.title} at ${property.address.city}, ${property.address.country}`}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder-property.svg";
          }}
        />
        <span
          className={`property-badge ${listingType}`}
          aria-label={`Property for ${listingType === "sale" ? "sale" : "rent"}`}
        >
          For {listingType === "sale" ? "Sale" : "Rent"}
        </span>
        {property.status === "available" && (
          <span className="property-featured" aria-label="Featured property">
            Featured
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
            <dt className="sr-only">Bedrooms</dt>
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
              {property.features?.bedrooms ?? 0} Beds
            </dd>
          </div>
          <div className="meta-item">
            <dt className="sr-only">Bathrooms</dt>
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
              {property.features?.bathrooms ?? 0} Baths
            </dd>
          </div>
          <div className="meta-item">
            <dt className="sr-only">Square feet</dt>
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
              {property.features?.area ?? 0} sqft
            </dd>
          </div>
        </dl>
        <div className="property-price">
          <span className="price" aria-label="Price">
            {formattedPrice}
          </span>
          {showMonthly && <span className="price-unit">/month</span>}
        </div>
        <Link
          to={`/properties/${propertyId}`}
          className="property-link"
          aria-label={`View details for ${property.title}`}
        >
          View Details
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
      to={`/properties?city=${city.name.toLowerCase().replace(" ", "-")}`}
      className="city-card"
      aria-label={`Browse ${city.properties} properties in ${city.name}`}
    >
      <img src={city.image} alt={`${city.name} cityscape`} loading="lazy" />
      <div className="city-overlay">
        <h4>{city.name}</h4>
        <span>{city.properties} Properties</span>
      </div>
    </Link>
  );
}

// Rental Property Card (from backend data)
function RentalPropertyCard({ property }: { property: BackendProperty }) {
  const address = property.address
    ? `${property.address.city}, ${property.address.country}`
    : 'Location unavailable';
  const beds = property.features?.bedrooms ?? 0;
  const baths = property.features?.bathrooms ?? 0;
  const sqft = property.features?.area ?? 0;
  const primaryImage = property.images?.find((img) => img.isPrimary)?.url
    ?? property.images?.[0]?.url
    ?? '/tq_1s1jvryd0n-ta2j-1500h.png';
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
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/tq_1s1jvryd0n-ta2j-1500h.png';
          }}
        />
        <span className="property-badge rent" aria-label="Property for rent">
          For Rent
        </span>
      </div>
      <div className="property-card-content">
        <h3 className="property-title">{property.title}</h3>
        <p className="property-address">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="sr-only">Location: </span>
          {address}
        </p>
        <dl className="property-meta" aria-label="Property details">
          <div className="meta-item">
            <dt className="sr-only">Bedrooms</dt>
            <dd>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
                <path d="M21 7H3l2-4h14l2 4z" />
              </svg>
              {beds} Beds
            </dd>
          </div>
          <div className="meta-item">
            <dt className="sr-only">Bathrooms</dt>
            <dd>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z" />
                <path d="M6 12V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7" />
              </svg>
              {baths} Baths
            </dd>
          </div>
          {sqft > 0 && (
            <div className="meta-item">
              <dt className="sr-only">Square feet</dt>
              <dd>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
                {sqft} sqft
              </dd>
            </div>
          )}
        </dl>
        <div className="property-price">
          <span className="price" aria-label="Price">{price}</span>
          <span className="price-unit">/month</span>
        </div>
        <Link
          to={`/properties/${property.id || property._id}`}
          className="property-link"
          aria-label={`View details for ${property.title}`}
        >
          View Details
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"sale" | "rent">("sale");
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const mainContentRef = useRef<HTMLElement>(null);
  const [rentalProperties, setRentalProperties] = useState<BackendProperty[]>([]);
  const [rentalLoading, setRentalLoading] = useState(true);
  const [rentalError, setRentalError] = useState<string | null>(null);

  // Fetch rental properties from backend
  useEffect(() => {
    const fetchRentals = async () => {
      try {
        setRentalLoading(true);
        setRentalError(null);
        const response = await propertyService.getProperties({ status: 'available', limit: 6 });
        // Filter for rented/available properties — show all available since status is 'available'
        setRentalProperties(response.properties || []);
      } catch (err) {
        console.error('Failed to fetch rental properties:', err);
        setRentalError('Unable to load properties at the moment.');
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
        setProperties(response.properties);
      } catch {
        setProperties([]);
      }
    };

    void loadHomeProperties();
  }, []);

  const bestDealProperties = properties.slice(0, 4);
  const recentRentProperties = properties.filter((p) => p.status === "rented");

  // Handle search form submission
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      // Navigate to search results
      window.location.href = `/properties?type=${propertyType}&query=${encodeURIComponent(searchQuery)}&for=${activeTab}`;
    },
    [propertyType, searchQuery, activeTab],
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
          <h1 id="hero-title" className="hero-title">
            The <span className="highlight">#1</span> site real estate
            <br />
            <span className="hero-title-secondary">
              professionals trust in Tunisia
            </span>
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
              Sale
            </button>
            <button
              className={`search-tab-btn ${activeTab === "rent" ? "active" : ""}`}
              onClick={() => setActiveTab("rent")}
              role="tab"
              aria-selected={activeTab === "rent"}
              aria-controls="search-panel"
              id="tab-rent"
            >
              Rent
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
            <div className="search-box-inner">
              <div className="search-field type-field">
                <label htmlFor="property-type" className="sr-only">
                  Property type
                </label>
                <select
                  id="property-type"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  aria-label="Select property type"
                >
                  <option value="">Type</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="villa">Villa</option>
                  <option value="office">Office</option>
                </select>
              </div>
              <div className="search-field keyword-field">
                <label htmlFor="search-keywords" className="sr-only">
                  Search keywords
                </label>
                <input
                  id="search-keywords"
                  type="text"
                  placeholder="Enter Keywords"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Enter search keywords"
                />
              </div>
              <button
                type="button"
                className="filter-btn"
                aria-label="Open advanced filters"
                aria-haspopup="dialog"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                <span className="filter-text">Filters</span>
              </button>
              <button type="submit" className="search-button">
                <svg
                  className="search-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <span>Search</span>
              </button>
            </div>
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
              <span className="section-tag">Featured</span>
              <h2 id="deals-title" className="section-title">
                Our Best Deals
              </h2>
              <p className="section-subtitle">
                Featured properties handpicked for you
              </p>
            </header>
            {bestDealProperties.length > 0 ? (
              <div className="properties-grid" role="list">
                {bestDealProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <p className="section-subtitle">
                No properties available yet. Check back soon.
              </p>
            )}
            <div className="section-cta">
              <Link to="/properties" className="view-all-btn">
                View All Properties
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
              <span className="section-tag">Locations</span>
              <h2 id="cities-title" className="section-title">
                Explore Cities
              </h2>
              <p className="section-subtitle">
                Discover properties in top locations
              </p>
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
              <span className="section-tag">For Rent</span>
              <h2 id="rent-title" className="section-title">
                Recent Properties for Rent
              </h2>
              <p className="section-subtitle">
                Find your perfect rental home today
              </p>
            </header>
            {rentalLoading ? (
              <div className="flex justify-center items-center py-16" aria-live="polite" aria-label="Loading rental properties">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500 text-sm">Loading properties...</p>
                </div>
              </div>
            ) : rentalError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3" aria-live="polite">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
                <p className="text-gray-500">{rentalError}</p>
                <Link to="/properties" className="text-emerald-600 hover:underline text-sm font-medium">
                  Browse all properties →
                </Link>
              </div>
            ) : rentalProperties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <p className="text-gray-500">No rental properties available right now.</p>
                <Link to="/properties" className="text-emerald-600 hover:underline text-sm font-medium">
                  Browse all properties →
                </Link>
              </div>
            ) : (
              <>
                <div className="properties-grid" role="list">
                  {rentalProperties.map((property) => (
                    <RentalPropertyCard key={property.id || property._id} property={property} />
                  ))}
                </div>
                <div className="section-cta">
                  <Link to="/properties" className="view-all-btn">
                    View All Rentals
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
              <span className="section-tag">Process</span>
              <h2 id="how-title" className="section-title">
                How It Works
              </h2>
              <p className="section-subtitle">
                Find your perfect home in 3 simple steps
              </p>
            </header>
            <ol className="steps-grid" role="list">
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
                <h3>Find Real Estate</h3>
                <p>
                  Browse thousands of properties with our advanced search
                  filters to find exactly what you need.
                </p>
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
                <h3>Meet Realtor</h3>
                <p>
                  Connect with our professional realtors who will guide you
                  through the process.
                </p>
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
                <h3>Take The Keys</h3>
                <p>
                  Complete the paperwork and get the keys to your new dream
                  home.
                </p>
              </li>
            </ol>
          </div>
        </section>
        {/* CTA Section */}
        <section className="cta-section" aria-labelledby="cta-title">
          <div className="cta-content">
            <h2 id="cta-title">Discover a place you'll love to live</h2>
            <p>
              Find your dream home from our curated selection of premium
              properties.
            </p>
            <Link to="/properties" className="cta-button">
              View Properties
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
              <span className="section-tag">Why Us</span>
              <h2 id="why-title">Why You Should Work With Us</h2>
              <p className="why-us-description">
                With years of experience in the real estate industry, we provide
                top-notch service to help you find your perfect property.
              </p>
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
                    <h4>Buy or Rent Homes</h4>
                    <p>
                      We sell your home at the best market price quickly and
                      efficiently.
                    </p>
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
                    <h4>Trusted by Thousands</h4>
                    <p>
                      We offer free consultancy to help you secure financing for
                      your new home.
                    </p>
                  </div>
                </li>
              </ul>
              <Link to="/about" className="learn-more-btn">
                Learn More
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
          <h3 id="newsletter-title">Subscribe To Our Newsletter</h3>
          <p>Get the latest updates on new properties and exclusive offers</p>
          <form
            className="newsletter-form"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Newsletter subscription"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="Your Email Address"
              required
              aria-required="true"
            />
            <button type="submit">Subscribe</button>
          </form>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}
