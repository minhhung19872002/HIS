window.TP.cross.push(...[
 {
  "id": "permission-matrix",
  "title": "Ma trận phân quyền (vai trò × màn/API/action)",
  "summary": "Ma trận test phân quyền RBAC cho HIS v2 (route /v2/*, TerminalLayout). Phủ 11 vai trò nghiệp vụ: Bác sĩ (DOCTOR), Điều dưỡng (NURSE), KTV CLS (LAB_TECH), Dược sĩ (PHARMACIST), Thư ký y khoa / Tiếp đón (RECEPTIONIST), Thu ngân (CASHIER), Giám định BHYT (BhxhInspector — Cổng thanh tra standalone /inspector-portal), Quản lý khoa/phòng, BGĐ/KHTH (báo cáo điều hành), Admin hệ thống (ADMIN), và Bệnh nhân (PortalPatient — Cổng/Telemedicine /m/patient-portal). Mỗi vai trò kiểm 3 trục: (1) sau đăng nhập CHỈ thấy menu/nút/API được phép; (2) bị chặn (403 backend / ẩn nút / redirect /login) với cái không được phép — đặc biệt vì FE ProtectedRoute CHỈ check authenticated, KHÔNG check role nên truy cập-thẳng-URL phải dựa vào ẩn-menu + backend [Authorize]/permission-claim trả 403; (3) account-state: tài khoản khóa (IsActive=false), 2FA/OTP, buộc đổi mật khẩu, token hết hạn. Cơ chế thực tế: roles seed ADMIN/DOCTOR/NURSE/RECEPTIONIST/PHARMACIST/LAB_TECH/CASHIER + portal role; JWT lưu localStorage (token, user) mang claims roles[]/permissions[]; AuthContext.hasRole/hasPermission; backend 64+ [Authorize] trên controllers. Bằng chứng (evidence) chụp màn sau đăng nhập của từng vai trò + mọi trường hợp bị chặn (state=permission), validation account-state, audit ghi nhận mọi mutation. Tham chiếu issue cha #216 (test phân quyền tổng), #260 (Admin hệ thống). KHÔNG tạo issue trùng — đây là chi tiết hóa #216/#260. 20 task: TC-PERM-001..020. Tên evidence theo chuẩn TC-PERM-NNN__sNN__state (state hợp lệ gồm permission cho màn bị chặn).",
  "tasks": [
   {
    "id": "TC-PERM-001",
    "title": "Bác sĩ (DOCTOR) — đăng nhập, thấy đúng menu khám/CLS/kê đơn, bị chặn menu/API quản trị & thu ngân",
    "category": "permission",
    "priority": "P0",
    "role": "Bác sĩ (DOCTOR)",
    "preconditions": "Tồn tại user role DOCTOR (IsActive=true). Backend localhost:5106, FE /v2/*. Token rỗng trước test.",
    "steps": [
     "Đăng nhập bằng tài khoản bác sĩ; xác nhận token+user lưu localStorage, JWT chứa roles=[DOCTOR].",
     "Vào /v2/dashboard; mở sidebar TerminalLayout — chụp toàn bộ menu hiển thị.",
     "Xác nhận THẤY: Khám bệnh (OPD), Bệnh án/EMR, Chỉ định CLS, Kê đơn thuốc, kết quả CLS.",
     "Xác nhận KHÔNG thấy menu: Quản trị hệ thống (Users/Roles), Thu ngân/Thanh toán, Cấu hình kho dược, Giám định BHYT.",
     "Gõ thẳng URL /v2/system-admin (route Admin) — quan sát hành vi (redirect/ẩn/403 khi gọi API admin).",
     "Gọi trực tiếp 1 API quản trị (vd POST /api/admin/users) với token bác sĩ — kỳ vọng 403.",
     "Thực hiện 1 mutation hợp lệ (lưu bệnh án) — kiểm tra audit log ghi nhận user+thời điểm."
    ],
    "expected": "Bác sĩ chỉ thấy menu lâm sàng được phép; menu quản trị/thu ngân/kho bị ẩn. Truy cập-thẳng route admin không lộ dữ liệu; API admin trả 403. Mutation lâm sàng thành công + ghi audit. Không có nút thao tác ngoài quyền hiển thị.",
    "notes": "FE ProtectedRoute chỉ check authenticated (App.tsx:318) → route admin KHÔNG tự chặn theo role; phòng tuyến thật là ẩn-menu + backend [Authorize] 403. Đây là điểm rủi ro cần soi kỹ.",
    "refIssues": [
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-001__s01__list",
      "caption": "Sidebar sau đăng nhập bác sĩ — menu lâm sàng hiển thị",
      "uiState": "list"
     },
     {
      "name": "TC-PERM-001__s02__permission",
      "caption": "Truy cập thẳng /v2/system-admin bị chặn/không dữ liệu",
      "uiState": "permission"
     },
     {
      "name": "TC-PERM-001__s03__error",
      "caption": "API admin trả 403 với token bác sĩ",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-PERM-002",
    "title": "Điều dưỡng (NURSE) — thấy chăm sóc/tiêm truyền/sinh hiệu, bị chặn kê đơn-ký & xuất viện-duyệt",
    "category": "permission",
    "priority": "P0",
    "role": "Điều dưỡng (NURSE)",
    "preconditions": "User role NURSE (IsActive=true). Có bệnh nhân nội trú để thao tác.",
    "steps": [
     "Đăng nhập điều dưỡng; xác nhận roles=[NURSE] trong JWT.",
     "Mở sidebar — xác nhận THẤY: phiếu chăm sóc, ghi sinh hiệu, thực hiện y lệnh/tiêm truyền, theo dõi nội trú.",
     "Xác nhận KHÔNG thấy/không thao tác được: ký kê đơn của bác sĩ, duyệt xuất viện, cấu hình hệ thống, thu ngân.",
     "Mở màn kê đơn (nếu vào được) — nút Ký/Phát hành phải ẩn hoặc disabled với điều dưỡng.",
     "Gọi API ký đơn (vd PUT /api/prescriptions/{id}/sign) bằng token điều dưỡng — kỳ vọng 403.",
     "Ghi sinh hiệu hợp lệ — kiểm tra audit ghi nhận."
    ],
    "expected": "Điều dưỡng thao tác được điều dưỡng-vụ; nút/hành động bác-sĩ-only (ký đơn, duyệt xuất viện) bị ẩn/disabled; API ký trả 403. Mọi mutation ghi audit.",
    "notes": "Patient-safety: kiểm chặn điều dưỡng tự ký y lệnh là then chốt.",
    "refIssues": [
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-002__s01__list",
      "caption": "Menu điều dưỡng sau đăng nhập",
      "uiState": "list"
     },
     {
      "name": "TC-PERM-002__s02__permission",
      "caption": "Nút Ký đơn ẩn/disabled với điều dưỡng",
      "uiState": "permission"
     },
     {
      "name": "TC-PERM-002__s03__error",
      "caption": "API ký đơn trả 403 với token điều dưỡng",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-PERM-003",
    "title": "KTV CLS (LAB_TECH) — thấy worklist XN/CĐHA & nhập kết quả, bị chặn kê đơn/khám/thu ngân",
    "category": "permission",
    "priority": "P0",
    "role": "KTV CLS (LAB_TECH)",
    "preconditions": "User role LAB_TECH (IsActive=true). Có chỉ định CLS chờ thực hiện (HL7 LIS / DICOM PACS).",
    "steps": [
     "Đăng nhập KTV CLS; xác nhận roles=[LAB_TECH].",
     "Sidebar — THẤY: worklist xét nghiệm, nhận mẫu, nhập/duyệt kết quả XN, worklist CĐHA, viewer PACS Orthanc.",
     "KHÔNG thấy: kê đơn thuốc, khám bệnh OPD ghi bệnh án, thu ngân, quản trị.",
     "Truy cập thẳng /v2/opd (khám bệnh) — kỳ vọng menu ẩn + API ghi bệnh án 403.",
     "Nhập 1 kết quả XN hợp lệ — kiểm tra trạng thái cập nhật + audit + (HL7 inbound nếu áp dụng).",
     "Gọi API kê đơn bằng token KTV — kỳ vọng 403."
    ],
    "expected": "KTV CLS chỉ thấy worklist + nhập kết quả CLS; menu lâm sàng/thu ngân/quản trị ẩn; API kê đơn/khám 403. Nhập kết quả ghi audit.",
    "notes": "Tích hợp HL7 LIS & DICOM PACS — quyền chỉ giới hạn phạm vi CLS.",
    "refIssues": [
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-003__s01__list",
      "caption": "Worklist CLS sau đăng nhập KTV",
      "uiState": "list"
     },
     {
      "name": "TC-PERM-003__s02__permission",
      "caption": "Menu khám/kê đơn ẩn với KTV",
      "uiState": "permission"
     },
     {
      "name": "TC-PERM-003__s03__success",
      "caption": "Nhập kết quả XN thành công + audit",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-PERM-004",
    "title": "Dược sĩ (PHARMACIST) — thấy duyệt đơn/cấp phát/kho dược/tương tác thuốc, bị chặn khám & thu ngân-duyệt",
    "category": "permission",
    "priority": "P0",
    "role": "Dược sĩ (PHARMACIST)",
    "preconditions": "User role PHARMACIST (IsActive=true). Có đơn thuốc chờ duyệt + tồn kho.",
    "steps": [
     "Đăng nhập dược sĩ; xác nhận roles=[PHARMACIST].",
     "Sidebar — THẤY: duyệt đơn thuốc, cấp phát, quản lý kho dược, cảnh báo hết hạn, kiểm tra tương tác/dị ứng.",
     "KHÔNG thấy: khám bệnh ghi bệnh án, chỉ định CLS, quản trị users, báo cáo BGĐ.",
     "Duyệt 1 đơn có cảnh báo tương tác/dị ứng — xác nhận cảnh báo patient-safety hiển thị + buộc xác nhận.",
     "Gọi API ghi bệnh án bằng token dược sĩ — kỳ vọng 403.",
     "Cấp phát hợp lệ — kiểm tra trừ kho + audit."
    ],
    "expected": "Dược sĩ thấy đúng nghiệp vụ dược; cảnh báo tương tác/dị ứng bắt buộc xác nhận trước cấp phát; API ghi bệnh án 403; cấp phát ghi audit + cập nhật tồn kho.",
    "notes": "Patient-safety: tương tác/dị ứng — verify PrescriptionSafetyGuard kích hoạt cho dược sĩ.",
    "refIssues": [
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-004__s01__list",
      "caption": "Menu dược sĩ sau đăng nhập",
      "uiState": "list"
     },
     {
      "name": "TC-PERM-004__s02__modal",
      "caption": "Cảnh báo tương tác/dị ứng buộc xác nhận khi duyệt đơn",
      "uiState": "modal"
     },
     {
      "name": "TC-PERM-004__s03__permission",
      "caption": "Menu khám/quản trị ẩn với dược sĩ",
      "uiState": "permission"
     }
    ]
   },
   {
    "id": "TC-PERM-005",
    "title": "Thư ký y khoa / Tiếp đón (RECEPTIONIST) — thấy tiếp đón/đăng ký/lịch hẹn, bị chặn lâm sàng & thu ngân-duyệt & quản trị",
    "category": "permission",
    "priority": "P0",
    "role": "Thư ký y khoa / Tiếp đón (RECEPTIONIST)",
    "preconditions": "User role RECEPTIONIST (IsActive=true).",
    "steps": [
     "Đăng nhập tiếp đón; xác nhận roles=[RECEPTIONIST].",
     "Sidebar — THẤY: tiếp đón, đăng ký khám, tra cứu/tạo bệnh nhân, lịch hẹn, in phiếu.",
     "KHÔNG thấy: ghi bệnh án/kê đơn, duyệt thanh toán-quyết toán, cấu hình hệ thống, kho dược.",
     "Mở màn lâm sàng nếu lộ — nút ghi chẩn đoán/kê đơn phải ẩn.",
     "Gọi API kê đơn/ghi bệnh án bằng token tiếp đón — kỳ vọng 403.",
     "Đăng ký 1 bệnh nhân mới hợp lệ — kiểm tra audit + dữ liệu nhân khẩu lưu đúng."
    ],
    "expected": "Tiếp đón chỉ thấy hành chính-tiếp đón; menu lâm sàng/thu ngân-duyệt/quản trị ẩn; API lâm sàng 403; đăng ký BN ghi audit.",
    "notes": "Thư ký y khoa thường gộp vai tiếp đón trong seed; nếu có vai tách riêng, kiểm thêm quyền soạn thảo văn bản hành chính.",
    "refIssues": [
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-005__s01__list",
      "caption": "Menu tiếp đón sau đăng nhập",
      "uiState": "list"
     },
     {
      "name": "TC-PERM-005__s02__permission",
      "caption": "Menu lâm sàng/quản trị ẩn với tiếp đón",
      "uiState": "permission"
     },
     {
      "name": "TC-PERM-005__s03__success",
      "caption": "Đăng ký bệnh nhân thành công + audit",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-PERM-006",
    "title": "Thu ngân (CASHIER) — thấy thanh toán/biên lai/hoàn tiền/QR online, bị chặn lâm sàng & quản trị & hủy-admin kho",
    "category": "permission",
    "priority": "P0",
    "role": "Thu ngân (CASHIER)",
    "preconditions": "User role CASHIER (IsActive=true). Có hóa đơn/viện phí chờ thu.",
    "steps": [
     "Đăng nhập thu ngân; xác nhận roles=[CASHIER].",
     "Sidebar — THẤY: thu viện phí, lập biên lai, thanh toán online (VietQR/VNPay), hoàn tiền, tạm ứng.",
     "KHÔNG thấy: ghi bệnh án/kê đơn, duyệt y lệnh, quản trị users, hủy-admin kho dược.",
     "Gọi API ghi bệnh án / hủy-admin kho bằng token thu ngân — kỳ vọng 403.",
     "Thu 1 khoản hợp lệ + tạo biên lai — kiểm tra audit + liên kết Receipt.",
     "Khởi tạo thanh toán QR online — xác nhận luồng IPN/return không lộ thao tác ngoài quyền."
    ],
    "expected": "Thu ngân thấy đúng nghiệp vụ tài chính; menu lâm sàng/quản trị/hủy-admin ẩn; API ngoài quyền 403; thu tiền + biên lai ghi audit, link Receipt-CashierId đúng.",
    "notes": "Liên quan WarehouseCompleteService.AdminCancel (hủy-admin chỉ Admin) + BillingCompleteService.Payments. Tiền → audit bắt buộc.",
    "refIssues": [
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-006__s01__list",
      "caption": "Menu thu ngân sau đăng nhập",
      "uiState": "list"
     },
     {
      "name": "TC-PERM-006__s02__permission",
      "caption": "Menu lâm sàng/quản trị ẩn với thu ngân",
      "uiState": "permission"
     },
     {
      "name": "TC-PERM-006__s03__error",
      "caption": "API hủy-admin kho trả 403 với token thu ngân",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-PERM-007",
    "title": "Giám định BHYT (BhxhInspector) — Cổng thanh tra standalone /inspector-portal: chỉ xem hồ sơ giám định, không vào HIS chính",
    "category": "permission",
    "priority": "P0",
    "role": "Giám định BHYT (BhxhInspector)",
    "preconditions": "Tài khoản inspector type=bhxh (claim inspectorType). Cổng /inspector-portal có login riêng.",
    "steps": [
     "Vào /inspector-portal — đăng nhập bằng tài khoản giám định BHYT (login form riêng, JWT role BhxhInspector).",
     "Xác nhận chỉ thấy: danh sách hồ sơ cần giám định, hồ sơ BHYT, XML BHXH, đối soát chi phí.",
     "Xác nhận KHÔNG có menu/khả năng: sửa bệnh án, kê đơn, thu ngân, quản trị.",
     "Thử truy cập route HIS chính (/v2/dashboard) bằng token inspector — kỳ vọng redirect/login (token cổng khác layout chính).",
     "Gọi API mutation HIS chính (sửa bệnh án) bằng token inspector — kỳ vọng 403.",
     "Thực hiện thao tác giám định hợp lệ (đánh dấu duyệt/từ chối hồ sơ) — kiểm tra audit."
    ],
    "expected": "Inspector chỉ làm việc trong cổng standalone, chỉ-đọc + thao tác giám định; không vào được HIS chính; mọi mutation HIS chính 403. Thao tác giám định ghi audit.",
    "notes": "his-fe-standalone-portal: route ngoài MainLayout/TerminalLayout/ProtectedRoute. XML BHXH + đối soát.",
    "refIssues": [
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-007__s01__form",
      "caption": "Form đăng nhập cổng giám định BHYT standalone",
      "uiState": "form"
     },
     {
      "name": "TC-PERM-007__s02__list",
      "caption": "Danh sách hồ sơ giám định sau đăng nhập inspector",
      "uiState": "list"
     },
     {
      "name": "TC-PERM-007__s03__permission",
      "caption": "Token inspector không vào được HIS chính / API 403",
      "uiState": "permission"
     }
    ]
   },
   {
    "id": "TC-PERM-008",
    "title": "Quản lý khoa/phòng — thấy điều phối khoa/duyệt nội bộ/báo cáo khoa, bị chặn quản trị toàn viện & thao tác liên khoa",
    "category": "permission",
    "priority": "P1",
    "role": "Quản lý khoa/phòng",
    "preconditions": "User vai quản lý khoa (role + DepartmentId/BranchId gắn). IsActive=true.",
    "steps": [
     "Đăng nhập quản lý khoa; xác nhận claims roles + departmentId/branchId.",
     "Sidebar — THẤY: bảng điều phối giường/khoa, duyệt nội bộ khoa, báo cáo phạm vi khoa, phân công.",
     "KHÔNG thấy: quản trị users toàn viện, cấu hình hệ thống, báo cáo điều hành toàn viện (BGĐ).",
     "Xác nhận dữ liệu báo cáo/danh sách BN bị giới hạn theo khoa (không thấy khoa khác).",
     "Gọi API quản trị users hoặc đọc dữ liệu khoa khác — kỳ vọng 403/lọc rỗng.",
     "Duyệt 1 yêu cầu nội bộ khoa — kiểm tra audit."
    ],
    "expected": "Quản lý khoa chỉ điều phối + báo cáo trong phạm vi khoa/chi nhánh; không vượt sang khoa khác hay quản trị toàn viện; API ngoài phạm vi 403/lọc rỗng; duyệt ghi audit.",
    "notes": "Kiểm scoping theo DepartmentId/BranchId (R3 đa cơ sở claim BranchId). Data-consistency phạm vi.",
    "refIssues": [
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-008__s01__list",
      "caption": "Bảng điều phối khoa sau đăng nhập quản lý khoa",
      "uiState": "list"
     },
     {
      "name": "TC-PERM-008__s02__filter",
      "caption": "Dữ liệu giới hạn theo khoa/chi nhánh",
      "uiState": "filter"
     },
     {
      "name": "TC-PERM-008__s03__permission",
      "caption": "Truy cập khoa khác/quản trị toàn viện bị chặn",
      "uiState": "permission"
     }
    ]
   },
   {
    "id": "TC-PERM-009",
    "title": "BGĐ/KHTH — thấy báo cáo điều hành/dashboard toàn viện (chỉ-đọc), bị chặn mọi mutation nghiệp vụ",
    "category": "permission",
    "priority": "P1",
    "role": "BGĐ/KHTH",
    "preconditions": "User vai BGĐ/KHTH (quyền báo cáo toàn viện, read-only). IsActive=true.",
    "steps": [
     "Đăng nhập BGĐ/KHTH; xác nhận quyền báo cáo điều hành.",
     "Sidebar — THẤY: dashboard điều hành, báo cáo doanh thu/KPI/thống kê toàn viện, báo cáo BHYT tổng hợp.",
     "KHÔNG có nút: kê đơn, thu tiền, sửa bệnh án, quản trị users — các mutation nghiệp vụ ẩn/disabled.",
     "Xác nhận dashboard tổng hợp toàn viện (không bị giới hạn khoa như quản lý khoa).",
     "Gọi 1 API mutation nghiệp vụ (thu tiền/kê đơn) bằng token BGĐ — kỳ vọng 403.",
     "Xem báo cáo — kiểm tra chỉ-đọc, export hợp lệ (nếu có) ghi audit truy xuất."
    ],
    "expected": "BGĐ/KHTH có cái nhìn điều hành toàn viện chỉ-đọc; mọi mutation nghiệp vụ bị chặn (ẩn nút + API 403). Export/đọc báo cáo nhạy cảm ghi audit truy xuất.",
    "notes": "Phân biệt với Admin: BGĐ xem báo cáo nhưng KHÔNG quản trị cấu hình/users.",
    "refIssues": [
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-009__s01__list",
      "caption": "Dashboard điều hành toàn viện sau đăng nhập BGĐ/KHTH",
      "uiState": "list"
     },
     {
      "name": "TC-PERM-009__s02__permission",
      "caption": "Nút mutation nghiệp vụ ẩn/disabled với BGĐ",
      "uiState": "permission"
     },
     {
      "name": "TC-PERM-009__s03__error",
      "caption": "API mutation nghiệp vụ trả 403 với token BGĐ",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-PERM-010",
    "title": "Admin hệ thống (ADMIN) — thấy & thao tác toàn quyền: quản trị users/roles/permissions, cấu hình, audit, schema-drift",
    "category": "permission",
    "priority": "P0",
    "role": "Admin hệ thống (ADMIN)",
    "preconditions": "admin/Admin@123 (role ADMIN, IsActive=true).",
    "steps": [
     "Đăng nhập admin/Admin@123; xác nhận roles=[ADMIN].",
     "Sidebar — THẤY đầy đủ: Quản trị hệ thống (Users/Roles/Permissions), cấu hình hệ thống, audit log, danh mục, báo cáo, health/schema-drift.",
     "Mở màn quản lý vai trò — xác nhận gán/thu hồi role+permission cho user.",
     "Mở Audit log — xác nhận xem được mọi mutation của mọi vai trò (đối chiếu các task trên).",
     "Truy cập GET /health/schema-drift — missingCount hiển thị.",
     "Tạo/khóa 1 user thử nghiệm — kiểm tra audit + hiệu lực ngay (user khóa không đăng nhập được)."
    ],
    "expected": "Admin truy cập mọi menu/API; quản trị users/roles/permissions hoạt động; audit log xem được toàn bộ; khóa/mở user có hiệu lực + ghi audit. Là baseline đối chiếu quyền các vai trò khác.",
    "notes": "Issue cha riêng cho Admin = #260. Verify chính cơ chế cấp/thu quyền dùng cho mọi test trên.",
    "refIssues": [
     "#260",
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-010__s01__list",
      "caption": "Menu admin đầy đủ sau đăng nhập",
      "uiState": "list"
     },
     {
      "name": "TC-PERM-010__s02__detail",
      "caption": "Màn quản lý vai trò/phân quyền — gán role+permission",
      "uiState": "detail"
     },
     {
      "name": "TC-PERM-010__s03__success",
      "caption": "Khóa/tạo user có hiệu lực + ghi audit",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-PERM-011",
    "title": "Bệnh nhân (PortalPatient) — Cổng/Telemedicine /m/patient-portal: chỉ xem hồ sơ của chính mình, không truy cập HIS nội bộ",
    "category": "permission",
    "priority": "P0",
    "role": "Bệnh nhân (PortalPatient)",
    "preconditions": "Tài khoản cổng BN (PortalAccount, JWT role PortalPatient, claim patientId). Có hồ sơ KCB của BN này.",
    "steps": [
     "Đăng nhập cổng bệnh nhân (/m/patient-portal); xác nhận token role=PortalPatient + claim patientId.",
     "Xác nhận chỉ thấy: hồ sơ KCB của chính mình, kết quả CLS của mình, lịch hẹn, đặt khám, telemedicine (Jitsi), thanh toán online.",
     "Thử truy cập route HIS nội bộ (/v2/dashboard, /v2/system-admin) bằng token cổng BN — kỳ vọng redirect/403.",
     "Thử đọc dữ liệu bệnh nhân KHÁC (đổi patientId trên API) — kỳ vọng 403/lọc rỗng (chống IDOR).",
     "Gọi API mutation nội bộ (sửa bệnh án/kê đơn) bằng token BN — kỳ vọng 403.",
     "Đặt 1 lịch khám hợp lệ — kiểm tra audit + ràng buộc patientId."
    ],
    "expected": "BN cổng chỉ xem/được thao tác trên hồ sơ CỦA CHÍNH MÌNH; không truy cập HIS nội bộ; đọc hồ sơ BN khác bị chặn (chống IDOR); mutation nội bộ 403. Đặt lịch ghi audit gắn patientId.",
    "notes": "Bao gồm trục Telemedicine. IDOR theo patientId là rủi ro bảo mật trọng yếu — kiểm thật kỹ.",
    "refIssues": [
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-011__s01__list",
      "caption": "Cổng bệnh nhân — hồ sơ của chính mình",
      "uiState": "list"
     },
     {
      "name": "TC-PERM-011__s02__permission",
      "caption": "Đọc hồ sơ BN khác (đổi patientId) bị chặn — chống IDOR",
      "uiState": "permission"
     },
     {
      "name": "TC-PERM-011__s03__error",
      "caption": "API HIS nội bộ trả 403 với token cổng BN",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-PERM-012",
    "title": "Truy cập-thẳng-URL không xác thực — mọi route /v2/* & cổng redirect về /login (không lộ dữ liệu)",
    "category": "permission",
    "priority": "P0",
    "role": "Khách (chưa đăng nhập)",
    "preconditions": "localStorage không có token. FE chạy.",
    "steps": [
     "Xóa token/user khỏi localStorage.",
     "Gõ thẳng /v2/dashboard — kỳ vọng ProtectedRoute redirect /login.",
     "Gõ /v2/system-admin, /v2/billing, /m/patient-portal — đều redirect /login.",
     "Gọi 1 API bất kỳ không kèm Bearer token — kỳ vọng 401.",
     "Gửi token rác/sai chữ ký — kỳ vọng 401, không vào được route bảo vệ.",
     "Cổng /inspector-portal không token — kỳ vọng màn login cổng, không lộ danh sách hồ sơ."
    ],
    "expected": "Mọi route bảo vệ redirect /login khi chưa đăng nhập; API không token trả 401; token rác trả 401; không màn nào lộ dữ liệu khi chưa xác thực.",
    "notes": "Bao trùm 12 vai trò: lớp nền authentication trước phân quyền role.",
    "refIssues": [
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-012__s01__permission",
      "caption": "Route /v2/* redirect /login khi chưa đăng nhập",
      "uiState": "permission"
     },
     {
      "name": "TC-PERM-012__s02__error",
      "caption": "API không token trả 401",
      "uiState": "error"
     },
     {
      "name": "TC-PERM-012__s03__error",
      "caption": "Token rác/sai chữ ký trả 401",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-PERM-013",
    "title": "Account-state — tài khoản bị khóa (IsActive=false) không đăng nhập được, hiển thị thông báo phù hợp",
    "category": "permission",
    "priority": "P0",
    "role": "Mọi vai trò (account-state)",
    "preconditions": "Admin khóa 1 user (IsActive=false) qua màn quản trị (TC-PERM-010).",
    "steps": [
     "Admin đặt IsActive=false cho 1 user thử (vd 1 bác sĩ).",
     "Đăng xuất, thử đăng nhập bằng tài khoản vừa khóa.",
     "Quan sát thông báo — phải báo tài khoản bị khóa/vô hiệu (tiếng Việt có dấu), không cấp token.",
     "Nếu user đó đang có phiên trước khi khóa — thực hiện 1 API mutation, kỳ vọng 401/403 sau khi khóa có hiệu lực.",
     "Admin mở lại IsActive=true — xác nhận đăng nhập lại bình thường.",
     "Kiểm tra audit ghi nhận hành động khóa/mở của admin."
    ],
    "expected": "User khóa không lấy được token, hiển thị thông báo rõ ràng; phiên cũ bị chặn ở mutation; mở khóa khôi phục truy cập; khóa/mở ghi audit.",
    "notes": "Account-state trục bắt buộc theo yêu cầu. Kiểm cả phiên đang mở khi bị khóa.",
    "refIssues": [
     "#216",
     "#260"
    ],
    "evidence": [
     {
      "name": "TC-PERM-013__s01__error",
      "caption": "Đăng nhập tài khoản bị khóa — thông báo từ chối",
      "uiState": "error"
     },
     {
      "name": "TC-PERM-013__s02__permission",
      "caption": "Phiên cũ bị chặn mutation sau khi khóa",
      "uiState": "permission"
     },
     {
      "name": "TC-PERM-013__s03__success",
      "caption": "Mở khóa khôi phục đăng nhập + audit",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-PERM-014",
    "title": "Account-state — token hết hạn giữa phiên: tự logout/redirect /login, không thao tác ngoài quyền",
    "category": "permission",
    "priority": "P1",
    "role": "Mọi vai trò (account-state)",
    "preconditions": "Đăng nhập 1 vai trò bất kỳ. Có cách làm token hết hạn (chờ/giả lập token expired trong localStorage).",
    "steps": [
     "Đăng nhập (vd điều dưỡng); đang ở 1 màn nghiệp vụ.",
     "Làm token hết hạn (thay token bằng JWT expired hoặc chờ TTL).",
     "Thực hiện 1 thao tác gọi API — kỳ vọng 401.",
     "Quan sát FE xử lý 401: AuthContext/initAuth xóa token+user + redirect /login (không giữ user cache cũ).",
     "Sau redirect, gõ thẳng route bảo vệ — vẫn redirect /login.",
     "Đăng nhập lại — xác nhận khôi phục đúng quyền vai trò."
    ],
    "expected": "Token hết hạn → API 401 → FE dọn localStorage + đưa về /login, không cho thao tác tiếp; đăng nhập lại khôi phục đúng quyền. Không có flicker lộ dữ liệu.",
    "notes": "AuthContext initAuth chỉ setUser sau khi getCurrentUser() validate (chống render bằng cache cũ).",
    "refIssues": [
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-014__s01__error",
      "caption": "API trả 401 khi token hết hạn giữa phiên",
      "uiState": "error"
     },
     {
      "name": "TC-PERM-014__s02__permission",
      "caption": "FE tự redirect /login + dọn localStorage",
      "uiState": "permission"
     },
     {
      "name": "TC-PERM-014__s03__success",
      "caption": "Đăng nhập lại khôi phục đúng quyền",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-PERM-015",
    "title": "Account-state — buộc đổi mật khẩu / mật khẩu hết hạn: chặn vào hệ thống đến khi đổi xong",
    "category": "validation",
    "priority": "P1",
    "role": "Mọi vai trò (account-state)",
    "preconditions": "User có cờ buộc đổi mật khẩu (tài khoản mới hoặc admin reset). Nếu cơ chế chưa có, đánh dấu gap.",
    "steps": [
     "Admin reset mật khẩu / tạo user mới (nếu hệ thống set cờ buộc đổi).",
     "Đăng nhập bằng tài khoản đó.",
     "Kỳ vọng bị chuyển tới màn đổi mật khẩu, KHÔNG vào thẳng dashboard/nghiệp vụ.",
     "Thử bỏ qua (gõ thẳng route nghiệp vụ) — phải vẫn bị buộc đổi/chặn.",
     "Đặt mật khẩu mới hợp lệ (đúng policy) — đăng nhập hoàn tất với đúng quyền.",
     "Thử mật khẩu yếu/không đạt policy — hiển thị validation, không cho qua."
    ],
    "expected": "User buộc đổi mật khẩu không vào được nghiệp vụ đến khi đổi xong; mật khẩu yếu bị validation chặn; sau đổi, truy cập đúng quyền vai trò; hành động ghi audit.",
    "notes": "Nếu cơ chế force-change chưa tồn tại trong code → ghi gap, đề xuất issue mới (không tự tạo).",
    "refIssues": [
     "#216",
     "#260"
    ],
    "evidence": [
     {
      "name": "TC-PERM-015__s01__form",
      "caption": "Màn buộc đổi mật khẩu sau đăng nhập",
      "uiState": "form"
     },
     {
      "name": "TC-PERM-015__s02__validation",
      "caption": "Mật khẩu yếu bị validation chặn",
      "uiState": "validation"
     },
     {
      "name": "TC-PERM-015__s03__permission",
      "caption": "Bỏ qua đổi MK bị chặn vào nghiệp vụ",
      "uiState": "permission"
     }
    ]
   },
   {
    "id": "TC-PERM-016",
    "title": "Account-state — đăng nhập sai nhiều lần & 2FA/OTP: khóa tạm/yêu cầu OTP, không cấp token khi chưa xác thực đủ",
    "category": "negative",
    "priority": "P1",
    "role": "Mọi vai trò (account-state)",
    "preconditions": "User bật 2FA (IsTwoFactorEnabled=true) có email để nhận OTP. User khác để test sai mật khẩu.",
    "steps": [
     "Đăng nhập sai mật khẩu nhiều lần — quan sát có khóa tạm/đếm số lần/thông báo (nếu có cơ chế).",
     "Đăng nhập user bật 2FA bằng mật khẩu đúng — kỳ vọng requiresOtp=true, FE hiện màn nhập OTP (chưa cấp token chính).",
     "Nhập OTP sai — báo lỗi, không cấp token; kiểm số lần thử OTP.",
     "Nhập OTP đúng trong hạn — cấp token + vào đúng quyền vai trò.",
     "Để OTP hết hạn rồi nhập — báo hết hạn, yêu cầu gửi lại (resendOtp).",
     "Hủy OTP giữa chừng (cancelOtp) — quay lại màn login, không có token."
    ],
    "expected": "2FA: chưa nhập OTP đúng thì KHÔNG có token; OTP sai/hết hạn bị từ chối; gửi lại hoạt động; hủy về login sạch. Sai mật khẩu nhiều lần được xử lý an toàn (khóa tạm/thông báo).",
    "notes": "AuthContext có otpPending/verifyOtp/resendOtp/cancelOtp + TwoFactorOtp entity (Attempts, ExpiresAt, IsUsed).",
    "refIssues": [
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-016__s01__form",
      "caption": "Màn nhập OTP 2FA sau mật khẩu đúng",
      "uiState": "form"
     },
     {
      "name": "TC-PERM-016__s02__validation",
      "caption": "OTP sai/hết hạn bị từ chối",
      "uiState": "validation"
     },
     {
      "name": "TC-PERM-016__s03__error",
      "caption": "Đăng nhập sai mật khẩu nhiều lần — thông báo/khóa tạm",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-PERM-017",
    "title": "Backend enforcement — bypass FE (gọi API trực tiếp) với token sai vai trò luôn bị 403, không dựa vào ẩn-menu",
    "category": "security",
    "priority": "P0",
    "role": "Mọi vai trò (kiểm tra backend)",
    "preconditions": "Có token hợp lệ của ≥3 vai trò (DOCTOR, CASHIER, PHARMACIST). Công cụ gọi API trực tiếp (curl/Postman).",
    "steps": [
     "Lấy token bác sĩ; gọi loạt API ngoài quyền: POST /api/admin/users, POST thu tiền, hủy-admin kho — kỳ vọng tất cả 403.",
     "Lấy token thu ngân; gọi API ghi bệnh án/kê đơn — kỳ vọng 403.",
     "Lấy token dược sĩ; gọi API quản trị + ghi bệnh án — kỳ vọng 403.",
     "Xác nhận các controller có [Authorize] (64+ chỗ) thực sự chặn theo role/permission, không chỉ [Authorize] trống (chỉ cần đăng nhập).",
     "Soi 1 số endpoint nhạy cảm (tiền/kho/quản trị) có phân quyền role-cụ-thể hay chỉ chặn anonymous.",
     "Ghi nhận endpoint nào chỉ chặn auth mà KHÔNG chặn role → tạo task fix liên kết."
    ],
    "expected": "Mọi API ngoài quyền của từng vai trò trả 403 dù bỏ qua FE. Phát hiện endpoint chỉ [Authorize] trống (auth-only, thiếu role-check) → ghi nhận làm bug bảo mật, tạo task fix liên kết 2 chiều.",
    "notes": "Đây là test bảo mật cốt lõi: FE ProtectedRoute không chặn role nên backend là phòng tuyến thật. Bug phát hiện → bắt buộc tạo issue fix.",
    "refIssues": [
     "#216",
     "#260"
    ],
    "evidence": [
     {
      "name": "TC-PERM-017__s01__error",
      "caption": "Token bác sĩ gọi API admin/thu tiền — 403",
      "uiState": "error"
     },
     {
      "name": "TC-PERM-017__s02__error",
      "caption": "Token thu ngân gọi API ghi bệnh án — 403",
      "uiState": "error"
     },
     {
      "name": "TC-PERM-017__s03__permission",
      "caption": "Ghi nhận endpoint auth-only thiếu role-check (nếu có)",
      "uiState": "permission"
     }
    ]
   },
   {
    "id": "TC-PERM-018",
    "title": "Audit trail — mọi mutation theo vai trò đều ghi audit (ai/khi nào/làm gì), đối soát qua màn Audit của Admin",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Admin + mọi vai trò",
    "preconditions": "Đã chạy các task TC-PERM-001..011 (mỗi vai trò có ≥1 mutation hợp lệ).",
    "steps": [
     "Đăng nhập admin, mở Audit log.",
     "Lọc theo từng user vai trò vừa thao tác (bác sĩ/điều dưỡng/dược/thu ngân/tiếp đón).",
     "Xác nhận mỗi mutation (lưu bệnh án, cấp phát, thu tiền, đăng ký BN, nhập kết quả) có dòng audit: user, vai trò, hành động, thời điểm, đối tượng.",
     "Xác nhận hành động bị 403 KHÔNG tạo bản ghi mutation (chỉ có thể log truy cập từ chối nếu thiết kế vậy).",
     "Đối chiếu thời điểm + đối tượng audit khớp thao tác thật.",
     "Thử BN cổng/inspector — thao tác của họ cũng phải truy vết được."
    ],
    "expected": "Mọi mutation thành công của mọi vai trò để lại audit đầy đủ và truy vết được qua màn Admin; thao tác bị từ chối không sinh mutation; dữ liệu audit nhất quán với hành động thực.",
    "notes": "Yêu cầu nền: audit mọi mutation. Đây là test data-consistency xuyên vai trò.",
    "refIssues": [
     "#260",
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-018__s01__list",
      "caption": "Audit log liệt kê mutation theo vai trò",
      "uiState": "list"
     },
     {
      "name": "TC-PERM-018__s02__filter",
      "caption": "Lọc audit theo từng user/vai trò",
      "uiState": "filter"
     },
     {
      "name": "TC-PERM-018__s03__detail",
      "caption": "Chi tiết 1 bản ghi audit khớp thao tác thật",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-PERM-019",
    "title": "Admin thay đổi quyền có hiệu lực — thu hồi role/permission của 1 user phản ánh ngay ở phiên mới (và bị chặn ở phiên cũ)",
    "category": "state",
    "priority": "P1",
    "role": "Admin hệ thống (ADMIN)",
    "preconditions": "1 user test có role/permission cụ thể (vd bác sĩ có quyền kê đơn). Admin quản trị được (TC-PERM-010).",
    "steps": [
     "Admin thu hồi 1 permission/role của user test (vd bỏ quyền kê đơn của 1 bác sĩ).",
     "User đó đăng nhập lại (phiên mới) — xác nhận menu/nút liên quan quyền vừa thu hồi đã ẩn.",
     "User gọi API tương ứng — kỳ vọng 403 sau khi thu quyền.",
     "Nếu user đang có phiên cũ (token trước thay đổi) — xác nhận hành vi: backend kiểm permission từ token cũ vs DB (ghi nhận token-claim có refresh hay không).",
     "Admin cấp lại quyền — xác nhận khôi phục ở phiên mới.",
     "Mọi thay đổi quyền ghi audit (ai cấp/thu, cho ai, khi nào)."
    ],
    "expected": "Thu hồi quyền phản ánh đúng ở phiên đăng nhập mới (menu ẩn + API 403); ghi nhận rõ hành vi phiên cũ (token claim cũ) để biết có cần force re-login; cấp lại khôi phục; thay đổi quyền ghi audit.",
    "notes": "Permission nằm trong JWT claim → token cũ có thể giữ quyền cũ đến khi hết hạn; nếu vậy là rủi ro → ghi nhận, có thể tạo task fix (revoke không tức thời).",
    "refIssues": [
     "#260",
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-019__s01__detail",
      "caption": "Admin thu hồi role/permission của user test",
      "uiState": "detail"
     },
     {
      "name": "TC-PERM-019__s02__permission",
      "caption": "Phiên mới của user: menu/nút quyền cũ đã ẩn",
      "uiState": "permission"
     },
     {
      "name": "TC-PERM-019__s03__error",
      "caption": "API trả 403 sau khi thu quyền",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-PERM-020",
    "title": "Light/Dark & tiếng Việt có dấu — màn login + thông báo từ chối quyền hiển thị đúng ở cả 2 theme, không vỡ chữ",
    "category": "ui",
    "priority": "P2",
    "role": "Mọi vai trò",
    "preconditions": "FE chạy, có toggle sáng/tối.",
    "steps": [
     "Mở màn login ở light mode — kiểm tiếng Việt có dấu hiển thị đúng (không mojibake).",
     "Chuyển dark mode — kiểm tương phản chữ/nền (a11y) màn login + form OTP.",
     "Đăng nhập 1 vai trò hạn chế, kích hoạt thông báo từ chối quyền/403 — kiểm thông báo hiển thị rõ ở cả 2 theme.",
     "Kiểm các badge/menu ẩn không để lại khoảng trống vỡ layout khi role thiếu quyền.",
     "Kiểm thông báo account-state (khóa/hết hạn/OTP) tiếng Việt đầy đủ dấu, đúng cả 2 theme.",
     "Đối chiếu màu cảnh báo permission-deny đủ tương phản (không chữ đỏ trên nền tối khó đọc)."
    ],
    "expected": "Màn login + mọi thông báo phân quyền/account-state hiển thị đúng tiếng Việt có dấu, đủ tương phản ở cả light & dark, không mojibake, không vỡ layout khi menu/nút bị ẩn theo quyền.",
    "notes": "Trục UI/theming + i18n cho luồng phân quyền. Bù coverage UX cho permission-deny states.",
    "refIssues": [
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-PERM-020__s01__form",
      "caption": "Màn login light mode — tiếng Việt có dấu đúng",
      "uiState": "form"
     },
     {
      "name": "TC-PERM-020__s02__form",
      "caption": "Màn login + OTP dark mode — tương phản đạt",
      "uiState": "form"
     },
     {
      "name": "TC-PERM-020__s03__permission",
      "caption": "Thông báo từ chối quyền hiển thị đúng cả 2 theme",
      "uiState": "permission"
     }
    ]
   }
  ]
 },
 {
  "id": "ui-states-universal",
  "title": "Checklist trạng thái UI áp cho mọi màn",
  "summary": "Bộ task UI-STATE xuyên suốt (cross-cutting) áp cho MỌI màn hình FE v2 (route /v2/*, TerminalLayout, _v2kit, ab-*), chi tiết hóa 5 issue chiều ngang đã có trên Board GitHub: #219 (API error 400/401/403/404/500/timeout/slow/retry), #220 (form-validation), #221 (responsive 320/375/414/768/1366/1920), #222 (dark/light parity), #225 (boundary/value-edge). KHÔNG tạo issue trùng — mỗi task gắn refIssues vào issue cha tương ứng. Phủ đủ các trạng thái: empty, loading/skeleton, error (500/timeout), success toast, confirm dialog trước thao tác nguy hiểm, validation inline, responsive đa breakpoint, dark/light parity, định dạng số-tiền-ngày VN, tiếng Việt có dấu, đặc thù patient-safety (dị ứng/tương tác/nhóm máu) + audit + realtime SignalR + cổng thanh toán online. Đăng nhập admin/Admin@123 (JWT localStorage), BE localhost:5106. Đặt tên evidence theo §2 README: TC-UI-<NNN>__s<NN>__<state> (không .png, không thư mục). Bộ này là KẾ HOẠCH + công cụ; chạy test thực + chụp evidence LÀM CUỐI CÙNG sau khi đóng hết task fix/feature (rule cứng repo). 16 task, sắp theo nhóm trạng thái.",
  "candidate_issues": [],
  "tasks": [
   {
    "id": "TC-UI-001",
    "title": "Empty state — danh sách/bảng/dropdown không có dữ liệu hiển thị đúng",
    "category": "ui",
    "priority": "P1",
    "role": "Mọi vai trò (mặc định Admin hệ thống)",
    "preconditions": "Đăng nhập admin/Admin@123, BE localhost:5106 chạy. Chọn 1 màn list v2 có thể lọc về 0 kết quả (vd danh sách tiếp đón, hóa đơn, kho).",
    "steps": [
     "Mở 1 màn list /v2/* (DataTable trong _v2kit).",
     "Áp filter/từ khóa tiếng Việt có dấu không khớp dữ liệu nào (vd tìm 'zzz_khôngtồntại').",
     "Quan sát vùng bảng khi 0 dòng: phải có empty-state rõ ràng (icon + dòng chữ tiếng Việt có dấu), KHÔNG để trống trắng/loading mãi.",
     "Kiểm tra dropdown/select danh mục rỗng cũng có thông báo 'Không có dữ liệu'.",
     "Kiểm tra KpiStrip/đếm tổng = 0 hiển thị đúng, không NaN."
    ],
    "expected": "Mọi list/bảng/dropdown khi 0 dữ liệu hiển thị empty-state tiếng Việt có dấu rõ nghĩa (icon + mô tả + gợi ý hành động nếu có), không khoảng trắng vô nghĩa, không spinner kẹt, KPI đếm = 0 đúng định dạng.",
    "evidence": [
     {
      "name": "TC-UI-001__s01__list",
      "caption": "Bảng list trạng thái bình thường có dữ liệu (tham chiếu)",
      "uiState": "list"
     },
     {
      "name": "TC-UI-001__s02__empty",
      "caption": "Empty-state khi filter trả 0 kết quả",
      "uiState": "empty"
     },
     {
      "name": "TC-UI-001__s03__dropdown",
      "caption": "Dropdown danh mục rỗng hiển thị 'Không có dữ liệu'",
      "uiState": "dropdown"
     }
    ],
    "notes": "Cross-cutting bù coverage UI-state; áp mọi màn list v2.",
    "refIssues": [
     "#225"
    ]
   },
   {
    "id": "TC-UI-002",
    "title": "Loading / skeleton — chờ tải dữ liệu lần đầu và khi đổi filter",
    "category": "ui",
    "priority": "P1",
    "role": "Mọi vai trò (mặc định Admin)",
    "preconditions": "Đăng nhập admin. Có thể giả lập mạng chậm (DevTools → Network → Slow 3G) hoặc throttle BE.",
    "steps": [
     "Bật DevTools → Network → Slow 3G (hoặc throttle).",
     "Mở 1 màn list/detail v2 lần đầu (chưa cache).",
     "Quan sát trạng thái loading: phải có skeleton/spinner ở vùng bảng + nút thao tác disable, KHÔNG hiển thị dữ liệu cũ lẫn lộn.",
     "Đổi filter/chuyển tab StatusTabs → quan sát loading cục bộ vùng dữ liệu (không reload toàn trang).",
     "Mở detail/drawer 1 bản ghi → quan sát loading trong drawer trước khi đổ dữ liệu."
    ],
    "expected": "Khi tải, hiển thị skeleton/spinner rõ ràng ở đúng vùng đang tải, nút submit disable tránh double-click, không nhấp nháy dữ liệu cũ; loading cục bộ khi đổi filter/tab/drawer chứ không trắng toàn trang.",
    "evidence": [
     {
      "name": "TC-UI-002__s01__loading",
      "caption": "Skeleton/spinner khi tải list lần đầu (Slow 3G)",
      "uiState": "loading"
     },
     {
      "name": "TC-UI-002__s02__loading",
      "caption": "Loading cục bộ khi đổi filter/tab",
      "uiState": "loading"
     },
     {
      "name": "TC-UI-002__s03__drawer",
      "caption": "Loading trong drawer detail trước khi đổ dữ liệu",
      "uiState": "drawer"
     }
    ],
    "notes": "Áp mọi màn fetch dữ liệu; chú ý không double-submit.",
    "refIssues": [
     "#219"
    ]
   },
   {
    "id": "TC-UI-003",
    "title": "Error state — API 500 / timeout hiển thị lỗi + cho thử lại",
    "category": "negative",
    "priority": "P0",
    "role": "Mọi vai trò (mặc định Admin)",
    "preconditions": "Đăng nhập admin. Dùng DevTools để chặn/giả lập response (block request hoặc trả 500), hoặc tắt BE localhost:5106 tạm thời để gây timeout.",
    "steps": [
     "Mở 1 màn list v2, sau đó chặn request API tải dữ liệu (DevTools → Network → block / hoặc tắt BE).",
     "Quan sát: phải có error-state (thông báo lỗi tiếng Việt có dấu) + nút 'Thử lại', KHÔNG trắng màn/không spinner kẹt vĩnh viễn.",
     "Bấm 'Thử lại' sau khi khôi phục BE → dữ liệu tải lại đúng.",
     "Lặp với thao tác mutation (lưu form) gặp 500/timeout: phải báo lỗi rõ, KHÔNG mất dữ liệu người dùng đã nhập.",
     "Kiểm tra log lỗi dùng console.warn (theo convention) cho lỗi kỳ vọng, không spam console.error."
    ],
    "expected": "Khi API 500/timeout: hiển thị error-state có nội dung tiếng Việt rõ nghĩa + cơ chế thử lại; dữ liệu form người dùng nhập không bị mất; bấm thử lại phục hồi được; không trắng màn, không spinner kẹt.",
    "evidence": [
     {
      "name": "TC-UI-003__s01__error",
      "caption": "Error-state khi list API trả 500",
      "uiState": "error"
     },
     {
      "name": "TC-UI-003__s02__error",
      "caption": "Lỗi timeout khi tắt BE (có nút Thử lại)",
      "uiState": "error"
     },
     {
      "name": "TC-UI-003__s03__error",
      "caption": "Mutation 500 — báo lỗi, giữ nguyên dữ liệu đã nhập",
      "uiState": "error"
     }
    ],
    "notes": "P0 vì che giấu lỗi có thể gây sai lệch lâm sàng/tài chính. Phủ cả đọc và ghi.",
    "refIssues": [
     "#219"
    ]
   },
   {
    "id": "TC-UI-004",
    "title": "Error state — 401 hết phiên / 403 không đủ quyền điều hướng đúng",
    "category": "permission",
    "priority": "P0",
    "role": "Mọi vai trò (Admin + vai trò hạn chế)",
    "preconditions": "Đăng nhập admin. Có thể xóa/expire JWT trong localStorage để giả lập 401; dùng vai trò hạn chế để giả lập 403.",
    "steps": [
     "Đang ở 1 màn v2, xóa key 'token' trong localStorage (hoặc để token hết hạn) rồi thực hiện 1 thao tác gọi API.",
     "Quan sát 401: phải tự điều hướng về màn đăng nhập, KHÔNG kẹt trắng/lặp vô hạn.",
     "Đăng nhập vai trò không đủ quyền (nếu có), mở màn/chức năng bị giới hạn → quan sát 403 hiển thị thông báo từ chối quyền rõ ràng.",
     "Kiểm tra interceptor không tự nuốt lỗi sai shape (envelope đã unwrap)."
    ],
    "expected": "401 → điều hướng về login sạch, không loop; 403 → thông báo 'không đủ quyền' tiếng Việt rõ ràng, không trắng màn; không lộ dữ liệu ngoài quyền.",
    "evidence": [
     {
      "name": "TC-UI-004__s01__error",
      "caption": "401 hết phiên — điều hướng về login",
      "uiState": "error"
     },
     {
      "name": "TC-UI-004__s02__permission",
      "caption": "403 không đủ quyền — thông báo từ chối",
      "uiState": "permission"
     }
    ],
    "notes": "Liên quan AuthContext tolerant 2 shape (commit 92d35a2). Áp mọi màn cần quyền.",
    "refIssues": [
     "#219"
    ]
   },
   {
    "id": "TC-UI-005",
    "title": "Validation inline — form tạo/sửa báo lỗi tại field, không cho submit khi sai",
    "category": "validation",
    "priority": "P0",
    "role": "Mọi vai trò có thao tác nhập liệu (mặc định Admin)",
    "preconditions": "Đăng nhập admin. Chọn 1 form tạo/sửa tới hạn v2 (vd tiếp đón BN, kê đơn, lập hóa đơn).",
    "steps": [
     "Mở form tạo mới trong ModalShell/DrawerShell.",
     "Bỏ trống các field bắt buộc rồi bấm Lưu → quan sát message lỗi inline ngay dưới từng field (tiếng Việt có dấu), nút Lưu không tạo bản ghi.",
     "Nhập sai định dạng (email/SĐT/số CCCD/ngày) → báo lỗi format inline.",
     "Sửa đúng từng field → message lỗi biến mất ngay, cho phép submit.",
     "Kiểm tra trim khoảng trắng đầu/cuối, không cho chỉ-toàn-khoảng-trắng qua required."
    ],
    "expected": "Form chặn submit khi thiếu/ sai field bắt buộc; message lỗi inline tiếng Việt có dấu hiển thị đúng tại field; sửa đúng thì lỗi clear; định dạng (email/SĐT/ngày/số) được validate; không tạo bản ghi rác.",
    "evidence": [
     {
      "name": "TC-UI-005__s01__form",
      "caption": "Form tạo mới trống trước khi submit",
      "uiState": "form"
     },
     {
      "name": "TC-UI-005__s02__validation",
      "caption": "Lỗi inline khi bỏ trống field bắt buộc",
      "uiState": "validation"
     },
     {
      "name": "TC-UI-005__s03__validation",
      "caption": "Lỗi format (SĐT/ngày/email) inline",
      "uiState": "validation"
     }
    ],
    "notes": "Chi tiết hóa #220. Validate cả FE và BE (không tin client).",
    "refIssues": [
     "#220"
    ]
   },
   {
    "id": "TC-UI-006",
    "title": "Boundary / value-edge — biên độ dài, số âm/0, ngày quá khứ-tương lai, ký tự đặc biệt",
    "category": "edge",
    "priority": "P1",
    "role": "Mọi vai trò nhập liệu (mặc định Admin)",
    "preconditions": "Đăng nhập admin. Chọn form/list có field số lượng, tiền, ngày, text dài.",
    "steps": [
     "Nhập text vượt maxLength (vd họ tên 300 ký tự, tiếng Việt có dấu + emoji) → quan sát giới hạn/báo lỗi, không vỡ layout.",
     "Nhập số lượng = 0, số âm, số rất lớn vào field định lượng (thuốc/tiền) → phải chặn/báo lỗi đúng nghiệp vụ.",
     "Nhập ngày sinh tương lai / ngày khám quá khứ xa → kiểm tra ràng buộc ngày.",
     "Nhập ký tự đặc biệt/HTML (<script>) vào ô tìm kiếm và field text → không lỗi render, không XSS, escape đúng.",
     "Kiểm tra phân trang ở trang cuối / 1 dòng / số lượng bản ghi lớn."
    ],
    "expected": "Các giá trị biên (rỗng/0/âm/cực lớn/quá dài/ngày bất hợp lệ/ký tự đặc biệt) được xử lý an toàn: chặn hoặc báo lỗi rõ, không crash, không vỡ layout, không XSS; phân trang biên đúng.",
    "evidence": [
     {
      "name": "TC-UI-006__s01__validation",
      "caption": "Vượt maxLength / số âm / 0 bị chặn",
      "uiState": "validation"
     },
     {
      "name": "TC-UI-006__s02__edge",
      "caption": "Ngày bất hợp lệ + ký tự đặc biệt trong ô nhập",
      "uiState": "error"
     }
    ],
    "notes": "Chi tiết hóa #225. Patient-safety: liều/số lượng thuốc âm phải chặn.",
    "refIssues": [
     "#225"
    ]
   },
   {
    "id": "TC-UI-007",
    "title": "Confirm dialog — bắt buộc xác nhận trước thao tác nguy hiểm (xóa/hủy/duyệt)",
    "category": "ui",
    "priority": "P0",
    "role": "Mọi vai trò có quyền xóa/hủy/duyệt (mặc định Admin)",
    "preconditions": "Đăng nhập admin. Chọn màn có hành động phá hủy: xóa bản ghi, hủy phiếu/hóa đơn, hủy xuất kho, hoàn/refund.",
    "steps": [
     "Mở 1 bản ghi, bấm hành động nguy hiểm (Xóa / Hủy / Hoàn trả).",
     "Quan sát: phải hiện confirm dialog (ModalShell) nêu rõ hậu quả tiếng Việt có dấu + nút Xác nhận/Hủy tách biệt rõ.",
     "Bấm Hủy → không có gì thay đổi, đóng dialog.",
     "Bấm Xác nhận → thực hiện, hiện success toast, list cập nhật, và ghi audit log cho mutation.",
     "Với thao tác cực nguy hiểm (hủy giao dịch tiền/xuất kho) kiểm tra có yêu cầu lý do/nhập xác nhận thêm nếu nghiệp vụ yêu cầu."
    ],
    "expected": "Mọi thao tác phá hủy đều có confirm dialog nêu rõ hậu quả trước khi thực thi; Hủy = no-op; Xác nhận = thực thi + audit + toast; không có hành động phá hủy chạy 'âm thầm' chỉ bằng 1 click.",
    "evidence": [
     {
      "name": "TC-UI-007__s01__confirm",
      "caption": "Confirm dialog trước khi xóa/hủy nêu rõ hậu quả",
      "uiState": "confirm"
     },
     {
      "name": "TC-UI-007__s02__success",
      "caption": "Sau xác nhận — success toast + list cập nhật",
      "uiState": "success"
     }
    ],
    "notes": "Audit mọi mutation bắt buộc (rule patient-safety/compliance).",
    "refIssues": [
     "#220",
     "#219"
    ]
   },
   {
    "id": "TC-UI-008",
    "title": "Success toast — phản hồi thành công sau create/update/delete",
    "category": "ui",
    "priority": "P1",
    "role": "Mọi vai trò thao tác (mặc định Admin)",
    "preconditions": "Đăng nhập admin. Chọn form tạo/sửa hợp lệ.",
    "steps": [
     "Tạo mới 1 bản ghi hợp lệ → bấm Lưu.",
     "Quan sát: hiện success toast tiếng Việt có dấu, modal/drawer đóng, list refresh chứa bản ghi mới.",
     "Sửa bản ghi → toast 'Cập nhật thành công', dữ liệu mới phản ánh đúng.",
     "Kiểm tra toast tự ẩn sau vài giây, không chồng đống, không che nút thao tác."
    ],
    "expected": "Sau mỗi mutation thành công có success toast rõ nghĩa; UI đồng bộ lại (đóng form, refresh list); toast tự ẩn, không chồng lấn UI; không hiện toast 'thành công' khi thực ra lỗi.",
    "evidence": [
     {
      "name": "TC-UI-008__s01__form",
      "caption": "Form điền hợp lệ trước khi lưu",
      "uiState": "form"
     },
     {
      "name": "TC-UI-008__s02__toast",
      "caption": "Success toast sau khi tạo/sửa thành công",
      "uiState": "toast"
     },
     {
      "name": "TC-UI-008__s03__success",
      "caption": "List refresh phản ánh bản ghi mới/đã sửa",
      "uiState": "success"
     }
    ],
    "notes": "Áp mọi mutation; toast không được báo nhầm khi BE trả lỗi (đọc payload đã unwrap).",
    "refIssues": [
     "#219"
    ]
   },
   {
    "id": "TC-UI-009",
    "title": "Responsive 320/375 — mobile không vỡ layout, không scroll ngang",
    "category": "ui",
    "priority": "P1",
    "role": "Mọi vai trò (mặc định Admin) + BN (Cổng/Telemedicine)",
    "preconditions": "Đăng nhập admin. DevTools → Device toolbar đặt viewport 320px rồi 375px.",
    "steps": [
     "Đặt viewport 320px, mở dashboard + 1 màn list lớn + 1 form + drawer/modal.",
     "Quan sát: không tràn chữ, không nút bị che, không scroll ngang ngoài ý muốn; bảng chuyển dạng responsive (scroll bảng có chủ đích hoặc card).",
     "Lặp ở 375px (kể cả portal BN/kiosk).",
     "Mở drawer/modal → vừa màn, nút đóng/submit truy cập được.",
     "Kiểm tra KpiStrip/TopTabs xếp gọn không vỡ."
    ],
    "expected": "Ở 320/375px: không vỡ layout, không tràn chữ, không nút bị che, không scroll ngang ngoài ý; bảng responsive đúng; drawer/modal vừa màn; KPI/tab xếp gọn.",
    "evidence": [
     {
      "name": "TC-UI-009__s01__list",
      "caption": "List/dashboard ở 320px không vỡ",
      "uiState": "list"
     },
     {
      "name": "TC-UI-009__s02__form",
      "caption": "Form ở 375px không tràn/che nút",
      "uiState": "form"
     },
     {
      "name": "TC-UI-009__s03__drawer",
      "caption": "Drawer/modal ở mobile vừa màn",
      "uiState": "drawer"
     }
    ],
    "notes": "Chi tiết hóa #221 (mobile). Gắn token-scale FE-5 #208.",
    "refIssues": [
     "#221"
    ]
   },
   {
    "id": "TC-UI-010",
    "title": "Responsive 768 (tablet) — layout trung gian, sidebar/drawer hợp lý",
    "category": "ui",
    "priority": "P2",
    "role": "Mọi vai trò (mặc định Admin)",
    "preconditions": "Đăng nhập admin. DevTools viewport 768px.",
    "steps": [
     "Đặt viewport 768px, mở dashboard, list lớn, form nhập, drawer/modal.",
     "Quan sát breakpoint tablet: sidebar/TerminalLayout co/giãn hợp lý, bảng hiển thị đủ cột quan trọng hoặc scroll có chủ đích.",
     "Mở drawer/modal → kích thước phù hợp, không tràn.",
     "Kiểm tra không scroll ngang, không vỡ KPI/tab."
    ],
    "expected": "Ở 768px layout trung gian ổn định: sidebar/drawer hợp lý, bảng đọc được, không scroll ngang, không vỡ layout/che nút.",
    "evidence": [
     {
      "name": "TC-UI-010__s01__list",
      "caption": "List/dashboard ở 768px",
      "uiState": "list"
     },
     {
      "name": "TC-UI-010__s02__drawer",
      "caption": "Drawer/modal ở 768px vừa màn",
      "uiState": "drawer"
     }
    ],
    "notes": "Chi tiết hóa #221 (tablet).",
    "refIssues": [
     "#221"
    ]
   },
   {
    "id": "TC-UI-011",
    "title": "Responsive 1366/1920 (desktop) — tận dụng không gian, không kéo dài quá rộng",
    "category": "ui",
    "priority": "P2",
    "role": "Mọi vai trò (mặc định Admin)",
    "preconditions": "Đăng nhập admin. Cửa sổ 1366px rồi 1920px.",
    "steps": [
     "Mở dashboard + list + form ở 1366px → kiểm tra bố cục cân đối, không khoảng trống thừa lớn vô lý.",
     "Lặp ở 1920px → nội dung không kéo dài hàng quá rộng gây khó đọc, bảng/cột giãn hợp lý, có max-width nơi cần.",
     "Kiểm tra drawer/modal căn giữa, KPI strip đầy đủ."
    ],
    "expected": "Ở 1366/1920px tận dụng không gian hợp lý, không khoảng trắng thừa khổng lồ, không dòng quá dài khó đọc; drawer/modal căn chỉnh đúng.",
    "evidence": [
     {
      "name": "TC-UI-011__s01__list",
      "caption": "Dashboard/list ở 1366px",
      "uiState": "list"
     },
     {
      "name": "TC-UI-011__s02__list",
      "caption": "Bố cục ở 1920px không kéo dài quá rộng",
      "uiState": "list"
     }
    ],
    "notes": "Chi tiết hóa #221 (desktop).",
    "refIssues": [
     "#221"
    ]
   },
   {
    "id": "TC-UI-012",
    "title": "Dark/Light parity — đổi theme không mất chữ/viền/contrast ở mọi thành phần",
    "category": "ui",
    "priority": "P1",
    "role": "Mọi vai trò (mặc định Admin)",
    "preconditions": "Đăng nhập admin. Biết nút toggle dark/light trong TerminalLayout.",
    "steps": [
     "Mở 1 màn list + form + drawer + modal + toast ở chế độ Sáng, chụp tham chiếu.",
     "Bấm toggle sang Tối → quan sát cùng các thành phần: chữ không trùng màu nền (mất chữ), viền/đường kẻ bảng còn thấy, badge/tag/status đủ contrast, biểu đồ đọc được.",
     "Kiểm tra validation message, error-state, empty-state, toast ở cả 2 theme đều rõ.",
     "Kiểm tra ab-* CSS + _v2kit không bị hardcode màu sáng (ô trắng giữa nền tối).",
     "Đổi qua lại nhiều lần — không nhấp nháy sai màu."
    ],
    "expected": "Cả Sáng và Tối: không mất chữ, đủ contrast (WCAG), viền/bảng/tag/badge/biểu đồ/toast/validation/error/empty đều đọc được; không vùng hardcode màu sai theme.",
    "evidence": [
     {
      "name": "TC-UI-012__s01__list",
      "caption": "Màn list ở Light mode (tham chiếu)",
      "uiState": "list"
     },
     {
      "name": "TC-UI-012__s02__list",
      "caption": "Cùng màn ở Dark mode — parity",
      "uiState": "list"
     },
     {
      "name": "TC-UI-012__s03__modal",
      "caption": "Form/modal + validation ở Dark mode đủ contrast",
      "uiState": "modal"
     }
    ],
    "notes": "Chi tiết hóa #222. Nhiều lớp/team hay bỏ sót dark-mode.",
    "refIssues": [
     "#222"
    ]
   },
   {
    "id": "TC-UI-013",
    "title": "Định dạng số tiền & ngày tháng VN — đồng nhất mọi màn (1.234.567 đ, dd/MM/yyyy)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Mọi vai trò (mặc định Thu ngân + Admin)",
    "preconditions": "Đăng nhập admin. Chọn màn tài chính (hóa đơn/viện phí/thanh toán) + màn có ngày (lịch hẹn, khám, đơn thuốc).",
    "steps": [
     "Mở list/detail hóa đơn/viện phí → kiểm tra số tiền có phân tách hàng nghìn kiểu VN (1.234.567), đơn vị 'đ'/VND nhất quán, không lệch dấu chấm-phẩy.",
     "Kiểm tra số tiền = 0 và số âm (hoàn tiền) hiển thị đúng (không '-0', không thiếu dấu).",
     "Kiểm tra ngày/giờ hiển thị dd/MM/yyyy (và HH:mm) theo locale VN, không ISO thô, không lệch múi giờ.",
     "Đối chiếu cùng giá trị giữa list, detail, drawer, phiếu in — phải khớp định dạng.",
     "Xuất XML BHXH / hóa đơn điện tử nếu có — kiểm tra số/ngày đúng chuẩn yêu cầu."
    ],
    "expected": "Số tiền định dạng phân tách hàng nghìn kiểu VN + đơn vị nhất quán toàn hệ thống; ngày dd/MM/yyyy locale VN không lệch múi giờ; giá trị khớp giữa list/detail/drawer/phiếu in; số 0/âm hiển thị đúng.",
    "evidence": [
     {
      "name": "TC-UI-013__s01__detail",
      "caption": "Số tiền định dạng VN trong hóa đơn/viện phí",
      "uiState": "detail"
     },
     {
      "name": "TC-UI-013__s02__list",
      "caption": "Ngày dd/MM/yyyy nhất quán trong list",
      "uiState": "list"
     }
    ],
    "notes": "Liên quan thanh toán online + XML BHXH. Định dạng lệch dễ gây sai lệch tài chính/giám định.",
    "refIssues": [
     "#225"
    ]
   },
   {
    "id": "TC-UI-014",
    "title": "Cảnh báo patient-safety hiển thị nổi bật — dị ứng / tương tác thuốc / nhóm máu",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ / Dược sĩ / Điều dưỡng",
    "preconditions": "Đăng nhập admin (hoặc vai trò lâm sàng). BN có ghi nhận dị ứng + có cặp thuốc tương tác (seed 138_seed_drug_interactions_severe) + có nhóm máu.",
    "steps": [
     "Mở hồ sơ BN có dị ứng đã ghi nhận → kê đơn thuốc thuộc nhóm dị ứng đó.",
     "Quan sát: cảnh báo dị ứng hiển thị NỔI BẬT (màu cảnh báo, không bị nuốt vào toast thoáng qua), buộc bác sĩ ghi nhận/bỏ qua có lý do.",
     "Kê 2 thuốc tương tác mức nặng → cảnh báo tương tác hiển thị rõ trước khi lưu đơn (confirm).",
     "Màn truyền máu/chỉ định nhóm máu → cảnh báo bất đồng nhóm máu hiển thị rõ, chặn thao tác sai.",
     "Kiểm tra cả 2 theme (Sáng/Tối) cảnh báo vẫn đủ contrast nổi bật; mọi cảnh báo + quyết định bỏ qua đều ghi audit."
    ],
    "expected": "Cảnh báo dị ứng / tương tác thuốc nặng / bất đồng nhóm máu luôn hiển thị nổi bật, không thể bỏ lỡ, yêu cầu xác nhận có chủ đích trước thao tác nguy hiểm; đủ contrast ở cả Sáng/Tối; mọi cảnh báo + override được ghi audit.",
    "evidence": [
     {
      "name": "TC-UI-014__s01__modal",
      "caption": "Cảnh báo dị ứng nổi bật khi kê thuốc dị ứng",
      "uiState": "modal"
     },
     {
      "name": "TC-UI-014__s02__confirm",
      "caption": "Cảnh báo tương tác thuốc nặng buộc xác nhận",
      "uiState": "confirm"
     },
     {
      "name": "TC-UI-014__s03__error",
      "caption": "Cảnh báo bất đồng nhóm máu chặn thao tác sai",
      "uiState": "error"
     }
    ],
    "notes": "P0 patient-safety. Liên quan PrescriptionSafetyGuard + seed 138. Đây là UI-state đặc thù an toàn người bệnh áp cho mọi màn lâm sàng.",
    "refIssues": [
     "#220",
     "#222"
    ]
   },
   {
    "id": "TC-UI-015",
    "title": "Realtime SignalR — cập nhật trực tiếp + fallback khi mất kết nối",
    "category": "integration",
    "priority": "P1",
    "role": "Mọi vai trò dùng màn realtime (queue/notification/RIS chat/AI queue)",
    "preconditions": "Đăng nhập admin. BE + SignalR Hub chạy. Mở 1 màn realtime (hàng đợi khám, thông báo, màn hình hiển thị số).",
    "steps": [
     "Mở màn realtime, từ tab/cửa sổ khác tạo sự kiện (gọi số tiếp theo / gửi thông báo).",
     "Quan sát màn realtime tự cập nhật không cần F5; badge thông báo tăng đúng.",
     "Ngắt mạng/SignalR (DevTools offline) → quan sát trạng thái mất kết nối hiển thị rõ + fallback polling hoặc thông báo reconnecting, KHÔNG kẹt số liệu cũ âm thầm.",
     "Khôi phục mạng → auto-reconnect, đồng bộ lại dữ liệu.",
     "Kiểm tra không nhân đôi sự kiện sau reconnect."
    ],
    "expected": "Dữ liệu realtime tự cập nhật qua SignalR; khi mất kết nối có chỉ báo + fallback (polling/reconnect) rõ ràng; reconnect tự động và đồng bộ lại, không trùng lặp/không kẹt dữ liệu cũ âm thầm.",
    "evidence": [
     {
      "name": "TC-UI-015__s01__success",
      "caption": "Realtime cập nhật trực tiếp không cần reload",
      "uiState": "success"
     },
     {
      "name": "TC-UI-015__s02__error",
      "caption": "Trạng thái mất kết nối + fallback/reconnecting",
      "uiState": "error"
     }
    ],
    "notes": "Áp mọi màn realtime; UI-state mất-kết-nối là trạng thái dễ bị bỏ sót.",
    "refIssues": [
     "#219"
    ]
   },
   {
    "id": "TC-UI-016",
    "title": "Thanh toán online — trạng thái chờ/timeout/thành công/thất bại của cổng QR",
    "category": "integration",
    "priority": "P0",
    "role": "Thu ngân / BN (Cổng)",
    "preconditions": "Đăng nhập admin. Màn thanh toán online (VietQR/Napas/VNPay/MoMo) có thể giả lập IPN/return.",
    "steps": [
     "Tạo giao dịch thanh toán online → quan sát màn chờ (đang chờ thanh toán) có mã QR + đếm ngược/loading rõ.",
     "Giả lập thanh toán thành công (IPN/return) → UI chuyển success toast + biên lai/Receipt cập nhật + ghi audit.",
     "Giả lập timeout/hết hạn QR → trạng thái hết hạn rõ ràng + cho tạo lại, KHÔNG kẹt 'đang chờ' vĩnh viễn.",
     "Giả lập thất bại/hủy từ cổng → báo lỗi rõ, KHÔNG đánh dấu đã thu nhầm.",
     "Đối chiếu số tiền định dạng VN (TC-UI-013) và trạng thái khớp giữa màn thu ngân và biên lai."
    ],
    "expected": "Mọi trạng thái cổng thanh toán (chờ/thành công/timeout-hết-hạn/thất bại) hiển thị đúng và phân biệt rõ; thành công mới cập nhật biên lai + audit; timeout/thất bại không ghi nhận thu nhầm; số tiền định dạng VN khớp.",
    "evidence": [
     {
      "name": "TC-UI-016__s01__loading",
      "caption": "Màn chờ thanh toán QR + đếm ngược",
      "uiState": "loading"
     },
     {
      "name": "TC-UI-016__s02__success",
      "caption": "Thanh toán thành công — biên lai cập nhật + toast",
      "uiState": "success"
     },
     {
      "name": "TC-UI-016__s03__error",
      "caption": "QR timeout/hết hạn hoặc thất bại — báo rõ, không thu nhầm",
      "uiState": "error"
     }
    ],
    "notes": "P0 tài chính. Trạng thái 'đang chờ kẹt vĩnh viễn' và 'thu nhầm khi thất bại' là rủi ro tiền thật.",
    "refIssues": [
     "#219",
     "#225"
    ]
   }
  ]
 },
 {
  "id": "integration-consistency",
  "title": "Tích hợp & nhất quán dữ liệu liên phân hệ",
  "summary": "Bộ 19 task test tập trung vào ĐIỂM-NỐI và TÍNH NHẤT QUÁN DỮ LIỆU xuyên phân hệ của HIS: HL7 (LIS) gửi/nhận + hàng đợi retry idempotency (/v2/hl7-message-queue, /v2/emr-hl7-export), DICOM auto-send RIS→PACS Orthanc, XML BHXH chuẩn XSD + cổng QG (/v2/national-gateways, /v2/bhxh-config, /v2/de-an-06), thanh toán online IPN/return (/v2/payment-transactions), SignalR realtime đẩy thông báo (/hubs/notifications, /hubs/ris-chat), audit-log cho mọi mutation nhạy cảm (patient/EMR/tiền/đơn), và đồng bộ số liệu báo cáo end-to-end. Mỗi luồng kiểm tra cả happy-path (tạo A → hiện B → tính C → đồng bộ D) lẫn tình huống hạ tầng lỗi giữa luồng (DB/PACS/Orthanc/Redis/gateway down, timeout, slow) để xác nhận resilience: không mất / không trùng dữ liệu, có fallback + thông báo, transaction rollback sạch, state Submitted→Acknowledged→Failed đúng. Toàn bộ chi tiết hóa các test-issue đã có trên Board GitHub (#226 cross-module, #265 liên thông gateway, #277 golden-file output, #282 audit-log, #284 synthetic monitor, #278 chaos/fault-injection) — KHÔNG tạo issue trùng. Bối cảnh FE v2 /v2/* (TerminalLayout, _v2kit, ab-*), login admin/Admin@123, tiếng Việt có dấu, patient-safety (dị ứng/tương tác/nhóm máu). Evidence bắt buộc theo quy ước TC-INT-<NNN>__s<NN>__<state>, phủ mọi trạng thái UI gồm error/loading/empty/toast/confirm. Việc CHẠY test thực tế + chụp evidence làm SAU CÙNG, sau khi đóng hết task fix; phát hiện bug phải tạo task fix liên kết 2 chiều mới được DONE.",
  "tasks": [
   {
    "id": "TC-INT-001",
    "title": "HL7 LIS — kết quả xét nghiệm về EMR đúng nội dung (ORU happy-path)",
    "category": "integration",
    "priority": "P0",
    "role": "Kỹ thuật viên xét nghiệm / Bác sĩ",
    "preconditions": "Đăng nhập admin/Admin@123. Có 1 chỉ định xét nghiệm ở trạng thái đã lấy mẫu; LIS cấu hình kết nối HL7 (MockMode dev). Backend localhost:5106 chạy.",
    "steps": [
     "Vào /v2/lab, mở phiếu xét nghiệm có chỉ định đang chờ kết quả",
     "Mô phỏng/đẩy 1 message HL7 ORU^R01 chứa kết quả từ máy LIS (hoặc nhập kết quả → xác nhận)",
     "Mở /v2/hl7-message-queue kiểm tra message vừa nhận có trong hàng đợi, trạng thái đã xử lý (Acknowledged)",
     "Quay lại EMR bệnh nhân /v2/emr → tab kết quả CLS, đối chiếu chỉ số/đơn vị/khoảng tham chiếu khớp message HL7",
     "Kiểm tra giá trị bất thường (High/Low) được đánh dấu cảnh báo"
    ],
    "expected": "Kết quả HL7 ánh xạ đúng vào EMR (đúng chỉ số, đơn vị, khoảng tham chiếu, cờ bất thường); message trong hàng đợi chuyển sang Acknowledged; ID xét nghiệm/bệnh nhân khớp xuyên LIS↔EMR; không sinh bản ghi trùng.",
    "notes": "Patient-safety: cờ bất thường phải đúng. Phát hiện lệch ánh xạ → tạo task bug liên kết.",
    "refIssues": [
     "#226",
     "#265"
    ],
    "evidence": [
     {
      "name": "TC-INT-001__s01__list",
      "caption": "Danh sách phiếu xét nghiệm chờ kết quả ở /v2/lab",
      "uiState": "list"
     },
     {
      "name": "TC-INT-001__s02__detail",
      "caption": "Hàng đợi HL7 hiển thị message ORU đã nhận, trạng thái Acknowledged",
      "uiState": "detail"
     },
     {
      "name": "TC-INT-001__s03__tab",
      "caption": "Tab kết quả CLS trong EMR khớp dữ liệu HL7 (chỉ số/đơn vị/cờ bất thường)",
      "uiState": "tab"
     }
    ]
   },
   {
    "id": "TC-INT-002",
    "title": "HL7 hàng đợi — retry + idempotency khi gateway/LIS lỗi giữa luồng",
    "category": "integration",
    "priority": "P0",
    "role": "Quản trị tích hợp / Admin",
    "preconditions": "/v2/hl7-message-queue có quyền truy cập. Background worker HL7 đang chạy. Có thể mô phỏng lỗi gateway (MockMode fail/timeout).",
    "steps": [
     "Mở /v2/hl7-message-queue xem danh sách message + trạng thái",
     "Mô phỏng LIS/endpoint nhận HL7 trả lỗi hoặc timeout cho 1 message đang gửi",
     "Quan sát message chuyển trạng thái Failed/Retrying và đếm số lần retry tăng dần theo backoff",
     "Khôi phục endpoint → quan sát worker tự gửi lại thành công (Acknowledged)",
     "Gửi lại thủ công 1 message đã Acknowledged (hoặc trùng control ID) → kiểm tra KHÔNG tạo bản ghi kết quả trùng trong EMR",
     "Kiểm tra trạng thái error hiển thị rõ + nút retry thủ công"
    ],
    "expected": "Lỗi gateway/LIS không làm mất message; worker retry theo backoff + circuit-breaker; gửi lại idempotent (cùng message control ID không nhân đôi kết quả); state Failed→Retrying→Acknowledged đúng; UI hiển thị trạng thái lỗi + cho retry.",
    "notes": "Chi tiết hóa #265 (HL7 queue retry + idempotency) và #278 (gateway down giữa luồng).",
    "refIssues": [
     "#265",
     "#278"
    ],
    "evidence": [
     {
      "name": "TC-INT-002__s01__list",
      "caption": "Hàng đợi HL7 với các message trạng thái khác nhau",
      "uiState": "list"
     },
     {
      "name": "TC-INT-002__s02__error",
      "caption": "Message chuyển Failed/Retrying khi endpoint lỗi/timeout",
      "uiState": "error"
     },
     {
      "name": "TC-INT-002__s03__success",
      "caption": "Worker tự gửi lại thành công sau khi khôi phục, không trùng kết quả",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-INT-003",
    "title": "EMR HL7 export — xuất message đúng schema + đối chiếu golden-file",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản trị tích hợp / Admin",
    "preconditions": "/v2/emr-hl7-export truy cập được. Có 1 EMR hoàn chỉnh để xuất. Có baseline HL7 message đã duyệt lưu repo.",
    "steps": [
     "Mở /v2/emr-hl7-export, chọn 1 hồ sơ EMR cần xuất",
     "Sinh message HL7 (ADT/ORM/ORU tùy loại) và xem nội dung preview",
     "Đối chiếu message sinh ra với baseline golden-file đã duyệt (segment/field/encoding)",
     "Kiểm tra ký tự tiếng Việt có dấu được encode đúng (không mojibake)",
     "Thử export khi EMR thiếu trường bắt buộc → kiểm tra báo lỗi validation"
    ],
    "expected": "Message HL7 sinh ra khớp baseline (hoặc diff có chủ đích đã duyệt); đúng cấu trúc segment/field; tiếng Việt encode đúng; thiếu trường bắt buộc bị chặn với thông báo rõ.",
    "notes": "Chi tiết hóa #277 (golden-file HL7 message). Lệch baseline → task bug liên kết.",
    "refIssues": [
     "#277"
    ],
    "evidence": [
     {
      "name": "TC-INT-003__s01__detail",
      "caption": "Preview message HL7 xuất từ EMR ở /v2/emr-hl7-export",
      "uiState": "detail"
     },
     {
      "name": "TC-INT-003__s02__validation",
      "caption": "Báo lỗi validation khi EMR thiếu trường bắt buộc",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-INT-004",
    "title": "DICOM auto-send — RIS chỉ định chụp → ảnh về PACS Orthanc → viewer mở được",
    "category": "integration",
    "priority": "P0",
    "role": "Kỹ thuật viên CĐHA / Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Đăng nhập admin. Có chỉ định chụp CĐHA ở /v2/radiology. Orthanc PACS chạy (localhost:8042). Worklist/auto-send cấu hình.",
    "steps": [
     "Tạo/mở chỉ định chụp tại /v2/radiology, xác nhận worklist gửi xuống máy chụp",
     "Mô phỏng máy đẩy DICOM study lên Orthanc (hoặc nhận study auto-send)",
     "Kiểm tra study xuất hiện trong danh sách worklist/RIS với Accession Number + Patient ID khớp chỉ định",
     "Mở viewer /v2/radiology/viewer → xác nhận ảnh load qua proxy PACS (wadouri imageIds)",
     "Đối chiếu PatientID/StudyInstanceUID giữa RIS và metadata DICOM"
    ],
    "expected": "Study DICOM về PACS đúng, ánh xạ Accession/PatientID/StudyUID khớp chỉ định RIS; viewer mở được ảnh từ Orthanc; không lệch bệnh nhân (an toàn nhận diện).",
    "notes": "Nhầm ánh xạ PatientID = nguy cơ an toàn nghiêm trọng → bug ưu tiên cao.",
    "refIssues": [
     "#226"
    ],
    "evidence": [
     {
      "name": "TC-INT-004__s01__list",
      "caption": "Danh sách worklist/chỉ định chụp ở /v2/radiology",
      "uiState": "list"
     },
     {
      "name": "TC-INT-004__s02__detail",
      "caption": "Study DICOM về PACS với Accession/PatientID khớp",
      "uiState": "detail"
     },
     {
      "name": "TC-INT-004__s03__success",
      "caption": "Viewer mở ảnh DICOM từ Orthanc thành công",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-INT-005",
    "title": "DICOM/PACS down giữa luồng — chỉ định chụp vẫn không mất, có fallback + thông báo",
    "category": "integration",
    "priority": "P1",
    "role": "Kỹ thuật viên CĐHA",
    "preconditions": "Có thể ngắt/mock Orthanc PACS lỗi. Có chỉ định chụp đang xử lý ở /v2/radiology.",
    "steps": [
     "Tạo chỉ định chụp tại /v2/radiology",
     "Ngắt/mô phỏng Orthanc PACS không phản hồi (timeout) ngay khi auto-send/viewer truy vấn",
     "Quan sát UI hiển thị error/empty state cho phần ảnh (không treo trắng, không crash)",
     "Kiểm tra chỉ định + bản ghi RIS vẫn tồn tại, không bị mất",
     "Khôi phục PACS → study đồng bộ lại, viewer mở được; kiểm tra không trùng study"
    ],
    "expected": "PACS lỗi không làm mất chỉ định/bản ghi RIS; UI báo lỗi rõ ràng (error state), không treo; phục hồi sạch sau khi PACS trở lại; không sinh study trùng.",
    "notes": "Chi tiết hóa #278 (PACS/Orthanc down giữa luồng).",
    "refIssues": [
     "#278"
    ],
    "evidence": [
     {
      "name": "TC-INT-005__s01__loading",
      "caption": "Viewer đang tải ảnh từ PACS",
      "uiState": "loading"
     },
     {
      "name": "TC-INT-005__s02__error",
      "caption": "Error state khi PACS timeout, chỉ định vẫn còn",
      "uiState": "error"
     },
     {
      "name": "TC-INT-005__s03__success",
      "caption": "Phục hồi sau khi PACS trở lại, ảnh load lại được",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-INT-006",
    "title": "XML BHXH — sinh file giám định đúng XSD + đối chiếu golden-file (XML4210/4750)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Cán bộ BHXH / Kế toán bảo hiểm",
    "preconditions": "/v2/bhxh-config + xuất XML truy cập được. Có hồ sơ KCB BHYT hoàn chỉnh (đã ra viện/quyết toán). Baseline XML + XSD lưu repo.",
    "steps": [
     "Vào màn xuất XML BHXH (qua /v2/bhxh-config hoặc Insurance), chọn kỳ/hồ sơ cần xuất",
     "Sinh bộ XML giám định (XML1-XML5...) và xem nội dung",
     "Validate XML theo XSD chuẩn BHXH → kiểm tra pass",
     "Đối chiếu XML với golden-file baseline đã duyệt (mã thẻ, số tiền, mã dịch vụ, ngày)",
     "Kiểm tra tổng tiền XML khớp với số tiền viện phí/quyết toán trong Billing",
     "Thử hồ sơ thiếu thông tin bắt buộc (mã thẻ/CCCD) → kiểm tra báo lỗi"
    ],
    "expected": "XML hợp lệ theo XSD; khớp golden-file (hoặc diff đã duyệt); số tiền XML khớp Billing; thiếu trường bắt buộc bị chặn. Nhất quán tiền xuyên Billing↔BHXH.",
    "notes": "Chi tiết hóa #277 (golden BHXH XML) + #265 (liên thông BHXH, P0 tiền). Lệch tiền → bug ưu tiên cao.",
    "refIssues": [
     "#277",
     "#265"
    ],
    "evidence": [
     {
      "name": "TC-INT-006__s01__detail",
      "caption": "Nội dung XML BHXH sinh ra cho kỳ giám định",
      "uiState": "detail"
     },
     {
      "name": "TC-INT-006__s02__success",
      "caption": "Validate XSD pass + khớp golden-file",
      "uiState": "success"
     },
     {
      "name": "TC-INT-006__s03__validation",
      "caption": "Báo lỗi khi hồ sơ thiếu mã thẻ/CCCD bắt buộc",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-INT-007",
    "title": "Cổng Đơn thuốc / Dược QG — submit đơn → state Submitted→Acknowledged→Failed đúng",
    "category": "integration",
    "priority": "P0",
    "role": "Bác sĩ / Dược sĩ / Admin tích hợp",
    "preconditions": "/v2/national-gateways truy cập được. Cấu hình cổng Đơn thuốc QG (MockMode dev). Có đơn thuốc đã kê.",
    "steps": [
     "Mở /v2/national-gateways, chọn cổng Đơn thuốc QG",
     "Liên thông 1 đơn thuốc đã kê → quan sát trạng thái Submitted",
     "Mô phỏng cổng phản hồi thành công → trạng thái chuyển Acknowledged (kèm mã đơn QG)",
     "Mô phỏng cổng trả lỗi/timeout → trạng thái Failed + cho gửi lại",
     "Gửi lại đơn Failed → kiểm tra idempotency (không tạo 2 bản trên cổng); đối chiếu mã đơn/idempotency key",
     "Kiểm tra MockMode dev/prod split + ApiKey lấy từ env (không hardcode)"
    ],
    "expected": "State Submitted→Acknowledged→Failed đúng theo phản hồi cổng; gửi lại không trùng (idempotency key); lỗi/timeout có fallback + không chặn nghiệp vụ kê đơn; UI hiển thị trạng thái rõ.",
    "notes": "Chi tiết hóa #265 (liên thông cổng QG, retry/idempotency, circuit-breaker).",
    "refIssues": [
     "#265"
    ],
    "evidence": [
     {
      "name": "TC-INT-007__s01__list",
      "caption": "Danh sách cổng QG + trạng thái liên thông ở /v2/national-gateways",
      "uiState": "list"
     },
     {
      "name": "TC-INT-007__s02__success",
      "caption": "Đơn chuyển Acknowledged kèm mã đơn QG",
      "uiState": "success"
     },
     {
      "name": "TC-INT-007__s03__error",
      "caption": "Đơn Failed khi cổng lỗi/timeout, có nút gửi lại",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-INT-008",
    "title": "Đề án 06 / liên thông CCCD-VNeID — tra cứu định danh + xử lý gateway down",
    "category": "integration",
    "priority": "P1",
    "role": "Lễ tân / Cán bộ tiếp đón",
    "preconditions": "/v2/de-an-06 truy cập được. Cấu hình cổng Đề án 06 (MockMode dev).",
    "steps": [
     "Mở /v2/de-an-06, nhập CCCD để tra cứu định danh công dân",
     "Quan sát kết quả trả về ánh xạ đúng vào hồ sơ bệnh nhân (họ tên/ngày sinh/địa chỉ)",
     "Mô phỏng cổng Đề án 06 timeout/down → kiểm tra UI báo lỗi + cho nhập thủ công (fallback không chặn tiếp đón)",
     "Kiểm tra liên kết dữ liệu định danh không ghi đè sai bệnh nhân khác",
     "Kiểm tra audit log ghi nhận thao tác tra cứu định danh (dữ liệu nhạy cảm)"
    ],
    "expected": "Tra cứu trả đúng định danh, ánh xạ đúng bệnh nhân; cổng down có fallback nhập tay, không chặn nghiệp vụ; không ghi đè nhầm; thao tác được audit.",
    "notes": "Liên thông dữ liệu định danh — nhầm bệnh nhân là rủi ro an toàn. Gắn #282 (audit GET nhạy cảm).",
    "refIssues": [
     "#265",
     "#282"
    ],
    "evidence": [
     {
      "name": "TC-INT-008__s01__form",
      "caption": "Form tra cứu CCCD ở /v2/de-an-06",
      "uiState": "form"
     },
     {
      "name": "TC-INT-008__s02__detail",
      "caption": "Kết quả định danh ánh xạ vào hồ sơ bệnh nhân",
      "uiState": "detail"
     },
     {
      "name": "TC-INT-008__s03__error",
      "caption": "Fallback nhập tay khi cổng Đề án 06 timeout",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-INT-009",
    "title": "Thanh toán online — tạo QR/giao dịch → IPN callback cập nhật biên lai đúng",
    "category": "integration",
    "priority": "P0",
    "role": "Thu ngân / Bệnh nhân",
    "preconditions": "/v2/payment-transactions + /v2/billing truy cập được. Cấu hình cổng thanh toán (VietQR/VNPay MockMode). Có phiếu viện phí chờ thanh toán.",
    "steps": [
     "Tại /v2/billing chọn phiếu chờ thu, khởi tạo thanh toán online → sinh QR/giao dịch",
     "Mở /v2/payment-transactions xác nhận giao dịch ở trạng thái Pending với đúng số tiền",
     "Mô phỏng IPN callback báo thanh toán thành công (đúng mã giao dịch + chữ ký hợp lệ)",
     "Kiểm tra giao dịch chuyển Paid; biên lai/Receipt được tạo + liên kết đúng (CashierId)",
     "Kiểm tra số tiền giao dịch = số tiền phiếu viện phí (nhất quán Payment↔Billing)",
     "Kiểm tra trạng thái phiếu Billing chuyển sang Đã thanh toán"
    ],
    "expected": "IPN hợp lệ cập nhật giao dịch Paid + tạo biên lai liên kết đúng; số tiền khớp xuyên Payment↔Billing↔Receipt; phiếu chuyển Đã thanh toán; không thanh toán trùng.",
    "notes": "P0 tiền. Chữ ký IPN sai phải bị từ chối (xem TC-INT-010). Lệch tiền → bug ưu tiên cao nhất.",
    "refIssues": [
     "#226",
     "#265"
    ],
    "evidence": [
     {
      "name": "TC-INT-009__s01__modal",
      "caption": "Modal khởi tạo thanh toán online + QR ở /v2/billing",
      "uiState": "modal"
     },
     {
      "name": "TC-INT-009__s02__list",
      "caption": "Giao dịch Pending ở /v2/payment-transactions đúng số tiền",
      "uiState": "list"
     },
     {
      "name": "TC-INT-009__s03__success",
      "caption": "Sau IPN: giao dịch Paid, biên lai tạo, phiếu Đã thanh toán",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-INT-010",
    "title": "Thanh toán online — IPN giả mạo / sai chữ ký / trùng → bị từ chối, không cập nhật tiền",
    "category": "security",
    "priority": "P0",
    "role": "Hệ thống / Kiểm thử bảo mật",
    "preconditions": "Cổng thanh toán cấu hình. Có giao dịch Pending. Biết endpoint IPN.",
    "steps": [
     "Gửi IPN callback với chữ ký không hợp lệ cho 1 giao dịch Pending → kiểm tra bị từ chối, giao dịch KHÔNG chuyển Paid",
     "Gửi IPN với mã giao dịch không tồn tại → bị từ chối, không tạo biên lai rác",
     "Gửi IPN trùng (replay) cho giao dịch đã Paid → kiểm tra idempotent, không tạo biên lai/thu tiền lần 2",
     "Gửi IPN với số tiền khác số tiền giao dịch gốc → bị từ chối/đánh dấu bất thường",
     "Kiểm tra mọi IPN bị từ chối được ghi log audit/cảnh báo"
    ],
    "expected": "IPN sai chữ ký/sai mã/trùng/sai tiền đều bị từ chối; không cập nhật trạng thái Paid sai; không tạo biên lai trùng; mọi từ chối được log. Chống thu tiền giả/double-credit.",
    "notes": "An toàn tiền + chống gian lận. Phát hiện lỗ hổng → tạo task bug security liên kết.",
    "refIssues": [
     "#265"
    ],
    "evidence": [
     {
      "name": "TC-INT-010__s01__error",
      "caption": "IPN sai chữ ký bị từ chối, giao dịch vẫn Pending",
      "uiState": "error"
     },
     {
      "name": "TC-INT-010__s02__detail",
      "caption": "IPN replay không tạo biên lai lần 2 (idempotent)",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-INT-011",
    "title": "SignalR realtime — đẩy thông báo tới đúng người dùng + badge cập nhật tức thời",
    "category": "integration",
    "priority": "P1",
    "role": "Bác sĩ / Điều dưỡng (người nhận thông báo)",
    "preconditions": "Backend chạy, hub /hubs/notifications hoạt động. Đăng nhập 2 phiên/2 vai trò trên 2 tab. JWT hợp lệ.",
    "steps": [
     "Đăng nhập, mở app v2 → xác nhận SignalR kết nối hub /hubs/notifications (badge thông báo hiển thị)",
     "Từ tab khác/khác vai trò, thực hiện thao tác sinh thông báo (vd duyệt đơn, có kết quả CLS, chỉ định mới)",
     "Quan sát tab người nhận: badge thông báo tăng tức thời KHÔNG cần refresh",
     "Mở dropdown/panel thông báo → nội dung khớp sự kiện vừa xảy ra",
     "Kiểm tra thông báo chỉ đẩy tới đúng người/nhóm nhận (không rò sang user không liên quan)"
    ],
    "expected": "SignalR đẩy realtime đúng người nhận, badge cập nhật tức thời không reload; nội dung khớp sự kiện; không rò thông báo sai vai trò.",
    "notes": "Hub /hubs/notifications + /hubs/ris-chat. Rò thông báo sai người = rủi ro riêng tư → bug.",
    "refIssues": [
     "#226"
    ],
    "evidence": [
     {
      "name": "TC-INT-011__s01__toast",
      "caption": "Toast/badge thông báo realtime xuất hiện không cần refresh",
      "uiState": "toast"
     },
     {
      "name": "TC-INT-011__s02__dropdown",
      "caption": "Dropdown thông báo nội dung khớp sự kiện vừa sinh",
      "uiState": "dropdown"
     }
    ]
   },
   {
    "id": "TC-INT-012",
    "title": "SignalR mất kết nối — auto-reconnect + fallback polling, không mất thông báo",
    "category": "negative",
    "priority": "P2",
    "role": "Bác sĩ / Điều dưỡng",
    "preconditions": "App đang kết nối hub. Có thể ngắt mạng/hub tạm thời (mô phỏng Redis backplane/hub down).",
    "steps": [
     "Mở app v2 đã kết nối SignalR",
     "Ngắt kết nối hub/mạng tạm thời → quan sát UI báo trạng thái mất kết nối (không crash)",
     "Trong lúc mất kết nối, sinh 1 sự kiện thông báo từ phía khác",
     "Khôi phục kết nối → kiểm tra auto-reconnect + thông báo bỏ lỡ được đồng bộ (polling fallback)",
     "Kiểm tra badge/đếm cuối cùng nhất quán với số sự kiện thực tế"
    ],
    "expected": "Mất kết nối hiển thị trạng thái rõ; auto-reconnect khi mạng trở lại; thông báo bỏ lỡ được lấy lại qua polling fallback; số đếm cuối cùng nhất quán, không mất/không trùng.",
    "notes": "Chi tiết hóa #278 (Redis/hub down giữa luồng) phần realtime.",
    "refIssues": [
     "#278"
    ],
    "evidence": [
     {
      "name": "TC-INT-012__s01__error",
      "caption": "UI báo mất kết nối realtime",
      "uiState": "error"
     },
     {
      "name": "TC-INT-012__s02__success",
      "caption": "Auto-reconnect + thông báo bỏ lỡ đồng bộ lại",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-INT-013",
    "title": "Audit-log — mọi mutation patient/EMR/billing/prescription sinh đúng audit row",
    "category": "integration",
    "priority": "P1",
    "role": "Quản trị tuân thủ / Admin",
    "preconditions": "AuditLogMiddleware bật. Đăng nhập admin. Màn xem audit log (SystemAdmin/admin) truy cập được.",
    "steps": [
     "Thực hiện tạo mới bệnh nhân tại /v2/reception → mở audit log kiểm tra có row (action, user, time, entity)",
     "Sửa 1 trường EMR tại /v2/emr/edit → kiểm tra audit ghi field-diff (giá trị cũ→mới)",
     "Tạo/sửa phiếu viện phí tại /v2/billing → kiểm tra audit row đầy đủ",
     "Kê/sửa đơn thuốc tại /v2/prescription/edit → kiểm tra audit row",
     "Đối chiếu user thực hiện + timestamp khớp phiên đăng nhập; xác nhận không thiếu log thao tác nào"
    ],
    "expected": "Mỗi mutation nhạy cảm (patient/EMR/billing/prescription) sinh đúng 1 audit row đầy đủ: action, user, timestamp, entity, field-diff. Thiếu/sai log = fail.",
    "notes": "Chi tiết hóa #282 (audit-log verification, gắn AUDIT-1 #198). Thiếu log → task bug liên kết.",
    "refIssues": [
     "#282"
    ],
    "evidence": [
     {
      "name": "TC-INT-013__s01__detail",
      "caption": "Audit row sau khi tạo bệnh nhân (action/user/time/entity)",
      "uiState": "detail"
     },
     {
      "name": "TC-INT-013__s02__detail",
      "caption": "Audit field-diff giá trị cũ→mới khi sửa EMR",
      "uiState": "detail"
     },
     {
      "name": "TC-INT-013__s03__list",
      "caption": "Danh sách audit log đủ các thao tác billing/prescription",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-INT-014",
    "title": "Audit-log — GET dữ liệu nhạy cảm (xem hồ sơ bệnh nhân) được ghi truy cập",
    "category": "security",
    "priority": "P1",
    "role": "Quản trị tuân thủ / Admin",
    "preconditions": "Audit GET nhạy cảm bật (AUDIT-1 #198). Có bệnh nhân để xem.",
    "steps": [
     "Mở EMR/hồ sơ 1 bệnh nhân tại /v2/emr (thao tác đọc dữ liệu nhạy cảm)",
     "Tra cứu hồ sơ qua tra-cuu-benh-an / portal staff",
     "Mở audit log → kiểm tra có row ghi nhận thao tác truy cập (ai xem hồ sơ ai, khi nào)",
     "Đối chiếu user/role/IP/time khớp phiên",
     "Kiểm tra thao tác xem KHÔNG bị bỏ sót log với các vai trò khác nhau"
    ],
    "expected": "Mọi truy cập đọc dữ liệu nhạy cảm sinh audit row (who-viewed-whom, time, role); không bỏ sót. Phục vụ tuân thủ pháp lý.",
    "notes": "Chi tiết hóa #282 phần GET nhạy cảm. Bỏ sót log truy cập = vi phạm tuân thủ → bug.",
    "refIssues": [
     "#282"
    ],
    "evidence": [
     {
      "name": "TC-INT-014__s01__detail",
      "caption": "Audit row ghi nhận truy cập đọc hồ sơ bệnh nhân",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-INT-015",
    "title": "Cross-module — chỉ định CLS ở OPD → thực hiện ở Lab/CĐHA → tính tiền Billing nhất quán",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ khám / Thu ngân",
    "preconditions": "Đăng nhập admin. Có bệnh nhân đang khám tại /v2/opd. Bảng giá dịch vụ + BHYT cấu hình.",
    "steps": [
     "Tại /v2/opd, kê 1 chỉ định CLS (xét nghiệm + chụp) cho bệnh nhân",
     "Kiểm tra chỉ định xuất hiện đúng ở /v2/lab và /v2/radiology (đúng bệnh nhân, đúng dịch vụ)",
     "Thực hiện + trả kết quả → kiểm tra kết quả về EMR",
     "Mở /v2/billing → kiểm tra dịch vụ CLS được tính tiền đúng đơn giá, đúng mức hưởng BHYT",
     "Đối chiếu ID chỉ định/trạng thái/số tiền khớp xuyên OPD→Lab/CĐHA→EMR→Billing"
    ],
    "expected": "Chỉ định tạo ở A hiển thị đúng ở B, kết quả về EMR đúng, tính tiền ở Billing đúng (đơn giá + BHYT); ID/trạng thái/số tiền nhất quán end-to-end, không lệch không trùng.",
    "notes": "Chi tiết hóa #226 (cross-module A→B→C→D). Lệch tiền/trạng thái → bug.",
    "refIssues": [
     "#226"
    ],
    "evidence": [
     {
      "name": "TC-INT-015__s01__form",
      "caption": "Kê chỉ định CLS tại /v2/opd",
      "uiState": "form"
     },
     {
      "name": "TC-INT-015__s02__list",
      "caption": "Chỉ định hiển thị đúng ở /v2/lab và /v2/radiology",
      "uiState": "list"
     },
     {
      "name": "TC-INT-015__s03__detail",
      "caption": "Billing tính tiền CLS đúng đơn giá + BHYT, số tiền khớp",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-INT-016",
    "title": "Cross-module — kê đơn → duyệt dược → cấp phát → trừ tồn kho nhất quán",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ / Dược sĩ / Thủ kho",
    "preconditions": "Có bệnh nhân tại /v2/prescription. Tồn kho thuốc có sẵn. Patient-safety (dị ứng/tương tác) cấu hình.",
    "steps": [
     "Kê đơn thuốc tại /v2/prescription/edit; kiểm tra cảnh báo dị ứng/tương tác (patient-safety) hoạt động",
     "Đơn chuyển sang /v2/pharmacy duyệt → trạng thái khớp",
     "Cấp phát thuốc → kiểm tra số lượng tồn kho bị trừ đúng",
     "Đối chiếu số lượng kê = số lượng duyệt = số lượng cấp phát = số lượng trừ tồn",
     "Kiểm tra giá thuốc đưa vào Billing đúng; kiểm tra audit cho mutation kê/duyệt/cấp phát"
    ],
    "expected": "Đơn nhất quán xuyên kê→duyệt→cấp phát→trừ tồn (số lượng/giá khớp); cảnh báo patient-safety đúng; tồn kho giảm đúng, không âm; mutation được audit.",
    "notes": "Chi tiết hóa #226. Patient-safety + nhất quán tồn kho/tiền. Lệch số lượng/tồn → bug.",
    "refIssues": [
     "#226",
     "#282"
    ],
    "evidence": [
     {
      "name": "TC-INT-016__s01__modal",
      "caption": "Cảnh báo dị ứng/tương tác khi kê đơn (patient-safety)",
      "uiState": "modal"
     },
     {
      "name": "TC-INT-016__s02__detail",
      "caption": "Trạng thái đơn khớp xuyên kê→duyệt→cấp phát",
      "uiState": "detail"
     },
     {
      "name": "TC-INT-016__s03__success",
      "caption": "Tồn kho trừ đúng số lượng sau cấp phát",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-INT-017",
    "title": "DB down / rollback giữa luồng tiền — không mất, không-trùng, không số liệu nửa vời",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Hệ thống / Kiểm thử resilience",
    "preconditions": "Có thể mô phỏng DB lỗi/ngắt giữa transaction (DATA-1 #187). Có luồng thu tiền/quyết toán đang chạy.",
    "steps": [
     "Bắt đầu 1 thao tác đa-bước có transaction (vd quyết toán viện phí + tạo biên lai + cập nhật BHYT)",
     "Mô phỏng DB ngắt/timeout GIỮA transaction",
     "Quan sát UI báo lỗi rõ (error state), không hiển thị thành công giả",
     "Kiểm tra DB: transaction rollback sạch — KHÔNG có biên lai mồ côi / số tiền nửa vời / trạng thái lệch",
     "Thử lại sau khi DB phục hồi → hoàn tất đúng 1 lần, không nhân đôi"
    ],
    "expected": "DB lỗi giữa luồng → transaction rollback sạch, không sinh bản ghi nửa vời/mồ côi; UI không báo thành công giả; thử lại idempotent. Nhất quán tiền tuyệt đối.",
    "notes": "Chi tiết hóa #278 (DB down) + DATA-1 #187 (transaction rollback). Số liệu nửa vời = bug P0.",
    "refIssues": [
     "#278"
    ],
    "evidence": [
     {
      "name": "TC-INT-017__s01__error",
      "caption": "UI báo lỗi khi DB ngắt giữa transaction (không thành công giả)",
      "uiState": "error"
     },
     {
      "name": "TC-INT-017__s02__detail",
      "caption": "Kiểm tra DB rollback sạch, không bản ghi nửa vời",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-INT-018",
    "title": "Đồng bộ số liệu báo cáo — tổng hợp Reports khớp dữ liệu nguồn các phân hệ",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản lý / Kế toán tổng hợp",
    "preconditions": "Có dữ liệu giao dịch trong ngày (thu tiền, khám, CLS, cấp phát). /v2/reports + /v2/finance + /v2/payment-reports truy cập được.",
    "steps": [
     "Ghi nhận số liệu nguồn: tổng thu tại /v2/billing + /v2/payment-transactions trong kỳ",
     "Mở /v2/reports (hoặc /v2/payment-reports, /v2/finance) chạy báo cáo doanh thu cùng kỳ",
     "Đối chiếu tổng tiền/số lượt báo cáo = tổng từ dữ liệu nguồn (không lệch)",
     "Kiểm tra báo cáo theo bộ lọc (khoa/ngày/loại) cộng dồn đúng = tổng",
     "Mô phỏng có giao dịch hoàn/hủy → kiểm tra báo cáo phản ánh đúng (không tính giao dịch đã hủy)"
    ],
    "expected": "Số liệu báo cáo tổng hợp khớp chính xác dữ liệu nguồn các phân hệ; lọc cộng dồn đúng tổng; giao dịch hủy/hoàn không bị tính sai. Đồng bộ báo cáo end-to-end.",
    "notes": "Chi tiết hóa #226 (đồng bộ đúng ở D). Lệch số báo cáo vs nguồn → bug.",
    "refIssues": [
     "#226"
    ],
    "evidence": [
     {
      "name": "TC-INT-018__s01__filter",
      "caption": "Báo cáo doanh thu theo bộ lọc kỳ/khoa ở /v2/reports",
      "uiState": "filter"
     },
     {
      "name": "TC-INT-018__s02__detail",
      "caption": "Tổng báo cáo khớp tổng từ Billing/Payment nguồn",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-INT-019",
    "title": "Synthetic monitoring prod — login + luồng tới hạn chạy định kỳ + alert khi fail",
    "category": "integration",
    "priority": "P2",
    "role": "DevOps / Quản trị vận hành",
    "preconditions": "Prod ổn định (Vercel unblock). Cấu hình synthetic test (Playwright cron / uptime monitor) + kênh alert (Slack/email).",
    "steps": [
     "Cấu hình kịch bản synthetic: login admin trên prod + mở 1 dashboard/list tới hạn",
     "Đặt lịch chạy định kỳ mỗi N phút (cron)",
     "Quan sát các lần chạy thành công ghi nhận uptime",
     "Mô phỏng prod lỗi (API 5xx/timeout) → kiểm tra synthetic phát hiện fail",
     "Kiểm tra alert gửi tới kênh (Slack/email) trong vài phút khi fail"
    ],
    "expected": "Synthetic chạy định kỳ trên prod; phát hiện fail của luồng tới hạn; gửi cảnh báo kịp thời (vài phút). Bắt lỗi sớm sau deploy.",
    "notes": "Chi tiết hóa #284 (synthetic monitoring prod). P2 — sau khi prod ổn (Vercel unblock).",
    "refIssues": [
     "#284"
    ],
    "evidence": [
     {
      "name": "TC-INT-019__s01__success",
      "caption": "Synthetic run thành công ghi nhận uptime định kỳ",
      "uiState": "success"
     },
     {
      "name": "TC-INT-019__s02__error",
      "caption": "Synthetic phát hiện fail + alert gửi đi",
      "uiState": "error"
     }
    ]
   }
  ]
 },
 {
  "id": "completeness-additional",
  "title": "Bù coverage do critic phát hiện",
  "summary": "Rà 38 phân hệ + 12 luồng + bộ 74 issue test (#216-289) trong evidence/data/*.js. Coverage per-module RẤT mạnh ở các chiều happy/negative/validation/permission/state/security (1155 task). NHƯNG mảng cross-cutting (window.TP.cross) đang RỖNG, và một số chiều rủi-ro-cao chỉ được chạm RẢI RÁC trong 1-2 phân hệ chứ KHÔNG quét hệ thống xuyên module. Critic phát hiện 10 lỗ hổng góc-nhìn cần bù, tất cả map được vào issue cha sẵn có (#219 T4, #224 T9, #225 T10, #226 T11, #227 T12, #232/#233/#234 Tài chính, #258 ký số, #281 T26, #282 T27, #287 T32) → điền refIssues, KHÔNG cần issue mới. Bằng chứng đọc trực tiếp: PrescriptionSafetyGuard.cs (cặp tương tác đối xứng cần CẢ hai thuốc, KB rỗng không chặn, OverrideReason bỏ qua → phải audit), CLAUDE.md ghi rõ footgun envelope-unwrap từng làm hỏng login prod (commit 92d35a2) chỉ có 1 lần nhắc trong data. Riêng 4 phân hệ gap:true (Khảo sát hài lòng, Chuyên khoa đặc thù, MCI, Đào tạo/NCKH) chưa có issue test riêng trên GitHub → đưa vào candidate_issues chờ user duyệt, không tự tạo.",
  "tasks": [
   {
    "id": "TC-GAP-001",
    "title": "Đồng thời / double-submit / khóa lạc quan — quét HỆ THỐNG các điểm tranh chấp tài nguyên dùng chung",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ + Điều dưỡng + Thu ngân (2 phiên song song)",
    "preconditions": "2 trình duyệt/2 tài khoản login cùng lúc; BE 5106 + SQL chạy; có sẵn 1 giường trống, 1 phòng khám có hàng đợi, 1 lô thuốc tồn kho thấp, 1 lượt viện phí chưa thu.",
    "steps": [
     "Mở cùng 1 bản ghi (lượt khám / hồ sơ nội trú) trên 2 phiên, cả hai bấm Lưu gần như đồng thời → kiểm tra không ghi đè im lặng (last-write-wins mất dữ liệu) mà phải báo xung đột hoặc khóa lạc quan.",
     "2 điều dưỡng cùng gán 1 giường trống cuối cùng cho 2 BN khác nhau → chỉ 1 thành công, người thứ 2 nhận lỗi 'giường đã được nhận'.",
     "2 thu ngân cùng cấp số phiếu thu / số biên lai trong 1 nhịp → KHÔNG trùng số (kiểm tra sequence/transaction).",
     "2 dược sĩ cùng xuất lô thuốc tồn kho = 1 đơn vị cuối → chỉ 1 trừ được tồn, người kia bị chặn (không âm kho).",
     "Bấm nút Lưu/Duyệt/Thanh toán liên tiếp 2 lần khi request đầu đang chạy (double-submit) → chỉ tạo 1 bản ghi, nút phải disable/loading."
    ],
    "expected": "Mọi điểm tranh chấp (giường, số phiếu, tồn kho, lượt khám, thanh toán) đều an toàn dưới truy cập đồng thời: không ghi đè mất dữ liệu, không trùng số định danh, không tồn kho âm, không tạo bản ghi rác do double-submit; UI báo xung đột rõ ràng.",
    "notes": "Hiện chỉ có 4 task chạm rải rác (clin/oper). Cần quét xuyên reception/ipd/billing/pharmwh/surgery như một MA TRẬN concurrency thống nhất. Đây là lớp bug 'không tái hiện được' điển hình ở HIS thật.",
    "refIssues": [
     "#226",
     "#236",
     "#243"
    ],
    "evidence": [
     {
      "name": "TC-GAP-001__s02__error",
      "caption": "Gán giường trùng — phiên thứ 2 nhận lỗi giường đã nhận",
      "uiState": "error"
     },
     {
      "name": "TC-GAP-001__s05__confirm",
      "caption": "Double-submit nút Lưu — nút disable/loading, chỉ tạo 1 bản ghi",
      "uiState": "confirm"
     }
    ]
   },
   {
    "id": "TC-GAP-002",
    "title": "Xóa mềm (IsDeleted) — bản ghi đã xóa KHÔNG rò rỉ, không tái tham chiếu, không vỡ FK/báo cáo",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Admin + Bác sĩ + Thu ngân",
    "preconditions": "Có sẵn bản ghi có thể xóa mềm ở nhiều phân hệ: danh mục dịch vụ/thuốc, bệnh nhân, đơn thuốc, dịch vụ chỉ định, phiếu thu.",
    "steps": [
     "Xóa mềm 1 danh mục (thuốc/dịch vụ) đang được tham chiếu bởi đơn/chỉ định cũ → bản ghi cũ vẫn hiển thị đúng tên (không vỡ), nhưng KHÔNG còn chọn được khi tạo mới.",
     "Xóa mềm 1 BN → không còn xuất hiện ở danh sách tìm kiếm/hàng đợi, nhưng dữ liệu lịch sử (bệnh án cũ) vẫn truy vết được qua audit.",
     "Kiểm tra mọi list/dropdown/báo cáo/thống kê đều lọc IsDeleted=false (không đếm bản ghi đã xóa vào KPI/doanh thu).",
     "Thử gọi trực tiếp API GET by-id của bản ghi đã xóa mềm → trả 404/forbidden, không lộ dữ liệu.",
     "Tạo lại bản ghi trùng mã với cái đã xóa mềm → kiểm tra ràng buộc unique xử lý đúng (cho phép hoặc báo lỗi nhất quán)."
    ],
    "expected": "Bản ghi xóa mềm biến mất khỏi mọi luồng đang-hoạt-động (list, dropdown, KPI, báo cáo, doanh thu) nhưng dữ liệu lịch sử và FK cũ vẫn toàn vẹn; không rò rỉ qua API by-id; ràng buộc unique nhất quán.",
    "notes": "Chỉ chạm 4+7 lần ở clin/spec, chưa quét xuyên found/oper/fin. Rò rỉ IsDeleted là lỗ hổng vừa data-integrity vừa privacy.",
    "refIssues": [
     "#226",
     "#281",
     "#234"
    ],
    "evidence": [
     {
      "name": "TC-GAP-002__s01__list",
      "caption": "Danh mục đã xóa mềm không còn trong dropdown tạo mới",
      "uiState": "list"
     },
     {
      "name": "TC-GAP-002__s04__error",
      "caption": "GET by-id bản ghi đã xóa mềm trả 404, không lộ dữ liệu",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-GAP-003",
    "title": "Footgun envelope-unwrap FE — regression mọi api client KHÔNG check response.success sau apiClient",
    "category": "integration",
    "priority": "P0",
    "role": "Tester FE (mọi vai trò qua đăng nhập)",
    "preconditions": "FE v2 chạy; interceptor client.ts tự unwrap {success,data}; có ≥1 endpoint trả mảng, ≥1 trả paged, ≥1 trả object đơn, login.",
    "steps": [
     "Rà toàn bộ frontend/src/api/*.ts: tìm mọi nơi còn đọc response.success / response.data SAU khi gọi apiClient (sai vì đã auto-unwrap) → liệt kê file vi phạm.",
     "Đăng nhập admin/Admin@123 → xác nhận AuthContext xử lý tolerant cả 2 shape {data:{token}} và {token} (regression commit 92d35a2 đã từng hỏng login prod).",
     "Gọi 1 endpoint trả mảng trực tiếp và 1 endpoint trả {items,total} → caller nhận đúng payload đã-unwrap, không bị undefined.",
     "Mô phỏng BE trả lỗi (success=false) → FE bắt đúng nhánh lỗi, không crash trắng màn."
    ],
    "expected": "Không api client nào còn check .success/.data sai sau apiClient; login tolerant 2 shape; mọi endpoint (array/paged/object) đọc đúng; lỗi BE hiển thị graceful. Đây là regression-test cho footgun từng làm sập login production.",
    "notes": "CLAUDE.md ghi rõ đây là mismatch từng làm hỏng login prod; data hiện chỉ nhắc 1 lần. Cần test contract FE↔BE chuyên dụng.",
    "refIssues": [
     "#226",
     "#274",
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-GAP-003__s02__success",
      "caption": "Login tolerant 2 shape — đăng nhập thành công sau unwrap",
      "uiState": "success"
     },
     {
      "name": "TC-GAP-003__s04__error",
      "caption": "BE success=false — FE bắt lỗi graceful, không trắng màn",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-GAP-004",
    "title": "Hết hạn token/phiên GIỮA luồng dài — không mất dữ liệu, re-login mượt, không lưu nhầm danh tính",
    "category": "permission",
    "priority": "P1",
    "role": "Bác sĩ (form bệnh án dài) + Thu ngân",
    "preconditions": "JWT có TTL; đang mở form dài chưa lưu (bệnh án/đơn thuốc nhiều dòng); có thể giả lập token hết hạn (xóa/đặt token cũ trong localStorage).",
    "steps": [
     "Mở form bệnh án dài, nhập nhiều dữ liệu, để token hết hạn (giả lập) RỒI bấm Lưu → FE nhận 401, KHÔNG mất dữ liệu đang nhập, điều hướng re-login hoặc refresh token rồi lưu lại.",
     "Sau khi token hết hạn, mọi request nền (polling/SignalR) → không spam lỗi đỏ liên tục, xử lý 401 một lần và đăng xuất sạch.",
     "Đăng nhập lại bằng tài khoản KHÁC khi form cũ còn mở → bản ghi lưu phải mang CreatedBy của user MỚI thật sự, không dính danh tính user cũ.",
     "Token bị sửa/giả mạo → BE từ chối 401, không xử lý."
    ],
    "expected": "Phiên hết hạn giữa chừng không gây mất dữ liệu người dùng đang nhập, không spam lỗi, re-login mượt; danh tính CreatedBy luôn khớp user thật đang đăng nhập (≠ user cũ, ≠ Guid.Empty); token giả bị từ chối.",
    "notes": "Các lần '401' trong data phần lớn là match phụ; chưa có task chuyên về token-expiry-mid-flow và rủi ro nhầm CreatedBy khi đổi user.",
    "refIssues": [
     "#219",
     "#216",
     "#282"
    ],
    "evidence": [
     {
      "name": "TC-GAP-004__s01__error",
      "caption": "Token hết hạn khi Lưu — 401 nhưng dữ liệu đang nhập được giữ",
      "uiState": "error"
     },
     {
      "name": "TC-GAP-004__s03__permission",
      "caption": "Đổi user — bản ghi mang CreatedBy user mới đúng",
      "uiState": "permission"
     }
    ]
   },
   {
    "id": "TC-GAP-005",
    "title": "Idempotency callback ngoài — IPN thanh toán / HL7 LIS / cổng QG lặp & lệch thứ tự không nhân đôi hậu quả",
    "category": "integration",
    "priority": "P0",
    "role": "Hệ thống (mô phỏng cổng ngoài) + Thu ngân + KTV CLS",
    "preconditions": "Có endpoint nhận IPN payment, inbox HL7 LIS, callback cổng QG (mock mode); 1 giao dịch chờ thanh toán; 1 chỉ định CLS chờ kết quả.",
    "steps": [
     "Gửi IPN thanh toán THÀNH CÔNG 2 lần cùng transaction → phiếu thu chỉ chuyển 'Đã thu' MỘT lần, không cộng đôi tiền, không tạo 2 biên lai.",
     "Gửi IPN đến SAU khi đã xác nhận thủ công (out-of-order) → trạng thái không bị lật ngược/đảo loạn.",
     "Gửi cùng 1 message HL7 kết quả XN 2 lần → kết quả đổ vào bệnh án 1 lần, không nhân đôi dòng kết quả.",
     "Gửi callback cổng QG (đơn thuốc/BHXH) lặp → trạng thái Submitted/Acknowledged không nhảy loạn, không gửi lại trùng.",
     "Callback với chữ ký/sai checksum → bị từ chối, ghi log, không thay đổi dữ liệu."
    ],
    "expected": "Mọi callback ngoài lặp lại hoặc lệch thứ tự đều idempotent: tiền không cộng đôi, kết quả không nhân đôi, trạng thái không đảo loạn; callback sai chữ ký bị từ chối + log. Đây là điểm thất thoát tiền/dữ liệu kinh điển.",
    "notes": "Per-module có test happy IPN/HL7 nhưng thiếu chiều DUPLICATE/OUT-OF-ORDER/idempotency-key xuyên các cổng. Liên quan T26 reconciliation.",
    "refIssues": [
     "#265",
     "#281",
     "#226"
    ],
    "evidence": [
     {
      "name": "TC-GAP-005__s01__success",
      "caption": "IPN gửi 2 lần — phiếu thu chỉ 'Đã thu' một lần, không cộng đôi",
      "uiState": "success"
     },
     {
      "name": "TC-GAP-005__s05__error",
      "caption": "Callback sai chữ ký bị từ chối + ghi log",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-GAP-006",
    "title": "Đối soát tiền & làm tròn — biên giá trị âm/0/miễn phí, đồng giá BHYT, hoàn tiền không vượt đã thu",
    "category": "edge",
    "priority": "P0",
    "role": "Thu ngân + Giám định BHYT",
    "preconditions": "Có dịch vụ giá lẻ (gây làm tròn), BN có mức hưởng BHYT theo % + trần đồng chi trả, 1 phiếu thu đã thu để test hoàn.",
    "steps": [
     "Tính chi phí dịch vụ có số lẻ (vd 33.333đ) áp BHYT % → kiểm tra QUY TẮC làm tròn nhất quán giữa billing/insurance/retail (không lệch 1đ tích lũy gây thất thoát).",
     "BN miễn phí / dịch vụ 0đ / giảm 100% → phiếu thu hợp lệ, không tạo giao dịch âm, không chia 0.",
     "Áp trần đồng chi trả 6 tháng lương cơ sở → phần vượt trần về 0, không âm.",
     "Hoàn tiền > số đã thực thu → bị chặn; hoàn từng phần nhiều lần → tổng hoàn ≤ đã thu, tồn kho thuốc khôi phục đúng số.",
     "Đối soát cuối ngày: tổng thu = Σ phiếu thu − Σ hoàn, khớp dashboard doanh thu (không lệch do làm tròn/đếm bản ghi xóa mềm)."
    ],
    "expected": "Quy tắc làm tròn thống nhất toàn hệ tài chính; case 0/âm/miễn phí/đồng giá xử lý an toàn; hoàn tiền không vượt đã thu; đối soát cuối ngày khớp tuyệt đối. Tiền không thất thoát/sinh ra do biên & làm tròn.",
    "notes": "Money có nhiều match nhưng phần lớn substring; thiếu task ĐỐI SOÁT làm tròn xuyên billing↔insurance↔retail↔refund. Trùng tinh thần T26 nhưng ở mức nghiệp vụ FE.",
    "refIssues": [
     "#234",
     "#281",
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-GAP-006__s02__validation",
      "caption": "Hoàn tiền vượt số đã thu bị chặn validation",
      "uiState": "validation"
     },
     {
      "name": "TC-GAP-006__s05__detail",
      "caption": "Đối soát cuối ngày khớp dashboard, không lệch làm tròn",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-GAP-007",
    "title": "Biên ngày/giờ & múi giờ — cắt 'hôm nay', qua nửa đêm tính ngày nằm viện, định dạng ngày XML BHXH",
    "category": "edge",
    "priority": "P1",
    "role": "BGĐ/KHTH (báo cáo) + Điều dưỡng (nội trú) + Giám định BHYT",
    "preconditions": "Server và client có thể lệch múi giờ; có lượt nhập viện qua nửa đêm; có dữ liệu cho báo cáo theo 'hôm nay'.",
    "steps": [
     "Tạo giao dịch lúc 23:59 và 00:01 → báo cáo lọc 'hôm nay'/khoảng ngày cắt đúng mốc, không lẫn sang ngày khác do UTC vs giờ VN.",
     "BN nhập viện 22:00 ngày 1, xuất 08:00 ngày 3 → số ngày nằm viện tính đúng theo quy tắc bệnh viện (không lệch ±1 do múi giờ).",
     "Xuất XML BHXH → trường ngày/giờ đúng định dạng yêu cầu, không lệch ngày do timezone.",
     "Lọc dashboard theo tháng/quý ở ranh giới đầu/cuối kỳ → không sót/đếm trùng bản ghi ở mốc 00:00."
    ],
    "expected": "Mọi mốc thời gian (cắt ngày báo cáo, ngày nằm viện qua đêm, định dạng ngày XML BHXH, ranh giới kỳ) nhất quán theo giờ VN, không lệch ngày do UTC; số ngày viện phí/BHYT chính xác.",
    "notes": "Timezone chỉ chạm 8+6 lần lẻ tẻ; chưa có task biên-ngày-giờ hệ thống — đây là nguồn lệch tiền viện phí và sai lệch báo cáo phổ biến.",
    "refIssues": [
     "#225",
     "#256",
     "#287"
    ],
    "evidence": [
     {
      "name": "TC-GAP-007__s01__detail",
      "caption": "Giao dịch 23:59 vs 00:01 — báo cáo 'hôm nay' cắt đúng mốc giờ VN",
      "uiState": "detail"
     },
     {
      "name": "TC-GAP-007__s02__detail",
      "caption": "Nhập viện qua nửa đêm — số ngày nằm viện đúng",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-GAP-008",
    "title": "Patient-safety guard — case biên đọc trực tiếp từ PrescriptionSafetyGuard.cs (đối xứng, KB rỗng, override-audit)",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ (kê đơn ngoại trú & nội trú)",
    "preconditions": "Đã seed DrugInteractions severe (script 138) + ≥1 Allergy active của BN; có thuốc khớp AllergenCode và thuốc khớp theo ActiveIngredient.",
    "steps": [
     "Kê đơn 1 thuốc trùng dị ứng theo AllergenCode (exact) → chặn; kê thuốc khớp theo AllergenName trong ActiveIngredient (substring) → cũng chặn (verify cả 2 nhánh match của guard).",
     "Dị ứng Severity=1 → KHÔNG chặn; Severity=2 và 3 → chặn (đúng ngưỡng >=2).",
     "Tương tác: đơn chỉ có 1 trong 2 thuốc của cặp → KHÔNG chặn; đủ CẢ hai thuốc của cặp đối xứng → chặn (verify yêu cầu both medicineIds).",
     "DrugInteractions KB rỗng (chưa seed) → không chặn tương tác (đúng thiết kế), tài liệu hóa rủi ro này.",
     "Nhập OverrideReason → cho lưu, NHƯNG kiểm tra reason được ghi vào Instructions/audit (caller chịu trách nhiệm) → truy được ai bỏ qua, lý do gì.",
     "Lặp lại TOÀN BỘ ở luồng NỘI TRÚ (InpatientCompleteService) để chắc dùng chung guard, không bỏ sót 1 luồng."
    ],
    "expected": "Guard chặn đúng ngưỡng (dị ứng>=2, tương tác>=3), khớp cả AllergenCode lẫn ActiveIngredient-substring, cặp tương tác cần CẢ hai thuốc, KB rỗng không chặn; OverrideReason cho qua nhưng BẮT BUỘC audit lý do; đồng nhất outpatient & inpatient.",
    "notes": "Đọc trực tiếp PrescriptionSafetyGuard.cs — các case biên (đối xứng/substring/KB-rỗng/audit-override) là điểm dễ lọt mà per-flow chỉ test mức 'chặn/không chặn' chung. An toàn người bệnh = P0.",
    "refIssues": [
     "#241",
     "#220",
     "#225"
    ],
    "evidence": [
     {
      "name": "TC-GAP-008__s01__error",
      "caption": "Chặn kê đơn khớp dị ứng theo ActiveIngredient (substring)",
      "uiState": "error"
     },
     {
      "name": "TC-GAP-008__s05__confirm",
      "caption": "Nhập OverrideReason cho qua — lý do ghi vào audit truy được",
      "uiState": "confirm"
     },
     {
      "name": "TC-GAP-008__s06__error",
      "caption": "Lặp lại guard ở luồng nội trú — chặn đồng nhất",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-GAP-009",
    "title": "Toàn vẹn Audit-log xuyên hệ — mọi mutation nhạy cảm log đúng CreatedBy thật (≠ Guid.Empty), không sửa/xóa được log",
    "category": "security",
    "priority": "P1",
    "role": "Admin (xem audit) + nhiều vai trò thực hiện thao tác",
    "preconditions": "Audit log bật; thực hiện sẵn loạt thao tác nhạy cảm: tạo/sửa/xóa BN, kê đơn, thu tiền, hoàn tiền, đổi quyền, ký số.",
    "steps": [
     "Thực hiện 1 thao tác nhạy cảm ở mỗi nhóm (lâm sàng/tài chính/quản trị/ký số) → kiểm tra audit ghi đủ: ai (CreatedBy thật, KHÔNG Guid.Empty), hành động, đối tượng, thời gian, IP.",
     "Thao tác qua các đường khác nhau (UI v2, API trực tiếp) → đều sinh audit, không có đường 'lách' không log.",
     "Thử sửa/xóa bản ghi audit qua API → bị từ chối (audit immutable).",
     "Hành động thất bại (bị guard chặn, 400/403) → có ghi vết phù hợp để điều tra.",
     "Đối chiếu: số mutation thành công ≈ số dòng audit tương ứng (không thiếu hụt log)."
    ],
    "expected": "Mọi thao tác nhạy cảm xuyên phân hệ đều để lại audit đầy đủ, CreatedBy là user thật khác Guid.Empty, không đường nào bỏ qua log, audit không sửa/xóa được; có đối soát số lượng. Đáp ứng yêu cầu compliance + điều tra sự cố.",
    "notes": "Audit được nhắc nhiều trong per-module nhưng như thuộc tính phụ; thiếu task XÁC MINH tính toàn vẹn audit như một assertion cross-cutting (T27).",
    "refIssues": [
     "#282",
     "#260",
     "#258"
    ],
    "evidence": [
     {
      "name": "TC-GAP-009__s01__detail",
      "caption": "Audit ghi đủ CreatedBy thật (≠ Guid.Empty) cho thao tác nhạy cảm",
      "uiState": "detail"
     },
     {
      "name": "TC-GAP-009__s03__error",
      "caption": "API sửa/xóa audit bị từ chối — log immutable",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-GAP-010",
    "title": "Dữ liệu bẩn & tiếng Việt — nhập tên dấu đầy đủ/họ dài/ký tự đặc biệt/emoji/khoảng trắng thừa qua mọi tầng",
    "category": "edge",
    "priority": "P2",
    "role": "Thư ký y khoa + Tiếp đón",
    "preconditions": "Form tạo BN/người dùng/danh mục; có dữ liệu legacy import dấu tiếng Việt lẫn lộn (NFC/NFD).",
    "steps": [
     "Nhập tên BN có dấu đầy đủ, tên ghép dài tối đa, ký tự đặc biệt (', -, .) → lưu, hiển thị list, in phiếu, xuất XML đều đúng dấu, không vỡ font/lỗi encoding.",
     "Nhập emoji / ký tự điều khiển / khoảng trắng đầu-cuối → hệ thống trim/lọc hợp lý, không crash, không lưu rác.",
     "Tìm kiếm không dấu ra kết quả có dấu (nếu hỗ trợ) và ngược lại — nhất quán.",
     "Import dữ liệu legacy có NFC vs NFD lẫn lộn → so trùng BN không bị nhân đôi do khác Unicode normalization.",
     "In phiếu/PDF tên dài + dấu → không tràn layout, font hiển thị đủ dấu tiếng Việt."
    ],
    "expected": "Dữ liệu tiếng Việt (mọi dấu, độ dài, ký tự đặc biệt, NFC/NFD) xuyên suốt nhập→lưu→list→in→XML không vỡ font/encoding, không nhân đôi do normalization; input bẩn bị làm sạch an toàn không crash.",
    "notes": "Per-module có T12 dirty-data nhóm nhưng chiều Unicode-normalization (NFC/NFD) khi so trùng BN và tràn layout phiếu in dài thường bị bỏ. Bổ trợ #287 i18n + T12.",
    "refIssues": [
     "#227",
     "#287",
     "#245"
    ],
    "evidence": [
     {
      "name": "TC-GAP-010__s01__form",
      "caption": "Tên dấu đầy đủ + ký tự đặc biệt lưu & hiển thị đúng",
      "uiState": "form"
     },
     {
      "name": "TC-GAP-010__s05__detail",
      "caption": "In phiếu PDF tên dài + dấu — không tràn layout, đủ dấu",
      "uiState": "detail"
     }
    ]
   }
  ],
  "candidate_issues": [
   {
    "title": "[TEST] Khảo sát hài lòng (Patient Satisfaction Survey)",
    "reason": "Phân hệ SVY (lớp Tài chính, gap:true trong evidence/data/13-fin.js) CHƯA có issue test riêng trên GitHub #216-289 — các nhóm Tài chính #232-238 không phủ luồng tạo phiếu khảo sát/gửi/thu thập/thống kê hài lòng. Đề xuất tạo issue test riêng (workflow + form + thống kê + empty-state), chờ user duyệt, KHÔNG tự tạo.",
    "suggestedLabels": [
     "test",
     "fin"
    ]
   },
   {
    "title": "[TEST] Chuyên khoa đặc thù (IVF/Sản/Pháp y/YHCT)",
    "reason": "Phân hệ SPC (lớp D, gap:true trong evidence/data/14-spec.js) CHƯA có issue test riêng #216-289 — mỗi chuyên khoa có nghiệp vụ + biểu mẫu + state-machine đặc thù (chu kỳ IVF, hồ sơ pháp y pháp lý-quan-trọng, đơn thang YHCT) không nằm trong nhóm Lâm sàng #239-245. Đề xuất tách issue test riêng, chờ user duyệt.",
    "suggestedLabels": [
     "test",
     "spec"
    ]
   },
   {
    "title": "[TEST] Cấp cứu thảm họa (MCI - Mass Casualty Incident)",
    "reason": "Phân hệ MCI (lớp D, gap:true) CHƯA có issue test riêng #216-289 — luồng triage hàng loạt, gán mã màu, điều phối nguồn lực khẩn cấp khác hẳn luồng cấp cứu thường; rủi ro cao khi quá tải. Đề xuất issue test riêng (triage + concurrency + performance khi đông), chờ user duyệt.",
    "suggestedLabels": [
     "test",
     "spec"
    ]
   },
   {
    "title": "[TEST] Đào tạo & NCKH (Training & Research)",
    "reason": "Phân hệ TRN (lớp D, gap:true) CHƯA có issue test riêng #216-289 — quản lý khóa đào tạo, đề tài NCKH, phê duyệt y đức, dữ liệu nghiên cứu ẩn danh; không thuộc nhóm nào trong #232-289. Đề xuất issue test riêng (workflow duyệt + permission + ẩn danh dữ liệu), chờ user duyệt.",
    "suggestedLabels": [
     "test",
     "spec"
    ]
   }
  ]
 }
]);
