-- CreateTable
CREATE TABLE "agent_decision_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionType" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "context" TEXT,
    "outcome" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "agent_decision_logs_decisionType_idx" ON "agent_decision_logs"("decisionType");

-- CreateIndex
CREATE INDEX "agent_decision_logs_riskLevel_idx" ON "agent_decision_logs"("riskLevel");

-- CreateIndex
CREATE INDEX "agent_decision_logs_outcome_idx" ON "agent_decision_logs"("outcome");

-- CreateIndex
CREATE INDEX "agent_decision_logs_createdAt_idx" ON "agent_decision_logs"("createdAt");
