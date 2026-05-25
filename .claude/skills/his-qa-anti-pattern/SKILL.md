---
name: his-qa-anti-pattern
description: Use this skill as a guardrail whenever generating or refactoring HIS code (backend, frontend, SQL, tests) to avoid the project's known footguns and to respect patient-safety / audit / compliance rules. Triggers include any code-gen or refactor task in HIS, reviewing a diff, or before committing. Reminds: never forget DI registration, never use cy.intercept('**/*'), never hardcode hospital name/URL/credentials, never skip audit log or drug-safety checks, never introduce CQRS/MediatR/Next.js.
type: project
---

# HIS Anti-Patterns & Safety Guardrails

Skill "phòng thủ" — danh sách điều **KHÔNG được làm** trong HIS + ràng buộc patient-safety / audit / pháp lý. Áp dụng cho MỌI task sinh/sửa code (BE/FE/SQL/test) và khi review diff trước commit. Đọc cùng skill chuyên môn liên quan.

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

## Quy tắc chung

- **Reuse over create**: tìm pattern/component/service đã có trước (xem Code Reuse Rules trong prompt gen).
- **Hỏi khi không chắc, không đoán** — nhất là nghiệp vụ y tế.
- **Explicit**: nói rõ đang làm gì + tại sao.

## When to update this skill

- Khi phát hiện footgun mới (thêm vào list).
- Khi convention an toàn/pháp lý/audit thay đổi.
- Khi sửa được 1 known-risk (cập nhật trạng thái MVP → done).
