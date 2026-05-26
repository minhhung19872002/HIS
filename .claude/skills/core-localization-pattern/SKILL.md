---
name: core-localization-pattern
description: Use this skill (portable, tech-agnostic) whenever adding user-facing text, to never hardcode strings and instead use translation keys with namespaces and fallback. Triggers include adding labels/messages/buttons, supporting multiple languages, or finding hardcoded text. Reusable across any web project. Do NOT use for a specific i18n library's API (his-* skills implement that).
metadata:
  type: project
---

# Core — Localization Pattern (portable)

> TẦNG: **A · CORE** (dùng chung, tech-agnostic).

## Purpose
Không hardcode text hiển thị cho người dùng: dùng **translation key + namespace + fallback** để hỗ trợ
đa ngôn ngữ và sửa text tập trung.

## Khi nào dùng
- Thêm label/message/button/placeholder hiển thị cho người dùng.
- Hỗ trợ nhiều ngôn ngữ.
- Phát hiện text bị hardcode.

## Khi nào KHÔNG dùng
- API cụ thể của lib i18n → skill `his-*` hiện thực.
- Hằng số không hiển thị (mã code, enum kỹ thuật) — không cần localize.

## Nguyên tắc
1. **Không hardcode** chuỗi hiển thị trong logic/JSX/template.
2. **Key + namespace**: đặt text vào file/dictionary dịch, gọi qua key; namespace theo module/feature.
3. **Fallback**: thiếu key/ngôn ngữ → có fallback (vd ngôn ngữ mặc định), không hiện key thô/trống.
4. **Tái dùng key** chung (nút Lưu/Huỷ/Xoá…) thay vì tạo key trùng nghĩa.
5. **Giá trị cấu hình hiển thị** (tên tổ chức, địa chỉ…) đặt ở constant/config, không rải hardcode.

## Steps
1. Nhận diện text hiển thị.
2. Tạo/tái dùng key trong namespace phù hợp.
3. Gọi qua cơ chế dịch của dự án; đảm bảo có fallback.

## Anti-patterns cần tránh
- Hardcode chuỗi hiển thị.
- Trùng key cùng nghĩa rải rác.
- Hiện key thô khi thiếu bản dịch.
- Hardcode tên tổ chức/URL trong UI thay vì constant/config.

## Dependency
- Kèm `core-error-loading-state` (message lỗi/empty cũng phải localize). Skill `his-*` UI depend.

## When to update
- Khi bổ sung nguyên tắc localization chung.
