# Audit LUỒNG NGHIỆP VỤ end-to-end + đối chiếu TaiLieuDoiThu · 2026-06-06

> 4 agent đọc code thật (controllers/services + FE) đối chiếu `docs/workspace-docs/luong_nghiep_vu.md`, `docs/architecture/business-logic-complete.md` và tài liệu đối thủ `TaiLieuDoiThu/...`. Đây là lỗi **đứt mạch dữ liệu nghiệp vụ** (nặng hơn lỗi UI). Mục tiêu: sửa cho khớp luồng chuẩn MQ Solutions.

## 🔴 TÓM TẮT — 6 lỗi luồng NẶNG (P0, mất dữ liệu / mạch gãy)
1. **KQ Xét nghiệm KHÔNG quay về màn khám của bác sĩ.** KQ nhập ở `ServiceRequestDetail.Result` (model 1) hoặc `LabOrderItems` (model 3), nhưng `GetPatientLabResultsAsync` (`ExaminationCompleteService.WaitingList.cs:237`) lại đọc bảng `LabResults` (model 2 — rỗng) → **BS không bao giờ thấy KQ XN**. Tài liệu MQ "Trả KQ XN" yêu cầu KQ phải hiển thị lại tại màn khám. → đọc KQ từ ServiceRequestDetail (model 1).
2. **Chỉ định CLS tại giường (nội trú) KHÔNG lưu DB.** `InpatientCompleteService.OrdersReports.cs:294` `CreateServiceOrderAsync` là STUB in-memory ("we don't have a ServiceOrders table") → chỉ định biến mất, không lấy mẫu/trả KQ/viện phí được. MQ "Nội trú — Bác sĩ" mô tả chỉ định CLS tại giường là thao tác hằng ngày. → ghi `ServiceRequest`+`ServiceRequestDetail` như OPD.
3. **Sinh hiệu nội trú KHÔNG lưu.** `Treatment.cs:299-356` `CreateVitalSignsAsync`/`GetVitalSignsChartAsync` STUB → bảng theo dõi chức năng sống luôn rỗng, dữ liệu nhập bị mất.
4. **Nhập viện từ OPD KHÔNG tạo hồ sơ nội trú.** `ExaminationCompleteService.Conclusion.cs:125` `RequestHospitalizationAsync` chỉ set `ConclusionType=3` + field gợi ý; **không tạo Admission, không có worklist "chờ nhập viện"** → BN nhập viện trên OPD biến mất, khoa nội trú không thấy (phải gõ tay Mã HSBA). MQ: tiếp đón/khám → nhập viện là 1 mạch.
5. **Bảng kê viện phí thiếu thuốc/vật tư/giường.** `BillingCompleteService.CashBook.cs:259` `GetPatientBillingStatusAsync` chỉ Σ ServiceRequests → `CanDischarge` (`:303`) cho ra viện dù **còn nợ thuốc/giường**. Invoice (`CalculateInvoiceAsync` chỉ gom thuốc) và billing-status (chỉ dịch vụ) là **2 nguồn số liệu lệch nhau**. MQ-KTM yêu cầu bảng kê gom đủ khoản.
6. **Phát thuốc nhánh cũ + bán lẻ KHÔNG trừ kho.** `PharmacyController.cs:435` `CompleteDispensing` chỉ đổi Status; `HospitalPharmacyService.cs:135` bán lẻ không đụng tồn kho. Nhánh chuẩn (`WarehouseComplete DispenseOutpatient` + `PharmacyApproval`) trừ kho đúng. → ép dùng nhánh chuẩn / cho nhánh cũ gọi trừ kho.

## 🟠 P1 — sai trạng thái / mạch phụ gãy
7. **Trạng thái phiên khám "Chờ CLS"(2)/"Chờ kết luận"(3) không bao giờ được gán** → hàng đợi không phản ánh bước BN đang ở; KQ CLS không tự đẩy về (BS phải bấm tay). MQ: hàng đợi phòng khám hiển thị đúng trạng thái BN.
8. **Điều phối CĐHA (model 1 ServiceRequest) và luồng RIS thực hiện/tường trình (model 4 RadiologyRequest) không nối nhau.** `mark-performed` không tạo `RadiologyExam`, không đổi `SRD.Status`. KQ CĐHA chỉ hiện nếu phiếu tồn tại độc lập trong model 4.
9. **Đặt chỉ định OPD chỉ tạo ServiceRequest header, thiếu ServiceRequestDetail** (`ServiceOrders.cs:79`) trong khi lấy mẫu/nhận mẫu thao tác trên Details.
10. **Hủy/từ chối mẫu rollback sai bảng** (`LabCancelChainController` rollback model 2) và không đổi `ServiceRequest.Status` gốc.
11. **Admission.Status enum đụng độ**: `AdmitFromDepartment` set source Status=1 ("chuyển khoa") trùng mã "Đã xuất viện"; thiếu trạng thái "chờ ra viện".
12. **FEFO phát thuốc bỏ dòng khi 1 lô không đủ** (`StockOut.cs:106`) — âm thầm không trừ, đơn vẫn "đã phát". Có `AutoSelectBatchesAsync` gộp lô nhưng không dùng.
13. **Nút "Hủy phát" v2 gọi route không tồn tại** (`DispensingCounter.tsx:116` → `/warehousecomplete/issues/{id}/cancel`).

## 🟡 P2 — nợ kiến trúc / bề rộng còn stub
14. **4 mô hình dữ liệu CLS song song không đồng bộ** (ServiceRequest / LabRequest / LabOrder / RadiologyRequest) — nguồn gốc của lỗi #1,#8,#10. Cần chọn **ServiceRequest/ServiceRequestDetail làm nguồn-sự-thật** rồi hợp nhất. Việc lớn → qua `his-architecture-planner` + ghi `tech-debt-roadmap`.
15. **Tổng kết bệnh án nội trú không tự tổng hợp** (chỉ field text tay).
16. Nhiều nghiệp vụ nội trú còn STUB không lưu DB: nutrition, hội chẩn, truyền dịch/máu, ADR, sơ sinh, CheckTransferWarnings.
17. **Tạo billing thuốc không tự động** (`CreateBillingAfterDispensingAsync` gọi tay) → quên thì tiền thuốc không vào hoá đơn.

## Điểm ĐÚNG vững (không sửa)
Trục OPD: tiếp đón→gọi BN→khám→kê đơn→hoàn tất→bảng kê→quy trình ngược (gating BHYT + hủy hoàn tất/hủy in tốt). Trục nội trú xương sống: Admission→giường→tờ điều trị→kê đơn→**phiếu lĩnh trừ kho FEFO**→pre-discharge→discharge trả giường→**bảng kê 6556**. Dược nhánh chuẩn (WarehouseComplete + PharmacyApproval) trừ/hoàn kho đúng + audit. Thanh toán qua InvoiceId chặn vượt nợ; refund validate BHYT; tách BHYT/BN trả; BHYT XML 1-15; HĐĐT Issue/Export.

---

## PROMPT SỬA cho Claude Code (đối chiếu luồng TaiLieuDoiThu)

### Prompt FLOW-1 (P0 — sửa mạch gãy mất dữ liệu, làm trước)
```
Đọc .claude/SKILL-MAP.md (his-be-module-scaffold, his-qa-anti-pattern) + docs/workspace-docs/10-assessment/audit-luong-nghiepvu-2026-06-06.md. Đối chiếu luồng chuẩn trong TaiLieuDoiThu (MQ_-_Phòng_khám_-_Khám_bệnh.txt, MQ_-_Nội_trú_-_Bác_sĩ.txt, MQ_-_XN_-_Trả_kết_quả_XN.txt, MQ_-_Dược.txt, MQ-KTM-Thanh_toán...). Sửa 6 lỗi P0 (mất dữ liệu / mạch gãy):

1. KQ XN không về màn khám: viết lại GetPatientLabResultsAsync (ExaminationCompleteService.WaitingList.cs:237) đọc KQ từ ServiceRequestDetails (model 1 — nơi SampleReceive nhập KQ + nơi billing đọc) thay vì bảng LabResults (model 2). Đảm bảo OpdEditor "KQ XN·CĐHA" hiển thị đúng.
2. CLS tại giường (nội trú) phải lưu DB: InpatientCompleteService.OrdersReports.cs:294 CreateServiceOrderAsync — ghi ServiceRequest+ServiceRequestDetail y luồng OPD (ServiceOrders.cs), để nối lấy mẫu/LIS/RIS + viện phí. Đồng thời implement SearchServicesAsync/GetServiceTreeAsync/GetLabResultsAsync (đang stub rỗng).
3. Sinh hiệu nội trú phải lưu: Treatment.cs:299-356 CreateVitalSignsAsync/Update/GetList/GetChart — lưu DB thật (bảng VitalSigns hoặc tái dùng ObservationVital), không return stub.
4. Nhập viện OPD→tạo hồ sơ nội trú: RequestHospitalizationAsync (Conclusion.cs:125) gọi sang IInpatientCompleteService tạo Admission từ DepartmentId + link MedicalRecordId (hoặc thêm endpoint worklist "chờ nhập viện" lọc Examination ConclusionType=3 + HospitalizationDepartmentId, FE Inpatient Admit modal chọn từ list thay vì gõ tay Mã HSBA). Theo MQ: khám→nhập viện là 1 mạch.
5. Bảng kê viện phí gom đủ khoản: GetPatientBillingStatusAsync (BillingCompleteService.CashBook.cs:259) cộng thêm Σ thuốc chưa thu (Prescriptions PatientAmount) + vật tư + giường; CanDischarge (:303) phải chặn khi còn nợ bất kỳ khoản nào. Hợp nhất nguồn số liệu với CalculateInvoiceAsync.
6. Phát thuốc phải trừ kho: PharmacyController.CompleteDispensing (:435) + UpdateDispensedQuantity (:462) gọi IWarehouseCompleteService.DispenseOutpatientPrescriptionAsync (như cancel-dispensed đã làm); HospitalPharmacyService.CreateSaleAsync (:135) trừ tồn FEFO + tạo ExportReceipt trong transaction. Hoặc deprecate trang Pharmacy v1, ép DispensingCounter v2.

BUILD-GATE: dotnet build 0 error + npm run build EXIT 0. Migration idempotent nếu thêm bảng. Sau đó chạy Prompt 12 regression. KHÔNG commit/push.
```

### Prompt FLOW-2 (P1 — trạng thái + mạch phụ)
```
Đọc .claude/SKILL-MAP.md + audit-luong-nghiepvu-2026-06-06.md (P1). Đối chiếu TaiLieuDoiThu.
7. Trạng thái phiên khám: CreateServiceOrdersAsync (ServiceOrders.cs) set Examination.Status=2 (Chờ CLS); khi KQ CLS cuối về (lab/RIS completed) hoặc mở lại kết luận → 2→3→4. Dùng MedicalRecordStatus.CanTransition (đang định nghĩa nhưng không gọi). Hàng đợi phòng khám hiển thị badge đúng (Chờ CLS/Chờ kết luận).
8. Nối điều phối CĐHA (model 1) với RIS (model 4): khi dispatch/mark-performed (RadiologyDispatchController) tạo/ánh xạ RadiologyRequest từ ServiceRequestDetail + cập nhật SRD.Status.
9. CreateServiceOrdersAsync (OPD, ServiceOrders.cs:79) tạo ServiceRequestDetail cho mỗi dịch vụ (hiện chỉ tạo header).
10. Cancel-chain (LabCancelChainController) rollback đúng model 1 (ServiceRequestDetail) + cập nhật ServiceRequest.Status cha (hiện rollback model 2 LabRequestItem).
11. Admission.Status: thêm mã riêng "đã chuyển khoa" + "chờ ra viện" (hiện AdmitFromDepartment set =1 trùng "Đã xuất viện"); cập nhật GetAdmissionStatusName.
12. FEFO dispense gộp nhiều lô bằng AutoSelectBatchesAsync (StockOut.cs:17); tổng tồn không đủ → throw lỗi rõ, KHÔNG bỏ dòng âm thầm.
13. Sửa nút "Hủy phát" DispensingCounter.tsx:116 trỏ về POST /pharmacy/cancel-dispensed/{id} (đã có) hoặc thêm route issues/{id}/cancel map CancelStockIssueAsync.
BUILD-GATE + Prompt 12. KHÔNG commit/push.
```

### Prompt FLOW-3 (P2 — nợ kiến trúc, làm sau khi P0/P1 xanh)
```
Đọc .claude/SKILL-MAP.md (his-architecture-planner, his-tech-debt-workflow) + audit-luong-nghiepvu-2026-06-06.md (P2). Đây là việc lớn, lập plan trước khi code, ghi vào docs/workspace-docs/20-backlog/tech-debt-roadmap.md.
14. Hợp nhất 4 mô hình CLS (ServiceRequest/LabRequest/LabOrder/RadiologyRequest) về nguồn-sự-thật ServiceRequest/ServiceRequestDetail; đồng bộ hoặc loại bỏ 3 model còn lại. Migration cẩn thận, giữ dữ liệu.
15. Endpoint tổng kết bệnh án nội trú tự tổng hợp (DailyProgress + Prescriptions Type=2 + ServiceRequests + Surgery) thay field text tay.
16. Triển khai thật (hoặc đánh dấu rõ "chưa hỗ trợ" + ẩn UI) các nghiệp vụ nội trú đang stub: nutrition, hội chẩn, truyền dịch/máu, ADR, CheckTransferWarnings.
17. Tự động gọi CreateBillingAfterDispensingAsync ngay trong DispenseOutpatientPrescriptionAsync sau commit.
BUILD-GATE + Prompt 12. KHÔNG commit/push.
```
