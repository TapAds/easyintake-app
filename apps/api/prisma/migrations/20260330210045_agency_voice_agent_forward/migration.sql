-- AlterTable
ALTER TABLE "AgencyConfig" ADD COLUMN     "voiceAgentForwardNumber" TEXT;

-- AlterTable
ALTER TABLE "SignatureRequest" ALTER COLUMN "updatedAt" DROP DEFAULT;
