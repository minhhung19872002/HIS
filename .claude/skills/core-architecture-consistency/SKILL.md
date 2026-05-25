---
name: core-architecture-consistency
description: Use this skill (portable, tech-agnostic) to keep new/changed code consistent with the project's EXISTING structure, naming and conventions instead of inventing new ones. Triggers include adding a feature, reviewing a diff for consistency, or noticing two parts of the codebase do the same thing differently. Reusable across any web project. Do NOT use for mechanics tied to a specific stack (his-* skills).
type: project
---

# Core — Architecture Consistency (portable)

> TẦNG: **A · CORE** (dùng chung). Gộp: consistency + scalability awareness.

## Purpose
Giữ code mới **nhất quán** với structure/naming/convention/pattern **đã có** của dự án — để hệ thống lớn
lên vẫn đồng nhất, dễ maintain.

## Khi nào dùng
- Thêm feature → bám đúng cách các feature cùng loại đang làm.
- Review diff xem có lệch convention/pattern không.
- Phát hiện 2 chỗ cùng mục đích nhưng làm khác nhau → chuẩn hoá.

## Khi nào KHÔNG dùng
- Cơ chế cụ thể theo stack → `his-*`.

## Nguyên tắc
1. **Theo mẫu đang có**: tìm 1-2 feature/màn hình tương tự gần nhất, làm GIỐNG cách đó (cấu trúc thư mục,
   đặt tên, cách tách file, cách gọi layer).
2. **Một cách làm cho một việc**: không tạo cách thứ 2 cho cùng mục đích.
3. **Naming nhất quán**: theo quy ước hiện hành, không trộn nhiều style.
4. **Scalability**: chọn cách mở rộng được khi số lượng module/feature tăng (không hardcode giới hạn,
   không pattern chỉ chạy cho 1 trường hợp).
5. KHÔNG tự đặt convention mới khi đã có convention.

## Steps
1. Tìm tiền lệ gần nhất trong codebase.
2. Đối chiếu naming/structure/pattern.
3. Làm theo; nếu buộc phải lệch → nêu lý do rõ ràng.

## Anti-patterns cần tránh
- "Mỗi nơi một kiểu" cho cùng một việc.
- Đặt convention mới song song convention cũ.
- Pattern không scale (chỉ đúng cho 1 case).

## Dependency
- Kèm `core-architecture-follow`, `core-refactor`. Skill `his-*` quality (vd anti-pattern) depend skill này.

## When to update
- Khi bổ sung nguyên tắc consistency/scalability chung.
