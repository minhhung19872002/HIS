# Đối chiếu công nghệ tương đương — App hỗ trợ người bệnh

> HSMT I.1.1: *"Toàn bộ hệ thống thiết kế theo công nghệ nhúng trên nền Linux, tích hợp bản quyền hệ
> điều hành và cơ sở dữ liệu — **hoặc công nghệ tương đương**."*
>
> Tài liệu này giải trình phương án đã chọn và vì sao nó **tương đương hoặc tốt hơn** yêu cầu gốc.

---

## 1. Yêu cầu gốc và cách đọc

Yêu cầu HSMT có ba vế:

| Vế | Ý nghĩa thực chất |
|---|---|
| "công nghệ nhúng" | Hệ thống chạy như một khối đóng gói sẵn, cài đặt và vận hành không cần chuyên gia dựng từng phần |
| "trên nền Linux" | Hệ điều hành máy chủ là Linux |
| "tích hợp bản quyền HĐH và CSDL" | Bệnh viện không phải mua thêm giấy phép, và không có rủi ro pháp lý về bản quyền |

Đọc theo tinh thần: bệnh viện muốn **một hệ thống chạy được ngay, hợp pháp, không phát sinh chi phí
giấy phép, và không phụ thuộc vào một chuyên gia duy nhất để dựng lại**.

---

## 2. Phương án đã chọn

| Thành phần | Công nghệ | Bản quyền | Chi phí |
|---|---|---|---|
| Hệ điều hành máy chủ | **Ubuntu Server 22.04 LTS** | Miễn phí, mã nguồn mở | 0 |
| Đóng gói ứng dụng | **Docker Engine** (Apache-2.0) | Miễn phí, mã nguồn mở | 0 |
| Cơ sở dữ liệu app | **PostgreSQL 16** (PostgreSQL License) | Miễn phí, mã nguồn mở | 0 |
| Nền tảng chạy | **.NET 9** (MIT) | Miễn phí, mã nguồn mở | 0 |
| Proxy + chứng chỉ TLS | **Caddy 2** (Apache-2.0) | Miễn phí, mã nguồn mở | 0 |
| Chứng chỉ số | **Let's Encrypt DV** | Miễn phí, tự gia hạn | 0 |
| Ứng dụng di động | **Flutter 3.32.8** (BSD-3) | Miễn phí, mã nguồn mở | 0 |

**Tổng chi phí bản quyền phần mềm: 0 đồng.** Không thành phần nào đòi giấy phép trả tiền, giấy phép
theo CPU, hay giấy phép theo số người dùng.

---

## 3. Đối chiếu từng vế

### 3.1 "Công nghệ nhúng" ⟷ Docker Compose

Yêu cầu gốc hướng tới một hệ thống **đóng gói sẵn, cài là chạy**. Docker Compose làm đúng việc đó, và
làm chặt hơn:

- Toàn bộ hệ thống mô tả trong **một tệp `docker-compose.yml`** — phiên bản từng thành phần, biến môi
  trường, mạng, ổ đĩa, kiểm tra sức khoẻ. Dựng lại trên một máy trắng chỉ là `docker compose up -d`.
- **Phiên bản khoá cứng theo thẻ ảnh**: máy ở bệnh viện và máy ở nhà thầu chạy **cùng một byte**.
  Thiết bị nhúng truyền thống không đảm bảo được điều này khi phải vá lỗi.
- **Nâng cấp và quay lui bằng cách đổi thẻ ảnh**, không phải nạp lại firmware.
- Không phụ thuộc phần cứng riêng: chạy trên máy chủ vật lý, máy ảo, hay đám mây đều như nhau. Thiết
  bị nhúng chuyên dụng thì **hỏng là phải chờ nhà cung cấp**.

> **Điểm hơn rõ nhất:** với thiết bị nhúng, khi nhà cung cấp ngừng hỗ trợ, bệnh viện mắc kẹt. Với
> Docker trên Linux, bất kỳ đơn vị nào biết Docker đều tiếp quản được.

### 3.2 "Trên nền Linux" ⟷ Đáp ứng nguyên văn

Ubuntu Server 22.04 LTS, hỗ trợ bảo mật tới **tháng 4/2027** (mở rộng tới 2032 nếu mua Ubuntu Pro).
Các container đều dựa trên nền Linux (`mcr.microsoft.com/dotnet/aspnet:9.0`, `postgres:16-alpine`).

Kiểm chứng khi nghiệm thu:

```bash
lsb_release -a          # Ubuntu 22.04 LTS
uname -a                # Linux ... x86_64
docker version          # Server: Docker Engine
docker compose ls       # danh sách stack đang chạy
```

### 3.3 "Tích hợp bản quyền HĐH và CSDL" ⟷ Giấy phép mã nguồn mở

Yêu cầu gốc nhằm tránh cho bệnh viện hai rủi ro: **phát sinh chi phí** và **vi phạm bản quyền**. Cả
hai đều được loại bỏ bằng cách chọn phần mềm mã nguồn mở:

| Phần mềm | Giấy phép | Cho phép dùng thương mại | Ràng buộc |
|---|---|---|---|
| Ubuntu Server | GPL và các giấy phép tương thích | Có | Không |
| PostgreSQL | PostgreSQL License (kiểu BSD) | Có | Không |
| Docker Engine | Apache-2.0 | Có | Không |
| .NET 9 | MIT | Có | Không |
| Caddy | Apache-2.0 | Có | Không |
| Flutter | BSD-3-Clause | Có | Không |

Không có thành phần nào dùng giấy phép AGPL hay "source-available" (như SSPL, BSL) — những giấy phép
đó có thể phát sinh nghĩa vụ khi triển khai cho bên thứ ba.

> **So sánh:** một hệ nhúng "tích hợp bản quyền" thường bao gồm giấy phép Windows Embedded và SQL
> Server, hết hạn theo chu kỳ và phải gia hạn. Phương án này **không có ngày hết hạn giấy phép nào**.

---

## 4. Bảng kê để đưa vào hồ sơ nghiệm thu

Chạy trên máy chủ tại data center và đính kèm kết quả:

```bash
# Hệ điều hành và bản quyền
lsb_release -a
cat /etc/os-release

# Nền chạy đóng gói
docker version
docker compose version

# Phiên bản CSDL và giấy phép
docker exec patientapp-postgres psql -U patientapp -c "SELECT version();"
docker exec patientapp-postgres cat /usr/share/doc/postgresql-common/copyright | head -20

# Danh sách ảnh đang chạy, khoá theo digest
docker compose -f deploy/patient-app/docker-compose.yml images
```

Kèm theo:
- Bản in tệp `deploy/patient-app/docker-compose.yml` và `deploy/patient-app-vps/docker-compose.yml`
- Bản in giấy phép của từng thành phần trong bảng §3.3
- Ảnh chụp `docker compose ps` cho thấy mọi dịch vụ `healthy`

---

## 5. Kiến trúc triển khai

```
┌─────────────────── DATA CENTER BỆNH VIỆN ───────────────────┐
│  Ubuntu Server 22.04 LTS                                     │
│                                                              │
│   ┌────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│   │  HIS Core  │◄──│ patientapp-  │──►│ patientapp-      │   │
│   │  (sẵn có)  │   │ api  (BFF)   │   │ postgres         │   │
│   └────────────┘   └──────┬───────┘   └──────────────────┘   │
│                           │ 127.0.0.1:8090                   │
└───────────────────────────┼──────────────────────────────────┘
                            │ đường hầm ra, KHÔNG mở cổng vào
┌───────────────────────────▼──────────── VPS CLOUD ───────────┐
│  Ubuntu + Caddy (TLS Let's Encrypt) + notification-relay      │
│  CHỈ chuyển tiếp thông báo đẩy. KHÔNG lưu dữ liệu y tế.        │
└───────────────────────────┬───────────────────────────────────┘
                            │ HTTPS
                    App người bệnh · Web quản trị
```

**Dữ liệu y tế không bao giờ rời data center bệnh viện.** VPS chỉ giữ device token và nội dung thông
báo — thứ vốn không chứa thông tin bệnh án (xem `AppNotification.DataJson`, chỉ để id).

---

## 6. Rủi ro và cách xử lý

| Rủi ro | Xử lý |
|---|---|
| Ubuntu 22.04 hết hạn hỗ trợ (4/2027) | Nâng lên 24.04 LTS — container không đổi, chỉ nâng máy chủ |
| Docker Desktop đổi chính sách giấy phép | Không dùng Docker Desktop trên máy chủ; **Docker Engine** trên Linux vẫn Apache-2.0 |
| Mất máy chủ vật lý | `docker compose up -d` trên máy mới + khôi phục ổ đĩa `patientapp_pgdata` từ bản sao lưu |
| Let's Encrypt gián đoạn | Caddy đổi được sang nhà cung cấp ACME khác bằng một dòng cấu hình |
| Không ai trong bệnh viện biết Docker | Kỹ năng phổ thông, tài liệu tiếng Việt sẵn có, thuê ngoài dễ — khác hẳn hệ nhúng độc quyền |
