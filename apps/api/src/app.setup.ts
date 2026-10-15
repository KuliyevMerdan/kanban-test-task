import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import type { Env } from './config/env';

/**
 * App-level HTTP settings shared by main.ts and e2e tests, so tests hit the same
 * routes as production. Validation and error handling are registered as global
 * providers in AppModule and apply automatically.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });
  app.enableShutdownHooks();
}

export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Kanban API').setVersion('1.0').build(),
  );
  SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(document));
}
