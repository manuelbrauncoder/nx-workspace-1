CREATE TYPE "public"."answered_by" AS ENUM('guest', 'host');--> statement-breakpoint
CREATE TYPE "public"."guest_response" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"note" text,
	"max_companions" integer DEFAULT 0 NOT NULL,
	"token" text NOT NULL,
	"response" "guest_response" DEFAULT 'pending' NOT NULL,
	"companions" integer DEFAULT 0 NOT NULL,
	"companions_reduced" boolean DEFAULT false NOT NULL,
	"message" text,
	"answered_by" "answered_by",
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guests_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guests_event_id_idx" ON "guests" USING btree ("event_id");