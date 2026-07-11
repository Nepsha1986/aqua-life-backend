import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.ts';

const app = createApp();
const server = app.listen(0);
const { port } = server.address() as { port: number };
const base = `http://localhost:${port}`;

after(() => server.close());

test('GET /openapi.json returns the spec as JSON', async () => {
	const res = await fetch(`${base}/openapi.json`);
	assert.equal(res.status, 200);
	assert.match(res.headers.get('content-type') ?? '', /application\/json/);
	const body = await res.json();
	assert.equal(body.openapi, '3.1.0');
	assert.ok(body.paths['/merchants']);
});

test('GET /docs returns the Scalar UI as HTML', async () => {
	const res = await fetch(`${base}/docs`);
	assert.equal(res.status, 200);
	assert.match(res.headers.get('content-type') ?? '', /text\/html/);
});
