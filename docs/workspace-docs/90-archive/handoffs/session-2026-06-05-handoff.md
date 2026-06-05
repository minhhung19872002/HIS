# Session handoff — 2026-06-05: Đối chiếu TaiLieuDoiThu + thực thi 4 phase đóng gap

## Việc đã làm trong phiên
1. **Extract + đối chiếu** 31 PDF `TaiLieuDoiThu/` (MQSoft + VRPACS — trùng bộ `docs/TaiLieuChucNang` đã đối chiếu 2026-05-29) → báo cáo gap + plan 4 phase:
   [`10-assessment/danh-gia-doi-chieu-tailieudoithu-2026-06-05.md`](../../10-assessment/danh-gia-doi-chieu-tailieudoithu-2026-06-05.md)
   (lần đầu đọc được full text `MQ - Nội trú - Bác sĩ` + `HDSD_DesktopEMR` 47 phiếu).
2. **Thực thi TOÀN BỘ 4 phase** (user yêu cầu "làm tất cả các phase") qua các agent code-change-controller tuần tự/cặp song song:
   - Phase 1 (8 item wire FE) — làm inline đầu phiên
   - Phase 2 (vi sinh persist, Key Image/Annotation persist, form CĐHA đầy đủ)
   - Phase 3 (KQ XN tại giường, PTTT F6, tủ trực ×3, phiếu phòng mổ, hoàn trả/đối tượng/toa về/hủy CLS, danh mục LIS/RIS)
   - Phase 4 (dược dự trù, KTM chờ QR, máy XN MockMode, số hóa HSBA, mobile full HSBA, audit 47 phiếu +5, viewer ROI/AvgMIP, per-modality perm, payroll/QĐ nhân sự/thẻ kho VPP/công văn MVP)
   Chi tiết kết quả từng item + deferred: xem mục 4 của báo cáo assessment trên.

## Trạng thái hiện tại
- **Working tree: 104 file thay đổi, ~5.000 dòng — CHƯA commit, CHƯA push** (đúng rule git ops).
- **12 migration mới `47_*.sql` → `58_*.sql`** — chưa apply DB nào (tự apply khi backend khởi động).
- Build cuối phiên: BE `dotnet build HIS.sln` **0 errors** · FE `npm run build` **exit 0**.
- **CHƯA test runtime** — toàn bộ wire theo contract verify bằng grep/read.

## Blocker / rủi ro cần biết
- Tường trình PTTT đang pack vào `SurgeryRequest.Notes` bằng sentinel `[TUONGTRINH]/[KETLUAN]` (tạm).
- Attachment số hóa HSBA lưu filesystem (pattern NonDicom) — **Cloud Run ephemeral, mất file khi restart** → cần chuyển R2/GCS trước khi dùng thật.
- Portal mobile nhận `patientId` FromQuery (pattern hiện hữu) — service đã check exam∈patient nhưng cần siết khi BN tự đăng nhập.
- G-07 (toa được phát) modal còn stub — chờ medicine picker dùng chung.

## Test runtime local — ✅ ĐÃ CHẠY 2026-06-05 (cuối phiên)
- Backend start OK: **12/12 migration 47→58 tự apply** ("Schema repair script executed" từng file, created 7 tables, 0 failures) · login admin OK · `GET /health/schema-drift` → **missingCount = 0**.
- **Smoke 17 endpoint mới: 17/17 OK (200)** sau khi fix 1 phát hiện quan trọng (dưới).
- Write-path: mock-receive máy XN insert thật vào `LabRawResults` (row SMOKE001 verify trong DB) · công văn create→list→delete round-trip OK.
- **Phát hiện + fix trong lúc test — migration mới `59_missing_entity_columns.sql`**: DB thiếu **13 cột** mà entity đã thêm ở các commit TRƯỚC phiên này không kèm migration (`Patients.BloodType/RhFactor` · `MedicalRecords.InsuranceCoverageRate/InsuranceFiveYearContinuous/Referral*×4` · `MedicalRecordArchives.IsOnLoan/Borrow*×4`) — làm 500 ở pharmacy-approval, payment/transactions, portal/visits, archives. Script idempotent, **prod nhiều khả năng cũng drift y vậy → sẽ tự heal khi deploy**. Đã apply local + verify 4 endpoint hết 500.
- Lỗi pre-existing còn treo (KHÔNG thuộc phiên này): script cũ `45_systemconfig_unique.sql` fail mỗi startup (`The multi-part identifier "r2.IsDeleted" could not be bound`) — cần fix riêng.
- Script smoke tạm: `TaiLieuDoiThu/smoke_test_phase.ps1` (local-only, không commit).

## Việc kế tiếp (đề xuất)
1. User quyết định commit (nhóm theo phase, NHỚ kèm `59_missing_entity_columns.sql`) + push → GitHub Actions deploy BE → verify schema-drift prod + re-smoke prod.
2. Fix script cũ `45_systemconfig_unique.sql` (alias r2 + IsDeleted) — task nhỏ riêng.
3. Follow-up list trong mục "Việc còn lại" của báo cáo assessment (sentinel Notes PTTT, storage R2/GCS cho attachment, medicine picker toa về, siết auth portal).
4. Smoke UI thủ công các trang mới (`/v2/analyzer-inbox`, `/v2/payroll-admin`…) + E2E.

## Cross-ref
- [`20-backlog/tech-debt-roadmap.md`](../../20-backlog/tech-debt-roadmap.md) *(nếu tồn tại — phiên này không đụng tech-debt)*
- [`rule-compliance-audit.md`](../../rule-compliance-audit.md)
- Skill: `his-flow-nangcap-package` (playbook) · `his-db-migration` (12 script mới) · `his-test-e2e` (bước test kế tiếp)
