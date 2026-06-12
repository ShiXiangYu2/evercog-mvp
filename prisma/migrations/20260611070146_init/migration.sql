-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "departmentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "policy_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "source" TEXT,
    "submitterId" TEXT NOT NULL,
    "departmentId" TEXT,
    "customerType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "collectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "policy_links_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "policy_briefs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyLinkId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "applicableTo" TEXT,
    "keyClauses" TEXT,
    "actionSuggestions" TEXT,
    "riskReminders" TEXT,
    "sourceUrl" TEXT,
    "generatorId" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'draft',
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "policy_briefs_policyLinkId_fkey" FOREIGN KEY ("policyLinkId") REFERENCES "policy_links" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "policy_briefs_generatorId_fkey" FOREIGN KEY ("generatorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "push_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyBriefId" TEXT NOT NULL,
    "policyLinkId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'wecom',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "targetName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "readStatus" TEXT NOT NULL DEFAULT 'unread',
    "payloadSnapshot" TEXT,
    "pusherId" TEXT NOT NULL,
    "sentAt" DATETIME,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "push_records_policyBriefId_fkey" FOREIGN KEY ("policyBriefId") REFERENCES "policy_briefs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "push_records_policyLinkId_fkey" FOREIGN KEY ("policyLinkId") REFERENCES "policy_links" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "push_records_pusherId_fkey" FOREIGN KEY ("pusherId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "knowledge_cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT,
    "content" TEXT NOT NULL,
    "departmentId" TEXT,
    "customerType" TEXT,
    "source" TEXT,
    "riskNotes" TEXT,
    "visibilityScope" TEXT NOT NULL DEFAULT 'department',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "creatorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "knowledge_cards_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "knowledge_cards_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "experience_queries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "retrievedCards" TEXT,
    "generatedReply" TEXT,
    "policyExplanation" TEXT,
    "serviceOpportunity" TEXT,
    "salesScript" TEXT,
    "riskReminder" TEXT,
    "citedSources" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "experience_queries_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sop_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "template" TEXT,
    "requirements" TEXT,
    "mentorId" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sop_tasks_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sop_tasks_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sop_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "inspectionReport" TEXT,
    "completeness" REAL,
    "missingSteps" TEXT,
    "riskPoints" TEXT,
    "executability" REAL,
    "reviewerId" TEXT,
    "reviewComment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sop_submissions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "sop_tasks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sop_submissions_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sop_submissions_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "policy_briefs_policyLinkId_key" ON "policy_briefs"("policyLinkId");
