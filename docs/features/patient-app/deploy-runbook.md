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
| `HisJwt__Key` | Khoá xác thực nhân viên — thiếu là web quản trị không đăng nhập được |
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
| Web quản trị đăng nhập được HIS nhưng vào màn app bị 401 | `HisJwt__Key` trên BFF phải **trùng** `Jwt:Key` của HIS Core |
| Giấy tờ mở ra báo lỗi giải mã | `DocumentVault__Key` có bị đổi không · ổ đĩa `patientapp_vault` có được gắn đúng không |
| Thông báo không tới máy người bệnh | Bảng điều khiển: *"thiết bị nhận được thông báo đẩy"* · cấu hình Firebase · relay trên VPS còn sống không |
| Cần chặn khẩn một bản app hỏng | Nâng `AppRelease__MinimumAndroidVersion` — xem [`store-release-checklist.md`](store-release-checklist.md) §7 |
