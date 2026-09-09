# Nhật ký quyết định — App Mobile Hỗ trợ Người bệnh

> Mỗi dòng là một lựa chọn kỹ thuật đã tự quyết trong quá trình làm, kèm **lý do** và **cái đánh đổi**.
> Nguyên tắc chung: chọn phương án **đơn giản nhất đáp ứng đúng câu chữ HSMT**.
>
> 🔗 [`README.md`](README.md) · [`acceptance-matrix.md`](acceptance-matrix.md) ·
> [`external-services-setup.md`](external-services-setup.md)

---

## D1 — Project riêng `HIS.PatientApp.Api`, không tham chiếu HIS Core

**Chọn:** dựng project mới trong cùng solution, **cố ý không** tham chiếu
`HIS.Core`/`HIS.Application`/`HIS.Infrastructure`.

**Lý do:** HSMT I.1 đòi *"tích hợp module kết nối với HIS **dựa trên các API HIS cung cấp**"*. Tham
chiếu thẳng project sẽ biến BFF thành một phần của HIS chứ không phải hệ thống kết nối qua API — và
kéo EF SqlServer, fo-dicom, itext7, Pkcs11 vào một dịch vụ mở ra Internet.

**Đánh đổi:** thiếu endpoint nào thì phải bổ sung vào HIS Core rồi gọi qua HTTP, chậm hơn gọi thẳng.

---

## D2 — CSDL riêng trên PostgreSQL

**Chọn:** `HIS.PatientApp.Api` dùng PostgreSQL riêng, không đụng schema HIS.

**Lý do:** quyết định của chủ đầu tư 2026-09-08, theo đúng thiết kế trong prompt gốc §3.

**Đánh đổi:** thêm một engine CSDL vào hệ thống vốn thuần SQL Server; backup và vận hành thành hai
quy trình.

---

## D3 — Pin Flutter 3.32.8 để giữ iOS 12.0

**Chọn:** ghim Flutter **3.32.8** qua FVM (`.fvmrc`), không dùng bản mới nhất.

**Lý do:** HSMT ghi *"iOS 12.0 trở lên"*. Xác minh trên repo Flutter: mức tối thiểu nâng 12 → 13 ở
commit `09d4dabd6d6`, tag stable đầu tiên chứa nó là **3.35.0**; sau đó 13 → 15. Vậy 3.32.8 là bản
cuối cùng còn target iOS 12.0.

**Đánh đổi:** SDK không còn nhận bản vá bảo mật; 7 gói phải ghim ở bản cũ. Có
`scripts/check-ios-min-deployment-target.py` chạy trong CI để chặn nâng nhầm.

---

## D4 — Chữ ký sinh trắc dùng RSA-2048 thay vì ECDSA P-256

**Chọn:** `biometric_signature` **6.x**, chữ ký `SHA256withRSA` (PKCS#1 v1.5).

**Lý do:** bản 13.x dùng ECDSA nhưng podspec khai `s.platform = :ios, '13.0'` → mất iOS 12. Bản 6.x
còn khai 12.0.

**Đánh đổi:** RSA-2048 chậm hơn và khoá dài hơn ECDSA P-256. Không đáng kể với một lần ký mỗi lần
đăng nhập.

---

## D5 — Podfile dùng thư viện tĩnh + `use_modular_headers!`

**Chọn:** **không** `use_frameworks!`.

**Lý do:** Firebase iOS SDK 10.x (nhánh cuối còn hỗ trợ iOS 12) có pod `Firebase` chỉ-có-header nên
CocoaPods không dựng framework cho nó được → header không modular. Bật `use_frameworks!` thì
`firebase_messaging` thành framework module và import đúng header đó → Xcode chặn. Bỏ framework thì
lệnh import chỉ là include thường.

**Đã thử và không hiệu quả** (ghi lại để khỏi lặp): chỉ đặt
`CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES`; `use_frameworks! :linkage => :static`; khai
`:modular_headers => true` riêng từng pod Firebase; tắt `ENABLE_MODULE_VERIFIER`; `use_frameworks!`
kèm `use_modular_headers!`.

---

## D6 — STT ưu tiên: đối chiếu được thì kiểm, không đối chiếu được thì gắn cờ

**Chọn:** tuổi suy từ ngày sinh trong hồ sơ (≥60 hoặc <6 → ưu tiên, **kể cả khi không khai**); lý do
không kiểm được (có thai, khuyết tật nặng, người có công) vẫn cấp số ưu tiên nhưng đặt
`PriorityVerified = false` để lễ tân xác minh khi gọi; **cấp cứu không cấp qua app**.

**Lý do:** tin thẳng lời khai thì ai cũng khai ưu tiên và người ưu tiên thật bị thiệt; chặn hết những
gì không kiểm được thì tính năng thành vô nghĩa.

**Đánh đổi:** vé chưa xác minh vẫn được xếp trước trong hàng đợi cho tới lúc lễ tân gọi.

---

## D7 — Slot đặt khám đọc `DoctorSchedule`, có khung giờ dự phòng

**Chọn:** `GetAvailableSlotsAsync` đọc lịch trực thật; ưu tiên lịch đúng ngày, không có thì lấy lịch
lặp hàng tuần; **không tìm được lịch nào thì rơi về khung hành chính** 7:30-11:30 / 13:30-16:30.

**Lý do:** khung giờ cứng cũ cho phép đặt vào giờ bác sĩ không trực — người bệnh đến nơi mới biết.
Nhưng nếu khoa chưa kịp khai lịch mà hiện "hết chỗ" thì còn tệ hơn, nên giữ đường lui.

**`MaxPatients` của cả ca được chia đều cho số slot** để tổng số người nhận trong ca không vượt con số
bác sĩ đã đăng ký.

---

## D8 — Dịch vụ ngoài đều có bản thật + bản giả, mặc định chạy bản giả

**Chọn:** OTP SMS, FCM/APNs, PACS… mỗi thứ một interface với hai cài đặt; chọn bằng cấu hình; môi
trường demo mặc định dùng bản giả.

**Lý do:** để demo end-to-end được ngay khi chưa có credential, mà không để lại đường tắt trong bản
thật.

**Ràng buộc tự đặt:** bản giả **chỉ được bật khi cấu hình nói rõ**; chạy ở môi trường thật mà thiếu
cấu hình dịch vụ thật thì ứng dụng **ném lỗi lúc khởi động** chứ không âm thầm dùng bản giả.
Danh sách credential cần cấp: [`external-services-setup.md`](external-services-setup.md).

---

## D9 — Connector bóc vỏ `{success,data}` một cách khoan dung

**Chọn:** `HisRestConnector.ReadPayloadAsync` tự nhận ra lớp vỏ `{success, data, message, errors,
meta}` mà HIS.API bọc quanh mọi phản hồi, và cũng chấp nhận phản hồi trần.

**Lý do:** đoán sai lớp vỏ **không** làm request lỗi — `System.Text.Json` chỉ trả về đối tượng toàn
giá trị mặc định. Triệu chứng ngoài đời là "lấy số thành công" nhưng mã vé rỗng và danh sách khoa
trống, tức là hỏng âm thầm, khó lần ra hơn hẳn một lỗi 500. Đã bị đúng lỗi này ở lần chạy smoke
Phase 2 đầu tiên: 4/15 ca hỏng vì cùng một nguyên nhân.

**Đánh đổi:** một phản hồi *thật sự* có hai trường tên `success` và `data` sẽ bị bóc nhầm. Chấp nhận
được vì đó chính là quy ước envelope của HIS, không phải trùng hợp.

---

## D10 — Chống lấy trùng số thứ tự đặt ở BFF, không đặt ở HIS

**Chọn:** HIS chỉ chặn trùng khi **biết đích danh bệnh nhân** (`PatientId != null`); phép chặn theo
người dùng app nằm ở BFF, dựa trên bảng `app_queue_tickets` với chỉ số duy nhất
`(AccountId, RoomId, QueueDate)`.

**Lý do:** điều kiện cũ `t.PatientId == dto.PatientId` với cả hai vế `null` được EF dịch thành
`PatientId IS NULL AND @p IS NULL` — nghĩa là **một** vé vô danh trong phòng chặn mọi khách vãng lai
tiếp theo của cả ngày hôm đó. Tài khoản app chưa liên kết hồ sơ thì bên HIS đúng là khách vô danh,
nên HIS không có cơ sở nào để nói hai người là một; danh tính duy nhất tồn tại là tài khoản app.

**Được thêm:** có bảng này thì API hỏi trạng thái vé mới kiểm được vé có phải của người đang đăng nhập
không — vé của người khác trả 404 y như vé không tồn tại. Trước đó ai cầm được id vé cũng tra được.

**Đánh đổi:** một người dùng hai tài khoản app vẫn lấy được hai số. Chặn việc đó cần định danh thật
(liên kết hồ sơ), thuộc phần liên kết hồ sơ bệnh án.

---

## D11 — App hiện bảng chỉ số gốc, không nhúng PDF kết quả xét nghiệm

**Chọn:** màn kết quả xét nghiệm dựng **bảng chỉ số từ dữ liệu** (`ServiceRequestDetailParameters`),
không tải và nhúng tệp PDF. Trường `ReportUrl` trong DTO vẫn trỏ tới `api/portal/lab-results/{id}/pdf`
để bản in dùng sau.

**Lý do:** HSMT viết "xem file kết quả xét nghiệm". Cái người bệnh cần là **đọc được kết quả**, và
bảng dữ liệu làm việc đó tốt hơn hẳn một ảnh PDF trên màn hình 5 inch: chữ không vỡ khi phóng to, đọc
được bằng trình đọc màn hình, và tô được cờ bất thường ngay tại dòng. Nhúng PDF còn kéo theo
`pdfrx` — một trong những gói phải ghim bản cũ vì iOS 12 (xem [D3](decisions.md)).

**Đánh đổi:** kết quả nào LIS chỉ trả một khối văn bản (máy chưa nối, KTV gõ tay) thì bảng chỉ có một
dòng. Đã xử lý: rơi về hiển thị nguyên khối kết quả + kết luận thay vì bảng rỗng.

**Còn nợ:** endpoint PDF thật để in/gửi email — gộp vào phần in ấn ở Phase 7.

---

## D12 — Kiểm chủ sở hữu phiếu kết quả đặt ở HIS, không chỉ ở BFF

**Chọn:** các route chi tiết `api/portal/{lab,imaging,functional}-results/{id}` nhận thêm
`patientId`; HIS tự đối chiếu phiếu có thuộc hồ sơ đó không rồi trả 404 nếu không. BFF luôn gửi kèm
id hồ sơ của tài khoản đang đăng nhập.

**Lý do:** token BFF gửi sang HIS là **tài khoản dịch vụ** — nó đọc được hồ sơ của bất kỳ ai. Nếu phép
kiểm chỉ nằm ở BFF thì toàn bộ hồ sơ bệnh án của bệnh viện chỉ cách một dòng code bị quên. Đặt thêm
một lớp ngay tại HIS khiến lỗ hổng cần **hai** sai sót độc lập mới mở ra.

Cách cũ (BFF tải danh sách của mình rồi tìm id trong đó) vừa tốn một lượt gọi thừa, vừa **sai**: danh
sách bị giới hạn 30 phiếu gần nhất, nên phiếu cũ hơn sẽ bị chính chủ nhìn thành 404.

**Ảnh hưởng tương thích:** `patientId` là tuỳ chọn; không truyền thì hành vi của nhân viên tra cứu giữ
nguyên như trước. Token `PortalPatient` vẫn luôn lấy hồ sơ từ claim.

---

## D13 — Số thứ tự thực hiện CLS suy ra từ vé xếp hàng, không thêm cột vào CSDL

**Chọn:** ghép chỉ định cận lâm sàng với vé xếp hàng theo bộ ba **(bệnh nhân, phòng thực hiện,
ngày)**, thay vì thêm cột `ServiceRequestDetailId` vào bảng `QueueTickets`.

**Lý do:** HIS chưa có liên kết nào giữa hai thứ đó. Thêm cột thì phải sửa cả luồng phát số ở lễ tân
và luồng điều phối CLS để điền vào — một thay đổi lan rộng qua vùng đang chạy thật, chỉ để hiển thị
một con số. Phép ghép theo bộ ba là đúng cách một điều dưỡng đối chiếu bằng mắt, và dùng được ngay
trên dữ liệu đang có.

**Hệ quả đã biết, chấp nhận:** hai chỉ định cùng phòng trong cùng ngày sẽ hiện **cùng một số**. Đó
lại chính là thực tế — người bệnh cũng chỉ xếp hàng một lần cho cả hai. Số thứ tự luôn hiện kèm tên
phòng nên không bị hiểu nhầm là hai số khác nhau.

**Sẽ đổi khi:** bệnh viện muốn mỗi chỉ định một số riêng. Lúc đó thêm cột liên kết là đúng, và chỗ
đọc ở đây chỉ cần đổi một hàm.

---

## D14 — Kết nối gia đình có đúng hai đường xác minh, không có đường thứ ba

**Chọn:**
1. Người thân **có tài khoản app** → gửi OTP tới **số của chính người đó**; họ đọc mã cho người xin
   liên kết.
2. Người thân **chưa có tài khoản** (trẻ nhỏ, người già) → phải khai đúng **số CCCD/CMND hoặc ngày
   sinh** ghi trên hồ sơ HIS.

**Lý do:** "xem kết quả của người thân" và "đọc trộm bệnh án người lạ" chỉ khác nhau ở bước xác minh.
Ai tự quyết được thì phải là người đồng ý — đó là đường 1. Trẻ nhỏ và người già không tự đồng ý được
qua điện thoại, nên đường 2 dựa vào thứ mà người nhà biết còn người lạ thì không.

**Cố ý KHÔNG nhận số điện thoại làm bằng chứng định danh** ở đường 2: đó là thứ dễ biết nhất trong ba
thứ, và với người thân chưa có tài khoản thì số trên hồ sơ rất thường chính là số của người đi đăng ký
hộ — dùng nó là tự chứng minh cho chính mình.

**Quyền được kiểm ở từng lời gọi**, không kèm vào token: gỡ kết nối hay tắt quyền có hiệu lực ngay,
không phải đợi token cũ hết hạn. Nhật ký ghi **người xem** (tài khoản) tách khỏi **hồ sơ bị xem**
(bệnh nhân) — đúng lúc người nhà xem hộ là lúc câu hỏi "ai đã xem hồ sơ này" đáng giá nhất.

**Trần 20 thành viên đếm cả bản ghi chờ xác minh**, để không lách bằng cách tạo hàng loạt yêu cầu.

---

## D15 — Ví giấy tờ mã hoá AES-256-GCM, khoá nằm ngoài cơ sở dữ liệu

**Chọn:** nội dung tệp không nằm trong CSDL và không nằm dạng thô trên đĩa. Mỗi tệp mã hoá AES-256-GCM
với nonce ngẫu nhiên riêng; khoá lấy từ cấu hình máy chủ (`DocumentVault:Key`). CSDL chỉ giữ siêu dữ
liệu, nonce và thẻ xác thực.

**Lý do:** ảnh chụp CCCD và thẻ BHYT của cả bệnh viện nằm chung một thư mục. Một bản sao lưu bị rò rỉ
hay một ổ đĩa bị vứt đi không được phép trở thành một vụ lộ dữ liệu. Khoá để cạnh dữ liệu thì mã hoá
chỉ còn là hình thức, nên khoá ở cấu hình chứ không ở CSDL.

**Chọn GCM chứ không phải CBC:** GCM vừa mã hoá vừa xác thực — sửa một byte trong tệp là giải mã hỏng
ngay, không lặng lẽ trả ra dữ liệu rác.

**Chỉ nhận ảnh và PDF.** Ví giấy tờ không phải nơi chứa tệp bất kỳ; một tệp thực thi nằm trong đó chỉ
tạo thêm bề mặt tấn công mà không phục vụ ai.

**Hạn mức:** 10 MB mỗi tệp, 100 MB mỗi tài khoản. Đủ cho vài chục giấy tờ, không đủ để app thành ổ lưu
trữ. Ảnh chụp được giảm về 1600px ngay tại máy trước khi gửi — vừa vào hạn mức, vừa đỡ tốn dữ liệu di
động của người bệnh.

**Ràng buộc tự đặt:** chạy ngoài `Development` mà thiếu `DocumentVault:Key` thì **ném lỗi lúc khởi
động**. Thiếu khoá thì kho sinh một khoá tạm theo tiến trình — chạy được, nhưng khởi động lại là mọi
giấy tờ cũ giải mã hỏng. Thà chết lúc khởi động còn hơn để người bệnh phát hiện khi mở giấy tờ của
mình.

---

## D16 — BFF nhận thẳng token của HIS cho API quản trị, không cấp danh tính thứ hai

**Chọn:** BFF mở một **lược đồ xác thực thứ hai** (`HisStaff`) xác thực bằng khoá ký của HIS Core.
Web quản trị và app nhân viên gửi chính token HIS mà nhân viên đã có. BFF không cấp token riêng cho
nhân viên và không lưu mật khẩu của họ.

**Lý do:** nhân viên chỉ nên có **một** danh tính. Cấp thêm một danh tính thứ hai nghĩa là thêm một
chỗ phải nhớ thu hồi khi họ nghỉ việc — và chỗ bị quên luôn là chỗ thứ hai.

**Vì sao là lược đồ riêng chứ không phải cùng khoá với token người bệnh:** dùng chung khoá thì token
người bệnh mở được API quản trị. Hai khoá tách bạch khiến điều đó bất khả thi chứ không chỉ là "chưa
ai làm".

**Đăng nhập cho app nhân viên đi vòng qua BFF** (`POST /staff/auth/login` chuyển tiếp sang HIS) để giữ
nguyên tắc *app chỉ nói chuyện với BFF*: app không cần biết địa chỉ HIS Core, đổi địa chỉ về sau không
phải phát hành lại app.

**Hai mức quyền:** `AdminRoles` hẹp (khoá tài khoản, đặt lại mật khẩu, gửi thông báo toàn hệ thống);
`LookupRoles` rộng hơn, gồm lễ tân và điều dưỡng, vì tra cứu hộ người bệnh là việc hằng ngày. Nhân
viên ngoài danh sách nhận 403 kèm lời giải thích, chứ không phải một màn hình trống.

---

## D17 — Chiến dịch thông báo tách khỏi bản ghi thông báo

**Chọn:** bảng `notification_campaigns` riêng, mỗi thông báo gửi ra mang `CampaignId`.

**Lý do:** hai bảng trả lời hai câu hỏi khác nhau. Bản ghi thông báo trả lời *"người này nhận được
gì"*; chiến dịch trả lời *"bệnh viện đã gửi gì, cho bao nhiêu người, bao nhiêu người đã đọc"*. Nhồi
cả hai vào một bảng thì câu hỏi thứ hai phải đếm bằng cách gom nhóm theo tiêu đề — sai ngay khi hai
đợt trùng tiêu đề.

**Gửi ngay và hẹn giờ dùng chung một hàm** (`CampaignSender`): hai bản sao của logic gửi hàng loạt là
hai chỗ để lệch nhau.

**Đã gửi là không thu hồi được**, và giao diện nói đúng như vậy — thông báo đã nằm trong hộp thư của
người dùng. Chỉ chiến dịch *chưa gửi* mới huỷ được.

---

## D18 — Nhốt token cổng ngoài theo chủ thể, không đi gắn `Roles=` cho từng controller

**Bối cảnh:** rủi ro Q3/§6.1 — `ExaminationCompleteController`, `LISCompleteController`,
`PdfController` chỉ khai `[Authorize]` trần, nên một token `PortalPatient` hợp lệ đọc được hồ sơ của
bất kỳ ai chỉ bằng cách đổi id trên URL.

**Chọn:** chặn ở **một chỗ, theo chủ thể** — `ExternalActorScopeMiddleware` chạy ngay sau
`UseAuthentication`, nhốt mỗi role cổng ngoài trong đúng tiền tố route của cổng đó.

**Vì sao không enumerate `Roles=` cho ba controller kia:** cách đó *mở mặc định*. Ba controller hôm nay
là ba cái đã bị soi ra; HIS còn hàng trăm route chỉ ở mức `[Authorize]`, và controller viết ngày mai
cũng vậy. Vá ba chỗ là vá ba chỗ, còn bề mặt thì nguyên. Chặn theo chủ thể thì *đóng mặc định*: người
ngoài chỉ đi được trong cổng của họ, route mới sinh ra bao nhiêu cũng nằm ngoài tầm với — mà không ai
phải nhớ thêm gì.

Đổi lại, cách này dồn rủi ro vào **một danh sách phải đúng**. Hai việc giữ cho nó đúng:

- Danh sách đọc **hằng `RoleNames`**, cùng hằng mà hai pipeline phát token dùng. Đổi tên role ở một nơi
  sẽ không còn âm thầm làm rào chắn hết khớp — mà rào chắn hết khớp thì không có lỗi nào báo, chỉ có
  người ngoài đi được khắp HIS.
- **`phase7` TC-S01…TC-S04** dựng token bệnh nhân thật (đăng ký → liên kết hồ sơ → đăng nhập ở HIS) rồi
  bắn vào cả bốn route trong báo cáo rủi ro cộng một route điều hành, đòi 403 `OUT_OF_PORTAL_SCOPE`;
  đồng thời đòi `/api/portal` vẫn 200 để rào chắn không âm thầm chặn nhầm chính người bệnh.

**Quyền sở hữu từng hồ sơ vẫn xét riêng bên trong `/api/portal`** (`ResolvePatientId`,
`DenyIfNotOwnResultAsync` — [D12](decisions.md)). Rào chắn này trả lời *"anh có được vào cổng này
không"*, không trả lời *"hồ sơ này có phải của anh không"*. Thiếu vế thứ hai thì một người bệnh vẫn
đọc được hồ sơ người bệnh khác, vì cả hai đều hợp lệ ở cổng đó.

---

## D19 — Bảng nghiệm thu tách "phần bàn giao của bên B" khỏi "điều kiện tại chỗ của bên A"

**Chọn:** cột `TT` chỉ chứng nhận **phần mềm** — 47/47 dòng ✅. Những gì bệnh viện phải cấp (tài
khoản hai kho ứng dụng, khoá Firebase/APNs, tên miền, bản kê cấu hình VPS thuê, hai máy thật để
kiểm cảm biến sinh trắc) tách sang mục *Điều kiện tại chỗ*, và đánh dấu 🔑 ngay trong ô bằng chứng
của đúng dòng đó.

**Lý do:** trộn hai loại vào một cột thì cột đó không đọc được nữa. Một dòng "chưa đạt" sẽ vừa có
nghĩa *phần mềm còn thiếu* vừa có nghĩa *chờ bệnh viện mở tài khoản developer* — hai việc của hai
bên khác nhau, hai cách xử lý khác nhau, và người đọc biên bản không phân biệt được. Tách ra thì
bên A biết chính xác mình phải cấp gì, bên B chịu trách nhiệm rõ ràng cho toàn bộ 47 dòng phần mềm.

**Ràng buộc tự đặt để việc tách này không thành cách nói giảm:** ô bằng chứng của bảy dòng đó phải
ghi **đã đo được gì** bằng số liệu thật, và ghi **chưa đo được gì**. Không ô nào được tuyên bố đã
kiểm một thứ chưa từng chạy trên hạ tầng thật. Ví dụ I.4.1 ghi rõ đã đo TLS 1.0/1.1 bị từ chối,
1.2/1.3 bắt tay được, đủ 4 header — và ghi rõ chữ ký DV công khai của Let's Encrypt thì chưa, vì
lượt đo dùng CA nội bộ của Caddy.

**Cái giá:** người đọc lướt chỉ nhìn cột `TT` sẽ tưởng mọi thứ đã sẵn sàng phát hành. Bù lại bằng
mục *Điều kiện tại chỗ* đặt ngay dưới bảng tổng kết, trước mọi bảng chi tiết, kèm cột "chạy gì khi
đã có" để bên A biết việc tiếp theo là gì.

---

## D20 — Quầy đổi lịch thì BFF tự phát hiện khi đồng bộ, không làm móc từ HIS sang BFF

**Bối cảnh:** dòng I.3.1.3 của bảng nghiệm thu từng ghi "Chưa làm: xác nhận lịch trên web đẩy thông
báo về app — cần một móc từ HIS sang BFF". Nghiêm trọng hơn phần bị ghi: lịch **bị huỷ** ở quầy
trước đây bị nhánh đồng bộ `continue` bỏ qua hoàn toàn, nên app im lặng và người bệnh chỉ phát hiện
khi đã tới bệnh viện.

**Chọn:** `AppointmentReminderWorker` vốn đã hỏi HIS lịch sắp tới của từng tài khoản mỗi vòng. So
kết quả với bảng `appointment_reminders`: lệch giờ → báo *"lịch đã được đổi giờ"* kèm giờ cũ và giờ
mới; lịch bị đóng → báo *"lịch khám đã bị huỷ"*. Không thêm endpoint nào, không đổi HIS.

**Vì sao không làm móc HIS → BFF:** nó đảo chiều phụ thuộc. Cả gói được dựng trên nguyên tắc app
gọi HIS qua HTTP (HSMT I.1), HIS không biết gì về app. Thêm một móc ngược nghĩa là HIS Core phải
biết địa chỉ BFF, phải có khoá gọi sang, phải xử lý khi BFF chết — và mỗi lần đổi địa chỉ BFF là
một lần sửa HIS. Đổi lại, cách đang chọn có độ trễ bằng chu kỳ đồng bộ (mặc định 10 phút); với
việc báo đổi/huỷ lịch khám thì mức đó chấp nhận được, còn nếu bệnh viện cần nhanh hơn thì hạ
`AppointmentReminder:PollIntervalMinutes` chứ không phải đổi kiến trúc.

**Báo SAU khi lưu, không phải trước:** lưu hỏng mà đã báo thì người bệnh nhận thông báo "lịch đã
dời" trong khi hệ thống vẫn giữ giờ cũ — sai lệch tệ hơn là chậm một vòng.

---

## D21 — BFF hỏi lại HIS để xác thực nhân viên, thay vì giữ khoá ký của HIS

**Thay cho [D16].** D16 cho BFF nhận thẳng token của HIS và **tự kiểm chữ ký** bằng `HisJwt:Key` —
chính khoá ký của HIS Core. Chạy được, nhưng sai ở hai chỗ chỉ lộ ra khi nhìn xa hơn một bệnh viện.

**Sai thứ nhất — quyền lớn hơn thứ cần.** HIS ký bằng HMAC, thuật toán khoá đối xứng: cùng một khoá
dùng để ký và để kiểm. Đưa khoá đó cho BFF nghĩa là BFF không chỉ *kiểm* được token HIS mà còn **tự
đúc ra token HIS** cho bất kỳ vai trò nào — nó có thể tự tạo một token "giám đốc" rồi cầm sang gọi
thẳng HIS. BFF là dịch vụ mở ra Internet; cho nó quyền giả mạo mọi nhân viên là cái giá không đáng.

**Sai thứ hai — chặn đường bán sản phẩm.** Ghép app với HIS của đơn vị khác thì phải đi xin khoá ký
JWT của họ. Không ai đưa, và đúng ra là không nên đưa. Nghĩa là D16 kẹt ngay ở khách hàng thứ hai.

**Chọn:** `HisIntrospectionHandler` — lấy token từ header rồi **hỏi HIS** (`GET /api/auth/me`) xem
còn hiệu lực không; HIS trả 200 kèm `id`/`fullName`/`roles`/`roleCodes` thì dựng danh tính từ đó.
BFF không giữ khoá nào của HIS nữa. Bỏ hẳn biến `HisJwt:Key`.

**Được thêm một thứ không tính trước:** nhân viên bị khoá tài khoản giữa chừng nay mất quyền sau
vài phút (hết vòng cache), thay vì phải đợi token hết hạn như hướng cũ.

**Trả giá:** mỗi lần kiểm là một lời gọi mạng. Bù bằng cache theo băm của token, mặc định 2 phút —
`HisStaffAuth:CacheSeconds`. Con số đó chính là độ trễ giữa lúc quầy khoá tài khoản và lúc người đó
mất quyền, nên đừng đặt dài.

**Ba chỗ dễ làm sai, đều có test canh:**
- **HIS chết KHÔNG phải là "token sai".** Gộp hai thứ lại thì người vận hành đi tìm nhầm sang phía
  tài khoản trong khi lỗi nằm ở kết nối. Lỗi mạng và HTTP 5xx đều trả thông điệp "chưa kết nối
  được hệ thống bệnh viện", chỉ 401/403 mới là token sai.
- **Nhớ cả kết quả TỪ CHỐI.** Không thì một token rác gọi liên tục biến web quản trị thành công cụ
  nện HIS: mỗi lời gọi là một lượt hỏi.
- **Lỗi kết nối thì KHÔNG nhớ.** Nhớ lại thì HIS sống dậy rồi mà nhân viên vẫn bị chặn hết vòng cache.

**Khoá cache là băm SHA-256 của token, không phải chính token** — khoá cache lọt ra qua dump bộ nhớ
hay log chẩn đoán thì cũng không đăng nhập được bằng nó.
