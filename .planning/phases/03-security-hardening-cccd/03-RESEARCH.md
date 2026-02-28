# Phase 3: Security Hardening + CCCD Validation - Research

**Researched:** 2026-02-28
**Domain:** Security compliance, data encryption, audit logging, backup/recovery, incident response (Vietnamese healthcare regulation)
**Confidence:** HIGH

## Summary

Phase 3 is primarily a compliance enhancement and documentation phase, not a greenfield development effort. The HIS system already has substantial security infrastructure in place: audit logging middleware with 30+ route-module mappings, CCCD validation with 51 province codes, BCrypt password hashing, JWT authentication, 2FA via email OTP, role-based access control (User/Role/Permission entities), and health monitoring endpoints. The main gaps are: (1) no access control matrix documentation for Decree 85/2016 audit, (2) no column-level encryption for sensitive patient data fields (CCCD, phone, insurance number), (3) backup procedures exist in stub form only (CreateBackupAsync returns "NotImplemented"), and (4) no security incident response plan.

The existing AuditLogMiddleware only captures POST/PUT/DELETE requests, missing GET requests that access sensitive patient data -- a gap for SEC-01 compliance. The current audit log UI in SystemAdmin already supports filtering by module, entity type, action, date range, and keyword search. The planner should leverage this foundation heavily rather than building new infrastructure.

**Primary recommendation:** Focus on enhancing existing infrastructure (audit middleware for sensitive data access, TDE + column-level encryption, real backup/restore implementation) and creating compliance documentation artifacts (access control matrix, backup procedures, incident response plan) that can be presented to Level 6 certification auditors.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | Access control matrix documentation per Decree 85/2016 | Existing Role/Permission/UserRole entities provide the data model. AuditLogMiddleware provides the logging foundation. Need: (1) seed standard permission matrix, (2) add GET audit for sensitive fields, (3) compliance report endpoint + UI |
| SEC-02 | Data encryption at rest for sensitive patient data | SQL Server TDE for full-database encryption + EF Core ValueConverter for column-level encryption of Patient.IdentityNumber, Patient.PhoneNumber, Patient.InsuranceNumber, Patient.Email. Both approaches complement each other |
| SEC-03 | Backup and recovery procedures documented and tested | Docker compose already mounts ./backup volume. SystemCompleteService has stub backup methods. Need: real SQL BACKUP/RESTORE via T-SQL, scheduled backup configuration, documented procedures, Cypress test for backup API |
| SEC-04 | Security incident response plan | Pure documentation deliverable. Create structured markdown document with Vietnamese healthcare context per Decree 85/2016 and TT 12/2022 requirements |
| SEC-05 | CCCD/National ID validation on patient registration | ALREADY FULLY IMPLEMENTED: CccdValidator.cs (51 provinces), GET /api/reception/validate-cccd, frontend validation in Reception.tsx. Just verify + mark complete |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ASP.NET Core | 8.0+ | Web API framework | Already in use; built-in Data Protection API |
| EF Core | 8.0+ | ORM with ValueConverter | Already used for Guid/String converters; same pattern for encryption |
| BCrypt.Net-Next | 4.x | Password hashing | Already used in AuthService |
| SQL Server 2022 | Latest | Database with TDE support | Docker image `mcr.microsoft.com/mssql/server:2022-latest` already running |
| System.Security.Cryptography | Built-in | AES column encryption | .NET built-in, no extra package needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Microsoft.AspNetCore.DataProtection | Built-in | Key management for encryption | Use for managing encryption keys; integrates with ASP.NET Core DI |
| iText7 | Already installed | PDF generation for compliance reports | For generating printable access control matrix and backup procedure documents |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EF Core ValueConverter + AES | SQL Server Always Encrypted | Always Encrypted has EF Core limitations (can't compare encrypted columns to constants, migrations need tweaking). ValueConverter approach is simpler and already proven in this codebase (Guid/String converter pattern) |
| Custom AES encryption | EfCore.ColumnEncryption NuGet | Extra dependency for something achievable with ~50 lines of built-in .NET code |
| Application-level backup | SQL Server Agent jobs | Agent not available in Developer edition Docker; T-SQL BACKUP DATABASE is universal |

**Installation:**
```bash
# No new packages needed - all dependencies already present
# SQL Server TDE is configured via T-SQL, not application code
# AES encryption uses System.Security.Cryptography (built-in)
```

## Architecture Patterns

### Recommended Project Structure
```
backend/src/
├── HIS.Application/
│   ├── DTOs/Security/          # New: SecurityComplianceDTOs.cs
│   └── Services/
│       └── ISecurityService.cs # New: compliance report interface
├── HIS.Infrastructure/
│   ├── Services/
│   │   ├── SecurityService.cs  # New: compliance reports, backup
│   │   └── AuditLogService.cs  # Enhanced: sensitive data access report
│   └── Security/
│       └── EncryptionConverter.cs # New: AES ValueConverter
├── HIS.API/
│   ├── Controllers/
│   │   └── SecurityController.cs # New: compliance endpoints
│   └── Middleware/
│       └── AuditLogMiddleware.cs # Enhanced: log GET for sensitive entities
scripts/
├── enable_tde.sql              # New: TDE setup script
├── setup_backup_schedule.sql   # New: backup configuration
└── security_compliance_seed.sql # New: permission matrix seed data
docs/
├── access-control-matrix.md    # New: SEC-01 deliverable
├── backup-procedures.md        # New: SEC-03 deliverable
└── incident-response-plan.md   # New: SEC-04 deliverable
frontend/src/
├── pages/SystemAdmin.tsx       # Enhanced: compliance report tab
└── api/security.ts             # New: security/compliance API client
```

### Pattern 1: AES Column Encryption via EF Core ValueConverter
**What:** Transparent encrypt/decrypt of specific string columns using AES-256-CBC, applied via HasConversion in OnModelCreating.
**When to use:** For Patient.IdentityNumber (CCCD), Patient.PhoneNumber, Patient.Email, Patient.InsuranceNumber -- fields that contain PII.
**Example:**
```csharp
// Source: EF Core ValueConverter pattern (already used in HISDbContext for Guid/String)
public class EncryptedStringConverter : ValueConverter<string, string>
{
    public EncryptedStringConverter(IDataProtectionProvider provider)
        : base(
            v => Encrypt(v, provider),
            v => Decrypt(v, provider))
    { }

    private static string Encrypt(string value, IDataProtectionProvider provider)
    {
        if (string.IsNullOrEmpty(value)) return value;
        var protector = provider.CreateProtector("HIS.PatientData");
        return protector.Protect(value);
    }

    private static string Decrypt(string value, IDataProtectionProvider provider)
    {
        if (string.IsNullOrEmpty(value)) return value;
        try
        {
            var protector = provider.CreateProtector("HIS.PatientData");
            return protector.Unprotect(value);
        }
        catch { return value; } // Graceful fallback for pre-encryption data
    }
}
```

### Pattern 2: Sensitive Data GET Audit Enhancement
**What:** Extend AuditLogMiddleware to also log GET requests when they access sensitive entity types (patients, examinations).
**When to use:** For SEC-01 compliance -- must track who accessed what patient data and when.
**Example:**
```csharp
// In AuditLogMiddleware.ShouldAudit():
private static readonly string[] SensitiveGetPaths = new[]
{
    "/api/patients/",      // Patient detail lookups
    "/api/examination/",   // Medical record access
    "/api/emr/",           // EMR data access
    "/api/inpatient/",     // Inpatient records
    "/api/prescription/",  // Prescription data
};

private static bool ShouldAudit(string path, string method)
{
    // Existing: always log POST/PUT/DELETE
    if (!method.Equals("GET", StringComparison.OrdinalIgnoreCase))
        return path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase)
            && !SkipPaths.Any(sp => path.StartsWith(sp, StringComparison.OrdinalIgnoreCase));

    // NEW: also log GET for sensitive data paths
    return SensitiveGetPaths.Any(sp =>
        path.StartsWith(sp, StringComparison.OrdinalIgnoreCase));
}
```

### Pattern 3: SQL Server Backup via T-SQL
**What:** Execute BACKUP DATABASE via EF Core raw SQL or ADO.NET for scheduled and on-demand backups.
**When to use:** For SEC-03 -- real backup implementation replacing the current stub.
**Example:**
```csharp
// In SecurityService.CreateBackupAsync():
var backupPath = $"/var/opt/mssql/backup/HIS_{DateTime.UtcNow:yyyyMMdd_HHmmss}.bak";
var sql = $@"BACKUP DATABASE [HIS] TO DISK = N'{backupPath}'
    WITH COMPRESSION, STATS = 10, NAME = N'{dto.BackupName}'";
await _context.Database.ExecuteSqlRawAsync(sql);
```

### Anti-Patterns to Avoid
- **Encrypting all columns:** Only encrypt PII fields. Encrypting non-sensitive fields (department names, service codes) adds overhead with no security benefit.
- **Logging GET for all endpoints:** Would create massive audit log noise. Only log GET requests for paths that return sensitive patient data.
- **Blocking audit writes:** The existing fire-and-forget pattern in AuditLogMiddleware is correct. Never make the main request wait for audit log completion.
- **Storing encryption keys in appsettings.json:** Use ASP.NET Core Data Protection API which manages key rotation automatically. Keys go to a protected file system location, not config.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Encryption key management | Custom key storage/rotation | ASP.NET Core Data Protection API | Handles key rotation, storage, protection automatically |
| Password hashing | SHA256 (exists in SystemCompleteService.HashPassword!) | BCrypt.Net (already used in AuthService) | SHA256 is not suitable for password hashing; BCrypt includes salt and work factor |
| Database backup | File copy or pg_dump equivalent | SQL Server T-SQL BACKUP DATABASE | Handles transaction consistency, compression, differential/log backups |
| TDE setup | Application-level full-DB encryption | SQL Server TDE (built-in feature) | Zero application code changes, transparent to EF Core, encrypts data files and backups |
| Compliance reports | Manual document generation | Backend API endpoint + frontend UI | Auditors want on-demand reports, not static documents |

**Key insight:** The biggest security issue in the current codebase is not missing features but the SystemCompleteService.HashPassword method using SHA256 instead of BCrypt. This should be fixed as part of SEC-01 (it creates users with weak password hashes).

## Common Pitfalls

### Pitfall 1: Pre-existing Unencrypted Data Migration
**What goes wrong:** Enabling column encryption on existing Patient records fails because existing data is plaintext and cannot be "unprotected."
**Why it happens:** ValueConverter tries to Decrypt on read but existing data is not encrypted.
**How to avoid:** The Decrypt method must gracefully handle plaintext (try/catch with fallback). Run a one-time migration script that reads all patients, encrypts their sensitive fields, and writes back. Add a migration flag column or use a sentinel prefix (e.g., encrypted values start with "ENC:") to distinguish.
**Warning signs:** Random patients returning garbled data after deployment.

### Pitfall 2: TDE Backup Certificate Loss
**What goes wrong:** TDE encrypts the backup files. If the certificate used for TDE is lost, backups become unrecoverable.
**Why it happens:** Certificate was not backed up separately when TDE was enabled.
**How to avoid:** The TDE setup script MUST include certificate backup to a separate location. Document this in backup procedures.
**Warning signs:** Cannot restore backup on a different SQL Server instance.

### Pitfall 3: Audit Log Volume Explosion
**What goes wrong:** Adding GET logging for sensitive paths generates 10-100x more audit records, filling disk and slowing queries.
**Why it happens:** GET requests are far more frequent than POST/PUT/DELETE.
**How to avoid:** Only log GETs for entity-detail paths (with ID), not list endpoints. Add partition/archival strategy. Index on Timestamp DESC with includes.
**Warning signs:** AuditLogs table growing >1GB/month, audit UI becoming slow.

### Pitfall 4: Over-scoping Compliance Documentation
**What goes wrong:** Spending days writing 50-page security documents that the auditor doesn't need.
**Why it happens:** Treating documentation as a literary exercise rather than a checklist.
**How to avoid:** Decree 85/2016 specifies the structure. Create templates that match the required sections. Focus on completeness of coverage, not prose quality.
**Warning signs:** More than 1 day spent on each document.

### Pitfall 5: SHA256 Password Hash Incompatibility
**What goes wrong:** If SystemCompleteService creates users with SHA256 hashes while AuthService verifies with BCrypt, those users cannot log in.
**Why it happens:** Two different hashing implementations in the codebase.
**How to avoid:** Fix SystemCompleteService.HashPassword to use BCrypt.Net.BCrypt.HashPassword() consistently. Add a migration for any users created with SHA256.
**Warning signs:** Newly created users via admin panel cannot log in.

## Code Examples

Verified patterns from the existing codebase:

### Existing ValueConverter Pattern (for reference)
```csharp
// Source: HISDbContext.cs - already used for Guid/String conversion on 31 tables
// This same pattern is used for column encryption
modelBuilder.Entity<Patient>(entity =>
{
    entity.Property(p => p.IdentityNumber)
        .HasConversion(new EncryptedStringConverter(dataProtectionProvider));
    entity.Property(p => p.PhoneNumber)
        .HasConversion(new EncryptedStringConverter(dataProtectionProvider));
    entity.Property(p => p.InsuranceNumber)
        .HasConversion(new EncryptedStringConverter(dataProtectionProvider));
    entity.Property(p => p.Email)
        .HasConversion(new EncryptedStringConverter(dataProtectionProvider));
});
```

### SQL Server TDE Setup
```sql
-- Source: Microsoft Learn - TDE documentation
-- Step 1: Create master key
USE master;
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'StrongMasterKeyPassword!2026';

-- Step 2: Create certificate
CREATE CERTIFICATE HIS_TDE_Cert WITH SUBJECT = 'HIS TDE Certificate';

-- Step 3: Backup certificate IMMEDIATELY
BACKUP CERTIFICATE HIS_TDE_Cert
    TO FILE = '/var/opt/mssql/backup/HIS_TDE_Cert.cer'
    WITH PRIVATE KEY (
        FILE = '/var/opt/mssql/backup/HIS_TDE_Cert_Key.pvk',
        ENCRYPTION BY PASSWORD = 'CertBackupPassword!2026'
    );

-- Step 4: Enable TDE on HIS database
USE HIS;
CREATE DATABASE ENCRYPTION KEY
    WITH ALGORITHM = AES_256
    ENCRYPTION BY SERVER CERTIFICATE HIS_TDE_Cert;

ALTER DATABASE HIS SET ENCRYPTION ON;
```

### Compliance Report Endpoint
```csharp
// Backend: SecurityController.cs
[HttpGet("compliance/access-matrix")]
[Authorize(Roles = "Admin")]
public async Task<IActionResult> GetAccessControlMatrix()
{
    var roles = await _context.Roles
        .Include(r => r.RolePermissions)
        .ThenInclude(rp => rp.Permission)
        .AsNoTracking()
        .ToListAsync();

    var matrix = roles.Select(r => new {
        r.RoleName,
        r.RoleCode,
        Permissions = r.RolePermissions.Select(rp => new {
            rp.Permission.Module,
            rp.Permission.PermissionCode,
            rp.Permission.PermissionName
        }).GroupBy(p => p.Module)
    });

    return Ok(matrix);
}
```

### Real Backup Implementation
```csharp
// Replace the stub in SystemCompleteService
public async Task<BackupHistoryDto> CreateBackupAsync(CreateBackupDto dto)
{
    var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
    var backupName = string.IsNullOrEmpty(dto.BackupName)
        ? $"HIS_Backup_{timestamp}" : dto.BackupName;
    var backupPath = $"/var/opt/mssql/backup/{backupName}.bak";

    var backupType = dto.BackupType?.ToUpper() switch
    {
        "DIFFERENTIAL" => "DATABASE HIS TO DISK = @path WITH DIFFERENTIAL, COMPRESSION, STATS = 10",
        "LOG" => "LOG HIS TO DISK = @path WITH COMPRESSION, STATS = 10",
        _ => "DATABASE HIS TO DISK = @path WITH COMPRESSION, STATS = 10"
    };

    var sql = $"BACKUP {backupType}, NAME = @name";
    await _context.Database.ExecuteSqlRawAsync(
        sql.Replace("@path", $"N'{backupPath}'").Replace("@name", $"N'{backupName}'"));

    return new BackupHistoryDto
    {
        Id = Guid.NewGuid(),
        BackupName = backupName,
        BackupType = dto.BackupType ?? "Full",
        FilePath = backupPath,
        BackupDate = DateTime.UtcNow,
        Status = "Completed"
    };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SHA256 for passwords | BCrypt/Argon2 with salt + work factor | Long-standing best practice | SystemCompleteService still uses SHA256 -- must fix |
| Manual audit trails | Middleware-based automatic logging | ASP.NET Core 3.0+ | Already implemented in AuditLogMiddleware |
| Column-level SQL encryption functions | EF Core ValueConverter + Data Protection API | EF Core 5+ | Transparent to application code |
| File-based backup scripts | API-driven backup with monitoring | Modern DevOps | Enables UI-driven backup management |

**Deprecated/outdated:**
- SHA256 for password hashing: AuthService correctly uses BCrypt, but SystemCompleteService.HashPassword still uses SHA256. This is a security vulnerability that must be fixed.
- `Encrypt=False` in connection string (appsettings.Development.json): Acceptable for dev, but production must use `Encrypt=True`.

## Open Questions

1. **Data Protection key storage location**
   - What we know: ASP.NET Core Data Protection stores keys in `%LOCALAPPDATA%` by default on Windows
   - What's unclear: For Docker deployment, keys need persistent storage (volume mount)
   - Recommendation: Configure `PersistKeysToFileSystem("/var/opt/mssql/backup/dpkeys")` or use Redis for key storage (Redis is already in the stack)

2. **Audit log retention policy**
   - What we know: Current AuditLogs table has no retention/archival mechanism
   - What's unclear: Vietnamese regulation requirement for audit log retention period (likely 5-10 years per medical record retention law)
   - Recommendation: Add archive table + cleanup job. For now, partition by year and document the retention requirement.

3. **Existing users with SHA256 hashes**
   - What we know: SystemCompleteService.HashPassword uses SHA256, AuthService.LoginAsync verifies with BCrypt
   - What's unclear: How many users were created via SystemCompleteService vs seed data (which may use BCrypt)
   - Recommendation: Add migration script that checks each user's hash format and rehashes with BCrypt. Accept both during transition.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** - AuditLogMiddleware.cs, AuditLogService.cs, AuditController.cs, CccdValidator.cs, Patient.cs, User.cs, Program.cs, appsettings.json, docker-compose.yml, SystemCompleteService.cs (backup stubs)
- [Microsoft SQL Server TDE documentation](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/transparent-data-encryption) - TDE setup procedures
- [ASP.NET Core Data Protection](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/) - Key management for column encryption

### Secondary (MEDIUM confidence)
- [Decree 85/2016/ND-CP](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-85-2016-ND-CP-bao-dam-an-toan-he-thong-thong-tin-theo-cap-do-317475.aspx) - 5-level information system security classification
- [Circular 12/2022/TT-BTTTT](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Thong-tu-12-2022-TT-BTTTT-huong-dan-Nghi-dinh-85-2016-ND-CP-bao-dam-an-toan-he-thong-thong-tin-theo-cap-do) - Implementation guidance for Decree 85
- [Circular 13/2025/TT-BYT](https://thuvienphapluat.vn/van-ban/EN/Cong-nghe-thong-tin/Circular-13-2025-TT-BYT-providing-guidance-on-adoption-of-electronic-medical-records/662324/tieng-anh.aspx) - EMR adoption guidance including security requirements
- [EF Core ValueConverter encryption pattern](https://gor-grigoryan.medium.com/encryption-and-data-security-in-clean-architecture-using-ef-core-value-converters-a-guide-to-911711a1ec52) - Column-level encryption approach

### Tertiary (LOW confidence)
- Decree 85 specific healthcare Level 3+ requirements - could not find detailed per-sector requirements in English; Vietnamese legal text confirms 5 levels but sector-specific details need validation with hospital compliance officer

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, no new dependencies
- Architecture: HIGH - patterns follow existing codebase conventions (ValueConverter, middleware, T-SQL scripts)
- Pitfalls: HIGH - based on direct codebase analysis (SHA256 issue, plaintext migration, TDE cert backup)
- Compliance documentation: MEDIUM - Decree 85/2016 structure is documented but sector-specific requirements may vary by hospital level
- CCCD validation: HIGH - already fully implemented, verified in codebase

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable domain, no fast-moving dependencies)
