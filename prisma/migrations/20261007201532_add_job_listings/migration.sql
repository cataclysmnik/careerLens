-- CreateEnum
CREATE TYPE "JobListingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateTable
CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "employmentType" TEXT NOT NULL,
    "ctc" TEXT,
    "deadline" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "requirements" JSONB,
    "status" "JobListingStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobListing_companyId_idx" ON "JobListing"("companyId");

-- CreateIndex
CREATE INDEX "JobListing_status_idx" ON "JobListing"("status");

-- CreateIndex
CREATE INDEX "JobApplication_studentId_idx" ON "JobApplication"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_listingId_studentId_key" ON "JobApplication"("listingId", "studentId");

-- AddForeignKey
ALTER TABLE "JobListing" ADD CONSTRAINT "JobListing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobListing" ADD CONSTRAINT "JobListing_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "JobListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
