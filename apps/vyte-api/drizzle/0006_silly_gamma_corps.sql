ALTER TABLE "events" ADD COLUMN "save_the_date_token" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "save_the_date_note" text;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_save_the_date_token_unique" UNIQUE("save_the_date_token");