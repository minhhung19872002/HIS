# Audit TẤT CẢ luồng còn lại + bảo mật — prompt gộp cuối · 2026-06-06

> Đã rà: 4 luồng lõi (xong) + 8 luồng phụ (FLOW-5) + ~20 module chuyên khoa/quản trị + cross-cutting (phân quyền, đa cơ sở). Dưới đây là MỌI gap còn lại gộp 1 prompt, xếp theo ưu tiên. **Phát hiện quan trọng nhất: 3 lỗi bảo mật.**

## 🔴 BẢO MẬT (P0 — patient-safety/privacy/pháp lý, làm TRƯỚC)
- **B1. CCHN không chặn khám server-side.** `CheckDoctorCertificationAsync` (`ExaminationCompleteService.NangCap18.cs:92`) chỉ là GET độc lập, KHÔNG gọi trong luồng lưu khám → BS hết hạn CCHN vẫn khám được (chỉ cảnh báo mềm). Vi phạm NangCap18.
- **B2. IDOR Cổng bệnh nhân.** `/api/portal/*` (`ExtendedWorkflowControllers.cs:828-992`) nhận `patientId` từ query param, KHÔNG từ JWT claim → user đăng nhập bất kỳ đổi patientId đọc được EMR/hóa đơn/đơn thuốc của BN khác. Code tự ghi chú rủi ro tại :929.
- **B3. RBAC quá lỏng cho hành động lâm sàng/pháp lý.** `DigitalSignatureController`, `CentralSigningController`, Discharge (InpatientComplete), EMR sửa/ký chỉ `[Authorize]` trơn → bất kỳ user đăng nhập (lễ tân/kế toán) đều ký số/xuất viện/sửa bệnh án được. (Program.cs:125 không có fallback RequireAuthenticatedUser → controller quên [Authorize] = mở toang.)

## 🟠 LUỒNG ĐỨT MẠCH / THẤT THU (P1)
- **F1. PTTT vật tư/thuốc/DV phòng mổ → viện phí (stub).** `SurgeryPrescriptionServiceImpl.cs:31-220`, `SurgeryOperationServiceImpl.cs:996-1162` (chỉ định DV hardcode "Viêm ruột thừa cấp"). Không vào viện phí. Lưu ý `StartSurgery/CompleteSurgery` (:61-73) nuốt lỗi schema im lặng.
- **F2. Dinh dưỡng — meal plan/cấp phát stub + bug GUID.** `ClinicalNutritionServiceImpl.cs`: `GenerateMealPlanAsync:185`, `MarkMealDeliveredAsync:186`, `GetMealPlansAsync:184` không SaveChanges; `GetDietTypesAsync:174` trả `Guid.NewGuid()` ngẫu nhiên mỗi lần → đặt suất ăn vỡ tham chiếu.
- **F3. Cấp cứu thường — UI mock.** `EmergencyDisaster.tsx:126,249` `buildEmergencySeed` không persist BE. Cần nối ReceptionComplete + ObservationStay thật.
- **F4. BHYT đối soát stub.** `InsuranceXmlService.cs:1647,1709` import KQ giám định + tính chênh lệch hardcoded.
- **F5. Booking check-in dead-end.** `BookingManagementService.cs:401` `CheckInBookingAsync` chỉ đổi Status=2, không tạo Reception/QueueTicket → BN "đã đến" nhưng không sinh lượt khám.

## 🟡 NỐI VIỆN PHÍ CHUYÊN KHOA + STUB PHỤ (P2)
- **F6. YHCT** đơn thuốc bắc không sinh viện phí + không trừ kho dược liệu + thiếu bốc/sắc (`TraditionalMedicineService.cs`).
- **F7. Phục hồi chức năng** buổi trị liệu không phát sinh phí (`RehabilitationServiceImpl.cs`).
- **F8. Telemedicine** `SendPrescriptionToPharmacyAsync:158` chỉ đổi status, đơn không sang quầy phát thật.
- **F9. Stub báo "thành công" nhưng không lưu**: Quality corrective actions (`QualityManagementServiceImpl.cs:68-69`), InfectionControl giám sát môi trường + kháng sinh (`InfectionControlServiceImpl.cs:209-213`), Portal refill/feedback/eKYC (`PatientPortalServiceImpl.cs:60,392,436`).
- **F10. Khảo sát hài lòng 2 hệ tách rời** (`SatisfactionSurvey` ở Quality vs `SatisfactionSurveyResult` ở Controller) + `responseRate=68.5` hardcode.

## ⚪ GHI NHẬN — KHÔNG làm bây giờ
- Đa cơ sở (multi-facility): entity lõi không có FacilityId, query không lọc theo cơ sở. An toàn vì deploy single-facility. Nếu sau này đa cơ sở → feature lớn (thêm FacilityId + global query filter) → ghi roadmap.
- Hội chẩn organizer hardcode GUID `9e5309dc...` (data-quality nhỏ, không gãy mạch).
- KQ XN cấu trúc per-parameter (đã có trong roadmap).

## Đã MẠCH LẠC (không đụng)
4 luồng lõi, Ngân hàng máu, Lưu trữ HSBA, ObservationStay, spine PTTT, MentalHealth/TbHiv/HIV/ChronicDisease/Methadone/IVF/Pathology/Microbiology/FunctionalDiagnostics, Báo cáo BV.

---

## ⭐ PROMPT GỘP (paste cho Claude Code — làm theo P0→P2)
```
Đọc .claude/SKILL-MAP.md (his-qa-anti-pattern, his-be-module-scaffold, his-db-migration, core-prod-change-discipline) + docs/workspace-docs/10-assessment/FLOW-FINAL-all-remaining-2026-06-06.md. Đối chiếu TaiLieuDoiThu khi liên quan (PTTT, tiếp đón). Sửa theo thứ tự P0→P2. Persist THẬT, nối viện phí, KHÔNG bịa field, KHÔNG commit/push. Mỗi nhóm xong → build sạch.

=== P0 BẢO MẬT (làm trước) ===
B1. Enforce CCHN: gọi CheckDoctorCertificationAsync trong luồng lưu/hoàn tất khám (ExaminationCompleteService) → nếu !IsValid thì chặn (trả lỗi rõ), không chỉ banner. Khớp NangCap18.
B2. IDOR portal: /api/portal/* (ExtendedWorkflowControllers.cs:828-992) lấy patientId từ JWT claim (hoặc kiểm account↔patient link) thay vì query param. Đảm bảo user chỉ xem được BN của mình.
B3. Siết RBAC: thêm [Authorize(Roles=...)] phù hợp cho DigitalSignatureController, CentralSigningController, Discharge (InpatientComplete), EMR sửa/ký. Cân nhắc fallback policy RequireAuthenticatedUser toàn cục ở Program.cs để controller quên [Authorize] không bị mở toang (rà kỹ AllowAnonymous công khai: AppointmentBooking, public-emr, queue-display — giữ nguyên + rate-limit).

=== P1 LUỒNG ĐỨT MẠCH / THẤT THU ===
F1. PTTT: SurgeryPrescriptionServiceImpl.cs:31-220 (thuốc/vật tư/đặt máu phòng mổ) persist thật + trừ kho + nối BillingComplete (phân đối tượng hao phí/thu phí/BHYT). SurgeryOperationServiceImpl.cs:996-1162 (chỉ định DV) nối Services/ServiceRequest thật, bỏ hardcode "Viêm ruột thừa cấp". Bỏ nuốt lỗi schema ở StartSurgery/CompleteSurgery (:61-73).
F2. Dinh dưỡng: ClinicalNutritionServiceImpl GetDietTypesAsync (:174) trả DietType từ DB (bỏ Guid.NewGuid ngẫu nhiên); GenerateMealPlan/MarkMealDelivered/GetMealPlans (:184-186) persist thật (bảng meal plan). Hoặc nếu chưa có nghiệp vụ → ẩn UI cấp phát suất ăn.
F3. Cấp cứu thường: EmergencyDisaster.tsx (126,249) bỏ buildEmergencySeed, đọc/ghi BE thật (ReceptionComplete tiếp nhận + ObservationStay phòng lưu + triage/disposition persist).
F4. BHYT đối soát: InsuranceXmlService.cs:1647,1709 import file KQ giám định cổng + tính chênh lệch thật (bỏ hardcoded).
F5. Booking check-in: CheckInBookingAsync (BookingManagementService.cs:401) tạo Reception/QueueTicket/lượt khám (nối quickRegisterByAppointment đã có) thay vì chỉ đổi Status.

=== P2 NỐI PHÍ CHUYÊN KHOA + DỌN STUB ===
F6. YHCT (TraditionalMedicineService): đơn thuốc bắc phát sinh ServiceRequest/Prescription → viện phí + trừ kho dược liệu; thêm bước bốc/sắc nếu nghiệp vụ cần.
F7. Rehabilitation: mỗi buổi trị liệu đẩy 1 dịch vụ tính phí (ServiceRequestDetail).
F8. Telemedicine SendPrescriptionToPharmacyAsync (:158): tạo record dược thật sang quầy phát (không chỉ đổi status).
F9. Hoàn tất stub persist: Quality corrective actions (:68-69), InfectionControl env/antibiotic (:209-213), Portal refill/feedback/eKYC (PatientPortalServiceImpl.cs:60,392,436) — persist thật hoặc ẩn UI.
F10. Thống nhất 2 hệ SatisfactionSurvey + bỏ hardcode responseRate=68.5.

=== Ghi roadmap (KHÔNG code bây giờ) ===
Đa cơ sở (FacilityId + global query filter); KQ XN per-parameter; hội chẩn organizer dùng current-user. Ghi vào docs/workspace-docs/20-backlog/tech-debt-roadmap.md.

BUILD-GATE: dotnet build 0 error + npm run build EXIT 0 + migration idempotent + đăng ký DI. Chạy Prompt 12 regression + kiểm tra riêng các luồng vừa sửa (đặc biệt B1/B2/B3 bằng test authz). Báo cáo từng mục. KHÔNG git commit/push trừ khi tôi nói "push".
```
