---
name: core-minimal-change
description: Use this skill (portable, tech-agnostic) while implementing, to make the smallest correct change that satisfies the request — no over-engineering, no speculative abstraction, no touching files/code outside scope, no opportunistic refactor mixed into a feature. Triggers include any code-gen/edit task, being tempted to "also refactor/rename/restructure while here", or adding a layer/option "for the future". Do NOT use when the user explicitly asked for a refactor/redesign (use core-refactor) or when a broader change is genuinely required and confirmed.
metadata:
  type: project
---

# Core — Minimal Change (portable)

> TẦNG: **A · CORE** (discipline, tech-agnostic). Guardrail **lúc implement** — kỷ luật phạm vi/YAGNI.

## (2) Vấn đề skill giải quyết
AI hay làm quá: thêm abstraction "phòng xa", refactor lan man, đụng file ngoài yêu cầu, đổi style không
liên quan → diff phình, khó review, dễ gãy, lệch ý. Skill buộc **thay đổi đúng-và-nhỏ-nhất** thoả yêu cầu.

## (3) Vì sao AI hay fail ở đây
- Muốn "hoàn hảo" → tổng quát hoá sớm (YAGNI vi phạm).
- "Tiện tay" refactor/đổi tên/format khi đang sửa feature → trộn 2 loại thay đổi.
- Thêm option/config/abstraction không ai yêu cầu.
- Sửa cả file/khu vực không liên quan → blast radius vô cớ.

## (4) Khi nào dùng (kích hoạt)
- MỌI task code-gen/edit (guardrail lúc viết).
- Khi nảy ý "nhân tiện refactor/rename/restructure".
- Khi định thêm tầng/abstraction/tham số "cho tương lai".
- Khi định đụng file/khu vực ngoài yêu cầu.

## (5) Khi nào KHÔNG dùng
- User **yêu cầu rõ** refactor/redesign → `core-refactor` (đổi cấu trúc giữ behavior).
- Thay đổi rộng **thật sự cần** và đã được xác nhận (qua `core-requirement-clarify` / `core-impact-analysis`).
- Sửa lỗi cần đổi nhiều nơi để đúng (không phải "làm quá").

## (6) Workflow
1. **Phát biểu phạm vi tối thiểu:** câu thay đổi nhỏ nhất khiến yêu cầu đạt "done".
2. **Liệt kê file CHẮC CHẮN phải đụng**; mọi file khác = ngoài phạm vi (đừng đụng).
3. **Loại bỏ** abstraction/option/tham số chưa ai cần (YAGNI). Theo tiền lệ sẵn có thay vì phát minh.
4. **Tách thay đổi:** feature ≠ refactor ≠ format. Nếu thấy nợ kỹ thuật đáng dọn → **ghi chú đề xuất riêng**, không trộn.
5. **Soi diff cuối:** mỗi dòng đổi có phục vụ trực tiếp yêu cầu không? Không → bỏ.

## (7) Quy tắc & giới hạn an toàn
- Mặc định **không** sửa file ngoài phạm vi; muốn đụng → nêu lý do.
- Không thêm abstraction cho "tương lai giả định".
- Không refactor/đổi tên/format cơ hội lẫn trong feature.
- KHÔNG đánh đổi tính đúng/an toàn để "nhỏ" — đủ đúng trước, rồi mới tối thiểu (ưu tiên maintainability thực dụng hơn hoàn hảo lý thuyết).
- Nợ kỹ thuật phát hiện được → đề xuất, để user quyết.

## (8) Input kỳ vọng
Yêu cầu đã hiểu rõ (qua `core-requirement-clarify`) + bản đồ tác động (qua `core-impact-analysis`).

## (9) Output kỳ vọng
Diff nhỏ nhất đúng yêu cầu, theo tiền lệ codebase, không file thừa, không abstraction thừa; nợ kỹ thuật (nếu có) nêu riêng dạng đề xuất.

## (10) Ví dụ (HIS)
- "Thêm 1 cột vào bảng list v2" → sửa đúng page đó + (nếu cần) api client; KHÔNG đổi `_v2kit`/các page khác.
- "Fix bug map field" → sửa chỗ map; KHÔNG tiện tay reorganize cả file/đổi import style.
- Thấy 1 page v2 khác cũng lệch → **ghi chú đề xuất**, không sửa kèm trong task hiện tại.
- Cần helper mới → ưu tiên `_v2kit`/util đã có (`core-reusable-code`), không tạo abstraction song song.

## (11) Anti-pattern / lỗi điển hình
- Diff 600 dòng cho yêu cầu 20 dòng.
- Trộn refactor + feature → khó review, dễ regress.
- Thêm `options`/generic/flag "cho sau" không ai dùng.
- Đổi format/đổi tên hàng loạt ngoài yêu cầu.

## (12) Tích hợp + cấu trúc tệp
- Đứng **cuối pipeline pre-flight**: clarify (#1) → verify (#2) → impact (#3) → **minimal-change (lúc viết)**.
- Bổ trợ `core-reusable-code` (reuse thay vì tạo) + `core-refactor` (khi user CHỦ ĐỘNG muốn dọn) + `his-qa-anti-pattern` (không over-engineer: không CQRS/MediatR/Next.js).
- `references/scope-checklist.md` — checklist phạm vi tối thiểu + tín hiệu "đang làm quá".

## When to update
- Khi xuất hiện kiểu "làm quá" mới hay gặp cần thêm vào tín hiệu cảnh báo.
