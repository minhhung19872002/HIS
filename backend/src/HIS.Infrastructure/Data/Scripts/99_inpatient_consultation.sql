-- 99: Hội chẩn nội trú persist thật (#16). Trước đây CreateConsultationAsync/GetConsultationsAsync
-- là stub in-memory → biên bản hội chẩn mất ngay sau khi tạo. Tách riêng khỏi ConsultationRecord (OPD).
-- Idempotent: chỉ tạo nếu chưa có. CreatedBy/UpdatedBy nvarchar → không cần ValueConverter.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InpatientConsultations')
BEGIN
    CREATE TABLE InpatientConsultations (
        Id               uniqueidentifier NOT NULL CONSTRAINT PK_InpatientConsultations PRIMARY KEY,
        AdmissionId      uniqueidentifier NOT NULL,
        ConsultationType int              NOT NULL,
        ConsultationDate datetime2        NOT NULL,
        ConsultationTime time            NULL,
        Location         nvarchar(500)    NULL,
        ChairmanId       uniqueidentifier NOT NULL,
        SecretaryId      uniqueidentifier NOT NULL,
        Reason           nvarchar(max)    NULL,
        ClinicalFindings nvarchar(max)    NULL,
        LabResults       nvarchar(max)    NULL,
        ImageResults     nvarchar(max)    NULL,
        Conclusion       nvarchar(max)    NULL,
        Treatment        nvarchar(max)    NULL,
        Status           int              NOT NULL CONSTRAINT DF_InpatientConsultations_Status DEFAULT (0),
        CreatedAt        datetime2        NOT NULL,
        CreatedBy        nvarchar(max)    NULL,
        UpdatedAt        datetime2        NULL,
        UpdatedBy        nvarchar(max)    NULL,
        IsDeleted        bit              NOT NULL CONSTRAINT DF_InpatientConsultations_IsDeleted DEFAULT (0)
    );
    CREATE INDEX IX_InpatientConsultations_AdmissionId ON InpatientConsultations(AdmissionId);
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InpatientConsultationMembers')
BEGIN
    CREATE TABLE InpatientConsultationMembers (
        Id             uniqueidentifier NOT NULL CONSTRAINT PK_InpatientConsultationMembers PRIMARY KEY,
        ConsultationId uniqueidentifier NOT NULL,
        DoctorId       uniqueidentifier NOT NULL,
        Opinion        nvarchar(max)    NULL,
        CreatedAt      datetime2        NOT NULL,
        CreatedBy      nvarchar(max)    NULL,
        UpdatedAt      datetime2        NULL,
        UpdatedBy      nvarchar(max)    NULL,
        IsDeleted      bit              NOT NULL CONSTRAINT DF_InpatientConsultationMembers_IsDeleted DEFAULT (0),
        CONSTRAINT FK_InpatientConsultationMembers_Consultation FOREIGN KEY (ConsultationId)
            REFERENCES InpatientConsultations(Id) ON DELETE CASCADE
    );
    CREATE INDEX IX_InpatientConsultationMembers_ConsultationId ON InpatientConsultationMembers(ConsultationId);
END
