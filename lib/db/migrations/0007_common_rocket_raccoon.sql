-- Needed for GIN indexing on text[]
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS "client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"dob" date NOT NULL,
	"gender" text DEFAULT 'Prefer not to say' NOT NULL,
	"insurance_company" text DEFAULT '' NOT NULL,
	"chief_complaint" text DEFAULT '' NOT NULL,
	"diagnosis" text[] DEFAULT '{}'::text[] NOT NULL,
	"medications" text DEFAULT '' NOT NULL,
	"treatment_goals" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transcript" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"session_datetime" timestamp with time zone NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client" ADD CONSTRAINT "client_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transcript" ADD CONSTRAINT "transcript_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transcript_client_id_idx" ON "transcript" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transcript_client_session_unique_idx" ON "transcript" USING btree ("client_id","session_datetime");
--> statement-breakpoint
-- Manually added GIN index for client diagnosis array
CREATE INDEX IF NOT EXISTS "client_diagnosis_gin_idx" ON "client" USING gin ("diagnosis");