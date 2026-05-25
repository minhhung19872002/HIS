---
name: core-reusable-code
description: Use this skill (portable, tech-agnostic) before creating ANY new file, function, component, hook, service, type or test setup, to reuse what already exists instead of duplicating. Triggers include any code-gen task, "add X", refactor, or when you might be about to recreate something that already exists. Enforces inspect-existing → extend/compose → extract-shared. Reusable across any web project.
type: project
---

# Core — Reusable Code (portable)

> TẦNG: **A · CORE** (dùng chung, tech-agnostic).

## Purpose
Bắt buộc **reuse trước khi tạo mới**: tái dùng/extend code đã có thay vì duplicate. Chống trùng lặp logic
và abstraction. Nguyên tắc dùng cho mọi dự án.

## Khi nào dùng
- **Mọi** task code-gen (luôn áp dụng đầu tiên).
- Trước khi tạo file/hàm/component/hook/service/type/test setup mới.
- Khi nghi ngờ "cái này đã có ở đâu đó rồi".

## Khi nào KHÔNG dùng
- Không phải skill stand-alone tạo file — nó là guardrail kèm các skill khác.

## Quy trình BẮT BUỘC (theo thứ tự)
```
1. inspect feature/màn hình tương tự đã có
2. tìm abstraction/base đã tồn tại (shared layer)
3. check component/hook dùng chung
4. check service / API client / util
5. check store/state, types, validation schema
6. check localization keys
7. check test helper/fixture/builder
→ ƯU TIÊN: extend / compose / extract-shared
→ CHỈ tạo mới khi thật sự không có gì phù hợp
→ Tạo mới mà có khả năng tái dùng → đặt ở shared
```

## Anti-patterns cần tránh
- Duplicate logic / hook / API layer / validation / localization / test setup.
- Tạo abstraction trùng cái đã có.
- Copy-paste rồi sửa nhẹ thay vì tham số hoá / compose.

## Dependency
- Nền cho mọi skill code-gen. Kèm `core-anti-duplication` (gộp trong skill này) + `core-refactor` khi cần
  extract-shared.

## When to update
- Khi quy trình inspect/shared-layer convention thay đổi.
