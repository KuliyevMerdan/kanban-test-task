import type { DataSourceOptions } from 'typeorm';
import { TaskEntity } from '../modules/tasks/task.entity';
import { migrations } from './migrations';

/**
 * Single source of DB settings for the app, the TypeORM CLI and e2e tests.
 * Entities and migrations are listed explicitly instead of globs: this works the same
 * from compiled JS, from ts-jest and after bundling.
 */
export function buildDataSourceOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: [TaskEntity],
    migrations,
    // gen_random_uuid() is built into Postgres 13+, unlike uuid-ossp's uuid_generate_v4().
    uuidExtension: 'pgcrypto',
    // Schema changes go only through migrations.
    synchronize: false,
    logging: ['error', 'warn', 'migration'],
  };
}
