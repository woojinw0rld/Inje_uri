ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;

CREATE TYPE "user_status_new" AS ENUM ('ACTIVE', 'SUSPENDED', 'WITHDRAWN');

ALTER TABLE "users"
  ALTER COLUMN "status" TYPE "user_status_new"
  USING (
    CASE "status"::text
      WHEN 'active' THEN 'ACTIVE'
      WHEN 'inactive' THEN 'SUSPENDED'
      WHEN 'banned' THEN 'SUSPENDED'
      WHEN 'suspended' THEN 'SUSPENDED'
      WHEN 'withdrawn' THEN 'WITHDRAWN'
      ELSE 'SUSPENDED'
    END
  )::"user_status_new";

DROP TYPE "user_status";
ALTER TYPE "user_status_new" RENAME TO "user_status";

ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
