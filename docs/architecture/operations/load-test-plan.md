# KE HOACH KIEM THU TAI (LOAD TEST)

**So van ban:** LTP-2026-001
**Phien ban:** 1.0
**Ngay ban hanh:** 11/06/2026
**Can cu:** NFR "Hieu nang" Bang 8 — tai lieu nghiep vu His-documents (xem `docs/workspace-docs/10-assessment/conformance-His-documents-2026-06-09.md` muc D)

---

## 1. Muc dich va pham vi

- Xac nhan he thong dap ung so nguoi dung dong thoi theo quy mo benh vien (100 user BV nho → 1000 user BV lon).
- Tim diem nghen (endpoint cham, query N+1, thieu index, connection pool) TRUOC khi trien khai cho benh vien dong nguoi.
- **Moi truong chay: local Docker hoac instance staging clone. TUYET DOI KHONG ban tai vao production dang phuc vu.**

## 2. Baseline ha tang production (kiem tra thuc te 11/06/2026)

| Thanh phan | Cau hinh | Y nghia voi tai |
| --- | --- | --- |
| Cloud Run `his-api` | 1 vCPU · 2Gi RAM · concurrency 80 · min 0 · max 2 instance | Tran ly thuyet ~160 request dong thoi; min=0 nen co **cold start** sau thoi gian vang khach |
| Cloud SQL `his-sql` | SQL Server 2022 **Express**, ZONAL | Gioi han edition Express: ~10GB/database, buffer pool ~1.4GB → BV lon can nang cap edition/tier |
| Vercel FE | CDN static | Khong phai diem nghen (asset tinh) |

> Khi ban giao BV quy mo lon: tang `--max-instances` (vd 10), can nhac `--min-instances=1` (het cold start),
> nang Cloud SQL len tier cao hon + edition Standard. Chi tiet toi uu: skill `his-be-scalability`.

## 3. Kich ban nghiep vu (scenario mix)

Tai khoan test: `admin / Admin@123` (hoac user role phu hop). Du lieu: bat seed worker (`DailyDemoSeed__Enabled=true`) de co BN/lich kham.

| # | Kich ban | Endpoint chinh | Ty trong | Loai |
| --- | --- | --- | --- | --- |
| S1 | Dang nhap | `POST /api/auth/login` | 5% | Write nhe |
| S2 | Tiep don — danh sach hom nay | `GET /api/reception/admissions/today` | 30% | Read |
| S3 | Tiep don — dang ky BN moi | `POST /api/reception/register/fee` | 15% | Write |
| S4 | Man kham — tra cuu KQ XN cua phien kham | `GET /api/examination/{examinationId}/lab-results` | 25% | Read |
| S5 | Vien phi — tim kiem hoa don | `GET /api/BillingComplete/invoices/search` | 25% | Read |

## 4. Muc tieu va nguong dat/truot

| Chi so | Nguong DAT |
| --- | --- |
| p95 response time — endpoint READ | < 500 ms |
| p95 response time — endpoint WRITE | < 1500 ms |
| Ty le loi (HTTP 5xx + timeout) | < 1% |
| Cloud SQL CPU (staging) | < 80% duy tri |

| Muc tai | So VU (virtual user) | Tuong duong |
| --- | --- | --- |
| Smoke | 5 VU · 1 phut | Kiem tra script dung |
| Baseline BV nho | 20 VU · 5 phut | ~100 nhan vien dung dong thoi thuc te |
| Ramp BV lon | tang dan den 100-200 VU · 10 phut | ~1000 nhan vien |
| Soak | 50 VU · 30 phut | Phat hien leak/degradation theo thoi gian |

> Quy doi tham khao: 1 nhan vien thao tac thuc te ~ 0.1-0.2 request/giay → 100 user ≈ 10-20 rps; 1000 user ≈ 100-200 rps.

## 5. Cong cu: k6 (script mau)

Cai dat: `winget install k6` (Windows) hoac `docker run --rm -i grafana/k6 run - < script.js`.

```javascript
// load-his.js — k6 smoke/baseline cho HIS (chay vao LOCAL/STAGING, khong prod)
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:5106';

export const options = {
  stages: [
    { duration: '1m', target: 5 },    // smoke
    { duration: '5m', target: 20 },   // baseline BV nho — sua target theo muc 4
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const res = http.post(`${BASE}/api/auth/login`,
    JSON.stringify({ username: 'admin', password: 'Admin@123' }),
    { headers: { 'Content-Type': 'application/json' } });
  // Response envelope: {success, data:{token}} (k6 nhan raw, KHONG qua axios interceptor cua FE)
  const token = res.json('data.token') || res.json('token');
  return { token };
}

export default function (data) {
  const auth = { headers: { Authorization: `Bearer ${data.token}` } };
  const r1 = http.get(`${BASE}/api/reception/admissions/today`, auth);
  check(r1, { 'admissions 200': (r) => r.status === 200 });
  const r2 = http.get(`${BASE}/api/catalog/branches`, auth);
  check(r2, { 'catalog 200': (r) => r.status === 200 });
  sleep(1); // think-time mo phong nguoi dung that
}
```

Chay: `k6 run -e BASE_URL=http://localhost:5106 load-his.js`
Mo rong S3-S5: them `http.post` register-fee (payload `newPatient` + `roomId` lay tu catalog) va cac GET billing/lab — giu ty trong muc 3.

## 6. Quy trinh thuc hien

1. **Chuan bi:** dung moi truong local/staging voi du lieu seed; ghi lai cau hinh (CPU/RAM/tier DB) vao bien ban.
2. **Smoke** (5 VU) — script va auth chay dung, khong loi.
3. **Baseline** (20 VU/5') — so voi nguong muc 4.
4. **Ramp** (den 100-200 VU) — tim diem gay: theo doi p95 tung endpoint, ty le loi, CPU DB.
5. **Soak** (50 VU/30') — phat hien memory leak / connection pool can.
6. **Ghi ket qua** vao `docs/workspace-docs/10-assessment/load-test-YYYY-MM-DD.md`: bang chi so theo muc tai + dot/giai phap.

## 7. Khi truot nguong — checklist toi uu (theo skill `his-be-scalability`)

1. Endpoint cham nhat: kiem tra query — them `AsNoTracking()`, phan trang `Skip/Take`, tranh N+1 (`Include` dung cho).
2. Thieu index cho query nong → them index bang migration `Data/Scripts/NN_*.sql` (idempotent).
3. Danh muc doc nhieu (services/medicines/icd10) → cache Redis.
4. Connection pool can → tang `Max Pool Size` trong connection string.
5. Ha tang: tang Cloud Run `--max-instances`, `--min-instances=1` chong cold start; nang tier/edition Cloud SQL.
6. Rate-limit endpoint public (login, portal) chong abuse.

## 8. Trach nhiem

| Vai tro | Trach nhiem |
| --- | --- |
| Truong phong CNTT | Phe duyet ke hoach, xac nhan ket qua truoc khi go-live BV moi |
| Dev/DevOps | Chay test, phan tich, toi uu theo muc 7 |
| Quan tri vien CSDL | Theo doi CPU/connection DB trong luc test |

---

**Ghi chu:** thuc hien load test BAT BUOC truoc khi go-live benh vien quy mo > 300 nhan vien, va sau cac thay doi kien truc lon (doi tier DB, refactor service nong).
