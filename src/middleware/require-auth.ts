import type { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth/auth.ts';

// Rejects requests without a valid Better Auth session. Attach to any router
// whose routes must only be reachable by a logged-in admin.
export async function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(req.headers),
	});
	if (!session) {
		res.status(401).json({ error: 'Unauthorized' });
		return;
	}
	next();
}
