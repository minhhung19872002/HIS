IF COL_LENGTH('Deposits', 'ReceivedById') IS NULL
BEGIN
    ALTER TABLE Deposits ADD ReceivedById uniqueidentifier NULL;
END

IF COL_LENGTH('Payments', 'ReceivedById') IS NULL
BEGIN
    ALTER TABLE Payments ADD ReceivedById uniqueidentifier NULL;
END

IF COL_LENGTH('Deposits', 'ReceivedByUserId') IS NOT NULL
BEGIN
    EXEC('
        UPDATE Deposits
        SET ReceivedById = ReceivedByUserId
        WHERE ReceivedById IS NULL;
    ');
END

IF COL_LENGTH('Payments', 'ReceivedByUserId') IS NOT NULL
BEGIN
    EXEC('
        UPDATE Payments
        SET ReceivedById = ReceivedByUserId
        WHERE ReceivedById IS NULL;
    ');
END
