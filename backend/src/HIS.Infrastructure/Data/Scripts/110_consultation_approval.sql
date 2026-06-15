-- F1.4: Them cot duyet lanh dao cho hoi chan thuoc dau * (ConsultationType=3)
-- ApprovalStatus: 0=Chua yeu cau, 1=Cho duyet, 2=Da duyet, 3=Tu choi
-- Idempotent: IF NOT EXISTS guard tung cot

IF COL_LENGTH('InpatientConsultations', 'ApprovalStatus') IS NULL
    ALTER TABLE [dbo].[InpatientConsultations] ADD [ApprovalStatus] INT NOT NULL DEFAULT 0;

IF COL_LENGTH('InpatientConsultations', 'ApprovedBy') IS NULL
    ALTER TABLE [dbo].[InpatientConsultations] ADD [ApprovedBy] UNIQUEIDENTIFIER NULL;

IF COL_LENGTH('InpatientConsultations', 'ApprovedAt') IS NULL
    ALTER TABLE [dbo].[InpatientConsultations] ADD [ApprovedAt] DATETIME2 NULL;

IF COL_LENGTH('InpatientConsultations', 'ApprovalNote') IS NULL
    ALTER TABLE [dbo].[InpatientConsultations] ADD [ApprovalNote] NVARCHAR(500) NULL;

-- Index de loc nhanh cac phieu cho duyet (luc dashboard lanh dao)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InpatientConsultations_ApprovalStatus' AND object_id = OBJECT_ID('InpatientConsultations'))
    CREATE INDEX [IX_InpatientConsultations_ApprovalStatus]
        ON [dbo].[InpatientConsultations]([ApprovalStatus])
        WHERE [ConsultationType] = 3;
