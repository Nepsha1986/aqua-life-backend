import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index.ts';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error(
		'DATABASE_URL is not set. Create a .env file (see .env.example) and run the dev script.',
	);
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
