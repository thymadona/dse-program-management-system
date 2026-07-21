-- CreateTable
CREATE TABLE "CourseSpec" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "status" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseSpec_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseSpec_courseId_key" ON "CourseSpec"("courseId");

-- AddForeignKey
ALTER TABLE "CourseSpec" ADD CONSTRAINT "CourseSpec_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
