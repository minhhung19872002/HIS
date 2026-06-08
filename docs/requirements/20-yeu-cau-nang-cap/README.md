# 20 — Yêu cầu nâng cấp / gói thầu (SPEC)

**Có gì:** các gói **NangCap1–24** (PDF) — danh sách tính năng/yêu cầu từ các đợt nâng cấp & gói thầu.

**Dùng để làm gì:** **driver tính năng** — mỗi gói NangCapNN là một tập yêu cầu cần đóng (gap-closing).
Khi triển khai một gói: đọc PDF → liệt kê gap so với codebase → implement → đánh dấu `[NN]` trên menu → viết docs.

## Nội dung
- `NangCap.pdf`, `NangCap2.pdf` … `NangCap24.pdf` — từng gói yêu cầu.

## Lộ trình
- Thêm bảng tra ở dưới: `NangCapNN → phân hệ liên quan → trạng thái (chưa/đang/xong) → commit/PR`.
- Chuẩn hóa dần mỗi gói PDF → `NangCapNN.md` (tóm tắt yêu cầu + checklist gap) để dễ theo dõi tiến độ.

| Gói | Phân hệ | Trạng thái | Ghi chú |
|---|---|---|---|
| _(điền dần)_ | | | |
