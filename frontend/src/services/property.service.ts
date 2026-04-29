// ===========================================
// SmartProperty - Property Service
// ===========================================

import type {
  CreatePropertyDto,
  PortfolioBinaryFileResponse,
  PortfolioConnectorDefinition,
  PortfolioConnectorSyncRequest,
  PortfolioConnectorSyncResult,
  PortfolioExportResponse,
  PortfolioFilters,
  PortfolioImportCommitResult,
  PortfolioImportPreview,
  PortfolioImportRow,
  PortfolioSummary,
  Property,
  PropertyFilters,
  PropertyImage,
  PropertyListResponse,
  StagingJob,
  StagingStyle,
  UpdatePropertyDto,
} from "../types/property";
import { api } from "./api";

export interface PropertyShareData {
  shareUrl: string;
  qrCode: string;
}

export interface UploadImageOptions {
  generateVirtualTour?: boolean;
}

export interface PropertyRecommendationItem {
  property_id: string;
  title: string;
  score: number;
  price: number;
  property_type: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  match_reasons: string[];
  property: Property;
}

export interface PropertyRecommendationResponse {
  user_id: string;
  recommendations: PropertyRecommendationItem[];
  total_count: number;
  algorithm: string;
}

// ===========================================
// Property CRUD Operations
// ===========================================

export const propertyService = {
  /**
   * Get all properties with optional filters
   */
  async getProperties(
    filters: PropertyFilters = {},
  ): Promise<PropertyListResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());
    if (filters.type) params.append("type", filters.type);
    if (filters.status) params.append("status", filters.status);
    if (filters.category) params.append("category", filters.category);
    if (filters.minPrice)
      params.append("minPrice", filters.minPrice.toString());
    if (filters.maxPrice)
      params.append("maxPrice", filters.maxPrice.toString());
    if (filters.bedrooms !== undefined)
      params.append("bedrooms", filters.bedrooms.toString());
    if (filters.bathrooms !== undefined)
      params.append("bathrooms", filters.bathrooms.toString());
    if (filters.nearLat !== undefined)
      params.append("nearLat", filters.nearLat.toString());
    if (filters.nearLng !== undefined)
      params.append("nearLng", filters.nearLng.toString());
    if (filters.radiusKm !== undefined)
      params.append("radiusKm", filters.radiusKm.toString());
    if (filters.city) params.append("city", filters.city);
    if (filters.search) params.append("search", filters.search);
    if (filters.ownerId) params.append("ownerId", filters.ownerId);
    if (filters.managerId) params.append("managerId", filters.managerId);

    const response = await api.get<PropertyListResponse>(
      `/properties?${params.toString()}`,
    );
    return response.data;
  },

  /**
   * Get a single property by ID
   */
  async getProperty(id: string): Promise<Property> {
    const response = await api.get<Property>(`/properties/${id}`);
    return response.data;
  },

  /**
   * Get personalized best-match property recommendations for current tenant.
   */
  async getBestMatchRecommendations(
    limit = 6,
  ): Promise<PropertyRecommendationResponse> {
    const response = await api.get<PropertyRecommendationResponse>(
      "/properties/ai/recommendations/best-match",
      {
        params: { limit },
      },
    );
    return response.data;
  },

  /**
   * Get share link and QR code for a property
   */
  async getPropertyShareData(id: string): Promise<PropertyShareData> {
    const response = await api.get<PropertyShareData>(
      `/properties/${id}/share`,
    );
    return response.data;
  },

  /**
   * Create a new property
   */
  async createProperty(data: CreatePropertyDto): Promise<Property> {
    const response = await api.post<Property>("/properties", data);
    return response.data;
  },

  /**
   * Update an existing property
   */
  async updateProperty(id: string, data: UpdatePropertyDto): Promise<Property> {
    const response = await api.put<Property>(`/properties/${id}`, data);
    return response.data;
  },

  /**
   * Delete a property
   */
  async deleteProperty(id: string): Promise<void> {
    await api.delete(`/properties/${id}`);
  },

  async getPortfolioSummary(
    filters: PortfolioFilters = {},
  ): Promise<PortfolioSummary> {
    const params = new URLSearchParams();

    if (filters.type) params.append("type", filters.type);
    if (filters.status) params.append("status", filters.status);
    if (filters.category) params.append("category", filters.category);
    if (filters.city) params.append("city", filters.city);
    if (filters.scope) params.append("scope", filters.scope);

    const response = await api.get<PortfolioSummary>(
      `/properties/portfolio/summary?${params.toString()}`,
    );
    return response.data;
  },

  async exportPortfolioCsv(
    filters: PortfolioFilters = {},
  ): Promise<PortfolioExportResponse> {
    const params = new URLSearchParams();

    if (filters.type) params.append("type", filters.type);
    if (filters.status) params.append("status", filters.status);
    if (filters.category) params.append("category", filters.category);
    if (filters.city) params.append("city", filters.city);
    if (filters.scope) params.append("scope", filters.scope);

    const response = await api.get<PortfolioExportResponse>(
      `/properties/portfolio/export?${params.toString()}`,
    );
    return response.data;
  },

  async exportPortfolioExcel(
    filters: PortfolioFilters = {},
  ): Promise<PortfolioBinaryFileResponse> {
    const params = new URLSearchParams();

    if (filters.type) params.append("type", filters.type);
    if (filters.status) params.append("status", filters.status);
    if (filters.category) params.append("category", filters.category);
    if (filters.city) params.append("city", filters.city);
    if (filters.scope) params.append("scope", filters.scope);

    const response = await api.get<PortfolioBinaryFileResponse>(
      `/properties/portfolio/export/excel?${params.toString()}`,
    );

    return response.data;
  },

  async getPortfolioImportTemplateExcel(): Promise<PortfolioBinaryFileResponse> {
    const response = await api.get<PortfolioBinaryFileResponse>(
      "/properties/portfolio/template/excel",
    );

    return response.data;
  },

  async previewPortfolioImport(file: File): Promise<PortfolioImportPreview> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<PortfolioImportPreview>(
      "/properties/portfolio/import/preview",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  },

  async commitPortfolioImport(
    rows: PortfolioImportRow[],
    skipDuplicates = true,
  ): Promise<PortfolioImportCommitResult> {
    const response = await api.post<PortfolioImportCommitResult>(
      "/properties/portfolio/import/commit",
      {
        rows,
        skipDuplicates,
      },
    );

    return response.data;
  },

  async getPortfolioConnectors(): Promise<PortfolioConnectorDefinition[]> {
    const response = await api.get<PortfolioConnectorDefinition[]>(
      "/properties/portfolio/connectors",
    );

    return response.data;
  },

  async syncPortfolioConnector(
    payload: PortfolioConnectorSyncRequest,
  ): Promise<PortfolioConnectorSyncResult> {
    const response = await api.post<PortfolioConnectorSyncResult>(
      "/properties/portfolio/connectors/sync",
      payload,
    );

    return response.data;
  },

  // ===========================================
  // Property Images Operations
  // ===========================================

  /**
   * Upload images for a property
   */
  async uploadImages(
    propertyId: string,
    files: File[],
    options: UploadImageOptions = {},
  ): Promise<{
    property: Property;
    addedImages: PropertyImage[];
    totalImages: number;
  }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images", file);
    });

    if (options.generateVirtualTour) {
      formData.append("generateVirtualTour", "true");
    }

    const response = await api.post(
      `/properties/${propertyId}/images`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  /**
   * Get all images for a property
   */
  async getImages(propertyId: string): Promise<PropertyImage[]> {
    const response = await api.get<PropertyImage[]>(
      `/properties/${propertyId}/images`,
    );
    return response.data;
  },

  /**
   * Set primary image
   */
  async setPrimaryImage(
    propertyId: string,
    imageKey: string,
  ): Promise<Property> {
    const response = await api.patch<Property>(
      `/properties/${propertyId}/images/primary`,
      {
        imageKey,
      },
    );
    return response.data;
  },

  /**
   * Delete an image
   */
  async deleteImage(propertyId: string, imageKey: string): Promise<Property> {
    const encodedKey = encodeURIComponent(imageKey);
    const response = await api.delete<Property>(
      `/properties/${propertyId}/images/${encodedKey}`,
    );
    return response.data;
  },

  async updateImageCaption(
    propertyId: string,
    imageKey: string,
    caption: string,
  ): Promise<Property> {
    const encodedKey = encodeURIComponent(imageKey);
    const response = await api.patch<Property>(
      `/properties/${propertyId}/images/${encodedKey}/caption`,
      { caption },
    );
    return response.data;
  },

  /**
   * Save virtual tour hotspot configuration
   */
  async saveVirtualTourConfig(
    propertyId: string,
    config: import("../types/property").VirtualTourConfig,
  ): Promise<Property> {
    const response = await api.put<Property>(
      `/properties/${propertyId}/images/virtual-tour-config`,
      config,
    );
    return response.data;
  },

  /**
   * Delete all images
   */
  async deleteAllImages(propertyId: string): Promise<Property> {
    const response = await api.delete<Property>(
      `/properties/${propertyId}/images`,
    );
    return response.data;
  },

  /**
   * Trigger virtual tour generation for a property using already uploaded images
   */
  async triggerVirtualTourGeneration(
    propertyId: string,
    processNow = true,
  ): Promise<any> {
    const response = await api.post(
      `/properties/${propertyId}/images/virtual-tour/generate`,
      { processNow },
      { timeout: 90_000 },
    );
    return response.data;
  },

  /**
   * Generate AI marketing descriptions via the backend proxy.
   *
   * Uses a long per-request timeout because flan-t5 generation on CPU
   * commonly takes 10-25 seconds and must not be cut off by the default
   * 10s axios timeout.
   */
  async generateAiDescription(
    request: GenerateDescriptionRequest,
  ): Promise<GenerateDescriptionResponse> {
    const response = await api.post<GenerateDescriptionResponse>(
      "/properties/ai/descriptions/generate",
      request,
      { timeout: 90_000 },
    );
    return response.data;
  },

  // ===========================================
  // AI Virtual Staging
  // ===========================================

  async getStagingStyles(propertyId: string): Promise<StagingStyle[]> {
    const response = await api.get<StagingStyle[]>(
      `/properties/${propertyId}/images/staging/styles`,
    );
    return response.data;
  },

  async requestStaging(
    propertyId: string,
    params: {
      imageUrl: string;
      style: string;
      roomType?: string;
      strength?: number;
    },
  ): Promise<StagingJob> {
    const response = await api.post<StagingJob>(
      `/properties/${propertyId}/images/staging/generate`,
      params,
      { timeout: 120_000 },
    );
    return response.data;
  },

  async getStagingJobStatus(
    propertyId: string,
    jobId: string,
  ): Promise<StagingJob> {
    const response = await api.get<StagingJob>(
      `/properties/${propertyId}/images/staging/jobs/${jobId}`,
    );
    return response.data;
  },

  getStagingResultUrl(propertyId: string, jobId: string): string {
    return `/properties/${propertyId}/images/staging/result/${jobId}`;
  },

  /**
   * Get AI price suggestion for a Tunisian property.
   */
  async suggestPrice(
    request: SuggestPriceRequest,
  ): Promise<PriceSuggestionResponse> {
    const response = await api.post<PriceSuggestionResponse>(
      "/properties/ai/pricing/suggest",
      request,
      { timeout: 30_000 },
    );
    return response.data;
  },
};

// ===========================================
// AI pricing types
// ===========================================

export interface SuggestPriceRequest {
  propertyType: string;
  city: string;
  governorate?: string;
  areaSqm: number;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  furnished?: boolean;
  petFriendly?: boolean;
  amenities?: string[];
}

export interface PriceSuggestionResponse {
  predictedPrice: number;
  rentalPrice: number;
  salePrice: number;
  currency: string;
  confidence: number;
  priceRange: { low: number; high: number };
  salePriceRange: { low: number; high: number };
  baseRatePerSqm: number;
  method: string;
  factors: Array<{
    factor: string;
    impact: string;
    direction: string;
    description: string;
  }>;
}

// ===========================================
// AI description types
// ===========================================

export type AiDescriptionTone = "professional" | "warm" | "luxury";
export type AiDescriptionLength = "short" | "medium" | "long";

export interface AiPropertySnapshot {
  title?: string;
  propertyType?: string;
  city?: string;
  state?: string;
  country?: string;
  neighborhood?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqft?: number;
  yearBuilt?: number;
  furnished?: boolean;
  petFriendly?: boolean;
  parkingSpaces?: number;
  amenities?: string[];
  nearby?: string[];
  price?: number;
  currency?: string;
}

export interface GenerateDescriptionRequest {
  propertyId?: string;
  propertySnapshot?: AiPropertySnapshot;
  tone: AiDescriptionTone;
  lengths: AiDescriptionLength[];
  sourceLanguage: string;
  targetLanguages: string[];
  hintKeywords?: string[];
}

export interface GeneratedVariant {
  length: AiDescriptionLength;
  tone: AiDescriptionTone;
  language: string;
  text: string;
  wordCount: number;
}

export interface GenerationMetadata {
  generationId: string;
  modelName: string;
  modelVersion: string;
  cacheHit: boolean;
  latencyMs: number;
  propertyId?: string;
}

export interface GenerateDescriptionResponse {
  variants: GeneratedVariant[];
  metadata: GenerationMetadata;
}

export default propertyService;
