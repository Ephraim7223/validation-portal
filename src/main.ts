import * as dotenv from 'dotenv';
dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  if (corsOrigins && corsOrigins.trim().length > 0) {
    const origins = corsOrigins.split(',').map((o) => o.trim()).filter(Boolean);
    app.enableCors({
      origin: origins,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true,
    });
  } else {
    // Preserve prior live behavior when CORS_ORIGINS is unset
    app.enableCors();
    logger.warn(
      'CORS_ORIGINS is empty — allowing all origins. Set CORS_ORIGINS in production.',
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter(configService));
  app.setGlobalPrefix('/api/v1');

  const swaggerEnabled =
    configService.get<string>('SWAGGER_ENABLED') !== 'false' &&
    configService.get<boolean>('SWAGGER_ENABLED') !== false;

  if (swaggerEnabled) {
    const swaggerPath = configService.get<string>('SWAGGER_PATH') || 'docs';
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Validation Portal API')
      .setDescription(
        `
## Overview
REST API for the Validation Portal — hub onboarding, applicant management, interviews, payments, and admin authentication.

## Authentication
Protected routes expect a JWT Bearer token issued by:
- \`POST /api/v1/auth/sign-in\` (admin / Super-admin)
- \`POST /api/v1/hubs/login\` (hub)

Include the header: \`Authorization: Bearer <token>\`

## Response envelope
Successful and handled responses use:
\`\`\`json
{
  "statusCode": 200,
  "message": "string",
  "data": {},
  "error": null
}
\`\`\`

## Notes
- Global prefix: \`/api/v1\`
- File uploads use \`multipart/form-data\`
- Rate limiting is applied globally
      `.trim(),
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste the JWT access token (without the Bearer prefix)',
        },
        'JWT',
      )
      .addTag('Health', 'Liveness / keep-alive probes')
      .addTag('Auth', 'Admin authentication')
      .addTag('Hubs', 'Hub registration, login, and hub-scoped operations')
      .addTag('Users', 'Applicant registration and user administration')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    logger.log(
      `Swagger docs available at /${swaggerPath}`,
    );
  }

  const port = configService.get<number>('PORT') || 7700;
  await app.listen(port);
  logger.log(`VALIDATOR PORTAL ~ server running on port: [${port}]`);
}
bootstrap();
