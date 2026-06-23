# Test 4 cửa — Coordinator Allocation (38 phân hệ + 12 luồng + 4 cross)

> **NGUỒN-SỰ-THẬT của việc CHIA 4 cửa khi chạy test.** Nằm trong repo → áp **mọi phiên / mọi máy** (commit + push).
> - Cơ chế CHẠY (fail→fix-issue · manifest mutex · model-tier · read-only side-effect · case T1-T6) = **[`.claude/workflow/parallel-windows.md`](../../../.claude/workflow/parallel-windows.md) §7** (LINK, KHÔNG copy).
> - Quy ước đặt-tên ảnh / viewer / regen / dedup-GitHub = **[`docs/architecture/evidence/README.md`](../../architecture/evidence/README.md)**.
> - Danh sách phân hệ/luồng sinh từ `evidence/data/*.js` (workflow `his-testplan-evidence`). Đổi roadmap → cập nhật bảng dưới.
> - ⚠️ Test làm **CUỐI CÙNG** sau khi mọi fix/tech-debt DONE (rule cứng `CLAUDE.md`). File này là *kế hoạch sẵn-sàng*, KHÔNG phải lệnh chạy ngay.

## Trạng thái side-effect (cập nhật khi kết nối cổng)
**2026-06-24:** các luồng **HĐĐT · payment · BHXH · SMS · Zalo CHƯA kết nối** → **TOÀN BỘ chụp READ-ONLY** (🔒), KHÔNG kích hành động thật. Khi kết nối luồng nào → cập nhật dòng này + duyệt riêng từng luồng (parallel-windows.md §7 T5).

## Môi trường theo LOẠI test (góc C — parallel-windows.md §7c + §8)
- **State per-màn TĨNH** (list/form/detail/validation/permission-view) → **PROD read-only** — chạy NGAY, **MCP allow-list READ-ONLY** (T18), **loại module nhạy cảm** (HIV/Lao/Pháp y/Tâm thần — T16).
- **Cột "Luồng" (12 flows E2E) + state ép + module nhạy cảm** → **STAGING (ĐÃ DUYỆT)** + **data giả logic-nhất-quán**; trước khi staging xong → đánh **"blocked: cần staging"** (KHÔNG fake-done).
- **Trước khi chụp:** cổng **reconciliation route/màn với `App.tsx`** (T15 — plan là GUESS); **screenshot-first**, thêm `data-testid` nếu cần tương tác (T17).
- **Browser:** mỗi cửa 1 `user-data-dir` riêng (T7) · **headless** · cap **2-3** đồng thời (T12) · trỏ profile/downloads/ảnh **sang D:** (T21). **Account role** verify cho permission-test (T8). **Đóng băng deploy** lúc test (T9/T24). **Ảnh gitignore** local-only (T10). **Cửa test CHỈ log bug, KHÔNG fix** (T23).

## Phân chia 4 cửa (phủ HẾT, không gap/overlap)
Tách theo **folder + TC-code** → không đụng file. Cân theo **độ phức tạp** (không theo số đếm): C1/C2 lâm sàng nặng + patient-safety = Opus; C3/C4 hành chính/chuyên khoa read-mostly = Sonnet/Haiku.

| Cửa | Tầng model | Phân hệ (folder `<layer>-<id>`) | Luồng (`flows/`) | Cross (`cross/`) |
|---|---|---|---|---|
| **C1** ⭐INTEGRATOR | **Opus** | RCP · PAT · OPD · CLS · LIS · RIS · PRSC · EMR (8) | F-OPD · F-FUP · F-LAB · F-IMG (4) | integration-consistency |
| **C2** | **Opus** | IPD · SUR · BLD · PAT2 · TDCN · REH · NUT · INF (8) | F-IPD · F-SUR · F-TRF · F-ED · F-DIS (5) | — |
| **C3** | **Sonnet** | ORG · CAT · SYS · PHW · RET · AST · HR · 🔒BIL · 🔒INS · RPT · QLT · SVY (12) | 🔒F-BIL (1) | permission-matrix · ui-states-universal |
| **C4** | **Sonnet** (ENV/TRN/SVY→Haiku) | 🔒PTL · 🔒TEL · 🔒NAT · CHK · 🔒IMM · PBH · SPC · MCI · ENV · TRN (10) | F-IMM · F-CHK (2) | completeness-additional |

Tổng: **38 phân hệ + 12 luồng + 4 cross**, không trùng.

## Quy tắc kèm allocation
- **Claim trước:** mỗi cửa `gh issue edit <n> --add-label in-progress --add-assignee @me` cho issue test của mình — map issue cha **#216-289** (dedup, KHÔNG tạo trùng; xem evidence README §0).
- **C1 = INTEGRATOR:** sau khi cả 4 nộp ảnh → C1 chạy `gen-manifest` **MỘT lần** (mutex `manifest.js`) + **audit cuối**: không fail nào thiếu fix-issue, không phân hệ/luồng nào sót.
- **🔒 = chỉ chụp state read-only**, KHÔNG kích hành động. C3/C4 gặp màn buộc phải GHI để xem state → **escalate** (parallel-windows.md §2b S3: `/model opus` hoặc báo coordinator), không tự ý ghi prod.
- **Fail → DỪNG luồng → dedup `gh issue list` → tạo fix-issue link 2 chiều** (parallel-windows.md §7). Test-task chỉ DONE khi mọi fail có fix-issue đầy đủ.
- **Completeness** = bám **checklist state từng item trong viewer**, KHÔNG do cách chia cửa quyết định.
- **`data/*.js` READ-ONLY** lúc chạy (đổi plan → workflow `his-testplan-evidence`).
