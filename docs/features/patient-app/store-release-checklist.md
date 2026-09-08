# Checklist phát hành lên App Store và Google Play

> HSMT I.2 #1: *"Người dùng tải và cập nhật ứng dụng **đã được duyệt an toàn** từ App Store và Google
> Play"*. Tài liệu này là danh sách việc phải làm xong trước khi bấm nộp, và những chỗ hai kho ứng
> dụng thường trả về.

---

## 0. Trước khi bắt đầu — thứ cần xin

| Thứ | Xin ở đâu | Ghi chú |
|---|---|---|
| Tài khoản **Google Play Developer** | play.google.com/console | 25 USD, trả một lần |
| Tài khoản **Apple Developer Program** | developer.apple.com | 99 USD/năm, phải gia hạn |
| **Keystore** ký bản Android | tự sinh, xem §2 | **Mất là không cập nhật được app nữa** |
| Certificate + Provisioning Profile iOS | Apple Developer | Xcode tự tạo được |
| Trang **chính sách bảo mật** có địa chỉ công khai | bệnh viện | Cả hai kho đều bắt buộc |
| Tài khoản thử nghiệm cho người duyệt | tự tạo | Xem §5 — đây là chỗ hay bị trả về nhất |

Chi tiết credential: [`external-services-setup.md`](external-services-setup.md).

---

## 1. Kiểm tra kỹ thuật trước khi đóng gói

- [ ] `flutter analyze` — không còn cảnh báo nào
- [ ] `flutter test` — toàn bộ xanh
- [ ] `python scripts/check-ios-min-deployment-target.py` — **không gói nào vượt iOS 12.0**
- [ ] Chạy lại 6 bộ smoke test end-to-end (`scripts/smoke-patient-app-*.py`) — toàn bộ xanh
- [ ] Bấm thử trên **thiết bị thật**: một máy Android 7.1 và một máy iPhone chạy iOS 12
- [ ] `AppRelease:MinimumAndroidVersion` / `MinimumIosVersion` trên máy chủ **≤** phiên bản sắp nộp
      *(đặt cao hơn là tự khoá bản mới ngay khi phát hành)*
- [ ] Trỏ app về máy chủ **production**, không phải staging
- [ ] `flutter build appbundle --release` và `flutter build ipa --release` chạy sạch

---

## 2. Android

### Keystore

```bash
keytool -genkey -v -keystore his-patient-app.jks -keyalg RSA -keysize 2048 \
        -validity 10000 -alias his-patient-app
```

- [ ] Keystore và mật khẩu **lưu vào két bí mật của bệnh viện**, có ít nhất hai người giữ được
- [ ] `android/key.properties` **không** được commit (đã có trong `.gitignore`)
- [ ] Bật **Play App Signing** — Google giữ khoá gốc, mất keystore vẫn cứu được

> Mất keystore mà không bật Play App Signing thì không bao giờ cập nhật được app nữa: phải phát hành
> một ứng dụng mới, và toàn bộ người dùng cũ phải cài lại từ đầu.

### Khai báo trên Play Console

- [ ] **Data safety** — khai đúng: app thu thập *thông tin sức khoẻ*, *thông tin cá nhân*, *ảnh và
      tệp*; dữ liệu **được mã hoá khi truyền** và **người dùng xoá được**
- [ ] **Chính sách quyền riêng tư** — dán đường dẫn công khai
- [ ] **Quyền nhạy cảm** — giải thích vì sao cần máy ảnh (chụp giấy tờ) và thông báo
- [ ] **Phân loại nội dung** — chọn nhóm *Y tế*
- [ ] Ảnh chụp màn hình: tối thiểu 2 ảnh điện thoại, 1 ảnh feature graphic 1024×500

---

## 3. iOS

- [ ] **App Privacy** trên App Store Connect — khai *Health & Fitness*, *Contact Info*, *Identifiers*
- [ ] Chuỗi mô tả quyền trong `Info.plist` viết bằng **tiếng Việt, nói rõ lý do**:
      - `NSCameraUsageDescription` — *"Dùng để chụp ảnh giấy tờ lưu vào ví giấy tờ của bạn."*
      - `NSPhotoLibraryUsageDescription` — *"Dùng để chọn ảnh giấy tờ có sẵn trên máy."*
      - `NSFaceIDUsageDescription` — *"Dùng để đăng nhập và mở khoá ứng dụng bằng khuôn mặt."*
- [ ] **Export Compliance** — app dùng HTTPS và mã hoá tệp; khai đúng *"chỉ dùng mã hoá tiêu chuẩn"*
- [ ] `ITSAppUsesNonExemptEncryption` đặt trong `Info.plist` để khỏi hỏi lại mỗi lần nộp

> App y tế thường bị Apple soi kỹ hơn. Chuẩn bị sẵn câu trả lời cho: *dữ liệu sức khoẻ lưu ở đâu*,
> *ai truy cập được*, *người dùng xoá tài khoản bằng cách nào*.

---

## 4. Xoá tài khoản — bắt buộc ở cả hai kho

Cả Apple lẫn Google đều **bắt buộc** app cho phép người dùng xoá tài khoản ngay trong app, hoặc cung
cấp một đường dẫn web để làm việc đó.

- [x] Có đường xoá tài khoản trong app: **Trang chủ → biểu tượng khiên → Xoá tài khoản**
- [x] Màn xoá nói rõ hai danh sách tách bạch — *sẽ bị xoá vĩnh viễn* (tài khoản, thiết bị, ví giấy tờ,
      kết nối gia đình, hộp thư) và *vẫn được giữ lại* (hồ sơ bệnh án, kết quả khám, đơn thuốc)
- [x] Yêu cầu nhập lại mật khẩu và tích ô xác nhận trước khi xoá
- [x] Xoá tài khoản **gỡ luôn các liên kết gia đình trỏ TỚI hồ sơ này** — xoá tài khoản mà vẫn để
      người khác xem được hồ sơ của mình thì việc xoá chẳng có nghĩa gì
- [x] Nhật ký truy cập **không** bị xoá: đó là bảng chỉ-thêm, là bằng chứng cho những lần hồ sơ bệnh
      án bị mở

> Khi khai với hai kho ứng dụng, ghi rõ: app xoá **tài khoản đăng nhập**, không xoá hồ sơ bệnh án —
> hồ sơ bệnh án do luật lưu trữ y tế quy định thời hạn và bệnh viện không được xoá theo yêu cầu cá
> nhân. Cả Apple lẫn Google đều chấp nhận cách phân định này khi nó được nói rõ trong app.

---

## 5. Tài khoản thử nghiệm cho người duyệt

**Chỗ bị trả về nhiều nhất.** Người duyệt ngồi ở nước ngoài, không có số điện thoại Việt Nam, nên
**không nhận được OTP** — họ sẽ dừng ngay ở màn đăng ký và từ chối với lý do *"không đăng nhập được"*.

- [ ] Tạo sẵn **một tài khoản thử nghiệm đã liên kết hồ sơ**, có dữ liệu mẫu đủ cả 6 nhóm kết quả
- [ ] Ghi **số điện thoại + mật khẩu** vào ô *Notes for reviewer* / *App access*
- [ ] Ghi rõ: *"Tài khoản này đã đăng ký sẵn, đăng nhập thẳng bằng mật khẩu, không cần OTP."*
- [ ] Ghi kèm hướng dẫn 3 dòng để họ đi hết luồng chính (lấy số → đặt khám → xem kết quả)
- [ ] Nếu có màn tra cứu nhân viên: nói rõ đó là màn **nội bộ**, và cấp một tài khoản nhân viên thử

---

## 6. Sau khi được duyệt

- [ ] Cập nhật `AppRelease:LatestAndroidVersion` / `LatestIosVersion` trên máy chủ → app hiện dải
      *"Đã có phiên bản mới"*
- [ ] Cập nhật `PlayStoreUrl` / `AppStoreUrl` bằng đường dẫn thật (id app chỉ có sau khi được duyệt)
- [ ] Đặt `SupportPhone` — số này hiện ở màn buộc cập nhật, cho người lớn tuổi không tự cập nhật được
- [ ] In lại [`huong-dan-su-dung-nguoi-benh.md`](huong-dan-su-dung-nguoi-benh.md) kèm mã QR tải app,
      để ở quầy tiếp đón
- [ ] Chỉ nâng `MinimumVersion` khi thật sự cần chặn bản cũ — nâng là **khoá cửa** với mọi người chưa
      cập nhật

---

## 7. Khi cần chặn khẩn một bản đã phát hành

Nếu phát hiện một bản hiển thị sai kết quả:

1. Đặt `AppRelease:MinimumAndroidVersion` (hoặc iOS) **cao hơn bản hỏng** trên máy chủ.
2. Người dùng bản hỏng thấy màn **"Cần cập nhật ứng dụng"** ngay lần mở kế tiếp, không dùng tiếp được.
3. Nộp bản sửa lên kho ứng dụng.
4. Đặt `MaintenanceMessage` để giải thích, kèm `SupportPhone`.

Không cần chờ kho ứng dụng duyệt mới chặn được — đó chính là lý do có cơ chế này.
