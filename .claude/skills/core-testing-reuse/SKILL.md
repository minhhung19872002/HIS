---
name: core-testing-reuse
description: Use this skill (portable, tech-agnostic) when writing tests, to reuse test helpers/fixtures/builders/mocks instead of copy-pasting setup, and to think about regression coverage. Triggers include adding tests, noticing duplicated test setup/mock/fake-data, or planning regression after a fix. Reusable across any web project. Do NOT use for a specific runner's mocking API (his-testing-* skills implement that).
metadata:
  type: project
---

# Core — Testing Reuse (portable)

> TẦNG: **A · CORE / A3 core-testing** (dùng chung). Gộp: test-reuse + mock-data-builder + regression.

## Purpose
Tái dùng setup test (helper/fixture/builder/mock/seed) thay vì copy-paste; nghĩ đến **regression** sau mỗi
fix. Nguyên tắc portable.

## Khi nào dùng
- Viết test mới (tái dùng setup có sẵn).
- Thấy setup/mock/fake-data bị lặp.
- Sau khi fix bug → thêm regression test chặn tái phát.

## Khi nào KHÔNG dùng
- API mock/fixture của runner cụ thể → skill `his-testing-*` hiện thực.

## Nguyên tắc
1. **Reuse setup**: dùng helper/fixture/builder/seed/mock đã có; nếu chưa có và sẽ tái dùng → tạo ở shared test util.
2. **Builder/fixture cho data**: tạo dữ liệu test qua builder/factory (tham số hoá) thay vì hardcode lặp.
3. **Mock dùng chung**: API mock / auth mock đặt 1 chỗ, tái dùng — không mỗi test định nghĩa lại.
4. **Regression-first sau bug**: mỗi bug fix kèm 1 test tái hiện bug (đỏ trước fix, xanh sau fix).
5. **Cấm copy-paste** setup/mock/fake-data giữa các test.

## Steps
1. Trước khi viết test → tìm helper/fixture/builder/mock đã có.
2. Tái dùng / mở rộng; thiếu thì tạo ở shared.
3. Bug fix → thêm regression test.

## Anti-patterns cần tránh
- Copy-paste khối setup/mock giữa nhiều test.
- Hardcode fake-data lặp lại thay vì builder.
- Fix bug mà không thêm test chặn tái phát.

## Dependency
- Kèm `core-testing-architecture`. Skill `his-testing-*` **depend** skill này.

## When to update
- Khi bổ sung nguyên tắc test-reuse/regression chung.
