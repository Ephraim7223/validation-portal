import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger(
    bootstrap.name.charAt(0).toUpperCase() + bootstrap.name.slice(1),
  );

  const configService = new ConfigService();
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('/api/v1');

  const port = configService.get<string>('PORT') || 7700;
  await app.listen(port, () => {
    logger.log(`VALIDATOR PORTAL ~ server running on port: [${port}]`);
  });
}
bootstrap();
