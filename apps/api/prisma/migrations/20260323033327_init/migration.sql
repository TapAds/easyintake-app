-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'NO_ANSWER');

-- CreateEnum
CREATE TYPE "FlowStage" AS ENUM ('QUOTE_COLLECTION', 'QUOTE_READY', 'PRODUCT_SELECTED', 'FULL_APPLICATION');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "callSid" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "status" "CallStatus" NOT NULL DEFAULT 'ACTIVE',
    "consentVerbal" BOOLEAN NOT NULL DEFAULT false,
    "consentTimestamp" TIMESTAMP(3),
    "completenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "flowStage" "FlowStage" NOT NULL DEFAULT 'QUOTE_COLLECTION',
    "agentDecisionMade" BOOLEAN NOT NULL DEFAULT false,
    "selectedCarrier" TEXT,
    "selectedProduct" TEXT,
    "ghlContactId" TEXT,
    "ghlOpportunityId" TEXT,
    "ghlSyncedAt" TIMESTAMP(3),
    "detectedLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primaryLanguage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifeInsuranceEntity" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "coverageAmountDesired" INTEGER,
    "productTypeInterest" TEXT,
    "termLengthDesired" INTEGER,
    "budgetMonthly" INTEGER,
    "tobaccoUse" BOOLEAN,
    "tobaccoLastUsed" TEXT,
    "heightFeet" INTEGER,
    "heightInches" INTEGER,
    "weightLbs" INTEGER,
    "existingCoverage" BOOLEAN,
    "existingCoverageAmount" INTEGER,
    "beneficiaryName" TEXT,
    "beneficiaryRelation" TEXT,
    "originalLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rawExtractedText" JSONB,
    "extractedByAI" JSONB,
    "agentCorrected" BOOLEAN NOT NULL DEFAULT false,
    "lastCorrectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeInsuranceEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptSegment" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "offsetMs" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL DEFAULT 'en',
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpJob" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyConfig" (
    "id" TEXT NOT NULL,
    "ghlLocationId" TEXT NOT NULL,
    "ghlAccessToken" TEXT NOT NULL,
    "ghlRefreshToken" TEXT NOT NULL,
    "ghlTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "agencyName" TEXT NOT NULL DEFAULT 'Easy Intake Agency',
    "twilioAccountSid" TEXT NOT NULL,
    "twilioPhoneNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceLog" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "inputText" TEXT NOT NULL,
    "outputText" TEXT NOT NULL,
    "wasModified" BOOLEAN NOT NULL,
    "flaggedTerms" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Call_callSid_key" ON "Call"("callSid");

-- CreateIndex
CREATE UNIQUE INDEX "LifeInsuranceEntity_callId_key" ON "LifeInsuranceEntity"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyConfig_ghlLocationId_key" ON "AgencyConfig"("ghlLocationId");

-- AddForeignKey
ALTER TABLE "LifeInsuranceEntity" ADD CONSTRAINT "LifeInsuranceEntity_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpJob" ADD CONSTRAINT "FollowUpJob_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceLog" ADD CONSTRAINT "ComplianceLog_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;
