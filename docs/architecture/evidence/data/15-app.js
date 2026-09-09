/* Phân hệ 'App mobile hỗ trợ người bệnh' (HSMT NangCapMobileApp) — viết tay, KHÔNG do
   workflow his-testplan-evidence sinh. Để riêng một file để lần chạy lại workflow không
   ghi đè mất. Ảnh nằm ở thư mục evidence/spec-app/, sinh bởi
   mobile/patient_app/integration_test/screenshots_test.dart. */
window.TP.modules.push(...[
 {
  "id": "app",
  "code": "APP",
  "layer": "spec",
  "ic": "📱",
  "nm": "App mobile hỗ trợ người bệnh",
  "gh": [
   "#218"
  ],
  "gap": false,
  "module_id": "app",
  "summary": "Gói thầu 'Thuê phần mềm ứng dụng di động phục vụ công tác quản lý, hỗ trợ người bệnh' (HSMT `docs/mobile/NangCapMobileApp.pdf`). Ba phần: app Flutter cho người bệnh (I.2), web quản trị + module tra cứu cho nhân viên (I.3), và BFF `HIS.PatientApp.Api` gọi HIS qua HTTP đúng chữ I.1 'dựa trên các API HIS cung cấp'. Bảng đối chiếu nghiệm thu đầy đủ: `docs/features/patient-app/acceptance-matrix.md`.",
  "screens": [
   {
    "name": "Đăng nhập · đăng ký · quên mật khẩu",
    "desc": "Thẻ xác thực, xác minh OTP theo số điện thoại.",
    "route_guess": "app://login",
    "elements": []
   },
   {
    "name": "Trang chủ",
    "desc": "7 lối tắt theo các nhóm chức năng HSMT I.2, kèm mã bệnh nhân.",
    "route_guess": "app://",
    "elements": []
   },
   {
    "name": "Lấy số thứ tự",
    "desc": "Chọn khoa/phòng, xin số ưu tiên có lý do, xem số đang gọi và số người phía trước.",
    "route_guess": "app://queue",
    "elements": []
   },
   {
    "name": "Đặt khám",
    "desc": "Khung giờ đọc từ lịch trực thật; đặt, huỷ, đổi lịch; nhắc trước 1 ngày và 1 giờ.",
    "route_guess": "app://appointments",
    "elements": []
   },
   {
    "name": "Kết quả ngoại trú",
    "desc": "Xét nghiệm (bảng chỉ số + cờ bất thường + bản in), chẩn đoán hình ảnh (ảnh PACS), thăm dò chức năng, đơn thuốc, khám sức khoẻ hợp đồng.",
    "route_guess": "app://results",
    "elements": []
   },
   {
    "name": "Kết quả nội trú",
    "desc": "Đợt điều trị, chỉ định cận lâm sàng kèm số thứ tự thực hiện, công khai thuốc theo ngày.",
    "route_guess": "app://admissions",
    "elements": []
   },
   {
    "name": "Gia đình",
    "desc": "Tối đa 20 thành viên, hai đường xác minh, ba quyền tách rời, thu hồi được.",
    "route_guess": "app://family",
    "elements": []
   },
   {
    "name": "Ví giấy tờ",
    "desc": "Ảnh và PDF mã hoá AES-256-GCM, hạn mức 10 MB/tệp và 100 MB/tài khoản.",
    "route_guess": "app://documents",
    "elements": []
   },
   {
    "name": "Bảo mật",
    "desc": "Đổi mật khẩu lần đầu, PIN 6 số, sinh trắc, thiết bị đăng nhập, tự khoá sau 2 phút, xoá tài khoản.",
    "route_guess": "app://security",
    "elements": []
   },
   {
    "name": "Tra cứu CSKH",
    "desc": "Nhân viên tra hồ sơ hỗ trợ người bệnh qua điện thoại; mọi lần tra đều vào nhật ký.",
    "route_guess": "app://staff",
    "elements": []
   }
  ],
  "tasks": [
   {
    "id": "TC-APP-001",
    "title": "Màn đăng nhập mở được trên cả hai nền tảng ở ngưỡng phiên bản HSMT",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Mở app khi chưa đăng nhập"
    ],
    "expected": "Hiện thẻ đăng nhập 'Hỗ trợ người bệnh' với ô số điện thoại + mật khẩu, lối vào đăng ký và quên mật khẩu.",
    "evidence": [
     {
      "name": "TC-APP-001__s01__form",
      "caption": "HSMT I.2 #2 Đăng nhập — chụp trên Android 7.1.1 (API 25)",
      "uiState": "form"
     },
     {
      "name": "TC-APP-001__s02__form",
      "caption": "HSMT I.2 #2 Đăng nhập — chụp trên iOS 12 simulator",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": "Ngưỡng iOS 12.0 được chứng minh bằng chính bản build (MinimumOSVersion trong Info.plist), không phải bằng khai báo."
   },
   {
    "id": "TC-APP-002",
    "title": "Đăng ký tài khoản mới",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Ở màn đăng nhập bấm 'Đăng ký tài khoản mới'"
    ],
    "expected": "Mở màn 'Đăng ký tài khoản' với các ô họ tên, số điện thoại, mật khẩu và bước xác minh OTP.",
    "evidence": [
     {
      "name": "TC-APP-002__s01__form",
      "caption": "HSMT I.2 #2 Đăng nhập — chụp trên Android 7.1.1 (API 25)",
      "uiState": "form"
     },
     {
      "name": "TC-APP-002__s02__form",
      "caption": "HSMT I.2 #2 Đăng nhập — chụp trên iOS 12 simulator",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-003",
    "title": "Quên mật khẩu",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Ở màn đăng nhập bấm 'Quên mật khẩu?'"
    ],
    "expected": "Mở màn 'Quên mật khẩu' nhận số điện thoại để gửi mã xác minh.",
    "evidence": [
     {
      "name": "TC-APP-003__s01__form",
      "caption": "HSMT I.2 #2 Đăng nhập — chụp trên Android 7.1.1 (API 25)",
      "uiState": "form"
     },
     {
      "name": "TC-APP-003__s02__form",
      "caption": "HSMT I.2 #2 Đăng nhập — chụp trên iOS 12 simulator",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-004",
    "title": "Trang chủ sau khi đăng nhập, hồ sơ đã liên kết",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Đăng nhập bằng tài khoản đã liên kết hồ sơ bệnh nhân"
    ],
    "expected": "Trang chủ hiện mã bệnh nhân và đủ 7 lối tắt: lấy số thứ tự, đặt khám, kết quả, nội trú, gia đình, ví giấy tờ, thông báo.",
    "evidence": [
     {
      "name": "TC-APP-004__s01__list",
      "caption": "HSMT I.2 #2 Đăng nhập — chụp trên Android 7.1.1 (API 25)",
      "uiState": "list"
     },
     {
      "name": "TC-APP-004__s02__list",
      "caption": "HSMT I.2 #2 Đăng nhập — chụp trên iOS 12 simulator",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-005",
    "title": "Tài khoản bị buộc đổi mật khẩu KHÔNG vào được màn nào khác",
    "category": "negative",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Đăng nhập bằng tài khoản có cờ buộc đổi mật khẩu"
    ],
    "expected": "App đưa thẳng tới 'Đổi mật khẩu lần đầu', không bấm back được, và không thấy lối tắt nào của trang chủ. Máy chủ chặn độc lập: mọi API khác trả 403 PASSWORD_CHANGE_REQUIRED (phase7 TC-S05).",
    "evidence": [
     {
      "name": "TC-APP-005__s01__permission",
      "caption": "HSMT I.2 #9 Bảo mật — chụp trên Android 7.1.1 (API 25)",
      "uiState": "permission"
     },
     {
      "name": "TC-APP-005__s02__permission",
      "caption": "HSMT I.2 #9 Bảo mật — chụp trên iOS 12 simulator",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-006",
    "title": "Chưa liên kết hồ sơ thì nói rõ lý do thay vì để trống",
    "category": "edge",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Đăng nhập bằng tài khoản chưa liên kết hồ sơ bệnh nhân"
    ],
    "expected": "Trang chủ hiện lời giải thích 'chưa liên kết hồ sơ' kèm hướng dẫn, không phải một màn trắng.",
    "evidence": [
     {
      "name": "TC-APP-006__s01__empty",
      "caption": "HSMT I.2 #2 Đăng nhập — chụp trên Android 7.1.1 (API 25)",
      "uiState": "empty"
     },
     {
      "name": "TC-APP-006__s02__empty",
      "caption": "HSMT I.2 #2 Đăng nhập — chụp trên iOS 12 simulator",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-010",
    "title": "Chọn khoa và phòng để lấy số thứ tự",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Từ trang chủ vào 'Lấy số thứ tự'"
    ],
    "expected": "Hiện danh sách khoa kèm số bác sĩ đang trực và danh sách phòng khám kèm số người đang chờ.",
    "evidence": [
     {
      "name": "TC-APP-010__s01__list",
      "caption": "HSMT I.2 #3 Lấy số thứ tự — chụp trên Android 7.1.1 (API 25)",
      "uiState": "list"
     },
     {
      "name": "TC-APP-010__s02__list",
      "caption": "HSMT I.2 #3 Lấy số thứ tự — chụp trên iOS 12 simulator",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": "Ưu tiên (người cao tuổi, trẻ dưới 6 tuổi, thai phụ, khuyết tật nặng, người có công) đã kiểm bằng smoke-queue-priority.py."
   },
   {
    "id": "TC-APP-011",
    "title": "Theo dõi số đã lấy: đang gọi số nào, còn bao nhiêu người, ước tính bao nhiêu phút",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "Đã lấy một số thứ tự trong ngày. Máy chủ giả trả trạng thái vé ở chế độ `full`.",
    "steps": [
     "Từ màn lấy số, mở vé đã lấy (hoặc mở thẳng /queue/ticket/<id>)"
    ],
    "expected": "Hiện mã vé, số đang được gọi, **số người còn phía trước** và **ước tính số phút** — ba con số mà HSMT I.2 #3 đòi, không chỉ 'số của bạn là 42'. Màn tự hỏi lại máy chủ mỗi 20 giây; HIS chưa có kênh realtime cho hàng đợi (khảo sát §11.4 GAP 16) nên hỏi lại định kỳ là cách trung thực nhất hiện có.",
    "evidence": [
     {
      "name": "TC-APP-011__s01__detail",
      "caption": "Chụp trên Android 7.1.1 (API 25)",
      "uiState": "detail"
     },
     {
      "name": "TC-APP-011__s02__detail",
      "caption": "Chụp trên iOS 12 simulator",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": "Vé ưu tiên chưa xác minh vẫn hiện là ưu tiên, kèm ghi chú quầy sẽ kiểm khi gọi số."
   },
   {
    "id": "TC-APP-020",
    "title": "Danh sách lịch hẹn đã đặt",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Từ trang chủ vào 'Đặt khám'"
    ],
    "expected": "Hiện các lịch hẹn kèm mã lịch, giờ, khoa, bác sĩ, phòng và trạng thái.",
    "evidence": [
     {
      "name": "TC-APP-020__s01__list",
      "caption": "HSMT I.2 #4 Đặt khám — chụp trên Android 7.1.1 (API 25)",
      "uiState": "list"
     },
     {
      "name": "TC-APP-020__s02__list",
      "caption": "HSMT I.2 #4 Đặt khám — chụp trên iOS 12 simulator",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-021",
    "title": "Đặt lịch khám mới theo lịch trực thật của bác sĩ",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Ở màn đặt khám bấm tạo lịch mới"
    ],
    "expected": "Hiện khoa, bác sĩ và các khung giờ CÒN CHỖ đọc từ lịch trực thật (DoctorSchedule), không phải khung giờ cố định.",
    "evidence": [
     {
      "name": "TC-APP-021__s01__form",
      "caption": "HSMT I.2 #4 Đặt khám — chụp trên Android 7.1.1 (API 25)",
      "uiState": "form"
     },
     {
      "name": "TC-APP-021__s02__form",
      "caption": "HSMT I.2 #4 Đặt khám — chụp trên iOS 12 simulator",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-030",
    "title": "Danh sách kết quả khám chữa bệnh ngoại trú",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Từ trang chủ vào 'Kết quả'"
    ],
    "expected": "Hiện các tab xét nghiệm / chẩn đoán hình ảnh / thăm dò chức năng / đơn thuốc, lọc được theo lượt khám.",
    "evidence": [
     {
      "name": "TC-APP-030__s01__list",
      "caption": "HSMT I.2 #5 Kết quả ngoại trú — chụp trên Android 7.1.1 (API 25)",
      "uiState": "list"
     },
     {
      "name": "TC-APP-030__s02__list",
      "caption": "HSMT I.2 #5 Kết quả ngoại trú — chụp trên iOS 12 simulator",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-031",
    "title": "Chi tiết phiếu xét nghiệm có chỉ số bất thường",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Mở một phiếu xét nghiệm đã có kết quả"
    ],
    "expected": "Bảng chỉ số đủ kết quả · đơn vị · khoảng tham chiếu; chỉ số ngoài khoảng được tô đỏ kèm mũi tên lên/xuống; có cảnh báo mang kết quả tới bác sĩ; và câu 'không tự chẩn đoán' luôn hiện.",
    "evidence": [
     {
      "name": "TC-APP-031__s01__detail",
      "caption": "HSMT I.2 #5 Kết quả ngoại trú — chụp trên Android 7.1.1 (API 25)",
      "uiState": "detail"
     },
     {
      "name": "TC-APP-031__s02__detail",
      "caption": "HSMT I.2 #5 Kết quả ngoại trú — chụp trên iOS 12 simulator",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": "Cờ rỗng KHÔNG được tính là bất thường — xem test result_models_test.dart."
   },
   {
    "id": "TC-APP-032",
    "title": "Đơn thuốc",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Ở màn kết quả mở tab đơn thuốc"
    ],
    "expected": "Hiện từng thuốc kèm hàm lượng, số lượng và dòng liều dùng ghép sẵn (ví dụ '1 viên · 1 lần/ngày · 28 ngày').",
    "evidence": [
     {
      "name": "TC-APP-032__s01__list",
      "caption": "HSMT I.2 #5 Kết quả ngoại trú — chụp trên Android 7.1.1 (API 25)",
      "uiState": "list"
     },
     {
      "name": "TC-APP-032__s02__list",
      "caption": "HSMT I.2 #5 Kết quả ngoại trú — chụp trên iOS 12 simulator",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-040",
    "title": "Các đợt điều trị nội trú",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Từ trang chủ vào 'Nội trú'"
    ],
    "expected": "Hiện các đợt nhập viện kèm khoa, phòng, giường, ngày vào, chẩn đoán và trạng thái.",
    "evidence": [
     {
      "name": "TC-APP-040__s01__list",
      "caption": "HSMT I.2 #6 Kết quả nội trú — chụp trên Android 7.1.1 (API 25)",
      "uiState": "list"
     },
     {
      "name": "TC-APP-040__s02__list",
      "caption": "HSMT I.2 #6 Kết quả nội trú — chụp trên iOS 12 simulator",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-041",
    "title": "Công khai thuốc theo ngày của đợt nội trú",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Mở một đợt điều trị rồi xem bảng công khai thuốc"
    ],
    "expected": "Từng ngày liệt kê thuốc kèm số lượng, đơn giá, thành tiền, phần BHYT chi trả và phần người bệnh trả.",
    "evidence": [
     {
      "name": "TC-APP-041__s01__detail",
      "caption": "HSMT I.2 #6 Kết quả nội trú — chụp trên Android 7.1.1 (API 25)",
      "uiState": "detail"
     },
     {
      "name": "TC-APP-041__s02__detail",
      "caption": "HSMT I.2 #6 Kết quả nội trú — chụp trên iOS 12 simulator",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": "GAP 32 — trước đây HIS chỉ xuất được bản in PDF, không có API JSON."
   },
   {
    "id": "TC-APP-050",
    "title": "Danh sách người thân đã kết nối",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Từ trang chủ vào 'Gia đình'"
    ],
    "expected": "Hiện tối đa 20 thành viên, mỗi người kèm quan hệ, trạng thái xác minh và ba quyền tách rời (xem kết quả · đặt khám · lấy số).",
    "evidence": [
     {
      "name": "TC-APP-050__s01__list",
      "caption": "HSMT I.2 #7 Gia đình — chụp trên Android 7.1.1 (API 25)",
      "uiState": "list"
     },
     {
      "name": "TC-APP-050__s02__list",
      "caption": "HSMT I.2 #7 Gia đình — chụp trên iOS 12 simulator",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": "Liên kết CHƯA xác minh không được xem hồ sơ — kiểm ở wallet_family_models_test.dart."
   },
   {
    "id": "TC-APP-060",
    "title": "Ví giấy tờ và hạn mức dung lượng",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Từ trang chủ vào 'Ví giấy tờ'"
    ],
    "expected": "Hiện giấy tờ theo nhóm (CCCD, thẻ BHYT, giấy ra viện…), cỡ tệp đọc được và thanh dung lượng đã dùng / hạn mức.",
    "evidence": [
     {
      "name": "TC-APP-060__s01__list",
      "caption": "HSMT I.2 #8 Ví giấy tờ — chụp trên Android 7.1.1 (API 25)",
      "uiState": "list"
     },
     {
      "name": "TC-APP-060__s02__list",
      "caption": "HSMT I.2 #8 Ví giấy tờ — chụp trên iOS 12 simulator",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": "Tệp trên đĩa được mã hoá AES-256-GCM, mỗi tệp một nonce — kiểm ở DocumentVaultTests."
   },
   {
    "id": "TC-APP-070",
    "title": "Hộp thư thông báo",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Từ trang chủ vào 'Thông báo'"
    ],
    "expected": "Hiện các thông báo chưa đọc/đã đọc kèm deep-link về đúng màn (kết quả xét nghiệm, nhắc lịch khám, chiến dịch của bệnh viện).",
    "evidence": [
     {
      "name": "TC-APP-070__s01__list",
      "caption": "HSMT I.2 #2 Chạy ngầm nhận thông báo — chụp trên Android 7.1.1 (API 25)",
      "uiState": "list"
     },
     {
      "name": "TC-APP-070__s02__list",
      "caption": "HSMT I.2 #2 Chạy ngầm nhận thông báo — chụp trên iOS 12 simulator",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-080",
    "title": "Cài đặt bảo mật",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Từ trang chủ vào 'Bảo mật'"
    ],
    "expected": "Hiện các mục: mã PIN, đăng nhập sinh trắc, thiết bị đăng nhập, đổi mật khẩu và xoá tài khoản.",
    "evidence": [
     {
      "name": "TC-APP-080__s01__list",
      "caption": "HSMT I.2 #9 Bảo mật — chụp trên Android 7.1.1 (API 25)",
      "uiState": "list"
     },
     {
      "name": "TC-APP-080__s02__list",
      "caption": "HSMT I.2 #9 Bảo mật — chụp trên iOS 12 simulator",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-081",
    "title": "Đặt mã PIN 6 số",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Ở màn bảo mật chọn đặt mã PIN"
    ],
    "expected": "Nhận PIN 6 số và TỪ CHỐI ngay trên máy các PIN dễ đoán (sáu số giống nhau, dãy liên tiếp) để khỏi chờ một vòng mạng.",
    "evidence": [
     {
      "name": "TC-APP-081__s01__form",
      "caption": "HSMT I.2 #9 Bảo mật — chụp trên Android 7.1.1 (API 25)",
      "uiState": "form"
     },
     {
      "name": "TC-APP-081__s02__form",
      "caption": "HSMT I.2 #9 Bảo mật — chụp trên iOS 12 simulator",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-082",
    "title": "Danh sách thiết bị đăng nhập",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Ở màn bảo mật chọn thiết bị đăng nhập"
    ],
    "expected": "Hiện mọi máy đang đăng nhập kèm nền tảng, phiên bản hệ điều hành và lần dùng gần nhất; máy hiện tại được đánh dấu; đăng xuất từ xa có hiệu lực NGAY lần gọi API kế tiếp (auth TC-13).",
    "evidence": [
     {
      "name": "TC-APP-082__s01__list",
      "caption": "HSMT I.2 #9 Bảo mật — chụp trên Android 7.1.1 (API 25)",
      "uiState": "list"
     },
     {
      "name": "TC-APP-082__s02__list",
      "caption": "HSMT I.2 #9 Bảo mật — chụp trên iOS 12 simulator",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-083",
    "title": "Xoá tài khoản — bắt buộc theo quy định của cả hai kho ứng dụng",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Ở màn bảo mật chọn xoá tài khoản"
    ],
    "expected": "Hiện bản xem trước những gì sẽ mất (thiết bị, giấy tờ trong ví, liên kết gia đình), đòi nhập mật khẩu, và nói rõ HỒ SƠ BỆNH ÁN tại bệnh viện vẫn được giữ theo quy định lưu trữ y tế.",
    "evidence": [
     {
      "name": "TC-APP-083__s01__confirm",
      "caption": "HSMT I.2 #9 Bảo mật — chụp trên Android 7.1.1 (API 25)",
      "uiState": "confirm"
     },
     {
      "name": "TC-APP-083__s02__confirm",
      "caption": "HSMT I.2 #9 Bảo mật — chụp trên iOS 12 simulator",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": "phase7 TC-P06…TC-P11 — tệp trong ví bị xoá khỏi đĩa, nhật ký truy cập thì không."
   },
   {
    "id": "TC-APP-090",
    "title": "Màn tra cứu cho nhân viên chăm sóc khách hàng",
    "category": "happy",
    "priority": "P0",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Bộ chụp dùng máy chủ giả ở TẦNG HTTP (`integration_test/demo_backend.dart`) nên mọi kho dữ liệu và mọi `fromJson` vẫn chạy bằng mã thật; phần nghiệp vụ với API + CSDL thật do `scripts/smoke-patient-app-*.py` kiểm riêng.",
    "steps": [
     "Đăng nhập bằng tài khoản nhân viên rồi vào màn tra cứu"
    ],
    "expected": "Nhân viên tra được hồ sơ người bệnh để hỗ trợ qua điện thoại; mọi lần tra đều ghi nhật ký truy cập.",
    "evidence": [
     {
      "name": "TC-APP-090__s01__form",
      "caption": "HSMT I.3 #2 Module tra cứu — chụp trên Android 7.1.1 (API 25)",
      "uiState": "form"
     },
     {
      "name": "TC-APP-090__s02__form",
      "caption": "HSMT I.3 #2 Module tra cứu — chụp trên iOS 12 simulator",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": "Vai trò ngoài danh sách nhận 403 kèm lời giải thích, không phải màn trống — phase6."
   },
   {
    "id": "TC-APP-100",
    "title": "Máy chủ hỏng (500): nói người bệnh nên làm gì, có nút thử lại",
    "category": "negative",
    "priority": "P1",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Máy chủ giả (`integration_test/demo_backend.dart`) được đặt sang chế độ `serverError` (trả 500) hoặc `empty` (trả danh sách rỗng), nên màn hình đi qua đúng nhánh xử lý thật của nó.",
    "steps": [
     "Đặt máy chủ giả sang chế độ trả 500",
     "Mở màn Kết quả"
    ],
    "expected": "Hiện lời giải thích đọc được bằng tiếng Việt kèm nút thử lại. **Không được lộ mã lỗi kỹ thuật hay vết ngăn xếp** — bộ chụp khẳng định bằng `expect(find.textContaining('Exception'), findsNothing)`.",
    "evidence": [
     {
      "name": "TC-APP-100__s01__error",
      "caption": "Chụp trên Android 7.1.1 (API 25)",
      "uiState": "error"
     },
     {
      "name": "TC-APP-100__s02__error",
      "caption": "Chụp trên iOS 12 simulator",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": "Với app y tế, màn lỗi mới là màn đáng soi: người bệnh gặp nó đúng lúc đang lo về kết quả của mình."
   },
   {
    "id": "TC-APP-101",
    "title": "Chưa có kết quả nào: nói rõ chứ không để màn trắng",
    "category": "edge",
    "priority": "P1",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Máy chủ giả (`integration_test/demo_backend.dart`) được đặt sang chế độ `serverError` (trả 500) hoặc `empty` (trả danh sách rỗng), nên màn hình đi qua đúng nhánh xử lý thật của nó.",
    "steps": [
     "Đặt máy chủ giả sang chế độ trả danh sách rỗng",
     "Mở màn Kết quả"
    ],
    "expected": "Hiện thông điệp 'chưa có dữ liệu' thay vì một bảng trống — người bệnh phải phân biệt được 'chưa có kết quả' với 'app hỏng'.",
    "evidence": [
     {
      "name": "TC-APP-101__s01__empty",
      "caption": "Chụp trên Android 7.1.1 (API 25)",
      "uiState": "empty"
     },
     {
      "name": "TC-APP-101__s02__empty",
      "caption": "Chụp trên iOS 12 simulator",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-102",
    "title": "Hộp thư thông báo rỗng",
    "category": "edge",
    "priority": "P1",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Máy chủ giả (`integration_test/demo_backend.dart`) được đặt sang chế độ `serverError` (trả 500) hoặc `empty` (trả danh sách rỗng), nên màn hình đi qua đúng nhánh xử lý thật của nó.",
    "steps": [
     "Máy chủ giả trả rỗng",
     "Mở màn Thông báo"
    ],
    "expected": "Hộp thư rỗng có thông điệp riêng, không phải một danh sách trắng.",
    "evidence": [
     {
      "name": "TC-APP-102__s01__empty",
      "caption": "Chụp trên Android 7.1.1 (API 25)",
      "uiState": "empty"
     },
     {
      "name": "TC-APP-102__s02__empty",
      "caption": "Chụp trên iOS 12 simulator",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-103",
    "title": "Ví giấy tờ chưa có gì",
    "category": "edge",
    "priority": "P1",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Máy chủ giả (`integration_test/demo_backend.dart`) được đặt sang chế độ `serverError` (trả 500) hoặc `empty` (trả danh sách rỗng), nên màn hình đi qua đúng nhánh xử lý thật của nó.",
    "steps": [
     "Máy chủ giả trả rỗng",
     "Mở màn Ví giấy tờ"
    ],
    "expected": "Hiện lời mời thêm giấy tờ đầu tiên kèm hạn mức, không phải màn trống.",
    "evidence": [
     {
      "name": "TC-APP-103__s01__empty",
      "caption": "Chụp trên Android 7.1.1 (API 25)",
      "uiState": "empty"
     },
     {
      "name": "TC-APP-103__s02__empty",
      "caption": "Chụp trên iOS 12 simulator",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-104",
    "title": "Chưa kết nối người thân nào",
    "category": "edge",
    "priority": "P1",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Máy chủ giả (`integration_test/demo_backend.dart`) được đặt sang chế độ `serverError` (trả 500) hoặc `empty` (trả danh sách rỗng), nên màn hình đi qua đúng nhánh xử lý thật của nó.",
    "steps": [
     "Máy chủ giả trả rỗng",
     "Mở màn Gia đình"
    ],
    "expected": "Hiện hướng dẫn thêm người thân và mức trần 20 thành viên.",
    "evidence": [
     {
      "name": "TC-APP-104__s01__empty",
      "caption": "Chụp trên Android 7.1.1 (API 25)",
      "uiState": "empty"
     },
     {
      "name": "TC-APP-104__s02__empty",
      "caption": "Chụp trên iOS 12 simulator",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-105",
    "title": "Đăng nhập bỏ trống: báo lỗi ngay trên máy, không chờ một vòng mạng",
    "category": "edge",
    "priority": "P1",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "App chạy trên máy Android 7.1.1 (API 25) hoặc iOS 12. Máy chủ giả (`integration_test/demo_backend.dart`) được đặt sang chế độ `serverError` (trả 500) hoặc `empty` (trả danh sách rỗng), nên màn hình đi qua đúng nhánh xử lý thật của nó.",
    "steps": [
     "Ở màn đăng nhập bấm 'Đăng nhập' khi chưa nhập gì"
    ],
    "expected": "Hiện thông báo dưới ô nhập ngay lập tức. Kiểm trên máy để người bệnh ở vùng sóng yếu không phải chờ một vòng mạng chỉ để biết mình quên nhập số điện thoại.",
    "evidence": [
     {
      "name": "TC-APP-105__s01__validation",
      "caption": "Chụp trên Android 7.1.1 (API 25)",
      "uiState": "validation"
     },
     {
      "name": "TC-APP-105__s02__validation",
      "caption": "Chụp trên iOS 12 simulator",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-APP-106",
    "title": "Đang chờ máy chủ: có dấu hiệu đang tải, không phải màn trắng",
    "category": "edge",
    "priority": "P1",
    "role": "Người bệnh (PortalPatient qua BFF)",
    "preconditions": "Máy chủ giả đặt sang chế độ `slow` (trễ 30 giây). Bộ chụp cố ý **không** dùng `pumpAndSettle` ở ca này: `pumpAndSettle` đợi cho hết mọi vòng quay, tức là đợi qua mất đúng khung hình cần chụp.",
    "steps": [
     "Mở màn Kết quả khi máy chủ trả lời rất chậm",
     "Chụp trong lúc còn đang chờ"
    ],
    "expected": "Hiện vòng quay chờ. Người bệnh ở vùng sóng yếu nhìn khung hình này lâu nhất trong cả app, nên để trắng ở đây là để họ tưởng app treo.",
    "evidence": [
     {
      "name": "TC-APP-106__s01__loading",
      "caption": "Chụp trên Android 7.1.1 (API 25)",
      "uiState": "loading"
     },
     {
      "name": "TC-APP-106__s02__loading",
      "caption": "Chụp trên iOS 12 simulator",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#218"
    ],
    "notes": ""
   }
  ],
  "gaps": [
   "**Đã đủ cả hai nền tảng:** 30 ô `s01` (Android 7.1.1 API 25) + 30 ô `s02` (iOS 12 simulator) = 60/60 ô có ảnh. Bộ iOS sinh bởi job macOS của `mobile-patient-app.yml`; máy phát triển chạy Windows nên không build được iOS tại chỗ.",
   "**Chưa chụp `success/toast`.** Toast thành công chỉ hiện sau một thao tác GHI thật (lấy số, đặt lịch, tải giấy tờ lên) — máy chủ giả hiện chỉ phục vụ các tuyến ĐỌC. Đường ghi đã được kiểm ở tầng API bằng `scripts/smoke-patient-app-*.py` với CSDL thật, nên đây là thiếu ảnh chứ không phải thiếu kiểm.",
   "**Chưa chụp `modal` · `drawer` · `tab` · `filter` · `dropdown`.** Bộ chụp dựng màn qua go_router nên vào thẳng trạng thái nghỉ của từng màn; các lớp phủ này cần chuỗi thao tác riêng.",
   "**Ảnh chụp trên MÁY ẢO, chưa phải máy thật.** Ngưỡng phiên bản thì đã chứng minh bằng chính bản build ra (Android API 25 thật sự chạy được; `MinimumOSVersion = 12.0` đọc từ Info.plist của bản build iOS). Phần chỉ máy thật mới nghiệm thu được là **cảm biến sinh trắc** và hiệu năng cuộn trên phần cứng đời đó — xem dòng I.2.9.3, C.2 và C.3 của bảng đối chiếu.",
   "**Nghiệp vụ không nằm trong bộ ảnh này.** Ảnh chứng minh app dựng và vẽ đúng trên đúng nền tảng; phần nghiệp vụ chạy với API + CSDL thật do 8 bộ `scripts/smoke-patient-app-*.py` (290 ca) đảm nhiệm, và web quản trị do `frontend/e2e/patient-app-admin.spec.ts` (7 ca)."
  ],
  "ui_state_checklist": [
   "form — ĐÃ CHỤP (đăng nhập · đăng ký · quên mật khẩu · đặt lịch · đặt PIN · tra cứu)",
   "list — ĐÃ CHỤP (trang chủ · lấy số · lịch hẹn · kết quả · đơn thuốc · nội trú · gia đình · ví · thông báo · bảo mật · thiết bị)",
   "detail — ĐÃ CHỤP (phiếu xét nghiệm có chỉ số bất thường · công khai thuốc theo ngày · theo dõi số thứ tự)",
   "empty — ĐÃ CHỤP (chưa liên kết hồ sơ · kết quả · hộp thư · ví giấy tờ · gia đình)",
   "error — ĐÃ CHỤP (máy chủ trả 500, không lộ vết ngăn xếp)",
   "loading — ĐÃ CHỤP (máy chủ trả lời chậm)",
   "validation — ĐÃ CHỤP (đăng nhập bỏ trống)",
   "permission — ĐÃ CHỤP (bị buộc đổi mật khẩu, không vào được màn nào khác)",
   "confirm — ĐÃ CHỤP (xoá tài khoản)",
   "success/toast · modal · drawer · tab · filter · dropdown — CHƯA CHỤP, xem phần gap"
  ]
 }
]);
