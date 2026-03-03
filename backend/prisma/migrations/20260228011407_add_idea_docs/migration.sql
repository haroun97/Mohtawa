/*
  Warnings:

  - You are about to drop the `OAuthConnection` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OAuthConnection";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "IdeaDoc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "content" JSONB NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IdeaDoc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IdeaDoc_userId_idx" ON "IdeaDoc"("userId");

-- CreateIndex
CREATE INDEX "IdeaDoc_userId_deletedAt_idx" ON "IdeaDoc"("userId", "deletedAt");
