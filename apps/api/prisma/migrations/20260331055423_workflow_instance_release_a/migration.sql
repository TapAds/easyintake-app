-- AlterTable
ALTER TABLE "IntakeSession" ADD COLUMN     "evidenceCompletenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WorkflowInstance" (
    "id" TEXT NOT NULL,
    "intakeSessionId" TEXT NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'INITIAL_INTAKE',
    "requirementsJson" JSONB NOT NULL DEFAULT '[]',
    "preferredChannel" TEXT,
    "nudgeCount" INTEGER NOT NULL DEFAULT 0,
    "maxNudges" INTEGER NOT NULL DEFAULT 3,
    "lastNudgeAt" TIMESTAMP(3),
    "silenceWindowHours" INTEGER NOT NULL DEFAULT 22,
    "nextAllowedNudgeAt" TIMESTAMP(3),
    "escalationReason" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "assignedToUserId" TEXT,
    "lastIngestionAt" TIMESTAMP(3),
    "lastChannel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowEvent" (
    "id" TEXT NOT NULL,
    "workflowInstanceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowInstance_intakeSessionId_key" ON "WorkflowInstance"("intakeSessionId");

-- CreateIndex
CREATE INDEX "WorkflowInstance_phase_idx" ON "WorkflowInstance"("phase");

-- CreateIndex
CREATE INDEX "WorkflowEvent_workflowInstanceId_createdAt_idx" ON "WorkflowEvent"("workflowInstanceId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_intakeSessionId_fkey" FOREIGN KEY ("intakeSessionId") REFERENCES "IntakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
