window.TP.modules.push(...[
 {
  "id": "org",
  "code": "ORG",
  "layer": "found",
  "ic": "👤",
  "nm": "Tổ chức & Phân quyền",
  "gh": [
   "#260",
   "#261",
   "#216",
   "#230"
  ],
  "gap": false,
  "module_id": "org",
  "summary": "Phân hệ \"Tổ chức & Phân quyền\" (id=org, lớp NỀN TẢNG) quản lý người dùng, vai trò, quyền (RBAC) và cây tổ chức bệnh viện. Quan hệ lõi: Users ⟶ UserRoles ⟶ Roles ⟶ RolePermissions ⟶ Permissions; cây cơ cấu HospitalBranches ⟶ Departments ⟶ Rooms ⟶ Beds; kèm UserSessions (phiên đăng nhập), TwoFactorOtps (OTP 2 lớp), UserSettings (cấu hình người dùng) và AuditLog. UI v2 hiện thực chính ở SystemAdminV2 (/v2/admin) gồm 4 tab: Người dùng · Vai trò & quyền · Audit log · Cấu hình HT; phần cây tổ chức (chi nhánh/khoa/phòng/giường) nằm ở Master Data/catalog (/v2/master-data). Ràng buộc nghiệp vụ trọng yếu (NOTES.org): phân quyền theo Role/Permission và MỌI mutation phải có CreatedBy là user thật (≠ Guid.Empty).",
  "screens": [
   {
    "name": "Quản trị hệ thống - Tab Người dùng",
    "desc": "Danh sách người dùng (Users) với tìm kiếm, KPI tổng/đang hoạt động/bị khóa/2FA; tạo/sửa user, gán vai trò, gán khoa/chi nhánh, khóa/mở khóa, reset mật khẩu.",
    "route_guess": "/v2/admin (tab users)",
    "elements": [
     "KpiStrip (tổng user, active, locked, 2FA)",
     "TopTabs (Người dùng/Vai trò & quyền/Audit log/Cấu hình HT)",
     "SearchBox",
     "DataTable cột username/họ tên/email/khoa/vai trò/trạng thái",
     "Btn Thêm người dùng",
     "ActBtn Sửa/Khóa/Reset mật khẩu",
     "ModalShell form user (username, fullName, email, phoneNumber, employeeId, departmentId, branchId, roleIds, initialPassword, isActive)",
     "DrawerShell chi tiết user + phiên đăng nhập"
    ]
   },
   {
    "name": "Quản trị hệ thống - Tab Vai trò & quyền",
    "desc": "Danh sách Roles, số user theo vai trò, cờ isSystemRole; tạo/sửa vai trò và gán cây Permissions (RolePermissions).",
    "route_guess": "/v2/admin (tab roles)",
    "elements": [
     "DataTable cột mã/tên/mô tả/số user/hệ thống/trạng thái",
     "Btn Thêm vai trò",
     "ModalShell form role (code, name, description, isActive)",
     "Cây/checkbox Permissions để gán quyền",
     "StatusBadge isSystemRole"
    ]
   },
   {
    "name": "Quản trị hệ thống - Tab Audit log",
    "desc": "Nhật ký audit mọi mutation (CreatedBy, hành động, đối tượng, thời gian) theo khoảng ngày + từ khóa.",
    "route_guess": "/v2/admin (tab audit)",
    "elements": [
     "Bộ lọc khoảng ngày (fromDate/toDate)",
     "SearchBox keyword",
     "DataTable cột thời gian/người dùng/hành động/đối tượng/IP",
     "Empty/loading state"
    ]
   },
   {
    "name": "Quản trị hệ thống - Tab Cấu hình HT",
    "desc": "Danh sách SystemConfig (key-value) cấu hình toàn hệ thống; sửa giá trị qua modal.",
    "route_guess": "/v2/admin (tab config)",
    "elements": [
     "DataTable cột key/value/mô tả",
     "ModalShell sửa config",
     "Btn Lưu"
    ]
   },
   {
    "name": "Đăng nhập",
    "desc": "Form đăng nhập sinh UserSession + JWT; hỗ trợ 2FA (TwoFactorOtps) khi user bật 2 lớp.",
    "route_guess": "/login",
    "elements": [
     "Input username",
     "Input password",
     "Btn Đăng nhập",
     "Bước nhập OTP 2FA (nếu bật)",
     "Thông báo lỗi sai mật khẩu/khóa tài khoản"
    ]
   },
   {
    "name": "Cây tổ chức (Chi nhánh/Khoa/Phòng/Giường)",
    "desc": "Quản lý cây cơ cấu HospitalBranches ⟶ Departments ⟶ Rooms ⟶ Beds trong Master Data/catalog.",
    "route_guess": "/v2/master-data",
    "elements": [
     "Cây/treeselect chi nhánh-khoa-phòng-giường",
     "DataTable từng cấp",
     "ModalShell thêm/sửa khoa/phòng/giường",
     "Switch trạng thái hoạt động"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-ORG-001",
    "title": "Tạo người dùng mới đầy đủ thông tin (happy path)",
    "category": "happy",
    "priority": "P0",
    "role": "Quản trị viên",
    "preconditions": "Đăng nhập admin/Admin@123; đang ở /v2/admin tab Người dùng; tồn tại ít nhất 1 khoa và 1 vai trò.",
    "steps": [
     "Mở /v2/admin, chọn tab Người dùng",
     "Bấm Thêm người dùng",
     "Nhập username, họ tên, email hợp lệ, SĐT, mã NV",
     "Chọn khoa, chi nhánh và ít nhất 1 vai trò",
     "Nhập mật khẩu khởi tạo hợp lệ, bật isActive",
     "Bấm Lưu"
    ],
    "expected": "Tạo thành công, toast báo OK, user xuất hiện đầu/đúng vị trí danh sách với vai trò đã gán; KPI tổng user +1; audit log ghi 1 dòng tạo user với CreatedBy là admin (≠ Guid.Empty).",
    "evidence": [
     {
      "name": "TC-ORG-001__s01__form",
      "caption": "Modal form tạo user đã điền đầy đủ",
      "uiState": "form"
     },
     {
      "name": "TC-ORG-001__s02__success",
      "caption": "User mới hiển thị trong danh sách",
      "uiState": "success"
     },
     {
      "name": "TC-ORG-001__s03__toast",
      "caption": "Toast tạo thành công",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#260",
     "#216"
    ],
    "notes": "Kiểm CreatedBy theo NOTES.org (mutation phải có user thật)."
   },
   {
    "id": "TC-ORG-002",
    "title": "Tạo user thiếu trường bắt buộc bị chặn + lỗi inline đúng field",
    "category": "validation",
    "priority": "P0",
    "role": "Quản trị viên",
    "preconditions": "Đang ở modal tạo user.",
    "steps": [
     "Mở modal Thêm người dùng",
     "Để trống username, họ tên và vai trò",
     "Bấm Lưu"
    ],
    "expected": "Form không submit, hiển thị lỗi inline đỏ ngay dưới từng field bắt buộc (username/họ tên/vai trò), scrollToFirstError đưa về field lỗi đầu tiên; không gọi API tạo.",
    "evidence": [
     {
      "name": "TC-ORG-002__s01__validation",
      "caption": "Lỗi bắt buộc inline trên các field trống",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#260",
     "#216"
    ],
    "notes": "roleIds bắt buộc tối thiểu 1 phần tử."
   },
   {
    "id": "TC-ORG-003",
    "title": "Tạo user với email/SĐT sai định dạng bị chặn",
    "category": "validation",
    "priority": "P1",
    "role": "Quản trị viên",
    "preconditions": "Đang ở modal tạo user.",
    "steps": [
     "Nhập email 'abc@' (thiếu domain) và SĐT 'abcxyz'",
     "Điền đủ các field còn lại",
     "Bấm Lưu"
    ],
    "expected": "Báo lỗi định dạng email và SĐT tại đúng field; không tạo user cho đến khi sửa đúng.",
    "evidence": [
     {
      "name": "TC-ORG-003__s01__validation",
      "caption": "Lỗi định dạng email và SĐT",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#260"
    ]
   },
   {
    "id": "TC-ORG-004",
    "title": "Tạo user trùng username bị từ chối",
    "category": "negative",
    "priority": "P0",
    "role": "Quản trị viên",
    "preconditions": "Đã tồn tại user 'admin'.",
    "steps": [
     "Mở Thêm người dùng",
     "Nhập username='admin' và các field hợp lệ",
     "Bấm Lưu"
    ],
    "expected": "Server trả lỗi trùng username, hiển thị message rõ ràng (không phải lỗi 500 chung), user không bị nhân đôi trong danh sách.",
    "evidence": [
     {
      "name": "TC-ORG-004__s01__error",
      "caption": "Lỗi trùng username từ server",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#260"
    ]
   },
   {
    "id": "TC-ORG-005",
    "title": "Mật khẩu khởi tạo yếu/không đạt policy bị chặn (boundary)",
    "category": "edge",
    "priority": "P1",
    "role": "Quản trị viên",
    "preconditions": "Đang ở modal tạo user.",
    "steps": [
     "Nhập initialPassword='123' (quá ngắn, không đủ độ phức tạp)",
     "Điền đủ field còn lại",
     "Bấm Lưu",
     "Thử lại với mật khẩu rất dài >256 ký tự"
    ],
    "expected": "Báo lỗi mật khẩu không đạt policy độ dài/độ phức tạp; chuỗi rất dài bị cắt/từ chối có thông báo, không gây vỡ UI.",
    "evidence": [
     {
      "name": "TC-ORG-005__s01__validation",
      "caption": "Lỗi mật khẩu yếu",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#260"
    ]
   },
   {
    "id": "TC-ORG-006",
    "title": "Họ tên tiếng Việt có dấu + ký tự đặc biệt hiển thị đúng",
    "category": "edge",
    "priority": "P2",
    "role": "Quản trị viên",
    "preconditions": "Đang ở modal tạo user.",
    "steps": [
     "Nhập họ tên 'Nguyễn Thị Hồng Ánh — Đặng <test>'",
     "Lưu user",
     "Mở lại chi tiết user vừa tạo và xem trong DataTable"
    ],
    "expected": "Họ tên tiếng Việt có dấu hiển thị nguyên vẹn không lỗi font/encoding; ký tự < > không bị thực thi như HTML (chống XSS), hiển thị dạng văn bản thuần.",
    "evidence": [
     {
      "name": "TC-ORG-006__s01__detail",
      "caption": "Họ tên có dấu + ký tự đặc biệt hiển thị đúng",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#260",
     "#230"
    ],
    "notes": "Liên quan kiểm XSS field ghi chú/tên (security)."
   },
   {
    "id": "TC-ORG-007",
    "title": "Sửa thông tin user và đổi vai trò (happy path)",
    "category": "happy",
    "priority": "P0",
    "role": "Quản trị viên",
    "preconditions": "Tồn tại 1 user thường (không phải admin).",
    "steps": [
     "Chọn user, bấm Sửa",
     "Đổi họ tên, thay khoa, gỡ 1 vai trò và thêm vai trò khác",
     "Bấm Lưu"
    ],
    "expected": "Cập nhật thành công, danh sách phản ánh vai trò/khoa mới; audit log ghi hành động cập nhật với CreatedBy/UpdatedBy là admin.",
    "evidence": [
     {
      "name": "TC-ORG-007__s01__form",
      "caption": "Form sửa user đổi vai trò",
      "uiState": "form"
     },
     {
      "name": "TC-ORG-007__s02__success",
      "caption": "Danh sách cập nhật vai trò mới",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#260",
     "#216"
    ]
   },
   {
    "id": "TC-ORG-008",
    "title": "Hủy giữa chừng khi đang sửa user không lưu thay đổi",
    "category": "negative",
    "priority": "P2",
    "role": "Quản trị viên",
    "preconditions": "Đang mở modal sửa 1 user.",
    "steps": [
     "Đổi họ tên và vai trò trong form",
     "Bấm Hủy/đóng modal (X) không lưu",
     "Mở lại user đó"
    ],
    "expected": "Thay đổi không được lưu, dữ liệu giữ nguyên như trước khi sửa; không gọi API update.",
    "evidence": [
     {
      "name": "TC-ORG-008__s01__confirm",
      "caption": "Đóng modal không lưu",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#260"
    ]
   },
   {
    "id": "TC-ORG-009",
    "title": "Khóa và mở khóa tài khoản người dùng (state)",
    "category": "state",
    "priority": "P0",
    "role": "Quản trị viên",
    "preconditions": "Tồn tại 1 user đang active.",
    "steps": [
     "Chọn user active, bấm Khóa",
     "Xác nhận khóa",
     "Đăng xuất và thử đăng nhập bằng user vừa khóa",
     "Quay lại admin, mở khóa user đó"
    ],
    "expected": "User chuyển trạng thái Locked, badge cập nhật, KPI bị khóa +1; user bị khóa KHÔNG đăng nhập được (thông báo tài khoản bị khóa); sau mở khóa thì đăng nhập lại được.",
    "evidence": [
     {
      "name": "TC-ORG-009__s01__confirm",
      "caption": "Xác nhận khóa user",
      "uiState": "confirm"
     },
     {
      "name": "TC-ORG-009__s02__success",
      "caption": "User chuyển trạng thái Locked",
      "uiState": "success"
     },
     {
      "name": "TC-ORG-009__s03__error",
      "caption": "User bị khóa không đăng nhập được",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#260",
     "#216"
    ]
   },
   {
    "id": "TC-ORG-010",
    "title": "Vô hiệu hóa (isActive=false) user và kiểm chặn đăng nhập",
    "category": "state",
    "priority": "P1",
    "role": "Quản trị viên",
    "preconditions": "Tồn tại 1 user active.",
    "steps": [
     "Sửa user, tắt isActive, Lưu",
     "Thử đăng nhập bằng user đó"
    ],
    "expected": "User hiển thị trạng thái không hoạt động; không thể đăng nhập; có thông báo phù hợp.",
    "evidence": [
     {
      "name": "TC-ORG-010__s01__success",
      "caption": "User chuyển sang không hoạt động",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#260"
    ]
   },
   {
    "id": "TC-ORG-011",
    "title": "Reset mật khẩu user và đăng nhập bằng mật khẩu mới (data-consistency)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Quản trị viên",
    "preconditions": "Tồn tại 1 user thường.",
    "steps": [
     "Chọn user, bấm Reset mật khẩu",
     "Nhập mật khẩu mới hợp lệ, xác nhận",
     "Đăng xuất, đăng nhập user đó bằng mật khẩu mới"
    ],
    "expected": "Reset thành công; đăng nhập bằng mật khẩu mới OK, mật khẩu cũ không còn dùng được; audit log ghi hành động reset.",
    "evidence": [
     {
      "name": "TC-ORG-011__s01__modal",
      "caption": "Modal reset mật khẩu",
      "uiState": "modal"
     },
     {
      "name": "TC-ORG-011__s02__success",
      "caption": "Đăng nhập bằng mật khẩu mới thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#260"
    ]
   },
   {
    "id": "TC-ORG-012",
    "title": "Bật 2FA cho user và xác thực OTP khi đăng nhập (integration)",
    "category": "integration",
    "priority": "P1",
    "role": "Quản trị viên / Người dùng",
    "preconditions": "Tồn tại user hỗ trợ isTwoFactorEnabled; cấu hình gửi OTP (TwoFactorOtps) hoạt động.",
    "steps": [
     "Bật 2FA cho 1 user",
     "Đăng xuất, đăng nhập bằng user đó",
     "Nhập đúng mã OTP nhận được"
    ],
    "expected": "Sau bước mật khẩu yêu cầu nhập OTP; nhập đúng OTP thì đăng nhập thành công; nhập sai/hết hạn OTP bị từ chối.",
    "evidence": [
     {
      "name": "TC-ORG-012__s01__form",
      "caption": "Màn nhập OTP 2FA",
      "uiState": "form"
     },
     {
      "name": "TC-ORG-012__s02__error",
      "caption": "OTP sai bị từ chối",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#260",
     "#216"
    ]
   },
   {
    "id": "TC-ORG-013",
    "title": "Xem phiên đăng nhập đang hoạt động và buộc đăng xuất (state)",
    "category": "state",
    "priority": "P1",
    "role": "Quản trị viên",
    "preconditions": "Có ít nhất 1 UserSession đang active (đăng nhập ở tab khác).",
    "steps": [
     "Mở chi tiết user / danh sách phiên đang hoạt động",
     "Bấm buộc đăng xuất 1 phiên",
     "Tại phiên bị thu hồi, thử gọi API/refresh trang"
    ],
    "expected": "Phiên hiển thị đúng (thiết bị/IP/thời gian); sau buộc đăng xuất, phiên đó bị thu hồi token và bị đẩy về login.",
    "evidence": [
     {
      "name": "TC-ORG-013__s01__drawer",
      "caption": "Drawer danh sách phiên đăng nhập",
      "uiState": "drawer"
     },
     {
      "name": "TC-ORG-013__s02__success",
      "caption": "Phiên bị thu hồi",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#260"
    ]
   },
   {
    "id": "TC-ORG-014",
    "title": "Tìm kiếm/lọc người dùng theo từ khóa",
    "category": "happy",
    "priority": "P2",
    "role": "Quản trị viên",
    "preconditions": "Danh sách có nhiều user.",
    "steps": [
     "Nhập từ khóa vào SearchBox (username/họ tên)",
     "Quan sát danh sách lọc",
     "Xóa từ khóa"
    ],
    "expected": "Danh sách lọc đúng theo từ khóa (kể cả tiếng Việt có dấu); xóa từ khóa trả về đầy đủ; không lỗi khi không có kết quả (hiển thị empty state).",
    "evidence": [
     {
      "name": "TC-ORG-014__s01__filter",
      "caption": "Kết quả lọc theo từ khóa",
      "uiState": "filter"
     },
     {
      "name": "TC-ORG-014__s02__empty",
      "caption": "Empty khi không khớp",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#260"
    ]
   },
   {
    "id": "TC-ORG-015",
    "title": "Tạo vai trò mới và gán quyền (happy path)",
    "category": "happy",
    "priority": "P0",
    "role": "Quản trị viên",
    "preconditions": "Đang ở tab Vai trò & quyền; tồn tại cây Permissions.",
    "steps": [
     "Bấm Thêm vai trò",
     "Nhập mã (code), tên, mô tả",
     "Tick chọn các quyền (Permissions) cần gán",
     "Bấm Lưu"
    ],
    "expected": "Tạo vai trò thành công, hiển thị trong danh sách; mở lại vai trò thấy đúng các quyền đã gán (RolePermissions lưu đúng).",
    "evidence": [
     {
      "name": "TC-ORG-015__s01__form",
      "caption": "Form tạo vai trò + cây quyền",
      "uiState": "form"
     },
     {
      "name": "TC-ORG-015__s02__success",
      "caption": "Vai trò mới trong danh sách",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#261",
     "#216"
    ]
   },
   {
    "id": "TC-ORG-016",
    "title": "Tạo vai trò trùng mã (code) bị chặn",
    "category": "negative",
    "priority": "P1",
    "role": "Quản trị viên",
    "preconditions": "Đã tồn tại 1 vai trò có code xác định.",
    "steps": [
     "Thêm vai trò mới với code trùng vai trò đã có",
     "Bấm Lưu"
    ],
    "expected": "Server từ chối với lỗi trùng code rõ ràng; không tạo bản ghi trùng.",
    "evidence": [
     {
      "name": "TC-ORG-016__s01__error",
      "caption": "Lỗi trùng mã vai trò",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#261"
    ]
   },
   {
    "id": "TC-ORG-017",
    "title": "Không cho sửa/xóa vai trò hệ thống (isSystemRole)",
    "category": "state",
    "priority": "P0",
    "role": "Quản trị viên",
    "preconditions": "Tồn tại vai trò isSystemRole=true (vd Quản trị viên).",
    "steps": [
     "Chọn vai trò hệ thống",
     "Thử bấm Xóa và thử đổi mã code"
    ],
    "expected": "Nút Xóa bị vô hiệu hoặc thao tác bị chặn với thông báo 'vai trò hệ thống không được xóa/sửa mã'; vai trò hệ thống vẫn nguyên vẹn.",
    "evidence": [
     {
      "name": "TC-ORG-017__s01__permission",
      "caption": "Chặn xóa vai trò hệ thống",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#261",
     "#216"
    ]
   },
   {
    "id": "TC-ORG-018",
    "title": "Xóa vai trò đang được user sử dụng bị chặn (data-consistency)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản trị viên",
    "preconditions": "Tồn tại vai trò có userCount > 0.",
    "steps": [
     "Chọn vai trò đang gán cho ít nhất 1 user",
     "Bấm Xóa, xác nhận"
    ],
    "expected": "Hệ thống chặn xóa hoặc cảnh báo vai trò đang được dùng (userCount>0); không để user mất vai trò ngầm; gợi ý gỡ gán trước.",
    "evidence": [
     {
      "name": "TC-ORG-018__s01__confirm",
      "caption": "Cảnh báo vai trò đang được dùng",
      "uiState": "confirm"
     },
     {
      "name": "TC-ORG-018__s02__error",
      "caption": "Chặn xóa vai trò có user",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#261"
    ]
   },
   {
    "id": "TC-ORG-019",
    "title": "Thay đổi quyền của vai trò phản ánh ngay vào user thuộc vai trò (data-consistency)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Quản trị viên",
    "preconditions": "User A thuộc vai trò R; R chưa có quyền truy cập màn X.",
    "steps": [
     "Sửa vai trò R, thêm quyền truy cập màn X, Lưu",
     "Đăng nhập bằng user A",
     "Kiểm tra menu/nút màn X"
    ],
    "expected": "User A thấy được màn/nút X sau khi vai trò được cấp quyền; gỡ quyền thì user A mất truy cập tương ứng (RolePermissions → Permissions hiệu lực đúng).",
    "evidence": [
     {
      "name": "TC-ORG-019__s01__success",
      "caption": "User thấy màn mới sau khi vai trò được cấp quyền",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#261",
     "#216"
    ]
   },
   {
    "id": "TC-ORG-020",
    "title": "Người dùng thiếu quyền bị chặn menu/nút và API (permission/IDOR)",
    "category": "permission",
    "priority": "P0",
    "role": "Người dùng thường (không phải admin)",
    "preconditions": "User B không có quyền quản trị; có token của B.",
    "steps": [
     "Đăng nhập bằng user B không có quyền admin",
     "Kiểm tra menu Quản trị hệ thống có ẩn không",
     "Truy cập trực tiếp URL /v2/admin",
     "Gọi trực tiếp API GET/POST users bằng token của B (vd qua devtools)"
    ],
    "expected": "Menu Quản trị ẩn; truy cập /v2/admin bị chặn/redirect; API quản trị trả 401/403 với token thiếu quyền (không lộ dữ liệu user khác — chống IDOR).",
    "evidence": [
     {
      "name": "TC-ORG-020__s01__permission",
      "caption": "Menu admin ẩn với user thiếu quyền",
      "uiState": "permission"
     },
     {
      "name": "TC-ORG-020__s02__error",
      "caption": "API admin trả 403 với token thiếu quyền",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216",
     "#260"
    ],
    "notes": "Tham chiếu ma trận phân quyền #216."
   },
   {
    "id": "TC-ORG-021",
    "title": "Gọi API quản trị khi chưa đăng nhập (anonymous) bị từ chối (security)",
    "category": "security",
    "priority": "P0",
    "role": "Ẩn danh",
    "preconditions": "Không gửi header Authorization.",
    "steps": [
     "Gọi GET /api/admin/users (hoặc endpoint tương đương) không kèm Bearer token",
     "Gọi POST tạo user không token"
    ],
    "expected": "Trả 401 Unauthorized; không có endpoint quản trị nào truy cập ẩn danh được; không rò rỉ dữ liệu.",
    "evidence": [
     {
      "name": "TC-ORG-021__s01__error",
      "caption": "API quản trị trả 401 khi anonymous",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-ORG-022",
    "title": "Audit log ghi đúng mọi mutation với CreatedBy là user thật",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Quản trị viên",
    "preconditions": "Đang ở tab Audit log; vừa thực hiện 1-2 thao tác tạo/sửa/khóa user.",
    "steps": [
     "Thực hiện tạo 1 user rồi khóa user đó",
     "Vào tab Audit log, lọc theo hôm nay",
     "Mở chi tiết các dòng audit liên quan"
    ],
    "expected": "Mỗi mutation sinh đúng 1 dòng audit (tạo, khóa) với người thực hiện = admin (CreatedBy ≠ Guid.Empty), thời gian, đối tượng và hành động chính xác.",
    "evidence": [
     {
      "name": "TC-ORG-022__s01__list",
      "caption": "Audit log ghi các thao tác vừa làm",
      "uiState": "list"
     },
     {
      "name": "TC-ORG-022__s02__detail",
      "caption": "Chi tiết dòng audit với CreatedBy là admin",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#216",
     "#260"
    ],
    "notes": "Bám NOTES.org: mutation phải có user thật."
   },
   {
    "id": "TC-ORG-023",
    "title": "Lọc Audit log theo khoảng ngày + biên ngày (edge)",
    "category": "edge",
    "priority": "P2",
    "role": "Quản trị viên",
    "preconditions": "Đang ở tab Audit log.",
    "steps": [
     "Đặt fromDate > toDate (khoảng ngày đảo ngược)",
     "Đặt khoảng ngày tương lai",
     "Đặt khoảng ngày rất rộng (vd 1 năm)"
    ],
    "expected": "Khoảng ngày đảo ngược bị chặn/cảnh báo; khoảng tương lai trả rỗng (empty state) không lỗi; khoảng rộng có phân trang/giới hạn không treo UI.",
    "evidence": [
     {
      "name": "TC-ORG-023__s01__empty",
      "caption": "Empty khi khoảng ngày tương lai",
      "uiState": "empty"
     },
     {
      "name": "TC-ORG-023__s02__validation",
      "caption": "Cảnh báo khoảng ngày đảo ngược",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-ORG-024",
    "title": "Sửa cấu hình hệ thống (SystemConfig) và áp dụng đúng",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản trị viên",
    "preconditions": "Đang ở tab Cấu hình HT; tồn tại config có thể sửa an toàn.",
    "steps": [
     "Chọn 1 config, bấm Sửa",
     "Đổi value sang giá trị hợp lệ mới",
     "Bấm Lưu",
     "Reload và kiểm tra giá trị"
    ],
    "expected": "Lưu thành công, value mới hiển thị đúng sau reload; audit log ghi thay đổi config; chức năng phụ thuộc config nhận giá trị mới.",
    "evidence": [
     {
      "name": "TC-ORG-024__s01__modal",
      "caption": "Modal sửa cấu hình",
      "uiState": "modal"
     },
     {
      "name": "TC-ORG-024__s02__success",
      "caption": "Giá trị config cập nhật sau reload",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#260"
    ]
   },
   {
    "id": "TC-ORG-025",
    "title": "Tạo khoa/phòng/giường trong cây tổ chức (happy path)",
    "category": "happy",
    "priority": "P1",
    "role": "Quản trị viên",
    "preconditions": "Đang ở Master Data (/v2/master-data) phần cây tổ chức; tồn tại ít nhất 1 chi nhánh.",
    "steps": [
     "Chọn 1 chi nhánh, thêm 1 khoa mới",
     "Trong khoa vừa tạo, thêm 1 phòng",
     "Trong phòng, thêm 1 giường"
    ],
    "expected": "Khoa ⟶ Phòng ⟶ Giường tạo đúng phân cấp (Departments/Rooms/Beds); cây cập nhật ngay; các dropdown chọn khoa ở màn khác (vd form user) thấy khoa mới.",
    "evidence": [
     {
      "name": "TC-ORG-025__s01__form",
      "caption": "Form thêm khoa/phòng/giường",
      "uiState": "form"
     },
     {
      "name": "TC-ORG-025__s02__success",
      "caption": "Cây tổ chức cập nhật phân cấp mới",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-ORG-026",
    "title": "Vô hiệu hóa khoa đang có user/phòng giường bị ràng buộc (data-consistency)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản trị viên",
    "preconditions": "Tồn tại khoa đang được gán cho user và có phòng/giường con.",
    "steps": [
     "Chọn khoa đang được dùng",
     "Thử tắt hoạt động/xóa khoa"
    ],
    "expected": "Hệ thống cảnh báo/chặn khi khoa còn ràng buộc (user/phòng/giường); không để dữ liệu mồ côi; gợi ý xử lý ràng buộc trước.",
    "evidence": [
     {
      "name": "TC-ORG-026__s01__confirm",
      "caption": "Cảnh báo khoa còn ràng buộc",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-ORG-027",
    "title": "Cô lập dữ liệu đa chi nhánh (branchId) — user chỉ thấy phạm vi của mình (security)",
    "category": "security",
    "priority": "P1",
    "role": "Người dùng có giới hạn chi nhánh",
    "preconditions": "User C gán branchId=Chi nhánh 1; tồn tại dữ liệu thuộc Chi nhánh 2.",
    "steps": [
     "Đăng nhập bằng user C (chỉ thuộc Chi nhánh 1)",
     "Truy cập danh sách user/khoa",
     "Thử gọi API lọc theo branchId của Chi nhánh 2"
    ],
    "expected": "User C chỉ thấy dữ liệu trong phạm vi chi nhánh của mình; không truy cập được dữ liệu chi nhánh khác qua thao tác URL/API (chống IDOR theo chi nhánh).",
    "evidence": [
     {
      "name": "TC-ORG-027__s01__permission",
      "caption": "User chỉ thấy dữ liệu chi nhánh của mình",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-ORG-028",
    "title": "Trạng thái UI: loading/empty/error các tab quản trị",
    "category": "ui",
    "priority": "P2",
    "role": "Quản trị viên",
    "preconditions": "Đang ở /v2/admin.",
    "steps": [
     "Mở từng tab và quan sát lúc đang tải (loading)",
     "Mô phỏng API lỗi (chặn mạng) và quan sát error state",
     "Lọc/tìm kiếm ra 0 kết quả để xem empty state"
    ],
    "expected": "Mỗi tab có spinner/skeleton khi loading, thông báo lỗi thân thiện khi API fail (không trắng trang), empty state rõ ràng khi không có dữ liệu.",
    "evidence": [
     {
      "name": "TC-ORG-028__s01__loading",
      "caption": "Loading state",
      "uiState": "loading"
     },
     {
      "name": "TC-ORG-028__s02__error",
      "caption": "Error state khi API fail",
      "uiState": "error"
     },
     {
      "name": "TC-ORG-028__s03__empty",
      "caption": "Empty state",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#260",
     "#261"
    ]
   },
   {
    "id": "TC-ORG-029",
    "title": "Dark/Light parity màn quản trị + định dạng số/ngày",
    "category": "ui",
    "priority": "P2",
    "role": "Quản trị viên",
    "preconditions": "Đang ở /v2/admin; có toggle dark/light ở topbar.",
    "steps": [
     "Xem tab Người dùng và Audit log ở chế độ sáng",
     "Bật chế độ tối",
     "So sánh độ tương phản chữ/badge/bảng và cột thời gian/số user"
    ],
    "expected": "Giao diện đồng bộ ở cả 2 chế độ, không có chữ chìm/mất tương phản; thời gian định dạng nhất quán (vd DD/MM/YYYY HH:mm), số user căn phải đúng.",
    "evidence": [
     {
      "name": "TC-ORG-029__s01__list",
      "caption": "Tab Người dùng chế độ sáng",
      "uiState": "list"
     },
     {
      "name": "TC-ORG-029__s02__list",
      "caption": "Tab Người dùng chế độ tối",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#260"
    ]
   },
   {
    "id": "TC-ORG-030",
    "title": "Phân trang/khối lượng lớn danh sách user (boundary)",
    "category": "edge",
    "priority": "P2",
    "role": "Quản trị viên",
    "preconditions": "Có >100 user trong hệ thống (hoặc seed).",
    "steps": [
     "Mở tab Người dùng với nhiều bản ghi",
     "Cuộn/chuyển trang",
     "Tìm kiếm 1 user ở trang cuối"
    ],
    "expected": "Bảng phân trang hoặc virtual scroll mượt, không treo; tìm kiếm vẫn ra đúng user dù ở cuối tập dữ liệu lớn.",
    "evidence": [
     {
      "name": "TC-ORG-030__s01__list",
      "caption": "Danh sách user khối lượng lớn có phân trang",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#260"
    ]
   }
  ],
  "ui_state_checklist": [
   "list (danh sách user/role/audit/config)",
   "detail (chi tiết user / dòng audit / drawer)",
   "form (modal tạo/sửa user, vai trò, khoa/phòng/giường, nhập OTP)",
   "modal (reset mật khẩu, sửa config)",
   "drawer (chi tiết user + phiên đăng nhập)",
   "filter (lọc user, lọc audit theo ngày/từ khóa)",
   "validation (lỗi field bắt buộc/định dạng email-SĐT/mật khẩu yếu)",
   "confirm (xác nhận khóa/xóa/đóng không lưu)",
   "success (tạo/sửa/khóa/reset/áp dụng config thành công)",
   "toast (thông báo nhanh)",
   "error (trùng username/code, 401/403, API fail, OTP sai)",
   "empty (không kết quả lọc, audit khoảng tương lai)",
   "loading (spinner/skeleton các tab)",
   "permission (ẩn menu/chặn nút/chặn vai trò hệ thống/cô lập chi nhánh)",
   "dark/light parity"
  ],
  "gaps": [
   "Chưa rõ FE có màn quản lý Permissions độc lập (CRUD quyền) hay quyền là danh mục cố định seed — cần xác nhận để bổ sung test CRUD permission nếu có.",
   "Policy mật khẩu (độ dài/độ phức tạp/hết hạn/lịch sử mật khẩu) chưa được nêu trong data.js — cần lấy từ SystemConfig hoặc BE để viết test boundary chính xác.",
   "Luồng 2FA (TwoFactorOtps): kênh gửi OTP (SMS/email/app), thời gian hết hạn, số lần thử sai trước khi khóa — cần làm rõ để test edge (OTP hết hạn, brute-force).",
   "Cây tổ chức (HospitalBranches/Departments/Rooms/Beds) có thể được quản lý ở Master Data/catalog, không nằm trong SystemAdminV2 — cần xác nhận route thực và ai có quyền để hoàn thiện test phân quyền + ràng buộc xóa.",
   "Chưa có test cho self-service đổi mật khẩu (ChangePasswordDto) của chính người dùng và UserSettings (cấu hình cá nhân) — bảng UserSettings trong data.js chưa được phủ test UI.",
   "Hành vi khi user tự khóa/xóa chính tài khoản admin đang đăng nhập (self-lockout) — cần test để tránh mất quyền quản trị duy nhất.",
   "Ma trận phân quyền chi tiết (#216) cần đối chiếu từng quyền-màn để bổ sung permission test theo từng role thực tế, hiện mới phủ ở mức đại diện.",
   "XSS lưu trữ tại field mô tả vai trò / tên user / SystemConfig value cần kiểm sâu hơn (payload script, render ở nhiều màn)."
  ]
 },
 {
  "id": "catalog",
  "code": "CAT",
  "layer": "found",
  "ic": "📚",
  "nm": "Danh mục dùng chung",
  "gh": [
   "#261",
   "#263",
   "#220",
   "#225"
  ],
  "gap": false,
  "module_id": "catalog",
  "summary": "Phân hệ \"Danh mục dùng chung\" (CAT, lớp foundation) là kho danh mục nền được hầu hết phân hệ khác tham chiếu: chẩn đoán (IcdCodes, IcdInsuranceMaps, ClinicalTerms, SnomedIcdMappings), hành chính-địa lý (Ethnics, Nations, Provinces/Districts/Wards, Occupations, Genders, HealthcareFacilities/InitialFacilities), dịch vụ-viện phí (ServiceGroups, Services, ServicePrices, ServiceGroupTemplates, ServicePackages), dược-vật tư (Medicines, MedicalSupplies, Manufacturers, Suppliers, MedicationRoutes, DrugInteractions, DrugEquivalences), và các lookup vận hành (MachineCodes, NursingCareLevels, MedicalRecordTypes, ReceiptBooks, InspectionCommittees). Màn chính trên FE v2 là MasterData (/v2/master-data) gồm 5 sub-catalog (Khoa/Phòng, Dịch vụ KCB [chỉ đọc], Thuốc, ICD-10 [chỉ đọc], Thuật ngữ LS) với sidebar + KPI strip + DataTable + ModalShell CRUD; ngoài ra có các màn admin danh mục riêng (ReceiptBookAdmin, LisCatalogAdmin, RisCatalogAdmin) và endpoint giá dịch vụ /catalog/service-prices. Vì là nền tảng, rủi ro lớn nhất là tính nhất quán dữ liệu (đổi giá/đổi mã lan sang viện phí-BHYT), ràng buộc xoá khi đang được dùng (FK), và an toàn người bệnh (tương tác thuốc, map ICD-BHYT).",
  "screens": [
   {
    "name": "MasterData - Danh mục dùng chung (v2)",
    "desc": "Màn chính quản lý 5 sub-catalog: Khoa/Phòng (ghi), Dịch vụ KCB (chỉ đọc), Thuốc (ghi), ICD-10 (chỉ đọc), Thuật ngữ LS (ghi). Layout: KpiStrip (Tổng mục/Hoạt động/Tạm dừng/Hiển thị) + sidebar danh mục có badge đếm + ô tìm kiếm + nút Làm mới + nút Thêm mới (chỉ catalog ghi) + DataTable cột Mã/Tên/Phân loại/Trạng thái.",
    "route_guess": "/v2/master-data",
    "elements": [
     "KpiStrip 4 ô",
     "sidebar 5 mục + badge count",
     "SearchBox tìm theo mã/tên",
     "Btn Làm mới",
     "Btn + Thêm mới (chỉ writable)",
     "nhãn 'Danh mục chỉ đọc (chưa có API ghi)' cho services/icd",
     "DataTable 4 cột",
     "ActBtn Sửa/Xoá",
     "StatusBadge Hoạt động/Tạm dừng"
    ]
   },
   {
    "name": "Modal Thêm/Sửa danh mục",
    "desc": "ModalShell size md, Antd Form dọc theo FORM_FIELDS từng catalog. departments: code/name/departmentType(select)/nameEnglish/phone/location. medicines: code/name/genericName/activeIngredient/dosageForm/unit/concentration. clinical-terms: code/name/category(select)/bodySystem(select)/description/sortOrder(number). Khi Sửa thì field 'code' bị disable. Có scrollToFirstError + requiredMark; lỗi backend map về field qua applyServerErrors.",
    "route_guess": "/v2/master-data (modal)",
    "elements": [
     "ModalShell tiêu đề 'Thêm/Sửa — <catalog>'",
     "Form.Item required *",
     "Select departmentType/category/bodySystem",
     "InputNumber sortOrder",
     "Input code disabled khi edit",
     "Btn Huỷ",
     "Btn Lưu / Đang lưu…",
     "toast Đã thêm/Đã cập nhật/Lưu thất bại"
    ]
   },
   {
    "name": "Confirm Xoá danh mục",
    "desc": "Hộp xác nhận tone crit khi xoá 1 mục danh mục; nếu mục đang được tham chiếu (FK) backend trả lỗi, hiện toast 'Xoá thất bại (có thể đang được dùng)'.",
    "route_guess": "/v2/master-data (confirm)",
    "elements": [
     "ConfirmDialog 'Xoá \"<tên>\"?'",
     "Btn Xoá (crit)",
     "Btn Huỷ",
     "toast Đã xoá / Xoá thất bại"
    ]
   },
   {
    "name": "ServicePrices - Giá dịch vụ",
    "desc": "Quản lý bảng giá dịch vụ theo serviceId/priceType/effectiveDate qua endpoint /catalog/service-prices (GET list, GET by id, POST save, DELETE). Là nguồn tính viện phí + BHYT nên cần test nhất quán giá và hiệu lực theo ngày.",
    "route_guess": "/v2/master-data hoặc màn giá dịch vụ riêng",
    "elements": [
     "bộ lọc serviceId/priceType/effectiveDate",
     "bảng giá",
     "form giá BHYT/viện phí/dịch vụ",
     "ngày hiệu lực"
    ]
   },
   {
    "name": "ReceiptBookAdmin - Sổ biên lai",
    "desc": "Quản trị danh mục sổ biên lai (ReceiptBooks) phục vụ thu ngân/viện phí.",
    "route_guess": "/v2/receipt-book-admin",
    "elements": [
     "DataTable sổ biên lai",
     "form thêm/sửa sổ",
     "dải số biên lai",
     "trạng thái sổ"
    ]
   },
   {
    "name": "LisCatalogAdmin - Danh mục xét nghiệm",
    "desc": "Danh mục riêng cho LIS (máy XN MachineCodes, MachineServices, nhóm DV báo cáo) liên quan catalog dịch vụ CLS.",
    "route_guess": "/v2/lis-catalog-admin",
    "elements": [
     "danh sách máy/dịch vụ",
     "map dịch vụ-máy",
     "form cấu hình"
    ]
   },
   {
    "name": "RisCatalogAdmin - Danh mục CĐHA",
    "desc": "Danh mục riêng cho RIS (dịch vụ CĐHA, ưu tiên phòng CLS ParaclinicalRoomPriorities) liên quan catalog dịch vụ.",
    "route_guess": "/v2/ris-catalog-admin",
    "elements": [
     "danh sách dịch vụ CĐHA",
     "cấu hình phòng/máy",
     "form"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-CAT-001",
    "title": "Tải màn Danh mục dùng chung và đổi giữa 5 sub-catalog hiển thị đúng KPI + badge đếm",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Đăng nhập admin/Admin@123; có dữ liệu seed ở departments/medicines/icd/clinical-terms.",
    "steps": [
     "Mở /v2/master-data",
     "Quan sát KpiStrip + sidebar load mặc định tab 'Khoa / Phòng'",
     "Bấm lần lượt sang Dịch vụ KCB, Danh mục thuốc, ICD-10, Thuật ngữ LS",
     "Đối chiếu số badge cạnh mỗi mục với số dòng trong bảng và KPI 'Tổng mục'"
    ],
    "expected": "Mỗi tab load đúng dữ liệu; badge count = số dòng bảng = KPI Tổng mục; KPI Hoạt động/Tạm dừng/Hiển thị tính đúng; không có lỗi console.",
    "evidence": [
     {
      "name": "TC-CAT-001__s01__list",
      "caption": "Tab Khoa/Phòng load mặc định + KPI",
      "uiState": "list"
     },
     {
      "name": "TC-CAT-001__s02__tab",
      "caption": "Chuyển sang tab Danh mục thuốc, badge khớp bảng",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#261",
     "#220"
    ]
   },
   {
    "id": "TC-CAT-002",
    "title": "Thêm mới Khoa/Phòng (departments) thành công và hiển thị ngay trong bảng",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Đang ở tab 'Khoa / Phòng' của /v2/master-data.",
    "steps": [
     "Bấm '+ Thêm mới'",
     "Nhập Mã, Tên khoa/phòng, chọn Loại = Lâm sàng",
     "Nhập Tên tiếng Anh, Điện thoại, Vị trí (tuỳ chọn)",
     "Bấm Lưu"
    ],
    "expected": "Toast 'Đã thêm'; modal đóng; bản ghi mới xuất hiện trong bảng với StatusBadge Hoạt động; KPI Tổng mục +1.",
    "evidence": [
     {
      "name": "TC-CAT-002__s01__form",
      "caption": "Form thêm khoa đã điền",
      "uiState": "form"
     },
     {
      "name": "TC-CAT-002__s02__success",
      "caption": "Toast Đã thêm + bản ghi mới trong bảng",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#261"
    ]
   },
   {
    "id": "TC-CAT-003",
    "title": "Sửa danh mục thuốc (medicines) — field Mã bị khoá khi edit, lưu thay đổi tên/hoạt chất",
    "category": "happy",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Tab 'Danh mục thuốc' có ít nhất 1 thuốc.",
    "steps": [
     "Bấm icon Sửa (hoặc click dòng) 1 thuốc",
     "Xác nhận ô 'Mã thuốc' bị disable",
     "Đổi Tên thuốc + Hoạt chất",
     "Bấm Lưu"
    ],
    "expected": "Ô Mã không sửa được; sau Lưu hiện toast 'Đã cập nhật'; bảng phản ánh tên/hoạt chất mới (cột meta).",
    "evidence": [
     {
      "name": "TC-CAT-003__s01__modal",
      "caption": "Modal sửa thuốc, ô Mã disabled",
      "uiState": "modal"
     },
     {
      "name": "TC-CAT-003__s02__success",
      "caption": "Cập nhật thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#261"
    ]
   },
   {
    "id": "TC-CAT-004",
    "title": "Xoá Thuật ngữ LS (clinical-terms) qua confirm tone crit",
    "category": "happy",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Tab 'Thuật ngữ LS' có 1 mục chưa được tham chiếu.",
    "steps": [
     "Bấm icon Xoá trên 1 dòng",
     "Đọc nội dung confirm 'Xoá \"<tên>\"?'",
     "Bấm nút Xoá (crit)"
    ],
    "expected": "Confirm hiện đúng tên; sau xoá toast 'Đã xoá'; dòng biến mất; KPI Tổng mục -1.",
    "evidence": [
     {
      "name": "TC-CAT-004__s01__confirm",
      "caption": "Hộp xác nhận xoá tone crit",
      "uiState": "confirm"
     },
     {
      "name": "TC-CAT-004__s02__success",
      "caption": "Toast Đã xoá",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#261"
    ]
   },
   {
    "id": "TC-CAT-005",
    "title": "Tìm kiếm theo mã/tên trong danh mục lọc đúng và KPI 'Hiển thị' cập nhật",
    "category": "happy",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Tab bất kỳ có nhiều dòng.",
    "steps": [
     "Gõ một phần Mã vào SearchBox",
     "Quan sát bảng lọc client-side",
     "Xoá từ khoá, gõ một phần Tên (có dấu tiếng Việt)",
     "Quan sát KPI 'Hiển thị'"
    ],
    "expected": "Bảng chỉ còn dòng khớp mã hoặc tên (không phân biệt hoa thường); KPI 'Hiển thị' = số dòng sau lọc; đổi tab reset từ khoá.",
    "evidence": [
     {
      "name": "TC-CAT-005__s01__filter",
      "caption": "Kết quả lọc theo từ khoá + KPI Hiển thị",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#220"
    ]
   },
   {
    "id": "TC-CAT-006",
    "title": "Validation các field bắt buộc khi thêm Khoa/Phòng (để trống → báo lỗi từng field)",
    "category": "validation",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Tab 'Khoa / Phòng', modal Thêm mới đang mở.",
    "steps": [
     "Bỏ trống Mã, Tên, Loại",
     "Bấm Lưu",
     "Quan sát thông báo lỗi dưới từng Form.Item",
     "Điền lần lượt từng field bắt buộc và Lưu lại"
    ],
    "expected": "Không gọi API; mỗi field bắt buộc hiện 'Nhập <label>'; scrollToFirstError focus field đầu lỗi; chỉ khi đủ field mới submit.",
    "evidence": [
     {
      "name": "TC-CAT-006__s01__validation",
      "caption": "3 field bắt buộc báo lỗi đỏ",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#225"
    ]
   },
   {
    "id": "TC-CAT-007",
    "title": "Validation medicines — thiếu generic/hoạt chất/dạng bào chế/đơn vị đều chặn lưu",
    "category": "validation",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Tab 'Danh mục thuốc', modal Thêm mới.",
    "steps": [
     "Chỉ nhập Mã + Tên thuốc",
     "Để trống genericName, activeIngredient, dosageForm, unit",
     "Bấm Lưu"
    ],
    "expected": "Form chặn submit, báo lỗi tại 4 field bắt buộc còn lại; không có request POST.",
    "evidence": [
     {
      "name": "TC-CAT-007__s01__validation",
      "caption": "Báo lỗi các field thuốc bắt buộc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#225"
    ]
   },
   {
    "id": "TC-CAT-008",
    "title": "Lỗi trùng Mã từ backend được map về đúng field code (server validation)",
    "category": "validation",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Đã tồn tại 1 khoa có Mã = 'KHOA01'.",
    "steps": [
     "Tab Khoa/Phòng → Thêm mới",
     "Nhập Mã = 'KHOA01' (trùng) + Tên + Loại hợp lệ",
     "Bấm Lưu",
     "Quan sát phản hồi lỗi"
    ],
    "expected": "Backend trả lỗi trùng; applyServerErrors gắn message lỗi vào field 'code' (hoặc toast message backend nếu không map được); KHÔNG tạo bản ghi trùng.",
    "evidence": [
     {
      "name": "TC-CAT-008__s01__error",
      "caption": "Lỗi trùng mã hiển thị tại field/ toast",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#225",
     "#263"
    ]
   },
   {
    "id": "TC-CAT-009",
    "title": "Huỷ giữa chừng khi thêm/sửa — không lưu, không rò rỉ dữ liệu sang lần mở sau",
    "category": "negative",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Tab Khoa/Phòng.",
    "steps": [
     "Mở Thêm mới, nhập vài field",
     "Bấm Huỷ",
     "Mở lại Thêm mới",
     "Kiểm tra form đã resetFields (trống)",
     "Mở Sửa 1 dòng rồi Huỷ, mở Thêm mới và kiểm tra không còn dữ liệu dòng cũ"
    ],
    "expected": "Bấm Huỷ không gọi API; lần mở Thêm mới sau form trống; không lẫn dữ liệu của bản ghi vừa Sửa.",
    "evidence": [
     {
      "name": "TC-CAT-009__s01__form",
      "caption": "Form trống khi mở lại sau Huỷ",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#261"
    ]
   },
   {
    "id": "TC-CAT-010",
    "title": "Danh mục chỉ đọc (Dịch vụ KCB, ICD-10) không có nút Thêm/Sửa/Xoá",
    "category": "permission",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Tab 'Dịch vụ KCB' và 'ICD-10'.",
    "steps": [
     "Chuyển sang tab Dịch vụ KCB",
     "Kiểm tra vùng toolbar",
     "Chuyển sang tab ICD-10",
     "Kiểm tra cột thao tác trong bảng"
    ],
    "expected": "Hiển thị nhãn 'Danh mục chỉ đọc (chưa có API ghi)' thay nút Thêm; bảng không có ActBtn Sửa/Xoá; click dòng không mở modal.",
    "evidence": [
     {
      "name": "TC-CAT-010__s01__permission",
      "caption": "Tab Dịch vụ KCB chỉ đọc, không nút ghi",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#261",
     "#216"
    ]
   },
   {
    "id": "TC-CAT-011",
    "title": "Phân quyền: vai trò không có quyền quản trị danh mục bị chặn menu/nút/API",
    "category": "permission",
    "priority": "P0",
    "role": "nhân viên không có quyền danh mục",
    "preconditions": "Có tài khoản role bị giới hạn (không có permission catalog write) theo matrix #216.",
    "steps": [
     "Đăng nhập bằng role hạn chế",
     "Thử truy cập /v2/master-data trực tiếp qua URL",
     "Nếu vào được, thử bấm Thêm/Sửa/Xoá",
     "Quan sát phản hồi (UI ẩn nút hoặc API trả 403)"
    ],
    "expected": "Menu danh mục bị ẩn hoặc route bị chặn; nếu gọi API ghi vẫn trả 403/401; không tạo/sửa/xoá được; thông báo không đủ quyền.",
    "evidence": [
     {
      "name": "TC-CAT-011__s01__permission",
      "caption": "Role hạn chế bị chặn thao tác ghi",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-CAT-012",
    "title": "Edge: nhập Mã/Tên với ký tự đặc biệt, dấu tiếng Việt và chuỗi rất dài",
    "category": "edge",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Tab Thuật ngữ LS, modal Thêm mới.",
    "steps": [
     "Nhập Mã có ký tự đặc biệt (vd 'AB-01/Đ')",
     "Nhập Tên có dấu tiếng Việt + emoji + chuỗi >255 ký tự",
     "Bấm Lưu",
     "Kiểm tra lưu/hiển thị/cắt chuỗi"
    ],
    "expected": "Hoặc lưu đúng và hiển thị nguyên vẹn dấu tiếng Việt, hoặc backend trả lỗi độ dài/định dạng rõ ràng; không vỡ layout bảng; không lỗi 500.",
    "evidence": [
     {
      "name": "TC-CAT-012__s01__form",
      "caption": "Nhập chuỗi dài + ký tự đặc biệt",
      "uiState": "form"
     },
     {
      "name": "TC-CAT-012__s02__validation",
      "caption": "Backend báo lỗi độ dài (nếu có)",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#225"
    ]
   },
   {
    "id": "TC-CAT-013",
    "title": "Edge: sortOrder của Thuật ngữ LS với giá trị 0, âm và rất lớn",
    "category": "edge",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Tab Thuật ngữ LS, modal Thêm mới.",
    "steps": [
     "Nhập sortOrder = 0 → Lưu",
     "Sửa, nhập sortOrder = -5 → Lưu",
     "Sửa, nhập sortOrder = 999999999 → Lưu"
    ],
    "expected": "sortOrder 0 hợp lệ; âm bị chặn hoặc xử lý nhất quán; số rất lớn không tràn/không lỗi; thứ tự hiển thị đúng theo sortOrder.",
    "evidence": [
     {
      "name": "TC-CAT-013__s01__validation",
      "caption": "Xử lý sortOrder biên (0/âm/lớn)",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#225"
    ]
   },
   {
    "id": "TC-CAT-014",
    "title": "State: xoá danh mục đang được tham chiếu (FK) bị chặn với thông báo đúng",
    "category": "state",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có 1 khoa/thuốc đang được dùng trong hồ sơ/đơn thuốc.",
    "steps": [
     "Tab tương ứng → bấm Xoá mục đang được dùng",
     "Xác nhận Xoá",
     "Quan sát phản hồi"
    ],
    "expected": "Backend từ chối xoá (FK constraint); UI hiện toast 'Xoá thất bại (có thể đang được dùng)'; bản ghi vẫn còn; gợi ý nên Tạm dừng thay vì Xoá.",
    "evidence": [
     {
      "name": "TC-CAT-014__s01__error",
      "caption": "Toast xoá thất bại vì đang được dùng",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#263"
    ]
   },
   {
    "id": "TC-CAT-015",
    "title": "Data-consistency: đổi giá ServicePrices → viện phí + BHYT tính lại đúng theo ngày hiệu lực",
    "category": "data-consistency",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có Service đã dùng trong 1 hồ sơ; truy cập được màn giá dịch vụ (/catalog/service-prices).",
    "steps": [
     "Cập nhật giá viện phí và giá BHYT cho 1 dịch vụ với effectiveDate hôm nay",
     "Tạo/ghi nhận 1 chỉ định dịch vụ đó cho bệnh nhân mới",
     "Mở viện phí (billing) của bệnh nhân",
     "Đối chiếu số tiền tính theo bảng giá mới",
     "Kiểm tra 1 hồ sơ cũ (trước effectiveDate) vẫn giữ giá cũ"
    ],
    "expected": "Chi phí dịch vụ tạo sau effectiveDate dùng giá mới; phần BHYT chi trả tính đúng theo giá BHYT; hồ sơ cũ không bị đổi giá hồi tố; audit log ghi thay đổi giá.",
    "evidence": [
     {
      "name": "TC-CAT-015__s01__form",
      "caption": "Cập nhật giá dịch vụ + ngày hiệu lực",
      "uiState": "form"
     },
     {
      "name": "TC-CAT-015__s02__detail",
      "caption": "Viện phí bệnh nhân tính theo giá mới",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#263",
     "#261"
    ]
   },
   {
    "id": "TC-CAT-016",
    "title": "Data-consistency: thêm thuốc mới → xuất hiện chọn được khi kê đơn (presc)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Quyền thêm thuốc + truy cập màn kê đơn.",
    "steps": [
     "Thêm 1 thuốc mới (đủ generic/hoạt chất/đơn vị) ở MasterData",
     "Mở màn kê đơn thuốc cho 1 bệnh nhân",
     "Tìm thuốc vừa thêm trong ô chọn thuốc"
    ],
    "expected": "Thuốc mới xuất hiện trong danh sách kê đơn với đúng hoạt chất/đơn vị; nếu đặt Tạm dừng thì không chọn được.",
    "evidence": [
     {
      "name": "TC-CAT-016__s01__success",
      "caption": "Thuốc mới tạo thành công",
      "uiState": "success"
     },
     {
      "name": "TC-CAT-016__s02__dropdown",
      "caption": "Thuốc mới chọn được khi kê đơn",
      "uiState": "dropdown"
     }
    ],
    "refIssues": [
     "#261"
    ]
   },
   {
    "id": "TC-CAT-017",
    "title": "Patient-safety: cấu hình DrugInteractions cảnh báo đúng khi kê 2 thuốc tương tác",
    "category": "data-consistency",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có 2 thuốc và 1 bản ghi tương tác giữa chúng trong danh mục.",
    "steps": [
     "Đảm bảo danh mục có cặp tương tác thuốc A–B",
     "Kê đơn cùng lúc thuốc A và thuốc B cho 1 bệnh nhân",
     "Quan sát cảnh báo tương tác"
    ],
    "expected": "Hệ thống cảnh báo tương tác thuốc đúng theo danh mục DrugInteractions trước khi lưu đơn; không có cặp tương tác thì không cảnh báo sai.",
    "evidence": [
     {
      "name": "TC-CAT-017__s01__error",
      "caption": "Cảnh báo tương tác thuốc khi kê A+B",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#263"
    ]
   },
   {
    "id": "TC-CAT-018",
    "title": "Data-consistency: map ICD–BHYT (IcdInsuranceMaps) áp đúng khi chẩn đoán quyết toán BHYT",
    "category": "data-consistency",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có mã ICD đã map BHYT.",
    "steps": [
     "Chọn 1 mã ICD có map BHYT làm chẩn đoán cho hồ sơ BHYT",
     "Mở hồ sơ BHYT/giám định",
     "Đối chiếu mã/áp mức hưởng theo map"
    ],
    "expected": "Mã ICD được map đúng sang phân loại BHYT; mức hưởng/hồ sơ giám định dùng đúng mapping; ICD không map cảnh báo phù hợp.",
    "evidence": [
     {
      "name": "TC-CAT-018__s01__detail",
      "caption": "Map ICD-BHYT áp dụng trong hồ sơ",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#263"
    ]
   },
   {
    "id": "TC-CAT-019",
    "title": "UI: trạng thái empty / loading / error của bảng và sidebar",
    "category": "ui",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có thể giả lập lọc không kết quả và lỗi mạng.",
    "steps": [
     "Gõ từ khoá không tồn tại → quan sát empty",
     "Reload trang, quan sát trạng thái 'Đang tải…' khi loadAll",
     "Ngắt mạng/giả lập 1 catalog lỗi → đổi sang tab đó"
    ],
    "expected": "Empty hiện 'Không có mục nào' kèm icon; trong lúc tải hiện 'Đang tải…'; catalog lỗi trả mảng rỗng (Promise.allSettled) không làm vỡ các tab khác; badge của tab lỗi = 0.",
    "evidence": [
     {
      "name": "TC-CAT-019__s01__empty",
      "caption": "Empty không kết quả lọc",
      "uiState": "empty"
     },
     {
      "name": "TC-CAT-019__s02__loading",
      "caption": "Trạng thái Đang tải…",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#220"
    ]
   },
   {
    "id": "TC-CAT-020",
    "title": "UI: parity dark/light của KpiStrip, sidebar active, bảng và modal",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Đăng nhập, ở /v2/master-data.",
    "steps": [
     "Bật chế độ sáng, xem KPI/sidebar mục active/bảng/StatusBadge",
     "Mở modal Thêm mới, xem màu nền/viền/Select",
     "Toggle dark mode trên topbar",
     "Lặp lại quan sát các thành phần trên"
    ],
    "expected": "Không có chữ/viền mất tương phản ở cả 2 theme; mục sidebar active (a-cy), StatusBadge ok/warn, ModalShell đọc rõ; không hardcode màu sáng trong dark.",
    "evidence": [
     {
      "name": "TC-CAT-020__s01__list",
      "caption": "Light mode toàn màn",
      "uiState": "list"
     },
     {
      "name": "TC-CAT-020__s02__modal",
      "caption": "Dark mode modal + form",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#220"
    ]
   },
   {
    "id": "TC-CAT-021",
    "title": "Negative: thao tác sai thứ tự — bấm Lưu khi đang lưu (double submit)",
    "category": "negative",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Tab Khoa/Phòng, form thêm hợp lệ đã điền.",
    "steps": [
     "Bấm Lưu",
     "Trong lúc nút hiển thị 'Đang lưu…' bấm Lưu thêm vài lần nhanh"
    ],
    "expected": "Nút bị disabled khi saving; chỉ 1 request được gửi; không tạo 2 bản ghi trùng.",
    "evidence": [
     {
      "name": "TC-CAT-021__s01__form",
      "caption": "Nút Lưu disabled trạng thái Đang lưu…",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#261"
    ]
   },
   {
    "id": "TC-CAT-022",
    "title": "Security: XSS ở field ghi chú/mô tả Thuật ngữ LS không thực thi script",
    "category": "security",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Tab Thuật ngữ LS, modal Thêm/Sửa.",
    "steps": [
     "Nhập Mô tả = '<img src=x onerror=alert(1)>' và '<script>alert(1)</script>'",
     "Lưu",
     "Mở lại danh sách/chi tiết hiển thị mô tả"
    ],
    "expected": "Nội dung hiển thị như text thuần (escaped), không chạy alert/script; lưu/đọc an toàn; không lỗi render.",
    "evidence": [
     {
      "name": "TC-CAT-022__s01__detail",
      "caption": "Mô tả chứa payload hiển thị escaped",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#263"
    ]
   },
   {
    "id": "TC-CAT-023",
    "title": "Security: gọi trực tiếp API ghi catalog không kèm token bị 401",
    "category": "security",
    "priority": "P0",
    "role": "khách (không token)",
    "preconditions": "Biết endpoint POST /catalog/departments, /catalog/medicines, /catalog/service-prices.",
    "steps": [
     "Gửi POST /api/catalog/departments không có Authorization header",
     "Gửi POST /api/catalog/service-prices không token",
     "Quan sát mã trả về"
    ],
    "expected": "Trả 401 Unauthorized (không phải 200/500); không tạo bản ghi; endpoint danh mục không bị mở anonymous.",
    "evidence": [
     {
      "name": "TC-CAT-023__s01__error",
      "caption": "API ghi catalog trả 401 khi thiếu token",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#263",
     "#216"
    ]
   },
   {
    "id": "TC-CAT-024",
    "title": "Audit log ghi đúng mọi mutation danh mục (create/update/delete + CreatedBy user thật)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có quyền xem audit log; đăng nhập admin.",
    "steps": [
     "Thêm 1 khoa, Sửa 1 thuốc, Xoá 1 thuật ngữ",
     "Mở audit log / kiểm tra DB AuditLog",
     "Đối chiếu hành động, bảng, CreatedBy/UpdatedBy"
    ],
    "expected": "Mỗi mutation tạo 1 bản ghi audit với đúng loại hành động, tên bảng, dữ liệu before/after và CreatedBy = user thật (≠ Guid.Empty); thời gian đúng.",
    "evidence": [
     {
      "name": "TC-CAT-024__s01__detail",
      "caption": "Audit log ghi đủ 3 mutation",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#263"
    ]
   },
   {
    "id": "TC-CAT-025",
    "title": "State: bật/tắt isActive (Tạm dừng) danh mục và ảnh hưởng filter isActive ở nơi dùng",
    "category": "state",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Tab Khoa/Phòng hoặc Thuốc có mục đang Hoạt động.",
    "steps": [
     "Sửa 1 mục, đặt trạng thái Tạm dừng (isActive=false) nếu form hỗ trợ",
     "Lưu, kiểm tra StatusBadge chuyển 'Tạm dừng' + KPI Tạm dừng +1",
     "Mở nơi tiêu thụ (vd chọn khoa/thuốc) lọc isActive=true",
     "Xác nhận mục Tạm dừng không xuất hiện"
    ],
    "expected": "Trạng thái chuyển đúng và hiển thị StatusBadge warn; KPI Hoạt động/Tạm dừng cập nhật; nơi dùng lọc isActive bỏ qua mục tạm dừng.",
    "evidence": [
     {
      "name": "TC-CAT-025__s01__detail",
      "caption": "StatusBadge Tạm dừng + KPI cập nhật",
      "uiState": "detail"
     },
     {
      "name": "TC-CAT-025__s02__dropdown",
      "caption": "Mục tạm dừng không hiện ở dropdown nơi dùng",
      "uiState": "dropdown"
     }
    ],
    "refIssues": [
     "#261"
    ]
   },
   {
    "id": "TC-CAT-026",
    "title": "Integration: dữ liệu địa giới (Provinces/Districts/Wards) đổ cascade đúng theo đề án sáp nhập/AdministrativeDivisions",
    "category": "integration",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Danh mục địa giới có dữ liệu; có màn dùng chọn Tỉnh→Huyện→Xã (vd tiếp đón/portal).",
    "steps": [
     "Mở form có chọn địa giới",
     "Chọn 1 Tỉnh/TP",
     "Kiểm tra dropdown Quận/Huyện chỉ thuộc tỉnh đó",
     "Chọn Huyện → kiểm tra Xã/Phường thuộc huyện"
    ],
    "expected": "Cascade đúng quan hệ Provinces→Districts→Wards; mã hành chính khớp AdministrativeDivisions; không lẫn đơn vị khác tỉnh.",
    "evidence": [
     {
      "name": "TC-CAT-026__s01__dropdown",
      "caption": "Cascade Tỉnh→Huyện→Xã đúng",
      "uiState": "dropdown"
     }
    ],
    "refIssues": [
     "#220"
    ]
   },
   {
    "id": "TC-CAT-027",
    "title": "ServicePrices: validation ngày hiệu lực quá khứ/tương lai và giá âm",
    "category": "validation",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Màn giá dịch vụ /catalog/service-prices.",
    "steps": [
     "Tạo giá với effectiveDate trong tương lai xa",
     "Tạo giá với giá trị âm",
     "Tạo 2 giá trùng khoảng hiệu lực cho cùng 1 dịch vụ"
    ],
    "expected": "Giá âm bị chặn; ngày tương lai cho phép nhưng chỉ áp dụng từ ngày đó; trùng khoảng hiệu lực bị cảnh báo/ chặn để tránh nhập nhằng giá.",
    "evidence": [
     {
      "name": "TC-CAT-027__s01__validation",
      "caption": "Chặn giá âm + cảnh báo trùng khoảng hiệu lực",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#263",
     "#225"
    ]
   }
  ],
  "ui_state_checklist": [
   "list — bảng danh mục tải đầy đủ theo từng tab + KpiStrip",
   "tab — chuyển giữa 5 sub-catalog, badge đếm khớp",
   "filter — kết quả tìm theo mã/tên, KPI Hiển thị",
   "form — modal Thêm/Sửa đã điền, field code disabled khi edit",
   "modal — ModalShell mở với Form theo từng catalog (dark + light)",
   "validation — lỗi field bắt buộc/định dạng/độ dài, server error map field",
   "confirm — hộp xác nhận xoá tone crit",
   "success — toast Đã thêm/Đã cập nhật/Đã xoá + bảng cập nhật",
   "error — xoá thất bại do FK, trùng mã, 401, cảnh báo tương tác thuốc",
   "empty — 'Không có mục nào' khi lọc rỗng",
   "loading — 'Đang tải…' khi loadAll",
   "permission — danh mục chỉ đọc + role hạn chế bị chặn",
   "detail — viện phí/BHYT/audit/map ICD/StatusBadge phản ánh thay đổi danh mục",
   "dropdown — danh mục được tiêu thụ ở nơi dùng (kê đơn, cascade địa giới)"
  ],
  "gaps": [
   "MasterData v2 chỉ phơi 5 sub-catalog (departments/services/medicines/icd/clinical-terms); rất nhiều bảng trong BANDS (Manufacturers, Suppliers, MedicationRoutes, DrugEquivalences, MachineCodes/MachineServices, ServiceGroups/Templates/Packages, ReportServiceGroups, NursingCareLevels, MedicalRecordTypes, Genders/Ethnics/Occupations/Nations, HealthcareFacilities/InitialFacilities, InspectionCommittees) CHƯA có màn CRUD rõ ràng trên FE — cần xác minh có UI hay chỉ seed/read-only để bổ sung test.",
   "services và icd hiện 'chỉ đọc (chưa có API ghi)' — chưa rõ quy trình nhập/đồng bộ ICD-10, ICD-BHYT, SNOMED từ nguồn ngoài (import file/cổng QG); thiếu test import/cập nhật danh mục chuẩn quốc gia.",
   "Thiếu test phân quyền chi tiết theo matrix #216 cho từng role (ai được sửa giá, ai chỉ xem) — cần ma trận quyền cụ thể của phân hệ catalog.",
   "Thiếu test versioning/audit lịch sử giá dịch vụ (xem được giá tại 1 thời điểm quá khứ) và rollback khi nhập sai giá.",
   "Thiếu test concurrency: 2 admin cùng sửa 1 danh mục (optimistic lock / last-write-wins).",
   "Thiếu test IDOR cho endpoint /catalog/service-prices/{id} và /clinical-terms/{id} (truy cập id chi nhánh/đơn vị khác) — cần xác minh phạm vi đa chi nhánh.",
   "Thiếu test ràng buộc nghiệp vụ map SnomedIcdMappings và DrugEquivalences (thuốc tương đương) khi thay thế thuốc hết hàng.",
   "Chưa rõ luồng kích hoạt lại (re-activate) mục đã Tạm dừng và ảnh hưởng tới dữ liệu lịch sử."
  ]
 },
 {
  "id": "system",
  "code": "SYS",
  "layer": "found",
  "ic": "⚙️",
  "nm": "Hệ thống & Hạ tầng",
  "gh": [
   "#260",
   "#264",
   "#282",
   "#230"
  ],
  "gap": false,
  "module_id": "system",
  "summary": "Phân hệ \"Hệ thống & Hạ tầng\" (id=system, lớp nền tảng) quản trị cấu hình hệ thống, nhật ký vận hành và audit, đẩy thông báo đa kênh (in-app/SMS/Zalo OA), cảnh báo nghiệp vụ, tác vụ định kỳ và an ninh thiết bị đầu cuối. 11 bảng thật: SystemConfigs (cấu hình), SystemLogs (nhật ký HT), AuditLogs (truy vết mọi thay đổi HSBA/viện phí — patient-safety/pháp lý), Notifications, ScheduledTasks, SmsLogs, ZaloNotificationLogs, BusinessAlerts, SecurityIncidents, EndpointDevices, InstalledSoftwareItems. Màn chính: trang Quản trị hệ thống v2 (/v2/admin) với 4 tab Người dùng/Vai trò/Audit log/Cấu hình HT; trang An ninh thiết bị đầu cuối (/v2/endpoint-security); trang Sao lưu (/v2/backup-management); trang Log Zalo OA (/v2/zalo-notifications). Đặc thù: AuditLog bất biến (append-only), bảo mật cao, IDOR/anonymous-endpoint là rủi ro trọng yếu.",
  "screens": [
   {
    "name": "Quản trị hệ thống — Tab Cấu hình HT (SystemConfigs)",
    "desc": "Bảng cấu hình hệ thống key-value theo nhóm; sửa giá trị qua modal; toggle bật/tắt; một số cấu hình nhạy cảm (secret/cổng tích hợp) chỉ Admin thấy. Mutation phải ghi AuditLog.",
    "route_guess": "/v2/admin (tab config)",
    "elements": [
     "TopTabs (Người dùng/Vai trò/Audit log/Cấu hình HT)",
     "SearchBox lọc theo key/nhóm",
     "DataTable cột Key|Nhóm|Giá trị|Mô tả|Cập nhật",
     "ModalShell sửa cấu hình (Input/Switch/Select)",
     "Btn lưu/hủy",
     "StatusBadge enabled/disabled"
    ]
   },
   {
    "name": "Quản trị hệ thống — Tab Audit log (AuditLogs)",
    "desc": "Danh sách nhật ký audit chỉ-đọc: ai/làm-gì/bảng/bản-ghi/giá-trị-cũ-mới/thời-gian/IP. Lọc theo user, hành động, bảng, khoảng ngày. Không cho sửa/xóa (append-only).",
    "route_guess": "/v2/admin (tab audit)",
    "elements": [
     "Filter (user, action, entity, dateRange)",
     "DataTable cột Thời gian|Người dùng|Hành động|Bảng|Bản ghi|IP",
     "DrawerShell chi tiết diff old/new (JSON)",
     "Phân trang",
     "Empty state khi không có log"
    ]
   },
   {
    "name": "Nhật ký hệ thống (SystemLogs)",
    "desc": "Log vận hành kỹ thuật theo mức (Info/Warning/Error/Fatal), nguồn, message, stacktrace. Lọc theo level/khoảng ngày/nguồn. Chỉ-đọc.",
    "route_guess": "/v2/admin (mục Log hệ thống hoặc trong tab quản trị)",
    "elements": [
     "Filter level/source/dateRange",
     "DataTable cột Thời gian|Level|Nguồn|Message",
     "DrawerShell xem stacktrace đầy đủ",
     "Badge màu theo level",
     "Empty/error state"
    ]
   },
   {
    "name": "Trung tâm thông báo (Notifications)",
    "desc": "Danh sách thông báo in-app theo người nhận: tiêu đề, nội dung, loại, đã đọc/chưa đọc, thời gian. Đánh dấu đã đọc, lọc theo loại.",
    "route_guess": "/v2/admin (notifications) hoặc dropdown chuông topbar",
    "elements": [
     "Badge số chưa đọc",
     "Dropdown/list thông báo",
     "Nút đánh dấu đã đọc / đọc tất cả",
     "Filter theo loại",
     "Empty state 'Không có thông báo'"
    ]
   },
   {
    "name": "Tác vụ định kỳ (ScheduledTasks)",
    "desc": "Quản lý job nền/cron: tên, lịch (cron), lần chạy gần nhất, kết quả, bật/tắt, chạy thủ công. Trạng thái Enabled/Disabled/Running/Failed.",
    "route_guess": "/v2/admin (scheduled-tasks) hoặc /v2/backup-management",
    "elements": [
     "DataTable cột Tên|Cron|Lần chạy cuối|Kết quả|Trạng thái",
     "Switch bật/tắt",
     "Btn 'Chạy ngay'",
     "StatusBadge",
     "ModalShell sửa lịch cron",
     "Confirm khi chạy thủ công"
    ]
   },
   {
    "name": "Log SMS (SmsLogs)",
    "desc": "Lịch sử gửi SMS: số nhận, nội dung, trạng thái (Sent/Failed/Pending), nhà cung cấp, thời gian, mã lỗi. Chỉ-đọc, có thể gửi lại bản thất bại.",
    "route_guess": "/v2/admin (sms-logs)",
    "elements": [
     "Filter trạng thái/dateRange/số ĐT",
     "DataTable cột Thời gian|Số nhận|Trạng thái|NCC",
     "DrawerShell nội dung + mã lỗi",
     "Btn gửi lại (failed)",
     "Empty state"
    ]
   },
   {
    "name": "Log Zalo OA (ZaloNotificationLogs)",
    "desc": "Lịch sử đẩy tin Zalo OA: người nhận, template, trạng thái gửi, phản hồi cổng Zalo, thời gian. Gửi lại bản lỗi.",
    "route_guess": "/v2/zalo-notifications",
    "elements": [
     "Filter trạng thái/template/dateRange",
     "DataTable cột Thời gian|Người nhận|Template|Trạng thái",
     "DrawerShell payload + response Zalo",
     "Btn gửi lại",
     "Empty/error state"
    ]
   },
   {
    "name": "Cảnh báo nghiệp vụ (BusinessAlerts)",
    "desc": "Danh sách cảnh báo nghiệp vụ tự sinh (tồn kho thấp, hạn dùng, vượt ngưỡng...): loại, mức độ, nội dung, đối tượng, trạng thái xử lý (New/Acknowledged/Resolved).",
    "route_guess": "/v2/admin (business-alerts) hoặc dashboard",
    "elements": [
     "StatusTabs theo trạng thái xử lý",
     "DataTable cột Thời gian|Loại|Mức độ|Nội dung|Trạng thái",
     "Btn xác nhận/giải quyết",
     "Badge mức độ (Low/Med/High/Critical)",
     "Empty state"
    ]
   },
   {
    "name": "Sự cố bảo mật (SecurityIncidents)",
    "desc": "Ghi nhận sự cố an ninh: loại (đăng nhập sai nhiều lần, truy cập trái phép, IDOR phát hiện...), mức độ, nguồn IP, người liên quan, trạng thái điều tra.",
    "route_guess": "/v2/endpoint-security (tab incidents) hoặc /v2/admin",
    "elements": [
     "StatusTabs trạng thái điều tra",
     "DataTable cột Thời gian|Loại|Mức độ|IP|Trạng thái",
     "DrawerShell chi tiết + dòng thời gian",
     "Btn đổi trạng thái điều tra",
     "Badge mức độ"
    ]
   },
   {
    "name": "Thiết bị đầu cuối (EndpointDevices)",
    "desc": "Quản lý máy trạm/thiết bị: tên máy, IP/MAC, phòng/khoa, trạng thái online/offline, lần kiểm tra cuối, tuân thủ bảo mật.",
    "route_guess": "/v2/endpoint-security",
    "elements": [
     "KpiStrip (tổng/online/offline/không tuân thủ)",
     "StatusTabs online/offline",
     "DataTable cột Tên|IP|MAC|Phòng|Trạng thái|Tuân thủ",
     "DrawerShell chi tiết thiết bị + phần mềm đã cài",
     "Filter theo khoa/trạng thái"
    ]
   },
   {
    "name": "Phần mềm đã cài (InstalledSoftwareItems)",
    "desc": "Inventory phần mềm trên từng EndpointDevice: tên phần mềm, phiên bản, nhà phát hành, ngày cài, hợp lệ/cấm. Liên kết tới thiết bị.",
    "route_guess": "/v2/endpoint-security (tab/ drawer phần mềm)",
    "elements": [
     "DataTable cột Phần mềm|Phiên bản|NPH|Thiết bị|Trạng thái",
     "Filter theo thiết bị/phần mềm cấm",
     "Badge hợp lệ/cấm",
     "Empty state"
    ]
   },
   {
    "name": "Sao lưu & phục hồi (ScheduledTasks/Backup)",
    "desc": "Quản lý sao lưu DB: lịch backup, lịch sử backup (thời gian/dung lượng/kết quả), backup thủ công, phục hồi. Liên quan ScheduledTasks.",
    "route_guess": "/v2/backup-management",
    "elements": [
     "DataTable lịch sử backup",
     "Btn 'Sao lưu ngay'",
     "Confirm phục hồi (nguy hiểm)",
     "StatusBadge thành công/thất bại",
     "Loading khi backup chạy"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-SYS-001",
    "title": "Xem & lọc danh sách cấu hình hệ thống (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Admin",
    "preconditions": "Đăng nhập admin/Admin@123; có sẵn dữ liệu SystemConfigs.",
    "steps": [
     "Vào /v2/admin",
     "Chọn tab 'Cấu hình HT'",
     "Quan sát DataTable cấu hình key-value",
     "Gõ một key vào SearchBox để lọc"
    ],
    "expected": "Bảng hiển thị đúng cột Key/Nhóm/Giá trị/Mô tả; lọc trả đúng dòng khớp key; số tiền/số/ngày (nếu có) format đúng locale vi-VN.",
    "evidence": [
     {
      "name": "TC-SYS-001__s01__list",
      "caption": "Danh sách cấu hình hệ thống tab Cấu hình HT",
      "uiState": "list"
     },
     {
      "name": "TC-SYS-001__s02__filter",
      "caption": "Kết quả lọc theo key",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#260",
     "#230"
    ]
   },
   {
    "id": "TC-SYS-002",
    "title": "Sửa một cấu hình hệ thống và lưu thành công (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Admin",
    "preconditions": "Đang ở tab Cấu hình HT; chọn 1 cấu hình không nhạy cảm.",
    "steps": [
     "Bấm sửa 1 dòng cấu hình",
     "Trong ModalShell đổi Giá trị sang giá trị hợp lệ mới",
     "Bấm Lưu",
     "Đóng modal và xem lại dòng vừa sửa"
    ],
    "expected": "Modal hiện form đúng giá trị hiện tại; lưu thành công có toast; bảng cập nhật giá trị mới; AuditLog ghi 1 bản ghi action=Update bảng SystemConfigs với old/new value.",
    "evidence": [
     {
      "name": "TC-SYS-002__s01__modal",
      "caption": "Modal sửa cấu hình mở với giá trị hiện tại",
      "uiState": "modal"
     },
     {
      "name": "TC-SYS-002__s02__success",
      "caption": "Toast lưu cấu hình thành công",
      "uiState": "success"
     },
     {
      "name": "TC-SYS-002__s03__list",
      "caption": "Bảng cập nhật giá trị mới",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#260",
     "#230"
    ]
   },
   {
    "id": "TC-SYS-003",
    "title": "Validation khi sửa cấu hình: bỏ trống giá trị bắt buộc / sai kiểu (validation)",
    "category": "validation",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Mở modal sửa 1 cấu hình kiểu số/boolean có ràng buộc.",
    "steps": [
     "Xóa trống ô Giá trị (cấu hình bắt buộc) → bấm Lưu",
     "Nhập chữ vào cấu hình kiểu số → bấm Lưu",
     "Nhập giá trị vượt range cho phép → bấm Lưu"
    ],
    "expected": "Mỗi trường hợp hiện lỗi inline rõ ràng tiếng Việt có dấu ('Bắt buộc nhập', 'Phải là số', 'Vượt giới hạn'); form không submit; không tạo AuditLog.",
    "evidence": [
     {
      "name": "TC-SYS-003__s01__validation",
      "caption": "Lỗi inline khi để trống giá trị bắt buộc",
      "uiState": "validation"
     },
     {
      "name": "TC-SYS-003__s02__validation",
      "caption": "Lỗi sai kiểu số / vượt range",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#260"
    ]
   },
   {
    "id": "TC-SYS-004",
    "title": "Hủy giữa chừng khi sửa cấu hình không lưu thay đổi (negative)",
    "category": "negative",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Mở modal sửa cấu hình, đã đổi giá trị nhưng chưa lưu.",
    "steps": [
     "Đổi giá trị trong modal",
     "Bấm Hủy / đóng modal (X)",
     "Mở lại dòng cấu hình đó"
    ],
    "expected": "Thay đổi bị bỏ qua; giá trị giữ nguyên như trước; không có toast lưu; không tạo AuditLog.",
    "evidence": [
     {
      "name": "TC-SYS-004__s01__modal",
      "caption": "Modal sau khi đổi giá trị (chưa lưu)",
      "uiState": "modal"
     },
     {
      "name": "TC-SYS-004__s02__list",
      "caption": "Giá trị giữ nguyên sau khi hủy",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#260"
    ]
   },
   {
    "id": "TC-SYS-005",
    "title": "Cấu hình nhạy cảm (secret/cổng tích hợp) bị che/giới hạn hiển thị (security)",
    "category": "security",
    "priority": "P0",
    "role": "Admin",
    "preconditions": "Có cấu hình kiểu secret (API key, mật khẩu cổng BHXH/Zalo).",
    "steps": [
     "Vào tab Cấu hình HT",
     "Tìm cấu hình loại secret",
     "Quan sát cột Giá trị",
     "Mở DevTools Network xem response /api/system/configs"
    ],
    "expected": "Giá trị secret hiển thị dạng che (••••/masked); response API KHÔNG trả secret thô cho non-required; không hardcode secret trong FE bundle.",
    "evidence": [
     {
      "name": "TC-SYS-005__s01__list",
      "caption": "Cấu hình secret hiển thị dạng masked",
      "uiState": "list"
     },
     {
      "name": "TC-SYS-005__s02__detail",
      "caption": "Response API không lộ secret thô",
      "uiState": "detail"
     }
    ],
    "notes": "Tham chiếu policy KHÔNG hardcode/lộ secret (Orthanc/R2/seed-key).",
    "refIssues": [
     "#264"
    ]
   },
   {
    "id": "TC-SYS-006",
    "title": "Vai trò không đủ quyền không truy cập được trang/API quản trị (permission)",
    "category": "permission",
    "priority": "P0",
    "role": "Bác sĩ (non-admin)",
    "preconditions": "Có tài khoản role thường (không phải Admin); ma trận quyền #216.",
    "steps": [
     "Đăng nhập tài khoản non-admin",
     "Kiểm tra menu có ẩn mục Quản trị hệ thống / An ninh thiết bị không",
     "Gõ trực tiếp URL /v2/admin",
     "Gọi trực tiếp API GET /api/system/configs bằng token non-admin"
    ],
    "expected": "Menu quản trị bị ẩn; truy cập URL bị chặn/redirect; API trả 403 Forbidden (không 200); không lộ dữ liệu cấu hình.",
    "evidence": [
     {
      "name": "TC-SYS-006__s01__permission",
      "caption": "Menu quản trị bị ẩn với non-admin",
      "uiState": "permission"
     },
     {
      "name": "TC-SYS-006__s02__error",
      "caption": "API trả 403 khi non-admin gọi",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216",
     "#264"
    ]
   },
   {
    "id": "TC-SYS-007",
    "title": "Xem & lọc Audit log theo user/hành động/bảng/khoảng ngày (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Admin",
    "preconditions": "Đã có sẵn nhiều bản ghi AuditLogs (vd sau khi sửa cấu hình ở TC-SYS-002).",
    "steps": [
     "Vào /v2/admin tab 'Audit log'",
     "Quan sát danh sách log",
     "Lọc theo 1 user",
     "Lọc theo action=Update",
     "Lọc theo khoảng ngày hôm nay"
    ],
    "expected": "Danh sách hiển thị Thời gian/Người dùng/Hành động/Bảng/Bản ghi/IP; các bộ lọc trả đúng tập con; thời gian format đúng vi-VN.",
    "evidence": [
     {
      "name": "TC-SYS-007__s01__list",
      "caption": "Danh sách Audit log",
      "uiState": "list"
     },
     {
      "name": "TC-SYS-007__s02__filter",
      "caption": "Audit log lọc theo user và action",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#282",
     "#230"
    ]
   },
   {
    "id": "TC-SYS-008",
    "title": "Xem chi tiết diff old/new của một bản ghi Audit (data-consistency)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Admin",
    "preconditions": "Sửa 1 cấu hình ở TC-SYS-002 trước; biết giá trị cũ và mới.",
    "steps": [
     "Vào tab Audit log",
     "Mở chi tiết bản ghi của lần sửa cấu hình đó (DrawerShell)",
     "Đối chiếu old value/new value với thao tác đã làm"
    ],
    "expected": "Drawer hiển thị đúng người thực hiện (user thật ≠ Guid.Empty), bảng SystemConfigs, giá trị cũ và mới khớp chính xác thao tác TC-SYS-002, timestamp đúng.",
    "evidence": [
     {
      "name": "TC-SYS-008__s01__drawer",
      "caption": "Drawer chi tiết diff old/new của audit",
      "uiState": "drawer"
     }
    ],
    "notes": "Patient-safety/pháp lý: AuditLog phải truy vết chính xác.",
    "refIssues": [
     "#282"
    ]
   },
   {
    "id": "TC-SYS-009",
    "title": "Audit log là append-only — không cho sửa/xóa (state)",
    "category": "state",
    "priority": "P0",
    "role": "Admin",
    "preconditions": "Đang ở tab Audit log có dữ liệu.",
    "steps": [
     "Quan sát danh sách audit có nút Sửa/Xóa không",
     "Thử gọi API DELETE/PUT lên /api/audit/{id} (nếu đoán được)",
     "Quan sát phản hồi"
    ],
    "expected": "Không có thao tác sửa/xóa trên UI; API mutate audit trả 403/404/405 (không 200); bản ghi audit bất biến.",
    "evidence": [
     {
      "name": "TC-SYS-009__s01__list",
      "caption": "Audit log không có nút sửa/xóa",
      "uiState": "list"
     },
     {
      "name": "TC-SYS-009__s02__error",
      "caption": "API sửa/xóa audit bị từ chối",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#282",
     "#264"
    ]
   },
   {
    "id": "TC-SYS-010",
    "title": "Audit log với khoảng ngày tương lai / không có dữ liệu (edge + ui)",
    "category": "edge",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Tab Audit log.",
    "steps": [
     "Lọc khoảng ngày trong tương lai (vd 01/01/2030 - 31/12/2030)",
     "Lọc khoảng ngày rất xa quá khứ (vd năm 1990)",
     "Quan sát kết quả"
    ],
    "expected": "Trả về rỗng và hiển thị empty state đúng ('Không có nhật ký'); không lỗi crash; không loading vô hạn.",
    "evidence": [
     {
      "name": "TC-SYS-010__s01__empty",
      "caption": "Empty state audit khi khoảng ngày tương lai",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#282"
    ]
   },
   {
    "id": "TC-SYS-011",
    "title": "Xem & lọc Nhật ký hệ thống theo level (happy + ui)",
    "category": "happy",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Có dữ liệu SystemLogs nhiều mức.",
    "steps": [
     "Mở màn Nhật ký hệ thống",
     "Lọc level=Error",
     "Mở 1 bản ghi xem stacktrace trong drawer"
    ],
    "expected": "Danh sách hiển thị Thời gian/Level/Nguồn/Message; badge màu theo level; lọc đúng; drawer hiển thị stacktrace đầy đủ không bị cắt.",
    "evidence": [
     {
      "name": "TC-SYS-011__s01__list",
      "caption": "Nhật ký hệ thống lọc theo level Error",
      "uiState": "list"
     },
     {
      "name": "TC-SYS-011__s02__drawer",
      "caption": "Drawer xem stacktrace",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#230"
    ]
   },
   {
    "id": "TC-SYS-012",
    "title": "Nhật ký hệ thống không lộ secret/PII trong message (security)",
    "category": "security",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Có log từ tích hợp ngoài (BHXH/Zalo/PACS).",
    "steps": [
     "Lọc nguồn các tích hợp ngoài",
     "Mở vài message/stacktrace",
     "Kiểm tra có lộ token/mật khẩu/connection string không"
    ],
    "expected": "Message/stacktrace không chứa secret thô, mật khẩu DB, token; PII bệnh nhân không lộ thừa.",
    "evidence": [
     {
      "name": "TC-SYS-012__s01__drawer",
      "caption": "Stacktrace không lộ secret/PII",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#264"
    ]
   },
   {
    "id": "TC-SYS-013",
    "title": "Nhận & đánh dấu đã đọc thông báo in-app (happy + state)",
    "category": "happy",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Có Notifications chưa đọc cho user hiện tại.",
    "steps": [
     "Quan sát badge số chưa đọc ở chuông topbar",
     "Mở dropdown thông báo",
     "Bấm 1 thông báo / 'Đánh dấu đã đọc'",
     "Bấm 'Đọc tất cả'"
    ],
    "expected": "Badge giảm đúng số sau mỗi lần đọc; trạng thái chuyển chưa-đọc → đã-đọc; 'Đọc tất cả' đưa badge về 0; trạng thái không quay ngược lại đã-đọc→chưa-đọc.",
    "evidence": [
     {
      "name": "TC-SYS-013__s01__dropdown",
      "caption": "Dropdown thông báo có mục chưa đọc + badge",
      "uiState": "dropdown"
     },
     {
      "name": "TC-SYS-013__s02__success",
      "caption": "Badge về 0 sau khi đọc tất cả",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#230"
    ]
   },
   {
    "id": "TC-SYS-014",
    "title": "Empty state khi không có thông báo (ui)",
    "category": "ui",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "Tài khoản chưa có thông báo nào.",
    "steps": [
     "Mở dropdown/trang thông báo của tài khoản trống",
     "Quan sát"
    ],
    "expected": "Hiển thị empty state 'Không có thông báo' rõ ràng, badge không hiển thị số; không lỗi.",
    "evidence": [
     {
      "name": "TC-SYS-014__s01__empty",
      "caption": "Empty state không có thông báo",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#230"
    ]
   },
   {
    "id": "TC-SYS-015",
    "title": "Người dùng A không xem được thông báo của người dùng B (security/IDOR)",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ (user A)",
    "preconditions": "Biết một notificationId thuộc user B.",
    "steps": [
     "Đăng nhập user A",
     "Lấy danh sách thông báo của A",
     "Gọi trực tiếp API GET /api/notifications/{idCuaB} hoặc mark-read trên id của B"
    ],
    "expected": "API trả 403/404 cho notification không thuộc A; A không đọc/đánh-dấu-đã-đọc được thông báo của B.",
    "evidence": [
     {
      "name": "TC-SYS-015__s01__error",
      "caption": "API chặn truy cập thông báo người khác (IDOR)",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#264"
    ]
   },
   {
    "id": "TC-SYS-016",
    "title": "Danh sách tác vụ định kỳ & chạy thủ công 1 job (happy)",
    "category": "happy",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Có ScheduledTasks; 1 job an toàn để chạy thủ công.",
    "steps": [
     "Mở màn Tác vụ định kỳ",
     "Quan sát cột Tên/Cron/Lần chạy cuối/Kết quả/Trạng thái",
     "Bấm 'Chạy ngay' 1 job",
     "Xác nhận confirm",
     "Quan sát kết quả"
    ],
    "expected": "Bảng hiển thị đủ thông tin; có confirm trước khi chạy; sau chạy cập nhật 'Lần chạy cuối' + kết quả; trạng thái Running → Success/Failed; ghi AuditLog/SystemLog.",
    "evidence": [
     {
      "name": "TC-SYS-016__s01__list",
      "caption": "Danh sách tác vụ định kỳ",
      "uiState": "list"
     },
     {
      "name": "TC-SYS-016__s02__confirm",
      "caption": "Confirm chạy job thủ công",
      "uiState": "confirm"
     },
     {
      "name": "TC-SYS-016__s03__success",
      "caption": "Kết quả chạy job thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#230"
    ]
   },
   {
    "id": "TC-SYS-017",
    "title": "Bật/tắt tác vụ định kỳ + chặn cron không hợp lệ (state + validation)",
    "category": "validation",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Mở màn Tác vụ định kỳ.",
    "steps": [
     "Toggle tắt 1 job đang bật → quan sát trạng thái",
     "Mở sửa lịch, nhập biểu thức cron sai cú pháp → Lưu",
     "Nhập cron hợp lệ → Lưu"
    ],
    "expected": "Toggle đổi trạng thái Enabled↔Disabled và persist; cron sai bị chặn với lỗi rõ; cron đúng lưu thành công và cập nhật lịch chạy kế tiếp.",
    "evidence": [
     {
      "name": "TC-SYS-017__s01__validation",
      "caption": "Lỗi cron không hợp lệ",
      "uiState": "validation"
     },
     {
      "name": "TC-SYS-017__s02__list",
      "caption": "Job chuyển trạng thái sau toggle",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#230"
    ]
   },
   {
    "id": "TC-SYS-018",
    "title": "Xem Log SMS & gửi lại bản thất bại (happy + integration)",
    "category": "integration",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Có SmsLogs gồm bản Failed.",
    "steps": [
     "Mở màn Log SMS",
     "Lọc trạng thái Failed",
     "Mở 1 bản xem mã lỗi (drawer)",
     "Bấm 'Gửi lại'"
    ],
    "expected": "Danh sách hiển thị Thời gian/Số nhận/Trạng thái/NCC; drawer hiện nội dung+mã lỗi; gửi lại tạo bản ghi mới Pending/Sent; có toast.",
    "evidence": [
     {
      "name": "TC-SYS-018__s01__list",
      "caption": "Log SMS lọc trạng thái Failed",
      "uiState": "list"
     },
     {
      "name": "TC-SYS-018__s02__drawer",
      "caption": "Chi tiết SMS + mã lỗi",
      "uiState": "drawer"
     },
     {
      "name": "TC-SYS-018__s03__success",
      "caption": "Toast gửi lại SMS thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#230"
    ]
   },
   {
    "id": "TC-SYS-019",
    "title": "Xem Log Zalo OA & payload/response cổng Zalo (happy + integration)",
    "category": "integration",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Có ZaloNotificationLogs.",
    "steps": [
     "Vào /v2/zalo-notifications",
     "Lọc theo trạng thái/template",
     "Mở 1 bản ghi xem payload + response Zalo (drawer)",
     "Gửi lại 1 bản lỗi"
    ],
    "expected": "Danh sách + filter đúng; drawer hiển thị payload gửi và response từ cổng Zalo; gửi lại hoạt động; mock/prod split không lộ token.",
    "evidence": [
     {
      "name": "TC-SYS-019__s01__list",
      "caption": "Log Zalo OA danh sách + filter",
      "uiState": "list"
     },
     {
      "name": "TC-SYS-019__s02__drawer",
      "caption": "Drawer payload + response Zalo",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#230",
     "#264"
    ]
   },
   {
    "id": "TC-SYS-020",
    "title": "Cảnh báo nghiệp vụ — xem theo trạng thái & xác nhận/giải quyết (happy + state)",
    "category": "state",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Có BusinessAlerts ở trạng thái New.",
    "steps": [
     "Mở màn Cảnh báo nghiệp vụ",
     "Chọn StatusTab 'New'",
     "Mở 1 cảnh báo → bấm 'Xác nhận' (Acknowledge)",
     "Sau đó bấm 'Giải quyết' (Resolve)",
     "Thử Resolve trực tiếp 1 cảnh báo đã Resolved"
    ],
    "expected": "Chuyển trạng thái hợp lệ New → Acknowledged → Resolved cập nhật đúng tab; chặn chuyển trạng thái không hợp lệ (Resolved → Resolved/New) với thông báo; badge mức độ đúng màu.",
    "evidence": [
     {
      "name": "TC-SYS-020__s01__tab",
      "caption": "Cảnh báo nghiệp vụ theo StatusTab New",
      "uiState": "tab"
     },
     {
      "name": "TC-SYS-020__s02__success",
      "caption": "Cảnh báo chuyển sang Resolved",
      "uiState": "success"
     },
     {
      "name": "TC-SYS-020__s03__error",
      "caption": "Chặn chuyển trạng thái không hợp lệ",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#230"
    ]
   },
   {
    "id": "TC-SYS-021",
    "title": "Sự cố bảo mật — tự ghi nhận khi đăng nhập sai nhiều lần (integration + security)",
    "category": "security",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Biết tài khoản tồn tại; màn SecurityIncidents truy cập được.",
    "steps": [
     "Đăng xuất, nhập sai mật khẩu nhiều lần liên tiếp (vd 5+ lần)",
     "Đăng nhập lại admin",
     "Mở màn Sự cố bảo mật",
     "Tìm sự cố loại 'đăng nhập sai nhiều lần'"
    ],
    "expected": "Hệ thống ghi SecurityIncident với loại/IP/thời điểm/tài khoản liên quan; hiển thị trong danh sách; mức độ phù hợp.",
    "evidence": [
     {
      "name": "TC-SYS-021__s01__list",
      "caption": "Sự cố bảo mật đăng nhập sai nhiều lần được ghi",
      "uiState": "list"
     },
     {
      "name": "TC-SYS-021__s02__drawer",
      "caption": "Chi tiết sự cố bảo mật",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#264"
    ]
   },
   {
    "id": "TC-SYS-022",
    "title": "Sự cố bảo mật — cập nhật trạng thái điều tra (state)",
    "category": "state",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Có SecurityIncidents ở trạng thái mở.",
    "steps": [
     "Mở 1 sự cố",
     "Đổi trạng thái New → Đang điều tra → Đã xử lý",
     "Thử quay ngược trạng thái nếu không hợp lệ"
    ],
    "expected": "Chuyển trạng thái hợp lệ cập nhật + lưu; chặn chuyển không hợp lệ; mỗi lần đổi ghi AuditLog.",
    "evidence": [
     {
      "name": "TC-SYS-022__s01__drawer",
      "caption": "Drawer cập nhật trạng thái điều tra sự cố",
      "uiState": "drawer"
     },
     {
      "name": "TC-SYS-022__s02__success",
      "caption": "Trạng thái điều tra cập nhật thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#264"
    ]
   },
   {
    "id": "TC-SYS-023",
    "title": "An ninh thiết bị đầu cuối — KPI & lọc theo trạng thái (happy + ui)",
    "category": "happy",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Có EndpointDevices nhiều trạng thái.",
    "steps": [
     "Vào /v2/endpoint-security",
     "Quan sát KpiStrip (tổng/online/offline/không tuân thủ)",
     "Chọn StatusTab 'offline'",
     "Lọc theo khoa",
     "Mở chi tiết 1 thiết bị (drawer)"
    ],
    "expected": "KPI tính đúng tổng; tab/filter trả đúng tập con; drawer hiển thị IP/MAC/phòng/lần kiểm tra cuối + danh sách phần mềm đã cài.",
    "evidence": [
     {
      "name": "TC-SYS-023__s01__list",
      "caption": "Trang An ninh thiết bị + KpiStrip",
      "uiState": "list"
     },
     {
      "name": "TC-SYS-023__s02__tab",
      "caption": "Lọc thiết bị offline",
      "uiState": "tab"
     },
     {
      "name": "TC-SYS-023__s03__drawer",
      "caption": "Drawer chi tiết thiết bị + phần mềm đã cài",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#230"
    ]
   },
   {
    "id": "TC-SYS-024",
    "title": "KPI thiết bị nhất quán với dữ liệu bảng (data-consistency)",
    "category": "data-consistency",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Trang /v2/endpoint-security có dữ liệu.",
    "steps": [
     "Ghi nhận số KPI online/offline/không-tuân-thủ",
     "Đếm thủ công số dòng tương ứng khi lọc từng StatusTab",
     "Đối chiếu"
    ],
    "expected": "Số KPI khớp chính xác số dòng khi lọc từng trạng thái; không lệch.",
    "evidence": [
     {
      "name": "TC-SYS-024__s01__list",
      "caption": "Đối chiếu KPI với số dòng theo trạng thái",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#230"
    ]
   },
   {
    "id": "TC-SYS-025",
    "title": "Inventory phần mềm đã cài & cờ phần mềm cấm (happy + ui)",
    "category": "happy",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Có InstalledSoftwareItems gắn EndpointDevices, gồm phần mềm bị cấm.",
    "steps": [
     "Mở tab/drawer Phần mềm đã cài",
     "Lọc theo thiết bị",
     "Lọc phần mềm bị cấm",
     "Quan sát badge hợp lệ/cấm"
    ],
    "expected": "Danh sách hiển thị Phần mềm/Phiên bản/NPH/Thiết bị/Trạng thái; lọc đúng; badge 'cấm' nổi bật; liên kết đúng thiết bị.",
    "evidence": [
     {
      "name": "TC-SYS-025__s01__list",
      "caption": "Inventory phần mềm đã cài + badge cấm",
      "uiState": "list"
     },
     {
      "name": "TC-SYS-025__s02__filter",
      "caption": "Lọc phần mềm bị cấm",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#230"
    ]
   },
   {
    "id": "TC-SYS-026",
    "title": "Sao lưu thủ công & cảnh báo phục hồi nguy hiểm (happy + negative)",
    "category": "negative",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Vào /v2/backup-management.",
    "steps": [
     "Bấm 'Sao lưu ngay'",
     "Quan sát loading + kết quả trong lịch sử backup",
     "Bấm 'Phục hồi' 1 bản backup",
     "Quan sát hộp confirm cảnh báo"
    ],
    "expected": "Backup thủ công hiển thị loading rồi thêm dòng lịch sử với thời gian/dung lượng/kết quả; phục hồi BẮT BUỘC confirm cảnh báo nguy hiểm (ghi đè dữ liệu) trước khi thực thi.",
    "evidence": [
     {
      "name": "TC-SYS-026__s01__loading",
      "caption": "Loading khi sao lưu thủ công",
      "uiState": "loading"
     },
     {
      "name": "TC-SYS-026__s02__success",
      "caption": "Lịch sử backup thêm dòng thành công",
      "uiState": "success"
     },
     {
      "name": "TC-SYS-026__s03__confirm",
      "caption": "Confirm cảnh báo phục hồi nguy hiểm",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#230"
    ]
   },
   {
    "id": "TC-SYS-027",
    "title": "Tương thích dark/light mode toàn phân hệ hệ thống (ui)",
    "category": "ui",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Mở các màn /v2/admin, /v2/endpoint-security, /v2/zalo-notifications.",
    "steps": [
     "Mở từng màn ở light mode",
     "Bật dark mode bằng toggle topbar v2",
     "Quan sát bảng/badge/drawer/modal",
     "Kiểm tra độ tương phản chữ"
    ],
    "expected": "Mọi thành phần (DataTable, StatusBadge, DrawerShell, ModalShell, KpiStrip) hiển thị đúng ở cả 2 theme; không chữ trắng-nền-trắng; tương phản đạt; tiếng Việt có dấu không vỡ.",
    "evidence": [
     {
      "name": "TC-SYS-027__s01__list",
      "caption": "Trang quản trị ở dark mode",
      "uiState": "list"
     },
     {
      "name": "TC-SYS-027__s02__drawer",
      "caption": "Drawer ở dark mode tương phản đạt",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#230"
    ]
   },
   {
    "id": "TC-SYS-028",
    "title": "Empty/Loading/Error state các màn hệ thống (ui)",
    "category": "ui",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Có thể giả lập backend chậm/lỗi (tắt API hoặc throttle).",
    "steps": [
     "Mở 1 màn hệ thống khi backend còn loading → quan sát",
     "Tắt/làm lỗi API rồi reload → quan sát error state",
     "Mở màn với bộ lọc không khớp dữ liệu → quan sát empty state"
    ],
    "expected": "Hiển thị skeleton/loading khi tải; error state có nút thử lại khi API lỗi (không màn trắng/spinner vô hạn); empty state rõ ràng khi không có dữ liệu.",
    "evidence": [
     {
      "name": "TC-SYS-028__s01__loading",
      "caption": "Loading state khi tải dữ liệu",
      "uiState": "loading"
     },
     {
      "name": "TC-SYS-028__s02__error",
      "caption": "Error state khi API lỗi",
      "uiState": "error"
     },
     {
      "name": "TC-SYS-028__s03__empty",
      "caption": "Empty state khi lọc không khớp",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#230"
    ]
   },
   {
    "id": "TC-SYS-029",
    "title": "XSS ở field ghi chú/giá trị cấu hình & sự cố (security)",
    "category": "security",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Có field text tự do (giá trị cấu hình, ghi chú sự cố bảo mật).",
    "steps": [
     "Nhập payload XSS vào giá trị cấu hình hoặc ghi chú sự cố, vd <script>alert(1)</script> và <img src=x onerror=alert(1)>",
     "Lưu",
     "Mở lại bản ghi/danh sách hiển thị field đó"
    ],
    "expected": "Payload được escape/hiển thị literal, KHÔNG thực thi script; không popup alert; lưu/đọc an toàn.",
    "evidence": [
     {
      "name": "TC-SYS-029__s01__detail",
      "caption": "Payload XSS hiển thị literal không thực thi",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#264"
    ]
   },
   {
    "id": "TC-SYS-030",
    "title": "Giá trị biên & ký tự đặc biệt/dấu tiếng Việt ở cấu hình (edge)",
    "category": "edge",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Mở modal sửa 1 cấu hình kiểu chuỗi.",
    "steps": [
     "Nhập chuỗi rất dài (vd 1000+ ký tự) → Lưu",
     "Nhập tiếng Việt có dấu + emoji + ký tự đặc biệt (& < > ' \" /) → Lưu",
     "Nhập giá trị số 0 và số âm cho cấu hình số → Lưu",
     "Mở lại xem hiển thị"
    ],
    "expected": "Hệ thống xử lý đúng: hoặc lưu trọn vẹn (encode đúng tiếng Việt, không mất dấu/lỗi font) hoặc chặn vượt độ dài với lỗi rõ; số 0/âm xử lý theo ràng buộc field; không crash.",
    "evidence": [
     {
      "name": "TC-SYS-030__s01__validation",
      "caption": "Chặn/giới hạn chuỗi quá dài",
      "uiState": "validation"
     },
     {
      "name": "TC-SYS-030__s02__detail",
      "caption": "Tiếng Việt có dấu + ký tự đặc biệt lưu đúng",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#260"
    ]
   },
   {
    "id": "TC-SYS-031",
    "title": "Anonymous endpoint của hệ thống bị chặn ngoài Development (security)",
    "category": "security",
    "priority": "P0",
    "role": "Khách (không token)",
    "preconditions": "Biết các endpoint quản trị/seed/dev (tham chiếu fix #180 gate dev/seed Development-only).",
    "steps": [
     "Không đăng nhập (không gửi Bearer token)",
     "Gọi API quản trị hệ thống: GET /api/system/configs, /api/audit, /api/notifications",
     "Gọi endpoint seed/dev nếu biết"
    ],
    "expected": "Mọi endpoint quản trị trả 401 Unauthorized khi không token; endpoint dev/seed trả 404 ở môi trường non-Development; không lộ dữ liệu/cấu hình.",
    "evidence": [
     {
      "name": "TC-SYS-031__s01__error",
      "caption": "API quản trị trả 401 khi không token",
      "uiState": "error"
     }
    ],
    "notes": "Tham chiếu commit #180 (gate dev/seed Development-only) và #181 (path-traversal).",
    "refIssues": [
     "#264"
    ]
   }
  ],
  "ui_state_checklist": [
   "list — danh sách các bảng (cấu hình/audit/system log/SMS/Zalo/cảnh báo/sự cố/thiết bị/phần mềm)",
   "filter — kết quả lọc theo key/level/trạng thái/thiết bị/phần mềm cấm",
   "tab — StatusTabs trạng thái (cảnh báo, sự cố, thiết bị online/offline)",
   "dropdown — dropdown thông báo topbar",
   "modal — modal sửa cấu hình / sửa lịch cron",
   "drawer — chi tiết audit diff, stacktrace, thiết bị, sự cố, payload Zalo/SMS",
   "validation — lỗi inline field (bắt buộc/sai kiểu/range/cron sai/chuỗi quá dài)",
   "empty — không có dữ liệu (thông báo/audit/lọc không khớp)",
   "loading — đang tải / đang sao lưu",
   "error — API lỗi / 401 / 403 / 404 / IDOR bị chặn",
   "confirm — xác nhận chạy job thủ công / phục hồi backup nguy hiểm",
   "success — toast lưu/gửi lại/chạy job/đổi trạng thái thành công",
   "detail — hiển thị field tự do (XSS literal, tiếng Việt có dấu, secret masked)",
   "permission — menu ẩn / chặn truy cập theo vai trò (dark/light parity nằm trong list+drawer)"
  ],
  "gaps": [
   "Chưa rõ phân quyền chi tiết từng bảng (ai được xem AuditLog vs SystemLog vs SecurityIncident) — cần map theo ma trận quyền #216 để bổ sung test permission per-tab.",
   "Chưa xác định backend có thật sự persist hay stub cho một số bảng (BusinessAlerts/SecurityIncidents/EndpointDevices/InstalledSoftwareItems) — cần verify persistence trước khi khẳng định data-consistency (theo memory 'B-items stub not backend-ready').",
   "Cơ chế tự sinh SecurityIncident (đăng nhập sai nhiều lần / phát hiện IDOR) có thể chưa được wire — nếu chưa có nên tạo task fix liên kết.",
   "Retention/xoay vòng log (AuditLogs/SystemLogs khối lượng lớn) chưa có test về phân trang hiệu năng & archiving — cần bổ sung test tải lớn (liên quan his-be-scalability).",
   "Đa cơ sở/đa chi nhánh (HospitalBranches): chưa kiểm tra cấu hình/log/audit có cô lập theo chi nhánh không (rủi ro lộ chéo dữ liệu giữa branch).",
   "Tích hợp SignalR đẩy thông báo realtime: chưa có test cho push realtime vs polling fallback của Notifications/BusinessAlerts.",
   "ScheduledTasks chạy đồng thời 2 instance (Cloud Run multi-instance) — cần test idempotent claim chống chạy trùng job.",
   "Chưa có test khôi phục backup thực sự (chỉ confirm UI) — phục hồi DB là thao tác nguy hiểm, cần kịch bản kiểm soát riêng có môi trường cô lập."
  ]
 }
]);
