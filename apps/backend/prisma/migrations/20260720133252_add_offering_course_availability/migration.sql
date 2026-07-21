-- CreateEnum
CREATE TYPE "Semester" AS ENUM ('First', 'Second');

-- AlterTable
ALTER TABLE "Offering" ADD COLUMN     "programmeYear" INTEGER,
ADD COLUMN     "semester" "Semester";
