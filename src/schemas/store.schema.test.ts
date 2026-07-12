import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	storeSchema,
	createStoreSchema,
	updateStoreSchema,
} from './store.schema.ts';

test('createStoreSchema accepts a minimal valid store', () => {
	const result = createStoreSchema.safeParse({ name: 'Reef Center', kind: 'physical' });
	assert.equal(result.success, true);
});

test('createStoreSchema accepts all optional fields', () => {
	const result = createStoreSchema.safeParse({
		name: 'Reef Center',
		kind: 'hybrid',
		merchantId: '9b1f2c3d-0000-4000-8000-000000000000',
		description: 'Marine specialists',
		website: 'https://reef.example',
		email: 'hi@reef.example',
		phone: '+1 555 0100',
		country: 'US',
		city: 'Austin',
		address: '1 Coral St',
	});
	assert.equal(result.success, true);
});

test('createStoreSchema rejects a missing name', () => {
	const result = createStoreSchema.safeParse({ kind: 'physical' });
	assert.equal(result.success, false);
});

test('createStoreSchema rejects an empty name', () => {
	const result = createStoreSchema.safeParse({ name: '', kind: 'physical' });
	assert.equal(result.success, false);
});

test('createStoreSchema rejects an unknown kind', () => {
	const result = createStoreSchema.safeParse({ name: 'Reef', kind: 'popup' });
	assert.equal(result.success, false);
});

test('createStoreSchema rejects a malformed website', () => {
	const result = createStoreSchema.safeParse({ name: 'Reef', kind: 'online', website: 'not-a-url' });
	assert.equal(result.success, false);
});

test('createStoreSchema rejects a malformed email', () => {
	const result = createStoreSchema.safeParse({ name: 'Reef', kind: 'online', email: 'nope' });
	assert.equal(result.success, false);
});

test('createStoreSchema accepts null merchantId', () => {
	const result = createStoreSchema.safeParse({ name: 'Reef', kind: 'physical', merchantId: null });
	assert.equal(result.success, true);
});

test('updateStoreSchema rejects an empty object', () => {
	const result = updateStoreSchema.safeParse({});
	assert.equal(result.success, false);
});

test('updateStoreSchema accepts a partial patch', () => {
	const result = updateStoreSchema.safeParse({ city: 'Dallas' });
	assert.equal(result.success, true);
});

test('schemas expose OpenAPI component ids', () => {
	assert.equal(storeSchema.meta()?.id, 'Store');
	assert.equal(createStoreSchema.meta()?.id, 'CreateStore');
	assert.equal(updateStoreSchema.meta()?.id, 'UpdateStore');
});
