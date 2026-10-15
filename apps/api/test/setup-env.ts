// Runs before every e2e test file, before the app reads its config.
// Real env vars take precedence over apps/api/.env in @nestjs/config.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://kanban:kanban@localhost:5433/kanban_test';

// E2E tests wipe the schema, so never let them touch a non-test database.
if (!new URL(process.env.DATABASE_URL).pathname.endsWith('_test')) {
  throw new Error(`Refusing to run e2e tests against "${process.env.DATABASE_URL}"`);
}
