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

export interface CreatePropertyDto {
  title: string;
  description?: string;
  type: PropertyType;
  status?: PropertyStatus;
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
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  search?: string;
  ownerId?: string;
  managerId?: string;
}
