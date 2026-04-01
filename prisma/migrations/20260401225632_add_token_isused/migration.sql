-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "isUsed" BOOLEAN NOT NULL DEFAULT false;
