-- 62_sample_appointment.sql
-- Hẹn lấy mẫu / tái xét nghiệm định kỳ — Prompt 7 Đợt 2
-- Idempotent: dùng IF NOT EXISTS / COL_LENGTH IS NULL guards

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SampleAppointments')
BEGIN
    CREATE TABLE SampleAppointments (
        Id                      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() CONSTRAINT PK_SampleAppointments PRIMARY KEY,
        PatientId               UNIQUEIDENTIFIER NOT NULL,
        ServiceRequestDetailId  UNIQUEIDENTIFIER NULL,
        AppointmentAt           DATETIME2        NOT NULL,
        RecurrenceType          NVARCHAR(20)     NOT NULL DEFAULT 'None',   -- None / Daily / Weekly / Monthly
        RecurrenceCount         INT              NOT NULL DEFAULT 0,
        ServiceName             NVARCHAR(255)    NULL,
        Note                    NVARCHAR(1000)   NULL,
        Status                  NVARCHAR(20)     NOT NULL DEFAULT 'Scheduled', -- Scheduled / Completed / Cancelled
        CreatedByUserId         UNIQUEIDENTIFIER NULL,
        CreatedAt               DATETIME2        NOT NULL DEFAULT GETDATE(),
        CreatedBy               NVARCHAR(100)    NULL,
        UpdatedAt               DATETIME2        NULL,
        UpdatedBy               NVARCHAR(100)    NULL,
        IsDeleted               BIT              NOT NULL DEFAULT 0,
        CONSTRAINT FK_SampleAppointments_Patients
            FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_SampleAppointments_ServiceRequestDetails
            FOREIGN KEY (ServiceRequestDetailId) REFERENCES ServiceRequestDetails(Id)
    );
    CREATE INDEX IX_SampleAppointments_PatientId        ON SampleAppointments (PatientId);
    CREATE INDEX IX_SampleAppointments_AppointmentAt    ON SampleAppointments (AppointmentAt);
    CREATE INDEX IX_SampleAppointments_Status           ON SampleAppointments (Status);
    PRINT '62: Created SampleAppointments table';
END
ELSE
BEGIN
    PRINT '62: SampleAppointments already exists — skipped';
END
