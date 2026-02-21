// ===========================================
// SmartProperty - Application Entry Point
// ===========================================

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
const compression = require('compression');
/* eslint-enable @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;
  const nodeEnv = configService.get<string>('app.nodeEnv') || 'development';

  // =====================
  // Security Middleware
  // =====================
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // =====================
  // Compression
  // =====================
  app.use(compression());

  // =====================
  // CORS Configuration
  // =====================
  app.enableCors({
    origin:
      configService.get<string>('app.corsOrigin') || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // =====================
  // Global Prefix
  // =====================
  app.setGlobalPrefix('api');

  // =====================
  // Validation Pipe
  // =====================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // =====================
  // Swagger Documentation
  // =====================
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SmartProperty API')
      .setDescription(
        `
## SmartProperty - Property Management Platform API

This API provides endpoints for:
- 🔐 **Authentication** - User registration, login, and token management
- 👥 **Users** - User profile management
- 🏠 **Properties** - Property listing and management
- 📝 **Applications** - Rental application processing
- 💰 **Payments** - Payment processing and tracking
- 🔔 **Notifications** - Real-time notifications

### Authentication
All protected endpoints require a Bearer token in the Authorization header.
      `,
      )
      .setVersion('1.0.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description:
          'Enter JWT token in the format: your_token_here (without "Bearer" prefix)',
        in: 'header',
      })
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Properties', 'Property management endpoints')
      .addTag('Applications', 'Rental application endpoints')
      .addTag('Payments', 'Payment processing endpoints')
      .addTag('Notifications', 'Notification endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customCssUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css',
    });
  }

  // =====================
  // Start Server
  // =====================
  await app.listen(port);

  logger.log(`🚀 SmartProperty API running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
  logger.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
}

void bootstrap();
