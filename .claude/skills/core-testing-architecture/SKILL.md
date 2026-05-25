---
name: core-testing-architecture
description: Use this skill (portable, tech-agnostic) when deciding what kind of test to write and how to structure tests — choosing unit vs integration vs e2e vs contract, and keeping tests testable/deterministic/isolated. Triggers include "viết test cho X", planning test coverage, or a flaky/slow test that needs the right level. Reusable across any web project. Do NOT use for a specific test runner's syntax (his-testing-* skills implement that).
type: project
---

# Core — Testing Architecture (portable)

> TẦNG: **A · CORE / A3 core-testing** (dùng chung, KHÔNG gắn runner cụ thể).

## Purpose
Chọn **đúng loại test** + cấu trúc test sao cho **testable / deterministic / isolated**. Nguyên tắc test bê
dự án nào cũng dùng (runner gì cũng áp được).

## Khi nào dùng
- Quyết định viết unit / integration / e2e / contract cho 1 yêu cầu.
- Lập kế hoạch coverage.
- Test chậm/flaky cần đưa về đúng tầng.

## Khi nào KHÔNG dùng
- Cú pháp runner cụ thể (assertion API, lệnh chạy) → skill `his-testing-*` hiện thực.

## Phân tầng test (chọn đúng level)
| Loại | Test cái gì | Khi nào |
|---|---|---|
| **Unit** | 1 đơn vị logic thuần (hàm/rule), không I/O | logic nhánh nhiều, dễ cô lập |
| **Integration** | nhiều thành phần ghép (vd service + data-access) | luồng nội bộ qua nhiều lớp |
| **E2E** | hành vi đầu-cuối qua UI/API thật | luồng người dùng quan trọng |
| **Contract** | shape/contract giữa 2 phía khớp nhau | biên FE/BE hoặc service ↔ service |

→ Ưu tiên unit cho logic; integration cho luồng; e2e cho path quan trọng (ít nhưng giá trị cao); contract khi có biên.

## Nguyên tắc
1. **Deterministic**: không phụ thuộc thời gian thực/ngẫu nhiên/thứ tự chạy → kết quả ổn định.
2. **Isolated**: mỗi test tự setup/teardown, không lệ thuộc test khác hay state dùng chung.
3. **Test hành vi, không test chi tiết cài đặt** (để refactor không vỡ test oan).
4. **Đặt đúng tầng**: đừng e2e cái có thể unit; đừng unit cái cần integration.
5. **Tên test mô tả hành vi** (given/when/then).

## Steps
1. Xác định cái cần đảm bảo → chọn level.
2. Viết test cô lập, deterministic, tên rõ.
3. Path quan trọng (an toàn/tài chính/pháp lý) → ưu tiên cover.

## Anti-patterns cần tránh
- Test phụ thuộc ngày/giờ/thứ tự (flaky).
- Test chi tiết cài đặt (vỡ khi refactor).
- Dồn mọi thứ vào e2e (chậm, khó debug).

## Dependency
- Kèm `core-testing-reuse`. Skill testing tầng system (`his-testing-*`) **depend** skill này (hiện thực bằng test runner thật của dự án).

## When to update
- Khi bổ sung nguyên tắc test-architecture chung.
