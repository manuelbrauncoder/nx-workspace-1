CREATE TABLE "legal_pages" (
	"key" text PRIMARY KEY NOT NULL,
	"html" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
