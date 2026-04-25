import type {
  CreatePropertyReviewDto,
  FavoriteListResponse,
  FavoriteStatusResponse,
  ModerateReviewDto,
  ModerationQueueResponse,
  PropertyReview,
  PropertyReviewListResponse,
  RespondToReviewDto,
  UpdatePropertyReviewDto,
} from "@/types/reviews-favorites";
import { api } from "./api";

export const reviewsFavoritesService = {
  async getPropertyReviews(
    propertyId: string,
  ): Promise<PropertyReviewListResponse> {
    const response = await api.get<PropertyReviewListResponse>(
      `/reviews/property/${propertyId}`,
    );
    return response.data;
  },

  async getMyPropertyReview(
    propertyId: string,
  ): Promise<PropertyReview | null> {
    const response = await api.get<PropertyReview | null>(
      `/reviews/property/${propertyId}/mine`,
    );
    return response.data;
  },

  async createPropertyReview(
    propertyId: string,
    payload: CreatePropertyReviewDto,
  ): Promise<PropertyReview> {
    const response = await api.post<PropertyReview>(
      `/reviews/property/${propertyId}`,
      payload,
    );
    return response.data;
  },

  async updatePropertyReview(
    reviewId: string,
    payload: UpdatePropertyReviewDto,
  ): Promise<PropertyReview> {
    const response = await api.patch<PropertyReview>(
      `/reviews/${reviewId}`,
      payload,
    );
    return response.data;
  },

  async deletePropertyReview(
    reviewId: string,
  ): Promise<{ id: string; deleted: boolean }> {
    const response = await api.delete<{ id: string; deleted: boolean }>(
      `/reviews/${reviewId}`,
    );
    return response.data;
  },

  async getModerationQueue(status?: string): Promise<ModerationQueueResponse> {
    const response = await api.get<ModerationQueueResponse>(
      "/reviews/moderation/queue",
      {
        params: status ? { status } : undefined,
      },
    );
    return response.data;
  },

  async moderateReview(
    reviewId: string,
    payload: ModerateReviewDto,
  ): Promise<PropertyReview> {
    const response = await api.patch<PropertyReview>(
      `/reviews/${reviewId}/moderate`,
      payload,
    );
    return response.data;
  },

  async respondToReview(
    reviewId: string,
    payload: RespondToReviewDto,
  ): Promise<PropertyReview> {
    const response = await api.post<PropertyReview>(
      `/reviews/${reviewId}/response`,
      payload,
    );
    return response.data;
  },

  async listMyFavorites(): Promise<FavoriteListResponse> {
    const response = await api.get<FavoriteListResponse>("/favorites/mine");
    return response.data;
  },

  async getFavoriteStatus(propertyId: string): Promise<FavoriteStatusResponse> {
    const response = await api.get<FavoriteStatusResponse>(
      `/favorites/property/${propertyId}/status`,
    );
    return response.data;
  },

  async addFavorite(propertyId: string): Promise<FavoriteStatusResponse> {
    const response = await api.post<FavoriteStatusResponse>(
      `/favorites/property/${propertyId}`,
    );
    return response.data;
  },

  async removeFavorite(propertyId: string): Promise<FavoriteStatusResponse> {
    const response = await api.delete<FavoriteStatusResponse>(
      `/favorites/property/${propertyId}`,
    );
    return response.data;
  },
};

export default reviewsFavoritesService;
