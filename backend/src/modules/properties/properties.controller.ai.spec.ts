// ===========================================
// PropertiesController AI route tests
// ===========================================

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { Reflector } from '@nestjs/core';
import { AiDescriptionService } from './ai-description.service';
import { AiPricingService } from './ai-pricing.service';
import { AiRecommendationService } from './ai-recommendation.service';
import { GenerateDescriptionDto } from './dto/ai-description.dto';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

describe('PropertiesController (AI description)', () => {
  let controller: PropertiesController;
  let aiService: { generateDescription: jest.Mock; getModelStatus: jest.Mock };

  beforeEach(async () => {
    aiService = {
      generateDescription: jest.fn(),
      getModelStatus: jest.fn(),
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PropertiesController],
      providers: [
        Reflector,
        { provide: PropertiesService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => '' } },
        { provide: AiDescriptionService, useValue: aiService },
        { provide: AiPricingService, useValue: { suggestPrice: jest.fn() } },
        {
          provide: AiRecommendationService,
          useValue: { getUserRecommendations: jest.fn() },
        },
      ],
    })
      // Override guards to allow direct controller calls
      .overrideGuard(require('../auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('../auth/guards/roles.guard').RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(PropertiesController);
  });

  it('forwards generation requests to AiDescriptionService', async () => {
    const dto: GenerateDescriptionDto = {
      propertyId: 'p1',
      propertySnapshot: { title: 'Cozy' } as any,
      tone: 'warm',
      lengths: ['short'],
      sourceLanguage: 'en',
      targetLanguages: ['en', 'fr'],
    };
    aiService.generateDescription.mockResolvedValue({
      variants: [],
      metadata: {
        generationId: 'g',
        modelName: 'flan-t5-base',
        modelVersion: 'transformers',
        cacheHit: false,
        latencyMs: 0,
      },
    });

    const result = await controller.generateAiDescription(dto, 'user-1');

    expect(aiService.generateDescription).toHaveBeenCalledWith(
      dto,
      expect.any(String),
    );
    expect(result.metadata.modelName).toBe('flan-t5-base');
  });

  it('exposes model status via aiService', async () => {
    aiService.getModelStatus.mockResolvedValue({
      generation: { loaded: false },
    });
    const result = await controller.getAiModelStatus();
    expect(result).toEqual({ generation: { loaded: false } });
  });
});
