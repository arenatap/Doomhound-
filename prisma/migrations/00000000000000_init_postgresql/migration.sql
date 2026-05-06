-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "PackMember" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "profilePic" TEXT NOT NULL,
    "walletAddress" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "rank" TEXT NOT NULL DEFAULT 'Lost Soul',
    "lastCheckIn" TIMESTAMP(3),
    "lastThreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastFollowerCount" INTEGER NOT NULL DEFAULT 0,
    "lastVerifiedAt" TIMESTAMP(3),
    "doomhoundBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceCheckedAt" TIMESTAMP(3),
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "lastStreakAt" TIMESTAMP(3),
    "achievements" TEXT NOT NULL DEFAULT '[]',
    "referredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "memberHandle" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackMember_handle_key" ON "PackMember"("handle");

-- CreateIndex
CREATE INDEX "PackMember_handle_idx" ON "PackMember"("handle");

-- CreateIndex
CREATE INDEX "PackMember_points_idx" ON "PackMember"("points");

-- CreateIndex
CREATE INDEX "ActivityLog_memberHandle_idx" ON "ActivityLog"("memberHandle");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_memberHandle_fkey" FOREIGN KEY ("memberHandle") REFERENCES "PackMember"("handle") ON DELETE CASCADE ON UPDATE CASCADE;

