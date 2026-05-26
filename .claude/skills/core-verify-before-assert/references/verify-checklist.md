# Checklist verify-before-assert

## Loại ký hiệu PHẢI verify trước khi dùng/khẳng định
- Đường dẫn file / thư mục → `Glob`.
- Tên hàm / class / component / hook / interface → `Grep` định nghĩa (`function X`, `class X`, `const X =`, `interface X`).
- Endpoint API / route → `Grep` controller/route thật.
- Field DTO / cột DB / prop component / config key / env var → `Read` định nghĩa thật.
- Hành vi ("code làm X") → `Read` đúng hàm, không suy từ tên.

## Nguồn DỄ SAI — luôn verify lại với code hiện tại
- Ký ức (memory recalled) — phản ánh lúc viết, không phải hiện tại.
- CLAUDE.md / work-log / docs — có thể đã lạc hậu (URL, ID, flag, path).
- Tên "nghe hợp lý" suy từ convention.
- Kết quả 1 file → KHÔNG tổng quát cho cả repo.

## Cách gắn bằng chứng khi phát biểu
- ✅ "DTO dùng `icdCode` (verify `…/SpecialtyEmrDTOs.cs`)."
- ✅ "Giả định (CHƯA verify): có thể có helper format — sẽ Grep trước khi dùng."
- ❌ "Chắc là có hàm `formatX()`." (khẳng định trần trụi, không nguồn)

## Mức verify hợp lý
1–3 lệnh `Grep`/`Glob`/`Read` là đủ cho 1 fact. Không xác định được → nói rõ "không tìm thấy/không chắc",
đề xuất hướng hoặc hỏi — KHÔNG bịa.
