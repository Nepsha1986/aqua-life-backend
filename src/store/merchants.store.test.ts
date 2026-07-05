import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
	list,
	findById,
	create,
	update,
	remove,
	_reset,
} from './merchants.store.ts';

beforeEach(() => {
	_reset();
});

test('create returns a merchant with generated fields', () => {
	const m = create({ name: 'Acme', email: 'a@acme.com' });
	assert.ok(m.id);
	assert.equal(m.name, 'Acme');
	assert.equal(m.email, 'a@acme.com');
	assert.ok(m.createdAt);
	assert.equal(m.updatedAt, m.createdAt);
});

test('list returns all created merchants', () => {
	create({ name: 'A', email: 'a@x.com' });
	create({ name: 'B', email: 'b@x.com' });
	assert.equal(list().length, 2);
});

test('findById returns the merchant or undefined', () => {
	const m = create({ name: 'Acme', email: 'a@acme.com' });
	assert.equal(findById(m.id)?.id, m.id);
	assert.equal(findById('missing'), undefined);
});

test('update changes fields and refreshes updatedAt', () => {
	const m = create({ name: 'Acme', email: 'a@acme.com' });
	const updated = update(m.id, { name: 'Acme 2' });
	assert.equal(updated?.name, 'Acme 2');
	assert.equal(updated?.email, 'a@acme.com');
});

test('update returns undefined for unknown id', () => {
	assert.equal(update('missing', { name: 'X' }), undefined);
});

test('remove deletes and reports success', () => {
	const m = create({ name: 'Acme', email: 'a@acme.com' });
	assert.equal(remove(m.id), true);
	assert.equal(findById(m.id), undefined);
	assert.equal(remove(m.id), false);
});
