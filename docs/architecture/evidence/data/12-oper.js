window.TP.modules.push(...[
 {
  "id": "pharmwh",
  "code": "PHW",
  "layer": "oper",
  "ic": "📦",
  "nm": "Dược & Kho",
  "gh": [
   "#251",
   "#254",
   "#255"
  ],
  "gap": false,
  "module_id": "pharmwh",
  "summary": "Phân hệ \"Dược & Kho\" (PHW, lớp B-vận hành) quản lý vòng đời thuốc/vật tư trong kho bệnh viện: nhập kho (ImportReceipts/Details) ⟶ tồn kho theo lô-hạn dùng (InventoryItems) ⟶ xuất/phát thuốc (ExportReceipts/Details, DispenseRequests/Items) theo toa đã duyệt dược (PharmacyApprovals/Items/Logs), kèm điều chuyển kho (WarehouseTransfers/Items), kiểm kê (StockTakes/Items), điều chỉnh tồn (StockAdjustments/Items), giữ hàng (StockReservations) và ngưỡng tồn (StockThresholds). Mọi biến động ghi StockMovements để truy vết; hệ thống cảnh báo ExpiryAlerts (hạn dùng) và LowStockAlerts (tồn thấp), xuất theo FEFO. Các bảng/màn chính: danh sách kho (Warehouses), tồn kho, phiếu nhập/xuất, kiểm kê, điều chuyển, duyệt dược, yêu cầu phát thuốc, cấu hình tách gói/lợi nhuận và yêu cầu mua sắm (ProcurementRequests).",
  "screens": [
   {
    "name": "Dược & Kho (Pharmacy v2 - tổng quan)",
    "desc": "Màn chính phân hệ: KPI tồn kho/cảnh báo, tab trạng thái phiếu, bảng dữ liệu thuốc-vật tư, lọc theo kho/nhóm thuốc.",
    "route_guess": "/v2/pharmacy",
    "elements": [
     "KpiStrip (tổng SKU, tồn thấp, sắp hết hạn, giá trị tồn)",
     "TopTabs (Tồn kho / Nhập / Xuất / Duyệt)",
     "DataTable danh mục thuốc-lô-hạn",
     "Filter kho + nhóm thuốc + ô tìm kiếm",
     "DrawerShell chi tiết thuốc"
    ]
   },
   {
    "name": "Nhập kho - Phiếu nhập (ImportReceipts)",
    "desc": "Tạo/sửa phiếu nhập từ nhà cung cấp: chọn NCC, thêm dòng thuốc theo lô-hạn dùng-đơn giá, lưu nháp/duyệt nhập làm tăng tồn (StockMovements).",
    "route_guess": "/v2/pharmacy-stock-in",
    "elements": [
     "Form chọn nhà cung cấp + kho nhận",
     "Bảng chi tiết nhập (thuốc, lô, hạn dùng, SL, đơn giá, VAT)",
     "Nút Thêm dòng / Xóa dòng",
     "Nút Lưu nháp / Duyệt nhập",
     "StatusTabs (Nháp/Đã nhập/Hủy)"
    ]
   },
   {
    "name": "Xuất kho / Phát thuốc (ExportReceipts, DispenseRequests)",
    "desc": "Tạo phiếu xuất/yêu cầu phát thuốc theo toa đã duyệt; chọn lô theo FEFO; xác nhận phát làm giảm tồn.",
    "route_guess": "/v2/pharmacy-stock-issue",
    "elements": [
     "Form chọn kho xuất + đối tượng nhận (khoa/toa BN)",
     "Bảng dòng xuất + gợi ý lô FEFO",
     "Nút Xác nhận phát / Hủy",
     "StatusTabs (Chờ phát/Đã phát/Hủy)",
     "Cảnh báo tồn không đủ"
    ]
   },
   {
    "name": "Kiểm kê kho (StockTakes)",
    "desc": "Tạo phiếu kiểm kê, nhập SL thực đếm theo lô, hệ thống tính chênh lệch so tồn sổ sách, chốt kiểm kê sinh điều chỉnh tồn.",
    "route_guess": "/v2/pharmacy-stock-take",
    "elements": [
     "Form chọn kho kiểm kê + ngày",
     "Bảng item: tồn sổ sách vs thực đếm vs chênh lệch",
     "Nút Chốt kiểm kê",
     "StatusTabs (Đang kiểm/Đã chốt)"
    ]
   },
   {
    "name": "Duyệt dược (PharmacyApprovals)",
    "desc": "Dược sĩ duyệt toa/yêu cầu thuốc: kiểm dị ứng/tương tác/chống chỉ định, duyệt hoặc từ chối kèm lý do; ghi PharmacyApprovalLogs.",
    "route_guess": "/v2/pharmacy-approval",
    "elements": [
     "DataTable toa chờ duyệt",
     "DrawerShell chi tiết toa + cảnh báo an toàn thuốc",
     "Nút Duyệt / Từ chối + ô lý do",
     "StatusTabs (Chờ/Đã duyệt/Từ chối)"
    ]
   },
   {
    "name": "Kiểm tra dược lâm sàng (ClinicalPharmacyCheck)",
    "desc": "Rà soát tương tác thuốc-thuốc, dị ứng, liều theo cân nặng/chức năng thận; hiển thị cảnh báo patient-safety.",
    "route_guess": "/v2/clinical-pharmacy-check",
    "elements": [
     "Danh sách toa cần rà",
     "Bảng cảnh báo tương tác/dị ứng (mức độ)",
     "Nút Xác nhận đã xem cảnh báo"
    ]
   },
   {
    "name": "Báo cáo tồn kho (StockReport / StockMovements)",
    "desc": "Báo cáo tồn theo kho/thời điểm, biến động nhập-xuất-tồn, giá trị tồn, hàng sắp hết hạn/tồn thấp.",
    "route_guess": "/v2/stock-report",
    "elements": [
     "Filter kho + khoảng thời gian",
     "Bảng nhập/xuất/tồn đầu-cuối",
     "KPI giá trị tồn",
     "Nút Xuất Excel"
    ]
   },
   {
    "name": "Dược bệnh viện (HospitalPharmacy)",
    "desc": "Màn nghiệp vụ dược nội bộ bệnh viện: cấp phát theo khoa, quản lý điều chuyển và tồn liên kho.",
    "route_guess": "/v2/hospital-pharmacy",
    "elements": [
     "TopTabs theo nghiệp vụ",
     "DataTable cấp phát/điều chuyển",
     "DrawerShell chi tiết"
    ]
   },
   {
    "name": "Danh mục dược (PharmacyCatalogs)",
    "desc": "Danh mục thuốc/vật tư, cấu hình tách gói (SplitablePackageConfigs), cấu hình lợi nhuận (ProfitMarginConfigs), ngưỡng tồn (StockThresholds).",
    "route_guess": "/v2/pharmacy-catalogs",
    "elements": [
     "DataTable danh mục",
     "ModalShell thêm/sửa thuốc",
     "Tab cấu hình tách gói / lợi nhuận / ngưỡng tồn"
    ]
   }
  ],
  "ui_state_checklist": [
   "list - bảng tồn kho/phiếu có dữ liệu",
   "empty - kho/danh mục chưa có dữ liệu",
   "loading - skeleton khi tải bảng/KPI",
   "error - lỗi tải API hiển thị banner",
   "detail/drawer - chi tiết thuốc/toa/phiếu",
   "form - form nhập/xuất/kiểm kê",
   "modal - thêm/sửa danh mục thuốc",
   "validation - lỗi field bắt buộc/định dạng/range",
   "confirm - hộp xác nhận chốt kiểm kê/duyệt/hủy",
   "success/toast - thông báo nhập/xuất/duyệt thành công",
   "filter - lọc theo kho/nhóm/thời gian",
   "dropdown - chọn kho/NCC/lô FEFO",
   "permission - chặn nút/menu khi thiếu quyền",
   "tab - StatusTabs chuyển trạng thái phiếu",
   "dark/light - parity màu KPI/bảng/cảnh báo"
  ],
  "tasks": [
   {
    "id": "TC-PHW-001",
    "title": "Tạo phiếu nhập kho từ nhà cung cấp thành công (happy path)",
    "category": "happy",
    "priority": "P0",
    "role": "Dược sĩ/Thủ kho",
    "preconditions": "Đã đăng nhập admin/Admin@123; có ít nhất 1 nhà cung cấp và 1 thuốc trong danh mục; đang ở /v2/pharmacy-stock-in.",
    "steps": [
     "Mở /v2/pharmacy-stock-in",
     "Nhấn Tạo phiếu nhập",
     "Chọn nhà cung cấp và kho nhận",
     "Thêm 1 dòng thuốc: chọn thuốc, nhập số lô, hạn dùng (tương lai), số lượng=100, đơn giá hợp lệ",
     "Nhấn Lưu nháp rồi Duyệt nhập"
    ],
    "expected": "Phiếu nhập tạo thành công, trạng thái chuyển Nháp→Đã nhập; tồn kho InventoryItems của lô tăng đúng 100; sinh bản ghi StockMovements loại Nhập; toast thành công hiển thị.",
    "evidence": [
     {
      "name": "TC-PHW-001__s01__form",
      "caption": "Form tạo phiếu nhập với NCC và kho nhận",
      "uiState": "form"
     },
     {
      "name": "TC-PHW-001__s02__dropdown",
      "caption": "Dropdown chọn thuốc khi thêm dòng",
      "uiState": "dropdown"
     },
     {
      "name": "TC-PHW-001__s03__success",
      "caption": "Toast nhập kho thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#251",
     "#254"
    ]
   },
   {
    "id": "TC-PHW-002",
    "title": "Nhập kho - chặn lưu khi thiếu field bắt buộc (NCC/kho/dòng thuốc)",
    "category": "validation",
    "priority": "P0",
    "role": "Thủ kho",
    "preconditions": "Đang mở form tạo phiếu nhập trống.",
    "steps": [
     "Mở form tạo phiếu nhập",
     "Để trống nhà cung cấp, kho nhận và không thêm dòng nào",
     "Nhấn Duyệt nhập"
    ],
    "expected": "Hệ thống chặn lưu; hiển thị lỗi inline tại từng field bắt buộc (Nhà cung cấp, Kho nhận) và thông báo phải có ít nhất 1 dòng thuốc; không gọi API tạo phiếu.",
    "evidence": [
     {
      "name": "TC-PHW-002__s01__validation",
      "caption": "Lỗi field bắt buộc trên form nhập",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-003",
    "title": "Nhập kho - validation giá trị biên số lượng/đơn giá (0, âm, rất lớn, thập phân)",
    "category": "edge",
    "priority": "P1",
    "role": "Thủ kho",
    "preconditions": "Form nhập kho đã chọn NCC, kho, 1 dòng thuốc.",
    "steps": [
     "Nhập số lượng = 0 → quan sát",
     "Nhập số lượng = -5 → quan sát",
     "Nhập số lượng = 999999999 và đơn giá = -1 → quan sát",
     "Nhập số lượng dạng thập phân 1.5 (nếu đơn vị nguyên) → quan sát"
    ],
    "expected": "SL=0 và SL âm bị từ chối với thông báo phải > 0; đơn giá âm bị chặn; số rất lớn không tràn/không gây NaN ở thành tiền; thập phân theo đúng quy tắc đơn vị (chặn nếu đơn vị nguyên). Thành tiền tính đúng = SL × đơn giá.",
    "evidence": [
     {
      "name": "TC-PHW-003__s01__validation",
      "caption": "Chặn số lượng âm/0",
      "uiState": "validation"
     },
     {
      "name": "TC-PHW-003__s02__form",
      "caption": "Thành tiền dòng tính đúng với số lớn",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-004",
    "title": "Nhập kho - hạn dùng quá khứ phải bị cảnh báo/chặn",
    "category": "validation",
    "priority": "P0",
    "role": "Thủ kho",
    "preconditions": "Form nhập kho đang thêm dòng thuốc.",
    "steps": [
     "Chọn thuốc",
     "Nhập hạn dùng là ngày trong quá khứ (vd hôm qua)",
     "Cố lưu phiếu"
    ],
    "expected": "Hệ thống cảnh báo/chặn nhập lô đã hết hạn hoặc yêu cầu xác nhận có chủ đích; không cho lô hết hạn vào tồn dùng được mà không cảnh báo (an toàn người bệnh).",
    "evidence": [
     {
      "name": "TC-PHW-004__s01__validation",
      "caption": "Cảnh báo hạn dùng quá khứ",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#251",
     "#254"
    ]
   },
   {
    "id": "TC-PHW-005",
    "title": "Hủy giữa chừng khi tạo phiếu nhập không mất tồn/không tạo phiếu rác",
    "category": "negative",
    "priority": "P1",
    "role": "Thủ kho",
    "preconditions": "Đang điền dở form nhập (đã thêm 2 dòng).",
    "steps": [
     "Điền dở form nhập với 2 dòng thuốc",
     "Nhấn Hủy / đóng drawer",
     "Xác nhận hủy trên hộp confirm"
    ],
    "expected": "Form đóng, không tạo phiếu, không thay đổi tồn kho; quay lại danh sách không thấy phiếu nháp rác (hoặc nếu lưu nháp thì rõ ràng là nháp).",
    "evidence": [
     {
      "name": "TC-PHW-005__s01__confirm",
      "caption": "Hộp xác nhận hủy phiếu nhập",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-006",
    "title": "Xuất/phát thuốc theo toa đã duyệt - làm giảm tồn đúng (happy path)",
    "category": "happy",
    "priority": "P0",
    "role": "Dược sĩ phát thuốc",
    "preconditions": "Có toa đã duyệt dược; tồn lô đủ; đang ở /v2/pharmacy-stock-issue.",
    "steps": [
     "Mở /v2/pharmacy-stock-issue",
     "Chọn toa/yêu cầu phát đang Chờ phát",
     "Kiểm tra lô gợi ý theo FEFO",
     "Nhấn Xác nhận phát"
    ],
    "expected": "Phiếu xuất tạo, trạng thái Chờ phát→Đã phát; tồn lô được trừ đúng số lượng; sinh StockMovements loại Xuất; toast thành công.",
    "evidence": [
     {
      "name": "TC-PHW-006__s01__list",
      "caption": "Danh sách toa chờ phát",
      "uiState": "list"
     },
     {
      "name": "TC-PHW-006__s02__drawer",
      "caption": "Chi tiết phát + lô FEFO gợi ý",
      "uiState": "drawer"
     },
     {
      "name": "TC-PHW-006__s03__success",
      "caption": "Phát thuốc thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#251",
     "#255"
    ]
   },
   {
    "id": "TC-PHW-007",
    "title": "Xuất kho - xuất theo FEFO (lô hạn dùng gần nhất trước)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Dược sĩ",
    "preconditions": "Một thuốc có ≥2 lô khác hạn dùng còn tồn.",
    "steps": [
     "Tạo phiếu xuất cho thuốc có nhiều lô",
     "Quan sát lô được hệ thống tự gợi ý/chọn",
     "Xác nhận phát số lượng nhỏ hơn tồn lô gần hết hạn"
    ],
    "expected": "Hệ thống ưu tiên trừ lô có hạn dùng gần nhất (FEFO); tồn các lô cập nhật đúng; không trừ nhầm lô hạn xa.",
    "evidence": [
     {
      "name": "TC-PHW-007__s01__dropdown",
      "caption": "Lô gợi ý theo FEFO",
      "uiState": "dropdown"
     },
     {
      "name": "TC-PHW-007__s02__detail",
      "caption": "Tồn từng lô sau khi xuất",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#251",
     "#255"
    ]
   },
   {
    "id": "TC-PHW-008",
    "title": "Xuất kho - chặn khi số lượng phát vượt tồn khả dụng",
    "category": "negative",
    "priority": "P0",
    "role": "Dược sĩ",
    "preconditions": "Một thuốc có tồn khả dụng nhỏ hơn số cần phát.",
    "steps": [
     "Tạo phiếu xuất",
     "Nhập số lượng phát lớn hơn tồn khả dụng (vd tồn 10, phát 50)",
     "Nhấn Xác nhận phát"
    ],
    "expected": "Hệ thống chặn với thông báo tồn không đủ; không cho tồn âm; không sinh StockMovements.",
    "evidence": [
     {
      "name": "TC-PHW-008__s01__error",
      "caption": "Cảnh báo tồn không đủ khi xuất",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#251",
     "#255"
    ]
   },
   {
    "id": "TC-PHW-009",
    "title": "Xuất kho - không cho xuất lô đã hết hạn",
    "category": "validation",
    "priority": "P0",
    "role": "Dược sĩ",
    "preconditions": "Thuốc có 1 lô đã hết hạn còn tồn.",
    "steps": [
     "Tạo phiếu xuất thuốc đó",
     "Cố chọn lô đã hết hạn để phát",
     "Xác nhận phát"
    ],
    "expected": "Lô hết hạn bị loại khỏi danh sách chọn hoặc bị chặn phát kèm cảnh báo; không phát thuốc hết hạn cho bệnh nhân (an toàn người bệnh).",
    "evidence": [
     {
      "name": "TC-PHW-009__s01__validation",
      "caption": "Chặn chọn lô hết hạn khi xuất",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#251",
     "#255"
    ]
   },
   {
    "id": "TC-PHW-010",
    "title": "Duyệt dược - duyệt toa hợp lệ thành công và ghi log",
    "category": "happy",
    "priority": "P0",
    "role": "Dược sĩ duyệt",
    "preconditions": "Có toa Chờ duyệt không có cảnh báo an toàn; ở /v2/pharmacy-approval.",
    "steps": [
     "Mở /v2/pharmacy-approval",
     "Chọn toa Chờ duyệt",
     "Xem chi tiết trong drawer",
     "Nhấn Duyệt"
    ],
    "expected": "Toa chuyển Chờ→Đã duyệt; PharmacyApprovalLogs ghi người duyệt + thời gian; toa sẵn sàng để phát; toast thành công.",
    "evidence": [
     {
      "name": "TC-PHW-010__s01__list",
      "caption": "Danh sách toa chờ duyệt",
      "uiState": "list"
     },
     {
      "name": "TC-PHW-010__s02__drawer",
      "caption": "Chi tiết toa trước khi duyệt",
      "uiState": "drawer"
     },
     {
      "name": "TC-PHW-010__s03__success",
      "caption": "Duyệt toa thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#251",
     "#254"
    ]
   },
   {
    "id": "TC-PHW-011",
    "title": "Duyệt dược - từ chối toa bắt buộc nhập lý do",
    "category": "validation",
    "priority": "P1",
    "role": "Dược sĩ duyệt",
    "preconditions": "Có toa Chờ duyệt.",
    "steps": [
     "Mở chi tiết toa Chờ duyệt",
     "Nhấn Từ chối",
     "Để trống ô lý do và xác nhận",
     "Sau đó nhập lý do hợp lệ và xác nhận"
    ],
    "expected": "Lần đầu chặn vì thiếu lý do; sau khi nhập lý do, toa chuyển Chờ→Từ chối; log ghi lý do; toa không chuyển sang phát được.",
    "evidence": [
     {
      "name": "TC-PHW-011__s01__validation",
      "caption": "Bắt buộc nhập lý do từ chối",
      "uiState": "validation"
     },
     {
      "name": "TC-PHW-011__s02__success",
      "caption": "Từ chối toa thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-012",
    "title": "Duyệt dược - cảnh báo dị ứng/tương tác/chống chỉ định phải hiển thị (an toàn người bệnh)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Dược sĩ duyệt",
    "preconditions": "Toa có thuốc trùng nhóm dị ứng đã ghi của BN hoặc cặp thuốc tương tác đã biết.",
    "steps": [
     "Mở toa có nguy cơ dị ứng/tương tác",
     "Quan sát vùng cảnh báo trong drawer chi tiết",
     "Thử duyệt khi có cảnh báo mức cao"
    ],
    "expected": "Cảnh báo dị ứng/tương tác/chống chỉ định hiển thị rõ với mức độ; với cảnh báo mức cao yêu cầu xác nhận có chủ đích trước khi duyệt; nội dung cảnh báo khớp dữ liệu DrugInteraction/dị ứng BN.",
    "evidence": [
     {
      "name": "TC-PHW-012__s01__drawer",
      "caption": "Cảnh báo dị ứng/tương tác trong chi tiết toa",
      "uiState": "drawer"
     },
     {
      "name": "TC-PHW-012__s02__confirm",
      "caption": "Xác nhận có chủ đích khi duyệt dù có cảnh báo",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#251",
     "#254"
    ]
   },
   {
    "id": "TC-PHW-013",
    "title": "Chặn chuyển trạng thái không hợp lệ của phiếu (đã phát không được phát lại / đã hủy không sửa)",
    "category": "state",
    "priority": "P0",
    "role": "Dược sĩ",
    "preconditions": "Có 1 phiếu xuất Đã phát và 1 phiếu Hủy.",
    "steps": [
     "Mở phiếu xuất Đã phát",
     "Thử thao tác Phát lại / Sửa dòng",
     "Mở phiếu đã Hủy và thử Duyệt/Phát"
    ],
    "expected": "Hệ thống chặn các chuyển trạng thái không hợp lệ (Đã phát→Phát, Hủy→Phát); nút bị ẩn/disable; nếu gọi API trực tiếp trả lỗi nghiệp vụ; tồn không bị trừ hai lần.",
    "evidence": [
     {
      "name": "TC-PHW-013__s01__detail",
      "caption": "Phiếu đã phát không cho phát lại",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#251",
     "#255"
    ]
   },
   {
    "id": "TC-PHW-014",
    "title": "Kiểm kê kho - chốt kiểm kê sinh điều chỉnh tồn đúng chênh lệch",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Thủ kho",
    "preconditions": "Kho có tồn sổ sách; ở /v2/pharmacy-stock-take.",
    "steps": [
     "Tạo phiếu kiểm kê cho 1 kho",
     "Nhập SL thực đếm khác tồn sổ sách (vd sổ 100, thực 95)",
     "Quan sát cột chênh lệch",
     "Nhấn Chốt kiểm kê và xác nhận"
    ],
    "expected": "Chênh lệch tính đúng (-5); chốt sinh StockAdjustments/StockMovements điều chỉnh tồn về số thực; tồn InventoryItems cập nhật đúng; log lưu người chốt.",
    "evidence": [
     {
      "name": "TC-PHW-014__s01__form",
      "caption": "Bảng kiểm kê tồn sổ sách vs thực đếm",
      "uiState": "form"
     },
     {
      "name": "TC-PHW-014__s02__confirm",
      "caption": "Xác nhận chốt kiểm kê",
      "uiState": "confirm"
     },
     {
      "name": "TC-PHW-014__s03__success",
      "caption": "Chốt kiểm kê và điều chỉnh tồn thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-015",
    "title": "Kiểm kê - không cho sửa sau khi đã chốt",
    "category": "state",
    "priority": "P1",
    "role": "Thủ kho",
    "preconditions": "Có phiếu kiểm kê đã chốt.",
    "steps": [
     "Mở phiếu kiểm kê Đã chốt",
     "Thử sửa SL thực đếm hoặc chốt lại"
    ],
    "expected": "Phiếu đã chốt ở chế độ chỉ đọc; nút sửa/chốt disable; không tạo điều chỉnh trùng.",
    "evidence": [
     {
      "name": "TC-PHW-015__s01__detail",
      "caption": "Phiếu kiểm kê đã chốt chỉ đọc",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-016",
    "title": "Điều chuyển kho - chuyển hàng giữa 2 kho cân tồn đúng",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Thủ kho",
    "preconditions": "Có ≥2 kho; kho nguồn có tồn lô.",
    "steps": [
     "Tạo phiếu điều chuyển từ kho A sang kho B",
     "Thêm dòng thuốc-lô, số lượng nhỏ hơn tồn A",
     "Xác nhận điều chuyển/nhận tại kho B"
    ],
    "expected": "Tồn kho A giảm và kho B tăng đúng cùng số lượng (giữ nguyên lô/hạn dùng); sinh 2 StockMovements (xuất A, nhập B) liên kết phiếu điều chuyển; tổng tồn toàn hệ không đổi.",
    "evidence": [
     {
      "name": "TC-PHW-016__s01__form",
      "caption": "Form điều chuyển kho A→B",
      "uiState": "form"
     },
     {
      "name": "TC-PHW-016__s02__success",
      "caption": "Điều chuyển thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-017",
    "title": "Cảnh báo tồn thấp (LowStockAlerts) kích hoạt khi tồn dưới ngưỡng",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Dược sĩ",
    "preconditions": "Một thuốc có cấu hình ngưỡng tồn (StockThresholds); tồn hiện tại trên ngưỡng.",
    "steps": [
     "Xuất bớt thuốc cho tồn xuống dưới ngưỡng",
     "Mở màn tổng quan /v2/pharmacy hoặc báo cáo",
     "Quan sát KPI/cảnh báo tồn thấp"
    ],
    "expected": "Sau khi tồn xuống dưới ngưỡng, LowStockAlert xuất hiện; KPI 'tồn thấp' tăng; thuốc được đánh dấu cảnh báo trong bảng.",
    "evidence": [
     {
      "name": "TC-PHW-017__s01__list",
      "caption": "Thuốc đánh dấu cảnh báo tồn thấp",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-018",
    "title": "Cảnh báo hạn dùng (ExpiryAlerts) cho lô sắp hết hạn",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Dược sĩ",
    "preconditions": "Có lô hạn dùng nằm trong ngưỡng cảnh báo (vd còn <30 ngày).",
    "steps": [
     "Mở màn tổng quan/báo cáo tồn",
     "Lọc/quan sát mục sắp hết hạn",
     "Đối chiếu lô với hạn dùng thực"
    ],
    "expected": "Lô sắp hết hạn hiển thị trong ExpiryAlerts với số ngày còn lại; KPI 'sắp hết hạn' đếm đúng; ưu tiên xuất các lô này (FEFO).",
    "evidence": [
     {
      "name": "TC-PHW-018__s01__filter",
      "caption": "Lọc/hiển thị lô sắp hết hạn",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-019",
    "title": "Báo cáo tồn kho - nhập-xuất-tồn khớp số học theo kỳ",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Kế toán dược/Dược sĩ",
    "preconditions": "Đã có giao dịch nhập và xuất trong kỳ; ở /v2/stock-report.",
    "steps": [
     "Chọn kho và khoảng thời gian phủ các giao dịch đã làm ở TC-PHW-001/006",
     "Xem báo cáo nhập-xuất-tồn",
     "Đối chiếu: tồn cuối = tồn đầu + nhập - xuất - điều chỉnh"
    ],
    "expected": "Công thức tồn cuối khớp chính xác; giá trị tồn = số lượng × đơn giá đúng; các phiếu nhập/xuất/điều chỉnh đã thực hiện đều phản ánh; định dạng số/tiền có phân tách hàng nghìn.",
    "evidence": [
     {
      "name": "TC-PHW-019__s01__list",
      "caption": "Báo cáo nhập-xuất-tồn theo kho",
      "uiState": "list"
     },
     {
      "name": "TC-PHW-019__s02__detail",
      "caption": "Đối chiếu công thức tồn cuối",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-020",
    "title": "Chi phí thuốc đã phát đẩy sang viện phí đúng (liên thông billing)",
    "category": "integration",
    "priority": "P0",
    "role": "Dược sĩ + Thu ngân",
    "preconditions": "BN có toa đã phát thuốc qua TC-PHW-006; có quyền xem viện phí.",
    "steps": [
     "Phát thuốc cho 1 toa của BN",
     "Mở viện phí của BN đó (module billing)",
     "Đối chiếu dòng chi phí thuốc với số lượng × đơn giá đã phát"
    ],
    "expected": "Chi phí thuốc đã phát xuất hiện trong viện phí với đúng số lượng/đơn giá/thành tiền; phần BHYT (nếu có) tính đúng tỷ lệ; không phát sinh trùng/thiếu dòng.",
    "evidence": [
     {
      "name": "TC-PHW-020__s01__detail",
      "caption": "Dòng chi phí thuốc trong viện phí",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#251",
     "#255"
    ]
   },
   {
    "id": "TC-PHW-021",
    "title": "Audit log ghi đầy đủ mọi mutation (nhập/xuất/duyệt/điều chỉnh)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Admin/Kiểm soát",
    "preconditions": "Đã thực hiện nhập, xuất, duyệt, kiểm kê ở các TC trước.",
    "steps": [
     "Thực hiện 1 thao tác nhập và 1 thao tác xuất",
     "Truy vết StockMovements/audit log của các thao tác",
     "Kiểm tra người thực hiện + thời gian + loại biến động"
    ],
    "expected": "Mỗi mutation đều có bản ghi StockMovements và audit log với user, timestamp, loại (Nhập/Xuất/Điều chỉnh/Điều chuyển), số lượng và phiếu nguồn; không có biến động tồn nào thiếu vết.",
    "evidence": [
     {
      "name": "TC-PHW-021__s01__list",
      "caption": "Nhật ký biến động kho StockMovements",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#251",
     "#254"
    ]
   },
   {
    "id": "TC-PHW-022",
    "title": "Phân quyền - vai trò không đủ quyền bị chặn menu/nút/API duyệt dược",
    "category": "permission",
    "priority": "P0",
    "role": "User vai trò thấp (vd Lễ tân)",
    "preconditions": "Có tài khoản vai trò không có quyền dược/kho; tham chiếu matrix #216.",
    "steps": [
     "Đăng nhập bằng tài khoản không có quyền dược",
     "Thử mở /v2/pharmacy-approval và /v2/pharmacy-stock-in",
     "Thử gọi trực tiếp API duyệt/nhập (Postman) với token vai trò này"
    ],
    "expected": "Menu Dược & Kho không hiển thị hoặc route bị chặn; nút Duyệt/Nhập/Xuất ẩn/disable; API trả 403 Forbidden; không thực hiện được mutation.",
    "evidence": [
     {
      "name": "TC-PHW-022__s01__permission",
      "caption": "Chặn truy cập màn duyệt dược khi thiếu quyền",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#251"
    ]
   },
   {
    "id": "TC-PHW-023",
    "title": "Bảo mật - IDOR: không xem được phiếu/toa của kho/khoa khác qua đổi ID",
    "category": "security",
    "priority": "P0",
    "role": "Dược sĩ kho A",
    "preconditions": "Có phiếu thuộc kho/khoa khác (ID đã biết).",
    "steps": [
     "Đăng nhập với phạm vi kho A",
     "Gọi API/đổi ID trên URL để lấy chi tiết phiếu thuộc kho B",
     "Quan sát phản hồi"
    ],
    "expected": "Không trả dữ liệu phiếu/toa ngoài phạm vi quyền; trả 403/404; không lộ thông tin BN/toa kho khác.",
    "evidence": [
     {
      "name": "TC-PHW-023__s01__error",
      "caption": "Chặn truy cập phiếu ngoài phạm vi (IDOR)",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#251",
     "#216"
    ]
   },
   {
    "id": "TC-PHW-024",
    "title": "Bảo mật - XSS ở field ghi chú phiếu/lý do từ chối",
    "category": "security",
    "priority": "P1",
    "role": "Dược sĩ",
    "preconditions": "Form nhập/xuất/từ chối có ô ghi chú/lý do.",
    "steps": [
     "Nhập payload script vào ô ghi chú phiếu nhập, vd <img src=x onerror=alert(1)>",
     "Lưu phiếu",
     "Mở lại chi tiết phiếu và bảng có hiển thị ghi chú"
    ],
    "expected": "Nội dung được escape/hiển thị dạng text, không thực thi script; không có alert/DOM injection; lưu/đọc an toàn.",
    "evidence": [
     {
      "name": "TC-PHW-024__s01__detail",
      "caption": "Ghi chú chứa HTML hiển thị an toàn (escaped)",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-025",
    "title": "Edge - ký tự đặc biệt và tiếng Việt có dấu ở tên lô/ghi chú/tìm kiếm",
    "category": "edge",
    "priority": "P2",
    "role": "Thủ kho",
    "preconditions": "Form nhập kho và ô tìm kiếm trên danh sách.",
    "steps": [
     "Nhập số lô và ghi chú chứa tiếng Việt có dấu + ký tự đặc biệt (vd 'Lô Đặc-biệt #2026/Tết')",
     "Lưu phiếu",
     "Tìm kiếm lại bằng từ khóa có dấu trên danh sách"
    ],
    "expected": "Lưu và hiển thị đúng dấu/ký tự (UTF-8), không lỗi mã hóa; tìm kiếm có dấu trả đúng kết quả; không cắt chuỗi dài.",
    "evidence": [
     {
      "name": "TC-PHW-025__s01__filter",
      "caption": "Tìm kiếm tiếng Việt có dấu trên danh sách",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-026",
    "title": "UI - trạng thái empty/loading/error của bảng tồn kho",
    "category": "ui",
    "priority": "P2",
    "role": "Dược sĩ",
    "preconditions": "Có kho rỗng và môi trường mô phỏng lỗi API.",
    "steps": [
     "Mở /v2/pharmacy với kho chưa có dữ liệu → xem empty state",
     "Tải lại trang quan sát skeleton/loading",
     "Ngắt mạng/mô phỏng lỗi API và quan sát error banner"
    ],
    "expected": "Empty state có thông điệp rõ + gợi ý hành động; loading hiển thị skeleton không nhảy layout; lỗi API hiện banner có nút thử lại; không trắng trang.",
    "evidence": [
     {
      "name": "TC-PHW-026__s01__empty",
      "caption": "Empty state kho chưa có dữ liệu",
      "uiState": "empty"
     },
     {
      "name": "TC-PHW-026__s02__loading",
      "caption": "Skeleton khi tải bảng",
      "uiState": "loading"
     },
     {
      "name": "TC-PHW-026__s03__error",
      "caption": "Banner lỗi tải API",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-027",
    "title": "UI - parity dark/light và định dạng số/tiền/ngày trên KPI và bảng",
    "category": "ui",
    "priority": "P2",
    "role": "Dược sĩ",
    "preconditions": "Màn /v2/pharmacy và /v2/stock-report có dữ liệu.",
    "steps": [
     "Mở màn tổng quan ở light mode, ghi nhận màu KPI/cảnh báo/bảng",
     "Bật dark mode qua topbar",
     "So sánh độ tương phản cảnh báo (đỏ tồn thấp, vàng hạn dùng) và định dạng số/tiền/ngày"
    ],
    "expected": "Hai chế độ đều đủ tương phản, không chữ chìm nền; màu cảnh báo phân biệt được ở cả 2 mode; số có phân tách nghìn, tiền đúng đơn vị, ngày dạng dd/MM/yyyy.",
    "evidence": [
     {
      "name": "TC-PHW-027__s01__list",
      "caption": "KPI/bảng ở light mode",
      "uiState": "list"
     },
     {
      "name": "TC-PHW-027__s02__list",
      "caption": "KPI/bảng ở dark mode",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-028",
    "title": "Danh mục dược - cấu hình tách gói (SplitablePackageConfigs) áp dụng đúng khi xuất lẻ",
    "category": "edge",
    "priority": "P2",
    "role": "Dược sĩ",
    "preconditions": "Một thuốc có cấu hình tách gói (vd hộp 10 vỉ, vỉ 10 viên) ở /v2/pharmacy-catalogs.",
    "steps": [
     "Cấu hình tách gói cho thuốc",
     "Xuất lẻ với đơn vị nhỏ nhất (viên) số lượng không chia hết hộp",
     "Quan sát quy đổi tồn"
    ],
    "expected": "Quy đổi đơn vị đúng theo cấu hình; tồn trừ chính xác theo đơn vị nhỏ nhất; không sai số làm tròn; chặn xuất vượt phần tồn lẻ khả dụng.",
    "evidence": [
     {
      "name": "TC-PHW-028__s01__modal",
      "caption": "Cấu hình tách gói thuốc",
      "uiState": "modal"
     },
     {
      "name": "TC-PHW-028__s02__form",
      "caption": "Quy đổi đơn vị khi xuất lẻ",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-PHW-029",
    "title": "Negative - thao tác sai thứ tự: phát thuốc khi toa CHƯA duyệt dược",
    "category": "negative",
    "priority": "P0",
    "role": "Dược sĩ phát thuốc",
    "preconditions": "Có toa đang Chờ duyệt (chưa duyệt).",
    "steps": [
     "Vào màn phát thuốc",
     "Cố chọn/phát toa chưa duyệt dược",
     "Xác nhận phát"
    ],
    "expected": "Hệ thống chặn phát toa chưa duyệt với thông báo rõ; không trừ tồn; bắt buộc đi qua bước duyệt dược trước (đúng trình tự nghiệp vụ an toàn thuốc).",
    "evidence": [
     {
      "name": "TC-PHW-029__s01__error",
      "caption": "Chặn phát thuốc khi toa chưa duyệt",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#251",
     "#254"
    ]
   },
   {
    "id": "TC-PHW-030",
    "title": "Yêu cầu mua sắm (ProcurementRequests) tạo từ cảnh báo tồn thấp",
    "category": "happy",
    "priority": "P2",
    "role": "Dược sĩ kế hoạch",
    "preconditions": "Có thuốc đang cảnh báo tồn thấp (từ TC-PHW-017).",
    "steps": [
     "Từ cảnh báo tồn thấp tạo yêu cầu mua sắm",
     "Thêm dòng thuốc-số lượng đề xuất",
     "Gửi yêu cầu"
    ],
    "expected": "ProcurementRequest tạo với dòng thuốc đúng; trạng thái Nháp/Đã gửi; liên kết về cảnh báo nguồn nếu có; hiển thị trong danh sách yêu cầu mua sắm.",
    "evidence": [
     {
      "name": "TC-PHW-030__s01__form",
      "caption": "Form tạo yêu cầu mua sắm",
      "uiState": "form"
     },
     {
      "name": "TC-PHW-030__s02__success",
      "caption": "Gửi yêu cầu mua sắm thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#251"
    ]
   }
  ],
  "gaps": [
   "Chưa rõ matrix phân quyền chi tiết theo vai trò (Dược sĩ duyệt vs Thủ kho vs phát thuốc) — cần tham chiếu #216 để khẳng định nút/route nào chặn cho vai trò nào; test permission hiện ở mức nguyên tắc.",
   "Cần test concurrency: 2 user cùng phát/điều chuyển trên cùng 1 lô tồn thấp (race condition trừ tồn âm) — chưa cover do cần 2 phiên đồng thời.",
   "Liên thông toa từ module presc (Kê đơn) sang duyệt dược: chưa có task kiểm tra toa kê ở presc tự xuất hiện đúng ở hàng chờ duyệt pharmwh (cross-module).",
   "Hoàn trả thuốc (trả lại kho khi BN không dùng/đổi toa) và hủy phiếu xuất đã phát + cộng tồn lại — bảng StockMovements gợi ý có nhưng chưa thấy màn cụ thể; cần xác nhận luồng reverse.",
   "Hàng ký gửi (ConsignmentStocks) và StockReservations (giữ hàng) chưa có task riêng — cần làm rõ nghiệp vụ giữ hàng cho mổ/nội trú trước khi xuất chính thức.",
   "Cấu hình lợi nhuận (ProfitMarginConfigs) ảnh hưởng giá xuất/giá bán — cần task kiểm tra giá tính đúng khi đổi cấu hình, hiện gộp ngầm trong báo cáo.",
   "Chưa có test xuất Excel/PDF báo cáo tồn (định dạng, encoding tiếng Việt trong file xuất).",
   "Edge ngày: kiểm kê/báo cáo với khoảng thời gian biên (cùng ngày, đảo ngày bắt đầu>kết thúc, năm nhuận) chưa có task riêng."
  ]
 },
 {
  "id": "retail",
  "code": "RET",
  "layer": "oper",
  "ic": "🏪",
  "nm": "Nhà thuốc bán lẻ (GPP)",
  "gh": [
   "#251",
   "#253",
   "#255"
  ],
  "gap": false,
  "module_id": "retail",
  "summary": "Phân hệ \"Nhà thuốc bán lẻ (GPP)\" (id=retail, code=RET, lớp oper) phục vụ bán lẻ thuốc tại quầy: tạo đơn bán lẻ (RetailSales/RetailSaleItems), quản lý khách hàng nhà thuốc + tích/đổi điểm (PharmacyCustomers/PharmacyPointTransactions), mở/đóng ca bán và đối soát tiền mặt (PharmacyShifts), ghi nhận hồ sơ GPP nhiệt độ/độ ẩm/lưu mẫu (PharmacyGppRecords) và tính/chi hoa hồng (PharmacyCommissions). Quan hệ chính RetailSales ⟶ RetailSaleItems · PharmacyCustomers ⟶ PharmacyPointTransactions · PharmacyShifts/Commissions; liên kết chéo với kê đơn (presc) và dược-kho (pharmwh) để trừ tồn theo lô/hạn dùng. UI thực: trang v2 \"Hóa đơn bán lẻ\" tại /v2/hospital-pharmacy (list + KPI + status tab + search), trang v1 hospital-pharmacy gom thêm khách hàng/ca/GPP/hoa hồng; API gốc /hospital-pharmacy/* (sales, medicines/search, stock, customers, shifts, gpp-records, commissions, dashboard).",
  "screens": [
   {
    "name": "Danh sách hóa đơn bán lẻ (v2)",
    "desc": "Trang chính list đơn bán lẻ 7 ngày gần nhất, KpiStrip (Hóa đơn 7d / Đã bán / Doanh thu M₫ / Đã hủy), StatusTabs (Chờ/Đã bán/Hủy), DataTable cột Mã đơn/Khách hàng/SĐT/Thanh toán/Tổng/Giảm/Trạng thái/Ngày bán, ô tìm kiếm.",
    "route_guess": "/v2/hospital-pharmacy",
    "elements": [
     "KpiStrip",
     "StatusTabs",
     "DataTable",
     "SearchBox",
     "ExpiryAlertModal",
     "nút Tạo đơn bán"
    ]
   },
   {
    "name": "Tạo đơn bán lẻ (modal/drawer POS)",
    "desc": "Form tạo RetailSale: chọn khách (hoặc khách lẻ), tìm thuốc theo từ khóa (medicines/search), thêm dòng thuốc (số lượng/đơn giá/lô/hạn), nhập chiết khấu + phương thức thanh toán, xem tổng tự tính, lưu.",
    "route_guess": "/v2/hospital-pharmacy (modal createRetailSale)",
    "elements": [
     "DrawerShell/ModalShell",
     "ô tìm thuốc + dropdown kết quả",
     "bảng dòng thuốc",
     "input số lượng/đơn giá",
     "select phương thức thanh toán",
     "input chiết khấu",
     "ô hiển thị tổng/giảm/thực thu",
     "nút Lưu/Hủy"
    ]
   },
   {
    "name": "Chi tiết đơn bán lẻ",
    "desc": "Xem chi tiết một đơn: thông tin khách, danh sách RetailSaleItems (thuốc/đơn vị/SL/đơn giá/thành tiền/lô/hạn), tổng tiền, trạng thái, người tạo, nút Hủy đơn.",
    "route_guess": "/v2/hospital-pharmacy (drawer detail)",
    "elements": [
     "DrawerShell",
     "bảng items",
     "StatusBadge",
     "nút Hủy đơn",
     "thông tin người bán/ngày bán"
    ]
   },
   {
    "name": "Khách hàng nhà thuốc",
    "desc": "Danh sách PharmacyCustomers (mã, họ tên, SĐT, loại KH, số thẻ, điểm tích lũy, tổng mua), form thêm/sửa khách, xem lịch sử giao dịch điểm.",
    "route_guess": "/hospital-pharmacy (tab Khách hàng)",
    "elements": [
     "DataTable",
     "form thêm/sửa khách",
     "cột điểm/tổng mua",
     "nút Tích điểm/Đổi điểm",
     "lịch sử PharmacyPointTransactions"
    ]
   },
   {
    "name": "Tích/Đổi điểm",
    "desc": "Modal cộng điểm (addPoints) hoặc trừ điểm đổi quà (redeemPoints) cho một khách, nhập số điểm + mô tả, gắn theo đơn bán (saleId).",
    "route_guess": "/hospital-pharmacy (modal điểm)",
    "elements": [
     "ModalShell",
     "input số điểm",
     "textarea mô tả",
     "nút Tích điểm/Đổi điểm",
     "hiển thị số dư điểm"
    ]
   },
   {
    "name": "Ca bán (PharmacyShifts)",
    "desc": "Mở ca (openShift nhập tiền đầu ca), ca hiện tại (current), đóng ca (closeShift nhập tiền cuối ca → đối soát totalSales/totalRefunds), danh sách ca lịch sử.",
    "route_guess": "/hospital-pharmacy (tab Ca bán)",
    "elements": [
     "DataTable ca",
     "nút Mở ca/Đóng ca",
     "input tiền đầu ca/cuối ca",
     "ô đối soát chênh lệch",
     "StatusBadge trạng thái ca"
    ]
   },
   {
    "name": "Hồ sơ GPP (PharmacyGppRecords)",
    "desc": "Danh sách + form ghi hồ sơ GPP theo loại (nhiệt độ/độ ẩm/lưu mẫu/thu hồi…), nhập nhiệt độ/độ ẩm/lô/biện pháp xử lý, người ghi.",
    "route_guess": "/hospital-pharmacy (tab GPP)",
    "elements": [
     "DataTable",
     "form saveGppRecord",
     "input nhiệt độ/độ ẩm",
     "select loại hồ sơ",
     "input lô/biện pháp xử lý"
    ]
   },
   {
    "name": "Hoa hồng (PharmacyCommissions)",
    "desc": "Danh sách hoa hồng theo bác sĩ/đơn (tỷ lệ, số tiền, trạng thái), tạo bản ghi hoa hồng, chi trả hàng loạt (payCommissions).",
    "route_guess": "/hospital-pharmacy (tab Hoa hồng)",
    "elements": [
     "DataTable",
     "form saveCommission",
     "cột tỷ lệ/số tiền/trạng thái",
     "checkbox chọn nhiều",
     "nút Chi trả hoa hồng"
    ]
   },
   {
    "name": "Dashboard nhà thuốc",
    "desc": "Số liệu tổng quan: doanh thu hôm nay, số đơn hôm nay, tồn thấp; bản nâng cao thêm tổng KH/VIP/ca mở/hồ sơ GPP hôm nay/hoa hồng chờ chi.",
    "route_guess": "/hospital-pharmacy (dashboard)",
    "elements": [
     "KpiStrip",
     "thẻ số liệu",
     "biểu đồ doanh thu (revenue)"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-RET-001",
    "title": "Bán lẻ thành công đơn nhiều dòng thuốc cho khách lẻ",
    "category": "happy",
    "priority": "P0",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Đăng nhập admin/Admin@123; có thuốc còn tồn trong /hospital-pharmacy/stock; đang ở /v2/hospital-pharmacy",
    "steps": [
     "Mở trang /v2/hospital-pharmacy",
     "Nhấn nút Tạo đơn bán mở form POS",
     "Để trống khách (mặc định Khách lẻ)",
     "Gõ từ khóa tìm thuốc, chọn 2 thuốc khác nhau từ dropdown",
     "Nhập số lượng hợp lệ cho mỗi dòng",
     "Chọn phương thức thanh toán Tiền mặt",
     "Nhấn Lưu"
    ],
    "expected": "Đơn được tạo với saleCode tự sinh, status=completed (Đã bán), finalAmount = tổng dòng - chiết khấu; toast thành công; đơn xuất hiện đầu danh sách ở tab Đã bán; KPI Hóa đơn 7d và Doanh thu tăng tương ứng",
    "evidence": [
     {
      "name": "TC-RET-001__s01__list",
      "caption": "Danh sách trước khi tạo đơn",
      "uiState": "list"
     },
     {
      "name": "TC-RET-001__s02__form",
      "caption": "Form POS đã thêm 2 thuốc",
      "uiState": "form"
     },
     {
      "name": "TC-RET-001__s03__success",
      "caption": "Toast tạo đơn thành công",
      "uiState": "success"
     },
     {
      "name": "TC-RET-001__s04__list",
      "caption": "Đơn mới hiện đầu danh sách tab Đã bán",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#251",
     "#253"
    ]
   },
   {
    "id": "TC-RET-002",
    "title": "Tìm và chọn thuốc qua ô tìm kiếm trong form bán",
    "category": "happy",
    "priority": "P1",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Đang ở form tạo đơn bán; có thuốc tên tiếng Việt có dấu trong kho",
    "steps": [
     "Mở form Tạo đơn bán",
     "Gõ một phần tên hoạt chất/tên thuốc có dấu",
     "Quan sát dropdown kết quả từ /hospital-pharmacy/medicines/search",
     "Chọn 1 thuốc"
    ],
    "expected": "Dropdown hiển thị danh sách thuốc khớp (mã, tên, hoạt chất, đơn vị, đơn giá, tồn, lô, hạn); chọn xong tự đổ đơn giá và đơn vị vào dòng; tồn hiển thị đúng",
    "evidence": [
     {
      "name": "TC-RET-002__s01__dropdown",
      "caption": "Dropdown gợi ý thuốc theo từ khóa",
      "uiState": "dropdown"
     },
     {
      "name": "TC-RET-002__s02__form",
      "caption": "Dòng thuốc đã đổ đơn giá/đơn vị",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-RET-003",
    "title": "Bán lẻ gắn khách hàng thành viên và tích điểm theo đơn",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Tồn tại 1 PharmacyCustomer có điểm hiện tại đã biết; có thuốc còn tồn",
    "steps": [
     "Mở form Tạo đơn bán",
     "Chọn khách hàng thành viên (theo SĐT/mã thẻ)",
     "Thêm thuốc và lưu đơn thành công",
     "Mở màn Khách hàng, mở khách vừa bán",
     "Kiểm tra totalPoints, totalPurchaseAmount, totalPurchaseCount và lịch sử PharmacyPointTransactions"
    ],
    "expected": "Đơn lưu kèm customerId; điểm khách tăng đúng quy tắc tích điểm; totalPurchaseAmount cộng finalAmount, totalPurchaseCount +1, lastPurchaseDate cập nhật; có 1 dòng PointTransaction loại tích điểm gắn saleId của đơn",
    "evidence": [
     {
      "name": "TC-RET-003__s01__form",
      "caption": "Đã chọn khách thành viên trong form bán",
      "uiState": "form"
     },
     {
      "name": "TC-RET-003__s02__detail",
      "caption": "Hồ sơ khách sau bán: điểm và tổng mua tăng",
      "uiState": "detail"
     },
     {
      "name": "TC-RET-003__s03__tab",
      "caption": "Lịch sử giao dịch điểm có dòng tích điểm gắn đơn",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#253"
    ]
   },
   {
    "id": "TC-RET-004",
    "title": "Chặn tạo đơn khi chưa thêm dòng thuốc nào",
    "category": "negative",
    "priority": "P0",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Đang ở form Tạo đơn bán, chưa thêm thuốc",
    "steps": [
     "Mở form Tạo đơn bán",
     "Không thêm dòng thuốc nào",
     "Nhấn Lưu"
    ],
    "expected": "Hệ thống chặn lưu, hiển thị lỗi yêu cầu thêm ít nhất 1 thuốc; không gọi POST /sales hoặc API trả 400; đơn không được tạo",
    "evidence": [
     {
      "name": "TC-RET-004__s01__validation",
      "caption": "Thông báo lỗi đơn trống không cho lưu",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#251",
     "#255"
    ]
   },
   {
    "id": "TC-RET-005",
    "title": "Validation số lượng bán: 0, âm, vượt tồn kho",
    "category": "validation",
    "priority": "P0",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Đã thêm 1 thuốc có tồn xác định (vd tồn=10) vào form",
    "steps": [
     "Nhập số lượng = 0 và thử lưu",
     "Nhập số lượng = -5 và thử lưu",
     "Nhập số lượng = 999999 (vượt tồn) và thử lưu"
    ],
    "expected": "SL=0 và SL âm bị chặn với thông báo phải > 0; SL vượt tồn bị chặn/cảnh báo không đủ tồn; không tạo đơn cho cả 3 trường hợp; thông điệp lỗi rõ ràng tiếng Việt",
    "evidence": [
     {
      "name": "TC-RET-005__s01__validation",
      "caption": "Lỗi số lượng phải lớn hơn 0",
      "uiState": "validation"
     },
     {
      "name": "TC-RET-005__s02__validation",
      "caption": "Lỗi vượt tồn kho",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#255"
    ]
   },
   {
    "id": "TC-RET-006",
    "title": "Validation chiết khấu vượt tổng tiền / chiết khấu âm",
    "category": "validation",
    "priority": "P1",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Form bán đã có thuốc với tổng tiền xác định (vd 100.000đ)",
    "steps": [
     "Nhập chiết khấu = -10000 và quan sát",
     "Nhập chiết khấu lớn hơn tổng tiền (vd 200000) và thử lưu"
    ],
    "expected": "Chiết khấu âm bị chặn; chiết khấu > tổng tiền bị chặn hoặc thực thu không được < 0; thông báo lỗi rõ; finalAmount tính lại đúng = totalAmount - discountAmount",
    "evidence": [
     {
      "name": "TC-RET-006__s01__validation",
      "caption": "Lỗi chiết khấu vượt tổng tiền",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#255"
    ]
   },
   {
    "id": "TC-RET-007",
    "title": "Tổng tiền tự tính đúng khi thay đổi số lượng/đơn giá/chiết khấu",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Form bán có 2 dòng thuốc",
    "steps": [
     "Đặt dòng 1: SL=3, đơn giá=15.000 → kiểm thành tiền 45.000",
     "Đặt dòng 2: SL=2, đơn giá=20.000 → kiểm thành tiền 40.000",
     "Nhập chiết khấu 5.000",
     "Kiểm tổng/giảm/thực thu",
     "Lưu đơn rồi mở chi tiết kiểm lại finalAmount"
    ],
    "expected": "totalAmount=85.000, discountAmount=5.000, finalAmount=80.000 hiển thị định dạng vi-VN (dấu chấm ngăn nghìn, hậu tố đ); số trên chi tiết khớp form và cột Tổng/Giảm ở list",
    "evidence": [
     {
      "name": "TC-RET-007__s01__form",
      "caption": "Tổng/giảm/thực thu tính đúng trong form",
      "uiState": "form"
     },
     {
      "name": "TC-RET-007__s02__detail",
      "caption": "finalAmount trên chi tiết khớp",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#251",
     "#253"
    ]
   },
   {
    "id": "TC-RET-008",
    "title": "Hủy đơn bán lẻ đã hoàn tất và hoàn trả tồn",
    "category": "state",
    "priority": "P0",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Tồn tại 1 đơn status=completed; biết tồn thuốc trước khi bán",
    "steps": [
     "Mở chi tiết một đơn Đã bán",
     "Nhấn Hủy đơn và xác nhận",
     "Quan sát trạng thái đơn",
     "Kiểm tồn kho thuốc trong đơn",
     "Kiểm tab Hủy ở danh sách"
    ],
    "expected": "Đơn chuyển status=cancelled (Hủy), hiển thị ở tab Hủy; PUT /sales/{id}/cancel thành công; tồn kho thuốc được hoàn lại đúng số lượng đã bán; nếu đơn có tích điểm thì điểm/tổng mua khách được điều chỉnh ngược",
    "evidence": [
     {
      "name": "TC-RET-008__s01__detail",
      "caption": "Chi tiết đơn trước khi hủy",
      "uiState": "detail"
     },
     {
      "name": "TC-RET-008__s02__confirm",
      "caption": "Hộp xác nhận hủy đơn",
      "uiState": "confirm"
     },
     {
      "name": "TC-RET-008__s03__list",
      "caption": "Đơn xuất hiện ở tab Hủy",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#251",
     "#255"
    ]
   },
   {
    "id": "TC-RET-009",
    "title": "Chặn hủy đơn đã ở trạng thái Hủy (chuyển trạng thái không hợp lệ)",
    "category": "state",
    "priority": "P1",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Tồn tại 1 đơn status=cancelled",
    "steps": [
     "Mở chi tiết đơn đã Hủy",
     "Quan sát nút Hủy đơn",
     "Nếu vẫn gọi được, thử gọi lại PUT /sales/{id}/cancel"
    ],
    "expected": "Nút Hủy bị ẩn/disable với đơn đã hủy; API trả lỗi nghiệp vụ (không cho hủy 2 lần); tồn kho không bị hoàn thêm lần nữa",
    "evidence": [
     {
      "name": "TC-RET-009__s01__detail",
      "caption": "Đơn đã hủy: nút Hủy bị disable",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#255"
    ]
   },
   {
    "id": "TC-RET-010",
    "title": "Hủy giữa chừng khi đang tạo đơn không lưu dữ liệu rác",
    "category": "negative",
    "priority": "P1",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Đang ở form Tạo đơn bán đã nhập dở",
    "steps": [
     "Mở form, thêm 1 thuốc và nhập chiết khấu",
     "Nhấn Hủy/đóng drawer giữa chừng",
     "Mở lại form Tạo đơn bán"
    ],
    "expected": "Không tạo đơn nào (không gọi POST /sales); form mở lại ở trạng thái trống sạch, không còn dữ liệu cũ; danh sách không thêm đơn rác",
    "evidence": [
     {
      "name": "TC-RET-010__s01__form",
      "caption": "Form đang nhập dở",
      "uiState": "form"
     },
     {
      "name": "TC-RET-010__s02__form",
      "caption": "Form mở lại sạch dữ liệu",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-RET-011",
    "title": "Mở ca bán với tiền đầu ca",
    "category": "happy",
    "priority": "P0",
    "role": "Thu ngân nhà thuốc",
    "preconditions": "Chưa có ca đang mở cho người dùng hiện tại",
    "steps": [
     "Vào màn Ca bán",
     "Nhấn Mở ca",
     "Nhập tiền đầu ca hợp lệ (vd 500.000)",
     "Xác nhận mở ca",
     "Kiểm tra ca hiện tại (current)"
    ],
    "expected": "openShift thành công, ca có shiftCode, status=mở, openingCash=500.000, startTime=hiện tại, cashierId=người dùng; ca hiển thị là ca hiện tại",
    "evidence": [
     {
      "name": "TC-RET-011__s01__modal",
      "caption": "Modal mở ca nhập tiền đầu ca",
      "uiState": "modal"
     },
     {
      "name": "TC-RET-011__s02__success",
      "caption": "Ca mở thành công hiển thị ca hiện tại",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#253"
    ]
   },
   {
    "id": "TC-RET-012",
    "title": "Chặn mở ca thứ 2 khi đã có ca đang mở",
    "category": "state",
    "priority": "P0",
    "role": "Thu ngân nhà thuốc",
    "preconditions": "Đã có 1 ca đang mở cho người dùng hiện tại",
    "steps": [
     "Vào màn Ca bán",
     "Nhấn Mở ca lần nữa",
     "Thử nhập tiền đầu ca và xác nhận"
    ],
    "expected": "Hệ thống chặn, báo đã có ca đang mở, phải đóng ca trước; không tạo ca mới",
    "evidence": [
     {
      "name": "TC-RET-012__s01__error",
      "caption": "Lỗi đã có ca đang mở",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#255"
    ]
   },
   {
    "id": "TC-RET-013",
    "title": "Đóng ca và đối soát tiền mặt (khớp/lệch quỹ)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Thu ngân nhà thuốc",
    "preconditions": "Đang có ca mở; trong ca đã phát sinh một số đơn bán tiền mặt với tổng đã biết",
    "steps": [
     "Bán vài đơn tiền mặt trong ca, ghi nhớ tổng doanh thu",
     "Vào màn Ca bán nhấn Đóng ca",
     "Nhập tiền cuối ca = openingCash + tổng bán (khớp)",
     "Xác nhận và kiểm đối soát",
     "Lặp lại với tiền cuối ca lệch (thiếu 50.000) ở ca mới"
    ],
    "expected": "closeShift tính totalSales/totalRefunds đúng từ đơn trong ca; trường hợp khớp: chênh lệch=0; trường hợp lệch: hiển thị rõ số tiền thừa/thiếu; ca chuyển status=đóng, endTime cập nhật; không cho bán tiếp khi ca đã đóng",
    "evidence": [
     {
      "name": "TC-RET-013__s01__modal",
      "caption": "Modal đóng ca nhập tiền cuối ca",
      "uiState": "modal"
     },
     {
      "name": "TC-RET-013__s02__detail",
      "caption": "Đối soát khớp quỹ chênh lệch 0",
      "uiState": "detail"
     },
     {
      "name": "TC-RET-013__s03__detail",
      "caption": "Đối soát lệch quỹ hiển thị thiếu",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#253",
     "#255"
    ]
   },
   {
    "id": "TC-RET-014",
    "title": "Tích điểm thủ công cho khách thành viên",
    "category": "happy",
    "priority": "P1",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Tồn tại 1 PharmacyCustomer; biết số điểm hiện tại",
    "steps": [
     "Mở màn Khách hàng, chọn 1 khách",
     "Nhấn Tích điểm",
     "Nhập số điểm hợp lệ và mô tả",
     "Xác nhận",
     "Kiểm totalPoints và lịch sử giao dịch điểm"
    ],
    "expected": "addPoints thành công; totalPoints tăng đúng; có 1 PointTransaction loại cộng điểm với mô tả nhập vào",
    "evidence": [
     {
      "name": "TC-RET-014__s01__modal",
      "caption": "Modal tích điểm",
      "uiState": "modal"
     },
     {
      "name": "TC-RET-014__s02__detail",
      "caption": "Điểm khách tăng sau tích",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#253"
    ]
   },
   {
    "id": "TC-RET-015",
    "title": "Đổi điểm vượt số dư bị chặn",
    "category": "validation",
    "priority": "P0",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Khách có totalPoints xác định (vd 100 điểm)",
    "steps": [
     "Mở khách, nhấn Đổi điểm",
     "Nhập số điểm đổi lớn hơn số dư (vd 500)",
     "Xác nhận"
    ],
    "expected": "redeemPoints bị chặn, báo không đủ điểm; số dư điểm không thay đổi; không tạo PointTransaction trừ điểm",
    "evidence": [
     {
      "name": "TC-RET-015__s01__validation",
      "caption": "Lỗi đổi điểm vượt số dư",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#255"
    ]
   },
   {
    "id": "TC-RET-016",
    "title": "Đổi/tích điểm với số điểm 0 hoặc âm",
    "category": "edge",
    "priority": "P2",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Tồn tại 1 khách hàng",
    "steps": [
     "Mở modal Tích điểm, nhập 0 rồi -10, xác nhận",
     "Mở modal Đổi điểm, nhập 0 rồi -10, xác nhận"
    ],
    "expected": "Cả tích và đổi điểm với giá trị 0/âm đều bị chặn với thông báo điểm phải > 0; số dư không đổi",
    "evidence": [
     {
      "name": "TC-RET-016__s01__validation",
      "caption": "Lỗi điểm phải lớn hơn 0",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#255"
    ]
   },
   {
    "id": "TC-RET-017",
    "title": "Thêm/sửa khách hàng nhà thuốc với SĐT trùng và định dạng sai",
    "category": "validation",
    "priority": "P1",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Tồn tại 1 khách có SĐT đã biết",
    "steps": [
     "Vào màn Khách hàng, nhấn Thêm khách",
     "Để trống họ tên rồi lưu",
     "Nhập SĐT sai định dạng (chữ cái) rồi lưu",
     "Nhập SĐT trùng với khách đã có rồi lưu",
     "Nhập đầy đủ hợp lệ rồi lưu"
    ],
    "expected": "Họ tên bắt buộc; SĐT sai định dạng bị chặn; SĐT trùng bị cảnh báo/chặn (tùy quy tắc); trường hợp hợp lệ lưu thành công, customerCode tự sinh, hiển thị trong danh sách",
    "evidence": [
     {
      "name": "TC-RET-017__s01__validation",
      "caption": "Lỗi họ tên bắt buộc / SĐT sai định dạng",
      "uiState": "validation"
     },
     {
      "name": "TC-RET-017__s02__success",
      "caption": "Thêm khách hợp lệ thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#253",
     "#255"
    ]
   },
   {
    "id": "TC-RET-018",
    "title": "Ghi hồ sơ GPP nhiệt độ/độ ẩm với giá trị biên",
    "category": "edge",
    "priority": "P1",
    "role": "Dược sĩ phụ trách GPP",
    "preconditions": "Đang ở màn Hồ sơ GPP",
    "steps": [
     "Nhấn Thêm hồ sơ GPP, chọn loại Theo dõi nhiệt độ/độ ẩm",
     "Nhập nhiệt độ = -50 và độ ẩm = 200 (ngoài thực tế)",
     "Nhập nhiệt độ và độ ẩm hợp lệ (vd 25/60)",
     "Nhập biện pháp xử lý dài/ký tự đặc biệt và lưu"
    ],
    "expected": "Giá trị nhiệt/ẩm phi lý bị cảnh báo/chặn theo range; giá trị hợp lệ lưu thành công; recordDate, recordedByName ghi đúng; chuỗi dài/ký tự đặc biệt được lưu/hiển thị an toàn không vỡ UI",
    "evidence": [
     {
      "name": "TC-RET-018__s01__form",
      "caption": "Form GPP nhập nhiệt độ/độ ẩm",
      "uiState": "form"
     },
     {
      "name": "TC-RET-018__s02__validation",
      "caption": "Cảnh báo giá trị nhiệt/ẩm ngoài range",
      "uiState": "validation"
     },
     {
      "name": "TC-RET-018__s03__success",
      "caption": "Lưu hồ sơ GPP thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#253"
    ]
   },
   {
    "id": "TC-RET-019",
    "title": "Tạo và chi trả hoa hồng hàng loạt",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản lý nhà thuốc",
    "preconditions": "Tồn tại vài bản ghi PharmacyCommission status=chưa chi",
    "steps": [
     "Vào màn Hoa hồng",
     "Tạo 1 bản ghi hoa hồng: chọn bác sĩ, nhập saleAmount và commissionRate, kiểm commissionAmount tự tính",
     "Chọn nhiều bản ghi chưa chi",
     "Nhấn Chi trả hoa hồng và xác nhận",
     "Kiểm trạng thái và paidDate"
    ],
    "expected": "commissionAmount = saleAmount * commissionRate; payCommissions chuyển các bản ghi sang status=đã chi, set paidDate; tổng pendingCommission trên dashboard giảm tương ứng",
    "evidence": [
     {
      "name": "TC-RET-019__s01__form",
      "caption": "Form tạo hoa hồng tự tính số tiền",
      "uiState": "form"
     },
     {
      "name": "TC-RET-019__s02__confirm",
      "caption": "Xác nhận chi trả hàng loạt",
      "uiState": "confirm"
     },
     {
      "name": "TC-RET-019__s03__list",
      "caption": "Bản ghi chuyển trạng thái đã chi",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#253",
     "#255"
    ]
   },
   {
    "id": "TC-RET-020",
    "title": "Validation tỷ lệ hoa hồng ngoài khoảng hợp lệ",
    "category": "validation",
    "priority": "P2",
    "role": "Quản lý nhà thuốc",
    "preconditions": "Đang ở form tạo hoa hồng",
    "steps": [
     "Nhập commissionRate âm và lưu",
     "Nhập commissionRate > 100% (vd 1.5) và lưu",
     "Nhập saleAmount âm và lưu"
    ],
    "expected": "Tỷ lệ âm và > 100% bị chặn; saleAmount âm bị chặn; thông báo lỗi rõ; không tạo bản ghi",
    "evidence": [
     {
      "name": "TC-RET-020__s01__validation",
      "caption": "Lỗi tỷ lệ hoa hồng không hợp lệ",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#255"
    ]
   },
   {
    "id": "TC-RET-021",
    "title": "Lọc và tìm kiếm đơn bán theo trạng thái, từ khóa, khoảng ngày",
    "category": "happy",
    "priority": "P1",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Có đơn ở cả 3 trạng thái Chờ/Đã bán/Hủy",
    "steps": [
     "Vào /v2/hospital-pharmacy",
     "Lần lượt chọn từng StatusTab và kiểm danh sách lọc đúng",
     "Gõ mã đơn/SĐT/tên khách vào ô tìm kiếm",
     "Đổi khoảng ngày (nếu có filter)"
    ],
    "expected": "Mỗi tab chỉ hiển thị đơn đúng trạng thái; tìm kiếm lọc đúng theo searchOf (mã/khách/SĐT); KPI cập nhật theo tập kết quả; trống kết quả hiển thị empty state",
    "evidence": [
     {
      "name": "TC-RET-021__s01__filter",
      "caption": "Lọc theo StatusTab",
      "uiState": "filter"
     },
     {
      "name": "TC-RET-021__s02__list",
      "caption": "Kết quả tìm kiếm theo từ khóa",
      "uiState": "list"
     },
     {
      "name": "TC-RET-021__s03__empty",
      "caption": "Empty state khi không có kết quả",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-RET-022",
    "title": "Cảnh báo hạn dùng khi bán thuốc cận/hết hạn",
    "category": "edge",
    "priority": "P0",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Có thuốc với lô có hạn dùng cận hạn và lô đã hết hạn trong kho; ExpiryAlertModal có trên trang",
    "steps": [
     "Mở /v2/hospital-pharmacy quan sát ExpiryAlertModal",
     "Mở form bán, tìm và chọn thuốc có lô cận hạn",
     "Thử chọn thuốc có lô đã hết hạn",
     "Tiến hành lưu đơn"
    ],
    "expected": "ExpiryAlertModal hiển thị danh sách thuốc cận/hết hạn; chọn lô cận hạn hiển thị cảnh báo nhưng có thể bán; lô đã hết hạn bị cảnh báo mạnh/chặn bán (patient-safety); hạn dùng hiển thị đúng trên dòng thuốc",
    "evidence": [
     {
      "name": "TC-RET-022__s01__modal",
      "caption": "ExpiryAlertModal cảnh báo hạn dùng",
      "uiState": "modal"
     },
     {
      "name": "TC-RET-022__s02__form",
      "caption": "Cảnh báo khi chọn lô cận/hết hạn",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#251",
     "#255"
    ]
   },
   {
    "id": "TC-RET-023",
    "title": "Phân quyền: vai trò không đủ quyền bị chặn menu/nút/API nhà thuốc",
    "category": "permission",
    "priority": "P0",
    "role": "Người dùng không có quyền nhà thuốc (vd Lễ tân)",
    "preconditions": "Có tài khoản role không thuộc nhóm dược/thu ngân nhà thuốc; tham chiếu matrix quyền #216",
    "steps": [
     "Đăng nhập bằng tài khoản không có quyền nhà thuốc",
     "Kiểm menu có hiển thị mục Nhà thuốc bán lẻ không",
     "Truy cập trực tiếp URL /v2/hospital-pharmacy",
     "Gọi trực tiếp POST /hospital-pharmacy/sales bằng token role này"
    ],
    "expected": "Menu ẩn mục nhà thuốc; truy cập URL bị chặn/redirect; API trả 401/403; không tạo được đơn; nút Tạo/Hủy/Mở ca/Chi hoa hồng không khả dụng",
    "evidence": [
     {
      "name": "TC-RET-023__s01__permission",
      "caption": "Menu ẩn mục nhà thuốc với role thiếu quyền",
      "uiState": "permission"
     },
     {
      "name": "TC-RET-023__s02__error",
      "caption": "API trả 403 khi role thiếu quyền tạo đơn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216",
     "#255"
    ]
   },
   {
    "id": "TC-RET-024",
    "title": "IDOR: chặn xem/sửa đơn bán hoặc khách của cơ sở/người khác",
    "category": "security",
    "priority": "P0",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Biết id một đơn bán và một khách hàng thuộc phạm vi khác (hoặc id ngẫu nhiên hợp lệ)",
    "steps": [
     "Đăng nhập role hợp lệ",
     "Gọi GET /hospital-pharmacy/customers/{id} với id không thuộc quyền truy cập",
     "Gọi PUT /hospital-pharmacy/sales/{id}/cancel với id đơn không thuộc quyền",
     "Thử đoán id tuần tự"
    ],
    "expected": "API trả 403/404 cho id ngoài phạm vi, không lộ dữ liệu khách/đơn của cơ sở khác; không cho hủy đơn không thuộc quyền; id dạng GUID khó đoán",
    "evidence": [
     {
      "name": "TC-RET-024__s01__error",
      "caption": "403/404 khi truy cập đơn/khách ngoài quyền",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216",
     "#255"
    ]
   },
   {
    "id": "TC-RET-025",
    "title": "XSS/ký tự đặc biệt ở tên khách, ghi chú, mô tả điểm",
    "category": "security",
    "priority": "P1",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Đang ở form thêm khách / modal điểm / form GPP",
    "steps": [
     "Nhập tên khách = <script>alert(1)</script> và lưu",
     "Nhập notes/description chứa thẻ HTML và emoji",
     "Mở lại danh sách và chi tiết để xem hiển thị"
    ],
    "expected": "Chuỗi được escape/hiển thị nguyên văn, không thực thi script; không vỡ layout; lưu/đọc lại đúng nội dung kể cả tiếng Việt có dấu và ký tự đặc biệt",
    "evidence": [
     {
      "name": "TC-RET-025__s01__form",
      "caption": "Nhập payload script vào tên khách",
      "uiState": "form"
     },
     {
      "name": "TC-RET-025__s02__detail",
      "caption": "Hiển thị an toàn không thực thi script",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-RET-026",
    "title": "UI state: empty/loading/error của danh sách đơn bán",
    "category": "ui",
    "priority": "P1",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Có thể mô phỏng API chậm/lỗi (DevTools throttle / chặn /sales)",
    "steps": [
     "Tải /v2/hospital-pharmacy quan sát loading",
     "Để API /sales trả mảng rỗng và quan sát empty state",
     "Chặn /sales trả lỗi và quan sát error handling",
     "Kiểm các trạng thái ở cả tab Chờ/Đã bán/Hủy"
    ],
    "expected": "Loading hiển thị skeleton/spinner; empty hiển thị thông báo không có đơn; lỗi không làm trắng trang (getRetailSales catch trả rỗng) và có thông báo phù hợp; KPI hiển thị 0 hợp lý",
    "evidence": [
     {
      "name": "TC-RET-026__s01__loading",
      "caption": "Trạng thái loading danh sách",
      "uiState": "loading"
     },
     {
      "name": "TC-RET-026__s02__empty",
      "caption": "Empty state không có đơn",
      "uiState": "empty"
     },
     {
      "name": "TC-RET-026__s03__error",
      "caption": "Xử lý lỗi khi API thất bại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-RET-027",
    "title": "Dark/light parity và định dạng số/tiền/ngày vi-VN",
    "category": "ui",
    "priority": "P2",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Đang ở /v2/hospital-pharmacy",
    "steps": [
     "Bật chế độ sáng, kiểm KpiStrip, StatusBadge, bảng, drawer",
     "Chuyển sang chế độ tối qua toggle topbar",
     "Kiểm tương phản chữ/nền, màu StatusBadge (Chờ/Đã bán/Hủy)",
     "Kiểm định dạng tiền (dấu chấm + đ), ngày DD/MM HH:mm"
    ],
    "expected": "Cả 2 theme đọc rõ, không mất tương phản, không lỗi màu hardcode; badge giữ ngữ nghĩa màu; tiền định dạng vi-VN, ngày đúng định dạng; KPI doanh thu hiển thị M₫ đúng",
    "evidence": [
     {
      "name": "TC-RET-027__s01__list",
      "caption": "Giao diện chế độ sáng",
      "uiState": "list"
     },
     {
      "name": "TC-RET-027__s02__list",
      "caption": "Giao diện chế độ tối parity",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-RET-028",
    "title": "Edge: chuỗi rất dài, tên thuốc/khách tiếng Việt có dấu, đơn nhiều dòng",
    "category": "edge",
    "priority": "P2",
    "role": "Dược sĩ bán lẻ",
    "preconditions": "Form bán mở được",
    "steps": [
     "Nhập tên khách dài 255 ký tự có dấu tiếng Việt",
     "Thêm số dòng thuốc lớn (vd 30 dòng)",
     "Lưu đơn và mở lại chi tiết",
     "Kiểm hiển thị bảng và tổng tiền"
    ],
    "expected": "Không cắt dữ liệu sai/không vỡ bảng; tổng tiền vẫn tính đúng với nhiều dòng; tên có dấu lưu/hiển thị đúng; cuộn bảng items hoạt động; hiệu năng chấp nhận được",
    "evidence": [
     {
      "name": "TC-RET-028__s01__form",
      "caption": "Đơn nhiều dòng tên dài có dấu",
      "uiState": "form"
     },
     {
      "name": "TC-RET-028__s02__detail",
      "caption": "Chi tiết đơn nhiều dòng hiển thị đúng",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#251"
    ]
   },
   {
    "id": "TC-RET-029",
    "title": "Data-consistency: doanh thu dashboard khớp tổng đơn đã bán trong ngày",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản lý nhà thuốc",
    "preconditions": "Biết các đơn completed/cancelled trong ngày",
    "steps": [
     "Bán một số đơn tiền mặt trong ngày, ghi nhớ tổng finalAmount",
     "Hủy 1 đơn trong số đó",
     "Mở Dashboard nhà thuốc (todayRevenue, todaySaleCount)",
     "Đối chiếu với getPharmacyRevenue cùng khoảng ngày"
    ],
    "expected": "todayRevenue = tổng finalAmount các đơn completed (loại trừ đơn đã hủy); todaySaleCount đếm đúng; revenue API netRevenue = totalAmount - totalDiscount nhất quán; KPI list và dashboard cùng con số",
    "evidence": [
     {
      "name": "TC-RET-029__s01__detail",
      "caption": "Dashboard doanh thu hôm nay",
      "uiState": "detail"
     },
     {
      "name": "TC-RET-029__s02__list",
      "caption": "Tổng đơn đã bán khớp dashboard",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#253"
    ]
   },
   {
    "id": "TC-RET-030",
    "title": "Audit log ghi nhận mọi mutation đơn bán/điểm/ca/hoa hồng",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Admin/Kiểm soát",
    "preconditions": "Quyền xem audit log; thực hiện được các thao tác mutation",
    "steps": [
     "Tạo 1 đơn bán, hủy 1 đơn",
     "Tích/đổi điểm 1 khách",
     "Mở và đóng 1 ca",
     "Chi trả hoa hồng",
     "Kiểm audit log cho từng hành động"
    ],
    "expected": "Mỗi mutation (createRetailSale, cancelRetailSale, addPoints/redeemPoints, openShift/closeShift, payCommissions) sinh bản ghi audit gồm người thực hiện, thời gian, đối tượng, giá trị trước/sau; không thiếu hành động nào",
    "evidence": [
     {
      "name": "TC-RET-030__s01__detail",
      "caption": "Audit log liệt kê các mutation nhà thuốc",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#216",
     "#253"
    ]
   }
  ],
  "ui_state_checklist": [
   "list (danh sách đơn bán lẻ + tab trạng thái)",
   "loading (skeleton/spinner khi tải danh sách)",
   "empty (không có đơn/không kết quả tìm kiếm)",
   "error (API lỗi, 403/404, lỗi nghiệp vụ)",
   "form (tạo đơn POS, thêm/sửa khách, ghi GPP, tạo hoa hồng)",
   "modal (mở ca/đóng ca, tích/đổi điểm, ExpiryAlert)",
   "drawer (chi tiết đơn bán + danh sách items)",
   "detail (chi tiết đơn/khách/ca/đối soát/dashboard/audit)",
   "tab (StatusTabs Chờ/Đã bán/Hủy, tab khách/ca/GPP/hoa hồng)",
   "filter (lọc trạng thái/khoảng ngày)",
   "dropdown (gợi ý tìm thuốc, chọn khách)",
   "validation (SL/chiết khấu/điểm/tỷ lệ hoa hồng/SĐT/họ tên/nhiệt-ẩm)",
   "confirm (xác nhận hủy đơn, chi trả hoa hồng)",
   "success (toast tạo đơn/mở ca/lưu khách/lưu GPP)",
   "toast (thông báo thành công/lỗi)",
   "permission (ẩn menu/nút, chặn theo role)"
  ],
  "gaps": [
   "Chưa rõ quy tắc tích điểm cụ thể (bao nhiêu tiền = 1 điểm) — cần xác nhận để test data-consistency điểm chính xác (TC-RET-003/014).",
   "Backend có thể là stub/in-memory cho một số nhánh (commissions/gpp) — cần verify persistence thật trước khi khẳng định data-consistency.",
   "Chưa thấy cơ chế trừ tồn kho theo lô (FEFO) khi bán ở mã FE — cần kiểm BE có trừ đúng lô cận hạn trước và hoàn tồn khi hủy (TC-RET-008/022).",
   "Liên kết presc→retail (bán theo đơn kê đã duyệt) chưa có endpoint rõ ở FE — cần kiểm có luồng bán theo toa BHYT/đơn QG hay chỉ bán tự do.",
   "Patient-safety: chưa rõ có kiểm dị ứng/tương tác thuốc khi bán lẻ không (form POS hiện không thấy) — gap an toàn cần bổ sung case.",
   "In hóa đơn/biên lai bán lẻ và xuất hóa đơn điện tử chưa được mô tả ở API — cần xác nhận có chức năng in/e-invoice để test integration.",
   "Báo cáo doanh thu theo ca/người bán và đối soát hoa hồng theo kỳ chưa có test sâu — có thể bổ sung khi xác nhận màn báo cáo.",
   "Quy tắc range nhiệt độ/độ ẩm GPP chuẩn (2-8°C tủ lạnh, ≤30°C/≤75% kho thường) chưa hard-code rõ — cần chuẩn để validate (TC-RET-018).",
   "Phân quyền chi tiết theo từng nút (mở ca vs bán vs chi hoa hồng) cần đối chiếu matrix #216 để tách permission case mịn hơn.",
   "Chưa có test concurrency: 2 thu ngân cùng bán 1 lô thuốc gần hết tồn (race condition trừ tồn) — nên bổ sung khi BE hỗ trợ."
  ]
 },
 {
  "id": "asset",
  "code": "AST",
  "layer": "oper",
  "ic": "🛠️",
  "nm": "Trang thiết bị & Tài sản",
  "gh": [
   "#262",
   "#261"
  ],
  "gap": false,
  "module_id": "asset",
  "summary": "Phân hệ \"Trang thiết bị & Tài sản\" (id=asset, code=AST, lớp B–Vận hành) quản lý hai mảng: (1) Thiết bị y tế (MedicalEquipments + MaintenanceRecords/CalibrationRecords/RepairRequests, risk class I/II/III, bảo hành, bảo trì/hiệu chuẩn định kỳ) hiển thị ở màn /v2/equipment; (2) Tài sản cố định (FixedAssets + AssetHandovers/AssetDisposals/AssetDepreciations + AssetStocktakes/AssetStocktakeItems + Tenders/TenderItems) ở màn /v2/asset-management với 2 tab nội bộ \"Danh sách tài sản\" và \"Kiểm kê\", kèm drawer chi tiết, khấu hao, QR/barcode, vòng đời trạng thái TSCĐ (Đang dùng/Hỏng/Sửa chữa/Chờ thanh lý/Đã thanh lý/Đã chuyển) và phiếu kiểm kê (Nháp→Đang kiểm→Đã kiểm→Đã duyệt). API qua /api/asset-management/* và /api/equipment; mọi mutation cần audit log. Còn nhiều bảng có DTO nhưng CHƯA có UI v2 (Handover/Disposal/Tender/Calibration/RepairRequest/Linen/Sterilization).",
  "screens": [
   {
    "name": "Trang thiết bị y tế (Equipment v2)",
    "desc": "Danh sách thiết bị y tế dùng SimpleV2Page: KPI strip (Tổng TB/Hoạt động/Bảo trì/Hỏng/Quá hạn BT/Hết BH), search, filter Risk class, status tabs (Hoạt động/Bảo trì/Hỏng/Thanh lý), bảng có cột mã/tên-hãng/loại/serial/risk/khoa-phòng/bảo trì kế tiếp/bảo hành/trạng thái. Hành động: Chi tiết (drawer), Lên lịch bảo trì (modal).",
    "route_guess": "/v2/equipment",
    "elements": [
     "KpiStrip 6 ô",
     "SearchBox",
     "Filter Risk class (I/II/III)",
     "StatusTabs",
     "DataTable",
     "ActBtn eye (drawer chi tiết)",
     "ActBtn check (modal lên lịch bảo trì)",
     "ModalShell lên lịch bảo trì (loại BT/ngày dự kiến/mô tả/ghi chú)",
     "DrawerShell chi tiết (Thiết bị/Vị trí/Mua sắm/Bảo hành-Bảo trì/Chứng nhận FDA-CE)"
    ]
   },
   {
    "name": "Tài sản – Danh sách TSCĐ (AssetManagement v2, tab assets)",
    "desc": "Tab 'Danh sách tài sản' của màn Quản lý tài sản: KPI (Tổng TS/Đang dùng/Hỏng-Sửa/Tổng giá trị còn), search mã-tên-serial, filter Khoa, status tabs (Đang dùng/Hỏng/Sửa chữa/Chờ thanh lý/Đã thanh lý), bảng + phân trang 18/trang. Nút Khấu hao (drawer báo cáo), Thêm TS (CrudModal). Hành động dòng: Chi tiết/Sửa/QR.",
    "route_guess": "/v2/asset-management",
    "elements": [
     "KpiStrip 4 ô",
     "Tabs nội bộ assets/stocktake",
     "SearchBox",
     "Filter Khoa",
     "Btn Bỏ lọc",
     "StatusTabs 5 trạng thái",
     "DataTable",
     "Pager 18/trang",
     "ActBtn eye/edit/qr",
     "Btn Khấu hao",
     "Btn Thêm TS"
    ]
   },
   {
    "name": "Tài sản – Form thêm/sửa TSCĐ (CrudModal)",
    "desc": "Modal thêm/cập nhật tài sản cố định: mã TS (bắt buộc, khóa khi sửa), tên (bắt buộc), serial, ngày mua (bắt buộc), nguyên giá (bắt buộc, number), giá trị còn lại, thời gian khấu hao (tháng), phương pháp khấu hao (Đường thẳng/Số dư giảm dần), vị trí, trạng thái, ghi chú.",
    "route_guess": "/v2/asset-management (CrudModal)",
    "elements": [
     "Field assetCode (required, disabledOnEdit)",
     "Field assetName (required)",
     "Field serialNumber",
     "Field purchaseDate (date, required)",
     "Field originalValue (number, required)",
     "Field currentValue",
     "Field usefulLifeMonths",
     "Select depreciationMethod",
     "Field locationDescription",
     "Select status (6 giá trị)",
     "Textarea notes",
     "nút Lưu/Hủy"
    ]
   },
   {
    "name": "Tài sản – Drawer chi tiết TSCĐ",
    "desc": "Drawer chi tiết tài sản: Định danh (mã/tên/serial/khoa/vị trí/trạng thái), Tài chính (nguyên giá/hao mòn lũy kế/giá trị còn lại/hao mòn tháng), Khấu hao (ngày mua/thời gian KH/phương pháp/gói thầu/ghi chú). Footer: Đóng/Mã QR/Chỉnh sửa.",
    "route_guess": "/v2/asset-management (DrawerShell)",
    "elements": [
     "DrSec Định danh",
     "DrSec Tài chính (Line nguyên giá/hao mòn/còn lại)",
     "DrSec Khấu hao",
     "Btn Mã QR",
     "Btn Chỉnh sửa"
    ]
   },
   {
    "name": "Tài sản – Modal QR/Barcode",
    "desc": "Modal hiển thị mã QR tài sản: mã TS, tên, khoa, serial, nội dung QR (code block qrContent).",
    "route_guess": "/v2/asset-management (ModalShell QR)",
    "elements": [
     "DrField mã TS",
     "DrField tên",
     "DrField khoa",
     "DrField serial",
     "code qrContent",
     "Btn Đóng"
    ]
   },
   {
    "name": "Tài sản – Tab Kiểm kê (danh sách phiếu)",
    "desc": "Tab 'Kiểm kê': bảng phiếu kiểm kê (mã phiếu/tiêu đề/ngày KK/khoa/số TS/có mặt/thiếu/trạng thái Nháp-Đang kiểm-Đã kiểm-Đã duyệt). Nút Tạo phiếu kiểm kê. Hành động: Chi tiết, Hoàn thành kiểm kê (khi status=1), Duyệt phiếu (khi status=3).",
    "route_guess": "/v2/asset-management (tab stocktake)",
    "elements": [
     "DataTable phiếu KK",
     "ActBtn eye",
     "ActBtn check Hoàn thành (status=1)",
     "ActBtn check Duyệt (status=3)",
     "Btn Tạo phiếu kiểm kê",
     "StatusBadge 4 trạng thái"
    ]
   },
   {
    "name": "Tài sản – Modal tạo phiếu kiểm kê",
    "desc": "Modal tạo phiếu kiểm kê: tiêu đề (bắt buộc), ngày kiểm kê (bắt buộc, DatePicker), ghi chú. Hệ thống tự nạp toàn bộ TSCĐ vào phiếu.",
    "route_guess": "/v2/asset-management (ModalShell tạo KK)",
    "elements": [
     "Form.Item title (required)",
     "DatePicker stocktakeDate (required)",
     "TextArea notes",
     "Btn Tạo phiếu/Hủy",
     "ghi chú auto-nạp TS"
    ]
   },
   {
    "name": "Tài sản – Drawer chi tiết phiếu kiểm kê + inline edit item",
    "desc": "Drawer chi tiết phiếu KK: thông tin phiếu + bảng item (mã/tên/serial/vị trí/có mặt/tình trạng/ghi chú). Khi status<4 click dòng để inline edit (checkbox có mặt + select Tốt/Xuống cấp/Hỏng + input ghi chú), Lưu cập nhật foundCount/missingCount. Nút In phiếu.",
    "route_guess": "/v2/asset-management (DrawerShell KK detail)",
    "elements": [
     "DrSec thông tin phiếu",
     "bảng items",
     "inline edit Checkbox isFound",
     "Select conditionStatus (1/2/3)",
     "Input remark",
     "Btn Lưu/Hủy item",
     "Btn In phiếu"
    ]
   },
   {
    "name": "Tài sản – Drawer báo cáo khấu hao",
    "desc": "Drawer báo cáo khấu hao tháng hiện tại: bảng mã TS/tên/khoa/đầu kỳ/khấu hao/cuối kỳ + dòng tổng cộng. Có loading + empty state.",
    "route_guess": "/v2/asset-management (DrawerShell khấu hao)",
    "elements": [
     "bảng khấu hao",
     "tfoot tổng cộng",
     "trạng thái loading",
     "empty state 'Không có dữ liệu khấu hao'"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-AST-001",
    "title": "Tạo mới tài sản cố định thành công (happy path)",
    "category": "happy",
    "priority": "P0",
    "role": "Quản lý tài sản (admin)",
    "preconditions": "Đã đăng nhập admin/Admin@123, ở /v2/asset-management tab 'Danh sách tài sản'.",
    "steps": [
     "Bấm nút 'Thêm TS' để mở CrudModal",
     "Nhập Mã tài sản = 'TS-TEST-001', Tên = 'Máy siêu âm GE', Số serial = 'SN-001'",
     "Chọn Ngày mua = ngày hôm nay, Nguyên giá = 500000000, Thời gian khấu hao = 60 tháng, Phương pháp = Đường thẳng",
     "Chọn Trạng thái = Đang dùng, nhập Vị trí = 'Khoa CĐHA P.201'",
     "Bấm Lưu"
    ],
    "expected": "Toast 'Đã thêm tài sản'; danh sách reload và xuất hiện dòng TS-TEST-001 với badge 'Đang dùng' (tone ok); KPI 'Tổng TS' tăng 1; audit log ghi hành động tạo TSCĐ với CreatedBy là user thật.",
    "evidence": [
     {
      "name": "TC-AST-001__s01__form",
      "caption": "Form thêm TSCĐ đã điền đủ trường bắt buộc",
      "uiState": "form"
     },
     {
      "name": "TC-AST-001__s02__success",
      "caption": "Toast thành công + dòng mới trong danh sách",
      "uiState": "success"
     },
     {
      "name": "TC-AST-001__s03__list",
      "caption": "Danh sách có TS-TEST-001, KPI Tổng TS tăng",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ],
    "notes": "Mã code module=AST. Kiểm soi CreatedBy ≠ Guid.Empty."
   },
   {
    "id": "TC-AST-002",
    "title": "Validation các trường bắt buộc khi thêm TSCĐ",
    "category": "validation",
    "priority": "P0",
    "role": "Quản lý tài sản",
    "preconditions": "Mở CrudModal Thêm TS, để trống.",
    "steps": [
     "Bấm Lưu khi chưa nhập gì",
     "Quan sát thông báo lỗi từng trường bắt buộc (Mã TS, Tên, Ngày mua, Nguyên giá)",
     "Nhập lần lượt từng trường rồi Lưu để xác nhận lỗi mất dần"
    ],
    "expected": "Modal KHÔNG đóng, không gọi API tạo; mỗi trường required (assetCode/assetName/purchaseDate/originalValue) hiện thông báo lỗi rõ ràng tiếng Việt ngay dưới field; khi điền đủ thì lỗi biến mất.",
    "evidence": [
     {
      "name": "TC-AST-002__s01__validation",
      "caption": "Lỗi required hiển thị ở 4 trường bắt buộc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-003",
    "title": "Mã tài sản bị khóa (disabledOnEdit) khi chỉnh sửa TSCĐ",
    "category": "edge",
    "priority": "P1",
    "role": "Quản lý tài sản",
    "preconditions": "Có ít nhất 1 TSCĐ. Mở Chi tiết → Chỉnh sửa hoặc ActBtn edit.",
    "steps": [
     "Mở CrudModal ở chế độ sửa một TSCĐ",
     "Thử thay đổi trường Mã tài sản"
    ],
    "expected": "Trường Mã tài sản ở trạng thái disabled, không sửa được; tiêu đề modal = 'Cập nhật tài sản'; các trường khác editable.",
    "evidence": [
     {
      "name": "TC-AST-003__s01__form",
      "caption": "Form sửa: trường Mã TS bị disable",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-004",
    "title": "Cập nhật TSCĐ – đổi trạng thái & giá trị còn lại (happy)",
    "category": "happy",
    "priority": "P1",
    "role": "Quản lý tài sản",
    "preconditions": "Có TS-TEST-001 trạng thái Đang dùng.",
    "steps": [
     "Mở Chỉnh sửa TS-TEST-001",
     "Đổi Trạng thái = Hỏng, Giá trị còn lại = 300000000, nhập Ghi chú",
     "Bấm Lưu"
    ],
    "expected": "Toast 'Đã cập nhật tài sản'; badge dòng đổi sang 'Hỏng' (tone crit); KPI 'Hỏng / Sửa' tăng; giá trị còn lại hiển thị màu cảnh báo nếu <50% nguyên giá; audit log ghi update.",
    "evidence": [
     {
      "name": "TC-AST-004__s01__form",
      "caption": "Form sửa đổi trạng thái sang Hỏng",
      "uiState": "form"
     },
     {
      "name": "TC-AST-004__s02__list",
      "caption": "Dòng đổi badge Hỏng + KPI cập nhật",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-005",
    "title": "Boundary nguyên giá: 0, số âm, số rất lớn",
    "category": "edge",
    "priority": "P1",
    "role": "Quản lý tài sản",
    "preconditions": "Mở form Thêm TS.",
    "steps": [
     "Nhập Nguyên giá = 0 → Lưu, quan sát xử lý",
     "Nhập Nguyên giá = -1000 → Lưu, quan sát",
     "Nhập Nguyên giá = 999999999999 (12 chữ số) → Lưu, quan sát format hiển thị"
    ],
    "expected": "Giá trị âm bị chặn hoặc báo lỗi (không cho nguyên giá < 0); 0 cần được cảnh báo/chặn hợp lý; số rất lớn hiển thị đúng định dạng vi-VN (dấu chấm phân nhóm) ở cột Nguyên giá, không tràn layout/không NaN.",
    "evidence": [
     {
      "name": "TC-AST-005__s01__validation",
      "caption": "Nguyên giá âm bị chặn/báo lỗi",
      "uiState": "validation"
     },
     {
      "name": "TC-AST-005__s02__list",
      "caption": "Số rất lớn format đúng vi-VN trong bảng",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": "Phát hiện form không có rule min cho number → tạo task fix nếu cho lưu âm."
   },
   {
    "id": "TC-AST-006",
    "title": "Tìm kiếm theo mã/tên/serial + dấu tiếng Việt",
    "category": "ui",
    "priority": "P1",
    "role": "Quản lý tài sản",
    "preconditions": "Có TSCĐ tên có dấu (vd 'Máy thở Dräger').",
    "steps": [
     "Gõ từ khóa có dấu 'Máy thở' vào SearchBox",
     "Gõ từ khóa không dấu 'may tho' so sánh kết quả",
     "Gõ serial chính xác"
    ],
    "expected": "Lọc client-side khớp mã/tên/serial/khoa, không phân biệt hoa-thường; xác định rõ có hỗ trợ tìm không dấu hay không (ghi nhận hành vi thực); kết quả + Pager cập nhật, reset về trang 0.",
    "evidence": [
     {
      "name": "TC-AST-006__s01__filter",
      "caption": "Kết quả lọc theo từ khóa có dấu",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": "Nếu không match không dấu → ghi nhận gap UX (không tạo bug bắt buộc)."
   },
   {
    "id": "TC-AST-007",
    "title": "Lọc theo Khoa + Status tab + Bỏ lọc",
    "category": "ui",
    "priority": "P2",
    "role": "Quản lý tài sản",
    "preconditions": "Có TSCĐ ở nhiều khoa và nhiều trạng thái.",
    "steps": [
     "Chọn Filter Khoa = một khoa cụ thể",
     "Chọn Status tab = 'Hỏng'",
     "Bấm 'Bỏ lọc'"
    ],
    "expected": "Bảng giao của 2 điều kiện (đúng khoa AND đúng trạng thái); 'Bỏ lọc' reset search+khoa+tab về all; counts ở status tabs khớp số dòng thực tế.",
    "evidence": [
     {
      "name": "TC-AST-007__s01__filter",
      "caption": "Đang lọc khoa + tab Hỏng",
      "uiState": "filter"
     },
     {
      "name": "TC-AST-007__s02__list",
      "caption": "Sau Bỏ lọc hiển thị toàn bộ",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-008",
    "title": "Empty / Loading state danh sách TSCĐ",
    "category": "ui",
    "priority": "P2",
    "role": "Quản lý tài sản",
    "preconditions": "Tài khoản/khoa chưa có TSCĐ hoặc lọc ra rỗng; mạng chậm để bắt loading.",
    "steps": [
     "Mở /v2/asset-management lần đầu (quan sát 'Đang tải…')",
     "Lọc một điều kiện không có kết quả",
     "Quan sát DataTable"
    ],
    "expected": "Khi load: empty hiển thị 'Đang tải…'; khi không có dữ liệu: 'Chưa có tài sản'; KPI hiển thị 0 không vỡ; không có lỗi console.",
    "evidence": [
     {
      "name": "TC-AST-008__s01__loading",
      "caption": "Trạng thái Đang tải",
      "uiState": "loading"
     },
     {
      "name": "TC-AST-008__s02__empty",
      "caption": "Trạng thái Chưa có tài sản",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-009",
    "title": "Dark/Light parity màn Quản lý tài sản",
    "category": "ui",
    "priority": "P2",
    "role": "Quản lý tài sản",
    "preconditions": "Có dữ liệu TSCĐ; topbar v2 có toggle theme.",
    "steps": [
     "Mở màn ở light mode, mở drawer chi tiết + CrudModal",
     "Toggle sang dark mode, lặp lại quan sát badge/KPI/bảng/code QR"
    ],
    "expected": "Hai chế độ đều đủ tương phản: StatusBadge, KPI tone, màu cảnh báo giá trị còn lại, code block QR, drawer Tài chính đều đọc được; không có chữ trắng trên nền trắng / mất viền.",
    "evidence": [
     {
      "name": "TC-AST-009__s01__detail",
      "caption": "Drawer chi tiết ở light mode",
      "uiState": "detail"
     },
     {
      "name": "TC-AST-009__s02__detail",
      "caption": "Drawer chi tiết ở dark mode (parity)",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-010",
    "title": "Xem chi tiết TSCĐ – khối Tài chính tính đúng",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Quản lý tài sản",
    "preconditions": "TSCĐ có nguyên giá, thời gian KH, hao mòn lũy kế.",
    "steps": [
     "Mở drawer Chi tiết một TSCĐ",
     "Đối chiếu: Giá trị còn lại = Nguyên giá − Hao mòn lũy kế",
     "Đối chiếu Hao mòn/tháng với phương pháp Đường thẳng = Nguyên giá / usefulLifeMonths"
    ],
    "expected": "Các số trong khối Tài chính nhất quán: còn lại = nguyên giá − hao mòn lũy kế; hao mòn/tháng khớp công thức đường thẳng; định dạng tiền vi-VN có đơn vị 'đ'; số liệu drawer khớp số ở cột bảng.",
    "evidence": [
     {
      "name": "TC-AST-010__s01__detail",
      "caption": "Khối Tài chính: nguyên giá/hao mòn/còn lại/hao mòn tháng",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ],
    "notes": "Patient-safety không liên quan nhưng tài chính phải đúng để khớp khấu hao."
   },
   {
    "id": "TC-AST-011",
    "title": "Báo cáo khấu hao tháng – khớp số liệu TSCĐ",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản lý tài sản / Kế toán",
    "preconditions": "Có TSCĐ đang khấu hao trong tháng hiện tại.",
    "steps": [
     "Bấm nút 'Khấu hao' để mở drawer báo cáo",
     "Đối chiếu Cuối kỳ = Đầu kỳ − Khấu hao của từng dòng",
     "Đối chiếu dòng Tổng cộng = tổng các cột",
     "Đối chiếu Khấu hao của 1 TS với hao mòn/tháng ở drawer chi tiết TS đó"
    ],
    "expected": "Mỗi dòng closing = opening − depreciation; tfoot tổng cộng = tổng từng cột; số khấu hao khớp monthlyDepreciation của tài sản; tiền format vi-VN; tài sản giá trị thấp (<20% đầu kỳ) hiển thị màu cảnh báo.",
    "evidence": [
     {
      "name": "TC-AST-011__s01__drawer",
      "caption": "Báo cáo khấu hao có tổng cộng",
      "uiState": "drawer"
     },
     {
      "name": "TC-AST-011__s02__loading",
      "caption": "Trạng thái đang tải báo cáo",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-012",
    "title": "Báo cáo khấu hao – empty state tháng không có dữ liệu",
    "category": "ui",
    "priority": "P2",
    "role": "Kế toán",
    "preconditions": "Tháng hiện tại chưa có dữ liệu khấu hao tính sẵn.",
    "steps": [
     "Bấm 'Khấu hao' mở drawer",
     "Quan sát khi deprItems rỗng"
    ],
    "expected": "Hiển thị 'Không có dữ liệu khấu hao tháng này' căn giữa; không hiển thị bảng/tfoot rỗng; nếu API lỗi thì toast 'Không tải được báo cáo khấu hao' và drawer đóng lại.",
    "evidence": [
     {
      "name": "TC-AST-012__s01__empty",
      "caption": "Empty state báo cáo khấu hao",
      "uiState": "empty"
     },
     {
      "name": "TC-AST-012__s02__error",
      "caption": "Toast lỗi khi API khấu hao fail",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-013",
    "title": "Xem mã QR/Barcode tài sản (happy + lỗi)",
    "category": "happy",
    "priority": "P1",
    "role": "Quản lý tài sản",
    "preconditions": "Có TSCĐ.",
    "steps": [
     "Bấm ActBtn 'QR/Barcode' trên một dòng (hoặc nút Mã QR trong drawer)",
     "Quan sát modal QR: mã TS/tên/khoa/serial/qrContent",
     "Mô phỏng API qrcode lỗi và quan sát"
    ],
    "expected": "Modal QR hiển thị đúng mã TS/tên/serial và nội dung QR trong code block; khi API lỗi → toast 'Không lấy được mã QR', không mở modal; nội dung QR không bị tràn (word-break).",
    "evidence": [
     {
      "name": "TC-AST-013__s01__modal",
      "caption": "Modal QR với qrContent",
      "uiState": "modal"
     },
     {
      "name": "TC-AST-013__s02__error",
      "caption": "Toast lỗi khi lấy QR thất bại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-014",
    "title": "Tạo phiếu kiểm kê – tự nạp toàn bộ TSCĐ (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Quản lý tài sản",
    "preconditions": "Tab 'Kiểm kê', có TSCĐ trong hệ thống.",
    "steps": [
     "Bấm 'Tạo phiếu kiểm kê'",
     "Nhập Tiêu đề = 'Kiểm kê quý 2/2026', chọn Ngày kiểm kê",
     "Bấm 'Tạo phiếu'"
    ],
    "expected": "Toast 'Đã tạo phiếu <mã> — N tài sản được tự động nạp'; phiếu mới xuất hiện đầu danh sách với status 'Nháp'; totalItems = số TSCĐ hiện có; foundCount/missingCount khởi tạo hợp lý; audit log ghi tạo phiếu.",
    "evidence": [
     {
      "name": "TC-AST-014__s01__modal",
      "caption": "Modal tạo phiếu kiểm kê đã điền",
      "uiState": "modal"
     },
     {
      "name": "TC-AST-014__s02__success",
      "caption": "Toast + phiếu Nháp đầu danh sách",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-015",
    "title": "Validation tạo phiếu kiểm kê (thiếu tiêu đề/ngày)",
    "category": "validation",
    "priority": "P1",
    "role": "Quản lý tài sản",
    "preconditions": "Mở modal Tạo phiếu kiểm kê.",
    "steps": [
     "Bỏ trống Tiêu đề và Ngày kiểm kê → bấm 'Tạo phiếu'",
     "Quan sát lỗi required và toast"
    ],
    "expected": "validateFields chặn submit; hiện lỗi required ở Tiêu đề + Ngày kiểm kê; nếu vẫn lỗi → toast 'Tạo phiếu kiểm kê thất bại'; không tạo phiếu trống.",
    "evidence": [
     {
      "name": "TC-AST-015__s01__validation",
      "caption": "Lỗi required tiêu đề + ngày KK",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-016",
    "title": "Inline edit item kiểm kê – cập nhật có mặt/tình trạng (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Quản lý tài sản",
    "preconditions": "Phiếu KK status < 4 (Nháp/Đang kiểm/Đã kiểm), mở drawer chi tiết.",
    "steps": [
     "Click một dòng item để vào inline edit",
     "Bỏ tick 'Có mặt' (đánh dấu Thiếu), đổi Tình trạng = 'Hỏng', nhập Ghi chú",
     "Bấm 'Lưu'"
    ],
    "expected": "Toast 'Đã cập nhật'; dòng thoát edit, hiển thị 'Thiếu' (đỏ) + 'Hỏng'; foundCount giảm và missingCount tăng tương ứng trên header phiếu; thay đổi đồng bộ local state.",
    "evidence": [
     {
      "name": "TC-AST-016__s01__drawer",
      "caption": "Dòng item ở chế độ inline edit",
      "uiState": "drawer"
     },
     {
      "name": "TC-AST-016__s02__success",
      "caption": "Cập nhật xong: missingCount tăng",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-017",
    "title": "Hủy giữa chừng inline edit item kiểm kê",
    "category": "negative",
    "priority": "P2",
    "role": "Quản lý tài sản",
    "preconditions": "Đang inline edit một item.",
    "steps": [
     "Đổi vài giá trị trong dòng đang edit",
     "Bấm 'Hủy'"
    ],
    "expected": "Dòng thoát chế độ edit, KHÔNG gọi API cập nhật, giá trị giữ nguyên như trước; foundCount/missingCount không đổi.",
    "evidence": [
     {
      "name": "TC-AST-017__s01__drawer",
      "caption": "Sau Hủy: giá trị item không đổi",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-018",
    "title": "Khóa chỉnh sửa item khi phiếu đã duyệt (status=4)",
    "category": "state",
    "priority": "P0",
    "role": "Quản lý tài sản",
    "preconditions": "Phiếu KK đã ở trạng thái 'Đã duyệt' (status=4).",
    "steps": [
     "Mở drawer chi tiết phiếu đã duyệt",
     "Thử click vào một dòng item"
    ],
    "expected": "Bảng item KHÔNG hiển thị cột 'Sửa'; click dòng không vào chế độ edit; cursor không phải pointer; tiêu đề DrSec không có hậu tố 'click dòng để chỉnh sửa'. Đảm bảo dữ liệu kiểm kê đã chốt bất biến.",
    "evidence": [
     {
      "name": "TC-AST-018__s01__drawer",
      "caption": "Phiếu Đã duyệt: item read-only",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ],
    "notes": "Data-consistency: phiếu duyệt = chốt số liệu kiểm kê."
   },
   {
    "id": "TC-AST-019",
    "title": "Vòng đời phiếu kiểm kê: Nháp → Hoàn thành → Duyệt (state machine hợp lệ)",
    "category": "state",
    "priority": "P0",
    "role": "Quản lý tài sản",
    "preconditions": "Có phiếu KK status=1 (Nháp).",
    "steps": [
     "Trên dòng phiếu Nháp, bấm ActBtn 'Hoàn thành kiểm kê'",
     "Quan sát trạng thái chuyển sang 'Đã kiểm' (3)",
     "Bấm ActBtn 'Duyệt phiếu'",
     "Quan sát chuyển 'Đã duyệt' (4)"
    ],
    "expected": "Hoàn thành: toast 'Đã hoàn thành kiểm kê', badge chuyển 'Đã kiểm' (tone info), nút 'Hoàn thành' biến mất, hiện nút 'Duyệt'. Duyệt: toast 'Đã duyệt phiếu kiểm kê', badge 'Đã duyệt' (tone ok), không còn nút hành động chuyển trạng thái; audit log ghi 2 lần chuyển trạng thái.",
    "evidence": [
     {
      "name": "TC-AST-019__s01__list",
      "caption": "Phiếu Nháp với nút Hoàn thành",
      "uiState": "list"
     },
     {
      "name": "TC-AST-019__s02__success",
      "caption": "Đã kiểm + nút Duyệt",
      "uiState": "success"
     },
     {
      "name": "TC-AST-019__s03__success",
      "caption": "Đã duyệt, hết nút chuyển trạng thái",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-020",
    "title": "Chặn chuyển trạng thái phiếu kiểm kê không hợp lệ (skip/đảo)",
    "category": "state",
    "priority": "P1",
    "role": "Quản lý tài sản",
    "preconditions": "Phiếu KK status=1 (Nháp).",
    "steps": [
     "Xác nhận phiếu Nháp KHÔNG có nút 'Duyệt phiếu' (chỉ có 'Hoàn thành')",
     "Gọi trực tiếp API PUT /stocktakes/{id}/approve trên phiếu Nháp (qua devtools)",
     "Quan sát phản hồi backend"
    ],
    "expected": "UI không cho duyệt trực tiếp từ Nháp (nút duyệt chỉ hiện khi status=3). Backend phải từ chối approve khi status≠3 (lỗi 400/409 nghiệp vụ), không nhảy cóc Nháp→Đã duyệt.",
    "evidence": [
     {
      "name": "TC-AST-020__s01__list",
      "caption": "Phiếu Nháp không có nút Duyệt",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": "Nếu backend cho approve thẳng từ Nháp → tạo task bug state-machine."
   },
   {
    "id": "TC-AST-021",
    "title": "In phiếu kiểm kê (happy + lỗi popup/API)",
    "category": "happy",
    "priority": "P2",
    "role": "Quản lý tài sản",
    "preconditions": "Mở drawer chi tiết một phiếu KK.",
    "steps": [
     "Bấm 'In phiếu'",
     "Quan sát cửa sổ in HTML mở mới",
     "Chặn popup hoặc mô phỏng API print lỗi và quan sát"
    ],
    "expected": "Mở tab mới render HTML phiếu kiểm kê đúng nội dung; khi API lỗi → toast 'Không thể in phiếu kiểm kê'; khi popup bị chặn không crash app.",
    "evidence": [
     {
      "name": "TC-AST-021__s01__detail",
      "caption": "Cửa sổ in phiếu kiểm kê",
      "uiState": "detail"
     },
     {
      "name": "TC-AST-021__s02__error",
      "caption": "Toast lỗi khi in thất bại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-022",
    "title": "XSS ở field Ghi chú TSCĐ và Ghi chú item kiểm kê",
    "category": "security",
    "priority": "P1",
    "role": "Quản lý tài sản",
    "preconditions": "Có quyền tạo TSCĐ/sửa item kiểm kê.",
    "steps": [
     "Tạo/sửa TSCĐ với Ghi chú = '<img src=x onerror=alert(1)>' và '<script>alert(1)</script>'",
     "Mở drawer chi tiết TSCĐ xem render ghi chú",
     "Nhập payload tương tự vào Ghi chú (remark) một item kiểm kê và In phiếu (HTML)"
    ],
    "expected": "Payload hiển thị dạng text thuần (escaped), KHÔNG thực thi script; đặc biệt HTML in phiếu (window.document.write) phải escape ghi chú để không bị stored XSS qua trang in.",
    "evidence": [
     {
      "name": "TC-AST-022__s01__detail",
      "caption": "Ghi chú chứa payload hiển thị an toàn",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": "Trang in dùng document.write(html) từ server — rủi ro nếu server không escape; nếu thực thi → tạo bug security."
   },
   {
    "id": "TC-AST-023",
    "title": "IDOR: truy cập phiếu kiểm kê/TSCĐ khoa khác qua API",
    "category": "security",
    "priority": "P1",
    "role": "User khoa A (quyền giới hạn)",
    "preconditions": "Tồn tại phiếu KK/TSCĐ thuộc khoa B; có id của chúng.",
    "steps": [
     "Đăng nhập user khoa A",
     "Gọi GET /api/asset-management/stocktakes/{idKhoaB} và /assets/{idKhoaB} bằng id của khoa B",
     "Thử PUT items/{itemId} của phiếu khoa B"
    ],
    "expected": "Nếu hệ thống có phân quyền theo khoa: trả 403/404, không lộ dữ liệu khoa khác và không cho sửa item khoa khác. Ghi nhận hành vi thực tế (nếu cho phép xem/sửa chéo khoa mà không kiểm tra → bug IDOR).",
    "evidence": [
     {
      "name": "TC-AST-023__s01__permission",
      "caption": "Phản hồi 403/404 khi truy cập chéo khoa",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#262"
    ],
    "notes": "Tham chiếu matrix #216 (T-permission)."
   },
   {
    "id": "TC-AST-024",
    "title": "Phân quyền: vai trò không đủ quyền bị chặn menu/nút/API tài sản",
    "category": "permission",
    "priority": "P0",
    "role": "Vai trò không có quyền quản lý tài sản (vd Điều dưỡng)",
    "preconditions": "Có user role không thuộc nhóm quản lý tài sản (theo matrix #216).",
    "steps": [
     "Đăng nhập user role hạn chế",
     "Kiểm tra menu có hiện 'Quản lý tài sản'/'Trang thiết bị' không",
     "Truy cập thẳng /v2/asset-management qua URL",
     "Gọi trực tiếp POST /api/asset-management/assets"
    ],
    "expected": "Menu ẩn mục không có quyền; truy cập URL trực tiếp bị chặn/redirect; API mutation trả 401/403. Quyền xem-vs-sửa tách bạch theo matrix #216.",
    "evidence": [
     {
      "name": "TC-AST-024__s01__permission",
      "caption": "Menu ẩn / chặn truy cập màn tài sản",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#262"
    ],
    "notes": "Cần đối chiếu matrix #216 để biết role nào được phép."
   },
   {
    "id": "TC-AST-025",
    "title": "Lỗi tải dữ liệu danh sách TSCĐ (API fail) hiển thị graceful",
    "category": "negative",
    "priority": "P2",
    "role": "Quản lý tài sản",
    "preconditions": "Mô phỏng API /asset-management/assets hoặc /dashboard trả lỗi 500.",
    "steps": [
     "Chặn/giả lập lỗi API assets + dashboard",
     "Mở /v2/asset-management",
     "Quan sát toast và state bảng/KPI"
    ],
    "expected": "Toast info 'Không tải được tài sản'; bảng hiển thị 'Chưa có tài sản' (fallback rỗng), KPI fallback 0; app không crash, không lỗi console nghiêm trọng; cho phép bấm 'Làm mới' để thử lại.",
    "evidence": [
     {
      "name": "TC-AST-025__s01__error",
      "caption": "Toast lỗi tải + bảng rỗng fallback",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-026",
    "title": "[Equipment] Danh sách thiết bị y tế + KPI cảnh báo bảo trì/bảo hành (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Kỹ thuật thiết bị (admin)",
    "preconditions": "Đã đăng nhập, ở /v2/equipment, có dữ liệu thiết bị.",
    "steps": [
     "Mở /v2/equipment",
     "Quan sát KPI: Tổng TB / Hoạt động / Bảo trì / Hỏng / Quá hạn BT / Hết BH",
     "Đối chiếu số 'Quá hạn BT' với các dòng có nextMaintenanceDate < hôm nay (màu đỏ)",
     "Đối chiếu 'Hết BH' với cột Bảo hành chip 'Hết'"
    ],
    "expected": "KPI tính đúng: Quá hạn BT = số TB có ngày bảo trì kế tiếp đã qua; Hết BH = số TB warranty đã hết; cột 'Bảo trì kế tiếp' tô đỏ khi quá hạn, vàng khi <30 ngày; cột Bảo hành chip 'Hết'/vàng <90 ngày. Số KPI khớp dữ liệu bảng.",
    "evidence": [
     {
      "name": "TC-AST-026__s01__list",
      "caption": "Danh sách TB + KPI cảnh báo bảo trì/bảo hành",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-027",
    "title": "[Equipment] Lọc theo Risk class + status tab thiết bị",
    "category": "ui",
    "priority": "P1",
    "role": "Kỹ thuật thiết bị",
    "preconditions": "Có TB nhiều risk class (I/II/III) và nhiều trạng thái.",
    "steps": [
     "Chọn Filter 'Risk class' = Class III",
     "Chọn status tab = 'Hỏng'",
     "Quan sát chip risk màu (III=crit, II=warn, I=info)"
    ],
    "expected": "Bảng lọc giao đúng risk + trạng thái; chip risk class hiển thị đúng màu theo cấp; status tab counts khớp; thiết bị risk III được tô nổi bật (an toàn thiết bị).",
    "evidence": [
     {
      "name": "TC-AST-027__s01__filter",
      "caption": "Lọc Risk III + tab Hỏng",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-028",
    "title": "[Equipment] Drawer chi tiết thiết bị – đủ nhóm thông tin + chứng nhận",
    "category": "happy",
    "priority": "P1",
    "role": "Kỹ thuật thiết bị",
    "preconditions": "Có TB có đủ field (FDA/CE, bảo hành, hiệu chuẩn).",
    "steps": [
     "Bấm ActBtn 'Chi tiết' trên một TB",
     "Quan sát các DrSec: Thiết bị / Vị trí / Mua sắm / Bảo hành-Bảo trì / Chứng nhận",
     "Mở một TB không có FDA/CE để xem fallback"
    ],
    "expected": "Drawer hiển thị mã/tên/loại/hãng-model/serial/risk; vị trí khoa-phòng; mua sắm (ngày/giá vi-VN '₫'/NCC/PO/tuổi thọ); bảo hành-bảo trì với BT kế tiếp đỏ nếu quá hạn; chứng nhận chip FDA/CE hoặc 'Chưa có chứng nhận'. Giá format đúng vi-VN.",
    "evidence": [
     {
      "name": "TC-AST-028__s01__drawer",
      "caption": "Drawer chi tiết TB đủ 5 nhóm",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-029",
    "title": "[Equipment] Lên lịch bảo trì thiết bị (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Kỹ thuật thiết bị",
    "preconditions": "Có TB cần bảo trì.",
    "steps": [
     "Bấm ActBtn 'Lên lịch bảo trì' trên một TB",
     "Chọn Loại bảo trì = Hiệu chuẩn (Calibration), chọn Ngày bảo trì dự kiến tương lai, nhập Mô tả + Ghi chú",
     "Bấm 'Lưu lịch'"
    ],
    "expected": "Toast success 'Đã lên lịch bảo trì cho <tên TB>'; modal đóng; MaintenanceRecord được tạo (maintenanceType, scheduledDate, nextMaintenanceDate); audit log ghi. Loại Calibration tương ứng CalibrationRecords nghiệp vụ hiệu chuẩn.",
    "evidence": [
     {
      "name": "TC-AST-029__s01__modal",
      "caption": "Modal lên lịch bảo trì đã điền",
      "uiState": "modal"
     },
     {
      "name": "TC-AST-029__s02__success",
      "caption": "Toast lên lịch bảo trì thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-030",
    "title": "[Equipment] Validation lịch bảo trì: thiếu ngày + chặn ngày quá khứ",
    "category": "validation",
    "priority": "P1",
    "role": "Kỹ thuật thiết bị",
    "preconditions": "Mở modal Lên lịch bảo trì.",
    "steps": [
     "Bỏ trống 'Ngày bảo trì dự kiến' → bấm 'Lưu lịch'",
     "Mở DatePicker thử chọn ngày trong quá khứ (disabledDate)"
    ],
    "expected": "Thiếu ngày → lỗi required, không submit; ngày quá khứ bị disable không chọn được (disabledDate d.isBefore today); nếu lưu thất bại → toast warning 'Lên lịch bảo trì thất bại'.",
    "evidence": [
     {
      "name": "TC-AST-030__s01__validation",
      "caption": "Lỗi required ngày + ngày quá khứ bị disable",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-031",
    "title": "[Equipment] Empty/Loading/Error state danh sách thiết bị",
    "category": "ui",
    "priority": "P2",
    "role": "Kỹ thuật thiết bị",
    "preconditions": "Không có TB hoặc API /equipment lỗi.",
    "steps": [
     "Mở /v2/equipment khi chưa có TB",
     "Mô phỏng API trả lỗi và mở lại",
     "Quan sát SimpleV2Page states"
    ],
    "expected": "Loading hiển thị skeleton/đang tải; empty hiển thị thông báo chưa có thiết bị; KPI = 0 không vỡ; lỗi API hiển thị graceful, không crash console.",
    "evidence": [
     {
      "name": "TC-AST-031__s01__empty",
      "caption": "Empty state thiết bị",
      "uiState": "empty"
     },
     {
      "name": "TC-AST-031__s02__loading",
      "caption": "Loading state thiết bị",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": ""
   },
   {
    "id": "TC-AST-032",
    "title": "Data-consistency: TSCĐ tạo từ gói thầu hiển thị đúng gói thầu ở drawer",
    "category": "data-consistency",
    "priority": "P2",
    "role": "Quản lý tài sản",
    "preconditions": "Có gói thầu (Tender) đã trúng và TSCĐ gắn tenderId.",
    "steps": [
     "Mở drawer chi tiết một TSCĐ có tenderId",
     "Đối chiếu trường 'Gói thầu' (tenderName) trong DrSec Khấu hao"
    ],
    "expected": "Trường 'Gói thầu' hiển thị đúng tên gói thầu liên kết; nếu không thuộc gói thầu thì trường này ẩn. Liên kết FixedAssets→Tenders nhất quán giữa form và detail.",
    "evidence": [
     {
      "name": "TC-AST-032__s01__detail",
      "caption": "Drawer TSCĐ hiển thị tên gói thầu",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#262"
    ],
    "notes": "UI Tender/đấu thầu chưa có ở v2 — chỉ verify mối liên kết hiển thị."
   }
  ],
  "ui_state_checklist": [
   "list (danh sách TSCĐ / thiết bị / phiếu kiểm kê)",
   "loading (Đang tải… danh sách + báo cáo khấu hao)",
   "empty (Chưa có tài sản / Chưa có phiếu kiểm kê / Không có dữ liệu khấu hao)",
   "error (toast Không tải được / Không lấy QR / Không thể in / lỗi API)",
   "form (CrudModal thêm/sửa TSCĐ, mã TS disabled khi sửa)",
   "validation (required assetCode/assetName/purchaseDate/originalValue; tiêu đề+ngày phiếu KK; ngày bảo trì)",
   "detail (DrawerShell chi tiết TSCĐ – Định danh/Tài chính/Khấu hao; chi tiết phiếu KK; chứng nhận TB)",
   "drawer (báo cáo khấu hao; chi tiết phiếu kiểm kê; chi tiết thiết bị)",
   "modal (tạo phiếu kiểm kê; QR/Barcode; lên lịch bảo trì)",
   "filter (lọc Khoa/Status tab TSCĐ; Risk class/Status thiết bị; search có dấu)",
   "success (toast thêm/cập nhật/hoàn thành/duyệt/tạo phiếu/lên lịch + state cập nhật)",
   "confirm (chuyển trạng thái phiếu kiểm kê Hoàn thành/Duyệt)",
   "permission (chặn menu/URL/API theo role; IDOR chéo khoa)"
  ],
  "gaps": [
   "Form CrudModal TSCĐ không thấy rule min cho number (nguyên giá/giá trị còn lại/thời gian KH) → cần test cho phép giá trị âm/0 hay không; thiếu ràng buộc giá-trị-còn-lại ≤ nguyên giá.",
   "Không có validation chéo: giá trị còn lại > nguyên giá, hoặc ngày mua trong tương lai (purchaseDate không bị disabledDate) — cần case boundary ngày tương lai.",
   "Vòng đời TSCĐ (Đang dùng→Hỏng→Sửa chữa→Chờ thanh lý→Đã thanh lý→Đã chuyển) hiện chỉ đổi qua dropdown tự do, KHÔNG có state-machine ràng buộc chuyển hợp lệ; cần kiểm thử backend có chặn chuyển ngược (Đã thanh lý→Đang dùng) không.",
   "Các bảng có DTO/endpoint nhưng CHƯA có UI v2: AssetHandovers (bàn giao), AssetDisposals (thanh lý: propose→approve→complete), Tenders/TenderItems (đấu thầu: award), RepairRequests (yêu cầu sửa), CalibrationRecords (hiệu chuẩn riêng), Linen/LinenTransactions (đồ vải), SterilizationSchedules (tiệt khuẩn) → là gap chức năng FE, test chỉ phủ được tới API.",
   "Luồng thanh lý TSCĐ (proposeDisposal/approveDisposal/completeDisposal) và bàn giao (saveHandover/confirmHandover) có state nhưng không có màn UI — cần test API-level + kiểm tra khi thanh lý xong status TSCĐ có tự chuyển 'Đã thanh lý' không (data-consistency).",
   "Khấu hao: nút FE chỉ GỌI report (getDepreciationReport), không thấy nút chạy calculateDepreciation từ UI — cần xác minh ai/khi nào tính khấu hao tháng (background job?) để báo cáo có số liệu.",
   "Trang in (printStocktake / generateAssetReport) dùng window.document.write(serverHtml) → rủi ro XSS nếu server không escape ghi chú; cần kiểm thử security riêng cho HTML in.",
   "Phân quyền theo khoa cho TSCĐ/phiếu kiểm kê chưa rõ — cần đối chiếu matrix #216 để biết role nào xem-được-toàn-viện vs khoa; IDOR chéo khoa cần xác minh backend.",
   "Audit log: chưa có UI xem lịch sử (getAssetHistory tồn tại nhưng drawer chi tiết không render history) → cần verify audit ghi mọi mutation ở DB và cân nhắc gap hiển thị lịch sử tài sản.",
   "Responsive/mobile cho bảng nhiều cột (Equipment 9 cột) chưa được kiểm; cần test thu hẹp viewport.",
   "Đồng bộ 2 nguồn trạng thái 'Hỏng/Thanh lý' giữa Equipment (operationalStatus) và FixedAssets (status) — nếu một thiết bị y tế cũng là TSCĐ, cần kiểm nhất quán trạng thái giữa 2 màn."
  ]
 },
 {
  "id": "hr",
  "code": "HR",
  "layer": "oper",
  "ic": "👔",
  "nm": "Nhân sự & Lương",
  "gh": [
   "#262",
   "#261"
  ],
  "gap": false,
  "module_id": "hr",
  "summary": "Phân hệ Nhân sự & Lương (HR, lớp oper) quản lý vòng đời nhân viên y tế: hồ sơ NV (MedicalStaffs/Employee*), bằng cấp & CCHN (StaffQualifications/PracticeLicenses), lịch trực và ca trực (DutyRosters/DutyShifts/DutySchedules, status Draft→Submitted→Approved→Published) gồm xếp ca, đổi ca, copy tuần, chốt lịch; chấm công/tăng ca/nghỉ phép (AttendanceRecords/OvertimeRecords/LeaveRequests, status Pending→Approved/Rejected); kỳ lương & dòng lương (PayrollPeriods→PayrollItems, Draft→Approved); quyết định nhân sự (HrDecisions 7 loại, Draft→Active→Cancelled, có in QĐ); đào tạo liên tục CME, khen thưởng/kỷ luật. Các màn v2 thực có: /v2/hr (bảng trực tuần), /v2/employee-profile (9 tab hồ sơ), /v2/payroll, /v2/hr-decisions, /v2/practice-license.",
  "screens": [
   {
    "name": "Bảng lịch trực tuần (Roster)",
    "desc": "Lưới nhân sự × 7 ngày, click ô để cycle ca (Sáng/Chiều/Đêm/Nghỉ), KPI strip (nhân sự/ca đã xếp/ngày OT/yêu cầu đổi/ca thiếu/tuần), điều hướng tuần trước-sau, lọc theo khoa, tìm kiếm, badge Demo/Live, panel yêu cầu đổi ca chờ duyệt, footer Σ NS theo ca.",
    "route_guess": "/v2/hr",
    "elements": [
     "KpiStrip 6 ô",
     "Search nhân sự",
     "Select lọc khoa",
     "nút Tuần trước/Tuần sau",
     "badge Demo/Live",
     "nút Yêu cầu đổi ca",
     "nút Copy tuần trước",
     "nút Xuất Excel",
     "nút Chốt tuần",
     "bảng trực click cycle ca",
     "panel alert đổi ca (Duyệt/Từ chối)",
     "Drawer chi tiết NS",
     "Modal copy tuần",
     "Modal yêu cầu đổi ca"
    ]
   },
   {
    "name": "Hồ sơ nhân viên (9 tab)",
    "desc": "Chọn NV rồi xem 9 tab CRUD: Tài sản, Phụ cấp, Công tác, Đào tạo, Gia đình, KT/KL, Tài khoản NH, Hợp đồng, BHXH/BHYT, Đoàn thể.",
    "route_guess": "/v2/employee-profile",
    "elements": [
     "KpiStrip",
     "Filter chọn nhân viên",
     "TopTabs 10 tab",
     "DataTable mỗi tab",
     "ModalShell thêm/sửa",
     "empty state chưa chọn NV"
    ]
   },
   {
    "name": "Quản lý kỳ lương (Payroll)",
    "desc": "Danh sách kỳ lương (Draft/Approved), tạo kỳ, sinh dòng lương tự động, xem dòng lương từng NV (công, lương cơ bản, phụ cấp, khấu trừ BHXH, thực lĩnh), duyệt kỳ.",
    "route_guess": "/v2/payroll",
    "elements": [
     "KpiStrip",
     "StatusTabs Dự thảo/Đã duyệt",
     "DataTable kỳ lương",
     "nút Tạo kỳ",
     "nút Sinh dòng lương",
     "nút Duyệt",
     "Modal tạo kỳ",
     "bảng dòng lương",
     "Modal sửa dòng lương"
    ]
   },
   {
    "name": "Quyết định nhân sự (HR Decisions)",
    "desc": "Danh sách QĐ 7 loại (Bổ nhiệm/Điều động/Nâng lương/Khen thưởng/Kỷ luật/Thôi việc/Đi học), status Dự thảo→Hiệu lực→Hủy, lọc theo loại + khoảng ngày + tìm kiếm, in QĐ.",
    "route_guess": "/v2/hr-decisions",
    "elements": [
     "KpiStrip",
     "StatusTabs Dự thảo/Hiệu lực/Hủy",
     "SearchBox",
     "Filter loại QĐ",
     "RangePicker ngày hiệu lực",
     "DataTable",
     "Modal tạo/sửa QĐ",
     "nút In QĐ",
     "nút chuyển trạng thái"
    ]
   },
   {
    "name": "Chứng chỉ hành nghề (CCHN)",
    "desc": "Danh sách CCHN theo trạng thái (Hợp lệ/Sắp hết/Hết hạn/Thu hồi/Tạm dừng), lọc loại (BS/DS/ĐD/HS/KTV/Nha/YHCT), cảnh báo sắp hết hạn, drawer chi tiết, in CCHN, gia hạn.",
    "route_guess": "/v2/practice-license",
    "elements": [
     "KpiStrip",
     "StatusTabs 5 trạng thái",
     "SearchBox",
     "Filter loại CCHN",
     "DataTable + Pager",
     "DrawerShell chi tiết",
     "CrudModal thêm/sửa",
     "nút In CCHN",
     "cảnh báo expiring"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-HR-001",
    "title": "Xếp lịch trực tuần: click ô cycle ca Sáng→Chiều→Đêm→Nghỉ và đếm Ca/OT cập nhật đúng",
    "category": "happy",
    "priority": "P0",
    "role": "Trưởng khoa/Điều phối trực",
    "preconditions": "Đăng nhập admin/Admin@123, vào /v2/hr, bảng trực hiển thị (Demo hoặc Live)",
    "steps": [
     "Mở /v2/hr",
     "Chọn 1 nhân sự, click 1 ô ca đang 'Nghỉ'",
     "Click liên tiếp ô đó 3 lần quan sát nhãn đổi Sáng→Chiều→Đêm→Nghỉ",
     "Quan sát cột Ca (tổng/quota) và cột OT của hàng đó",
     "Quan sát footer Σ NS theo ca của cột ngày đó"
    ],
    "expected": "Mỗi click đổi ca theo đúng vòng Sáng→Chiều→Đêm→Nghỉ; cột Ca tăng/giảm đúng số ca khác 'Nghỉ'; OT = max(0, ca-quota) hiển thị +N màu cảnh báo khi vượt; footer Σ theo ca cập nhật realtime",
    "evidence": [
     {
      "name": "TC-HR-001__s01__list",
      "caption": "Bảng trực tuần trạng thái ban đầu",
      "uiState": "list"
     },
     {
      "name": "TC-HR-001__s02__detail",
      "caption": "Ô ca sau khi cycle sang Đêm",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ]
   },
   {
    "id": "TC-HR-002",
    "title": "Điều hướng Tuần trước/Tuần sau cập nhật nhãn tuần và dải ngày đầu-cuối tuần",
    "category": "happy",
    "priority": "P1",
    "role": "Điều phối trực",
    "preconditions": "Ở /v2/hr",
    "steps": [
     "Ghi nhận nhãn 'Tuần Txx/2026' và dải ngày trên KPI",
     "Bấm 'Tuần sau' 2 lần",
     "Bấm 'Tuần trước' 3 lần",
     "Quan sát header cột ngày (DD/MM) cập nhật theo"
    ],
    "expected": "Số tuần tăng/giảm đúng; dải ngày KPI và header cột ngày dịch chính xác theo tuần; không lỗi console",
    "evidence": [
     {
      "name": "TC-HR-002__s01__list",
      "caption": "KPI nhãn tuần và dải ngày sau điều hướng",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-003",
    "title": "Lọc theo khoa + tìm kiếm nhân sự thu hẹp đúng danh sách và cập nhật KPI/footer",
    "category": "happy",
    "priority": "P1",
    "role": "Điều phối trực",
    "preconditions": "Ở /v2/hr có >1 khoa",
    "steps": [
     "Chọn 1 khoa ở Select 'Lọc theo khoa'",
     "Quan sát bảng chỉ còn NS thuộc khoa đó + KPI 'Nhân sự'/'số khoa' cập nhật",
     "Gõ tên/mã NS vào ô tìm kiếm",
     "Xóa filter (allowClear) và xóa search"
    ],
    "expected": "Bảng + footer Σ + KPI chỉ tính trên NS hiển thị (visibleStaff); xóa filter trả lại đầy đủ; tìm theo tên/mã/vai trò không dấu vẫn khớp",
    "evidence": [
     {
      "name": "TC-HR-003__s01__filter",
      "caption": "Bảng sau khi lọc theo khoa",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-004",
    "title": "Mở Drawer chi tiết nhân sự khi click tên, xem lịch tuần + mini-stat Ca/Quota/OT",
    "category": "happy",
    "priority": "P1",
    "role": "Điều phối trực",
    "preconditions": "Ở /v2/hr",
    "steps": [
     "Click vào tên 1 nhân sự ở cột sticky",
     "Drawer phải mở phía phải hiển thị mã, vai trò, khoa",
     "Xem 3 mini-stat (Ca tuần này/Quota/OT) và 7 ô lịch trong tuần",
     "Bấm 'Hồ sơ NS'"
    ],
    "expected": "Drawer mở đúng NS đã click; mini-stat khớp số liệu hàng; nút 'Hồ sơ NS' điều hướng sang /v2/employee-profile; nút 'Sửa lịch' bị disable (opacity 0.6) với tooltip hướng dẫn click ô",
    "evidence": [
     {
      "name": "TC-HR-004__s01__drawer",
      "caption": "Drawer chi tiết nhân sự với lịch tuần",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-005",
    "title": "Gửi yêu cầu đổi ca thành công và xuất hiện ở panel chờ duyệt",
    "category": "happy",
    "priority": "P0",
    "role": "Nhân viên trực",
    "preconditions": "Ở /v2/hr",
    "steps": [
     "Bấm 'Yêu cầu đổi ca' mở modal",
     "Chọn Người trực, Người thay, Ngày, Ca, nhập Lý do",
     "Bấm 'Gửi yêu cầu'",
     "Quan sát panel 'Yêu cầu đổi ca chờ duyệt' và KPI 'Yêu cầu đổi'"
    ],
    "expected": "Toast 'Đã gửi yêu cầu đổi ca'; modal đóng + reset; xuất hiện 1 dòng mới trong panel chờ duyệt với from→to, ca, ngày, lý do; KPI pending +1",
    "evidence": [
     {
      "name": "TC-HR-005__s01__modal",
      "caption": "Modal yêu cầu đổi ca đã điền",
      "uiState": "modal"
     },
     {
      "name": "TC-HR-005__s02__success",
      "caption": "Panel chờ duyệt có yêu cầu mới",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ]
   },
   {
    "id": "TC-HR-006",
    "title": "Gửi yêu cầu đổi ca thiếu trường bắt buộc bị chặn với cảnh báo",
    "category": "validation",
    "priority": "P0",
    "role": "Nhân viên trực",
    "preconditions": "Modal 'Yêu cầu đổi ca' mở",
    "steps": [
     "Để trống Người trực/Người thay/Ngày/Lý do",
     "Bấm 'Gửi yêu cầu'",
     "Lần lượt điền thiếu 1 trường rồi thử lại"
    ],
    "expected": "Hiển thị cảnh báo 'Cần điền đủ thông tin đổi ca'; modal KHÔNG đóng; không tạo dòng mới ở panel cho tới khi đủ from+to+date+reason",
    "evidence": [
     {
      "name": "TC-HR-006__s01__validation",
      "caption": "Cảnh báo thiếu thông tin đổi ca",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-007",
    "title": "Duyệt yêu cầu đổi ca chuyển trạng thái pending→approved, gọi API approve",
    "category": "state",
    "priority": "P0",
    "role": "Trưởng khoa (người duyệt)",
    "preconditions": "Có ≥1 yêu cầu đổi ca pending ở panel",
    "steps": [
     "Bấm 'Duyệt' trên 1 dòng chờ duyệt",
     "Quan sát toast và dòng biến mất khỏi panel pending",
     "Kiểm tra Network gọi POST approve swap với approved=true"
    ],
    "expected": "Toast 'Đã duyệt yêu cầu đổi ca'; status dòng → approved nên rời panel pending; KPI 'Yêu cầu đổi' giảm; nếu API lỗi hiển thị 'Duyệt đổi ca thất bại' và không đổi state",
    "evidence": [
     {
      "name": "TC-HR-007__s01__confirm",
      "caption": "Trước khi duyệt yêu cầu",
      "uiState": "confirm"
     },
     {
      "name": "TC-HR-007__s02__success",
      "caption": "Sau khi duyệt, panel cập nhật",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#261"
    ]
   },
   {
    "id": "TC-HR-008",
    "title": "Từ chối yêu cầu đổi ca loại bỏ khỏi panel, gọi API với approved=false",
    "category": "state",
    "priority": "P1",
    "role": "Trưởng khoa",
    "preconditions": "Có yêu cầu đổi ca pending",
    "steps": [
     "Bấm 'Từ chối' trên 1 dòng",
     "Quan sát toast cảnh báo và dòng bị xóa khỏi panel",
     "Kiểm tra Network approved=false"
    ],
    "expected": "Toast 'Đã từ chối yêu cầu đổi ca'; dòng bị xóa khỏi panel; lỗi API hiển thị 'Từ chối đổi ca thất bại'",
    "evidence": [
     {
      "name": "TC-HR-008__s01__success",
      "caption": "Panel sau khi từ chối",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#261"
    ]
   },
   {
    "id": "TC-HR-009",
    "title": "Copy lịch tuần nguồn → tuần đích thành công (ghi đè) khi nguồn≠đích",
    "category": "happy",
    "priority": "P1",
    "role": "Điều phối trực",
    "preconditions": "Ở /v2/hr chế độ Live (có rosterId)",
    "steps": [
     "Bấm 'Copy tuần trước' mở modal (pre-fill nguồn=tuần trước, đích=tuần hiện tại)",
     "Kiểm tra 2 ô date hiển thị ngày T2 đầu tuần",
     "Bấm 'Sao chép'"
    ],
    "expected": "Toast 'Đã sao chép lịch từ tuần ... → ...'; modal đóng; gọi copyWeekRoster overwriteExisting=true; lỗi API hiển thị 'Sao chép lịch tuần thất bại'",
    "evidence": [
     {
      "name": "TC-HR-009__s01__modal",
      "caption": "Modal copy tuần với 2 ô ngày",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-010",
    "title": "Copy tuần chặn khi thiếu ngày hoặc nguồn trùng đích",
    "category": "validation",
    "priority": "P1",
    "role": "Điều phối trực",
    "preconditions": "Modal copy tuần mở",
    "steps": [
     "Xóa rỗng ô tuần nguồn rồi bấm 'Sao chép'",
     "Đặt tuần nguồn = tuần đích rồi bấm 'Sao chép'"
    ],
    "expected": "Thiếu ngày → cảnh báo 'Cần chọn tuần nguồn và tuần đích'; trùng nhau → cảnh báo 'Tuần nguồn và đích không được trùng nhau'; không gọi API, modal không đóng",
    "evidence": [
     {
      "name": "TC-HR-010__s01__validation",
      "caption": "Cảnh báo nguồn trùng đích",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-011",
    "title": "Chốt (publish) tuần khi không có lịch Live bị chặn (chế độ Demo)",
    "category": "negative",
    "priority": "P1",
    "role": "Trưởng khoa",
    "preconditions": "Ở /v2/hr badge 'Demo' (rosterId=null)",
    "steps": [
     "Xác nhận badge hiển thị 'Demo'",
     "Bấm 'Chốt tuần'"
    ],
    "expected": "Cảnh báo 'Không có lịch trực đang hoạt động để chốt (đang dùng dữ liệu mẫu)'; không gọi publish API; nút không vào trạng thái loading kéo dài",
    "evidence": [
     {
      "name": "TC-HR-011__s01__error",
      "caption": "Cảnh báo không có lịch để chốt",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-012",
    "title": "Chốt tuần thành công khi có rosterId (Live) và xử lý loading",
    "category": "state",
    "priority": "P1",
    "role": "Trưởng khoa",
    "preconditions": "Ở /v2/hr badge 'Live' có rosterId",
    "steps": [
     "Bấm 'Chốt tuần'",
     "Quan sát nút đổi nhãn 'Đang chốt…' và disabled",
     "Chờ kết quả"
    ],
    "expected": "Trong lúc gọi publishRoster nút disabled + 'Đang chốt…'; thành công toast 'Đã chốt (publish) lịch trực tuần thành công'; lỗi toast 'Chốt lịch trực thất bại'; nút trở lại bình thường",
    "evidence": [
     {
      "name": "TC-HR-012__s01__loading",
      "caption": "Nút Chốt tuần đang loading",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-013",
    "title": "Xuất Excel/CSV lịch trực tuần đúng cột và có dấu tiếng Việt",
    "category": "data-consistency",
    "priority": "P2",
    "role": "Điều phối trực",
    "preconditions": "Ở /v2/hr có nhân sự hiển thị",
    "steps": [
     "Lọc 1 khoa để giảm số dòng",
     "Bấm 'Xuất Excel'",
     "Mở file CSV tải về kiểm tra header và dữ liệu"
    ],
    "expected": "File tên 'lich-truc-tuan-{week}-YYYYMMDD.csv'; header 'Nhân sự,Mã NS,Vai trò,Khoa,T2..CN'; mỗi hàng = NS hiển thị với nhãn ca tiếng Việt; BOM giữ dấu tiếng Việt; toast báo số NS đã xuất",
    "evidence": [
     {
      "name": "TC-HR-013__s01__success",
      "caption": "Toast xuất CSV thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-014",
    "title": "Empty/loading/error state khi backend HR rỗng → fallback dữ liệu mẫu (badge Demo)",
    "category": "ui",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Backend HR chưa có ≥8 nhân sự thật",
    "steps": [
     "Mở /v2/hr lần đầu, quan sát trong lúc load",
     "Quan sát badge sau khi load xong"
    ],
    "expected": "Khi backend rỗng/ít NV: giữ STAFF seed, badge 'Demo' nền cam, tooltip 'Backend HR rỗng — đang dùng dữ liệu mẫu'; khi đủ NV thật badge 'Live' + toast 'Hiển thị nhân sự thật: N người'; lỗi API im lặng fallback không crash",
    "evidence": [
     {
      "name": "TC-HR-014__s01__loading",
      "caption": "Trạng thái tải bảng trực",
      "uiState": "loading"
     },
     {
      "name": "TC-HR-014__s02__empty",
      "caption": "Badge Demo khi backend rỗng",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-015",
    "title": "Dark/light parity bảng trực: màu ca, badge Demo/Live, KPI đọc rõ 2 theme",
    "category": "ui",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Ở /v2/hr",
    "steps": [
     "Bật light mode, quan sát màu 4 ca + KPI + badge",
     "Toggle dark mode trên topbar v2",
     "So sánh độ tương phản chữ/nền của ô ca và badge"
    ],
    "expected": "4 ca (Sáng/Chiều/Đêm/Nghỉ) dùng biến CSS var(--s-*) hiển thị tương phản đủ ở cả 2 theme; KPI tone (warn/critical/ok) đọc rõ; không có chữ trắng trên nền trắng",
    "evidence": [
     {
      "name": "TC-HR-015__s01__list",
      "caption": "Bảng trực ở dark mode",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-016",
    "title": "Hồ sơ NV: chọn nhân viên rồi CRUD trên tab Hợp đồng (thêm/sửa) thành công",
    "category": "happy",
    "priority": "P0",
    "role": "Cán bộ nhân sự",
    "preconditions": "Ở /v2/employee-profile, có danh sách users",
    "steps": [
     "Chọn 1 nhân viên ở Filter",
     "Vào tab 'Hợp đồng'",
     "Bấm thêm, điền dữ liệu hợp đồng, lưu",
     "Sửa 1 dòng vừa tạo"
    ],
    "expected": "KPI 'Đang xem' đổi sang tên NV; bảng tab Hợp đồng tải theo userId; thêm/sửa lưu thành công kèm toast; dữ liệu hiển thị ngay trong bảng",
    "evidence": [
     {
      "name": "TC-HR-016__s01__tab",
      "caption": "Tab Hợp đồng của NV đã chọn",
      "uiState": "tab"
     },
     {
      "name": "TC-HR-016__s02__modal",
      "caption": "Modal thêm hợp đồng",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ]
   },
   {
    "id": "TC-HR-017",
    "title": "Hồ sơ NV: empty state khi chưa chọn nhân viên",
    "category": "ui",
    "priority": "P1",
    "role": "Cán bộ nhân sự",
    "preconditions": "Ở /v2/employee-profile vừa mở",
    "steps": [
     "Không chọn nhân viên",
     "Quan sát vùng nội dung dưới các tab"
    ],
    "expected": "Hiển thị empty 'Chọn nhân viên để xem hồ sơ đầy đủ'; KPI 'Đang xem' = '—' tone warn; chuyển tab không tải dữ liệu khi chưa chọn NV",
    "evidence": [
     {
      "name": "TC-HR-017__s01__empty",
      "caption": "Empty state chưa chọn nhân viên",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-018",
    "title": "Hồ sơ NV tab BHXH/BHYT: validate ngày bắt đầu/kết thúc BHYT hợp lệ",
    "category": "validation",
    "priority": "P1",
    "role": "Cán bộ nhân sự",
    "preconditions": "Đã chọn NV, vào tab 'BHXH/BHYT'",
    "steps": [
     "Thêm/sửa thông tin BHYT",
     "Nhập ngày kết thúc BHYT trước ngày bắt đầu",
     "Nhập định dạng ngày sai",
     "Lưu"
    ],
    "expected": "Field date chuyển ISO→Dayjs đúng khi sửa; ngày kết thúc < bắt đầu bị từ chối/cảnh báo; không lưu dữ liệu không hợp lệ",
    "evidence": [
     {
      "name": "TC-HR-018__s01__validation",
      "caption": "Cảnh báo ngày BHYT không hợp lệ",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-019",
    "title": "Tạo kỳ lương mới thành công ở trạng thái Dự thảo",
    "category": "happy",
    "priority": "P0",
    "role": "Kế toán lương",
    "preconditions": "Ở /v2/payroll",
    "steps": [
     "Bấm tạo kỳ lương",
     "Form pre-fill năm/tháng hiện tại",
     "Lưu kỳ mới",
     "Quan sát danh sách + StatusTabs"
    ],
    "expected": "Toast 'Đã tạo kỳ lương'; kỳ mới ở tab 'Dự thảo'; danh sách reload; mã kỳ + năm/tháng hiển thị đúng",
    "evidence": [
     {
      "name": "TC-HR-019__s01__modal",
      "caption": "Modal tạo kỳ lương",
      "uiState": "modal"
     },
     {
      "name": "TC-HR-019__s02__list",
      "caption": "Kỳ lương mới ở tab Dự thảo",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ]
   },
   {
    "id": "TC-HR-020",
    "title": "Sinh dòng lương tự động cho kỳ và tính Thực lĩnh đúng công thức",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Kế toán lương",
    "preconditions": "Có kỳ lương Dự thảo",
    "steps": [
     "Chọn kỳ, bấm 'Sinh dòng lương'",
     "Mở danh sách dòng lương của kỳ",
     "Kiểm tra 1 dòng: netSalary = base+allowance+other - bhxhDeduction - otherDeduction"
    ],
    "expected": "Dòng lương sinh theo nhân sự; số định dạng vi-VN (dấu chấm nghìn); thực lĩnh tính đúng; KPI tổng netSalary của kỳ = Σ dòng",
    "evidence": [
     {
      "name": "TC-HR-020__s01__detail",
      "caption": "Bảng dòng lương sau khi sinh",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-021",
    "title": "Duyệt kỳ lương Draft→Approved và chặn sửa sau duyệt",
    "category": "state",
    "priority": "P0",
    "role": "Kế toán trưởng",
    "preconditions": "Có kỳ lương Dự thảo có dòng lương",
    "steps": [
     "Chọn kỳ Dự thảo, bấm 'Duyệt' → xác nhận",
     "Quan sát kỳ chuyển tab 'Đã duyệt'",
     "Thử sửa dòng lương của kỳ đã duyệt"
    ],
    "expected": "Confirm 'Duyệt kỳ lương ...?'; toast 'Đã duyệt'; status→Approved; kỳ đã duyệt không cho sửa/sinh lại dòng lương (hoặc bị BE chặn báo lỗi)",
    "evidence": [
     {
      "name": "TC-HR-021__s01__confirm",
      "caption": "Hộp xác nhận duyệt kỳ lương",
      "uiState": "confirm"
     },
     {
      "name": "TC-HR-021__s02__success",
      "caption": "Kỳ ở tab Đã duyệt",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ]
   },
   {
    "id": "TC-HR-022",
    "title": "Dòng lương boundary: công=0, lương âm, số rất lớn xử lý/validate đúng",
    "category": "edge",
    "priority": "P1",
    "role": "Kế toán lương",
    "preconditions": "Mở modal sửa dòng lương",
    "steps": [
     "Nhập workDays=0",
     "Nhập baseSalary âm (-1000000)",
     "Nhập baseSalary cực lớn (999999999999)",
     "Lưu từng trường hợp"
    ],
    "expected": "Số âm bị từ chối hoặc rõ cảnh báo (lương không âm); công=0 hợp lệ → thực lĩnh tính theo công thức; số rất lớn không tràn/định dạng đúng vi-VN; không NaN ở netSalary",
    "evidence": [
     {
      "name": "TC-HR-022__s01__validation",
      "caption": "Cảnh báo lương âm",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-023",
    "title": "Lỗi tải danh sách kỳ lương/dòng lương hiển thị thông báo thân thiện",
    "category": "negative",
    "priority": "P2",
    "role": "Kế toán lương",
    "preconditions": "Mô phỏng API /admin-modules/payroll/* lỗi 500",
    "steps": [
     "Chặn/giả lập lỗi endpoint periods",
     "Mở /v2/payroll",
     "Mở 1 kỳ để load items khi items lỗi"
    ],
    "expected": "Toast 'Tải danh sách kỳ lương thất bại' / 'Tải dòng lương thất bại'; bảng về rỗng có empty state thay vì crash trắng trang; loading kết thúc",
    "evidence": [
     {
      "name": "TC-HR-023__s01__error",
      "caption": "Thông báo lỗi tải kỳ lương",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-024",
    "title": "Tạo quyết định nhân sự (Bổ nhiệm) ở trạng thái Dự thảo",
    "category": "happy",
    "priority": "P0",
    "role": "Cán bộ tổ chức",
    "preconditions": "Ở /v2/hr-decisions",
    "steps": [
     "Bấm tạo QĐ mới",
     "Chọn loại 'Bổ nhiệm', nhập số QĐ, nhân viên, ngày hiệu lực, trích yếu, nội dung",
     "Lưu"
    ],
    "expected": "Toast tạo thành công; QĐ mới ở StatusTab 'Dự thảo'; loại + trích yếu hiển thị; ngày hiệu lực định dạng vi-VN",
    "evidence": [
     {
      "name": "TC-HR-024__s01__modal",
      "caption": "Modal tạo QĐ nhân sự",
      "uiState": "modal"
     },
     {
      "name": "TC-HR-024__s02__list",
      "caption": "QĐ mới ở tab Dự thảo",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ]
   },
   {
    "id": "TC-HR-025",
    "title": "Chuyển trạng thái QĐ Dự thảo→Hiệu lực và Hủy; chặn chuyển không hợp lệ",
    "category": "state",
    "priority": "P0",
    "role": "Cán bộ tổ chức",
    "preconditions": "Có QĐ ở Dự thảo",
    "steps": [
     "Chuyển QĐ Dự thảo → Hiệu lực",
     "Thử thao tác chuyển ngược Hiệu lực → Dự thảo",
     "Hủy 1 QĐ Hiệu lực",
     "Thử sửa QĐ đã Hủy"
    ],
    "expected": "Dự thảo→Hiệu lực hợp lệ; QĐ Hiệu lực không quay lại Dự thảo; Hủy chuyển sang tab 'Hủy' tone crit; QĐ đã Hủy không cho sửa nội dung",
    "evidence": [
     {
      "name": "TC-HR-025__s01__confirm",
      "caption": "Xác nhận chuyển trạng thái QĐ",
      "uiState": "confirm"
     },
     {
      "name": "TC-HR-025__s02__success",
      "caption": "QĐ chuyển sang Hiệu lực",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-026",
    "title": "Lọc QĐ theo loại + khoảng ngày hiệu lực + tìm kiếm kết hợp",
    "category": "happy",
    "priority": "P1",
    "role": "Cán bộ tổ chức",
    "preconditions": "Có nhiều QĐ nhiều loại",
    "steps": [
     "Chọn Filter loại 'Kỷ luật'",
     "Chọn RangePicker khoảng ngày hiệu lực",
     "Gõ từ khóa số QĐ/tên NV",
     "Xóa từng bộ lọc"
    ],
    "expected": "Kết quả giao của 3 điều kiện; chọn StatusTab kết hợp lọc; xóa filter trả về đầy đủ; không có dòng ngoài điều kiện",
    "evidence": [
     {
      "name": "TC-HR-026__s01__filter",
      "caption": "QĐ sau khi lọc kết hợp",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-027",
    "title": "In quyết định nhân sự mở cửa sổ in đúng nội dung và escape an toàn",
    "category": "security",
    "priority": "P1",
    "role": "Cán bộ tổ chức",
    "preconditions": "Có 1 QĐ với trích yếu/nội dung chứa ký tự đặc biệt < > & và đoạn HTML",
    "steps": [
     "Tạo/chọn QĐ có trích yếu chứa '<script>alert(1)</script>' và dấu tiếng Việt",
     "Bấm 'In QĐ'",
     "Quan sát cửa sổ in"
    ],
    "expected": "Cửa sổ in hiển thị số QĐ/loại/ngày/NV/trích yếu/nội dung đúng tiếng Việt; nội dung người dùng KHÔNG bị thực thi như HTML/JS (XSS), phải hiển thị như văn bản — đây là điểm cần kiểm chứng vì code dùng window.open + document.write nội suy trực tiếp",
    "evidence": [
     {
      "name": "TC-HR-027__s01__modal",
      "caption": "Cửa sổ in QĐ",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-028",
    "title": "QĐ boundary: số QĐ trùng, ngày hiệu lực quá khứ/tương lai xa, trích yếu rất dài",
    "category": "edge",
    "priority": "P2",
    "role": "Cán bộ tổ chức",
    "preconditions": "Modal tạo QĐ mở",
    "steps": [
     "Tạo QĐ với số trùng QĐ đã có",
     "Đặt ngày hiệu lực 01/01/1900 và 31/12/2099",
     "Nhập trích yếu 1000 ký tự + emoji + dấu tiếng Việt",
     "Lưu"
    ],
    "expected": "Số QĐ trùng bị chặn hoặc cảnh báo unique; ngày biên được chấp nhận hoặc cảnh báo rõ; chuỗi dài không vỡ layout bảng/print; emoji/dấu lưu & hiển thị đúng",
    "evidence": [
     {
      "name": "TC-HR-028__s01__validation",
      "caption": "Cảnh báo số QĐ trùng",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-029",
    "title": "Tạo CCHN mới và phân loại theo trạng thái Hợp lệ",
    "category": "happy",
    "priority": "P0",
    "role": "Cán bộ nhân sự",
    "preconditions": "Ở /v2/practice-license",
    "steps": [
     "Bấm thêm CCHN",
     "Điền Mã CCHN, họ tên, loại (Bác sĩ), số CCHN, ngày cấp, ngày hết hạn còn xa",
     "Lưu"
    ],
    "expected": "CCHN mới ở StatusTab 'Hợp lệ'; loại hiển thị nhãn tiếng Việt; KPI cập nhật; Mã CCHN disabled khi sửa lại",
    "evidence": [
     {
      "name": "TC-HR-029__s01__modal",
      "caption": "Modal thêm CCHN",
      "uiState": "modal"
     },
     {
      "name": "TC-HR-029__s02__list",
      "caption": "CCHN mới ở tab Hợp lệ",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ]
   },
   {
    "id": "TC-HR-030",
    "title": "CCHN: cảnh báo sắp hết hạn và phân loại Hết hạn theo ngày",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Cán bộ nhân sự",
    "preconditions": "Có CCHN với expiryDate trong 30 ngày tới và 1 CCHN đã quá hạn",
    "steps": [
     "Mở /v2/practice-license",
     "Quan sát CCHN gần hết hạn ở tab 'Sắp hết' + cảnh báo",
     "Quan sát CCHN quá hạn ở tab 'Hết hạn'"
    ],
    "expected": "Phân loại trạng thái theo ngày hết hạn (0 Hợp lệ/1 Sắp hết/2 Hết hạn); cảnh báo expiring hiển thị; KPI đếm đúng; ngày định dạng vi-VN",
    "evidence": [
     {
      "name": "TC-HR-030__s01__list",
      "caption": "CCHN sắp hết hạn được cảnh báo",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-031",
    "title": "CCHN validate ngày hết hạn < ngày cấp và trường bắt buộc",
    "category": "validation",
    "priority": "P1",
    "role": "Cán bộ nhân sự",
    "preconditions": "Modal thêm/sửa CCHN mở",
    "steps": [
     "Bỏ trống Mã CCHN/Số CCHN/loại/ngày cấp/ngày hết hạn → lưu",
     "Nhập ngày hết hạn trước ngày cấp → lưu"
    ],
    "expected": "Các field required (licenseCode/staffName/licenseType/licenseNumber/issueDate/expiryDate) bị chặn với báo lỗi; ngày hết hạn < ngày cấp bị từ chối; modal không đóng khi lỗi",
    "evidence": [
     {
      "name": "TC-HR-031__s01__validation",
      "caption": "Cảnh báo trường CCHN bắt buộc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-032",
    "title": "Chuyển trạng thái CCHN: Thu hồi/Tạm dừng và in CCHN",
    "category": "state",
    "priority": "P1",
    "role": "Cán bộ nhân sự",
    "preconditions": "Có CCHN Hợp lệ",
    "steps": [
     "Mở Drawer chi tiết 1 CCHN",
     "Đổi trạng thái sang 'Thu hồi' rồi 'Tạm dừng'",
     "Bấm 'In CCHN'"
    ],
    "expected": "Trạng thái chuyển đúng tab (Thu hồi/Tạm dừng tone crit/warn); in CCHN tạo bản in đúng thông tin; CCHN Thu hồi không còn tính 'Hợp lệ' ở KPI",
    "evidence": [
     {
      "name": "TC-HR-032__s01__drawer",
      "caption": "Drawer CCHN đổi trạng thái",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-033",
    "title": "Phân trang danh sách CCHN (18/trang) hoạt động đúng",
    "category": "ui",
    "priority": "P2",
    "role": "Cán bộ nhân sự",
    "preconditions": "Có > 18 CCHN",
    "steps": [
     "Mở /v2/practice-license",
     "Chuyển trang qua Pager",
     "Lọc loại rồi kiểm tra trang reset"
    ],
    "expected": "Mỗi trang ≤18 dòng; Pager điều hướng đúng; đổi filter/search đưa về trang đầu; tổng số đếm khớp",
    "evidence": [
     {
      "name": "TC-HR-033__s01__list",
      "caption": "CCHN trang 2",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-034",
    "title": "Phân quyền: vai trò không đủ quyền bị chặn menu/nút/API HR (matrix #216)",
    "category": "permission",
    "priority": "P0",
    "role": "Người dùng vai trò hạn chế (vd Lễ tân/Bác sĩ thường)",
    "preconditions": "Đăng nhập tài khoản KHÔNG có quyền HR/Payroll theo matrix #216",
    "steps": [
     "Đăng nhập tài khoản hạn chế",
     "Kiểm tra menu HR/Lương/QĐ NS có ẩn không",
     "Truy cập trực tiếp URL /v2/payroll, /v2/hr-decisions",
     "Gọi trực tiếp API POST /admin-modules/payroll/periods bằng token vai trò đó"
    ],
    "expected": "Menu nhạy cảm bị ẩn; route bị chặn/redirect; API trả 403 cho thao tác duyệt kỳ lương/QĐ; không lộ dữ liệu lương của người khác",
    "evidence": [
     {
      "name": "TC-HR-034__s01__permission",
      "caption": "Menu HR bị ẩn với vai trò hạn chế",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#262"
    ]
   },
   {
    "id": "TC-HR-035",
    "title": "Bảo mật IDOR: xem/sửa dòng lương hoặc hồ sơ NV khác qua ID trực tiếp",
    "category": "security",
    "priority": "P0",
    "role": "Nhân viên không phải HR/kế toán",
    "preconditions": "Có token vai trò thường + biết periodId/userId của người khác",
    "steps": [
     "Lấy periodId của 1 kỳ lương qua API list (nếu lộ)",
     "Gọi GET /admin-modules/payroll/periods/{id}/items với token vai trò thường",
     "Gọi /admin/users + employee-profile của NV khác qua userId"
    ],
    "expected": "BE kiểm tra quyền theo vai trò, không cho NV thường đọc dòng lương/hồ sơ của người khác (403/404); không IDOR; audit log ghi truy cập",
    "evidence": [
     {
      "name": "TC-HR-035__s01__permission",
      "caption": "API dòng lương trả 403 với vai trò thường",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#262"
    ]
   },
   {
    "id": "TC-HR-036",
    "title": "Audit log ghi nhận mutation HR (duyệt kỳ lương, đổi trạng thái QĐ, duyệt đổi ca)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản trị/Thanh tra",
    "preconditions": "Đã thực hiện duyệt kỳ lương + chuyển trạng thái QĐ + duyệt đổi ca ở các TC trên",
    "steps": [
     "Thực hiện 1 thao tác duyệt kỳ lương",
     "Thực hiện chuyển trạng thái 1 QĐ",
     "Mở màn audit log/hệ thống kiểm tra bản ghi"
    ],
    "expected": "Mỗi mutation có bản ghi audit: user thực hiện (CreatedBy ≠ Guid.Empty), thời gian, đối tượng, trạng thái cũ→mới; truy vết được phục vụ pháp lý",
    "evidence": [
     {
      "name": "TC-HR-036__s01__detail",
      "caption": "Bản ghi audit log thao tác HR",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-037",
    "title": "Hủy giữa chừng (cancel) các modal HR không lưu dữ liệu rác",
    "category": "negative",
    "priority": "P2",
    "role": "Người dùng HR",
    "preconditions": "Ở các màn HR có modal",
    "steps": [
     "Mở modal tạo kỳ lương, điền dở, bấm Huỷ",
     "Mở modal yêu cầu đổi ca, điền dở, bấm Huỷ/đóng",
     "Mở modal tạo QĐ, điền dở, đóng"
    ],
    "expected": "Đóng modal không tạo bản ghi; mở lại form đã reset (resetFields); không còn dữ liệu dở từ lần trước; không có dòng rác trong danh sách",
    "evidence": [
     {
      "name": "TC-HR-037__s01__modal",
      "caption": "Hủy modal giữa chừng",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-HR-038",
    "title": "Console-error smoke toàn bộ 5 màn HR khi điều hướng qua lại",
    "category": "ui",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Đăng nhập admin",
    "steps": [
     "Mở lần lượt /v2/hr, /v2/employee-profile, /v2/payroll, /v2/hr-decisions, /v2/practice-license",
     "Mở DevTools Console",
     "Điều hướng qua lại, mở vài modal/drawer"
    ],
    "expected": "Không có console error (bỏ qua SignalR/HMR pattern); không warning antd deprecated; các trang render không màn trắng; loading state hiển thị trong lúc fetch",
    "evidence": [
     {
      "name": "TC-HR-038__s01__list",
      "caption": "Console sạch khi duyệt các màn HR",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262",
     "#261"
    ]
   }
  ],
  "ui_state_checklist": [
   "list — bảng trực tuần / danh sách kỳ lương / QĐ / CCHN",
   "detail — dòng lương của kỳ, audit log, ô ca sau cycle",
   "form — form trong modal HR",
   "modal — tạo kỳ lương/QĐ/CCHN, copy tuần, yêu cầu đổi ca, in QĐ/CCHN",
   "drawer — chi tiết nhân sự (/v2/hr), chi tiết CCHN",
   "tab — 10 tab hồ sơ nhân viên",
   "filter — lọc khoa/loại QĐ/loại CCHN/khoảng ngày + search",
   "dropdown — Select khoa, loại, ca trực, nhân viên",
   "validation — thiếu field bắt buộc, ngày/range sai, số âm, trùng mã",
   "empty — chưa chọn NV, backend HR rỗng (badge Demo), bảng rỗng sau lỗi",
   "loading — tải bảng trực, nút 'Đang chốt…', tải kỳ lương",
   "error — chốt khi Demo, lỗi tải kỳ/dòng lương, API 500",
   "confirm — duyệt kỳ lương, chuyển trạng thái QĐ",
   "success — gửi/duyệt đổi ca, tạo kỳ lương, chuyển trạng thái thành công",
   "toast — xuất CSV, các thông báo thành công/thất bại",
   "permission — menu ẩn vai trò hạn chế, API 403, IDOR dòng lương/hồ sơ"
  ],
  "gaps": [
   "Bảng trực /v2/hr phần lớn dùng state cục bộ (cycle ca, swap mock) — chưa rõ thao tác xếp/đổi ca có persist xuống backend (updateRosterAssignment) hay chỉ in-memory; cần task xác minh persistence sau reload.",
   "Vòng trạng thái roster đầy đủ (Draft→Submitted→Approved→Published) qua submitRoster/approveRoster chưa có UI rõ ở trang v2 hiện tại (chỉ có publish); cần test API trực tiếp + bổ sung kiểm tra chuyển trạng thái không hợp lệ.",
   "Leave requests (Pending/Approved/Rejected) và Attendance/Overtime có DTO trong api nhưng chưa thấy màn v2 riêng — cần xác minh có UI hay chỉ API; nếu có cần bổ sung test happy/validation/state cho nghỉ phép & chấm công & tăng ca.",
   "In QĐ (printDecision) và in CCHN dùng window.open + document.write nội suy trực tiếp chuỗi người dùng → rủi ro XSS thực sự; gap: cần kiểm chứng escape và cân nhắc fix (TC-HR-027 đã nêu).",
   "Chưa có test ràng buộc nghiệp vụ trực: trùng ca cùng người/ngày, NS trực liên tục nhiều đêm (nghỉ giữa ca), số NS tối thiểu/ca an toàn — chỉ có cảnh báo 'ca thiếu <6' ở KPI.",
   "Data-consistency lương ↔ chấm công/tăng ca: chưa rõ workDays/allowance sinh từ AttendanceRecords/OvertimeRecords thật hay nhập tay; cần test luồng chấm công → kỳ lương → thực lĩnh end-to-end.",
   "Permission matrix #216 cần liệt kê cụ thể vai trò nào được xem lương người khác / duyệt kỳ / duyệt QĐ — test permission hiện ở mức nguyên tắc, cần map chi tiết khi matrix sẵn sàng.",
   "Tính nhất quán nhân sự: NV nghỉ việc/đình chỉ (employmentStatus 3/4) có còn được xếp lịch trực / có CCHN còn hiệu lực không — gap kiểm tra ràng buộc giữa trạng thái lao động và roster/CCHN.",
   "Responsive bảng trực rộng (12 NS × 7 ngày + sticky col) trên màn nhỏ chưa được kiểm tra cụ thể.",
   "Liên thông cổng (BHXH cho EmployeeInsuranceInfos, đăng ký hành nghề lên Sở Y tế) nếu có — chưa thấy integration trong phạm vi file đọc; cần xác minh trước khi bỏ qua category integration."
  ]
 }
]);
