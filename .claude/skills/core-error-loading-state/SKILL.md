---
name: core-error-loading-state
description: Use this skill (portable, tech-agnostic) when building any data-driven UI, to always handle loading, empty, error and success states plus user feedback. Triggers include adding a page/list/form/dialog that fetches or submits data, or fixing a screen that shows blank/spinner-forever/silent failure. Reusable across any web project. Do NOT use for stack-specific UI components (his-* skills implement them).
type: project
---

# Core — Error / Loading / Empty State (portable)

> TẦNG: **A · CORE** (dùng chung, tech-agnostic).

## Purpose
Mọi UI lấy/gửi dữ liệu PHẢI xử lý đủ **4 trạng thái**: loading · empty · error · success, kèm feedback rõ
cho người dùng. Không để màn hình trắng / spinner mãi / fail im lặng.

## Khi nào dùng
- Thêm page/list/form/dialog có fetch hoặc submit.
- Sửa màn hình bị blank / loading vô tận / lỗi không báo.

## Khi nào KHÔNG dùng
- Component UI cụ thể theo lib → skill `his-*` (page/component) hiện thực.

## Nguyên tắc — 4 trạng thái
1. **Loading**: hiển thị spinner/skeleton khi đang tải; không để màn hình trống vô nghĩa.
2. **Empty**: dữ liệu rỗng → hiện thông điệp "chưa có dữ liệu" rõ ràng, KHÔNG để trống như đang lỗi.
3. **Error**: fetch/submit fail → báo lỗi cho người dùng (toast/message) + KHÔNG hiện mock/giả dữ liệu;
   log ở mức phù hợp (warn cho lỗi kỳ vọng), KHÔNG nuốt lỗi im lặng.
4. **Success**: hiển thị dữ liệu; với hành động (submit) → feedback thành công.
5. **Feedback nhất quán**: dùng cơ chế thông báo/confirm dùng chung của dự án, không tự chế mỗi nơi một kiểu.

## Steps
1. Xác định nguồn dữ liệu + các trạng thái có thể xảy ra.
2. Render đúng nhánh loading/empty/error/success.
3. Hành động phá huỷ/nhạy cảm → confirm trước.
4. Lỗi → thông báo + xử lý fallback (state rỗng), không crash, không mock.

## Anti-patterns cần tránh
- Màn hình trắng khi loading/empty (không phân biệt được với lỗi).
- Spinner chạy mãi do không xử lý nhánh error.
- Fail im lặng / nuốt lỗi.
- Hiện mock data khi API fail (gây hiểu nhầm).

## Dependency
- Kèm `core-localization-pattern` (message không hardcode). Skill `his-*` (page/form) depend skill này.

## When to update
- Khi bổ sung nguyên tắc state/feedback chung.
