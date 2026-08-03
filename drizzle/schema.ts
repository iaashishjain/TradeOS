import { pgTable, uuid, text, numeric, boolean, timestamp, integer, jsonb, foreignKey, serial, real, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const customOptionType = pgEnum("custom_option_type", ['strategy', 'setup', 'what_worked', 'mistake', 'instrument'])
export const direction = pgEnum("direction", ['long', 'short'])
export const marketType = pgEnum("market_type", ['forex', 'crypto', 'commodities', 'cfd'])
export const reviewRating = pgEnum("review_rating", ['1', '2', '3', '4', '5'])
export const sessionName = pgEnum("session_name", ['asian', 'london', 'new_york', 'overlap'])
export const tradeOutcome = pgEnum("trade_outcome", ['win', 'loss', 'breakeven'])
export const tradeStatus = pgEnum("trade_status", ['open', 'closed', 'cancelled'])


export const accountSettings = pgTable("account_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountName: text("account_name").default('Main Account').notNull(),
	broker: text().default('').notNull(),
	startingBalance: numeric("starting_balance", { precision: 18, scale:  2 }).default('10000').notNull(),
	currentBalance: numeric("current_balance", { precision: 18, scale:  2 }),
	currency: text().default('USD').notNull(),
	isDefault: boolean("is_default").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const customOptions = pgTable("custom_options", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: customOptionType().notNull(),
	value: text().notNull(),
	color: text(),
	usageCount: integer("usage_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const dailyReviews = pgTable("daily_reviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	rating: reviewRating().notNull(),
	preMarketPlan: text("pre_market_plan"),
	postMarketReview: text("post_market_review"),
	lessonsLearned: text("lessons_learned"),
	emotionalState: text("emotional_state"),
	followedPlan: boolean("followed_plan"),
	improvements: jsonb().default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const playbooks = pgTable("playbooks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	marketType: marketType("market_type"),
	rules: jsonb().default([]),
	entryConditions: jsonb("entry_conditions").default([]),
	exitConditions: jsonb("exit_conditions").default([]),
	riskManagement: text("risk_management"),
	timeframes: jsonb().default([]),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const tradeMedia = pgTable("trade_media", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tradeId: uuid("trade_id"),
	url: text().notNull(),
	caption: text(),
	mediaType: text("media_type").default('image').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [trades.id],
			name: "trade_media_trade_id_trades_id_fk"
		}).onDelete("cascade"),
]);

export const playingWithNeon = pgTable("playing_with_neon", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	value: real(),
});

export const trades = pgTable("trades", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	symbol: text().notNull(),
	marketType: marketType("market_type").notNull(),
	direction: direction().notNull(),
	status: tradeStatus().default('open').notNull(),
	outcome: tradeOutcome(),
	session: sessionName(),
	entryPrice: numeric("entry_price", { precision: 18, scale:  8 }).notNull(),
	exitPrice: numeric("exit_price", { precision: 18, scale:  8 }),
	stopLoss: numeric("stop_loss", { precision: 18, scale:  8 }),
	takeProfit: numeric("take_profit", { precision: 18, scale:  8 }),
	positionSize: numeric("position_size", { precision: 18, scale:  8 }).notNull(),
	accountSize: numeric("account_size", { precision: 18, scale:  2 }),
	riskAmount: numeric("risk_amount", { precision: 18, scale:  2 }),
	riskPercent: numeric("risk_percent", { precision: 8, scale:  4 }),
	pipsCaptured: numeric("pips_captured", { precision: 12, scale:  2 }),
	pnl: numeric({ precision: 18, scale:  2 }),
	pnlPercent: numeric("pnl_percent", { precision: 10, scale:  4 }),
	fees: numeric({ precision: 18, scale:  2 }).default('0'),
	riskRewardRatio: numeric("risk_reward_ratio", { precision: 8, scale:  2 }),
	rMultiple: numeric("r_multiple", { precision: 8, scale:  2 }),
	entryDate: timestamp("entry_date", { mode: 'string' }).notNull(),
	exitDate: timestamp("exit_date", { mode: 'string' }),
	strategy: text(),
	setup: text(),
	timeframe: text(),
	notes: text(),
	tags: jsonb().default([]),
	whatWorked: jsonb("what_worked").default([]),
	mistakes: jsonb().default([]),
	whatIDid: text("what_i_did"),
	whatIShouldHaveDone: text("what_i_should_have_done"),
	emotionEntry: text("emotion_entry"),
	emotionExit: text("emotion_exit"),
	confidence: integer(),
	screenshotBefore: text("screenshot_before"),
	screenshotAfter: text("screenshot_after"),
	playbookId: uuid("playbook_id"),
	accountId: uuid("account_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	isMissed: boolean("is_missed").default(false).notNull(),
});
