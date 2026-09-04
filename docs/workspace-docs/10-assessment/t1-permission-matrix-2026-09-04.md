# T1 #216 — Ma trận phân quyền & trạng thái tài khoản (đợt 2, 2026-09-04)

> Tiếp nối [`t1-permission-matrix-2026-09-03.md`](t1-permission-matrix-2026-09-03.md) (đợt 1).
> Đợt 1 đo được hiện trạng và để lại 6 phát hiện (F1–F6) cùng 9 test case chưa chạy.
> Đợt này **sửa các phát hiện đó**, chạy nốt phần còn lại, và tìm thêm 2 lỗi mới.
> Artefact tái chạy: `docs/architecture/evidence/cross/t1/`.

## 1. Xử lý các phát hiện của đợt 1

| # | Đợt 1 kết luận | Đợt 2 làm gì |
|---|---|---|
| **F1** | FE gating TẮT; bật lên thì màn hình trống vì user seed chỉ có 3–7 permission | **Đã mở đường bật.** Sau F2 mỗi vai trò có 12–45 permission nên gating bật cho ra menu dùng được (bác sĩ 96 mục, điều dưỡng 74, thu ngân 24, dược sĩ 22, KTV CĐHA 20, tiếp đón 20, KTV XN 19, admin 174). `VITE_ACCESS_GATING` nay là build-arg của Dockerfile lấy từ repo variable, **mặc định tắt** — bật bằng cách đặt biến, không cần sửa code. |
| **F2** | 875/1467 action ghi chỉ có `[Authorize]` trần | **Đã sửa** — xem §2. |
| **F3** | Tài khoản khoá và sai mật khẩu nhận cùng thông báo | Giữ nguyên: gộp thông báo là chống dò tài khoản, đúng chủ ý. |
| **F4** | Màn login in `admin / Admin@123`, "có trong bundle prod" | **Dương tính giả.** Hai chỗ đó đều nằm trong nhánh `import.meta.env.DEV`, Vite thay bằng `false` lúc build rồi loại bỏ. Tải bundle prod `index-Dd7moFdz.js` về `grep` ra **0** lần xuất hiện chuỗi `Admin@123`. Không sửa gì. |
| **F5** | `IcdCodes.ChapterName` mojibake double-UTF8 | **Đã sửa** — script `167_repair_icd_chapter_name.sql` đặt lại tên chương theo `ChapterCode` từ bảng 22 chương ICD-10 chuẩn. Local: 41/41 dòng đúng, chạy lần 2 = 0 dòng. Kèm bỏ BOM ở 4 đường import CSV danh mục. |
| **F6** | Vai trò thường đọc được KPI phụ ở trang quản trị | Đi cùng F2; phần đọc còn lại nêu ở §5. |

## 2. F2 — siết đường ghi bằng permission

Gắn tay `[RequirePermission]` lên 875 chỗ ở 120 file cho ra diff không review nổi và cứ thêm
controller mới là hở lại. Thay vào đó quyền của đường ghi được **khai báo tập trung**:

- `HIS.API/Authorization/WritePermissionMap.cs` — bảng `controller → quyền ghi`, kèm `Read`
  cho các POST thực chất chỉ tra cứu (`Search/Check/Estimate/...`) và override cho từng action
  (thường là bản `Approve`).
- `HIS.API/Authorization/WritePermissionConvention.cs` — gắn policy `perm:{code}` lúc dựng
  ApplicationModel. **Không đụng** action đã có `Roles`, `Policy` hay `[AllowAnonymous]`.
- Thực thi vẫn là `PermissionPolicyProvider` + `PermissionAuthorizationHandler` cũ — không thêm
  đường kiểm tra quyền thứ hai.

Khởi động in kiểm kê và **từ chối chạy** nếu bảng tham chiếu mã quyền mà catalog không seed
(cấu hình đó sẽ khoá mọi vai trò cùng lúc):

```
WritePermissionConvention: gate 887 action ghi theo 107 controller; 0 action ghi CHƯA có quyền.
```

25 action ghi còn ở mức "chỉ cần đăng nhập" là **cố ý và có danh sách**: đăng nhập · đăng xuất ·
đổi mật khẩu · 2FA · WebAuthn · break-glass · đánh dấu đã đọc thông báo · tùy chọn cá nhân ·
báo sự cố IT.

Catalog thêm 12 resource cho các miền chưa có (nội trú, danh mục, y tế công cộng, tài sản, nhân
sự, khám từ xa, chất lượng, dinh dưỡng, PHCN, khám sức khỏe, liên thông, cấu hình LIS) + 2 quyền
sinh ra để việc siết không khoá nhân viên khỏi giấy tờ của chính họ: `Asset.Request` (báo hỏng
thiết bị) và `Hr.SelfService` (tự nộp đơn nghỉ phép).

**Bán kính ảnh hưởng** (`t1_write_gate_impact.py`, 858 action ghi đã gate):

| Vai trò | Quyền | Ghi được | Mất |
|---|---:|---:|---|
| Quản trị hệ thống | 105 | 858 | — |
| Bác sĩ | 45 | 596 | tiếp đón · danh mục · LIS · kho dược · nhân sự |
| Điều dưỡng | 26 | 415 | thêm CĐHA · phẫu thuật |
| Thu ngân | 20 | 64 | toàn bộ lâm sàng |
| Tiếp đón | 18 | 119 | toàn bộ lâm sàng · CĐHA · XN |
| Dược sĩ | 17 | 102 | bệnh án · nội trú · CĐHA · XN |
| KTV CĐHA | 12 | 139 | bệnh án · nội trú · XN |
| KTV XN | 12 | 101 | bệnh án · nội trú · CĐHA |

Đúng điều F2 muốn: **KTV XN không còn ghi được bệnh án**, mỗi vai trò giữ miền của mình và mất
miền của người khác.

Soi danh sách "mất" bắt được 5 chỗ bản đồ đầu tiên gán sai, đã sửa: cắm cờ lâm sàng lên hồ sơ là
ghi chú y khoa (không phải sửa hành chính) · chạy đợt hướng dẫn lâm sàng là điều trị (không phải
soạn danh mục) · phiếu vận chuyển người bệnh do khoa lập (không phải quầy tiếp đón) · đăng ký
khám nhiều chuyên khoa thuộc tiếp đón · "dùng" một mẫu chỉ tăng bộ đếm nên là hành vi của người đọc.

**Ma trận sống sau khi siết** (`t1_matrix.py`, 394 GET × 8 vai trò + 206 cổng mutation + 80 lượt
không token): **4331 call · 0 bypass · 0 over-restrict · 0 lỗi 401 với token hợp lệ · 0 lỗi 500.**

Harness cũng được sửa: 8 endpoint upload trả `415` cho body JSON vì routing từ chối content-type
**trước** khi authorize chạy — nay tự gửi lại đúng multipart. Chính chỗ này biến 26 "bypass" ảo
của lần chạy trước thành bảng sạch.

## 3. Hai lỗi MỚI tìm được ở đợt 2

### F7 — token cổng ngoài đi được khắp hệ thống nội bộ (bảo mật)

Cổng giám định BHXH và cổng bệnh nhân tự phát JWT riêng nhưng **ký cùng key/issuer/audience** với
token nhân viên. Với hàng trăm GET nội bộ chỉ có `[Authorize]` trần thì "đã đăng nhập" là đủ, nên
đo được:

```
token giám định viên BHXH → GET /api/reception/opd-flow-stats → 200
```

Người ngoài đọc được số liệu điều hành của bệnh viện. F2 đã bịt đường ghi (họ không có permission
nào nên 403) nhưng đường **đọc** thì không, vì gate theo permission chỉ phủ mutation.

**Sửa:** `ExternalActorScopeMiddleware` — chặn theo **chủ thể** chứ không theo từng endpoint.
Principal mang role của một cổng ngoài chỉ được đi trong tiền tố route của cổng đó
(`/api/inspector-portal`, `/api/portal`), mọi đường khác trả 403. Nhân viên không bị ảnh hưởng vì
không ai mang các role này, và nhân viên vẫn vào `/api/portal/*` hộ bệnh nhân như cũ.

### F8 — bucket rate-limit đăng nhập là TOÀN CỤC 10 lần/phút (sẵn sàng phục vụ)

`AddFixedWindowLimiter("login", …)` không partition, tức **cả bệnh viện chung 10 lượt đăng nhập
mỗi phút**. Hai hệ quả đo được:

- Đầu ca hàng chục nhân viên đăng nhập cùng lúc sẽ chặn lẫn nhau.
- Bộ đếm khoá tài khoản (`FailedLoginCount`, ngưỡng 5) **không bao giờ chạm ngưỡng** vì 429 trả về
  từ lần thử thứ hai: `[401, 429, 429, 429, 429, 429]`, `FailedLoginCount=1`.

Đúng vấn đề đã được sửa cho bucket `refresh` (comment ngay trong `Program.cs` nói rõ "global
bucket = attacker ẩn danh chặn refresh TOÀN VIỆN") — chỉ là bỏ sót `login`.

**Sửa:** partition theo IP, 60 lượt/phút/IP (đủ cho NAT bệnh viện). Chống dò mật khẩu là việc của
khoá tài khoản theo `FailedLoginCount`, không phải của rate limit. Sau khi sửa, log xác nhận bộ
đếm chạy tiếp: `FailedLogin username=ktvlam count=4`.

## 4. TC-PERM đợt 2 — kết quả

Đợt 1 dừng ở "DB local không có user cho các vai trò đó". Thực ra **ba trong số chúng không nằm ở
bảng Users**: cổng giám định BHXH và cổng bệnh nhân có đường đăng nhập + token riêng, tự phát role
claim. Nên phần lớn chạy được ngay, không cần thêm RoleCode.

Chi tiết từng kiểm tra: `docs/architecture/evidence/cross/t1/t1_phase2_results.json`
(script `t1_phase2.py`, log `t1_phase2.log`).

| TC | Nội dung | Kết quả |
|---|---|---|
| 007 | Giám định viên BHXH | Đăng nhập cổng OK, claim `BhxhInspector`, cách ly hai chiều với nhân viên. **Tìm ra F7** rồi sửa. |
| 008 | Quản lý khoa (DepartmentHead) | **Role orphan** — không JWT nào của 8 user seed phát ra tên này (18 tên claim quan sát được), và **0 endpoint** gate CHỈ bằng nó, nên không có gate nào bị vô hiệu. Khớp kết luận #183 Phase-2. |
| 009 | Ban giám đốc (Director) | LIVE qua ADMIN: claim admin = `Quản trị hệ thống, Admin, Manager, Director`; gate quản trị mở cho admin (200), chặn bác sĩ (403). |
| 011 | Bệnh nhân tự đăng nhập cổng | Đăng ký + đăng nhập cổng, claim `PortalPatient`, bị F7 nhốt trong `/api/portal/*`. |
| 015 | Buộc đổi mật khẩu lần đầu | **CHƯA CÓ TÍNH NĂNG** — không cột `MustChangePassword`/`PasswordExpiresAt` trong `Users`, không file backend nào nhắc tới. Khoảng trống tính năng, không phải lỗi. |
| 016 | Khoá sau N lần sai + 2FA | **Tìm ra F8** rồi sửa; sau sửa bộ đếm chạy tới ngưỡng. `IsTwoFactorEnabled` + `/auth/enable-2fa` + `/auth/verify-otp` đã có. |
| 018 | Đối soát audit | Chỉ người có quyền đọc được `/api/audit/logs` (admin 200 · bác sĩ 403). Lưu ý: `AuditLogMiddleware` **cố ý** chỉ ghi POST/PUT/DELETE và GET chi tiết nhạy cảm — GET danh sách không sinh bản ghi. |
| 019 | Thu hồi quyền có hiệu lực | Xoá link Role→Permission → quyền biến mất khỏi `/api/me/permissions` sau khi hết cache 30s; khôi phục link → có lại. |
| 020 | Theme/i18n màn login | Chưa chạy — thuộc nhóm giao diện, gộp vào đợt chứng cứ UI. |

## 5. Còn nợ

- **Đường ĐỌC vẫn ở mức auth-only.** F2 phủ mutation; 1027 action (chủ yếu GET) vẫn "đăng nhập là
  đọc được". F7 đã chặn người NGOÀI, nhưng giữa các vai trò nội bộ thì một KTV vẫn đọc được danh
  sách của khoa khác. Siết tiếp cần gate GET theo permission + scope theo khoa (AUTHZ-3 #369).
- **TC-PERM-015** cần quyết định: làm tính năng buộc đổi mật khẩu, hay ghi nhận là không làm.
- **TC-PERM-020** chưa chạy.
- **Bật F1 trên prod** là quyết định của người dùng: đặt repo variable `VITE_ACCESS_GATING=true`.
  Trước khi bật, mọi vai trò đang dùng thật phải có mặt trong ma trận Role×Permission — hiện ma
  trận phủ đủ 8 RoleCode LIVE, custom role (nếu prod có) sẽ thấy menu rỗng.
