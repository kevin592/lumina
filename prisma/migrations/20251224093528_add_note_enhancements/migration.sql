-- Migration: add_note_enhancements
-- Description: Add support for note hierarchy, source tracking, Wiki-Links, todo recurrences, and todo groups

-- Create todoGroup table first (needed before adding foreign key to notes)
CREATE TABLE IF NOT EXISTS "todoGroup" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(20) DEFAULT '#3b82f6',
    "icon" VARCHAR(50) DEFAULT 'solar:folder-bold',
    "sortOrder" INTEGER DEFAULT 0,
    "accountId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "todoGroup_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "todoGroup_accountId_idx" ON "todoGroup"("accountId");

-- Create todoRecurrence table
CREATE TABLE IF NOT EXISTS "todoRecurrence" (
    "id" SERIAL PRIMARY KEY,
    "noteId" INTEGER UNIQUE NOT NULL,
    "rrule" VARCHAR(500) NOT NULL,
    "nextDueDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ,
    "maxOccurrences" INTEGER,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "todoRecurrence_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "todoRecurrence_nextDueDate_idx" ON "todoRecurrence"("nextDueDate");

-- Add fields to notes table for hierarchy support
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "parentId" INTEGER;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "depth" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "path" VARCHAR;

-- Add fields to notes table for source tracking (fix array syntax)
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "sourceCardIds" INTEGER[] DEFAULT '{}';

-- Add field to notes table for Wiki-Link support
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "wikiLinks" JSON;

-- Add foreign key for parent-child relationship
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "groupId" INTEGER;
ALTER TABLE "notes" ADD CONSTRAINT "notes_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "todoGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add field to noteReference table for reference type
ALTER TABLE "noteReference" ADD COLUMN IF NOT EXISTS "referenceType" VARCHAR DEFAULT 'manual';

-- Create index for parentId
CREATE INDEX IF NOT EXISTS "notes_parentId_idx" ON "notes"("parentId");

-- Create index for groupId
CREATE INDEX IF NOT EXISTS "notes_groupId_idx" ON "notes"("groupId");

-- Create index for sourceCardIds (PostgreSQL requires special handling for array columns)
-- Note: GIN index is more appropriate for array columns
CREATE INDEX IF NOT EXISTS "notes_sourceCardIds_idx" ON "notes" USING GIN ("sourceCardIds");

-- Create index for referenceType
CREATE INDEX IF NOT EXISTS "noteReference_referenceType_idx" ON "noteReference"("referenceType");
