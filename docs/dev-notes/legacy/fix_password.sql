USE HIS;
UPDATE Users SET PasswordHash = '$2a$11$I4srvu5CFpDQ8D/2IWEb5.l/Wccv4C/fO0D/8yCDda0w/6jhiwQye' WHERE Username = 'admin';
SELECT Username, PasswordHash FROM Users WHERE Username = 'admin';
