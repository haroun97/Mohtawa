-- CreateTable
CREATE TABLE "RunReviewDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "iterationId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "decidedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "RunReviewDecision_runId_idx" ON "RunReviewDecision"("runId");

-- CreateIndex
CREATE INDEX "RunReviewDecision_iterationId_idx" ON "RunReviewDecision"("iterationId");

-- CreateIndex
CREATE UNIQUE INDEX "RunReviewDecision_runId_iterationId_nodeId_key" ON "RunReviewDecision"("runId", "iterationId", "nodeId");
