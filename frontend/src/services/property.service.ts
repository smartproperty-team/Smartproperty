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
  UpdatePropertyDto,
} from "../types/property";
import { api } from "./api";

export interface PropertyShareData {
  shareUrl: string;
  qrCode: string;
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
  ): Promise<{
    property: Property;
    addedImages: PropertyImage[];
    totalImages: number;
  }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images", file);
    });

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

  /**
   * Delete all images
   */
  async deleteAllImages(propertyId: string): Promise<Property> {
    const response = await api.delete<Property>(
      `/properties/${propertyId}/images`,
    );
    return response.data;
  },
};

export default propertyService;
