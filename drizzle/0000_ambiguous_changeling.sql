-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."custom_option_type" AS ENUM('strategy', 'setup', 'what_worked', 'mistake', 'instrument');--> statement-breakpoint
CREATE TYPE "public"."direction" AS ENUM('long', 'short');--> statement-breakpoint
CREATE TYPE "public"."market_type" AS ENUM('forex', 'crypto', 'commodities', 'cfd');--> statement-breakpoint
CREATE TYPE "public"."review_rating" AS ENUM('1', '2', '3', '4', '5');--> statement-breakpoint
CREATE TYPE "public"."session_name" AS ENUM('asian', 'london', 'new_york', 'overlap');--> statement-breakpoint
CREATE TYPE "public"."trade_outcome" AS ENUM('win', 'loss', 'breakeven');--> statement-breakpoint
CREATE TYPE "public"."trade_status" AS ENUM('open', 'closed', 'cancelled');--> statement-breakpoint
CREATE TABLE "account_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_name" text DEFAULT 'Main Account' NOT NULL,
	"broker" text DEFAULT '',
	"starting_balance" numeric(18, 2) DEFAULT '10000' NOT NULL,
	"current_balance" numeric(18, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"is_default" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "custom_option_type" NOT NULL,
	"value" text NOT NULL,
	"color" text,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"rating" "review_rating" NOT NULL,
	"pre_market_plan" text,
	"post_market_review" text,
	"lessons_learned" text,
	"emotional_state" text,
	"followed_plan" boolean,
	"improvements" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"market_type" "market_type",
	"rules" jsonb DEFAULT '[]'::jsonb,
	"entry_conditions" jsonb DEFAULT '[]'::jsonb,
	"exit_conditions" jsonb DEFAULT '[]'::jsonb,
	"risk_management" text,
	"timeframes" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_id" uuid,
	"url" text NOT NULL,
	"caption" text,
	"media_type" text DEFAULT 'image' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playing_with_neon" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"value" real
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"market_type" "market_type" NOT NULL,
	"direction" "direction" NOT NULL,
	"status" "trade_status" DEFAULT 'open' NOT NULL,
	"outcome" "trade_outcome",
	"session" "session_name",
	"entry_price" numeric(18, 8) NOT NULL,
	"exit_price" numeric(18, 8),
	"stop_loss" numeric(18, 8),
	"take_profit" numeric(18, 8),
	"position_size" numeric(18, 8) NOT NULL,
	"account_size" numeric(18, 2),
	"risk_amount" numeric(18, 2),
	"risk_percent" numeric(8, 4),
	"pips_captured" numeric(12, 2),
	"pnl" numeric(18, 2),
	"pnl_percent" numeric(10, 4),
	"fees" numeric(18, 2) DEFAULT '0',
	"risk_reward_ratio" numeric(8, 2),
	"r_multiple" numeric(8, 2),
	"entry_date" timestamp NOT NULL,
	"exit_date" timestamp,
	"strategy" text,
	"setup" text,
	"timeframe" text,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"what_worked" jsonb DEFAULT '[]'::jsonb,
	"mistakes" jsonb DEFAULT '[]'::jsonb,
	"what_i_did" text,
	"what_i_should_have_done" text,
	"emotion_entry" text,
	"emotion_exit" text,
	"confidence" integer,
	"screenshot_before" text,
	"screenshot_after" text,
	"playbook_id" uuid,
	"account_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_missed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trade_media" ADD CONSTRAINT "trade_media_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;
*/