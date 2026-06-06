# Handoff — Triển khai bù gap đối thủ (Đợt 1) · 2026-06-06

> Liên quan: `docs/GAP-DoiThu-2026-06.md` (báo cáo gap), `docs/workspace-docs/10-assessment/prompts-doithu-gap.md` (prompt gốc).
> Người thực thi: phiên Cowork (không có dotnet/DB/browser trong sandbox).
> **Trạng thái:** Frontend đã verify `tsc --noEmit` EXIT 0. **Backend CHƯA build** (sandbox thiếu .NET) → cần Claude Code build + test trên máy Windows.
> **Chưa git add/commit/push** (theo quy ước (0c) SKILL-MAP).

## 1. Đã làm (8 hạng mục P1/P2)

| # | Hạng mục | Tầng | Verify |
|---|---|---|---|
| 1 | Nội trú: UI kê y lệnh thuốc có cấu trúc | FE | tsc OK |
| 2 | Nội trú: chỉ định CLS (tìm + cây danh mục) | FE | tsc OK |
| 3 | Nội trú: ra viện + tổng kết + in giấy | FE | tsc OK |
| 6 | Phòng khám: khối Xử trí (nhập/chuyển viện, hẹn tái khám) | FE | tsc OK |
| 9 | Phòng khám: toa nhà thuốc F5 + in | FE | tsc OK |
| 7 | Tiếp đón: CRUD cảnh báo BN trong drawer v2 | FE | tsc OK |
| 8 | Tiếp đón: wire đặt khám + tạo + picker từ lịch + **sửa đặt khám (BE)** | FS | FE tsc OK, BE chưa build |
| 4 | EMR: tra cứu HSBA công khai CCCD/QR | FS | FE tsc OK, BE chưa build |
| 5 | Thanh toán: HDDT tích hợp thật (config-driven) | BE | chưa build |

## 2. File MỚI (untracked)

Backend:
- `backend/src/HIS.API/Controllers/PublicEmrLookupController.cs`
- `backend/src/HIS.Application/DTOs/PublicEmr/PublicEmrDtos.cs`
- `backend/src/HIS.Application/Services/IPublicEmrLookupService.cs`
- `backend/src/HIS.Infrastructure/Services/PublicEmrLookupService.cs`
- `backend/src/HIS.Application/Services/IElectronicInvoiceProvider.cs`
- `backend/src/HIS.Infrastructure/Services/External/VnptEInvoiceProvider.cs`

Frontend:
- `frontend/src/pages-v2/inpatient/InpatientPrescriptionModal.tsx`
- `frontend/src/pages-v2/inpatient/InpatientServiceOrderCreateModal.tsx`
- `frontend/src/pages-v2/inpatient/DischargeModal.tsx`
- `frontend/src/pages-v2/reception/PatientFlagsSection.tsx`
- `frontend/src/pages-v2/reception/BookingPickerModal.tsx`
- `frontend/src/pages/PublicEmrLookup.tsx`
- `frontend/src/api/publicEmr.ts`

## 3. File SỬA (tracked)

Backend:
- `backend/src/HIS.Infrastructure/DependencyInjection.cs` — đăng ký `IPublicEmrLookupService`, `AddMemoryCache`, `AddHttpClient<IElectronicInvoiceProvider, VnptEInvoiceProvider>`
- `backend/src/HIS.Application/Services/IAppointmentBookingService.cs` — `UpdateBookingAsync` + `UpdateBookingDto` + `DepartmentId/DoctorId` vào `BookingStatusDto`
- `backend/src/HIS.Infrastructure/Services/BookingManagementService.cs` — impl `UpdateBookingAsync` + mapping ID
- `backend/src/HIS.Infrastructure/Services/AppointmentBookingService.cs` — mapping `DepartmentId/DoctorId`
- `backend/src/HIS.API/Controllers/BookingManagementController.cs` — `PUT /api/booking-management/bookings/{code}`
- `backend/src/HIS.Infrastructure/Services/Billing/BillingCompleteService.cs` — inject provider + logger (constructor +2 tham số)
- `backend/src/HIS.Infrastructure/Services/Billing/BillingCompleteService.ElectronicInvoices.cs` — thay Simulate bằng gọi provider + fallback
- `backend/src/HIS.API/appsettings.json` — section `EInvoice` (placeholder rỗng)

Frontend:
- `frontend/src/pages-v2/inpatient/TreatmentMonitorSection.tsx`
- `frontend/src/pages-v2/OpdEditor.tsx`, `frontend/src/pages-v2/PrescriptionEditor.tsx`
- `frontend/src/pages-v2/BookingManagement.tsx`
- `frontend/src/pages-v2/reception/VisitDrawerBody.tsx`, `frontend/src/pages-v2/reception/NewVisitModal.tsx`
- `frontend/src/App.tsx` (route public `/tra-cuu-benh-an`)
- `frontend/src/api/bookingManagement.ts`, `frontend/src/api/appointmentBooking.ts`

## 4. ⚠️ Lưu ý môi trường (đọc trước khi build)

1. **node_modules đã bị thay binary rollup sang Linux** để chạy vite trong sandbox → trên Windows phải chạy `npm install` lại trong `frontend/` trước khi `npm run build` (khôi phục binary Windows).
2. **EOL churn**: làm việc trong mount Linux khiến git hiển thị ~1780 file "đổi" do CRLF↔LF — KHÔNG phải đổi nội dung. Trên Windows `git status` chỉ hiện file sửa thật (mục 2+3). Nếu phiền: `git add --renormalize .` hoặc kiểm `.gitattributes`.
3. File rác `frontend/vite.config.ts.timestamp-*.mjs` (bị khoá, không xoá được từ sandbox) — xoá tay.
4. `.git/index.lock` có thể còn sót — xoá nếu git báo kẹt.
5. Một số file lớn được agent dựng lại phần đuôi có thể có **EOL hỗn hợp (CRLF+LF)** — build không ảnh hưởng; có thể normalize sau.

## 5. PROMPT cho Claude Code (build + test + fix)

```
Đọc .claude/SKILL-MAP.md (his-qa-anti-pattern, his-test-e2e, his-test-api-powershell, his-be-payment-gateway). Bối cảnh: docs/workspace-docs/90-archive/handoffs/session-2026-06-06-doithu-gap-impl.md liệt kê code vừa thêm cho 8 hạng mục bù gap đối thủ (Đợt 1). Frontend đã tsc sạch; BACKEND CHƯA build.

Nhiệm vụ:
1) cd frontend && npm install   (khôi phục binary rollup Windows) → npm run build  (PHẢI EXIT 0; sửa nếu lỗi).
2) cd backend && dotnet build HIS.sln  → PHẢI 0 error. Đặc biệt kiểm 3 phần mới: PublicEmrLookup (controller+service+DI+DTO), UpdateBooking (service+controller), EInvoice provider (IElectronicInvoiceProvider/VnptEInvoiceProvider + DI + BillingCompleteService). Sửa mọi lỗi compile (using/namespace/chữ ký/Guid↔String converter) — bám pattern file lân cận, KHÔNG bịa.
3) Chạy E2E: cd frontend && npx cypress run --spec "cypress/e2e/console-errors.cy.ts" --browser chrome (0 console error) → npx playwright test cho các trang đã đổi (Inpatient, OPD, Reception/BookingManagement, /tra-cuu-benh-an). Viết thêm E2E cho: kê y lệnh thuốc nội trú, chỉ định CLS, ra viện, xử trí nhập/chuyển viện, toa F5, cảnh báo BN, đặt khám (tạo/sửa/check-in), tra cứu CCCD công khai. Lỗi → fix tới khi sạch.
4) #5 HDDT: provider VnptEInvoiceProvider là KHUNG config-driven — phải khớp BuildPayload/ParseResponse với tài liệu API thật của NCP (VNPT/Viettel/Misa) và set credential qua ENV (EInvoice__Enabled=true, EInvoice__Vnpt__*). Khi chưa cấu hình thì fallback giữ hành vi cũ (không vỡ luồng thu ngân) — xác nhận điều này.
KHÔNG git commit/push trừ khi tôi nói "push".
```

## 6. Cần người dùng cung cấp để hoàn tất #5 (HDDT)
Nhà cung cấp HDDT (VNPT-Invoice / Viettel S-Invoice / MISA meInvoice…) + endpoint REST + tài khoản/mật khẩu dịch vụ + ký hiệu (Serial) + mẫu số (Pattern) + MST đơn vị + chứng thư số (nếu NCC yêu cầu). Đặt qua ENV, KHÔNG commit secret.
