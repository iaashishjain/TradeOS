import {
  pgTable,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  pgEnum,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

// ── Enums ──
export const marketTypeEnum = pgEnum("market_type", [
  "forex",
  "crypto",
  "commodities",
  "cfd",
]);

export const directionEnum = pgEnum("direction", ["long", "short"]);

export const tradeStatusEnum = pgEnum("trade_status", [
  "open",
  "closed",
  "cancelled",
]);

export const tradeOutcomeEnum = pgEnum("trade_outcome", [
  "win",
  "loss",
  "breakeven",
]);

export const sessionEnum = pgEnum("session_name", [
  "asian",
  "london",
  "new_york",
  "overlap",
]);

export const reviewRatingEnum = pgEnum("review_rating", [
  "1",
  "2",
  "3",
  "4",
  "5",
]);

export const customOptionTypeEnum = pgEnum("custom_option_type", [
  "strategy",
  "setup",
  "what_worked",
  "mistake",
  "instrument",
]);

// ── Trades ──
export const trades = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  symbol: text("symbol").notNull(),
  marketType: marketTypeEnum("market_type").notNull(),
  direction: directionEnum("direction").notNull(),
  status: tradeStatusEnum("status").notNull().default("open"),
  outcome: tradeOutcomeEnum("outcome"),
  session: sessionEnum("session"),

  // Pricing
  entryPrice: numeric("entry_price", { precision: 18, scale: 8 }).notNull(),
  exitPrice: numeric("exit_price", { precision: 18, scale: 8 }),
  stopLoss: numeric("stop_loss", { precision: 18, scale: 8 }),
  takeProfit: numeric("take_profit", { precision: 18, scale: 8 }),
  
  // Position & Risk
  positionSize: numeric("position_size", { precision: 18, scale: 8 }).notNull(),
  accountSize: numeric("account_size", { precision: 18, scale: 2 }),
  riskAmount: numeric("risk_amount", { precision: 18, scale: 2 }),
  riskPercent: numeric("risk_percent", { precision: 8, scale: 4 }),
  pipsCaptured: numeric("pips_captured", { precision: 12, scale: 2 }),

  // Results
  pnl: numeric("pnl", { precision: 18, scale: 2 }),
  pnlPercent: numeric("pnl_percent", { precision: 10, scale: 4 }),
  fees: numeric("fees", { precision: 18, scale: 2 }).default("0"),
  riskRewardRatio: numeric("risk_reward_ratio", { precision: 8, scale: 2 }),
  rMultiple: numeric("r_multiple", { precision: 8, scale: 2 }),

  // Timing
  entryDate: timestamp("entry_date").notNull(),
  exitDate: timestamp("exit_date"),

  // Strategy & Setup
  strategy: text("strategy"),
  setup: text("setup"),
  timeframe: text("timeframe"),
  
  // Notes & Analysis
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  whatWorked: jsonb("what_worked").$type<string[]>().default([]),
  mistakes: jsonb("mistakes").$type<string[]>().default([]),
  whatIDid: text("what_i_did"),
  whatIShouldHaveDone: text("what_i_should_have_done"),
  
  // Emotions
  emotionEntry: text("emotion_entry"),
  emotionExit: text("emotion_exit"),
  confidence: integer("confidence"),

  // Screenshots
  screenshotBefore: text("screenshot_before"),
  screenshotAfter: text("screenshot_after"),

  playbookId: uuid("playbook_id"),
  accountId: uuid("account_id"),
  isMissed: boolean("is_missed").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Custom Options (reusable strategies, setups, etc.) ──
export const customOptions = pgTable("custom_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: customOptionTypeEnum("type").notNull(),
  value: text("value").notNull(),
  color: text("color"),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Playbooks ──
export const playbooks = pgTable("playbooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  marketType: marketTypeEnum("market_type"),
  rules: jsonb("rules").$type<string[]>().default([]),
  entryConditions: jsonb("entry_conditions").$type<string[]>().default([]),
  exitConditions: jsonb("exit_conditions").$type<string[]>().default([]),
  riskManagement: text("risk_management"),
  timeframes: jsonb("timeframes").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Daily Reviews ──
export const dailyReviews = pgTable("daily_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: timestamp("date").notNull(),
  rating: reviewRatingEnum("rating").notNull(),
  preMarketPlan: text("pre_market_plan"),
  postMarketReview: text("post_market_review"),
  lessonsLearned: text("lessons_learned"),
  emotionalState: text("emotional_state"),
  followedPlan: boolean("followed_plan"),
  improvements: jsonb("improvements").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Trade Media ──
export const tradeMedia = pgTable("trade_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  tradeId: uuid("trade_id").references(() => trades.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption"),
  mediaType: text("media_type").notNull().default("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Account Settings ──
export const accountSettings = pgTable("account_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountName: text("account_name").notNull().default("Main Account"),
  broker: text("broker").default(""),
  startingBalance: numeric("starting_balance", { precision: 18, scale: 2 })
    .notNull()
    .default("10000"),
  currentBalance: numeric("current_balance", { precision: 18, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
  isDefault: boolean("is_default").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Type exports ──
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type CustomOption = typeof customOptions.$inferSelect;
export type NewCustomOption = typeof customOptions.$inferInsert;
export type Playbook = typeof playbooks.$inferSelect;
export type NewPlaybook = typeof playbooks.$inferInsert;
export type DailyReview = typeof dailyReviews.$inferSelect;
export type NewDailyReview = typeof dailyReviews.$inferInsert;
export type TradeMedia = typeof tradeMedia.$inferSelect;
export type AccountSettings = typeof accountSettings.$inferSelect;
