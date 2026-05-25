---
name: core-architecture-follow
description: Use this skill (portable, tech-agnostic) when adding or changing code that crosses architectural layers, to respect layer boundaries, dependency direction and module boundaries of whatever architecture the project uses. Triggers include adding a feature touching multiple layers, deciding where a piece of logic belongs, or keeping dependencies pointing the correct way. Reusable across any web project. Do NOT use for project-specific stack mechanics (those live in his-* skills).
type: project
---

# Core — Architecture Follow (portable)

> TẦNG: **A · CORE** (dùng chung, tech-agnostic). KHÔNG nêu tên framework/DB/lib cụ thể.

## Purpose
Giữ code đặt đúng layer + dependency đi đúng chiều + tôn trọng module boundary của **kiến trúc dự án
đang dùng** (bất kể là gì). Nguyên tắc, không gắn công nghệ.

## Khi nào dùng
- Thêm/sửa code chạm **nhiều layer**.
- Phân vân "logic này thuộc layer/module nào".
- Review xem dependency có đi sai chiều không.

## Khi nào KHÔNG dùng
- Cơ chế cụ thể theo stack (scaffold theo framework, ORM, route…) → dùng skill `his-*` tương ứng.

## Nguyên tắc (áp cho mọi kiến trúc)
1. **Xác định layer thật của dự án trước** (đọc structure), KHÔNG áp khuôn có sẵn.
2. **Dependency một chiều**: layer trong (domain/core) KHÔNG phụ thuộc layer ngoài (UI/infra). Lớp ngoài
   phụ thuộc lớp trong, không ngược lại.
3. **Logic đặt đúng chỗ**: business rule ở tầng domain/service, không nhét vào UI/controller; truy cập
   dữ liệu ở tầng data-access, không rải khắp nơi.
4. **Module boundary**: không cho module A reach thẳng vào nội bộ module B; đi qua contract/interface công khai.
5. **Tôn trọng cái đang có**: KHÔNG tự đổi kiến trúc/đổi structure để "cho đẹp".

## Steps
1. Đọc structure + xác định layer/module hiện tại.
2. Map yêu cầu → layer nào chịu trách nhiệm gì.
3. Đặt code đúng layer; chỉ thêm dependency theo đúng chiều.
4. Nếu cần vượt boundary → qua interface/contract (xem `core-types-contract`).

## Anti-patterns cần tránh
- Business logic trong UI/controller.
- Layer trong import layer ngoài.
- Module reach vào nội bộ module khác.
- Tự ý refactor kiến trúc khi yêu cầu không đòi.

## Dependency
- Thường đi kèm `core-reusable-code`, `core-architecture-consistency`.
- Skill `his-*` (backend/frontend scaffold) **depend** skill này để biết đặt code đúng layer.

## When to update
- Khi kiến trúc dự án thay đổi (thêm layer/bỏ layer) — nhưng vì là core portable, chỉ cập nhật phần
  diễn đạt nguyên tắc, không nhét chi tiết stack vào đây.
