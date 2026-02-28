// ===========================================
// SmartProperty - Properties List Page
// ===========================================

import { HomeFooter, Navbar } from "@/components/layout";
import { useTranslation } from "@/i18n";
import { propertyService } from "@/services/property.service";
import { useAuthStore } from "@/store";
import type {
  Property,
  PropertyFilters,
  PropertyStatus,
  PropertyType,
} from "@/types/property";
import { isOwner } from "@/utils";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./properties.css";

// ===========================================
// Icons
// ===========================================

const LocationIcon = () => (
  <svg
    width="14"
    height="14"
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
    width="16"
    height="16"
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
    width="16"
    height="16"
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
    width="16"
    height="16"
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

const PlusIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const SearchIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const HomeIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9,22 9,12 15,12 15,22" />
  </svg>
);

// ===========================================
// Property Card Component
// ===========================================

interface PropertyCardProps {
  property: Property;
  onDelete?: (id: string) => void;
  canManage?: boolean;
  t: ReturnType<typeof import("@/i18n").useTranslation>;
}

function PropertyCard({
  property,
  onDelete,
  canManage = true,
  t,
}: PropertyCardProps) {
  const propertyId = property.id || property._id || "";
  const primaryImage =
    property.images?.find((img) => img.isPrimary) || property.images?.[0];
  const imageUrl = primaryImage?.url || "/placeholder-property.svg";

  const handleDelete = () => {
    if (window.confirm(t.properties.deleteConfirm)) {
      if (propertyId) {
        onDelete?.(propertyId);
      }
    }
  };

  const statusLabel =
    property.status === "available"
      ? t.properties.available
      : property.status === "rented"
        ? t.properties.rented
        : property.status === "maintenance"
          ? t.properties.maintenance
          : t.properties.unlisted;

  const typeLabel =
    property.type === "apartment"
      ? t.properties.typeApartment
      : property.type === "house"
        ? t.properties.typeHouse
        : property.type === "villa"
          ? t.properties.typeVilla
          : property.type === "studio"
            ? t.properties.typeStudio
            : property.type === "condo"
              ? t.properties.typeCondo
              : t.properties.typeLand;

  return (
    <article className="property-card" aria-label={property.title}>
      <div className="property-card-image">
        <img
          src={imageUrl}
          alt={property.title}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder-property.svg";
          }}
        />
        <span className={`property-badge ${property.status}`}>
          {statusLabel}
        </span>
        <span className="property-type-badge">{typeLabel}</span>
      </div>

      <div className="property-card-content">
        <h3 className="property-title">{property.title}</h3>

        <p className="property-address">
          <LocationIcon />
          {property.address.city}, {property.address.country}
        </p>

        <dl className="property-meta">
          {property.features?.bedrooms !== undefined && (
            <div className="meta-item">
              <BedIcon />
              <dd>{property.features.bedrooms} {t.properties.beds}</dd>
            </div>
          )}
          {property.features?.bathrooms !== undefined && (
            <div className="meta-item">
              <BathIcon />
              <dd>{property.features.bathrooms} {t.properties.baths}</dd>
            </div>
          )}
          {property.features?.area !== undefined && (
            <div className="meta-item">
              <AreaIcon />
              <dd>{property.features.area} m²</dd>
            </div>
          )}
        </dl>

        <div className="property-price">
          <span className="price">{property.price.toLocaleString()}</span>
          <span className="currency">{property.currency}</span>
        </div>

        <div className="property-card-actions">
          <Link to={`/properties/${propertyId}`} className="btn-view">
            {t.properties.viewBtn}
          </Link>
          {canManage && (
            <>
              <Link to={`/properties/${propertyId}/edit`} className="btn-edit">
                {t.properties.editBtn}
              </Link>
              <button className="btn-delete" onClick={handleDelete}>
                {t.properties.deleteBtn}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

// ===========================================
// Main Properties Page
// ===========================================

export default function PropertiesPage() {
  const { user } = useAuthStore();
  const t = useTranslation();
  const canAddProperty = isOwner(user);
  const isOwnerUser = isOwner(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [myPropertiesLoading, setMyPropertiesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"load" | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<PropertyFilters>({
    page: 1,
    limit: 12,
    type: (searchParams.get("type") as PropertyType) || undefined,
    status: (searchParams.get("status") as PropertyStatus) || undefined,
    city: searchParams.get("city") || undefined,
    search: searchParams.get("search") || undefined,
  });

  // Load properties
  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await propertyService.getProperties(filters);
      setProperties(response.properties);
      setTotal(response.total);
      setCurrentPage(response.page);
    } catch (err) {
      console.error("Failed to load properties:", err);
      setError("load");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const loadMyProperties = useCallback(async () => {
    if (!isOwnerUser || !user?.id) {
      setMyProperties([]);
      return;
    }

    setMyPropertiesLoading(true);

    try {
      const response = await propertyService.getProperties({
        page: 1,
        limit: 100,
        ownerId: user.id,
      });
      setMyProperties(response.properties);
    } catch {
      setMyProperties([]);
    } finally {
      setMyPropertiesLoading(false);
    }
  }, [isOwnerUser, user?.id]);

  useEffect(() => {
    void loadMyProperties();
  }, [loadMyProperties]);

  const canManageProperty = useCallback(
    (property: Property) => {
      if (!user) return false;

      if (user.role === "admin") return true;
      if (user.role === "owner") return property.ownerId === user.id;
      if (user.role === "manager") {
        return property.managerId === user.id || property.ownerId === user.id;
      }

      return false;
    },
    [user],
  );

  // Handle filter changes
  const handleFilterChange = (key: keyof PropertyFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined, page: 1 };
    setFilters(newFilters);

    // Update URL params
    const params = new URLSearchParams();
    if (newFilters.type) params.set("type", newFilters.type);
    if (newFilters.status) params.set("status", newFilters.status);
    if (newFilters.city) params.set("city", newFilters.city);
    if (newFilters.search) params.set("search", newFilters.search);
    setSearchParams(params);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProperties();
  };

  // Handle reset filters
  const handleResetFilters = () => {
    setFilters({ page: 1, limit: 12 });
    setSearchParams({});
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await propertyService.deleteProperty(id);
      setProperties(properties.filter((p) => (p.id || p._id) !== id));
      setMyProperties(myProperties.filter((p) => (p.id || p._id) !== id));
      setTotal(total - 1);
    } catch (err) {
      console.error("Failed to delete property:", err);
      alert(t.properties.deleteError);
    }
  };

  // Pagination
  const totalPages = Math.ceil(total / (filters.limit || 12));
  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="properties-page">
      <Navbar />


      <main className="properties-container" id="main-content">
        {/* Header */}
        <div className="properties-header">
          <div className="header-actions">
            <div>
              <h1>{t.properties.title}</h1>
              <p>
                {total} {t.properties.title.toLowerCase()} {t.properties.found}
              </p>
            </div>
            {canAddProperty && (
              <Link to="/properties/new" className="btn-add-property">
                <PlusIcon />
                {t.properties.addProperty}
              </Link>
            )}
            {/* Filters */}
            <form className="properties-filters" onSubmit={handleSearch}>
              <div className="filters-row">
                <div className="filter-group">
                  <label htmlFor="filter-search">{t.properties.search}</label>
                  <input
                    id="filter-search"
                    type="text"
                    placeholder={t.properties.searchPlaceholder}
                    value={filters.search || ""}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <label htmlFor="filter-type">{t.properties.typeLabel}</label>
                  <select
                    id="filter-type"
                    value={filters.type || ""}
                    onChange={(e) => handleFilterChange("type", e.target.value)}
                  >
                    <option value="">{t.properties.allTypes}</option>
                    <option value="apartment">{t.properties.typeApartment}</option>
                    <option value="house">{t.properties.typeHouse}</option>
                    <option value="villa">{t.properties.typeVilla}</option>
                    <option value="studio">{t.properties.typeStudio}</option>
                    <option value="condo">{t.properties.typeCondo}</option>
                    <option value="land">{t.properties.typeLand}</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="filter-status">{t.properties.statusLabel}</label>
                  <select
                    id="filter-status"
                    value={filters.status || ""}
                    onChange={(e) => handleFilterChange("status", e.target.value)}
                  >
                    <option value="">{t.properties.allStatuses}</option>
                    <option value="available">{t.properties.available}</option>
                    <option value="rented">{t.properties.rented}</option>
                    <option value="maintenance">{t.properties.maintenance}</option>
                    <option value="unlisted">{t.properties.unlisted}</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="filter-city">{t.properties.cityLabel}</label>
                  <input
                    id="filter-city"
                    type="text"
                    placeholder={t.properties.cityPlaceholder}
                    value={filters.city || ""}
                    onChange={(e) => handleFilterChange("city", e.target.value)}
                  />
                </div>

                <div className="filter-actions">
                  <button type="submit" className="btn-filter primary">
                    <SearchIcon />
                    {t.properties.searchBtn}
                  </button>
                  <button
                    type="button"
                    className="btn-filter secondary"
                    onClick={handleResetFilters}
                  >
                    {t.properties.reset}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {isOwnerUser && (
          <section
            className="properties-header"
            aria-labelledby="my-properties-title"
          >
            <div className="header-actions">
              <div>
                <h2 id="my-properties-title">{t.properties.myProperties}</h2>
                <p>{t.properties.myPropertiesDesc}</p>
              </div>
            </div>

            {myPropertiesLoading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <p>{t.properties.loading}</p>
              </div>
            ) : myProperties.length === 0 ? (
              <div className="empty-state">
                <p>{t.properties.noMyProperties}</p>
                {canAddProperty && (
                  <Link to="/properties/new" className="btn-add-property">
                    <PlusIcon />
                    {t.properties.addProperty}
                  </Link>
                )}
              </div>
            ) : (
              <div className="properties-grid">
                {myProperties.map((property) => (
                  <PropertyCard
                    key={`my-${property.id || property._id}`}
                    property={property}
                    onDelete={handleDelete}
                    canManage
                    t={t}
                  />
                ))}
              </div>
            )}
          </section>
        )}
        {/* Content */}
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>{t.properties.loading}</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p style={{ color: "#ef4444" }}>{t.common.error}</p>
            <button className="btn-filter primary" onClick={loadProperties}>
              {t.properties.retry}
            </button>
          </div>
        ) : properties.length === 0 ? (
          <div className="empty-state">
            <HomeIcon />
            <h3>{t.properties.noProperties}</h3>
            <p>
              {filters.search || filters.type || filters.status || filters.city
                ? t.properties.noPropertiesFiltered
                : canAddProperty
                  ? t.properties.noPropertiesAdd
                  : t.properties.noPropertiesEmpty}
            </p>
            {canAddProperty && (
              <Link to="/properties/new" className="btn-add-property">
                <PlusIcon />
                {t.properties.addProperty}
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Properties Grid */}
            <div className="properties-grid">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id || property._id}
                  property={property}
                  onDelete={
                    canManageProperty(property) ? handleDelete : undefined
                  }
                  canManage={canManageProperty(property)}
                  t={t}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="pagination" aria-label="Pagination">
                <button
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  {t.properties.previous}
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    const distance = Math.abs(page - currentPage);
                    return (
                      distance === 0 ||
                      distance === 1 ||
                      page === 1 ||
                      page === totalPages
                    );
                  })
                  .map((page, index, array) => (
                    <span key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="pagination-info">...</span>
                      )}
                      <button
                        className={`pagination-btn ${page === currentPage ? "active" : ""}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    </span>
                  ))}

                <button
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  {t.properties.next}
                </button>
              </nav>
            )}
          </>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}
