-- CreateTable
CREATE TABLE "agent_learning_patterns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patternType" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "confidence" REAL NOT NULL DEFAULT 0.5,
    "evidence" TEXT,
    "suggestedAction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "learnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReinforcedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "rule_adjustments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "currentConfig" TEXT NOT NULL,
    "suggestedConfig" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "basedOnPatterns" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "agent_learning_patterns_patternType_idx" ON "agent_learning_patterns"("patternType");

-- CreateIndex
CREATE INDEX "agent_learning_patterns_category_idx" ON "agent_learning_patterns"("category");

-- CreateIndex
CREATE INDEX "agent_learning_patterns_status_idx" ON "agent_learning_patterns"("status");

-- CreateIndex
CREATE INDEX "agent_learning_patterns_confidence_idx" ON "agent_learning_patterns"("confidence");

-- CreateIndex
CREATE INDEX "rule_adjustments_ruleId_idx" ON "rule_adjustments"("ruleId");

-- CreateIndex
CREATE INDEX "rule_adjustments_status_idx" ON "rule_adjustments"("status");
