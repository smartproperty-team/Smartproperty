// ===========================================
// PropertiesController validation route tests
// ===========================================

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AiDescriptionService } from './ai-description.service';
import { AiPricingService } from './ai-pricing.service';
import { AiRecommendationService } from './ai-recommendation.service';
import { PropertyType } from './entities/property.entity';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

describe('PropertiesController (validation)', () => {
  let app: INestApplication;
  const propertiesService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PropertiesController],
      providers: [
        Reflector,
        { provide: PropertiesService, useValue: propertiesService },
        { provide: ConfigService, useValue: { get: () => '' } },
        {
          provide: AiDescriptionService,
          useValue: {
            generateDescription: jest.fn(),
            getModelStatus: jest.fn(),
          },
        },
        {
          provide: AiPricingService,
          useValue: {
            suggestPrice: jest.fn(),
          },
        },
        {
          provide: AiRecommendationService,
          useValue: { getUserRecommendations: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) {
      await app.close();
    }
  });

  it('returns 400 when virtualTour is not a valid URL', async () => {
    propertiesService.create.mockResolvedValue({
      id: 'prop-1',
      toJSON: () => ({ id: 'prop-1' }),
    });

    const payload = {
      title: 'Validation test property',
      type: PropertyType.APARTMENT,
      price: 1500,
      address: {
        street: '123 Main St',
        city: 'Tunis',
        state: 'Tunis',
        zipCode: '1000',
        country: 'Tunisia',
      },
      virtualTour: 'not-a-valid-url',
    };

    const response = await request(app.getHttpServer())
      .post('/properties')
      .send(payload)
      .expect(400);

    expect(propertiesService.create).not.toHaveBeenCalled();
    expect(response.body.message).toContain(
      'virtualTour must be a URL address',
    );
  });
});
