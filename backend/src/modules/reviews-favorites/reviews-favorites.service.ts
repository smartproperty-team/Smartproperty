import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import {
  Application,
  ApplicationStatus,
} from '../applications/entities/application.entity';
import { Property } from '../properties/entities/property.entity';
import { User, UserRole } from '../users/entities/user.entity';
import {
  hasPlatformAdminRole,
  REVIEW_MODERATION_ROLES,
} from '../users/role-groups';
import {
  CreatePropertyReviewDto,
  ModeratePropertyReviewDto,
  RespondToReviewDto,
  ReviewModerationQueryDto,
  UpdatePropertyReviewDto,
} from './dto/reviews-favorites.dto';
import { Favorite } from './entities/favorite.entity';
import {
  PropertyReview,
  PropertyReviewStatus,
} from './entities/property-review.entity';

@Injectable()
export class ReviewsFavoritesService {
  constructor(
    @InjectRepository(PropertyReview)
    private readonly reviewsRepo: MongoRepository<PropertyReview>,
    @InjectRepository(Favorite)
    private readonly favoritesRepo: MongoRepository<Favorite>,
    @InjectRepository(Property)
    private readonly propertiesRepo: MongoRepository<Property>,
    @InjectRepository(User)
    private readonly usersRepo: MongoRepository<User>,
    @InjectRepository(Application)
    private readonly applicationsRepo: MongoRepository<Application>,
  ) {}

  private toObjectId(value: string, errorMessage: string): ObjectId {
    if (!ObjectId.isValid(value)) {
      throw new BadRequestException(errorMessage);
    }

    return new ObjectId(value);
  }

  private normalizeUserId(value: unknown): string | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (value instanceof ObjectId) {
      return value.toHexString();
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'toHexString' in value &&
      typeof (value as { toHexString?: unknown }).toHexString === 'function'
    ) {
      return (value as { toHexString: () => string }).toHexString();
    }

    return String(value);
  }

  private normalizeIdFilter(id: string): { $in: Array<string | ObjectId> } {
    const idVariants: Array<string | ObjectId> = [id];

    if (ObjectId.isValid(id)) {
      idVariants.push(new ObjectId(id));
    }

    return { $in: idVariants };
  }

  private async findPropertyOrFail(propertyId: string): Promise<Property> {
    const property = await this.propertiesRepo.findOne({
      where: { _id: this.toObjectId(propertyId, 'Invalid property id') },
    });

    if (!property || property.deletedAt) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  private async findReviewOrFail(reviewId: string): Promise<PropertyReview> {
    const review = await this.reviewsRepo.findOne({
      where: { _id: this.toObjectId(reviewId, 'Invalid review id') },
    });

    if (!review || review.deletedAt) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  private toAuthorSummary(user?: User | null) {
    if (!user) {
      return {
        id: null,
        name: 'Anonymous user',
      };
    }

    const firstName = user.firstName?.trim() || '';
    const lastName = user.lastName?.trim() || '';
    const lastInitial = lastName ? `${lastName.charAt(0)}.` : '';
    const name = `${firstName} ${lastInitial}`.trim() || 'Tenant';

    return {
      id: user.id,
      name,
    };
  }

  private toReviewResponse(review: PropertyReview, author?: User | null) {
    return {
      id: review.id,
      propertyId: review.propertyId,
      authorId: review.authorId,
      author: this.toAuthorSummary(author),
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      status: review.status,
      moderationReason: review.moderationReason,
      moderatedBy: review.moderatedBy,
      moderatedAt: review.moderatedAt,
      ownerResponse: review.ownerResponse,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private canModerateProperty(
    property: Property,
    moderatorId: string,
    role: UserRole,
  ): boolean {
    if (hasPlatformAdminRole(role)) {
      return true;
    }

    if (role === UserRole.OWNER) {
      return property.ownerId === moderatorId;
    }

    if (
      role === UserRole.BRANCH_MANAGER ||
      role === UserRole.REAL_ESTATE_AGENT ||
      role === UserRole.RENTAL_MANAGER
    ) {
      return property.managerId === moderatorId;
    }

    return false;
  }

  private assertModerationRole(role: UserRole): void {
    if (!REVIEW_MODERATION_ROLES.includes(role)) {
      throw new ForbiddenException('You are not allowed to moderate reviews');
    }
  }

  private async assertTenantCanReview(
    userId: string,
    propertyId: string,
  ): Promise<void> {
    const tenant = await this.usersRepo.findOne({
      where: {
        _id: this.toObjectId(userId, 'Invalid tenant id'),
        deletedAt: null,
      } as any,
    });

    if (!tenant || tenant.role !== UserRole.TENANT) {
      throw new ForbiddenException('Only tenants can submit reviews');
    }

    if (!tenant.isEmailVerified) {
      throw new ForbiddenException(
        'Email verification is required before submitting a review',
      );
    }

    const approvedApplication = await this.applicationsRepo.findOne({
      where: {
        propertyId,
        tenantId: this.normalizeIdFilter(userId),
        status: ApplicationStatus.APPROVED,
        deletedAt: null,
      } as any,
    });

    if (!approvedApplication) {
      throw new ForbiddenException(
        'Only tenants with an approved application can review this property',
      );
    }
  }

  async listApprovedPropertyReviews(propertyId: string) {
    await this.findPropertyOrFail(propertyId);

    const reviews = await this.reviewsRepo.find({
      where: {
        propertyId,
        status: PropertyReviewStatus.APPROVED,
        deletedAt: null,
      } as any,
      order: {
        createdAt: 'DESC',
      },
    });

    const authorIds = Array.from(
      new Set(reviews.map((review) => review.authorId).filter(Boolean)),
    ).filter((id) => ObjectId.isValid(id));

    const authors = authorIds.length
      ? await this.usersRepo.find({
          where: {
            _id: { $in: authorIds.map((id) => new ObjectId(id)) } as any,
          },
        })
      : [];

    const authorsById = new Map(authors.map((author) => [author.id, author]));

    const payload = reviews.map((review) =>
      this.toReviewResponse(review, authorsById.get(review.authorId)),
    );

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number(
            (
              reviews.reduce((sum, review) => sum + review.rating, 0) /
              totalReviews
            ).toFixed(2),
          )
        : 0;

    return {
      summary: {
        totalReviews,
        averageRating,
      },
      reviews: payload,
    };
  }

  async getMyPropertyReview(propertyId: string, userId: string) {
    await this.findPropertyOrFail(propertyId);

    const review = await this.reviewsRepo.findOne({
      where: {
        propertyId,
        authorId: this.normalizeIdFilter(userId),
        deletedAt: null,
      } as any,
      order: {
        updatedAt: 'DESC',
      },
    });

    if (!review) {
      return null;
    }

    const author = await this.usersRepo.findOne({
      where: { _id: this.toObjectId(userId, 'Invalid user id') },
    });

    return this.toReviewResponse(review, author);
  }

  async createReview(
    propertyId: string,
    dto: CreatePropertyReviewDto,
    userId: string,
  ) {
    await this.findPropertyOrFail(propertyId);
    await this.assertTenantCanReview(userId, propertyId);

    const existing = await this.reviewsRepo.findOne({
      where: {
        propertyId,
        authorId: this.normalizeIdFilter(userId),
        deletedAt: null,
      } as any,
    });

    if (existing) {
      throw new ConflictException(
        'You already submitted a review for this property',
      );
    }

    const review = this.reviewsRepo.create({
      propertyId,
      authorId: userId,
      rating: dto.rating,
      title: dto.title?.trim(),
      comment: dto.comment.trim(),
      status: PropertyReviewStatus.PENDING,
    });

    const saved = await this.reviewsRepo.save(review);
    const author = await this.usersRepo.findOne({
      where: { _id: this.toObjectId(userId, 'Invalid user id') },
    });

    return this.toReviewResponse(saved, author);
  }

  async updateOwnReview(
    reviewId: string,
    dto: UpdatePropertyReviewDto,
    userId: string,
  ) {
    const review = await this.findReviewOrFail(reviewId);

    if (
      this.normalizeUserId(review.authorId) !== this.normalizeUserId(userId)
    ) {
      throw new ForbiddenException('You can only edit your own review');
    }

    let hasChanges = false;

    if (dto.rating !== undefined) {
      review.rating = dto.rating;
      hasChanges = true;
    }

    if (dto.title !== undefined) {
      review.title = dto.title?.trim();
      hasChanges = true;
    }

    if (dto.comment !== undefined) {
      review.comment = dto.comment.trim();
      hasChanges = true;
    }

    if (!hasChanges) {
      throw new BadRequestException('No review fields provided for update');
    }

    review.status = PropertyReviewStatus.PENDING;
    review.moderationReason = undefined;
    review.moderatedBy = undefined;
    review.moderatedAt = undefined;
    review.ownerResponse = undefined;

    const saved = await this.reviewsRepo.save(review);
    const author = await this.usersRepo.findOne({
      where: { _id: this.toObjectId(userId, 'Invalid user id') },
    });

    return this.toReviewResponse(saved, author);
  }

  async deleteOwnReview(reviewId: string, userId: string) {
    const review = await this.findReviewOrFail(reviewId);

    if (
      this.normalizeUserId(review.authorId) !== this.normalizeUserId(userId)
    ) {
      throw new ForbiddenException('You can only delete your own review');
    }

    review.deletedAt = new Date();
    await this.reviewsRepo.save(review);

    return {
      id: review.id,
      deleted: true,
    };
  }

  async listModerationQueue(
    userId: string,
    role: UserRole,
    query: ReviewModerationQueryDto,
  ) {
    this.assertModerationRole(role);

    const where: Record<string, unknown> = {
      deletedAt: null,
      status: query.status || PropertyReviewStatus.PENDING,
    };

    if (query.propertyId) {
      where.propertyId = query.propertyId;
    }

    const reviews = await this.reviewsRepo.find({
      where: where as any,
      order: {
        createdAt: 'DESC',
      },
    });

    if (!reviews.length) {
      return {
        total: 0,
        reviews: [],
      };
    }

    const propertyIds = Array.from(
      new Set(reviews.map((review) => review.propertyId).filter(Boolean)),
    ).filter((id) => ObjectId.isValid(id));

    const properties = await this.propertiesRepo.find({
      where: {
        _id: { $in: propertyIds.map((id) => new ObjectId(id)) } as any,
        deletedAt: null,
      } as any,
    });

    const propertiesById = new Map(
      properties.map((property) => [property.id, property]),
    );

    const visibleReviews = reviews.filter((review) => {
      const property = propertiesById.get(review.propertyId);

      if (!property) {
        return false;
      }

      return this.canModerateProperty(property, userId, role);
    });

    const authorIds = Array.from(
      new Set(visibleReviews.map((review) => review.authorId).filter(Boolean)),
    ).filter((id) => ObjectId.isValid(id));

    const authors = authorIds.length
      ? await this.usersRepo.find({
          where: {
            _id: { $in: authorIds.map((id) => new ObjectId(id)) } as any,
          },
        })
      : [];

    const authorsById = new Map(authors.map((author) => [author.id, author]));

    const payload = visibleReviews.map((review) => {
      const property = propertiesById.get(review.propertyId);

      return {
        ...this.toReviewResponse(review, authorsById.get(review.authorId)),
        property: property
          ? {
              id: property.id,
              title: property.title,
              city: property.address?.city,
              ownerId: property.ownerId,
              managerId: property.managerId,
            }
          : null,
      };
    });

    return {
      total: payload.length,
      reviews: payload,
    };
  }

  async moderateReview(
    reviewId: string,
    dto: ModeratePropertyReviewDto,
    userId: string,
    role: UserRole,
  ) {
    this.assertModerationRole(role);

    const review = await this.findReviewOrFail(reviewId);
    const property = await this.findPropertyOrFail(review.propertyId);

    if (!this.canModerateProperty(property, userId, role)) {
      throw new ForbiddenException(
        'You do not have access to moderate reviews for this property',
      );
    }

    review.status = dto.status;
    review.moderationReason = dto.reason?.trim();
    review.moderatedBy = userId;
    review.moderatedAt = new Date();

    const saved = await this.reviewsRepo.save(review);
    const author = await this.usersRepo.findOne({
      where: {
        _id: this.toObjectId(review.authorId, 'Invalid review author id'),
      },
    });

    return this.toReviewResponse(saved, author);
  }

  async respondToReview(
    reviewId: string,
    dto: RespondToReviewDto,
    userId: string,
    role: UserRole,
  ) {
    this.assertModerationRole(role);

    const review = await this.findReviewOrFail(reviewId);

    if (review.status !== PropertyReviewStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved reviews can receive an official response',
      );
    }

    const property = await this.findPropertyOrFail(review.propertyId);

    if (!this.canModerateProperty(property, userId, role)) {
      throw new ForbiddenException(
        'You do not have access to respond to this review',
      );
    }

    review.ownerResponse = {
      message: dto.message.trim(),
      respondedBy: userId,
      respondedAt: new Date(),
    };

    const saved = await this.reviewsRepo.save(review);
    const author = await this.usersRepo.findOne({
      where: {
        _id: this.toObjectId(review.authorId, 'Invalid review author id'),
      },
    });

    return this.toReviewResponse(saved, author);
  }

  async listMyFavorites(userId: string) {
    const favorites = await this.favoritesRepo.find({
      where: {
        userId: this.normalizeIdFilter(userId),
        deletedAt: null,
      } as any,
      order: {
        createdAt: 'DESC',
      },
    });

    if (!favorites.length) {
      return {
        total: 0,
        favorites: [],
      };
    }

    const propertyIds = Array.from(
      new Set(favorites.map((favorite) => favorite.propertyId).filter(Boolean)),
    ).filter((id) => ObjectId.isValid(id));

    const properties = await this.propertiesRepo.find({
      where: {
        _id: { $in: propertyIds.map((id) => new ObjectId(id)) } as any,
        deletedAt: null,
      } as any,
    });

    const propertyMap = new Map(
      properties.map((property) => [property.id, property]),
    );

    const payload = favorites
      .map((favorite) => {
        const property = propertyMap.get(favorite.propertyId);

        if (!property) {
          return null;
        }

        return {
          id: favorite.id,
          propertyId: favorite.propertyId,
          createdAt: favorite.createdAt,
          property: property.toJSON(),
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item);

    return {
      total: payload.length,
      favorites: payload,
    };
  }

  async getFavoriteStatus(propertyId: string, userId: string) {
    await this.findPropertyOrFail(propertyId);

    const favorite = await this.favoritesRepo.findOne({
      where: {
        propertyId,
        userId: this.normalizeIdFilter(userId),
        deletedAt: null,
      } as any,
    });

    return {
      propertyId,
      favorited: !!favorite,
      favoriteId: favorite?.id,
    };
  }

  async addFavorite(propertyId: string, userId: string) {
    await this.findPropertyOrFail(propertyId);

    const existing = await this.favoritesRepo.findOne({
      where: {
        propertyId,
        userId: this.normalizeIdFilter(userId),
      } as any,
      order: {
        createdAt: 'DESC',
      },
    });

    if (existing && !existing.deletedAt) {
      return {
        propertyId,
        favorited: true,
        favoriteId: existing.id,
      };
    }

    if (existing && existing.deletedAt) {
      existing.deletedAt = undefined;
      existing.updatedAt = new Date();
      const restored = await this.favoritesRepo.save(existing);

      return {
        propertyId,
        favorited: true,
        favoriteId: restored.id,
      };
    }

    const created = this.favoritesRepo.create({
      propertyId,
      userId,
    });

    const saved = await this.favoritesRepo.save(created);

    return {
      propertyId,
      favorited: true,
      favoriteId: saved.id,
    };
  }

  async removeFavorite(propertyId: string, userId: string) {
    await this.findPropertyOrFail(propertyId);

    const existing = await this.favoritesRepo.findOne({
      where: {
        propertyId,
        userId: this.normalizeIdFilter(userId),
        deletedAt: null,
      } as any,
      order: {
        createdAt: 'DESC',
      },
    });

    if (!existing) {
      return {
        propertyId,
        favorited: false,
      };
    }

    existing.deletedAt = new Date();
    await this.favoritesRepo.save(existing);

    return {
      propertyId,
      favorited: false,
    };
  }
}
