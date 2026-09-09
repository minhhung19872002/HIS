# Khoá bí mật của VPS

Thư mục này được gắn vào relay ở `/run/secrets` (chỉ đọc). **Không commit file khoá nào vào đây.**

## `fcm-service-account.json`

Khoá tài khoản dịch vụ Firebase, tải ở *Firebase Console → Project settings → Service accounts →
Generate new private key*. Đặt đúng tên đó vào thư mục này rồi `docker compose up -d` lại.

**Chưa có file này thì relay chạy ở chế độ giả**: thông báo chỉ được ghi vào log chứ không tới máy
người bệnh. Kiểm bằng `curl http://127.0.0.1/health` → `"mode":"fake"` (có khoá thật thì là `"fcm"`).
Chế độ giả tồn tại để dựng được cả tầng VPS và nghiệm thu mục II của HSMT khi bệnh viện chưa cấp
khoá — xem `docs/features/patient-app/external-services-setup.md` §2.

> ⚠️ Trước khi phát hành tới người bệnh thật, phải kiểm `mode` là `fcm`. Chế độ giả trả 200 cho mọi
> lời gọi nên không có gì báo động: mọi thứ trông như đang chạy tốt, chỉ có thông báo là không tới.
