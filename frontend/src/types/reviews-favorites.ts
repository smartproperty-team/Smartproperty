import type { Property } from "./property";

export type PropertyReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "hidden";

export interface PropertyReviewAuthor {
  id: string | null;
  name: string;
}

export interface PropertyReviewOwnerResponse {
  message: string;
  respondedBy: string;
  respondedAt: string;
}

export interface PropertyReview {
  id: string;
  propertyId: string;
  authorId: string;
  author: PropertyReviewAuthor;
  rating: number;
  title?: string;
  comment: string;
  status: PropertyReviewStatus;
  moderationReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  ownerResponse?: PropertyReviewOwnerResponse;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyReviewSummary {
  totalReviews: number;
  averageRating: number;
}

export interface PropertyReviewListResponse {
  summary: PropertyReviewSummary;
  reviews: PropertyReview[];
}

export interface FavoriteStatusResponse {
  propertyId: string;
  favorited: boolean;
  favoriteId?: string;
}

export interface FavoriteItem {
  id: string;
  propertyId: string;
  createdAt: string;
  property: Property;
}

export interface FavoriteListResponse {
  total: number;
  favorites: FavoriteItem[];
}

export interface CreatePropertyReviewDto {
  rating: number;
  title?: string;
  comment: string;
}

export interface UpdatePropertyReviewDto {
  rating?: number;
  title?: string;
  comment?: string;
}

export interface ModerateReviewDto {
  status: Exclude<PropertyReviewStatus, "pending">;
  reason?: string;
}

export interface RespondToReviewDto {
  message: string;
}

export interface ModerationQueueItem extends PropertyReview {
  property: {
    id: string;
    title: string;
    city?: string;
    ownerId?: string;
    managerId?: string;
  } | null;
}

export interface ModerationQueueResponse {
  total: number;
  reviews: ModerationQueueItem[];
}
