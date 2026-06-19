window.TP.modules.push(...[
 {
  "id": "billing",
  "code": "BIL",
  "layer": "fin",
  "ic": "💰",
  "nm": "Viện phí & Thanh toán",
  "gh": [
   "#232",
   "#233",
   "#234",
   "#235",
   "#236",
   "#238"
  ],
  "gap": false,
  "module_id": "billing",
  "summary": "Phân hệ \"Viện phí & Thanh toán\" (BIL, lớp fin) quản lý toàn bộ dòng tiền viện phí: tổng hợp dịch vụ trong MedicalRecord ⟶ Receipts ⟶ ReceiptDetails ⟶ Payments/PaymentTransactions ⟶ ElectronicInvoices, cùng Deposits (tạm ứng), CashBooks (sổ quỹ), InvoiceSummaries, OnlinePayments, AdditionalCharges/OtherIncomes, OtherPayers (bảo lãnh) và TransportServices/GasolinePrices. Bảng/màn chính (đã có route /v2): Biên lai/Thu ngân (Billing.tsx), Lập/sửa biên lai (BillingEditor.tsx), Người bảo lãnh chi trả (BillingGuarantors.tsx), Giao dịch thanh toán (PaymentTransactions), Thanh toán ngân hàng/QR (BankPayments), Quản trị sổ biên lai (ReceiptBookAdmin), Báo cáo thu (PaymentReports). Đặc thù nghiệp vụ: khóa viện phí dùng MedicalRecord.IsClosed (KHÔNG nhầm khóa EMR/EmrFinalizedAt); nhiều nguồn chi trả (BHYT + tiền mặt + bảo lãnh), tách/gộp bill, HĐĐT phát hành SAU khi thanh toán; dữ liệu chi phí phải nhất quán xuyên OPD/IPD ⟶ viện phí ⟶ BHYT; mọi mutation phải audit log + CreatedBy là user thật.",
  "screens": [
   {
    "name": "Danh sách thu ngân / Biên lai",
    "desc": "Màn chính thu ngân: KPI tổng thu/chờ thu/tạm ứng, StatusTabs (Chờ thu/Đã thu/Đã hủy/Đã khóa), DataTable bệnh nhân + chi phí cần thu, lọc theo loại đối tượng (BHYT/Viện phí/DV), nút Thu tiền/Tạm ứng/Hoàn tiền.",
    "route_guess": "/v2/billing",
    "elements": [
     "KpiStrip tổng thu trong ngày",
     "StatusTabs trạng thái biên lai",
     "DataTable danh sách BN/chi phí",
     "Filter loại đối tượng + ngày",
     "Nút Thu tiền / Tạm ứng / In biên lai",
     "Ô tìm kiếm theo tên/mã BN/mã HSBA"
    ]
   },
   {
    "name": "Lập/Sửa biên lai (Editor)",
    "desc": "Drawer/trang lập biên lai: chọn dịch vụ cần thu từ MedicalRecord, tính tiền (đơn giá × SL), áp BHYT (mức hưởng), chọn nguồn chi trả, nhập tiền khách đưa - tiền thối, chọn sổ biên lai, phụ thu/thu khác.",
    "route_guess": "/v2/billing/edit",
    "elements": [
     "Bảng ReceiptDetails (DV, SL, đơn giá, BHYT, thành tiền)",
     "Dropdown nguồn chi trả (tiền mặt/CK/QR/bảo lãnh)",
     "Field tiền khách đưa + tiền thối",
     "Dropdown chọn sổ biên lai",
     "Block phụ thu/thu khác (AdditionalCharges/OtherIncomes)",
     "Tổng tiền BN phải trả / BHYT chi trả",
     "Nút Lưu nháp / Thanh toán / Hủy"
    ]
   },
   {
    "name": "Tạm ứng (Deposits)",
    "desc": "Modal/tab tạm ứng cho BN nội trú: nhập số tiền tạm ứng, hình thức, in phiếu tạm ứng, xem lịch sử tạm ứng và số dư còn lại để khấu trừ vào quyết toán.",
    "route_guess": "/v2/billing (tab/modal Tạm ứng)",
    "elements": [
     "ModalShell nhập tạm ứng",
     "Field số tiền + hình thức nộp",
     "Bảng lịch sử Deposits + số dư",
     "Nút In phiếu tạm ứng",
     "Nút Hoàn tạm ứng"
    ]
   },
   {
    "name": "Người bảo lãnh chi trả (Guarantors)",
    "desc": "Quản lý OtherPayers/bên thứ ba bảo lãnh viện phí (công ty/bảo hiểm tư): tạo, gán cho BN, tỉ lệ/hạn mức bảo lãnh.",
    "route_guess": "/v2/billing-guarantors",
    "elements": [
     "DataTable danh sách người bảo lãnh",
     "Form thêm/sửa bảo lãnh (tên, loại, hạn mức)",
     "Gán bảo lãnh vào biên lai",
     "StatusTabs hiệu lực/hết hiệu lực"
    ]
   },
   {
    "name": "Giao dịch thanh toán (PaymentTransactions)",
    "desc": "Sổ giao dịch PaymentTransactions/Payments: liệt kê mọi giao dịch thu/hoàn theo thời gian, phương thức, thu ngân; lọc và đối soát.",
    "route_guess": "/v2/payment-transactions",
    "elements": [
     "DataTable giao dịch (mã, BN, số tiền, phương thức, thu ngân, thời gian)",
     "Filter ngày/phương thức/thu ngân",
     "KPI tổng giao dịch",
     "Nút xem chi tiết / in"
    ]
   },
   {
    "name": "Thanh toán ngân hàng / QR (BankPayments)",
    "desc": "Thanh toán không tiền mặt: sinh QR VietQR/Napas, theo dõi OnlinePayments, xác nhận thủ công, đối chiếu IPN, liên kết về Receipt.",
    "route_guess": "/v2/bank-payments",
    "elements": [
     "DataTable giao dịch online",
     "Khu hiển thị QR + trạng thái chờ/thành công/thất bại",
     "Nút xác nhận thủ công",
     "Filter trạng thái thanh toán online",
     "Liên kết tới biên lai"
    ]
   },
   {
    "name": "Quản trị sổ biên lai (ReceiptBookAdmin)",
    "desc": "Cấp phát/quản lý dải số biên lai, gán cho thu ngân, theo dõi số đã dùng/còn lại, khóa sổ.",
    "route_guess": "/v2/receipt-book-admin",
    "elements": [
     "DataTable sổ biên lai (ký hiệu, dải số, đã dùng/còn)",
     "Form cấp sổ + gán thu ngân",
     "StatusTabs đang dùng/đã khóa",
     "Nút khóa/mở sổ"
    ]
   },
   {
    "name": "Báo cáo thu / Sổ quỹ (PaymentReports/CashBooks)",
    "desc": "Tổng hợp thu theo ngày/ca/thu ngân/loại đối tượng; sổ quỹ CashBooks; xuất báo cáo, đối chiếu HĐĐT (ElectronicInvoices/InvoiceSummaries).",
    "route_guess": "/v2/payment-reports",
    "elements": [
     "KpiStrip tổng thu/hoàn/thực thu",
     "Bảng tổng hợp theo ca/thu ngân/đối tượng",
     "Filter khoảng ngày + thu ngân",
     "Nút xuất Excel/PDF",
     "Khu HĐĐT đã phát hành"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-BIL-001",
    "title": "Thu tiền viện phí ngoại trú một nguồn tiền mặt (happy path)",
    "category": "happy",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "Đăng nhập admin/Admin@123 ở /v2. Có 1 BN ngoại trú đã có dịch vụ trong MedicalRecord (từ OPD/CLS), chưa thanh toán, biên lai trạng thái Chờ thu. Đã cấp sổ biên lai cho thu ngân.",
    "steps": [
     "Mở /v2/billing",
     "Tìm BN theo tên/mã HSBA, chọn dòng Chờ thu",
     "Bấm Thu tiền mở /v2/billing/edit",
     "Kiểm tra bảng ReceiptDetails liệt kê đúng dịch vụ + đơn giá + thành tiền",
     "Chọn nguồn chi trả Tiền mặt, nhập tiền khách đưa lớn hơn tổng",
     "Kiểm tra tiền thối tính đúng",
     "Bấm Thanh toán",
     "In biên lai"
    ],
    "expected": "Biên lai chuyển trạng thái Đã thu; tổng tiền = sum(ReceiptDetails); tiền thối = tiền đưa - tổng; sinh PaymentTransaction; biên lai có số từ sổ biên lai; toast thành công; audit log ghi mutation với CreatedBy là user đăng nhập.",
    "evidence": [
     {
      "name": "TC-BIL-001__s01__list",
      "caption": "Danh sách thu ngân tab Chờ thu, chọn BN",
      "uiState": "list"
     },
     {
      "name": "TC-BIL-001__s02__form",
      "caption": "Editor biên lai với ReceiptDetails + nguồn tiền mặt",
      "uiState": "form"
     },
     {
      "name": "TC-BIL-001__s03__confirm",
      "caption": "Xác nhận thanh toán + tiền thối",
      "uiState": "confirm"
     },
     {
      "name": "TC-BIL-001__s04__success",
      "caption": "Biên lai Đã thu + toast",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#232",
     "#233"
    ],
    "notes": "Luồng OPD→billing per rel data.js."
   },
   {
    "id": "TC-BIL-002",
    "title": "Thu viện phí đa nguồn chi trả (BHYT + tiền mặt) tính đúng mức hưởng",
    "category": "happy",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "BN có PatientType=BHYT, thẻ hợp lệ, mức hưởng đã áp ở MedicalRecord. Có dịch vụ vừa BHYT chi vừa BN cùng chi trả.",
    "steps": [
     "Mở /v2/billing chọn BN BHYT",
     "Vào editor biên lai",
     "Kiểm tra cột BHYT chi trả và phần BN phải trả tách riêng theo từng dòng DV",
     "Chọn nguồn chi trả phần còn lại = Tiền mặt",
     "Thanh toán phần BN",
     "Xem lại biên lai"
    ],
    "expected": "Tổng BHYT chi + BN chi = tổng chi phí; BN chỉ trả phần cùng chi trả; biên lai ghi rõ 2 nguồn; số liệu khớp dữ liệu áp BHYT (data-consistency billing↔insurance).",
    "evidence": [
     {
      "name": "TC-BIL-002__s01__form",
      "caption": "Editor tách BHYT chi trả vs BN chi trả",
      "uiState": "form"
     },
     {
      "name": "TC-BIL-002__s02__detail",
      "caption": "Biên lai 2 nguồn chi trả",
      "uiState": "detail"
     },
     {
      "name": "TC-BIL-002__s03__success",
      "caption": "Thanh toán phần BN thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#232",
     "#235"
    ],
    "notes": "NOTES billing: nhiều nguồn chi trả BHYT+tiền mặt+bảo lãnh."
   },
   {
    "id": "TC-BIL-003",
    "title": "Thu viện phí qua bảo lãnh bên thứ ba (OtherPayers/Guarantor)",
    "category": "happy",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "Đã tạo người bảo lãnh ở /v2/billing-guarantors với hạn mức/tỉ lệ. Gán bảo lãnh cho BN.",
    "steps": [
     "Tạo/chọn người bảo lãnh tại /v2/billing-guarantors",
     "Mở biên lai BN, gán nguồn chi trả = Bảo lãnh",
     "Kiểm tra phần bảo lãnh chi và phần BN tự trả theo tỉ lệ/hạn mức",
     "Thanh toán phần BN",
     "Xác nhận"
    ],
    "expected": "Phần bảo lãnh trừ đúng tỉ lệ/hạn mức; vượt hạn mức thì phần dư chuyển BN trả; biên lai ghi rõ người bảo lãnh; OtherPayers liên kết đúng biên lai.",
    "evidence": [
     {
      "name": "TC-BIL-003__s01__list",
      "caption": "Danh sách người bảo lãnh",
      "uiState": "list"
     },
     {
      "name": "TC-BIL-003__s02__form",
      "caption": "Gán bảo lãnh vào biên lai",
      "uiState": "form"
     },
     {
      "name": "TC-BIL-003__s03__success",
      "caption": "Thanh toán phần BN sau bảo lãnh",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#232",
     "#236"
    ],
    "notes": "OtherPayers/BillingGuarantors."
   },
   {
    "id": "TC-BIL-004",
    "title": "Nộp tạm ứng cho BN nội trú và in phiếu",
    "category": "happy",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "BN nội trú đang điều trị (Admission active), chưa quyết toán.",
    "steps": [
     "Mở /v2/billing chọn BN nội trú",
     "Mở modal Tạm ứng",
     "Nhập số tiền tạm ứng + hình thức nộp",
     "Lưu",
     "In phiếu tạm ứng",
     "Xem lịch sử tạm ứng + số dư"
    ],
    "expected": "Tạo bản ghi Deposits; số dư tạm ứng tăng đúng; phiếu in đúng số tiền + BN; lịch sử hiển thị; audit log ghi.",
    "evidence": [
     {
      "name": "TC-BIL-004__s01__modal",
      "caption": "Modal nhập tạm ứng",
      "uiState": "modal"
     },
     {
      "name": "TC-BIL-004__s02__success",
      "caption": "Tạm ứng thành công + số dư",
      "uiState": "success"
     },
     {
      "name": "TC-BIL-004__s03__detail",
      "caption": "Lịch sử tạm ứng + phiếu in",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#232",
     "#234"
    ],
    "notes": "Deposits tạm ứng (luồng IPD)."
   },
   {
    "id": "TC-BIL-005",
    "title": "Quyết toán nội trú khấu trừ tạm ứng (hoàn/thu thêm)",
    "category": "happy",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "BN nội trú có Deposits số dư > 0, đủ điều kiện ra viện, tổng chi phí đã chốt.",
    "steps": [
     "Mở quyết toán biên lai BN nội trú",
     "Kiểm tra tổng chi phí điều trị",
     "Kiểm tra khấu trừ tạm ứng tự áp",
     "Trường hợp dư: hoàn tiền; thiếu: thu thêm",
     "Thanh toán/hoàn",
     "Xác nhận"
    ],
    "expected": "Tổng phải trả = chi phí - tạm ứng; dư → hoàn đúng số; thiếu → thu thêm đúng số; số dư Deposits về 0; PaymentTransaction ghi đúng chiều thu/hoàn.",
    "evidence": [
     {
      "name": "TC-BIL-005__s01__form",
      "caption": "Quyết toán khấu trừ tạm ứng",
      "uiState": "form"
     },
     {
      "name": "TC-BIL-005__s02__confirm",
      "caption": "Xác nhận hoàn/thu thêm",
      "uiState": "confirm"
     },
     {
      "name": "TC-BIL-005__s03__success",
      "caption": "Quyết toán thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#232",
     "#234"
    ],
    "notes": "Luồng quyết toán IPD."
   },
   {
    "id": "TC-BIL-006",
    "title": "Phát hành Hóa đơn điện tử (HĐĐT) sau khi thanh toán",
    "category": "state",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "Biên lai trạng thái Đã thu, chưa phát hành HĐĐT.",
    "steps": [
     "Mở biên lai Đã thu",
     "Bấm Phát hành HĐĐT",
     "Kiểm tra dữ liệu HĐĐT (thông tin BN, dịch vụ, tổng)",
     "Xác nhận phát hành",
     "Xem HĐĐT đã phát hành"
    ],
    "expected": "ElectronicInvoice tạo gắn biên lai; số HĐĐT cấp; trạng thái biên lai có cờ đã xuất HĐ; KHÔNG cho phát hành HĐĐT khi biên lai chưa thanh toán.",
    "evidence": [
     {
      "name": "TC-BIL-006__s01__detail",
      "caption": "Biên lai Đã thu trước phát hành HĐĐT",
      "uiState": "detail"
     },
     {
      "name": "TC-BIL-006__s02__confirm",
      "caption": "Xác nhận phát hành HĐĐT",
      "uiState": "confirm"
     },
     {
      "name": "TC-BIL-006__s03__success",
      "caption": "HĐĐT đã phát hành",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#232",
     "#238"
    ],
    "notes": "NOTES billing: HĐĐT sau thanh toán."
   },
   {
    "id": "TC-BIL-007",
    "title": "Validation các field bắt buộc khi lập biên lai",
    "category": "validation",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "Mở /v2/billing/edit cho 1 BN có dịch vụ.",
    "steps": [
     "Bỏ trống nguồn chi trả, bấm Thanh toán",
     "Chọn tiền mặt, để trống tiền khách đưa, Thanh toán",
     "Không chọn sổ biên lai, Thanh toán",
     "Quan sát thông báo lỗi từng field"
    ],
    "expected": "Mỗi field bắt buộc còn trống → chặn submit + hiển thị message lỗi rõ ngay dưới field; không tạo biên lai; không gọi API mutate khi validate fail.",
    "evidence": [
     {
      "name": "TC-BIL-007__s01__form",
      "caption": "Form trống các field bắt buộc",
      "uiState": "form"
     },
     {
      "name": "TC-BIL-007__s02__validation",
      "caption": "Lỗi validation từng field hiển thị",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#233"
    ],
    "notes": ""
   },
   {
    "id": "TC-BIL-008",
    "title": "Negative: tiền khách đưa nhỏ hơn tổng phải thu",
    "category": "negative",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "Editor biên lai có tổng phải thu xác định, nguồn = tiền mặt.",
    "steps": [
     "Nhập tiền khách đưa nhỏ hơn tổng phải thu",
     "Bấm Thanh toán",
     "Quan sát"
    ],
    "expected": "Chặn thanh toán hoặc cảnh báo thiếu tiền; tiền thối không âm; không tạo PaymentTransaction; thông báo lỗi rõ.",
    "evidence": [
     {
      "name": "TC-BIL-008__s01__form",
      "caption": "Nhập tiền đưa thiếu",
      "uiState": "form"
     },
     {
      "name": "TC-BIL-008__s02__error",
      "caption": "Cảnh báo thiếu tiền",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#233"
    ],
    "notes": ""
   },
   {
    "id": "TC-BIL-009",
    "title": "Edge: giá trị biên (0đ, số tiền rất lớn, số âm, số lẻ làm tròn)",
    "category": "edge",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "Editor biên lai/tạm ứng.",
    "steps": [
     "Nhập số tiền tạm ứng = 0 → Lưu",
     "Nhập số âm → Lưu",
     "Nhập số rất lớn (vd 9.999.999.999) → Lưu",
     "Dịch vụ có thành tiền lẻ (BHYT %) → kiểm tra làm tròn"
    ],
    "expected": "0 và số âm bị chặn với message; số rất lớn xử lý không tràn/format đúng dấu phân cách nghìn; làm tròn theo quy tắc nhất quán, tổng cộng khớp.",
    "evidence": [
     {
      "name": "TC-BIL-009__s01__validation",
      "caption": "Chặn 0/âm",
      "uiState": "validation"
     },
     {
      "name": "TC-BIL-009__s02__form",
      "caption": "Số rất lớn format đúng",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#233"
    ],
    "notes": ""
   },
   {
    "id": "TC-BIL-010",
    "title": "Edge: ghi chú/thu khác có ký tự đặc biệt + dấu tiếng Việt + chuỗi dài",
    "category": "edge",
    "priority": "P2",
    "role": "Thu ngân",
    "preconditions": "Editor có field ghi chú/lý do thu khác (OtherIncomes/AdditionalCharges).",
    "steps": [
     "Nhập ghi chú dài >500 ký tự có dấu tiếng Việt",
     "Nhập ký tự đặc biệt & < > \" ' %",
     "Lưu",
     "Mở lại xem hiển thị"
    ],
    "expected": "Chuỗi dài lưu/cắt theo giới hạn có cảnh báo; dấu tiếng Việt hiển thị đúng; ký tự đặc biệt được escape, KHÔNG thực thi (chống XSS — xem TC-BIL-021).",
    "evidence": [
     {
      "name": "TC-BIL-010__s01__form",
      "caption": "Nhập ghi chú đặc biệt + dài",
      "uiState": "form"
     },
     {
      "name": "TC-BIL-010__s02__detail",
      "caption": "Hiển thị lại an toàn",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#233"
    ],
    "notes": ""
   },
   {
    "id": "TC-BIL-011",
    "title": "Negative: hủy biên lai giữa chừng không tạo dữ liệu rác",
    "category": "negative",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "Đang ở editor biên lai chưa thanh toán.",
    "steps": [
     "Nhập dở dữ liệu",
     "Bấm Hủy / đóng drawer",
     "Mở lại danh sách Chờ thu kiểm tra"
    ],
    "expected": "Không tạo biên lai/PaymentTransaction; trạng thái BN vẫn Chờ thu; không sinh số biên lai phí; có xác nhận trước khi rời nếu có thay đổi chưa lưu.",
    "evidence": [
     {
      "name": "TC-BIL-011__s01__confirm",
      "caption": "Xác nhận hủy bỏ thay đổi",
      "uiState": "confirm"
     },
     {
      "name": "TC-BIL-011__s02__list",
      "caption": "Danh sách vẫn Chờ thu, không rác",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#233"
    ],
    "notes": ""
   },
   {
    "id": "TC-BIL-012",
    "title": "State: chặn thu tiền lại trên biên lai Đã thu/Đã khóa",
    "category": "state",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "Có biên lai trạng thái Đã thu và 1 HSBA có MedicalRecord.IsClosed=true (khóa viện phí).",
    "steps": [
     "Mở biên lai Đã thu, thử bấm Thu tiền lại",
     "Mở BN có viện phí đã khóa (IsClosed), thử sửa/thu thêm",
     "Quan sát"
    ],
    "expected": "Không cho thu lại trên biên lai Đã thu; HSBA đã khóa viện phí (IsClosed) chặn mọi mutation chi phí; nút thu/sửa disabled hoặc trả lỗi rõ; KHÔNG nhầm với khóa EMR (EmrFinalizedAt).",
    "evidence": [
     {
      "name": "TC-BIL-012__s01__detail",
      "caption": "Biên lai Đã thu nút Thu disabled",
      "uiState": "detail"
     },
     {
      "name": "TC-BIL-012__s02__error",
      "caption": "Chặn mutate khi viện phí đã khóa",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#232",
     "#233"
    ],
    "notes": "NOTES billing: khóa viện phí IsClosed KHÔNG nhầm EMR."
   },
   {
    "id": "TC-BIL-013",
    "title": "State: chuyển trạng thái không hợp lệ (hủy biên lai đã xuất HĐĐT)",
    "category": "state",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "Biên lai Đã thu và đã phát hành ElectronicInvoice.",
    "steps": [
     "Mở biên lai đã có HĐĐT",
     "Thử Hủy biên lai trực tiếp",
     "Quan sát"
    ],
    "expected": "Không cho hủy biên lai đã xuất HĐĐT (phải hủy/điều chỉnh HĐĐT trước); thông báo rõ ràng; trạng thái không đổi.",
    "evidence": [
     {
      "name": "TC-BIL-013__s01__detail",
      "caption": "Biên lai đã có HĐĐT",
      "uiState": "detail"
     },
     {
      "name": "TC-BIL-013__s02__error",
      "caption": "Chặn hủy + thông báo",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#232",
     "#238"
    ],
    "notes": ""
   },
   {
    "id": "TC-BIL-014",
    "title": "Hủy/hoàn biên lai hợp lệ và phản ánh đúng sổ quỹ",
    "category": "happy",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "Biên lai Đã thu chưa xuất HĐĐT, có quyền hoàn.",
    "steps": [
     "Mở biên lai Đã thu",
     "Bấm Hủy/Hoàn tiền, nhập lý do",
     "Xác nhận",
     "Kiểm tra /v2/payment-reports sổ quỹ + /v2/payment-transactions"
    ],
    "expected": "Biên lai chuyển Đã hủy; sinh PaymentTransaction chiều hoàn; CashBook/PaymentReports trừ đúng số thực thu; lý do hủy lưu; audit log ghi user + thời điểm.",
    "evidence": [
     {
      "name": "TC-BIL-014__s01__modal",
      "caption": "Modal nhập lý do hủy/hoàn",
      "uiState": "modal"
     },
     {
      "name": "TC-BIL-014__s02__success",
      "caption": "Biên lai Đã hủy",
      "uiState": "success"
     },
     {
      "name": "TC-BIL-014__s03__detail",
      "caption": "Sổ quỹ/giao dịch phản ánh hoàn",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#232",
     "#234"
    ],
    "notes": "data-consistency Receipt→CashBook."
   },
   {
    "id": "TC-BIL-015",
    "title": "Data-consistency: chi phí OPD/IPD ⟶ viện phí ⟶ báo cáo thu",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "BN có dịch vụ thêm mới ở OPD/CLS sau khi vào billing.",
    "steps": [
     "Ghi nhận tổng chi phí ở MedicalRecord (OPD)",
     "Mở /v2/billing, kiểm tra ReceiptDetails khớp dịch vụ",
     "Thanh toán",
     "Mở /v2/payment-reports xem tổng thu cộng đúng theo ngày/thu ngân"
    ],
    "expected": "DV trong MedicalRecord = ReceiptDetails (đủ dòng, đúng đơn giá); tổng thanh toán = tổng cộng trong PaymentReports/CashBook; không lệch số; audit khớp.",
    "evidence": [
     {
      "name": "TC-BIL-015__s01__detail",
      "caption": "ReceiptDetails khớp DV MedicalRecord",
      "uiState": "detail"
     },
     {
      "name": "TC-BIL-015__s02__detail",
      "caption": "PaymentReports tổng đúng",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#232",
     "#235"
    ],
    "notes": "rel: MedicalRecord⟶Receipts⟶ReceiptDetails⟶Payments."
   },
   {
    "id": "TC-BIL-016",
    "title": "Data-consistency: phụ thu/thu khác cộng đúng vào tổng và sổ quỹ",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "Editor có thêm AdditionalCharges + OtherIncomes.",
    "steps": [
     "Thêm 1 phụ thu + 1 thu khác có số tiền",
     "Kiểm tra tổng phải thu cộng đủ",
     "Thanh toán",
     "Đối chiếu PaymentReports phân loại thu khác"
    ],
    "expected": "Tổng = DV + phụ thu + thu khác; PaymentReports tách đúng khoản mục; không double-count; audit ghi.",
    "evidence": [
     {
      "name": "TC-BIL-016__s01__form",
      "caption": "Thêm phụ thu + thu khác",
      "uiState": "form"
     },
     {
      "name": "TC-BIL-016__s02__detail",
      "caption": "Báo cáo tách khoản mục đúng",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#235"
    ],
    "notes": "AdditionalCharges/OtherIncomes."
   },
   {
    "id": "TC-BIL-017",
    "title": "Permission: vai trò không phải thu ngân bị chặn menu/nút/API",
    "category": "permission",
    "priority": "P0",
    "role": "Bác sĩ (không quyền thu ngân)",
    "preconditions": "Có tài khoản role Bác sĩ/Điều dưỡng không có quyền billing (theo matrix #216).",
    "steps": [
     "Đăng nhập role không có quyền billing",
     "Kiểm tra menu Viện phí có ẩn không",
     "Truy cập thẳng URL /v2/billing",
     "Gọi thẳng API thu tiền (DevTools)"
    ],
    "expected": "Menu Viện phí ẩn; vào URL trực tiếp bị chặn/redirect; API mutate trả 403; không lộ dữ liệu thu.",
    "evidence": [
     {
      "name": "TC-BIL-017__s01__permission",
      "caption": "Menu billing ẩn với role không quyền",
      "uiState": "permission"
     },
     {
      "name": "TC-BIL-017__s02__error",
      "caption": "Truy cập URL/API bị 403",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216"
    ],
    "notes": "Tham chiếu permission matrix #216."
   },
   {
    "id": "TC-BIL-018",
    "title": "Permission: chỉ quản trị mới cấp/khóa sổ biên lai",
    "category": "permission",
    "priority": "P1",
    "role": "Thu ngân thường vs Quản trị thu ngân",
    "preconditions": "2 role: thu ngân thường, quản trị sổ biên lai.",
    "steps": [
     "Đăng nhập thu ngân thường mở /v2/receipt-book-admin",
     "Thử cấp sổ/khóa sổ",
     "Đăng nhập quản trị thử lại"
    ],
    "expected": "Thu ngân thường không thấy/không thao tác được cấp-khóa sổ; quản trị thực hiện được; API cấp sổ chặn role thiếu quyền.",
    "evidence": [
     {
      "name": "TC-BIL-018__s01__permission",
      "caption": "Thu ngân thường bị chặn cấp sổ",
      "uiState": "permission"
     },
     {
      "name": "TC-BIL-018__s02__success",
      "caption": "Quản trị cấp sổ thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#216"
    ],
    "notes": "ReceiptBookAdmin."
   },
   {
    "id": "TC-BIL-019",
    "title": "Security: IDOR — thu ngân không xem/ thu biên lai BN ngoài phạm vi",
    "category": "security",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "Biết receiptId/medicalRecordId của BN khác (không thuộc danh sách của thu ngân).",
    "steps": [
     "Lấy id biên lai BN A",
     "Đổi id trong request GET/POST sang BN B",
     "Quan sát response"
    ],
    "expected": "Server kiểm tra quyền theo bản ghi; trả 403/404 cho id không thuộc phạm vi; KHÔNG trả dữ liệu/biên lai BN khác; không cho mutate chéo.",
    "evidence": [
     {
      "name": "TC-BIL-019__s01__error",
      "caption": "Truy cập biên lai BN khác bị chặn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216"
    ],
    "notes": "IDOR receipt/medicalRecord."
   },
   {
    "id": "TC-BIL-020",
    "title": "Security: anonymous endpoint billing không lộ khi chưa login",
    "category": "security",
    "priority": "P0",
    "role": "Khách (chưa đăng nhập)",
    "preconditions": "Chưa đăng nhập (không có JWT).",
    "steps": [
     "Xóa token localStorage",
     "Gọi trực tiếp API danh sách biên lai/giao dịch/sổ quỹ",
     "Quan sát"
    ],
    "expected": "Tất cả endpoint billing yêu cầu JWT; trả 401 khi không token; không endpoint thu/báo cáo nào để anonymous.",
    "evidence": [
     {
      "name": "TC-BIL-020__s01__error",
      "caption": "API billing trả 401 khi chưa login",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216"
    ],
    "notes": ""
   },
   {
    "id": "TC-BIL-021",
    "title": "Security: XSS ở field ghi chú/lý do hủy/thu khác",
    "category": "security",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "Field ghi chú/lý do (OtherIncomes, lý do hủy) cho phép text tự do.",
    "steps": [
     "Nhập payload <img src=x onerror=alert(1)> vào ghi chú",
     "Lưu",
     "Mở lại biên lai/báo cáo hiển thị ghi chú",
     "Quan sát có alert/thực thi không"
    ],
    "expected": "Nội dung hiển thị dưới dạng text thuần (escaped), KHÔNG thực thi script; lưu nguyên/sanitize an toàn; không phá layout.",
    "evidence": [
     {
      "name": "TC-BIL-021__s01__form",
      "caption": "Nhập payload XSS vào ghi chú",
      "uiState": "form"
     },
     {
      "name": "TC-BIL-021__s02__detail",
      "caption": "Hiển thị escape an toàn",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#216"
    ],
    "notes": ""
   },
   {
    "id": "TC-BIL-022",
    "title": "Integration: thanh toán QR ngân hàng (VietQR) và liên kết về biên lai",
    "category": "integration",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "BankPayments cấu hình QR (MockMode dev). Có biên lai Chờ thu cần thu online.",
    "steps": [
     "Mở /v2/bank-payments hoặc chọn nguồn QR trong editor",
     "Sinh mã QR cho số tiền biên lai",
     "Giả lập IPN/xác nhận thanh toán (hoặc xác nhận thủ công)",
     "Kiểm tra biên lai liên kết OnlinePayment"
    ],
    "expected": "QR sinh đúng số tiền; khi IPN thành công → OnlinePayment=Success, biên lai chuyển Đã thu, gắn PaymentTransaction; thất bại/timeout → trạng thái chờ/thất bại rõ; idempotent (IPN trùng không thu 2 lần).",
    "evidence": [
     {
      "name": "TC-BIL-022__s01__form",
      "caption": "Sinh QR thanh toán",
      "uiState": "form"
     },
     {
      "name": "TC-BIL-022__s02__loading",
      "caption": "Chờ xác nhận thanh toán online",
      "uiState": "loading"
     },
     {
      "name": "TC-BIL-022__s03__success",
      "caption": "Thanh toán online thành công liên kết biên lai",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#232",
     "#238"
    ],
    "notes": "OnlinePayments/BankPayments."
   },
   {
    "id": "TC-BIL-023",
    "title": "Integration: xác nhận thủ công giao dịch ngân hàng chưa khớp IPN",
    "category": "integration",
    "priority": "P1",
    "role": "Thu ngân/Quản trị",
    "preconditions": "Có giao dịch online trạng thái Chờ (IPN chưa về).",
    "steps": [
     "Mở /v2/bank-payments lọc trạng thái Chờ",
     "Đối chiếu sao kê, bấm Xác nhận thủ công",
     "Nhập tham chiếu giao dịch",
     "Xác nhận"
    ],
    "expected": "Giao dịch chuyển Thành công + liên kết biên lai; ghi người xác nhận thủ công vào audit; không cho xác nhận trùng.",
    "evidence": [
     {
      "name": "TC-BIL-023__s01__filter",
      "caption": "Lọc giao dịch Chờ",
      "uiState": "filter"
     },
     {
      "name": "TC-BIL-023__s02__confirm",
      "caption": "Xác nhận thủ công",
      "uiState": "confirm"
     },
     {
      "name": "TC-BIL-023__s03__success",
      "caption": "Đã xác nhận",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#238"
    ],
    "notes": ""
   },
   {
    "id": "TC-BIL-024",
    "title": "UI: empty/loading/error state các màn billing",
    "category": "ui",
    "priority": "P2",
    "role": "Thu ngân",
    "preconditions": "Có thể giả lập danh sách rỗng và lỗi API.",
    "steps": [
     "Lọc điều kiện không có kết quả → quan sát empty",
     "Tải trang khi mạng chậm → quan sát loading skeleton",
     "Ngắt API (DevTools offline) → quan sát error + nút thử lại"
    ],
    "expected": "Empty hiển thị thông báo + gợi ý; loading có skeleton/spinner không nháy layout; error rõ ràng + retry; không trắng trang/không lỗi console không kiểm soát.",
    "evidence": [
     {
      "name": "TC-BIL-024__s01__empty",
      "caption": "Danh sách rỗng",
      "uiState": "empty"
     },
     {
      "name": "TC-BIL-024__s02__loading",
      "caption": "Trạng thái loading",
      "uiState": "loading"
     },
     {
      "name": "TC-BIL-024__s03__error",
      "caption": "Lỗi API + retry",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#233"
    ],
    "notes": ""
   },
   {
    "id": "TC-BIL-025",
    "title": "UI: dark/light parity + format tiền/ngày tiếng Việt",
    "category": "ui",
    "priority": "P2",
    "role": "Thu ngân",
    "preconditions": "Topbar v2 có toggle dark/light.",
    "steps": [
     "Mở /v2/billing ở light",
     "Toggle dark",
     "Kiểm tra số tiền (dấu phân cách nghìn, đơn vị đ/VND), ngày dd/MM/yyyy, dấu tiếng Việt",
     "Đối chiếu tương phản chữ/nền ở dark"
    ],
    "expected": "Light/dark đồng bộ, đủ tương phản; số tiền format nhất quán (1.000.000 đ); ngày đúng định dạng VN; dấu tiếng Việt không vỡ; không chữ chìm nền.",
    "evidence": [
     {
      "name": "TC-BIL-025__s01__list",
      "caption": "Billing light mode",
      "uiState": "list"
     },
     {
      "name": "TC-BIL-025__s02__list",
      "caption": "Billing dark mode",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#233"
    ],
    "notes": ""
   },
   {
    "id": "TC-BIL-026",
    "title": "Báo cáo thu theo ca/thu ngân/đối tượng và xuất file",
    "category": "happy",
    "priority": "P1",
    "role": "Thu ngân/Kế toán",
    "preconditions": "Có giao dịch thu trong ngày nhiều phương thức.",
    "steps": [
     "Mở /v2/payment-reports",
     "Chọn khoảng ngày + thu ngân",
     "Xem tổng thu/hoàn/thực thu theo ca, đối tượng (BHYT/Viện phí/DV)",
     "Xuất Excel/PDF"
    ],
    "expected": "Số liệu tổng hợp khớp PaymentTransactions/CashBook; phân loại đúng đối tượng/phương thức; file xuất đúng nội dung hiển thị.",
    "evidence": [
     {
      "name": "TC-BIL-026__s01__filter",
      "caption": "Lọc báo cáo theo ngày/thu ngân",
      "uiState": "filter"
     },
     {
      "name": "TC-BIL-026__s02__detail",
      "caption": "Bảng tổng hợp thu",
      "uiState": "detail"
     },
     {
      "name": "TC-BIL-026__s03__success",
      "caption": "Xuất file thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#232",
     "#235"
    ],
    "notes": "PaymentReports/CashBooks/InvoiceSummaries."
   },
   {
    "id": "TC-BIL-027",
    "title": "Edge: lọc báo cáo với ngày tương lai / khoảng đảo ngược / khoảng rất rộng",
    "category": "edge",
    "priority": "P2",
    "role": "Thu ngân",
    "preconditions": "Mở /v2/payment-reports.",
    "steps": [
     "Chọn từ-ngày > đến-ngày",
     "Chọn đến-ngày ở tương lai",
     "Chọn khoảng nhiều năm",
     "Quan sát"
    ],
    "expected": "Khoảng đảo ngược bị chặn/cảnh báo; ngày tương lai cho phép nhưng kết quả rỗng hợp lý; khoảng rộng có phân trang/không treo trình duyệt.",
    "evidence": [
     {
      "name": "TC-BIL-027__s01__validation",
      "caption": "Cảnh báo khoảng ngày không hợp lệ",
      "uiState": "validation"
     },
     {
      "name": "TC-BIL-027__s02__empty",
      "caption": "Kết quả rỗng ngày tương lai",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#235"
    ],
    "notes": ""
   },
   {
    "id": "TC-BIL-028",
    "title": "Negative: thao tác sai thứ tự — phát hành HĐĐT trước khi thanh toán",
    "category": "negative",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "Biên lai trạng thái Chờ thu (chưa thanh toán).",
    "steps": [
     "Mở biên lai Chờ thu",
     "Thử bấm/ gọi Phát hành HĐĐT",
     "Quan sát"
    ],
    "expected": "Chặn phát hành HĐĐT khi chưa thanh toán; nút disabled hoặc API trả lỗi nghiệp vụ rõ; trạng thái không đổi.",
    "evidence": [
     {
      "name": "TC-BIL-028__s01__detail",
      "caption": "Biên lai chưa thanh toán",
      "uiState": "detail"
     },
     {
      "name": "TC-BIL-028__s02__error",
      "caption": "Chặn phát hành HĐĐT sai thứ tự",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#238"
    ],
    "notes": "NOTES billing: HĐĐT sau thanh toán."
   },
   {
    "id": "TC-BIL-029",
    "title": "Data-consistency: tách/gộp bill nhiều biên lai cho 1 đợt điều trị",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "BN có nhiều nhóm dịch vụ; cho phép tách hoặc gộp biên lai.",
    "steps": [
     "Chọn tách 1 phần dịch vụ thành biên lai riêng",
     "Thanh toán từng biên lai",
     "Đối chiếu tổng cộng các biên lai = tổng chi phí đợt điều trị"
    ],
    "expected": "Tách/gộp không làm trùng/sót dịch vụ; mỗi DV chỉ nằm 1 biên lai; tổng các biên lai = tổng chi phí; InvoiceSummaries tổng hợp đúng.",
    "evidence": [
     {
      "name": "TC-BIL-029__s01__form",
      "caption": "Tách bill",
      "uiState": "form"
     },
     {
      "name": "TC-BIL-029__s02__detail",
      "caption": "Tổng các biên lai khớp đợt điều trị",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#232",
     "#235"
    ],
    "notes": "NOTES billing: tách/gộp bill."
   },
   {
    "id": "TC-BIL-030",
    "title": "State: chặn xuất viện khi còn nợ viện phí/tạm ứng chưa quyết toán",
    "category": "state",
    "priority": "P0",
    "role": "Thu ngân/Điều dưỡng",
    "preconditions": "BN nội trú còn công nợ hoặc chưa quyết toán tạm ứng (luồng discharge: Kiểm tra nợ/đơn/CLS).",
    "steps": [
     "Mở BN nội trú còn nợ, thử quyết toán/đánh dấu đủ điều kiện ra viện",
     "Quan sát điều kiện kiểm tra nợ",
     "Quyết toán hết nợ rồi thử lại"
    ],
    "expected": "Khi còn nợ → chặn hoàn tất viện phí/khóa, cảnh báo số nợ; sau khi thu đủ + quyết toán tạm ứng → cho khóa viện phí (IsClosed) và đủ điều kiện ra viện.",
    "evidence": [
     {
      "name": "TC-BIL-030__s01__error",
      "caption": "Chặn do còn nợ viện phí",
      "uiState": "error"
     },
     {
      "name": "TC-BIL-030__s02__success",
      "caption": "Đủ điều kiện sau khi thu đủ",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#232",
     "#234"
    ],
    "notes": "Luồng discharge: kiểm tra nợ trước ra viện."
   }
  ],
  "ui_state_checklist": [
   "list — danh sách thu ngân/biên lai/giao dịch (Chờ thu/Đã thu/Đã hủy/Đã khóa)",
   "detail — chi tiết biên lai/HĐĐT/sổ quỹ/báo cáo",
   "form — editor lập/sửa biên lai, nhập tiền, nguồn chi trả",
   "modal — tạm ứng, hủy/hoàn, xác nhận thủ công",
   "drawer — drawer chi tiết biên lai (nếu dùng DrawerShell)",
   "tab — StatusTabs trạng thái biên lai / TopTabs phân loại đối tượng",
   "filter — lọc ngày/thu ngân/phương thức/đối tượng/trạng thái online",
   "dropdown — chọn nguồn chi trả / sổ biên lai / phương thức",
   "validation — lỗi field bắt buộc, số tiền 0/âm, khoảng ngày sai",
   "empty — danh sách/báo cáo rỗng",
   "loading — skeleton/spinner khi tải + chờ thanh toán online",
   "error — lỗi API, 401/403, chặn nghiệp vụ (sai thứ tự, đã khóa, còn nợ)",
   "confirm — xác nhận thanh toán/hủy/phát hành HĐĐT",
   "success — thu thành công, HĐĐT phát hành, quyết toán xong",
   "toast — thông báo thành công/thất bại",
   "permission — menu/nút ẩn, chặn role không quyền"
  ],
  "gaps": [
   "Chưa rõ UI tạm ứng (Deposits) và tách/gộp bill là modal hay tab riêng — cần xác nhận trong BillingEditor.tsx để chốt route_guess (hiện suy luận).",
   "Sổ quỹ CashBooks và InvoiceSummaries chưa thấy route v2 riêng — đang gộp vào PaymentReports; cần kiểm tra có màn riêng để bổ sung test đối chiếu cuối ca/khóa sổ quỹ.",
   "Thiếu test khóa sổ quỹ cuối ca/cuối ngày (chốt sổ, không cho sửa giao dịch sau khóa) — cần bổ sung khi xác nhận có chức năng.",
   "Chưa có test cụ thể TransportServices/GasolinePrices (DV vận chuyển + giá xăng) tính vào viện phí — bảng có trong module nhưng chưa rõ màn; cần bổ sung nếu có UI cấu hình giá + tính phí vận chuyển.",
   "Hủy/điều chỉnh HĐĐT (thay thế, điều chỉnh giảm) chưa được phủ đầy đủ — mới chặn hủy; cần luồng phát hành HĐ điều chỉnh khi đã sai.",
   "Concurrency: 2 thu ngân cùng thu 1 biên lai (race) — cần test optimistic lock/khóa bản ghi để tránh thu trùng.",
   "Đối soát online: IPN trùng/đến muộn/sai chữ ký — mới chạm idempotent ở mức cơ bản, nên có test bảo mật chữ ký IPN.",
   "Permission chi tiết theo matrix #216 (ai được hoàn/hủy/cấp sổ/xem báo cáo toàn viện vs theo ca) cần map cụ thể từng quyền khi có matrix thực tế.",
   "Làm tròn BHYT % và quy tắc đồng/làm tròn 100đ cần chốt rule nghiệp vụ để assert chính xác (hiện kiểm tra nhất quán, chưa biết quy tắc đích)."
  ]
 },
 {
  "id": "insurance",
  "code": "INS",
  "layer": "fin",
  "ic": "🛡️",
  "nm": "BHYT & Giám định",
  "gh": [
   "#232",
   "#265",
   "#266",
   "#277"
  ],
  "gap": false,
  "module_id": "insurance",
  "summary": "Phân hệ BHYT & Giám định (INS, lớp fin) quản lý vòng đời hồ sơ BHYT: từ MedicalRecord(BHYT) ⟶ InsuranceClaims/InsuranceClaimDetails ⟶ xuất XML 1-7 chuẩn BHXH (QĐ 4210/4750/130) ⟶ nộp cổng BHXH (InsuranceXMLSubmissions) ⟶ giám định/quyết toán/đối soát (BhxhAuditSessions, InsuranceRejections, InsuranceStatisticsRecords) + thanh tra (BhxhInspectorAccounts/AccessLogs qua Inspector Portal). Các màn chính trong FE v2: Insurance (danh sách hồ sơ BHYT + drawer chi tiết chi phí), BhxhAudit (phiên giám định + tab Import CSV + xuất XML/ZIP + gửi cổng hàng loạt), BhxhConfig (cấu hình cổng + test connection/auth/submit-xml), BhytFullCoverage (BN miễn 100% CRUD), InspectorPortal (cổng thanh tra BHXH login riêng standalone). Ràng buộc nghiệp vụ: đúng/trái tuyến + thông tuyến ảnh hưởng mức hưởng, mã LK duy nhất, khóa hồ sơ sau chốt, audit log mọi mutation (InsuranceActivityLogs).",
  "screens": [
   {
    "name": "Danh sách hồ sơ BHYT (Insurance v2)",
    "desc": "List hồ sơ BHYT 60 ngày gần nhất, KpiStrip 6 chỉ số (tổng/chờ duyệt/đã duyệt/từ chối/tổng tiền/BHYT chi trả), StatusTabs theo trạng thái, search BN/mã LK/số thẻ/CĐ, drawer chi tiết chi phí, xuất CSV, in phiếu BHYT.",
    "route_guess": "/v2/insurance",
    "elements": [
     "KpiStrip 6 ô",
     "StatusTabs (Nháp/Chờ gửi/Đã gửi/Đã duyệt/Từ chối)",
     "SearchBox",
     "Btn Bỏ lọc/Làm mới/Validate XML/Xuất CSV/Gửi BHXH",
     "DataTable (Mã LK, BN, Số thẻ BHYT, Chẩn đoán, Vào/Ra viện, Tổng tiền, BHYT chi trả, TT)",
     "ActBtn xem chi tiết + in phiếu",
     "Pager",
     "DrawerShell chi tiết (Trạng thái/BN&thẻ/Chẩn đoán/Chi phí/Lý do từ chối)"
    ]
   },
   {
    "name": "Giám định BHXH - Phiên giám định (BhxhAudit v2)",
    "desc": "Tab Phiên giám định: list hồ sơ giám định, KpiStrip 6 ô, filter theo Khoa, StatusTabs (Chờ duyệt/Đã duyệt/Bị từ chối), duyệt từng hồ sơ (modal ghi chú), gửi cổng BHXH lẻ + hàng loạt, xuất XML lẻ + ZIP hàng loạt, in phiếu, drawer chi tiết tài chính + trạng thái cổng.",
    "route_guess": "/v2/bhxh-audit",
    "elements": [
     "Main tab Phiên giám định / Import CSV",
     "KpiStrip",
     "SearchBox + Filter Khoa",
     "Btn Xuất XML/Xuất XML hàng loạt/Gửi tất cả lên cổng",
     "StatusTabs",
     "DataTable (Mã LK, BN, Số BHYT, Khoa, ICD, Tổng tiền, BHYT, Trạng thái)",
     "ActBtn xem/duyệt/gửi cổng",
     "modal confirm duyệt + textarea ghi chú",
     "DrawerShell (BN/Chẩn đoán/Tài chính có tỷ lệ BHYT/Trạng thái cổng) + footer In/Xuất XML/Duyệt"
    ]
   },
   {
    "name": "Giám định BHXH - Import CSV (BhxhAudit tab Import)",
    "desc": "Tab Import CSV: upload file CSV giám định, hiển thị kết quả batch (số dòng import/lỗi/bỏ qua), StatusTabs (Tất cả/Chưa duyệt/Đã duyệt/Từ chối), bảng dòng đã import, search, phân trang.",
    "route_guess": "/v2/bhxh-audit (tab Import CSV)",
    "elements": [
     "Btn Upload CSV giám định",
     "input file accept .csv ẩn",
     "panel kết quả batch (importBatchCode, importedRows/totalRows, errors details)",
     "StatusTabs import",
     "DataTable (#, Mã hồ sơ, Họ tên, Số thẻ BHYT, Ngày vào/ra, Khoa, Viện phí, BHYT, Trạng thái)",
     "SearchBox",
     "Pager"
    ]
   },
   {
    "name": "Cấu hình cổng BHXH (BhxhConfig v2)",
    "desc": "TopTabs Cấu hình / Test tools. Tab Cấu hình: form gatewayUrl/tokenUrl/username/password/maCSKCB/maDVI/timeout/environment. Tab Test: test-connection, test-auth, test-submit-xml với XML editor + endpoint, hiển thị kết quả (reachable/authenticated/success + latency).",
    "route_guess": "/v2/bhxh-config",
    "elements": [
     "TopTabs Cấu hình/Test tools",
     "Form (gatewayUrl, tokenUrl, username, password, maCSKCB, maDVI, timeout, environment Select)",
     "Btn Lưu cấu hình",
     "textarea XML test",
     "Input endpoint",
     "Btn Test connection/Test auth/Test submit XML",
     "StatusBadge kết quả + latencyMs"
    ]
   },
   {
    "name": "BN miễn 100% BHYT (BhytFullCoverage v2)",
    "desc": "SimpleV2Page CRUD danh sách BN được BHYT miễn cùng chi trả 100%: list + modal thêm/sửa (patientId, effectiveFrom/To, medicineScopeJson, note), xóa.",
    "route_guess": "/v2/bhyt-full-coverage",
    "elements": [
     "KpiStrip",
     "DataTable",
     "Btn Thêm",
     "Modal form (patientId, effectiveFrom DatePicker, effectiveTo DatePicker, medicineScopeJson, note)",
     "Btn Lưu/Xóa",
     "StatusBadge hiệu lực"
    ]
   },
   {
    "name": "Cổng thanh tra BHXH (InspectorPortal standalone)",
    "desc": "Cổng giám định viên BHXH login RIÊNG (route ngoài layout chính), token lưu key inspector_token/inspector_info. Login gradient card 460px, workspace: top bar + filter card + table HSBA + modal chi tiết hồ sơ bệnh án giám định.",
    "route_guess": "/inspector-portal",
    "elements": [
     "Màn login riêng (username/password, gradient)",
     "top bar workspace + logout",
     "Card filter",
     "Card table HSBA (InspectorRecordListItemDto)",
     "Modal chi tiết HSBA (InspectorRecordDetailDto)",
     "format tiền/ngày VN"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-INS-001",
    "title": "Xem danh sách hồ sơ BHYT 60 ngày + KPI strip hiển thị đúng",
    "category": "happy",
    "priority": "P0",
    "role": "Nhân viên BHYT",
    "preconditions": "Đăng nhập admin/Admin@123; có sẵn >=1 hồ sơ BHYT trong 60 ngày gần nhất.",
    "steps": [
     "Đăng nhập, vào /v2/insurance",
     "Đợi DataTable tải xong",
     "Đối chiếu 6 ô KpiStrip (Tổng hồ sơ, Chờ duyệt, Đã duyệt, Từ chối, Tổng tiền tr, BHYT chi trả tr) với số dòng + tổng cột trong bảng",
     "Kiểm tra cột Tổng tiền/BHYT chi trả format VND có dấu phân cách ngàn + ₫"
    ],
    "expected": "Bảng hiển thị các hồ sơ; KPI 'Tổng hồ sơ' = số dòng; tổng tiền/BHYT (tr) = sum cột /1.000.000 làm tròn; approvalRate% đúng = đã duyệt/tổng; tiền hiển thị dạng vi-VN (vd 1.250.000 ₫).",
    "evidence": [
     {
      "name": "TC-INS-001__s01__list",
      "caption": "Danh sách hồ sơ BHYT + KpiStrip",
      "uiState": "list"
     },
     {
      "name": "TC-INS-001__s02__loading",
      "caption": "Trạng thái đang tải bảng",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#232",
     "#265"
    ],
    "notes": "Cross-check KPI vs data đúng dạng data-consistency nhẹ; tách phần audit-log ra task riêng."
   },
   {
    "id": "TC-INS-002",
    "title": "Lọc hồ sơ BHYT theo StatusTabs (Nháp/Chờ gửi/Đã gửi/Đã duyệt/Từ chối)",
    "category": "state",
    "priority": "P0",
    "role": "Nhân viên BHYT",
    "preconditions": "Có hồ sơ ở nhiều trạng thái khác nhau (status 0-4).",
    "steps": [
     "Vào /v2/insurance",
     "Lần lượt bấm từng tab trạng thái",
     "Quan sát số đếm trên tab vs số dòng lọc ra",
     "Bấm 'Bỏ lọc' để về 'all'"
    ],
    "expected": "Mỗi tab chỉ hiển thị hồ sơ đúng statusKey (4=Từ chối,3=Đã duyệt,2=Đã gửi,1=Chờ gửi,0=Nháp); count trên tab khớp số dòng; 'Bỏ lọc' reset về all + clear search.",
    "evidence": [
     {
      "name": "TC-INS-002__s01__tab",
      "caption": "Tab Đã duyệt được chọn",
      "uiState": "tab"
     },
     {
      "name": "TC-INS-002__s02__filter",
      "caption": "Sau khi bỏ lọc về all",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-003",
    "title": "Tìm kiếm hồ sơ BHYT theo BN/mã LK/số thẻ/chẩn đoán + ký tự tiếng Việt có dấu",
    "category": "edge",
    "priority": "P1",
    "role": "Nhân viên BHYT",
    "preconditions": "Có hồ sơ với tên BN có dấu tiếng Việt (vd 'Nguyễn Văn Đức').",
    "steps": [
     "Vào /v2/insurance",
     "Nhập tên có dấu vào SearchBox",
     "Nhập một phần mã LK",
     "Nhập chuỗi rất dài (>200 ký tự) + ký tự đặc biệt '<>%&\"'",
     "Xóa search"
    ],
    "expected": "Lọc client khớp case-insensitive trên maLk/patientName/patientCode/insuranceNumber/diagnosisName; tên có dấu tìm đúng; chuỗi dài/ký tự đặc biệt không vỡ UI, ra empty hợp lý; không XSS render.",
    "evidence": [
     {
      "name": "TC-INS-003__s01__filter",
      "caption": "Tìm theo tên có dấu",
      "uiState": "filter"
     },
     {
      "name": "TC-INS-003__s02__empty",
      "caption": "Search ký tự lạ ra empty",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#232",
     "#277"
    ]
   },
   {
    "id": "TC-INS-004",
    "title": "Mở drawer chi tiết hồ sơ BHYT - hiển thị đủ 5 section + lý do từ chối",
    "category": "happy",
    "priority": "P0",
    "role": "Nhân viên BHYT",
    "preconditions": "Có 1 hồ sơ trạng thái Từ chối (status=4, có rejectReason) và 1 hồ sơ thường.",
    "steps": [
     "Vào /v2/insurance",
     "Click 1 dòng hồ sơ thường mở DrawerShell",
     "Đối chiếu các section Trạng thái/BN&thẻ/Chẩn đoán/Chi phí",
     "Đóng, mở hồ sơ Từ chối",
     "Kiểm tra section 'LÝ DO TỪ CHỐI' xuất hiện"
    ],
    "expected": "Drawer mở size lg; hiển thị mã LK + tên BN ở title; Chi phí gồm Tổng tiền/BHYT chi trả/BN đồng chi trả/BN tự trả đúng số; hồ sơ Từ chối mới hiện section lý do (màu crit), hồ sơ thường KHÔNG hiện.",
    "evidence": [
     {
      "name": "TC-INS-004__s01__drawer",
      "caption": "Drawer chi tiết hồ sơ thường",
      "uiState": "drawer"
     },
     {
      "name": "TC-INS-004__s02__detail",
      "caption": "Section lý do từ chối ở hồ sơ rejected",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-005",
    "title": "Xuất CSV hồ sơ BHYT - BOM UTF-8 mở Excel đúng tiếng Việt + escape dấu phẩy",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Nhân viên BHYT",
    "preconditions": "Có >=1 hồ sơ; có hồ sơ với chẩn đoán chứa dấu phẩy trong tên.",
    "steps": [
     "Vào /v2/insurance, áp 1 bộ lọc",
     "Bấm 'Xuất CSV'",
     "Mở file tải về bằng Excel",
     "Kiểm tra header + cột tiền + cột chẩn đoán có dấu phẩy"
    ],
    "expected": "Tải file bhyt-claims-YYYYMMDD-HHmm.csv; toast success 'Đã xуất N hồ sơ BHYT' với N=số dòng đã lọc; Excel hiển thị tiếng Việt đúng (BOM); ô có dấu phẩy/quote được bọc và escape; chỉ xuất các dòng đã lọc (không phải toàn bộ).",
    "evidence": [
     {
      "name": "TC-INS-005__s01__toast",
      "caption": "Toast xuất CSV thành công",
      "uiState": "toast"
     },
     {
      "name": "TC-INS-005__s02__success",
      "caption": "File CSV mở trong Excel đúng dấu",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#232",
     "#266"
    ]
   },
   {
    "id": "TC-INS-006",
    "title": "In phiếu BHYT từ action row - mở drawer rồi gọi print",
    "category": "ui",
    "priority": "P2",
    "role": "Nhân viên BHYT",
    "preconditions": "Có >=1 hồ sơ BHYT.",
    "steps": [
     "Vào /v2/insurance",
     "Bấm ActBtn 'In phiếu BHYT' trên 1 dòng",
     "Quan sát drawer mở + dialog in trình duyệt"
    ],
    "expected": "Drawer chi tiết set theo dòng đó, sau ~300ms window.print() được gọi; nội dung in chứa thông tin BN + chi phí; không in nhầm hồ sơ khác.",
    "evidence": [
     {
      "name": "TC-INS-006__s01__modal",
      "caption": "Dialog in trình duyệt mở",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-007",
    "title": "Empty state khi không có hồ sơ BHYT trong kỳ",
    "category": "ui",
    "priority": "P1",
    "role": "Nhân viên BHYT",
    "preconditions": "Kỳ 60 ngày không có hồ sơ HOẶC search ra rỗng.",
    "steps": [
     "Vào /v2/insurance với search không khớp",
     "Quan sát empty state của DataTable"
    ],
    "expected": "Hiển thị empty 'Không có hồ sơ BHYT nào' với icon search; KPI = 0; không lỗi console; Pager hiển thị 1 trang.",
    "evidence": [
     {
      "name": "TC-INS-007__s01__empty",
      "caption": "Empty state danh sách BHYT",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-008",
    "title": "Lỗi tải danh sách BHYT khi API fail - không vỡ trang",
    "category": "negative",
    "priority": "P1",
    "role": "Nhân viên BHYT",
    "preconditions": "Mô phỏng API /insurance/claims/search trả 500 hoặc mất mạng.",
    "steps": [
     "Chặn/cho fail endpoint searchInsuranceClaims",
     "Vào /v2/insurance",
     "Quan sát hành vi"
    ],
    "expected": "catch -> setRows([]); bảng hiển thị empty thay vì crash; KPI = 0; không có lỗi console chưa bắt làm trắng trang.",
    "evidence": [
     {
      "name": "TC-INS-008__s01__error",
      "caption": "API fail vẫn hiển thị empty an toàn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#232"
    ],
    "notes": "Hiện code nuốt lỗi im lặng -> kiểm tra có nên show error banner (gap)."
   },
   {
    "id": "TC-INS-009",
    "title": "Dark/light parity màn danh sách BHYT + drawer",
    "category": "ui",
    "priority": "P2",
    "role": "Nhân viên BHYT",
    "preconditions": "Có toggle dark/light ở topbar v2.",
    "steps": [
     "Vào /v2/insurance ở light mode",
     "Mở drawer chi tiết",
     "Toggle sang dark",
     "Đối chiếu màu chữ/nền/StatusBadge/màu tiền (xanh BHYT, cam BN tự trả)"
    ],
    "expected": "Cả 2 theme đọc được, đủ tương phản; StatusBadge tone giữ nghĩa; màu BHYT chi trả (#15803d) + BN tự trả không bị chìm; không có vùng trắng/đen cứng.",
    "evidence": [
     {
      "name": "TC-INS-009__s01__list",
      "caption": "Danh sách ở dark mode",
      "uiState": "list"
     },
     {
      "name": "TC-INS-009__s02__drawer",
      "caption": "Drawer ở dark mode",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-010",
    "title": "Giám định: xem phiên giám định + duyệt 1 hồ sơ (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Cán bộ giám định BHYT",
    "preconditions": "Có hồ sơ giám định auditStatus=0 (Chờ duyệt).",
    "steps": [
     "Vào /v2/bhxh-audit tab 'Phiên giám định'",
     "Chọn hồ sơ Chờ duyệt, bấm ActBtn 'Duyệt'",
     "Trong modal nhập ghi chú, bấm 'Duyệt'",
     "Quan sát toast + reload + trạng thái chuyển sang Đã duyệt"
    ],
    "expected": "Modal confirm hiện tên BN + textarea ghi chú; sau duyệt gọi approveAuditSession(id,notes); toast 'Đã duyệt hồ sơ <maLk>'; KPI 'Đã duyệt' +1, 'Chờ duyệt' -1; nút Duyệt biến mất với hồ sơ đó.",
    "evidence": [
     {
      "name": "TC-INS-010__s01__list",
      "caption": "Tab phiên giám định",
      "uiState": "list"
     },
     {
      "name": "TC-INS-010__s02__confirm",
      "caption": "Modal confirm duyệt + textarea ghi chú",
      "uiState": "confirm"
     },
     {
      "name": "TC-INS-010__s03__success",
      "caption": "Toast duyệt thành công + KPI cập nhật",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#232",
     "#265"
    ]
   },
   {
    "id": "TC-INS-011",
    "title": "Giám định: chặn duyệt lại hồ sơ đã duyệt / đã từ chối (invalid state)",
    "category": "state",
    "priority": "P0",
    "role": "Cán bộ giám định BHYT",
    "preconditions": "Có hồ sơ auditStatus=1 (Đã duyệt) và =2 (Từ chối).",
    "steps": [
     "Vào /v2/bhxh-audit",
     "Mở tab 'Đã duyệt'",
     "Kiểm tra hàng action + drawer footer có nút Duyệt không",
     "Lặp với tab 'Bị từ chối'"
    ],
    "expected": "Nút 'Duyệt' chỉ hiển thị khi auditKey==='pending'; hồ sơ Đã duyệt/Từ chối KHÔNG có nút Duyệt trong action row lẫn drawer footer -> không thể chuyển state không hợp lệ.",
    "evidence": [
     {
      "name": "TC-INS-011__s01__detail",
      "caption": "Drawer hồ sơ đã duyệt - không có nút Duyệt",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-012",
    "title": "Giám định: hủy giữa chừng modal duyệt - không thay đổi trạng thái",
    "category": "negative",
    "priority": "P1",
    "role": "Cán bộ giám định BHYT",
    "preconditions": "Có hồ sơ Chờ duyệt.",
    "steps": [
     "Bấm 'Duyệt' mở modal",
     "Nhập ghi chú rồi bấm 'Hủy'",
     "Quan sát hồ sơ"
    ],
    "expected": "Không gọi approveAuditSession; trạng thái giữ Chờ duyệt; KPI không đổi; không toast.",
    "evidence": [
     {
      "name": "TC-INS-012__s01__confirm",
      "caption": "Modal duyệt trước khi hủy",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-013",
    "title": "Giám định: gửi 1 hồ sơ lên cổng BHXH + chặn gửi lại hồ sơ đã gửi",
    "category": "state",
    "priority": "P0",
    "role": "Cán bộ giám định BHYT",
    "preconditions": "Có hồ sơ sentToPortal=false và hồ sơ sentToPortal=true.",
    "steps": [
     "Vào /v2/bhxh-audit",
     "Bấm ActBtn 'Gửi cổng BHXH' trên hồ sơ chưa gửi",
     "Quan sát toast + KPI 'Đã gửi cổng'",
     "Kiểm tra hồ sơ đã gửi không còn nút gửi"
    ],
    "expected": "submitToPortal(id) gọi; toast 'Đã gửi <maLk> lên cổng BHXH'; KPI 'Đã gửi cổng' +1; drawer hiện badge 'Đã gửi'; hồ sơ sentToPortal=true KHÔNG có nút gửi.",
    "evidence": [
     {
      "name": "TC-INS-013__s01__success",
      "caption": "Gửi cổng thành công",
      "uiState": "success"
     },
     {
      "name": "TC-INS-013__s02__detail",
      "caption": "Badge cổng BHXH Đã gửi trong drawer",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#232",
     "#265"
    ]
   },
   {
    "id": "TC-INS-014",
    "title": "Giám định: gửi hàng loạt lên cổng theo bộ lọc + xác nhận số lượng",
    "category": "happy",
    "priority": "P1",
    "role": "Cán bộ giám định BHYT",
    "preconditions": "Có nhiều hồ sơ chưa gửi trong bộ lọc hiện tại.",
    "steps": [
     "Áp filter Khoa + tab",
     "Bấm 'Gửi tất cả lên cổng'",
     "Đọc modal '<N> hồ sơ chưa gửi'",
     "Xác nhận",
     "Đọc toast kết quả submitted/skipped/failed"
    ],
    "expected": "Modal hiển thị đúng số hồ sơ chưa gửi theo bộ lọc; submitBatch(ids) gọi; toast 'Gửi xong: X — bỏ qua Y — lỗi Z'; reload cập nhật.",
    "evidence": [
     {
      "name": "TC-INS-014__s01__confirm",
      "caption": "Modal xác nhận gửi hàng loạt",
      "uiState": "confirm"
     },
     {
      "name": "TC-INS-014__s02__toast",
      "caption": "Toast kết quả gửi batch",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#232",
     "#265"
    ]
   },
   {
    "id": "TC-INS-015",
    "title": "Giám định: gửi hàng loạt khi không có hồ sơ chưa gửi - báo info, không gọi API",
    "category": "edge",
    "priority": "P2",
    "role": "Cán bộ giám định BHYT",
    "preconditions": "Lọc về tập hồ sơ đã gửi hết / hoặc bộ lọc rỗng.",
    "steps": [
     "Áp tab/filter sao cho mọi hồ sơ đều sentToPortal=true",
     "Bấm 'Gửi tất cả lên cổng'"
    ],
    "expected": "Hiển thị info 'Không có hồ sơ nào chưa gửi trong bộ lọc hiện tại'; không mở modal; không gọi submitBatch.",
    "evidence": [
     {
      "name": "TC-INS-015__s01__toast",
      "caption": "Info không có hồ sơ chưa gửi",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-016",
    "title": "Giám định: xuất XML 1 hồ sơ (đang chọn drawer) - tải file đúng tên",
    "category": "integration",
    "priority": "P0",
    "role": "Cán bộ giám định BHYT",
    "preconditions": "Có hồ sơ giám định; đã chốt chi phí.",
    "steps": [
     "Mở drawer 1 hồ sơ",
     "Bấm 'Xuất XML' trong footer drawer (hoặc toolbar khi đã chọn)",
     "Kiểm tra file tải về"
    ],
    "expected": "exportXml(sessionId) gọi; tải file BHXH_XML_<maLk>_YYYYMMDD.xml; toast 'Đã tải XML hồ sơ <maLk>'; nội dung XML đúng cấu trúc bảng 1-7 BHXH; nút Xuất XML toolbar disabled khi chưa chọn hồ sơ.",
    "evidence": [
     {
      "name": "TC-INS-016__s01__drawer",
      "caption": "Footer drawer có nút Xuất XML",
      "uiState": "drawer"
     },
     {
      "name": "TC-INS-016__s02__success",
      "caption": "Toast tải XML thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#232",
     "#266"
    ]
   },
   {
    "id": "TC-INS-017",
    "title": "Giám định: xuất XML hàng loạt -> ZIP nhiều file XML",
    "category": "integration",
    "priority": "P1",
    "role": "Cán bộ giám định BHYT",
    "preconditions": "Có >=2 hồ sơ trong bộ lọc.",
    "steps": [
     "Áp bộ lọc có >=2 hồ sơ",
     "Bấm 'Xuất XML hàng loạt'",
     "Kiểm tra file ZIP tải về"
    ],
    "expected": "exportBatchXml(ids) gọi; tải BHXH_XML_batch_YYYYMMDD.zip; toast 'Đã tải ZIP N XML hồ sơ'; nút disabled khi filtered rỗng.",
    "evidence": [
     {
      "name": "TC-INS-017__s01__toast",
      "caption": "Toast tải ZIP XML batch",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#232",
     "#266"
    ]
   },
   {
    "id": "TC-INS-018",
    "title": "Giám định: Import CSV hồ sơ giám định - happy + bảng dòng import",
    "category": "happy",
    "priority": "P0",
    "role": "Cán bộ giám định BHYT",
    "preconditions": "Có file CSV giám định đúng định dạng.",
    "steps": [
     "Vào /v2/bhxh-audit tab 'Import CSV'",
     "Bấm 'Upload CSV giám định', chọn file hợp lệ",
     "Đọc panel kết quả batch",
     "Xem bảng dòng import + StatusTabs (Tất cả/Chưa duyệt/Đã duyệt/Từ chối)"
    ],
    "expected": "importAuditCsv(file) gọi; toast 'Import xong: X dong / Y'; panel hiển thị importBatchCode + importedRows/totalRows; bảng load dòng import; counts tab khớp; tự chuyển tab 'all'.",
    "evidence": [
     {
      "name": "TC-INS-018__s01__tab",
      "caption": "Tab Import CSV",
      "uiState": "tab"
     },
     {
      "name": "TC-INS-018__s02__success",
      "caption": "Panel kết quả import + bảng dòng",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#232",
     "#266"
    ]
   },
   {
    "id": "TC-INS-019",
    "title": "Giám định: Import CSV file sai định dạng - báo lỗi + liệt kê dòng lỗi",
    "category": "negative",
    "priority": "P1",
    "role": "Cán bộ giám định BHYT",
    "preconditions": "Có file CSV thiếu cột/sai dữ liệu; có file không phải CSV.",
    "steps": [
     "Tab Import CSV",
     "Upload file CSV thiếu cột bắt buộc",
     "Đọc panel lỗi (errors[] với rowNumber + maHoSo + errorMessage)",
     "Thử upload file .txt/.xlsx (accept .csv)"
    ],
    "expected": "Khi parse lỗi từng dòng: panel hiện 'N loi' expand details liệt kê 'Dong X [maHoSo]: message'; skippedRows hiển thị; khi import throw -> toast 'Import that bai — kiem tra lai file CSV'; input reset value.",
    "evidence": [
     {
      "name": "TC-INS-019__s01__error",
      "caption": "Panel liệt kê dòng lỗi import",
      "uiState": "error"
     },
     {
      "name": "TC-INS-019__s02__toast",
      "caption": "Toast import thất bại",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#232",
     "#277"
    ]
   },
   {
    "id": "TC-INS-020",
    "title": "Giám định: lọc dòng import theo StatusTabs + search + phân trang",
    "category": "edge",
    "priority": "P2",
    "role": "Cán bộ giám định BHYT",
    "preconditions": "Đã import batch có >20 dòng nhiều trạng thái.",
    "steps": [
     "Tab Import CSV sau khi đã import",
     "Chuyển qua từng tab Chưa duyệt/Đã duyệt/Từ chối",
     "Nhập search mã hồ sơ/họ tên/số thẻ",
     "Chuyển trang Pager"
    ],
    "expected": "getImportedRows gọi với trangThai đúng (0/1/2/undefined); counts countChuaDuyet/countDaDuyet/countTuChoi khớp; search reset page về 0; Pager đúng tổng trang (perPage=20).",
    "evidence": [
     {
      "name": "TC-INS-020__s01__filter",
      "caption": "Lọc dòng import theo tab + search",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-021",
    "title": "Cấu hình cổng BHXH: lưu cấu hình hợp lệ (happy)",
    "category": "happy",
    "priority": "P0",
    "role": "Quản trị BHYT",
    "preconditions": "Có quyền truy cập /v2/bhxh-config; endpoint /bhxh-config GET trả config.",
    "steps": [
     "Vào /v2/bhxh-config tab 'Cấu hình'",
     "Đối chiếu form đổ sẵn (gatewayUrl, tokenUrl, username, maCSKCB, maDVI, timeout, environment)",
     "Sửa timeout + maCSKCB",
     "Bấm Lưu"
    ],
    "expected": "Form load đúng dữ liệu (password để trống, passwordMasked không lộ); save -> POST /bhxh-config; toast 'Đã lưu cấu hình'; reload lại config mới.",
    "evidence": [
     {
      "name": "TC-INS-021__s01__form",
      "caption": "Form cấu hình cổng đổ sẵn",
      "uiState": "form"
     },
     {
      "name": "TC-INS-021__s02__success",
      "caption": "Toast lưu cấu hình thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-022",
    "title": "Cấu hình cổng BHXH: validation field bắt buộc + định dạng URL",
    "category": "validation",
    "priority": "P1",
    "role": "Quản trị BHYT",
    "preconditions": "Ở tab Cấu hình.",
    "steps": [
     "Xóa trống gatewayUrl/maCSKCB",
     "Nhập URL sai định dạng (vd 'abc')",
     "Nhập timeout âm hoặc 0",
     "Bấm Lưu"
    ],
    "expected": "form.validateFields chặn submit; báo lỗi đỏ dưới các field bắt buộc; URL sai định dạng/timeout <=0 bị từ chối với thông báo rõ; không gọi POST khi invalid.",
    "evidence": [
     {
      "name": "TC-INS-022__s01__validation",
      "caption": "Lỗi validation field bắt buộc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#232",
     "#277"
    ],
    "notes": "Gap: kiểm tra code hiện có rule URL/range cho timeout không; nếu thiếu -> tạo bug fix."
   },
   {
    "id": "TC-INS-023",
    "title": "Cấu hình cổng BHXH: Test connection / Test auth thành công + thất bại",
    "category": "integration",
    "priority": "P0",
    "role": "Quản trị BHYT",
    "preconditions": "Đã lưu cấu hình cổng (mock/test mode).",
    "steps": [
     "Vào tab 'Test tools'",
     "Bấm 'Test connection' với cấu hình đúng",
     "Bấm 'Test auth'",
     "Đổi sang cấu hình sai/URL chết rồi test lại"
    ],
    "expected": "test-connection trả reachable + statusCode + latencyMs; test-auth trả authenticated + tokenMasked; khi sai -> StatusBadge đỏ + error message; latency hiển thị; không lộ token/password đầy đủ.",
    "evidence": [
     {
      "name": "TC-INS-023__s01__success",
      "caption": "Test connection reachable",
      "uiState": "success"
     },
     {
      "name": "TC-INS-023__s02__error",
      "caption": "Test auth thất bại badge đỏ",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#232",
     "#265"
    ]
   },
   {
    "id": "TC-INS-024",
    "title": "Cấu hình cổng BHXH: Test submit XML với XML rỗng/sai cấu trúc",
    "category": "negative",
    "priority": "P1",
    "role": "Quản trị BHYT",
    "preconditions": "Ở tab Test tools.",
    "steps": [
     "Để nguyên template XML rỗng (MA_CSKCB/MA_DVI trống)",
     "Bấm 'Test submit XML'",
     "Sửa XML thành chuỗi không hợp lệ rồi submit lại"
    ],
    "expected": "test-submit-xml gọi với xml + endpoint; BE trả success=false + statusCode + body lỗi; UI hiển thị kết quả lỗi rõ ràng không crash; latencyMs hiển thị.",
    "evidence": [
     {
      "name": "TC-INS-024__s01__error",
      "caption": "Kết quả submit XML lỗi",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-025",
    "title": "BN miễn 100% BHYT: thêm mới hợp lệ (happy CRUD)",
    "category": "happy",
    "priority": "P0",
    "role": "Nhân viên BHYT",
    "preconditions": "Có BN tồn tại để gán; vào /v2/bhyt-full-coverage.",
    "steps": [
     "Bấm 'Thêm'",
     "Chọn patientId, effectiveFrom, effectiveTo, nhập note",
     "Bấm Lưu",
     "Kiểm tra dòng mới trong bảng"
    ],
    "expected": "createBhytFullCoverage gọi; toast success; dòng mới hiện với khoảng hiệu lực đúng; StatusBadge hiệu lực (còn hạn) đúng.",
    "evidence": [
     {
      "name": "TC-INS-025__s01__form",
      "caption": "Modal thêm BN miễn 100%",
      "uiState": "form"
     },
     {
      "name": "TC-INS-025__s02__success",
      "caption": "Thêm thành công + dòng mới",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-026",
    "title": "BN miễn 100% BHYT: validation ngày hiệu lực (To < From, ngày quá khứ/tương lai)",
    "category": "validation",
    "priority": "P1",
    "role": "Nhân viên BHYT",
    "preconditions": "Ở modal thêm/sửa.",
    "steps": [
     "Mở modal thêm",
     "Chọn effectiveTo nhỏ hơn effectiveFrom",
     "Bỏ trống patientId",
     "Nhập medicineScopeJson không phải JSON hợp lệ",
     "Bấm Lưu"
    ],
    "expected": "Báo lỗi 'Ngày kết thúc phải sau ngày bắt đầu'; patientId bắt buộc báo lỗi; medicineScopeJson sai cú pháp bị chặn (nếu có validate); không gọi API khi invalid.",
    "evidence": [
     {
      "name": "TC-INS-026__s01__validation",
      "caption": "Lỗi validation ngày hiệu lực",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#232",
     "#277"
    ],
    "notes": "Gap: xác nhận có rule To>From + JSON validate trong code FE/BE; thiếu -> bug fix."
   },
   {
    "id": "TC-INS-027",
    "title": "BN miễn 100% BHYT: sửa + xóa có xác nhận",
    "category": "state",
    "priority": "P1",
    "role": "Nhân viên BHYT",
    "preconditions": "Có >=1 bản ghi miễn 100%.",
    "steps": [
     "Sửa khoảng hiệu lực 1 bản ghi, lưu",
     "Xóa 1 bản ghi, xác nhận trong confirm",
     "Kiểm tra bảng + KPI"
    ],
    "expected": "updateBhytFullCoverage / deleteBhytFullCoverage gọi đúng; confirm trước khi xóa; sau xóa dòng biến mất; toast tương ứng.",
    "evidence": [
     {
      "name": "TC-INS-027__s01__confirm",
      "caption": "Confirm xóa BN miễn 100%",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-028",
    "title": "Inspector Portal: login giám định viên BHXH (happy + sai mật khẩu)",
    "category": "happy",
    "priority": "P0",
    "role": "Giám định viên BHXH (BhxhInspector)",
    "preconditions": "Có tài khoản BhxhInspectorAccounts hợp lệ.",
    "steps": [
     "Mở /inspector-portal",
     "Để trống tài khoản/mật khẩu rồi bấm đăng nhập",
     "Nhập đúng tài khoản, đăng nhập",
     "Nhập sai mật khẩu, đăng nhập"
    ],
    "expected": "Trống -> báo 'Cần nhập tài khoản & mật khẩu'; đúng -> lưu inspector_token/inspector_info + token (apiClient), vào workspace; sai -> hiển thị message lỗi từ BE, không vào được; màn login gradient riêng (không dùng layout chính).",
    "evidence": [
     {
      "name": "TC-INS-028__s01__form",
      "caption": "Màn login Inspector Portal",
      "uiState": "form"
     },
     {
      "name": "TC-INS-028__s02__validation",
      "caption": "Báo lỗi thiếu tài khoản/mật khẩu",
      "uiState": "validation"
     },
     {
      "name": "TC-INS-028__s03__error",
      "caption": "Đăng nhập sai mật khẩu",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#232",
     "#266"
    ]
   },
   {
    "id": "TC-INS-029",
    "title": "Inspector Portal: xem danh sách HSBA giám định + mở modal chi tiết",
    "category": "happy",
    "priority": "P1",
    "role": "Giám định viên BHXH (BhxhInspector)",
    "preconditions": "Đã login inspector; có HSBA được chia sẻ cho giám định.",
    "steps": [
     "Sau login vào workspace",
     "Áp filter trên Card filter",
     "Click 1 dòng HSBA mở Modal chi tiết",
     "Đối chiếu thông tin + chi phí + định dạng tiền/ngày VN"
    ],
    "expected": "Bảng load InspectorRecordListItemDto; modal hiển thị InspectorRecordDetailDto; tiền format vi-VN ₫, ngày DD/MM/YYYY; chỉ thấy HSBA trong phạm vi giám định của inspector (không phải toàn bộ HSBA bệnh viện).",
    "evidence": [
     {
      "name": "TC-INS-029__s01__list",
      "caption": "Workspace danh sách HSBA giám định",
      "uiState": "list"
     },
     {
      "name": "TC-INS-029__s02__modal",
      "caption": "Modal chi tiết HSBA giám định",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-030",
    "title": "Inspector Portal: IDOR - giám định viên không xem được HSBA ngoài phạm vi (security)",
    "category": "security",
    "priority": "P0",
    "role": "Giám định viên BHXH (BhxhInspector)",
    "preconditions": "Login inspector; biết 1 recordId thuộc bệnh viện/đợt khác.",
    "steps": [
     "Login inspector",
     "Gọi trực tiếp API chi tiết HSBA với id ngoài phạm vi được giao (qua devtools/curl với inspector_token)",
     "Thử truy cập endpoint admin /api/insurance/* bằng inspector token"
    ],
    "expected": "API trả 403/404 cho record ngoài phạm vi; inspector_token KHÔNG truy cập được endpoint nghiệp vụ nội bộ (claims CRUD, config); BhxhInspectorAccessLogs ghi nhận truy cập; không lộ dữ liệu BN khác.",
    "evidence": [
     {
      "name": "TC-INS-030__s01__error",
      "caption": "403/404 khi truy cập HSBA ngoài phạm vi",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#232",
     "#216"
    ],
    "notes": "Kiểm chứng phân tách quyền inspector vs staff; BhxhInspectorAccessLogs phục vụ thanh tra."
   },
   {
    "id": "TC-INS-031",
    "title": "Permission: vai trò không có quyền BHYT bị chặn menu/nút/API",
    "category": "permission",
    "priority": "P0",
    "role": "Bác sĩ (không quyền BHYT)",
    "preconditions": "Có user role không gồm quyền giám định/cấu hình BHYT (đối chiếu matrix #216).",
    "steps": [
     "Đăng nhập user thiếu quyền",
     "Thử mở /v2/bhxh-config + /v2/bhxh-audit",
     "Gọi trực tiếp POST /bhxh-config + /insurance/submit bằng token user đó"
    ],
    "expected": "Menu BHYT cấu hình/giám định ẩn hoặc chặn; route trả forbidden/redirect; API trả 401/403; không thực thi mutation; theo matrix phân quyền #216.",
    "evidence": [
     {
      "name": "TC-INS-031__s01__permission",
      "caption": "Bị chặn truy cập cấu hình BHXH",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#232",
     "#216"
    ]
   },
   {
    "id": "TC-INS-032",
    "title": "Data-consistency: chi phí khám/CLS/thuốc -> viện phí -> hồ sơ BHYT khớp số tiền",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Nhân viên BHYT",
    "preconditions": "1 lượt khám hoàn tất có dịch vụ + thuốc, đã chốt viện phí với nguồn BHYT.",
    "steps": [
     "Tạo hồ sơ BHYT từ lượt khám (createInsuranceClaim)",
     "Mở chi tiết hồ sơ BHYT, ghi nhận Tổng tiền / BHYT chi trả / BN đồng chi trả / BN tự trả",
     "Đối chiếu với màn Viện phí (billing) của cùng lượt",
     "Đối chiếu với dữ liệu XML2 (thuốc) + XML3 (DV) khi xuất"
    ],
    "expected": "Tổng tiền hồ sơ BHYT = tổng chi phí dịch vụ+thuốc đã chốt; insuranceAmount+coPayAmount+patientAmount = totalAmount; số liệu khớp giữa billing và XML1-3; tỷ lệ BHYT đúng theo mức hưởng thẻ.",
    "evidence": [
     {
      "name": "TC-INS-032__s01__detail",
      "caption": "Chi phí hồ sơ BHYT",
      "uiState": "detail"
     },
     {
      "name": "TC-INS-032__s02__list",
      "caption": "Đối chiếu với màn viện phí",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#232",
     "#265"
    ]
   },
   {
    "id": "TC-INS-033",
    "title": "Validate hồ sơ BHYT trước xuất - chặn lỗi blocking, cảnh báo warning",
    "category": "validation",
    "priority": "P0",
    "role": "Nhân viên BHYT",
    "preconditions": "Có hồ sơ thiếu thông tin bắt buộc (mã ICD trống, ngày ra < ngày vào, vượt trần chi phí).",
    "steps": [
     "Gọi validate hồ sơ (validateClaim / nút Validate XML)",
     "Đọc danh sách errors + warnings",
     "Thử xuất XML khi có hasBlockingErrors"
    ],
    "expected": "InsuranceValidationResultDto trả errors (errorCode/field/message/tableName) + warnings; có blocking errors -> chặn xuất; warning -> cho xuất nhưng cảnh báo; check cost-ceiling báo vượt trần với violatedRules.",
    "evidence": [
     {
      "name": "TC-INS-033__s01__validation",
      "caption": "Danh sách lỗi/cảnh báo validate",
      "uiState": "validation"
     },
     {
      "name": "TC-INS-033__s02__error",
      "caption": "Chặn xuất khi có blocking error",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#232",
     "#277"
    ]
   },
   {
    "id": "TC-INS-034",
    "title": "Edge: hồ sơ BHYT giá trị biên - tiền 0/âm/rất lớn + ngày tương lai",
    "category": "edge",
    "priority": "P2",
    "role": "Nhân viên BHYT",
    "preconditions": "Tạo/giả lập hồ sơ với totalAmount=0, insuranceAmount âm (lỗi dữ liệu), giá trị tỷ tiền, dischargeDate ở tương lai.",
    "steps": [
     "Mở các hồ sơ biên trên /v2/insurance và /v2/bhxh-audit",
     "Kiểm tra hiển thị tiền + tỷ lệ BHYT (chia 0)",
     "Kiểm tra ngày tương lai/quá khứ format"
    ],
    "expected": "Tiền 0 -> '0 ₫'; số rất lớn hiển thị có phân cách không tràn cột; tỷ lệ BHYT chia Math.max(1,total) không NaN/Infinity; ngày tương lai hiển thị nhưng nên gắn cờ bất thường; không crash UI.",
    "evidence": [
     {
      "name": "TC-INS-034__s01__detail",
      "caption": "Hồ sơ giá trị biên hiển thị an toàn",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-035",
    "title": "Audit log: mọi mutation BHYT (duyệt/gửi cổng/lưu cấu hình/xóa) được ghi log",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Quản trị/Kiểm toán",
    "preconditions": "Thực hiện vài mutation ở các task trên (duyệt, gửi cổng, lưu config, xóa BN miễn).",
    "steps": [
     "Thực hiện duyệt 1 hồ sơ + gửi cổng + lưu cấu hình",
     "Truy vấn InsuranceActivityLogs (getInsuranceLogs)",
     "Đối chiếu action/description/userName/timestamp/maLk"
    ],
    "expected": "Mỗi mutation sinh 1 log với userName là user thật (≠ Guid.Empty), action mô tả đúng, timestamp + ipAddress; truy vết được hồ sơ qua maLk; phục vụ thanh tra BHXH.",
    "evidence": [
     {
      "name": "TC-INS-035__s01__list",
      "caption": "Nhật ký hoạt động BHYT",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#232"
    ]
   },
   {
    "id": "TC-INS-036",
    "title": "Security: XSS ở field ghi chú khi duyệt giám định + note BN miễn",
    "category": "security",
    "priority": "P1",
    "role": "Cán bộ giám định BHYT",
    "preconditions": "Ở modal duyệt giám định / modal BN miễn 100%.",
    "steps": [
     "Nhập payload <img src=x onerror=alert(1)> / <script> vào textarea ghi chú duyệt",
     "Lưu",
     "Mở lại bản ghi hiển thị ghi chú",
     "Lặp với note BN miễn 100%"
    ],
    "expected": "Payload được lưu/escape an toàn; khi render lại hiển thị dạng text, KHÔNG thực thi script; không alert; XSS không persist.",
    "evidence": [
     {
      "name": "TC-INS-036__s01__detail",
      "caption": "Ghi chú chứa payload hiển thị an toàn",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#232",
     "#277"
    ]
   }
  ],
  "ui_state_checklist": [
   "list (danh sách hồ sơ BHYT / phiên giám định / dòng import / HSBA inspector)",
   "loading (đang tải bảng)",
   "empty (không có hồ sơ / search rỗng / chưa import)",
   "error (API fail, test cổng lỗi, import lỗi, validate blocking, 403/404 IDOR)",
   "filter (StatusTabs + search + filter Khoa, bỏ lọc)",
   "tab (main tab Phiên giám định/Import CSV, TopTabs Cấu hình/Test)",
   "drawer (chi tiết hồ sơ BHYT, chi tiết hồ sơ giám định + footer hành động)",
   "detail (section chi phí, lý do từ chối, badge cổng, hồ sơ biên)",
   "modal (confirm duyệt, modal BN miễn 100%, modal chi tiết HSBA inspector, dialog in)",
   "form (form cấu hình cổng, form BN miễn, login inspector)",
   "validation (field bắt buộc, ngày hiệu lực, URL/timeout, validate hồ sơ BHYT)",
   "confirm (xác nhận gửi hàng loạt, xác nhận xóa, modal duyệt)",
   "success (lưu/duyệt/gửi/import/xuất XML/CSV thành công)",
   "toast (thông báo success/info/error)",
   "permission (chặn truy cập cấu hình/giám định khi thiếu quyền)"
  ],
  "gaps": [
   "Màn danh sách BHYT (Insurance v2) nuốt lỗi API im lặng (catch -> rỗng) - thiếu error banner phân biệt 'rỗng thật' vs 'lỗi tải'; nên có retry + thông báo.",
   "Chưa thấy UI cho luồng tạo hồ sơ BHYT từ lượt khám (createInsuranceClaim), khóa/mở khóa hồ sơ (lock/unlock), và xác minh thẻ BHYT (verify-card) - API có nhưng FE v2 chưa phủ; cần test khi có màn.",
   "Chưa có màn quyết toán/đối soát (settlement/reconciliation import + tính chênh lệch) trong v2 dù API đầy đủ - test data-consistency tiền viện phí vs số BHXH chấp nhận chưa có UI để chụp evidence.",
   "Báo cáo BHYT C79a/80a/monthly có API nhưng chưa rõ màn v2 - cần xác nhận route để bổ sung task happy + export Excel + đối chiếu số liệu.",
   "Validation phía FE cho BhxhConfig (URL hợp lệ, timeout range) và BhytFullCoverage (To>From, JSON scope) chưa chắc tồn tại - cần đọc kỹ rules; nếu thiếu -> tạo bug fix liên kết.",
   "Mức hưởng BHYT theo đúng/trái tuyến + thông tuyến (checkReferralStatus, paymentRatio) ảnh hưởng số tiền - cần test biến thể tuyến để phủ business rule cốt lõi, hiện chưa có task vì chưa thấy UI cấu hình tuyến.",
   "Phân quyền chi tiết theo matrix #216 cần xác thực thực tế từng endpoint (claims/config/submit/audit) - task #031 mới mức khung, nên enumerate per-endpoint.",
   "Đồng bộ realtime trạng thái cổng BHXH (nếu dùng SignalR cho kết quả giám định) - chưa rõ có push hay polling; cần xác nhận.",
   "Tính idempotent khi gửi trùng hồ sơ lên cổng (double submit, mất mạng giữa chừng) - cần test chống gửi lặp tạo nhiều giao dịch InsuranceXMLSubmissions."
  ]
 },
 {
  "id": "reports",
  "code": "RPT",
  "layer": "fin",
  "ic": "📊",
  "nm": "Báo cáo & Dashboard",
  "gh": [
   "#256",
   "#257",
   "#263"
  ],
  "gap": false,
  "module_id": "reports",
  "summary": "Phân hệ \"Báo cáo & Dashboard\" (RPT, lớp fin) quản lý mẫu báo cáo, báo cáo đã sinh, widget dashboard và nhật ký truy cập báo cáo. Quan hệ thật: ReportTemplates ⟶ GeneratedReports · DashboardWidgets · ReportAccessLogs (audit truy cập). 4 bảng chính: ReportTemplates (ReportCode/ReportType 1-4/Category/OutputFormat PDF-Excel-Word-HTML/Parameters JSON/AllowedRoles/AllowedDepartments/IsActive), GeneratedReports (Status 0-Đang tạo/1-Hoàn thành/2-Lỗi, OutputPath/FileSize/ExpiryDate/DownloadCount/ExecutionTimeMs), DashboardWidgets (WidgetType 1-5/ChartType/GridX-Y-Width-Height/RefreshInterval/AllowedRoles), ReportAccessLogs (ActionType View/Generate/Download/Export + IpAddress/UserAgent — audit). Liên thông chéo: billing, insurance, quality (số liệu vận hành tổng hợp từ các phân hệ). Màn chính thật trong code v2: Dashboard, Reports (4 nhóm Vận hành/Lâm sàng/Tài chính/Báo cáo BYT), WorkloadReport, PaymentReports, ReportCatalogs, Dashboard3Cap.",
  "screens": [
   {
    "name": "Dashboard tổng quan",
    "desc": "Trang mặc định khi đăng nhập (/ redirect tới /v2/dashboard). Hiển thị các widget số liệu/biểu đồ vận hành, KPI strip, doanh thu theo khoa, xu hướng theo thời gian.",
    "route_guess": "/v2/dashboard",
    "elements": [
     "KpiStrip (lượt khám/nội trú/doanh thu/công suất giường)",
     "biểu đồ xu hướng (Line/Bar)",
     "bảng doanh thu theo khoa (DepartmentRevenueDto)",
     "nút làm mới (ReloadOutlined)",
     "bộ lọc kỳ (ngày/tuần/tháng/năm)"
    ]
   },
   {
    "name": "Danh mục báo cáo (Reports)",
    "desc": "Catalog báo cáo theo 4 nhóm: Vận hành, Lâm sàng, Tài chính, Báo cáo BYT (regulatory). Mỗi báo cáo có chu kỳ, lần chạy gần nhất, phạm vi, đơn vị sở hữu; cho phép tạo/sinh/tải/xuất.",
    "route_guess": "/v2/reports",
    "elements": [
     "TopTabs/StatusTabs 4 nhóm (operational/clinical/financial/regulatory)",
     "DataTable danh sách báo cáo (mã/tên/chu kỳ/lastRun/scope/owner)",
     "nút Tạo báo cáo (PlusOutlined)",
     "nút Chạy (PlayCircleOutlined)",
     "nút Tải (DownloadOutlined)",
     "nút Xuất Excel (FileExcelOutlined)",
     "nút Xem (EyeOutlined)",
     "nút Gửi (SendOutlined)",
     "bộ lọc kỳ day/week/month/year"
    ]
   },
   {
    "name": "Form/Modal tạo báo cáo mới",
    "desc": "Modal/Drawer nhập mẫu báo cáo: tên, nhóm, chu kỳ (day/week/month/quarter), phạm vi, đơn vị sở hữu, định dạng (pdf/xlsx/csv), email nhận.",
    "route_guess": "/v2/reports (modal)",
    "elements": [
     "Form field name (bắt buộc)",
     "Select category",
     "Select cycle",
     "Input scope",
     "Input owner",
     "Select format (pdf/xlsx/csv)",
     "Input emails",
     "nút Lưu/Hủy"
    ]
   },
   {
    "name": "Drawer/Modal xem & sinh báo cáo (GeneratedReport)",
    "desc": "Nhập tham số (Parameters JSON: StartDate/EndDate...), chạy sinh báo cáo, theo dõi Status (Đang tạo/Hoàn thành/Lỗi), xem ErrorMessage, tải file kết quả.",
    "route_guess": "/v2/reports (drawer)",
    "elements": [
     "form tham số động (date/number/text theo Parameters)",
     "badge trạng thái (0/1/2)",
     "hiển thị FileSize/TotalRecords/ExecutionTimeMs",
     "nút Tải về (DownloadCount)",
     "thông báo lỗi ErrorMessage"
    ]
   },
   {
    "name": "Báo cáo công suất / khối lượng (WorkloadReport)",
    "desc": "Báo cáo theo dõi công suất, khối lượng công việc theo khoa/thời gian.",
    "route_guess": "/v2/workload-report",
    "elements": [
     "bộ lọc khoa + khoảng ngày",
     "DataTable số liệu",
     "biểu đồ",
     "nút xuất"
    ]
   },
   {
    "name": "Báo cáo thanh toán (PaymentReports)",
    "desc": "Báo cáo tài chính/thanh toán tổng hợp từ phân hệ viện phí (billing).",
    "route_guess": "/v2/payment-reports",
    "elements": [
     "bộ lọc kỳ + phương thức",
     "bảng tổng hợp tiền",
     "tổng cộng định dạng tiền tệ",
     "nút xuất Excel"
    ]
   },
   {
    "name": "Báo cáo thời gian chờ (WaitingTimeReport)",
    "desc": "Thống kê thời gian chờ khám OPD theo khoa/khung giờ.",
    "route_guess": "/v2/waiting-time-report",
    "elements": [
     "bộ lọc khoa/ngày",
     "biểu đồ thời gian chờ",
     "bảng chi tiết"
    ]
   },
   {
    "name": "Danh mục mẫu báo cáo (ReportCatalogs / ReportTemplates)",
    "desc": "Quản lý danh mục ReportTemplate: mã/tên/loại/danh mục/định dạng/role được phép/IsActive/SortOrder.",
    "route_guess": "/v2/report-catalogs",
    "elements": [
     "DataTable mẫu báo cáo",
     "nút thêm/sửa mẫu",
     "Switch IsActive",
     "cấu hình AllowedRoles/AllowedDepartments",
     "SQLQuery/StoredProcedure (admin)"
    ]
   },
   {
    "name": "Dashboard 3 cấp (Dashboard3Cap)",
    "desc": "Dashboard BGĐ/KHTH phân cấp viện/khoa/đơn vị với KPI và báo cáo tổng hợp.",
    "route_guess": "/v2/dashboard-3cap",
    "elements": [
     "chọn cấp xem",
     "KPI theo cấp",
     "biểu đồ so sánh"
    ]
   },
   {
    "name": "Nhật ký truy cập báo cáo (ReportAccessLog)",
    "desc": "Audit log truy cập báo cáo: user, AccessTime, ActionType (View/Generate/Download/Export), IpAddress, UserAgent, tham số.",
    "route_guess": "/v2/report-access-logs",
    "elements": [
     "DataTable log truy cập",
     "bộ lọc theo user/ActionType/ngày",
     "cột IP/UserAgent",
     "chỉ Admin/QLCL xem"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-RPT-001",
    "title": "Mở Dashboard tổng quan hiển thị đủ KPI và biểu đồ",
    "category": "happy",
    "priority": "P0",
    "role": "Admin/BGĐ",
    "preconditions": "Đăng nhập admin/Admin@123; có dữ liệu khám/viện phí trong ngày.",
    "steps": [
     "Đăng nhập, hệ thống tự điều hướng / → /v2/dashboard",
     "Quan sát KpiStrip (lượt khám, nội trú, doanh thu, công suất giường)",
     "Quan sát biểu đồ xu hướng và bảng doanh thu theo khoa",
     "Bấm nút làm mới (Reload)"
    ],
    "expected": "Dashboard hiển thị đầy đủ widget số liệu khớp dữ liệu nguồn; biểu đồ render không lỗi; nút Reload tải lại số liệu mới.",
    "evidence": [
     {
      "name": "TC-RPT-001__s01__dashboard",
      "caption": "Dashboard tổng quan với KPI strip",
      "uiState": "detail"
     },
     {
      "name": "TC-RPT-001__s02__loading",
      "caption": "Trạng thái loading khi tải số liệu",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#256",
     "#257"
    ]
   },
   {
    "id": "TC-RPT-002",
    "title": "Xem danh mục báo cáo theo 4 nhóm và chuyển tab",
    "category": "happy",
    "priority": "P0",
    "role": "Phòng KHTH",
    "preconditions": "Đăng nhập; ở /v2/reports.",
    "steps": [
     "Mở /v2/reports",
     "Quan sát tab nhóm: Vận hành / Lâm sàng / Tài chính / Báo cáo BYT",
     "Bấm lần lượt từng tab",
     "Kiểm tra danh sách báo cáo lọc đúng theo nhóm"
    ],
    "expected": "Mỗi tab hiển thị đúng các báo cáo thuộc nhóm (operational/clinical/financial/regulatory); cột mã/tên/chu kỳ/lần chạy/phạm vi/đơn vị hiển thị đầy đủ.",
    "evidence": [
     {
      "name": "TC-RPT-002__s01__tab",
      "caption": "Tab nhóm báo cáo Vận hành",
      "uiState": "tab"
     },
     {
      "name": "TC-RPT-002__s02__list",
      "caption": "Danh sách báo cáo theo nhóm",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#256"
    ]
   },
   {
    "id": "TC-RPT-003",
    "title": "Tạo mẫu báo cáo mới (happy path)",
    "category": "happy",
    "priority": "P0",
    "role": "Admin/KHTH",
    "preconditions": "Đăng nhập; ở /v2/reports.",
    "steps": [
     "Bấm nút Tạo báo cáo (Plus)",
     "Nhập tên, chọn nhóm, chọn chu kỳ tháng, nhập phạm vi + đơn vị, chọn định dạng pdf",
     "Bấm Lưu"
    ],
    "expected": "Báo cáo mới được tạo, xuất hiện trong danh sách nhóm tương ứng; toast thành công; ghi ReportAccessLog ActionType phù hợp.",
    "evidence": [
     {
      "name": "TC-RPT-003__s01__form",
      "caption": "Form tạo báo cáo",
      "uiState": "form"
     },
     {
      "name": "TC-RPT-003__s02__success",
      "caption": "Toast tạo thành công",
      "uiState": "success"
     },
     {
      "name": "TC-RPT-003__s03__list",
      "caption": "Báo cáo mới trong danh sách",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#256"
    ]
   },
   {
    "id": "TC-RPT-004",
    "title": "Sinh báo cáo (Generate) và tải file kết quả",
    "category": "happy",
    "priority": "P0",
    "role": "KHTH",
    "preconditions": "Có ReportTemplate active; đăng nhập.",
    "steps": [
     "Chọn 1 báo cáo, bấm Chạy (PlayCircle)",
     "Nhập tham số StartDate/EndDate",
     "Xác nhận sinh báo cáo",
     "Chờ Status chuyển sang Hoàn thành (1)",
     "Bấm Tải về"
    ],
    "expected": "GeneratedReport tạo với Status=1, FileName/FileSize/TotalRecords hiển thị; file tải về đúng định dạng; DownloadCount tăng; ReportAccessLog ghi ActionType=Generate rồi Download.",
    "evidence": [
     {
      "name": "TC-RPT-004__s01__drawer",
      "caption": "Drawer nhập tham số sinh báo cáo",
      "uiState": "drawer"
     },
     {
      "name": "TC-RPT-004__s02__loading",
      "caption": "Status Đang tạo",
      "uiState": "loading"
     },
     {
      "name": "TC-RPT-004__s03__success",
      "caption": "Hoàn thành + nút tải",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#256",
     "#257"
    ]
   },
   {
    "id": "TC-RPT-005",
    "title": "Xuất báo cáo ra Excel",
    "category": "happy",
    "priority": "P1",
    "role": "KHTH",
    "preconditions": "Có báo cáo đã sinh.",
    "steps": [
     "Chọn báo cáo có dữ liệu",
     "Bấm Xuất Excel (FileExcel)",
     "Mở file tải về"
    ],
    "expected": "File .xlsx tải về mở được, dữ liệu khớp bảng trên màn; ReportAccessLog ghi ActionType=Export.",
    "evidence": [
     {
      "name": "TC-RPT-005__s01__toast",
      "caption": "Toast bắt đầu xuất Excel",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#256"
    ]
   },
   {
    "id": "TC-RPT-006",
    "title": "Validation form tạo báo cáo — bỏ trống tên/nhóm bắt buộc",
    "category": "validation",
    "priority": "P0",
    "role": "Admin",
    "preconditions": "Mở form Tạo báo cáo.",
    "steps": [
     "Để trống trường Tên",
     "Không chọn Nhóm",
     "Bấm Lưu"
    ],
    "expected": "Form chặn submit; báo lỗi đỏ tại từng field bắt buộc (Tên, Nhóm, Đơn vị); không gọi API tạo.",
    "evidence": [
     {
      "name": "TC-RPT-006__s01__validation",
      "caption": "Lỗi validation field bắt buộc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#263"
    ]
   },
   {
    "id": "TC-RPT-007",
    "title": "Validation định dạng email nhận báo cáo",
    "category": "validation",
    "priority": "P1",
    "role": "KHTH",
    "preconditions": "Mở form Tạo báo cáo có trường emails.",
    "steps": [
     "Nhập emails sai định dạng (vd: 'abc, x@@y')",
     "Bấm Lưu"
    ],
    "expected": "Báo lỗi định dạng email; chặn submit cho đến khi sửa đúng a@b.com[, c@d.com].",
    "evidence": [
     {
      "name": "TC-RPT-007__s01__validation",
      "caption": "Lỗi định dạng email",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#263"
    ]
   },
   {
    "id": "TC-RPT-008",
    "title": "Edge — khoảng ngày tham số đảo ngược (StartDate > EndDate)",
    "category": "edge",
    "priority": "P1",
    "role": "KHTH",
    "preconditions": "Mở drawer sinh báo cáo có tham số ngày.",
    "steps": [
     "Nhập StartDate = 01/12/2026, EndDate = 01/01/2026",
     "Bấm Sinh"
    ],
    "expected": "Hệ thống chặn với thông báo 'Ngày bắt đầu phải <= ngày kết thúc'; không tạo GeneratedReport.",
    "evidence": [
     {
      "name": "TC-RPT-008__s01__validation",
      "caption": "Chặn khoảng ngày đảo ngược",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#263"
    ]
   },
   {
    "id": "TC-RPT-009",
    "title": "Edge — khoảng thời gian rất lớn (10 năm) và ngày tương lai",
    "category": "edge",
    "priority": "P2",
    "role": "KHTH",
    "preconditions": "Mở drawer sinh báo cáo.",
    "steps": [
     "Nhập khoảng ngày 01/01/2016 → 31/12/2026 (10 năm)",
     "Nhập một báo cáo có EndDate ở tương lai",
     "Bấm Sinh"
    ],
    "expected": "Hoặc cảnh báo khối lượng lớn/giới hạn kỳ, hoặc sinh được nhưng ExecutionTimeMs hiển thị; ngày tương lai trả 0 bản ghi không lỗi 500.",
    "evidence": [
     {
      "name": "TC-RPT-009__s01__error",
      "caption": "Cảnh báo khoảng quá lớn hoặc kết quả rỗng",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#263"
    ]
   },
   {
    "id": "TC-RPT-010",
    "title": "Edge — tên báo cáo chuỗi rất dài + ký tự tiếng Việt có dấu + ký tự đặc biệt",
    "category": "edge",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "Mở form Tạo báo cáo.",
    "steps": [
     "Nhập tên 300 ký tự gồm dấu tiếng Việt 'Báo cáo tổng hợp công suất giường bệnh khoa Hồi sức tích cực <>&%'",
     "Bấm Lưu"
    ],
    "expected": "Hoặc chặn theo maxlength với thông báo, hoặc lưu đúng và hiển thị không vỡ layout/không lỗi encoding; dấu tiếng Việt hiển thị chuẩn.",
    "evidence": [
     {
      "name": "TC-RPT-010__s01__form",
      "caption": "Nhập tên dài có dấu + ký tự đặc biệt",
      "uiState": "form"
     }
    ],
    "refIssues": [
     "#263"
    ]
   },
   {
    "id": "TC-RPT-011",
    "title": "Negative — sinh báo cáo lỗi backend, hiển thị Status Lỗi + ErrorMessage",
    "category": "negative",
    "priority": "P1",
    "role": "KHTH",
    "preconditions": "Báo cáo có SQLQuery lỗi hoặc tham số gây lỗi.",
    "steps": [
     "Chọn báo cáo cấu hình lỗi",
     "Bấm Sinh"
    ],
    "expected": "GeneratedReport Status=2 (Lỗi); ErrorMessage hiển thị rõ; nút Tải bị vô hiệu; không crash trang.",
    "evidence": [
     {
      "name": "TC-RPT-011__s01__error",
      "caption": "Trạng thái Lỗi + ErrorMessage",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#256"
    ]
   },
   {
    "id": "TC-RPT-012",
    "title": "Negative — hủy giữa chừng khi đang sinh báo cáo",
    "category": "negative",
    "priority": "P2",
    "role": "KHTH",
    "preconditions": "Đang ở drawer sinh báo cáo Status=Đang tạo.",
    "steps": [
     "Bấm Sinh",
     "Khi Status=Đang tạo, đóng drawer / bấm Hủy",
     "Quay lại danh sách báo cáo đã sinh"
    ],
    "expected": "Thao tác hủy không tạo bản ghi rác hoặc bản ghi giữ Status Đang tạo treo; UI nhất quán, không lỗi.",
    "evidence": [
     {
      "name": "TC-RPT-012__s01__confirm",
      "caption": "Xác nhận hủy giữa chừng",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#256"
    ]
   },
   {
    "id": "TC-RPT-013",
    "title": "State — vô hiệu hóa mẫu báo cáo (IsActive=false) không hiện ở danh mục chạy",
    "category": "state",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Ở ReportCatalogs có mẫu IsActive=true.",
    "steps": [
     "Tắt Switch IsActive cho 1 mẫu",
     "Quay lại /v2/reports",
     "Tìm báo cáo vừa tắt"
    ],
    "expected": "Mẫu inactive không hiển thị (hoặc bị mờ/không chạy được) trong danh mục sinh báo cáo; người dùng thường không sinh được.",
    "evidence": [
     {
      "name": "TC-RPT-013__s01__detail",
      "caption": "Switch IsActive tắt mẫu",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#256"
    ]
   },
   {
    "id": "TC-RPT-014",
    "title": "State — không cho sửa/xóa báo cáo đã sinh hoàn thành đã có file",
    "category": "state",
    "priority": "P2",
    "role": "KHTH",
    "preconditions": "GeneratedReport Status=1 đã có OutputPath.",
    "steps": [
     "Mở báo cáo đã sinh hoàn thành",
     "Thử sửa tham số đã dùng"
    ],
    "expected": "Bản ghi đã sinh là bất biến (chỉ xem/tải/xuất); muốn đổi tham số phải sinh bản mới; không cho overwrite ngầm.",
    "evidence": [
     {
      "name": "TC-RPT-014__s01__detail",
      "caption": "Báo cáo đã sinh chỉ-đọc",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#256"
    ]
   },
   {
    "id": "TC-RPT-015",
    "title": "Permission — vai trò không đủ quyền bị chặn menu/nút/API báo cáo nhạy cảm",
    "category": "permission",
    "priority": "P0",
    "role": "Lễ tân/Điều dưỡng (role thấp)",
    "preconditions": "Đăng nhập role không nằm trong AllowedRoles của mẫu; tham chiếu matrix #216.",
    "steps": [
     "Đăng nhập bằng role thấp",
     "Truy cập /v2/reports và Dashboard tài chính",
     "Thử gọi trực tiếp API sinh báo cáo tài chính/báo cáo BYT"
    ],
    "expected": "Menu/nút báo cáo tài chính bị ẩn/disable theo AllowedRoles; API trả 403; không lộ số liệu tài chính.",
    "evidence": [
     {
      "name": "TC-RPT-015__s01__permission",
      "caption": "Nút báo cáo tài chính bị ẩn với role thấp",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#256"
    ]
   },
   {
    "id": "TC-RPT-016",
    "title": "Permission — giới hạn theo khoa (AllowedDepartments) chỉ thấy báo cáo khoa mình",
    "category": "permission",
    "priority": "P1",
    "role": "Trưởng khoa",
    "preconditions": "Mẫu có AllowedDepartments giới hạn khoa.",
    "steps": [
     "Đăng nhập TK khoa A",
     "Mở danh mục báo cáo",
     "Quan sát báo cáo của khoa B"
    ],
    "expected": "Chỉ thấy/chạy được báo cáo thuộc khoa mình; báo cáo khoa khác không hiển thị; số liệu sinh ra giới hạn theo khoa.",
    "evidence": [
     {
      "name": "TC-RPT-016__s01__permission",
      "caption": "Lọc báo cáo theo khoa được phép",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-RPT-017",
    "title": "Data-consistency — số liệu Dashboard khớp nguồn billing/khám",
    "category": "data-consistency",
    "priority": "P0",
    "role": "BGĐ",
    "preconditions": "Có giao dịch viện phí + lượt khám trong kỳ.",
    "steps": [
     "Ghi nhận tổng doanh thu trong phân hệ Viện phí (billing) kỳ hôm nay",
     "Mở Dashboard /v2/dashboard cùng kỳ",
     "Đối chiếu KPI doanh thu + lượt khám với số nguồn",
     "Sinh báo cáo tài chính cùng kỳ và đối chiếu lần nữa"
    ],
    "expected": "Số trên Dashboard = số tổng trong billing; báo cáo tài chính sinh ra khớp Dashboard (chi phí → viện phí → báo cáo nhất quán xuyên 3 nơi).",
    "evidence": [
     {
      "name": "TC-RPT-017__s01__detail",
      "caption": "KPI doanh thu Dashboard",
      "uiState": "detail"
     },
     {
      "name": "TC-RPT-017__s02__list",
      "caption": "Báo cáo tài chính đối chiếu",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#256",
     "#257"
    ]
   },
   {
    "id": "TC-RPT-018",
    "title": "Data-consistency — audit ReportAccessLog ghi đúng mọi hành động",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Admin/QLCL",
    "preconditions": "Đăng nhập; mở nhật ký truy cập báo cáo.",
    "steps": [
     "Thực hiện: Xem báo cáo, Sinh báo cáo, Tải file, Xuất Excel",
     "Mở màn Nhật ký truy cập báo cáo",
     "Lọc theo user hiện tại"
    ],
    "expected": "Mỗi hành động sinh 1 bản ReportAccessLog với ActionType đúng (View/Generate/Download/Export), UserId thật (≠ Guid.Empty), AccessTime, IpAddress ghi nhận chính xác.",
    "evidence": [
     {
      "name": "TC-RPT-018__s01__list",
      "caption": "Nhật ký truy cập với ActionType",
      "uiState": "list"
     },
     {
      "name": "TC-RPT-018__s02__filter",
      "caption": "Lọc log theo user",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#256"
    ]
   },
   {
    "id": "TC-RPT-019",
    "title": "UI — empty state khi nhóm báo cáo chưa có mục / chưa sinh báo cáo nào",
    "category": "ui",
    "priority": "P1",
    "role": "KHTH",
    "preconditions": "Nhóm báo cáo rỗng hoặc lịch sử sinh trống.",
    "steps": [
     "Mở tab nhóm chưa có báo cáo",
     "Mở lịch sử báo cáo đã sinh khi rỗng"
    ],
    "expected": "Hiển thị empty state thân thiện (icon + dòng gợi ý 'Chưa có báo cáo'), không bảng trống lỗi, không spinner treo.",
    "evidence": [
     {
      "name": "TC-RPT-019__s01__empty",
      "caption": "Empty state danh sách báo cáo",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#263"
    ]
   },
   {
    "id": "TC-RPT-020",
    "title": "UI — dark/light parity + format số/tiền/ngày trên Dashboard và báo cáo",
    "category": "ui",
    "priority": "P1",
    "role": "BGĐ",
    "preconditions": "Có toggle dark/light trên topbar v2.",
    "steps": [
     "Mở Dashboard ở light mode, ghi nhận màu chữ/biểu đồ/đường viền",
     "Bật dark mode qua topbar",
     "Kiểm tra biểu đồ, bảng, KPI, định dạng tiền (1.234.567 ₫) và ngày (dd/MM/yyyy)"
    ],
    "expected": "Cả 2 theme đọc rõ, đủ tương phản, biểu đồ không mất chữ/trắng nền; tiền định dạng phân tách hàng nghìn + ký hiệu ₫; ngày theo dd/MM/yyyy nhất quán.",
    "evidence": [
     {
      "name": "TC-RPT-020__s01__detail",
      "caption": "Dashboard light mode",
      "uiState": "detail"
     },
     {
      "name": "TC-RPT-020__s02__detail",
      "caption": "Dashboard dark mode parity",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#263"
    ]
   },
   {
    "id": "TC-RPT-021",
    "title": "UI — error state khi API Dashboard/báo cáo lỗi",
    "category": "ui",
    "priority": "P1",
    "role": "BGĐ",
    "preconditions": "Backend trả lỗi (5xx) hoặc mất kết nối.",
    "steps": [
     "Mở Dashboard khi API lỗi",
     "Quan sát widget"
    ],
    "expected": "Hiển thị error state có nút Thử lại; không trang trắng/crash; widget khác vẫn render độc lập nếu có.",
    "evidence": [
     {
      "name": "TC-RPT-021__s01__error",
      "caption": "Error state Dashboard có nút thử lại",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#263"
    ]
   },
   {
    "id": "TC-RPT-022",
    "title": "Integration — báo cáo BYT/định kỳ xuất theo lịch (schedule Tự động)",
    "category": "integration",
    "priority": "P1",
    "role": "Hệ thống/KHTH",
    "preconditions": "Có báo cáo schedule=Tự động (vd RPT-001 hằng ngày 06:00).",
    "steps": [
     "Kiểm tra trường lastRun của báo cáo tự động",
     "Đối chiếu thời điểm chạy gần nhất với lịch",
     "(Nếu có) kích hoạt chạy lại định kỳ"
    ],
    "expected": "Báo cáo định kỳ sinh đúng lịch, cập nhật lastRun; báo cáo regulatory (BYT/C79-C80 liên thông insurance) xuất đúng mẫu chuẩn.",
    "evidence": [
     {
      "name": "TC-RPT-022__s01__detail",
      "caption": "Báo cáo tự động với lastRun",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#257"
    ]
   },
   {
    "id": "TC-RPT-023",
    "title": "Security — IDOR tải GeneratedReport của user/khoa khác",
    "category": "security",
    "priority": "P0",
    "role": "KHTH khoa A",
    "preconditions": "Có GeneratedReport thuộc khoa B / user khác (biết id).",
    "steps": [
     "Đăng nhập user khoa A",
     "Gọi API tải/ xem GeneratedReport bằng id của báo cáo khoa B",
     "Thử qua URL trực tiếp OutputPath"
    ],
    "expected": "Server từ chối (403/404) khi id không thuộc phạm vi quyền; không tải được file báo cáo khoa khác; không lộ số liệu chéo.",
    "evidence": [
     {
      "name": "TC-RPT-023__s01__permission",
      "caption": "Chặn IDOR tải báo cáo khoa khác",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-RPT-024",
    "title": "Security — path-traversal/đường dẫn OutputPath khi tải file",
    "category": "security",
    "priority": "P0",
    "role": "Tấn công",
    "preconditions": "Endpoint tải báo cáo nhận path/filename.",
    "steps": [
     "Gọi endpoint tải với OutputPath chứa ../../ hoặc đường dẫn tuyệt đối",
     "Quan sát phản hồi"
    ],
    "expected": "Server chuẩn hóa & chặn path-traversal; chỉ phục vụ file trong thư mục báo cáo hợp lệ; trả 400/404, không lộ file hệ thống.",
    "evidence": [
     {
      "name": "TC-RPT-024__s01__error",
      "caption": "Chặn path-traversal khi tải báo cáo",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-RPT-025",
    "title": "Security — XSS ở trường ghi chú/tên báo cáo và Note",
    "category": "security",
    "priority": "P1",
    "role": "Admin",
    "preconditions": "Form tạo mẫu/báo cáo có trường Note/Description.",
    "steps": [
     "Nhập payload <script>alert(1)</script> vào Tên/Note/Description",
     "Lưu",
     "Mở lại danh sách + chi tiết hiển thị trường đó"
    ],
    "expected": "Nội dung được escape khi render; script không thực thi; hiển thị literal; lưu/đọc an toàn.",
    "evidence": [
     {
      "name": "TC-RPT-025__s01__detail",
      "caption": "Hiển thị an toàn payload XSS đã escape",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-RPT-026",
    "title": "Security — chặn truy cập báo cáo khi chưa đăng nhập (no anonymous)",
    "category": "security",
    "priority": "P0",
    "role": "Khách (chưa login)",
    "preconditions": "Xóa token localStorage.",
    "steps": [
     "Truy cập trực tiếp /v2/reports và /v2/dashboard",
     "Gọi API báo cáo không kèm Bearer JWT"
    ],
    "expected": "FE chuyển về trang đăng nhập; API trả 401; không endpoint báo cáo nào ẩn danh.",
    "evidence": [
     {
      "name": "TC-RPT-026__s01__permission",
      "caption": "Chặn truy cập báo cáo khi chưa đăng nhập",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216"
    ]
   },
   {
    "id": "TC-RPT-027",
    "title": "Edge — sinh báo cáo trả 0 bản ghi (TotalRecords=0)",
    "category": "edge",
    "priority": "P2",
    "role": "KHTH",
    "preconditions": "Chọn kỳ không có dữ liệu.",
    "steps": [
     "Sinh báo cáo cho kỳ chắc chắn rỗng",
     "Xem kết quả + file"
    ],
    "expected": "Status=1 Hoàn thành với TotalRecords=0; file vẫn xuất với bảng rỗng/thông báo 'Không có dữ liệu'; không lỗi.",
    "evidence": [
     {
      "name": "TC-RPT-027__s01__empty",
      "caption": "Báo cáo sinh ra 0 bản ghi",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#256"
    ]
   },
   {
    "id": "TC-RPT-028",
    "title": "State — báo cáo đã sinh quá ExpiryDate tự dọn / không tải được",
    "category": "state",
    "priority": "P2",
    "role": "KHTH",
    "preconditions": "GeneratedReport có ExpiryDate đã qua.",
    "steps": [
     "Mở lịch sử báo cáo đã sinh",
     "Tìm bản ghi quá hạn",
     "Thử tải file"
    ],
    "expected": "File đã hết hạn không tải được (đã dọn theo ExpiryDate) với thông báo rõ; không lỗi 500; gợi ý sinh lại.",
    "evidence": [
     {
      "name": "TC-RPT-028__s01__error",
      "caption": "Báo cáo hết hạn không tải được",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#256"
    ]
   }
  ],
  "ui_state_checklist": [
   "list (danh mục báo cáo, nhật ký truy cập)",
   "detail (Dashboard KPI, mẫu báo cáo, báo cáo đã sinh)",
   "form (tạo/sửa mẫu báo cáo)",
   "modal (tạo báo cáo mới)",
   "drawer (nhập tham số sinh báo cáo)",
   "tab (4 nhóm operational/clinical/financial/regulatory)",
   "filter (lọc log/báo cáo theo user/khoa/ngày)",
   "validation (field bắt buộc, email, khoảng ngày)",
   "empty (nhóm rỗng, 0 bản ghi, lịch sử trống)",
   "loading (Dashboard/sinh báo cáo Đang tạo)",
   "error (Status Lỗi/ErrorMessage, API lỗi, hết hạn, path-traversal)",
   "confirm (hủy giữa chừng)",
   "success (tạo/sinh thành công)",
   "toast (xuất Excel)",
   "permission (role/khoa không đủ quyền, IDOR, anonymous)",
   "dark/light parity (Dashboard + biểu đồ + format tiền/ngày)"
  ],
  "gaps": [
   "data.js không nêu cơ chế scheduler/cron cho báo cáo định kỳ (schedule=Tự động) — cần xác nhận có background worker thật hay chỉ UI tĩnh để test integration TC-RPT-022 đúng.",
   "Chưa rõ phân quyền chi tiết theo AllowedRoles/AllowedDepartments được thực thi ở BE hay chỉ ẩn UI — cần test API trực tiếp (đã đưa vào TC-RPT-015/016/023) nhưng cần ma trận #216 cụ thể cho lớp fin.",
   "Reports.tsx hiện dùng dữ liệu REPORTS hard-code (RPT-001...) — cần xác minh báo cáo có gắn ReportTemplate thật trong DB hay là stub; nếu stub thì TC tạo/sinh/tải chưa kiểm được persistence (rủi ro 'stub không backend-ready').",
   "Thiếu case kiểm tra giới hạn dung lượng file (FileSize) + cảnh báo khi báo cáo quá lớn (ExecutionTimeMs cao) — nên bổ sung ngưỡng/timeout.",
   "Chưa có case test cấu hình DashboardWidget (GridX/Y/Width/Height, RefreshInterval, ChartType) — nếu có màn cấu hình widget cần thêm task kéo-thả/lưu layout + auto-refresh.",
   "Chưa rõ liên thông báo cáo BYT C79/C80 nằm ở phân hệ insurance hay reports — cần phân định scope để tránh trùng test với phân hệ BHYT.",
   "Thiếu kiểm thử concurrency: 2 user cùng sinh 1 báo cáo nặng / cùng cập nhật mẫu (last-write-wins vs lock).",
   "Chưa có case kiểm tra responsive mobile/tablet cho Dashboard nhiều widget (chỉ mới dark/light)."
  ]
 },
 {
  "id": "quality",
  "code": "QLT",
  "layer": "fin",
  "ic": "✅",
  "nm": "Chất lượng & Sự cố",
  "gh": [
   "#262",
   "#282"
  ],
  "gap": false,
  "module_id": "quality",
  "summary": "Phân hệ \"Chất lượng & Sự cố\" (QLT) quản lý chỉ số chất lượng (QualityIndicators ⟶ QualityIndicatorValues), báo cáo sự cố y khoa (IncidentReports ⟶ điều tra RCA ⟶ CAPAs hành động khắc phục/phòng ngừa) và kế hoạch/đánh giá audit định kỳ (AuditPlans/InternalAudits ⟶ AuditFindings). Màn chính là trang v2 /v2/quality gồm 3 tab: Bộ chỉ số chất lượng (KPI theo nhóm, đạt/chưa đạt theo targetType AtLeast/AtMost), Sự cố y khoa (list + status tabs Mới/Điều tra/Đóng + modal báo cáo + drawer chi tiết với RCA/phòng ngừa/bài học), và Đánh giá định kỳ (audit). KPI strip tổng hợp: chỉ số đạt, sự cố tổng/nặng (severity ≥5), đang điều tra, tỉ lệ đạt. API client còn phủ CAPA, khảo sát hài lòng, alert, dashboard — chưa có UI v2 đầy đủ (gap).",
  "screens": [
   {
    "name": "Trang Chất lượng v2 - KPI strip + TopTabs",
    "desc": "Khung trang /v2/quality: KpiStrip 6 ô (Chỉ số đạt /tổng, Sự cố tổng, Sự cố nặng level≥5, Đang điều tra, KPI tổng, Tỉ lệ đạt %), TopTabs 3 tab (Bộ chỉ số chất lượng / Sự cố y khoa / Đánh giá định kỳ), nút Làm mới + Báo cáo sự cố.",
    "route_guess": "/v2/quality",
    "elements": [
     "KpiStrip 6 KPI",
     "TopTabs kpi/incidents/audit",
     "Btn Làm mới (refresh)",
     "Btn Báo cáo sự cố (primary)"
    ]
   },
   {
    "name": "Tab Bộ chỉ số chất lượng (KPI)",
    "desc": "Danh sách chỉ số nhóm theo categoryName: mỗi dòng có indicatorCode, name, thanh progress (đạt=xanh, chưa đạt=đỏ theo targetType AtLeast/AtMost), giá trị hiện tại / targetValue, badge Đạt/Chưa đạt. Có empty state 'Chưa có chỉ số chất lượng' và loading.",
    "route_guess": "/v2/quality (tab kpi)",
    "elements": [
     "Group header theo category",
     "Row chỉ số (code/name/progress/value/badge)",
     "StatusBadge Đạt/Chưa đạt",
     "Empty state chart",
     "Loading 'Đang tải…'"
    ]
   },
   {
    "name": "Tab Sự cố y khoa - list",
    "desc": "SearchBox tìm mã/khoa/loại/người báo cáo, Btn Bỏ lọc, đếm số sự cố, StatusTabs Mới/Điều tra/Đóng (counts), DataTable cột Mã sự cố/Loại/Mức độ(chip severity)/Khoa/Người báo cáo/Báo cáo(ngày)/Trạng thái, action eye+edit, Pager.",
    "route_guess": "/v2/quality (tab incidents)",
    "elements": [
     "SearchBox",
     "Btn Bỏ lọc",
     "StatusTabs reported/investigation/closed + counts",
     "DataTable 7 cột",
     "chip severity",
     "ActBtn eye/edit",
     "Pager",
     "Empty 'Không có sự cố nào'"
    ]
   },
   {
    "name": "Modal Báo cáo sự cố y khoa",
    "desc": "ModalShell form: Thời điểm xảy ra (DatePicker showTime), Khoa/phòng* (Select search), Loại sự cố* (Select 8 loại), Mức độ (Select 1-6), Vị trí cụ thể, Mô tả sự cố*, Xử lý ngay, Checkbox bắt buộc báo cáo cấp trên. Footer Hủy/Ghi nhận.",
    "route_guess": "/v2/quality (modal)",
    "elements": [
     "DatePicker showTime",
     "Select Khoa (required)",
     "Select Loại sự cố (required)",
     "Select Mức độ 1-6",
     "Input Vị trí",
     "TextArea Mô tả (required)",
     "TextArea Xử lý ngay",
     "Checkbox isReportable",
     "Btn Hủy/Ghi nhận"
    ]
   },
   {
    "name": "Drawer chi tiết sự cố",
    "desc": "DrawerShell size lg: header mã + loại + khoa + ngày; section THÔNG TIN SỰ CỐ (mã/loại/mức độ chip/khoa/vị trí/người báo cáo), MÔ TẢ, XỬ LÝ NGAY, ĐIỀU TRA (người điều tra/RCA method/root cause), PHÒNG NGỪA, BÀI HỌC RÚT RA — hiển thị có điều kiện theo dữ liệu.",
    "route_guess": "/v2/quality (drawer)",
    "elements": [
     "Header mã+loại",
     "Section THÔNG TIN",
     "Section MÔ TẢ",
     "Section ĐIỀU TRA (RCA)",
     "Section PHÒNG NGỪA",
     "Section BÀI HỌC"
    ]
   },
   {
    "name": "Tab Đánh giá định kỳ (audit)",
    "desc": "Lưới 2 cột thẻ audit: tiêu đề, kỳ, badge trạng thái (Hoàn tất/Đang triển khai), điểm số. Hiện đang hiển thị dữ liệu mock cứng (gap: chưa nối API audits).",
    "route_guess": "/v2/quality (tab audit)",
    "elements": [
     "Thẻ audit (title/kỳ/score)",
     "StatusBadge Hoàn tất/Đang triển khai"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-QLT-001",
    "title": "Mở trang Chất lượng v2 - KPI strip và 3 tab hiển thị đúng",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Đăng nhập admin/Admin@123; BE localhost:5106 chạy; có dữ liệu chỉ số + sự cố seed.",
    "steps": [
     "Đăng nhập, vào /v2/quality",
     "Quan sát KpiStrip 6 ô và 3 tab TopTabs",
     "Đối chiếu số 'Tỉ lệ đạt %' = round(Chỉ số đạt / KPI tổng * 100)"
    ],
    "expected": "KpiStrip hiển thị đủ 6 ô (Chỉ số đạt /tổng, Sự cố tổng, Sự cố nặng, Đang điều tra, KPI tổng, Tỉ lệ đạt %), 3 tab Bộ chỉ số/Sự cố/Đánh giá; Tỉ lệ đạt tính đúng; mặc định ở tab Bộ chỉ số.",
    "evidence": [
     {
      "name": "TC-QLT-001__s01__list",
      "caption": "Trang quality mở, KPI strip + 3 tab",
      "uiState": "list"
     },
     {
      "name": "TC-QLT-001__s02__tab",
      "caption": "TopTabs 3 tab",
      "uiState": "tab"
     }
    ],
    "refIssues": [
     "#262",
     "#282"
    ]
   },
   {
    "id": "TC-QLT-002",
    "title": "Tab Bộ chỉ số - chỉ số nhóm theo category, đạt/chưa đạt đúng theo targetType",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có ≥2 chỉ số: 1 targetType AtLeast (current ≥ target ⇒ Đạt), 1 AtMost (current ≤ target ⇒ Đạt).",
    "steps": [
     "Vào tab Bộ chỉ số chất lượng",
     "Xem các group header theo categoryName",
     "Với chỉ số AtLeast: kiểm badge Đạt khi current≥target",
     "Với chỉ số AtMost: kiểm badge Đạt khi current≤target",
     "Quan sát thanh progress màu xanh khi đạt, đỏ khi chưa"
    ],
    "expected": "Chỉ số gom nhóm đúng category; badge Đạt/Chưa đạt tính đúng theo targetType AtLeast/AtMost; progress xanh(đạt)/đỏ(chưa); value hiển thị dạng vi-VN current / target.",
    "evidence": [
     {
      "name": "TC-QLT-002__s01__tab",
      "caption": "Tab KPI nhóm theo category",
      "uiState": "tab"
     },
     {
      "name": "TC-QLT-002__s02__list",
      "caption": "Dòng chỉ số đạt và chưa đạt",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-003",
    "title": "Tab Bộ chỉ số - empty state khi không có chỉ số nào",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Tài khoản/khoa không có chỉ số chất lượng, hoặc API trả mảng rỗng.",
    "steps": [
     "Vào tab Bộ chỉ số khi indicators rỗng",
     "Quan sát vùng trống"
    ],
    "expected": "Hiển thị empty state icon chart + 'Chưa có chỉ số chất lượng'; KPI tổng = 0, Tỉ lệ đạt = 0%.",
    "evidence": [
     {
      "name": "TC-QLT-003__s01__empty",
      "caption": "Empty state chỉ số",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-004",
    "title": "Tab Bộ chỉ số - loading state khi đang tải",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Mạng chậm / throttle network để bắt trạng thái loading.",
    "steps": [
     "Reload trang, throttle network",
     "Vào tab Bộ chỉ số ngay khi đang tải"
    ],
    "expected": "Hiển thị 'Đang tải…' căn giữa trong khi chưa có dữ liệu.",
    "evidence": [
     {
      "name": "TC-QLT-004__s01__loading",
      "caption": "Loading chỉ số",
      "uiState": "loading"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-005",
    "title": "Tab Sự cố - list hiển thị đủ cột và đếm số sự cố",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có ≥3 sự cố seed với khoa/loại/mức độ khác nhau.",
    "steps": [
     "Vào tab Sự cố y khoa",
     "Quan sát DataTable 7 cột",
     "Kiểm chip mức độ theo SEVERITY_TONE (1-3 ok, 4 warn, 5-6 crit)",
     "Kiểm số 'N sự cố' bên phải khớp số dòng sau lọc"
    ],
    "expected": "DataTable hiển thị Mã sự cố/Loại+mô tả/Mức độ(chip)/Khoa/Người báo cáo/Ngày báo cáo(DD/MM/YYYY)/Trạng thái; chip màu đúng severity; bộ đếm khớp; ngày format DD/MM/YYYY.",
    "evidence": [
     {
      "name": "TC-QLT-005__s01__list",
      "caption": "List sự cố 7 cột",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262",
     "#282"
    ]
   },
   {
    "id": "TC-QLT-006",
    "title": "Tab Sự cố - StatusTabs Mới/Điều tra/Đóng lọc đúng theo status",
    "category": "state",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có sự cố ở status 1 (Mới), 2-4 (Điều tra), 5 (Đóng).",
    "steps": [
     "Vào tab Sự cố",
     "Lần lượt bấm tab Mới / Điều tra / Đóng",
     "Đối chiếu counts mỗi tab với số dòng hiển thị"
    ],
    "expected": "incStatusKey map đúng: status=1 ⇒ Mới, 2-4 ⇒ Điều tra, 5 ⇒ Đóng; counts mỗi tab khớp số dòng; tab 'tất cả' = tổng.",
    "evidence": [
     {
      "name": "TC-QLT-006__s01__filter",
      "caption": "StatusTabs Mới/Điều tra/Đóng + counts",
      "uiState": "filter"
     },
     {
      "name": "TC-QLT-006__s02__list",
      "caption": "List lọc theo trạng thái Điều tra",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-007",
    "title": "Tab Sự cố - tìm kiếm theo mã/khoa/loại/người báo cáo",
    "category": "happy",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có sự cố với mã/khoa/loại/người báo cáo phân biệt.",
    "steps": [
     "Nhập từ khóa mã sự cố vào SearchBox",
     "Quan sát list lọc",
     "Nhập tên khoa",
     "Nhập tên người báo cáo"
    ],
    "expected": "List lọc theo incidentCode/description/departmentName/reportedByName/incidentTypeName (case-insensitive); bộ đếm cập nhật; page reset hợp lý.",
    "evidence": [
     {
      "name": "TC-QLT-007__s01__filter",
      "caption": "Kết quả tìm kiếm",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-008",
    "title": "Tab Sự cố - tìm kiếm tiếng Việt có dấu và ký tự đặc biệt",
    "category": "edge",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Có sự cố mô tả tiếng Việt có dấu (vd 'Té ngã buồng bệnh').",
    "steps": [
     "Nhập từ khóa có dấu 'té ngã'",
     "Nhập từ khóa viết hoa 'TÉ NGÃ'",
     "Nhập ký tự đặc biệt %_'\" và chuỗi rất dài >200 ký tự"
    ],
    "expected": "Tìm có dấu khớp đúng, không phân biệt hoa/thường; ký tự đặc biệt/chuỗi dài không gây vỡ UI/crash, trả empty hợp lệ.",
    "evidence": [
     {
      "name": "TC-QLT-008__s01__filter",
      "caption": "Tìm tiếng Việt có dấu",
      "uiState": "filter"
     },
     {
      "name": "TC-QLT-008__s02__empty",
      "caption": "Ký tự đặc biệt trả rỗng",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-009",
    "title": "Tab Sự cố - Bỏ lọc reset search và status về mặc định",
    "category": "happy",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Đang có từ khóa tìm + đang ở tab status khác 'tất cả'.",
    "steps": [
     "Nhập từ khóa và chọn tab Điều tra",
     "Bấm Bỏ lọc"
    ],
    "expected": "Search về rỗng, status về 'all', list hiển thị lại toàn bộ.",
    "evidence": [
     {
      "name": "TC-QLT-009__s01__list",
      "caption": "Sau khi bỏ lọc",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-010",
    "title": "Tab Sự cố - empty state khi không có sự cố",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Lọc ra tập rỗng hoặc không có sự cố nào.",
    "steps": [
     "Tìm từ khóa không khớp gì",
     "Quan sát vùng table"
    ],
    "expected": "Hiển thị empty 'Không có sự cố nào' với icon check; Pager hiển thị 0; trong khi tải hiển thị 'Đang tải…'.",
    "evidence": [
     {
      "name": "TC-QLT-010__s01__empty",
      "caption": "Empty không có sự cố",
      "uiState": "empty"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-011",
    "title": "Tab Sự cố - phân trang Pager (PAGE_SIZE=16)",
    "category": "edge",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Có >16 sự cố để có nhiều trang.",
    "steps": [
     "Vào tab Sự cố với >16 bản ghi",
     "Chuyển trang qua Pager",
     "Đổi từ khóa rồi kiểm page",
     "Về trang cuối kiểm số dòng cuối"
    ],
    "expected": "Mỗi trang tối đa 16 dòng; totalPages = ceil(count/16); chuyển trang đúng; trang cuối hiển thị phần dư; tổng/perPage hiển thị chính xác.",
    "evidence": [
     {
      "name": "TC-QLT-011__s01__list",
      "caption": "Trang 1 với 16 dòng",
      "uiState": "list"
     },
     {
      "name": "TC-QLT-011__s02__list",
      "caption": "Trang 2",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-012",
    "title": "Báo cáo sự cố - happy path tạo sự cố mới thành công",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có danh mục khoa (catalog departments) trả về cho Select.",
    "steps": [
     "Bấm Báo cáo sự cố mở modal",
     "Chọn Thời điểm xảy ra",
     "Chọn Khoa/phòng",
     "Chọn Loại sự cố",
     "Chọn Mức độ",
     "Nhập Mô tả sự cố",
     "Bấm Ghi nhận"
    ],
    "expected": "POST /quality/incidents thành công; toast 'Đã ghi nhận báo cáo sự cố'; modal đóng; list reload và sự cố mới xuất hiện ở tab Mới.",
    "evidence": [
     {
      "name": "TC-QLT-012__s01__modal",
      "caption": "Modal báo cáo sự cố",
      "uiState": "modal"
     },
     {
      "name": "TC-QLT-012__s02__form",
      "caption": "Form đã điền đủ",
      "uiState": "form"
     },
     {
      "name": "TC-QLT-012__s03__success",
      "caption": "Toast thành công + list reload",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#262",
     "#282"
    ]
   },
   {
    "id": "TC-QLT-013",
    "title": "Báo cáo sự cố - validation thiếu Khoa/Loại/Mô tả",
    "category": "validation",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Modal báo cáo sự cố đang mở, các trường bắt buộc để trống.",
    "steps": [
     "Mở modal, bấm Ghi nhận khi chưa chọn Khoa",
     "Chọn Khoa, bấm Ghi nhận khi chưa chọn Loại",
     "Chọn Loại, bấm Ghi nhận khi Mô tả trống"
    ],
    "expected": "Lần lượt cảnh báo 'Chọn khoa/phòng xảy ra sự cố' → 'Chọn loại sự cố' → 'Nhập mô tả sự cố'; không gọi API; không đóng modal.",
    "evidence": [
     {
      "name": "TC-QLT-013__s01__validation",
      "caption": "Cảnh báo thiếu Khoa",
      "uiState": "validation"
     },
     {
      "name": "TC-QLT-013__s02__validation",
      "caption": "Cảnh báo thiếu Mô tả",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-014",
    "title": "Báo cáo sự cố - reset form mỗi lần mở lại modal",
    "category": "state",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Đã từng nhập dở rồi đóng modal.",
    "steps": [
     "Mở modal, nhập một phần (loại, mô tả)",
     "Bấm Hủy",
     "Mở lại modal"
    ],
    "expected": "Khi mở lại: Thời điểm = hiện tại, Khoa/Loại trống, Mức độ = 2, mô tả/vị trí/xử lý trống, checkbox tắt; không giữ dữ liệu cũ.",
    "evidence": [
     {
      "name": "TC-QLT-014__s01__modal",
      "caption": "Modal mở lại đã reset",
      "uiState": "modal"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-015",
    "title": "Báo cáo sự cố - huỷ giữa chừng không tạo bản ghi",
    "category": "negative",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Modal mở, đã nhập đủ trường bắt buộc.",
    "steps": [
     "Điền đủ Khoa/Loại/Mô tả",
     "Bấm Hủy thay vì Ghi nhận",
     "Kiểm list không có bản ghi mới"
    ],
    "expected": "Không gọi POST; modal đóng; danh sách sự cố không tăng.",
    "evidence": [
     {
      "name": "TC-QLT-015__s01__modal",
      "caption": "Form đã điền trước khi huỷ",
      "uiState": "modal"
     },
     {
      "name": "TC-QLT-015__s02__list",
      "caption": "List không thay đổi sau huỷ",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-016",
    "title": "Báo cáo sự cố - mức độ 6 (Tử vong/Sentinel) + checkbox bắt buộc báo cáo cấp trên",
    "category": "edge",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Modal mở.",
    "steps": [
     "Chọn Mức độ '6 · Tử vong / Sentinel'",
     "Tick 'Sự cố bắt buộc báo cáo cấp trên'",
     "Nhập đủ trường bắt buộc, Ghi nhận",
     "Mở list, mở drawer sự cố vừa tạo"
    ],
    "expected": "Tạo thành công với severity=6, isReportable=true; chip mức độ hiển thị tone crit; sự cố nặng (≥5) được tính vào KPI 'Sự cố nặng'.",
    "evidence": [
     {
      "name": "TC-QLT-016__s01__form",
      "caption": "Form mức độ 6 + checkbox báo cáo cấp trên",
      "uiState": "form"
     },
     {
      "name": "TC-QLT-016__s02__success",
      "caption": "Tạo thành công, KPI sự cố nặng tăng",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#262",
     "#282"
    ]
   },
   {
    "id": "TC-QLT-017",
    "title": "Báo cáo sự cố - thời điểm xảy ra ở tương lai / quá khứ xa",
    "category": "edge",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Modal mở.",
    "steps": [
     "Đặt Thời điểm xảy ra là ngày tương lai",
     "Ghi nhận và quan sát",
     "Lặp lại với ngày quá khứ rất xa (vd 01/01/1990)"
    ],
    "expected": "Hệ thống nên cảnh báo/chặn thời điểm xảy ra ở tương lai (sự cố không thể xảy ra trong tương lai); ngày quá khứ xa lưu được nhưng ghi nhận đúng. Nếu không có chặn ⇒ ghi gap.",
    "evidence": [
     {
      "name": "TC-QLT-017__s01__form",
      "caption": "Chọn thời điểm tương lai",
      "uiState": "form"
     },
     {
      "name": "TC-QLT-017__s02__validation",
      "caption": "Kỳ vọng cảnh báo ngày tương lai",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-018",
    "title": "Báo cáo sự cố - mô tả/vị trí chuỗi dài + ký tự đặc biệt + dấu tiếng Việt",
    "category": "edge",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Modal mở.",
    "steps": [
     "Nhập Mô tả >2000 ký tự gồm dấu tiếng Việt + emoji + xuống dòng",
     "Nhập Vị trí có ký tự đặc biệt < > & ' \"",
     "Ghi nhận, mở drawer kiểm hiển thị"
    ],
    "expected": "Lưu và hiển thị nguyên vẹn (whitespace-pre-wrap), không vỡ layout; ký tự < > & hiển thị như text (không thực thi script).",
    "evidence": [
     {
      "name": "TC-QLT-018__s01__form",
      "caption": "Mô tả chuỗi dài + ký tự đặc biệt",
      "uiState": "form"
     },
     {
      "name": "TC-QLT-018__s02__drawer",
      "caption": "Drawer hiển thị nguyên văn",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-019",
    "title": "Báo cáo sự cố - lỗi API trả về hiển thị toast thất bại",
    "category": "negative",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Giả lập BE trả 4xx/5xx cho POST /quality/incidents.",
    "steps": [
     "Điền đủ trường, Ghi nhận khi BE lỗi",
     "Quan sát thông báo"
    ],
    "expected": "Toast 'Báo cáo sự cố thất bại'; modal KHÔNG đóng (cho phép thử lại); nút trở lại trạng thái bấm được sau khi busy.",
    "evidence": [
     {
      "name": "TC-QLT-019__s01__error",
      "caption": "Toast thất bại khi API lỗi",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-020",
    "title": "Drawer chi tiết sự cố - mở từ row/eye và hiển thị các section",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có sự cố có đủ dữ liệu mô tả + xử lý ngay.",
    "steps": [
     "Bấm vào dòng sự cố (onRowClick) hoặc nút eye",
     "Quan sát DrawerShell",
     "Cuộn xem các section"
    ],
    "expected": "Drawer mở size lg; header mã + loại + khoa + ngày; section THÔNG TIN SỰ CỐ đầy đủ (mã/loại/chip mức độ/khoa/vị trí/người báo cáo·ngày), MÔ TẢ hiển thị; XỬ LÝ NGAY hiện nếu có.",
    "evidence": [
     {
      "name": "TC-QLT-020__s01__drawer",
      "caption": "Drawer chi tiết sự cố",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#262",
     "#282"
    ]
   },
   {
    "id": "TC-QLT-021",
    "title": "Drawer chi tiết - section ĐIỀU TRA/RCA/PHÒNG NGỪA/BÀI HỌC hiển thị có điều kiện",
    "category": "state",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Cần 2 sự cố: (a) chưa điều tra (investigationRequired=false, không có RCA), (b) đã điều tra đầy đủ (RCA method, root cause, phòng ngừa, bài học).",
    "steps": [
     "Mở drawer sự cố (a) chưa điều tra",
     "Xác nhận không có section ĐIỀU TRA/PHÒNG NGỪA/BÀI HỌC",
     "Mở drawer sự cố (b) đã điều tra đầy đủ",
     "Xác nhận hiện ĐIỀU TRA (người điều tra/PP RCA/root cause), PHÒNG NGỪA, BÀI HỌC"
    ],
    "expected": "Section điều kiện chỉ render khi có dữ liệu tương ứng (investigationRequired, preventiveMeasures, lessonLearned); không render block rỗng.",
    "evidence": [
     {
      "name": "TC-QLT-021__s01__drawer",
      "caption": "Sự cố chưa điều tra - không có section RCA",
      "uiState": "drawer"
     },
     {
      "name": "TC-QLT-021__s02__drawer",
      "caption": "Sự cố đã điều tra đầy đủ RCA/phòng ngừa/bài học",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-022",
    "title": "Vòng đời sự cố - chuyển trạng thái hợp lệ Mới → Điều tra → Đóng",
    "category": "state",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có sự cố ở trạng thái Mới (status=1); BE hỗ trợ assignInvestigator/investigate/close.",
    "steps": [
     "Mở sự cố Mới, phân điều tra viên (assign)",
     "Ghi nhận điều tra (investigate: RCA + corrective actions)",
     "Đóng sự cố (close + notes)",
     "Kiểm trạng thái + tab tương ứng"
    ],
    "expected": "Trạng thái chuyển 1→2(điều tra)→5(đóng); sự cố di chuyển qua các StatusTabs Mới→Điều tra→Đóng; counts KPI 'Đang điều tra' cập nhật; audit log ghi mỗi mutation.",
    "evidence": [
     {
      "name": "TC-QLT-022__s01__drawer",
      "caption": "Sự cố trước khi điều tra",
      "uiState": "drawer"
     },
     {
      "name": "TC-QLT-022__s02__confirm",
      "caption": "Xác nhận đóng sự cố",
      "uiState": "confirm"
     },
     {
      "name": "TC-QLT-022__s03__success",
      "caption": "Sự cố đã đóng, chuyển tab Đóng",
      "uiState": "success"
     }
    ],
    "notes": "Drawer v2 hiện chỉ xem; thao tác assign/investigate/close có thể chưa có UI ⇒ kiểm qua API hoặc ghi gap nếu UI thiếu.",
    "refIssues": [
     "#262",
     "#282"
    ]
   },
   {
    "id": "TC-QLT-023",
    "title": "Vòng đời sự cố - chặn chuyển trạng thái không hợp lệ (đóng khi chưa điều tra / sửa sự cố đã đóng)",
    "category": "state",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có sự cố yêu cầu điều tra chưa hoàn tất; có sự cố đã Đóng (status=5).",
    "steps": [
     "Thử Đóng sự cố cần điều tra mà chưa có RCA/corrective action",
     "Thử cập nhật/sửa sự cố đã Đóng"
    ],
    "expected": "Hệ thống chặn đóng khi điều kiện điều tra chưa đủ (báo lỗi rõ); sự cố đã Đóng không cho sửa nội dung (khoá), chỉ xem.",
    "evidence": [
     {
      "name": "TC-QLT-023__s01__error",
      "caption": "Chặn đóng khi chưa điều tra",
      "uiState": "error"
     }
    ],
    "notes": "Nếu BE/UI không chặn ⇒ tạo task bug + ghi gap (rủi ro patient-safety/audit).",
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-024",
    "title": "Data-consistency - tạo sự cố nặng phản ánh đúng KPI strip + tab + counts",
    "category": "data-consistency",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Ghi nhận giá trị KPI 'Sự cố tổng', 'Sự cố nặng', 'Đang điều tra' trước khi tạo.",
    "steps": [
     "Ghi lại KPI hiện tại",
     "Tạo sự cố severity=5",
     "Reload/quan sát KpiStrip",
     "Kiểm tab Sự cố counts 'Mới' tăng 1"
    ],
    "expected": "Sự cố tổng +1, Sự cố nặng +1 (vì ≥5), tab Mới counts +1; nếu sau đó chuyển sang điều tra thì 'Đang điều tra' +1. Số liệu nhất quán giữa KPI và list.",
    "evidence": [
     {
      "name": "TC-QLT-024__s01__list",
      "caption": "KPI + counts trước",
      "uiState": "list"
     },
     {
      "name": "TC-QLT-024__s02__success",
      "caption": "KPI + counts sau khi tạo sự cố nặng",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#262",
     "#282"
    ]
   },
   {
    "id": "TC-QLT-025",
    "title": "Permission - vai trò không đủ quyền bị chặn menu/nút/API Chất lượng",
    "category": "permission",
    "priority": "P0",
    "role": "user-han-che",
    "preconditions": "Có tài khoản role không thuộc nhóm quản lý chất lượng (vd lễ tân/điều dưỡng cơ bản); tham chiếu matrix #216.",
    "steps": [
     "Đăng nhập role hạn chế",
     "Kiểm menu Chất lượng có hiển thị không",
     "Truy cập trực tiếp /v2/quality",
     "Thử gọi POST /quality/incidents qua API"
    ],
    "expected": "Theo matrix: nếu role không có quyền ⇒ ẩn menu/chặn route (redirect/403), nút 'Báo cáo sự cố' ẩn/disable, API trả 403. Không lộ dữ liệu chất lượng cho role không phận sự.",
    "evidence": [
     {
      "name": "TC-QLT-025__s01__permission",
      "caption": "Role hạn chế bị chặn truy cập",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#216",
     "#262"
    ]
   },
   {
    "id": "TC-QLT-026",
    "title": "Permission - người báo cáo chỉ xem sự cố của khoa mình (giới hạn theo khoa)",
    "category": "permission",
    "priority": "P1",
    "role": "truong-khoa",
    "preconditions": "Có sự cố thuộc nhiều khoa khác nhau; role giới hạn theo khoa.",
    "steps": [
     "Đăng nhập role giới hạn khoa A",
     "Vào tab Sự cố",
     "Kiểm danh sách có lẫn sự cố khoa B không"
    ],
    "expected": "Chỉ thấy sự cố khoa được phân quyền; không xem được sự cố khoa khác. Nếu hệ thống cho xem hết ⇒ ghi gap về phân quyền theo khoa.",
    "evidence": [
     {
      "name": "TC-QLT-026__s01__list",
      "caption": "List giới hạn theo khoa",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#216",
     "#262"
    ]
   },
   {
    "id": "TC-QLT-027",
    "title": "Security - IDOR truy cập trực tiếp sự cố theo id của khoa/đơn vị khác",
    "category": "security",
    "priority": "P0",
    "role": "user-han-che",
    "preconditions": "Biết id một sự cố không thuộc phạm vi user; có token role hạn chế.",
    "steps": [
     "Lấy id sự cố khoa khác",
     "Gọi GET /quality/incidents/{id} với token role hạn chế",
     "Thử GET /quality/incidents/{id}/print"
    ],
    "expected": "Trả 403/404, không lộ chi tiết sự cố (bệnh nhân liên quan, RCA) cho user không phận sự; endpoint print cũng bị chặn.",
    "evidence": [
     {
      "name": "TC-QLT-027__s01__error",
      "caption": "IDOR bị chặn 403/404",
      "uiState": "error"
     }
    ],
    "notes": "Sự cố có thể chứa patientId/patientName ⇒ rò rỉ là vi phạm bảo mật bệnh nhân.",
    "refIssues": [
     "#216",
     "#262"
    ]
   },
   {
    "id": "TC-QLT-028",
    "title": "Security - XSS ở field mô tả/xử lý ngay/vị trí (note free-text)",
    "category": "security",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Modal báo cáo sự cố mở.",
    "steps": [
     "Nhập Mô tả = '<img src=x onerror=alert(1)>' và '<script>alert(1)</script>'",
     "Ghi nhận",
     "Mở drawer xem chi tiết",
     "Quan sát có script nào chạy không"
    ],
    "expected": "Nội dung hiển thị nguyên văn dạng text (React escape), KHÔNG thực thi script/onerror; không có alert. Audit log lưu nguyên văn.",
    "evidence": [
     {
      "name": "TC-QLT-028__s01__drawer",
      "caption": "Payload XSS hiển thị như text, không chạy",
      "uiState": "drawer"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-029",
    "title": "UI - dark/light parity toàn trang Chất lượng",
    "category": "ui",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Topbar v2 có toggle dark/light.",
    "steps": [
     "Mở /v2/quality ở dark mode, xem KPI/tab/list/drawer/modal",
     "Toggle sang light mode",
     "Đối chiếu chip mức độ, progress bar, badge, contrast chữ"
    ],
    "expected": "Cả hai theme hiển thị đúng: chip severity (ok/warn/crit), thanh progress xanh/đỏ, StatusBadge, chữ đủ tương phản; không có vùng trắng/đen lệm, không mất viền.",
    "evidence": [
     {
      "name": "TC-QLT-029__s01__list",
      "caption": "Dark mode",
      "uiState": "list"
     },
     {
      "name": "TC-QLT-029__s02__list",
      "caption": "Light mode",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-030",
    "title": "UI - format số/ngày/tiền và chip severity hiển thị đúng",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Có chỉ số với targetValue lớn (vd 1.000.000) và sự cố nhiều mức độ.",
    "steps": [
     "Tab KPI: kiểm value current/target format vi-VN (dấu chấm ngăn cách nghìn)",
     "Tab Sự cố: kiểm ngày DD/MM/YYYY",
     "Kiểm chip mức độ màu theo 1-3/4/5-6"
    ],
    "expected": "Số format vi-VN (1.000.000); ngày DD/MM/YYYY (— khi thiếu); chip severity màu đúng tone; severityName hiển thị thay vì số thô.",
    "evidence": [
     {
      "name": "TC-QLT-030__s01__tab",
      "caption": "Format số chỉ số vi-VN",
      "uiState": "tab"
     },
     {
      "name": "TC-QLT-030__s02__list",
      "caption": "Chip severity + ngày DD/MM/YYYY",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-031",
    "title": "Negative - BE Chất lượng down/timeout, trang vẫn render không crash",
    "category": "negative",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Tắt BE hoặc giả lập timeout cho /quality/incidents và /quality/indicators.",
    "steps": [
     "Mở /v2/quality khi BE lỗi",
     "Quan sát KPI/tab/list",
     "Vào từng tab"
    ],
    "expected": "Promise.allSettled nên cô lập lỗi: trang không crash, hiển thị empty/loading hợp lý, KPI = 0; không màn trắng. Lý tưởng có thông báo lỗi tải dữ liệu.",
    "evidence": [
     {
      "name": "TC-QLT-031__s01__error",
      "caption": "BE lỗi - trang vẫn render empty/0",
      "uiState": "error"
     }
    ],
    "notes": "Hiện code chỉ allSettled rồi setLoading(false) — không có error banner ⇒ kiểm + ghi gap nếu không có phản hồi lỗi cho user.",
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-032",
    "title": "Tab Đánh giá định kỳ - kiểm dữ liệu thật vs mock",
    "category": "data-consistency",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có AuditPlans/InternalAudits trong DB.",
    "steps": [
     "Vào tab Đánh giá định kỳ",
     "Đối chiếu 4 thẻ hiển thị với dữ liệu DB qua API /quality/audits"
    ],
    "expected": "Tab phải hiển thị dữ liệu audit THẬT từ API. Hiện AuditTab hard-code mock cứng (Q4/2025…) ⇒ tạo task bug + ghi gap: tab audit chưa nối API.",
    "evidence": [
     {
      "name": "TC-QLT-032__s01__tab",
      "caption": "Tab audit (đang mock cứng)",
      "uiState": "tab"
     }
    ],
    "notes": "Bug đã lộ qua đọc code: AuditTab dùng mảng cố định, không gọi getAudits. DoD: tạo Issue fix liên kết #262.",
    "refIssues": [
     "#262"
    ]
   },
   {
    "id": "TC-QLT-033",
    "title": "Integration - báo cáo sự cố bắt buộc lên cơ quan (reportToAuthority) và liên kết CAPA",
    "category": "integration",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có sự cố isReportable=true; BE hỗ trợ report-authority và createCAPA sourceType=Incident.",
    "steps": [
     "Mở sự cố reportable",
     "Gửi báo cáo cơ quan (report-authority)",
     "Tạo CAPA từ sự cố (sourceType=Incident, sourceId=incidentId)",
     "Kiểm liên kết CAPA ⟶ sự cố"
    ],
    "expected": "reportedToAuthority=true + authorityReportDate được lưu; CAPA tạo được với nguồn là sự cố; liên kết IncidentReports ⟶ CAPAs đúng theo rel của phân hệ.",
    "evidence": [
     {
      "name": "TC-QLT-033__s01__drawer",
      "caption": "Sự cố đã báo cáo cơ quan + CAPA liên kết",
      "uiState": "drawer"
     }
    ],
    "notes": "UI v2 hiện chưa có nút report-authority/CAPA ⇒ kiểm qua API; nếu thiếu UI ⇒ ghi gap.",
    "refIssues": [
     "#262",
     "#282"
    ]
   }
  ],
  "ui_state_checklist": [
   "list - danh sách sự cố (DataTable 7 cột) + danh sách chỉ số KPI",
   "tab - chuyển 3 TopTabs (Bộ chỉ số / Sự cố / Đánh giá) + nhóm category KPI",
   "filter - SearchBox + StatusTabs Mới/Điều tra/Đóng + counts",
   "modal - modal Báo cáo sự cố y khoa",
   "form - form điền các trường (khoa/loại/mức độ/mô tả/checkbox)",
   "drawer - drawer chi tiết sự cố (thông tin/mô tả/điều tra-RCA/phòng ngừa/bài học)",
   "validation - cảnh báo thiếu khoa/loại/mô tả, ngày tương lai",
   "empty - không có sự cố / chưa có chỉ số / tìm không khớp",
   "loading - 'Đang tải…' khi fetch",
   "error - toast thất bại, BE lỗi/timeout, IDOR 403/404",
   "confirm - xác nhận đóng/chuyển trạng thái sự cố",
   "success - toast 'Đã ghi nhận', list/KPI reload",
   "toast - thông báo cảnh báo/thành công/lỗi",
   "permission - role hạn chế bị chặn menu/route/nút/API",
   "dark/light parity - chip/progress/badge/contrast ở cả 2 theme"
  ],
  "gaps": [
   "Tab 'Đánh giá định kỳ' (AuditTab) hard-code dữ liệu mock cứng (Q4/2025…), KHÔNG gọi API getAudits — cần nối AuditPlans/InternalAudits thật (tạo task bug liên kết #262).",
   "Drawer chi tiết sự cố hiện chỉ XEM: thiếu UI cho assign điều tra viên / ghi nhận điều tra (RCA) / đóng sự cố / báo cáo cơ quan (reportToAuthority) — vòng đời trạng thái không thao tác được trên UI v2 dù API đã có.",
   "Chưa có UI v2 cho CAPA (createCAPA/updateCAPAAction/verify/close) và Khảo sát hài lòng (surveys/statistics) dù API client đầy đủ — rel IncidentReports ⟶ CAPAs chưa thể hiện trên UI.",
   "Chưa có UI ghi/duyệt giá trị chỉ số (recordIndicatorValue/verifyIndicatorValue) và xem trend (getIndicatorTrend) — KPI hiện chỉ đọc currentValue do BE bơm runtime.",
   "Validation thời điểm xảy ra: không thấy chặn ngày/giờ tương lai cho sự cố — rủi ro dữ liệu phi lý.",
   "Xử lý lỗi tải dữ liệu: reload() dùng Promise.allSettled rồi setLoading(false) nhưng KHÔNG hiển thị error banner khi cả 2 API fail — user không biết dữ liệu lỗi (chỉ thấy empty/0).",
   "Phân quyền theo khoa cho sự cố (truong-khoa chỉ xem khoa mình) cần xác minh — chưa rõ BE lọc theo phòng ban; rủi ro lộ sự cố/bệnh nhân khoa khác (IDOR).",
   "Chặn sửa/đóng không hợp lệ (đóng khi chưa điều tra, sửa sự cố đã Closed) cần kiểm — liên quan audit/patient-safety.",
   "Audit log cho mọi mutation (tạo/điều tra/đóng sự cố, ghi chỉ số) cần xác minh ghi đúng CreatedBy là user thật (≠ Guid.Empty).",
   "Mức độ/severity và status dùng số thô ở API — cần đảm bảo severityName/statusName luôn được BE trả; thiếu sẽ làm chip/badge sai."
  ]
 },
 {
  "id": "survey",
  "code": "SVY",
  "layer": "fin",
  "ic": "⭐",
  "nm": "Khảo sát hài lòng",
  "gh": [
   "#294"
  ],
  "gap": false,
  "module_id": "survey",
  "summary": "Phân hệ \"Khảo sát hài lòng\" (id=survey, code=SVY, lớp fin) quản lý vòng đời khảo sát trải nghiệm người bệnh: Mẫu khảo sát (SatisfactionSurveyTemplates) → Chiến dịch (SatisfactionSurveyCampaigns, trạng thái 0=Draft/1=Active/2=Closed/3=Archived) → Kết quả khảo sát (SatisfactionSurveyResults: điểm OverallScore, comment, khoa) và luồng Gọi lại phản hồi (SurveyFeedbackCallbacks, trạng thái 1=Contacted/2=Resolved) cho các ca không hài lòng (≤2 sao). Màn chính hiện có là page v2 /v2/satisfaction-survey: KpiStrip (TB điểm, NPS-like, tỉ lệ ≥4 sao), StatusTabs theo nhóm điểm, bảng kết quả, drawer chi tiết, modal tạo chiến dịch + modal liên hệ phản hồi, xuất CSV. Backend SatisfactionSurveyController chỉ [Authorize] chung (không phân quyền theo vai trò), mọi GET bọc try/catch trả rỗng/200 khi lỗi (dễ giấu lỗi), responseRate tính từ số BN ra viện trong tháng. Liên thông data-consistency: chi phí/khoa → kết quả khảo sát → thống kê byDepartment/analysis.",
  "screens": [
   {
    "name": "Danh sách phản hồi khảo sát (v2)",
    "desc": "Màn chính: KpiStrip 6 chỉ số (Tổng phản hồi, Điểm TB, ≥4 sao, 3 sao, ≤2 sao, NPS-like), toolbar tìm kiếm/lọc mẫu/làm mới/xuất CSV/chiến dịch mới, StatusTabs theo nhóm điểm (Hài lòng ≥4 / Trung bình 3 / Không hài lòng ≤2), bảng top 5 khoa theo số phản hồi, DataTable phân trang 18 dòng/trang.",
    "route_guess": "/v2/satisfaction-survey",
    "elements": [
     "KpiStrip 6 ô",
     "SearchBox (BN/mẫu)",
     "Filter mẫu khảo sát",
     "StatusTabs nhóm điểm + counts",
     "Btn Bỏ lọc/Làm mới/Xuất CSV/Chiến dịch mới",
     "Top 5 khoa (thanh ngang)",
     "DataTable cột BN/Mẫu/Khoa/Điểm/Ngày/TT",
     "ActBtn Chi tiết + Liên hệ phản hồi (chỉ ≤2 sao)",
     "Pager"
    ]
   },
   {
    "name": "Drawer chi tiết phản hồi",
    "desc": "DrawerShell mở khi click dòng/nút Chi tiết: thông tin BN (mã/họ tên/khoa), khảo sát (mẫu/ngày/trạng thái), khối đánh giá điểm lớn + StatusBadge mức hài lòng, nút Đóng/In/Liên hệ BN (nếu ≤2 sao).",
    "route_guess": "/v2/satisfaction-survey (drawer)",
    "elements": [
     "DrSec Bệnh nhân",
     "DrSec Khảo sát",
     "DrSec Đánh giá (điểm 36px + badge)",
     "Btn Đóng/In/Liên hệ BN"
    ]
   },
   {
    "name": "Modal tạo chiến dịch khảo sát",
    "desc": "ModalShell form tạo SatisfactionSurveyCampaign: tên (bắt buộc), mô tả, ngày bắt đầu (bắt buộc), ngày kết thúc (bắt buộc), mục tiêu số phản hồi, ghi chú. Tạo ra campaign Status=0 Draft, sinh CampaignCode SURVEY-YYYYMM-XXX.",
    "route_guess": "/v2/satisfaction-survey (modal)",
    "elements": [
     "Input Tên chiến dịch (required)",
     "TextArea Mô tả",
     "Input date Ngày bắt đầu (required)",
     "Input date Ngày kết thúc (required)",
     "Input number Mục tiêu",
     "TextArea Ghi chú",
     "Btn Hủy/Tạo chiến dịch"
    ]
   },
   {
    "name": "Modal liên hệ phản hồi (callback)",
    "desc": "ModalShell ghi nhận liên hệ lại BN không hài lòng: mô tả vấn đề, người liên hệ (nhân viên), hướng xử lý/kết quả. Tạo SurveyFeedbackCallback Status=1 Contacted.",
    "route_guess": "/v2/satisfaction-survey (modal)",
    "elements": [
     "TextArea Mô tả vấn đề",
     "Input Người liên hệ",
     "TextArea Hướng xử lý",
     "Btn Hủy/Ghi nhận liên hệ"
    ]
   }
  ],
  "tasks": [
   {
    "id": "TC-SVY-001",
    "title": "Tải danh sách phản hồi khảo sát - luồng chính hiển thị KPI + bảng",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Đăng nhập admin/Admin@123; có >=1 bản ghi SatisfactionSurveyResults; BE chạy localhost:5106, FE localhost:3001.",
    "steps": [
     "Mở /v2/satisfaction-survey",
     "Chờ bảng load xong (GET /api/satisfaction-survey/results)",
     "Quan sát KpiStrip 6 ô và DataTable"
    ],
    "expected": "KpiStrip hiển thị Tổng phản hồi = số dòng, Điểm TB = trung bình OverallScore (định dạng x.xx/5), ≥4/3/≤2 sao và NPS-like khớp dữ liệu; DataTable hiển thị cột BN/Mẫu/Khoa/Điểm/Ngày/TT đúng, phân trang 18 dòng/trang; không có console error.",
    "evidence": [
     {
      "name": "TC-SVY-001__s01__list",
      "caption": "Danh sách phản hồi tải đầy đủ với KpiStrip",
      "uiState": "list"
     },
     {
      "name": "TC-SVY-001__s02__loading",
      "caption": "Trạng thái đang tải bảng (Đang tải…)",
      "uiState": "loading"
     }
    ]
   },
   {
    "id": "TC-SVY-002",
    "title": "Empty state khi chưa có phản hồi khảo sát nào",
    "category": "ui",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Bảng SatisfactionSurveyResults rỗng hoặc lọc ra 0 dòng.",
    "steps": [
     "Mở /v2/satisfaction-survey khi không có kết quả",
     "Quan sát DataTable"
    ],
    "expected": "DataTable hiển thị thông báo 'Chưa có phản hồi khảo sát'; KPI hiển thị 0/0.00; không crash, NPS-like = 0%, Điểm TB = 0.00.",
    "evidence": [
     {
      "name": "TC-SVY-002__s01__empty",
      "caption": "Empty state khi không có dữ liệu",
      "uiState": "empty"
     }
    ]
   },
   {
    "id": "TC-SVY-003",
    "title": "Lỗi tải API results - hiển thị thông báo, không vỡ UI",
    "category": "negative",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Mô phỏng API /results lỗi/timeout (tắt BE hoặc chặn network).",
    "steps": [
     "Tắt backend hoặc chặn GET /api/satisfaction-survey/results",
     "Mở /v2/satisfaction-survey",
     "Quan sát hành vi"
    ],
    "expected": "FE bắt lỗi: hiển thị toast 'Không tải được phản hồi khảo sát', danh sách rỗng (items=[]), không màn trắng/crash. Lưu ý kiểm chứng: BE bọc try/catch trả 200 rỗng nên FE có thể KHÔNG thấy lỗi - cần xác minh đường lỗi thực sự (network down) kích hoạt nhánh catch.",
    "evidence": [
     {
      "name": "TC-SVY-003__s01__error",
      "caption": "Toast lỗi tải dữ liệu",
      "uiState": "error"
     },
     {
      "name": "TC-SVY-003__s02__toast",
      "caption": "Thông báo Không tải được phản hồi",
      "uiState": "toast"
     }
    ]
   },
   {
    "id": "TC-SVY-004",
    "title": "Lọc theo nhóm điểm qua StatusTabs (≥4 / 3 / ≤2)",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có dữ liệu trải đủ 3 nhóm điểm.",
    "steps": [
     "Mở /v2/satisfaction-survey",
     "Click tab 'Hài lòng (≥4)'",
     "Click tab 'Trung bình (3)'",
     "Click tab 'Không hài lòng (≤2)'",
     "Đối chiếu số đếm trên tab với số dòng bảng"
    ],
    "expected": "Mỗi tab chỉ hiển thị dòng có điểm thuộc nhóm; counts trên tab khớp số dòng lọc được; điểm = 0 (chưa trả lời) không tính vào nhóm nào.",
    "evidence": [
     {
      "name": "TC-SVY-004__s01__tab",
      "caption": "Lọc tab Không hài lòng ≤2",
      "uiState": "tab"
     },
     {
      "name": "TC-SVY-004__s02__filter",
      "caption": "Số đếm tab khớp bảng",
      "uiState": "filter"
     }
    ]
   },
   {
    "id": "TC-SVY-005",
    "title": "Tìm kiếm theo tên BN / mã BN / tên mẫu khảo sát",
    "category": "happy",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có dữ liệu nhiều BN.",
    "steps": [
     "Nhập tên BN vào SearchBox",
     "Xóa, nhập mã BN",
     "Xóa, nhập một phần tên mẫu khảo sát"
    ],
    "expected": "Bảng lọc theo cả 3 trường (patientName/patientCode/templateName), không phân biệt hoa thường; kết quả thu hẹp đúng theo từ khóa.",
    "evidence": [
     {
      "name": "TC-SVY-005__s01__filter",
      "caption": "Kết quả tìm theo tên BN",
      "uiState": "filter"
     }
    ]
   },
   {
    "id": "TC-SVY-006",
    "title": "Tìm kiếm với dấu tiếng Việt và ký tự đặc biệt",
    "category": "edge",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Có BN tên có dấu (Nguyễn Thị Hoà).",
    "steps": [
     "Nhập chuỗi có dấu đầy đủ 'Nguyễn'",
     "Nhập chuỗi rất dài (200+ ký tự)",
     "Nhập ký tự đặc biệt '%_<>' và emoji"
    ],
    "expected": "Tìm có dấu hoạt động đúng (match đúng chữ có dấu); chuỗi dài/ký tự đặc biệt không gây crash, không làm vỡ layout, trả 0 kết quả gọn gàng (empty state).",
    "evidence": [
     {
      "name": "TC-SVY-006__s01__filter",
      "caption": "Tìm tên tiếng Việt có dấu",
      "uiState": "filter"
     },
     {
      "name": "TC-SVY-006__s02__empty",
      "caption": "Ký tự đặc biệt cho 0 kết quả",
      "uiState": "empty"
     }
    ]
   },
   {
    "id": "TC-SVY-007",
    "title": "Lọc theo Mẫu khảo sát + nút Bỏ lọc reset toàn bộ",
    "category": "happy",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có >=2 templateName khác nhau trong dữ liệu.",
    "steps": [
     "Chọn 1 mẫu trong Filter '▾ Mẫu khảo sát'",
     "Kết hợp thêm 1 tab điểm + 1 từ khóa search",
     "Click 'Bỏ lọc'"
    ],
    "expected": "Filter mẫu thu hẹp đúng; sau Bỏ lọc: search rỗng, mẫu rỗng, tab về 'all', bảng hiển thị toàn bộ trở lại.",
    "evidence": [
     {
      "name": "TC-SVY-007__s01__dropdown",
      "caption": "Dropdown chọn mẫu khảo sát",
      "uiState": "dropdown"
     },
     {
      "name": "TC-SVY-007__s02__filter",
      "caption": "Sau khi Bỏ lọc về mặc định",
      "uiState": "filter"
     }
    ]
   },
   {
    "id": "TC-SVY-008",
    "title": "Phân trang Pager khi nhiều hơn 18 phản hồi",
    "category": "edge",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Có >18 bản ghi (lưu ý BE /results chỉ trả tối đa 200 dòng).",
    "steps": [
     "Mở danh sách >18 dòng",
     "Chuyển trang 2, trang cuối",
     "Đổi bộ lọc và quan sát page reset"
    ],
    "expected": "Mỗi trang 18 dòng; totalPages = ceil(filtered/18); chuyển trang đúng; khi lọc giảm số dòng, không bị kẹt ở trang vượt quá totalPages (cần kiểm tra edge: đang trang 3 rồi lọc còn 5 dòng).",
    "evidence": [
     {
      "name": "TC-SVY-008__s01__list",
      "caption": "Trang 2 của danh sách",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-SVY-009",
    "title": "Giới hạn 200 dòng từ backend /results",
    "category": "edge",
    "priority": "P2",
    "role": "admin",
    "preconditions": "DB có >200 bản ghi SatisfactionSurveyResults.",
    "steps": [
     "Đếm tổng bản ghi trong DB (>200)",
     "Mở /v2/satisfaction-survey, đếm tổng KPI 'Tổng phản hồi'"
    ],
    "expected": "BE chỉ trả Take(200) → KPI tổng = tối đa 200 dù DB nhiều hơn. Xác minh đây là hành vi mong muốn hay GAP (thống kê sai khi >200). Ghi nhận sai lệch giữa 'Tổng phản hồi' UI và tổng thật.",
    "evidence": [
     {
      "name": "TC-SVY-009__s01__list",
      "caption": "KPI tổng dừng ở 200 dòng",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-SVY-010",
    "title": "Mở Drawer chi tiết phản hồi - hiển thị đủ thông tin",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có >=1 kết quả khảo sát.",
    "steps": [
     "Click 1 dòng (hoặc nút mắt Chi tiết)",
     "Quan sát DrawerShell"
    ],
    "expected": "Drawer hiển thị mã BN, họ tên, khoa, mẫu, ngày phản hồi (DD/MM/YYYY HH:mm), trạng thái, khối điểm lớn + StatusBadge đúng mức (Rất hài lòng/Hài lòng/Trung bình/Không hài lòng theo ngưỡng 4.5/3.5/2.5).",
    "evidence": [
     {
      "name": "TC-SVY-010__s01__drawer",
      "caption": "Drawer chi tiết phản hồi đầy đủ",
      "uiState": "drawer"
     }
    ]
   },
   {
    "id": "TC-SVY-011",
    "title": "Nút Liên hệ phản hồi chỉ hiện với điểm ≤2 (state-gating)",
    "category": "state",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có dòng điểm ≤2 (>0) và dòng điểm ≥3.",
    "steps": [
     "Quan sát cột thao tác ở dòng điểm 5",
     "Quan sát cột thao tác ở dòng điểm 1-2",
     "Mở drawer dòng điểm 5 rồi dòng điểm 2, xem footer"
    ],
    "expected": "Nút 'Liên hệ phản hồi' (icon phone, tone warn) CHỈ xuất hiện ở dòng có score>0 và score<=2; dòng điểm cao không có nút; trong drawer nút 'Liên hệ BN' cũng chỉ hiện khi score<=2 và >0; dòng điểm 0 (chưa trả lời) không hiện nút.",
    "evidence": [
     {
      "name": "TC-SVY-011__s01__list",
      "caption": "Nút liên hệ chỉ ở dòng điểm thấp",
      "uiState": "list"
     },
     {
      "name": "TC-SVY-011__s02__drawer",
      "caption": "Footer drawer có Liên hệ BN khi ≤2 sao",
      "uiState": "drawer"
     }
    ]
   },
   {
    "id": "TC-SVY-012",
    "title": "Tạo chiến dịch khảo sát mới - luồng chính",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Đăng nhập admin.",
    "steps": [
     "Click 'Chiến dịch mới'",
     "Nhập tên 'Khảo sát hài lòng tháng 6/2026'",
     "Chọn ngày bắt đầu và kết thúc hợp lệ",
     "Nhập mục tiêu 200, ghi chú",
     "Click 'Tạo chiến dịch'"
    ],
    "expected": "Modal đóng, toast 'Đã tạo chiến dịch khảo sát'; BE POST /campaigns tạo bản ghi Status=0 (Draft), sinh CampaignCode SURVEY-YYYYMM-001 tăng dần, CreatedBy = user thật (không Guid.Empty); form reset.",
    "evidence": [
     {
      "name": "TC-SVY-012__s01__modal",
      "caption": "Modal tạo chiến dịch",
      "uiState": "modal"
     },
     {
      "name": "TC-SVY-012__s02__form",
      "caption": "Điền form chiến dịch",
      "uiState": "form"
     },
     {
      "name": "TC-SVY-012__s03__success",
      "caption": "Toast tạo chiến dịch thành công",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-SVY-013",
    "title": "Validation tạo chiến dịch - bỏ trống trường bắt buộc",
    "category": "validation",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Modal tạo chiến dịch đang mở.",
    "steps": [
     "Để trống Tên chiến dịch, bấm Tạo",
     "Nhập tên nhưng để trống Ngày bắt đầu, bấm Tạo",
     "Để trống Ngày kết thúc, bấm Tạo"
    ],
    "expected": "Tên trống: hiện lỗi 'Nhập tên chiến dịch'; Ngày bắt đầu/kết thúc trống: hiện lỗi required (antd); modal không đóng, không gọi API cho tới khi đủ trường.",
    "evidence": [
     {
      "name": "TC-SVY-013__s01__validation",
      "caption": "Lỗi required tên chiến dịch",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-SVY-014",
    "title": "Validation chiến dịch - Ngày kết thúc trước Ngày bắt đầu",
    "category": "validation",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Modal tạo chiến dịch đang mở.",
    "steps": [
     "Nhập tên hợp lệ",
     "Chọn Ngày bắt đầu = 30/06/2026, Ngày kết thúc = 01/06/2026",
     "Bấm Tạo"
    ],
    "expected": "GAP nghi vấn: FE/BE hiện KHÔNG kiểm tra endDate >= startDate (không có rule chéo) → có thể tạo chiến dịch ngày kết thúc trước ngày bắt đầu. Test xác nhận lỗi; nếu tạo thành công sai logic → tạo task fix.",
    "evidence": [
     {
      "name": "TC-SVY-014__s01__validation",
      "caption": "Khoảng ngày không hợp lệ",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-SVY-015",
    "title": "Edge giá trị mục tiêu số phản hồi (0, âm, rất lớn)",
    "category": "edge",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Modal tạo chiến dịch đang mở.",
    "steps": [
     "Nhập mục tiêu = 0",
     "Nhập mục tiêu = -5",
     "Nhập mục tiêu = 999999999",
     "Nhập mục tiêu chữ/ký tự (kiểm input type=number)"
    ],
    "expected": "Input number min=1: giá trị 0/âm bị chặn hoặc cảnh báo; số rất lớn lưu được không tràn (int); ký tự chữ không nhập được. Xác minh BE TargetCount int chấp nhận giá trị đúng, không lưu âm.",
    "evidence": [
     {
      "name": "TC-SVY-015__s01__validation",
      "caption": "Mục tiêu âm/0 bị chặn",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-SVY-016",
    "title": "Hủy modal tạo chiến dịch giữa chừng - không lưu",
    "category": "negative",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Modal tạo chiến dịch đang mở, đã nhập dở.",
    "steps": [
     "Nhập tên + một phần dữ liệu",
     "Click 'Hủy' (hoặc đóng modal)",
     "Mở lại modal"
    ],
    "expected": "Không gọi API tạo; mở lại modal form đã reset rỗng (resetFields gọi khi mở); không tạo bản ghi rác trong DB.",
    "evidence": [
     {
      "name": "TC-SVY-016__s01__confirm",
      "caption": "Hủy modal không lưu",
      "uiState": "confirm"
     }
    ]
   },
   {
    "id": "TC-SVY-017",
    "title": "Tên chiến dịch chuỗi rất dài / dấu tiếng Việt / ký tự đặc biệt",
    "category": "edge",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Modal tạo chiến dịch đang mở.",
    "steps": [
     "Nhập tên 500+ ký tự có dấu tiếng Việt",
     "Nhập tên có ký tự đặc biệt < > & \" '",
     "Tạo chiến dịch và mở lại danh sách campaigns (nếu có UI) / kiểm DB"
    ],
    "expected": "Chuỗi dài/đặc biệt lưu không lỗi cột (kiểm độ dài cột Name); hiển thị lại không vỡ layout, không render HTML thô (chống XSS stored ở tên chiến dịch).",
    "evidence": [
     {
      "name": "TC-SVY-017__s01__form",
      "caption": "Tên chiến dịch dài có dấu",
      "uiState": "form"
     }
    ]
   },
   {
    "id": "TC-SVY-018",
    "title": "Ghi nhận liên hệ phản hồi (callback) - luồng chính",
    "category": "happy",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có dòng phản hồi điểm ≤2.",
    "steps": [
     "Click nút phone 'Liên hệ phản hồi' ở dòng điểm thấp",
     "Nhập mô tả vấn đề, người liên hệ, hướng xử lý",
     "Click 'Ghi nhận liên hệ'"
    ],
    "expected": "Modal đóng, toast 'Đã ghi nhận liên hệ phản hồi'; BE POST /callbacks tạo SurveyFeedbackCallback Status=1 (Contacted), ContactedAt = now, CreatedBy = user thật, gắn SurveyResultId/PatientCode/PatientName từ dòng nguồn.",
    "evidence": [
     {
      "name": "TC-SVY-018__s01__modal",
      "caption": "Modal liên hệ phản hồi",
      "uiState": "modal"
     },
     {
      "name": "TC-SVY-018__s02__form",
      "caption": "Điền form callback",
      "uiState": "form"
     },
     {
      "name": "TC-SVY-018__s03__success",
      "caption": "Toast ghi nhận liên hệ thành công",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-SVY-019",
    "title": "Callback - gửi form trống (mọi field optional)",
    "category": "negative",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Modal liên hệ phản hồi mở.",
    "steps": [
     "Không nhập gì",
     "Click 'Ghi nhận liên hệ'"
    ],
    "expected": "GAP nghi vấn: form callback không có rule required → có thể tạo bản ghi callback rỗng (không mô tả vấn đề, không người liên hệ). Test xác nhận; nếu tạo callback rỗng vô nghĩa → đề xuất bắt buộc tối thiểu người liên hệ.",
    "evidence": [
     {
      "name": "TC-SVY-019__s01__validation",
      "caption": "Callback gửi trống",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-SVY-020",
    "title": "State callback - chuyển Contacted (1) → Resolved (2) qua acknowledge",
    "category": "state",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có SurveyFeedbackCallback Status=1; có endpoint POST /callbacks/{id}/acknowledge.",
    "steps": [
     "Tạo 1 callback (Status=1)",
     "Gọi acknowledge (qua UI nếu có nút, hoặc API trực tiếp) với note",
     "Kiểm tra trạng thái sau"
    ],
    "expected": "Status chuyển 1→2 (Resolved), AcknowledgmentNote lưu, UpdatedBy = user thật. GAP UI: page v2 hiện chưa có màn quản lý callbacks (list/acknowledge) → chỉ test API; ghi nhận thiếu UI callbacks.",
    "evidence": [
     {
      "name": "TC-SVY-020__s01__success",
      "caption": "Callback chuyển sang Resolved",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-SVY-021",
    "title": "Xuất CSV khảo sát - luồng chính tải file",
    "category": "happy",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Có dữ liệu kết quả khảo sát trong 30 ngày.",
    "steps": [
     "Click 'Xuất CSV'",
     "Chờ tải xong",
     "Mở file CSV"
    ],
    "expected": "Tải file khao-sat-hai-long-YYYY-MM-DD.csv; toast 'Đã xuất CSV'; nội dung có header tiếng Việt + dòng dữ liệu đúng; tiếng Việt có dấu đọc đúng (UTF-8). Lưu ý: BE /export mặc định chỉ 30 ngày gần nhất (from/to null) còn FE không truyền tham số → CSV có thể thiếu dữ liệu cũ hơn 30 ngày so với bảng đang hiển thị.",
    "evidence": [
     {
      "name": "TC-SVY-021__s01__success",
      "caption": "Toast xuất CSV thành công",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-SVY-022",
    "title": "Xuất CSV - fallback khi API export lỗi",
    "category": "negative",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Mô phỏng /export lỗi/không trả blob.",
    "steps": [
     "Chặn GET /api/satisfaction-survey/export",
     "Click 'Xuất CSV'"
    ],
    "expected": "FE fallback xuất CSV từ dữ liệu đang hiển thị; toast 'Đã xuất CSV (dữ liệu hiển thị)'; file tải được, các ô được escape (escapeCsvCell) đúng.",
    "evidence": [
     {
      "name": "TC-SVY-022__s01__toast",
      "caption": "Toast fallback xuất CSV từ dữ liệu hiển thị",
      "uiState": "toast"
     }
    ]
   },
   {
    "id": "TC-SVY-023",
    "title": "Bảo mật - CSV injection ở comment/tên khi xuất CSV",
    "category": "security",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Tạo kết quả khảo sát có Comment bắt đầu bằng '=', '+', '-', '@' (vd '=cmd|calc').",
    "steps": [
     "Chèn comment '=HYPERLINK(\"http://evil\")' vào 1 kết quả",
     "Xuất CSV (cả nhánh BE và FE fallback)",
     "Mở file bằng Excel"
    ],
    "expected": "GAP nghi vấn: BE Escape() chỉ bọc dấu nháy kép, KHÔNG prefix ngăn formula injection; FE escapeCsvCell cần kiểm tương tự. Test xác nhận; nếu Excel thực thi công thức → tạo task fix (prefix ' hoặc tab cho ô bắt đầu =/+/-/@).",
    "evidence": [
     {
      "name": "TC-SVY-023__s01__error",
      "caption": "Comment chứa formula trong CSV",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-SVY-024",
    "title": "Bảo mật - XSS stored ở comment phản hồi hiển thị trong drawer/bảng",
    "category": "security",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Tạo kết quả khảo sát có Comment chứa '<img src=x onerror=alert(1)>' hoặc <script>.",
    "steps": [
     "Chèn comment chứa payload XSS vào SatisfactionSurveyResults",
     "Mở /v2/satisfaction-survey, mở drawer dòng đó",
     "Quan sát render (lưu ý: drawer hiện chưa hiển thị comment - kiểm các nơi khác hiển thị comment: analysis topComplaints)"
    ],
    "expected": "Payload hiển thị dưới dạng text thuần (React tự escape), KHÔNG thực thi script; xác minh mọi điểm render comment (analysis topComplaints/topPraises) đều an toàn. Ghi nhận: drawer v2 hiện KHÔNG hiển thị comment → GAP thiếu thông tin nội dung góp ý cho người xử lý.",
    "evidence": [
     {
      "name": "TC-SVY-024__s01__drawer",
      "caption": "Comment payload không thực thi",
      "uiState": "drawer"
     }
    ]
   },
   {
    "id": "TC-SVY-025",
    "title": "Permission - vai trò không đủ quyền vẫn truy cập được toàn bộ (IDOR/authz gap)",
    "category": "permission",
    "priority": "P0",
    "role": "lễ tân (receptionist) hoặc role thấp",
    "preconditions": "Có tài khoản vai trò thấp (không phải quản lý CL/admin); tham chiếu matrix #216.",
    "steps": [
     "Đăng nhập bằng tài khoản vai trò thấp",
     "Gọi GET /api/satisfaction-survey/results và /stats và /analysis",
     "Gọi POST /campaigns, POST /callbacks"
    ],
    "expected": "GAP bảo mật: Controller chỉ [Authorize] chung, KHÔNG phân quyền theo vai trò/permission → bất kỳ user đăng nhập nào cũng xem được toàn bộ kết quả khảo sát (gồm tên+mã BN+comment nhạy cảm) và tạo chiến dịch/callback. Đối chiếu matrix #216: nếu phân hệ này lẽ ra giới hạn cho QLCL/admin → tạo task fix thêm role check. Kiểm cả ẩn/hiện menu ở vai trò thấp.",
    "evidence": [
     {
      "name": "TC-SVY-025__s01__permission",
      "caption": "Vai trò thấp vẫn xem được dữ liệu khảo sát",
      "uiState": "permission"
     }
    ]
   },
   {
    "id": "TC-SVY-026",
    "title": "Bảo mật - gọi API khi chưa đăng nhập (anonymous)",
    "category": "security",
    "priority": "P0",
    "role": "anonymous",
    "preconditions": "Xóa token localStorage.",
    "steps": [
     "Xóa token, mở /v2/satisfaction-survey",
     "Gọi trực tiếp GET /api/satisfaction-survey/results không Bearer"
    ],
    "expected": "FE redirect về login (route protected); API trả 401 Unauthorized (controller [Authorize]); không lộ dữ liệu BN cho request ẩn danh.",
    "evidence": [
     {
      "name": "TC-SVY-026__s01__permission",
      "caption": "401 khi gọi không token",
      "uiState": "permission"
     }
    ]
   },
   {
    "id": "TC-SVY-027",
    "title": "Data-consistency - tạo chiến dịch → phản ánh ở danh sách campaigns + đếm",
    "category": "data-consistency",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Biết số chiến dịch hiện tại.",
    "steps": [
     "Tạo 1 chiến dịch mới qua modal",
     "Gọi GET /campaigns (lọc status=0 Draft)",
     "Kiểm CampaignCode + actualCount=0/targetCount khớp"
    ],
    "expected": "Chiến dịch mới xuất hiện ở GET /campaigns với Status=0, CampaignCode tăng tuần tự theo tháng, TargetCount khớp form, actualCount=0. GAP UI: page v2 chưa có danh sách chiến dịch để xem lại → chỉ kiểm qua API; ghi nhận thiếu màn quản lý campaigns.",
    "evidence": [
     {
      "name": "TC-SVY-027__s01__list",
      "caption": "Chiến dịch mới trong danh sách campaigns",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-SVY-028",
    "title": "Data-consistency - điểm KPI/NPS/byDepartment khớp giữa results, stats và analysis",
    "category": "data-consistency",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Dữ liệu kết quả đã biết phân bố điểm/khoa.",
    "steps": [
     "Ghi nhận Điểm TB + nhóm đếm trên UI (tính từ /results)",
     "Gọi /stats (averageScore, satisfactionRate, byDepartment)",
     "Gọi /analysis (averageScore, distribution, trend)",
     "Đối chiếu 3 nguồn"
    ],
    "expected": "averageScore và phân bố nhất quán giữa các nguồn THEO ĐÚNG cửa sổ thời gian: lưu ý /results = 200 gần nhất mọi thời gian, /stats = 30 ngày, /analysis = 90 ngày → khác nhau là hợp lệ NHƯNG phải giải thích được. Top 5 khoa UI (từ results) so byDepartment stats (30 ngày) phải hợp lý. Phát hiện sai số bất thường → tạo task.",
    "evidence": [
     {
      "name": "TC-SVY-028__s01__list",
      "caption": "Đối chiếu KPI giữa các nguồn",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-SVY-029",
    "title": "UI - chẵn lẻ dark/light, format số/điểm/ngày",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Có dữ liệu hiển thị.",
    "steps": [
     "Mở /v2/satisfaction-survey ở light mode",
     "Toggle sang dark mode (topbar v2)",
     "Kiểm KpiStrip, StatusBadge màu theo tone, thanh top 5 khoa, drawer điểm 36px"
    ],
    "expected": "Light/dark parity: chữ/nền/đường viền đủ tương phản, StatusBadge tone ok/warn/crit/info đổi màu đúng theme; điểm format x.x, ngày DD/MM/YYYY, NPS dạng %; không có ô màu lệch theme.",
    "evidence": [
     {
      "name": "TC-SVY-029__s01__list",
      "caption": "Light mode",
      "uiState": "list"
     },
     {
      "name": "TC-SVY-029__s02__list",
      "caption": "Dark mode parity",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-SVY-030",
    "title": "UI responsive - màn hẹp và bảng top 5 khoa",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Có dữ liệu nhiều khoa.",
    "steps": [
     "Thu nhỏ cửa sổ xuống ~1024px và ~768px",
     "Quan sát KpiStrip 6 ô, toolbar, thanh top 5 khoa, DataTable"
    ],
    "expected": "KpiStrip wrap/scroll gọn, toolbar không tràn, tên khoa dài ellipsis (width 160), bảng không vỡ; thao tác (mở drawer/modal) vẫn dùng được ở màn hẹp.",
    "evidence": [
     {
      "name": "TC-SVY-030__s01__list",
      "caption": "Layout ở màn hẹp",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-SVY-031",
    "title": "Edge - kết quả khảo sát điểm = 0 (chưa trả lời) hiển thị thế nào",
    "category": "edge",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Có bản ghi OverallScore = 0.",
    "steps": [
     "Mở danh sách có dòng điểm 0",
     "Quan sát cột Điểm, drawer, nhóm tab, KPI trung bình"
    ],
    "expected": "Điểm 0 hiển thị '—' (toFixed cho 0 → '0.0' nhưng code dùng r.score?.toFixed(1) || '—' → 0 là falsy nên ra '—'); không tính vào nhóm điểm nào; tuy nhiên KPI 'Điểm TB' (avg) VẪN cộng cả score 0 vào tử số → kéo trung bình xuống. Xác minh đây có làm sai chỉ số TB không (GAP: nên loại score=0 khỏi trung bình).",
    "evidence": [
     {
      "name": "TC-SVY-031__s01__list",
      "caption": "Dòng điểm 0 hiển thị dấu gạch",
      "uiState": "list"
     }
    ]
   }
  ],
  "ui_state_checklist": [
   "list - danh sách phản hồi tải đầy đủ + KpiStrip",
   "loading - đang tải bảng (Đang tải…)",
   "empty - chưa có phản hồi / lọc 0 kết quả",
   "error - lỗi tải dữ liệu / payload nguy hiểm",
   "toast - thông báo tạm thời (lỗi tải, fallback CSV)",
   "filter - sau khi lọc theo search/tab/mẫu/bỏ lọc",
   "tab - StatusTabs nhóm điểm ≥4/3/≤2",
   "dropdown - Filter chọn mẫu khảo sát",
   "drawer - chi tiết phản hồi (BN/khảo sát/điểm)",
   "modal - tạo chiến dịch / liên hệ phản hồi",
   "form - điền form chiến dịch/callback",
   "validation - lỗi required/range/khoảng ngày",
   "confirm - hủy modal giữa chừng",
   "success - toast tạo/ghi nhận/xuất thành công",
   "permission - vai trò thấp/anonymous truy cập"
  ],
  "gaps": [
   "Phân hệ Khảo sát hài lòng (survey/SVY) hiện CHƯA có issue test riêng trên GitHub (không thuộc #216-289) → ứng viên tạo issue test mới + module label survey (chờ user duyệt, KHÔNG tự tạo).",
   "Authorization GAP: SatisfactionSurveyController chỉ [Authorize] chung, không có role/permission check → bất kỳ user đăng nhập nào cũng đọc được toàn bộ kết quả khảo sát chứa tên+mã BN+comment nhạy cảm và tạo chiến dịch/callback. Cần đối chiếu matrix #216 và siết quyền (ví dụ chỉ QLCL/Admin).",
   "Silent-failure GAP: mọi GET (stats/templates/results/analysis/campaigns/callbacks) bọc try/catch trả 200 rỗng → lỗi DB/logic bị che, FE không bao giờ thấy lỗi thật; khó phân biệt 'rỗng do không có data' và 'rỗng do lỗi'. Test error-state của FE bị hạn chế vì điều này.",
   "UI GAP: page v2 hiện CHỈ là màn xem kết quả + tạo chiến dịch + callback nhanh. THIẾU màn: quản lý Mẫu khảo sát (templates CRUD đã có API nhưng không có UI), danh sách/xem lại Chiến dịch + chuyển trạng thái Draft→Active→Closed→Archived, danh sách callbacks + acknowledge (Contacted→Resolved), cấu hình tự gửi khảo sát (config API có sẵn). → nên port/bổ sung lên v2.",
   "State-machine GAP: Campaign Status (0-3) và Callback Status (1-2) có trong BE nhưng KHÔNG có endpoint/UI chuyển trạng thái campaign (chỉ tạo Draft); không kiểm chuyển trạng thái không hợp lệ.",
   "Validation GAP: không có rule endDate >= startDate cho chiến dịch; form callback không required trường nào (tạo được callback rỗng); TargetCount không kiểm âm ở BE.",
   "CSV-injection GAP: BE Escape() và FE escapeCsvCell cần xác minh có ngăn formula injection (ô bắt đầu =/+/-/@) cho comment/tên người dùng nhập.",
   "Thống kê GAP: KPI 'Tổng phản hồi' và trung bình tính trên tối đa 200 dòng (/results Take(200)) → sai khi DB >200; 'Điểm TB' UI cộng cả score=0 (chưa trả lời) làm lệch trung bình.",
   "Tables chưa phủ UI: SatisfactionSurveys và ServiceFeedbacks (trong tables[] của data.js) chưa thấy controller/endpoint/màn tương ứng → cần xác minh là bảng dùng nội bộ hay GAP thiếu tính năng (phản hồi dịch vụ chung, khảo sát cấu trúc câu hỏi).",
   "Data-consistency GAP: 3 nguồn /results (mọi thời gian, 200 dòng), /stats (30 ngày), /analysis (90 ngày) có cửa sổ thời gian khác nhau → dễ gây nhầm khi đối chiếu; cần ghi rõ trên UI khoảng thời gian từng chỉ số.",
   "Integration: phân hệ lớp fin nhưng không thấy liên thông gửi khảo sát tự động sau ra viện/ngoại trú (config có cờ nhưng chưa rõ worker gửi) → cần xác minh có job/integration thực gửi khảo sát hay chỉ nhập tay."
  ]
 }
]);
