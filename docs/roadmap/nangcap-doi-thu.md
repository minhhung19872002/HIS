# Kế hoạch nâng cấp HIS theo phân tích tài liệu đối thủ

**Nguồn phân tích**: `C:\Source\HIS\TaiLieuDoiThu\` (32 file PDF hướng dẫn sử dụng)
- **HDSD_EMR/** (3 file): Desktop EMR, Web EMR, Mobile EMR (MQ Solutions)
- **HDSD_HIS_LIS/** (22 file): HIS tiếp đón, phòng khám, nội trú, dược, TTB, VPP, XN, CĐHA, thanh toán không tiền mặt, CKS, EMR số hóa BA (MQ Solutions)
- **HDSD_PACS_RIS/** (7 file): VRPACS admin, RIS DICOM + Non-DICOM, Viewer, Mobile, Hội chẩn online, Key image cloud (Công nghệ C+)

Ngày phân tích: 2026-04-22

Tổng quan: Đối thủ (MQ Solutions + VRPACS) có 2 sản phẩm trưởng thành đã triển khai thực tế nhiều năm. HIS hiện tại đã bao phủ phần lớn nghiệp vụ nhưng còn thiếu hoặc chưa đủ chi tiết ở một số workflow nghiệp vụ đặc thù, đặc biệt ở module thanh toán không tiền mặt, phê duyệt kho dược, PACS viewer nâng cao, và hội chẩn video.

---

## PHẦN 1: GAP ƯU TIÊN CAO (blocker khi đấu thầu / demo cạnh tranh)

### 1.1 Thanh toán không dùng tiền mặt (VNPAY + ví điện tử)
**Hiện trạng**: HIS có thu tiền mặt, tạm ứng, hoàn trả; chưa có gateway thanh toán điện tử đầy đủ.

**Đối thủ có**:
- QR VNPAY trực tiếp trên mọi phiếu: đăng ký khám, chỉ định CLS, tạm ứng, BV01 (viện phí BHYT), BV02 (viện phí thu phí), phòng tiêm ngừa, phòng lưu
- Đa phương thức: chuyển khoản, VISA/Master/JCB, thẻ NAPAS, ví điện tử (MoMo/ZaloPay/VNPay), thẻ bệnh viện, QR động
- E-invoice (HĐĐT): sinh hóa đơn điện tử tự động khi BN thanh toán
- Duyệt CLS sau khi BN quét QR đóng tiền (BS xem được trạng thái "đã đóng tiền qua QR" → bấm duyệt CLS mà không cần BN trình biên lai)
- Hoàn trả biên lai VNPAY (khớp với giao dịch gốc)
- 7 loại báo cáo: tạm ứng VNPay, thu tiền theo ngày (tổng hợp + chi tiết), HDDT sự nghiệp, HDDT dịch vụ, viện phí chi tiết, nhà thuốc, hoàn trả biên lai VNPAY

**Cần bổ sung**:
- [ ] Backend `PaymentGatewayService` tích hợp VNPay/MoMo/ZaloPay SDK
- [ ] Bảng `PaymentTransactions` log mọi giao dịch (requestId, merchantTxnRef, gatewayRef, status, amount, returnCode, signature)
- [ ] In QR động trên từng phiếu (mã phiếu + số tiền + merchantTxnRef)
- [ ] Webhook IPN (Instant Payment Notification) cập nhật trạng thái thanh toán tự động
- [ ] Tích hợp HĐĐT (VNPT-Invoice hoặc MISA meInvoice) — sinh HĐĐT ngay sau thanh toán thành công
- [ ] 7 báo cáo thống kê
- [ ] Duyệt CLS theo trạng thái thanh toán (BS/KTV xem thấy "BN đã đóng tiền QR" mà không cần biên lai giấy)

**Ưu tiên**: **CAO** — đây là checklist bắt buộc trong nhiều gói thầu bệnh viện công hiện nay (Quyết định 241/QĐ-TTg 2018, NQ 02/NQ-CP 2019).

### 1.2 Phê duyệt kho Dược đầy đủ workflow
**Hiện trạng**: HIS có warehouse CRUD, xuất nhập kho cơ bản; chưa có chuỗi phê duyệt theo từng loại phiếu.

**Đối thủ có 4 loại duyệt riêng biệt**:
1. **Duyệt cấp theo kho dự trù**: kho chính duyệt phiếu DT của khoa
2. **Duyệt cấp theo người bệnh**: kho duyệt phiếu lệnh thuốc theo từng BN (nội trú)
3. **Duyệt bù cơ số tủ trực theo BN**: bù lại thuốc tủ trực đã dùng cho BN
4. **Duyệt cấp hao phí theo khoa/phòng**: cấp thuốc dùng chung (không theo BN)
5. **Duyệt hoàn trả theo BN**: hoàn trả thuốc thừa của BN về kho

**Trạng thái phiếu**: Đang nhập / Chưa nhập / Đã chuyển / Đã duyệt / Tất cả (5 trạng thái chuẩn)

**Thu hồi phiếu** (Thu hồi duyệt cấp): phiếu trả về trạng thái cần duyệt lại.

**Cảnh báo thuốc sắp hết hạn** khi login Dược module.

**Cần bổ sung**:
- [ ] Bảng `StockIssueApproval` với approvalType enum (KhoDutru / BnNoitru / BuCoSoTuTruc / HaoPhiKhoa / HoanTra)
- [ ] State machine 5 trạng thái
- [ ] Thu hồi duyệt
- [ ] Dashboard "Thuốc sắp hết hạn" (≤30d, ≤7d, expired) popup khi login
- [ ] UI Duyệt theo BN với tick chọn thuốc không muốn duyệt (partial approval)

**Ưu tiên**: **CAO** — khớp với TT13/2025 và quy trình Dược chuẩn VN.

### 1.3 PACS Viewer nâng cao (tính năng chuyên sâu)
**Hiện trạng**: HIS đã tích hợp Orthanc + OHIF-style viewer cơ bản, có DICOM send/export và Key image.

**Đối thủ VRPACS có**:
- **MPR 4-quadrant**: Axial + Coronal + Sagittal + 3D view đồng thời, có Crosshair 3D sync
- **3D Volume Rendering**: Rotate tool (6 mặt: trên/trước/phải/trái/sau/dưới), Clip tool (elip / rectangle / polygon / xóa vùng)
- **MIP**: Max / Min / Average projection + Reset MIP
- **Curved MPR** (MPR theo đường cong — cho mạch máu uốn khúc)
- **Fusion on MPR** (hợp ảnh CT+PET)
- **Compare 2 studies on MPR** (so sánh side-by-side)
- **Mamography tools** chuyên dụng: CC view / MLO view / CC-MLO compare / tool đo đặc thù mamo
- **Endoscopy tool** (tool nội soi)
- **HU filter** (filter theo giá trị Hounsfield)
- **Vessel measurement**: đo mạch, đo sự ứ đọng mạch, đo thể tích hình trụ, so sánh thể tích 2 bán cầu não
- **Cardiac-Lung ratio tool** (tỷ lệ tim/lồng ngực trên X-quang ngực)
- **Auto threshold theo HU**
- **AI labeling** (ghi nhãn bằng AI)
- **Image library** — thư viện ảnh giải phẫu tham chiếu
- **Customizable keyboard shortcuts**: F1-F10 preset Window/Level cá nhân hóa per user
- **Config thông tin hiển thị trên view** (drag-drop các field DICOM vào vị trí muốn hiển thị)
- **Key image crop theo tỷ lệ** + Send to HIS tự động

**Cần bổ sung vào DicomViewer.tsx / Orthanc frontend**:
- [ ] Upgrade viewer engine lên OHIF 3.x hoặc tích hợp Cornerstone3D mới nhất
- [ ] Tool Curved MPR (vessel tracking)
- [ ] Fusion module cho PET/CT
- [ ] Compare 2 studies side-by-side với sync scroll
- [ ] Mamography workspace (view presets CC/MLO, 4-up layout)
- [ ] HU threshold filter + AI labeling API
- [ ] Cardiac-lung ratio tool
- [ ] User config: hotkeys, window/level presets, layout defaults (lưu localStorage per user)
- [ ] Overlay field builder (drag-drop DICOM tags)
- [ ] Image library backend + UI

**Ưu tiên**: **CAO** — bệnh viện chuyên khoa sẽ kiểm tra các tool này.

### 1.4 Hội chẩn online video conference
**Hiện trạng**: HIS có SignalR chat (`RisChatHub`), Telemedicine module có video 1-1. Chưa có hội chẩn đa điểm với layout + screen share + recording trên viewer.

**Đối thủ có 2 luồng**:
1. **Hội chẩn trực tuyến Non-DICOM**: tạo phòng từ ca chụp → mời BS tham gia
2. **Video conference trên DICOM Viewer**: bấm icon camera trong viewer

**Tính năng đầy đủ**:
- Điểm cầu trung tâm + các điểm cầu khác (hiện thumbnail)
- Chia layout (2x2, 3x3, focus-speaker...)
- Chọn micro + chia sẻ màn hình + quay video phiên hội chẩn
- Sinh link chia sẻ (copy + gửi cho BS khác tham gia)
- BS khác login vào RIS → bấm "Live" để join phòng
- Chỉ người tạo hội chẩn mới kết thúc được phòng; khi kết thúc tất cả auto-thoát
- Trạng thái hội chẩn: Bắt đầu / Đang thực hiện / Thực hiện xong (màu khác nhau trên worklist)

**Cần bổ sung**:
- [ ] Tích hợp Jitsi Meet / LiveKit / Daily.co server hoặc self-host SFU
- [ ] Backend `ConsultationRoom` entity (roomId, hostUserId, participants, recordingUrl, status, startedAt, endedAt)
- [ ] Recording pipeline → upload S3/R2
- [ ] UI trong DicomViewer: nút "Video conference" → popup room
- [ ] Invite link với token JWT có TTL
- [ ] Badge "Live" trên worklist khi phòng đang mở

**Ưu tiên**: **CAO** — tele-radiology ngày càng phổ biến.

### 1.5 Khám nhiều phòng / khám thêm chuyên khoa khác trong 1 lượt
**Hiện trạng**: HIS OPD workflow là 1 phòng / 1 phiên khám. Chưa có workflow "đăng ký nhiều phòng" hoặc "khám thêm CK khác" với logic Hoàn tất ở phòng cuối.

**Đối thủ có**:
- **Đăng ký nhiều phòng** (ở Reception): BN thu phí có thể đăng ký 5-6 phòng cùng lúc, thu tiền công khám từng phòng riêng
- **Xử trí "Khám thêm chuyên khoa khác"** (ở OPD): BS xử trí này trong phiên khám → BN tiếp tục sang phòng mới
- **BHYT rule**: chỉ phòng cuối cùng hoàn tất mới có nút "In chi phí" (bảng kê tổng hợp); phòng khác chỉ hoàn tất mà không in
- **BHYT phụ thu**: phân biệt với BHYT thuần — tính được chênh lệch
- **Chuyển phòng khám (BN chưa khám)**: đổi phòng khi BN chưa vào phòng
- **Xóa thông tin nhập sai từ HSBA**: xóa một phiên đăng ký sai mà không ảnh hưởng HSBA

**Cần bổ sung**:
- [ ] Examination entity support `ParentExaminationId` (khám nối tiếp)
- [ ] Reception UI "Nhiều phòng" checkbox — tạo nhiều Examination cùng mã BN trong ngày
- [ ] OPD xử trí "Khám thêm CK khác" → auto-create Examination mới
- [ ] Billing: tổng hợp chi phí tất cả examinations trong ngày; chỉ cho phép print BV01 khi tất cả đã hoàn tất
- [ ] Chuyển phòng khám (BN chưa khám) — đổi DepartmentId
- [ ] Xóa phiên đăng ký sai — soft-delete với log

**Ưu tiên**: **CAO** — quy trình BHYT bắt buộc tại hầu hết BV công.

### 1.6 Kiểm tra thông tuyến BHYT (realtime check)
**Hiện trạng**: HIS có insurance validation cơ bản, chưa có flow kiểm tra thông tuyến đầy đủ ngay tại Reception.

**Đối thủ có**:
- Nhập 20 số BHYT (15 đầu + 5 cuối KKCB), enter tự check thông tuyến qua API BHXH
- Nếu chỉ nhập 15 số: tự động hiện nơi KKCB ban đầu
- Quét QR CCCD tích hợp BHYT → auto-fill + đồng bộ thông tin hành chính (ngày sinh, CCCD, BHYT)
- Nếu không có BHYT thì nhập CCCD vào ô BHYT để check thông tuyến
- Khi check: cập nhật lại nơi KKCB mới nhất, ngày sinh, giới tính theo BHYT (nếu BHYT khác CCCD)
- Hiển thị đúng tuyến / thông tuyến rõ ràng

**Cần bổ sung**:
- [ ] Tích hợp API BHXH `SearchByCccd` + `CheckValidity` endpoint chính thức
- [ ] Form Reception: nhập 15 số → auto-show KKCB; nhập 20 số → check thông tuyến
- [ ] UI hiển thị đồng bộ CCCD↔BHYT với diff highlight
- [ ] Quét QR CCCD (đã có `BarcodeScanner.tsx`) → parse MRZ → check BHYT
- [ ] Lưu lịch sử check thông tuyến (audit)

**Ưu tiên**: **CAO** — đã có `CccdValidator.cs` và BHXH gateway stub, cần hoàn thiện.

---

## PHẦN 2: GAP ƯU TIÊN TRUNG BÌNH (nâng chất lượng sản phẩm)

### 2.1 Đơn thuốc mẫu theo ICD + HSBA mẫu + Tường trình PTTT mẫu
**Hiện trạng**: HIS có `PrescriptionTemplate`, `TreatmentSheetTemplate`, template EMR — nhưng chưa có:
- Template đơn thuốc gắn theo **mã ICD** (khi BS chọn chẩn đoán ICD, popup gợi ý template)
- Template HSBA ngoại trú mẫu
- Template tường trình PTTT theo mã ICD

**Đối thủ có**:
- Đơn thuốc mẫu: filter theo bệnh/khoa phòng, tick hoạt chất, nhập sáng/trưa/chiều/tối, chọn ngoại trú/nội trú/cả hai/phòng lưu
- Cách dùng: bấm "Mẫu" trong F3 → chọn mẫu → chỉnh sửa ngày, số lượng → Chọn
- HSBA ngoại trú mẫu: Nhấn "Ngoại trú" → icon tạo mẫu → Lưu mẫu
- Tường trình PTTT mẫu: khai báo mẫu với thông tin bệnh + khoa phòng sử dụng + bác sĩ + thành viên PTTT
- Dùng mẫu: trong F6 → Chọn mẫu → chọn template ICD tương ứng

**Cần bổ sung**:
- [ ] Extend `PrescriptionTemplate` với `IcdCode`, `Scope` (Outpatient/Inpatient/Both/Observation)
- [ ] UI Button "Mẫu" trong Prescription.tsx → popup filter theo ICD + khoa
- [ ] Model `OutpatientEmrTemplate` + UI khai báo + dùng trong OPD
- [ ] Template PTTT with `IcdCode` + `DepartmentId` + `SurgeryTeamMembers` (JSON)
- [ ] UI "Chọn mẫu" trong Surgery PTTT form

### 2.2 Viết tắt (F2 text expander)
**Hiện trạng**: Chưa có hệ thống viết tắt auto-expand.

**Đối thủ có**:
- Khai báo bảng viết tắt: 2-3 ký tự → cụm từ y khoa thường dùng
- Sử dụng: trong các ô "ghi chú thuốc", "ghi chú hẹn", "chẩn đoán sơ bộ", "triệu chứng lâm sàng" → nhập từ viết tắt → ấn **F2** → tự thay thế
- Viết tắt trong kết quả XN: chọn thông số → nhập viết tắt → F2
- Viết tắt trong CĐHA: ở ô mô tả/kết luận/đề nghị
- Hoạt động theo từng kỹ thuật trong CĐHA

**Cần bổ sung**:
- [ ] Bảng `Abbreviation` (code, expansion, scope: Prescription/Diagnosis/Lab/Radiology/General, scopeKey optional)
- [ ] Custom React hook `useAbbreviationExpander` — listen F2, match current word at caret, replace với expansion
- [ ] Dropdown autocomplete khi gõ
- [ ] Cài vào OPD, Prescription, Lab result, Radiology result, CĐHA

### 2.3 Cảnh báo bệnh nhân (red flag)
**Hiện trạng**: HIS có allergy tracking, chưa có flag cảnh báo tổng quát per-patient.

**Đối thủ có**:
- Khai báo cảnh báo BN: mã BN + lý do lưu ý + màu riêng + ghi chú
- Mỗi lần đăng ký BN → hiện thông báo ghi chú lưu ý dưới
- Nhỏ icon màu lưu ý trên mọi màn hình mở hồ sơ BN
- Click màu xem chi tiết cảnh báo
- Có thể xóa cảnh báo

**Cần bổ sung**:
- [ ] Entity `PatientFlag` (PatientId, reason, color, note, createdBy, createdAt, isActive)
- [ ] UI admin: Nghiệp vụ → Cảnh báo người bệnh → CRUD
- [ ] Banner đỏ/cam/vàng trên mọi page hiển thị BN (Reception, OPD, IPD, EMR, Billing)
- [ ] Click banner → modal chi tiết

### 2.4 Duyệt giảm giá có workflow + lý do
**Hiện trạng**: HIS có discount amount/percent cơ bản trong Billing; chưa có workflow phê duyệt + lý do chuẩn hóa.

**Đối thủ có**:
- Nhập số tiền giảm hoặc % giảm → auto-calc
- **Lý do** (dropdown enum):
  - BHBL (Bảo hiểm bảo lãnh — ngoài BHYT, thường là PJICO/Bảo Việt...)
  - Nhân viên (giảm cho NV BV)
  - Người nhà nhân viên
  - Giám đốc duyệt miễn
- **Người duyệt**: cơ quan bảo lãnh viện phí hoặc giám đốc BV
- Ghi chú bắt buộc

**Cần bổ sung**:
- [ ] Extend `Receipt.DiscountReason` enum + `ApprovedBy` field
- [ ] UI Billing: dropdown lý do + input người duyệt + ghi chú required
- [ ] Validation: nếu discount > threshold thì require GĐ duyệt
- [ ] Report discount theo lý do

### 2.5 Hoàn trả chi tiết (partial refund)
**Hiện trạng**: Billing có refund ở mức receipt; chưa có refund ở mức từng dòng dịch vụ.

**Đối thủ có**:
- **Hoàn trả tất cả**: hủy cả hóa đơn
- **Hoàn trả chi tiết**: tick từng mục dịch vụ → chỉ hoàn những mục đã tick → còn lại vẫn thu
- Cảnh báo BHYT: không thể hoàn trả chi tiết thuốc; không thể hoàn trả CLS đã có kết quả (phải hủy KQ trước)
- Thu phí được hoàn trả chi tiết tự do hơn

**Cần bổ sung**:
- [ ] Extend `RefundDto` với `items[]` (list receiptDetailId + refundAmount)
- [ ] Backend validation: check CLS đã có kết quả chưa, thuốc BHYT cấm refund chi tiết
- [ ] UI modal với checkbox từng dòng + amount per item

### 2.6 Xuất dự trù thuốc/VTYT theo BN (F10)
**Hiện trạng**: HIS có warehouse issues, chưa có workflow dự trù trước cho BN (pre-reservation stock).

**Đối thủ có (F10)**:
- Từ màn hình Phiếu khám bệnh / Tờ điều trị nội trú → F10
- Chọn khoa + phiếu dự trù + trạng thái phiếu (5 trạng thái chuẩn)
- Dùng để **bù tủ trực** thuốc/VTYT theo BN từ các kho
- Nhập nhiều BN trong cùng 1 phiếu (sau khi Lưu → Kết thúc → mở lại phiếu đó cho BN tiếp theo)
- Khi đạt hạn mức cấp → bấm "Chuyển" → gửi danh sách sang kho Dược
- Khóa đối tượng (BHYT / hao phí / thu phí / BHBL VP) để nhập thuốc không cần chọn đối tượng mỗi lần

**Cần bổ sung**:
- [ ] Entity `StockReservation` (departmentId, patientId, status, lockedObject, items[])
- [ ] Route F10 từ OPD và Inpatient
- [ ] Multi-patient batch flow
- [ ] Trạng thái 5-phase + lock đối tượng

### 2.7 Sửa đối tượng thuốc/dịch vụ (bulk re-assign)
**Hiện trạng**: Chưa có tính năng đổi hàng loạt đối tượng thanh toán.

**Đối thủ có**:
- **Toàn bộ**: nhập mã BN → chọn "Viện phí" hoặc "Thuốc" → chọn đối tượng cũ (VD: BHYT) → đối tượng mới (VD: Thu phí) → "Lưu" → "Tổng hợp lại" → tất cả services đổi đối tượng
- **Chi tiết**: từng dịch vụ đổi đối tượng riêng lẻ
- Use case: BN mang BHYT nhưng phát hiện thẻ hết hạn → đổi sang Thu phí

**Cần bổ sung**:
- [ ] API `POST /billing/reassign-object` (patientId, scope: All/Detail, fromObject, toObject, items[])
- [ ] UI admin tool trong Billing
- [ ] Audit log bắt buộc

### 2.8 Hủy in chi phí / Hủy hoàn tất (reverse workflow)
**Hiện trạng**: Examination có `Status` nhưng không có "in chi phí" state riêng và không có flow undo.

**Đối thủ có**:
- Sau khi "Hoàn tất" + "In chi phí" (Bảng kê) → không thể chỉnh sửa phiên khám
- Muốn chỉnh sửa → phải làm ngược:
  1. Hủy in chi phí (bulk select BN đã in chi phí → hủy)
  2. Hủy hoàn tất (trong Tiện ích → Nghiệp vụ → Hủy hoàn tất)
  3. Chỉnh sửa phiên khám

**Cần bổ sung**:
- [ ] Examination state machine: Active → Completed → BillPrinted; reverse each state
- [ ] API `cancel-bill-print` và `cancel-completion` với permission check
- [ ] UI trong OPD: nút hiện theo role (chỉ trưởng khoa + lãnh đạo)

### 2.9 Phát thuốc ngoại trú với in tem + Phát thuốc nội trú (đơn vị)
**Hiện trạng**: HIS có dispensing nhưng có thể chưa in tem chuẩn.

**Đối thủ có**:
- Ngoại trú: Xuất kho → Bảo hiểm → Phát thuốc → Chọn ngày/giờ/quầy phát → tick Phát → In tem (barcode thuốc + tên BN + liều dùng)
- Nội trú: Xuất kho → Duyệt đơn vị → Đánh dấu phát thuốc
- Hủy phát: bỏ tick Phát → Lưu → BN về danh sách "Chưa phát"

**Cần bổ sung**:
- [ ] Dispensing UI với queue view (chọn quầy phát)
- [ ] Template in tem thuốc A4/A5 với barcode
- [ ] Toggle phát/chưa phát với log

### 2.10 Sổ biên lai thu tiền (user-based cash book)
**Hiện trạng**: HIS có CashBook nhưng có thể chưa đầy đủ quy tắc biên lai VN.

**Đối thủ có**:
- Mỗi người thu khai báo **2 quyển sổ**:
  - Sổ tạm ứng (ký hiệu = tên không dấu + `_TU`)
  - Sổ viện phí (ký hiệu = tên không dấu)
- Từ số 1 đến 999999 (number range)
- Loại sử dụng: Tạm ứng / Thanh toán viện phí
- Lý do thu: Thu tạm ứng / Thu viện phí / Thu viện phí khoa chuyển
- Gắn với người thu cụ thể
- Tick "Khám bệnh" + "Đang dùng"

**Cần bổ sung**:
- [ ] Extend `CashBook` entity với fields đầy đủ: `BookCode`, `StartNumber`, `EndNumber`, `BookType`, `Reason`, `CollectorId`, `IsActive`, `UsageCategory`
- [ ] UI admin: Khai báo sổ biên lai với enforcement 2 quyển/người
- [ ] Billing UI: auto-pick sổ tạm ứng/viện phí theo thao tác

### 2.11 EMR: Ký số vân tay bệnh nhân (biometric)
**Hiện trạng**: HIS có digital signature CKS/USB Token cho BS, `PatientSignaturePad.tsx` capture chữ ký base64 PNG — chưa có fingerprint biometric.

**Đối thủ có (Desktop EMR + CKS module)**:
- Đăng ký sinh trắc học BN (thiết bị fingerprint reader Secugen/Zvetco)
- Lưu vân tay (template ISO 19794-2)
- Khai báo người thân của BN (vân tay đại diện khi BN không tự ký được)
- Khi ký giấy tờ: yêu cầu lấy vân tay → so khớp → chấp nhận

**Cần bổ sung**:
- [ ] Backend `PatientBiometric` entity (PatientId, templateBase64, deviceId, enrolledAt)
- [ ] `PatientRelativeBiometric` cho người đại diện
- [ ] Native fingerprint reader integration (cần Electron app hoặc Windows COM bridge)
- [ ] Signing flow: before sign → prompt fingerprint → verify → sign
- [ ] Alternative nếu không có hardware: dùng chữ ký pad hiện có + CCCD validation

**Ưu tiên**: **TRUNG BÌNH** — nhiều BV không bắt buộc; nhưng là differentiator.

### 2.12 Multi-signature workflow (BS → Trưởng khoa → Lãnh đạo)
**Hiện trạng**: HIS có `CentralSigning` và `SigningWorkflow`; cần verify đầy đủ 2 loại mẫu.

**Đối thủ có 2 loại**:
1. **Mẫu 2 chữ ký**: trưởng khoa ký → lãnh đạo ký (Giấy ra viện, Giấy chứng nhận PTTT, Giấy nghỉ BHXH, Giấy chứng sinh)
2. **Mẫu nhiều chữ ký**: BS điều trị → trưởng khoa → lãnh đạo (Giấy tóm tắt HSBA)

UI form trình ký có:
- Filter từ ngày - đến ngày
- Loại giấy cần ký
- Trạng thái (tất cả / đã ký)
- Tên user đăng nhập
- Hủy CKS được

**Cần bổ sung** (nếu chưa có):
- [ ] Verify `SigningWorkflow` hỗ trợ n-step signing cho cùng 1 document
- [ ] UI Trình ký lãnh đạo: filter + status + hủy
- [ ] Template 2-sig và multi-sig riêng biệt

### 2.13 Hành chính HR: Tài sản cá nhân + đoàn thể + kỷ luật khen thưởng
**Hiện trạng**: HIS HR có staff, duty roster, CME, licenses — chưa đầy đủ trường quản lý NV theo chuẩn HCNN Việt Nam.

**Đối thủ có** (MQ Human module):
- **Tài sản NV**: BĐS (bất động sản), hiện kim, hiện vật, tài sản cố định
- **Phụ cấp**: loại / cách thức / giá trị / thời hạn
- **Quá trình công tác**: chuyển bộ phận (bộ phận cũ/mới, chức vụ cũ/mới, ngày chuyển) + lịch sử công tác
- **Đào tạo**: bằng cấp, chuyên ngành, học vị
- **Gia đình**: quan hệ / tên / ngày sinh / nghề nghiệp
- **Bản thân**: trước tuyển dụng, sau tuyển dụng
- **Đoàn thể**: Đảng, Đoàn, Công đoàn
- **Kỷ luật khen thưởng**
- **Lương**: bậc, hệ số
- **Tài khoản ngân hàng**
- **Hợp đồng**
- **BHXH - BHYT**

**Cần bổ sung**:
- [ ] Entity `EmployeeAsset` (BĐS / HK / HV / TSCĐ)
- [ ] `EmployeeAllowance` (loại, cách thức, giá trị, thời hạn)
- [ ] `EmployeeCareerHistory` (bộ phận cũ/mới, chức vụ cũ/mới, ngày chuyển)
- [ ] `EmployeeEducation` (bằng cấp, chuyên ngành, học vị)
- [ ] `EmployeeFamily` (relation, name, DOB, occupation)
- [ ] `EmployeeReward` (loại, lý do, ngày, giá trị)
- [ ] `EmployeeDiscipline`
- [ ] `EmployeeBankAccount`
- [ ] `EmployeeContract`
- [ ] UI HR module 9 tab tương ứng

### 2.14 Trang thiết bị + VPP (tách biệt với medical supply)
**Hiện trạng**: HIS có `Equipment` module (medical equipment). Chưa có riêng quản lý VPP + tài sản văn phòng.

**Đối thủ có** (module TTB VPP):
- Nhập kho (số HĐ, NCC, tên hàng, SL, tiền, thuế...)
- Duyệt cấp cho khoa
- Thu hồi phiếu
- Phiếu xuất kho trực tiếp (nếu không dùng phiếu lệnh)
- Báo cáo thẻ kho (như module dược)
- Khoa/phòng tạo phiếu lệnh yêu cầu hàng → duyệt

**Cần bổ sung**:
- [ ] Module `OfficeSupplies` (ItemType = OfficeEquipment) tách với MedicalSupply
- [ ] CRUD receipts/issues/approvals
- [ ] Báo cáo thẻ kho
- [ ] UI Khoa tạo phiếu lệnh yêu cầu

### 2.15 LIS chi tiết: Viết tắt KQ, Sổ XN, Điều phối mẫu, Hẹn mẫu
**Hiện trạng**: HIS LIS có cơ bản; cần bổ sung chi tiết workflow.

**Đối thủ có**:
- **Sổ xét nghiệm**: cấu trúc phân cấp sổ → nhóm XN → XN chi tiết; khi máy trả KQ map vào sổ tương ứng
- **Viết tắt KQ XN**: table viết tắt với STT, áp dụng trong ô kết quả (chọn thông số → nhập viết tắt → pop lên menu thay thế)
- **Hóa chất XN**: add hóa chất vào từng XN, đổi đối tượng hóa chất (hao phí vs thu phí), tự trừ kho
- **Lấy mẫu bệnh phẩm** (Specimen Collection):
  - STT tự động cấp → in barcode
  - Thêm XN trên cùng mẫu bệnh phẩm (consolidation)
  - Lịch sử lấy mẫu chia theo đợt + ngày
  - Sửa STT (thay đổi số mẫu)
  - Hẹn (đặt ngày hẹn mẫu)
- **Xác nhận mẫu** (Sample Receive): tách riêng khỏi phát KQ để tracking đúng quy trình
- **Phân quyền KTV vs Người duyệt**: KTV nhập KQ, Người duyệt ký tên + trách nhiệm; copy quyền giữa users
- **Màu kết quả**: đỏ (lớn hơn giá trị bình thường), xanh (nhỏ hơn) — threshold coloring
- **KQ máy (auto)**: queue nhận từ máy XN, nếu miss có thể "Chuyển lại" từ KQ máy queue

**Cần bổ sung**:
- [ ] Entity `LabBook` (phân cấp LabBook → LabBookGroup → LabTest)
- [ ] `LabAbbreviation` riêng cho LIS
- [ ] `LabChemical` per test + auto-deduct stock
- [ ] Specimen collection queue with STT auto-gen + barcode
- [ ] "Thêm XN trên cùng mẫu" flow
- [ ] Sample Receive (Xác nhận mẫu) module riêng
- [ ] KTV/Reviewer role distinction với copy role
- [ ] Threshold coloring trong result view

### 2.16 RIS: Điều phối (Dispatcher), Phân quyền Chụp/Đọc
**Hiện trạng**: RIS cơ bản — chưa có dispatcher, chưa phân biệt role KTV vs BS đọc.

**Đối thủ có**:
- **Điều phối**: dispatcher chọn BN từ queue → chọn phòng/máy thực hiện → in phiếu điều phối → BN đi đúng phòng
- **Phân quyền**: 2 role chuẩn
  - `Chup` (Kỹ thuật viên — KTV): chụp hình, nhập thông số kỹ thuật
  - `Doc` (Bác sĩ đọc): đọc, trả KQ, duyệt
- **Copy quyền**: chọn user mẫu "chup" → copy toàn bộ quyền → paste cho user mới (nhanh onboarding)
- **Phân quyền theo máy**: matrix (quyền × máy chụp) — BS A chỉ được đọc CT, BS B đọc cả CT và MRI

**Cần bổ sung**:
- [ ] Module `RadiologyDispatcher` riêng
- [ ] UI: worklist → chọn phòng thực hiện → in phiếu điều phối
- [ ] Role `ImagingTech` vs `RadiologyReader` chuẩn hóa
- [ ] Permission matrix: user × modality/machine
- [ ] UI copy permission from reference user

### 2.17 RIS NON-DICOM: Camera web + Video recording
**Hiện trạng**: HIS không có workflow cho thiết bị non-DICOM (nội soi analog, camera y khoa...)

**Đối thủ VRPACS NON-DICOM có**:
- Cấu hình camera browser (chrome://flags, edge://flags → Insecure origins treated as secure)
- Chụp ảnh từ camera web (button trong viewer)
- Quay video (mở toàn màn hình, xóa, tải xuống)
- Upload file ngoài (JPEG, PDF, pathology files)
- Copy ảnh giữa ca chụp
- Mode chế độ 1/2 màn hình (worklist + viewer)
- Có 2 quy trình:
  1. BS chụp + đọc + trả KQ nhanh
  2. Hội chẩn trực tuyến — tạo phòng từ ca chụp

**Cần bổ sung**:
- [ ] Module `NonDicomCapture` với WebRTC camera access
- [ ] MediaRecorder API cho video
- [ ] Upload + storage (R2/S3) cho file non-DICOM
- [ ] Worklist riêng cho non-DICOM studies
- [ ] Integrate vào Pathology + Endoscopy modules

### 2.18 PACS Share study (QR + password + TTL)
**Hiện trạng**: HIS có DICOM send to remote PACS (NangCap15), chưa có link chia sẻ cho BN xem ngoại mạng.

**Đối thủ có**:
- Click "Chia sẻ" trên worklist → popup:
  - Có thể đặt password
  - Chọn thời gian hiệu lực (vài phút / vài giờ / mãi mãi)
  - Có thể ẩn thông tin BN
  - Sinh link + QR code
- User ngoài mạng mở link → nhập password → xem ảnh qua viewer (đọc-only)

**Cần bổ sung**:
- [ ] Entity `StudyShareLink` (studyId, token, password (hashed), expiresAt, hideDemographics, createdBy)
- [ ] Public route `/shared/:token` render viewer read-only
- [ ] UI popup share với QR (thư viện qrcode.react)

### 2.19 Mobile apps (Native iOS/Android) cho BS
**Hiện trạng**: HIS responsive web, chưa có native app.

**Đối thủ có 2 app**:
1. **EMR Mobile** (BS): login, chọn khoa/BA, nhập tờ điều trị, dự trù thuốc/CLS, in qua Wifi, xem KQ CDHA/XN/thuốc, phiếu chăm sóc, phiếu dịch truyền
2. **VRPACS Mobile**: login, xem worklist, xem DICOM images, MPR, trả kết quả, chia sẻ study, upload thêm ảnh, gửi KQ sang HIS

**Cần bổ sung**:
- [ ] React Native hoặc Flutter mobile app
- [ ] Feature: login, patient search, view records, read lab/radiology results
- [ ] Nursing mode: treatment sheet quick entry
- [ ] Wifi printer discovery (nếu Vietnam-specific BYOD)
- [ ] DICOM viewer mobile (có thể dùng thư viện sẵn như `react-native-cornerstone`)

**Ưu tiên**: **TRUNG BÌNH** — không bắt buộc cho tender cơ bản, nhưng differentiator mạnh.

### 2.20 PACS Admin UI chi tiết (Khu vực, Thư mục, ICD mapping, Máy chụp)
**Hiện trạng**: HIS có SystemAdmin nhưng chưa có UI admin PACS chi tiết.

**Đối thủ VRPACS Admin có**:
- **Thống kê**: search đa tiêu chí (thời gian, phòng/máy, BS, KTV, BN, chẩn đoán), output dạng bảng / biểu đồ / chi tiết
- **Quản lý BS**: CRUD user, role-based permissions, reset password, import Excel
- **Dịch vụ kỹ thuật**: CRUD services
- **Loại dịch vụ**: nhóm services
- **Mẫu kết quả**: template per service
- **Backup thư mục**: quản lý thư mục backup DICOM
- **Cấu hình**: tên BV, địa chỉ, SĐT hiển thị trên RIS
- **Máy chụp PACS**: gán mẫu kết quả + mẫu in per máy chụp
- **Khu vực**: chi nhánh (tầng cha nhất)
- **Thư mục** (cấp 2): Normal / Share (STT=900) / Upload (STT=950)
- **Phân quyền BS**: matrix quyền × máy chụp với quyền:
  - Chỉ xem / Xóa ca chụp / Đọc kết quả / Cập nhật từ HIS / Duyệt KQ / Chia sẻ / Hội chẩn / Thống kê báo cáo / Hủy hội chẩn / Hủy duyệt bất kỳ / Chỉnh sửa KQ
- **Mẫu in KQ**: CRUD template
- **ICD mapping**: map ICD → loại dịch vụ → mẫu kết quả (tự áp dụng khi chỉ định từ HIS)
- **Vật tư**: CRUD vật tư y tế per CĐHA

**Cần bổ sung**:
- [ ] RIS Admin page chuyên biệt với 15 tab (theo đối thủ)
- [ ] Thống kê RIS với biểu đồ Recharts
- [ ] Permission matrix UI (user × machine × action)
- [ ] ICD → Template mapping
- [ ] Backup folder management UI

---

## PHẦN 3: GAP ƯU TIÊN THẤP (nice-to-have, không blocker)

### 3.1 Cấu hình cá nhân hóa PACS Viewer (Keyboard shortcuts, Window/Level)
- User config lưu: hotkeys custom, W/L presets F1-F10 custom, layout defaults, tool visibility, overlay fields position

### 3.2 Image library (thư viện ảnh mẫu giải phẫu)
- DB ảnh CT/MRI/XRay mẫu theo bộ phận để BS tham chiếu khi đọc

### 3.3 So sánh 2 bệnh án trên viewer
- "Thêm bệnh án" → load study 2 → so sánh side-by-side trên cùng viewer

### 3.4 AI Labeling (ghi nhãn tự động)
- Tích hợp model AI (MONAI / nnU-Net / ChestXray14 pretrained) để tự động khoanh tổn thương, ghi nhãn

### 3.5 Paint integration (vẽ trực tiếp ảnh PTTT)
- Đối thủ: phần mềm Paint Windows mở từ module Surgery để BS vẽ sơ đồ PTTT → save image → attach vào tường trình
- Giải pháp hiện đại: canvas drawing (react-konva) trong modal

### 3.6 Export data to Excel (mọi danh sách)
- Đối thủ có nút "Excel" trên hầu hết danh sách (worklist, queue, registration, search result)
- HIS có ở một số chỗ — cần phổ biến hóa với `ExcelJS` hoặc `xlsx`

### 3.7 Sinh trắc học (fingerprint cho BN) — xem 2.11

### 3.8 Tra cứu file hồ sơ đã ký số cho BN bên ngoài
- Đối thủ: BN vào URL → nhập CCCD hoặc QR CCCD → xác thực → xem danh sách file đã ký số của mình
- Hiện HIS chưa có công khai, cần thêm route public

### 3.9 Nhập sinh trắc/chữ ký người thân BN (representative signature)
- Khi BN không tự ký được (hôn mê, sơ sinh, người cao tuổi) → người thân ký thay với CCCD của người thân
- Entity `PatientRelativeSignature`

### 3.10 Thống kê BS đọc KQ + KTV chụp
- Thống kê workload per-user cho payroll/KPI

### 3.11 Báo cáo thẻ kho (thẻ tồn — Vietnam standard form)
- Đối thủ có trong Dược + TTB VPP
- HIS có inventory reports cơ bản nhưng chưa đúng format thẻ kho chuẩn

### 3.12 Chế độ chia 2 màn hình (dual monitor)
- PACS support dual screen: worklist ở màn 1, viewer ở màn 2 (Windows + P Extend)
- Chỉ cần window.open + postMessage sync

### 3.13 Lịch sử lấy mẫu XN phân theo đợt
- Lấy mẫu cùng 1 BN trong ngày khác nhau đợt (morning, afternoon, emergency) — chia tách trong lịch sử

### 3.14 Hủy mẫu đã có kết quả với reverse flow
- Muốn hủy lấy mẫu → phải hủy kết quả → hủy xác nhận mẫu → hủy lấy mẫu (reverse chain)

---

## PHẦN 4: CÁC MODULE ĐÃ CÓ — CẦN REVIEW + HOÀN THIỆN CHI TIẾT

Một số module HIS đã có nhưng cần so với đối thủ để hoàn thiện chi tiết:

| Module | Tình trạng HIS | Cần bổ sung theo đối thủ |
|---|---|---|
| EMR 38 mẫu phiếu | Đã có 17 BS + 21 ĐD + 30 chuyên khoa TT 32 | Thêm: phiếu chuyển khoa (BS + ĐD riêng), giấy chứng nhận PTTT kèm giấy ra viện, phiếu khám thai (4 trang), biên bản kiểm điểm tử vong, phiếu nhận định phân loại cấp cứu, phiếu gây mê hồi sức (4 trang), phiếu cam kết nhập viện nội trú, phiếu cam kết từ chối dịch vụ, phiếu cam kết ra viện không chỉ định, phiếu PT mắt chuyên sâu (ghép giác mạc, glocom, lác, túi lệ, sắp mi/màng/thủy tinh/Sapejko) |
| HSBA chuyên khoa | Có 38 mẫu TT 32 | Review + bổ sung: bệnh án YHCT nhi, bệnh án ung bướu có thông tin giai đoạn TNM, bệnh án huyết học-truyền máu có đồ thị bạch cầu, bệnh án tâm thần 6 trang |
| Queue display | Có, 2 mode HIS + Lab | Thêm: mode mammography, mode nội soi riêng; tự động read-out tiếng Việt với tên phòng cụ thể |
| Hội chẩn | Có Radiology chat | Upgrade lên full video conference (xem 1.4) |
| Telemedicine | Có session 1-1 | Upgrade: group consultation, recording, tích hợp với viewer |
| Signature workflow | Có CentralSigning | Verify hỗ trợ n-step, add Hủy CKS từ form trình ký |
| Patient portal | Có family/reminders/metrics/Q&A | Thêm: tra cứu file đã ký số, tự xác thực CCCD QR |
| Dashboard | Có recharts | Thêm: drill-down, compare period (tháng này vs tháng trước), export PDF |
| Audit log | Có middleware | Thêm: filter by patient, filter by IP, suspicious activity detection |

---

## PHẦN 5: ROADMAP TRIỂN KHAI ĐỀ XUẤT

### Sprint 1 (2-3 tuần) — UNBLOCK TENDER CRITICAL
1. **Thanh toán không dùng tiền mặt VNPAY** (1.1) — 1 tuần
   - Backend gateway + webhook + entity + 3 báo cáo cơ bản
   - Frontend: QR dynamic + payment status trên phiếu
2. **Kiểm tra thông tuyến BHYT** (1.6) — 3 ngày
   - Complete BHXH gateway integration (đã có stub)
3. **Khám nhiều phòng + khám thêm CK khác** (1.5) — 1 tuần
   - Reception multi-clinic registration
   - OPD "Khám thêm" action
   - Billing rule cho BHYT

### Sprint 2 (2-3 tuần) — PHARMACY + APPROVAL WORKFLOW
4. **Dược duyệt cấp workflow đầy đủ** (1.2) — 1.5 tuần
   - 5 loại duyệt + state machine + thu hồi + partial approval
5. **Xuất dự trù theo BN F10** (2.6) — 5 ngày
6. **Sửa đối tượng thuốc/dịch vụ** (2.7) — 3 ngày
7. **Hủy in chi phí / Hủy hoàn tất** (2.8) — 2 ngày

### Sprint 3 (2-3 tuần) — EMR TEMPLATES + CLINICAL UX
8. **Đơn thuốc mẫu theo ICD + HSBA mẫu + PTTT mẫu** (2.1) — 1 tuần
9. **Viết tắt F2 text expander** (2.2) — 3 ngày
10. **Cảnh báo BN (red flag banner)** (2.3) — 3 ngày
11. **Duyệt giảm giá workflow** (2.4) — 3 ngày
12. **Hoàn trả chi tiết** (2.5) — 3 ngày

### Sprint 4 (3-4 tuần) — PACS VIEWER UPGRADE
13. **PACS Viewer nâng cao** (1.3) — 2-3 tuần
    - Upgrade OHIF/Cornerstone, MPR 4-quadrant, 3D volume, Mamo tools, customizable shortcuts
14. **Study share link QR + password** (2.18) — 3 ngày
15. **PACS Admin UI chi tiết** (2.20) — 1 tuần
16. **RIS Điều phối + Phân quyền Chụp/Đọc** (2.16) — 5 ngày

### Sprint 5 (3-4 tuần) — COMMUNICATION + NON-DICOM
17. **Hội chẩn online video conference** (1.4) — 2 tuần
    - LiveKit/Jitsi server + recording + invite link
18. **RIS NON-DICOM camera capture** (2.17) — 1 tuần
19. **Mobile apps cho BS/ĐD** (2.19) — 2 tuần (parallel với 17)

### Sprint 6 (2-3 tuần) — LIS + HR + FINISHING
20. **LIS chi tiết: Sổ XN, viết tắt, hóa chất** (2.15) — 1 tuần
21. **HR quản lý NV đầy đủ** (2.13) — 1 tuần
22. **Trang thiết bị + VPP** (2.14) — 5 ngày
23. **Sổ biên lai đầy đủ** (2.10) — 3 ngày
24. **Multi-signature workflow verify** (2.12) — 3 ngày

### Sprint 7 (2 tuần) — POLISH + ADVANCED
25. **Phát thuốc in tem** (2.9) — 3 ngày
26. **Export Excel phổ biến** (3.6) — 3 ngày
27. **Ký số vân tay BN** (2.11) — 1 tuần (nếu có hardware)
28. **Các nice-to-have** (PHẦN 3) — tùy ưu tiên

---

## PHẦN 6: CHECKLIST KIỂM TRA CẤU TRÚC

Trước khi triển khai, cần verify trong codebase:
- [ ] `backend/src/HIS.Core/Entities/`: các entity đã có chưa? (CashBook, Abbreviation, PatientFlag, StockApproval, StockReservation, EmployeeAsset, ...)
- [ ] `backend/src/HIS.Infrastructure/Services/`: services tương ứng
- [ ] `backend/src/HIS.API/Controllers/`: endpoints
- [ ] `frontend/src/pages/`: UI mới
- [ ] `frontend/src/api/`: API clients
- [ ] `backend/src/HIS.Infrastructure/Data/Scripts/`: SQL migration (idempotent IF NOT EXISTS)
- [ ] Cypress E2E: thêm spec file cho từng feature mới
- [ ] Playwright prod smoke test nếu cần

---

## PHẦN 7: ƯỚC LƯỢNG TỔNG CHI PHÍ THỜI GIAN

| Priority | Sprints | Thời gian ước | Headcount |
|---|---|---|---|
| CAO (PHẦN 1) | Sprint 1 + phần 3-4 | ~6-7 tuần | 2-3 FE + 2 BE + 1 DevOps |
| TRUNG BÌNH (PHẦN 2) | Sprint 2-6 | ~10-12 tuần | tương tự |
| THẤP (PHẦN 3) | Sprint 7 | ~2-3 tuần | tương tự |
| **Tổng** | | **~18-22 tuần (~4-5 tháng)** | 5-7 người full-time |

Nếu chỉ làm PHẦN 1 để unblock tender: **~6-7 tuần**.
Nếu làm PHẦN 1 + PHẦN 2: **~16-18 tuần (4 tháng)**.

---

## GHI CHÚ

- Tài liệu đối thủ toàn tiếng Việt có dấu, một số ký tự bị lỗi do font PDF extract; đã đối chiếu nội dung sang tiếng Việt chuẩn trong plan này.
- Tham khảo thêm `NangCap_PhanTich.md` (phân tích nâng cấp TT54/2017, TT32/2023, TT13/2025) và `HIS_DataFlow_Architecture.md` (100 luồng nghiệp vụ) để khớp với kế hoạch chung.
- Một số tính năng đối thủ đã có trong HIS nhưng chưa verify kỹ — cần Sprint 0 (1 tuần) để audit codebase vs plan này trước khi bắt đầu thực hiện.
- Với các gói thầu gần đây của BV công lập, thứ tự ưu tiên đề xuất: thanh toán không tiền mặt (1.1) → BHYT thông tuyến (1.6) → đa phòng khám (1.5) → dược duyệt cấp (1.2) → PACS viewer (1.3) → hội chẩn video (1.4).
