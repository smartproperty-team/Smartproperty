// ===========================================
// SmartProperty - App Service
// ===========================================

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HealthCheck {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

export interface ApiInfo {
  name: string;
  version: string;
  description: string;
  documentation: string;
  environment: string;
  endpoints: {
    health: string;
    docs: string;
  };
}

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Health check endpoint response
   */
  getHealth(): HealthCheck {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment:
        this.configService.get<string>('app.nodeEnv') || 'development',
      version: '1.0.0',
    };
  }

  /**
   * API information endpoint response
   */
  getApiInfo(): ApiInfo {
    const port = this.configService.get<number>('app.port') || 3000;
    const baseUrl = `http://localhost:${port}`;

    return {
      name: this.configService.get<string>('app.name') || 'SmartProperty API',
      version: '1.0.0',
      description: 'Property Management and Rental Matching Platform API',
      documentation: `${baseUrl}/api/docs`,
      environment:
        this.configService.get<string>('app.nodeEnv') || 'development',
      endpoints: {
        health: `${baseUrl}/api/health`,
        docs: `${baseUrl}/api/docs`,
      },
    };
  }
}
