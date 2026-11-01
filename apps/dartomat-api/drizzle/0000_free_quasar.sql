CREATE TYPE "public"."game_status" AS ENUM('active', 'finished');--> statement-breakpoint
CREATE TABLE "game_darts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"player_idx" integer NOT NULL,
	"multiplier" integer NOT NULL,
	"value" integer NOT NULL,
	"points" integer NOT NULL,
	"score_before" integer NOT NULL,
	"turn_darts_before" jsonb NOT NULL,
	"turn_ended" boolean NOT NULL,
	"bust" boolean NOT NULL,
	"won" boolean NOT NULL,
	CONSTRAINT "game_darts_game_sequence_unique" UNIQUE("game_id","sequence")
);
--> statement-breakpoint
CREATE TABLE "game_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"name" varchar(24) NOT NULL,
	"player_order" integer NOT NULL,
	"score" integer NOT NULL,
	CONSTRAINT "game_players_game_order_unique" UNIQUE("game_id","player_order")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_score" integer DEFAULT 301 NOT NULL,
	"double_out" boolean DEFAULT true NOT NULL,
	"status" "game_status" DEFAULT 'active' NOT NULL,
	"current_player_idx" integer DEFAULT 0 NOT NULL,
	"winner_idx" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "game_darts" ADD CONSTRAINT "game_darts_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_darts_game_id_idx" ON "game_darts" USING btree ("game_id");