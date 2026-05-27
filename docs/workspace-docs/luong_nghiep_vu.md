# Phân loại luồng nghiệp vụ HIS — bản hợp nhất (root business groups)

> **Mục tiêu:** gom ~150 luồng bệnh nhân thành **25 nhóm nghiệp vụ gốc**, chia theo **3 lớp**
> (Clinical / Operational / Administrative-Financial). **Mỗi nhóm chỉ giữ 1 luồng nghiệp vụ chính**,
> viết đúng mẫu arrow-chain có sẵn (`Bệnh nhân … → … → rời viện`) — không tạo khác mẫu.
> Đã loại biến thể vụn, luồng trùng, case thuần kỹ thuật (xem mục "Loại trừ"). Danh sách thô 150+ flow
> giữ ở **Phụ lục** (nguồn). Tag `[NC24]` = có chạm tính năng gói NangCap24.

## 3 lớp nghiệp vụ
- **A · Clinical** — xoay quanh điều trị bệnh nhân.
- **B · Operational** — vận hành bệnh viện (tiếp nhận, giường, hồ sơ, kho).
- **C · Administrative / Financial** — viện phí, BHYT, công nợ, báo cáo, audit.

## Actor chính theo lớp
| Actor | Nghiệp vụ tiêu biểu | Lớp |
|---|---|---|
| Bác sĩ | khám, kê toa, chỉ định CLS, duyệt xuất viện, ký HSĐT, hội chẩn, duyệt BHYT/phẫu thuật | A |
| Điều dưỡng/Y tá | nhận ca, thực hiện y lệnh, phát thuốc, ghi sinh hiệu, truyền dịch/máu, bàn giao ca | A/B |
| KTV CLS | tiếp nhận chỉ định, làm XN/CĐHA, upload kết quả, QC máy | A |
| Thư ký y khoa | nhập hồ sơ, lịch mổ, in giấy tờ, chuẩn bị bệnh án, điều phối lịch | B |
| Dược | duyệt thuốc, xuất/phát thuốc, kiểm kê, hạn dùng, đổi thuốc thiếu | B |
| Quản lý khoa/phòng | phân giường, điều phối phòng, công suất | B |
| Thu ngân | thu viện phí, hoàn tiền, đối soát, khóa bill | C |
| BGĐ/KHTH | dashboard, thống kê, báo cáo BHYT, KPI, duyệt hồ sơ | C |

---

## LỚP A — CLINICAL WORKFLOW
*(mỗi nhóm: 1 luồng chính + map module HIS)*

| # | Nhóm | Luồng nghiệp vụ chính | Module HIS |
|---|---|---|---|
| A1 | Khám ngoại trú | Bệnh nhân ngoại trú → tiếp nhận → khám bác sĩ → kê toa → thanh toán → nhận thuốc → rời viện | Reception → OPD → Prescription → Billing → Pharmacy |
| A2 | Tái khám & bệnh mãn tính | Bệnh nhân tái khám → xác nhận lịch hẹn → khám → kê toa → thanh toán → rời viện | FollowUp → OPD |
| A3 | Cấp cứu | Bệnh nhân cấp cứu → tiếp nhận cấp cứu → xử trí ban đầu → chỉ định CLS → theo dõi → nhập viện → điều trị nội trú → xuất viện | EmergencyDisaster → IPD |
| A4 | Nội trú | Bệnh nhân nội trú → nhập viện → tạm ứng viện phí → điều trị → quyết toán → xuất viện | Inpatient |
| A5 | Phẫu thuật & thủ thuật | Bệnh nhân phẫu thuật theo lịch → khám tiền mê → nhập viện → phẫu thuật → hậu phẫu → xuất viện | Surgery |
| A6 | Xét nghiệm (LIS) | Bệnh nhân được chỉ định xét nghiệm → lấy mẫu → chạy máy → trả kết quả → khám lại → kê toa → rời viện | Laboratory/LIS `[NC24]` HL7 queue |
| A7 | Chẩn đoán hình ảnh (RIS/PACS) | Bệnh nhân được chỉ định chẩn đoán hình ảnh → chụp → đọc kết quả → duyệt → rời viện | Radiology/RIS + DicomViewer `[NC24]` DICOM auto-send, MIP/Cine, log ca chụp |
| A8 | Thăm dò chức năng (TDCN) | Bệnh nhân được chỉ định thăm dò chức năng → đo (điện tim…) → trả kết quả → rời viện | TDCN |
| A9 | Thủ thuật & điều trị theo liệu trình | Bệnh nhân điều trị theo liệu trình → thực hiện nhiều buổi → theo dõi → thanh toán → rời viện | Rehabilitation / hỗ trợ điều trị |
| A10 | Thai sản & sơ sinh | Bệnh nhân thai sản → khám thai → nhập viện sinh → hậu sản → xuất viện mẹ và bé | EMR sản khoa → IPD |
| A11 | Tiêm chủng | Bệnh nhân tiêm vaccine → sàng lọc → tiêm → theo dõi phản ứng → rời viện | Immunization |
| A12 | Khám sức khỏe & gói khám | Bệnh nhân khám sức khỏe → thực hiện gói khám → tổng hợp kết quả → in kết luận → rời viện | HealthCheckup |
| A13 | Truyền máu & ngân hàng máu | Bệnh nhân nhận máu → đối chiếu tương thích → xác nhận truyền máu → theo dõi → kết thúc | BloodBank |
| A14 | Hội chẩn & lâm sàng đặc thù | Bệnh nhân hội chẩn nhiều chuyên khoa → nhận kết luận → rời viện | Consultation / Telemedicine |

## LỚP B — OPERATIONAL WORKFLOW

| # | Nhóm | Luồng nghiệp vụ chính | Module HIS |
|---|---|---|---|
| B1 | Tiếp nhận / Đăng ký / Check-in | Bệnh nhân đến viện → check-in → xác thực thông tin → tạo lượt khám → vào khám | Reception/QueueDisplay `[NC24]` thông tuyến BHXH |
| B2 | Điều phối phòng / giường | Bệnh nhân nội trú → phân giường → chuyển phòng/giường khi cần → cập nhật trạng thái giường | Inpatient (bed/ward) |
| B3 | Hồ sơ bệnh án điện tử (EMR) | Bác sĩ → lập/cập nhật hồ sơ bệnh án điện tử → ký số → lưu trữ | EMR `[NC24]` ký sinh trắc, cloud sync, xuất HL7 |
| B4 | Dược & Vật tư / Kho | Dược sĩ → duyệt toa → xuất/phát thuốc → cập nhật tồn kho | Pharmacy + Warehouse |
| B5 | Giấy tờ hành chính y khoa | Bệnh nhân xin giấy tờ y tế → bác sĩ xác nhận → in giấy → rời viện | EMR in biểu mẫu `[NC24]` Đề án 06 |

## LỚP C — ADMINISTRATIVE / FINANCIAL WORKFLOW

| # | Nhóm | Luồng nghiệp vụ chính | Module HIS |
|---|---|---|---|
| C1 | Viện phí & Thanh toán | Bệnh nhân → tổng hợp chi phí → thanh toán → xuất hóa đơn điện tử → rời viện | Billing `[NC24]` Bank/VietQR |
| C2 | BHYT & Giám định | Bệnh nhân BHYT → xác thực thẻ → áp quyền lợi → thanh toán phần chênh lệch → quyết toán BHYT | Insurance `[NC24]` cổng giám định BHXH |
| C3 | Bảo lãnh & Công nợ | Bệnh nhân bảo lãnh viện phí → xác nhận bảo lãnh → điều trị → ghi nhận công nợ/quyết toán → rời viện | Billing (công nợ) |
| C4 | Hủy & Hoàn tiền | Bệnh nhân đã thanh toán hủy dịch vụ → hoàn tiền → cập nhật trạng thái dịch vụ | Billing refund / ServiceRefund |
| C5 | Xuất viện & Kết thúc lượt | Bệnh nhân → kiểm tra điều kiện ra viện → trả giường → khóa hồ sơ → xuất viện | Inpatient discharge |
| C6 | Báo cáo / Dashboard / Audit | BGĐ/KHTH → tổng hợp dữ liệu → xem dashboard / xuất báo cáo BHYT / kiểm tra audit | Reports / Dashboard / Audit |

---

## Loại trừ (case thuần kỹ thuật/vận hành — KHÔNG tách nhóm nghiệp vụ)
Pending/retry & thất bại thanh toán POS-QR · rollback giao dịch lỗi · offline sync/nhập liệu bù ·
notify app/email/SMS · quét QR nhận thuốc tự động · mất vòng tay/thẻ → cấp lại · hợp nhất MRN trùng ·
sửa thông tin cá nhân sau giao dịch. → xử lý ở tầng hệ thống hoặc là sub-case xử lý lỗi, không phải luồng bệnh nhân gốc.

## Tổng kết
**25 nhóm gốc** = A (14) + B (5) + C (6), mỗi nhóm 1 luồng chính đúng mẫu. Phủ "xương sống" HIS gốc
(Khám ngoại trú, Nội trú, Cấp cứu, CLS/XN, CĐHA, TDCN, Nhà thuốc, Viện phí, BHYT, Phẫu thuật, Chuyển khoa-phòng,
Xuất viện, Hủy-hoàn tiền, Công nợ, Đặt lịch-check-in, Tái khám, Thai sản, Vật tư-thuốc) + bổ sung nhóm thực tế
còn thiếu (Tiêm chủng, Truyền máu, KSK/gói, Thủ thuật-liệu trình, Hội chẩn/đặc thù, EMR, Bảo lãnh, Báo cáo/Audit).

---

## Phụ lục — Danh sách thô 150+ flow (nguồn, đã gom vào 25 nhóm trên)

> Giữ nguyên để tham chiếu. Cột phải = nhóm gốc tương ứng (A/B/C).

| Luồng thô | Nhóm |
|---|---|
| Ngoại trú → khám → kê toa → thanh toán → nhận thuốc → về | A1 |
| Ngoại trú → chỉ định XN → trả KQ → khám lại → kê toa → thanh toán → về | A1/A6 |
| Ngoại trú → chỉ định CĐHA → đọc KQ → kê toa → thanh toán → về | A1/A7 |
| Khám nhiều chuyên khoa → thanh toán từng dịch vụ/gộp bill → về | A1/C1 |
| Khám dịch vụ → thanh toán → thực hiện dịch vụ → về | A1 |
| Tái khám → xác nhận lịch hẹn → khám → kê toa → thanh toán → về | A2 |
| Tái cấp thuốc mãn tính → bác sĩ duyệt → cấp thuốc → về | A2 |
| Cấp cứu → tiếp nhận → xử trí → CLS → theo dõi → nhập viện → nội trú → xuất viện | A3/A4 |
| Cấp cứu → hồi sức khẩn → phẫu thuật cấp cứu → điều trị → xuất viện | A3/A5 |
| Cấp cứu nhẹ → xử lý → kê toa → thanh toán → về | A3 |
| Vô danh cấp cứu → mã tạm → điều trị → cập nhật danh tính sau | A3/B1 |
| Nội trú → tạm ứng → điều trị → thanh toán phần còn lại → xuất viện | A4/C1 |
| Nội trú → nhiều lần tạm ứng → quyết toán → xuất viện | A4/C1 |
| Nội trú → nằm dài ngày → chốt viện phí tạm theo chu kỳ | A4/C1 |
| Nội trú → chuyển ICU/CCU / khu cách ly → cập nhật mức chăm sóc | A4/B2 |
| Nội trú → tạm xuất viện → quay lại điều trị tiếp | A4 |
| Phẫu thuật theo lịch → tiền mê → nhập viện → mổ → hậu phẫu → xuất viện | A5 |
| Phẫu thuật/thủ thuật trong ngày → theo dõi ngắn → thanh toán → về | A5 |
| Hoãn/hủy mổ → dời lịch/cập nhật chi phí; mổ lại → ca bổ sung | A5 |
| Truyền máu trong mổ → duyệt kho máu → theo dõi; biến chứng → ICU | A5/A13 |
| Chỉ định XN → lấy mẫu → trả KQ; mẫu không đạt → lấy lại; KQ nguy kịch → cảnh báo; XN nhanh | A6 |
| Chỉ chụp X-quang/CT/MRI; nội soi; sinh thiết → giải phẫu bệnh → tái khám; máy hỏng → phòng khác | A7 |
| ECG/Holter/điện não/hô hấp/loãng xương/thị-thính lực → KQ → về | A8 |
| Bó/tháo bột, nắn chỉnh, tiêm khớp, thay băng, catheter; truyền dịch/thuốc/hóa chất/sinh học | A9 |
| Chạy thận / hóa-xạ trị / PHCN nhiều đợt → liệu trình → theo dõi | A9 |
| Thai sản → khám thai → nhập viện sinh → hậu sản → xuất viện mẹ-bé; sinh đôi/ba; NICU; tách hồ sơ mẹ-bé | A10 |
| Tiêm vaccine → sàng lọc → tiêm → theo dõi phản ứng → về | A11 |
| KSK tổng quát/doanh nghiệp/lái xe/XKLĐ/tiền hôn nhân; sàng lọc tiền phẫu | A12 |
| Hiến máu → sàng lọc → lấy máu; nhận máu → đối chiếu tương thích → truyền | A13 |
| Hội chẩn/ý kiến 2; telehealth; điều trị tại nhà/cộng đồng; ghép tạng; nghiên cứu LS; hospice | A14 |
| Walk-in/đặt lịch/kiosk QR-CCCD/online; hồ sơ tạm (vô danh, không giấy tờ, trẻ em, người nước ngoài, VIP, đoàn) | B1 |
| Phân/chuyển/chờ giường, đổi loại giường, nằm ghép, chuyển khoa nhiều lần | B2 |
| Nhập liệu hồ sơ theo mẫu; ký số; sao y bệnh án; merge MRN | B3 |
| Duyệt-xuất-phát thuốc, kiểm kê, hạn dùng, đổi/trả thuốc, gây nghiện, vượt định mức | B4 |
| Giấy nghỉ BHXH, chứng nhận SK, chuyển viện, bản sao bệnh án | B5 |
| Tạm thu/thu, tách-gộp bill, nhiều nguồn (BHYT+TM+BH tư), một phần/dư, HĐĐT | C1 |
| BHYT đúng/trái/thông tuyến, hết hạn, sai thông tin, vượt định mức, ngoài DM, chuyển tuyến, quyết toán | C2 |
| Bảo lãnh BH công ty/tư, doanh nghiệp chi trả, nợ khi ra viện, miễn giảm, blacklist, người nhà bảo lãnh | C3 |
| Hủy khám; hủy dịch vụ đã thanh toán → hoàn tiền; bỏ khám; trốn viện | C4 |
| Ra viện (kiểm tra nợ/đơn/CLS); chuyển viện; xuất sớm trái chỉ định; tử vong & pháp y | C5 |
| Dashboard, thống kê, KPI, báo cáo BHYT (C79/C80, 16-21/BHYT), audit | C6 |

*(Case thuần kỹ thuật — pending/retry thanh toán, rollback, offline sync, notify app/email/SMS, mất vòng tay, sửa thông tin sau giao dịch — đã chuyển sang mục "Loại trừ".)*
