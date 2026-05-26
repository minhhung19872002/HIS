---
name: core-execution-output
description: Use this skill (portable, tech-agnostic) whenever running commands/tools and reporting execution output to the user — keep output CONCISE by default (summarize grouped actions, high-level progress only; no raw log streaming, temp paths, probe dumps, per-command traces, or background-poll noise), AUTO-EXPAND to verbose root-cause only on failure (build/test fail, exit ≠ 0, migration fail, git conflict, timeout, runtime error, security-sensitive op) or when the user asks, and full DEBUG trace only when explicitly enabled. Safety always overrides: never hide critical errors, never fake progress, never claim success unverified, always surface destructive ops. Do NOT use for deciding WHAT to do (other discipline skills handle that).
metadata:
  type: project
---

# Core — Execution Output Discipline (portable)

> TẦNG: **A · CORE** (discipline, tech-agnostic). Guardrail **luôn bật** khi báo cáo kết quả chạy lệnh/tool.
> Hành xử như kỹ sư senior: mặc định cập nhật trạng thái ngắn gọn, chỉ bung chi tiết khi cần.

## (2) Vấn đề skill giải quyết
Đổ log thô, stream từng lệnh bash, in lại output thăm dò lặp lại, lộ đường dẫn temp / poll task nền →
nhiễu, khó đọc, chôn vùi tín hiệu. Skill chuẩn hoá: **ngắn gọn theo mặc định, tự bung khi lỗi, an toàn không che giấu.**

## (3) Vì sao AI hay fail ở đây
- Dán nguyên output tool/log thô cho user.
- Tường thuật từng bước nội bộ (grep/glob/poll task nền/đường dẫn temp).
- In lại nhiều lần cùng một thăm dò.
- Tệ hơn: tóm tắt "xanh" che mất 1 test/bước đã fail (giả mạo tiến trình).

## (4) Khi nào dùng (kích hoạt)
- MỌI task có chạy lệnh/tool và báo cáo lại cho user (luôn áp).

## (5) Khi nào KHÔNG dùng
- Hỏi-đáp/thiết kế thuần, không chạy lệnh.
- Khi user **bật debug/verbose** hoặc **yêu cầu log thô** → chuyển chế độ chi tiết (mục 6).
- Quyết định LÀM GÌ → các skill kỷ luật khác (clarify/verify/impact/minimal).

## (6) Workflow — 3 chế độ
**CONCISE (mặc định):** tóm tắt theo cụm hành động, dòng tín hiệu cao. Mẫu ưu tiên:
`Đã cài deps · giải quyết xung đột merge · build FE OK · cập nhật 6 file · 473/473 test pass.`
KHÔNG: log thô, đường dẫn temp, dump thăm dò, trace từng lệnh, poll task nền.

**Báo cáo THAY ĐỔI CODE (mặc định collapse diff):** KHÔNG in full patch/diff preview cho mỗi file.
Chỉ tóm tắt: **(1) file nào sửa · (2) thay đổi gì ở mức cao · (3) lý do**. Mẫu:
`Updated Reception.tsx · thêm helper trích lỗi API · hiện lỗi server thật cho user.`
Chỉ **bung diff đầy đủ** khi: user yêu cầu · refactor lớn/rủi ro · logic security/auth · migration/schema ·
thao tác phá huỷ · debug/review mode · build/test fail. (Vẫn LUÔN nêu rõ thao tác nguy hiểm — mục 7.)

**AUTO-EXPAND (tự bật khi lỗi):** kích hoạt khi — build fail · test fail · exit ≠ 0 · migration fail ·
git conflict · timeout · runtime error · thao tác nhạy cảm bảo mật · user yêu cầu. Khi đó:
- hiện **đúng lệnh bị lỗi** + stderr/stdout **liên quan nguyên nhân gốc** (không kèm log vô quan);
- **tóm tắt lỗi có thể hành động** (nguyên nhân → cách sửa).

**DEBUG (chỉ khi user bật rõ):** full command trace, full shell output, log task nền, log thăm dò.

## (7) Quy tắc & giới hạn an toàn (override mọi chế độ — kể cả CONCISE)
- KHÔNG che giấu lỗi nghiêm trọng; KHÔNG giả mạo tiến trình; KHÔNG tuyên bố "thành công" khi **chưa verify** (pair `core-verify-before-assert`).
- LUÔN nêu rõ **thao tác nguy hiểm/phá huỷ** dù đang concise: `rm`/xoá tệp, `git reset --hard`/force-push/rebase, migration/drop/seed DB, cài/gỡ package, đổi env/secret, quyền/bảo mật.
- "Ngắn gọn" ≠ "giấu lỗi". Nếu có bước fail → bung phần đó, không gói dưới tóm tắt xanh.

## (8) Input kỳ vọng
Kết quả thực thi lệnh/tool (stdout/stderr/exit code) + ngữ cảnh task.

## (9) Output kỳ vọng
- Bình thường: 1–vài dòng trạng thái tín hiệu cao + (nếu có) liệt kê thao tác nguy hiểm.
- Khi lỗi: lệnh lỗi + log nguyên nhân gốc + tóm tắt hành động.
- Debug: trace đầy đủ.

## (10) Ví dụ (HIS)
- **Concise OK:** "Đã rebase trên origin (giữ stash) · build FE OK (2m) · push 2 commit · main đồng bộ."
- **Bung khi lỗi:** thay vì dán cả build log → "`dotnet build` FAIL: `SpecialtyEmrService.cs:74` CS0117 — `IcdCode` không tồn tại. Sửa: dùng `IcdName`." + đúng dòng lỗi.
- **Nêu thao tác phá huỷ (dù concise):** "⚠️ `git reset --hard HEAD` (stash vẫn giữ) · xoá `HIS.bak` · drop+import DB `HIS` trên Cloud SQL."
- **Tránh:** không in 30 dòng warning `LF→CRLF`, không liệt kê từng `Grep`/đường dẫn temp/poll task nền.

## (11) Anti-pattern / lỗi điển hình
- Stream từng lệnh bash + dán nguyên stdout cho mọi bước.
- In lại nhiều lần cùng kết quả grep/glob thăm dò.
- Lộ đường dẫn temp, tường thuật poll task nền.
- Tóm tắt "hoàn thành/xanh" trong khi có test/bước đã fail → **vi phạm an toàn**.
- Nói "đã chạy thành công" mà chưa kiểm chứng exit code.

## (12) Tích hợp + cấu trúc tệp
- **Luôn bật** cùng mọi task; pair `core-verify-before-assert` (không claim success khi chưa verify) + `his-qa-anti-pattern` (nêu thao tác phá huỷ, cảnh báo bảo mật).
- `references/output-modes.md` — bảng 3 chế độ + danh sách trigger auto-expand + checklist thao tác phá huỷ.

## When to update
- Khi thêm loại "thao tác phá huỷ phải luôn nêu" mới, hoặc đổi quy ước bật debug/verbose.
