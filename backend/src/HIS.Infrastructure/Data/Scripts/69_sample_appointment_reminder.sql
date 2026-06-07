-- 69_sample_appointment_reminder.sql
-- Thêm cột ReminderSentAt vào SampleAppointments để worker nhắc lịch idempotent.
-- Idempotent: COL_LENGTH IS NULL guard.

IF COL_LENGTH('SampleAppointments', 'ReminderSentAt') IS NULL
BEGIN
    ALTER TABLE SampleAppointments
        ADD ReminderSentAt DATETIME2 NULL;
    PRINT '69: Added ReminderSentAt to SampleAppointments';
END
ELSE
BEGIN
    PRINT '69: ReminderSentAt already exists — skipped';
END
