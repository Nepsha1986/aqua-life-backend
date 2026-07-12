import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { merchants } from './merchants.ts';

export const stores = pgTable('stores', {
	id: uuid('id').primaryKey().defaultRandom(),
	merchantId: uuid('merchant_id').references(() => merchants.id, {
		onDelete: 'set null',
	}),
	name: text('name').notNull(),
	kind: text('kind').notNull(),
	description: text('description'),
	website: text('website'),
	email: text('email'),
	phone: text('phone'),
	country: text('country'),
	city: text('city'),
	address: text('address'),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
});
