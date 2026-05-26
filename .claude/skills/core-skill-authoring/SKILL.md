---
name: core-skill-authoring
description: Use this skill (portable, tech-agnostic) when creating, editing, reviewing, or auditing a Claude Code skill (a `.claude/skills/<name>/SKILL.md`). Triggers include "tạo skill mới", "sửa/chuẩn hoá skill", "review skill có đúng chuẩn không", deciding a skill's frontmatter/description/body, or applying progressive disclosure. Enforces the official Agent Skills spec (frontmatter `name` + `description` + optional `metadata`/`allowed-tools`), trigger-rich descriptions, concise bodies, and the project naming-token rules. Do NOT use for ordinary feature/code tasks (route via SKILL-MAP), nor for prose docs (his-doc-feature).
metadata:
  type: project
---

# Core — Skill Authoring (portable)

> TẦNG: **A · CORE** (governance, tech-agnostic). Skill để viết/chuẩn hoá các skill khác.

## Purpose
Chuẩn hoá cách viết một skill sao cho Claude **kích hoạt đúng lúc** và **dùng hiệu quả**. Nguồn chân lý
về format frontmatter chính thức + cách viết `description` + cấu trúc body + progressive disclosure +
quy tắc đặt tên. Áp cho mọi dự án dùng Claude Code skills.

## Khi nào dùng
- Tạo skill mới (sau khi đã qua cổng quyết định "đáng tái dùng" ở SKILL-MAP mục (6)).
- Sửa/chuẩn hoá/review một skill có sẵn cho đúng chuẩn.
- Audit cả bộ skill (frontmatter, description, body, references).

## Khi nào KHÔNG dùng
- Task feature/code thường → định tuyến qua `SKILL-MAP.md` sang `core-*`/`his-*` phù hợp.
- Viết tài liệu phân hệ (prose) → `his-doc-feature`.

## Frontmatter chuẩn (Agent Skills spec — BẮT BUỘC)
Chỉ các key sau được spec công nhận. Mọi field tự định nghĩa phải nằm trong `metadata:`.

```yaml
---
name: <kebab-case>          # BẮT BUỘC. PHẢI trùng tên thư mục. lowercase + số + gạch nối. ≤ 64 ký tự.
description: <1 đoạn>        # BẮT BUỘC. ≤ 1024 ký tự. Ngôi thứ 3. WHAT + WHEN + Do NOT.
metadata:                   # TÙY CHỌN. Nơi duy nhất cho field tự định nghĩa (vd type).
  type: project
allowed-tools: Read, Grep   # TÙY CHỌN. Giới hạn tool skill được dùng (thường bỏ trống với skill guidance).
---
```
KHÔNG đặt key lạ (vd `type:`) ở cấp cao nhất — loader bỏ qua nhưng SAI chuẩn.

## Viết `description` (yếu tố quan trọng NHẤT — quyết định kích hoạt)
`description` là thứ DUY NHẤT được nạp tới khi skill được chọn → phải đủ tín hiệu để Claude match.
Công thức: **WHAT nó làm · WHEN dùng (trigger cụ thể) · WHEN KHÔNG dùng (route sang skill khác).**
- Ngôi thứ 3 ("Use this skill when…"), không "I/you".
- Nhồi **trigger cụ thể**: tên file/path, tên hàm/class, từ khoá tiếng Việt + Anh người dùng hay gõ.
- Luôn có mệnh đề `Do NOT use for … (skill-khác)` để chống chồng lấn.
- Cụ thể > chung chung. ❌ "Helps with backend." ✅ "Use when adding a service/controller… đăng ký DI…".

## Body template chuẩn (SKILL.md — giữ GỌN, < ~150 dòng)
Body là phần "HOW", nạp khi skill kích hoạt. Theo khung nhất quán:

```markdown
# <Tiêu đề ngắn>

<1–2 câu mục đích.>

## Khi nào dùng
- <bullet ngắn, tình huống cụ thể>

## Khi nào KHÔNG dùng
- <route sang skill anh em + lý do>

## <Phần lõi: Quy trình chuẩn / Kiến trúc / Vị trí code mẫu / Pattern>
<các bước đánh số, path thật, snippet ngắn. Template/đoạn dài → references/.>

## Pitfalls
- <lỗi đã dính thật, cách tránh>

## Reference
- `references/<file>` — <mô tả>   (nếu có template/script)

## When to update
- <khi nào sửa lại skill này>
```

## Progressive disclosure (giữ SKILL.md nhẹ)
- Template code, script, cheat-sheet dài → tách ra `references/*.ext` hoặc `scripts/*.ext`, **link** bằng
  đường dẫn tương đối; Claude tự đọc khi cần.
- SKILL.md chỉ giữ chỉ dẫn + trỏ tới reference. KHÔNG dán nguyên file 200 dòng vào body.

## Quy tắc đặt tên (theo SKILL-MAP mục (0))
- `core-*`: portable/tech-agnostic, **KHÔNG** token tầng → `core-<tên>`.
- `his-*`: riêng dự án, **bắt buộc token tầng** ngay sau `his-`: `his-<fe|be|db|fs|ops|test|qa|doc|flow>-<tên>`.
- Token mới (ngoài bảng (0)) chỉ thêm khi có nhóm task thật sự mới, kèm cập nhật bảng.

## Tạo mới hay mở rộng? (cổng quyết định — SKILL-MAP mục (6))
1. Có skill gần đúng → **mở rộng** nó (đúng `core-reusable-code`), đừng tạo mới.
2. Task **tái dùng nhiều lần** → mới đáng tạo skill (hỏi user duyệt) → tạo theo template này → cập nhật
   SKILL-MAP (1a)/(1b) + (2) + (4).
3. Task one-off → KHÔNG tạo skill; làm trực tiếp.

## Checklist trước khi commit skill
- [ ] `name` trùng tên thư mục, kebab-case, ≤ 64 ký tự.
- [ ] `description` ≤ 1024 ký tự, ngôi thứ 3, có trigger cụ thể + `Do NOT use`.
- [ ] Field tự định nghĩa nằm trong `metadata:` (không top-level lạ).
- [ ] Body có `Khi nào dùng` + `Khi nào KHÔNG dùng` + kết bằng `When to update`.
- [ ] Template/đoạn dài đã tách `references/`, link bằng path tương đối.
- [ ] Đã cập nhật `SKILL-MAP.md` (1a/1b + 2 + 4) nếu là skill mới.

## Reference
- `references/skill-template.md` — khung SKILL.md copy-paste sẵn.

## When to update
- Khi spec Agent Skills đổi (key frontmatter mới), hoặc quy ước body/đặt tên của dự án thay đổi.
