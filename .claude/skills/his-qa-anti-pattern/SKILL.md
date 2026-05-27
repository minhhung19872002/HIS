---
name: his-qa-anti-pattern
description: Use this skill as a guardrail whenever generating or refactoring HIS code (backend, frontend, SQL, tests) to avoid the project's known footguns and to respect patient-safety / audit / compliance rules. Triggers include any code-gen or refactor task in HIS, reviewing a diff, or before committing. Reminds: never forget DI registration, never use cy.intercept('**/*'), never hardcode hospital name/URL/credentials, never skip audit log or drug-safety checks, never introduce CQRS/MediatR/Next.js.
metadata:
  type: project
---

# HIS Anti-Patterns & Safety Guardrails

Skill "phòng thủ" — danh sách điều **KHÔNG được làm** trong HIS + ràng buộc patient-safety / audit / pháp lý. Áp dụng cho MỌI task sinh/sửa code (BE/FE/SQL/test) và khi review diff trước commit. Đọc cùng skill chuyên môn liên quan.

## 🔴🔴 P0 TỐI THƯỢNG — KHÔNG ẢO TƯỞNG / KHÔNG BỊA ĐẶT (nền tảng mọi rule khác)

> **TUYỆT ĐỐI KHÔNG** ảo tưởng · suy diễn · giả định · giả tạo · tự nghĩ ra rồi thêm vào.
> **KHÔNG tự phát minh** file / hàm / class / component / endpoint / field / cột DB / prop / config key /
> cấu trúc logic / luồng dữ liệu **không tồn tại** trong codebase hiện tại.
>
> - Trước khi tham chiếu/sửa/khẳng định bất cứ thứ gì → **PHẢI verify** bằng Read/Grep/Glob trong code thật
>   (`core-verify-before-assert`). Chỉ nói "có/làm X" khi **đã thấy tận nơi**.
> - Tách bạch **"đã verify"** vs **"giả định"**: nếu chưa kiểm được → ghi rõ "giả định/chưa verify",
>   KHÔNG trình bày phỏng đoán như sự thật.
> - Không chắc / thiếu dữ kiện → **DỪNG hỏi user** (`core-requirement-clarify`), KHÔNG đoán bừa rồi code.
> - Nhớ từ memory/work-log/tài liệu cũ → vẫn phải **verify lại** file/symbol còn tồn tại trước khi dùng.
> - Vi phạm rule này làm hỏng mọi rule khác (code dựa trên thứ không có thật) → mức **P0 cao nhất**.

## Khi nào dùng

- Trước/khi sinh hoặc refactor bất kỳ code HIS nào.
- Khi review diff / chuẩn bị commit.
- Khi không chắc một cách làm có vi phạm convention/an toàn không.

## Khi nào KHÔNG dùng

- Không phải skill code-gen — không tự tạo file. Dùng kèm skill khác.

## ❌ NEVER — Kiến trúc / Backend

1. **Quên đăng ký DI** service/controller mới trong `DependencyInjection.cs` → **500 runtime** không stack trace rõ. Luôn kiểm tra DI đầu tiên khi 500. (xem `his-be-module-scaffold`)
2. **Đề xuất / dùng CQRS, MediatR, FastEndpoints, Minimal API, Next.js, shadcn, Tailwind-first** — dự án KHÔNG dùng. Giữ Controller+Service / React+Vite+Antd / _v2kit.
3. **`dotnet ef migrations`** trông cậy auto-apply — dự án IGNORE pending model changes. Phải viết SQL script tay đánh số `NN_*.sql` (xem `his-db-migration`).
4. **Đổi architecture / refactor lớn không yêu cầu**. Giữ 4-layer, giữ behavior.
5. **`try/catch` nuốt exception trong service** rồi return rỗng (che lỗi). Để middleware/controller xử lý.
6. **Inject scoped (DbContext) vào singleton** → lỗi scope. Dùng `IServiceScopeFactory` nếu cần.

## ❌ NEVER — Frontend / Test

7. **`cy.intercept('**/*')`** → bắt Vite HMR/WebSocket/Google Fonts → ECONNRESET/ENOTFOUND flaky. Luôn `**/api/**`.
8. **Login qua form UI trong test** → chậm/flaky. Dùng API token + set localStorage (xem `his-test-e2e`).
9. **`console.error` cho lỗi API kỳ vọng** → fail smoke `console-errors.cy.ts`. Dùng `console.warn`.
10. **Antd deprecated props** (`Space direction`, `Alert message`, `Drawer width`, `destroyOnClose`...) → dùng API v6 (xem `his-fe-antd-v6`).
11. **Trộn v1/v2 UI** (import `_v2kit`/`ab-*` vào page Antd v1 hoặc ngược lại).
12. **Chỉ chạy `tsc --noEmit`** rồi commit — `tsc -b` (Vercel build) nghiêm hơn. Luôn `npm run build` trước commit/deploy.

## ❌ NEVER — Deploy / Data

13. **Push code BE rồi tưởng đã deploy** — Cloud Run KHÔNG auto-deploy. Phải `gcloud builds submit` + `run services update` (xem `his-ops-deploy`).
14. **Seed mock/fake data lên prod** khi user yêu cầu dữ liệu thật — dữ liệu phải từ DB thật.
15. **Bỏ `IF NOT EXISTS` / `COL_LENGTH IS NULL`** trong SQL script → không idempotent → vỡ lúc re-run.

## ❌ NEVER — Hardcode

16. **Hardcode tên bệnh viện** → dùng `frontend/src/constants/hospital.ts` (HOSPITAL_NAME/ADDRESS/PHONE).
17. **Hardcode URL/host** (Orthanc, API) → dùng env (`VITE_API_URL`, `VITE_ORTHANC_URL`) / config.
18. **Hardcode credentials / token / connection string** trong code hay skill.
19. **Đặt file skill ngoài `.claude/skills/`** (vd trong `docs/`). docs = tài liệu, skill = `.claude/skills/`.

## ⚠️ ALWAYS — Patient safety (y khoa)

20. **KHÔNG bỏ qua kiểm tra an toàn thuốc**: tương tác thuốc (severity cao), dị ứng, chống chỉ định — đã có `DrugInteractionService`/`DrugAllergyService`. Khi đụng kê đơn/phát thuốc, giữ các check này.
21. **KHÔNG tự ý nới lỏng điều kiện cấp giấy** (vd eligibility lái xe — auto-compute theo TT 24/2023). Giữ defense-in-depth.
22. **Mapping bệnh nhân / liều / chỉ định**: cực kỳ cẩn trọng — sai = nguy hiểm tính mạng. Verify Patient↔MedicalRecord↔Order đúng.

## ⚠️ ALWAYS — Audit & Compliance (pháp lý)

23. **Giữ audit log** cho mọi mutation (AuditLogMiddleware ghi POST/PUT/DELETE; access log giám định; signature log; study activity). KHÔNG bỏ.
24. **CreatedBy/UpdatedBy** đúng user (KHÔNG `Guid.Empty` — đã từng gây 500 FK ở payment confirm). Resolve user thật, fallback hợp lệ.
25. **Ký số / HSBA / liên thông** (BHYT XML, HL7/FHIR, Đề án 06): nếu là MVP/placeholder (vd biometric chưa verify chữ ký thật, signed-XML placeholder) → **ghi rõ known-risk**, KHÔNG coi là chữ ký pháp lý đầy đủ.
26. **Privacy HSBA**: role guard chặt (vd `BhxhInspector` tách user thường). KHÔNG nới quyền truy cập hồ sơ.

## ⚠️ ALWAYS — Build-gate TRƯỚC khi báo xong (BẮT BUỘC)

27. **Sau MỖI lần thêm / sửa / XOÁ code → PHẢI build sạch tầng đã đụng rồi MỚI báo hoàn thành.** Áp cho cả 3 thao tác (xoá file/hàm cũng có thể vỡ import/reference). KHÔNG báo "done" khi chưa build (vi phạm `core-execution-output`: không claim success khi chưa verify).
    - **Đụng FE** (`frontend/src/**`): `cd frontend && npm run build` (= `tsc -b` strict + `vite build`) → **EXIT 0**. KHÔNG chỉ `tsc --noEmit` (lỏng hơn Vercel — đã từng lọt lỗi).
    - **Đụng BE** (`backend/src/**`): `cd backend && dotnet build HIS.sln` → **0 Errors** (warning pre-existing OK). Nếu DLL bị khoá do app đang chạy → kill process cổng 5106 trước khi build.
    - **Đụng cả 2 tầng** → build CẢ FE và BE. **Chỉ đổi `.claude/`/docs/script** (không chạm source) → không cần build, nói rõ "không cần build".
    - Build **lỗi** → tự bung root-cause + sửa cho hết, **không báo xong** khi còn lỗi. Báo cáo phải ghi rõ trạng thái build (vd "npm run build EXIT 0", "dotnet build 0 errors").

## ⚠️ ALWAYS — Cấu trúc file / thư mục (đặt file đúng chỗ)

28. **TUYỆT ĐỐI KHÔNG tạo file mới ở thư mục gốc (root) repo.** Mọi file mới PHẢI nằm trong thư mục đúng loại:
    - FE: `frontend/src/{pages-v2,pages,api,components,hooks,contexts,types,constants,utils,layouts}/` · CSS design `layouts/terminal/`.
    - BE: `backend/src/HIS.{Core/Entities,Application/{DTOs,Services},Infrastructure/Services,API/Controllers}/` · SQL `backend/src/HIS.Infrastructure/Data/Scripts/NN_*.sql` hoặc `scripts/`.
    - Test: `frontend/cypress/e2e/`, `frontend/e2e/`, `frontend/e2e-prod/`, `test-*.ps1` → thư mục test tương ứng. Tài liệu → `docs/`. Skill → `.claude/skills/<name>/`.
29. **Không có thư mục tương ứng với loại file đó** → **DỪNG, đề xuất user tạo thư mục** (nêu tên + vị trí + lý do) → được duyệt mới tạo thư mục rồi đặt file vào. KHÔNG tự nhét tạm ra root.

## ⚠️ ALWAYS — Self code-review 9 điểm (AI TỰ rà, CẢ BE + FE, trước khi báo xong)

30. **Sau khi gen/sửa code BE hoặc FE, AI PHẢI tự rà 9 điểm dưới đây rồi mới báo "xong"** (không chờ user nhắc). Phát hiện vi phạm → sửa trước khi báo. (FE chi tiết: `his-fe-convention` §7; mức hàm: `core-clean-code` §9.)

| # | Điểm | FE check | BE check |
|---|---|---|---|
| 1 | **Duplicate logic** | reuse `_v2kit`/`components`/`hooks`/`utils` trước | reuse Service/helper/extension có sẵn, không copy logic giữa service |
| 2 | **Dead code** | import/biến/hàm thừa, code comment-out, `console.log` | using/method/field thừa, code comment-out, biến không dùng |
| 3 | **Hard-code data** | tên BV/URL/credential/option → `constants`/env/`api` | connection string/secret/magic status → config/const/enum (Core) |
| 4 | **Anti-pattern** | `cy.intercept('**/*')`, nuốt lỗi, raw HTML thay Antd | **quên DI**, `try/catch` nuốt exception, CQRS/EF-migrate (mục ❌ trên) |
| 5 | **Component/đơn vị quá lớn** | god-component → tách sub-component/panel | god-service/controller → tách theo responsibility |
| 6 | **Function quá dài** | > ~50–60 dòng → tách helper (guard clause) | method dài → tách private method/usecase |
| 7 | **Import cycle** | không vòng lặp import TS | không circular namespace/project-ref; giữ hướng Core→App→Infra→API |
| 8 | **Naming sai convention** | `his-fe-convention` §1 (Pascal/camel/UPPER) | PascalCase type/method, camelCase local/param, tên domain rõ |
| 9 | **State management không hợp lý** | single source of truth, local vs context, không prop-drill/side-effect render | **service stateless** (không mutable shared state), DI lifetime đúng (Scoped/Singleton), không giữ state request trong singleton |

> Báo cáo hoàn thành nên xác nhận đã tự rà 9 điểm + build sạch (#27). Đây là gate **tự kiểm**, không phải tuỳ chọn.

## Quy tắc chung

- **Reuse over create**: tìm pattern/component/service đã có trước (xem Code Reuse Rules trong prompt gen).
- **Hỏi khi không chắc, không đoán** — nhất là nghiệp vụ y tế.
- **Explicit**: nói rõ đang làm gì + tại sao.

## When to update

- Khi phát hiện footgun mới (thêm vào list).
- Khi convention an toàn/pháp lý/audit thay đổi.
- Khi sửa được 1 known-risk (cập nhật trạng thái MVP → done).
