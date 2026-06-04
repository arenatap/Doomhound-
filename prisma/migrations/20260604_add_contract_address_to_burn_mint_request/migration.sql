-- AlterTable: Add contractAddress column to BurnMintRequest
-- Safe: uses IF NOT EXISTS pattern, nullable column
-- Can be run multiple times without error

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'BurnMintRequest' AND column_name = 'contractAddress'
  ) THEN
    ALTER TABLE "BurnMintRequest" ADD COLUMN "contractAddress" TEXT;
    -- Set default for existing rows to the old contract
    UPDATE "BurnMintRequest" SET "contractAddress" = '0x851ba0903c345676369634660e2757026418dced' WHERE "contractAddress" IS NULL;
  END IF;
END $$;

-- CreateIndex (safe: IF NOT EXISTS equivalent)
CREATE INDEX IF NOT EXISTS "BurnMintRequest_contractAddress_idx" ON "BurnMintRequest"("contractAddress");
