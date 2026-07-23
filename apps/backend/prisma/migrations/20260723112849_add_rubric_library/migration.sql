-- CreateEnum
CREATE TYPE "RubricStatus" AS ENUM ('Active', 'Draft', 'Archived');

-- CreateTable
CREATE TABLE "Rubric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "levels" JSONB NOT NULL DEFAULT '[]',
    "criteria" JSONB NOT NULL DEFAULT '[]',
    "status" "RubricStatus" NOT NULL DEFAULT 'Draft',
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Rubric_status_idx" ON "Rubric"("status");

-- AddForeignKey
ALTER TABLE "Rubric" ADD CONSTRAINT "Rubric_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
