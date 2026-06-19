window.TP.modules.push(...[
 {
  "id": "reception",
  "code": "RCP",
  "layer": "clin",
  "ic": "🛎️",
  "nm": "Tiếp đón & Hàng đợi",
  "gh": [
   "#239",
   "#240",
   "#241",
   "#217"
  ],
  "gap": false,
  "module_id": "reception",
  "summary": "Phân hệ \"Tiếp đón & Hàng đợi\" (RCP, lớp lâm sàng) xử lý check-in/đăng ký khám, cấp số thứ tự, bảng gọi số và màn hình chờ. Quan hệ nghiệp vụ: Appointments ⟶ Queues/QueueTickets ⟶ tạo MedicalRecord (vào khám). Các bảng gốc (data.js): Queues, QueueTickets, QueueConfigurations, DisplayScreens, WaitingRoomDisplayConfigs, CameraConfigurations, Appointments, AppointmentServices, DoctorSchedules, FollowUpAppointments; liên kết chéo patient/opd/billing/portal. Màn chính (FE v2 đã có thật tại /v2/reception): trang Tiếp đón gồm KpiStrip + 3 TopTabs (Hàng đợi tiếp đón / Bảng gọi số / Thống kê) + StatusTabs 5 trạng thái (Chờ tiếp đón · Đang khám · Chờ KQ CLS · Khám xong · Vắng/bỏ qua), DataTable + bộ lọc, Drawer chi tiết phiên + panel vân tay, modal Đăng ký mới 4 bước, Tra cứu BHYT, Tìm BN cũ, Đổi phòng, Thu phí; cùng trang Quản lý lịch đặt khám (/v2/booking-management).",
  "screens": [
   {
    "name": "Hàng đợi tiếp đón (tab queue)",
    "desc": "Bảng phiên tiếp đón trong ngày: KpiStrip (Hôm nay/Đang chờ/Đã đăng ký/Có BHYT/Không đến/Chờ TB), StatusTabs 5 trạng thái có badge đếm, ô tìm kiếm (BN/mã/SĐT/CCCD/BHYT/STT), bộ lọc Khoa·Ưu tiên·Hình thức·BHYT, nút Bỏ lọc/Xuất CSV, chọn nhiều dòng để In hàng loạt, DataTable cột STT/Bệnh nhân/Đến lúc/Khoa·Phòng/Hình thức/BHYT/Ưu tiên/Trạng thái + cột thao tác theo trạng thái, phân trang.",
    "route_guess": "/v2/reception",
    "elements": [
     "KpiStrip 6 chỉ số",
     "TopTabs queue/now/stats",
     "StatusTabs (waiting/serving/waitresult/completed/noshow)",
     "SearchBox",
     "Filter Khoa",
     "Filter Ưu tiên",
     "Filter Hình thức",
     "Filter BHYT",
     "Btn Bỏ lọc",
     "Btn Xuất",
     "Bulk In hàng loạt",
     "DataTable",
     "ActBtn Bắt đầu khám/Gọi lại/Hoàn thành/Thu phí/Đổi phòng/In phiếu/Vắng mặt",
     "Pager",
     "empty state",
     "loading state"
    ]
   },
   {
    "name": "Bảng gọi số (tab now)",
    "desc": "Lưới phòng khám, mỗi phòng hiển thị số đang gọi (font lớn), BN hiện tại + giới/tuổi/lý do, bác sĩ, đếm chờ/đã khám, số tiếp theo.",
    "route_guess": "/v2/reception",
    "elements": [
     "grid phòng",
     "số đang gọi",
     "BN hiện tại",
     "chip bác sĩ",
     "đếm chờ/đã khám",
     "số tiếp theo",
     "empty Chưa có phòng nào"
    ]
   },
   {
    "name": "Thống kê (tab stats)",
    "desc": "Biểu đồ cột theo giờ/theo khoa từ danh sách phiên + phòng.",
    "route_guess": "/v2/reception",
    "elements": [
     "bar chart theo giờ",
     "bar chart theo khoa"
    ]
   },
   {
    "name": "Drawer chi tiết phiên",
    "desc": "Mở khi click dòng: tiêu đề STT + tên BN, sub khoa·phòng·giờ đến, body VisitDrawerBody (thông tin phiên + lịch sử khám), panel Vân tay tiếp đón (upload ảnh→base64 hoặc cờ không thu thập được), footer In phiếu + Bắt đầu khám/Gọi lại/Hoàn thành theo trạng thái.",
    "route_guess": "/v2/reception",
    "elements": [
     "DrawerShell",
     "VisitDrawerBody",
     "FingerprintPanel checkbox không thu thập",
     "input file ảnh vân tay",
     "Btn Lưu vân tay",
     "footer In phiếu/Bắt đầu khám/Hoàn thành"
    ]
   },
   {
    "name": "Modal Đăng ký tiếp đón mới (4 bước)",
    "desc": "Wizard: B1 Bệnh nhân (Họ tên*, SĐT*, Tuổi*, Giới, CCCD*, Địa chỉ; có nút Từ lịch đặt khám); B2 BHYT & hình thức (8 hình thức: Khám thường/BHYT/dịch vụ/yêu cầu/Tái khám/Cấp cứu/Tư vấn/Tiêm chủng, xác thực thẻ BHYT, hiện phí); B3 Khoa & lý do (chọn phòng chính + phòng khám thêm đa chuyên khoa, Lý do khám*, Mức ưu tiên); B4 Xác nhận tóm tắt + phí.",
    "route_guess": "/v2/reception",
    "elements": [
     "ModalShell",
     "stepper 4 bước",
     "Input Họ tên",
     "Input SĐT",
     "InputNumber Tuổi",
     "Radio Giới",
     "Input CCCD",
     "Input Địa chỉ",
     "BookingPickerModal",
     "radio hình thức khám",
     "Input số thẻ BHYT",
     "Btn Xác thực BHYT",
     "thẻ BHYT hợp lệ/không hợp lệ",
     "radio chọn phòng",
     "checkbox phòng khám thêm",
     "TextArea Lý do",
     "Radio ưu tiên",
     "summary xác nhận",
     "Btn Đăng ký"
    ]
   },
   {
    "name": "Modal Tra cứu thẻ BHYT",
    "desc": "Nhập số thẻ + tên (tùy chọn) → tra cứu, hiển thị kết quả: trạng thái (Hợp lệ/Hết hạn/Thẻ bị khóa/Không hợp lệ), số thẻ, họ tên, nơi KCB, giá trị đến, tuyến, mức hưởng, cảnh báo, thông báo lỗi.",
    "route_guess": "/v2/reception",
    "elements": [
     "ModalShell",
     "Input số thẻ",
     "Input họ tên",
     "Btn Tra cứu",
     "StatusBadge kết quả",
     "rec-kv chi tiết",
     "warnings",
     "errorMessage"
    ]
   },
   {
    "name": "Modal Tìm BN cũ",
    "desc": "Tìm bệnh nhân đã có hồ sơ để tự điền/lọc danh sách (F4).",
    "route_guess": "/v2/reception",
    "elements": [
     "ModalShell",
     "ô tìm",
     "danh sách BN",
     "chọn BN"
    ]
   },
   {
    "name": "Modal Đổi phòng khám",
    "desc": "Hiển thị BN + phòng hiện tại, chọn phòng mới* (Select có search), nhập lý do (tùy chọn).",
    "route_guess": "/v2/reception",
    "elements": [
     "ModalShell",
     "thông tin phiên",
     "Select phòng mới",
     "TextArea lý do",
     "Btn Đổi phòng"
    ]
   },
   {
    "name": "Modal Thu phí khám",
    "desc": "Hiển thị BN + hình thức, nhập Số tiền thu*, Phương thức (Tiền mặt/Thẻ/Chuyển khoản), Tiền khách đưa (tiền mặt) hoặc Mã giao dịch (khác), tính tiền thối.",
    "route_guess": "/v2/reception",
    "elements": [
     "ModalShell",
     "InputNumber số tiền",
     "Select phương thức",
     "InputNumber tiền khách đưa",
     "Input mã giao dịch",
     "hiển thị tiền thối",
     "Btn Xác nhận thu"
    ]
   },
   {
    "name": "Quản lý lịch đặt khám",
    "desc": "Danh sách lịch hẹn/đặt khám (Appointments/DoctorSchedules), liên kết check-in từ lịch.",
    "route_guess": "/v2/booking-management",
    "elements": [
     "bảng lịch hẹn",
     "trạng thái lịch",
     "check-in từ lịch"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-RCP-001",
    "title": "Đăng ký tiếp đón mới (khám dịch vụ) thành công end-to-end",
    "category": "happy",
    "priority": "P0",
    "role": "Tiếp đón",
    "preconditions": "Đăng nhập admin/Admin@123, ở /v2/reception, có ít nhất 1 phòng khám khả dụng (getRoomOverview trả phòng).",
    "steps": [
     "Bấm 'Đăng ký mới' (hoặc F2)",
     "B1: nhập Họ tên 'Nguyễn Văn A', SĐT '0912345678', Tuổi 30, Giới Nam, CCCD '012345678901', bấm Tiếp tục",
     "B2: chọn hình thức 'Khám dịch vụ' (250.000 ₫), bấm Tiếp tục",
     "B3: chọn 1 phòng khám chính, nhập Lý do 'Đau đầu 2 ngày', để Ưu tiên Thường, bấm Tiếp tục",
     "B4: kiểm tra tóm tắt, bấm Đăng ký"
    ],
    "expected": "Toast 'Đã đăng ký · Nguyễn Văn A'; modal đóng; danh sách reload và xuất hiện 1 phiên mới trạng thái 'Chờ tiếp đón', cấp số thứ tự, KPI 'Hôm nay' tăng 1.",
    "evidence": [
     {
      "name": "TC-RCP-001__s02__form",
      "caption": "Bước 1 wizard điền thông tin bệnh nhân",
      "uiState": "form"
     },
     {
      "name": "TC-RCP-001__s04__form",
      "caption": "Bước 4 màn xác nhận trước khi đăng ký",
      "uiState": "form"
     },
     {
      "name": "TC-RCP-001__s05__success",
      "caption": "Toast đăng ký thành công + dòng mới trong bảng",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239",
     "#217"
    ],
    "notes": "Gọi registerFeePatient; QueueTicket do backend tạo để check-in/in phiếu chạy được."
   },
   {
    "id": "TC-RCP-002",
    "title": "Đăng ký BHYT có xác thực thẻ hợp lệ thành công",
    "category": "happy",
    "priority": "P0",
    "role": "Tiếp đón",
    "preconditions": "Đăng nhập, /v2/reception, mở modal Đăng ký mới, có phòng khám.",
    "steps": [
     "B1 điền BN hợp lệ, Tiếp tục",
     "B2 chọn 'Khám BHYT', nhập số thẻ BHYT hợp lệ, bấm 'Xác thực'",
     "Chờ thẻ báo Hợp lệ (hiện hạn + mức hưởng), bấm Tiếp tục",
     "B3 chọn phòng + lý do, Tiếp tục",
     "B4 xác nhận phí = Miễn phí (BHYT), bấm Đăng ký"
    ],
    "expected": "Thẻ hiện card xanh 'Hợp lệ' với hạn + mức hưởng; phí B4 = 0 ₫ (Miễn phí); đăng ký thành công qua registerInsurancePatient, toast thành công.",
    "evidence": [
     {
      "name": "TC-RCP-002__s02__success",
      "caption": "Thẻ BHYT xác thực hợp lệ hiện hạn và mức hưởng",
      "uiState": "success"
     },
     {
      "name": "TC-RCP-002__s04__form",
      "caption": "Bước xác nhận phí Miễn phí do BHYT",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#239",
     "#217"
    ]
   },
   {
    "id": "TC-RCP-003",
    "title": "Đăng ký đa chuyên khoa (phòng chính + phòng khám thêm) cấp số ở tất cả phòng",
    "category": "happy",
    "priority": "P1",
    "role": "Tiếp đón",
    "preconditions": "Có >=2 phòng khám khả dụng; hình thức KHÔNG phải BHYT.",
    "steps": [
     "Mở Đăng ký mới, B1 điền BN, B2 chọn 'Khám dịch vụ'",
     "B3 chọn phòng chính + tick 1-2 phòng khám thêm",
     "Nhập lý do, Tiếp tục",
     "B4 kiểm tra dòng 'Phòng thêm' + chip +N phòng, Đăng ký"
    ],
    "expected": "Toast 'Đã đăng ký · <tên> · +N phòng thêm'; BN có số thứ tự ở tất cả phòng đã chọn (registerMultipleRooms); KHÔNG áp dụng cho BHYT.",
    "evidence": [
     {
      "name": "TC-RCP-003__s02__form",
      "caption": "Chọn phòng chính và tick phòng khám thêm",
      "uiState": "form"
     },
     {
      "name": "TC-RCP-003__s03__success",
      "caption": "Toast đăng ký kèm số phòng thêm",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-RCP-004",
    "title": "Gọi số tiếp theo (F3 / nút Gọi số tiếp)",
    "category": "happy",
    "priority": "P0",
    "role": "Tiếp đón",
    "preconditions": "Có ít nhất 1 phiên trạng thái 'Chờ tiếp đón' đã gán phòng (roomId).",
    "steps": [
     "Ở tab Hàng đợi, bấm 'Gọi số tiếp' (hoặc F3)"
    ],
    "expected": "Toast 'Đang gọi số <STT> · <tên BN>'; danh sách reload; phiên chuyển sang đang phục vụ; tab Bảng gọi số phản ánh số đang gọi.",
    "evidence": [
     {
      "name": "TC-RCP-004__s01__success",
      "caption": "Toast gọi số tiếp theo thành công",
      "uiState": "success"
     },
     {
      "name": "TC-RCP-004__s02__list",
      "caption": "Bảng gọi số cập nhật số đang gọi theo phòng",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-RCP-005",
    "title": "Check-in (Bắt đầu khám) một phiên đang chờ",
    "category": "happy",
    "priority": "P0",
    "role": "Tiếp đón",
    "preconditions": "Có phiên trạng thái 'Chờ tiếp đón'.",
    "steps": [
     "Trỏ vào dòng phiên chờ, bấm ActBtn 'Bắt đầu khám' (icon check)"
    ],
    "expected": "ensureTicket cấp vé nếu thiếu rồi startServing; toast 'Đã check-in · <tên>'; phiên chuyển trạng thái 'Đang khám'; KPI cập nhật.",
    "evidence": [
     {
      "name": "TC-RCP-005__s01__success",
      "caption": "Toast check-in thành công, phiên sang Đang khám",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-RCP-006",
    "title": "Hoàn thành phiên đang khám / chờ KQ CLS",
    "category": "happy",
    "priority": "P1",
    "role": "Tiếp đón",
    "preconditions": "Có phiên trạng thái 'Đang khám' hoặc 'Chờ KQ CLS'.",
    "steps": [
     "Trỏ dòng phiên, bấm ActBtn 'Hoàn thành'"
    ],
    "expected": "completeServing chạy; toast 'Đã hoàn thành · <tên>'; phiên chuyển 'Khám xong'; KPI Đã đăng ký/biểu đồ cập nhật.",
    "evidence": [
     {
      "name": "TC-RCP-006__s01__success",
      "caption": "Toast hoàn thành, phiên chuyển Khám xong",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-RCP-007",
    "title": "Đánh dấu vắng mặt (no-show) phiên đang chờ rồi Gọi lại",
    "category": "state",
    "priority": "P1",
    "role": "Tiếp đón",
    "preconditions": "Có phiên 'Chờ tiếp đón'/'Đang khám'/'Chờ KQ CLS'.",
    "steps": [
     "Bấm ActBtn 'Vắng mặt' (tone warn) trên phiên chờ",
     "Xác nhận chuyển sang tab 'Vắng / bỏ qua'",
     "Trên phiên vắng, bấm ActBtn 'Gọi lại'"
    ],
    "expected": "skipQueue với lý do; toast vắng mặt (warning); phiên hiện ở tab Vắng/bỏ qua (statusKey nhận diện ticketStatus=4); 'Gọi lại' đưa BN trở lại phục vụ; KPI 'Không đến' tăng/giảm đúng.",
    "evidence": [
     {
      "name": "TC-RCP-007__s01__toast",
      "caption": "Toast đánh dấu vắng mặt",
      "uiState": "toast"
     },
     {
      "name": "TC-RCP-007__s02__list",
      "caption": "Phiên xuất hiện trong tab Vắng/bỏ qua",
      "uiState": "list"
     },
     {
      "name": "TC-RCP-007__s03__success",
      "caption": "Gọi lại đưa BN trở lại hàng đợi",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-RCP-008",
    "title": "Validation bắt buộc bước 1 đăng ký (tên/SĐT/tuổi/CCCD)",
    "category": "validation",
    "priority": "P0",
    "role": "Tiếp đón",
    "preconditions": "Mở modal Đăng ký mới ở bước 1.",
    "steps": [
     "Để trống tất cả, bấm 'Tiếp tục'",
     "Nhập SĐT '0912' (sai định dạng), Tuổi 200, CCCD '123' (thiếu số), bấm Tiếp tục"
    ],
    "expected": "Toast tổng 'Vui lòng kiểm tra: Họ và tên, Số điện thoại, Tuổi, CCCD/CMND'; mỗi field tô đỏ với message (SĐT '10 số', Tuổi 'không hợp lệ' cho 200, CCCD 'CCCD 12 số'); tự cuộn tới field lỗi đầu; KHÔNG sang bước 2.",
    "evidence": [
     {
      "name": "TC-RCP-008__s01__validation",
      "caption": "Toast tổng + các field bắt buộc tô đỏ",
      "uiState": "validation"
     },
     {
      "name": "TC-RCP-008__s02__validation",
      "caption": "Lỗi định dạng SĐT/Tuổi/CCCD hiển thị dưới field",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#241",
     "#217"
    ],
    "notes": "validate1: SĐT regex ^0\\d{9,10}$, tuổi 0-130, CCCD 12 số."
   },
   {
    "id": "TC-RCP-009",
    "title": "Biên giá trị tuổi (0, âm, 130, 131) ở field Tuổi",
    "category": "edge",
    "priority": "P2",
    "role": "Tiếp đón",
    "preconditions": "Modal Đăng ký bước 1.",
    "steps": [
     "Nhập Tuổi 0 → Tiếp tục",
     "Nhập Tuổi 130 → Tiếp tục",
     "Thử nhập Tuổi -1 và 131"
    ],
    "expected": "Tuổi 0 và 130 hợp lệ qua được (min0/max130); -1 và 131 báo 'Tuổi không hợp lệ'; InputNumber min/max chặn nhập ngoài dải.",
    "evidence": [
     {
      "name": "TC-RCP-009__s01__validation",
      "caption": "Tuổi biên 0/130 chấp nhận, ngoài dải báo lỗi",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#241"
    ]
   },
   {
    "id": "TC-RCP-010",
    "title": "Đăng ký BHYT với thẻ hết hạn / không hợp lệ bị chặn",
    "category": "negative",
    "priority": "P0",
    "role": "Tiếp đón",
    "preconditions": "Modal Đăng ký, hình thức 'Khám BHYT'.",
    "steps": [
     "B1 điền BN hợp lệ, Tiếp tục",
     "B2 nhập số thẻ BHYT hết hạn/bị khóa, bấm Xác thực",
     "Bấm Tiếp tục dù thẻ không hợp lệ"
    ],
    "expected": "Hiện card đỏ 'Thẻ không hợp lệ hoặc đã hết hạn'; validate2 chặn sang B3 với lỗi 'Cần xác thực BHYT hợp lệ'; không cho đăng ký BHYT.",
    "evidence": [
     {
      "name": "TC-RCP-010__s02__error",
      "caption": "Card thẻ BHYT không hợp lệ/hết hạn",
      "uiState": "error"
     },
     {
      "name": "TC-RCP-010__s03__validation",
      "caption": "Chặn sang bước sau khi thẻ chưa hợp lệ",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#241"
    ],
    "notes": "verifyInsurance: ok = isValid && !isExpired && !isBlacklisted."
   },
   {
    "id": "TC-RCP-011",
    "title": "Validation bước 3: thiếu phòng khám / thiếu lý do khám",
    "category": "validation",
    "priority": "P1",
    "role": "Tiếp đón",
    "preconditions": "Modal Đăng ký, đã qua B1/B2, ở B3.",
    "steps": [
     "Không chọn phòng, để trống Lý do, bấm Tiếp tục"
    ],
    "expected": "Hiện lỗi 'Chọn khoa / phòng' và 'Nhập lý do khám'; KHÔNG sang B4; cuộn tới lỗi.",
    "evidence": [
     {
      "name": "TC-RCP-011__s01__validation",
      "caption": "Lỗi thiếu phòng và thiếu lý do khám",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#241"
    ]
   },
   {
    "id": "TC-RCP-012",
    "title": "Hủy giữa chừng wizard không tạo phiên",
    "category": "negative",
    "priority": "P1",
    "role": "Tiếp đón",
    "preconditions": "Modal Đăng ký mở, đã điền B1/B2.",
    "steps": [
     "Bấm 'Hủy' (hoặc đóng modal)",
     "Mở lại modal Đăng ký mới"
    ],
    "expected": "Modal đóng, không gọi API đăng ký, danh sách không thêm phiên; mở lại modal reset về bước 1 với form trống (useEffect reset on open).",
    "evidence": [
     {
      "name": "TC-RCP-012__s01__form",
      "caption": "Mở lại wizard reset về bước 1, form trống",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#241"
    ]
   },
   {
    "id": "TC-RCP-013",
    "title": "Tra cứu BHYT độc lập (modal Tra cứu thẻ BHYT)",
    "category": "integration",
    "priority": "P1",
    "role": "Tiếp đón",
    "preconditions": "/v2/reception, kết nối cổng BHXH (verifyInsurance).",
    "steps": [
     "Bấm 'Tra cứu BHYT' trên thanh action",
     "Nhập số thẻ < 10 ký tự, bấm Tra cứu",
     "Nhập số thẻ hợp lệ + tên, bấm Tra cứu"
    ],
    "expected": "Số thẻ <10 ký tự → warning 'Nhập số thẻ BHYT hợp lệ', không gọi API; số hợp lệ → hiện kết quả: StatusBadge, nơi KCB, giá trị đến, tuyến, mức hưởng, cảnh báo/lỗi nếu có.",
    "evidence": [
     {
      "name": "TC-RCP-013__s01__validation",
      "caption": "Cảnh báo số thẻ chưa đủ ký tự",
      "uiState": "validation"
     },
     {
      "name": "TC-RCP-013__s02__modal",
      "caption": "Kết quả tra cứu BHYT đầy đủ trường",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#239",
     "#217"
    ],
    "notes": "Tích hợp cổng BHXH/giám định — kiểm trạng thái Thẻ bị khóa/Hết hạn."
   },
   {
    "id": "TC-RCP-014",
    "title": "Đổi phòng khám cho phiên đang hoạt động",
    "category": "happy",
    "priority": "P1",
    "role": "Tiếp đón",
    "preconditions": "Có phiên chưa 'Khám xong', có >=2 phòng.",
    "steps": [
     "Trên phiên, bấm ActBtn 'Đổi phòng'",
     "Modal hiện BN + phòng hiện tại",
     "Bỏ trống phòng mới, bấm Đổi phòng",
     "Chọn phòng mới khác phòng hiện tại, nhập lý do, bấm Đổi phòng"
    ],
    "expected": "Thiếu phòng mới → warning 'Chọn phòng mới'; chọn phòng mới (Select loại trừ phòng hiện tại) + lý do → changeRoom; toast 'Đã đổi phòng · <tên>'; danh sách reload, phiên hiển thị phòng mới.",
    "evidence": [
     {
      "name": "TC-RCP-014__s02__validation",
      "caption": "Cảnh báo chưa chọn phòng mới",
      "uiState": "validation"
     },
     {
      "name": "TC-RCP-014__s03__success",
      "caption": "Đổi phòng thành công, cột Khoa·Phòng cập nhật",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-RCP-015",
    "title": "Thu phí tại quầy + tính tiền thối (tiền mặt)",
    "category": "happy",
    "priority": "P0",
    "role": "Tiếp đón",
    "preconditions": "Có phiên chưa 'Khám xong'.",
    "steps": [
     "Bấm ActBtn 'Thu phí' trên phiên",
     "Để Số tiền = 0, bấm Xác nhận thu",
     "Nhập Số tiền 250000, Phương thức Tiền mặt, Tiền khách đưa 300000",
     "Bấm Xác nhận thu"
    ],
    "expected": "Số tiền 0 → warning 'Nhập số tiền thu'; nhập hợp lệ → hiện 'Tiền thối: 50.000 ₫'; createPayment chạy; toast 'Đã thu 250.000 ₫ · <tên>'; danh sách reload.",
    "evidence": [
     {
      "name": "TC-RCP-015__s02__validation",
      "caption": "Cảnh báo chưa nhập số tiền",
      "uiState": "validation"
     },
     {
      "name": "TC-RCP-015__s03__modal",
      "caption": "Hiển thị tiền thối khi khách đưa dư",
      "uiState": "modal"
     },
     {
      "name": "TC-RCP-015__s04__success",
      "caption": "Toast thu phí thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-RCP-016",
    "title": "Thu phí chuyển khoản/thẻ yêu cầu mã giao dịch",
    "category": "validation",
    "priority": "P2",
    "role": "Tiếp đón",
    "preconditions": "Modal Thu phí mở.",
    "steps": [
     "Chọn Phương thức 'Chuyển khoản'",
     "Quan sát field 'Mã giao dịch' xuất hiện thay cho 'Tiền khách đưa'",
     "Nhập số tiền, mã ref, Xác nhận thu"
    ],
    "expected": "Khi phương thức != Tiền mặt: ẩn 'Tiền khách đưa', hiện 'Mã giao dịch'; gửi transactionReference; thu thành công.",
    "evidence": [
     {
      "name": "TC-RCP-016__s01__modal",
      "caption": "Đổi phương thức hiện field mã giao dịch",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-RCP-017",
    "title": "Data-consistency: phí tiếp đón → vào thông tin viện phí của phiên",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Tiếp đón",
    "preconditions": "Đăng ký 1 phiên dịch vụ rồi thu phí tại quầy.",
    "steps": [
     "Đăng ký phiên 'Khám dịch vụ' (TC-RCP-001)",
     "Thu phí 250000 cho phiên đó",
     "Mở Drawer chi tiết phiên / kiểm tra getPatientBillingInfo",
     "Đối chiếu sang phân hệ Viện phí cho cùng medicalRecordId"
    ],
    "expected": "Khoản thu createPayment gắn đúng medicalRecordId; thông tin viện phí phản ánh đúng số tiền/phương thức; audit log ghi mutation thu phí; không lệch số liệu giữa tiếp đón và viện phí.",
    "evidence": [
     {
      "name": "TC-RCP-017__s03__detail",
      "caption": "Drawer/billing info hiển thị khoản đã thu",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239",
     "#217"
    ],
    "notes": "Liên kết chéo reception→billing (RELATED_X)."
   },
   {
    "id": "TC-RCP-018",
    "title": "Lưu vân tay tiếp đón và cờ 'không thu thập được'",
    "category": "happy",
    "priority": "P2",
    "role": "Tiếp đón",
    "preconditions": "Mở Drawer chi tiết 1 phiên có patientId.",
    "steps": [
     "Trong panel 'Vân tay tiếp đón', tick 'Không thu thập được vân tay', bấm Lưu vân tay",
     "Bỏ tick, chọn 1 ảnh vân tay (image/*), bấm Lưu vân tay"
    ],
    "expected": "saveFingerprint gửi notCollected=true (không kèm data) hoặc fingerprintData base64; toast 'Đã lưu vân tay tiếp đón'; nút loading khi đang lưu.",
    "evidence": [
     {
      "name": "TC-RCP-018__s01__drawer",
      "caption": "Panel vân tay với cờ không thu thập được",
      "uiState": "drawer"
     },
     {
      "name": "TC-RCP-018__s02__success",
      "caption": "Toast lưu vân tay thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-RCP-019",
    "title": "In phiếu số thứ tự / phiếu khám của phiên",
    "category": "happy",
    "priority": "P1",
    "role": "Tiếp đón",
    "preconditions": "Có phiên (có ticketId hoặc chỉ có medicalRecordId).",
    "steps": [
     "Trên phiên có vé, bấm ActBtn 'In phiếu'",
     "Trên phiên không có vé (demo/seed), bấm In phiếu"
    ],
    "expected": "Có ticketId → printQueueTicket; không có → fallback printExaminationSlip(id); mở PDF tab mới; toast 'Đã mở phiếu · <STT>'; revoke object URL sau 60s.",
    "evidence": [
     {
      "name": "TC-RCP-019__s01__success",
      "caption": "Mở phiếu PDF tab mới + toast",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-RCP-020",
    "title": "In hàng loạt phiếu cho các phiên đã chọn",
    "category": "happy",
    "priority": "P2",
    "role": "Tiếp đón",
    "preconditions": "Tab Hàng đợi có nhiều phiên.",
    "steps": [
     "Không chọn dòng nào, bấm vùng bulk... (kiểm tra khi 0 chọn)",
     "Tick chọn nhiều dòng → thanh bulk hiện 'Đã chọn N phiên'",
     "Bấm 'In hàng loạt'"
    ],
    "expected": "Khi 0 chọn không có thanh bulk (onBulkPrint nếu gọi sẽ warning 'Chưa chọn phiên nào'); chọn N → tải N file PDF; toast 'Đã tải k/N phiếu'; bỏ chọn sau khi xong.",
    "evidence": [
     {
      "name": "TC-RCP-020__s01__list",
      "caption": "Thanh bulk hiện số phiên đã chọn",
      "uiState": "list"
     },
     {
      "name": "TC-RCP-020__s02__success",
      "caption": "Toast tải hàng loạt phiếu",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-RCP-021",
    "title": "Lọc và tìm kiếm phiên (khoa, ưu tiên, hình thức, BHYT, từ khóa)",
    "category": "happy",
    "priority": "P1",
    "role": "Tiếp đón",
    "preconditions": "Có nhiều phiên đa dạng khoa/ưu tiên/BHYT.",
    "steps": [
     "Gõ từ khóa SĐT/CCCD/mã vào SearchBox",
     "Chọn Filter Khoa cụ thể",
     "Chọn Ưu tiên + Hình thức + Có BHYT",
     "Bấm 'Bỏ lọc'"
    ],
    "expected": "Bảng lọc theo từng tiêu chí (AND); StatusTabs count phản ánh tổng theo trạng thái; 'Bỏ lọc' reset toàn bộ + về trang 1; tìm kiếm khớp tên/mã/SĐT/CCCD/BHYT/STT (lowercase).",
    "evidence": [
     {
      "name": "TC-RCP-021__s01__filter",
      "caption": "Áp nhiều filter cùng lúc",
      "uiState": "filter"
     },
     {
      "name": "TC-RCP-021__s02__list",
      "caption": "Kết quả tìm kiếm theo từ khóa",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-RCP-022",
    "title": "Xuất CSV danh sách phiên đã lọc (tiếng Việt có dấu)",
    "category": "ui",
    "priority": "P2",
    "role": "Tiếp đón",
    "preconditions": "Có dữ liệu phiên.",
    "steps": [
     "Áp 1 vài filter",
     "Bấm 'Xuất'",
     "Mở file CSV tải về kiểm tra dấu tiếng Việt"
    ],
    "expected": "Tải file tiep-don-YYYYMMDD-HHmm.csv với BOM UTF-8 (﻿), header 13 cột, dữ liệu escape dấu ngoặc kép; tiếng Việt có dấu hiển thị đúng trong Excel; toast 'Đã xuất N dòng (CSV)'; khi 0 dữ liệu → warning 'Không có dữ liệu để xuất'.",
    "evidence": [
     {
      "name": "TC-RCP-022__s01__success",
      "caption": "Toast xuất CSV thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-RCP-023",
    "title": "Trạng thái rỗng / loading / lỗi tải phòng khám",
    "category": "ui",
    "priority": "P1",
    "role": "Tiếp đón",
    "preconditions": "Có thể giả lập 0 phiên và lỗi getRoomOverview.",
    "steps": [
     "Tải trang khi chưa có dữ liệu → quan sát loading 'Đang tải…'",
     "Khi không có phiên khớp lọc → quan sát empty",
     "Giả lập getRoomOverview lỗi (chặn API) → reload"
    ],
    "expected": "Loading hiện 'Đang tải…'; empty hiện icon + 'Không có phiên tiếp đón nào.' + nút Bỏ lọc; lỗi tải phòng → warning 'Không tải được danh sách phòng khám. Vui lòng thử lại.' (không nuốt lỗi, phân biệt với 0 phòng thật).",
    "evidence": [
     {
      "name": "TC-RCP-023__s01__loading",
      "caption": "Trạng thái đang tải bảng",
      "uiState": "loading"
     },
     {
      "name": "TC-RCP-023__s02__empty",
      "caption": "Trạng thái rỗng có nút Bỏ lọc",
      "uiState": "empty"
     },
     {
      "name": "TC-RCP-023__s03__error",
      "caption": "Cảnh báo lỗi tải danh sách phòng",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-RCP-024",
    "title": "Dark/light parity màn Tiếp đón",
    "category": "ui",
    "priority": "P2",
    "role": "Tiếp đón",
    "preconditions": "Topbar v2 có toggle dark/light.",
    "steps": [
     "Mở /v2/reception ở light mode, quan sát KpiStrip/StatusTabs/DataTable/chip",
     "Bật dark mode",
     "Mở modal Đăng ký + Drawer ở dark"
    ],
    "expected": "Cả 2 theme: màu nền/chữ/đường viền đủ tương phản; chip trạng thái (info/ok/warn/crit), token STT, badge số đọc rõ; modal/drawer không bị nền trắng lệch theme; số tiền/ngày format đồng nhất.",
    "evidence": [
     {
      "name": "TC-RCP-024__s01__list",
      "caption": "Màn tiếp đón light mode",
      "uiState": "list"
     },
     {
      "name": "TC-RCP-024__s02__list",
      "caption": "Màn tiếp đón dark mode parity",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-RCP-025",
    "title": "Phím tắt F2/F3/F4 hoạt động đúng",
    "category": "happy",
    "priority": "P2",
    "role": "Tiếp đón",
    "preconditions": "/v2/reception, focus ngoài input.",
    "steps": [
     "Nhấn F2",
     "Đóng modal, nhấn F4",
     "Đóng modal, nhấn F3 (có phiên chờ và không có phiên chờ)"
    ],
    "expected": "F2 mở modal Đăng ký mới; F4 mở Tìm BN cũ; F3 gọi số tiếp; khi không có BN chờ F3 → info 'Không có bệnh nhân nào đang chờ'.",
    "evidence": [
     {
      "name": "TC-RCP-025__s01__modal",
      "caption": "F2 mở wizard đăng ký",
      "uiState": "modal"
     },
     {
      "name": "TC-RCP-025__s02__toast",
      "caption": "F3 khi không có BN chờ báo info",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-RCP-026",
    "title": "Phân quyền: vai trò không phải Tiếp đón/Thư ký bị chặn thao tác",
    "category": "permission",
    "priority": "P0",
    "role": "Bác sĩ/role khác",
    "preconditions": "Có user role không có quyền tiếp đón (theo matrix #216); roles của module = Tiếp đón, Thư ký.",
    "steps": [
     "Đăng nhập bằng role không có quyền tiếp đón",
     "Cố truy cập /v2/reception",
     "Nếu vào được, thử Đăng ký mới / Thu phí / Đổi phòng"
    ],
    "expected": "Menu Tiếp đón bị ẩn hoặc route bị chặn; nếu UI lọt thì API (registerFeePatient/createPayment/changeRoom) trả 403; không thực hiện được mutation.",
    "evidence": [
     {
      "name": "TC-RCP-026__s01__permission",
      "caption": "Menu/route tiếp đón bị chặn với role không đủ quyền",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#217"
    ]
   },
   {
    "id": "TC-RCP-027",
    "title": "Bảo mật IDOR: không xem được lịch sử/hồ sơ BN khác qua API",
    "category": "security",
    "priority": "P0",
    "role": "Tiếp đón",
    "preconditions": "Token hợp lệ; biết patientId/medicalRecordId của BN khác cơ sở/ngoài phạm vi.",
    "steps": [
     "Gọi getPatientVisitHistory / getVisitDetail / getPatientPhotos với id của BN không thuộc phạm vi user",
     "Quan sát phản hồi"
    ],
    "expected": "API kiểm soát quyền theo phạm vi cơ sở/khoa; không trả dữ liệu BN ngoài quyền (403/404), không lộ thông tin nhân khẩu/ảnh; mọi truy cập ghi audit.",
    "evidence": [
     {
      "name": "TC-RCP-027__s01__error",
      "caption": "Truy cập hồ sơ BN ngoài quyền bị từ chối",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#217",
     "#216"
    ],
    "notes": "Tham chiếu lịch sử fix path-traversal patient-image #181."
   },
   {
    "id": "TC-RCP-028",
    "title": "Bảo mật: XSS ở field ghi chú/lý do/địa chỉ + ký tự đặc biệt",
    "category": "security",
    "priority": "P1",
    "role": "Tiếp đón",
    "preconditions": "Modal Đăng ký / Đổi phòng.",
    "steps": [
     "Nhập Lý do khám = '<img src=x onerror=alert(1)>' + Địa chỉ chứa script",
     "Đăng ký rồi mở Drawer chi tiết phiên xem hiển thị lý do",
     "Nhập lý do đổi phòng có ký tự đặc biệt và dấu tiếng Việt"
    ],
    "expected": "Chuỗi hiển thị nguyên văn dạng text (escape), KHÔNG thực thi script ở Drawer/bảng; dấu tiếng Việt + ký tự đặc biệt lưu/hiển thị đúng; không vỡ CSV export (đã escape ngoặc kép).",
    "evidence": [
     {
      "name": "TC-RCP-028__s02__detail",
      "caption": "Lý do chứa payload XSS hiển thị an toàn dạng text",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#217"
    ]
   },
   {
    "id": "TC-RCP-029",
    "title": "Edge: chuỗi rất dài + dấu tiếng Việt ở Họ tên/Lý do",
    "category": "edge",
    "priority": "P2",
    "role": "Tiếp đón",
    "preconditions": "Modal Đăng ký.",
    "steps": [
     "Nhập Họ tên 'Nguyễễn Văn Ằẳẵ...' dài 200+ ký tự có dấu",
     "Nhập Lý do dài 1000+ ký tự",
     "Hoàn tất đăng ký và xem hiển thị ở bảng/Drawer"
    ],
    "expected": "Không lỗi submit; tên dài hiển thị không vỡ layout (cell 2 dòng/ellipsis); dấu tiếng Việt đúng; backend không cắt/sai mã hóa; nếu có giới hạn độ dài thì báo rõ.",
    "evidence": [
     {
      "name": "TC-RCP-029__s01__form",
      "caption": "Nhập tên/lý do rất dài có dấu",
      "uiState": "form"
     },
     {
      "name": "TC-RCP-029__s02__list",
      "caption": "Hiển thị tên dài không vỡ bảng",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#241"
    ]
   },
   {
    "id": "TC-RCP-030",
    "title": "State: không cho thao tác sai trạng thái (phiên Khám xong)",
    "category": "state",
    "priority": "P1",
    "role": "Tiếp đón",
    "preconditions": "Có phiên 'Khám xong'.",
    "steps": [
     "Chọn tab 'Khám xong', trỏ vào 1 phiên",
     "Quan sát các ActBtn khả dụng"
    ],
    "expected": "Phiên 'Khám xong' KHÔNG hiện nút Thu phí/Đổi phòng/Vắng mặt/Bắt đầu khám/Hoàn thành; chỉ còn 'In phiếu'; Drawer cũng ẩn nút hành động trạng thái; không thể chuyển ngược trạng thái.",
    "evidence": [
     {
      "name": "TC-RCP-030__s01__list",
      "caption": "Phiên Khám xong chỉ còn nút In phiếu",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#240",
     "#241"
    ]
   },
   {
    "id": "TC-RCP-031",
    "title": "Check-in nhanh từ lịch đặt khám (BookingPicker)",
    "category": "integration",
    "priority": "P1",
    "role": "Tiếp đón",
    "preconditions": "Có lịch hẹn/đặt khám trong ngày (Appointments).",
    "steps": [
     "Mở Đăng ký mới B1, bấm 'Từ lịch đặt khám'",
     "Chọn 1 lịch hẹn trong BookingPickerModal",
     "Xác nhận check-in"
    ],
    "expected": "quickRegisterByAppointment chạy; modal đóng; danh sách reload có phiên mới gắn với lịch hẹn; trạng thái lịch chuyển 'đã đến/đã check-in' ở /v2/booking-management (data-consistency reception↔appointments).",
    "evidence": [
     {
      "name": "TC-RCP-031__s01__modal",
      "caption": "Chọn lịch hẹn trong BookingPicker",
      "uiState": "modal"
     },
     {
      "name": "TC-RCP-031__s02__success",
      "caption": "Check-in từ lịch tạo phiên mới",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239",
     "#240"
    ]
   },
   {
    "id": "TC-RCP-032",
    "title": "Negative: gọi số / check-in khi phiên chưa gán phòng",
    "category": "negative",
    "priority": "P1",
    "role": "Tiếp đón",
    "preconditions": "Có phiên seed/demo không có roomId hoặc không có phiên chờ.",
    "steps": [
     "Bấm Gọi số tiếp khi mọi phiên chờ thiếu roomId",
     "Bấm Bắt đầu khám trên phiên không có phòng (ensureTicket trả null)"
    ],
    "expected": "Gọi số → info 'Không có bệnh nhân nào đang chờ' khi không có waiting hợp lệ; Check-in → error 'Không tạo được số thứ tự (bệnh nhân chưa có phòng khám)'; không crash.",
    "evidence": [
     {
      "name": "TC-RCP-032__s01__toast",
      "caption": "Thông báo không tạo được số thứ tự do thiếu phòng",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#240"
    ]
   }
  ],
  "ui_state_checklist": [
   "list - bảng hàng đợi tiếp đón có dữ liệu",
   "empty - không có phiên / không khớp lọc (icon + nút Bỏ lọc)",
   "loading - 'Đang tải…' khi fetch",
   "error - cảnh báo lỗi tải phòng khám / API mutation thất bại",
   "filter - áp nhiều bộ lọc (khoa/ưu tiên/hình thức/BHYT)",
   "modal - wizard Đăng ký mới, Tra cứu BHYT, Đổi phòng, Thu phí, BookingPicker",
   "form - các bước nhập liệu trong wizard",
   "validation - lỗi field bắt buộc/định dạng + toast tổng",
   "success - toast thành công (đăng ký/check-in/hoàn thành/thu phí/đổi phòng/in/vân tay)",
   "toast - thông báo info/warning (gọi số rỗng, vắng mặt, thiếu phòng)",
   "drawer - chi tiết phiên + panel vân tay",
   "detail - thông tin viện phí/lý do trong drawer",
   "tab - chuyển TopTabs (queue/now/stats) + StatusTabs 5 trạng thái",
   "permission - menu/route/nút bị chặn theo vai trò",
   "confirm - xác nhận bước cuối wizard / hành động trạng thái",
   "dark/light parity - toggle theme topbar v2"
  ],
  "gaps": [
   "Màn hình chờ công khai (DisplayScreens/WaitingRoomDisplayConfigs) và cấu hình camera (CameraConfigurations) có trong bảng gốc data.js nhưng chưa thấy màn FE v2 tương ứng — cần xác minh có route/component riêng hay chưa; nếu có cần test realtime gọi số (SignalR) trên màn chờ.",
   "Cấu hình hàng đợi (QueueConfigurations) và lịch bác sĩ (DoctorSchedules) chưa có task riêng vì chưa xác minh màn quản trị; cần test thiết lập dải số/loại vé/ưu tiên và đối chiếu khi cấp số.",
   "FollowUpAppointments (lịch tái khám) thuộc bảng module nhưng nằm ở FollowUp.tsx/BookingManagement — cần làm rõ ranh giới test giữa reception và followup để tránh trùng.",
   "Đồng thời/đua tranh (concurrency): 2 quầy cùng gọi 1 số, hoặc 2 lần bấm 'Đăng ký' nhanh — chưa có test chống double-submit/duplicate ticket; ensureTicket có thể tạo vé trùng.",
   "Audit log: chưa kiểm trực tiếp bản ghi audit cho từng mutation (đăng ký/đổi phòng/thu phí/skip) — cần task xác minh nội dung audit (ai/khi nào/giá trị cũ-mới).",
   "Tra cứu BHYT qua QR (verifyInsuranceByQR) và đọc thẻ thông minh/CCCD (readSmartCard/registerBySmartCard) chưa có task — cần thiết bị/giả lập dữ liệu thẻ.",
   "Tạm ứng/đặt cọc tại quầy (createDeposit/createEmergencyDeposit) và giữ giấy tờ (DocumentHold) chưa có task — nếu thuộc phạm vi quầy cần bổ sung happy + data-consistency sang viện phí.",
   "Gộp/tách bệnh nhân (mergePatients/splitPatient) — thao tác nguy hiểm, cần test quyền + xác nhận + ảnh hưởng tới hồ sơ/lịch sử khám.",
   "Boundary phân trang (PAGE_SIZE=14): chưa có test ranh giới khi đúng 14/15 phiên và khi filter làm thay đổi tổng trang đang đứng (page vượt totalPages).",
   "Responsive/mobile: lite/reception dùng cùng component — chưa có task kiểm bố cục trên màn hẹp.",
   "Đăng ký cấp cứu (registerEmergencyPatient) và phân loại triage (updateObservationTriage) — luồng cấp cứu có ưu tiên 'crit' nhưng chưa có task riêng kiểm độ ưu tiên đẩy lên đầu hàng đợi."
  ]
 },
 {
  "id": "patient",
  "code": "PAT",
  "layer": "clin",
  "ic": "🧑",
  "nm": "Bệnh nhân & Tiền sử",
  "gh": [
   "#245",
   "#239",
   "#241"
  ],
  "gap": false,
  "module_id": "patient",
  "summary": "Phân hệ \"Bệnh nhân & Tiền sử\" (PAT, lớp clin) quản lý hồ sơ nhân khẩu là GỐC dữ liệu: 1 bệnh nhân (Patients) có nhiều MedicalRecords/Appointments. Các bảng grounded từ data.js: Patients (CRUD/tìm kiếm/ảnh/BHYT), PatientPhotos (ảnh BN), PatientFlags (7 loại cờ: Dị ứng nặng/Nợ viện phí/Lạm dụng BHYT/VIP/Nguy cơ tự tử-bạo hành/Bệnh truyền nhiễm/Cảnh báo khác), Allergies (dị ứng), Contraindications (chống chỉ định) — phục vụ cảnh báo an toàn người bệnh khi kê đơn; InjuryInfos (thông tin chấn thương, qua TraumaRegistry); InsuranceCards (thẻ BHYT). UI hiện không có trang /v2/patients độc lập mà bộc lộ qua: tạo/tra cứu BN ở Tiếp đón (NewVisitModal/PatientLookupModal + patient.ts), tab Dị ứng/Chống chỉ định + cảnh báo trong OpdEditor (examination.ts: getPatientAllergies/contraindications/check-drug-allergies/check-contraindications), Cờ BN (PatientFlagsSection + patientFlag.ts), Chấn thương (TraumaRegistry.tsx), xác thực BHYT (BhytVerifyModal). API patient.ts: /patients (search POST, getById, by-code, by-identity, by-insurance, create, update, delete).",
  "screens": [
   {
    "name": "Tra cứu / tạo bệnh nhân (Tiếp đón)",
    "desc": "Modal đăng ký lượt khám kiêm tạo/khớp hồ sơ BN: nhập họ tên, SĐT, tuổi, giới tính, CCCD/CMND, địa chỉ, số thẻ BHYT (có nút Xác thực qua cổng), tự khớp BN cũ theo CCCD/SĐT/thẻ BHYT.",
    "route_guess": "/v2/reception (NewVisitModal)",
    "elements": [
     "form Họ tên*",
     "SĐT*",
     "Tuổi*",
     "Radio giới tính Nam/Nữ",
     "CCCD/CMND*",
     "Địa chỉ",
     "Số thẻ BHYT + nút Xác thực",
     "nút Đăng ký",
     "panel kết quả xác thực BHYT (hợp lệ/không hợp lệ)"
    ]
   },
   {
    "name": "Modal tra cứu bệnh nhân",
    "desc": "Tìm BN theo keyword/mã BN/CCCD/SĐT/số thẻ BHYT; bảng kết quả phân trang; chọn BN để gắn vào lượt khám.",
    "route_guess": "/v2/reception (PatientLookupModal)",
    "elements": [
     "ô search keyword",
     "filter theo CCCD/SĐT/BHYT",
     "DataTable kết quả",
     "phân trang",
     "nút chọn BN",
     "empty state khi không có kết quả"
    ]
   },
   {
    "name": "Chi tiết / cập nhật hồ sơ bệnh nhân",
    "desc": "Xem & sửa thông tin nhân khẩu BN: mã BN, họ tên, ngày sinh/năm sinh, giới tính, CCCD, SĐT, email, địa chỉ (xã/huyện/tỉnh), dân tộc, nghề nghiệp, thông tin BHYT, người giám hộ; ảnh BN.",
    "route_guess": "drawer/detail từ Reception hoặc OpdEditor",
    "elements": [
     "form thông tin nhân khẩu",
     "ảnh BN (PatientPhotos)",
     "thông tin BHYT",
     "người giám hộ",
     "nút Lưu",
     "nút Xóa"
    ]
   },
   {
    "name": "Cờ đánh dấu bệnh nhân (PatientFlags)",
    "desc": "Danh sách + thêm/sửa/xóa cờ cảnh báo BN với 7 loại (màu, ghi chú, ngày hết hạn, trạng thái active).",
    "route_guess": "/v2/reception (PatientFlagsSection)",
    "elements": [
     "danh sách cờ với màu",
     "dropdown loại cờ (7 loại)",
     "color picker",
     "ghi chú",
     "ngày hết hạn",
     "nút Thêm/Lưu/Xóa",
     "badge cảnh báo"
    ]
   },
   {
    "name": "Dị ứng (Allergies)",
    "desc": "Tab/section quản lý dị ứng của BN: loại dị ứng, tên dị nguyên, phản ứng, mức độ, ngày ghi nhận, active; hiển thị cảnh báo khi kê đơn.",
    "route_guess": "/v2/opd (OpdEditor tab Dị ứng)",
    "elements": [
     "bảng dị ứng",
     "form thêm: loại/dị nguyên/phản ứng/mức độ/ngày",
     "banner cảnh báo dị ứng",
     "nút Thêm/Sửa/Xóa"
    ]
   },
   {
    "name": "Chống chỉ định (Contraindications)",
    "desc": "Tab/section quản lý chống chỉ định BN: loại, tên, mô tả, ngày ghi nhận, active; dùng kiểm tra khi kê thuốc.",
    "route_guess": "/v2/opd (OpdEditor tab Chống chỉ định)",
    "elements": [
     "bảng chống chỉ định",
     "form thêm: loại/tên/mô tả/ngày",
     "banner cảnh báo CCĐ",
     "nút Thêm/Sửa/Xóa"
    ]
   },
   {
    "name": "Cảnh báo an toàn thuốc (drug-safety check)",
    "desc": "Khi kê đơn, hệ thống gọi check-drug-allergies + check-contraindications trả về cảnh báo theo danh sách thuốc.",
    "route_guess": "/v2/opd → kê đơn (PrescriptionEditor)",
    "elements": [
     "modal/banner cảnh báo",
     "danh sách thuốc xung đột",
     "nút tiếp tục có xác nhận",
     "nút hủy"
    ]
   },
   {
    "name": "Xác thực thẻ BHYT (BhytVerifyModal)",
    "desc": "Nhập số thẻ + họ tên gọi cổng xác thực; trả mức hưởng/hạn thẻ/nơi ĐKKCB.",
    "route_guess": "/v2/reception (BhytVerifyModal)",
    "elements": [
     "input số thẻ",
     "input họ tên",
     "nút Xác thực",
     "kết quả hợp lệ (mức hưởng/hạn/nơi KCB)",
     "kết quả không hợp lệ"
    ]
   },
   {
    "name": "Đăng ký chấn thương (TraumaRegistry / InjuryInfos)",
    "desc": "Quản lý thông tin chấn thương gắn với BN (TNGT/tai nạn lao động...), phục vụ giấy chứng nhận thương tích.",
    "route_guess": "/v2/trauma-registry (TraumaRegistry.tsx)",
    "elements": [
     "DataTable danh sách chấn thương",
     "form thêm chấn thương",
     "liên kết BN",
     "nút lưu",
     "trạng thái"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-PAT-001",
    "title": "Tạo hồ sơ bệnh nhân mới qua đăng ký Tiếp đón (luồng thành công)",
    "category": "happy",
    "priority": "P0",
    "role": "Lễ tân/Tiếp đón",
    "preconditions": "Đã đăng nhập admin/Admin@123, ở /v2/reception, mở NewVisitModal; CCCD chưa tồn tại trong hệ thống.",
    "steps": [
     "Bấm Đăng ký lượt khám mới để mở NewVisitModal",
     "Nhập Họ tên 'Nguyễn Văn An', SĐT '0901234567', Tuổi 30, chọn giới tính Nam, CCCD '012345678901', Địa chỉ hợp lệ",
     "Chọn loại khám Viện phí/DV (không cần BHYT)",
     "Chọn phòng khám",
     "Nhập Lý do khám",
     "Bấm Đăng ký"
    ],
    "expected": "Hệ thống tạo Patients mới (sinh patientCode), tạo lượt khám/MedicalRecord, hiện toast thành công + cấp số thứ tự; BN xuất hiện khi tra cứu lại theo CCCD.",
    "evidence": [
     {
      "name": "TC-PAT-001__s02__form",
      "caption": "Form đăng ký đã nhập đủ thông tin BN mới",
      "uiState": "form"
     },
     {
      "name": "TC-PAT-001__s06__success",
      "caption": "Toast tạo BN + lượt khám thành công, có số thứ tự",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#245",
     "#239"
    ]
   },
   {
    "id": "TC-PAT-002",
    "title": "Tra cứu bệnh nhân cũ theo CCCD và gắn vào lượt khám",
    "category": "happy",
    "priority": "P0",
    "role": "Lễ tân/Tiếp đón",
    "preconditions": "Đã có BN với CCCD '012345678901' (từ TC-PAT-001).",
    "steps": [
     "Mở PatientLookupModal hoặc nhập CCCD đã tồn tại trong NewVisitModal",
     "Nhập CCCD '012345678901' và tìm",
     "Xem kết quả khớp hồ sơ BN cũ",
     "Chọn BN từ danh sách"
    ],
    "expected": "Hệ thống tự khớp & hiển thị đúng hồ sơ BN cũ (họ tên/giới tính/tuổi), không tạo trùng; thông tin BN được nạp vào form lượt khám.",
    "evidence": [
     {
      "name": "TC-PAT-002__s02__list",
      "caption": "Kết quả tra cứu khớp BN cũ theo CCCD",
      "uiState": "list"
     },
     {
      "name": "TC-PAT-002__s04__detail",
      "caption": "Thông tin BN cũ nạp vào lượt khám",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#245",
     "#241"
    ]
   },
   {
    "id": "TC-PAT-003",
    "title": "Tra cứu bệnh nhân theo số điện thoại / số thẻ BHYT / mã BN",
    "category": "happy",
    "priority": "P1",
    "role": "Lễ tân/Tiếp đón",
    "preconditions": "Có ít nhất 1 BN với SĐT, mã BN và số thẻ BHYT đã lưu.",
    "steps": [
     "Mở PatientLookupModal",
     "Tìm theo SĐT đầy đủ → kiểm kết quả",
     "Đổi sang tìm theo mã BN → kiểm kết quả",
     "Đổi sang tìm theo số thẻ BHYT → kiểm kết quả"
    ],
    "expected": "Mỗi tiêu chí trả đúng BN tương ứng (search POST /patients/search hỗ trợ keyword/patientCode/identityNumber/phoneNumber/insuranceNumber); kết quả phân trang đúng.",
    "evidence": [
     {
      "name": "TC-PAT-003__s02__filter",
      "caption": "Tra cứu theo SĐT trả đúng BN",
      "uiState": "filter"
     },
     {
      "name": "TC-PAT-003__s04__list",
      "caption": "Tra cứu theo số thẻ BHYT trả đúng BN",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#245"
    ]
   },
   {
    "id": "TC-PAT-004",
    "title": "Validation các trường bắt buộc khi tạo BN (họ tên/SĐT/tuổi/CCCD/lý do)",
    "category": "validation",
    "priority": "P0",
    "role": "Lễ tân/Tiếp đón",
    "preconditions": "Mở NewVisitModal trống.",
    "steps": [
     "Để trống Họ tên, SĐT, Tuổi, CCCD, Lý do khám",
     "Bấm Đăng ký",
     "Lần lượt điền từng trường rồi bấm lại để xác nhận thông báo lỗi gỡ đúng field"
    ],
    "expected": "Mỗi trường bắt buộc hiện lỗi đỏ riêng (Họ tên*, SĐT*, Tuổi*, CCCD*, Lý do*); không submit khi còn thiếu; lỗi mất khi field hợp lệ.",
    "evidence": [
     {
      "name": "TC-PAT-004__s02__validation",
      "caption": "Báo lỗi đỏ trên các trường bắt buộc còn trống",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#245",
     "#239"
    ]
   },
   {
    "id": "TC-PAT-005",
    "title": "Validation định dạng SĐT và CCCD (sai định dạng/độ dài)",
    "category": "validation",
    "priority": "P1",
    "role": "Lễ tân/Tiếp đón",
    "preconditions": "Mở NewVisitModal.",
    "steps": [
     "Nhập SĐT 'abc123' (có chữ) → bấm Đăng ký",
     "Nhập SĐT '012' (quá ngắn)",
     "Nhập CCCD '123' (không đủ 9/12 số)",
     "Nhập CCCD có ký tự chữ"
    ],
    "expected": "Hiện thông báo lỗi định dạng cho SĐT (chỉ số, 10 chữ số) và CCCD (9 hoặc 12 số); chặn submit.",
    "evidence": [
     {
      "name": "TC-PAT-005__s01__validation",
      "caption": "Lỗi định dạng SĐT/CCCD",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#245"
    ]
   },
   {
    "id": "TC-PAT-006",
    "title": "Edge: tuổi biên (0, âm, rất lớn) và tên có dấu tiếng Việt + ký tự đặc biệt",
    "category": "edge",
    "priority": "P1",
    "role": "Lễ tân/Tiếp đón",
    "preconditions": "Mở NewVisitModal.",
    "steps": [
     "Nhập Tuổi = 0 (trẻ sơ sinh) → kiểm chấp nhận/quy đổi",
     "Nhập Tuổi = -5 → kiểm chặn",
     "Nhập Tuổi = 200 → kiểm chặn/cảnh báo",
     "Nhập Họ tên 'Nguyễn Thị Hoà Bình-Phạm <b>' (dấu tiếng Việt + ký tự đặc biệt + thẻ HTML)",
     "Lưu và xem lại hiển thị tên"
    ],
    "expected": "Tuổi 0 hợp lệ; tuổi âm/200 bị chặn hoặc cảnh báo; tên tiếng Việt hiển thị đúng dấu; thẻ HTML bị escape (không render), không gây XSS.",
    "evidence": [
     {
      "name": "TC-PAT-006__s03__validation",
      "caption": "Chặn tuổi âm/quá lớn",
      "uiState": "validation"
     },
     {
      "name": "TC-PAT-006__s05__detail",
      "caption": "Tên tiếng Việt + ký tự đặc biệt hiển thị/escape đúng",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#245"
    ]
   },
   {
    "id": "TC-PAT-007",
    "title": "Negative: hủy giữa chừng khi đang tạo BN không lưu dữ liệu",
    "category": "negative",
    "priority": "P1",
    "role": "Lễ tân/Tiếp đón",
    "preconditions": "Mở NewVisitModal, đã nhập một phần thông tin.",
    "steps": [
     "Nhập Họ tên + SĐT",
     "Bấm đóng modal / nút Hủy",
     "Mở lại modal",
     "Tra cứu BN vừa nhập theo SĐT"
    ],
    "expected": "Không tạo BN/lượt khám; form reset khi mở lại; tra cứu không tìm thấy BN dở dang.",
    "evidence": [
     {
      "name": "TC-PAT-007__s02__confirm",
      "caption": "Đóng/hủy modal đang nhập dở",
      "uiState": "confirm"
     },
     {
      "name": "TC-PAT-007__s04__empty",
      "caption": "Không tìm thấy BN dở dang sau khi hủy",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#245"
    ]
   },
   {
    "id": "TC-PAT-008",
    "title": "Cập nhật hồ sơ bệnh nhân (sửa SĐT/địa chỉ/BHYT) — luồng thành công",
    "category": "happy",
    "priority": "P1",
    "role": "Lễ tân/Điều dưỡng",
    "preconditions": "Có BN đã tạo; mở chi tiết/cập nhật hồ sơ.",
    "steps": [
     "Mở chi tiết BN",
     "Sửa SĐT, địa chỉ, số thẻ BHYT",
     "Bấm Lưu",
     "Tra cứu lại BN để xác nhận"
    ],
    "expected": "PUT /patients/{id} cập nhật thành công, toast OK; thông tin mới hiển thị khi xem lại; audit log ghi UpdatedBy = user thật.",
    "evidence": [
     {
      "name": "TC-PAT-008__s02__form",
      "caption": "Form sửa hồ sơ BN",
      "uiState": "form"
     },
     {
      "name": "TC-PAT-008__s03__success",
      "caption": "Cập nhật thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#245",
     "#239"
    ]
   },
   {
    "id": "TC-PAT-009",
    "title": "Data-consistency: tạo BN ở Tiếp đón → hiển thị đúng ở Khám bệnh (OPD) và Viện phí",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Lễ tân + Bác sĩ",
    "preconditions": "Tạo BN + lượt khám mới ở Reception.",
    "steps": [
     "Tạo BN A với họ tên/giới tính/tuổi/BHYT tại Reception",
     "Mở OpdEditor cho lượt khám của BN A",
     "Đối chiếu thông tin nhân khẩu + loại đối tượng (BHYT/Viện phí)",
     "Mở viện phí của lượt khám A đối chiếu BN + nguồn chi trả"
    ],
    "expected": "Thông tin BN nhất quán giữa Reception → OPD → Viện phí (cùng patientCode/tên/đối tượng BHYT); không lệch dữ liệu.",
    "evidence": [
     {
      "name": "TC-PAT-009__s02__detail",
      "caption": "Thông tin BN ở OPD khớp Reception",
      "uiState": "detail"
     },
     {
      "name": "TC-PAT-009__s04__detail",
      "caption": "Thông tin BN ở Viện phí khớp",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#245",
     "#241"
    ]
   },
   {
    "id": "TC-PAT-010",
    "title": "Thêm/sửa/xóa cờ đánh dấu BN (PatientFlags) — 7 loại",
    "category": "happy",
    "priority": "P1",
    "role": "Lễ tân/Điều dưỡng",
    "preconditions": "Có BN; mở PatientFlagsSection.",
    "steps": [
     "Thêm cờ loại 'Nợ viện phí' với màu + ghi chú + ngày hết hạn",
     "Thêm cờ 'VIP'",
     "Sửa ghi chú cờ vừa tạo",
     "Xóa 1 cờ",
     "Tải lại để xác nhận trạng thái active/expires"
    ],
    "expected": "POST/DELETE /patient-flag hoạt động; danh sách cờ hiển thị đúng màu + loại; cờ hết hạn thể hiện đúng; xóa cập nhật ngay.",
    "evidence": [
     {
      "name": "TC-PAT-010__s01__modal",
      "caption": "Form thêm cờ BN 7 loại",
      "uiState": "modal"
     },
     {
      "name": "TC-PAT-010__s05__list",
      "caption": "Danh sách cờ với màu + trạng thái",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#245"
    ]
   },
   {
    "id": "TC-PAT-011",
    "title": "Cờ cảnh báo BN hiển thị nổi bật ở màn tiếp đón/khám (state cảnh báo)",
    "category": "ui",
    "priority": "P1",
    "role": "Lễ tân/Bác sĩ",
    "preconditions": "BN có cờ 'Dị ứng nặng' và 'Bệnh truyền nhiễm' đang active.",
    "steps": [
     "Mở lượt khám/hồ sơ BN có cờ active",
     "Quan sát badge/cảnh báo cờ",
     "Kiểm tra dark mode và light mode",
     "Kiểm tra cờ đã hết hạn không hiển thị cảnh báo"
    ],
    "expected": "Badge cờ active hiển thị nổi bật đúng màu ở cả dark/light; cờ hết hạn không cảnh báo; tên loại cờ tiếng Việt đúng.",
    "evidence": [
     {
      "name": "TC-PAT-011__s02__detail",
      "caption": "Badge cảnh báo cờ ở light mode",
      "uiState": "detail"
     },
     {
      "name": "TC-PAT-011__s03__detail",
      "caption": "Badge cảnh báo cờ ở dark mode",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#245"
    ]
   },
   {
    "id": "TC-PAT-012",
    "title": "Thêm/sửa/xóa dị ứng (Allergies) cho BN — luồng thành công",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ/Điều dưỡng",
    "preconditions": "BN đang khám; mở tab Dị ứng trong OpdEditor.",
    "steps": [
     "Thêm dị ứng: loại, dị nguyên 'Penicillin', phản ứng 'Phát ban', mức độ Nặng, ngày ghi nhận",
     "Lưu",
     "Sửa mức độ sang Nhẹ",
     "Xóa 1 dị ứng",
     "Tải lại xác nhận"
    ],
    "expected": "POST/PUT/DELETE /examination/.../allergies hoạt động; danh sách cập nhật đúng; dị ứng active dùng cho kiểm tra kê đơn.",
    "evidence": [
     {
      "name": "TC-PAT-012__s01__form",
      "caption": "Form thêm dị ứng",
      "uiState": "form"
     },
     {
      "name": "TC-PAT-012__s05__list",
      "caption": "Danh sách dị ứng sau khi sửa/xóa",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#245",
     "#239"
    ]
   },
   {
    "id": "TC-PAT-013",
    "title": "Thêm/sửa/xóa chống chỉ định (Contraindications) cho BN",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "BN đang khám; mở tab Chống chỉ định.",
    "steps": [
     "Thêm CCĐ: loại, tên 'Suy thận', mô tả, ngày ghi nhận",
     "Lưu",
     "Sửa mô tả",
     "Xóa 1 CCĐ"
    ],
    "expected": "POST/PUT/DELETE /examination/.../contraindications hoạt động; danh sách cập nhật; CCĐ active dùng cho kiểm tra kê thuốc.",
    "evidence": [
     {
      "name": "TC-PAT-013__s01__form",
      "caption": "Form thêm chống chỉ định",
      "uiState": "form"
     },
     {
      "name": "TC-PAT-013__s04__list",
      "caption": "Danh sách CCĐ sau thao tác",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#245"
    ]
   },
   {
    "id": "TC-PAT-014",
    "title": "Patient-safety: cảnh báo dị ứng thuốc khi kê đơn (check-drug-allergies)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "BN có dị ứng 'Penicillin' active; kê đơn có thuốc chứa Penicillin.",
    "steps": [
     "Mở kê đơn cho BN",
     "Thêm thuốc Penicillin vào đơn",
     "Quan sát cảnh báo dị ứng trả về",
     "Thử lưu đơn"
    ],
    "expected": "Hệ thống gọi check-drug-allergies và hiện cảnh báo NỔI BẬT thuốc xung đột; yêu cầu xác nhận/chặn lưu khi chưa xác nhận; cảnh báo ghi audit.",
    "evidence": [
     {
      "name": "TC-PAT-014__s03__modal",
      "caption": "Cảnh báo dị ứng thuốc khi kê đơn",
      "uiState": "modal"
     },
     {
      "name": "TC-PAT-014__s04__confirm",
      "caption": "Yêu cầu xác nhận trước khi lưu đơn có cảnh báo",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#245",
     "#239"
    ]
   },
   {
    "id": "TC-PAT-015",
    "title": "Patient-safety: cảnh báo chống chỉ định khi kê đơn (check-contraindications)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "BN có CCĐ 'Suy thận'; kê thuốc thuộc nhóm chống chỉ định với suy thận.",
    "steps": [
     "Mở kê đơn cho BN",
     "Thêm thuốc bị chống chỉ định",
     "Quan sát cảnh báo CCĐ",
     "Thử bỏ qua/xác nhận"
    ],
    "expected": "check-contraindications trả cảnh báo CCĐ đúng; hiển thị rõ thuốc + lý do; xác nhận có audit.",
    "evidence": [
     {
      "name": "TC-PAT-015__s03__modal",
      "caption": "Cảnh báo chống chỉ định khi kê đơn",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#245"
    ]
   },
   {
    "id": "TC-PAT-016",
    "title": "Xác thực thẻ BHYT hợp lệ qua cổng (BhytVerifyModal) — luồng thành công",
    "category": "integration",
    "priority": "P0",
    "role": "Lễ tân",
    "preconditions": "Có số thẻ BHYT hợp lệ (mock dev hoặc thật); mở BhytVerifyModal.",
    "steps": [
     "Nhập số thẻ BHYT hợp lệ + họ tên",
     "Bấm Xác thực",
     "Đợi kết quả từ cổng",
     "Đối chiếu mức hưởng/hạn thẻ/nơi ĐKKCB"
    ],
    "expected": "Trả kết quả hợp lệ, hiển thị panel xanh với mức hưởng/hạn/nơi KCB; thông tin BHYT nạp vào hồ sơ.",
    "evidence": [
     {
      "name": "TC-PAT-016__s02__loading",
      "caption": "Đang gọi cổng xác thực BHYT",
      "uiState": "loading"
     },
     {
      "name": "TC-PAT-016__s04__success",
      "caption": "Kết quả thẻ BHYT hợp lệ",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#245",
     "#241"
    ]
   },
   {
    "id": "TC-PAT-017",
    "title": "Negative: xác thực thẻ BHYT sai/hết hạn → báo lỗi đúng",
    "category": "negative",
    "priority": "P1",
    "role": "Lễ tân",
    "preconditions": "Mở BhytVerifyModal.",
    "steps": [
     "Nhập số thẻ sai định dạng/không tồn tại",
     "Bấm Xác thực",
     "Nhập thẻ hết hạn",
     "Quan sát thông báo"
    ],
    "expected": "Hiện panel đỏ 'không hợp lệ'/hết hạn với lý do rõ; không nạp BHYT vào hồ sơ; có thể chuyển đối tượng sang Viện phí.",
    "evidence": [
     {
      "name": "TC-PAT-017__s04__error",
      "caption": "Thẻ BHYT không hợp lệ/hết hạn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#245"
    ]
   },
   {
    "id": "TC-PAT-018",
    "title": "Đăng ký thông tin chấn thương (TraumaRegistry / InjuryInfos) gắn BN",
    "category": "happy",
    "priority": "P2",
    "role": "Bác sĩ/Lễ tân cấp cứu",
    "preconditions": "Có BN; mở /v2/trauma-registry.",
    "steps": [
     "Mở TraumaRegistry",
     "Thêm bản ghi chấn thương gắn BN: loại (TNGT), hoàn cảnh, thời gian",
     "Lưu",
     "Mở lại danh sách xác nhận"
    ],
    "expected": "InjuryInfos được lưu gắn đúng patientId; hiển thị trong danh sách; phục vụ giấy chứng nhận thương tích.",
    "evidence": [
     {
      "name": "TC-PAT-018__s02__form",
      "caption": "Form thêm chấn thương",
      "uiState": "form"
     },
     {
      "name": "TC-PAT-018__s04__list",
      "caption": "Danh sách chấn thương của BN",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#245"
    ]
   },
   {
    "id": "TC-PAT-019",
    "title": "Permission: vai trò không đủ quyền bị chặn xem/sửa hồ sơ BN (matrix #216)",
    "category": "permission",
    "priority": "P0",
    "role": "User vai trò hạn chế (vd Kế toán/Kỹ thuật viên)",
    "preconditions": "Đăng nhập bằng user KHÔNG có quyền quản lý BN.",
    "steps": [
     "Đăng nhập user vai trò hạn chế",
     "Thử mở menu/màn quản lý BN",
     "Thử gọi trực tiếp API PUT/DELETE /patients/{id}",
     "Quan sát phản hồi"
    ],
    "expected": "Menu/nút bị ẩn hoặc disable; API trả 403; không lộ dữ liệu BN; chặn đúng theo matrix phân quyền #216.",
    "evidence": [
     {
      "name": "TC-PAT-019__s02__permission",
      "caption": "Menu/nút quản lý BN bị chặn với vai trò hạn chế",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#245",
     "#216"
    ]
   },
   {
    "id": "TC-PAT-020",
    "title": "Security IDOR: chặn xem hồ sơ BN khác qua id trực tiếp",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ khoa khác / user thường",
    "preconditions": "Có 2 BN id A và B; user chỉ có ngữ cảnh với BN A.",
    "steps": [
     "Đăng nhập, lấy token",
     "Gọi GET /patients/{idB} với id của BN không thuộc ngữ cảnh",
     "Thử PUT/DELETE /patients/{idB}",
     "Quan sát phản hồi + audit"
    ],
    "expected": "Hệ thống không để lộ trái phép hồ sơ BN khác (403/404 theo policy); mọi truy cập ghi audit; không IDOR.",
    "evidence": [
     {
      "name": "TC-PAT-020__s02__error",
      "caption": "Chặn truy cập hồ sơ BN khác (IDOR)",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#245",
     "#216"
    ]
   },
   {
    "id": "TC-PAT-021",
    "title": "Security: path-traversal / truy cập ảnh BN (PatientPhotos) trái phép",
    "category": "security",
    "priority": "P1",
    "role": "Tester bảo mật",
    "preconditions": "BN có photoPath; biết endpoint phục vụ ảnh BN.",
    "steps": [
     "Gọi endpoint ảnh BN với path hợp lệ",
     "Thử path traversal '../../appsettings.json' hoặc id ảnh BN khác",
     "Thử không kèm token",
     "Quan sát phản hồi"
    ],
    "expected": "Chỉ trả ảnh hợp lệ của BN có quyền; path traversal bị chặn (đã có guard commit #181); request không token bị 401.",
    "evidence": [
     {
      "name": "TC-PAT-021__s02__error",
      "caption": "Chặn path-traversal khi lấy ảnh BN",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#245",
     "#216"
    ]
   },
   {
    "id": "TC-PAT-022",
    "title": "Security XSS: field ghi chú cờ / dị ứng / địa chỉ không thực thi script",
    "category": "security",
    "priority": "P1",
    "role": "Tester bảo mật",
    "preconditions": "Mở form thêm cờ BN / dị ứng / hồ sơ.",
    "steps": [
     "Nhập ghi chú cờ = '<script>alert(1)</script>'",
     "Nhập dị nguyên/địa chỉ chứa '<img src=x onerror=alert(1)>'",
     "Lưu",
     "Mở lại nơi hiển thị các field này"
    ],
    "expected": "Chuỗi được escape/hiển thị dạng text, KHÔNG thực thi script; không có popup alert; dữ liệu lưu nguyên văn an toàn.",
    "evidence": [
     {
      "name": "TC-PAT-022__s04__detail",
      "caption": "Payload XSS hiển thị dạng text, không thực thi",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#245"
    ]
   },
   {
    "id": "TC-PAT-023",
    "title": "Edge: chuỗi rất dài + nhiều ký tự đặc biệt ở họ tên/địa chỉ/ghi chú",
    "category": "edge",
    "priority": "P2",
    "role": "Lễ tân",
    "preconditions": "Mở form tạo/sửa BN.",
    "steps": [
     "Nhập Họ tên 500 ký tự",
     "Nhập Địa chỉ 2000 ký tự",
     "Nhập ghi chú cờ rất dài",
     "Lưu và xem hiển thị"
    ],
    "expected": "Hệ thống giới hạn độ dài hợp lý (báo lỗi nếu vượt) hoặc lưu + hiển thị không vỡ layout; không lỗi 500.",
    "evidence": [
     {
      "name": "TC-PAT-023__s04__detail",
      "caption": "Hiển thị chuỗi dài không vỡ layout",
      "uiState": "detail"
     },
     {
      "name": "TC-PAT-023__s01__validation",
      "caption": "Báo lỗi/giới hạn độ dài",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#245"
    ]
   },
   {
    "id": "TC-PAT-024",
    "title": "State: chống tạo BN trùng (cùng CCCD) — cảnh báo & gộp/khớp",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Lễ tân",
    "preconditions": "Đã có BN với CCCD '012345678901'.",
    "steps": [
     "Mở NewVisitModal",
     "Nhập đúng CCCD '012345678901' nhưng họ tên khác",
     "Bấm Đăng ký",
     "Quan sát hành vi (cảnh báo trùng/khớp BN cũ)"
    ],
    "expected": "Hệ thống phát hiện CCCD đã tồn tại → cảnh báo trùng và gợi ý khớp BN cũ thay vì tạo bản ghi nhân khẩu trùng.",
    "evidence": [
     {
      "name": "TC-PAT-024__s03__confirm",
      "caption": "Cảnh báo CCCD trùng, gợi ý khớp BN cũ",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#245",
     "#241"
    ]
   },
   {
    "id": "TC-PAT-025",
    "title": "UI: empty/loading/error state khi tra cứu BN",
    "category": "ui",
    "priority": "P1",
    "role": "Lễ tân",
    "preconditions": "Mở PatientLookupModal.",
    "steps": [
     "Tìm keyword không khớp BN nào → quan sát empty state",
     "Tìm với mạng chậm/throttle → quan sát loading",
     "Mô phỏng API lỗi (BE tắt) → quan sát error state"
    ],
    "expected": "Empty state có thông báo 'không có BN'; loading hiện spinner/skeleton; lỗi API hiện thông báo lỗi thân thiện + nút thử lại; cả dark/light đều đúng.",
    "evidence": [
     {
      "name": "TC-PAT-025__s01__empty",
      "caption": "Empty state khi không có BN",
      "uiState": "empty"
     },
     {
      "name": "TC-PAT-025__s02__loading",
      "caption": "Loading khi tra cứu",
      "uiState": "loading"
     },
     {
      "name": "TC-PAT-025__s03__error",
      "caption": "Error state khi API lỗi",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#245"
    ]
   },
   {
    "id": "TC-PAT-026",
    "title": "Edge: ngày sinh tương lai / quá khứ rất xa và năm sinh-tuổi mâu thuẫn",
    "category": "edge",
    "priority": "P1",
    "role": "Lễ tân",
    "preconditions": "Mở form BN có nhập ngày sinh/năm sinh.",
    "steps": [
     "Nhập ngày sinh ở tương lai (2030)",
     "Nhập năm sinh 1850",
     "Nhập tuổi mâu thuẫn với năm sinh",
     "Lưu"
    ],
    "expected": "Ngày sinh tương lai bị chặn; năm sinh quá xa cảnh báo; tuổi/năm sinh mâu thuẫn được phát hiện hoặc tự đồng bộ; không lưu dữ liệu vô lý.",
    "evidence": [
     {
      "name": "TC-PAT-026__s04__validation",
      "caption": "Chặn ngày sinh tương lai / năm sinh vô lý",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#245"
    ]
   },
   {
    "id": "TC-PAT-027",
    "title": "Negative/state: xóa BN đang có lượt khám/HSBA liên kết bị chặn",
    "category": "state",
    "priority": "P0",
    "role": "Quản trị/Lễ tân",
    "preconditions": "BN A đã có MedicalRecord/lượt khám.",
    "steps": [
     "Mở chi tiết BN A có lượt khám",
     "Bấm Xóa (DELETE /patients/{id})",
     "Quan sát phản hồi"
    ],
    "expected": "Hệ thống chặn xóa (hoặc soft-delete IsDeleted) khi BN còn dữ liệu liên kết; báo lỗi rõ; không phá vỡ tham chiếu MedicalRecord; audit ghi.",
    "evidence": [
     {
      "name": "TC-PAT-027__s03__error",
      "caption": "Chặn xóa BN còn dữ liệu liên kết",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#245",
     "#239"
    ]
   },
   {
    "id": "TC-PAT-028",
    "title": "Data-consistency: audit log ghi đúng mọi mutation hồ sơ BN",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản trị/Auditor",
    "preconditions": "Thực hiện create/update/xóa cờ/thêm dị ứng cho BN.",
    "steps": [
     "Tạo BN mới",
     "Sửa hồ sơ BN",
     "Thêm cờ + thêm dị ứng",
     "Mở màn Audit/AuditLog lọc theo BN",
     "Đối chiếu CreatedBy/UpdatedBy = user thật (≠ Guid.Empty)"
    ],
    "expected": "Mỗi mutation sinh bản ghi audit với hành động/đối tượng/người thực hiện/thời gian đúng; CreatedBy/UpdatedBy là user đăng nhập, không phải Guid.Empty.",
    "evidence": [
     {
      "name": "TC-PAT-028__s04__list",
      "caption": "Audit log ghi đúng các mutation hồ sơ BN",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#245",
     "#216"
    ]
   }
  ],
  "ui_state_checklist": [
   "list (kết quả tra cứu BN, danh sách cờ/dị ứng/CCĐ/chấn thương, audit log)",
   "detail (chi tiết hồ sơ BN, thông tin nạp vào lượt khám)",
   "form (tạo/sửa BN, thêm dị ứng/CCĐ/chấn thương)",
   "modal (thêm cờ, cảnh báo dị ứng/CCĐ khi kê đơn)",
   "filter (tra cứu theo CCCD/SĐT/BHYT/mã BN)",
   "validation (trường bắt buộc, định dạng SĐT/CCCD, tuổi/ngày sinh biên, độ dài)",
   "empty (không có kết quả tra cứu)",
   "loading (đang tìm/đang xác thực BHYT)",
   "error (API lỗi, IDOR/path-traversal bị chặn, BHYT không hợp lệ, xóa bị chặn)",
   "confirm (hủy giữa chừng, cảnh báo trùng CCCD, xác nhận kê đơn có cảnh báo)",
   "success (tạo/sửa BN thành công, BHYT hợp lệ)",
   "toast (thông báo lưu thành công)",
   "permission (vai trò bị chặn menu/nút/API)",
   "dark/light parity (badge cờ, panel BHYT, bảng)"
  ],
  "gaps": [
   "Chưa có trang /v2/patients độc lập (quản lý BN tập trung) — hiện chỉ bộc lộ qua Reception/OPD/TraumaRegistry; cần xác nhận có planned hay không, ảnh hưởng tới điều hướng + permission test.",
   "Chưa rõ chính sách soft-delete vs hard-delete BN (DELETE /patients) và ràng buộc tham chiếu MedicalRecord — cần test cụ thể (TC-PAT-027) + xác nhận với backend.",
   "Merge/gộp hồ sơ BN trùng (cùng người, 2 mã BN) chưa có flow trong UI — gap nghiệp vụ lớn cho bệnh viện; cần bổ sung test khi có tính năng.",
   "Quản lý ảnh BN (PatientPhotos): upload/crop/đổi ảnh chưa thấy UI rõ; chỉ có photoPath — cần kiểm tra luồng upload + path-traversal đầy đủ.",
   "InsuranceCards (lịch sử nhiều thẻ BHYT theo thời gian) chưa rõ có quản lý nhiều thẻ/đợt; hiện chỉ thấy field BHYT đơn trên Patient — gap với nghiệp vụ thông tuyến/đổi thẻ.",
   "Phân quyền chi tiết theo khoa/phòng (BN khoa khác) cho IDOR (TC-PAT-020) phụ thuộc matrix #216 — cần xác nhận policy thực tế (403 vs 404 vs cho xem read-only).",
   "Đồng bộ tuổi ↔ năm sinh ↔ ngày sinh (NewVisitModal dùng 'age', Patient dùng dateOfBirth/yearOfBirth) — rủi ro lệch dữ liệu khi tạo từ Reception; cần test mapping.",
   "Kiểm tra trùng dị ứng/CCĐ active (thêm 2 lần cùng dị nguyên) và việc deactivate vs xóa chưa có case riêng — nên bổ sung.",
   "Responsive/mobile cho các modal tạo BN + tra cứu chưa có case; PatientPortalMobile tồn tại nhưng phạm vi BN portal khác — cần làm rõ scope."
  ]
 },
 {
  "id": "opd",
  "code": "OPD",
  "layer": "clin",
  "ic": "🩺",
  "nm": "Khám bệnh & Hồ sơ bệnh án",
  "gh": [
   "#239",
   "#240",
   "#241",
   "#243"
  ],
  "gap": false,
  "module_id": "opd",
  "summary": "Phân hệ \"Khám bệnh & Hồ sơ bệnh án\" (OPD) lấy MedicalRecords làm hub trung tâm: mỗi hồ sơ thuộc 1 Patient, chứa các Examinations và link Department/Room/Doctor, phân loại theo PatientType (BHYT/Viện phí/DV/KSK) và TreatmentType (Ngoại/Nội/Cấp cứu). Các bảng chính gồm MedicalRecords, MedicalRecordArchives/BorrowRequests (lưu trữ & mượn HSBA), Examinations + ExaminationTemplates + ExaminationActivityLogs, ConsultationRecords/Rooms/Participants (hội chẩn), TreatmentSheets/NursingCareSheets (tờ điều trị & chăm sóc), ClinicalTemplates/ClinicalGuidanceBatches/Activities, TreatmentProtocols/Steps (phác đồ), ClinicalDirections (chỉ đạo tuyến) và DiagnosisInterruptions. Màn chính: danh sách hàng chờ khám OPD, màn khám/bệnh án (OpdEditor), lưu trữ HSBA, hội chẩn, phác đồ điều trị, chỉ đạo tuyến, danh mục lâm sàng. Quy tắc an toàn cốt lõi: bắt buộc kiểm tra dị ứng/chống chỉ định trước khi kê đơn, và mọi mutation phải ghi audit log với CreatedBy là user thật.",
  "screens": [
   {
    "name": "Hàng chờ khám OPD",
    "desc": "Danh sách lượt khám trong phòng: KPI (đang chờ/đang khám/đã khám), tab trạng thái, bảng BN với nút Khám mở editor.",
    "route_guess": "/v2/opd",
    "elements": [
     "KpiStrip (chờ/đang khám/đã khám/cấp cứu)",
     "StatusTabs theo trạng thái lượt khám",
     "Bộ lọc phòng/khoa/loại BN/ngày",
     "DataTable hàng chờ (STT, mã BN, tên, tuổi, loại BN, ưu tiên, trạng thái)",
     "ActBtn Khám (stethoscope)",
     "Empty/loading state"
    ]
   },
   {
    "name": "Màn khám & bệnh án (OpdEditor)",
    "desc": "Nhập lý do khám, hỏi bệnh, khám lâm sàng, sinh hiệu, chẩn đoán (ICD), hướng xử trí; chọn mẫu khám; lưu/hoàn tất lượt khám.",
    "route_guess": "/v2/opd/edit",
    "elements": [
     "Form hành chính BN (readonly)",
     "Trường lý do vào viện/quá trình bệnh",
     "Sinh hiệu (mạch/HA/nhiệt độ/SpO2/cân nặng)",
     "Khám lâm sàng theo cơ quan",
     "Chọn ExaminationTemplate (dropdown mẫu khám)",
     "Chẩn đoán chính/phụ ICD-10 (autocomplete)",
     "Hướng xử trí (kê đơn/chỉ định CLS/nhập viện/cho về)",
     "Nút Lưu nháp / Hoàn tất khám",
     "Cảnh báo dị ứng/chống chỉ định"
    ]
   },
   {
    "name": "Lưu trữ HSBA",
    "desc": "Quản lý lưu trữ và mượn/trả bệnh án (MedicalRecordArchives, MedicalRecordBorrowRequests).",
    "route_guess": "/v2/medical-record-archive",
    "elements": [
     "DataTable hồ sơ lưu trữ (mã HS, BN, vị trí kho, trạng thái)",
     "Tab Yêu cầu mượn HSBA",
     "Form tạo yêu cầu mượn (người mượn/lý do/hạn trả)",
     "Trạng thái mượn (Pending/Approved/Returned/Overdue)",
     "Filter theo kho/ngày"
    ]
   },
   {
    "name": "Hội chẩn",
    "desc": "Danh sách biên bản hội chẩn (ConsultationRecords) + phòng & thành viên hội chẩn.",
    "route_guess": "/v2/consultation",
    "elements": [
     "DataTable biên bản hội chẩn",
     "Nút Đăng ký hội chẩn (-> /v2/consultation-register)",
     "DrawerShell chi tiết: phòng (ConsultationRooms), thành viên (ConsultationParticipants), kết luận",
     "Trạng thái (Draft/Pending/Approved)"
    ]
   },
   {
    "name": "Đăng ký hội chẩn",
    "desc": "Form tạo phiên hội chẩn: chọn BN/HSBA, phòng, thành phần tham gia, thời gian, lý do.",
    "route_guess": "/v2/consultation-register",
    "elements": [
     "Select BN/HSBA",
     "Select ConsultationRoom",
     "Multi-select thành viên (ConsultationParticipants)",
     "DatePicker thời gian",
     "Trường lý do/nội dung",
     "Nút Tạo"
    ]
   },
   {
    "name": "Phác đồ điều trị",
    "desc": "Quản lý TreatmentProtocols và các bước (TreatmentProtocolSteps).",
    "route_guess": "/v2/treatment-protocols",
    "elements": [
     "DataTable phác đồ (tên, ICD áp dụng, trạng thái)",
     "DrawerShell/ModalShell chi tiết bước phác đồ (thứ tự, mô tả, thuốc/dịch vụ)",
     "Nút Thêm/Sửa/Kích hoạt phác đồ",
     "Empty state"
    ]
   },
   {
    "name": "Chỉ đạo tuyến",
    "desc": "Quản lý ClinicalDirections + đợt/hoạt động hướng dẫn lâm sàng (ClinicalGuidanceBatches/Activities).",
    "route_guess": "/v2/clinical-guidance",
    "elements": [
     "DataTable đợt hướng dẫn LS",
     "Chi tiết hoạt động (ClinicalGuidanceActivities)",
     "Trường tuyến trên/tuyến dưới",
     "Trạng thái đợt"
    ]
   },
   {
    "name": "Danh mục lâm sàng",
    "desc": "Quản lý ExaminationTemplates, ClinicalTemplates, OutpatientRecordTemplates.",
    "route_guess": "/v2/clinical-catalogs",
    "elements": [
     "Tabs mẫu khám / mẫu lâm sàng / mẫu HS ngoại trú",
     "DataTable mẫu (tên, chuyên khoa, trạng thái)",
     "ModalShell thêm/sửa mẫu",
     "Toggle kích hoạt"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-OPD-001",
    "title": "Khám ngoại trú happy-path: tiếp nhận lượt chờ → khám → hoàn tất",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ khám",
    "preconditions": "Đăng nhập admin/Admin@123. Có ít nhất 1 BN đang ở trạng thái Chờ khám trong /v2/opd (đã tiếp đón từ Reception).",
    "steps": [
     "Mở /v2/opd, xác nhận BN hiển thị ở tab Chờ khám",
     "Click nút Khám (stethoscope) trên dòng BN -> mở /v2/opd/edit",
     "Nhập lý do khám, sinh hiệu (mạch 80, HA 120/80, nhiệt 37, SpO2 98)",
     "Chọn chẩn đoán chính ICD-10 hợp lệ",
     "Nhập hướng xử trí Cho về",
     "Click Hoàn tất khám"
    ],
    "expected": "Lượt khám lưu thành công, toast/success hiển thị; BN chuyển từ tab Chờ khám sang Đã khám; Examination được tạo gắn đúng MedicalRecord; ExaminationActivityLog ghi nhận thao tác.",
    "evidence": [
     {
      "name": "TC-OPD-001__s01__list",
      "caption": "Hàng chờ khám có BN ở tab Chờ khám",
      "uiState": "list"
     },
     {
      "name": "TC-OPD-001__s02__form",
      "caption": "Form khám đã nhập sinh hiệu + chẩn đoán",
      "uiState": "form"
     },
     {
      "name": "TC-OPD-001__s03__success",
      "caption": "Hoàn tất khám thành công",
      "uiState": "success"
     },
     {
      "name": "TC-OPD-001__s04__list",
      "caption": "BN chuyển sang tab Đã khám",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Trục happy chính của luồng FLOWS opd."
   },
   {
    "id": "TC-OPD-002",
    "title": "Hoàn tất khám khi thiếu chẩn đoán chính bị chặn",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ khám",
    "preconditions": "Đang ở /v2/opd/edit với 1 lượt khám đang mở.",
    "steps": [
     "Nhập sinh hiệu nhưng bỏ trống trường Chẩn đoán chính",
     "Click Hoàn tất khám"
    ],
    "expected": "Hệ thống chặn lưu, hiển thị thông báo lỗi đỏ tại field Chẩn đoán chính (vd 'Vui lòng nhập chẩn đoán chính'); không tạo Examination ở trạng thái hoàn tất.",
    "evidence": [
     {
      "name": "TC-OPD-002__s01__validation",
      "caption": "Lỗi yêu cầu chẩn đoán chính",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-OPD-003",
    "title": "Validation từng field sinh hiệu (range/định dạng)",
    "category": "validation",
    "priority": "P1",
    "role": "Bác sĩ khám",
    "preconditions": "Đang ở form khám /v2/opd/edit.",
    "steps": [
     "Nhập mạch = 999, nhiệt độ = 50, SpO2 = 150, HA = 'abc'",
     "Rời focus từng field",
     "Thử Hoàn tất khám"
    ],
    "expected": "Mỗi field vượt range sinh lý hiển thị cảnh báo riêng (mạch/nhiệt/SpO2 ngoài khoảng, HA sai định dạng số/số); chặn lưu cho tới khi sửa hợp lệ.",
    "evidence": [
     {
      "name": "TC-OPD-003__s01__validation",
      "caption": "Cảnh báo từng field sinh hiệu ngoài range",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-OPD-004",
    "title": "Edge: nhập ký tự đặc biệt + tiếng Việt có dấu + chuỗi rất dài ở mô tả bệnh",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ khám",
    "preconditions": "Form khám đang mở.",
    "steps": [
     "Nhập quá trình bệnh chứa tiếng Việt có dấu đầy đủ (vd 'Đau bụng vùng thượng vị, sốt nhẹ về chiều')",
     "Thêm ký tự đặc biệt < > & ' \" và emoji",
     "Dán chuỗi ~5000 ký tự",
     "Lưu nháp"
    ],
    "expected": "Tiếng Việt hiển thị/lưu đúng không lỗi font; chuỗi dài bị giới hạn theo maxLength có thông báo hoặc lưu đầy đủ và render lại đúng; ký tự đặc biệt được escape, không vỡ layout.",
    "evidence": [
     {
      "name": "TC-OPD-004__s01__form",
      "caption": "Nhập tiếng Việt + ký tự đặc biệt + chuỗi dài",
      "uiState": "form"
     },
     {
      "name": "TC-OPD-004__s02__detail",
      "caption": "Render lại đúng sau khi lưu",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#241"
    ]
   },
   {
    "id": "TC-OPD-005",
    "title": "Security XSS ở trường ghi chú/quá trình bệnh",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ khám",
    "preconditions": "Form khám đang mở.",
    "steps": [
     "Nhập vào trường quá trình bệnh: <script>alert('xss')</script> và <img src=x onerror=alert(1)>",
     "Lưu lượt khám",
     "Mở lại lượt khám để xem chi tiết"
    ],
    "expected": "Nội dung được hiển thị dưới dạng text thuần, KHÔNG thực thi script/onerror; không có alert popup; payload được escape khi render.",
    "evidence": [
     {
      "name": "TC-OPD-005__s01__detail",
      "caption": "Payload XSS hiển thị as text, không thực thi",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#243"
    ]
   },
   {
    "id": "TC-OPD-006",
    "title": "Patient-safety: cảnh báo dị ứng/chống chỉ định trước khi kê đơn",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ khám",
    "preconditions": "BN có bản ghi Allergy/Contraindication (vd dị ứng Penicillin) trong hồ sơ tiền sử.",
    "steps": [
     "Mở khám BN này tại /v2/opd/edit",
     "Vào bước kê đơn/chuyển kê đơn",
     "Chọn thuốc thuộc nhóm bị dị ứng/chống chỉ định"
    ],
    "expected": "Hệ thống hiển thị cảnh báo dị ứng/chống chỉ định nổi bật trước khi cho phép kê; yêu cầu xác nhận hoặc chặn theo cấu hình; cảnh báo trùng khớp dữ liệu Allergy/Contraindication của BN.",
    "evidence": [
     {
      "name": "TC-OPD-006__s01__modal",
      "caption": "Modal cảnh báo dị ứng khi chọn thuốc trùng",
      "uiState": "modal"
     },
     {
      "name": "TC-OPD-006__s02__confirm",
      "caption": "Yêu cầu xác nhận trước khi kê",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#239",
     "#243"
    ],
    "notes": "NOTES[opd]: bắt buộc kiểm tra dị ứng/chống chỉ định trước khi kê đơn."
   },
   {
    "id": "TC-OPD-007",
    "title": "State: chặn chỉnh sửa lượt khám đã hoàn tất/khóa",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ khám",
    "preconditions": "Có 1 lượt khám đã Hoàn tất.",
    "steps": [
     "Mở lại lượt khám đã hoàn tất",
     "Thử sửa chẩn đoán hoặc sinh hiệu",
     "Thử Lưu"
    ],
    "expected": "Các trường ở chế độ readonly hoặc Lưu bị chặn với thông báo lượt khám đã hoàn tất/khóa; muốn sửa phải qua quy trình mở khóa/bổ sung hợp lệ.",
    "evidence": [
     {
      "name": "TC-OPD-007__s01__detail",
      "caption": "Lượt khám hoàn tất ở chế độ readonly",
      "uiState": "detail"
     },
     {
      "name": "TC-OPD-007__s02__error",
      "caption": "Thông báo chặn sửa lượt đã khóa",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-OPD-008",
    "title": "Negative: hủy giữa chừng form khám không lưu rác",
    "category": "negative",
    "priority": "P1",
    "role": "Bác sĩ khám",
    "preconditions": "Form khám /v2/opd/edit đang nhập dở.",
    "steps": [
     "Nhập một phần sinh hiệu + chẩn đoán",
     "Click Hủy/Quay lại",
     "Xác nhận thoát ở dialog (nếu có)"
    ],
    "expected": "Hiển thị confirm cảnh báo mất dữ liệu chưa lưu; khi xác nhận thoát, không tạo Examination dở dang; BN vẫn ở tab Chờ khám.",
    "evidence": [
     {
      "name": "TC-OPD-008__s01__confirm",
      "caption": "Confirm cảnh báo mất dữ liệu khi hủy",
      "uiState": "confirm"
     },
     {
      "name": "TC-OPD-008__s02__list",
      "caption": "BN vẫn ở Chờ khám sau khi hủy",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-OPD-009",
    "title": "Permission: vai trò không đủ quyền bị chặn khám/menu OPD",
    "category": "permission",
    "priority": "P0",
    "role": "Lễ tân (không có quyền khám)",
    "preconditions": "Tài khoản role không có quyền OPD theo matrix #216.",
    "steps": [
     "Đăng nhập tài khoản role hạn chế",
     "Kiểm tra menu [24] Khám bệnh có hiển thị không",
     "Truy cập trực tiếp URL /v2/opd/edit",
     "Gọi trực tiếp API hoàn tất khám"
    ],
    "expected": "Menu OPD bị ẩn/disabled; truy cập URL bị chặn (redirect/403); API trả 403; không thực hiện được mutation.",
    "evidence": [
     {
      "name": "TC-OPD-009__s01__permission",
      "caption": "Menu OPD bị ẩn với role không quyền",
      "uiState": "permission"
     },
     {
      "name": "TC-OPD-009__s02__error",
      "caption": "Truy cập /v2/opd/edit bị chặn 403",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-OPD-010",
    "title": "Security IDOR: xem hồ sơ bệnh án BN khác qua sửa ID",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ khoa A",
    "preconditions": "Biết MedicalRecord/Examination ID của BN thuộc phạm vi không được phép.",
    "steps": [
     "Đăng nhập role bác sĩ giới hạn theo khoa",
     "Mở 1 lượt khám hợp lệ, ghi lại pattern ID trên URL/API",
     "Sửa ID thành ID của HSBA BN khác khoa",
     "Tải lại"
    ],
    "expected": "Hệ thống không trả dữ liệu HSBA ngoài phạm vi (403/404 hoặc lọc theo quyền); không lộ thông tin BN khác.",
    "evidence": [
     {
      "name": "TC-OPD-010__s01__error",
      "caption": "Chặn truy cập HSBA BN khác (IDOR)",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216",
     "#243"
    ]
   },
   {
    "id": "TC-OPD-011",
    "title": "Data-consistency: chẩn đoán/chỉ định ở OPD hiển thị đúng sang EMR & viện phí",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ khám",
    "preconditions": "Hoàn tất 1 lượt khám có chẩn đoán + chỉ định CLS.",
    "steps": [
     "Hoàn tất khám với chẩn đoán ICD + 1 chỉ định dịch vụ",
     "Mở Hồ sơ bệnh án (EMR) của BN",
     "Mở màn viện phí/billing của lượt khám"
    ],
    "expected": "Chẩn đoán và chỉ định hiển thị nhất quán ở EMR; chi phí dịch vụ chỉ định phát sinh đúng ở viện phí; số liệu khớp giữa OPD→EMR→Billing.",
    "evidence": [
     {
      "name": "TC-OPD-011__s01__detail",
      "caption": "Chẩn đoán/chỉ định hiển thị ở EMR",
      "uiState": "detail"
     },
     {
      "name": "TC-OPD-011__s02__tab",
      "caption": "Chi phí chỉ định khớp ở viện phí",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-OPD-012",
    "title": "Audit log ghi đúng mọi mutation lượt khám",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản trị/Bác sĩ",
    "preconditions": "Có quyền xem audit/ExaminationActivityLogs.",
    "steps": [
     "Tạo + sửa + hoàn tất 1 lượt khám",
     "Mở log hoạt động khám (ExaminationActivityLogs/AuditLog)"
    ],
    "expected": "Mỗi thao tác tạo/sửa/hoàn tất có bản ghi log với user thật (CreatedBy ≠ Guid.Empty), thời gian, hành động đúng.",
    "evidence": [
     {
      "name": "TC-OPD-012__s01__tab",
      "caption": "Log hoạt động khám ghi đủ thao tác + user",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#243"
    ]
   },
   {
    "id": "TC-OPD-013",
    "title": "Chọn mẫu khám (ExaminationTemplate) điền nhanh",
    "category": "happy",
    "priority": "P2",
    "role": "Bác sĩ khám",
    "preconditions": "Có ExaminationTemplate kích hoạt trong DM lâm sàng.",
    "steps": [
     "Mở form khám",
     "Mở dropdown chọn mẫu khám",
     "Chọn 1 mẫu phù hợp chuyên khoa"
    ],
    "expected": "Các trường khám được điền theo mẫu; có thể chỉnh sửa lại; không ghi đè dữ liệu BN đã nhập ngoài ý muốn (hoặc cảnh báo trước khi ghi đè).",
    "evidence": [
     {
      "name": "TC-OPD-013__s01__dropdown",
      "caption": "Dropdown chọn mẫu khám",
      "uiState": "dropdown"
     },
     {
      "name": "TC-OPD-013__s02__form",
      "caption": "Form được điền theo mẫu",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-OPD-014",
    "title": "UI: empty/loading/error state của hàng chờ khám",
    "category": "ui",
    "priority": "P1",
    "role": "Bác sĩ khám",
    "preconditions": "Có thể tạo trạng thái không có BN chờ và mô phỏng lỗi API.",
    "steps": [
     "Mở /v2/opd khi không có BN chờ -> xem empty state",
     "Tải lại quan sát loading",
     "Ngắt mạng/mô phỏng API lỗi -> xem error state"
    ],
    "expected": "Empty hiển thị thông điệp 'Không có BN chờ khám'; loading có skeleton/spinner; error có thông báo + nút thử lại; không màn trắng/spinner vô hạn.",
    "evidence": [
     {
      "name": "TC-OPD-014__s01__empty",
      "caption": "Empty state hàng chờ",
      "uiState": "empty"
     },
     {
      "name": "TC-OPD-014__s02__loading",
      "caption": "Loading state",
      "uiState": "loading"
     },
     {
      "name": "TC-OPD-014__s03__error",
      "caption": "Error state + thử lại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#241"
    ]
   },
   {
    "id": "TC-OPD-015",
    "title": "UI: dark/light parity màn khám & hàng chờ",
    "category": "ui",
    "priority": "P2",
    "role": "Bác sĩ khám",
    "preconditions": "Topbar v2 có toggle dark/light.",
    "steps": [
     "Mở /v2/opd ở light mode",
     "Bật dark mode bằng toggle topbar",
     "Mở /v2/opd/edit ở dark mode"
    ],
    "expected": "Cả hai mode hiển thị đủ tương phản, không chữ trắng nền trắng; KPI/tab/table/form/drawer đọc được; định dạng số/ngày nhất quán.",
    "evidence": [
     {
      "name": "TC-OPD-015__s01__list",
      "caption": "Hàng chờ light mode",
      "uiState": "list"
     },
     {
      "name": "TC-OPD-015__s02__list",
      "caption": "Hàng chờ dark mode",
      "uiState": "list"
     },
     {
      "name": "TC-OPD-015__s03__form",
      "caption": "Form khám dark mode",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#241"
    ]
   },
   {
    "id": "TC-OPD-016",
    "title": "Mượn HSBA happy + chặn mượn khi đang được mượn",
    "category": "happy",
    "priority": "P1",
    "role": "Cán bộ lưu trữ",
    "preconditions": "Mở /v2/medical-record-archive, có HSBA đã lưu trữ.",
    "steps": [
     "Tạo yêu cầu mượn HSBA (người mượn, lý do, hạn trả)",
     "Duyệt yêu cầu",
     "Tạo yêu cầu mượn thứ 2 cho cùng HSBA đang mượn"
    ],
    "expected": "Yêu cầu 1 chuyển Approved, HSBA trạng thái Đang mượn; yêu cầu 2 bị chặn hoặc xếp hàng với thông báo HSBA đang được mượn.",
    "evidence": [
     {
      "name": "TC-OPD-016__s01__form",
      "caption": "Form tạo yêu cầu mượn HSBA",
      "uiState": "form"
     },
     {
      "name": "TC-OPD-016__s02__detail",
      "caption": "HSBA trạng thái Đang mượn",
      "uiState": "detail"
     },
     {
      "name": "TC-OPD-016__s03__error",
      "caption": "Chặn mượn khi HSBA đang mượn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-OPD-017",
    "title": "Edge: hạn trả mượn HSBA trong quá khứ / quá xa tương lai",
    "category": "edge",
    "priority": "P2",
    "role": "Cán bộ lưu trữ",
    "preconditions": "Form tạo yêu cầu mượn HSBA mở.",
    "steps": [
     "Chọn hạn trả là ngày hôm qua",
     "Lưu",
     "Chọn hạn trả 100 năm sau",
     "Lưu"
    ],
    "expected": "Ngày quá khứ bị chặn với thông báo lỗi; ngày quá xa bị chặn hoặc cảnh báo theo range cho phép.",
    "evidence": [
     {
      "name": "TC-OPD-017__s01__validation",
      "caption": "Chặn hạn trả ngày quá khứ",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-OPD-018",
    "title": "Hội chẩn happy: đăng ký → biên bản → kết luận",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ chủ trì hội chẩn",
    "preconditions": "Mở /v2/consultation; có BN/HSBA hợp lệ.",
    "steps": [
     "Click Đăng ký hội chẩn -> /v2/consultation-register",
     "Chọn BN, phòng hội chẩn, ≥2 thành viên, thời gian",
     "Tạo phiên",
     "Mở biên bản, nhập kết luận, lưu/duyệt"
    ],
    "expected": "Phiên hội chẩn tạo với phòng + thành viên đúng; biên bản ConsultationRecord lưu kết luận; trạng thái chuyển Draft→Approved hợp lệ.",
    "evidence": [
     {
      "name": "TC-OPD-018__s01__form",
      "caption": "Form đăng ký hội chẩn",
      "uiState": "form"
     },
     {
      "name": "TC-OPD-018__s02__drawer",
      "caption": "Drawer biên bản + thành viên",
      "uiState": "drawer"
     },
     {
      "name": "TC-OPD-018__s03__success",
      "caption": "Hội chẩn duyệt thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-OPD-019",
    "title": "Negative hội chẩn: tạo phiên thiếu thành viên",
    "category": "negative",
    "priority": "P2",
    "role": "Bác sĩ chủ trì hội chẩn",
    "preconditions": "Form đăng ký hội chẩn mở.",
    "steps": [
     "Chọn BN + phòng nhưng không chọn thành viên nào",
     "Click Tạo"
    ],
    "expected": "Bị chặn với thông báo cần tối thiểu thành viên tham gia; không tạo phiên rỗng.",
    "evidence": [
     {
      "name": "TC-OPD-019__s01__validation",
      "caption": "Lỗi thiếu thành viên hội chẩn",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-OPD-020",
    "title": "Phác đồ điều trị: thêm phác đồ + bước theo thứ tự",
    "category": "happy",
    "priority": "P2",
    "role": "Bác sĩ chuyên khoa",
    "preconditions": "Mở /v2/treatment-protocols.",
    "steps": [
     "Thêm phác đồ mới (tên, ICD áp dụng)",
     "Thêm các bước (TreatmentProtocolSteps) theo thứ tự 1,2,3",
     "Kích hoạt phác đồ",
     "Mở lại xem chi tiết"
    ],
    "expected": "Phác đồ lưu với các bước đúng thứ tự; trạng thái Active; hiển thị lại đúng khi mở chi tiết.",
    "evidence": [
     {
      "name": "TC-OPD-020__s01__modal",
      "caption": "Modal thêm phác đồ + bước",
      "uiState": "modal"
     },
     {
      "name": "TC-OPD-020__s02__detail",
      "caption": "Chi tiết phác đồ với bước đúng thứ tự",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-OPD-021",
    "title": "Validation phác đồ: ICD/tên trùng và tên trống",
    "category": "validation",
    "priority": "P2",
    "role": "Bác sĩ chuyên khoa",
    "preconditions": "Đã có ≥1 phác đồ.",
    "steps": [
     "Thêm phác đồ để trống tên -> Lưu",
     "Thêm phác đồ trùng tên với phác đồ đã có -> Lưu"
    ],
    "expected": "Tên trống bị chặn (required); tên trùng bị chặn hoặc cảnh báo trùng lặp.",
    "evidence": [
     {
      "name": "TC-OPD-021__s01__validation",
      "caption": "Lỗi tên phác đồ trống/trùng",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#240"
    ]
   },
   {
    "id": "TC-OPD-022",
    "title": "Danh mục lâm sàng: thêm/sửa/vô hiệu mẫu khám",
    "category": "happy",
    "priority": "P2",
    "role": "Quản trị danh mục",
    "preconditions": "Mở /v2/clinical-catalogs.",
    "steps": [
     "Vào tab Mẫu khám, thêm 1 ExaminationTemplate",
     "Sửa tên mẫu",
     "Toggle vô hiệu hóa mẫu",
     "Kiểm tra mẫu vô hiệu không xuất hiện ở dropdown form khám"
    ],
    "expected": "Thêm/sửa thành công; mẫu bị vô hiệu không còn chọn được ở màn khám; thay đổi phản ánh ngay.",
    "evidence": [
     {
      "name": "TC-OPD-022__s01__modal",
      "caption": "Modal thêm/sửa mẫu khám",
      "uiState": "modal"
     },
     {
      "name": "TC-OPD-022__s02__toast",
      "caption": "Toast cập nhật thành công",
      "uiState": "toast"
     },
     {
      "name": "TC-OPD-022__s03__dropdown",
      "caption": "Mẫu vô hiệu biến mất khỏi dropdown khám",
      "uiState": "dropdown"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-OPD-023",
    "title": "Lọc & tìm kiếm hàng chờ khám theo phòng/loại BN/từ khóa",
    "category": "happy",
    "priority": "P2",
    "role": "Bác sĩ khám",
    "preconditions": "Hàng chờ có nhiều BN đa dạng phòng/loại BN.",
    "steps": [
     "Lọc theo phòng khám cụ thể",
     "Lọc theo loại BN = BHYT",
     "Tìm theo tên/mã BN có dấu tiếng Việt",
     "Xóa bộ lọc"
    ],
    "expected": "Kết quả lọc đúng tiêu chí; tìm tiếng Việt có dấu khớp; xóa lọc trả về danh sách đầy đủ; số lượng KPI cập nhật theo lọc nếu có.",
    "evidence": [
     {
      "name": "TC-OPD-023__s01__filter",
      "caption": "Áp bộ lọc phòng/loại BN",
      "uiState": "filter"
     },
     {
      "name": "TC-OPD-023__s02__list",
      "caption": "Kết quả lọc đúng",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#241"
    ]
   },
   {
    "id": "TC-OPD-024",
    "title": "Edge state: hai bác sĩ mở cùng lượt khám (đồng thời/khóa)",
    "category": "state",
    "priority": "P1",
    "role": "Bác sĩ khám",
    "preconditions": "Hai phiên đăng nhập (2 tab/2 user) cùng mở 1 lượt khám.",
    "steps": [
     "User A mở lượt khám và bắt đầu sửa",
     "User B mở cùng lượt khám",
     "User A hoàn tất",
     "User B cũng cố hoàn tất"
    ],
    "expected": "Tránh ghi đè mất dữ liệu: B nhận thông báo lượt đã được cập nhật/khóa (optimistic concurrency) hoặc B bị readonly; không có ghi đè âm thầm.",
    "evidence": [
     {
      "name": "TC-OPD-024__s01__error",
      "caption": "Cảnh báo xung đột khi lưu đồng thời",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#240",
     "#243"
    ]
   },
   {
    "id": "TC-OPD-025",
    "title": "Integration: chỉ định CLS từ OPD đẩy sang LIS/RIS",
    "category": "integration",
    "priority": "P1",
    "role": "Bác sĩ khám",
    "preconditions": "Hoàn tất khám có chỉ định 1 xét nghiệm + 1 chẩn đoán hình ảnh.",
    "steps": [
     "Trong khám, tạo chỉ định XN và CĐHA",
     "Hoàn tất",
     "Kiểm tra ServiceRequest xuất hiện ở phân hệ LIS (XN) và RIS (CĐHA)"
    ],
    "expected": "Chỉ định sinh ServiceRequest phân về đúng LIS/RIS theo loại dịch vụ; trạng thái chờ thực hiện hiển thị đúng; liên kết ngược về lượt khám OPD.",
    "evidence": [
     {
      "name": "TC-OPD-025__s01__form",
      "caption": "Tạo chỉ định XN + CĐHA trong khám",
      "uiState": "form"
     },
     {
      "name": "TC-OPD-025__s02__tab",
      "caption": "ServiceRequest hiện ở LIS/RIS",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#239"
    ]
   }
  ],
  "ui_state_checklist": [
   "list (hàng chờ khám, kết quả lọc, đã khám)",
   "form (form khám, sinh hiệu, đăng ký hội chẩn, mượn HSBA)",
   "detail (chi tiết lượt khám/EMR/phác đồ/HSBA)",
   "modal (cảnh báo dị ứng, thêm mẫu/phác đồ)",
   "drawer (chi tiết hội chẩn/thành viên)",
   "tab (log hoạt động, viện phí, ServiceRequest LIS/RIS)",
   "filter (bộ lọc phòng/loại BN/ngày)",
   "dropdown (chọn mẫu khám, chẩn đoán ICD)",
   "validation (lỗi field bắt buộc/range/định dạng)",
   "empty (không có BN chờ)",
   "loading (đang tải hàng chờ)",
   "error (API lỗi, chặn quyền, xung đột, IDOR)",
   "confirm (hủy mất dữ liệu, xác nhận kê thuốc cảnh báo)",
   "success (hoàn tất khám/hội chẩn)",
   "toast (cập nhật danh mục)",
   "permission (menu/nút bị ẩn theo role)"
  ],
  "gaps": [
   "Chưa rõ quy trình mở khóa/bổ sung sau khi lượt khám đã hoàn tất (workflow sửa hợp pháp) — cần test riêng khi có spec.",
   "Chưa có test cho TreatmentSheets/NursingCareSheets (tờ điều trị & phiếu chăm sóc) vì thiên về nội trú — nếu OPD dùng cần bổ sung happy/validation.",
   "Chưa có test DiagnosisInterruptions (gián đoạn chẩn đoán) — thiếu spec nghiệp vụ để viết case chính xác.",
   "Concurrency/optimistic-lock (TC-OPD-024) cần xác nhận backend có hỗ trợ rowversion không; nếu chưa có là gap an toàn dữ liệu.",
   "Phân quyền chi tiết theo khoa/phòng cho IDOR (TC-OPD-010) cần matrix #216 cụ thể để xác định kỳ vọng 403 vs lọc-mềm.",
   "Chưa kiểm thử in biểu mẫu/phiếu khám (xuất A4/PDF) nếu OPD có chức năng in.",
   "Responsive mobile/tablet cho màn khám chưa được phủ ngoài dark/light — cần bổ sung nếu dùng trên thiết bị di động.",
   "Liên thông quốc gia (cổng đơn thuốc QG/Đề án 06) chạm OPD qua kê đơn — chưa phủ vì thuộc phân hệ presc/national, cần test xuyên phân hệ."
  ]
 },
 {
  "id": "cls",
  "code": "CLS",
  "layer": "clin",
  "ic": "📋",
  "nm": "Chỉ định dịch vụ (CLS)",
  "gh": [
   "#246",
   "#247",
   "#248"
  ],
  "gap": false,
  "module_id": "cls",
  "summary": "Phân hệ \"Chỉ định dịch vụ (CLS)\" quản lý y lệnh chỉ định XN/CĐHA/TDCN/thủ thuật: ServiceRequests (phiếu chỉ định) phát sinh từ MedicalRecord, gồm nhiều ServiceRequestDetails (chi tiết từng dịch vụ), kèm ServiceRequestDetailParameters (thông số chỉ định) và LockedServices (khóa dịch vụ đã chốt, tránh sửa sau thanh toán). Mỗi chi tiết được phân về LIS/RIS/Pathology/TDCN theo loại dịch vụ. Màn chính là section \"Chỉ định CLS · Dịch vụ\" trong OPD Editor (/v2/opd/edit): tìm dịch vụ, thêm dòng, sửa số lượng, tính thành tiền, lưu phiếu; kèm cancel-chain trên ServiceRequestDetail và đối chiếu dị ứng/chống chỉ định trước chỉ định (an toàn người bệnh).",
  "screens": [
   {
    "name": "Section Chỉ định CLS · Dịch vụ (trong OPD Editor)",
    "desc": "Khu vực chỉ định CLS nằm trong màn khám/bệnh án: ô tìm dịch vụ (XN/CĐHA/thủ thuật, ≥2 ký tự), dropdown kết quả, bảng danh sách dịch vụ đã chỉ định (mã, tên, SL, đơn giá, thành tiền), tổng tiền CLS, nút xoá dòng. KPI 'Chỉ định CLS' hiển thị số phiếu + tổng tiền.",
    "route_guess": "/v2/opd/edit",
    "elements": [
     "Ô search dịch vụ (ab-search)",
     "Dropdown kết quả tìm dịch vụ",
     "Bảng dịch vụ đã chỉ định (DataTable)",
     "Input số lượng (qty)",
     "Cột Đơn giá / Thành tiền",
     "Dòng tổng CLS (tfoot)",
     "Nút xoá dòng (trash)",
     "Empty state 'Chưa có chỉ định'",
     "KPI 'Chỉ định CLS'"
    ]
   },
   {
    "name": "Drawer/Modal Chi tiết phiếu chỉ định",
    "desc": "Xem chi tiết 1 ServiceRequest: thông tin BN, bác sĩ chỉ định, ngày giờ, danh sách ServiceRequestDetails kèm trạng thái (chờ thực hiện/đang làm/đã có KQ/đã hủy), phòng đích (LIS/RIS/Pathology/TDCN), thông số chỉ định.",
    "route_guess": "/v2/opd/edit (drawer)",
    "elements": [
     "Header phiếu (số, ngày, bác sĩ)",
     "Danh sách chi tiết chỉ định",
     "Badge trạng thái từng dòng",
     "Thông số chỉ định (parameters)",
     "Nút in phiếu chỉ định"
    ]
   },
   {
    "name": "Modal/Menu Cancel-chain chỉ định",
    "desc": "Hủy theo chuỗi trên ServiceRequestDetail: hủy duyệt / hủy KQ / hủy lấy mẫu — yêu cầu nhập lý do, trả về trạng thái mới.",
    "route_guess": "/v2/opd/edit (modal LabCancelChainMenu)",
    "elements": [
     "Menu chọn loại hủy",
     "Textarea lý do hủy",
     "Nút xác nhận hủy",
     "Toast kết quả + trạng thái mới"
    ]
   },
   {
    "name": "Trạng thái dịch vụ bị khóa (LockedService)",
    "desc": "Dịch vụ đã chốt/đã thanh toán bị khóa: dòng disabled, không cho sửa SL/xoá, hiển thị badge khóa.",
    "route_guess": "/v2/opd/edit",
    "elements": [
     "Badge/biểu tượng khóa",
     "Dòng disabled (không sửa được)",
     "Tooltip lý do khóa"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-CLS-001",
    "title": "Tìm và thêm 1 dịch vụ XN vào phiếu chỉ định (happy path)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Đã đăng nhập admin/Admin@123, mở 1 bệnh án đang khám tại /v2/opd/edit, MedicalRecord chưa khóa.",
    "steps": [
     "Cuộn tới section 'Chỉ định CLS · Dịch vụ'",
     "Gõ ≥2 ký tự tên dịch vụ XN vào ô tìm (vd 'cong')",
     "Chọn 1 dịch vụ từ dropdown kết quả",
     "Kiểm tra dòng dịch vụ thêm vào bảng với SL=1",
     "Lưu bệnh án/phiếu chỉ định"
    ],
    "expected": "Dịch vụ xuất hiện trong bảng với mã, tên, đơn giá đúng catalog; SL mặc định 1; thành tiền = đơn giá × 1; tổng CLS cập nhật; KPI 'Chỉ định CLS' tăng; lưu thành công, ServiceRequest + ServiceRequestDetail được tạo.",
    "evidence": [
     {
      "name": "TC-CLS-001__s01__form",
      "caption": "Section chỉ định CLS trước khi thêm",
      "uiState": "form"
     },
     {
      "name": "TC-CLS-001__s02__dropdown",
      "caption": "Dropdown kết quả tìm dịch vụ",
      "uiState": "dropdown"
     },
     {
      "name": "TC-CLS-001__s03__success",
      "caption": "Dịch vụ đã thêm + tổng CLS cập nhật",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-CLS-002",
    "title": "Thêm nhiều dịch vụ khác loại (XN + CĐHA + TDCN) trong 1 phiếu",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Bệnh án đang khám tại /v2/opd/edit.",
    "steps": [
     "Thêm 1 dịch vụ XN",
     "Thêm 1 dịch vụ CĐHA",
     "Thêm 1 dịch vụ TDCN/thủ thuật",
     "Kiểm tra cả 3 dòng hiển thị",
     "Lưu phiếu chỉ định"
    ],
    "expected": "Cả 3 dịch vụ vào 1 ServiceRequest dưới dạng 3 ServiceRequestDetails; tổng CLS = cộng dồn 3 thành tiền; mỗi chi tiết phân về đúng đích LIS/RIS/TDCN theo loại dịch vụ.",
    "evidence": [
     {
      "name": "TC-CLS-002__s01__list",
      "caption": "Bảng 3 dịch vụ khác loại",
      "uiState": "list"
     },
     {
      "name": "TC-CLS-002__s02__success",
      "caption": "Lưu thành công + tổng cộng dồn",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-CLS-003",
    "title": "Sửa số lượng dịch vụ và kiểm tra thành tiền + tổng cập nhật",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Đã có ≥1 dịch vụ trong bảng chỉ định.",
    "steps": [
     "Sửa SL của 1 dòng từ 1 lên 3",
     "Quan sát cột thành tiền dòng đó",
     "Quan sát dòng tổng CLS",
     "Lưu"
    ],
    "expected": "Thành tiền dòng = đơn giá × 3; tổng CLS cộng lại đúng; lưu giữ đúng SL.",
    "evidence": [
     {
      "name": "TC-CLS-003__s01__form",
      "caption": "Sửa số lượng dòng dịch vụ",
      "uiState": "form"
     },
     {
      "name": "TC-CLS-003__s02__success",
      "caption": "Thành tiền + tổng cập nhật",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-CLS-004",
    "title": "Xoá 1 dòng dịch vụ khỏi phiếu chỉ định",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Bảng có ≥2 dịch vụ.",
    "steps": [
     "Nhấn nút xoá (trash) trên 1 dòng",
     "Xác nhận dòng biến mất",
     "Kiểm tra tổng CLS giảm đúng",
     "Lưu"
    ],
    "expected": "Dòng bị xoá khỏi bảng; tổng CLS trừ đúng thành tiền dòng đó; nếu xoá hết → hiển thị empty state 'Chưa có chỉ định'.",
    "evidence": [
     {
      "name": "TC-CLS-004__s01__list",
      "caption": "Bảng trước khi xoá",
      "uiState": "list"
     },
     {
      "name": "TC-CLS-004__s02__confirm",
      "caption": "Sau khi xoá dòng",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-CLS-005",
    "title": "Tìm dịch vụ với <2 ký tự không kích hoạt search",
    "category": "negative",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "Mở section chỉ định CLS.",
    "steps": [
     "Gõ 1 ký tự vào ô tìm dịch vụ",
     "Quan sát dropdown"
    ],
    "expected": "Không gọi API, không hiển thị dropdown kết quả (placeholder ghi rõ ≥2 ký tự); không lỗi console.",
    "evidence": [
     {
      "name": "TC-CLS-005__s01__validation",
      "caption": "Gõ 1 ký tự không có dropdown",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#247"
    ]
   },
   {
    "id": "TC-CLS-006",
    "title": "Tìm dịch vụ không tồn tại → empty result",
    "category": "negative",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "Mở section chỉ định CLS.",
    "steps": [
     "Gõ chuỗi vô nghĩa 'zzzxxxqqq'",
     "Quan sát dropdown"
    ],
    "expected": "Dropdown rỗng hoặc thông báo không có kết quả; không thêm dòng; không crash.",
    "evidence": [
     {
      "name": "TC-CLS-006__s01__empty",
      "caption": "Không có kết quả tìm kiếm",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#247"
    ]
   },
   {
    "id": "TC-CLS-007",
    "title": "Thêm trùng cùng 1 dịch vụ 2 lần",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Mở section chỉ định CLS.",
    "steps": [
     "Thêm dịch vụ A",
     "Tìm và chọn lại đúng dịch vụ A",
     "Quan sát bảng"
    ],
    "expected": "Hệ thống xử lý nhất quán: hoặc gộp tăng SL của dòng A, hoặc chặn trùng kèm thông báo — KHÔNG tạo 2 dòng trùng âm thầm gây tính tiền sai.",
    "evidence": [
     {
      "name": "TC-CLS-007__s01__list",
      "caption": "Hành vi khi thêm trùng dịch vụ",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#247"
    ]
   },
   {
    "id": "TC-CLS-008",
    "title": "Số lượng = 0, âm, hoặc rất lớn (boundary)",
    "category": "edge",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Bảng có ≥1 dịch vụ.",
    "steps": [
     "Đặt SL = 0",
     "Đặt SL = -1",
     "Đặt SL = 999999",
     "Thử lưu sau mỗi giá trị"
    ],
    "expected": "SL=0 và SL âm bị chặn (min=1) kèm thông báo; SL rất lớn cảnh báo hoặc giới hạn hợp lý; thành tiền không tràn/NaN; không lưu giá trị không hợp lệ.",
    "evidence": [
     {
      "name": "TC-CLS-008__s01__validation",
      "caption": "SL=0/âm bị chặn",
      "uiState": "validation"
     },
     {
      "name": "TC-CLS-008__s02__edge",
      "caption": "SL rất lớn",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#247",
     "#248"
    ]
   },
   {
    "id": "TC-CLS-009",
    "title": "Field bắt buộc khi lưu phiếu chỉ định (validation)",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Bệnh án mở, có/không có dịch vụ.",
    "steps": [
     "Thử lưu phiếu khi chưa thêm dịch vụ nào",
     "Quan sát thông báo",
     "Thêm dịch vụ thiếu chẩn đoán (nếu ICD bắt buộc) rồi lưu"
    ],
    "expected": "Lưu phiếu rỗng bị chặn/thông báo 'Chưa có chỉ định'; nếu nghiệp vụ yêu cầu chẩn đoán trước chỉ định → cảnh báo thiếu ICD; thông báo lỗi hiển thị đúng vị trí, tiếng Việt có dấu.",
    "evidence": [
     {
      "name": "TC-CLS-009__s01__validation",
      "caption": "Chặn lưu phiếu rỗng",
      "uiState": "validation"
     },
     {
      "name": "TC-CLS-009__s02__empty",
      "caption": "Empty state chưa có chỉ định",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#247"
    ]
   },
   {
    "id": "TC-CLS-010",
    "title": "Đối chiếu dị ứng/chống chỉ định trước khi chỉ định (an toàn người bệnh)",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "BN có ghi nhận dị ứng/chống chỉ định liên quan dịch vụ/chất cản quang.",
    "steps": [
     "Mở bệnh án BN có dị ứng đã khai báo",
     "Thêm dịch vụ CĐHA dùng thuốc cản quang (hoặc dịch vụ chống chỉ định)",
     "Quan sát cảnh báo"
    ],
    "expected": "Hệ thống cảnh báo dị ứng/chống chỉ định trước khi chốt chỉ định; yêu cầu xác nhận/ghi lý do; KHÔNG cho chỉ định âm thầm bỏ qua cảnh báo.",
    "evidence": [
     {
      "name": "TC-CLS-010__s01__modal",
      "caption": "Cảnh báo dị ứng/chống chỉ định",
      "uiState": "modal"
     }
    ],
    "notes": "Patient-safety: NOTES[opd] yêu cầu kiểm dị ứng/chống chỉ định. Nếu CLS chưa có cảnh báo này → tạo task bug fix liên kết.",
    "refIssues": [
     "#248",
     "#216"
    ]
   },
   {
    "id": "TC-CLS-011",
    "title": "Vai trò không phải Bác sĩ/KTV CLS bị chặn chỉ định",
    "category": "permission",
    "priority": "P0",
    "role": "Lễ tân (không quyền chỉ định)",
    "preconditions": "Đăng nhập user vai trò không nằm trong [Bác sĩ, KTV CLS] (tham chiếu matrix #216).",
    "steps": [
     "Mở /v2/opd/edit với user thiếu quyền",
     "Thử thao tác thêm dịch vụ chỉ định",
     "Gọi trực tiếp API tạo ServiceRequest (nếu UI ẩn)"
    ],
    "expected": "Menu/section chỉ định bị ẩn hoặc disabled; API trả 403; không tạo được ServiceRequest từ vai trò không đủ quyền.",
    "evidence": [
     {
      "name": "TC-CLS-011__s01__permission",
      "caption": "Section chỉ định bị chặn theo vai trò",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-CLS-012",
    "title": "Khóa dịch vụ đã chốt (LockedService) chặn sửa/xoá",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Có ServiceRequestDetail đã bị khóa (LockedServices) do đã thanh toán/đã thực hiện.",
    "steps": [
     "Mở bệnh án có dịch vụ đã khóa",
     "Thử sửa SL của dòng đã khóa",
     "Thử xoá dòng đã khóa"
    ],
    "expected": "Dòng đã khóa hiển thị badge khóa, input SL disabled, nút xoá disabled; thao tác bị chặn UI và API; thông báo lý do khóa.",
    "evidence": [
     {
      "name": "TC-CLS-012__s01__state",
      "caption": "Dòng dịch vụ bị khóa disabled",
      "uiState": "state"
     },
     {
      "name": "TC-CLS-012__s02__error",
      "caption": "Chặn sửa dịch vụ đã khóa",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#248"
    ]
   },
   {
    "id": "TC-CLS-013",
    "title": "Chuyển trạng thái chi tiết chỉ định hợp lệ (Chờ→Đang thực hiện→Có KQ)",
    "category": "state",
    "priority": "P1",
    "role": "KTV CLS",
    "preconditions": "ServiceRequestDetail ở trạng thái chờ thực hiện.",
    "steps": [
     "Mở chi tiết phiếu chỉ định",
     "Thực hiện chuyển trạng thái theo luồng hợp lệ",
     "Quan sát badge trạng thái từng bước"
    ],
    "expected": "Trạng thái chuyển đúng thứ tự; badge cập nhật; audit log ghi nhận từng lần chuyển.",
    "evidence": [
     {
      "name": "TC-CLS-013__s01__detail",
      "caption": "Trạng thái chi tiết chỉ định theo luồng",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#248"
    ]
   },
   {
    "id": "TC-CLS-014",
    "title": "Cancel-chain: hủy duyệt/hủy KQ/hủy lấy mẫu yêu cầu lý do",
    "category": "state",
    "priority": "P0",
    "role": "KTV CLS",
    "preconditions": "ServiceRequestDetail đã có KQ hoặc đã duyệt.",
    "steps": [
     "Mở menu cancel-chain trên 1 dòng chỉ định",
     "Chọn 'hủy KQ' nhưng để trống lý do → xác nhận",
     "Nhập lý do hợp lệ → xác nhận"
    ],
    "expected": "Để trống lý do bị chặn; nhập lý do → trả về newStatus/newStatusLabel đúng; toast hiển thị; trạng thái dòng lùi đúng bước; audit log ghi lý do + người thao tác.",
    "evidence": [
     {
      "name": "TC-CLS-014__s01__modal",
      "caption": "Modal cancel-chain nhập lý do",
      "uiState": "modal"
     },
     {
      "name": "TC-CLS-014__s02__validation",
      "caption": "Chặn hủy khi thiếu lý do",
      "uiState": "validation"
     },
     {
      "name": "TC-CLS-014__s03__toast",
      "caption": "Toast kết quả + trạng thái mới",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#248"
    ]
   },
   {
    "id": "TC-CLS-015",
    "title": "Chặn chuyển trạng thái không hợp lệ (vd hủy KQ khi chưa có KQ)",
    "category": "state",
    "priority": "P1",
    "role": "KTV CLS",
    "preconditions": "ServiceRequestDetail ở trạng thái chờ, chưa có KQ.",
    "steps": [
     "Gọi cancel-result trên dòng chưa có KQ (qua UI hoặc API)",
     "Quan sát phản hồi"
    ],
    "expected": "Hệ thống từ chối chuyển trạng thái không hợp lệ; thông báo lỗi rõ ràng; trạng thái không đổi.",
    "evidence": [
     {
      "name": "TC-CLS-015__s01__error",
      "caption": "Chặn chuyển trạng thái không hợp lệ",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#248"
    ]
   },
   {
    "id": "TC-CLS-016",
    "title": "Data-consistency: chỉ định CLS → chi phí viện phí → tính BHYT",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ + Thu ngân",
    "preconditions": "BN BHYT, mở bệnh án và thêm dịch vụ CLS có giá.",
    "steps": [
     "Thêm 1 dịch vụ CLS giá X, SL 2",
     "Lưu phiếu chỉ định",
     "Mở màn viện phí của BN",
     "Đối chiếu dòng dịch vụ + thành tiền",
     "Kiểm tra phần BHYT chi trả/đồng chi trả"
    ],
    "expected": "Dịch vụ CLS xuất hiện ở viện phí với thành tiền = X×2; phần BHYT/đồng chi trả tính đúng theo mức hưởng; số liệu nhất quán giữa CLS và billing.",
    "evidence": [
     {
      "name": "TC-CLS-016__s01__detail",
      "caption": "Chỉ định CLS tại OPD",
      "uiState": "detail"
     },
     {
      "name": "TC-CLS-016__s02__tab",
      "caption": "Dòng dịch vụ tại viện phí",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#248",
     "#216"
    ]
   },
   {
    "id": "TC-CLS-017",
    "title": "Data-consistency: chỉ định XN → xuất hiện worklist LIS đúng phòng",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ + KTV LIS",
    "preconditions": "Thêm 1 dịch vụ XN và lưu.",
    "steps": [
     "Thêm dịch vụ XN, lưu phiếu",
     "Mở module LIS / worklist",
     "Tìm phiếu BN vừa chỉ định"
    ],
    "expected": "ServiceRequestDetail XN tự phân về LIS, xuất hiện trong worklist đúng phòng; thông tin BN/dịch vụ khớp.",
    "evidence": [
     {
      "name": "TC-CLS-017__s01__list",
      "caption": "Phiếu XN xuất hiện ở worklist LIS",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#248"
    ]
   },
   {
    "id": "TC-CLS-018",
    "title": "Data-consistency: chỉ định CĐHA → xuất hiện worklist RIS",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Bác sĩ + KTV CĐHA",
    "preconditions": "Thêm 1 dịch vụ CĐHA và lưu.",
    "steps": [
     "Thêm dịch vụ CĐHA, lưu",
     "Mở module RIS / modality worklist",
     "Tìm chỉ định vừa tạo"
    ],
    "expected": "Chi tiết CĐHA phân về RIS, xuất hiện trong worklist; sẵn sàng gửi DICOM modality.",
    "evidence": [
     {
      "name": "TC-CLS-018__s01__list",
      "caption": "Chỉ định CĐHA ở worklist RIS",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#248"
    ]
   },
   {
    "id": "TC-CLS-019",
    "title": "Audit log ghi đúng mỗi lần tạo/sửa/xoá/hủy chỉ định",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Đã thực hiện tạo, sửa SL, xoá, cancel-chain một dịch vụ.",
    "steps": [
     "Thực hiện chuỗi tạo→sửa→hủy 1 dịch vụ",
     "Mở audit log/lịch sử",
     "Đối chiếu các bản ghi"
    ],
    "expected": "Mỗi mutation (tạo/sửa/xoá/hủy) ghi audit với người thao tác, thời gian, giá trị cũ→mới, lý do (với hủy); không thiếu bản ghi.",
    "evidence": [
     {
      "name": "TC-CLS-019__s01__tab",
      "caption": "Audit log các thao tác chỉ định",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#248"
    ]
   },
   {
    "id": "TC-CLS-020",
    "title": "Empty / loading / error state của section chỉ định CLS",
    "category": "ui",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Mở /v2/opd/edit.",
    "steps": [
     "Mở bệnh án chưa có chỉ định → quan sát empty state",
     "Tìm dịch vụ → quan sát loading khi gọi API",
     "Ngắt mạng (throttle/offline) rồi tìm → quan sát error"
    ],
    "expected": "Empty: hiển thị 'Chưa có chỉ định'; loading: có chỉ báo khi tìm; error: thông báo lỗi thân thiện, không crash, không vòng spinner vô hạn.",
    "evidence": [
     {
      "name": "TC-CLS-020__s01__empty",
      "caption": "Empty state chưa có chỉ định",
      "uiState": "empty"
     },
     {
      "name": "TC-CLS-020__s02__loading",
      "caption": "Loading khi tìm dịch vụ",
      "uiState": "loading"
     },
     {
      "name": "TC-CLS-020__s03__error",
      "caption": "Error khi mất kết nối",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#247"
    ]
   },
   {
    "id": "TC-CLS-021",
    "title": "Dark/light parity + format số/tiền/ngày của section CLS",
    "category": "ui",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "Mở section chỉ định CLS với vài dịch vụ.",
    "steps": [
     "Bật light mode → quan sát bảng, dropdown, badge",
     "Toggle dark mode (topbar v2) → quan sát lại",
     "Kiểm tra format đơn giá/thành tiền/tổng (phân tách hàng nghìn, VND)"
    ],
    "expected": "Hai theme đủ tương phản, không chữ trắng nền trắng; tiền hiển thị fmtVNDg đúng định dạng VN; ngày giờ đúng locale; tiếng Việt có dấu hiển thị đủ.",
    "evidence": [
     {
      "name": "TC-CLS-021__s01__ui",
      "caption": "Section CLS light mode",
      "uiState": "list"
     },
     {
      "name": "TC-CLS-021__s02__ui",
      "caption": "Section CLS dark mode",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#247"
    ]
   },
   {
    "id": "TC-CLS-022",
    "title": "Ký tự đặc biệt / chuỗi rất dài / dấu tiếng Việt trong ô tìm",
    "category": "edge",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "Mở section chỉ định CLS.",
    "steps": [
     "Gõ chuỗi 300 ký tự",
     "Gõ ký tự đặc biệt '<script> & % \"'",
     "Gõ tên dịch vụ có dấu tiếng Việt đầy đủ"
    ],
    "expected": "Không crash, không lỗi encoding; tìm theo dấu tiếng Việt cho kết quả đúng; ký tự đặc biệt được escape (không XSS, không lỗi query).",
    "evidence": [
     {
      "name": "TC-CLS-022__s01__edge",
      "caption": "Tìm với chuỗi dài/ký tự đặc biệt",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#247"
    ]
   },
   {
    "id": "TC-CLS-023",
    "title": "Hủy giữa chừng: thêm dịch vụ rồi rời màn không lưu",
    "category": "negative",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Đã thêm vài dịch vụ chưa lưu.",
    "steps": [
     "Thêm 2 dịch vụ",
     "Rời màn (đóng tab/chuyển route) không lưu",
     "Quay lại bệnh án"
    ],
    "expected": "Có cảnh báo mất dữ liệu chưa lưu (nếu nghiệp vụ yêu cầu) hoặc dữ liệu không persist; không tạo ServiceRequest rác; trạng thái nhất quán khi quay lại.",
    "evidence": [
     {
      "name": "TC-CLS-023__s01__confirm",
      "caption": "Cảnh báo/hành vi khi rời màn chưa lưu",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#247"
    ]
   },
   {
    "id": "TC-CLS-024",
    "title": "Security IDOR: tạo chỉ định cho MedicalRecord của BN khác",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Có 2 BN; lấy medicalRecordId của BN B.",
    "steps": [
     "Mở bệnh án BN A",
     "Gọi API tạo ServiceRequest với medicalRecordId của BN B (sửa payload)",
     "Quan sát phản hồi"
    ],
    "expected": "Backend kiểm quyền/sở hữu; chặn tạo chỉ định cho hồ sơ không thuộc phiên làm việc/không có quyền; trả 403/404; không tạo dữ liệu chéo BN.",
    "evidence": [
     {
      "name": "TC-CLS-024__s01__error",
      "caption": "Chặn IDOR tạo chỉ định BN khác",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#248",
     "#216"
    ]
   },
   {
    "id": "TC-CLS-025",
    "title": "Security XSS: lý do hủy / ghi chú chỉ định chứa script",
    "category": "security",
    "priority": "P1",
    "role": "KTV CLS",
    "preconditions": "Có dòng chỉ định cho phép hủy/ghi chú.",
    "steps": [
     "Mở cancel-chain",
     "Nhập lý do '<img src=x onerror=alert(1)>'",
     "Lưu và xem lại lý do trong lịch sử/audit"
    ],
    "expected": "Chuỗi được escape khi render, không thực thi script; lưu nguyên văn an toàn; không XSS ở audit/log/in phiếu.",
    "evidence": [
     {
      "name": "TC-CLS-025__s01__modal",
      "caption": "Nhập lý do chứa payload XSS",
      "uiState": "modal"
     },
     {
      "name": "TC-CLS-025__s02__detail",
      "caption": "Lý do render an toàn (escaped)",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#248"
    ]
   },
   {
    "id": "TC-CLS-026",
    "title": "Over-posting: ép field server-side (Id/IsDeleted/giá) qua payload",
    "category": "security",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Bắt được payload tạo ServiceRequestDetail.",
    "steps": [
     "Sửa payload thêm field unitPrice tự đặt thấp hơn catalog",
     "Sửa payload set IsDeleted=false/Id tùy ý",
     "Gửi request"
    ],
    "expected": "Backend bỏ qua/override các field nhạy cảm; đơn giá lấy từ catalog server, không tin client; Id do server sinh; không over-post (theo fix #184).",
    "evidence": [
     {
      "name": "TC-CLS-026__s01__error",
      "caption": "Chặn over-posting giá/field server",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#248",
     "#184"
    ]
   },
   {
    "id": "TC-CLS-027",
    "title": "In phiếu chỉ định CLS đúng nội dung",
    "category": "happy",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "Đã lưu phiếu chỉ định có ≥1 dịch vụ.",
    "steps": [
     "Mở chi tiết phiếu chỉ định",
     "Nhấn in phiếu",
     "Đối chiếu nội dung in (BN, bác sĩ, danh sách DV, ngày giờ)"
    ],
    "expected": "Phiếu in đầy đủ thông tin BN, danh sách dịch vụ, bác sĩ chỉ định, ngày giờ; tiếng Việt có dấu; layout A4 không vỡ.",
    "evidence": [
     {
      "name": "TC-CLS-027__s01__detail",
      "caption": "Phiếu chỉ định bản in",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-CLS-028",
    "title": "Thông số chỉ định (ServiceRequestDetailParameters) nhập và lưu đúng",
    "category": "happy",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "Dịch vụ có yêu cầu thông số (vd vị trí chụp, ghi chú lâm sàng).",
    "steps": [
     "Thêm dịch vụ CĐHA cần thông số",
     "Nhập thông số bắt buộc (vị trí/chỉ định lâm sàng)",
     "Lưu và mở lại"
    ],
    "expected": "Thông số lưu vào ServiceRequestDetailParameters; hiển thị lại đúng khi mở lại; thông số bắt buộc thiếu bị chặn lưu.",
    "evidence": [
     {
      "name": "TC-CLS-028__s01__form",
      "caption": "Nhập thông số chỉ định",
      "uiState": "form"
     },
     {
      "name": "TC-CLS-028__s02__validation",
      "caption": "Chặn thiếu thông số bắt buộc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#246",
     "#247"
    ]
   }
  ],
  "ui_state_checklist": [
   "list (bảng dịch vụ đã chỉ định)",
   "form (nhập/sửa SL, thông số)",
   "dropdown (kết quả tìm dịch vụ)",
   "empty (chưa có chỉ định / không kết quả tìm)",
   "loading (đang tìm dịch vụ)",
   "error (mất kết nối / chặn thao tác)",
   "validation (SL bất hợp lệ, thiếu field, thiếu lý do)",
   "modal (cảnh báo dị ứng, cancel-chain, XSS payload)",
   "detail (chi tiết phiếu / bản in / render escaped)",
   "tab (viện phí, audit log)",
   "toast/success (lưu/hủy thành công)",
   "confirm (xoá dòng, rời màn chưa lưu)",
   "permission (chặn vai trò không đủ quyền)",
   "state (dòng khóa LockedService, chuyển trạng thái)",
   "filter (tìm ký tự đặc biệt/dài/dấu tiếng Việt)"
  ],
  "gaps": [
   "Chưa rõ CLS có cảnh báo dị ứng/chống chỉ định tại thời điểm chỉ định hay chỉ ở bước kê đơn (NOTES[opd]) — TC-CLS-010 cần verify, nếu thiếu phải tạo task bug an toàn người bệnh.",
   "Hành vi thêm trùng dịch vụ (gộp SL hay chặn) chưa được đặc tả rõ — TC-CLS-007 cần xác nhận chuẩn nghiệp vụ.",
   "Chưa rõ có cảnh báo 'dữ liệu chưa lưu' khi rời màn (TC-CLS-023) — cần verify để tránh mất chỉ định.",
   "Quy tắc khóa LockedService (khi nào tự khóa: sau thanh toán hay sau thực hiện) cần đối chiếu thực tế với billing IsClosed.",
   "Chưa có test cho gói khám sức khỏe (checkup→cls) và luồng cấp cứu nơi chỉ định CLS phát sinh ngoài OPD editor chuẩn — có thể cần entry point khác.",
   "Phân quyền chi tiết theo loại dịch vụ (bác sĩ khoa A có được chỉ định dịch vụ khoa B?) chưa rõ — bổ sung khi có matrix #216 chi tiết.",
   "Ràng buộc ICD bắt buộc trước khi chỉ định CLS chưa xác nhận (TC-CLS-009) — ảnh hưởng giám định BHYT."
  ]
 },
 {
  "id": "lis",
  "code": "LIS",
  "layer": "clin",
  "ic": "🧪",
  "nm": "Xét nghiệm (LIS)",
  "gh": [
   "#246",
   "#249",
   "#250"
  ],
  "gap": false,
  "module_id": "lis",
  "summary": "Phân hệ Xét nghiệm (LIS) phủ toàn bộ vòng đời xét nghiệm: nhận chỉ định từ ServiceRequest (phân hệ CLS) → hẹn/lấy/nhận mẫu (SampleAppointments, sổ XN LabBooks) → đưa vào worklist máy XN (LabWorklists) → máy phân tích kết nối HL7/LabConnect (LabAnalyzers/LisAnalyzers, LabConnectionLogs) trả kết quả thô (LabRawResults) → đối chiếu khoảng tham chiếu (LabReferenceRanges) → cảnh báo giá trị nguy kịch (LabCriticalValueAlerts/Configs) → nội kiểm QC bắt buộc (LabQCResults) → trả/ký kết quả (LabConclusionTemplates) → liên thông CLS/viện phí. Có nhánh vi sinh: nuôi cấy (MicrobiologyCultures) → định danh vi khuẩn (MicrobiologyOrganismFindings/LabOrganisms) → kháng sinh đồ (AntibioticSensitivityResults/LabAntibiotics), quản lý môi trường nuôi cấy (CultureStocks). Màn chính (v2): Laboratory (/v2/lab), Lab QC (/v2/lab-qc), Microbiology (/v2/microbiology), Sample Receive/Tracking/Storage, LIS Config & LIS Catalog Admin, IVF Lab. Trọng tâm an toàn người bệnh: cảnh báo giá trị nguy kịch tức thời, QC bắt buộc trước khi trả KQ, audit mọi mutation.",
  "screens": [
   {
    "name": "Danh sách xét nghiệm (Laboratory)",
    "desc": "Màn chính worklist XN: KPI tổng quan, tab trạng thái mẫu/KQ, bảng phiếu XN, drawer chi tiết nhập KQ, modal trả/ký KQ. Lấy dữ liệu từ ServiceRequest→LabWorklists→LabRawResults.",
    "route_guess": "/v2/lab",
    "elements": [
     "KpiStrip (chờ lấy mẫu / đang chạy máy / chờ duyệt / nguy kịch)",
     "StatusTabs trạng thái (Chờ lấy mẫu/Đã lấy/Đang chạy/Có KQ/Đã trả/Nguy kịch)",
     "SearchBox + Filter (khoa, ngày, máy XN, loại mẫu)",
     "DataTable phiếu XN",
     "DrawerShell chi tiết + nhập KQ thủ công",
     "ModalShell xác nhận trả/ký KQ",
     "StatusBadge cờ nguy kịch (H/L/HH/LL)"
    ]
   },
   {
    "name": "Nhận mẫu (Sample Receive)",
    "desc": "Tiếp nhận mẫu từ phòng lấy mẫu/khoa: quét barcode ống, đối chiếu loại ống (LabTubeTypes)/loại mẫu (LabSampleTypes), ghi giờ nhận, từ chối mẫu không đạt.",
    "route_guess": "/v2/sample-receive",
    "elements": [
     "SearchBox quét barcode/mã mẫu",
     "Form nhận mẫu",
     "Dropdown loại mẫu/loại ống",
     "Nút Nhận / Từ chối mẫu (lý do)",
     "DataTable mẫu chờ nhận"
    ]
   },
   {
    "name": "Theo dõi mẫu (Sample Tracking)",
    "desc": "Truy vết hành trình mẫu theo thời gian: lấy→nhận→chạy máy→có KQ→lưu/hủy, hiển thị timeline trạng thái.",
    "route_guess": "/v2/sample-tracking",
    "elements": [
     "Filter ngày/khoa/trạng thái",
     "DataTable mẫu",
     "Timeline/tab hành trình mẫu",
     "StatusBadge trạng thái mẫu"
    ]
   },
   {
    "name": "Lưu trữ mẫu (Sample Storage)",
    "desc": "Quản lý vị trí lưu mẫu (tủ/khay/ô), thời hạn lưu, hủy mẫu hết hạn.",
    "route_guess": "/v2/sample-storage",
    "elements": [
     "DataTable mẫu lưu",
     "Form gán vị trí lưu",
     "Filter vị trí/hạn lưu",
     "Nút Hủy mẫu hết hạn",
     "Empty state khi chưa có mẫu"
    ]
   },
   {
    "name": "Nội kiểm chất lượng (Lab QC)",
    "desc": "Quản lý KQ nội kiểm QC (LabQCResults) theo máy/mức QC, biểu đồ Levey-Jennings, chặn trả KQ khi QC fail.",
    "route_guess": "/v2/lab-qc",
    "elements": [
     "KpiStrip QC pass/fail",
     "Filter máy XN/mức QC/ngày",
     "DataTable KQ QC",
     "Biểu đồ Levey-Jennings",
     "Form nhập KQ QC",
     "StatusBadge Pass/Warning/Fail (quy tắc Westgard)"
    ]
   },
   {
    "name": "Vi sinh (Microbiology)",
    "desc": "Nhánh nuôi cấy vi sinh: cấy mẫu (MicrobiologyCultures)→định danh vi khuẩn (MicrobiologyOrganismFindings)→kháng sinh đồ (AntibioticSensitivityResults), quản lý môi trường nuôi cấy.",
    "route_guess": "/v2/microbiology",
    "elements": [
     "StatusTabs (Đang cấy/Có vi khuẩn/Âm tính/Đã trả)",
     "DataTable ca nuôi cấy",
     "Drawer định danh vi khuẩn",
     "Bảng kháng sinh đồ S/I/R",
     "Dropdown vi khuẩn (LabOrganisms) + kháng sinh (LabAntibiotics)"
    ]
   },
   {
    "name": "Cấu hình LIS (LIS Config)",
    "desc": "Cấu hình kết nối máy XN/LIS (LisAnalyzers/LabAnalyzers), mapping máy-xét nghiệm (LisAnalyzerMappings), log kết nối/đồng bộ LabConnect.",
    "route_guess": "/v2/lis-config",
    "elements": [
     "DataTable máy XN",
     "Form cấu hình kết nối (IP/cổng/protocol HL7)",
     "Bảng mapping máy-XN",
     "Log kết nối (LabConnectionLogs)",
     "Nút Test kết nối"
    ]
   },
   {
    "name": "Danh mục LIS (LIS Catalog Admin)",
    "desc": "Quản trị danh mục XN: nhóm XN (LabTestGroups), khoảng tham chiếu (LabReferenceRanges), đơn vị đo, cấu hình giá trị nguy kịch (LabCriticalValueConfigs), mẫu kết luận, hóa chất.",
    "route_guess": "/v2/lis-catalog-admin",
    "elements": [
     "TopTabs danh mục (Nhóm XN/Khoảng TC/Đơn vị/Nguy kịch/Mẫu KL/Hóa chất)",
     "DataTable từng danh mục",
     "Form thêm/sửa danh mục",
     "Validation range min<max",
     "Modal xác nhận xóa"
    ]
   },
   {
    "name": "Lab IVF (IvfLab)",
    "desc": "Xét nghiệm chuyên biệt hỗ trợ sinh sản (SpecialTestRules).",
    "route_guess": "/v2/ivf-lab",
    "elements": [
     "DataTable XN IVF",
     "Form nhập KQ chuyên biệt",
     "Empty state"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-LIS-001",
    "title": "Lấy mẫu → nhận mẫu → chạy máy → trả KQ thường (luồng chính)",
    "category": "happy",
    "priority": "P0",
    "role": "KTV xét nghiệm",
    "preconditions": "Có 1 phiếu XN (ServiceRequest từ CLS) ở trạng thái 'Chờ lấy mẫu'; máy XN đang online; đã có QC pass trong ngày. Đăng nhập admin/Admin@123.",
    "steps": [
     "Mở /v2/lab, chọn tab 'Chờ lấy mẫu'",
     "Mở phiếu XN của bệnh nhân, bấm 'Lấy mẫu' (gán barcode ống)",
     "Sang /v2/sample-receive, quét barcode nhận mẫu",
     "Quay lại /v2/lab tab 'Đang chạy', xác nhận phiếu đã vào worklist máy",
     "Nhập/nhận KQ thô (LabRawResult), bấm 'Trả KQ' và ký"
    ],
    "expected": "Phiếu chuyển tuần tự trạng thái Chờ lấy mẫu→Đã lấy→Đang chạy→Có KQ→Đã trả; KQ hiển thị kèm khoảng tham chiếu; audit log ghi đủ các bước với user thật.",
    "evidence": [
     {
      "name": "TC-LIS-001__s01__list",
      "caption": "Danh sách phiếu tab Chờ lấy mẫu",
      "uiState": "list"
     },
     {
      "name": "TC-LIS-001__s02__drawer",
      "caption": "Drawer chi tiết phiếu + lấy mẫu",
      "uiState": "drawer"
     },
     {
      "name": "TC-LIS-001__s03__form",
      "caption": "Màn nhận mẫu quét barcode",
      "uiState": "form"
     },
     {
      "name": "TC-LIS-001__s04__success",
      "caption": "Trả KQ thành công + toast",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#246",
     "#249"
    ]
   },
   {
    "id": "TC-LIS-002",
    "title": "KQ vượt ngưỡng nguy kịch → cảnh báo tức thời (an toàn người bệnh)",
    "category": "happy",
    "priority": "P0",
    "role": "KTV xét nghiệm",
    "preconditions": "Có cấu hình LabCriticalValueConfig cho 1 chỉ số (vd Kali). Phiếu XN đang chờ KQ.",
    "steps": [
     "Mở /v2/lab phiếu đang chạy",
     "Nhập KQ chỉ số vượt ngưỡng nguy kịch (vd Kali 7.5 mmol/L)",
     "Lưu KQ"
    ],
    "expected": "Hệ thống sinh LabCriticalValueAlert ngay, hiển thị cảnh báo nổi bật (màu đỏ/badge nguy kịch), yêu cầu KTV xác nhận đã báo bác sĩ; phiếu vào tab 'Nguy kịch'; audit ghi cảnh báo.",
    "evidence": [
     {
      "name": "TC-LIS-002__s01__form",
      "caption": "Nhập KQ vượt ngưỡng",
      "uiState": "form"
     },
     {
      "name": "TC-LIS-002__s02__modal",
      "caption": "Modal cảnh báo giá trị nguy kịch",
      "uiState": "modal"
     },
     {
      "name": "TC-LIS-002__s03__list",
      "caption": "Phiếu xuất hiện ở tab Nguy kịch",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246",
     "#250"
    ]
   },
   {
    "id": "TC-LIS-003",
    "title": "Chặn trả KQ khi QC trong ngày chưa pass",
    "category": "state",
    "priority": "P0",
    "role": "KTV xét nghiệm",
    "preconditions": "Máy XN chưa có KQ QC pass cho ngày hiện tại (hoặc QC fail).",
    "steps": [
     "Mở /v2/lab phiếu có KQ máy",
     "Bấm 'Trả KQ'"
    ],
    "expected": "Hệ thống chặn trả KQ, thông báo 'QC chưa đạt / chưa thực hiện nội kiểm', không cho chuyển trạng thái Đã trả.",
    "evidence": [
     {
      "name": "TC-LIS-003__s01__error",
      "caption": "Thông báo chặn trả KQ do QC chưa đạt",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-004",
    "title": "Nhập KQ QC + đánh giá quy tắc Westgard (luồng chính)",
    "category": "happy",
    "priority": "P1",
    "role": "KTV xét nghiệm",
    "preconditions": "Đã cấu hình mức QC (Level 1/2) cho máy. Đăng nhập.",
    "steps": [
     "Mở /v2/lab-qc, chọn máy XN + mức QC",
     "Nhập giá trị QC nằm trong ±2SD",
     "Lưu và xem biểu đồ Levey-Jennings"
    ],
    "expected": "KQ QC lưu, badge Pass, điểm hiển thị đúng trên biểu đồ Levey-Jennings, ngày/máy/mức đúng.",
    "evidence": [
     {
      "name": "TC-LIS-004__s01__form",
      "caption": "Form nhập KQ QC",
      "uiState": "form"
     },
     {
      "name": "TC-LIS-004__s02__detail",
      "caption": "Biểu đồ Levey-Jennings điểm Pass",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-005",
    "title": "QC vi phạm quy tắc (1-3s / 2-2s) → cảnh báo Fail",
    "category": "edge",
    "priority": "P1",
    "role": "KTV xét nghiệm",
    "preconditions": "Máy có lịch sử QC trước đó.",
    "steps": [
     "Mở /v2/lab-qc",
     "Nhập giá trị QC vượt +3SD (vi phạm 1-3s)",
     "Lưu"
    ],
    "expected": "Hệ thống đánh dấu Fail/Warning theo Westgard, hiển thị quy tắc vi phạm, cảnh báo không được trả KQ bệnh nhân từ run này.",
    "evidence": [
     {
      "name": "TC-LIS-005__s01__validation",
      "caption": "Cảnh báo vi phạm quy tắc Westgard",
      "uiState": "validation"
     },
     {
      "name": "TC-LIS-005__s02__detail",
      "caption": "Điểm Fail vượt 3SD trên biểu đồ",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-006",
    "title": "Từ chối mẫu không đạt khi nhận mẫu (negative)",
    "category": "negative",
    "priority": "P1",
    "role": "KTV nhận mẫu",
    "preconditions": "Có mẫu chờ nhận tại /v2/sample-receive.",
    "steps": [
     "Mở /v2/sample-receive, chọn mẫu",
     "Bấm 'Từ chối mẫu'",
     "Chọn lý do (vỡ hồng cầu/sai ống/thiếu thể tích) và xác nhận"
    ],
    "expected": "Mẫu chuyển trạng thái Từ chối, ghi lý do; phiếu XN không vào worklist; thông báo gửi lại phòng lấy mẫu; audit ghi.",
    "evidence": [
     {
      "name": "TC-LIS-006__s01__form",
      "caption": "Form từ chối mẫu",
      "uiState": "form"
     },
     {
      "name": "TC-LIS-006__s02__confirm",
      "caption": "Xác nhận từ chối + lý do",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-007",
    "title": "Nhận mẫu sai loại ống so với loại XN (negative)",
    "category": "negative",
    "priority": "P1",
    "role": "KTV nhận mẫu",
    "preconditions": "Phiếu XN yêu cầu ống EDTA; mẫu đến là ống sinh hóa.",
    "steps": [
     "Mở /v2/sample-receive",
     "Quét/nhập mẫu với loại ống không khớp loại XN",
     "Bấm Nhận"
    ],
    "expected": "Hệ thống cảnh báo loại ống không khớp (LabTubeTypes vs XN), không cho nhận hoặc bắt xác nhận ngoại lệ.",
    "evidence": [
     {
      "name": "TC-LIS-007__s01__error",
      "caption": "Cảnh báo loại ống không khớp",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-008",
    "title": "Validation nhập KQ số: trống/không phải số/âm/ngoài range hợp lý",
    "category": "validation",
    "priority": "P1",
    "role": "KTV xét nghiệm",
    "preconditions": "Phiếu XN đang chờ nhập KQ.",
    "steps": [
     "Mở drawer nhập KQ /v2/lab",
     "Để trống ô KQ bắt buộc → Lưu",
     "Nhập chữ 'abc' vào ô số → Lưu",
     "Nhập giá trị âm cho chỉ số không thể âm (vd bạch cầu -5) → Lưu"
    ],
    "expected": "Mỗi case hiện thông báo lỗi đúng ô (bắt buộc / phải là số / giá trị không hợp lệ); không lưu KQ sai.",
    "evidence": [
     {
      "name": "TC-LIS-008__s01__validation",
      "caption": "Lỗi validation field KQ",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-009",
    "title": "Boundary KQ: giá trị 0, rất lớn, đúng biên khoảng tham chiếu",
    "category": "edge",
    "priority": "P2",
    "role": "KTV xét nghiệm",
    "preconditions": "Chỉ số có LabReferenceRange (vd 3.5-5.0).",
    "steps": [
     "Nhập KQ = 0",
     "Nhập KQ = giá trị rất lớn (vd 999999)",
     "Nhập KQ đúng biên dưới (3.5) và biên trên (5.0)"
    ],
    "expected": "Giá trị biên trong khoảng không gắn cờ H/L; ngoài khoảng gắn cờ đúng (Low/High); giá trị cực lớn vẫn lưu và format đúng, không tràn UI.",
    "evidence": [
     {
      "name": "TC-LIS-009__s01__detail",
      "caption": "Cờ H/L theo khoảng tham chiếu tại biên",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-010",
    "title": "Khoảng tham chiếu theo giới tính/tuổi áp đúng (data-consistency)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "KTV xét nghiệm",
    "preconditions": "LabReferenceRanges có cấu hình khác nhau theo giới (vd Hemoglobin nam/nữ).",
    "steps": [
     "Nhập cùng giá trị Hb cho 1 bệnh nhân nam và 1 bệnh nhân nữ",
     "So sánh cờ H/L áp dụng"
    ],
    "expected": "Cùng giá trị nhưng cờ bình thường/bất thường áp theo khoảng tham chiếu đúng giới tính/tuổi của từng bệnh nhân.",
    "evidence": [
     {
      "name": "TC-LIS-010__s01__detail",
      "caption": "Khoảng tham chiếu áp theo giới tính BN",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-011",
    "title": "Nhận KQ tự động qua HL7/LabConnect từ máy XN (integration)",
    "category": "integration",
    "priority": "P0",
    "role": "Hệ thống/KTV",
    "preconditions": "Máy XN cấu hình kết nối HL7 ở /v2/lis-config, có phiếu trong worklist.",
    "steps": [
     "Cấu hình & test kết nối máy tại /v2/lis-config",
     "Cho máy gửi KQ (hoặc mô phỏng LabConnect sync)",
     "Xem LabRawResults và LabConnectionLogs"
    ],
    "expected": "KQ tự ánh xạ vào đúng phiếu/chỉ số (LisAnalyzerMappings); LabConnectionLogs/LabconnectSyncHistories ghi phiên đồng bộ; không cần nhập tay.",
    "evidence": [
     {
      "name": "TC-LIS-011__s01__detail",
      "caption": "Log kết nối/đồng bộ LabConnect",
      "uiState": "detail"
     },
     {
      "name": "TC-LIS-011__s02__list",
      "caption": "KQ thô tự ánh xạ vào phiếu",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246",
     "#249"
    ]
   },
   {
    "id": "TC-LIS-012",
    "title": "Mất kết nối máy XN → cảnh báo + fallback nhập tay (integration/error)",
    "category": "integration",
    "priority": "P1",
    "role": "KTV xét nghiệm",
    "preconditions": "Máy XN cấu hình kết nối; chủ động ngắt kết nối.",
    "steps": [
     "Tại /v2/lis-config bấm 'Test kết nối' khi máy offline",
     "Quan sát trạng thái máy và log lỗi",
     "Thử nhập KQ tay cho phiếu"
    ],
    "expected": "Trạng thái máy = Offline/Lỗi, LabConnectionLogs ghi lỗi, UI cảnh báo; vẫn cho nhập KQ thủ công làm fallback.",
    "evidence": [
     {
      "name": "TC-LIS-012__s01__error",
      "caption": "Trạng thái máy Offline + log lỗi",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-013",
    "title": "Vi sinh: nuôi cấy → định danh → kháng sinh đồ (luồng chính)",
    "category": "happy",
    "priority": "P0",
    "role": "KTV vi sinh",
    "preconditions": "Có phiếu cấy vi sinh ở /v2/microbiology.",
    "steps": [
     "Mở /v2/microbiology ca đang cấy",
     "Định danh vi khuẩn (chọn LabOrganisms)",
     "Nhập kháng sinh đồ S/I/R cho từng kháng sinh (LabAntibiotics)",
     "Trả KQ vi sinh"
    ],
    "expected": "MicrobiologyOrganismFinding + AntibioticSensitivityResults lưu đúng; bảng KSĐ hiển thị S/I/R; ca chuyển 'Đã trả'; audit ghi.",
    "evidence": [
     {
      "name": "TC-LIS-013__s01__list",
      "caption": "Tab ca đang cấy vi sinh",
      "uiState": "list"
     },
     {
      "name": "TC-LIS-013__s02__drawer",
      "caption": "Drawer định danh vi khuẩn",
      "uiState": "drawer"
     },
     {
      "name": "TC-LIS-013__s03__form",
      "caption": "Bảng kháng sinh đồ S/I/R",
      "uiState": "form"
     },
     {
      "name": "TC-LIS-013__s04__success",
      "caption": "Trả KQ vi sinh thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#246",
     "#250"
    ]
   },
   {
    "id": "TC-LIS-014",
    "title": "Vi sinh âm tính (không mọc) → trả KQ âm tính (negative-flow)",
    "category": "happy",
    "priority": "P2",
    "role": "KTV vi sinh",
    "preconditions": "Ca cấy quá thời gian theo dõi, không mọc khuẩn.",
    "steps": [
     "Mở ca cấy /v2/microbiology",
     "Chọn kết quả 'Âm tính/Không mọc sau N ngày'",
     "Trả KQ"
    ],
    "expected": "Ca chuyển trạng thái Âm tính/Đã trả, không bắt nhập kháng sinh đồ; KQ hiển thị 'Âm tính'.",
    "evidence": [
     {
      "name": "TC-LIS-014__s01__form",
      "caption": "Chọn kết quả âm tính",
      "uiState": "form"
     },
     {
      "name": "TC-LIS-014__s02__success",
      "caption": "KQ âm tính đã trả",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-015",
    "title": "Chặn nhập kháng sinh đồ khi chưa định danh vi khuẩn (state)",
    "category": "state",
    "priority": "P1",
    "role": "KTV vi sinh",
    "preconditions": "Ca cấy chưa định danh organism.",
    "steps": [
     "Mở ca /v2/microbiology",
     "Thử mở/nhập bảng kháng sinh đồ trước khi chọn vi khuẩn"
    ],
    "expected": "Hệ thống chặn, yêu cầu định danh vi khuẩn trước; không cho nhập KSĐ rời rạc.",
    "evidence": [
     {
      "name": "TC-LIS-015__s01__error",
      "caption": "Chặn KSĐ khi chưa định danh",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-016",
    "title": "Hủy/sửa KQ đã trả phải audit + lý do (state/data-consistency)",
    "category": "state",
    "priority": "P0",
    "role": "KTV trưởng/QL",
    "preconditions": "Phiếu XN đã ở trạng thái 'Đã trả'.",
    "steps": [
     "Mở phiếu đã trả ở /v2/lab",
     "Bấm 'Sửa/Hủy KQ'",
     "Nhập lý do sửa và lưu"
    ],
    "expected": "Bắt nhập lý do; tạo bản ghi sửa đổi (không ghi đè âm thầm); audit log lưu giá trị cũ/mới + user; phiếu chuyển về trạng thái cần duyệt lại.",
    "evidence": [
     {
      "name": "TC-LIS-016__s01__modal",
      "caption": "Modal nhập lý do sửa KQ đã trả",
      "uiState": "modal"
     },
     {
      "name": "TC-LIS-016__s02__detail",
      "caption": "Audit ghi giá trị cũ/mới",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-017",
    "title": "Hủy lấy mẫu giữa chừng (negative — thao tác huỷ)",
    "category": "negative",
    "priority": "P2",
    "role": "KTV xét nghiệm",
    "preconditions": "Phiếu đang ở bước lấy mẫu.",
    "steps": [
     "Mở drawer lấy mẫu",
     "Đóng/bấm Hủy giữa chừng không lưu"
    ],
    "expected": "Không tạo mẫu rác; phiếu giữ nguyên trạng thái 'Chờ lấy mẫu'; không ghi audit lấy mẫu.",
    "evidence": [
     {
      "name": "TC-LIS-017__s01__drawer",
      "caption": "Hủy drawer lấy mẫu không lưu",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-018",
    "title": "Validation danh mục: khoảng tham chiếu min ≥ max bị chặn",
    "category": "validation",
    "priority": "P1",
    "role": "Quản trị LIS",
    "preconditions": "Mở /v2/lis-catalog-admin tab Khoảng tham chiếu.",
    "steps": [
     "Thêm khoảng tham chiếu với min = 5.0, max = 3.0",
     "Lưu"
    ],
    "expected": "Chặn lưu, báo lỗi 'Giá trị nhỏ nhất phải nhỏ hơn lớn nhất'.",
    "evidence": [
     {
      "name": "TC-LIS-018__s01__validation",
      "caption": "Lỗi min ≥ max khoảng tham chiếu",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-019",
    "title": "Validation cấu hình giá trị nguy kịch (LabCriticalValueConfig)",
    "category": "validation",
    "priority": "P1",
    "role": "Quản trị LIS",
    "preconditions": "Mở /v2/lis-catalog-admin tab Giá trị nguy kịch.",
    "steps": [
     "Cấu hình ngưỡng low > high",
     "Để trống đơn vị/chỉ số bắt buộc",
     "Lưu"
    ],
    "expected": "Báo lỗi đúng từng field (ngưỡng low<high, bắt buộc đơn vị/chỉ số); không lưu cấu hình sai (ảnh hưởng cảnh báo an toàn).",
    "evidence": [
     {
      "name": "TC-LIS-019__s01__validation",
      "caption": "Lỗi cấu hình ngưỡng nguy kịch",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#246",
     "#250"
    ]
   },
   {
    "id": "TC-LIS-020",
    "title": "Permission: vai trò không đủ quyền bị chặn menu/nút/API LIS",
    "category": "permission",
    "priority": "P0",
    "role": "Lễ tân/vai trò ngoài XN",
    "preconditions": "Có user role không có quyền LIS (tham chiếu matrix #216). Đăng nhập bằng role đó.",
    "steps": [
     "Đăng nhập role không có quyền XN",
     "Kiểm tra menu LIS có ẩn không",
     "Truy cập trực tiếp /v2/lab và /v2/lab-qc qua URL",
     "Gọi trực tiếp API trả KQ"
    ],
    "expected": "Menu LIS ẩn; truy cập route bị chặn/redirect; API trả 403; không lộ dữ liệu KQ.",
    "evidence": [
     {
      "name": "TC-LIS-020__s01__permission",
      "caption": "Menu LIS bị ẩn với role không quyền",
      "uiState": "permission"
     },
     {
      "name": "TC-LIS-020__s02__error",
      "caption": "Truy cập route LIS bị chặn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216",
     "#246"
    ]
   },
   {
    "id": "TC-LIS-021",
    "title": "Chỉ KTV trưởng được ký/duyệt trả KQ (permission/state)",
    "category": "permission",
    "priority": "P1",
    "role": "KTV thường vs KTV trưởng",
    "preconditions": "User KTV thường không có quyền ký KQ.",
    "steps": [
     "Đăng nhập KTV thường, nhập KQ",
     "Thử bấm 'Ký/Duyệt trả KQ'"
    ],
    "expected": "Nút ký bị disable/ẩn cho KTV thường; chỉ KTV trưởng ký được; API ký từ chối user không quyền.",
    "evidence": [
     {
      "name": "TC-LIS-021__s01__permission",
      "caption": "Nút ký KQ disable với KTV thường",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#246"
    ]
   },
   {
    "id": "TC-LIS-022",
    "title": "Security IDOR: không xem được KQ XN của bệnh nhân khác qua link/ID",
    "category": "security",
    "priority": "P0",
    "role": "KTV/người dùng",
    "preconditions": "Có 2 phiếu XN của 2 bệnh nhân khác nhau; có LabResultAccessLinks (link tra KQ).",
    "steps": [
     "Lấy ID/đường dẫn API phiếu KQ của BN A",
     "Đổi sang ID phiếu của BN B mà user không có quyền",
     "Mở link tra KQ (LabResultAccessLink) của BN khác bằng token sai/đoán"
    ],
    "expected": "API/khung tra KQ chặn truy cập trái phép (403/không tìm thấy); link tra KQ chỉ hợp lệ với token đúng, hết hạn thì chặn; không IDOR.",
    "evidence": [
     {
      "name": "TC-LIS-022__s01__error",
      "caption": "Chặn IDOR truy cập KQ BN khác",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216",
     "#246"
    ]
   },
   {
    "id": "TC-LIS-023",
    "title": "Security XSS: field ghi chú/kết luận XN không thực thi script",
    "category": "security",
    "priority": "P1",
    "role": "KTV xét nghiệm",
    "preconditions": "Phiếu XN có ô ghi chú/kết luận (LabConclusionTemplates).",
    "steps": [
     "Nhập <script>alert(1)</script> vào ô kết luận/ghi chú",
     "Lưu và mở lại / xem ở phiếu in"
    ],
    "expected": "Nội dung hiển thị dạng text thuần (escape), không thực thi script ở màn xem và phiếu in.",
    "evidence": [
     {
      "name": "TC-LIS-023__s01__detail",
      "caption": "Ghi chú XSS hiển thị escape an toàn",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#216",
     "#246"
    ]
   },
   {
    "id": "TC-LIS-024",
    "title": "Edge tiếng Việt có dấu + chuỗi dài + ký tự đặc biệt ở danh mục/ghi chú",
    "category": "edge",
    "priority": "P2",
    "role": "Quản trị LIS/KTV",
    "preconditions": "Mở form danh mục XN hoặc ô ghi chú.",
    "steps": [
     "Nhập tên XN tiếng Việt có dấu đầy đủ (vd 'Định lượng Kali huyết thanh')",
     "Nhập chuỗi rất dài (>500 ký tự) vào ghi chú",
     "Nhập ký tự đặc biệt & < > % ' \"",
     "Lưu và xem lại + tìm kiếm"
    ],
    "expected": "Lưu/hiển thị/tìm kiếm đúng tiếng Việt có dấu; chuỗi dài không vỡ UI (truncate/wrap); ký tự đặc biệt an toàn.",
    "evidence": [
     {
      "name": "TC-LIS-024__s01__form",
      "caption": "Nhập tiếng Việt dấu + chuỗi dài",
      "uiState": "form"
     },
     {
      "name": "TC-LIS-024__s02__list",
      "caption": "Hiển thị/tìm kiếm đúng có dấu",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-025",
    "title": "Edge ngày: hẹn lấy mẫu quá khứ / lọc khoảng ngày đảo ngược",
    "category": "edge",
    "priority": "P2",
    "role": "KTV xét nghiệm",
    "preconditions": "Màn SampleAppointments / filter ngày ở /v2/sample-tracking.",
    "steps": [
     "Tạo hẹn lấy mẫu với ngày quá khứ",
     "Lọc danh sách với 'từ ngày' > 'đến ngày'",
     "Lọc với khoảng ngày rất rộng (vd 10 năm)"
    ],
    "expected": "Hẹn quá khứ bị cảnh báo/chặn nếu không hợp lệ; filter từ>đến báo lỗi hoặc tự sửa; khoảng rộng vẫn trả kết quả phân trang, không treo.",
    "evidence": [
     {
      "name": "TC-LIS-025__s01__filter",
      "caption": "Filter khoảng ngày đảo ngược",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-026",
    "title": "Data-consistency: chi phí XN → vào viện phí → áp BHYT đúng",
    "category": "data-consistency",
    "priority": "P0",
    "role": "KTV + thu ngân",
    "preconditions": "Bệnh nhân BHYT có chỉ định XN; XN hoàn tất.",
    "steps": [
     "Hoàn tất 1 XN cho BN BHYT ở /v2/lab",
     "Mở phân hệ viện phí kiểm tra dòng phí XN",
     "Kiểm tra phần BHYT chi trả/đồng chi trả của dịch vụ XN"
    ],
    "expected": "Chi phí XN phát sinh đúng từ dịch vụ đã thực hiện (không tính XN bị từ chối/hủy); viện phí khớp; mức BHYT áp đúng tỷ lệ; LockedService chặn sửa sau chốt.",
    "evidence": [
     {
      "name": "TC-LIS-026__s01__detail",
      "caption": "Dòng phí XN trong viện phí khớp",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-027",
    "title": "UI states: empty/loading/error các màn LIS",
    "category": "ui",
    "priority": "P2",
    "role": "KTV xét nghiệm",
    "preconditions": "Có thể tạo trạng thái rỗng (lọc không kết quả) và lỗi tải (BE tắt).",
    "steps": [
     "Mở /v2/lab, /v2/microbiology, /v2/sample-storage khi không có dữ liệu (empty)",
     "Mở khi đang tải (loading skeleton)",
     "Mở khi API lỗi (BE tắt) xem error state"
    ],
    "expected": "Mỗi màn có empty state rõ ràng (không phải bảng trắng), loading skeleton, error state có nút thử lại; không crash/console error.",
    "evidence": [
     {
      "name": "TC-LIS-027__s01__empty",
      "caption": "Empty state màn XN",
      "uiState": "empty"
     },
     {
      "name": "TC-LIS-027__s02__loading",
      "caption": "Loading skeleton",
      "uiState": "loading"
     },
     {
      "name": "TC-LIS-027__s03__error",
      "caption": "Error state + thử lại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-028",
    "title": "UI dark/light parity + format số/ngày màn LIS",
    "category": "ui",
    "priority": "P2",
    "role": "KTV xét nghiệm",
    "preconditions": "Topbar v2 có toggle dark/light.",
    "steps": [
     "Mở /v2/lab ở light mode, kiểm tra cờ H/L, badge nguy kịch, số thập phân, ngày",
     "Bật dark mode, kiểm tra tương phản các badge/biểu đồ QC",
     "So sánh hai chế độ"
    ],
    "expected": "Hai chế độ đều đọc được, đủ tương phản (badge nguy kịch/QC fail nổi bật ở cả hai); số thập phân/đơn vị/ngày format nhất quán (vi-VN); không màu trùng nền.",
    "evidence": [
     {
      "name": "TC-LIS-028__s01__detail",
      "caption": "Màn XN light mode",
      "uiState": "detail"
     },
     {
      "name": "TC-LIS-028__s02__detail",
      "caption": "Màn XN dark mode parity",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-029",
    "title": "Môi trường nuôi cấy: trừ tồn khi cấy + cảnh báo hết hạn (data-consistency)",
    "category": "data-consistency",
    "priority": "P2",
    "role": "KTV vi sinh",
    "preconditions": "CultureStocks có tồn môi trường, một số gần hết hạn.",
    "steps": [
     "Thực hiện 1 ca cấy dùng môi trường",
     "Kiểm tra tồn CultureStocks giảm tương ứng + CultureStockLogs ghi",
     "Kiểm tra cảnh báo môi trường hết hạn"
    ],
    "expected": "Tồn môi trường trừ đúng số dùng; CultureStockLogs ghi biến động; môi trường hết hạn bị cảnh báo/không cho dùng.",
    "evidence": [
     {
      "name": "TC-LIS-029__s01__detail",
      "caption": "Tồn môi trường trừ + log",
      "uiState": "detail"
     },
     {
      "name": "TC-LIS-029__s02__error",
      "caption": "Cảnh báo môi trường hết hạn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-LIS-030",
    "title": "Mapping máy-XN sai/thiếu → KQ HL7 không khớp chỉ số (negative integration)",
    "category": "negative",
    "priority": "P1",
    "role": "Quản trị LIS",
    "preconditions": "Một chỉ số chưa có LisAnalyzerMappings.",
    "steps": [
     "Cho máy gửi KQ cho chỉ số chưa map",
     "Xem xử lý KQ không khớp"
    ],
    "expected": "KQ không tự gán vào chỉ số sai; hệ thống đưa vào hàng chờ/ghi log không map được, cảnh báo quản trị bổ sung mapping; không gán nhầm gây sai KQ bệnh nhân.",
    "evidence": [
     {
      "name": "TC-LIS-030__s01__error",
      "caption": "KQ HL7 không map được → cảnh báo",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#246",
     "#249"
    ]
   }
  ],
  "ui_state_checklist": [
   "list (danh sách phiếu XN / ca vi sinh / mẫu)",
   "detail (chi tiết KQ, khoảng tham chiếu, biểu đồ QC)",
   "form (nhập KQ, nhận mẫu, danh mục)",
   "drawer (chi tiết phiếu + nhập KQ, định danh vi khuẩn)",
   "modal (cảnh báo nguy kịch, lý do sửa KQ, xác nhận)",
   "filter (lọc ngày/khoa/máy/loại mẫu)",
   "dropdown (loại mẫu/ống, vi khuẩn, kháng sinh)",
   "validation (lỗi field KQ/danh mục/ngưỡng)",
   "empty (không có dữ liệu)",
   "loading (skeleton tải)",
   "error (chặn QC/IDOR/mất kết nối/permission)",
   "confirm (xác nhận từ chối mẫu/hủy)",
   "success (trả KQ thành công)",
   "toast (thông báo nhanh)",
   "permission (menu/nút bị ẩn/disable)"
  ],
  "gaps": [
   "Chưa rõ cấu hình quy tắc Westgard chi tiết (1-3s/2-2s/R-4s/4-1s/10x) có trong sản phẩm hay chỉ đánh giá đơn giản ±SD — cần xác minh để test QC sâu hơn.",
   "Matrix phân quyền #216 cho LIS chưa được đọc cụ thể (vai trò nào ký/duyệt/sửa/xem) — TC-LIS-020/021 cần đối chiếu danh sách permission thật.",
   "Chưa thấy luồng phiếu in KQ XN/biểu mẫu BHYT (MS) ở phạm vi tài liệu — nên bổ sung test in phiếu KQ (header bệnh viện, ký số, A4) và xuất PDF.",
   "Liên thông quốc gia/đơn thuốc/BHXH cho KQ XN (xuất XML/CDA) chưa rõ thuộc LIS hay phân hệ national — cần xác minh để bổ sung test integration cổng QG.",
   "SampleAppointments (hẹn lấy mẫu ngoại trú/lấy mẫu tại nhà) chưa có màn rõ trong routes — cần xác minh có UI riêng để thêm test đặt/hủy hẹn.",
   "Chưa test đồng thời (concurrency): 2 KTV cùng sửa 1 phiếu KQ / cùng nhận 1 mẫu — nên bổ sung test khóa lạc quan/tranh chấp.",
   "Chưa test phân trang/hiệu năng worklist lớn (hàng nghìn phiếu/ngày cao điểm) — nên thêm test tải danh sách + ảo hóa bảng.",
   "SpecialTestRules / IvfLab nghiệp vụ đặc thù chưa đủ chi tiết để viết case sâu — cần tài liệu nghiệp vụ bổ sung."
  ]
 },
 {
  "id": "ris",
  "code": "RIS",
  "layer": "clin",
  "ic": "🩻",
  "nm": "Chẩn đoán hình ảnh (RIS/PACS)",
  "gh": [
   "#246",
   "#250",
   "#249"
  ],
  "gap": false,
  "module_id": "ris",
  "summary": "Phân hệ Chẩn đoán hình ảnh (RIS/PACS) quản lý toàn bộ vòng đời: ServiceRequest ⟶ RadiologyRequests (phiếu CĐHA) ⟶ RadiologyExams (ca chụp) ⟶ DicomStudies trên PACS ⟶ RadiologyReports (đọc KQ + ký số), kèm auto-send DICOM và liên thông HL7/CDA. Các bảng chính: RadiologyRequests/Exams/Reports/Modalities/Protocols, DicomStudies + DicomAutoSendRules + DicomTransmissionLogs, NonDicomStudies/Images (thu hình ngoài DICOM), RadiologyConsultation* (hội chẩn ảnh), RadiologyDigitalSignatureConfigs/SignatureHistories (ký số), PacsKeyImages/ImageAnnotations, StudyShareLinks (chia sẻ ảnh công khai), AiLabelingResults và RadiologyHL7Messages/CDADocuments. Màn chính trên FE v2 gồm Worklist phiếu CĐHA, DICOM Viewer (Cornerstone3D), RadiologyOps (vận hành/cấu hình), thu hình Non-DICOM, cấu hình auto-send và nhật ký Study.",
  "screens": [
   {
    "name": "Worklist CĐHA (danh sách phiếu chụp)",
    "desc": "Danh sách RadiologyRequests/Exams theo trạng thái: Chờ chụp / Đang chụp / Chờ đọc / Đã ký. KPI strip số ca theo trạng thái, lọc theo phòng/máy/ngày/bộ phận cơ thể, hàng đợi worklist gửi tới modality.",
    "route_guess": "/v2/radiology",
    "elements": [
     "KpiStrip (số ca theo trạng thái)",
     "StatusTabs (Chờ chụp/Đang chụp/Chờ đọc/Đã ký/Hủy)",
     "filter (phòng, máy, ngày, bộ phận, BN)",
     "DataTable phiếu CĐHA",
     "nút Bắt đầu chụp",
     "DrawerShell chi tiết ca chụp",
     "ô tìm kiếm BN/mã phiếu"
    ]
   },
   {
    "name": "Chi tiết phiếu / ca chụp (drawer)",
    "desc": "Chi tiết RadiologyExam: thông tin BN, dịch vụ chỉ định, protocol chụp, bộ phận cơ thể, trạng thái, link DicomStudy, nút mở viewer, nút bắt đầu/hoàn thành chụp.",
    "route_guess": "/v2/radiology (drawer)",
    "elements": [
     "DrawerShell",
     "thông tin BN + cảnh báo dị ứng/chống chỉ định (vd thuốc cản quang)",
     "chọn protocol + máy chụp",
     "trạng thái ca chụp",
     "nút Mở Viewer",
     "tab DICOM Study/Media/KQ đọc"
    ]
   },
   {
    "name": "DICOM Viewer",
    "desc": "Trình xem ảnh Cornerstone3D: stack/MPR/3D, cine, window/level/zoom/pan, đo lường, key images, chú thích ảnh (PacsImageAnnotations).",
    "route_guess": "/v2/radiology/viewer",
    "elements": [
     "viewport DICOM",
     "thanh công cụ W/L/zoom/pan/đo",
     "danh sách series/thumbnail",
     "đánh dấu key image",
     "lớp annotation",
     "trạng thái loading ảnh",
     "error khi PACS không phản hồi"
    ]
   },
   {
    "name": "Đọc & ký số kết quả (RadiologyReport)",
    "desc": "Form soạn KQ đọc: chọn mẫu KQ (RadiologyReportTemplates) + mẫu chẩn đoán + viết tắt, gắn ICD (RisIcdTemplateMappings), trạng thái Nháp/Chờ ký/Đã ký, ký số (USB token/TOTP) ghi RadiologySignatureHistories.",
    "route_guess": "/v2/radiology (drawer/modal đọc KQ)",
    "elements": [
     "editor mô tả + kết luận",
     "dropdown mẫu KQ/mẫu chẩn đoán/viết tắt",
     "chọn ICD",
     "nút Lưu nháp/Trình ký/Ký số",
     "confirm ký số",
     "badge trạng thái report",
     "hiển thị chữ ký + thời điểm ký"
    ]
   },
   {
    "name": "Hội chẩn ảnh (Consultation)",
    "desc": "Phiên hội chẩn RadiologyConsultationSessions/Cases: thêm ca, mời thành viên, đính kèm, thảo luận, ghi chú trên ảnh, xuất biên bản hội chẩn.",
    "route_guess": "/v2/consultation",
    "elements": [
     "danh sách phiên hội chẩn",
     "tab Ca/Thành viên/Đính kèm/Thảo luận",
     "ghi chú trên ảnh (image notes)",
     "nút Tạo biên bản (minutes)",
     "trạng thái phiên (mở/đang họp/kết thúc)"
    ]
   },
   {
    "name": "Thu hình Non-DICOM",
    "desc": "NonDicomStudies/Images: thu ảnh từ thiết bị không chuẩn DICOM (RadiologyCaptureDevices/Session), gán vào phiếu CĐHA.",
    "route_guess": "/v2/non-dicom-capture",
    "elements": [
     "chọn thiết bị thu",
     "phiên thu (capture session)",
     "danh sách ảnh thu được",
     "gán ảnh vào phiếu/BN",
     "xem trước ảnh",
     "xóa/ghi chú ảnh"
    ]
   },
   {
    "name": "Cấu hình Auto-send DICOM",
    "desc": "DicomAutoSendRules: quy tắc tự gửi study tới PACS từ xa (RemotePacsServers), nhật ký truyền (DicomTransmissionLogs).",
    "route_guess": "/v2/dicom-autosend",
    "elements": [
     "DataTable quy tắc",
     "form thêm/sửa quy tắc (đích PACS, điều kiện, bật/tắt)",
     "trạng thái rule",
     "nút test gửi",
     "log truyền gắn rule"
    ]
   },
   {
    "name": "Nhật ký Study DICOM",
    "desc": "DicomStudyActivityLogs: audit mọi hành động trên study (xem/sửa/gửi/chia sẻ).",
    "route_guess": "/v2/dicom-study-audit-log",
    "elements": [
     "DataTable log",
     "filter theo study/người dùng/hành động/ngày",
     "chi tiết bản ghi log",
     "empty state"
    ]
   },
   {
    "name": "Vận hành CĐHA (RadiologyOps)",
    "desc": "Trung tâm cấu hình/vận hành: máy chụp (Modalities), phòng (RoomAssignments), lịch trực (DutySchedules), protocol, nhãn, mẫu, phân quyền CĐHA.",
    "route_guess": "/v2/radiology-ops",
    "elements": [
     "TopTabs cấu hình",
     "DataTable máy/phòng/protocol/mẫu",
     "ModalShell thêm/sửa",
     "lịch trực",
     "phân quyền (RadiologyPermissions)"
    ]
   },
   {
    "name": "Chia sẻ ảnh công khai (StudyShareLink)",
    "desc": "Trang xem study qua link chia sẻ token, không cần đăng nhập (PublicStudyViewer).",
    "route_guess": "/shared/:token",
    "elements": [
     "viewer ảnh chỉ-đọc",
     "thông báo link hết hạn/không hợp lệ",
     "không lộ thông tin BN khác"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-RIS-001",
    "title": "Worklist CĐHA hiển thị đúng danh sách phiếu chờ chụp (luồng chính)",
    "category": "happy",
    "priority": "P0",
    "role": "Kỹ thuật viên CĐHA",
    "preconditions": "Đã đăng nhập admin/Admin@123; tồn tại ít nhất 1 ServiceRequest CĐHA sinh phiếu RadiologyRequests ở trạng thái Chờ chụp.",
    "steps": [
     "Đăng nhập, vào /v2/radiology",
     "Quan sát KpiStrip và tab trạng thái mặc định (Chờ chụp)",
     "Quan sát DataTable danh sách phiếu CĐHA",
     "Mở chi tiết 1 phiếu bằng cách bấm vào dòng"
    ],
    "expected": "Trang load không lỗi console; KPI hiển thị số ca từng trạng thái; bảng liệt kê phiếu Chờ chụp với cột mã phiếu/BN/dịch vụ/máy/ngày; mở dòng hiện DrawerShell chi tiết đúng BN và dịch vụ chỉ định.",
    "evidence": [
     {
      "name": "TC-RIS-001__s01__list",
      "caption": "Worklist Chờ chụp với KPI strip",
      "uiState": "list"
     },
     {
      "name": "TC-RIS-001__s02__drawer",
      "caption": "Drawer chi tiết phiếu CĐHA",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#246",
     "#250"
    ]
   },
   {
    "id": "TC-RIS-002",
    "title": "Lọc worklist theo phòng/máy/ngày/bộ phận trả đúng kết quả",
    "category": "happy",
    "priority": "P1",
    "role": "Kỹ thuật viên CĐHA",
    "preconditions": "Có phiếu thuộc nhiều máy/phòng/ngày khác nhau.",
    "steps": [
     "Vào /v2/radiology",
     "Chọn 1 máy chụp ở filter",
     "Chọn khoảng ngày hôm nay",
     "Áp dụng và quan sát bảng"
    ],
    "expected": "Bảng chỉ còn phiếu khớp máy + ngày đã chọn; số dòng và KPI cập nhật tương ứng; xóa filter trả lại toàn bộ.",
    "evidence": [
     {
      "name": "TC-RIS-002__s01__filter",
      "caption": "Áp dụng filter máy + ngày",
      "uiState": "filter"
     },
     {
      "name": "TC-RIS-002__s02__list",
      "caption": "Kết quả sau lọc",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-RIS-003",
    "title": "Bắt đầu và hoàn thành ca chụp chuyển trạng thái đúng (Chờ chụp → Đang chụp → Chờ đọc)",
    "category": "state",
    "priority": "P0",
    "role": "Kỹ thuật viên CĐHA",
    "preconditions": "Có phiếu ở trạng thái Chờ chụp, đã gán máy/protocol.",
    "steps": [
     "Mở chi tiết phiếu Chờ chụp",
     "Bấm Bắt đầu chụp, chọn máy + protocol",
     "Quan sát trạng thái chuyển Đang chụp",
     "Bấm Hoàn thành chụp",
     "Quay lại worklist kiểm tra phiếu nằm tab Chờ đọc"
    ],
    "expected": "Trạng thái chuyển tuần tự hợp lệ; sau Hoàn thành phiếu rời tab Đang chụp sang Chờ đọc; KPI cập nhật; audit log ghi hành động.",
    "evidence": [
     {
      "name": "TC-RIS-003__s01__drawer",
      "caption": "Phiếu trước khi bắt đầu chụp",
      "uiState": "drawer"
     },
     {
      "name": "TC-RIS-003__s02__state",
      "caption": "Trạng thái Đang chụp",
      "uiState": "tab"
     },
     {
      "name": "TC-RIS-003__s03__success",
      "caption": "Phiếu chuyển sang Chờ đọc",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#249",
     "#250"
    ]
   },
   {
    "id": "TC-RIS-004",
    "title": "Chặn chuyển trạng thái không hợp lệ (Đã ký không quay lại Chờ chụp)",
    "category": "state",
    "priority": "P0",
    "role": "Kỹ thuật viên CĐHA",
    "preconditions": "Có 1 phiếu ở trạng thái Đã ký (report đã ký số).",
    "steps": [
     "Mở phiếu Đã ký",
     "Tìm và thử thao tác Bắt đầu chụp lại / chỉnh trạng thái",
     "Gọi trực tiếp API đổi trạng thái về Chờ chụp (nếu lộ endpoint)"
    ],
    "expected": "UI không cho thao tác bắt đầu chụp lại trên phiếu Đã ký (nút ẩn/disable); API từ chối (4xx) với thông báo trạng thái không hợp lệ; dữ liệu không đổi.",
    "evidence": [
     {
      "name": "TC-RIS-004__s01__drawer",
      "caption": "Phiếu Đã ký không có nút chụp lại",
      "uiState": "drawer"
     },
     {
      "name": "TC-RIS-004__s02__error",
      "caption": "API từ chối chuyển trạng thái",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#249"
    ]
   },
   {
    "id": "TC-RIS-005",
    "title": "Hủy ca chụp giữa chừng phục hồi trạng thái sạch",
    "category": "negative",
    "priority": "P1",
    "role": "Kỹ thuật viên CĐHA",
    "preconditions": "Có phiếu Chờ chụp.",
    "steps": [
     "Mở phiếu, bấm Bắt đầu chụp",
     "Trong form chụp bấm Hủy / đóng drawer giữa chừng",
     "Mở lại phiếu kiểm tra trạng thái"
    ],
    "expected": "Hủy giữa chừng không tạo bản ghi rác; phiếu giữ nguyên Chờ chụp (hoặc rõ ràng quay về trạng thái trước); không sinh DicomStudy/Exam treo.",
    "evidence": [
     {
      "name": "TC-RIS-005__s01__confirm",
      "caption": "Xác nhận hủy thao tác chụp",
      "uiState": "confirm"
     },
     {
      "name": "TC-RIS-005__s02__drawer",
      "caption": "Phiếu giữ nguyên trạng thái sau hủy",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#249"
    ]
   },
   {
    "id": "TC-RIS-006",
    "title": "Cảnh báo dị ứng/chống chỉ định thuốc cản quang trước khi chụp",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Kỹ thuật viên CĐHA",
    "preconditions": "BN có ghi nhận dị ứng (Allergy) hoặc chống chỉ định liên quan thuốc cản quang; phiếu là chụp có cản quang (CT/MRI có tiêm).",
    "steps": [
     "Mở phiếu chụp có cản quang của BN có dị ứng",
     "Quan sát vùng cảnh báo dị ứng/chống chỉ định",
     "Thử bắt đầu chụp"
    ],
    "expected": "Hiển thị cảnh báo dị ứng/chống chỉ định nổi bật (an toàn người bệnh) trước khi chụp có cản quang; yêu cầu xác nhận có chủ đích; cảnh báo lấy đúng dữ liệu dị ứng của chính BN này.",
    "evidence": [
     {
      "name": "TC-RIS-006__s01__drawer",
      "caption": "Cảnh báo dị ứng thuốc cản quang",
      "uiState": "drawer"
     },
     {
      "name": "TC-RIS-006__s02__confirm",
      "caption": "Xác nhận chụp dù có cảnh báo",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#250"
    ]
   },
   {
    "id": "TC-RIS-007",
    "title": "Mở DICOM Viewer và load study thành công",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Phiếu ở trạng thái Chờ đọc có DicomStudy hợp lệ trên PACS (Orthanc 8042).",
    "steps": [
     "Từ phiếu Chờ đọc bấm Mở Viewer (hoặc vào /v2/radiology/viewer)",
     "Chờ ảnh load",
     "Cuộn qua các slice và đổi series"
    ],
    "expected": "Viewer load series từ PACS proxy (wadouri); hiển thị ảnh; cuộn slice + đổi series mượt; không lỗi console.",
    "evidence": [
     {
      "name": "TC-RIS-007__s01__loading",
      "caption": "Đang load ảnh từ PACS",
      "uiState": "loading"
     },
     {
      "name": "TC-RIS-007__s02__detail",
      "caption": "Viewer hiển thị study",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-RIS-008",
    "title": "Viewer xử lý lỗi khi PACS không phản hồi / study không tồn tại",
    "category": "negative",
    "priority": "P1",
    "role": "Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Mở viewer với studyInstanceUID không tồn tại hoặc khi Orthanc tắt.",
    "steps": [
     "Mở /v2/radiology/viewer với study UID không hợp lệ",
     "Quan sát phản hồi"
    ],
    "expected": "Hiển thị error state rõ ràng (không màn trắng, không spinner vô hạn); thông báo không tải được ảnh; có nút thử lại/quay lại.",
    "evidence": [
     {
      "name": "TC-RIS-008__s01__error",
      "caption": "Error state khi không load được study",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-RIS-009",
    "title": "Công cụ W/L, zoom, pan, đo lường hoạt động trên viewer",
    "category": "ui",
    "priority": "P1",
    "role": "Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Đã load 1 study trong viewer.",
    "steps": [
     "Dùng công cụ Window/Level kéo trên ảnh",
     "Zoom và pan",
     "Dùng công cụ đo khoảng cách"
    ],
    "expected": "W/L thay đổi độ tương phản; zoom/pan đúng tâm; đo hiển thị giá trị (mm); thao tác không làm crash viewport.",
    "evidence": [
     {
      "name": "TC-RIS-009__s01__detail",
      "caption": "Áp dụng W/L và đo lường",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-RIS-010",
    "title": "Đánh dấu Key Image và thêm chú thích ảnh được lưu",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Đã load study trong viewer.",
    "steps": [
     "Chọn 1 ảnh, bấm Đánh dấu Key Image",
     "Thêm 1 chú thích (annotation) lên ảnh, lưu",
     "Đóng và mở lại viewer cùng study"
    ],
    "expected": "Key image (PacsKeyImages) và annotation (PacsImageAnnotations) được lưu; mở lại study vẫn còn key image + chú thích đúng vị trí.",
    "evidence": [
     {
      "name": "TC-RIS-010__s01__detail",
      "caption": "Key image và annotation trên ảnh",
      "uiState": "detail"
     },
     {
      "name": "TC-RIS-010__s02__success",
      "caption": "Annotation persist sau khi mở lại",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-RIS-011",
    "title": "Soạn và lưu nháp kết quả đọc từ mẫu KQ (luồng chính)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Phiếu Chờ đọc; có RadiologyReportTemplates phù hợp dịch vụ.",
    "steps": [
     "Mở phiếu Chờ đọc, mở form đọc KQ",
     "Chọn 1 mẫu KQ, nội dung tự điền vào editor",
     "Chỉnh mô tả + kết luận, gắn ICD",
     "Bấm Lưu nháp"
    ],
    "expected": "Mẫu KQ đổ đúng nội dung; gắn ICD thành công; lưu nháp tạo RadiologyReport trạng thái Nháp; phiếu vẫn ở Chờ đọc; có thể mở lại chỉnh tiếp.",
    "evidence": [
     {
      "name": "TC-RIS-011__s01__form",
      "caption": "Form đọc KQ với mẫu đã chọn",
      "uiState": "form"
     },
     {
      "name": "TC-RIS-011__s02__dropdown",
      "caption": "Chọn mẫu KQ và ICD",
      "uiState": "dropdown"
     },
     {
      "name": "TC-RIS-011__s03__success",
      "caption": "Lưu nháp thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#250"
    ]
   },
   {
    "id": "TC-RIS-012",
    "title": "Validation form đọc KQ: thiếu kết luận/ICD bắt buộc khi trình ký",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Mở form đọc KQ một phiếu Chờ đọc.",
    "steps": [
     "Để trống phần Kết luận",
     "Không gắn ICD",
     "Bấm Trình ký / Ký số"
    ],
    "expected": "Bị chặn; hiển thị lỗi từng field bắt buộc (Kết luận, ICD) cạnh field; không tạo report trạng thái Chờ ký; báo lỗi tiếng Việt rõ nghĩa.",
    "evidence": [
     {
      "name": "TC-RIS-012__s01__validation",
      "caption": "Lỗi validation field bắt buộc khi trình ký",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#250"
    ]
   },
   {
    "id": "TC-RIS-013",
    "title": "Ký số kết quả đọc ghi lịch sử ký và khóa nội dung",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Report ở trạng thái Nháp/Chờ ký, đầy đủ nội dung; cấu hình ký số (RadiologyDigitalSignatureConfigs) sẵn sàng.",
    "steps": [
     "Mở report đầy đủ, bấm Ký số",
     "Hoàn tất xác thực ký (USB token/TOTP)",
     "Kiểm tra trạng thái report và worklist"
    ],
    "expected": "Report chuyển Đã ký; hiển thị chữ ký + người ký + thời điểm; ghi RadiologySignatureHistories; nội dung KQ khóa không cho sửa; phiếu sang tab Đã ký.",
    "evidence": [
     {
      "name": "TC-RIS-013__s01__confirm",
      "caption": "Xác nhận ký số",
      "uiState": "confirm"
     },
     {
      "name": "TC-RIS-013__s02__success",
      "caption": "Report Đã ký với chữ ký + thời điểm",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#250",
     "#249"
    ]
   },
   {
    "id": "TC-RIS-014",
    "title": "Không cho sửa nội dung report sau khi đã ký số",
    "category": "negative",
    "priority": "P0",
    "role": "Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Report ở trạng thái Đã ký.",
    "steps": [
     "Mở report Đã ký",
     "Thử chỉnh nội dung mô tả/kết luận",
     "Thử gọi API update report (nếu lộ)"
    ],
    "expected": "Editor chỉ-đọc; không có nút Lưu; API update bị từ chối với thông báo report đã khóa; muốn đổi phải qua quy trình sửa đính chính có audit.",
    "evidence": [
     {
      "name": "TC-RIS-014__s01__detail",
      "caption": "Report Đã ký ở chế độ chỉ-đọc",
      "uiState": "detail"
     },
     {
      "name": "TC-RIS-014__s02__error",
      "caption": "API từ chối sửa report đã ký",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#250"
    ]
   },
   {
    "id": "TC-RIS-015",
    "title": "KQ đọc đã ký hiển thị đúng tại EMR và sẵn sàng cho khám lại",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ lâm sàng",
    "preconditions": "Một report CĐHA đã ký số gắn với MedicalRecord của BN.",
    "steps": [
     "Mở hồ sơ EMR của chính BN đó",
     "Vào mục kết quả CĐHA",
     "So chiếu nội dung KQ với report đã ký"
    ],
    "expected": "KQ CĐHA đã ký hiện trong EMR đúng BN; nội dung + ICD + người ký khớp với report; link mở lại ảnh study; dữ liệu nhất quán giữa RIS và EMR.",
    "evidence": [
     {
      "name": "TC-RIS-015__s01__detail",
      "caption": "KQ CĐHA hiển thị trong EMR",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#250"
    ]
   },
   {
    "id": "TC-RIS-016",
    "title": "Tạo phiên hội chẩn ảnh, mời thành viên và xuất biên bản",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Có study cần hội chẩn; có user khác làm thành viên.",
    "steps": [
     "Vào /v2/consultation, tạo phiên hội chẩn ảnh",
     "Thêm 1 ca (RadiologyConsultationCases) gắn study",
     "Mời thành viên, đính kèm, viết thảo luận, ghi chú trên ảnh",
     "Tạo biên bản hội chẩn (minutes)"
    ],
    "expected": "Phiên tạo thành công; ca/thành viên/đính kèm/thảo luận/ghi-chú-ảnh lưu đúng; biên bản (RadiologyConsultationMinutes) sinh ra với nội dung tổng hợp.",
    "evidence": [
     {
      "name": "TC-RIS-016__s01__form",
      "caption": "Tạo phiên hội chẩn + thêm ca",
      "uiState": "form"
     },
     {
      "name": "TC-RIS-016__s02__tab",
      "caption": "Tab thành viên/thảo luận/đính kèm",
      "uiState": "tab"
     },
     {
      "name": "TC-RIS-016__s03__success",
      "caption": "Biên bản hội chẩn được tạo",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-RIS-017",
    "title": "Thu hình Non-DICOM và gán vào phiếu CĐHA của đúng BN",
    "category": "happy",
    "priority": "P1",
    "role": "Kỹ thuật viên CĐHA",
    "preconditions": "Có thiết bị thu (RadiologyCaptureDevices) cấu hình; phiếu CĐHA dạng non-DICOM.",
    "steps": [
     "Vào /v2/non-dicom-capture",
     "Chọn thiết bị, mở phiên thu",
     "Thu/đưa vào vài ảnh",
     "Gán ảnh vào phiếu/BN, lưu"
    ],
    "expected": "Ảnh tạo NonDicomImages thuộc NonDicomStudies; gán đúng phiếu/BN; ảnh hiển thị ở chi tiết phiếu; xem trước đúng.",
    "evidence": [
     {
      "name": "TC-RIS-017__s01__form",
      "caption": "Phiên thu hình Non-DICOM",
      "uiState": "form"
     },
     {
      "name": "TC-RIS-017__s02__success",
      "caption": "Ảnh gán vào phiếu BN",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-RIS-018",
    "title": "Tạo và bật/tắt quy tắc Auto-send DICOM tới PACS từ xa",
    "category": "happy",
    "priority": "P2",
    "role": "Quản trị CĐHA",
    "preconditions": "Có RemotePacsServers cấu hình.",
    "steps": [
     "Vào /v2/dicom-autosend",
     "Tạo quy tắc: chọn đích PACS + điều kiện (loại study/máy)",
     "Lưu, bật quy tắc",
     "Tắt quy tắc và quan sát"
    ],
    "expected": "Quy tắc (DicomAutoSendRules) tạo/lưu đúng; bật/tắt phản ánh trạng thái; khi có study khớp + rule bật, sinh DicomTransmissionLogs; rule tắt thì không gửi.",
    "evidence": [
     {
      "name": "TC-RIS-018__s01__form",
      "caption": "Form tạo quy tắc auto-send",
      "uiState": "form"
     },
     {
      "name": "TC-RIS-018__s02__list",
      "caption": "Danh sách quy tắc với trạng thái bật/tắt",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-RIS-019",
    "title": "Auto-send/HL7-CDA thất bại được ghi log lỗi và cho gửi lại",
    "category": "integration",
    "priority": "P1",
    "role": "Quản trị CĐHA",
    "preconditions": "Đích PACS/cổng HL7 không khả dụng (sai host hoặc tắt).",
    "steps": [
     "Cấu hình rule auto-send tới đích lỗi",
     "Kích hoạt study khớp rule",
     "Kiểm tra DicomTransmissionLogs / RadiologyIntegrationLogs",
     "Thử gửi lại"
    ],
    "expected": "Ghi log truyền trạng thái Failed kèm lý do; không treo UI; có cơ chế gửi lại (Hl7MessageQueues); sau khi đích phục hồi, gửi lại thành công cập nhật log.",
    "evidence": [
     {
      "name": "TC-RIS-019__s01__error",
      "caption": "Log truyền DICOM thất bại",
      "uiState": "error"
     },
     {
      "name": "TC-RIS-019__s02__toast",
      "caption": "Thông báo gửi lại",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-RIS-020",
    "title": "Nhật ký Study DICOM ghi đúng mọi hành động (xem/gửi/chia sẻ)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản trị CĐHA",
    "preconditions": "Đã thực hiện vài hành động trên 1 study (xem, gửi, tạo link chia sẻ).",
    "steps": [
     "Vào /v2/dicom-study-audit-log",
     "Lọc theo study vừa thao tác",
     "Đối chiếu các bản ghi hành động"
    ],
    "expected": "DicomStudyActivityLogs ghi đủ hành động đúng người dùng + thời điểm; lọc theo study/người/hành động chính xác; không thiếu bản ghi.",
    "evidence": [
     {
      "name": "TC-RIS-020__s01__list",
      "caption": "Nhật ký hành động study",
      "uiState": "list"
     },
     {
      "name": "TC-RIS-020__s02__filter",
      "caption": "Lọc log theo study",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#250"
    ]
   },
   {
    "id": "TC-RIS-021",
    "title": "Phân quyền: vai trò KTV không được ký số kết quả",
    "category": "permission",
    "priority": "P0",
    "role": "Kỹ thuật viên CĐHA",
    "preconditions": "Tài khoản role KTV (không có quyền ký KQ theo matrix #216).",
    "steps": [
     "Đăng nhập tài khoản KTV",
     "Mở phiếu Chờ đọc / report",
     "Tìm nút Ký số",
     "Thử gọi thẳng API ký (nếu lộ)"
    ],
    "expected": "Nút Ký số ẩn/disable với KTV; API ký trả 403; không tạo RadiologySignatureHistories; menu vận hành nhạy cảm cũng bị giới hạn theo RadiologyPermissions.",
    "evidence": [
     {
      "name": "TC-RIS-021__s01__permission",
      "caption": "KTV không thấy nút ký số",
      "uiState": "permission"
     },
     {
      "name": "TC-RIS-021__s02__error",
      "caption": "API ký trả 403",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-RIS-022",
    "title": "IDOR: không xem được study/phiếu CĐHA của BN khác bằng đổi ID",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Biết ID phiếu/study của BN ngoài phạm vi quyền (hoặc khác khoa nếu có giới hạn).",
    "steps": [
     "Đăng nhập tài khoản hạn chế",
     "Gọi API GET phiếu/report/study với ID của BN khác",
     "Gọi proxy ảnh PACS với studyUID không thuộc quyền"
    ],
    "expected": "Trả 403/404, không lộ dữ liệu BN khác; proxy ảnh không phục vụ study ngoài quyền; mọi truy cập trái phép được ghi audit.",
    "evidence": [
     {
      "name": "TC-RIS-022__s01__error",
      "caption": "Truy cập study BN khác bị từ chối",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-RIS-023",
    "title": "Link chia sẻ study công khai: hết hạn/sai token bị chặn, không lộ thông tin BN",
    "category": "security",
    "priority": "P0",
    "role": "Khách (không đăng nhập)",
    "preconditions": "Có StudyShareLink hợp lệ và 1 token đã hết hạn/sai.",
    "steps": [
     "Mở /shared/<token-hợp-lệ> ở trình duyệt ẩn danh",
     "Mở /shared/<token-hết-hạn> hoặc token bịa",
     "Kiểm tra dữ liệu lộ ra trên trang"
    ],
    "expected": "Token hợp lệ chỉ hiển thị ảnh được chia sẻ (chỉ-đọc), không lộ thông tin định danh BN khác; token hết hạn/sai báo lỗi không hợp lệ, không truy cập study; không liệt kê được study khác.",
    "evidence": [
     {
      "name": "TC-RIS-023__s01__detail",
      "caption": "Trang chia sẻ với token hợp lệ",
      "uiState": "detail"
     },
     {
      "name": "TC-RIS-023__s02__error",
      "caption": "Token hết hạn/sai bị chặn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-RIS-024",
    "title": "Path-traversal/IDOR trên endpoint phục vụ ảnh PACS proxy",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Biết URL pattern endpoint proxy ảnh DICOM.",
    "steps": [
     "Gọi proxy ảnh với param chứa ../ hoặc đường dẫn tuyệt đối",
     "Gọi với studyUID/objectUID dạng bất thường",
     "Quan sát phản hồi"
    ],
    "expected": "Endpoint chuẩn hóa/validate ID, từ chối path-traversal (4xx), không trả file ngoài kho PACS; không lộ cấu trúc thư mục server.",
    "evidence": [
     {
      "name": "TC-RIS-024__s01__error",
      "caption": "Path-traversal bị chặn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-RIS-025",
    "title": "XSS ở field ghi chú KQ / chú thích ảnh được escape an toàn",
    "category": "security",
    "priority": "P1",
    "role": "Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Mở form đọc KQ hoặc annotation ảnh.",
    "steps": [
     "Nhập payload <script>alert(1)</script> và <img src=x onerror=...> vào mô tả/kết luận/ghi chú",
     "Lưu",
     "Mở lại report/annotation ở màn xem"
    ],
    "expected": "Nội dung hiển thị dưới dạng văn bản (escaped), script không thực thi; lưu/đọc lại an toàn; không phá vỡ layout.",
    "evidence": [
     {
      "name": "TC-RIS-025__s01__form",
      "caption": "Nhập payload XSS vào ghi chú",
      "uiState": "form"
     },
     {
      "name": "TC-RIS-025__s02__detail",
      "caption": "Hiển thị escaped, không thực thi",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-RIS-026",
    "title": "Boundary: chuỗi mô tả KQ rất dài + ký tự đặc biệt + dấu tiếng Việt",
    "category": "edge",
    "priority": "P2",
    "role": "Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Mở form đọc KQ.",
    "steps": [
     "Nhập mô tả ~10.000 ký tự gồm dấu tiếng Việt, emoji, ký tự đặc biệt (& < > \" ')",
     "Lưu nháp",
     "Mở lại đọc"
    ],
    "expected": "Lưu thành công hoặc báo giới hạn rõ ràng (không crash); dấu tiếng Việt + ký tự đặc biệt hiển thị nguyên vẹn khi mở lại; không lỗi encoding.",
    "evidence": [
     {
      "name": "TC-RIS-026__s01__form",
      "caption": "Nhập chuỗi dài + ký tự đặc biệt",
      "uiState": "form"
     },
     {
      "name": "TC-RIS-026__s02__detail",
      "caption": "Hiển thị nguyên vẹn sau lưu",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#250"
    ]
   },
   {
    "id": "TC-RIS-027",
    "title": "Boundary: lọc worklist khoảng ngày tương lai/quá khứ xa và rỗng",
    "category": "edge",
    "priority": "P2",
    "role": "Kỹ thuật viên CĐHA",
    "preconditions": "Trên /v2/radiology.",
    "steps": [
     "Lọc với ngày tương lai xa (vd 2099)",
     "Lọc với khoảng ngày đảo ngược (Từ > Đến)",
     "Lọc khoảng không có dữ liệu"
    ],
    "expected": "Ngày tương lai trả rỗng + empty state đúng; khoảng đảo ngược bị chặn/cảnh báo; không có dữ liệu hiện empty state, không lỗi.",
    "evidence": [
     {
      "name": "TC-RIS-027__s01__empty",
      "caption": "Empty state khi lọc không có dữ liệu",
      "uiState": "empty"
     },
     {
      "name": "TC-RIS-027__s02__validation",
      "caption": "Cảnh báo khoảng ngày đảo ngược",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-RIS-028",
    "title": "UI states: empty/loading/error của worklist và nhật ký",
    "category": "ui",
    "priority": "P1",
    "role": "Kỹ thuật viên CĐHA",
    "preconditions": "Có thể giả lập backend chậm/lỗi.",
    "steps": [
     "Mở /v2/radiology khi không có phiếu nào (empty)",
     "Mở khi API chậm (loading)",
     "Mở khi API trả lỗi 500 (error)"
    ],
    "expected": "Empty state có minh họa + thông điệp; loading có skeleton/spinner; error có thông báo + nút thử lại; không màn trắng.",
    "evidence": [
     {
      "name": "TC-RIS-028__s01__empty",
      "caption": "Empty state worklist",
      "uiState": "empty"
     },
     {
      "name": "TC-RIS-028__s02__loading",
      "caption": "Loading state",
      "uiState": "loading"
     },
     {
      "name": "TC-RIS-028__s03__error",
      "caption": "Error state có nút thử lại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-RIS-029",
    "title": "Dark/light parity các màn RIS (worklist, form đọc, viewer)",
    "category": "ui",
    "priority": "P2",
    "role": "Bác sĩ chẩn đoán hình ảnh",
    "preconditions": "Đã đăng nhập v2.",
    "steps": [
     "Mở /v2/radiology, bật dark mode ở topbar",
     "Quan sát worklist + drawer + form đọc KQ",
     "Mở viewer ở dark mode",
     "Chuyển lại light mode"
    ],
    "expected": "Cả hai theme đủ tương phản, không chữ trắng trên nền trắng / mất viền; bảng, badge trạng thái, KPI, editor đọc rõ; viewer giữ nền tối phù hợp xem ảnh; không vỡ layout.",
    "evidence": [
     {
      "name": "TC-RIS-029__s01__list",
      "caption": "Worklist dark mode",
      "uiState": "list"
     },
     {
      "name": "TC-RIS-029__s02__form",
      "caption": "Form đọc KQ dark mode",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-RIS-030",
    "title": "Audit log ghi đúng mọi mutation CĐHA (chụp/đọc/ký/chia sẻ)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Quản trị hệ thống",
    "preconditions": "Đã thực hiện đủ chuỗi: bắt đầu chụp → hoàn thành → đọc → ký → chia sẻ.",
    "steps": [
     "Thực hiện chuỗi thao tác trên 1 phiếu",
     "Mở AuditLog / DicomStudyActivityLogs / RadiologySignatureHistories",
     "Đối chiếu từng hành động + CreatedBy là user thật"
    ],
    "expected": "Mỗi mutation có bản ghi audit với người thật (≠ Guid.Empty), thời điểm, loại hành động; không thiếu/không trùng; truy vết được chuỗi đầy đủ.",
    "evidence": [
     {
      "name": "TC-RIS-030__s01__list",
      "caption": "Audit/log ghi chuỗi hành động CĐHA",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#250"
    ]
   }
  ],
  "ui_state_checklist": [
   "list - danh sách worklist phiếu/ca chụp, danh sách quy tắc, nhật ký",
   "detail - chi tiết study trong viewer, report chỉ-đọc, KQ trong EMR, trang chia sẻ",
   "drawer - chi tiết phiếu/ca chụp với cảnh báo dị ứng",
   "form - form đọc KQ, tạo quy tắc auto-send, phiên thu non-DICOM, tạo hội chẩn",
   "modal/confirm - xác nhận chụp/ký số/hủy",
   "tab - StatusTabs trạng thái, tab hội chẩn",
   "filter - lọc worklist theo máy/ngày/phòng, lọc log",
   "dropdown - chọn mẫu KQ/mẫu chẩn đoán/ICD/protocol/máy",
   "validation - lỗi field bắt buộc khi trình ký, khoảng ngày đảo ngược",
   "empty - worklist/log không có dữ liệu",
   "loading - tải ảnh PACS, tải danh sách",
   "error - PACS lỗi, API 403/404/500, path-traversal, token sai",
   "success - lưu nháp, ký số, gán ảnh, tạo biên bản",
   "toast - thông báo gửi lại auto-send",
   "permission - ẩn/disable nút theo vai trò (KTV không ký)"
  ],
  "gaps": [
   "Chưa rõ matrix phân quyền chi tiết theo RadiologyPermissions (ai được chụp/đọc/ký/chia sẻ/cấu hình) — cần đối chiếu #216 để hoàn thiện các case permission còn lại (vận hành máy, sửa protocol, xóa rule).",
   "Thiếu case kiểm thử liên thông HL7/CDA hai chiều đầy đủ (nhận order qua HL7 ORM, trả KQ qua ORU/CDA tới HIS ngoài) — mới phủ chiều gửi/thất bại; cần test parse + ánh xạ trường.",
   "Thiếu test tính phí: study/ca chụp phát sinh → đẩy sang viện phí (billing) → áp BHYT; RELATED_X ris không trực tiếp tới billing nên cần xác minh đường dữ liệu chi phí CĐHA qua ServiceRequest/LockedService.",
   "Thiếu kiểm thử AiLabelingResults (gán nhãn AI): độ tin cậy, hiển thị overlay, bác sĩ chấp nhận/bác bỏ kết quả AI, audit quyết định.",
   "Chưa có case đồng thời (concurrency): 2 bác sĩ cùng đọc/ký 1 report, hoặc KTV hoàn thành chụp khi report đang mở — cần test khóa lạc quan/cảnh báo conflict.",
   "Thiếu kiểm thử lịch trực CĐHA (RadiologyDutySchedules) và phân phòng/điều phối (RoomAssignments/Dispatches) ảnh hưởng worklist hiển thị theo ca trực.",
   "Chưa phủ realtime (SignalR) cho cập nhật worklist/queue khi study mới về PACS — cần test push so với polling fallback.",
   "Thiếu boundary cho study rất lớn (nhiều series/nghìn ảnh) về hiệu năng viewer và proxy; và non-DICOM file định dạng/size không hợp lệ.",
   "Chưa rõ quy trình đính chính/thu hồi report đã ký (addendum) — cần test trạng thái + audit khi sửa KQ sau ký.",
   "Thiếu kiểm thử cấu hình màn CLS (RadiologyCLSScreenConfigs) và mẫu mô tả dịch vụ ảnh hưởng hiển thị form đọc theo từng loại dịch vụ."
  ]
 },
 {
  "id": "patho",
  "code": "PAT2",
  "layer": "clin",
  "ic": "🔬",
  "nm": "Giải phẫu bệnh",
  "gh": [
   "#246",
   "#248"
  ],
  "gap": false,
  "module_id": "patho",
  "summary": "Phân hệ Giải phẫu bệnh (GPB, code PAT2, lớp clin) quản lý phiếu & kết quả giải phẫu bệnh / tế bào học, gồm 2 bảng chính: PathologyRequests (phiếu GPB: bệnh phẩm, CĐ lâm sàng, ưu tiên, vòng đời 5 trạng thái 0=Chờ nhận→1=Cắt đại thể→2=Xử lý mô→3=Hoàn tất→4=Đã duyệt, thông tin viện phí BHYT/VP/DV, hủy phiếu) và PathologyResults (KQ: đại thể/vi thể, số block/lam, nhuộm HE/đặc biệt, hóa mô miễn dịch IHC, XN phân tử, chẩn đoán + ICD, ký duyệt). Quan hệ: ServiceRequest ⟶ PathologyRequests ⟶ PathologyResults (CLS phân về Pathology). Màn chính hiện có ở FE v2 là trang danh sách phiếu GPB (SimpleV2Page) với KpiStrip + StatusTabs + DataTable + DrawerShell chi tiết; phần nhập/duyệt kết quả mới có ở API (createResult/updateResult/print) nhưng CHƯA dựng UI trong page v2 (gap).",
  "screens": [
   {
    "name": "Danh sách phiếu GPB (v2)",
    "desc": "Trang chính: KPI strip (Tổng/Chờ nhận/Đang xử lý/Hoàn tất/Đã duyệt/Khẩn), tabs trạng thái, ô tìm kiếm, filter loại mẫu, bảng phiếu GPB. Render từ getPathologyRequests().",
    "route_guess": "/v2/pathology",
    "elements": [
     "KpiStrip 6 thẻ",
     "StatusTabs: Chờ nhận mẫu/Cắt đại thể/Xử lý mô/Hoàn tất/Đã duyệt",
     "ô tìm kiếm (BN/mã GPB/chẩn đoán)",
     "filter dropdown Loại mẫu (Sinh thiết/Tế bào học/Pap/Cắt lạnh)",
     "DataTable cột: Mã GPB, Bệnh nhân, Bệnh phẩm, CĐ lâm sàng, BS chỉ định, Ngày YC, Ưu tiên, TT",
     "chip Khẩn/Thường",
     "StatusBadge trạng thái"
    ]
   },
   {
    "name": "Drawer chi tiết phiếu GPB (v2)",
    "desc": "DrawerShell mở khi click 1 dòng: 3 section BỆNH NHÂN / BỆNH PHẨM / CHỈ ĐỊNH. Header hiển thị mã GPB + tên BN, sub = loại mẫu · vị trí.",
    "route_guess": "/v2/pathology (drawer overlay)",
    "elements": [
     "section BỆNH NHÂN (họ tên, mã BN, mã GPB, giới tính, ngày sinh)",
     "section BỆNH PHẨM (loại mẫu, vị trí lấy, ưu tiên)",
     "section CHỈ ĐỊNH (BS chỉ định, khoa, CĐ lâm sàng, ngày YC)",
     "tiêu đề drawer mã GPB màu cyan"
    ]
   },
   {
    "name": "Form nhập/sửa kết quả GPB (API-only, chưa có UI v2)",
    "desc": "createResult/updateResult tồn tại ở API client (POST /pathology/results, PUT /pathology/results/{id}) với các field đại thể/vi thể/nhuộm/IHC/phân tử/chẩn đoán+ICD/số block-lam, nhưng CHƯA được dựng modal/drawer trong page v2 — là gap.",
    "route_guess": "chưa có (đề xuất modal/drawer trong /v2/pathology)",
    "elements": [
     "(dự kiến) mô tả đại thể",
     "mô tả vi thể",
     "số block/số lam",
     "phương pháp nhuộm",
     "hóa mô miễn dịch",
     "XN phân tử",
     "chẩn đoán GPB + mã ICD",
     "nút Lưu/Duyệt"
    ]
   },
   {
    "name": "In phiếu kết quả GPB",
    "desc": "printPathologyReport(id) gọi GET /pathology/results/{id}/print trả blob HTML/PDF báo cáo GPB. Chưa có nút in trên page v2.",
    "route_guess": "GET /api/pathology/results/{id}/print",
    "elements": [
     "(dự kiến) nút In KQ",
     "cửa sổ/preview báo cáo"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-PAT2-001",
    "title": "Mở trang danh sách phiếu GPB v2 — tải dữ liệu thành công, KPI và bảng hiển thị đúng",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ GPB / KTV",
    "preconditions": "Đã đăng nhập admin/Admin@123; có sẵn ≥1 phiếu GPB ở các trạng thái khác nhau (status 0..4).",
    "steps": [
     "Đăng nhập, vào /v2/pathology",
     "Chờ bảng tải xong",
     "Đối chiếu 6 thẻ KPI (Tổng phiếu / Chờ nhận / Đang xử lý / Hoàn tất / Đã duyệt / Khẩn) với số dòng theo trạng thái",
     "Kiểm tra các cột: Mã GPB, Bệnh nhân (tên+mã), Bệnh phẩm (loại+vị trí), CĐ lâm sàng, BS chỉ định, Ngày YC (DD/MM/YYYY), Ưu tiên, TT"
    ],
    "expected": "Bảng hiển thị danh sách phiếu GPB; KPI 'Tổng phiếu' = tổng số dòng; 'Đang xử lý' = số phiếu status 1-2; ngày định dạng DD/MM/YYYY; loại mẫu hiển thị nhãn tiếng Việt (Sinh thiết/Tế bào học/Pap/Cắt lạnh).",
    "evidence": [
     {
      "name": "TC-PAT2-001__s01__list",
      "caption": "Danh sách phiếu GPB tải đầy đủ với KPI strip",
      "uiState": "list"
     },
     {
      "name": "TC-PAT2-001__s02__filter",
      "caption": "KPI strip 6 thẻ khớp số liệu bảng",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#246",
     "#248"
    ],
    "notes": ""
   },
   {
    "id": "TC-PAT2-002",
    "title": "Lọc theo tab trạng thái — chỉ hiển thị phiếu đúng trạng thái đã chọn",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ GPB",
    "preconditions": "Có phiếu ở ≥3 trạng thái: Chờ nhận(0), Xử lý mô(2), Đã duyệt(4).",
    "steps": [
     "Vào /v2/pathology",
     "Click tab 'Cắt đại thể'",
     "Click tab 'Đã duyệt'",
     "Click tab 'Chờ nhận mẫu'"
    ],
    "expected": "Mỗi tab chỉ liệt kê phiếu có statusKey tương ứng (1→grossing, 2→processing, 3→completed, 4→verified, còn lại→pending). Số dòng đổi đúng theo tab; StatusBadge trùng tab.",
    "evidence": [
     {
      "name": "TC-PAT2-002__s01__tab",
      "caption": "Tab Cắt đại thể chỉ hiện phiếu status 1",
      "uiState": "tab"
     },
     {
      "name": "TC-PAT2-002__s02__tab",
      "caption": "Tab Đã duyệt chỉ hiện phiếu status 4",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#246"
    ],
    "notes": "statusKey: 1=grossing,2=processing,3=completed,4=verified,else=pending."
   },
   {
    "id": "TC-PAT2-003",
    "title": "Tìm kiếm phiếu GPB theo tên BN / mã GPB / mã BN / chẩn đoán",
    "category": "happy",
    "priority": "P1",
    "role": "KTV GPB",
    "preconditions": "Có phiếu với mã GPB và tên BN xác định để tra.",
    "steps": [
     "Vào /v2/pathology",
     "Gõ một phần tên bệnh nhân vào ô tìm kiếm",
     "Xóa, gõ mã GPB (requestCode)",
     "Gõ một phần chẩn đoán lâm sàng"
    ],
    "expected": "Bảng lọc realtime theo searchOf = patientName + patientCode + requestCode + clinicalDiagnosis; kết quả khớp, không phân biệt vùng tìm.",
    "evidence": [
     {
      "name": "TC-PAT2-003__s01__filter",
      "caption": "Tìm theo tên BN ra đúng phiếu",
      "uiState": "filter"
     },
     {
      "name": "TC-PAT2-003__s02__filter",
      "caption": "Tìm theo mã GPB ra đúng phiếu",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#246"
    ],
    "notes": ""
   },
   {
    "id": "TC-PAT2-004",
    "title": "Lọc theo loại bệnh phẩm (Sinh thiết/Tế bào học/Pap/Cắt lạnh)",
    "category": "happy",
    "priority": "P2",
    "role": "Bác sĩ GPB",
    "preconditions": "Có phiếu thuộc ≥2 loại bệnh phẩm khác nhau.",
    "steps": [
     "Vào /v2/pathology",
     "Mở dropdown filter 'Loại mẫu'",
     "Chọn 'Cắt lạnh' (frozenSection)",
     "Chọn lại 'Sinh thiết' (biopsy)"
    ],
    "expected": "Bảng chỉ hiện phiếu có specimenType khớp giá trị chọn; chọn lại loại khác cập nhật đúng; nhãn hiển thị tiếng Việt.",
    "evidence": [
     {
      "name": "TC-PAT2-004__s01__dropdown",
      "caption": "Dropdown loại mẫu mở",
      "uiState": "dropdown"
     },
     {
      "name": "TC-PAT2-004__s02__filter",
      "caption": "Lọc Cắt lạnh ra đúng tập phiếu",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#246"
    ],
    "notes": ""
   },
   {
    "id": "TC-PAT2-005",
    "title": "Mở drawer chi tiết phiếu GPB — 3 section hiển thị đầy đủ và đúng dữ liệu",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ GPB",
    "preconditions": "Có phiếu GPB có đủ thông tin BN, bệnh phẩm, chỉ định.",
    "steps": [
     "Vào /v2/pathology",
     "Click vào 1 dòng phiếu",
     "Đọc section BỆNH NHÂN / BỆNH PHẨM / CHỈ ĐỊNH",
     "Đối chiếu mã GPB ở header drawer với dòng vừa click"
    ],
    "expected": "Drawer mở, header = mã GPB (cyan) + tên BN, sub = '{loại mẫu} · {vị trí}'. Section BỆNH NHÂN đủ họ tên/mã BN/mã GPB (+giới tính, ngày sinh nếu có); BỆNH PHẨM có loại+vị trí+ưu tiên; CHỈ ĐỊNH có BS+khoa+CĐ lâm sàng+ngày YC.",
    "evidence": [
     {
      "name": "TC-PAT2-005__s01__drawer",
      "caption": "Drawer chi tiết phiếu GPB 3 section",
      "uiState": "drawer"
     },
     {
      "name": "TC-PAT2-005__s02__detail",
      "caption": "Section bệnh phẩm + ưu tiên hiển thị đúng",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246",
     "#248"
    ],
    "notes": ""
   },
   {
    "id": "TC-PAT2-006",
    "title": "Empty state — không có phiếu GPB nào",
    "category": "ui",
    "priority": "P1",
    "role": "Bác sĩ GPB",
    "preconditions": "DB không có phiếu GPB nào HOẶC filter ra tập rỗng (vd tìm chuỗi không tồn tại).",
    "steps": [
     "Vào /v2/pathology trên môi trường không có dữ liệu, HOẶC",
     "Gõ chuỗi tìm kiếm chắc chắn không khớp (vd 'zzzzz999')"
    ],
    "expected": "Bảng hiển thị trạng thái rỗng rõ ràng (không lỗi console); KPI = 0; không hiển thị spinner vô hạn.",
    "evidence": [
     {
      "name": "TC-PAT2-006__s01__empty",
      "caption": "Trạng thái rỗng khi không có phiếu",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#246"
    ],
    "notes": ""
   },
   {
    "id": "TC-PAT2-007",
    "title": "Loading state khi tải danh sách phiếu GPB",
    "category": "ui",
    "priority": "P2",
    "role": "Bác sĩ GPB",
    "preconditions": "Mạng/BE phản hồi chậm (throttle Network trong DevTools).",
    "steps": [
     "Bật throttle Slow 3G trong DevTools",
     "Vào /v2/pathology",
     "Quan sát trạng thái trong lúc chờ"
    ],
    "expected": "Hiển thị skeleton/spinner trong lúc tải; sau khi xong chuyển sang bảng; không nhấp nháy lỗi.",
    "evidence": [
     {
      "name": "TC-PAT2-007__s01__loading",
      "caption": "Trạng thái loading khi tải phiếu GPB",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#246"
    ],
    "notes": ""
   },
   {
    "id": "TC-PAT2-008",
    "title": "Error state — API /pathology/requests lỗi (500/timeout) không làm vỡ trang",
    "category": "negative",
    "priority": "P1",
    "role": "Bác sĩ GPB",
    "preconditions": "Giả lập BE trả 500 hoặc tắt BE.",
    "steps": [
     "Tắt backend hoặc intercept /api/pathology/requests trả 500",
     "Vào /v2/pathology",
     "Quan sát hành vi"
    ],
    "expected": "getPathologyRequests bắt lỗi và trả [] (console.warn, không throw); trang hiển thị empty/error thân thiện, KHÔNG trang trắng, KHÔNG console.error đỏ.",
    "evidence": [
     {
      "name": "TC-PAT2-008__s01__error",
      "caption": "API lỗi — trang vẫn render, không vỡ",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#246"
    ],
    "notes": "api/pathology.ts dùng try/catch trả [] + console.warn."
   },
   {
    "id": "TC-PAT2-009",
    "title": "Dark/Light parity trên trang GPB",
    "category": "ui",
    "priority": "P2",
    "role": "Bác sĩ GPB",
    "preconditions": "Có dữ liệu hiển thị + 1 drawer mở được.",
    "steps": [
     "Vào /v2/pathology (light)",
     "Bật toggle dark ở topbar v2",
     "Mở drawer chi tiết",
     "So sánh tương phản chip Khẩn/Thường, StatusBadge, mã GPB cyan ở cả 2 chế độ"
    ],
    "expected": "Cả light/dark đều đọc được; chip/badge/màu cyan đủ tương phản; không có nền trắng cứng trong dark; số/tiền/ngày format giữ nguyên.",
    "evidence": [
     {
      "name": "TC-PAT2-009__s01__list",
      "caption": "Trang GPB chế độ dark",
      "uiState": "list"
     },
     {
      "name": "TC-PAT2-009__s02__drawer",
      "caption": "Drawer GPB dark parity",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#246"
    ],
    "notes": ""
   },
   {
    "id": "TC-PAT2-010",
    "title": "Phân quyền — vai trò không thuộc GPB bị chặn menu/route/API theo matrix #216",
    "category": "permission",
    "priority": "P0",
    "role": "User không có quyền GPB (vd lễ tân)",
    "preconditions": "Có tài khoản role không được cấp quyền phân hệ Giải phẫu bệnh (tham chiếu ma trận #216).",
    "steps": [
     "Đăng nhập bằng tài khoản không có quyền GPB",
     "Kiểm tra menu có ẩn mục Giải phẫu bệnh không",
     "Gõ trực tiếp URL /v2/pathology",
     "Gọi trực tiếp GET /api/pathology/requests bằng token role đó"
    ],
    "expected": "Menu ẩn/chặn; truy cập route bị chặn hoặc trống dữ liệu; API trả 401/403 (controller có [Authorize]). Không lộ phiếu GPB cho role không quyền.",
    "evidence": [
     {
      "name": "TC-PAT2-010__s01__permission",
      "caption": "Role không quyền — menu GPB bị ẩn/chặn",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#246"
    ],
    "notes": "Controller hiện chỉ có [Authorize] (mọi user đăng nhập) — KHÔNG có [Authorize(Roles=...)]. Đây là gap quyền cần kiểm chứng với matrix #216."
   },
   {
    "id": "TC-PAT2-011",
    "title": "Security IDOR — xem phiếu GPB theo id của BN khác qua API",
    "category": "security",
    "priority": "P0",
    "role": "User đăng nhập tối thiểu",
    "preconditions": "Biết id của 1 phiếu GPB thuộc BN bất kỳ.",
    "steps": [
     "Đăng nhập 1 tài khoản hợp lệ",
     "Gọi GET /api/pathology/requests/{id} với id phiếu của BN không liên quan tới user",
     "Kiểm tra dữ liệu nhạy cảm trả về (tên BN, mã BN, chẩn đoán)"
    ],
    "expected": "Hệ thống phải kiểm soát truy cập theo quyền/khoa; nếu trả full thông tin BN khác cho mọi user đăng nhập → ghi nhận lỗ hổng IDOR. Endpoint chỉ NotFound khi id sai, KHÔNG kiểm tra quyền theo BN — cần xác minh và tạo task fix nếu lộ.",
    "evidence": [
     {
      "name": "TC-PAT2-011__s01__permission",
      "caption": "Truy vấn phiếu GPB BN khác qua id",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#248"
    ],
    "notes": "GetPathologyRequestByIdAsync chỉ NotFound — không thấy guard chủ thể/khoa. Nếu lộ → tạo Issue bug IDOR liên kết task này."
   },
   {
    "id": "TC-PAT2-012",
    "title": "Nhập kết quả GPB qua API — đại thể/vi thể/nhuộm/IHC/chẩn đoán+ICD lưu đúng",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ GPB",
    "preconditions": "Có phiếu GPB status 0-2 (chưa có KQ). Lấy token admin.",
    "steps": [
     "POST /api/pathology/results với requestId hợp lệ + grossDescription + microscopicDescription + diagnosis + icdCode + slideCount + blockCount + stainingMethods[]",
     "Nhận response PathologyResultDto",
     "GET /api/pathology/requests/{requestId} kiểm tra KQ gắn vào phiếu"
    ],
    "expected": "Tạo KQ thành công; dữ liệu (số lam/block, nhuộm JSON, chẩn đoán, ICD) lưu khớp; trạng thái phiếu chuyển hợp lý (vd → Completed) theo logic service.",
    "evidence": [
     {
      "name": "TC-PAT2-012__s01__success",
      "caption": "Tạo KQ GPB thành công, dữ liệu khớp",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#248"
    ],
    "notes": "UI v2 CHƯA có form nhập KQ — test ở mức API (createResult). Ghi gap: thiếu màn nhập KQ trên v2."
   },
   {
    "id": "TC-PAT2-013",
    "title": "Validation nhập KQ GPB — thiếu field bắt buộc / số block-lam âm hoặc 0",
    "category": "validation",
    "priority": "P1",
    "role": "Bác sĩ GPB",
    "preconditions": "Có phiếu GPB hợp lệ.",
    "steps": [
     "POST /api/pathology/results thiếu requestId",
     "POST với requestId không tồn tại",
     "POST với slideCount = -1, blockCount = -5",
     "POST với chẩn đoán rỗng nhưng status muốn chuyển Completed"
    ],
    "expected": "API trả 400/lỗi rõ ràng khi thiếu requestId / requestId sai; không cho lưu số block/lam âm; chẩn đoán bắt buộc khi hoàn tất KQ. Thông báo lỗi cụ thể từng field.",
    "evidence": [
     {
      "name": "TC-PAT2-013__s01__validation",
      "caption": "Lỗi validation thiếu field/giá trị âm",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#248",
     "#216"
    ],
    "notes": "Cần xác minh BE có validate range không; nếu không → tạo task fix."
   },
   {
    "id": "TC-PAT2-014",
    "title": "Chuyển trạng thái hợp lệ vs chặn nhảy/ngược trạng thái phiếu GPB",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ GPB / KTV",
    "preconditions": "Phiếu GPB ở các trạng thái 0..4.",
    "steps": [
     "Chuyển phiếu Chờ nhận(0)→Cắt đại thể(1)→Xử lý mô(2)→Hoàn tất(3)→Đã duyệt(4) theo thứ tự",
     "Thử nhảy thẳng Chờ nhận(0)→Đã duyệt(4)",
     "Thử lùi Đã duyệt(4)→Xử lý mô(2)",
     "Thử sửa KQ phiếu đã Đã duyệt(4) (verified/locked)"
    ],
    "expected": "Chuyển tuần tự hợp lệ thành công; nhảy/lùi trạng thái không hợp lệ bị chặn với thông báo; phiếu đã duyệt (status 4) không cho sửa KQ trừ khi mở khóa theo quyền.",
    "evidence": [
     {
      "name": "TC-PAT2-014__s01__state",
      "caption": "Chuyển trạng thái tuần tự hợp lệ",
      "uiState": "state"
     },
     {
      "name": "TC-PAT2-014__s02__error",
      "caption": "Chặn nhảy/lùi trạng thái không hợp lệ",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#248"
    ],
    "notes": "Vòng đời: 0 Pending→1 Grossing→2 Processing→3 Completed→4 Verified."
   },
   {
    "id": "TC-PAT2-015",
    "title": "Duyệt KQ GPB (verify) — ghi người duyệt + thời điểm + audit log",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ GPB trưởng (verifier)",
    "preconditions": "Phiếu có KQ ở trạng thái Hoàn tất(3) chờ duyệt.",
    "steps": [
     "Duyệt KQ qua PUT /api/pathology/results/{id} (verifiedBy/verifiedAt)",
     "Kiểm tra trạng thái phiếu → Đã duyệt(4)",
     "Kiểm tra VerifiedBy/VerifiedByName/VerifiedAt được ghi",
     "Kiểm tra audit log có bản ghi mutation duyệt KQ"
    ],
    "expected": "KQ chuyển Đã duyệt; lưu người duyệt + thời điểm; audit log ghi đầy đủ ai-làm-gì-khi-nào cho thao tác duyệt (yêu cầu patient-safety/compliance).",
    "evidence": [
     {
      "name": "TC-PAT2-015__s01__success",
      "caption": "Duyệt KQ thành công, ghi verifier",
      "uiState": "success"
     },
     {
      "name": "TC-PAT2-015__s02__detail",
      "caption": "Audit log ghi thao tác duyệt KQ",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#248",
     "#216"
    ],
    "notes": ""
   },
   {
    "id": "TC-PAT2-016",
    "title": "Edge/boundary — chuỗi rất dài, ký tự đặc biệt và dấu tiếng Việt ở mô tả/chẩn đoán",
    "category": "edge",
    "priority": "P2",
    "role": "Bác sĩ GPB",
    "preconditions": "Có phiếu GPB tạo KQ được.",
    "steps": [
     "Tạo/sửa KQ với grossDescription/microscopicDescription dài >5000 ký tự",
     "Nhập chẩn đoán có dấu tiếng Việt + ký tự đặc biệt (< > & ' \" %)",
     "Nhập specimenSite có emoji/ký tự unicode",
     "Mở lại drawer/KQ xem hiển thị"
    ],
    "expected": "Lưu & hiển thị nguyên vẹn dấu tiếng Việt và unicode (không mojibake); chuỗi dài không vỡ layout drawer; ký tự đặc biệt được escape an toàn (không vỡ HTML).",
    "evidence": [
     {
      "name": "TC-PAT2-016__s01__form",
      "caption": "Nhập chuỗi dài + tiếng Việt + ký tự đặc biệt",
      "uiState": "form"
     },
     {
      "name": "TC-PAT2-016__s02__detail",
      "caption": "Hiển thị lại nguyên vẹn không mojibake",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#248"
    ],
    "notes": ""
   },
   {
    "id": "TC-PAT2-017",
    "title": "Security XSS — chèn script vào field ghi chú/chẩn đoán không thực thi khi in/hiển thị",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ GPB",
    "preconditions": "Có phiếu GPB tạo KQ được + endpoint in báo cáo.",
    "steps": [
     "Tạo KQ với diagnosis/comments = <script>alert('x')</script> và <img src=x onerror=alert(1)>",
     "Mở drawer chi tiết / màn hiển thị KQ",
     "Gọi GET /api/pathology/results/{id}/print và mở báo cáo HTML"
    ],
    "expected": "Nội dung được escape, KHÔNG thực thi script ở UI lẫn báo cáo in HTML (print trả text/html). Nếu print render thô field người dùng → lỗ hổng XSS, tạo task fix.",
    "evidence": [
     {
      "name": "TC-PAT2-017__s01__detail",
      "caption": "Field ghi chú chứa script — hiển thị an toàn",
      "uiState": "detail"
     },
     {
      "name": "TC-PAT2-017__s02__success",
      "caption": "Báo cáo in không thực thi script",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#248",
     "#216"
    ],
    "notes": "PrintPathologyReport trả File HTML — rủi ro XSS nếu nội thân không escape. Cần kiểm chứng PathologyService.PrintPathologyReportAsync."
   },
   {
    "id": "TC-PAT2-018",
    "title": "In báo cáo KQ GPB — happy + edge (phiếu chưa có KQ)",
    "category": "negative",
    "priority": "P1",
    "role": "Bác sĩ GPB",
    "preconditions": "1 phiếu đã có KQ duyệt; 1 phiếu chưa có KQ.",
    "steps": [
     "Gọi GET /api/pathology/results/{id}/print với id KQ hợp lệ",
     "Mở file HTML trả về kiểm tra nội dung (BN, bệnh phẩm, đại thể/vi thể, chẩn đoán, ICD, người duyệt)",
     "Gọi print với id không tồn tại / phiếu chưa có KQ"
    ],
    "expected": "Báo cáo hợp lệ trả file HTML đầy đủ thông tin; với id sai/chưa có KQ trả lỗi rõ (404/thông báo), không 500 trang trắng.",
    "evidence": [
     {
      "name": "TC-PAT2-018__s01__success",
      "caption": "In báo cáo KQ GPB hợp lệ",
      "uiState": "success"
     },
     {
      "name": "TC-PAT2-018__s02__error",
      "caption": "In khi chưa có KQ — báo lỗi rõ",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#248"
    ],
    "notes": ""
   },
   {
    "id": "TC-PAT2-019",
    "title": "Data-consistency — phiếu GPB phát sinh chi phí chảy đúng sang viện phí/BHYT",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Bác sĩ GPB + Thu ngân",
    "preconditions": "Phiếu GPB có PatientType (1 BHYT/2 VP/3 DV) + TotalAmount; ServiceRequest gốc.",
    "steps": [
     "Tạo/chỉ định phiếu GPB cho BN BHYT có TotalAmount",
     "Vào phân hệ Viện phí (billing) kiểm tra khoản GPB xuất hiện",
     "Kiểm tra mức hưởng BHYT áp đúng theo PatientType",
     "Đánh dấu IsPaid và đối chiếu lại"
    ],
    "expected": "Chi phí GPB (TotalAmount) hiển thị đúng ở viện phí; nguồn chi trả phân loại đúng theo PatientType; BHYT tính đúng phần hưởng; trạng thái IsPaid đồng bộ giữa GPB và billing.",
    "evidence": [
     {
      "name": "TC-PAT2-019__s01__detail",
      "caption": "Chi phí GPB hiển thị ở viện phí",
      "uiState": "detail"
     },
     {
      "name": "TC-PAT2-019__s02__success",
      "caption": "BHYT/IsPaid đồng bộ đúng",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#248",
     "#216"
    ],
    "notes": "PatientType+TotalAmount+IsPaid trên PathologyRequest; liên thông CLS→billing."
   },
   {
    "id": "TC-PAT2-020",
    "title": "Hủy phiếu GPB — bắt buộc lý do, ghi người+thời điểm, chặn hủy phiếu đã duyệt",
    "category": "negative",
    "priority": "P1",
    "role": "Bác sĩ GPB",
    "preconditions": "Có phiếu GPB ở trạng thái sớm (0-1) và 1 phiếu đã Đã duyệt(4).",
    "steps": [
     "Hủy phiếu status 0 KHÔNG nhập CancellationReason",
     "Hủy lại có nhập lý do hợp lệ",
     "Thử hủy phiếu đã Đã duyệt(4)"
    ],
    "expected": "Không cho hủy khi thiếu lý do (báo lỗi); hủy hợp lệ ghi CancelledBy/CancelledAt/CancellationReason; phiếu đã duyệt không cho hủy hoặc cần quyền đặc biệt.",
    "evidence": [
     {
      "name": "TC-PAT2-020__s01__validation",
      "caption": "Chặn hủy khi thiếu lý do",
      "uiState": "validation"
     },
     {
      "name": "TC-PAT2-020__s02__confirm",
      "caption": "Xác nhận hủy có lý do hợp lệ",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#248"
    ],
    "notes": "Entity có CancelledBy/CancelledAt/CancellationReason; UI hủy chưa có trên v2 (gap)."
   },
   {
    "id": "TC-PAT2-021",
    "title": "Edge ngày — Ngày YC tương lai / quá khứ xa và định dạng hiển thị",
    "category": "edge",
    "priority": "P2",
    "role": "Bác sĩ GPB",
    "preconditions": "Có/ tạo được phiếu với requestDate biên.",
    "steps": [
     "Tạo phiếu với requestDate ở tương lai (vd 2099)",
     "Tạo phiếu với requestDate quá khứ rất xa (vd 1900)",
     "Xem cột Ngày YC và drawer",
     "Phiếu không có requestDate (null)"
    ],
    "expected": "Ngày hiển thị DD/MM/YYYY; ngày null hiển thị '—'; ngày tương lai bị cảnh báo/validate nếu nghiệp vụ không cho; không crash dayjs với ngày biên.",
    "evidence": [
     {
      "name": "TC-PAT2-021__s01__detail",
      "caption": "Hiển thị ngày biên + null = —",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246"
    ],
    "notes": "fmtDMY trả '—' khi không có iso."
   },
   {
    "id": "TC-PAT2-022",
    "title": "Phiếu ưu tiên Khẩn (urgent) hiển thị nổi bật và đếm đúng KPI 'Khẩn'",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Bác sĩ GPB",
    "preconditions": "Có ≥1 phiếu priority=urgent và ≥1 normal.",
    "steps": [
     "Vào /v2/pathology",
     "Kiểm tra chip 'Khẩn' (class crit) ở cột Ưu tiên cho phiếu urgent",
     "Đối chiếu thẻ KPI 'Khẩn' = số phiếu urgent",
     "Kiểm tra tone thẻ Khẩn = crit khi >0, ok khi =0"
    ],
    "expected": "Phiếu urgent hiển thị chip Khẩn màu crit; KPI 'Khẩn' đếm đúng = số phiếu priority='urgent'; tone đổi crit/ok theo số lượng.",
    "evidence": [
     {
      "name": "TC-PAT2-022__s01__list",
      "caption": "Chip Khẩn + KPI Khẩn khớp số phiếu urgent",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246"
    ],
    "notes": ""
   }
  ],
  "ui_state_checklist": [
   "list — bảng phiếu GPB tải đầy đủ + KPI strip",
   "filter — tìm kiếm theo BN/mã GPB/chẩn đoán + KPI khớp",
   "tab — lọc theo trạng thái (Chờ nhận/Cắt đại thể/Xử lý mô/Hoàn tất/Đã duyệt)",
   "dropdown — filter loại bệnh phẩm mở",
   "drawer — chi tiết phiếu GPB 3 section",
   "detail — section dữ liệu BN/bệnh phẩm/chỉ định + audit + ngày",
   "empty — không có phiếu / filter rỗng",
   "loading — đang tải danh sách",
   "error — API lỗi / in khi chưa có KQ / chặn trạng thái",
   "form — nhập/sửa KQ GPB (đại thể/vi thể/nhuộm/IHC/chẩn đoán)",
   "validation — thiếu field bắt buộc / số âm / thiếu lý do hủy",
   "confirm — xác nhận hủy phiếu",
   "success — tạo/duyệt KQ + in báo cáo thành công",
   "state — chuyển trạng thái vòng đời 0→4",
   "permission — role không quyền / IDOR phiếu BN khác"
  ],
  "gaps": [
   "Page v2 hiện CHỈ là danh sách + drawer READ-ONLY: chưa có UI nhập KQ GPB, duyệt KQ, hủy phiếu, in báo cáo — các thao tác mutation chỉ test được ở mức API (createResult/updateResult/print). Cần dựng modal/drawer nhập KQ trên /v2/pathology.",
   "Controller PathologyController chỉ có [Authorize] (mọi user đăng nhập), KHÔNG có [Authorize(Roles=...)]; cần đối chiếu ma trận quyền #216 — khả năng thiếu kiểm soát quyền theo vai trò GPB.",
   "GetPathologyRequestByIdAsync chỉ trả NotFound khi id sai, không thấy guard theo chủ thể/khoa → rủi ro IDOR khi xem phiếu BN khác (TC-PAT2-011); cần xác minh và fix nếu lộ.",
   "PrintPathologyReportAsync trả File text/html — rủi ro XSS nếu render thô field người dùng (diagnosis/comments) vào báo cáo; cần kiểm chứng escaping (TC-PAT2-017).",
   "Chưa rõ BE có validate range (slideCount/blockCount ≥0, requestDate hợp lệ) và bắt buộc chẩn đoán khi hoàn tất KQ — cần kiểm thử validation và bổ sung nếu thiếu.",
   "Chưa rõ logic chuyển trạng thái server-side có chặn nhảy/lùi trạng thái và khóa sửa KQ đã duyệt (status 4) hay không — cần xác minh state machine.",
   "Chưa rõ audit log có ghi mọi mutation GPB (tạo/sửa/duyệt/hủy KQ) theo yêu cầu compliance — cần kiểm chứng (TC-PAT2-015).",
   "Liên thông chi phí GPB → viện phí/BHYT (PatientType/TotalAmount/IsPaid) chưa thấy thể hiện trên UI v2; cần xác minh đồng bộ end-to-end với billing.",
   "Không thấy quan hệ ServiceRequest→PathologyRequest được hiển thị/kiểm tra trên UI (theo rel data.js); nên có case data-consistency từ phiếu chỉ định CLS sang GPB.",
   "Thiếu kiểm thử concurrency: 2 KTV cùng nhập/duyệt 1 phiếu (optimistic lock) — chưa có UI/cơ chế rõ ràng."
  ]
 },
 {
  "id": "tdcn",
  "code": "TDCN",
  "layer": "clin",
  "ic": "📈",
  "nm": "Thăm dò chức năng",
  "gh": [
   "#246",
   "#248"
  ],
  "gap": false,
  "module_id": "tdcn",
  "summary": "Phân hệ \"Thăm dò chức năng\" (TDCN, lớp clin) quản lý các phiếu/kết quả thăm dò: ECG, điện não (EEG), điện cơ (EMG), hô hấp ký (Spirometry), thính lực, đo loãng xương, nội soi... Luồng nghiệp vụ: ServiceRequest ⟶ FunctionalDiagnosticTests ⟶ trả kết quả vào bệnh án. Gồm 3 bảng chính: FunctionalDiagnosticTest (phiếu/KQ thăm dò, status 0=Đã chỉ định/1=Đang TH/2=Hoàn thành/3=Đã duyệt/4=Hủy), FunctionalDiagnosticTestType (danh mục loại TDCN) và FunctionalDiagnosticTemplate (mẫu kết quả gắn 1 loại TDCN). Hai màn chính trên FE v2: trang danh sách phiếu thăm dò (/v2/functional-diagnostics — KPI + lọc + bảng + drawer chi tiết, có hành động Hoàn thành/Duyệt) và trang danh mục (/v2/functional-diagnostic-catalog — 2 tab Loại TDCN & Mẫu kết quả với CRUD). Quyền: Verify kết quả chỉ Admin,Doctor (Roles=Admin,Doctor); các API còn lại chỉ [Authorize].",
  "screens": [
   {
    "name": "Danh sách phiếu thăm dò chức năng (v2)",
    "desc": "Bảng các phiếu TDCN: KPI strip (Tổng/Đã duyệt/Đã hoàn thành/Đang chờ), thanh tìm kiếm theo mã/BN, lọc Loại TDCN, lọc Trạng thái, bảng dữ liệu, phân trang 20/trang, hành động Hoàn thành (status=1) và Duyệt (status=2) trên từng dòng. Click dòng mở drawer chi tiết. Đây là màn read-mostly: phiếu phát sinh từ chỉ định (ServiceRequest), không có nút Tạo phiếu tại đây.",
    "route_guess": "/v2/functional-diagnostics",
    "elements": [
     "KpiStrip 4 ô",
     "SearchBox tìm mã/BN",
     "Filter Loại TDCN (ECG/EEG/EMG/Spirometry/Endoscopy/BoneDensity/Audiometry/ECGStress)",
     "Filter Trạng thái (0-4)",
     "DataTable (Mã, Bệnh nhân, Loại TDCN, BS thực hiện, Thực hiện, Trạng thái)",
     "ActBtn Hoàn thành / Duyệt",
     "Pager"
    ]
   },
   {
    "name": "Chi tiết phiếu thăm dò (drawer)",
    "desc": "DrawerShell size lg hiển thị: section BỆNH NHÂN (họ tên, mã BN), KHÁM (loại, BS thực hiện, thời điểm thực hiện, thiết bị, số seri), CHỈ ĐỊNH (clinicalIndication), KẾT QUẢ (findings/conclusion/recommendation — chỉ hiện khi đã có findings), THÔNG SỐ (measurementsJson render JSON). Footer có nút Đóng + Hoàn thành (status=1) / Duyệt KQ (status=2).",
    "route_guess": "/v2/functional-diagnostics (drawer)",
    "elements": [
     "DrSec BỆNH NHÂN/KHÁM/CHỈ ĐỊNH/KẾT QUẢ/THÔNG SỐ",
     "DrField",
     "pre JSON measurements",
     "Btn Đóng/Hoàn thành/Duyệt KQ"
    ]
   },
   {
    "name": "Danh mục TDCN — tab Loại TDCN (v2)",
    "desc": "Tab quản lý danh mục loại thăm dò: KPI (Loại TDCN/Mẫu KQ), tìm kiếm mã/tên, nút Thêm loại, bảng (Mã, Tên loại, Mô tả, Trạng thái Đang dùng/Ngưng), xóa từng dòng (confirm), click dòng mở drawer sửa.",
    "route_guess": "/v2/functional-diagnostic-catalog",
    "elements": [
     "TopTabs (Loại TDCN/Mẫu kết quả)",
     "KpiStrip",
     "SearchBox",
     "ActBtn Thêm loại",
     "DataTable",
     "ActBtn Xóa (confirm)",
     "Drawer sửa loại (Mã*/Tên*/Mô tả/Đang dùng Switch)"
    ]
   },
   {
    "name": "Danh mục TDCN — tab Mẫu kết quả (v2)",
    "desc": "Tab quản lý mẫu kết quả gắn theo loại TDCN: lọc theo loại (Select), tìm kiếm, nút Thêm mẫu, bảng (Mã, Tên mẫu, Loại TDCN, Trạng thái), xóa, drawer thêm/sửa với chọn Loại TDCN* (chỉ loại active), Mã*, Tên*, Nội dung mẫu (textarea text/HTML), Đang dùng.",
    "route_guess": "/v2/functional-diagnostic-catalog (tab template)",
    "elements": [
     "Select lọc loại TDCN",
     "SearchBox",
     "ActBtn Thêm mẫu",
     "DataTable",
     "Drawer (Select Loại TDCN*, Mã*, Tên*, Nội dung mẫu, Switch Đang dùng)"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-TDCN-001",
    "title": "Tải danh sách phiếu thăm dò chức năng và KPI hiển thị đúng",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Đăng nhập admin/Admin@123; có sẵn >=1 phiếu TDCN ở các trạng thái khác nhau.",
    "steps": [
     "Đăng nhập, vào /v2/functional-diagnostics",
     "Quan sát KpiStrip 4 ô và bảng dữ liệu",
     "Đối chiếu số 'Tổng' = số dòng; 'Đã duyệt' = số status=3; 'Đã hoàn thành' = status=2; 'Đang chờ' = status<2"
    ],
    "expected": "Bảng hiển thị các cột Mã, Bệnh nhân (tên + mã BN mono), Loại TDCN, BS thực hiện, Thực hiện (định dạng ngày-giờ), Trạng thái có StatusBadge màu đúng tone. 4 KPI tính đúng theo dữ liệu.",
    "evidence": [
     {
      "name": "TC-TDCN-001__s01__list",
      "caption": "Danh sách phiếu TDCN tải xong với KPI",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246",
     "#248"
    ]
   },
   {
    "id": "TC-TDCN-002",
    "title": "Lọc theo Loại TDCN trả đúng tập phiếu",
    "category": "happy",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có phiếu thuộc >=2 loại (vd ECG và EEG).",
    "steps": [
     "Vào /v2/functional-diagnostics",
     "Mở Filter 'Loại TDCN', chọn 'Điện tim thường quy' (ECG)",
     "Quan sát bảng"
    ],
    "expected": "Chỉ còn phiếu có testType=ECG; KPI giữ nguyên (tính trên toàn bộ rows, không theo filter); phân trang reset về trang 1.",
    "evidence": [
     {
      "name": "TC-TDCN-002__s01__filter",
      "caption": "Mở dropdown lọc loại TDCN",
      "uiState": "filter"
     },
     {
      "name": "TC-TDCN-002__s02__list",
      "caption": "Danh sách sau khi lọc ECG",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-003",
    "title": "Lọc theo Trạng thái và kết hợp tìm kiếm mã/tên BN",
    "category": "happy",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có phiếu nhiều trạng thái + nhiều bệnh nhân.",
    "steps": [
     "Vào /v2/functional-diagnostics",
     "Chọn Filter Trạng thái = 'Đã duyệt'",
     "Nhập vào ô tìm kiếm 1 phần mã phiếu hoặc tên BN có dấu tiếng Việt",
     "Quan sát kết quả"
    ],
    "expected": "Bảng chỉ còn dòng vừa khớp trạng thái=3 vừa khớp từ khóa (so khớp testCode/patientName/patientCode, không phân biệt hoa thường). Trang về 1.",
    "evidence": [
     {
      "name": "TC-TDCN-003__s01__filter",
      "caption": "Áp đồng thời lọc trạng thái + tìm kiếm",
      "uiState": "filter"
     },
     {
      "name": "TC-TDCN-003__s02__list",
      "caption": "Kết quả lọc kết hợp",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-004",
    "title": "Tìm kiếm không khớp hiển thị empty state đúng",
    "category": "ui",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Đã có dữ liệu phiếu.",
    "steps": [
     "Vào /v2/functional-diagnostics",
     "Nhập vào ô tìm kiếm chuỗi vô nghĩa 'zzzz-khong-ton-tai-9999'",
     "Quan sát bảng và pager"
    ],
    "expected": "Bảng hiển thị trạng thái rỗng (empty) đúng kiểu DataTable, không vỡ UI; pager hiện total=0; KPI vẫn theo dữ liệu gốc.",
    "evidence": [
     {
      "name": "TC-TDCN-004__s01__empty",
      "caption": "Empty state khi không có kết quả",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-005",
    "title": "Mở drawer chi tiết phiếu hiển thị đủ section",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có phiếu đã có kết quả (findings) và phiếu chưa có kết quả.",
    "steps": [
     "Vào /v2/functional-diagnostics",
     "Click 1 dòng đã có kết quả",
     "Đối chiếu các section BỆNH NHÂN, KHÁM, CHỈ ĐỊNH, KẾT QUẢ, THÔNG SỐ",
     "Đóng drawer, click 1 dòng CHƯA có kết quả"
    ],
    "expected": "Drawer mở đúng tiêu đề '<loại> · <mã>'. Phiếu có findings hiện đủ Mô tả/Kết luận/Khuyến nghị; THÔNG SỐ render JSON đẹp khi measurementsJson != '{}'. Phiếu chưa kết quả: section KẾT QUẢ và THÔNG SỐ ẩn, các trường trống hiển thị '—'.",
    "evidence": [
     {
      "name": "TC-TDCN-005__s01__drawer",
      "caption": "Drawer chi tiết phiếu đã có kết quả",
      "uiState": "drawer"
     },
     {
      "name": "TC-TDCN-005__s02__drawer",
      "caption": "Drawer phiếu chưa có kết quả (ẩn KẾT QUẢ/THÔNG SỐ)",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-006",
    "title": "Chuyển trạng thái hợp lệ: Hoàn thành phiếu đang thực hiện (status 1 -> 2)",
    "category": "state",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có phiếu status=1 (Đang TH).",
    "steps": [
     "Vào /v2/functional-diagnostics, lọc Trạng thái = 'Đang TH'",
     "Trên dòng status=1 bấm ActBtn 'Hoàn thành' (icon check)",
     "Quan sát toast và bảng",
     "Hoặc mở drawer dòng đó rồi bấm 'Hoàn thành' ở footer"
    ],
    "expected": "Hiện toast 'Đã hoàn thành thăm dò'; danh sách reload; phiếu chuyển sang status=2 (Hoàn thành, badge info); KPI 'Đã hoàn thành' +1, 'Đang chờ' -1; drawer (nếu mở) đóng lại.",
    "evidence": [
     {
      "name": "TC-TDCN-006__s01__list",
      "caption": "Phiếu status=1 với nút Hoàn thành",
      "uiState": "list"
     },
     {
      "name": "TC-TDCN-006__s02__success",
      "caption": "Toast Đã hoàn thành thăm dò",
      "uiState": "success"
     },
     {
      "name": "TC-TDCN-006__s03__list",
      "caption": "Phiếu chuyển trạng thái Hoàn thành",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-007",
    "title": "Chuyển trạng thái hợp lệ: Duyệt kết quả phiếu hoàn thành (status 2 -> 3)",
    "category": "state",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có phiếu status=2 (Hoàn thành); đăng nhập role Admin hoặc Doctor.",
    "steps": [
     "Vào /v2/functional-diagnostics, lọc Trạng thái='Hoàn thành'",
     "Trên dòng status=2 bấm ActBtn 'Duyệt' hoặc mở drawer bấm 'Duyệt KQ'",
     "Quan sát"
    ],
    "expected": "Toast 'Đã duyệt kết quả'; reload; phiếu chuyển status=3 (Đã duyệt, badge ok); KPI 'Đã duyệt' +1; verifiedById/verifiedAt được ghi (kiểm tra qua drawer hoặc API GET).",
    "evidence": [
     {
      "name": "TC-TDCN-007__s01__list",
      "caption": "Phiếu status=2 với nút Duyệt",
      "uiState": "list"
     },
     {
      "name": "TC-TDCN-007__s02__success",
      "caption": "Toast Đã duyệt kết quả",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-008",
    "title": "Chặn hành động không hợp lệ theo trạng thái (không có nút Hoàn thành/Duyệt sai chỗ)",
    "category": "state",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có phiếu status=0 (Đã chỉ định), status=3 (Đã duyệt), status=4 (Hủy).",
    "steps": [
     "Vào /v2/functional-diagnostics",
     "Kiểm tra dòng status=0: không có nút Hoàn thành/Duyệt",
     "Kiểm tra dòng status=3 và status=4: không có nút hành động"
    ],
    "expected": "Chỉ dòng status=1 hiện nút Hoàn thành; chỉ status=2 hiện nút Duyệt. Status 0/3/4 không hiện nút hành động nào (không thể nhảy cóc trạng thái từ UI).",
    "evidence": [
     {
      "name": "TC-TDCN-008__s01__list",
      "caption": "Dòng status 0/3/4 không có action",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-009",
    "title": "Permission: user không phải Admin/Doctor không duyệt được kết quả",
    "category": "permission",
    "priority": "P0",
    "role": "technician",
    "preconditions": "Đăng nhập tài khoản role KHÁC Admin/Doctor (vd kỹ thuật viên/điều dưỡng); có phiếu status=2.",
    "steps": [
     "Đăng nhập tài khoản không phải Admin/Doctor",
     "Vào /v2/functional-diagnostics, mở phiếu status=2",
     "Bấm 'Duyệt KQ' (nếu nút hiển thị) hoặc gọi trực tiếp POST /api/functional-diagnostics/{id}/verify"
    ],
    "expected": "API verify trả 403 Forbidden (controller [Authorize(Roles=Admin,Doctor)]); FE hiện toast 'Duyệt thất bại', phiếu KHÔNG đổi sang status=3. Lý tưởng: nút Duyệt nên bị ẩn theo role (kiểm tra gap).",
    "evidence": [
     {
      "name": "TC-TDCN-009__s01__permission",
      "caption": "Verify bị chặn 403 với role không đủ quyền",
      "uiState": "permission"
     },
     {
      "name": "TC-TDCN-009__s02__error",
      "caption": "Toast Duyệt thất bại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216",
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-010",
    "title": "Phân trang danh sách phiếu (20/trang) hoạt động đúng",
    "category": "edge",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Có > 20 phiếu TDCN.",
    "steps": [
     "Vào /v2/functional-diagnostics (không lọc)",
     "Quan sát Pager: tổng số, số trang",
     "Chuyển sang trang 2, rồi trang cuối"
    ],
    "expected": "Mỗi trang tối đa 20 dòng; total đúng tổng filtered; chuyển trang không mất filter; khi đổi filter/tìm kiếm trang tự về 1.",
    "evidence": [
     {
      "name": "TC-TDCN-010__s01__list",
      "caption": "Trang 2 của danh sách phiếu",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-011",
    "title": "Lỗi tải danh sách hiển thị thông báo, không crash",
    "category": "negative",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Mô phỏng API /functional-diagnostics lỗi 500 hoặc mất mạng (DevTools offline / chặn request).",
    "steps": [
     "Vào /v2/functional-diagnostics khi API lỗi",
     "Quan sát phản hồi UI"
    ],
    "expected": "Hiện toast 'Không tải được'; bảng rỗng/empty thay vì màn trắng; không có exception lan ra console gây vỡ trang.",
    "evidence": [
     {
      "name": "TC-TDCN-011__s01__error",
      "caption": "Toast Không tải được khi API lỗi",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-012",
    "title": "Hiển thị dark/light parity cho danh sách & drawer TDCN",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Có dữ liệu phiếu.",
    "steps": [
     "Vào /v2/functional-diagnostics ở light mode",
     "Toggle dark mode trên topbar v2",
     "Mở drawer chi tiết ở cả 2 chế độ",
     "Kiểm tra StatusBadge, KPI, vùng pre JSON measurements"
    ],
    "expected": "Màu chữ/nền, badge tone, KPI, khối JSON đọc được rõ ở cả dark/light; không có chữ trắng-trên-trắng hay tương phản kém; định dạng ngày-giờ và mã mono nhất quán.",
    "evidence": [
     {
      "name": "TC-TDCN-012__s01__list",
      "caption": "Danh sách ở dark mode",
      "uiState": "list"
     },
     {
      "name": "TC-TDCN-012__s02__drawer",
      "caption": "Drawer ở dark mode (JSON measurements)",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-013",
    "title": "Data-consistency: hoàn thành + duyệt -> KPI & trạng thái đồng bộ, kết quả về bệnh án",
    "category": "data-consistency",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Phiếu status=1 đã nhập findings/conclusion; biết patientId/medicalRecordId của phiếu.",
    "steps": [
     "Hoàn thành phiếu (1->2) rồi Duyệt (2->3) theo TC-006/007",
     "Ghi lại KPI trước/sau",
     "Mở lại drawer kiểm tra verifiedAt/verifiedBy",
     "Kiểm tra kết quả TDCN xuất hiện trong bệnh án/EMR của bệnh nhân (theo rel: trả KQ vào bệnh án)"
    ],
    "expected": "KPI cập nhật đúng từng bước; verifiedById/verifiedAt ghi nhận; kết quả (findings/conclusion) hiển thị trong hồ sơ bệnh án bệnh nhân; audit log ghi nhận mutation complete/verify.",
    "evidence": [
     {
      "name": "TC-TDCN-013__s01__drawer",
      "caption": "Drawer sau duyệt: verifiedAt được ghi",
      "uiState": "drawer"
     },
     {
      "name": "TC-TDCN-013__s02__detail",
      "caption": "Kết quả TDCN hiển thị trong bệnh án BN",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246",
     "#248"
    ]
   },
   {
    "id": "TC-TDCN-014",
    "title": "Security IDOR: không xem được phiếu TDCN bằng id tùy ý của BN khác trái phép",
    "category": "security",
    "priority": "P0",
    "role": "technician",
    "preconditions": "Có 2 phiếu của 2 bệnh nhân khác nhau; tài khoản role hạn chế.",
    "steps": [
     "Lấy id phiếu của BN A",
     "Đăng nhập tài khoản không liên quan, gọi GET /api/functional-diagnostics/{idA}",
     "Quan sát response"
    ],
    "expected": "Hệ thống kiểm soát truy cập theo quyền (không lộ dữ liệu phiếu BN khác cho user không có quyền). Nếu hiện chỉ [Authorize] không lọc theo BN -> ghi nhận là rủi ro IDOR cần siết (xem gaps).",
    "evidence": [
     {
      "name": "TC-TDCN-014__s01__permission",
      "caption": "Truy cập phiếu BN khác bằng id trực tiếp",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-TDCN-015",
    "title": "Security XSS: nội dung findings/conclusion/notes chứa thẻ script không thực thi",
    "category": "security",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Tạo/sửa phiếu có findings = '<img src=x onerror=alert(1)>' hoặc notes có thẻ HTML (qua API SaveFunctionalDiagnosticTest).",
    "steps": [
     "Lưu phiếu với findings/conclusion/notes chứa payload XSS",
     "Mở drawer chi tiết phiếu đó",
     "Quan sát hiển thị"
    ],
    "expected": "Nội dung hiển thị dưới dạng text (whiteSpace pre-wrap) — payload hiển thị nguyên văn, KHÔNG thực thi script/không render HTML; không có alert bật ra.",
    "evidence": [
     {
      "name": "TC-TDCN-015__s01__drawer",
      "caption": "Drawer hiển thị payload XSS dạng text an toàn",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-TDCN-016",
    "title": "Catalog: thêm Loại TDCN mới (happy path)",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Đăng nhập admin; vào /v2/functional-diagnostic-catalog tab 'Loại TDCN'.",
    "steps": [
     "Bấm nút 'Thêm loại' mở drawer",
     "Nhập Mã='HOLTER', Tên='Holter điện tim 24h', Mô tả tùy chọn, bật Đang dùng",
     "Bấm Lưu"
    ],
    "expected": "Toast 'Đã thêm mới'; drawer đóng; danh sách reload có dòng mới; KPI 'Loại TDCN' +1 (nếu active). Dòng mới có badge 'Đang dùng'.",
    "evidence": [
     {
      "name": "TC-TDCN-016__s01__form",
      "caption": "Drawer thêm loại TDCN",
      "uiState": "form"
     },
     {
      "name": "TC-TDCN-016__s02__success",
      "caption": "Toast Đã thêm mới",
      "uiState": "success"
     },
     {
      "name": "TC-TDCN-016__s03__list",
      "caption": "Danh sách có loại mới",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-017",
    "title": "Catalog: validation thiếu Mã/Tên khi lưu Loại TDCN",
    "category": "validation",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Tab 'Loại TDCN', drawer thêm đang mở.",
    "steps": [
     "Để trống Mã, nhập Tên -> bấm Lưu",
     "Quan sát",
     "Nhập Mã, để trống Tên -> bấm Lưu",
     "Nhập Mã/Tên chỉ gồm khoảng trắng -> bấm Lưu"
    ],
    "expected": "Mỗi lần bấm Lưu khi thiếu Mã hoặc Tên (kể cả chỉ whitespace, vì code .trim()) -> toast 'Vui lòng nhập Mã và Tên'; KHÔNG gọi API lưu; drawer giữ nguyên dữ liệu đang nhập.",
    "evidence": [
     {
      "name": "TC-TDCN-017__s01__validation",
      "caption": "Toast yêu cầu nhập Mã và Tên",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-018",
    "title": "Catalog: sửa Loại TDCN (click dòng -> drawer sửa)",
    "category": "happy",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có >=1 loại TDCN.",
    "steps": [
     "Tab 'Loại TDCN', click 1 dòng để mở drawer sửa",
     "Đổi Tên + tắt 'Đang dùng' (Switch off)",
     "Bấm Lưu"
    ],
    "expected": "Toast 'Đã cập nhật'; danh sách reload; tên đổi; badge chuyển 'Ngưng' (crit); KPI 'Loại TDCN' (đếm active) giảm 1.",
    "evidence": [
     {
      "name": "TC-TDCN-018__s01__form",
      "caption": "Drawer sửa loại TDCN, tắt Đang dùng",
      "uiState": "form"
     },
     {
      "name": "TC-TDCN-018__s02__list",
      "caption": "Loại chuyển trạng thái Ngưng",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-019",
    "title": "Catalog: xóa Loại TDCN có xác nhận",
    "category": "negative",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có loại TDCN xóa được; chuẩn bị 1 loại đang được mẫu/phiếu tham chiếu.",
    "steps": [
     "Tab 'Loại TDCN', bấm icon Xóa (trash) trên 1 dòng",
     "Quan sát hộp xác nhận, bấm Hủy -> không xóa",
     "Bấm Xóa lại -> xác nhận",
     "Thử xóa loại đang được mẫu kết quả/phiếu tham chiếu"
    ],
    "expected": "Hộp xác nhận 'Xóa loại TDCN này?' tone crit; Hủy thì không xóa; xác nhận thì toast 'Đã xóa' và reload. Xóa loại đang bị tham chiếu -> backend chặn (FK/ràng buộc) -> toast 'Xóa thất bại', dữ liệu giữ nguyên.",
    "evidence": [
     {
      "name": "TC-TDCN-019__s01__confirm",
      "caption": "Hộp xác nhận xóa loại TDCN",
      "uiState": "confirm"
     },
     {
      "name": "TC-TDCN-019__s02__error",
      "caption": "Toast Xóa thất bại khi loại đang bị tham chiếu",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-020",
    "title": "Catalog: thêm Mẫu kết quả gắn Loại TDCN (happy path)",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có >=1 loại TDCN đang active; vào tab 'Mẫu kết quả'.",
    "steps": [
     "Bấm 'Thêm mẫu' mở drawer",
     "Chọn Loại TDCN (Select chỉ liệt kê loại active), nhập Mã, Tên, Nội dung mẫu",
     "Bấm Lưu"
    ],
    "expected": "Toast 'Đã thêm mới'; drawer đóng; mẫu mới xuất hiện trong bảng với cột Loại TDCN đúng; KPI 'Mẫu KQ' +1.",
    "evidence": [
     {
      "name": "TC-TDCN-020__s01__form",
      "caption": "Drawer thêm mẫu kết quả",
      "uiState": "form"
     },
     {
      "name": "TC-TDCN-020__s02__dropdown",
      "caption": "Select Loại TDCN chỉ hiện loại active",
      "uiState": "dropdown"
     },
     {
      "name": "TC-TDCN-020__s03__list",
      "caption": "Mẫu mới trong danh sách",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-021",
    "title": "Catalog: validation Mẫu kết quả (thiếu Mã/Tên/Loại TDCN)",
    "category": "validation",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Tab 'Mẫu kết quả', drawer thêm mở.",
    "steps": [
     "Để trống Mã/Tên -> Lưu",
     "Nhập Mã/Tên nhưng không chọn Loại TDCN -> Lưu"
    ],
    "expected": "Thiếu Mã/Tên -> toast 'Vui lòng nhập Mã và Tên'. Thiếu Loại TDCN -> toast 'Chọn Loại TDCN'. Không gọi API lưu trong cả 2 trường hợp.",
    "evidence": [
     {
      "name": "TC-TDCN-021__s01__validation",
      "caption": "Toast yêu cầu nhập Mã và Tên",
      "uiState": "validation"
     },
     {
      "name": "TC-TDCN-021__s02__validation",
      "caption": "Toast Chọn Loại TDCN",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-022",
    "title": "Catalog: lọc Mẫu kết quả theo Loại TDCN",
    "category": "happy",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có mẫu thuộc >=2 loại TDCN.",
    "steps": [
     "Tab 'Mẫu kết quả'",
     "Mở Select 'Lọc theo loại TDCN', chọn 1 loại",
     "Quan sát bảng; sau đó clear filter (allowClear)"
    ],
    "expected": "Bảng chỉ còn mẫu thuộc loại đã chọn (gọi lại API getTemplates với testTypeId); clear -> hiện lại toàn bộ; trang về 1.",
    "evidence": [
     {
      "name": "TC-TDCN-022__s01__dropdown",
      "caption": "Select lọc theo loại TDCN",
      "uiState": "dropdown"
     },
     {
      "name": "TC-TDCN-022__s02__list",
      "caption": "Mẫu sau khi lọc",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-023",
    "title": "Catalog: edge — Mã/Tên dài tối đa, ký tự đặc biệt & dấu tiếng Việt",
    "category": "edge",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Tab 'Loại TDCN' và 'Mẫu kết quả'.",
    "steps": [
     "Thêm loại với Mã = 50 ký tự (maxLength), Tên = 200 ký tự, Mô tả = 500 ký tự",
     "Nhập tên có dấu tiếng Việt + ký tự đặc biệt (& < > ' \") và emoji",
     "Lưu, mở lại xem hiển thị"
    ],
    "expected": "Input cắt đúng maxLength (50/200/500); lưu thành công; hiển thị nguyên văn dấu tiếng Việt/ký tự đặc biệt không lỗi encoding, không vỡ layout bảng (cột Mô tả width 300 wrap/truncate hợp lý).",
    "evidence": [
     {
      "name": "TC-TDCN-023__s01__form",
      "caption": "Form nhập Mã/Tên/Mô tả ở giới hạn",
      "uiState": "form"
     },
     {
      "name": "TC-TDCN-023__s02__list",
      "caption": "Hiển thị giá trị dài + tiếng Việt trong bảng",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-024",
    "title": "Catalog: trùng Mã loại TDCN bị chặn",
    "category": "negative",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Đã tồn tại loại Mã='ECG'.",
    "steps": [
     "Thêm loại mới với Mã='ECG' (trùng)",
     "Bấm Lưu"
    ],
    "expected": "Backend chặn trùng mã -> toast 'Lưu thất bại' (hoặc thông báo trùng); không tạo bản ghi trùng. Nếu hệ thống KHÔNG chặn trùng -> ghi nhận gap.",
    "evidence": [
     {
      "name": "TC-TDCN-024__s01__error",
      "caption": "Toast Lưu thất bại khi trùng mã",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-025",
    "title": "Catalog: dark/light parity + empty state 2 tab",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Có/không có dữ liệu loại & mẫu.",
    "steps": [
     "Vào /v2/functional-diagnostic-catalog, chuyển qua lại 2 tab",
     "Toggle dark mode",
     "Lọc/tìm kiếm để ra trạng thái không có kết quả ở mỗi tab"
    ],
    "expected": "Hai tab và drawer hiển thị tốt dark/light; empty state hiển thị đúng khi không có dữ liệu; KPI và badge Đang dùng/Ngưng tương phản rõ; chuyển tab reset search & page.",
    "evidence": [
     {
      "name": "TC-TDCN-025__s01__empty",
      "caption": "Empty state tab Mẫu kết quả",
      "uiState": "empty"
     },
     {
      "name": "TC-TDCN-025__s02__tab",
      "caption": "Catalog dark mode chuyển tab",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#246"
    ]
   },
   {
    "id": "TC-TDCN-026",
    "title": "Permission: menu/route TDCN bị chặn với role không có quyền",
    "category": "permission",
    "priority": "P1",
    "role": "guest-role",
    "preconditions": "Tài khoản role hạn chế không được cấp module Thăm dò chức năng (theo matrix #216).",
    "steps": [
     "Đăng nhập role hạn chế",
     "Kiểm tra menu TerminalLayout có mục TDCN không",
     "Truy cập trực tiếp URL /v2/functional-diagnostics và /v2/functional-diagnostic-catalog",
     "Gọi GET /api/functional-diagnostics"
    ],
    "expected": "Menu ẩn mục TDCN nếu không có quyền; truy cập route trực tiếp bị chặn/redirect; API trả 401/403 nếu thiếu token/role. (Đối chiếu matrix quyền #216.)",
    "evidence": [
     {
      "name": "TC-TDCN-026__s01__permission",
      "caption": "Role hạn chế không thấy menu/không vào được TDCN",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-TDCN-027",
    "title": "Loading state khi tải danh sách & catalog",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Throttle mạng (DevTools Slow 3G).",
    "steps": [
     "Vào /v2/functional-diagnostics và /v2/functional-diagnostic-catalog với mạng chậm",
     "Quan sát giai đoạn đang tải"
    ],
    "expected": "Hiển thị trạng thái loading (skeleton/spinner của DataTable) thay vì màn trắng; sau khi tải xong render dữ liệu mượt, không nhấp nháy layout.",
    "evidence": [
     {
      "name": "TC-TDCN-027__s01__loading",
      "caption": "Trạng thái loading danh sách TDCN",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#246"
    ]
   }
  ],
  "ui_state_checklist": [
   "list (danh sách phiếu + 2 tab catalog)",
   "detail (kết quả TDCN trong bệnh án)",
   "drawer (chi tiết phiếu)",
   "form (drawer thêm/sửa loại & mẫu)",
   "filter (lọc loại/trạng thái danh sách phiếu)",
   "dropdown (Select loại TDCN trong form & filter mẫu)",
   "tab (chuyển Loại TDCN / Mẫu kết quả)",
   "empty (không có kết quả / chưa có dữ liệu)",
   "loading (đang tải danh sách/catalog)",
   "error (lỗi tải/lưu/xóa/duyệt)",
   "validation (thiếu Mã/Tên/Loại TDCN)",
   "confirm (xác nhận xóa)",
   "success (toast thêm/sửa/hoàn thành/duyệt)",
   "permission (chặn theo role: verify, menu, IDOR)"
  ],
  "gaps": [
   "Trang danh sách v2 KHÔNG có nút Tạo phiếu thăm dò — phiếu chỉ phát sinh từ ServiceRequest; cần test riêng luồng chỉ định (OPD/IPD) -> sinh phiếu TDCN (ngoài phạm vi 2 màn này, thuộc phân hệ khám). Chưa có UI nhập/sửa kết quả (findings/measurements) trên FE v2 — kết quả có vẻ nhập qua API/màn khác; cần làm rõ điểm nhập KQ.",
   "Nút 'Duyệt KQ' không ẩn theo role ở FE (chỉ ẩn/hiện theo status); user không phải Admin/Doctor vẫn thấy nút rồi bị 403 -> nên ẩn nút theo quyền để UX rõ và tránh thao tác thừa.",
   "Chưa rõ backend có lọc phiếu theo quyền/khoa/bệnh nhân hay chỉ [Authorize] chung -> rủi ro IDOR khi GET /api/functional-diagnostics/{id} bằng id bất kỳ (TC-014 cần xác minh và có thể sinh task fix).",
   "Không có hành động Hủy phiếu (status=4) trên UI; cần luồng hủy + lý do hủy + chặn hủy sau khi đã duyệt.",
   "Chưa thấy ràng buộc chống trùng Mã loại TDCN / Mã mẫu ở UI; cần xác minh backend (TC-024) — nếu thiếu là lỗi dữ liệu.",
   "Thiếu kiểm thử audit log cho complete/verify/save/delete (patient-safety yêu cầu log mọi mutation) — cần xác minh log ghi đủ ai/khi nào/giá trị cũ-mới.",
   "Thiếu in phiếu kết quả TDCN (biểu mẫu in MS) — đối thủ thường có; nếu yêu cầu thì cần task riêng (his-fe-emr-print-form).",
   "Trang catalog tab 'Loại TDCN' dùng KPI 'Mẫu KQ' nhưng templates chỉ load khi vào tab template -> khi đang ở tab Loại TDCN, KPI 'Mẫu KQ' có thể =0 cho tới khi mở tab template; cần kiểm tra tính đúng KPI khi chưa load templates.",
   "Chưa có kiểm thử ràng buộc xóa loại TDCN đang bị mẫu/phiếu tham chiếu (FK) — cần xác minh backend chặn thay vì xóa làm mồ côi dữ liệu (TC-019).",
   "Chưa có integration test cho việc kết quả TDCN đẩy vào bệnh án/EMR và (nếu có) chi phí dịch vụ -> viện phí; rel ghi 'trả KQ vào bệnh án' nhưng điểm nối FE chưa thấy."
  ]
 },
 {
  "id": "presc",
  "code": "PRSC",
  "layer": "clin",
  "ic": "💊",
  "nm": "Kê đơn & Pha chế",
  "gh": [
   "#251",
   "#253",
   "#241"
  ],
  "gap": false,
  "module_id": "presc",
  "summary": "Phân hệ \"Kê đơn & Pha chế\" quản lý toàn bộ vòng đời đơn thuốc: MedicalRecord → Prescriptions → PrescriptionDetails → duyệt Dược lâm sàng (PharmacyApproval) → phát thuốc, kèm pha chế thuốc (CompoundingOrders/CompoundingOrderItems) và cấu hình thuốc IU (IUMedicineConfigs). Có mẫu đơn (PrescriptionTemplates/Items) và thư viện lời dặn (InstructionLibraries) để kê nhanh. Trọng tâm an toàn người bệnh: kiểm tra dị ứng/chống chỉ định và tương tác thuốc (DrugInteraction) trước khi kê/duyệt; mọi mutation phải ghi audit log. Màn chính: danh sách Đơn thuốc (/v2/prescription), Trình kê đơn (/v2/prescription/edit), Duyệt dược lâm sàng (/v2/clinical-pharmacy-check), Quầy phát thuốc (/v2/dispensing-counter), Phát thuốc nội trú (/v2/inpatient-dispensing) và các màn quản lý mẫu đơn/thư viện lời dặn/phiếu pha chế.",
  "screens": [
   {
    "name": "Danh sách Đơn thuốc",
    "desc": "List shell v2 hiển thị toàn bộ đơn thuốc với KPI (hôm nay/đang hiệu lực/đã cấp phát), StatusTabs theo trạng thái (Đang hiệu lực/Đã cấp phát/Hết hạn/Đã hủy), bảng cột Mã đơn/Bệnh nhân/BS kê/Khoa/Chẩn đoán/Số thuốc/Ngày kê/Hiệu lực/TT, nút Kê đơn và in PDF.",
    "route_guess": "/v2/prescription",
    "elements": [
     "KpiStrip",
     "StatusTabs",
     "DataTable",
     "ô tìm kiếm (mã/BN/BS/chẩn đoán)",
     "nút Kê đơn",
     "nút In PDF",
     "StatusBadge"
    ]
   },
   {
    "name": "Trình kê đơn (PrescriptionEditor)",
    "desc": "Màn kê đơn đầy đủ: chọn/tìm bệnh nhân & bệnh án, tìm và thêm thuốc vào đơn, nhập liều/đường dùng/số lượng/lời dặn, cảnh báo tương tác thuốc + dị ứng/chống chỉ định, áp mẫu đơn, ký số và lưu.",
    "route_guess": "/v2/prescription/edit",
    "elements": [
     "search bệnh nhân",
     "search thuốc (dropdown)",
     "bảng dòng thuốc (liều/đường dùng/SL/lời dặn)",
     "panel cảnh báo tương tác/dị ứng",
     "chọn mẫu đơn",
     "chọn lời dặn từ thư viện",
     "nút Lưu/Ký số",
     "tổng tiền đơn"
    ]
   },
   {
    "name": "Duyệt dược lâm sàng (Clinical Pharmacy Check)",
    "desc": "Dược sĩ duyệt đơn: xem chi tiết đơn, kiểm tra tương tác/dị ứng/chống chỉ định, Approve/Reject kèm lý do; chuyển trạng thái đơn sang Đã duyệt/Từ chối.",
    "route_guess": "/v2/clinical-pharmacy-check",
    "elements": [
     "DataTable đơn chờ duyệt",
     "DrawerShell chi tiết đơn",
     "panel cảnh báo an toàn thuốc",
     "nút Duyệt",
     "nút Từ chối + ô lý do",
     "StatusBadge"
    ]
   },
   {
    "name": "Quầy phát thuốc (Dispensing Counter)",
    "desc": "Phát thuốc ngoại trú: chọn đơn đã duyệt, đối chiếu số lượng tồn, xác nhận phát thuốc, in phiếu phát; cập nhật trạng thái Đã cấp phát.",
    "route_guess": "/v2/dispensing-counter",
    "elements": [
     "DataTable đơn chờ phát",
     "DrawerShell chi tiết phát",
     "nút Xác nhận phát",
     "cảnh báo tồn kho/hết hạn",
     "in phiếu phát",
     "toast thành công"
    ]
   },
   {
    "name": "Phát thuốc nội trú (Inpatient Dispensing)",
    "desc": "Phát thuốc theo khoa/giường cho bệnh nhân nội trú dựa trên y lệnh, gộp theo ngày/khoa.",
    "route_guess": "/v2/inpatient-dispensing",
    "elements": [
     "filter khoa/ngày",
     "DataTable y lệnh thuốc nội trú",
     "nút Phát theo lô",
     "DrawerShell chi tiết",
     "StatusBadge"
    ]
   },
   {
    "name": "Mẫu đơn thuốc (Prescription Templates)",
    "desc": "Quản lý mẫu đơn (PrescriptionTemplates/PrescriptionTemplateItems) để kê nhanh: tạo/sửa/xóa mẫu, thêm dòng thuốc mặc định.",
    "route_guess": "/v2/prescription (tab Mẫu đơn) hoặc màn cấu hình",
    "elements": [
     "DataTable mẫu",
     "ModalShell tạo/sửa mẫu",
     "bảng dòng thuốc mẫu",
     "nút Áp mẫu"
    ]
   },
   {
    "name": "Thư viện lời dặn (Instruction Libraries)",
    "desc": "Quản lý thư viện lời dặn dùng thuốc tái sử dụng khi kê đơn.",
    "route_guess": "màn cấu hình dược / tab trong trình kê đơn",
    "elements": [
     "DataTable lời dặn",
     "ModalShell tạo/sửa",
     "dropdown chọn lời dặn trong editor"
    ]
   },
   {
    "name": "Phiếu pha chế (Compounding Orders)",
    "desc": "Tạo và quản lý phiếu pha chế thuốc (CompoundingOrders/CompoundingOrderItems) gồm thành phần, hàm lượng, cấu hình thuốc IU (IUMedicineConfigs); chuyển trạng thái pha chế.",
    "route_guess": "màn pha chế dược (/v2/...)",
    "elements": [
     "DataTable phiếu pha chế",
     "ModalShell/DrawerShell chi tiết pha chế",
     "bảng thành phần (CompoundingOrderItems)",
     "cấu hình IU",
     "nút Hoàn thành pha chế",
     "StatusBadge"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-PRSC-001",
    "title": "Kê đơn thuốc ngoại trú thành công từ bệnh án (luồng chính)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ khám",
    "preconditions": "Đăng nhập admin/Admin@123; có 1 bệnh nhân đang có MedicalRecord mở; thuốc có tồn trong kho.",
    "steps": [
     "Vào /v2/prescription, bấm nút Kê đơn (mở /v2/prescription/edit)",
     "Tìm và chọn bệnh nhân + bệnh án đang khám",
     "Tìm thuốc trong dropdown, thêm 2 loại thuốc vào đơn",
     "Nhập liều dùng, đường dùng, số lượng, số ngày, lời dặn cho từng dòng",
     "Bấm Lưu/Ký số đơn"
    ],
    "expected": "Đơn được tạo (Prescriptions) với các dòng (PrescriptionDetails) đúng số lượng; trạng thái 'Đang hiệu lực'; quay lại danh sách thấy đơn mới với đúng BN/BS/khoa/số thuốc; audit log ghi mutation tạo đơn.",
    "evidence": [
     {
      "name": "TC-PRSC-001__s01__form",
      "caption": "Trình kê đơn sau khi chọn bệnh nhân và thêm thuốc",
      "uiState": "form"
     },
     {
      "name": "TC-PRSC-001__s02__success",
      "caption": "Toast lưu đơn thành công",
      "uiState": "success"
     },
     {
      "name": "TC-PRSC-001__s03__list",
      "caption": "Đơn mới hiển thị trong danh sách trạng thái Đang hiệu lực",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#251",
     "#241"
    ],
    "notes": "Bám flow grounded: MedicalRecord → Prescriptions → PrescriptionDetails."
   },
   {
    "id": "TC-PRSC-002",
    "title": "Kê đơn từ mẫu đơn thuốc (áp template)",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ khám",
    "preconditions": "Đã có ít nhất 1 PrescriptionTemplate với vài PrescriptionTemplateItems; bệnh nhân có bệnh án.",
    "steps": [
     "Mở trình kê đơn, chọn bệnh nhân",
     "Chọn 'Áp mẫu' và chọn 1 mẫu đơn có sẵn",
     "Kiểm tra các dòng thuốc mẫu được nạp vào đơn",
     "Chỉnh sửa 1 dòng (đổi số lượng) rồi Lưu"
    ],
    "expected": "Các PrescriptionTemplateItems được nạp đúng vào đơn; chỉnh sửa được áp dụng; đơn lưu thành công với dữ liệu kết hợp.",
    "evidence": [
     {
      "name": "TC-PRSC-002__s01__dropdown",
      "caption": "Dropdown chọn mẫu đơn",
      "uiState": "dropdown"
     },
     {
      "name": "TC-PRSC-002__s02__form",
      "caption": "Đơn sau khi nạp từ mẫu",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-003",
    "title": "Chọn lời dặn từ Thư viện lời dặn khi kê đơn",
    "category": "happy",
    "priority": "P2",
    "role": "Bác sĩ khám",
    "preconditions": "InstructionLibraries có sẵn vài lời dặn.",
    "steps": [
     "Trong trình kê đơn, ở 1 dòng thuốc mở dropdown lời dặn",
     "Chọn 1 lời dặn từ thư viện",
     "Lưu đơn"
    ],
    "expected": "Lời dặn được điền vào dòng thuốc; lưu đơn giữ đúng nội dung lời dặn (kể cả tiếng Việt có dấu).",
    "evidence": [
     {
      "name": "TC-PRSC-003__s01__dropdown",
      "caption": "Dropdown thư viện lời dặn",
      "uiState": "dropdown"
     },
     {
      "name": "TC-PRSC-003__s02__form",
      "caption": "Lời dặn đã điền vào dòng thuốc",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-004",
    "title": "Cảnh báo tương tác thuốc khi thêm 2 thuốc tương kỵ (an toàn người bệnh)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ khám",
    "preconditions": "Cấu hình DrugInteraction có ít nhất 1 cặp thuốc tương tác.",
    "steps": [
     "Mở trình kê đơn, chọn bệnh nhân",
     "Thêm thuốc A rồi thêm thuốc B nằm trong cặp tương tác đã cấu hình",
     "Quan sát panel cảnh báo tương tác"
    ],
    "expected": "Hệ thống hiển thị cảnh báo tương tác thuốc rõ ràng (mức độ + mô tả) trước khi lưu; không cho lưu im lặng mà không hiển thị cảnh báo.",
    "evidence": [
     {
      "name": "TC-PRSC-004__s01__form",
      "caption": "Hai thuốc tương kỵ đã thêm vào đơn",
      "uiState": "form"
     },
     {
      "name": "TC-PRSC-004__s02__error",
      "caption": "Panel cảnh báo tương tác thuốc",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#253",
     "#241"
    ],
    "notes": "Grounded NOTES presc: kiểm tương tác thuốc (DrugInteraction)."
   },
   {
    "id": "TC-PRSC-005",
    "title": "Cảnh báo dị ứng/chống chỉ định khi kê thuốc bệnh nhân dị ứng (an toàn người bệnh)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ khám",
    "preconditions": "Bệnh nhân có khai dị ứng (Allergy) hoặc chống chỉ định với 1 hoạt chất.",
    "steps": [
     "Mở trình kê đơn cho bệnh nhân có khai dị ứng",
     "Thêm thuốc chứa hoạt chất bệnh nhân dị ứng",
     "Quan sát cảnh báo"
    ],
    "expected": "Hiển thị cảnh báo dị ứng/chống chỉ định nổi bật (đỏ) trước khi lưu; ghi nhận xác nhận của bác sĩ nếu vẫn kê.",
    "evidence": [
     {
      "name": "TC-PRSC-005__s01__error",
      "caption": "Cảnh báo dị ứng khi thêm thuốc",
      "uiState": "error"
     },
     {
      "name": "TC-PRSC-005__s02__confirm",
      "caption": "Yêu cầu xác nhận tiếp tục kê",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#253",
     "#241"
    ],
    "notes": "Grounded NOTES opd: bắt buộc kiểm tra dị ứng/chống chỉ định trước khi kê đơn."
   },
   {
    "id": "TC-PRSC-006",
    "title": "Duyệt đơn thuốc bởi dược sĩ lâm sàng (Approve)",
    "category": "happy",
    "priority": "P0",
    "role": "Dược sĩ lâm sàng",
    "preconditions": "Có đơn ở trạng thái chờ duyệt tại /v2/clinical-pharmacy-check.",
    "steps": [
     "Vào /v2/clinical-pharmacy-check",
     "Chọn 1 đơn chờ duyệt, mở drawer chi tiết",
     "Xem các cảnh báo an toàn thuốc",
     "Bấm Duyệt"
    ],
    "expected": "Đơn chuyển trạng thái Đã duyệt (PharmacyApproval); đơn sẵn sàng phát thuốc; audit log ghi người duyệt + thời điểm.",
    "evidence": [
     {
      "name": "TC-PRSC-006__s01__drawer",
      "caption": "Drawer chi tiết đơn chờ duyệt",
      "uiState": "drawer"
     },
     {
      "name": "TC-PRSC-006__s02__success",
      "caption": "Đơn đã được duyệt",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#251",
     "#241"
    ]
   },
   {
    "id": "TC-PRSC-007",
    "title": "Từ chối đơn thuốc kèm lý do (Reject)",
    "category": "happy",
    "priority": "P1",
    "role": "Dược sĩ lâm sàng",
    "preconditions": "Có đơn chờ duyệt.",
    "steps": [
     "Mở chi tiết 1 đơn chờ duyệt",
     "Bấm Từ chối",
     "Nhập lý do từ chối (tiếng Việt có dấu)",
     "Xác nhận"
    ],
    "expected": "Đơn chuyển Từ chối; lý do được lưu và hiển thị; đơn không thể phát thuốc; audit log ghi lý do.",
    "evidence": [
     {
      "name": "TC-PRSC-007__s01__modal",
      "caption": "Modal nhập lý do từ chối",
      "uiState": "modal"
     },
     {
      "name": "TC-PRSC-007__s02__validation",
      "caption": "Báo lỗi khi để trống lý do từ chối",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-008",
    "title": "Phát thuốc ngoại trú tại quầy (Dispensing) thành công",
    "category": "happy",
    "priority": "P0",
    "role": "Dược sĩ phát thuốc",
    "preconditions": "Có đơn Đã duyệt; thuốc đủ tồn.",
    "steps": [
     "Vào /v2/dispensing-counter",
     "Chọn đơn đã duyệt, mở chi tiết phát",
     "Đối chiếu số lượng và bấm Xác nhận phát"
    ],
    "expected": "Đơn chuyển trạng thái Đã cấp phát; tồn kho giảm tương ứng (StockMovement); in được phiếu phát.",
    "evidence": [
     {
      "name": "TC-PRSC-008__s01__drawer",
      "caption": "Chi tiết đơn chờ phát",
      "uiState": "drawer"
     },
     {
      "name": "TC-PRSC-008__s02__success",
      "caption": "Xác nhận phát thuốc thành công",
      "uiState": "success"
     },
     {
      "name": "TC-PRSC-008__s03__list",
      "caption": "Đơn chuyển sang Đã cấp phát",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#251",
     "#241"
    ]
   },
   {
    "id": "TC-PRSC-009",
    "title": "Cảnh báo khi phát thuốc vượt tồn kho / thuốc hết hạn",
    "category": "negative",
    "priority": "P1",
    "role": "Dược sĩ phát thuốc",
    "preconditions": "Một thuốc trong đơn có tồn nhỏ hơn số lượng kê hoặc đã quá hạn dùng.",
    "steps": [
     "Mở đơn cần phát có thuốc thiếu tồn/hết hạn",
     "Bấm Xác nhận phát"
    ],
    "expected": "Hệ thống chặn hoặc cảnh báo (LowStockAlert/ExpiryAlert), không trừ kho âm; yêu cầu xử lý trước khi phát.",
    "evidence": [
     {
      "name": "TC-PRSC-009__s01__error",
      "caption": "Cảnh báo thiếu tồn / hết hạn khi phát",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-010",
    "title": "Lưu đơn thiếu field bắt buộc bị chặn",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ khám",
    "preconditions": "Trình kê đơn đang mở.",
    "steps": [
     "Chọn bệnh nhân nhưng không thêm dòng thuốc nào, bấm Lưu",
     "Thêm 1 thuốc nhưng để trống số lượng / liều dùng, bấm Lưu"
    ],
    "expected": "Chặn lưu đơn rỗng; chặn lưu khi thiếu số lượng/liều; hiển thị thông báo lỗi đúng tại field tương ứng.",
    "evidence": [
     {
      "name": "TC-PRSC-010__s01__validation",
      "caption": "Báo lỗi đơn không có thuốc",
      "uiState": "validation"
     },
     {
      "name": "TC-PRSC-010__s02__validation",
      "caption": "Báo lỗi thiếu số lượng/liều dùng",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-011",
    "title": "Biên giá trị số lượng/số ngày: 0, âm, rất lớn",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ khám",
    "preconditions": "Trình kê đơn, đã chọn bệnh nhân và thêm 1 thuốc.",
    "steps": [
     "Nhập số lượng = 0 rồi Lưu",
     "Nhập số lượng = -5 rồi Lưu",
     "Nhập số lượng = 999999999 và số ngày = 9999 rồi Lưu"
    ],
    "expected": "Số lượng/số ngày phải > 0; chặn 0 và số âm với thông báo rõ; giá trị quá lớn bị giới hạn hợp lý hoặc cảnh báo, không tràn/format sai.",
    "evidence": [
     {
      "name": "TC-PRSC-011__s01__validation",
      "caption": "Báo lỗi số lượng 0/âm",
      "uiState": "validation"
     },
     {
      "name": "TC-PRSC-011__s02__validation",
      "caption": "Xử lý số lượng/số ngày rất lớn",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-012",
    "title": "Hiệu lực đơn: ngày validTo trong quá khứ và validFrom > validTo",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ khám",
    "preconditions": "Trình kê đơn có trường hiệu lực từ/đến.",
    "steps": [
     "Đặt ngày hiệu lực đến (validTo) là ngày quá khứ",
     "Đặt validFrom muộn hơn validTo",
     "Lưu đơn"
    ],
    "expected": "Chặn/ cảnh báo validTo trong quá khứ; chặn validFrom > validTo với thông báo rõ; trạng thái 'Hết hạn' tính đúng khi validTo đã qua.",
    "evidence": [
     {
      "name": "TC-PRSC-012__s01__validation",
      "caption": "Báo lỗi khoảng hiệu lực không hợp lệ",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-013",
    "title": "Lời dặn nhập chuỗi rất dài + ký tự đặc biệt + tiếng Việt có dấu",
    "category": "edge",
    "priority": "P2",
    "role": "Bác sĩ khám",
    "preconditions": "Trình kê đơn, dòng thuốc đang nhập lời dặn.",
    "steps": [
     "Nhập lời dặn dài >1000 ký tự gồm dấu tiếng Việt và ký tự đặc biệt (&, <, >, %, emoji)",
     "Lưu đơn rồi mở lại xem"
    ],
    "expected": "Lưu và hiển thị đúng tiếng Việt có dấu; ký tự đặc biệt không phá vỡ layout; chuỗi quá dài bị giới hạn hoặc xuống dòng đúng.",
    "evidence": [
     {
      "name": "TC-PRSC-013__s01__form",
      "caption": "Lời dặn dài + ký tự đặc biệt",
      "uiState": "form"
     },
     {
      "name": "TC-PRSC-013__s02__detail",
      "caption": "Hiển thị lại lời dặn sau khi lưu",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-014",
    "title": "Chuyển trạng thái không hợp lệ: phát thuốc đơn chưa duyệt / đơn đã hủy",
    "category": "state",
    "priority": "P0",
    "role": "Dược sĩ phát thuốc",
    "preconditions": "Có đơn ở trạng thái Đang hiệu lực (chưa duyệt) và 1 đơn Đã hủy.",
    "steps": [
     "Tại quầy phát, cố phát đơn chưa qua duyệt dược",
     "Cố phát đơn đã hủy (gọi trực tiếp API nếu UI ẩn nút)"
    ],
    "expected": "Không cho phát đơn chưa duyệt và đơn đã hủy; API trả lỗi 4xx có thông điệp; trạng thái không bị nhảy sai.",
    "evidence": [
     {
      "name": "TC-PRSC-014__s01__error",
      "caption": "Chặn phát đơn chưa duyệt/đã hủy",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-015",
    "title": "Hủy đơn thuốc giữa chừng và sau khi đã phát",
    "category": "state",
    "priority": "P1",
    "role": "Bác sĩ khám",
    "preconditions": "Có 1 đơn Đang hiệu lực chưa phát và 1 đơn Đã cấp phát.",
    "steps": [
     "Hủy đơn Đang hiệu lực, nhập lý do, xác nhận",
     "Thử hủy đơn Đã cấp phát"
    ],
    "expected": "Đơn chưa phát hủy được → trạng thái Đã hủy; đơn đã phát KHÔNG được hủy đơn thường (chặn hoặc yêu cầu hoàn trả riêng); audit log ghi lý do hủy.",
    "evidence": [
     {
      "name": "TC-PRSC-015__s01__confirm",
      "caption": "Xác nhận hủy đơn + lý do",
      "uiState": "confirm"
     },
     {
      "name": "TC-PRSC-015__s02__error",
      "caption": "Chặn hủy đơn đã cấp phát",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-016",
    "title": "Hủy giữa chừng thao tác kê đơn không tạo đơn rác",
    "category": "negative",
    "priority": "P2",
    "role": "Bác sĩ khám",
    "preconditions": "Trình kê đơn đang mở, đã thêm vài dòng thuốc.",
    "steps": [
     "Thêm thuốc nhưng KHÔNG lưu, bấm Quay lại/đóng editor",
     "Vào lại danh sách đơn kiểm tra"
    ],
    "expected": "Không tạo đơn nháp rác trong danh sách; có cảnh báo mất dữ liệu chưa lưu trước khi thoát.",
    "evidence": [
     {
      "name": "TC-PRSC-016__s01__confirm",
      "caption": "Cảnh báo rời trang khi chưa lưu",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-017",
    "title": "Chi phí đơn thuốc đổ đúng sang Viện phí và đúng mức hưởng BHYT (data-consistency)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ khám / Thu ngân",
    "preconditions": "Bệnh nhân BHYT có bệnh án; thuốc có đơn giá và tỷ lệ BHYT.",
    "steps": [
     "Kê đơn 2 thuốc đã duyệt và phát cho bệnh nhân BHYT",
     "Mở phân hệ Viện phí của bệnh nhân đó",
     "Đối chiếu dòng thuốc + thành tiền + phần BHYT chi trả / phần người bệnh"
    ],
    "expected": "Mỗi dòng thuốc xuất hiện trong viện phí với đúng đơn giá × số lượng; phần BHYT và phần đồng chi trả tính đúng tỷ lệ; tổng khớp.",
    "evidence": [
     {
      "name": "TC-PRSC-017__s01__detail",
      "caption": "Đơn thuốc đã phát",
      "uiState": "detail"
     },
     {
      "name": "TC-PRSC-017__s02__detail",
      "caption": "Dòng thuốc trong viện phí + tách BHYT/đồng chi trả",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#241",
     "#251"
    ],
    "notes": "Liên thông presc → billing → insurance (RELATED_X)."
   },
   {
    "id": "TC-PRSC-018",
    "title": "Audit log ghi đúng mọi mutation (tạo/duyệt/từ chối/phát/hủy)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản trị / Kiểm soát",
    "preconditions": "Đã thực hiện chuỗi tạo→duyệt→phát một đơn.",
    "steps": [
     "Thực hiện tạo, duyệt, phát, hủy trên các đơn khác nhau",
     "Mở nhật ký/audit để tra cứu các hành động"
    ],
    "expected": "Mỗi hành động ghi audit với user thật (CreatedBy ≠ Guid.Empty), thời điểm, trạng thái trước/sau; không thiếu bản ghi.",
    "evidence": [
     {
      "name": "TC-PRSC-018__s01__list",
      "caption": "Audit log các mutation của đơn",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#241"
    ],
    "notes": "Grounded org/system NOTES: mọi mutation phải có CreatedBy user thật + AuditLog."
   },
   {
    "id": "TC-PRSC-019",
    "title": "Phân quyền: vai trò không đủ quyền bị chặn kê/duyệt/phát (permission)",
    "category": "permission",
    "priority": "P0",
    "role": "Điều dưỡng / vai trò không có quyền dược",
    "preconditions": "Có user vai trò không có quyền kê đơn / duyệt dược / phát thuốc theo matrix #216.",
    "steps": [
     "Đăng nhập user không có quyền kê đơn → vào /v2/prescription/edit",
     "User không có quyền duyệt → /v2/clinical-pharmacy-check thử Duyệt",
     "Gọi trực tiếp API tạo/duyệt/phát bằng token thiếu quyền"
    ],
    "expected": "Menu/nút bị ẩn hoặc disable theo vai trò; API trả 403; không thực hiện được hành động ngoài quyền.",
    "evidence": [
     {
      "name": "TC-PRSC-019__s01__permission",
      "caption": "Nút kê/duyệt bị ẩn với vai trò thiếu quyền",
      "uiState": "permission"
     },
     {
      "name": "TC-PRSC-019__s02__error",
      "caption": "API trả 403 khi gọi trực tiếp",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216",
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-020",
    "title": "IDOR: xem/sửa đơn thuốc của bệnh nhân khác qua API (security)",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ (tài khoản A)",
    "preconditions": "Hai bệnh nhân khác nhau, mỗi người có đơn; biết id đơn của BN không thuộc phạm vi user.",
    "steps": [
     "Đăng nhập user A, lấy token",
     "Gọi GET/PUT /api/prescription/{id} với id đơn của bệnh nhân ngoài phạm vi",
     "Quan sát phản hồi"
    ],
    "expected": "Không lộ dữ liệu đơn của bệnh nhân khác trái phép; trả 403/404; không cho sửa đơn ngoài phạm vi.",
    "evidence": [
     {
      "name": "TC-PRSC-020__s01__error",
      "caption": "Truy cập đơn BN khác bị từ chối",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-PRSC-021",
    "title": "XSS ở field lời dặn / lý do từ chối (security)",
    "category": "security",
    "priority": "P1",
    "role": "Bác sĩ / Dược sĩ",
    "preconditions": "Có đơn cho phép nhập lời dặn và lý do.",
    "steps": [
     "Nhập vào lời dặn chuỗi <script>alert(1)</script> và <img src=x onerror=alert(1)>",
     "Lưu đơn, sau đó mở lại chi tiết và in PDF"
    ],
    "expected": "Nội dung được escape/hiển thị như văn bản thuần; không thực thi script ở màn chi tiết hoặc bản in.",
    "evidence": [
     {
      "name": "TC-PRSC-021__s01__detail",
      "caption": "Payload XSS hiển thị dạng text đã escape",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-PRSC-022",
    "title": "Tạo và quản lý phiếu pha chế (CompoundingOrders) thành công",
    "category": "happy",
    "priority": "P1",
    "role": "Dược sĩ pha chế",
    "preconditions": "Có quyền pha chế; có thuốc/hoạt chất để thêm thành phần.",
    "steps": [
     "Mở màn phiếu pha chế, tạo phiếu mới",
     "Thêm các thành phần (CompoundingOrderItems) với hàm lượng",
     "Lưu phiếu rồi chuyển trạng thái Hoàn thành pha chế"
    ],
    "expected": "Phiếu pha chế + thành phần lưu đúng; trạng thái chuyển hợp lệ; hiển thị trong danh sách phiếu.",
    "evidence": [
     {
      "name": "TC-PRSC-022__s01__modal",
      "caption": "Modal tạo phiếu pha chế + thành phần",
      "uiState": "modal"
     },
     {
      "name": "TC-PRSC-022__s02__success",
      "caption": "Phiếu pha chế hoàn thành",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#251"
    ],
    "notes": "Grounded tables: CompoundingOrders/CompoundingOrderItems/IUMedicineConfigs."
   },
   {
    "id": "TC-PRSC-023",
    "title": "Cấu hình thuốc IU (IUMedicineConfigs) áp dụng đúng khi pha chế/kê",
    "category": "data-consistency",
    "priority": "P2",
    "role": "Dược sĩ pha chế",
    "preconditions": "Có IUMedicineConfigs cho 1 thuốc dạng IU (đơn vị quốc tế).",
    "steps": [
     "Thêm thuốc dạng IU vào phiếu pha chế / đơn",
     "Nhập liều theo IU và kiểm tra quy đổi/hiển thị đơn vị"
    ],
    "expected": "Đơn vị IU và hệ số quy đổi áp đúng theo cấu hình; tính toán liều/hàm lượng nhất quán giữa kê và pha chế.",
    "evidence": [
     {
      "name": "TC-PRSC-023__s01__form",
      "caption": "Nhập liều theo cấu hình IU",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-024",
    "title": "CRUD mẫu đơn và thư viện lời dặn (template management)",
    "category": "happy",
    "priority": "P2",
    "role": "Dược sĩ / Bác sĩ quản lý mẫu",
    "preconditions": "Có quyền quản lý mẫu đơn/lời dặn.",
    "steps": [
     "Tạo mẫu đơn mới + thêm dòng thuốc mẫu, lưu",
     "Sửa tên mẫu và 1 dòng, lưu",
     "Xóa mẫu vừa tạo và 1 lời dặn"
    ],
    "expected": "Tạo/sửa/xóa mẫu đơn và lời dặn thành công; thay đổi phản ánh khi áp mẫu ở trình kê đơn; xóa có xác nhận.",
    "evidence": [
     {
      "name": "TC-PRSC-024__s01__modal",
      "caption": "Modal tạo/sửa mẫu đơn",
      "uiState": "modal"
     },
     {
      "name": "TC-PRSC-024__s02__confirm",
      "caption": "Xác nhận xóa mẫu/lời dặn",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-025",
    "title": "Trạng thái UI: empty / loading / error của danh sách đơn",
    "category": "ui",
    "priority": "P1",
    "role": "Bác sĩ / Dược sĩ",
    "preconditions": "Có thể tạo bộ lọc không trả kết quả; có thể giả lập lỗi API (chặn mạng).",
    "steps": [
     "Mở /v2/prescription khi đang tải dữ liệu (quan sát loading)",
     "Lọc với từ khóa không khớp để thấy empty",
     "Chặn API rồi reload để thấy error state"
    ],
    "expected": "Hiển thị skeleton/loading khi tải; empty state có thông điệp khi không có đơn; error state có thông báo + nút thử lại, không trắng trang.",
    "evidence": [
     {
      "name": "TC-PRSC-025__s01__loading",
      "caption": "Trạng thái đang tải danh sách",
      "uiState": "loading"
     },
     {
      "name": "TC-PRSC-025__s02__empty",
      "caption": "Empty state khi không có đơn",
      "uiState": "empty"
     },
     {
      "name": "TC-PRSC-025__s03__error",
      "caption": "Error state khi API lỗi",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-026",
    "title": "Dark/light parity và format số/tiền/ngày trên danh sách + chi tiết đơn",
    "category": "ui",
    "priority": "P2",
    "role": "Bác sĩ / Dược sĩ",
    "preconditions": "Có vài đơn với giá tiền và ngày.",
    "steps": [
     "Mở /v2/prescription ở light mode, kiểm tra format ngày DD/MM/YYYY và tiền VND",
     "Bật dark mode ở topbar v2, kiểm tra lại danh sách + drawer chi tiết",
     "Kiểm tra StatusBadge, bảng, contrast ở cả 2 theme"
    ],
    "expected": "Tương phản đạt ở cả light/dark; không có chữ chìm/nền sai màu; ngày định dạng DD/MM/YYYY, tiền định dạng VND, số lượng căn phải; bố cục không vỡ.",
    "evidence": [
     {
      "name": "TC-PRSC-026__s01__list",
      "caption": "Danh sách đơn light mode",
      "uiState": "list"
     },
     {
      "name": "TC-PRSC-026__s02__list",
      "caption": "Danh sách đơn dark mode",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-027",
    "title": "In PDF đơn thuốc đúng nội dung và liên thông Đơn thuốc QG (integration)",
    "category": "integration",
    "priority": "P1",
    "role": "Bác sĩ khám",
    "preconditions": "Có đơn đã ký số; cấu hình cổng Đơn thuốc QG (mock dev cho phép).",
    "steps": [
     "Tại danh sách, chọn đơn và bấm In PDF",
     "Kiểm tra nội dung PDF (BN, thuốc, liều, lời dặn, BS, ngày)",
     "Đẩy đơn lên cổng Đơn thuốc QG (nếu có nút)"
    ],
    "expected": "PDF mở đúng nội dung tiếng Việt có dấu; gửi cổng QG trả trạng thái Submitted/Acknowledged (mock) và lưu mã liên thông; lỗi gửi hiển thị thông báo.",
    "evidence": [
     {
      "name": "TC-PRSC-027__s01__detail",
      "caption": "PDF đơn thuốc",
      "uiState": "detail"
     },
     {
      "name": "TC-PRSC-027__s02__success",
      "caption": "Gửi cổng Đơn thuốc QG thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#241"
    ],
    "notes": "Grounded national RELATED_X gồm presc."
   },
   {
    "id": "TC-PRSC-028",
    "title": "Phát thuốc nội trú theo y lệnh, khoa/ngày (Inpatient Dispensing)",
    "category": "happy",
    "priority": "P1",
    "role": "Dược sĩ kho nội trú",
    "preconditions": "Có bệnh nhân nội trú với y lệnh thuốc trong ngày.",
    "steps": [
     "Vào /v2/inpatient-dispensing",
     "Lọc theo khoa và ngày hiện tại",
     "Chọn các y lệnh và Phát theo lô"
    ],
    "expected": "Hiển thị đúng y lệnh thuốc nội trú theo khoa/ngày; phát theo lô cập nhật trạng thái và trừ tồn; phản ánh vào viện phí nội trú.",
    "evidence": [
     {
      "name": "TC-PRSC-028__s01__filter",
      "caption": "Lọc y lệnh theo khoa/ngày",
      "uiState": "filter"
     },
     {
      "name": "TC-PRSC-028__s02__success",
      "caption": "Phát thuốc nội trú theo lô thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PRSC-029",
    "title": "Đồng bộ trạng thái khi 2 người thao tác cùng đơn (concurrency/state)",
    "category": "state",
    "priority": "P2",
    "role": "Dược sĩ A và B",
    "preconditions": "Một đơn đang chờ duyệt; mở trên 2 phiên/2 tab.",
    "steps": [
     "Tab A duyệt đơn",
     "Tab B (chưa refresh) bấm duyệt/từ chối cùng đơn đó"
    ],
    "expected": "Hành động thứ hai bị chặn với thông báo trạng thái đã thay đổi (locked/stale); không double-process; trạng thái cuối nhất quán.",
    "evidence": [
     {
      "name": "TC-PRSC-029__s01__error",
      "caption": "Chặn thao tác trên đơn đã đổi trạng thái",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#251"
    ]
   }
  ],
  "ui_state_checklist": [
   "list — danh sách đơn thuốc với StatusTabs",
   "form — trình kê đơn (dòng thuốc, liều, lời dặn)",
   "detail — chi tiết đơn / PDF / dòng viện phí",
   "drawer — drawer chi tiết duyệt/phát",
   "modal — tạo mẫu đơn / lý do từ chối / phiếu pha chế",
   "dropdown — chọn thuốc / mẫu đơn / lời dặn",
   "filter — lọc khoa/ngày phát thuốc nội trú",
   "validation — báo lỗi field bắt buộc/range/khoảng hiệu lực",
   "empty — danh sách rỗng",
   "loading — skeleton tải dữ liệu",
   "error — cảnh báo tương tác/dị ứng/tồn kho/403/IDOR/stale",
   "confirm — xác nhận hủy/xóa/rời trang",
   "success — toast lưu/duyệt/phát thành công",
   "toast — thông báo nhanh",
   "permission — nút/menu ẩn-disable theo vai trò",
   "dark/light parity — kiểm tra ở cả 2 theme"
  ],
  "gaps": [
   "data.js NOTES['presc'] rất ngắn — chưa nêu rõ các trạng thái chính thức của đơn (Draft/Pending/Approved/Rejected/Dispensed/Cancelled/Locked); cần xác nhận state machine thực tế trong backend để hoàn thiện các case state.",
   "Chưa rõ quy tắc hoàn trả thuốc đã phát (return/reverse StockMovement) — cần test luồng hoàn trả và tác động ngược viện phí.",
   "Liều theo cân nặng/tuổi (nhi khoa) và liều tối đa/ngày chưa được đề cập — nên bổ sung validation liều an toàn theo bệnh nhân.",
   "Tương tác thuốc-thức ăn, trùng hoạt chất (duplicate therapy), và cảnh báo liều tích lũy chưa có case riêng — chỉ mới phủ DrugInteraction cặp thuốc.",
   "Quy tắc kê thuốc gây nghiện/hướng thần (đơn N/H, sổ theo dõi đặc biệt) chưa rõ — cần xác nhận có nghiệp vụ này không để thêm case kiểm soát chặt.",
   "Ngưỡng BHYT cho thuốc ngoài danh mục / vượt trần / cần phê duyệt trước chưa có case — liên quan billing/insurance.",
   "Chưa rõ matrix #216 ánh xạ vai trò cụ thể (bác sĩ vs dược sĩ lâm sàng vs dược sĩ phát vs điều dưỡng) — cần bảng quyền chính xác để cụ thể hóa permission tests.",
   "Hành vi khi MedicalRecord bị khóa (IsClosed billing / EmrFinalizedAt) đối với việc sửa/kê thêm đơn chưa được kiểm — cần case chặn kê khi hồ sơ đã khóa."
  ]
 },
 {
  "id": "ipd",
  "code": "IPD",
  "layer": "clin",
  "ic": "🛏️",
  "nm": "Nội trú (IPD)",
  "gh": [
   "#239",
   "#242",
   "#243"
  ],
  "gap": false,
  "module_id": "ipd",
  "ui_state_checklist": [
   "list",
   "empty",
   "loading",
   "error",
   "detail",
   "drawer",
   "modal",
   "form",
   "validation",
   "filter",
   "dropdown",
   "confirm",
   "success",
   "toast",
   "permission",
   "tab"
  ],
  "gaps": [
   "Concurrency rang buoc trung giuong khi 2 user thao tac song song, can test optimistic locking.",
   "Modal Nhap vien nhap tay Ma phong/giuong/BS dang UUID, thieu validate ton tai va thieu picker.",
   "Doi chieu nhom mau hien chi la banner tinh, chua thay BE so khop nhom mau BN truoc truyen.",
   "Tuong tac/chong chi dinh thuoc khi ke don noi tru/toa ve chua ro co canh bao chan khong.",
   "Audit log moi mutation can xac minh ghi dung nguoi that (khac Guid.Empty).",
   "IDOR xem ho so/6556/sinh hieu cua admissionId BN khac qua API truc tiep.",
   "XSS o field ghi chu tu do khi render lai hoac in.",
   "Ra vien khi chua du dieu kien van cho phep, can xac dinh quyen duyet vuot rao.",
   "Trang thai Admission can test chan thao tac tren BN da xuat vien.",
   "Ban giao ca dieu duong hien chi dieu huong sang /v2/hr, chua ro man that.",
   "Nhat quan so tien xuyen phan he chi phi den 6556 den vien phi den BHYT.",
   "Dark/light parity va format tien/ngay tren bang ke 6556 va bieu do recharts."
  ],
  "screens": [
   {
    "name": "So do giuong",
    "desc": "Tab mac dinh /v2/ipd grid card giuong theo khoa, KPI Tong giuong/Co BN/Trong/Canh bao/TB ngay nam, click giuong mo drawer.",
    "route_guess": "/v2/ipd",
    "elements": [
     "KpiStrip",
     "TopTabs 4 tab",
     "SearchBox",
     "Filter Khoa",
     "Filter Trang thai giuong",
     "Btn Nhap vien",
     "Grid card giuong",
     "Bed DrawerShell"
    ]
   },
   {
    "name": "Danh sach benh nhan noi tru",
    "desc": "Tab list DataTable BN noi tru voi chip canh bao Y lenh/CLS/Thuoc/No va trang thai; row click mo drawer ho so.",
    "route_guess": "/v2/ipd tab list",
    "elements": [
     "DataTable 7 cot",
     "Chip canh bao",
     "StatusBadge",
     "Pager",
     "Patient DrawerShell"
    ]
   },
   {
    "name": "Drawer ho so BN va Theo doi dieu tri",
    "desc": "Drawer section BN/Dieu tri/Canh bao va TreatmentMonitorSection (sinh hieu, chuyen khoa, suat an, truyen dich, truyen mau, 6556, hoan tra thuoc, toa ve, CLS, ke don) va Newborn va Hemodialysis.",
    "route_guess": "/v2/ipd drawer",
    "elements": [
     "rec-section",
     "Nut Sinh hieu",
     "Nut Chuyen khoa",
     "Nut Truyen dich",
     "Nut Truyen mau",
     "Nut 6556",
     "Nut Ra vien"
    ]
   },
   {
    "name": "Modal Nhap vien",
    "desc": "ModalShell chon BN cho nhap vien tu OPD hoac nhap tay; field Ma HSBA, Khoa, Ma phong, Ma giuong, Loai nhap vien, Chan doan, Ma BS, Ly do.",
    "route_guess": "/v2/ipd modal",
    "elements": [
     "Select BN cho",
     "Input Ma HSBA",
     "Select Khoa",
     "Input Ma phong",
     "Select Loai nhap vien",
     "Input Ma BS",
     "Btn Nhap vien"
    ]
   },
   {
    "name": "Modal Sinh hieu",
    "desc": "ModalShell form Thoi diem va 9 chi so sinh hieu co min/max va bieu do xu huong 7 ngay theo metric.",
    "route_guess": "/v2/ipd drawer modal",
    "elements": [
     "DatePicker Thoi diem",
     "InputNumber chi so",
     "Select metric",
     "LineChart 7 ngay",
     "empty Chua co du lieu"
    ]
   },
   {
    "name": "Modal Chuyen khoa Truyen dich Truyen mau Suat an",
    "desc": "Nhom modal dieu tri: chuyen khoa, truyen dich (uoc tinh phut), truyen mau (banner doi chieu nhom mau an toan), suat an.",
    "route_guess": "/v2/ipd drawer modal",
    "elements": [
     "Select Khoa dich",
     "Form truyen dich",
     "Form truyen mau banner an toan",
     "Select bua an"
    ]
   },
   {
    "name": "Modal Ra vien Tong ket benh an",
    "desc": "ModalShell kiem tra dieu kien ra vien (BHYT, no, thuoc, CLS, HSBA) va form ra vien (loai 1-4, tinh trang 1-5, chan doan, tom tat). In ra vien/6556/chuyen vien, huy ra vien.",
    "route_guess": "/v2/ipd drawer modal",
    "elements": [
     "Khoi kiem tra dieu kien",
     "Select loai ra vien",
     "Input chan doan ra vien",
     "Btn In ra vien",
     "Btn Huy ra vien",
     "Btn Xac nhan ra vien"
    ]
   },
   {
    "name": "Bang ke chi phi KCB 6556",
    "desc": "ModalShell header BN/BHYT, bang khoan muc (SL, don gia, thanh tien, BHYT, BN tra), tong hop tien va con phai thu, nut In.",
    "route_guess": "/v2/ipd drawer modal",
    "elements": [
     "Header BN",
     "Bang khoan muc",
     "Khoi tong hop tien",
     "Btn In bang ke",
     "empty can xuat vien truoc"
    ]
   },
   {
    "name": "Luu theo doi Observation Stay",
    "desc": "Man /v2/observation-stay BN cap cuu luu theo doi truoc khi quyet dinh nhap vien hoac cho ve.",
    "route_guess": "/v2/observation-stay",
    "elements": [
     "Danh sach BN luu theo doi",
     "Ghi sinh hieu",
     "Quyet dinh nhap vien/cho ve"
    ]
   },
   {
    "name": "Y lenh noi tru Cap phat",
    "desc": "Man /v2/inpatient-dispensing thuc hien y lenh thuoc noi tru, linh va cap phat theo tu truc.",
    "route_guess": "/v2/inpatient-dispensing",
    "elements": [
     "Danh sach y lenh cho",
     "Cap phat thuoc"
    ]
   },
   {
    "name": "Hoi chan noi tru",
    "desc": "Tab Hoi chan trong /v2/ipd list, tao, hoan thanh, in bien ban hoi chan.",
    "route_guess": "/v2/ipd tab consult",
    "elements": [
     "List phieu hoi chan",
     "Tao hoi chan",
     "In bien ban"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-IPD-001",
    "title": "Nhap vien tu BN cho o phong kham (luong chinh)",
    "category": "happy",
    "priority": "P0",
    "role": "Bac si/Dieu duong noi tru",
    "preconditions": "Da dang nhap admin/Admin@123; co BN duoc OPD chi dinh nhap vien; o /v2/ipd.",
    "steps": [
     "Mo /v2/ipd",
     "Bam nut Nhap vien",
     "Chon BN cho nhap vien, kiem tra auto-fill",
     "Nhap Ma phong, Ma giuong, Ma BS",
     "Bam Nhap vien"
    ],
    "expected": "Toast Da nhap vien thanh cong; reload; BN hien o giuong va danh sach trang thai Dang dieu tri.",
    "evidence": [
     {
      "name": "TC-IPD-001__s01__form",
      "caption": "Modal nhap vien auto-fill",
      "uiState": "form"
     },
     {
      "name": "TC-IPD-001__s02__dropdown",
      "caption": "Dropdown chon BN cho",
      "uiState": "dropdown"
     },
     {
      "name": "TC-IPD-001__s03__success",
      "caption": "Toast nhap vien thanh cong",
      "uiState": "success"
     },
     {
      "name": "TC-IPD-001__s04__list",
      "caption": "BN moi o danh sach",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-IPD-002",
    "title": "Nhap vien vao giuong trong tu so do giuong",
    "category": "happy",
    "priority": "P1",
    "role": "Dieu duong noi tru",
    "preconditions": "Tab So do giuong; co giuong Trong.",
    "steps": [
     "Tim 1 giuong Trong",
     "Click card giuong trong mo drawer",
     "Bam Nhap vien vao giuong nay",
     "Kiem tra prefill",
     "Nhap Ma HSBA va Ma BS, bam Nhap vien"
    ],
    "expected": "Khoa/phong/giuong dien san; nhap vien thanh cong; giuong chuyen Co benh nhan.",
    "evidence": [
     {
      "name": "TC-IPD-002__s01__drawer",
      "caption": "Bed drawer giuong trong",
      "uiState": "drawer"
     },
     {
      "name": "TC-IPD-002__s02__form",
      "caption": "Modal prefill giuong",
      "uiState": "form"
     },
     {
      "name": "TC-IPD-002__s03__success",
      "caption": "Giuong doi Co benh nhan",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-IPD-003",
    "title": "Nhap vien thieu field bat buoc bi chan",
    "category": "validation",
    "priority": "P0",
    "role": "Dieu duong noi tru",
    "preconditions": "Mo modal Nhap vien rong.",
    "steps": [
     "De trong tat ca bam Nhap vien",
     "Nhap Ma HSBA de trong Khoa bam Nhap vien",
     "Chon Khoa de trong Ma phong bam Nhap vien",
     "Nhap Ma phong de trong Ma BS bam Nhap vien"
    ],
    "expected": "Lan luot warning Nhap ma HSBA, Chon khoa, Nhap ma phong, Nhap ma BS; khong goi API.",
    "evidence": [
     {
      "name": "TC-IPD-003__s01__validation",
      "caption": "Canh bao thieu Ma HSBA",
      "uiState": "validation"
     },
     {
      "name": "TC-IPD-003__s02__validation",
      "caption": "Canh bao thieu Khoa/phong/BS",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#242"
    ]
   },
   {
    "id": "TC-IPD-004",
    "title": "Nhap vien voi Ma khong ton tai",
    "category": "negative",
    "priority": "P1",
    "role": "Dieu duong noi tru",
    "preconditions": "Mo modal Nhap vien, khong chon BN cho.",
    "steps": [
     "Nhap Ma HSBA = KHONG-TON-TAI",
     "Chon Khoa hop le",
     "Nhap Ma phong va Ma BS gia",
     "Bam Nhap vien"
    ],
    "expected": "API tra loi; toast Nhap vien that bai; khong tao Admission.",
    "evidence": [
     {
      "name": "TC-IPD-004__s01__form",
      "caption": "Form ma khong hop le",
      "uiState": "form"
     },
     {
      "name": "TC-IPD-004__s02__error",
      "caption": "Toast that bai",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#242"
    ]
   },
   {
    "id": "TC-IPD-005",
    "title": "Huy giua chung khi dang nhap vien",
    "category": "negative",
    "priority": "P2",
    "role": "Dieu duong noi tru",
    "preconditions": "Mo modal Nhap vien va dien mot phan.",
    "steps": [
     "Dien Ma HSBA va Khoa",
     "Bam Huy",
     "Mo lai modal"
    ],
    "expected": "Modal dong khong goi API; mo lai form rong; khong co Admission moi.",
    "evidence": [
     {
      "name": "TC-IPD-005__s01__form",
      "caption": "Form dien do",
      "uiState": "form"
     },
     {
      "name": "TC-IPD-005__s02__modal",
      "caption": "Mo lai reset rong",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#242"
    ]
   },
   {
    "id": "TC-IPD-006",
    "title": "So do giuong loading va empty",
    "category": "ui",
    "priority": "P1",
    "role": "Dieu duong",
    "preconditions": "Tab So do giuong.",
    "steps": [
     "Reload quan sat loading",
     "Dat Filter khong khop",
     "Quan sat noi dung"
    ],
    "expected": "Hien loading; khong khop hien empty Khong co giuong phu hop; KPI tinh dung.",
    "evidence": [
     {
      "name": "TC-IPD-006__s01__loading",
      "caption": "Dang tai so do giuong",
      "uiState": "loading"
     },
     {
      "name": "TC-IPD-006__s02__empty",
      "caption": "Empty khong co giuong",
      "uiState": "empty"
     },
     {
      "name": "TC-IPD-006__s03__filter",
      "caption": "Bo loc khoa va trang thai",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#243"
    ]
   },
   {
    "id": "TC-IPD-007",
    "title": "Loc va tim kiem danh sach BN noi tru",
    "category": "happy",
    "priority": "P1",
    "role": "Dieu duong",
    "preconditions": "Tab Danh sach BN co nhieu BN.",
    "steps": [
     "Chuyen tab Danh sach BN",
     "Nhap tu khoa",
     "Chon Filter Khoa",
     "Bam Bo loc"
    ],
    "expected": "Bang loc dung theo ten/ma/khoa; so dem cap nhat; Bo loc khoi phuc.",
    "evidence": [
     {
      "name": "TC-IPD-007__s01__list",
      "caption": "Danh sach BN",
      "uiState": "list"
     },
     {
      "name": "TC-IPD-007__s02__filter",
      "caption": "Da loc",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#243"
    ]
   },
   {
    "id": "TC-IPD-008",
    "title": "Danh sach BN rong empty state",
    "category": "ui",
    "priority": "P2",
    "role": "Dieu duong",
    "preconditions": "Tab Danh sach BN loc toi khong co BN.",
    "steps": [
     "Chuyen tab Danh sach BN",
     "Nhap tu khoa khong khop",
     "Quan sat bang"
    ],
    "expected": "Empty Khong co benh nhan noi tru; footer Tong 0 BN.",
    "evidence": [
     {
      "name": "TC-IPD-008__s01__empty",
      "caption": "Empty danh sach BN",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#243"
    ]
   },
   {
    "id": "TC-IPD-009",
    "title": "Ghi nhan sinh hieu va bieu do 7 ngay",
    "category": "happy",
    "priority": "P0",
    "role": "Dieu duong",
    "preconditions": "Mo drawer 1 BN dang dieu tri, mo modal Sinh hieu.",
    "steps": [
     "Chon Thoi diem",
     "Nhap Nhiet do 37.5 Mach 80 SpO2 98 HA 120/80",
     "Bam Luu sinh hieu",
     "Mo lai doi metric sang HA"
    ],
    "expected": "Toast Da ghi nhan sinh hieu; bieu do hien diem moi; doi metric doi duong.",
    "evidence": [
     {
      "name": "TC-IPD-009__s01__form",
      "caption": "Form sinh hieu",
      "uiState": "form"
     },
     {
      "name": "TC-IPD-009__s02__success",
      "caption": "Toast ghi sinh hieu",
      "uiState": "success"
     },
     {
      "name": "TC-IPD-009__s03__tab",
      "caption": "Bieu do metric BP",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-IPD-010",
    "title": "Sinh hieu gia tri bien va ngoai khoang",
    "category": "edge",
    "priority": "P1",
    "role": "Dieu duong",
    "preconditions": "Mo modal Sinh hieu.",
    "steps": [
     "Thu Nhiet do duoi 35 va tren 42",
     "Thu Mach 0 va 250",
     "Thu SpO2 tren 100",
     "Nhap bo bien hop le va luu"
    ],
    "expected": "InputNumber kep ve min-max; bien hop le luu duoc; de trong Thoi diem hien warning.",
    "evidence": [
     {
      "name": "TC-IPD-010__s01__validation",
      "caption": "Gia tri ngoai khoang bi chan",
      "uiState": "validation"
     },
     {
      "name": "TC-IPD-010__s02__form",
      "caption": "Gia tri bien hop le",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#242"
    ]
   },
   {
    "id": "TC-IPD-011",
    "title": "Sinh hieu empty khi chua co du lieu",
    "category": "ui",
    "priority": "P2",
    "role": "Dieu duong",
    "preconditions": "Mo modal Sinh hieu BN vua nhap vien.",
    "steps": [
     "Mo modal Sinh hieu",
     "Quan sat vung bieu do"
    ],
    "expected": "Hien Dang tai roi Chua co du lieu sinh hieu; form van cho nhap.",
    "evidence": [
     {
      "name": "TC-IPD-011__s01__loading",
      "caption": "Dang tai bieu do",
      "uiState": "loading"
     },
     {
      "name": "TC-IPD-011__s02__empty",
      "caption": "Chua co du lieu",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#243"
    ]
   },
   {
    "id": "TC-IPD-012",
    "title": "Chuyen khoa hop le",
    "category": "happy",
    "priority": "P0",
    "role": "Bac si dieu tri",
    "preconditions": "Mo drawer 1 BN, mo modal Chuyen khoa.",
    "steps": [
     "Chon Khoa chuyen den",
     "Nhap phong giuong BS tiep nhan",
     "Nhap ly do va tom tat",
     "Bam Xac nhan chuyen khoa"
    ],
    "expected": "Toast Chuyen khoa thanh cong; BN o khoa moi; giuong cu giai phong.",
    "evidence": [
     {
      "name": "TC-IPD-012__s01__form",
      "caption": "Form chuyen khoa",
      "uiState": "form"
     },
     {
      "name": "TC-IPD-012__s02__success",
      "caption": "Toast thanh cong",
      "uiState": "success"
     },
     {
      "name": "TC-IPD-012__s03__list",
      "caption": "BN o khoa moi",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-IPD-013",
    "title": "Chuyen khoa thieu truong bi chan",
    "category": "validation",
    "priority": "P1",
    "role": "Bac si dieu tri",
    "preconditions": "Mo modal Chuyen khoa.",
    "steps": [
     "Bam Xac nhan khi rong",
     "Chon Khoa de trong phong xac nhan",
     "Nhap phong de trong BS xac nhan"
    ],
    "expected": "Lan luot warning Chon khoa, Nhap ma phong, Nhap ma BS tiep nhan.",
    "evidence": [
     {
      "name": "TC-IPD-013__s01__validation",
      "caption": "Canh bao thieu truong",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#242"
    ]
   },
   {
    "id": "TC-IPD-014",
    "title": "Truyen dich nhap hop le va uoc tinh thoi gian",
    "category": "happy",
    "priority": "P1",
    "role": "Dieu duong",
    "preconditions": "Mo modal Truyen dich.",
    "steps": [
     "Nhap Ten dich",
     "Nhap The tich 500 Toc do 40",
     "Quan sat uoc tinh",
     "Bam Ghi nhan"
    ],
    "expected": "Uoc tinh khoang 250 phut; toast Da ghi nhan truyen dich.",
    "evidence": [
     {
      "name": "TC-IPD-014__s01__form",
      "caption": "Form truyen dich uoc tinh",
      "uiState": "form"
     },
     {
      "name": "TC-IPD-014__s02__success",
      "caption": "Toast ghi truyen dich",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-IPD-015",
    "title": "Truyen dich the tich/toc do 0 hoac am bi chan",
    "category": "edge",
    "priority": "P1",
    "role": "Dieu duong",
    "preconditions": "Mo modal Truyen dich.",
    "steps": [
     "De trong Ten dich Ghi nhan",
     "De The tich 0 Ghi nhan",
     "De Toc do 0 Ghi nhan"
    ],
    "expected": "Lan luot warning Nhap ten dich, Nhap the tich, Nhap toc do; min=1 chan 0/am.",
    "evidence": [
     {
      "name": "TC-IPD-015__s01__validation",
      "caption": "Canh bao gia tri khong hop le",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#242"
    ]
   },
   {
    "id": "TC-IPD-016",
    "title": "Truyen mau hop le va banner an toan",
    "category": "happy",
    "priority": "P0",
    "role": "Bac si/Dieu duong",
    "preconditions": "Mo modal Truyen mau.",
    "steps": [
     "Quan sat banner doi chieu nhom mau",
     "Chon Nhom mau Rh Che pham So tui The tich",
     "Bam Ghi nhan"
    ],
    "expected": "Banner hien ro; toast Da ghi nhan truyen mau; ban ghi luu dung.",
    "evidence": [
     {
      "name": "TC-IPD-016__s01__form",
      "caption": "Form truyen mau banner",
      "uiState": "form"
     },
     {
      "name": "TC-IPD-016__s02__success",
      "caption": "Toast ghi truyen mau",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-IPD-017",
    "title": "Truyen mau nhom mau lech ho so BN",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bac si",
    "preconditions": "BN co nhom mau trong ho so; mo modal Truyen mau.",
    "steps": [
     "Nhap nhom mau khac ho so BN",
     "Bam Ghi nhan",
     "Quan sat co chan khong",
     "Doi chieu audit"
    ],
    "expected": "He thong phai canh bao/chan truyen sai nhom mau; neu chi banner tinh thi tao task fix.",
    "evidence": [
     {
      "name": "TC-IPD-017__s01__form",
      "caption": "Nhap nhom mau lech",
      "uiState": "form"
     },
     {
      "name": "TC-IPD-017__s02__error",
      "caption": "Canh bao truyen sai nhom",
      "uiState": "error"
     }
    ],
    "notes": "NOTES blood doi chieu nhom mau/Rh truoc truyen.",
    "refIssues": [
     "#239",
     "#216"
    ]
   },
   {
    "id": "TC-IPD-018",
    "title": "Chi dinh suat an hop le",
    "category": "happy",
    "priority": "P2",
    "role": "Dieu duong/Dinh duong",
    "preconditions": "Mo modal Suat an.",
    "steps": [
     "Chon Ngay",
     "Chon Bua trua Muc An kieng",
     "Nhap yeu cau dac biet",
     "Bam Chi dinh"
    ],
    "expected": "Toast Da chi dinh suat an; ban ghi dung bua/muc.",
    "evidence": [
     {
      "name": "TC-IPD-018__s01__form",
      "caption": "Form suat an",
      "uiState": "form"
     },
     {
      "name": "TC-IPD-018__s02__success",
      "caption": "Toast chi dinh suat an",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-IPD-019",
    "title": "Ra vien luong chinh va kiem tra dieu kien",
    "category": "happy",
    "priority": "P0",
    "role": "Bac si dieu tri",
    "preconditions": "BN du dieu kien; mo modal Ra vien.",
    "steps": [
     "Quan sat khoi kiem tra dieu kien",
     "De loai Ra vien tinh trang Khoi",
     "Kiem tra chan doan prefill",
     "Bam Xac nhan ra vien"
    ],
    "expected": "Khoi kiem tra hien Du dieu kien; toast Da hoan tat ra vien; BN Da xuat vien; giuong giai phong.",
    "evidence": [
     {
      "name": "TC-IPD-019__s01__modal",
      "caption": "Khoi kiem tra dieu kien",
      "uiState": "modal"
     },
     {
      "name": "TC-IPD-019__s02__form",
      "caption": "Form ra vien prefill",
      "uiState": "form"
     },
     {
      "name": "TC-IPD-019__s03__success",
      "caption": "Toast hoan tat ra vien",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-IPD-020",
    "title": "Ra vien thieu chan doan bi chan",
    "category": "validation",
    "priority": "P1",
    "role": "Bac si dieu tri",
    "preconditions": "Mo modal Ra vien.",
    "steps": [
     "Xoa trang Chan doan ra vien",
     "Bam Xac nhan ra vien"
    ],
    "expected": "Warning Nhap chan doan ra vien; khong goi API.",
    "evidence": [
     {
      "name": "TC-IPD-020__s01__validation",
      "caption": "Canh bao thieu chan doan",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#242"
    ]
   },
   {
    "id": "TC-IPD-021",
    "title": "Ra vien loai Chuyen vien va in giay chuyen vien",
    "category": "state",
    "priority": "P1",
    "role": "Bac si dieu tri",
    "preconditions": "Mo modal Ra vien.",
    "steps": [
     "Chon loai Chuyen vien",
     "Quan sat field Chuyen den va nut In",
     "Xac nhan khi de trong Chuyen den",
     "Nhap co so va in giay chuyen vien",
     "Xac nhan ra vien"
    ],
    "expected": "Hien field rieng; de trong Chuyen den warning; in mo blob; xac nhan ghi DischargeType=2.",
    "evidence": [
     {
      "name": "TC-IPD-021__s01__form",
      "caption": "Form ra vien chuyen vien",
      "uiState": "form"
     },
     {
      "name": "TC-IPD-021__s02__validation",
      "caption": "Canh bao thieu co so chuyen den",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#242"
    ]
   },
   {
    "id": "TC-IPD-022",
    "title": "Huy ra vien co nhap ly do",
    "category": "state",
    "priority": "P1",
    "role": "Bac si/Truong khoa",
    "preconditions": "BN da ra vien; mo lai modal Ra vien.",
    "steps": [
     "Bam Huy ra vien",
     "De trong ly do va xac nhan",
     "Nhap ly do xac nhan"
    ],
    "expected": "Confirm hien o ly do; toast Da huy ra vien; BN tro lai Dang dieu tri.",
    "evidence": [
     {
      "name": "TC-IPD-022__s01__confirm",
      "caption": "Dialog xac nhan huy",
      "uiState": "confirm"
     },
     {
      "name": "TC-IPD-022__s02__success",
      "caption": "Toast da huy ra vien",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-IPD-023",
    "title": "Ra vien khi chua du dieu kien",
    "category": "negative",
    "priority": "P0",
    "role": "Bac si dieu tri",
    "preconditions": "BN con no hoac thuoc chua linh hoac KQ CLS cho; mo modal Ra vien.",
    "steps": [
     "Quan sat khoi kiem tra muc chua dat",
     "Doc ket luan dieu kien",
     "Thu bam Xac nhan ra vien"
    ],
    "expected": "Khoi kiem tra danh dau muc chua dat; ket luan Chua du dieu kien; xac dinh BE co chan/quyen duyet vuot rao.",
    "evidence": [
     {
      "name": "TC-IPD-023__s01__modal",
      "caption": "Khoi kiem tra muc chua dat",
      "uiState": "modal"
     },
     {
      "name": "TC-IPD-023__s02__error",
      "caption": "Canh bao chua du dieu kien",
      "uiState": "error"
     }
    ],
    "notes": "No tam ung phai kiem truoc ra vien.",
    "refIssues": [
     "#239",
     "#242"
    ]
   },
   {
    "id": "TC-IPD-024",
    "title": "Bang ke 6556 hien khoan muc va tong hop tien dung",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Ke toan vien phi/Bac si",
    "preconditions": "BN da phat sinh chi phi; mo modal Bang ke 6556.",
    "steps": [
     "Mo Bang ke 6556",
     "Doi chieu SL nhan don gia",
     "Doi chieu BHYT cong BN tra",
     "Doi chieu tong va con phai thu"
    ],
    "expected": "Moi dong khop; tong hop can doi; so tien dinh dang vi-VN; Con phai thu to dam.",
    "evidence": [
     {
      "name": "TC-IPD-024__s01__modal",
      "caption": "Bang ke 6556 khoan muc",
      "uiState": "modal"
     },
     {
      "name": "TC-IPD-024__s02__detail",
      "caption": "Khoi tong hop tien",
      "uiState": "detail"
     }
    ],
    "notes": "Chuoi data-consistency chi phi den 6556 den vien phi den BHYT.",
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-IPD-025",
    "title": "Bang ke 6556 in PDF va empty khi chua xuat vien",
    "category": "integration",
    "priority": "P2",
    "role": "Ke toan vien phi",
    "preconditions": "Mo modal Bang ke 6556.",
    "steps": [
     "BN chua xuat vien quan sat empty",
     "BN co du lieu bam In bang ke",
     "Quan sat blob PDF"
    ],
    "expected": "Khong co du lieu hien Chua co bang ke; co du lieu in mo blob; loi in toast In bang ke that bai.",
    "evidence": [
     {
      "name": "TC-IPD-025__s01__empty",
      "caption": "Empty bang ke",
      "uiState": "empty"
     },
     {
      "name": "TC-IPD-025__s02__loading",
      "caption": "Dang tai bang ke",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#243"
    ]
   },
   {
    "id": "TC-IPD-026",
    "title": "Hoan tra thuoc y lenh tao phieu hoan tra",
    "category": "happy",
    "priority": "P1",
    "role": "Dieu duong/Duoc",
    "preconditions": "BN da linh thuoc; mo modal Hoan tra thuoc.",
    "steps": [
     "Mo Hoan tra thuoc",
     "Tick chon thuoc dieu chinh SL tra",
     "Chon ly do Thua thuoc",
     "Bam Tao phieu hoan tra"
    ],
    "expected": "SL tra kep khong vuot da linh; toast Da tao phieu hoan tra cho duoc duyet; approvalType=5 dung.",
    "evidence": [
     {
      "name": "TC-IPD-026__s01__modal",
      "caption": "Modal hoan tra chon item",
      "uiState": "modal"
     },
     {
      "name": "TC-IPD-026__s02__success",
      "caption": "Toast tao phieu hoan tra",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-IPD-027",
    "title": "Hoan tra thuoc khong chon hoac BN chua linh",
    "category": "negative",
    "priority": "P2",
    "role": "Dieu duong",
    "preconditions": "Mo modal Hoan tra thuoc.",
    "steps": [
     "BN chua linh quan sat empty",
     "BN co thuoc nhung khong tick bam Tao phieu"
    ],
    "expected": "BN chua linh hien empty; khong chon warning Chon it nhat 1 thuoc.",
    "evidence": [
     {
      "name": "TC-IPD-027__s01__empty",
      "caption": "Empty khong co thuoc",
      "uiState": "empty"
     },
     {
      "name": "TC-IPD-027__s02__validation",
      "caption": "Canh bao chua chon thuoc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#242"
    ]
   },
   {
    "id": "TC-IPD-028",
    "title": "Don thuoc xuat vien toa ve hop le",
    "category": "happy",
    "priority": "P1",
    "role": "Bac si dieu tri",
    "preconditions": "Co kho thuoc; mo modal Toa ve.",
    "steps": [
     "Chon Kho thuoc",
     "Chon thuoc nhap SL lieu cach dung",
     "Them dong roi xoa",
     "Bam Luu don"
    ],
    "expected": "Toast Da luu don toa ve (DrugOrderType=4); them/xoa dong hoat dong.",
    "evidence": [
     {
      "name": "TC-IPD-028__s01__form",
      "caption": "Form toa ve",
      "uiState": "form"
     },
     {
      "name": "TC-IPD-028__s02__success",
      "caption": "Toast luu don toa ve",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-IPD-029",
    "title": "Toa ve thieu kho hoac khong chon thuoc",
    "category": "validation",
    "priority": "P2",
    "role": "Bac si dieu tri",
    "preconditions": "Mo modal Toa ve.",
    "steps": [
     "Khong chon kho Luu don",
     "Chon kho de dong thuoc trong Luu don"
    ],
    "expected": "Warning Chon kho thuoc roi Chon it nhat 1 thuoc.",
    "evidence": [
     {
      "name": "TC-IPD-029__s01__validation",
      "caption": "Canh bao thieu kho/thuoc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#242"
    ]
   },
   {
    "id": "TC-IPD-030",
    "title": "Ky tu dac biet va tieng Viet va chuoi dai o ghi chu",
    "category": "edge",
    "priority": "P2",
    "role": "Dieu duong/Bac si",
    "preconditions": "Mo modal co TextArea ghi chu.",
    "steps": [
     "Nhap tieng Viet co dau emoji ky tu dac biet",
     "Nhap chuoi tren 1000 ky tu",
     "Luu va mo lai"
    ],
    "expected": "Hien thi dung tieng Viet khong vo layout; ky tu dac biet escape khong XSS; chuoi dai khong crash.",
    "evidence": [
     {
      "name": "TC-IPD-030__s01__form",
      "caption": "Nhap ghi chu dac biet",
      "uiState": "form"
     },
     {
      "name": "TC-IPD-030__s02__detail",
      "caption": "Hien thi lai an toan",
      "uiState": "detail"
     }
    ],
    "notes": "Kiem XSS field tu do.",
    "refIssues": [
     "#242",
     "#216"
    ]
   },
   {
    "id": "TC-IPD-031",
    "title": "Phan quyen vai tro khong du quyen bi chan",
    "category": "permission",
    "priority": "P0",
    "role": "Vai tro han che",
    "preconditions": "Dang nhap tai khoan khong co quyen noi tru.",
    "steps": [
     "Truy cap /v2/ipd",
     "Quan sat nut Nhap vien/Chuyen khoa/Ra vien",
     "Goi truc tiep API mutation"
    ],
    "expected": "Nut bi an/disabled; API tra 403; khong thuc hien duoc mutation.",
    "evidence": [
     {
      "name": "TC-IPD-031__s01__permission",
      "caption": "Nut bi an/disabled",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-IPD-032",
    "title": "IDOR truy cap admission BN khac",
    "category": "security",
    "priority": "P0",
    "role": "Nguoi dung dang nhap",
    "preconditions": "Co token; biet admissionId BN khoa khac.",
    "steps": [
     "Lay admissionId BN A",
     "Goi API 6556/sinh hieu/prescriptions voi admissionId BN B",
     "Quan sat phan hoi"
    ],
    "expected": "He thong chan truy cap cheo (403/404); neu tra du lieu thi bug IDOR tao task fix.",
    "evidence": [
     {
      "name": "TC-IPD-032__s01__error",
      "caption": "API chan truy cap BN khac",
      "uiState": "error"
     }
    ],
    "notes": "Patient-safety va bao mat ho so.",
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-IPD-033",
    "title": "Chan thao tac tren BN da xuat vien",
    "category": "state",
    "priority": "P1",
    "role": "Dieu duong/Bac si",
    "preconditions": "Co BN da xuat vien.",
    "steps": [
     "Mo drawer BN da xuat vien",
     "Thu ghi sinh hieu/chuyen khoa/y lenh",
     "Quan sat phan hoi"
    ],
    "expected": "Thao tac bi chan hoac bao loi; khong tao ban ghi tren admission da dong.",
    "evidence": [
     {
      "name": "TC-IPD-033__s01__error",
      "caption": "Chan thao tac BN xuat vien",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#242"
    ]
   },
   {
    "id": "TC-IPD-034",
    "title": "Tab Y lenh hom nay chi liet ke BN co y lenh cho",
    "category": "happy",
    "priority": "P2",
    "role": "Dieu duong",
    "preconditions": "Co BN voi co pending.",
    "steps": [
     "Chuyen tab Y lenh hom nay",
     "Quan sat chip co",
     "Click dong mo drawer",
     "Quan sat empty khi khong co BN"
    ],
    "expected": "Chi BN co co hien; chip dung loai; empty Khong co benh nhan can xu ly y lenh.",
    "evidence": [
     {
      "name": "TC-IPD-034__s01__list",
      "caption": "Danh sach BN co y lenh",
      "uiState": "list"
     },
     {
      "name": "TC-IPD-034__s02__empty",
      "caption": "Empty khong co y lenh",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#243"
    ]
   },
   {
    "id": "TC-IPD-035",
    "title": "KPI strip tinh dung cong suat va TB ngay nam",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quan ly khoa",
    "preconditions": "Co du lieu giuong va BN that.",
    "steps": [
     "Quan sat KPI",
     "Doi chieu Co BN cong Trong vs Tong",
     "Doi chieu cong suat",
     "Doi chieu TB ngay nam"
    ],
    "expected": "KPI khop grid/danh sach; cong suat va TB ngay nam tinh dung; Canh bao = so BN co co.",
    "evidence": [
     {
      "name": "TC-IPD-035__s01__list",
      "caption": "KPI strip",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#243"
    ]
   },
   {
    "id": "TC-IPD-036",
    "title": "Dark/light parity va format tien/ngay",
    "category": "ui",
    "priority": "P2",
    "role": "Nguoi dung",
    "preconditions": "Co toggle dark/light o topbar.",
    "steps": [
     "Mo 6556 o dark mode",
     "Chuyen light mode mo lai",
     "Mo bieu do sinh hieu 2 mode",
     "Kiem tra format ngay va tien"
    ],
    "expected": "Ca 2 mode du contrast; bieu do khong chim mau o light; ngay/tien dinh dang nhat quan.",
    "evidence": [
     {
      "name": "TC-IPD-036__s01__detail",
      "caption": "6556 dark mode",
      "uiState": "detail"
     },
     {
      "name": "TC-IPD-036__s02__detail",
      "caption": "6556 light mode",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#243"
    ]
   },
   {
    "id": "TC-IPD-037",
    "title": "Loi tai du lieu noi tru API down",
    "category": "negative",
    "priority": "P2",
    "role": "Nguoi dung",
    "preconditions": "Gia lap API getInpatientList/getWardLayout loi.",
    "steps": [
     "Chan response API",
     "Mo /v2/ipd",
     "Quan sat tab grid/list"
    ],
    "expected": "Khong crash; grid/list ve empty an toan; KPI 0; khong lo stack trace.",
    "evidence": [
     {
      "name": "TC-IPD-037__s01__error",
      "caption": "API loi van render an toan",
      "uiState": "error"
     },
     {
      "name": "TC-IPD-037__s02__empty",
      "caption": "Empty khong tai duoc",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#243"
    ]
   },
   {
    "id": "TC-IPD-038",
    "title": "Audit log ghi dung nguoi thuc hien mutation noi tru",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quan tri/Kiem toan",
    "preconditions": "Dang nhap user that; thuc hien nhap vien/chuyen khoa/ra vien.",
    "steps": [
     "Thuc hien 1 nhap vien",
     "Thuc hien 1 ra vien",
     "Kiem tra AuditLog va CreatedBy/UpdatedBy"
    ],
    "expected": "Moi mutation ghi CreatedBy/UpdatedBy la user that (khac Guid.Empty) va AuditLog co entry.",
    "evidence": [
     {
      "name": "TC-IPD-038__s01__detail",
      "caption": "Audit log nguoi thuc hien dung",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#216"
    ]
   }
  ],
  "summary": "Phan he Noi tru (IPD) quan ly vong doi nguoi benh noi tru: Nhap vien, Phan giuong, theo doi dieu tri (sinh hieu/dien bien/cham soc/truyen dich), Hoi chan, Ra vien/Chuyen vien; kem Luu theo doi, Ho so so sinh, Ban giao ca dieu duong. Man chinh FE v2 la So do giuong (/v2/ipd) 4 tab (So do giuong, Danh sach BN, Y lenh hom nay, Hoi chan), drawer ho so BN tich hop modal: Nhap vien, Sinh hieu, Chuyen khoa, Suat an, Truyen dich, Truyen mau, Bang ke 6556, Hoan tra thuoc, Toa ve, Ra vien. Lien thong cheo OPD, Vien phi, CLS/Duoc, Truyen mau (doi chieu nhom mau - an toan nguoi benh).</summary>\n</invoke>\n"
 },
 {
  "id": "surgery",
  "code": "SUR",
  "layer": "clin",
  "ic": "🔪",
  "nm": "Phẫu thuật & Gây mê",
  "gh": [
   "#239",
   "#244"
  ],
  "gap": false,
  "module_id": "surgery",
  "summary": "Phân hệ Phẫu thuật & Gây mê (SUR, lớp clin) quản lý vòng đời ca mổ: SurgeryRequests (đề nghị mổ) ⟶ SurgerySchedules (lịch mổ/phòng mổ) ⟶ SurgeryRecords (biên bản mổ kèm kíp/vật tư/thuốc) + AnesthesiaRecords (hồ sơ gây mê, theo dõi, thuốc/dịch, biểu đồ) và PartographRecords (sản đồ). Trạng thái ca: Scheduled→Preop→Ongoing→Recovery→Completed/Cancelled. Màn chính FE v2 là trang \"Ca mổ\" (/v2/surgery, SimpleV2Page có KPI strip + status tabs + DataTable + DrawerShell hồ sơ ca mổ) cùng các modal Khám tiền mê, Theo dõi gây mê, Cam đoan PTTT, KH sau gây mê, Xuất tủ trực phòng mổ. Vật tư/thuốc dùng trong mổ tính vào viện phí (data-consistency surgery→billing→BHYT), liên thông IPD/Ngân hàng máu/HSĐT-ký số/Tài sản (phòng mổ).",
  "screens": [
   {
    "name": "Danh sách Ca mổ (list)",
    "desc": "Trang chính v2 SimpleV2Page liệt kê ca mổ trong khoảng ±7 ngày; KPI strip (Ca hôm nay/Đang mổ/Hoàn tất/Hủy/Cấp cứu/TB mỗi ca), status tabs theo trạng thái, ô tìm kiếm, DataTable cột Giờ mổ/Mã CM/Phòng/BN/Phẫu thuật/BS chính/GMHS/Loại/Dự kiến/Trạng thái, rowActions (xem, duyệt, hủy).",
    "route_guess": "/v2/surgery",
    "elements": [
     "KpiStrip 6 thẻ",
     "StatusTabs (scheduled/preop/ongoing/recovery/completed/cancelled)",
     "ô tìm kiếm BN/mã ca/tên PT",
     "DataTable",
     "StatusBadge",
     "ActBtn duyệt/hủy/xem"
    ]
   },
   {
    "name": "Hồ sơ ca mổ (drawer)",
    "desc": "DrawerShell mở khi click dòng: BN & chẩn đoán (trước/sau mổ + ICD), thông tin phẫu thuật (DV, loại, tính chất, phòng/giờ, vô cảm), ekip phẫu thuật, thời gian thực tế, nội dung/kết luận, biến chứng, chi phí (phí DV + tiền thuốc). Có nút mở các modal con.",
    "route_guess": "/v2/surgery (drawer)",
    "elements": [
     "rec-section BN/CĐ",
     "rec-kv phẫu thuật",
     "chip ekip",
     "khối thời gian thực tế",
     "khối chi phí",
     "nút Xuất tủ trực / Khám tiền mê / Theo dõi gây mê / Cam đoan PTTT / KH sau gây mê"
    ]
   },
   {
    "name": "Khám tiền mê (modal)",
    "desc": "PreAnesthesiaModal: đánh giá tiền mê, phân loại ASA, tiền sử/dị ứng, đường thở, kế hoạch vô cảm.",
    "route_guess": "/v2/surgery (modal)",
    "elements": [
     "form khám tiền mê",
     "chọn ASA",
     "field dị ứng",
     "nút lưu"
    ]
   },
   {
    "name": "Theo dõi gây mê (modal)",
    "desc": "AnesthesiaMonitorModal: bảng/biểu đồ theo dõi sinh hiệu trong mổ (mạch, HA, SpO2), thuốc/dịch gây mê theo mốc thời gian (AnesthesiaChartEntries/Monitors/Drugs/Fluids).",
    "route_guess": "/v2/surgery (modal)",
    "elements": [
     "bảng theo dõi theo mốc giờ",
     "nhập sinh hiệu",
     "thêm thuốc/dịch gây mê",
     "biểu đồ"
    ]
   },
   {
    "name": "Cam đoan PTTT (modal)",
    "desc": "ConsentModal: phiếu cam đoan phẫu thuật thủ thuật — chẩn đoán, thủ thuật dự kiến, nguy cơ, phương án thay thế, giải thích của BS, người ký + quan hệ; trạng thái đã ký/chưa ký + validate trước khi mổ.",
    "route_guess": "/v2/surgery (modal)",
    "elements": [
     "form cam đoan",
     "field nguy cơ/giải thích",
     "người ký + quan hệ",
     "nút ký",
     "badge đã/chưa ký"
    ]
   },
   {
    "name": "KH sau gây mê (modal)",
    "desc": "PostAnesthesiaPlanModal: kế hoạch theo dõi/giảm đau hồi tỉnh sau gây mê-phẫu thuật.",
    "route_guess": "/v2/surgery (modal)",
    "elements": [
     "form kế hoạch hậu phẫu",
     "field giảm đau/theo dõi",
     "nút lưu"
    ]
   },
   {
    "name": "Xuất tủ trực phòng mổ (modal)",
    "desc": "SurgeryCabinetIssueModal: xuất vật tư/thuốc tủ trực phòng mổ, phân đối tượng chi trả BHYT/Viện phí/Hộ phí.",
    "route_guess": "/v2/surgery (modal)",
    "elements": [
     "danh sách vật tư/thuốc tủ trực",
     "chọn đối tượng BHYT/VP/HP",
     "số lượng",
     "nút xuất"
    ]
   },
   {
    "name": "Duyệt/Hủy ca (confirm)",
    "desc": "Hành động duyệt mổ (status=0) và hủy ca (status≠4,5) từ rowActions, có nhập lý do hủy + toast kết quả.",
    "route_guess": "/v2/surgery (confirm)",
    "elements": [
     "nút duyệt",
     "nút hủy",
     "ô lý do hủy",
     "toast success/warning/error"
    ]
   },
   {
    "name": "Lịch mổ / phòng mổ (view)",
    "desc": "Lịch mổ theo ngày/phòng (getSurgerySchedule) và danh sách phòng mổ + trạng thái (OperatingRooms), waiting list theo phòng. (BE có endpoint; UI có thể là tab/biến thể.)",
    "route_guess": "/v2/surgery",
    "elements": [
     "lịch theo phòng/ngày",
     "trạng thái phòng mổ",
     "waiting list",
     "ca đang mổ hiện tại"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-SUR-001",
    "title": "Tạo đề nghị mổ (SurgeryRequest) thành công từ hồ sơ bệnh nhân",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ phẫu thuật",
    "preconditions": "Đăng nhập admin/Admin@123; có 1 hồ sơ bệnh án (medicalRecord) đang điều trị; có dịch vụ phẫu thuật trong danh mục.",
    "steps": [
     "Vào /v2/surgery",
     "Mở form tạo đề nghị mổ",
     "Chọn hồ sơ bệnh án, dịch vụ phẫu thuật, loại PT, phân loại, tính chất (chương trình), phương pháp vô cảm",
     "Nhập chẩn đoán trước mổ + ICD",
     "Lưu đề nghị mổ"
    ],
    "expected": "Tạo thành công, ca mới hiện ở tab 'Đã lên lịch' với status=0, surgeryCode tự sinh, toast thành công; audit log ghi createdBy/createdAt.",
    "evidence": [
     {
      "name": "TC-SUR-001__s01__form",
      "caption": "Form tạo đề nghị mổ đã điền đủ",
      "uiState": "form"
     },
     {
      "name": "TC-SUR-001__s02__success",
      "caption": "Toast tạo ca mổ thành công",
      "uiState": "success"
     },
     {
      "name": "TC-SUR-001__s03__list",
      "caption": "Ca mới xuất hiện ở tab Đã lên lịch",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239",
     "#244"
    ]
   },
   {
    "id": "TC-SUR-002",
    "title": "Duyệt mổ ca đang chờ (status 0 → đã duyệt)",
    "category": "happy",
    "priority": "P0",
    "role": "Trưởng khoa/Quản lý phòng mổ",
    "preconditions": "Có ca mổ ở trạng thái Pending (status=0).",
    "steps": [
     "Vào /v2/surgery, lọc tab 'Đã lên lịch'",
     "Tại dòng ca status=0, bấm nút Duyệt mổ",
     "Xác nhận"
    ],
    "expected": "Gọi POST /SurgeryComplete/approve isApproved=true; toast 'Đã duyệt ca · <mã>'; ca cập nhật approvedAt/approvedBy; nút Duyệt biến mất khỏi dòng.",
    "evidence": [
     {
      "name": "TC-SUR-002__s01__list",
      "caption": "Dòng ca có nút Duyệt mổ",
      "uiState": "list"
     },
     {
      "name": "TC-SUR-002__s02__success",
      "caption": "Toast đã duyệt ca",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-SUR-003",
    "title": "Lên lịch mổ: gán phòng mổ + giờ + ekip",
    "category": "happy",
    "priority": "P0",
    "role": "Điều phối phòng mổ",
    "preconditions": "Ca đã được duyệt; có phòng mổ active; có nhân sự kíp mổ.",
    "steps": [
     "Mở ca, vào chức năng Lên lịch (scheduleSurgery)",
     "Chọn ngày giờ mổ, phòng mổ, thời lượng dự kiến",
     "Thêm thành viên kíp mổ + vai trò",
     "Lưu"
    ],
    "expected": "Ca có operatingRoomName, scheduledDate, durationMinutes, danh sách teamMembers; hiển thị đúng ở cột Phòng/Giờ/Dự kiến và khối Ekip trong drawer.",
    "evidence": [
     {
      "name": "TC-SUR-003__s01__form",
      "caption": "Form lên lịch chọn phòng/giờ/ekip",
      "uiState": "form"
     },
     {
      "name": "TC-SUR-003__s02__drawer",
      "caption": "Drawer hiển thị ekip + phòng/giờ sau lên lịch",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-SUR-004",
    "title": "Vòng đời thực thi: check-in → bắt đầu mổ → hoàn tất",
    "category": "happy",
    "priority": "P0",
    "role": "Kíp mổ/Điều dưỡng phòng mổ",
    "preconditions": "Ca đã lên lịch (status Scheduled/Preop), phòng mổ sẵn sàng.",
    "steps": [
     "Check-in bệnh nhân vào phòng mổ (checkInPatient)",
     "Bắt đầu mổ (startSurgery) — ghi startTime",
     "Trong mổ cập nhật mô tả",
     "Hoàn tất (completeSurgery) — ghi endTime, chẩn đoán sau mổ, kết luận"
    ],
    "expected": "Status chuyển Preop→Ongoing→Recovery/Completed đúng thứ tự; cột Trạng thái + KPI 'Đang mổ'/'Hoàn tất' cập nhật; drawer hiện Thời gian thực tế = endTime-startTime.",
    "evidence": [
     {
      "name": "TC-SUR-004__s01__list",
      "caption": "Ca chuyển sang Đang mổ ở status tab",
      "uiState": "list"
     },
     {
      "name": "TC-SUR-004__s02__form",
      "caption": "Form hoàn tất ca: CĐ sau mổ + kết luận",
      "uiState": "form"
     },
     {
      "name": "TC-SUR-004__s03__drawer",
      "caption": "Drawer hiện thời gian thực tế + kết luận",
      "uiState": "drawer"
     },
     {
      "name": "TC-SUR-004__s04__success",
      "caption": "Toast hoàn tất ca mổ",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239",
     "#244"
    ]
   },
   {
    "id": "TC-SUR-005",
    "title": "Hủy ca mổ giữa chừng có nhập lý do",
    "category": "negative",
    "priority": "P0",
    "role": "Quản lý phòng mổ",
    "preconditions": "Có ca mổ status ≠ Completed(4) và ≠ Cancelled(5).",
    "steps": [
     "Tại dòng ca, bấm nút Hủy ca (tone crit)",
     "Nhập lý do hủy",
     "Xác nhận"
    ],
    "expected": "Gọi POST /SurgeryComplete/{id}/cancel với reason; toast warning 'Đã hủy ca'; ca chuyển sang tab 'Hủy' (status=5); KPI Hủy +1; audit ghi người hủy + lý do.",
    "evidence": [
     {
      "name": "TC-SUR-005__s01__confirm",
      "caption": "Hộp nhập lý do hủy ca",
      "uiState": "confirm"
     },
     {
      "name": "TC-SUR-005__s02__toast",
      "caption": "Toast cảnh báo đã hủy ca",
      "uiState": "toast"
     },
     {
      "name": "TC-SUR-005__s03__list",
      "caption": "Ca nằm trong tab Hủy",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-SUR-006",
    "title": "Chặn chuyển trạng thái không hợp lệ (hoàn tất khi chưa bắt đầu mổ)",
    "category": "state",
    "priority": "P0",
    "role": "Kíp mổ",
    "preconditions": "Có ca status Scheduled(0) chưa có startTime.",
    "steps": [
     "Cố gọi completeSurgery cho ca chưa startSurgery",
     "Quan sát phản hồi"
    ],
    "expected": "Hệ thống từ chối, báo lỗi nghiệp vụ (không cho Completed khi chưa Ongoing); trạng thái ca không đổi; không sinh endTime.",
    "evidence": [
     {
      "name": "TC-SUR-006__s01__error",
      "caption": "Thông báo lỗi chặn hoàn tất khi chưa mổ",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-SUR-007",
    "title": "Chặn duyệt/hủy ca đã ở trạng thái cuối (Completed/Cancelled)",
    "category": "state",
    "priority": "P1",
    "role": "Quản lý phòng mổ",
    "preconditions": "Có 1 ca Completed(4) và 1 ca Cancelled(5).",
    "steps": [
     "Mở tab Hoàn tất và tab Hủy",
     "Quan sát rowActions của các ca này"
    ],
    "expected": "Ca status=4/5 KHÔNG hiển thị nút Hủy; ca status≠0 không hiển thị nút Duyệt; mọi mutation trạng thái bị khóa.",
    "evidence": [
     {
      "name": "TC-SUR-007__s01__list",
      "caption": "Ca Completed/Cancelled không có nút Hủy/Duyệt",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-SUR-008",
    "title": "Validation form tạo ca: field bắt buộc thiếu",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Mở form tạo đề nghị mổ.",
    "steps": [
     "Để trống hồ sơ bệnh án, dịch vụ phẫu thuật, phương pháp vô cảm",
     "Bấm Lưu"
    ],
    "expected": "Form chặn submit, hiển thị lỗi đỏ dưới từng field bắt buộc (medicalRecordId, surgeryServiceId, anesthesiaType...); không gọi API tạo.",
    "evidence": [
     {
      "name": "TC-SUR-008__s01__validation",
      "caption": "Form báo lỗi các field bắt buộc trống",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-009",
    "title": "Edge: thời lượng dự kiến biên (0, âm, rất lớn) khi lên lịch",
    "category": "edge",
    "priority": "P1",
    "role": "Điều phối phòng mổ",
    "preconditions": "Mở form lên lịch ca.",
    "steps": [
     "Nhập estimatedDurationMinutes = 0",
     "Lưu; lặp với -30",
     "Lặp với 100000 (rất lớn)"
    ],
    "expected": "0/âm bị chặn validation (phải > 0); giá trị rất lớn hoặc bị chặn theo trần hợp lý hoặc chấp nhận nhưng hiển thị đúng 'Np' không tràn UI; không crash.",
    "evidence": [
     {
      "name": "TC-SUR-009__s01__validation",
      "caption": "Lỗi thời lượng 0/âm",
      "uiState": "validation"
     },
     {
      "name": "TC-SUR-009__s02__edge",
      "caption": "Hiển thị thời lượng rất lớn không vỡ layout",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-010",
    "title": "Edge: scheduledDate quá khứ / tương lai xa",
    "category": "edge",
    "priority": "P1",
    "role": "Điều phối phòng mổ",
    "preconditions": "Mở form lên lịch.",
    "steps": [
     "Đặt ngày mổ vào quá khứ (hôm qua) → lưu",
     "Đặt ngày mổ tương lai xa (năm 2099) → lưu",
     "Quan sát filter list ±7 ngày"
    ],
    "expected": "Ngày quá khứ cảnh báo/chặn theo quy tắc; ngày tương lai xa lưu được nhưng không lọt vào list mặc định ±7 ngày (cần điều chỉnh filter); format ngày DD/MM HH:mm đúng, không lệch timezone.",
    "evidence": [
     {
      "name": "TC-SUR-010__s01__validation",
      "caption": "Cảnh báo ngày mổ quá khứ",
      "uiState": "validation"
     },
     {
      "name": "TC-SUR-010__s02__filter",
      "caption": "Ca tương lai xa không hiện trong filter mặc định",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-011",
    "title": "Edge: ghi chú/kết luận chuỗi rất dài + ký tự đặc biệt + dấu tiếng Việt",
    "category": "edge",
    "priority": "P2",
    "role": "Bác sĩ phẫu thuật",
    "preconditions": "Có ca đang mổ/hoàn tất.",
    "steps": [
     "Nhập mô tả/kết luận/biến chứng dài ~5000 ký tự gồm dấu tiếng Việt và ký tự đặc biệt <>&'\"%",
     "Lưu và mở lại drawer"
    ],
    "expected": "Lưu và hiển thị nguyên vẹn (whiteSpace pre-wrap), không tràn/cắt; dấu tiếng Việt đúng; ký tự đặc biệt không phá layout.",
    "evidence": [
     {
      "name": "TC-SUR-011__s01__form",
      "caption": "Nhập kết luận dài có dấu + ký tự đặc biệt",
      "uiState": "form"
     },
     {
      "name": "TC-SUR-011__s02__drawer",
      "caption": "Drawer hiển thị nội dung dài nguyên vẹn",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-012",
    "title": "Cam đoan PTTT: tạo, ký và validate bắt buộc trước mổ",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ + Người nhà BN",
    "preconditions": "Có ca mổ chưa bắt đầu; chưa có phiếu cam đoan ký.",
    "steps": [
     "Mở drawer ca → Cam đoan PTTT",
     "Điền chẩn đoán, thủ thuật dự kiến, nguy cơ, phương án thay thế, giải thích",
     "Lưu phiếu",
     "Ký phiếu: nhập người ký + quan hệ",
     "Gọi validateConsents cho ca"
    ],
    "expected": "Phiếu chuyển isSigned=true, signerName/relationship/signedAt lưu; validateConsents trả isValid=true, missingConsents rỗng; trước khi ký validate báo unsignedConsents.",
    "evidence": [
     {
      "name": "TC-SUR-012__s01__modal",
      "caption": "Modal cam đoan PTTT đã điền",
      "uiState": "modal"
     },
     {
      "name": "TC-SUR-012__s02__form",
      "caption": "Nhập người ký + quan hệ",
      "uiState": "form"
     },
     {
      "name": "TC-SUR-012__s03__success",
      "caption": "Phiếu chuyển trạng thái đã ký",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-013",
    "title": "Chặn bắt đầu mổ khi chưa có cam đoan PTTT đã ký",
    "category": "negative",
    "priority": "P0",
    "role": "Kíp mổ",
    "preconditions": "Có ca chưa có phiếu cam đoan đã ký.",
    "steps": [
     "Cố startSurgery khi validateConsents trả isValid=false",
     "Quan sát"
    ],
    "expected": "Hệ thống cảnh báo còn cam đoan chưa ký (unsignedConsents/missingConsents), chặn/yêu cầu xác nhận trước khi mổ — an toàn người bệnh.",
    "evidence": [
     {
      "name": "TC-SUR-013__s01__error",
      "caption": "Cảnh báo thiếu cam đoan PTTT đã ký",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-014",
    "title": "Khám tiền mê: nhập đánh giá ASA + dị ứng (an toàn gây mê)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ gây mê",
    "preconditions": "Có ca mổ status Scheduled/Preop.",
    "steps": [
     "Mở drawer → Khám tiền mê",
     "Chọn phân loại ASA, nhập tiền sử/dị ứng, đánh giá đường thở",
     "Lập kế hoạch vô cảm",
     "Lưu"
    ],
    "expected": "Hồ sơ tiền mê lưu (AnesthesiaRecords); dị ứng được ghi nhận và cảnh báo khi kê thuốc gây mê trùng dị ứng; toast thành công.",
    "evidence": [
     {
      "name": "TC-SUR-014__s01__modal",
      "caption": "Modal khám tiền mê với ASA + dị ứng",
      "uiState": "modal"
     },
     {
      "name": "TC-SUR-014__s02__success",
      "caption": "Lưu khám tiền mê thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-015",
    "title": "Theo dõi gây mê: ghi sinh hiệu + thuốc/dịch theo mốc thời gian",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ/KTV gây mê",
    "preconditions": "Ca đang mổ (Ongoing).",
    "steps": [
     "Mở drawer → Theo dõi gây mê",
     "Thêm bản ghi sinh hiệu (mạch/HA/SpO2) theo mốc giờ",
     "Thêm thuốc gây mê + dịch gây mê",
     "Lưu"
    ],
    "expected": "Bảng/biểu đồ (AnesthesiaChartEntries/Monitors/Drugs/Fluids) cập nhật theo thời gian; tính tổng dịch/thuốc đúng; biểu đồ vẽ đúng mốc.",
    "evidence": [
     {
      "name": "TC-SUR-015__s01__modal",
      "caption": "Modal theo dõi gây mê với bảng sinh hiệu",
      "uiState": "modal"
     },
     {
      "name": "TC-SUR-015__s02__tab",
      "caption": "Biểu đồ gây mê theo mốc thời gian",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-016",
    "title": "Validation theo dõi gây mê: sinh hiệu ngoài range/âm",
    "category": "validation",
    "priority": "P1",
    "role": "KTV gây mê",
    "preconditions": "Mở modal theo dõi gây mê.",
    "steps": [
     "Nhập SpO2 = 150 (>100), mạch = -5, HA = chuỗi chữ",
     "Lưu"
    ],
    "expected": "Chặn giá trị âm/ngoài range sinh lý; báo lỗi dưới field; không lưu giá trị phi lý.",
    "evidence": [
     {
      "name": "TC-SUR-016__s01__validation",
      "caption": "Lỗi sinh hiệu ngoài range",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-017",
    "title": "Kê thuốc/vật tư dùng trong mổ + cảnh báo dị ứng/tương tác",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ phẫu thuật",
    "preconditions": "Ca mổ đang/đã mổ; có kho thuốc với tồn.",
    "steps": [
     "Mở đơn thuốc/vật tư của ca (getPrescription)",
     "Tìm thuốc theo kho, thêm thuốc + số lượng + đối tượng chi trả",
     "Thêm vật tư",
     "Quan sát cảnh báo (checkMedicineWarnings)"
    ],
    "expected": "Thuốc/vật tư thêm vào, tính totalMedicineCost/totalSupplyCost; nếu thuốc trùng dị ứng/chống chỉ định/tương tác → hiện MedicineWarning theo severity màu; cảnh báo nguy hiểm chặn lưu.",
    "evidence": [
     {
      "name": "TC-SUR-017__s01__form",
      "caption": "Thêm thuốc dùng mổ vào đơn",
      "uiState": "form"
     },
     {
      "name": "TC-SUR-017__s02__modal",
      "caption": "Cảnh báo dị ứng/tương tác thuốc",
      "uiState": "modal"
     },
     {
      "name": "TC-SUR-017__s03__success",
      "caption": "Đơn thuốc mổ lưu thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-018",
    "title": "Vượt định mức gói PT (package limit) khi kê thuốc/vật tư",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ phẫu thuật",
    "preconditions": "Ca gắn gói PT có medicineLimit/supplyLimit.",
    "steps": [
     "Áp gói (applyPackage)",
     "Thêm thuốc vượt định mức gói",
     "Quan sát isOverLimit/overLimitAmount"
    ],
    "expected": "Hệ thống đánh dấu isOverLimit=true, hiển thị overLimitAmount; phần vượt tách đối tượng chi trả đúng (ngoài gói); cảnh báo rõ.",
    "evidence": [
     {
      "name": "TC-SUR-018__s01__modal",
      "caption": "Cảnh báo vượt định mức gói",
      "uiState": "modal"
     },
     {
      "name": "TC-SUR-018__s02__detail",
      "caption": "Hiển thị overLimitAmount",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-019",
    "title": "Xuất tủ trực phòng mổ phân đối tượng BHYT/VP/HP",
    "category": "happy",
    "priority": "P1",
    "role": "Điều dưỡng phòng mổ",
    "preconditions": "Ca mổ có tủ trực phòng mổ với vật tư/thuốc.",
    "steps": [
     "Mở drawer → Xuất tủ trực",
     "Chọn vật tư/thuốc, số lượng, đối tượng chi trả BHYT/VP/HP",
     "Xác nhận xuất"
    ],
    "expected": "Tạo phiếu xuất tủ trực, trừ tồn, phân đối tượng đúng; chi phí cộng vào viện phí theo đối tượng.",
    "evidence": [
     {
      "name": "TC-SUR-019__s01__modal",
      "caption": "Modal xuất tủ trực chọn đối tượng chi trả",
      "uiState": "modal"
     },
     {
      "name": "TC-SUR-019__s02__success",
      "caption": "Xuất tủ trực thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-020",
    "title": "Data-consistency: chi phí mổ (DV+thuốc+vật tư) → viện phí → BHYT",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Kế toán viện phí",
    "preconditions": "Ca mổ Completed có serviceCost + medicineCost + supplyCost; BN có thẻ BHYT.",
    "steps": [
     "Xem chi phí trong drawer ca mổ",
     "Sang phân hệ Viện phí của hồ sơ BN tương ứng",
     "Kiểm tra mục phẫu thuật + thuốc/vật tư mổ",
     "Kiểm tra phần BHYT chi trả vs BN tự trả"
    ],
    "expected": "serviceCost+medicineCost+supplyCost ở surgery khớp dòng phẫu thuật trong viện phí; insuranceCoverage/patientPayment tính đúng theo tỉ lệ BHYT; tổng không lệch; audit log liên kết.",
    "evidence": [
     {
      "name": "TC-SUR-020__s01__drawer",
      "caption": "Chi phí ca mổ trong drawer",
      "uiState": "drawer"
     },
     {
      "name": "TC-SUR-020__s02__detail",
      "caption": "Cùng chi phí hiển thị bên Viện phí",
      "uiState": "detail"
     },
     {
      "name": "TC-SUR-020__s03__detail",
      "caption": "Phân tách BHYT/BN tự trả",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239",
     "#244"
    ]
   },
   {
    "id": "TC-SUR-021",
    "title": "Phân chia phí kíp mổ (team fees) đúng tổng & dư",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản lý phòng mổ",
    "preconditions": "Ca có nhiều thành viên kíp mổ + giá dịch vụ PT.",
    "steps": [
     "Mở fee-calculation (calculateTeamFees)",
     "Đặt feePercent từng thành viên",
     "setTeamFees và xem totalDistributed/remainder"
    ],
    "expected": "Tổng feeAmount = servicePrice * tổng %; remainder = pool - totalDistributed >= 0; không phân vượt 100%; remainder hiển thị đúng.",
    "evidence": [
     {
      "name": "TC-SUR-021__s01__form",
      "caption": "Form chia phí kíp mổ theo %",
      "uiState": "form"
     },
     {
      "name": "TC-SUR-021__s02__detail",
      "caption": "Tổng phân bổ + phần dư",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-022",
    "title": "Validation chia phí kíp: tổng % > 100",
    "category": "validation",
    "priority": "P1",
    "role": "Quản lý phòng mổ",
    "preconditions": "Mở form chia phí kíp mổ.",
    "steps": [
     "Nhập tổng feePercent các thành viên = 120%",
     "Lưu"
    ],
    "expected": "Chặn lưu, báo lỗi tổng % vượt 100; không gọi setTeamFees.",
    "evidence": [
     {
      "name": "TC-SUR-022__s01__validation",
      "caption": "Lỗi tổng % phí kíp vượt 100",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-023",
    "title": "Đặt máu cho ca mổ + đối chiếu nhóm máu/Rh",
    "category": "integration",
    "priority": "P0",
    "role": "Bác sĩ phẫu thuật",
    "preconditions": "Ca mổ cần máu; có ngân hàng máu + chế phẩm tồn; BN có nhóm máu xác định.",
    "steps": [
     "Mở blood-order của ca (createBloodOrder)",
     "Chọn ngân hàng máu, chế phẩm, nhóm máu + Rh, số lượng",
     "Lưu phiếu lĩnh máu"
    ],
    "expected": "Phiếu lĩnh máu tạo, liên thông phân hệ Ngân hàng máu; nhóm máu/Rh chế phẩm phải khớp BN (đối chiếu) — sai nhóm bị chặn; chi phí máu cộng viện phí.",
    "evidence": [
     {
      "name": "TC-SUR-023__s01__form",
      "caption": "Form đặt máu chọn nhóm + Rh",
      "uiState": "form"
     },
     {
      "name": "TC-SUR-023__s02__success",
      "caption": "Tạo phiếu lĩnh máu thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239",
     "#244"
    ]
   },
   {
    "id": "TC-SUR-024",
    "title": "Chặn đặt máu sai nhóm/Rh không tương thích",
    "category": "negative",
    "priority": "P0",
    "role": "Bác sĩ phẫu thuật",
    "preconditions": "BN nhóm A Rh+; chọn chế phẩm nhóm B.",
    "steps": [
     "Đặt máu chế phẩm nhóm B cho BN nhóm A",
     "Lưu"
    ],
    "expected": "Hệ thống cảnh báo/chặn nhóm máu không tương thích — an toàn truyền máu; không tạo phiếu lĩnh sai nhóm.",
    "evidence": [
     {
      "name": "TC-SUR-024__s01__error",
      "caption": "Cảnh báo nhóm máu không tương thích",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-SUR-025",
    "title": "In biên bản mổ / phiếu an toàn PT / phiếu gây mê",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ phẫu thuật",
    "preconditions": "Ca mổ Completed có đủ thông tin.",
    "steps": [
     "Mở ca, in Biên bản mổ (printSurgeryReport)",
     "In bảng kiểm an toàn PT (printSafetyChecklist)",
     "In phiếu gây mê (printAnesthesiaForm)"
    ],
    "expected": "Trả về file blob PDF mở/preview được; nội dung khớp dữ liệu ca (BN, kíp, chẩn đoán, thời gian); biểu mẫu đúng định dạng MS Bộ Y tế.",
    "evidence": [
     {
      "name": "TC-SUR-025__s01__detail",
      "caption": "Preview biên bản mổ PDF",
      "uiState": "detail"
     },
     {
      "name": "TC-SUR-025__s02__success",
      "caption": "Tải phiếu in thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-026",
    "title": "Xuất XML 4210 cho ca mổ (liên thông BHXH)",
    "category": "integration",
    "priority": "P1",
    "role": "Cán bộ BHYT",
    "preconditions": "Ca mổ Completed của BN BHYT.",
    "steps": [
     "Mở ca, gọi exportXml4210",
     "Kiểm tra file XML"
    ],
    "expected": "Xuất file XML đúng cấu trúc QĐ 4210 (bảng chi tiết DV/thuốc/vật tư mổ), mã DV/ICD hợp lệ; không thiếu trường bắt buộc.",
    "evidence": [
     {
      "name": "TC-SUR-026__s01__success",
      "caption": "Xuất XML 4210 thành công",
      "uiState": "success"
     },
     {
      "name": "TC-SUR-026__s02__detail",
      "caption": "Nội dung XML ca mổ",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-027",
    "title": "Permission: vai trò không đủ quyền bị chặn menu/nút/API phẫu thuật",
    "category": "permission",
    "priority": "P0",
    "role": "Lễ tân (không quyền phẫu thuật)",
    "preconditions": "Có user vai trò không có quyền module surgery (theo matrix #216).",
    "steps": [
     "Đăng nhập user thiếu quyền",
     "Truy cập /v2/surgery",
     "Thử gọi trực tiếp POST /SurgeryComplete approve/cancel"
    ],
    "expected": "Menu Phẫu thuật ẩn/khóa; vào route bị chặn hoặc read-only; API trả 403; không lộ nút Duyệt/Hủy.",
    "evidence": [
     {
      "name": "TC-SUR-027__s01__permission",
      "caption": "Menu/nút phẫu thuật bị ẩn với vai trò thiếu quyền",
      "uiState": "permission"
     },
     {
      "name": "TC-SUR-027__s02__error",
      "caption": "API trả 403 khi gọi trực tiếp",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-SUR-028",
    "title": "Security IDOR: xem/sửa ca mổ của bệnh nhân khác qua surgeryId",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ khoa khác",
    "preconditions": "Có 2 ca mổ thuộc 2 khoa/BN khác nhau; biết surgeryId ca không thuộc phạm vi.",
    "steps": [
     "Đăng nhập user khoa A",
     "Gọi GET /SurgeryComplete/{id} với id của ca khoa B",
     "Thử cancel/approve ca khoa B"
    ],
    "expected": "Bị từ chối (403/404) hoặc lọc theo phạm vi khoa; không xem/sửa được ca BN khác; ghi audit truy cập trái phép.",
    "evidence": [
     {
      "name": "TC-SUR-028__s01__error",
      "caption": "Truy cập ca BN khác bị từ chối",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-SUR-029",
    "title": "Security XSS: field ghi chú/kết luận/biến chứng",
    "category": "security",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Có ca mổ chỉnh sửa được.",
    "steps": [
     "Nhập <script>alert(1)</script> và <img src=x onerror=alert(1)> vào kết luận/biến chứng/ghi chú",
     "Lưu và mở drawer"
    ],
    "expected": "Nội dung render như text thuần (escaped), KHÔNG thực thi script; whiteSpace pre-wrap hiển thị literal; không popup alert.",
    "evidence": [
     {
      "name": "TC-SUR-029__s01__form",
      "caption": "Nhập payload XSS vào kết luận",
      "uiState": "form"
     },
     {
      "name": "TC-SUR-029__s02__drawer",
      "caption": "Drawer render payload dạng text an toàn",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-SUR-030",
    "title": "UI states: empty / loading / error của danh sách ca mổ",
    "category": "ui",
    "priority": "P1",
    "role": "Quản lý phòng mổ",
    "preconditions": "Có khoảng ngày không có ca; có thể mô phỏng API chậm/lỗi.",
    "steps": [
     "Lọc khoảng ngày không có ca → quan sát empty",
     "Tải trang khi API chậm → quan sát loading",
     "Mô phỏng API lỗi 500 → quan sát error"
    ],
    "expected": "Empty hiển thị trạng thái rỗng rõ ràng (không bảng trắng); loading có skeleton/spinner; error có thông báo + nút thử lại; KPI=0 đúng.",
    "evidence": [
     {
      "name": "TC-SUR-030__s01__empty",
      "caption": "Danh sách ca mổ trạng thái rỗng",
      "uiState": "empty"
     },
     {
      "name": "TC-SUR-030__s02__loading",
      "caption": "Trạng thái đang tải danh sách",
      "uiState": "loading"
     },
     {
      "name": "TC-SUR-030__s03__error",
      "caption": "Trạng thái lỗi tải danh sách",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-SUR-031",
    "title": "UI dark/light parity + format số/tiền/ngày ca mổ",
    "category": "ui",
    "priority": "P2",
    "role": "Người dùng bất kỳ",
    "preconditions": "Có ca mổ có chi phí + thời gian.",
    "steps": [
     "Bật dark mode (topbar v2), xem list + drawer",
     "Chuyển light mode, so sánh",
     "Kiểm tra tiền (₫, dấu phân cách vi-VN), giờ HH:mm, ngày DD/MM HH:mm"
    ],
    "expected": "Cả 2 theme đọc rõ, đủ tương phản, badge/chip không mất chữ; tiền format 1.234.567 ₫; ngày/giờ đúng định dạng và timezone địa phương.",
    "evidence": [
     {
      "name": "TC-SUR-031__s01__detail",
      "caption": "Drawer ca mổ ở dark mode",
      "uiState": "detail"
     },
     {
      "name": "TC-SUR-031__s02__detail",
      "caption": "Drawer ca mổ ở light mode",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-SUR-032",
    "title": "KPI strip tính đúng theo dữ liệu list (data-consistency)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản lý phòng mổ",
    "preconditions": "Có tập ca mổ đa trạng thái trong ±7 ngày, có ca cấp cứu (surgeryNature=1).",
    "steps": [
     "Vào /v2/surgery",
     "Đối chiếu KPI Ca hôm nay/Đang mổ/Hoàn tất/Hủy/Cấp cứu/TB mỗi ca với số dòng từng nhóm trong bảng"
    ],
    "expected": "todayCount = số ca scheduledDate hôm nay; Đang mổ = count status=2; Hoàn tất = status=4; Hủy = status=5; Cấp cứu = surgeryNature=1; TB mỗi ca = trung bình durationMinutes (bỏ null). Số khớp tuyệt đối.",
    "evidence": [
     {
      "name": "TC-SUR-032__s01__list",
      "caption": "KPI strip khớp số liệu bảng",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-SUR-033",
    "title": "Tìm kiếm & lọc status tab: BN/mã ca/tên PT",
    "category": "happy",
    "priority": "P2",
    "role": "Quản lý phòng mổ",
    "preconditions": "Có nhiều ca đa trạng thái.",
    "steps": [
     "Gõ tên BN có dấu tiếng Việt vào ô tìm",
     "Gõ mã ca / tên phẫu thuật",
     "Chuyển qua từng status tab"
    ],
    "expected": "Lọc đúng theo searchOf (patientName/patientCode/surgeryCode/surgeryServiceName); tab lọc đúng theo statusKey; tìm có dấu khớp; rỗng → empty.",
    "evidence": [
     {
      "name": "TC-SUR-033__s01__filter",
      "caption": "Kết quả tìm kiếm theo từ khóa",
      "uiState": "filter"
     },
     {
      "name": "TC-SUR-033__s02__list",
      "caption": "Lọc theo status tab",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-SUR-034",
    "title": "Negative: tạo ca mổ thiếu hồ sơ bệnh án hợp lệ / DV không phải PT",
    "category": "negative",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Mở form tạo ca.",
    "steps": [
     "Chọn medicalRecordId không tồn tại (hoặc đã đóng viện phí)",
     "Chọn serviceId không thuộc nhóm phẫu thuật",
     "Lưu"
    ],
    "expected": "BE từ chối với thông báo rõ (hồ sơ không hợp lệ / dịch vụ không phải phẫu thuật); không tạo ca; toast lỗi.",
    "evidence": [
     {
      "name": "TC-SUR-034__s01__error",
      "caption": "Lỗi hồ sơ/dịch vụ không hợp lệ khi tạo ca",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#244"
    ]
   },
   {
    "id": "TC-SUR-035",
    "title": "Thay đổi thành viên kíp mổ giữa ca (changeTeamMember) + tính lại chi phí",
    "category": "state",
    "priority": "P2",
    "role": "Quản lý phòng mổ",
    "preconditions": "Ca đang mổ có kíp; có nhân sự thay thế.",
    "steps": [
     "Gọi changeTeamMember thay 1 thành viên với changeTime",
     "Xem lại ekip + cost (calculateCostTT37 hasTeamChange=true)"
    ],
    "expected": "Ekip cập nhật (giữ lịch sử leaveTime/joinTime); cost tính lại có additionalServiceCost khi hasTeamChange; audit ghi thời điểm thay.",
    "evidence": [
     {
      "name": "TC-SUR-035__s01__drawer",
      "caption": "Ekip sau khi thay thành viên",
      "uiState": "drawer"
     },
     {
      "name": "TC-SUR-035__s02__detail",
      "caption": "Chi phí tính lại khi đổi kíp",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#244"
    ]
   }
  ],
  "ui_state_checklist": [
   "list (danh sách ca mổ + KPI strip + status tabs)",
   "detail (preview in/PDF, chi phí, dark/light)",
   "form (tạo ca, lên lịch, kê thuốc, chia phí kíp, đặt máu, hoàn tất)",
   "drawer (hồ sơ ca mổ: BN/CĐ, phẫu thuật, ekip, thời gian, chi phí)",
   "modal (khám tiền mê, theo dõi gây mê, cam đoan PTTT, KH sau gây mê, xuất tủ trực, cảnh báo thuốc)",
   "tab (biểu đồ gây mê theo mốc thời gian)",
   "filter (tìm kiếm + lọc status tab)",
   "validation (field bắt buộc, range thời lượng/sinh hiệu, tổng % phí kíp)",
   "empty (khoảng ngày không có ca)",
   "loading (đang tải danh sách)",
   "error (API lỗi, chặn trạng thái, IDOR/403, sai nhóm máu, thiếu cam đoan)",
   "confirm (nhập lý do hủy ca)",
   "success (tạo/duyệt/hoàn tất/lưu thành công)",
   "toast (cảnh báo hủy/lỗi)",
   "permission (ẩn menu/nút theo vai trò)"
  ],
  "gaps": [
   "Sản đồ (PartographRecords) — bảng có trong schema nhưng chưa thấy màn/endpoint FE; cần xác minh có UI sản khoa hay là gap thực sự, bổ sung test riêng cho theo dõi chuyển dạ nếu có.",
   "Lịch mổ tổng quan + sơ đồ phòng mổ (getSurgerySchedule, getOperatingRooms, getAllWaitingLists, updateOperatingRoomStatus) có endpoint nhưng trang v2 hiện chỉ là danh sách phẳng — chưa rõ có màn lịch/waiting-list trực quan; cần kiểm tra để viết test board phòng mổ.",
   "Đồng thời (concurrency): 2 user cùng duyệt/hủy hoặc cùng gán 1 phòng mổ trùng giờ — chưa có test xung đột đặt phòng (double-booking) trong cùng khung giờ.",
   "Audit log: schema yêu cầu audit mọi mutation nhưng chưa có task kiểm tra trực tiếp bản ghi audit (ai/khi nào/giá trị cũ-mới) cho duyệt/hủy/đổi kíp — nên thêm khi có màn xem audit.",
   "Idempotency: gọi lặp approve/start/complete (double-click) — cần test chống tạo trùng / chuyển trạng thái lặp.",
   "TT50/TT37 chi tiết: updateTT50Info (kíp mổ đầy đủ, chứng chỉ phẫu thuật viên) và cost-tt37 có endpoint nhưng chưa có task chuyên sâu kiểm tra ràng buộc chứng chỉ BS chính theo phân loại PT.",
   "Liên thông IPD (hậu phẫu) và Tài sản (asset — thiết bị phòng mổ): rel surgery↔ipd/asset chưa được phủ test luồng chuyển BN về khoa hậu phẫu sau Recovery.",
   "Responsive mobile/tablet cho drawer nhiều section và modal theo dõi gây mê chưa có task riêng (chỉ có dark/light)."
  ]
 },
 {
  "id": "blood",
  "code": "BLD",
  "layer": "clin",
  "ic": "🩸",
  "nm": "Ngân hàng máu & Truyền máu",
  "gh": [
   "#239",
   "#242"
  ],
  "gap": false,
  "module_id": "blood",
  "summary": "Phân hệ Ngân hàng máu & Truyền máu (code BLD, lớp clin) quản lý vòng đời máu BloodDonors → BloodUnits → BloodRequests → BloodTransfusions, với ràng buộc an-toàn-truyền-máu cốt lõi: đối chiếu nhóm máu/Rh của bệnh nhân trước truyền. 4 bảng chính: BloodUnits (đơn vị/túi máu), BloodDonors (người hiến), BloodRequests (phiếu lĩnh/yêu cầu xuất máu), BloodTransfusions (truyền máu). FE v2 thực tế (frontend/src/pages-v2/BloodBank.tsx, route /v2/blood-bank) hiện có 3 tab Kho máu / Sắp hết hạn / Yêu cầu xuất máu + modal Nhận máu (nhập kho từ NCC), Xuất máu (tạo phiếu yêu cầu), Cấp phát/Tiêu huỷ túi sắp hết hạn, drawer chi tiết nhóm máu / túi máu / yêu cầu. Backend (api/bloodBank.ts → /BloodBankComplete/*) còn hỗ trợ duyệt/từ chối phiếu, cross-match, start/complete transfusion, ghi phản ứng truyền máu, kiểm kê, báo cáo nhập/xuất/tồn — phần lớn CHƯA lộ trên UI v2 (gap).",
  "screens": [
   {
    "name": "Ngân hàng máu - Tab Kho máu",
    "desc": "Màn chính: KpiStrip 6 chỉ số (Tổng đơn vị, Khả dụng, Đặt trước, Hết hạn ≤7 ngày, Yêu cầu chờ, O- khả dụng) + thanh chip nhóm máu (8 nhóm AxB x Rh, đếm đv khả dụng, bấm để lọc) + bảng đơn vị máu (Mã đơn vị, Nhóm, Chế phẩm, Thể tích, Vị trí, HSD+số ngày, Trạng thái).",
    "route_guess": "/v2/blood-bank",
    "elements": [
     "KpiStrip",
     "chip nhóm máu lọc nhanh",
     "SearchBox tìm mã túi/barcode/khoa",
     "Filter nhóm máu",
     "DataTable đơn vị máu",
     "Pager",
     "badge trạng thái (Khả dụng/Đặt trước/Đã xuất/Hết hạn/Cách ly)"
    ]
   },
   {
    "name": "Ngân hàng máu - Tab Sắp hết hạn",
    "desc": "Bảng túi máu sắp hết hạn ≤7 ngày: Mã túi, Barcode, Nhóm, Chế phẩm, Thể tích, Người hiến, HSD (còn/hết N ngày, màu cảnh báo), Vị trí, Trạng thái; mỗi dòng có action Cấp phát + Tiêu huỷ.",
    "route_guess": "/v2/blood-bank",
    "elements": [
     "DataTable túi sắp hết hạn",
     "ActBtn Cấp phát",
     "ActBtn Tiêu huỷ",
     "drawer chi tiết túi",
     "modal xác nhận cấp phát",
     "modal xác nhận tiêu huỷ + ô lý do bắt buộc"
    ]
   },
   {
    "name": "Ngân hàng máu - Tab Yêu cầu xuất máu",
    "desc": "Bảng phiếu yêu cầu xuất máu: Mã YC, Bệnh nhân, Khoa yêu cầu, Lý do/Chỉ định, Mức độ (Thường/Khẩn/Cấp cứu), Trạng thái, Ngày YC; click mở drawer chi tiết.",
    "route_guess": "/v2/blood-bank",
    "elements": [
     "DataTable yêu cầu",
     "badge mức độ (chip crit/info)",
     "badge trạng thái",
     "drawer chi tiết yêu cầu",
     "empty state"
    ]
   },
   {
    "name": "Modal Tạo phiếu yêu cầu xuất máu",
    "desc": "Form tạo phiếu lĩnh máu: Khoa yêu cầu*, Nhóm máu, Rh, Chế phẩm*, Số lượng, Mức độ, Chỉ định lâm sàng.",
    "route_guess": "/v2/blood-bank (modal)",
    "elements": [
     "Select khoa (search)",
     "Select nhóm máu",
     "Select Rh",
     "Select chế phẩm",
     "InputNumber số lượng",
     "Select mức độ",
     "TextArea chỉ định",
     "nút Tạo phiếu/Hủy"
    ]
   },
   {
    "name": "Modal Nhận máu vào kho",
    "desc": "Form nhập kho từ nhà cung cấp: NCC*, Mã túi máu*, Người giao, Nhóm máu, Rh, Chế phẩm*, Thể tích, Ngày nhập/lấy máu*, Hạn sử dụng*, Ghi chú; mã túi auto-gen, HSD mặc định +42 ngày.",
    "route_guess": "/v2/blood-bank (modal)",
    "elements": [
     "Select NCC",
     "Input mã túi (auto-gen)",
     "Input người giao",
     "Select nhóm/Rh",
     "Select chế phẩm",
     "InputNumber thể tích",
     "DatePicker ngày nhập",
     "DatePicker HSD",
     "TextArea ghi chú",
     "nút Lưu/Hủy"
    ]
   },
   {
    "name": "Drawer chi tiết nhóm máu",
    "desc": "Tổng quan tồn theo nhóm (tổng/khả dụng/đặt trước/sắp HSD/đã hết hạn/tổng thể tích) + phân rã theo chế phẩm.",
    "route_guess": "/v2/blood-bank (drawer)",
    "elements": [
     "rec-section tổng quan",
     "danh sách theo chế phẩm",
     "chip khả dụng/đặt trước"
    ]
   },
   {
    "name": "Drawer chi tiết đơn vị/túi máu",
    "desc": "Thông tin 1 túi: mã, nhóm, chế phẩm, thể tích, vị trí, HSD, trạng thái (+ barcode, người hiến ở tab sắp hết hạn).",
    "route_guess": "/v2/blood-bank (drawer)",
    "elements": [
     "DrSec",
     "DrField các trường",
     "StatusBadge"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-BLD-001",
    "title": "Tải màn Ngân hàng máu - KPI + tab Kho máu hiển thị đúng",
    "category": "happy",
    "priority": "P0",
    "role": "Nhân viên ngân hàng máu",
    "preconditions": "Đăng nhập admin/Admin@123; có sẵn dữ liệu đơn vị máu trong kho.",
    "steps": [
     "Mở /v2/blood-bank",
     "Chờ tải xong (loading -> data)",
     "Quan sát KpiStrip 6 chỉ số",
     "Quan sát thanh chip 8 nhóm máu",
     "Quan sát bảng đơn vị máu tab Kho máu"
    ],
    "expected": "KpiStrip hiển thị đủ 6 ô (Tổng đơn vị, Khả dụng, Đặt trước, Hết hạn ≤7 ngày, Yêu cầu chờ, O- khả dụng) với số liệu khớp tổng từ bảng; chip nhóm máu hiển thị 8 nhóm kèm số đv khả dụng; bảng đơn vị máu liệt kê cột Mã đơn vị/Nhóm/Chế phẩm/Thể tích/Vị trí/HSD/Trạng thái; không có lỗi console.",
    "evidence": [
     {
      "name": "TC-BLD-001__s01__list",
      "caption": "Màn Kho máu tải đầy đủ KPI + chip + bảng",
      "uiState": "list"
     },
     {
      "name": "TC-BLD-001__s02__loading",
      "caption": "Trạng thái đang tải dữ liệu kho máu",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#239",
     "#242"
    ],
    "notes": "KPI O- khả dụng <5 phải tô màu crit (test ở task riêng)."
   },
   {
    "id": "TC-BLD-002",
    "title": "Nhận máu vào kho thành công (happy path nhập kho từ NCC)",
    "category": "happy",
    "priority": "P0",
    "role": "Nhân viên ngân hàng máu",
    "preconditions": "Đăng nhập; có ≥1 nhà cung cấp và ≥1 chế phẩm máu trong danh mục.",
    "steps": [
     "Mở /v2/blood-bank, bấm Nhận máu",
     "Chọn Nhà cung cấp",
     "Giữ/đổi Mã túi (auto-gen)",
     "Chọn Nhóm máu O, Rh +, Chế phẩm",
     "Nhập Thể tích 350",
     "Giữ Ngày nhập hôm nay, HSD +42 ngày",
     "Bấm Lưu"
    ],
    "expected": "Toast 'Đã nhập đơn vị máu <mã>'; modal đóng; bảng Kho máu reload và xuất hiện túi mới với Trạng thái Khả dụng; KPI Tổng đơn vị +1, Khả dụng +1.",
    "evidence": [
     {
      "name": "TC-BLD-002__s01__modal",
      "caption": "Modal Nhận máu vào kho",
      "uiState": "modal"
     },
     {
      "name": "TC-BLD-002__s02__form",
      "caption": "Form điền đầy đủ trước khi lưu",
      "uiState": "form"
     },
     {
      "name": "TC-BLD-002__s03__success",
      "caption": "Toast nhập máu thành công",
      "uiState": "success"
     },
     {
      "name": "TC-BLD-002__s04__list",
      "caption": "Túi máu mới xuất hiện trong bảng kho",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Kiểm tra data-consistency ở TC-BLD-021."
   },
   {
    "id": "TC-BLD-003",
    "title": "Tạo phiếu yêu cầu xuất máu thành công",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ điều trị / NV khoa lâm sàng",
    "preconditions": "Đăng nhập; có khoa và chế phẩm trong danh mục.",
    "steps": [
     "Mở /v2/blood-bank, bấm Xuất máu",
     "Chọn Khoa yêu cầu",
     "Chọn Nhóm máu, Rh, Chế phẩm",
     "Nhập Số lượng 2",
     "Chọn Mức độ Khẩn",
     "Nhập Chỉ định lâm sàng",
     "Bấm Tạo phiếu"
    ],
    "expected": "Toast 'Đã tạo phiếu yêu cầu xuất máu'; modal đóng; chuyển/refresh tab Yêu cầu xuất máu thấy phiếu mới trạng thái Pending/chờ duyệt; KPI 'Yêu cầu chờ' +1.",
    "evidence": [
     {
      "name": "TC-BLD-003__s01__modal",
      "caption": "Modal tạo phiếu yêu cầu xuất máu",
      "uiState": "modal"
     },
     {
      "name": "TC-BLD-003__s02__form",
      "caption": "Form phiếu điền đủ",
      "uiState": "form"
     },
     {
      "name": "TC-BLD-003__s03__success",
      "caption": "Toast tạo phiếu thành công",
      "uiState": "success"
     },
     {
      "name": "TC-BLD-003__s04__list",
      "caption": "Phiếu mới ở tab Yêu cầu trạng thái chờ",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239",
     "#242"
    ]
   },
   {
    "id": "TC-BLD-004",
    "title": "Cấp phát túi máu sắp hết hạn (happy)",
    "category": "happy",
    "priority": "P1",
    "role": "Nhân viên ngân hàng máu",
    "preconditions": "Có ≥1 túi máu trong tab Sắp hết hạn, trạng thái khả dụng.",
    "steps": [
     "Mở tab Sắp hết hạn",
     "Bấm action Cấp phát trên 1 túi",
     "Xác nhận trên modal",
     "Quan sát kết quả"
    ],
    "expected": "Toast 'Đã cấp phát túi máu <mã>'; modal đóng; danh sách reload; túi chuyển trạng thái Issued/đã xuất (biến mất khỏi danh sách khả dụng sắp hết hạn).",
    "evidence": [
     {
      "name": "TC-BLD-004__s01__confirm",
      "caption": "Modal xác nhận cấp phát túi máu",
      "uiState": "confirm"
     },
     {
      "name": "TC-BLD-004__s02__success",
      "caption": "Toast cấp phát thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-005",
    "title": "Tiêu huỷ túi máu hết hạn kèm lý do (happy)",
    "category": "happy",
    "priority": "P1",
    "role": "Nhân viên ngân hàng máu",
    "preconditions": "Có ≥1 túi máu trong tab Sắp hết hạn.",
    "steps": [
     "Mở tab Sắp hết hạn",
     "Bấm action Tiêu huỷ trên 1 túi",
     "Nhập lý do tiêu huỷ hợp lệ",
     "Bấm Xác nhận tiêu huỷ"
    ],
    "expected": "Toast 'Đã tiêu huỷ túi máu <mã>'; modal đóng; danh sách reload; túi không còn khả dụng.",
    "evidence": [
     {
      "name": "TC-BLD-005__s01__confirm",
      "caption": "Modal tiêu huỷ + ô lý do",
      "uiState": "confirm"
     },
     {
      "name": "TC-BLD-005__s02__success",
      "caption": "Toast tiêu huỷ thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-006",
    "title": "Tiêu huỷ túi máu KHÔNG nhập lý do bị chặn",
    "category": "validation",
    "priority": "P0",
    "role": "Nhân viên ngân hàng máu",
    "preconditions": "Có túi máu ở tab Sắp hết hạn.",
    "steps": [
     "Mở tab Sắp hết hạn",
     "Bấm Tiêu huỷ 1 túi",
     "Để trống ô lý do",
     "Bấm Xác nhận tiêu huỷ"
    ],
    "expected": "Hiện cảnh báo 'Cần nhập lý do tiêu huỷ'; KHÔNG gọi API; túi giữ nguyên trạng thái; modal vẫn mở.",
    "evidence": [
     {
      "name": "TC-BLD-006__s01__validation",
      "caption": "Cảnh báo bắt buộc nhập lý do tiêu huỷ",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-007",
    "title": "Validation phiếu xuất máu - thiếu Khoa yêu cầu",
    "category": "validation",
    "priority": "P0",
    "role": "NV khoa lâm sàng",
    "preconditions": "Mở modal Xuất máu.",
    "steps": [
     "Bấm Xuất máu",
     "Không chọn Khoa yêu cầu",
     "Chọn chế phẩm, nhập số lượng",
     "Bấm Tạo phiếu"
    ],
    "expected": "Cảnh báo 'Chọn khoa yêu cầu'; không gọi API tạo phiếu; modal vẫn mở.",
    "evidence": [
     {
      "name": "TC-BLD-007__s01__validation",
      "caption": "Cảnh báo thiếu khoa yêu cầu",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-008",
    "title": "Validation phiếu xuất máu - thiếu Chế phẩm",
    "category": "validation",
    "priority": "P1",
    "role": "NV khoa lâm sàng",
    "preconditions": "Mở modal Xuất máu, đã chọn khoa.",
    "steps": [
     "Chọn Khoa",
     "Bỏ trống Chế phẩm",
     "Nhập số lượng 1",
     "Bấm Tạo phiếu"
    ],
    "expected": "Cảnh báo 'Chọn chế phẩm máu'; không gọi API; modal vẫn mở.",
    "evidence": [
     {
      "name": "TC-BLD-008__s01__validation",
      "caption": "Cảnh báo thiếu chế phẩm",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-009",
    "title": "Validation phiếu xuất máu - số lượng 0/âm",
    "category": "validation",
    "priority": "P1",
    "role": "NV khoa lâm sàng",
    "preconditions": "Mở modal Xuất máu, đã chọn khoa + chế phẩm.",
    "steps": [
     "Chọn khoa + chế phẩm",
     "Nhập Số lượng = 0",
     "Bấm Tạo phiếu",
     "Thử nhập số âm và lặp lại"
    ],
    "expected": "Cảnh báo 'Nhập số lượng' khi qty<=0; InputNumber min=1 chặn nhập số <1; không gọi API tạo phiếu.",
    "evidence": [
     {
      "name": "TC-BLD-009__s01__validation",
      "caption": "Cảnh báo số lượng không hợp lệ",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-010",
    "title": "Validation Nhận máu - thiếu NCC / mã túi / thể tích / ngày",
    "category": "validation",
    "priority": "P0",
    "role": "NV ngân hàng máu",
    "preconditions": "Mở modal Nhận máu.",
    "steps": [
     "Bấm Nhận máu",
     "Lần lượt bỏ trống từng trường bắt buộc (NCC, Mã túi, Chế phẩm, Thể tích, Ngày nhập, HSD) và bấm Lưu",
     "Quan sát từng thông báo"
    ],
    "expected": "Mỗi trường thiếu hiện đúng cảnh báo tương ứng (Chọn nhà cung cấp / Nhập mã túi máu / Chọn chế phẩm máu / Nhập thể tích / Chọn ngày nhập / Chọn hạn sử dụng); không gọi API cho tới khi đủ.",
    "evidence": [
     {
      "name": "TC-BLD-010__s01__validation",
      "caption": "Cảnh báo thiếu nhà cung cấp",
      "uiState": "validation"
     },
     {
      "name": "TC-BLD-010__s02__validation",
      "caption": "Cảnh báo thiếu mã túi/thể tích",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-011",
    "title": "Edge: HSD trước ngày nhập / ngày quá khứ khi nhận máu",
    "category": "edge",
    "priority": "P0",
    "role": "NV ngân hàng máu",
    "preconditions": "Mở modal Nhận máu.",
    "steps": [
     "Điền NCC, mã túi, chế phẩm, thể tích",
     "Đặt Ngày nhập = hôm nay",
     "Đặt HSD = ngày hôm qua (trước ngày nhập)",
     "Bấm Lưu",
     "Thử HSD = ngày rất xa tương lai (vd +9999 ngày)"
    ],
    "expected": "Hệ thống nên chặn HSD <= ngày nhập (máu hết hạn không thể nhập) và cảnh báo rõ; HSD quá xa nên cảnh báo hoặc chặn. Nếu hiện KHÔNG validate -> ghi nhận là bug (BE/FE) và tạo task fix liên kết.",
    "evidence": [
     {
      "name": "TC-BLD-011__s01__edge",
      "caption": "Nhập HSD trước ngày nhập",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "FE hiện chỉ check HSD non-empty (dòng 745). Nếu không có ràng buộc HSD>ngày nhập -> bug an toàn dữ liệu."
   },
   {
    "id": "TC-BLD-012",
    "title": "Edge: thể tích biên (1, rất lớn) khi nhận máu",
    "category": "edge",
    "priority": "P2",
    "role": "NV ngân hàng máu",
    "preconditions": "Mở modal Nhận máu.",
    "steps": [
     "Điền các trường bắt buộc",
     "Nhập Thể tích = 1",
     "Lưu, quan sát",
     "Lặp với Thể tích = 999999"
    ],
    "expected": "Thể tích =1 lưu được nhưng hiển thị đúng định dạng mL; thể tích cực lớn (vô lý cho 1 túi máu, thực tế ~250-450mL) nên có cảnh báo/giới hạn hợp lý. Format hiển thị 'N mL' với tách nghìn vi-VN.",
    "evidence": [
     {
      "name": "TC-BLD-012__s01__edge",
      "caption": "Thể tích biên hiển thị trong bảng",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-013",
    "title": "Negative: hủy modal Nhận máu giữa chừng không tạo dữ liệu",
    "category": "negative",
    "priority": "P1",
    "role": "NV ngân hàng máu",
    "preconditions": "Mở modal Nhận máu.",
    "steps": [
     "Bấm Nhận máu",
     "Điền một phần dữ liệu",
     "Bấm Hủy",
     "Mở lại modal"
    ],
    "expected": "Modal đóng, không tạo túi mới (KPI/bảng không đổi); mở lại form reset về mặc định (mã túi auto-gen mới, nhóm O, Rh+, thể tích 350, HSD +42d).",
    "evidence": [
     {
      "name": "TC-BLD-013__s01__modal",
      "caption": "Modal sau khi hủy mở lại đã reset",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-014",
    "title": "Negative: tạo phiếu khi backend lỗi -> hiện toast lỗi, không treo",
    "category": "negative",
    "priority": "P1",
    "role": "NV khoa lâm sàng",
    "preconditions": "Giả lập BE trả lỗi 500 cho createIssueRequest (intercept).",
    "steps": [
     "Mở modal Xuất máu, điền đủ",
     "Bấm Tạo phiếu trong khi BE lỗi",
     "Quan sát"
    ],
    "expected": "Toast 'Tạo phiếu xuất máu thất bại'; nút thoát trạng thái busy (không kẹt 'Đang lưu…'); modal vẫn mở để thử lại; không có dòng phiếu rác.",
    "evidence": [
     {
      "name": "TC-BLD-014__s01__error",
      "caption": "Toast lỗi tạo phiếu xuất máu",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-015",
    "title": "Lọc theo nhóm máu qua chip + filter đồng bộ",
    "category": "happy",
    "priority": "P1",
    "role": "NV ngân hàng máu",
    "preconditions": "Có đơn vị máu nhiều nhóm.",
    "steps": [
     "Tab Kho máu",
     "Bấm chip nhóm 'O-'",
     "Quan sát bảng + Filter dropdown",
     "Bấm lại chip 'O-' để bỏ lọc",
     "Dùng Filter dropdown chọn 'AB+'"
    ],
    "expected": "Bấm chip lọc bảng chỉ còn nhóm đó + đồng bộ giá trị Filter; bấm lại chip bỏ lọc; chọn Filter cập nhật bảng; page reset về 0 mỗi lần đổi lọc.",
    "evidence": [
     {
      "name": "TC-BLD-015__s01__filter",
      "caption": "Lọc theo chip nhóm máu O-",
      "uiState": "filter"
     },
     {
      "name": "TC-BLD-015__s02__dropdown",
      "caption": "Filter dropdown nhóm máu",
      "uiState": "dropdown"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-016",
    "title": "Tìm kiếm mã túi/barcode/khoa + dấu tiếng Việt + ký tự đặc biệt",
    "category": "edge",
    "priority": "P2",
    "role": "NV ngân hàng máu",
    "preconditions": "Có dữ liệu kho + người hiến tên tiếng Việt có dấu.",
    "steps": [
     "Tab Sắp hết hạn",
     "Gõ tên người hiến có dấu (vd 'Nguyễn')",
     "Gõ chuỗi rất dài (>200 ký tự)",
     "Gõ ký tự đặc biệt '<script>' và '%_'",
     "Quan sát"
    ],
    "expected": "Tìm theo dấu tiếng Việt khớp đúng; chuỗi dài không vỡ layout; ký tự đặc biệt được coi là text thường (không thực thi, không lỗi), kết quả rỗng -> empty state; không XSS.",
    "evidence": [
     {
      "name": "TC-BLD-016__s01__filter",
      "caption": "Tìm kiếm theo tên có dấu",
      "uiState": "filter"
     },
     {
      "name": "TC-BLD-016__s02__empty",
      "caption": "Không có kết quả khớp",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-017",
    "title": "Empty state mỗi tab khi không có dữ liệu",
    "category": "ui",
    "priority": "P1",
    "role": "NV ngân hàng máu",
    "preconditions": "Kho rỗng hoặc lọc không khớp.",
    "steps": [
     "Lọc nhóm máu không tồn tại ở tab Kho máu",
     "Chuyển tab Sắp hết hạn (không có túi)",
     "Chuyển tab Yêu cầu (không có phiếu)"
    ],
    "expected": "Tab Kho máu: empty 'Không có đơn vị máu'; tab Sắp hết hạn: 'Không có túi máu nào sắp hết hạn'; tab Yêu cầu: 'Chưa có yêu cầu xuất máu'; mỗi empty có icon đúng, không lỗi.",
    "evidence": [
     {
      "name": "TC-BLD-017__s01__empty",
      "caption": "Empty tab Kho máu",
      "uiState": "empty"
     },
     {
      "name": "TC-BLD-017__s02__empty",
      "caption": "Empty tab Sắp hết hạn",
      "uiState": "empty"
     },
     {
      "name": "TC-BLD-017__s03__empty",
      "caption": "Empty tab Yêu cầu",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-018",
    "title": "Dark/light parity màn Ngân hàng máu",
    "category": "ui",
    "priority": "P2",
    "role": "NV ngân hàng máu",
    "preconditions": "Đăng nhập, có dữ liệu kho.",
    "steps": [
     "Mở /v2/blood-bank ở light mode",
     "Toggle dark mode trên topbar",
     "Mở drawer chi tiết túi + modal Nhận máu ở dark",
     "So sánh tương phản chip nhóm máu, StatusBadge, màu cảnh báo HSD"
    ],
    "expected": "Cả 2 theme: chữ/nền đủ tương phản; chip nhóm máu (crit), StatusBadge, màu HSD (crit/warn dùng var(--s-crit)/(--s-warn)) đọc được; modal/drawer không bị nền trắng cứng ở dark.",
    "evidence": [
     {
      "name": "TC-BLD-018__s01__list",
      "caption": "Kho máu light mode",
      "uiState": "list"
     },
     {
      "name": "TC-BLD-018__s02__list",
      "caption": "Kho máu dark mode",
      "uiState": "list"
     },
     {
      "name": "TC-BLD-018__s03__drawer",
      "caption": "Drawer chi tiết túi ở dark",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-019",
    "title": "Định dạng số/thể tích/ngày đúng locale vi-VN",
    "category": "ui",
    "priority": "P2",
    "role": "NV ngân hàng máu",
    "preconditions": "Có đơn vị máu thể tích lớn + drawer chi tiết nhóm.",
    "steps": [
     "Mở drawer chi tiết 1 nhóm máu có tổng thể tích lớn (vd 12345 mL)",
     "Quan sát cột HSD ở bảng",
     "Mở drawer túi xem ngày HSD"
    ],
    "expected": "Tổng thể tích hiển thị '12.345 mL' (tách nghìn vi-VN); ngày HSD định dạng DD/MM/YYYY; số ngày còn lại hiển thị '· Nd' với màu theo ngưỡng <7 crit, <30 warn.",
    "evidence": [
     {
      "name": "TC-BLD-019__s01__drawer",
      "caption": "Drawer chi tiết nhóm máu định dạng vi-VN",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-020",
    "title": "KPI O- khả dụng tô cảnh báo khi <5 đơn vị",
    "category": "data-consistency",
    "priority": "P1",
    "role": "NV ngân hàng máu",
    "preconditions": "Dữ liệu sao cho O- khả dụng <5.",
    "steps": [
     "Đảm bảo kho O- <5 đv khả dụng",
     "Mở /v2/blood-bank",
     "Quan sát ô KPI 'O- khả dụng' và chip nhóm 'O-'"
    ],
    "expected": "Ô KPI 'O- khả dụng' tone crit (đỏ); số khớp tổng available của nhóm O-; chip nhóm O- chữ màu crit khi <5. Nếu >=5 thì tone ok.",
    "evidence": [
     {
      "name": "TC-BLD-020__s01__list",
      "caption": "KPI O- cảnh báo crit khi thiếu",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239",
     "#242"
    ]
   },
   {
    "id": "TC-BLD-021",
    "title": "Data-consistency: nhận máu -> kho/KPI/chip cập nhật đồng bộ",
    "category": "data-consistency",
    "priority": "P0",
    "role": "NV ngân hàng máu",
    "preconditions": "Ghi nhận KPI Tổng/Khả dụng + số chip nhóm O+ trước thao tác.",
    "steps": [
     "Ghi lại KPI Tổng đơn vị, Khả dụng, chip O+",
     "Nhận 1 túi máu O+ thành công",
     "Quan sát KPI + chip + bảng sau reload"
    ],
    "expected": "KPI Tổng đơn vị +1, Khả dụng +1; chip O+ +1 đv; bảng có dòng mới trạng thái Khả dụng; số liệu 3 nơi (KPI, chip, bảng) nhất quán.",
    "evidence": [
     {
      "name": "TC-BLD-021__s01__list",
      "caption": "Trước khi nhận máu (số liệu gốc)",
      "uiState": "list"
     },
     {
      "name": "TC-BLD-021__s02__list",
      "caption": "Sau khi nhận máu số liệu tăng đồng bộ",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-022",
    "title": "State: duyệt/từ chối phiếu yêu cầu xuất máu (luồng trạng thái)",
    "category": "state",
    "priority": "P0",
    "role": "NV ngân hàng máu (người duyệt)",
    "preconditions": "Có phiếu yêu cầu trạng thái Pending; BE có approve/reject (api/bloodBank: approveIssueRequest/rejectIssueRequest).",
    "steps": [
     "Mở tab Yêu cầu, chọn phiếu Pending",
     "Thực hiện Duyệt phiếu (qua UI nếu có; nếu UI chưa có nút -> ghi gap)",
     "Thử Từ chối 1 phiếu khác kèm lý do",
     "Quan sát chuyển trạng thái"
    ],
    "expected": "Phiếu Pending -> Approved sau duyệt; Pending -> Rejected kèm lý do; KHÔNG cho duyệt phiếu đã Approved/Rejected/Cancelled (chặn chuyển trạng thái không hợp lệ); KPI 'Yêu cầu chờ' giảm. Nếu UI v2 thiếu nút duyệt/từ chối -> tạo task fix liên kết (gap UI).",
    "evidence": [
     {
      "name": "TC-BLD-022__s01__drawer",
      "caption": "Drawer phiếu trạng thái Pending",
      "uiState": "drawer"
     },
     {
      "name": "TC-BLD-022__s02__state",
      "caption": "Phiếu sau khi duyệt chuyển Approved",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#242"
    ],
    "notes": "UI v2 hiện CHỈ hiển thị danh sách/drawer phiếu, CHƯA có nút Duyệt/Từ chối (xem gaps). Backend đã có endpoint."
   },
   {
    "id": "TC-BLD-023",
    "title": "Patient-safety: đối chiếu nhóm máu/Rh BN trước truyền (cross-match)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ/điều dưỡng truyền máu",
    "preconditions": "Có lệnh truyền (BloodOrder) gán túi máu; BE có recordCrossMatchResult + startTransfusion.",
    "steps": [
     "Mở lệnh truyền của bệnh nhân",
     "Gán túi máu nhóm KHÔNG tương thích với BN (vd BN O, túi A)",
     "Thử ghi cross-match / bắt đầu truyền",
     "Quan sát"
    ],
    "expected": "Hệ thống CẢNH BÁO/CHẶN khi nhóm máu túi không tương thích BN (an toàn truyền máu - NOTES blood); chỉ cho start-transfusion khi cross-match hợp lệ. Nếu không có kiểm tra tương thích -> BUG patient-safety nghiêm trọng, tạo task fix P0 liên kết.",
    "evidence": [
     {
      "name": "TC-BLD-023__s01__validation",
      "caption": "Cảnh báo nhóm máu không tương thích",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#242"
    ],
    "notes": "GAP lớn: UI v2 chưa lộ luồng order/cross-match/transfusion dù BE có. Đây là ràng buộc an toàn cốt lõi của phân hệ (rel: đối chiếu nhóm máu BN)."
   },
   {
    "id": "TC-BLD-024",
    "title": "State: ghi phản ứng truyền máu + hoàn tất truyền",
    "category": "state",
    "priority": "P1",
    "role": "Điều dưỡng truyền máu",
    "preconditions": "Có lệnh truyền đã start (BE recordTransfusionReaction/completeTransfusion).",
    "steps": [
     "Mở lệnh đang truyền",
     "Ghi phản ứng truyền máu (sốt/dị ứng…)",
     "Hoàn tất truyền kèm ghi chú",
     "Quan sát trạng thái"
    ],
    "expected": "Phản ứng được lưu gắn với túi/lệnh; truyền chuyển sang Completed; không cho complete khi chưa start. UI v2 nếu thiếu -> gap/task fix.",
    "evidence": [
     {
      "name": "TC-BLD-024__s01__form",
      "caption": "Form ghi phản ứng truyền máu",
      "uiState": "form"
     },
     {
      "name": "TC-BLD-024__s02__state",
      "caption": "Truyền chuyển trạng thái hoàn tất",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#242"
    ],
    "notes": "GAP UI v2 (xem gaps)."
   },
   {
    "id": "TC-BLD-025",
    "title": "Permission: vai trò không đủ quyền bị chặn menu/nút/API",
    "category": "permission",
    "priority": "P0",
    "role": "User vai trò hạn chế (không phải NV ngân hàng máu)",
    "preconditions": "Có tài khoản role chỉ-xem hoặc không thuộc ngân hàng máu (tham chiếu matrix #216).",
    "steps": [
     "Đăng nhập role hạn chế",
     "Vào /v2/blood-bank (nếu menu hiện)",
     "Thử bấm Nhận máu / Xuất máu / Tiêu huỷ",
     "Gọi trực tiếp API /BloodBankComplete/* bằng token role đó"
    ],
    "expected": "Menu/nút mutation bị ẩn hoặc chặn theo matrix; API trả 403 với token không đủ quyền (không chỉ dựa ẩn UI). Nếu API cho qua dù UI ẩn -> bug bảo mật, tạo task fix.",
    "evidence": [
     {
      "name": "TC-BLD-025__s01__permission",
      "caption": "Nút/menu mutation bị chặn với role hạn chế",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-BLD-026",
    "title": "Security: IDOR xem phiếu/đơn vị máu của BN/khoa khác",
    "category": "security",
    "priority": "P0",
    "role": "User role khoa A",
    "preconditions": "Biết requestId/bloodBagId thuộc khoa/BN khác.",
    "steps": [
     "Đăng nhập role khoa A",
     "Gọi getIssueRequest(requestId của khoa B) / getBloodBag(id khác) qua API",
     "Quan sát phản hồi"
    ],
    "expected": "Hệ thống không cho user role hạn chế đọc dữ liệu ngoài phạm vi nếu nghiệp vụ yêu cầu phân tách; tối thiểu mọi truy cập có kiểm soát quyền + ghi audit. Nếu trả thẳng dữ liệu BN khác không kiểm soát -> bug IDOR, tạo task fix.",
    "evidence": [
     {
      "name": "TC-BLD-026__s01__permission",
      "caption": "Phản hồi API khi truy cập chéo phạm vi",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-BLD-027",
    "title": "Security: XSS ở field ghi chú/chỉ định/lý do tiêu huỷ",
    "category": "security",
    "priority": "P1",
    "role": "NV ngân hàng máu",
    "preconditions": "Mở các form có TextArea (Chỉ định, Ghi chú nhập máu, Lý do tiêu huỷ).",
    "steps": [
     "Nhập payload '<img src=x onerror=alert(1)>' vào Chỉ định khi tạo phiếu",
     "Lưu, mở lại drawer chi tiết phiếu",
     "Lặp với Ghi chú nhập máu và Lý do tiêu huỷ"
    ],
    "expected": "Payload hiển thị dưới dạng text thuần (escape), KHÔNG thực thi script; không alert; lưu/hiển thị an toàn ở drawer.",
    "evidence": [
     {
      "name": "TC-BLD-027__s01__detail",
      "caption": "Ghi chú chứa payload hiển thị dạng text",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-BLD-028",
    "title": "Audit log ghi đúng mọi mutation (nhận/xuất/cấp/tiêu huỷ)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Admin / kiểm toán",
    "preconditions": "Quyền xem audit log; thực hiện 1 chuỗi thao tác.",
    "steps": [
     "Thực hiện: nhận máu, tạo phiếu, cấp phát, tiêu huỷ (kèm lý do)",
     "Mở audit log / kiểm tra bản ghi",
     "Đối chiếu CreatedBy là user thật (≠ Guid.Empty)"
    ],
    "expected": "Mỗi mutation sinh 1 bản ghi audit với hành động, đối tượng (mã túi/phiếu), user thực hiện, thời gian, lý do (với tiêu huỷ); CreatedBy là user đăng nhập, không phải Guid.Empty.",
    "evidence": [
     {
      "name": "TC-BLD-028__s01__detail",
      "caption": "Bản ghi audit cho thao tác tiêu huỷ kèm lý do",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#216",
     "#242"
    ]
   },
   {
    "id": "TC-BLD-029",
    "title": "Negative: cấp phát/tiêu huỷ khi BE lỗi hoặc túi đã đổi trạng thái",
    "category": "negative",
    "priority": "P1",
    "role": "NV ngân hàng máu",
    "preconditions": "Túi ở tab Sắp hết hạn; giả lập BE lỗi hoặc túi vừa bị xuất bởi phiên khác.",
    "steps": [
     "Mở tab Sắp hết hạn",
     "Bấm Cấp phát 1 túi nhưng BE trả lỗi",
     "Quan sát",
     "Lặp cho Tiêu huỷ"
    ],
    "expected": "Toast 'Cấp phát thất bại'/'Tiêu huỷ thất bại'; nút thoát trạng thái loading; modal đóng/giữ hợp lý; danh sách reload phản ánh trạng thái thực; không double-action.",
    "evidence": [
     {
      "name": "TC-BLD-029__s01__error",
      "caption": "Toast lỗi khi cấp phát thất bại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ]
   },
   {
    "id": "TC-BLD-030",
    "title": "Phân trang tab Kho máu khi nhiều đơn vị (>16/trang)",
    "category": "edge",
    "priority": "P2",
    "role": "NV ngân hàng máu",
    "preconditions": "Kho có >16 đơn vị máu khả dụng.",
    "steps": [
     "Tab Kho máu",
     "Quan sát Pager (PAGE_SIZE=16)",
     "Sang trang 2",
     "Đổi lọc nhóm máu rồi quan sát page reset"
    ],
    "expected": "Pager hiển thị đúng tổng/tổng trang; chuyển trang đúng dữ liệu; đổi lọc/tab reset page về 0; số 'N đơn vị' khớp tổng đã lọc.",
    "evidence": [
     {
      "name": "TC-BLD-030__s01__list",
      "caption": "Phân trang tab Kho máu trang 2",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ]
   }
  ],
  "ui_state_checklist": [
   "list - bảng Kho máu / Sắp hết hạn / Yêu cầu xuất máu",
   "loading - đang tải dữ liệu các tab",
   "empty - mỗi tab không có dữ liệu (3 thông điệp khác nhau)",
   "error - toast lỗi tạo phiếu / nhập máu / cấp phát / tiêu huỷ",
   "modal - Nhận máu, Xuất máu",
   "form - form điền trong modal Nhận/Xuất máu, ghi phản ứng truyền",
   "confirm - modal xác nhận Cấp phát / Tiêu huỷ",
   "validation - cảnh báo thiếu trường bắt buộc / lý do tiêu huỷ / nhóm máu không tương thích",
   "success - toast nhập/tạo phiếu/cấp phát/tiêu huỷ thành công",
   "drawer - chi tiết nhóm máu / đơn vị-túi máu / yêu cầu xuất máu",
   "filter - lọc theo chip nhóm máu + tìm kiếm",
   "dropdown - Filter nhóm máu / Select khoa/chế phẩm/NCC",
   "detail - giá trị hiển thị (định dạng số/ngày/thể tích, audit, trạng thái sau chuyển)",
   "permission - menu/nút/API bị chặn theo role",
   "state - chuyển trạng thái phiếu (Pending->Approved/Rejected), truyền (start->complete)",
   "KPI strip - 6 chỉ số + tô màu cảnh báo O-/sắp hết hạn",
   "dark/light parity - tương phản chip/badge/màu cảnh báo HSD ở 2 theme"
  ],
  "gaps": [
   "UI v2 (pages-v2/BloodBank.tsx) CHỈ có 3 tab stock/expiring/requests + nhận/xuất/cấp/tiêu huỷ; CHƯA lộ các luồng cốt lõi mà backend đã có: (a) Duyệt/Từ chối phiếu yêu cầu (approveIssueRequest/rejectIssueRequest), (b) Lệnh truyền BloodOrder + gán túi (assign/unassignBloodBag), (c) Cross-match đối chiếu nhóm máu/Rh (recordCrossMatchResult) — ĐÂY LÀ RÀNG BUỘC AN TOÀN TRUYỀN MÁU cốt lõi của phân hệ, (d) start/completeTransfusion, (e) recordTransfusionReaction. Cần task fix/feature port các luồng này lên v2.",
   "Quản lý NGƯỜI HIẾN MÁU (BloodDonors) và quy trình hiến/sàng lọc CHƯA có màn hình v2 nào dù là 1 trong 4 bảng chính (comment trong code: 'skip donor + screening tabs'). Thiếu toàn bộ test happy/validation/state cho hiến máu.",
   "Thiếu màn KIỂM KÊ (inventory: createInventory/completeInventory/approveInventory) và BÁO CÁO nhập/xuất/tồn/thẻ kho (getStockCard, getInventoryReport, print*) trên UI v2 — backend đã có, chưa test được qua UI.",
   "Validation HSD: FE chỉ kiểm tra HSD non-empty, KHÔNG ràng buộc HSD > ngày nhập/lấy máu — rủi ro nhập túi máu đã/sắp hết hạn (an toàn dữ liệu). Cần xác nhận BE có chặn không.",
   "Chưa rõ ràng buộc tương thích nhóm máu BN<->túi máu được thực thi ở BE hay không (cross-match). Nếu thiếu là bug patient-safety P0. Test TC-BLD-023 cần verify endpoint, có thể thiếu cả UI lẫn rule BE.",
   "Data-consistency với phân hệ liên quan (RELATED_X blood: ipd, surgery, lis): chưa có test việc xuất/truyền máu phản ánh vào chi phí viện phí (billing) hay hồ sơ nội trú (ipd) — luồng FLOWS transfusion bước 'Theo dõi'->ipd. Cần task integration khi UI lệnh truyền sẵn sàng.",
   "Phân quyền chi tiết theo matrix #216 cho từng hành động (nhận/duyệt/cấp/tiêu huỷ/truyền) chưa được tài liệu hoá rõ ai làm gì — test permission TC-BLD-025/026 cần matrix cụ thể để khẳng định pass/fail.",
   "Mức độ phiếu: code so sánh 'STAT'/'urgent' (RequestsTab) trong khi modal tạo dùng 'Routine/Urgent/Emergency' — không nhất quán giá trị urgency giữa tạo và hiển thị, có thể làm badge mức độ sai màu (tiềm ẩn bug, nên test + tạo fix)."
  ]
 },
 {
  "id": "emr",
  "code": "EMR",
  "layer": "clin",
  "ic": "✍️",
  "nm": "HSĐT & Ký số",
  "gh": [
   "#258",
   "#259"
  ],
  "gap": false,
  "module_id": "emr",
  "summary": "Phân hệ \"HSĐT & Ký số\" (id=emr, code=EMR, lớp clin) quản lý Bệnh án điện tử: cấu trúc HSĐT (EmrSpines/EmrSpineSections, EmrDocumentGroups/EmrDocumentTypes, EmrCoverTypes, SpecialtyEmrs), nội dung & đính kèm (EmrEditor SOAP/Vitals/Thuốc/Diễn biến, EmrImages, EmrDocumentAttachments, EmrDataTags, Shortcodes), finalize/khóa nội dung theo TT46 dùng EmrFinalizedAt (KHÔNG dùng IsClosed của billing) với vết sửa EmrAmendments + EmrCloseLogs, và toàn bộ luồng ký số: SigningRequests→SigningTransactions→DocumentSignatures qua USB token (ManagedCertificates/TokenUserMappings)/TOTP (SigningTotpSecrets) hoặc sinh trắc bệnh nhân (PatientSignatures/BiometricCredentials/WebAuthnCredentials/BiometricSignatureLogs). Bổ trợ: chia sẻ/trích sao (EmrShares/EmrShareAccessLogs/EmrExtracts), tự kiểm (EmrAutoCheckRules), liên thông (CdaDocuments, HL7 export, EmrCloudSyncLogs), log in (EmrPrintLogs). Màn chính (route thực): /v2/emr (danh sách HSBA + mẫu), /v2/emr/edit (EmrEditor), /v2/emr-extract, /v2/emr-data-tags, /v2/emr-cloud-sync, /v2/emr-hl7-export, /v2/signing-workflow, /v2/central-signing, /v2/digital-signature, /v2/biometric-enrollment. Liên kết chéo (RELATED_X): opd, ipd, national, reports.",
  "screens": [
   {
    "name": "Danh sách HSBA (EMR list)",
    "desc": "Danh sách hồ sơ bệnh án điện tử theo bệnh nhân/đợt điều trị, lọc theo trạng thái finalize/ký; điểm vào EmrEditor và luồng ký. Có nút quản lý Mẫu HSBA (ClinicalTemplate).",
    "route_guess": "/v2/emr",
    "elements": [
     "KpiStrip (tổng HSĐT/chưa ký/đã finalize)",
     "StatusTabs theo trạng thái",
     "DataTable cột BN/đợt/loại HSĐT/trạng thái finalize/ký",
     "ActBtn Mở hồ sơ (/v2/emr/edit)",
     "Btn Tạo HSĐT",
     "Btn Tới luồng ký số (/v2/signing-workflow)",
     "Modal Quản lý Mẫu HSBA (ClinicalTemplate)"
    ]
   },
   {
    "name": "Soạn thảo HSĐT (EmrEditor)",
    "desc": "Trình soạn bệnh án: SOAP, sinh hiệu (Vitals), thuốc, diễn biến; chèn theo EmrSpine/Section, dùng Shortcode/EmrDataTags; finalize (EmrFinalizedAt/TT46) và mở luồng ký. Deep-link ?patientId= từ màn khác (LIS/OPD).",
    "route_guess": "/v2/emr/edit",
    "elements": [
     "DrawerShell/section khung HSĐT (EmrSpineSections)",
     "Form SOAP/Vitals/Thuốc/Diễn biến",
     "Dropdown chèn Shortcode/EmrDataTags",
     "Btn Đính kèm (EmrDocumentAttachments)",
     "Btn Finalize/Khóa nội dung (EmrFinalizedAt)",
     "Btn Tới luồng ký số",
     "EmrSigningChainDrawer (chuỗi ký)",
     "Banner cảnh báo dị ứng/chống chỉ định"
    ]
   },
   {
    "name": "Quy trình ký (Signing Workflow)",
    "desc": "Tạo & theo dõi SigningRequests → SigningTransactions → DocumentSignatures; chọn người ký (EmrSignerCatalogs), vai trò ký (EmrSigningRoles), thao tác ký (EmrSigningOperations); ký bằng USB token/TOTP.",
    "route_guess": "/v2/signing-workflow",
    "elements": [
     "StatusTabs (Chờ ký/Đang ký/Đã ký/Từ chối)",
     "DataTable yêu cầu ký",
     "Drawer chi tiết chuỗi ký",
     "Btn Ký (token/TOTP)",
     "Modal nhập PIN/TOTP",
     "Btn Từ chối ký + lý do",
     "DocumentLocks/DocumentHolds indicator"
    ]
   },
   {
    "name": "Ký số tập trung (Central Signing)",
    "desc": "Ký hàng loạt nhiều tài liệu qua chứng thư số tập trung (ManagedCertificates), map USB token–user (TokenUserMappings).",
    "route_guess": "/v2/central-signing",
    "elements": [
     "DataTable danh sách tài liệu chờ ký",
     "Checkbox chọn nhiều",
     "Btn Ký hàng loạt",
     "Select chứng thư số",
     "Toast kết quả ký từng tài liệu"
    ]
   },
   {
    "name": "Chữ ký số (Digital Signature / chứng thư)",
    "desc": "Quản lý chứng thư số (ManagedCertificates), TokenUserMappings, bí mật TOTP (SigningTotpSecrets).",
    "route_guess": "/v2/digital-signature",
    "elements": [
     "DataTable chứng thư (hiệu lực/hết hạn)",
     "Btn Thêm/Map token",
     "Form cấu hình TOTP",
     "Tag trạng thái chứng thư"
    ]
   },
   {
    "name": "Đăng ký sinh trắc BN (Biometric/WebAuthn)",
    "desc": "Bệnh nhân đăng ký vân tay/khuôn mặt (BiometricCredentials/WebAuthnCredentials) để ký HSĐT; log ký (BiometricSignatureLogs/PatientSignatures).",
    "route_guess": "/v2/biometric-enrollment",
    "elements": [
     "Form chọn BN",
     "Btn Đăng ký vân tay (navigator.credentials.create)",
     "Btn Ký sinh trắc",
     "DataTable credential đã đăng ký",
     "Error state HTTPS/RpId"
    ]
   },
   {
    "name": "Trích lục/Trích sao HSĐT (EMR Extract)",
    "desc": "Tạo bản trích sao HSĐT (EmrExtracts), in/log in (EmrPrintLogs).",
    "route_guess": "/v2/emr-extract",
    "elements": [
     "DataTable bản trích sao",
     "Btn Tạo trích sao",
     "Modal chọn phạm vi tài liệu",
     "Btn In + log EmrPrintLogs"
    ]
   },
   {
    "name": "Thẻ dữ liệu EMR (Data Tags)",
    "desc": "Quản lý EmrDataTags + Shortcodes dùng chèn nhanh trong EmrEditor.",
    "route_guess": "/v2/emr-data-tags",
    "elements": [
     "DataTable thẻ/mã tắt",
     "Btn Thêm/Sửa/Xóa",
     "Form code + nội dung thay thế"
    ]
   },
   {
    "name": "Đồng bộ EMR lên Cloud",
    "desc": "Đồng bộ HSĐT lên cloud (EmrCloudSyncLogs), liên thông quốc gia (CdaDocuments).",
    "route_guess": "/v2/emr-cloud-sync",
    "elements": [
     "DataTable log đồng bộ",
     "StatusTabs (Thành công/Lỗi/Chờ)",
     "Btn Đồng bộ lại",
     "Error detail"
    ]
   },
   {
    "name": "Xuất HL7 v2 HSBA",
    "desc": "Xuất HL7 v2 / CDA HSĐT phục vụ liên thông.",
    "route_guess": "/v2/emr-hl7-export",
    "elements": [
     "Form chọn HSĐT/phạm vi",
     "Btn Xuất HL7",
     "Preview message",
     "Toast/Download kết quả"
    ]
   },
   {
    "name": "Chia sẻ HSĐT (EMR Shares)",
    "desc": "Chia sẻ HSĐT cho người dùng/đơn vị khác (EmrShares) + log truy cập (EmrShareAccessLogs).",
    "route_guess": "/v2/emr",
    "elements": [
     "Modal chia sẻ",
     "Select người nhận + phạm vi/thời hạn",
     "DataTable log truy cập chia sẻ",
     "Btn Thu hồi chia sẻ"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-EMR-001",
    "title": "Tạo HSĐT mới cho bệnh nhân từ danh sách EMR (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Đăng nhập admin/Admin@123; có sẵn 1 bệnh nhân + đợt điều trị OPD; đang ở /v2/emr.",
    "steps": [
     "Mở /v2/emr",
     "Bấm Tạo HSĐT",
     "Chọn bệnh nhân + loại HSĐT (EmrDocumentType) + khung HSĐT (EmrSpine)",
     "Lưu",
     "Quan sát hồ sơ mới xuất hiện đầu danh sách"
    ],
    "expected": "HSĐT được tạo, hiển thị trong DataTable với trạng thái 'Chưa finalize / Chưa ký', toast thành công; bản ghi có CreatedBy là user thật (≠ Guid.Empty).",
    "evidence": [
     {
      "name": "TC-EMR-001__s01__list",
      "caption": "Danh sách EMR trước khi tạo",
      "uiState": "list"
     },
     {
      "name": "TC-EMR-001__s02__form",
      "caption": "Form tạo HSĐT",
      "uiState": "form"
     },
     {
      "name": "TC-EMR-001__s03__success",
      "caption": "HSĐT mới hiển thị đầu danh sách",
      "uiState": "success"
     }
    ],
    "notes": "Grounded: EmrDocumentTypes/EmrSpines từ data.js; NOTES org: CreatedBy phải là user thật.",
    "refIssues": [
     "#258",
     "#216"
    ]
   },
   {
    "id": "TC-EMR-002",
    "title": "Mở & soạn thảo nội dung HSĐT trong EmrEditor (SOAP/Vitals/Thuốc/Diễn biến) (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Có HSĐT chưa finalize; đang ở /v2/emr.",
    "steps": [
     "Bấm Mở hồ sơ → vào /v2/emr/edit",
     "Nhập nội dung SOAP",
     "Nhập sinh hiệu (Vitals)",
     "Thêm 1 mục diễn biến",
     "Lưu nháp"
    ],
    "expected": "Nội dung lưu thành công, các section (EmrSpineSections) cập nhật, trạng thái vẫn 'Nháp/Chưa finalize', không lỗi console.",
    "evidence": [
     {
      "name": "TC-EMR-002__s01__detail",
      "caption": "EmrEditor mở hồ sơ",
      "uiState": "detail"
     },
     {
      "name": "TC-EMR-002__s02__form",
      "caption": "Nhập SOAP/Vitals/Diễn biến",
      "uiState": "form"
     },
     {
      "name": "TC-EMR-002__s03__success",
      "caption": "Lưu nháp thành công",
      "uiState": "success"
     }
    ],
    "notes": "Grounded route /v2/emr/edit (EMR.tsx, EmrEditor.tsx).",
    "refIssues": [
     "#258"
    ]
   },
   {
    "id": "TC-EMR-003",
    "title": "Chèn nhanh nội dung bằng Shortcode / EmrDataTags trong EmrEditor (happy)",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Đã cấu hình ít nhất 1 Shortcode/EmrDataTag tại /v2/emr-data-tags; đang trong EmrEditor.",
    "steps": [
     "Đặt con trỏ vào field nội dung",
     "Mở dropdown chèn Shortcode/Data tag",
     "Chọn 1 mã tắt",
     "Quan sát nội dung được chèn"
    ],
    "expected": "Nội dung thay thế của mã tắt được chèn đúng vị trí con trỏ, giữ dấu tiếng Việt nguyên vẹn.",
    "evidence": [
     {
      "name": "TC-EMR-003__s01__dropdown",
      "caption": "Dropdown chọn Shortcode/Data tag",
      "uiState": "dropdown"
     },
     {
      "name": "TC-EMR-003__s02__form",
      "caption": "Nội dung mã tắt đã chèn",
      "uiState": "form"
     }
    ],
    "notes": "Grounded: Shortcodes/EmrDataTags từ data.js tables.",
    "refIssues": [
     "#258"
    ]
   },
   {
    "id": "TC-EMR-004",
    "title": "Finalize/khóa nội dung HSĐT bằng EmrFinalizedAt theo TT46 (happy + state)",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "HSĐT đã nhập đủ nội dung, trạng thái 'Chưa finalize'.",
    "steps": [
     "Trong EmrEditor bấm Finalize/Khóa nội dung",
     "Xác nhận trong confirm dialog",
     "Quan sát trạng thái chuyển sang Đã finalize",
     "Thử sửa lại 1 field nội dung"
    ],
    "expected": "HSĐT đặt EmrFinalizedAt (TT46), trạng thái 'Đã finalize', nội dung trở thành read-only; mọi sửa sau finalize bị chặn và phải đi qua vết sửa (EmrAmendments); KHÔNG dùng cờ IsClosed (đó là khóa billing). Ghi EmrCloseLogs/AuditLog.",
    "evidence": [
     {
      "name": "TC-EMR-004__s01__confirm",
      "caption": "Confirm finalize",
      "uiState": "confirm"
     },
     {
      "name": "TC-EMR-004__s02__detail",
      "caption": "HSĐT trạng thái Đã finalize (read-only)",
      "uiState": "detail"
     },
     {
      "name": "TC-EMR-004__s03__state",
      "caption": "Chặn sửa sau finalize",
      "uiState": "error"
     }
    ],
    "notes": "Grounded NOTES emr: 'Finalize/khóa dùng EmrFinalizedAt (TT46), KHÔNG dùng IsClosed (billing chiếm)'. EmrAmendments/EmrCloseLogs từ tables.",
    "refIssues": [
     "#258",
     "#222"
    ]
   },
   {
    "id": "TC-EMR-005",
    "title": "Ghi vết sửa sau finalize (EmrAmendments) thay vì sửa trực tiếp (state + data-consistency)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "HSĐT đã finalize (TC-EMR-004).",
    "steps": [
     "Mở HSĐT đã finalize",
     "Bấm Tạo vết sửa/Amendment",
     "Nhập nội dung sửa + lý do",
     "Lưu",
     "Mở lại HSĐT xem lịch sử vết sửa"
    ],
    "expected": "Tạo bản ghi EmrAmendments mới gắn người + thời gian + lý do; nội dung gốc finalize KHÔNG bị thay đổi; lịch sử vết sửa hiển thị đầy đủ; AuditLog ghi nhận.",
    "evidence": [
     {
      "name": "TC-EMR-005__s01__form",
      "caption": "Form tạo vết sửa",
      "uiState": "form"
     },
     {
      "name": "TC-EMR-005__s02__detail",
      "caption": "Lịch sử vết sửa (EmrAmendments)",
      "uiState": "detail"
     }
    ],
    "notes": "Grounded: EmrAmendments 'Vết sửa/finalize (TT46)'.",
    "refIssues": [
     "#258"
    ]
   },
   {
    "id": "TC-EMR-006",
    "title": "Tạo yêu cầu ký (SigningRequest) với người ký + vai trò ký đúng (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "HSĐT đã finalize; đang ở /v2/signing-workflow hoặc bấm 'Tới luồng ký số' từ EmrEditor.",
    "steps": [
     "Mở /v2/signing-workflow",
     "Bấm Tạo yêu cầu ký",
     "Chọn tài liệu HSĐT + người ký (EmrSignerCatalogs) + vai trò ký (EmrSigningRoles) + thao tác ký (EmrSigningOperations)",
     "Gửi yêu cầu"
    ],
    "expected": "Tạo SigningRequest trạng thái 'Chờ ký', hiển thị trong tab Chờ ký; chuỗi ký (EmrSigningChainDrawer) hiển thị đúng người/vai trò.",
    "evidence": [
     {
      "name": "TC-EMR-006__s01__form",
      "caption": "Form tạo yêu cầu ký",
      "uiState": "form"
     },
     {
      "name": "TC-EMR-006__s02__list",
      "caption": "Yêu cầu ký ở tab Chờ ký",
      "uiState": "list"
     },
     {
      "name": "TC-EMR-006__s03__drawer",
      "caption": "Chuỗi ký EmrSigningChainDrawer",
      "uiState": "drawer"
     }
    ],
    "notes": "Grounded: SigningRequests/EmrSignerCatalogs/EmrSigningRoles/EmrSigningOperations + EmrSigningChainDrawer.tsx.",
    "refIssues": [
     "#259"
    ]
   },
   {
    "id": "TC-EMR-007",
    "title": "Ký số tài liệu bằng USB token (SigningTransaction → DocumentSignature) (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Có SigningRequest 'Chờ ký'; có ManagedCertificate hợp lệ + TokenUserMapping cho user.",
    "steps": [
     "Mở yêu cầu ký",
     "Bấm Ký bằng token",
     "Nhập PIN token",
     "Xác nhận"
    ],
    "expected": "Tạo SigningTransaction + DocumentSignature; trạng thái yêu cầu chuyển 'Đã ký'; tài liệu bị DocumentLocks; hiển thị tem chữ ký; AuditLog ghi giao dịch ký.",
    "evidence": [
     {
      "name": "TC-EMR-007__s01__modal",
      "caption": "Modal nhập PIN token",
      "uiState": "modal"
     },
     {
      "name": "TC-EMR-007__s02__success",
      "caption": "Tài liệu đã ký + tem chữ ký",
      "uiState": "success"
     },
     {
      "name": "TC-EMR-007__s03__state",
      "caption": "Trạng thái chuyển Đã ký + khóa",
      "uiState": "detail"
     }
    ],
    "notes": "Grounded: SigningTransactions/DocumentSignatures/DocumentLocks/ManagedCertificates/TokenUserMappings.",
    "refIssues": [
     "#259"
    ]
   },
   {
    "id": "TC-EMR-008",
    "title": "Ký số bằng TOTP khi không có USB token (happy alternate)",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "User đã cấu hình SigningTotpSecret tại /v2/digital-signature; có yêu cầu ký Chờ ký.",
    "steps": [
     "Mở yêu cầu ký",
     "Chọn phương thức Ký bằng TOTP",
     "Nhập mã TOTP 6 số hợp lệ",
     "Xác nhận"
    ],
    "expected": "Ký thành công, tạo SigningTransaction/DocumentSignature; trạng thái Đã ký.",
    "evidence": [
     {
      "name": "TC-EMR-008__s01__modal",
      "caption": "Modal nhập mã TOTP",
      "uiState": "modal"
     },
     {
      "name": "TC-EMR-008__s02__success",
      "caption": "Ký TOTP thành công",
      "uiState": "success"
     }
    ],
    "notes": "Grounded NOTES emr: ký qua USB token/TOTP; SigningTotpSecrets.",
    "refIssues": [
     "#259"
    ]
   },
   {
    "id": "TC-EMR-009",
    "title": "Nhập sai PIN/mã TOTP khi ký → báo lỗi, không tạo chữ ký (negative + validation)",
    "category": "negative",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Có yêu cầu ký Chờ ký.",
    "steps": [
     "Mở yêu cầu ký",
     "Bấm Ký",
     "Nhập PIN/TOTP sai 3 lần",
     "Quan sát thông báo"
    ],
    "expected": "Mỗi lần sai hiển thị lỗi rõ ràng tiếng Việt; KHÔNG tạo SigningTransaction/DocumentSignature; trạng thái vẫn 'Chờ ký'; có thể khóa tạm sau N lần sai.",
    "evidence": [
     {
      "name": "TC-EMR-009__s01__modal",
      "caption": "Nhập PIN/TOTP sai",
      "uiState": "modal"
     },
     {
      "name": "TC-EMR-009__s02__error",
      "caption": "Thông báo lỗi ký",
      "uiState": "error"
     }
    ],
    "notes": "Negative cho ký số.",
    "refIssues": [
     "#259"
    ]
   },
   {
    "id": "TC-EMR-010",
    "title": "Từ chối ký kèm lý do → trạng thái Rejected, không tạo chữ ký (state + negative)",
    "category": "state",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Có yêu cầu ký Chờ ký giao cho người ký hiện tại.",
    "steps": [
     "Mở yêu cầu ký",
     "Bấm Từ chối ký",
     "Bỏ trống lý do → bấm xác nhận (kỳ vọng chặn)",
     "Nhập lý do hợp lệ → xác nhận"
    ],
    "expected": "Bỏ trống lý do bị chặn (validation). Khi có lý do: SigningRequest chuyển 'Từ chối/Rejected', không tạo DocumentSignature; người tạo yêu cầu được thông báo; AuditLog ghi.",
    "evidence": [
     {
      "name": "TC-EMR-010__s01__validation",
      "caption": "Chặn từ chối khi thiếu lý do",
      "uiState": "validation"
     },
     {
      "name": "TC-EMR-010__s02__confirm",
      "caption": "Xác nhận từ chối có lý do",
      "uiState": "confirm"
     },
     {
      "name": "TC-EMR-010__s03__state",
      "caption": "Trạng thái Từ chối",
      "uiState": "detail"
     }
    ],
    "notes": "State machine ký: Draft/Pending/Approved/Rejected.",
    "refIssues": [
     "#259"
    ]
   },
   {
    "id": "TC-EMR-011",
    "title": "Chặn ký lại tài liệu đã ký/đã khóa (DocumentLocks) (state + negative)",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Tài liệu đã ký (DocumentSignature tồn tại, DocumentLocks active).",
    "steps": [
     "Mở tài liệu đã ký",
     "Thử bấm Ký lại / Tạo yêu cầu ký mới cho cùng tài liệu",
     "Quan sát"
    ],
    "expected": "Nút Ký bị disable hoặc API trả lỗi 'tài liệu đã khóa'; không tạo SigningTransaction trùng; thông báo rõ.",
    "evidence": [
     {
      "name": "TC-EMR-011__s01__state",
      "caption": "Tài liệu đã khóa, nút Ký disabled",
      "uiState": "detail"
     },
     {
      "name": "TC-EMR-011__s02__error",
      "caption": "Lỗi khi cố ký lại",
      "uiState": "error"
     }
    ],
    "notes": "Grounded: DocumentLocks/DocumentHolds.",
    "refIssues": [
     "#259"
    ]
   },
   {
    "id": "TC-EMR-012",
    "title": "Giữ tài liệu (DocumentHolds) chặn tiến trình ký cho tới khi gỡ giữ (state)",
    "category": "state",
    "priority": "P2",
    "role": "Điều dưỡng",
    "preconditions": "Tài liệu có DocumentHold đang active.",
    "steps": [
     "Mở yêu cầu ký của tài liệu bị giữ",
     "Thử ký",
     "Gỡ giữ (Release hold)",
     "Ký lại"
    ],
    "expected": "Khi đang giữ: ký bị chặn + thông báo lý do giữ; sau khi gỡ giữ: ký được bình thường; mọi thao tác ghi log.",
    "evidence": [
     {
      "name": "TC-EMR-012__s01__state",
      "caption": "Tài liệu bị giữ chặn ký",
      "uiState": "detail"
     },
     {
      "name": "TC-EMR-012__s02__success",
      "caption": "Gỡ giữ và ký thành công",
      "uiState": "success"
     }
    ],
    "notes": "Grounded: DocumentHolds.",
    "refIssues": [
     "#259"
    ]
   },
   {
    "id": "TC-EMR-013",
    "title": "Ký số tập trung hàng loạt nhiều tài liệu (Central Signing) (happy + edge)",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Có nhiều (vd 5) tài liệu Chờ ký; chứng thư số hợp lệ; ở /v2/central-signing.",
    "steps": [
     "Mở /v2/central-signing",
     "Chọn nhiều tài liệu (checkbox)",
     "Chọn chứng thư số",
     "Bấm Ký hàng loạt",
     "Xác nhận"
    ],
    "expected": "Tất cả tài liệu hợp lệ được ký; toast/kết quả từng tài liệu; nếu 1 tài liệu lỗi (vd đã khóa) thì các tài liệu còn lại vẫn ký thành công, báo riêng lỗi từng dòng.",
    "evidence": [
     {
      "name": "TC-EMR-013__s01__list",
      "caption": "Chọn nhiều tài liệu",
      "uiState": "list"
     },
     {
      "name": "TC-EMR-013__s02__confirm",
      "caption": "Xác nhận ký hàng loạt",
      "uiState": "confirm"
     },
     {
      "name": "TC-EMR-013__s03__toast",
      "caption": "Kết quả ký từng tài liệu",
      "uiState": "toast"
     }
    ],
    "notes": "Grounded: CentralSigning.tsx, ManagedCertificates.",
    "refIssues": [
     "#259"
    ]
   },
   {
    "id": "TC-EMR-014",
    "title": "Chặn ký bằng chứng thư số đã hết hạn (validation + state)",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "ManagedCertificate của user đã hết hạn (NotAfter < hôm nay).",
    "steps": [
     "Mở /v2/digital-signature xem chứng thư hết hạn",
     "Quay lại yêu cầu ký",
     "Thử ký bằng chứng thư hết hạn"
    ],
    "expected": "Chứng thư hết hạn hiển thị Tag 'Hết hạn'; ký bị chặn với thông báo rõ; không tạo DocumentSignature.",
    "evidence": [
     {
      "name": "TC-EMR-014__s01__list",
      "caption": "Chứng thư hết hạn (Tag)",
      "uiState": "list"
     },
     {
      "name": "TC-EMR-014__s02__error",
      "caption": "Chặn ký bằng chứng thư hết hạn",
      "uiState": "error"
     }
    ],
    "notes": "Edge ngày: NotAfter quá khứ.",
    "refIssues": [
     "#259"
    ]
   },
   {
    "id": "TC-EMR-015",
    "title": "Đăng ký sinh trắc bệnh nhân (WebAuthn) trên môi trường HTTPS (happy + integration)",
    "category": "integration",
    "priority": "P1",
    "role": "Điều dưỡng",
    "preconditions": "Truy cập qua HTTPS (RpId hợp lệ); chọn 1 bệnh nhân; ở /v2/biometric-enrollment.",
    "steps": [
     "Mở /v2/biometric-enrollment",
     "Chọn bệnh nhân",
     "Bấm Đăng ký vân tay (navigator.credentials.create)",
     "Hoàn tất thử thách WebAuthn"
    ],
    "expected": "Tạo BiometricCredential/WebAuthnCredential gắn BN; hiển thị trong danh sách credential; sẵn sàng để ký sinh trắc.",
    "evidence": [
     {
      "name": "TC-EMR-015__s01__form",
      "caption": "Chọn BN đăng ký sinh trắc",
      "uiState": "form"
     },
     {
      "name": "TC-EMR-015__s02__success",
      "caption": "Credential đăng ký thành công",
      "uiState": "success"
     }
    ],
    "notes": "Grounded: BiometricCredentials/WebAuthnCredentials; skill his-fe-webauthn-biometric (RpId/HTTPS).",
    "refIssues": [
     "#259"
    ]
   },
   {
    "id": "TC-EMR-016",
    "title": "WebAuthn trên HTTP (không HTTPS) báo lỗi rõ ràng (negative + integration)",
    "category": "negative",
    "priority": "P1",
    "role": "Điều dưỡng",
    "preconditions": "Truy cập qua http://localhost không phải secure context phù hợp RpId.",
    "steps": [
     "Mở /v2/biometric-enrollment qua HTTP",
     "Bấm Đăng ký vân tay",
     "Quan sát lỗi"
    ],
    "expected": "Thông báo lỗi rõ (yêu cầu HTTPS/RpId), không crash trang, không tạo credential rác.",
    "evidence": [
     {
      "name": "TC-EMR-016__s01__error",
      "caption": "Lỗi WebAuthn do thiếu HTTPS/RpId",
      "uiState": "error"
     }
    ],
    "notes": "Edge integration WebAuthn.",
    "refIssues": [
     "#259"
    ]
   },
   {
    "id": "TC-EMR-017",
    "title": "Bệnh nhân ký HSĐT bằng sinh trắc → PatientSignature + BiometricSignatureLog (happy + data-consistency)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Điều dưỡng",
    "preconditions": "BN đã đăng ký BiometricCredential (TC-EMR-015); có tài liệu cần BN ký.",
    "steps": [
     "Mở tài liệu cần BN ký",
     "Bấm Ký sinh trắc",
     "BN xác thực vân tay/khuôn mặt",
     "Kiểm tra lịch sử ký"
    ],
    "expected": "Tạo PatientSignature + ghi BiometricSignatureLogs (thời gian/thiết bị/kết quả); tài liệu hiển thị chữ ký BN; AuditLog ghi.",
    "evidence": [
     {
      "name": "TC-EMR-017__s01__modal",
      "caption": "Xác thực sinh trắc",
      "uiState": "modal"
     },
     {
      "name": "TC-EMR-017__s02__success",
      "caption": "Chữ ký BN gắn vào tài liệu",
      "uiState": "success"
     },
     {
      "name": "TC-EMR-017__s03__detail",
      "caption": "Log ký sinh trắc",
      "uiState": "detail"
     }
    ],
    "notes": "Grounded: PatientSignatures/BiometricSignatureLogs.",
    "refIssues": [
     "#259"
    ]
   },
   {
    "id": "TC-EMR-018",
    "title": "Chia sẻ HSĐT cho người dùng khác có thời hạn, ghi log truy cập (happy + data-consistency)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Có HSĐT; quyền chia sẻ.",
    "steps": [
     "Mở HSĐT → Chia sẻ",
     "Chọn người nhận + phạm vi + thời hạn",
     "Lưu chia sẻ",
     "Đăng nhập tài khoản người nhận mở HSĐT được chia sẻ",
     "Quay lại xem log truy cập"
    ],
    "expected": "Tạo EmrShare; người nhận xem được đúng phạm vi trong thời hạn; mỗi lần truy cập ghi EmrShareAccessLogs đúng người/thời gian.",
    "evidence": [
     {
      "name": "TC-EMR-018__s01__modal",
      "caption": "Modal chia sẻ HSĐT",
      "uiState": "modal"
     },
     {
      "name": "TC-EMR-018__s02__detail",
      "caption": "Log truy cập chia sẻ",
      "uiState": "detail"
     }
    ],
    "notes": "Grounded: EmrShares/EmrShareAccessLogs.",
    "refIssues": [
     "#258"
    ]
   },
   {
    "id": "TC-EMR-019",
    "title": "Hết hạn/thu hồi chia sẻ HSĐT → chặn truy cập (state + security)",
    "category": "state",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Có EmrShare đã hết hạn hoặc vừa bị thu hồi.",
    "steps": [
     "Thu hồi 1 chia sẻ đang active",
     "Đăng nhập tài khoản người nhận",
     "Thử mở HSĐT đã thu hồi"
    ],
    "expected": "Truy cập bị chặn (403/không hiển thị nội dung); không ghi log truy cập thành công; thông báo rõ.",
    "evidence": [
     {
      "name": "TC-EMR-019__s01__permission",
      "caption": "Chặn truy cập sau thu hồi",
      "uiState": "permission"
     }
    ],
    "notes": "State + security cho EmrShares.",
    "refIssues": [
     "#258"
    ]
   },
   {
    "id": "TC-EMR-020",
    "title": "Tạo bản trích sao HSĐT (EmrExtract) và in, ghi EmrPrintLog (happy + data-consistency)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Có HSĐT đã finalize; ở /v2/emr-extract.",
    "steps": [
     "Mở /v2/emr-extract",
     "Bấm Tạo trích sao",
     "Chọn phạm vi tài liệu",
     "Tạo + In bản trích sao"
    ],
    "expected": "Tạo EmrExtract đúng phạm vi; thao tác in ghi EmrPrintLogs (người in/thời gian/số bản); bản in hiển thị tem chữ ký nếu đã ký.",
    "evidence": [
     {
      "name": "TC-EMR-020__s01__modal",
      "caption": "Chọn phạm vi trích sao",
      "uiState": "modal"
     },
     {
      "name": "TC-EMR-020__s02__success",
      "caption": "Trích sao tạo + in",
      "uiState": "success"
     },
     {
      "name": "TC-EMR-020__s03__detail",
      "caption": "EmrPrintLogs ghi nhận",
      "uiState": "detail"
     }
    ],
    "notes": "Grounded: EmrExtracts/EmrPrintLogs.",
    "refIssues": [
     "#258"
    ]
   },
   {
    "id": "TC-EMR-021",
    "title": "Xuất HL7 v2 / CDA HSĐT phục vụ liên thông (integration + happy)",
    "category": "integration",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Có HSĐT đã finalize + ký; ở /v2/emr-hl7-export.",
    "steps": [
     "Mở /v2/emr-hl7-export",
     "Chọn HSĐT/phạm vi",
     "Bấm Xuất HL7",
     "Xem preview message + tải về"
    ],
    "expected": "Sinh message HL7 v2 / CdaDocument hợp lệ, encode đúng dấu tiếng Việt; preview hiển thị; tải file thành công.",
    "evidence": [
     {
      "name": "TC-EMR-021__s01__form",
      "caption": "Chọn HSĐT để xuất HL7",
      "uiState": "form"
     },
     {
      "name": "TC-EMR-021__s02__success",
      "caption": "Preview HL7/CDA + tải về",
      "uiState": "success"
     }
    ],
    "notes": "Grounded: EmrHl7Export.tsx, CdaDocuments; RELATED_X emr→national.",
    "refIssues": [
     "#259"
    ]
   },
   {
    "id": "TC-EMR-022",
    "title": "Đồng bộ HSĐT lên Cloud thành công và xử lý lỗi đồng bộ (integration + ui)",
    "category": "integration",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "Có HSĐT đã finalize; ở /v2/emr-cloud-sync.",
    "steps": [
     "Mở /v2/emr-cloud-sync",
     "Đồng bộ 1 HSĐT",
     "Quan sát log Thành công",
     "Mô phỏng lỗi mạng → đồng bộ HSĐT khác → bấm Đồng bộ lại"
    ],
    "expected": "Đồng bộ thành công ghi EmrCloudSyncLogs trạng thái Thành công; khi lỗi: tab Lỗi hiển thị chi tiết, nút Đồng bộ lại hoạt động; trạng thái loading/error hiển thị đúng.",
    "evidence": [
     {
      "name": "TC-EMR-022__s01__success",
      "caption": "Đồng bộ thành công",
      "uiState": "success"
     },
     {
      "name": "TC-EMR-022__s02__error",
      "caption": "Lỗi đồng bộ + retry",
      "uiState": "error"
     }
    ],
    "notes": "Grounded: EmrCloudSync.tsx, EmrCloudSyncLogs.",
    "refIssues": [
     "#259"
    ]
   },
   {
    "id": "TC-EMR-023",
    "title": "Validation các field bắt buộc khi tạo HSĐT / tạo yêu cầu ký (validation)",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Ở form tạo HSĐT (/v2/emr) và form tạo yêu cầu ký (/v2/signing-workflow).",
    "steps": [
     "Mở form tạo HSĐT, bỏ trống bệnh nhân + loại HSĐT → Lưu",
     "Mở form tạo yêu cầu ký, bỏ trống người ký/tài liệu → Gửi",
     "Quan sát thông báo từng field"
    ],
    "expected": "Mỗi field bắt buộc trống hiển thị lỗi inline đúng vị trí, không gọi API tạo; thông báo tiếng Việt rõ ràng.",
    "evidence": [
     {
      "name": "TC-EMR-023__s01__validation",
      "caption": "Lỗi validation form tạo HSĐT",
      "uiState": "validation"
     },
     {
      "name": "TC-EMR-023__s02__validation",
      "caption": "Lỗi validation form tạo yêu cầu ký",
      "uiState": "validation"
     }
    ],
    "notes": "Validation field-level.",
    "refIssues": [
     "#258",
     "#259"
    ]
   },
   {
    "id": "TC-EMR-024",
    "title": "Nhập biên/đặc biệt vào nội dung HSĐT: chuỗi rất dài, ký tự đặc biệt, dấu tiếng Việt (edge)",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Đang trong EmrEditor.",
    "steps": [
     "Dán chuỗi 10.000+ ký tự vào field diễn biến",
     "Nhập ký tự đặc biệt < > & \" ' và emoji",
     "Nhập đầy đủ dấu tiếng Việt (ữ, ặ, ỹ...)",
     "Lưu rồi mở lại"
    ],
    "expected": "Lưu không lỗi (hoặc chặn có thông báo nếu vượt giới hạn); ký tự đặc biệt được escape an toàn (không vỡ layout); dấu tiếng Việt hiển thị lại nguyên vẹn sau reload.",
    "evidence": [
     {
      "name": "TC-EMR-024__s01__form",
      "caption": "Nhập chuỗi dài + ký tự đặc biệt + tiếng Việt",
      "uiState": "form"
     },
     {
      "name": "TC-EMR-024__s02__detail",
      "caption": "Hiển thị lại sau reload",
      "uiState": "detail"
     }
    ],
    "notes": "Edge + tiền đề cho XSS (TC-EMR-029).",
    "refIssues": [
     "#258"
    ]
   },
   {
    "id": "TC-EMR-025",
    "title": "Hủy giữa chừng khi soạn HSĐT / khi đang ký (negative + state)",
    "category": "negative",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Đang soạn HSĐT chưa lưu; có yêu cầu ký đang mở modal PIN.",
    "steps": [
     "Nhập nội dung HSĐT chưa lưu rồi điều hướng đi nơi khác",
     "Trong modal nhập PIN ký, bấm Hủy",
     "Quan sát trạng thái"
    ],
    "expected": "Có cảnh báo mất dữ liệu chưa lưu (hoặc tự lưu nháp); hủy modal ký không tạo SigningTransaction, trạng thái vẫn 'Chờ ký'; không lưu bản ghi rác.",
    "evidence": [
     {
      "name": "TC-EMR-025__s01__confirm",
      "caption": "Cảnh báo rời trang khi chưa lưu",
      "uiState": "confirm"
     },
     {
      "name": "TC-EMR-025__s02__modal",
      "caption": "Hủy modal ký",
      "uiState": "modal"
     }
    ],
    "notes": "Negative: hủy giữa chừng.",
    "refIssues": [
     "#258",
     "#259"
    ]
   },
   {
    "id": "TC-EMR-026",
    "title": "Phân quyền: Điều dưỡng không được finalize/ký HSĐT của bác sĩ (permission)",
    "category": "permission",
    "priority": "P0",
    "role": "Điều dưỡng",
    "preconditions": "Đăng nhập tài khoản role Điều dưỡng (theo matrix #216); có HSĐT cần bác sĩ ký.",
    "steps": [
     "Mở HSĐT trong EmrEditor",
     "Kiểm tra nút Finalize/Ký",
     "Thử gọi trực tiếp API finalize/ký (vd qua devtools)"
    ],
    "expected": "Nút Finalize/Ký bị ẩn/disable theo vai trò; gọi API trực tiếp bị 403; menu ký không hiển thị nếu thiếu quyền.",
    "evidence": [
     {
      "name": "TC-EMR-026__s01__permission",
      "caption": "Nút ký bị ẩn/disable với Điều dưỡng",
      "uiState": "permission"
     },
     {
      "name": "TC-EMR-026__s02__error",
      "caption": "API ký trả 403",
      "uiState": "error"
     }
    ],
    "notes": "Grounded roles emr=[Bác sĩ, Điều dưỡng]; matrix #216.",
    "refIssues": [
     "#216",
     "#259"
    ]
   },
   {
    "id": "TC-EMR-027",
    "title": "Phân quyền: vai trò không thuộc phân hệ EMR bị chặn menu + route (permission)",
    "category": "permission",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "Đăng nhập role Thu ngân (không có quyền EMR).",
    "steps": [
     "Quan sát menu sidebar có hiện nhóm EMR/Ký số không",
     "Nhập trực tiếp URL /v2/emr/edit",
     "Gọi API EMR"
    ],
    "expected": "Menu EMR/Ký số không hiển thị; truy cập route bị chặn/redirect; API EMR trả 403.",
    "evidence": [
     {
      "name": "TC-EMR-027__s01__permission",
      "caption": "Menu EMR ẩn với Thu ngân",
      "uiState": "permission"
     }
    ],
    "notes": "Permission cross-role.",
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-EMR-028",
    "title": "IDOR: xem/ký HSĐT của bệnh nhân khác bằng cách đổi ID (security)",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Đăng nhập bác sĩ A chỉ phụ trách BN X; biết HSĐT của BN Y do bác sĩ B phụ trách.",
    "steps": [
     "Gọi GET /v2/emr/edit?patientId=<của BN Y> hoặc API HSĐT với id của BN Y",
     "Thử tạo yêu cầu ký trên HSĐT của BN Y"
    ],
    "expected": "Hệ thống kiểm tra quyền theo BN/khoa: trả 403/404 nếu không có quyền; không lộ nội dung HSĐT BN khác; AuditLog ghi truy cập trái phép.",
    "evidence": [
     {
      "name": "TC-EMR-028__s01__error",
      "caption": "403/404 khi truy cập HSĐT BN khác",
      "uiState": "error"
     }
    ],
    "notes": "Grounded deep-link ?patientId= trong EmrEditor.tsx — bề mặt IDOR.",
    "refIssues": [
     "#216",
     "#258"
    ]
   },
   {
    "id": "TC-EMR-029",
    "title": "XSS qua field nội dung/diễn biến/ghi chú HSĐT (security)",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Đang trong EmrEditor.",
    "steps": [
     "Nhập payload <img src=x onerror=alert(1)> và <script>alert(1)</script> vào field diễn biến/ghi chú",
     "Lưu",
     "Mở lại HSĐT + xem bản in/trích sao"
    ],
    "expected": "Payload được escape, KHÔNG thực thi script khi hiển thị/in; chỉ hiển thị dưới dạng text; không có alert.",
    "evidence": [
     {
      "name": "TC-EMR-029__s01__form",
      "caption": "Nhập payload XSS",
      "uiState": "form"
     },
     {
      "name": "TC-EMR-029__s02__detail",
      "caption": "Payload hiển thị an toàn (escape)",
      "uiState": "detail"
     }
    ],
    "notes": "Security XSS field ghi chú.",
    "refIssues": [
     "#258"
    ]
   },
   {
    "id": "TC-EMR-030",
    "title": "Path-traversal / truy cập trái phép ảnh & đính kèm HSĐT (security)",
    "category": "security",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Có EmrImages/EmrDocumentAttachments; biết endpoint phục vụ file.",
    "steps": [
     "Gọi endpoint ảnh/đính kèm với path ../../ hoặc id của BN khác",
     "Quan sát phản hồi"
    ],
    "expected": "Server chặn path-traversal (không trả file ngoài thư mục cho phép); ảnh/đính kèm BN khác bị 403/404; không lộ file hệ thống.",
    "evidence": [
     {
      "name": "TC-EMR-030__s01__error",
      "caption": "Chặn path-traversal/IDOR file đính kèm",
      "uiState": "error"
     }
    ],
    "notes": "Grounded: EmrImages/EmrDocumentAttachments; tương tự fix #181 path-traversal patient-image.",
    "refIssues": [
     "#216",
     "#258"
    ]
   },
   {
    "id": "TC-EMR-031",
    "title": "Tự kiểm HSĐT theo EmrAutoCheckRules trước khi finalize (data-consistency + validation)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Có EmrAutoCheckRules cấu hình (vd bắt buộc có chẩn đoán/chữ ký điều dưỡng); HSĐT thiếu mục.",
    "steps": [
     "Mở HSĐT thiếu mục bắt buộc",
     "Bấm Finalize",
     "Quan sát kết quả tự kiểm"
    ],
    "expected": "Hệ thống chạy EmrAutoCheckRules, liệt kê mục thiếu/không đạt, CHẶN finalize cho tới khi đủ; HSĐT đủ điều kiện thì finalize được.",
    "evidence": [
     {
      "name": "TC-EMR-031__s01__validation",
      "caption": "Kết quả tự kiểm liệt kê mục thiếu",
      "uiState": "validation"
     },
     {
      "name": "TC-EMR-031__s02__error",
      "caption": "Chặn finalize khi chưa đạt tự kiểm",
      "uiState": "error"
     }
    ],
    "notes": "Grounded: EmrAutoCheckRules.",
    "refIssues": [
     "#258"
    ]
   },
   {
    "id": "TC-EMR-032",
    "title": "Data-consistency liên phân hệ: HSĐT phản ánh đúng dữ liệu OPD/IPD và liên thông national (data-consistency)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Có đợt khám OPD/đợt nội trú IPD với chẩn đoán/đơn thuốc/CLS đã nhập.",
    "steps": [
     "Từ OPD/IPD mở HSĐT (deep-link /v2/emr/edit?patientId=)",
     "Đối chiếu chẩn đoán/đơn thuốc/CLS trong HSĐT với dữ liệu nguồn",
     "Finalize + ký rồi xuất liên thông (HL7/CDA)"
    ],
    "expected": "HSĐT hiển thị đúng dữ liệu từ OPD/IPD (không lệch); sau ký, bản xuất liên thông national chứa đúng nội dung đã ký; AuditLog xuyên suốt.",
    "evidence": [
     {
      "name": "TC-EMR-032__s01__detail",
      "caption": "HSĐT phản ánh dữ liệu OPD/IPD",
      "uiState": "detail"
     },
     {
      "name": "TC-EMR-032__s02__success",
      "caption": "Bản liên thông khớp nội dung đã ký",
      "uiState": "success"
     }
    ],
    "notes": "Grounded RELATED_X emr→opd/ipd/national/reports.",
    "refIssues": [
     "#258",
     "#259"
    ]
   },
   {
    "id": "TC-EMR-033",
    "title": "Trạng thái UI: empty/loading/error của danh sách EMR và signing-workflow (ui)",
    "category": "ui",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "Tài khoản chưa có HSĐT (empty); mô phỏng API chậm (loading) và API lỗi (error).",
    "steps": [
     "Mở /v2/emr khi không có dữ liệu → quan sát empty state",
     "Throttle mạng, reload → quan sát loading",
     "Chặn API trả 500 → quan sát error",
     "Lặp lại với /v2/signing-workflow"
    ],
    "expected": "Empty state có hướng dẫn/nút tạo; loading có skeleton/spinner; error có thông báo + nút thử lại; không màn trắng/không spinner vô tận.",
    "evidence": [
     {
      "name": "TC-EMR-033__s01__empty",
      "caption": "Danh sách EMR rỗng",
      "uiState": "empty"
     },
     {
      "name": "TC-EMR-033__s02__loading",
      "caption": "Đang tải",
      "uiState": "loading"
     },
     {
      "name": "TC-EMR-033__s03__error",
      "caption": "Lỗi tải dữ liệu + retry",
      "uiState": "error"
     }
    ],
    "notes": "UI states bắt buộc.",
    "refIssues": [
     "#258"
    ]
   },
   {
    "id": "TC-EMR-034",
    "title": "Dark/light parity + định dạng ngày trên màn EMR và ký số (ui)",
    "category": "ui",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "Ở /v2/emr, /v2/emr/edit, /v2/signing-workflow.",
    "steps": [
     "Toggle dark mode trên topbar v2",
     "Duyệt danh sách + drawer chuỗi ký + modal ký",
     "Toggle light lại",
     "Kiểm tra định dạng ngày/giờ ký (dayjs) và tem chữ ký"
    ],
    "expected": "Cả 2 theme đủ tương phản (text/icon/tem chữ ký không mất chữ); không màu hardcode lệch; ngày/giờ định dạng nhất quán; layout không vỡ.",
    "evidence": [
     {
      "name": "TC-EMR-034__s01__detail",
      "caption": "EMR ở dark mode",
      "uiState": "detail"
     },
     {
      "name": "TC-EMR-034__s02__detail",
      "caption": "EMR ở light mode",
      "uiState": "detail"
     }
    ],
    "notes": "UI dark/light parity (topbar v2 toggle).",
    "refIssues": [
     "#258"
    ]
   },
   {
    "id": "TC-EMR-035",
    "title": "Quản lý Mẫu HSBA (ClinicalTemplate): tạo/sửa/lọc theo loại + áp dụng vào HSĐT (happy + validation)",
    "category": "happy",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "Mở modal Quản lý Mẫu HSBA từ /v2/emr.",
    "steps": [
     "Mở modal Mẫu HSBA",
     "Lọc theo templateType (OPD/PTTT/CSĐD/Nội trú/Tổng kết)",
     "Tạo mẫu mới (bỏ trống tên → kỳ vọng chặn), nhập đủ → Lưu",
     "Áp dụng mẫu vào 1 HSĐT trong EmrEditor"
    ],
    "expected": "Lọc đúng theo loại; thiếu tên bị validation chặn; tạo/sửa thành công, usageCount tăng khi áp dụng; nội dung mẫu chèn đúng vào HSĐT.",
    "evidence": [
     {
      "name": "TC-EMR-035__s01__modal",
      "caption": "Modal quản lý Mẫu HSBA",
      "uiState": "modal"
     },
     {
      "name": "TC-EMR-035__s02__filter",
      "caption": "Lọc theo loại mẫu",
      "uiState": "filter"
     },
     {
      "name": "TC-EMR-035__s03__validation",
      "caption": "Chặn lưu khi thiếu tên",
      "uiState": "validation"
     }
    ],
    "notes": "Grounded: ClinicalTemplateManager trong EMR.tsx (templateType 1-5/99).",
    "refIssues": [
     "#258"
    ]
   },
   {
    "id": "TC-EMR-036",
    "title": "CRUD Thẻ dữ liệu EMR / Shortcode tại /v2/emr-data-tags (happy + negative)",
    "category": "happy",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "Ở /v2/emr-data-tags.",
    "steps": [
     "Tạo data tag mới (code + nội dung)",
     "Tạo trùng code đã tồn tại → kỳ vọng chặn",
     "Sửa nội dung 1 tag",
     "Xóa 1 tag (confirm)"
    ],
    "expected": "Tạo/sửa/xóa thành công; trùng code bị chặn với thông báo; xóa có confirm; thay đổi phản ánh ngay khi chèn trong EmrEditor.",
    "evidence": [
     {
      "name": "TC-EMR-036__s01__form",
      "caption": "Tạo data tag",
      "uiState": "form"
     },
     {
      "name": "TC-EMR-036__s02__validation",
      "caption": "Chặn trùng code",
      "uiState": "validation"
     },
     {
      "name": "TC-EMR-036__s03__confirm",
      "caption": "Confirm xóa tag",
      "uiState": "confirm"
     }
    ],
    "notes": "Grounded: EmrDataTags.tsx, Shortcodes.",
    "refIssues": [
     "#258"
    ]
   }
  ],
  "ui_state_checklist": [
   "list — danh sách HSBA, yêu cầu ký, chứng thư, log",
   "detail — EmrEditor mở hồ sơ, trạng thái finalize/ký, lịch sử vết sửa, log truy cập",
   "form — nhập SOAP/Vitals/diễn biến, tạo HSĐT, tạo yêu cầu ký, cấu hình data tag",
   "modal — nhập PIN/TOTP, xác thực sinh trắc, chia sẻ, quản lý mẫu HSBA",
   "drawer — EmrSigningChainDrawer (chuỗi ký)",
   "filter — lọc danh sách theo trạng thái/loại mẫu",
   "dropdown — chèn Shortcode/EmrDataTags",
   "validation — field bắt buộc, trùng code, thiếu lý do từ chối, tự kiểm EmrAutoCheckRules",
   "empty — danh sách EMR/yêu cầu ký rỗng",
   "loading — tải danh sách/chi tiết",
   "error — lỗi API, ký thất bại, chứng thư hết hạn, IDOR/path-traversal 403/404, lỗi đồng bộ/WebAuthn",
   "confirm — finalize, từ chối ký, xóa, rời trang chưa lưu, ký hàng loạt",
   "success — tạo/lưu/ký thành công, xuất HL7, đồng bộ",
   "toast — kết quả ký hàng loạt từng tài liệu",
   "permission — ẩn/disable nút theo vai trò, chặn menu/route/API 403"
  ],
  "gaps": [
   "Chưa rõ state machine ký chuẩn (Draft/Pending/Approved/Rejected/Cancelled/Locked) ánh xạ với SigningRequests/SigningTransactions — cần xác nhận để viết test chuyển trạng thái không hợp lệ đầy đủ (vd ký khi đang Rejected).",
   "Ký nhiều cấp/tuần tự (bác sĩ → trưởng khoa → giám đốc) qua EmrSigningRoles/EmrSigningOperations: cần test thứ tự ký bắt buộc và chặn ký vượt cấp khi cấp trước chưa ký.",
   "Concurrency: 2 người cùng mở/sửa hoặc cùng ký 1 HSĐT (race) — cần test optimistic lock/tránh ghi đè và tránh tạo DocumentSignature trùng.",
   "Quan hệ khóa EMR (EmrFinalizedAt) vs khóa billing (MedicalRecord.IsClosed): cần test chéo đảm bảo finalize EMR KHÔNG khóa viện phí và ngược lại (footgun đã ghi trong NOTES).",
   "Trích sao/chia sẻ HSĐT đã có chữ ký: cần test tính toàn vẹn chữ ký (chữ ký còn hợp lệ sau khi xuất/trích sao, không bị bóc tách).",
   "EmrCoverTypes/SpecialtyEmrs (HSĐT chuyên khoa): chưa có test cho việc chọn loại bìa / khung HSĐT chuyên khoa khác nhau — cần bổ sung nếu UI có.",
   "Kiểm tra dị ứng/chống chỉ định/tương tác thuốc hiển thị trong HSĐT (patient-safety) — banner cảnh báo có nằm ở EmrEditor không cần xác nhận; nếu có, thêm test cảnh báo trước khi finalize.",
   "Hết hạn JWT/đăng xuất giữa luồng ký dài: cần test phiên hết hạn khi đang nhập PIN/TOTP không tạo chữ ký mồ côi.",
   "Liên thông cổng QG/đơn thuốc QG cho HSĐT (RELATED_X emr→national): timeout/lỗi cổng, idempotency khi gửi lại — chưa có integration test sâu.",
   "Kiểm thử in/PDF (iText7) bản trích sao với tem chữ ký + dấu tiếng Việt + ảnh đính kèm: cần test format A4 và không lộ dữ liệu BN khác."
  ]
 },
 {
  "id": "rehab",
  "code": "REH",
  "layer": "clin",
  "ic": "🦽",
  "nm": "Phục hồi chức năng",
  "gh": [
   "#239"
  ],
  "gap": false,
  "module_id": "rehab",
  "summary": "Phân hệ Phục hồi chức năng (REH, lớp clin) số hóa luồng PHCN 4 chặng: Chuyển PHCN (RehabReferrals) → Đánh giá chức năng (FunctionalAssessments: Barthel/FIM/Berg/ROM/sức cơ MMT/đau) → Kế hoạch PHCN (RehabTreatmentPlans: mục tiêu STG/LTG + can thiệp + số buổi dự kiến) → Buổi tập (RehabSessions: ghi nhận từng buổi, sinh hiệu trước/sau, dung nạp, no-show/hủy). Backend (RehabilitationController + RehabilitationServiceImpl) lưu thật qua EF/HISDbContext; trạng thái giấy GT: Pending/Accepted/InProgress/Completed/Cancelled. FE chính ở v2 /v2/rehabilitation (KpiStrip + StatusTabs + DataTable + DrawerShell, chỉ làm list/xem/chấp nhận/in giấy GT) và FE v1 /rehabilitation (form tạo + đánh giá + kế hoạch + buổi tập đầy đủ hơn). Patient-safety: precautions/contraindications của giấy GT, đối chiếu sinh hiệu trước-sau buổi tập, audit log mọi mutation.",
  "screens": [
   {
    "name": "Danh sách giấy giới thiệu PHCN (v2)",
    "desc": "Màn chính: KPI (tổng giấy GT, khẩn/cấp cứu, đã chấp nhận, hoàn tất %), thanh tìm kiếm + lọc loại PHCN + StatusTabs (Chờ/Chấp nhận/Đang điều trị/Hoàn tất/Hủy-Từ chối), DataTable phân trang 18 dòng, action xem chi tiết + chấp nhận",
    "route_guess": "/v2/rehabilitation",
    "elements": [
     "KpiStrip 4 ô",
     "SearchBox 'Tìm BN/mã GT/chẩn đoán'",
     "Filter loại PHCN",
     "StatusTabs 5 trạng thái",
     "DataTable cột Mã GT/Bệnh nhân/Loại PHCN/Chẩn đoán/Khoa GT/Ngày GT/Ưu tiên/Trạng thái",
     "Pager",
     "ActBtn eye + check",
     "nút Làm mới + Giấy GT"
    ]
   },
   {
    "name": "Drawer chi tiết giấy GT (v2)",
    "desc": "DrawerShell size lg mở khi click dòng: 3 section Bệnh nhân / Yêu cầu PHCN / Người giới thiệu; footer Đóng + In giấy GT + Chấp nhận (nếu Pending)",
    "route_guess": "/v2/rehabilitation (drawer)",
    "elements": [
     "DrSec Bệnh nhân (họ tên/mã/tuổi-GT)",
     "DrSec Yêu cầu PHCN (loại/ưu tiên/chẩn đoán/ICD/mục tiêu/yêu cầu cụ thể/lưu ý)",
     "DrSec Người giới thiệu (khoa/BS/ngày GT/ngày chấp nhận/trạng thái)",
     "Btn In giấy GT (blob PDF)",
     "Btn Chấp nhận"
    ]
   },
   {
    "name": "Form tạo/sửa giấy giới thiệu PHCN (v1)",
    "desc": "Form tạo giấy GT: chọn bệnh nhân, loại PHCN (PT/OT/ST/Cardiac/Pulmonary), ưu tiên, chẩn đoán + ICD, lý do, mục tiêu, tần suất, thời lượng, lưu ý/chống chỉ định",
    "route_guess": "/rehabilitation",
    "elements": [
     "Select bệnh nhân",
     "Select rehabType",
     "Select priority (1-3)",
     "Input chẩn đoán + ICD",
     "TextArea lý do/mục tiêu",
     "Input tần suất/thời lượng",
     "TextArea precautions/contraindications",
     "nút Lưu/Hủy"
    ]
   },
   {
    "name": "Đánh giá chức năng (FunctionalAssessment)",
    "desc": "Form đánh giá Initial/Progress/Discharge: bệnh sử, khám (đau 0-10, ROM khớp, sức cơ MMT 0-5, thăng bằng, dáng đi), thang điểm chuẩn (Barthel 0-100, FIM, Berg, TUG, 6MWT, MMSE/MoCA), danh sách vấn đề + mục tiêu STG/LTG",
    "route_guess": "/rehabilitation (tab/modal đánh giá)",
    "elements": [
     "Select assessmentType",
     "Input painLevel 0-10",
     "Bảng ROM (active/passive/normal)",
     "Bảng MMT 0-5 trái/phải",
     "Input Barthel/FIM/Berg/TUG/6MWT",
     "List problemList/functionalLimitations",
     "List goals (STG/LTG)",
     "Select rehabPotential/prognosis"
    ]
   },
   {
    "name": "Kế hoạch điều trị PHCN (RehabTreatmentPlan)",
    "desc": "Lập kế hoạch từ đánh giá: mục tiêu, danh sách can thiệp (loại/mô tả/tham số/tần suất), số buổi dự kiến, ngày bắt đầu/dự kiến kết thúc; duyệt (approve) và xuất viện (discharge) kế hoạch",
    "route_guess": "/rehabilitation (tab kế hoạch)",
    "elements": [
     "List goals",
     "Bảng interventions (category/intervention/parameters/frequency)",
     "Input plannedSessions",
     "DatePicker startDate/expectedEndDate",
     "nút Duyệt (approve)",
     "nút Xuất viện (discharge + disposition)"
    ]
   },
   {
    "name": "Buổi tập PHCN (RehabSession) + lịch",
    "desc": "Lịch buổi tập theo ngày/KTV; xếp lịch, ghi nhận buổi tập (sinh hiệu trước/sau, đau trước/sau, bài tập/modalities thực hiện, dung nạp, ghi chú tiến triển), hủy buổi, đánh dấu no-show, in phiếu buổi tập",
    "route_guess": "/rehabilitation (tab buổi tập)",
    "elements": [
     "Lịch theo ngày/KTV",
     "nút Xếp lịch (ngày/giờ/địa điểm)",
     "Form ghi nhận: preVital/postVital, prePain/postPain 0-10",
     "Bảng bài tập (sets/reps/resistance)",
     "Select tolerance/patientResponse",
     "nút Hủy buổi (lý do)",
     "nút No-show",
     "In phiếu buổi tập"
    ]
   },
   {
    "name": "Báo cáo tiến triển & kết cục (Progress/Outcome)",
    "desc": "Báo cáo tiến triển định kỳ/xuất viện: so sánh đánh giá đầu vs hiện tại (Barthel/FIM change), % đạt mục tiêu, tỷ lệ tham dự; thống kê kết cục (FIM gain, goal achievement, satisfaction)",
    "route_guess": "/rehabilitation (tab tiến triển)",
    "elements": [
     "So sánh chỉ số đầu/hiện tại",
     "GoalProgress %",
     "attendanceRate",
     "RehabStatistics theo loại/chẩn đoán/xử trí",
     "nút Xuất báo cáo (blob)"
    ]
   },
   {
    "name": "Dashboard PHCN",
    "desc": "Bảng điều khiển: caseload (BN đang điều trị, GT mới hôm nay, GT chờ), lịch hôm nay (đã/chưa/hủy), phân bố theo loại PT/OT/ST, tỷ lệ no-show, cảnh báo đánh giá lại quá hạn, caseload theo KTV",
    "route_guess": "/rehabilitation (tab dashboard) hoặc /v2/rehabilitation KPI",
    "elements": [
     "KPI caseload",
     "Lịch hôm nay",
     "Phân bố theo loại PHCN",
     "cancellationRate/noShowRate",
     "alert overdueReassessments",
     "TherapistCaseload"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-REH-001",
    "title": "Tải danh sách giấy GT PHCN và hiển thị KPI + tab trạng thái đúng",
    "category": "happy",
    "priority": "P0",
    "role": "KTV PHCN / BS PHCN",
    "preconditions": "Đăng nhập admin/Admin@123; có >=5 giấy GT ở các trạng thái khác nhau (Pending/Accepted/InProgress/Completed/Cancelled).",
    "steps": [
     "Mở /v2/rehabilitation",
     "Quan sát KpiStrip 4 ô (Tổng giấy GT, Khẩn/Cấp cứu, Đã chấp nhận, Hoàn tất %)",
     "Quan sát StatusTabs với số đếm từng trạng thái",
     "Click lần lượt từng tab và kiểm tra bảng lọc đúng"
    ],
    "expected": "Bảng load đúng dữ liệu từ GET /rehabilitation/referrals; KPI Tổng = số dòng; số đếm mỗi tab khớp thực tế; tab Hoàn tất % = round(completed/total*100); cột Mã GT/Bệnh nhân/Loại/Chẩn đoán/Ngày GT/Ưu tiên/Trạng thái hiển thị đầy đủ.",
    "evidence": [
     {
      "name": "TC-REH-001__s01__list",
      "caption": "Danh sách giấy GT đã tải + KPI",
      "uiState": "list"
     },
     {
      "name": "TC-REH-001__s02__filter",
      "caption": "Lọc theo tab trạng thái",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#239",
     "#216"
    ],
    "notes": "Backend GetAllReferrals hiện trả PendingReferralsAsync — kiểm chứng có trả đủ mọi trạng thái không (gap tiềm ẩn)."
   },
   {
    "id": "TC-REH-002",
    "title": "Xem chi tiết giấy GT trong Drawer hiển thị đủ 3 section",
    "category": "happy",
    "priority": "P0",
    "role": "BS PHCN",
    "preconditions": "Có ít nhất 1 giấy GT đầy đủ thông tin (chẩn đoán, ICD, mục tiêu, khoa GT, BS GT).",
    "steps": [
     "Mở /v2/rehabilitation",
     "Click 1 dòng giấy GT hoặc nút mắt (Chi tiết)",
     "Quan sát DrawerShell mở bên phải",
     "Kiểm tra 3 section: Bệnh nhân, Yêu cầu PHCN, Người giới thiệu"
    ],
    "expected": "Drawer mở, tiêu đề 'Giấy GT <mã>'; section Bệnh nhân (họ tên/mã/tuổi-GT), Yêu cầu PHCN (loại/ưu tiên badge/chẩn đoán/ICD/mục tiêu/yêu cầu cụ thể/lưu ý), Người giới thiệu (khoa/BS/ngày GT/ngày chấp nhận/trạng thái); field thiếu hiển thị '—'.",
    "evidence": [
     {
      "name": "TC-REH-002__s01__drawer",
      "caption": "Drawer chi tiết giấy GT 3 section",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-003",
    "title": "Chấp nhận giấy GT đang ở trạng thái Chờ (Pending → Accepted)",
    "category": "happy",
    "priority": "P0",
    "role": "BS PHCN trưởng khoa",
    "preconditions": "Có >=1 giấy GT trạng thái Pending.",
    "steps": [
     "Mở /v2/rehabilitation tab Chờ",
     "Mở drawer 1 giấy GT Pending",
     "Nhấn nút 'Chấp nhận' (footer drawer hoặc ActBtn check ở bảng)",
     "Quan sát toast",
     "Kiểm tra giấy GT chuyển sang tab Chấp nhận, có acceptedDate"
    ],
    "expected": "POST /rehabilitation/referrals/{id}/accept thành công; toast 'Đã chấp nhận <mã>'; drawer đóng; danh sách reload; giấy GT chuyển trạng thái Accepted; KPI 'Đã chấp nhận' +1.",
    "evidence": [
     {
      "name": "TC-REH-003__s01__confirm",
      "caption": "Nhấn Chấp nhận trong drawer",
      "uiState": "confirm"
     },
     {
      "name": "TC-REH-003__s02__toast",
      "caption": "Toast chấp nhận thành công",
      "uiState": "toast"
     },
     {
      "name": "TC-REH-003__s03__list",
      "caption": "Giấy GT đã chuyển tab Chấp nhận",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239",
     "#222"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-004",
    "title": "Nút Chấp nhận chỉ hiện với Pending, không hiện với trạng thái khác",
    "category": "state",
    "priority": "P1",
    "role": "BS PHCN",
    "preconditions": "Có giấy GT ở các trạng thái Accepted/InProgress/Completed/Cancelled.",
    "steps": [
     "Mở /v2/rehabilitation",
     "Mở drawer 1 giấy GT Accepted",
     "Kiểm tra footer KHÔNG có nút Chấp nhận",
     "Lặp lại với Completed và Cancelled",
     "Kiểm tra ActBtn check không hiện ở các dòng không-Pending"
    ],
    "expected": "Nút/Action 'Chấp nhận' chỉ render khi sKey(status)==='pending'; với mọi trạng thái khác không có nút Chấp nhận (chặn chuyển trạng thái không hợp lệ ở UI).",
    "evidence": [
     {
      "name": "TC-REH-004__s01__drawer",
      "caption": "Drawer giấy GT Accepted không có nút Chấp nhận",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#239",
     "#223"
    ],
    "notes": "State-machine: chỉ Pending mới accept được."
   },
   {
    "id": "TC-REH-005",
    "title": "Gọi API chấp nhận trực tiếp lên giấy GT KHÔNG-Pending bị backend từ chối",
    "category": "negative",
    "priority": "P0",
    "role": "Kẻ tấn công / tester API",
    "preconditions": "Có id giấy GT trạng thái Completed; có JWT hợp lệ.",
    "steps": [
     "Lấy id 1 giấy GT đã Completed",
     "Gọi POST /api/rehabilitation/referrals/{id}/accept với Bearer token",
     "Quan sát response",
     "Kiểm tra DB trạng thái không đổi"
    ],
    "expected": "Backend trả lỗi 4xx (hoặc giữ nguyên không cho chuyển) — KHÔNG cho phép accept lại giấy GT đã hoàn tất/hủy; trạng thái DB giữ nguyên; audit không ghi mutation sai.",
    "evidence": [
     {
      "name": "TC-REH-005__s01__error",
      "caption": "Response từ chối accept giấy GT đã Completed",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239",
     "#223"
    ],
    "notes": "GAP nghi vấn: AcceptReferralAsync có thể không check trạng thái nguồn — cần verify."
   },
   {
    "id": "TC-REH-006",
    "title": "Tạo giấy GT PHCN mới đầy đủ trường bắt buộc (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "BS điều trị khoa gửi",
    "preconditions": "Có bệnh nhân hợp lệ trong hệ thống; vào form tạo /rehabilitation.",
    "steps": [
     "Mở /rehabilitation, mở form Giấy GT mới",
     "Chọn bệnh nhân",
     "Chọn loại PHCN = PT",
     "Chọn ưu tiên = Thường (1)",
     "Nhập chẩn đoán + mã ICD",
     "Nhập lý do giới thiệu + mục tiêu",
     "Nhấn Lưu"
    ],
    "expected": "POST /rehabilitation/referrals thành công; sinh referralCode dạng REH-yyyyMMddHHmmss; trạng thái mặc định Pending; giấy GT mới xuất hiện ở /v2/rehabilitation tab Chờ.",
    "evidence": [
     {
      "name": "TC-REH-006__s01__form",
      "caption": "Form tạo giấy GT đã điền",
      "uiState": "form"
     },
     {
      "name": "TC-REH-006__s02__success",
      "caption": "Tạo thành công + mã REH sinh tự động",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-007",
    "title": "Validation: tạo giấy GT thiếu bệnh nhân / thiếu loại PHCN / thiếu chẩn đoán",
    "category": "validation",
    "priority": "P0",
    "role": "BS điều trị",
    "preconditions": "Ở form tạo giấy GT.",
    "steps": [
     "Để trống bệnh nhân, nhấn Lưu → kiểm tra báo lỗi",
     "Chọn bệnh nhân, để trống loại PHCN, Lưu",
     "Chọn loại, để trống chẩn đoán, Lưu",
     "Quan sát thông báo lỗi từng field"
    ],
    "expected": "Mỗi field bắt buộc (patientId, rehabType, diagnosis/reason) chặn submit với thông báo lỗi tiếng Việt rõ ràng dưới field; không gọi API khi chưa hợp lệ; backend cũng validate (không tạo record rỗng).",
    "evidence": [
     {
      "name": "TC-REH-007__s01__validation",
      "caption": "Lỗi validation các field bắt buộc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239",
     "#218"
    ],
    "notes": "BE CreateReferralAsync hiện default rehabType='PT', Diagnosis='' nếu null — kiểm tra có chấp nhận rỗng không (gap)."
   },
   {
    "id": "TC-REH-008",
    "title": "Edge: chẩn đoán/mục tiêu chuỗi rất dài + ký tự đặc biệt + dấu tiếng Việt",
    "category": "edge",
    "priority": "P1",
    "role": "BS điều trị",
    "preconditions": "Ở form tạo giấy GT.",
    "steps": [
     "Nhập chẩn đoán 2000+ ký tự có dấu tiếng Việt",
     "Nhập mục tiêu chứa ký tự đặc biệt < > & ' \" và emoji",
     "Nhấn Lưu",
     "Mở lại drawer chi tiết kiểm tra hiển thị"
    ],
    "expected": "Không vỡ UI; chuỗi dài bị giới hạn theo độ dài cột (NVARCHAR) hoặc báo lỗi rõ; dấu tiếng Việt hiển thị đúng; ký tự đặc biệt được encode (không lỗi render), không XSS.",
    "evidence": [
     {
      "name": "TC-REH-008__s01__form",
      "caption": "Nhập chuỗi dài + ký tự đặc biệt",
      "uiState": "form"
     },
     {
      "name": "TC-REH-008__s02__drawer",
      "caption": "Hiển thị lại trong drawer không vỡ",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#239",
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-009",
    "title": "Security: XSS qua field ghi chú/mục tiêu/lý do giấy GT",
    "category": "security",
    "priority": "P0",
    "role": "Kẻ tấn công",
    "preconditions": "Có quyền tạo giấy GT.",
    "steps": [
     "Tạo giấy GT với mục tiêu = <img src=x onerror=alert(1)>",
     "Lưu",
     "Mở /v2/rehabilitation, mở drawer giấy GT vừa tạo",
     "Quan sát có script chạy không"
    ],
    "expected": "Payload hiển thị như text thuần (React escape), KHÔNG thực thi script; không có alert; field 'Mục tiêu'/'Yêu cầu cụ thể'/'Lưu ý' an toàn.",
    "evidence": [
     {
      "name": "TC-REH-009__s01__drawer",
      "caption": "Payload XSS hiển thị dạng text, không chạy",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#239",
     "#231"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-010",
    "title": "Từ chối giấy GT kèm lý do (Pending → Cancelled/Rejected)",
    "category": "happy",
    "priority": "P1",
    "role": "BS PHCN trưởng khoa",
    "preconditions": "Có giấy GT Pending; endpoint POST /referrals/{id}/reject tồn tại.",
    "steps": [
     "Mở giấy GT Pending",
     "Chọn Từ chối, nhập lý do từ chối",
     "Xác nhận",
     "Kiểm tra giấy GT chuyển tab Hủy/Từ chối"
    ],
    "expected": "POST /rehabilitation/referrals/{id}/reject với reason thành công; giấy GT chuyển trạng thái Cancelled/Rejected; lý do được lưu và hiển thị; KPI cập nhật.",
    "evidence": [
     {
      "name": "TC-REH-010__s01__modal",
      "caption": "Modal nhập lý do từ chối",
      "uiState": "modal"
     },
     {
      "name": "TC-REH-010__s02__list",
      "caption": "Giấy GT chuyển tab Hủy/Từ chối",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239",
     "#222"
    ],
    "notes": "FE v2 hiện CHƯA có nút Từ chối — gap UI (chỉ có acceptReferral). Test trên v1 hoặc API."
   },
   {
    "id": "TC-REH-011",
    "title": "Validation: từ chối giấy GT bắt buộc nhập lý do",
    "category": "validation",
    "priority": "P1",
    "role": "BS PHCN",
    "preconditions": "Có giấy GT Pending; mở modal từ chối.",
    "steps": [
     "Mở modal Từ chối",
     "Để trống ô lý do",
     "Nhấn Xác nhận",
     "Quan sát báo lỗi"
    ],
    "expected": "Không cho từ chối khi lý do rỗng; báo lỗi 'Vui lòng nhập lý do từ chối'; không gọi API.",
    "evidence": [
     {
      "name": "TC-REH-011__s01__validation",
      "caption": "Lỗi bắt buộc lý do từ chối",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239",
     "#218"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-012",
    "title": "Tạo đánh giá chức năng ban đầu (Initial) với thang điểm chuẩn",
    "category": "happy",
    "priority": "P0",
    "role": "KTV/BS PHCN",
    "preconditions": "Có giấy GT đã Accepted để gắn đánh giá.",
    "steps": [
     "Mở giấy GT Accepted, vào tab/màn Đánh giá chức năng",
     "Chọn assessmentType = Initial",
     "Nhập painLevel, ROM khớp, sức cơ MMT",
     "Nhập Barthel, FIM, Berg",
     "Nhập problemList + goals (STG/LTG)",
     "Lưu"
    ],
    "expected": "POST /rehabilitation/assessments thành công; đánh giá gắn đúng referralId; điểm Barthel/FIM/Berg lưu đúng; goals lưu; assessment hiển thị trong lịch sử đánh giá.",
    "evidence": [
     {
      "name": "TC-REH-012__s01__form",
      "caption": "Form đánh giá chức năng Initial",
      "uiState": "form"
     },
     {
      "name": "TC-REH-012__s02__success",
      "caption": "Lưu đánh giá thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-013",
    "title": "Validation/boundary thang điểm đánh giá (Barthel 0-100, FIM, đau 0-10, MMT 0-5)",
    "category": "validation",
    "priority": "P0",
    "role": "KTV PHCN",
    "preconditions": "Ở form đánh giá chức năng.",
    "steps": [
     "Nhập painLevel = -1 → kiểm tra chặn",
     "Nhập painLevel = 11 → chặn",
     "Nhập Barthel = 101 → chặn",
     "Nhập Barthel = -5 → chặn",
     "Nhập MMT = 6 → chặn",
     "Nhập biên hợp lệ painLevel=0, painLevel=10, Barthel=0, Barthel=100, MMT=5 → chấp nhận"
    ],
    "expected": "Mỗi thang điểm validate đúng range (đau 0-10, Barthel 0-100, MMT 0-5, FIM 18-126); giá trị ngoài range bị chặn với thông báo; giá trị biên hợp lệ được chấp nhận.",
    "evidence": [
     {
      "name": "TC-REH-013__s01__validation",
      "caption": "Lỗi range thang điểm ngoài biên",
      "uiState": "validation"
     },
     {
      "name": "TC-REH-013__s02__form",
      "caption": "Giá trị biên hợp lệ được chấp nhận",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#239",
     "#218"
    ],
    "notes": "GAP: cần xác minh BE có validate range hay nhận bừa."
   },
   {
    "id": "TC-REH-014",
    "title": "Lập kế hoạch điều trị PHCN từ đánh giá (số buổi, can thiệp, mục tiêu)",
    "category": "happy",
    "priority": "P0",
    "role": "BS PHCN",
    "preconditions": "Có giấy GT Accepted + đã có đánh giá chức năng.",
    "steps": [
     "Vào màn Kế hoạch PHCN cho giấy GT",
     "Thêm mục tiêu STG/LTG",
     "Thêm danh sách can thiệp (category/intervention/parameters)",
     "Nhập plannedSessions = 20",
     "Chọn startDate, expectedEndDate",
     "Lưu"
    ],
    "expected": "POST /rehabilitation/treatment-plans thành công; sinh planCode; gắn đúng referralId + assessmentId; completedSessions=0; trạng thái plan khởi tạo; số buổi dự kiến lưu đúng.",
    "evidence": [
     {
      "name": "TC-REH-014__s01__form",
      "caption": "Form kế hoạch điều trị với can thiệp + mục tiêu",
      "uiState": "form"
     },
     {
      "name": "TC-REH-014__s02__success",
      "caption": "Tạo kế hoạch thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-015",
    "title": "Negative: lập kế hoạch khi giấy GT chưa được chấp nhận / chưa có đánh giá",
    "category": "negative",
    "priority": "P1",
    "role": "BS PHCN",
    "preconditions": "Có giấy GT Pending (chưa accept, chưa đánh giá).",
    "steps": [
     "Thử lập kế hoạch cho giấy GT còn Pending",
     "Quan sát hệ thống có chặn không",
     "Thử lập kế hoạch khi chưa có assessment",
     "Quan sát"
    ],
    "expected": "Hệ thống chặn lập kế hoạch khi chưa qua bước chấp nhận/đánh giá (thao tác sai thứ tự luồng PHCN); báo lỗi rõ ràng; không tạo plan mồ côi.",
    "evidence": [
     {
      "name": "TC-REH-015__s01__error",
      "caption": "Chặn lập kế hoạch sai thứ tự luồng",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239",
     "#223"
    ],
    "notes": "GAP: kiểm tra BE có enforce thứ tự Referral→Assessment→Plan."
   },
   {
    "id": "TC-REH-016",
    "title": "Duyệt kế hoạch điều trị (approve) và chặn duyệt 2 lần",
    "category": "state",
    "priority": "P1",
    "role": "BS PHCN trưởng khoa",
    "preconditions": "Có kế hoạch chưa duyệt.",
    "steps": [
     "Mở kế hoạch chưa duyệt",
     "Nhấn Duyệt",
     "Kiểm tra approvedBy/approvedDate được set",
     "Nhấn Duyệt lần nữa",
     "Quan sát"
    ],
    "expected": "Lần 1: kế hoạch chuyển Approved, ghi approvedBy = user thật + approvedDate; lần 2: chặn duyệt lại (hoặc no-op) — không ghi đè người duyệt.",
    "evidence": [
     {
      "name": "TC-REH-016__s01__confirm",
      "caption": "Duyệt kế hoạch thành công",
      "uiState": "confirm"
     },
     {
      "name": "TC-REH-016__s02__error",
      "caption": "Chặn duyệt lần 2",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239",
     "#223"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-017",
    "title": "Xếp lịch buổi tập và ghi nhận buổi tập đầy đủ (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "KTV PHCN",
    "preconditions": "Có kế hoạch điều trị đã duyệt với plannedSessions>0.",
    "steps": [
     "Vào màn Buổi tập, nhấn Xếp lịch (ngày/giờ/địa điểm, KTV)",
     "Mở buổi tập đã xếp",
     "Nhập sinh hiệu trước + đau trước",
     "Nhập bài tập/modalities thực hiện",
     "Nhập sinh hiệu sau + đau sau + dung nạp + ghi chú tiến triển",
     "Hoàn tất buổi tập"
    ],
    "expected": "POST /sessions/schedule + /sessions/{id}/document thành công; sessionNumber tự tăng; completedSessions của plan +1; buổi tập hiển thị trong lịch theo ngày/KTV.",
    "evidence": [
     {
      "name": "TC-REH-017__s01__form",
      "caption": "Form ghi nhận buổi tập (sinh hiệu trước/sau)",
      "uiState": "form"
     },
     {
      "name": "TC-REH-017__s02__success",
      "caption": "Buổi tập hoàn tất + completedSessions tăng",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-018",
    "title": "Hủy buổi tập kèm lý do và đánh dấu No-show",
    "category": "happy",
    "priority": "P1",
    "role": "KTV PHCN",
    "preconditions": "Có buổi tập đã xếp lịch (Scheduled).",
    "steps": [
     "Mở buổi tập Scheduled",
     "Nhấn Hủy buổi, nhập lý do, xác nhận",
     "Với buổi khác: nhấn Đánh dấu No-show",
     "Kiểm tra trạng thái + thống kê noShowRate/cancellationRate"
    ],
    "expected": "POST /sessions/{id}/cancel (reason bắt buộc) + /sessions/{id}/no-show thành công; buổi chuyển trạng thái tương ứng; KHÔNG tính vào completedSessions; thống kê cancellationRate/noShowRate cập nhật.",
    "evidence": [
     {
      "name": "TC-REH-018__s01__modal",
      "caption": "Modal hủy buổi nhập lý do",
      "uiState": "modal"
     },
     {
      "name": "TC-REH-018__s02__confirm",
      "caption": "Buổi đánh dấu no-show",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#239",
     "#222"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-019",
    "title": "Edge: xếp buổi tập ngày quá khứ / ngày tương lai xa / trùng giờ KTV",
    "category": "edge",
    "priority": "P1",
    "role": "KTV PHCN",
    "preconditions": "KTV đã có buổi tập ở một khung giờ.",
    "steps": [
     "Xếp buổi vào ngày hôm qua (quá khứ) → quan sát",
     "Xếp buổi vào năm 2099 → quan sát",
     "Xếp buổi trùng khung giờ + cùng KTV với buổi đã có → quan sát"
    ],
    "expected": "Ngày quá khứ bị cảnh báo/chặn (hoặc cho phép có cờ rõ ràng); ngày tương lai xa bất hợp lý bị cảnh báo; trùng lịch KTV bị phát hiện (cảnh báo chồng lịch) — không tạo lịch xung đột âm thầm.",
    "evidence": [
     {
      "name": "TC-REH-019__s01__validation",
      "caption": "Cảnh báo ngày quá khứ / trùng lịch KTV",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239",
     "#218"
    ],
    "notes": "GAP: cần xác minh có check trùng lịch KTV không."
   },
   {
    "id": "TC-REH-020",
    "title": "Hoàn tất buổi tập cuối → kế hoạch chuyển Completed; data-consistency completedSessions",
    "category": "data-consistency",
    "priority": "P0",
    "role": "KTV/BS PHCN",
    "preconditions": "Kế hoạch plannedSessions=N, đã hoàn tất N-1 buổi.",
    "steps": [
     "Ghi nhận hoàn tất buổi thứ N",
     "Mở kế hoạch điều trị, kiểm tra completedSessions = N",
     "Kiểm tra trạng thái kế hoạch",
     "Mở dashboard kiểm tra số liệu",
     "Kiểm tra báo cáo tiến triển attendanceRate"
    ],
    "expected": "completedSessions = plannedSessions; kế hoạch có thể đề xuất chuyển Completed; số liệu dashboard (completedSessionsToday) + báo cáo tiến triển (sessionsCompleted, attendanceRate) tính nhất quán; audit log ghi mọi mutation.",
    "evidence": [
     {
      "name": "TC-REH-020__s01__detail",
      "caption": "completedSessions khớp plannedSessions",
      "uiState": "detail"
     },
     {
      "name": "TC-REH-020__s02__tab",
      "caption": "Báo cáo tiến triển attendanceRate đúng",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#239",
     "#226"
    ],
    "notes": "Kiểm chứng tính nhất quán Session→Plan→Progress→Dashboard."
   },
   {
    "id": "TC-REH-021",
    "title": "Xuất viện kế hoạch PHCN với disposition và sinh kết cục (Outcome)",
    "category": "happy",
    "priority": "P1",
    "role": "BS PHCN",
    "preconditions": "Có kế hoạch đang điều trị + đánh giá Discharge.",
    "steps": [
     "Mở kế hoạch, nhấn Xuất viện",
     "Chọn dischargeDisposition + ghi chú",
     "Xác nhận",
     "Mở Outcome/thống kê kiểm tra FIM gain, goalAchievementRate"
    ],
    "expected": "POST /treatment-plans/{id}/discharge thành công; plan chuyển trạng thái xuất viện; outcome tính initialFim/dischargeFim/fimGain + goalAchievementRate; báo cáo kết cục hiển thị.",
    "evidence": [
     {
      "name": "TC-REH-021__s01__modal",
      "caption": "Modal xuất viện chọn disposition",
      "uiState": "modal"
     },
     {
      "name": "TC-REH-021__s02__detail",
      "caption": "Outcome FIM gain + goal achievement",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-022",
    "title": "Báo cáo tiến triển so sánh đánh giá đầu vs hiện tại (data-consistency)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "BS PHCN",
    "preconditions": "Có >=2 đánh giá (Initial + Progress) cho cùng kế hoạch.",
    "steps": [
     "Tạo báo cáo tiến triển",
     "Kiểm tra so sánh Barthel/FIM/Berg đầu vs hiện tại",
     "Kiểm tra changeFromInitial = current - initial",
     "Kiểm tra % đạt mục tiêu khớp goalsProgress"
    ],
    "expected": "changeFromInitial tính đúng (current - initial cho từng chỉ số); overallGoalAchievement = trung bình achievementPct; attendanceRate = sessionsCompleted/(completed+missed); số liệu khớp đánh giá nguồn.",
    "evidence": [
     {
      "name": "TC-REH-022__s01__tab",
      "caption": "Bảng so sánh chỉ số đầu/hiện tại + change",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#239",
     "#226"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-023",
    "title": "In giấy GT / phiếu buổi tập / báo cáo (blob PDF)",
    "category": "happy",
    "priority": "P2",
    "role": "BS/KTV PHCN",
    "preconditions": "Có giấy GT + buổi tập đã hoàn tất.",
    "steps": [
     "Mở drawer giấy GT, nhấn 'In giấy GT'",
     "Quan sát tab/window mở blob",
     "In phiếu buổi tập",
     "In báo cáo tiến triển"
    ],
    "expected": "GET .../print-referral, /sessions/{id}/print trả blob PDF; mở được trong tab mới; nội dung biểu mẫu hiển thị đúng tiếng Việt có dấu; nếu lỗi thì toast 'Không thể in...' (không crash).",
    "evidence": [
     {
      "name": "TC-REH-023__s01__success",
      "caption": "PDF giấy GT mở trong tab mới",
      "uiState": "success"
     },
     {
      "name": "TC-REH-023__s02__error",
      "caption": "Toast lỗi khi in thất bại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-024",
    "title": "Permission: vai trò không đủ quyền bị chặn menu/nút/API PHCN",
    "category": "permission",
    "priority": "P0",
    "role": "Lễ tân / Thu ngân (không thuộc khoa PHCN)",
    "preconditions": "Có user vai trò không phải PHCN (vd Lễ tân) theo matrix #216.",
    "steps": [
     "Đăng nhập user không có quyền PHCN",
     "Kiểm tra menu 'VLTL / PHCN' có ẩn không",
     "Truy cập trực tiếp /v2/rehabilitation",
     "Gọi trực tiếp POST /api/rehabilitation/referrals/{id}/accept"
    ],
    "expected": "Menu PHCN ẩn với vai trò không đủ quyền; truy cập route bị chặn/redirect; API trả 403 Forbidden; không thực hiện được mutation.",
    "evidence": [
     {
      "name": "TC-REH-024__s01__permission",
      "caption": "Menu PHCN ẩn / route bị chặn với vai trò không quyền",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#239",
     "#216"
    ],
    "notes": "GAP: Controller chỉ có [Authorize] chung — cần verify có phân quyền role-level theo matrix không (nghi ngờ thiếu)."
   },
   {
    "id": "TC-REH-025",
    "title": "Security IDOR: user truy vấn giấy GT/đánh giá của bệnh nhân ngoài phạm vi",
    "category": "security",
    "priority": "P0",
    "role": "KTV PHCN khoa A",
    "preconditions": "Có 2 giấy GT của 2 bệnh nhân khác nhau; biết id giấy GT không thuộc khoa user.",
    "steps": [
     "Đăng nhập user khoa A",
     "Gọi GET /api/rehabilitation/referrals/{id} với id của giấy GT khoa khác",
     "Gọi GET /api/rehabilitation/assessments/{id} với id ngoài phạm vi",
     "Quan sát có lộ dữ liệu BN khác không"
    ],
    "expected": "Hệ thống kiểm soát truy cập theo phạm vi/bệnh nhân — không cho user xem hồ sơ PHCN của BN ngoài quyền; trả 403/404, không lộ dữ liệu nhạy cảm (chẩn đoán, sinh hiệu).",
    "evidence": [
     {
      "name": "TC-REH-025__s01__error",
      "caption": "Chặn IDOR truy cập giấy GT ngoài phạm vi",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239",
     "#231"
    ],
    "notes": "GAP nghi vấn: endpoint GetReferral(id) không thấy lọc theo quyền — rủi ro IDOR."
   },
   {
    "id": "TC-REH-026",
    "title": "Patient-safety: đối chiếu chống chỉ định/lưu ý + sinh hiệu bất thường trước buổi tập",
    "category": "validation",
    "priority": "P0",
    "role": "KTV PHCN",
    "preconditions": "Giấy GT/kế hoạch có contraindications/precautions; buổi tập nhập sinh hiệu trước bất thường (HA cao, SpO2 thấp).",
    "steps": [
     "Mở buổi tập của BN có precautions/contraindications",
     "Nhập preVitalSigns: HA 200/110, SpO2 85%",
     "Quan sát có cảnh báo trước khi tập không",
     "Kiểm tra hiển thị contraindications nổi bật"
    ],
    "expected": "Hệ thống hiển thị/cảnh báo precautions + contraindications nổi bật trước buổi tập; sinh hiệu trước bất thường được cảnh báo (an toàn người bệnh) trước khi ghi nhận tập; không cho hoàn tất âm thầm khi có cờ nguy hiểm.",
    "evidence": [
     {
      "name": "TC-REH-026__s01__form",
      "caption": "Cảnh báo chống chỉ định + sinh hiệu bất thường",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#239",
     "#221"
    ],
    "notes": "GAP: nghi ngờ chưa có cảnh báo sinh hiệu/chống chỉ định ở buổi tập."
   },
   {
    "id": "TC-REH-027",
    "title": "UI states: empty / loading / error của danh sách PHCN",
    "category": "ui",
    "priority": "P1",
    "role": "BS PHCN",
    "preconditions": "Môi trường có thể tạo trạng thái rỗng và mô phỏng API lỗi.",
    "steps": [
     "Mở /v2/rehabilitation khi DB chưa có giấy GT → kiểm tra empty 'Chưa có giấy giới thiệu PHCN'",
     "Reload và quan sát trạng thái loading 'Đang tải…'",
     "Mô phỏng API /referrals lỗi → kiểm tra toast 'Không tải được giấy giới thiệu PHCN'"
    ],
    "expected": "Empty state hiển thị đúng câu tiếng Việt; loading hiển thị 'Đang tải…' trong bảng; lỗi tải hiển thị toast cảnh báo, không crash trang, KpiStrip không NaN.",
    "evidence": [
     {
      "name": "TC-REH-027__s01__empty",
      "caption": "Empty state danh sách PHCN",
      "uiState": "empty"
     },
     {
      "name": "TC-REH-027__s02__loading",
      "caption": "Loading state bảng",
      "uiState": "loading"
     },
     {
      "name": "TC-REH-027__s03__error",
      "caption": "Toast lỗi tải dữ liệu",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239",
     "#219"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-028",
    "title": "UI dark/light parity + format ngày/số trên màn PHCN",
    "category": "ui",
    "priority": "P2",
    "role": "Người dùng bất kỳ",
    "preconditions": "Có dữ liệu giấy GT.",
    "steps": [
     "Mở /v2/rehabilitation ở light mode",
     "Bật dark mode (topbar v2)",
     "Kiểm tra KPI/bảng/drawer/badge hiển thị tương phản tốt",
     "Kiểm tra ngày định dạng DD/MM/YYYY, badge ưu tiên màu đúng (Thường ok / Khẩn warn / Cấp cứu crit)"
    ],
    "expected": "Mọi thành phần (KpiStrip, DataTable, DrawerShell, StatusBadge) hiển thị đúng cả dark/light, đủ tương phản, không chữ tàng hình; ngày DD/MM/YYYY; badge ưu tiên/trạng thái đúng tone màu; số đếm hiển thị đúng.",
    "evidence": [
     {
      "name": "TC-REH-028__s01__list",
      "caption": "Light mode danh sách PHCN",
      "uiState": "list"
     },
     {
      "name": "TC-REH-028__s02__list",
      "caption": "Dark mode parity",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239",
     "#220"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-029",
    "title": "Tìm kiếm + lọc loại PHCN + bỏ lọc + phân trang",
    "category": "happy",
    "priority": "P1",
    "role": "BS PHCN",
    "preconditions": "Có >18 giấy GT nhiều loại (PT/OT/ST).",
    "steps": [
     "Gõ từ khóa tên BN vào SearchBox → bảng lọc",
     "Gõ mã GT → lọc",
     "Chọn Filter 'Loại PHCN' = PT → lọc",
     "Nhấn 'Bỏ lọc' → reset",
     "Chuyển trang qua Pager"
    ],
    "expected": "Tìm kiếm khớp theo referralCode/patientName/patientCode/diagnosis/ICD; filter loại PHCN lọc đúng; 'Bỏ lọc' reset search+type+tab về all; Pager phân trang 18 dòng/trang, tổng số đúng; chuyển trang giữ filter.",
    "evidence": [
     {
      "name": "TC-REH-029__s01__filter",
      "caption": "Kết quả tìm kiếm + lọc loại PHCN",
      "uiState": "filter"
     },
     {
      "name": "TC-REH-029__s02__list",
      "caption": "Phân trang Pager",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-REH-030",
    "title": "Audit log ghi đúng mọi mutation PHCN với CreatedBy là user thật",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Admin / Auditor",
    "preconditions": "Đăng nhập user định danh rõ; AuditLogMiddleware bật.",
    "steps": [
     "Tạo 1 giấy GT",
     "Chấp nhận giấy GT",
     "Tạo đánh giá + kế hoạch + ghi nhận buổi tập",
     "Mở audit log / kiểm tra DB",
     "Kiểm tra CreatedBy/UpdatedBy của các record"
    ],
    "expected": "Mỗi mutation (create referral/accept/assessment/plan/session) sinh bản ghi audit; CreatedBy/UpdatedBy = Guid user thật (≠ Guid.Empty); thời điểm + hành động + entity ghi đúng phục vụ truy vết pháp lý.",
    "evidence": [
     {
      "name": "TC-REH-030__s01__detail",
      "caption": "Audit log các mutation PHCN với user thật",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239",
     "#227"
    ],
    "notes": "Controller có trong AuditLogMiddleware — xác minh CreatedBy không rỗng (lưu ý ValueConverter Guid)."
   }
  ],
  "ui_state_checklist": [
   "list — danh sách giấy GT đã tải (cột đầy đủ)",
   "loading — bảng đang tải 'Đang tải…'",
   "empty — 'Chưa có giấy giới thiệu PHCN'",
   "error — toast lỗi tải/in/accept thất bại",
   "filter — kết quả tìm kiếm + lọc loại PHCN + tab trạng thái",
   "drawer — chi tiết giấy GT 3 section",
   "form — form tạo giấy GT / đánh giá / kế hoạch / buổi tập",
   "validation — lỗi field bắt buộc/range thang điểm/lý do bắt buộc",
   "modal — modal từ chối / hủy buổi / xuất viện",
   "confirm — xác nhận chấp nhận / duyệt kế hoạch / no-show",
   "success — tạo/lưu thành công, PDF mở",
   "toast — thông báo chấp nhận/lỗi",
   "detail — completedSessions / outcome / audit log",
   "tab — báo cáo tiến triển so sánh chỉ số",
   "permission — menu/route/API bị chặn theo vai trò"
  ],
  "gaps": [
   "Phân quyền role-level: Controller chỉ [Authorize] chung, chưa thấy giới hạn theo vai trò PHCN theo matrix #216 — cần test/bổ sung chặn theo Role/khoa (rủi ro mọi user đăng nhập đều thao tác được PHCN).",
   "IDOR: GetReferral(id)/GetAssessment(id) không thấy lọc theo phạm vi bệnh nhân/khoa — nguy cơ xem hồ sơ PHCN của BN khác; cần test bảo mật và bổ sung kiểm soát truy cập.",
   "State-machine yếu: AcceptReferralAsync/Approve/lập kế hoạch có thể không enforce trạng thái nguồn + thứ tự luồng (Referral→Assessment→Plan→Session); cần case chặn chuyển trạng thái sai + chặn thao tác sai thứ tự.",
   "Validation thang điểm chuẩn (Barthel 0-100, FIM 18-126, đau 0-10, MMT 0-5) — chưa rõ BE validate range; cần kiểm boundary cả FE lẫn BE.",
   "FE v2 thiếu nút Từ chối giấy GT (chỉ có Accept), thiếu màn Đánh giá/Kế hoạch/Buổi tập/Tiến triển/Dashboard (mới có Referral list) — phần lớn luồng nằm ở v1; cần xác định màn nào test trên v1 vs port v2 (theo decision #204 v2-first).",
   "Patient-safety buổi tập: chưa rõ có cảnh báo contraindications/precautions + sinh hiệu trước bất thường (HA/SpO2) trước khi tập — gap an toàn người bệnh cần bổ sung.",
   "Trùng lịch KTV / quá tải caseload: chưa rõ có check chồng lịch khi ScheduleSession không — cần case xung đột lịch.",
   "Tính nhất quán completedSessions ↔ plan status ↔ progress attendanceRate ↔ dashboard — cần kiểm chuỗi end-to-end; backend GetAllReferrals đang trả PendingReferralsAsync (có thể không trả đủ trạng thái cho list).",
   "Liên thông viện phí: buổi tập PHCN có cptCodes/units nhưng chưa rõ có đẩy chi phí sang billing/BHYT — nếu phân hệ cần tính phí thì thiếu test data-consistency chi phí→viện phí."
  ]
 },
 {
  "id": "nutrition",
  "code": "NUT",
  "layer": "clin",
  "ic": "🥗",
  "nm": "Dinh dưỡng & Tiết chế",
  "gh": [
   "#239"
  ],
  "gap": false,
  "module_id": "nutrition",
  "summary": "Phan he \"Dinh duong & Tiet che\" (id=nutrition, NUT, lop clin) quan ly chuoi nghiep vu Sang loc dinh duong (NutritionScreenings: NRS-2002/SGA/MUST) -> Danh gia dinh duong (NutritionAssessments: nhan trac, sinh hoa, tinh nhu cau nang luong/protein/dich) -> Y lenh suat an (DietOrders) + Thuc don (MealPlans/MealPlanItems) + Theo doi dinh duong (NutritionMonitorings) + Nuoi duong tinh mach (TPNOrders), kem DM Loai suat an (DietTypes). Route v2 = /v2/nutrition (menu [24]). LUU Y QUAN TRONG: trang v2 hien tai (pages-v2/Nutrition.tsx) MOI CHI hien thuc tab Y lenh suat an (Diet Orders) - cac man Sang loc/Danh gia/Thuc don/Theo doi/TPN/Dashboard da co API client (api/nutrition.ts) va bang DB nhung CHUA co UI v2; day la gap lon can ghi nhan. Patient-safety trong tam: di ung thuc pham (foodAllergies/allergies), han che che do an (restrictions: than/dai thao duong/Na/K), doi chieu nhu cau nang luong, va canh bao TPN (osmolarity duong truyen ngoai bien vs trung tam).",
  "screens": [
   {
    "name": "Danh sach Y lenh suat an (Diet Orders)",
    "desc": "Man chinh hien thuc o v2: KPI (tong don / dang dung / nuoi dac biet NG-TPN / co di ung) + tab trang thai (Dang dung / Da ngung) + bo loc (Khoa, Duong nuoi) + o tim + bang DataTable + phan trang. Cot: Ma don, Benh nhan, Khoa-Giuong, Che do an, Cau truc, kcal-Pro, Duong nuoi, Di ung, Trang thai.",
    "route_guess": "/v2/nutrition",
    "elements": [
     "KpiStrip 4 the",
     "StatusTabs Dang dung/Da ngung",
     "SearchBox",
     "Filter Khoa",
     "Filter Duong nuoi",
     "Btn Bo loc",
     "Btn Lam moi",
     "Btn Don moi",
     "DataTable",
     "Pager",
     "ActBtn xem/sua/ngung"
    ]
   },
   {
    "name": "Drawer chi tiet Y lenh suat an",
    "desc": "DrawerShell size lg: cac muc Benh nhan, Che do an, Dinh luong (kcal/protein/dich), Han che & di ung, Chi dinh (BS, ngay bat dau/ket thuc, trang thai). Footer: Dong, In thuc don, Ngung don (neu dang dung), Chinh sua.",
    "route_guess": "/v2/nutrition",
    "elements": [
     "DrawerShell",
     "DrSec Benh nhan",
     "DrSec Che do an",
     "DrSec Dinh luong",
     "DrSec Han che & di ung",
     "DrSec Chi dinh",
     "Btn In thuc don",
     "Btn Ngung don",
     "Btn Chinh sua"
    ]
   },
   {
    "name": "Modal tao/sua Y lenh suat an (CrudModal)",
    "desc": "Form tao/cap nhat don: Benh nhan noi tru (select, disable khi sua), Che do an (select tu DietTypes), Cau truc (Thuong/Mem/Xay nhuyen/Long), Duong nuoi (Oral/NG/PEG/TPN), Nang luong kcal*, Protein g*, Dich ml, So bua/ngay*, Co bua phu (switch), Ngay bat dau*, Ngay ket thuc, Huong dan dac biet.",
    "route_guess": "/v2/nutrition",
    "elements": [
     "CrudModal",
     "select admissionId",
     "select dietType",
     "select texture",
     "select feedingRoute",
     "number energyKcal",
     "number proteinGrams",
     "number fluidMl",
     "number mealFrequency",
     "switch snacksIncluded",
     "date startDate",
     "date endDate",
     "textarea specialInstructions"
    ]
   },
   {
    "name": "Modal ngung don dinh duong",
    "desc": "ModalShell size sm: nhap Ly do ngung (TextArea) + nut Huy / Ngung don.",
    "route_guess": "/v2/nutrition",
    "elements": [
     "ModalShell",
     "TextArea ly do",
     "Btn Huy",
     "Btn Ngung don"
    ]
   },
   {
    "name": "Sang loc dinh duong (Screening) - API co, UI v2 CHUA co",
    "desc": "Theo api/nutrition.ts: cong cu NRS-2002/SGA/MUST, tinh diem, riskLevel Low/Medium/High, requiresAssessment. Endpoint screenings + pending + high-risk. Chua co man v2 -> gap.",
    "route_guess": "/v2/nutrition (tab du kien)",
    "elements": [
     "form screeningTool",
     "NRS score inputs",
     "SGA selects",
     "MUST score inputs",
     "riskLevel badge"
    ]
   },
   {
    "name": "Danh gia dinh duong (Assessment) - API co, UI v2 CHUA co",
    "desc": "Nhan trac (weight/height/bmi/IBW), sinh hoa (albumin/prealbumin), tinh BMR*activityFactor*stressFactor -> energyRequirement/proteinRequirement/fluidRequirement, chan doan dinh duong, ke hoach can thiep. Endpoint assessments + calculate-requirements.",
    "route_guess": "/v2/nutrition (tab du kien)",
    "elements": [
     "anthropometric inputs",
     "biochemical inputs",
     "calculate-requirements",
     "interventionPlan textarea"
    ]
   },
   {
    "name": "Thuc don / Suat an (Meal Plan) - API co, UI v2 CHUA co",
    "desc": "generateMealPlan theo ngay/khoa, PlannedMeal (Breakfast/Lunch/Dinner/Snack) voi MenuItems, deliveryStatus, consumptionPct, in phieu suat an / danh sach khoa.",
    "route_guess": "/v2/nutrition (tab du kien)",
    "elements": [
     "generate meal plan",
     "meal delivery",
     "record consumption",
     "print meal ticket"
    ]
   },
   {
    "name": "Theo doi dinh duong (Monitoring) - API co, UI v2 CHUA co",
    "desc": "Theo doi can nang, nang luong/protein dat (energyPct/proteinPct), labs, dung nap (toleranceAssessment), goalsMetStatus, ngay theo doi tiep.",
    "route_guess": "/v2/nutrition (tab du kien)",
    "elements": [
     "weight trend",
     "intake vs target",
     "tolerance assessment",
     "next monitoring date"
    ]
   },
   {
    "name": "Nuoi duong tinh mach (TPN) - API co, UI v2 CHUA co",
    "desc": "TPNOrder: thanh phan (dextrose/amino/lipid/dien giai), osmolarity, duong truyen Central/Peripheral, toc do truyen, tan suat theo doi duong huyet/dien giai, in nhan TPN.",
    "route_guess": "/v2/nutrition (tab du kien)",
    "elements": [
     "TPN components inputs",
     "osmolarity calc",
     "infusionRoute select",
     "print TPN label"
    ]
   },
   {
    "name": "Dashboard dinh duong - API co, UI v2 CHUA co",
    "desc": "getDashboard: tong BN, sang loc hom nay, cho sang loc, phan bo nguy co cao/trung/thap, ti le tuan thu suat an, % nang luong/protein dat, theo khoa.",
    "route_guess": "/v2/nutrition (tab du kien)",
    "elements": [
     "KPI cards",
     "risk distribution chart",
     "department screening table"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-NUT-001",
    "title": "Tao y lenh suat an thanh cong cho BN noi tru (happy path)",
    "category": "happy",
    "priority": "P0",
    "role": "Bac si dieu tri / Tiet che",
    "preconditions": "Da dang nhap admin/Admin@123; co it nhat 1 BN dang noi tru; da seed DietTypes; o route /v2/nutrition",
    "steps": [
     "Mo /v2/nutrition",
     "Bam 'Don moi'",
     "Chon Benh nhan (noi tru) tu dropdown co tim kiem",
     "Chon Che do an tu DietTypes",
     "Chon Cau truc 'Thuong', Duong nuoi 'Duong mieng'",
     "Nhap Nang luong 1800 kcal, Protein 70 g, So bua 3",
     "Chon Ngay bat dau hom nay",
     "Bam luu/Submit"
    ],
    "expected": "Toast 'Da tao don dinh duong'; modal dong; danh sach reload va xuat hien don moi voi trang thai 'Dang dung'; KPI 'Dang dung' tang 1",
    "evidence": [
     {
      "name": "TC-NUT-001__s01__list",
      "caption": "Danh sach Diet Orders truoc khi tao",
      "uiState": "list"
     },
     {
      "name": "TC-NUT-001__s02__form",
      "caption": "Form Don moi da dien day du",
      "uiState": "form"
     },
     {
      "name": "TC-NUT-001__s03__success",
      "caption": "Toast thanh cong + don moi trong bang",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239",
     "#216"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-002",
    "title": "Xem chi tiet y lenh suat an qua Drawer",
    "category": "happy",
    "priority": "P1",
    "role": "Bac si / Dieu duong",
    "preconditions": "Co it nhat 1 don dinh duong trong danh sach",
    "steps": [
     "Mo /v2/nutrition",
     "Bam vao 1 dong don (hoac icon mat 'Chi tiet')",
     "Quan sat Drawer chi tiet"
    ],
    "expected": "DrawerShell mo, hien day du muc Benh nhan, Che do an, Dinh luong (kcal/protein/dich), Han che & di ung, Chi dinh (BS, ngay, trang thai); footer co In/Ngung/Chinh sua",
    "evidence": [
     {
      "name": "TC-NUT-002__s01__drawer",
      "caption": "Drawer chi tiet don dinh duong",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-003",
    "title": "Sua y lenh suat an (cap nhat dinh luong, BN bi disable)",
    "category": "happy",
    "priority": "P1",
    "role": "Bac si dieu tri",
    "preconditions": "Co 1 don 'Dang dung'",
    "steps": [
     "Mo /v2/nutrition",
     "Bam icon 'Sua' tren 1 don dang dung",
     "Kiem tra truong Benh nhan bi disable (disabledOnEdit)",
     "Doi Nang luong tu 1800 -> 2000 kcal",
     "Bam luu"
    ],
    "expected": "Truong BN khong sua duoc; toast 'Da cap nhat don dinh duong'; bang reload hien kcal=2000",
    "evidence": [
     {
      "name": "TC-NUT-003__s01__form",
      "caption": "Form sua, truong BN disabled",
      "uiState": "form"
     },
     {
      "name": "TC-NUT-003__s02__success",
      "caption": "Toast cap nhat + gia tri moi",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-004",
    "title": "Ngung (cancel) y lenh suat an voi ly do",
    "category": "happy",
    "priority": "P0",
    "role": "Bac si dieu tri",
    "preconditions": "Co 1 don trang thai 'Dang dung'",
    "steps": [
     "Mo /v2/nutrition",
     "Bam icon 'Ngung don' (tone crit) tren 1 don dang dung",
     "Nhap ly do 'BN xuat vien'",
     "Bam 'Ngung don'"
    ],
    "expected": "Toast 'Da ngung don dinh duong'; modal dong; don chuyen sang 'Da ngung'; KPI 'Dang dung' giam 1; nut Ngung khong con o don da ngung",
    "evidence": [
     {
      "name": "TC-NUT-004__s01__modal",
      "caption": "Modal nhap ly do ngung",
      "uiState": "modal"
     },
     {
      "name": "TC-NUT-004__s02__success",
      "caption": "Don chuyen Da ngung + toast",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239",
     "#216"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-005",
    "title": "Validation: bo trong cac truong bat buoc khi tao don",
    "category": "validation",
    "priority": "P0",
    "role": "Bac si",
    "preconditions": "O man tao don moi",
    "steps": [
     "Mo 'Don moi'",
     "Khong chon Benh nhan, khong chon Che do an, de trong kcal/protein/so bua",
     "Bam Submit"
    ],
    "expected": "Form chan submit; hien thong bao loi tung truong bat buoc (Benh nhan, Che do an, Cau truc, Duong nuoi, Nang luong, Protein, So bua, Ngay bat dau); khong goi API tao",
    "evidence": [
     {
      "name": "TC-NUT-005__s01__validation",
      "caption": "Loi validation cac truong bat buoc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239",
     "#216"
    ],
    "notes": "required theo dietFields: admissionId, dietType, texture, feedingRoute, energyKcal, proteinGrams, mealFrequency, startDate"
   },
   {
    "id": "TC-NUT-006",
    "title": "Boundary: nang luong/protein gia tri bien (0, am, rat lon)",
    "category": "edge",
    "priority": "P1",
    "role": "Bac si",
    "preconditions": "O man tao don moi, da chon BN + che do an",
    "steps": [
     "Nhap Nang luong = 0, Protein = 0 -> Submit",
     "Nhap Nang luong = -500 -> Submit",
     "Nhap Nang luong = 999999 kcal, Protein = 50000 g -> Submit",
     "Quan sat ket qua"
    ],
    "expected": "Gia tri am/0 bi chan hoac canh bao khong hop le; gia tri sieu lon bi chan range hoac canh bao bat thuong (an toan dinh duong); khong tao don voi dinh luong vo ly",
    "evidence": [
     {
      "name": "TC-NUT-006__s01__validation",
      "caption": "Bien gia tri kcal/protein bi chan",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Hien dietFields chua dat min/max -> can kiem tra BE co chan khong; co the la gap"
   },
   {
    "id": "TC-NUT-007",
    "title": "Boundary ngay: ngay ket thuc < ngay bat dau, ngay tuong lai xa",
    "category": "edge",
    "priority": "P1",
    "role": "Bac si",
    "preconditions": "O man tao don, da dien cac truong khac",
    "steps": [
     "Chon Ngay bat dau = hom nay",
     "Chon Ngay ket thuc = hom qua (truoc ngay bat dau) -> Submit",
     "Doi Ngay bat dau = 01/01/2099 -> Submit",
     "Quan sat"
    ],
    "expected": "Ngay ket thuc < ngay bat dau bi chan/canh bao; ngay bat dau qua xa tuong lai bi canh bao hoac chap nhan co kiem soat; thong bao loi ro rang",
    "evidence": [
     {
      "name": "TC-NUT-007__s01__validation",
      "caption": "Loi ngay ket thuc truoc ngay bat dau",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Kiem tra cross-field date validation - co the chua co -> gap"
   },
   {
    "id": "TC-NUT-008",
    "title": "Negative: huy giua chung modal tao don (khong luu)",
    "category": "negative",
    "priority": "P2",
    "role": "Bac si",
    "preconditions": "O man /v2/nutrition",
    "steps": [
     "Bam 'Don moi'",
     "Dien mot phan (chon BN, nhap kcal)",
     "Bam Huy / dong modal",
     "Mo lai 'Don moi'"
    ],
    "expected": "Khong tao don nao; danh sach khong doi; mo lai form reset ve gia tri mac dinh (texture Regular, route Oral, mealFrequency 3, startDate hom nay)",
    "evidence": [
     {
      "name": "TC-NUT-008__s01__form",
      "caption": "Form sau khi huy va mo lai - da reset",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-009",
    "title": "Negative: huy modal ngung don, don van 'Dang dung'",
    "category": "negative",
    "priority": "P1",
    "role": "Bac si",
    "preconditions": "Co 1 don 'Dang dung'",
    "steps": [
     "Bam 'Ngung don' tren 1 don",
     "Nhap ly do roi bam 'Huy'",
     "Kiem tra trang thai don"
    ],
    "expected": "Modal dong, KHONG goi cancel; don van 'Dang dung'; lan sau mo modal o trong (cancelReason reset)",
    "evidence": [
     {
      "name": "TC-NUT-009__s01__modal",
      "caption": "Modal ngung - bam Huy",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-010",
    "title": "Ngung don khong nhap ly do (dung mac dinh)",
    "category": "edge",
    "priority": "P2",
    "role": "Bac si",
    "preconditions": "Co 1 don 'Dang dung'",
    "steps": [
     "Bam 'Ngung don'",
     "De trong o ly do",
     "Bam 'Ngung don'"
    ],
    "expected": "He thong gui ly do mac dinh 'Ngung theo chi dinh' (theo code doCancel); don chuyen Da ngung; toast thanh cong",
    "evidence": [
     {
      "name": "TC-NUT-010__s01__success",
      "caption": "Ngung khong nhap ly do -> dung default",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Can xac nhan BE co audit ghi ly do mac dinh dung khong"
   },
   {
    "id": "TC-NUT-011",
    "title": "State: chan ngung don da o trang thai 'Da ngung'",
    "category": "state",
    "priority": "P1",
    "role": "Bac si",
    "preconditions": "Co 1 don 'Da ngung'",
    "steps": [
     "Loc tab 'Da ngung'",
     "Mo 1 don da ngung",
     "Kiem tra nut hanh dong"
    ],
    "expected": "Khong hien nut 'Ngung don' (chi hien khi isActive); Drawer cung an nut Ngung; khong the ngung lai don da ngung",
    "evidence": [
     {
      "name": "TC-NUT-011__s01__detail",
      "caption": "Don da ngung - khong co nut Ngung",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239",
     "#216"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-012",
    "title": "Loc theo tab trang thai (Dang dung / Da ngung) va dem dung",
    "category": "happy",
    "priority": "P1",
    "role": "Dieu duong",
    "preconditions": "Co ca don dang dung va da ngung",
    "steps": [
     "Mo /v2/nutrition",
     "Bam tab 'Dang dung'",
     "Bam tab 'Da ngung'",
     "Bam tab 'Tat ca'",
     "Doi chieu so dem tren tab voi so dong"
    ],
    "expected": "Moi tab loc dung; so dem (counts) khop so dong hien thi; counts.active + counts.inactive = tong",
    "evidence": [
     {
      "name": "TC-NUT-012__s01__filter",
      "caption": "Tab trang thai + so dem",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-013",
    "title": "Loc theo Khoa va Duong nuoi + Bo loc",
    "category": "happy",
    "priority": "P2",
    "role": "Dieu duong",
    "preconditions": "Co don thuoc nhieu khoa & nhieu duong nuoi (Oral/NG/TPN)",
    "steps": [
     "Chon Filter Khoa = 1 khoa",
     "Chon Filter Duong nuoi = 'NG'",
     "Quan sat bang",
     "Bam 'Bo loc'"
    ],
    "expected": "Bang chi hien don khop khoa+duong nuoi; bam 'Bo loc' xoa het filter, search, ve tab 'Tat ca'",
    "evidence": [
     {
      "name": "TC-NUT-013__s01__filter",
      "caption": "Loc khoa + duong nuoi",
      "uiState": "filter"
     },
     {
      "name": "TC-NUT-013__s02__list",
      "caption": "Sau khi Bo loc - day du",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-014",
    "title": "Tim kiem theo ma don / ten BN / ma BN / ma HSDT",
    "category": "happy",
    "priority": "P2",
    "role": "Dieu duong",
    "preconditions": "Co nhieu don",
    "steps": [
     "Go ten BN co dau tieng Viet vao o tim",
     "Go ma don",
     "Go chuoi khong ton tai"
    ],
    "expected": "Bang loc dung theo orderCode/patientName/patientCode/medicalRecordCode (khong phan biet hoa thuong); chuoi khong ton tai -> bang empty 'Chua co don dinh duong'",
    "evidence": [
     {
      "name": "TC-NUT-014__s01__filter",
      "caption": "Ket qua tim kiem theo ten BN",
      "uiState": "filter"
     },
     {
      "name": "TC-NUT-014__s02__empty",
      "caption": "Tim chuoi khong ton tai -> empty",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-015",
    "title": "Patient-safety: hien thi canh bao DI UNG thuc pham noi bat",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bac si / Tiet che",
    "preconditions": "Co don voi allergies khong rong (vd hai san, dau phong)",
    "steps": [
     "Mo /v2/nutrition",
     "Quan sat cot 'Di ung' va KPI 'Co di ung'",
     "Mo Drawer don do, xem muc 'Han che & di ung'"
    ],
    "expected": "Cot Di ung hien text mau canh bao (--a-or-text); KPI 'Co di ung' dem dung so don co di ung; Drawer hien day du danh sach di ung + han che - bao dam an toan suat an",
    "evidence": [
     {
      "name": "TC-NUT-015__s01__list",
      "caption": "Cot di ung noi bat + KPI co di ung",
      "uiState": "list"
     },
     {
      "name": "TC-NUT-015__s02__drawer",
      "caption": "Drawer muc Han che & di ung",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#239",
     "#216"
    ],
    "notes": "Di ung/han che la patient-safety; can dam bao khong nuot loi khi mang/rong"
   },
   {
    "id": "TC-NUT-016",
    "title": "Data-consistency: KPI khop du lieu (tong/dang dung/nuoi dac biet/di ung)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quan ly tiet che",
    "preconditions": "Co tap don da dang (Oral/NG/TPN, co/khong di ung)",
    "steps": [
     "Mo /v2/nutrition",
     "Doc 4 the KPI",
     "Dem thu cong tu bang/du lieu",
     "Doi chieu"
    ],
    "expected": "KPI 'Don dinh duong' = tong items; 'Dang dung' dung so + % dung; 'Nuoi dac biet' = so don feedingRoute != Oral (NG/TPN); 'Co di ung' = so don allergies khac rong; phan tram lam tron dung",
    "evidence": [
     {
      "name": "TC-NUT-016__s01__list",
      "caption": "KPI strip doi chieu du lieu",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-017",
    "title": "UI states: loading, empty, error khi tai danh sach",
    "category": "ui",
    "priority": "P1",
    "role": "Tester",
    "preconditions": "Co the gia lap BE cham/loi (chan API /nutrition/diet-orders)",
    "steps": [
     "Mo /v2/nutrition voi BE binh thuong nhung chua co don -> empty",
     "Lam cho BE tra loi/timeout -> mo lai",
     "Trong luc tai quan sat trang thai loading"
    ],
    "expected": "Khi tai: bang hien 'Dang tai…'; khong co don: 'Chua co don dinh duong'; loi API: toast info 'Khong tai duoc don dinh duong', bang ve rong khong crash",
    "evidence": [
     {
      "name": "TC-NUT-017__s01__loading",
      "caption": "Trang thai dang tai",
      "uiState": "loading"
     },
     {
      "name": "TC-NUT-017__s02__empty",
      "caption": "Empty state khong co don",
      "uiState": "empty"
     },
     {
      "name": "TC-NUT-017__s03__error",
      "caption": "Loi tai -> toast info",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-018",
    "title": "UI: dark/light parity man dinh duong",
    "category": "ui",
    "priority": "P2",
    "role": "Tester",
    "preconditions": "Topbar v2 co toggle dark/light",
    "steps": [
     "Mo /v2/nutrition o che do sang",
     "Doi sang toi qua topbar",
     "Kiem tra KPI, bang, badge, Drawer, Modal",
     "Mo Drawer va Modal o ca 2 che do"
    ],
    "expected": "Mau chu/nen/duong vien/badge dung token (--t-0, --line, --d-1) ca 2 che do; chu di ung mau canh bao van doc duoc; khong vung chu trang tren nen trang",
    "evidence": [
     {
      "name": "TC-NUT-018__s01__list",
      "caption": "Man dinh duong che do toi",
      "uiState": "list"
     },
     {
      "name": "TC-NUT-018__s02__drawer",
      "caption": "Drawer che do toi",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-019",
    "title": "UI: format so/ngay (kcal mono, protein g, ngay DD/MM/YYYY)",
    "category": "ui",
    "priority": "P2",
    "role": "Tester",
    "preconditions": "Co don co day du dinh luong + ngay",
    "steps": [
     "Mo Drawer 1 don",
     "Kiem tra cot 'kcal · Pro' o bang",
     "Kiem tra muc Dinh luong va ngay Bat dau/Ket thuc"
    ],
    "expected": "kcal/protein hien font mono; gia tri thieu hien '—'; ngay format DD/MM/YYYY (dayjs); dich hien '… ml' chi khi co",
    "evidence": [
     {
      "name": "TC-NUT-019__s01__drawer",
      "caption": "Format so + ngay trong Drawer",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-020",
    "title": "Permission: vai tro khong du quyen bi chan menu/nut/API dinh duong",
    "category": "permission",
    "priority": "P0",
    "role": "User khong co quyen Nutrition (vd Le tan / Ke toan)",
    "preconditions": "Co tai khoan role khong duoc cap quyen phan he dinh duong (theo matrix #216)",
    "steps": [
     "Dang nhap bang role han che",
     "Kiem tra menu [24] Dinh duong co hien khong",
     "Truy cap truc tiep URL /v2/nutrition",
     "Goi truc tiep API POST /nutrition/diet-orders bang token role do"
    ],
    "expected": "Menu an hoac route chan (redirect/403); nut 'Don moi'/'Ngung' an hoac vo hieu; API tra 401/403 - khong tao/ngung duoc don",
    "evidence": [
     {
      "name": "TC-NUT-020__s01__permission",
      "caption": "Menu/nut bi chan voi role khong quyen",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#239"
    ],
    "notes": "Tham chieu role-permission matrix #216"
   },
   {
    "id": "TC-NUT-021",
    "title": "Security IDOR: xem/sua don dinh duong cua BN ngoai pham vi",
    "category": "security",
    "priority": "P0",
    "role": "User co quyen gioi han khoa/BN",
    "preconditions": "Co 2 don thuoc 2 BN/khoa khac nhau; token user chi duoc 1 pham vi",
    "steps": [
     "Lay id don cua BN khong thuoc pham vi user",
     "Goi GET /nutrition/diet-orders/{id} cua BN khac",
     "Goi PUT cap nhat don do",
     "Goi POST /nutrition/diet-orders/{id}/cancel"
    ],
    "expected": "BE chan truy cap don ngoai pham vi (403/404), khong lo thong tin BN khac; khong cho sua/ngung don BN khac; audit ghi nhan no luc truy cap",
    "evidence": [
     {
      "name": "TC-NUT-021__s01__permission",
      "caption": "IDOR bi chan khi truy cap don BN khac",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#239"
    ],
    "notes": "Can verify BE thuc su filter theo pham vi - co the la gap neu controller khong scope"
   },
   {
    "id": "TC-NUT-022",
    "title": "Security XSS: chu ghi (ly do ngung / huong dan dac biet) chua ma script",
    "category": "security",
    "priority": "P1",
    "role": "Bac si",
    "preconditions": "O man tao don / modal ngung",
    "steps": [
     "Tao don voi 'Huong dan dac biet' = <img src=x onerror=alert(1)>",
     "Ngung don voi ly do = <script>alert(2)</script>",
     "Mo lai Drawer / xem hien thi",
     "Doc lai gia tri qua API"
    ],
    "expected": "Noi dung hien duoi dang text tho, KHONG thuc thi script; khong popup; luu/hien an toan (escape)",
    "evidence": [
     {
      "name": "TC-NUT-022__s01__detail",
      "caption": "Chu ghi chua HTML hien thi an toan",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "foodAllergies/specialInstructions/reason la free-text -> kiem tra escape"
   },
   {
    "id": "TC-NUT-023",
    "title": "Edge: ten BN dai + ky tu dac biet + dau tieng Viet hien dung",
    "category": "edge",
    "priority": "P2",
    "role": "Tester",
    "preconditions": "Co BN ten dai/ co dau, va don co restrictions/allergies dang mang nhieu phan tu",
    "steps": [
     "Mo bang voi BN ten dai co dau (vd Nguyen Thi Hoang Yen Nhi...)",
     "Mo Drawer xem allergies/restrictions dang mang nhieu phan tu",
     "Kiem tra hien thi (join ', ')"
    ],
    "expected": "Ten dai khong vo layout (truncate/wrap dep); dau tieng Viet hien dung; allergies/restrictions dang string[] duoc join ', '; dang string giu nguyen; rong hien '—'",
    "evidence": [
     {
      "name": "TC-NUT-023__s01__list",
      "caption": "Ten BN dai + dau hien dung",
      "uiState": "list"
     },
     {
      "name": "TC-NUT-023__s02__drawer",
      "caption": "Allergies/restrictions mang join dung",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Code xu ly ca string[] lan string cho allergies/restrictions"
   },
   {
    "id": "TC-NUT-024",
    "title": "Negative: BE loi khi tai chi tiet de Sua (getDietOrderById that bai)",
    "category": "negative",
    "priority": "P2",
    "role": "Tester",
    "preconditions": "Gia lap API GET /diet-orders/{id} loi",
    "steps": [
     "Bam icon 'Sua' tren 1 don khi API chi tiet loi",
     "Quan sat"
    ],
    "expected": "Toast loi 'Khong tai duoc chi tiet don'; modal sua khong mo voi du lieu rac; khong crash",
    "evidence": [
     {
      "name": "TC-NUT-024__s01__error",
      "caption": "Loi tai chi tiet -> toast error",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Theo openEdit catch -> te('Khong tai duoc chi tiet don')"
   },
   {
    "id": "TC-NUT-025",
    "title": "Data-consistency: don dinh duong dac biet (TPN) phan anh dung KPI 'Nuoi dac biet'",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quan ly tiet che",
    "preconditions": "Tao don voi Duong nuoi = TPN va 1 don NG",
    "steps": [
     "Tao don feedingRoute = 'TPN'",
     "Tao don feedingRoute = 'NG'",
     "Tao don feedingRoute = 'Oral'",
     "Quan sat KPI 'Nuoi dac biet' va cot Duong"
    ],
    "expected": "KPI 'Nuoi dac biet (NG/TPN)' dem dung 2 (TPN+NG, loai tru Oral); cot Duong hien dung gia tri; mac dinh thieu route hien 'Oral'",
    "evidence": [
     {
      "name": "TC-NUT-025__s01__list",
      "caption": "KPI nuoi dac biet dem dung NG/TPN",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "isActive/feedingRoute logic: !=='oral' tinh la dac biet"
   },
   {
    "id": "TC-NUT-026",
    "title": "Phan trang: dieu huong trang khi >18 don/trang",
    "category": "edge",
    "priority": "P2",
    "role": "Tester",
    "preconditions": "Co >18 don dinh duong (PER=18)",
    "steps": [
     "Mo /v2/nutrition co >18 don",
     "Quan sat Pager",
     "Chuyen sang trang 2",
     "Doi tab/loc xem page reset ve 0"
    ],
    "expected": "Pager hien dung tong trang = ceil(n/18); chuyen trang dung; khi doi search/tab/filter, page reset ve 0 (khong ket o trang trong)",
    "evidence": [
     {
      "name": "TC-NUT-026__s01__list",
      "caption": "Phan trang + Pager",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": ""
   },
   {
    "id": "TC-NUT-027",
    "title": "In thuc don tu Drawer",
    "category": "happy",
    "priority": "P2",
    "role": "Dieu duong / Tiet che",
    "preconditions": "Co 1 don, mo Drawer chi tiet",
    "steps": [
     "Mo Drawer 1 don",
     "Bam 'In thuc don'"
    ],
    "expected": "Mo hop thoai in (window.print) hoac tao phieu thuc don; noi dung in dung BN/che do an/dinh luong",
    "evidence": [
     {
      "name": "TC-NUT-027__s01__drawer",
      "caption": "Drawer co nut In thuc don",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Hien dung window.print() - can xac nhan co template in rieng hay in ca trang (gap UX)"
   },
   {
    "id": "TC-NUT-028",
    "title": "GAP/Integration: Sang loc -> Danh gia -> Y lenh chuoi nghiep vu (UI v2 thieu)",
    "category": "integration",
    "priority": "P1",
    "role": "Bac si tiet che",
    "preconditions": "API nutrition co day du (screenings/assessments/diet-orders) nhung v2 chi co Diet Orders",
    "steps": [
     "Goi API tao Screening (NRS-2002) cho 1 admission",
     "Goi API tao Assessment lien ket screeningId",
     "Tao Diet Order lien ket assessmentId",
     "Kiem tra v2 co hien chuoi lien ket khong"
    ],
    "expected": "Du lieu lien ket dung (assessmentId tren DietOrder); NHUNG man v2 hien KHONG co tab Sang loc/Danh gia -> ghi nhan gap UI; can task fix bo sung man",
    "evidence": [
     {
      "name": "TC-NUT-028__s01__list",
      "caption": "v2 chi co Diet Orders - thieu Sang loc/Danh gia",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "GAP: API+DB co Screening/Assessment/MealPlan/Monitoring/TPN/Dashboard nhung khong co UI v2 - day la phat hien lon"
   },
   {
    "id": "TC-NUT-029",
    "title": "GAP/Patient-safety: TPN canh bao osmolarity vs duong truyen (UI v2 thieu)",
    "category": "edge",
    "priority": "P1",
    "role": "Bac si",
    "preconditions": "API tpn-orders co (osmolarity, infusionRoute Central/Peripheral)",
    "steps": [
     "Goi API tao TPNOrder voi osmolarity cao + infusionRoute=Peripheral",
     "Kiem tra co canh bao an toan khong",
     "Kiem tra UI v2"
    ],
    "expected": "BE/UI canh bao osmolarity cao khong duoc truyen duong ngoai bien (an toan); NHUNG v2 khong co man TPN -> ghi nhan gap",
    "evidence": [
     {
      "name": "TC-NUT-029__s01__error",
      "caption": "Canh bao TPN osmolarity (neu co)",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "GAP UI TPN + can verify BE co rule osmolarity an toan khong"
   },
   {
    "id": "TC-NUT-030",
    "title": "Audit log: moi mutation (tao/sua/ngung) duoc ghi audit",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Quan tri / Kiem toan",
    "preconditions": "AuditLogMiddleware bat; co quyen xem audit",
    "steps": [
     "Tao 1 don dinh duong",
     "Sua don do",
     "Ngung don do",
     "Kiem tra AuditLog cho cac thao tac POST/PUT/cancel /nutrition/*"
    ],
    "expected": "Moi mutation ghi audit voi user thuc (CreatedBy != Guid.Empty), thoi gian, endpoint, payload tom tat; ngung don ghi ca ly do",
    "evidence": [
     {
      "name": "TC-NUT-030__s01__detail",
      "caption": "Audit log ghi cac mutation dinh duong",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239",
     "#216"
    ],
    "notes": "Verify AuditLogMiddleware bao phu /nutrition; CreatedBy whitelist ValueConverter"
   }
  ],
  "ui_state_checklist": [
   "list - danh sach Diet Orders co du lieu",
   "empty - chua co don / tim khong thay 'Chua co don dinh duong'",
   "loading - 'Dang tai…' khi tai bang",
   "error - toast info/error khi API loi (tai danh sach / tai chi tiet sua)",
   "form - CrudModal tao + sua (BN disable khi sua)",
   "validation - loi truong bat buoc + bien gia tri + cross-field ngay",
   "drawer - DrawerShell chi tiet (Benh nhan/Che do an/Dinh luong/Han che&di ung/Chi dinh)",
   "modal - ModalShell ngung don (nhap ly do)",
   "filter - tab trang thai + Filter Khoa/Duong nuoi + SearchBox",
   "detail - trang thai don da ngung / audit / xss text",
   "success - toast tao/sua/ngung thanh cong",
   "permission - role khong quyen bi chan menu/nut/API/IDOR",
   "dark/light parity - KPI, bang, badge, Drawer, Modal 2 che do"
  ],
  "gaps": [
   "UI v2 (pages-v2/Nutrition.tsx) MOI chi co tab Y lenh suat an (Diet Orders); cac man Sang loc (NRS-2002/SGA/MUST), Danh gia (nhan trac/sinh hoa/tinh nhu cau), Thuc don/Suat an (MealPlan, delivery, consumption), Theo doi (Monitoring trend), Nuoi tinh mach (TPN), va Dashboard DEU co API client + bang DB nhung KHONG co UI v2 -> gap lon, can task fix bo sung man.",
   "Cross-field validation ngay (endDate >= startDate) va range kcal/protein (min>0, chan gia tri vo ly) chua thay o dietFields FE -> can verify BE va co the bo sung.",
   "Patient-safety: chua thay logic chu dong canh bao khi che do an / suat an XUNG DOT voi di ung thuc pham cua BN (vd dietType chua hai san ma BN di ung hai san) - hien chi hien thi di ung, khong block. Can kiem tra cross-check.",
   "TPN: chua kiem chung BE co rule an toan osmolarity cao -> duong truyen trung tam (Central) thay vi ngoai bien (Peripheral); glucose/lipid ratio canh bao.",
   "IDOR/scope: can verify controller /nutrition co thuc su gioi han pham vi theo khoa/BN cua user; neu khong -> lo ho IDOR.",
   "In: nut 'In thuc don' dung window.print() (in ca trang) thay vi template phieu suat an rieng -> UX gap; tuong tu printMealTicket/printTPNLabel/printDepartmentMealList co API nhung khong gan UI.",
   "Trang thai don: chi co Active/Inactive (Dang dung/Da ngung) o FE, trong khi DTO status la number co statusName - co the BE co them trang thai (Draft/Completed) khong duoc the hien -> can lam ro vong doi day du.",
   "Khong co kiem tra trung lap: 1 BN co the co nhieu don 'Dang dung' cung luc khong? (getActiveDietOrder gia dinh 1 don active/admission) - can test data-consistency don active duy nhat.",
   "Khong test offline/realtime: phan he khong co SignalR ro rang nhung suat an theo ngay co the can dong bo voi bep -> ngoai pham vi hien tai.",
   "Permission matrix #216 can xac dinh ro role nao duoc tao/sua/ngung don vs chi xem (BS vs dieu duong vs tiet che vs ke toan)."
  ]
 },
 {
  "id": "infection",
  "code": "INF",
  "layer": "clin",
  "ic": "🦠",
  "nm": "Kiểm soát nhiễm khuẩn",
  "gh": [
   "#239",
   "#243"
  ],
  "gap": false,
  "module_id": "infection",
  "summary": "Phân hệ Kiểm soát nhiễm khuẩn (INF, lớp lâm sàng) giám sát nhiễm khuẩn bệnh viện (NKBV) và an toàn dịch tễ nội viện. Sáu bảng cốt lõi: HAICases (ca NKBV), IsolationOrders (lệnh cách ly), HandHygieneObservations (giám sát vệ sinh tay), Outbreaks ⟶ OutbreakCases (ổ dịch và ca trong ổ dịch), AntibioticStewardships (quản lý sử dụng kháng sinh). Liên kết chéo với LIS (kết quả vi sinh/kháng sinh đồ làm bằng chứng chẩn đoán NKBV) và IPD (cách ly tại giường nội trú). Các màn chính gồm: dashboard giám sát NKBV, danh sách/chi tiết ca NKBV, lệnh cách ly, sổ giám sát vệ sinh tay, quản lý ổ dịch + ca trong ổ dịch, và bình duyệt kháng sinh.",
  "screens": [
   {
    "name": "Dashboard giám sát NKBV",
    "desc": "KPI tổng quan: số ca NKBV đang theo dõi, tỷ lệ tuân thủ vệ sinh tay, số ổ dịch đang mở, số bệnh nhân đang cách ly. StatusTabs theo trạng thái ca.",
    "route_guess": "/v2/infection",
    "elements": [
     "KpiStrip (4 thẻ)",
     "TopTabs (HAICases/Cách ly/Vệ sinh tay/Ổ dịch/Kháng sinh)",
     "biểu đồ xu hướng",
     "DataTable cảnh báo gần đây"
    ]
   },
   {
    "name": "Danh sách Ca NKBV (HAICases)",
    "desc": "Bảng danh sách ca nhiễm khuẩn bệnh viện, lọc theo khoa/loại nhiễm khuẩn/tác nhân/trạng thái.",
    "route_guess": "/v2/infection/hai-cases",
    "elements": [
     "KpiStrip",
     "StatusTabs (Nghi ngờ/Xác định/Đã đóng)",
     "filter khoa+ngày",
     "DataTable",
     "nút Thêm ca"
    ]
   },
   {
    "name": "Chi tiết / Form Ca NKBV",
    "desc": "Form khai báo/sửa ca NKBV: bệnh nhân, khoa, vị trí nhiễm khuẩn, tác nhân (liên kết KQ vi sinh LIS), ngày khởi phát, phân loại NKBV.",
    "route_guess": "/v2/infection/hai-cases/:id",
    "elements": [
     "DrawerShell/ModalShell form",
     "select bệnh nhân",
     "select tác nhân (vi sinh)",
     "date picker ngày khởi phát",
     "tab Kháng sinh đồ",
     "nút Lưu/Xác định/Đóng ca"
    ]
   },
   {
    "name": "Lệnh cách ly (IsolationOrders)",
    "desc": "Danh sách + form lệnh cách ly: loại cách ly (tiếp xúc/giọt bắn/không khí), buồng/giường, ngày bắt đầu-kết thúc, trạng thái.",
    "route_guess": "/v2/infection/isolation",
    "elements": [
     "StatusTabs (Đang cách ly/Đã gỡ/Hủy)",
     "DataTable",
     "ModalShell form",
     "select loại cách ly",
     "nút Gỡ cách ly"
    ]
   },
   {
    "name": "Sổ giám sát Vệ sinh tay (HandHygieneObservations)",
    "desc": "Ghi nhận quan sát tuân thủ vệ sinh tay theo 5 thời điểm WHO, theo khoa/nhân viên, tính tỷ lệ tuân thủ.",
    "route_guess": "/v2/infection/hand-hygiene",
    "elements": [
     "KpiStrip (tỷ lệ tuân thủ)",
     "filter khoa+thời điểm",
     "DataTable",
     "ModalShell form ghi quan sát",
     "biểu đồ tỷ lệ"
    ]
   },
   {
    "name": "Quản lý Ổ dịch (Outbreaks ⟶ OutbreakCases)",
    "desc": "Danh sách ổ dịch nội viện; chi tiết ổ dịch chứa danh sách ca trong ổ dịch (OutbreakCases), trạng thái mở/đóng.",
    "route_guess": "/v2/infection/outbreaks",
    "elements": [
     "StatusTabs (Đang mở/Đã kiểm soát/Đóng)",
     "DataTable ổ dịch",
     "DrawerShell chi tiết",
     "tab Ca trong ổ dịch",
     "nút Thêm ca vào ổ dịch",
     "nút Đóng ổ dịch"
    ]
   },
   {
    "name": "Quản lý kháng sinh (AntibioticStewardships)",
    "desc": "Bình duyệt/giám sát sử dụng kháng sinh: kháng sinh ưu tiên quản lý, chỉ định, phê duyệt/từ chối.",
    "route_guess": "/v2/infection/antibiotic-stewardship",
    "elements": [
     "StatusTabs (Chờ duyệt/Đã duyệt/Từ chối)",
     "DataTable",
     "ModalShell duyệt",
     "ô lý do từ chối",
     "nút Duyệt/Từ chối"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-INF-001",
    "title": "Khai báo ca NKBV mới thành công (luồng chính)",
    "category": "happy",
    "priority": "P0",
    "role": "Nhân viên KSNK",
    "preconditions": "Đăng nhập admin/Admin@123; tồn tại bệnh nhân nội trú và có KQ vi sinh trong LIS",
    "steps": [
     "Vào /v2/infection/hai-cases",
     "Bấm Thêm ca",
     "Chọn bệnh nhân nội trú",
     "Chọn khoa, vị trí nhiễm khuẩn, ngày khởi phát hợp lệ",
     "Chọn tác nhân từ KQ vi sinh",
     "Bấm Lưu"
    ],
    "expected": "Ca NKBV được tạo, hiện trong danh sách ở tab Nghi ngờ, toast thành công, audit log ghi tạo ca với CreatedBy là user thật",
    "evidence": [
     {
      "name": "TC-INF-001__s01__form",
      "caption": "Form khai báo ca NKBV đã điền",
      "uiState": "form"
     },
     {
      "name": "TC-INF-001__s02__success",
      "caption": "Toast tạo ca thành công",
      "uiState": "success"
     },
     {
      "name": "TC-INF-001__s03__list",
      "caption": "Ca mới hiện trong danh sách tab Nghi ngờ",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239",
     "#243"
    ],
    "notes": "Bảng HAICases"
   },
   {
    "id": "TC-INF-002",
    "title": "Tạo ca NKBV thiếu trường bắt buộc bị chặn",
    "category": "validation",
    "priority": "P0",
    "role": "Nhân viên KSNK",
    "preconditions": "Đang ở form thêm ca NKBV",
    "steps": [
     "Mở form thêm ca",
     "Bỏ trống bệnh nhân, vị trí nhiễm khuẩn, ngày khởi phát",
     "Bấm Lưu"
    ],
    "expected": "Mỗi trường bắt buộc hiển thị thông báo lỗi tiếng Việt rõ ràng dưới field; không gọi API tạo; form không đóng",
    "evidence": [
     {
      "name": "TC-INF-002__s01__validation",
      "caption": "Lỗi validation các field bắt buộc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Bảng HAICases"
   },
   {
    "id": "TC-INF-003",
    "title": "Ngày khởi phát NKBV ở tương lai và biên ngày bị từ chối",
    "category": "edge",
    "priority": "P1",
    "role": "Nhân viên KSNK",
    "preconditions": "Đang ở form thêm ca NKBV",
    "steps": [
     "Nhập ngày khởi phát ở tương lai (ngày mai)",
     "Bấm Lưu",
     "Sửa thành ngày trước ngày nhập viện của bệnh nhân",
     "Bấm Lưu"
    ],
    "expected": "Cả hai trường hợp bị chặn với thông báo lỗi: ngày khởi phát không được ở tương lai và không trước ngày nhập viện",
    "evidence": [
     {
      "name": "TC-INF-003__s01__validation",
      "caption": "Lỗi ngày khởi phát tương lai",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Boundary ngày"
   },
   {
    "id": "TC-INF-004",
    "title": "Hủy form khai báo ca NKBV giữa chừng không lưu dữ liệu",
    "category": "negative",
    "priority": "P2",
    "role": "Nhân viên KSNK",
    "preconditions": "Đang điền dở form thêm ca",
    "steps": [
     "Điền một phần form",
     "Bấm Hủy / đóng drawer",
     "Xác nhận thoát nếu có hỏi"
    ],
    "expected": "Form đóng, không tạo ca mới, danh sách không thay đổi",
    "evidence": [
     {
      "name": "TC-INF-004__s01__confirm",
      "caption": "Hộp xác nhận hủy form",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Bảng HAICases"
   },
   {
    "id": "TC-INF-005",
    "title": "Chuyển trạng thái ca NKBV Nghi ngờ → Xác định → Đóng hợp lệ",
    "category": "state",
    "priority": "P0",
    "role": "Nhân viên KSNK",
    "preconditions": "Tồn tại 1 ca ở trạng thái Nghi ngờ",
    "steps": [
     "Mở chi tiết ca Nghi ngờ",
     "Bấm Xác định ca",
     "Sau đó bấm Đóng ca"
    ],
    "expected": "Trạng thái chuyển đúng tuần tự, badge trạng thái cập nhật, audit log ghi mỗi lần chuyển",
    "evidence": [
     {
      "name": "TC-INF-005__s01__detail",
      "caption": "Chi tiết ca trạng thái Nghi ngờ",
      "uiState": "detail"
     },
     {
      "name": "TC-INF-005__s02__success",
      "caption": "Ca chuyển sang Xác định",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "State machine HAICases"
   },
   {
    "id": "TC-INF-006",
    "title": "Chặn chuyển trạng thái ca NKBV không hợp lệ (đã Đóng → sửa)",
    "category": "state",
    "priority": "P1",
    "role": "Nhân viên KSNK",
    "preconditions": "Tồn tại 1 ca đã Đóng",
    "steps": [
     "Mở chi tiết ca đã Đóng",
     "Thử bấm sửa/đổi trạng thái về Nghi ngờ"
    ],
    "expected": "Nút sửa/đổi trạng thái bị vô hiệu hoặc API trả lỗi; ca Đóng không sửa được; thông báo rõ ràng",
    "evidence": [
     {
      "name": "TC-INF-006__s01__detail",
      "caption": "Ca đã Đóng nút sửa bị khóa",
      "uiState": "detail"
     },
     {
      "name": "TC-INF-006__s02__error",
      "caption": "Thông báo chặn sửa ca đã đóng",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "State machine HAICases"
   },
   {
    "id": "TC-INF-007",
    "title": "Tạo lệnh cách ly và gắn vào ca NKBV thành công",
    "category": "happy",
    "priority": "P0",
    "role": "Điều dưỡng KSNK",
    "preconditions": "Tồn tại bệnh nhân nội trú có giường",
    "steps": [
     "Vào /v2/infection/isolation",
     "Bấm Thêm lệnh cách ly",
     "Chọn bệnh nhân, loại cách ly (tiếp xúc/giọt bắn/không khí)",
     "Chọn buồng/giường, ngày bắt đầu",
     "Bấm Lưu"
    ],
    "expected": "Lệnh cách ly tạo thành công, hiện ở tab Đang cách ly, KPI số bệnh nhân cách ly tăng 1",
    "evidence": [
     {
      "name": "TC-INF-007__s01__form",
      "caption": "Form lệnh cách ly đã điền",
      "uiState": "form"
     },
     {
      "name": "TC-INF-007__s02__success",
      "caption": "Toast tạo lệnh cách ly",
      "uiState": "success"
     },
     {
      "name": "TC-INF-007__s03__list",
      "caption": "Lệnh hiện ở tab Đang cách ly",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239",
     "#243"
    ],
    "notes": "Bảng IsolationOrders"
   },
   {
    "id": "TC-INF-008",
    "title": "Validation loại cách ly và ngày kết thúc trước ngày bắt đầu",
    "category": "validation",
    "priority": "P1",
    "role": "Điều dưỡng KSNK",
    "preconditions": "Đang ở form lệnh cách ly",
    "steps": [
     "Bỏ trống loại cách ly",
     "Nhập ngày kết thúc trước ngày bắt đầu",
     "Bấm Lưu"
    ],
    "expected": "Lỗi: loại cách ly bắt buộc; ngày kết thúc không được trước ngày bắt đầu; không lưu",
    "evidence": [
     {
      "name": "TC-INF-008__s01__validation",
      "caption": "Lỗi validation loại cách ly và ngày",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Bảng IsolationOrders"
   },
   {
    "id": "TC-INF-009",
    "title": "Gỡ cách ly chuyển trạng thái Đang cách ly → Đã gỡ",
    "category": "state",
    "priority": "P1",
    "role": "Điều dưỡng KSNK",
    "preconditions": "Tồn tại lệnh cách ly Đang cách ly",
    "steps": [
     "Mở lệnh ở tab Đang cách ly",
     "Bấm Gỡ cách ly",
     "Nhập ngày kết thúc",
     "Xác nhận"
    ],
    "expected": "Lệnh chuyển sang Đã gỡ, ngày kết thúc lưu lại, KPI số cách ly giảm 1, audit log ghi",
    "evidence": [
     {
      "name": "TC-INF-009__s01__confirm",
      "caption": "Xác nhận gỡ cách ly",
      "uiState": "confirm"
     },
     {
      "name": "TC-INF-009__s02__success",
      "caption": "Lệnh chuyển Đã gỡ",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Bảng IsolationOrders"
   },
   {
    "id": "TC-INF-010",
    "title": "Ghi quan sát vệ sinh tay theo 5 thời điểm WHO thành công",
    "category": "happy",
    "priority": "P1",
    "role": "Giám sát viên KSNK",
    "preconditions": "Đăng nhập; có khoa và nhân viên",
    "steps": [
     "Vào /v2/infection/hand-hygiene",
     "Bấm Thêm quan sát",
     "Chọn khoa, nhân viên, thời điểm WHO",
     "Đánh dấu Tuân thủ/Không tuân thủ",
     "Bấm Lưu"
    ],
    "expected": "Quan sát lưu, KPI tỷ lệ tuân thủ cập nhật đúng theo công thức tuân thủ/tổng quan sát",
    "evidence": [
     {
      "name": "TC-INF-010__s01__form",
      "caption": "Form ghi quan sát vệ sinh tay",
      "uiState": "form"
     },
     {
      "name": "TC-INF-010__s02__success",
      "caption": "Lưu quan sát thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239",
     "#243"
    ],
    "notes": "Bảng HandHygieneObservations"
   },
   {
    "id": "TC-INF-011",
    "title": "Tỷ lệ tuân thủ vệ sinh tay tính đúng (data-consistency)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Giám sát viên KSNK",
    "preconditions": "Chưa có quan sát hôm nay cho 1 khoa cụ thể",
    "steps": [
     "Ghi 4 quan sát Tuân thủ và 1 Không tuân thủ cho cùng khoa",
     "Mở KPI/biểu đồ tỷ lệ tuân thủ của khoa đó"
    ],
    "expected": "Tỷ lệ hiển thị 80% (4/5); biểu đồ và KPI khớp số liệu vừa nhập",
    "evidence": [
     {
      "name": "TC-INF-011__s01__detail",
      "caption": "KPI tỷ lệ tuân thủ 80%",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Tính toán dẫn xuất"
   },
   {
    "id": "TC-INF-012",
    "title": "Tạo ổ dịch và thêm nhiều ca vào ổ dịch",
    "category": "happy",
    "priority": "P0",
    "role": "Nhân viên KSNK",
    "preconditions": "Tồn tại các ca NKBV liên quan",
    "steps": [
     "Vào /v2/infection/outbreaks",
     "Bấm Thêm ổ dịch, nhập tên/tác nhân/khoa khởi phát",
     "Mở chi tiết ổ dịch",
     "Tab Ca trong ổ dịch, bấm Thêm ca, chọn nhiều ca",
     "Lưu"
    ],
    "expected": "Ổ dịch tạo ở trạng thái Đang mở; các ca gắn vào hiển thị ở tab Ca trong ổ dịch; số ca cập nhật đúng",
    "evidence": [
     {
      "name": "TC-INF-012__s01__form",
      "caption": "Form tạo ổ dịch",
      "uiState": "form"
     },
     {
      "name": "TC-INF-012__s02__drawer",
      "caption": "Chi tiết ổ dịch",
      "uiState": "drawer"
     },
     {
      "name": "TC-INF-012__s03__tab",
      "caption": "Tab ca trong ổ dịch",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#239",
     "#243"
    ],
    "notes": "Outbreaks ⟶ OutbreakCases"
   },
   {
    "id": "TC-INF-013",
    "title": "Đóng ổ dịch chỉ khi mọi ca đã xử lý (state + consistency)",
    "category": "state",
    "priority": "P1",
    "role": "Nhân viên KSNK",
    "preconditions": "Tồn tại ổ dịch Đang mở còn ca chưa đóng",
    "steps": [
     "Mở ổ dịch Đang mở",
     "Bấm Đóng ổ dịch khi còn ca đang theo dõi",
     "Quan sát phản hồi"
    ],
    "expected": "Hệ thống cảnh báo/chặn đóng khi còn ca chưa xử lý, hoặc yêu cầu xác nhận; sau khi đóng KPI số ổ dịch mở giảm",
    "evidence": [
     {
      "name": "TC-INF-013__s01__confirm",
      "caption": "Cảnh báo còn ca chưa xử lý",
      "uiState": "confirm"
     },
     {
      "name": "TC-INF-013__s02__error",
      "caption": "Chặn đóng ổ dịch",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Outbreaks state"
   },
   {
    "id": "TC-INF-014",
    "title": "Bình duyệt kháng sinh - duyệt và từ chối có lý do",
    "category": "happy",
    "priority": "P1",
    "role": "Dược lâm sàng / KSNK",
    "preconditions": "Tồn tại yêu cầu kháng sinh Chờ duyệt",
    "steps": [
     "Vào /v2/infection/antibiotic-stewardship",
     "Mở yêu cầu Chờ duyệt",
     "Bấm Duyệt một yêu cầu",
     "Với yêu cầu khác bấm Từ chối và nhập lý do"
    ],
    "expected": "Yêu cầu duyệt chuyển Đã duyệt; yêu cầu từ chối chuyển Từ chối kèm lý do hiển thị; audit log ghi người duyệt",
    "evidence": [
     {
      "name": "TC-INF-014__s01__modal",
      "caption": "Modal duyệt kháng sinh",
      "uiState": "modal"
     },
     {
      "name": "TC-INF-014__s02__success",
      "caption": "Yêu cầu chuyển Đã duyệt",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "AntibioticStewardships"
   },
   {
    "id": "TC-INF-015",
    "title": "Từ chối kháng sinh bắt buộc nhập lý do",
    "category": "validation",
    "priority": "P1",
    "role": "Dược lâm sàng / KSNK",
    "preconditions": "Đang mở modal duyệt 1 yêu cầu Chờ duyệt",
    "steps": [
     "Bấm Từ chối",
     "Để trống ô lý do",
     "Bấm Xác nhận"
    ],
    "expected": "Lỗi: lý do từ chối bắt buộc; không cho từ chối khi thiếu lý do",
    "evidence": [
     {
      "name": "TC-INF-015__s01__validation",
      "caption": "Lỗi thiếu lý do từ chối",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "AntibioticStewardships"
   },
   {
    "id": "TC-INF-016",
    "title": "Vai trò không đủ quyền bị chặn menu/nút/API KSNK",
    "category": "permission",
    "priority": "P0",
    "role": "Tài khoản role lễ tân/không thuộc KSNK",
    "preconditions": "Có tài khoản không có quyền KSNK",
    "steps": [
     "Đăng nhập bằng tài khoản không quyền KSNK",
     "Kiểm tra menu Kiểm soát nhiễm khuẩn",
     "Gọi trực tiếp API tạo ca NKBV bằng token tài khoản này"
    ],
    "expected": "Menu/nút bị ẩn hoặc vô hiệu; API trả 403 Forbidden; tham chiếu matrix #216",
    "evidence": [
     {
      "name": "TC-INF-016__s01__permission",
      "caption": "Menu KSNK bị ẩn với tài khoản không quyền",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#239"
    ],
    "notes": "Phân quyền T-216"
   },
   {
    "id": "TC-INF-017",
    "title": "IDOR - không xem được ca NKBV/lệnh cách ly của bệnh nhân không thuộc phạm vi",
    "category": "security",
    "priority": "P0",
    "role": "Nhân viên KSNK khoa A",
    "preconditions": "Tồn tại ca NKBV thuộc khoa khác/bệnh nhân khác; biết được id ca",
    "steps": [
     "Đăng nhập tài khoản khoa A",
     "Gọi API GET chi tiết ca NKBV bằng id thuộc khoa khác/ngoài phạm vi",
     "Thử mở URL chi tiết trực tiếp"
    ],
    "expected": "API trả 403/404, không lộ thông tin bệnh nhân khác; UI không render dữ liệu trái phép",
    "evidence": [
     {
      "name": "TC-INF-017__s01__error",
      "caption": "Chặn truy cập ca NKBV ngoài phạm vi",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216",
     "#239"
    ],
    "notes": "Bảo mật IDOR"
   },
   {
    "id": "TC-INF-018",
    "title": "XSS ở field ghi chú/mô tả ca NKBV và lý do từ chối",
    "category": "security",
    "priority": "P1",
    "role": "Nhân viên KSNK",
    "preconditions": "Đang ở form ca NKBV hoặc modal từ chối kháng sinh",
    "steps": [
     "Nhập payload <script>alert(1)</script> và <img src=x onerror=alert(1)> vào ô ghi chú/mô tả",
     "Lưu",
     "Mở lại chi tiết để xem hiển thị"
    ],
    "expected": "Nội dung được escape/hiển thị dạng văn bản, không thực thi script; không có alert bật ra",
    "evidence": [
     {
      "name": "TC-INF-018__s01__detail",
      "caption": "Payload XSS hiển thị dạng text đã escape",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Bảo mật XSS"
   },
   {
    "id": "TC-INF-019",
    "title": "Biên dữ liệu - chuỗi rất dài, ký tự đặc biệt, dấu tiếng Việt ở tên ổ dịch/ghi chú",
    "category": "edge",
    "priority": "P2",
    "role": "Nhân viên KSNK",
    "preconditions": "Đang ở form tạo ổ dịch hoặc ca NKBV",
    "steps": [
     "Nhập tên ổ dịch dài >255 ký tự",
     "Nhập ký tự đặc biệt và dấu tiếng Việt có dấu (ví dụ: Ổ dịch Klebsiella đa kháng - khoa Hồi sức tích cực)",
     "Lưu và xem hiển thị"
    ],
    "expected": "Tên dài bị giới hạn theo độ dài tối đa với thông báo rõ; ký tự đặc biệt và dấu tiếng Việt lưu/hiển thị đúng không lỗi font/cắt chữ",
    "evidence": [
     {
      "name": "TC-INF-019__s01__validation",
      "caption": "Giới hạn độ dài tên ổ dịch",
      "uiState": "validation"
     },
     {
      "name": "TC-INF-019__s02__detail",
      "caption": "Tiếng Việt có dấu hiển thị đúng",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Boundary chuỗi"
   },
   {
    "id": "TC-INF-020",
    "title": "Trạng thái UI empty/loading/error của danh sách ca NKBV",
    "category": "ui",
    "priority": "P1",
    "role": "Nhân viên KSNK",
    "preconditions": "Có thể giả lập danh sách rỗng và lỗi mạng",
    "steps": [
     "Mở danh sách khi chưa có ca nào (empty)",
     "Reload và quan sát skeleton/spinner (loading)",
     "Ngắt mạng/giả lập API lỗi và mở lại (error)"
    ],
    "expected": "Empty state có minh hoạ + nút Thêm ca; loading có skeleton; error có thông báo + nút Thử lại; không màn trắng",
    "evidence": [
     {
      "name": "TC-INF-020__s01__empty",
      "caption": "Empty state danh sách ca NKBV",
      "uiState": "empty"
     },
     {
      "name": "TC-INF-020__s02__loading",
      "caption": "Loading skeleton danh sách",
      "uiState": "loading"
     },
     {
      "name": "TC-INF-020__s03__error",
      "caption": "Error state có nút thử lại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Core error/loading state"
   },
   {
    "id": "TC-INF-021",
    "title": "Đồng bộ dark/light mode toàn màn KSNK",
    "category": "ui",
    "priority": "P2",
    "role": "Nhân viên KSNK",
    "preconditions": "Đăng nhập, ở dashboard KSNK",
    "steps": [
     "Bật dark mode qua toggle topbar v2",
     "Duyệt qua dashboard, danh sách ca, drawer chi tiết, modal duyệt",
     "Đổi lại light mode và kiểm tra lại"
    ],
    "expected": "Mọi thành phần (KPI, bảng, tab, drawer, modal, badge trạng thái, biểu đồ) có contrast đủ ở cả 2 chế độ, không chữ trắng nền trắng, parity giữa 2 theme",
    "evidence": [
     {
      "name": "TC-INF-021__s01__detail",
      "caption": "Dashboard KSNK ở dark mode",
      "uiState": "detail"
     },
     {
      "name": "TC-INF-021__s02__detail",
      "caption": "Dashboard KSNK ở light mode",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Dark/light parity"
   },
   {
    "id": "TC-INF-022",
    "title": "Liên kết tác nhân từ KQ vi sinh LIS vào ca NKBV (integration)",
    "category": "integration",
    "priority": "P1",
    "role": "Nhân viên KSNK",
    "preconditions": "Bệnh nhân có KQ nuôi cấy/định danh + kháng sinh đồ trong LIS",
    "steps": [
     "Mở form ca NKBV cho bệnh nhân đó",
     "Chọn tác nhân từ danh sách KQ vi sinh của bệnh nhân",
     "Mở tab Kháng sinh đồ trong chi tiết ca"
    ],
    "expected": "Danh sách tác nhân lấy đúng từ KQ vi sinh LIS; kháng sinh đồ (AntibioticSensitivityResult) hiển thị khớp KQ LIS",
    "evidence": [
     {
      "name": "TC-INF-022__s01__dropdown",
      "caption": "Dropdown tác nhân lấy từ KQ vi sinh LIS",
      "uiState": "dropdown"
     },
     {
      "name": "TC-INF-022__s02__tab",
      "caption": "Tab kháng sinh đồ khớp LIS",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#239",
     "#243"
    ],
    "notes": "RELATED_X lis"
   },
   {
    "id": "TC-INF-023",
    "title": "Lọc/tìm kiếm danh sách ca NKBV theo khoa, tác nhân, khoảng ngày",
    "category": "happy",
    "priority": "P2",
    "role": "Nhân viên KSNK",
    "preconditions": "Có nhiều ca NKBV nhiều khoa/tác nhân/ngày khác nhau",
    "steps": [
     "Vào danh sách ca NKBV",
     "Chọn lọc theo 1 khoa",
     "Thêm lọc theo tác nhân",
     "Chọn khoảng ngày khởi phát"
    ],
    "expected": "Bảng chỉ hiển thị ca khớp đủ bộ lọc; xóa lọc trả lại đầy đủ; số đếm cập nhật",
    "evidence": [
     {
      "name": "TC-INF-023__s01__filter",
      "caption": "Bộ lọc khoa+tác nhân+ngày áp dụng",
      "uiState": "filter"
     },
     {
      "name": "TC-INF-023__s02__list",
      "caption": "Danh sách sau lọc",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Bảng HAICases"
   },
   {
    "id": "TC-INF-024",
    "title": "Audit log ghi đúng mọi mutation của phân hệ KSNK",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Admin/Kiểm toán",
    "preconditions": "Đã thực hiện tạo ca, đổi trạng thái, tạo cách ly, duyệt kháng sinh",
    "steps": [
     "Thực hiện 1 chuỗi: tạo ca NKBV → xác định → tạo lệnh cách ly → duyệt kháng sinh",
     "Mở màn AuditLog lọc theo phân hệ/đối tượng KSNK"
    ],
    "expected": "Mỗi thao tác có bản ghi audit với user thật (≠ Guid.Empty), thời gian, đối tượng, hành động đúng",
    "evidence": [
     {
      "name": "TC-INF-024__s01__list",
      "caption": "Audit log các mutation KSNK",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "AuditLog"
   }
  ],
  "ui_state_checklist": [
   "list (danh sách ca NKBV / cách ly / vệ sinh tay / ổ dịch / kháng sinh)",
   "detail (chi tiết ca, KPI tỷ lệ, dark/light)",
   "form (khai báo ca, lệnh cách ly, quan sát vệ sinh tay, tạo ổ dịch)",
   "modal (duyệt/từ chối kháng sinh)",
   "drawer (chi tiết ổ dịch)",
   "tab (ca trong ổ dịch, kháng sinh đồ)",
   "filter (lọc khoa/tác nhân/ngày)",
   "dropdown (chọn tác nhân từ LIS)",
   "validation (field bắt buộc, ngày biên, lý do từ chối, độ dài)",
   "empty (danh sách rỗng)",
   "loading (skeleton)",
   "error (lỗi tải, chặn IDOR, chặn state)",
   "confirm (hủy form, gỡ cách ly, đóng ổ dịch)",
   "success/toast (tạo/đổi trạng thái thành công)",
   "permission (ẩn menu/nút, 403)"
  ],
  "gaps": [
   "data.js không có NOTES riêng cho infection → một số quy tắc nghiệp vụ (định nghĩa NKBV theo CDC/BYT, tiêu chí xác định ca) là suy luận; cần xác nhận tiêu chí phân loại NKBV thực tế trong code BE",
   "Chưa rõ phân hệ có tích hợp báo cáo NKBV lên cổng quốc gia / Sở Y tế (XML/báo cáo dịch) hay không → cần kiểm tra để bổ sung test integration",
   "Chưa rõ cơ chế phân quyền theo khoa (scope) cho ca NKBV → test IDOR TC-INF-017 giả định có scope khoa, cần verify trong matrix #216",
   "Thiếu test cho cảnh báo tự động khi có cụm ca cùng tác nhân/khoa (phát hiện ổ dịch sớm) — cần xác nhận có rule cảnh báo không",
   "Thiếu test export/in báo cáo giám sát NKBV (tỷ lệ tuân thủ, danh sách ca) nếu có chức năng xuất Excel/PDF",
   "Chưa kiểm thử đồng bộ realtime (SignalR) cho cảnh báo NKBV/ổ dịch nếu phân hệ dùng push",
   "Thiếu test concurrency: 2 người cùng đóng 1 ổ dịch / cùng gỡ 1 lệnh cách ly",
   "Cần test liên kết ca NKBV ↔ IPD (bệnh nhân nội trú đang điều trị) khi bệnh nhân xuất viện/chuyển khoa giữa lúc còn cách ly"
  ]
 }
]);
