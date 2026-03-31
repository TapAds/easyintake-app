-- CreateTable
CREATE TABLE "ApplicantPortalAccess" (
    "id" TEXT NOT NULL,
    "intakeSessionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicantPortalAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicantPortalAccess_tokenHash_key" ON "ApplicantPortalAccess"("tokenHash");

-- CreateIndex
CREATE INDEX "ApplicantPortalAccess_intakeSessionId_idx" ON "ApplicantPortalAccess"("intakeSessionId");

-- CreateIndex
CREATE INDEX "ApplicantPortalAccess_expiresAt_idx" ON "ApplicantPortalAccess"("expiresAt");

-- AddForeignKey
ALTER TABLE "ApplicantPortalAccess" ADD CONSTRAINT "ApplicantPortalAccess_intakeSessionId_fkey" FOREIGN KEY ("intakeSessionId") REFERENCES "IntakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
