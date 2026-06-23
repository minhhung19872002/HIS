# Staging — Runbook thực thi (chạy ở máy CÓ gcloud auth)

> Đi kèm [`staging-plan.md`](staging-plan.md). **Máy dev hiện tại thiếu gcloud → KHÔNG chạy được từ đó.** Chạy file này ở máy có `gcloud` + quyền project.
> Mục tiêu (đã chốt): môi trường chạy **bộ Playwright E2E có-GHI (`frontend/e2e/workflows/00-13`)** + sinh evidence, data GIẢ, KHÔNG đụng prod/PHI.
> ⚠️ **KHÔNG hardcode secret** vào file tracked. Lấy giá trị thật bằng các lệnh "discover" bên dưới; giá trị `<TRONG_NGOẶC>` = phải điền sau khi verify.

## 0. Discover (điền placeholder — verify, đừng đoán)
```bash
gcloud config get-value project                  # => <PROJECT_ID> (CLAUDE.md ghi project-4d4a3f8e-... — xác nhận lại)
gcloud sql instances list                        # => <SQL_INSTANCE> (instance đang chứa DB HIS)
gcloud run services describe his-api --region=asia-southeast1 \
  --format='value(spec.template.spec.containers[0].image)'   # => <PROD_IMAGE> (tái dùng image prod)
gcloud run services describe his-api --region=asia-southeast1 \
  --format='yaml(spec.template.spec.containers[0].env)'      # xem tên biến conn-string + secret refs prod
```
Hằng số đã biết (CLAUDE.md): region `asia-southeast1` · service prod `his-api` · DB prod `HIS`.

## 1. Tạo DB staging trên CÙNG Cloud SQL instance (rẻ; lưu ý R8)
```bash
gcloud sql databases create HIS_staging --instance=<SQL_INSTANCE>
```
> R8 (round-4): staging dùng chung instance prod → tải E2E nặng có thể **đụng CPU/RAM prod**. Nếu lo → tạo instance nhỏ riêng (`gcloud sql instances create his-staging-sql --tier=db-f1-micro ...`) thay vì dùng chung. Mặc định: dùng chung cho rẻ, chạy E2E ngoài giờ cao điểm.

## 2. Deploy Cloud Run staging (image prod + trỏ DB staging)
`ProductionSchemaRepairRunner` tự dựng schema lúc startup → **không cần migrate tay**.
```bash
gcloud run deploy his-api-staging \
  --image=<PROD_IMAGE> \
  --region=asia-southeast1 \
  --no-allow-unauthenticated \                    # hoặc --allow-unauthenticated nếu test cần, cân nhắc bảo mật
  --min-instances=0 --max-instances=2 \           # min=0 để khỏi tốn tiền lúc idle
  --set-env-vars=ASPNETCORE_ENVIRONMENT=Staging \
  --update-env-vars='ConnectionStrings__DefaultConnection=<CONN_STRING_TRO_HIS_staging>' \
  --add-cloudsql-instances=<PROJECT_ID>:asia-southeast1:<SQL_INSTANCE>
# Secret (sa password, R2 token...) → tai dung tu Secret Manager nhu prod:
#   --update-secrets='ConnectionStrings__DefaultConnection=<SECRET_NAME>:latest'  (uu tien cach nay hon set-env plaintext)
```
Lấy URL: `gcloud run services describe his-api-staging --region=asia-southeast1 --format='value(status.url)'` → `<STAGING_API_URL>`.

## 3. Verify staging — KHÔNG chỉ tin schema-drift (NR4)
```bash
curl -s <STAGING_API_URL>/health | jq .
curl -s <STAGING_API_URL>/health/schema-drift     # missingCount PHAI = 0 (Admin token neu can)
# ⚠️ NR4: schema-drift=0 CHƯA đủ — runner sort ordinal + nuốt lỗi có thể bỏ cột câm trên DB FRESH.
# Smoke-test DATA-LAYER tren vai bang trong yeu (login + doc that):
curl -s "<STAGING_API_URL>/api/reception/patients/search?keyword=&pageIndex=0&pageSize=1" -H "Authorization: Bearer <TOKEN>" | jq '.data // .'
curl -s "<STAGING_API_URL>/api/business-alerts/rules" -H "Authorization: Bearer <TOKEN>" | jq 'length'   # phai >= 39 (nhu clinical-safety-checks)
# Neu 500/thieu cot -> schema fresh HONG -> KHONG seed/test tiep, fix runner truoc.
# Login admin (DatabaseSeeder tu seed admin/Admin@123 luc startup):
curl -s -X POST <STAGING_API_URL>/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@123"}' | jq '.data.token'
```

## 4. SEED — qua APP, KHÔNG SQL thô (logic-nhất-quán, R5)
Lý do: Users/Roles seed bằng `DatabaseSeeder.cs` + hashing trong `AuthService.cs` → SQL tay sẽ sai hash/FK. App tự enforce nhất-quán.
- **4a. Tài khoản role (giải T8/B):** tạo `ZZTEST_doctor/nurse/cashier/pharmacist` qua **API quản trị user** (`SystemCompleteService.M17.Admin` — endpoint tạo user + gán role). Lấy DTO body từ `frontend/src/api/*.ts` (client sẵn có) — đừng tự bịa shape.
- **4b. Dữ liệu lâm sàng ZZTEST — SCRIPT seed CHUYÊN DỤNG, KHÔNG "chạy E2E để seed" (NR3):** các workflow test **read-dominant + skip-if-no-data** (verify: `01-reception` 9 ghi / 17 đọc; `test.skip(!patientId)` ×5) → chạy chúng KHÔNG tạo đủ seed (vòng lặp). Viết **script seed riêng** (node/bash) gọi tuần tự create-API: tạo BN `ZZTEST_*` → lượt tiếp đón → chỉ định CLS → kết quả → đơn → biên lai (đủ đầu vào cho 12 luồng). Lấy DTO body từ `frontend/src/api/*.ts`/`e2e/workflows/*` (shape có sẵn) — **đừng bịa**.
- **4c. Module nhạy cảm (HIV/Lao/Pháp y/Tâm thần):** chỉ BN giả `ZZTEST_` (giải N2 — không PHI thật).
- **4d. ⚠️ SEED-VERIFY GATE (NR2 — chống "xanh giả do skip"):** sau seed, **assert dữ liệu TỒN TẠI** trước khi chạy suite:
```bash
N=$(curl -s "<STAGING_API_URL>/api/reception/patients/search?keyword=ZZTEST&pageIndex=0&pageSize=5" -H "Authorization: Bearer <TOKEN>" | jq '(.data.items // .items // .data // []) | length')
[ "${N:-0}" -ge 1 ] || { echo "SEED FAILED -> dung lai, KHONG chay suite (se skip-green giả)"; exit 1; }
```
Quy tắc: **SKIP ≠ PASS** — nếu suite skip vì thiếu data thì coi là **seed lỗi**, KHÔNG phải "đã test".

## 5. Chạy Playwright — EMPIRICAL TRƯỚC, đếm SKIP/FAIL (NR1/NR6)
**Bước 5a — chạy ĐÚNG 1 workflow trước (thực nghiệm, đừng chạy cả bộ ngay):**
```bash
cd frontend
PROD_URL=<STAGING_FE_URL> PROD_API_URL=<STAGING_API_URL>/api \
  npx playwright test --config=playwright.prod.config.ts e2e/workflows/01-reception.spec.ts --reporter=list
```
Đọc kết quả: bao nhiêu **pass / skip / fail**? **Skip cao = seed/route hỏng (NR1/NR2), KHÔNG phải "ổn".** Fail "column/object/500" = schema fresh hỏng (NR4).
**Bước 5b — chỉ khi 5a lành** → chạy rộng + đếm skip:
```bash
PROD_URL=<STAGING_FE_URL> PROD_API_URL=<STAGING_API_URL>/api \
  npx playwright test --config=playwright.prod.config.ts e2e/workflows/ --reporter=json > run.json
jq '{passed:[.suites[].specs[].tests[].results[]|select(.status=="passed")]|length, skipped:[.suites[].specs[].tests[].results[]|select(.status=="skipped")]|length, failed:[.suites[].specs[].tests[].results[]|select(.status=="failed")]|length}' run.json
# Gate: skipped/total cao -> COI LA DO (seed thieu / suite rot), KHONG bao "da test".
```
**Bước 5c — evidence:** `e2e/page-screenshot.spec.ts` / `v2-interactive-audit.spec.ts` (gitignore, local-only).
> `<STAGING_FE_URL>`: Vercel preview trỏ `VITE_API_URL=<STAGING_API_URL>`, hoặc `npm run dev` local trỏ API staging.
> ⚠️ **Suite-health (NR1/NR5):** suite có hard-skip rot (`'selector stale… route changed'`, `'seed failed'`). **Audit + sửa các skip này = task fix RIÊNG** trước khi tin suite là lưới correctness — đừng coi "127 file" = "đã phủ 127 thứ".

## 6. Reset / re-seed (tái hiện được)
```bash
# Cach nhanh: drop + tao lai DB -> runner dung lai schema sach luc startup ke tiep
gcloud sql databases delete HIS_staging --instance=<SQL_INSTANCE> -q
gcloud sql databases create HIS_staging --instance=<SQL_INSTANCE>
gcloud run services update his-api-staging --region=asia-southeast1 --update-env-vars=_RESEED=$(date +%s)  # ep restart de re-seed
# Roi chay lai §4b.
```

## 7. Teardown (khi xong, khỏi tốn tiền)
```bash
gcloud run services delete his-api-staging --region=asia-southeast1 -q
gcloud sql databases delete HIS_staging --instance=<SQL_INSTANCE> -q
```

## Checklist an toàn (round-4)
- [ ] Staging có schema-drift=0 trước khi seed (§3).
- [ ] Chỉ data `ZZTEST_`; module nhạy cảm KHÔNG PHI thật (N2).
- [ ] MCP/test trỏ **staging**, KHÔNG prod (T18/N4 — prod vẫn read-only allow-list).
- [ ] Đóng băng deploy prod khi đang chạy E2E (T9/T24).
- [ ] Secret lấy từ Secret Manager, KHÔNG plaintext tracked.
- [ ] Để ý tải staging vs prod nếu dùng chung instance (R8).
