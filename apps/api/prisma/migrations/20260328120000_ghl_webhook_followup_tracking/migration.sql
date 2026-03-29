-- AlterTable
ALTER TABLE "FollowUpJob" ADD COLUMN     "outreachChannel" TEXT NOT NULL DEFAULT 'SMS',
ADD COLUMN     "externalMessageId" TEXT,
ADD COLUMN     "outreachProvider" TEXT;

-- CreateTable
CREATE TABLE "GhlWebhookReceipt" (
    "webhookId" TEXT NOT NULL,
    "eventType" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GhlWebhookReceipt_pkey" PRIMARY KEY ("webhookId")
);
