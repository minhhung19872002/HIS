window.TP.modules.push(...[
 {
  "id": "portal",
  "code": "PTL",
  "layer": "spec",
  "ic": "📱",
  "nm": "Cổng bệnh nhân",
  "gh": [
   "#270",
   "#271"
  ],
  "gap": false,
  "module_id": "portal",
  "summary": "Cổng bệnh nhân (PTL, lớp D-spec) cho phép bệnh nhân tự đăng ký/đăng nhập, liên kết hồ sơ tại viện rồi tra cứu dữ liệu của CHÍNH MÌNH. Grounded từ data.js: rel \"PortalAccounts ⟶ PortalAppointments/RefillRequests · HealthMetrics/MedicineReminders theo BN\"; 7 bảng PortalAccounts (TK cổng BN), PortalAppointments (đặt lịch online), FamilyMembers (thành viên gia đình), MedicineReminders (nhắc uống thuốc), HealthMetrics (chỉ số sức khỏe), PatientQuestions (câu hỏi của BN), RefillRequests (yêu cầu tái cấp thuốc); RELATED_X: reception/tele/national. Triển khai thực: FE standalone self-login PatientPortalStandalone.tsx (route /patient-portal, KHÔNG dùng TerminalLayout — auth card 3 tab login/register/link + workspace 4 tab visits/labs/rx/bills), bản mobile /m/patient-portal (ProtectedRoute) và view staff patient-portal-staff; BE PatientPortalServiceImpl + DTO PatientPortalDTOs.cs phủ appointment booking, eKYC, health record, lab/imaging, prescription+refill, payment online, feedback, dashboard, family member, medicine reminder, health metric, Q&A. Trọng tâm an toàn: token role PortalPatient → BE derive patientId từ claim (IDOR đóng phía server), dữ liệu chỉ hiện đúng BN.",
  "screens": [
   {
    "name": "Auth card — Đăng nhập",
    "desc": "Thẻ đăng nhập riêng (không terminal shell), nền gradient xanh y tế, logo 🩺, 3 tab. Tab Đăng nhập: ô Email/SĐT/Tên đăng nhập (data-testid portal-identifier) + Mật khẩu (portal-password) + nút Đăng nhập (portal-login-btn). Lỗi hiện hộp đỏ, thành công hộp xanh.",
    "route_guess": "/patient-portal",
    "elements": [
     "tab login/register/link",
     "input identifier",
     "input password type=password",
     "nút Đăng nhập",
     "hộp lỗi đỏ",
     "hộp thành công xanh",
     "footer 'Dữ liệu chỉ hiển thị cho đúng bệnh nhân'"
    ]
   },
   {
    "name": "Auth card — Đăng ký",
    "desc": "Tab Đăng ký: Họ tên, Email, SĐT, CCCD/CMND, Ngày sinh (input date), Mật khẩu, nút Đăng ký tài khoản. Đăng ký xong tự nhảy sang tab Liên kết và điền sẵn accountId.",
    "route_guess": "/patient-portal",
    "elements": [
     "input fullName",
     "input email",
     "input phone",
     "input idNumber",
     "input date dateOfBirth",
     "input password",
     "nút Đăng ký tài khoản"
    ]
   },
   {
    "name": "Auth card — Liên kết hồ sơ",
    "desc": "Tab Liên kết: hướng dẫn, Mã tài khoản (GUID), Mã bệnh nhân (BN2026...), Thông tin xác minh (SĐT/CCCD/ngày sinh yyyy-mm-dd), nút Liên kết hồ sơ. Server đối chiếu khớp mới link.",
    "route_guess": "/patient-portal",
    "elements": [
     "input linkAccountId",
     "input linkPatientCode",
     "input linkVerify",
     "nút Liên kết hồ sơ",
     "ghi chú hướng dẫn xác minh"
    ]
   },
   {
    "name": "Workspace — Header + tab bar",
    "desc": "Sau đăng nhập: header gradient hiển thị tên BN + 'chỉ xem hồ sơ của bạn' + nút Đăng xuất (portal-logout-btn). 4 tab nút có badge count: Lịch sử khám / KQ xét nghiệm / Đơn thuốc / Hóa đơn (portal-tab-visits|labs|rx|bills).",
    "route_guess": "/patient-portal",
    "elements": [
     "header tên BN",
     "nút Đăng xuất",
     "4 tab có count",
     "hộp lỗi tải dữ liệu"
    ]
   },
   {
    "name": "Tab Lịch sử khám",
    "desc": "Bảng: Ngày khám / Loại / Khoa / Bác sĩ / Chẩn đoán. Empty -> 'Chưa có dữ liệu', loading -> 'Đang tải…'. Ngày format vi-VN.",
    "route_guess": "/patient-portal",
    "elements": [
     "table 5 cột",
     "empty row",
     "loading row"
    ]
   },
   {
    "name": "Tab KQ xét nghiệm",
    "desc": "Bảng: Mã phiếu / Ngày chỉ định / Ngày KQ / Trạng thái / Chỉ số (list testItems). Chỉ số bất thường (isAbnormal) tô đỏ + reference range.",
    "route_guess": "/patient-portal",
    "elements": [
     "table 5 cột",
     "chỉ số abnormal màu đỏ",
     "referenceRange",
     "empty/loading"
    ]
   },
   {
    "name": "Tab Đơn thuốc",
    "desc": "Bảng: Mã đơn / Ngày kê / Bác sĩ / Chẩn đoán / Thuốc (list items medicineName ×qty — dosage). Có thể có nút tái cấp (RefillRequest) ở bản đầy đủ.",
    "route_guess": "/patient-portal",
    "elements": [
     "table 5 cột",
     "list thuốc",
     "empty/loading"
    ]
   },
   {
    "name": "Tab Hóa đơn",
    "desc": "Bảng: Mã hóa đơn / Ngày / Số tiền (vi-VN + đ) / Thanh toán (badge Đã/Chưa thanh toán). CanPayOnline -> nút thanh toán online ở bản đầy đủ.",
    "route_guess": "/patient-portal",
    "elements": [
     "table 4 cột",
     "badge trạng thái thanh toán",
     "tiền format vi-VN",
     "empty/loading"
    ]
   },
   {
    "name": "Đặt lịch online (PortalAppointments)",
    "desc": "BE có CreatePortalAppointmentDto + available-slots; FE mobile/đầy đủ: chọn ngày/khoa/bác sĩ/slot trống -> đặt lịch -> trạng thái Pending/Confirmed/CheckedIn/Cancelled/NoShow, có QR/queueNumber.",
    "route_guess": "/m/patient-portal",
    "elements": [
     "form đặt lịch",
     "picker khoa/bác sĩ",
     "available slots",
     "nút Đặt lịch",
     "nút Hủy lịch",
     "badge trạng thái",
     "QR/queue"
    ]
   },
   {
    "name": "Thành viên gia đình (FamilyMembers)",
    "desc": "Quản lý người thân: FullName/Relationship/DOB/Gender/IdNumber/Phone/InsuranceNumber, liên kết LinkedPatientId. CRUD qua SaveFamilyMemberDto.",
    "route_guess": "/m/patient-portal",
    "elements": [
     "danh sách thành viên",
     "form thêm/sửa",
     "trường quan hệ",
     "liên kết hồ sơ BN"
    ]
   },
   {
    "name": "Nhắc uống thuốc (MedicineReminders)",
    "desc": "MedicineName/Dosage/Frequency/Times/StartDate/EndDate/IsActive, liên kết PrescriptionId. Bật/tắt nhắc.",
    "route_guess": "/m/patient-portal",
    "elements": [
     "danh sách nhắc",
     "form thêm nhắc",
     "picker giờ uống",
     "toggle IsActive"
    ]
   },
   {
    "name": "Chỉ số sức khỏe (HealthMetrics)",
    "desc": "Tự nhập huyết áp/nhịp tim/cân nặng/chiều cao/BMI/đường huyết/nhiệt độ/SpO2 + biểu đồ xu hướng (HealthMetricTrendDto).",
    "route_guess": "/m/patient-portal",
    "elements": [
     "form nhập chỉ số",
     "biểu đồ trend",
     "min/max/avg/latest"
    ]
   },
   {
    "name": "Câu hỏi của BN (PatientQuestions)",
    "desc": "Gửi câu hỏi Subject/Content/Category/ImageUrls, IsPublic; trạng thái chờ/đã trả lời, AnsweredBy/Answer.",
    "route_guess": "/m/patient-portal",
    "elements": [
     "form gửi câu hỏi",
     "danh sách hỏi-đáp",
     "badge trạng thái",
     "câu trả lời bác sĩ"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-PTL-001",
    "title": "Đăng nhập cổng BN thành công bằng tài khoản đã liên kết hồ sơ",
    "category": "happy",
    "priority": "P0",
    "role": "PortalPatient",
    "preconditions": "FE /patient-portal chạy (3001), BE 5106. Có 1 PortalAccount đã đăng ký + liên kết hồ sơ BN (status Active, có patientId).",
    "steps": [
     "Mở /patient-portal",
     "Ở tab Đăng nhập nhập identifier (email/SĐT/username) đúng",
     "Nhập mật khẩu đúng",
     "Bấm Đăng nhập (portal-login-btn)"
    ],
    "expected": "BE trả {success:true, token, account}; token lưu localStorage key patient_portal_token + token + patient_portal_account; chuyển sang Workspace, header hiện patientName + 'chỉ xem hồ sơ của bạn'; mặc định tab Lịch sử khám.",
    "evidence": [
     {
      "name": "TC-PTL-001__s01__form",
      "caption": "Tab đăng nhập đã điền identifier+password",
      "uiState": "form"
     },
     {
      "name": "TC-PTL-001__s02__loading",
      "caption": "Nút hiển thị 'Đang xác thực…'",
      "uiState": "loading"
     },
     {
      "name": "TC-PTL-001__s03__success",
      "caption": "Workspace hiện tên BN sau đăng nhập",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#270",
     "#271"
    ],
    "notes": "Token role PortalPatient mang claim patientId."
   },
   {
    "id": "TC-PTL-002",
    "title": "Đăng nhập sai mật khẩu hiển thị thông báo lỗi, không cấp token",
    "category": "negative",
    "priority": "P0",
    "role": "PortalPatient",
    "preconditions": "Có PortalAccount hợp lệ.",
    "steps": [
     "Mở /patient-portal tab Đăng nhập",
     "Nhập identifier đúng",
     "Nhập mật khẩu SAI",
     "Bấm Đăng nhập"
    ],
    "expected": "BE trả success:false; hiện hộp đỏ (message từ server hoặc 'Đăng nhập thất bại'); KHÔNG ghi token vào localStorage; vẫn ở màn auth.",
    "evidence": [
     {
      "name": "TC-PTL-002__s01__form",
      "caption": "Điền sai mật khẩu",
      "uiState": "form"
     },
     {
      "name": "TC-PTL-002__s02__error",
      "caption": "Hộp lỗi đỏ đăng nhập thất bại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#270"
    ],
    "notes": "Kiểm localStorage không có patient_portal_token sau khi lỗi."
   },
   {
    "id": "TC-PTL-003",
    "title": "Đăng nhập khi backend mất kết nối hiển thị lỗi mạng",
    "category": "negative",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "Dừng BE hoặc chặn /portal/login.",
    "steps": [
     "Mở /patient-portal",
     "Nhập identifier+password bất kỳ",
     "Bấm Đăng nhập"
    ],
    "expected": "catch -> hiện hộp đỏ 'Đăng nhập thất bại — kiểm tra kết nối'; nút trở lại trạng thái bình thường (không kẹt loading).",
    "evidence": [
     {
      "name": "TC-PTL-003__s01__error",
      "caption": "Lỗi kết nối khi BE down",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-PTL-004",
    "title": "Validation đăng nhập: bỏ trống identifier/mật khẩu",
    "category": "validation",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "Màn auth tab Đăng nhập.",
    "steps": [
     "Để trống identifier",
     "Để trống mật khẩu",
     "Bấm Đăng nhập"
    ],
    "expected": "Server trả lỗi/thông báo không hợp lệ (identifier.trim() rỗng), KHÔNG cấp token; hộp lỗi hiển thị; không crash UI.",
    "evidence": [
     {
      "name": "TC-PTL-004__s01__validation",
      "caption": "Submit form trống báo lỗi",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#270"
    ],
    "notes": "FE hiện chưa chặn client-side rỗng — kiểm BE từ chối."
   },
   {
    "id": "TC-PTL-005",
    "title": "Đăng ký tài khoản cổng BN mới thành công và tự nhảy sang tab Liên kết",
    "category": "happy",
    "priority": "P0",
    "role": "Guest",
    "preconditions": "Email/SĐT/CCCD chưa tồn tại trong PortalAccounts.",
    "steps": [
     "Mở /patient-portal tab Đăng ký",
     "Nhập Họ tên, Email, SĐT, CCCD, Ngày sinh, Mật khẩu hợp lệ",
     "Bấm Đăng ký tài khoản"
    ],
    "expected": "BE tạo PortalAccount trả về acc.id; hiện hộp xanh 'Đăng ký thành công. Tiếp tục liên kết...'; tự chuyển tab Liên kết với linkAccountId đã điền sẵn = acc.id.",
    "evidence": [
     {
      "name": "TC-PTL-005__s01__form",
      "caption": "Form đăng ký đã điền đủ",
      "uiState": "form"
     },
     {
      "name": "TC-PTL-005__s02__success",
      "caption": "Thông báo thành công + chuyển tab Liên kết",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-PTL-006",
    "title": "Đăng ký trùng email/SĐT/CCCD đã tồn tại bị từ chối",
    "category": "negative",
    "priority": "P0",
    "role": "Guest",
    "preconditions": "Đã có 1 PortalAccount với email X.",
    "steps": [
     "Mở tab Đăng ký",
     "Nhập email X (đã tồn tại) + dữ liệu khác",
     "Bấm Đăng ký tài khoản"
    ],
    "expected": "BE từ chối (trùng unique); hiện hộp đỏ 'Đăng ký thất bại — kiểm tra lại thông tin'; không tạo bản ghi trùng.",
    "evidence": [
     {
      "name": "TC-PTL-006__s01__error",
      "caption": "Đăng ký trùng bị từ chối",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-PTL-007",
    "title": "Validation đăng ký: email/SĐT sai định dạng, mật khẩu yếu, thiếu trường bắt buộc",
    "category": "validation",
    "priority": "P1",
    "role": "Guest",
    "preconditions": "Màn tab Đăng ký.",
    "steps": [
     "Nhập email không có @ (vd 'abc')",
     "Nhập SĐT chứa chữ cái",
     "Để trống Họ tên",
     "Mật khẩu quá ngắn (vd '1')",
     "Bấm Đăng ký"
    ],
    "expected": "Bị từ chối với thông báo lỗi tương ứng; không tạo tài khoản; nêu rõ field sai (email/phone/password/required).",
    "evidence": [
     {
      "name": "TC-PTL-007__s01__validation",
      "caption": "Các field sai định dạng báo lỗi",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#271"
    ],
    "notes": "Nếu BE/FE chưa validate -> ghi gap để bổ sung."
   },
   {
    "id": "TC-PTL-008",
    "title": "Đăng ký với ngày sinh tương lai / để trống (default 1900-01-01)",
    "category": "edge",
    "priority": "P2",
    "role": "Guest",
    "preconditions": "Màn tab Đăng ký.",
    "steps": [
     "Nhập ngày sinh là ngày trong tương lai (vd 2030-01-01)",
     "Đăng ký",
     "Lặp lại với ngày sinh để trống"
    ],
    "expected": "Ngày tương lai bị từ chối (BN không thể sinh tương lai); để trống -> FE gửi '1900-01-01' (cần kiểm BE có chấp nhận/cảnh báo).",
    "evidence": [
     {
      "name": "TC-PTL-008__s01__validation",
      "caption": "Ngày sinh tương lai bị chặn",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#271"
    ],
    "notes": "FE hard-default dateOfBirth='1900-01-01' khi trống — kiểm hệ quả nghiệp vụ."
   },
   {
    "id": "TC-PTL-009",
    "title": "Liên kết hồ sơ thành công khi thông tin xác minh khớp (SĐT/CCCD/ngày sinh)",
    "category": "happy",
    "priority": "P0",
    "role": "PortalPatient",
    "preconditions": "Có account chưa link + 1 Patient tại viện với patientCode + SĐT/CCCD/DOB đã biết.",
    "steps": [
     "Tab Liên kết",
     "Nhập Mã tài khoản (GUID)",
     "Nhập Mã bệnh nhân đúng (vd BN2026...)",
     "Nhập thông tin xác minh khớp",
     "Bấm Liên kết hồ sơ"
    ],
    "expected": "BE đối chiếu khớp -> success:true; hiện hộp xanh 'Liên kết thành công — đăng nhập để xem hồ sơ'; tự chuyển tab Đăng nhập; account.patientId được gán.",
    "evidence": [
     {
      "name": "TC-PTL-009__s01__form",
      "caption": "Form liên kết đã điền",
      "uiState": "form"
     },
     {
      "name": "TC-PTL-009__s02__success",
      "caption": "Liên kết thành công chuyển tab login",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-PTL-010",
    "title": "Liên kết hồ sơ thất bại khi thông tin xác minh KHÔNG khớp",
    "category": "negative",
    "priority": "P0",
    "role": "PortalPatient",
    "preconditions": "Account chưa link; biết 1 patientCode hợp lệ.",
    "steps": [
     "Tab Liên kết",
     "Nhập Mã tài khoản + Mã bệnh nhân đúng",
     "Nhập thông tin xác minh SAI (SĐT/CCCD/DOB không khớp)",
     "Bấm Liên kết"
    ],
    "expected": "BE trả success:false; hiện hộp đỏ 'Thông tin xác minh không khớp'; KHÔNG gán patientId; ngăn link nhầm hồ sơ người khác.",
    "evidence": [
     {
      "name": "TC-PTL-010__s01__error",
      "caption": "Xác minh không khớp bị từ chối",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#271"
    ],
    "notes": "Quan trọng patient-safety: chống cướp hồ sơ qua link sai."
   },
   {
    "id": "TC-PTL-011",
    "title": "IDOR — không thể liên kết / xem hồ sơ bệnh nhân khác bằng patientCode người khác",
    "category": "security",
    "priority": "P0",
    "role": "PortalPatient",
    "preconditions": "Đã đăng nhập với account A (patientId A). Biết patientCode của BN B.",
    "steps": [
     "Đăng nhập account A",
     "Thử gọi trực tiếp /api/portal/visits với query patientId=B (qua DevTools/curl với token A)",
     "Thử /api/portal/visits/{examId của B}",
     "Kiểm tab dữ liệu chỉ là của A"
    ],
    "expected": "BE derive patientId từ claim token PortalPatient, BỎ QUA patientId truyền vào -> chỉ trả dữ liệu của A; truy cập examId của B trả 403/404/empty; không lộ dữ liệu BN khác.",
    "evidence": [
     {
      "name": "TC-PTL-011__s01__permission",
      "caption": "Gọi API với patientId người khác vẫn chỉ ra dữ liệu của mình",
      "uiState": "permission"
     },
     {
      "name": "TC-PTL-011__s02__error",
      "caption": "Truy cập examId BN khác bị chặn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#270",
     "#216"
    ],
    "notes": "Comment trong code: 'IDOR đóng phía server'. Verify thật."
   },
   {
    "id": "TC-PTL-012",
    "title": "Workspace tab Lịch sử khám hiển thị đúng các lượt khám của chính BN",
    "category": "happy",
    "priority": "P0",
    "role": "PortalPatient",
    "preconditions": "Account A đã link, BN A có >=1 lượt khám.",
    "steps": [
     "Đăng nhập A",
     "Đợi load 4 promise",
     "Xem tab Lịch sử khám (mặc định)"
    ],
    "expected": "Bảng hiện cột Ngày khám (vi-VN) / Loại / Khoa / Bác sĩ / Chẩn đoán; số trong badge tab = số dòng; dữ liệu đúng của A.",
    "evidence": [
     {
      "name": "TC-PTL-012__s01__list",
      "caption": "Bảng lịch sử khám có dữ liệu",
      "uiState": "list"
     },
     {
      "name": "TC-PTL-012__s02__tab",
      "caption": "Badge count tab khớp số dòng",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-PTL-013",
    "title": "Tab KQ xét nghiệm — chỉ số bất thường được tô đỏ kèm khoảng tham chiếu",
    "category": "data-consistency",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "BN A có lab result với >=1 testItem isAbnormal=true và có referenceRange.",
    "steps": [
     "Đăng nhập A",
     "Mở tab KQ xét nghiệm (portal-tab-labs)",
     "Quan sát cột Chỉ số"
    ],
    "expected": "Mỗi testItem hiện 'TestName: result unit (referenceRange)'; item isAbnormal tô màu đỏ (#cf1322); item bình thường màu mặc định; số liệu khớp BE.",
    "evidence": [
     {
      "name": "TC-PTL-013__s01__list",
      "caption": "KQ XN với chỉ số abnormal màu đỏ",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#270"
    ],
    "notes": "An toàn: BN tự đọc KQ — tô bất thường phải chính xác."
   },
   {
    "id": "TC-PTL-014",
    "title": "Tab Đơn thuốc hiển thị danh sách thuốc đúng từng đơn",
    "category": "happy",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "BN A có >=1 đơn thuốc có items.",
    "steps": [
     "Đăng nhập A",
     "Mở tab Đơn thuốc (portal-tab-rx)",
     "Xem cột Thuốc"
    ],
    "expected": "Bảng hiện Mã đơn / Ngày kê / Bác sĩ / Chẩn đoán / Thuốc (mỗi item 'medicineName ×quantity — dosage'); khớp dữ liệu BE; đơn không có item hiện '—'.",
    "evidence": [
     {
      "name": "TC-PTL-014__s01__list",
      "caption": "Bảng đơn thuốc với danh sách thuốc",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-PTL-015",
    "title": "Tab Hóa đơn — format tiền vi-VN và badge trạng thái thanh toán đúng",
    "category": "data-consistency",
    "priority": "P0",
    "role": "PortalPatient",
    "preconditions": "BN A có >=1 hóa đơn Paid và >=1 Unpaid.",
    "steps": [
     "Đăng nhập A",
     "Mở tab Hóa đơn (portal-tab-bills)",
     "So sánh số tiền và badge với dữ liệu viện phí gốc"
    ],
    "expected": "Số tiền format toLocaleString('vi-VN')+' đ'; paymentStatus='Paid' -> badge xanh 'Đã thanh toán', khác -> badge cam 'Chưa thanh toán'; totalAmount khớp viện phí (chi phí -> viện phí -> hiển thị portal).",
    "evidence": [
     {
      "name": "TC-PTL-015__s01__list",
      "caption": "Bảng hóa đơn với badge Đã/Chưa thanh toán",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#270"
    ],
    "notes": "Data-consistency xuyên phân hệ billing -> portal."
   },
   {
    "id": "TC-PTL-016",
    "title": "Empty state — BN mới chưa có dữ liệu hiển thị 'Chưa có dữ liệu' ở cả 4 tab",
    "category": "ui",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "Account đã link BN nhưng BN chưa có khám/XN/đơn/hóa đơn.",
    "steps": [
     "Đăng nhập BN trống",
     "Lần lượt mở 4 tab"
    ],
    "expected": "Mỗi bảng hiện dòng 'Chưa có dữ liệu' (căn giữa, màu xám); badge count = 0; không lỗi.",
    "evidence": [
     {
      "name": "TC-PTL-016__s01__empty",
      "caption": "Empty state ở các tab",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-PTL-017",
    "title": "Loading state — hiển thị 'Đang tải…' khi đang fetch 4 nguồn",
    "category": "ui",
    "priority": "P2",
    "role": "PortalPatient",
    "preconditions": "Throttle mạng (DevTools Slow 3G).",
    "steps": [
     "Đăng nhập",
     "Quan sát ngay sau khi vào Workspace"
    ],
    "expected": "Trong lúc Promise.all chạy, bảng hiện 'Đang tải…'; sau khi xong chuyển sang dữ liệu/empty.",
    "evidence": [
     {
      "name": "TC-PTL-017__s01__loading",
      "caption": "Trạng thái Đang tải…",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-PTL-018",
    "title": "Error state — 1 trong 4 endpoint lỗi vẫn không vỡ toàn trang",
    "category": "ui",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "Chặn /portal/lab-results trả 500, các endpoint khác OK.",
    "steps": [
     "Đăng nhập",
     "Vào Workspace",
     "Mở tab KQ xét nghiệm"
    ],
    "expected": "Code .catch(()=>[]) -> tab lab hiện empty thay vì crash; các tab khác vẫn có dữ liệu; nếu lỗi tổng quát hiện hộp 'Không tải được dữ liệu — thử đăng nhập lại'.",
    "evidence": [
     {
      "name": "TC-PTL-018__s01__error",
      "caption": "Một endpoint lỗi, trang vẫn ổn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-PTL-019",
    "title": "Đăng xuất xóa token và quay về màn đăng nhập",
    "category": "state",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "Đã đăng nhập, đang ở Workspace.",
    "steps": [
     "Bấm Đăng xuất (portal-logout-btn)",
     "Quan sát màn hình + localStorage"
    ],
    "expected": "Xóa patient_portal_token, patient_portal_account, token; quay lại Auth card tab Đăng nhập; reload trang vẫn ở màn đăng nhập (không auto-login).",
    "evidence": [
     {
      "name": "TC-PTL-019__s01__success",
      "caption": "Sau đăng xuất về màn login",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-PTL-020",
    "title": "Persist session — đang đăng nhập, refresh trang vẫn vào thẳng Workspace",
    "category": "state",
    "priority": "P2",
    "role": "PortalPatient",
    "preconditions": "Đã đăng nhập (token trong localStorage).",
    "steps": [
     "Đăng nhập",
     "F5 refresh /patient-portal"
    ],
    "expected": "Đọc lại token+info từ localStorage -> vào thẳng Workspace, không bắt đăng nhập lại; nếu info JSON hỏng -> fallback về màn login (try/catch).",
    "evidence": [
     {
      "name": "TC-PTL-020__s01__success",
      "caption": "Refresh vẫn giữ phiên đăng nhập",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-PTL-021",
    "title": "Token hết hạn / không hợp lệ -> các API trả 401, hiển thị lỗi tải dữ liệu",
    "category": "state",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "Token PortalPatient hết hạn hoặc bị sửa.",
    "steps": [
     "Sửa localStorage token thành chuỗi rác",
     "Refresh Workspace"
    ],
    "expected": "4 API trả 401 -> catch -> các tab empty + hộp 'Không tải được dữ liệu — thử đăng nhập lại'; không lộ dữ liệu.",
    "evidence": [
     {
      "name": "TC-PTL-021__s01__error",
      "caption": "Token hỏng -> lỗi tải dữ liệu",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-PTL-022",
    "title": "Đặt lịch khám online thành công (PortalAppointments)",
    "category": "happy",
    "priority": "P0",
    "role": "PortalPatient",
    "preconditions": "BN đã link; có khoa/bác sĩ và slot trống (available-slots).",
    "steps": [
     "Vào màn đặt lịch (mobile /m/patient-portal)",
     "Chọn khoa, bác sĩ, ngày",
     "Chọn 1 slot IsAvailable=true",
     "Nhập lý do khám",
     "Bấm Đặt lịch"
    ],
    "expected": "Tạo PortalAppointment status Pending; có AppointmentCode/ConfirmationCode (+ QR/queueNumber nếu cấu hình); hiện trong danh sách lịch của BN.",
    "evidence": [
     {
      "name": "TC-PTL-022__s01__form",
      "caption": "Form đặt lịch đã chọn slot",
      "uiState": "form"
     },
     {
      "name": "TC-PTL-022__s02__success",
      "caption": "Đặt lịch thành công có mã xác nhận",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-PTL-023",
    "title": "Đặt lịch vào slot đã hết chỗ / ngày quá khứ bị từ chối",
    "category": "negative",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "Có slot RemainingSlots=0; biết 1 ngày quá khứ.",
    "steps": [
     "Chọn slot RemainingSlots=0 -> đặt",
     "Chọn ngày trong quá khứ -> đặt"
    ],
    "expected": "BE từ chối slot hết chỗ (không tạo); từ chối ngày quá khứ với thông báo rõ; không tạo PortalAppointment trùng giờ.",
    "evidence": [
     {
      "name": "TC-PTL-023__s01__validation",
      "caption": "Slot hết chỗ / ngày quá khứ bị chặn",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-PTL-024",
    "title": "Hủy lịch hẹn ở trạng thái cho phép, chặn hủy lịch đã CheckedIn/Completed",
    "category": "state",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "BN có 1 lịch Pending/Confirmed và 1 lịch CheckedIn.",
    "steps": [
     "Hủy lịch Pending qua appointments/{id}/cancel",
     "Thử hủy lịch CheckedIn/Completed"
    ],
    "expected": "Lịch Pending/Confirmed -> Cancelled thành công; lịch CheckedIn/Completed -> bị chặn với thông báo; trạng thái cập nhật đúng (state machine).",
    "evidence": [
     {
      "name": "TC-PTL-024__s01__confirm",
      "caption": "Xác nhận hủy lịch hợp lệ",
      "uiState": "confirm"
     },
     {
      "name": "TC-PTL-024__s02__error",
      "caption": "Chặn hủy lịch đã check-in",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-PTL-025",
    "title": "Yêu cầu tái cấp thuốc (RefillRequest) từ đơn còn refill",
    "category": "happy",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "BN có đơn thuốc CanRefill=true, RefillsRemaining>0.",
    "steps": [
     "Mở đơn thuốc đủ điều kiện refill",
     "Chọn DeliveryOption (Pickup/Delivery)",
     "Nếu Delivery nhập địa chỉ+SĐT",
     "Gửi yêu cầu refill"
    ],
    "expected": "Tạo RefillRequest status Pending gắn PrescriptionId; hiện trong danh sách yêu cầu; đơn không refill được (CanRefill=false) thì không có nút.",
    "evidence": [
     {
      "name": "TC-PTL-025__s01__form",
      "caption": "Form yêu cầu tái cấp thuốc",
      "uiState": "form"
     },
     {
      "name": "TC-PTL-025__s02__success",
      "caption": "Gửi refill thành công status Pending",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-PTL-026",
    "title": "Refill Delivery thiếu địa chỉ giao bị chặn (validation theo điều kiện)",
    "category": "validation",
    "priority": "P2",
    "role": "PortalPatient",
    "preconditions": "Đơn refill được, chọn DeliveryOption=Delivery.",
    "steps": [
     "Chọn Delivery",
     "Để trống DeliveryAddress/DeliveryPhone",
     "Gửi"
    ],
    "expected": "Bị từ chối yêu cầu nhập địa chỉ + SĐT giao; Pickup thì không bắt buộc địa chỉ.",
    "evidence": [
     {
      "name": "TC-PTL-026__s01__validation",
      "caption": "Delivery thiếu địa chỉ báo lỗi",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-PTL-027",
    "title": "Thêm/sửa/xóa thành viên gia đình (FamilyMembers)",
    "category": "happy",
    "priority": "P2",
    "role": "PortalPatient",
    "preconditions": "Đã đăng nhập.",
    "steps": [
     "Mở Thành viên gia đình",
     "Thêm: nhập FullName/Relationship/DOB/Gender/Phone",
     "Lưu",
     "Sửa quan hệ",
     "Xóa thành viên"
    ],
    "expected": "CRUD qua SaveFamilyMemberDto thành công; AccountId gắn đúng account đang đăng nhập; danh sách cập nhật; chỉ thấy thành viên của account mình.",
    "evidence": [
     {
      "name": "TC-PTL-027__s01__list",
      "caption": "Danh sách thành viên gia đình",
      "uiState": "list"
     },
     {
      "name": "TC-PTL-027__s02__form",
      "caption": "Form thêm thành viên",
      "uiState": "form"
     },
     {
      "name": "TC-PTL-027__s03__success",
      "caption": "Thêm thành viên thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-PTL-028",
    "title": "Tạo nhắc uống thuốc (MedicineReminders) và bật/tắt IsActive",
    "category": "happy",
    "priority": "P2",
    "role": "PortalPatient",
    "preconditions": "Đã đăng nhập.",
    "steps": [
     "Mở Nhắc uống thuốc",
     "Thêm: MedicineName/Dosage/Frequency/Times/StartDate",
     "Lưu",
     "Tắt IsActive một nhắc"
    ],
    "expected": "Tạo MedicineReminder gắn AccountId; Times lưu đúng; toggle IsActive cập nhật; EndDate optional.",
    "evidence": [
     {
      "name": "TC-PTL-028__s01__form",
      "caption": "Form thêm nhắc uống thuốc",
      "uiState": "form"
     },
     {
      "name": "TC-PTL-028__s02__list",
      "caption": "Danh sách nhắc với toggle IsActive",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-PTL-029",
    "title": "Nhập chỉ số sức khỏe (HealthMetrics) và xem biểu đồ xu hướng",
    "category": "happy",
    "priority": "P2",
    "role": "PortalPatient",
    "preconditions": "Đã đăng nhập.",
    "steps": [
     "Mở Chỉ số sức khỏe",
     "Nhập huyết áp tâm thu/tâm trương, nhịp tim, cân nặng, đường huyết, SpO2",
     "Lưu nhiều lần với ngày khác nhau",
     "Xem biểu đồ trend"
    ],
    "expected": "Lưu HealthMetric gắn AccountId+RecordedAt; biểu đồ HealthMetricTrend hiện min/max/avg/latest đúng; số liệu khớp lần nhập.",
    "evidence": [
     {
      "name": "TC-PTL-029__s01__form",
      "caption": "Form nhập chỉ số sức khỏe",
      "uiState": "form"
     },
     {
      "name": "TC-PTL-029__s02__list",
      "caption": "Biểu đồ xu hướng chỉ số",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-PTL-030",
    "title": "Boundary chỉ số sức khỏe: giá trị âm/0/rất lớn/SpO2 ngoài 0-100",
    "category": "edge",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "Màn nhập chỉ số.",
    "steps": [
     "Nhập huyết áp tâm thu = -10",
     "Nhập SpO2 = 150",
     "Nhập cân nặng = 0",
     "Nhập đường huyết = 999999",
     "Lưu từng trường hợp"
    ],
    "expected": "Giá trị phi lý bị chặn/cảnh báo (SpO2 0-100, huyết áp/cân nặng/nhịp tim > 0 và trong dải sinh lý); không lưu giá trị âm; tránh hiển thị chỉ số sai gây hiểu nhầm sức khỏe.",
    "evidence": [
     {
      "name": "TC-PTL-030__s01__validation",
      "caption": "Chỉ số ngoài dải bị chặn",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#271"
    ],
    "notes": "Patient-safety: chỉ số tự nhập sai dễ gây hoảng/loạn theo dõi."
   },
   {
    "id": "TC-PTL-031",
    "title": "Gửi câu hỏi cho bác sĩ (PatientQuestions) và xem trạng thái chờ trả lời",
    "category": "happy",
    "priority": "P2",
    "role": "PortalPatient",
    "preconditions": "Đã đăng nhập.",
    "steps": [
     "Mở Câu hỏi của BN",
     "Nhập Subject + Content + Category",
     "Gửi"
    ],
    "expected": "Tạo PatientQuestion status chờ (StatusText); hiện trong danh sách hỏi-đáp của account; khi bác sĩ trả lời -> Answer/AnsweredBy hiển thị.",
    "evidence": [
     {
      "name": "TC-PTL-031__s01__form",
      "caption": "Form gửi câu hỏi",
      "uiState": "form"
     },
     {
      "name": "TC-PTL-031__s02__list",
      "caption": "Danh sách câu hỏi trạng thái chờ",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-PTL-032",
    "title": "XSS — nội dung câu hỏi/ghi chú chứa thẻ script không bị thực thi",
    "category": "security",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "Màn gửi câu hỏi (hoặc ghi chú chỉ số/refill).",
    "steps": [
     "Nhập Content = \"<script>alert('xss')</script>\" và \"<img src=x onerror=alert(1)>\"",
     "Gửi",
     "Mở lại danh sách hỏi-đáp (và view phía staff nếu có)"
    ],
    "expected": "Nội dung hiển thị dưới dạng text đã escape, KHÔNG chạy script; không lộ alert; lưu nguyên văn nhưng render an toàn cả phía BN và staff.",
    "evidence": [
     {
      "name": "TC-PTL-032__s01__detail",
      "caption": "Nội dung script hiển thị dạng text không thực thi",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-PTL-033",
    "title": "Tiếng Việt có dấu + chuỗi rất dài trong họ tên/lý do khám/câu hỏi",
    "category": "edge",
    "priority": "P2",
    "role": "PortalPatient",
    "preconditions": "Bất kỳ form nhập text (đăng ký/đặt lịch/câu hỏi).",
    "steps": [
     "Nhập họ tên 'Nguyễn Thị Ánh Tuyết' (đủ dấu)",
     "Nhập lý do khám 500+ ký tự",
     "Nhập ký tự đặc biệt & < > \" '"
    ],
    "expected": "Lưu và hiển thị đúng dấu tiếng Việt (không lỗi font/mojibake); chuỗi dài bị cắt theo maxlength hoặc lưu đủ + hiển thị xuống dòng; ký tự đặc biệt được escape an toàn.",
    "evidence": [
     {
      "name": "TC-PTL-033__s01__form",
      "caption": "Nhập tiếng Việt có dấu + chuỗi dài",
      "uiState": "form"
     },
     {
      "name": "TC-PTL-033__s02__detail",
      "caption": "Hiển thị lại đúng dấu",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-PTL-034",
    "title": "Permission — không thể truy cập /patient-portal bằng token nhân viên (admin) và ngược lại",
    "category": "permission",
    "priority": "P0",
    "role": "PortalPatient",
    "preconditions": "Có token admin (Admin@123) và token PortalPatient.",
    "steps": [
     "Đăng nhập admin lấy JWT",
     "Gọi /api/portal/visits với token admin",
     "Dùng token PortalPatient gọi API nội bộ nhân viên (vd /api/billing...)"
    ],
    "expected": "Token admin không có claim patientId -> /portal/visits trả lỗi/empty (không phải BN); token PortalPatient bị chặn 401/403 ở API nghiệp vụ nhân viên; phân tách vai trò rõ.",
    "evidence": [
     {
      "name": "TC-PTL-034__s01__permission",
      "caption": "Token sai vai trò bị chặn",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#270"
    ]
   },
   {
    "id": "TC-PTL-035",
    "title": "View staff (patient-portal-staff) chỉ truy cập được khi đăng nhập nhân viên có quyền",
    "category": "permission",
    "priority": "P1",
    "role": "Staff",
    "preconditions": "Route /patient-portal-staff trong MainLayout (cần đăng nhập app).",
    "steps": [
     "Truy cập /patient-portal-staff khi chưa đăng nhập app",
     "Đăng nhập admin rồi truy cập lại"
    ],
    "expected": "Chưa đăng nhập -> redirect login app; đăng nhập đủ quyền -> xem được màn quản trị portal phía nhân viên; phân biệt rõ với cổng self-login BN.",
    "evidence": [
     {
      "name": "TC-PTL-035__s01__permission",
      "caption": "Chặn truy cập staff view khi chưa đăng nhập",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-PTL-036",
    "title": "Dark/light parity — cổng BN có thể chạy chế độ tối không vỡ tương phản",
    "category": "ui",
    "priority": "P2",
    "role": "PortalPatient",
    "preconditions": "Standalone portal dùng inline-style cố định (không theo theme app).",
    "steps": [
     "Mở /patient-portal ở light",
     "Bật dark mode hệ điều hành/trình duyệt",
     "Mở lại bản mobile /m/patient-portal (trong app có toggle)"
    ],
    "expected": "Standalone hardcode màu sáng -> ghi nhận có/không hỗ trợ dark; bản /m trong TerminalLayout phải parity dark/light, đủ tương phản chữ/nền, badge đọc được.",
    "evidence": [
     {
      "name": "TC-PTL-036__s01__detail",
      "caption": "Đối chiếu light vs dark",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#270"
    ],
    "notes": "Standalone không theo dark-toggle topbar v2 -> ghi gap nếu yêu cầu dark."
   },
   {
    "id": "TC-PTL-037",
    "title": "Responsive — cổng BN trên màn mobile hẹp (375px) không vỡ layout",
    "category": "ui",
    "priority": "P2",
    "role": "PortalPatient",
    "preconditions": "DevTools responsive 375x812.",
    "steps": [
     "Mở /patient-portal ở 375px",
     "Đăng nhập",
     "Cuộn bảng 4 tab (overflow auto)"
    ],
    "expected": "Auth card 460px co lại không tràn; tab bar wrap; bảng cuộn ngang (overflow:auto) không che nội dung; nút bấm đủ lớn.",
    "evidence": [
     {
      "name": "TC-PTL-037__s01__detail",
      "caption": "Layout 375px không vỡ",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-PTL-038",
    "title": "Data-consistency — đặt lịch ở portal hiển thị đúng ở phân hệ tiếp đón/khám",
    "category": "data-consistency",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "Liên thông portal<->reception. BN đặt lịch online thành công (TC-PTL-022).",
    "steps": [
     "BN đặt 1 lịch online ngày mai khoa X",
     "Đăng nhập nhân viên Tiếp đón",
     "Tìm BN/lịch hẹn ngày mai"
    ],
    "expected": "PortalAppointment hiện ở danh sách lịch hẹn/tiếp đón (RELATED_X reception); thông tin khoa/giờ/BN khớp; audit log ghi nguồn 'Portal'.",
    "evidence": [
     {
      "name": "TC-PTL-038__s01__list",
      "caption": "Lịch đặt qua portal hiện ở tiếp đón",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#271"
    ],
    "notes": "Verify thật liên thông — nếu chưa nối -> gap."
   },
   {
    "id": "TC-PTL-039",
    "title": "Audit log ghi nhận mọi mutation từ cổng BN (đăng ký/link/đặt lịch/refill)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "AuditLog hoạt động; quyền xem audit (admin).",
    "steps": [
     "BN thực hiện: đăng ký, liên kết hồ sơ, đặt lịch, hủy lịch, gửi refill",
     "Đăng nhập admin xem AuditLog/lịch sử"
    ],
    "expected": "Mỗi mutation có bản ghi audit: ai (account/patientId), hành động, thời gian, dữ liệu trước/sau; CreatedBy là user thật (không Guid.Empty).",
    "evidence": [
     {
      "name": "TC-PTL-039__s01__list",
      "caption": "Audit log các thao tác từ portal",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-PTL-040",
    "title": "Đăng nhập bằng tài khoản chưa liên kết hồ sơ -> không có dữ liệu y tế",
    "category": "state",
    "priority": "P1",
    "role": "PortalPatient",
    "preconditions": "Account đã đăng ký nhưng CHƯA link (patientId=null, status có thể Pending).",
    "steps": [
     "Đăng nhập account chưa link",
     "Vào Workspace 4 tab"
    ],
    "expected": "Đăng nhập được nhưng không có patientId -> 4 tab empty 'Chưa có dữ liệu'; (lý tưởng) gợi ý liên kết hồ sơ; KHÔNG lộ dữ liệu BN khác.",
    "evidence": [
     {
      "name": "TC-PTL-040__s01__empty",
      "caption": "Account chưa link -> không có dữ liệu",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#271"
    ],
    "notes": "Migration 88_portal_account_patientid_nullable cho phép patientId null."
   }
  ],
  "ui_state_checklist": [
   "Auth: form đăng nhập (đã điền / trống)",
   "Auth: loading nút 'Đang xác thực…'",
   "Auth: error hộp đỏ (sai mật khẩu / mất kết nối / xác minh không khớp / đăng ký trùng)",
   "Auth: success hộp xanh (đăng ký / liên kết)",
   "Auth: form đăng ký + form liên kết hồ sơ",
   "Auth: chuyển tab login/register/link",
   "Workspace: header + tab bar có badge count",
   "Tab list có dữ liệu (visits/labs/rx/bills)",
   "Empty state 'Chưa có dữ liệu' từng tab",
   "Loading state 'Đang tải…'",
   "Error state 'Không tải được dữ liệu — thử đăng nhập lại'",
   "KQ XN: chỉ số bất thường tô đỏ + reference range",
   "Hóa đơn: badge Đã/Chưa thanh toán + tiền vi-VN",
   "Validation từng field (đăng ký / chỉ số / refill / đặt lịch)",
   "Confirm hủy lịch",
   "Permission: token sai vai trò bị chặn / IDOR đóng server",
   "State: đăng xuất / persist session / token hết hạn / account chưa link",
   "Đặt lịch: form + success có mã xác nhận/QR",
   "CRUD family member / medicine reminder / health metric / question (form + list)",
   "Detail: hiển thị tiếng Việt có dấu + nội dung XSS escape an toàn",
   "Responsive 375px + dark/light parity"
  ],
  "gaps": [
   "Standalone portal (/patient-portal) dùng inline-style hardcode màu sáng -> KHÔNG theo dark-toggle topbar v2; cần xác nhận yêu cầu dark mode hay chấp nhận chỉ light.",
   "FE đăng nhập/đăng ký chưa validate client-side (rỗng/định dạng email/SĐT/mật khẩu mạnh) — cần kiểm BE từ chối; nên bổ sung validate FE để UX rõ.",
   "FE hard-default dateOfBirth='1900-01-01' khi để trống lúc đăng ký -> rủi ro dữ liệu rác; cần test BE chặn ngày phi lý.",
   "Luồng eKYC (eKYCVerificationDto: ảnh CCCD trước/sau + selfie + matchScore) có DTO nhưng chưa rõ UI thực — chưa có task UI; cần xác minh có triển khai để bổ sung test path-traversal/upload ảnh.",
   "Thanh toán online (OnlinePaymentDto VNPay/Momo, IPN/return callback) có DTO nhưng task hiện chỉ xem hóa đơn — cần xác minh tích hợp cổng thanh toán để thêm test integration (initiate/return/IDOR invoiceId người khác).",
   "CĐHA portal (PortalImagingResultDto, ImageViewerUrl link PACS) chưa có tab ở standalone — nếu BN xem ảnh DICOM thì cần test path-traversal/IDOR study của BN khác.",
   "Liên thông portal->reception (đặt lịch hiện ở tiếp đón) và portal->national chưa verify thực trong session này — cần xác nhận nối thật hay stub trước khi khẳng định data-consistency.",
   "Q&A/refill có thể phải staff trả lời/duyệt -> cần test luồng 2 chiều (BN gửi -> staff trả lời -> BN thấy) và quyền của staff khi trả lời PatientQuestions.",
   "FamilyMembers nhận AccountId từ client (SaveFamilyMemberDto.AccountId) -> rủi ro IDOR thêm thành viên vào account người khác; cần test BE bắt buộc derive AccountId từ token, bỏ qua giá trị client.",
   "Rate-limit/anti-bruteforce ở /portal/login và chống enumerate email khi đăng ký chưa có task — nên bổ sung security test khóa tài khoản sau N lần sai (AccountStatus Locked)."
  ]
 },
 {
  "id": "tele",
  "code": "TEL",
  "layer": "spec",
  "ic": "💻",
  "nm": "Khám từ xa (Telemedicine)",
  "gh": [
   "#270",
   "#271"
  ],
  "gap": false,
  "module_id": "tele",
  "summary": "Phân hệ Khám từ xa (Telemedicine, code TEL, lớp D-spec) quản lý vòng đời khám online theo chuỗi TeleAppointments → TeleSessions (phiên video) → TeleConsultations (hội chẩn/khám) → TelePrescriptions + TelePrescriptionItems (đơn thuốc từ xa), kèm TeleFeedbacks (phản hồi) và TeleconsultationRequests (yêu cầu hội chẩn). Màn chính v2 tại /v2/telemedicine: list lịch hẹn có KpiStrip + StatusTabs (Đã đặt/Chờ vào phòng/Đang khám/Hoàn tất/Không tham gia/Đã huỷ) + DataTable, DrawerShell chi tiết (BN/BS/phiên video/thanh toán/ghi chú) và ModalShell kê đơn tele 3 bước (Tạo đơn → Ký → Gửi quầy phát thuốc). Có liên kết chéo Cổng BN (portal) và cổng QG (national); tích hợp video (Jitsi roomUrl) + dashboard thống kê theo BS/khoa.",
  "screens": [
   {
    "name": "Danh sách lịch khám từ xa",
    "desc": "Màn list chính: KpiStrip 6 ô (Hôm nay/Đang khám/Chờ vào phòng/Hoàn tất 7 ngày/Không tham gia/Tổng), ô tìm kiếm, nút Bỏ lọc/Làm mới/Xuất CSV/Đặt lịch, StatusTabs theo 6 trạng thái, DataTable cột Mã·BN·BS·Lý do·Lịch hẹn·Phí·Thanh toán·Trạng thái, Pager. Hành động dòng: Vào phòng / Xác nhận / Chi tiết.",
    "route_guess": "/v2/telemedicine",
    "elements": [
     "KpiStrip",
     "SearchBox",
     "StatusTabs",
     "DataTable",
     "Pager",
     "ActBtn play/check/eye",
     "Btn Xuất CSV",
     "Btn Đặt lịch (điều hướng /v2/booking-management)"
    ]
   },
   {
    "name": "Drawer chi tiết lịch hẹn",
    "desc": "DrawerShell size lg hiện 5 section: Trạng thái + chip thanh toán, Bệnh nhân (họ tên/mã/SĐT/email/ngày sinh/giới), Bác sĩ & lịch (BS/chuyên khoa/loại khám/lý do/thời lượng), Phiên video (meeting URL + sessionId), Thanh toán (phí VND + trạng thái), Ghi chú. Footer: Đóng/Xác nhận/Huỷ/Kê đơn thuốc/Vào phòng theo trạng thái.",
    "route_guess": "/v2/telemedicine (drawer)",
    "elements": [
     "DrawerShell",
     "rec-section",
     "StatusBadge",
     "chip ok/warn",
     "link meeting URL",
     "Btn Xác nhận/Huỷ/Kê đơn/Vào phòng"
    ]
   },
   {
    "name": "Modal kê đơn thuốc khám từ xa",
    "desc": "ModalShell size lg kê đơn từ phiên tele: nhiều dòng thuốc (Select tìm thuốc ≥2 ký tự, SL, Liều dùng, Tần suất, Số ngày, Hướng dẫn) + Thêm dòng/Xoá dòng + Ghi chú đơn. Sau Tạo đơn chuyển sang view đơn đã tạo (mã/trạng thái/số thuốc) với nút Ký đơn (Draft→Signed) và Gửi quầy phát (→SentToPharmacy).",
    "route_guess": "/v2/telemedicine (modal)",
    "elements": [
     "ModalShell",
     "Select showSearch thuốc",
     "InputNumber SL/Số ngày",
     "Input Liều/Tần suất/Hướng dẫn",
     "TextArea Ghi chú",
     "Btn Tạo đơn/Ký đơn/Gửi quầy phát",
     "chip trạng thái đơn"
    ]
   },
   {
    "name": "Phiên video (cửa sổ ngoài)",
    "desc": "Bấm Vào phòng mở videoRoomUrl (Jitsi) ở tab mới; nếu chưa có phòng hiện thông báo. Không phải route nội bộ nhưng là trạng thái UI cần kiểm (đã tạo/chưa tạo phòng).",
    "route_guess": "window.open(videoRoomUrl)",
    "elements": [
     "external Jitsi room",
     "toast Phòng họp chưa được tạo"
    ]
   }
  ],
  "ui_state_checklist": [
   "list — bảng có dữ liệu nhiều trạng thái",
   "empty — không có lịch khám từ xa nào",
   "loading — Đang tải… khi reload",
   "filter — lọc theo StatusTabs (scheduled/waiting/ongoing/completed/noshow/cancelled)",
   "filter — tìm kiếm theo BN/BS/mã hẹn/lý do",
   "drawer — chi tiết lịch hẹn đầy đủ 5 section",
   "modal — kê đơn thuốc (form nhập)",
   "modal — view đơn đã tạo (Draft/Signed/SentToPharmacy)",
   "dropdown — Select tìm thuốc trong modal kê đơn",
   "validation — thiếu thuốc / SL ≤ 0 khi tạo đơn",
   "validation — buổi khám chưa có sessionId khi kê đơn",
   "confirm — xác nhận / huỷ lịch hẹn",
   "success — toast xác nhận/huỷ/tạo đơn/ký/gửi quầy thành công",
   "toast — phòng họp chưa tạo / không có dữ liệu xuất",
   "error — API thất bại (tạo đơn/ký/gửi/confirm/cancel)",
   "permission — vai trò không đủ quyền bị chặn menu/nút/API",
   "detail — KpiStrip số liệu khớp dữ liệu",
   "dark — parity sáng/tối toàn màn list+drawer+modal"
  ],
  "tasks": [
   {
    "id": "TC-TEL-001",
    "title": "Tải danh sách lịch khám từ xa và KPI hiển thị đúng",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Đăng nhập admin/Admin@123; có ≥1 lịch tele trong khoảng -30..+60 ngày.",
    "steps": [
     "Đăng nhập, mở /v2/telemedicine",
     "Chờ bảng tải xong",
     "Đối chiếu 6 ô KpiStrip (Hôm nay/Đang khám/Chờ vào phòng/Hoàn tất 7 ngày/Không tham gia/Tổng) với số dòng từng trạng thái",
     "Kiểm cột Mã·BN·BS·Lý do·Lịch hẹn·Phí·Thanh toán·Trạng thái"
    ],
    "expected": "Bảng hiển thị danh sách; KPI 'Tổng cộng' = số dòng; các ô KPI khớp đếm trạng thái; phí định dạng VND (vd '150.000 ₫') hoặc 'Miễn phí'; ngày DD/MM/YYYY.",
    "evidence": [
     {
      "name": "TC-TEL-001__s01__list",
      "caption": "Danh sách lịch tele + KpiStrip có dữ liệu",
      "uiState": "list"
     },
     {
      "name": "TC-TEL-001__s02__detail",
      "caption": "KpiStrip cận cảnh khớp số liệu",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#270",
     "#271"
    ]
   },
   {
    "id": "TC-TEL-002",
    "title": "Lọc theo StatusTabs từng trạng thái",
    "category": "happy",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có lịch ở nhiều trạng thái (Đã đặt/Chờ/Đang khám/Hoàn tất/No-show/Huỷ).",
    "steps": [
     "Mở /v2/telemedicine",
     "Bấm lần lượt từng tab trạng thái",
     "Quan sát badge số đếm trên tab và dữ liệu bảng"
    ],
    "expected": "Mỗi tab chỉ hiện đúng các dòng có trạng thái tương ứng; badge đếm trên tab khớp số dòng; bấm 'Bỏ lọc' trở về tab 'all'.",
    "evidence": [
     {
      "name": "TC-TEL-002__s01__filter",
      "caption": "Lọc tab Đang khám",
      "uiState": "filter"
     },
     {
      "name": "TC-TEL-002__s02__filter",
      "caption": "Lọc tab Đã huỷ",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-TEL-003",
    "title": "Tìm kiếm theo tên BN / BS / mã hẹn / lý do",
    "category": "happy",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có ≥2 lịch khác BN/BS.",
    "steps": [
     "Nhập một phần tên BN vào ô tìm kiếm",
     "Xoá, nhập mã hẹn",
     "Xoá, nhập tên BS"
    ],
    "expected": "Bảng lọc theo từ khoá không phân biệt hoa thường; khớp trên appointmentCode/patientName/patientCode/doctorName/chiefComplaint; không khớp → hiển thị empty.",
    "evidence": [
     {
      "name": "TC-TEL-003__s01__filter",
      "caption": "Tìm theo tên bệnh nhân",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-TEL-004",
    "title": "Mở Drawer chi tiết lịch hẹn — đủ 5 section",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có ≥1 lịch tele.",
    "steps": [
     "Bấm vào 1 dòng (hoặc nút Chi tiết)",
     "Drawer mở",
     "Kiểm 5 section: Trạng thái, Bệnh nhân, Bác sĩ & lịch, Phiên video, Thanh toán + Ghi chú nếu có"
    ],
    "expected": "Drawer hiện đúng dữ liệu dòng đã chọn; mã hẹn mono màu cyan; meeting URL là link mở tab mới khi có, 'Chưa tạo' khi không; phí VND; footer hiện nút theo trạng thái.",
    "evidence": [
     {
      "name": "TC-TEL-004__s01__drawer",
      "caption": "Drawer chi tiết đầy đủ 5 section",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-TEL-005",
    "title": "Xác nhận lịch hẹn (status 0 → confirmed)",
    "category": "state",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có lịch trạng thái 'Đã đặt' (status=0).",
    "steps": [
     "Mở drawer 1 lịch status=0",
     "Bấm 'Xác nhận'",
     "Quan sát toast và bảng reload"
    ],
    "expected": "Toast success 'Đã xác nhận · <BN>'; lịch chuyển trạng thái; nút Xác nhận chỉ xuất hiện khi status=0 (không hiện ở các trạng thái khác).",
    "evidence": [
     {
      "name": "TC-TEL-005__s01__confirm",
      "caption": "Nút Xác nhận trong drawer status Đã đặt",
      "uiState": "confirm"
     },
     {
      "name": "TC-TEL-005__s02__success",
      "caption": "Toast xác nhận thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-TEL-006",
    "title": "Huỷ lịch hẹn có lý do",
    "category": "state",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có lịch chưa ở trạng thái Hoàn tất/Huỷ/No-show (status không thuộc {3,4,5}).",
    "steps": [
     "Mở drawer 1 lịch hợp lệ",
     "Bấm 'Huỷ'",
     "Quan sát toast và reload"
    ],
    "expected": "Toast warning 'Đã hủy · <BN>'; lịch chuyển sang Đã huỷ; nút Huỷ KHÔNG hiện với lịch đã Hoàn tất/Huỷ/No-show.",
    "evidence": [
     {
      "name": "TC-TEL-006__s01__confirm",
      "caption": "Nút Huỷ trong drawer",
      "uiState": "confirm"
     },
     {
      "name": "TC-TEL-006__s02__success",
      "caption": "Toast đã huỷ",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-TEL-007",
    "title": "Chặn chuyển trạng thái không hợp lệ (huỷ/xác nhận lịch đã hoàn tất)",
    "category": "state",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có lịch trạng thái Hoàn tất (status=3) hoặc Đã huỷ (status=4).",
    "steps": [
     "Mở drawer lịch status=3 (Hoàn tất)",
     "Kiểm các nút footer",
     "Mở drawer lịch status=4 (Đã huỷ)"
    ],
    "expected": "Lịch Hoàn tất/Huỷ/No-show KHÔNG hiển thị nút Xác nhận và Huỷ; không thể tái-huỷ/tái-xác nhận từ UI; nếu gọi API trực tiếp BE phải từ chối.",
    "evidence": [
     {
      "name": "TC-TEL-007__s01__drawer",
      "caption": "Drawer lịch Hoàn tất không có nút huỷ/xác nhận",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-TEL-008",
    "title": "Vào phòng video khi có roomUrl",
    "category": "integration",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có lịch có videoRoomUrl (Jitsi).",
    "steps": [
     "Trong drawer hoặc dòng bảng bấm 'Vào phòng'/icon play",
     "Quan sát tab mới"
    ],
    "expected": "Mở videoRoomUrl ở tab mới (Jitsi); chỉ hiện nút Vào phòng khi có videoRoomUrl và status thuộc {0,1} ở bảng / có URL ở drawer.",
    "evidence": [
     {
      "name": "TC-TEL-008__s01__drawer",
      "caption": "Section Phiên video có meeting URL",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-TEL-009",
    "title": "Vào phòng khi chưa tạo phòng video",
    "category": "negative",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có lịch KHÔNG có videoRoomUrl.",
    "steps": [
     "Cố bấm 'Vào phòng' ở lịch chưa có URL (qua đường có thể trigger onJoin)"
    ],
    "expected": "Hiển thị toast info 'Phòng họp chưa được tạo'; KHÔNG mở tab trống.",
    "evidence": [
     {
      "name": "TC-TEL-009__s01__toast",
      "caption": "Toast phòng họp chưa tạo",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-TEL-010",
    "title": "Kê đơn tele — luồng đầy đủ Tạo → Ký → Gửi quầy phát",
    "category": "happy",
    "priority": "P0",
    "role": "doctor",
    "preconditions": "Có lịch có sessionId, status không thuộc {4,5}; danh mục thuốc có dữ liệu.",
    "steps": [
     "Mở drawer lịch hợp lệ, bấm 'Kê đơn thuốc'",
     "Trong modal gõ ≥2 ký tự tìm thuốc, chọn thuốc, nhập SL/Liều/Tần suất/Số ngày/Hướng dẫn",
     "Bấm 'Tạo đơn'",
     "Bấm 'Ký đơn'",
     "Bấm 'Gửi quầy phát'"
    ],
    "expected": "Tạo đơn → toast 'Đã tạo đơn <mã>'; view đơn hiện mã/trạng thái Draft/số thuốc; Ký → trạng thái Signed; Gửi quầy phát → SentToPharmacy + toast; đơn mã TELE-… xuất hiện chờ cấp phát ở quầy phát thuốc.",
    "evidence": [
     {
      "name": "TC-TEL-010__s01__modal",
      "caption": "Form kê đơn tele nhập thuốc",
      "uiState": "modal"
     },
     {
      "name": "TC-TEL-010__s02__dropdown",
      "caption": "Select tìm thuốc ≥2 ký tự",
      "uiState": "dropdown"
     },
     {
      "name": "TC-TEL-010__s03__success",
      "caption": "Đơn đã tạo trạng thái Draft",
      "uiState": "success"
     },
     {
      "name": "TC-TEL-010__s04__success",
      "caption": "Đơn Signed sau khi ký",
      "uiState": "success"
     },
     {
      "name": "TC-TEL-010__s05__success",
      "caption": "Đơn SentToPharmacy sau khi gửi quầy",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#270",
     "#271"
    ]
   },
   {
    "id": "TC-TEL-011",
    "title": "Kê đơn không chọn thuốc nào — chặn tạo",
    "category": "validation",
    "priority": "P0",
    "role": "doctor",
    "preconditions": "Mở modal kê đơn cho lịch có sessionId.",
    "steps": [
     "Để dòng thuốc trống (không chọn thuốc)",
     "Bấm 'Tạo đơn'"
    ],
    "expected": "Toast warning 'Chọn ít nhất 1 thuốc'; không gọi API tạo đơn; modal giữ trạng thái nhập.",
    "evidence": [
     {
      "name": "TC-TEL-011__s01__validation",
      "caption": "Cảnh báo chọn ít nhất 1 thuốc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-TEL-012",
    "title": "Kê đơn cho lịch chưa có phiên video (thiếu sessionId)",
    "category": "negative",
    "priority": "P1",
    "role": "doctor",
    "preconditions": "Lịch chưa có sessionId nhưng status cho phép mở modal.",
    "steps": [
     "Mở modal kê đơn cho lịch thiếu sessionId",
     "Chọn thuốc, bấm 'Tạo đơn'"
    ],
    "expected": "Toast warning 'Buổi khám chưa có phiên video (sessionId)'; không tạo đơn.",
    "evidence": [
     {
      "name": "TC-TEL-012__s01__validation",
      "caption": "Cảnh báo thiếu sessionId",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-TEL-013",
    "title": "Boundary số lượng/số ngày trong dòng thuốc",
    "category": "edge",
    "priority": "P1",
    "role": "doctor",
    "preconditions": "Mở modal kê đơn, đã chọn 1 thuốc.",
    "steps": [
     "Đặt SL = 0 hoặc để InputNumber về dưới min",
     "Thử SL rất lớn (vd 999999)",
     "Đặt Số ngày = 0",
     "Bấm 'Tạo đơn'"
    ],
    "expected": "InputNumber min=1 chặn ≤0 (không cho nhập 0/âm); dòng có quantity ≤0 bị loại khỏi items; số lớn được chấp nhận nhưng nên cảnh báo nếu vượt ngưỡng hợp lý; durationDays 0 → bỏ qua field.",
    "evidence": [
     {
      "name": "TC-TEL-013__s01__validation",
      "caption": "SL bị chặn ở giá trị min",
      "uiState": "validation"
     },
     {
      "name": "TC-TEL-013__s02__edge",
      "caption": "Nhập SL rất lớn",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-TEL-014",
    "title": "Thêm/xoá nhiều dòng thuốc",
    "category": "happy",
    "priority": "P2",
    "role": "doctor",
    "preconditions": "Mở modal kê đơn.",
    "steps": [
     "Bấm 'Thêm dòng' vài lần",
     "Nhập thuốc khác nhau từng dòng",
     "Xoá 1 dòng giữa",
     "Tạo đơn"
    ],
    "expected": "Mỗi dòng có key tăng dần độc lập; xoá đúng dòng; chỉ các dòng có thuốc + SL>0 vào items; đơn tạo gồm đúng số thuốc còn lại.",
    "evidence": [
     {
      "name": "TC-TEL-014__s01__form",
      "caption": "Nhiều dòng thuốc trong modal",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-TEL-015",
    "title": "Ký đơn / Gửi quầy phát thất bại — xử lý lỗi",
    "category": "negative",
    "priority": "P1",
    "role": "doctor",
    "preconditions": "Đã tạo đơn Draft; mô phỏng BE trả lỗi (network/500) cho sign hoặc send.",
    "steps": [
     "Bấm 'Ký đơn' khi BE lỗi",
     "Bấm 'Gửi quầy phát' khi BE trả false/lỗi"
    ],
    "expected": "Toast error 'Ký đơn thất bại' / 'Gửi quầy phát thất bại'; trạng thái đơn không đổi sai lệch; nút không bị kẹt disabled (busy reset trong finally).",
    "evidence": [
     {
      "name": "TC-TEL-015__s01__error",
      "caption": "Toast gửi quầy phát thất bại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-TEL-016",
    "title": "Xuất CSV danh sách đã lọc",
    "category": "happy",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Có dữ liệu sau lọc.",
    "steps": [
     "Lọc 1 tab trạng thái",
     "Bấm 'Xuất CSV'",
     "Mở file tải về"
    ],
    "expected": "Tải file telemedicine_YYYYMMDD-HHmm.csv; header đúng cột; có BOM UTF-8 nên tiếng Việt có dấu không lỗi font; số dòng = số dòng đã lọc; toast 'Đã xuất N dòng'.",
    "evidence": [
     {
      "name": "TC-TEL-016__s01__success",
      "caption": "Toast đã xuất N dòng",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-TEL-017",
    "title": "Xuất CSV khi không có dữ liệu",
    "category": "negative",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Lọc về tập rỗng.",
    "steps": [
     "Lọc/tìm kiếm cho ra 0 dòng",
     "Bấm 'Xuất CSV'"
    ],
    "expected": "Toast warning 'Không có dữ liệu để xuất'; không tải file.",
    "evidence": [
     {
      "name": "TC-TEL-017__s01__toast",
      "caption": "Cảnh báo không có dữ liệu để xuất",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-TEL-018",
    "title": "Trạng thái empty khi không có lịch",
    "category": "ui",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Khoảng ngày không có lịch tele (hoặc lọc rỗng).",
    "steps": [
     "Mở /v2/telemedicine khi không có dữ liệu",
     "Quan sát bảng"
    ],
    "expected": "Hiển thị empty 'Không có lịch khám từ xa nào' + icon search; KPI = 0; không vỡ layout.",
    "evidence": [
     {
      "name": "TC-TEL-018__s01__empty",
      "caption": "Empty state danh sách tele",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-TEL-019",
    "title": "Trạng thái loading khi tải/reload",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Mạng chậm hoặc bấm 'Làm mới'.",
    "steps": [
     "Bấm 'Làm mới'",
     "Quan sát ngay khi đang tải"
    ],
    "expected": "Bảng hiện 'Đang tải…' trong lúc loading; sau khi xong hiện dữ liệu hoặc empty.",
    "evidence": [
     {
      "name": "TC-TEL-019__s01__loading",
      "caption": "Bảng đang tải",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-TEL-020",
    "title": "Lỗi tải danh sách (API fail) hiển thị an toàn",
    "category": "ui",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Mô phỏng getAppointments lỗi (BE down/401).",
    "steps": [
     "Mở /v2/telemedicine khi API lỗi"
    ],
    "expected": "Bảng về rỗng (catch → []), hiện empty thay vì crash; KPI = 0; không màn trắng.",
    "evidence": [
     {
      "name": "TC-TEL-020__s01__error",
      "caption": "API lỗi → bảng rỗng an toàn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-TEL-021",
    "title": "Parity sáng/tối toàn màn",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Có dữ liệu; topbar v2 có toggle dark/light.",
    "steps": [
     "Xem list ở light",
     "Bật dark",
     "Mở drawer và modal kê đơn ở dark"
    ],
    "expected": "Màu nền/chữ/chip/StatusBadge/mono cyan đọc rõ ở cả 2 chế độ; không có vùng chữ trắng trên nền trắng; định dạng tiền/ngày giữ nguyên.",
    "evidence": [
     {
      "name": "TC-TEL-021__s01__list",
      "caption": "List chế độ tối",
      "uiState": "list"
     },
     {
      "name": "TC-TEL-021__s02__modal",
      "caption": "Modal kê đơn chế độ tối",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-TEL-022",
    "title": "Phân quyền — vai trò không đủ quyền bị chặn",
    "category": "permission",
    "priority": "P0",
    "role": "lễ tân/không quyền tele",
    "preconditions": "Đăng nhập tài khoản KHÔNG có quyền Telemedicine (theo matrix #216).",
    "steps": [
     "Đăng nhập role hạn chế",
     "Thử mở /v2/telemedicine",
     "Thử gọi trực tiếp GET /api/telemedicine/appointments không/sai token",
     "Thử nút Xác nhận/Huỷ/Kê đơn"
    ],
    "expected": "Menu 'Khám từ xa' ẩn hoặc route bị chặn nếu không có quyền; API trả 401/403 khi thiếu/ sai JWT (controller [Authorize]); nút mutation không khả dụng với role không đủ quyền.",
    "evidence": [
     {
      "name": "TC-TEL-022__s01__permission",
      "caption": "Role không quyền bị chặn truy cập tele",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#270"
    ]
   },
   {
    "id": "TC-TEL-023",
    "title": "IDOR — xem chi tiết lịch/đơn của BN khác",
    "category": "security",
    "priority": "P0",
    "role": "doctor",
    "preconditions": "Có 2 lịch của 2 BN khác nhau; biết id lịch B.",
    "steps": [
     "Đăng nhập 1 BS",
     "Gọi GET /api/telemedicine/appointments/{idB} và GET /api/telemedicine/patients/{patientIdB}/appointments",
     "Quan sát dữ liệu trả về"
    ],
    "expected": "BE chỉ trả dữ liệu mà người dùng được phép xem (không lộ ngang BN khác nếu ngoài phạm vi); ít nhất phải [Authorize]; nếu BS không được giao BN đó → từ chối/ẩn dữ liệu nhạy cảm.",
    "evidence": [
     {
      "name": "TC-TEL-023__s01__permission",
      "caption": "Truy cập chéo BN khác bị chặn",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#271"
    ]
   },
   {
    "id": "TC-TEL-024",
    "title": "XSS ở field ghi chú đơn / lý do khám",
    "category": "security",
    "priority": "P1",
    "role": "doctor",
    "preconditions": "Mở modal kê đơn hoặc tạo lịch.",
    "steps": [
     "Nhập vào Ghi chú đơn chuỗi '<img src=x onerror=alert(1)>' và '<script>alert(1)</script>'",
     "Lưu/tạo đơn",
     "Mở lại drawer/đơn xem hiển thị"
    ],
    "expected": "Nội dung hiển thị dạng text thuần (React escape), KHÔNG thực thi script; lưu/đọc nguyên văn an toàn.",
    "evidence": [
     {
      "name": "TC-TEL-024__s01__form",
      "caption": "Nhập payload XSS vào ghi chú",
      "uiState": "form"
     },
     {
      "name": "TC-TEL-024__s02__detail",
      "caption": "Ghi chú render an toàn dạng text",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-TEL-025",
    "title": "Ký tự đặc biệt & dấu tiếng Việt trong tìm kiếm/ghi chú",
    "category": "edge",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Có lịch BN tên có dấu (vd 'Nguyễn Thị Hoà').",
    "steps": [
     "Tìm kiếm 'Hoà' và 'hoa' (không dấu)",
     "Nhập ghi chú dài >1000 ký tự + emoji + dấu"
    ],
    "expected": "Tìm kiếm lọc đúng theo chuỗi (lưu ý so khớp có/không dấu); ghi chú dài/emoji không vỡ layout, lưu+hiển thị đầy đủ.",
    "evidence": [
     {
      "name": "TC-TEL-025__s01__filter",
      "caption": "Tìm kiếm tên có dấu tiếng Việt",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#270"
    ]
   },
   {
    "id": "TC-TEL-026",
    "title": "Đồng nhất dữ liệu — phí tele → thanh toán/viện phí",
    "category": "data-consistency",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Lịch tele có phí >0 và đã/ chưa thanh toán.",
    "steps": [
     "Xem phí ở bảng và drawer",
     "Đối chiếu chip 'Đã trả'/'Chưa' theo paymentStatus",
     "Kiểm liên kết sang viện phí nếu hệ thống ghi nhận phí khám tele"
    ],
    "expected": "Phí hiển thị nhất quán giữa bảng/drawer/CSV; chip thanh toán khớp paymentStatus (1=Đã trả); khi gửi đơn sang quầy/thanh toán, số liệu phải đồng bộ; audit log ghi mutation (confirm/cancel/tạo đơn).",
    "evidence": [
     {
      "name": "TC-TEL-026__s01__detail",
      "caption": "Phí + trạng thái thanh toán trong drawer",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#271"
    ]
   },
   {
    "id": "TC-TEL-027",
    "title": "Đặt lịch điều hướng sang quản lý đặt lịch",
    "category": "integration",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Đăng nhập.",
    "steps": [
     "Bấm nút 'Đặt lịch'",
     "Quan sát điều hướng"
    ],
    "expected": "Điều hướng tới /v2/booking-management (luồng tạo lịch tele nằm ở module đặt lịch); không lỗi route.",
    "evidence": [
     {
      "name": "TC-TEL-027__s01__list",
      "caption": "Nút Đặt lịch trên thanh công cụ",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#270"
    ]
   }
  ],
  "gaps": [
   "Màn list v2 hiện CHỈ làm trên TeleAppointments; chưa có UI riêng cho TeleSessions (tạo/join/end phiên, chất lượng video, recording), TeleConsultations (bệnh sử/sinh hiệu/chẩn đoán ICD/kế hoạch điều trị) và TeleFeedbacks/TeleconsultationRequests — các bảng này có DTO/endpoint nhưng chưa có màn → cần task khi UI bổ sung.",
   "Tạo lịch tele (CreateTelemedicineAppointmentDto: validation field bắt buộc patientId/doctorId/departmentId/scheduledDate/time, chặn ngày quá khứ, trùng slot bác sĩ) nằm ở /v2/booking-management — chưa kiểm trong phân hệ này; cần liên kết test đặt lịch + boundary thời gian.",
   "Reschedule (rescheduleAppointment) và kiểm tra slot bác sĩ (getDoctorAvailability) chưa có ca test vì chưa thấy UI trigger trong page v2.",
   "Patient Portal integration (account/notification preferences/devices) và Dashboard/Statistics/exportReport là endpoint thật nhưng page v2 chưa render → thiếu coverage.",
   "Cảnh báo an toàn người bệnh khi kê đơn tele (dị ứng/chống chỉ định/tương tác thuốc) KHÔNG thấy trong modal kê đơn hiện tại — đây là gap patient-safety cần xác minh BE có chặn không và bổ sung test/issue fix.",
   "Trùng route v1 (/telemedicine) và v2 (/v2/telemedicine) cùng path con 'telemedicine' — cần xác nhận không xung đột và v1 đang sunset.",
   "No-show (status 5): chưa rõ luồng tự động chuyển no-show theo thời gian/SignalR — thiếu test state-transition tự động và realtime cập nhật phòng chờ.",
   "Định dạng phí 'Miễn phí' khi fee=0 có thể che giấu lỗi fee âm; cần edge test fee âm / null."
  ]
 },
 {
  "id": "national",
  "code": "NAT",
  "layer": "spec",
  "ic": "🌐",
  "nm": "Tích hợp cổng QG & Liên thông",
  "gh": [
   "#265",
   "#266",
   "#277"
  ],
  "gap": false,
  "module_id": "national",
  "summary": "Phân hệ \"Tích hợp cổng QG & Liên thông\" (id=national, lớp spec) đẩy dữ liệu y tế lên các cổng quốc gia và liên thông giữa cơ sở: Đơn thuốc QG (NationalPrescriptionSubmissions) + Dược QG/DQGVN (NationalPharmacyOutboundReports, DqgvnSubmissions), giấy tờ Đề án 06 (BirthCertificateRecords, DeathCertificateRecords, DrivingLicenseHealthChecks), liên viện (InterHospitalRequests) và công văn (OfficialDocuments). Có 4 màn v2 thực tế: National Gateways (3 tab: Đơn thuốc QG / Dược QG / Cấu hình), Đề án 06 (3 tab: GCS / GBT / KSK lái xe), Liên viện (StatusTabs + CRUD + phản hồi), Công văn (CRUD + đính kèm). Mọi giao dịch có vòng đời trạng thái (Nháp/Đã gửi/Cổng xác nhận/Từ chối/Hủy hoặc Chưa gửi/Đang XL/Cổng XN/Lỗi), gửi-lại (retry), hủy, và lưu payload/response JSON-XML để truy vết.",
  "screens": [
   {
    "name": "Cổng QG — Tab Đơn thuốc QG",
    "desc": "Danh sách giao dịch nộp đơn thuốc lên cổng donthuocquocgia.vn; KPI tổng/cổng xác nhận/đang chờ/lỗi; tìm theo mã GD/BN/BS; lọc theo trạng thái; row click mở Drawer chi tiết (payload + response JSON); action Gửi lại / Hủy.",
    "route_guess": "/v2/national-gateways (tab rx)",
    "elements": [
     "TopTabs(rx/pharm/cfg)",
     "KpiStrip(Tổng/Cổng xác nhận/Đang chờ/Lỗi-Từ chối)",
     "SearchBox",
     "Filter trạng thái",
     "DataTable(Mã GD/Đơn thuốc/BS-CCHN/Loại đơn/Gửi lúc/Trạng thái)",
     "ActBtn Gửi lại(refresh)",
     "ActBtn Hủy(x)",
     "DrawerShell chi tiết: THÔNG TIN GIAO DỊCH/ĐƠN THUỐC/PAYLOAD/PHẢN HỒI"
    ]
   },
   {
    "name": "Cổng QG — Tab Dược QG",
    "desc": "Báo cáo dược xuất ra cổng duocquocgia.com.vn; nút Tạo & gửi báo cáo theo kỳ; KPI; gửi lại báo cáo lỗi; kỳ báo cáo từ-đến.",
    "route_guess": "/v2/national-gateways (tab pharm)",
    "elements": [
     "KpiStrip(Tổng báo cáo/Cổng xác nhận/Đang chờ/Bị từ chối)",
     "Btn Tạo & gửi",
     "DataTable(Mã báo cáo/Loại/Kỳ báo cáo/Số mục/Gửi lúc/Trạng thái)",
     "ActBtn Gửi lại"
    ]
   },
   {
    "name": "Cổng QG — Tab Cấu hình",
    "desc": "Form cấu hình URL cổng, mã/tên CSKB, Mock mode, tự động gửi, số lần thử lại, timeout; nút Lưu cấu hình + Kiểm tra kết nối hiển thị badge OK/Mất kết nối.",
    "route_guess": "/v2/national-gateways (tab cfg)",
    "elements": [
     "input URL Đơn thuốc QG/URL Dược QG/Mã CSKB/Tên CSKB",
     "checkbox Mock/Tự động gửi",
     "input number Số lần thử lại/Timeout",
     "Btn Lưu cấu hình",
     "Btn Kiểm tra kết nối",
     "StatusBadge kết nối"
    ]
   },
   {
    "name": "Đề án 06 — Tab Giấy chứng sinh",
    "desc": "Danh sách GCS với thông tin mẹ/bố/trẻ (cân nặng, tuổi thai, sống/chết lưu); gửi lên cổng Đề án 06 (chỉ khi da06Status<2); Drawer chi tiết MẸ/BỐ/TRẺ/ĐỀ ÁN 06.",
    "route_guess": "/v2/de-an-06 (tab birth)",
    "elements": [
     "TopTabs(birth/death/driver)",
     "KpiStrip(Tổng GCS/Cổng XN/Chưa gửi/Lỗi)",
     "DataTable(Số GCS/Mẹ/Ngày sinh/Giới/Cân nặng/Sống-Chết/Đề án 06)",
     "ActBtn Gửi cổng(external)",
     "DrawerShell + footer Gửi cổng Đề án 06"
    ]
   },
   {
    "name": "Đề án 06 — Tab Giấy báo tử",
    "desc": "Danh sách GBT với BN tử vong, thời điểm/nơi/kiểu tử vong, ICD nguyên nhân chính-phụ, BS chứng nhận, người báo tin; gửi cổng Đề án 06.",
    "route_guess": "/v2/de-an-06 (tab death)",
    "elements": [
     "KpiStrip(Tổng GBT/Cổng XN/Chưa gửi/Lỗi)",
     "DataTable(Số GBT/BN tử vong/Tử vong lúc/Nguyên nhân-ICD/Kiểu/Đề án 06)",
     "ActBtn Gửi cổng",
     "DrawerShell BỆNH NHÂN/TỬ VONG/BS CHỨNG NHẬN/NGƯỜI BÁO TIN/ĐỀ ÁN 06"
    ]
   },
   {
    "name": "Đề án 06 — Tab KSK lái xe",
    "desc": "Giấy khám sức khỏe lái xe: hạng GPLX, thể chất (HA/mạch/BMI), thị lực, mù màu, XN ma tuý/cồn, kết luận đủ/không đủ ĐK; gửi cổng Đề án 06.",
    "route_guess": "/v2/de-an-06 (tab driver)",
    "elements": [
     "KpiStrip(Tổng GCN/Cổng XN/Chưa gửi/Lỗi)",
     "DataTable(Số GCN/BN/Hạng GPLX/Ngày khám/Đủ ĐK/Đề án 06)",
     "ActBtn Gửi cổng",
     "DrawerShell BN/THỂ CHẤT/THỊ LỰC/XN MA TUÝ-CỒN/KẾT LUẬN/ĐỀ ÁN 06"
    ]
   },
   {
    "name": "Liên viện (Inter-Hospital Sharing)",
    "desc": "Quản lý yêu cầu liên viện 2 chiều (vào/ra): tra thuốc, eCPR, chuyển BN, hội chẩn, chia sẻ HS; StatusTabs (Chờ/Đã nhận/Đang xử lý/Hoàn thành/Từ chối); tạo YC mới (CrudModal), phản hồi chấp nhận/từ chối, Drawer chi tiết, in YC.",
    "route_guess": "/v2/inter-hospital",
    "elements": [
     "KpiStrip(Tổng/Chờ xử lý/Khẩn-Cấp cứu/Hoàn thành)",
     "SearchBox",
     "Filter Loại YC",
     "Btn Bỏ lọc/Làm mới/Yêu cầu mới",
     "StatusTabs",
     "DataTable(Mã YC/Loại/Chiều/Chủ đề/BV đối tác/Thời gian/Ưu tiên/Trạng thái)",
     "ActBtn Chi tiết(eye)/Xử lý(check)",
     "CrudModal phản hồi (Quyết định+Nội dung)",
     "CrudModal tạo YC (Loại/BV nhận/Chủ đề/Chi tiết/Ưu tiên/BN)",
     "DrawerShell + footer In YC/Xử lý"
    ]
   },
   {
    "name": "Công văn (Official Documents)",
    "desc": "Quản lý công văn đến/đi (MVP): StatusTabs Mới/Đang XL/Hoàn thành/Lưu; KPI có Quá hạn; CRUD (Modal thêm, Drawer xem+sửa, xóa có confirm); cảnh báo hạn xử lý quá hạn; mở file đính kèm.",
    "route_guess": "/v2/official-documents",
    "elements": [
     "KpiStrip(Tổng CV/Quá hạn/Đang xử lý/CV đến)",
     "input tìm",
     "Select Loại CV(đến/đi)",
     "Btn Làm mới/Thêm công văn",
     "StatusTabs",
     "DataTable(Số CV/Ngày/Nơi gửi-nhận/Trích yếu/Người XL/Hạn XL/Trạng thái)",
     "ActBtn Sửa/Xóa",
     "Modal thêm",
     "Drawer xem+sửa (Descriptions/Form)",
     "link File đính kèm"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-NAT-001",
    "title": "Đơn thuốc QG — gửi lại (retry) giao dịch lỗi/từ chối thành công",
    "category": "happy",
    "priority": "P0",
    "role": "Dược sĩ / Admin",
    "preconditions": "Đăng nhập admin/Admin@123; ở /v2/national-gateways tab Đơn thuốc QG; có ≥1 giao dịch trạng thái Bị từ chối (3) hoặc Đã gửi (1).",
    "steps": [
     "Mở tab 'Đơn thuốc QG'",
     "Lọc trạng thái 'Bị từ chối'",
     "Trên 1 dòng, bấm nút Gửi lại (icon refresh)",
     "Quan sát toast và KPI"
    ],
    "expected": "Hiện toast 'Đã gửi lại lên cổng QG'; danh sách reload; trạng thái dòng chuyển sang Đã gửi/Cổng xác nhận; KPI 'Đang chờ' hoặc 'Cổng xác nhận' tăng tương ứng; không lỗi console.",
    "evidence": [
     {
      "name": "TC-NAT-001__s01__list",
      "caption": "Danh sách đơn thuốc QG, lọc trạng thái Bị từ chối",
      "uiState": "list"
     },
     {
      "name": "TC-NAT-001__s02__confirm",
      "caption": "Hành động Gửi lại trên dòng",
      "uiState": "confirm"
     },
     {
      "name": "TC-NAT-001__s03__success",
      "caption": "Toast gửi lại thành công + KPI cập nhật",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#265",
     "#277"
    ],
    "notes": "Endpoint POST /national-prescription-gateway/{id}/retry"
   },
   {
    "id": "TC-NAT-002",
    "title": "Đơn thuốc QG — nút Gửi lại bị ẩn khi trạng thái 'Cổng xác nhận' hoặc 'Đã hủy'",
    "category": "state",
    "priority": "P0",
    "role": "Dược sĩ / Admin",
    "preconditions": "Có giao dịch trạng thái Cổng xác nhận (2) và giao dịch Đã hủy (4).",
    "steps": [
     "Mở tab Đơn thuốc QG",
     "Tìm dòng trạng thái 'Cổng xác nhận'",
     "Quan sát cột hành động",
     "Tìm dòng trạng thái 'Đã hủy', quan sát cột hành động"
    ],
    "expected": "Dòng 'Cổng xác nhận': KHÔNG có nút Gửi lại (vì status===2), vẫn có nút Hủy. Dòng 'Đã hủy': KHÔNG có nút Gửi lại lẫn nút Hủy (status===4).",
    "evidence": [
     {
      "name": "TC-NAT-002__s01__list",
      "caption": "Dòng Cổng xác nhận ẩn Gửi lại, còn Hủy",
      "uiState": "list"
     },
     {
      "name": "TC-NAT-002__s02__state",
      "caption": "Dòng Đã hủy ẩn cả hai nút",
      "uiState": "state"
     }
    ],
    "refIssues": [
     "#265"
    ],
    "notes": "Logic: retry hiển thị khi status!==2 && status!==4; cancel khi status!==4."
   },
   {
    "id": "TC-NAT-003",
    "title": "Đơn thuốc QG — hủy giao dịch có hộp xác nhận; hủy giữa chừng không đổi dữ liệu",
    "category": "negative",
    "priority": "P1",
    "role": "Dược sĩ / Admin",
    "preconditions": "Có giao dịch chưa hủy (status != 4).",
    "steps": [
     "Bấm nút Hủy (icon x, tone crit) trên 1 dòng",
     "Trong hộp xác nhận 'Hủy giao dịch <mã>?', bấm 'Hủy bỏ' / đóng hộp",
     "Quan sát danh sách",
     "Lặp lại bấm Hủy nhưng lần này xác nhận"
    ],
    "expected": "Bước hủy bỏ xác nhận: không gọi API, trạng thái dòng giữ nguyên. Bước xác nhận: toast 'Đã hủy giao dịch' (tone warn), trạng thái dòng -> Đã hủy, danh sách reload.",
    "evidence": [
     {
      "name": "TC-NAT-003__s01__confirm",
      "caption": "Hộp xác nhận hủy giao dịch",
      "uiState": "confirm"
     },
     {
      "name": "TC-NAT-003__s02__list",
      "caption": "Hủy bỏ confirm — dữ liệu không đổi",
      "uiState": "list"
     },
     {
      "name": "TC-NAT-003__s03__toast",
      "caption": "Xác nhận — toast đã hủy",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#265"
    ]
   },
   {
    "id": "TC-NAT-004",
    "title": "Đơn thuốc QG — Drawer chi tiết hiển thị payload/response JSON đẹp (pretty-print) và mã lỗi",
    "category": "ui",
    "priority": "P1",
    "role": "Dược sĩ / Admin",
    "preconditions": "Có giao dịch có payloadJson; lý tưởng 1 giao dịch lỗi có errorMessage + responseJson.",
    "steps": [
     "Click vào 1 dòng để mở Drawer chi tiết",
     "Kiểm tra section THÔNG TIN GIAO DỊCH (mã GD, mã CSKB, trạng thái, cổng ack, gửi lúc, ack lúc)",
     "Kiểm tra section ĐƠN THUỐC (mã đơn, BN, CCCD, BS, CCHN, loại)",
     "Kiểm tra section PAYLOAD hiển thị JSON format 2-space",
     "Mở 1 giao dịch lỗi, kiểm tra dòng 'Lỗi' màu crit + section PHẢN HỒI TỪ CỔNG"
    ],
    "expected": "PAYLOAD/PHẢN HỒI hiển thị JSON đã JSON.stringify(..,2); nếu JSON hỏng vẫn hiển thị raw không crash; errorMessage hiển thị màu đỏ; các field mono đúng định dạng.",
    "evidence": [
     {
      "name": "TC-NAT-004__s01__drawer",
      "caption": "Drawer chi tiết đầy đủ section",
      "uiState": "drawer"
     },
     {
      "name": "TC-NAT-004__s02__detail",
      "caption": "Payload JSON pretty-printed",
      "uiState": "detail"
     },
     {
      "name": "TC-NAT-004__s03__error",
      "caption": "Giao dịch lỗi: errorMessage đỏ + response",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#277"
    ]
   },
   {
    "id": "TC-NAT-005",
    "title": "Đơn thuốc QG — tìm kiếm theo mã GD/BN/BS và lọc trạng thái lọc đúng tập",
    "category": "happy",
    "priority": "P1",
    "role": "Dược sĩ / Admin",
    "preconditions": "Có ≥10 giao dịch nhiều trạng thái khác nhau.",
    "steps": [
     "Nhập 1 phần mã giao dịch vào ô tìm",
     "Kiểm tra danh sách lọc theo submissionCode/patientName/prescriptionCode (không phân biệt hoa thường)",
     "Xóa tìm, chọn Filter trạng thái = 'Đang chờ'",
     "Kết hợp tìm + lọc trạng thái"
    ],
    "expected": "Filter client-side đúng: search match 3 trường, lọc status đúng số; KPI giữ tổng theo rows gốc (không đổi theo filter), bảng chỉ hiện dòng khớp.",
    "evidence": [
     {
      "name": "TC-NAT-005__s01__filter",
      "caption": "Tìm theo mã GD",
      "uiState": "filter"
     },
     {
      "name": "TC-NAT-005__s02__dropdown",
      "caption": "Lọc theo trạng thái",
      "uiState": "dropdown"
     }
    ],
    "refIssues": [
     "#265"
    ]
   },
   {
    "id": "TC-NAT-006",
    "title": "Dược QG — Tạo & gửi báo cáo theo kỳ 7 ngày thành công",
    "category": "happy",
    "priority": "P0",
    "role": "Dược sĩ kho / Admin",
    "preconditions": "Ở tab 'Dược QG'; cổng cấu hình Mock hoặc kết nối OK.",
    "steps": [
     "Mở tab 'Dược QG'",
     "Bấm nút 'Tạo & gửi'",
     "Quan sát toast và bảng",
     "Mở dòng báo cáo vừa tạo kiểm tra kỳ báo cáo từ-đến"
    ],
    "expected": "Toast 'Đã tạo & gửi báo cáo'; xuất hiện dòng báo cáo mới loại DailySale, kỳ = 7 ngày trước → hôm nay; KPI 'Tổng báo cáo' +1; trạng thái Đã gửi/Cổng xác nhận.",
    "evidence": [
     {
      "name": "TC-NAT-006__s01__list",
      "caption": "Tab Dược QG trước khi tạo",
      "uiState": "list"
     },
     {
      "name": "TC-NAT-006__s02__success",
      "caption": "Toast tạo & gửi báo cáo thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#266"
    ],
    "notes": "POST /national-pharmacy/generate {reportType:'DailySale', periodFrom, periodTo}"
   },
   {
    "id": "TC-NAT-007",
    "title": "Dược QG — báo cáo lỗi cho Gửi lại; báo cáo Cổng xác nhận ẩn nút Gửi lại",
    "category": "state",
    "priority": "P1",
    "role": "Dược sĩ kho / Admin",
    "preconditions": "Có báo cáo trạng thái Bị từ chối (3) và Cổng xác nhận (2).",
    "steps": [
     "Tìm dòng báo cáo Bị từ chối, bấm Gửi lại",
     "Quan sát toast",
     "Tìm dòng Cổng xác nhận, kiểm tra cột hành động"
    ],
    "expected": "Bị từ chối: toast 'Đã gửi lại', reload. Cổng xác nhận (status===2): KHÔNG hiển thị nút Gửi lại.",
    "evidence": [
     {
      "name": "TC-NAT-007__s01__success",
      "caption": "Gửi lại báo cáo lỗi",
      "uiState": "success"
     },
     {
      "name": "TC-NAT-007__s02__state",
      "caption": "Dòng Cổng xác nhận ẩn Gửi lại",
      "uiState": "state"
     }
    ],
    "refIssues": [
     "#266"
    ]
   },
   {
    "id": "TC-NAT-008",
    "title": "Cấu hình cổng QG — lưu cấu hình hợp lệ và Kiểm tra kết nối báo OK",
    "category": "happy",
    "priority": "P0",
    "role": "Admin",
    "preconditions": "Ở tab 'Cấu hình'; cấu hình đã tải xong (không còn 'Đang tải cấu hình…').",
    "steps": [
     "Sửa URL Đơn thuốc QG, Mã CSKB, Tên CSKB",
     "Bật checkbox Mock",
     "Bấm 'Lưu cấu hình'",
     "Bấm 'Kiểm tra kết nối'"
    ],
    "expected": "Toast 'Đã lưu cấu hình'; Kiểm tra kết nối hiển thị StatusBadge tone ok 'Kết nối OK' (mock) + toast 'Kết nối OK'.",
    "evidence": [
     {
      "name": "TC-NAT-008__s01__form",
      "caption": "Form cấu hình cổng QG",
      "uiState": "form"
     },
     {
      "name": "TC-NAT-008__s02__success",
      "caption": "Lưu cấu hình thành công",
      "uiState": "success"
     },
     {
      "name": "TC-NAT-008__s03__success",
      "caption": "Badge Kết nối OK",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#277"
    ]
   },
   {
    "id": "TC-NAT-009",
    "title": "Cấu hình cổng QG — số lần thử lại/timeout nhận giá trị biên (0, âm, rất lớn)",
    "category": "edge",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Ở tab Cấu hình.",
    "steps": [
     "Nhập Số lần thử lại = 0, Timeout = 0; Lưu",
     "Nhập Số lần thử lại = -1; quan sát",
     "Nhập Timeout = 999999; Lưu",
     "Để trống URL Đơn thuốc QG rồi Lưu + Kiểm tra kết nối"
    ],
    "expected": "Hệ thống nên chặn/cảnh báo giá trị âm và URL rỗng (validation), không lưu cấu hình vô nghĩa; nếu BE không validate -> ghi nhận gap. Giá trị 0/rất lớn lưu được nhưng kiểm tra kết nối phản ánh đúng (timeout 0 -> lỗi).",
    "evidence": [
     {
      "name": "TC-NAT-009__s01__validation",
      "caption": "Nhập giá trị âm/biên cho retry/timeout",
      "uiState": "validation"
     },
     {
      "name": "TC-NAT-009__s02__error",
      "caption": "URL rỗng — kiểm tra kết nối báo lỗi",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#277"
    ],
    "notes": "Form hiện là input thuần, có thể KHÔNG validate client — cần xác nhận BE validate."
   },
   {
    "id": "TC-NAT-010",
    "title": "Cấu hình cổng QG — không lưu được khi mất mạng/BE lỗi hiển thị toast lỗi",
    "category": "negative",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Ở tab Cấu hình; chuẩn bị chặn endpoint POST /national-prescription-gateway/config (offline/500).",
    "steps": [
     "Sửa 1 trường bất kỳ",
     "Bấm Lưu cấu hình khi BE trả lỗi/timeout",
     "Bấm Kiểm tra kết nối khi BE down"
    ],
    "expected": "Toast 'Lưu thất bại' (te); Kiểm tra kết nối -> badge crit 'Mất kết nối' + toast 'Mất kết nối'; không crash trang.",
    "evidence": [
     {
      "name": "TC-NAT-010__s01__error",
      "caption": "Toast lưu cấu hình thất bại",
      "uiState": "error"
     },
     {
      "name": "TC-NAT-010__s02__error",
      "caption": "Badge Mất kết nối",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#277"
    ]
   },
   {
    "id": "TC-NAT-011",
    "title": "Đề án 06 GCS — gửi giấy chứng sinh lên cổng Đề án 06 thành công (chỉ khi chưa xác nhận)",
    "category": "happy",
    "priority": "P0",
    "role": "Hộ sinh / Cán bộ liên thông",
    "preconditions": "/v2/de-an-06 tab Giấy chứng sinh; có GCS da06Status<2 (Chưa gửi/Đang xử lý).",
    "steps": [
     "Mở tab GCS",
     "Click dòng GCS Chưa gửi để mở Drawer",
     "Kiểm tra section MẸ/BỐ/TRẺ",
     "Bấm footer 'Gửi cổng Đề án 06'"
    ],
    "expected": "Toast 'Đã gửi lên cổng Đề án 06 — <số GCS>'; Drawer đóng; reload; trạng thái Đề án 06 dòng chuyển Đang xử lý/Cổng xác nhận; KPI 'Chưa gửi' giảm.",
    "evidence": [
     {
      "name": "TC-NAT-011__s01__drawer",
      "caption": "Drawer chi tiết GCS trước khi gửi",
      "uiState": "drawer"
     },
     {
      "name": "TC-NAT-011__s02__success",
      "caption": "Toast gửi cổng Đề án 06 thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#266"
    ],
    "notes": "POST /de-an-06/birth-certificates/{id}/submit"
   },
   {
    "id": "TC-NAT-012",
    "title": "Đề án 06 GCS — nút/footer 'Gửi cổng' ẩn khi da06Status=Cổng xác nhận (2)",
    "category": "state",
    "priority": "P0",
    "role": "Hộ sinh / Cán bộ liên thông",
    "preconditions": "Có GCS da06Status=2 (Cổng xác nhận).",
    "steps": [
     "Mở tab GCS, tìm dòng 'Cổng xác nhận'",
     "Kiểm tra cột hành động (không có nút external)",
     "Click mở Drawer, kiểm tra footer chỉ còn nút Đóng"
    ],
    "expected": "Cột hành động không hiển thị ActBtn Gửi cổng (vì da06Status>=2); Drawer footer chỉ có 'Đóng' (không có nút Gửi cổng Đề án 06).",
    "evidence": [
     {
      "name": "TC-NAT-012__s01__state",
      "caption": "Dòng Cổng xác nhận ẩn nút gửi",
      "uiState": "state"
     },
     {
      "name": "TC-NAT-012__s02__drawer",
      "caption": "Drawer footer chỉ có Đóng",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#266"
    ]
   },
   {
    "id": "TC-NAT-013",
    "title": "Đề án 06 GCS — gửi cổng thất bại (BE/cổng lỗi) hiển thị toast lỗi, trạng thái không nhảy bừa",
    "category": "negative",
    "priority": "P1",
    "role": "Cán bộ liên thông",
    "preconditions": "Chặn endpoint submit để trả lỗi.",
    "steps": [
     "Mở GCS Chưa gửi",
     "Bấm 'Gửi cổng Đề án 06' khi BE trả lỗi/timeout",
     "Quan sát toast và trạng thái dòng"
    ],
    "expected": "Toast 'Gửi cổng thất bại' (te); Drawer KHÔNG đóng hoặc đóng nhưng trạng thái KHÔNG chuyển Cổng xác nhận (giữ Chưa gửi / chuyển Lỗi nếu BE set); không crash.",
    "evidence": [
     {
      "name": "TC-NAT-013__s01__error",
      "caption": "Toast gửi cổng thất bại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#266"
    ]
   },
   {
    "id": "TC-NAT-014",
    "title": "Đề án 06 GCS — hiển thị 'Chết lưu' (isLiveBirth=false) màu cảnh báo và cân nặng/tuổi thai biên",
    "category": "edge",
    "priority": "P2",
    "role": "Hộ sinh",
    "preconditions": "Có GCS isLiveBirth=false; GCS có birthWeight rất nhỏ (vd 0.5kg) và tuổi thai <28 tuần.",
    "steps": [
     "Mở tab GCS",
     "Tìm dòng có cột Sống/Chết = 'Chết lưu'",
     "Kiểm tra màu chữ crit",
     "Mở Drawer kiểm tra cân nặng/tuổi thai bất thường hiển thị đúng đơn vị"
    ],
    "expected": "'Chết lưu' hiển thị màu var(--s-crit); cân nặng nhỏ/tuổi thai non hiển thị đúng (kg, tuần); không format sai.",
    "evidence": [
     {
      "name": "TC-NAT-014__s01__list",
      "caption": "Dòng GCS Chết lưu màu cảnh báo",
      "uiState": "list"
     },
     {
      "name": "TC-NAT-014__s02__detail",
      "caption": "Cân nặng/tuổi thai biên trong Drawer",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#266"
    ]
   },
   {
    "id": "TC-NAT-015",
    "title": "Đề án 06 GBT — gửi giấy báo tử lên cổng; hiển thị ICD nguyên nhân chính/phụ đầy đủ",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ / Cán bộ liên thông",
    "preconditions": "Tab Giấy báo tử; có GBT da06Status<2 với primaryCauseIcd + người báo tin.",
    "steps": [
     "Mở tab Giấy báo tử",
     "Click dòng GBT mở Drawer",
     "Kiểm tra section TỬ VONG (lúc/nơi/kiểu/ICD chính/nguyên nhân) và NGƯỜI BÁO TIN",
     "Bấm 'Gửi cổng Đề án 06'"
    ],
    "expected": "Drawer hiển thị đủ ICD chính (code), nguyên nhân chính/phụ, BS chứng nhận + CCHN, người báo tin + quan hệ; gửi cổng -> toast thành công, reload.",
    "evidence": [
     {
      "name": "TC-NAT-015__s01__drawer",
      "caption": "Drawer chi tiết GBT đầy đủ section",
      "uiState": "drawer"
     },
     {
      "name": "TC-NAT-015__s02__success",
      "caption": "Gửi cổng GBT thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#266"
    ]
   },
   {
    "id": "TC-NAT-016",
    "title": "Đề án 06 KSK lái xe — XN ma tuý dương tính / không đủ ĐK hiển thị cảnh báo đúng",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ KSK",
    "preconditions": "Tab KSK lái xe; có bản ghi drugTestPositive=true, eligibleToDrive=false.",
    "steps": [
     "Mở tab KSK lái xe",
     "Tìm dòng eligibleToDrive=false -> cột 'Đủ ĐK' = badge crit 'Không'",
     "Mở Drawer",
     "Kiểm tra section XN MA TUÝ/CỒN: Ma tuý 'Dương tính' màu crit, mức cồn mg%",
     "Kiểm tra section KẾT LUẬN badge crit 'Không đủ ĐK'"
    ],
    "expected": "Tính nhất quán: drugTestPositive -> 'Dương tính' đỏ; eligibleToDrive=false -> badge 'Không'/'Không đủ ĐK' crit ở cả cột bảng và Drawer; mức cồn hiển thị mg% (mặc định 0 nếu null).",
    "evidence": [
     {
      "name": "TC-NAT-016__s01__list",
      "caption": "Cột Đủ ĐK = Không (crit)",
      "uiState": "list"
     },
     {
      "name": "TC-NAT-016__s02__drawer",
      "caption": "XN ma tuý dương tính + kết luận không đủ ĐK",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#266"
    ],
    "notes": "Patient-safety: kết luận lái xe phải nhất quán giữa list và detail."
   },
   {
    "id": "TC-NAT-017",
    "title": "Đề án 06 KSK lái xe — gửi cổng + huyết áp/thị lực/mù màu hiển thị đúng định dạng",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ KSK",
    "preconditions": "Có bản ghi KSK lái xe da06Status<2 có HA, thị lực, mù màu.",
    "steps": [
     "Mở Drawer 1 bản ghi",
     "Kiểm tra THỂ CHẤT: HA dạng systolic/diastolic, mạch l/p, cao/cân",
     "Kiểm tra THỊ LỰC: phải/trái không kính + mù màu (Bình thường / chi tiết)",
     "Bấm Gửi cổng Đề án 06"
    ],
    "expected": "HA hiển thị '120/80' mono; mù màu colorBlindNormal=true -> 'Bình thường'; gửi cổng -> toast thành công.",
    "evidence": [
     {
      "name": "TC-NAT-017__s01__detail",
      "caption": "THỂ CHẤT/THỊ LỰC định dạng đúng",
      "uiState": "detail"
     },
     {
      "name": "TC-NAT-017__s02__success",
      "caption": "Gửi cổng KSK lái xe thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#266"
    ]
   },
   {
    "id": "TC-NAT-018",
    "title": "Đề án 06 — empty state / loading khi không có dữ liệu hoặc API lỗi",
    "category": "ui",
    "priority": "P1",
    "role": "Cán bộ liên thông",
    "preconditions": "Tài khoản/CSKB chưa có GCS/GBT/KSK nào; hoặc chặn endpoint search để lỗi.",
    "steps": [
     "Mở từng tab GCS/GBT/KSK khi rỗng",
     "Quan sát bảng và KPI",
     "Chặn API search trả lỗi, reload tab",
     "Quan sát toast 'Không tải được'"
    ],
    "expected": "Bảng hiển thị empty rõ ràng; KPI = 0; khi API lỗi -> toast 'Không tải được' (te), bảng rỗng, không crash; loading state hiển thị trong lúc fetch.",
    "evidence": [
     {
      "name": "TC-NAT-018__s01__empty",
      "caption": "Tab Đề án 06 rỗng",
      "uiState": "empty"
     },
     {
      "name": "TC-NAT-018__s02__error",
      "caption": "API lỗi — toast không tải được",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#266"
    ]
   },
   {
    "id": "TC-NAT-019",
    "title": "Liên viện — tạo yêu cầu liên viện mới (đi ra) thành công",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ / Điều phối",
    "preconditions": "/v2/inter-hospital; đăng nhập.",
    "steps": [
     "Bấm 'Yêu cầu mới'",
     "Chọn Loại yêu cầu = Hội chẩn, nhập BV nhận, Chủ đề, Chi tiết, Ưu tiên = Khẩn",
     "Nhập tên/mã BN (tùy chọn)",
     "Bấm Lưu"
    ],
    "expected": "Toast 'Đã gửi yêu cầu liên viện'; modal đóng; danh sách reload có dòng mới direction 'outgoing' (→ Ra), trạng thái Chờ; KPI Tổng/Chờ xử lý tăng.",
    "evidence": [
     {
      "name": "TC-NAT-019__s01__modal",
      "caption": "Modal tạo yêu cầu liên viện",
      "uiState": "modal"
     },
     {
      "name": "TC-NAT-019__s02__form",
      "caption": "Form điền đủ thông tin YC",
      "uiState": "form"
     },
     {
      "name": "TC-NAT-019__s03__success",
      "caption": "Toast gửi YC thành công + dòng mới",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#265"
    ]
   },
   {
    "id": "TC-NAT-020",
    "title": "Liên viện — validation các field bắt buộc khi tạo YC (Loại/BV nhận/Chủ đề/Chi tiết/Ưu tiên)",
    "category": "validation",
    "priority": "P1",
    "role": "Bác sĩ / Điều phối",
    "preconditions": "Modal tạo YC đang mở.",
    "steps": [
     "Để trống BV nhận, Chủ đề, Chi tiết",
     "Bấm Lưu",
     "Quan sát thông báo lỗi từng field bắt buộc",
     "Điền dần và Lưu lại"
    ],
    "expected": "CrudModal chặn submit; hiển thị lỗi 'bắt buộc' ở requestType/respondingHospital/subject/details/urgency; chỉ submit khi đủ field required.",
    "evidence": [
     {
      "name": "TC-NAT-020__s01__validation",
      "caption": "Lỗi bắt buộc các field tạo YC",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#265"
    ]
   },
   {
    "id": "TC-NAT-021",
    "title": "Liên viện — phản hồi (chấp nhận) YC đang Chờ/Đã nhận chuyển Hoàn thành",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ BV nhận",
    "preconditions": "Có YC status Chờ(0) hoặc Đã nhận(1).",
    "steps": [
     "Trên dòng YC Chờ, bấm nút Xử lý (check)",
     "Trong modal phản hồi, chọn Quyết định = Chấp nhận, nhập Nội dung phản hồi",
     "Bấm Lưu"
    ],
    "expected": "Toast 'Đã chấp nhận yêu cầu'; trạng thái dòng -> Hoàn thành (status 3); StatusTabs count cập nhật; respondedBy/respondedAt ghi nhận.",
    "evidence": [
     {
      "name": "TC-NAT-021__s01__modal",
      "caption": "Modal phản hồi YC",
      "uiState": "modal"
     },
     {
      "name": "TC-NAT-021__s02__success",
      "caption": "Chấp nhận -> Hoàn thành",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#265"
    ],
    "notes": "approve -> statusCode 3 (completed)."
   },
   {
    "id": "TC-NAT-022",
    "title": "Liên viện — phản hồi (từ chối) bắt buộc nhập nội dung; nút Xử lý ẩn khi đã Hoàn thành/Từ chối",
    "category": "state",
    "priority": "P1",
    "role": "Bác sĩ BV nhận",
    "preconditions": "Có YC Chờ/Đã nhận và YC đã Hoàn thành(3)/Từ chối(4).",
    "steps": [
     "Mở modal phản hồi 1 YC, chọn Từ chối nhưng bỏ trống Nội dung -> Lưu",
     "Nhập nội dung rồi Lưu",
     "Kiểm tra dòng đã Hoàn thành/Từ chối không còn nút Xử lý"
    ],
    "expected": "Bỏ trống nội dung -> chặn (required). Từ chối hợp lệ -> toast 'Đã từ chối yêu cầu', status -> Từ chối(4). Dòng status 3/4 KHÔNG hiển thị ActBtn Xử lý (chỉ status 0/1 mới có).",
    "evidence": [
     {
      "name": "TC-NAT-022__s01__validation",
      "caption": "Từ chối thiếu nội dung bị chặn",
      "uiState": "validation"
     },
     {
      "name": "TC-NAT-022__s02__state",
      "caption": "YC Hoàn thành/Từ chối ẩn nút Xử lý",
      "uiState": "state"
     }
    ],
    "refIssues": [
     "#265"
    ]
   },
   {
    "id": "TC-NAT-023",
    "title": "Liên viện — StatusTabs + filter loại + search lọc đúng; KPI Khẩn/Cấp cứu chính xác",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Điều phối",
    "preconditions": "Có YC đủ trạng thái + nhiều loại + nhiều mức ưu tiên.",
    "steps": [
     "Chuyển qua từng StatusTab (Chờ/Đã nhận/Đang xử lý/Hoàn thành/Từ chối) đối chiếu count",
     "Chọn Filter Loại = Chuyển BN",
     "Search theo chủ đề/BV/BN",
     "Đối chiếu KPI 'Khẩn / Cấp cứu' = số YC urgency != normal"
    ],
    "expected": "Count trên tab khớp dữ liệu; filter loại + search kết hợp đúng; KPI Khẩn/Cấp cứu đếm đúng (urgent+emergency); Hoàn thành % = completed/total.",
    "evidence": [
     {
      "name": "TC-NAT-023__s01__tab",
      "caption": "StatusTabs với count",
      "uiState": "tab"
     },
     {
      "name": "TC-NAT-023__s02__filter",
      "caption": "Filter loại + search",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#265"
    ]
   },
   {
    "id": "TC-NAT-024",
    "title": "Liên viện — phân trang (Pager) hoạt động đúng khi >18 yêu cầu",
    "category": "edge",
    "priority": "P2",
    "role": "Điều phối",
    "preconditions": "Có >18 YC (PER=18).",
    "steps": [
     "Quan sát trang 1 hiển thị 18 dòng",
     "Chuyển sang trang 2",
     "Áp filter làm giảm số dòng < 18 và kiểm tra Pager reset/totalPages"
    ],
    "expected": "Trang 1 = 18 dòng; trang 2 = phần còn lại; khi filter/search thay đổi -> page về 0; totalPages tính đúng ceil(filtered/18).",
    "evidence": [
     {
      "name": "TC-NAT-024__s01__list",
      "caption": "Pager trang 2 danh sách liên viện",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#265"
    ]
   },
   {
    "id": "TC-NAT-025",
    "title": "Liên viện — In yêu cầu (window.print) và Drawer chi tiết 2 chiều incoming/outgoing",
    "category": "ui",
    "priority": "P2",
    "role": "Điều phối",
    "preconditions": "Có YC incoming và outgoing.",
    "steps": [
     "Mở Drawer 1 YC incoming -> kiểm tra Chiều '← Đi vào', BV đối tác = requestingHospital",
     "Mở Drawer 1 YC outgoing -> Chiều '→ Đi ra'",
     "Bấm 'In YC' -> hộp in trình duyệt mở"
    ],
    "expected": "Drawer hiển thị đúng chiều và BV đối tác theo direction; nội dung whitespace pre-wrap; nút In YC kích hoạt print dialog không lỗi.",
    "evidence": [
     {
      "name": "TC-NAT-025__s01__drawer",
      "caption": "Drawer YC incoming",
      "uiState": "drawer"
     },
     {
      "name": "TC-NAT-025__s02__confirm",
      "caption": "Hộp in trình duyệt",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#265"
    ]
   },
   {
    "id": "TC-NAT-026",
    "title": "Liên viện — chống XSS ở field Chi tiết/Chủ đề/Nội dung phản hồi",
    "category": "security",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Modal tạo YC.",
    "steps": [
     "Nhập Chủ đề/Chi tiết chứa payload <img src=x onerror=alert(1)> và <script>alert(1)</script>",
     "Lưu YC",
     "Mở Drawer chi tiết hiển thị các field này"
    ],
    "expected": "Payload hiển thị dưới dạng text thuần (escaped), KHÔNG thực thi script/alert; không phá vỡ layout Drawer.",
    "evidence": [
     {
      "name": "TC-NAT-026__s01__detail",
      "caption": "Payload XSS hiển thị dạng text an toàn",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#265"
    ]
   },
   {
    "id": "TC-NAT-027",
    "title": "Liên viện — ký tự đặc biệt/tiếng Việt có dấu/chuỗi rất dài ở Chủ đề & BN",
    "category": "edge",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "Modal tạo YC.",
    "steps": [
     "Nhập Chủ đề tiếng Việt có dấu + emoji + chuỗi >500 ký tự",
     "Nhập tên BN có dấu (Nguyễn Thị Hoà Ánh)",
     "Lưu và xem trong bảng + Drawer"
    ],
    "expected": "Lưu và hiển thị đúng tiếng Việt có dấu, không lỗi encoding; chuỗi dài không vỡ bảng (truncate/wrap hợp lý); tìm kiếm vẫn match.",
    "evidence": [
     {
      "name": "TC-NAT-027__s01__list",
      "caption": "Chủ đề tiếng Việt dài hiển thị đúng",
      "uiState": "list"
     },
     {
      "name": "TC-NAT-027__s02__detail",
      "caption": "Drawer hiển thị tiếng Việt + chuỗi dài",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#265"
    ]
   },
   {
    "id": "TC-NAT-028",
    "title": "Công văn — thêm công văn đến mới hợp lệ thành công",
    "category": "happy",
    "priority": "P0",
    "role": "Văn thư / Admin",
    "preconditions": "/v2/official-documents.",
    "steps": [
     "Bấm 'Thêm công văn'",
     "Nhập Số CV (123/CV-SYT), Loại = Công văn đến, Ngày, Nơi gửi, Trích yếu, Người XL, Hạn XL",
     "Bấm Lưu"
    ],
    "expected": "Toast 'Đã lưu'; modal đóng; danh sách reload có CV mới; KPI Tổng CV/CV đến tăng; trạng thái mặc định 'Mới'.",
    "evidence": [
     {
      "name": "TC-NAT-028__s01__modal",
      "caption": "Modal thêm công văn",
      "uiState": "modal"
     },
     {
      "name": "TC-NAT-028__s02__success",
      "caption": "Thêm công văn thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#266"
    ],
    "notes": "POST /admin-modules/official-documents"
   },
   {
    "id": "TC-NAT-029",
    "title": "Công văn — validation field bắt buộc (Số CV/Loại/Ngày/Trích yếu)",
    "category": "validation",
    "priority": "P1",
    "role": "Văn thư",
    "preconditions": "Modal thêm công văn mở.",
    "steps": [
     "Để trống Số CV, Ngày, Trích yếu",
     "Bấm Lưu",
     "Quan sát thông báo lỗi",
     "Điền đủ rồi Lưu"
    ],
    "expected": "Form chặn submit; hiển thị lỗi required ở documentNumber/documentType/documentDate/summary; chỉ lưu khi đủ.",
    "evidence": [
     {
      "name": "TC-NAT-029__s01__validation",
      "caption": "Lỗi bắt buộc khi thêm công văn",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#266"
    ]
   },
   {
    "id": "TC-NAT-030",
    "title": "Công văn — sửa công văn qua Drawer (toggle xem/sửa) và cập nhật trạng thái",
    "category": "happy",
    "priority": "P1",
    "role": "Văn thư",
    "preconditions": "Có ≥1 công văn.",
    "steps": [
     "Click dòng -> Drawer xem (Descriptions)",
     "Bấm 'Sửa' -> form sửa",
     "Đổi Người xử lý, Trạng thái = Đang xử lý, Hạn XL",
     "Bấm Lưu"
    ],
    "expected": "Toast 'Đã cập nhật'; Drawer đóng; dòng cập nhật trạng thái + StatusTab count đổi; backend xác định update qua id (POST cùng endpoint kèm id).",
    "evidence": [
     {
      "name": "TC-NAT-030__s01__drawer",
      "caption": "Drawer xem công văn",
      "uiState": "drawer"
     },
     {
      "name": "TC-NAT-030__s02__form",
      "caption": "Drawer chế độ sửa",
      "uiState": "form"
     },
     {
      "name": "TC-NAT-030__s03__success",
      "caption": "Cập nhật thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#266"
    ]
   },
   {
    "id": "TC-NAT-031",
    "title": "Công văn — xóa công văn có hộp xác nhận crit; hủy giữa chừng không xóa",
    "category": "negative",
    "priority": "P1",
    "role": "Văn thư / Admin",
    "preconditions": "Có ≥1 công văn.",
    "steps": [
     "Bấm nút Xóa (trash, crit) trên 1 dòng",
     "Trong hộp 'Xóa công văn <số>?' bấm hủy/đóng",
     "Kiểm tra dòng vẫn còn",
     "Bấm Xóa lại và xác nhận 'Xóa'"
    ],
    "expected": "Hủy confirm -> không gọi API, dòng còn nguyên. Xác nhận -> toast 'Đã xóa', dòng biến mất, KPI Tổng CV giảm.",
    "evidence": [
     {
      "name": "TC-NAT-031__s01__confirm",
      "caption": "Hộp xác nhận xóa công văn",
      "uiState": "confirm"
     },
     {
      "name": "TC-NAT-031__s02__success",
      "caption": "Xóa công văn thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#266"
    ]
   },
   {
    "id": "TC-NAT-032",
    "title": "Công văn — cảnh báo quá hạn (isOverdue) hiển thị đỏ ở bảng và Drawer; KPI Quá hạn đúng",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Văn thư",
    "preconditions": "Có công văn deadline trong quá khứ chưa Hoàn thành (isOverdue=true) và 1 công văn không deadline.",
    "steps": [
     "Quan sát cột 'Hạn XL' dòng quá hạn -> đỏ + dấu '!'",
     "Mở Drawer dòng đó -> '— Quá hạn!'",
     "Đối chiếu KPI 'Quá hạn' = số dòng isOverdue",
     "Dòng không deadline -> hiển thị '—'"
    ],
    "expected": "Hạn quá hạn hiển thị màu var(--a-rd-text) đậm + '!'; Drawer ghi 'Quá hạn!'; KPI Quá hạn khớp; dòng không deadline hiển thị '—' không vỡ.",
    "evidence": [
     {
      "name": "TC-NAT-032__s01__list",
      "caption": "Hạn XL quá hạn màu đỏ + KPI",
      "uiState": "list"
     },
     {
      "name": "TC-NAT-032__s02__detail",
      "caption": "Drawer ghi Quá hạn",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#266"
    ]
   },
   {
    "id": "TC-NAT-033",
    "title": "Công văn — mở file đính kèm: path tuyệt đối vs tương đối; chống path-traversal",
    "category": "security",
    "priority": "P0",
    "role": "Văn thư",
    "preconditions": "Có công văn attachmentPath URL tuyệt đối (https://...) và path tương đối; thử nhập path độc hại.",
    "steps": [
     "Mở công văn có attachmentPath https:// -> bấm 'File đính kèm' (mở tab mới noopener)",
     "Mở công văn path tương đối -> mở qua {API}/files/<path>",
     "Sửa attachmentPath thành '../../etc/passwd' hoặc '..%2F..%2F' rồi mở"
    ],
    "expected": "URL tuyệt đối mở đúng tab mới với rel noopener; path tương đối ghép base/files/ đúng; path-traversal phải bị BE chặn (404/403, không lộ file ngoài thư mục cho phép) — đối chiếu fix #181 path-traversal.",
    "evidence": [
     {
      "name": "TC-NAT-033__s01__detail",
      "caption": "Link file đính kèm trong Drawer",
      "uiState": "detail"
     },
     {
      "name": "TC-NAT-033__s02__error",
      "caption": "Path-traversal bị chặn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#266"
    ],
    "notes": "Tham chiếu commit 35048b9 (#181 path-traversal guard)."
   },
   {
    "id": "TC-NAT-034",
    "title": "Công văn — ngày công văn/hạn xử lý ở biên (tương lai xa, quá khứ xa) định dạng vi-VN",
    "category": "edge",
    "priority": "P2",
    "role": "Văn thư",
    "preconditions": "Modal thêm công văn.",
    "steps": [
     "Nhập Ngày = 01/01/1900, Hạn XL = 31/12/2099; Lưu",
     "Nhập Hạn XL trước Ngày công văn; Lưu",
     "Quan sát hiển thị định dạng DD/MM/YYYY và isOverdue"
    ],
    "expected": "Ngày hiển thị đúng định dạng vi-VN; ngày quá khứ xa -> tính isOverdue đúng; nên cảnh báo khi Hạn XL < Ngày CV (nếu không có -> ghi gap validation).",
    "evidence": [
     {
      "name": "TC-NAT-034__s01__form",
      "caption": "Nhập ngày biên",
      "uiState": "form"
     },
     {
      "name": "TC-NAT-034__s02__list",
      "caption": "Hiển thị định dạng ngày vi-VN",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#266"
    ]
   },
   {
    "id": "TC-NAT-035",
    "title": "Công văn — empty/loading state và lỗi tải danh sách",
    "category": "ui",
    "priority": "P2",
    "role": "Văn thư",
    "preconditions": "Chưa có công văn nào; hoặc chặn GET /admin-modules/official-documents trả lỗi.",
    "steps": [
     "Mở trang khi rỗng -> bảng 'Chưa có công văn nào'",
     "Trong lúc tải -> 'Đang tải…'",
     "Chặn API lỗi, Làm mới -> toast 'Tải danh sách thất bại'"
    ],
    "expected": "Empty/loading hiển thị đúng; API lỗi -> toast warn 'Tải danh sách thất bại', không crash; KPI = 0.",
    "evidence": [
     {
      "name": "TC-NAT-035__s01__empty",
      "caption": "Công văn rỗng",
      "uiState": "empty"
     },
     {
      "name": "TC-NAT-035__s02__error",
      "caption": "Lỗi tải danh sách công văn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#266"
    ]
   },
   {
    "id": "TC-NAT-036",
    "title": "Phân quyền — vai trò không đủ quyền bị chặn menu/route/API phân hệ Liên thông QG",
    "category": "permission",
    "priority": "P0",
    "role": "Lễ tân / vai trò hạn chế",
    "preconditions": "Có tài khoản vai trò KHÔNG có quyền national/liên thông (vd lễ tân); đối chiếu matrix #216.",
    "steps": [
     "Đăng nhập bằng vai trò hạn chế",
     "Kiểm tra menu Cổng QG/Đề án 06/Liên viện/Công văn có ẩn không",
     "Gõ trực tiếp URL /v2/national-gateways, /v2/de-an-06, /v2/inter-hospital, /v2/official-documents",
     "Gọi trực tiếp API (submit/retry/cancel/config) bằng token vai trò này"
    ],
    "expected": "Menu ẩn với vai trò không quyền; truy cập route trực tiếp bị chặn/redirect; API trả 401/403 (không 200). Nút nhạy cảm (Lưu cấu hình, Gửi cổng) ẩn/disabled.",
    "evidence": [
     {
      "name": "TC-NAT-036__s01__permission",
      "caption": "Menu phân hệ ẩn với vai trò hạn chế",
      "uiState": "permission"
     },
     {
      "name": "TC-NAT-036__s02__permission",
      "caption": "Truy cập route trực tiếp bị chặn",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#265"
    ]
   },
   {
    "id": "TC-NAT-037",
    "title": "Phân quyền — chỉ Admin được sửa Cấu hình cổng QG (mã CSKB/URL/token)",
    "category": "permission",
    "priority": "P1",
    "role": "Bác sĩ/Dược (non-admin)",
    "preconditions": "Tài khoản non-admin có thể xem danh sách nhưng không có quyền cấu hình.",
    "steps": [
     "Đăng nhập non-admin, mở tab Cấu hình",
     "Thử sửa và Lưu cấu hình",
     "Gọi trực tiếp POST /national-prescription-gateway/config"
    ],
    "expected": "Tab cấu hình ẩn/readonly hoặc Lưu bị chặn; API config trả 403 cho non-admin (cấu hình cổng QG là nhạy cảm).",
    "evidence": [
     {
      "name": "TC-NAT-037__s01__permission",
      "caption": "Non-admin không lưu được cấu hình",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#277"
    ]
   },
   {
    "id": "TC-NAT-038",
    "title": "Bảo mật — IDOR: xem/sửa giao dịch QG hoặc GCS/GBT của hồ sơ bệnh nhân khác qua id trực tiếp",
    "category": "security",
    "priority": "P0",
    "role": "Người dùng A (khoa/cơ sở khác)",
    "preconditions": "Biết id 1 NationalPrescriptionSubmission / BirthCertificate / InterHospitalRequest thuộc đơn vị/BN khác.",
    "steps": [
     "Đăng nhập user A",
     "Gọi GET /national-prescription-gateway/{id_của_đơn_vị_khác}",
     "Gọi GET /de-an-06/birth-certificates/{id_BN_khác}",
     "Thử POST submit/retry/cancel trên id không thuộc phạm vi"
    ],
    "expected": "BE kiểm tra phạm vi sở hữu/đơn vị: trả 403/404 cho id ngoài phạm vi; không lộ payload chứa CCCD/ICD/thông tin BN khác; mutation bị chặn.",
    "evidence": [
     {
      "name": "TC-NAT-038__s01__permission",
      "caption": "Truy cập id ngoài phạm vi bị chặn",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#265"
    ],
    "notes": "Drawer payload chứa CCCD BN/BS, ICD tử vong — dữ liệu nhạy cảm."
   },
   {
    "id": "TC-NAT-039",
    "title": "Tính nhất quán liên thông — Đề án 06 da06SubmittedAt/AcknowledgedAt + audit log mỗi mutation",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Admin / Kiểm toán",
    "preconditions": "Có thể truy vấn audit log / kiểm tra DB sau thao tác.",
    "steps": [
     "Gửi 1 GCS lên cổng Đề án 06",
     "Kiểm tra da06Status -> Đang xử lý/Cổng xác nhận, da06SubmittedAt được set",
     "Retry 1 đơn thuốc QG, kiểm tra retryCount tăng + submittedAt cập nhật",
     "Kiểm tra audit log ghi nhận hành động (submit/retry/cancel/config) với user thật"
    ],
    "expected": "Mỗi mutation (submit/retry/cancel/saveConfig) ghi audit log với CreatedBy/UpdatedBy là user thật (≠ Guid.Empty); timestamps cập nhật đúng; retryCount tăng dần.",
    "evidence": [
     {
      "name": "TC-NAT-039__s01__detail",
      "caption": "Timestamps + retryCount sau thao tác",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#265",
     "#266"
    ],
    "notes": "Audit là yêu cầu pháp lý cho dữ liệu liên thông QG."
   },
   {
    "id": "TC-NAT-040",
    "title": "Giao diện — dark/light parity 4 màn phân hệ liên thông QG",
    "category": "ui",
    "priority": "P2",
    "role": "Bất kỳ",
    "preconditions": "Toggle dark/light ở topbar v2.",
    "steps": [
     "Bật light mode, duyệt 4 màn (National Gateways 3 tab, Đề án 06 3 tab, Liên viện, Công văn)",
     "Bật dark mode, duyệt lại",
     "Kiểm tra KpiStrip/StatusBadge/DataTable/Drawer/Modal/JSON pre, màu trạng thái (ok/warn/crit/info)"
    ],
    "expected": "Mọi thành phần đọc được ở cả 2 theme; tương phản đủ; badge trạng thái, payload <pre> nền var(--d-1), link file đính kèm, màu cảnh báo quá hạn/chết lưu/dương tính đều parity; không text trắng trên nền trắng.",
    "evidence": [
     {
      "name": "TC-NAT-040__s01__ui",
      "caption": "Light mode 4 màn",
      "uiState": "ui"
     },
     {
      "name": "TC-NAT-040__s02__ui",
      "caption": "Dark mode 4 màn parity",
      "uiState": "ui"
     }
    ],
    "refIssues": [
     "#277"
    ]
   },
   {
    "id": "TC-NAT-041",
    "title": "Integration — Mock mode vs cổng thật: chuyển trạng thái phản ánh đúng phản hồi cổng",
    "category": "integration",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Cấu hình mockMode bật rồi tắt (nếu có endpoint thật/sandbox).",
    "steps": [
     "Bật Mock mode, gửi 1 đơn thuốc QG -> quan sát chuyển Cổng xác nhận giả lập + responseJson mock",
     "Tắt Mock (nếu có sandbox) gửi lại -> quan sát gatewayTransactionId/ticketNumber thật hoặc lỗi kết nối",
     "Kiểm tra Dược QG generate ở mock có payloadXml/responseXml"
    ],
    "expected": "Mock: trạng thái chuyển Cổng xác nhận với transaction id giả, không gọi mạng ngoài. Cổng thật/sandbox: gatewayTransactionId thật hoặc lỗi rõ ràng (errorCode/errorMessage) — không treo vô hạn (tôn trọng timeout cấu hình).",
    "evidence": [
     {
      "name": "TC-NAT-041__s01__detail",
      "caption": "Mock mode response payload",
      "uiState": "detail"
     },
     {
      "name": "TC-NAT-041__s02__error",
      "caption": "Cổng thật lỗi kết nối có errorMessage",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#277"
    ]
   }
  ],
  "ui_state_checklist": [
   "list — danh sách giao dịch/báo cáo/GCS-GBT-KSK/YC liên viện/công văn",
   "detail — nội dung chi tiết trong Drawer (payload JSON, ICD, thể chất, timestamps)",
   "drawer — DrawerShell mở (Cổng QG, Đề án 06, Liên viện, Công văn)",
   "modal — Modal tạo YC liên viện / thêm công văn / phản hồi YC",
   "form — form cấu hình cổng / form thêm-sửa công văn / form tạo YC",
   "filter — ô tìm + lọc trạng thái/loại",
   "dropdown — Filter trạng thái/loại đang mở",
   "tab — TopTabs (rx/pharm/cfg, birth/death/driver) + StatusTabs liên viện/công văn",
   "validation — thông báo lỗi field bắt buộc/định dạng/biên",
   "empty — không có dữ liệu",
   "loading — đang tải dữ liệu",
   "error — toast lỗi tải/lưu/gửi cổng + badge Mất kết nối",
   "confirm — hộp xác nhận hủy/xóa + in",
   "success — toast thành công (gửi/lưu/tạo/xóa/cập nhật)",
   "toast — thông báo nhanh (warn hủy giao dịch)",
   "state — ẩn/hiện nút theo trạng thái (retry/cancel/submit/respond)",
   "permission — menu/route/nút bị chặn theo vai trò; IDOR bị chặn",
   "ui — dark/light parity, định dạng số/tiền/ngày, màu cảnh báo"
  ],
  "gaps": [
   "DqgvnSubmissions (bảng 'Nộp dược QG (DQGVN)' trong data.js) chưa thấy màn FE riêng — chỉ có National Pharmacy outbound report; cần xác nhận DQGVN có UI/luồng riêng hay đã gộp vào tab Dược QG (gap coverage).",
   "Form cấu hình cổng QG dùng input thuần, dường như KHÔNG validate client (URL hợp lệ, retry/timeout không âm) — cần test BE-side validation và bổ sung validation FE.",
   "Không tìm thấy luồng TẠO mới GCS/GBT/KSK lái xe trên FE v2 (chỉ có search + submit); SaveBirth/Death/Dlhc tồn tại trong api nhưng không có form UI — gap nhập liệu (có thể tạo từ phân hệ Sản/Tử vong khác); cần test nguồn dữ liệu đầu vào + tính nhất quán cross-module (vd tử vong từ nội trú -> GBT).",
   "Liên viện tạo YC chỉ direction 'outgoing'; chưa rõ luồng nhận YC 'incoming' đến từ đâu (cổng liên viện thật?) — cần test integration nguồn YC vào.",
   "Chưa rõ ràng matrix quyền cụ thể cho từng vai trò trên 4 màn (đối chiếu #216) — cần bảng quyền chi tiết để khẳng định permission cases.",
   "Audit log cho saveConfig (đổi URL/token cổng) và cancel/retry chưa được kiểm chứng trong code FE — cần verify BE ghi audit cho thao tác nhạy cảm.",
   "OfficialDocuments dùng apiClient.get trực tiếp ('/admin-modules/official-documents') không qua api client layer riêng — cần kiểm tra unwrap envelope đúng và không có raw-fetch v1.",
   "Chưa có test phân tách/gộp hay liên thông số liệu sang BHYT/viện phí (national rel với insurance/presc/emr) — phạm vi data-consistency cross-module có thể mở rộng nếu cần.",
   "Thiếu test cho trạng thái 'Đang xử lý' (1) của Đề án 06 — submit chỉ chặn khi >=2, cần xác nhận có thể submit lại khi đang xử lý (da06Status=1) hay không (ambiguity).",
   "Concurrency: 2 user cùng gửi/hủy một giao dịch QG đồng thời — chưa có test optimistic lock/idempotency (cổng QG cần idempotency key)."
  ]
 },
 {
  "id": "checkup",
  "code": "CHK",
  "layer": "spec",
  "ic": "📝",
  "nm": "Khám sức khỏe & Gói khám",
  "gh": [
   "#267",
   "#269"
  ],
  "gap": false,
  "module_id": "checkup",
  "summary": "Phan he \"Kham suc khoe & Goi kham\" (CHK, lop spec) quan ly hop dong KSK, goi kham, dot KSK doanh nghiep/hoc duong/lao dong, va tung luot KSK chuyen biet (lai xe TT36, VSATTP TT15, hoc sinh/tre <24 thang, tong quat). Bang chinh: HealthCheckContracts, HealthCheckPackages, HealthCheckPackageServices, HealthCheckups, HealthCheckupRecords, HealthCheckupCampaigns, CheckupCampaignGroups, OccupationalHealthExams, SchoolHealthExams. Man chinh thuc co tren FE v2 (/v2/health-checkup): danh sach luot KSK + KpiStrip + StatusTabs (Cho/Dang kham/Hoan thanh/Da chung nhan) + DataTable + Drawer chi tiet + CrudModal tao/sua dong-truong theo loai + in giay chung nhan. API con expose Dot KSK (campaigns), Nhom dot, import Excel danh sach, bao cao chi phi dot (chua co UI). Luong nghiep vu: Hop dong/goi -> Thuc hien DV (CLS) -> Tong hop KQ -> Vien phi (billing).",
  "screens": [
   {
    "name": "Danh sach luot KSK (List)",
    "desc": "Trang chinh /v2/health-checkup: KpiStrip (Tong KSK, Hom nay, Dat %, Khong dat), toolbar tim kiem + Filter loai KSK + Bo loc + Lam moi + KSK moi, StatusTabs theo trang thai, DataTable phan trang 18 dong/trang, Pager.",
    "route_guess": "/v2/health-checkup",
    "elements": [
     "KpiStrip 4 the",
     "SearchBox tim BN/ma KSK",
     "Filter loai KSK",
     "Btn Bo loc",
     "Btn Lam moi",
     "Btn KSK moi",
     "StatusTabs Cho/Dang kham/Hoan thanh/Da chung nhan + all",
     "DataTable cot Ma KSK/Doi tuong/Ngay/Loai/BS kham/Ket luan/Trang thai",
     "ActBtn Chi tiet + Sua",
     "Pager"
    ]
   },
   {
    "name": "Drawer chi tiet luot KSK (Drawer)",
    "desc": "DrawerShell size lg mo khi click dong/icon mat: cac DrSec Doi tuong, Kham, Kham chuyen khoa (Noi/Ngoai/Mat/TMH/RHM/Da lieu/Phu khoa/Tam than), section dac thu theo loai (Lai xe TT36 / VSATTP TT15 / Tre em-Di hoc), Ket luan (KQ XN, X-quang, ket luan badge, ghi chu). Footer: Dong, In giay CN (neu loai co mau in), Cap nhat.",
    "route_guess": "/v2/health-checkup (drawer)",
    "elements": [
     "DrSec Doi tuong",
     "DrSec Kham",
     "DrSec Kham chuyen khoa",
     "DrSec dac thu Lai xe/VSATTP/Tre em",
     "DrSec Ket luan + StatusBadge",
     "Btn Dong",
     "Btn In giay CN",
     "Btn Cap nhat"
    ]
   },
   {
    "name": "Modal tao/sua KSK (Modal)",
    "desc": "CrudModal size lg: chon Loai KSK (bat buoc) -> hien BASE_FIELDS (Ho ten*, Ma/CCCD, Gioi tinh*, Ngay sinh, Ngay kham*, BS kham, Ket luan, Trang thai, Ghi chu) + truong dac thu dong theo loai (Driver: hang lai xe/thu phan xa/thi giac mau; FoodSafety: vai tro/ket luan VSATTP; Student/ChildUnder24m: tuoi thang/phat trien/dinh duong/tiem chung).",
    "route_guess": "/v2/health-checkup (modal)",
    "elements": [
     "Select Loai KSK*",
     "Input Ho ten*",
     "Input Ma/CCCD",
     "Select Gioi tinh*",
     "DatePicker Ngay sinh",
     "DatePicker Ngay kham*",
     "Input BS kham",
     "Select Ket luan",
     "Select Trang thai",
     "Textarea Ghi chu",
     "Truong dac thu dong",
     "Btn Luu/Huy"
    ]
   },
   {
    "name": "Giay chung nhan KSK in (Print)",
    "desc": "Cua so in moi (window.open) render DriverCheckupPrint (TT36) / VsattpCheckupPrint (TT15) / StudentCheckupPrint tu HealthCheckupPrintTemplates theo checkupType, goi window.print().",
    "route_guess": "/v2/health-checkup (print window)",
    "elements": [
     "Mau giay KSK lai xe",
     "Mau giay KSK VSATTP",
     "Mau giay KSK hoc sinh",
     "Header benh vien",
     "Block ky ten",
     "Nut In trinh duyet"
    ]
   },
   {
    "name": "Quan ly Dot KSK / Nhom (API-only, chua co UI v2)",
    "desc": "API expose campaigns (HealthCheckupCampaigns): ma dot, ten, cong ty, nguoi LH, ngay BD/KT, loai, goi DV, % giam gia, tong DK/hoan thanh/chi phi, trang thai (0 draft/1 active/2 completed/3 cancelled); CampaignGroups (nhom dot, phong, so thanh vien); import Excel danh sach; bao cao chi phi dot. Hien chua render man v2 -> diem gap.",
    "route_guess": "(chua co route v2)",
    "elements": [
     "CRUD campaign",
     "Nhom dot",
     "Import Excel",
     "Cost report"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-CHK-001",
    "title": "Tao moi luot KSK Lai xe (TT36) thanh cong - happy path",
    "category": "happy",
    "priority": "P0",
    "role": "Bac si KSK / admin",
    "preconditions": "Dang nhap admin/Admin@123, o /v2/health-checkup, BE 5106 chay, danh sach loai KSK tai duoc.",
    "steps": [
     "Bam nut 'KSK moi' mo CrudModal",
     "Chon Loai KSK = 'Lai xe' (Driver) -> truong dac thu lai xe xuat hien",
     "Nhap Ho ten 'Nguyen Van A', Gioi tinh Nam, Ngay sinh, Ngay kham hom nay, BS kham",
     "Nhap Hang lai xe 'B2', Thu phan xa, Thi giac mau",
     "Chon Ket luan 'Dat', Trang thai 'Da chung nhan'",
     "Bam Luu"
    ],
    "expected": "Toast 'Da tao KSK', modal dong, ban ghi moi hien o dau danh sach voi badge Ket luan 'Dat' (tone ok) va trang thai 'Da chung nhan'; KpiStrip Tong KSK +1; ban ghi co the in giay CN lai xe.",
    "evidence": [
     {
      "name": "TC-CHK-001__s01__form",
      "caption": "Modal KSK moi chon loai Lai xe hien truong dac thu",
      "uiState": "form"
     },
     {
      "name": "TC-CHK-001__s02__success",
      "caption": "Toast tao thanh cong + ban ghi moi trong list",
      "uiState": "success"
     },
     {
      "name": "TC-CHK-001__s03__list",
      "caption": "List sau khi tao co dong moi + KPI cap nhat",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#267",
     "#269"
    ]
   },
   {
    "id": "TC-CHK-002",
    "title": "Tao moi luot KSK VSATTP (TT15) - truong dac thu thay doi theo loai",
    "category": "happy",
    "priority": "P1",
    "role": "Bac si KSK",
    "preconditions": "Dang nhap, o /v2/health-checkup, loai KSK 'FoodSafety' co trong dropdown.",
    "steps": [
     "Bam 'KSK moi'",
     "Chon Loai = 'VSATTP' (FoodSafety) -> truong 'Vai tro tiep xuc thuc pham' + 'Ket luan VSATTP' xuat hien, truong lai xe bien mat",
     "Nhap day du field bat buoc + vai tro 'Che bien' + ket luan VSATTP",
     "Bam Luu"
    ],
    "expected": "Modal hien dung bo truong VSATTP (khong con field lai xe/tre em), luu thanh cong, drawer chi tiet hien DrSec 'KSK VSATTP (TT15)' voi vai tro + ket luan.",
    "evidence": [
     {
      "name": "TC-CHK-002__s01__form",
      "caption": "Form VSATTP voi truong dac thu food safety",
      "uiState": "form"
     },
     {
      "name": "TC-CHK-002__s02__drawer",
      "caption": "Drawer chi tiet section KSK VSATTP TT15",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-CHK-003",
    "title": "Tao moi luot KSK Hoc sinh/Tre <24 thang - truong nhi khoa",
    "category": "happy",
    "priority": "P1",
    "role": "Bac si KSK",
    "preconditions": "Dang nhap, o /v2/health-checkup, loai 'Student'/'ChildUnder24m' co trong dropdown.",
    "steps": [
     "Bam 'KSK moi', chon Loai = 'Hoc sinh' (Student)",
     "Xac nhan truong Tuoi (thang) + Danh gia phat trien + Tinh trang dinh duong + Tinh trang tiem chung xuat hien",
     "Nhap day du, Tuoi 18 thang, dinh duong 'Binh thuong', tiem chung 'Day du'",
     "Bam Luu"
    ],
    "expected": "Luu thanh cong; drawer hien DrSec 'KSK Tre em / Di hoc' voi tuoi thang, phat trien, dinh duong, tiem chung; in giay dung mau hoc sinh.",
    "evidence": [
     {
      "name": "TC-CHK-003__s01__form",
      "caption": "Form KSK hoc sinh truong nhi khoa",
      "uiState": "form"
     },
     {
      "name": "TC-CHK-003__s02__drawer",
      "caption": "Drawer section KSK tre em / di hoc",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-CHK-004",
    "title": "Cap nhat luot KSK hien co - prefill dung loai va truong dac thu",
    "category": "happy",
    "priority": "P1",
    "role": "Bac si KSK",
    "preconditions": "Co it nhat 1 ban ghi KSK loai Driver.",
    "steps": [
     "Click icon 'Sua' tren 1 dong loai Lai xe (hoac mo drawer roi bam 'Cap nhat')",
     "Xac nhan modal prefill: checkupType=Lai xe, cac truong base + truong lai xe da co gia tri",
     "Sua BS kham + ket luan tu 'Co dieu kien' sang 'Dat'",
     "Bam Luu"
    ],
    "expected": "Modal mo voi du lieu cu day du (selectedType tu record.checkupType), luu goi updateHealthCheckup, toast 'Da cap nhat KSK', list refresh phan anh ket luan moi.",
    "evidence": [
     {
      "name": "TC-CHK-004__s01__modal",
      "caption": "Modal sua prefill du lieu cu + truong dac thu",
      "uiState": "modal"
     },
     {
      "name": "TC-CHK-004__s02__success",
      "caption": "Toast cap nhat + list cap nhat ket luan",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-CHK-005",
    "title": "Loc danh sach KSK theo StatusTabs va Filter loai - dem dung",
    "category": "happy",
    "priority": "P1",
    "role": "Bac si KSK",
    "preconditions": "Co ban ghi o nhieu trang thai (Cho/Dang kham/Hoan thanh/Da chung nhan) va nhieu loai.",
    "steps": [
     "Quan sat counts tren cac tab (all + 4 trang thai)",
     "Bam tab 'Da chung nhan' -> chi hien ban ghi status=3",
     "Chon Filter loai = 'Lai xe' -> giao 2 dieu kien",
     "Nhap tu khoa ten BN vao SearchBox -> loc them",
     "Bam 'Bo loc'"
    ],
    "expected": "Counts tren tab khop so dong thuc; tab + filter + search ket hop AND dung; nut 'Bo loc' reset search/loai/tab ve 'all', Pager ve trang 0.",
    "evidence": [
     {
      "name": "TC-CHK-005__s01__filter",
      "caption": "StatusTabs + Filter loai active loc danh sach",
      "uiState": "filter"
     },
     {
      "name": "TC-CHK-005__s02__list",
      "caption": "List sau bo loc tro ve toan bo",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#269"
    ]
   },
   {
    "id": "TC-CHK-006",
    "title": "In giay chung nhan KSK lai xe (TT36) tu drawer",
    "category": "happy",
    "priority": "P1",
    "role": "Bac si KSK",
    "preconditions": "Co ban ghi loai Driver, popup khong bi chan.",
    "steps": [
     "Mo drawer chi tiet 1 ban ghi loai Lai xe",
     "Xac nhan nut 'In giay CN' hien (printKey != null)",
     "Bam 'In giay CN' -> window.open mo cua so in",
     "Kiem tra noi dung mau TT36 (ho ten, hang lai xe, ket luan, block ky)"
    ],
    "expected": "Cua so in mo voi mau DriverCheckupPrint dung du lieu ban ghi, format A4, co header + chu ky; lenh window.print() goi.",
    "evidence": [
     {
      "name": "TC-CHK-006__s01__drawer",
      "caption": "Drawer co nut In giay CN cho loai Driver",
      "uiState": "drawer"
     },
     {
      "name": "TC-CHK-006__s02__modal",
      "caption": "Cua so in mau TT36 noi dung dung",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-CHK-007",
    "title": "Validation - bo trong cac truong bat buoc (Loai/Ho ten/Gioi tinh/Ngay kham)",
    "category": "validation",
    "priority": "P0",
    "role": "Bac si KSK",
    "preconditions": "Dang nhap, o /v2/health-checkup.",
    "steps": [
     "Bam 'KSK moi'",
     "Khong chon Loai KSK, de trong Ho ten, khong chon Gioi tinh, de trong Ngay kham",
     "Bam Luu"
    ],
    "expected": "Modal khong dong, hien loi validation tren tung field required (Loai KSK, Ho ten doi tuong, Gioi tinh, Ngay kham); khong goi API create; khong co toast thanh cong.",
    "evidence": [
     {
      "name": "TC-CHK-007__s01__validation",
      "caption": "Loi validation tren cac field bat buoc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-CHK-008",
    "title": "Validation - dau tieng Viet co dau + ky tu dac biet o Ho ten/Ghi chu",
    "category": "edge",
    "priority": "P2",
    "role": "Bac si KSK",
    "preconditions": "Dang nhap, o /v2/health-checkup.",
    "steps": [
     "Bam 'KSK moi', chon loai bat ky",
     "Nhap Ho ten 'Nguyen Thi Hoang An (co dau day du)' + ky tu & < > ' \"",
     "Nhap Ghi chu chuoi rat dai (>1000 ky tu) co dau tieng Viet",
     "Luu va mo lai drawer/list"
    ],
    "expected": "Luu duoc, hien thi dung dau tieng Viet (khong vo font/mojibake), ky tu dac biet escape an toan (khong XSS), chuoi dai khong vo layout, cot Doi tuong cat goi ngon.",
    "evidence": [
     {
      "name": "TC-CHK-008__s01__form",
      "caption": "Form nhap ten co dau + ky tu dac biet",
      "uiState": "form"
     },
     {
      "name": "TC-CHK-008__s02__list",
      "caption": "List hien dung dau tieng Viet, khong vo layout",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-CHK-009",
    "title": "Edge - Ngay sinh/Ngay kham bien (tuong lai, qua khu xa, sinh > kham)",
    "category": "edge",
    "priority": "P1",
    "role": "Bac si KSK",
    "preconditions": "Dang nhap, o /v2/health-checkup.",
    "steps": [
     "Bam 'KSK moi', chon loai",
     "Nhap Ngay sinh = 01/01/1900, Ngay kham = ngay tuong lai (nam sau)",
     "Thu Ngay sinh > Ngay kham (sinh sau ngay kham)",
     "Luu"
    ],
    "expected": "He thong chan/canh bao ngay kham tuong lai va ngay sinh sau ngay kham (neu co rule); neu khong co rule -> ghi nhan gap. Tuoi tinh ra hop ly, format DD/MM/YYYY dung.",
    "evidence": [
     {
      "name": "TC-CHK-009__s01__validation",
      "caption": "Canh bao/chan ngay bien khong hop le",
      "uiState": "validation"
     },
     {
      "name": "TC-CHK-009__s02__form",
      "caption": "Form voi ngay bien nhap vao",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-CHK-010",
    "title": "Negative - huy modal tao giua chung khong tao ban ghi rac",
    "category": "negative",
    "priority": "P1",
    "role": "Bac si KSK",
    "preconditions": "Dang nhap, o /v2/health-checkup, ghi nho tong so ban ghi.",
    "steps": [
     "Bam 'KSK moi', nhap mot phan du lieu",
     "Bam Huy (hoac dong modal) giua chung",
     "Mo lai 'KSK moi'"
    ],
    "expected": "Khong tao ban ghi nao (tong so khong doi), modal mo lai trong/reset; khong toast.",
    "evidence": [
     {
      "name": "TC-CHK-010__s01__modal",
      "caption": "Modal nhap do dang truoc khi huy",
      "uiState": "modal"
     },
     {
      "name": "TC-CHK-010__s02__list",
      "caption": "List khong them ban ghi sau khi huy",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-CHK-011",
    "title": "State - chuyen trang thai hop le Cho -> Dang kham -> Hoan thanh -> Da chung nhan",
    "category": "state",
    "priority": "P0",
    "role": "Bac si KSK",
    "preconditions": "Co 1 ban ghi trang thai 'Cho'.",
    "steps": [
     "Sua ban ghi tu Trang thai 0 (Cho) sang 1 (Dang kham), luu",
     "Tiep sang 2 (Hoan thanh), luu",
     "Tiep sang 3 (Da chung nhan), luu",
     "Quan sat StatusTabs counts + badge tren tung buoc"
    ],
    "expected": "Moi buoc badge + tab dem cap nhat dung tone (Cho warn / Dang kham info / Hoan thanh info / Da chung nhan ok); ban ghi di chuyen giua cac tab dung.",
    "evidence": [
     {
      "name": "TC-CHK-011__s01__modal",
      "caption": "Doi trang thai trong modal sua",
      "uiState": "modal"
     },
     {
      "name": "TC-CHK-011__s02__list",
      "caption": "Badge + tab count thay doi theo trang thai",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#269"
    ]
   },
   {
    "id": "TC-CHK-012",
    "title": "State - chan chinh sua KSK da chung nhan (Locked) neu co rule",
    "category": "state",
    "priority": "P1",
    "role": "Bac si KSK",
    "preconditions": "Co ban ghi trang thai 3 (Da chung nhan) da in giay.",
    "steps": [
     "Mo ban ghi 'Da chung nhan'",
     "Thu bam 'Cap nhat' va sua ket luan tu Dat -> Khong dat",
     "Luu"
    ],
    "expected": "Neu co rule khoa ho so sau chung nhan -> chan sua/canh bao + audit. Hien tai FE cho sua tu do -> ghi nhan gap patient-safety (sua ket luan sau khi da cap giay).",
    "evidence": [
     {
      "name": "TC-CHK-012__s01__modal",
      "caption": "Thu sua ban ghi da chung nhan",
      "uiState": "modal"
     },
     {
      "name": "TC-CHK-012__s02__error",
      "caption": "Canh bao/chan sua (neu co) hoac trang thai sau sua",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-CHK-013",
    "title": "Data-consistency - KpiStrip (Tong/Hom nay/Dat %/Khong dat) khop danh sach",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bac si KSK / quan ly",
    "preconditions": "Co bo du lieu KSK voi cac ket luan pass/fail/conditional + 1 so kham hom nay.",
    "steps": [
     "Tai trang, doc gia tri KpiStrip (Tong KSK, Hom nay, Dat %, Khong dat)",
     "Dem thu cong so dong theo conclusion va theo ngay kham hom nay",
     "Tao moi 1 KSK ket luan 'Dat' hom nay -> kiem tra Kpi cap nhat"
    ],
    "expected": "Stats tu /health-checkup/statistics khop so dong thuc te (passCount/failCount/todayCount/totalCheckups); % Dat = passCount/total lam tron dung; sau khi tao moi, Tong+1 va Dat+1 (sau reload).",
    "evidence": [
     {
      "name": "TC-CHK-013__s01__list",
      "caption": "KpiStrip + danh sach de doi chieu so lieu",
      "uiState": "list"
     },
     {
      "name": "TC-CHK-013__s02__success",
      "caption": "Kpi cap nhat sau khi them ban ghi Dat",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#269"
    ]
   },
   {
    "id": "TC-CHK-014",
    "title": "Data-consistency - chi phi KSK -> vien phi (luong checkup -> billing)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quan ly / thu ngan",
    "preconditions": "KSK gan goi DV co gia, BN co the chuyen sang billing.",
    "steps": [
     "Tao/thuc hien luot KSK voi goi DV co dinh gia",
     "Chuyen sang phan he Vien phi (billing) tra cuu BN do",
     "Doi chieu chi phi DV KSK xuat hien dung o phieu vien phi"
    ],
    "expected": "Chi phi DV trong goi KSK tong hop dung sang vien phi (theo luong checkup->billing trong data.js); tong tien khop; audit log ghi mutation. Neu chua noi billing -> ghi nhan gap.",
    "evidence": [
     {
      "name": "TC-CHK-014__s01__detail",
      "caption": "Chi tiet KSK voi goi DV/chi phi",
      "uiState": "detail"
     },
     {
      "name": "TC-CHK-014__s02__tab",
      "caption": "Doi chieu chi phi ben vien phi",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#269"
    ]
   },
   {
    "id": "TC-CHK-015",
    "title": "Permission - vai tro khong du quyen bi chan menu/nut/API KSK",
    "category": "permission",
    "priority": "P0",
    "role": "User khong co quyen KSK (vd le tan/ke toan)",
    "preconditions": "Co tai khoan vai tro han che (khong nam trong matrix quyen checkup #216).",
    "steps": [
     "Dang nhap bang vai tro han che",
     "Thu truy cap /v2/health-checkup truc tiep qua URL",
     "Kiem tra menu KSK an/disabled, nut 'KSK moi'/'Cap nhat' an",
     "Goi truc tiep API POST /health-checkup bang token vai tro do"
    ],
    "expected": "Menu KSK khong hien hoac route bi chan/redirect; nut tao/sua an theo quyen; API tra 403 Forbidden cho vai tro khong duoc cap (theo matrix #216), khong cho ghi.",
    "evidence": [
     {
      "name": "TC-CHK-015__s01__permission",
      "caption": "Man KSK bi chan/an nut voi vai tro khong du quyen",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#267"
    ]
   },
   {
    "id": "TC-CHK-016",
    "title": "Security - IDOR xem/sua KSK BN khac qua id truc tiep",
    "category": "security",
    "priority": "P0",
    "role": "User co quyen han che pham vi",
    "preconditions": "Biet id mot ban ghi KSK thuoc don vi/BN khac (GET /health-checkup/{id}).",
    "steps": [
     "Lay token mot user gioi han pham vi",
     "Goi GET /health-checkup/{id-cua-BN-khac} truc tiep",
     "Goi PUT /health-checkup/{id-cua-BN-khac} sua ket luan",
     "Goi DELETE /health-checkup/{id-cua-BN-khac}"
    ],
    "expected": "BE kiem tra quyen tren tung resource: tra 403/404 khi truy cap ban ghi ngoai pham vi; khong cho doc/sua/xoa ho so KSK cua BN/don vi khac (chong IDOR).",
    "evidence": [
     {
      "name": "TC-CHK-016__s01__error",
      "caption": "API tra 403/404 khi truy cap id ngoai pham vi",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216",
     "#267"
    ]
   },
   {
    "id": "TC-CHK-017",
    "title": "Security - XSS o field Ghi chu / Ket luan VSATTP",
    "category": "security",
    "priority": "P1",
    "role": "Bac si KSK",
    "preconditions": "Dang nhap, o /v2/health-checkup.",
    "steps": [
     "Tao KSK voi Ghi chu = '<img src=x onerror=alert(1)>' va Ket luan VSATTP chua <script>",
     "Luu, mo drawer chi tiet va xem list",
     "In giay CN (render vao window.open)"
    ],
    "expected": "Noi dung hien duoi dang text thuan (escape), khong thuc thi script trong drawer/list/cua so in; khong co alert popup. Dac biet luu y window.open ghi innerHTML truc tiep (rui ro XSS) -> kiem ky.",
    "evidence": [
     {
      "name": "TC-CHK-017__s01__drawer",
      "caption": "Drawer hien payload XSS duoi dang text khong thuc thi",
      "uiState": "drawer"
     },
     {
      "name": "TC-CHK-017__s02__modal",
      "caption": "Cua so in khong thuc thi script",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-CHK-018",
    "title": "UI - empty state khi chua co luot KSK",
    "category": "ui",
    "priority": "P2",
    "role": "Bac si KSK",
    "preconditions": "Bo loc/tu khoa khong khop dong nao hoac DB rong.",
    "steps": [
     "Loc bang tu khoa khong ton tai (vd 'zzzzz')",
     "Quan sat DataTable",
     "Bo loc de quay lai"
    ],
    "expected": "DataTable hien empty 'Chua co kham SK' (khi khong loading); Pager hien total 0; khong vo layout.",
    "evidence": [
     {
      "name": "TC-CHK-018__s01__empty",
      "caption": "Empty state danh sach KSK",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#269"
    ]
   },
   {
    "id": "TC-CHK-019",
    "title": "UI - loading state khi dang tai danh sach",
    "category": "ui",
    "priority": "P2",
    "role": "Bac si KSK",
    "preconditions": "Mang cham hoac throttle de thay loading.",
    "steps": [
     "Tai lai /v2/health-checkup (hoac bam 'Lam moi')",
     "Quan sat DataTable trong khi cho"
    ],
    "expected": "Trong khi loading=true, DataTable hien 'Dang tai...'; sau khi xong hien du lieu; khong nhap nhay/loi.",
    "evidence": [
     {
      "name": "TC-CHK-019__s01__loading",
      "caption": "DataTable hien Dang tai khi loading",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#269"
    ]
   },
   {
    "id": "TC-CHK-020",
    "title": "UI - error state khi BE loi (API /health-checkup fail)",
    "category": "ui",
    "priority": "P1",
    "role": "Bac si KSK",
    "preconditions": "Mo phong BE tra 500 hoac tat BE.",
    "steps": [
     "Tat/ngat BE 5106 hoac chan endpoint /health-checkup",
     "Tai lai trang"
    ],
    "expected": "API client catch loi tra mang rong (console.warn, khong throw), hien toast 'Khong tai duoc KSK'; danh sach empty; trang khong crash trang trang (no white screen).",
    "evidence": [
     {
      "name": "TC-CHK-020__s01__error",
      "caption": "Toast khong tai duoc + danh sach rong khi BE loi",
      "uiState": "error"
     },
     {
      "name": "TC-CHK-020__s02__toast",
      "caption": "Toast thong bao loi tai du lieu",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#269"
    ]
   },
   {
    "id": "TC-CHK-021",
    "title": "UI - dark/light parity man KSK (KpiStrip/Table/Drawer/Modal)",
    "category": "ui",
    "priority": "P2",
    "role": "Bac si KSK",
    "preconditions": "Co toggle dark/light tren topbar v2.",
    "steps": [
     "O /v2/health-checkup, toggle sang Dark",
     "Kiem tra KpiStrip, StatusTabs, DataTable, StatusBadge, Drawer, CrudModal",
     "Toggle lai Light"
    ],
    "expected": "Ca 2 che do: chu/nen du tuong phan (var --t-0/--t-2/--line), badge tone (ok/warn/crit/info) doc duoc, khong chu trang tren nen trang; drawer/modal nhat quan.",
    "evidence": [
     {
      "name": "TC-CHK-021__s01__list",
      "caption": "Man KSK che do Dark",
      "uiState": "list"
     },
     {
      "name": "TC-CHK-021__s02__list",
      "caption": "Man KSK che do Light",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#269"
    ]
   },
   {
    "id": "TC-CHK-022",
    "title": "UI - phan trang Pager voi nhieu ban ghi (>18 dong/trang)",
    "category": "ui",
    "priority": "P2",
    "role": "Bac si KSK",
    "preconditions": "Co tren 18 ban ghi KSK.",
    "steps": [
     "Quan sat Pager hien tong so + so trang",
     "Bam sang trang 2, 3",
     "Doi tab/filter -> kiem tra Pager reset ve trang 0"
    ],
    "expected": "Moi trang hien dung 18 dong, Pager dieu huong dung; khi doi search/tab/filter trang ve 0; total khop filtered.length.",
    "evidence": [
     {
      "name": "TC-CHK-022__s01__list",
      "caption": "Pager trang 2 voi 18 dong/trang",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#269"
    ]
   },
   {
    "id": "TC-CHK-023",
    "title": "Negative - loai KSK khong co truong dac thu (tong quat) khong loi",
    "category": "negative",
    "priority": "P2",
    "role": "Bac si KSK",
    "preconditions": "Loai 'general_adult'/'periodic' khong co trong TYPE_EXTRA_FIELDS.",
    "steps": [
     "Bam 'KSK moi', chon loai Tong quat (khong map extra field)",
     "Nhap base fields, luu",
     "Mo drawer chi tiet"
    ],
    "expected": "Form chi hien base fields (extra = []), luu binh thuong; drawer khong hien section dac thu (Driver/VSATTP/Tre em); khong loi rendering.",
    "evidence": [
     {
      "name": "TC-CHK-023__s01__form",
      "caption": "Form loai tong quat chi co base fields",
      "uiState": "form"
     },
     {
      "name": "TC-CHK-023__s02__drawer",
      "caption": "Drawer khong co section dac thu",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-CHK-024",
    "title": "Edge - getCheckupTypes fail dung fallback list cung",
    "category": "edge",
    "priority": "P2",
    "role": "Bac si KSK",
    "preconditions": "Endpoint /health-checkup/types tra loi.",
    "steps": [
     "Chan /health-checkup/types tra 500",
     "Tai lai trang, mo modal 'KSK moi', mo Filter loai"
    ],
    "expected": "Dropdown loai dung fallback 8 loai cung (general_adult, general_child, periodic, driver, student, elderly, occupational, infant); trang khong crash; van tao duoc KSK.",
    "evidence": [
     {
      "name": "TC-CHK-024__s01__dropdown",
      "caption": "Dropdown loai KSK dung fallback khi API types loi",
      "uiState": "dropdown"
     }
    ],
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-CHK-025",
    "title": "Data-consistency - audit log ghi dung khi tao/sua/xoa KSK",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quan tri / kiem toan",
    "preconditions": "Co quyen xem audit log; co the tao/sua/xoa KSK.",
    "steps": [
     "Tao 1 KSK -> kiem tra audit log co ban ghi CREATE (user, time, entity HealthCheckups)",
     "Sua ket luan -> log UPDATE voi before/after",
     "Xoa (deleteHealthCheckup) -> log DELETE"
    ],
    "expected": "Moi mutation (create/update/delete) sinh audit log day du nguoi-thoi gian-thay doi, dung CreatedBy/UpdatedBy (uniqueidentifier); khong mat ghi nhan. Neu thieu audit -> gap patient-safety/compliance.",
    "evidence": [
     {
      "name": "TC-CHK-025__s01__detail",
      "caption": "Audit log ghi nhan mutation KSK",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-CHK-026",
    "title": "Integration/gap - Dot KSK doanh nghiep (campaigns) + import Excel + cost report",
    "category": "integration",
    "priority": "P1",
    "role": "Quan ly KSK doanh nghiep",
    "preconditions": "API /health-checkup/campaigns* ton tai (BE), nhung UI v2 chua render man dot.",
    "steps": [
     "Kiem tra co man Dot KSK tren FE v2 khong (tao campaign, nhom dot, import danh sach Excel)",
     "Goi truc tiep API GET/POST /health-checkup/campaigns, POST .../groups, POST .../import, GET .../cost-report",
     "Tao 1 dot, import file Excel danh sach BN, xem bao cao chi phi dot"
    ],
    "expected": "Hop dong/dot/nhom/import/cost-report hoat dong qua API; trang thai campaign 0 draft/1 active/2 completed/3 cancelled dung; cost-report tong chi phi khop. Hien chua co UI v2 -> ghi nhan gap can xay man Dot KSK tren v2.",
    "evidence": [
     {
      "name": "TC-CHK-026__s01__detail",
      "caption": "Phan hoi API campaign/cost-report (chua co UI)",
      "uiState": "detail"
     },
     {
      "name": "TC-CHK-026__s02__error",
      "caption": "Khong tim thay man Dot KSK tren FE v2",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#269"
    ]
   },
   {
    "id": "TC-CHK-027",
    "title": "Negative - import Excel danh sach dot voi file sai dinh dang/du lieu loi",
    "category": "negative",
    "priority": "P2",
    "role": "Quan ly KSK doanh nghiep",
    "preconditions": "Co 1 campaign de import (qua API .../import).",
    "steps": [
     "Upload file khong phai Excel (.txt/.pdf)",
     "Upload Excel thieu cot bat buoc / co dong sai (thieu ho ten, ngay sai)",
     "Doc BatchImportResult"
    ],
    "expected": "Tra BatchImportResult voi totalRows/successCount/errorCount + danh sach errors theo dong; file sai dinh dang bi tu choi; dong loi khong tao ban ghi rac, dong hop le van import.",
    "evidence": [
     {
      "name": "TC-CHK-027__s01__error",
      "caption": "Ket qua import voi danh sach loi tung dong",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#269"
    ]
   },
   {
    "id": "TC-CHK-028",
    "title": "Permission - chi vai tro duoc cap moi in/cap giay chung nhan",
    "category": "permission",
    "priority": "P1",
    "role": "Vai tro khong duoc ky/cap giay",
    "preconditions": "Tai khoan khong co quyen cap giay chung nhan KSK.",
    "steps": [
     "Dang nhap vai tro khong co quyen chung nhan",
     "Mo drawer ban ghi loai co mau in",
     "Thu bam 'In giay CN' / chuyen trang thai sang 'Da chung nhan'"
    ],
    "expected": "Nut in/chung nhan an hoac bi chan theo quyen (matrix #216); khong cho cap giay neu khong du tham quyen ky. Neu FE khong gate -> gap permission.",
    "evidence": [
     {
      "name": "TC-CHK-028__s01__permission",
      "caption": "Nut in/chung nhan bi chan voi vai tro khong du quyen",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ]
   }
  ],
  "ui_state_checklist": [
   "list - danh sach luot KSK day du du lieu",
   "empty - khong co ban ghi / loc khong khop ('Chua co kham SK')",
   "loading - DataTable 'Dang tai...'",
   "error - BE loi: toast 'Khong tai duoc KSK' + list rong",
   "filter - StatusTabs + Filter loai + SearchBox active",
   "dropdown - dropdown Loai KSK (gom fallback khi API types loi)",
   "form - CrudModal tao moi, truong dac thu dong theo loai (Driver/VSATTP/Student)",
   "modal - CrudModal sua prefill + cua so in",
   "drawer - DrawerShell chi tiet voi cac DrSec (doi tuong/kham/chuyen khoa/dac thu/ket luan)",
   "detail - chi tiet du lieu (audit/cost-report/billing doi chieu)",
   "tab - doi chieu cheo sang vien phi",
   "validation - loi field bat buoc + ngay bien + dau tieng Viet",
   "success - toast tao/cap nhat + list/KPI cap nhat",
   "toast - thong bao loi/thanh cong",
   "confirm - xac nhan xoa (neu co)",
   "permission - man/nut/API bi chan theo vai tro",
   "dark - parity che do toi (KpiStrip/Table/Drawer/Modal)"
  ],
  "gaps": [
   "Chua co man Dot KSK doanh nghiep (campaigns) + Nhom dot + Import Excel + Cost-report tren FE v2 mac du API da co (getCampaigns/createCampaign/importBatchExcel/getCampaignCostReport) -> can xay man v2 + test UI day du.",
   "Khong co man/UI cho HealthCheckContracts (hop dong KSK) va HealthCheckPackages/HealthCheckPackageServices (goi kham + DV trong goi) -> phan 'goi kham' trong ten phan he chua co man quan ly goi; can xac minh va bo sung.",
   "Thieu rule khoa ho so sau khi 'Da chung nhan' (status=3): FE cho sua tu do ket luan ngay ca khi da cap giay -> rui ro patient-safety; can chan sua/yeu cau ly do + audit.",
   "Thieu validation ngay: ngay kham tuong lai, ngay sinh sau ngay kham, tuoi am -> chua thay rule chan o FE.",
   "Rui ro XSS o print: handlePrintKsk dung window.open + document.write(innerHTML) truc tiep -> can kiem tra escape noi dung ghi chu/ket luan tu nguoi dung.",
   "Chua ro audit log cho mutation KSK (create/update/delete) -> can xac minh ghi day du theo yeu cau compliance.",
   "Chua ro IDOR/phan quyen theo pham vi (don vi/BN): endpoint GET/PUT/DELETE /health-checkup/{id} can kiem tra quyen tren tung resource theo matrix #216.",
   "Chua ro lien thong checkup -> billing (chi phi DV goi KSK sang vien phi) co tu dong khong; data.js neu luong nhung FE chua thay noi.",
   "Chua co man bang t OccupationalHealthExams (KSK nghe nghiep) va SchoolHealthExams (KSK hoc duong) rieng biet ngoai cac truong dac thu nhung trong KSK chung -> can xac minh do phu so voi yeu cau phap ly TT.",
   "Chua co confirm dialog cho xoa KSK (deleteHealthCheckup co API nhung khong thay nut xoa tren UI v2) -> can xac minh luong xoa + confirm.",
   "Chua co kiem thu responsive (mobile/tablet) cho man KSK."
  ]
 },
 {
  "id": "immun",
  "code": "IMM",
  "layer": "spec",
  "ic": "💉",
  "nm": "Tiêm chủng",
  "gh": [
   "#267",
   "#268"
  ],
  "gap": false,
  "module_id": "immun",
  "summary": "Phân hệ Tiêm chủng (id=immun, IMM, lớp spec) quản lý mũi tiêm vaccine theo luồng Tiếp đón → Sàng lọc → Tiêm (theo lô vaccine) → Theo dõi phản ứng sau tiêm (AEFI) → về. Theo data.js gồm 3 bảng chính: VaccinationRecords (mũi tiêm), VaccinationCampaigns (chiến dịch tiêm), ImmunizationBatches (lô vaccine), quan hệ VaccinationCampaigns ⟶ ImmunizationBatches ⟶ VaccinationRecords; liên quan checkup + pubhealth. Triển khai thực tế (frontend/src/pages-v2/Immunization.tsx + api/immunization.ts) có: màn list Hồ sơ tiêm chủng (KPI + status-tab scheduled/completed/missed/deferred + bảng + drawer chi tiết), modal Ghi nhận tiêm (11 field), lịch tiêm theo bệnh nhân (schedule), và AEFI suy ra từ field aefiReport của record. Lưu ý quan trọng: phần Chiến dịch (Campaign) hiện là STUB phía FE (searchCampaigns trả [], createCampaign throw), getCampaignStats chỉ lấy từ /immunization/statistics — đây là vùng rủi ro cần test riêng.",
  "screens": [
   {
    "name": "Hồ sơ tiêm chủng (list v2)",
    "desc": "Trang chính: KpiStrip 6 KPI (Tổng mũi, Hôm nay, Đã tiêm, Bỏ lỡ, Quá hạn mũi sau, AEFI), StatusTabs 4 trạng thái (Đã lên lịch/Đã tiêm/Bỏ lỡ/Hoãn), ô tìm kiếm theo BN/vắc-xin/số lô, DataTable cột BN, Vắc-xin, Mũi (doseNumber/totalDoses), Số lô, Đường tiêm·Vị trí, Ngày tiêm, Mũi tiếp, Người tiêm, AEFI, TT. Nút header 'Ghi nhận tiêm'.",
    "route_guess": "/v2/immunization",
    "elements": [
     "KpiStrip",
     "StatusTabs",
     "ô tìm kiếm",
     "DataTable",
     "nút Ghi nhận tiêm",
     "StatusBadge",
     "chip AEFI"
    ]
   },
   {
    "name": "Drawer chi tiết mũi tiêm",
    "desc": "DrawerShell mở khi click 1 dòng: section BỆNH NHÂN (họ tên, mã BN, giới·NS), VẮC-XIN (tên, mã, số lô, mũi, đường tiêm, vị trí), THỜI GIAN (ngày tiêm, người tiêm, mũi tiếp), AEFI - phản ứng sau tiêm (chỉ hiện nếu có), GHI CHÚ (nếu có).",
    "route_guess": "/v2/immunization (drawer overlay)",
    "elements": [
     "DrawerShell",
     "rec-section",
     "rec-kv",
     "khối AEFI cảnh báo đỏ"
    ]
   },
   {
    "name": "Modal Ghi nhận tiêm chủng",
    "desc": "ModalShell size md, 11 field: Họ tên BN*, Mã BN, Tên vắc-xin*, Số lô*, Liều thứ/Tổng liều (InputNumber min 1), Vị trí tiêm* (Select: Đùi trái/phải, Cánh tay trái/phải), Đường tiêm* (Select IM/SC/ID/Oral), Ngày tiêm* (DatePicker mặc định hôm nay), Ngày tiêm tiếp (DatePicker), Ghi chú (TextArea). Footer Hủy/Lưu.",
    "route_guess": "/v2/immunization (modal)",
    "elements": [
     "ModalShell",
     "Input",
     "InputNumber",
     "Select",
     "DatePicker",
     "TextArea",
     "nút Lưu/Hủy",
     "validate inline message.warning"
    ]
   },
   {
    "name": "Lịch tiêm theo bệnh nhân (schedule)",
    "desc": "Dữ liệu từ /immunization/patient/{id}/schedule gom theo vắc-xin, mỗi vắc-xin có danh sách mũi (doseNumber, scheduledDate, completedDate, trạng thái). Hiện diện ở API client; UI tab/section lịch tiêm.",
    "route_guess": "/v2/immunization (tab/section schedule)",
    "elements": [
     "nhóm theo vaccineName",
     "danh sách mũi",
     "trạng thái mũi"
    ]
   },
   {
    "name": "AEFI - Phản ứng sau tiêm",
    "desc": "Danh sách báo cáo AEFI suy ra từ record có aefiReport: BN, vắc-xin, ngày tiêm, ngày phản ứng, mức độ (1 nhẹ→4 nghiêm trọng), triệu chứng, kết quả xử trí, người báo cáo, trạng thái (reported/investigating/closed).",
    "route_guess": "/v2/immunization (tab AEFI / filter)",
    "elements": [
     "bảng AEFI",
     "badge mức độ nghiêm trọng",
     "filter severity/status"
    ]
   },
   {
    "name": "Chiến dịch tiêm (Campaign) - STUB",
    "desc": "Theo data.js là VaccinationCampaigns (tên, vắc-xin, ngày bắt đầu/kết thúc, dân số mục tiêu, đã tiêm, trạng thái planned/active/completed/cancelled, khu vực). FE hiện stub: searchCampaigns trả [], createCampaign throw 'not supported'. Cần test để xác nhận empty-state đúng và không crash.",
    "route_guess": "/v2/immunization (tab chiến dịch)",
    "elements": [
     "empty-state",
     "KPI coverage",
     "(chưa có form tạo thực)"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-IMM-001",
    "title": "Ghi nhận tiêm chủng - luồng chính thành công",
    "category": "happy",
    "priority": "P0",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Đăng nhập admin/Admin@123, đang ở /v2/immunization",
    "steps": [
     "Mở /v2/immunization",
     "Bấm nút 'Ghi nhận tiêm' ở header",
     "Nhập Họ tên BN, Mã BN",
     "Nhập Tên vắc-xin (VD DPT-VGB-Hib), Số lô",
     "Đặt Liều thứ=1 / Tổng liều=3",
     "Chọn Vị trí tiêm = Đùi trái, Đường tiêm = IM",
     "Để Ngày tiêm = hôm nay, đặt Ngày tiêm tiếp",
     "Nhập Ghi chú, bấm Lưu"
    ],
    "expected": "Hiện toast 'Đã ghi nhận tiêm chủng', modal đóng, list reload và xuất hiện dòng mới với đúng vắc-xin/số lô/mũi 1/3, trạng thái mặc định scheduled hoặc completed theo BE.",
    "evidence": [
     {
      "name": "TC-IMM-001__s01__list",
      "caption": "List tiêm chủng trước khi tạo",
      "uiState": "list"
     },
     {
      "name": "TC-IMM-001__s02__form",
      "caption": "Modal ghi nhận đã nhập đủ field",
      "uiState": "form"
     },
     {
      "name": "TC-IMM-001__s03__success",
      "caption": "Toast thành công sau khi lưu",
      "uiState": "success"
     },
     {
      "name": "TC-IMM-001__s04__list",
      "caption": "Dòng mới xuất hiện trong list",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#267",
     "#268"
    ],
    "notes": "recordVaccination gọi POST /immunization/administer."
   },
   {
    "id": "TC-IMM-002",
    "title": "Validation các field bắt buộc trong modal Ghi nhận tiêm",
    "category": "validation",
    "priority": "P0",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Modal Ghi nhận tiêm đang mở, các field trống",
    "steps": [
     "Bấm Lưu khi tất cả trống → kiểm tra cảnh báo 'Nhập họ tên bệnh nhân'",
     "Nhập họ tên, bấm Lưu → 'Nhập tên vắc-xin'",
     "Nhập tên vắc-xin, bấm Lưu → 'Nhập số lô'",
     "Nhập số lô, bấm Lưu → 'Chọn vị trí tiêm'",
     "Chọn vị trí, bấm Lưu → 'Chọn đường tiêm'",
     "Chọn đường, xóa Ngày tiêm, bấm Lưu → 'Chọn ngày tiêm'"
    ],
    "expected": "Mỗi field bắt buộc thiếu đều chặn submit với đúng thông báo message.warning theo thứ tự; không gọi API khi còn thiếu.",
    "evidence": [
     {
      "name": "TC-IMM-002__s01__validation",
      "caption": "Cảnh báo thiếu họ tên",
      "uiState": "validation"
     },
     {
      "name": "TC-IMM-002__s02__validation",
      "caption": "Cảnh báo thiếu vị trí tiêm",
      "uiState": "validation"
     },
     {
      "name": "TC-IMM-002__s03__validation",
      "caption": "Cảnh báo thiếu ngày tiêm",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#267"
    ],
    "notes": "Field bắt buộc: patientName, vaccineName, lotNumber, site, route, vaccinationDate."
   },
   {
    "id": "TC-IMM-003",
    "title": "Hủy giữa chừng modal Ghi nhận tiêm - không lưu, reset khi mở lại",
    "category": "negative",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Đang ở /v2/immunization",
    "steps": [
     "Mở modal Ghi nhận tiêm",
     "Nhập một phần dữ liệu (họ tên, vắc-xin, số lô)",
     "Bấm Hủy",
     "Mở lại modal Ghi nhận tiêm"
    ],
    "expected": "Modal đóng không tạo record; mở lại tất cả field đã reset (họ tên rỗng, doseNumber=1, totalDoses=3, ngày tiêm=hôm nay, site/route trống) theo useEffect reset.",
    "evidence": [
     {
      "name": "TC-IMM-003__s01__form",
      "caption": "Đã nhập một phần dữ liệu",
      "uiState": "form"
     },
     {
      "name": "TC-IMM-003__s02__form",
      "caption": "Mở lại modal đã reset trắng",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#267"
    ],
    "notes": ""
   },
   {
    "id": "TC-IMM-004",
    "title": "Lọc theo status-tab (Đã lên lịch/Đã tiêm/Bỏ lỡ/Hoãn)",
    "category": "happy",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Có dữ liệu mũi tiêm ở nhiều trạng thái",
    "steps": [
     "Mở /v2/immunization",
     "Bấm tab 'Đã tiêm' → kiểm tra chỉ hiện status=1",
     "Bấm tab 'Bỏ lỡ' → chỉ status=2",
     "Bấm tab 'Hoãn' → chỉ status=3",
     "Bấm tab 'Đã lên lịch' → chỉ status=0"
    ],
    "expected": "Mỗi tab lọc đúng theo statusKey (1=completed,2=missed,3=deferred,khác=scheduled); số dòng khớp KPI tương ứng.",
    "evidence": [
     {
      "name": "TC-IMM-004__s01__tab",
      "caption": "Tab Đã tiêm lọc đúng",
      "uiState": "tab"
     },
     {
      "name": "TC-IMM-004__s02__tab",
      "caption": "Tab Bỏ lỡ lọc đúng",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": ""
   },
   {
    "id": "TC-IMM-005",
    "title": "Tìm kiếm theo BN/vắc-xin/số lô",
    "category": "happy",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Có >=2 record khác vắc-xin/số lô",
    "steps": [
     "Gõ tên BN vào ô tìm kiếm → chỉ còn dòng khớp",
     "Xóa, gõ tên vắc-xin → lọc đúng",
     "Xóa, gõ số lô → lọc đúng",
     "Gõ chuỗi không tồn tại → empty-state"
    ],
    "expected": "searchOf khớp trên patientName+patientCode+vaccineName+vaccineCode+lotNumber; chuỗi vô nghĩa → bảng rỗng có empty-state.",
    "evidence": [
     {
      "name": "TC-IMM-005__s01__filter",
      "caption": "Lọc theo số lô",
      "uiState": "filter"
     },
     {
      "name": "TC-IMM-005__s02__empty",
      "caption": "Empty-state khi không khớp",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": ""
   },
   {
    "id": "TC-IMM-006",
    "title": "Drawer chi tiết mũi tiêm hiển thị đầy đủ section",
    "category": "ui",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Có ít nhất 1 record có AEFI và 1 record có ghi chú",
    "steps": [
     "Click 1 dòng có AEFI → kiểm tra drawer mở",
     "Xác nhận section BỆNH NHÂN, VẮC-XIN, THỜI GIAN hiển thị đúng dữ liệu cột",
     "Xác nhận section AEFI hiện màu cảnh báo đỏ",
     "Đóng drawer, click dòng KHÔNG có AEFI/ghi chú",
     "Xác nhận section AEFI và GHI CHÚ KHÔNG render"
    ],
    "expected": "Drawer hiển thị đúng các trường; section AEFI/GHI CHÚ chỉ render khi có dữ liệu (conditional).",
    "evidence": [
     {
      "name": "TC-IMM-006__s01__drawer",
      "caption": "Drawer record có AEFI",
      "uiState": "drawer"
     },
     {
      "name": "TC-IMM-006__s02__drawer",
      "caption": "Drawer record không AEFI/ghi chú",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": ""
   },
   {
    "id": "TC-IMM-007",
    "title": "KPI tính đúng (Tổng/Hôm nay/Đã tiêm/Bỏ lỡ/Quá hạn/AEFI)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Quản lý tiêm chủng",
    "preconditions": "Biết trước số record từng nhóm",
    "steps": [
     "Mở /v2/immunization",
     "Đếm thủ công số record completed, missed, có vaccinationDate=hôm nay, có nextDueDate quá khứ, có adverseEvent",
     "So với 6 KPI trên KpiStrip"
    ],
    "expected": "Tổng mũi=rows.length; Hôm nay=record vaccinationDate isSame hôm nay; Đã tiêm=status1; Bỏ lỡ=status2; Quá hạn mũi sau=nextDueDate<hôm nay; AEFI=có adverseEvent. KPI AEFI tô đỏ khi >0.",
    "evidence": [
     {
      "name": "TC-IMM-007__s01__list",
      "caption": "KpiStrip với số liệu đối chiếu",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": ""
   },
   {
    "id": "TC-IMM-008",
    "title": "Edge: liều thứ > tổng liều và giá trị biên InputNumber",
    "category": "edge",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Modal Ghi nhận tiêm mở",
    "steps": [
     "Đặt Liều thứ=5, Tổng liều=3 (liều>tổng)",
     "Thử nhập 0 và số âm vào Liều thứ → kiểm tra min=1 chặn về 1",
     "Thử nhập số rất lớn (vd 99999)",
     "Bấm Lưu"
    ],
    "expected": "InputNumber min=1 ép giá trị <1 về 1 (onChange Number(v)||1). Hệ thống NÊN cảnh báo khi liều thứ > tổng liều — nếu không có cảnh báo, ghi gap (hiện code cho phép lưu 5/3).",
    "evidence": [
     {
      "name": "TC-IMM-008__s01__form",
      "caption": "Liều 5/3 trước khi lưu",
      "uiState": "form"
     },
     {
      "name": "TC-IMM-008__s02__validation",
      "caption": "Hành vi với giá trị biên",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#267"
    ],
    "notes": "Gap tiềm năng: thiếu rule doseNumber<=totalDoses."
   },
   {
    "id": "TC-IMM-009",
    "title": "Edge: ngày tiêm tương lai & ngày tiêm tiếp < ngày tiêm",
    "category": "edge",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Modal Ghi nhận tiêm mở",
    "steps": [
     "Đặt Ngày tiêm = ngày tương lai (vd +30 ngày)",
     "Đặt Ngày tiêm tiếp < Ngày tiêm",
     "Bấm Lưu và quan sát",
     "Tạo 1 record với Ngày tiêm = quá khứ rất xa (vd 1990)"
    ],
    "expected": "Hệ thống NÊN chặn ngày tiêm tương lai và ngày-tiếp sớm hơn ngày-tiêm; hiện code KHÔNG có guard → ghi gap. Ghi nhận hành vi thực tế (lưu được hay bị BE từ chối).",
    "evidence": [
     {
      "name": "TC-IMM-009__s01__form",
      "caption": "Ngày tiêm tương lai + ngày tiếp ngược",
      "uiState": "form"
     },
     {
      "name": "TC-IMM-009__s02__validation",
      "caption": "Kết quả khi lưu",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#267"
    ],
    "notes": "Gap: thiếu validate quan hệ ngày + chặn tương lai."
   },
   {
    "id": "TC-IMM-010",
    "title": "Edge: chuỗi dài, ký tự đặc biệt, dấu tiếng Việt ở field text",
    "category": "edge",
    "priority": "P2",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Modal Ghi nhận tiêm mở",
    "steps": [
     "Nhập họ tên có dấu tiếng Việt đầy đủ (vd Nguyễn Thị Hoà Bình)",
     "Nhập tên vắc-xin chứa ký tự đặc biệt và dài >255 ký tự",
     "Nhập số lô có khoảng trắng đầu/cuối",
     "Bấm Lưu, mở lại drawer xem hiển thị"
    ],
    "expected": "Lưu và hiển thị đúng tiếng Việt có dấu; trim hoạt động (code .trim()); chuỗi quá dài không vỡ layout list/drawer (cell-2l). Nếu BE giới hạn độ dài thì báo lỗi rõ.",
    "evidence": [
     {
      "name": "TC-IMM-010__s01__form",
      "caption": "Field có dấu + chuỗi dài",
      "uiState": "form"
     },
     {
      "name": "TC-IMM-010__s02__drawer",
      "caption": "Hiển thị trong drawer không vỡ",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#267"
    ],
    "notes": ""
   },
   {
    "id": "TC-IMM-011",
    "title": "Empty-state khi không có dữ liệu tiêm chủng",
    "category": "ui",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "DB không có record tiêm chủng (hoặc API trả [])",
    "steps": [
     "Mở /v2/immunization khi list rỗng",
     "Quan sát bảng và KPI"
    ],
    "expected": "Bảng hiển thị empty-state của SimpleV2Page; KPI tất cả =0; không lỗi console.",
    "evidence": [
     {
      "name": "TC-IMM-011__s01__empty",
      "caption": "List rỗng empty-state",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": ""
   },
   {
    "id": "TC-IMM-012",
    "title": "Loading & error state khi tải list",
    "category": "ui",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Có thể throttle mạng / mô phỏng API 500",
    "steps": [
     "Throttle network, mở /v2/immunization → quan sát loading",
     "Mô phỏng /immunization trả lỗi → searchVaccinations catch trả [] và console.warn",
     "Quan sát UI khi lỗi"
    ],
    "expected": "Loading hiển thị skeleton/spinner; khi API lỗi list về rỗng (graceful, không crash), chỉ console.warn 'Failed to fetch vaccinations'. Đánh giá: lỗi bị nuốt thành empty — có thể gây hiểu nhầm 'không có dữ liệu' → ghi gap.",
    "evidence": [
     {
      "name": "TC-IMM-012__s01__loading",
      "caption": "Loading khi tải",
      "uiState": "loading"
     },
     {
      "name": "TC-IMM-012__s02__error",
      "caption": "UI khi API lỗi (rỗng + warn)",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": "Gap: error bị fallback thành empty, không phân biệt với 'không có dữ liệu'."
   },
   {
    "id": "TC-IMM-013",
    "title": "Dark/Light parity màn tiêm chủng",
    "category": "ui",
    "priority": "P2",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Có dữ liệu, đang ở /v2/immunization",
    "steps": [
     "Bật chế độ light, quan sát list/drawer/modal",
     "Toggle dark ở topbar v2",
     "So sánh độ tương phản KPI, StatusBadge, chip AEFI đỏ, var(--s-crit)"
    ],
    "expected": "Hai chế độ đều đọc được, badge/chip/KPI giữ tương phản đủ; không có text trùng nền; modal/drawer dùng đúng token theme.",
    "evidence": [
     {
      "name": "TC-IMM-013__s01__list",
      "caption": "List chế độ light",
      "uiState": "list"
     },
     {
      "name": "TC-IMM-013__s02__list",
      "caption": "List chế độ dark",
      "uiState": "list"
     },
     {
      "name": "TC-IMM-013__s03__modal",
      "caption": "Modal trong dark",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": ""
   },
   {
    "id": "TC-IMM-014",
    "title": "Format ngày DD/MM/YYYY và dấu '—' khi rỗng",
    "category": "ui",
    "priority": "P2",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Có record không có nextDueDate",
    "steps": [
     "Xem cột Ngày tiêm/Mũi tiếp trong list",
     "Xem record không có mũi tiếp → cột hiện '—'",
     "Mở drawer kiểm tra fmtDMY"
    ],
    "expected": "Ngày hiển thị DD/MM/YYYY; field rỗng hiển thị '—'; số lô rỗng '—'; AEFI rỗng '—'.",
    "evidence": [
     {
      "name": "TC-IMM-014__s01__list",
      "caption": "Cột ngày format DD/MM/YYYY và dấu —",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": ""
   },
   {
    "id": "TC-IMM-015",
    "title": "Chiến dịch tiêm (Campaign) hiện là STUB - empty không crash",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Quản lý tiêm chủng",
    "preconditions": "Đang ở phần Chiến dịch (nếu có tab)",
    "steps": [
     "Mở phần Chiến dịch",
     "Quan sát searchCampaigns trả [] → empty-state",
     "Thử thao tác tạo chiến dịch (nếu nút tồn tại) → createCampaign throw 'Campaign API is not supported'",
     "Xem getCampaignStats: totalCampaigns/activeCampaigns=0, totalVaccinated từ statistics"
    ],
    "expected": "Phần Campaign không crash; danh sách rỗng; nếu có nút tạo phải báo lỗi rõ ràng (không lỗi trắng trang). Đây là vùng chưa hoàn thiện BE → ghi gap rõ.",
    "evidence": [
     {
      "name": "TC-IMM-015__s01__empty",
      "caption": "Danh sách chiến dịch rỗng (stub)",
      "uiState": "empty"
     },
     {
      "name": "TC-IMM-015__s02__error",
      "caption": "Lỗi khi cố tạo chiến dịch",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#267",
     "#268"
    ],
    "notes": "Gap nghiêm trọng: VaccinationCampaigns chưa có backend (FE stub)."
   },
   {
    "id": "TC-IMM-016",
    "title": "AEFI - liệt kê & phân loại mức độ nghiêm trọng",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ giám sát AEFI",
    "preconditions": "Có record có aefiReport với aefiSeverity khác nhau",
    "steps": [
     "Mở danh sách AEFI (getAefiReports)",
     "Kiểm tra chỉ record có aefiReport được liệt kê",
     "Kiểm tra severity map đúng (1 nhẹ → 4 nghiêm trọng)",
     "Kiểm tra outcome: status=1 → 'Da xu tri', khác → 'Dang theo doi'",
     "Kiểm tra reactionDate hiện bằng vaccinationDate (giới hạn dữ liệu)"
    ],
    "expected": "Danh sách AEFI lọc đúng (chỉ có aefiReport); mức độ & trạng thái map đúng. Ghi nhận giới hạn: reactionDate đang =vaccinationDate (không phải ngày phản ứng thực) → gap dữ liệu.",
    "evidence": [
     {
      "name": "TC-IMM-016__s01__list",
      "caption": "Danh sách AEFI với mức độ",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": "Gap: reactionDate không tách khỏi vaccinationDate; reportedBy fallback N/A."
   },
   {
    "id": "TC-IMM-017",
    "title": "Lịch tiêm theo bệnh nhân (schedule) gom theo vắc-xin",
    "category": "happy",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Có patientId có nhiều mũi nhiều vắc-xin",
    "steps": [
     "Gọi getVaccinationSchedule(patientId) qua UI lịch tiêm",
     "Kiểm tra các mũi gom theo vaccineName",
     "Kiểm tra mỗi mũi hiện doseNumber, scheduledDate, completedDate, trạng thái",
     "Với patientId không có lịch → trả []"
    ],
    "expected": "Lịch tiêm nhóm đúng theo vắc-xin; mũi có scheduled/actual date đúng; không có lịch → empty (catch trả [], console.warn).",
    "evidence": [
     {
      "name": "TC-IMM-017__s01__list",
      "caption": "Lịch tiêm gom theo vắc-xin",
      "uiState": "list"
     },
     {
      "name": "TC-IMM-017__s02__empty",
      "caption": "BN không có lịch tiêm",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": ""
   },
   {
    "id": "TC-IMM-018",
    "title": "State: chuyển trạng thái mũi tiêm hợp lệ vs chặn không hợp lệ",
    "category": "state",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Có record ở trạng thái scheduled/completed",
    "steps": [
     "Với record scheduled → thực hiện ghi nhận tiêm → chuyển completed",
     "Thử thao tác chuyển từ completed về scheduled (nếu UI cho) → kỳ vọng bị chặn",
     "Thử đánh dấu missed/deferred theo nghiệp vụ"
    ],
    "expected": "Chuyển scheduled→completed hợp lệ; KHÔNG cho lùi completed→scheduled hoặc sửa record đã hoàn tất (an toàn dữ liệu). Nếu UI hiện chưa quản lý state-transition → ghi gap.",
    "evidence": [
     {
      "name": "TC-IMM-018__s01__confirm",
      "caption": "Xác nhận chuyển trạng thái hợp lệ",
      "uiState": "confirm"
     },
     {
      "name": "TC-IMM-018__s02__error",
      "caption": "Chặn chuyển trạng thái không hợp lệ",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#267",
     "#268"
    ],
    "notes": "Gap: chưa rõ cơ chế state-machine cho mũi tiêm trong UI v2."
   },
   {
    "id": "TC-IMM-019",
    "title": "Permission: vai trò không đủ quyền bị chặn ghi nhận tiêm",
    "category": "permission",
    "priority": "P0",
    "role": "Người dùng vai trò xem (read-only)",
    "preconditions": "Có user role không có quyền ghi tiêm chủng (theo matrix #216)",
    "steps": [
     "Đăng nhập bằng user read-only",
     "Mở /v2/immunization",
     "Kiểm tra nút 'Ghi nhận tiêm' bị ẩn/disabled",
     "Gọi trực tiếp POST /immunization/administer bằng token role đó"
    ],
    "expected": "Menu/nút bị chặn theo phân quyền; API trả 401/403 cho role không đủ quyền (không chỉ ẩn FE). Nếu BE không kiểm quyền → lỗ hổng, ghi gap.",
    "evidence": [
     {
      "name": "TC-IMM-019__s01__permission",
      "caption": "Nút Ghi nhận tiêm bị ẩn/disabled",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ],
    "notes": "Tham chiếu matrix phân quyền #216."
   },
   {
    "id": "TC-IMM-020",
    "title": "Permission: chặn truy cập route khi chưa đăng nhập",
    "category": "permission",
    "priority": "P1",
    "role": "Khách (chưa đăng nhập)",
    "preconditions": "localStorage không có token",
    "steps": [
     "Xóa token/user khỏi localStorage",
     "Truy cập trực tiếp /v2/immunization",
     "Quan sát redirect"
    ],
    "expected": "ProtectedRoute chuyển hướng về trang đăng nhập; không hiển thị dữ liệu tiêm chủng.",
    "evidence": [
     {
      "name": "TC-IMM-020__s01__permission",
      "caption": "Redirect về login khi chưa auth",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ],
    "notes": ""
   },
   {
    "id": "TC-IMM-021",
    "title": "Security: IDOR xem mũi tiêm của bệnh nhân khác",
    "category": "security",
    "priority": "P0",
    "role": "Người dùng có giới hạn phạm vi BN",
    "preconditions": "Biết id record/patientId thuộc BN khác",
    "steps": [
     "Đăng nhập user có giới hạn",
     "Gọi GET /immunization/patient/{otherPatientId}/schedule",
     "Thử lọc/xem record của patientId không thuộc phạm vi"
    ],
    "expected": "BE phải kiểm tra quyền truy cập theo BN; không cho lấy lịch/record của BN ngoài phạm vi. Nếu trả về dữ liệu → lỗ hổng IDOR, tạo task fix.",
    "evidence": [
     {
      "name": "TC-IMM-021__s01__error",
      "caption": "Bị chặn khi truy cập BN khác",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216"
    ],
    "notes": "getVaccinationById hiện load toàn bộ rồi find ở FE — cần kiểm IDOR ở BE."
   },
   {
    "id": "TC-IMM-022",
    "title": "Security: XSS ở field Ghi chú / AEFI",
    "category": "security",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Modal Ghi nhận tiêm mở",
    "steps": [
     "Nhập vào Ghi chú payload <script>alert(1)</script> và <img src=x onerror=alert(1)>",
     "Lưu record",
     "Mở drawer xem section GHI CHÚ (render whiteSpace pre-wrap)",
     "Kiểm tra AEFI tương tự"
    ],
    "expected": "Payload hiển thị dưới dạng văn bản thuần (React tự escape), KHÔNG thực thi script. Xác nhận không có dangerouslySetInnerHTML.",
    "evidence": [
     {
      "name": "TC-IMM-022__s01__drawer",
      "caption": "Ghi chú chứa payload hiển thị an toàn",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#216"
    ],
    "notes": ""
   },
   {
    "id": "TC-IMM-023",
    "title": "Data-consistency: ghi tiêm → KPI & danh sách cập nhật → audit log",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Quản lý tiêm chủng",
    "preconditions": "Đã đăng nhập, biết số liệu trước",
    "steps": [
     "Ghi 1 mũi mới qua modal",
     "Quan sát list reload (reloadVer++) và KPI Tổng mũi +1",
     "Lọc tab tương ứng trạng thái mới",
     "Kiểm tra audit log BE có ghi mutation (CreatedBy là user thật ≠ Guid.Empty)"
    ],
    "expected": "Sau ghi nhận: list +1 dòng, KPI tăng đúng; audit log lưu hành động ghi tiêm với user thật và timestamp.",
    "evidence": [
     {
      "name": "TC-IMM-023__s01__success",
      "caption": "Ghi nhận thành công",
      "uiState": "success"
     },
     {
      "name": "TC-IMM-023__s02__list",
      "caption": "List & KPI cập nhật",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#267",
     "#268"
    ],
    "notes": "Theo NOTES org/system: mọi mutation phải audit + CreatedBy thật."
   },
   {
    "id": "TC-IMM-024",
    "title": "Negative: gửi ghi nhận khi BE lỗi/timeout",
    "category": "negative",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Mô phỏng /immunization/administer trả 500/timeout",
    "steps": [
     "Điền đủ field hợp lệ",
     "Mô phỏng API lỗi",
     "Bấm Lưu"
    ],
    "expected": "Hiện toast 'Ghi nhận tiêm chủng thất bại' (message.error), busy reset về false, modal KHÔNG đóng để user thử lại, không tạo record trùng.",
    "evidence": [
     {
      "name": "TC-IMM-024__s01__error",
      "caption": "Toast lỗi khi BE thất bại",
      "uiState": "error"
     },
     {
      "name": "TC-IMM-024__s02__toast",
      "caption": "Nút Lưu bật lại sau lỗi",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#267"
    ],
    "notes": ""
   },
   {
    "id": "TC-IMM-025",
    "title": "Negative: double-submit nút Lưu khi đang xử lý",
    "category": "negative",
    "priority": "P2",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Modal mở, mạng chậm",
    "steps": [
     "Điền đủ field",
     "Bấm Lưu nhiều lần liên tiếp khi đang lưu"
    ],
    "expected": "Nút Lưu disabled khi busy=true (disabled={busy}); chỉ tạo 1 record, không tạo trùng.",
    "evidence": [
     {
      "name": "TC-IMM-025__s01__form",
      "caption": "Nút Lưu disabled khi đang lưu",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#267"
    ],
    "notes": ""
   }
  ],
  "ui_state_checklist": [
   "list (danh sách hồ sơ tiêm chủng)",
   "loading (đang tải list)",
   "empty (list rỗng / không khớp tìm kiếm / lịch rỗng / campaign stub)",
   "error (API lỗi, BE 500, IDOR bị chặn, tạo campaign thất bại)",
   "drawer (chi tiết mũi tiêm có/không AEFI/ghi chú)",
   "modal/form (Ghi nhận tiêm + reset + nút Lưu disabled)",
   "validation (cảnh báo field bắt buộc + giá trị biên)",
   "tab (status-tab scheduled/completed/missed/deferred)",
   "filter (tìm kiếm BN/vắc-xin/số lô)",
   "success/toast (ghi nhận thành công)",
   "confirm (chuyển trạng thái hợp lệ)",
   "permission (ẩn/disable nút, redirect login)",
   "dark + light parity (list/drawer/modal)"
  ],
  "gaps": [
   "Chiến dịch tiêm (VaccinationCampaigns) phía FE là STUB hoàn toàn: searchCampaigns trả [], createCampaign throw 'not supported' — backend chưa có; cần test xác nhận empty/không crash và mở task xây dựng đầy đủ.",
   "Lô vaccine (ImmunizationBatches) trong data.js là bảng chính nhưng KHÔNG có màn quản lý lô riêng ở FE v2 (số lô chỉ là free-text trong modal) — thiếu kiểm tra tồn lô, hạn dùng, cảnh báo lô hết hạn (patient-safety).",
   "Thiếu validate quan hệ field: doseNumber có thể > totalDoses (code cho phép 5/3); thiếu chặn ngày tiêm tương lai và nextDueDate < vaccinationDate.",
   "Lỗi API bị nuốt thành empty (searchVaccinations/getAefiReports/getVaccinationSchedule catch trả []) — không phân biệt 'lỗi' với 'không có dữ liệu', dễ che giấu sự cố.",
   "AEFI suy ra từ field aefiReport của record, reactionDate đang =vaccinationDate và reportedBy fallback 'N/A' — không phản ánh ngày phản ứng/người báo cáo thực; thiếu luồng báo cáo AEFI độc lập (theo dõi → xử trí → đóng).",
   "Chưa rõ state-machine cho trạng thái mũi tiêm (scheduled→completed/missed/deferred) trong UI v2 — chưa thấy thao tác chuyển trạng thái/sửa, cần xác nhận chặn lùi trạng thái.",
   "Chưa kiểm tra sàng lọc trước tiêm (chống chỉ định/dị ứng vaccine) — luồng nghiệp vụ data.js có bước 'Sàng lọc' nhưng modal ghi nhận không có trường sàng lọc/chống chỉ định (patient-safety gap).",
   "getVaccinationById tải toàn bộ rồi find ở FE — cần kiểm IDOR ở backend cho schedule theo patientId.",
   "Thiếu liên kết tới hồ sơ bệnh nhân thực: modal nhập patientName/patientCode free-text, không chọn từ danh sách BN → nguy cơ trùng/sai BN, dữ liệu không nhất quán với Patients.",
   "Thiếu test phân quyền theo matrix #216 ở mức API (BE có thực sự chặn role không đủ quyền hay chỉ ẩn FE)."
  ]
 },
 {
  "id": "pubhealth",
  "code": "PBH",
  "layer": "spec",
  "ic": "🌍",
  "nm": "Bệnh mãn tính & Y tế cộng đồng",
  "gh": [
   "#267",
   "#268",
   "#269"
  ],
  "gap": false,
  "module_id": "pubhealth",
  "summary": "Phân hệ \"Bệnh mãn tính & Y tế cộng đồng\" (PBH, lớp spec) quản lý theo CHƯƠNG TRÌNH: HIV/ARV (HivPatients, HivLabResults, PmtctRecords), Lao-HIV (TbHivRecords/FollowUps), Methadone (MethadonePatients, MethadoneDosingRecords, MethadoneUrineTests), bệnh mạn tính KLN (ChronicDiseaseRecords/FollowUps, NcdScreenings), dịch tễ - truy vết (DiseaseCases ⟶ ContactTraces, OutbreakEvents, DiseaseReports), y tế cộng đồng (HouseholdHealthRecords, CommunityHealthTeams, PopulationRecords, HealthCampaigns, HealthEducationMaterials) và sức khỏe tâm thần (MentalHealthCases, PsychiatricAssessments). Các màn chính đã có ở FE v2 dưới /v2/*: hiv-management, tb-hiv, methadone-treatment, chronic-disease, community-health, epidemiology, mental-health, population-health - đều dạng KpiStrip + StatusTabs + DataTable + Drawer/Modal theo design pack _v2kit. Đặc thù patient-safety/bảo mật: dữ liệu HIV/tâm thần/Methadone nhạy cảm (chống IDOR/lộ thông tin), cấp liều Methadone phải kiểm tra liều hợp lệ + audit, truy vết tiếp xúc liên kết ca bệnh.",
  "screens": [
   {
    "name": "Quản lý HIV/ARV",
    "desc": "Danh sách BN HIV theo phác đồ ART, giai đoạn WHO, CD4/Viral Load, đồng nhiễm; tab trạng thái Đang điều trị/Đã chuyển/Mất dấu/Tử vong; drawer chi tiết + cập nhật ART, ghi XN CD4/VL.",
    "route_guess": "/v2/hiv-management",
    "elements": [
     "KpiStrip (tổng BN, đang ĐT, mất dấu, tử vong)",
     "StatusTabs(active/transferred/lost/deceased)",
     "SearchBox",
     "DataTable cột Mã HIV/BN/ART/WHO/CD4/VL/Đồng nhiễm/BS/Hẹn tiếp/TT",
     "DrawerShell chi tiết",
     "Modal cập nhật ART / ghi XN"
    ]
   },
   {
    "name": "Lao/HIV (TbHiv)",
    "desc": "Hồ sơ đồng nhiễm Lao-HIV, theo dõi phác đồ chống lao + ARV, lịch theo dõi (TbHivFollowUps).",
    "route_guess": "/v2/tb-hiv",
    "elements": [
     "KpiStrip",
     "StatusTabs",
     "DataTable hồ sơ Lao/HIV",
     "Drawer chi tiết",
     "Modal ghi theo dõi"
    ]
   },
   {
    "name": "Điều trị Methadone",
    "desc": "Quản lý BN Methadone theo pha (Khởi liều/Ổn định/Duy trì/Giảm liều), cấp liều hằng ngày (có giám sát/mang về), XN nước tiểu (Morphine/Amphetamine/THC), lịch sử cấp liều, theo dõi bỏ liều.",
    "route_guess": "/v2/methadone-treatment",
    "elements": [
     "KpiStrip (tổng/đang ĐT/có bỏ liều/TB liều)",
     "StatusTabs(active/suspended/discharged/transferred)",
     "Filter pha",
     "DataTable cột BN/Đăng ký/Pha/Liều/PP/Liều cuối/Bỏ liều/TT",
     "ModalShell Cấp liều (input liều mg, select hình thức)",
     "ModalShell XN nước tiểu",
     "DrawerShell chi tiết",
     "DrawerShell lịch sử cấp liều",
     "CrudModal sửa điều trị"
    ]
   },
   {
    "name": "Bệnh mạn tính (NCD)",
    "desc": "Hồ sơ bệnh mạn tính (ICD, ngày chẩn đoán, chu kỳ tái khám), theo dõi định kỳ (ChronicDiseaseFollowUps), sàng lọc NCD.",
    "route_guess": "/v2/chronic-disease",
    "elements": [
     "KpiStrip",
     "StatusTabs(active/followup/closed/removed)",
     "SearchBox",
     "DataTable cột BN/ICD-Bệnh/Ngày CĐ/BS/Chu kỳ/Tái khám tiếp/TT",
     "DrawerShell chi tiết",
     "Modal ghi theo dõi"
    ]
   },
   {
    "name": "Y tế cộng đồng - Hộ gia đình",
    "desc": "Quản lý hồ sơ sức khỏe hộ gia đình, thành viên, mức rủi ro, đối tượng ưu tiên, đội YTCC phụ trách, lịch thăm hộ.",
    "route_guess": "/v2/community-health",
    "elements": [
     "KpiStrip",
     "StatusTabs(active/inactive/moved)",
     "DataTable cột Mã hộ/Chủ hộ-Địa chỉ/Thành viên/Mức rủi ro/Đối tượng/Đội/Thăm gần nhất/Thăm tiếp/TT",
     "DrawerShell chi tiết hộ",
     "Modal thăm hộ"
    ]
   },
   {
    "name": "Dịch tễ - Ca bệnh & Truy vết",
    "desc": "Quản lý ca bệnh truyền nhiễm (DiseaseCases), truy vết tiếp xúc (ContactTraces), sự kiện ổ dịch (OutbreakEvents), báo cáo bệnh (DiseaseReports).",
    "route_guess": "/v2/epidemiology",
    "elements": [
     "KpiStrip",
     "StatusTabs",
     "DataTable ca bệnh",
     "Drawer chi tiết ca + danh sách tiếp xúc",
     "Modal khai báo ca / thêm tiếp xúc",
     "Modal tạo báo cáo bệnh"
    ]
   },
   {
    "name": "Sức khỏe tâm thần",
    "desc": "Quản lý ca tâm thần (mã ca, loại bệnh, chẩn đoán, mức độ, mức tuân thủ), đánh giá tâm thần (PsychiatricAssessments), lịch theo dõi.",
    "route_guess": "/v2/mental-health",
    "elements": [
     "KpiStrip",
     "StatusTabs(active/stable/remission/discharged)",
     "DataTable cột Mã ca/BN/Loại bệnh/Chẩn đoán/Mức độ/Tuân thủ/BS/Hẹn tiếp/TT",
     "DrawerShell chi tiết",
     "Modal đánh giá tâm thần"
    ]
   },
   {
    "name": "Hồ sơ dân số / Quản lý dân số",
    "desc": "PopulationRecords - hồ sơ dân số phục vụ YTCC, chiến dịch sức khỏe (HealthCampaigns), tài liệu truyền thông (HealthEducationMaterials).",
    "route_guess": "/v2/population-health",
    "elements": [
     "KpiStrip",
     "StatusTabs",
     "DataTable hồ sơ dân số",
     "Drawer chi tiết",
     "Modal chiến dịch / tài liệu truyền thông"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-PBH-001",
    "title": "Methadone - Cấp liều hằng ngày cho BN đang điều trị (luồng chính)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ chương trình Methadone",
    "preconditions": "Đăng nhập admin/Admin@123; có ít nhất 1 BN Methadone status=Đang điều trị; ở /v2/methadone-treatment.",
    "steps": [
     "Mở tab 'Đang điều trị', chọn 1 BN",
     "Bấm nút Cấp liều (icon check) trên dòng BN",
     "Nhập liều hợp lệ (vd 60 mg), chọn hình thức 'Uống có giám sát'",
     "Bấm 'Xác nhận cấp liều'",
     "Mở Drawer lịch sử cấp liều của BN đó"
    ],
    "expected": "Toast 'Đã cấp liều 60 mg cho <tên BN>'; danh sách reload; cột 'Liều cuối' cập nhật thời gian vừa cấp; bản ghi mới xuất hiện trong Drawer lịch sử (ngày/liều/hình thức/người cấp).",
    "evidence": [
     {
      "name": "TC-PBH-001__s01__list",
      "caption": "Danh sách BN Methadone tab Đang điều trị",
      "uiState": "list"
     },
     {
      "name": "TC-PBH-001__s02__modal",
      "caption": "Modal Cấp liều với liều 60mg",
      "uiState": "modal"
     },
     {
      "name": "TC-PBH-001__s03__success",
      "caption": "Toast cấp liều thành công",
      "uiState": "success"
     },
     {
      "name": "TC-PBH-001__s04__drawer",
      "caption": "Drawer lịch sử cấp liều có bản ghi mới",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#267",
     "#268"
    ],
    "notes": "Bám rel data.js: MethadonePatients ⟶ MethadoneDosingRecords."
   },
   {
    "id": "TC-PBH-002",
    "title": "Methadone - Chặn cấp liều với giá trị không hợp lệ (0, âm, rỗng)",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ Methadone",
    "preconditions": "Ở Modal Cấp liều của 1 BN đang điều trị.",
    "steps": [
     "Mở Modal Cấp liều",
     "Xoá trống ô liều, bấm Xác nhận",
     "Nhập 0, bấm Xác nhận",
     "Nhập -5, bấm Xác nhận"
    ],
    "expected": "Mỗi trường hợp hiện message.error 'Vui lòng nhập liều hợp lệ'; KHÔNG gọi API recordDose; Modal vẫn mở; không tạo bản ghi cấp liều.",
    "evidence": [
     {
      "name": "TC-PBH-002__s01__validation",
      "caption": "Lỗi liều rỗng/0/âm",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#267"
    ],
    "notes": "submitDose chặn amt<=0 ở FE - cần verify BE cũng chặn."
   },
   {
    "id": "TC-PBH-003",
    "title": "Methadone - Biên giá trị liều (rất lớn, thập phân, bước 0.5)",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ Methadone",
    "preconditions": "Modal Cấp liều mở; input min=1 step=0.5.",
    "steps": [
     "Nhập 0.5 -> Xác nhận",
     "Nhập 999999 -> Xác nhận",
     "Nhập 60.25 (lệch step) -> Xác nhận",
     "Quan sát hành vi"
    ],
    "expected": "Giá trị quá lớn/lệch ngưỡng lâm sàng phải bị cảnh báo hoặc chặn (liều Methadone an toàn thường ≤ ~200mg). Ghi rõ hành vi thực tế; nếu hệ thống chấp nhận 999999mg không cảnh báo -> tạo bug fix-task (patient-safety).",
    "evidence": [
     {
      "name": "TC-PBH-003__s01__modal",
      "caption": "Nhập liều biên 999999mg",
      "uiState": "modal"
     },
     {
      "name": "TC-PBH-003__s02__validation",
      "caption": "Cảnh báo/chặn liều ngoài ngưỡng (nếu có)",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#267"
    ],
    "notes": "Ngưỡng an toàn liều Methadone là kiểm tra patient-safety; nếu thiếu -> gap."
   },
   {
    "id": "TC-PBH-004",
    "title": "Methadone - Chỉ BN status=Đang điều trị mới hiện nút Cấp liều (state guard)",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ Methadone",
    "preconditions": "Có BN ở các trạng thái Đang điều trị / Tạm dừng / Ra điều trị / Chuyển.",
    "steps": [
     "Mở tab 'Tạm dừng', kiểm tra hàng action của BN",
     "Mở tab 'Ra điều trị' và 'Chuyển', kiểm tra action",
     "Mở tab 'Đang điều trị', kiểm tra action"
    ],
    "expected": "Nút Cấp liều (ic=check) CHỈ hiển thị khi status===0 (Đang điều trị); các trạng thái khác KHÔNG có nút Cấp liều; vẫn có Chi tiết/XN nước tiểu/Sửa.",
    "evidence": [
     {
      "name": "TC-PBH-004__s01__tab",
      "caption": "Tab Tạm dừng - không có nút Cấp liều",
      "uiState": "tab"
     },
     {
      "name": "TC-PBH-004__s02__list",
      "caption": "Tab Đang điều trị - có nút Cấp liều",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#267"
    ],
    "notes": "Xác nhận guard r.status===0 ở actions()."
   },
   {
    "id": "TC-PBH-005",
    "title": "Methadone - Huỷ giữa chừng modal Cấp liều không tạo bản ghi",
    "category": "negative",
    "priority": "P1",
    "role": "Bác sĩ Methadone",
    "preconditions": "Modal Cấp liều mở, đã nhập liều.",
    "steps": [
     "Nhập liều 70mg",
     "Bấm 'Huỷ' (hoặc đóng modal)",
     "Mở lại Drawer lịch sử của BN"
    ],
    "expected": "Modal đóng, không gọi API; lịch sử không thêm bản ghi 70mg; cột Liều cuối không đổi.",
    "evidence": [
     {
      "name": "TC-PBH-005__s01__modal",
      "caption": "Modal trước khi Huỷ",
      "uiState": "modal"
     },
     {
      "name": "TC-PBH-005__s02__drawer",
      "caption": "Lịch sử không có bản ghi mới",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#267"
    ],
    "notes": ""
   },
   {
    "id": "TC-PBH-006",
    "title": "Methadone - Ghi XN nước tiểu (Morphine/Amphetamine/THC) và phản ánh ngày XN",
    "category": "happy",
    "priority": "P1",
    "role": "Điều dưỡng/Bác sĩ Methadone",
    "preconditions": "Có BN Methadone; ở /v2/methadone-treatment.",
    "steps": [
     "Chọn BN, bấm action 'XN nước tiểu'",
     "Đặt Morphine=Dương tính, Amphetamine=Âm tính, THC=Âm tính",
     "Bấm 'Ghi kết quả'",
     "Mở Drawer chi tiết BN xem 'XN nước tiểu cuối'"
    ],
    "expected": "Toast 'Đã ghi XN nước tiểu cho <BN>'; reload; Drawer chi tiết hiện ngày XN nước tiểu cuối = hôm nay; dữ liệu lưu MethadoneUrineTests.",
    "evidence": [
     {
      "name": "TC-PBH-006__s01__modal",
      "caption": "Modal XN nước tiểu các chỉ số",
      "uiState": "modal"
     },
     {
      "name": "TC-PBH-006__s02__success",
      "caption": "Toast ghi XN thành công",
      "uiState": "success"
     },
     {
      "name": "TC-PBH-006__s03__drawer",
      "caption": "Drawer chi tiết hiện ngày XN cuối",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": "data-consistency: ghi XN -> hiện ở chi tiết."
   },
   {
    "id": "TC-PBH-007",
    "title": "Methadone - Sửa điều trị (liều/pha/trạng thái) qua CrudModal và đổi tab",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Bác sĩ Methadone",
    "preconditions": "Có BN status=Đang điều trị.",
    "steps": [
     "Mở Drawer chi tiết, bấm 'Sửa điều trị'",
     "Đổi 'Trạng thái' từ Đang điều trị (0) sang Tạm ngưng (1), nhập số lần bỏ liều=3",
     "Lưu",
     "Quay lại danh sách, vào tab 'Tạm dừng'"
    ],
    "expected": "Toast 'Đã cập nhật điều trị'; BN chuyển sang tab Tạm dừng; KpiStrip 'Đang điều trị' giảm; cột Bỏ liều = 3 hiển thị đậm màu cảnh báo.",
    "evidence": [
     {
      "name": "TC-PBH-007__s01__modal",
      "caption": "CrudModal sửa trạng thái + bỏ liều",
      "uiState": "modal"
     },
     {
      "name": "TC-PBH-007__s02__tab",
      "caption": "BN xuất hiện ở tab Tạm dừng",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#267"
    ],
    "notes": "Verify Kpi đồng bộ sau update (counts useMemo)."
   },
   {
    "id": "TC-PBH-008",
    "title": "HIV - Lọc theo trạng thái và xem chi tiết phác đồ ART/CD4/VL (luồng chính)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ phòng khám HIV",
    "preconditions": "Đăng nhập; có BN HIV; ở /v2/hiv-management.",
    "steps": [
     "Chọn tab 'Đang điều trị'",
     "Tìm BN theo mã HIV",
     "Mở Drawer chi tiết",
     "Xem ART, WHO stage, CD4, Viral Load, đồng nhiễm"
    ],
    "expected": "Bảng lọc đúng trạng thái; Drawer hiển thị đủ phác đồ ART, giai đoạn WHO, CD4, VL, đồng nhiễm, hẹn tiếp; số liệu khớp cột bảng.",
    "evidence": [
     {
      "name": "TC-PBH-008__s01__list",
      "caption": "Danh sách HIV tab Đang điều trị",
      "uiState": "list"
     },
     {
      "name": "TC-PBH-008__s02__detail",
      "caption": "Drawer chi tiết ART/CD4/VL",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#268",
     "#269"
    ],
    "notes": "rel: HivPatients ⟶ HivLabResults."
   },
   {
    "id": "TC-PBH-009",
    "title": "HIV - Chuyển trạng thái hợp lệ và chặn chuyển không hợp lệ",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ HIV",
    "preconditions": "BN HIV ở các trạng thái active/transferred/lost/deceased.",
    "steps": [
     "Với BN 'Tử vong', thử thực hiện thao tác cập nhật ART/hẹn tái khám",
     "Với BN 'Đang điều trị', đánh dấu 'Mất dấu' rồi 'Đang điều trị' lại",
     "Quan sát hành vi từng chuyển"
    ],
    "expected": "Không cho cập nhật điều trị/hẹn khám trên BN Tử vong; chuyển active<->lost được phép; mọi chuyển trạng thái ghi audit log.",
    "evidence": [
     {
      "name": "TC-PBH-009__s01__detail",
      "caption": "BN Tử vong - thao tác bị chặn",
      "uiState": "detail"
     },
     {
      "name": "TC-PBH-009__s02__tab",
      "caption": "BN chuyển sang tab Mất dấu",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#269"
    ],
    "notes": "Nếu BE cho cập nhật BN Tử vong -> bug state."
   },
   {
    "id": "TC-PBH-010",
    "title": "HIV - Biên giá trị CD4/VL (0, âm, rất lớn) và hiển thị định dạng",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ HIV",
    "preconditions": "Form ghi XN HIV (CD4/VL).",
    "steps": [
     "Nhập CD4=0",
     "Nhập CD4=-10",
     "Nhập VL=10000000 (rất lớn)",
     "Lưu và xem hiển thị cột CD4/VL"
    ],
    "expected": "CD4 âm bị chặn; CD4=0 cảnh báo (suy giảm miễn dịch nặng); VL rất lớn hiển thị đúng định dạng số (không tràn/sai). Ghi rõ hành vi.",
    "evidence": [
     {
      "name": "TC-PBH-010__s01__validation",
      "caption": "Chặn CD4 âm",
      "uiState": "validation"
     },
     {
      "name": "TC-PBH-010__s02__list",
      "caption": "Hiển thị VL rất lớn ở bảng",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": "Boundary + ui format."
   },
   {
    "id": "TC-PBH-011",
    "title": "HIV - IDOR: chặn xem hồ sơ HIV của BN không thuộc quyền qua sửa ID API",
    "category": "security",
    "priority": "P0",
    "role": "Tester bảo mật",
    "preconditions": "Có token user vai trò hạn chế; biết id một BN HIV khác.",
    "steps": [
     "Đăng nhập user thường (không phải admin/không thuộc chương trình HIV)",
     "Gọi trực tiếp API GET hồ sơ HIV bằng id BN khác (hivManagement endpoint)",
     "Thử với id ngẫu nhiên/của BN khác cơ sở"
    ],
    "expected": "API trả 403/404, KHÔNG lộ dữ liệu HIV (cực nhạy cảm); FE không render hồ sơ; ghi audit truy cập trái phép.",
    "evidence": [
     {
      "name": "TC-PBH-011__s01__permission",
      "caption": "API trả 403 khi truy cập hồ sơ HIV khác quyền",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#269"
    ],
    "notes": "Dữ liệu HIV bảo mật cao - IDOR là rủi ro nghiêm trọng."
   },
   {
    "id": "TC-PBH-012",
    "title": "HIV - XSS ở field ghi chú/đồng nhiễm",
    "category": "security",
    "priority": "P1",
    "role": "Tester bảo mật",
    "preconditions": "Form ghi chú hồ sơ HIV cho phép nhập text.",
    "steps": [
     "Nhập vào ghi chú: <script>alert('x')</script> và <img src=x onerror=alert(1)>",
     "Lưu",
     "Mở lại Drawer chi tiết hiển thị ghi chú"
    ],
    "expected": "Chuỗi hiển thị dạng text thuần (escape), KHÔNG thực thi script; không có popup alert.",
    "evidence": [
     {
      "name": "TC-PBH-012__s01__detail",
      "caption": "Ghi chú chứa payload XSS hiển thị an toàn",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#269"
    ],
    "notes": ""
   },
   {
    "id": "TC-PBH-013",
    "title": "Bệnh mạn tính - Lọc tab + lịch tái khám đúng chu kỳ (luồng chính)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ quản lý bệnh mạn tính",
    "preconditions": "Có ChronicDiseaseRecords; ở /v2/chronic-disease.",
    "steps": [
     "Chọn tab 'Cần tái khám'",
     "Kiểm tra cột 'Chu kỳ' (followUpIntervalDays) và 'Tái khám tiếp'",
     "Mở Drawer chi tiết 1 hồ sơ"
    ],
    "expected": "Tab lọc đúng BN cần tái khám; 'Tái khám tiếp' = ngày CĐ/lần theo dõi + chu kỳ; Drawer hiển thị ICD, ngày chẩn đoán, BS, lịch theo dõi (ChronicDiseaseFollowUps).",
    "evidence": [
     {
      "name": "TC-PBH-013__s01__list",
      "caption": "Tab Cần tái khám",
      "uiState": "list"
     },
     {
      "name": "TC-PBH-013__s02__detail",
      "caption": "Drawer chi tiết hồ sơ mạn tính",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": "data-consistency: chu kỳ -> ngày tái khám tiếp."
   },
   {
    "id": "TC-PBH-014",
    "title": "Bệnh mạn tính - Validation field bắt buộc (ICD, ngày CĐ, chu kỳ) khi tạo/sửa hồ sơ",
    "category": "validation",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Form tạo/sửa hồ sơ bệnh mạn tính.",
    "steps": [
     "Để trống mã ICD, ngày chẩn đoán",
     "Nhập chu kỳ tái khám = 0 và = âm",
     "Bấm Lưu"
    ],
    "expected": "Hiện lỗi từng field bắt buộc; chu kỳ phải > 0; không lưu khi thiếu/không hợp lệ.",
    "evidence": [
     {
      "name": "TC-PBH-014__s01__validation",
      "caption": "Lỗi field bắt buộc ICD/ngày CĐ/chu kỳ",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": ""
   },
   {
    "id": "TC-PBH-015",
    "title": "Bệnh mạn tính - Ngày chẩn đoán tương lai / quá khứ rất xa (boundary ngày)",
    "category": "edge",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "Form hồ sơ mạn tính có trường ngày chẩn đoán.",
    "steps": [
     "Nhập ngày chẩn đoán = ngày mai (tương lai)",
     "Nhập ngày chẩn đoán = 01/01/1900",
     "Lưu và xem hiển thị + tính 'tái khám tiếp'"
    ],
    "expected": "Ngày tương lai bị chặn (chẩn đoán không thể ở tương lai); ngày quá khứ xa hiển thị đúng định dạng DD/MM/YYYY; tính tái khám tiếp không lỗi.",
    "evidence": [
     {
      "name": "TC-PBH-015__s01__validation",
      "caption": "Chặn ngày chẩn đoán tương lai",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": ""
   },
   {
    "id": "TC-PBH-016",
    "title": "Sức khỏe tâm thần - Xem ca theo trạng thái + đánh giá tâm thần (luồng chính)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ tâm thần",
    "preconditions": "Có MentalHealthCases; ở /v2/mental-health.",
    "steps": [
     "Chọn tab 'Đang điều trị'",
     "Mở Drawer 1 ca: xem loại bệnh, chẩn đoán, mức độ, mức tuân thủ",
     "Mở Modal đánh giá tâm thần (PsychiatricAssessments) và ghi 1 đánh giá"
    ],
    "expected": "Bảng lọc đúng; Drawer đủ thông tin; ghi đánh giá thành công, lịch sử đánh giá cập nhật; hẹn tiếp hiển thị.",
    "evidence": [
     {
      "name": "TC-PBH-016__s01__list",
      "caption": "Danh sách ca tâm thần tab Đang điều trị",
      "uiState": "list"
     },
     {
      "name": "TC-PBH-016__s02__detail",
      "caption": "Drawer chi tiết ca",
      "uiState": "detail"
     },
     {
      "name": "TC-PBH-016__s03__modal",
      "caption": "Modal đánh giá tâm thần",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#268",
     "#269"
    ],
    "notes": "rel: MentalHealthCases ⟶ PsychiatricAssessments."
   },
   {
    "id": "TC-PBH-017",
    "title": "Sức khỏe tâm thần - IDOR/quyền: dữ liệu tâm thần nhạy cảm",
    "category": "security",
    "priority": "P0",
    "role": "Tester bảo mật",
    "preconditions": "Token user hạn chế; id 1 ca tâm thần khác.",
    "steps": [
     "Gọi API chi tiết ca tâm thần bằng id của ca không thuộc quyền",
     "Thử brute-force id tăng dần"
    ],
    "expected": "403/404, không lộ chẩn đoán tâm thần; ghi audit; FE không hiển thị.",
    "evidence": [
     {
      "name": "TC-PBH-017__s01__permission",
      "caption": "API chặn truy cập ca tâm thần khác quyền",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#269"
    ],
    "notes": "Dữ liệu tâm thần nhạy cảm theo luật."
   },
   {
    "id": "TC-PBH-018",
    "title": "Y tế cộng đồng - Quản lý hộ gia đình + lịch thăm hộ (luồng chính)",
    "category": "happy",
    "priority": "P1",
    "role": "Nhân viên YTCC",
    "preconditions": "Có HouseholdHealthRecords; ở /v2/community-health.",
    "steps": [
     "Chọn tab 'Đang quản lý'",
     "Xem cột Mức rủi ro, Đối tượng (ưu tiên), Đội phụ trách, Thăm gần nhất/Thăm tiếp",
     "Mở Drawer chi tiết hộ và thành viên",
     "Ghi 1 lần thăm hộ"
    ],
    "expected": "Bảng đúng; Drawer hiển thị thành viên (memberCount), mức rủi ro, đội; ghi thăm hộ cập nhật 'Thăm gần nhất' = hôm nay.",
    "evidence": [
     {
      "name": "TC-PBH-018__s01__list",
      "caption": "Danh sách hộ gia đình",
      "uiState": "list"
     },
     {
      "name": "TC-PBH-018__s02__detail",
      "caption": "Drawer chi tiết hộ + thành viên",
      "uiState": "detail"
     },
     {
      "name": "TC-PBH-018__s03__success",
      "caption": "Ghi thăm hộ thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": "rel: HouseholdHealthRecords, CommunityHealthTeams."
   },
   {
    "id": "TC-PBH-019",
    "title": "Dịch tễ - Khai báo ca bệnh truyền nhiễm và truy vết tiếp xúc (luồng chính)",
    "category": "happy",
    "priority": "P0",
    "role": "Cán bộ dịch tễ (YTDP)",
    "preconditions": "Ở /v2/epidemiology; có quyền YTDP.",
    "steps": [
     "Bấm 'Khai báo ca bệnh', nhập bệnh + ngày khởi phát + BN",
     "Lưu ca",
     "Mở Drawer ca, bấm 'Thêm tiếp xúc' (ContactTraces), nhập 1 người tiếp xúc",
     "Lưu"
    ],
    "expected": "Ca bệnh tạo thành công xuất hiện danh sách; Drawer hiển thị danh sách tiếp xúc gồm người vừa thêm; liên kết DiseaseCases ⟶ ContactTraces đúng.",
    "evidence": [
     {
      "name": "TC-PBH-019__s01__modal",
      "caption": "Modal khai báo ca bệnh",
      "uiState": "modal"
     },
     {
      "name": "TC-PBH-019__s02__detail",
      "caption": "Drawer ca + danh sách tiếp xúc",
      "uiState": "detail"
     },
     {
      "name": "TC-PBH-019__s03__success",
      "caption": "Thêm tiếp xúc thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#268",
     "#269"
    ],
    "notes": "Core rel của phân hệ: truy vết."
   },
   {
    "id": "TC-PBH-020",
    "title": "Dịch tễ - Tạo báo cáo bệnh (DiseaseReports) và data-consistency với số ca",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Cán bộ dịch tễ",
    "preconditions": "Có DiseaseCases trong kỳ báo cáo.",
    "steps": [
     "Tạo thêm 2 ca bệnh cùng loại trong tuần",
     "Vào chức năng Báo cáo bệnh, chọn kỳ tuần hiện tại",
     "Tạo/xem báo cáo",
     "Đối chiếu số ca trong báo cáo với danh sách ca"
    ],
    "expected": "Số ca trong DiseaseReports khớp số ca thực trong kỳ (tạo A -> tính đúng ở B); không double-count; định dạng số đúng.",
    "evidence": [
     {
      "name": "TC-PBH-020__s01__list",
      "caption": "Danh sách ca bệnh trong kỳ",
      "uiState": "list"
     },
     {
      "name": "TC-PBH-020__s02__detail",
      "caption": "Báo cáo bệnh với số ca khớp",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": "data-consistency ca -> báo cáo."
   },
   {
    "id": "TC-PBH-021",
    "title": "Dịch tễ - Sự kiện ổ dịch (OutbreakEvents): gom nhiều ca thành ổ dịch",
    "category": "integration",
    "priority": "P1",
    "role": "Cán bộ dịch tễ",
    "preconditions": "Có ≥3 ca cùng bệnh cùng khu vực.",
    "steps": [
     "Tạo OutbreakEvent gắn các ca liên quan",
     "Mở chi tiết ổ dịch",
     "Kiểm tra số ca liên kết + truy vết"
    ],
    "expected": "Ổ dịch tạo thành công, liên kết đúng các ca; số liệu tổng hợp khớp; nếu có cảnh báo/đẩy báo cáo lên cổng QG thì ghi nhận trạng thái gửi.",
    "evidence": [
     {
      "name": "TC-PBH-021__s01__modal",
      "caption": "Tạo sự kiện ổ dịch",
      "uiState": "modal"
     },
     {
      "name": "TC-PBH-021__s02__detail",
      "caption": "Chi tiết ổ dịch + ca liên kết",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#269"
    ],
    "notes": "Nếu có liên thông báo cáo dịch QG -> integration."
   },
   {
    "id": "TC-PBH-022",
    "title": "Phân quyền - Vai trò không thuộc chương trình bị chặn menu/nút/API (matrix #216)",
    "category": "permission",
    "priority": "P0",
    "role": "User vai trò hạn chế (vd lễ tân)",
    "preconditions": "Đăng nhập user vai trò không có quyền YTDP/chương trình.",
    "steps": [
     "Kiểm tra menu TerminalLayout có hiện các mục hiv-management/methadone-treatment/mental-health/epidemiology không",
     "Truy cập trực tiếp URL /v2/methadone-treatment",
     "Gọi API cấp liều/khai báo ca bằng token vai trò này"
    ],
    "expected": "Menu ẩn các phân hệ không có quyền; truy cập URL bị chặn/redirect; API trả 403; khớp ma trận quyền #216.",
    "evidence": [
     {
      "name": "TC-PBH-022__s01__permission",
      "caption": "Menu ẩn phân hệ không có quyền",
      "uiState": "permission"
     },
     {
      "name": "TC-PBH-022__s02__permission",
      "caption": "API trả 403 với vai trò hạn chế",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#267",
     "#268",
     "#269"
    ],
    "notes": "Tham chiếu ma trận T1-T16 #216-231."
   },
   {
    "id": "TC-PBH-023",
    "title": "Audit log - Mọi mutation (cấp liều, đổi trạng thái, khai báo ca) ghi đúng người + thời gian",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Quản trị/Kiểm toán",
    "preconditions": "Đã thực hiện 1 cấp liều Methadone + 1 đổi trạng thái HIV + 1 khai báo ca.",
    "steps": [
     "Thực hiện các mutation trên",
     "Truy AuditLog/CreatedBy của bản ghi vừa tạo",
     "Kiểm tra CreatedBy là user thật (≠ Guid.Empty)"
    ],
    "expected": "Mỗi mutation có bản ghi audit với user thực, action, timestamp, entity; không có CreatedBy rỗng/Guid.Empty.",
    "evidence": [
     {
      "name": "TC-PBH-023__s01__detail",
      "caption": "Audit log ghi mutation cấp liều/đổi trạng thái",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#269"
    ],
    "notes": "data.js NOTES system: AuditLog ghi mọi thay đổi."
   },
   {
    "id": "TC-PBH-024",
    "title": "UI states - Empty/Loading/Error trên các màn pubhealth",
    "category": "ui",
    "priority": "P1",
    "role": "Tester UI",
    "preconditions": "Có thể giả lập API chậm/lỗi (throttle/offline backend).",
    "steps": [
     "Mở /v2/methadone-treatment khi BE đang khởi động (loading)",
     "Lọc keyword không khớp -> empty",
     "Tắt BE rồi reload -> error",
     "Lặp với hiv-management & chronic-disease"
    ],
    "expected": "Loading hiện 'Đang tải…'; empty hiện 'Chưa có BN methadone'/thông báo trống tương ứng; lỗi hiện toast 'Không tải được…'; không vỡ layout.",
    "evidence": [
     {
      "name": "TC-PBH-024__s01__loading",
      "caption": "Trạng thái loading",
      "uiState": "loading"
     },
     {
      "name": "TC-PBH-024__s02__empty",
      "caption": "Trạng thái empty khi lọc không khớp",
      "uiState": "empty"
     },
     {
      "name": "TC-PBH-024__s03__error",
      "caption": "Toast lỗi khi BE tắt",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#267",
     "#268"
    ],
    "notes": ""
   },
   {
    "id": "TC-PBH-025",
    "title": "UI - Dark/light parity + format số/tiền/ngày trên màn Methadone & HIV",
    "category": "ui",
    "priority": "P2",
    "role": "Tester UI",
    "preconditions": "Topbar v2 có toggle dark/light.",
    "steps": [
     "Bật dark mode trên /v2/methadone-treatment",
     "Kiểm tra StatusBadge, KpiStrip, bảng, modal đọc được (contrast)",
     "Kiểm tra cột liều 'mg', ngày DD/MM/YYYY HH:mm, số CD4/VL",
     "Chuyển sang light, đối chiếu"
    ],
    "expected": "Cả 2 theme contrast đạt, không chữ mất hút; định dạng số/đơn vị/ngày nhất quán; badge màu đúng tone (ok/warn/crit).",
    "evidence": [
     {
      "name": "TC-PBH-025__s01__list",
      "caption": "Dark mode màn Methadone",
      "uiState": "list"
     },
     {
      "name": "TC-PBH-025__s02__list",
      "caption": "Light mode đối chiếu",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#267",
     "#268"
    ],
    "notes": ""
   },
   {
    "id": "TC-PBH-026",
    "title": "Tìm kiếm & lọc - Ký tự đặc biệt, dấu tiếng Việt, chuỗi dài",
    "category": "edge",
    "priority": "P2",
    "role": "Tester",
    "preconditions": "Có BN tên có dấu (vd 'Nguyễn Thị Hoà').",
    "steps": [
     "Tìm 'Hoà' (có dấu) và 'Hoa' (không dấu) trên /v2/methadone-treatment",
     "Tìm chuỗi 300 ký tự",
     "Tìm chuỗi chứa % _ ' \" < >"
    ],
    "expected": "Tìm có/không dấu trả kết quả phù hợp (lý tưởng bỏ dấu vẫn match); chuỗi dài/ký tự đặc biệt không gây lỗi/SQL injection; không crash.",
    "evidence": [
     {
      "name": "TC-PBH-026__s01__filter",
      "caption": "Tìm kiếm tiếng Việt có dấu",
      "uiState": "filter"
     },
     {
      "name": "TC-PBH-026__s02__empty",
      "caption": "Ký tự đặc biệt trả empty an toàn",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#267"
    ],
    "notes": "security: kiểm injection ở keyword."
   },
   {
    "id": "TC-PBH-027",
    "title": "Methadone - Cảnh báo bỏ liều liên tiếp (patient-safety, theo dõi)",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ Methadone",
    "preconditions": "BN có missedDoses>0.",
    "steps": [
     "Vào KpiStrip xem 'Có bỏ liều'",
     "Lọc/xem BN có cột Bỏ liều > 0 (hiển thị màu cảnh báo)",
     "Mở Drawer chi tiết xem số bỏ liều",
     "Kiểm tra có cảnh báo khi cấp liều cho BN bỏ liều nhiều (vd cần đánh giá lại)"
    ],
    "expected": "KPI 'Có bỏ liều' đếm đúng; cột Bỏ liều >0 hiển thị màu cam; nếu hệ thống KHÔNG cảnh báo khi cấp liều cho BN bỏ liều nhiều -> ghi gap patient-safety.",
    "evidence": [
     {
      "name": "TC-PBH-027__s01__list",
      "caption": "Cột Bỏ liều hiển thị cảnh báo",
      "uiState": "list"
     },
     {
      "name": "TC-PBH-027__s02__detail",
      "caption": "Drawer chi tiết số bỏ liều",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#267"
    ],
    "notes": "Bỏ liều Methadone ảnh hưởng an toàn cấp liều lại."
   },
   {
    "id": "TC-PBH-028",
    "title": "Hồ sơ dân số / Chiến dịch SK - Liên kết PopulationRecords & HealthCampaigns",
    "category": "happy",
    "priority": "P2",
    "role": "Nhân viên YTCC",
    "preconditions": "Ở /v2/population-health.",
    "steps": [
     "Mở danh sách hồ sơ dân số",
     "Tạo/xem 1 chiến dịch sức khỏe (HealthCampaigns)",
     "Gắn tài liệu truyền thông (HealthEducationMaterials)",
     "Mở chi tiết"
    ],
    "expected": "Hồ sơ dân số hiển thị; chiến dịch tạo thành công liên kết tài liệu; chi tiết đầy đủ; không lỗi.",
    "evidence": [
     {
      "name": "TC-PBH-028__s01__list",
      "caption": "Danh sách hồ sơ dân số",
      "uiState": "list"
     },
     {
      "name": "TC-PBH-028__s02__modal",
      "caption": "Tạo chiến dịch sức khỏe",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#268"
    ],
    "notes": "tables: PopulationRecords/HealthCampaigns/HealthEducationMaterials."
   }
  ],
  "ui_state_checklist": [
   "list - danh sách BN/ca/hộ ở mỗi màn (HIV, Methadone, mạn tính, tâm thần, hộ GĐ, ca bệnh, dân số)",
   "detail/drawer - chi tiết BN/ca/hộ/ổ dịch + section thông tin",
   "modal - Cấp liều Methadone, XN nước tiểu, khai báo ca bệnh, thêm tiếp xúc, đánh giá tâm thần, chiến dịch",
   "form/crudmodal - sửa điều trị, tạo/sửa hồ sơ mạn tính",
   "tab - StatusTabs (active/suspended/discharged/transferred; active/transferred/lost/deceased; active/followup/closed/removed; active/stable/remission/discharged; active/inactive/moved)",
   "filter - lọc pha điều trị, lọc trạng thái, search box",
   "validation - lỗi field bắt buộc / liều không hợp lệ / ngày tương lai / chu kỳ <=0",
   "empty - không có dữ liệu / lọc không khớp",
   "loading - 'Đang tải…' khi gọi API",
   "error - toast 'Không tải được…' khi BE lỗi",
   "success/toast - cấp liều / ghi XN / cập nhật / khai báo ca thành công",
   "confirm - xác nhận thao tác (cấp liều, đổi trạng thái nhạy cảm)",
   "permission - menu ẩn / API 403 với vai trò không đủ quyền",
   "dark/light parity - contrast 2 theme trên badge/KPI/bảng/modal"
  ],
  "gaps": [
   "Patient-safety: chưa thấy ngưỡng an toàn liều Methadone (max ~200mg) ở FE submitDose chỉ chặn amt<=0 -> cần test/verify BE có chặn liều cực lớn + cảnh báo khi cấp liều cho BN bỏ liều nhiều (mất dung nạp).",
   "Bảo mật dữ liệu cực nhạy cảm (HIV, tâm thần, Methadone): cần test IDOR/phân quyền theo ma trận #216 chi tiết hơn - hiện FE chỉ search, chưa rõ BE lọc theo phạm vi cơ sở/đơn vị của user.",
   "data.js KHÔNG có NOTES['pubhealth'] và RELATED_X chỉ liệt kê pubhealth:[immun,checkup,specialty] - thiếu mô tả ràng buộc nghiệp vụ chi tiết; nhiều bảng (PmtctRecords dự phòng lây mẹ-con, NcdScreenings, DiseaseReports) chưa thấy màn FE v2 riêng -> cần xác nhận đã có UI hay là gap chức năng.",
   "Truy vết tiếp xúc (DiseaseCases ⟶ ContactTraces) và ổ dịch (OutbreakEvents) - cần verify FE Epidemiology.tsx thực sự có CRUD tiếp xúc/ổ dịch hay mới là list (rủi ro stub in-memory như cảnh báo memory B-items).",
   "Liên thông cổng QG / báo cáo dịch bệnh điện tử (DiseaseReports gửi lên hệ thống giám sát quốc gia) - chưa rõ có integration; nếu có cần test trạng thái gửi/ack/failed.",
   "Audit log: cần xác nhận mọi mutation chương trình (cấp liều, XN, đổi trạng thái, khai báo ca) đều ghi AuditLog với CreatedBy user thật - rủi ro Guid.Empty đã được cảnh báo trong NOTES.",
   "Tính nhất quán pha Methadone (drift int/string '1'..'4' vs induction/maintenance) - đã né ở MTD_FIELDS nhưng cần test hiển thị/lọc khi DB trả số vs chuỗi.",
   "Empty/error state ở các màn ít được verify (Epidemiology, PopulationHealth, TbHiv) - chưa rõ có chuẩn _v2kit hay khác.",
   "Validation phía BE cho ngày tương lai/CD4 âm/VL bất thường: FE có thể không chặn -> cần test ở tầng API."
  ]
 },
 {
  "id": "specialty",
  "code": "SPC",
  "layer": "spec",
  "ic": "🧬",
  "nm": "Chuyên khoa đặc thù (IVF/Sản/Pháp y/YHCT)",
  "gh": [
   "#295"
  ],
  "gap": false,
  "module_id": "specialty",
  "summary": "Phân hệ \"Chuyên khoa đặc thù\" (SPC) gom 5 nghiệp vụ chuyên sâu: IVF/Lab hỗ trợ sinh sản (IvfPatientCouples → IvfCycles → IvfOvumPickups/IvfEmbryos/IvfEmbryoTransfers/IvfSpermBanks/IvfBiopsies), giám định pháp y (ForensicCases → ForensicExaminations), quản lý thai & KHHGĐ (PrenatalRecords, FamilyPlanningRecords), và Y học cổ truyền (TraditionalMedicineTreatments → HerbalPrescriptions). FE v2 gồm 5 màn: /v2/ivf-lab, /v2/medical-forensics, /v2/reproductive-health, /v2/traditional-medicine, /v2/specialty-emr; backend qua các controller api/ivf-lab, api/reproductive-health, api/traditional-medicine và ForensicService. Mỗi nghiệp vụ có vòng đời trạng thái riêng (IVF cycle/embryo/transfer/sperm; Forensic pending→examining→completed→approved; Prenatal active→delivered→completed→cancelled; TM active→completed→cancelled) và in giấy chứng nhận/phiếu.",
  "screens": [
   {
    "name": "IVF Lab — Danh sách cặp đôi",
    "desc": "List cặp vợ chồng điều trị IVF với KpiStrip (Cặp đôi/Chu kỳ đang HĐ/Phôi đông/Tỷ lệ TC), tìm kiếm theo tên/mã BN, phân trang. Mỗi dòng hiển thị vợ/chồng + tuổi tính từ DOB, ngày kết hôn, thời gian vô sinh, nguyên nhân, số chu kỳ.",
    "route_guess": "/v2/ivf-lab",
    "elements": [
     "KpiStrip 4 ô",
     "SearchBox tìm vợ/chồng/mã BN",
     "nút Bỏ lọc/Làm mới",
     "nút Phôi đông",
     "nút Đăng ký (primary)",
     "DataTable",
     "Pager",
     "ActBtn xem/sửa mỗi dòng"
    ]
   },
   {
    "name": "IVF — Modal đăng ký/cập nhật cặp đôi",
    "desc": "ModalShell upsert cặp đôi: PatientPicker chọn Vợ (BN nữ) + Chồng (BN nam) bắt buộc, thời gian vô sinh (tháng), ngày kết hôn, nguyên nhân vô sinh, ghi chú. Validate phải chọn cả vợ và chồng.",
    "route_guess": "/v2/ivf-lab",
    "elements": [
     "PatientPicker vợ (search ≥2 ký tự)",
     "PatientPicker chồng",
     "InputNumber thời gian vô sinh",
     "DatePicker ngày kết hôn",
     "Input nguyên nhân",
     "TextArea ghi chú",
     "thông báo lỗi đỏ",
     "nút Huỷ/Đăng ký"
    ]
   },
   {
    "name": "IVF — Drawer chi tiết cặp đôi",
    "desc": "DrawerShell hiển thị thông tin Vợ/Chồng/Tiền sử (kết hôn, thời gian vô sinh, nguyên nhân, số chu kỳ, ghi chú) + nút mở Phôi đông và Chỉnh sửa.",
    "route_guess": "/v2/ivf-lab",
    "elements": [
     "DrSec Vợ/Chồng/Tiền sử",
     "DrField",
     "nút Phôi đông",
     "nút Chỉnh sửa",
     "nút Đóng"
    ]
   },
   {
    "name": "IVF — Drawer phôi đông",
    "desc": "Drawer liệt kê phôi có freezeDate của cặp đôi: mã phôi, chất lượng (day5/3/2 grade), ngày đông, vị trí lưu (ống/hộp/tủ), trạng thái. Tải qua getCycles → getEmbryos rồi lọc phôi đông.",
    "route_guess": "/v2/ivf-lab",
    "elements": [
     "bảng ab-tbl phôi đông",
     "cột mã/chất lượng/ngày đông/vị trí/trạng thái",
     "empty 'Không có phôi đông nào'",
     "loading 'Đang tải…'"
    ]
   },
   {
    "name": "IVF — Chu kỳ / chọc hút trứng / chuyển phôi / sperm bank / biopsy (backend)",
    "desc": "Các nghiệp vụ IVF sâu qua api/ivf-lab: cycles (status update), ovum-pickup, embryos (freeze/thaw/status), transfers (result), sperm-bank (status, expiring), biopsies, dashboard, daily-report.",
    "route_guess": "/v2/ivf-lab",
    "elements": [
     "endpoint cycles/status",
     "embryos freeze/thaw",
     "transfers result",
     "sperm-bank expiring",
     "dashboard KPI"
    ]
   },
   {
    "name": "Giám định pháp y — Danh sách hồ sơ",
    "desc": "SimpleV2Page list ForensicCases với StatusTabs (Chờ/Đang giám định/Hoàn tất/Đã duyệt), filter Loại (tổn thương/lái xe/tuyển dụng/bảo hiểm/tố tụng), KPI tổng/chờ/đang/hoàn tất/đã duyệt/TB tổn thương, cột mã GĐ, đối tượng, loại, tổ chức YC, ngày YC, tỉ lệ %, BS giám định, TT.",
    "route_guess": "/v2/medical-forensics",
    "elements": [
     "KpiStrip 6 ô",
     "StatusTabs 4 trạng thái",
     "Filter Loại",
     "SearchBox",
     "DataTable",
     "StatusBadge",
     "Drawer chi tiết"
    ]
   },
   {
    "name": "Pháp y — Drawer chi tiết + khám giám định + duyệt + in giấy chứng nhận",
    "desc": "Drawer hiển thị đối tượng/yêu cầu/kết quả + ghi chú. Backend hỗ trợ thêm lượt khám (AddExamination → tự chuyển status sang examining), duyệt (ApproveCase set tỉ lệ % + kết luận, status=approved), in giấy chứng nhận giám định (HTML/PDF có hội đồng).",
    "route_guess": "/v2/medical-forensics",
    "elements": [
     "DrSec đối tượng/yêu cầu/kết quả",
     "form thêm lượt khám (điểm CN/KT)",
     "form duyệt (tỉ lệ %, kết luận)",
     "nút in giấy chứng nhận"
    ]
   },
   {
    "name": "Quản lý thai (Reproductive Health) — Danh sách hồ sơ thai phụ",
    "desc": "SimpleV2Page list PrenatalRecords: StatusTabs (Đang theo dõi/Đã sinh/Hoàn tất/Hủy), filter Mức rủi ro (thấp/TB/cao/rất cao), KPI tổng/đang TD/rủi ro cao/sinh ≤30d/đã sinh/TB tuần thai. Cột mã HS, sản phụ, tuần thai, PARA (G/P), dự sinh, mức rủi ro, số lần khám, khám gần nhất, BS, TT.",
    "route_guess": "/v2/reproductive-health",
    "elements": [
     "KpiStrip 6 ô",
     "StatusTabs 4",
     "Filter mức rủi ro",
     "SearchBox",
     "DataTable",
     "chip rủi ro màu",
     "Drawer thai kỳ"
    ]
   },
   {
    "name": "Quản lý thai — Form tạo/sửa + Drawer chi tiết",
    "desc": "Tạo/cập nhật PrenatalRecord (CreatePrenatalRecordDto): sản phụ, tuần thai, PARA gravida/para, dự sinh, mức rủi ro, nhóm máu. Drawer hiển thị sản phụ + thai kỳ + nhóm máu. Có API high-risk (lọc thai nguy cơ cao).",
    "route_guess": "/v2/reproductive-health",
    "elements": [
     "form sản phụ/tuần thai/PARA/dự sinh/rủi ro/nhóm máu",
     "DrSec sản phụ/thai kỳ",
     "nhóm máu (an toàn truyền)"
    ]
   },
   {
    "name": "KHHGĐ (Family Planning)",
    "desc": "Quản lý FamilyPlanningRecords qua api/reproductive-health/family-planning: search theo keyword/method/status, tạo, cập nhật. Biện pháp tránh thai + trạng thái.",
    "route_guess": "/v2/reproductive-health",
    "elements": [
     "list KHHGĐ",
     "filter phương pháp/trạng thái",
     "form tạo/sửa biện pháp"
    ]
   },
   {
    "name": "Y học cổ truyền (YHCT) — Danh sách phác đồ điều trị",
    "desc": "List TraditionalMedicineTreatments: StatusTabs (Đang điều trị/Hoàn thành/Hủy), filter Phương pháp (châm cứu/thuốc bắc/xoa bóp/giác hơi/cứu ngải/kết hợp), KpiStrip. CrudModal tạo/sửa phác đồ với mã phác đồ (khóa khi sửa), BN, phương pháp, chẩn đoán, ngày BĐ/KT, tổng số buổi, trạng thái.",
    "route_guess": "/v2/traditional-medicine",
    "elements": [
     "KpiStrip",
     "StatusTabs 3",
     "Filter phương pháp",
     "SearchBox",
     "DataTable",
     "CrudModal",
     "nút Hoàn tất điều trị"
    ]
   },
   {
    "name": "YHCT — Đơn thuốc bắc (Herbal Prescription) + herb-picker",
    "desc": "Tạo HerbalPrescription gắn với treatment; herb-picker tra danh mục vị thuốc bắc (api/traditional-medicine/herbs theo keyword). Xem đơn thuốc bắc theo treatmentId. Complete treatment chuyển trạng thái hoàn tất.",
    "route_guess": "/v2/traditional-medicine",
    "elements": [
     "modal kê đơn thuốc bắc",
     "herb-picker tra cứu vị thuốc",
     "danh sách đơn theo phác đồ",
     "nút Hoàn tất"
    ]
   },
   {
    "name": "Bệnh án chuyên khoa (Specialty EMR)",
    "desc": "Màn /v2/specialty-emr gom bệnh án chuyên khoa đặc thù (sản/IVF/YHCT/pháp y) — biểu mẫu EMR đặc thù theo chuyên khoa.",
    "route_guess": "/v2/specialty-emr",
    "elements": [
     "list bệnh án chuyên khoa",
     "form/biểu mẫu EMR đặc thù",
     "drawer chi tiết"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-SPC-001",
    "title": "IVF — Đăng ký cặp đôi mới (happy path)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ IVF",
    "preconditions": "Đăng nhập admin/Admin@123, đã có ≥2 bệnh nhân (1 nữ, 1 nam) trong hệ thống. Ở /v2/ivf-lab.",
    "steps": [
     "Bấm nút 'Đăng ký' (primary) mở ModalShell đăng ký cặp đôi IVF",
     "Ở PatientPicker 'Vợ' gõ ≥2 ký tự tên BN nữ, chọn từ dropdown",
     "Ở PatientPicker 'Chồng' gõ ≥2 ký tự tên BN nam, chọn",
     "Nhập thời gian vô sinh = 24 tháng, ngày kết hôn hợp lệ, nguyên nhân 'Tắc vòi trứng'",
     "Bấm 'Đăng ký'"
    ],
    "expected": "Toast 'Đã đăng ký cặp đôi', modal đóng, danh sách reload và cặp đôi mới xuất hiện với số chu kỳ = 0; KPI 'Cặp đôi' tăng 1.",
    "evidence": [
     {
      "name": "TC-SPC-001__s01__list",
      "caption": "List IVF trước khi đăng ký",
      "uiState": "list"
     },
     {
      "name": "TC-SPC-001__s02__modal",
      "caption": "Modal đăng ký đã điền đủ vợ/chồng",
      "uiState": "modal"
     },
     {
      "name": "TC-SPC-001__s03__success",
      "caption": "Toast thành công + cặp đôi mới trong list",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-SPC-002",
    "title": "IVF — Đăng ký thiếu vợ hoặc chồng bị chặn (validation)",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ IVF",
    "preconditions": "Ở modal đăng ký cặp đôi IVF (/v2/ivf-lab).",
    "steps": [
     "Chỉ chọn Vợ, để trống Chồng",
     "Bấm 'Đăng ký'",
     "Quan sát thông báo",
     "Bỏ chọn Vợ, chỉ chọn Chồng, bấm 'Đăng ký' lần nữa"
    ],
    "expected": "Hiện lỗi đỏ 'Chọn cả vợ và chồng', KHÔNG gọi API lưu, modal vẫn mở. Cả 2 trường hợp đều bị chặn.",
    "evidence": [
     {
      "name": "TC-SPC-002__s01__validation",
      "caption": "Lỗi thiếu chồng",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-SPC-003",
    "title": "IVF — PatientPicker yêu cầu gõ ≥2 ký tự (edge/boundary)",
    "category": "edge",
    "priority": "P2",
    "role": "Bác sĩ IVF",
    "preconditions": "Ở modal đăng ký cặp đôi.",
    "steps": [
     "Ở PatientPicker Vợ gõ 1 ký tự",
     "Quan sát dropdown",
     "Gõ thêm thành 2+ ký tự có dấu tiếng Việt (vd 'Nguyễn')",
     "Quan sát kết quả tìm"
    ],
    "expected": "Với <2 ký tự: hiện 'Gõ ≥2 ký tự để tìm bệnh nhân', không gọi API. Với ≥2 ký tự: debounce 350ms rồi trả danh sách BN khớp (đúng dấu tiếng Việt).",
    "evidence": [
     {
      "name": "TC-SPC-003__s01__dropdown",
      "caption": "Gợi ý gõ ≥2 ký tự",
      "uiState": "dropdown"
     },
     {
      "name": "TC-SPC-003__s02__dropdown",
      "caption": "Kết quả tìm sau khi gõ tên có dấu",
      "uiState": "dropdown"
     }
    ]
   },
   {
    "id": "TC-SPC-004",
    "title": "IVF — Thời gian vô sinh nhập giá trị biên (edge/boundary)",
    "category": "edge",
    "priority": "P2",
    "role": "Bác sĩ IVF",
    "preconditions": "Ở modal đăng ký cặp đôi, đã chọn vợ + chồng.",
    "steps": [
     "Nhập thời gian vô sinh = 0",
     "Lưu và xem hiển thị cột 'Vô sinh' trên list",
     "Sửa lại = 18 tháng, lưu, xem hiển thị",
     "Thử nhập số âm (nếu cho phép)"
    ],
    "expected": "0 tháng hiển thị '0 tháng'; ≥12 tháng hiển thị theo năm (18 → '1.5 năm'). InputNumber min=0 chặn số âm.",
    "evidence": [
     {
      "name": "TC-SPC-004__s01__form",
      "caption": "Nhập 0 tháng",
      "uiState": "form"
     },
     {
      "name": "TC-SPC-004__s02__list",
      "caption": "Cột Vô sinh hiển thị 1.5 năm",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-SPC-005",
    "title": "IVF — Xem drawer phôi đông cặp đôi chưa có phôi (negative/empty)",
    "category": "negative",
    "priority": "P1",
    "role": "Chuyên viên Lab IVF",
    "preconditions": "Có cặp đôi chưa có chu kỳ hoặc chưa có phôi đông. Ở /v2/ivf-lab.",
    "steps": [
     "Bấm nút 'Phôi đông' khi CHƯA chọn cặp đôi nào",
     "Quan sát thông báo",
     "Chọn 1 cặp đôi chưa có phôi đông rồi mở drawer Phôi đông"
    ],
    "expected": "Khi chưa chọn: message info 'Chọn cặp đôi từ danh sách để xem phôi đông'. Khi cặp đôi không có phôi: drawer hiện empty 'Không có phôi đông nào'.",
    "evidence": [
     {
      "name": "TC-SPC-005__s01__toast",
      "caption": "Nhắc chọn cặp đôi",
      "uiState": "toast"
     },
     {
      "name": "TC-SPC-005__s02__empty",
      "caption": "Drawer phôi đông rỗng",
      "uiState": "empty"
     }
    ]
   },
   {
    "id": "TC-SPC-006",
    "title": "IVF — Vòng đời trạng thái phôi: freeze rồi thaw (state)",
    "category": "state",
    "priority": "P0",
    "role": "Chuyên viên Lab IVF",
    "preconditions": "Có cặp đôi → chu kỳ → đã tạo phôi (embryo). Dùng api/ivf-lab/embryos.",
    "steps": [
     "Tạo phôi mới qua POST embryos",
     "Gọi PUT embryos/{id}/freeze với vị trí lưu (ống/hộp/tủ) + ngày đông",
     "Mở drawer Phôi đông, xác nhận phôi xuất hiện",
     "Gọi PUT embryos/{id}/thaw",
     "Mở lại drawer Phôi đông"
    ],
    "expected": "Sau freeze: phôi có freezeDate + vị trí lưu, hiện trong drawer phôi đông, KPI 'Phôi đông' tăng. Sau thaw: phôi rời danh sách phôi đông, trạng thái cập nhật đúng.",
    "evidence": [
     {
      "name": "TC-SPC-006__s01__drawer",
      "caption": "Phôi sau freeze trong drawer",
      "uiState": "drawer"
     },
     {
      "name": "TC-SPC-006__s02__state",
      "caption": "Phôi sau thaw rời danh sách phôi đông",
      "uiState": "state"
     }
    ]
   },
   {
    "id": "TC-SPC-007",
    "title": "IVF — Cập nhật trạng thái chu kỳ hợp lệ và chặn không hợp lệ (state)",
    "category": "state",
    "priority": "P1",
    "role": "Bác sĩ IVF",
    "preconditions": "Có cặp đôi và ≥1 chu kỳ IVF (api/ivf-lab/cycles).",
    "steps": [
     "PUT cycles/{id}/status chuyển sang trạng thái tiếp theo hợp lệ",
     "PUT cycles/{id}/status với id không tồn tại",
     "Quan sát phản hồi"
    ],
    "expected": "Trạng thái hợp lệ: 200 OK + cycle cập nhật. Id không tồn tại: 404 NotFound, không tạo dữ liệu rác.",
    "evidence": [
     {
      "name": "TC-SPC-007__s01__state",
      "caption": "Chu kỳ chuyển trạng thái OK",
      "uiState": "state"
     },
     {
      "name": "TC-SPC-007__s02__error",
      "caption": "404 khi id không tồn tại",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-SPC-008",
    "title": "IVF — Sperm bank cảnh báo mẫu sắp hết hạn lưu (data-consistency)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Chuyên viên Lab IVF",
    "preconditions": "Có mẫu tinh trùng trong sperm-bank với ngày hết hạn trong 30 ngày tới.",
    "steps": [
     "POST sperm-bank tạo mẫu có ngày hết hạn lưu trong 25 ngày",
     "GET sperm-bank/expiring?daysAhead=30",
     "Đổi mẫu sang hạn lưu 60 ngày, gọi lại expiring?daysAhead=30"
    ],
    "expected": "Mẫu hạn 25 ngày xuất hiện trong danh sách expiring(30); mẫu hạn 60 ngày KHÔNG xuất hiện. Cảnh báo nhất quán với ngày lưu.",
    "evidence": [
     {
      "name": "TC-SPC-008__s01__list",
      "caption": "Mẫu sắp hết hạn trong danh sách expiring",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-SPC-009",
    "title": "IVF — Dashboard KPI tính đúng theo dữ liệu (data-consistency)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Trưởng khoa IVF",
    "preconditions": "Có dữ liệu cặp đôi/chu kỳ/phôi đông/chuyển phôi với kết quả.",
    "steps": [
     "Ghi nhận số cặp đôi, chu kỳ đang hoạt động, phôi đông, số chuyển phôi thành công thực tế",
     "Mở /v2/ivf-lab, đối chiếu KpiStrip (Cặp đôi/Chu kỳ đang HĐ/Phôi đông/Tỷ lệ TC)",
     "Tạo thêm 1 chuyển phôi thành công rồi reload"
    ],
    "expected": "Các KPI khớp dữ liệu thực; tỷ lệ thành công = (số chuyển phôi có thai LS / tổng) tính đúng %, cập nhật sau khi reload.",
    "evidence": [
     {
      "name": "TC-SPC-009__s01__list",
      "caption": "KpiStrip IVF khớp số liệu",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-SPC-010",
    "title": "IVF — IDOR: truy cập cặp đôi/phôi của BN khác bằng id (security)",
    "category": "security",
    "priority": "P0",
    "role": "Người dùng quyền thấp",
    "preconditions": "Biết Guid của 1 cặp đôi/phôi không thuộc phạm vi người dùng.",
    "steps": [
     "Đăng nhập tài khoản không có quyền IVF (nếu có)",
     "Gọi trực tiếp GET api/ivf-lab/couples/{id} và GET embryos?cycleId={id} của cặp khác",
     "Quan sát phản hồi"
    ],
    "expected": "API phải yêu cầu xác thực và chặn truy cập trái phép (401/403) hoặc không lộ dữ liệu nhạy cảm sinh sản của BN khác. Không IDOR.",
    "evidence": [
     {
      "name": "TC-SPC-010__s01__permission",
      "caption": "Bị chặn khi truy cập id cặp đôi khác",
      "uiState": "permission"
     }
    ]
   },
   {
    "id": "TC-SPC-011",
    "title": "Pháp y — Tạo ca giám định mới sinh mã GD-YYYY-NNNN (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Cán bộ pháp y",
    "preconditions": "Đăng nhập, ở /v2/medical-forensics.",
    "steps": [
     "Tạo ca giám định: chọn đối tượng, loại 'Tỉ lệ tổn thương', tổ chức yêu cầu, ngày yêu cầu, hội đồng",
     "Lưu",
     "Mở lại danh sách kiểm tra mã sinh tự động"
    ],
    "expected": "Ca mới tạo với mã GD-{năm}-{số thứ tự 4 chữ số}, status = 'Chờ giám định' (pending), xuất hiện ở tab Chờ giám định.",
    "evidence": [
     {
      "name": "TC-SPC-011__s01__form",
      "caption": "Form tạo ca giám định",
      "uiState": "form"
     },
     {
      "name": "TC-SPC-011__s02__success",
      "caption": "Ca mới có mã GD tự sinh ở tab Chờ",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-SPC-012",
    "title": "Pháp y — Thêm lượt khám tự chuyển trạng thái pending→examining (state)",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ giám định",
    "preconditions": "Có ca giám định ở trạng thái 'Chờ giám định' (status=0).",
    "steps": [
     "Mở ca, thêm 1 lượt khám (ExamCategory, Findings, điểm CN, điểm KT, người khám)",
     "Lưu lượt khám",
     "Quan sát trạng thái ca và tab"
    ],
    "expected": "Lượt khám được thêm; ca tự chuyển từ 'Chờ giám định' sang 'Đang giám định' (status 0→1), di chuyển sang tab Đang giám định.",
    "evidence": [
     {
      "name": "TC-SPC-012__s01__form",
      "caption": "Form thêm lượt khám",
      "uiState": "form"
     },
     {
      "name": "TC-SPC-012__s02__state",
      "caption": "Ca chuyển sang Đang giám định",
      "uiState": "state"
     }
    ]
   },
   {
    "id": "TC-SPC-013",
    "title": "Pháp y — Duyệt ca: nhập tỉ lệ tổn thương + kết luận (happy/state)",
    "category": "state",
    "priority": "P0",
    "role": "Chủ tịch hội đồng giám định",
    "preconditions": "Có ca đang/hoàn tất giám định cần duyệt.",
    "steps": [
     "Mở ca, chọn Duyệt",
     "Nhập tỉ lệ tổn thương = 35%, kết luận văn bản",
     "Xác nhận duyệt"
    ],
    "expected": "Ca chuyển status=approved ('Đã duyệt'), lưu DisabilityPercentage=35 và Conclusion; cột Tỉ lệ hiển thị 35%; di chuyển sang tab Đã duyệt.",
    "evidence": [
     {
      "name": "TC-SPC-013__s01__confirm",
      "caption": "Form duyệt nhập tỉ lệ + kết luận",
      "uiState": "confirm"
     },
     {
      "name": "TC-SPC-013__s02__state",
      "caption": "Ca sang Đã duyệt với tỉ lệ 35%",
      "uiState": "state"
     }
    ]
   },
   {
    "id": "TC-SPC-014",
    "title": "Pháp y — Tỉ lệ tổn thương giá trị biên 0 / 100 / >100 / âm (validation/edge)",
    "category": "validation",
    "priority": "P1",
    "role": "Chủ tịch hội đồng giám định",
    "preconditions": "Ca đang chờ duyệt.",
    "steps": [
     "Nhập tỉ lệ = 0, duyệt → kiểm tra hiển thị",
     "Nhập 100, duyệt",
     "Nhập 150 (vượt 100) và -5 (âm)",
     "Quan sát kiểm tra"
    ],
    "expected": "0 và 100 hợp lệ hiển thị đúng; 150 và số âm bị chặn/cảnh báo (tỉ lệ tổn thương 0–100%). Không lưu giá trị vô lý.",
    "evidence": [
     {
      "name": "TC-SPC-014__s01__validation",
      "caption": "Chặn tỉ lệ >100 hoặc âm",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-SPC-015",
    "title": "Pháp y — In giấy chứng nhận giám định (happy/integration)",
    "category": "happy",
    "priority": "P1",
    "role": "Thư ký hội đồng",
    "preconditions": "Ca đã duyệt có kết luận, tỉ lệ, lượt khám, thành phần hội đồng.",
    "steps": [
     "Mở ca đã duyệt",
     "Bấm In giấy chứng nhận giám định",
     "Mở file/preview, kiểm tra nội dung"
    ],
    "expected": "Xuất giấy chứng nhận có: thông tin đối tượng (tên/ngày sinh/giới/CCCD), bảng kết quả khám (điểm CN/KT), kết luận, tỉ lệ %, thành phần hội đồng, ô ký Chủ tịch/Thư ký. Tiếng Việt hiển thị đúng.",
    "evidence": [
     {
      "name": "TC-SPC-015__s01__detail",
      "caption": "Preview giấy chứng nhận giám định",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-SPC-016",
    "title": "Pháp y — XSS ở trường Kết luận / Ghi chú trong giấy chứng nhận (security)",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ giám định",
    "preconditions": "Có ca giám định.",
    "steps": [
     "Nhập vào Kết luận chuỗi <script>alert(1)</script> và Ghi chú <img src=x onerror=alert(2)>",
     "Lưu + duyệt",
     "In giấy chứng nhận và mở preview HTML"
    ],
    "expected": "Nội dung bị HTML-encode (PrintCertificate dùng HtmlEncode) — hiển thị dạng text, KHÔNG thực thi script. Không XSS.",
    "evidence": [
     {
      "name": "TC-SPC-016__s01__detail",
      "caption": "Chuỗi script hiển thị dạng text trong giấy CN",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-SPC-017",
    "title": "Pháp y — Lọc theo loại + tìm theo tên/mã/CCCD (happy/ui)",
    "category": "ui",
    "priority": "P2",
    "role": "Cán bộ pháp y",
    "preconditions": "Có nhiều ca với loại khác nhau.",
    "steps": [
     "Chọn Filter Loại = 'Lái xe'",
     "Gõ SearchBox theo CCCD/tên đối tượng",
     "Chuyển StatusTab giữa các trạng thái",
     "Bỏ lọc"
    ],
    "expected": "Bảng lọc đúng theo loại + keyword (khớp caseCode/patientName/CCCD) + trạng thái; KPI cập nhật theo tập hiện thị; bỏ lọc trả lại toàn bộ.",
    "evidence": [
     {
      "name": "TC-SPC-017__s01__filter",
      "caption": "Lọc loại Lái xe + search",
      "uiState": "filter"
     }
    ]
   },
   {
    "id": "TC-SPC-018",
    "title": "Quản lý thai — Tạo hồ sơ thai phụ với nhóm máu (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ sản khoa",
    "preconditions": "Ở /v2/reproductive-health, có bệnh nhân nữ.",
    "steps": [
     "Tạo hồ sơ thai: chọn sản phụ, tuần thai = 12, PARA G2P1, dự sinh, nhóm máu O+, mức rủi ro 'Thấp'",
     "Lưu",
     "Mở lại drawer chi tiết kiểm tra"
    ],
    "expected": "Hồ sơ mới có mã HS, trạng thái 'Đang theo dõi', PARA hiển thị G2P1, nhóm máu O+, mức rủi ro chip 'Thấp' màu ok; KPI tổng tăng.",
    "evidence": [
     {
      "name": "TC-SPC-018__s01__form",
      "caption": "Form tạo hồ sơ thai",
      "uiState": "form"
     },
     {
      "name": "TC-SPC-018__s02__drawer",
      "caption": "Drawer thai kỳ với nhóm máu + PARA",
      "uiState": "drawer"
     }
    ]
   },
   {
    "id": "TC-SPC-019",
    "title": "Quản lý thai — Tuần thai biên: 0, 42, >42, âm (edge/validation)",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ sản khoa",
    "preconditions": "Ở form tạo/sửa hồ sơ thai.",
    "steps": [
     "Nhập tuần thai = 0 và lưu",
     "Nhập 42 (đủ tháng) và lưu",
     "Nhập 50 (vô lý) và -3 (âm)",
     "Quan sát hiển thị + kiểm tra"
    ],
    "expected": "0 và 42 hiển thị '0t'/'42t'; giá trị vô lý/âm bị cảnh báo hoặc chặn. KPI 'TB tuần thai' tính đúng trung bình.",
    "evidence": [
     {
      "name": "TC-SPC-019__s01__validation",
      "caption": "Cảnh báo tuần thai vô lý",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-SPC-020",
    "title": "Quản lý thai — Thai nguy cơ cao hiển thị đúng KPI + chip + high-risk (data-consistency)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ sản khoa",
    "preconditions": "Có hồ sơ thai mức rủi ro 'Cao'/'Rất cao'.",
    "steps": [
     "Tạo hồ sơ thai mức rủi ro = 'Rất cao'",
     "Đối chiếu KPI 'Rủi ro cao' và chip màu crit trên dòng",
     "Gọi GET api/reproductive-health/high-risk",
     "Đổi mức rủi ro xuống 'Thấp' và đối chiếu lại"
    ],
    "expected": "KPI 'Rủi ro cao' đếm gồm high + very_high; chip hiển thị 'Rất cao' màu crit; endpoint high-risk trả đúng hồ sơ; sau khi hạ về Thấp thì rời khỏi đếm rủi ro cao và high-risk.",
    "evidence": [
     {
      "name": "TC-SPC-020__s01__list",
      "caption": "KPI rủi ro cao + chip crit",
      "uiState": "list"
     },
     {
      "name": "TC-SPC-020__s02__data-consistency",
      "caption": "high-risk endpoint khớp",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-SPC-021",
    "title": "Quản lý thai — Dự sinh quá khứ/tương lai xa + KPI 'Sinh ≤30d' (edge/data-consistency)",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ sản khoa",
    "preconditions": "Ở form tạo hồ sơ thai.",
    "steps": [
     "Đặt dự sinh = 15 ngày tới (trong 30 ngày)",
     "Đối chiếu KPI 'Sinh ≤30d'",
     "Đặt dự sinh = ngày quá khứ và đặt 1 năm sau",
     "Đối chiếu KPI lại"
    ],
    "expected": "Dự sinh trong 0–30 ngày được đếm vào 'Sinh ≤30d'; dự sinh quá khứ và >30 ngày không đếm. Cảnh báo hợp lý với dự sinh quá khứ.",
    "evidence": [
     {
      "name": "TC-SPC-021__s01__list",
      "caption": "KPI Sinh ≤30d đếm đúng",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-SPC-022",
    "title": "Quản lý thai — Vòng đời trạng thái active→delivered→completed, chặn về Hủy sai (state)",
    "category": "state",
    "priority": "P1",
    "role": "Bác sĩ sản khoa",
    "preconditions": "Có hồ sơ thai 'Đang theo dõi'.",
    "steps": [
     "Chuyển trạng thái sang 'Đã sinh'",
     "Tiếp tục sang 'Hoàn tất'",
     "Thử chuyển 1 hồ sơ đã Hoàn tất về 'Đang theo dõi' hoặc 'Hủy'"
    ],
    "expected": "Chuyển tiến hợp lệ active→delivered→completed thành công và đổi tab; chuyển lùi/không hợp lệ bị chặn hoặc cảnh báo.",
    "evidence": [
     {
      "name": "TC-SPC-022__s01__state",
      "caption": "Hồ sơ chuyển sang Đã sinh",
      "uiState": "state"
     }
    ]
   },
   {
    "id": "TC-SPC-023",
    "title": "KHHGĐ — Tạo hồ sơ KHHGĐ và lọc theo biện pháp (happy)",
    "category": "happy",
    "priority": "P1",
    "role": "Cán bộ KHHGĐ",
    "preconditions": "Ở /v2/reproductive-health (tab KHHGĐ / FamilyPlanning).",
    "steps": [
     "Tạo hồ sơ KHHGĐ: chọn đối tượng, biện pháp tránh thai, trạng thái",
     "Lưu",
     "Lọc danh sách theo method vừa tạo"
    ],
    "expected": "Hồ sơ KHHGĐ mới lưu (POST family-planning), xuất hiện khi lọc theo method tương ứng; trạng thái đúng.",
    "evidence": [
     {
      "name": "TC-SPC-023__s01__form",
      "caption": "Form KHHGĐ",
      "uiState": "form"
     },
     {
      "name": "TC-SPC-023__s02__list",
      "caption": "Hồ sơ KHHGĐ sau lọc method",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-SPC-024",
    "title": "YHCT — Tạo phác đồ điều trị (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ YHCT",
    "preconditions": "Ở /v2/traditional-medicine.",
    "steps": [
     "Bấm tạo phác đồ, nhập mã phác đồ, họ tên BN, phương pháp 'Châm cứu', chẩn đoán, ngày bắt đầu, tổng số buổi = 10",
     "Lưu",
     "Kiểm tra trong tab 'Đang điều trị'"
    ],
    "expected": "Phác đồ mới lưu, trạng thái 'Đang điều trị', xuất hiện ở tab tương ứng + lọc phương pháp 'Châm cứu'.",
    "evidence": [
     {
      "name": "TC-SPC-024__s01__modal",
      "caption": "CrudModal tạo phác đồ YHCT",
      "uiState": "modal"
     },
     {
      "name": "TC-SPC-024__s02__success",
      "caption": "Phác đồ mới ở tab Đang điều trị",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-SPC-025",
    "title": "YHCT — Validate trường bắt buộc + mã phác đồ khóa khi sửa (validation)",
    "category": "validation",
    "priority": "P1",
    "role": "Bác sĩ YHCT",
    "preconditions": "Ở CrudModal tạo/sửa phác đồ.",
    "steps": [
     "Bỏ trống mã phác đồ / họ tên BN / phương pháp / chẩn đoán / ngày bắt đầu rồi Lưu",
     "Quan sát lỗi từng trường",
     "Mở sửa 1 phác đồ và thử chỉnh mã phác đồ"
    ],
    "expected": "Các trường required hiện lỗi và chặn lưu; khi sửa, mã phác đồ bị disable (disabledOnEdit) không cho đổi.",
    "evidence": [
     {
      "name": "TC-SPC-025__s01__validation",
      "caption": "Lỗi trường bắt buộc",
      "uiState": "validation"
     },
     {
      "name": "TC-SPC-025__s02__form",
      "caption": "Mã phác đồ bị khóa khi sửa",
      "uiState": "form"
     }
    ]
   },
   {
    "id": "TC-SPC-026",
    "title": "YHCT — Kê đơn thuốc bắc qua herb-picker (happy/integration)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ YHCT",
    "preconditions": "Có phác đồ điều trị, danh mục vị thuốc đã seed.",
    "steps": [
     "Mở phác đồ, chọn kê đơn thuốc bắc",
     "Trong herb-picker gõ tên vị thuốc (vd 'Cam thảo'), chọn từ danh mục api/traditional-medicine/herbs",
     "Thêm nhiều vị + liều lượng",
     "Lưu đơn",
     "Mở lại đơn theo treatmentId"
    ],
    "expected": "Đơn thuốc bắc lưu gắn đúng treatment; herb-picker trả danh mục theo keyword; đơn hiển thị đủ vị thuốc đã kê khi xem theo treatmentId.",
    "evidence": [
     {
      "name": "TC-SPC-026__s01__dropdown",
      "caption": "Herb-picker tra vị thuốc",
      "uiState": "dropdown"
     },
     {
      "name": "TC-SPC-026__s02__modal",
      "caption": "Đơn thuốc bắc đã kê nhiều vị",
      "uiState": "modal"
     },
     {
      "name": "TC-SPC-026__s03__success",
      "caption": "Đơn lưu + xem lại theo phác đồ",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-SPC-027",
    "title": "YHCT — Hoàn tất điều trị chuyển trạng thái active→completed (state)",
    "category": "state",
    "priority": "P1",
    "role": "Bác sĩ YHCT",
    "preconditions": "Có phác đồ 'Đang điều trị'.",
    "steps": [
     "Mở phác đồ đang điều trị, bấm 'Hoàn tất' (PUT treatments/{id}/complete)",
     "Quan sát trạng thái + tab",
     "Thử Hoàn tất lại phác đồ đã hoàn thành / đã hủy"
    ],
    "expected": "Phác đồ chuyển sang 'Hoàn thành', di chuyển sang tab Hoàn thành; không cho hoàn tất lại phác đồ đã hoàn thành/đã hủy (hoặc no-op an toàn).",
    "evidence": [
     {
      "name": "TC-SPC-027__s01__state",
      "caption": "Phác đồ sang Hoàn thành",
      "uiState": "state"
     }
    ]
   },
   {
    "id": "TC-SPC-028",
    "title": "Specialty EMR — Mở màn bệnh án chuyên khoa không lỗi console (ui/happy)",
    "category": "ui",
    "priority": "P1",
    "role": "Bác sĩ chuyên khoa",
    "preconditions": "Đăng nhập, ở /v2/specialty-emr.",
    "steps": [
     "Mở /v2/specialty-emr",
     "Mở DevTools Console quan sát lỗi",
     "Mở 1 bệnh án chuyên khoa xem chi tiết/biểu mẫu",
     "Toggle dark/light ở topbar"
    ],
    "expected": "Màn load không lỗi console (bỏ qua SignalR/HMR), list + drawer/biểu mẫu hiển thị đúng; dark/light parity ổn, tiếng Việt có dấu hiển thị đúng.",
    "evidence": [
     {
      "name": "TC-SPC-028__s01__list",
      "caption": "Màn Specialty EMR (light)",
      "uiState": "list"
     },
     {
      "name": "TC-SPC-028__s02__detail",
      "caption": "Biểu mẫu/chi tiết bệnh án chuyên khoa",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-SPC-029",
    "title": "Specialty — Dark/light parity 5 màn chuyên khoa (ui)",
    "category": "ui",
    "priority": "P2",
    "role": "Bác sĩ chuyên khoa",
    "preconditions": "Đăng nhập, dùng topbar v2 toggle dark/light.",
    "steps": [
     "Lần lượt mở /v2/ivf-lab, /v2/medical-forensics, /v2/reproductive-health, /v2/traditional-medicine, /v2/specialty-emr",
     "Ở mỗi màn toggle dark rồi light",
     "Quan sát chip màu (rủi ro/trạng thái), KpiStrip, bảng, drawer"
    ],
    "expected": "Cả 2 theme đều tương phản tốt, không chữ trắng nền trắng / màu chip lệch; KpiStrip, StatusBadge, chip rủi ro đọc được ở cả dark và light.",
    "evidence": [
     {
      "name": "TC-SPC-029__s01__list",
      "caption": "IVF dark mode",
      "uiState": "list"
     },
     {
      "name": "TC-SPC-029__s02__list",
      "caption": "Reproductive light mode chip rủi ro",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-SPC-030",
    "title": "Specialty — Loading/Error/Empty state khi API lỗi (ui/negative)",
    "category": "negative",
    "priority": "P1",
    "role": "Bác sĩ chuyên khoa",
    "preconditions": "Có thể chặn/timeout API (DevTools offline) trên các màn chuyên khoa.",
    "steps": [
     "Mở /v2/ivf-lab khi mạng chậm — quan sát empty 'Đang tải…'",
     "Tắt backend hoặc chặn request, reload — quan sát xử lý lỗi",
     "Mở màn không có dữ liệu — quan sát empty"
    ],
    "expected": "Loading hiển thị 'Đang tải…'; khi lỗi hiện toast/cảnh báo (vd ti 'Không tải được dữ liệu IVF'), không trắng màn/crash; empty hiển thị thông điệp đúng ('Chưa có cặp đôi đăng ký IVF').",
    "evidence": [
     {
      "name": "TC-SPC-030__s01__loading",
      "caption": "Loading IVF",
      "uiState": "loading"
     },
     {
      "name": "TC-SPC-030__s02__error",
      "caption": "Toast lỗi khi API fail",
      "uiState": "error"
     },
     {
      "name": "TC-SPC-030__s03__empty",
      "caption": "Empty không có dữ liệu",
      "uiState": "empty"
     }
    ]
   },
   {
    "id": "TC-SPC-031",
    "title": "Specialty — Phân quyền: vai trò không đủ quyền bị chặn menu/nút/API (permission)",
    "category": "permission",
    "priority": "P0",
    "role": "Người dùng quyền hạn chế",
    "preconditions": "Có tài khoản vai trò không thuộc chuyên khoa (tham chiếu matrix #216). Có sẵn admin để đối chứng.",
    "steps": [
     "Đăng nhập tài khoản quyền hạn chế",
     "Kiểm tra menu chuyên khoa (IVF/pháp y/YHCT/sản) có ẩn không",
     "Truy cập trực tiếp URL /v2/ivf-lab",
     "Gọi trực tiếp các endpoint POST (vd POST api/ivf-lab/couples, ApproveCase, complete) bằng token quyền thấp"
    ],
    "expected": "Menu chuyên khoa ẩn/disable theo quyền; truy cập URL bị redirect/chặn; endpoint mutation trả 401/403 không cho ghi. Phù hợp permission matrix #216.",
    "evidence": [
     {
      "name": "TC-SPC-031__s01__permission",
      "caption": "Menu chuyên khoa ẩn với quyền thấp",
      "uiState": "permission"
     },
     {
      "name": "TC-SPC-031__s02__permission",
      "caption": "API mutation bị chặn 403",
      "uiState": "permission"
     }
    ]
   },
   {
    "id": "TC-SPC-032",
    "title": "Specialty — Audit log ghi mọi mutation chuyên khoa (data-consistency/security)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản trị/Kiểm toán",
    "preconditions": "Đăng nhập user thật (CreatedBy ≠ Guid.Empty). Thực hiện 1 chuỗi thao tác ghi.",
    "steps": [
     "Tạo cặp đôi IVF, duyệt 1 ca pháp y, hoàn tất 1 phác đồ YHCT, tạo hồ sơ thai",
     "Kiểm tra audit log / cột CreatedBy-UpdatedBy của các bản ghi",
     "Đối chiếu người thực hiện + thời gian"
    ],
    "expected": "Mỗi mutation tạo bản ghi audit/CreatedBy là user thật (không Guid.Empty), thời gian đúng; truy vết được ai làm gì khi nào (yêu cầu pháp lý với pháp y/sinh sản).",
    "evidence": [
     {
      "name": "TC-SPC-032__s01__detail",
      "caption": "Audit log / CreatedBy của mutation chuyên khoa",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-SPC-033",
    "title": "Specialty — Nhập chuỗi rất dài + ký tự đặc biệt + dấu tiếng Việt ở Ghi chú/Chẩn đoán (edge)",
    "category": "edge",
    "priority": "P2",
    "role": "Bác sĩ chuyên khoa",
    "preconditions": "Ở các form có TextArea (IVF ghi chú, pháp y ghi chú, YHCT chẩn đoán/ghi chú, prenatal ghi chú).",
    "steps": [
     "Nhập chuỗi ~2000 ký tự có dấu tiếng Việt + emoji + ký tự đặc biệt (& < > \" ')",
     "Lưu",
     "Mở lại drawer/chi tiết và (với pháp y) in giấy chứng nhận"
    ],
    "expected": "Lưu và hiển thị lại nguyên vẹn, không vỡ layout/tràn drawer; ký tự đặc biệt được escape an toàn khi in (không phá HTML); không cắt mất dấu tiếng Việt.",
    "evidence": [
     {
      "name": "TC-SPC-033__s01__form",
      "caption": "Nhập chuỗi dài + ký tự đặc biệt",
      "uiState": "form"
     },
     {
      "name": "TC-SPC-033__s02__detail",
      "caption": "Hiển thị lại nguyên vẹn ở drawer",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-SPC-034",
    "title": "IVF — Hủy giữa chừng khi đang đăng ký cặp đôi (negative)",
    "category": "negative",
    "priority": "P2",
    "role": "Bác sĩ IVF",
    "preconditions": "Ở modal đăng ký cặp đôi, đã điền dở.",
    "steps": [
     "Điền vợ + chồng + nguyên nhân",
     "Bấm 'Huỷ' (không Lưu)",
     "Mở lại modal đăng ký"
    ],
    "expected": "Modal đóng, không tạo cặp đôi nào; dữ liệu nhập dở không persist; mở lại form trống. Danh sách + KPI không đổi.",
    "evidence": [
     {
      "name": "TC-SPC-034__s01__modal",
      "caption": "Hủy đăng ký giữa chừng",
      "uiState": "modal"
     }
    ]
   }
  ],
  "ui_state_checklist": [
   "list — danh sách 5 màn (IVF/pháp y/thai/YHCT/specialty-emr) hiển thị đủ cột",
   "loading — trạng thái 'Đang tải…' khi fetch",
   "empty — không có dữ liệu (cặp đôi/phôi đông/hồ sơ)",
   "error — toast/cảnh báo khi API lỗi",
   "form — form tạo/sửa (prenatal, family-planning, forensic, exam, prenatal)",
   "modal — ModalShell/CrudModal (cặp đôi IVF, phác đồ YHCT, đơn thuốc bắc)",
   "drawer — DrawerShell chi tiết (cặp đôi, phôi đông, pháp y, thai kỳ)",
   "dropdown — PatientPicker + herb-picker (search có debounce)",
   "filter — lọc loại/phương pháp/mức rủi ro + StatusTabs",
   "validation — lỗi trường bắt buộc/biên (tỉ lệ %, tuần thai, vợ/chồng)",
   "state — chuyển trạng thái (cycle/embryo freeze-thaw/forensic/prenatal/YHCT complete)",
   "confirm — xác nhận duyệt ca pháp y",
   "success — toast thành công + bản ghi mới",
   "toast — message info/warning (nhắc chọn cặp đôi, lỗi tải)",
   "detail — giấy chứng nhận giám định / biểu mẫu EMR / audit log",
   "permission — menu/nút/API bị chặn theo vai trò",
   "data-consistency — KPI/dashboard/high-risk/expiring khớp dữ liệu"
  ],
  "gaps": [
   "Phân hệ 'Chuyên khoa đặc thù' (specialty/SPC) HIỆN CHƯA có issue test riêng trên GitHub — chưa được phủ bởi dải #216-289 → ứng viên tạo issue test mới (để user duyệt, KHÔNG tự tạo).",
   "Permission matrix #216 chưa được xác minh có định nghĩa role chuyên khoa riêng (BS IVF/pháp y/sản/YHCT) hay không — cần đối chiếu matrix thực để viết chính xác case permission TC-SPC-031.",
   "Chưa xác minh FE v2 đã có UI đầy đủ cho luồng IVF sâu (cycles/ovum-pickup/transfers/sperm-bank/biopsy) hay backend có nhưng FE chỉ mới list cặp đôi + phôi đông — nhiều endpoint ivf-lab (transfers/result, biopsy, daily-report) có thể chưa có màn FE tương ứng (cần test API-level).",
   "Pháp y: tỉ lệ tổn thương 0–100% và điểm CN/KT chưa rõ có server-side validation range hay không (ForensicService không thấy guard) — case TC-SPC-014 có thể phát hiện thiếu validate backend.",
   "Patient-safety nhóm máu: hồ sơ thai có bloodType nhưng chưa rõ có đối chiếu/cảnh báo Rh khi chuyển sản/truyền máu — luồng liên thông sang phân hệ máu (blood) chưa được kiểm.",
   "ForensicService bắt mọi exception trả default (catch → empty/null) — có thể che giấu lỗi thật; cần case kiểm 'lỗi backend nhưng FE tưởng rỗng' (silent failure) chưa nằm trong scope chuẩn.",
   "Chưa rõ tính nhất quán dữ liệu chuyên khoa → viện phí (vd dịch vụ IVF/YHCT có sinh chi phí vào billing không) — luồng cost→billing→BHYT chưa có evidence ở phân hệ này, cần xác minh có tích hợp hay tách rời.",
   "SpecialtyEMR.tsx chưa được đọc chi tiết — cần khảo sát thực để bổ sung case form/biểu mẫu EMR chuyên khoa cụ thể (hiện chỉ phủ ở mức smoke ui).",
   "Soft-delete (IsDeleted) có ở Forensic — chưa có case kiểm xóa mềm + đảm bảo bản ghi đã xóa không lộ qua list/detail/IDOR.",
   "IVF lưu trữ phôi/tinh trùng có yếu tố đồng thuận pháp lý (consent) + hạn lưu — chưa rõ hệ thống quản lý văn bản đồng thuận; gap nghiệp vụ cần xác nhận với competitor parity."
  ]
 },
 {
  "id": "mci",
  "code": "MCI",
  "layer": "spec",
  "ic": "🚨",
  "nm": "Cấp cứu thảm họa (MCI)",
  "gh": [
   "#296"
  ],
  "gap": false,
  "module_id": "mci",
  "summary": "Phân hệ Cấp cứu thảm họa (MCI) quản lý sự kiện thảm họa/tai nạn hàng loạt với 4 bảng nghiệp vụ thật: MCIEvents (sự kiện, alert level Yellow/Orange/Red, phase Activation→Response→Recovery→Deactivation), MCIVictims (nạn nhân với triage START Red/Yellow/Green/Black, định danh tạm/đã xác nhận, sinh hiệu, xử trí, disposition Admitted/OR/ICU/Discharged/Transferred/Deceased), MCISituationReports (báo cáo tình huống/Sở Y tế) và TraumaCases (ca chấn thương với điểm ISS/RTS/GCS, outcome). FE v2 gồm 2 màn: /v2/emergency-disaster (đọc nạn nhân MCI thật khi có sự kiện đang hoạt động, fallback đọc phiên phòng lưu cấp cứu ObservationStay; có Tiếp nhận cấp cứu + Kích hoạt Code Blue) và /v2/trauma-registry (CRUD ca chấn thương + báo cáo kết cục). API qua /api/mci/* (events, victims/triage/dispose/vitals, resources, command-center, family, reports, dashboard) và /api/trauma-registry/*; backend ExtendedWorkflow + MassCasualtyServiceImpl, migration 77_mci_code_blue.sql.",
  "screens": [
   {
    "name": "Bảng điều phối cấp cứu / MCI (Emergency Disaster Board)",
    "desc": "Màn chính cấp cứu: khi có sự kiện MCI đang hoạt động hiển thị nạn nhân thật (banner đỏ 'MCI ĐANG HOẠT ĐỘNG'), không có thì fallback đọc phiên phòng lưu cấp cứu (ObservationStay). KpiStrip 6 ô (Hôm nay/Mức 1-2/Đang xử trí/Chuyển nội trú/Chuyển tuyến/Chờ TB), tabs trạng thái, bảng danh sách ca theo triage 1-5, badge nguồn MCI/Phòng lưu.",
    "route_guess": "/v2/emergency-disaster",
    "elements": [
     "banner MCI đang hoạt động",
     "KpiStrip 6 ô metric",
     "nút Tiếp nhận cấp cứu",
     "nút Code Blue (danger)",
     "ô tìm kiếm BN/mã CC/triệu chứng",
     "Select lọc triage",
     "badge nguồn MCI/Phòng lưu",
     "tabs trạng thái (Tất cả/Đang phân loại/Đang xử trí/Theo dõi/Chuyển nội trú/Cho về/Chuyển tuyến)",
     "bảng 10 cột (Triage/Mã CC/Đến/Bệnh nhân/Lý do/Đường vào/Sinh hiệu/Giường/Trạng thái/Actions)",
     "nút phân trang Trước/Sau"
    ]
   },
   {
    "name": "Drawer chi tiết ca cấp cứu",
    "desc": "Drawer phải mở khi click 1 ca: hero theo màu triage, sinh hiệu (HA/Mạch/Nhiệt/SpO2/GCS), thông tin tiếp nhận (BN, mã, lý do, đường vào, giờ đến, BS, giường), gợi ý xử trí ban đầu theo mức triage; actions Đóng/In hồ sơ/Chuyển nội trú.",
    "route_guess": "/v2/emergency-disaster (Drawer)",
    "elements": [
     "hero màu triage + nhãn mức",
     "VitalCard HA/Mạch/Nhiệt/SpO2/GCS",
     "InfoField thông tin tiếp nhận",
     "block xử trí ban đầu",
     "nút Đóng/In hồ sơ/Chuyển nội trú"
    ]
   },
   {
    "name": "Drawer tiếp nhận ca cấp cứu mới (Intake)",
    "desc": "Drawer form tiếp nhận: chọn triage 1-5 (grid), thông tin nạn nhân (họ tên/giới/tuổi ước tính/đường vào), lý do & thương tích (lý do, mô tả thương tích textarea, cơ chế chấn thương). Có MCI → registerVictim vào sự kiện; không có MCI → đăng ký cấp cứu thật + tạo phiên phòng lưu.",
    "route_guess": "/v2/emergency-disaster (Drawer intake)",
    "elements": [
     "grid chọn triage 1-5",
     "Input họ tên",
     "Select giới tính",
     "Input number tuổi ước tính",
     "Select đường vào (Tự đến/Xe 115/Người nhà/Chuyển tuyến/Công an)",
     "Input lý do vào cấp cứu",
     "TextArea mô tả thương tích",
     "Input cơ chế chấn thương",
     "banner xanh 'Cấp cứu thường'",
     "thông báo lỗi validation",
     "nút Huỷ/Tiếp nhận"
    ]
   },
   {
    "name": "Modal xác nhận Code Blue",
    "desc": "Modal confirm danger khi bấm Code Blue: cảnh báo 'Hành động thật, không thể hoàn tác', xác nhận → activateCodeBlue tạo sự kiện MCI alert Red ngay vào hệ thống.",
    "route_guess": "/v2/emergency-disaster (Modal)",
    "elements": [
     "Tag cảnh báo đỏ",
     "nội dung cảnh báo",
     "nút Kích hoạt Code Blue (okType danger)",
     "nút Huỷ",
     "toast mã sự kiện sau kích hoạt"
    ]
   },
   {
    "name": "Sổ đăng ký chấn thương (Trauma Registry)",
    "desc": "Màn _v2kit chuẩn: KpiStrip (Tổng ca/Triage đỏ/Đang ICU/Cần phẫu thuật), toolbar tìm + lọc triage + làm mới + Đăng ký ca, StatusTabs (Mới nhập/ICU/Khoa/Ra viện/Tử vong), DataTable cột Mã ca/Bệnh nhân/Cơ chế/Triage/ISS/GCS/Bị thương/PT/Trạng thái, Pager.",
    "route_guess": "/v2/trauma-registry",
    "elements": [
     "KpiStrip 4 ô",
     "SearchBox tìm BN/mã ca/cơ chế",
     "Filter Triage",
     "nút Bỏ lọc",
     "nút Làm mới",
     "nút Đăng ký ca",
     "StatusTabs 5 trạng thái",
     "DataTable 9 cột (ISS tô màu theo ngưỡng)",
     "Pager"
    ]
   },
   {
    "name": "Drawer chi tiết ca chấn thương",
    "desc": "Drawer xem chi tiết: Bệnh nhân (mã ca/họ tên), Chấn thương (bị thương/nhập viện lúc, cơ chế, loại, triage badge), Điểm đánh giá (ISS/RTS/GCS tô màu theo ngưỡng), Điều trị (trạng thái, cần PT, ngày ICU/thở máy/tổng NV, BS, kết quả, ghi chú); footer Đóng/In báo cáo/Cập nhật.",
    "route_guess": "/v2/trauma-registry (Drawer)",
    "elements": [
     "DrSec Bệnh nhân",
     "DrSec Chấn thương + triage badge",
     "block điểm ISS/RTS/GCS tô màu",
     "DrSec Điều trị",
     "nút Đóng/In báo cáo/Cập nhật"
    ]
   },
   {
    "name": "Modal CRUD ca chấn thương",
    "desc": "CrudModal đăng ký/cập nhật ca chấn thương với các field: Mã ca (bắt buộc, khoá khi sửa), Họ tên BN (bắt buộc), Mã BN, Ngày bị thương, Ngày nhập viện (bắt buộc), Loại chấn thương (bắt buộc), Cơ chế, Triage (select bắt buộc red/yellow/green/black), ISS/RTS/GCS (number), Trạng thái (select), BS điều trị, Ghi chú (textarea).",
    "route_guess": "/v2/trauma-registry (Modal)",
    "elements": [
     "Input Mã ca (disabledOnEdit)",
     "Input Họ tên BN",
     "Input Mã BN",
     "Date Ngày bị thương",
     "Date Ngày nhập viện",
     "Input Loại chấn thương",
     "Input Cơ chế",
     "Select Triage 4 mức",
     "number ISS/RTS/GCS",
     "Select Trạng thái 5 mức",
     "Input BS điều trị",
     "TextArea Ghi chú",
     "nút Lưu/Huỷ"
    ]
   },
   {
    "name": "Drawer báo cáo kết cục chấn thương (Outcome Report)",
    "desc": "Drawer tổng hợp: Tổng quan (tổng ca), Kết cục điều trị (breakdown count + %), Phân loại Triage (badge count), Loại chấn thương (count). Mở qua nút In báo cáo, có loading state, in qua window.print().",
    "route_guess": "/v2/trauma-registry (Drawer report)",
    "elements": [
     "DrSec Tổng quan",
     "DrSec Kết cục điều trị (count + %)",
     "DrSec Phân loại Triage (badge)",
     "DrSec Loại chấn thương",
     "loading state",
     "nút Đóng/In báo cáo"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-MCI-001",
    "title": "Mở màn Cấp cứu khi KHÔNG có sự kiện MCI: hiển thị nguồn Phòng lưu (ObservationStay)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ cấp cứu",
    "preconditions": "Đăng nhập admin/Admin@123. Không có sự kiện MCI đang hoạt động (GET /api/mci/events/active trả rỗng).",
    "steps": [
     "Vào /v2/emergency-disaster",
     "Chờ tải xong",
     "Quan sát badge nguồn ở toolbar phải và KpiStrip"
    ],
    "expected": "Trang load không lỗi console; badge nguồn hiển thị 'Phòng lưu'; KHÔNG có banner đỏ MCI; bảng đọc dữ liệu từ /observation/list; KpiStrip tính đúng số ca theo danh sách phòng lưu.",
    "evidence": [
     {
      "name": "TC-MCI-001__s01__list",
      "caption": "Màn cấp cứu nguồn Phòng lưu, badge 'Phòng lưu', không banner MCI",
      "uiState": "list"
     },
     {
      "name": "TC-MCI-001__s02__loading",
      "caption": "Trạng thái đang tải dữ liệu cấp cứu",
      "uiState": "loading"
     }
    ]
   },
   {
    "id": "TC-MCI-002",
    "title": "Mở màn Cấp cứu khi CÓ sự kiện MCI đang hoạt động: hiển thị nạn nhân MCI thật + banner đỏ",
    "category": "happy",
    "priority": "P0",
    "role": "Chỉ huy hiện trường / Bác sĩ cấp cứu",
    "preconditions": "Đã kích hoạt 1 sự kiện MCI (qua Code Blue hoặc activateMCI) → GET /api/mci/events/active trả 1 event.",
    "steps": [
     "Vào /v2/emergency-disaster",
     "Chờ tải",
     "Quan sát banner và badge nguồn",
     "Đọc toast 'Đang hiển thị MCI thật'"
    ],
    "expected": "Banner đỏ 'MCI ĐANG HOẠT ĐỘNG' hiển thị; badge nguồn = 'MCI'; bảng đọc nạn nhân từ /api/mci/events/{id}/victims; toast thông báo tên sự kiện + số ca.",
    "evidence": [
     {
      "name": "TC-MCI-002__s01__list",
      "caption": "Banner MCI đỏ + danh sách nạn nhân thật, badge 'MCI'",
      "uiState": "list"
     },
     {
      "name": "TC-MCI-002__s02__toast",
      "caption": "Toast 'Đang hiển thị MCI thật: <tên> (<n> ca)'",
      "uiState": "toast"
     }
    ]
   },
   {
    "id": "TC-MCI-003",
    "title": "Tiếp nhận ca cấp cứu thường (không MCI): tạo hồ sơ + phiên phòng lưu, hiển thị lại danh sách",
    "category": "happy",
    "priority": "P0",
    "role": "Điều dưỡng tiếp nhận cấp cứu",
    "preconditions": "Đăng nhập. Không có MCI đang hoạt động (nguồn = Phòng lưu).",
    "steps": [
     "Bấm 'Tiếp nhận cấp cứu'",
     "Chọn triage mức 3",
     "Nhập họ tên, giới Nam, tuổi 45, đường vào 'Xe cấp cứu 115'",
     "Nhập lý do 'Đau ngực dữ dội'",
     "Bấm Tiếp nhận",
     "Chờ reload"
    ],
    "expected": "Gọi registerEmergencyPatient (TreatmentType=3) + createObservationStay với triageLevel=3; toast 'Đã tiếp nhận cấp cứu · <tên> (<mã HSBA>)'; drawer đóng; ca mới xuất hiện đầu danh sách (sort theo giờ đến desc).",
    "evidence": [
     {
      "name": "TC-MCI-003__s01__drawer",
      "caption": "Drawer intake với banner 'Cấp cứu thường'",
      "uiState": "drawer"
     },
     {
      "name": "TC-MCI-003__s02__form",
      "caption": "Form đã nhập đầy đủ thông tin + triage mức 3",
      "uiState": "form"
     },
     {
      "name": "TC-MCI-003__s03__success",
      "caption": "Toast tiếp nhận thành công + ca mới trong bảng",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-MCI-004",
    "title": "Tiếp nhận nạn nhân vào sự kiện MCI đang hoạt động (registerVictim)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ triage MCI",
    "preconditions": "Có sự kiện MCI đang hoạt động (nguồn = MCI). Drawer intake hiển thị KHÔNG có banner 'Cấp cứu thường'.",
    "steps": [
     "Bấm 'Tiếp nhận cấp cứu'",
     "Chọn triage mức 1 (Hồi sức)",
     "Nhập họ tên hoặc để trống (chưa xác định)",
     "Nhập mô tả thương tích 'Vết thương đầu, gãy chân phải'",
     "Nhập cơ chế 'TNGT'",
     "Bấm Tiếp nhận"
    ],
    "expected": "Gọi POST /api/mci/victims với eventId hiện tại, injuries tách theo dấu phẩy thành mảng; toast 'Đã tiếp nhận ca cấp cứu'; danh sách nạn nhân reload qua getVictims; nạn nhân mới hiển thị với triage map mức 1.",
    "evidence": [
     {
      "name": "TC-MCI-004__s01__drawer",
      "caption": "Drawer intake trong ngữ cảnh MCI (không có banner cấp cứu thường)",
      "uiState": "drawer"
     },
     {
      "name": "TC-MCI-004__s02__success",
      "caption": "Nạn nhân MCI mới trong danh sách + toast",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-MCI-005",
    "title": "Kích hoạt Code Blue qua modal xác nhận danger",
    "category": "happy",
    "priority": "P0",
    "role": "Chỉ huy hiện trường",
    "preconditions": "Đăng nhập, ở màn /v2/emergency-disaster.",
    "steps": [
     "Bấm nút 'Code Blue'",
     "Đọc nội dung modal cảnh báo",
     "Bấm 'Kích hoạt Code Blue'",
     "Quan sát toast"
    ],
    "expected": "Modal hiển thị Tag cảnh báo đỏ 'Hành động thật, không thể hoàn tác'; sau xác nhận gọi POST /api/mci/activate-code-blue; toast 'Code Blue đã kích hoạt — Mã: <eventCode>'; sự kiện MCI alert Red được tạo.",
    "evidence": [
     {
      "name": "TC-MCI-005__s01__confirm",
      "caption": "Modal xác nhận Code Blue với cảnh báo đỏ",
      "uiState": "confirm"
     },
     {
      "name": "TC-MCI-005__s02__success",
      "caption": "Toast Code Blue đã kích hoạt + mã sự kiện",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-MCI-006",
    "title": "Huỷ giữa chừng modal Code Blue: KHÔNG tạo sự kiện",
    "category": "negative",
    "priority": "P1",
    "role": "Chỉ huy hiện trường",
    "preconditions": "Ở màn cấp cứu, không có MCI đang hoạt động.",
    "steps": [
     "Bấm 'Code Blue'",
     "Trong modal bấm 'Huỷ'",
     "Tải lại trang",
     "Kiểm tra badge nguồn + banner"
    ],
    "expected": "Không gọi API activate-code-blue; không tạo sự kiện; sau reload vẫn nguồn 'Phòng lưu', không banner MCI.",
    "evidence": [
     {
      "name": "TC-MCI-006__s01__confirm",
      "caption": "Modal Code Blue trước khi bấm Huỷ",
      "uiState": "confirm"
     }
    ]
   },
   {
    "id": "TC-MCI-007",
    "title": "Tiếp nhận cấp cứu thiếu cả lý do và mô tả thương tích: chặn + báo lỗi",
    "category": "validation",
    "priority": "P0",
    "role": "Điều dưỡng tiếp nhận",
    "preconditions": "Drawer intake đang mở.",
    "steps": [
     "Để trống cả 'Lý do vào cấp cứu' và 'Mô tả thương tích'",
     "Bấm 'Tiếp nhận'"
    ],
    "expected": "Hiển thị lỗi đỏ 'Nhập lý do vào cấp cứu hoặc mô tả thương tích'; KHÔNG gọi API; drawer giữ nguyên.",
    "evidence": [
     {
      "name": "TC-MCI-007__s01__validation",
      "caption": "Thông báo lỗi bắt buộc lý do/thương tích",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-MCI-008",
    "title": "Tuổi ước tính biên: 0, số âm, rất lớn (999), ký tự không phải số",
    "category": "edge",
    "priority": "P1",
    "role": "Điều dưỡng tiếp nhận",
    "preconditions": "Drawer intake mở, đã nhập lý do hợp lệ.",
    "steps": [
     "Nhập tuổi = 0 → Tiếp nhận",
     "Mở lại, nhập tuổi = -5 → Tiếp nhận",
     "Mở lại, nhập tuổi = 999 → Tiếp nhận",
     "Mở lại, nhập 'abc'"
    ],
    "expected": "Field number nên chặn/không chấp nhận giá trị âm và chuỗi; nếu gửi được, BE/FE phải xử lý an toàn (không NaN trong tuổi, không vỡ hiển thị '<n>T'); ghi nhận hành vi từng case để tạo bug nếu chấp nhận tuổi âm/999.",
    "evidence": [
     {
      "name": "TC-MCI-008__s01__validation",
      "caption": "Nhập tuổi âm/quá lớn trong field tuổi ước tính",
      "uiState": "validation"
     },
     {
      "name": "TC-MCI-008__s02__form",
      "caption": "Hiển thị tuổi trong bảng sau khi tiếp nhận giá trị biên",
      "uiState": "form"
     }
    ]
   },
   {
    "id": "TC-MCI-009",
    "title": "Tên nạn nhân chuỗi rất dài + ký tự đặc biệt + dấu tiếng Việt",
    "category": "edge",
    "priority": "P2",
    "role": "Điều dưỡng tiếp nhận",
    "preconditions": "Drawer intake mở.",
    "steps": [
     "Nhập họ tên = 300 ký tự gồm dấu tiếng Việt 'Nguyễn Văn Đặng...' + ký tự '<>&\"'",
     "Nhập lý do hợp lệ",
     "Tiếp nhận",
     "Mở chi tiết ca vừa tạo"
    ],
    "expected": "Tên dài hiển thị không vỡ layout bảng/drawer (truncate/wrap); dấu tiếng Việt hiển thị đúng; ký tự đặc biệt không gây lỗi và không bị thực thi (xem TC-MCI-026 cho XSS).",
    "evidence": [
     {
      "name": "TC-MCI-009__s01__form",
      "caption": "Form nhập tên dài + ký tự đặc biệt",
      "uiState": "form"
     },
     {
      "name": "TC-MCI-009__s02__detail",
      "caption": "Drawer chi tiết hiển thị tên dài không vỡ",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-MCI-010",
    "title": "Map triage category MCI (string) → mức 1-5 trên UI",
    "category": "data-consistency",
    "priority": "P1",
    "role": "QA / Bác sĩ triage",
    "preconditions": "Sự kiện MCI có nạn nhân với các triageCategory: Immediate/red, Delayed/yellow, Minor/green, Expectant/black.",
    "steps": [
     "Mở /v2/emergency-disaster nguồn MCI",
     "Đối chiếu chip triage từng nạn nhân với category gốc từ API"
    ],
    "expected": "Immediate/red → 1; Delayed/yellow → 3; Minor/green → 4; Expectant/Deceased/black → 2; mặc định không rõ → 3; màu chip khớp TRIAGE_LEVELS.",
    "evidence": [
     {
      "name": "TC-MCI-010__s01__list",
      "caption": "Bảng nạn nhân với chip triage map đúng từ category MCI",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-MCI-011",
    "title": "Chuyển nội trú phiên phòng lưu (escalate status=3) + đồng bộ danh sách",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ cấp cứu",
    "preconditions": "Nguồn Phòng lưu, có ít nhất 1 ca trạng thái Theo dõi (status đang lưu) còn stayId.",
    "steps": [
     "Trên 1 ca, bấm icon 'Chuyển nội trú'",
     "Chờ reload",
     "Kiểm tra trạng thái ca"
    ],
    "expected": "Gọi escalateObservationStay(stayId) (status=3); toast 'Đã chuyển <BN> sang nội trú'; sau reload ca chuyển sang 'Chuyển nội trú'; các nút Chuyển nội trú/Cho về ẩn đi với trạng thái admitted/discharged/referred.",
    "evidence": [
     {
      "name": "TC-MCI-011__s01__list",
      "caption": "Ca trước khi chuyển (còn nút action)",
      "uiState": "list"
     },
     {
      "name": "TC-MCI-011__s02__success",
      "caption": "Sau chuyển: trạng thái 'Chuyển nội trú', ẩn action",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-MCI-012",
    "title": "Cho về sau theo dõi (discharge status=2) phiên phòng lưu",
    "category": "state",
    "priority": "P1",
    "role": "Bác sĩ cấp cứu",
    "preconditions": "Nguồn Phòng lưu, có ca đang Theo dõi với stayId.",
    "steps": [
     "Bấm icon 'Cho về sau theo dõi'",
     "Chờ reload"
    ],
    "expected": "Gọi dischargeObservationStay(stayId) (status=2); toast 'Đã hoàn tất xử trí cho <BN>'; ca chuyển 'Cho về'; action ẩn.",
    "evidence": [
     {
      "name": "TC-MCI-012__s01__success",
      "caption": "Ca chuyển sang 'Cho về' sau xử trí",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-MCI-013",
    "title": "Lọc theo trạng thái + triage + tìm kiếm kết hợp trên bảng cấp cứu",
    "category": "ui",
    "priority": "P1",
    "role": "Bác sĩ cấp cứu",
    "preconditions": "Có nhiều ca với trạng thái và mức triage khác nhau.",
    "steps": [
     "Chọn tab trạng thái 'Theo dõi'",
     "Chọn lọc triage mức 1",
     "Gõ tìm tên BN",
     "Quan sát đếm trên tab + số dòng"
    ],
    "expected": "Bảng lọc giao của 3 điều kiện; số đếm trên tab khớp; reset page về 1 khi đổi filter; tìm kiếm khớp theo patientName/patientCode/code/complaint.",
    "evidence": [
     {
      "name": "TC-MCI-013__s01__filter",
      "caption": "Bảng sau khi áp tab + lọc triage + search",
      "uiState": "filter"
     },
     {
      "name": "TC-MCI-013__s02__tab",
      "caption": "Tab trạng thái với số đếm khớp",
      "uiState": "tab"
     }
    ]
   },
   {
    "id": "TC-MCI-014",
    "title": "Empty state: danh sách cấp cứu rỗng theo nguồn (MCI vs Phòng lưu)",
    "category": "ui",
    "priority": "P2",
    "role": "Bác sĩ cấp cứu",
    "preconditions": "Sự kiện MCI chưa có nạn nhân HOẶC không có phiên phòng lưu nào.",
    "steps": [
     "Mở màn ở nguồn MCI rỗng → đọc dòng empty",
     "Mở màn ở nguồn Phòng lưu rỗng → đọc dòng empty"
    ],
    "expected": "Nguồn MCI: 'Sự kiện MCI chưa có nạn nhân.'; Nguồn Phòng lưu: 'Chưa có ca cấp cứu nào đang theo dõi. Bấm “Tiếp nhận cấp cứu” để thêm.'",
    "evidence": [
     {
      "name": "TC-MCI-014__s01__empty",
      "caption": "Empty state bảng cấp cứu theo nguồn",
      "uiState": "empty"
     }
    ]
   },
   {
    "id": "TC-MCI-015",
    "title": "Dark/light parity màn cấp cứu (banner đỏ, chip triage, KPI)",
    "category": "ui",
    "priority": "P2",
    "role": "QA",
    "preconditions": "Có dữ liệu hiển thị, toggle dark/light ở topbar v2.",
    "steps": [
     "Mở /v2/emergency-disaster ở light",
     "Chuyển dark",
     "Đối chiếu chip triage, banner, KPI, badge nguồn"
    ],
    "expected": "Chữ/nền đủ tương phản ở cả 2 theme; chip màu triage giữ ý nghĩa; banner đỏ MCI và badge nguồn không bị chìm; không vỡ layout.",
    "evidence": [
     {
      "name": "TC-MCI-015__s01__list",
      "caption": "Màn cấp cứu light",
      "uiState": "list"
     },
     {
      "name": "TC-MCI-015__s02__list",
      "caption": "Màn cấp cứu dark, đối chiếu tương phản",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-MCI-016",
    "title": "Tiếp nhận khi API lỗi (BE 500/timeout): báo lỗi không mất dữ liệu nhập",
    "category": "negative",
    "priority": "P1",
    "role": "Điều dưỡng tiếp nhận",
    "preconditions": "Giả lập BE lỗi cho endpoint reception/observation hoặc /api/mci/victims (chặn mạng/DevTools).",
    "steps": [
     "Mở drawer intake, nhập hợp lệ",
     "Bấm Tiếp nhận khi API lỗi"
    ],
    "expected": "Toast lỗi 'Tiếp nhận thất bại. Vui lòng thử lại.'; nút trở lại trạng thái không submitting; danh sách không thêm ca rác.",
    "evidence": [
     {
      "name": "TC-MCI-016__s01__error",
      "caption": "Toast tiếp nhận thất bại khi API lỗi",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-MCI-017",
    "title": "Phân quyền: vai trò không đủ quyền bị chặn menu/nút Code Blue & tiếp nhận (matrix #216)",
    "category": "permission",
    "priority": "P0",
    "role": "Vai trò hạn chế (vd Kế toán/Lễ tân không thuộc cấp cứu)",
    "preconditions": "Có tài khoản vai trò không được cấp quyền MCI/cấp cứu; tham chiếu matrix #216.",
    "steps": [
     "Đăng nhập vai trò hạn chế",
     "Truy cập trực tiếp /v2/emergency-disaster",
     "Thử bấm Code Blue / Tiếp nhận",
     "Gọi trực tiếp POST /api/mci/activate-code-blue bằng token vai trò đó"
    ],
    "expected": "Menu cấp cứu ẩn hoặc route bị chặn; nếu vào được màn, các nút mutate phải bị chặn; API trả 403/401 cho vai trò không đủ quyền (KHÔNG để mọi user [Authorize] đều activate được Code Blue — nếu được, tạo bug an toàn).",
    "evidence": [
     {
      "name": "TC-MCI-017__s01__permission",
      "caption": "Vai trò hạn chế bị chặn menu/nút/API cấp cứu",
      "uiState": "permission"
     }
    ]
   },
   {
    "id": "TC-MCI-018",
    "title": "Đăng ký ca chấn thương mới (Trauma) — happy path",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ chấn thương",
    "preconditions": "Đăng nhập, ở /v2/trauma-registry.",
    "steps": [
     "Bấm 'Đăng ký ca'",
     "Nhập Mã ca, Họ tên BN, Ngày nhập viện, Loại chấn thương",
     "Chọn Triage = VÀNG",
     "Nhập ISS=18, RTS=7, GCS=14, BS điều trị",
     "Bấm Lưu"
    ],
    "expected": "Gọi POST /trauma-registry/cases; toast 'Đã đăng ký ca'; modal đóng; ca xuất hiện trong bảng với badge triage vàng; ISS=18 tô màu cam (>=16).",
    "evidence": [
     {
      "name": "TC-MCI-018__s01__modal",
      "caption": "Modal đăng ký ca chấn thương đã nhập",
      "uiState": "modal"
     },
     {
      "name": "TC-MCI-018__s02__success",
      "caption": "Ca mới trong bảng + toast đăng ký",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-MCI-019",
    "title": "Đăng ký ca chấn thương thiếu field bắt buộc: chặn submit",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ chấn thương",
    "preconditions": "Modal đăng ký ca mở.",
    "steps": [
     "Để trống Mã ca / Họ tên BN / Ngày nhập viện / Loại chấn thương / Triage",
     "Bấm Lưu"
    ],
    "expected": "Các field required (caseCode, patientName, admissionDate, injuryType, triageCategory) báo lỗi bắt buộc; KHÔNG gọi API tạo; modal giữ nguyên.",
    "evidence": [
     {
      "name": "TC-MCI-019__s01__validation",
      "caption": "Lỗi bắt buộc các field Trauma required",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-MCI-020",
    "title": "Cập nhật ca chấn thương: Mã ca bị khoá (disabledOnEdit), đổi trạng thái/điểm",
    "category": "state",
    "priority": "P1",
    "role": "Bác sĩ chấn thương",
    "preconditions": "Có ít nhất 1 ca chấn thương.",
    "steps": [
     "Mở chi tiết 1 ca → Cập nhật (hoặc icon edit)",
     "Xác nhận field Mã ca không sửa được",
     "Đổi Trạng thái 'Nhập viện' → 'ICU'",
     "Đổi GCS=7",
     "Lưu"
    ],
    "expected": "Field Mã ca disabled; gọi PUT /trauma-registry/cases/{id}; toast 'Đã cập nhật ca'; tab ICU tăng đếm; GCS=7 tô màu đỏ (<=8); badge trạng thái = ICU.",
    "evidence": [
     {
      "name": "TC-MCI-020__s01__modal",
      "caption": "Modal cập nhật với Mã ca bị khoá",
      "uiState": "modal"
     },
     {
      "name": "TC-MCI-020__s02__success",
      "caption": "Ca chuyển ICU + GCS tô đỏ sau cập nhật",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-MCI-021",
    "title": "Điểm ISS/RTS/GCS biên: 0, âm, quá ngưỡng (ISS>75, GCS>15/<3)",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ chấn thương",
    "preconditions": "Modal đăng ký/cập nhật ca mở.",
    "steps": [
     "Nhập ISS = -1 → Lưu",
     "Nhập ISS = 999 → Lưu",
     "Nhập GCS = 20 (ngoài 3-15) → Lưu",
     "Nhập GCS = 0 → Lưu"
    ],
    "expected": "Hệ thống nên ràng buộc miền hợp lệ (ISS 0-75, GCS 3-15); nếu chấp nhận giá trị vô lý → ghi nhận + tạo bug; màu tô theo ngưỡng không vỡ; hiển thị số đúng định dạng.",
    "evidence": [
     {
      "name": "TC-MCI-021__s01__validation",
      "caption": "Nhập điểm ngoài miền hợp lệ",
      "uiState": "validation"
     },
     {
      "name": "TC-MCI-021__s02__detail",
      "caption": "Drawer chi tiết hiển thị điểm biên + màu ngưỡng",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-MCI-022",
    "title": "Ngày bị thương / nhập viện biên: tương lai, quá khứ xa, bị thương sau nhập viện",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ chấn thương",
    "preconditions": "Modal ca chấn thương mở.",
    "steps": [
     "Đặt Ngày bị thương = ngày tương lai",
     "Đặt Ngày nhập viện < Ngày bị thương (mâu thuẫn logic)",
     "Đặt ngày = 01/01/1900",
     "Lưu và quan sát"
    ],
    "expected": "Nên cảnh báo/chặn ngày tương lai và mâu thuẫn (nhập viện trước khi bị thương); nếu không có ràng buộc → tạo bug data-consistency; hiển thị ngày định dạng DD/MM/YYYY HH:mm không lỗi.",
    "evidence": [
     {
      "name": "TC-MCI-022__s01__validation",
      "caption": "Nhập ngày tương lai / mâu thuẫn bị thương-nhập viện",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-MCI-023",
    "title": "Báo cáo kết cục chấn thương (Outcome Report): mở, tính breakdown, loading & error",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Bác sĩ chấn thương / Quản lý",
    "preconditions": "Có nhiều ca chấn thương với outcome/triage/loại khác nhau.",
    "steps": [
     "Mở chi tiết 1 ca → 'In báo cáo' (hoặc nút mở report)",
     "Đọc Tổng quan, Kết cục, Triage, Loại chấn thương",
     "Đối chiếu tổng count với số ca",
     "Giả lập API lỗi để xem error"
    ],
    "expected": "Hiển thị loading khi tải; totalCases khớp; outcomeBreakdown % cộng ~100%; triageBreakdown badge theo màu; khi API lỗi đóng drawer + toast 'Không tải được báo cáo kết cục'.",
    "evidence": [
     {
      "name": "TC-MCI-023__s01__loading",
      "caption": "Drawer báo cáo đang tải",
      "uiState": "loading"
     },
     {
      "name": "TC-MCI-023__s02__drawer",
      "caption": "Báo cáo kết cục với breakdown đầy đủ",
      "uiState": "drawer"
     },
     {
      "name": "TC-MCI-023__s03__error",
      "caption": "Toast lỗi tải báo cáo kết cục",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-MCI-024",
    "title": "Empty state & lọc Trauma: không ca, bỏ lọc, tab + triage filter",
    "category": "ui",
    "priority": "P2",
    "role": "Bác sĩ chấn thương",
    "preconditions": "DB không có ca chấn thương HOẶC lọc ra rỗng.",
    "steps": [
     "Lọc triage = ĐEN + tab 'Tử vong' để ra rỗng",
     "Quan sát empty",
     "Bấm 'Bỏ lọc'",
     "Quan sát danh sách đầy lại"
    ],
    "expected": "Empty hiển thị 'Chưa có ca chấn thương' (hoặc 'Đang tải…' khi loading); 'Bỏ lọc' reset search/triage/tab; KpiStrip giữ tổng đúng.",
    "evidence": [
     {
      "name": "TC-MCI-024__s01__empty",
      "caption": "Empty state bảng Trauma sau khi lọc rỗng",
      "uiState": "empty"
     },
     {
      "name": "TC-MCI-024__s02__filter",
      "caption": "Sau bỏ lọc danh sách hiển thị lại",
      "uiState": "filter"
     }
    ]
   },
   {
    "id": "TC-MCI-025",
    "title": "Phân quyền Trauma: vai trò không quyền bị chặn nút Đăng ký/Cập nhật + API",
    "category": "permission",
    "priority": "P1",
    "role": "Vai trò hạn chế",
    "preconditions": "Tài khoản không được cấp quyền sổ chấn thương (matrix #216).",
    "steps": [
     "Đăng nhập vai trò hạn chế",
     "Vào /v2/trauma-registry",
     "Thử bấm Đăng ký ca / Cập nhật",
     "Gọi trực tiếp POST/PUT /trauma-registry/cases bằng token đó"
    ],
    "expected": "Nút mutate bị ẩn/chặn theo quyền; API trả 403 cho vai trò không đủ; xem được (nếu cho phép) nhưng không sửa/tạo.",
    "evidence": [
     {
      "name": "TC-MCI-025__s01__permission",
      "caption": "Vai trò hạn chế bị chặn tạo/sửa ca chấn thương",
      "uiState": "permission"
     }
    ]
   },
   {
    "id": "TC-MCI-026",
    "title": "XSS ở field Ghi chú / mô tả thương tích / lý do (Trauma + intake)",
    "category": "security",
    "priority": "P0",
    "role": "Kiểm thử bảo mật",
    "preconditions": "Có quyền tạo ca/tiếp nhận.",
    "steps": [
     "Tạo ca/intake với Ghi chú = '<img src=x onerror=alert(1)>' và mô tả thương tích chứa <script>",
     "Lưu",
     "Mở lại chi tiết/drawer hiển thị field đó"
    ],
    "expected": "Payload hiển thị dưới dạng text thuần, KHÔNG thực thi JS; không có popup alert; React escape mặc định — nếu phát hiện render thô (dangerouslySetInnerHTML) thì tạo bug security.",
    "evidence": [
     {
      "name": "TC-MCI-026__s01__detail",
      "caption": "Field ghi chú hiển thị payload XSS dạng text, không thực thi",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-MCI-027",
    "title": "IDOR: truy cập victim/event/case bằng Id của sự kiện khác",
    "category": "security",
    "priority": "P0",
    "role": "Kiểm thử bảo mật",
    "preconditions": "Có >=2 sự kiện MCI và biết Id victim/case thuộc sự kiện khác.",
    "steps": [
     "Lấy token user",
     "Gọi GET /api/mci/victims/{idCủaSựKiệnKhác}",
     "Gọi GET /api/mci/events/{id}/victims với eventId không thuộc quyền",
     "Gọi GET /trauma-registry/cases/{id} của ca không liên quan"
    ],
    "expected": "Hệ thống chỉ trả dữ liệu mà user được phép; không lộ thông tin nạn nhân/ca của sự kiện không thuộc phạm vi; nếu trả thẳng theo Id mà không kiểm quyền → tạo bug IDOR (lộ dữ liệu nhạy cảm nạn nhân).",
    "evidence": [
     {
      "name": "TC-MCI-027__s01__permission",
      "caption": "Kết quả gọi API bằng Id sự kiện khác (kiểm IDOR)",
      "uiState": "permission"
     }
    ]
   },
   {
    "id": "TC-MCI-028",
    "title": "Audit log ghi nhận các mutation MCI/Trauma (kích hoạt, tiếp nhận, dispose, cập nhật)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản trị / Kiểm toán",
    "preconditions": "Đã thực hiện Code Blue + tiếp nhận victim + cập nhật trauma ở các TC trước.",
    "steps": [
     "Thực hiện 1 chuỗi mutation (activate Code Blue, register victim, update trauma case)",
     "Mở màn nhật ký/audit (hoặc query AuditLog)",
     "Đối chiếu thao tác + user + thời gian"
    ],
    "expected": "Mỗi mutation ghi audit với CreatedBy là user thật (≠ Guid.Empty), đúng loại thao tác và đối tượng; nếu thiếu audit cho mutation an toàn người bệnh → tạo bug.",
    "evidence": [
     {
      "name": "TC-MCI-028__s01__detail",
      "caption": "Bản ghi audit cho mutation MCI/Trauma",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-MCI-029",
    "title": "Phân trang bảng cấp cứu/Trauma: biên trang, page > totalPages tự kẹp",
    "category": "edge",
    "priority": "P2",
    "role": "Bác sĩ cấp cứu",
    "preconditions": "Số ca > PAGE_SIZE (18) ở 1 trong 2 màn.",
    "steps": [
     "Sang trang cuối",
     "Áp filter làm giảm tổng số dòng < trang hiện tại",
     "Quan sát page tự kẹp về totalPages",
     "Bấm Trước/Sau ở biên"
    ],
    "expected": "page tự kẹp về totalPages khi vượt; nút Trước disabled ở trang 1, Sau disabled ở trang cuối; footer 'Hiển thị x-y / N ca' đúng.",
    "evidence": [
     {
      "name": "TC-MCI-029__s01__list",
      "caption": "Phân trang biên + footer đếm đúng",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-MCI-030",
    "title": "Console-error smoke khi tải 2 màn MCI/Trauma",
    "category": "ui",
    "priority": "P1",
    "role": "QA",
    "preconditions": "BE chạy localhost:5106, FE 3001, đăng nhập.",
    "steps": [
     "Mở DevTools Console",
     "Vào /v2/emergency-disaster rồi /v2/trauma-registry",
     "Tương tác mở drawer/modal/report"
    ],
    "expected": "Không có console error đỏ ngoài các cảnh báo dự kiến (SignalR/HMR đã loại); API thất bại dùng console.warn không phải error; không lỗi React render.",
    "evidence": [
     {
      "name": "TC-MCI-030__s01__list",
      "caption": "Console sạch khi tải 2 màn MCI/Trauma",
      "uiState": "list"
     }
    ]
   }
  ],
  "ui_state_checklist": [
   "list - bảng cấp cứu (nguồn MCI và nguồn Phòng lưu)",
   "list - bảng Trauma Registry",
   "loading - đang tải dữ liệu cấp cứu / báo cáo kết cục",
   "empty - không có ca cấp cứu / nạn nhân MCI / ca chấn thương",
   "error - tiếp nhận/báo cáo/API thất bại (toast)",
   "drawer - chi tiết ca cấp cứu",
   "drawer - intake tiếp nhận cấp cứu mới (MCI vs cấp cứu thường)",
   "drawer - chi tiết ca chấn thương",
   "drawer - báo cáo kết cục chấn thương",
   "modal - confirm Code Blue (danger)",
   "modal - CRUD ca chấn thương (đăng ký/cập nhật, Mã ca khoá khi sửa)",
   "form - nhập liệu intake / trauma (giá trị biên, ký tự đặc biệt)",
   "validation - thiếu field bắt buộc, giá trị ngoài miền, ngày mâu thuẫn",
   "filter - lọc trạng thái + triage + tìm kiếm; bỏ lọc",
   "tab - StatusTabs với số đếm",
   "success - toast tiếp nhận/kích hoạt/cập nhật + cập nhật danh sách",
   "toast - thông báo nguồn MCI/thành công/thất bại",
   "confirm - xác nhận Code Blue",
   "permission - vai trò hạn chế bị chặn menu/nút/API; IDOR",
   "detail - audit log / hiển thị field XSS dạng text",
   "dark/light parity - banner đỏ, chip triage, KPI, badge nguồn"
  ],
  "gaps": [
   "Phân hệ MCI hiện CHƯA có issue test riêng trên GitHub (không nằm trong #216-289) → đây là GAP, ứng viên tạo issue test mới (KHÔNG tự tạo, để user duyệt).",
   "Permission matrix #216 cho cấp cứu/MCI chưa được map cụ thể trong code FE (route /v2/* không thấy guard riêng theo role MCI) — cần xác minh ai được Code Blue/tiếp nhận/dispose; rủi ro mọi user [Authorize] đều activate Code Blue.",
   "IDOR: API /api/mci/victims/{id} và /trauma-registry/cases/{id} truy cập theo Id thô — chưa thấy kiểm quyền theo sự kiện/khoa; dữ liệu nạn nhân nhạy cảm cần test lộ chéo.",
   "Màn Cấp cứu hiện chỉ dùng 2 trong nhiều luồng MCI thật: nhiều nghiệp vụ giàu của BE (re-triage START, dispose victim Admitted/OR/ICU/Transferred/Deceased, record vitals, procedures/medications, Command Center, Resource management beds/OR/blood, Family Notification/Inquiry hotline, Situation/Authority report, Dashboard readiness, deactivate MCI) CHƯA có UI/test — cần bổ sung test khi UI hoàn thiện hoặc test ở mức API.",
   "Báo cáo Sở Y tế (MCISituationReports / MCIAuthorityReportDto, reportToAuthority) là bảng nghiệp vụ trong rel nhưng chưa thấy UI ở 2 màn v2 — cần test riêng (Initial/Update/Final) khi có màn.",
   "Truyền máu/đối chiếu nhóm máu trong MCI (BloodResourceDto/BloodInventory) liên quan an toàn người bệnh nhưng chưa có UI test — patient-safety gap.",
   "Đối chiếu data-consistency xuyên phân hệ: nạn nhân MCI dispose Admitted → có sinh HSBA nội trú/viện phí không? Trauma case có nối Admission/billing không? Chưa kiểm chuỗi tạo A→B→C.",
   "Ràng buộc miền điểm (ISS 0-75, GCS 3-15, RTS) và ngày (bị thương ≤ nhập viện, không tương lai) chưa rõ có validate BE — cần xác minh để biết các TC edge sẽ pass hay sinh bug.",
   "Realtime/SignalR cho bảng cấp cứu (nhiều người cùng cập nhật khi MCI) — hiện reload thủ công; chưa có test đồng thời/đa người dùng.",
   "Field state: dữ liệu phiên phòng lưu chỉ mang field cấp-list nên sinh hiệu hiển thị '—' trên màn cấp cứu (nguồn observation) — cần phân biệt rõ với nguồn MCI khi viết test sinh hiệu, tránh nhầm là bug."
  ]
 },
 {
  "id": "env",
  "code": "ENV",
  "layer": "spec",
  "ic": "♻️",
  "nm": "Môi trường · Chất thải · ATTP",
  "gh": [
   "#269"
  ],
  "gap": false,
  "module_id": "env",
  "summary": "Phân hệ \"Môi trường · Chất thải · ATTP\" (id=env, lớp spec) quản lý chất thải y tế, quan trắc môi trường và an toàn thực phẩm bệnh viện. Gồm 5 bảng chính: WasteRecords (chất thải y tế: lây nhiễm/sắc nhọn/hóa học/thông thường — khối lượng, phân loại, vận chuyển/xử lý), EnvironmentalMonitorings (quan trắc môi trường: nước thải/khí/tiếng ồn/vi khí hậu — chỉ số đo vs ngưỡng QCVN), FoodPoisoningIncidents (sự cố ngộ độc thực phẩm), FoodSafetySamples (mẫu ATTP lấy/xét nghiệm) và FoodEstablishmentInspections (kiểm tra cơ sở thực phẩm/bếp ăn). Các màn chính suy ra: danh sách + form/drawer cho 5 nghiệp vụ, dashboard KPI, và liên kết nội bộ (mẫu ATTP gắn sự cố ngộ độc, quan trắc vượt ngưỡng cảnh báo). Đây là phân hệ spec đơn giản, ít liên thông ngoài, nhưng có nhiều ràng buộc trạng thái (ghi nhận → vận chuyển → xử lý / lấy mẫu → xét nghiệm → kết luận) và validation số liệu (khối lượng, ngưỡng đo).",
  "screens": [
   {
    "name": "Dashboard Môi trường-Chất thải-ATTP",
    "desc": "Trang tổng quan KPI: tổng khối lượng chất thải theo loại trong kỳ, số lần quan trắc vượt ngưỡng, số sự cố ngộ độc TP, số cơ sở kiểm tra đạt/không đạt. Có dải KpiStrip + biểu đồ + bộ lọc kỳ.",
    "route_guess": "/v2/env",
    "elements": [
     "KpiStrip (4-6 thẻ)",
     "Bộ lọc khoảng thời gian",
     "Biểu đồ chất thải theo loại",
     "Bảng cảnh báo vượt ngưỡng gần nhất"
    ]
   },
   {
    "name": "Danh sách Chất thải y tế (WasteRecords)",
    "desc": "Bảng nhật ký phát sinh chất thải y tế theo ngày/khoa/loại (lây nhiễm, sắc nhọn, hóa học, phóng xạ, thông thường), khối lượng (kg), trạng thái (Ghi nhận/Vận chuyển/Đã xử lý). Có StatusTabs + filter + nút thêm.",
    "route_guess": "/v2/env/waste",
    "elements": [
     "StatusTabs theo trạng thái",
     "DataTable cột: ngày, khoa, loại, khối lượng, đơn vị xử lý, trạng thái",
     "Filter loại/khoa/ngày",
     "Nút Thêm bản ghi",
     "KpiStrip tổng khối lượng"
    ]
   },
   {
    "name": "Form/Drawer Chất thải y tế",
    "desc": "Form thêm/sửa bản ghi chất thải: chọn khoa, loại chất thải, khối lượng (kg), ngày phát sinh, mã túi/thùng, đơn vị vận chuyển, đơn vị xử lý, ghi chú. Validation khối lượng > 0.",
    "route_guess": "/v2/env/waste (DrawerShell)",
    "elements": [
     "Select khoa",
     "Select loại chất thải",
     "InputNumber khối lượng (kg)",
     "DatePicker ngày phát sinh",
     "Input đơn vị vận chuyển/xử lý",
     "Textarea ghi chú",
     "Nút Lưu/Hủy"
    ]
   },
   {
    "name": "Danh sách Quan trắc môi trường (EnvironmentalMonitorings)",
    "desc": "Bảng kết quả quan trắc: loại (nước thải, khí thải, tiếng ồn, vi khí hậu), điểm đo, chỉ tiêu, giá trị đo, ngưỡng QCVN, kết luận đạt/vượt. Highlight dòng vượt ngưỡng.",
    "route_guess": "/v2/env/monitoring",
    "elements": [
     "DataTable cột: ngày, loại, điểm đo, chỉ tiêu, giá trị, ngưỡng, kết luận",
     "Filter loại/điểm đo/kỳ",
     "Badge Đạt/Vượt ngưỡng",
     "Nút Thêm kết quả quan trắc"
    ]
   },
   {
    "name": "Form/Drawer Quan trắc môi trường",
    "desc": "Form nhập kết quả quan trắc: loại, điểm đo, chỉ tiêu (BOD/COD/TSS/pH/độ ồn...), giá trị đo, đơn vị, ngưỡng cho phép, ngày đo, đơn vị quan trắc. Tự kết luận Đạt/Vượt theo so sánh giá trị vs ngưỡng.",
    "route_guess": "/v2/env/monitoring (DrawerShell)",
    "elements": [
     "Select loại quan trắc",
     "Input điểm đo",
     "Select/Input chỉ tiêu",
     "InputNumber giá trị + ngưỡng",
     "DatePicker ngày đo",
     "Hiển thị kết luận tự tính",
     "Nút Lưu"
    ]
   },
   {
    "name": "Danh sách Sự cố ngộ độc thực phẩm (FoodPoisoningIncidents)",
    "desc": "Bảng sự cố ngộ độc TP: ngày xảy ra, địa điểm/bếp ăn, số người ảnh hưởng, triệu chứng, mức độ, trạng thái xử lý (Mới/Đang điều tra/Đã kết luận/Đóng).",
    "route_guess": "/v2/env/food-poisoning",
    "elements": [
     "StatusTabs trạng thái",
     "DataTable cột: ngày, địa điểm, số ca, mức độ, trạng thái",
     "Filter mức độ/ngày",
     "Nút Khai báo sự cố",
     "Link tới mẫu ATTP liên quan"
    ]
   },
   {
    "name": "Detail/Drawer Sự cố ngộ độc thực phẩm",
    "desc": "Chi tiết sự cố: thông tin chung, danh sách người ảnh hưởng, mẫu ATTP đã lấy gắn với sự cố, diễn biến/kết luận điều tra, audit. Có tab thông tin + tab mẫu + tab xử lý.",
    "route_guess": "/v2/env/food-poisoning/:id",
    "elements": [
     "Tab Thông tin chung",
     "Tab Mẫu ATTP liên quan",
     "Tab Diễn biến/Kết luận",
     "Nút chuyển trạng thái",
     "Khối ghi chú"
    ]
   },
   {
    "name": "Danh sách Mẫu ATTP (FoodSafetySamples)",
    "desc": "Bảng mẫu an toàn thực phẩm lấy để xét nghiệm: mã mẫu, loại thực phẩm, nơi lấy, ngày lấy, chỉ tiêu xét nghiệm, kết quả (Đạt/Không đạt/Chờ KQ), gắn sự cố nếu có.",
    "route_guess": "/v2/env/food-samples",
    "elements": [
     "StatusTabs (Chờ KQ/Đạt/Không đạt)",
     "DataTable cột: mã mẫu, loại TP, nơi lấy, ngày, kết quả",
     "Filter kết quả/ngày",
     "Nút Lấy mẫu mới"
    ]
   },
   {
    "name": "Form/Drawer Mẫu ATTP",
    "desc": "Form lấy/nhập kết quả mẫu ATTP: loại thực phẩm, nơi lấy, ngày lấy, chỉ tiêu (vi sinh/hóa lý), kết quả, kết luận, gắn vào sự cố ngộ độc (tùy chọn). Validation field bắt buộc.",
    "route_guess": "/v2/env/food-samples (DrawerShell)",
    "elements": [
     "Input loại thực phẩm",
     "Input nơi lấy mẫu",
     "DatePicker ngày lấy",
     "Select chỉ tiêu",
     "Select kết quả",
     "Select gắn sự cố (optional)",
     "Nút Lưu"
    ]
   },
   {
    "name": "Danh sách Kiểm tra cơ sở thực phẩm (FoodEstablishmentInspections)",
    "desc": "Bảng đợt kiểm tra cơ sở/bếp ăn: tên cơ sở, ngày kiểm tra, đoàn kiểm tra, điểm/kết luận (Đạt/Không đạt), kiến nghị, trạng thái.",
    "route_guess": "/v2/env/inspections",
    "elements": [
     "DataTable cột: cơ sở, ngày, đoàn KT, kết luận, trạng thái",
     "Filter kết luận/ngày",
     "Badge Đạt/Không đạt",
     "Nút Tạo đợt kiểm tra",
     "Drawer chi tiết checklist"
    ]
   },
   {
    "name": "Form/Drawer Kiểm tra cơ sở thực phẩm",
    "desc": "Form đợt kiểm tra: tên cơ sở, địa chỉ, ngày, thành viên đoàn, checklist tiêu chí (đạt/không đạt từng mục), tổng điểm, kết luận, kiến nghị/ghi chú.",
    "route_guess": "/v2/env/inspections (DrawerShell)",
    "elements": [
     "Input tên cơ sở",
     "DatePicker ngày kiểm tra",
     "Input đoàn kiểm tra",
     "Checklist tiêu chí",
     "Hiển thị kết luận",
     "Textarea kiến nghị",
     "Nút Lưu"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-ENV-001",
    "title": "Dashboard env hiển thị đúng KPI khi có dữ liệu",
    "category": "happy",
    "priority": "P1",
    "role": "Quản lý môi trường/Admin",
    "preconditions": "Đã login admin/Admin@123 vào /v2. Có sẵn dữ liệu chất thải, quan trắc, sự cố, mẫu, kiểm tra trong kỳ hiện tại.",
    "steps": [
     "Mở /v2/env",
     "Chờ trang load xong",
     "Đối chiếu số trên các thẻ KpiStrip với dữ liệu thực trong DB/các danh sách con",
     "Đổi bộ lọc khoảng thời gian sang kỳ khác và quan sát KPI cập nhật"
    ],
    "expected": "KpiStrip hiển thị đúng tổng khối lượng chất thải theo loại, số lần quan trắc vượt ngưỡng, số sự cố ngộ độc và số cơ sở kiểm tra; số liệu khớp danh sách con; đổi kỳ lọc thì KPI tính lại đúng.",
    "evidence": [
     {
      "name": "TC-ENV-001__s01__list",
      "caption": "Dashboard env với KpiStrip có dữ liệu",
      "uiState": "list"
     },
     {
      "name": "TC-ENV-001__s02__filter",
      "caption": "KPI sau khi đổi bộ lọc kỳ",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ],
    "notes": "Kiểm tra format số/khối lượng (kg) và ngày tiếng Việt."
   },
   {
    "id": "TC-ENV-002",
    "title": "Dashboard env trạng thái empty khi chưa có dữ liệu kỳ",
    "category": "ui",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Login admin. Chọn kỳ lọc không có bản ghi nào.",
    "steps": [
     "Mở /v2/env",
     "Đặt bộ lọc kỳ về khoảng thời gian không có dữ liệu",
     "Quan sát KpiStrip và biểu đồ"
    ],
    "expected": "KPI hiển thị 0 (không vỡ layout, không NaN/undefined); biểu đồ và bảng cảnh báo hiện empty state có thông báo rõ ràng tiếng Việt.",
    "evidence": [
     {
      "name": "TC-ENV-002__s01__empty",
      "caption": "Dashboard env empty state khi không có dữ liệu",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-003",
    "title": "Dark/Light parity cho dashboard và danh sách env",
    "category": "ui",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Login admin, ở /v2/env.",
    "steps": [
     "Mở /v2/env ở light mode",
     "Toggle dark mode trên topbar v2",
     "Lần lượt mở các danh sách con (waste/monitoring/food-samples/inspections) ở dark mode",
     "Quan sát màu nền, chữ, badge trạng thái, highlight dòng vượt ngưỡng"
    ],
    "expected": "Tất cả màn ở cả light/dark đều đọc được, đủ tương phản; badge Đạt/Vượt/Không đạt và highlight dòng vượt ngưỡng giữ ý nghĩa màu ở cả 2 theme; không có chữ trắng trên nền trắng hay ngược lại.",
    "evidence": [
     {
      "name": "TC-ENV-003__s01__list",
      "caption": "Danh sách env ở light mode",
      "uiState": "list"
     },
     {
      "name": "TC-ENV-003__s02__list",
      "caption": "Danh sách env ở dark mode (parity)",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-004",
    "title": "Thêm bản ghi chất thải y tế hợp lệ (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Nhân viên kiểm soát nhiễm khuẩn/môi trường",
    "preconditions": "Login admin. Ở /v2/env/waste. Có danh mục khoa và loại chất thải.",
    "steps": [
     "Bấm Thêm bản ghi",
     "Chọn khoa, loại chất thải = Lây nhiễm",
     "Nhập khối lượng = 12.5 kg",
     "Chọn ngày phát sinh = hôm nay",
     "Nhập đơn vị vận chuyển/xử lý",
     "Bấm Lưu"
    ],
    "expected": "Lưu thành công, hiện toast/success; bản ghi mới xuất hiện đầu danh sách với đúng khoa/loại/khối lượng/ngày; trạng thái mặc định = Ghi nhận; audit log ghi mutation với user thật.",
    "evidence": [
     {
      "name": "TC-ENV-004__s01__form",
      "caption": "Form thêm chất thải đã điền hợp lệ",
      "uiState": "form"
     },
     {
      "name": "TC-ENV-004__s02__success",
      "caption": "Toast lưu thành công",
      "uiState": "success"
     },
     {
      "name": "TC-ENV-004__s03__list",
      "caption": "Bản ghi mới trong danh sách",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-005",
    "title": "Validation field bắt buộc khi thêm chất thải y tế",
    "category": "validation",
    "priority": "P0",
    "role": "NV môi trường",
    "preconditions": "Login admin, mở form thêm chất thải tại /v2/env/waste.",
    "steps": [
     "Bấm Thêm bản ghi",
     "Để trống khoa, loại chất thải, khối lượng",
     "Bấm Lưu",
     "Lần lượt điền từng field rồi để trống field còn lại để kiểm tra thông báo"
    ],
    "expected": "Không submit được; mỗi field bắt buộc (khoa, loại, khối lượng, ngày) hiện lỗi đỏ ngay dưới field bằng tiếng Việt rõ ràng; focus về field lỗi đầu tiên.",
    "evidence": [
     {
      "name": "TC-ENV-005__s01__validation",
      "caption": "Form chất thải báo lỗi các field bắt buộc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-006",
    "title": "Edge/boundary khối lượng chất thải (0, âm, rất lớn, thập phân)",
    "category": "edge",
    "priority": "P1",
    "role": "NV môi trường",
    "preconditions": "Login admin, mở form thêm chất thải.",
    "steps": [
     "Nhập khối lượng = 0 → Lưu",
     "Nhập khối lượng = -5 → Lưu",
     "Nhập khối lượng = 9999999999 → Lưu",
     "Nhập khối lượng = 0.001 → Lưu",
     "Nhập khối lượng có dấu phẩy thập phân kiểu VN '12,5' → Lưu"
    ],
    "expected": "Khối lượng 0 và âm bị chặn với thông báo phải > 0; số rất lớn hoặc bị chặn theo max hợp lý hoặc lưu nhưng không tràn/format đúng; thập phân hợp lệ chấp nhận; định dạng nhập số (dấu , vs .) được xử lý nhất quán không gây lưu sai giá trị.",
    "evidence": [
     {
      "name": "TC-ENV-006__s01__validation",
      "caption": "Báo lỗi khối lượng 0/âm",
      "uiState": "validation"
     },
     {
      "name": "TC-ENV-006__s02__edge",
      "caption": "Nhập số rất lớn / thập phân biên",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-007",
    "title": "Edge ngày phát sinh tương lai / quá khứ xa cho chất thải",
    "category": "edge",
    "priority": "P2",
    "role": "NV môi trường",
    "preconditions": "Login admin, mở form thêm chất thải.",
    "steps": [
     "Chọn ngày phát sinh = ngày trong tương lai → Lưu",
     "Chọn ngày phát sinh = năm 1900 → Lưu",
     "Quan sát validation"
    ],
    "expected": "Ngày tương lai bị chặn hoặc cảnh báo (chất thải không thể phát sinh ở tương lai); ngày quá xa quá khứ bị chặn/cảnh báo; thông báo tiếng Việt rõ ràng.",
    "evidence": [
     {
      "name": "TC-ENV-007__s01__validation",
      "caption": "Cảnh báo ngày phát sinh không hợp lệ",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-008",
    "title": "Hủy giữa chừng khi thêm chất thải không tạo bản ghi rác",
    "category": "negative",
    "priority": "P1",
    "role": "NV môi trường",
    "preconditions": "Login admin, ở /v2/env/waste.",
    "steps": [
     "Bấm Thêm bản ghi",
     "Điền một phần dữ liệu",
     "Bấm Hủy / đóng Drawer",
     "Mở lại danh sách"
    ],
    "expected": "Không có bản ghi nào được tạo; số lượng dòng không đổi; mở lại form thì các field đã reset (không giữ dữ liệu dở của lần trước).",
    "evidence": [
     {
      "name": "TC-ENV-008__s01__drawer",
      "caption": "Drawer form chất thải khi bấm Hủy",
      "uiState": "drawer"
     },
     {
      "name": "TC-ENV-008__s02__list",
      "caption": "Danh sách không phát sinh bản ghi rác",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-009",
    "title": "Lọc danh sách chất thải theo loại/khoa/ngày",
    "category": "happy",
    "priority": "P1",
    "role": "NV môi trường",
    "preconditions": "Login admin, /v2/env/waste có dữ liệu nhiều loại/khoa.",
    "steps": [
     "Chọn filter loại = Sắc nhọn",
     "Áp filter khoa cụ thể",
     "Áp filter khoảng ngày",
     "Xóa filter"
    ],
    "expected": "Bảng chỉ còn dòng khớp tất cả filter; số đếm/KPI cập nhật theo filter; xóa filter trả về toàn bộ; filter kết hợp hoạt động đúng (AND).",
    "evidence": [
     {
      "name": "TC-ENV-009__s01__filter",
      "caption": "Danh sách chất thải đã lọc theo loại+khoa+ngày",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-010",
    "title": "Chuyển trạng thái chất thải hợp lệ: Ghi nhận → Vận chuyển → Đã xử lý",
    "category": "state",
    "priority": "P0",
    "role": "NV môi trường",
    "preconditions": "Login admin. Có bản ghi chất thải trạng thái Ghi nhận.",
    "steps": [
     "Mở bản ghi trạng thái Ghi nhận",
     "Chuyển sang Vận chuyển (nhập đơn vị/ngày vận chuyển nếu yêu cầu)",
     "Chuyển sang Đã xử lý (nhập đơn vị xử lý/ngày xử lý)",
     "Quan sát badge trạng thái và lịch sử"
    ],
    "expected": "Mỗi bước chuyển hợp lệ thành công; badge trạng thái cập nhật đúng; thông tin vận chuyển/xử lý được lưu; audit ghi từng lần đổi trạng thái với user + thời điểm.",
    "evidence": [
     {
      "name": "TC-ENV-010__s01__detail",
      "caption": "Bản ghi ở trạng thái Ghi nhận",
      "uiState": "detail"
     },
     {
      "name": "TC-ENV-010__s02__confirm",
      "caption": "Xác nhận chuyển sang Vận chuyển",
      "uiState": "confirm"
     },
     {
      "name": "TC-ENV-010__s03__success",
      "caption": "Đã chuyển sang Đã xử lý",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-011",
    "title": "Chặn chuyển trạng thái chất thải không hợp lệ (nhảy bước/lùi)",
    "category": "state",
    "priority": "P1",
    "role": "NV môi trường",
    "preconditions": "Login admin. Có bản ghi trạng thái Ghi nhận và bản ghi Đã xử lý.",
    "steps": [
     "Với bản ghi Ghi nhận, thử nhảy thẳng sang Đã xử lý (bỏ Vận chuyển) nếu quy trình bắt tuần tự",
     "Với bản ghi Đã xử lý, thử lùi về Ghi nhận",
     "Quan sát phản hồi"
    ],
    "expected": "Hệ thống chặn chuyển trạng thái không hợp lệ (nhảy bước nếu bắt tuần tự, hoặc lùi trạng thái đã hoàn tất); thông báo lỗi rõ; trạng thái không bị đổi sai.",
    "evidence": [
     {
      "name": "TC-ENV-011__s01__error",
      "caption": "Chặn chuyển trạng thái không hợp lệ",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-012",
    "title": "Thêm kết quả quan trắc đạt ngưỡng (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "NV quan trắc môi trường",
    "preconditions": "Login admin, ở /v2/env/monitoring.",
    "steps": [
     "Bấm Thêm kết quả quan trắc",
     "Chọn loại = Nước thải, điểm đo, chỉ tiêu = pH",
     "Nhập giá trị đo = 7.0, ngưỡng cho phép 5.5-9",
     "Chọn ngày đo, đơn vị quan trắc",
     "Bấm Lưu"
    ],
    "expected": "Lưu thành công; kết luận tự tính = Đạt; bản ghi hiện trong danh sách với badge Đạt; audit log ghi mutation.",
    "evidence": [
     {
      "name": "TC-ENV-012__s01__form",
      "caption": "Form quan trắc đã điền (giá trị trong ngưỡng)",
      "uiState": "form"
     },
     {
      "name": "TC-ENV-012__s02__list",
      "caption": "Bản ghi quan trắc Đạt trong danh sách",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-013",
    "title": "Quan trắc vượt ngưỡng tự kết luận Vượt + cảnh báo + lên dashboard",
    "category": "data-consistency",
    "priority": "P0",
    "role": "NV quan trắc",
    "preconditions": "Login admin, /v2/env/monitoring.",
    "steps": [
     "Thêm kết quả quan trắc với giá trị vượt ngưỡng (vd BOD = 200, ngưỡng 50)",
     "Lưu",
     "Quan sát kết luận và highlight dòng",
     "Quay lại /v2/env dashboard kiểm tra số 'lần vượt ngưỡng' tăng đúng"
    ],
    "expected": "Kết luận tự tính = Vượt ngưỡng; dòng được highlight/badge cảnh báo; KPI 'số lần quan trắc vượt ngưỡng' trên dashboard tăng đúng tương ứng (data-consistency A→B); audit ghi.",
    "evidence": [
     {
      "name": "TC-ENV-013__s01__form",
      "caption": "Nhập giá trị vượt ngưỡng",
      "uiState": "form"
     },
     {
      "name": "TC-ENV-013__s02__list",
      "caption": "Dòng quan trắc Vượt được highlight",
      "uiState": "list"
     },
     {
      "name": "TC-ENV-013__s03__detail",
      "caption": "KPI vượt ngưỡng cập nhật trên dashboard",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-014",
    "title": "Validation kết quả quan trắc: giá trị/ngưỡng bắt buộc + định dạng số",
    "category": "validation",
    "priority": "P1",
    "role": "NV quan trắc",
    "preconditions": "Login admin, mở form quan trắc.",
    "steps": [
     "Để trống loại/điểm đo/chỉ tiêu/giá trị → Lưu",
     "Nhập giá trị bằng chữ 'abc' → quan sát",
     "Nhập ngưỡng dưới > ngưỡng trên (vd min 9 max 5) → Lưu"
    ],
    "expected": "Field bắt buộc báo lỗi tiếng Việt; ô số từ chối chữ; khoảng ngưỡng min>max bị chặn với thông báo logic rõ ràng; không lưu được khi sai.",
    "evidence": [
     {
      "name": "TC-ENV-014__s01__validation",
      "caption": "Lỗi validation form quan trắc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-015",
    "title": "Edge giá trị quan trắc biên (đúng ngưỡng, sát ngưỡng)",
    "category": "edge",
    "priority": "P2",
    "role": "NV quan trắc",
    "preconditions": "Login admin, form quan trắc; chỉ tiêu có ngưỡng vd max = 50.",
    "steps": [
     "Nhập giá trị = 50 (đúng bằng ngưỡng) → Lưu",
     "Nhập giá trị = 50.0001 (vượt sát) → Lưu",
     "Nhập giá trị = 49.9999 (sát dưới) → Lưu"
    ],
    "expected": "Quy tắc biên rõ ràng và nhất quán: bằng ngưỡng kết luận đúng theo định nghĩa (≤ hay <), vượt sát kết luận Vượt, sát dưới kết luận Đạt; không có sai lệch làm tròn dẫn đến kết luận sai.",
    "evidence": [
     {
      "name": "TC-ENV-015__s01__edge",
      "caption": "Kết luận tại giá trị đúng/sát ngưỡng",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-016",
    "title": "Khai báo sự cố ngộ độc thực phẩm (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "NV ATTP/Trực lãnh đạo",
    "preconditions": "Login admin, ở /v2/env/food-poisoning.",
    "steps": [
     "Bấm Khai báo sự cố",
     "Nhập ngày, địa điểm/bếp ăn, số người ảnh hưởng = 8, triệu chứng, mức độ = Trung bình",
     "Bấm Lưu"
    ],
    "expected": "Tạo sự cố thành công, trạng thái mặc định = Mới/Đang điều tra; hiện trong danh sách với đúng số ca và mức độ; audit ghi mutation user thật.",
    "evidence": [
     {
      "name": "TC-ENV-016__s01__form",
      "caption": "Form khai báo sự cố ngộ độc TP",
      "uiState": "form"
     },
     {
      "name": "TC-ENV-016__s02__list",
      "caption": "Sự cố mới trong danh sách",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-017",
    "title": "Validation + edge số người ảnh hưởng sự cố ngộ độc",
    "category": "validation",
    "priority": "P1",
    "role": "NV ATTP",
    "preconditions": "Login admin, mở form khai báo sự cố.",
    "steps": [
     "Để trống ngày/địa điểm/số ca → Lưu",
     "Nhập số người ảnh hưởng = 0 → Lưu",
     "Nhập số người = -3 → Lưu",
     "Nhập số người rất lớn (vd 1000000) → Lưu"
    ],
    "expected": "Field bắt buộc báo lỗi; số ca phải là số nguyên dương (0/âm bị chặn); số rất lớn được cảnh báo/giới hạn hợp lý; thông báo tiếng Việt rõ ràng.",
    "evidence": [
     {
      "name": "TC-ENV-017__s01__validation",
      "caption": "Lỗi validation số người ảnh hưởng",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-018",
    "title": "Vòng đời trạng thái sự cố ngộ độc: Mới → Đang điều tra → Đã kết luận → Đóng",
    "category": "state",
    "priority": "P0",
    "role": "NV ATTP",
    "preconditions": "Login admin. Có sự cố trạng thái Mới.",
    "steps": [
     "Mở sự cố Mới, chuyển sang Đang điều tra",
     "Nhập diễn biến điều tra",
     "Chuyển sang Đã kết luận (nhập kết luận)",
     "Chuyển sang Đóng",
     "Thử chuyển ngược Đóng → Mới"
    ],
    "expected": "Các bước tiến hợp lệ thành công, badge cập nhật; bắt buộc nhập kết luận trước khi Đã kết luận/Đóng nếu quy trình yêu cầu; chuyển ngược/lùi bị chặn; audit ghi từng lần đổi.",
    "evidence": [
     {
      "name": "TC-ENV-018__s01__detail",
      "caption": "Sự cố ở trạng thái Đang điều tra",
      "uiState": "detail"
     },
     {
      "name": "TC-ENV-018__s02__confirm",
      "caption": "Xác nhận chuyển Đã kết luận",
      "uiState": "confirm"
     },
     {
      "name": "TC-ENV-018__s03__error",
      "caption": "Chặn chuyển ngược về Mới",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-019",
    "title": "Lấy mẫu ATTP và gắn vào sự cố ngộ độc (data-consistency)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "NV ATTP",
    "preconditions": "Login admin. Có sự cố ngộ độc đang điều tra.",
    "steps": [
     "Ở /v2/env/food-samples bấm Lấy mẫu mới",
     "Nhập loại thực phẩm, nơi lấy, ngày, chỉ tiêu",
     "Chọn gắn vào sự cố ngộ độc đang điều tra",
     "Lưu",
     "Mở detail sự cố tab 'Mẫu ATTP liên quan' kiểm tra mẫu xuất hiện"
    ],
    "expected": "Mẫu tạo thành công và hiển thị ở danh sách mẫu; đồng thời xuất hiện đúng trong tab Mẫu liên quan của sự cố đã gắn (A tạo → B hiển thị); liên kết 2 chiều nhất quán.",
    "evidence": [
     {
      "name": "TC-ENV-019__s01__form",
      "caption": "Form mẫu ATTP gắn sự cố",
      "uiState": "form"
     },
     {
      "name": "TC-ENV-019__s02__tab",
      "caption": "Mẫu hiển thị trong tab Mẫu liên quan của sự cố",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-020",
    "title": "Nhập kết quả mẫu ATTP Không đạt + trạng thái Chờ KQ→Có KQ",
    "category": "state",
    "priority": "P1",
    "role": "NV xét nghiệm ATTP",
    "preconditions": "Login admin. Có mẫu ATTP trạng thái Chờ KQ.",
    "steps": [
     "Mở mẫu Chờ KQ",
     "Nhập kết quả chỉ tiêu vượt mức cho phép, kết luận = Không đạt",
     "Lưu",
     "Quan sát StatusTabs và badge"
    ],
    "expected": "Mẫu chuyển từ Chờ KQ sang Không đạt; badge và StatusTabs cập nhật; nếu mẫu gắn sự cố thì thông tin phản ánh đúng; audit ghi.",
    "evidence": [
     {
      "name": "TC-ENV-020__s01__form",
      "caption": "Nhập kết quả mẫu Không đạt",
      "uiState": "form"
     },
     {
      "name": "TC-ENV-020__s02__list",
      "caption": "Mẫu chuyển badge Không đạt",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-021",
    "title": "Tạo đợt kiểm tra cơ sở thực phẩm với checklist (happy)",
    "category": "happy",
    "priority": "P1",
    "role": "Đoàn kiểm tra ATTP",
    "preconditions": "Login admin, ở /v2/env/inspections.",
    "steps": [
     "Bấm Tạo đợt kiểm tra",
     "Nhập tên cơ sở, ngày, thành viên đoàn",
     "Tích các tiêu chí checklist (đạt/không đạt)",
     "Quan sát tổng điểm/kết luận tự tính",
     "Nhập kiến nghị, bấm Lưu"
    ],
    "expected": "Đợt kiểm tra lưu thành công; kết luận Đạt/Không đạt tính đúng theo checklist; hiện trong danh sách với badge tương ứng; audit ghi.",
    "evidence": [
     {
      "name": "TC-ENV-021__s01__form",
      "caption": "Form kiểm tra cơ sở với checklist",
      "uiState": "form"
     },
     {
      "name": "TC-ENV-021__s02__list",
      "caption": "Đợt kiểm tra mới trong danh sách",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-022",
    "title": "Edge ký tự đặc biệt + chuỗi dài + dấu tiếng Việt ở field text",
    "category": "edge",
    "priority": "P2",
    "role": "NV ATTP/môi trường",
    "preconditions": "Login admin, mở bất kỳ form env có field text (ghi chú/kiến nghị/địa điểm).",
    "steps": [
     "Nhập tên cơ sở/địa điểm có dấu tiếng Việt đầy đủ (vd 'Bếp ăn Khoa Dinh dưỡng – Cơ sở 2')",
     "Nhập ghi chú chuỗi rất dài (>2000 ký tự)",
     "Nhập ký tự đặc biệt < > & ' \" trong ghi chú",
     "Lưu và mở lại xem hiển thị"
    ],
    "expected": "Dấu tiếng Việt lưu và hiển thị đúng (không lỗi font/encoding); chuỗi dài bị giới hạn theo maxlength hoặc lưu+hiển thị không vỡ layout; ký tự đặc biệt được lưu nguyên văn và hiển thị an toàn (không vỡ UI).",
    "evidence": [
     {
      "name": "TC-ENV-022__s01__form",
      "caption": "Nhập text dấu tiếng Việt + chuỗi dài + ký tự đặc biệt",
      "uiState": "form"
     },
     {
      "name": "TC-ENV-022__s02__detail",
      "caption": "Hiển thị lại đúng sau khi lưu",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-023",
    "title": "XSS ở field ghi chú/kiến nghị (security)",
    "category": "security",
    "priority": "P0",
    "role": "NV ATTP",
    "preconditions": "Login admin, mở form env có field ghi chú (chất thải/sự cố/kiểm tra).",
    "steps": [
     "Nhập vào ghi chú: <script>alert('xss')</script> và <img src=x onerror=alert(1)>",
     "Lưu",
     "Mở lại bản ghi/detail và xem danh sách hiển thị ghi chú đó"
    ],
    "expected": "Payload được hiển thị dưới dạng text thuần (escaped), KHÔNG thực thi script; không có alert popup; không có lỗ XSS stored ở list/detail.",
    "evidence": [
     {
      "name": "TC-ENV-023__s01__form",
      "caption": "Nhập payload XSS vào ghi chú",
      "uiState": "form"
     },
     {
      "name": "TC-ENV-023__s02__detail",
      "caption": "Ghi chú hiển thị escaped, không thực thi",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-024",
    "title": "Phân quyền: vai trò không đủ quyền bị chặn menu/nút/API env",
    "category": "permission",
    "priority": "P0",
    "role": "User vai trò hạn chế (không thuộc nhóm môi trường/ATTP)",
    "preconditions": "Có tài khoản role hạn chế không được cấp quyền phân hệ env (theo matrix #216). Login bằng tài khoản đó.",
    "steps": [
     "Kiểm tra menu env có hiển thị không",
     "Truy cập trực tiếp URL /v2/env và /v2/env/waste",
     "Nếu vào được, thử bấm nút Thêm/Sửa/Đổi trạng thái",
     "Gọi trực tiếp API tạo/sửa bản ghi env (qua devtools) với token role này"
    ],
    "expected": "Menu env ẩn/disable; truy cập trực tiếp route bị chặn hoặc hiện trang không đủ quyền; nút mutation ẩn/disable; API trả 403 (không 200) — backend enforce, không chỉ ẩn UI.",
    "evidence": [
     {
      "name": "TC-ENV-024__s01__permission",
      "caption": "Menu/nút env bị ẩn với role hạn chế",
      "uiState": "permission"
     },
     {
      "name": "TC-ENV-024__s02__error",
      "caption": "API env trả 403 với token thiếu quyền",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-025",
    "title": "IDOR: chỉnh sửa bản ghi env bằng id không thuộc quyền",
    "category": "security",
    "priority": "P0",
    "role": "User role hạn chế / cross-tenant",
    "preconditions": "Biết id một bản ghi env (waste/sample/incident). Login bằng tài khoản không có quyền sửa bản ghi đó.",
    "steps": [
     "Lấy id bản ghi env hợp lệ",
     "Gọi API GET/PUT/DELETE bản ghi env bằng id đó với token không đủ quyền",
     "Quan sát phản hồi"
    ],
    "expected": "Backend trả 403/404, KHÔNG cho đọc/sửa/xóa bản ghi ngoài quyền (chặn IDOR); không lộ dữ liệu; audit ghi lần truy cập bị từ chối nếu có.",
    "evidence": [
     {
      "name": "TC-ENV-025__s01__error",
      "caption": "API env trả 403/404 cho id ngoài quyền (IDOR)",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-026",
    "title": "UI loading/error state khi tải danh sách env",
    "category": "ui",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Login admin. Có thể mô phỏng mạng chậm / API lỗi (devtools throttle hoặc chặn endpoint).",
    "steps": [
     "Mở /v2/env/monitoring với mạng chậm để thấy loading",
     "Chặn/đánh lỗi endpoint danh sách rồi reload để thấy error state",
     "Khôi phục và retry"
    ],
    "expected": "Hiển thị skeleton/loading trong khi tải; khi API lỗi hiện error state có nút thử lại + thông báo tiếng Việt (không trắng trang, không spinner vô tận); retry hoạt động.",
    "evidence": [
     {
      "name": "TC-ENV-026__s01__loading",
      "caption": "Loading state danh sách quan trắc",
      "uiState": "loading"
     },
     {
      "name": "TC-ENV-026__s02__error",
      "caption": "Error state khi API lỗi + nút thử lại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-027",
    "title": "Định dạng số/khối lượng/ngày nhất quán toàn phân hệ env",
    "category": "ui",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Login admin, có dữ liệu các danh sách env.",
    "steps": [
     "Quan sát cột khối lượng (kg) ở danh sách chất thải",
     "Quan sát giá trị/ngưỡng quan trắc",
     "Quan sát cột ngày ở tất cả danh sách",
     "Đối chiếu định dạng giữa các màn"
    ],
    "expected": "Khối lượng có đơn vị kg + số thập phân nhất quán; giá trị quan trắc hiển thị đúng đơn vị; ngày theo định dạng dd/MM/yyyy thống nhất; không có chỗ hiển thị raw ISO hay số chưa format.",
    "evidence": [
     {
      "name": "TC-ENV-027__s01__list",
      "caption": "Định dạng số/khối lượng/ngày trong danh sách env",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   },
   {
    "id": "TC-ENV-028",
    "title": "Thao tác sai thứ tự: nhập KQ mẫu khi chưa có mẫu / kết luận sự cố khi chưa điều tra",
    "category": "negative",
    "priority": "P1",
    "role": "NV ATTP",
    "preconditions": "Login admin.",
    "steps": [
     "Thử nhập kết quả cho mẫu chưa tồn tại / sự cố chưa có dữ liệu điều tra",
     "Thử kết luận sự cố ngay khi vừa tạo (Mới) bỏ qua bước điều tra nếu quy trình yêu cầu tuần tự",
     "Quan sát phản hồi"
    ],
    "expected": "Hệ thống chặn thao tác sai thứ tự với thông báo rõ (vd 'phải chuyển sang điều tra trước'); không tạo dữ liệu mâu thuẫn; trạng thái giữ nguyên.",
    "evidence": [
     {
      "name": "TC-ENV-028__s01__error",
      "caption": "Chặn thao tác sai thứ tự nghiệp vụ",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#269",
     "#216"
    ]
   }
  ],
  "ui_state_checklist": [
   "list (danh sách các bảng: chất thải, quan trắc, sự cố, mẫu, kiểm tra)",
   "detail (chi tiết bản ghi/sự cố)",
   "form (form thêm/sửa)",
   "drawer (DrawerShell mở form)",
   "modal (ModalShell xác nhận đổi trạng thái)",
   "tab (tab mẫu liên quan / diễn biến trong detail sự cố)",
   "filter (lọc theo loại/khoa/ngày/kết quả)",
   "validation (lỗi field bắt buộc/định dạng/range)",
   "empty (kỳ không có dữ liệu, danh sách rỗng)",
   "loading (skeleton khi tải danh sách)",
   "error (API lỗi, chặn trạng thái, 403/404 permission/IDOR)",
   "confirm (xác nhận chuyển trạng thái/xóa)",
   "success (toast lưu/chuyển trạng thái thành công)",
   "permission (menu/nút ẩn-disable với role thiếu quyền)",
   "dark/light parity cho mọi màn"
  ],
  "gaps": [
   "data.js chỉ mô tả 5 bảng ở mức tên + desc; cấu trúc cột thực, enum trạng thái và quy tắc nghiệp vụ (tuần tự bắt buộc hay không, ngưỡng QCVN cụ thể) cần xác nhận với schema/migration thực tế trước khi chốt expected của các task state/edge.",
   "Chưa rõ phân hệ env đã có UI v2 thực hay mới ở mức spec/roadmap — route /v2/env là phỏng đoán; cần kiểm tra App.tsx + TerminalLayout để xác nhận route/menu thật, nếu chưa có UI thì các task UI tạm là spec để chờ implement.",
   "Thiếu định nghĩa rõ matrix quyền cho từng nghiệp vụ env (ai được khai báo sự cố vs ai duyệt/đóng) — task permission #024 cần map cụ thể theo #216 khi có.",
   "Liên thông ngoài (báo cáo Sở Y tế/cổng quốc gia về chất thải/ATTP, xuất báo cáo định kỳ) chưa thấy trong data.js — nếu nghiệp vụ yêu cầu xuất báo cáo/đồng bộ thì cần bổ sung task integration.",
   "Chưa có task xuất/in báo cáo (PDF/Excel) cho biên bản kiểm tra cơ sở và báo cáo quản lý chất thải định kỳ — nên bổ sung nếu phân hệ có chức năng in biểu mẫu.",
   "Chưa có task xử lý đồng thời (2 user cùng đổi trạng thái 1 sự cố/bản ghi) — concurrency/optimistic-lock nên bổ sung nếu nhiều người dùng cùng nhập.",
   "Chưa có task kiểm tra audit log đầy đủ trường (user/thời điểm/giá trị cũ-mới) cho mọi mutation env — nên có 1 task data-consistency chuyên về audit khi xác nhận có bảng AuditLog áp dụng cho env."
  ]
 },
 {
  "id": "training",
  "code": "TRN",
  "layer": "spec",
  "ic": "🎓",
  "nm": "Đào tạo & NCKH",
  "gh": [
   "#297"
  ],
  "gap": false,
  "module_id": "training",
  "summary": "Phân hệ \"Đào tạo & NCKH\" (code TRN, lớp spec) quản lý Lớp đào tạo (TrainingClasses), Học viên (TrainingStudents), Chỉ đạo tuyến (ClinicalDirections) và Đề tài NCKH (ResearchProjects). Quan hệ chính: TrainingClasses ⟶ TrainingStudents (1-n, đếm enrolledCount/maxStudents) và ResearchProjects/ClinicalDirections độc lập. Backend (api/training/*) đã có đủ CRUD class/student/direction/project + dashboard + credit-summary, nhưng FE v2 (/v2/training-research) HIỆN CHỈ phủ: list+CRUD lớp đào tạo, drawer chi tiết lớp, drawer xem học viên (read-only). Các nghiệp vụ enroll học viên, cập nhật trạng thái học viên, cấp chứng chỉ, NCKH và Chỉ đạo tuyến CHƯA có UI (nút NCKH đang ẩn, không có route /v2/research). Lưu ý kỹ thuật: controller chỉ [Authorize] (không phân quyền theo vai trò); service KHÔNG validate phía server (không chặn required/range/vượt sĩ số/chuyển trạng thái không hợp lệ) và KHÔNG ghi audit log; FE map status 0-4 nhưng backend chỉ trả 1-4 (lệch nhãn \"Lên kế hoạch\").",
  "screens": [
   {
    "name": "Danh sách Lớp đào tạo (list)",
    "desc": "Màn chính: KpiStrip (Lớp đào tạo / Đang mở / Tổng học viên / CME tuân thủ %), toolbar (search theo tên-mã-GV, filter Loại đào tạo, Bỏ lọc, Làm mới, Mở lớp), StatusTabs (Lên KH/Đang mở/Hoàn thành/Tạm dừng/Hủy + đếm), DataTable cột Mã lớp/Tên+địa điểm/Loại/GV/Thời gian/Học viên (n/max)/Tín chỉ/Học phí/Trạng thái, Pager 18 dòng/trang, action eye/user/edit mỗi dòng.",
    "route_guess": "/v2/training-research",
    "elements": [
     "KpiStrip 4 ô",
     "SearchBox",
     "Filter Loại đào tạo",
     "Btn Mở lớp/Làm mới/Bỏ lọc",
     "StatusTabs",
     "DataTable",
     "Pager",
     "ActBtn eye/user/edit"
    ]
   },
   {
    "name": "Drawer chi tiết Lớp đào tạo (drawer)",
    "desc": "DrawerShell size lg mở khi click dòng/eye: section Lớp học (mã/tên/loại/khoa/GV/địa điểm), section Lịch trình (bắt đầu/kết thúc/học viên n/max/tín chỉ/học phí/trạng thái badge), section Mô tả. Footer: Đóng / Học viên / Chỉnh sửa.",
    "route_guess": "/v2/training-research",
    "elements": [
     "DrSec Lớp học",
     "DrSec Lịch trình",
     "DrSec Mô tả",
     "StatusBadge",
     "Btn Học viên/Chỉnh sửa/Đóng"
    ]
   },
   {
    "name": "Modal Mở/Sửa Lớp đào tạo (modal)",
    "desc": "CrudModal size lg: Mã lớp (required, disabled khi sửa), Tên lớp (required), Loại đào tạo (select required: Nội bộ/Bên ngoài/CME/Chỉ đạo tuyến), Địa điểm, Ngày bắt đầu (date), Ngày kết thúc (date), Sĩ số tối đa (number), Số tín chỉ (number), Học phí (number), Trạng thái (select), Mô tả (textarea).",
    "route_guess": "/v2/training-research",
    "elements": [
     "CrudField classCode/className",
     "Select trainingType/status",
     "DatePicker startDate/endDate",
     "InputNumber maxStudents/creditHours/fee",
     "Textarea description"
    ]
   },
   {
    "name": "Drawer Danh sách Học viên (drawer)",
    "desc": "DrawerShell size lg mở từ action user/footer: bảng học viên (# / Tên học viên / Loại / Điểm / Trạng thái badge / Chứng chỉ). Có loading state + empty 'Chưa có học viên đăng ký'. Read-only (chưa có nút đăng ký/cập nhật/cấp chứng chỉ ở UI).",
    "route_guess": "/v2/training-research",
    "elements": [
     "table ab-tbl",
     "StatusBadge điểm danh",
     "loading text",
     "empty text"
    ]
   },
   {
    "name": "Đề tài NCKH (CHƯA có UI)",
    "desc": "Backend đủ api/training/projects (list/detail/create/update) + dashboard projectsByStatus, nhưng FE KHÔNG có route/page; nút NCKH bị ẩn. Đây là GAP, test chỉ kiểm được ở tầng API.",
    "route_guess": "(không có; defer /v2/research)",
    "elements": [
     "(none in FE)"
    ]
   },
   {
    "name": "Chỉ đạo tuyến (CHƯA có UI)",
    "desc": "Backend đủ api/training/directions (list/detail/create/update), nhưng FE KHÔNG có page. GAP, test chỉ ở tầng API.",
    "route_guess": "(không có)",
    "elements": [
     "(none in FE)"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-TRN-001",
    "title": "Mở lớp đào tạo mới thành công (happy) và hiển thị đúng ở danh sách + drawer",
    "category": "happy",
    "priority": "P0",
    "role": "Quản lý đào tạo",
    "preconditions": "Đăng nhập admin/Admin@123, ở /v2/training-research, có quyền Mở lớp.",
    "steps": [
     "Bấm nút 'Mở lớp'",
     "Nhập Mã lớp 'ĐT-2026-001', Tên lớp 'Cập nhật kiến thức điều dưỡng', Loại đào tạo = Nội bộ",
     "Nhập Địa điểm 'Hội trường A', Ngày bắt đầu hôm nay, Ngày kết thúc sau 3 ngày, Sĩ số tối đa 30, Tín chỉ 5, Học phí 0",
     "Bấm Lưu/Submit",
     "Chờ toast và bảng reload, tìm lớp vừa tạo, mở drawer chi tiết"
    ],
    "expected": "Toast 'Đã mở lớp đào tạo'; dòng mới hiện ở bảng với mã/tên/loại đúng, học viên 0/30, học phí 'Miễn phí'; drawer hiển thị đủ section Lớp học/Lịch trình/Mô tả; KPI 'Lớp đào tạo' tăng 1.",
    "evidence": [
     {
      "name": "TC-TRN-001__s01__form",
      "caption": "Modal mở lớp đã điền đủ",
      "uiState": "form"
     },
     {
      "name": "TC-TRN-001__s02__success",
      "caption": "Toast tạo thành công",
      "uiState": "success"
     },
     {
      "name": "TC-TRN-001__s03__list",
      "caption": "Lớp mới trong danh sách",
      "uiState": "list"
     },
     {
      "name": "TC-TRN-001__s04__drawer",
      "caption": "Drawer chi tiết lớp mới",
      "uiState": "drawer"
     }
    ],
    "notes": "POST /api/training/classes."
   },
   {
    "id": "TC-TRN-002",
    "title": "Sửa lớp đào tạo: Mã lớp bị khóa, cập nhật thông tin còn lại",
    "category": "happy",
    "priority": "P1",
    "role": "Quản lý đào tạo",
    "preconditions": "Đã có ít nhất 1 lớp ở danh sách.",
    "steps": [
     "Bấm action edit (hoặc 'Chỉnh sửa' trong drawer) trên 1 lớp",
     "Quan sát trường Mã lớp",
     "Đổi Tên lớp, tăng Sĩ số tối đa, đổi Trạng thái sang 'Đang diễn ra', đổi Học phí",
     "Bấm Lưu"
    ],
    "expected": "Trường Mã lớp ở chế độ disabled (không sửa được); toast 'Đã cập nhật lớp đào tạo'; bảng phản ánh tên/trạng thái/học phí mới; badge trạng thái đổi tương ứng.",
    "evidence": [
     {
      "name": "TC-TRN-002__s01__form",
      "caption": "Modal sửa, Mã lớp disabled",
      "uiState": "form"
     },
     {
      "name": "TC-TRN-002__s02__success",
      "caption": "Toast cập nhật",
      "uiState": "success"
     },
     {
      "name": "TC-TRN-002__s03__list",
      "caption": "Bảng phản ánh thay đổi",
      "uiState": "list"
     }
    ],
    "notes": "PUT /api/training/classes/{id}; disabledOnEdit ở classCode."
   },
   {
    "id": "TC-TRN-003",
    "title": "Validation: bỏ trống các trường bắt buộc Mã lớp / Tên lớp / Loại đào tạo",
    "category": "validation",
    "priority": "P0",
    "role": "Quản lý đào tạo",
    "preconditions": "Mở modal 'Mở lớp'.",
    "steps": [
     "Để trống Mã lớp, Tên lớp, không chọn Loại đào tạo",
     "Bấm Lưu",
     "Lần lượt điền từng trường rồi thử lại để xác nhận thông báo lỗi mất đi đúng trường"
    ],
    "expected": "Không submit; mỗi trường required (classCode, className, trainingType) hiển thị thông báo lỗi rõ ràng tiếng Việt ngay dưới field; nút Lưu không gọi API cho tới khi đủ trường bắt buộc.",
    "evidence": [
     {
      "name": "TC-TRN-003__s01__validation",
      "caption": "Lỗi required trên 3 trường",
      "uiState": "validation"
     },
     {
      "name": "TC-TRN-003__s02__form",
      "caption": "Điền dần, lỗi biến mất",
      "uiState": "form"
     }
    ],
    "notes": "FE đánh required ở CLASS_FIELDS; LƯU Ý backend KHÔNG validate -> kiểm thêm ở TC-TRN-018."
   },
   {
    "id": "TC-TRN-004",
    "title": "Validation ngày: Ngày kết thúc trước Ngày bắt đầu",
    "category": "validation",
    "priority": "P1",
    "role": "Quản lý đào tạo",
    "preconditions": "Mở modal mở lớp, đã điền required.",
    "steps": [
     "Chọn Ngày bắt đầu = hôm nay",
     "Chọn Ngày kết thúc = hôm qua (trước ngày bắt đầu)",
     "Bấm Lưu"
    ],
    "expected": "Hệ thống chặn hoặc cảnh báo 'Ngày kết thúc phải sau ngày bắt đầu'. (Nếu hiện tại KHÔNG chặn -> ghi nhận bug, tạo task fix liên kết vì backend chỉ TryParse, không so sánh).",
    "evidence": [
     {
      "name": "TC-TRN-004__s01__validation",
      "caption": "Cảnh báo ngày không hợp lệ",
      "uiState": "validation"
     }
    ],
    "notes": "Ứng viên bug: service không so sánh StartDate/EndDate."
   },
   {
    "id": "TC-TRN-005",
    "title": "Edge giá trị biên cho Sĩ số/Tín chỉ/Học phí (0, âm, rất lớn)",
    "category": "edge",
    "priority": "P1",
    "role": "Quản lý đào tạo",
    "preconditions": "Mở modal mở lớp, điền required.",
    "steps": [
     "Nhập Sĩ số tối đa = 0, Tín chỉ = -5, Học phí = 999999999999",
     "Bấm Lưu và quan sát",
     "Tạo lớp khác với Sĩ số = -1",
     "Mở drawer/bảng kiểm cách hiển thị học viên n/max và định dạng học phí"
    ],
    "expected": "Giá trị âm bị chặn hoặc cảnh báo (kỳ vọng đúng: sĩ số/tín chỉ/học phí >= 0); học phí rất lớn hiển thị định dạng vi-VN có phân tách hàng nghìn; cột học viên với max=0 không gây chia-0/NaN (ratio guard). Nếu nhận giá trị âm -> bug, tạo task fix.",
    "evidence": [
     {
      "name": "TC-TRN-005__s01__form",
      "caption": "Nhập giá trị biên",
      "uiState": "form"
     },
     {
      "name": "TC-TRN-005__s02__list",
      "caption": "Hiển thị học phí lớn + n/max khi max=0",
      "uiState": "list"
     }
    ],
    "notes": "FE ratio = enrolled/maxStudents có guard maxStudents?...:0; kiểm định dạng fmt vi-VN."
   },
   {
    "id": "TC-TRN-006",
    "title": "Edge ký tự đặc biệt/chuỗi rất dài/dấu tiếng Việt ở Mã-Tên-Mô tả",
    "category": "edge",
    "priority": "P2",
    "role": "Quản lý đào tạo",
    "preconditions": "Mở modal mở lớp.",
    "steps": [
     "Mã lớp với ký tự đặc biệt 'ĐT/2026 #001-@', Tên lớp chuỗi 300 ký tự có dấu tiếng Việt",
     "Mô tả nhiều dòng có emoji và dấu",
     "Lưu rồi mở drawer chi tiết kiểm hiển thị (whiteSpace pre-wrap)"
    ],
    "expected": "Lưu thành công, dấu tiếng Việt và xuống dòng hiển thị đúng trong drawer (pre-wrap); không vỡ layout bảng với tên rất dài (truncate/wrap gọn).",
    "evidence": [
     {
      "name": "TC-TRN-006__s01__form",
      "caption": "Nhập chuỗi dài + ký tự đặc biệt",
      "uiState": "form"
     },
     {
      "name": "TC-TRN-006__s02__drawer",
      "caption": "Drawer hiển thị mô tả nhiều dòng có dấu",
      "uiState": "drawer"
     }
    ]
   },
   {
    "id": "TC-TRN-007",
    "title": "Tìm kiếm theo tên/mã/GV và lọc theo Loại đào tạo + Bỏ lọc",
    "category": "happy",
    "priority": "P1",
    "role": "Quản lý đào tạo",
    "preconditions": "Có nhiều lớp với loại đào tạo khác nhau.",
    "steps": [
     "Gõ từ khóa khớp tên 1 lớp vào ô tìm kiếm",
     "Chọn Filter 'Loại đào tạo' = một loại cụ thể",
     "Quan sát bảng + đếm trên StatusTabs",
     "Bấm 'Bỏ lọc'"
    ],
    "expected": "Bảng lọc đúng (search khớp classCode/className/instructorName/departmentName, không phân biệt hoa thường); filter loại thu hẹp kết quả; trang về 0 khi đổi filter; 'Bỏ lọc' khôi phục toàn bộ (search='', loại='', tab=all).",
    "evidence": [
     {
      "name": "TC-TRN-007__s01__filter",
      "caption": "Kết quả sau search + filter",
      "uiState": "filter"
     },
     {
      "name": "TC-TRN-007__s02__list",
      "caption": "Sau Bỏ lọc danh sách đầy đủ",
      "uiState": "list"
     }
    ],
    "notes": "Lọc client-side trong filtered useMemo."
   },
   {
    "id": "TC-TRN-008",
    "title": "StatusTabs lọc theo trạng thái + đếm đúng từng tab",
    "category": "happy",
    "priority": "P1",
    "role": "Quản lý đào tạo",
    "preconditions": "Có lớp ở các trạng thái khác nhau (Đang mở, Hoàn thành, Hủy).",
    "steps": [
     "Quan sát số đếm trên từng tab (Lên KH/Đang mở/Hoàn thành/Tạm dừng/Hủy)",
     "Bấm tab 'Đang mở', kiểm bảng",
     "Bấm tab 'Hủy', kiểm bảng"
    ],
    "expected": "Số đếm mỗi tab = số lớp có sKey tương ứng; bảng chỉ hiển thị lớp đúng trạng thái; tab 'all' = tổng. LƯU Ý đối chiếu lệch: tab 'Lên KH' (status 0) sẽ luôn 0 vì backend trả status 1-4 -> ghi nhận bất nhất.",
    "evidence": [
     {
      "name": "TC-TRN-008__s01__filter",
      "caption": "Tab Đang mở + đếm",
      "uiState": "filter"
     },
     {
      "name": "TC-TRN-008__s02__list",
      "caption": "Tab Hủy lọc đúng",
      "uiState": "list"
     }
    ],
    "notes": "Ứng viên bug: lệch map status 0-4 (FE) vs 1-4 (BE); nhãn 'Lên kế hoạch' vs 'Kế hoạch'."
   },
   {
    "id": "TC-TRN-009",
    "title": "Xem danh sách Học viên của lớp (happy + loading + empty)",
    "category": "happy",
    "priority": "P1",
    "role": "Quản lý đào tạo",
    "preconditions": "Có 1 lớp đã có học viên và 1 lớp chưa có học viên.",
    "steps": [
     "Bấm action 'Học viên' trên lớp có học viên, quan sát loading rồi bảng",
     "Đóng, bấm 'Học viên' trên lớp chưa có học viên"
    ],
    "expected": "Lớp có học viên: drawer hiện loading 'Đang tải...' rồi bảng (# / Tên / Loại / Điểm / Trạng thái badge / Chứng chỉ), sub đếm đúng số học viên; lớp rỗng: hiện 'Chưa có học viên đăng ký'.",
    "evidence": [
     {
      "name": "TC-TRN-009__s01__loading",
      "caption": "Drawer học viên đang tải",
      "uiState": "loading"
     },
     {
      "name": "TC-TRN-009__s02__drawer",
      "caption": "Bảng học viên + đếm",
      "uiState": "drawer"
     },
     {
      "name": "TC-TRN-009__s03__empty",
      "caption": "Lớp chưa có học viên",
      "uiState": "empty"
     }
    ],
    "notes": "GET /api/training/classes/{id}/students."
   },
   {
    "id": "TC-TRN-010",
    "title": "Hủy giữa chừng: đóng modal/drawer không lưu dữ liệu nháp",
    "category": "negative",
    "priority": "P2",
    "role": "Quản lý đào tạo",
    "preconditions": "Ở /v2/training-research.",
    "steps": [
     "Mở 'Mở lớp', điền 1 phần dữ liệu rồi đóng modal (X/Đóng/click ngoài)",
     "Mở lại modal 'Mở lớp'",
     "Mở drawer chi tiết 1 lớp rồi đóng"
    ],
    "expected": "Đóng modal không tạo lớp (không có dòng mới, không toast); mở lại modal ở trạng thái mặc định (trainingType=1,status=1,maxStudents=30,...), không còn dữ liệu nháp cũ; drawer đóng sạch state.",
    "evidence": [
     {
      "name": "TC-TRN-010__s01__form",
      "caption": "Modal điền dở",
      "uiState": "form"
     },
     {
      "name": "TC-TRN-010__s02__list",
      "caption": "Không có dòng mới sau khi đóng",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-TRN-011",
    "title": "UI states danh sách: empty / loading / error khi tải lớp",
    "category": "ui",
    "priority": "P1",
    "role": "Quản lý đào tạo",
    "preconditions": "Có thể giả lập DB rỗng và lỗi mạng (chặn /api/training/classes hoặc tắt backend).",
    "steps": [
     "Mở trang khi chưa có lớp nào -> quan sát bảng",
     "Reload với mạng chậm/chặn để thấy trạng thái tải",
     "Tắt backend hoặc trả 500 cho /api/training/* rồi Làm mới"
    ],
    "expected": "Empty hiển thị 'Chưa có lớp đào tạo'; trong lúc tải hiện 'Đang tải...'; khi API lỗi hiện toast 'Không tải được lớp đào tạo' và bảng không vỡ (KPI fallback 0). Không có lỗi console đỏ.",
    "evidence": [
     {
      "name": "TC-TRN-011__s01__empty",
      "caption": "Danh sách rỗng",
      "uiState": "empty"
     },
     {
      "name": "TC-TRN-011__s02__loading",
      "caption": "Đang tải lớp",
      "uiState": "loading"
     },
     {
      "name": "TC-TRN-011__s03__error",
      "caption": "Toast lỗi tải + KPI fallback",
      "uiState": "error"
     }
    ],
    "notes": "api trả [] / dashboard fallback khi catch."
   },
   {
    "id": "TC-TRN-012",
    "title": "KPI strip tính đúng: tổng lớp / đang mở / tổng học viên / CME %",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Quản lý đào tạo",
    "preconditions": "Biết số liệu thực tế trong DB (số lớp, số lớp status=2 Đang diễn ra, tổng học viên, số NV có chứng chỉ).",
    "steps": [
     "Đếm thủ công số lớp, số lớp 'Đang diễn ra', tổng học viên qua bảng/API",
     "So với 4 ô KPI trên đầu trang",
     "Tạo thêm 1 lớp 'Đang diễn ra' rồi Làm mới, kiểm KPI 'Lớp đào tạo' và 'Đang mở' tăng đúng"
    ],
    "expected": "KPI khớp dashboard: totalClasses, activeClasses (status==2), totalStudents; CME% = số NV (StaffId distinct) có AttendanceStatus=3 và CertificateNumber != null / tổng user *100, làm tròn. Sau tạo lớp Đang diễn ra, cả 2 KPI tăng đúng.",
    "evidence": [
     {
      "name": "TC-TRN-012__s01__list",
      "caption": "KPI strip trước thay đổi",
      "uiState": "list"
     },
     {
      "name": "TC-TRN-012__s02__list",
      "caption": "KPI cập nhật sau khi thêm lớp",
      "uiState": "list"
     }
    ],
    "notes": "GetDashboardAsync; chú ý activeClasses dùng status==2 (Đang diễn ra)."
   },
   {
    "id": "TC-TRN-013",
    "title": "Data-consistency: cột Học viên (enrolled/max) khớp số học viên trong drawer",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản lý đào tạo",
    "preconditions": "Lớp có học viên (qua seed/API enroll).",
    "steps": [
     "Ghi nhận số ở cột 'Học viên' (n/max) của 1 lớp trên bảng",
     "Mở drawer chi tiết -> field Học viên n/max",
     "Mở drawer danh sách học viên -> đếm số dòng + sub đếm"
    ],
    "expected": "n ở cột bảng = enrolledCount (Students chưa IsDeleted) = số dòng trong drawer học viên = sub đếm; max = maxStudents. Màu cảnh báo đổi khi tỷ lệ >=0.7 (cam) / >=0.9 (đỏ).",
    "evidence": [
     {
      "name": "TC-TRN-013__s01__list",
      "caption": "Cột n/max trên bảng",
      "uiState": "list"
     },
     {
      "name": "TC-TRN-013__s02__drawer",
      "caption": "Drawer học viên đếm khớp",
      "uiState": "drawer"
     }
    ],
    "notes": "EnrolledCount = Students.Count(!IsDeleted)."
   },
   {
    "id": "TC-TRN-014",
    "title": "Dark/light parity màn Đào tạo (KPI/bảng/badge/drawer/modal)",
    "category": "ui",
    "priority": "P2",
    "role": "Quản lý đào tạo",
    "preconditions": "Có toggle dark/light ở topbar v2.",
    "steps": [
     "Ở light mode, chụp danh sách + drawer + modal",
     "Bật dark mode, lặp lại cùng màn",
     "Kiểm StatusBadge từng tone (info/ok/warn/crit), màu cảnh báo n/max, chữ mono học phí/ngày"
    ],
    "expected": "Cả 2 theme: chữ đủ tương phản, badge/màu cảnh báo dùng biến --t-*/--a-*-text đọc được, không có ô trắng/đen lạc tông, modal/drawer nền đúng theme.",
    "evidence": [
     {
      "name": "TC-TRN-014__s01__list",
      "caption": "Light - danh sách",
      "uiState": "list"
     },
     {
      "name": "TC-TRN-014__s02__list",
      "caption": "Dark - danh sách",
      "uiState": "list"
     },
     {
      "name": "TC-TRN-014__s03__drawer",
      "caption": "Dark - drawer chi tiết",
      "uiState": "drawer"
     }
    ]
   },
   {
    "id": "TC-TRN-015",
    "title": "Permission: vai trò không có quyền đào tạo bị chặn menu/nút/API",
    "category": "permission",
    "priority": "P0",
    "role": "Vai trò không thuộc đào tạo (vd Lễ tân/Điều dưỡng thường)",
    "preconditions": "Có tài khoản vai trò hạn chế (tham chiếu matrix #216).",
    "steps": [
     "Đăng nhập tài khoản vai trò hạn chế",
     "Kiểm menu 'Đào tạo - NCKH' có hiển thị không; thử truy cập trực tiếp /v2/training-research",
     "Nếu vào được, thử bấm 'Mở lớp' / sửa",
     "Gọi trực tiếp POST /api/training/classes bằng token vai trò này"
    ],
    "expected": "Menu/nút mở-lớp ẩn hoặc bị chặn theo matrix #216; API trả 403 (hoặc 401) cho vai trò không đủ quyền. LƯU Ý: controller hiện CHỈ [Authorize] (mọi user đăng nhập đều gọi được) -> nếu tạo/sửa thành công bằng vai trò không phận sự = bug bảo mật, tạo task fix.",
    "evidence": [
     {
      "name": "TC-TRN-015__s01__permission",
      "caption": "Menu/nút bị ẩn với vai trò hạn chế",
      "uiState": "permission"
     },
     {
      "name": "TC-TRN-015__s02__error",
      "caption": "API 403 khi gọi tạo lớp",
      "uiState": "error"
     }
    ],
    "notes": "Tham chiếu #216. Footgun: thiếu phân quyền vai trò ở TrainingResearchController."
   },
   {
    "id": "TC-TRN-016",
    "title": "Security IDOR: truy cập lớp/học viên bằng id tùy ý + id không tồn tại",
    "category": "security",
    "priority": "P1",
    "role": "Người dùng đăng nhập bất kỳ",
    "preconditions": "Biết 1 classId hợp lệ và tự bịa 1 Guid.",
    "steps": [
     "GET /api/training/classes/{guid-không-tồn-tại} với token hợp lệ",
     "GET /api/training/classes/{classId}/students với classId không tồn tại",
     "GET /api/training/classes/{id-đã-IsDeleted} nếu có"
    ],
    "expected": "Id không tồn tại/đã xóa -> 404 (class detail) hoặc danh sách rỗng (students), KHÔNG lộ dữ liệu lớp khác; không trả 500. Soft-delete (IsDeleted) không hiển thị.",
    "evidence": [
     {
      "name": "TC-TRN-016__s01__error",
      "caption": "404 cho id không tồn tại",
      "uiState": "error"
     }
    ],
    "notes": "GetClassByIdAsync trả null->NotFound; students lọc IsDeleted."
   },
   {
    "id": "TC-TRN-017",
    "title": "Security XSS: nội dung Mô tả/Mục tiêu chứa thẻ script không thực thi",
    "category": "security",
    "priority": "P1",
    "role": "Quản lý đào tạo",
    "preconditions": "Mở modal mở lớp.",
    "steps": [
     "Nhập Mô tả = '<img src=x onerror=alert(1)> <script>alert(2)</script> <b>đậm</b>'",
     "Lưu lớp",
     "Mở drawer chi tiết -> section Mô tả (render pre-wrap)"
    ],
    "expected": "Chuỗi hiển thị nguyên văn dạng text (React escape), KHÔNG có alert/popup, KHÔNG render HTML; không lỗi console. Xác nhận không dùng dangerouslySetInnerHTML.",
    "evidence": [
     {
      "name": "TC-TRN-017__s01__drawer",
      "caption": "Mô tả XSS hiển thị dạng text an toàn",
      "uiState": "drawer"
     }
    ],
    "notes": "Drawer dùng {sel.description} trong div -> React tự escape."
   },
   {
    "id": "TC-TRN-018",
    "title": "Negative API: tạo lớp thiếu required / trùng Mã lớp / sửa id không tồn tại",
    "category": "negative",
    "priority": "P0",
    "role": "Tester API (Bearer token)",
    "preconditions": "Có token admin; biết 1 classCode đã tồn tại.",
    "steps": [
     "POST /api/training/classes với body thiếu ClassCode/ClassName",
     "POST /api/training/classes với ClassCode trùng lớp đã có",
     "PUT /api/training/classes/{guid-không-tồn-tại} body hợp lệ"
    ],
    "expected": "Thiếu required -> 400 với thông báo field (KỲ VỌNG). Trùng mã -> chặn/400 (KỲ VỌNG nghiệp vụ unique mã lớp). PUT id sai -> 404 không 500. LƯU Ý: service hiện KHÔNG validate và FirstAsync(id) sẽ ném exception -> nếu trả 500/ tạo trùng mã = bug, tạo task fix.",
    "evidence": [
     {
      "name": "TC-TRN-018__s01__validation",
      "caption": "Response 400 thiếu required (kỳ vọng)",
      "uiState": "validation"
     },
     {
      "name": "TC-TRN-018__s02__error",
      "caption": "Response sửa id không tồn tại",
      "uiState": "error"
     }
    ],
    "notes": "Footgun: SaveClassAsync không validate; Save/Update dùng FirstAsync -> ném nếu không thấy."
   },
   {
    "id": "TC-TRN-019",
    "title": "Business rule: đăng ký học viên vượt sĩ số tối đa (API)",
    "category": "edge",
    "priority": "P1",
    "role": "Tester API",
    "preconditions": "Có lớp với MaxStudents nhỏ (vd 1) đã đủ học viên.",
    "steps": [
     "Enroll học viên cho tới khi enrolledCount = maxStudents",
     "POST /api/training/students/enroll thêm 1 học viên nữa cho cùng lớp",
     "Mở lại drawer học viên kiểm n/max"
    ],
    "expected": "Vượt sĩ số bị chặn với thông báo 'Lớp đã đủ sĩ số' (KỲ VỌNG nghiệp vụ). LƯU Ý: EnrollStudentAsync hiện KHÔNG kiểm MaxStudents -> nếu cho enroll vượt = bug an toàn dữ liệu, tạo task fix; n/max sẽ hiển thị n>max.",
    "evidence": [
     {
      "name": "TC-TRN-019__s01__drawer",
      "caption": "n/max sau khi cố enroll vượt",
      "uiState": "drawer"
     }
    ],
    "notes": "Footgun: không enforce cap; cũng không chặn enroll trùng StaffId 1 lớp."
   },
   {
    "id": "TC-TRN-020",
    "title": "State học viên: cấp chứng chỉ tự chuyển 'Hoàn thành' + chặn chuyển trạng thái không hợp lệ",
    "category": "state",
    "priority": "P1",
    "role": "Tester API / Quản lý đào tạo",
    "preconditions": "Có 1 học viên trạng thái 'Đã đăng ký' (AttendanceStatus=1).",
    "steps": [
     "PUT /api/training/students/{id}/certificate với certificateNumber",
     "Mở drawer học viên kiểm trạng thái + cột chứng chỉ",
     "Thử PUT status quay về 'Đã đăng ký' (1) sau khi đã cấp chứng chỉ",
     "Thử cấp chứng chỉ cho học viên đang 'Bỏ học' (4)"
    ],
    "expected": "Cấp chứng chỉ -> AttendanceStatus tự = 3 (Hoàn thành), badge tone ok, cột chứng chỉ hiện số. Chuyển ngược về 'Đã đăng ký' sau khi đã hoàn thành/đã cấp chứng chỉ nên bị chặn (KỲ VỌNG). Cấp chứng chỉ cho 'Bỏ học' nên bị chặn. LƯU Ý: hiện KHÔNG có guard transition -> nếu cho phép = bug, tạo task fix.",
    "evidence": [
     {
      "name": "TC-TRN-020__s01__drawer",
      "caption": "Học viên Hoàn thành + có chứng chỉ",
      "uiState": "drawer"
     }
    ],
    "notes": "IssueCertificateAsync set status=3; UpdateStudentStatusAsync không validate transition."
   },
   {
    "id": "TC-TRN-021",
    "title": "Data-consistency CME: cấp chứng chỉ làm tăng KPI 'CME tuân thủ %' và credit-summary",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản lý đào tạo",
    "preconditions": "Học viên là nhân viên (StaffId) chưa có chứng chỉ; biết tổng số user.",
    "steps": [
     "Ghi nhận KPI CME% và GET /api/training/credit-summary trước",
     "Enroll 1 nhân viên vào lớp có CreditHours>0, hoàn thành + cấp chứng chỉ",
     "Làm mới trang -> KPI CME%",
     "GET /api/training/credit-summary lại"
    ],
    "expected": "CME% tăng (staffWithCme = distinct StaffId có status=3 và CertificateNumber != null tăng 1); credit-summary có dòng nhân viên đó với TotalCredits cộng CreditHours của lớp đã hoàn thành. Học viên ngoài (ExternalName, StaffId null) KHÔNG tính vào CME/credit.",
    "evidence": [
     {
      "name": "TC-TRN-021__s01__list",
      "caption": "KPI CME% sau khi cấp chứng chỉ",
      "uiState": "list"
     }
    ],
    "notes": "GetCreditSummaryAsync chỉ tính StaffId.HasValue và status=3."
   },
   {
    "id": "TC-TRN-022",
    "title": "Audit log: mọi mutation lớp/học viên được ghi vết",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Admin/Audit",
    "preconditions": "Có quyền xem AuditLog/CreatedBy-UpdatedBy.",
    "steps": [
     "Tạo 1 lớp mới, ghi nhận thời điểm",
     "Sửa lớp, cấp chứng chỉ học viên",
     "Kiểm AuditLog và trường CreatedBy/UpdatedBy của lớp/học viên"
    ],
    "expected": "Mỗi tạo/sửa/cấp chứng chỉ tạo bản ghi audit và CreatedBy/UpdatedBy là user thật (khác Guid.Empty). LƯU Ý: service hiện KHÔNG set CreatedBy/UpdatedBy và KHÔNG ghi AuditLog -> nếu thiếu = bug tuân thủ, tạo task fix.",
    "evidence": [
     {
      "name": "TC-TRN-022__s01__detail",
      "caption": "Trường audit/CreatedBy của lớp",
      "uiState": "detail"
     }
    ],
    "notes": "Footgun: SaveClassAsync chỉ set CreatedAt/UpdatedAt, không có CreatedBy/audit."
   },
   {
    "id": "TC-TRN-023",
    "title": "Responsive: màn Đào tạo trên màn hẹp (toolbar/bảng/drawer)",
    "category": "ui",
    "priority": "P2",
    "role": "Quản lý đào tạo",
    "preconditions": "Trang có dữ liệu.",
    "steps": [
     "Thu hẹp viewport ~1024px rồi ~768px",
     "Kiểm toolbar (search/filter/nút), StatusTabs, bảng nhiều cột",
     "Mở drawer chi tiết + drawer học viên ở màn hẹp"
    ],
    "expected": "Toolbar không tràn/đè; bảng cuộn ngang gọn không vỡ; drawer chiếm size phù hợp, nội dung không bị cắt; nút action vẫn bấm được.",
    "evidence": [
     {
      "name": "TC-TRN-023__s01__list",
      "caption": "Danh sách màn hẹp",
      "uiState": "list"
     },
     {
      "name": "TC-TRN-023__s02__drawer",
      "caption": "Drawer học viên màn hẹp",
      "uiState": "drawer"
     }
    ]
   },
   {
    "id": "TC-TRN-024",
    "title": "Phân trang: nhiều lớp, chuyển trang giữ filter/tab",
    "category": "edge",
    "priority": "P2",
    "role": "Quản lý đào tạo",
    "preconditions": "Có > 18 lớp (PER=18).",
    "steps": [
     "Kiểm Pager hiển thị tổng và số trang",
     "Sang trang 2, rồi áp 1 filter -> kiểm trang reset về 1/0",
     "Xóa hết lọc khi đang ở trang cuối"
    ],
    "expected": "Pager đúng tổng/số trang (ceil(filtered/18)); đổi search/filter/tab reset page về 0; không có trang trống ngoài range; dữ liệu trang khớp slice.",
    "evidence": [
     {
      "name": "TC-TRN-024__s01__list",
      "caption": "Pager trang 2",
      "uiState": "list"
     },
     {
      "name": "TC-TRN-024__s02__filter",
      "caption": "Reset trang khi đổi filter",
      "uiState": "filter"
     }
    ]
   }
  ],
  "ui_state_checklist": [
   "list - danh sách lớp đào tạo có dữ liệu",
   "empty - 'Chưa có lớp đào tạo' và 'Chưa có học viên đăng ký'",
   "loading - 'Đang tải...' bảng lớp và drawer học viên",
   "error - toast 'Không tải được...' + KPI fallback 0 + API 403/404",
   "form - modal Mở/Sửa lớp đã điền",
   "modal - CrudModal mở lớp",
   "validation - lỗi required field + lỗi ngày + response 400",
   "drawer - drawer chi tiết lớp + drawer danh sách học viên",
   "detail - field trạng thái/audit trong drawer",
   "filter - sau search + filter loại + đổi StatusTab",
   "success - toast 'Đã mở/cập nhật lớp đào tạo'",
   "permission - menu/nút bị ẩn với vai trò hạn chế",
   "list (KPI) - KPI strip trước/sau thay đổi",
   "dark/light - parity 2 theme cho list/drawer/modal"
  ],
  "gaps": [
   "PHÂN HỆ CHƯA CÓ ISSUE TEST RIÊNG trên GitHub (không nằm trong #216-289) -> ứng viên tạo issue [TEST] Đào tạo & NCKH mới, để user duyệt (không tự tạo).",
   "Backend TrainingResearchController CHỈ [Authorize], KHÔNG phân quyền vai trò -> mọi user đăng nhập có thể tạo/sửa lớp; cần đối chiếu matrix #216 và bổ sung [Authorize(Roles/Policy)]. Ứng viên bug bảo mật.",
   "Service KHÔNG validate phía server: thiếu required (ClassCode/ClassName), không chặn EndDate<StartDate, không chặn số âm (MaxStudents/CreditHours/Fee), không unique ClassCode -> cần test API + tạo task fix.",
   "EnrollStudentAsync KHÔNG enforce MaxStudents và không chặn enroll trùng StaffId trong 1 lớp -> n có thể > max; ứng viên bug an toàn dữ liệu.",
   "UpdateStudentStatusAsync KHÔNG có guard chuyển trạng thái hợp lệ (Đã đăng ký->Đang học->Hoàn thành->Bỏ học); IssueCertificate có thể cấp cho học viên 'Bỏ học'. Cần test state-machine.",
   "KHÔNG ghi AuditLog và KHÔNG set CreatedBy/UpdatedBy (chỉ CreatedAt/UpdatedAt) -> vi phạm yêu cầu audit mọi mutation; cần test + fix.",
   "Lệch enum trạng thái lớp: FE map status 0-4 (0='Lên kế hoạch') nhưng BE chỉ trả 1-4 ('Kế hoạch'); tab 'Lên KH' luôn 0, nhãn không khớp -> ứng viên bug nhất quán.",
   "GAP UI lớn: Enroll học viên / Cập nhật trạng thái-điểm / Cấp chứng chỉ ĐÃ có API nhưng CHƯA có nút trên FE (drawer học viên read-only) -> không test được qua UI, chỉ test API; cần task feature để hoàn thiện rồi mới phủ UI.",
   "GAP UI: Đề tài NCKH (ResearchProjects) và Chỉ đạo tuyến (ClinicalDirections) có đủ API + dashboard nhưng KHÔNG có route/page FE (nút NCKH bị ẩn, không có /v2/research) -> 2 nghiệp vụ này hoàn toàn chưa test được ở UI; nên tạo task feature + test riêng sau.",
   "Chưa rõ ràng buộc unique ProjectCode/ClassCode và quan hệ FK Instructor/Department/Investigator hợp lệ -> cần test negative API với id GV/khoa không tồn tại.",
   "Chưa có test luồng xóa lớp/học viên (soft-delete IsDeleted) vì FE không có nút xóa; cần xác nhận có yêu cầu xóa hay không."
  ]
 }
]);
