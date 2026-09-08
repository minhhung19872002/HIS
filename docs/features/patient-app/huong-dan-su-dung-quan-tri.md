# Hướng dẫn sử dụng — Quản trị app bệnh nhân và tra cứu CSKH

> Dành cho quản trị hệ thống, lễ tân và nhân viên chăm sóc khách hàng. Bàn giao theo HSMT mục I.3.

---

## 0. Ai làm được việc gì

| Việc | Vai trò cần có |
|---|---|
| Bảng điều khiển, tài khoản, nhóm gia đình, thông báo, nhật ký | Admin · Quản trị hệ thống · Director · Manager |
| Tra cứu hộ người bệnh (web và app) | Thêm: Lễ tân · Điều dưỡng · Bác sĩ · Trưởng khoa |

Vai trò gán ở màn **Quản trị hệ thống → Người dùng** của HIS. Không có bảng phân quyền riêng cho app —
cố ý như vậy: một danh tính, một chỗ thu hồi.

Nhân viên chưa được cấp quyền sẽ thấy **thông báo giải thích**, không phải một màn hình trống.

---

## 1. Bảng điều khiển — `/v2/patient-app`

Ba nhóm số, đổi được khoảng thời gian (7 / 30 / 90 / 365 ngày):

- **Tài khoản** — tổng số, đã liên kết hồ sơ, đăng ký mới, có hoạt động, đang bị khoá.
- **Sử dụng** — thiết bị đang đăng nhập, thiết bị nhận được thông báo đẩy, lượt lấy số, lượt đặt khám,
  liên kết gia đình, giấy tờ trong ví.
- **Thông báo** — đã gửi và tỉ lệ đã đọc.

Kèm biểu đồ **đăng ký theo ngày**.

> ⚠️ Nếu thấy cảnh báo **"Chưa có thiết bị nào nhận được thông báo đẩy"**: bệnh viện chưa cấu hình
> Firebase. Thông báo vẫn vào hộp thư trong app, nhưng người bệnh không thấy trên màn hình khoá.
> Xem [`external-services-setup.md`](external-services-setup.md) §2.

---

## 2. Tài khoản người bệnh — `/v2/patient-app/accounts`

Tìm theo **số điện thoại**, **họ tên** hoặc **mã bệnh nhân**. Lọc theo trạng thái.

Chạm một dòng để xem chi tiết. Hai nút thao tác ở cuối mỗi dòng:

### Khoá / mở khoá tài khoản
Bấm biểu tượng ổ khoá, nhập **lý do** (ghi vào nhật ký), xác nhận.

> **Khoá có hiệu lực NGAY.** Hệ thống xoay con dấu bảo mật của tài khoản, nên mọi thiết bị đang đăng
> nhập bị đăng xuất lập tức — không phải chờ token cũ hết hạn.

### Đặt lại mật khẩu
Bấm biểu tượng khiên → xác nhận. Hệ thống hiện **mật khẩu tạm** trong một hộp thoại (không phải toast,
vì bạn cần đọc nó cho người bệnh).

Mật khẩu tạm cố ý **bỏ các ký tự dễ nghe nhầm** qua điện thoại: không có `0`/`O`, không có `1`/`l`/`I`.

Người bệnh **bắt buộc đổi mật khẩu** ở lần đăng nhập kế tiếp — vì mật khẩu đó bạn đã biết.

---

## 3. Nhóm gia đình — `/v2/patient-app/families`

Trả lời một câu duy nhất nhưng quan trọng: **ai đang xem được hồ sơ của ai**.

Mỗi dòng cho biết người xem, hồ sơ được xem, quan hệ khai báo, **cách đã xác minh**, và quyền xem kết
quả có đang bật không.

**Gỡ liên kết** bằng nút ✕, nhập lý do. Có hiệu lực **ngay ở lần gọi API kế tiếp** của app.

> Hai cách xác minh hợp lệ (xem [D14](decisions.md)):
> - *"Người thân tự xác nhận bằng OTP"* — người thân có tài khoản app và đã đọc mã cho người xin.
> - *"Khai đúng CCCD / ngày sinh trên hồ sơ"* — người thân chưa có tài khoản (trẻ nhỏ, người già).
>
> Thấy một liên kết trông bất thường (ví dụ một tài khoản kết nối với nhiều người không cùng gia đình)
> thì gỡ và đối chiếu lại với nhật ký truy cập.

---

## 4. Thông báo tới app — `/v2/patient-app/notifications`

### Soạn một đợt gửi

Bấm **Soạn thông báo**:

| Trường | Ghi chú |
|---|---|
| Tiêu đề | Tối đa 200 ký tự |
| Nội dung | Tối đa 2000 ký tự. **Không đưa thông tin bệnh án vào đây** — nội dung này đi qua hạ tầng thông báo bên ngoài |
| Nhóm | Thông báo bệnh viện · Hệ thống |
| Gửi tới | Tất cả · Đã liên kết hồ sơ · Có lịch hẹn trong 7 ngày tới |
| Hẹn giờ gửi | Bỏ trống = gửi ngay |
| Mở màn hình | Không bắt buộc. Ví dụ `/results`, `/appointments` |

Chọn **Tất cả** và gửi ngay thì hệ thống hỏi lại một lần nữa — **đã gửi là không thu hồi được**.

### Theo dõi

Bảng lịch sử hiện: đối tượng, trạng thái, số người nhận, **số đã đọc và tỉ lệ**, người soạn.

Chiến dịch **đã hẹn giờ nhưng chưa gửi** thì huỷ được bằng nút ✕. Đã gửi thì không.

Chiến dịch **gửi lỗi** hiện lý do trong ngăn chi tiết — mở ra để biết cần sửa gì rồi gửi lại.

---

## 5. Tra cứu hộ người bệnh — `/v2/patient-app/lookup`

Một ô tìm kiếm, **ba cách tra** ứng với ba tình huống ở quầy:

| Người bệnh có gì | Nhập gì |
|---|---|
| Đưa thẻ khám bệnh | Mã bệnh nhân |
| Gọi điện tới | Số điện thoại |
| Chỉ có giấy tờ tuỳ thân | Số CCCD/CMND |

Tối thiểu 3 ký tự.

Kết quả hiện luôn **trạng thái tài khoản app** — câu hỏi hay gặp nhất ở quầy là *"sao tôi không đăng
nhập được"*, và câu trả lời thường nằm ngay ở cột đó:

| Nhãn | Nghĩa | Xử lý |
|---|---|---|
| Chưa có | Người bệnh chưa cài app | Hướng dẫn tải và đăng ký |
| Bị khoá | Quản trị đã khoá | Hỏi quản trị lý do trước khi mở |
| Chờ đổi mật khẩu | Vừa được đặt lại mật khẩu | Nhắc họ đăng nhập bằng mật khẩu tạm rồi đổi |
| Hoạt động | Bình thường | Nếu vẫn không vào được: hỏi họ nhập đúng số điện thoại chưa |

Chạm một dòng để mở ngăn chi tiết, có đủ để trả lời ngay:
số thứ tự hôm nay · lịch hẹn · xét nghiệm gần đây · chẩn đoán hình ảnh · đơn thuốc · đợt nội trú.

Nút **Xem ai đã mở hồ sơ này** hiện nhật ký truy cập — dùng khi người bệnh hỏi *"ai đã xem hồ sơ của
tôi"*.

Nút **Đặt lại mật khẩu** làm việc tương tự mục 2.

> **Mọi lần tra cứu đều được ghi lại** kèm mã nhân viên. Tra hồ sơ người bệnh là việc bình thường hằng
> ngày, nhưng chính vì nó thường xuyên nên lạm dụng mới dễ chìm đi.

---

## 6. Tra cứu trên điện thoại

Cùng bộ chức năng, dùng ngay trên máy của nhân viên.

1. Mở app **HIS Người bệnh** → màn đăng nhập → cuối màn có dòng **"Dành cho nhân viên bệnh viện"**.
2. Đăng nhập bằng **tài khoản HIS** của bạn (không phải tài khoản người bệnh).
3. Tra cứu và xem hồ sơ như trên web.

> **Phiên nhân viên không lưu xuống máy.** Đóng app là mất phiên, phải đăng nhập lại. Máy ở quầy hay
> được dùng chung, và một phiên tra cứu sống qua đêm là một phiên không ai chịu trách nhiệm.

---

## 7. Nhật ký truy cập

API: `GET /admin/patient-app/audit-logs`, lọc theo hồ sơ bệnh nhân, tài khoản, hành động, khoảng thời
gian.

Mỗi bản ghi trả lời: **ai xem** (tài khoản app hoặc mã nhân viên HIS) · **hồ sơ của ai** · **hành động
gì** · **lúc nào** · **từ địa chỉ IP nào**.

Bảng này **chỉ thêm, không sửa không xoá**.

Những hành động đáng chú ý khi rà soát:

| Hành động | Nghĩa |
|---|---|
| `staff_search_patient`, `staff_view_patient_summary` | Nhân viên tra cứu |
| `family_link_verified` | Một người vừa được quyền xem hồ sơ người khác |
| `admin_lock`, `admin_reset_password` | Thao tác quyền lớn của quản trị |
| `view_*` với `ActorType = patient` | Người bệnh hoặc người nhà xem hồ sơ |

---

## 8. Xử lý sự cố thường gặp

**Người bệnh báo không nhận được mã OTP**
Kiểm tra: số có đúng không · đã xin quá 3 lần trong 15 phút chưa (hệ thống tạm dừng) · nhà mạng có
chặn tin brandname không. Cùng đường: đặt lại mật khẩu hộ tại quầy.

**Người bệnh nói "app không thấy kết quả của tôi"**
Gần như luôn là tài khoản **chưa liên kết hồ sơ**. Tra ở mục 5, cột *Tài khoản app*. Nếu đã liên kết
mà vẫn trống: kiểm tra kết quả đã được bác sĩ duyệt chưa.

**Người nhà không xem được hồ sơ dù đã kết nối**
Kiểm tra ở mục 3: trạng thái phải là *Đã xác minh* **và** cột *Quyền xem KQ* phải bật. Chính chủ tài
khoản có thể đã tắt quyền đó.

**Thông báo gửi đi nhưng người bệnh không thấy trên màn hình khoá**
Bình thường nếu chưa cấu hình Firebase (xem cảnh báo ở mục 1). Thông báo vẫn nằm trong hộp thư của
app.

**Nghi ngờ một tài khoản bị chiếm**
Khoá tài khoản ngay (mục 2) → mọi thiết bị bị đăng xuất lập tức → rà nhật ký truy cập của hồ sơ đó
(mục 7) → đặt lại mật khẩu → mở khoá và bàn giao mật khẩu tạm cho đúng người.
