---
name: core-types-contract
description: Use this skill (portable, tech-agnostic) when defining the data contract between layers/boundaries — request/response shapes, DTOs, interfaces, the type a function accepts and returns. Triggers include adding an API endpoint contract, a service signature, a typed payload, or aligning frontend/backend shapes. Reusable across any web project. Do NOT use for stack-specific type mechanics (his-* skills handle the concrete language/lib).
type: project
---

# Core — Types & Contracts (portable)

> TẦNG: **A · CORE** (dùng chung, tech-agnostic — không gắn ngôn ngữ/lib).

## Purpose
Định nghĩa **contract rõ ràng** giữa các layer/biên: input/output của hàm, shape request/response, DTO,
interface. Để 2 phía (caller/callee, FE/BE) hiểu nhau, đổi 1 phía là biết phía kia phải đổi gì.

## Khi nào dùng
- Định nghĩa contract API (request/response).
- Đặt signature service/function (nhận gì, trả gì).
- Đồng bộ shape giữa producer và consumer.

## Khi nào KHÔNG dùng
- Cú pháp type cụ thể của ngôn ngữ/lib (C#/TS/Zod…) → skill `his-*` (api-client, scaffold) hiện thực.

## Nguyên tắc
1. **Explicit contract**: mỗi boundary có shape rõ; tránh "any"/object mơ hồ.
2. **Một nguồn sự thật**: contract định nghĩa 1 chỗ, 2 phía cùng tham chiếu — không tự chế shape riêng mỗi nơi.
3. **Tách input vs output**: shape gửi đi và shape nhận về thường khác → định nghĩa riêng (Create vs Read…).
4. **Phân biệt trạng thái dữ liệu**: phân trang (list + total) vs object đơn vs mảng — gọi tên rõ.
5. **Đổi contract = đổi cả 2 phía**: khi sửa shape, rà soát mọi nơi tiêu thụ.

## Steps
1. Xác định boundary + ai là producer/consumer.
2. Định nghĩa shape input + output riêng, đặt tên rõ.
3. Tham chiếu chung, không duplicate shape.
4. Khi đổi → cập nhật mọi consumer.

## Anti-patterns cần tránh
- Shape mơ hồ / "any" / object tự do.
- Mỗi nơi tự định nghĩa lại cùng 1 shape (lệch nhau).
- Đổi 1 phía quên phía kia → runtime mismatch.

## Dependency
- Kèm `core-validation-pattern` (contract + validate đi đôi). Skill `his-*` (api-client, backend scaffold) depend.

## When to update
- Khi bổ sung nguyên tắc contract chung.
