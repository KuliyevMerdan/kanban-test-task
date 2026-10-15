import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for the Docker image (node apps/web/server.js).
  output: 'standalone',
  // Trace from the monorepo root, so workspace packages (@kanban/shared) get included.
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
