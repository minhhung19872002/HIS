---
name: core-verify-before-assert
description: Use this skill (portable, tech-agnostic) to prevent hallucination — never claim a file, function, API endpoint, field, column, prop, config key, or symbol exists (or behaves a certain way) without verifying it in the codebase first via Read/Grep/Glob. Triggers include about to reference a path/symbol/endpoint, relying on a recalled memory or old doc/work-log, or stating "the code does X". Separate "verified" from "assumed". Do NOT use for asking the user about intent/scope (use core-requirement-clarify), nor for pure design discussion with no factual claim about the code.
metadata:
  type: project
---

# Core — Verify Before Assert (portable)

> TẦNG: **A · CORE** (discipline, tech-agnostic). Guardrail **pre-flight #2** — chống ảo tưởng/giả định sai.

## (2) Vấn đề skill giải quyết
AI bịa tên file/hàm/endpoint/field/cột/prop hoặc khẳng định hành vi code không đúng → sửa nhầm chỗ,
gãy build, lỗi runtime. Skill buộc **mọi khẳng định về codebase phải có bằng chứng** (Read/Grep/Glob)
và **tách rõ "đã verify" vs "đang giả định"**.

## (3) Vì sao AI hay fail ở đây
- Suy ra tên ký hiệu "nghe hợp lý" từ pattern thay vì đọc thật.
- Tin **ký ức / doc cũ / work-log** như sự thật hiện tại (CLAUDE.md ghi: "recalled memory phản ánh lúc viết — phải verify lại").
- Tổng quát hoá từ 1 file sang cả codebase.
- Khẳng định "code làm X" mà chưa mở hàm đó.

## (4) Khi nào dùng (kích hoạt)
- Sắp **tham chiếu** một path/symbol/endpoint/field/cột/config key.
- Sắp dựa vào **một ký hiệu để code** (gọi hàm, import, map DTO).
- Dựa vào **memory recalled / doc / CLAUDE.md / work-log** → phải verify lại với code hiện tại.
- Sắp phát biểu "hệ thống/đoạn này hoạt động như …".

## (5) Khi nào KHÔNG dùng
- Hỏi user về **ý định/phạm vi** (đó là `core-requirement-clarify`, không phải verify code).
- Thảo luận thiết kế thuần, chưa khẳng định gì về code thật.
- Kiến thức ngôn ngữ/thư viện phổ quát, ổn định, không phụ thuộc repo.

## (6) Workflow
1. Trước khi viết một fact về code → **xác định nguồn**: tôi đã Read/Grep nó trong phiên này chưa?
2. Chưa → **verify**: `Grep` ký hiệu / `Glob` path / `Read` đúng vùng. Ưu tiên đọc *định nghĩa thật*, không chỉ chỗ gọi.
3. Khớp → dùng. Không khớp → sửa lại hiểu biết, KHÔNG ép code theo giả định.
4. Khi nêu fact, **gắn bằng chứng** ngắn (`path:line`) hoặc nói rõ **"giả định, chưa verify"**.
5. Memory/doc/work-log chỉ là **gợi ý** → luôn verify lại file/hàm/flag còn tồn tại đúng như mô tả.

## (7) Quy tắc & giới hạn an toàn
- KHÔNG khẳng định sự tồn tại/hành vi của ký hiệu chưa verify.
- KHÔNG sửa tên cho "khớp giả định" — verify rồi mới đổi.
- Verify đúng mức: 1–3 lệnh tìm/đọc là đủ; không đào bới vô hạn (nếu thật sự không xác định được → nói rõ + hỏi/đề xuất).
- Bằng chứng > trí nhớ; định nghĩa thật > suy đoán theo tên.

## (8) Input kỳ vọng
Một fact/giả định sắp dùng về codebase + quyền Read/Grep/Glob.

## (9) Output kỳ vọng
Fact đã verify (kèm `path`/bằng chứng), HOẶC nhãn rõ "giả định chưa verify" + kế hoạch verify/hỏi. Không có khẳng định trần trụi không nguồn.

## (10) Ví dụ (HIS)
- Trước khi map DTO ở FE: Grep DTO backend thật (`SpecialtyEmrDto` dùng `icdCode`/`fieldData`, KHÔNG phải `diagnosisIcd`) thay vì đoán theo tên cũ.
- Trước khi gọi `client.post('/specialty-emr')`: verify controller route tồn tại (`SpecialtyEmrController`).
- CLAUDE.md nói Cloud Run URL `…rm6c6yvoja…` → verify lại: URL thật trong `frontend/.env.production` (cái cũ không resolve).
- "PatientId có FK không?" → Read entity `SpecialtyEmr` (chỉ là Guid, không navigation) thay vì giả định FK.

## (11) Anti-pattern / lỗi điển hình
- Import từ path "đoán" → module not found.
- Map field theo tên cũ trong trí nhớ → dữ liệu rỗng/sai.
- Trích dẫn URL/ID/flag từ work-log cũ mà không kiểm chứng.
- "Chắc là có hàm helper X" rồi gọi → undefined.

## (12) Tích hợp + cấu trúc tệp
- **Pipeline pre-flight:** sau `core-requirement-clarify` (#1) → skill này (#2) → `core-impact-analysis` (#3).
- Cộng hưởng `core-reusable-code` (verify cái đã có trước khi tạo) + `his-qa-anti-pattern` (không hardcode URL/ID).
- `references/verify-checklist.md` — checklist nguồn-bằng-chứng + loại ký hiệu cần verify.

## When to update
- Khi có loại "nguồn dễ sai" mới (vd doc/spec mới) cần thêm vào checklist verify.
