import type { Request, Response, NextFunction } from 'express';

// Drizzle wraps the underlying pg error (a DatabaseError carrying the SQLSTATE
// `code`) in a DrizzleQueryError, exposing the original on `.cause`. Walk the
// cause chain to find a string `code`, so we can classify DB errors regardless
// of how deeply they're wrapped.
function findDbErrorCode(err: unknown): string | undefined {
	let current = err;
	for (let depth = 0; current !== null && typeof current === 'object' && depth < 5; depth++) {
		if ('code' in current && typeof current.code === 'string') {
			return current.code;
		}
		current = 'cause' in current ? current.cause : undefined;
	}
	return undefined;
}

export function errorHandler(
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void {
	if (
		err !== null &&
		typeof err === 'object' &&
		'type' in err &&
		err.type === 'entity.parse.failed'
	) {
		res.status(400).json({ error: 'Invalid JSON body' });
		return;
	}
	// Postgres foreign_key_violation (e.g. a store referencing a merchantId that
	// does not exist). The value is well-formed but points to no row, so it's a
	// client error, not a server fault.
	if (findDbErrorCode(err) === '23503') {
		res.status(400).json({ error: 'Referenced record does not exist' });
		return;
	}
	res.status(500).json({ error: 'Internal Server Error' });
}
