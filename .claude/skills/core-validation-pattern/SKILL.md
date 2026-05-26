---
name: core-validation-pattern
description: Use this skill (portable, tech-agnostic) when adding input validation, to keep frontend and backend validation consistent and to never trust client input. Triggers include validating a form/payload, defining required fields/ranges/formats, or aligning client-side and server-side rules. Reusable across any web project. Do NOT use for stack-specific validation libraries (his-* skills implement them).
metadata:
  type: project
---

# Core — Validation Pattern (portable)

> TẦNG: **A · CORE** (dùng chung, tech-agnostic).

## Purpose
Validate input đúng nguyên tắc: **không tin client**, FE và BE **nhất quán rule**, lỗi rõ ràng cho người dùng.

## Khi nào dùng
- Thêm validate cho form/payload/request.
- Định nghĩa required / range / format / business rule trên input.
- Đồng bộ rule FE ↔ BE.

## Khi nào KHÔNG dùng
- Cú pháp lib validate cụ thể → skill `his-*` (form/backend) hiện thực.

## Nguyên tắc
1. **Server là chốt chặn cuối**: BE PHẢI validate dù FE đã validate. FE validate để UX, BE validate để an toàn.
2. **Cùng một rule 2 phía**: required/range/format khớp nhau (tránh FE cho qua mà BE chặn hoặc ngược lại).
3. **Một nguồn rule nếu có thể**: chia sẻ/đồng bộ định nghĩa rule thay vì viết tay 2 nơi lệch nhau.
4. **Lỗi rõ ràng**: trả message + field bị lỗi, dễ hiểu cho người dùng/QA.
5. **Validate ở biên**: kiểm tra ngay khi nhận input, trước khi xử lý nghiệp vụ.
6. **Business rule** (vd điều kiện hợp lệ theo nghiệp vụ) tách khỏi format validation, đặt đúng tầng domain.

## Steps
1. Liệt kê field + rule (required/range/format/business).
2. Hiện thực ở BE (chốt chặn) + FE (UX), khớp nhau.
3. Trả lỗi có field + message.

## Anti-patterns cần tránh
- Chỉ validate ở FE, tin client → BE nhận rác.
- Rule FE/BE lệch nhau → UX khó hiểu.
- Nuốt lỗi validate / message mơ hồ.
- Trộn format-validation với business-rule lẫn lộn 1 chỗ.

## Dependency
- Kèm `core-types-contract` (contract + validate đi đôi). Skill `his-*` (form, backend) depend.

## When to update
- Khi bổ sung nguyên tắc validate chung.
