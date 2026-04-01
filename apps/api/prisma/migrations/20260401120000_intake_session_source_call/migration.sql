-- AlterTable
ALTER TABLE "IntakeSession" ADD COLUMN "sourceCallId" TEXT;

-- CreateIndex
CREATE INDEX "IntakeSession_sourceCallId_idx" ON "IntakeSession"("sourceCallId");

-- AddForeignKey
ALTER TABLE "IntakeSession" ADD CONSTRAINT "IntakeSession_sourceCallId_fkey" FOREIGN KEY ("sourceCallId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;
