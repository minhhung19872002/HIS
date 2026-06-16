-- 123_appointment_reminder.sql
-- Thêm cột ReminderSentAt vào Appointments (lịch hẹn/tái khám chính)
-- để worker AppointmentReminderWorker đảm bảo idempotent.
-- Cột IsReminderSent đã có trong entity nhưng chưa có migration — thêm luôn cùng.
-- Idempotent: COL_LENGTH IS NULL guard cho từng cột.

IF COL_LENGTH('Appointments', 'ReminderSentAt') IS NULL
BEGIN
    ALTER TABLE Appointments
        ADD ReminderSentAt DATETIME2 NULL;
    PRINT '123: Added ReminderSentAt to Appointments';
END
ELSE
BEGIN
    PRINT '123: ReminderSentAt already exists — skipped';
END

IF COL_LENGTH('Appointments', 'IsReminderSent') IS NULL
BEGIN
    ALTER TABLE Appointments
        ADD IsReminderSent BIT NOT NULL DEFAULT 0;
    PRINT '123: Added IsReminderSent to Appointments';
END
ELSE
BEGIN
    PRINT '123: IsReminderSent already exists — skipped';
END
