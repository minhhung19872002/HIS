# Skill-routes · TẦNG FE (Frontend)

> Map con — đọc **CÙNG** `.claude/SKILL-MAP.md`. Nguyên tắc CORE (chọn khi) xem (1a) trong SKILL-MAP.
> Mọi chuỗi: **core-* trước → his-* sau**. Mọi code-gen KÈM `core-reusable-code` + `his-qa-anti-pattern`.

## Skill FE (`his-fe-*`, `his-fs-*`)

| Skill | Mục đích | Chọn khi yêu cầu liên quan |
|---|---|---|
| `his-fe-page-v2` | page v2 (`_v2kit` + `ab-*`, route `/v2/*`, menu) | tạo/sửa màn hình v2 |
| `his-fe-api-client` | axios `api/*.ts` + DTO interface | gọi backend từ FE |
| `his-fe-antd-v6` | UI Antd v6 page v1 + tránh deprecated | sửa page v1 / lỗi antd |
| `his-fe-webauthn-biometric` | ký sinh trắc WebAuthn (register/sign 2 pha) | vân tay/FaceID, `/api/biometric`, navigator.credentials |
| `his-fe-standalone-portal` | cổng standalone ngoài layout (login + JWT riêng) | cổng thanh tra BHXH, login riêng cho user ngoài |
| `his-fe-dicom-viewer` | viewer Cornerstone3D (MPR/MIP/MinIP/Cine/Mammo) | sửa DicomViewer/CornerstoneViewer, projection, cine |
| `his-fe-emr-print-form` | biểu mẫu in y tế VN (MS xx/BV, DD xx, CLS, BA chuyên khoa) | thêm phiếu/biểu mẫu in, *Print component, PrintTemplateRenderer |
| `his-fs-realtime-signalr` | SignalR hub + client (reconnect + polling fallback) | realtime/đẩy thông báo, chat, hàng đợi live (xuyên FE+BE) |

> B5 domain: biểu mẫu in (`his-fe-emr-print-form`) đã tách riêng. Tạo thêm skill domain khi 1 module HIS có nghiệp vụ đặc thù lặp lại (xem (6) Fallback trong SKILL-MAP).

## Prompt → chuỗi skill (FE) + PATH

| Khi developer prompt | Skills (core → his, đúng thứ tự) | File/đường dẫn chạm tới |
|---|---|---|
| "tạo page v2 [X]" | `core-reusable-code` → `core-error-loading-state` → `his-fe-api-client` → `his-fe-page-v2` → `his-fe-antd-v6`(nếu cần) → `his-qa-anti-pattern` | `frontend/src/api/*.ts`, `frontend/src/pages-v2/*.tsx`, `App.tsx`, `TerminalLayout.tsx` |
| "thêm api client [X]" | `core-types-contract` → `his-fe-api-client` | `frontend/src/api/*.ts` |
| "sửa page v1 / lỗi antd [X]" | `core-error-loading-state` → `his-fe-antd-v6` → `his-qa-anti-pattern` | `frontend/src/pages/*.tsx`, `MainLayout` |
| "ký sinh trắc / vân tay BN [X]" | `core-types-contract` → `core-error-loading-state` → `his-fe-api-client` → `his-fe-webauthn-biometric` → `his-qa-anti-pattern` | `api/nangcap24.ts`, `pages-v2/BiometricEnrollment.tsx`, `/api/biometric` |
| "cổng đăng nhập riêng cho [user ngoài]" | `core-validation-pattern` → `his-fe-api-client` → `his-fe-standalone-portal` | route ngoài layout `App.tsx`, `pages-v2/*Portal.tsx` |
| "viewer DICOM / MPR / MIP / cine [X]" | `core-reusable-code` → `core-error-loading-state` → `his-fe-dicom-viewer` | `components/*Viewer.tsx`, `pages/DicomViewer.tsx` |
| "thêm biểu mẫu / phiếu in [X]" | `core-reusable-code` → `his-fe-emr-print-form` → `his-qa-anti-pattern` | `components/*PrintTemplates.tsx`, `PrintTemplateRenderer.tsx`, `constants/hospital.ts` |
| "realtime / đẩy thông báo / chat / hàng đợi live [X]" | `core-error-loading-state` → `his-fe-api-client` → `his-fs-realtime-signalr` | `HIS.API/Hubs/*`, `Program.cs`, `contexts/NotificationContext.tsx`, `vite.config.ts` (xuyên FE+BE — xem thêm be.md) |

## Conflict (FE)
- Page v1 (Antd) vs v2 (`_v2kit`): v1 → `his-fe-antd-v6`; v2 → `his-fe-page-v2`. Mặc định feature mới = **v2**. KHÔNG trộn.
