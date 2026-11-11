CREATE TYPE "public"."photo_source" AS ENUM('guest', 'stand');--> statement-breakpoint
CREATE TABLE "event_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"source" "photo_source" NOT NULL,
	"guest_id" uuid,
	"device_id" text,
	"uploader_name" text,
	"filename" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "photo_stand_token" text;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "photo_token" text;--> statement-breakpoint
-- existing guests get a photo link of 32 random bytes in base64url, like newToken()
UPDATE "guests" SET "photo_token" = translate(encode(decode(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64'), '+/=', '-_');--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "photo_token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "event_photos" ADD CONSTRAINT "event_photos_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_photos" ADD CONSTRAINT "event_photos_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_photos_event_id_idx" ON "event_photos" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_photos_guest_id_idx" ON "event_photos" USING btree ("guest_id");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_photo_stand_token_unique" UNIQUE("photo_stand_token");--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_photo_token_unique" UNIQUE("photo_token");