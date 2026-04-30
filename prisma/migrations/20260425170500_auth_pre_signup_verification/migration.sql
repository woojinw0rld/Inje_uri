-- Add login and birth hash fields for app-level authentication.
ALTER TABLE "users"
ADD COLUMN "login_id" VARCHAR(100),
ADD COLUMN "birth_hash" VARCHAR(255);

CREATE UNIQUE INDEX "users_login_id_key" ON "users"("login_id");

-- Store one-time verification state between InjeCheck and register.
CREATE TABLE "pre_signup_verifications" (
  "token_hash" VARCHAR(255) NOT NULL,
  "student_number" VARCHAR(30) NOT NULL,
  "birth_hash" VARCHAR(255) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pre_signup_verifications_pkey" PRIMARY KEY ("token_hash")
);

CREATE INDEX "pre_signup_verifications_expires_at_idx"
ON "pre_signup_verifications"("expires_at");
