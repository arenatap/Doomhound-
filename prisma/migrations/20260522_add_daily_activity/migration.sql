-- CreateTable
CREATE TABLE "DailyActivity" (
    "id" TEXT NOT NULL,
    "memberHandle" TEXT NOT NULL,
    "activityDate" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyActivity_memberHandle_activityDate_actionType_key" ON "DailyActivity"("memberHandle", "activityDate", "actionType");

-- CreateIndex
CREATE INDEX "DailyActivity_memberHandle_idx" ON "DailyActivity"("memberHandle");

-- CreateIndex
CREATE INDEX "DailyActivity_activityDate_idx" ON "DailyActivity"("activityDate");

-- AddForeignKey
ALTER TABLE "DailyActivity" ADD CONSTRAINT "DailyActivity_memberHandle_fkey" FOREIGN KEY ("memberHandle") REFERENCES "PackMember"("handle") ON DELETE CASCADE ON UPDATE CASCADE;
