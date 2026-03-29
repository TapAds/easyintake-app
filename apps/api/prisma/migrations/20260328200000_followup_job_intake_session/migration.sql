-- Phase 5: Smart Chaser jobs can target IntakeSession (GHL inbound) without a Call row.

ALTER TABLE "FollowUpJob" ALTER COLUMN "callId" DROP NOT NULL;

ALTER TABLE "FollowUpJob" ADD COLUMN "intakeSessionId" TEXT,
ADD COLUMN "chaserFieldKey" TEXT;

CREATE INDEX "FollowUpJob_intakeSessionId_idx" ON "FollowUpJob"("intakeSessionId");

ALTER TABLE "FollowUpJob" ADD CONSTRAINT "FollowUpJob_intakeSessionId_fkey" FOREIGN KEY ("intakeSessionId") REFERENCES "IntakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
