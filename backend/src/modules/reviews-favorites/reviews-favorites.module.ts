import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/entities/application.entity';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { Favorite } from './entities/favorite.entity';
import { PropertyReview } from './entities/property-review.entity';
import { FavoritesController } from './favorites.controller';
import { ReviewsFavoritesService } from './reviews-favorites.service';
import { ReviewsController } from './reviews.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PropertyReview,
      Favorite,
      Property,
      User,
      Application,
    ]),
  ],
  controllers: [ReviewsController, FavoritesController],
  providers: [ReviewsFavoritesService],
  exports: [ReviewsFavoritesService],
})
export class ReviewsFavoritesModule {}
