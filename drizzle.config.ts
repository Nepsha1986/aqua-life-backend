import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile();
} catch {
  // .env is missing — rely on already-set environment variables
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set — check your .env file');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/*.ts',
  out: './drizzle',
  dbCredentials: {
    url: databaseUrl,
  },
});
