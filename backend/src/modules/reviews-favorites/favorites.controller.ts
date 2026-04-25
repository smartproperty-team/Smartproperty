import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FAVORITES_ROLES } from '../users/role-groups';
import { ReviewsFavoritesService } from './reviews-favorites.service';

@ApiTags('Favorites')
@ApiBearerAuth()
@Controller('favorites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FavoritesController {
  constructor(
    private readonly reviewsFavoritesService: ReviewsFavoritesService,
  ) {}

  @Get('mine')
  @Roles(...FAVORITES_ROLES)
  @ApiOperation({ summary: 'List my favorite properties' })
  @ApiResponse({ status: 200, description: 'Favorite properties returned' })
  listMine(@CurrentUser('id') userId: string) {
    return this.reviewsFavoritesService.listMyFavorites(userId);
  }

  @Get('property/:propertyId/status')
  @Roles(...FAVORITES_ROLES)
  @ApiOperation({ summary: 'Get favorite status for a property' })
  @ApiResponse({ status: 200, description: 'Favorite status returned' })
  getStatus(
    @Param('propertyId') propertyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsFavoritesService.getFavoriteStatus(propertyId, userId);
  }

  @Post('property/:propertyId')
  @Roles(...FAVORITES_ROLES)
  @ApiOperation({ summary: 'Add property to favorites' })
  @ApiResponse({ status: 201, description: 'Property added to favorites' })
  addFavorite(
    @Param('propertyId') propertyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsFavoritesService.addFavorite(propertyId, userId);
  }

  @Delete('property/:propertyId')
  @Roles(...FAVORITES_ROLES)
  @ApiOperation({ summary: 'Remove property from favorites' })
  @ApiResponse({ status: 200, description: 'Property removed from favorites' })
  removeFavorite(
    @Param('propertyId') propertyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsFavoritesService.removeFavorite(propertyId, userId);
  }
}
