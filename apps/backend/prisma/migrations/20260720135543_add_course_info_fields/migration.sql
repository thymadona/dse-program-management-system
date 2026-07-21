-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('Basic', 'Core', 'Elective', 'Specialization', 'MoeysHeip');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "courseType" "CourseType",
ADD COLUMN     "credits" INTEGER,
ADD COLUMN     "prerequisites" TEXT;

-- AlterTable
ALTER TABLE "Offering" ADD COLUMN     "otherLecturers" TEXT;
