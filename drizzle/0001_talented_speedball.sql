
ALTER TABLE "trades" ALTER COLUMN "session" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."session_name";--> statement-breakpoint
CREATE TYPE "public"."session_name" AS ENUM('pre_market', 'asian', 'sydney', 'london', 'overlap', 'new_york', 'post_market');--> statement-breakpoint
ALTER TABLE "trades" ALTER COLUMN "session" SET DATA TYPE "public"."session_name" USING "session"::"public"."session_name";
