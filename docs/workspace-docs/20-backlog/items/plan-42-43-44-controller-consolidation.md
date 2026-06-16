# Plan — #42/#43/#44 hợp nhất controller (boundary-map + khuyến nghị)

> `his-architecture-planner` + `core-impact-analysis`. Ngày 2026-06-16. **Đây là PLAN, chưa thực thi.**
> ⚠️ Refactor behavior-preserve, **rủi-ro-prod, blast-radius rộng** → chỉ thực thi trong **phiên có deploy+smoke**,
> sau khi user duyệt từng nhóm. KHÔNG blind-merge. Phụ thuộc #17 (tách god-file) cho phần Dược.

## Nguyên tắc (issue + tiebreaker SKILL-MAP §5b)
"Gộp phần CÙNG mục đích, giữ riêng phần khác quy trình" · *reuse ≠ nhồi nhét* · gộp mù tạo god-controller = anti-pattern.

## #42 — Dược ×6 (route + size)
| Controller | Route | Endpoint | LOC | Quyết |
|---|---|---|---|---|
| PharmacyController | `api/pharmacy` | 24 | 1011 | **đích gộp** (đã god-ish → cần #17 trước) |
| PharmacyEnhancementController | `api/pharmacy` | 8 | 201 | **GỘP vào PharmacyController** (cùng prefix/domain, split-vì-size) |
| HospitalPharmacyController | `api/hospital-pharmacy` | 21 | 216 | **GIỮ RIÊNG** (kho/nội trú) |
| PharmacyApprovalController | `api/pharmacy-approval` | 9 | 72 | **GIỮ RIÊNG** (duyệt) |
| ClinicalPharmacyController | `api/clinical-pharmacy` | 2 | 163 | **GIỮ RIÊNG** (dược lâm sàng) |
| InpatientDispensingController | `api/inpatient-dispensing` | 3 | 255 | **GIỮ RIÊNG** (cấp phát) |

→ **Việc thật**: chỉ gộp Enhancement→Pharmacy (8 ep). **Thứ tự**: làm SAU #17 (PharmacyController 1011L cần tách trước, không nhồi thêm). Service kho dùng chung: verify `HospitalPharmacyService`/`PharmacyApprovalService` không bị 6 controller gọi chồng chéo (impact-analysis trước).

## #43 — Báo cáo ×6 → **KHUYẾN NGHỊ KHÔNG GỘP**
AdrReport · HospitalReport · PaymentReports · ReconciliationReport · StockReport · WorkloadReport = **6 domain báo cáo độc lập** (ADR/vận hành/thanh toán/đối soát BHYT/tồn kho/khối lượng). Không có chồng chéo thật → gộp = god-controller (ngược SRP). **Tiền-đề "×6 chồng chéo" trong issue lỗi thời.** → đề xuất **close #43 not-planned** (hoặc đổi scope thành "chuẩn hoá base-class ReportController nếu có boilerplate trùng" — cần verify thêm).

## #44 — Danh mục ×3-4 → DRY ở service, giữ controller riêng
Lis/Ris/Master/FunctionalDiagnostic Catalog: trùng **pattern CRUD** (list/create/update/delete), KHÔNG trùng data/domain. → KHÔNG gộp controller; cân nhắc **trích base `CatalogServiceBase<T>`** nếu CRUD lặp ≥3 (rule-of-three). Effort thấp, risk thấp (additive, không đổi route/contract).

## Đề xuất thứ tự thực thi (khi user duyệt + có phiên deploy)
1. **#44** trước (risk thấp nhất: extract shared service, không đổi contract).
2. **#42** Enhancement→Pharmacy — SAU #17.
3. **#43** — close not-planned / re-scope (không có việc refactor thật).

> Mọi bước: impact-analysis (ai gọi service/route) → batch nhỏ → build → **smoke 3-5 flow/route** → verify. Behavior-preserve tuyệt đối.
