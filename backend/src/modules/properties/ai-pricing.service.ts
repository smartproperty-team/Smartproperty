// ===========================================
// SmartProperty - AI Pricing Service (Proxy)
// ===========================================

import {
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type {
  PriceSuggestionResponse,
  SuggestPriceDto,
} from './dto/suggest-price.dto';

@Injectable()
export class AiPricingService {
  private readonly logger = new Logger(AiPricingService.name);
  private readonly aiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.aiBaseUrl =
      this.configService.get<string>('AI_SERVICES_URL') ||
      'http://localhost:8000';
  }

  async suggestPrice(dto: SuggestPriceDto): Promise<PriceSuggestionResponse> {
    const url = `${this.aiBaseUrl}/api/v1/pricing/predict`;

    const payload = {
      property_type: dto.propertyType,
      city: dto.city,
      governorate: dto.governorate,
      area_sqm: dto.areaSqm,
      bedrooms: dto.bedrooms ?? 1,
      bathrooms: dto.bathrooms ?? 1,
      parking_spaces: dto.parkingSpaces ?? 0,
      furnished: dto.furnished ?? false,
      pet_friendly: dto.petFriendly ?? false,
      amenities: dto.amenities ?? [],
    };

    try {
      const response = await axios.post(url, payload, { timeout: 30_000 });
      const d = response.data;

      return {
        predictedPrice: d.predicted_price,
        rentalPrice: d.rental_price ?? d.predicted_price,
        salePrice: d.sale_price,
        currency: d.currency,
        confidence: d.confidence,
        priceRange: d.price_range,
        salePriceRange: d.sale_price_range,
        baseRatePerSqm: d.base_rate_per_sqm,
        method: d.method,
        factors: d.factors,
      };
    } catch (error: any) {
      this.logger.error(`AI pricing error: ${error.message}`);

      if (error.code === 'ECONNABORTED') {
        throw new GatewayTimeoutException('AI pricing service timed out');
      }

      const status = error.response?.status;
      if (status && status >= 400 && status < 500) {
        throw new BadRequestException(
          error.response?.data?.detail || 'Invalid pricing request',
        );
      }

      throw new ServiceUnavailableException(
        'AI pricing service is unavailable',
      );
    }
  }
}
