# Skill-routes · TẦNG FE (Frontend)

> Map con — đọc **CÙNG** `.claude/SKILL-MAP.md`. Nguyên tắc CORE (chọn khi) xem (1a) trong SKILL-MAP.
> Mọi chuỗi: **core-* trước → his-* sau**. Mọi code-gen KÈM `core-reusable-code` + `core-clean-code` + `his-qa-anti-pattern`.

> ★ **`his-fe-convention` áp KÈM MỌI task FE** (generate/refactor/review): naming · tách layer ·
> folder · shared component config-driven · maintainability · refactor backward-compat · self code-review.
> Đọc nó cùng skill chuyên môn bên dưới. Chi tiết: `.claude/skills/his-fe-convention/SKILL.md`.
>
> **★ REUSE-FIRST + ANTD-FIRST (BẮT BUỘC):** trước khi tạo component/hook/util/api mới → **grep xem đã có chưa**
> (`_v2kit`, `components/`, `hooks/`, `utils/`, `api/`, `constants/`) → đã có thì dùng lại/mở rộng, KHÔNG tạo trùng.
> Luôn ưu tiên **Antd v6 / `_v2kit`**, **KHÔNG viết HTML/CSS thuần khi không cần thiết**.

## Skill FE (`his-fe-*`, `his-fs-*`)

| Skill | Mục đích | Chọn khi yêu cầu liên quan |
|---|---|---|
| `his-fe-convention` | ★ convention + kiến trúc FE bắt buộc (naming/layer/folder/component/refactor/review) | **MỌI** generate/refactor/review code FE |
| `his-fe-library-policy` | ★ chọn/tích hợp thư viện đúng lúc (form/validate/data/state/date/chart/test/error) — default stack HIS, lib mới chỉ khi tối ưu rõ + user duyệt + cài dep + coexist | **MỌI** generate/refactor code FE (tránh "code đại trà") |
| `his-fe-page-v2` | page v2 (`_v2kit` + `ab-*`, route `/v2/*`, menu) | tạo/sửa màn hình v2 |
| `his-fe-api-client` | axios `api/*.ts` + DTO interface | gọi backend từ FE |
| `his-fe-antd-v6` | UI Antd v6 page v1 + tránh deprecated | sửa page v1 / lỗi antd |
| `his-fe-webauthn-biometric` | ký sinh trắc WebAuthn (register/sign 2 pha) | vân tay/FaceID, `/api/biometric`, navigator.credentials |
| `his-fe-standalone-portal` | cổng standalone ngoài layout (login + JWT riêng) | cổng thanh tra BHXH, login riêng cho user ngoài |
| `his-fe-dicom-viewer` | viewer Cornerstone3D (MPR/MIP/MinIP/Cine/Mammo) | sửa DicomViewer/CornerstoneViewer, projection, cine |
| `his-fe-emr-print-form` | biểu mẫu in y tế VN (MS xx/BV, DD xx, CLS, BA chuyên khoa) | thêm phiếu/biểu mẫu in, *Print component, PrintTemplateRenderer |
| `his-fe-performance` | bundle/code-split/re-render, vendor nặng (Cornerstone/Antd/recharts) | build cảnh báo >500KB, trang load chậm/lag nhiều dòng, tune manualChunks |
| `his-fs-realtime-signalr` | SignalR hub + client (reconnect + polling fallback) | realtime/đẩy thông báo, chat, hàng đợi live (xuyên FE+BE) |

> A11y/WCAG dùng `core-accessibility-pattern`; **gu thẩm mỹ / polish** dùng `core-ui-aesthetics` (CORE portable — chống "AI-slop", KHÔNG hại UX). Cả hai áp kèm `his-fe-page-v2` khi build/review UI.

> B5 domain: biểu mẫu in (`his-fe-emr-print-form`) đã tách riêng. Tạo thêm skill domain khi 1 module HIS có nghiệp vụ đặc thù lặp lại (xem (6) Fallback trong SKILL-MAP).

## Prompt → chuỗi skill (FE) + PATH

| Khi developer prompt | Skills (core → his, đúng thứ tự) | File/đường dẫn chạm tới |
|---|---|---|
| "tạo page v2 [X]" | `core-reusable-code` → `core-error-loading-state` → `his-fe-library-policy` (chọn lib form/data/state) → `his-fe-api-client` → `his-fe-page-v2` → `his-fe-convention` → `core-ui-aesthetics` (polish gu thẩm mỹ, không hại UX) → `his-fe-antd-v6`(nếu cần) → `his-qa-anti-pattern` | `frontend/src/api/*.ts`, `frontend/src/pages-v2/*.tsx`, `App.tsx`, `TerminalLayout.tsx` |
| "thêm api client [X]" | `core-types-contract` → `his-fe-api-client` | `frontend/src/api/*.ts` |
| "sửa page v1 / lỗi antd [X]" | `core-error-loading-state` → `his-fe-antd-v6` → `his-qa-anti-pattern` | `frontend/src/pages/*.tsx`, `MainLayout` |
| "ký sinh trắc / vân tay BN [X]" | `core-types-contract` → `core-error-loading-state` → `his-fe-api-client` → `his-fe-webauthn-biometric` → `his-qa-anti-pattern` | `api/nangcap24.ts`, `pages-v2/BiometricEnrollment.tsx`, `/api/biometric` |
| "cổng đăng nhập riêng cho [user ngoài]" | `core-validation-pattern` → `his-fe-api-client` → `his-fe-standalone-portal` | route ngoài layout `App.tsx`, `pages-v2/*Portal.tsx` |
| "viewer DICOM / MPR / MIP / cine [X]" | `core-reusable-code` → `core-error-loading-state` → `his-fe-dicom-viewer` | `components/*Viewer.tsx`, `pages/DicomViewer.tsx` |
| "thêm biểu mẫu / phiếu in [X]" | `core-reusable-code` → `his-fe-emr-print-form` → `his-qa-anti-pattern` | `components/*PrintTemplates.tsx`, `PrintTemplateRenderer.tsx`, `constants/hospital.ts` |
| "realtime / đẩy thông báo / chat / hàng đợi live [X]" | `core-error-loading-state` → `his-fe-api-client` → `his-fs-realtime-signalr` | `HIS.API/Hubs/*`, `Program.cs`, `contexts/NotificationContext.tsx`, `vite.config.ts` (xuyên FE+BE — xem thêm be.md) |
| "tối ưu hiệu năng / giảm bundle / trang lag [X]" | `core-minimal-change` → `his-fe-performance` (đo trước, chỉ tối ưu điểm nóng) | `vite.config.ts` (manualChunks/worker.format), `App.tsx` (lazy), `components/*Viewer.tsx` (dynamic import), `pages-v2/*` |
| "làm UI dễ tiếp cận / a11y / WCAG [X]" | `core-accessibility-pattern` → `his-fe-page-v2` → `his-qa-anti-pattern` | `pages-v2/*.tsx`, `layouts/terminal/*` |
| "làm UI đẹp hơn / có gu / bớt generic / pro hơn [X]" | `core-ui-aesthetics` (gu + tiết chế, chống slop) → `core-accessibility-pattern` (giữ UX/contrast) → `his-fe-page-v2`/`his-fe-convention` | `pages-v2/*.tsx`, `_v2kit.tsx`, `layouts/terminal/ab-module.css` |
| "**rà soát/audit UX-UI toàn hệ thống · đồng bộ light/dark · lập plan sửa UI**" | `core-ui-ux-audit` (AUDIT-FIRST → plan + task TRƯỚC → fix root-first SAU; KHÔNG sửa khi chưa audit xong) → bind `his-fe-page-v2`/`his-fe-convention` + `core-ui-aesthetics`/`core-accessibility-pattern` | `pages-v2/_v2kit.tsx`, `layouts/terminal/ab-module.css` (token light/dark), `pages-v2/*.tsx` toàn bộ |

## Conflict (FE)
- Page v1 (Antd) vs v2 (`_v2kit`): v1 → `his-fe-antd-v6`; v2 → `his-fe-page-v2`. Mặc định feature mới = **v2**. KHÔNG trộn.
