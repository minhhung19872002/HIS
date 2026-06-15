-- Migration 113: Add PsychologicalAssessment to AnesthesiaRecords (F1.9 pre-surgery psychological assessment)
-- Additive only: ADD nullable column with IF NOT EXISTS guard.
-- Applied by ProductionSchemaRepairRunner on startup.

IF COL_LENGTH('AnesthesiaRecords', 'PsychologicalAssessment') IS NULL
BEGIN
    ALTER TABLE AnesthesiaRecords
        ADD PsychologicalAssessment NVARCHAR(MAX) NULL;
END
