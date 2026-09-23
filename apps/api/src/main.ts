import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  const config = app.get(ConfigService<AppConfig, true>);
  app.enableCors({ origin: config.getOrThrow('CORS_ORIGINS') });
  await app.listen(config.getOrThrow('PORT'), '0.0.0.0');
}

void bootstrap();
