---
name: core-code-change-workflow
description: Use this skill (portable, tech-agnostic) cho MỌI thao tác thay đổi code — thêm/sửa/xóa file, function, class, schema, endpoint, config, test, doc — để giảm lỗi · giảm blast radius · dễ kiểm tra · dễ rollback. Triggers include "thêm/sửa/xóa code", "fix bug X", "refactor X", "thay đổi API/DB/contract", "delete file/function", bất kỳ task code-gen nào trên FE/BE/DB/API/test/docs. Cụ thể hóa workflow theo 3 nhánh (add/modify/delete) với pre-flight, file-allow-list, fail criteria, rollback. Do NOT use cho pure design discussion (chưa chạm code) hay open-ended brainstorm — chỉ áp khi có yêu cầu thay đổi code cụ thể.
metadata:
  type: core
  node_type: skill
  scope: portable
---

# Code Change Workflow — quy trình chuẩn cho AI thay đổi code

## 1. Nguyên tắc cốt lõi (NON-NEGOTIABLE)

1. **Verify trước, code sau** — KHÔNG đoán file/symbol/field tồn tại. Read/Grep/Glob trước khi reference.
2. **Minimal change** — diff nhỏ nhất đúng việc được giao. KHÔNG refactor/rename/cleanup tiện tay ngoài scope.
3. **Behavior-preserve mặc định** — đổi behavior chỉ khi user explicit yêu cầu. Khi không chắc → STOP hỏi.
4. **Boundary catch hẹp** — try-catch ở boundary thật (SDK/DB/HTTP), KHÔNG broad-catch nuốt lỗi ở service/controller.
5. **1 trục/phiên** — bug fix / refactor / split file / rename / migrate — chọn 1 trục, KHÔNG trộn.
6. **No commit no push trừ khi user explicit** — chỉ Edit/Write file local; chữ "push"/"commit"/"đẩy code"/"deploy" phải xuất hiện rõ trong câu user.
7. **No destructive op không xin phép** — `rm -rf` · `git reset --hard` · `--force-push` · drop schema/table · uninstall dep · revert revision — STOP, mô tả + xin confirm.
8. **Defer logic-changing khi không có deploy/smoke** — refactor đụng interval / shape / side-effect / async → ghi roadmap, làm phiên có verify đầy đủ.

---

## 2. Quy trình tổng quát (từ nhận yêu cầu → tích hợp)

| Bước | Hành động | Output |
|---|---|---|
| **A. Clarify** | Đọc yêu cầu. Nếu ≥2 interpretation khác kết quả → hỏi 1 lượt ngắn. Convert relative time → absolute. | Hiểu chính xác task |
| **B. Verify-before-assert** | Read file thực, Grep symbol, Glob path. KHÔNG dựa memory cũ/doc cũ. | Danh sách file/symbol đã verify |
| **C. Impact analysis** | Map caller, dependency, test, migration, config, doc tham chiếu | Bảng blast radius |
| **D. Phân loại thao tác** | Xác định: ADD / MODIFY / DELETE (có thể >1) | Nhánh quy trình |
| **E. Plan minimal** | Chốt: file được phép chạm, file KHÔNG chạm, contract đổi/không, test cần chạy | Plan rõ |
| **F. Execute** | Edit/Write tuần tự theo plan. Mỗi step verify ngay khi nghi ngờ. | Diff |
| **G. Verify post-change** | Lint → typecheck → build → test (unit/integration/e2e theo nhu cầu) | Status pass/fail |
| **H. Report** | Tóm tắt thay đổi + risk còn + bước kế. KHÔNG commit/push tự ý. | Báo cáo + Q&A |

---

## 3. Quy trình THÊM code (ADD)

### Input cần có
- Tên feature/function/file/endpoint/migration cần thêm
- Vị trí (folder/layer/module) hoặc convention để suy ra
- Contract (signature, request/response shape) nếu là API/DB
- Use case → test case tối thiểu (happy path)

### Điều kiện được phép
- KHÔNG trùng với code/file đã có (verify Glob + Grep)
- Có chỗ đặt phù hợp convention project (KHÔNG tạo folder mới nếu KHÔNG được phép)
- Đã clarify nếu yêu cầu ambiguous

### File được phép chạm
- File mới ở folder đúng convention
- File index/barrel để export (nếu project dùng)
- File register/DI nếu là service/controller mới
- Test file đi kèm (mặc định bắt buộc cho function/endpoint mới)

### File KHÔNG chạm
- File ngoài module liên quan
- Config build/CI trừ khi yêu cầu rõ
- Schema/migration cũ đã apply
- File code "tiện tay refactor" không thuộc scope

### Tiêu chí hoàn thành
- File mới biên dịch sạch (typecheck/build pass)
- Test mới pass + test cũ KHÔNG vỡ
- Đăng ký vào DI/route/index nếu cần
- Doc/comment WHY (không WHAT) nếu non-obvious

### Tiêu chí fail
- Trùng code/file đã có → STOP, dùng cái cũ
- Test cũ vỡ vì add → impact lan ngoài scope → STOP, hỏi
- Phải sửa file ngoài allow-list → STOP, escalate
- Build/typecheck fail không tự fix được trong scope → STOP

### Cách kiểm tra
1. `<lint>` + `<typecheck>` 0 errors
2. `<build>` produce artifact OK
3. `<test mới>` pass
4. `<test full suite scope liên quan>` pass
5. Manual smoke (nếu UI hoặc workflow critical)

### Cách rollback
- `git checkout -- <new file>` chưa add → file biến mất
- Đã `git add` → `git restore --staged` rồi delete
- Đã commit chưa push → `git reset HEAD~1` (soft, giữ working)
- Đã push → tạo revert commit (không reset --hard branch chung)
- Đã deploy → rollback artifact (cloud revision / docker image cũ)

---

## 4. Quy trình SỬA code (MODIFY)

### Input cần có
- File + symbol (function/class/field) cần đổi
- Lý do (bug ID / requirement / refactor goal)
- Behavior trước vs sau (rõ ràng)
- Test phải pass sau khi sửa

### Điều kiện được phép
- Đã hoàn tất **5 bước bắt buộc trước khi sửa**:
  1. **Phạm vi ảnh hưởng** — grep caller, ref, import, doc
  2. **Contract bị đổi** — signature/shape/enum/route/schema có đổi không? Nếu CÓ → cần permission rõ
  3. **Rủi ro** — breaking change? performance? security? data loss?
  4. **Dependency** — service/module/lib upstream-downstream nào đụng
  5. **Test cần chạy** — đơn vị nào cần verify (list tên test/suite)
- Nếu sửa code chung/shared (>1 caller): bắt buộc verify mọi caller

### File được phép chạm
- File chứa symbol cần đổi
- File test tương ứng (update khi behavior đổi)
- File doc/comment trực tiếp tham chiếu (nếu cần)
- File DI/config nếu đổi signature constructor

### File KHÔNG chạm
- File caller — chỉ chạm nếu contract đổi VÀ user OK
- File "có vẻ cũ/xấu" nhưng không thuộc bug — defer
- Format/style file lân cận — defer
- Schema/migration đã apply prod — phải qua migration mới

### Tiêu chí hoàn thành
- Diff đúng phần cần đổi, KHÔNG kéo theo
- Test cũ vẫn pass (behavior preserve nếu mục tiêu là preserve)
- Test mới reproduce bug trước khi fix + pass sau fix (nếu bug fix)
- Caller KHÔNG vỡ (verify build full)

### Tiêu chí fail
- Phát sinh đụng file ngoài allow-list mà không xin phép → STOP
- Test cũ vỡ + không thuộc behavior cần đổi → STOP, root-cause analyze
- Build/typecheck fail không liên quan diff → có thể repo broken trước đó, STOP báo user
- Diff > expectation 3x → scope creep → STOP, re-plan

### Cách kiểm tra
1. `git diff` review trước commit (file + dòng đúng scope)
2. Lint + typecheck pass
3. Build pass
4. Test diff-targeted pass
5. Smoke flow user-visible (nếu có UI hoặc workflow)
6. Spot-check 3 file random nếu sửa bulk >20 file

### Cách rollback
- Chưa commit: `git checkout -- <file>` revert from HEAD
- Đã commit chưa push: `git reset HEAD~1` (soft) → fix → commit lại
- Đã push: `git revert <sha>` tạo commit ngược
- Database migration đã apply: cần migration "down" ngược, KHÔNG drop tay
- Production: rollback revision/image cloud, không destructive

---

## 5. Quy trình XÓA code (DELETE)

### Input cần có
- File/symbol/folder cần xóa
- Lý do (dead code, deprecated, replaced by X)
- Bằng chứng KHÔNG còn dùng (grep result, log, version metadata)

### Điều kiện được phép
- **Verify bắt buộc**: grep TOÀN PROJECT KHÔNG còn reference (import/usage/route/config/doc)
- Đã hỏi user nếu file >100 dòng hoặc file public API
- KHÔNG xóa data/schema/migration đã apply prod (chỉ deprecate)
- KHÔNG xóa file chưa biết origin (in-progress của ai đó?)

### File được phép chạm
- File/folder cần xóa
- File index/barrel/route/DI để bỏ export/register
- File test tương ứng
- File doc tham chiếu

### File KHÔNG chạm
- File khác có chung folder nhưng KHÔNG depend → defer cleanup riêng
- Schema/migration cũ — chỉ thêm migration mới (drop column/table), KHÔNG sửa migration cũ
- File git history (KHÔNG `git rebase -i` để rewrite history)

### Tiêu chí hoàn thành
- 0 reference còn lại (grep verify TRƯỚC và SAU xóa)
- Build pass (KHÔNG broken import)
- Test cũ pass (chỉ test của symbol xóa được loại bỏ)
- Doc tham chiếu cập nhật

### Tiêu chí fail
- Grep còn reference → STOP, xóa từ caller trước
- Build/test vỡ → có dependency hidden → STOP, restore
- Phát hiện file đang được dùng mà ban đầu tưởng dead → STOP escalate
- User chưa explicit OK cho file public API/lớn

### Cách kiểm tra
1. `grep -rn '<symbol|filename>'` 0 hit (loại trừ chính file đang xóa)
2. Build + typecheck pass
3. Test pass
4. Manual scan route/menu/sidebar (nếu là page) — không còn link mồ côi
5. Diff review: chỉ delete, không kéo thêm modify

### Cách rollback
- `git checkout HEAD~1 -- <path>` restore file
- Đã commit chưa push: `git reset HEAD~1`
- Đã push: `git revert <sha>` restore qua commit ngược
- Data đã DROP: restore từ backup (không có backup → mất vĩnh viễn, vì vậy KHÔNG drop data ngẫu hứng)

---

## 6. Quy tắc kiểm tra (CHECKING)

Sau MỌI thay đổi, theo thứ tự (không skip):

1. **Lint** — code style + import order + unused
2. **Typecheck** — `tsc --noEmit` HOẶC compiler strict mode 0 errors
3. **Build verify** — full build sinh artifact OK (FE bundle / BE binary)
4. **Unit test** — test trực tiếp symbol đổi pass
5. **Integration test** — test module/layer pass nếu đụng contract
6. **E2E test** — chỉ chạy khi đụng user-visible workflow critical
7. **Smoke prod-like** — manual hoặc auto trên staging nếu có deploy
8. **Diff review** — đọc git diff cuối, không có hunk lạ ngoài plan

**Stop conditions:**
- Lint/typecheck/build fail không liên quan diff → repo broken trước đó, STOP
- Test cũ vỡ → impact ngoài scope, STOP root-cause
- Test mới fail → fix trước khi report done
- Diff lớn hơn 3x kế hoạch → scope creep, STOP re-plan

---

## 7. Quy tắc rollback (UNIVERSAL)

| Trạng thái | Cách rollback an toàn | KHÔNG dùng |
|---|---|---|
| Chưa stage | `git checkout -- <file>` | `git clean -fd` (mất file untracked khác) |
| Đã stage chưa commit | `git restore --staged <file>` | — |
| Đã commit chưa push | `git reset --soft HEAD~N` (giữ working) | `git reset --hard` (mất uncommitted) |
| Đã push branch riêng | `git revert <sha>` HOẶC `git reset` + `force-push` (chỉ branch riêng) | `force-push main/master` |
| Đã push main + CI deploy | `git revert <sha>` + redeploy HOẶC rollback cloud revision | `force-push main` (history rewrite) |
| Đã deploy prod | Rollback cloud revision/docker tag cũ TRƯỚC, fix code sau | Drop schema / data sửa tay |
| DB migration đã apply | Viết migration "down" hoặc bù migration mới | Sửa file migration cũ |

**Nguyên tắc:** rollback luôn ưu tiên **forward** (commit ngược / revision cũ) hơn **destructive** (reset hard / force push / drop).

---

## 8. Quy tắc xử lý NỢ KỸ THUẬT

### Ghi nhận
- Phát hiện trong khi sửa → ghi vào `docs/workspace-docs/20-backlog/tech-debt-roadmap.md` (HOẶC equivalent project) NGAY khi gặp
- Format: ID + mô tả + file path + line + tier (EASY/MEDIUM/HARD) + blast radius

### Phân loại tier
| Tier | Định nghĩa | Cách xử |
|---|---|---|
| **EASY** | <30p, FE-only hoặc build-verify đủ, blast hẹp | Có thể xử lý trong phiên hiện tại nếu user OK |
| **MEDIUM** | 30p-3h, đụng nhiều file hoặc cross-layer, cần test rộng | Phiên riêng, có plan |
| **HARD** | >3h, cross-module, cần migration/deploy, blast lớn | Phiên dài, chia batch nhỏ |

### Ưu tiên
- Bug fix (đang vỡ) > Risk (sắp vỡ) > Smell (xấu nhưng OK)
- Item chặn release > item nội bộ
- EASY trước MEDIUM trước HARD (dứt điểm dễ → hết blocker → vào khó)

### Defer
- Logic-changing không có deploy/smoke → defer phiên có deploy
- Cross-state risk → defer phiên có e2e test
- Hardware-dependent → defer khi có device
- Scope creep phát hiện giữa phiên → ghi vào roadmap, KHÔNG mở rộng phiên hiện tại

### Xử lý sau
- Mỗi phiên 1 trục (bug / refactor / split) — KHÔNG trộn
- Sau xong → update roadmap entry với commit SHA + verify result + còn lại
- Re-prioritize roadmap nếu phát hiện blocker mới

---

## 9. Quy tắc KHÔNG SỬA LAN

1. **Allow-list strict** — chỉ chạm file đã liệt kê trong plan. Đụng thêm file → STOP, escalate.
2. **No opportunistic refactor** — thấy code xấu lân cận: ghi roadmap, KHÔNG sửa.
3. **No contract change implicit** — đổi signature/shape/route/schema phải có explicit permission. Lưu ý "fix bug" KHÔNG bao gồm đổi contract.
4. **No bulk rename/format** — KHÔNG mass-rename biến / mass-format file ngoài scope yêu cầu.
5. **No dependency upgrade** — KHÔNG bump package version trừ khi yêu cầu rõ.
6. **No file ngoài layer** — sửa BE service KHÔNG đụng FE (và ngược lại) trừ khi contract change đã agreed.
7. **No "tiện tay sửa typo"** — typo trong code khác file đang sửa → roadmap.
8. **No git config / CI / hook change** — trừ khi user explicit yêu cầu.

### Khi gặp vấn đề

| Tình huống | Action |
|---|---|
| **Blocker** (không tiếp tục được — env miss, dep miss, schema drift) | STOP, document blocker rõ (cái gì miss, fix thế nào), defer task hiện tại, báo user |
| **Dependency** (cần task khác xong trước) | STOP, ghi roadmap "blocked by X", chuyển task khác hoặc đợi |
| **Conflict** (code hiện tại đã có solution khác) | STOP, present 2 option (giữ cũ vs đổi), user quyết |
| **Scope expansion** (việc lớn hơn kế hoạch) | STOP, không tự mở rộng. Re-plan với user, có thể tách phiên |

---

## 10. Checklist cuối cùng cho AI trước khi báo DONE

Phải tick HẾT:

- [ ] **Pre-flight**: clarify + verify-before-assert + impact analysis + minimal-change plan đều DONE
- [ ] **Allow-list**: chỉ chạm file trong plan; nếu phát sinh → đã escalate user
- [ ] **Contract**: nếu đổi → user đã OK explicit; nếu không đổi → verify caller KHÔNG vỡ
- [ ] **Lint**: 0 error/warning mới phát sinh do diff
- [ ] **Typecheck**: 0 error (strict mode pass, không chỉ noEmit lỏng)
- [ ] **Build**: full build pass (sinh artifact thật, không skip)
- [ ] **Test**: unit + integration relevant pass; e2e nếu workflow critical
- [ ] **Smoke**: manual hoặc auto cho user-visible change (nếu UI/API)
- [ ] **Diff review**: git diff đọc lại, không hunk lạ
- [ ] **Roadmap update**: nợ phát hiện ghi vào tech-debt log
- [ ] **Doc update**: WHY-comment + handoff/changelog nếu phiên dài
- [ ] **No destructive op**: chưa run rm/reset/force trừ khi user explicit
- [ ] **No commit/push tự ý**: chỉ làm khi user nói "commit"/"push"/"deploy" rõ
- [ ] **Report**: tóm tắt thay đổi + risk còn + bước kế (<300 từ)

---

## 11. Trigger phrases (khi áp skill này)

Áp ngay khi user nói (hoặc tương đương):
- "thêm/sửa/xóa code"
- "tạo file/function/endpoint X"
- "fix bug X"
- "refactor X"
- "đổi contract/schema/API"
- "delete dead code"
- "rà soát code làm sạch"
- bất kỳ task gen/edit code có scope cụ thể

KHÔNG áp khi:
- Pure design discussion (chưa chạm code) → dùng `core-requirement-clarify`
- Tạo skill mới → dùng `core-skill-authoring`
- Tạo doc thuần (không code) → dùng skill doc tương ứng

---

## 12. Cross-ref skill liên quan

- `core-requirement-clarify` — clarify ambiguous trước khi sửa
- `core-verify-before-assert` — verify file/symbol thực tế
- `core-impact-analysis` — map blast radius
- `core-minimal-change` — smallest correct diff
- `core-refactor` — refactor behavior-preserving
- `core-reusable-code` — extend/reuse trước khi tạo mới
- `core-testing-architecture` — chọn test level đúng
- `core-execution-output` — báo cáo concise, không spam log
- `his-tech-debt-workflow` — workflow tech-debt project-specific
- `his-qa-anti-pattern` — anti-pattern catalog HIS

---

*(Portable skill — áp mọi project. Project-specific override ở `his-*` skills.)*
