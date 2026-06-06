-- Migration 61: Add PostSurgeryPlan column to AnesthesiaRecord
-- Form "Ke hoach sau gay me – phau thuat" (Item 4 Prompt 6 Dot 2)
-- Idempotent: safe to re-run

IF COL_LENGTH('AnesthesiaRecords', 'PostSurgeryPlan') IS NULL
BEGIN
    ALTER TABLE AnesthesiaRecords
    ADD PostSurgeryPlan NVARCHAR(MAX) NULL;

    PRINT 'Added PostSurgeryPlan column to AnesthesiaRecords';
END
ELSE
BEGIN
    PRINT 'PostSurgeryPlan already exists — skipping';
END
