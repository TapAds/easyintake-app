-- CreateTable
CREATE TABLE "IntakeLead" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "ghlContactId" TEXT,
    "lastEvent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntakeLead_leadId_key" ON "IntakeLead"("leadId");
