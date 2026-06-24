# workflow/parallel-windows.md — Mô hình chạy NHIỀU cửa sổ chat Claude song song (same-tree, 1 RUNNER)

> **CHỦ (REGISTRY):** mô hình vận hành đa-cửa-sổ trên CÙNG working tree. Sub-rule có chủ khác → **LINK, KHÔNG copy**.
> Cơ chế git-ops chi tiết = [`project-rules.md`](project-rules.md) §2-4 · claim-first + SYNC-GATE = `project-rules.md` §2 ·
> pipeline 5 chặng = [`workflow.md`](workflow.md) · build-gate/self-review = skill `his-qa-anti-pattern`.
>
> **PHẠM VI HIỆN TẠI:** dùng cho **tech-debt / fix / feature**. **KHÔNG** dùng cho task **TEST** — test làm CUỐI CÙNG sau
> khi mọi fix DONE (chủ: `../../CLAUDE.md` §"Quản lý plan/task"). Khi chuyển sang test → xét lại mô hình này.

## 0. Vì sao có mô hình này
Nhiều cửa sổ Claude trên cùng máy **chia sẻ 1 working tree + 1 backend + 1 DB + 1 bộ cổng** (worktree/tool ngoài/MCP
chỉ cô lập *file*, KHÔNG cô lập *runtime* — đã nghiên cứu, kết luận: không hợp máy 16GB). Hệ quả: nguy hiểm nằm ở
**CHẠY** (DB/cổng/migration), không phải **SOẠN**. Mô hình: **nhiều cửa cùng SOẠN — 1 cửa CHẠY.**

**Trần phần cứng (đo trên máy 16GB này — tùy máy):** WSL2/Docker bị cap RAM nhỏ (xem `~/.wslconfig`), SQL Server idle
đã ăn >1GB; máy thường trực ở mức commit cao → **chỉ chứa nổi 1 stack HIS + 1 phiên dev đang chạy**. Vì vậy:
- Tối đa **4 cửa SOẠN + 1 RUNNER** chạy app. KHÔNG dựng stack/DB thứ 2.
- **Build TUẦN TỰ** — không bao giờ build nặng ở cả 4 cửa cùng lúc (nguy cơ OOM/swap).
- **Không đạt được** "mỗi cửa tự chạy/test app riêng" — đó là giới hạn phần cứng, không phải thiếu kỹ thuật.

## 1. Phân vai theo REGISTRY (né god-file) — bất biến: **1 registry / 1 cửa tại một thời điểm**
God-file (append-magnet) là điểm đụng chính. Chia mỗi cửa giữ một **registry khác nhau** → không cửa nào tranh file:

| Cửa | Vai | Giữ registry (god-file) | Ví dụ task tech-debt | Chạy app? |
|---|---|---|---|---|
| **W1** | **RUNNER** | `HIS.Infrastructure/DependencyInjection.cs`, `Data/HISDbContext.cs`, **migration** | tách god-service BE, siết DI | ✅ **độc quyền** app + DB + docker |
| **W2** | edit-only | `frontend/src/App.tsx` + menu `TerminalLayout.tsx` | refactor v2 page, gộp route | ❌ chỉ `npm run build`/`tsc -b` |
| **W3** | edit-only | **registry-free**: controller (auto-discover) · `api/*.ts` (không barrel) · refactor **1 file cô lập** | siết `:any`, tách 1 component | ❌ chỉ build |
| **W4** | edit-only | docs / governance / tech-debt **1 file** khác | xóa dead-code, sweep import | ❌ chỉ build |

> Nguyên tắc, KHÔNG cứng W1-W4: nếu phiên toàn tech-debt FE thì có thể W1=runner+refactor-isolated, W2=App.tsx,
> W3/W4=file cô lập khác. **Miễn 2 cửa KHÔNG cùng chạm 1 registry/god-file/contract dùng chung.**
> Shared/contract "committee file" (`client.ts`, `MappingProfile.cs`, `HISDbContext.cs`, core DTO, `_v2kit`) = cùng luật
> mutex như god-file: **chỉ 1 cửa sửa/lúc**.

**Model gợi ý / cửa** (model là PER-CỬA; tiêu chí đầy đủ → `../../CLAUDE.md` §"Agent routing"): cửa chạm
**DI / contract / DB / migration / refactor-rủi-ro** (thường = RUNNER) → **Opus** · cửa **refactor cơ học verify-được /
FE page / sweep import / siết `:any`** → **Sonnet** · cửa **docs / Q&A thuần / bulk cô lập KHÔNG chạm guardrail** →
**Haiku** hoặc đẩy `agy`. Đặt `/model` **một lần** khi gán vai cửa; task lệch tầng thì nudge đổi.

## 2. Nghi thức ĐẦU mỗi cửa sổ (mỗi phiên)
0. **MODEL-TIER CHECK TRƯỚC TIÊN** (trước khi vào task): đánh giá tính chất task của cửa này; nếu `/model` hiện tại
   **lệch tầng** (vd Opus cho việc cơ học / Q&A) → **GỢI Ý user `/model` đúng tầng RỒI mới làm**, đừng vào việc luôn
   (tầng = bảng "Model gợi ý / cửa" §1; tiêu chí chủ: `../../CLAUDE.md` §"Agent routing"; hook `session-start.sh` đã nudge).
   Nudge **mềm** — KHÔNG tự đổi model giữa phiên.
1. **SYNC-GATE** trước khi pick (cây sạch + `git pull --ff-only` + verify-against-CODE) — chủ: `project-rules.md` §2.
2. **CLAIM-FIRST** ngay khi chốt task: `gh issue edit <n> --add-label in-progress --add-assignee @me` (GitHub là kênh
   DUY NHẤT máy-2 thấy) — chủ: `project-rules.md` §2 + `../../CLAUDE.md`.
3. **Khai báo allow-list**: nêu rõ *cửa này = issue/module nào + sẽ chạm file/thư mục nào*. Chỉ sửa trong allow-list.
4. **Quy tắc nhận diện chéo:** thấy `git status` có file dirty **ngoài allow-list của mình** → đó là **cửa Claude khác
   HOẶC `agy`** (không phải "Antigravity" mặc định) → **KHÔNG đụng, KHÔNG stage, KHÔNG nhận là việc của mình.**

### 2b. Skill-routing theo TẦNG MODEL — cửa Sonnet/Haiku KHÔNG tự navigate đa-hop
> Hook SKILL-ROUTER + `SKILL-MAP.md` fire cho **mọi** model nhưng **không phân tầng** → model yếu (Haiku/Sonnet) dễ
> **bỏ qua / chọn sai** khi phải tự đi `SKILL-MAP → sub-map → chọn skill`. 3 luật dưới chốt skill đúng cho cửa cheap:
- **S1 — Pre-resolve (việc-khó để tầng-mạnh):** cửa **Opus/coordinator** (hoặc bạn) resolve **SẴN** danh sách *skill bắt
  buộc + guardrail P0* cho task **theo `SKILL-MAP.md` (2) dispatch**, ghi vào **brief/issue body** (state-store, chủ:
  `workflow.md` §2). Cửa cheap **chỉ áp đúng list đã ghi** — không phải tự suy luận đa-hop. Nếu brief CHƯA có list →
  cửa cheap đọc **đúng 1 dòng dispatch** cho loại task của nó trong `SKILL-MAP.md` (2) và áp **nguyên chuỗi skill được
  nêu**, TUYỆT ĐỐI không bịa skill (fallback `SKILL-MAP.md` (6): không chắc → DỪNG hỏi, không tự chế).
- **S2 — Giới hạn loại task cho cửa cheap:** Sonnet/Haiku **CHỈ** nhận task **registry-free / cơ học verify-được /
  docs** (routing đơn giản 1-2 skill). **KHÔNG** giao task chạm **guardrail** (DI · contract · DB/migration ·
  patient-safety · tiền · secret) → giữ **Opus** (đã là rule `../../CLAUDE.md` §"Agent routing"). Mis-route ở cửa cheap
  vì thế **ít nguy hiểm** (việc nó làm vốn không chạm guardrail).
- **S3 — Auto-escalate:** đang làm mà phát hiện task **lỡ chạm guardrail** ngoài dự kiến (phải sửa `DependencyInjection.cs`,
  đổi contract/DTO, viết migration…) → **STOP, KHÔNG tự làm**, nudge user chuyển sang cửa **Opus** / `/model opus`.
- **P0 áp MỌI tầng (cheap không được bỏ):** no-hallucination · build-gate · no-hardcode-secret · DI-registration —
  hook + `SKILL-MAP.md` §0b enforce, model nào cũng phải theo.

## 3. Luật vận hành RIÊNG của mô hình (ngoài git-ops chuẩn)
- **R1 — Chỉ RUNNER chạy app/DB/docker.** W2-W4 chỉ `dotnet build` / `tsc -b` / `vite build` (build-gate, KHÔNG run-gate).
  → diệt: đụng cổng, bẩn DB chung, test nhầm-cửa.
- **R2 — god-file & migration = MUTEX.** Chỉ 1 cửa có sửa-chưa-commit ở 1 god-file/lúc. Thêm dòng DI/route/DbSet →
  **commit RIÊNG dòng đó + push ngay** để cửa khác rebase lên trước khi chạm cùng file.
- **R3 — Migration đánh số an toàn:** chỉ **RUNNER** tạo migration. Số kế tiếp = `ls Data/Scripts/` → **max(NN)+1** (TUYỆT
  ĐỐI không hard-code số); `git fetch` **trước** khi tính; tạo file rỗng `NN_*.sql` → commit/push NGAY để max+1 tiến cho
  mọi máy; script luôn idempotent `IF NOT EXISTS`, **không DROP mù**.
- **R4 — git an toàn cây-chung:** **chỉ `git add <file của mình>`** (CẤM `add -A`/`-am`) · dùng **Edit** không Write/sed
  (chống CRLF churn) · `git pull --rebase` trước push · push nhỏ/atomic kèm `Closes #N`. Cơ chế đầy đủ → `project-rules.md` §2-4.
- **R5 — RAM:** `docker stop` container không-liên-quan (vd n8n / vhandelivery) khi làm HIS · **build tuần tự**, tối đa 1
  build nặng/lúc · đóng tab browser thừa khi build.
- **R6 — STATUS.md:** Stop-hook đọc CẢ cây → có thể chặn vì file cửa khác. **KHÔNG** commit file lạ để mở khoá; cập nhật
  STATUS cho phần của mình, để **RUNNER** là cửa giữ STATUS chính (đừng giành — xem `feedback_antigravity-parallel-same-tree`).

## 4. Toàn bộ trường hợp → cách xử lý
| # | Trường hợp | Mức | Xử lý |
|---|---|---|---|
| 1 | 2 cửa sửa **cùng 1 file** (last-write-wins ghi đè câm) | 🔴 | Phân file/module từ đầu (R-allow-list); **Read lại trước mỗi Edit**; commit nhỏ-thường → thành git-conflict cứu được |
| 2 | 2 cửa cùng thêm **god-file** | 🔴 | R2 mutex; thêm-commit-push ngay; build-gate sau mọi merge (rớt 1 dòng DI = 500 dù build pass) |
| 3 | 2 cửa **trùng số migration** (merge sạch nhưng trùng câm) | 🔴 | R3: chỉ runner tạo; fetch trước; file rỗng push ngay; idempotent |
| 4 | Cửa non-runner **lỡ chạy app** (đụng cổng / bẩn DB) | 🔴 | R1 build-only; `vite strictPort` chặn 3001→3002 câm; (tùy) DB riêng `HIS_w2` |
| 5 | `git add -A`/`-am` **nuốt việc cửa khác** | 🔴 | R4: cấm add-all, chỉ add tường minh |
| 6 | Task có **blast-radius ngầm** sang module cửa khác | 🔴 | impact-analysis TRƯỚC claim (grep callers); committee-file = mutex; ưu tiên đổi additive |
| 7 | Push **non-fast-forward** (4 cửa + máy-2) | 🔴 | R4: `pull --rebase`; push nhỏ-thường; fetch trước claim/migration/push |
| 8 | **OOM/swap** khi build chồng live-stack | 🟡 | R5: build tuần tự; `dotnet build` project lẻ `--no-restore`; stop container thừa |
| 9 | **Nhãn in-progress treo** sau crash | 🟡 | Đầu phiên sweep nhãn stale của @me; claim nhỏ/atomic; dừng/blocked → gỡ nhãn ngay |
| 10 | **Máy-2** = writer thứ 5 không thấy local | 🟡 | Nguồn-sự-thật chỉ `git fetch` + `gh issue list`; claim round-trip GitHub TRƯỚC khi làm |
| 11 | Cửa **crash / VS Code reload** giữa task | 🟡 | Mở lại: `git status` + build-gate phát hiện file nửa-vời; commit checkpoint thường; reconcile nhãn |
| 12 | **STATUS.md Stop-hook** chặn nhầm (thấy file cửa khác) | 🟡 | R6: không commit file lạ; runner giữ STATUS |
| 13 | **CRLF churn** (autocrlf=true) phình diff/giả conflict | 🟡 | R4: Edit không Write/sed; soi `git diff` trước add (`feedback_windows-line-ending-sed-churn`) |
| 14 | **DROP/seed phá DB chung** (runner chạy mọi script mỗi startup) | 🔴 | R3 idempotent + không DROP mù; mọi script destructive review tay; (tùy) DB riêng/cửa |

## 5. An toàn đạt được & giới hạn
- **Sau mitigation ≈ 90-93% trơn tru** (model authoring song song). ~10% còn lại đa số **hồi phục được** (git-conflict /
  cổng báo lỗi to / script idempotent no-op).
- **4 ca KHÔNG triệt tiêu hết bằng quy trình, chỉ giảm:** (1) blast-radius ngầm cross-module; (2) nhãn treo sau hard-crash;
  (3) rớt dòng god-file khi gỡ conflict ẩu mà vẫn build-pass; (4) DROP/script phá DB chung. → đây là lý do nên **trả nợ
  god-file + thêm bảng applied-migrations** để nâng trần an toàn (xem skill `his-tech-debt-workflow`).
- **KHÔNG đạt:** 4 cửa cùng chạy/test app riêng (giới hạn phần cứng 16GB + DB chung). Muốn có → cần RAM 32-64GB / cloud
  agent / per-window DB+port, KHÔNG theo hướng này trên máy hiện tại.

## 6. (Tùy chọn — smoke-test riêng, CHƯA auto-apply) Cap RAM SQL Server an toàn
Nếu cần ghì SQL trong VM nhỏ, đặt **CẢ** giới hạn SQL nội bộ **và** headroom container (đừng chỉ `mem_limit` trần kẻo
Docker OOM-kill SQL):
```yaml
# docker-compose.yml › services.sqlserver
environment:
  - MSSQL_MEMORY_LIMIT_MB=2048   # SQL tự giới hạn 2GB
mem_limit: 2560m                 # container headroom > giới hạn SQL
```
Đây là thay đổi **DB-infra dùng chung** (máy-2 kế thừa) → **review + smoke-test** trước khi commit; rẻ-an-toàn hơn là chỉ
`docker stop` container không-liên-quan để nhường RAM cho SQL.

## 7. CHẾ ĐỘ TEST 4 cửa (chạy SAU khi mọi fix DONE)
> Test làm **CUỐI CÙNG** (chủ: `../../CLAUDE.md` + `docs/architecture/evidence/README.md` §0). Quy ước **đặt-tên ảnh /
> viewer / regen / dedup-GitHub** = chủ ở **`docs/architecture/evidence/README.md`** + skill `his-test-e2e` §6 — LINK, KHÔNG copy.

**Khác chế độ code:** test trên **PROD (his-psi)** → runtime ở cloud, **KHÔNG cần app/DB local** → **TẮT Docker local**
(giải phóng RAM) → 4 cửa mỗi cửa **1 browser MCP CHẠY SONG SONG** được (Playwright / Chrome-DevTools MCP). Nên "1 RUNNER
độc quyền app" của §1 **không áp lúc test**; thay bằng **1 cửa INTEGRATOR** lo gộp (xem dưới).

- **Phân chia (coordinator):** phân **TOÀN BỘ** plan (38 phân hệ + 12 luồng + cross) cho 4 cửa — **phủ hết, KHÔNG gap/overlap**.
  Mỗi cửa nộp evidence theo **folder riêng** (`<layer>-<modid>/` · `flows/` · `cross/`) + **TC-code riêng** → tự không đụng.
  **Completeness = bám checklist state từng item trong viewer**, KHÔNG do cách chia cửa quyết định. **Bảng chia 4 cửa cụ thể
  (C1-C4 + tầng model + read-only) = `../../docs/workspace-docs/20-backlog/test-4window-allocation.md`** (nguồn-sự-thật, mọi máy).
- **Model-tier:** luồng/module đơn giản (navigation, ít nhánh) → cửa **Sonnet/Haiku** (§2b S2); luồng phức tạp (nhiều
  setup/nhánh, nghiệp vụ rối) → **Opus**.
- **Chụp:** MCP tự lái + screenshot từng state, **đặt tên đúng** evidence README §2.
- **File dùng chung khi test:** CHỈ **`manifest.js`** — **1 cửa INTEGRATOR** chạy `gen-manifest` **MỘT lần** sau khi cả 4 nộp
  ảnh (mutex, như god-file). `data/*.js` **READ-ONLY** lúc chạy (đổi plan → workflow `his-testplan-evidence`, single-owner).

**🔴 Luồng khi TEST FAIL (DỪNG + tạo task — + chống đụng/thiếu):**
1. **DỪNG luồng đó** (KHÔNG bịa bước tiếp trên state hỏng); chụp state `error`/`validation`/`fail` làm bằng chứng.
2. **DEDUP trước khi tạo:** `gh issue list --label bug` (+ search từ khoá lỗi) → đã có → **comment bổ sung**, KHÔNG tạo trùng.
3. Chưa có → **tạo issue `bug`/`fix`**: tiêu đề = *lỗi gì + màn/nghiệp vụ*; body = mô tả + bước tái hiện + evidence +
   kỳ-vọng-vs-thực-tế; **liên kết 2 chiều** (fix ghi "Phát hiện từ #<test>"; comment ngược task test "Bug → #<fix>") —
   chủ: evidence README §5 + `../../CLAUDE.md`.
4. Đánh item `fail` trong viewer — nhưng **nguồn-sự-thật của fail = GitHub issue** (localStorage chỉ review LOCAL, không
   commit) → **không có file dùng chung để 4 cửa đụng**.
5. **KHÔNG auto-fix lúc test** (test ≠ fix). Fix re-enter hàng đợi fix cho chu kỳ sau; re-test khi fix đã landed.

**DoD test (chống "làm thiếu" khi 4 cửa):** một test-task **CHỈ DONE** khi **MỌI fail nó tìm ra đã có fix-issue đầy đủ +
link 2 chiều**; còn fail chưa có fix-issue → **KHÔNG done**. **Integrator audit cuối:** không fail nào thiếu fix-issue,
không phân hệ/luồng nào bị bỏ sót.

### Case → xử lý (chế độ test)
| # | Trường hợp | Mức | Xử lý |
|---|---|---|---|
| T1 | 2 cửa cùng GHI 1 loại bản ghi trên prod → giẫm data | 🔴 | Mỗi cửa 1 module/domain riêng; data prefix dễ nhận (vd `ZZTEST_`); ưu tiên đọc |
| T2 | `manifest.js` regen đụng | 🔴 | Chỉ **INTEGRATOR** regen 1 lần cuối |
| T3 | **2 cửa tạo trùng fix-issue** cùng 1 bug | 🟡 | **DEDUP `gh issue list` TRƯỚC khi tạo**; trùng → comment, không tạo mới |
| T4 | **Thiếu bước fail→fix-issue** (decay khi 4 cửa) | 🔴 | **DoD gate**: fail chưa có fix-issue link 2 chiều = chưa DONE; integrator audit |
| T5 | Luồng prod **bắn side-effect thật** (HĐĐT/payment/BHXH/SMS/Zalo) | 🔴 | Mặc định **chỉ chụp read-only**; kích hành động thật CHỈ khi xác nhận mock-mode + **user duyệt từng luồng** |
| T6 | Sửa tay `data/*.js` đụng nhau | 🟡 | **READ-ONLY** lúc chạy; đổi plan qua workflow sinh-plan |
| T7 | **A — 4 cửa CHUNG 1 browser/profile** (cửa A điều hướng khi B đang chụp; lock `user-data-dir`) | 🔴 | Mỗi cửa **1 browser context + profile/`user-data-dir` RIÊNG** (Playwright: context riêng; chrome-devtools: `--remote-debugging-port` riêng/cửa). KHÔNG share 1 Chrome |
| T8 | **B — cùng `admin` + thiếu account role** (single-session đá nhau; PERM-001..012 cần DOCTOR/NURSE/CASHIER…) | 🔴 | Mỗi cửa **session/cookie-jar riêng** (profile riêng); **verify tồn tại account role** trên môi trường test; thiếu → đánh "blocked: cần seed account role", KHÔNG login admin rồi giả định role khác |
| T9 | **D — prod là mục tiêu DI ĐỘNG** (Vercel auto-deploy mỗi push; data prod drift) → ảnh không nhất quán, fail giả | 🟠 | **Đóng băng version** lúc test (không để máy nào push→deploy); ghi **commit-sha + thời điểm + data-context** vào evidence/issue; re-test cùng version/data |
| T10 | **E — PNG vào git** (ignore chỉ ở root) → repo bloat + push-race binary không merge | 🔴 | **Gitignore** ảnh evidence (local-only); viewer đọc local; chia sẻ qua artifact/storage (hoặc git-lfs nếu cần in-repo). `flows/`·`cross/` là folder chung → **integrator gom**, cửa khác không commit ảnh ở đó |
| T11 | **F — state không chụp tất định** (loading thoáng qua; error-500/empty khó ép trên prod read-only) | 🟠 | MCP **ép state** (network throttle/offline→loading; block route→error; filter→empty) khi được; prod read-only không ép được → đánh **"N/A: cần staging"** có lý do — KHÔNG fake, KHÔNG gap câm |
| T12 | **G — 4 browser MCP ăn RAM** trên 16GB | 🟠 | **Headless** + cap **2-3 browser đồng thời** (không 4); đóng page/snapshot sau mỗi capture |
| T13 | **H — nhiễu hạ tầng → bug giả** (Cloud Run cold-start/timeout/429/WAF chụp ra "error") | 🟠 | Phân biệt **infra vs app**: chỉ tạo bug-issue khi **tái hiện ≥2 lần** + xem network status/timing; retry trước khi kết luận |
| T14 | **I — MCP rớt giữa chừng** → evidence dở, gap câm | 🟡 | Item dở = **KHÔNG done**; integrator audit (mục DoD) bắt gap; capture lại |
| T15 | **N1 — Plan ≠ thực tế** (route/màn là GUESS `route_guess`) → MCP vào route đoán → **404 hàng loạt = fail giả + bug-issue sai** | 🔴 | **Cổng reconciliation TRƯỚC khi chụp**: verify từng route/màn với `App.tsx` thật → sửa plan (workflow sinh-plan) → mới chụp. KHÔNG chụp route đoán |
| T16 | **N2 — PHI nhạy cảm vào ảnh** (HIV/Lao/Pháp y/Tâm thần) = lưu dữ liệu sức khỏe được luật bảo vệ đặc biệt | 🔴 **P0** | **CHỈ data tổng hợp/giả** (staging); prod → **loại module nhạy cảm HOẶC mask PII**; ảnh đã gitignore + giữ trên D:, KHÔNG gửi ra ngoài |
| T17 | **N3 — Thiếu test-id → MCP giòn** (bám text/Antd-class) → flaky, fail giả | 🟠 | **Screenshot-first** cho state tĩnh (không cần selector); luồng tương tác → thêm `data-testid` vào `_v2kit` (task fix tiền đề) hoặc làm tay |
| T18 | **N4 — LLM tự hành GHI prod không giám sát** (người chỉ kèm 1-2 cửa) → lỡ xoá/submit/bắn side-effect trên bệnh viện LIVE | 🔴 | **Khoá BỘ CÔNG CỤ MCP của cửa prod về READ-ONLY** (navigate/snapshot/screenshot/đọc console-network); **CHẶN** click-submit/fill/upload/accept-dialog/`evaluate`/`run_code`; ghi chỉ ở staging bật rõ |
| T19 | **N5 — Hỏng sequence DÙNG CHUNG** (mã BN/số biên lai/số hàng đợi qua `ICodeGenerator`) → race counter trên prod thật | 🔴 | Read-only prod loại bỏ; ghi chỉ **staging** |
| T20 | **N6 — JWT hết hạn giữa run dài** (401=error giả) + **GitHub API rate-limit** (4 cửa+máy-2 spam `gh`) → claim/dedup im lặng fail | 🟠 | Re-auth check/cửa; **throttle `gh`** + batch; coi 401/429 là **infra** (như T13), KHÔNG tạo bug |
| T21 | **N7 — Cạn ĐĨA C:** (máy này C: gần đầy) — profile/cache/download/ảnh 4 browser default về C: | 🟠 | Trỏ `user-data-dir` + downloads + output evidence **sang D:** |
| T22 | **N8 — Done-metric (% evidence) GAMEABLE** (khớp tên↔slot) → % cao mà ảnh sai / thấp dù đã chụp = "done" giả | 🟠 | Integrator **validate tên-file theo schema + bind đúng slot** trước khi tin %; **% đơn lẻ KHÔNG phải DoD** |
| T23 | **N9 — Cửa test "tiện tay fix"** bug nó tìm → phá test-last + trộn scope + cửa test không có build-env | 🔴 | Cửa test **CHỈ log fix-issue, KHÔNG fix**; fix ở cửa fix-phase riêng (có build-env) |
| T24 | **N10 — Máy-2 push BE migration giữa test** → Cloud Run deploy → **prod SCHEMA đổi giữa run** | 🔴 | **Đóng băng cửa sổ deploy** lúc test (không push backend/migration); chốt qua GitHub board |
| T25 | **R1 — UTF-16 BOM nuốt data**: lỡ dùng **PowerShell ghi** `data/*.js`/evidence (default UTF-16 BOM) → hỏng file → viewer vỡ | 🔴 | Ghi data/text **chỉ bằng Edit/Write (UTF-8)** hoặc `-Encoding utf8`; CẤM `Set-Content` default |
| T26 | **R2 — `manifest.js` committed nhưng ảnh gitignore** → máy khác mở viewer = **vỡ ảnh** (manifest trỏ path local-only) | 🟠 | **Gitignore luôn `manifest.js`** (regen/máy) + untrack; chia sẻ ảnh+manifest qua artifact |
| T27 | **R3 — Flake animation/lazy-load** (Antd transition · recharts · Cornerstone DICOM) → screenshot giữa render = mờ/thiếu | 🟠 | MCP **wait-for-stable** (network-idle + element visible + delay) trước mỗi capture |
| T28 | **R4 — Viewport/DPI lệch giữa 4 cửa** → layout khác → reviewer tưởng vỡ | 🟡 | **Pin viewport** (vd 1920×1080) + DPI đồng nhất mọi cửa |
| T29 | **R5 — Data giả logic-nhất-quán là task LỚN** (seed bừa → flow fail vì data = fail giả) | 🟠 | **Seed-generator tôn trọng FK + business-state** (đưa vào kế hoạch staging, không freebie) |
| T30 | **R6 — Đốt quota** 4 cửa MCP screenshot+reason hàng giờ | 🟠 | Cửa **capture chạy Sonnet/Haiku** (§2b); batch; giảm số cửa khi cần |
| T31 | **R7 — DICOM/RIS + Telemedicine(Jitsi)** khó evidence read-only (cần ảnh DICOM/phiên video thật) | 🟡 | Đánh **"blocked: cần staging + data DICOM giả"**; không fake-done |
| T32 | **R8 — Integrator single-point-of-failure** (chết → manifest không regen + audit không chạy) | 🟡 | Fallback: **bất kỳ cửa nào regen được** + checklist audit commit sẵn |

### 7c. MÔI TRƯỜNG test theo LOẠI (giải mâu thuẫn read-only ⊥ E2E — góc C)
12 luồng là **data-consistency/E2E → bản chất phải GHI + kiểm soát data**. KHÔNG chọn 1 môi trường cho tất cả:
- **State per-màn TĨNH** (list · form · detail · validation · permission-view) → **PROD read-only NGAY** (an toàn, phủ phần lớn checklist 38 phân hệ).
- **12 luồng E2E + state ÉP (error/empty/loading) + module NHẠY CẢM (HIV/Lao/Pháp y/Tâm thần)** → cần GHI + kiểm soát data + KHÔNG đụng PHI thật → **STAGING (ĐÃ DUYỆT 2026-06-24)**: 1 Cloud SQL `HIS_staging` + 1 Cloud Run staging revision · **data giả LOGIC-NHẤT-QUÁN** (referential-integrity + business-state hợp lệ để flow chạy) · reset/seed được → **tái hiện** · ép được error/empty · **đóng băng version** (sửa T9/T24). Trước khi staging xong → flows + module nhạy cảm đánh **"blocked: cần staging"** — KHÔNG fake-done.
- **Prod write-sandbox** = phương án CHÓT (KHÔNG khuyến nghị) cho vài luồng **phi-tài-chính**, `ZZTEST_` + cleanup + tránh cổng tiền — đã có staging thì BỎ.
> Vì sao tách: static-only-mãi = **ảo giác phủ** (thiếu integration = làm THIẾU); prod-write = **bug giả do drift + PHI thật vào ảnh** (làm SAI + rò rỉ). Staging + data giả xoá cả hai.

## 8. BA TRỤ root-fix (khắc phục TRIỆT ĐỂ — giải 1 trụ tắt nhiều nguy)
Bảng case T1-T24 là *vá lẻ*; 3 trụ dưới mới là *gốc* — ưu tiên dựng:
1. **STAGING + DATA GIẢ logic-nhất-quán** (đã duyệt) → tắt **N2(PHI) · N5(sequence) · N10(schema) · F(ép state) · D(version)** cùng lúc. Đây là khắc phục triệt để nhất; prod-test chỉ là chắp vá.
2. **MCP allow-list READ-ONLY cho cửa prod** (không grant tool ghi: click-submit/fill/upload/`evaluate`/`run_code`) → tắt **N4(LLM rogue) · T5(side-effect)** ở tầng *kỹ thuật*, không dựa kỷ luật.
3. **Cổng reconciliation route/selector + screenshot-first** → tắt **N1(404 giả) · N3(giòn)** trước khi tốn công chụp.
> 2 rủi ro KHÔNG vá được bằng quy trình — **PHI thật vào ảnh (N2)** + **LLM tự hành ghi prod (N4)** — BẮT BUỘC giải bằng Trụ 1 + Trụ 2. Chưa có 2 trụ → chỉ chạy **read-only state tĩnh, loại module nhạy cảm, bỏ 12 luồng E2E**.

## 9. ⚠️ ĐỊNH VỊ LẠI (red-team vòng-4 — ĐỌC TRƯỚC KHI DÙNG §1-§8)
**Phát hiện 2026-06-24 (verify):** repo **ĐÃ CÓ ~127 test Playwright/Cypress** — `frontend/e2e/workflows/00-13` = **đúng 12 luồng E2E** · `frontend/e2e-prod/*` chạy **PROD read-only** · `e2e/clinical-safety-checks.spec.ts` **assert patient-safety rule thật** · CI `.github/workflows/e2e-prod-smoke.yml` tự chạy sau deploy trên **GitHub runner** (KHÔNG đụng 16GB local).
- **Correctness** → dùng/mở rộng **SUITE SẴN CÓ** (deterministic · CI · assert thật · KHÔNG collision 4-cửa). **KHÔNG dựng lại bằng 4-cửa-MCP thủ công.**
- **Evidence-screenshot (compliance/tender)** → sinh bằng **Playwright script** (headless · CI · auto-name), KHÔNG cần 4 cửa MCP người.
- **Mô hình 4-cửa-MCP (§1-§8) DEMOTE → chỉ OPTIONAL** cho phần Playwright không tới được. **Screenshot ≠ correctness (M2)**: "% evidence" KHÔNG phải "đã test".
- **Cảnh báo tầng-móng (red-team vòng-4):** M1 trùng-suite-sẵn-có · M2 false-confidence · M3 test-last ⊥ test-đẻ-fix (mâu thuẫn logic) · M4 phức-tạp-là-an-toàn tự-bại (32 case) · M5 người=SPOF · M6 "prod chưa bán" hết-hạn-ngầm · M7 doc≠enforce · M8 4-cửa-MCP chưa-verify (Playwright đã chạy thật) · M9 vài 🔴 cũ chưa verify/over-state · M10 priority-inversion (fix đang mở mới gate mọi thứ).
> **Hướng đúng:** ưu tiên **chạy/mở rộng suite Playwright sẵn có** (CI hoặc trên staging); 4-cửa-MCP là phụ. Trước khi đầu tư gì thêm → chốt **"test để LÀM GÌ"** (compliance vs correctness vs regression).

**Red-team vòng-5 (verify 2026-06-24 — HẠ tin-cậy "suite sẵn có = đủ" xuống THẤP):** suite có **hard-skip rot** (`'selector stale… route changed'`, `'No reception rows (seed failed'`, `'No inpatient rows'`) · **27 `test.skip`** phần lớn skip-if-no-data → **xanh-giả-do-skip** · **69 file trỏ localhost** (bulk cần backend, CI chỉ chạy subset prod) · Cypress baseUrl `3003`≠dev`3001` · workflow read-dominant → **seed-via-test CIRCULAR**.
- **NR1** suite rot → xanh giả · **NR2** skip-on-no-data trên staging → false-green · **NR3** seed phải CHUYÊN DỤNG (không "chạy test để seed") · **NR4** fresh-DB schema thiếu cột câm (runner ordinal+nuốt-lỗi) → validate data-layer, KHÔNG chỉ schema-drift · **NR5** sửa-suite = backlog fix ẩn · **NR6** *analysis-paralysis*: 5 vòng red-team rồi → **DỪNG lý thuyết, chạy 1 workflow thật để đo** (thực nghiệm bác/xác nhận).
- Quy tắc cứng: **SKIP ≠ PASS**; skip cao = seed/suite hỏng, KHÔNG báo "đã test". Khắc phục chi tiết → `../../docs/workspace-docs/20-backlog/staging-runbook.md` §3-§5.

**Vòng-6 — QUYẾT ĐỊNH: BỎ STAGING + TEST THẲNG PROD (2026-06-24, empirical):** prod = **no-real-data + đang xây** (deploy **1-3 lần/ngày**, **26 commit/3 ngày**) → staging cloud **THỪA** (PHI/pollution moot; schema prod chín > staging fresh). Đo thật `crud-25groups` (audit, **serial**) trên prod = **22/23 pass · 1 flaky (opd) · 0 API-err**; 4 nhóm empty-data → n/a (false-green).
- **VEHICLE ỔN = Playwright `mode:'serial'` / CI** — KHÔNG phải **4-cửa-MCP SONG SONG**. 4-cửa-parallel-write trên prod **BẤT ỔN** (data-confirmed): moving-target 1-3/ngày · **4-ghi-đồng-thời-1-DB** (test team dùng `serial` để né) · flaky sẵn 1/23 dù serial · selector rot. **Bỏ staging KHÔNG fix mấy cái này** (độc lập với prod-vs-staging).
- **🔴 TRIPWIRE GO-LIVE:** ngay khi có BN thật / pilot / bán → **DỪNG test-ghi-prod**, chuyển read-only hoặc dựng lại staging. + xác nhận gateway (HĐĐT/payment/BHXH/SMS) **mock** trước khi chạm.
- → **staging = DEPRIORITIZED** (`../../docs/workspace-docs/20-backlog/staging-plan.md`); test = **Playwright-serial/CI trên prod + tripwire**; 4-cửa-MCP-parallel-write **KHÔNG dùng**.
