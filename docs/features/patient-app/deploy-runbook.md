# Sổ tay triển khai — App hỗ trợ người bệnh

> Hai chỗ chạy, hai vai trò khác nhau:
> **Data center bệnh viện** giữ toàn bộ dữ liệu y tế · **VPS Cloud** chỉ chuyển tiếp thông báo đẩy.
>
> Nguyên tắc xuyên suốt: **dữ liệu y tế không bao giờ rời data center.**

---

## 0. Chuẩn bị

| Việc | Ghi chú |
|---|---|
| Một máy chủ Linux trong data center | Đã chạy HIS Core, có mạng docker `his-net` |
| Một VPS: SSD ≥ 15 GB, RAM ≥ 2 GB, CPU ≥ 2 core | Yêu cầu HSMT mục II.2 |
| Một tên miền trỏ về VPS | Để Caddy xin chứng chỉ Let's Encrypt |
| Bí mật: khoá JWT, mật khẩu CSDL, khoá ví giấy tờ, tài khoản dịch vụ HIS | Xem [`external-services-setup.md`](external-services-setup.md) |

Sinh các bí mật:

```bash
openssl rand -base64 48   # AppJwt__Key
openssl rand -base64 32   # PATIENTAPP_DB_PASSWORD
openssl rand -base64 32   # DocumentVault__Key  (BẮT BUỘC đúng 32 byte)
```

> ⚠️ **`DocumentVault__Key` mất là mất toàn bộ giấy tờ trong ví của mọi người bệnh** — tệp trên đĩa
> không giải mã được nữa. Lưu vào két bí mật của bệnh viện, ít nhất hai người giữ được.

---

## 1. Data center bệnh viện

```bash
cd deploy/patient-app
cp .env.example .env
$EDITOR .env                 # điền bí mật đã sinh ở trên
docker compose up -d
docker compose ps            # cả hai dịch vụ phải "healthy"
```

Migration EF Core **tự chạy lúc khởi động** (`Program.cs`), không có bước thủ công.

### Kiểm sau khi lên

```bash
# BFF sống chưa
curl -s http://127.0.0.1:8090/health

# BFF nối được HIS chưa
curl -s http://127.0.0.1:8090/health/ready

# Bảng đã tạo đủ chưa
docker exec patientapp-postgres psql -U patientapp -d his_patientapp -c "\dt"
```

Phải thấy: `app_accounts`, `app_devices`, `app_refresh_tokens`, `otp_challenges`,
`biometric_challenges`, `app_notifications`, `push_outbox`, `access_audit_logs`,
`appointment_reminders`, `app_queue_tickets`, `app_family_links`, `app_documents`,
`notification_campaigns`.

### Ba biến bắt buộc, thiếu là app **không khởi động**

Cố ý ném lỗi lúc khởi động thay vì chạy với cấu hình sai — sai cấu hình ở ba chỗ này đều là lỗ hổng
im lặng:

| Biến | Thiếu thì sao |
|---|---|
| `AppJwt__Key` | Khoá ký token — thiếu là ai cũng làm token giả được |
| ~~`HisJwt__Key`~~ | **Không cần nữa** từ [D21]: BFF hỏi lại HIS để xác thực nhân viên thay vì giữ khoá ký của HIS |
| `DocumentVault__Key` | Khoá mã hoá giấy tờ — thiếu thì khởi động lại là giấy tờ cũ hỏng hết |

Ngoài ra `IOtpSender` thật phải được đăng ký; bản in-log chỉ chạy ở `Development`.

---

## 2. VPS Cloud

```bash
cd deploy/patient-app-vps
cp .env.example .env
$EDITOR .env                 # PATIENTAPP_DOMAIN, ACME_EMAIL, RELAY_API_KEY, khoá FCM
docker compose up -d
```

Caddy tự xin chứng chỉ Let's Encrypt trong khoảng một phút sau khi tên miền trỏ đúng.

### Kiểm chứng chỉ số (HSMT I.4)

```bash
# Chuỗi chứng chỉ đầy đủ, còn hạn, do Let's Encrypt cấp (loại DV)
echo | openssl s_client -connect "$PATIENTAPP_DOMAIN:443" -servername "$PATIENTAPP_DOMAIN" 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates

# TLS 1.2 trở lên; TLS 1.0/1.1 phải bị từ chối
openssl s_client -connect "$PATIENTAPP_DOMAIN:443" -tls1_1 2>&1 | grep -q "no protocols available" \
  && echo "TLS 1.1 da bi tu choi — dat"

# Header bảo vệ
curl -sI "https://$PATIENTAPP_DOMAIN/health" | grep -Ei "strict-transport|x-content-type|x-frame"
```

Chụp màn hình kết quả SSL Labs (mục tiêu hạng A) để đính hồ sơ nghiệm thu.

### Kiểm cấu hình VPS (HSMT II.2)

```bash
df -h /            # SSD ≥ 15 GB
free -m            # RAM ≥ 2 GB
nproc              # CPU ≥ 2 core
docker stats --no-stream   # RAM thực dùng của stack nên < 1.5 GB
```

### Kiểm "VPS không giữ dữ liệu y tế" (HSMT II.1)

```bash
# Chỉ có hàng đợi thông báo và device token, KHÔNG có bảng bệnh án nào
docker exec patientapp-relay-redis redis-cli KEYS '*' | head -50

# Dừng hẳn VPS rồi kiểm dữ liệu trong data center vẫn nguyên
docker compose -f deploy/patient-app-vps/docker-compose.yml down
docker exec patientapp-postgres psql -U patientapp -d his_patientapp \
  -c "SELECT COUNT(*) FROM app_accounts;"
```

---

## 3. Web quản trị

Web quản trị nằm trong SPA của HIS. Chỉ cần trỏ biến môi trường lúc build frontend:

```bash
VITE_PATIENT_APP_API_URL=https://<địa chỉ BFF>   # bỏ trống nếu reverse proxy đã định tuyến /patient-api
npm run build
```

Nhân viên đăng nhập HIS như thường; các màn `/v2/patient-app/*` hiện với ai có vai trò tương ứng.

---

## 4. Nâng cấp

```bash
cd deploy/patient-app
docker compose pull
docker compose up -d          # migration tự chạy khi khởi động lại
docker compose logs -f patientapp-api | head -50
```

**Quay lui:** đổi `PATIENTAPP_IMAGE` trong `.env` về thẻ ảnh cũ rồi `docker compose up -d`.

> ⚠️ Quay lui **không** tự hoàn tác migration. Trước khi nâng cấp một bản có đổi lược đồ, sao lưu CSDL
> (mục 5) và đọc phần migration trong ghi chú phát hành.

---

## 5. Sao lưu

Hai thứ phải sao lưu, và **cả hai đều cần** để khôi phục:

```bash
# 1. Cơ sở dữ liệu
docker exec patientapp-postgres pg_dump -U patientapp his_patientapp \
  | gzip > patientapp-$(date +%F).sql.gz

# 2. Ổ đĩa ví giấy tờ (tệp đã mã hoá)
docker run --rm -v patientapp_vault:/vault -v "$PWD:/out" alpine \
  tar czf /out/patientapp-vault-$(date +%F).tar.gz -C /vault .
```

Sao lưu CSDL mà **không** sao lưu ví giấy tờ thì khôi phục xong sẽ có danh sách giấy tờ trỏ vào những
tệp không tồn tại. Ngược lại cũng vô dụng: tệp đã mã hoá mà mất nonce trong CSDL thì không giải mã
được.

Và cả hai đều vô nghĩa nếu mất `DocumentVault__Key` — lưu khoá **tách khỏi** nơi lưu bản sao lưu.

---

## 6. Khi có sự cố

| Triệu chứng | Kiểm gì trước |
|---|---|
| App báo *"chưa kết nối được hệ thống bệnh viện"* | `curl http://127.0.0.1:8090/health/ready` · HIS Core còn sống không · tài khoản dịch vụ còn hiệu lực không |
| Đăng ký báo lỗi gửi mã | Log `patientapp-api` tìm `IOtpSender` · hạn mức của nhà cung cấp SMS |
| Web quản trị đăng nhập được HIS nhưng vào màn app bị 401 | BFF hỏi HIS `GET /api/auth/me` để xác thực — kiểm `HisConnector:BaseUrl` có đúng địa chỉ HIS không, và HIS có sống không. Vai trò của nhân viên phải nằm trong `StaffAuth.AdminRoles`/`LookupRoles` |
| Giấy tờ mở ra báo lỗi giải mã | `DocumentVault__Key` có bị đổi không · ổ đĩa `patientapp_vault` có được gắn đúng không |
| Thông báo không tới máy người bệnh | Bảng điều khiển: *"thiết bị nhận được thông báo đẩy"* · cấu hình Firebase · relay trên VPS còn sống không |
| Cần chặn khẩn một bản app hỏng | Nâng `AppRelease__MinimumAndroidVersion` — xem [`store-release-checklist.md`](store-release-checklist.md) §7 |

---

## 7. Bản UAT đang chạy — VM 14.225.83.93

Dựng ngày 2026-09-09 để bàn giao thử: cài app lên điện thoại thật và bấm được qua Internet.

| | |
|---|---|
| Địa chỉ | **https://patientapp.14-225-83-93.nip.io** |
| Thư mục | `/home/hung/his-patientapp/` trên VM (`ssh hung@14.225.83.93`) |
| Chứng chỉ | Let's Encrypt (DV), tự gia hạn — HSMT I.4.1 |
| Tài nguyên | API 85 MB + PostgreSQL 41 MB |

### Khác bản gốc ở chỗ nào

Đây **không phải** data center bệnh viện, nên `docker-compose.yml` trên VM khác bản trong repo
(`deploy/patient-app/`) hai điểm:

1. **HIS Core không nằm cùng máy** → gọi qua Internet `https://his.bluestar.com.vn`, không dùng
   mạng nội bộ `his-net`.
2. **TLS do `proxy-caddy` sẵn có trên VM đảm nhiệm**, không dựng stack VPS riêng.

### VM này chạy chung với hơn chục dự án khác — ba nguyên tắc bắt buộc

- **Thêm site = thêm MỘT file** `/home/hung/proxy/sites/his-patientapp.caddy`. Không sửa file của
  dự án khác. Thư mục đó vốn được thiết kế theo lối này.
- **`caddy validate` trước, reload sau.** Reload nóng, không restart proxy. Xong phải kiểm lại vài
  site khác còn 200 (`uat.tihelab.vn`, `attp.bluestar.com.vn`).
- **Tên container đặt đầy đủ** (`patientapp-api`, không phải `api`). Proxy nằm trong nhiều mạng
  cùng lúc nên tên ngắn sẽ phân giải sang container của dự án khác theo may rủi — bài học đã ghi
  trong `foodsafe.caddy`.

```bash
# Nâng cấp
ssh hung@14.225.83.93
cd ~/his-patientapp && docker compose pull && docker compose up -d   # hoặc nạp ảnh mới:
#   (máy dev)  docker build -f backend/src/HIS.PatientApp.Api/Dockerfile -t his-patientapp-api:uat .
#              docker save his-patientapp-api:uat | gzip -1 | ssh hung@14.225.83.93 'gunzip | docker load'

# Xem mã OTP khi đang chạy chế độ Development
docker logs patientapp-api 2>&1 | grep '\[DEV\] OTP'
```

### ⚠️ Hai điều kiện chưa xong ở bản UAT này

1. **`HIS_SERVICE_USERNAME/PASSWORD` để trống** → mọi màn cần dữ liệu bệnh viện sẽ báo "chưa kết nối
   được hệ thống". Cần một tài khoản HIS **quyền tối thiểu**; cố ý không dùng `admin` vì tài khoản đó
   nhìn được hồ sơ mọi bệnh nhân, mà `.env` nằm trên một VM dùng chung nhiều dự án.
2. **`PATIENTAPP_ENV=Development`** để bản gửi OTP in mã ra log (chưa có cổng SMS). **Không được để
   người bệnh thật dùng ở trạng thái này** — ai đọc được log là đăng nhập được vào tài khoản bất kỳ.
   Có cổng SMS rồi thì đổi sang `Production` và khai `OtpSender` theo
   [`external-services-setup.md`](external-services-setup.md) §1.
3. **`HIS_JWT_KEY` đang là giá trị ngẫu nhiên** → web quản trị chưa đăng nhập được. Phải đặt **trùng**
   `Jwt:Key` của HIS Core.

### Build APK trỏ vào bản UAT

```bash
cd mobile/patient_app
fvm flutter build apk --debug --split-per-abi -t lib/main_dev.dart \
  --dart-define=API_BASE_URL=https://patientapp.14-225-83-93.nip.io/api/v1
# → build/app/outputs/flutter-apk/app-arm64-v8a-debug.apk
```
