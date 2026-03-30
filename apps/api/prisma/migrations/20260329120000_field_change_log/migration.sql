-- Field-level audit trail for extraction / agent HITL (canonical data reuse across channels).
ALTER TABLE "Call" ADD COLUMN "fieldChangeLog" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "IntakeSession" ADD COLUMN "fieldChangeLog" JSONB NOT NULL DEFAULT '[]';
