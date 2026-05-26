# Skill Map — HIS (router mỏng)

Bản đồ ROUTER: chọn skill nào cho yêu cầu. **Mô tả đầy đủ từng skill đã được Claude tự nạp qua
`description`** (danh sách available skills) → map này KHÔNG lặp lại mô tả, chỉ giữ **routing + governance**.

**Cách dùng (2 bước, tiết kiệm token):**
1. Đọc file này (governance + index + dispatch).
2. Theo dispatch (2) → đọc **đúng 1 map con** trong `.claude/skill-routes/` cho tầng của task. Chỉ mở
   `skill-routes/_reference.md` khi cần playbook end-to-end / dependency map đầy đủ.

Cấu trúc **2 cấp**: **A · CORE** (`core-*`, portable, tech-agnostic) và **B · PROJECT/HIS** (`his-*`, bám stack).
Skill nằm ở `.claude/skills/` (nạp phẳng). Tài liệu ở `docs/` (KHÔNG phải skill).

---

## (0) Quy tắc đặt tên skill (BẮT BUỘC — không hỏi, không tự bịa)

Mọi skill `his-*` phải có **token tầng** ngay sau `his-`: `his-<token>-<tên-mô-tả>` (lowercase-kebab).
Tạo skill mới **chọn token theo bảng — KHÔNG hỏi lại, KHÔNG đặt tên tự do**.

| Token | Tầng | Dùng cho |
|---|---|---|
| `fe` | Frontend | page/component React, api client, UI Antd, viewer, biểu mẫu in, portal |
| `be` | Backend | service/controller/entity, cổng ngoài, payment, logic trigger worker |
| `db` | Database | bảng SQL Server, migration, seed |
| `fs` | Fullstack (FE+BE) | tính năng xuyên 2 tầng không tách được (vd SignalR realtime) |
| `ops` | DevOps | deploy, CI/CD, hạ tầng prod |
| `test` | Testing | test runner cụ thể (Cypress/Playwright/PowerShell API) |
| `qa` | Quality/guardrail | anti-pattern, convention, an toàn, patient-safety |
| `doc` | Tài liệu | bộ tài liệu feature |
| `flow` | Điều phối | playbook chuỗi nhiều skill (vd gói NangCapNN) |

Quy tắc:
- `core-*` (portable, tech-agnostic) **KHÔNG** mang token tầng — giữ nguyên `core-<tên>`.
- Skill xuyên tầng → `fs`; nếu phần lớn thuộc 1 tầng thì gán theo tầng trội (vd payment chủ yếu BE → `be`).
- Token mới (ngoài bảng) **chỉ** thêm khi xuất hiện nhóm task thật sự mới, kèm cập nhật bảng này.
- Tên lowercase-kebab; **`name:` frontmatter PHẢI trùng tên thư mục** (xác minh khớp sau khi tạo/đổi tên).
- **Frontmatter chuẩn (Agent Skills spec):** chỉ `name` + `description` (bắt buộc) + tùy chọn
  `metadata` / `allowed-tools`. Field tự định nghĩa (vd `type: project`) PHẢI nằm trong `metadata:`,
  KHÔNG đặt ở cấp cao nhất. `description` ≤ 1024 ký tự, ngôi thứ 3, giàu trigger + `Do NOT use`.
  Chi tiết cách viết frontmatter/description/body + template → skill **`core-skill-authoring`**.

---

## (1) Index skill (tên + tầng) — "chọn khi" của HIS xem map con

### NHÓM A · CORE (`core-*`) — áp đầu mọi chuỗi, KHÔNG token tầng

| Sub-tier | Skill | Chọn khi yêu cầu liên quan |
|---|---|---|
| A0 governance | `core-skill-authoring` | tạo/sửa/review skill `.claude/skills/*/SKILL.md` |
| A-discipline (pre-flight) | `core-requirement-clarify` | hiểu đúng yêu cầu; STOP-and-ask vs proceed (đầu MỌI task) |
| | `core-verify-before-assert` | chống ảo tưởng; verify file/symbol/endpoint/field trước khi khẳng định |
| | `core-impact-analysis` | bản đồ tác động (callers/contract/test/migration) trước khi sửa code dùng chung |
| | `core-minimal-change` | YAGNI; thay đổi nhỏ nhất đúng, không over-engineer, không sửa ngoài scope |
| A1 arch/reuse | `core-architecture-follow` | code chạm nhiều layer |
| | `core-reusable-code` | **mọi** lần tạo file/abstraction (reuse trước khi tạo) |
| | `core-architecture-consistency` | thêm feature theo tiền lệ |
| | `core-refactor` | "refactor / clean up / tách" giữ behavior |
| A2 cross-cutting | `core-types-contract` | định nghĩa API contract / signature |
| | `core-validation-pattern` | validate form/payload (FE+BE consistency) |
| | `core-error-loading-state` | UI có fetch/submit (loading/empty/error/success) |
| | `core-localization-pattern` | thêm text hiển thị / đa ngôn ngữ |
| A3 testing | `core-testing-architecture` | chọn level unit/integration/e2e/contract |
| | `core-testing-reuse` | reuse helper/fixture/mock + regression |

### NHÓM B · HIS (`his-*`) — index theo tầng, chi tiết "chọn khi" + chuỗi prompt ở map con

| Tầng | Skill | Map con (đọc khi task thuộc tầng) |
|---|---|---|
| FE | `his-fe-page-v2`, `his-fe-api-client`, `his-fe-antd-v6`, `his-fe-webauthn-biometric`, `his-fe-standalone-portal`, `his-fe-dicom-viewer`, `his-fe-emr-print-form`, `his-fs-realtime-signalr` | `skill-routes/fe.md` |
| BE/DB | `his-be-module-scaffold`, `his-db-migration`, `his-be-payment-gateway`, `his-be-external-gateway`, `his-be-background-worker` | `skill-routes/be.md` |
| TEST | `his-test-api-powershell`, `his-test-e2e` | `skill-routes/test.md` |
| OPS/DOC | `his-ops-deploy`, `his-doc-feature` | `skill-routes/ops-doc.md` |
| Điều phối / Guardrail | `his-flow-nangcap-package` (gói NangCapNN), `his-qa-anti-pattern` (kèm **mọi** code-gen) | xem (2) dưới |

---

## (2) Dispatch — task thuộc tầng nào → đọc map con đó

| Loại task (prompt) | Đọc thêm map con | Ghi chú |
|---|---|---|
| page v2 · api client · antd v1 · vân tay/WebAuthn · cổng login riêng · DICOM viewer · biểu mẫu in · realtime/SignalR | `skill-routes/fe.md` | chuỗi skill + path nằm trong file |
| phân hệ backend · tạo/sửa/seed bảng · thanh toán/QR · cổng QG/BHXH/Zalo/SMS/FHIR · worker nền | `skill-routes/be.md` | |
| test UI/E2E · test API backend | `skill-routes/test.md` | |
| deploy prod · viết tài liệu phân hệ | `skill-routes/ops-doc.md` | |
| làm **cả gói** NangCapNN / đối chiếu PDF gói thầu | (không cần map con) `his-flow-nangcap-package` điều phối → chain theo gap (đọc `_reference.md` cho playbook) | PDF `docs/requirements/`, `NangCap_PhanTich.md` |

**Chuỗi cross-cutting (giữ tại đây — không thuộc 1 tầng):**

| Khi developer prompt | Skills (đúng thứ tự) |
|---|---|
| "thêm validate / form [X]" | `core-validation-pattern` → `core-types-contract` → (`his-fe-page-v2`/`his-be-module-scaffold`) |
| "refactor [X]" | `core-refactor` → `core-architecture-consistency` → `his-qa-anti-pattern` |
| "tạo / sửa / chuẩn hoá / review skill [X]" | `core-reusable-code` (mở rộng trước khi tạo) → `core-skill-authoring` |
| **PRE-FLIGHT — MỌI task code (chạy TRƯỚC khi viết)** | `core-requirement-clarify` (mơ hồ → hỏi gộp; rõ → ghi giả định) → `core-verify-before-assert` (verify, KHÔNG bịa file/symbol/field) → `core-impact-analysis` (bản đồ tác động nếu sửa code dùng chung) → viết theo `core-minimal-change` |
| **BẤT KỲ code-gen** | luôn kèm `core-reusable-code` + `his-qa-anti-pattern`; **core-* trước → his-* sau** |

---

## (5) Conflict resolution

| Tình huống | Quy tắc |
|---|---|
| Page v1 (Antd) vs v2 (`_v2kit`) | v1 → `his-fe-antd-v6`; v2 → `his-fe-page-v2`. Mặc định feature mới = v2. KHÔNG trộn. |
| Test BE vs E2E | API BE → `his-test-api-powershell`; UI/route/flow → `his-test-e2e`. |
| Migration EF vs SQL script | Luôn SQL script tay (`his-db-migration`) — dự án IGNORE pending model changes. |
| core (portable) vs his (cụ thể) | Nguyên tắc chung ở `core-*`; `his-*` chỉ thêm phần stack-specific + nhắc lại phần liên quan. |
| Trùng "không hardcode / không quên DI" | Nguồn chân lý chung: `his-qa-anti-pattern` (+ `core-*`). |

---

## (6) ★ FALLBACK — khi KHÔNG có skill phù hợp

Nếu yêu cầu **không khớp** skill nào ở (1)/(2): **KHÔNG vội tạo skill mới.** Skill chỉ đáng tạo khi
**tái sử dụng được nhiều lần** — nếu không sẽ phình "skill rác". Chỉ được đề xuất skill và cách xử lý dựa trên tech stack, thư viện, framework, naming convention, và workflow đã có trong hệ thống. Chỉ tạo skill mới khi bài toán thực sự khác biệt, không thể gộp hợp lý vào skill hiện có, có khả năng tái sử dụng cho nhiều task trong tương lai.
Khi đánh giá, cần cân nhắc: mục đích sử dụng, workflow, input/output, domain, pattern xử lý, mức độ trùng lặp logic với skill cũ. Chạy quyết định theo thứ tự:

**Bước 1 — Mở rộng skill cũ được không?**
Có skill đã *gần đúng* → **cập nhật/mở rộng skill đó** (thêm case vào SKILL.md / reference) thay vì tạo mới.
Ưu tiên reuse (đúng `core-reusable-code`). Cập nhật xong → chỉnh lại index (1) / dispatch (2) / map con / `_reference.md` nếu cần.

**Bước 2 — Yêu cầu có TÁI SỬ DỤNG NHIỀU LẦN không?** (cổng quyết định)
Tự hỏi: pattern/loại task này còn lặp lại ở các lần sau không?
- **CÓ (đáng đóng gói)** → đề xuất **tạo skill mới**: tên **theo (0) Quy tắc đặt tên** (token tầng đúng,
  KHÔNG hỏi/bịa) · **tầng** (`core-*` nếu portable cho dự án khác / `his-<token>-*` nếu riêng HIS) ·
  mục đích · trigger · dependency (`his→core`).
  **Hỏi user duyệt** → tạo theo skill **`core-skill-authoring`** (frontmatter chuẩn `name`+`description`+
  `metadata.type`, progressive disclosure) → **bổ sung vào index (1) + dispatch (2) + map con + `_reference.md`** → tái dùng lần sau.
- **KHÔNG (one-off, không lặp lại)** → **ĐỪNG tạo skill.** Làm trực tiếp task đó bằng các `core-*` +
  cách chung, và **nói rõ**: "task một lần, không cần skill mới".

**Luôn ưu tiên:** reuse > expand > merge > create new.
KHÔNG tự "làm bừa" sai convention; KHÔNG nhét đại vào skill sai mục đích.

> Skill chỉ sinh ra khi **đáng tái dùng nhiều lần** (hoặc mở rộng skill cũ) → SKILL-MAP lớn dần đúng,
> không phình skill dùng-một-lần.

---

## (7) Split plan — chống phình token (đã áp dụng + cách mở rộng tiếp)

**Đã tách (progressive disclosure cho chính map):** file này chỉ giữ governance + index + dispatch.
Chi tiết "chọn khi" + chuỗi prompt + path đã chuyển sang map con theo tầng; playbook + dependency map ở `_reference.md`.
- `skill-routes/fe.md` · `be.md` · `test.md` · `ops-doc.md` — chuỗi prompt + path theo tầng.
- `skill-routes/_reference.md` — (3) playbook end-to-end + (4) dependency map đầy đủ + ghi chú vị trí.

**Ngưỡng tách tiếp:** khi 1 map con vượt **~250 dòng** → tách map con đó theo nhóm hẹp hơn
(vd `be.md` → `be-core.md` + `be-gateway.md`), thêm 1 dòng dispatch ở (2). KHÔNG để 1 file routing > ~300 dòng.
**Quy tắc vàng khi tách:** chỉ *di chuyển* nội dung (không xoá yêu cầu), mỗi file mới có header
`> đọc CÙNG SKILL-MAP.md`, và (2) phải trỏ tới file mới. File này luôn là điểm vào duy nhất phải đọc đầu tiên.
