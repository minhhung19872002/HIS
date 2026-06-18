# Test bảo mật: xác thực + phân quyền · 2026-06-18

> ## ✅ THỰC THI (2026-06-18) — #293, commit `311bb39`, deploy prod success
> Gắn `[Authorize(Roles=...)]` cho **8 controller** `[Authorize]` trơn: AdminModules · Audit · Security ·
> EmrManagement · SpecialtyEmr · SigningWorkflow · Reporting · EmployeeProfile.
> Role-string đối chiếu nguồn-sự-thật `AuthService.RoleCodeToEnglishRoles` (ADMIN→Admin/Manager/Director,
> DOCTOR→Doctor, NURSE→Nurse, CASHIER→Cashier/Accountant) + RoleName prod (Quản trị hệ thống/Bác sĩ/Điều dưỡng/
> Thu ngân) — đủ biến thể Anh+Việt, **bỏ StatisticsOfficer/MedicalRecordManager (không emit)**.
> - Admin: `Admin,Manager,Director,Quản trị hệ thống` | EMR +`Doctor,Bác sĩ,Nurse,Điều dưỡng` | Signing +`Doctor,Bác sĩ` | Reporting +`Accountant,Cashier,Thu ngân`.
> - **Verify prod: admin → 8/8 endpoint = 200 (không 403)** → không khóa nhầm. Prod UserRoles: DOCTOR 5·NURSE 2 (EMR giữ).
> - ⏳ **Chưa test 403 cho role thấp** (cấm tạo account non-admin) → task test (làm cuối).
> - 🔜 **HOÃN shortlist** controller `[Authorize]` trơn khác (EndpointSecurity/EmrAdmin/DataManagement/MedicalRecordArchive/InsuranceXml/BillingComplete) — chờ duyệt.

> Probe ranh giới auth trên prod (gọi không token) + check tĩnh role-gate. Không tạo tài khoản phụ (bị cấm) nên role-level exploit chưa xác minh runtime — nhưng thiếu role gate trong code là rõ.

## ✅ Tầng XÁC THỰC (authentication) — KÍN
15/15 endpoint nhạy cảm gọi **KHÔNG token → 401**: patient PII, audit logs, finance revenue, security matrix, admin payroll, employee assets, billing invoices, EMR shares, reporting, + POST discharge / digital-signature open-session / central-signing sign-hash / create payment / daily-seed / dev-link-radiology. → FallbackPolicy `RequireAuthenticatedUser` chặn ẩn danh hoạt động toàn app (B3 anonymous đã đóng). Cả endpoint có `[AllowAnonymous]` (daily-seed, dev-link) vẫn 401 — an toàn.

## 🔴 Tầng PHÂN QUYỀN (authorization theo role) — CÒN HỞ
Check tĩnh `[Authorize(Roles=...)]` vs `[Authorize]` trơn:
| Controller | Role gate | Rủi ro |
|---|---|---|
| InpatientComplete | ✅ 6/7 action có Role | ok |
| DigitalSignature / CentralSigning / AssetManagement | ✅ controller-level Role | ok |
| **AdminModules** (payroll, quản trị) | ❌ chỉ `[Authorize]` | bất kỳ user đăng nhập vào được quản trị/payroll |
| **Audit** (nhật ký hệ thống) | ❌ chỉ `[Authorize]` | mọi user đọc audit log |
| **Security** (cấu hình bảo mật, access-matrix) | ❌ chỉ `[Authorize]` | mọi user đọc cấu hình bảo mật |
| **EmrManagement / SpecialtyEmr** (sửa/chia sẻ bệnh án) | ❌ chỉ `[Authorize]` | mọi user thao tác EMR (vi phạm quyền riêng tư BN) |
| **SigningWorkflow** | ❌ chỉ `[Authorize]` | mọi user can thiệp luồng ký |

→ Đây là **residual của B3** (RBAC lỏng cho hành động pháp lý/quản trị): đợt trước đóng ẩn-danh (FallbackPolicy) nhưng chưa gắn role cho nhóm admin/audit/security/EMR/signing. Một tài khoản quyền thấp (lễ tân/kế toán) đăng nhập là chạm được.

## Hạn chế kiểm thử
Không tạo được tài khoản non-admin (tạo account = thao tác bị cấm) → chưa chứng minh khai thác runtime (đăng nhập lễ tân → 200 trên admin). Cần 1 account quyền thấp sẵn có để xác nhận; nhưng thiếu `[Authorize(Roles)]` trong code đã đủ để fix.

## PROMPT cho Claude Code (paste)
```
Đọc .claude/SKILL-MAP.md (his-qa-anti-pattern) + docs/workspace-docs/10-assessment/prod-security-authz-2026-06-18.md. Residual bảo mật B3 — siết RBAC role cho controller nhạy cảm chỉ có [Authorize] trơn (bất kỳ user đăng nhập chạm được). KHÔNG commit/push tới khi tôi duyệt.

Thêm [Authorize(Roles=...)] (hoặc policy) phù hợp cho:
- AdminModules → Admin/quản trị hệ thống.
- Audit → Admin/Auditor (đọc nhật ký).
- Security → Admin (cấu hình bảo mật/access-matrix).
- EmrManagement + SpecialtyEmr → vai trò lâm sàng được phép (Bác sĩ/Điều dưỡng…), KHÔNG cho lễ tân/kế toán sửa/chia sẻ bệnh án.
- SigningWorkflow → vai trò ký/duyệt.
Rà thêm các controller khác chỉ [Authorize] trơn mà thao tác pháp lý/quản trị/tài chính/PII (vd Reporting/finance, EmployeeProfile) → gắn role.
KHÔNG đụng endpoint công khai có chủ đích (Auth login, AppointmentBooking, public-emr, queue-display, health).

Verify: viết integration test authz — user role thấp (Cashier/Receptionist) gọi các endpoint trên → 403; role đúng → 200. Báo cáo controller đã siết + ma trận role.
```
