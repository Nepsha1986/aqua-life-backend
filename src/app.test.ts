import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.ts';
import { _reset } from './store/merchants.store.ts';

const app = createApp();
const server = app.listen(0);
const { port } = server.address() as { port: number };
const base = `http://localhost:${port}/merchants`;

beforeEach(() => _reset());
after(() => server.close());

test('POST creates a merchant', async () => {
	const res = await fetch(base, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name: 'Acme', email: 'a@acme.com' }),
	});
	assert.equal(res.status, 201);
	const body = await res.json();
	assert.ok(body.id);
	assert.equal(body.name, 'Acme');
});

test('POST rejects invalid input with 400', async () => {
	const res = await fetch(base, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name: '', email: 'nope' }),
	});
	assert.equal(res.status, 400);
});

test('GET list returns created merchants', async () => {
	await fetch(base, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name: 'Acme', email: 'a@acme.com' }),
	});
	const res = await fetch(base);
	assert.equal(res.status, 200);
	const body = await res.json();
	assert.equal(body.length, 1);
});

test('GET by unknown id returns 404', async () => {
	const res = await fetch(`${base}/missing`);
	assert.equal(res.status, 404);
});

test('PATCH updates a merchant', async () => {
	const created = await (
		await fetch(base, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: 'Acme', email: 'a@acme.com' }),
		})
	).json();
	const res = await fetch(`${base}/${created.id}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name: 'Acme 2' }),
	});
	assert.equal(res.status, 200);
	const body = await res.json();
	assert.equal(body.name, 'Acme 2');
});

test('DELETE removes a merchant', async () => {
	const created = await (
		await fetch(base, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: 'Acme', email: 'a@acme.com' }),
		})
	).json();
	const res = await fetch(`${base}/${created.id}`, { method: 'DELETE' });
	assert.equal(res.status, 204);
	const check = await fetch(`${base}/${created.id}`);
	assert.equal(check.status, 404);
});
