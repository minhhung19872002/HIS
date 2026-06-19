# Runbook — Rotate secret bị lộ trong git history (#182 SEC-3)

> **Ai làm:** USER (cần quyền Cloud Run / Cloud SQL / Orthanc VM — máy dev này KHÔNG có quyền cloud).
> **Vì sao bắt buộc:** các secret dưới đã/đang nằm trong **git history** (`backend/src/HIS.API/appsettings.json`) → không thể "xoá khỏi history" an toàn ⇒ **phải rotate** (đổi giá trị thật). Đổi env trên Cloud Run là đủ để vô hiệu giá trị cũ.
>
> **Code đã sẵn sàng:** mọi secret đọc qua `IConfiguration` ⇒ env var (dạng `A__B`) **override** appsettings. KHÔNG cần sửa code. Giá trị trong `appsettings.json` chỉ phục vụ **local dev** (giữ nguyên).

## 0. Xác minh prod đang dùng giá trị nào (TRƯỚC khi rotate)
```bash
gcloud run services describe his-api --region asia-southeast1 \
  --format='value(spec.template.spec.containers[0].env)' | tr ',' '\n' | grep -iE 'Jwt__Key|ConnectionStrings|PACS__|HashSecret'
```
- Nếu **đã có** `Jwt__Key`/`ConnectionStrings__DefaultConnection`/`PACS__Password` env (khác giá trị appsettings) ⇒ prod KHÔNG dùng giá trị lộ; vẫn nên rotate Jwt:Key (đã từng lộ).
- Nếu **THIẾU** ⇒ prod đang chạy bằng giá trị lộ ⇒ **rotate GẤP**.

## 1. 🔴 Jwt:Key (CRITICAL — ưu tiên #1)
Giá trị lộ: `HIS_SuperSecretKey_2024_ChangeThisInProduction_MinLength32Chars`.
Rủi ro: ai có repo → ký JWT giả → mạo danh bất kỳ user/role. **Rotate = mọi token hiện tại hết hiệu lực, user đăng nhập lại (chấp nhận được).**
```bash
# Sinh key ngẫu nhiên mạnh (>=32 ký tự)
NEWKEY=$(openssl rand -base64 48)
gcloud run services update his-api --region asia-southeast1 \
  --update-env-vars "Jwt__Key=$NEWKEY"
```

## 2. 🟠 Cloud SQL password (ConnectionStrings:DefaultConnection)
Giá trị lộ: `HisDocker2024Pass#` (đây là pwd **docker LOCAL**; nếu Cloud SQL cũng dùng pwd này thì đổi).
```bash
# Đổi pwd user DB trên Cloud SQL (vd user 'sqlserver' hoặc 'sa'):
gcloud sql users set-password <DB_USER> --instance=<INSTANCE> --password='<NEW_STRONG_PWD>'
# Cập nhật connection string env (giữ Encrypt/TrustServerCertificate như prod hiện tại):
gcloud run services update his-api --region asia-southeast1 \
  --update-env-vars '^@^ConnectionStrings__DefaultConnection=Server=<HOST>;Database=HIS;User Id=<DB_USER>;Password=<NEW_STRONG_PWD>;Encrypt=True'
```
(Dùng delimiter `^@^` vì connection string có dấu `;`.)

## 3. 🟠 Orthanc PACS password
Giá trị lộ: user `admin` / pwd `orthanc`.
```bash
# Trên Orthanc VM (168.110.52.7): đổi pwd trong cấu hình Orthanc (RegisteredUsers) rồi restart Orthanc.
# Cập nhật env Cloud Run:
gcloud run services update his-api --region asia-southeast1 \
  --update-env-vars "PACS__Username=<NEW_USER>,PACS__Password=<NEW_PWD>"
```

## 4. 🟢 VNPay HashSecret (khi go-live thật)
Hiện là `SANDBOXSECRETKEY...` (sandbox, chưa rủi ro). Khi tích hợp VNPay thật:
```bash
gcloud run services update his-api --region asia-southeast1 \
  --update-env-vars "PaymentGateway__VnPay__TmnCode=<REAL>,PaymentGateway__VnPay__HashSecret=<REAL_SECRET>"
```

## 5. Liên quan (ngoài #182, nhắc kèm)
- **R2 API token** (Cloudflare, lưu PACS DICOM) → Issue #25 (đã có TODO rotate).

## Sau khi rotate
1. `gcloud run services describe his-api ...` xác minh env mới đã set.
2. Test đăng nhập prod (`admin`/`Admin@123`) — phải lấy token mới OK (token cũ đã chết do đổi Jwt:Key).
3. Smoke 1 API có `[Authorize]` → 200.
4. (Khuyến nghị) Thêm startup-guard fail-fast nếu `Jwt:Key` còn giá trị default trong môi trường Production — **chưa thêm** (rủi ro crash prod nếu env chưa set); cân nhắc sau khi đã rotate xong.

> Cross-ref: `CLAUDE.md` mục Secrets · Issue #182 · #25 (R2 token).
