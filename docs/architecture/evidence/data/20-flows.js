window.TP.flows.push(...[
 {
  "id": "opd",
  "code": "F-OPD",
  "ic": "🩺",
  "layer": "clin",
  "nm": "Khám ngoại trú",
  "gh": [
   "#217",
   "#239"
  ],
  "flow_id": "opd",
  "summary": "Bộ test-task END-TO-END xuyên phân hệ cho luồng \"Khám ngoại trú\" (id=opd), bám sát chuỗi bước trong FLOWS.opd (data.js dòng 273-274): Tiếp đón (reception) → Khám & bệnh án (opd) → Chỉ định CLS (cls) → XN/CĐHA (lis/ris-PACS) → Kê đơn (presc) → Viện phí/BHYT (billing) → Nhận thuốc (pharmwh), related: followup/lab/billing. Tất cả chạy trên FE v2 (route /v2/*, TerminalLayout, _v2kit, ab-*), login admin/Admin@123, BE localhost:5106. Routes thật đã verify trong App.tsx: /v2/reception, /v2/opd(+/edit), /v2/lab, /v2/radiology(+/viewer DICOM), /v2/prescription(+/edit), /v2/billing(+/edit), /v2/dispensing-counter, /v2/pharmacy. 16 task tập trung: happy-path E2E xuyên màn, data-consistency liên phân hệ (tạo A→hiện B→tính C), state-transition liên phân hệ (Draft/Pending/Approved/Done/Cancelled), patient-safety (chặn dị ứng Severity>=2 / tương tác Severity>=3 trừ khi có OverrideReason — verify PrescriptionSafetyGuard.cs), luồng phụ/ngoại lệ (hủy chỉ định, hoàn tiền, lỗi giữa chừng, luồng ngược sửa chẩn đoán), integration (HL7 LIS, DICOM PACS Orthanc, XML BHXH, SignalR realtime, payment online), security (IDOR/anonymous/XSS), và UI states (empty/loading/error/dark/responsive). Evidence chụp tại MỌI điểm chuyển màn theo quy ước TC-F-OPD-NNN__sNN__state. Refine 2 parent issue đã có: #217 (E2E happy-path tổng), #239 (clinical workflow + state-transition E2E nhóm Lâm sàng).",
  "tasks": [
   {
    "id": "TC-F-OPD-001",
    "title": "Happy-path E2E xuyên phân hệ: Tiếp đón → Khám → CLS → KQ → Kê đơn → Viện phí → Nhận thuốc (1 lượt liền mạch)",
    "category": "happy",
    "priority": "P0",
    "role": "Admin (đóng vai Tiếp đón/Bác sĩ/Thu ngân/Dược)",
    "refIssues": [
     "#217",
     "#239"
    ],
    "preconditions": "Đã login admin/Admin@123; BE 5106 + SQL + Orthanc chạy; có ít nhất 1 BN trong danh mục, có danh mục dịch vụ CLS + thuốc còn tồn kho; FE /v2 (TerminalLayout).",
    "steps": [
     "Vào /v2/reception, tạo lượt tiếp đón cho 1 BN ngoại trú (chọn BN, đối tượng BHYT/viện phí, phòng khám), lưu → sinh lượt khám có mã.",
     "Vào /v2/opd, xác nhận lượt khám vừa tiếp đón hiện trong hàng chờ; mở khám /v2/opd/edit, nhập lý do khám + chẩn đoán (ICD-10), lưu bệnh án.",
     "Trong màn khám, tạo chỉ định CLS (1 xét nghiệm LIS + 1 CĐHA), lưu → chỉ định ở trạng thái chờ thực hiện.",
     "Vào /v2/lab, thực hiện/nhập kết quả xét nghiệm cho chỉ định vừa tạo; vào /v2/radiology đọc & ký kết quả CĐHA.",
     "Quay lại /v2/opd, xác nhận KQ CLS đã đổ về bệnh án; vào /v2/prescription tạo đơn thuốc (/v2/prescription/edit), kê 1-2 thuốc, lưu đơn.",
     "Vào /v2/billing tổng hợp chi phí (công khám + CLS + thuốc), áp BHYT, thanh toán, xuất phiếu thu.",
     "Vào /v2/dispensing-counter (hoặc /v2/pharmacy) duyệt + cấp phát thuốc theo đơn đã thanh toán; trừ tồn kho; kết thúc lượt khám."
    ],
    "expected": "Toàn luồng đi đúng 7 bước; mỗi bước sinh đúng bản ghi và lượt khám chuyển trạng thái đúng đến 'Hoàn tất'. Dữ liệu BN/chẩn đoán/CLS/đơn/tiền nhất quán xuyên màn. Không lỗi console (trừ SignalR/HMR ignore-pattern).",
    "notes": "Đây là xương sống; các task sau detail từng điểm chuyển. Assert OUTCOME (bản ghi tạo ra + trạng thái), không chỉ no-console-error.",
    "evidence": [
     {
      "name": "TC-F-OPD-001__s01__form",
      "caption": "Form tiếp đón BN ngoại trú đã điền",
      "uiState": "form"
     },
     {
      "name": "TC-F-OPD-001__s02__list",
      "caption": "Hàng chờ khám /v2/opd có lượt vừa tiếp đón",
      "uiState": "list"
     },
     {
      "name": "TC-F-OPD-001__s03__form",
      "caption": "Màn khám nhập chẩn đoán ICD-10",
      "uiState": "form"
     },
     {
      "name": "TC-F-OPD-001__s04__detail",
      "caption": "Kết quả CLS đổ về bệnh án",
      "uiState": "detail"
     },
     {
      "name": "TC-F-OPD-001__s05__form",
      "caption": "Đơn thuốc đã kê",
      "uiState": "form"
     },
     {
      "name": "TC-F-OPD-001__s06__detail",
      "caption": "Tổng hợp viện phí + áp BHYT",
      "uiState": "detail"
     },
     {
      "name": "TC-F-OPD-001__s07__success",
      "caption": "Cấp phát thuốc thành công, lượt khám Hoàn tất",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-OPD-002",
    "title": "Data-consistency: tiếp đón tạo lượt (A) → hiện đúng trong hàng chờ khám OPD (B)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Tiếp đón → Bác sĩ",
    "refIssues": [
     "#239"
    ],
    "preconditions": "Login admin; có BN; phòng khám đã cấu hình.",
    "steps": [
     "Tại /v2/reception ghi nhận chính xác: tên BN, mã BN, số thẻ BHYT, phòng khám, thời điểm tiếp đón.",
     "Lưu lượt tiếp đón.",
     "Mở /v2/opd, lọc theo phòng khám/ngày, tìm lượt vừa tạo.",
     "Đối chiếu từng trường (tên/mã BN/BHYT/phòng/giờ) giữa màn reception và hàng chờ OPD."
    ],
    "expected": "Lượt khám hiện ngay trong hàng chờ OPD (realtime/refresh) với MỌI trường khớp 100% với dữ liệu tiếp đón; số thứ tự/giờ đúng.",
    "notes": "Kiểm tra realtime SignalR đẩy lượt mới nếu có; nếu không có thì refresh phải thấy. Bug → tạo issue fix liên kết #239.",
    "evidence": [
     {
      "name": "TC-F-OPD-002__s01__form",
      "caption": "Dữ liệu tiếp đón đã nhập",
      "uiState": "form"
     },
     {
      "name": "TC-F-OPD-002__s02__list",
      "caption": "Hàng chờ OPD chứa lượt khớp dữ liệu",
      "uiState": "list"
     },
     {
      "name": "TC-F-OPD-002__s03__detail",
      "caption": "Đối chiếu trường BN/BHYT/phòng khám",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-OPD-003",
    "title": "Data-consistency liên phân hệ: chỉ định CLS (A) → hiện ở LIS/RIS (B) → KQ đổ ngược về bệnh án (C)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ → KTV xét nghiệm/CĐHA → Bác sĩ",
    "refIssues": [
     "#239",
     "#217"
    ],
    "preconditions": "Có bệnh án OPD đang khám; danh mục CLS có cả XN (LIS) và CĐHA (RIS/PACS).",
    "steps": [
     "Trong /v2/opd/edit tạo chỉ định: 1 xét nghiệm (đổ sang LIS) + 1 CĐHA (đổ sang RIS).",
     "Mở /v2/lab xác nhận chỉ định XN hiện trong worklist với đúng tên BN + tên xét nghiệm.",
     "Mở /v2/radiology xác nhận chỉ định CĐHA hiện trong worklist.",
     "Nhập KQ XN tại /v2/lab; đọc & ký KQ CĐHA tại /v2/radiology.",
     "Quay lại bệnh án /v2/opd/edit kiểm tra KQ XN + CĐHA đã đổ về, gắn đúng chỉ định nguồn."
    ],
    "expected": "Chỉ định tạo ở OPD xuất hiện đúng tại LIS và RIS; sau khi có KQ, kết quả đổ ngược về bệnh án OPD đúng chỉ định, đúng giá trị, đúng trạng thái (Đã có KQ).",
    "notes": "Mẫu tạo A→hiện B→ngược C xuyên 3 phân hệ. Verify mapping chỉ định↔kết quả không lệch.",
    "evidence": [
     {
      "name": "TC-F-OPD-003__s01__form",
      "caption": "Tạo chỉ định CLS trong bệnh án",
      "uiState": "form"
     },
     {
      "name": "TC-F-OPD-003__s02__list",
      "caption": "Worklist LIS có chỉ định XN",
      "uiState": "list"
     },
     {
      "name": "TC-F-OPD-003__s03__list",
      "caption": "Worklist RIS có chỉ định CĐHA",
      "uiState": "list"
     },
     {
      "name": "TC-F-OPD-003__s04__detail",
      "caption": "KQ đổ ngược về bệnh án OPD",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-OPD-004",
    "title": "Integration HL7 LIS: kết quả từ máy phân tích (AnalyzerInbox/HL7) khớp đúng chỉ định và đổ vào bệnh án",
    "category": "integration",
    "priority": "P1",
    "role": "KTV xét nghiệm",
    "refIssues": [
     "#217",
     "#239"
    ],
    "preconditions": "Có chỉ định XN từ OPD; cấu hình HL7/AnalyzerInbox (/v2/analyzer-inbox, /v2/lis-config) ở chế độ dev/mock có dữ liệu.",
    "steps": [
     "Tạo chỉ định XN từ bệnh án OPD.",
     "Mô phỏng/nhận thông điệp HL7 kết quả qua /v2/analyzer-inbox.",
     "Khớp (match) kết quả HL7 với chỉ định nguồn theo mã BN/mã chỉ định.",
     "Xác nhận giá trị + cờ bất thường (H/L) đổ vào KQ XN và về bệnh án OPD."
    ],
    "expected": "Thông điệp HL7 được parse, khớp đúng chỉ định, giá trị + cờ bất thường hiển thị đúng tại LIS và bệnh án OPD; không tạo KQ mồ côi.",
    "notes": "Integration HL7. Nếu chỉ có mock mode thì test trên mock; verify không nuốt lỗi parse.",
    "evidence": [
     {
      "name": "TC-F-OPD-004__s01__list",
      "caption": "AnalyzerInbox nhận thông điệp HL7",
      "uiState": "list"
     },
     {
      "name": "TC-F-OPD-004__s02__detail",
      "caption": "Khớp KQ HL7 với chỉ định",
      "uiState": "detail"
     },
     {
      "name": "TC-F-OPD-004__s03__detail",
      "caption": "KQ + cờ bất thường về bệnh án",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-OPD-005",
    "title": "Integration DICOM PACS (Orthanc): mở ảnh CĐHA của chỉ định OPD trong DICOM viewer",
    "category": "integration",
    "priority": "P1",
    "role": "Bác sĩ CĐHA",
    "refIssues": [
     "#217"
    ],
    "preconditions": "Có chỉ định CĐHA từ OPD; Orthanc PACS chạy (8042); có study DICOM gắn BN.",
    "steps": [
     "Từ /v2/radiology mở study của chỉ định CĐHA vừa tạo.",
     "Mở /v2/radiology/viewer (DicomViewer) load ảnh từ PACS proxy.",
     "Thực hiện window/level, zoom/pan; xác nhận ảnh load đúng study đúng BN.",
     "Đọc & ký kết quả, xác nhận KQ + ảnh gắn đúng chỉ định nguồn về bệnh án OPD."
    ],
    "expected": "DICOM viewer load đúng study của BN từ Orthanc (không lẫn BN khác); thao tác viewer hoạt động; KQ ký xong gắn đúng chỉ định và hiện ở bệnh án OPD.",
    "notes": "Integration DICOM. Verify imageId/wadouri trỏ đúng BN — tránh lẫn ảnh giữa BN (an toàn).",
    "evidence": [
     {
      "name": "TC-F-OPD-005__s01__list",
      "caption": "Worklist RIS chọn study",
      "uiState": "list"
     },
     {
      "name": "TC-F-OPD-005__s02__detail",
      "caption": "DICOM viewer load ảnh từ PACS",
      "uiState": "detail"
     },
     {
      "name": "TC-F-OPD-005__s03__success",
      "caption": "KQ CĐHA đã ký về bệnh án OPD",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-OPD-006",
    "title": "Patient-safety: chặn kê đơn khi BN có dị ứng thuốc Severity>=2 trừ khi nhập OverrideReason",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ kê đơn",
    "refIssues": [
     "#239"
    ],
    "preconditions": "BN có bản ghi dị ứng (Allergies, AllergyType=1, Severity>=2, IsActive) trùng hoạt chất/tên 1 thuốc; bệnh án OPD đang mở.",
    "steps": [
     "Tại /v2/prescription/edit chọn BN có dị ứng đã biết.",
     "Kê đúng thuốc mà BN dị ứng (khớp AllergenCode hoặc tên/hoạt chất).",
     "Bấm Lưu đơn KHÔNG nhập lý do bỏ qua → quan sát chặn.",
     "Nhập OverrideReason (lý do bỏ qua hợp lệ), lưu lại."
    ],
    "expected": "Lần 1: BE trả 400, FE hiện cảnh báo chặn lưu (PrescriptionSafetyGuard) nêu rõ thuốc dị ứng. Lần 2 có OverrideReason: lưu thành công và reason được ghi để audit.",
    "notes": "Verify nguồn: PrescriptionSafetyGuard.cs (dị ứng Severity>=2). Đây là chốt an toàn BN — phải fail-closed.",
    "evidence": [
     {
      "name": "TC-F-OPD-006__s01__form",
      "caption": "Kê thuốc BN dị ứng",
      "uiState": "form"
     },
     {
      "name": "TC-F-OPD-006__s02__error",
      "caption": "Bị chặn lưu, cảnh báo dị ứng",
      "uiState": "error"
     },
     {
      "name": "TC-F-OPD-006__s03__success",
      "caption": "Lưu được sau khi nhập OverrideReason",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-OPD-007",
    "title": "Patient-safety: chặn kê đơn khi có tương tác thuốc Severity>=3 trừ khi nhập OverrideReason",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ kê đơn",
    "refIssues": [
     "#239"
    ],
    "preconditions": "DrugInteractions đã seed (138_seed_drug_interactions_severe.sql) có cặp tương tác Severity>=3; bệnh án OPD mở.",
    "steps": [
     "Tại /v2/prescription/edit kê 2 thuốc tạo thành cặp tương tác Severity>=3.",
     "Lưu đơn KHÔNG nhập OverrideReason → quan sát chặn.",
     "Nhập OverrideReason rồi lưu lại.",
     "(Đối chứng) Kê cặp thuốc KHÔNG có tương tác → lưu được luôn không cần reason."
    ],
    "expected": "Cặp Severity>=3 bị chặn lưu khi thiếu OverrideReason (400 + cảnh báo nêu cặp tương tác); có reason thì lưu được; cặp không tương tác lưu bình thường.",
    "notes": "Verify PrescriptionSafetyGuard.cs (tương tác Severity>=3). Nếu KB DrugInteractions rỗng → không chặn (đã ghi rõ trong guard) → cần seed trước khi test.",
    "evidence": [
     {
      "name": "TC-F-OPD-007__s01__form",
      "caption": "Kê cặp thuốc tương tác Severity cao",
      "uiState": "form"
     },
     {
      "name": "TC-F-OPD-007__s02__error",
      "caption": "Bị chặn lưu, cảnh báo tương tác",
      "uiState": "error"
     },
     {
      "name": "TC-F-OPD-007__s03__success",
      "caption": "Lưu được sau khi nhập OverrideReason",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-OPD-008",
    "title": "State-transition liên phân hệ: đơn thuốc Draft → Pending(duyệt) → Approved → Dispensed; nút đổi theo state",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ → Dược sĩ duyệt → Quầy cấp phát",
    "refIssues": [
     "#239"
    ],
    "preconditions": "Bệnh án OPD có đơn; quy trình duyệt dược bật; thuốc còn tồn.",
    "steps": [
     "Tạo đơn ở /v2/prescription/edit, lưu nháp → trạng thái Draft.",
     "Gửi duyệt → Pending; xác nhận đơn hiện ở /v2/clinical-pharmacy-check hoặc /v2/pharmacy-approval.",
     "Dược duyệt → Approved.",
     "Thanh toán tại /v2/billing rồi cấp phát tại /v2/dispensing-counter → Dispensed/Done.",
     "Tại mỗi bước, quan sát nút khả dụng đúng theo state (không cho cấp phát khi chưa duyệt/chưa thanh toán)."
    ],
    "expected": "Trạng thái đơn chuyển đúng chuỗi Draft→Pending→Approved→Dispensed; mỗi màn chỉ cho thao tác hợp lệ với state hiện tại; không thể nhảy bước (vd cấp phát khi chưa thanh toán bị chặn).",
    "notes": "State-transition xuyên OPD↔Pharmacy↔Billing. Bug nhảy state → issue fix liên kết #239.",
    "evidence": [
     {
      "name": "TC-F-OPD-008__s01__detail",
      "caption": "Đơn Draft",
      "uiState": "detail"
     },
     {
      "name": "TC-F-OPD-008__s02__list",
      "caption": "Đơn Pending ở màn duyệt dược",
      "uiState": "list"
     },
     {
      "name": "TC-F-OPD-008__s03__detail",
      "caption": "Đơn Approved",
      "uiState": "detail"
     },
     {
      "name": "TC-F-OPD-008__s04__success",
      "caption": "Đơn Dispensed/Done sau cấp phát",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-OPD-009",
    "title": "Data-consistency tính tiền: chi phí khám+CLS+thuốc cộng đúng, áp BHYT đúng tỷ lệ, đối chiếu phiếu thu",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Thu ngân",
    "refIssues": [
     "#217"
    ],
    "preconditions": "Lượt khám OPD đã có: công khám + chỉ định CLS + đơn thuốc với đơn giá đã biết; BN có thẻ BHYT đúng mức hưởng.",
    "steps": [
     "Ghi lại đơn giá từng mục (khám, từng CLS, từng thuốc) ở các màn nguồn.",
     "Vào /v2/billing, mở tổng hợp chi phí lượt khám.",
     "Đối chiếu tổng = Σ các mục; kiểm phần BHYT chi trả + BN cùng chi trả theo mức hưởng.",
     "Thanh toán, xuất phiếu thu; đối chiếu số tiền trên phiếu = số đã thanh toán."
    ],
    "expected": "Tổng chi phí = tổng đúng các mục từ OPD/CLS/đơn; áp BHYT đúng tỷ lệ (BHYT trả + BN trả = tổng); phiếu thu khớp số tiền; không sai lệch làm tròn.",
    "notes": "Tạo A(các chỉ định)→hiện B(bảng kê billing)→tính C(tổng + BHYT). Sai số tiền là P0.",
    "evidence": [
     {
      "name": "TC-F-OPD-009__s01__detail",
      "caption": "Bảng kê chi phí lượt khám",
      "uiState": "detail"
     },
     {
      "name": "TC-F-OPD-009__s02__detail",
      "caption": "Phần BHYT trả + BN cùng chi trả",
      "uiState": "detail"
     },
     {
      "name": "TC-F-OPD-009__s03__success",
      "caption": "Phiếu thu khớp số tiền",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-OPD-010",
    "title": "Integration payment online + SignalR: thanh toán QR/cổng, IPN cập nhật trạng thái realtime sang Đã thu",
    "category": "integration",
    "priority": "P1",
    "role": "Thu ngân / BN tự thanh toán",
    "refIssues": [
     "#217"
    ],
    "preconditions": "Lượt khám có bảng kê chờ thu; cổng thanh toán (VietQR/VNPay...) ở mock/dev; SignalR bật.",
    "steps": [
     "Tại /v2/billing chọn thanh toán online → sinh QR/đường dẫn cổng.",
     "Mô phỏng callback/IPN thành công từ cổng.",
     "Quan sát trạng thái phiếu cập nhật realtime sang Đã thanh toán (không cần refresh thủ công).",
     "Đối chiếu /v2/payment-transactions có giao dịch khớp số tiền + mã tham chiếu."
    ],
    "expected": "Sinh QR đúng số tiền; sau IPN, trạng thái đổi sang Đã thu realtime (SignalR); giao dịch ghi nhận đúng, liên kết đúng phiếu thu/lượt khám.",
    "notes": "Integration payment + SignalR. Verify chống double-credit nếu IPN gửi 2 lần (idempotency).",
    "evidence": [
     {
      "name": "TC-F-OPD-010__s01__modal",
      "caption": "QR thanh toán online",
      "uiState": "modal"
     },
     {
      "name": "TC-F-OPD-010__s02__success",
      "caption": "Trạng thái Đã thu cập nhật realtime",
      "uiState": "success"
     },
     {
      "name": "TC-F-OPD-010__s03__list",
      "caption": "Giao dịch trong payment-transactions",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-F-OPD-011",
    "title": "Integration XML BHXH: lượt khám ngoại trú đã hoàn tất xuất XML BHXH đúng dữ liệu",
    "category": "integration",
    "priority": "P1",
    "role": "Cán bộ giám định/BHYT",
    "refIssues": [
     "#217"
    ],
    "preconditions": "Lượt OPD đã hoàn tất (khám+CLS+đơn+thanh toán) cho BN BHYT; module /v2/insurance hoặc /v2/bhxh-audit/bhxh-config có chức năng xuất/nộp XML (mock/dev).",
    "steps": [
     "Vào /v2/insurance (hoặc bhxh-audit), chọn lượt khám OPD đã hoàn tất.",
     "Tạo/xuất XML BHXH (bảng kê 4210 nhóm) cho lượt.",
     "Đối chiếu các trường XML: mã BN, thẻ BHYT, ICD chẩn đoán, dịch vụ CLS, thuốc, số tiền BHYT trả khớp dữ liệu lượt khám.",
     "Nộp XML (mock) → trạng thái Submitted/Acknowledged."
    ],
    "expected": "XML sinh ra chứa đúng dữ liệu lượt khám (BN/thẻ/ICD/dịch vụ/thuốc/tiền BHYT); nộp đổi trạng thái đúng; không thiếu mục đã phát sinh.",
    "notes": "Integration XML BHXH. Verify mọi mục phát sinh ở OPD/CLS/đơn đều vào XML — tránh thất thoát quyết toán.",
    "evidence": [
     {
      "name": "TC-F-OPD-011__s01__detail",
      "caption": "Chọn lượt khám OPD để xuất XML",
      "uiState": "detail"
     },
     {
      "name": "TC-F-OPD-011__s02__detail",
      "caption": "Đối chiếu trường XML với dữ liệu lượt",
      "uiState": "detail"
     },
     {
      "name": "TC-F-OPD-011__s03__success",
      "caption": "Nộp XML thành công",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-OPD-012",
    "title": "Luồng ngược (data-consistency): sửa chẩn đoán/hủy 1 chỉ định CLS giữa chừng → billing & XML cập nhật theo",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Bác sĩ → Thu ngân",
    "refIssues": [
     "#239",
     "#217"
    ],
    "preconditions": "Lượt OPD đã có chẩn đoán + 2 chỉ định CLS, chưa thanh toán.",
    "steps": [
     "Quay lại /v2/opd/edit, sửa chẩn đoán ICD và hủy 1 chỉ định CLS chưa thực hiện.",
     "Lưu thay đổi.",
     "Vào /v2/billing kiểm tra bảng kê đã bỏ mục CLS bị hủy, tổng tiền giảm tương ứng.",
     "Đối chiếu trạng thái chỉ định bị hủy ở /v2/lab (không còn trong worklist hoặc đánh Cancelled)."
    ],
    "expected": "Sửa chẩn đoán lưu đúng; chỉ định hủy biến mất khỏi worklist LIS + khỏi bảng kê billing; tổng tiền tính lại đúng; dữ liệu nhất quán xuyên 3 màn.",
    "notes": "Kiểm tính nhất quán khi quay lui — mẫu sửa A→ảnh hưởng B,C. Không cho hủy chỉ định đã có KQ (verify).",
    "evidence": [
     {
      "name": "TC-F-OPD-012__s01__form",
      "caption": "Sửa chẩn đoán + hủy 1 chỉ định CLS",
      "uiState": "form"
     },
     {
      "name": "TC-F-OPD-012__s02__detail",
      "caption": "Billing đã bỏ mục hủy, tổng giảm",
      "uiState": "detail"
     },
     {
      "name": "TC-F-OPD-012__s03__list",
      "caption": "Worklist LIS không còn chỉ định bị hủy",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-F-OPD-013",
    "title": "Luồng phụ/ngoại lệ: hoàn tiền sau khi đã thu rồi hủy 1 mục → phiếu hoàn đúng số, tồn kho thuốc khôi phục",
    "category": "negative",
    "priority": "P1",
    "role": "Thu ngân + Dược",
    "refIssues": [
     "#217"
    ],
    "preconditions": "Lượt OPD đã thanh toán đầy đủ, đơn thuốc đã cấp 1 phần hoặc chưa cấp; có quyền hoàn tiền.",
    "steps": [
     "Tại /v2/billing chọn lượt đã thu, thực hiện hủy/hoàn 1 mục dịch vụ (hoặc 1 thuốc chưa cấp).",
     "Nhập lý do hoàn, xác nhận.",
     "Kiểm phiếu hoàn sinh ra với số tiền = đúng mục hoàn; tổng đã thu thực giảm tương ứng.",
     "Nếu hoàn thuốc chưa cấp: kiểm tồn kho thuốc đó được cộng lại tại /v2/pharmacy/stock-report."
    ],
    "expected": "Phiếu hoàn đúng số tiền + lý do; số đã thu điều chỉnh đúng; tồn kho thuốc chưa cấp khôi phục; có audit cho mutation hoàn tiền; không hoàn được mục đã cấp/đã quyết toán BHXH (verify chặn).",
    "notes": "Ngoại lệ tiền + tồn kho. Verify audit log mọi mutation. Bug → issue fix liên kết #217.",
    "evidence": [
     {
      "name": "TC-F-OPD-013__s01__modal",
      "caption": "Form hoàn tiền + lý do",
      "uiState": "modal"
     },
     {
      "name": "TC-F-OPD-013__s02__success",
      "caption": "Phiếu hoàn đúng số tiền",
      "uiState": "success"
     },
     {
      "name": "TC-F-OPD-013__s03__detail",
      "caption": "Tồn kho thuốc khôi phục",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-OPD-014",
    "title": "Lỗi giữa chừng & state ổn định: BE 5106 lỗi/timeout khi lưu đơn → FE báo lỗi, KHÔNG tạo bản ghi rác, retry được",
    "category": "negative",
    "priority": "P1",
    "role": "Bác sĩ kê đơn",
    "refIssues": [
     "#239"
    ],
    "preconditions": "Bệnh án OPD mở; mô phỏng BE trả 500/timeout khi POST lưu đơn (chặn mạng dev hoặc dừng BE tạm).",
    "steps": [
     "Tại /v2/prescription/edit kê đơn đầy đủ.",
     "Khi bấm Lưu, mô phỏng BE 500/timeout.",
     "Quan sát FE: hiện thông báo lỗi rõ ràng, không treo spinner vĩnh viễn, không điều hướng nhầm.",
     "Khôi phục BE, bấm Lưu lại → đơn lưu thành công 1 lần (không nhân đôi).",
     "Kiểm tra DB/màn đơn: không có đơn nháp rác từ lần lỗi."
    ],
    "expected": "Lỗi giữa chừng được xử lý: thông báo error, loading kết thúc, không mất dữ liệu form; retry tạo đúng 1 đơn; không sinh bản ghi mồ côi/nhân đôi.",
    "notes": "UI error/loading + tính nhất quán khi lỗi. Verify idempotency/transaction phía BE.",
    "evidence": [
     {
      "name": "TC-F-OPD-014__s01__loading",
      "caption": "Đang lưu (loading)",
      "uiState": "loading"
     },
     {
      "name": "TC-F-OPD-014__s02__error",
      "caption": "BE lỗi, FE báo lỗi không treo",
      "uiState": "error"
     },
     {
      "name": "TC-F-OPD-014__s03__success",
      "caption": "Retry lưu thành công đúng 1 đơn",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-OPD-015",
    "title": "Security E2E luồng OPD: IDOR bệnh án/đơn BN khác, anonymous bị chặn, XSS trong ghi chú khám/chẩn đoán",
    "category": "security",
    "priority": "P0",
    "role": "Kẻ tấn công / user không quyền",
    "refIssues": [
     "#217"
    ],
    "preconditions": "Có 2 BN với lượt khám riêng (idA, idB); 1 token user không có quyền OPD; biết các endpoint /api OPD/prescription/billing.",
    "steps": [
     "Đăng nhập bằng user/token không phận sự, gọi GET bệnh án/đơn của BN khác (đổi id trên URL /api hoặc /v2/opd/edit?id=) → kỳ vọng 403/404, không lộ dữ liệu.",
     "Gọi endpoint OPD/prescription KHÔNG kèm token (anonymous) → kỳ vọng 401, không trả dữ liệu.",
     "Nhập payload XSS (vd <img src=x onerror=alert(1)>) vào ghi chú khám/chẩn đoán/lý do, lưu rồi mở lại detail → kỳ vọng escape, không thực thi.",
     "Thử path-traversal khi tải ảnh/đính kèm BN (../) → bị chặn."
    ],
    "expected": "Không IDOR (BN khác → 403/404); anonymous → 401; XSS bị escape khi render; path-traversal bị chặn. Mọi truy cập trái phép có audit.",
    "notes": "Security xuyên luồng OPD. Tham chiếu fix gần đây #181 (path-traversal) #184 (over-posting). Bug → issue fix security liên kết.",
    "evidence": [
     {
      "name": "TC-F-OPD-015__s01__error",
      "caption": "IDOR bệnh án BN khác bị 403/404",
      "uiState": "error"
     },
     {
      "name": "TC-F-OPD-015__s02__permission",
      "caption": "Anonymous bị chặn 401",
      "uiState": "permission"
     },
     {
      "name": "TC-F-OPD-015__s03__detail",
      "caption": "XSS bị escape khi render ghi chú",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-OPD-016",
    "title": "UI states xuyên luồng OPD: empty/loading/error + dark mode + responsive ở các màn chính",
    "category": "ui",
    "priority": "P2",
    "role": "Mọi vai",
    "refIssues": [
     "#217"
    ],
    "preconditions": "Login admin; có thể tạo trạng thái rỗng (lọc không ra kết quả) + chậm mạng (loading) + ngắt BE (error).",
    "steps": [
     "Tại /v2/opd lọc điều kiện không có dữ liệu → kiểm empty state đúng (không vỡ layout).",
     "Throttle mạng, mở /v2/lab và /v2/billing → kiểm skeleton/spinner loading.",
     "Ngắt BE, mở /v2/prescription → kiểm error state có nút thử lại.",
     "Bật dark mode (toggle), rà /v2/reception, /v2/opd, /v2/prescription, /v2/billing → kiểm tương phản, không chữ trắng nền trắng.",
     "Thu nhỏ cửa sổ/responsive → kiểm bảng + drawer + KPI strip không vỡ."
    ],
    "expected": "Mọi màn chính của luồng OPD hiển thị đúng empty/loading/error; dark mode đủ tương phản (tiếng Việt có dấu rõ); responsive không vỡ; _v2kit/ab-* nhất quán.",
    "notes": "UI/UX states + dark + responsive. Lỗi vỡ UI/dark → tạo issue fix bug liên kết.",
    "evidence": [
     {
      "name": "TC-F-OPD-016__s01__empty",
      "caption": "OPD empty state khi lọc không ra",
      "uiState": "empty"
     },
     {
      "name": "TC-F-OPD-016__s02__loading",
      "caption": "Loading skeleton ở lab/billing",
      "uiState": "loading"
     },
     {
      "name": "TC-F-OPD-016__s03__error",
      "caption": "Error state có nút thử lại",
      "uiState": "error"
     },
     {
      "name": "TC-F-OPD-016__s04__detail",
      "caption": "Dark mode các màn luồng OPD",
      "uiState": "detail"
     }
    ]
   }
  ],
  "gaps": [
   "Bước CLS trong FLOWS.opd map vào ['cls'] nhưng không có route /v2/cls riêng — chỉ định CLS được tạo TRONG màn khám OPD (/v2/opd/edit) và đổ sang /v2/lab + /v2/radiology; cần xác nhận lại với dev xem có màn chỉ định CLS độc lập không (ParaclinicalCatalogs là danh mục, không phải tạo chỉ định).",
   "Bước 'Nhận thuốc' (pharmwh) có thể qua /v2/dispensing-counter HOẶC /v2/pharmacy/hospital-pharmacy — chưa xác định màn chuẩn cho cấp phát ngoại trú; tasks dùng dispensing-counter làm mặc định, cần verify.",
   "Mức seed dữ liệu dev ổn định (BN có dị ứng Severity>=2 sẵn, DrugInteractions đã seed 138_*.sql, study DICOM gắn BN trong Orthanc, HL7 message mock) chưa được xác nhận có sẵn — TC-006/007/004/005 cần seed/fixture trước khi chạy được.",
   "Cổng thanh toán online + IPN (TC-010) và xuất/nộp XML BHXH (TC-011) ở môi trường dev có thể chỉ chạy MockMode — cần xác nhận mock có mô phỏng callback/acknowledge để assert outcome thật, nếu không chỉ test được tới bước sinh QR/sinh XML.",
   "Quy tắc nghiệp vụ chi tiết chưa verify trong code: (a) có chặn hủy chỉ định đã có KQ không (TC-012), (b) có chặn hoàn tiền mục đã quyết toán BHXH/đã cấp thuốc không (TC-013), (c) idempotency khi retry lưu đơn (TC-014) và khi IPN gửi 2 lần (TC-010) — cần đọc thêm service tương ứng để chốt expected chính xác.",
   "Phân quyền role thật cho từng màn OPD (TC-015 anonymous/IDOR) chưa kiểm: test chạy bằng admin (full quyền), cần 1 token user hạn chế quyền OPD để kiểm permission đúng nghĩa — môi trường dev có thể chưa có user role hẹp.",
   "FLOWS.opd.related = [followup, lab, billing]: luồng tái khám (followup, /v2/follow-up) chưa được phủ trong bộ task này (tập trung 1 lượt khám đầu); nếu cần phủ liên thông OPD→tái khám thì bổ sung task riêng."
  ]
 },
 {
  "id": "followup",
  "code": "F-FUP",
  "ic": "🔁",
  "layer": "clin",
  "nm": "Tái khám & bệnh mãn tính",
  "gh": [
   "#217",
   "#239"
  ],
  "flow_id": "followup",
  "tasks": [
   {
    "id": "TC-F-FUP-001",
    "title": "Happy-path E2E xuyen man dat lich tai kham xac nhan kham ke don thanh toan hoan tat",
    "category": "happy",
    "priority": "P0",
    "role": "Tiep don Bac si Thu ngan admin",
    "preconditions": "admin/Admin@123 BE 5106 BN cu da tung kham phong active thuoc trong kho FE v2",
    "steps": [
     "booking-management hoac createAppointment tao lich tai kham BN cu ly do ngay hen bac si khoa phong status 0",
     "follow-up xac nhan lich tab Da hen ghi appointmentCode patientCode",
     "reception NewVisitModal visitType tai-kham check-in tao MedicalRecord ve hang doi",
     "opd edit vitals benh su kham chan doan ICD 1 CD chinh isPrimary",
     "completeExamination conclusionType 1 Examination Done",
     "prescription PrescriptionEditor ke don Pending duyet Approved",
     "billing BillingEditor chi phi tao Receipt thanh toan du Paid",
     "follow-up lich tab Da tai kham status 2"
    ],
    "expected": "Lien mach xuyen 4 phan he ban ghi link dung patientId trang thai cuoi Da tai kham tong vien phi phi kham cong thuoc KPI tuan thu tang khang dinh outcome",
    "evidence": [
     {
      "name": "TC-F-FUP-001__s01__form",
      "caption": "Dat lich tai kham",
      "uiState": "form"
     },
     {
      "name": "TC-F-FUP-001__s02__list",
      "caption": "Lich tab Da hen",
      "uiState": "list"
     },
     {
      "name": "TC-F-FUP-001__s03__modal",
      "caption": "Check-in BN tai kham",
      "uiState": "modal"
     },
     {
      "name": "TC-F-FUP-001__s04__form",
      "caption": "OpdEditor vitals chan doan",
      "uiState": "form"
     },
     {
      "name": "TC-F-FUP-001__s05__success",
      "caption": "completeExamination",
      "uiState": "success"
     },
     {
      "name": "TC-F-FUP-001__s06__form",
      "caption": "ke don",
      "uiState": "form"
     },
     {
      "name": "TC-F-FUP-001__s07__form",
      "caption": "BillingEditor chi phi",
      "uiState": "form"
     },
     {
      "name": "TC-F-FUP-001__s08__success",
      "caption": "Receipt Paid",
      "uiState": "success"
     },
     {
      "name": "TC-F-FUP-001__s09__list",
      "caption": "Lich tab Da tai kham",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239",
     "#217"
    ],
    "notes": "Lop quan trong nhat"
   },
   {
    "id": "TC-F-FUP-002",
    "title": "Data-consistency lien phan he lich hien o kham sinh don tinh vien phi",
    "category": "data-consistency",
    "priority": "P0",
    "role": "admin xuyen vai",
    "preconditions": "lich tai kham BN X ly do Y BS Z phi kham 25000 2 thuoc gia biet truoc",
    "steps": [
     "Tao lich BN X reason Y doctor Z previousDiagnosis ro",
     "opd edit previousDiagnosis ly do bac si khop lich",
     "Ke 2 thuoc A B PrescriptionDetails dung ten lieu gia",
     "billing ReceiptDetails phi kham cong A cong B tong dung",
     "Doi chieu patientCode appointmentCode receiptCode cung 1 patientId"
    ],
    "expected": "Nhat quan lich hien dung don khop thuoc tong vien phi dung phep cong FK dung 1 BN",
    "evidence": [
     {
      "name": "TC-F-FUP-002__s01__detail",
      "caption": "Lich drawer",
      "uiState": "detail"
     },
     {
      "name": "TC-F-FUP-002__s02__detail",
      "caption": "previousDiagnosis khop",
      "uiState": "detail"
     },
     {
      "name": "TC-F-FUP-002__s03__detail",
      "caption": "PrescriptionDetails 2 thuoc",
      "uiState": "detail"
     },
     {
      "name": "TC-F-FUP-002__s04__detail",
      "caption": "ReceiptDetails tong dung",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Tao A hien B tinh C"
   },
   {
    "id": "TC-F-FUP-003",
    "title": "State-transition lich hen Scheduled Confirmed Completed dong bo tab KPI",
    "category": "state",
    "priority": "P0",
    "role": "admin",
    "preconditions": "1 lich status 0 follow-up",
    "steps": [
     "follow-up tab Da hen ghi count KPI",
     "Nhac SMS updateAppointmentStatus 1 tab Da nhac",
     "completeExamination status 2 tab Da tai kham",
     "Kiem counts KPI cap nhat moi buoc"
    ],
    "expected": "Enum 0 1 2 tab count KPI khop nut Nhac khong hien voi Completed Cancelled",
    "evidence": [
     {
      "name": "TC-F-FUP-003__s01__tab",
      "caption": "Tab Da hen",
      "uiState": "tab"
     },
     {
      "name": "TC-F-FUP-003__s02__tab",
      "caption": "Tab Da nhac",
      "uiState": "tab"
     },
     {
      "name": "TC-F-FUP-003__s03__tab",
      "caption": "Tab Da tai kham",
      "uiState": "tab"
     },
     {
      "name": "TC-F-FUP-003__s04__success",
      "caption": "KPI cap nhat",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "statusKey gate"
   },
   {
    "id": "TC-F-FUP-004",
    "title": "Patient-safety canh bao DI UNG khi ke don tai kham",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bac si admin",
    "preconditions": "BN co Allergies cau truc thuoc nhom gay di ung kho",
    "steps": [
     "opd edit khoi Di ung allergenName muc do getPatientAllergies",
     "Ke thuoc trung tac nhan di ung PrescriptionEditor",
     "PrescriptionSafetyGuard canh bao khi luu duyet",
     "Doi chieu allergy khop reception"
    ],
    "expected": "Di ung noi bat severity ke thuoc trung canh bao khong im lang nhat quan reception opd presc",
    "evidence": [
     {
      "name": "TC-F-FUP-004__s01__detail",
      "caption": "Khoi Di ung",
      "uiState": "detail"
     },
     {
      "name": "TC-F-FUP-004__s02__modal",
      "caption": "Canh bao di ung",
      "uiState": "modal"
     },
     {
      "name": "TC-F-FUP-004__s03__error",
      "caption": "Chan don khong an toan",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "getPatientAllergies PrescriptionSafetyGuard"
   },
   {
    "id": "TC-F-FUP-005",
    "title": "Patient-safety canh bao TUONG TAC THUOC khi ke don tai kham",
    "category": "integration",
    "priority": "P0",
    "role": "Bac si admin",
    "preconditions": "Seed cap thuoc tuong tac nang 138_seed BN man tinh nhieu thuoc",
    "steps": [
     "prescription ke cap thuoc seed tuong tac nang",
     "Luu duyet PrescriptionSafetyGuard canh bao",
     "Thu ke thuoc trung neu ho tro"
    ],
    "expected": "Canh bao tuong tac nang neu ro cap thuoc muc do override co audit khong luu don nguy hiem im lang",
    "evidence": [
     {
      "name": "TC-F-FUP-005__s01__form",
      "caption": "Ke cap thuoc tuong tac",
      "uiState": "form"
     },
     {
      "name": "TC-F-FUP-005__s02__modal",
      "caption": "Canh bao tuong tac",
      "uiState": "modal"
     },
     {
      "name": "TC-F-FUP-005__s03__confirm",
      "caption": "Override co audit",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "PrescriptionSafetyGuard 138_seed"
   },
   {
    "id": "TC-F-FUP-006",
    "title": "Luong phu HUY lich tai kham Cancelled nhat quan",
    "category": "negative",
    "priority": "P1",
    "role": "Tiep don admin",
    "preconditions": "lich status 0 hoac 1",
    "steps": [
     "Huy lich updateAppointmentStatus 3",
     "Lich tab Da huy",
     "nut Nhac khong con",
     "KPI Da huy tang khong vao hang doi"
    ],
    "expected": "Cancelled tab Da huy mat action KPI cap nhat khong tao MedicalRecord audit ghi",
    "evidence": [
     {
      "name": "TC-F-FUP-006__s01__confirm",
      "caption": "Xac nhan huy",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-FUP-006__s02__tab",
      "caption": "Tab Da huy",
      "uiState": "tab"
     },
     {
      "name": "TC-F-FUP-006__s03__detail",
      "caption": "Drawer khong con action",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "cancelled gate"
   },
   {
    "id": "TC-F-FUP-007",
    "title": "Luong phu BO LO lich NoShow theo doi qua han",
    "category": "edge",
    "priority": "P1",
    "role": "Tiep don admin",
    "preconditions": "lich appointmentDate qua khu daysOverdue lon hon 0",
    "steps": [
     "Loc tab Bo lo status 4",
     "cot Qua han chip crit so ngay",
     "getOverdueFollowUps khop",
     "KPI tuan thu completed chia completed cong missed"
    ],
    "expected": "tab Bo lo chip do dung so ngay getOverdueFollowUps khop KPI dung edge daysOverdue 0 gach",
    "evidence": [
     {
      "name": "TC-F-FUP-007__s01__tab",
      "caption": "Tab Bo lo",
      "uiState": "tab"
     },
     {
      "name": "TC-F-FUP-007__s02__list",
      "caption": "Cot Qua han chip",
      "uiState": "list"
     },
     {
      "name": "TC-F-FUP-007__s03__filter",
      "caption": "Loc qua han",
      "uiState": "filter"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "daysOverdue adherence"
   },
   {
    "id": "TC-F-FUP-008",
    "title": "Luong phu LOI GIUA CHUNG thanh toan that bai sau ke don",
    "category": "negative",
    "priority": "P1",
    "role": "Thu ngan admin",
    "preconditions": "kham tai kham hoan tat don Approved chua thanh toan",
    "steps": [
     "billing Receipt Unpaid",
     "loi thanh toan gian doan IPN",
     "Receipt Unpaid don chua cap phat",
     "Thanh toan lai Paid moi cho cap phat"
    ],
    "expected": "That bai khong Paid khong cap phat khong Payment trung retry Paid tien khong tinh 2 lan",
    "evidence": [
     {
      "name": "TC-F-FUP-008__s01__error",
      "caption": "That bai Receipt Unpaid",
      "uiState": "error"
     },
     {
      "name": "TC-F-FUP-008__s02__toast",
      "caption": "Toast loi",
      "uiState": "toast"
     },
     {
      "name": "TC-F-FUP-008__s03__success",
      "caption": "Retry Receipt Paid",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#239",
     "#217"
    ],
    "notes": "Luong nguoc idempotency"
   },
   {
    "id": "TC-F-FUP-009",
    "title": "Benh man tinh pubhealth dong chu ky tai kham nextFollowUpDate",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bac si admin",
    "preconditions": "ChronicDiseaseRecord followUpIntervalDays nextFollowUpDate BN co lich tai kham",
    "steps": [
     "chronic-disease ghi nextFollowUpDate followUpIntervalDays status 1",
     "Hoan tat 1 lan kham tai kham",
     "nextFollowUpDate ngay kham cong followUpIntervalDays status hop ly",
     "KPI Qua han 7 ngay toi Can tai kham"
    ],
    "expected": "nextFollowUpDate dung chu ky status hop ly KPI dung lien ket ho so lich lan kham nhat quan",
    "evidence": [
     {
      "name": "TC-F-FUP-009__s01__detail",
      "caption": "Drawer chu ky",
      "uiState": "detail"
     },
     {
      "name": "TC-F-FUP-009__s02__success",
      "caption": "nextFollowUpDate cap nhat",
      "uiState": "success"
     },
     {
      "name": "TC-F-FUP-009__s03__list",
      "caption": "KPI Can tai kham",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "followUpIntervalDays nextFollowUpDate"
   },
   {
    "id": "TC-F-FUP-010",
    "title": "Integration nhac lich qua SMS Zalo nhac hang loat",
    "category": "integration",
    "priority": "P1",
    "role": "Tiep don admin",
    "preconditions": "lich status 0 hoac 1 phoneNumber SMS Zalo MockMode dev",
    "steps": [
     "Nhac SMS 1 lich updateAppointmentStatus 1 success",
     "cot Nhac chip ok reminderSentAt",
     "Nhac hang loat sms-management nhieu lich",
     "audit ghi count Da nhac tang"
    ],
    "expected": "reminderSentAt chip ok status Confirmed nhac hang loat gui MockMode audit ghi khong co endpoint flip reminded rieng dung status 1 xac minh ky vong",
    "evidence": [
     {
      "name": "TC-F-FUP-010__s01__toast",
      "caption": "Toast nhac SMS",
      "uiState": "toast"
     },
     {
      "name": "TC-F-FUP-010__s02__list",
      "caption": "Cot Nhac chip ok",
      "uiState": "list"
     },
     {
      "name": "TC-F-FUP-010__s03__list",
      "caption": "SmsManagement hang loat",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "onRemind"
   },
   {
    "id": "TC-F-FUP-011",
    "title": "Integration thanh toan online vien phi tai kham VietQR doi soat",
    "category": "integration",
    "priority": "P1",
    "role": "Thu ngan admin",
    "preconditions": "Receipt Unpaid VietQR MockMode dev bank-payments kha dung",
    "steps": [
     "Sinh QR VietQR EMVCo TLV CRC",
     "IPN callback thanh cong",
     "payment-transactions PaymentTransaction bank-payments doi soat Receipt Paid CashierId",
     "HDDT neu cau hinh"
    ],
    "expected": "QR hop le callback Receipt Paid khong double charge LinkReceipt dung cashier doi soat khop",
    "evidence": [
     {
      "name": "TC-F-FUP-011__s01__modal",
      "caption": "QR VietQR",
      "uiState": "modal"
     },
     {
      "name": "TC-F-FUP-011__s02__success",
      "caption": "Callback Receipt Paid",
      "uiState": "success"
     },
     {
      "name": "TC-F-FUP-011__s03__list",
      "caption": "BankPayments doi soat",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#217"
    ],
    "notes": "LinkReceipt CashierId FK"
   },
   {
    "id": "TC-F-FUP-012",
    "title": "Security IDOR truy cap lich receipt ho so BN khac qua id",
    "category": "security",
    "priority": "P0",
    "role": "User quyen thap token khac",
    "preconditions": "2 BN appointmentId receiptId khac token khong quyen",
    "steps": [
     "Lay appointmentId receiptId BN A",
     "Goi GET PUT appointments idA status receipt idA token khong quyen",
     "updateAppointmentStatus lich khong thuoc quyen",
     "doc PrescriptionDetails Receipt BN khac qua id"
    ],
    "expected": "BE 403 404 khong lo du lieu BN khac khong doi trang thai lich BN khac audit ghi trai phep",
    "evidence": [
     {
      "name": "TC-F-FUP-012__s01__permission",
      "caption": "403 appointment BN khac",
      "uiState": "permission"
     },
     {
      "name": "TC-F-FUP-012__s02__error",
      "caption": "Chan update trai quyen",
      "uiState": "error"
     },
     {
      "name": "TC-F-FUP-012__s03__permission",
      "caption": "Chan doc receipt BN khac",
      "uiState": "permission"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "184 181"
   },
   {
    "id": "TC-F-FUP-013",
    "title": "Security anonymous XSS API followup khong token script reason notes",
    "category": "security",
    "priority": "P1",
    "role": "Khach no auth",
    "preconditions": "BE 5106",
    "steps": [
     "Goi appointments id status khong kem JWT",
     "Tao lich reason notes payload XSS script",
     "follow-up drawer payload escape khong thuc thi",
     "tieng Viet co dau dung"
    ],
    "expected": "API 401 anonymous XSS escape khong thuc thi tieng Viet dung UTF-8",
    "evidence": [
     {
      "name": "TC-F-FUP-013__s01__permission",
      "caption": "401 khong token",
      "uiState": "permission"
     },
     {
      "name": "TC-F-FUP-013__s02__detail",
      "caption": "XSS escape",
      "uiState": "detail"
     },
     {
      "name": "TC-F-FUP-013__s03__list",
      "caption": "Tieng Viet co dau",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "180"
   },
   {
    "id": "TC-F-FUP-014",
    "title": "Validation form dat lich form kham field bat buoc ngay hen qua khu CD chinh",
    "category": "validation",
    "priority": "P1",
    "role": "Tiep don Bac si admin",
    "preconditions": "FE v2",
    "steps": [
     "NewVisitModal bo trong field bat buoc FIELD_LABELS submit",
     "ngay hen qua khu submit",
     "completeExamination chua CD chinh isPrimary submit",
     "message.error field loi auto-scroll data-fld-err"
    ],
    "expected": "Field trong chan bao ro field khong submit im lang ngay hen qua khu chan completeExamination yeu cau 1 CD chinh FE khop BE",
    "evidence": [
     {
      "name": "TC-F-FUP-014__s01__validation",
      "caption": "Thieu field bat buoc",
      "uiState": "validation"
     },
     {
      "name": "TC-F-FUP-014__s02__validation",
      "caption": "Ngay hen qua khu chan",
      "uiState": "validation"
     },
     {
      "name": "TC-F-FUP-014__s03__validation",
      "caption": "Thieu CD chinh",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "FIELD_LABELS data-fld-err isPrimary"
   },
   {
    "id": "TC-F-FUP-015",
    "title": "UI states empty loading error dark-mode responsive tai diem chuyen man",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "FE v2 toggle dark light khoa rong test empty",
    "steps": [
     "follow-up khong co lich empty dang tai Dang tai",
     "Ngat BE follow-up chronic-disease error khong crash",
     "Dark mode contrast chip StatusBadge",
     "Thu hep viewport DataTable OpdEditor 3 cot drawer"
    ],
    "expected": "Empty loading error dung khong man trang spinner vo tan dark mode contrast dat responsive khong vo layout",
    "evidence": [
     {
      "name": "TC-F-FUP-015__s01__empty",
      "caption": "follow-up empty",
      "uiState": "empty"
     },
     {
      "name": "TC-F-FUP-015__s02__loading",
      "caption": "follow-up dang tai",
      "uiState": "loading"
     },
     {
      "name": "TC-F-FUP-015__s03__error",
      "caption": "Ngat BE error",
      "uiState": "error"
     },
     {
      "name": "TC-F-FUP-015__s04__list",
      "caption": "Dark mode contrast",
      "uiState": "list"
     },
     {
      "name": "TC-F-FUP-015__s05__list",
      "caption": "Responsive hep",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "empty loading SimpleV2Page leftOpen rightOpen"
   },
   {
    "id": "TC-F-FUP-016",
    "title": "Edge tai kham da chuyen khoa doi phong truoc kham huy hoan tat XML BHXH",
    "category": "edge",
    "priority": "P2",
    "role": "Bac si Giam dinh BHYT admin",
    "preconditions": "BN tai kham BHYT kham-bhyt nhieu phong Multi-specialty exam",
    "steps": [
     "Dang ky nhieu phong registerMultipleRooms addFollowUpSpecialty phi phong them khong BHYT",
     "changeRoomBeforeExam doi phong truoc kham",
     "cancelCompletion cancelPrintBill sau hoan tat rollback dung audit",
     "Tai kham BHYT da thanh toan XML BHXH khop DV chan doan"
    ],
    "expected": "Phong them phi dich vu khong BHYT doi phong khong mat du lieu cancelCompletion rollback audit XML BHXH khop khong lech so tien",
    "evidence": [
     {
      "name": "TC-F-FUP-016__s01__modal",
      "caption": "Nhieu phong phi khong BHYT",
      "uiState": "modal"
     },
     {
      "name": "TC-F-FUP-016__s02__confirm",
      "caption": "Doi phong truoc kham",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-FUP-016__s03__confirm",
      "caption": "cancelCompletion rollback",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-FUP-016__s04__detail",
      "caption": "XML BHXH khop",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239",
     "#217"
    ],
    "notes": "addFollowUpSpecialty changeRoomBeforeExam cancelCompletion"
   }
  ],
  "gaps": [
   "FLOWS followup steps 4 buoc reception opd presc billing nhung related opd pubhealth nen benh man tinh la related khong phai step chinh da phu TC-009 can chu flow xac nhan co tach followup khoi chronic thanh 2 luong rieng",
   "Chua Read PrescriptionEditor va PrescriptionSafetyGuard de biet canh bao di ung tuong tac chan cung hay chi canh bao co override TC-004 TC-005 can verify hanh vi that truoc khi assert",
   "FollowUp chi doc lich va doi status khong co nut tao lich tai cho tao lich qua createAppointment trong OpdEditor can xac nhan duong tao lich chuan de TC-001 step 1 chinh xac",
   "onRemind ghi chu khong co endpoint flip reminded nen mark Confirmed status 1 nghiep vu da nhac va da xac nhan gop 1 trang thai co the la gap can chu flow xac nhan truoc khi coi la bug",
   "Chua xac minh endpoint thanh toan VietQR IPN va duong xuat XML BHXH cho lan tai kham trong code MockMode dev co mo phong callback day du khong",
   "Phan quyen role cho IDOR admin full quyen nen can seed role test hep hon de 403 co y nghia",
   "Du lieu seed on dinh cho E2E chua co fixture san cho rieng luong followup"
  ],
  "summary": "E2E xuyen phan he luong Tai kham va benh man tinh (id=followup). Grounded FLOWS data.js: BN tai kham xac nhan lich hen kham ke toa thanh toan ve; steps reception opd presc billing; related opd pubhealth. Man v2 verify: FollowUp.tsx /v2/follow-up, BookingManagement, SmsManagement, NewVisitModal visitType tai-kham; OpdEditor.tsx /v2/opd/edit (di ung cau truc); PrescriptionEditor + PrescriptionSafetyGuard.cs; Billing/BillingEditor + VietQR/BankPayments; ChronicDisease.tsx. AppointmentStatus 0 Scheduled 1 Confirmed 2 Completed 3 Cancelled 4 NoShow. API searchAppointments updateAppointmentStatus createAppointment getOverdueFollowUps completeExamination getChronicRecords. FE v2 admin/Admin@123 JWT BE 5106. Dedup chi tiet hoa #239 (P0 lam sang) + #217 (E2E happy). 16 task happy data-consistency state-transition luong phu patient-safety integration security validation ui edge.</parameter>\n</invoke>\n"
 },
 {
  "id": "ed",
  "code": "F-ED",
  "ic": "🚑",
  "layer": "clin",
  "nm": "Cấp cứu",
  "gh": [
   "#217",
   "#224"
  ],
  "flow_id": "ed",
  "summary": "Bộ test-task END-TO-END xuyên phân hệ cho luồng \"Cấp cứu\" (id=ed) theo data.js: desc \"BN cấp cứu → tiếp nhận → xử trí → CLS → theo dõi → nhập viện → nội trú → xuất viện\"; steps[] = [Tiếp đón cấp cứu→reception]→[Khám/xử trí→opd]→[CLS→cls]→[Lưu theo dõi→ipd]→[Nhập viện→ipd]→[Viện phí→billing]; related = inpatient, surgery, blood. FE v2 /v2/* (TerminalLayout, _v2kit, ab-*), login admin/Admin@123, BE localhost:5106. Grounded vào màn thật: Reception.tsx + reception/NewVisitModal.tsx (visit-type 'cap-cuu' emergency:true, priority crit/high/norm), EmergencyDisaster.tsx, OPD.tsx/OpdEditor.tsx, Inpatient.tsx + inpatient/InpatientServiceOrderCreateModal.tsx + TreatmentMonitorSection.tsx, BloodBank.tsx, Surgery.tsx, DispensingCounter.tsx. Tập trung: happy-path E2E xuyên 5 phân hệ; data-consistency liên phân hệ (tạo A→hiện B→tính C); state-transition liên phân hệ (Triage→Đang xử trí→Lưu theo dõi→Nhập viện→Nội trú→Quyết toán); luồng phụ/ngoại lệ (hủy/hoãn/lỗi giữa chừng/session/double-submit); integration (HL7 LIS, DICOM PACS, SignalR, XML BHXH, payment, nhóm máu/truyền máu); security (IDOR/anonymous/XSS). 18 task, evidence chụp tại mọi điểm chuyển màn. Dedup: chi tiết hóa #217 (happy-path E2E) + #224 (luồng phụ+ngoại lệ), điền refIssues, không tạo trùng.",
  "tasks": [
   {
    "id": "TC-F-ED-001",
    "title": "Happy-path E2E xuyên phân hệ: Tiếp đón cấp cứu → Khám/xử trí → CLS → Lưu theo dõi → Nhập viện → Viện phí (1 BN, 1 mạch)",
    "category": "happy",
    "priority": "P0",
    "role": "Tiếp đón + Bác sĩ + Thu ngân (admin)",
    "preconditions": "Đăng nhập admin/Admin@123 (JWT localStorage token+user). BE localhost:5106 up, có seed BHYT + danh mục dịch vụ + giường nội trú trống. Bắt đầu /v2/dashboard.",
    "steps": [
     "Mở Reception (/v2/reception), bấm 'Tiếp nhận mới' → NewVisitModal.",
     "Chọn visit-type 'Cấp cứu' (radio cap-cuu, emergency:true), nhập tên/CCCD/tuổi/giới, chọn 'Mức ưu tiên' = crit (nguy kịch), nhập lý do vào cấp cứu, Lưu → sinh visit cấp cứu trong hàng đợi.",
     "Mở Khám/xử trí (OPD /v2/opd hoặc OpdEditor): chọn đúng BN vừa tiếp nhận, ghi sinh hiệu + chẩn đoán sơ bộ + xử trí cấp cứu.",
     "Tại CLS (Chỉ định dịch vụ): tạo y lệnh XN huyết học + CĐHA (X-quang) cho chính BN này; xác nhận chỉ định gắn đúng visit.",
     "Quay về OPD: ghi 'Lưu theo dõi' (chuyển BN sang trạng thái theo dõi tại khoa cấp cứu).",
     "Ra quyết định 'Nhập viện' → mở luồng Inpatient (/v2/inpatient): tạo bệnh án nội trú, gán giường, gán khoa.",
     "Mở Billing (/v2/billing): tổng hợp chi phí toàn bộ visit (phí cấp cứu + dịch vụ CLS + ngày giường), thu ngân thanh toán/tạm ứng.",
     "Xác nhận trạng thái cuối của hồ sơ + biên lai."
    ],
    "expected": "BN đi trọn 5 phân hệ không lỗi; mỗi bước tạo bản ghi đúng và gắn đúng visit/patientId; trạng thái cuối = Nội trú + đã quyết toán/tạm ứng; tổng tiền billing = phí cấp cứu + CLS + giường (khớp số liệu). Không có console error chặn luồng. Mỗi mutation ghi audit.",
    "evidence": [
     {
      "name": "TC-F-ED-001__s01__form",
      "caption": "NewVisitModal chọn visit-type Cấp cứu + ưu tiên crit",
      "uiState": "form"
     },
     {
      "name": "TC-F-ED-001__s02__list",
      "caption": "Hàng đợi reception hiển thị visit cấp cứu vừa tạo",
      "uiState": "list"
     },
     {
      "name": "TC-F-ED-001__s03__detail",
      "caption": "OPD: khám/xử trí + sinh hiệu + chẩn đoán BN cấp cứu",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-001__s04__modal",
      "caption": "CLS: tạo y lệnh XN + CĐHA gắn đúng visit",
      "uiState": "modal"
     },
     {
      "name": "TC-F-ED-001__s05__detail",
      "caption": "Inpatient: tạo bệnh án nội trú + gán giường",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-001__s06__success",
      "caption": "Billing: thanh toán/tạm ứng + biên lai, tổng tiền khớp",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#217"
    ],
    "notes": "Đây là kịch bản xương sống. Khẳng định OUTCOME (bản ghi tạo ra + tổng tiền + trạng thái), không chỉ trang load. Chi tiết hóa #217 cho luồng ed."
   },
   {
    "id": "TC-F-ED-002",
    "title": "State-transition liên phân hệ: Triage → Đang xử trí → Lưu theo dõi → Nhập viện → Nội trú → Quyết toán (đúng thứ tự)",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ cấp cứu + Điều dưỡng",
    "preconditions": "Đã có visit cấp cứu trạng thái mới tiếp nhận (từ TC-F-ED-001 hoặc seed).",
    "steps": [
     "Tại OPD/EmergencyDisaster: BN ở trạng thái triage; chuyển sang 'Đang xử trí'.",
     "Hoàn tất xử trí → chuyển 'Lưu theo dõi'.",
     "Từ 'Lưu theo dõi' → quyết định 'Nhập viện' (chuyển sang IPD).",
     "Trong Inpatient → trạng thái 'Đang điều trị'.",
     "Kết thúc điều trị → 'Quyết toán/Xuất viện' qua Billing.",
     "Kiểm tra status badge/tab StatusTabs tại mỗi màn phản ánh đúng trạng thái hiện tại."
    ],
    "expected": "Mỗi chuyển trạng thái chỉ cho phép theo đúng chuỗi; status hiển thị nhất quán across màn (reception/opd/ipd/billing); không cho nhảy bước (vd không Nhập viện khi chưa qua xử trí). Audit ghi từng chuyển trạng thái kèm user+thời gian.",
    "evidence": [
     {
      "name": "TC-F-ED-002__s01__tab",
      "caption": "StatusTabs: trạng thái Triage",
      "uiState": "tab"
     },
     {
      "name": "TC-F-ED-002__s02__detail",
      "caption": "Chuyển sang Đang xử trí",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-002__s03__confirm",
      "caption": "Xác nhận Nhập viện từ Lưu theo dõi",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-ED-002__s04__detail",
      "caption": "IPD: trạng thái Đang điều trị",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-002__s05__success",
      "caption": "Quyết toán/Xuất viện hoàn tất",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#217"
    ],
    "notes": "Tập trung tính hợp lệ của state-machine liên phân hệ, không phải CRUD đơn lẻ."
   },
   {
    "id": "TC-F-ED-003",
    "title": "Data-consistency: tạo y lệnh CLS ở OPD → hiện ở worklist LIS/PACS → kết quả về → tính vào tổng viện phí",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ + KTV CLS + Thu ngân",
    "preconditions": "Visit cấp cứu đang xử trí; danh mục XN + CĐHA có giá.",
    "steps": [
     "OPD/CLS: tạo y lệnh XN (vd CTM) + CĐHA (X-quang ngực) cho BN cấp cứu (tạo A).",
     "Mở LIS worklist: xác nhận y lệnh XN xuất hiện đúng BN + đúng dịch vụ (hiện B).",
     "Mở RIS/PACS dispatcher: xác nhận chỉ định CĐHA xuất hiện.",
     "Nhập/trả kết quả XN; xác nhận trạng thái y lệnh chuyển 'Đã có KQ' và phản ánh ngược ở OPD.",
     "Mở Billing: xác nhận chi phí 2 dịch vụ CLS được cộng vào tổng (tính C)."
    ],
    "expected": "A (y lệnh tạo ở OPD) đồng nhất với B (worklist LIS/PACS) và C (dòng chi phí billing); không lệch số lượng/giá; trạng thái KQ đồng bộ 2 chiều OPD↔LIS. Tổng tiền = đúng đơn giá × số lượng dịch vụ.",
    "evidence": [
     {
      "name": "TC-F-ED-003__s01__modal",
      "caption": "Tạo y lệnh CLS XN+CĐHA",
      "uiState": "modal"
     },
     {
      "name": "TC-F-ED-003__s02__list",
      "caption": "LIS worklist hiển thị y lệnh đúng BN",
      "uiState": "list"
     },
     {
      "name": "TC-F-ED-003__s03__list",
      "caption": "RIS/PACS hiển thị chỉ định CĐHA",
      "uiState": "list"
     },
     {
      "name": "TC-F-ED-003__s04__detail",
      "caption": "Trạng thái Đã có KQ phản ánh ngược OPD",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-003__s05__detail",
      "caption": "Billing cộng đúng chi phí CLS vào tổng",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#217"
    ],
    "notes": "Kiểm tra liên phân hệ cls↔lis↔ris↔billing. Khẳng định số liệu cuối."
   },
   {
    "id": "TC-F-ED-004",
    "title": "Data-consistency: phí cấp cứu + ngày giường nội trú + tạm ứng → tổng quyết toán cuối khớp 100%",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "Visit cấp cứu đã nhập viện, có ít nhất 1 ngày giường + đã tạm ứng 1 lần.",
    "steps": [
     "Ghi nhận phí khám cấp cứu (từ visit-type cap-cuu).",
     "Inpatient: phát sinh ngày giường (giá giường × số ngày).",
     "Billing: tạo phiếu tạm ứng số tiền X.",
     "Thêm vài dịch vụ CLS/thuốc.",
     "Quyết toán cuối: kiểm tra Tổng phải thu = (phí cấp cứu + giường + CLS + thuốc), Còn phải thu = Tổng − tạm ứng X.",
     "Đối chiếu với phần BHYT chi trả nếu BN có thẻ."
    ],
    "expected": "Tổng quyết toán = đúng tổng các khoản; tạm ứng được trừ chính xác; phần BHYT/đồng chi trả tính đúng tỉ lệ; không double-count dịch vụ CLS đã tính ở bước khác. Số tiền hiển thị định dạng VND nhất quán.",
    "evidence": [
     {
      "name": "TC-F-ED-004__s01__detail",
      "caption": "Bảng kê chi phí: cấp cứu + giường + CLS + thuốc",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-004__s02__modal",
      "caption": "Phiếu tạm ứng số tiền X",
      "uiState": "modal"
     },
     {
      "name": "TC-F-ED-004__s03__detail",
      "caption": "Quyết toán: Còn phải thu = Tổng − tạm ứng",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-004__s04__success",
      "caption": "Biên lai quyết toán cuối khớp số",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#217"
    ],
    "notes": "Tính C từ A+B liên phân hệ billing↔ipd. Bắt double-count + sai trừ tạm ứng."
   },
   {
    "id": "TC-F-ED-005",
    "title": "Patient-safety: cảnh báo dị ứng + tương tác thuốc khi kê đơn cấp cứu",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ cấp cứu",
    "preconditions": "BN cấp cứu có tiền sử dị ứng (vd Penicillin) ghi ở hồ sơ. PrescriptionSafetyGuard active.",
    "steps": [
     "OPD: mở kê đơn cho BN cấp cứu.",
     "Kê thuốc trùng nhóm dị ứng đã khai → quan sát cảnh báo dị ứng (chặn/cảnh báo bắt buộc xác nhận).",
     "Kê 2 thuốc có tương tác nghiêm trọng (seed 138_seed_drug_interactions_severe) → quan sát cảnh báo tương tác.",
     "Thử lưu đơn khi đang có cảnh báo nghiêm trọng → xác nhận buộc lý do override hoặc bị chặn.",
     "Lưu đơn hợp lệ sau khi đổi thuốc an toàn."
    ],
    "expected": "Hệ thống hiển thị cảnh báo dị ứng + tương tác thuốc nghiêm trọng TRƯỚC khi lưu; mức nghiêm trọng buộc xác nhận/override có ghi lý do; đơn không an toàn không lưu im lặng. Cảnh báo + override ghi audit.",
    "evidence": [
     {
      "name": "TC-F-ED-005__s01__modal",
      "caption": "Kê đơn cấp cứu cho BN có dị ứng",
      "uiState": "modal"
     },
     {
      "name": "TC-F-ED-005__s02__error",
      "caption": "Cảnh báo dị ứng thuốc trùng nhóm",
      "uiState": "error"
     },
     {
      "name": "TC-F-ED-005__s03__error",
      "caption": "Cảnh báo tương tác thuốc nghiêm trọng",
      "uiState": "error"
     },
     {
      "name": "TC-F-ED-005__s04__confirm",
      "caption": "Buộc override có lý do khi lưu",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#217",
     "#224"
    ],
    "notes": "Bám PrescriptionSafetyGuard.cs + seed 138. Patient-safety là P0 trong cấp cứu."
   },
   {
    "id": "TC-F-ED-006",
    "title": "Integration nhóm máu/truyền máu: BN cấp cứu mất máu → định nhóm máu → lĩnh đơn vị máu phù hợp → truyền (related: blood)",
    "category": "integration",
    "priority": "P0",
    "role": "Bác sĩ + Ngân hàng máu",
    "preconditions": "BloodBank có tồn kho đơn vị máu nhiều nhóm. BN cấp cứu cần truyền máu.",
    "steps": [
     "OPD/IPD: ghi nhận chỉ định truyền máu cho BN cấp cứu + nhóm máu BN (vd O+).",
     "Mở BloodBank: tra cứu đơn vị máu tương thích nhóm BN.",
     "Cố lĩnh đơn vị máu KHÔNG tương thích nhóm → kỳ vọng bị chặn (safety nhóm máu).",
     "Lĩnh đơn vị máu tương thích → trừ tồn kho.",
     "Ghi nhận truyền máu vào hồ sơ; chi phí đơn vị máu cộng vào billing."
    ],
    "expected": "Chặn lĩnh máu sai nhóm (cross-match safety); tồn kho đơn vị máu giảm đúng sau khi lĩnh; bản ghi truyền máu gắn đúng BN; chi phí máu vào billing. Mọi thao tác lĩnh/truyền ghi audit.",
    "evidence": [
     {
      "name": "TC-F-ED-006__s01__detail",
      "caption": "Chỉ định truyền máu + nhóm máu BN",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-006__s02__list",
      "caption": "BloodBank: đơn vị máu tương thích",
      "uiState": "list"
     },
     {
      "name": "TC-F-ED-006__s03__error",
      "caption": "Chặn lĩnh máu sai nhóm",
      "uiState": "error"
     },
     {
      "name": "TC-F-ED-006__s04__success",
      "caption": "Lĩnh máu tương thích, tồn kho giảm",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#217"
    ],
    "notes": "related[blood] của luồng ed. Patient-safety nhóm máu."
   },
   {
    "id": "TC-F-ED-007",
    "title": "Integration phẫu thuật cấp cứu: BN cấp cứu cần mổ → tạo lịch mổ cấp → biên bản mổ → hậu phẫu nội trú (related: surgery)",
    "category": "integration",
    "priority": "P1",
    "role": "Bác sĩ + Phẫu thuật viên",
    "preconditions": "BN cấp cứu đã nhập viện, có chỉ định mổ cấp.",
    "steps": [
     "IPD: ghi chỉ định phẫu thuật cấp cứu cho BN.",
     "Mở Surgery (/v2/surgery): tạo lịch mổ cấp (ưu tiên), gán kíp mổ + phòng mổ.",
     "Cấp phát vật tư/thuốc kíp mổ qua SurgeryCabinetIssueModal → trừ tồn kho.",
     "Ghi biên bản mổ + gây mê.",
     "Chuyển BN về theo dõi hậu phẫu IPD; chi phí PT + vật tư cộng billing."
    ],
    "expected": "Lịch mổ cấp tạo đúng BN/visit; cấp phát vật tư trừ tồn đúng; biên bản mổ lưu vào HSĐT; chi phí PT vào billing; trạng thái BN chuyển hậu phẫu. Liên thông surgery↔ipd↔pharmwh↔billing nhất quán.",
    "evidence": [
     {
      "name": "TC-F-ED-007__s01__modal",
      "caption": "Tạo lịch mổ cấp cứu + gán kíp",
      "uiState": "modal"
     },
     {
      "name": "TC-F-ED-007__s02__modal",
      "caption": "SurgeryCabinetIssueModal cấp vật tư kíp mổ",
      "uiState": "modal"
     },
     {
      "name": "TC-F-ED-007__s03__detail",
      "caption": "Biên bản mổ + gây mê lưu HSĐT",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-007__s04__detail",
      "caption": "Hậu phẫu IPD + chi phí PT vào billing",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#217"
    ],
    "notes": "related[surgery]. Liên 4 phân hệ. P1 vì là nhánh điều kiện."
   },
   {
    "id": "TC-F-ED-008",
    "title": "Integration cấp phát thuốc cấp cứu: kê đơn → duyệt phát → cấp phát DispensingCounter → trừ tồn kho dược (pharmwh)",
    "category": "integration",
    "priority": "P1",
    "role": "Bác sĩ + Dược sĩ",
    "preconditions": "Kho dược có tồn thuốc; đơn cấp cứu đã kê (TC-F-ED-005).",
    "steps": [
     "Bác sĩ kê đơn thuốc cấp cứu, gửi duyệt phát.",
     "Dược sĩ mở DispensingCounter: duyệt đơn → cấp phát.",
     "Xác nhận tồn kho thuốc giảm đúng số lượng cấp.",
     "Chi phí thuốc cộng vào billing.",
     "Kiểm tra đơn không đủ tồn → cảnh báo thiếu hàng."
    ],
    "expected": "Đơn cấp cứu qua duyệt→cấp phát đúng quy trình; tồn kho giảm khớp; chi phí thuốc vào billing; thiếu tồn thì cảnh báo, không cho phát âm kho. Mọi xuất kho ghi audit.",
    "evidence": [
     {
      "name": "TC-F-ED-008__s01__detail",
      "caption": "Đơn thuốc cấp cứu gửi duyệt phát",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-008__s02__modal",
      "caption": "DispensingCounter duyệt + cấp phát",
      "uiState": "modal"
     },
     {
      "name": "TC-F-ED-008__s03__success",
      "caption": "Tồn kho dược giảm đúng số lượng",
      "uiState": "success"
     },
     {
      "name": "TC-F-ED-008__s04__error",
      "caption": "Cảnh báo khi thiếu tồn",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#217"
    ],
    "notes": "presc↔pharmwh↔billing. Liên thông kho."
   },
   {
    "id": "TC-F-ED-009",
    "title": "Integration realtime SignalR: hàng đợi cấp cứu + trạng thái BN cập nhật live giữa các màn/thiết bị",
    "category": "integration",
    "priority": "P1",
    "role": "Tiếp đón + Bác sĩ",
    "preconditions": "SignalR hub kết nối; 2 tab/2 phiên cùng xem hàng đợi cấp cứu.",
    "steps": [
     "Tab A (reception): tiếp nhận BN cấp cứu mới.",
     "Tab B (OPD queue): quan sát BN xuất hiện realtime không cần refresh.",
     "Tab A: đổi mức ưu tiên BN → Tab B cập nhật thứ tự hàng đợi live.",
     "Ngắt mạng tạm thời → quan sát fallback polling/auto-reconnect.",
     "Khôi phục mạng → đồng bộ lại trạng thái."
    ],
    "expected": "Cập nhật đẩy realtime sang tab khác không cần reload; ưu tiên cấp cứu đẩy lên đầu hàng đợi live; mất kết nối có fallback polling + auto-reconnect, không kẹt UI; sau reconnect dữ liệu đồng bộ.",
    "evidence": [
     {
      "name": "TC-F-ED-009__s01__list",
      "caption": "Tab B nhận BN cấp cứu mới realtime",
      "uiState": "list"
     },
     {
      "name": "TC-F-ED-009__s02__list",
      "caption": "Thứ tự hàng đợi cập nhật theo ưu tiên live",
      "uiState": "list"
     },
     {
      "name": "TC-F-ED-009__s03__error",
      "caption": "Mất kết nối: fallback polling/reconnect",
      "uiState": "error"
     },
     {
      "name": "TC-F-ED-009__s04__success",
      "caption": "Reconnect: đồng bộ lại trạng thái",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#217",
     "#224"
    ],
    "notes": "SignalR realtime giữa phân hệ reception↔opd."
   },
   {
    "id": "TC-F-ED-010",
    "title": "Integration HL7 LIS + DICOM PACS: kết quả XN về qua HL7 + ảnh CĐHA xem được trên PACS viewer cho BN cấp cứu",
    "category": "integration",
    "priority": "P1",
    "role": "KTV CLS + Bác sĩ",
    "preconditions": "LIS HL7 + Orthanc PACS có kết nối/mock; BN cấp cứu có y lệnh XN + CĐHA (TC-F-ED-003).",
    "steps": [
     "Trả kết quả XN qua HL7 LIS → kết quả map đúng y lệnh + BN cấp cứu.",
     "Mở OPD/CLS: xem kết quả XN hiển thị, trạng thái 'Đã có KQ'.",
     "Mở DICOM viewer (Cornerstone): tải ảnh X-quang BN từ PACS proxy đúng study.",
     "Kiểm tra ảnh load (wadouri imageIds) + công cụ window/level/zoom.",
     "Bác sĩ ghi nhận kết quả vào hồ sơ cấp cứu."
    ],
    "expected": "Kết quả HL7 map đúng BN/y lệnh (không lẫn BN khác); ảnh DICOM tải đúng study của BN cấp cứu; viewer thao tác được; kết quả phản ánh ngược OPD. Nếu PACS lỗi → thông báo lỗi rõ, không màn trắng.",
    "evidence": [
     {
      "name": "TC-F-ED-010__s01__detail",
      "caption": "Kết quả XN HL7 map đúng BN cấp cứu",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-010__s02__tab",
      "caption": "OPD: kết quả XN Đã có KQ",
      "uiState": "tab"
     },
     {
      "name": "TC-F-ED-010__s03__detail",
      "caption": "DICOM viewer tải ảnh X-quang đúng study",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-010__s04__error",
      "caption": "PACS lỗi: thông báo rõ, không màn trắng",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#217",
     "#224"
    ],
    "notes": "HL7 + DICOM integration cho nhánh CLS của ed."
   },
   {
    "id": "TC-F-ED-011",
    "title": "Integration thanh toán online + XML BHXH: quyết toán cấp cứu có BHYT → thanh toán online → submit XML BHXH",
    "category": "integration",
    "priority": "P1",
    "role": "Thu ngân + Giám định BHYT",
    "preconditions": "BN cấp cứu có thẻ BHYT hợp lệ; payment gateway (VietQR/VNPay) mock; cổng BHXH mock.",
    "steps": [
     "Billing: tổng hợp chi phí cấp cứu, tách phần BHYT chi trả + đồng chi trả.",
     "Phần đồng chi trả: tạo QR/thanh toán online → quan sát IPN/return callback cập nhật trạng thái đã thu.",
     "Xuất biên lai/HĐĐT.",
     "Tạo + submit hồ sơ XML BHXH cho đợt điều trị cấp cứu.",
     "Quan sát trạng thái Submitted/Acknowledged từ cổng."
    ],
    "expected": "Tỉ lệ BHYT/đồng chi trả tính đúng; thanh toán online cập nhật trạng thái qua callback (không thủ công); XML BHXH sinh đúng định dạng + submit nhận phản hồi trạng thái; sai sót XML báo lỗi rõ. Audit cho giao dịch tiền + submit.",
    "evidence": [
     {
      "name": "TC-F-ED-011__s01__detail",
      "caption": "Billing tách BHYT + đồng chi trả cấp cứu",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-011__s02__modal",
      "caption": "QR/thanh toán online đồng chi trả",
      "uiState": "modal"
     },
     {
      "name": "TC-F-ED-011__s03__success",
      "caption": "Callback cập nhật đã thu + HĐĐT",
      "uiState": "success"
     },
     {
      "name": "TC-F-ED-011__s04__detail",
      "caption": "Submit XML BHXH: trạng thái Submitted/Acknowledged",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#217"
    ],
    "notes": "payment + XML BHXH integration của nhánh billing ed."
   },
   {
    "id": "TC-F-ED-012",
    "title": "Luồng phụ - HỦY giữa chừng: hủy nhập viện sau khi đã chỉ định CLS → dữ liệu/chi phí nhất quán, không kẹt trạng thái",
    "category": "negative",
    "priority": "P1",
    "role": "Bác sĩ + Thu ngân",
    "preconditions": "BN cấp cứu đã qua xử trí + có y lệnh CLS, đang ở bước quyết định nhập viện.",
    "steps": [
     "Bắt đầu nhập viện (gán giường tạm).",
     "Hủy quyết định nhập viện giữa chừng (BN không nhập viện, về xử trí ngoại trú).",
     "Kiểm tra giường được giải phóng (không bị giữ).",
     "Kiểm tra y lệnh CLS đã tạo còn nguyên + vẫn tính chi phí đúng.",
     "Billing: tổng tiền không tính ngày giường (vì đã hủy nhập viện)."
    ],
    "expected": "Hủy nhập viện giải phóng giường; không phát sinh chi phí giường; y lệnh CLS giữ nguyên, không mất; trạng thái BN trở lại hợp lệ (ngoại trú/theo dõi), không kẹt ở trạng thái lửng. Hủy ghi audit + lý do.",
    "evidence": [
     {
      "name": "TC-F-ED-012__s01__confirm",
      "caption": "Hủy quyết định nhập viện",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-ED-012__s02__list",
      "caption": "Giường được giải phóng",
      "uiState": "list"
     },
     {
      "name": "TC-F-ED-012__s03__detail",
      "caption": "Y lệnh CLS giữ nguyên",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-012__s04__detail",
      "caption": "Billing không tính ngày giường",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#224"
    ],
    "notes": "Chi tiết hóa #224: hủy giữa chừng + data-consistency liên phân hệ."
   },
   {
    "id": "TC-F-ED-013",
    "title": "Luồng phụ - HOÀN tiền: hủy dịch vụ CLS đã thanh toán → hoàn tiền → tổng billing + sổ quỹ điều chỉnh đúng",
    "category": "negative",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "BN cấp cứu đã thanh toán 1 dịch vụ CLS nhưng dịch vụ chưa thực hiện/bị hủy.",
    "steps": [
     "Billing: chọn dịch vụ CLS đã thu tiền nhưng cần hủy.",
     "Thực hiện hủy dịch vụ + tạo phiếu hoàn tiền.",
     "Kiểm tra tổng phải thu giảm đúng số tiền dịch vụ hủy.",
     "Kiểm tra sổ quỹ ghi nhận khoản hoàn (chiều âm).",
     "Xác nhận y lệnh CLS bị hủy không còn ở worklist LIS/PACS (hoặc đánh dấu hủy)."
    ],
    "expected": "Hoàn tiền điều chỉnh đúng tổng + sổ quỹ; không hoàn 2 lần (chống double-refund); y lệnh CLS hủy đồng bộ sang LIS/PACS; chứng từ hoàn có audit + lý do. Số liệu trước/sau khớp.",
    "evidence": [
     {
      "name": "TC-F-ED-013__s01__modal",
      "caption": "Hủy dịch vụ + tạo phiếu hoàn tiền",
      "uiState": "modal"
     },
     {
      "name": "TC-F-ED-013__s02__detail",
      "caption": "Tổng phải thu giảm đúng",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-013__s03__detail",
      "caption": "Sổ quỹ ghi khoản hoàn âm",
      "uiState": "detail"
     },
     {
      "name": "TC-F-ED-013__s04__list",
      "caption": "Y lệnh CLS hủy đồng bộ LIS/PACS",
      "uiState": "list"
     }
    ],
    "refIssues": [
     "#224"
    ],
    "notes": "Hoàn tiền liên phân hệ billing↔cls↔lis. Chống double-refund."
   },
   {
    "id": "TC-F-ED-014",
    "title": "Luồng phụ - LỖI giữa chừng: session hết hạn / mất mạng / refresh / double-submit khi đang nhập viện cấp cứu",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ + Thu ngân",
    "preconditions": "Đang ở giữa luồng cấp cứu (vd đang tạo bệnh án nội trú).",
    "steps": [
     "Bắt đầu tạo bệnh án nội trú, điền dở dang.",
     "Mô phỏng session JWT hết hạn → quan sát redirect login / thông báo, không mất dữ liệu im lặng.",
     "Đăng nhập lại → quay lại được trạng thái hợp lý.",
     "Double-submit nút 'Lưu nhập viện' nhanh 2 lần → chỉ tạo 1 bản ghi (idempotent).",
     "Refresh F5 giữa form chưa lưu → cảnh báo mất dữ liệu / khôi phục."
    ],
    "expected": "Session hết hạn xử lý duyên dáng (không crash, không lưu nửa vời); double-submit không tạo trùng bệnh án/giường; refresh không tạo bản ghi ma; không kẹt giường do submit lỗi. Lỗi mạng có thông báo + retry.",
    "evidence": [
     {
      "name": "TC-F-ED-014__s01__form",
      "caption": "Form nhập viện điền dở",
      "uiState": "form"
     },
     {
      "name": "TC-F-ED-014__s02__error",
      "caption": "Session hết hạn: thông báo/redirect",
      "uiState": "error"
     },
     {
      "name": "TC-F-ED-014__s03__confirm",
      "caption": "Double-submit chỉ tạo 1 bản ghi",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-ED-014__s04__toast",
      "caption": "Refresh: cảnh báo mất dữ liệu",
      "uiState": "toast"
     }
    ],
    "refIssues": [
     "#224"
    ],
    "notes": "Chi tiết hóa #224: session/network/double-submit/back-button giữa workflow."
   },
   {
    "id": "TC-F-ED-015",
    "title": "Validation - thao tác lệch thứ tự: cố nhập viện/kê đơn khi chưa tiếp nhận-xử trí; cố quyết toán khi chưa xuất viện",
    "category": "validation",
    "priority": "P1",
    "role": "Bác sĩ + Thu ngân",
    "preconditions": "Có visit cấp cứu ở trạng thái sớm (mới tiếp nhận, chưa xử trí).",
    "steps": [
     "Cố mở nhập viện cho BN chưa qua khám/xử trí → kỳ vọng bị chặn/cảnh báo.",
     "Cố kê đơn khi chưa mở bệnh án khám → bị chặn.",
     "Cố quyết toán/xuất viện khi BN còn dịch vụ chưa hoàn tất → cảnh báo còn khoản chưa xử lý.",
     "Bỏ trống trường bắt buộc (tên/CCCD/lý do cấp cứu) khi tiếp nhận → validation chặn.",
     "Nhập tuổi/sinh hiệu ngoài biên (âm, quá lớn) → validation chặn."
    ],
    "expected": "Mọi thao tác lệch thứ tự bị chặn với thông báo rõ; trường bắt buộc + biên giá trị validate cả FE và BE (không tin client); không cho quyết toán khi còn dịch vụ treo. Thông báo tiếng Việt có dấu.",
    "evidence": [
     {
      "name": "TC-F-ED-015__s01__validation",
      "caption": "Chặn nhập viện khi chưa xử trí",
      "uiState": "validation"
     },
     {
      "name": "TC-F-ED-015__s02__validation",
      "caption": "Chặn kê đơn khi chưa mở bệnh án",
      "uiState": "validation"
     },
     {
      "name": "TC-F-ED-015__s03__error",
      "caption": "Cảnh báo quyết toán khi còn dịch vụ treo",
      "uiState": "error"
     },
     {
      "name": "TC-F-ED-015__s04__validation",
      "caption": "Trường bắt buộc + biên giá trị tiếp nhận",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#224"
    ],
    "notes": "State-machine validation + field validation liên phân hệ."
   },
   {
    "id": "TC-F-ED-016",
    "title": "Permission: vai trò hạn chế (vd Thu ngân) không truy cập màn lâm sàng cấp cứu; điều dưỡng không quyết toán",
    "category": "permission",
    "priority": "P1",
    "role": "Thu ngân / Điều dưỡng (non-admin)",
    "preconditions": "Có user role Thu ngân + role Điều dưỡng (hoặc mô phỏng claims).",
    "steps": [
     "Đăng nhập vai Thu ngân: thử mở màn khám/xử trí cấp cứu OPD → kỳ vọng chặn/ẩn menu.",
     "Thử gọi trực tiếp route lâm sàng /v2/opd → chặn (redirect/403).",
     "Đăng nhập vai Điều dưỡng: thử quyết toán Billing → chặn.",
     "Kiểm tra menu TerminalLayout chỉ hiện phân hệ đúng quyền.",
     "Thử thao tác mutation không đủ quyền qua API → 403."
    ],
    "expected": "Phân quyền theo role nhất quán FE (ẩn menu/route guard) + BE (403); không bypass bằng gõ URL trực tiếp; mutation không đủ quyền bị BE từ chối. Không lộ dữ liệu lâm sàng cho vai tài chính.",
    "evidence": [
     {
      "name": "TC-F-ED-016__s01__permission",
      "caption": "Thu ngân bị chặn màn OPD cấp cứu",
      "uiState": "permission"
     },
     {
      "name": "TC-F-ED-016__s02__error",
      "caption": "Gõ URL /v2/opd trực tiếp bị chặn 403/redirect",
      "uiState": "error"
     },
     {
      "name": "TC-F-ED-016__s03__permission",
      "caption": "Điều dưỡng bị chặn quyết toán",
      "uiState": "permission"
     },
     {
      "name": "TC-F-ED-016__s04__list",
      "caption": "Menu chỉ hiện phân hệ đúng quyền",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-F-ED-017",
    "title": "Security: IDOR + anonymous + XSS xuyên phân hệ cấp cứu (xem hồ sơ BN khác, endpoint ẩn danh, chèn script)",
    "category": "security",
    "priority": "P0",
    "role": "Người dùng thường + kẻ tấn công mô phỏng",
    "preconditions": "Có 2 BN cấp cứu khác nhau (BN-1, BN-2) + token user role hạn chế.",
    "steps": [
     "Đăng nhập user thường, đổi ID trong URL/API để truy cập hồ sơ/bệnh án BN khác (IDOR) → kỳ vọng 403/không lộ.",
     "Gọi các endpoint mutation cấp cứu KHÔNG kèm JWT (anonymous) → 401, không thực thi.",
     "Thử endpoint ảnh/PACS với path traversal (../) → bị chặn (đã có guard #181).",
     "Nhập lý do cấp cứu/ghi chú chứa <script>/HTML → hiển thị escape, không thực thi XSS.",
     "Over-posting: gửi field Id/IsDeleted khi tạo bệnh án → server ép giá trị (đã fix #184)."
    ],
    "expected": "IDOR bị chặn (chỉ truy cập BN trong phạm vi quyền); endpoint mutation cần JWT (401 nếu thiếu); path-traversal ảnh chặn; input hiển thị an toàn (không XSS); over-posting bị server vô hiệu. Mọi truy cập trái phép ghi audit.",
    "evidence": [
     {
      "name": "TC-F-ED-017__s01__error",
      "caption": "IDOR xem hồ sơ BN khác bị 403",
      "uiState": "error"
     },
     {
      "name": "TC-F-ED-017__s02__error",
      "caption": "Endpoint cấp cứu ẩn danh trả 401",
      "uiState": "error"
     },
     {
      "name": "TC-F-ED-017__s03__error",
      "caption": "Path-traversal ảnh PACS bị chặn",
      "uiState": "error"
     },
     {
      "name": "TC-F-ED-017__s04__detail",
      "caption": "Input XSS hiển thị escape an toàn",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#224"
    ],
    "notes": "Bám fix bảo mật gần đây #181/#184. P0 vì dữ liệu BN cấp cứu nhạy cảm."
   },
   {
    "id": "TC-F-ED-018",
    "title": "UI/UX xuyên phân hệ cấp cứu: empty/loading/error + responsive + dark/light parity tại mỗi điểm chuyển màn",
    "category": "ui",
    "priority": "P2",
    "role": "Mọi vai",
    "preconditions": "Có cả trạng thái rỗng (chưa có visit cấp cứu) và có dữ liệu.",
    "steps": [
     "Reception/EmergencyDisaster khi chưa có BN cấp cứu → empty state đúng (không bảng trống vô nghĩa).",
     "Tải danh sách hàng đợi/worklist → loading skeleton/spinner, không nhấp nháy layout.",
     "Mô phỏng API lỗi (BE down) tại OPD/Billing → error state có nút thử lại, không màn trắng.",
     "Bật dark mode toggle: kiểm tra tương phản + màu trạng thái ưu tiên cấp cứu (crit đỏ) đọc được ở cả dark/light.",
     "Thu nhỏ viewport (tablet) → layout _v2kit/ab-* responsive, không vỡ bảng/drawer."
    ],
    "expected": "Mọi màn trong luồng có empty/loading/error rõ ràng; dark↔light parity (không chữ mất hút, badge ưu tiên đủ tương phản); responsive không vỡ; tiếng Việt có dấu hiển thị đúng. Trạng thái cấp cứu nổi bật trực quan.",
    "evidence": [
     {
      "name": "TC-F-ED-018__s01__empty",
      "caption": "Hàng đợi cấp cứu rỗng: empty state",
      "uiState": "empty"
     },
     {
      "name": "TC-F-ED-018__s02__loading",
      "caption": "Worklist loading skeleton",
      "uiState": "loading"
     },
     {
      "name": "TC-F-ED-018__s03__error",
      "caption": "API lỗi: error state có nút thử lại",
      "uiState": "error"
     },
     {
      "name": "TC-F-ED-018__s04__detail",
      "caption": "Dark mode: badge ưu tiên crit đủ tương phản",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#224"
    ],
    "notes": "UI states + dark/light + responsive tại mọi điểm chuyển màn của ed."
   }
  ],
  "gaps": [
   "data.js steps[] cho ed gồm 6 bước (reception/opd/cls/ipd×2/billing) nhưng desc nhắc thêm 'theo dõi → nội trú → xuất viện' và related[inpatient/surgery/blood]; đã suy ra các bước trung gian (lưu theo dõi, hậu phẫu, xuất viện) — cần xác nhận có màn/route v2 chuyên 'theo dõi cấp cứu' riêng hay dùng chung Inpatient/EmergencyDisaster.",
   "Chưa xác minh route /v2/* cụ thể cho từng phân hệ (App.tsx không liệt kê literal đủ); cần đối chiếu TerminalLayout menu + lazy routes để chốt path chính xác trước khi viết script E2E (Playwright/Cypress).",
   "Chưa xác minh BE có chặn THỰC SỰ thao tác lệch thứ tự state-machine (TC-015) và idempotent double-submit (TC-014) hay chỉ FE; cần đọc service nội trú/billing để biết kỳ vọng đúng (có thể là stub — theo memory 'B-items stub').",
   "Cross-match nhóm máu (TC-006) và chặn lĩnh sai nhóm: cần xác minh BloodBank backend có logic safety hay chỉ CRUD; nếu stub thì kỳ vọng test phải hạ xuống mức UI.",
   "Tích hợp HL7 LIS / Orthanc PACS / cổng BHXH / payment gateway phần lớn chạy MockMode ở dev (theo skill his-be-external-gateway/payment-gateway); cần xác nhận mock có mô phỏng callback/ack để assert outcome, nếu không thì TC-010/011 chỉ test tới ranh giới gửi.",
   "PrescriptionSafetyGuard.cs + seed 138 mới (uncommitted theo git status) — cần xác nhận đã wire vào luồng kê đơn cấp cứu thật trước khi assert chặn dị ứng/tương tác (TC-005).",
   "Cần seed dữ liệu dev ổn định (BN cấp cứu, BHYT hợp lệ, tồn kho thuốc/máu, giường trống) để E2E chạy lặp lại được — chưa có fixture chuyên cho luồng ed.",
   "refIssues chỉ map vào issue cha #217 (happy E2E) + #224 (luồng phụ/ngoại lệ) theo yêu cầu dedup; nếu phát hiện bug khi chạy phải tạo issue fix mới + liên kết 2 chiều (theo CLAUDE.md DoD task test)."
  ]
 },
 {
  "id": "inpatient",
  "code": "F-IPD",
  "ic": "🛏️",
  "layer": "clin",
  "nm": "Nội trú",
  "gh": [
   "#217",
   "#239",
   "#232"
  ],
  "flow_id": "inpatient",
  "summary": "Bộ test-task END-TO-END cho luồng \"Nội trú\" (id=inpatient), grounded từ FLOWS trong his-roadmap/assets/data.js (dòng 279-280): desc \"BN nội trú → nhập viện → tạm ứng → điều trị → quyết toán → xuất viện\"; steps[] = Nhập viện(ipd) → Tạm ứng(billing) → Điều trị/chăm sóc(ipd) → HSĐT/Ký số(emr) → Quyết toán(billing) → Xuất viện(ipd); related[] = surgery, blood, nutrition, infection. Mỗi bước map sang màn v2 thật đã xác minh trong App.tsx: /v2/ipd (Inpatient.tsx — 4 tab Sơ đồ giường/Danh sách BN/Y lệnh/Hội chẩn, AdmitModal admitFromOpd, DischargeModal dischargePatient/cancelDischarge/checkPreDischarge/print6556), /v2/inpatient-dispensing (y lệnh + cấp phát thuốc nội trú), /v2/billing (deposit createDeposit/getDepositBalance + quyết toán + print 6556), /v2/emr + /v2/signing-workflow + /v2/central-signing (HSĐT/ký số), /v2/insurance + /v2/bhxh-audit (BHYT/XML BHXH), /v2/blood-bank /v2/nutrition /v2/infection-control /v2/surgery (related). 16 task tập trung happy-path E2E xuyên màn, data-consistency liên phân hệ (tạm ứng A → trừ dần khi điều trị B → quyết toán cân đối C), state-transition liên phân hệ (giường Trống→Có BN→Trống; BN Đang điều trị→Đã xuất viện; HSĐT Draft→Ký→Khóa), luồng phụ/ngoại lệ (hủy ra viện, vượt tạm ứng, chuyển viện, tử vong, trốn viện), integration (HL7 LIS, DICOM PACS, XML BHXH, SignalR, payment QR), security (IDOR admissionId, anonymous, XSS). Evidence chụp tại mọi điểm chuyển màn. DEDUP: chi tiết hóa #217 (parent E2E happy-path), #239 (E2E Lâm sàng nội trú nhập→điều trị→xuất), #232 (E2E Tài chính tạm ứng→trừ dần→quyết toán) — KHÔNG tạo trùng, mọi task refIssues về 3 issue này.",
  "tasks": [
   {
    "id": "TC-F-IPD-001",
    "title": "E2E happy-path xuyên màn: Nhập viện → Tạm ứng → Điều trị → HSĐT/Ký số → Quyết toán → Xuất viện",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ + Điều dưỡng + Thu ngân (admin/Admin@123)",
    "preconditions": "BE localhost:5106 + FE /v2 chạy; có ≥1 HSBA chờ nhập viện (pending admission từ OPD); seed dev ổn định; có khoa nội trú với giường trống (status=1) trong Sơ đồ giường.",
    "steps": [
     "Login admin → vào /v2/ipd, tab 'Sơ đồ giường', chọn 1 giường Trống → 'Nhập viện vào giường này' (AdmitModal prefill departmentId/roomId/bedId).",
     "Nhập mã HSBA hợp lệ, chọn khoa, mã phòng, mã BS điều trị, loại nhập viện=2 (Chuyển từ OPD), chẩn đoán vào viện → 'Nhập viện' (admitFromOpd) → toast 'Đã nhập viện thành công'.",
     "Sang /v2/billing → tạo tạm ứng (createDeposit, depositType=2 Nội trú) số tiền 2.000.000đ cho BN vừa nhập → in biên lai; ghi nhận số dư tạm ứng.",
     "Quay /v2/inpatient-dispensing → tạo y lệnh thuốc + dịch vụ điều trị cho BN → cấp phát; ghi nhận chi phí phát sinh.",
     "Sang /v2/emr (hoặc EmrEditor) → hoàn tất tờ điều trị/tổng kết bệnh án → /v2/signing-workflow ký số tài liệu.",
     "Quay /v2/billing → quyết toán: tổng chi phí = thuốc + dịch vụ + giường; áp BHYT; số phải thu = tổng - tạm ứng đã trừ; thanh toán phần còn lại → phát hành biên lai/HĐĐT.",
     "Vào /v2/ipd tab 'Danh sách BN' → mở chi tiết BN → DischargeModal: checkPreDischarge không còn mục chặn → loại=1 Ra viện, tình trạng=1 Khỏi, chẩn đoán ra viện → 'Ra viện' (dischargePatient) → in giấy ra viện.",
     "Quay tab 'Sơ đồ giường' → xác nhận giường trở lại Trống; BN chuyển trạng thái 'Đã xuất viện'."
    ],
    "expected": "Chuỗi 6 bước hoàn tất không lỗi; outcome ĐÚNG ở từng điểm: BN xuất hiện ở Danh sách BN sau nhập viện; số dư tạm ứng = 2.000.000đ; chi phí điều trị cộng dồn đúng; HSĐT có chữ ký số; quyết toán: phải thu = tổng chi phí (sau BHYT) - tạm ứng (không âm); sau ra viện giường=Trống + BN=Đã xuất viện. Mọi mutation ghi audit log.",
    "refIssues": [
     "#217",
     "#239",
     "#232"
    ],
    "notes": "Đây là spine E2E; assert OUTCOME (số tiền/trạng thái/bản ghi) không chỉ no-console-error. Bám steps[] FLOWS inpatient.",
    "evidence": [
     {
      "name": "TC-F-IPD-001__s01__list",
      "caption": "Sơ đồ giường: giường Trống trước nhập viện",
      "uiState": "list"
     },
     {
      "name": "TC-F-IPD-001__s02__modal",
      "caption": "AdmitModal điền đủ thông tin nhập viện",
      "uiState": "modal"
     },
     {
      "name": "TC-F-IPD-001__s03__success",
      "caption": "Toast nhập viện thành công + BN vào Danh sách BN",
      "uiState": "success"
     },
     {
      "name": "TC-F-IPD-001__s04__form",
      "caption": "Billing: tạo tạm ứng 2.000.000đ nội trú",
      "uiState": "form"
     },
     {
      "name": "TC-F-IPD-001__s05__detail",
      "caption": "Inpatient-dispensing: y lệnh thuốc + dịch vụ",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-001__s06__detail",
      "caption": "EMR + ký số tờ tổng kết bệnh án",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-001__s07__detail",
      "caption": "Billing quyết toán: phải thu = tổng - tạm ứng",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-001__s08__modal",
      "caption": "DischargeModal ra viện loại Khỏi",
      "uiState": "modal"
     },
     {
      "name": "TC-F-IPD-001__s09__list",
      "caption": "Sau ra viện: giường Trống + BN Đã xuất viện",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-F-IPD-002",
    "title": "Data-consistency liên phân hệ: tạm ứng (Billing) → trừ dần khi điều trị (IPD) → cân đối khi quyết toán",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Thu ngân + Bác sĩ",
    "preconditions": "BN đang điều trị nội trú; đã nạp tạm ứng ban đầu 1.000.000đ (createDeposit).",
    "steps": [
     "/v2/billing → kiểm tra số dư tạm ứng BN (getDepositBalance) = 1.000.000đ (giá trị A).",
     "/v2/inpatient-dispensing → tạo thêm y lệnh thuốc + dịch vụ tổng 600.000đ → cấp phát (giá trị B chi phí phát sinh).",
     "Quay /v2/billing → mở bảng kê chi phí BN: tổng chi phí hiển thị = 600.000đ; số dư tạm ứng còn lại = 400.000đ (C = A - B).",
     "Tạo thêm chi phí 500.000đ → tổng = 1.100.000đ > tạm ứng → hệ thống cảnh báo vượt tạm ứng (exceedsDeposit=true, depositRemaining âm).",
     "Nạp thêm tạm ứng 700.000đ → số dư cập nhật = 1.100.000đ; quyết toán → phải thu = 0 (đã đủ tạm ứng)."
    ],
    "expected": "Số liệu liên hoàn nhất quán: B (chi phí IPD) trừ đúng vào A (tạm ứng Billing) ra C; cờ exceedsDeposit/depositRemaining đúng dấu; sau nạp bù quyết toán cân bằng. Không lệch tiền giữa màn IPD và Billing.",
    "refIssues": [
     "#232",
     "#217"
    ],
    "notes": "Mô hình tạo A → hiện B → tính C xuyên IPD↔Billing. Verify depositRemaining/exceedsDeposit (inpatient.ts dòng 505-506).",
    "evidence": [
     {
      "name": "TC-F-IPD-002__s01__detail",
      "caption": "Số dư tạm ứng ban đầu A=1.000.000đ",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-002__s02__form",
      "caption": "Tạo chi phí điều trị B=600.000đ",
      "uiState": "form"
     },
     {
      "name": "TC-F-IPD-002__s03__detail",
      "caption": "Số dư còn lại C=400.000đ sau trừ",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-002__s04__error",
      "caption": "Cảnh báo vượt tạm ứng (depositRemaining âm)",
      "uiState": "error"
     },
     {
      "name": "TC-F-IPD-002__s05__success",
      "caption": "Nạp bù → quyết toán phải thu = 0",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-IPD-003",
    "title": "State-transition giường liên màn: Trống → Có bệnh nhân (nhập viện) → Trống (ra viện)",
    "category": "state",
    "priority": "P0",
    "role": "Điều dưỡng",
    "preconditions": "Khoa nội trú có giường status=1 (Trống) hiển thị Sơ đồ giường /v2/ipd.",
    "steps": [
     "/v2/ipd Sơ đồ giường → xác định 1 giường Trống (bedTone xám, status=1).",
     "Nhập viện BN vào giường đó (AdmitModal) → reload → giường chuyển status=2 'Có bệnh nhân' (tone cyan), hiển thị tên BN trên card.",
     "Mở chi tiết BN → ra viện (dischargePatient) → reload Sơ đồ giường → giường về status=1 Trống, không còn tên BN.",
     "Thử nhập viện vào giường đang status=3 'Bảo trì' → hệ thống không cho / cảnh báo."
    ],
    "expected": "Vòng đời giường chuyển đúng 1↔2 theo nhập/ra viện; giường Bảo trì (3) không nhận BN. BedLayoutDto.status đồng bộ giữa nhập viện (IPD) và ra viện (IPD).",
    "refIssues": [
     "#239",
     "#217"
    ],
    "notes": "BED_STATUS verify Inpatient.tsx dòng 35-39. Filter theo status để xác nhận trạng thái sau mỗi bước.",
    "evidence": [
     {
      "name": "TC-F-IPD-003__s01__list",
      "caption": "Giường Trống (status=1) trước nhập",
      "uiState": "list"
     },
     {
      "name": "TC-F-IPD-003__s02__list",
      "caption": "Giường Có BN (status=2) sau nhập viện",
      "uiState": "list"
     },
     {
      "name": "TC-F-IPD-003__s03__list",
      "caption": "Giường về Trống sau ra viện",
      "uiState": "list"
     },
     {
      "name": "TC-F-IPD-003__s04__error",
      "caption": "Chặn nhập viện vào giường Bảo trì",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-IPD-004",
    "title": "State-transition bệnh án + ký số liên màn: HSĐT Draft → Ký số (signing) → Khóa hồ sơ (discharge)",
    "category": "state",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "BN nội trú có tờ điều trị/tổng kết bệnh án ở /v2/emr.",
    "steps": [
     "/v2/emr → mở tài liệu HSĐT của BN ở trạng thái Draft (chưa ký).",
     "/v2/signing-workflow (hoặc /v2/central-signing) → ký số tài liệu → trạng thái chuyển 'Đã ký'.",
     "Thử sửa nội dung tài liệu đã ký → hệ thống chặn / yêu cầu hủy chữ ký trước.",
     "Ra viện BN (DischargeModal) → checkPreDischarge xác nhận HSĐT đã ký không còn cảnh báo → khóa hồ sơ; tài liệu sau khóa không cho sửa."
    ],
    "expected": "HSĐT đi đúng Draft→Đã ký→Khóa; chữ ký số chặn sửa nội dung; pre-discharge phản ánh đúng tình trạng ký. Ra viện không thành công nếu HSĐT bắt buộc chưa ký (xem checkPreDischarge).",
    "refIssues": [
     "#239",
     "#217"
    ],
    "notes": "DischargeModal checkPreDischarge verify (DischargeModal.tsx dòng 25-28). Liên kết EMR↔Signing↔IPD discharge.",
    "evidence": [
     {
      "name": "TC-F-IPD-004__s01__detail",
      "caption": "HSĐT trạng thái Draft chưa ký",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-004__s02__success",
      "caption": "Ký số thành công, tài liệu Đã ký",
      "uiState": "success"
     },
     {
      "name": "TC-F-IPD-004__s03__error",
      "caption": "Chặn sửa tài liệu đã ký",
      "uiState": "error"
     },
     {
      "name": "TC-F-IPD-004__s04__confirm",
      "caption": "Pre-discharge xác nhận HSĐT đã ký",
      "uiState": "confirm"
     }
    ]
   },
   {
    "id": "TC-F-IPD-005",
    "title": "Luồng phụ — Hủy ra viện (cancelDischarge): ra viện nhầm → hủy → BN trở lại đang điều trị",
    "category": "negative",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "BN vừa được ra viện (dischargePatient) trong ngày, giường đã giải phóng.",
    "steps": [
     "/v2/ipd Danh sách BN → lọc trạng thái 'Đã xuất viện' → mở BN vừa ra viện.",
     "DischargeModal → 'Hủy ra viện' (cancelDischarge) → xác nhận.",
     "Reload → BN trở lại trạng thái 'Đang điều trị'; nếu giường cũ còn trống thì BN nhận lại giường, ngược lại cảnh báo cần gán giường mới.",
     "Kiểm tra audit log ghi nhận hành động hủy ra viện."
    ],
    "expected": "cancelDischarge đảo trạng thái BN về Đang điều trị, đồng bộ lại giường; data nhất quán giữa IPD list ↔ Sơ đồ giường; audit ghi mutation. Không phát sinh BN 'ma' chiếm 2 giường.",
    "refIssues": [
     "#239"
    ],
    "notes": "cancelDischarge verify DischargeModal.tsx dòng 25. Edge: giường cũ đã bị BN khác chiếm.",
    "evidence": [
     {
      "name": "TC-F-IPD-005__s01__filter",
      "caption": "Lọc BN Đã xuất viện",
      "uiState": "filter"
     },
     {
      "name": "TC-F-IPD-005__s02__confirm",
      "caption": "Xác nhận hủy ra viện",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-IPD-005__s03__success",
      "caption": "BN trở lại Đang điều trị",
      "uiState": "success"
     },
     {
      "name": "TC-F-IPD-005__s04__error",
      "caption": "Cảnh báo giường cũ đã bị chiếm",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-IPD-006",
    "title": "Luồng phụ — Chuyển viện (DischargeType=2): tổng kết + in giấy chuyển viện + nộp dữ liệu",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "BN nội trú đủ điều kiện chuyển tuyến.",
    "steps": [
     "/v2/ipd → DischargeModal cho BN → chọn loại ra viện = 2 'Chuyển viện'.",
     "Form hiện thêm cụm chuyển viện (bệnh viện đến, lý do, phương tiện) — nhập đầy đủ.",
     "Lưu (dischargePatient với ReferralCertificateDto) → in giấy chuyển viện (printReferralCertificate).",
     "Kiểm tra trạng thái BN = 'Đã chuyển' (ipStatusKey transferred) + giường giải phóng."
    ],
    "expected": "Khi loại=Chuyển viện form bắt buộc thông tin tuyến đến; in được giấy chuyển viện; BN trạng thái Đã chuyển; giường Trống. Khác với Ra viện thường (loại=1).",
    "refIssues": [
     "#239"
    ],
    "notes": "DISCHARGE_TYPES + printReferralCertificate + ReferralCertificateDto verify DischargeModal.tsx. ipStatusKey transferred=1 (Inpatient.tsx dòng 50-52).",
    "evidence": [
     {
      "name": "TC-F-IPD-006__s01__modal",
      "caption": "Chọn loại Chuyển viện hiện cụm tuyến đến",
      "uiState": "modal"
     },
     {
      "name": "TC-F-IPD-006__s02__validation",
      "caption": "Validation bắt buộc thông tin chuyển viện",
      "uiState": "validation"
     },
     {
      "name": "TC-F-IPD-006__s03__success",
      "caption": "In giấy chuyển viện + BN Đã chuyển",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-IPD-007",
    "title": "Luồng phụ — Tử vong (DischargeType=4) ép tình trạng=Tử vong + xử lý quyết toán đặc thù",
    "category": "edge",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "BN nội trú tình huống tử vong.",
    "steps": [
     "/v2/ipd → DischargeModal → loại=4 'Tử vong'.",
     "Xác nhận tình trạng ra viện tự động/bắt buộc = 5 'Tử vong' (DISCHARGE_CONDITIONS).",
     "Lưu → BN kết thúc điều trị; giường giải phóng; chuyển sang quyết toán cuối.",
     "/v2/billing → quyết toán hồ sơ tử vong: kiểm tra chi phí chốt, không cho phát sinh thêm y lệnh."
    ],
    "expected": "Loại Tử vong ràng buộc tình trạng=Tử vong; sau khi chốt không cho thêm y lệnh; quyết toán đóng hồ sơ. Audit ghi rõ. Nghiệp vụ nhạy cảm — assert ràng buộc enum.",
    "refIssues": [
     "#239",
     "#232"
    ],
    "notes": "DischargeType 4=Tử vong, Condition 5=Tử vong (DischargeModal.tsx dòng 11-13). Boundary giữa loại và tình trạng.",
    "evidence": [
     {
      "name": "TC-F-IPD-007__s01__modal",
      "caption": "Chọn loại Tử vong",
      "uiState": "modal"
     },
     {
      "name": "TC-F-IPD-007__s02__validation",
      "caption": "Tình trạng ép = Tử vong",
      "uiState": "validation"
     },
     {
      "name": "TC-F-IPD-007__s03__error",
      "caption": "Chặn thêm y lệnh sau chốt hồ sơ tử vong",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-IPD-008",
    "title": "Negative — Ra viện khi còn mục chưa hoàn tất (pre-discharge chặn): nợ viện phí / đơn chưa duyệt / CLS chưa trả",
    "category": "negative",
    "priority": "P0",
    "role": "Bác sĩ + Thu ngân",
    "preconditions": "BN nội trú còn nợ tạm ứng (chi phí > tạm ứng) HOẶC còn CLS chưa trả kết quả HOẶC HSĐT chưa ký.",
    "steps": [
     "/v2/ipd → mở DischargeModal cho BN → checkPreDischarge hiển thị danh sách mục chặn (nợ phí, CLS chờ, chưa ký).",
     "Thử 'Ra viện' khi còn mục chặn → hệ thống không cho hoặc cảnh báo rõ.",
     "Sang /v2/billing thanh toán hết nợ → quay lại → bớt 1 mục chặn.",
     "Hoàn tất các mục còn lại (trả CLS, ký HSĐT) → checkPreDischarge sạch → ra viện thành công."
    ],
    "expected": "Pre-discharge phản ánh đúng các điều kiện chưa đủ; chặn ra viện đến khi sạch; mỗi lần xử lý 1 điều kiện thì danh sách chặn giảm tương ứng (data-consistency Billing/LIS/EMR ↔ IPD).",
    "refIssues": [
     "#239",
     "#232",
     "#217"
    ],
    "notes": "PreDischargeCheckDto verify DischargeModal.tsx dòng 25,30. Phủ luồng discharge (FLOW step 'Kiểm tra nợ/đơn/CLS').",
    "evidence": [
     {
      "name": "TC-F-IPD-008__s01__modal",
      "caption": "Pre-discharge liệt kê mục chưa hoàn tất",
      "uiState": "modal"
     },
     {
      "name": "TC-F-IPD-008__s02__error",
      "caption": "Chặn ra viện khi còn nợ/CLS",
      "uiState": "error"
     },
     {
      "name": "TC-F-IPD-008__s03__detail",
      "caption": "Sau thanh toán nợ — bớt mục chặn",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-008__s04__success",
      "caption": "Pre-discharge sạch → ra viện OK",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-IPD-009",
    "title": "Patient-safety — y lệnh thuốc nội trú kiểm dị ứng / tương tác / liều: cảnh báo chặn khi kê đơn ở khoa",
    "category": "validation",
    "priority": "P0",
    "role": "Bác sĩ điều trị",
    "preconditions": "BN nội trú có khai báo dị ứng thuốc; có cặp thuốc tương tác nghiêm trọng trong danh mục (seed 138_seed_drug_interactions_severe.sql).",
    "steps": [
     "/v2/inpatient-dispensing → kê đơn nội trú cho BN (InpatientPrescriptionModal) chọn thuốc trùng nhóm BN dị ứng → cảnh báo dị ứng.",
     "Kê 2 thuốc tương tác nghiêm trọng → cảnh báo tương tác (PrescriptionSafetyGuard).",
     "Nhập liều vượt ngưỡng → cảnh báo liều.",
     "Ép lưu khi có cảnh báo nghiêm trọng → hệ thống chặn / yêu cầu lý do override; ghi audit."
    ],
    "expected": "Guard dị ứng/tương tác/liều hoạt động đúng khi kê đơn TRONG khoa nội trú (không chỉ OPD); cảnh báo nghiêm trọng chặn lưu hoặc bắt nhập lý do; audit ghi override. Bảo vệ bệnh nhân.",
    "refIssues": [
     "#239"
    ],
    "notes": "InpatientPrescriptionModal (pages-v2/inpatient/) + PrescriptionSafetyGuard.cs (backend mới). Patient-safety: di ứng/tương tác.",
    "evidence": [
     {
      "name": "TC-F-IPD-009__s01__modal",
      "caption": "Kê đơn nội trú modal",
      "uiState": "modal"
     },
     {
      "name": "TC-F-IPD-009__s02__error",
      "caption": "Cảnh báo dị ứng thuốc",
      "uiState": "error"
     },
     {
      "name": "TC-F-IPD-009__s03__error",
      "caption": "Cảnh báo tương tác nghiêm trọng",
      "uiState": "error"
     },
     {
      "name": "TC-F-IPD-009__s04__confirm",
      "caption": "Yêu cầu lý do override khi ép lưu",
      "uiState": "confirm"
     }
    ]
   },
   {
    "id": "TC-F-IPD-010",
    "title": "Integration — Truyền máu (blood) trong điều trị nội trú: đối chiếu nhóm máu trước truyền (patient-safety)",
    "category": "integration",
    "priority": "P1",
    "role": "Điều dưỡng + Bác sĩ",
    "preconditions": "BN nội trú có chỉ định truyền máu; ngân hàng máu /v2/blood-bank có chế phẩm.",
    "steps": [
     "/v2/ipd → chỉ định truyền máu cho BN → chuyển sang /v2/blood-bank lĩnh máu.",
     "Đối chiếu nhóm máu BN ↔ chế phẩm: chọn chế phẩm KHÁC nhóm → hệ thống chặn (an toàn truyền máu).",
     "Chọn đúng nhóm tương thích → xác nhận truyền.",
     "Quay /v2/ipd → mục truyền máu hiển thị trong theo dõi điều trị (TreatmentMonitorSection); chi phí cộng vào bảng kê."
    ],
    "expected": "Đối chiếu nhóm máu chặn truyền sai nhóm (patient-safety nhóm máu); truyền đúng nhóm thành công; bản ghi truyền máu liên kết về hồ sơ nội trú + chi phí. related[] blood của FLOW inpatient.",
    "refIssues": [
     "#239",
     "#217"
    ],
    "notes": "FLOW inpatient related[]=blood; BloodBank.tsx + TreatmentMonitorSection. Patient-safety nhóm máu.",
    "evidence": [
     {
      "name": "TC-F-IPD-010__s01__detail",
      "caption": "Chỉ định truyền máu từ IPD",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-010__s02__error",
      "caption": "Chặn truyền khi sai nhóm máu",
      "uiState": "error"
     },
     {
      "name": "TC-F-IPD-010__s03__success",
      "caption": "Truyền đúng nhóm xác nhận",
      "uiState": "success"
     },
     {
      "name": "TC-F-IPD-010__s04__tab",
      "caption": "Theo dõi truyền máu trong điều trị IPD",
      "uiState": "tab"
     }
    ]
   },
   {
    "id": "TC-F-IPD-011",
    "title": "Integration — CLS nội trú: chỉ định XN (HL7 LIS) + CĐHA (DICOM PACS Orthanc) trả về hồ sơ điều trị",
    "category": "integration",
    "priority": "P1",
    "role": "Bác sĩ + Điều dưỡng",
    "preconditions": "BN nội trú; LIS + Orthanc PACS cấu hình; SignalR realtime bật.",
    "steps": [
     "/v2/inpatient-dispensing → chỉ định XN máu cho BN → kết quả về qua HL7 LIS → hiển thị trong BedLabResultSection (/v2/ipd).",
     "Chỉ định CĐHA → ảnh DICOM về PACS → mở DicomViewer xem ảnh của BN nội trú.",
     "Kiểm tra SignalR đẩy thông báo realtime khi có KQ mới (không cần reload thủ công).",
     "Bác sĩ đọc KQ → cập nhật chẩn đoán điều trị; KQ liên kết đúng admissionId."
    ],
    "expected": "KQ XN (HL7) + ảnh CĐHA (DICOM) trả đúng về hồ sơ nội trú của BN; SignalR đẩy realtime; không lẫn KQ giữa các BN. BedLabResultSection hiển thị KQ thật.",
    "refIssues": [
     "#239"
    ],
    "notes": "BedLabResultSection.tsx (pages-v2/inpatient/) + DicomViewer + SignalR. Integration HL7/DICOM/SignalR.",
    "evidence": [
     {
      "name": "TC-F-IPD-011__s01__detail",
      "caption": "Chỉ định XN/CĐHA cho BN nội trú",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-011__s02__tab",
      "caption": "KQ XN HL7 trong BedLabResultSection",
      "uiState": "tab"
     },
     {
      "name": "TC-F-IPD-011__s03__detail",
      "caption": "Ảnh DICOM PACS của BN nội trú",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-011__s04__toast",
      "caption": "SignalR đẩy thông báo KQ mới realtime",
      "uiState": "toast"
     }
    ]
   },
   {
    "id": "TC-F-IPD-012",
    "title": "Integration — Quyết toán BHYT + nộp XML BHXH: in bảng kê 6556 + áp BHYT cuối đợt điều trị",
    "category": "integration",
    "priority": "P1",
    "role": "Thu ngân + Giám định BHYT",
    "preconditions": "BN nội trú có thẻ BHYT hợp lệ; đã hoàn tất điều trị, chuẩn bị quyết toán.",
    "steps": [
     "/v2/billing → quyết toán BN: áp BHYT → chia phần BHYT chi trả / BN cùng chi trả.",
     "In bảng kê chi phí 6556 (print6556Statement / printBillingStatement6556).",
     "/v2/insurance giám định → /v2/bhxh-audit kiểm tra → tạo file XML BHXH hồ sơ nội trú.",
     "Nộp XML BHXH (giả lập gateway) → trạng thái Submitted; kiểm tra số tiền XML khớp bảng kê 6556."
    ],
    "expected": "Áp BHYT đúng tỷ lệ; bảng kê 6556 in đúng số liệu; XML BHXH sinh đúng định dạng + số tiền khớp quyết toán; trạng thái nộp Submitted. related FLOW billing→insurance→national.",
    "refIssues": [
     "#232",
     "#217"
    ],
    "notes": "print6556Statement (billing.ts dòng 1316), printBillingStatement6556 (DischargeModal). Insurance.tsx + BhxhAudit.tsx. Integration XML BHXH.",
    "evidence": [
     {
      "name": "TC-F-IPD-012__s01__detail",
      "caption": "Quyết toán áp BHYT cuối đợt",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-012__s02__success",
      "caption": "In bảng kê 6556",
      "uiState": "success"
     },
     {
      "name": "TC-F-IPD-012__s03__detail",
      "caption": "Tạo XML BHXH hồ sơ nội trú",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-012__s04__success",
      "caption": "Nộp XML BHXH — Submitted, số khớp 6556",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-IPD-013",
    "title": "Integration — Thanh toán online QR/bank phần BN cùng chi trả khi quyết toán nội trú",
    "category": "integration",
    "priority": "P2",
    "role": "Thu ngân + BN",
    "preconditions": "Quyết toán nội trú còn phần BN phải trả; cổng thanh toán/VietQR cấu hình (MockMode dev).",
    "steps": [
     "/v2/billing quyết toán → phần BN cùng chi trả 350.000đ → chọn thanh toán QR (VietQR/Napas).",
     "Sinh mã QR (PaymentGatewayService) → /v2/bank-payments theo dõi giao dịch.",
     "Giả lập IPN/callback thanh toán thành công → biên lai phát hành; trạng thái giao dịch Paid.",
     "Đối soát /v2/payment-transactions: giao dịch khớp số tiền + liên kết đúng hồ sơ BN."
    ],
    "expected": "QR sinh đúng số tiền; callback chuyển trạng thái Paid; biên lai/HĐĐT phát hành; đối soát khớp. Không double-charge khi callback lặp (idempotency).",
    "refIssues": [
     "#232"
    ],
    "notes": "BankPayments.tsx + PaymentTransactions.tsx. Integration payment. Edge: callback trùng → idempotent.",
    "evidence": [
     {
      "name": "TC-F-IPD-013__s01__modal",
      "caption": "Chọn thanh toán QR phần cùng chi trả",
      "uiState": "modal"
     },
     {
      "name": "TC-F-IPD-013__s02__detail",
      "caption": "Mã QR VietQR sinh ra",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-013__s03__success",
      "caption": "Callback Paid + phát hành biên lai",
      "uiState": "success"
     },
     {
      "name": "TC-F-IPD-013__s04__list",
      "caption": "Đối soát giao dịch khớp hồ sơ",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-F-IPD-014",
    "title": "UI states màn Nội trú: empty / loading / error / responsive / dark mode + tiếng Việt có dấu",
    "category": "ui",
    "priority": "P2",
    "role": "Người dùng bất kỳ",
    "preconditions": "FE /v2/ipd; có thể mô phỏng API lỗi/chậm/rỗng.",
    "steps": [
     "/v2/ipd khi không có giường/BN nào → trạng thái empty của Sơ đồ giường + Danh sách BN.",
     "Throttle mạng → trạng thái loading (skeleton/spinner) khi getWardLayout + getInpatientList.",
     "Mô phỏng API 500 → trạng thái error có thông báo, không crash trắng trang.",
     "Bật dark mode (toggle) → kiểm tra tương phản KpiStrip/DataTable/Modal; tiếng Việt có dấu hiển thị đúng (không vỡ font).",
     "Thu nhỏ viewport (responsive) → grid giường + bảng co giãn hợp lý."
    ],
    "expected": "Đủ 4 trạng thái empty/loading/error + dark mode tương phản đạt + responsive không tràn; tiếng Việt có dấu render đúng mọi nơi (label, tên BN, chẩn đoán).",
    "refIssues": [
     "#239"
    ],
    "notes": "Inpatient.tsx có loading/empty branch; _v2kit components. UI: empty/loading/error/responsive/dark.",
    "evidence": [
     {
      "name": "TC-F-IPD-014__s01__empty",
      "caption": "Sơ đồ giường rỗng",
      "uiState": "empty"
     },
     {
      "name": "TC-F-IPD-014__s02__loading",
      "caption": "Loading khi tải ward/list",
      "uiState": "loading"
     },
     {
      "name": "TC-F-IPD-014__s03__error",
      "caption": "Lỗi API 500 có thông báo",
      "uiState": "error"
     },
     {
      "name": "TC-F-IPD-014__s04__detail",
      "caption": "Dark mode tương phản + tiếng Việt có dấu",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-014__s05__list",
      "caption": "Responsive thu nhỏ viewport",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-F-IPD-015",
    "title": "Security — IDOR admissionId/medicalRecordId + anonymous + XSS trên màn Nội trú",
    "category": "security",
    "priority": "P0",
    "role": "Kẻ tấn công / user thấp quyền",
    "preconditions": "2 BN nội trú thuộc 2 khoa khác nhau; 1 token user quyền thấp; admin token.",
    "steps": [
     "Đăng nhập user quyền thấp → gọi trực tiếp API discharge/deposit với admissionId của BN khoa khác (IDOR) → phải bị chặn 403/404.",
     "Không token → gọi getInpatientDetail/dischargePatient → phải 401, không lộ dữ liệu BN.",
     "Nhập chuỗi XSS (vd <script>) vào chẩn đoán/lời dặn ra viện → lưu → mở lại + in giấy ra viện → script KHÔNG thực thi (escaped).",
     "Thử truyền medicalRecordId định dạng bất thường/path vào AdmitModal → validate server, không 500/path-traversal."
    ],
    "expected": "IDOR bị chặn (không thao tác hồ sơ BN khoa khác); anonymous bị 401; XSS bị escape khi hiển thị + in; input bất thường bị validate. Mọi mutation ghi audit. Không lộ thông tin BN.",
    "refIssues": [
     "#239",
     "#217"
    ],
    "notes": "Patient-safety + privacy. Tham chiếu fix over-posting #184 (force server Id). Security: IDOR/anonymous/XSS.",
    "evidence": [
     {
      "name": "TC-F-IPD-015__s01__permission",
      "caption": "IDOR discharge BN khoa khác bị 403",
      "uiState": "permission"
     },
     {
      "name": "TC-F-IPD-015__s02__error",
      "caption": "Anonymous gọi API IPD bị 401",
      "uiState": "error"
     },
     {
      "name": "TC-F-IPD-015__s03__detail",
      "caption": "XSS trong chẩn đoán bị escape khi hiển thị/in",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-015__s04__validation",
      "caption": "Validate medicalRecordId bất thường",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-F-IPD-016",
    "title": "Permission/Role — phân quyền thao tác nội trú: Điều dưỡng vs Bác sĩ vs Thu ngân",
    "category": "permission",
    "priority": "P1",
    "role": "Điều dưỡng · Bác sĩ · Thu ngân",
    "preconditions": "3 tài khoản tương ứng vai trò (roles FLOW inpatient = Bác sĩ, Điều dưỡng; billing = Thu ngân, Giám định BHYT).",
    "steps": [
     "Login Điều dưỡng → /v2/ipd: được nhập viện/theo dõi nhưng KHÔNG được ra viện/ký bệnh án (nút ẩn/disabled).",
     "Login Bác sĩ → được ra viện + ký HSĐT; được kê y lệnh.",
     "Login Thu ngân → /v2/billing được tạo tạm ứng/quyết toán nhưng KHÔNG được kê y lệnh/ra viện.",
     "Mỗi vai trò thử thao tác ngoài quyền qua URL trực tiếp → bị chặn (404/403 hoặc ẩn route)."
    ],
    "expected": "Nút và route hiển thị theo vai trò; thao tác ngoài quyền bị chặn cả ở UI lẫn API; không leo thang quyền qua truy cập URL trực tiếp.",
    "refIssues": [
     "#239",
     "#232"
    ],
    "notes": "roles từ data.js dòng 196 (Bác sĩ, Điều dưỡng) + billing (Thu ngân, Giám định BHYT). Permission state.",
    "evidence": [
     {
      "name": "TC-F-IPD-016__s01__permission",
      "caption": "Điều dưỡng: nút ra viện/ký bị ẩn",
      "uiState": "permission"
     },
     {
      "name": "TC-F-IPD-016__s02__detail",
      "caption": "Bác sĩ: đủ quyền ra viện + ký",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IPD-016__s03__permission",
      "caption": "Thu ngân: không kê y lệnh được",
      "uiState": "permission"
     },
     {
      "name": "TC-F-IPD-016__s04__error",
      "caption": "Truy cập URL ngoài quyền bị chặn",
      "uiState": "error"
     }
    ]
   }
  ],
  "gaps": [
   "Chưa xác minh sâu component InpatientServiceOrderCreateModal / TreatmentMonitorSection / ConsultationSection ở mức field-level — TC y lệnh/điều trị (002,009,010,011) mô tả ở mức nghiệp vụ; cần đọc thêm các file pages-v2/inpatient/*.tsx + api/inpatient.ts (dòng 366-1060 DepositRequestDto/Bill) để chốt tên trường khi viết script E2E.",
   "Chưa xác nhận BE có endpoint áp BHYT + sinh XML BHXH cho hồ sơ NỘI TRÚ riêng (mới thấy print 6556 + Insurance/BhxhAudit page); TC-F-IPD-012 cần verify InsuranceController/national gateway thực sự xử lý hồ sơ nội trú hay chỉ ngoại trú trước khi assert số khớp.",
   "SignalR realtime cho KQ CLS nội trú (TC-011) chưa truy ngược tới Hub cụ thể — cần xác minh Hub + sự kiện push KQ XN/CĐHA (his-fs-realtime-signalr) để test realtime đúng kênh, tránh false-pass.",
   "Cờ exceedsDeposit/depositRemaining (TC-002) thấy ở inpatient.ts dòng 505-506 nhưng chưa rõ ngưỡng cảnh báo là chặn cứng hay chỉ warning ở UI — cần đọc logic BillingCompleteService.Payments.cs để chốt expected.",
   "FLOW related[] có nutrition + infection (Dinh dưỡng, Kiểm soát nhiễm khuẩn) nhưng chưa đưa thành TC độc lập (ưu tiên 16 task cho spine + tài chính + an toàn); nếu cần phủ 100% related có thể bổ sung 2 TC liên kết suất ăn điều trị (Nutrition.tsx) + giám sát nhiễm khuẩn (InfectionControl.tsx) vào hồ sơ nội trú.",
   "Chưa kiểm tra seed dữ liệu dev có sẵn 'pending admission' (getPendingAdmissions) ổn định để chạy TC-001 lặp lại — cần seed/fixture xác định trước khi tự động hóa E2E (phụ thuộc #213 harness)."
  ]
 },
 {
  "id": "surgery",
  "code": "F-SUR",
  "ic": "🔪",
  "layer": "clin",
  "nm": "Phẫu thuật & thủ thuật",
  "gh": [
   "#217",
   "#239"
  ],
  "flow_id": "surgery",
  "summary": "Bộ test-task END-TO-END cho luồng \"Phẫu thuật & thủ thuật\" (id=surgery), grounded từ FLOWS.surgery trong docs/architecture/his-roadmap/assets/data.js: desc \"BN PT theo lịch → khám tiền mê → nhập viện → mổ → hậu phẫu → xuất viện\"; steps[] = [Đề nghị mổ(surgery)→Lịch mổ(surgery)→Gây mê & mổ(surgery)→Hậu phẫu(ipd)→Viện phí(billing)]; related=[inpatient, blood, emr]. Bám sát code thật: FE pages-v2/Surgery.tsx (route /v2/surgery, _v2kit SimpleV2Page + drawer + modal tiền mê/theo dõi gây mê/cam đoan PTTT/xuất tủ trực), api/surgery.ts (BASE /SurgeryComplete: createSurgeryRequest, approve, schedule, check-in, start, complete, cancel, consents+sign+validate, blood-order, prescription, cabinet issue, fee/profit/cost-tt37, export xml-4210, print anesthesia/safety-checklist), state Status backend 0 Scheduled · 1 Preop · 2 Ongoing · 3 Recovery · 4 Completed · 5 Cancelled. Mỗi step trỏ 1 phân hệ thật: surgery (đề nghị/lịch/mổ/gây mê), ipd (nội trú hậu phẫu), billing (viện phí + TT37 + XML 4210), blood (truyền máu), emr (ký số biên bản mổ). 16 task: happy-path E2E xuyên màn, data-consistency liên phân hệ (tạo ca → hiện waiting-list → tính viện phí), state-transition liên phân hệ (Scheduled→Preop→Ongoing→Recovery→Completed→hậu phẫu IPD), luồng phụ/ngoại lệ (hủy ca giữa chừng, cấp cứu jump-queue, đổi kíp đang mổ, thiếu cam đoan chặn mổ, hoàn phí khi hủy), integration (blood-order, SignalR live phòng mổ, XML 4210 BHXH, ký số EMR, thanh toán), security (IDOR cancel/approve, anonymous, permission). Evidence chụp tại mọi điểm chuyển màn. DEDUP: chi tiết hóa #217 (happy-path E2E cha) và #239 (LS workflow+state-transition, có liệt kê /v2/surgery), không tạo issue trùng — refIssues điền #217/#239.",
  "tasks": [
   {
    "id": "TC-F-SUR-001",
    "title": "Happy-path E2E xuyên màn: Đề nghị mổ → Duyệt → Lịch mổ → Check-in → Gây mê & mổ → Hậu phẫu IPD → Viện phí (assert outcome cuối)",
    "category": "happy",
    "priority": "P0",
    "role": "admin (đủ quyền PT/GMHS/điều dưỡng/viện phí)",
    "preconditions": "Đăng nhập admin/Admin@123 (JWT localStorage token+user). Có sẵn 1 BN có MedicalRecord, 1 dịch vụ phẫu thuật (surgeryServiceId), 1 phòng mổ (OperatingRooms) đang Active. Seed dev ổn định. BE localhost:5106 chạy.",
    "steps": [
     "Tạo đề nghị mổ qua API/UI (createSurgeryRequest POST /SurgeryComplete) với medicalRecordId, surgeryServiceId, surgeryType, surgeryClass, surgeryNature=2 (Chương trình), anesthesiaType, scheduledDate, ekip teamMembers → ghi nhận surgeryCode + status=0 Scheduled",
     "Vào /v2/surgery, xác minh ca xuất hiện ở tab 'Đã lên lịch', KPI 'Ca hôm nay' tăng đúng",
     "Bấm action 'Duyệt mổ' (approve POST /SurgeryComplete/approve isApproved=true) khi status=0 → nút duyệt biến mất",
     "Xếp lịch mổ (schedule POST /SurgeryComplete/schedule) gán operatingRoomId + estimatedDurationMinutes + kíp → ca có phòng/giờ",
     "Check-in BN vào phòng mổ (check-in POST /SurgeryComplete/check-in) → status chuyển 1 Preop (tab 'Tiền phẫu')",
     "Mở drawer ca mổ: làm Khám tiền mê (PreAnesthesiaModal), Cam đoan PTTT (ConsentModal) → lưu thành công",
     "Bắt đầu mổ (startSurgery POST /SurgeryComplete/start, startTime) → status 2 Ongoing (tab 'Đang mổ', KPI 'Đang mổ' tăng)",
     "Theo dõi gây mê (AnesthesiaMonitorModal) trong lúc mổ → lưu được mốc theo dõi",
     "Hoàn tất mổ (completeSurgery POST /SurgeryComplete/complete) với endTime, postOperativeDiagnosis+ICD, conclusion → status 3 Recovery rồi 4 Completed; drawer hiện 'Thời gian thực tế' = end-start phút đúng",
     "Chuyển hậu phẫu sang Nội trú /v2/ipd: BN hiển thị trong danh sách điều trị nội trú (Hậu phẫu) gắn đúng medicalRecord",
     "Sang Viện phí /v2/billing: xác minh phí dịch vụ PT + tiền thuốc/vật tư mổ được tính vào tổng viện phí của BN"
    ],
    "expected": "Toàn luồng đi đúng chuỗi step của FLOWS.surgery; mỗi bước tạo dữ liệu đúng + chuyển trạng thái đúng (0→1→2→3→4); tổng viện phí cuối = serviceCost + medicineCost + supplyCost của ca mổ; bản ghi SurgeryRecord/AnesthesiaRecord/Consent tồn tại; biên bản mổ + GMHS đầy đủ. Fail nếu logic/số liệu sai, không chỉ khi crash.",
    "refIssues": [
     "#217",
     "#239"
    ],
    "notes": "Chi tiết hóa #217 (happy-path E2E cha) + #239 (LS workflow, /v2/surgery). Assert OUTCOME (status, tổng tiền, bản ghi) không chỉ no-console-error.",
    "evidence": [
     {
      "name": "TC-F-SUR-001__s01__form",
      "caption": "Form tạo đề nghị mổ (chọn BN/dịch vụ PT/phòng/ekip)",
      "uiState": "form"
     },
     {
      "name": "TC-F-SUR-001__s02__list",
      "caption": "/v2/surgery — ca mới ở tab Đã lên lịch, KPI Ca hôm nay tăng",
      "uiState": "list"
     },
     {
      "name": "TC-F-SUR-001__s03__confirm",
      "caption": "Confirm Duyệt mổ",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-SUR-001__s04__tab",
      "caption": "Ca chuyển tab Tiền phẫu sau check-in",
      "uiState": "tab"
     },
     {
      "name": "TC-F-SUR-001__s05__drawer",
      "caption": "Drawer hồ sơ ca mổ — phiếu phòng mổ (tiền mê/cam đoan)",
      "uiState": "drawer"
     },
     {
      "name": "TC-F-SUR-001__s06__detail",
      "caption": "Drawer hiện Thời gian thực tế = end-start, status Hoàn tất",
      "uiState": "detail"
     },
     {
      "name": "TC-F-SUR-001__s07__detail",
      "caption": "/v2/ipd — BN hậu phẫu trong danh sách nội trú",
      "uiState": "detail"
     },
     {
      "name": "TC-F-SUR-001__s08__detail",
      "caption": "/v2/billing — phí PT + thuốc/vật tư mổ vào tổng viện phí",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-SUR-002",
    "title": "State-transition liên phân hệ: chuỗi trạng thái ca mổ Scheduled→Preop→Ongoing→Recovery→Completed và nút theo từng state",
    "category": "state",
    "priority": "P0",
    "role": "admin",
    "preconditions": "Có 1 ca status=0 Scheduled vừa duyệt. /v2/surgery mở.",
    "steps": [
     "Ở status=0: kiểm tra chỉ hiện nút Duyệt mổ + Hủy ca; chưa cho start/complete",
     "check-in → status=1 Preop: nút Duyệt biến mất, vẫn cho Hủy, cho Khám tiền mê/Cam đoan",
     "startSurgery → status=2 Ongoing: tab 'Đang mổ', cho Theo dõi gây mê, KHÔNG cho start lại",
     "completeSurgery → status=3 Recovery rồi 4 Completed: ẩn nút Hủy (status===4), cho in biên bản",
     "Thử gọi startSurgery lại trên ca đã Completed → bị từ chối",
     "Thử completeSurgery trên ca chưa start (status=1) → bị từ chối (không cho nhảy state)"
    ],
    "expected": "Mỗi state chỉ cho phép hành động hợp lệ; nút UI render theo state (logic r.status===0/===2/===5/===4 trong Surgery.tsx); BE từ chối transition không hợp lệ (start trên Completed, complete trên Preop) trả lỗi rõ ràng, không đổi status sai.",
    "refIssues": [
     "#239"
    ],
    "notes": "Chi tiết hóa phần state-transition của #239 cho riêng màn /v2/surgery.",
    "evidence": [
     {
      "name": "TC-F-SUR-002__s01__detail",
      "caption": "Status Scheduled — chỉ có Duyệt + Hủy",
      "uiState": "detail"
     },
     {
      "name": "TC-F-SUR-002__s02__tab",
      "caption": "Status Ongoing — tab Đang mổ, nút Theo dõi gây mê",
      "uiState": "tab"
     },
     {
      "name": "TC-F-SUR-002__s03__detail",
      "caption": "Status Completed — ẩn nút Hủy",
      "uiState": "detail"
     },
     {
      "name": "TC-F-SUR-002__s04__error",
      "caption": "Từ chối complete khi chưa start (transition không hợp lệ)",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-SUR-003",
    "title": "Data-consistency liên phân hệ: tạo ca → hiện trong Lịch mổ + Waiting-list phòng mổ → tính đúng chi phí TT37 → khớp viện phí",
    "category": "data-consistency",
    "priority": "P0",
    "role": "admin",
    "preconditions": "1 ca đã duyệt + xếp lịch vào phòng mổ X ngày hôm nay, có thuốc/vật tư đã kê.",
    "steps": [
     "Tạo + xếp lịch ca mổ phòng X (schedule)",
     "Gọi getSurgerySchedule(date, roomX) → ca xuất hiện đúng phòng/giờ",
     "Gọi getWaitingList(roomX, date) → BN nằm trong waitingPatients đúng queueNumber",
     "Thêm thuốc (addMedicine) + vật tư (addSupply) cho ca → prescription tổng cost cập nhật",
     "Gọi calculateCostTT37(id) → serviceCost + medicineCost + supplyCost = totalCost; insuranceCoverage + patientPayment = totalCost",
     "Sang /v2/billing → khoản viện phí PT của BN khớp đúng totalCost (A tạo → B hiện → C tính)"
    ],
    "expected": "Số liệu nhất quán xuyên 3 phân hệ: lịch mổ ↔ waiting-list ↔ prescription ↔ TT37 ↔ viện phí. Không có lệch tiền, không double-count. teamFees + cost-tt37 cộng đúng; insuranceCoverage tính theo đối tượng BHYT.",
    "refIssues": [
     "#217"
    ],
    "notes": "Tập trung tính toán liên phân hệ (data-consistency) yêu cầu trong prompt: tạo A → hiện B → tính C.",
    "evidence": [
     {
      "name": "TC-F-SUR-003__s01__list",
      "caption": "Lịch mổ phòng X — ca đúng giờ",
      "uiState": "list"
     },
     {
      "name": "TC-F-SUR-003__s02__list",
      "caption": "Waiting-list phòng mổ — BN đúng queueNumber",
      "uiState": "list"
     },
     {
      "name": "TC-F-SUR-003__s03__modal",
      "caption": "Kê thuốc/vật tư mổ — tổng cost cập nhật",
      "uiState": "modal"
     },
     {
      "name": "TC-F-SUR-003__s04__detail",
      "caption": "Cost TT37 = service+medicine+supply, BHYT+BN=total",
      "uiState": "detail"
     },
     {
      "name": "TC-F-SUR-003__s05__detail",
      "caption": "/v2/billing khớp đúng totalCost",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-SUR-004",
    "title": "Luồng phụ — Hủy ca giữa chừng (Ongoing→Cancelled) + hoàn phí: data-consistency với viện phí",
    "category": "negative",
    "priority": "P0",
    "role": "admin",
    "preconditions": "1 ca status=2 Ongoing đã có thuốc/vật tư đã trừ kho + đã ghi phí dịch vụ.",
    "steps": [
     "Trên ca Ongoing bấm Hủy ca (cancelSurgery POST /SurgeryComplete/{id}/cancel, reason)",
     "Nhập lý do hủy → xác nhận",
     "Kiểm tra status→5 Cancelled, ca vào tab 'Hủy', KPI Hủy tăng",
     "Sang /v2/billing kiểm tra hoàn phí: khoản PT bị đảo (reverseServiceCharge / BillingReversal) — không còn tính tiền dịch vụ đã hủy",
     "Kiểm tra thuốc/vật tư đã xuất: xử lý hoàn kho hoặc giữ theo chính sách, audit ghi nhận",
     "Xác minh audit-log có bản ghi mutation hủy (ai/khi/lý do)"
    ],
    "expected": "Hủy giữa chừng chuyển Cancelled an toàn; viện phí được hoàn/đảo đúng (không thu tiền ca đã hủy); kho thuốc/vật tư nhất quán với chính sách; audit-log đầy đủ. Đây là nơi 'lỗi bất thường' dễ ẩn (#239 luồng ngược / inconsistency tiền).",
    "refIssues": [
     "#239"
    ],
    "notes": "Nếu hủy không hoàn phí / kho lệch → tạo Issue bug fix liên kết 2 chiều (DoD task test).",
    "evidence": [
     {
      "name": "TC-F-SUR-004__s01__modal",
      "caption": "Modal nhập lý do hủy ca đang mổ",
      "uiState": "modal"
     },
     {
      "name": "TC-F-SUR-004__s02__tab",
      "caption": "Ca vào tab Hủy, KPI Hủy tăng",
      "uiState": "tab"
     },
     {
      "name": "TC-F-SUR-004__s03__detail",
      "caption": "/v2/billing — khoản PT đã đảo/hoàn",
      "uiState": "detail"
     },
     {
      "name": "TC-F-SUR-004__s04__toast",
      "caption": "Toast xác nhận hủy ca",
      "uiState": "toast"
     }
    ]
   },
   {
    "id": "TC-F-SUR-005",
    "title": "Validation patient-safety: chặn bắt đầu mổ khi thiếu Cam đoan PTTT / thiếu khám tiền mê (validateConsents)",
    "category": "validation",
    "priority": "P0",
    "role": "admin",
    "preconditions": "1 ca status=1 Preop CHƯA ký cam đoan PTTT, chưa có gây mê hợp lệ.",
    "steps": [
     "Gọi validateConsents(surgeryId) → trả isValid=false + missingConsents/unsignedConsents",
     "Thử startSurgery khi chưa đủ cam đoan → bị chặn với thông báo rõ",
     "Mở ConsentModal → lưu cam đoan (saveSurgeryConsent) rồi signConsent (ký người nhà + quan hệ)",
     "Validate lại → isValid=true",
     "startSurgery thành công sau khi đủ cam đoan"
    ],
    "expected": "Patient-safety gate: không cho mổ khi thiếu cam đoan/khám tiền mê; validation FE+BE đồng nhất; thông báo lỗi tiếng Việt có dấu rõ ràng. Sau ký đủ mới cho start.",
    "refIssues": [
     "#239"
    ],
    "notes": "Quy tắc patient-safety bắt buộc của HIS (consent trước mổ). Nếu BE không chặn → bug P0 → tạo Issue fix liên kết.",
    "evidence": [
     {
      "name": "TC-F-SUR-005__s01__validation",
      "caption": "validateConsents trả thiếu cam đoan, chặn start",
      "uiState": "validation"
     },
     {
      "name": "TC-F-SUR-005__s02__modal",
      "caption": "ConsentModal ký cam đoan PTTT",
      "uiState": "modal"
     },
     {
      "name": "TC-F-SUR-005__s03__success",
      "caption": "Đủ cam đoan → start thành công",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-SUR-006",
    "title": "Luồng phụ — Mổ cấp cứu (surgeryNature=1) chen lịch: jump-queue waiting-list không qua duyệt-lịch chuẩn",
    "category": "edge",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Phòng mổ đang có lịch ca chương trình; tạo 1 đề nghị mổ cấp cứu (surgeryNature=1).",
    "steps": [
     "Tạo đề nghị mổ cấp cứu (createSurgeryRequest surgeryNature=1)",
     "Xác minh KPI 'Cấp cứu' tăng, chip 'Cấp cứu' tone crit hiển thị đúng ở list + drawer",
     "Đưa ca cấp cứu vào waiting-list phòng mổ → ưu tiên queue trước ca chương trình (isEmergency)",
     "Bắt đầu mổ cấp cứu ngay không cần chờ full duyệt-lịch chuẩn",
     "Sau mổ xác minh ca chương trình bị dời vẫn nhất quán lịch"
    ],
    "expected": "Ca cấp cứu được ưu tiên đúng (jump queue), không phá vỡ tính nhất quán lịch các ca khác; phân loại Cấp cứu/Chương trình hiển thị + tính phí đúng (cấp cứu thường khác đối tượng BHYT).",
    "refIssues": [
     "#239"
    ],
    "notes": "Edge nghiệp vụ thực tế phòng mổ.",
    "evidence": [
     {
      "name": "TC-F-SUR-006__s01__list",
      "caption": "Ca cấp cứu chip crit, KPI Cấp cứu tăng",
      "uiState": "list"
     },
     {
      "name": "TC-F-SUR-006__s02__list",
      "caption": "Waiting-list ưu tiên ca cấp cứu trước",
      "uiState": "list"
     },
     {
      "name": "TC-F-SUR-006__s03__detail",
      "caption": "Lịch ca chương trình bị dời vẫn nhất quán",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-SUR-007",
    "title": "Luồng phụ — Đổi kíp mổ giữa lúc đang mổ (changeTeamMember) + tính lại fee distribution",
    "category": "state",
    "priority": "P1",
    "role": "admin",
    "preconditions": "1 ca status=2 Ongoing có kíp gồm BS chính + phụ mổ với feePercent đã set.",
    "steps": [
     "Mở drawer/màn TT50 info ca đang mổ → xem ekip hiện tại",
     "changeTeamMember (POST /SurgeryComplete/{id}/team/change) đổi 1 thành viên + changeTime",
     "Gọi calculateTeamFees(id) → fee distribution tính lại đúng theo % mới, totalDistributed + remainder hợp lý",
     "calculateCostTT37 với hasTeamChange=true → additionalServiceCost phản ánh đổi kíp",
     "Xác minh audit ghi nhận đổi kíp (thời điểm, người cũ/mới)"
    ],
    "expected": "Đổi kíp giữa ca cập nhật team + tính lại phân bổ fee chính xác; cost TT37 phản ánh hasTeamChange; lịch sử kíp giữ vết joinTime/leaveTime; không mất dữ liệu thành viên cũ.",
    "refIssues": [
     "#217"
    ],
    "notes": "Data-consistency tiền/kíp — dễ phát sinh lệch fee.",
    "evidence": [
     {
      "name": "TC-F-SUR-007__s01__drawer",
      "caption": "Ekip phẫu thuật hiện tại trong drawer",
      "uiState": "drawer"
     },
     {
      "name": "TC-F-SUR-007__s02__modal",
      "caption": "Modal đổi thành viên kíp giữa ca",
      "uiState": "modal"
     },
     {
      "name": "TC-F-SUR-007__s03__detail",
      "caption": "Fee distribution tính lại theo % mới",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-SUR-008",
    "title": "Integration — Truyền máu (related: blood): đặt máu cho ca mổ (createBloodOrder) + nhóm máu safety",
    "category": "integration",
    "priority": "P1",
    "role": "admin",
    "preconditions": "1 ca mổ status Preop/Ongoing; BN có nhóm máu xác định; blood-bank có sản phẩm máu tồn.",
    "steps": [
     "Mở blood-order cho ca (getBloodOrder rỗng ban đầu)",
     "searchBloodProducts(bloodBankId, bloodType, rhFactor) đúng nhóm máu BN",
     "createBloodOrder với bloodProducts khớp nhóm máu/Rh BN → tạo đơn lĩnh máu",
     "Thử đặt sản phẩm máu KHÁC nhóm máu BN → hệ thống cảnh báo/chặn (patient-safety nhóm máu)",
     "Xác minh chi phí máu cộng vào tổng viện phí ca mổ"
    ],
    "expected": "Đặt máu khớp nhóm máu/Rh thành công; đặt sai nhóm máu bị cảnh báo/chặn (patient-safety); chi phí máu nhất quán với viện phí. Integration với phân hệ Ngân hàng máu.",
    "refIssues": [
     "#239"
    ],
    "notes": "related[blood] trong FLOWS.surgery. Safety nhóm máu bắt buộc.",
    "evidence": [
     {
      "name": "TC-F-SUR-008__s01__modal",
      "caption": "Đặt máu cho ca mổ — chọn sản phẩm theo nhóm máu",
      "uiState": "modal"
     },
     {
      "name": "TC-F-SUR-008__s02__validation",
      "caption": "Cảnh báo/chặn khi đặt sai nhóm máu",
      "uiState": "validation"
     },
     {
      "name": "TC-F-SUR-008__s03__success",
      "caption": "Đơn lĩnh máu tạo + cộng viện phí",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-SUR-009",
    "title": "Integration — Ký số biên bản mổ (related: emr) + xuất XML 4210 BHXH sau hoàn tất",
    "category": "integration",
    "priority": "P1",
    "role": "admin",
    "preconditions": "1 ca status=4 Completed có biên bản mổ + GMHS + chẩn đoán sau mổ đầy đủ.",
    "steps": [
     "Sang /v2/emr (hoặc /v2/digital-signature) tìm biên bản mổ của ca → ký số (DigitalSignature)",
     "Xác minh trạng thái biên bản chuyển 'Đã ký' + dấu chữ ký số hiển thị",
     "Quay lại ca mổ in biên bản (printSurgeryReport) + phiếu GMHS (printAnesthesiaForm) + bảng kiểm an toàn (printSafetyChecklist) → blob PDF mở được",
     "exportXml4210(id) → tải XML khám-chữa-bệnh BHXH đúng định dạng (bảng 4210), gồm thông tin PTTT",
     "Validate XML 4210 có đủ trường PTTT (mã DV, ICD trước/sau mổ, GMHS)"
    ],
    "expected": "Biên bản mổ ký số thành công + giữ vết; in PDF biên bản/GMHS/safety-checklist đúng nội dung tiếng Việt có dấu; XML 4210 xuất hợp lệ chứa dữ liệu PTTT để gửi BHXH. Integration EMR ký số + XML BHXH.",
    "refIssues": [
     "#217"
    ],
    "notes": "related[emr] + step Viện phí (billing/BHXH). XML 4210 = đầu ra BHXH bắt buộc.",
    "evidence": [
     {
      "name": "TC-F-SUR-009__s01__detail",
      "caption": "Ký số biên bản mổ trong EMR",
      "uiState": "detail"
     },
     {
      "name": "TC-F-SUR-009__s02__success",
      "caption": "Biên bản chuyển Đã ký + dấu chữ ký",
      "uiState": "success"
     },
     {
      "name": "TC-F-SUR-009__s03__detail",
      "caption": "In biên bản mổ + GMHS (PDF)",
      "uiState": "detail"
     },
     {
      "name": "TC-F-SUR-009__s04__detail",
      "caption": "XML 4210 BHXH xuất gồm dữ liệu PTTT",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-SUR-010",
    "title": "Integration — SignalR realtime: trạng thái 'Đang mổ' / waiting-list phòng mổ cập nhật live không cần reload",
    "category": "integration",
    "priority": "P2",
    "role": "admin",
    "preconditions": "2 tab/browser mở /v2/surgery cùng lúc; 1 ca chuẩn bị start.",
    "steps": [
     "Tab A: startSurgery 1 ca → status=2 Ongoing",
     "Tab B (không reload): xác minh KPI 'Đang mổ' tăng + ca chuyển tab 'Đang mổ' realtime qua SignalR (hoặc polling fallback)",
     "Tab A: completeSurgery → Tab B cập nhật KPI 'Hoàn tất' realtime",
     "Kiểm tra waiting-list/bảng điện tử phòng mổ cập nhật current surgery live"
    ],
    "expected": "Realtime push (SignalR JWT auth, auto-reconnect, polling fallback) cập nhật trạng thái ca mổ + KPI giữa các client mà không cần F5; nếu SignalR down → polling fallback vẫn đồng bộ trong khoảng thời gian chấp nhận.",
    "refIssues": [
     "#239"
    ],
    "notes": "Integration SignalR. IGNORE_PATTERNS cho SignalR/HMR khi smoke console-error.",
    "evidence": [
     {
      "name": "TC-F-SUR-010__s01__list",
      "caption": "Tab B cập nhật KPI Đang mổ realtime",
      "uiState": "list"
     },
     {
      "name": "TC-F-SUR-010__s02__list",
      "caption": "Tab B cập nhật KPI Hoàn tất realtime",
      "uiState": "list"
     },
     {
      "name": "TC-F-SUR-010__s03__loading",
      "caption": "Polling fallback khi SignalR ngắt",
      "uiState": "loading"
     }
    ]
   },
   {
    "id": "TC-F-SUR-011",
    "title": "Security — IDOR/permission: user không-quyền-PT không được approve/cancel/start ca mổ của khoa khác",
    "category": "security",
    "priority": "P0",
    "role": "non-surgery user (vd lễ tân/điều dưỡng không có quyền PTTT)",
    "preconditions": "Đăng nhập 1 tài khoản KHÔNG có quyền phẫu thuật. Biết 1 surgeryId hợp lệ của khoa khác.",
    "steps": [
     "Gọi trực tiếp approveSurgery / cancelSurgery / startSurgery với surgeryId của khoa khác (IDOR) bằng token user thiếu quyền",
     "Xác minh BE trả 401/403, không thực thi mutation",
     "Thử cancelSurgery với surgeryId không tồn tại / của BN khác → không lộ dữ liệu, không đổi state",
     "Trên UI: với role thiếu quyền, các nút Duyệt/Hủy/Start không hiển thị hoặc disabled",
     "Thử gọi endpoint /SurgeryComplete không kèm JWT (anonymous) → 401"
    ],
    "expected": "Mọi mutation PTTT yêu cầu JWT + đúng quyền; IDOR bị chặn (403); anonymous bị 401; UI ẩn nút theo quyền; không lộ thông tin ca mổ BN khác. Audit ghi nhận attempt bị từ chối.",
    "refIssues": [
     "#239"
    ],
    "notes": "Security IDOR/anonymous/permission bắt buộc cho mutation patient-safety.",
    "evidence": [
     {
      "name": "TC-F-SUR-011__s01__permission",
      "caption": "UI ẩn nút Duyệt/Hủy với role thiếu quyền",
      "uiState": "permission"
     },
     {
      "name": "TC-F-SUR-011__s02__error",
      "caption": "API approve/cancel khoa khác trả 403",
      "uiState": "error"
     },
     {
      "name": "TC-F-SUR-011__s03__error",
      "caption": "Anonymous gọi /SurgeryComplete trả 401",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-SUR-012",
    "title": "Validation form đề nghị mổ — required/boundary + chống XSS trong mô tả/kết luận/tường trình",
    "category": "validation",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Mở form tạo đề nghị mổ (createSurgeryRequest).",
    "steps": [
     "Submit form trống → báo lỗi required cho medicalRecordId/surgeryServiceId/surgeryType/surgeryClass/surgeryNature/anesthesiaType",
     "Nhập scheduledDate trong quá khứ → validation cảnh báo (boundary thời gian)",
     "Nhập durationMinutes âm/0/quá lớn → validation chặn",
     "Nhập chuỗi XSS '<img src=x onerror=alert(1)>' vào preOperativeDiagnosis/surgeryMethod/conclusion/surgeryReport → lưu, sau đó render ở drawer phải escape (không thực thi script)",
     "Nhập tiếng Việt có dấu dài (tường trình mổ) → lưu + hiển thị whitespace-pre-wrap đúng"
    ],
    "expected": "FE+BE validation đồng nhất (required, ngày, duration boundary); input XSS bị escape khi render (description/conclusion/complications dùng whitespace-pre-wrap text, không dangerouslySetInnerHTML); tiếng Việt có dấu lưu/hiển thị đúng.",
    "refIssues": [
     "#239"
    ],
    "notes": "Security XSS + validation form. Nếu render thô không escape → bug security → Issue fix.",
    "evidence": [
     {
      "name": "TC-F-SUR-012__s01__validation",
      "caption": "Form trống — lỗi required các trường bắt buộc",
      "uiState": "validation"
     },
     {
      "name": "TC-F-SUR-012__s02__validation",
      "caption": "Duration âm/ngày quá khứ bị chặn",
      "uiState": "validation"
     },
     {
      "name": "TC-F-SUR-012__s03__detail",
      "caption": "Chuỗi XSS được escape khi render drawer",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-SUR-013",
    "title": "UI states — /v2/surgery: empty / loading / error / responsive / dark mode + filter theo tab trạng thái",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Tài khoản admin. Có khoảng thời gian không có ca (empty) và khoảng có nhiều ca.",
    "steps": [
     "Mở /v2/surgery khi đang load → xác minh trạng thái loading (skeleton/spinner)",
     "Lọc khoảng ngày không có ca → empty state hiển thị thông báo, không vỡ layout",
     "Tắt/chặn BE để getSurgeries lỗi → error state hiển thị + retry, không trắng trang",
     "Bật dark/light toggle → bảng/KPI/drawer/chip giữ contrast (ab-* / var(--*)) đúng cả 2 theme",
     "Thu nhỏ viewport (responsive) → bảng cuộn ngang/cột co hợp lý, drawer full",
     "Bấm các status tab (Đã lên lịch/Tiền phẫu/Đang mổ/Hồi tỉnh/Hoàn tất/Hủy) + ô tìm kiếm → lọc đúng theo statusKey + searchOf"
    ],
    "expected": "Empty/loading/error xử lý gọn (core-error-loading-state); dark+light parity contrast OK; responsive không vỡ; filter tab + search lọc đúng tập ca. Không console-error (trừ SignalR/HMR ignore).",
    "refIssues": [
     "#239"
    ],
    "notes": "UI/dark-mode/responsive + filter. Tận dụng _v2kit SimpleV2Page statusTabs/searchOf.",
    "evidence": [
     {
      "name": "TC-F-SUR-013__s01__loading",
      "caption": "Trạng thái loading danh sách ca mổ",
      "uiState": "loading"
     },
     {
      "name": "TC-F-SUR-013__s02__empty",
      "caption": "Empty state khi không có ca",
      "uiState": "empty"
     },
     {
      "name": "TC-F-SUR-013__s03__error",
      "caption": "Error state khi API lỗi + retry",
      "uiState": "error"
     },
     {
      "name": "TC-F-SUR-013__s04__list",
      "caption": "Dark mode danh sách ca mổ giữ contrast",
      "uiState": "list"
     },
     {
      "name": "TC-F-SUR-013__s05__filter",
      "caption": "Lọc theo tab Đang mổ + ô tìm kiếm",
      "uiState": "filter"
     }
    ]
   },
   {
    "id": "TC-F-SUR-014",
    "title": "Luồng phụ — Lỗi giữa chừng: mất kết nối/timeout khi completeSurgery — không để ca kẹt trạng thái nửa vời",
    "category": "negative",
    "priority": "P1",
    "role": "admin",
    "preconditions": "1 ca status=2 Ongoing; mô phỏng BE timeout/500 ở thời điểm completeSurgery.",
    "steps": [
     "Bấm Hoàn tất mổ → mô phỏng API completeSurgery trả 500/timeout",
     "Xác minh UI báo lỗi rõ ('Hoàn tất thất bại'), KHÔNG hiển thị success giả",
     "Reload /v2/surgery → ca vẫn ở Ongoing (không kẹt nửa Completed nửa Ongoing)",
     "Thử completeSurgery lại (idempotent/retry) → thành công, không tạo 2 SurgeryRecord",
     "Kiểm tra không sinh phí trùng / kho trừ 2 lần do retry"
    ],
    "expected": "Lỗi giữa chừng không để dữ liệu nửa vời; thao tác retry an toàn (không double-record, không double-charge, không double trừ kho); thông báo lỗi trung thực. Đây là vùng 'lỗi bất thường' #239 nhấn mạnh.",
    "refIssues": [
     "#239"
    ],
    "notes": "Nếu retry sinh trùng phí/kho → bug data-consistency P0 → Issue fix liên kết 2 chiều.",
    "evidence": [
     {
      "name": "TC-F-SUR-014__s01__error",
      "caption": "completeSurgery timeout/500 — báo lỗi không success giả",
      "uiState": "error"
     },
     {
      "name": "TC-F-SUR-014__s02__detail",
      "caption": "Sau reload ca vẫn Ongoing, không kẹt nửa vời",
      "uiState": "detail"
     },
     {
      "name": "TC-F-SUR-014__s03__success",
      "caption": "Retry complete thành công, không double-record",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-SUR-015",
    "title": "Data-consistency — Hậu phẫu IPD: ca Completed → BN có y lệnh/diễn biến hậu phẫu nội trú gắn đúng hồ sơ + tiếp tục viện phí",
    "category": "data-consistency",
    "priority": "P1",
    "role": "admin",
    "preconditions": "1 ca mổ status=4 Completed của BN nội trú (inpatientId).",
    "steps": [
     "Sau hoàn tất mổ, sang /v2/ipd tìm BN → có mục theo dõi hậu phẫu (DailyProgress/NursingCare) gắn đúng medicalRecord/inpatient",
     "Kê y lệnh hậu phẫu (thuốc/chăm sóc) cho BN nội trú → lưu đúng hồ sơ",
     "Kiểm tra phí thuốc hậu phẫu IPD + phí PT cùng dồn về 1 đợt viện phí của medicalRecord (không tách lạc hồ sơ)",
     "Khi xuất viện (Discharge) → quyết toán bao gồm cả chi phí PT + hậu phẫu nhất quán"
    ],
    "expected": "Ca mổ Completed liên kết đúng sang nội trú hậu phẫu (cùng medicalRecordId/inpatientId); y lệnh hậu phẫu + phí PT cùng đợt viện phí; quyết toán xuất viện tổng hợp đúng. Bridge step Hậu phẫu(ipd) ↔ Viện phí(billing) của FLOWS.surgery.",
    "refIssues": [
     "#217",
     "#239"
    ],
    "notes": "Liên phân hệ surgery→ipd→billing. Kiểm tra không lạc hồ sơ (medicalRecord khớp).",
    "evidence": [
     {
      "name": "TC-F-SUR-015__s01__detail",
      "caption": "/v2/ipd — theo dõi hậu phẫu gắn đúng hồ sơ",
      "uiState": "detail"
     },
     {
      "name": "TC-F-SUR-015__s02__modal",
      "caption": "Kê y lệnh hậu phẫu nội trú",
      "uiState": "modal"
     },
     {
      "name": "TC-F-SUR-015__s03__detail",
      "caption": "Quyết toán xuất viện gồm PT + hậu phẫu",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-SUR-016",
    "title": "Luồng phụ — Từ chối đề nghị mổ (rejectSurgery) thay vì duyệt: trạng thái + thông báo + không sinh lịch",
    "category": "negative",
    "priority": "P2",
    "role": "admin",
    "preconditions": "1 đề nghị mổ status=0 chờ duyệt.",
    "steps": [
     "Gọi rejectSurgery(id, reason) thay vì approve",
     "Xác minh ca KHÔNG vào lịch mổ (không tạo SurgerySchedule), trạng thái phản ánh bị từ chối",
     "Xác minh không xuất hiện trong waiting-list phòng mổ",
     "Audit-log ghi nhận từ chối + lý do",
     "Thử approve lại ca đã reject → xử lý đúng theo nghiệp vụ (chặn hoặc cho mở lại có kiểm soát)"
    ],
    "expected": "Từ chối đề nghị mổ chặn ca vào lịch/waiting-list; trạng thái + lý do rõ; audit đầy đủ; không cho duyệt vòng vo gây mơ hồ trạng thái.",
    "refIssues": [
     "#239"
    ],
    "notes": "Nhánh phủ định của bước Đề nghị→Duyệt trong FLOWS.surgery.",
    "evidence": [
     {
      "name": "TC-F-SUR-016__s01__modal",
      "caption": "Modal từ chối đề nghị mổ + lý do",
      "uiState": "modal"
     },
     {
      "name": "TC-F-SUR-016__s02__detail",
      "caption": "Ca bị từ chối không vào lịch/waiting-list",
      "uiState": "detail"
     },
     {
      "name": "TC-F-SUR-016__s03__toast",
      "caption": "Toast xác nhận từ chối",
      "uiState": "toast"
     }
    ]
   }
  ],
  "gaps": [
   "Không tìm thấy E2E test thực thi cho surgery ngoài 1 script PowerShell rời 'test-surgery-e2e-lifecycle.ps1' ở root repo (chưa xác minh nội dung/độ phủ) — chưa có Cypress/Playwright spec cho /v2/surgery; các task trên cần dựng spec mới mở rộng #213.",
   "Chưa xác minh quyền/role cụ thể cho PTTT trong code (roles constants #246) — task security TC-F-SUR-011 giả định có phân quyền PT theo khoa; cần đọc SurgeryCompleteController [Authorize] roles để chốt chính xác (assumption).",
   "Quy tắc patient-safety chặn mổ khi thiếu cam đoan/khám tiền mê (TC-F-SUR-005) suy ra từ validateConsents có tồn tại; chưa xác minh BE thực sự CHẶN startSurgery — nếu không chặn là bug P0 cần Issue fix.",
   "Logic hoàn phí/đảo phí khi hủy ca giữa chừng (TC-F-SUR-004) dựa trên reverseServiceCharge/BillingReversal trong api/surgery.ts; cần xác minh có tự động trigger khi cancel hay phải gọi thủ công (data-consistency tiền — vùng rủi ro cao).",
   "Idempotency retry completeSurgery (TC-F-SUR-014) chưa được xác minh ở BE — cần đọc SurgeryOperationServiceImpl để khẳng định không double-record/double-charge.",
   "SignalR cho phòng mổ (TC-F-SUR-010): chưa xác minh có Hub realtime riêng cho surgery hay chỉ polling; cần kiểm tra fs-realtime-signalr wiring cho /v2/surgery (có thể là gap tính năng, không phải bug).",
   "XML 4210 (TC-F-SUR-009) endpoint exportXml4210 tồn tại nhưng chưa xác minh schema đầu ra đúng chuẩn BHXH PTTT — cần đối chiếu mẫu 4210 thực tế.",
   "Seed dữ liệu dev ổn định (BN/dịch vụ PT/phòng mổ/blood-bank/warehouse) là tiền đề mọi task E2E — chưa xác nhận có seed sẵn đủ cho luồng surgery xuyên phân hệ; có thể cần bổ sung seed trước khi chạy.",
   "Đã có #292 '[BE] PTTT — narrative columns (plan riêng)' liên quan tường trình mổ — nếu test phát hiện thiếu cột narrative, liên kết về #292 thay vì tạo trùng."
  ]
 },
 {
  "id": "lab",
  "code": "F-LAB",
  "ic": "🧪",
  "layer": "clin",
  "nm": "Xét nghiệm (LIS)",
  "gh": [
   "#246",
   "#249"
  ],
  "flow_id": "lab",
  "summary": "Bộ test-task END-TO-END cho luồng \"Xét nghiệm (LIS)\" (id=lab), bám sát chuỗi bước trong FLOWS data.js: Chỉ định (cls) → Lấy mẫu (lis) → Chạy máy HL7 (lis) → Trả KQ (lis) → Khám lại (opd); related cls/imaging/opd. Grounded theo data.js (ServiceRequests→ServiceRequestDetails→LabWorklists→LabAnalyzers(HL7)→LabRawResults→LabCriticalValueAlerts) và FE v2 thật (pages-v2: Laboratory, SampleReceive, Microbiology, LabQC, SampleTracking, ServiceRequeue; api: laboratory.ts/lis.ts/labCancelChain.ts/labQC.ts/microbiology.ts với cancel-chain cancel-approval/cancel-result/cancel-collection, status normal/high/low/critical, validate/approve worklist). 16 task chia: happy-path E2E xuyên màn (chỉ định→lấy mẫu→HL7→trả KQ→khám lại), data-consistency liên phân hệ (XN tạo ở CLS→hiện ở LIS worklist→KQ về EMR/Billing), state-transition liên phân hệ (mẫu/KQ: chờ→nhận→chạy→có KQ→đã duyệt→đã trả; nút theo state), patient-safety (critical value alert + nhóm máu/dị ứng), luồng phụ/ngoại lệ (hủy chỉ định, hủy duyệt cancel-chain, từ chối mẫu/lấy lại, lỗi HL7 giữa chừng), integration (HL7 LIS realtime SignalR), permission (KTV vs Bác sĩ vs khóa sau ký), security (IDOR trên orderId/result link, anonymous), ui (empty/loading/error/dark/responsive). Evidence chụp tại MỖI điểm chuyển màn. Dedup: chi tiết hóa #246 (workflow+state CLS), #249 (API-error+integration CLS), parent E2E #217.",
  "tasks": [
   {
    "id": "TC-F-LAB-001",
    "title": "Happy-path E2E xuyên màn: Chỉ định XN (CLS) → Lấy mẫu → Chạy máy (HL7) → Trả KQ → Khám lại (OPD)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ + KTV XN",
    "preconditions": "Đăng nhập admin/Admin@123 (JWT localStorage). Có 1 BN đang khám với MedicalRecord mở tại OPD. Backend localhost:5106 chạy, có máy XN (LabAnalyzers) cấu hình HL7. Seed dịch vụ XN (vd Công thức máu, Glucose).",
    "steps": [
     "Tại màn khám OPD /v2/* mở bệnh án BN, vào tab Chỉ định CLS, tạo ServiceRequest chọn dịch vụ XN (Glucose máu), lưu → sinh ServiceRequestDetails phân về LIS",
     "Mở màn Xét nghiệm /v2 (Laboratory) → tab/worklist Chờ lấy mẫu, xác nhận phiếu vừa chỉ định xuất hiện đúng BN + đúng dịch vụ",
     "Mở SampleReceive, nhận mẫu (gán ống/loại mẫu), xác nhận trạng thái mẫu chuyển 'Đã nhận mẫu'",
     "Đẩy worklist sang máy XN, mô phỏng máy trả kết quả qua HL7 (LabRawResults) → KQ thô về worklist",
     "KTV nhập/duyệt kết quả số (Glucose=5.5 mmol/L, trong khoảng tham chiếu → status normal), bác sĩ XN duyệt (approve)",
     "Trả kết quả (release) → trạng thái 'Đã trả KQ'",
     "Quay lại OPD, mở bệnh án BN, vào tab kết quả CLS → xác nhận KQ Glucose hiển thị đúng giá trị + đơn vị + khoảng tham chiếu, bác sĩ khám lại và kết luận"
    ],
    "expected": "Mỗi bước tạo dữ liệu đúng & chuyển bước đúng; KQ cuối hiển thị tại bệnh án OPD đúng giá trị/đơn vị/tham chiếu; trạng thái phiếu = Đã trả; KHÔNG chỉ no-console-error mà assert outcome (giá trị KQ, trạng thái, bản ghi LabRawResults sinh ra). Mỗi mutation ghi audit.",
    "refIssues": [
     "#217",
     "#246"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-001__s01__detail",
      "caption": "Tab Chỉ định CLS trong bệnh án OPD trước khi tạo phiếu",
      "uiState": "detail"
     },
     {
      "name": "TC-F-LAB-001__s02__form",
      "caption": "Form chọn dịch vụ XN (Glucose) trong ServiceRequest",
      "uiState": "form"
     },
     {
      "name": "TC-F-LAB-001__s03__success",
      "caption": "Toast/thông báo tạo phiếu chỉ định thành công",
      "uiState": "success"
     },
     {
      "name": "TC-F-LAB-001__s04__list",
      "caption": "Worklist Xét nghiệm hiển thị phiếu vừa chỉ định (Chờ lấy mẫu)",
      "uiState": "list"
     },
     {
      "name": "TC-F-LAB-001__s05__modal",
      "caption": "Modal nhận mẫu (SampleReceive) gán ống/loại mẫu",
      "uiState": "modal"
     },
     {
      "name": "TC-F-LAB-001__s06__list",
      "caption": "Worklist sau khi nhận mẫu (Đã nhận mẫu) + đẩy sang máy",
      "uiState": "list"
     },
     {
      "name": "TC-F-LAB-001__s07__detail",
      "caption": "KQ thô từ HL7 về worklist (LabRawResults)",
      "uiState": "detail"
     },
     {
      "name": "TC-F-LAB-001__s08__form",
      "caption": "Màn nhập/duyệt kết quả số Glucose=5.5",
      "uiState": "form"
     },
     {
      "name": "TC-F-LAB-001__s09__confirm",
      "caption": "Xác nhận duyệt (approve) kết quả",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-LAB-001__s10__success",
      "caption": "Trả KQ thành công, trạng thái Đã trả",
      "uiState": "success"
     },
     {
      "name": "TC-F-LAB-001__s11__detail",
      "caption": "KQ Glucose hiển thị tại tab kết quả CLS trong bệnh án OPD (khám lại)",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-LAB-002",
    "title": "Data-consistency liên phân hệ: phiếu tạo ở CLS hiện đúng ở LIS worklist (số lượng/dịch vụ/BN khớp)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ + KTV XN",
    "preconditions": "BN có bệnh án OPD mở. Đếm số dòng worklist LIS trước khi chỉ định (làm baseline).",
    "steps": [
     "Ghi nhận số phiếu/dòng worklist LIS hiện tại cho BN (A=trước)",
     "Tại CLS tạo 1 ServiceRequest gồm 3 dịch vụ XN (CTM, Glucose, Ure)",
     "Mở worklist LIS, lọc theo BN → đếm số dòng (B=sau)",
     "Đối chiếu B = A + 3, từng dòng đúng tên dịch vụ + đúng BN + đúng phiếu nguồn (ServiceRequestId)",
     "Mở chi tiết 1 dòng, xác nhận link ngược về ServiceRequestDetail + MedicalRecord đúng"
    ],
    "expected": "Số dòng worklist LIS tăng đúng bằng số dịch vụ chỉ định (A→A+3); tên dịch vụ/BN/phiếu nguồn khớp 100% với CLS; không nhân đôi, không thiếu. Tạo A → hiện B → tính C khớp.",
    "refIssues": [
     "#246",
     "#217"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-002__s01__list",
      "caption": "Worklist LIS lọc theo BN trước khi chỉ định (baseline A)",
      "uiState": "list"
     },
     {
      "name": "TC-F-LAB-002__s02__form",
      "caption": "Tạo ServiceRequest 3 dịch vụ XN tại CLS",
      "uiState": "form"
     },
     {
      "name": "TC-F-LAB-002__s03__list",
      "caption": "Worklist LIS sau chỉ định, lọc BN (B = A+3)",
      "uiState": "list"
     },
     {
      "name": "TC-F-LAB-002__s04__detail",
      "caption": "Chi tiết 1 dòng worklist link ngược ServiceRequestDetail/MedicalRecord",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-LAB-003",
    "title": "Data-consistency: KQ duyệt ở LIS đồng bộ ngược về EMR (bệnh án) và Billing (tính tiền dịch vụ XN)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "KTV XN + Bác sĩ + Thu ngân",
    "preconditions": "Đã có phiếu XN tới bước có KQ chờ duyệt cho 1 BN viện phí.",
    "steps": [
     "Duyệt + trả 1 KQ XN (vd Glucose=7.8) tại LIS",
     "Mở bệnh án OPD BN → tab kết quả CLS, xác nhận giá trị KQ + thời điểm + người duyệt khớp với LIS",
     "Mở màn Viện phí/Billing của BN → xác nhận dịch vụ XN đã chỉ định nằm trong danh mục tính tiền, đúng đơn giá",
     "So khớp: 1 KQ ở LIS = 1 dòng KQ ở EMR = 1 dòng phí ở Billing (không lệch, không trùng)"
    ],
    "expected": "KQ ở LIS, EMR, Billing nhất quán: cùng giá trị/thời điểm/người duyệt; phí dịch vụ XN xuất hiện đúng 1 lần đúng đơn giá; không phát sinh phí ảo, không mất phí. Dedup mở rộng #249 (KQ LIS→EMR/Billing).",
    "refIssues": [
     "#249",
     "#217"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-003__s01__success",
      "caption": "Trả KQ Glucose=7.8 tại LIS",
      "uiState": "success"
     },
     {
      "name": "TC-F-LAB-003__s02__detail",
      "caption": "KQ hiển thị tại tab CLS trong bệnh án EMR",
      "uiState": "detail"
     },
     {
      "name": "TC-F-LAB-003__s03__list",
      "caption": "Dòng phí dịch vụ XN tại màn Billing đúng đơn giá",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-F-LAB-004",
    "title": "State-transition liên phân hệ: vòng đời mẫu/KQ (Chờ lấy mẫu→Đã nhận→Đang chạy→Có KQ→Đã duyệt→Đã trả); nút theo state",
    "category": "state",
    "priority": "P0",
    "role": "KTV XN + Bác sĩ XN",
    "preconditions": "Có phiếu XN ở trạng thái Chờ lấy mẫu.",
    "steps": [
     "Tại mỗi trạng thái, mở chi tiết phiếu/worklist và kiểm tra nút khả dụng đúng: Chờ lấy mẫu (chỉ Nhận mẫu/Hủy), Đã nhận (Đẩy máy/Lấy lại mẫu), Đang chạy (chờ HL7), Có KQ (Nhập/Sửa KQ, Duyệt), Đã duyệt (Trả KQ, Hủy duyệt), Đã trả (chỉ Xem, Hủy KQ có quyền)",
     "Lần lượt thực hiện các transition hợp lệ và xác nhận trạng thái + nút cập nhật đúng sau mỗi bước",
     "Sau khi 'Đã duyệt/đã ký' → xác nhận nút Sửa KQ bị KHÓA (chỉ Hủy duyệt mới mở lại)",
     "Thử transition không hợp lệ (vd Trả KQ khi chưa duyệt) → bị chặn"
    ],
    "expected": "Trạng thái chuyển đúng trình tự; nút bật/tắt theo state (đã-ký→khóa sửa); transition sai bị chặn với thông báo rõ. Bám checklist #246 (state mẫu/KQ; đã-ký→khóa).",
    "refIssues": [
     "#246"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-004__s01__detail",
      "caption": "Trạng thái Chờ lấy mẫu — chỉ nút Nhận mẫu/Hủy",
      "uiState": "detail"
     },
     {
      "name": "TC-F-LAB-004__s02__detail",
      "caption": "Trạng thái Đã nhận — nút Đẩy máy/Lấy lại mẫu",
      "uiState": "detail"
     },
     {
      "name": "TC-F-LAB-004__s03__detail",
      "caption": "Trạng thái Có KQ — nút Nhập/Duyệt",
      "uiState": "detail"
     },
     {
      "name": "TC-F-LAB-004__s04__detail",
      "caption": "Trạng thái Đã duyệt — nút Sửa KQ bị khóa",
      "uiState": "detail"
     },
     {
      "name": "TC-F-LAB-004__s05__error",
      "caption": "Chặn transition không hợp lệ (Trả KQ khi chưa duyệt)",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-LAB-005",
    "title": "Patient-safety: kết quả vượt ngưỡng nguy kịch sinh LabCriticalValueAlert + cảnh báo bác sĩ khám lại",
    "category": "data-consistency",
    "priority": "P0",
    "role": "KTV XN + Bác sĩ",
    "preconditions": "Có cấu hình LabCriticalValueConfigs (vd Kali criticalHigh=6.0). Phiếu XN Kali có KQ chờ nhập.",
    "steps": [
     "Nhập KQ Kali = 6.8 (vượt criticalHigh) → status='critical'",
     "Xác nhận hệ thống sinh LabCriticalValueAlert + hiển thị cảnh báo nguy kịch nổi bật tại màn LIS",
     "Trả KQ → mở bệnh án OPD, xác nhận KQ Kali hiển thị cờ critical (màu/icon) cho bác sĩ khám lại",
     "Xác nhận cảnh báo có audit (ai nhận biết/xử lý)"
    ],
    "expected": "KQ vượt ngưỡng được gắn status critical, sinh LabCriticalValueAlert, cảnh báo hiển thị rõ ở cả LIS và EMR; bác sĩ khám lại thấy cờ nguy kịch; có audit. An toàn người bệnh (P0).",
    "refIssues": [
     "#246",
     "#217"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-005__s01__form",
      "caption": "Nhập KQ Kali=6.8 vượt ngưỡng",
      "uiState": "form"
     },
     {
      "name": "TC-F-LAB-005__s02__toast",
      "caption": "Cảnh báo giá trị nguy kịch nổi bật tại LIS",
      "uiState": "toast"
     },
     {
      "name": "TC-F-LAB-005__s03__detail",
      "caption": "KQ Kali cờ critical hiển thị tại bệnh án OPD khám lại",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-LAB-006",
    "title": "Luồng phụ: hủy chỉ định XN ở CLS trước khi lấy mẫu → biến mất khỏi worklist LIS, không phát sinh phí",
    "category": "state",
    "priority": "P1",
    "role": "Bác sĩ + Thu ngân",
    "preconditions": "Phiếu XN vừa chỉ định, chưa nhận mẫu (Chờ lấy mẫu).",
    "steps": [
     "Tại CLS hủy 1 dịch vụ XN trong ServiceRequest (lý do bắt buộc)",
     "Mở worklist LIS → xác nhận dòng đó biến mất / chuyển trạng thái Đã hủy",
     "Mở Billing → xác nhận dịch vụ XN bị hủy KHÔNG còn dòng phí (hoặc chuyển hủy)",
     "Thử hủy 1 dịch vụ đã nhận mẫu/đang chạy → bị chặn hoặc yêu cầu luồng hủy-chuỗi"
    ],
    "expected": "Hủy trước lấy mẫu: dòng biến mất khỏi LIS + không phát sinh phí; hủy sau khi đã thực hiện bị chặn/điều hướng sang cancel-chain; lý do hủy ghi audit.",
    "refIssues": [
     "#246",
     "#249"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-006__s01__modal",
      "caption": "Modal hủy chỉ định XN (nhập lý do)",
      "uiState": "modal"
     },
     {
      "name": "TC-F-LAB-006__s02__list",
      "caption": "Worklist LIS — dòng đã biến mất/Đã hủy",
      "uiState": "list"
     },
     {
      "name": "TC-F-LAB-006__s03__error",
      "caption": "Chặn hủy khi mẫu đã nhận/đang chạy",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-LAB-007",
    "title": "Luồng phụ: hủy duyệt / hủy KQ sau khi đã duyệt (cancel-chain: cancel-approval → cancel-result → cancel-collection)",
    "category": "state",
    "priority": "P1",
    "role": "Bác sĩ XN (có quyền)",
    "preconditions": "Phiếu XN đã ở trạng thái Đã duyệt/Đã trả. API laboratory/cancel-chain khả dụng.",
    "steps": [
     "Mở KQ đã duyệt, chọn Hủy duyệt (cancel-approval) nhập lý do → trạng thái lùi về Có KQ chờ duyệt",
     "Tiếp tục Hủy kết quả (cancel-result) → lùi về Đang chạy/chờ KQ",
     "Hủy thu mẫu (cancel-collection) → lùi về Chờ lấy mẫu",
     "Mỗi bước xác nhận trạng thái lùi đúng + KQ ở EMR cập nhật ngược (KQ bị thu hồi không còn hiển thị là chính thức)",
     "Xác nhận mỗi thao tác hủy ghi audit + lý do"
    ],
    "expected": "Cancel-chain lùi trạng thái đúng từng nấc (duyệt→KQ→thu mẫu); KQ thu hồi đồng bộ ngược về EMR (không còn là KQ chính thức); audit + lý do đầy đủ; chỉ vai trò có quyền mới hủy được.",
    "refIssues": [
     "#246",
     "#249"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-007__s01__modal",
      "caption": "Modal hủy duyệt (cancel-approval) nhập lý do",
      "uiState": "modal"
     },
     {
      "name": "TC-F-LAB-007__s02__detail",
      "caption": "Trạng thái lùi về Có KQ sau hủy duyệt",
      "uiState": "detail"
     },
     {
      "name": "TC-F-LAB-007__s03__detail",
      "caption": "Lùi tiếp về Chờ lấy mẫu sau cancel-collection",
      "uiState": "detail"
     },
     {
      "name": "TC-F-LAB-007__s04__detail",
      "caption": "EMR cập nhật ngược — KQ bị thu hồi không còn chính thức",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-LAB-008",
    "title": "Integration HL7 LIS: máy XN trả kết quả qua HL7 + cập nhật realtime SignalR vào worklist",
    "category": "integration",
    "priority": "P0",
    "role": "KTV XN",
    "preconditions": "LabAnalyzers cấu hình HL7; phiếu đã đẩy máy (Đang chạy); SignalR hub kết nối.",
    "steps": [
     "Mô phỏng máy XN gửi bản tin HL7 kết quả (LabConnectionLogs ghi nhận)",
     "Không refresh trang — xác nhận worklist tự cập nhật KQ thô qua SignalR (LabRawResults)",
     "Đối chiếu giá trị HL7 parse đúng vào đúng phiếu/đúng thông số (LisTestParameters)",
     "Kiểm tra LabConnectionLogs ghi log kết nối + bản tin"
    ],
    "expected": "KQ HL7 parse đúng thông số/đúng phiếu; worklist cập nhật realtime không cần F5; log kết nối ghi đầy đủ. Integration HL7/SignalR (mở rộng #249).",
    "refIssues": [
     "#249"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-008__s01__loading",
      "caption": "Worklist Đang chạy chờ KQ từ máy",
      "uiState": "loading"
     },
     {
      "name": "TC-F-LAB-008__s02__list",
      "caption": "Worklist tự cập nhật KQ realtime (SignalR) không F5",
      "uiState": "list"
     },
     {
      "name": "TC-F-LAB-008__s03__detail",
      "caption": "LabConnectionLogs ghi bản tin HL7",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-LAB-009",
    "title": "Integration ngoại lệ: mất kết nối máy XN / HL7 timeout giữa chừng → fallback + cho nhập tay, không treo",
    "category": "integration",
    "priority": "P1",
    "role": "KTV XN",
    "preconditions": "Phiếu đang chạy; mô phỏng máy XN ngắt kết nối / HL7 không phản hồi.",
    "steps": [
     "Đẩy phiếu sang máy rồi mô phỏng ngắt kết nối/timeout",
     "Xác nhận UI báo lỗi kết nối rõ ràng (không spinner vĩnh viễn), LabConnectionLogs ghi lỗi",
     "Xác nhận có fallback: KTV được phép nhập KQ tay (manual) thay vì chờ máy",
     "Khôi phục kết nối → retry đồng bộ KQ, không trùng lặp"
    ],
    "expected": "Mất kết nối/timeout xử lý graceful: báo lỗi rõ, không treo, cho nhập tay fallback, retry không nhân đôi KQ. Bám #249 (PACS/LIS mất kết nối → fallback).",
    "refIssues": [
     "#249"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-009__s01__error",
      "caption": "UI báo lỗi mất kết nối máy XN/HL7 timeout",
      "uiState": "error"
     },
     {
      "name": "TC-F-LAB-009__s02__form",
      "caption": "Fallback nhập KQ tay khi máy mất kết nối",
      "uiState": "form"
     },
     {
      "name": "TC-F-LAB-009__s03__success",
      "caption": "Retry sau khôi phục kết nối, không trùng KQ",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-LAB-010",
    "title": "Validation nhập kết quả: số ngoài dải hợp lệ, sai đơn vị, bỏ trống bắt buộc, ký tự lạ",
    "category": "validation",
    "priority": "P1",
    "role": "KTV XN",
    "preconditions": "Phiếu XN ở trạng thái Có KQ, mở form nhập kết quả số.",
    "steps": [
     "Bỏ trống ô KQ bắt buộc rồi bấm Lưu → báo lỗi required",
     "Nhập chữ/ký tự lạ vào ô số (vd 'abc') → báo lỗi định dạng số",
     "Nhập giá trị âm/ngoài dải vật lý hợp lý (vd Glucose=-5) → cảnh báo/chặn",
     "Nhập số hợp lệ → so với LabReferenceRanges gắn cờ normal/high/low đúng"
    ],
    "expected": "Validation FE+BE nhất quán: required/format/range chặn đúng, thông báo tiếng Việt có dấu rõ; giá trị hợp lệ gắn cờ tham chiếu đúng. Không tin client input.",
    "refIssues": [
     "#246"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-010__s01__validation",
      "caption": "Lỗi required khi bỏ trống ô KQ",
      "uiState": "validation"
     },
     {
      "name": "TC-F-LAB-010__s02__validation",
      "caption": "Lỗi định dạng khi nhập ký tự lạ",
      "uiState": "validation"
     },
     {
      "name": "TC-F-LAB-010__s03__validation",
      "caption": "Cảnh báo giá trị ngoài dải vật lý",
      "uiState": "validation"
     },
     {
      "name": "TC-F-LAB-010__s04__detail",
      "caption": "Giá trị hợp lệ gắn cờ tham chiếu (high/low/normal)",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-LAB-011",
    "title": "Permission: phân quyền KTV vs Bác sĩ vs vai trò khác trên các thao tác LIS",
    "category": "permission",
    "priority": "P1",
    "role": "KTV XN / Bác sĩ XN / vai trò không liên quan",
    "preconditions": "Có tài khoản các vai trò khác nhau (hoặc cấu hình role test).",
    "steps": [
     "Đăng nhập vai trò KTV: được nhận mẫu/nhập KQ, KHÔNG được duyệt cuối (tùy cấu hình)",
     "Đăng nhập vai trò Bác sĩ XN: được duyệt/hủy duyệt KQ",
     "Đăng nhập vai trò không liên quan (vd Thu ngân): không thấy nút thao tác LIS hoặc bị chặn",
     "Xác nhận nút/endpoint chặn đúng theo quyền (cả ẩn UI lẫn 403 từ BE)"
    ],
    "expected": "Mỗi vai trò chỉ làm được đúng thao tác cho phép; UI ẩn nút + BE trả 403 cho thao tác ngoài quyền (không chỉ ẩn UI). Khóa sau ký áp dụng cho mọi vai trò.",
    "refIssues": [
     "#246"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-011__s01__permission",
      "caption": "KTV: có nút nhập KQ, không có nút duyệt cuối",
      "uiState": "permission"
     },
     {
      "name": "TC-F-LAB-011__s02__permission",
      "caption": "Bác sĩ XN: có nút duyệt/hủy duyệt",
      "uiState": "permission"
     },
     {
      "name": "TC-F-LAB-011__s03__error",
      "caption": "Vai trò không liên quan bị chặn 403 thao tác LIS",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-LAB-012",
    "title": "Security IDOR/anonymous: truy cập KQ XN/orderId của BN khác + link tra KQ (LabResultAccessLinks)",
    "category": "security",
    "priority": "P0",
    "role": "Người dùng đăng nhập + ẩn danh",
    "preconditions": "Có 2 BN A và B với phiếu XN; biết orderId/serviceRequestDetailId của B; có 1 LabResultAccessLink.",
    "steps": [
     "Đăng nhập tài khoản chỉ có quyền BN A, gọi API KQ với orderId của BN B (đổi id trên URL) → kỳ vọng 403/404, không lộ dữ liệu",
     "Thử cancel-approval/cancel-result trên orderId BN B với tài khoản không sở hữu → bị chặn",
     "Truy cập link tra KQ (LabResultAccessLinks) khi không đăng nhập: chỉ link hợp lệ + còn hạn mới mở; link sai/hết hạn → từ chối",
     "Thử path-traversal / id rác trên endpoint KQ → 400/404, không 500 lộ stack"
    ],
    "expected": "Không IDOR: id BN khác → 403/404 không lộ dữ liệu; mutation cross-BN bị chặn; link tra KQ chỉ mở khi hợp lệ+còn hạn; id rác/path lạ trả 400/404 không lộ stack. Audit truy cập trái phép.",
    "refIssues": [
     "#217"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-012__s01__error",
      "caption": "Gọi KQ orderId BN khác bị 403/404",
      "uiState": "error"
     },
     {
      "name": "TC-F-LAB-012__s02__error",
      "caption": "Cancel cross-BN bị chặn",
      "uiState": "error"
     },
     {
      "name": "TC-F-LAB-012__s03__error",
      "caption": "Link tra KQ sai/hết hạn bị từ chối",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-LAB-013",
    "title": "UI states: worklist LIS empty/loading/error + responsive + dark mode + tiếng Việt có dấu",
    "category": "ui",
    "priority": "P2",
    "role": "KTV XN",
    "preconditions": "Có thể tạo điều kiện worklist rỗng (lọc ngày không có phiếu) và lỗi API (chặn mạng).",
    "steps": [
     "Mở worklist khi đang tải → trạng thái loading (skeleton/spinner)",
     "Lọc về điều kiện không có phiếu → trạng thái empty với thông báo tiếng Việt",
     "Chặn API → trạng thái error có nút thử lại",
     "Bật dark mode (toggle) → kiểm tra tương phản, không chữ-trắng-nền-trắng; nhãn tiếng Việt có dấu đầy đủ",
     "Thu nhỏ màn hình (responsive) → bảng/worklist không vỡ layout"
    ],
    "expected": "Đủ 4 trạng thái loading/empty/error/success; dark mode tương phản đạt, không lỗi hiển thị; tiếng Việt có dấu đúng; responsive không vỡ. Bám core-error-loading-state + dark/light parity.",
    "refIssues": [
     "#246"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-013__s01__loading",
      "caption": "Worklist trạng thái loading",
      "uiState": "loading"
     },
     {
      "name": "TC-F-LAB-013__s02__empty",
      "caption": "Worklist trạng thái empty (không có phiếu)",
      "uiState": "empty"
     },
     {
      "name": "TC-F-LAB-013__s03__error",
      "caption": "Worklist trạng thái error + nút thử lại",
      "uiState": "error"
     },
     {
      "name": "TC-F-LAB-013__s04__list",
      "caption": "Worklist dark mode tương phản + tiếng Việt có dấu",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-F-LAB-014",
    "title": "Edge/boundary: KQ tại đúng ngưỡng tham chiếu/nguy kịch; mẫu trùng/lấy lại; kết quả định tính",
    "category": "edge",
    "priority": "P2",
    "role": "KTV XN",
    "preconditions": "Cấu hình LabReferenceRanges + LabCriticalValueConfigs đã có ngưỡng cụ thể.",
    "steps": [
     "Nhập KQ đúng = giá trị biên trên tham chiếu → kiểm tra phân loại normal/high đúng quy ước biên",
     "Nhập KQ đúng = criticalHigh chính xác → kiểm tra có/không gắn critical theo quy ước >= hay >",
     "Lấy lại mẫu (recollect) cho phiếu đã nhận → mẫu cũ vô hiệu, mẫu mới thay thế, không nhân KQ",
     "Nhập KQ định tính (Dương tính/Âm tính) thay vì số → lưu + hiển thị đúng"
    ],
    "expected": "Phân loại tại biên đúng quy ước (>= vs >); lấy lại mẫu thay thế sạch không trùng KQ; KQ định tính lưu/hiển thị đúng. Không lỗi off-by-one tại ngưỡng.",
    "refIssues": [
     "#246"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-014__s01__detail",
      "caption": "KQ tại biên tham chiếu phân loại đúng",
      "uiState": "detail"
     },
     {
      "name": "TC-F-LAB-014__s02__detail",
      "caption": "KQ đúng ngưỡng nguy kịch theo quy ước biên",
      "uiState": "detail"
     },
     {
      "name": "TC-F-LAB-014__s03__modal",
      "caption": "Lấy lại mẫu (recollect) thay thế mẫu cũ",
      "uiState": "modal"
     },
     {
      "name": "TC-F-LAB-014__s04__form",
      "caption": "Nhập KQ định tính Dương/Âm tính",
      "uiState": "form"
     }
    ]
   },
   {
    "id": "TC-F-LAB-015",
    "title": "Negative: từ chối mẫu không đạt (vỡ hồng cầu/sai ống/thiếu thể tích) → yêu cầu lấy lại, không cho chạy máy",
    "category": "negative",
    "priority": "P1",
    "role": "KTV XN",
    "preconditions": "Phiếu XN ở trạng thái Đã nhận mẫu.",
    "steps": [
     "Tại SampleReceive/worklist chọn Từ chối mẫu, chọn lý do (vỡ hồng cầu/sai ống/thiếu thể tích)",
     "Xác nhận mẫu chuyển trạng thái Bị từ chối + không thể đẩy máy",
     "Worklist yêu cầu lấy lại mẫu cho dịch vụ đó",
     "Đối chiếu OPD/CLS: bác sĩ/điều dưỡng thấy yêu cầu lấy lại mẫu (đồng bộ ngược)",
     "Lý do từ chối ghi audit"
    ],
    "expected": "Mẫu bị từ chối không được chạy máy; hệ thống yêu cầu lấy lại mẫu; thông tin đồng bộ ngược về CLS/khoa lâm sàng; lý do + audit đầy đủ.",
    "refIssues": [
     "#246",
     "#249"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-015__s01__modal",
      "caption": "Modal từ chối mẫu chọn lý do",
      "uiState": "modal"
     },
     {
      "name": "TC-F-LAB-015__s02__detail",
      "caption": "Mẫu trạng thái Bị từ chối, không đẩy máy được",
      "uiState": "detail"
     },
     {
      "name": "TC-F-LAB-015__s03__list",
      "caption": "Worklist yêu cầu lấy lại mẫu",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-F-LAB-016",
    "title": "Data-consistency vi sinh + an toàn truyền máu liên phân hệ (nuôi cấy → kháng sinh đồ; nhóm máu trước phát máu)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "KTV vi sinh + Bác sĩ",
    "preconditions": "Có phiếu nuôi cấy vi sinh (MicrobiologyCultures) và 1 BN cần định nhóm máu (related blood/safety).",
    "steps": [
     "Nhập kết quả nuôi cấy + phát hiện vi sinh vật (MicrobiologyOrganismFindings)",
     "Nhập kháng sinh đồ (AntibioticSensitivityResults) S/I/R cho từng kháng sinh",
     "Xác nhận KQ vi sinh đồng bộ về bệnh án OPD đúng vi khuẩn + mức nhạy cảm",
     "Với BN cần truyền máu: xác nhận KQ định nhóm máu hiển thị + bắt buộc trước khi phát máu (an toàn nhóm máu); thử phát máu khi chưa có nhóm máu → bị chặn"
    ],
    "expected": "KQ vi sinh (vi khuẩn + kháng sinh đồ S/I/R) đồng bộ đúng về EMR; KQ nhóm máu là điều kiện bắt buộc trước phát máu — thiếu nhóm máu chặn phát máu (an toàn người bệnh). Bám checklist máu #246.",
    "refIssues": [
     "#246",
     "#217"
    ],
    "evidence": [
     {
      "name": "TC-F-LAB-016__s01__form",
      "caption": "Nhập kháng sinh đồ S/I/R",
      "uiState": "form"
     },
     {
      "name": "TC-F-LAB-016__s02__detail",
      "caption": "KQ vi sinh đồng bộ về bệnh án OPD",
      "uiState": "detail"
     },
     {
      "name": "TC-F-LAB-016__s03__error",
      "caption": "Chặn phát máu khi chưa có KQ nhóm máu",
      "uiState": "error"
     }
    ]
   }
  ],
  "gaps": [
   "Không xác minh được route /v2 cụ thể cho từng màn LIS trong App.tsx (dùng lazy import, grep path không khớp); người chạy test cần mở menu TerminalLayout để lấy đường dẫn chính xác cho Laboratory/SampleReceive/Microbiology/LabQC.",
   "Quy ước ngưỡng nguy kịch (>= hay >) tại LabCriticalValueConfigs chưa đọc code BE để chốt — TC-F-LAB-014 cần xác nhận quy ước biên trước khi assert.",
   "Phân quyền vai trò LIS cụ thể (KTV được/không được duyệt cuối) phụ thuộc cấu hình Roles/Permissions thực tế — TC-F-LAB-011 nêu giả định, cần xác nhận với cấu hình seed quyền hiện hành.",
   "Cơ chế đồng bộ ngược KQ→Billing (tự sinh phí khi chỉ định hay khi trả KQ) chưa đọc BillingCompleteService để chốt thời điểm phát sinh phí — TC-F-LAB-003 cần xác minh thời điểm.",
   "Luồng khám lại (bước 5 = opd) trong data.js chỉ là 'Khám lại' chung; chưa rõ có màn riêng hay tái dùng màn khám OPD — test giả định tái dùng bệnh án OPD.",
   "Seed dữ liệu dev ổn định cho HL7 mô phỏng (LabAnalyzers + bản tin) cần chuẩn bị; nếu không có máy thật, TC-F-LAB-008/009 phải dùng mock HL7 — cần xác nhận harness mô phỏng HL7 sẵn có (#212/#213)."
  ]
 },
 {
  "id": "imaging",
  "code": "F-IMG",
  "ic": "🩻",
  "layer": "clin",
  "nm": "Chẩn đoán hình ảnh (RIS/PACS)",
  "gh": [
   "#246",
   "#250"
  ],
  "flow_id": "imaging",
  "summary": "Luồng \"Chẩn đoán hình ảnh (RIS/PACS)\" (id=imaging) trong data.js: desc \"BN chỉ định CĐHA → chụp → đọc KQ → duyệt → về\", steps = [[\"Chỉ định\",\"cls\"],[\"Chụp (DICOM)\",\"ris\"],[\"Đọc & ký KQ\",\"ris\"],[\"Khám lại\",\"opd\"]], related = [cls, lab, emr]. Đối chiếu code thật: phân hệ cls = ServiceRequests/ServiceRequestDetails (Chỉ định dịch vụ CLS), ris = RadiologyRequests→RadiologyExams→DicomStudies(PACS)→RadiologyReports(ký số) qua RISCompleteController (api/RISComplete) + RadiologyDispatchController (điều phối phòng) + DevLinkRadiologyController. FE v2: Radiology.tsx (hàng đợi/gọi BN/nhập KQ/duyệt/ký), RadiologyOps.tsx, RisDispatcher.tsx, DicomViewer.tsx (Cornerstone3D), DicomAutoSend.tsx, NonDicomCapture.tsx, DicomStudyAuditLog.tsx, RisAdmin/RisCatalogAdmin, ServiceRequeue.tsx. Endpoint chính xác minh: POST requests, GET waiting-list, POST call-patient, POST orders/{id}/start, orders/{id}/complete, POST results/enter, PUT results/{id}, POST results/{id}/preliminary-approve, results/{id}/final-approve, results/{id}/cancel-approval, POST results/sign, results/cancel-signed, POST hl7-cda/reports/{id}/send-result + cancel-result, POST dicom/send, reports/revenue/statistics/export, results/{id}/share-qr (QR), pacs-connections/{id}/status. Test plan dưới đây gồm 16 task E2E xuyên phân hệ (cls→ris→emr/opd), bám đúng chuỗi 4 bước, phủ happy/negative/edge/validation/permission/state-transition/data-consistency/ui/integration(DICOM/HL7-CDA/SignalR/QR)/security(IDOR/anonymous/XSS). Evidence chụp tại MỌI điểm chuyển màn. Đã dedup với #246/#250 (E2E #217) qua refIssues.",
  "tasks": [
   {
    "id": "TC-F-IMG-001",
    "title": "Happy-path E2E xuyên phân hệ: Chỉ định CĐHA (CLS) → chụp (DICOM) → đọc & ký KQ (RIS) → khám lại (OPD)",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ khám + KTV CĐHA + Bác sĩ CĐHA",
    "preconditions": "Đăng nhập admin/Admin@123 (JWT localStorage token+user). Có 1 BN với MedicalRecord đang khám tại OPD. BE localhost:5106 chạy, PACS Orthanc kết nối OK (pacs-connections status = connected).",
    "steps": [
     "Tại /v2 màn khám OPD của BN, tạo chỉ định dịch vụ CLS loại CĐHA (vd X-quang ngực) → ServiceRequest + ServiceRequestDetail phát sinh, POST api/RISComplete/requests tạo RadiologyRequest tương ứng",
     "Mở RIS Radiology (/v2/radiology), kiểm tra GET waiting-list hiển thị BN ở trạng thái Chờ chụp",
     "Gọi BN: POST call-patient → trạng thái chuyển Đã gọi, SignalR đẩy lên màn hình hàng đợi phòng",
     "Bắt đầu chụp: POST orders/{orderId}/start → trạng thái Đang thực hiện",
     "Hoàn tất chụp + DICOM study về PACS: POST orders/{orderId}/complete → trạng thái Đã chụp, DicomStudies gắn vào order",
     "Nhập kết quả đọc: POST results/enter (chọn template theo loại DV), lưu PUT results/{resultId}",
     "Duyệt sơ bộ POST results/{resultId}/preliminary-approve → duyệt cuối POST results/{resultId}/final-approve",
     "Ký số kết quả: POST results/sign → RadiologyReport ở trạng thái Đã ký",
     "Gửi kết quả HL7/CDA: POST hl7-cda/reports/{reportId}/send-result",
     "Quay lại OPD khám lại: bác sĩ mở bệnh án, thấy KQ CĐHA đã ký hiển thị trong tab kết quả CLS để khám lại"
    ],
    "expected": "Toàn chuỗi 4 bước (cls→ris→ris→opd) thông suốt, mỗi mutation ghi audit; trạng thái RadiologyRequest đi đúng Chờ chụp→Đã gọi→Đang thực hiện→Đã chụp→Đã đọc→Duyệt sơ bộ→Duyệt cuối→Đã ký; KQ đã ký quay về đúng bệnh án/BN ở OPD.",
    "evidence": [
     {
      "name": "TC-F-IMG-001__s01__form",
      "caption": "Form chỉ định CĐHA tại màn khám OPD",
      "uiState": "form"
     },
     {
      "name": "TC-F-IMG-001__s02__list",
      "caption": "Hàng đợi RIS hiển thị BN trạng thái Chờ chụp",
      "uiState": "list"
     },
     {
      "name": "TC-F-IMG-001__s03__toast",
      "caption": "Gọi BN thành công (SignalR cập nhật hàng đợi)",
      "uiState": "toast"
     },
     {
      "name": "TC-F-IMG-001__s04__detail",
      "caption": "Order chuyển Đang thực hiện sau khi bắt đầu chụp",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMG-001__s05__detail",
      "caption": "Order Đã chụp + DICOM study gắn vào",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMG-001__s06__form",
      "caption": "Form nhập kết quả đọc theo template",
      "uiState": "form"
     },
     {
      "name": "TC-F-IMG-001__s07__success",
      "caption": "Duyệt sơ bộ + duyệt cuối thành công",
      "uiState": "success"
     },
     {
      "name": "TC-F-IMG-001__s08__success",
      "caption": "Ký số kết quả thành công, report Đã ký",
      "uiState": "success"
     },
     {
      "name": "TC-F-IMG-001__s09__detail",
      "caption": "KQ CĐHA đã ký hiển thị tại tab CLS bệnh án OPD khi khám lại",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#217",
     "#246",
     "#250"
    ],
    "notes": "Đây là xương sống E2E xuyên phân hệ cls→ris→ris→opd. Bám đúng 4 step của FLOWS.imaging."
   },
   {
    "id": "TC-F-IMG-002",
    "title": "Data-consistency liên phân hệ: tạo chỉ định CLS (A) → hiển thị trong hàng đợi RIS (B) → đếm/đồng bộ trạng thái order (C)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ + KTV CĐHA",
    "preconditions": "Đăng nhập admin. BN có MedicalRecord. Hàng đợi RIS đang có N order.",
    "steps": [
     "Tạo 1 ServiceRequestDetail loại CĐHA tại OPD (A) → ghi nhận serviceRequestId/orderId",
     "Mở RIS waiting-list (B): xác nhận xuất hiện đúng 1 dòng mới với đúng tên BN, đúng dịch vụ, đúng phòng/modality",
     "Bắt đầu + hoàn tất chụp, nhập + duyệt KQ; reload GET orders và GET waiting-list (C): order biến mất khỏi hàng đợi Chờ chụp và tổng đếm KPI strip giảm/tăng đúng",
     "Đối chiếu GET reports/statistics: số ca đã thực hiện tăng đúng 1; ServiceRequestDetail ở CLS chuyển trạng thái Đã thực hiện đồng bộ với RIS"
    ],
    "expected": "Số liệu nhất quán 3 lớp: chỉ định CLS (A) đẻ đúng 1 order RIS (B); sau hoàn tất, KPI/thống kê + trạng thái ServiceRequestDetail (C) đồng bộ, không lệch đếm, không trùng dòng, không mồ côi.",
    "evidence": [
     {
      "name": "TC-F-IMG-002__s01__form",
      "caption": "Tạo chỉ định CLS CĐHA (A)",
      "uiState": "form"
     },
     {
      "name": "TC-F-IMG-002__s02__list",
      "caption": "Hàng đợi RIS phát sinh đúng 1 dòng (B)",
      "uiState": "list"
     },
     {
      "name": "TC-F-IMG-002__s03__detail",
      "caption": "KPI strip + thống kê cập nhật đúng sau hoàn tất (C)",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMG-002__s04__detail",
      "caption": "Trạng thái ServiceRequestDetail tại CLS đồng bộ Đã thực hiện",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246"
    ],
    "notes": "Mô hình tạo A → hiện B → tính C xuyên cls↔ris."
   },
   {
    "id": "TC-F-IMG-003",
    "title": "State-transition liên phân hệ: vòng đời RadiologyRequest qua các trạng thái + chặn nhảy cóc",
    "category": "state",
    "priority": "P0",
    "role": "KTV CĐHA + Bác sĩ CĐHA",
    "preconditions": "Có order RIS ở trạng thái Chờ chụp.",
    "steps": [
     "Thử final-approve khi chưa nhập KQ → phải bị chặn",
     "Thử ký (results/sign) khi chưa final-approve → phải bị chặn",
     "Đi đúng thứ tự: complete chụp → enter KQ → preliminary-approve → final-approve → sign, kiểm tra mỗi bước trạng thái đổi đúng",
     "Thử start lại order đã complete → bị chặn (không lùi trạng thái)"
    ],
    "expected": "Chỉ cho phép chuyển trạng thái theo đúng máy trạng thái Chờ chụp→Đang thực hiện→Đã chụp→Đã đọc→Duyệt sơ bộ→Duyệt cuối→Đã ký; mọi nhảy cóc/đi lùi bị chặn với thông báo rõ; không vỡ dữ liệu.",
    "evidence": [
     {
      "name": "TC-F-IMG-003__s01__error",
      "caption": "Chặn final-approve khi chưa có KQ",
      "uiState": "error"
     },
     {
      "name": "TC-F-IMG-003__s02__error",
      "caption": "Chặn ký khi chưa duyệt cuối",
      "uiState": "error"
     },
     {
      "name": "TC-F-IMG-003__s03__detail",
      "caption": "Trạng thái chuyển đúng theo từng bước",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMG-003__s04__error",
      "caption": "Chặn start lại order đã hoàn tất",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#250"
    ],
    "notes": ""
   },
   {
    "id": "TC-F-IMG-004",
    "title": "Integration DICOM/PACS: study từ modality về Orthanc, gắn order, mở DicomViewer (Cornerstone3D)",
    "category": "integration",
    "priority": "P0",
    "role": "KTV CĐHA + Bác sĩ CĐHA",
    "preconditions": "PACS Orthanc kết nối (pacs-connections/{id}/status connected). Có order Đã chụp với DICOM study (studyInstanceUID).",
    "steps": [
     "Tại RIS, gửi worklist tới modality: POST modalities/worklist/send → BN có trên modality worklist",
     "Sau chụp, DICOM study về PACS, gắn vào order; mở viewer /v2/radiology/viewer?study={uid}",
     "Trong DicomViewer kiểm tra ảnh load qua wadouri imageIds từ PACS proxy; thao tác window/level, zoom, pan, cine",
     "Gửi DICOM sang server ngoài: POST dicom/send → trạng thái auto-send chuyển Đã gửi"
    ],
    "expected": "Worklist đẩy được sang modality; study đúng UID về PACS và gắn đúng order/BN; viewer hiển thị đúng ảnh, công cụ hoạt động; dicom/send gửi thành công và phản ánh trên DicomAutoSend.",
    "evidence": [
     {
      "name": "TC-F-IMG-004__s01__success",
      "caption": "Đẩy worklist tới modality thành công",
      "uiState": "success"
     },
     {
      "name": "TC-F-IMG-004__s02__detail",
      "caption": "DicomViewer load study đúng UID",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMG-004__s03__detail",
      "caption": "Công cụ window/level/zoom/cine hoạt động",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMG-004__s04__success",
      "caption": "Auto-send DICOM sang server ngoài thành công",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#217"
    ],
    "notes": "Phân hệ ris + tích hợp DICOM PACS Orthanc."
   },
   {
    "id": "TC-F-IMG-005",
    "title": "Integration HL7/CDA: gửi kết quả CĐHA đã ký → và hủy kết quả đã gửi (cancel-result)",
    "category": "integration",
    "priority": "P1",
    "role": "Bác sĩ CĐHA",
    "preconditions": "Có RadiologyReport đã ký (TC-F-IMG-001 tới bước ký).",
    "steps": [
     "POST hl7-cda/reports/{reportId}/send-result → trạng thái gửi HL7/CDA = Đã gửi",
     "Kiểm tra log/audit ghi nhận lần gửi",
     "Hủy kết quả đã gửi: POST hl7-cda/reports/{reportId}/cancel-result → trạng thái về Đã hủy gửi",
     "Thử send-result lại với reportId chưa ký → bị chặn"
    ],
    "expected": "Gửi/hủy HL7-CDA đổi trạng thái đúng, ghi audit; không cho gửi report chưa ký.",
    "evidence": [
     {
      "name": "TC-F-IMG-005__s01__success",
      "caption": "Gửi HL7/CDA kết quả thành công",
      "uiState": "success"
     },
     {
      "name": "TC-F-IMG-005__s02__detail",
      "caption": "Audit ghi nhận lần gửi",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMG-005__s03__confirm",
      "caption": "Hủy kết quả đã gửi (cancel-result)",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-IMG-005__s04__error",
      "caption": "Chặn gửi report chưa ký",
      "uiState": "error"
     }
    ],
    "refIssues": [],
    "notes": "related.emr — ký số + gửi CDA."
   },
   {
    "id": "TC-F-IMG-006",
    "title": "Integration SignalR realtime: gọi BN ở RIS → cập nhật tức thời màn hình hàng đợi phòng",
    "category": "integration",
    "priority": "P1",
    "role": "KTV CĐHA",
    "preconditions": "Mở đồng thời màn RIS điều phối và màn hiển thị hàng đợi phòng (display-config theo roomId).",
    "steps": [
     "Cấu hình hiển thị phòng: PUT rooms/{roomId}/display-config",
     "Tại RIS, POST call-patient cho BN tiếp theo",
     "Quan sát màn hình hàng đợi phòng (SignalR) cập nhật số/tên BN được gọi mà không cần reload",
     "Mất kết nối SignalR tạm thời → kiểm tra fallback polling vẫn cập nhật"
    ],
    "expected": "Gọi BN đẩy realtime qua SignalR lên màn hiển thị phòng; khi rớt kết nối có fallback polling, không kẹt số.",
    "evidence": [
     {
      "name": "TC-F-IMG-006__s01__form",
      "caption": "Cấu hình display-config phòng",
      "uiState": "form"
     },
     {
      "name": "TC-F-IMG-006__s02__toast",
      "caption": "Gọi BN tại RIS",
      "uiState": "toast"
     },
     {
      "name": "TC-F-IMG-006__s03__detail",
      "caption": "Màn hàng đợi phòng cập nhật realtime",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMG-006__s04__loading",
      "caption": "Fallback polling khi mất SignalR",
      "uiState": "loading"
     }
    ],
    "refIssues": [],
    "notes": ""
   },
   {
    "id": "TC-F-IMG-007",
    "title": "Negative/luồng ngoại lệ: hủy KQ đã ký (cancel-signed) + hủy duyệt (cancel-approval) giữa chừng",
    "category": "negative",
    "priority": "P1",
    "role": "Bác sĩ CĐHA",
    "preconditions": "Có report đã final-approve và đã ký.",
    "steps": [
     "Hủy duyệt khi đã final-approve nhưng CHƯA ký: POST results/{resultId}/cancel-approval → về trạng thái đọc, ghi lý do",
     "Với report đã ký: POST results/cancel-signed → hủy chữ ký, ghi audit + lý do",
     "Sau cancel-signed, kiểm tra KQ ở OPD không còn là Đã ký (data-consistency ngược)",
     "Thử cancel-signed khi report đã gửi CDA → kiểm tra ràng buộc (chặn hoặc cảnh báo phải cancel-result trước)"
    ],
    "expected": "Hủy duyệt/hủy ký yêu cầu lý do, đổi trạng thái lùi đúng, ghi audit; trạng thái ở OPD đồng bộ ngược; ràng buộc với report đã gửi CDA được xử lý rõ ràng.",
    "evidence": [
     {
      "name": "TC-F-IMG-007__s01__modal",
      "caption": "Modal nhập lý do hủy duyệt",
      "uiState": "modal"
     },
     {
      "name": "TC-F-IMG-007__s02__confirm",
      "caption": "Xác nhận hủy chữ ký",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-IMG-007__s03__detail",
      "caption": "OPD đồng bộ trạng thái không còn Đã ký",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMG-007__s04__error",
      "caption": "Ràng buộc khi report đã gửi CDA",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#250"
    ],
    "notes": "Luồng hủy/hoàn/lỗi giữa chừng."
   },
   {
    "id": "TC-F-IMG-008",
    "title": "Validation nhập kết quả đọc: trường bắt buộc, template theo loại DV/giới tính, chống nhập rỗng",
    "category": "validation",
    "priority": "P1",
    "role": "Bác sĩ CĐHA",
    "preconditions": "Có order Đã chụp chờ nhập KQ.",
    "steps": [
     "Mở form nhập KQ, bỏ trống mô tả/kết luận → submit → hiển thị lỗi trường bắt buộc",
     "Chọn template không khớp loại dịch vụ → kiểm tra GET templates/by-service-type lọc đúng",
     "Đổi template giữa chừng (results/change-template) khi đã nhập dở → cảnh báo mất nội dung",
     "Nhập KQ hợp lệ + đính kèm ảnh (results/attach-image) → lưu thành công"
    ],
    "expected": "FE+BE cùng validate trường bắt buộc; template lọc đúng theo service-type/gender; đổi template cảnh báo; lưu KQ hợp lệ + ảnh đính kèm OK.",
    "evidence": [
     {
      "name": "TC-F-IMG-008__s01__validation",
      "caption": "Báo lỗi trường KQ bắt buộc bỏ trống",
      "uiState": "validation"
     },
     {
      "name": "TC-F-IMG-008__s02__dropdown",
      "caption": "Dropdown template lọc đúng theo loại DV",
      "uiState": "dropdown"
     },
     {
      "name": "TC-F-IMG-008__s03__confirm",
      "caption": "Cảnh báo đổi template khi đã nhập dở",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-IMG-008__s04__success",
      "caption": "Lưu KQ hợp lệ + đính kèm ảnh",
      "uiState": "success"
     }
    ],
    "refIssues": [],
    "notes": ""
   },
   {
    "id": "TC-F-IMG-009",
    "title": "Permission/phân quyền: KTV vs Bác sĩ đọc vs Admin trên thao tác chụp/đọc/ký/duyệt",
    "category": "permission",
    "priority": "P0",
    "role": "KTV CĐHA / Bác sĩ CĐHA / role không quyền",
    "preconditions": "Có tài khoản các vai trò khác nhau (hoặc kiểm qua RadiologyDispatch permissions).",
    "steps": [
     "Đăng nhập role KTV (không quyền ký) → thử results/sign → bị chặn 403, nút ký ẩn/disabled",
     "Đăng nhập role không thuộc RIS → mở /v2/radiology → không thấy menu / bị chặn route",
     "Kiểm tra phân quyền phòng: RadiologyDispatch permissions/user/{userId} chỉ cho thao tác phòng được gán",
     "Admin thực hiện đầy đủ → cho phép"
    ],
    "expected": "Quyền ký/duyệt/điều phối tách theo vai trò; thao tác ngoài quyền bị chặn ở cả UI (ẩn nút) và API (403); không lộ chức năng.",
    "evidence": [
     {
      "name": "TC-F-IMG-009__s01__permission",
      "caption": "KTV bị chặn thao tác ký số",
      "uiState": "permission"
     },
     {
      "name": "TC-F-IMG-009__s02__error",
      "caption": "Role không thuộc RIS bị chặn route",
      "uiState": "error"
     },
     {
      "name": "TC-F-IMG-009__s03__detail",
      "caption": "Phân quyền phòng theo user",
      "uiState": "detail"
     }
    ],
    "refIssues": [],
    "notes": ""
   },
   {
    "id": "TC-F-IMG-010",
    "title": "Security IDOR: truy cập order/report/DICOM study của BN khác bằng cách đổi id",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ CĐHA (tài khoản hợp lệ)",
    "preconditions": "Có 2 BN với order/report riêng. Bắt được orderId/reportId/studyUID của BN khác.",
    "steps": [
     "Gọi GET orders/{orderId} với orderId của BN không thuộc phạm vi user → kiểm tra bị chặn/không lộ dữ liệu",
     "Gọi reports/{reportId}/print-signed với reportId người khác → chặn",
     "Mở viewer với study UID người khác (?study=UID) → chặn truy cập trái phép PACS proxy",
     "Thử results/{resultId}/share-qr rồi truy cập QR công khai → kiểm tra link QR có giới hạn/thời hạn, không IDOR sang report khác"
    ],
    "expected": "Mọi truy cập theo id bị kiểm tra chủ sở hữu/quyền; không IDOR; link QR chia sẻ có phạm vi giới hạn và không suy đoán được report khác.",
    "evidence": [
     {
      "name": "TC-F-IMG-010__s01__error",
      "caption": "Chặn GET order của BN khác (IDOR)",
      "uiState": "error"
     },
     {
      "name": "TC-F-IMG-010__s02__error",
      "caption": "Chặn in report đã ký của người khác",
      "uiState": "error"
     },
     {
      "name": "TC-F-IMG-010__s03__error",
      "caption": "Chặn mở study UID trái phép qua viewer",
      "uiState": "error"
     },
     {
      "name": "TC-F-IMG-010__s04__detail",
      "caption": "Link QR chia sẻ giới hạn phạm vi/thời hạn",
      "uiState": "detail"
     }
    ],
    "refIssues": [],
    "notes": "Bao gồm path/anonymous trên PACS proxy + QR share."
   },
   {
    "id": "TC-F-IMG-011",
    "title": "Security anonymous + XSS: chặn truy cập RIS không token; chống XSS trong mô tả/kết luận KQ",
    "category": "security",
    "priority": "P1",
    "role": "Khách (không token) + Bác sĩ CĐHA",
    "preconditions": "Có order chờ nhập KQ.",
    "steps": [
     "Xóa token localStorage, gọi GET waiting-list / orders → trả 401, không lộ dữ liệu",
     "Truy cập trực tiếp endpoint dev (dev/add-test-dicom-studies, dev/update-dates-to-today) ở môi trường prod → phải 404/chặn (chỉ Development)",
     "Nhập KQ chứa payload XSS (vd <img src=x onerror=alert(1)>) vào mô tả → lưu → mở lại + in/print-signed → script KHÔNG thực thi (escape đúng)",
     "Kiểm tra hiển thị tên BN có dấu tiếng Việt + ký tự đặc biệt không vỡ render"
    ],
    "expected": "Không token → 401; endpoint dev bị gate Development-only ở prod; nội dung KQ được escape, không XSS khi hiển thị/in; tiếng Việt có dấu hiển thị đúng.",
    "evidence": [
     {
      "name": "TC-F-IMG-011__s01__error",
      "caption": "401 khi gọi RIS không token",
      "uiState": "error"
     },
     {
      "name": "TC-F-IMG-011__s02__error",
      "caption": "Endpoint dev bị chặn ở prod",
      "uiState": "error"
     },
     {
      "name": "TC-F-IMG-011__s03__detail",
      "caption": "Payload XSS trong KQ bị escape, không thực thi",
      "uiState": "detail"
     }
    ],
    "refIssues": [],
    "notes": "Liên quan commit gate dev/seed Development-only (#180)."
   },
   {
    "id": "TC-F-IMG-012",
    "title": "UI states màn hàng đợi & nhập KQ RIS: empty/loading/error/responsive/dark",
    "category": "ui",
    "priority": "P1",
    "role": "KTV CĐHA",
    "preconditions": "Có thể tạo trạng thái không có order (empty) và mô phỏng lỗi API.",
    "steps": [
     "Hàng đợi rỗng (không order) → hiển thị empty state đúng (_v2kit), không vỡ layout",
     "Khi tải waiting-list → trạng thái loading/skeleton",
     "Ngắt BE → gọi waiting-list lỗi → hiển thị error state + nút thử lại",
     "Bật dark mode (toggle) → kiểm tra tương phản KpiStrip/DataTable/DrawerShell ổn",
     "Thu nhỏ viewport (responsive) → bảng/hàng đợi xuống dạng phù hợp"
    ],
    "expected": "Đủ 4 trạng thái dữ liệu (empty/loading/error/success) + dark mode tương phản tốt + responsive không vỡ, theo design pack _v2kit/ab-*.",
    "evidence": [
     {
      "name": "TC-F-IMG-012__s01__empty",
      "caption": "Hàng đợi RIS rỗng - empty state",
      "uiState": "empty"
     },
     {
      "name": "TC-F-IMG-012__s02__loading",
      "caption": "Loading/skeleton khi tải hàng đợi",
      "uiState": "loading"
     },
     {
      "name": "TC-F-IMG-012__s03__error",
      "caption": "Error state + thử lại khi API lỗi",
      "uiState": "error"
     },
     {
      "name": "TC-F-IMG-012__s04__detail",
      "caption": "Dark mode tương phản RIS",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#246"
    ],
    "notes": ""
   },
   {
    "id": "TC-F-IMG-013",
    "title": "Edge/boundary: ca chỉ định nhiều dịch vụ CĐHA, chụp một phần, KQ riêng từng order + đếm còn lại",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ + KTV CĐHA",
    "preconditions": "Tạo 1 phiếu chỉ định CLS gồm nhiều dịch vụ CĐHA (vd X-quang + siêu âm).",
    "steps": [
     "Tạo ServiceRequest có nhiều ServiceRequestDetail CĐHA → RIS phát sinh nhiều order",
     "Hoàn tất chụp + đọc + ký CHỈ 1 order, để các order còn lại Chờ chụp",
     "Kiểm tra waiting-list/KPI: chỉ giảm đúng số đã xong, phần còn lại vẫn chờ",
     "Đối chiếu OPD: bệnh án thể hiện KQ một phần (đã có/đang chờ) đúng",
     "Edge thời gian: đổi ngày order (dev/update-dates-to-today ở dev) và lọc theo ngày biên (hôm nay/cũ) không sót"
    ],
    "expected": "Một phiếu nhiều DV đẻ nhiều order độc lập; hoàn tất một phần không kéo theo phần khác; đếm/lọc biên chính xác; OPD phản ánh đúng KQ một phần.",
    "evidence": [
     {
      "name": "TC-F-IMG-013__s01__form",
      "caption": "Chỉ định nhiều DV CĐHA trong 1 phiếu",
      "uiState": "form"
     },
     {
      "name": "TC-F-IMG-013__s02__list",
      "caption": "RIS phát sinh nhiều order độc lập",
      "uiState": "list"
     },
     {
      "name": "TC-F-IMG-013__s03__detail",
      "caption": "Hoàn tất 1 order, phần còn lại vẫn chờ",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMG-013__s04__filter",
      "caption": "Lọc theo ngày biên không sót order",
      "uiState": "filter"
     }
    ],
    "refIssues": [],
    "notes": ""
   },
   {
    "id": "TC-F-IMG-014",
    "title": "Điều phối phòng (RadiologyDispatch) liên màn: phân ca → mark-arrived → mark-performed → hủy",
    "category": "state",
    "priority": "P1",
    "role": "KTV điều phối CĐHA",
    "preconditions": "Có order chờ + nhiều phòng modality cấu hình.",
    "steps": [
     "Mở RisDispatcher (/v2/radiology... dispatch), tạo dispatch POST RadiologyDispatch phân BN về phòng",
     "Xem queue/{roomId} hiển thị BN; mark-arrived khi BN tới → trạng thái Đã tới",
     "mark-performed sau chụp → đồng bộ với RIS order trạng thái Đã thực hiện",
     "Hủy dispatch ({id}/cancel) một ca → ca rời queue, không ảnh hưởng ca khác; pending list cập nhật"
    ],
    "expected": "Điều phối phòng đồng bộ 2 chiều với RIS order; arrived/performed đổi trạng thái đúng cả 2 nơi; hủy cô lập đúng ca; pending/queue nhất quán.",
    "evidence": [
     {
      "name": "TC-F-IMG-014__s01__form",
      "caption": "Phân ca về phòng (dispatch)",
      "uiState": "form"
     },
     {
      "name": "TC-F-IMG-014__s02__list",
      "caption": "Queue phòng + mark-arrived",
      "uiState": "list"
     },
     {
      "name": "TC-F-IMG-014__s03__detail",
      "caption": "mark-performed đồng bộ RIS order",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMG-014__s04__confirm",
      "caption": "Hủy dispatch một ca",
      "uiState": "confirm"
     }
    ],
    "refIssues": [
     "#250"
    ],
    "notes": "RadiologyDispatchController + RisDispatcher.tsx."
   },
   {
    "id": "TC-F-IMG-015",
    "title": "Non-DICOM capture: nhập kết quả thiết bị không-DICOM (NonDicomCapture) gắn vào order + đọc KQ",
    "category": "edge",
    "priority": "P2",
    "role": "KTV CĐHA",
    "preconditions": "Có order loại không-DICOM (vd nội soi/ảnh chụp ngoài).",
    "steps": [
     "Mở NonDicomCapture (/v2/... non-dicom), chụp/đính kèm ảnh/video gắn vào order",
     "Kiểm tra ảnh non-DICOM hiển thị trong KQ và in được",
     "Đính kèm file sai định dạng/quá lớn → validate báo lỗi",
     "Hoàn tất → KQ non-DICOM vẫn đi qua duyệt/ký như DICOM"
    ],
    "expected": "Non-DICOM gắn đúng order, hiển thị/in được, validate định dạng/kích thước; vẫn theo quy trình duyệt-ký.",
    "evidence": [
     {
      "name": "TC-F-IMG-015__s01__form",
      "caption": "Chụp/đính kèm non-DICOM vào order",
      "uiState": "form"
     },
     {
      "name": "TC-F-IMG-015__s02__detail",
      "caption": "Ảnh non-DICOM trong KQ",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMG-015__s03__validation",
      "caption": "Báo lỗi file sai định dạng/quá lớn",
      "uiState": "validation"
     }
    ],
    "refIssues": [],
    "notes": "NonDicomController + NonDicomCapture.tsx."
   },
   {
    "id": "TC-F-IMG-016",
    "title": "Audit & ServiceRequeue: mọi mutation RIS ghi log + xử lý hàng đợi lỗi/gửi lại (ServiceRequeue)",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Admin / KTV CĐHA",
    "preconditions": "Đã thực hiện một số mutation (call/start/complete/sign). Có item lỗi gửi (DICOM/HL7) để requeue.",
    "steps": [
     "Thực hiện chuỗi mutation rồi mở DicomStudyAuditLog (/v2/... dicom audit): xác nhận mỗi hành động có bản ghi audit (ai/khi nào/hành động)",
     "Mô phỏng gửi DICOM/HL7 thất bại → item rơi vào ServiceRequeue",
     "Tại ServiceRequeue, gửi lại (retry) item lỗi → trạng thái về Đã gửi; item thành công rời hàng đợi",
     "Đối chiếu audit ghi cả lần thất bại lẫn retry thành công"
    ],
    "expected": "Mọi mutation có audit đầy đủ; item gửi lỗi vào requeue, retry thành công cập nhật trạng thái + audit; không mất dấu vết.",
    "evidence": [
     {
      "name": "TC-F-IMG-016__s01__list",
      "caption": "Audit log liệt kê các mutation RIS",
      "uiState": "list"
     },
     {
      "name": "TC-F-IMG-016__s02__list",
      "caption": "Hàng đợi lỗi trong ServiceRequeue",
      "uiState": "list"
     },
     {
      "name": "TC-F-IMG-016__s03__success",
      "caption": "Retry item lỗi thành công",
      "uiState": "success"
     },
     {
      "name": "TC-F-IMG-016__s04__detail",
      "caption": "Audit ghi cả thất bại lẫn retry",
      "uiState": "detail"
     }
    ],
    "refIssues": [],
    "notes": "DicomStudyAuditLog.tsx + ServiceRequeue.tsx."
   }
  ],
  "gaps": [
   "FLOWS.imaging.steps không tách riêng bước thanh toán viện phí cho CĐHA (khác flow opd/surgery có billing); chưa rõ CĐHA dịch vụ/yêu cầu có chặn chụp tới khi thanh toán không (LockedServices ở phân hệ cls) — cần xác nhận nghiệp vụ để bổ sung test cổng thanh toán online trước chụp.",
   "Chưa xác minh trực tiếp trong code danh sách trạng thái chính xác (enum) của RadiologyRequest/RadiologyExam; tên trạng thái trong các task là suy luận theo endpoint (start/complete/preliminary/final/sign) — nên đối chiếu enum thật trước khi viết assertion cứng.",
   "Hội chẩn ảnh (consultations/minutes/approve) và ký USB-token/PDF (usb-token/sign, pdf/generate-and-sign) tồn tại trong controller nhưng không nằm trong 4 bước FLOWS.imaging — đã để ngoài plan này; nếu cần phủ ký USB token / hội chẩn nên tạo task riêng tránh phình E2E.",
   "XML BHXH: luồng imaging không có bước xuất XML giám định trực tiếp (thuộc billing/bhxh) — chưa đưa vào; cần xác nhận KQ CĐHA có cần đẩy vào hồ sơ XML 4750 không.",
   "Chưa kiểm tra quyền/route cụ thể của từng FE page v2 (App.tsx/TerminalLayout menu) để biết role mapping chính xác cho TC-F-IMG-009 — role name trong test là giả định, cần verify danh sách role thật.",
   "DevLinkRadiologyController (liên kết dev) chưa rõ vai trò trong luồng nghiệp vụ thật hay chỉ tiện ích dev — chưa đưa vào plan, cần làm rõ."
  ]
 },
 {
  "id": "immun",
  "code": "F-IMM",
  "ic": "💉",
  "layer": "spec",
  "nm": "Tiêm chủng",
  "gh": [
   "#267"
  ],
  "flow_id": "immun",
  "summary": "Bộ test-task END-TO-END cho luồng \"Tiêm chủng\" (id=immun), grounded theo FLOWS.immun trong docs/architecture/his-roadmap/assets/data.js: desc \"BN tiêm vaccine → sàng lọc → tiêm → theo dõi phản ứng → về\", steps [Tiếp đón→reception] → [Sàng lọc→opd] → [Tiêm (lô vaccine)→immun] → [Theo dõi→immun], related [checkup, pubhealth]. Đối chiếu code thật: màn v2 /v2/immunization (frontend/src/pages-v2/Immunization.tsx) gồm KPI strip 6 ô + 4 status tab (scheduled/completed/missed/deferred) + search + drawer chi tiết + modal \"Ghi nhận tiêm\" 11 field validate inline; API client frontend/src/api/immunization.ts; BE ImmunizationController route api/immunization [Authorize] (GET list paged/filter, GET patient/{id}/schedule, POST administer, PUT {id}/reaction = AEFI, GET statistics, GET overdue) trong SupplementaryControllers.cs + SupplementaryServices.cs. 17 task: happy-path E2E xuyên màn (tiếp đón→sàng lọc→tiêm→theo dõi), data-consistency liên phân hệ (ghi tiêm A → KPI/tab/drawer B → thống kê C), state-transition (scheduled→completed/missed/deferred + AEFI), phụ/ngoại lệ (hủy modal, lỗi giữa chừng, quá hạn), validation, permission, integration (SignalR/XML BHXH/portal), security (IDOR/anonymous/XSS), ui (empty/loading/error/dark/responsive). Evidence chụp tại mọi điểm chuyển màn. Dedup: chi tiết hoá #267 (E2E #217). Phát hiện gap: modal v2 KHÔNG gửi patientId (chỉ patientName/code) → mũi tiêm không gắn BN thật; KHÔNG có nút ghi AEFI/đổi trạng thái trên UI v2 (chỉ có API PUT reaction); searchCampaigns/createCampaign bị stub (không có BE chiến dịch dù flow nhắc \"chiến dịch, lô vaccine\"); màn sàng lọc trước tiêm chưa có guard dị ứng/chống chỉ định trên UI tiêm.",
  "tasks": [
   {
    "id": "TC-F-IMM-001",
    "title": "E2E happy-path xuyên màn: Tiếp đón → Sàng lọc → Ghi nhận tiêm → Theo dõi (1 BN đi hết luồng)",
    "category": "happy",
    "priority": "P0",
    "role": "Điều dưỡng tiêm chủng / YTDP",
    "preconditions": "Đăng nhập admin/Admin@123 (JWT localStorage token+user). BE localhost:5106 chạy. FE v2 /v2/* (TerminalLayout). DB có sẵn ≥1 BN hoặc tạo mới ở bước tiếp đón.",
    "steps": [
     "Vào /v2/reception, tạo/tiếp đón 1 bệnh nhân (ghi lại mã BN + họ tên tiếng Việt có dấu).",
     "Chuyển sang bước sàng lọc (OPD) cho BN đó nếu UI có; ghi nhận trạng thái trước tiêm.",
     "Mở /v2/immunization, bấm 'Ghi nhận tiêm' (nút primary header).",
     "Điền họ tên + mã BN trùng BN vừa tiếp đón, tên vắc-xin 'DPT-VGB-Hib', số lô, liều 1/3, vị trí 'Cánh tay trái', đường 'IM', ngày tiêm hôm nay.",
     "Bấm Lưu → toast 'Đã ghi nhận tiêm chủng'; list reload, dòng mới hiển thị.",
     "Mở drawer dòng vừa tạo, kiểm tra theo dõi (mũi tiếp / AEFI rỗng)."
    ],
    "expected": "BN đi liền mạch qua 4 bước; mũi tiêm mới hiện đúng ở tab 'Đã lên lịch'/'Đã tiêm' theo status BE trả; drawer hiển thị đúng dữ liệu vừa nhập; KPI 'Tổng mũi' và 'Hôm nay' tăng 1.",
    "evidence": [
     {
      "name": "TC-F-IMM-001__s01__list",
      "caption": "Màn tiếp đón v2 trước khi tạo BN",
      "uiState": "list"
     },
     {
      "name": "TC-F-IMM-001__s02__form",
      "caption": "Form tiếp đón/tạo BN đã điền",
      "uiState": "form"
     },
     {
      "name": "TC-F-IMM-001__s03__list",
      "caption": "Màn /v2/immunization trước khi ghi nhận",
      "uiState": "list"
     },
     {
      "name": "TC-F-IMM-001__s04__modal",
      "caption": "Modal Ghi nhận tiêm đã điền 11 field",
      "uiState": "modal"
     },
     {
      "name": "TC-F-IMM-001__s05__toast",
      "caption": "Toast Đã ghi nhận tiêm chủng",
      "uiState": "toast"
     },
     {
      "name": "TC-F-IMM-001__s06__drawer",
      "caption": "Drawer theo dõi mũi tiêm vừa tạo",
      "uiState": "drawer"
     }
    ],
    "notes": "Điểm chuyển màn: reception→opd→immunization→drawer. Chụp evidence tại MỖI điểm chuyển.",
    "refIssues": [
     "#267",
     "#217"
    ]
   },
   {
    "id": "TC-F-IMM-002",
    "title": "Data-consistency: ghi nhận tiêm (A) → list/tab/drawer phản ánh (B) → KPI & thống kê tính đúng (C)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Đăng nhập admin. Đang ở /v2/immunization, ghi lại số liệu KPI hiện tại (Tổng mũi / Hôm nay / Đã tiêm / Bỏ lỡ / AEFI).",
    "steps": [
     "Chụp KPI strip ban đầu (6 ô).",
     "Ghi nhận 1 mũi tiêm mới ngày hôm nay qua modal.",
     "Sau Lưu, đối chiếu: dòng mới xuất hiện trong DataTable (B).",
     "Kiểm tra KPI 'Tổng mũi' +1, 'Hôm nay' +1 (C).",
     "Mở drawer dòng đó đối chiếu vắc-xin/số lô/mũi/đường tiêm khớp dữ liệu nhập (B).",
     "Đối chiếu GET api/immunization/statistics (completedCount/totalRecords) khớp KPI hiển thị."
    ],
    "expected": "Một mutation (POST administer) phản ánh nhất quán ở 3 nơi: hàng list, KPI strip, và endpoint statistics — không lệch số, không cần refresh thủ công (reloadVer remount).",
    "evidence": [
     {
      "name": "TC-F-IMM-002__s01__list",
      "caption": "KPI strip trước khi ghi nhận",
      "uiState": "list"
     },
     {
      "name": "TC-F-IMM-002__s02__modal",
      "caption": "Modal ghi nhận mũi mới",
      "uiState": "modal"
     },
     {
      "name": "TC-F-IMM-002__s03__list",
      "caption": "List + KPI sau ghi nhận (Tổng/Hôm nay +1)",
      "uiState": "list"
     },
     {
      "name": "TC-F-IMM-002__s04__drawer",
      "caption": "Drawer khớp dữ liệu vừa nhập",
      "uiState": "drawer"
     }
    ],
    "notes": "KPI tính client-side từ rows (xem kpis() trong Immunization.tsx); statistics tính server-side — kiểm cả hai khớp nhau.",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-003",
    "title": "State-transition: lọc theo 4 tab trạng thái (Đã lên lịch / Đã tiêm / Bỏ lỡ / Hoãn) và đối chiếu badge",
    "category": "state",
    "priority": "P0",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Đăng nhập admin. Có dữ liệu tiêm với nhiều status (0/1/2/3). Đang ở /v2/immunization.",
    "steps": [
     "Bấm tab 'Đã lên lịch' (scheduled) → chỉ hiện dòng status=0, badge tone info.",
     "Bấm tab 'Đã tiêm' (completed) → chỉ status=1, badge tone ok.",
     "Bấm tab 'Bỏ lỡ' (missed) → chỉ status=2, badge tone crit.",
     "Bấm tab 'Hoãn' (deferred) → chỉ status=3, badge tone warn.",
     "Đối chiếu số đếm mỗi tab với KPI tương ứng (Đã tiêm / Bỏ lỡ)."
    ],
    "expected": "Lọc tab đúng theo statusKey (1=completed,2=missed,3=deferred, else scheduled); badge màu khớp tone; count mỗi tab nhất quán với KPI.",
    "evidence": [
     {
      "name": "TC-F-IMM-003__s01__tab",
      "caption": "Tab Đã lên lịch (info)",
      "uiState": "tab"
     },
     {
      "name": "TC-F-IMM-003__s02__tab",
      "caption": "Tab Đã tiêm (ok)",
      "uiState": "tab"
     },
     {
      "name": "TC-F-IMM-003__s03__tab",
      "caption": "Tab Bỏ lỡ (crit)",
      "uiState": "tab"
     },
     {
      "name": "TC-F-IMM-003__s04__tab",
      "caption": "Tab Hoãn (warn)",
      "uiState": "tab"
     }
    ],
    "notes": "BE chỉ có PUT reaction để đổi sang AEFI; UI v2 chưa có nút chuyển trạng thái scheduled→completed → ghi gap (xem TC-F-IMM-012).",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-004",
    "title": "Validation: modal Ghi nhận tiêm — bỏ trống/sai từng field bắt buộc (5 trường *)",
    "category": "validation",
    "priority": "P0",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Đăng nhập admin. Mở modal 'Ghi nhận tiêm' tại /v2/immunization.",
    "steps": [
     "Để trống Họ tên → Lưu → cảnh báo 'Nhập họ tên bệnh nhân'.",
     "Điền họ tên, để trống Tên vắc-xin → Lưu → 'Nhập tên vắc-xin'.",
     "Điền vắc-xin, để trống Số lô → Lưu → 'Nhập số lô'.",
     "Để trống Vị trí tiêm → Lưu → 'Chọn vị trí tiêm'.",
     "Để trống Đường tiêm → Lưu → 'Chọn đường tiêm'.",
     "Xoá Ngày tiêm → Lưu → 'Chọn ngày tiêm'.",
     "Nhập họ tên chỉ khoảng trắng '   ' → Lưu → vẫn báo lỗi (trim)."
    ],
    "expected": "Mỗi field bắt buộc khuyết đều chặn submit với message.warning tương ứng; không gọi API; trim loại bỏ chuỗi toàn khoảng trắng.",
    "evidence": [
     {
      "name": "TC-F-IMM-004__s01__validation",
      "caption": "Thiếu họ tên BN",
      "uiState": "validation"
     },
     {
      "name": "TC-F-IMM-004__s02__validation",
      "caption": "Thiếu tên vắc-xin",
      "uiState": "validation"
     },
     {
      "name": "TC-F-IMM-004__s03__validation",
      "caption": "Thiếu số lô",
      "uiState": "validation"
     },
     {
      "name": "TC-F-IMM-004__s04__validation",
      "caption": "Thiếu vị trí/đường tiêm",
      "uiState": "validation"
     },
     {
      "name": "TC-F-IMM-004__s05__validation",
      "caption": "Thiếu ngày tiêm",
      "uiState": "validation"
     }
    ],
    "notes": "Validate inline raw useState (không Antd Form). 5 field * + ngày tiêm = 6 nhánh chặn.",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-005",
    "title": "Edge/boundary: liều thứ > tổng liều, liều = 0/âm, ngày tiêm tiếp < ngày tiêm",
    "category": "edge",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Đăng nhập admin. Mở modal Ghi nhận tiêm.",
    "steps": [
     "Đặt Liều thứ = 5, Tổng liều = 3 (doseNumber > totalDoses) → Lưu.",
     "Thử InputNumber Liều thứ = 0 hoặc rỗng (min=1) → kiểm tra clamp về 1.",
     "Đặt Ngày tiêm = hôm nay, Ngày tiêm tiếp = hôm qua (nextDueDate < vaccinationDate) → Lưu.",
     "Đặt Ngày tiêm = ngày tương lai xa → Lưu.",
     "Quan sát hành vi: được phép hay bị chặn; nếu được phép thì hiển thị thế nào ở list (cột Mũi 5/3, Mũi tiếp quá khứ)."
    ],
    "expected": "Hệ thống cần chặn hoặc cảnh báo liều thứ > tổng liều và ngày tiếp < ngày tiêm; InputNumber clamp min=1. Nếu KHÔNG chặn (hiện modal không có validate này) → ghi nhận là bug, tạo issue fix liên kết.",
    "evidence": [
     {
      "name": "TC-F-IMM-005__s01__form",
      "caption": "Liều 5/3 trong InputNumber",
      "uiState": "form"
     },
     {
      "name": "TC-F-IMM-005__s02__form",
      "caption": "Ngày tiếp < ngày tiêm",
      "uiState": "form"
     },
     {
      "name": "TC-F-IMM-005__s03__error",
      "caption": "Kết quả Lưu (chặn hoặc dòng lỗi logic ở list)",
      "uiState": "error"
     }
    ],
    "notes": "Hiện code không validate dose/ngày logic → khả năng cao là bug. DoD: nếu phát hiện bug phải tạo task fix + link 2 chiều.",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-006",
    "title": "Negative + state: Hủy modal giữa chừng / lỗi BE giữa luồng ghi nhận (không tạo dòng rác)",
    "category": "negative",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Đăng nhập admin. /v2/immunization. Ghi lại số dòng + KPI Tổng mũi.",
    "steps": [
     "Mở modal, điền đủ field rồi bấm 'Hủy' (variant ghost) → modal đóng, KHÔNG tạo dòng.",
     "Mở lại modal → các field đã reset về mặc định (useEffect reset on open).",
     "Mô phỏng lỗi BE (tắt BE / DevTools chặn POST /immunization/administer trả 500) → điền đủ → Lưu.",
     "Quan sát: toast error 'Ghi nhận tiêm chủng thất bại', busy nhả, modal vẫn mở giữ dữ liệu.",
     "Bật lại BE, đối chiếu KPI Tổng mũi KHÔNG tăng do lần lỗi."
    ],
    "expected": "Hủy không tạo dữ liệu; mở lại form sạch; lỗi BE → toast error + giữ form, không tạo dòng rác, không tăng KPI; nút Lưu khôi phục từ trạng thái 'Đang lưu…'.",
    "evidence": [
     {
      "name": "TC-F-IMM-006__s01__modal",
      "caption": "Modal đã điền trước khi Hủy",
      "uiState": "modal"
     },
     {
      "name": "TC-F-IMM-006__s02__modal",
      "caption": "Mở lại modal — form reset",
      "uiState": "modal"
     },
     {
      "name": "TC-F-IMM-006__s03__loading",
      "caption": "Nút Đang lưu… khi submit",
      "uiState": "loading"
     },
     {
      "name": "TC-F-IMM-006__s04__error",
      "caption": "Toast Ghi nhận tiêm chủng thất bại",
      "uiState": "error"
     }
    ],
    "notes": "Lỗi giữa chừng = ngoại lệ luồng. Kiểm rollback phía UI (không partial state).",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-007",
    "title": "Data-consistency liên phân hệ: mũi tiêm gắn đúng BN (patientId) + xuất hiện trong lịch tiêm BN (schedule)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Điều dưỡng tiêm chủng / Bác sĩ",
    "preconditions": "Đăng nhập admin. Có BN cụ thể (lấy patientId từ /v2/reception hoặc API).",
    "steps": [
     "Ghi nhận 1 mũi tiêm cho BN qua modal (điền họ tên + mã BN của BN thật).",
     "Gọi GET api/immunization/patient/{patientId}/schedule cho BN đó.",
     "Đối chiếu mũi vừa ghi có xuất hiện trong lịch/scheduleItems của BN không.",
     "Mở drawer mũi tiêm, kiểm tra Mã BN / Họ tên khớp BN thật.",
     "Đối chiếu cột 'Mũi tiếp' (nextDueDate) đẩy vào lịch tiêm BN."
    ],
    "expected": "Mũi tiêm phải gắn đúng patientId và hiện trong schedule của BN. PHÁT HIỆN GAP: modal v2 chỉ gửi patientName/patientCode, KHÔNG gửi patientId (recordVaccination bỏ patientId vì modal không thu) → mũi tiêm có thể không liên kết BN thật → schedule trống/sai. Nếu đúng vậy → bug, tạo issue fix liên kết.",
    "evidence": [
     {
      "name": "TC-F-IMM-007__s01__modal",
      "caption": "Ghi nhận mũi cho BN cụ thể",
      "uiState": "modal"
     },
     {
      "name": "TC-F-IMM-007__s02__detail",
      "caption": "GET schedule BN — kiểm mũi có xuất hiện",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMM-007__s03__drawer",
      "caption": "Drawer mũi tiêm — Mã BN khớp",
      "uiState": "drawer"
     }
    ],
    "notes": "Gap đã xác định khi đọc code (api/immunization.ts recordVaccination + modal không có field patientId). Đây là điểm liên-phân-hệ reception↔immun dễ vỡ.",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-008",
    "title": "Patient-safety: sàng lọc dị ứng/chống chỉ định trước tiêm + cảnh báo trùng mũi (duplicate dose)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Bác sĩ sàng lọc / Điều dưỡng",
    "preconditions": "Đăng nhập admin. BN có tiền sử dị ứng đã ghi nhận (allergy) ở hồ sơ. BN đã có mũi 1 của 1 loại vắc-xin.",
    "steps": [
     "Tại bước sàng lọc (OPD), kiểm tra UI có hiển thị cảnh báo dị ứng / chống chỉ định của BN trước khi cho tiêm.",
     "Ghi nhận tiêm 1 vắc-xin mà BN đã dị ứng → quan sát có cảnh báo/chặn không.",
     "Ghi nhận lại đúng mũi đã tiêm (cùng vắc-xin, cùng doseNumber, cùng ngày) → quan sát có cảnh báo trùng mũi không."
    ],
    "expected": "Theo quy ước patient-safety HIS, trước tiêm phải có guard dị ứng/chống chỉ định và cảnh báo trùng mũi. PHÁT HIỆN GAP: màn tiêm v2 hiện KHÔNG có guard dị ứng cũng không chống trùng mũi → ghi nhận bug patient-safety, tạo issue fix ưu tiên P0 liên kết test này.",
    "evidence": [
     {
      "name": "TC-F-IMM-008__s01__detail",
      "caption": "Hồ sơ BN có tiền sử dị ứng (sàng lọc)",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMM-008__s02__modal",
      "caption": "Ghi nhận vắc-xin BN dị ứng — kiểm cảnh báo",
      "uiState": "modal"
     },
     {
      "name": "TC-F-IMM-008__s03__error",
      "caption": "Cảnh báo/chặn (hoặc thiếu cảnh báo = bug)",
      "uiState": "error"
     }
    ],
    "notes": "Patient-safety là rule cứng HIS. Bước 'Sàng lọc' của flow chính là nơi guard này phải sống. DoD: bug-task bắt buộc nếu thiếu.",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-009",
    "title": "State-transition liên phân hệ: ghi nhận AEFI (phản ứng sau tiêm) → KPI AEFI + drawer + tab cập nhật",
    "category": "state",
    "priority": "P0",
    "role": "Điều dưỡng theo dõi sau tiêm",
    "preconditions": "Đăng nhập admin. Có ≥1 mũi tiêm đã ghi (status hiện tại). PUT api/immunization/{id}/reaction khả dụng.",
    "steps": [
     "Chọn 1 mũi tiêm, gọi PUT api/immunization/{id}/reaction với aefiReport='Sốt nhẹ, sưng đỏ chỗ tiêm' + aefiSeverity=2.",
     "Reload /v2/immunization.",
     "Kiểm cột AEFI dòng đó hiện chip 'Có' (crit).",
     "Mở drawer → section 'AEFI - PHẢN ỨNG SAU TIÊM' hiển thị nội dung phản ứng.",
     "Kiểm KPI 'AEFI' tăng 1 và đổi tone crit.",
     "Thử aefiSeverity=4 (serious) → đối chiếu mức độ nghiêm trọng phản ánh."
    ],
    "expected": "Sau khi ghi AEFI: cột AEFI = 'Có', drawer hiện section phản ứng, KPI AEFI +1 tone crit; statistics.aefiCount tăng. Mức severity 1-4 lưu đúng.",
    "evidence": [
     {
      "name": "TC-F-IMM-009__s01__detail",
      "caption": "PUT reaction qua API (severity 2)",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMM-009__s02__list",
      "caption": "Cột AEFI = chip Có + KPI AEFI crit",
      "uiState": "list"
     },
     {
      "name": "TC-F-IMM-009__s03__drawer",
      "caption": "Drawer section AEFI hiển thị phản ứng",
      "uiState": "drawer"
     }
    ],
    "notes": "GAP UI: page v2 KHÔNG có nút mở form ghi AEFI (chỉ render khi có dữ liệu). Phải gọi API trực tiếp → ghi gap + cân nhắc bug task UI (TC-F-IMM-012).",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-010",
    "title": "Edge: tính 'Quá hạn mũi sau' (overdue) — nextDueDate < hôm nay → KPI + GET overdue",
    "category": "edge",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Đăng nhập admin. Có mũi tiêm với nextDueDate trong quá khứ.",
    "steps": [
     "Tạo/đảm bảo 1 mũi có Ngày tiêm tiếp (nextDueDate) là ngày quá khứ.",
     "Mở /v2/immunization, đọc KPI 'Quá hạn mũi sau' (overdue, tone warn).",
     "Đối chiếu với GET api/immunization/overdue.",
     "Kiểm BN có nextDueDate hôm nay (biên) có bị tính overdue không (isBefore startOf day)."
    ],
    "expected": "KPI overdue đếm đúng số mũi có nextDueDate < startOf('day') hôm nay; biên = đúng hôm nay KHÔNG tính overdue; khớp endpoint overdue.",
    "evidence": [
     {
      "name": "TC-F-IMM-010__s01__list",
      "caption": "KPI Quá hạn mũi sau (warn)",
      "uiState": "list"
     },
     {
      "name": "TC-F-IMM-010__s02__detail",
      "caption": "GET overdue đối chiếu số lượng",
      "uiState": "detail"
     }
    ],
    "notes": "Logic overdue tính client-side (kpis()) — kiểm boundary ngày hiện tại.",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-011",
    "title": "UI: empty / loading / error / dark-mode / responsive cho màn Hồ sơ tiêm chủng",
    "category": "ui",
    "priority": "P1",
    "role": "Người dùng bất kỳ (đã đăng nhập)",
    "preconditions": "Đăng nhập admin. Có thể giả lập DB rỗng và mạng chậm/lỗi qua DevTools.",
    "steps": [
     "Mở /v2/immunization khi đang tải (network throttle) → chụp trạng thái loading của SimpleV2Page.",
     "Với DB rỗng / search không khớp → chụp empty state.",
     "Chặn GET /immunization trả lỗi → searchVaccinations trả [] + console.warn; chụp màn rỗng do lỗi.",
     "Bật dark mode (toggle TerminalLayout) → kiểm tương phản KPI/badge/table/drawer.",
     "Thu hẹp viewport (responsive) → kiểm KPI strip + DataTable không vỡ.",
     "Kiểm tiếng Việt có dấu hiển thị đúng (họ tên, 'Bỏ lỡ', 'Hoãn')."
    ],
    "expected": "Loading có skeleton/spinner; empty hiển thị gọn; lỗi không crash (fallback []); dark mode đủ tương phản (var --t/--s); responsive không tràn; tiếng Việt đúng dấu.",
    "evidence": [
     {
      "name": "TC-F-IMM-011__s01__loading",
      "caption": "Trạng thái loading",
      "uiState": "loading"
     },
     {
      "name": "TC-F-IMM-011__s02__empty",
      "caption": "Empty state (không dữ liệu)",
      "uiState": "empty"
     },
     {
      "name": "TC-F-IMM-011__s03__error",
      "caption": "Lỗi API → fallback rỗng",
      "uiState": "error"
     },
     {
      "name": "TC-F-IMM-011__s04__list",
      "caption": "Dark mode KPI + table + tab",
      "uiState": "list"
     },
     {
      "name": "TC-F-IMM-011__s05__list",
      "caption": "Responsive viewport hẹp",
      "uiState": "list"
     }
    ],
    "notes": "searchVaccinations nuốt lỗi trả [] → 'error' và 'empty' nhìn giống nhau; cân nhắc ghi gap về thiếu phân biệt lỗi vs rỗng.",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-012",
    "title": "Gap chức năng: thiếu nút đổi trạng thái mũi (scheduled→completed/missed/deferred) và nút ghi AEFI trên UI v2",
    "category": "ui",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Đăng nhập admin. /v2/immunization có dòng status=0 (scheduled).",
    "steps": [
     "Mở drawer 1 mũi 'Đã lên lịch'.",
     "Tìm nút/hành động để đánh dấu Đã tiêm / Bỏ lỡ / Hoãn → ghi nhận có hay không.",
     "Tìm nút mở form 'Ghi nhận phản ứng (AEFI)' → ghi nhận có hay không.",
     "Đối chiếu BE có sẵn PUT {id}/reaction nhưng UI chưa expose."
    ],
    "expected": "Luồng 'Theo dõi → đổi trạng thái → ghi AEFI' cần thao tác được trên UI. PHÁT HIỆN GAP: page v2 chỉ ghi nhận tiêm mới + xem drawer, KHÔNG có nút đổi status hay ghi AEFI dù BE hỗ trợ. Tạo issue fix bổ sung hành động liên kết test này.",
    "evidence": [
     {
      "name": "TC-F-IMM-012__s01__drawer",
      "caption": "Drawer mũi scheduled — không có nút đổi trạng thái",
      "uiState": "drawer"
     },
     {
      "name": "TC-F-IMM-012__s02__drawer",
      "caption": "Drawer — không có nút ghi AEFI",
      "uiState": "drawer"
     }
    ],
    "notes": "Gap rõ ràng giữa BE (có endpoint) và UI v2 (thiếu hành động). DoD test: phải tạo bug/feature-task fix.",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-013",
    "title": "Permission: vai trò không có quyền tiêm chủng không thao tác được; chưa đăng nhập bị chặn",
    "category": "permission",
    "priority": "P0",
    "role": "User role thấp / chưa đăng nhập",
    "preconditions": "Có 1 tài khoản role hạn chế (không thuộc YTDP/điều dưỡng tiêm) nếu hệ thống phân quyền; và phiên chưa đăng nhập.",
    "steps": [
     "Xóa token localStorage, mở /v2/immunization trực tiếp → kỳ vọng redirect login (ProtectedRoute).",
     "Gọi GET api/immunization không Bearer → kỳ vọng 401 (controller [Authorize]).",
     "Đăng nhập role hạn chế (nếu có), mở màn → kiểm có ẩn nút 'Ghi nhận tiêm' / chặn POST không.",
     "Gọi POST api/immunization/administer với token role hạn chế → kiểm phản hồi."
    ],
    "expected": "Chưa đăng nhập → bị redirect / 401. Endpoint yêu cầu [Authorize]. Nếu HIS có phân quyền theo module, role không hợp lệ phải bị chặn ghi nhận tiêm; nếu mọi role đăng nhập đều ghi được → ghi gap thiếu phân quyền chi tiết.",
    "evidence": [
     {
      "name": "TC-F-IMM-013__s01__permission",
      "caption": "Truy cập khi chưa đăng nhập → login",
      "uiState": "permission"
     },
     {
      "name": "TC-F-IMM-013__s02__error",
      "caption": "GET api/immunization không token → 401",
      "uiState": "error"
     },
     {
      "name": "TC-F-IMM-013__s03__permission",
      "caption": "Role hạn chế — nút bị ẩn/chặn",
      "uiState": "permission"
     }
    ],
    "notes": "Controller chỉ [Authorize] (không Roles) → nhiều khả năng mọi user đăng nhập đều ghi được. Xác nhận và ghi gap nếu cần.",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-014",
    "title": "Security: IDOR đọc lịch tiêm BN khác + XSS qua tên vắc-xin/ghi chú",
    "category": "security",
    "priority": "P0",
    "role": "Người dùng đã đăng nhập (kẻ tấn công nội bộ)",
    "preconditions": "Đăng nhập admin. Biết patientId của 2 BN khác nhau.",
    "steps": [
     "Gọi GET api/immunization/patient/{patientId-BN-khác}/schedule với token của mình → kiểm có lộ dữ liệu BN không liên quan không (IDOR).",
     "Thử patientId không hợp lệ / không tồn tại → kiểm phản hồi (404 hay leak).",
     "Ghi nhận mũi với Tên vắc-xin = '<img src=x onerror=alert(1)>' và Ghi chú chứa script.",
     "Mở list + drawer dòng đó → kiểm payload bị render thực thi hay được escape (React mặc định escape; whiteSpace pre-wrap notes/aefi).",
     "Kiểm dữ liệu lưu DB không chứa script đã thực thi."
    ],
    "expected": "Schedule endpoint không cho đọc BN ngoài phạm vi/không leak; ID không tồn tại trả 404 chuẩn; payload XSS được escape khi render (không thực thi). Nếu IDOR đọc được BN bất kỳ → bug security P0.",
    "evidence": [
     {
      "name": "TC-F-IMM-014__s01__detail",
      "caption": "GET schedule BN khác — kiểm IDOR",
      "uiState": "detail"
     },
     {
      "name": "TC-F-IMM-014__s02__form",
      "caption": "Nhập payload XSS vào tên vắc-xin/ghi chú",
      "uiState": "form"
     },
     {
      "name": "TC-F-IMM-014__s03__detail",
      "caption": "Drawer render payload escaped (không alert)",
      "uiState": "detail"
     }
    ],
    "notes": "Audit: mỗi mutation (administer/reaction) phải ghi audit log — kiểm bản ghi audit kèm. Đối chiếu rule audit-mọi-mutation HIS.",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-015",
    "title": "Integration: SignalR realtime (thông báo AEFI nặng) + đồng bộ XML BHXH / national exchange cho mũi tiêm",
    "category": "integration",
    "priority": "P2",
    "role": "Điều dưỡng / cán bộ YTDP",
    "preconditions": "Đăng nhập admin (2 tab nếu test realtime). BE chạy. Module national/insurance khả dụng nếu có.",
    "steps": [
     "Mở /v2/immunization ở tab A; ghi AEFI severity=4 (serious) cho 1 mũi ở tab B (qua API/UI).",
     "Quan sát tab A có nhận push/badge realtime (SignalR) hoặc tự cập nhật KPI AEFI không.",
     "Nếu HIS có đẩy dữ liệu tiêm chủng lên hệ thống quốc gia / XML BHXH (national/insurance), kiểm mũi tiêm đã ghi có nằm trong gói dữ liệu xuất không.",
     "Đối chiếu mã vắc-xin/lô trong dữ liệu xuất khớp bản ghi."
    ],
    "expected": "AEFI nặng nên có cảnh báo realtime (SignalR) tới người theo dõi. Dữ liệu tiêm chủng được đưa vào luồng national/XML BHXH nếu yêu cầu nghiệp vụ. PHÁT HIỆN GAP nếu page v2 không có SignalR (page hiện reload thủ công qua reloadVer) → ghi gap.",
    "evidence": [
     {
      "name": "TC-F-IMM-015__s01__list",
      "caption": "Tab A trước khi tab B ghi AEFI nặng",
      "uiState": "list"
     },
     {
      "name": "TC-F-IMM-015__s02__toast",
      "caption": "Push/badge realtime AEFI nặng (nếu có)",
      "uiState": "toast"
     },
     {
      "name": "TC-F-IMM-015__s03__detail",
      "caption": "Gói XML/national chứa mũi tiêm (nếu có)",
      "uiState": "detail"
     }
    ],
    "notes": "Page Immunization.tsx không thấy dùng SignalR; chỉ remount qua reloadVer sau khi tự ghi. Realtime cross-user nhiều khả năng là gap.",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-016",
    "title": "Data-consistency: chức năng 'Chiến dịch tiêm' (VaccinationCampaigns) — stub vs nghiệp vụ flow",
    "category": "data-consistency",
    "priority": "P2",
    "role": "Cán bộ YTDP",
    "preconditions": "Đăng nhập admin. Flow desc nhắc 'chiến dịch, lô vaccine'.",
    "steps": [
     "Tìm UI quản lý chiến dịch tiêm / lô vaccine trong /v2/immunization hoặc menu liên quan.",
     "Gọi searchCampaigns()/createCampaign() qua client → quan sát kết quả.",
     "Đối chiếu với rel của flow: VaccinationCampaigns ⟶ ImmunizationBatches ⟶ VaccinationRecords."
    ],
    "expected": "Theo flow phải có chiến dịch + lô vaccine liên kết mũi tiêm. PHÁT HIỆN GAP: api/immunization.ts có searchCampaigns trả [] (stub) và createCampaign ném 'Campaign API is not supported by the current backend' → chiến dịch/lô chưa thực thi. Ghi gap; nếu là yêu cầu nghiệp vụ → tạo task feature.",
    "evidence": [
     {
      "name": "TC-F-IMM-016__s01__empty",
      "caption": "Danh sách chiến dịch rỗng (stub)",
      "uiState": "empty"
     },
     {
      "name": "TC-F-IMM-016__s02__error",
      "caption": "createCampaign ném lỗi không hỗ trợ",
      "uiState": "error"
     }
    ],
    "notes": "Lô vaccine (lotNumber) hiện chỉ là text tự do trong mũi tiêm, không liên kết bảng ImmunizationBatches → consistency lô tồn-kho/hạn dùng là gap.",
    "refIssues": [
     "#267"
    ]
   },
   {
    "id": "TC-F-IMM-017",
    "title": "Search/filter: tìm theo BN / vắc-xin / số lô + lọc ngày, đối chiếu kết quả",
    "category": "happy",
    "priority": "P1",
    "role": "Điều dưỡng tiêm chủng",
    "preconditions": "Đăng nhập admin. /v2/immunization có nhiều bản ghi đa dạng BN/vắc-xin/lô.",
    "steps": [
     "Gõ tên BN tiếng Việt có dấu vào ô tìm → list lọc đúng (searchOf gồm patientName/code/vaccineName/code/lot).",
     "Gõ mã vắc-xin → lọc đúng.",
     "Gõ số lô → lọc đúng.",
     "Gõ chuỗi không tồn tại → empty.",
     "Kết hợp tab trạng thái + search → giao của 2 điều kiện."
    ],
    "expected": "Search client-side khớp bất kỳ trường trong searchOf; kết hợp với tab cho giao đúng; không phân biệt hoa thường; chuỗi vô nghĩa → empty.",
    "evidence": [
     {
      "name": "TC-F-IMM-017__s01__filter",
      "caption": "Tìm theo tên BN có dấu",
      "uiState": "filter"
     },
     {
      "name": "TC-F-IMM-017__s02__filter",
      "caption": "Tìm theo số lô",
      "uiState": "filter"
     },
     {
      "name": "TC-F-IMM-017__s03__empty",
      "caption": "Tìm chuỗi không khớp → empty",
      "uiState": "empty"
     }
    ],
    "notes": "searchVaccinations() tải pageSize=200 rồi lọc client; lọc ngày/status BE có nhưng UI v2 chưa expose filter ngày → ghi gap nếu cần.",
    "refIssues": [
     "#267"
    ]
   }
  ],
  "gaps": [
   "GAP-PATIENT-LINK (P0): Modal 'Ghi nhận tiêm' v2 chỉ thu patientName/patientCode, KHÔNG có field patientId; recordVaccination() gửi patientId=undefined → mũi tiêm có thể không gắn BN thật, vỡ liên kết reception→immun và lịch tiêm BN (TC-F-IMM-007). Cần chọn BN từ danh bạ thay vì gõ tay.",
   "GAP-SAFETY-SCREEN (P0): Bước 'Sàng lọc' (opd) trong flow KHÔNG có guard dị ứng/chống chỉ định và KHÔNG cảnh báo trùng mũi trên UI tiêm — vi phạm rule patient-safety HIS (TC-F-IMM-008).",
   "GAP-UI-ACTIONS (P1): Page v2 thiếu nút đổi trạng thái mũi (scheduled→completed/missed/deferred) và nút mở form ghi AEFI, dù BE có PUT api/immunization/{id}/reaction; luồng 'Theo dõi' chỉ xem được, không thao tác (TC-F-IMM-009, TC-F-IMM-012).",
   "GAP-CAMPAIGN-BATCH (P2): searchCampaigns() trả [] (stub) và createCampaign() ném 'not supported'; lotNumber chỉ là text tự do, không liên kết bảng ImmunizationBatches/VaccinationCampaigns như rel flow yêu cầu (TC-F-IMM-016).",
   "GAP-REALTIME (P2): Page không dùng SignalR, chỉ remount qua reloadVer sau khi TỰ ghi; cảnh báo AEFI nặng cross-user / cập nhật realtime nhiều khả năng không có (TC-F-IMM-015).",
   "GAP-ERROR-VS-EMPTY (P1): searchVaccinations() nuốt lỗi trả [] + console.warn → trạng thái 'lỗi tải' và 'rỗng' không phân biệt được với người dùng (TC-F-IMM-011).",
   "GAP-DOSE-DATE-VALIDATE (P1): Modal không validate liều thứ ≤ tổng liều, không chặn nextDueDate < vaccinationDate → dữ liệu logic sai có thể lưu (TC-F-IMM-005).",
   "GAP-AUTHZ-GRANULAR (P1): Controller chỉ [Authorize] không [Authorize(Roles=...)] → nghi mọi user đăng nhập đều ghi nhận tiêm được, chưa phân quyền theo vai trò tiêm chủng (TC-F-IMM-013).",
   "GAP-DATE-FILTER-UI (P2): BE hỗ trợ lọc dateFrom/dateTo/status nhưng UI v2 chỉ có search text + tab; chưa expose bộ lọc ngày (TC-F-IMM-017).",
   "DEDUP/REF: Toàn bộ task chi tiết hoá issue test cha #267 (E2E #217); chưa map được role chuyên biệt (YTDP/điều dưỡng tiêm) do controller không khai báo Roles — cần xác nhận ma trận phân quyền thực tế trước khi chốt TC-F-IMM-013."
  ]
 },
 {
  "id": "transfusion",
  "code": "F-TRF",
  "ic": "🩸",
  "layer": "clin",
  "nm": "Truyền máu",
  "gh": [
   "#239",
   "#242"
  ],
  "flow_id": "transfusion",
  "summary": "Bộ test-task END-TO-END xuyên phân hệ cho luồng \"Truyền máu\" (id=transfusion), bám sát data.js: desc \"BN nhận máu → đối chiếu tương thích → xác nhận truyền → theo dõi\"; steps = [Lĩnh máu→blood], [Đối chiếu nhóm máu→blood], [Truyền máu→blood], [Theo dõi→ipd]; related=[inpatient, surgery]. Grounded vào BloodBankCompleteController (lifecycle: orders → assign túi máu → cross-match → start-transfusion → complete-transfusion → reaction; cùng issue-requests duyệt/từ chối, scan barcode/QR, in phiếu lĩnh, báo cáo BHXH XML) và FE 2 lớp: v1 /blood-bank (pages/BloodBank.tsx, Antd) + v2 /v2/blood-bank (pages-v2/BloodBank.tsx, TerminalLayout/_v2kit/ab-*), bước Theo dõi ở phân hệ Nội trú IPD (TreatmentMonitorSection). Tập trung happy-path E2E xuyên màn (Lĩnh→Đối chiếu→Truyền→Theo dõi), data-consistency liên phân hệ (chỉ định ở Doctor → túi máu giảm tồn ở BloodBank → truyền hiển thị ở IPD), state-transition liên phân hệ (Pending→Assigned→CrossMatched→Transfusing→Completed/Reacted), luồng phụ/ngoại lệ (hủy chỉ định, từ chối lĩnh, phản ứng truyền máu giữa chừng, túi máu hết hạn/sai nhóm), cùng các nhóm phụ: negative, edge/boundary, validation, permission (role-based + IDOR), ui (empty/loading/error/dark/responsive), integration (barcode/QR scan, SignalR, BHXH XML, in phiếu PDF), security. Evidence đặt tên đúng quy ước TC-<CODE>-<NNN>__s<NN>__<state> tại mọi điểm chuyển màn. 16 task, P0 cho safety + happy E2E. refIssues map vào #217 (E2E happy), #239 (workflow+state-transition LS), #242 (API-error+exception LS) — KHÔNG tạo trùng.",
  "tasks": [
   {
    "id": "TC-F-TRF-001",
    "title": "Happy-path E2E xuyên màn: Chỉ định máu → Lĩnh máu → Đối chiếu nhóm máu → Truyền máu → Theo dõi IPD",
    "category": "happy",
    "priority": "P0",
    "role": "Doctor + BloodBankStaff + Nurse (admin/Admin@123)",
    "preconditions": "BN nội trú đang điều trị (có Admission), kho máu có túi máu cùng nhóm còn hạn, BE localhost:5106, FE v2 /v2/*. Đăng nhập admin (full role).",
    "steps": [
     "Đăng nhập admin/Admin@123; vào /v2/blood-bank tab Chỉ định máu (orders)",
     "Tạo chỉ định máu cho BN nội trú (CreateBloodOrder): chọn BN, nhóm máu, chế phẩm, số đơn vị → Lưu",
     "Mở chi tiết chỉ định, tạo/duyệt yêu cầu lĩnh máu (issue-requests → approve)",
     "Gán túi máu cho order item (assign): chọn túi máu cùng nhóm còn hạn",
     "Ghi nhận kết quả phản ứng chéo (cross-match) = Phù hợp cho túi đã gán",
     "Bấm Bắt đầu truyền máu (start-transfusion) cho túi máu đã đối chiếu",
     "Bấm Kết thúc truyền máu (complete-transfusion) kèm ghi chú theo dõi",
     "Chuyển sang phân hệ Nội trú IPD → mở hồ sơ BN → mục Theo dõi/Diễn biến xác nhận truyền máu được ghi nhận"
    ],
    "expected": "Mỗi bước thành công có toast/confirm; trạng thái order item chuyển Pending→Assigned→CrossMatched→Transfusing→Completed; tồn kho túi máu giảm/đổi trạng thái Issued/Transfused; bản ghi truyền hiển thị bên IPD; mọi mutation ghi audit log. Không có lỗi console.",
    "evidence": [
     {
      "name": "TC-F-TRF-001__s01__form",
      "caption": "Form tạo chỉ định máu cho BN nội trú",
      "uiState": "form"
     },
     {
      "name": "TC-F-TRF-001__s02__detail",
      "caption": "Chi tiết chỉ định + yêu cầu lĩnh máu",
      "uiState": "detail"
     },
     {
      "name": "TC-F-TRF-001__s03__modal",
      "caption": "Modal gán túi máu cho order item",
      "uiState": "modal"
     },
     {
      "name": "TC-F-TRF-001__s04__modal",
      "caption": "Modal ghi kết quả đối chiếu nhóm máu (cross-match) Phù hợp",
      "uiState": "modal"
     },
     {
      "name": "TC-F-TRF-001__s05__confirm",
      "caption": "Xác nhận Bắt đầu truyền máu",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-TRF-001__s06__success",
      "caption": "Kết thúc truyền máu thành công",
      "uiState": "success"
     },
     {
      "name": "TC-F-TRF-001__s07__detail",
      "caption": "Bản ghi truyền máu hiển thị trong Theo dõi IPD",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#217"
    ],
    "notes": "Bám đúng 4 step data.js. Đây là xương sống E2E; các task khác chi tiết hóa nhánh."
   },
   {
    "id": "TC-F-TRF-002",
    "title": "Data-consistency liên phân hệ: chỉ định ở Doctor (A) → tồn kho giảm ở BloodBank (B) → tổng đơn vị truyền tính đúng ở IPD (C)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Doctor + BloodBankStaff + Nurse",
    "preconditions": "Kho máu có N túi nhóm O+ còn hạn (ghi lại tồn ban đầu). BN nội trú O+.",
    "steps": [
     "Ghi nhận tồn kho O+ ban đầu tại tab Tồn kho (stock) — số liệu C0",
     "Doctor tạo chỉ định 2 đơn vị O+ cho BN (A)",
     "Gán + đối chiếu + start + complete-transfusion cho 2 túi O+",
     "Quay lại tab Tồn kho refresh → kiểm tồn O+ giảm đúng 2 (B = C0-2)",
     "Mở Theo dõi IPD của BN → kiểm tổng đơn vị đã truyền = 2 (C)",
     "Mở báo cáo máu theo bệnh nhân (patients/{id}/blood-issue) → đối chiếu cùng số 2 đơn vị"
    ],
    "expected": "Tồn kho giảm chính xác đúng số túi đã truyền (không double-count, không âm); IPD và báo cáo theo BN cùng hiển thị 2 đơn vị; số liệu nhất quán xuyên 3 màn (chỉ định ↔ kho ↔ theo dõi/báo cáo).",
    "evidence": [
     {
      "name": "TC-F-TRF-002__s01__list",
      "caption": "Tồn kho O+ ban đầu (C0)",
      "uiState": "list"
     },
     {
      "name": "TC-F-TRF-002__s02__detail",
      "caption": "Chỉ định 2 đơn vị O+ đã hoàn tất truyền",
      "uiState": "detail"
     },
     {
      "name": "TC-F-TRF-002__s03__list",
      "caption": "Tồn kho O+ sau truyền giảm đúng 2",
      "uiState": "list"
     },
     {
      "name": "TC-F-TRF-002__s04__detail",
      "caption": "Theo dõi IPD: tổng 2 đơn vị đã truyền",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#217",
     "#239"
    ],
    "notes": "Kiểm tạo A → hiện B → tính C đúng spec; bắt lỗi tồn kho không đồng bộ."
   },
   {
    "id": "TC-F-TRF-003",
    "title": "State-transition liên phân hệ: vòng đời order item Pending→Assigned→CrossMatched→Transfusing→Completed (chặn nhảy bước)",
    "category": "state",
    "priority": "P0",
    "role": "BloodBankStaff + Nurse",
    "preconditions": "Một chỉ định máu mới ở trạng thái Pending, có túi máu phù hợp.",
    "steps": [
     "Mở chi tiết order item Pending — kiểm chỉ enable nút Gán túi máu",
     "Thử Bắt đầu truyền khi CHƯA đối chiếu (chưa cross-match) — kỳ vọng bị chặn",
     "Gán túi → trạng thái Assigned; thử start-transfusion khi cross-match chưa Phù hợp",
     "Ghi cross-match Phù hợp → trạng thái CrossMatched; start-transfusion → Transfusing",
     "complete-transfusion → Completed; thử start-transfusion lại trên item đã Completed — kỳ vọng bị chặn"
    ],
    "expected": "Mỗi chuyển trạng thái chỉ hợp lệ theo đúng thứ tự; UI ẩn/disable nút sai bước; BE trả 400/409 khi nhảy bước hoặc thao tác trên trạng thái cuối; badge trạng thái hiển thị đúng từng giai đoạn.",
    "evidence": [
     {
      "name": "TC-F-TRF-003__s01__detail",
      "caption": "Order item Pending — chỉ enable Gán túi",
      "uiState": "detail"
     },
     {
      "name": "TC-F-TRF-003__s02__error",
      "caption": "Chặn Bắt đầu truyền khi chưa đối chiếu",
      "uiState": "error"
     },
     {
      "name": "TC-F-TRF-003__s03__tab",
      "caption": "Badge trạng thái CrossMatched",
      "uiState": "tab"
     },
     {
      "name": "TC-F-TRF-003__s04__error",
      "caption": "Chặn truyền lại khi item đã Completed",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Patient-safety: cấm truyền khi chưa đối chiếu nhóm máu."
   },
   {
    "id": "TC-F-TRF-004",
    "title": "Patient-safety: chặn đối chiếu/truyền túi máu KHÁC nhóm máu BN (ABO/Rh không tương thích)",
    "category": "validation",
    "priority": "P0",
    "role": "BloodBankStaff",
    "preconditions": "BN nhóm A+; kho có túi B+ và túi A+. Chỉ định máu cho BN A+.",
    "steps": [
     "Mở order item của BN A+, vào Gán túi máu",
     "Chọn túi B+ (sai nhóm ABO) → kỳ vọng cảnh báo/chặn không cho gán hoặc cảnh báo đỏ",
     "Chọn túi A- (sai Rh) → kỳ vọng cảnh báo Rh không tương thích",
     "Gán túi A+ đúng nhóm → ghi cross-match = Không phù hợp → thử Bắt đầu truyền",
     "Kỳ vọng bị chặn truyền khi cross-match Không phù hợp"
    ],
    "expected": "Hệ thống cảnh báo/chặn gán hoặc truyền túi không tương thích ABO/Rh; cross-match Không phù hợp khóa start-transfusion; thông điệp tiếng Việt có dấu rõ ràng (vd 'Nhóm máu không tương thích'). Audit ghi nhận sự cố từ chối.",
    "evidence": [
     {
      "name": "TC-F-TRF-004__s01__validation",
      "caption": "Cảnh báo gán túi B+ cho BN A+ (sai ABO)",
      "uiState": "validation"
     },
     {
      "name": "TC-F-TRF-004__s02__validation",
      "caption": "Cảnh báo Rh không tương thích (A- cho A+)",
      "uiState": "validation"
     },
     {
      "name": "TC-F-TRF-004__s03__error",
      "caption": "Chặn truyền khi cross-match Không phù hợp",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#239",
     "#242"
    ],
    "notes": "Quy tắc nhóm máu patient-safety bắt buộc; nếu FE không chặn → tạo task bug."
   },
   {
    "id": "TC-F-TRF-005",
    "title": "Luồng phụ - phản ứng truyền máu GIỮA CHỪNG: ghi nhận phản ứng + xử trí, dừng truyền, đồng bộ IPD",
    "category": "state",
    "priority": "P0",
    "role": "Nurse + Doctor",
    "preconditions": "Một order item đang Transfusing (đã start-transfusion).",
    "steps": [
     "Mở order item đang Transfusing tại /v2/blood-bank",
     "Bấm Ghi nhận phản ứng truyền máu (reaction): nhập loại phản ứng (sốt/rét run/dị ứng) + xử trí",
     "Lưu phản ứng → kiểm trạng thái túi/đơn chuyển sang Reacted/Ngừng truyền",
     "Xác nhận túi máu KHÔNG bị tính là truyền thành công",
     "Sang IPD Theo dõi → kiểm phản ứng + thời điểm dừng được ghi vào diễn biến BN"
    ],
    "expected": "Phản ứng được lưu kèm xử trí; truyền bị dừng (không Completed); trạng thái phản ánh đúng; thông tin phản ứng đồng bộ sang theo dõi IPD; audit + (nếu có) cảnh báo SignalR tới điều dưỡng.",
    "evidence": [
     {
      "name": "TC-F-TRF-005__s01__detail",
      "caption": "Order item đang Transfusing",
      "uiState": "detail"
     },
     {
      "name": "TC-F-TRF-005__s02__modal",
      "caption": "Modal ghi nhận phản ứng + xử trí",
      "uiState": "modal"
     },
     {
      "name": "TC-F-TRF-005__s03__success",
      "caption": "Phản ứng đã ghi, truyền dừng",
      "uiState": "success"
     },
     {
      "name": "TC-F-TRF-005__s04__detail",
      "caption": "Phản ứng đồng bộ trong Theo dõi IPD",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "Ngoại lệ lỗi-giữa-chừng quan trọng nhất của luồng truyền máu."
   },
   {
    "id": "TC-F-TRF-006",
    "title": "Luồng phụ - hủy chỉ định máu + từ chối yêu cầu lĩnh: hoàn tồn kho, dừng luồng",
    "category": "negative",
    "priority": "P1",
    "role": "Doctor + BloodBankManager",
    "preconditions": "Chỉ định máu đã gán túi nhưng CHƯA truyền; yêu cầu lĩnh đang chờ duyệt.",
    "steps": [
     "Doctor mở chỉ định chưa truyền → Hủy chỉ định (cancel) kèm lý do bắt buộc",
     "Kiểm túi đã gán được hủy gán (unassign) và trả lại tồn kho Available",
     "Tạo chỉ định + yêu cầu lĩnh khác → BloodBankManager Từ chối yêu cầu lĩnh (reject) kèm lý do",
     "Kiểm trạng thái yêu cầu = Rejected, không phát sinh phiếu xuất"
    ],
    "expected": "Hủy/từ chối yêu cầu nhập lý do; túi máu trả về tồn kho (không thất thoát); luồng dừng đúng; trạng thái chuyển Cancelled/Rejected; audit ghi lý do người thực hiện. Không thể hủy chỉ định đã truyền xong.",
    "evidence": [
     {
      "name": "TC-F-TRF-006__s01__modal",
      "caption": "Modal hủy chỉ định + lý do",
      "uiState": "modal"
     },
     {
      "name": "TC-F-TRF-006__s02__list",
      "caption": "Túi máu trả lại tồn kho Available",
      "uiState": "list"
     },
     {
      "name": "TC-F-TRF-006__s03__modal",
      "caption": "Từ chối yêu cầu lĩnh + lý do",
      "uiState": "modal"
     },
     {
      "name": "TC-F-TRF-006__s04__detail",
      "caption": "Trạng thái Rejected, không có phiếu xuất",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239",
     "#242"
    ],
    "notes": "Kiểm data-consistency hoàn tồn khi hủy."
   },
   {
    "id": "TC-F-TRF-007",
    "title": "Validation form chỉ định/lĩnh máu: trường bắt buộc, số đơn vị > 0, lý do hủy bắt buộc",
    "category": "validation",
    "priority": "P1",
    "role": "Doctor",
    "preconditions": "Đang ở form tạo chỉ định máu.",
    "steps": [
     "Submit form trống → kiểm báo lỗi các trường bắt buộc (BN, nhóm máu, chế phẩm, số đơn vị)",
     "Nhập số đơn vị = 0 và số âm → kiểm validation chặn",
     "Nhập số đơn vị lớn bất thường (vd 99) → kiểm cảnh báo/giới hạn",
     "Bấm Hủy chỉ định nhưng để trống lý do → kiểm chặn yêu cầu lý do"
    ],
    "expected": "Validation FE + BE đồng nhất; thông báo lỗi tiếng Việt có dấu dưới từng field; không submit được khi sai; số đơn vị chỉ nhận số nguyên dương hợp lý; lý do hủy bắt buộc.",
    "evidence": [
     {
      "name": "TC-F-TRF-007__s01__validation",
      "caption": "Form trống báo lỗi trường bắt buộc",
      "uiState": "validation"
     },
     {
      "name": "TC-F-TRF-007__s02__validation",
      "caption": "Số đơn vị 0/âm bị chặn",
      "uiState": "validation"
     },
     {
      "name": "TC-F-TRF-007__s03__validation",
      "caption": "Lý do hủy bắt buộc",
      "uiState": "validation"
     }
    ],
    "refIssues": [
     "#242"
    ],
    "notes": ""
   },
   {
    "id": "TC-F-TRF-008",
    "title": "Edge/boundary: túi máu sắp hết hạn / đã hết hạn không cho gán-truyền; cảnh báo hạn dùng",
    "category": "edge",
    "priority": "P1",
    "role": "BloodBankStaff",
    "preconditions": "Kho có túi máu hết hạn (stock/expired) và túi sắp hết hạn (stock/expiring ≤7 ngày).",
    "steps": [
     "Vào tab Tồn kho → lọc Sắp hết hạn (expiring) và Đã hết hạn (expired)",
     "Thử gán túi đã hết hạn cho order item → kỳ vọng bị chặn + cảnh báo",
     "Thử gán túi sắp hết hạn → kỳ vọng cho gán nhưng cảnh báo vàng hạn dùng",
     "Hủy túi hết hạn (blood-bags/destroy) kèm lý do → kiểm rời tồn khả dụng"
    ],
    "expected": "Túi hết hạn bị chặn truyền; túi sắp hết hạn cảnh báo nhưng vẫn dùng được (theo nghiệp vụ); hủy túi hết hạn ghi audit + giảm tồn; badge/màu cảnh báo hạn dùng đúng (đỏ hết hạn, vàng sắp hết).",
    "evidence": [
     {
      "name": "TC-F-TRF-008__s01__filter",
      "caption": "Lọc túi sắp hết hạn / đã hết hạn",
      "uiState": "filter"
     },
     {
      "name": "TC-F-TRF-008__s02__error",
      "caption": "Chặn gán túi đã hết hạn",
      "uiState": "error"
     },
     {
      "name": "TC-F-TRF-008__s03__confirm",
      "caption": "Hủy túi hết hạn kèm lý do",
      "uiState": "confirm"
     }
    ],
    "refIssues": [],
    "notes": "Boundary hạn dùng = patient-safety."
   },
   {
    "id": "TC-F-TRF-009",
    "title": "Permission RBAC: Nurse không tạo chỉ định, không duyệt lĩnh; Doctor không xác nhận nhập kho",
    "category": "permission",
    "priority": "P0",
    "role": "Nurse, Doctor (tài khoản phân quyền tương ứng)",
    "preconditions": "Có tài khoản role Nurse và Doctor riêng (ngoài admin).",
    "steps": [
     "Đăng nhập role Nurse → kiểm KHÔNG có nút Tạo chỉ định máu (POST orders = Admin,Doctor)",
     "Nurse gọi trực tiếp API approve issue-request → kỳ vọng 403",
     "Đăng nhập role Doctor → thử Xác nhận phiếu nhập máu (Admin,BloodBankManager) → kỳ vọng 403/ẩn",
     "Nurse được phép: Bắt đầu/Kết thúc truyền + ghi phản ứng (Admin,Doctor,Nurse) → cho phép"
    ],
    "expected": "UI ẩn hành động ngoài quyền; API trả 403 đúng theo [Authorize(Roles=...)] của controller; Nurse chỉ thao tác được phần truyền/phản ứng; không rò rỉ chức năng quản lý kho.",
    "evidence": [
     {
      "name": "TC-F-TRF-009__s01__permission",
      "caption": "Nurse không thấy nút Tạo chỉ định",
      "uiState": "permission"
     },
     {
      "name": "TC-F-TRF-009__s02__error",
      "caption": "Nurse gọi approve → 403",
      "uiState": "error"
     },
     {
      "name": "TC-F-TRF-009__s03__permission",
      "caption": "Doctor không xác nhận được phiếu nhập",
      "uiState": "permission"
     }
    ],
    "refIssues": [],
    "notes": "Bám đúng ma trận role trong BloodBankCompleteController."
   },
   {
    "id": "TC-F-TRF-010",
    "title": "Security IDOR/over-posting: thao tác túi máu/order của BN khác qua orderItemId/bloodBagId giả mạo",
    "category": "security",
    "priority": "P0",
    "role": "Doctor/Nurse (token hợp lệ)",
    "preconditions": "Tồn tại order item của BN khác (Guid X) và túi máu BN khác (Guid Y).",
    "steps": [
     "Lấy token hợp lệ của user; gọi POST orders/items/{X}/start-transfusion với orderItemId của BN khác",
     "Gọi assign túi Y (đã gán BN khác) cho order item của mình",
     "Gọi GET orders/{guid-ngẫu-nhiên} và patients/{guid-khác}/blood-issue",
     "Thử over-post body chỉ định có thêm field Id/IsDeleted/CreatedBy"
    ],
    "expected": "Không thao tác/đọc được dữ liệu máu của BN khác (403/404, không 200 rò dữ liệu); túi đã gán BN khác không gán lại được; server bỏ qua field over-post (Id/IsDeleted server-side) — bám fix #184/#181. Mọi truy cập trái phép ghi audit.",
    "evidence": [
     {
      "name": "TC-F-TRF-010__s01__error",
      "caption": "start-transfusion orderItemId BN khác → từ chối",
      "uiState": "error"
     },
     {
      "name": "TC-F-TRF-010__s02__error",
      "caption": "Gán lại túi đã thuộc BN khác → chặn",
      "uiState": "error"
     },
     {
      "name": "TC-F-TRF-010__s03__error",
      "caption": "GET blood-issue BN khác → 403/404",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#242"
    ],
    "notes": "IDOR trên Guid endpoints; phát hiện rò → tạo task bug security."
   },
   {
    "id": "TC-F-TRF-011",
    "title": "Integration barcode/QR: scan túi máu (blood-bags/scan + by-barcode) đối chiếu đúng túi trước truyền",
    "category": "integration",
    "priority": "P1",
    "role": "BloodBankStaff + Nurse",
    "preconditions": "Túi máu có mã vạch đã in (blood-bags/print-barcodes).",
    "steps": [
     "Vào màn truyền máu → chức năng quét mã túi máu",
     "Scan mã đúng của túi đã gán → kiểm hiển thị đúng thông tin túi + nhóm máu",
     "Scan mã túi KHÔNG thuộc order/BN → kỳ vọng cảnh báo không khớp",
     "Scan mã không tồn tại/sai định dạng → kỳ vọng thông báo lỗi rõ ràng"
    ],
    "expected": "Scan đúng túi → khớp BN/order, cho phép truyền; scan sai túi → cảnh báo không khớp (an toàn 3-check); mã không hợp lệ → lỗi thân thiện; ngăn truyền nhầm túi.",
    "evidence": [
     {
      "name": "TC-F-TRF-011__s01__modal",
      "caption": "Quét mã túi máu - khớp đúng",
      "uiState": "modal"
     },
     {
      "name": "TC-F-TRF-011__s02__error",
      "caption": "Quét túi không thuộc BN → cảnh báo",
      "uiState": "error"
     },
     {
      "name": "TC-F-TRF-011__s03__error",
      "caption": "Mã không hợp lệ → lỗi",
      "uiState": "error"
     }
    ],
    "refIssues": [
     "#242"
    ],
    "notes": ""
   },
   {
    "id": "TC-F-TRF-012",
    "title": "Integration BHXH XML + in phiếu lĩnh máu PDF: chế phẩm máu xuất hiện đúng trong XML/biểu mẫu",
    "category": "integration",
    "priority": "P1",
    "role": "BloodBankManager + Billing",
    "preconditions": "BN BHXH đã truyền máu hoàn tất trong kỳ; quyền in báo cáo.",
    "steps": [
     "In phiếu lĩnh máu theo BN (patients/{id}/blood-issue/print) → mở PDF",
     "In phiếu lĩnh tổng hợp (reports/issue-summary/print) trong khoảng ngày",
     "Xuất/đối chiếu XML BHXH của hồ sơ BN (InsuranceXmlService) → kiểm dịch vụ máu/chế phẩm có mặt đúng mã + số lượng",
     "Đối chiếu số đơn vị trên PDF và XML khớp với truyền thực tế"
    ],
    "expected": "PDF in đúng tên BV/biểu mẫu, đủ thông tin túi + nhóm máu; XML BHXH chứa dịch vụ máu đúng số lượng/đơn giá; số liệu PDF ↔ XML ↔ truyền thực tế nhất quán. Không hardcode tên BV.",
    "evidence": [
     {
      "name": "TC-F-TRF-012__s01__detail",
      "caption": "PDF phiếu lĩnh máu theo BN",
      "uiState": "detail"
     },
     {
      "name": "TC-F-TRF-012__s02__detail",
      "caption": "PDF phiếu lĩnh tổng hợp theo kỳ",
      "uiState": "detail"
     },
     {
      "name": "TC-F-TRF-012__s03__detail",
      "caption": "Chế phẩm máu trong XML BHXH",
      "uiState": "detail"
     }
    ],
    "refIssues": [],
    "notes": "InsuranceXmlService có tham chiếu BloodTransfusion."
   },
   {
    "id": "TC-F-TRF-013",
    "title": "UI states + dark/light + responsive: list/empty/loading/error trên màn Tồn kho & Chỉ định máu v2",
    "category": "ui",
    "priority": "P2",
    "role": "Admin",
    "preconditions": "FE v2 /v2/blood-bank; có toggle dark/light.",
    "steps": [
     "Mở tab Tồn kho khi đang tải → chụp loading (skeleton/spinner)",
     "Lọc nhóm máu không có túi → chụp empty state",
     "Ngắt mạng / BE trả 500 (throttle) → chụp error state + nút thử lại",
     "Bật dark mode → chụp lại list/drawer kiểm tương phản, màu badge trạng thái",
     "Thu hẹp viewport (responsive) → chụp bảng cuộn ngang/wrap đúng"
    ],
    "expected": "Mọi trạng thái loading/empty/error có UI rõ ràng (không trắng/spinner vĩnh viễn/lỗi câm); dark mode tương phản đạt, badge đọc được; responsive không vỡ layout TerminalLayout/ab-*; tiếng Việt có dấu hiển thị đúng.",
    "evidence": [
     {
      "name": "TC-F-TRF-013__s01__loading",
      "caption": "Tồn kho đang tải",
      "uiState": "loading"
     },
     {
      "name": "TC-F-TRF-013__s02__empty",
      "caption": "Lọc nhóm máu không có túi - empty",
      "uiState": "empty"
     },
     {
      "name": "TC-F-TRF-013__s03__error",
      "caption": "BE 500 - error + thử lại",
      "uiState": "error"
     },
     {
      "name": "TC-F-TRF-013__s04__list",
      "caption": "Tồn kho dark mode",
      "uiState": "list"
     }
    ],
    "refIssues": [],
    "notes": ""
   },
   {
    "id": "TC-F-TRF-014",
    "title": "Integration SignalR realtime: cảnh báo phản ứng/yêu cầu lĩnh máu khẩn đẩy tới điều dưỡng/kho realtime",
    "category": "integration",
    "priority": "P2",
    "role": "Nurse + BloodBankStaff (2 phiên/2 tab)",
    "preconditions": "2 trình duyệt: tab kho máu và tab điều dưỡng IPD; SignalR hub bật.",
    "steps": [
     "Mở 2 tab đăng nhập role phù hợp",
     "Tab Doctor/Nurse ghi nhận phản ứng truyền máu (reaction)",
     "Quan sát tab kho/IPD còn lại có nhận thông báo realtime (không cần refresh)",
     "Tắt SignalR / mất kết nối → kiểm fallback polling vẫn cập nhật"
    ],
    "expected": "Thông báo phản ứng/yêu cầu khẩn đẩy realtime sang phiên liên quan; mất kết nối có fallback polling/auto-reconnect; không spam trùng. Nếu chưa có realtime cho luồng này → ghi vào gaps.",
    "evidence": [
     {
      "name": "TC-F-TRF-014__s01__toast",
      "caption": "Tab kho nhận thông báo phản ứng realtime",
      "uiState": "toast"
     },
     {
      "name": "TC-F-TRF-014__s02__detail",
      "caption": "Cập nhật realtime danh sách yêu cầu lĩnh",
      "uiState": "detail"
     }
    ],
    "refIssues": [],
    "notes": "Có thể là gap nếu hub chưa phủ luồng truyền máu."
   },
   {
    "id": "TC-F-TRF-015",
    "title": "Negative/API-error giữa luồng: BE timeout/500 khi đang truyền - không mất trạng thái, không double-truyền",
    "category": "negative",
    "priority": "P1",
    "role": "Nurse",
    "preconditions": "Order item đang chuẩn bị truyền; có thể inject lỗi BE.",
    "steps": [
     "Bấm start-transfusion, mô phỏng BE trả 500/timeout → kiểm UI báo lỗi, không khóa cứng",
     "Refresh trang → kiểm trạng thái không bị nhảy sai (vẫn CrossMatched chứ không Transfusing-mồ-côi)",
     "Bấm lại start-transfusion thành công → kiểm không tạo 2 bản ghi truyền (idempotent)",
     "Mất mạng khi complete-transfusion → kiểm retry không double-trừ tồn kho"
    ],
    "expected": "Lỗi BE hiển thị thông báo rõ, không corrupt trạng thái; retry không gây double-record/double-trừ tồn; trạng thái phục hồi đúng sau refresh. Phát hiện double → task bug data-consistency.",
    "evidence": [
     {
      "name": "TC-F-TRF-015__s01__error",
      "caption": "start-transfusion BE 500 - báo lỗi",
      "uiState": "error"
     },
     {
      "name": "TC-F-TRF-015__s02__detail",
      "caption": "Sau refresh trạng thái không mồ côi",
      "uiState": "detail"
     },
     {
      "name": "TC-F-TRF-015__s03__success",
      "caption": "Retry thành công không double-record",
      "uiState": "success"
     }
    ],
    "refIssues": [
     "#242"
    ],
    "notes": ""
   },
   {
    "id": "TC-F-TRF-016",
    "title": "Liên phân hệ Phẫu thuật/Surgery: chỉ định + truyền máu trong ca mổ phản ánh đúng vào hồ sơ phẫu thuật",
    "category": "data-consistency",
    "priority": "P2",
    "role": "Doctor (phẫu thuật) + BloodBankStaff",
    "preconditions": "BN có ca mổ (SurgeryRecord) đang/đã thực hiện; related=[surgery].",
    "steps": [
     "Trong bối cảnh ca mổ, tạo chỉ định máu khẩn cho BN",
     "Lĩnh + đối chiếu + truyền máu trong mổ",
     "Mở biên bản mổ / hồ sơ phẫu thuật → kiểm số đơn vị máu sử dụng được ghi nhận",
     "Đối chiếu báo cáo máu theo BN khớp với lượng dùng trong mổ"
    ],
    "expected": "Lượng máu truyền trong mổ ghi nhận nhất quán giữa BloodBank, hồ sơ phẫu thuật và báo cáo theo BN; không lệch số liệu. Nếu hồ sơ mổ chưa liên kết máu → ghi gaps.",
    "evidence": [
     {
      "name": "TC-F-TRF-016__s01__form",
      "caption": "Chỉ định máu khẩn trong ca mổ",
      "uiState": "form"
     },
     {
      "name": "TC-F-TRF-016__s02__detail",
      "caption": "Số đơn vị máu trong biên bản mổ",
      "uiState": "detail"
     },
     {
      "name": "TC-F-TRF-016__s03__detail",
      "caption": "Báo cáo máu theo BN khớp lượng dùng",
      "uiState": "detail"
     }
    ],
    "refIssues": [
     "#239"
    ],
    "notes": "related=[inpatient,surgery] trong data.js."
   }
  ],
  "gaps": [
   "data.js liệt kê step 'Lĩnh máu' đầu tiên nhưng quy trình thực tế (BloodBankCompleteController) bắt đầu bằng 'Chỉ định máu' (orders) rồi mới yêu cầu lĩnh (issue-requests); test bám lifecycle thật của BE — cần xác nhận với nghiệp vụ thứ tự Chỉ định ↔ Lĩnh.",
   "Chưa xác minh FE v2 (/v2/blood-bank, pages-v2/BloodBank.tsx) đã render đầy đủ các thao tác assign/cross-match/start/complete/reaction hay chỉ phần tồn kho+chỉ định; một số thao tác có thể chỉ tồn tại ở v1 (/blood-bank) — cần kiểm UI v2 trước khi chạy, thiếu thì tạo task port v2 (#205).",
   "Chưa xác minh bước 'Theo dõi' (IPD) có màn chuyên dụng hiển thị bản ghi truyền máu trong TreatmentMonitorSection hay chỉ ghi diễn biến chung — cần kiểm tích hợp BloodTransfusion ↔ IPD.",
   "Chưa rõ FE có chặn nhóm máu không tương thích ABO/Rh ở client hay chỉ dựa BE/cross-match; TC-F-TRF-004 sẽ xác nhận, nếu FE không cảnh báo → bug patient-safety.",
   "Chưa xác minh SignalR có hub đẩy cảnh báo phản ứng/yêu cầu lĩnh máu khẩn (TC-F-TRF-014) — có thể là gap realtime cần Issue mới.",
   "Chưa xác minh InsuranceXmlService map chế phẩm máu thành dịch vụ BHXH đúng mã (TC-F-TRF-012) — cần đối chiếu mã dịch vụ máu theo danh mục BYT.",
   "Cần tài khoản role riêng (Nurse, Doctor, BloodBankManager, BloodBankStaff) ngoài admin để test permission/IDOR (TC-F-TRF-009/010); nếu chỉ có admin thì không kiểm được phân quyền thực.",
   "Cần cơ chế inject lỗi BE (500/timeout) cho TC-F-TRF-015 — đề xuất dùng DevTools throttle/offline hoặc proxy; chưa có harness sẵn."
  ]
 },
 {
  "id": "checkup",
  "code": "F-CHK",
  "ic": "📝",
  "layer": "spec",
  "nm": "Khám sức khỏe & gói khám",
  "gh": [
   "#267",
   "#269"
  ],
  "flow_id": "checkup",
  "summary": "Bộ test-task END-TO-END xuyên phân hệ cho luồng \"Khám sức khỏe & Gói khám\" (id=checkup). Grounded từ FLOWS.checkup trong his-roadmap/assets/data.js: desc \"BN KSK → thực hiện gói → tổng hợp KQ → in kết luận → về\"; steps = [Hợp đồng/gói→checkup] → [Thực hiện DV→cls] → [Tổng hợp KQ→checkup] → [Viện phí→billing]; related = [immun, opd]. Phân hệ checkup (HealthCheckContracts ⟶ HealthCheckPackages ⟶ HealthCheckups/HealthCheckupRecords · OccupationalHealthExams/SchoolHealthExams; đợt KSK doanh nghiệp/học đường qua HealthCheckupCampaigns + CheckupCampaignGroups). Triển khai thực tế đã verify: FE v2 route /v2/health-checkup (frontend/src/pages-v2/HealthCheckup.tsx) — KpiStrip + StatusTabs (Cho/Đang khám/Hoàn thành/Đã chứng nhận = status 0/1/2/3) + DataTable + DrawerShell chi tiết + CrudModal tạo/sửa với field chuyên biệt động theo loại KSK (Driver/TT36, FoodSafety/TT15, Student, ChildUnder24m); kết luận pass/conditional/fail; in giấy CN qua HealthCheckupPrintTemplates (Driver/VSATTP/Student). API frontend/src/api/healthCheckup.ts gọi /api/health-checkup (+ /campaigns, /campaigns/{id}/groups, /campaigns/{id}/import Excel batch, /campaigns/{id}/cost-report, /types, /statistics). BE SupplementaryControllers.cs HealthCheckupController [Authorize] route api/health-checkup (CreateCampaign, CreateRecord, IssueCertificate PUT record/{id}/certificate). CLS = /v2/laboratory (Laboratory.tsx) + chẩn đoán hình ảnh (HL7 LIS, DICOM PACS Orthanc); viện phí = /v2/billing. Bộ phủ: happy-path E2E xuyên màn (hợp đồng/đợt → tạo lượt KSK gắn gói → thực hiện CLS → nhập KQ chuyên khoa → tổng hợp kết luận → cấp giấy CN → đẩy viện phí), data-consistency liên phân hệ (đợt-N người → cost-report = Σ; KQ CLS → hiện ở drawer KSK → tính tổng tiền billing), state-transition liên phân hệ (Cho→Đang khám→Hoàn thành→Đã chứng nhận; chặn cấp CN khi chưa Hoàn thành), luồng phụ/ngoại lệ (hủy đợt, import Excel lỗi dòng, lỗi API giữa chừng, hoàn/sửa ngược), validation, permission (IDOR/anonymous), UI states (empty/loading/error/dark/responsive), integration (HL7 LIS, DICOM, SignalR realtime, thanh toán online, XML BHXH cho KSK BHYT). DEDUP: map parent #217 (happy-path E2E), #267 (workflow+state+form nhóm YTCC, checkup in scope), #269 (UI+API-error nhóm YTCC), #216 cross E2E. Evidence đặt tên TC-F-CHK-NNN__sNN__state tại mọi điểm chuyển màn. Test CHẠY SAU CÙNG theo rule repo — đây là kế hoạch.",
  "tasks": [
   {
    "id": "TC-F-CHK-001",
    "title": "E2E happy-path xuyên màn: tạo đợt KSK doanh nghiệp → gán gói → tạo lượt KSK → thực hiện CLS → tổng hợp KQ → cấp giấy CN → đẩy viện phí",
    "category": "happy",
    "priority": "P0",
    "role": "admin (KSK officer / BS / thu ngân)",
    "preconditions": "Đăng nhập admin/Admin@123 (JWT localStorage). BE localhost:5106 chạy, seed dữ liệu KSK + dịch vụ CLS ổn định. Có sẵn ≥1 gói khám (HealthCheckPackages) và dịch vụ CLS (XN/CĐHA) trong gói.",
    "steps": [
     "Vào /v2/health-checkup, xác nhận KpiStrip (Tổng KSK/Hôm nay/Đạt/Không đạt) + StatusTabs render, chụp list.",
     "Tạo đợt KSK doanh nghiệp (campaign): nhập tên đợt + công ty + ngày + gói + % giảm; lưu → toast thành công; chụp form + success.",
     "Mở đợt vừa tạo, tạo nhóm (CheckupCampaignGroups) + phân phòng; xác nhận totalMembers; chụp drawer/tab nhóm.",
     "Bấm 'KSK mới', chọn Loại KSK = Lái xe (Driver) → field chuyên biệt TT36 (Hạng lái xe/Thử phản xạ/Thị giác màu) xuất hiện động; nhập đối tượng + ngày khám + gắn đợt; lưu → bản ghi status=Chờ; chụp modal form.",
     "Chuyển sang thực hiện CLS: mở /v2/laboratory, tìm chỉ định XN của đối tượng, nhập/duyệt kết quả XN; chụp màn CLS + KQ.",
     "Quay lại /v2/health-checkup, mở drawer lượt KSK, nhập KQ chuyên khoa (Nội/Ngoại/Mắt/TMH/RHM) + KQ XN/X-quang + Kết luận='Đạt'; chuyển trạng thái Đang khám→Hoàn thành; chụp drawer detail + tab khám chuyên khoa.",
     "Cấp giấy chứng nhận (PUT record/{id}/certificate) → status chuyển 'Đã chứng nhận'; in giấy CN Lái xe (TT36) → cửa sổ in mở đúng template; chụp confirm + success + print.",
     "Mở /v2/billing, xác nhận chi phí gói KSK + dịch vụ CLS đã gộp vào hóa đơn đối tượng; chụp màn viện phí.",
     "Khẳng định outcome: bản ghi KSK status=3 (Đã chứng nhận), conclusion=pass, KpiStrip 'Đạt' +1, tổng tiền billing = giá gói + CLS phát sinh."
    ],
    "expected": "Toàn luồng chạy liền mạch: đợt→nhóm→lượt KSK (Chờ)→CLS có KQ→tổng hợp (Hoàn thành)→cấp CN (Đã chứng nhận)→viện phí gộp đúng. Mọi mutation ghi audit. Số liệu cuối (trạng thái, kết luận, KPI, tổng tiền) ĐÚNG — không chỉ no-console-error.",
    "notes": "Trục E2E chính của luồng. Khẳng định KẾT QUẢ theo #217. Mỗi điểm chuyển màn chụp evidence.",
    "refIssues": [
     "#217",
     "#267",
     "#216"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-001__s01__list",
      "caption": "Màn KSK v2 — KPI + status tabs + danh sách",
      "uiState": "list"
     },
     {
      "name": "TC-F-CHK-001__s02__form",
      "caption": "Form tạo đợt KSK doanh nghiệp",
      "uiState": "form"
     },
     {
      "name": "TC-F-CHK-001__s03__success",
      "caption": "Tạo đợt thành công (toast)",
      "uiState": "success"
     },
     {
      "name": "TC-F-CHK-001__s04__drawer",
      "caption": "Drawer đợt — tạo nhóm + phân phòng",
      "uiState": "drawer"
     },
     {
      "name": "TC-F-CHK-001__s05__modal",
      "caption": "Modal KSK mới — field TT36 hiện động khi chọn Lái xe",
      "uiState": "modal"
     },
     {
      "name": "TC-F-CHK-001__s06__detail",
      "caption": "Màn CLS /v2/laboratory — nhập KQ XN cho đối tượng",
      "uiState": "detail"
     },
     {
      "name": "TC-F-CHK-001__s07__tab",
      "caption": "Drawer KSK — tab khám chuyên khoa + KQ CLS + kết luận Đạt",
      "uiState": "tab"
     },
     {
      "name": "TC-F-CHK-001__s08__confirm",
      "caption": "Xác nhận cấp giấy chứng nhận sức khỏe",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-CHK-001__s09__success",
      "caption": "Đã chứng nhận + cửa sổ in giấy CN TT36",
      "uiState": "success"
     },
     {
      "name": "TC-F-CHK-001__s10__detail",
      "caption": "/v2/billing — chi phí gói KSK + CLS gộp đúng hóa đơn",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-CHK-002",
    "title": "Data-consistency liên phân hệ: tạo đợt N người → cost-report = Σ chi phí gói × N (+CLS phát sinh)",
    "category": "data-consistency",
    "priority": "P0",
    "role": "admin / kế toán KSK",
    "preconditions": "Đã đăng nhập. Có đợt KSK với gói giá xác định và % giảm. Có quyền xem cost-report.",
    "steps": [
     "Tạo đợt KSK gói G (giá biết trước, vd 500.000đ), % giảm = 10%.",
     "Đăng ký N=5 đối tượng vào đợt (tạo 5 lượt KSK gắn đợt).",
     "Mở report chi phí đợt (GET /campaigns/{id}/cost-report).",
     "Đối chiếu: totalCost = 5 × 500.000 × (1−0.10) = 2.250.000đ; totalRegistered=5.",
     "Thêm 1 dịch vụ CLS phát sinh cho 1 đối tượng → refresh cost-report.",
     "Khẳng định totalCost tăng đúng bằng giá CLS phát sinh; số liệu nhất quán giữa đợt ↔ lượt ↔ billing."
    ],
    "expected": "Cost-report = tổng cộng dồn chính xác (gói × N × (1−giảm) + CLS phát sinh). totalRegistered/totalCompleted khớp số lượt thực. Không lệch tiền giữa các màn.",
    "notes": "Mẫu data-consistency tạo A (đợt) → hiện B (lượt) → tính C (cost-report/billing). Bám related billing.",
    "refIssues": [
     "#217",
     "#267"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-002__s01__form",
      "caption": "Tạo đợt gói G + % giảm 10%",
      "uiState": "form"
     },
     {
      "name": "TC-F-CHK-002__s02__list",
      "caption": "5 lượt KSK đã đăng ký vào đợt",
      "uiState": "list"
     },
     {
      "name": "TC-F-CHK-002__s03__detail",
      "caption": "Cost-report = 2.250.000đ khớp công thức",
      "uiState": "detail"
     },
     {
      "name": "TC-F-CHK-002__s04__detail",
      "caption": "Thêm CLS phát sinh → cost-report cập nhật đúng",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-CHK-003",
    "title": "State-transition liên phân hệ: Chờ → Đang khám → Hoàn thành → Đã chứng nhận; chặn cấp CN khi chưa Hoàn thành",
    "category": "state",
    "priority": "P0",
    "role": "admin / BS khám",
    "preconditions": "Đã đăng nhập. Có 1 lượt KSK status=Chờ.",
    "steps": [
     "Mở lượt KSK status=Chờ; xác nhận badge tone warn.",
     "Chuyển status sang Đang khám (info); lưu; chụp.",
     "Khi đang ở Đang khám/chưa Hoàn thành, thử cấp giấy CN → kỳ vọng bị chặn (báo lỗi/disable).",
     "Nhập kết luận + chuyển Hoàn thành; chụp.",
     "Cấp giấy CN → status Đã chứng nhận (tone ok); chụp.",
     "Thử sửa/chuyển ngược trạng thái sau khi Đã chứng nhận → xác nhận hành vi (chặn hoặc cảnh báo audit)."
    ],
    "expected": "Chỉ chuyển trạng thái theo thứ tự hợp lệ. Không cấp được giấy CN khi lượt chưa Hoàn thành. Sau Đã chứng nhận, thay đổi ngược bị kiểm soát + ghi audit.",
    "notes": "State-transition gắn nghiệp vụ cấp giấy chứng nhận (IssueCertificateAsync). Dedup state nhóm YTCC #267.",
    "refIssues": [
     "#267",
     "#217"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-003__s01__detail",
      "caption": "Lượt KSK status=Chờ (badge warn)",
      "uiState": "detail"
     },
     {
      "name": "TC-F-CHK-003__s02__detail",
      "caption": "Chuyển Đang khám",
      "uiState": "detail"
     },
     {
      "name": "TC-F-CHK-003__s03__error",
      "caption": "Chặn cấp CN khi chưa Hoàn thành",
      "uiState": "error"
     },
     {
      "name": "TC-F-CHK-003__s04__confirm",
      "caption": "Cấp CN sau khi Hoàn thành",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-CHK-003__s05__success",
      "caption": "Đã chứng nhận (badge ok)",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-CHK-004",
    "title": "Validation: form KSK — required (loại/họ tên/giới tính/ngày khám), field chuyên biệt theo loại, ngày sinh > ngày khám",
    "category": "validation",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Đã đăng nhập, mở modal 'KSK mới'.",
    "steps": [
     "Bấm Lưu khi để trống → báo lỗi các field required: Loại KSK, Họ tên đối tượng, Giới tính, Ngày khám.",
     "Chọn Loại=Lái xe → field TT36 hiện; chọn Loại=VSATTP → field TT15 thay thế (kiểm tra đổi field động đúng).",
     "Nhập ngày sinh sau ngày khám (logic vô lý) → kỳ vọng validate hoặc cảnh báo.",
     "Nhập tuổi (tháng) âm/không phải số cho ChildUnder24m → validate boundary.",
     "Nhập đủ field hợp lệ → Lưu thành công."
    ],
    "expected": "FE chặn submit khi thiếu required; field chuyên biệt đổi đúng theo loại; ngày/tuổi không hợp lệ bị validate. BE cũng validate (không tin client). Thông báo lỗi tiếng Việt rõ ràng.",
    "notes": "Bám BASE_FIELDS required + TYPE_EXTRA_FIELDS động. Validation FE↔BE nhất quán.",
    "refIssues": [
     "#267"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-004__s01__validation",
      "caption": "Lỗi required khi submit rỗng",
      "uiState": "validation"
     },
     {
      "name": "TC-F-CHK-004__s02__form",
      "caption": "Đổi loại KSK → field chuyên biệt đổi động",
      "uiState": "form"
     },
     {
      "name": "TC-F-CHK-004__s03__validation",
      "caption": "Ngày sinh > ngày khám bị chặn",
      "uiState": "validation"
     },
     {
      "name": "TC-F-CHK-004__s04__validation",
      "caption": "Tuổi (tháng) âm bị chặn (boundary)",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-F-CHK-005",
    "title": "Import Excel batch danh sách đối tượng vào đợt — lỗi dòng (errorCount) hiển thị + dòng hợp lệ vẫn nhập",
    "category": "edge",
    "priority": "P1",
    "role": "admin / KSK officer",
    "preconditions": "Đã đăng nhập, có 1 đợt KSK. Chuẩn bị file Excel: vài dòng hợp lệ + vài dòng lỗi (thiếu họ tên, sai định dạng ngày).",
    "steps": [
     "Mở đợt → chức năng import Excel (POST /campaigns/{id}/import multipart).",
     "Upload file Excel hỗn hợp hợp lệ + lỗi.",
     "Xác nhận BatchImportResult: totalRows / successCount / errorCount + danh sách errors[] hiển thị.",
     "Đối chiếu: dòng hợp lệ tạo lượt KSK trong đợt; dòng lỗi không tạo + nêu lý do.",
     "Upload file rỗng / sai cột → báo lỗi rõ, không vỡ UI."
    ],
    "expected": "Import xử lý từng dòng độc lập: successCount + errorCount = totalRows; lỗi nêu rõ dòng + lý do tiếng Việt; dòng hợp lệ vẫn vào đợt; file sai format bị từ chối an toàn.",
    "notes": "Edge/boundary import batch — đặc thù KSK doanh nghiệp số lượng lớn.",
    "refIssues": [
     "#267"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-005__s01__modal",
      "caption": "Modal import Excel danh sách đối tượng",
      "uiState": "modal"
     },
     {
      "name": "TC-F-CHK-005__s02__detail",
      "caption": "Kết quả import: success/error count + errors[]",
      "uiState": "detail"
     },
     {
      "name": "TC-F-CHK-005__s03__error",
      "caption": "File sai cột/rỗng bị từ chối",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-CHK-006",
    "title": "Luồng phụ — Hủy đợt KSK giữa chừng: đợt còn lượt chưa hoàn thành → cảnh báo + ràng buộc dữ liệu",
    "category": "negative",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Đã đăng nhập, có 1 đợt đang hoạt động (status active) còn lượt KSK chưa hoàn thành.",
    "steps": [
     "Mở đợt đang hoạt động có lượt dở dang.",
     "Bấm Hủy/Xóa đợt (DELETE /campaigns/{id}) → confirm dialog cảnh báo còn lượt chưa hoàn thành.",
     "Xác nhận hủy → kiểm tra hành vi: chặn nếu còn ràng buộc, hoặc cho hủy nhưng giữ/đánh dấu lượt con.",
     "Đối chiếu cost-report + KPI sau khi hủy: không còn tính đợt đã hủy nhưng dữ liệu lượt con nhất quán.",
     "Kiểm tra audit ghi nhận thao tác hủy."
    ],
    "expected": "Không xóa cứng làm mất lượt con. Confirm trước thao tác nguy hiểm. Sau hủy, số liệu đợt/lượt/billing nhất quán, audit đầy đủ.",
    "notes": "Negative/state — hủy giữa chừng + data-consistency hậu hủy.",
    "refIssues": [
     "#267",
     "#217"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-006__s01__detail",
      "caption": "Đợt đang hoạt động còn lượt dở",
      "uiState": "detail"
     },
     {
      "name": "TC-F-CHK-006__s02__confirm",
      "caption": "Confirm hủy đợt — cảnh báo ràng buộc",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-CHK-006__s03__toast",
      "caption": "Kết quả hủy + audit",
      "uiState": "toast"
     }
    ]
   },
   {
    "id": "TC-F-CHK-007",
    "title": "Lỗi API giữa chừng E2E: mất kết nối khi cấp giấy CN / lưu KQ → KSK không kẹt trạng thái sai, retry an toàn",
    "category": "negative",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Đã đăng nhập. Lượt KSK ở Hoàn thành, sắp cấp CN. Mô phỏng BE 500/timeout (intercept).",
    "steps": [
     "Mở lượt KSK Hoàn thành, bấm Cấp giấy CN; intercept trả 500.",
     "Xác nhận FE báo lỗi rõ (không toast 'thành công' giả), status KHÔNG nhảy sai sang Đã chứng nhận.",
     "Bỏ intercept, retry Cấp CN → thành công, status đúng, không tạo bản ghi trùng.",
     "Lặp lại với lưu KQ chuyên khoa giữa chừng (PUT thất bại) → dữ liệu không mất, có thể nhập lại."
    ],
    "expected": "Lỗi giữa chừng được surface đúng, không claim success giả; không kẹt/không double-issue; retry idempotent về trạng thái nhất quán. Bám interceptor auto-unwrap envelope.",
    "notes": "Negative E2E + integration error-handling. Dedup API-error nhóm YTCC #269.",
    "refIssues": [
     "#269",
     "#217"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-007__s01__error",
      "caption": "Cấp CN gặp 500 — báo lỗi, status không đổi sai",
      "uiState": "error"
     },
     {
      "name": "TC-F-CHK-007__s02__success",
      "caption": "Retry sau khi hết lỗi — cấp CN thành công không trùng",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-CHK-008",
    "title": "Integration HL7 LIS + DICOM: KQ XN/CĐHA của đối tượng KSK đẩy về → hiện ở drawer KSK (KQ XN, X-quang)",
    "category": "integration",
    "priority": "P1",
    "role": "admin / kỹ thuật viên CLS",
    "preconditions": "Đã đăng nhập. Đối tượng KSK có chỉ định XN (HL7 LIS) + chụp X-quang (DICOM PACS Orthanc). LIS/PACS có dữ liệu mẫu.",
    "steps": [
     "Tạo lượt KSK + chỉ định XN máu + X-quang phổi (gói KSK lái xe).",
     "Nhận KQ XN qua HL7 LIS (kết quả về Laboratory).",
     "Đẩy ảnh DICOM về PACS Orthanc; mở viewer xác nhận ảnh.",
     "Quay lại drawer KSK → field 'KQ XN' (labResults) + 'X-quang' (xrayResults) phản ánh đúng KQ CLS.",
     "Khẳng định KQ CLS đồng bộ đúng đối tượng, không lẫn bệnh nhân khác."
    ],
    "expected": "KQ HL7 LIS + ảnh DICOM gắn đúng đối tượng KSK và hiển thị tại drawer; không sai/không lẫn bệnh nhân; nguồn CLS ↔ KSK nhất quán.",
    "notes": "Integration HL7/DICOM cho bước [Thực hiện DV→cls]. Bám related opd/cls.",
    "refIssues": [
     "#217",
     "#267"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-008__s01__detail",
      "caption": "KQ XN HL7 LIS về Laboratory cho đối tượng",
      "uiState": "detail"
     },
     {
      "name": "TC-F-CHK-008__s02__detail",
      "caption": "Ảnh DICOM trên PACS viewer",
      "uiState": "detail"
     },
     {
      "name": "TC-F-CHK-008__s03__tab",
      "caption": "Drawer KSK — KQ XN + X-quang đồng bộ đúng",
      "uiState": "tab"
     }
    ]
   },
   {
    "id": "TC-F-CHK-009",
    "title": "Integration thanh toán online + XML BHXH: KSK BHYT → đẩy viện phí → thanh toán QR/online → quyết toán XML",
    "category": "integration",
    "priority": "P1",
    "role": "admin / thu ngân",
    "preconditions": "Đã đăng nhập. 1 lượt KSK đã Hoàn thành thuộc đối tượng có BHYT. Cổng thanh toán mock/dev sẵn sàng.",
    "steps": [
     "Từ lượt KSK Hoàn thành, đẩy chi phí sang /v2/billing.",
     "Áp BHYT cho phần được hưởng (nếu KSK thuộc diện); xác nhận phần BN tự trả.",
     "Tạo QR/thanh toán online → callback/IPN xác nhận đã thu → hóa đơn chuyển Đã thanh toán.",
     "Sinh dữ liệu quyết toán XML BHXH cho lượt KSK BHYT; kiểm tra XML hợp lệ schema.",
     "Đối chiếu tổng tiền billing = gói + CLS, phần BHYT + phần tự trả khớp."
    ],
    "expected": "Thanh toán online cập nhật trạng thái hóa đơn đúng qua callback; XML BHXH sinh đúng cho phần BHYT; số tiền nhất quán xuyên KSK→billing→insurance.",
    "notes": "Integration payment + XML BHXH cho bước [Viện phí→billing]. Phần KSK BHYT có thể tùy chính sách BV — ghi gap nếu KSK không áp BHYT.",
    "refIssues": [
     "#217"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-009__s01__detail",
      "caption": "Đẩy chi phí KSK sang billing + áp BHYT",
      "uiState": "detail"
     },
     {
      "name": "TC-F-CHK-009__s02__modal",
      "caption": "QR/thanh toán online",
      "uiState": "modal"
     },
     {
      "name": "TC-F-CHK-009__s03__success",
      "caption": "Callback xác nhận — hóa đơn Đã thanh toán",
      "uiState": "success"
     },
     {
      "name": "TC-F-CHK-009__s04__detail",
      "caption": "XML BHXH sinh cho phần BHYT",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-CHK-010",
    "title": "Integration SignalR realtime: tiến độ đợt KSK (totalCompleted) cập nhật live khi lượt chuyển Hoàn thành",
    "category": "integration",
    "priority": "P2",
    "role": "admin (2 phiên trình duyệt)",
    "preconditions": "Đã đăng nhập 2 tab. Có đợt KSK đang chạy với nhiều lượt. SignalR hub kết nối (JWT query-string).",
    "steps": [
     "Tab A: mở dashboard/đợt KSK hiển thị totalRegistered/totalCompleted.",
     "Tab B: chuyển 1 lượt trong đợt sang Hoàn thành.",
     "Quan sát Tab A: totalCompleted/% tiến độ + KpiStrip cập nhật realtime (không cần refresh thủ công).",
     "Ngắt mạng SignalR → xác nhận fallback polling vẫn cập nhật (chậm hơn)."
    ],
    "expected": "Cập nhật realtime qua SignalR; khi mất kết nối có fallback polling; số liệu tiến độ đợt nhất quán giữa 2 phiên.",
    "notes": "Integration SignalR realtime. Nếu KSK chưa wire SignalR → ghi gap.",
    "refIssues": [
     "#267",
     "#269"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-010__s01__detail",
      "caption": "Tab A — tiến độ đợt trước cập nhật",
      "uiState": "detail"
     },
     {
      "name": "TC-F-CHK-010__s02__detail",
      "caption": "Tab A — totalCompleted tăng realtime sau khi Tab B Hoàn thành",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-CHK-011",
    "title": "Permission/Security: API health-checkup [Authorize] — anonymous bị 401; IDOR truy cập đợt/lượt KSK của đơn vị khác",
    "category": "permission",
    "priority": "P0",
    "role": "anonymous + vai trò hạn chế",
    "preconditions": "BE chạy. Có id đợt/lượt KSK hợp lệ. Có 2 đơn vị/công ty dữ liệu tách biệt.",
    "steps": [
     "Gọi GET/POST /api/health-checkup* KHÔNG kèm Bearer JWT → kỳ vọng 401 (không 200, không 500 lộ dữ liệu).",
     "Đăng nhập vai trò hạn chế (không phải KSK officer) → mở /v2/health-checkup → kỳ vọng ẩn nút tạo/cấp CN hoặc 403.",
     "IDOR: dùng token đơn vị A gọi GET /campaigns/{idCủaB} và record/{idCủaB}/certificate → kỳ vọng bị từ chối, không trả dữ liệu B.",
     "Kiểm tra mọi mutation (tạo/sửa/cấp CN/hủy) ghi audit kèm user."
    ],
    "expected": "Anonymous → 401; thiếu quyền → 403/ẩn hành động; không truy cập chéo dữ liệu đơn vị khác (chống IDOR); audit đầy đủ.",
    "notes": "Security IDOR/anonymous bám [Authorize] controller. Bám rule patient-safety/audit.",
    "refIssues": [
     "#217",
     "#267"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-011__s01__error",
      "caption": "Anonymous gọi API → 401",
      "uiState": "error"
     },
     {
      "name": "TC-F-CHK-011__s02__permission",
      "caption": "Vai trò hạn chế — ẩn nút tạo/cấp CN hoặc 403",
      "uiState": "permission"
     },
     {
      "name": "TC-F-CHK-011__s03__error",
      "caption": "IDOR truy cập đợt đơn vị khác bị từ chối",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-CHK-012",
    "title": "Security XSS + path/upload: nhập <script> vào tên đối tượng/ghi chú render an toàn; import upload chặn file không phải Excel",
    "category": "security",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Đã đăng nhập, mở modal KSK + chức năng import đợt.",
    "steps": [
     "Tạo lượt KSK với patientName = '<img src=x onerror=alert(1)>' và notes chứa <script> → lưu.",
     "Mở list + drawer KSK → xác nhận text hiển thị escape, KHÔNG thực thi script.",
     "Chức năng import Excel: upload file .exe/.html đổi đuôi .xlsx → kỳ vọng BE từ chối theo nội dung, không lưu/không thực thi.",
     "Kiểm tra giá trị độc hại lưu raw nhưng render escape ở mọi màn (list/drawer/print)."
    ],
    "expected": "Chuỗi độc hại được escape khi render (không XSS); upload chỉ chấp nhận Excel hợp lệ theo nội dung; không path-traversal/RCE qua import.",
    "notes": "Security XSS + upload validation. Bám tiếng Việt có dấu render đúng.",
    "refIssues": [
     "#269"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-012__s01__form",
      "caption": "Nhập payload XSS vào tên/ghi chú",
      "uiState": "form"
     },
     {
      "name": "TC-F-CHK-012__s02__detail",
      "caption": "Drawer/list render escape — không thực thi",
      "uiState": "detail"
     },
     {
      "name": "TC-F-CHK-012__s03__error",
      "caption": "Import file không phải Excel bị từ chối",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-CHK-013",
    "title": "UI states: empty / loading / error API + dark mode + responsive cho màn KSK và drawer",
    "category": "ui",
    "priority": "P2",
    "role": "admin",
    "preconditions": "Đã đăng nhập /v2/health-checkup.",
    "steps": [
     "DB rỗng KSK → bảng hiện empty 'Chua co kham SK'; chụp empty.",
     "Throttle mạng → trong khi tải hiện 'Dang tai...' / skeleton; chụp loading.",
     "Intercept /health-checkup trả 500 → toast 'Khong tai duoc KSK', UI không vỡ; chụp error.",
     "Bật dark mode (toggle TerminalLayout) → KPI/tabs/bảng/drawer/badge tương phản đạt; chụp dark.",
     "Thu hẹp 320px → toolbar/bảng/drawer responsive không tràn; chụp responsive."
    ],
    "expected": "Empty/loading/error xử lý graceful; dark mode tương phản đạt (ab-* tokens); responsive 320→1920 không vỡ layout.",
    "notes": "UI states — dedup UI nhóm YTCC #269. Bám SearchBox/Filter/StatusTabs/DataTable/DrawerShell.",
    "refIssues": [
     "#269"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-013__s01__empty",
      "caption": "Bảng KSK rỗng — empty state",
      "uiState": "empty"
     },
     {
      "name": "TC-F-CHK-013__s02__loading",
      "caption": "Đang tải danh sách",
      "uiState": "loading"
     },
     {
      "name": "TC-F-CHK-013__s03__error",
      "caption": "API 500 — toast lỗi, UI không vỡ",
      "uiState": "error"
     },
     {
      "name": "TC-F-CHK-013__s04__detail",
      "caption": "Dark mode — KPI/tabs/bảng/drawer tương phản",
      "uiState": "detail"
     },
     {
      "name": "TC-F-CHK-013__s05__list",
      "caption": "Responsive 320px — không tràn",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-F-CHK-014",
    "title": "In giấy chứng nhận đúng template theo loại KSK: Lái xe (TT36) / VSATTP (TT15) / Học sinh — dữ liệu khớp bản ghi",
    "category": "data-consistency",
    "priority": "P1",
    "role": "admin",
    "preconditions": "Đã đăng nhập. Có 3 lượt KSK Đã chứng nhận: Driver, FoodSafety, Student.",
    "steps": [
     "Mở lượt Driver → drawer hiện nút 'In giay CN'; bấm → cửa sổ in template DriverCheckupPrint (TT36) đúng hạng lái/thử phản xạ/thị giác màu.",
     "Mở lượt FoodSafety → in template VsattpCheckupPrint (TT15) đúng vai trò tiếp xúc + kết luận VSATTP.",
     "Mở lượt Student/ChildUnder24m → in template StudentCheckupPrint đúng đánh giá phát triển/dinh dưỡng/tiêm chủng.",
     "Đối chiếu mọi field trên giấy in = dữ liệu drawer (họ tên, mã, kết luận, BS khám).",
     "Loại KSK không có template (tổng quát) → nút in không hiện (printKey=null)."
    ],
    "expected": "Đúng template theo checkupType (TYPE_PRINT_KEY); dữ liệu in khớp bản ghi 100%; loại không có mẫu thì không hiện nút in.",
    "notes": "Data-consistency bản ghi ↔ phiếu in pháp lý (TT36/TT15). Bám HealthCheckupPrintTemplates.",
    "refIssues": [
     "#267"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-014__s01__success",
      "caption": "In giấy CN Lái xe (TT36)",
      "uiState": "success"
     },
     {
      "name": "TC-F-CHK-014__s02__success",
      "caption": "In giấy CN VSATTP (TT15)",
      "uiState": "success"
     },
     {
      "name": "TC-F-CHK-014__s03__success",
      "caption": "In giấy CN Học sinh",
      "uiState": "success"
     },
     {
      "name": "TC-F-CHK-014__s04__detail",
      "caption": "Loại tổng quát — không hiện nút in",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-CHK-015",
    "title": "Luồng ngược / sửa dữ liệu sau tổng hợp: sửa kết luận lượt đã Hoàn thành (chưa cấp CN) → KPI Đạt/Không đạt + cost nhất quán",
    "category": "data-consistency",
    "priority": "P1",
    "role": "admin / BS",
    "preconditions": "Đã đăng nhập. 1 lượt KSK Hoàn thành, kết luận='Đạt', chưa cấp CN.",
    "steps": [
     "Ghi nhận KpiStrip 'Đạt' hiện tại.",
     "Mở lượt, sửa kết luận 'Đạt' → 'Không đạt'; lưu.",
     "Refresh → KpiStrip 'Đạt' giảm 1, 'Không đạt' tăng 1.",
     "Đối chiếu badge kết luận drawer + list đổi tone (ok→crit).",
     "Đảm bảo sửa ngược không phá trạng thái status (vẫn Hoàn thành) + ghi audit thay đổi."
    ],
    "expected": "Luồng ngược sửa kết luận cập nhật KPI + badge nhất quán toàn màn; status không bị reset sai; audit ghi thay đổi.",
    "notes": "Luồng ngược của #217 (quay lại sửa, vẫn nhất quán). Data-consistency KPI ↔ bản ghi.",
    "refIssues": [
     "#217",
     "#267"
    ],
    "evidence": [
     {
      "name": "TC-F-CHK-015__s01__detail",
      "caption": "KPI Đạt trước khi sửa",
      "uiState": "detail"
     },
     {
      "name": "TC-F-CHK-015__s02__form",
      "caption": "Sửa kết luận Đạt → Không đạt",
      "uiState": "form"
     },
     {
      "name": "TC-F-CHK-015__s03__detail",
      "caption": "KPI Đạt giảm, Không đạt tăng; badge đổi tone",
      "uiState": "detail"
     }
    ]
   }
  ],
  "gaps": [
   "FE v2 HealthCheckup.tsx hiện CHỈ có màn lượt KSK (DataTable + drawer + CrudModal); chưa thấy màn UI riêng cho quản lý ĐỢT KSK (campaigns) / NHÓM (groups) / IMPORT Excel / COST-REPORT dù API healthCheckup.ts đã có (getCampaigns/createCampaign/...groups/import/cost-report). Các task TC-F-CHK-001/002/005/006/010 giả định UI đợt tồn tại — cần verify có màn campaign hay phải gọi qua API/v1 trước khi chạy; nếu thiếu UI → tạo issue feature port màn đợt sang v2.",
   "Mức liên kết KSK → CLS (Laboratory) → Billing chưa verify là wired end-to-end trong code FE: không thấy luồng tạo chỉ định CLS trực tiếp từ lượt KSK hay đẩy chi phí gói KSK sang billing tự động. labResults/xrayResults trong HealthCheckup là field text nhập tay, CHƯA chắc lấy tự động từ HL7 LIS/PACS. Cần verify backend HealthCheckupService có gắn ServiceOrder/Invoice không; nếu là nhập tay → TC-F-CHK-008/009 cần điều chỉnh hoặc tách issue tích hợp.",
   "Chính sách BHYT cho KSK: phần lớn KSK (lái xe/VSATTP/định kỳ doanh nghiệp) là dịch vụ tự trả, KHÔNG áp BHYT — cần xác nhận có loại KSK nào thuộc diện BHYT/XML BHXH không. Nếu không → TC-F-CHK-009 phần XML BHXH là N/A, chỉ test thanh toán online tự trả.",
   "SignalR realtime cho tiến độ đợt KSK (TC-F-CHK-010): chưa verify có hub đẩy cập nhật totalCompleted; nhiều màn dùng polling. Cần kiểm tra trước khi test integration realtime.",
   "Phân quyền chi tiết theo vai trò KSK officer / BS / thu ngân chưa thấy enforce ở FE (controller chỉ [Authorize] chung, không [Authorize(Roles=...)]). TC-F-CHK-011 phần ẩn nút/403 theo vai trò có thể chưa được hỗ trợ → cần verify role-based authorization; nếu thiếu → tạo issue security.",
   "Tách bạch dữ liệu đa-đơn-vị (multi-tenant) để test IDOR (TC-F-CHK-011): chưa verify HIS có scoping theo công ty/đơn vị cho đợt KSK; nếu mọi user admin thấy mọi đợt → IDOR test cần định nghĩa lại biên giới quyền.",
   "Code field types mã loại KSK không nhất quán giữa FE và fallback API: TYPE_EXTRA_FIELDS/TYPE_PRINT_KEY dùng PascalCase ('Driver','FoodSafety','Student','ChildUnder24m') nhưng fallback getCheckupTypes trả snake_case ('driver','student','infant'). Nếu BE trả code snake_case thật → field chuyên biệt + template in KHÔNG match → đây là BUG tiềm ẩn; TC-F-CHK-004/014 nhiều khả năng phát hiện, cần tạo issue fix mapping code loại KSK."
  ]
 },
 {
  "id": "billing",
  "code": "F-BIL",
  "ic": "💰",
  "layer": "fin",
  "nm": "Viện phí & BHYT",
  "gh": [
   "#232",
   "#265"
  ],
  "flow_id": "billing",
  "summary": "Bộ test-task END-TO-END cho luồng \"Viện phí & BHYT\" (flow id=billing). Grounded từ data.js: desc=\"BN → tổng hợp chi phí → thanh toán → xuất HĐĐT → quyết toán BHYT\"; steps=[Tổng hợp chi phí→billing, Thanh toán/HĐĐT→billing, Áp BHYT→insurance, Nộp XML BHXH→insurance]; related=[insurance, reports]. Chuỗi dữ liệu thật (rel): DV trong MedicalRecord ⟶ Receipts ⟶ ReceiptDetails ⟶ Payments/PaymentTransactions ⟶ ElectronicInvoices · Deposits (tạm ứng); insurance: MedicalRecord(BHYT) ⟶ InsuranceClaims ⟶ InsuranceClaimDetails ⟶ InsuranceXMLSubmissions. Màn thật (FE v2, TerminalLayout): /v2/billing (Viện phí, có Tạo HĐ, Thu tiền PayModal cash/card/transfer, In HĐ, drawer), /v2/finance (sổ quỹ/tài chính), /v2/insurance (Giám định BHYT), /v2/bank-payments (TT Ngân hàng), /v2/billing-guarantors (Bảo lãnh). paymentStatus: 0/1=chờ thu, 2=đã thu. 17 task: trọng tâm happy-path E2E xuyên màn (tổng hợp→thu→HĐĐT→BHYT→XML), data-consistency liên phân hệ (tạo DV→hiện viện phí→tính tổng/số dư), state-transition liên phân hệ (Draft/Pending/Paid/Refunded/Cancelled + khóa sửa khi Paid), luồng phụ/ngoại lệ (tạm ứng trừ dần, hoàn tiền, hủy giữa chừng, thẻ BHYT bị chặn), integration (e-invoice/XML BHXH/payment QR/SignalR), security (IDOR/anonymous/XSS), evidence tại mỗi điểm chuyển màn. Chi tiết hóa, không tạo trùng #232/#265/#217.",
  "tasks": [
   {
    "id": "TC-F-BIL-001",
    "title": "Happy-path E2E xuyen man: tong hop chi phi -> thu tien -> in HDDT (mot lan tro vien)",
    "category": "happy",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "Đăng nhập admin/Admin@123 (JWT localStorage token+user). Có 1 BN đã khám OPD + có DV/thuốc trong MedicalRecord chưa thanh toán (seed dev ổn định). Backend localhost:5106 up.",
    "steps": [
     "Mở /v2/billing, xác nhận KPI strip (HĐ hôm nay/Chờ thu/Đã thu/Doanh thu/BHYT/Tổng nợ) hiển thị.",
     "Tìm BN theo tên/mã trong DataTable; mở drawer (BillingDrawerBody) xem chi tiết các ReceiptDetails tổng hợp từ DV trong MedicalRecord.",
     "Ghi lại tổng tiền dịch vụ hiển thị trong drawer (= A).",
     "Bấm rowAction 'Thu tiền' (chỉ hiện khi paymentStatus 0/1) → PayModal mở.",
     "Chọn phương thức 'Tiền mặt', nhập số tiền = đúng số phải thu (due = remainingAmount/totalAmount), nhập received, xác nhận tiền thừa tính đúng.",
     "Bấm xác nhận thu tiền (createPayment) → chờ toast thành công.",
     "Quay lại list: hàng BN chuyển trạng thái sang 'Đã thu' (paymentStatus=2), nút 'Thu tiền' biến mất, chỉ còn 'In HĐ'.",
     "Bấm 'In HĐ' (onPrintInvoice) → xác nhận HĐĐT/biên lai render đúng số tiền A, tên BN, mã HĐ."
    ],
    "expected": "Toàn chuỗi tổng-hợp→thu→in chạy liền mạch; sau thu: paymentStatus=2, KPI 'Đã thu' +1 và 'Doanh thu' tăng đúng A, 'Chờ thu' giảm 1; biên lai/HĐĐT in ra khớp số tiền và mã HĐ. Bản ghi Payments + ElectronicInvoices được tạo (audit ghi mutation).",
    "notes": "Chi tiết hóa #232/#217 — bám steps[0]+[1] (Tổng hợp chi phí, Thanh toán/HĐĐT). Assert OUTCOME số tiền, không chỉ trang load.",
    "refIssues": [
     "#232",
     "#217"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-001__s01__list",
      "caption": "Danh sách viện phí + KPI strip trước khi thu",
      "uiState": "list"
     },
     {
      "name": "TC-F-BIL-001__s02__drawer",
      "caption": "Drawer chi tiết chi phí tổng hợp từ DV (số tiền A)",
      "uiState": "drawer"
     },
     {
      "name": "TC-F-BIL-001__s03__modal",
      "caption": "PayModal nhập tiền mặt, tiền thừa tính đúng",
      "uiState": "modal"
     },
     {
      "name": "TC-F-BIL-001__s04__success",
      "caption": "Toast thu tiền thành công",
      "uiState": "success"
     },
     {
      "name": "TC-F-BIL-001__s05__list",
      "caption": "Hàng BN chuyển Đã thu, KPI Doanh thu tăng đúng A",
      "uiState": "list"
     },
     {
      "name": "TC-F-BIL-001__s06__detail",
      "caption": "HĐĐT/biên lai in ra khớp số tiền + mã HĐ",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-BIL-002",
    "title": "Data-consistency lien phan he: tao DV (CLS/thuoc) -> hien o vien phi -> tong tien dung",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "Đăng nhập admin. Chọn 1 BN có MedicalRecord mở. Biết đơn giá các DV CLS/thuốc để tự cộng tay.",
    "steps": [
     "Tại phân hệ chỉ định/CLS hoặc kê đơn (OPD), thêm cho BN: 1 DV CLS (giá X) + 1 thuốc (giá Y). Lưu.",
     "Mở /v2/billing, tìm BN → mở drawer.",
     "Đối chiếu danh sách ReceiptDetails: phải xuất hiện đủ DV CLS (X) và thuốc (Y) vừa tạo.",
     "Tính tay tổng = X + Y, so với 'Tổng tiền'/totalAmount trong drawer + ô KPI Tổng nợ.",
     "Thêm 1 phụ thu (AdditionalCharges, giá Z) cho BN, reload billing.",
     "Xác nhận tổng cập nhật = X + Y + Z và số dư phải thu (remainingAmount) khớp."
    ],
    "expected": "Mọi DV/thuốc/phụ thu tạo ở phân hệ nguồn (MedicalRecord) hiện đúng ở Viện phí; tổng tiền = đúng tổng cộng tay (X+Y+Z), số dư phải thu chính xác, không lệch/thiếu dòng. Tạo A → hiện B → tính C đúng.",
    "notes": "Bám rel: DV trong MedicalRecord ⟶ Receipts ⟶ ReceiptDetails. Là phần data-consistency liên phân hệ của #232.",
    "refIssues": [
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-002__s01__form",
      "caption": "Thêm DV CLS + thuốc cho BN tại phân hệ nguồn",
      "uiState": "form"
     },
     {
      "name": "TC-F-BIL-002__s02__drawer",
      "caption": "Drawer viện phí hiển thị đủ ReceiptDetails X,Y",
      "uiState": "drawer"
     },
     {
      "name": "TC-F-BIL-002__s03__detail",
      "caption": "Tổng tiền = X+Y khớp tính tay",
      "uiState": "detail"
     },
     {
      "name": "TC-F-BIL-002__s04__drawer",
      "caption": "Sau thêm phụ thu Z, tổng = X+Y+Z, số dư đúng",
      "uiState": "drawer"
     }
    ]
   },
   {
    "id": "TC-F-BIL-003",
    "title": "Tam ung (Deposits) tru dan vao vien phi -> so du giam dung",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "Đăng nhập admin. BN nội trú/ngoại trú có chi phí phải thu > 0.",
    "steps": [
     "Tạo phiếu tạm ứng (Deposits) cho BN số tiền D (vd 500.000).",
     "Mở /v2/billing drawer của BN → xác nhận hiển thị khoản tạm ứng D.",
     "Ghi nhận tổng phải thu = T, số dư còn lại phải = T - D.",
     "Thực hiện thu tiền phần còn lại (PayModal) đúng = T - D.",
     "Xác nhận trạng thái Đã thu, số dư = 0; tổng đã nộp = tạm ứng D + thu (T-D) = T."
    ],
    "expected": "Tạm ứng được trừ dần đúng: số dư = tổng - tạm ứng; sau thu phần còn lại số dư về 0; tổng tiền nhận = T không bị tính trùng/lệch. Ledger sổ quỹ ghi đúng cả tạm ứng và thu.",
    "notes": "Luồng phụ tạm ứng — chi tiết hóa #232 (tạm ứng → trừ dần).",
    "refIssues": [
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-003__s01__form",
      "caption": "Tạo phiếu tạm ứng số tiền D",
      "uiState": "form"
     },
     {
      "name": "TC-F-BIL-003__s02__drawer",
      "caption": "Drawer hiển thị tạm ứng + số dư = T - D",
      "uiState": "drawer"
     },
     {
      "name": "TC-F-BIL-003__s03__modal",
      "caption": "Thu phần còn lại T-D",
      "uiState": "modal"
     },
     {
      "name": "TC-F-BIL-003__s04__success",
      "caption": "Số dư về 0, tổng nhận = T",
      "uiState": "success"
     }
    ]
   },
   {
    "id": "TC-F-BIL-004",
    "title": "State-transition: HD da Paid bi khoa sua/khoa thu lai (chong thu trung)",
    "category": "state",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "Có 1 HĐ đã thanh toán đủ (paymentStatus=2) từ TC-F-BIL-001.",
    "steps": [
     "Mở /v2/billing, tìm HĐ đã thu.",
     "Xác nhận rowAction 'Thu tiền' KHÔNG hiển thị (chỉ còn 'In HĐ').",
     "Mở drawer → xác nhận không có nút sửa chi phí / thêm DV trên HĐ đã chốt.",
     "Thử gọi trực tiếp endpoint createPayment cho HĐ đã Paid (qua devtools/script) → BE phải từ chối."
    ],
    "expected": "HĐ ở trạng thái Paid bị khóa: UI ẩn nút thu/sửa; BE chặn thu lại / sửa chi phí (transition Paid→Paid hoặc sửa bị từ chối có thông báo). Không thể thu trùng tiền.",
    "notes": "State-transition guard — bám #232 (Paid→khóa sửa). Negative ở tầng API.",
    "refIssues": [
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-004__s01__list",
      "caption": "HĐ Paid: chỉ còn nút In HĐ, ẩn Thu tiền",
      "uiState": "list"
     },
     {
      "name": "TC-F-BIL-004__s02__drawer",
      "caption": "Drawer HĐ đã chốt không cho sửa chi phí",
      "uiState": "drawer"
     },
     {
      "name": "TC-F-BIL-004__s03__error",
      "caption": "BE từ chối thu lại HĐ đã Paid",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-BIL-005",
    "title": "Validation PayModal: so tien thu <=0, > so du, thieu so tham chieu chuyen khoan",
    "category": "validation",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "Đăng nhập admin. Có HĐ chờ thu (paymentStatus 0/1) số dư due > 0.",
    "steps": [
     "Mở PayModal cho HĐ chờ thu.",
     "Nhập số tiền = 0 → bấm xác nhận → kỳ vọng chặn + báo lỗi.",
     "Nhập số tiền > số dư due (thu vượt) → kỳ vọng chặn hoặc cảnh báo rõ ràng.",
     "Chọn phương thức 'Chuyển khoản' nhưng để trống số tham chiếu (ref) → kỳ vọng chặn yêu cầu nhập ref.",
     "Nhập hợp lệ → xác nhận pass."
    ],
    "expected": "Form chặn số tiền <=0 và > số dư; chuyển khoản bắt buộc số tham chiếu; thông báo lỗi rõ ràng tiếng Việt có dấu; chỉ submit khi hợp lệ. FE + BE cùng validate (không tin client).",
    "notes": "Validation chi tiết PayModal — bổ sung mảng #232 chưa nêu cụ thể.",
    "refIssues": [
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-005__s01__modal",
      "caption": "PayModal trống ban đầu",
      "uiState": "modal"
     },
     {
      "name": "TC-F-BIL-005__s02__validation",
      "caption": "Lỗi số tiền = 0",
      "uiState": "validation"
     },
     {
      "name": "TC-F-BIL-005__s03__validation",
      "caption": "Lỗi thu vượt số dư",
      "uiState": "validation"
     },
     {
      "name": "TC-F-BIL-005__s04__validation",
      "caption": "Lỗi chuyển khoản thiếu số tham chiếu",
      "uiState": "validation"
     }
    ]
   },
   {
    "id": "TC-F-BIL-006",
    "title": "Hoan tien (Refunded) sau khi da thu -> ledger so quy giam dung",
    "category": "state",
    "priority": "P0",
    "role": "Thu ngân",
    "preconditions": "Có HĐ đã thu (paymentStatus=2). BN hủy DV chưa thực hiện cần hoàn tiền.",
    "steps": [
     "Mở HĐ đã thu, thực hiện hoàn tiền (refund) cho phần DV bị hủy số tiền R.",
     "Xác nhận trạng thái chuyển sang Refunded (toàn phần) hoặc partial-refund (một phần).",
     "Mở /v2/finance (sổ quỹ/CashBooks) → xác nhận bút toán chi hoàn tiền R xuất hiện, số dư quỹ giảm đúng R.",
     "Xác nhận HĐĐT có điều chỉnh/biên lai hoàn tương ứng."
    ],
    "expected": "Hoàn tiền tạo bút toán âm/chi trong CashBooks đúng R; trạng thái HĐ → Refunded; số dư sổ quỹ giảm đúng; không cho hoàn vượt số đã thu. Audit ghi mutation hoàn tiền.",
    "notes": "Luồng ngược + đối soát — chi tiết hóa #232 (hoàn tiền → ledger).",
    "refIssues": [
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-006__s01__modal",
      "caption": "Form hoàn tiền số tiền R",
      "uiState": "modal"
     },
     {
      "name": "TC-F-BIL-006__s02__success",
      "caption": "HĐ chuyển trạng thái Refunded",
      "uiState": "success"
     },
     {
      "name": "TC-F-BIL-006__s03__list",
      "caption": "Sổ quỹ /v2/finance có bút toán chi hoàn R",
      "uiState": "list"
     },
     {
      "name": "TC-F-BIL-006__s04__detail",
      "caption": "Số dư quỹ giảm đúng R",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-BIL-007",
    "title": "Huy HD giua chung (Cancelled) khi chua thu -> khong tao ledger, khong thu duoc",
    "category": "negative",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "Có HĐ chờ thu (paymentStatus 0/1) chưa thanh toán.",
    "steps": [
     "Mở HĐ chờ thu, thực hiện Hủy HĐ (Cancelled) với lý do.",
     "Xác nhận xuất hiện confirm dialog yêu cầu lý do hủy.",
     "Xác nhận trạng thái → Cancelled; nút 'Thu tiền' biến mất.",
     "Xác nhận KHÔNG có bút toán thu nào trong CashBooks cho HĐ này.",
     "Thử thu tiền HĐ đã Cancelled qua API → BE từ chối."
    ],
    "expected": "Hủy HĐ chưa thu chuyển sang Cancelled không tạo ledger; bắt buộc lý do; sau hủy không thể thu; transition Cancelled→Paid bị chặn ở BE. Audit ghi việc hủy + lý do.",
    "notes": "Lỗi giữa chừng/hủy — chi tiết hóa state Cancelled của #232.",
    "refIssues": [
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-007__s01__confirm",
      "caption": "Confirm hủy HĐ yêu cầu lý do",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-BIL-007__s02__list",
      "caption": "HĐ chuyển Cancelled, ẩn nút thu",
      "uiState": "list"
     },
     {
      "name": "TC-F-BIL-007__s03__error",
      "caption": "BE từ chối thu HĐ đã hủy",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-BIL-008",
    "title": "Ap BHYT lien phan he: HD BHYT -> Giam dinh BHYT tinh muc huong + dong chi tra dung",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Giám định BHYT",
    "preconditions": "Đăng nhập admin. BN có thẻ BHYT hợp lệ + DV thuộc danh mục BHYT. Tổng chi phí = T.",
    "steps": [
     "Mở /v2/billing HĐ của BN có BHYT → xác nhận drawer hiển thị phần BHYT chi trả (insuranceAmount) + phần BN tự trả.",
     "Tính tay: BHYT chi trả = T × mức hưởng (vd 80%); BN đồng chi trả = T - BHYT.",
     "Mở /v2/insurance (Giám định BHYT) → tìm hồ sơ InsuranceClaims của BN.",
     "Đối chiếu InsuranceClaimDetails: từng dòng DV có mức hưởng + số tiền BHYT khớp drawer billing.",
     "Xác nhận tổng InsuranceClaim = tổng insuranceAmount ở billing (data-consistency 2 phân hệ)."
    ],
    "expected": "Áp BHYT tính đúng: insuranceAmount = T × mức hưởng, BN đồng chi trả = phần còn lại; hồ sơ InsuranceClaims/Details ở /v2/insurance khớp 1-1 với phần BHYT ở /v2/billing; không lệch tiền giữa 2 phân hệ.",
    "notes": "Bám steps[2] (Áp BHYT→insurance). Data-consistency billing↔insurance. Chi tiết hóa #232 (đối soát BHYT).",
    "refIssues": [
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-008__s01__drawer",
      "caption": "Drawer billing: BHYT chi trả + BN tự trả",
      "uiState": "drawer"
     },
     {
      "name": "TC-F-BIL-008__s02__list",
      "caption": "/v2/insurance hồ sơ InsuranceClaims của BN",
      "uiState": "list"
     },
     {
      "name": "TC-F-BIL-008__s03__detail",
      "caption": "InsuranceClaimDetails mức hưởng khớp billing",
      "uiState": "detail"
     },
     {
      "name": "TC-F-BIL-008__s04__detail",
      "caption": "Tổng claim = tổng insuranceAmount billing",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-BIL-009",
    "title": "The BHYT bi chan (BlockedInsurances) -> khong ap BHYT, canh bao patient-safety",
    "category": "edge",
    "priority": "P1",
    "role": "Giám định BHYT",
    "preconditions": "BN có thẻ BHYT nằm trong BlockedInsurances (thẻ bị chặn/hết hạn).",
    "steps": [
     "Mở HĐ của BN có thẻ BHYT bị chặn tại /v2/billing.",
     "Xác nhận hệ thống cảnh báo thẻ bị chặn/không hợp lệ, không tự áp mức hưởng BHYT.",
     "Xác nhận phần phải thu = 100% tổng (BN tự trả toàn bộ), insuranceAmount = 0.",
     "Tại /v2/insurance xác nhận không tạo hồ sơ claim hợp lệ cho thẻ bị chặn (hoặc gắn cờ từ chối)."
    ],
    "expected": "Thẻ BHYT bị chặn không được áp mức hưởng; cảnh báo rõ ràng; BN trả 100%; không sinh claim hợp lệ. Tránh trục lợi BHYT (compliance).",
    "notes": "Edge/boundary thẻ chặn — bám bảng BlockedInsurances. Bổ sung ngoài #232.",
    "refIssues": [
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-009__s01__drawer",
      "caption": "Cảnh báo thẻ BHYT bị chặn",
      "uiState": "drawer"
     },
     {
      "name": "TC-F-BIL-009__s02__detail",
      "caption": "Phải thu 100%, insuranceAmount = 0",
      "uiState": "detail"
     },
     {
      "name": "TC-F-BIL-009__s03__error",
      "caption": "/v2/insurance không tạo claim hợp lệ",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-BIL-010",
    "title": "Nop XML BHXH (InsuranceXMLSubmissions) -> trang thai Submitted/Acknowledged + payload dung schema",
    "category": "integration",
    "priority": "P0",
    "role": "Giám định BHYT",
    "preconditions": "Có InsuranceClaims đã giám định xong sẵn sàng nộp. MockMode dev cho cổng BHXH.",
    "steps": [
     "Mở /v2/insurance, chọn hồ sơ/đợt claim cần nộp XML BHXH.",
     "Bấm 'Nộp XML BHXH' → kiểm tra XML sinh ra đúng schema (XML 1/2/3/4/5 BHXH: thông tin BN, DV, thuốc, tổng tiền, mức hưởng).",
     "Xác nhận trạng thái submission chuyển Submitted; (MockMode) nhận Acknowledged.",
     "Nộp lại lần 2 cùng đợt → xác nhận idempotency, không tạo bản ghi trùng / không double-submit.",
     "Mô phỏng cổng BHXH lỗi/timeout → xác nhận trạng thái Failed + cho phép gửi lại."
    ],
    "expected": "XML nộp đúng schema BHXH; trạng thái Submitted→Acknowledged đúng; nộp lại không trùng (idempotent); cổng lỗi → Failed + retry được. InsuranceXMLSubmissions ghi đủ.",
    "notes": "Bám steps[3] (Nộp XML BHXH→insurance). CHỒNG LẤN #265 (integration/gateway-failure nhóm Liên thông): task này CHỈ test khía cạnh viện phí→XML BHXH; phần gateway-failure/circuit-breaker chung thuộc #265 — không lặp, chỉ tham chiếu.",
    "refIssues": [
     "#232",
     "#265"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-010__s01__list",
      "caption": "/v2/insurance chọn đợt claim nộp XML",
      "uiState": "list"
     },
     {
      "name": "TC-F-BIL-010__s02__detail",
      "caption": "XML sinh ra đúng schema BHXH",
      "uiState": "detail"
     },
     {
      "name": "TC-F-BIL-010__s03__success",
      "caption": "Trạng thái Submitted/Acknowledged",
      "uiState": "success"
     },
     {
      "name": "TC-F-BIL-010__s04__error",
      "caption": "Cổng lỗi/timeout → Failed, cho gửi lại",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-BIL-011",
    "title": "Phat hanh HDDT (ElectronicInvoices) sau thu tien -> ma so/serial dung, khong phat hanh trung",
    "category": "integration",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "Có HĐ vừa thu xong (paymentStatus=2) chưa phát hành HĐĐT.",
    "steps": [
     "Mở HĐ đã thu, bấm phát hành HĐĐT.",
     "Xác nhận HĐĐT nhận mã số/serial hợp lệ, ngày phát hành, số tiền khớp đã thu.",
     "Bấm phát hành lại HĐ đã có HĐĐT → kỳ vọng chặn (không phát hành trùng/cấp 2 số).",
     "In/xem HĐĐT → nội dung (tên BN, DV, tiền, thuế nếu có) đúng."
    ],
    "expected": "HĐĐT phát hành 1 lần, mã/serial duy nhất, số tiền khớp; chặn phát hành trùng; nội dung in đúng. ElectronicInvoices liên kết đúng Receipt/Payment.",
    "notes": "Integration e-invoice — chi tiết hóa #232 (e-invoice phát hành).",
    "refIssues": [
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-011__s01__modal",
      "caption": "Phát hành HĐĐT",
      "uiState": "modal"
     },
     {
      "name": "TC-F-BIL-011__s02__success",
      "caption": "HĐĐT có mã/serial + số tiền khớp",
      "uiState": "success"
     },
     {
      "name": "TC-F-BIL-011__s03__error",
      "caption": "Chặn phát hành trùng",
      "uiState": "error"
     },
     {
      "name": "TC-F-BIL-011__s04__detail",
      "caption": "Nội dung HĐĐT in đúng",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-BIL-012",
    "title": "Thanh toan online QR/bank (PaymentTransactions/OnlinePayments) -> doi soat khop HD",
    "category": "integration",
    "priority": "P1",
    "role": "Thu ngân",
    "preconditions": "Có HĐ chờ thu. /v2/bank-payments cấu hình ngân hàng (BIDV/VCB...) MockMode dev.",
    "steps": [
     "Mở HĐ chờ thu, chọn thu qua QR/chuyển khoản ngân hàng → sinh mã QR (VietQR/Napas) gắn số tiền + nội dung mã HĐ.",
     "Mô phỏng IPN/callback báo đã nhận tiền đúng số tiền + đúng mã tham chiếu HĐ.",
     "Xác nhận PaymentTransactions ghi giao dịch, HĐ chuyển Đã thu, biên lai sinh.",
     "Mở /v2/bank-payments → đối soát giao dịch ngân hàng khớp HĐ (số tiền + ref).",
     "Edge: IPN số tiền lệch / ref không khớp HĐ → không tự gạch nợ, đánh dấu cần đối soát thủ công."
    ],
    "expected": "QR sinh đúng số tiền/nội dung; callback đúng → gạch nợ + Đã thu + biên lai; đối soát /v2/bank-payments khớp; callback lệch tiền/sai ref → không tự gạch, vào danh sách đối soát tay. Không double-credit khi callback lặp.",
    "notes": "Integration payment — chi tiết hóa #232 (thanh toán QR/bank → đối soát). Phần gateway-failure chung thuộc #265 (không lặp).",
    "refIssues": [
     "#232",
     "#265"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-012__s01__modal",
      "caption": "Sinh QR thanh toán gắn mã HĐ",
      "uiState": "modal"
     },
     {
      "name": "TC-F-BIL-012__s02__success",
      "caption": "Callback đúng → HĐ Đã thu, biên lai",
      "uiState": "success"
     },
     {
      "name": "TC-F-BIL-012__s03__list",
      "caption": "/v2/bank-payments đối soát khớp HĐ",
      "uiState": "list"
     },
     {
      "name": "TC-F-BIL-012__s04__error",
      "caption": "Callback lệch tiền/sai ref → đối soát thủ công",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-BIL-013",
    "title": "SignalR realtime: thu tien o may A -> KPI/list /v2/billing may B cap nhat tuc thoi",
    "category": "integration",
    "priority": "P2",
    "role": "Thu ngân",
    "preconditions": "Mở /v2/billing trên 2 phiên (2 tab/2 máy) cùng đăng nhập. SignalR hub up + JWT query-string auth.",
    "steps": [
     "Tab A và Tab B cùng mở danh sách viện phí, ghi nhận KPI 'Chờ thu'/'Đã thu'.",
     "Tab A thực hiện thu tiền 1 HĐ.",
     "Quan sát Tab B (không reload thủ công).",
     "Tắt SignalR (mô phỏng mất kết nối) → xác nhận polling fallback vẫn cập nhật sau chu kỳ."
    ],
    "expected": "Tab B nhận push realtime: hàng HĐ chuyển Đã thu + KPI cập nhật không cần reload; khi mất SignalR có polling fallback. Không lệch số liệu giữa 2 phiên.",
    "notes": "Integration SignalR realtime — không trùng #265 (nhóm Liên thông gateway); đây là realtime nội bộ viện phí.",
    "refIssues": [
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-013__s01__list",
      "caption": "Tab A + Tab B trạng thái ban đầu",
      "uiState": "list"
     },
     {
      "name": "TC-F-BIL-013__s02__success",
      "caption": "Tab A thu tiền thành công",
      "uiState": "success"
     },
     {
      "name": "TC-F-BIL-013__s03__list",
      "caption": "Tab B tự cập nhật Đã thu + KPI realtime",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-F-BIL-014",
    "title": "Permission: vai tro khong phai Thu ngan/Giam dinh khong thu tien / khong nop XML",
    "category": "permission",
    "priority": "P1",
    "role": "Bác sĩ / Điều dưỡng (không quyền tài chính)",
    "preconditions": "Có user vai trò lâm sàng (không có quyền billing/insurance) hoặc tạm gỡ quyền của 1 user.",
    "steps": [
     "Đăng nhập user vai trò lâm sàng, vào /v2/billing.",
     "Xác nhận không thấy nút 'Thu tiền'/'Tạo HĐ' hoặc bị chặn khi bấm.",
     "Vào /v2/insurance thử nộp XML BHXH → bị chặn.",
     "Thử gọi trực tiếp API thu tiền/nộp XML với token vai trò này → BE trả 403."
    ],
    "expected": "UI ẩn/disable hành động tài chính với vai trò không có quyền; BE enforce 403 (không chỉ ẩn FE). Phân quyền nhất quán FE+BE.",
    "notes": "Permission — bổ sung mảng chưa nêu rõ ở #232.",
    "refIssues": [
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-014__s01__permission",
      "caption": "/v2/billing ẩn nút thu/tạo HĐ với vai trò lâm sàng",
      "uiState": "permission"
     },
     {
      "name": "TC-F-BIL-014__s02__permission",
      "caption": "/v2/insurance chặn nộp XML",
      "uiState": "permission"
     },
     {
      "name": "TC-F-BIL-014__s03__error",
      "caption": "BE trả 403 khi gọi API trực tiếp",
      "uiState": "error"
     }
    ]
   },
   {
    "id": "TC-F-BIL-015",
    "title": "Security IDOR + anonymous + XSS tren vien phi/HDDT",
    "category": "security",
    "priority": "P0",
    "role": "Thu ngân / attacker",
    "preconditions": "Biết invoiceId/receiptId của BN khác. Có 1 user hợp lệ.",
    "steps": [
     "IDOR: với token user A, gọi GET/POST endpoint biên lai/HĐĐT bằng id của BN khác (không thuộc phạm vi) → kỳ vọng 403/404, không lộ dữ liệu.",
     "Anonymous: gọi endpoint billing/insurance không kèm JWT → kỳ vọng 401, không trả dữ liệu (kiểm cả dev/seed endpoint không lộ ở prod).",
     "XSS: tạo HĐ/ghi chú thu tiền với payload <script>alert(1)</script> trong trường note → mở drawer/in HĐ → xác nhận escape, không thực thi.",
     "Path: thử truy cập file HĐĐT/biên lai PDF bằng path traversal (../) → bị chặn."
    ],
    "expected": "IDOR bị chặn (403/404, không lộ HĐ BN khác); anonymous 401; payload XSS bị escape khi render/in; path traversal bị chặn. Bám hardening đã làm (#180/#181/#184).",
    "notes": "Security — bổ sung ngoài #232/#265. Liên hệ các fix bảo mật gần đây (#180-184).",
    "refIssues": [
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-015__s01__error",
      "caption": "IDOR: truy cập HĐ BN khác bị 403/404",
      "uiState": "error"
     },
     {
      "name": "TC-F-BIL-015__s02__error",
      "caption": "Anonymous gọi billing API → 401",
      "uiState": "error"
     },
     {
      "name": "TC-F-BIL-015__s03__detail",
      "caption": "Payload XSS bị escape trong drawer/HĐ",
      "uiState": "detail"
     }
    ]
   },
   {
    "id": "TC-F-BIL-016",
    "title": "UI states /v2/billing: empty / loading / error / responsive / dark mode",
    "category": "ui",
    "priority": "P2",
    "role": "Thu ngân",
    "preconditions": "Có thể giả lập API chậm/lỗi (devtools throttle / chặn). Có toggle dark/light.",
    "steps": [
     "Lọc danh sách về tập rỗng (filter không khớp) → xác nhận empty state thân thiện (không lỗi).",
     "Throttle mạng → mở /v2/billing → xác nhận loading skeleton/spinner DataTable + KPI.",
     "Chặn API billing trả 500 → xác nhận error state có thông báo + nút thử lại, không trắng trang.",
     "Thu nhỏ cửa sổ (responsive) → DataTable/KPI strip/drawer co giãn hợp lý.",
     "Bật dark mode → kiểm tương phản KPI/bảng/drawer/PayModal đạt (không chữ chìm)."
    ],
    "expected": "Đủ 4 trạng thái empty/loading/error + responsive + dark mode đạt tương phản; không trắng trang, không spinner vô hạn, không vỡ layout. Tiếng Việt có dấu hiển thị đúng.",
    "notes": "UI states + dark — bổ sung mảng UI (ngoài #232 vốn tập trung workflow/tiền).",
    "refIssues": [
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-016__s01__empty",
      "caption": "Empty state khi lọc không khớp",
      "uiState": "empty"
     },
     {
      "name": "TC-F-BIL-016__s02__loading",
      "caption": "Loading skeleton DataTable + KPI",
      "uiState": "loading"
     },
     {
      "name": "TC-F-BIL-016__s03__error",
      "caption": "Error state API 500 + nút thử lại",
      "uiState": "error"
     },
     {
      "name": "TC-F-BIL-016__s04__list",
      "caption": "Dark mode tương phản KPI/bảng/drawer",
      "uiState": "list"
     }
    ]
   },
   {
    "id": "TC-F-BIL-017",
    "title": "Quyet toan -> bao cao doanh thu (reports): tong thu/BHYT/cong no khop so lieu vien phi",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Thu ngân / Quản lý",
    "preconditions": "Đã thực hiện một số giao dịch thu/hoàn/tạm ứng trong ngày (từ các TC trên).",
    "steps": [
     "Tổng hợp tay từ /v2/billing: tổng doanh thu đã thu, tổng BHYT, tổng công nợ trong khoảng ngày X.",
     "Mở phân hệ Báo cáo & Dashboard (reports) → mở báo cáo doanh thu/viện phí cùng khoảng ngày X (GeneratedReports/ReportTemplates).",
     "Đối chiếu số liệu báo cáo với KPI billing: doanh thu, BHYT chi trả, công nợ phải khớp.",
     "Xác nhận ReportAccessLogs ghi nhận truy cập báo cáo (audit)."
    ],
    "expected": "Báo cáo doanh thu khớp 100% số liệu viện phí (doanh thu/BHYT/công nợ) cùng khoảng ngày; không lệch do hoàn/tạm ứng; truy cập báo cáo được audit. Data-consistency billing↔reports.",
    "notes": "Bám related=[reports]. Data-consistency liên phân hệ billing→reports. Bổ sung ngoài #232.",
    "refIssues": [
     "#232"
    ],
    "evidence": [
     {
      "name": "TC-F-BIL-017__s01__list",
      "caption": "KPI billing tổng thu/BHYT/công nợ ngày X",
      "uiState": "list"
     },
     {
      "name": "TC-F-BIL-017__s02__detail",
      "caption": "Báo cáo doanh thu (reports) cùng ngày X",
      "uiState": "detail"
     },
     {
      "name": "TC-F-BIL-017__s03__detail",
      "caption": "Số liệu báo cáo khớp billing",
      "uiState": "detail"
     }
    ]
   }
  ],
  "gaps": [
   "Chưa xác minh tên/route màn hình tạm ứng (Deposits) riêng — TerminalLayout có /v2/billing-guarantors (Bảo lãnh) nhưng chưa thấy route Deposits độc lập; cần xác nhận UI tạm ứng nằm trong drawer billing hay màn riêng trước khi viết bước TC-F-BIL-003.",
   "Chưa đọc trực tiếp BillingDrawerBody + PayModal phần dưới (createPayment payload) và billing API client để biết chính xác field số tham chiếu/ghi chú — bước validation TC-F-BIL-005 cần khớp tên field thật.",
   "Chưa xác minh luồng Hủy/Hoàn (Cancelled/Refunded) có UI ở v2 hay chỉ ở BE; nếu chưa có UI → có thể là bug/gap cần tạo Issue fix khi chạy TC-F-BIL-006/007.",
   "Chưa xác minh màn phát hành HĐĐT (ElectronicInvoices) và nộp XML BHXH ở FE v2 (route/nút cụ thể) — onPrintInvoice mới chỉ thấy nút In; cần kiểm xem phát hành HĐĐT có tách riêng không.",
   "Mức hưởng BHYT (80/95/100%) và cách áp ở backend chưa verify trong code — TC-F-BIL-008/009 giả định theo nghiệp vụ chuẩn, cần đối chiếu InsurancePriceConfigs/logic thực khi thực thi.",
   "SignalR cho billing realtime (TC-F-BIL-013) chưa verify có hub/event cho viện phí — nếu chưa có thì hạ ưu tiên hoặc chuyển thành kiểm tra polling.",
   "Roadmap nêu 38 phân hệ/485 bảng/12 luồng; bộ task này phủ flow billing + giao điểm insurance/reports/payment, CHƯA phủ checkup→billing và discharge (kiểm nợ) vốn cũng dùng step billing — có thể bổ sung E2E checkup/discharge ở task riêng."
  ]
 },
 {
  "id": "discharge",
  "code": "F-DIS",
  "ic": "🚪",
  "layer": "fin",
  "nm": "Xuất viện & kết thúc",
  "gh": [
   "#217",
   "#258"
  ],
  "flow_id": "discharge",
  "summary": "Bộ test-task END-TO-END xuyên phân hệ cho luồng \"Xuất viện & kết thúc\" (id=discharge), grounded từ FLOWS trong docs/architecture/his-roadmap/assets/data.js: desc=\"BN → kiểm tra điều kiện ra viện → trả giường → khóa hồ sơ → xuất viện\"; steps=[[\"Kiểm tra nợ/đơn/CLS\",\"billing\"],[\"Ra viện\",\"ipd\"],[\"Khóa HSĐT\",\"emr\"],[\"Liên thông QG\",\"national\"]]; related=[inpatient, emr, national]. Mỗi bước đã đối chiếu màn/endpoint thật: (1) Kiểm tra nợ/đơn/CLS = CheckPreDischargeAsync (đơn chưa cấp Status<2, ServiceRequest chưa KQ Status<2, dư nợ = ServiceRequests.PatientAmount − Receipts.FinalAmount) hiển thị trong DischargeModal (frontend/src/pages-v2/inpatient/DischargeModal.tsx); (2) Ra viện = DischargePatientAsync (guard admission.Status==0, enforce CanDischarge, enum DischargeType 1-4 / Condition 1-5, chuyển viện cần transferToHospital, in giấy ra viện/6556/chuyển viện, cancelDischarge); (3) Khóa HSĐT = TT46 finalize/isFinalized (EmrEditor.tsx, badge \"🔒 ĐÃ KHÓA (TT46)\", trình ký nhiều cấp); (4) Liên thông QG = NationalGateways.tsx tab \"Đơn thuốc QG\" submit/retry/cancel (NationalPrescriptionController). 16 task phủ: happy-path E2E xuyên 4 màn, data-consistency liên phân hệ, state-transition liên phân hệ, luồng phụ/ngoại lệ (chuyển viện/tử vong/trốn viện, hủy ra viện, lỗi liên thông giữa chừng), permission/security (IDOR, anonymous, XSS), UI (loading/error/dark/responsive), evidence chụp tại mọi điểm chuyển màn. Dedup: #217 (happy-path E2E cha) + #258 (workflow ký số TT46) → điền refIssues, KHÔNG tạo trùng.",
  "tasks": [
   {
    "id": "TC-F-DIS-001",
    "title": "E2E happy-path xuyên 4 phân hệ: kiểm tra điều kiện → ra viện → khóa HSĐT → liên thông QG",
    "category": "happy",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "Login admin/Admin@123. Có 1 BN nội trú đang điều trị (admission.Status=0) ĐỦ điều kiện: không dư nợ, đã cấp hết thuốc (Prescription.Status>=2), đã có đủ KQ CLS (ServiceRequest.Status>=2). HSĐT đã ký đủ cấp để finalize TT46.",
    "steps": [
     "Vào /v2/inpatient, lọc BN đang điều trị, mở BN mục tiêu.",
     "Mở DischargeModal (Ra viện) → quan sát mục 'Kiểm tra điều kiện ra viện': cả 5 dòng (BHYT hợp lệ, không dư nợ, đã lĩnh hết thuốc, đủ KQ CLS, hồ sơ đầy đủ) đều ✓ và footer hiện '✓ Đủ điều kiện ra viện'.",
     "Chọn Loại ra viện=Ra viện(1), Tình trạng=Khỏi(1), nhập Chẩn đoán ra viện, Ngày ra viện mặc định now.",
     "Bấm 'Xác nhận ra viện' → chờ toast 'Đã hoàn tất ra viện'; modal đóng, BN biến khỏi danh sách 'đang điều trị'.",
     "Sang /v2/emr-editor mở HSĐT của BN → trình ký đủ cấp → Finalize TT46; xác nhận badge '🔒 ĐÃ KHÓA (TT46)' xuất hiện.",
     "Sang /v2/national-gateways tab 'Đơn thuốc QG' → submit/xác nhận giao dịch liên thông của BN ra viện; xác nhận giao dịch ở trạng thái đã gửi (Acknowledged/Submitted)."
    ],
    "expected": "Toàn luồng đi đúng chuỗi steps của data.js. Sau ra viện: admission.Status đổi (không còn 'đang điều trị'), giường được trả. HSĐT khóa TT46 (không sửa được). Giao dịch liên thông QG tạo + ở trạng thái đã gửi. Mọi mutation ghi audit.",
    "evidence": [
     {
      "name": "TC-F-DIS-001__s01__detail",
      "caption": "Chi tiết BN nội trú đang điều trị trước ra viện",
      "uiState": "detail"
     },
     {
      "name": "TC-F-DIS-001__s02__modal",
      "caption": "DischargeModal — kiểm tra điều kiện đủ (5 dòng ✓)",
      "uiState": "modal"
     },
     {
      "name": "TC-F-DIS-001__s03__success",
      "caption": "Toast 'Đã hoàn tất ra viện', modal đóng",
      "uiState": "success"
     },
     {
      "name": "TC-F-DIS-001__s04__list",
      "caption": "BN biến khỏi danh sách đang điều trị",
      "uiState": "list"
     },
     {
      "name": "TC-F-DIS-001__s05__detail",
      "caption": "EMR đã khóa — badge '🔒 ĐÃ KHÓA (TT46)'",
      "uiState": "detail"
     },
     {
      "name": "TC-F-DIS-001__s06__tab",
      "caption": "Tab Đơn thuốc QG — giao dịch liên thông ở trạng thái đã gửi",
      "uiState": "tab"
     }
    ],
    "notes": "Khẳng định OUTCOME ở mỗi điểm chuyển màn, không chỉ no-console-error. Chi tiết hóa #217 cho luồng discharge.",
    "refIssues": [
     "#217",
     "#258"
    ]
   },
   {
    "id": "TC-F-DIS-002",
    "title": "Data-consistency liên phân hệ: tạo nợ ở Billing → hiện ở pre-check IPD → chặn ra viện",
    "category": "data-consistency",
    "priority": "P0",
    "role": "Thư ký",
    "preconditions": "BN nội trú đang điều trị. Có ít nhất 1 ServiceRequest có PatientAmount > tổng Receipt đã thu (ReceiptType=2, Status=1) → còn dư nợ.",
    "steps": [
     "Ghi nhận tổng chi phí dịch vụ và tổng đã thu của BN ở /v2/billing (tạo A: dư nợ = chi phí − đã thu).",
     "Sang /v2/inpatient mở DischargeModal của chính BN đó (hiện B).",
     "Đọc dòng 'Không còn dư nợ' và số tiền 'Còn X đ' hiển thị (tính C).",
     "So sánh X với dư nợ tính tay từ bước 1.",
     "Bấm 'Xác nhận ra viện'."
    ],
    "expected": "X (dư nợ hiển thị) = chi phí dịch vụ − tổng đã thu (đúng công thức CheckPreDischargeAsync). Dòng 'Không còn dư nợ' báo ⚠ kèm số đúng. Footer hiện '⚠ Chưa đủ điều kiện'. Bấm xác nhận → BE trả 400 INVALID_STATE 'Không thể xuất viện: Còn nợ viện phí …đ', KHÔNG 500; toast lỗi rõ; BN vẫn đang điều trị.",
    "evidence": [
     {
      "name": "TC-F-DIS-002__s01__detail",
      "caption": "Billing — chi phí & đã thu (nguồn tính dư nợ)",
      "uiState": "detail"
     },
     {
      "name": "TC-F-DIS-002__s02__modal",
      "caption": "Pre-check hiện 'Còn X đ' khớp số tính tay",
      "uiState": "modal"
     },
     {
      "name": "TC-F-DIS-002__s03__error",
      "caption": "Bấm xác nhận → toast 400 'Còn nợ viện phí…'",
      "uiState": "error"
     }
    ],
    "notes": "Kiểm chứng số tiền liên phân hệ (Billing↔IPD pre-check), không chỉ trạng thái.",
    "refIssues": [
     "#217"
    ]
   },
   {
    "id": "TC-F-DIS-003",
    "title": "Data-consistency: đơn thuốc chưa cấp + CLS chưa có KQ → pre-check đếm đúng & chặn",
    "category": "data-consistency",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "BN nội trú có N đơn thuốc Status<2 (chưa cấp phát) và M ServiceRequest Status<2 (chưa có KQ); không dư nợ.",
    "steps": [
     "Ghi nhận N đơn chưa cấp (Pharmacy) và M chỉ định chưa KQ (CLS) của BN.",
     "Mở DischargeModal của BN.",
     "Đọc dòng 'Đã lĩnh hết thuốc' (số 'N đơn chưa lĩnh') và 'Đã có đủ kết quả CLS' (số 'M KQ chờ').",
     "Đọc khối cảnh báo (warnings) phía dưới.",
     "Bấm 'Xác nhận ra viện'."
    ],
    "expected": "unclaimedPrescriptionCount = N, pendingResultCount = M hiển thị đúng. Khối warnings liệt kê 'Còn N đơn thuốc chưa cấp phát' + 'Còn M chỉ định chưa có kết quả'. canDischarge=false. Bấm xác nhận → 400 message gộp các issue; BN vẫn đang điều trị.",
    "evidence": [
     {
      "name": "TC-F-DIS-003__s01__modal",
      "caption": "Pre-check đếm đúng N đơn chưa cấp + M KQ chờ + warnings",
      "uiState": "modal"
     },
     {
      "name": "TC-F-DIS-003__s02__error",
      "caption": "Xác nhận → 400 gộp issue, chặn ra viện",
      "uiState": "error"
     }
    ],
    "notes": "Liên Pharmacy/CLS ↔ IPD pre-check.",
    "refIssues": [
     "#217"
    ]
   },
   {
    "id": "TC-F-DIS-004",
    "title": "State liên phân hệ: đang điều trị → ra viện → trả giường (admission.Status & giường)",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "BN đủ điều kiện ra viện, đang nằm 1 giường cụ thể (ghi nhận mã giường/phòng).",
    "steps": [
     "Ghi nhận giường BN đang nằm ở sơ đồ giường /v2/inpatient.",
     "Ra viện thành công qua DischargeModal (loại=Ra viện).",
     "Quay lại sơ đồ giường kiểm tra giường đó.",
     "Thử mở lại DischargeModal cho BN vừa ra viện."
    ],
    "expected": "Sau ra viện admission.Status != 0 (đã ra viện). Giường BN chuyển sang trống/sẵn sàng (trả giường). Ra viện lần 2 với admission đã ra viện → BE chặn 400 'Bệnh nhân không trong trạng thái đang điều trị' (InvalidOperationException → DomainExceptionFilter), KHÔNG 500.",
    "evidence": [
     {
      "name": "TC-F-DIS-004__s01__detail",
      "caption": "Sơ đồ giường — BN đang chiếm giường trước ra viện",
      "uiState": "detail"
     },
     {
      "name": "TC-F-DIS-004__s02__success",
      "caption": "Ra viện thành công",
      "uiState": "success"
     },
     {
      "name": "TC-F-DIS-004__s03__detail",
      "caption": "Giường trống sau ra viện (trả giường)",
      "uiState": "detail"
     },
     {
      "name": "TC-F-DIS-004__s04__error",
      "caption": "Ra viện lần 2 → 400 'không trong trạng thái đang điều trị'",
      "uiState": "error"
     }
    ],
    "notes": "Khớp step 'trả giường' trong desc data.js + guard admission.Status==0.",
    "refIssues": [
     "#217"
    ]
   },
   {
    "id": "TC-F-DIS-005",
    "title": "State: hủy ra viện đảo trạng thái về đang điều trị + nhận lại giường",
    "category": "state",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "BN đã ra viện thành công (chưa khóa HSĐT TT46).",
    "steps": [
     "Mở DischargeModal của BN đã ra viện.",
     "Bấm 'Hủy ra viện' → confirm yêu cầu nhập lý do.",
     "Bỏ trống lý do thử bấm xác nhận (quan sát hành vi), rồi nhập lý do hợp lệ và xác nhận.",
     "Kiểm tra danh sách BN đang điều trị và sơ đồ giường."
    ],
    "expected": "cancelDischarge thành công → toast 'Đã hủy ra viện'. admission.Status quay về 0 (đang điều trị), BN xuất hiện lại trong danh sách đang điều trị, giường được gán lại (hoặc theo logic nhận lại). Audit ghi sự kiện hủy + lý do.",
    "evidence": [
     {
      "name": "TC-F-DIS-005__s01__confirm",
      "caption": "Confirm 'Hủy ra viện?' yêu cầu nhập lý do",
      "uiState": "confirm"
     },
     {
      "name": "TC-F-DIS-005__s02__success",
      "caption": "Toast 'Đã hủy ra viện'",
      "uiState": "success"
     },
     {
      "name": "TC-F-DIS-005__s03__list",
      "caption": "BN trở lại danh sách đang điều trị",
      "uiState": "list"
     }
    ],
    "notes": "Luồng ngược (rollback) — kiểm tra nhất quán liên phân hệ sau hủy.",
    "refIssues": [
     "#217"
    ]
   },
   {
    "id": "TC-F-DIS-006",
    "title": "Luồng phụ — Chuyển viện (DischargeType=2): bắt buộc cơ sở chuyển đến + in giấy chuyển viện",
    "category": "happy",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "BN đủ điều kiện ra viện.",
    "steps": [
     "Mở DischargeModal, chọn Loại ra viện = 'Chuyển viện'.",
     "Quan sát xuất hiện 2 ô 'Chuyển đến *' và 'Lý do chuyển' + nút 'In giấy chuyển viện'.",
     "Để trống 'Chuyển đến', bấm Xác nhận → quan sát validation FE.",
     "Nhập 'Chuyển đến' + lý do, bấm 'In giấy chuyển viện' → PDF mở.",
     "Bấm 'Xác nhận ra viện'."
    ],
    "expected": "Khi type=2, ô 'Chuyển đến *' và nút in giấy chuyển viện hiện ra. Để trống cơ sở chuyển → FE chặn (tw 'Nhập cơ sở chuyển đến'), không gọi API. In giấy chuyển viện trả PDF (printReferralCertificate) mở tab mới. Xác nhận với type=2 lưu transferToHospital/transferReason; ra viện dạng chuyển viện thành công.",
    "evidence": [
     {
      "name": "TC-F-DIS-006__s01__form",
      "caption": "Chọn Chuyển viện → hiện ô 'Chuyển đến *' + 'In giấy chuyển viện'",
      "uiState": "form"
     },
     {
      "name": "TC-F-DIS-006__s02__validation",
      "caption": "Trống cơ sở chuyển → FE chặn 'Nhập cơ sở chuyển đến'",
      "uiState": "validation"
     },
     {
      "name": "TC-F-DIS-006__s03__success",
      "caption": "Ra viện chuyển viện thành công",
      "uiState": "success"
     }
    ],
    "notes": "Validation điều kiện theo dischargeType.",
    "refIssues": [
     "#217"
    ]
   },
   {
    "id": "TC-F-DIS-007",
    "title": "Luồng phụ — Tử vong (Type=4/Condition=5) & Trốn viện (Type=3)",
    "category": "edge",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "BN đang điều trị.",
    "steps": [
     "Mở DischargeModal, chọn Loại=Tử vong(4), Tình trạng=Tử vong(5), nhập chẩn đoán, xác nhận ra viện.",
     "Lặp với BN khác: Loại='Trốn viện / Bỏ về'(3), xác nhận.",
     "Với mỗi case kiểm tra danh sách + sơ đồ giường + audit."
    ],
    "expected": "Ra viện thành công cho cả type=4 (tử vong) và type=3 (trốn viện); admission rời trạng thái đang điều trị; giường trả; bản ghi lưu đúng dischargeType/condition. Không crash với tổ hợp Tử vong+Condition 5.",
    "evidence": [
     {
      "name": "TC-F-DIS-007__s01__form",
      "caption": "Form Tử vong (Type=4, Condition=5)",
      "uiState": "form"
     },
     {
      "name": "TC-F-DIS-007__s02__success",
      "caption": "Ra viện tử vong thành công",
      "uiState": "success"
     },
     {
      "name": "TC-F-DIS-007__s03__form",
      "caption": "Form Trốn viện (Type=3)",
      "uiState": "form"
     }
    ],
    "notes": "Phủ enum DischargeType 1-4 / Condition 1-5.",
    "refIssues": [
     "#217"
    ]
   },
   {
    "id": "TC-F-DIS-008",
    "title": "Validation form ra viện: thiếu chẩn đoán ra viện + biên 'Số ngày nghỉ'",
    "category": "validation",
    "priority": "P1",
    "role": "Bác sĩ",
    "preconditions": "BN đủ điều kiện ra viện, DischargeModal mở.",
    "steps": [
     "Xóa trống 'Chẩn đoán ra viện *', bấm Xác nhận → quan sát.",
     "Nhập 'Số ngày nghỉ' = -1, rồi 366, rồi 365 (biên min=0/max=365).",
     "Nhập chẩn đoán hợp lệ + ngày nghỉ hợp lệ rồi xác nhận."
    ],
    "expected": "Trống chẩn đoán → FE chặn (tw 'Nhập chẩn đoán ra viện'), không gọi API. InputNumber ràng min 0 / max 365 — không nhập được -1 hoặc >365 (hoặc bị kẹp về biên). Với dữ liệu hợp lệ → ra viện thành công.",
    "evidence": [
     {
      "name": "TC-F-DIS-008__s01__validation",
      "caption": "Trống chẩn đoán → chặn 'Nhập chẩn đoán ra viện'",
      "uiState": "validation"
     },
     {
      "name": "TC-F-DIS-008__s02__validation",
      "caption": "Số ngày nghỉ kẹp biên 0..365",
      "uiState": "validation"
     }
    ],
    "notes": "Boundary InputNumber + required FE.",
    "refIssues": [
     "#217"
    ]
   },
   {
    "id": "TC-F-DIS-009",
    "title": "Khóa HSĐT TT46: finalize → bất biến nội dung; chưa ký đủ cấp → chặn finalize",
    "category": "state",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "BN đã ra viện. HSĐT trong /v2/emr-editor; chuẩn bị 1 HSĐT chưa ký đủ cấp và 1 HSĐT ký đủ cấp.",
    "steps": [
     "Mở HSĐT chưa ký đủ cấp → thử Finalize TT46 → quan sát bị chặn.",
     "Hoàn tất trình ký nhiều cấp (Trưởng khoa → Lãnh đạo) cho HSĐT đủ điều kiện.",
     "Finalize TT46 → quan sát badge '🔒 ĐÃ KHÓA (TT46)'.",
     "Thử sửa 1 trường nội dung HSĐT đã khóa và lưu."
    ],
    "expected": "Chưa ký đủ cấp → finalize bị chặn (không khóa). Ký đủ + finalize → isFinalized=true, badge khóa hiện. HSĐT đã khóa KHÔNG sửa/lưu được nội dung (bất biến TT46). Mọi thao tác ký/finalize ghi audit.",
    "evidence": [
     {
      "name": "TC-F-DIS-009__s01__error",
      "caption": "Finalize khi chưa ký đủ cấp → bị chặn",
      "uiState": "error"
     },
     {
      "name": "TC-F-DIS-009__s02__drawer",
      "caption": "Trình ký nhiều cấp (Trưởng khoa → Lãnh đạo)",
      "uiState": "drawer"
     },
     {
      "name": "TC-F-DIS-009__s03__detail",
      "caption": "Badge '🔒 ĐÃ KHÓA (TT46)' sau finalize",
      "uiState": "detail"
     },
     {
      "name": "TC-F-DIS-009__s04__error",
      "caption": "Sửa HSĐT đã khóa → bị chặn (bất biến)",
      "uiState": "error"
     }
    ],
    "notes": "Chi tiết hóa #258 (workflow ký số + state + integrity) cho bước 'Khóa HSĐT' của luồng discharge.",
    "refIssues": [
     "#258",
     "#217"
    ]
   },
   {
    "id": "TC-F-DIS-010",
    "title": "Integration — Liên thông QG (Đơn thuốc QG): submit thành công + retry khi lỗi",
    "category": "integration",
    "priority": "P1",
    "role": "Thư ký",
    "preconditions": "BN đã ra viện có đơn thuốc cần liên thông cổng Đơn thuốc QG. /v2/national-gateways.",
    "steps": [
     "Vào tab 'Đơn thuốc QG', lọc theo trạng thái, tìm giao dịch của BN ra viện.",
     "Với giao dịch lỗi (Failed) → bấm 'Gửi lại' (retry) → quan sát toast 'Đã gửi lại lên cổng QG' và trạng thái cập nhật.",
     "Với giao dịch đang chờ → quan sát trạng thái (Submitted/Acknowledged) + StatusBadge tone đúng.",
     "Thử 'Hủy giao dịch' 1 bản ghi → confirm."
    ],
    "expected": "Retry gọi npGateway.retry → submission chuyển trạng thái phù hợp + toast. StatusBadge tone khớp NPG_STATUS. Hủy giao dịch yêu cầu confirm rồi cập nhật. Trạng thái phản ánh kết quả cổng QG (MockMode ở dev). Không nuốt lỗi.",
    "evidence": [
     {
      "name": "TC-F-DIS-010__s01__tab",
      "caption": "Tab Đơn thuốc QG — danh sách giao dịch liên thông",
      "uiState": "tab"
     },
     {
      "name": "TC-F-DIS-010__s02__filter",
      "caption": "Lọc theo trạng thái giao dịch",
      "uiState": "filter"
     },
     {
      "name": "TC-F-DIS-010__s03__success",
      "caption": "Retry → toast 'Đã gửi lại lên cổng QG'",
      "uiState": "success"
     },
     {
      "name": "TC-F-DIS-010__s04__confirm",
      "caption": "Hủy giao dịch — confirm",
      "uiState": "confirm"
     }
    ],
    "notes": "Bước 'Liên thông QG' của data.js (NationalPrescriptionController).",
    "refIssues": [
     "#217"
    ]
   },
   {
    "id": "TC-F-DIS-011",
    "title": "Ngoại lệ — lỗi liên thông QG giữa chừng: BN đã ra viện + HSĐT đã khóa nhưng submit QG fail → trạng thái nhất quán, không mất dữ liệu",
    "category": "negative",
    "priority": "P1",
    "role": "Thư ký",
    "preconditions": "BN đã ra viện (TC-F-DIS-001 tới bước khóa HSĐT). Mô phỏng cổng QG trả lỗi (MockMode fail hoặc cổng timeout).",
    "steps": [
     "Hoàn tất ra viện + khóa HSĐT TT46 cho BN.",
     "Tại tab Đơn thuốc QG, kích hoạt submit khi cổng đang lỗi → quan sát.",
     "Kiểm tra trạng thái giao dịch + audit.",
     "Khi 'cổng' phục hồi, bấm retry → quan sát thành công."
    ],
    "expected": "Submit fail → giao dịch ở trạng thái Failed (không phải Acknowledged giả), thông báo lỗi rõ ràng, KHÔNG đảo ngược trạng thái ra viện/khóa HSĐT (idempotent, không mất dữ liệu lâm sàng). Retry sau khi phục hồi → thành công. Audit ghi cả lần fail và retry.",
    "evidence": [
     {
      "name": "TC-F-DIS-011__s01__error",
      "caption": "Submit QG fail → trạng thái Failed + thông báo lỗi",
      "uiState": "error"
     },
     {
      "name": "TC-F-DIS-011__s02__detail",
      "caption": "Ra viện & khóa HSĐT KHÔNG bị đảo ngược",
      "uiState": "detail"
     },
     {
      "name": "TC-F-DIS-011__s03__success",
      "caption": "Retry sau phục hồi → thành công",
      "uiState": "success"
     }
    ],
    "notes": "Lỗi giữa chừng ở chặng cuối liên phân hệ — kiểm tra tính nhất quán & không mất dữ liệu.",
    "refIssues": [
     "#217"
    ]
   },
   {
    "id": "TC-F-DIS-012",
    "title": "Security — IDOR: ra viện/hủy/khóa HSĐT bằng admissionId của BN khác / không thuộc quyền",
    "category": "security",
    "priority": "P0",
    "role": "Bác sĩ",
    "preconditions": "2 BN nội trú khác khoa/khác hồ sơ. Token hợp lệ. Biết admissionId BN-A và BN-B.",
    "steps": [
     "Đăng nhập, lấy token; gọi trực tiếp API dischargePatient với admissionId của BN không thuộc phạm vi người dùng.",
     "Gọi cancelDischarge với admissionId không hợp lệ / không tồn tại.",
     "Gọi finalize HSĐT với recordId của BN khác.",
     "Gọi pre-check với admissionId ngẫu nhiên (Guid lạ)."
    ],
    "expected": "Không thể thao tác trên admission/record không thuộc quyền (403/404 theo phân quyền), KHÔNG rò dữ liệu BN khác. admissionId không tồn tại → 404/400 'Admission not found', KHÔNG 500. Không có IDOR cho discharge/cancel/finalize/pre-check.",
    "evidence": [
     {
      "name": "TC-F-DIS-012__s01__error",
      "caption": "Discharge admissionId không thuộc quyền → 403/404",
      "uiState": "error"
     },
     {
      "name": "TC-F-DIS-012__s02__error",
      "caption": "admissionId không tồn tại → 404 'Admission not found' (không 500)",
      "uiState": "error"
     }
    ],
    "notes": "IDOR liên phân hệ IPD/EMR.",
    "refIssues": [
     "#217"
    ]
   },
   {
    "id": "TC-F-DIS-013",
    "title": "Security — anonymous & XSS: truy cập màn discharge khi chưa đăng nhập; nhập payload XSS vào chẩn đoán/lời dặn",
    "category": "security",
    "priority": "P1",
    "role": "Khách (chưa đăng nhập) / Bác sĩ",
    "preconditions": "Trình duyệt mới (không token).",
    "steps": [
     "Mở thẳng /v2/inpatient, /v2/emr-editor, /v2/national-gateways khi chưa login.",
     "Gọi API dischargePatient/checkPreDischarge không kèm Bearer token.",
     "Đăng nhập, mở DischargeModal nhập '<img src=x onerror=alert(1)>' vào 'Chẩn đoán ra viện' và 'Lời dặn', lưu rồi in giấy ra viện.",
     "Mở lại bản ghi/PDF kiểm tra render."
    ],
    "expected": "Chưa login → redirect login (ProtectedRoute), không lộ dữ liệu. API thiếu token → 401. Payload XSS được lưu nguyên văn (escape khi hiển thị), KHÔNG thực thi script khi xem lại trên FE hay trong PDF giấy ra viện.",
    "evidence": [
     {
      "name": "TC-F-DIS-013__s01__permission",
      "caption": "Truy cập /v2/inpatient chưa login → redirect login",
      "uiState": "permission"
     },
     {
      "name": "TC-F-DIS-013__s02__error",
      "caption": "API discharge thiếu token → 401",
      "uiState": "error"
     },
     {
      "name": "TC-F-DIS-013__s03__detail",
      "caption": "Payload XSS hiển thị escape, không thực thi",
      "uiState": "detail"
     }
    ],
    "notes": "Anonymous + XSS stored.",
    "refIssues": [
     "#217"
    ]
   },
   {
    "id": "TC-F-DIS-014",
    "title": "UI states — DischargeModal: loading pre-check, không có dữ liệu kiểm tra, lỗi pre-check, lỗi in tài liệu",
    "category": "ui",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "BN nội trú. Có thể giả lập chậm/lỗi API checkPreDischarge và print.",
    "steps": [
     "Mở DischargeModal với mạng chậm → quan sát 'Đang kiểm tra…'.",
     "Giả lập checkPreDischarge lỗi → quan sát message 'Không kiểm tra được điều kiện ra viện' + 'Không có dữ liệu kiểm tra.'.",
     "Bấm 'In giấy ra viện'/'In bảng kê 6556' khi API in lỗi → quan sát toast 'In tài liệu thất bại'.",
     "Quan sát trạng thái loading từng nút in (printing)."
    ],
    "expected": "Loading hiển thị 'Đang kiểm tra…'; pre-check lỗi → fallback 'Không có dữ liệu kiểm tra.' + message.error; in lỗi → te 'In tài liệu thất bại'; nút in hiển thị loading riêng theo kind, không treo UI.",
    "evidence": [
     {
      "name": "TC-F-DIS-014__s01__loading",
      "caption": "Pre-check đang tải — 'Đang kiểm tra…'",
      "uiState": "loading"
     },
     {
      "name": "TC-F-DIS-014__s02__error",
      "caption": "Pre-check lỗi — 'Không có dữ liệu kiểm tra.'",
      "uiState": "error"
     },
     {
      "name": "TC-F-DIS-014__s03__error",
      "caption": "In tài liệu lỗi — toast 'In tài liệu thất bại'",
      "uiState": "error"
     }
    ],
    "notes": "core-error-loading-state.",
    "refIssues": [
     "#217"
    ]
   },
   {
    "id": "TC-F-DIS-015",
    "title": "UI — dark mode + responsive cho DischargeModal, EMR khóa, National gateways",
    "category": "ui",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "Đã login. Có dữ liệu các màn.",
    "steps": [
     "Bật dark mode (toggle TerminalLayout).",
     "Mở DischargeModal (xl) ở dark → kiểm tra tương phản badge khóa, dòng pre-check ✓/⚠, khối warnings (--warn-soft).",
     "Mở EMR đã khóa (badge crit) + tab Đơn thuốc QG (StatusBadge nhiều tone) ở dark.",
     "Thu hẹp viewport (responsive) cho modal & bảng giao dịch QG.",
     "So sánh nhanh light mode."
    ],
    "expected": "Dark/light đều đọc được, đủ tương phản (WCAG AA), không vỡ layout. Badge '🔒 ĐÃ KHÓA (TT46)' và StatusBadge tone (ok/warn/crit/info) phân biệt rõ ở cả 2 theme. Modal xl và bảng QG responsive không tràn ngang, footer nút wrap.",
    "evidence": [
     {
      "name": "TC-F-DIS-015__s01__modal",
      "caption": "DischargeModal dark mode — pre-check + warnings tương phản",
      "uiState": "modal"
     },
     {
      "name": "TC-F-DIS-015__s02__detail",
      "caption": "EMR badge khóa + tab QG StatusBadge ở dark",
      "uiState": "detail"
     },
     {
      "name": "TC-F-DIS-015__s03__modal",
      "caption": "Responsive modal xl + bảng QG hẹp viewport",
      "uiState": "modal"
     }
    ],
    "notes": "core-ui-aesthetics / parity light-dark.",
    "refIssues": [
     "#217"
    ]
   },
   {
    "id": "TC-F-DIS-016",
    "title": "Edge — ra viện 'vượt điều kiện' khi được duyệt (override) & ngày ra viện sớm hơn ngày nhập viện",
    "category": "edge",
    "priority": "P2",
    "role": "Bác sĩ",
    "preconditions": "BN còn cảnh báo (canDischarge=false) nhưng FE cho phép thử với ghi chú '⚠ vẫn có thể ra viện nếu được duyệt'. BN có ngày nhập viện đã biết.",
    "steps": [
     "Mở DischargeModal BN còn cảnh báo → đọc footer '⚠ Chưa đủ điều kiện — vẫn có thể ra viện nếu được duyệt'.",
     "Bấm Xác nhận → quan sát BE chặn (enforce CanDischarge) dù FE gợi ý override.",
     "Đặt Ngày ra viện sớm hơn ngày nhập viện → bấm Xác nhận → quan sát.",
     "Đặt Ngày ra viện ở tương lai xa → quan sát."
    ],
    "expected": "Dù UI nói 'vẫn có thể nếu được duyệt', BE hiện tại ENFORCE CanDischarge → trả 400 chặn (ghi nhận: nếu nghiệp vụ cần override-có-duyệt thì là GAP). Ngày ra viện < ngày nhập viện hoặc tương lai xa nên bị validate/cảnh báo; nếu lưu được mà không cảnh báo → tạo task bug. Không 500.",
    "evidence": [
     {
      "name": "TC-F-DIS-016__s01__modal",
      "caption": "Footer '⚠ Chưa đủ điều kiện — vẫn có thể nếu được duyệt'",
      "uiState": "modal"
     },
     {
      "name": "TC-F-DIS-016__s02__error",
      "caption": "BE vẫn chặn dù FE gợi ý override → 400",
      "uiState": "error"
     },
     {
      "name": "TC-F-DIS-016__s03__validation",
      "caption": "Ngày ra viện < ngày nhập viện → validate/cảnh báo",
      "uiState": "validation"
     }
    ],
    "notes": "Phát hiện mâu thuẫn UI(gợi ý override) vs BE(enforce) → có thể là GAP nghiệp vụ.",
    "refIssues": [
     "#217"
    ]
   }
  ],
  "gaps": [
   "Mâu thuẫn FE↔BE về override ra viện: DischargeModal hiển thị '⚠ Chưa đủ điều kiện — vẫn có thể ra viện nếu được duyệt' nhưng DischargePatientAsync ENFORCE CanDischarge (ném 400 nếu !CanDischarge) → không có đường override-có-phê-duyệt. Cần làm rõ nghiệp vụ: có cho phép ra viện vượt điều kiện kèm duyệt không? (TC-F-DIS-016).",
   "IsInsuranceValid và IsMedicalRecordComplete trong CheckPreDischargeAsync đang hardcode true (MissingDocuments rỗng) → 2 dòng pre-check 'BHYT hợp lệ' và 'Hồ sơ bệnh án đầy đủ' luôn ✓, chưa kiểm tra thật. Không thể test âm cho 2 điều kiện này cho tới khi có logic thực.",
   "Bước 'trả giường' trong desc data.js chưa xác nhận được trong InpatientCompleteService.Discharge.cs (mới đọc 90 dòng đầu) — cần verify phần sau release bed để biết giường tự trả khi ra viện và nhận lại khi hủy; nếu không có → có thể là GAP/bug.",
   "Liên kết giữa ra viện ↔ giao dịch liên thông Đơn thuốc QG chưa xác nhận tự động (ra viện có tự tạo submission QG không, hay phải tạo thủ công ở NationalGateways). Cần verify để biết bước 4 (Liên thông QG) là auto hay manual.",
   "Dữ liệu seed dev ổn định cho E2E (BN đủ điều kiện vs còn nợ/đơn/CLS, HSĐT ký đủ cấp, giao dịch QG Failed để test retry) chưa xác nhận có sẵn — phụ thuộc DailySeedController/PopulateData; cần seed trước khi chạy (liên quan #213).",
   "Cơ chế giả lập lỗi cổng QG (MockMode fail) cho TC-F-DIS-011 chưa xác nhận cách bật/tắt ở dev — cần tra his-be-external-gateway MockMode.",
   "SignalR realtime: chưa rõ ra viện/khóa HSĐT/đẩy QG có bắn sự kiện realtime cập nhật sơ đồ giường / hàng đợi không — nếu có cần thêm test integration SignalR (ngoài 16 task hiện tại).",
   "Validate ngày ra viện so với ngày nhập viện (TC-F-DIS-016) chưa thấy ràng buộc trong DischargeModal/service — có thể là GAP cần task fix nếu lưu được ngày phi lý."
  ]
 }
]);
