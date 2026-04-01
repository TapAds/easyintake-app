-- AlterTable
ALTER TABLE "AgencyConfig" ADD COLUMN     "clerkOrganizationId" TEXT;

-- CreateIndex
CREATE INDEX "AgencyConfig_clerkOrganizationId_idx" ON "AgencyConfig"("clerkOrganizationId");
