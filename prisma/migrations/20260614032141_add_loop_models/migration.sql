-- AlterTable
ALTER TABLE "knowledge_cards" ADD COLUMN "applicableEntities" TEXT;
ALTER TABLE "knowledge_cards" ADD COLUMN "applicableRegions" TEXT;
ALTER TABLE "knowledge_cards" ADD COLUMN "clauseNumbers" TEXT;
ALTER TABLE "knowledge_cards" ADD COLUMN "validFrom" DATETIME;
ALTER TABLE "knowledge_cards" ADD COLUMN "validTo" DATETIME;

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "rating" INTEGER,
    "helpful" BOOLEAN,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "knowledge_card_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "citeCount" INTEGER NOT NULL DEFAULT 0,
    "avgRating" REAL NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "knowledge_card_stats_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "knowledge_cards" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "optimization_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "reason" TEXT,
    "assignedTo" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "loop_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loopName" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "duration" INTEGER,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsSucceeded" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "result" TEXT,
    "error" TEXT,
    "pipelineSnapshot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "scheduler_states" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loopName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "lastRunAt" DATETIME,
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "configuration" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "departmentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_users" ("createdAt", "departmentId", "email", "id", "name", "role", "status", "updatedAt") SELECT "createdAt", "departmentId", "email", "id", "name", "role", "status", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "feedbacks_userId_idx" ON "feedbacks"("userId");

-- CreateIndex
CREATE INDEX "feedbacks_targetType_targetId_idx" ON "feedbacks"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "feedbacks_rating_idx" ON "feedbacks"("rating");

-- CreateIndex
CREATE INDEX "feedbacks_createdAt_idx" ON "feedbacks"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_card_stats_cardId_key" ON "knowledge_card_stats"("cardId");

-- CreateIndex
CREATE INDEX "knowledge_card_stats_cardId_idx" ON "knowledge_card_stats"("cardId");

-- CreateIndex
CREATE INDEX "knowledge_card_stats_viewCount_idx" ON "knowledge_card_stats"("viewCount");

-- CreateIndex
CREATE INDEX "knowledge_card_stats_avgRating_idx" ON "knowledge_card_stats"("avgRating");

-- CreateIndex
CREATE INDEX "optimization_tasks_status_idx" ON "optimization_tasks"("status");

-- CreateIndex
CREATE INDEX "optimization_tasks_priority_idx" ON "optimization_tasks"("priority");

-- CreateIndex
CREATE INDEX "optimization_tasks_sourceType_sourceId_idx" ON "optimization_tasks"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "loop_executions_loopName_idx" ON "loop_executions"("loopName");

-- CreateIndex
CREATE INDEX "loop_executions_status_idx" ON "loop_executions"("status");

-- CreateIndex
CREATE INDEX "loop_executions_startedAt_idx" ON "loop_executions"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "scheduler_states_loopName_key" ON "scheduler_states"("loopName");
