# KẾ HOẠCH gom 1.415 task → issue GitHub (CHƯA tạo — chờ user duyệt khi đủ token)

> Nguồn máy-đọc-được: [`data/issue-plan.json`](data/issue-plan.json) (body từng issue đã dựng sẵn).
> Script tạo: [`create-issues-from-plan.mjs`](create-issues-from-plan.mjs) (mặc định **dry-run**).

## 1. Quyết định gom nhóm (đã cân nhắc dedup)
**KHÔNG tạo 1.415 issue.** Gom theo **đơn vị tự nhiên của viewer = partition sạch của 1.415 task**:

| Tier | Đơn vị | Số issue | Task |
|---|---|---|---|
| 1 | **Phân hệ** (1 issue/phân hệ) | 38 | 1.155 |
| 2 | **Luồng E2E** (1 issue/luồng) | 12 | 195 |
| 3 | **Cross-cutting** (permission/ui-state/integration/critic) | 4 | 65 |
| | **TỔNG** | **54** (50 tạo mới + 4 cập nhật #294-297) | **1.415** |

**Vì sao chọn mức phân-hệ/luồng/cross:**
- **Partition chứng minh được:** 1.155 + 195 + 65 = 1.415, mỗi task thuộc **đúng 1** issue → đóng hết 54 issue ⇒ **mọi task có evidence**, không sót/không trùng (`issue-plan.json.summary.partition_ok = true`).
- **1:1 với folder evidence** (`<layer>-<modid>/`, `flows/`, `cross/`) và với trang phân hệ trong viewer → tester làm theo từng issue = chụp đúng 1 folder.
- **Dedup-aware:** mỗi issue là **bản "thực-thi + evidence"**, làm **CON** của các epic chiều/nhóm test đã có (#216-289) qua `parentRefs` (= `refIssues` trong data) — **KHÔNG lặp scope**. 4 phân hệ gap đã có issue (#294-297) → chỉ **cập nhật body thêm checklist**, không tạo trùng.

## 2. Mỗi issue gồm gì (body đã dựng sẵn trong JSON)
- Tiêu đề `[TEST-EV][<CODE>] <tên> — N task` · label `test` (label duy nhất tồn tại trên repo).
- Thư mục evidence + link viewer + **issue cha** (chiều/nhóm test) + nhắc "test execution làm CUỐI".
- **Checklist `- [ ] TC-<CODE>-NNN [P?] <title> — ev: <states>`** gom theo loại test → đóng hết checkbox = phân hệ đủ evidence.

## 3. Cách TẠO khi đủ token (rẻ, không cần agent)
```bash
cd docs/architecture/evidence
node create-issues-from-plan.mjs            # DRY-RUN: in ra sẽ tạo/cập nhật gì (không đụng GitHub)
node create-issues-from-plan.mjs --apply    # THẬT: tạo 50 issue mới (idempotent: bỏ qua nếu trùng tiêu đề) + append checklist vào #294-297
```
- Script **idempotent**: trước khi tạo, `gh issue list --search "<title> in:title"` — đã có thì bỏ qua (chống trùng nếu chạy lại).
- 4 issue `action:"update"` (#294-297): script **append** checklist vào body hiện có (không ghi đè).
- Sau khi tạo: cập nhật `parentRefs` (comment 2 chiều) nếu muốn liên kết epic ↔ issue con.

## 4. Phương án thay thế (nếu sau này muốn ÍT issue hơn)
- **Coarse (26 issue):** gộp phân hệ theo 10 nhóm-lớp + 12 luồng + 4 cross. Đổi `kind:"module"` → gom theo `layer`/group. Ít issue nhưng mỗi cái rất lớn (100+ task).
- **Zero-new (chỉ enrich):** map mỗi task vào issue (nhóm×chiều) có sẵn #232-271 theo `(group, category)` rồi dán checklist vào body issue cũ — 0 issue mới nhưng issue cũ phình to + mapping phức tạp.
- → **Khuyến nghị giữ 54 (per-phân-hệ)** vì khớp 1:1 folder evidence + viewer, dễ track nhất.

## 5. Trạng thái
- **CHƯA tạo issue nào** (trừ #294-297 đã tạo phiên trước). Kế hoạch + script + JSON sẵn sàng.
- Khi user yêu cầu → chạy script `--apply` (hoặc nhờ tôi chạy). Vẫn tuân **test execution làm CUỐI CÙNG**.
