---
name: his-feature-docs
description: Use this skill when writing the feature documentation set under `docs/features/<feature>/` for a HIS module/package (e.g. NangCapNN). Triggers include "viết tài liệu cho [feature]", "tạo bộ tài liệu kiểm thử", documenting a new phân hệ with README + analysis + test-plan + test-guide + workflow-test + summary. Do NOT use for code generation or for skills (skills live in .claude/skills, never docs).
type: project
---

# HIS Feature Documentation Set

Skill chuẩn hoá cách viết bộ tài liệu cho 1 phân hệ/gói nâng cấp HIS, đặt tại `docs/features/<feature>/` (convention `docs/PROJECT_STRUCTURE.md` §4). Mẫu chuẩn: `docs/features/nangcap23/` và `docs/features/nangcap24/` — 6 file.

## Khi nào dùng

- Viết tài liệu cho gói NangCapNN mới (sau khi code xong).
- Viết tài liệu kiểm thử (test-plan / test-guide / workflow-test) cho 1 phân hệ.
- Bổ sung/đồng bộ tài liệu khi feature thay đổi.

## Khi nào KHÔNG dùng

- Sinh code → dùng skill scaffold/page tương ứng.
- Tạo skill → skill nằm trong `.claude/skills/`, **KHÔNG bao giờ** trong `docs/`.

## Bộ 6 file chuẩn (`docs/features/<feature>/`)

| File | Vai trò | Đối tượng |
|---|---|---|
| `README.md` | Overview + bảng gap/feature + architecture + config + known risks + commit ref | Tech lead, Dev |
| `analysis.md` | Phân tích source code per-layer (entity/DTO/service/controller/validation/business logic/risks) | Dev review, Audit |
| `test-plan.md` | Test plan per-chức-năng: mô tả nghiệp vụ + API + test case (mã TC) + expected + edge + regression; flow smoke→E2E; checklist release | QA lead, QA |
| `test-guide.md` | QA checklist UI/manual: màn hình cần test, business flow, validation, permission, regression, commands | QA team |
| `workflow-test.md` | Workflow + dependency map + UI matrix + critical risk + role-based access matrix + regression priority | QA + Dev |
| `summary.md` | Index cross-doc + mapping chức năng↔API↔test↔file + module impact ranking + so sánh gói trước + outstanding | Tech lead, PO |

→ Outline + heading chuẩn từng file: `references/doc-set-outline.md`.

## Quy trình chuẩn

### Bước 1 — Đọc SOURCE THẬT trước khi viết (không suy đoán)
- Entities/DTOs/Service/Controller/Migration của feature.
- Route (`App.tsx`) + menu (`TerminalLayout.tsx`).
- Test files đã có.
- CLAUDE.md work-log của feature (commit, deploy revision, pitfalls).

### Bước 2 — Tạo thư mục + 6 file
`docs/features/<feature>/` (tên kebab-case, vd `nangcap25`). Mỗi file theo outline.
KHÔNG tạo thư mục lạ — đúng convention `docs/features/<feature>/`.

### Bước 3 — Phản ánh ĐẶC THÙ feature (không copy máy móc)
Nêu rõ điểm khác biệt thật (vd NangCap24: status string thay int; KHÔNG có exception filter → lỗi 500; biometric MVP chưa verify; bug FK dùng chung) — đây là phần giá trị nhất, không bê nguyên từ feature khác.

### Bước 4 — Link chéo + commit reference
Mỗi file có block "Tài liệu liên quan" link 5 file còn lại + section commit/release.

## Patterns & Conventions

- **Ngôn ngữ**: tiếng Việt (khớp nangcap23/24); thuật ngữ kỹ thuật giữ tiếng Anh.
- **Bảng nhiều**: dùng bảng cho mapping/test-case/role-matrix (dễ tra).
- **Test case mã hoá**: `TC-<MODULE>-NNN` + cột Case/Body/Expected.
- **Không trùng lặp**: README=overview, analysis=source, test-plan=case, test-guide=checklist UI, workflow-test=dependency+role, summary=index. Mỗi file 1 góc nhìn.
- **Trung thực**: nếu là MVP/placeholder/known-risk → ghi rõ (đừng tô hồng). Có section "Known risks"/"Nguy cơ tiềm ẩn".

## Pitfalls

- **Suy đoán nghiệp vụ**: phải đọc code thật. Field name HIS hay lệch convention (Medicine=`MedicineCode/MedicineName`; ServiceRequest→MedicalRecord→Patient; Admission Status=0 là "Đang điều trị").
- **Copy nguyên từ feature khác** mà không sửa đặc thù → tài liệu sai.
- **Đặt file kiểu skill vào docs**: docs CHỈ là tài liệu — skill nằm `.claude/skills/`.
- **`cat CLAUDE.md` toàn bộ**: file ~5000 dòng → chỉ trích phần work-log của feature.

## Reference

- `references/doc-set-outline.md` — heading/outline chi tiết 6 file (copy làm khung)

## When to update this skill

- Khi convention `docs/features/<feature>/` đổi (thêm/bớt file chuẩn).
- Khi mẫu nangcap23/24 được cải tiến cấu trúc.
