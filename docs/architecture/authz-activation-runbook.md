# AUTHZ Activation Runbook — trạng thái wiring + kill-switch (#369/#370/#371)

> **Mục đích:** doc VẬN HÀNH cho phiên deploy+smoke của epic AUTHZ (#372). Trả lời: *cái gì đã build & wire, cái gì
> dormant, bật kill-switch nào theo thứ tự nào, và gotcha gì phải biết trước khi bật trên prod.*
> **Nguồn:** survey code trực tiếp 2026-07-18 (mọi mục có cite `file:dòng` để verify). Thiết kế gốc = `docs/workspace-docs/10-assessment/danh-gia-phan-quyen-rbac-redesign.md`.
> **★ TRẠNG THÁI MẶC ĐỊNH: toàn bộ enforcement AUTHZ-3/AUTHZ-4 đang TẮT (kill-switch OFF) → 0 đổi hành vi.** AUTHZ-5 (audit) thì **ĐANG BẬT** sẵn.

## 0. Bảng kill-switch tổng (appsettings `Auth:*` / `AuditRetention:*`)

| Key | Default | Bật lên = | Trạng thái wiring |
|---|---|---|---|
| `Auth:BranchIsolationEnabled` | `false` | EF query-filter theo BranchId cho **Patient + QueueTicket** (mọi LINQ qua DbContext) | built + auto-wired, gated OFF |
| `Auth:TreatmentRelationshipEnabled` | `false` | chặn DOCTOR/NURSE không có quan hệ điều trị ở **3 read-path** (xem §1) | built + wired **MỘT PHẦN**, gated OFF |
| `Auth:TreatmentRelationshipGraceDays` | `30` | ngưỡng ngày (không phải on/off) | — |
| `Auth:SoDEnabled` | `false` | SoD grant-time check ở CreateUser/UpdateUser | built + wired, gated OFF · **cần seed SoDConstraint mới có tác dụng** |
| `Auth:DelegationEnabled` | `false` | resolve delegation + chạy DelegationExpiryWorker | ⚠️ resolve **0-caller** (không cấp quyền thật); chỉ expiry-worker chạy |
| `Delegation:ExpiryIntervalHours` | `6` | chu kỳ worker auto-expire | — |
| `AuditRetention:Enabled` | **`true`** | AuditRetentionWorker xóa AUTH>730d / ACCESS>548d | **ĐANG BẬT** |
| (không có switch) Break-glass endpoint | — | **LUÔN reachable** `POST /api/auth/break-glass` | ⚠️ **ungated — đã live trên prod** |
| (không có switch) AuditWriter + Middleware + trigger append-only | — | ghi audit mọi POST/PUT/DELETE + sensitive-GET | **ĐANG BẬT** |

---

## 1. AUTHZ-3 (#369) — Scope & cô lập dữ liệu

**Kill-switch:** `Auth:BranchIsolationEnabled`, `Auth:TreatmentRelationshipEnabled` (đều `false`), `Auth:TreatmentRelationshipGraceDays=30`.

**✅ Built + wired (bật switch = có hiệu lực ngay):**
- **Branch query-filter** Patient + QueueTicket — `HISDbContext.cs:1305-1310`. Filter an toàn: `!IsDeleted && (!enabled || currentBranchId==null || entity.BranchId==null || entity.BranchId==currentBranchId)` → bản ghi `BranchId=null` LUÔN thấy (escape-hatch legacy).
- **Treatment-relationship guard** `EnsureCanAccessPatientAsync` — wire vào **đúng 3 method** (KHÔNG phải toàn bộ EMR): `ExaminationCompleteService.GetMedicalRecordFullAsync` (Exam.cs:38-41), `InpatientCompleteService.GetAdmissionDetailAsync` (PatientMgmt.cs:155-158), `SpecialtyEmrService.GetByIdAsync` (:104-107). 5 nguồn quan hệ OR: MedicalRecord/Examination/Admission/ServiceRequest/InpatientConsultationMember trong grace-days.
- **JWT claim** departmentId/branchId (AuthService.cs:350-356) + `ICurrentUserAccessor`.
- **UserRoles.ScopeType/ScopeId** (migration 146) — ghi thật qua admin gán role (`SystemCompleteService.M17.Admin.Part1.cs:158-179,232-255`), fallback `ORG`.

**🟡 Dormant / ⛔ chưa build:**
- ⛔ **Field-masking billing (Cashier không thấy chẩn đoán)** — **CHƯA BUILD**. Không có code mask Diagnosis theo role Cashier; `BillingCompleteService.StatsReversal.cs:333` vẫn xuất `MainDiagnosis` (CHANDOAN, XML BHYT). → **KHÔNG được công bố "AUTHZ-3 hoàn tất" tới khi build mask** (task riêng).
- 🟡 Guard chỉ phủ **3 read-path đơn-lẻ** — CHƯA phủ list (`GetInpatientListAsync`, `SpecialtyEmr.SearchAsync`) hay Prescription/ServiceRequest/LIS → bảo vệ **MỘT PHẦN**.
- 🟡 Break-glass bypass nhắc trong message (TreatmentRelationshipService.cs:91) nhưng **chưa nối dây** vào guard.

**★ GOTCHA kích hoạt (quan trọng nhất):** mọi DOCTOR/NURSE hiện có `ScopeType='ORG'` (backfill migration 146) → được **miễn trừ hoàn toàn** khỏi treatment-check (TreatmentRelationshipService.cs:82-84). ⇒ **Bật `TreatmentRelationshipEnabled=true` KHI CHƯA thu hẹp ScopeType = NO-OP thực tế.** Phải backfill ScopeType→DEPT/BRANCH cho role lâm sàng TRƯỚC.

**Thứ tự bật:** (1) schema-drift=0 cho cột UserRoles.Scope*; (2) bật `BranchIsolationEnabled` trước (rủi ro thấp, có escape-hatch null) + review dữ liệu BranchId=null; (3) backfill ScopeType role lâm sàng; (4) bật `TreatmentRelationshipEnabled`, giám sát log `TreatmentRelationship DENY` đánh giá false-positive.

**Smoke:** DOCTOR không-quan-hệ gọi 3 API trên → `UnauthorizedAccessException`; user ScopeType=ORG/DEPT → qua (miễn trừ); list Patient với BranchIsolation ON → bản ghi khác BranchId ẩn, BranchId=null vẫn hiện; Cashier gọi billing → **vẫn thấy MainDiagnosis** (ghi nhận gap).

---

## 2. AUTHZ-4 (#370) — SoD · Delegation · Break-glass · Temp-permission

**Kill-switch:** `Auth:SoDEnabled`, `Auth:DelegationEnabled` (đều `false`), `Delegation:ExpiryIntervalHours=6`.

**✅ Built + wired:**
- **SoD grant-time** — `SoDService.EnsureNoGrantTimeConflictAsync` (SoDService.cs:23-45) gọi từ CreateUser/UpdateUser (`M17.Admin.Part1.cs:164,238`). Bật `SoDEnabled` → chặn gán cặp role xung đột (throw InvalidOperationException). **⚠️ cần seed ≥1 SoDConstraint (role-role, EnforcedAt='grant', IsActive=1) mới có gì để chặn** — bảng rỗng sau migration = bật switch vẫn no-op.
- **DelegationExpiryWorker** — Program.cs:40, gọi `ExpirePastDueAsync` (ExecuteUpdate Status 0→1 cho grant quá ValidTo). Wired end-to-end cho auto-expire (gated `DelegationEnabled`).
- **Break-glass endpoint** — `POST /api/auth/break-glass` (AuthController.cs:249-263 → AuthService.BreakGlassAsync:552-593): Reason≥20 ký tự, insert BreakGlassSession, SignalR notify. **⚠️ KHÔNG có kill-switch — đã reachable trên prod ngay khi deploy** (khác SoD/Delegation).

**🟡 Dormant / ⛔ chưa build:**
- ⚠️ **Delegation resolve = 0 CALLER.** `ResolveActiveDelegatedRoleIdsAsync` tồn tại + DI-registered nhưng `PermissionService.cs` KHÔNG tham chiếu → **bật `DelegationEnabled=true` KHÔNG cấp quyền ủy thật nào** (chỉ tạo/expire row DelegationGrant). Muốn có tác dụng phải **wire resolve vào PermissionService** (chưa làm — cần smoke).
- 🟡 **UserPermissionOverride deny-override** — entity + bảng có, nhưng **0 tham chiếu** trong PermissionService/decision-path. Không có CRUD/logic deny-wins-grant → chưa hoạt động.
- 🟡 **Break-glass 72h review** (ReviewedBy/ReviewOutcome) — cột có, tạo session set null, **không endpoint/worker nào cập nhật** → nửa hậu-kiểm dormant. `IsEmergencyAccess` auto-variant cũng chưa có code path.
- ⛔ **SoD runtime-check (approver ≠ creator)** — **CHƯA BUILD.** SoDService chỉ query `EnforcedAt='grant'` (SoDService.cs:33); không code nào so người-duyệt vs người-tạo. Đây là **task build**, không phải activation (không có switch).

**Thứ tự bật:** (1) schema-drift=0 (migration 148); (2) seed SoDConstraint nếu muốn SoD có tác dụng; (3) `SoDEnabled=true` (rủi ro thấp); (4) **KHÔNG kỳ vọng `DelegationEnabled=true` cấp quyền** tới khi wire resolve vào PermissionService; (5) SoD-runtime + UserPermissionOverride = build trước, không activate được.

**Smoke:** SoD OFF → gán role xung đột vẫn qua; SoD ON + seeded constraint → 409/400 sạch (không 500); Delegation ON + 0 row → worker log started, 0 rows, không exception; Break-glass Reason<20 → 400, hợp lệ → 200 + row + SignalR (lỗi SignalR phải nuốt không chặn tạo session, AuthService.cs:583). **★ Regression trọng yếu:** mọi thay đổi wire Delegation vào `PermissionService.cs` = blast-radius cao nhất (đường quyết định authz live) — verify permission-check cũ không đổi.

---

## 3. AUTHZ-5 (#371) — Audit compliance

**★ Khác 2 phase trên: phần lớn ĐANG BẬT sẵn trong build mặc định.**

**Kill-switch duy nhất:** `AuditRetention:Enabled=true` (+ `AuthRetentionDays=730`, `AccessRetentionDays=548`, `IntervalHours=24`).

**✅ Built + wired + ACTIVE (không switch, live theo build):**
- **AuditWriterWorker** (Program.cs:54) — drain `Channel<AuditLog>` batch-write (Max 20).
- **AuditLogMiddleware** (Program.cs:386) — enqueue mọi POST/PUT/DELETE + sensitive-GET (non-blocking TryWrite).
- **Trigger append-only** `trg_AuditLogs_NoUpdate`/`NoDelete` (migration `150_*.sql:39-82) — NoUpdate luôn chặn; NoDelete chặn trừ khi `CONTEXT_INFO()` == `'RETE'` (bypass DUY NHẤT dùng bởi AuditRetentionWorker.DeleteBatchAsync:130-143, set trước DELETE + reset finally).
- **AuditRetentionWorker** (Program.cs:55, gated `AuditRetention:Enabled=true`) — sau 10' delay, mỗi 24h xóa batch TOP(5000) AUTH>730d/ACCESS>548d; DATA/WORKFLOW/ADMIN/SECURITY **giữ vĩnh viễn**.
- **2 báo cáo truy vết** — `GET /api/audit/permission-changes` + `GET /api/audit/summary` (AuditController → AuditLogService.cs:264-396), gated `[RequirePermission(AuditLog.Read)]`. *(FE viewer: `CompliancePanel.tsx` 3 tab.)*
- **RecordRoleChangeHistoryAsync** (SystemCompleteService.cs:62-123, call M17.Admin.Part1.cs:263) — ghi PermissionChangeHistory `ChangeType='UserRole'` khi admin đổi role.

**🟡 Dormant / ⛔ chưa build:**
- 🟡 **AuditEventCatalog** (6 nhóm AUTH/ACCESS/DATA/WORKFLOW/ADMIN/SECURITY) — **0 tham chiếu ngoài file chính nó**; AuditLog hiện dùng Action free-text (Read/Create/...), CHƯA dùng taxonomy này. Kích hoạt = thêm cột `EventType` + resolver + đổi IN-list của RetentionWorker sang `GroupOf()`.
- 🟡 **PermissionChangeHistory ChangeType khác** — chỉ `'UserRole'` được ghi; `'RolePermission'`/`'UserPermissionOverride'`/`'Delegation'` chưa có code path ghi.
- ⛔ **Cold-storage R2 (≥10 năm)** — chưa build (AuditRetentionWorker.cs:16 ghi chú "phase sau"). DATA/WORKFLOW/ADMIN/SECURITY giữ mãi, chưa có plan quản size.

**Activation:** giữ `AuditRetention:Enabled=true` mọi env (kill-switch thật duy nhất); còn lại đã live. Mở rộng = wire thêm ChangeType / bật AuditEventCatalog (task build).

**Smoke:** POST bất kỳ → row mới trong AuditLogs vài giây; raw UPDATE/DELETE AuditLogs từ SSMS (không CONTEXT_INFO) → RAISERROR+rollback; `GET /api/audit/summary` (ADMIN) → TotalEvents>0; đổi role user → `GET /api/audit/permission-changes` có row `UserRole`; log `AuditRetentionWorker` ~10' sau khởi động + mỗi 24h.

---

## 4. Migration liên quan (auto-apply lúc start, idempotent) — verify `GET /health/schema-drift`=0
`146_authz3_userrole_scope.sql` · `148_authz4_sod_delegation_breakglass.sql` · `149_authz5_permission_change_history.sql` · `150_authz5_auditlogs_append_only.sql`.

## 5. TL;DR cho phiên smoke — thứ tự an toàn
1. **schema-drift=0** (146/148/149/150).
2. **AUTHZ-5 (audit):** đã live — chỉ verify smoke §3. Giữ `AuditRetention:Enabled=true`.
3. **AUTHZ-3 branch:** bật `BranchIsolationEnabled` → smoke list Patient/QueueTicket (chú ý BranchId=null).
4. **AUTHZ-3 treatment:** backfill ScopeType role lâm sàng **TRƯỚC** → bật `TreatmentRelationshipEnabled` → smoke 2-doctor (nhớ: chỉ 3 read-path, chưa mask billing).
5. **AUTHZ-4 SoD:** seed SoDConstraint → bật `SoDEnabled` → smoke gán role xung đột.
6. **Chưa activate được (cần build trước):** Delegation-resolve→PermissionService · SoD-runtime-check · UserPermissionOverride-deny · field-masking-billing · break-glass-review-72h · AuditEventCatalog-taxonomy.
7. **Lưu ý an ninh:** break-glass endpoint đã reachable **không gate** — quyết định có gate + build review-72h trước go-live.

> Cập nhật khi: thêm/bật kill-switch mới · wire thêm read-path guard · build phần "chưa activate được" ở §5.6. Chủ đề enforce nào chuyển built-dormant→wired thì đổi bảng §0 + section tương ứng.
