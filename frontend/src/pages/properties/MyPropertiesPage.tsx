// ===========================================
// SmartProperty - My Properties Page
// ===========================================

import { HomeFooter, Navbar } from '@/components/layout';
import AdvancedPropertySearchBar from '@/components/properties/AdvancedPropertySearchBar';
import LocationPreferenceMap from '@/components/settings/LocationPreferenceMap';
import { useTranslation } from '@/i18n';
import { propertyService } from '@/services/property.service';
import { useAuthStore } from '@/store';
import { UserRole, type UserLocationPreference } from '@/types/auth';
import type {
  Property,
  PropertyFilters,
  PropertyStatus,
  PropertyType,
} from '@/types/property';
import { canCreateProperties, isPlatformAdmin } from '@/utils';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './properties.css';

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

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

const BackIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
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
  onToggleCompare?: (property: Property) => void;
  onQuickShare?: (property: Property) => void;
  isCompared?: boolean;
  compareDisabled?: boolean;
  isSharing?: boolean;
  t: ReturnType<typeof import('@/i18n').useTranslation>;
}

function PropertyCard({
  property,
  onToggleCompare,
  onQuickShare,
  isCompared = false,
  compareDisabled = false,
  isSharing = false,
  t,
}: PropertyCardProps) {
  const propertyId = property.id || property._id || '';
  const sortedImages = [...(property.images ?? [])].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return (a.order || 0) - (b.order || 0);
  });
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [propertyId, sortedImages.length]);

  const currentImage = sortedImages[selectedImageIndex] || sortedImages[0];
  const imageUrl = currentImage?.url || '/placeholder-property.svg';
  const hasMultipleImages = sortedImages.length > 1;

  const statusLabel =
    property.status === 'available'
      ? t.properties.available
      : property.status === 'rented'
        ? t.properties.rented
        : property.status === 'maintenance'
          ? t.properties.maintenance
          : t.properties.unlisted;

  const typeLabel =
    property.type === 'apartment'
      ? t.properties.typeApartment
      : property.type === 'house'
        ? t.properties.typeHouse
        : property.type === 'villa'
          ? t.properties.typeVilla
          : property.type === 'studio'
            ? t.properties.typeStudio
            : property.type === 'condo'
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
            (e.target as HTMLImageElement).src = '/placeholder-property.svg';
          }}
        />
        <span className={`property-badge ${property.status}`}>
          {statusLabel}
        </span>
        <span className="property-type-badge">{typeLabel}</span>
        {hasMultipleImages && (
          <div className="property-image-dots" aria-label="Property images">
            {sortedImages.map((_, index) => (
              <button
                key={`${propertyId}-img-${index}`}
                type="button"
                className={`property-image-dot ${
                  index === selectedImageIndex ? 'active' : ''
                }`}
                aria-label={`Show image ${index + 1}`}
                aria-pressed={index === selectedImageIndex}
                onClick={() => setSelectedImageIndex(index)}
              />
            ))}
          </div>
        )}
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
              <dd>
                {property.features.bedrooms} {t.properties.beds}
              </dd>
            </div>
          )}
          {property.features?.bathrooms !== undefined && (
            <div className="meta-item">
              <BathIcon />
              <dd>
                {property.features.bathrooms} {t.properties.baths}
              </dd>
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

        <button
          type="button"
          className={`btn-compare-toggle ${isCompared ? 'active' : ''}`}
          disabled={compareDisabled && !isCompared}
          onClick={() => onToggleCompare?.(property)}
        >
          {isCompared
            ? t.properties.removeFromCompare
            : t.properties.addToCompare}
        </button>

        <div className="property-card-actions">
          <Link to={`/properties/${propertyId}`} className="btn-view">
            {t.properties.viewBtn}
          </Link>
          <button
            type="button"
            className="btn-share"
            onClick={() => onQuickShare?.(property)}
            disabled={isSharing}
          >
            {isSharing ? t.common.loading : t.properties.shareBtn}
          </button>
        </div>
      </div>
    </article>
  );
}

// ===========================================
// Main My Properties Page
// ===========================================

export default function MyPropertiesPage() {
  const { user } = useAuthStore();
  const t = useTranslation();
  const canAdd =
    canCreateProperties(user) && user?.role !== UserRole.BRANCH_MANAGER;
  const isAgencyScopedView =
    !isPlatformAdmin(user) &&
    !!user?.agencyId &&
    [
      UserRole.OWNER,
      UserRole.BRANCH_MANAGER,
      UserRole.REAL_ESTATE_AGENT,
      UserRole.RENTAL_MANAGER,
    ].includes(user.role as UserRole);
  const [searchParams, setSearchParams] = useSearchParams();
  const parsePositiveIntegerParam = (
    value: string | null,
  ): number | undefined => {
    if (!value) return undefined;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  };
  const parseNumberParam = (value: string | null): number | undefined => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const parsePositiveNumberParam = (
    value: string | null,
  ): number | undefined => {
    const parsed = parseNumberParam(value);
    return parsed !== undefined && parsed > 0 ? parsed : undefined;
  };
  const [properties, setProperties] = useState<Property[]>([]);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [sharingPropertyId, setSharingPropertyId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'load' | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<PropertyFilters>({
    page: 1,
    limit: 12,
    type: (searchParams.get('type') as PropertyType) || undefined,
    status: (searchParams.get('status') as PropertyStatus) || undefined,
    bedrooms: parsePositiveIntegerParam(searchParams.get('bedrooms')),
    bathrooms: parsePositiveIntegerParam(searchParams.get('bathrooms')),
    nearLat: parseNumberParam(searchParams.get('nearLat')),
    nearLng: parseNumberParam(searchParams.get('nearLng')),
    radiusKm: parsePositiveNumberParam(searchParams.get('radiusKm')),
    search: searchParams.get('search') || undefined,
  });

  // Local state for text input
  const [searchText, setSearchText] = useState(filters.search || '');
  const [bedroomsText, setBedroomsText] = useState(
    filters.bedrooms?.toString() || '',
  );
  const [bathroomsText, setBathroomsText] = useState(
    filters.bathrooms?.toString() || '',
  );
  const [showNearbyPanel, setShowNearbyPanel] = useState(
    filters.nearLat !== undefined && filters.nearLng !== undefined,
  );
  const [nearbySelectionDraft, setNearbySelectionDraft] = useState<
    UserLocationPreference | undefined
  >(
    filters.nearLat !== undefined && filters.nearLng !== undefined
      ? {
          coordinates: { lat: filters.nearLat, lng: filters.nearLng },
          radiusKm: filters.radiusKm || 11,
          label: `${filters.nearLat.toFixed(4)}, ${filters.nearLng.toFixed(4)}`,
        }
      : undefined,
  );
  const [nearbyLocationDraft, setNearbyLocationDraft] = useState(
    nearbySelectionDraft?.label || '',
  );

  const getPropertyId = (property: Property): string =>
    property.id || property._id || '';

  const getStatusLabel = (status: PropertyStatus): string =>
    status === 'available'
      ? t.properties.available
      : status === 'rented'
        ? t.properties.rented
        : status === 'maintenance'
          ? t.properties.maintenance
          : t.properties.unlisted;

  const getTypeLabel = (type: PropertyType): string =>
    type === 'apartment'
      ? t.properties.typeApartment
      : type === 'house'
        ? t.properties.typeHouse
        : type === 'villa'
          ? t.properties.typeVilla
          : type === 'studio'
            ? t.properties.typeStudio
            : type === 'condo'
              ? t.properties.typeCondo
              : t.properties.typeLand;

  const comparedProperties = properties.filter((property) =>
    comparisonIds.includes(getPropertyId(property)),
  );

  const formatAvailability = (property: Property): string => {
    const from = property.features?.availabilityCalendar?.availableFrom;
    const to = property.features?.availabilityCalendar?.availableTo;

    if (from && to) {
      return t.properties.comparisonFromTo
        .replace('{{from}}', from)
        .replace('{{to}}', to);
    }

    if (from) {
      return t.properties.comparisonFrom.replace('{{from}}', from);
    }

    if (to) {
      return t.properties.comparisonUntil.replace('{{to}}', to);
    }

    return t.properties.comparisonNotSpecified;
  };

  // Load my properties
  const loadProperties = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Admin sees all properties. Agency-linked roles see agency properties.
      const queryFilters: PropertyFilters = { ...filters };
      if (isPlatformAdmin(user)) {
        // Admin manages all — no ownerId filter
      } else if (isAgencyScopedView) {
        queryFilters.managerId = user.id;
      } else {
        queryFilters.ownerId = user.id;
      }

      const response = await propertyService.getProperties(queryFilters);
      setProperties(response.properties);
      setTotal(response.total);
      setCurrentPage(response.page);
    } catch (err) {
      console.error('Failed to load my properties:', formatError(err));
      setError('load');
    } finally {
      setLoading(false);
    }
  }, [filters, isAgencyScopedView, user]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    setComparisonIds((prev) =>
      prev.filter((id) =>
        properties.some((property) => getPropertyId(property) === id),
      ),
    );
  }, [properties]);

  // Sync URL params
  const updateUrlParams = useCallback(
    (f: PropertyFilters) => {
      const params = new URLSearchParams();
      if (f.type) params.set('type', f.type);
      if (f.status) params.set('status', f.status);
      if (f.bedrooms !== undefined) params.set('bedrooms', String(f.bedrooms));
      if (f.bathrooms !== undefined)
        params.set('bathrooms', String(f.bathrooms));
      if (f.nearLat !== undefined) params.set('nearLat', String(f.nearLat));
      if (f.nearLng !== undefined) params.set('nearLng', String(f.nearLng));
      if (f.radiusKm !== undefined) params.set('radiusKm', String(f.radiusKm));
      if (f.search) params.set('search', f.search);
      setSearchParams(params);
    },
    [setSearchParams],
  );

  // Dropdown filter change
  const handleFilterChange = (key: keyof PropertyFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined, page: 1 };
    setFilters(newFilters);
    updateUrlParams(newFilters);
  };

  // Apply current advanced search bar values to filters
  const handleSearch = () => {
    const newFilters = {
      ...filters,
      search: searchText || undefined,
      bedrooms: parsePositiveIntegerParam(bedroomsText),
      bathrooms: parsePositiveIntegerParam(bathroomsText),
      page: 1,
    };
    setFilters(newFilters);
    updateUrlParams(newFilters);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchText('');
    setBedroomsText('');
    setBathroomsText('');
    setShowNearbyPanel(false);
    setNearbySelectionDraft(undefined);
    setNearbyLocationDraft('');
    setFilters({ page: 1, limit: 12 });
    setSearchParams({});
  };

  const clearNearbyFilter = () => {
    const clearedFilters: PropertyFilters = {
      ...filters,
      nearLat: undefined,
      nearLng: undefined,
      radiusKm: undefined,
      page: 1,
    };

    setNearbySelectionDraft(undefined);
    setNearbyLocationDraft('');
    setShowNearbyPanel(false);
    setFilters(clearedFilters);
    updateUrlParams(clearedFilters);
  };

  const handleNearbyPrevious = () => {
    if (filters.nearLat !== undefined && filters.nearLng !== undefined) {
      const restored: UserLocationPreference = {
        coordinates: { lat: filters.nearLat, lng: filters.nearLng },
        radiusKm: filters.radiusKm || 11,
        label:
          nearbyLocationDraft ||
          `${filters.nearLat.toFixed(4)}, ${filters.nearLng.toFixed(4)}`,
      };
      setNearbySelectionDraft(restored);
      setNearbyLocationDraft(restored.label || '');
    } else {
      setNearbySelectionDraft(undefined);
      setNearbyLocationDraft('');
    }

    setShowNearbyPanel(false);
  };

  const handleNearbyValidate = () => {
    const coords = nearbySelectionDraft?.coordinates;
    if (!coords) {
      return;
    }

    const nextFilters: PropertyFilters = {
      ...filters,
      nearLat: coords.lat,
      nearLng: coords.lng,
      radiusKm: nearbySelectionDraft?.radiusKm || 11,
      page: 1,
    };

    setFilters(nextFilters);
    updateUrlParams(nextFilters);
    setShowNearbyPanel(false);
  };

  const handleToggleCompare = (property: Property) => {
    const id = getPropertyId(property);
    if (!id) return;

    setComparisonError(null);

    setComparisonIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((comparedId) => comparedId !== id);
      }

      if (prev.length >= 3) {
        setComparisonError(t.properties.compareLimitReached);
        return prev;
      }

      return [...prev, id];
    });
  };

  const handleCompareNow = () => {
    if (comparedProperties.length < 2) {
      setComparisonError(t.properties.compareNeedTwo);
      return;
    }

    const section = document.getElementById('comparison-panel');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  };

  const handleQuickShare = async (property: Property) => {
    const propertyId = getPropertyId(property);
    if (!propertyId) return;

    setSharingPropertyId(propertyId);
    setShareNotice(null);

    const fallbackUrl = `${window.location.origin}/properties/${propertyId}`;

    try {
      const shareData = await propertyService.getPropertyShareData(propertyId);
      const shareUrl = shareData.shareUrl || fallbackUrl;

      if (navigator.share) {
        try {
          await navigator.share({
            title: property.title,
            text: property.title,
            url: shareUrl,
          });
          return;
        } catch (error) {
          if ((error as { name?: string }).name === 'AbortError') {
            return;
          }
        }
      }

      const copied = await copyToClipboard(shareUrl);
      setShareNotice({
        type: copied ? 'success' : 'error',
        message: copied ? t.properties.shareCopied : t.properties.shareError,
      });
    } catch {
      const copied = await copyToClipboard(fallbackUrl);
      setShareNotice({
        type: copied ? 'success' : 'error',
        message: copied ? t.properties.shareCopied : t.properties.shareError,
      });
    } finally {
      setSharingPropertyId(null);
    }
  };

  // Pagination
  const totalPages = Math.ceil(total / (filters.limit || 12));
  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="properties-page">
      <Navbar />

      <main className="properties-container" id="main-content">
        {/* Header */}
        <div className="properties-header">
          <div className="header-actions">
            <div>
              <Link to="/properties" className="btn-back-to-list">
                <BackIcon />
                {t.properties.backToAll}
              </Link>
              <h1>
                {isAgencyScopedView
                  ? t.properties.myAgencyProperties
                  : t.properties.myProperties}
              </h1>
              <p>
                {isAgencyScopedView
                  ? t.properties.myAgencyPropertiesDesc
                  : t.properties.myPropertiesDesc}
              </p>
              <p className="my-properties-count">
                {total} {t.properties.title.toLowerCase()} {t.properties.found}
              </p>
            </div>
            {canAdd && (
              <Link to="/properties/new" className="btn-add-property">
                <PlusIcon />
                {t.properties.addProperty}
              </Link>
            )}
          </div>

          <AdvancedPropertySearchBar
            searchQuery={searchText}
            onSearchQueryChange={setSearchText}
            cityValue={''}
            onCityChange={() => {}}
            typeValue={filters.type}
            onTypeChange={(value) => handleFilterChange('type', value)}
            statusValue={filters.status}
            onStatusChange={(value) => handleFilterChange('status', value)}
            bedroomsValue={bedroomsText}
            onBedroomsChange={setBedroomsText}
            bathroomsValue={bathroomsText}
            onBathroomsChange={setBathroomsText}
            onSearch={handleSearch}
            onReset={handleResetFilters}
            onOpenNearbyMap={() => setShowNearbyPanel(true)}
            onClearNearby={clearNearbyFilter}
            hasNearbySelection={
              filters.nearLat !== undefined && filters.nearLng !== undefined
            }
            nearbySummary={
              nearbyLocationDraft ||
              (nearbySelectionDraft?.coordinates
                ? `${nearbySelectionDraft.coordinates.lat.toFixed(4)}, ${nearbySelectionDraft.coordinates.lng.toFixed(4)}`
                : '')
            }
            nearbyHint={t.properties.nearbyHint}
            showCityField={false}
            labels={{
              searchPlaceholder: t.properties.searchShortPlaceholder,
              filters: t.properties.filters,
              search: t.properties.searchBtn,
              type: t.properties.typeLabel,
              status: t.properties.statusLabel,
              city: t.properties.cityShortPlaceholder,
              bedrooms: t.properties.form.labels.bedrooms,
              bathrooms: t.properties.form.labels.bathrooms,
              nearby: t.properties.nearbyLabel,
              nearbyTrigger: t.properties.openNearbyMap,
              nearbyPlaceholder: t.properties.nearbyPlaceholder,
              any: t.properties.anyOption,
              allTypes: t.properties.allTypes,
              allStatuses: t.properties.allStatuses,
              available: t.properties.available,
              rented: t.properties.rented,
              maintenance: t.properties.maintenance,
              unlisted: t.properties.unlisted,
              typeApartment: t.properties.typeApartment,
              typeHouse: t.properties.typeHouse,
              typeVilla: t.properties.typeVilla,
              typeStudio: t.properties.typeStudio,
              typeCondo: t.properties.typeCondo,
              typeLand: t.properties.typeLand,
              reset: t.properties.reset,
              clearNearby: t.properties.clearNearby,
            }}
          />
        </div>

        {showNearbyPanel && (
          <section
            className="comparison-panel"
            style={{ marginBottom: '1.5rem' }}
          >
            <LocationPreferenceMap
              value={nearbyLocationDraft}
              onChange={setNearbyLocationDraft}
              selection={nearbySelectionDraft}
              onSelectionChange={setNearbySelectionDraft}
            />
            <div
              className="compare-toolbar-actions"
              style={{ marginTop: '1rem' }}
            >
              <button
                type="button"
                className="btn-filter secondary"
                onClick={clearNearbyFilter}
              >
                {t.properties.skipForNow}
              </button>
              <button
                type="button"
                className="btn-filter secondary"
                onClick={handleNearbyPrevious}
              >
                {t.properties.previous}
              </button>
              <button
                type="button"
                className="btn-filter primary"
                onClick={handleNearbyValidate}
                disabled={!nearbySelectionDraft?.coordinates}
              >
                {t.properties.validateNext}
              </button>
            </div>
          </section>
        )}

        {/* Compare Toolbar */}
        {comparisonIds.length > 0 && (
          <div className="compare-toolbar">
            <p>
              {comparisonIds.length} {t.properties.selectedForCompare}
            </p>
            <div className="compare-toolbar-actions">
              <button
                type="button"
                className="btn-filter primary"
                onClick={handleCompareNow}
              >
                {t.properties.compareNow}
              </button>
              <button
                type="button"
                className="btn-filter secondary"
                onClick={() => {
                  setComparisonIds([]);
                  setComparisonError(null);
                }}
              >
                {t.properties.clearCompare}
              </button>
            </div>
          </div>
        )}

        {comparisonError && <p className="compare-error">{comparisonError}</p>}
        {shareNotice && (
          <p className={`share-notice ${shareNotice.type}`}>
            {shareNotice.message}
          </p>
        )}

        {/* Comparison Panel */}
        {comparedProperties.length >= 2 && (
          <section id="comparison-panel" className="comparison-panel">
            <h2>{t.properties.comparisonTitle}</h2>
            <p>{t.properties.comparisonSubtitle}</p>

            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>{t.properties.comparisonField}</th>
                    {comparedProperties.map((property) => (
                      <th key={getPropertyId(property)}>
                        <div className="comparison-property-heading">
                          <Link to={`/properties/${getPropertyId(property)}`}>
                            {property.title}
                          </Link>
                          <button
                            type="button"
                            className="comparison-remove"
                            onClick={() => handleToggleCompare(property)}
                          >
                            {t.properties.removeFromCompare}
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{t.properties.comparisonPrice}</td>
                    {comparedProperties.map((property) => (
                      <td key={`price-${getPropertyId(property)}`}>
                        {property.price.toLocaleString()} {property.currency}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t.properties.comparisonStatus}</td>
                    {comparedProperties.map((property) => (
                      <td key={`status-${getPropertyId(property)}`}>
                        {getStatusLabel(property.status)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t.properties.comparisonType}</td>
                    {comparedProperties.map((property) => (
                      <td key={`type-${getPropertyId(property)}`}>
                        {getTypeLabel(property.type)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t.properties.comparisonLocation}</td>
                    {comparedProperties.map((property) => (
                      <td key={`location-${getPropertyId(property)}`}>
                        {property.address.city}, {property.address.country}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t.properties.comparisonBedrooms}</td>
                    {comparedProperties.map((property) => (
                      <td key={`bedrooms-${getPropertyId(property)}`}>
                        {property.features?.bedrooms ??
                          t.properties.comparisonNotSpecified}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t.properties.comparisonBathrooms}</td>
                    {comparedProperties.map((property) => (
                      <td key={`bathrooms-${getPropertyId(property)}`}>
                        {property.features?.bathrooms ??
                          t.properties.comparisonNotSpecified}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t.properties.comparisonArea}</td>
                    {comparedProperties.map((property) => (
                      <td key={`area-${getPropertyId(property)}`}>
                        {property.features?.area
                          ? `${property.features.area} m²`
                          : t.properties.comparisonNotSpecified}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t.properties.comparisonParking}</td>
                    {comparedProperties.map((property) => (
                      <td key={`parking-${getPropertyId(property)}`}>
                        {property.features?.parkingSpaces ??
                          t.properties.comparisonNotSpecified}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t.properties.comparisonFurnished}</td>
                    {comparedProperties.map((property) => (
                      <td key={`furnished-${getPropertyId(property)}`}>
                        {property.features?.furnished === undefined
                          ? t.properties.comparisonNotSpecified
                          : property.features.furnished
                            ? t.propertyDetail.yes
                            : t.propertyDetail.no}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t.properties.comparisonPetFriendly}</td>
                    {comparedProperties.map((property) => (
                      <td key={`pets-${getPropertyId(property)}`}>
                        {property.features?.petFriendly === undefined
                          ? t.properties.comparisonNotSpecified
                          : property.features.petFriendly
                            ? t.propertyDetail.yes
                            : t.propertyDetail.no}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t.properties.comparisonAmenities}</td>
                    {comparedProperties.map((property) => (
                      <td key={`amenities-${getPropertyId(property)}`}>
                        {property.features?.amenities?.length
                          ? property.features.amenities.join(', ')
                          : t.properties.comparisonNone}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t.properties.comparisonAvailability}</td>
                    {comparedProperties.map((property) => (
                      <td key={`availability-${getPropertyId(property)}`}>
                        {formatAvailability(property)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
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
            <p style={{ color: '#ef4444' }}>{t.common.error}</p>
            <button className="btn-filter primary" onClick={loadProperties}>
              {t.properties.retry}
            </button>
          </div>
        ) : properties.length === 0 ? (
          <div className="empty-state">
            <HomeIcon />
            <h3>{t.properties.noMyProperties}</h3>
            <p>
              {filters.search || filters.type || filters.status
                ? t.properties.noPropertiesFiltered
                : t.properties.noPropertiesAdd}
            </p>
            {canAdd && (
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
                  onToggleCompare={handleToggleCompare}
                  onQuickShare={handleQuickShare}
                  isCompared={comparisonIds.includes(getPropertyId(property))}
                  compareDisabled={comparisonIds.length >= 3}
                  isSharing={sharingPropertyId === getPropertyId(property)}
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
                        className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
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
