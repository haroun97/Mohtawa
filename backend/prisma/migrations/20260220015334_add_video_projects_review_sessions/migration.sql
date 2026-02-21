-- CreateTable
CREATE TABLE "VideoProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "runId" TEXT,
    "draftVideoUrl" TEXT,
    "edlUrl" TEXT NOT NULL,
    "approvedEdlUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "projectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "VideoProject_userId_idx" ON "VideoProject"("userId");

-- CreateIndex
CREATE INDEX "VideoProject_runId_idx" ON "VideoProject"("runId");

-- CreateIndex
CREATE INDEX "ReviewSession_runId_idx" ON "ReviewSession"("runId");

-- CreateIndex
CREATE INDEX "ReviewSession_status_idx" ON "ReviewSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSession_runId_stepId_key" ON "ReviewSession"("runId", "stepId");
