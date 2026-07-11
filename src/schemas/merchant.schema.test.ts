import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	merchantSchema,
	createMerchantSchema,
	updateMerchantSchema,
} from './merchant.schema.ts';

test('createMerchantSchema accepts valid input', () => {
	const result = createMerchantSchema.safeParse({
		name: 'Acme',
		email: 'a@acme.com',
	});
	assert.equal(result.success, true);
});

test('createMerchantSchema rejects empty name', () => {
	const result = createMerchantSchema.safeParse({ name: '', email: 'a@acme.com' });
	assert.equal(result.success, false);
});

test('createMerchantSchema rejects bad email', () => {
	const result = createMerchantSchema.safeParse({ name: 'Acme', email: 'nope' });
	assert.equal(result.success, false);
});

test('updateMerchantSchema rejects empty object', () => {
	const result = updateMerchantSchema.safeParse({});
	assert.equal(result.success, false);
});

test('updateMerchantSchema accepts partial input', () => {
	const result = updateMerchantSchema.safeParse({ email: 'b@acme.com' });
	assert.equal(result.success, true);
});

test('schemas expose OpenAPI component ids', () => {
	assert.equal(merchantSchema.meta()?.id, 'Merchant');
	assert.equal(createMerchantSchema.meta()?.id, 'CreateMerchant');
	assert.equal(updateMerchantSchema.meta()?.id, 'UpdateMerchant');
});
