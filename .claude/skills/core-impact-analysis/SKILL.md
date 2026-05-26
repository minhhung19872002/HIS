---
name: core-impact-analysis
description: Use this skill (portable, tech-agnostic) BEFORE editing shared or cross-boundary code to map the blast radius — find callers/dependents, the contract being changed, affected tests/migrations/configs — and pick the smallest safe change. Triggers include editing a shared component/hook/util/service/DTO/interface/DB schema/API contract, renaming/removing/changing a signature, or any change that could break other parts. Do NOT use for a brand-new isolated file with no dependents, or pure additive leaf code; for scope/over-engineering discipline use core-minimal-change.
metadata:
  type: project
---

# Core — Impact Analysis (portable)

> TẦNG: **A · CORE** (discipline, tech-agnostic). Guardrail **pre-flight #3** — trước khi Edit code có người phụ thuộc.

## (2) Vấn đề skill giải quyết
Sửa một chỗ dùng chung mà không biết ai phụ thuộc → gãy nơi khác, lỗi runtime/build, vỡ contract FE↔BE.
Skill buộc **lập bản đồ tác động** trước khi sửa và **chọn thay đổi an toàn nhỏ nhất**.

## (3) Vì sao AI hay fail ở đây
- Sửa cục bộ theo "ổ đang nhìn", quên callers/consumer khác.
- Đổi DTO/contract một phía (BE) mà quên phía kia (FE) hoặc ngược lại.
- Đổi tên/chữ ký/bỏ field → các nơi gọi gãy lặng lẽ.
- Quên DI/migration/test đi kèm → 500 hoặc đỏ test.

## (4) Khi nào dùng (kích hoạt)
- Sửa **component/hook/util/service/DTO/interface dùng chung**.
- Đổi **API contract / DB schema / cột / enum / config key**.
- **Rename / remove / đổi signature / đổi kiểu** một ký hiệu công khai.
- Thay đổi hành vi có thể lan ra module khác.

## (5) Khi nào KHÔNG dùng
- Tạo file mới **độc lập**, chưa ai import.
- Thêm code **leaf thuần additive** (không đổi hành vi cái đang có).
- Đổi text/style nội bộ 1 component không export.
- Vấn đề phạm vi/over-engineer → `core-minimal-change`.

## (6) Workflow
1. **Xác định ký hiệu/contract sắp đổi** (verify tồn tại qua `core-verify-before-assert`).
2. **Tìm dependents:** `Grep` tên ký hiệu/route/field khắp repo (cả FE lẫn BE nếu là contract xuyên tầng).
3. **Liệt kê thứ ăn theo:** callers, consumer khác layer, **test**, **migration/seed**, **DI registration**, config/env, doc.
4. **Đánh giá blast radius:** rộng/hẹp; có đổi không tương thích (breaking) không.
5. **Chọn chiến lược:** ưu tiên *additive / backward-compatible*; nếu buộc breaking → cập nhật ĐỒNG THỜI mọi dependent trong cùng thay đổi.
6. **Ghi tóm tắt tác động** (các file/nơi sẽ đụng) trước khi sửa; sửa xong build/test đúng phạm vi đó.

## (7) Quy tắc & giới hạn an toàn
- KHÔNG đổi contract một phía rồi để phía kia gãy — đồng bộ cả hai (hoặc giữ tương thích ngược).
- Đổi public symbol → phải cập nhật **tất cả** call-site trong cùng commit.
- Luôn soi kèm: test, migration, DI, config liên quan.
- Đụng patient-safety/audit/tiền/schema → nâng mức cẩn trọng, cân nhắc hỏi (`core-requirement-clarify`).
- Phân tích đủ để an toàn, không "phân tích tê liệt" cho thay đổi leaf nhỏ.

## (8) Input kỳ vọng
Ký hiệu/contract/schema sắp sửa + quyền Grep/Read toàn repo.

## (9) Output kỳ vọng
Bản đồ tác động ngắn: **dependents + test + migration + DI + config bị ảnh hưởng** + chiến lược (additive vs breaking-đồng-bộ). Sau đó mới sửa.

## (10) Ví dụ (HIS)
- Đổi field DTO backend (`SpecialtyEmrDto`) → Grep FE dùng `specialty-emr` → cập nhật `api/*.ts` + page map field cùng lúc (tránh dữ liệu rỗng).
- Thêm service mới → nhớ **đăng ký DI** trong `DependencyInjection.cs` (quên = 500 — pitfall #1).
- Thêm/đổi bảng → cần SQL script tay (`his-db-migration`) + chỗ đọc/ghi + seed; project IGNORE EF pending changes.
- Đổi `_v2kit` (component dùng chung) → Grep mọi `pages-v2/*` đang dùng prop đó trước khi đổi chữ ký.

## (11) Anti-pattern / lỗi điển hình
- "Đổi cho khớp chỗ này" rồi 10 nơi khác gãy.
- Sửa BE quên FE (hoặc ngược) → lệch contract.
- Quên DI/migration/test đi kèm.
- Rename không Grep hết call-site.

## (12) Tích hợp + cấu trúc tệp
- **Pipeline pre-flight:** sau `core-requirement-clarify` (#1) + `core-verify-before-assert` (#2) → skill này (#3) → sửa theo `core-minimal-change`.
- Bổ trợ `core-architecture-follow` (đúng layer) + `core-types-contract` (đồng bộ contract) + `his-qa-anti-pattern` (DI/audit).
- `references/impact-checklist.md` — danh mục "thứ ăn theo" cần soi.

## When to update
- Khi có loại dependent mới hay quên (vd hàng đợi/feature-flag/cache) cần thêm vào checklist.
