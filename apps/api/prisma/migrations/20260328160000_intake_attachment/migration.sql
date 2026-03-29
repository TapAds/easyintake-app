-- CreateTable
CREATE TABLE "IntakeAttachment" (
    "id" TEXT NOT NULL,
    "intakeSessionId" TEXT NOT NULL,
    "ghlMessageId" TEXT,
    "ghlContactId" TEXT NOT NULL,
    "inboundChannel" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "extractedPreview" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntakeAttachment_intakeSessionId_createdAt_idx" ON "IntakeAttachment"("intakeSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "IntakeAttachment_sha256_intakeSessionId_idx" ON "IntakeAttachment"("sha256", "intakeSessionId");

-- AddForeignKey
ALTER TABLE "IntakeAttachment" ADD CONSTRAINT "IntakeAttachment_intakeSessionId_fkey" FOREIGN KEY ("intakeSessionId") REFERENCES "IntakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
