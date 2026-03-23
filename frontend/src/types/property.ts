// ===========================================
// SmartProperty - Property Types
// ===========================================

export type PropertyType =
  | "apartment"
  | "house"
  | "condo"
  | "studio"
  | "villa"
  | "land";
export type PropertyStatus =
  | "available"
  | "rented"
  | "maintenance"
  | "unlisted";
export type PropertyCategory = "sale" | "rental" | "management";

export interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface PropertyFeatures {
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  parkingSpaces?: number;
  furnished?: boolean;
  petFriendly?: boolean;
  amenities?: string[];
  availabilityCalendar?: {
    availableFrom?: string;
    availableTo?: string;
  };
}

export interface PropertyImage {
  url: string;
  key?: string;
  caption?: string;
  isPrimary?: boolean;
  order?: number;
  uploadedAt?: Date;
}

export interface Property {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  type: PropertyType;
  status: PropertyStatus;
  category?: PropertyCategory;
  price: number;
  currency: string;
  address: PropertyAddress;
  features?: PropertyFeatures;
  images?: PropertyImage[];
  virtualTour?: string;
  ownerId: string;
  managerId?: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PropertyListResponse {
  properties: Property[];
  total: number;
  page: number;
  limit: number;
}

export interface PortfolioSummary {
  totals: {
    properties: number;
    listed: number;
    rented: number;
    maintenance: number;
    avgPrice: number;
  };
  byCategory: Record<PropertyCategory, number>;
  byStatus: Record<PropertyStatus, number>;
  topCities: Array<{ city: string; count: number }>;
  dataQuality: {
    missingDescription: number;
    missingImages: number;
    missingCoordinates: number;
    missingCoreFeatures: number;
    avgCompletenessScore: number;
  };
}

export interface PortfolioExportResponse {
  fileName: string;
  contentType: string;
  csv: string;
}

export interface PortfolioBinaryFileResponse {
  fileName: string;
  contentType: string;
  base64: string;
}

export interface CreatePropertyDto {
  title: string;
  description?: string;
  type: PropertyType;
  status?: PropertyStatus;
  category?: PropertyCategory;
  price: number;
  currency?: string;
  address: PropertyAddress;
  features?: PropertyFeatures;
}

export interface UpdatePropertyDto extends Partial<CreatePropertyDto> {}

export interface PropertyFilters {
  page?: number;
  limit?: number;
  type?: PropertyType;
  status?: PropertyStatus;
  category?: PropertyCategory;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  nearLat?: number;
  nearLng?: number;
  radiusKm?: number;
  city?: string;
  search?: string;
  ownerId?: string;
  managerId?: string;
}

export interface PortfolioFilters {
  type?: PropertyType;
  status?: PropertyStatus;
  category?: PropertyCategory;
  city?: string;
  scope?: "owner" | "manager" | "all";
}

export interface PortfolioImportIssue {
  rowNumber: number;
  code: string;
  message: string;
}

export interface PortfolioImportRow {
  title: string;
  description?: string;
  type: PropertyType;
  status: PropertyStatus;
  category: PropertyCategory;
  price: string;
  currency?: string;
  city: string;
  country: string;
  street?: string;
  state?: string;
  zipCode?: string;
  ownerId?: string;
  managerId?: string;
  lat?: string;
  lng?: string;
}

export interface PortfolioImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: number;
  errors: PortfolioImportIssue[];
  warningItems: PortfolioImportIssue[];
  acceptedRows: PortfolioImportRow[];
}

export interface PortfolioImportCommitResult {
  created: number;
  skipped: number;
  failed: number;
  issues: PortfolioImportIssue[];
}

export type PortfolioConnectorId = "seloger" | "leboncoin" | "webhook";

export interface PortfolioConnectorDefinition {
  id: PortfolioConnectorId;
  label: string;
  description: string;
  supportsPush: boolean;
  requiredFields: string[];
}

export interface PortfolioConnectorSyncRequest extends PortfolioFilters {
  connectorId: PortfolioConnectorId;
  dryRun?: boolean;
  endpointUrl?: string;
}

export interface PortfolioConnectorSyncResult {
  connectorId: PortfolioConnectorId;
  dryRun: boolean;
  totalRecords: number;
  mappedRecords: number;
  failedRecords: number;
  pushedRecords: number;
  endpointUrl?: string;
  payloadSample: Array<Record<string, unknown>>;
  issues: PortfolioImportIssue[];
}
