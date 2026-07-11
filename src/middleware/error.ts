import type { Request, Response, NextFunction } from 'express';

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
	res.status(500).json({ error: 'Internal Server Error' });
}
