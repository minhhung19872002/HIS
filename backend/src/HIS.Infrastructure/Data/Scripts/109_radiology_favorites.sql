-- F2.8 #138: Bảng lưu ca chụp yêu thích (Favorite) theo user — server-side, đồng bộ đa thiết bị.
-- Migration 109 — idempotent (IF OBJECT_ID IS NULL guard).

IF OBJECT_ID('dbo.RadiologyStudyFavorites', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RadiologyStudyFavorites (
        Id          UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        UserId      UNIQUEIDENTIFIER NOT NULL,
        RequestId   UNIQUEIDENTIFIER NOT NULL,
        CreatedAt   DATETIME2(7)     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_RadiologyStudyFavorites_Users
            FOREIGN KEY (UserId)     REFERENCES dbo.Users(Id),
        CONSTRAINT FK_RadiologyStudyFavorites_RadiologyRequests
            FOREIGN KEY (RequestId)  REFERENCES dbo.RadiologyRequests(Id),
        CONSTRAINT UQ_RadiologyStudyFavorites_UserRequest
            UNIQUE (UserId, RequestId)
    );

    CREATE NONCLUSTERED INDEX IX_RadiologyStudyFavorites_UserId
        ON dbo.RadiologyStudyFavorites (UserId);

    PRINT 'Created RadiologyStudyFavorites';
END
GO
