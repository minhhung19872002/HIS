# Bàn giao phiên 2026-05-29 — việc đang dang dở

> Tổng hợp MỌI việc còn treo của phiên này để phiên sau / người khác tiếp nối không sót.
> Chi tiết nợ kỹ thuật + lịch: xem [`rule-compliance-audit.md`](./rule-compliance-audit.md).

---

## 1. ⚠️ CHỜ DEPLOY PROD (ưu tiên cao nhất)
6 thay đổi **BE đã push `origin/main` nhưng CHƯA deploy Cloud Run** (push không tự deploy BE — chỉ Vercel-FE tự deploy):
reception đăng ký BHYT BN mới · kê đơn `DoctorId ?? userId` · tạm ứng/thanh toán shadow-FK ·
inspector seed hash (migration 44) · **T2** BloodOrders (`46_blood_orders.sql`) · **D6** ILogger.
→ Lệnh deploy + commit từng cái: **mục G** trong `rule-compliance-audit.md`.

- [ ] **Deploy BE** (`gcloud builds submit` + `gcloud run services update his-api`).
- [ ] **Chạy `scripts/fix_prod_encoding.ps1`** qua Cloud SQL Auth Proxy (sửa mojibake vai trò/quyền — riêng, không qua deploy).
- [ ] **Test lại lần 2 trên prod** sau deploy: chuỗi nghiệp vụ + 5 fix; inspector `inspector/Inspector@123` login; blood order create.

## 2. Hạ tầng gcloud (máy D:\ — đang setup dở)
- gcloud **570.0.0 ĐÃ cài** tại `C:\Users\pc\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd`
  (PATH session cũ chưa có → dùng **terminal mới** hoặc full path). Project đã set `project-4d4a3f8e-d582-4536-97f`.
- [ ] **CHƯA auth** (`gcloud auth list` = no accounts). Cần user chạy (browser):
  `gcloud auth login` + `gcloud auth application-default login`.
- [ ] **cloud-sql-proxy CHƯA cài** — `gcloud components install cloud-sql-proxy` FAIL (Python non-interactive).
  Cho script encoding: **tải binary trực tiếp** (chưa làm).

## 3. Môi trường local
- Backend local **đang DỪNG** (stop để build). DB local đã: áp 5 fix BE, sửa hash inspector, tạo bảng `BloodOrders/BloodOrderItems`, có vài BN test `KIEMTHU*`.
- Chạy lại backend: `cd backend/src/HIS.API && DOTNET_ROLL_FORWARD=LatestMajor ASPNETCORE_ENVIRONMENT=Development dotnet run --launch-profile http --no-build`
  (máy **thiếu .NET 9 runtime** → bắt buộc roll-forward sang .NET 10).

## 4. Nợ kỹ thuật còn lại (rule-compliance-audit.md)
- ✅ **Xong phiên này**: 🟢 Dễ (D1 react-query · D2 hardcode BV · D3 stacktrace-compliant · D5 dead-CSS · D6 ILogger) + **T2** BloodOrders + **6 god-file FE đã tách** (EMRPrintTemplates, SpecialtyMedicalRecordPrint, SpecialtyEMRForms1/2, EmrManagementTabs, Reception) + gom CSS về `src/styles/`.
- 🟬 **T1 PARTIAL**: Deposit/Payment/Prescription shadow-FK đã fix; **blanket 13 entity (Fluent+ALTER) chưa** (blast-radius cao → đợt riêng evidence-driven).
- ⏳ **🟡 TB chưa**: T3 (exception filter NangCap24) · T4 (API envelope) · T5 (gỡ EF migrations) · T6 (controller mỏng 36) · T7 (button-debt 707 `<button>`→`<Btn>`) · T8 (4 page `client.*`→`api/`) · T9 (nuốt exception 9 service).
- ⏳ **🔴 KHÓ chưa**: K1 (god-file FE còn ~77, chủ yếu `pages/` v1: SystemAdmin 4311…) · K2 (god-service BE ~12: SystemCompleteService 7129…) · K3 (PopulateDataController, optional) · K5 (gap backend — 10 module thiếu write-API).
- ⏳ **Không-code**: D4 (quy ước nhánh Git — team adopt) · D7 (siết `:any` dần khi đụng file).

## 5. Lặt vặt / lưu ý
- **C5 Xuất viện**: chặn xuất viện đúng business-rule nhưng trả **HTTP 500 thay vì 400** (cosmetic, chưa fix).
- 5 fix BE + Reception split mới **verify LOCAL**, chưa verify PROD (chờ round-2 sau deploy).
- agy smoke test đầu phiên không xác nhận (timeout model free) — cơ chế `agy` vẫn dùng được qua full path.

## 6. Trạng thái git
- Branch `main` đã push hết (FE auto-deploy Vercel xong; BE chờ deploy thủ công). Working tree sạch (ngoài `.vscode/`).
