# Docs Restructure Audit — HIS (2026-06-19)

> **Vai trò:** Senior Technical Documentation Architect — audit + plan tái cấu trúc `docs/`.
> **Trạng thái:** AUDIT + PLAN (READ-ONLY). **CHƯA di chuyển file nào** — chờ user duyệt Pending Decisions (mục 7).
> **Nguồn:** đọc trực tiếp cây `docs/` (1687 file) + grep inbound-refs `.claude/` + `CLAUDE.md` + code. Không suy đoán.

---

## 1. Executive Summary

- `docs/` hiện có **11 mục top-level** (1 README + 10 thư mục), **1687 file**. SoT-list yêu cầu chỉ **4 thư mục** (`ui-design`, `workspace-docs`, `architecture` {evidence, his-roadmap}, `requirements`).
- **96% file (1486/1687)** đã nằm trong 2 cây canonical `requirements/` (1029) + `ui-design/` (457) → **KEEP nguyên**, cấu trúc tốt.
- Lệch chuẩn = **6 thư mục top-level** ngoài SoT (`roadmap`, `setup`, `operations`, `dev-notes`, `features`, `images` = 50 file) + vài file misfile/stale.
- **3 xung đột lớn cần user quyết (mục 7):**
  1. 🔴 `docs/features/` bị SoT-list bỏ NHƯNG là **convention load-bearing** — 12 file tham chiếu (8 trong `.claude/` governance: skill `his-doc-feature`, `his-flow-nangcap-package`…). Xoá/move = vỡ governance.
  2. 🟠 `operations/` + `setup/` (8 file compliance/deploy thật, còn dùng) **không khớp** bucket nào trong 4 SoT → cần 1 home (đề xuất `architecture/operations/`).
  3. 🟠 `roadmap/` chứa **lẫn lộn**: 2 file requirement-analysis (giá trị cao, nên MOVE vào `requirements/`) + 3 file status/roadmap/tech-debt **đã stale** (bị GitHub Issues + `workspace-docs` thay) + 1 work-log cũ.
- **Khuyến nghị:** chỉ tạo **1 thư mục mới** (`architecture/operations/`) + tái dùng 2 nơi archive đã định nghĩa (`workspace-docs/90-archive/` theo SKILL-MAP 0a, `scripts/archive/` từ #199). Giữ `features/` làm **bucket nội dung thứ 5 hợp lệ** (rẻ hơn nhiều so với refactor 8 file governance).
- Tổng tác động: ~**18 file MOVE/ARCHIVE/DELETE** + cập nhật **~6 file index/governance link**. Bulk còn lại KEEP.

---

## 2. Current Documentation Audit (inventory)

| Top-level | #file | Loại | Mục đích | Đánh giá |
|---|---|---|---|---|
| `README.md` | 1 | Index | Mục lục docs cho dev mới | **Stale** (trỏ `roadmap/PROJECT_STATUS|ROADMAP|TECH_DEBT` sẽ archive) → cần REWRITE |
| `architecture/` | 146 | Canonical | Kiến trúc + evidence + his-roadmap + diagrams | **KEEP** (đúng SoT) |
| `requirements/` | 1029 | Canonical | Yêu cầu, tham chiếu MQSoft, biểu mẫu, phân tích đối thủ | **KEEP** (cấu trúc 00/10/20/30/90 tốt) |
| `ui-design/` | 457 | Canonical | design-system + design-system-v2 | **KEEP** (đúng SoT) |
| `workspace-docs/` | 16 | Canonical | session-state, assessment, backlog | **KEEP** — hook-critical (STATUS.md) |
| `roadmap/` | 6 | **Lệch** | status/roadmap/tech-debt + 2 phân tích nâng cấp + 1 work-log | **SPLIT** (MOVE 2 / ARCHIVE 4) |
| `features/` | 16 | **Lệch SoT / load-bearing** | nangcap23, nangcap24 (bộ 6 file) + 3 file lẻ | **KEEP có điều kiện** (mục 7-A) |
| `setup/` | 4 | **Lệch** | deploy GCP/Azure/docker, LIS-HL7Spy | **MOVE** → architecture/operations/ |
| `operations/` | 4 | **Lệch** | ACM, backup, incident-response, load-test | **MOVE** → architecture/operations/ |
| `dev-notes/` | 4 | **Lệch** | legacy/ dead SQL + README | **ARCHIVE→scripts/archive** (SQL, không phải doc) |
| `images/` | 4 | **Lệch** | 4 PNG screenshot | **MOVE** → assets (kiểm ref tương đối trước) |

### Chi tiết file lệch chuẩn (per-file)

| File | #dòng | Last | Nội dung thực |
|---|---|---|---|
| `roadmap/nangcap-phan-tich.md` | 2585 | 05-16 | Phân tích gap NangCap Mức 6 + EMR (gói thầu BV Y-Dược Huế) — **requirement analysis** |
| `roadmap/nangcap-doi-thu.md` | 699 | 05-16 | Phân tích 32 PDF đối thủ MQSoft/C+ — **competitor analysis** |
| `roadmap/PROJECT_STATUS.md` | 289 | 05-16 | Trạng thái triển khai phân hệ — **stale** (→ GitHub Issues + STATUS.md) |
| `roadmap/ROADMAP.md` | 263 | 05-16 | Việc tiếp theo Cao/Trung/Thấp — **stale** (→ GitHub Issues) |
| `roadmap/TECH_DEBT.md` | 264 | 05-16 | Tech-debt register — **dup** `workspace-docs/20-backlog/tech-debt-roadmap.md` + Issues #171-215 |
| `roadmap/implementation-summary.md` | 379 | 05-16 | Work-log OPD page (path `C:\Source\HIS\…`) — **stale work-log** |
| `features/nangcap23/` (6) | — | — | Bộ tài liệu chuẩn his-doc-feature — **KEEP** |
| `features/nangcap24/` (7) | — | — | Bộ tài liệu chuẩn + e2e-clinical-workflow — **KEEP** |
| `features/ris-pacs-2026.md` | 401 | 05-16 | Yêu cầu chức năng RIS-PACS — **requirement spec** (misfile) |
| `features/opd-code-examples.md` | 699 | 05-16 | Code mẫu OPD (path `C:\Source`) — **stale code-example** |
| `features/opd-visual-guide.md` | — | 05-16 | Visual guide OPD — **stale** |
| `operations/*` (4) | ~200 | 05-28 | ACM-2026-001 + backup + incident + load-test — **compliance/ops thật** |
| `setup/*` (4) | — | — | Deploy/setup guides — **ops reference thật** |
| `dev-notes/legacy/*` (3 SQL+1 README) | — | 05-28 | Dead SQL (đã bị Data/Scripts + Seeder thay) |
| `requirements/_docling_progress.log`, `_docling_report.json` | — | — | Artifact tool convert PDF — **không phải doc** |
| `workspace-docs/rule-compliance-audit.md` | — | — | **Misfile**: SKILL-MAP 0a quy định ở `10-assessment/` |

---

## 3. Duplicate & Conflict Report

| # | Vấn đề | Bản liên quan | Source of Truth | Xử lý bản còn lại |
|---|---|---|---|---|
| D1 | Trạng thái dự án | `roadmap/PROJECT_STATUS.md` ↔ `workspace-docs/STATUS.md` ↔ **GitHub Issues** | GitHub Issues (board chính từ 2026-06-13) + STATUS.md (session-state) | ARCHIVE `roadmap/PROJECT_STATUS.md` |
| D2 | Kế hoạch việc tiếp | `roadmap/ROADMAP.md` ↔ GitHub Issues | GitHub Issues | ARCHIVE `roadmap/ROADMAP.md` |
| D3 | Tech-debt register | `roadmap/TECH_DEBT.md` ↔ `workspace-docs/20-backlog/tech-debt-roadmap.md` ↔ Issues #171-215 | `tech-debt-roadmap.md` + Issues (per SKILL-MAP 0a) | ARCHIVE `roadmap/TECH_DEBT.md` |
| D4 | Phân tích đối thủ | `roadmap/nangcap-doi-thu.md` ↔ `requirements/90-phan-tich-doi-thu/` | `requirements/90-…/` | MOVE vào `requirements/90-…/` (giữ làm bản tổng hợp 32-PDF) |
| D5 | Phân tích nâng cấp | `roadmap/nangcap-phan-tich.md` ↔ `requirements/20-yeu-cau-nang-cap/` | `requirements/20-…/` | MOVE vào `requirements/20-…/` |
| D6 | Spec RIS-PACS | `features/ris-pacs-2026.md` (req spec) vs `features/` (doc-set feature) | `requirements/` | MOVE → `requirements/` (là spec, không phải doc-set) |
| C1 | **Conflict SoT vs governance** | SoT-list bỏ `features/` ↔ 8 file `.claude/` mandate `docs/features/<feature>/` | **Pending (mục 7-A)** | Đề xuất giữ `features/` |
| C2 | **Misfile convention** | `workspace-docs/rule-compliance-audit.md` (root) ↔ SKILL-MAP 0a nói `10-assessment/` | SKILL-MAP 0a | MOVE → `workspace-docs/10-assessment/` |
| C3 | Dead SQL trong docs | `dev-notes/legacy/*.sql` ↔ `scripts/archive/legacy-sql/` (#199) | `Data/Scripts` (live) | Gom SQL chết về `scripts/archive/` |
| C4 | Stale work-log/code | `roadmap/implementation-summary.md`, `features/opd-*` (path `C:\Source`) | Code thật trong repo | ARCHIVE |

---

## 4. Source Mapping Table

| Current Path | Action | New Path | Reason |
|---|---|---|---|
| `docs/architecture/**` | KEEP | — | Canonical SoT |
| `docs/requirements/**` | KEEP | — | Canonical SoT (cấu trúc tốt) |
| `docs/ui-design/**` | KEEP | — | Canonical SoT |
| `docs/workspace-docs/**` | KEEP | — | Canonical SoT (hook-critical) |
| `docs/features/nangcap23/`, `nangcap24/` | KEEP* | — | Convention load-bearing (mục 7-A); *nếu user giữ `features/` |
| `docs/roadmap/nangcap-phan-tich.md` | MOVE | `docs/requirements/20-yeu-cau-nang-cap/nangcap-phan-tich.md` | Là requirement gap-analysis |
| `docs/roadmap/nangcap-doi-thu.md` | MOVE | `docs/requirements/90-phan-tich-doi-thu/nangcap-doi-thu.md` | Là competitor analysis |
| `docs/features/ris-pacs-2026.md` | MOVE | `docs/requirements/ris-pacs-2026.md` | Là functional spec, không phải doc-set |
| `docs/setup/*` (4) | MOVE | `docs/architecture/operations/` | Deploy/setup = ops reference (system-level) |
| `docs/operations/*` (4) | MOVE | `docs/architecture/operations/` | Compliance/ops runbook (system-level) |
| `docs/roadmap/PROJECT_STATUS.md` | ARCHIVE | `docs/workspace-docs/90-archive/roadmap/PROJECT_STATUS.md` | Stale, thay bởi Issues+STATUS |
| `docs/roadmap/ROADMAP.md` | ARCHIVE | `docs/workspace-docs/90-archive/roadmap/ROADMAP.md` | Stale, thay bởi Issues |
| `docs/roadmap/TECH_DEBT.md` | ARCHIVE | `docs/workspace-docs/90-archive/roadmap/TECH_DEBT.md` | Dup tech-debt-roadmap.md+Issues |
| `docs/roadmap/implementation-summary.md` | ARCHIVE | `docs/workspace-docs/90-archive/handoffs/2026-05-16-opd-implementation.md` | Stale work-log |
| `docs/features/opd-code-examples.md` | ARCHIVE | `docs/workspace-docs/90-archive/2026-05-16-opd-code-examples.md` | Stale (path C:\Source) |
| `docs/features/opd-visual-guide.md` | ARCHIVE | `docs/workspace-docs/90-archive/2026-05-16-opd-visual-guide.md` | Stale |
| `docs/dev-notes/legacy/*.sql` (3) | ARCHIVE | `scripts/archive/legacy-sql/` | Dead SQL — gom với #199 |
| `docs/dev-notes/legacy/README.md` | MERGE | (vào `scripts/archive/README.md`) | Ghi chú nguồn-gốc dead SQL |
| `docs/images/*` (4) | MOVE | `docs/architecture/evidence/assets/` *(hoặc giữ nếu có ref tương đối)* | Asset chung; kiểm `images/` relative-ref trước |
| `docs/requirements/_docling_progress.log`, `_docling_report.json` | DELETE | — | Artifact tool, không phải doc (nên gitignore) |
| `docs/workspace-docs/rule-compliance-audit.md` | MOVE | `docs/workspace-docs/10-assessment/rule-compliance-audit.md` | Đúng convention SKILL-MAP 0a |
| `docs/README.md` | REWRITE | (giữ chỗ) | Index cũ trỏ file đã archive/move |

> Không có file "mồ côi": mọi file đã có action. Bulk `requirements/`+`ui-design/`+`architecture/`+`workspace-docs/` = KEEP.

---

## 5. Proposed Final Docs Tree

```
docs/
├── README.md                      # index — REWRITE
├── requirements/                  # KEEP (+ nhận 3 file MOVE)
│   ├── 00-san-pham-cua-ta/
│   ├── 10-tham-chieu-mqsoft/
│   ├── 20-yeu-cau-nang-cap/       # + nangcap-phan-tich.md
│   ├── 30-bieu-mau-nghiep-vu/
│   ├── 90-phan-tich-doi-thu/      # + nangcap-doi-thu.md
│   └── ris-pacs-2026.md           # (MOVE từ features/)
├── ui-design/                     # KEEP
│   ├── design-system/
│   └── design-system-v2/
├── architecture/                  # KEEP (+ 1 subdir mới)
│   ├── ARCHITECTURE.md · PROJECT_STRUCTURE.md · MODULE_MAP.md · API_FLOW.md
│   ├── business-logic-complete.md · data-flow.md · codebase-map.md
│   ├── diagrams/ · evidence/ · his-roadmap/
│   └── operations/                # ★ MỚI: gom setup/ + operations/ (8 file)
├── features/                      # KEEP (load-bearing — mục 7-A); bỏ 3 file lẻ
│   ├── nangcap23/
│   └── nangcap24/
└── workspace-docs/                # KEEP (hook-critical)
    ├── STATUS.md · luong_nghiep_vu.md · security-secret-rotation-runbook-182.md
    ├── 10-assessment/             # + rule-compliance-audit.md (MOVE từ root)
    ├── 20-backlog/
    └── 90-archive/                # ★ MỚI (đã định nghĩa SKILL-MAP 0a): roadmap/ stale + work-log cũ
```

**Loại bỏ top-level:** `roadmap/`, `setup/`, `operations/`, `dev-notes/`, `images/` (11 → 6 mục).
**Thư mục mới (có justification):** `architecture/operations/` (home cho 8 file ops/deploy không có bucket SoT) + `workspace-docs/90-archive/` (convention đã định, chứa stale). Không tạo thư mục "phân loại theo ý thích".

---

## 6. Migration Checklist

### Phase 1 — Audit ✅ (xong, file này)
- [x] Kiểm kê 1687 file (mục 2)
- [x] Xác định duplicate/conflict (mục 3)
- [x] Xác định Source of Truth + inbound-refs (blast-radius mục 7)

### Phase 2 — Restructure (CHỜ DUYỆT — chưa chạy)
- [ ] **0. Quyết Pending Decisions (mục 7) trước khi đụng file.**
- [ ] 1. `git mv` 3 file requirement: nangcap-phan-tich → `requirements/20-…/`, nangcap-doi-thu → `requirements/90-…/`, ris-pacs-2026 → `requirements/`
- [ ] 2. `mkdir architecture/operations/` + `git mv` 4 `setup/` + 4 `operations/` vào
- [ ] 3. `mkdir workspace-docs/90-archive/` + `git mv` 4 file roadmap stale + 2 file opd-* + implementation-summary
- [ ] 4. `git mv` 3 SQL `dev-notes/legacy/` → `scripts/archive/legacy-sql/`; gộp note vào `scripts/archive/README.md`; xoá `dev-notes/`
- [ ] 5. `git mv workspace-docs/rule-compliance-audit.md` → `10-assessment/`
- [ ] 6. Xử lý `images/` (sau khi check ref tương đối) + `git rm` 2 artifact `_docling_*`
- [ ] 7. **Cập nhật inbound links** (6 file): `docs/README.md` (rewrite), `architecture/PROJECT_STRUCTURE.md`, `requirements/20-…/README.md`, + nếu giữ features-rename thì 8 file `.claude/` (chỉ khi user chọn 7-A option B)

### Phase 3 — Validation
- [ ] `grep -rn "docs/roadmap\|docs/setup\|docs/operations\|docs/dev-notes\|docs/images"` = 0 ref ngoài bản đã sửa
- [ ] Check link nội bộ docs gãy (relative path) — đặc biệt `images/`, README index
- [ ] Xác nhận hook đọc `workspace-docs/STATUS.md` KHÔNG bị động (đã giữ nguyên path)
- [ ] Xác nhận viewer `evidence/index.html` + `his-roadmap/index.html` KHÔNG bị động (KHÔNG move)
- [ ] `bash .claude/lint.sh` OK (nếu chạm governance) + git status sạch đúng diff dự kiến

---

## 7. Risks & Pending Decisions

### 🔴 Pending Decision A — số phận `docs/features/` (BẮT BUỘC quyết trước Phase 2)
SoT-list của bạn **bỏ** `features/`, nhưng nó là **convention load-bearing**: 12 file ref, 8 trong `.claude/` governance (skill `his-doc-feature` tồn tại 100% vì nó; `his-flow-nangcap-package`, `his-fe-webauthn-biometric`, `skill-routes/ops-doc.md`+`_reference.md`, `workflow/ai-memory.md`, `PROMPT-TEMPLATES.md`, `SKILL-MAP.md` 0a, `PROJECT_STRUCTURE.md` §4).
- **Option A (khuyến nghị):** GIỮ `features/` như bucket nội dung thứ-5 hợp lệ (ngoại lệ có chứng minh). Rẻ, 0 vỡ governance. Chỉ dọn 3 file lẻ trong đó (move/archive).
- **Option B:** Ép về 5-bucket → relocate `features/` vào `requirements/features/` hoặc `architecture/features/` + **sửa 8 file `.claude/`** + rename skill convention. Tốn công, rủi ro vỡ skill, lợi ích thẩm mỹ thấp.

### 🟠 Pending Decision B — home cho `operations/` + `setup/`
Không khớp bucket nào trong 4 SoT. Đề xuất **`architecture/operations/`** (1 thư mục mới, system-level). Phương án khác: nhét phẳng vào `architecture/` (clutter 8 file cạnh 7 file lẻ) — không khuyến nghị. Cần bạn duyệt việc tạo `architecture/operations/`.

### 🟠 Pending Decision C — ARCHIVE vs DELETE các file stale
`roadmap/PROJECT_STATUS|ROADMAP|TECH_DEBT`, `implementation-summary`, `opd-*`: tôi đề xuất **ARCHIVE** (`workspace-docs/90-archive/`, giữ lịch sử) thay vì DELETE. Nếu bạn muốn gọn tuyệt đối → DELETE (git history vẫn giữ). Bạn chọn.

### ⚠️ Risks kỹ thuật khi thực thi (Phase 2)
- **R1 — link gãy:** mọi MOVE phải kèm cập nhật inbound link (mục 6 bước 7). Bỏ sót → link 404 trong docs.
- **R2 — `images/` relative-ref:** 0 ref literal `docs/images`, nhưng md có thể dùng `../images/x.png`/`./images/x.png`. **Phải grep relative trước khi move** kẻo vỡ ảnh nhúng.
- **R3 — KHÔNG move:** `workspace-docs/STATUS.md` (17 ref `.claude/` + 4 hook), `evidence/` & `his-roadmap/` (viewer index.html dùng asset path tương đối, move = vỡ viewer), `luong_nghiep_vu.md` (CLAUDE.md chốt giữ ở workspace-docs root).
- **R4 — governance lint:** nếu chọn Option B (sửa `.claude/`) → BẮT BUỘC `bash .claude/lint.sh` OK + tra REGISTRY (rule sửa-1-nơi).
- **R5 — line-ending (autocrlf):** repo CRLF — dùng `git mv` (giữ nguyên nội dung) + Edit-tool cho sửa link, KHÔNG `git add -A` mù (tránh churn file ngoài scope, đã gặp ở #199).

> **Không thực thi gì cho tới khi A/B/C được duyệt.** Sau duyệt, Phase 2 ~18 file move + 6 file link = 1 commit atomic (xin phép push riêng).
