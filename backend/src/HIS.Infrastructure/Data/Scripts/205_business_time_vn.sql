-- 205 (QA round 3, 2026-09-15): one time convention.
--   Business timestamps (AdmissionDate, RequestDate, ReceiptDate, QueueTickets.IssueDate, ...) = VN local time
--   (HIS.Core.Common.VnTime.NowVn). Audit columns CreatedAt/UpdatedAt stay UTC (HISDbContext.SaveChangesAsync).
--
-- Historic rows of the listed columns were written with DateTime.UtcNow (the "dot16" writers, or DateTime.Now on
-- the prod container before it ran in VN time on 2026-09-11). Such a row is identifiable with certainty: its
-- business value equals CreatedAt (set to UtcNow by SaveChangesAsync in the same save) within one second.
-- A VN-local write sits +25200 s from CreatedAt and never matches. Every listed table is written ONLY through
-- EF SaveChangesAsync (no raw-SQL INSERT that sets CreatedAt from DateTime.Now — verified; seed SQL uses
-- GETDATE() which is UTC on the SQL Server containers/RDS, so those rows are UTC as well).
-- Tables written by raw SQL with CreatedAt = DateTime.Now (e.g. BloodIssueReceipts, BloodOrders) are NOT
-- listed: there both columns are VN and the equality proves nothing.
--
-- Runs on every startup: guarded by the DataFixMarkers row (and the predicate itself no longer matches a
-- shifted row, so even a second run could not double-shift).
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID(N'dbo.DataFixMarkers', N'U') IS NULL
    CREATE TABLE dbo.DataFixMarkers (
        Name      NVARCHAR(200)  NOT NULL CONSTRAINT PK_DataFixMarkers PRIMARY KEY,
        AppliedAt DATETIME2      NOT NULL CONSTRAINT DF_DataFixMarkers_AppliedAt DEFAULT SYSUTCDATETIME(),
        Note      NVARCHAR(4000) NULL
    );
GO

IF NOT EXISTS (SELECT 1 FROM dbo.DataFixMarkers WHERE Name = N'205_business_time_vn')
BEGIN
    -- The runner executes every script on ONE connection: XACT_ABORT is reset to OFF on both exit paths.
    SET XACT_ABORT ON;
    BEGIN TRY
    BEGIN TRAN;

    DECLARE @cols TABLE (Tbl SYSNAME NOT NULL, Col SYSNAME NOT NULL);
    INSERT @cols (Tbl, Col) VALUES
        (N'MedicalRecords', N'AdmissionDate'),
        (N'Admissions', N'AdmissionDate'),
        (N'QueueTickets', N'IssueDate'),
        (N'QueueTickets', N'CompletedTime'),
        (N'ServiceRequests', N'RequestDate'),
        (N'ServiceRequestDetails', N'SampleCollectedAt'),
        (N'ServiceRequestDetails', N'ReceivedAt'),
        (N'Prescriptions', N'PrescriptionDate'),
        (N'Prescriptions', N'DispensedAt'),
        (N'Receipts', N'ReceiptDate'),
        (N'Deposits', N'ReceiptDate'),
        (N'Payments', N'ReceiptDate'),
        (N'InvoiceSummaries', N'InvoiceDate'),
        (N'ExportReceipts', N'ReceiptDate'),
        (N'ImportReceipts', N'ReceiptDate'),
        (N'ImportReceipts', N'InvoiceDate'),
        (N'RadiologyRequests', N'RequestDate'),
        (N'RadiologyDispatches', N'DispatchedAt'),
        (N'RadiologyDispatches', N'ArrivedAt'),
        (N'RadiologyDispatches', N'PerformedAt'),
        (N'PharmacyApprovals', N'RequestedAt'),
        (N'PharmacyApprovals', N'SubmittedAt'),
        (N'PharmacyApprovals', N'ApprovedAt'),
        (N'PharmacyApprovals', N'RevokedAt'),
        (N'PharmacyApprovalLogs', N'ActedAt'),
        (N'TreatmentProtocols', N'EffectiveDate'),
        (N'TreatmentProtocols', N'ApprovedDate'),
        (N'PathologyResults', N'VerifiedAt'),
        (N'NonDicomStudies', N'CapturedAt'),
        (N'SpecimenImages', N'CapturedAt'),
        (N'RefundDisbursements', N'TransferredAt'),
        (N'FoodPoisoningIncidents', N'ReportedAt');

    DECLARE @note NVARCHAR(4000) = N'';
    DECLARE @n INT;

    -- Discharges.DischargeDate came from the client's toISOString() (UTC). Migration 199 copied it into
    -- MedicalRecords.DischargeDate — shift those copies together with their source (before the source moves).
    IF OBJECT_ID(N'dbo.Discharges', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.Admissions', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.MedicalRecords', N'DischargeDate') IS NOT NULL
    BEGIN
        UPDATE m
        SET m.DischargeDate = DATEADD(HOUR, 7, m.DischargeDate)
        FROM dbo.MedicalRecords m
        JOIN dbo.Admissions a ON a.MedicalRecordId = m.Id
        JOIN dbo.Discharges d ON d.AdmissionId = a.Id
        WHERE m.DischargeDate IS NOT NULL AND m.DischargeDate = d.DischargeDate
          -- Range form, not DATEDIFF(SECOND,...): DATEDIFF overflows (Msg 535) for sentinel dates ~68y away
          -- (0001-01-01 / 1900-01-01). CreatedAt lower bound keeps DATEADD(-1s) itself in range.
          AND d.CreatedAt > '1900-01-02'
          AND d.DischargeDate BETWEEN DATEADD(SECOND, -1, d.CreatedAt) AND DATEADD(SECOND, 1, d.CreatedAt);
        SET @note = @note + N'MedicalRecords.DischargeDate(copy)=' + CAST(@@ROWCOUNT AS NVARCHAR(12)) + N'; ';
        INSERT @cols (Tbl, Col) VALUES (N'Discharges', N'DischargeDate');
    END

    DECLARE @tbl SYSNAME, @col SYSNAME, @sql NVARCHAR(MAX);
    DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT Tbl, Col FROM @cols;
    OPEN c;
    FETCH NEXT FROM c INTO @tbl, @col;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF OBJECT_ID(N'dbo.' + QUOTENAME(@tbl), N'U') IS NOT NULL
           AND COL_LENGTH(N'dbo.' + @tbl, @col) IS NOT NULL
           AND COL_LENGTH(N'dbo.' + @tbl, N'CreatedAt') IS NOT NULL
        BEGIN
            SET @sql = N'UPDATE dbo.' + QUOTENAME(@tbl)
                     + N' SET ' + QUOTENAME(@col) + N' = DATEADD(HOUR, 7, ' + QUOTENAME(@col) + N')'
                     + N' WHERE ' + QUOTENAME(@col) + N' IS NOT NULL'
                     + N' AND CreatedAt > ''1900-01-02'''
                     + N' AND ' + QUOTENAME(@col) + N' BETWEEN DATEADD(SECOND, -1, CreatedAt) AND DATEADD(SECOND, 1, CreatedAt);'
                     + N' SET @rows = @@ROWCOUNT;';
            EXEC sp_executesql @sql, N'@rows INT OUTPUT', @rows = @n OUTPUT;
            SET @note = @note + @tbl + N'.' + @col + N'=' + CAST(@n AS NVARCHAR(12)) + N'; ';
        END
        FETCH NEXT FROM c INTO @tbl, @col;
    END
    CLOSE c;
    DEALLOCATE c;

    INSERT dbo.DataFixMarkers (Name, Note) VALUES (N'205_business_time_vn', LEFT(@note, 4000));
    COMMIT;
    SET XACT_ABORT OFF;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        SET XACT_ABORT OFF;
        THROW;
    END CATCH
END
GO
