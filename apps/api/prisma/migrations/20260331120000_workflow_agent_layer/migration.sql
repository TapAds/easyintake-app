-- Workflow agent layer: interactions, dedupe, follow-up kinds, web verify, silence tag

ALTER TABLE "AgencyConfig" ADD COLUMN "silenceNurtureTagName" TEXT;

ALTER TABLE "IntakeSession" ADD COLUMN "webVerifiedPhone" TEXT;
ALTER TABLE "IntakeSession" ADD COLUMN "webVerifiedAt" TIMESTAMP(3);

ALTER TABLE "FollowUpJob" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'POST_CALL';
ALTER TABLE "FollowUpJob" ADD COLUMN "workflowInstanceId" TEXT;
ALTER TABLE "FollowUpJob" ADD COLUMN "workflowTargetKey" TEXT;

CREATE INDEX "FollowUpJob_workflowInstanceId_idx" ON "FollowUpJob"("workflowInstanceId");

ALTER TABLE "FollowUpJob" ADD CONSTRAINT "FollowUpJob_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "IntakeInteraction" (
    "id" TEXT NOT NULL,
    "intakeSessionId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "externalRef" TEXT,
    "callId" TEXT,
    "payloadSummary" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntakeInteraction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntakeInteraction_intakeSessionId_createdAt_idx" ON "IntakeInteraction"("intakeSessionId", "createdAt");

ALTER TABLE "IntakeInteraction" ADD CONSTRAINT "IntakeInteraction_intakeSessionId_fkey" FOREIGN KEY ("intakeSessionId") REFERENCES "IntakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeInteraction" ADD CONSTRAINT "IntakeInteraction_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "WorkflowIngestionDedupe" (
    "id" TEXT NOT NULL,
    "intakeSessionId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowIngestionDedupe_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkflowIngestionDedupe_intakeSessionId_idempotencyKey_key" ON "WorkflowIngestionDedupe"("intakeSessionId", "idempotencyKey");
CREATE INDEX "WorkflowIngestionDedupe_intakeSessionId_idx" ON "WorkflowIngestionDedupe"("intakeSessionId");

ALTER TABLE "WorkflowIngestionDedupe" ADD CONSTRAINT "WorkflowIngestionDedupe_intakeSessionId_fkey" FOREIGN KEY ("intakeSessionId") REFERENCES "IntakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "FollowUpJob" SET kind = 'GAP_CHASER' WHERE "intakeSessionId" IS NOT NULL AND "callId" IS NULL AND "chaserFieldKey" IS NOT NULL;
