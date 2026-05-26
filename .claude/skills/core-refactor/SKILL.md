---
name: core-refactor
description: Use this skill (portable, tech-agnostic) when refactoring, cleaning up, extracting shared code, improving naming/readability, or reducing tech debt — without changing behavior. Triggers include "refactor X", "clean up X", "extract shared", "tách hàm/file", removing dead code, or reducing duplication. Reusable across any web project. Do NOT use to change architecture or add features.
metadata:
  type: project
---

# Core — Refactor (portable)

> TẦNG: **A · CORE** (dùng chung). Gộp: clean-code, maintainability, extract-shared, dependency-cleanup, performance-awareness.

## Purpose
Refactor an toàn: **giữ nguyên behavior**, cải thiện readability/maintainability, tách shared, dọn nợ.

## Khi nào dùng
- "refactor / clean up / tách / gom" code.
- Trích logic lặp lại thành shared.
- Đổi tên cho rõ, chia hàm/file quá lớn, bỏ dead code/dependency thừa.

## Khi nào KHÔNG dùng
- Thêm feature mới (đó là code-gen).
- Đổi kiến trúc/structure (cấm — xem `core-architecture-follow`).

## Nguyên tắc
1. **Behavior-preserving**: trước/sau refactor, hành vi + test phải y hệt. Có test thì giữ test XANH.
2. **Reuse trước** (xem `core-reusable-code`): trích shared thay vì copy.
3. **Clean code**: tên rõ nghĩa, hàm 1 nhiệm vụ, file không quá lớn, tách concern.
4. **Maintainability > performance** (trừ khi có yêu cầu/đo lường rõ). Performance-awareness: tránh
   O(n²) hiển nhiên, N+1, nhưng KHÔNG micro-optimize gây khó đọc.
5. **Dependency cleanup**: bỏ import/dependency không dùng; không thêm dependency thừa.
6. **Phạm vi hẹp**: chỉ refactor phần được yêu cầu; không "tiện tay" sửa lan man.

## Steps
1. Hiểu behavior hiện tại (đọc + test nếu có).
2. Xác định điểm cần cải thiện (trùng lặp / tên / kích thước / coupling).
3. Refactor từng bước nhỏ; chạy test sau mỗi bước.
4. Verify behavior không đổi.

## Anti-patterns cần tránh
- Refactor kèm đổi behavior mà không báo.
- Refactor lan ra ngoài phạm vi yêu cầu.
- Đổi kiến trúc nhân danh "refactor".
- Micro-optimize làm code khó đọc.

## Dependency
- Kèm `core-reusable-code`, `core-architecture-consistency`. Skill `his-*` quality depend skill này.

## When to update
- Khi bổ sung nguyên tắc clean-code/refactor chung.
