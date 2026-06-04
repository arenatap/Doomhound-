-- AlterTable: Add adminMintTxHash to track when adminMint (2nd free claim) was done on-chain
-- This fixes the bug where the old balanceOf-based reconciliation set mintClaimed to wrong values
ALTER TABLE "NftWhitelist" ADD COLUMN "adminMintTxHash" TEXT;
