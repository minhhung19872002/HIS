---
name: core-clean-code
description: Use this skill (portable, tech-agnostic) on EVERY code-gen/edit (FE + BE) to write clean, maintainable, change-friendly code at the function/statement level — beyond just "works/correct flow". Triggers include writing or refactoring any function/class/component/service, reviewing a diff, or when code is getting long/nested/duplicated. Enforces small single-responsibility functions, guard clauses/early-return to cut nesting, few parameters (object param, no boolean-flag args), intention-revealing names, no magic numbers/strings (named constants/enums), comment WHY not WHAT, no dead/commented-out code or leftover debug, immutability & single-source-of-truth state, DRY without premature abstraction (rule of three), low coupling / high cohesion / depend on abstractions, open-for-change (config/strategy over long if-else chains), async & side-effect hygiene (no floating promises, effect cleanup, idempotency), null-safety, and a clean-code self-review. Do NOT duplicate: reuse=core-reusable-code, layer boundaries=core-architecture-follow, YAGNI scope=core-minimal-change, behavior-preserving cleanup=core-refactor, validation=core-validation-pattern, error/loading UI=core-error-loading-state, FE naming/folder=his-fe-convention, footguns/safety=his-qa-anti-pattern.
metadata:
  type: project
---

# Clean Code — viết code dễ bảo trì / nâng cấp / sửa chữa

Áp cho **MỌI** lần viết/sửa code (FE + BE). Mục tiêu: không chỉ đúng luồng + logic nghiệp vụ, mà còn
**clean code · tái sử dụng · dễ bảo trì · dễ mở rộng / thay đổi / sửa chữa**. Đây là quy tắc mức
**hàm / câu lệnh** — bổ sung cho các skill cấu trúc đã có (xem "Không lặp lại" cuối file).

## Khi nào dùng
- Khi viết hoặc refactor bất kỳ hàm/class/component/service nào (FE+BE).
- Khi review diff trước khi báo xong / commit.
- Khi thấy code dài ra, lồng sâu, lặp lại, hoặc khó hiểu.

## Khi nào KHÔNG dùng
- Không tự tạo file — là skill quy tắc, áp **NGAY trong lúc viết code** cùng skill code-gen.

## 1. Thiết kế hàm (function design)
- **Single Responsibility** — 1 hàm làm 1 việc; tên mô tả đúng việc đó. Hàm "và/hoặc" → tách.
- **Ngắn** — hàm quá dài (> ~50–60 dòng / nhiều mức trừu tượng) → tách helper/usecase.
- **Guard clause / early-return** — kiểm tra điều kiện sai/biên rồi `return` sớm; tránh lồng `if` sâu (> 2–3 cấp).
- **Ít tham số** — > 3–4 tham số → gói thành object/options. **KHÔNG dùng boolean-flag arg** (`doX(true)`) → tách 2 hàm hoặc enum.
- **Pure khi có thể** — input → output, không side-effect ẩn; tách phần thuần khỏi phần I/O để dễ test.
- **Command–Query separation** — hàm hoặc *làm* (mutate) hoặc *trả về* (query), không lẫn lộn gây khó đoán.

## 2. Đặt tên & hằng số (self-documenting)
- Tên **lộ ý định** (intention-revealing); đọc tên hiểu việc, không cần đọc thân hàm. (Chi tiết convention FE: `his-fe-convention` §1.)
- **KHÔNG magic number / magic string** rải trong code → đưa vào **named constant / enum** đặt tập trung
  (FE: `constants/`, `STATUS_TABS`…; BE: const/enum trong Core). Số 0/1/2 trạng thái phải có nhãn.
- Không tên mơ hồ `data/info/temp/handle/process/manager` đứng một mình — gắn domain.

## 3. Comment & dọn rác
- Comment giải thích **WHY** (lý do/nghiệp vụ/edge-case), KHÔNG mô tả lại WHAT code đã nói.
- Doc ngắn cho **API dùng chung / public** (component shared, service, hàm phức tạp).
- **KHÔNG để code chết / code comment-out** ("để dành sau") — xoá, git giữ lịch sử.
- **KHÔNG để rác debug**: `console.log`, `print`, biến/import không dùng, TODO mồ côi không ngày/không chủ.

## 4. Bất biến & state (immutability)
- Ưu tiên `const`; cập nhật **bất biến** (spread/clone) thay vì mutate trực tiếp props/state/tham số đầu vào.
- **Single source of truth** — không lưu trùng state suy ra được; **derived state** tính bằng `useMemo`/selector, không copy thành state riêng dễ lệch.
- Tránh shared mutable global; state đặt đúng cấp (local vs context — xem `his-fe-convention` §3).

## 5. DRY có chừng mực + coupling/cohesion
- **DRY** nhưng theo **rule-of-three**: lặp lần 3 mới trừu tượng hoá — tránh abstraction non (over-engineer; xem `core-minimal-change`).
- **High cohesion** (gom thứ liên quan), **low coupling** (giảm phụ thuộc chéo); module/hàm biết càng ít về bên ngoài càng tốt.
- **Depend on abstraction** (interface/contract) thay vì implementation cụ thể, để thay/sửa không lan rộng (xem `core-types-contract`, `core-architecture-follow`).

## 6. Mở cho thay đổi (open-for-change → dễ nâng cấp)
- **Config / data-driven** thay chuỗi `if/else`/`switch` dài: map/lookup table, strategy, registry (FE: option/field config; BE: dictionary/strategy).
- Thêm case mới = **thêm dữ liệu/nhánh nhỏ**, không phải sửa lõi (Open–Closed tinh thần).
- Cô lập điểm dễ đổi (giá, mã nghiệp vụ, ngưỡng, URL cổng) vào config/constant — đổi 1 nơi.

## 7. Async & side-effect hygiene
- **Không floating promise** — luôn `await` hoặc `.catch`; không bỏ lửng promise có thể lỗi.
- `useEffect`/listener/timer/subscription → **cleanup** (return unsubscribe) tránh leak + cập nhật sau unmount.
- Tránh **race condition** (giữ request mới nhất / AbortController); thao tác ghi nên **idempotent** khi có thể (xem `his-db-migration`, `his-be-background-worker`).
- **Không side-effect trong render**; gọi API/log/timer đặt trong effect/handler.

## 8. An toàn & phòng thủ
- **Null/undefined safety**: optional chaining `?.` + nullish `??`; kiểm biên mảng/đối tượng trước truy cập.
- Không tin input ngoài — validate ở biên (FE+BE), BE là chuẩn (xem `core-validation-pattern`).
- Không log secret/PII; không nuốt exception im lặng (xem `his-qa-anti-pattern`).

## 9. Self-review clean-code (tự rà mỗi diff)
- [ ] Hàm có **SRP** + đủ ngắn? Lồng ≤ 2–3 cấp (đã dùng guard clause)?
- [ ] Tham số ≤ ~4, không boolean-flag arg?
- [ ] Không magic number/string? Hằng số đặt tập trung?
- [ ] Tên lộ ý định, theo convention?
- [ ] Không code chết / comment-out / debug rác / import thừa?
- [ ] State: single source of truth, derived dùng memo, cập nhật bất biến?
- [ ] Trùng lặp: đã reuse/trừu tượng đúng mức (rule-of-three, không non)?
- [ ] Async: không floating promise, effect có cleanup, không race?
- [ ] Null-safe ở biên? Không nuốt lỗi?
- [ ] Điểm dễ đổi đã cô lập vào config/constant (dễ nâng cấp sau)?
- [ ] **Build/typecheck sạch** (FE+BE tầng đã sửa) TRƯỚC khi báo xong — không claim success khi chưa verify (HIS: xem `his-qa-anti-pattern` #27).

## Không lặp lại (dùng kèm, không chồng chéo)
`core-reusable-code` (tìm-dùng-lại trước khi tạo) · `core-architecture-follow`/`-consistency` (ranh giới
layer + theo tiền lệ) · `core-minimal-change` (YAGNI, không over-engineer) · `core-refactor` (dọn giữ
behavior) · `core-types-contract` (contract) · `core-validation-pattern` (validate) · `core-error-loading-state`
(loading/empty/error UI) · `his-fe-convention` (naming/folder/component FE, Antd-first) · `his-qa-anti-pattern`
(footgun/an toàn/patient-safety). Skill này chỉ thêm phần **clean-code mức hàm/câu lệnh** cho cả FE+BE.
