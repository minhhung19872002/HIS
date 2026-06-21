# Session Ops — vận hành 1 phiên (mở · chọn model · plan-mode · dọn context · handoff)

> **Phạm vi SỞ HỮU (REGISTRY):** file này là NGUỒN-SỰ-THẬT cho **4 thứ MỚI**: (a) checklist *đọc-gì-đầu-phiên*,
> (b) *khi-nào-plan-mode* + tái dùng plan, (c) *dọn context* (`/compact` `/clear` `/rewind` `/context`),
> (d) *kỷ luật handoff* (giữ STATUS.md NGẮN). Mọi thứ khác **LINK, KHÔNG copy**: model → `CLAUDE.md §Agent routing`;
> git-sync/commit/push → [`project-rules.md`](project-rules.md) §2-4; pipeline/DONE → [`workflow.md`](workflow.md);
> vị-trí-file-báo-cáo → [`../SKILL-MAP.md`](../SKILL-MAP.md) §0a.

> ⚠️ **3 GIỚI HẠN CỨNG của AI (đừng kỳ vọng tự-động-hóa):**
> 1. AI **không tự đổi model** — chỉ user `/model`, KHÔNG đổi được giữa phiên → "chọn model cho phiên" tối đa là **nudge lúc mở phiên**.
> 2. AI **không đọc được % context sống của chính mình** — % chỉ user thấy (status line / `/context`) → ngưỡng "60%" là **user bấm**, không phải AI tự kích.
> 3. `/compact` `/clear` `/rewind` `/context` là **lệnh của user** — AI không chạy được.
>
> ⇒ Bên dưới = **bảng quyết định cho USER** + quy tắc hành vi cho AI (chủ động refresh handoff ở mỗi mốc; chủ động đề nghị handoff).

## 1. Mở phiên — đọc gì, theo thứ tự (tiết kiệm context)
Harness tự nạp **CLAUDE.md + MEMORY.md**. Hook `session-start.sh` in banner (branch/dirty/behind + nhắc test-cuối + nudge `/model`). Sau đó:
1. Đọc **`docs/workspace-docs/STATUS.md`** — đang-ở-đâu / blocker / next (bản NGẮN; lịch sử dài ở `90-archive/handoffs/`).
2. Banner báo **`behind>0`** → `git pull --ff-only` + đối chiếu CODE đã-có-chưa (SYNC-GATE, [`project-rules.md`](project-rules.md) §2) **TRƯỚC** khi pick/viết.
3. Vào **task code** → [`../SKILL-MAP.md`](../SKILL-MAP.md) (router) → map con → skill. Tra symbol nhanh bằng ctags `tags` (`core-codebase-map-tooling`).

KHÔNG đọc lan man source — **chỉ** mở file mà STATUS/SKILL-MAP/skill chỉ tới. Mở `task.md`/Issue body khi task không-trivial.

## 2. Chọn tầng model (NUDGE — owner = `CLAUDE.md §Agent routing`, không lặp bảng)
- **Sonnet** — ~80-90% việc thường ngày: code/feature thường, fix bug rõ trong vài file, test · lint · docs · refactor nhỏ.
- **Opus** — việc KHÓ thật: kiến trúc/phase mới, refactor đa-file/đa-module, migration · DI · contract · DB, **tiền · patient-safety**, debug khó, security review lớn.
- **Haiku / subagent / `agy`** — scan · lookup · boilerplate **cô lập KHÔNG chạm guardrail**; trả summary ngắn về phiên chính.

AI: đầu phiên đánh giá tính chất yêu cầu → model lệch tầng thì **gợi ý user `/model`** đúng tầng TRƯỚC khi làm; khớp rồi thì im, vào việc.

## 3. Plan mode — khi nào bật, lưu ở đâu (tái dùng, không plan lại)
**Bật plan mode khi:** task LỚN/khó (phase mới · module lớn · refactor nhiều file · debug khó · migration) **và context còn sạch** (đầu phiên = tốt nhất). Task nhỏ/rõ → KHÔNG bật (overhead token thừa).

**Lưu & tái dùng:** plan đã chốt → ghi vào **body GitHub Issue** của task (state-store chính thức — [`workflow.md`](workflow.md) §2), **KHÔNG đẻ file `PLAN_*.md` rời** (trùng state-store → drift). Phiên sau: mở Issue → **implement theo plan, KHÔNG plan lại**.

Workflow lý tưởng: *plan mode (context sạch) → chốt plan vào Issue → `/clear` → phiên mới implement (thường = Sonnet).*

## 4. Dọn context — chọn đúng công cụ (BẢNG CHO USER)
| Tình huống | Công cụ | Vì sao |
|---|---|---|
| AI đi sai hướng | **`/rewind`** hoặc **Esc** | Quay về trước khi sai, không giữ hướng-sai trong context |
| Cùng task nhưng lịch sử quá dài | **`/compact`** | Nén lịch sử, GIỮ mục tiêu + file đã sửa + lỗi còn lại + next |
| Chuyển sang task MỚI (không liên quan) | **`/clear`** hoặc phiên mới | Xóa nhiễu cũ, bắt đầu sạch |
| Task còn dở nhưng phiên đã nặng | **Handoff (§5) → phiên mới** | Lưu state quan trọng rồi nối tiếp bằng context sạch |
| Không rõ context nặng vì đâu | **`/context`** | Xem thành phần nào đang chiếm chỗ |

⚠️ KHÔNG phải lúc nào cũng `/clear`: task **còn dở mà CHƯA handoff** → `/clear` làm **mất mạch**. Làm handoff (§5) trước.

## 5. Handoff & ngưỡng "context nặng" (~60%)
Khi context ~60% (user thấy %) **HOẶC** trước khi rời 1 task dở → trình tự an toàn:
**dừng thêm code mới → cập nhật handoff → (commit mốc nếu user cho phép — [`project-rules.md`](project-rules.md) §2) → phiên mới đọc STATUS + Issue → tóm tắt, CHƯA sửa code.**

**Handoff = cập nhật `STATUS.md`** (session-state ngắn; hook nhắc + Stop hook chặn nếu quên), ghi: đang-ở-đâu · file đã sửa · build/test đã chạy · lỗi/việc còn lại · next · **điều KHÔNG được làm phiên sau**. Phiên dài/nhiều việc → thêm file `90-archive/handoffs/session-YYYY-MM-DD-handoff.md` ([`../SKILL-MAP.md`](../SKILL-MAP.md) §0a) cho lịch sử; **STATUS.md GIỮ NGẮN** (§6).

**AI chủ động (bù cho giới hạn không-đo-%):** tự refresh `STATUS.md` ở **mỗi mốc** (xong 1 phần / đổi hướng) để bất cứ lúc nào user `/clear` cũng an toàn; và **chủ động đề nghị handoff** khi đã đụng nhiều file / chuỗi đã dài.

## 6. Kỷ luật giữ STATUS.md NGẮN (chống context-bloat)
STATUS.md được hook đọc **mỗi phiên** → phình = **mọi phiên tốn context**. Giữ **~30-40 dòng**, chỉ: *Đang-dở (uncommitted) · Đã-xong-gần-đây · Blocker · Next*. Lịch sử phiên cũ → **chuyển sang `90-archive/handoffs/`**, STATUS chỉ link. Backlog/plan chi tiết = **GitHub Issues** (KHÔNG chép vào STATUS).

## 7. Permission Modes (cheat-sheet — harness config, KHÔNG phải rule)
Đổi mode **LIVE** bằng `Shift+Tab`; mặc định phiên = `permissions.defaultMode` (settings.json); cờ 1 phiên = `--permission-mode`.

| Mode (Shift+Tab) | `defaultMode` | Làm gì | An toàn |
|---|---|---|---|
| Ask Permission | `default` | Hỏi trước mọi edit/lệnh | 🟢 cao (chậm) |
| Accept Edits | `acceptEdits` | Tự nhận edit file, vẫn hỏi Bash lạ | 🟡 cân bằng |
| Plan Mode | `plan` | Chỉ-đọc, chỉ lập kế hoạch | 🟢 (dùng theo task) |
| Bypass | `bypassPermissions` | Bỏ MỌI prompt | 🔴 nguy hiểm |

Mode mới ngoài ảnh: **`auto`** (tự cho phép việc an-toàn · chặn-mềm phá huỷ · chặn-cứng bảo mật — cần `skipAutoPermissionPrompt:true`) · `dontAsk`.
- **KHÔNG "thêm cả 4"** — chọn **1** default rồi `Shift+Tab` đổi tại chỗ. Thứ *trả lời-sẵn prompt* (giảm hỏi) = `permissions.allow`/`deny`/`ask`, **không phải** mode.
- HIS hiện: project (`settings.local.json`) + global = **`auto`**. **TUYỆT ĐỐI KHÔNG** đặt `bypassPermissions` default (bỏ cả prompt lệnh phá huỷ — ngược governance). Plan Mode dùng **theo từng task**.
- **Rules `allow`/`ask`/`deny`** = rào chắn dài hạn (mạnh hơn mode): **deny** secrets (`.env`·`secrets/`·`*.key|pem|pfx`·`appsettings.Production.json`) + phá huỷ (`rm -rf`·force-push·`reset --hard`·DROP) · **ask** `git commit`·`git push`·`reset`·`npm install`·`gcloud run|builds` · **allow** đọc-an-toàn + build + test. Baseline = `.claude/settings.json` (committed, dùng chung 2 máy); allow máy-riêng = `settings.local.json`.

---
> Liên quan: [`workflow.md`](workflow.md) (pipeline) · [`project-rules.md`](project-rules.md) (git-ops/rollback) · [`README.md`](README.md) (index `.claude/workflow/`) · `CLAUDE.md §Agent routing` (model). **Sửa file này → chạy `bash .claude/lint.sh`.**
