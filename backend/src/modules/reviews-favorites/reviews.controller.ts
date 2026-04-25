import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import {
  REVIEW_AUTHOR_ROLES,
  REVIEW_MODERATION_ROLES,
} from '../users/role-groups';
import {
  CreatePropertyReviewDto,
  ModeratePropertyReviewDto,
  RespondToReviewDto,
  ReviewModerationQueryDto,
  UpdatePropertyReviewDto,
} from './dto/reviews-favorites.dto';
import { ReviewsFavoritesService } from './reviews-favorites.service';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(
    private readonly reviewsFavoritesService: ReviewsFavoritesService,
  ) {}

  @Public()
  @Get('property/:propertyId')
  @ApiOperation({ summary: 'List approved reviews for a property' })
  @ApiResponse({ status: 200, description: 'Property review list returned' })
  listPropertyReviews(@Param('propertyId') propertyId: string) {
    return this.reviewsFavoritesService.listApprovedPropertyReviews(propertyId);
  }

  @Get('property/:propertyId/mine')
  @Roles(...REVIEW_AUTHOR_ROLES)
  @ApiOperation({ summary: 'Get my review for a property' })
  @ApiResponse({ status: 200, description: 'Current tenant review returned' })
  getMyPropertyReview(
    @Param('propertyId') propertyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsFavoritesService.getMyPropertyReview(propertyId, userId);
  }

  @Post('property/:propertyId')
  @Roles(...REVIEW_AUTHOR_ROLES)
  @ApiOperation({ summary: 'Create a new property review (tenant only)' })
  @ApiResponse({
    status: 201,
    description: 'Review created and pending moderation',
  })
  createReview(
    @Param('propertyId') propertyId: string,
    @Body() dto: CreatePropertyReviewDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsFavoritesService.createReview(propertyId, dto, userId);
  }

  @Get('moderation/queue')
  @Roles(...REVIEW_MODERATION_ROLES)
  @ApiOperation({ summary: 'List reviews pending moderation for my scope' })
  @ApiResponse({ status: 200, description: 'Moderation queue returned' })
  listModerationQueue(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: ReviewModerationQueryDto,
  ) {
    return this.reviewsFavoritesService.listModerationQueue(
      userId,
      role,
      query,
    );
  }

  @Patch(':reviewId')
  @Roles(...REVIEW_AUTHOR_ROLES)
  @ApiOperation({ summary: 'Update my own review' })
  @ApiResponse({
    status: 200,
    description: 'Review updated and reset to pending',
  })
  updateOwnReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdatePropertyReviewDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsFavoritesService.updateOwnReview(reviewId, dto, userId);
  }

  @Delete(':reviewId')
  @Roles(...REVIEW_AUTHOR_ROLES)
  @ApiOperation({ summary: 'Delete my own review' })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  deleteOwnReview(
    @Param('reviewId') reviewId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsFavoritesService.deleteOwnReview(reviewId, userId);
  }

  @Patch(':reviewId/moderate')
  @Roles(...REVIEW_MODERATION_ROLES)
  @ApiOperation({ summary: 'Moderate property review' })
  @ApiResponse({ status: 200, description: 'Review moderation saved' })
  moderateReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: ModeratePropertyReviewDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.reviewsFavoritesService.moderateReview(
      reviewId,
      dto,
      userId,
      role,
    );
  }

  @Post(':reviewId/response')
  @Roles(...REVIEW_MODERATION_ROLES)
  @ApiOperation({
    summary: 'Publish an official response to an approved review',
  })
  @ApiResponse({ status: 201, description: 'Review response published' })
  respondToReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: RespondToReviewDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.reviewsFavoritesService.respondToReview(
      reviewId,
      dto,
      userId,
      role,
    );
  }
}
