-- CreateTable
CREATE TABLE "GhlProcessedInboundMessage" (
    "messageId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GhlProcessedInboundMessage_pkey" PRIMARY KEY ("messageId")
);

-- CreateIndex
CREATE INDEX "GhlProcessedInboundMessage_locationId_contactId_idx" ON "GhlProcessedInboundMessage"("locationId", "contactId");
