# STATUS — đang ở đâu · blocker · việc kế tiếp

> Cập nhật cuối: **2026-06-07 ~04:00**. File này là cửa vào nhanh; chi tiết xem
> [`10-assessment/prompts-doithu-gap.md`](10-assessment/prompts-doithu-gap.md) (mục "Tình trạng triển khai") +
> handoff trong [`90-archive/handoffs/`](90-archive/handoffs/).

## Đang ở đâu

- **Gói bù gap đối thủ HOÀN TẤT 100%** ([`10-assessment/prompts-doithu-gap.md`](10-assessment/prompts-doithu-gap.md)):
  - Đợt 1 (P1–P5) ✅ · Đợt 2 (P6–P10) ✅ · Đợt 3 (P11) ✅ · **Wave defer (các prompt còn lại) ✅ 2026-06-07**.
  - Regression chốt: build 2 tầng 0 err · migration **61→68** apply sạch · schema-drift 0 · smoke endpoint mới 13/13
    · Cypress 81/81 (nhiều lần) · Playwright xanh (kể cả reception sau fix TZ).
- **Bug TZ — AUDIT TOÀN CỤC HOÀN TẤT 2026-06-07**: helper `HIS.Core.Common.VnTime`; 57 site `.Date ==` phân loại
  đầy đủ (bảng trong report agent); **fix 31 site tổng** (Tier-1 4 + loại A 15 + trọn cụm D QueueTickets 12 so sánh
  + 2 nơi ghi `IssueDate` Now→UtcNow). Verify repro bảng tiếp đón 0→4 rows lúc 1h sáng. Còn defer: 3 site DosingDate
  (semantics chưa rõ — UNKNOWN) + lưu ý AdmissionDate/ReceiptDate vẫn ghi `DateTime.Now` (đúng trên prod UTC,
  lệch nhẹ ban đêm trên dev — chuẩn hóa storage là việc riêng).
- **✅ ĐÃ COMMIT + PUSH + DEPLOY PROD 2026-06-07** (7 commit `45e5e33..fb9183e`, rebase lên 3 commit song song
  từ nguồn khác: G-37 phiếu in XN, G-07 toa về ItemPicker, fix money-bug đảo nhãn, fix mới script 45 Msg 1934).
  Conflict duy nhất (TreatmentMonitorSection): giữ cả modal G-07 remote (wire `dischargePrescription`) lẫn
  InpatientPrescriptionModal cho y lệnh thường quy. **Prod verify: schema-drift 0 (migration 61–68 tự apply),
  smoke 9/9 endpoint mới OK, public lookup anonymous trả thông điệp trung lập đúng.**
- E2E mới trong phiên: `frontend/e2e/doithu-gap-dot1.spec.ts` (+ sửa spec cũ `reception-drawer.spec.ts` selector `.hui-drawer`).

## Blocker / rủi ro đang treo

1. **HDDT (P5)**: khung config-driven xong — **chờ user cấp thông tin NCC** (VNPT/Viettel/MISA, endpoint, credential qua ENV).
2. Attachment số hóa HSBA lưu filesystem — Cloud Run ephemeral → cần R2/GCS trước khi dùng thật.
3. Tường trình PTTT pack sentinel vào `SurgeryRequest.Notes` (tạm).
4. Portal mobile `patientId` FromQuery — siết auth khi BN tự đăng nhập.
5. ~~G-07 toa được phát: medicine picker~~ → ✅ ĐÃ XONG (commit `88d115d` từ nguồn song song — ItemPicker + lưu thật).
6. Rotate R2 API token (TODO bảo mật cũ).
7. Defer nhỏ còn treo: batch-check mapping PTTT row action · prefill narrativeBody SurgeryReportModal ·
   UI nhập SignerRole khi tạo trình ký · DefaultKtvId/ApproverId vào API collect · worker nhắc hẹn lấy mẫu.

## Việc kế tiếp

1. **User quyết: commit (nhóm theo đợt/wave) + push** → GitHub Actions deploy → verify schema-drift prod
   (migration 61–68 tự apply) + re-smoke prod.
2. Task riêng: audit nốt pattern TZ (`IssueDate=DateTime.Now` subsystem queue + phân loại ~50 site `.Date ==`).
3. Smoke UI thủ công các trang mới/đổi + viết thêm E2E cho Đợt 2/3 + wave.
4. HDDT: chờ thông tin NCC.
