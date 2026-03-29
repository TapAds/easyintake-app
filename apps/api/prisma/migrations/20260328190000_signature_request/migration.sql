-- Phase 4: GHL proposal/template signature flow + reminders

CREATE TABLE "SignatureRequest" (
    "id" TEXT NOT NULL,
    "intakeSessionId" TEXT,
    "ghlLocationId" TEXT NOT NULL,
    "ghlContactId" TEXT NOT NULL,
    "ghlTemplateId" TEXT NOT NULL,
    "ghlDocumentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_send',
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "maxReminders" INTEGER NOT NULL DEFAULT 5,
    "nextReminderAt" TIMESTAMP(3),
    "lastError" TEXT,
    "signedWebhookId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),

    CONSTRAINT "SignatureRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SignatureRequest_ghlLocationId_ghlContactId_idx" ON "SignatureRequest"("ghlLocationId", "ghlContactId");

CREATE INDEX "SignatureRequest_status_nextReminderAt_idx" ON "SignatureRequest"("status", "nextReminderAt");

CREATE INDEX "SignatureRequest_intakeSessionId_idx" ON "SignatureRequest"("intakeSessionId");

ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_intakeSessionId_fkey" FOREIGN KEY ("intakeSessionId") REFERENCES "IntakeSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
