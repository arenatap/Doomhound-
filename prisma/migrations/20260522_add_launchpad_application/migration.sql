-- CreateTable
CREATE TABLE "LaunchpadApplication" (
    "id" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "contractAddress" TEXT,
    "description" TEXT NOT NULL,
    "supplyPercent" DOUBLE PRECISION NOT NULL,
    "tokenAmount" TEXT NOT NULL,
    "arenaLink" TEXT,
    "contactInfo" TEXT,
    "shieldScore" INTEGER NOT NULL DEFAULT -1,
    "shieldVerdict" TEXT NOT NULL DEFAULT 'pending',
    "shieldData" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "daoProposalId" TEXT,
    "airdropWallet" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaunchpadApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LaunchpadApplication_status_idx" ON "LaunchpadApplication"("status");

-- CreateIndex
CREATE INDEX "LaunchpadApplication_contractAddress_idx" ON "LaunchpadApplication"("contractAddress");

-- AddForeignKey
ALTER TABLE "LaunchpadApplication" ADD CONSTRAINT "LaunchpadApplication_daoProposalId_fkey" FOREIGN KEY ("daoProposalId") REFERENCES "DaoProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
