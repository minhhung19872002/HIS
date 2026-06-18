# Probe sweep 29 module chuyên khoa/quản trị · 2026-06-17

> ## ✅ TRẠNG THÁI THỰC THI (cập nhật 2026-06-18)
> - **P0 + P1 validation = DONE 100%.** Đợt 1 `2bf8336` ([Required] 18 DTO/11 file) + đợt 2 `60a6d2e`
>   (controller guard 9 endpoint còn lại: tb-hiv/records · hospital-pharmacy/sales · ivf-lab/couples ·
>   mental-health/cases · traditional-medicine/treatments · trauma-registry/cases · forensic/cases ·
>   pathology/results · pharmacy-approval/submit). `{}` → 400 message rõ, không tạo rác / không NRE-500.
>   `Notification/test` = no-body dev-test → bỏ qua (không có input để validate). Build BE 0 error.
> - **P2 dọn data rác = CHƯA chạy (blocker kỹ thuật + an toàn).** `CreatedAt` KHÔNG có trong response list API
>   → không nhận diện rác qua API. Query theo `CreatedAt` cần SQL trực tiếp prod (whitelist IP Cloud SQL +
>   sa-secret = side-effect bảo mật) + đây là bản ghi QA-probe (không phải Claude tạo) → "nhìn trước khi xóa".
>   Rác = test-data vô hại (STATUS: stock chưa từng bị trừ). **Khuyến nghị:** chạy SELECT-count trước rồi
>   guarded DELETE qua DB tool / `gcloud sql connect` khi có phiên DB; hoặc defer (giá trị cosmetic).


> Probe 1 write-endpoint chính của 29 module chưa test (body `{}`), phân loại. **Phát hiện hệ thống: rất nhiều endpoint TẠO không validate input** (cùng anti-pattern surgery-requests đã fix nhưng còn rải rác).

## Tổng hợp (29 endpoint)
- **OK (validate sạch 4xx)**: 3 — BloodBank (400 Note required), ObservationStay (404 fake id), ServiceRefund (400 "Chưa chọn dịch vụ").
- **200 trên body rỗng**: 17 — phần lớn **TẠO bản ghi rác thật** (id mới): InterHospital, PracticeLicense, AssetManagement(tenders), Procurement(requests), SatisfactionSurvey(templates), PopulationHealth, CommunityHealth, HealthEducation, Notification + (204/echo) ChronicDisease, TbHiv, HospitalPharmacy, IVF. Một số xử lý mềm (inner success:false, không tạo): Booking, DigitalSignature, CentralSigning, Archive.
- **500 trên body rỗng (validate kém, có CORS — không crash)**: 8 — HIV, MentalHealth, Pathology, YHCT, Obstetric, Trauma, PharmacyApproval, Forensic.
- **SUSPECT**: 1 — ClinicalPharmacy import-csv 415 (do gửi JSON thay multipart — KHÔNG phải bug).

## 🔴 Finding hệ thống (cần fix)
1. **Create-endpoint KHÔNG validate input → tạo rác im lặng** (data-integrity). Body `{}` vẫn tạo bản ghi với field rỗng/null/default. Đây ĐÚNG lỗi đã sửa cho `SurgeryComplete/requests` + `inpatient/vital-signs` — nhưng **chưa áp dụng diện rộng**. Các module dính: InterHospital requests, PracticeLicense, AssetManagement tenders, Procurement requests, SatisfactionSurvey templates, PopulationHealth records, CommunityHealth households, HealthEducation campaigns, Notification, ChronicDisease records, TbHiv records, HospitalPharmacy sales, IVF couples.
2. **500 thay vì 400 khi thiếu input** (8 endpoint trên) — NRE trên body rỗng → "Hệ thống đang gặp sự cố" thay vì lỗi field rõ.

## ⚠️ Dọn rác QA (em tạo khi probe — body rỗng nhưng endpoint vẫn tạo)
Các bản ghi tạo **hôm nay 2026-06-17** với field rỗng/default ở các bảng: InterHospital request, PracticeLicense, AssetManagement tender, Procurement request, SatisfactionSurvey template, PopulationHealth record, CommunityHealth household, HealthEducation campaign, Notification, ChronicDisease record, TbHiv record, HospitalPharmacy sale, IVF couple. (Id bị cắt trong log probe — Claude Code purge theo điều kiện CreatedAt hôm nay + field bắt buộc rỗng.)

## PROMPT cho Claude Code (paste)
```
Đọc .claude/SKILL-MAP.md (his-qa-anti-pattern, his-be-module-scaffold) + docs/workspace-docs/10-assessment/prod-sweep-specialty-admin-2026-06-17.md. KHÔNG commit/push tới khi tôi duyệt.

P0 — Validate input cho create-endpoint (chống tạo rác, cùng cách đã làm cho SurgeryComplete/requests):
Áp validate field bắt buộc (trả 400 message rõ nếu thiếu, KHÔNG tạo bản ghi) cho các POST create đang nhận body rỗng → 200/tạo rác:
api/inter-hospital/requests, api/practice-license/licenses, api/asset-management/tenders, api/asset-procurement/requests, api/satisfaction-survey/templates, api/population-health/records, api/community-health/households, api/health-education/campaigns, api/Notification/test, api/chronic-disease/records, api/tb-hiv/records, api/hospital-pharmacy/sales, api/ivf-lab/couples.
Cân nhắc 1 cơ chế dùng chung (base validate / action filter) để khỏi sót. Verify: POST {} → 400, POST hợp lệ → 201/200.

P1 — 500→400 khi thiếu input (NRE trên body rỗng): api/hiv-management/patients, api/mental-health/cases, api/Pathology/results, api/traditional-medicine/treatments, api/obstetric-register/births, api/trauma-registry/cases, api/pharmacy-approval/submit, api/forensic/cases. Validate model → 400 message rõ thay vì "Hệ thống đang gặp sự cố".

P2 — DỌN DATA RÁC do QA probe 2026-06-17: xóa bản ghi tạo hôm nay với field bắt buộc rỗng/null ở 13 bảng module P0 trên (theo CreatedAt = 2026-06-17 + field rỗng). Cẩn thận không xóa data thật.

BUILD-GATE: dotnet build 0 error. Verify từng endpoint P0 bằng gọi thật ({}→400). Báo cáo.
```
