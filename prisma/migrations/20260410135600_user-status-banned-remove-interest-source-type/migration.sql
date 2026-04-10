-- Rename enum value for user account status
ALTER TYPE "user_status" RENAME VALUE 'suspended' TO 'banned';

-- Remove deprecated source_type from interests
ALTER TABLE "interests" DROP COLUMN "source_type";
