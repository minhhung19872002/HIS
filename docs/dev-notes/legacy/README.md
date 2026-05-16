# docs/dev-notes/legacy/ — Archive

> **Mục đích:** Chứa script/file legacy đã được thay thế nhưng giữ làm reference lịch sử.
> **KHÔNG chạy lại** các SQL trong folder này.
> **Last updated:** 2026-05-16

## Nội dung

| File | Vai trò trước đây | Thay thế bởi |
|---|---|---|
| `01_CreateDatabase.sql` | Tạo schema DB gốc | `backend/src/HIS.Infrastructure/Data/Scripts/01_core_tables.sql` |
| `02_SeedData.sql` | Seed master data gốc | `backend/src/HIS.Infrastructure/Data/DatabaseSeeder.cs` |
| `fix_password.sql` | Fix password user admin (one-off) | `DatabaseSeeder.cs` tự seed admin với BCrypt hash |

## Lý do giữ

- CLAUDE.md các session sớm có reference các file này
- Lịch sử migration cho audit

## Migration system hiện tại

Đọc `docs/ARCHITECTURE.md` §3 (Schema repair runner) — `ProductionSchemaRepairRunner`
tự apply mọi script embedded trong `backend/src/HIS.Infrastructure/Data/Scripts/`
lúc backend startup.
