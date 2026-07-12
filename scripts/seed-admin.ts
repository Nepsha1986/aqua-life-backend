// Creates the single admin account from ADMIN_EMAIL / ADMIN_PASSWORD.
// Idempotent: if a user with that email already exists, it does nothing.
// Public sign-up is disabled on the app-wide auth instance, so this uses a
// dedicated instance with sign-up enabled.
import { eq } from 'drizzle-orm';
import { createAuth } from '../src/auth/auth.ts';
import { db } from '../src/db/client.ts';
import { user } from '../src/db/schema/auth.ts';

async function main(): Promise<void> {
	const email = process.env.ADMIN_EMAIL;
	const password = process.env.ADMIN_PASSWORD;
	if (!email || !password) {
		throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set (see .env).');
	}

	const existing = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, email))
		.limit(1);
	if (existing.length > 0) {
		console.log(`Admin '${email}' already exists — nothing to do.`);
		return;
	}

	const auth = createAuth({ enableSignUp: true });
	await auth.api.signUpEmail({
		body: { email, password, name: 'Admin' },
	});
	console.log(`Created admin '${email}'.`);
}

main()
	.then(() => process.exit(0))
	.catch((err: unknown) => {
		console.error('Failed to seed admin:', err);
		process.exit(1);
	});
