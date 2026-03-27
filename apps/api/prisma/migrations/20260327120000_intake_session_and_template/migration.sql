-- CreateTable
CREATE TABLE "IntakeFieldTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "configPackageId" TEXT NOT NULL,
    "name" TEXT,
    "fieldDefinitions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeFieldTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "verticalId" TEXT NOT NULL,
    "configPackageId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'collecting',
    "substatus" TEXT,
    "primaryChannel" TEXT DEFAULT 'voice',
    "completenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fieldValues" JSONB NOT NULL DEFAULT '{}',
    "channels" JSONB NOT NULL DEFAULT '[]',
    "hitl" JSONB NOT NULL DEFAULT '{}',
    "externalIds" JSONB,
    "configTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeSession_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "intakeSessionId" TEXT;

-- CreateIndex
CREATE INDEX "IntakeFieldTemplate_organizationId_configPackageId_idx" ON "IntakeFieldTemplate"("organizationId", "configPackageId");

-- CreateIndex
CREATE INDEX "IntakeSession_organizationId_updatedAt_idx" ON "IntakeSession"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "IntakeSession_configPackageId_idx" ON "IntakeSession"("configPackageId");

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_intakeSessionId_fkey" FOREIGN KEY ("intakeSessionId") REFERENCES "IntakeSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeSession" ADD CONSTRAINT "IntakeSession_configTemplateId_fkey" FOREIGN KEY ("configTemplateId") REFERENCES "IntakeFieldTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
