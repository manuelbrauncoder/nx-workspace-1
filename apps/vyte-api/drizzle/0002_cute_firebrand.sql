CREATE TYPE "public"."member_role" AS ENUM('owner', 'editor');--> statement-breakpoint
CREATE TABLE "event_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_images_event_id_position_key" UNIQUE("event_id","position")
);
--> statement-breakpoint
CREATE TABLE "event_members" (
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_members_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"location_name" text,
	"address" text,
	"all_day" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"time_zone" text NOT NULL,
	"rsvp_deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_images" ADD CONSTRAINT "event_images_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_members" ADD CONSTRAINT "event_members_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_members" ADD CONSTRAINT "event_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_members_user_id_idx" ON "event_members" USING btree ("user_id");