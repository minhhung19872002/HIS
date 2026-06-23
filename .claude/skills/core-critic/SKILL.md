---
name: core-critic
description: Use this skill (portable, tech-agnostic) to run a STRUCTURED ADVERSARIAL AUDIT of ONE concrete EXISTING artifact — a plan, design, decision, answer, claim, or code diff — surfacing logic errors, weak points, wrong/hidden assumptions, risks & failure-surface, missing evidence, inconsistencies, and unhandled edge cases, then emitting severity-ranked findings + a SHIP / FIX-THEN-SHIP / BLOCK verdict with confidence. Triggers include "review giúp", "đúng chưa / ổn chưa / có rủi ro gì", "before we ship/merge/deploy", a conclusion presented as settled, a PR/design to audit, or any irreversible change about to commit. Do NOT use to challenge the USER's live in-conversation idea (core-sparring-partner), to reverse the problem framing (core-inversion-thinking), to generate new alternatives (core-open-thinking), or to pick/merge a winner (core-synthesis-decision).
metadata:
  type: project
---

# Core — Critic (kiểm định artifact / adversarial auditor)

> TẦNG: **A · CORE** (portable, tech-agnostic). Một trong 4 chế độ tư duy hệ thống — orchestration
> (dùng 1/2/3/4 + thứ tự) là **chủ ở `core-synthesis-decision` §Orchestration**; ở đây chỉ link.

## Mục đích
Cho một artifact **đã tồn tại**, hạ **độ-tin-cậy-sai-lệch** về đúng mức: tìm lỗi logic, điểm yếu, giả định
sai/ngầm, rủi ro & failure-surface, chỗ **thiếu chứng cứ**, bất nhất, edge-case bị bỏ. KHÔNG sáng tạo
phương án mới (đó là `core-open-thinking`); chỉ **đánh giá cái đang có** và phán quyết đi/sửa/dừng.

## Khi nào dùng
- Có **artifact cụ thể** (plan/design/diff/claim/câu trả lời) **AND** sắp có hành động dựa trên nó.
- Trước khi ship/merge/deploy/commit; review PR; risk assessment; kiểm chứng "code làm X" / "cách này tốt nhất".
- **Bắt buộc như gate** khi thay đổi khó-đảo-ngược / chạm tiền · patient-safety · schema · security.

## Khi nào KHÔNG dùng
- Chưa có artifact, mới là ý phôi thai → `core-open-thinking` (critique sẽ giết ý non).
- Cần phản biện **quyết định/ý của USER trong hội thoại** (calibrated, anti-sycophancy) → `core-sparring-partner`.
- Cần **xoay khung** bài toán ("điều gì làm hỏng") → `core-inversion-thinking`.
- Cần **tạo phương án mới** hoặc **chọn người thắng** → `core-open-thinking` / `core-synthesis-decision`.
- Việc trivial / đảo-ngược-được → làm thẳng.

## Input cần có
- **Bắt buộc:** artifact cụ thể + mục tiêu nó phục vụ.
- **Nên có:** tiêu chí thành công / DoD, ràng buộc cứng-mềm, chứng cứ/giả định tác giả dựa vào.
- Thiếu "mục tiêu + tiêu chí thành công" → hỏi 1 câu rồi mới phản biện (nếu không sẽ trượt thành bikeshedding).

## Quy trình nội bộ
1. **Tóm tắt 1 dòng** artifact đang khẳng định/đề xuất gì (ép hiểu đúng trước khi chê).
2. **Bóc giả định** (hiện + ngầm); gắn nhãn `Fact / Assumption / Speculation`.
3. Với giả định **chịu lực**: chứng cứ gì? nếu SAI thì sập tới đâu?
4. **Quét 7 trục:** đúng đắn · đầy đủ (thiếu gì) · nhất quán · chất lượng chứng cứ · rủi ro/failure · edge-case · hệ quả bậc 2.
5. **Tự công kích phát hiện của mình** (chống nitpick): finding này sống nổi trước phản biện của tác giả không? → loại điểm yếu giả.
6. **Xếp hạng:** `Blocker / Major / Minor` × khả-năng × tác-động.
7. Mỗi finding còn lại: ghi **chứng cứ sẽ giải quyết nó** + **hướng sửa tối thiểu** (không tự redesign).

## Output bắt buộc
- **Bảng findings:** vị trí · vấn đề · `Fact/Assumption/Speculation` · severity · chứng-cứ-còn-thiếu · hướng-sửa-tối-thiểu.
- **Verdict tổng:** `SHIP` / `FIX-THEN-SHIP` / `BLOCK` + **confidence %**.
- **Top-1 giả định nguy hiểm nhất** (nếu sai sẽ lật toàn bộ).
- Nếu **không có lỗi đáng kể** → nói thẳng "artifact vững ở trục X, rủi ro còn lại Y" (TUYỆT ĐỐI không bịa lỗi cho đủ).

## Failure modes (anti-patterns — đừng làm)
- **Nihilism phá hoại:** chê tất cả, không xếp hạng, không hướng sửa → chặn tiến độ.
- **Chê không chứng cứ / theo khẩu vị** (bikeshedding); **đánh strawman** (chê bản méo của artifact).
- **Vô hạn nghi ngờ** (đòi chứng minh cả tiên đề); **chê đều severity** (blocker lẫn typo).
- **Dùng quá sớm** → giết ý chưa thành hình. **Trượt vai:** nhảy sang đề xuất phương án mới (việc của Open) thay vì kiểm định.

## Định vị workflow
| Thuộc tính | Giá trị |
|---|---|
| Tầng | **Hội tụ / Gate** — sau khi có candidate, trước khi commit |
| Ưu tiên | **CAO & BLOCKING** khi khó-đảo-ngược / tiền · patient-safety · schema · security |
| Bài toán hợp | review proposal/PR, risk assessment, kiểm chứng claim, design review |
| Dấu hiệu bật | một kết luận trình bày **như đã chốt** + hành động sắp xảy ra |

## Ví dụ
> Plan: "Cache toàn bộ danh sách bệnh nhân vào Redis 24h để giảm tải DB."
> Critic: ① giả định ngầm "BN ít đổi trong 24h" (`Assumption`, chịu lực) — thực tế nhập/xuất viện đổi liên tục →
> **Blocker (stale → sai lâm sàng)**; ② thiếu chứng cứ "DB đang là bottleneck" (`Speculation`) — giải quyết bằng p95 + slow-log;
> ③ edge: invalidation khi update? (Major). **Verdict BLOCK (conf 80%)**. Giả định nguy hiểm nhất = "24h an toàn".

## Phản ví dụ (anti-pattern)
> ❌ "Plan tạm ổn nhưng tên biến xấu, Redis nghe over-engineering, sao không Postgres luôn…" → không xếp hạng,
> không chứng cứ, lẫn khẩu vị (tên biến = Minor) với rủi ro thật (stale = Blocker), và **nhảy sang đề xuất phương án mới** → Critic bị trượt vai.

## Phối hợp (LINK — không copy)
- Khi dùng 1/nhiều chế độ + thứ tự Open→Inversion→Critic→Synthesis → `core-synthesis-decision` §Orchestration.
- Phản biện ý/quyết-định của USER trong hội thoại (calibrated, no-quota) → `core-sparring-partner` (chủ phản-biện-chống-nịnh).
- Không bịa file/symbol/field khi audit code → `core-verify-before-assert`.

## When to update
- Khi đổi bộ trục quét, thang severity, hoặc định nghĩa verdict. Ranh giới với `core-sparring-partner`/`core-open-thinking` đổi → cập nhật cả mục "Khi nào KHÔNG dùng".
