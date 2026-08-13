# NangCap27 — Đối chiếu HSMT Bệnh viện Tâm thần tỉnh Quảng Ngãi

**Nguồn:** `docs/requirements/20-yeu-cau-nang-cap/NangCap27.docx`
**Gói thầu:** Thuê phần mềm Quản lý bệnh viện năm 2026 — BV Tâm thần tỉnh Quảng Ngãi (chào hàng cạnh tranh, hợp đồng trọn gói 12 tháng).
**Ngày đối chiếu:** 2026-08-13 · **Phạm vi tài liệu:** 25 phân hệ / ~700 mục chức năng (bảng 1 + bảng 2 của Chương V).

---

## 1. Source manifest (theo `workflow/requirement-coverage.md` RULE 1)

| Nguồn | Vai trò | Trạng thái |
|---|---|---|
| `20-yeu-cau-nang-cap/NangCap27.docx` | HSMT gốc của gói thầu này | ✅ đọc trọn vẹn (40 đoạn văn + 2 bảng, trích bằng `python-docx`) |

Phạm vi task do người dùng chỉ định đúng 1 file → manifest đủ 100% ✅. Các gói NangCap01–26 nằm ngoài phạm vi lần này.

## 2. Kết luận tổng thể

Hệ thống **đã phủ tuyệt đại đa số** danh mục chức năng HSMT. Bằng chứng khảo sát:

- Backend: **207 controller** trong `backend/src/HIS.API/Controllers/`
- Frontend v2: **311 page/component** trong `frontend/src/modules/`
- Biểu mẫu in: **110+ template** đăng ký trong `frontend/src/modules/patient/components/PrintTemplateRenderer.tsx`
- Sổ/báo cáo: **17 loại register** trong `HospitalReportService.Part1-4` + bộ báo cáo BHYT (mẫu 79/80, biểu 19/20/21, 16–18/BHYT)
- Hàng đợi: 6 loại (`Queue.cs:14` — gồm cả nhà thuốc và thanh toán) + màn LCD công cộng `QueueDisplay.tsx`
- Danh mục dùng chung: `MasterCatalogController` có đủ cả những mục hiếm mà HSMT nêu — **giá xăng**, **mã máy / dịch vụ mã máy**, **hội đồng kiểm nhập**, **loại bệnh án**, **phụ thu**, **thu khác**, **cấp chăm sóc**

**Đã xác minh KHÔNG phải gap** (tránh build trùng — nguyên tắc REUSE-FIRST):

| Mục HSMT | Tưởng thiếu | Thực tế đã có |
|---|---|---|
| 13.1.13 Phiếu lĩnh và phát máu | grep tiếng Việt = 0 | `BloodBankCompleteController.Reports.cs:128` (`patients/{id}/blood-issue/print`) + `issue-receipts/{id}/print` |
| 5.28–5.29 Nhập bù thuốc/vật tư | grep "nhập bù" = 0 | `PharmacyApprovalController` loại phiếu **3 = Duyệt bù tủ trực** |
| 10.1.12 / 11.1.15 Tạo phiếu công khám | grep "công khám" = 0 | Chỉ định dịch vụ với `Service.ServiceType = 1 (Khám)` + `SystemCompleteController.Catalog.cs` DM khám bệnh |
| 7.6 Chuyển đối tượng bảo hiểm | grep = 0 | `ReassignObjectController` + `ReassignObjectDTOs` |
| 22.3 Khám mê | grep "khám mê" = 0 | `PreAnesthesiaModal.tsx` + printType `preanesthetic` |
| 5.34 Khóa danh sách kho | — | `WarehouseCompleteController` `warehouses/{id}/lock` + `batches/{id}/lock` |
| 17.3 Import Excel danh sách KSK | — | `health-checkup/campaigns/{id}/import` |

## 3. Gap đã đóng trong gói NangCap27

| # | Mục HSMT | Nội dung | Nơi triển khai |
|---|---|---|---|
| G1 | 4.1.8/4.1.30, 10.1.9/.11, 11.1.12/.14, 18.2.9/.11, 18.3.12/.14 | **Phiếu vận chuyển người bệnh** (lập / duyệt / hoàn thành / hủy / in). Trước đó chỉ có *danh mục* dịch vụ vận chuyển + giá xăng, chưa có phiếu phát sinh | `PatientTransportSlip` entity · `api/transport-slips` · `modules/patient/pages/TransportSlips.tsx` |
| G2 | 18.3.21 | **Phiếu theo dõi ôxy liệu pháp** | printType `oxygen-monitor` |
| G3 | 13.1.95, 13.1.96, 13.2.22 | **BB thanh lý** thuốc/hóa chất/VTYT + **BB xác nhận mất/hỏng/vỡ** | printType `pharmacy-disposal`, `pharmacy-damage` |
| G4 | 13.1.27, 13.1.29, 13.1.30 | **Phiếu XN huyết-tủy đồ / sinh thiết tủy xương / nước dịch** | printType `xn-myelogram`, `xn-bonemarrow`, `xn-bodyfluid` |
| G5 | 13.1.58, 13.1.59 | **Bệnh án phá thai** + **Bệnh án bệnh tay chân miệng** | printType `sp-phathai`, `sp-taychanmieng` |
| G6 | 13.2.7 | **Sổ duyệt kế hoạch phẫu thuật** | report code `SurgeryPlanApprovalRegister` |
| G7 | 13.2.10 | **Sổ tổng hợp thuốc hàng ngày** | report code `DailyMedicineSummaryRegister` |
| G8 | 17.1, 17.2 | **Danh mục công ty** + **Hợp đồng khám sức khỏe theo đoàn** | `CheckupCompany`/`CheckupContract` · `api/checkup-contracts` · `modules/checkup/pages/CheckupContracts.tsx` |

### Kèm theo (port v1 → v2 theo quyết định #204)
Màn EMR v2 trước đây **thiếu hẳn nhóm in Cận lâm sàng** (các printType `cdha-*`, `tdcn-*`, `xn-*` chỉ có menu ở v1 `pages/EMR.tsx`) → 3 phiếu XN mới của G4 sẽ không bấm tới được. Đã port cả nhóm (17 mục) vào `modules/emr/pages/EmrEditor.tsx`.

## 4. Quyết định thiết kế đáng lưu ý

**Snapshot giá trên phiếu vận chuyển.** Đơn giá dịch vụ, hệ số xăng, giá xăng/lít đều được **chốt tại thời điểm lập phiếu**. Danh mục điều chỉnh giá về sau không làm thay đổi phiếu đã lập.

**Loại nhiên liệu là bắt buộc về mặt nghiệp vụ.** Danh mục `GasolinePrices` chứa nhiều loại nhiên liệu **cùng một ngày hiệu lực** (RON 95-III 22 500 · E5 RON 92-II 21 500 · Diesel 20 800). Bản cài đầu tiên lấy "bản giá mới nhất" bằng `OrderByDescending(EffectiveFrom).First()` → SQL Server trả về **tùy ý** một trong ba dòng, nghĩa là cùng một chuyến xe có thể ra số tiền khác nhau giữa các lần lập phiếu. Lỗi này bị **smoke test bắt được** (kỳ vọng 67 500, thực tế 64 500) và đã sửa:

- `PatientTransportSlip.FuelType` — ghi rõ loại nhiên liệu, snapshot cùng giá
- `ResolveFuelPriceAsync` lọc theo đúng loại nhiên liệu; **không** đoán bừa khi danh mục có >1 loại mà người lập chưa chọn → tiền xăng = 0 và phiếu thể hiện rõ (thà để trống còn hơn tính sai tiền người bệnh)
- Form lập phiếu có ô chọn loại nhiên liệu, hiển thị kèm giá/lít

Công thức tiền (ghi rõ trong code + hiển thị tách dòng trên phiếu in):
- `CalculationType = 1` (theo km): `tiền DV = km × đơn giá`; `tiền xăng = km × hệ số (lít/km) × giá xăng`
- `CalculationType = 2` (theo lượt): `tiền DV = đơn giá`, không tính tiền xăng riêng

## 4b. ⚠️ Bug CSS in dùng chung — phát hiện khi soi bản in A4, đã sửa

Soi layout A4 của 8 mẫu mới bằng **PDF thật do Chromium dàn trang** (`page.pdf`, `preferCSSPageSize`)
rồi phân tích bằng PyMuPDF, thay vì chỉ nhìn ảnh chụp màn hình. Phát hiện 2 lỗi trong
`frontend/src/constants/printStyles.ts` — **áp cho TOÀN BỘ 110+ biểu mẫu**, có từ trước gói này:

| # | Lỗi | Bằng chứng đo được |
|---|---|---|
| 1 | **Tràn ngang, cắt mép phải.** `@page margin: 15mm 20mm` ⇒ vùng in ngang chỉ 170mm, nhưng `.emr-print-container` khai `width: 210mm` | Nội dung chạy tới x ≈ 659–680pt trên trang rộng 595pt ⇒ **mất ~23–30mm mép phải** (cột cuối bảng, cột chữ ký phải) |
| 2 | **Mất trang, im lặng.** `position: absolute` không ngắt trang được trong Chromium ⇒ mọi thứ quá trang 1 bị bỏ | `sp-phathai` ra **1 trang**, cụt từ mục VII — **mất hẳn mục VIII, IX, X và khối chữ ký**. Bản in trông vẫn "bình thường" nên nguy hiểm hơn lỗi 1 |

**Đã sửa** (giữ vùng in trong luồng bình thường để trình duyệt ngắt trang; ẩn phần app không liên quan
bằng `display:none`; vô hiệu hoá `overflow`/`transform`/`height` của tổ tiên; đặt bề rộng đúng 170mm).
Lưu ý phải khẳng định lại `visibility: visible` vì `ab-module.css` có block `@media print` riêng cho
`.print-paper` kèm `body * { visibility: hidden }` áp toàn app — bỏ qua thì bản in ra **trắng giấy**
(đã dính đúng bẫy này giữa chừng).

**Verify sau khi sửa** (12 PDF: 8 mẫu mới + 4 mẫu CŨ để bắt regression):

| Mẫu | Trước | Sau |
|---|---|---|
| tất cả | nội dung tới x=659–680pt (tràn) | x = [57, 539] — nằm gọn trong vùng in [57, 538] |
| `sp-phathai` | 1 trang, mất mục VIII/IX/X + chữ ký | **2 trang**, đủ mục I→X + chữ ký |
| `sp-taychanmieng` | 1 trang | **2 trang** |
| `ref-sp-tamthan` (BA Tâm thần — mẫu chính của BV này) | 1 trang | **3 trang**, kết đúng khối "TRƯỞNG KHOA / BÁC SĨ ĐIỀU TRỊ" |
| `ref-finalsummary` | 1 trang | **2 trang** |

> 🔴 **Cần người kiểm lại:** đây là thay đổi CSS dùng chung, đổi bản in của **mọi biểu mẫu** trong hệ
> thống (bản in nay hẹp hơn 40mm và ngắt trang thật). Đã verify tự động 12 mẫu; nên in thử vài mẫu
> hay dùng nhất trên máy in giấy trước khi bàn giao bệnh viện.

## 5. Kiểm thử

Smoke test API: `PASS = 38 / FAIL = 0` (script tạm, không commit). Phủ:
- CRUD + projection tên (bệnh nhân / khoa / dịch vụ / người duyệt) cho cả 2 nhóm chức năng
- Đúng công thức tiền: `ServiceAmount`, `FuelAmount`, `TotalAmount`, snapshot giá xăng + loại nhiên liệu
- Regression chống đoán bừa giá xăng khi không chọn loại nhiên liệu
- State machine phiếu vận chuyển: chặn complete-trước-approve, sửa/xóa phiếu đã duyệt, hủy phiếu đã hoàn thành
- Guard nghiệp vụ: thiếu nơi đi/đến, km âm, BN không tồn tại, trùng mã công ty, thiếu tên công ty, hiệu lực hợp đồng ngược, xóa công ty đang có hợp đồng, công ty không tồn tại
- 2 report code mới trả đúng `reportName` + summary keys

Smoke UI (Playwright, `frontend/e2e/nangcap27-smoke.spec.ts`): **2/2 pass** — `/v2/transport-slips` render + mở được form lập phiếu (có ô *Loại nhiên liệu*), `/v2/checkup-contracts` render + chuyển được tab Danh mục công ty; không có console error thật, không có response API ≥ 400.

> ⚠️ 2 test phải chạy **tuần tự** (`test.describe.configure({ mode: 'serial' })` + `--workers=1`): backend áp last-wins session (#384) nên 2 lần đăng nhập song song cùng tài khoản `admin` sẽ đá phiên của nhau. Lần chạy đầu fail đúng vì lý do này.

Build-gate: `dotnet build` 0 errors · `npm run build` exit 0.
Migration `163_nangcap27_transport_checkup.sql` chạy qua `ProductionSchemaRepairRunner` lúc startup, tạo đủ 3 bảng; cột `FuelType` bổ sung idempotent bằng nhánh `COL_LENGTH(...) IS NULL` nên bảng đã tạo trước đó vẫn nâng cấp được.

## 6. Chưa kiểm chứng / còn lại

- **Đơn giá dịch vụ vận chuyển = 0 sau seed** — có chủ ý (xem §3, giá do BV phê duyệt, không bịa số vào phiếu thu người bệnh). Bệnh viện **bắt buộc** vào *DM Tài chính* nhập đơn giá + hệ số xăng trước khi dùng; trước khi nhập, màn lập phiếu hiện cảnh báo "⚠ chưa có đơn giá" ngay ở ô chọn dịch vụ và cột Thành tiền.
- **Chưa in thử trên máy in giấy.** Đã verify bằng PDF A4 do Chromium dàn trang (12 mẫu, §4b) — nhưng sửa CSS in là dùng chung cho 110+ mẫu, nên in giấy vài mẫu hay dùng trước khi bàn giao.
- Nhóm print `cdha-*`/`tdcn-*` vừa port sang v2 mới verify ở mức build + wiring, chưa soi bản in.
