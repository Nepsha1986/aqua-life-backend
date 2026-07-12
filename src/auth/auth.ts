import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/client.ts';
import { user, session, account, verification } from '../db/schema/auth.ts';

// The admin UI runs on a separate origin in dev; add its URL so Better Auth
// accepts its requests and sets cross-origin cookies.
const trustedOrigins = ['http://localhost:3001'];

// Factory so the seed script can spin up an instance with sign-up enabled
// while the app-wide `auth` keeps public sign-up disabled.
export function createAuth({ enableSignUp = false }: { enableSignUp?: boolean } = {}) {
	return betterAuth({
		baseURL: process.env.BETTER_AUTH_URL,
		secret: process.env.BETTER_AUTH_SECRET,
		trustedOrigins,
		database: drizzleAdapter(db, {
			provider: 'pg',
			schema: { user, session, account, verification },
		}),
		emailAndPassword: {
			enabled: true,
			disableSignUp: !enableSignUp,
		},
	});
}

export const auth = createAuth();
