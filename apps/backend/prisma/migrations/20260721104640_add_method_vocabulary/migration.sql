-- CreateTable
CREATE TABLE "TeachingMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeachingMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeachingMethod_name_key" ON "TeachingMethod"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentMethod_name_key" ON "AssessmentMethod"("name");
