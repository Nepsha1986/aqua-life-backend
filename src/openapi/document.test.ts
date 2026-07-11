import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openApiDocument } from './document.ts';

test('document declares OpenAPI 3.1.0', () => {
	assert.equal(openApiDocument.openapi, '3.1.0');
});

test('document registers the Merchant component schema', () => {
	assert.ok(openApiDocument.components?.schemas?.Merchant);
});

test('document exposes all merchant paths and methods', () => {
	const paths = openApiDocument.paths ?? {};
	assert.ok(paths['/merchants']?.post, 'POST /merchants');
	assert.ok(paths['/merchants']?.get, 'GET /merchants');
	assert.ok(paths['/merchants/{id}']?.get, 'GET /merchants/{id}');
	assert.ok(paths['/merchants/{id}']?.patch, 'PATCH /merchants/{id}');
	assert.ok(paths['/merchants/{id}']?.delete, 'DELETE /merchants/{id}');
});

test('POST /merchants documents 201 and 400', () => {
	const post = openApiDocument.paths?.['/merchants']?.post;
	assert.ok(post?.responses?.['201']);
	assert.ok(post?.responses?.['400']);
});

test('GET /merchants/{id} documents 404', () => {
	const get = openApiDocument.paths?.['/merchants/{id}']?.get;
	assert.ok(get?.responses?.['404']);
});
