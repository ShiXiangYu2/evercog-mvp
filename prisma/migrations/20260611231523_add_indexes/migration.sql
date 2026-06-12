-- CreateIndex
CREATE INDEX "agent_tasks_status_idx" ON "agent_tasks"("status");

-- CreateIndex
CREATE INDEX "agent_tasks_assignedTo_idx" ON "agent_tasks"("assignedTo");

-- CreateIndex
CREATE INDEX "agent_tasks_priority_idx" ON "agent_tasks"("priority");

-- CreateIndex
CREATE INDEX "agent_tasks_createdAt_idx" ON "agent_tasks"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "experience_queries_callerId_idx" ON "experience_queries"("callerId");

-- CreateIndex
CREATE INDEX "experience_queries_status_idx" ON "experience_queries"("status");

-- CreateIndex
CREATE INDEX "experience_queries_createdAt_idx" ON "experience_queries"("createdAt");

-- CreateIndex
CREATE INDEX "knowledge_cards_status_idx" ON "knowledge_cards"("status");

-- CreateIndex
CREATE INDEX "knowledge_cards_category_idx" ON "knowledge_cards"("category");

-- CreateIndex
CREATE INDEX "knowledge_cards_creatorId_idx" ON "knowledge_cards"("creatorId");

-- CreateIndex
CREATE INDEX "knowledge_cards_departmentId_idx" ON "knowledge_cards"("departmentId");

-- CreateIndex
CREATE INDEX "knowledge_cards_visibilityScope_idx" ON "knowledge_cards"("visibilityScope");

-- CreateIndex
CREATE INDEX "knowledge_cards_createdAt_idx" ON "knowledge_cards"("createdAt");

-- CreateIndex
CREATE INDEX "knowledge_gaps_status_idx" ON "knowledge_gaps"("status");

-- CreateIndex
CREATE INDEX "knowledge_gaps_priority_idx" ON "knowledge_gaps"("priority");

-- CreateIndex
CREATE INDEX "knowledge_gaps_frequency_idx" ON "knowledge_gaps"("frequency");

-- CreateIndex
CREATE INDEX "policy_briefs_reviewStatus_idx" ON "policy_briefs"("reviewStatus");

-- CreateIndex
CREATE INDEX "policy_briefs_generatorId_idx" ON "policy_briefs"("generatorId");

-- CreateIndex
CREATE INDEX "policy_briefs_createdAt_idx" ON "policy_briefs"("createdAt");

-- CreateIndex
CREATE INDEX "policy_links_status_idx" ON "policy_links"("status");

-- CreateIndex
CREATE INDEX "policy_links_submitterId_idx" ON "policy_links"("submitterId");

-- CreateIndex
CREATE INDEX "policy_links_customerType_idx" ON "policy_links"("customerType");

-- CreateIndex
CREATE INDEX "policy_links_createdAt_idx" ON "policy_links"("createdAt");

-- CreateIndex
CREATE INDEX "push_records_policyBriefId_idx" ON "push_records"("policyBriefId");

-- CreateIndex
CREATE INDEX "push_records_pusherId_idx" ON "push_records"("pusherId");

-- CreateIndex
CREATE INDEX "push_records_status_idx" ON "push_records"("status");

-- CreateIndex
CREATE INDEX "push_records_readStatus_idx" ON "push_records"("readStatus");

-- CreateIndex
CREATE INDEX "push_records_createdAt_idx" ON "push_records"("createdAt");

-- CreateIndex
CREATE INDEX "sop_tasks_mentorId_idx" ON "sop_tasks"("mentorId");

-- CreateIndex
CREATE INDEX "sop_tasks_traineeId_idx" ON "sop_tasks"("traineeId");

-- CreateIndex
CREATE INDEX "sop_tasks_status_idx" ON "sop_tasks"("status");

-- CreateIndex
CREATE INDEX "sop_tasks_createdAt_idx" ON "sop_tasks"("createdAt");
