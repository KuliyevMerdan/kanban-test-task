import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

/**
 * The real app (same setup as main.ts) on a fresh schema built by the real migrations.
 * The database comes from setup-env.ts (always a "_test" one).
 */
export async function createTestApp(): Promise<{ app: INestApplication; dataSource: DataSource }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  await dataSource.dropDatabase();
  await dataSource.runMigrations();
  return { app, dataSource };
}
