-- AlterTable
ALTER TABLE "PackMember" ADD COLUMN "sessionToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PackMember_sessionToken_key" ON "PackMember"("sessionToken");
