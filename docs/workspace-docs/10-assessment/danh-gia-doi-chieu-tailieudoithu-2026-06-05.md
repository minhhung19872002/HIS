# Đối chiếu chức năng HIS vs bộ tài liệu đối thủ `TaiLieuDoiThu/` + Plan bổ sung

> **Mục đích:** đối chiếu màn hình/chức năng trong 31 PDF HDSD của đối thủ (`C:\Source\HIS\TaiLieuDoiThu`:
> EMR ×3, HIS_LIS ×25, PACS_RIS ×7 — sản phẩm **MQSoft** HIS/LIS/EMR + **VRPACS V.2**) với chức năng
> hiện tại của ứng dụng, liệt kê thiếu sót và lập plan bổ sung FE+BE.
> **Ngày:** 2026-06-05. **Phương pháp:** extract text 31 PDF (PyPDF2 → `_extracted/*.txt`) → 5 agent
> đọc theo nhóm module + grep/Read code thật → main session verify lại các kết luận tranh chấp.
>
> **Quan hệ với bản cũ:** bộ tài liệu này **trùng ~100%** với `docs/TaiLieuChucNang` đã đối chiếu
> 2026-05-29 ([danh-gia-v2-doi-chieu-tailieuchucnang.md](../danh-gia-v2-doi-chieu-tailieuchucnang.md)).
> Bản này là **bản cập nhật**: (a) lần đầu đọc được full text 2 tài liệu trước đây không đọc được
> (`MQ - Nội trú - Bác sĩ` 36 trang, `HDSD_DesktopEMR` 105 trang/47 phiếu); (b) verify lại sau 2 commit
> đóng gap `59bc469` + `3ad220e`.

---

## 1. Kết luận chính

1. **Không thiếu module nào ở mức phân hệ** — 130 trang v2 phủ ≥14/15 phân hệ MQSoft và vượt xa về
   phạm vi (Telemedicine, YTCC, AI CĐHA, FHIR, cổng QG…). Kết luận bản 2026-05-29 vẫn đúng.
2. **5 cụm gap lớn của bản cũ ĐÃ ĐÓNG** (mục 2) nhờ commit `59bc469` + `3ad220e`.
3. Gap còn lại tập trung 3 dạng: **(a)** nghiệp vụ tại-chỗ trong luồng khám/điều trị mà MQSoft nhúng
   thẳng vào màn làm việc (PTTT F6, tủ trực F10, viết tắt F2, trả KQ XN tại giường, phiếu phòng mổ);
   **(b)** 4 backend stub tồn đọng (Key Image, Annotation, kết nối máy XN, vi sinh); **(c)** module
   quản trị làm mới (dược dự trù, payroll, số hóa HSBA giấy, công văn).
4. Tổng còn **~35 gap**, trong đó **~14 gap chỉ cần wire FE vì backend đã có sẵn** (rẻ, ưu tiên trước).

### Độ tin cậy
- Kết luận về **code HIS** = grep/Read trực tiếp (main session đã verify lại các điểm agent kết luận
  sai: `EmployeeProfile.tsx` có đủ 9 tab HR; viewer `MprViewer/MipMinIpViewer/MammoViewer` tồn tại;
  `VideoConsultation.tsx` Jitsi tồn tại → các mục này KHÔNG phải gap).
- Text extract từ PDF scan có chỗ mất chữ → mô tả chức năng đối thủ tin cậy mức "danh mục + luồng",
  không tới mức từng field.

---

## 2. Gap bản 2026-05-29 ĐÃ ĐÓNG (verify qua code + commit)

| Gap cũ | Nội dung | Bằng chứng đóng |
|---|---|---|
| B1.4 | Nội trú — nhập viện v2 chỉ vỏ | `59bc469` nhập viện theo giường (`Inpatient.tsx`) |
| B1.5 | Phiếu theo dõi điều trị 0 UI | `3ad220e` `inpatient/TreatmentMonitorSection.tsx` (933 dòng: sinh hiệu, truyền dịch, truyền máu, chuyển khoa, dinh dưỡng, hoàn trả) |
| B1.7 | Tiếp đón thiếu UI: cảnh báo BN, BHYT tạm, chụp ảnh, giữ giấy tờ, chỉ định CLS, lịch sử khám | `59bc469`+`3ad220e` `reception/VisitActionsModals.tsx` (783 dòng) + `PatientLookupModal` + `VisitDrawerBody` — agent verify từng modal ✅ |
| B1.1 (phần lớn) | CĐHA v2 không ký số/in giả | `3ad220e` `Radiology.tsx` +189 dòng: `SignResultModal` ký số + `printResultBlob` in thật. **Còn lại:** form nhập mô tả/kết luận đầy đủ theo mẫu (xem G-15) |
| B3.1 | Dược nhập kho NCC + kiểm kê + xuất chuyển kho 0 UI | `PharmacyStockIn.tsx`, `PharmacyStockIssue.tsx` (834 dòng, 4 loại xuất), `PharmacyStockTake.tsx` ✅ |

---

## 3. GAP CÒN LẠI — danh sách hợp nhất (đã verify)

> Ký hiệu: **[W]** = backend đã có, chỉ wire FE (rẻ) · **[S]** = backend stub phải làm thật ·
> **[N]** = làm mới FE+BE. Effort: S ≤ 1 ngày · M ≤ 1 tuần · L > 1 tuần.
>
> **Cập nhật 2026-06-05 (Phase 1 xong — xem mục 4):** ✅ đã đóng G-11 · G-12 · G-13 · G-14 · G-17 ·
> G-20 · G-24 · G-25; 🔵 phát hiện đã có sẵn: G-16 · G-26 · G-28 · G-29; 🚫 G-21 N/A (web auth theo user);
> ⏭ G-07 · G-08 chuyển sang Phase 3.

### 3.1 🔴 Nhóm A — Nội trú & Phòng mổ (nguồn mới: `MQ - Nội trú - Bác sĩ`, lần đầu đọc được)

| # | Gap | Loại | FE | BE | Effort |
|---|---|---|---|---|---|
| G-01 | **Trả KQ XN tại giường** (nhập giá trị + duyệt 2 bước có người duyệt + chỉ in sau duyệt) — tồn đọng B1.6, tài liệu đối thủ có quy trình riêng 4 trang | [N] | Form nhập KQ tại drawer BN nội trú + flow duyệt | Endpoint nhập/duyệt KQ tại giường (tái dùng LIS approve) | L |
| G-02 | **Phiếu hoàn trả thuốc y lệnh** (BS lập phiếu, lý do thừa/đổi/ngừng) — duyệt hoàn trả đã có (`pharmacyApproval`), phần lập phiếu từ tờ điều trị mới có một phần trong `TreatmentMonitorSection` | [W]🟡 | Hoàn thiện form lập phiếu hoàn trả từ tờ điều trị | Verify endpoint return đã đủ lý do/trạng thái | S–M |
| G-03 | **Y lệnh xuất tủ trực** (phân biệt phiếu lĩnh thường qui vs tủ trực cấp cứu, trạng thái phiếu) | [N] | Selector loại phiếu + trạng thái | Enum loại phiếu + filter | M |
| G-04 | **Phòng mổ — 4 phiếu nhập liệu trong luồng PTTT**: khám tiền mê, theo dõi gây mê, kế hoạch hồi tỉnh, cam đoan PTTT. Template IN đã có (`PreAnestheticExamPrint`, consent…) nhưng `Surgery.tsx` v2 **chưa có form nhập** (chỉ hiển thị `anesthesiaTypeName`) | [N] | 4 form modal gắn vào Surgery/Inpatient | 4 endpoint + bảng nếu chưa có | M–L |
| G-05 | **Tường trình PTTT + hình ảnh** (hình chính/phụ) trong phiếu PTTT | [N] | Editor + upload ảnh | Mở rộng SurgeryDto + file attach | M |
| G-06 | **Xuất thuốc/VTYT hao phí phòng mổ** (tủ trực phòng mổ, gói VTYT BHYT) | [N] | Form xuất gắn ca mổ | Endpoint xuất theo ca mổ | M |
| G-07 | **Toa được phát (đơn thuốc về)** phân loại riêng khi xuất viện | [W]🟡 | Flag + form riêng từ prescription | DTO phân loại | S |
| G-08 | Hủy nhiều CLS một lần (batch) trong tờ điều trị | [W] | Checkbox multi-select + nút hủy | Batch endpoint (hoặc loop) | S |

### 3.2 🔴 Nhóm B — Phòng khám OPD (nguồn: `MQ - Phòng khám - Khám bệnh` 57 trang)

| # | Gap | Loại | FE | BE | Effort |
|---|---|---|---|---|---|
| G-09 | **PTTT (F6) trong luồng khám OPD** — tường trình + hình + mẫu theo ICD; hiện Surgery là module rời, không gọi được từ `OpdEditor` | [N] | Tab/modal PTTT trong OpdEditor | Liên kết examinationId↔surgery; mẫu tường trình theo ICD | M |
| G-10 | **Xuất thuốc tủ trực (F10) tại OPD** | [N] | Nút/modal xuất tủ trực trong OpdEditor | Endpoint xuất tủ trực theo phòng khám | M |
| G-11 | **Viết tắt (F2) bung trong OPD v2** — `AbbreviationController` BE có, v2 chưa dùng | [W] | Input macro bung viết tắt ở ghi chú/chẩn đoán | — | S |
| G-12 | **Bệnh kèm theo / dị ứng / tiền sử (F11, F2)** nhập tại OpdEditor (check tương tác đã có, phần NHẬP hồ sơ dị ứng/tiền sử chưa nối UI) | [W] | Section nhập trong OpdEditor | — | S |
| G-13 | **Xem & in KQ XN/CĐHA tại phòng khám** | [W] | Tab KQ + preview + in trong OpdEditor | — | S |
| G-14 | **In bảng kê chi phí** — nút trong OpdEditor còn `message.success` giả; kèm **hủy in / hủy hoàn tất khám** | [W] | Gọi API in thật + 2 nút hủy | Verify `PrintBillAsync`/cancel | S |
| G-15 | **Sửa đối tượng thuốc/DV (BHYT↔thu phí) + sửa đối tượng BHYT BN** (B3.10 cũ) | [N] | Modal sửa đối tượng theo dòng | Endpoint đổi payment type cho CLS/thuốc | M |
| G-16 | **Đăng ký nhiều phòng khám 1 lượt** (BN thu phí) — `extraRooms[]` đã có trong code nhưng `NewVisitModal` chưa có UI | [W] | UI chọn phòng phụ trong NewVisitModal | Verify API multi-room | S |
| G-17 | **Sổ hội chẩn / trích biên bản hội chẩn tại OPD** — API có, chưa UI trong luồng khám | [W] | Nút hội chẩn trong OpdEditor (tái dùng Consultation) | — | S |

### 3.3 🔴 Nhóm C — Xét nghiệm LIS (nguồn: 5 file `MQ - XN`)

| # | Gap | Loại | FE | BE | Effort |
|---|---|---|---|---|---|
| G-18 | **Kết nối máy XN trả KQ tự động** ("Kết quả máy" + chuyển KQ về phiếu) — stub B2.3 tồn đọng (`SendWorklistToAnalyzerAsync`/`ReceiveResultFromAnalyzerAsync` trả Success=true/0) | [S] | Màn "KQ máy" + nút chuyển về phiếu | Driver HL7/ASTM thật + queue | L |
| G-19 | **Vi sinh — nhập định danh VSV + kháng sinh đồ S/I/R lưu thật** — stub B2.4 (`EnterCultureResult`/`EnterAntibioticSensitivity` `=> true`) | [S] | Verify form Microbiology wire đúng | Persist DB thay vì return true | M |
| G-20 | **Hủy duyệt dây chuyền** (hủy duyệt → hủy KQ → hủy nhận/lấy mẫu) — BE **đã có `LabCancelChainController`**, FE chưa wire đủ | [W] | Dialog 3 mức hủy trong Laboratory | — | S–M |
| G-21 | **Chọn người duyệt KQ** (đăng ký người có thẩm quyền duyệt trước khi duyệt) | [N] | Select approver trong flow duyệt | Field approver + validate quyền | S |
| G-22 | **Danh mục test item chi tiết**: dải tham chiếu/giá trị cảnh báo (critical value), đơn vị HL7, mã khoa/BS LIS (B3.11 cũ) | [N] | Tab "Chỉ số XN" trong LisCatalogAdmin | CRUD test-item + fields | M |
| G-23 | **Liên kết XN ↔ giá viện phí** (map test với dịch vụ thu phí) | [N] | Modal mapping | Endpoint mapping | M |
| G-24 | **Khai báo viết tắt KQ XN** (macro khi nhập KQ) | [W]🟡 | Tab viết tắt (tái dùng Abbreviation) | — | S |
| G-25 | **Xem HSBA BN từ màn trả KQ** | [W] | Nút mở EMR drawer | — | S |
| G-26 | **QC / Levey-Jennings** — verify nút `LabQC.tsx` đã wire `RunQCAsync`/`GetLeveyJenningsChartAsync` thật chưa (B1.3 cũ, agent báo có LJChart nhưng chưa chắc) | [W]❓ | Verify + wire nếu còn toast | — | S |

### 3.4 🟠 Nhóm D — Dược (nguồn: `MQ - Dược` 28 trang)

| # | Gap | Loại | FE | BE | Effort |
|---|---|---|---|---|---|
| G-27 | **Dự trù + duyệt cấp theo kho dự trù** (phiếu dự trù kho→kho, duyệt 2 cách, in phiếu xuất chuyển) | [N] | Trang/tab Dự trù + Duyệt dự trù | Entity + workflow dự trù | L |
| G-28 | **Duyệt bù tủ trực / duyệt hao phí khoa phòng / duyệt hoàn trả** — `PharmacyApproval` đã có duyệt cấp/bù 4-eyes; verify đủ 3 loại còn lại chưa, thiếu thì thêm tab | [W]🟡 | Thêm tab theo loại duyệt | Verify endpoint từng loại | M |
| G-29 | **In tem thuốc khi phát** (ngoại trú + đơn về) | [W]❓ | Verify DispensingCounter có in tem | Template tem | S |

### 3.5 🟠 Nhóm E — CĐHA / PACS (nguồn: 5 file `MQ - CĐHA` + 7 file VRPACS)

| # | Gap | Loại | FE | BE | Effort |
|---|---|---|---|---|---|
| G-30 | **Form trả KQ CĐHA v2 đầy đủ** (phần còn lại B1.1): nhập mô tả/kết luận theo **mẫu kết quả**, bung viết tắt, gọi BN, bắt đầu/hoàn thành ca | [W] | Mở rộng form Radiology.tsx (API có đủ) | — | M |
| G-31 | **Key Image: persist + crop + Send to HIS + duyệt + chọn mẫu in ảnh** — stub B2.1 (`MarkKeyImageAsync` không lưu, `GetKeyImagesAsync` rỗng); VRPACS có cả luồng tạo-in ảnh key | [S] | Nút mark/crop/save trong viewer + chọn mẫu in | Entity KeyImage + persist + print | L |
| G-32 | **Annotation persist** (arrow/ellipse/rect/text lưu DB) — stub B2.2 | [S] | Wire tool annotation viewer vào API | Entity ImageAnnotation + CRUD | M |
| G-33 | **Nhập sinh thiết (biopsy) + tường trình PTTT tại màn CĐHA** (B3.2 cũ; tài liệu có cả "Khai báo CĐHA nhập tường trình PTTT" map dịch vụ→PTTT) | [N] | Form sinh thiết/PTTT trong Radiology | Mapping dịch vụ CĐHA→PTTT + lưu tường trình | M |
| G-34 | **Danh mục RIS bổ sung**: số ảnh in/lưu tối đa, tên report, phân mẫu KQ cho máy chụp, ICD→auto mẫu KQ, "dược khoa phòng", "quầy thực hiện" (B3.11 cũ) | [N] | Field trong RisCatalogAdmin | CRUD mapping | M (gộp) |
| G-35 | **Đo lường viewer nâng cao**: ROI vùng (area/HU elip-chữ nhật-tự do), thể tích, **AvgMIP** (đã có Max/Min), clip 3D cắt trong/ngoài, in 3D (B3.9 cũ) | [N] | Cornerstone3D tools mở rộng | — | L |
| G-36 | Phân quyền đọc/duyệt **theo từng máy chụp** (per-modality) — hiện có 11 flag chụp/đọc chung | [N] | Matrix BS×máy trong RisAdmin | Permission per modality | M |

### 3.6 🟡 Nhóm F — EMR / Mobile / Quản trị (nguồn: `HDSD_DesktopEMR` 105 trang lần đầu đọc full + WebEMR + mobile)

| # | Gap | Loại | FE | BE | Effort |
|---|---|---|---|---|---|
| G-37 | **Đối chiếu 47 phiếu DesktopEMR vs 42 printType hiện có** → audit chỉ ra ~5 phiếu có thể thiếu (vd giấy KCB theo yêu cầu, phiếu khám chuyên khoa, phiếu phân loại BN cấp cứu ED, giấy cam kết 3 loại, phiếu khám thai 4 trang) — cần audit chi tiết rồi bổ sung từng phiếu | [N] | Audit + thêm print component thiếu | — | S audit + S/phiếu |
| G-38 | **Số hóa tài liệu giấy vào HSBA** (scan/upload → preview PDF → đính kèm → quản lý attachment) — B3.4 cũ, lõi "Website số hóa bệnh án" | [N] | Modal scan/upload + danh sách đính kèm trong EMR | Attachment API (mở rộng `saveAttachment`) + storage | L |
| G-39 | **Mobile xem FULL HSBA + in qua wifi** — B3.5 cũ; PatientPortal mobile mới xem tóm tắt/KQ | [N] | Tab HSBA đầy đủ + nút in | API getFullEMR cho mobile + PDF on demand | L |
| G-40 | **Lưu trữ HSBA: manual archive + xác thực tài liệu** (auto-archive đã có) | [W]🟡 | Nút "Lưu trữ ngay" + verify UI | Endpoint ArchiveNow | S–M |
| G-41 | **HR — payroll** (tính lương từ chấm công, bảng lương) — B3.6 cũ. *(Hồ sơ 9 tab ĐÃ ĐỦ — không phải gap)* | [N] | Trang bảng lương | Service tính lương | L |
| G-42 | **HR — quyết định nhân sự + biểu mẫu BHXH** (01A-TS, QĐ bổ nhiệm…) — B3.7 cũ | [N] | Module văn bản QĐ | Template + CRUD | L |
| G-43 | **TTB/VPP — nhập kho + phiếu xuất kho + thẻ kho** — duyệt cấp/phiếu lĩnh đã có (`OfficeSupplyApproval`); phần nhập kho TTB-VPP chưa thấy UI (cần verify sâu thêm) | [N]❓ | Form nhập kho + thẻ kho | Verify WarehouseComplete cover chưa | M |
| G-44 | **Công văn / văn thư** (đến/đi/mượn/trả) — B3.8 cũ, MQSoft xếp trong "QL chất lượng BV" | [N] | Module mới | Module mới | L |
| G-45 | **KTM — danh sách chờ theo trạng thái thanh toán QR** (chờ/đã TT/hết hạn) + xác nhận realtime sau khi BN quét | [W]🟡 | List theo trạng thái + auto refresh/SignalR | Filter API + (tùy chọn) push | M |

---

## 4. PLAN BỔ SUNG (roadmap đề xuất)

> Nguyên tắc giữ nguyên từ bản cũ: **hoàn thiện chiều sâu trước khi mở rộng** — ưu tiên [W] (wire FE,
> backend sẵn) → [S] (lấp stub) → [N] (làm mới). Mỗi item khi làm: theo `core-code-change-workflow`
> + build-gate FE/BE + cập nhật file này.

### Phase 1 — Wire nhanh, backend sẵn có — ✅ HOÀN THÀNH 2026-06-05 (build PASS)

| Thứ tự | Items | Kết quả 2026-06-05 |
|---|---|---|
| 1.1 | G-14 in bảng kê OPD + hủy hoàn tất | 🔵 **Đã có sẵn từ trước** (`printBill`/`cancelPrintBill`/`cancelCompletion` đã wire trong OpdEditor — agent báo sai). Phần còn thiếu thật = nút "In phiếu khám" giả → ✅ **đã wire** `printExaminationForm` (blob → tab mới) |
| 1.2 | G-11 viết tắt F2 OPD · G-24 viết tắt KQ XN | ✅ **Xong** — util mới `utils/abbrExpand.ts` (`useAbbrExpansion`, bung khi gõ code+space) áp vào bệnh sử/khám LS/kết luận/tiền sử OpdEditor; tab "Viết tắt KQ" (scope LAB) trong `LisCatalogAdmin` |
| 1.3 | G-12 tiền sử/dị ứng OPD · G-13 KQ CLS tại PK · G-17 hội chẩn OPD · G-25 HSBA từ LIS | ✅ **Xong** — OpdEditor: section "Tiền sử · Dị ứng" (3 field interview + chips dị ứng cấu trúc), modal "KQ XN · CĐHA" (`getPatientLabResults`), modal "Sổ hội chẩn" (list + tạo biên bản); Laboratory: nút "Hồ sơ BA" → `/v2/emr/edit?patientId=` (EmrEditor thêm hỗ trợ deep-link preselect) |
| 1.4 | G-16 đăng ký nhiều phòng · G-08 hủy nhiều CLS · G-07 toa được phát | 🔵 G-16 **đã có sẵn** (NewVisitModal có grid "Phòng khám thêm" + `registerMultipleRooms` — agent báo sai). ⏭ G-07/G-08 **defer Phase 3**: Inpatient v2 chưa có UI danh sách CLS theo BN để gắn batch-cancel — thuộc workflow tờ điều trị |
| 1.5 | G-20 hủy duyệt dây chuyền XN · G-21 chọn người duyệt | ✅ G-20 **xong** — `laboratory.ts` +3 hàm cancel-chain; Laboratory modal "Hủy ngược chuỗi" 3 mức (hủy duyệt / hủy KQ+nhận mẫu / hủy lấy mẫu) chạy tuần tự theo từng test item. 🚫 G-21 **N/A by design**: web app login theo từng user → người duyệt = user đăng nhập (có audit), khác desktop MQSoft dùng chung máy phải chọn người duyệt |
| 1.6 | G-26 QC/Levey-Jennings · G-29 in tem thuốc · G-28 3 loại duyệt dược | 🔵 **Cả 3 đã có sẵn, verify code thật**: LabQC wire `runQC`+`getLeveyJenningsChart`+Westgard; DispensingCounter có `printLabels` (tem + barcode); PharmacyApproval có đủ 5 loại duyệt (`APPROVAL_TYPE_LABELS` 1-5 gồm bù tủ trực/hao phí/hoàn trả) |

**File đã sửa (FE-only, build `npm run build` PASS):** `api/laboratory.ts` · `utils/abbrExpand.ts` (mới) ·
`pages-v2/OpdEditor.tsx` · `pages-v2/Laboratory.tsx` · `pages-v2/EmrEditor.tsx` · `pages-v2/LisCatalogAdmin.tsx`

### Phase 2 — Lấp stub dữ liệu lâm sàng — ✅ HOÀN THÀNH 2026-06-05 (build BE+FE PASS)
| Item | Kết quả |
|---|---|
| G-19 vi sinh persist | ✅ 3 entity `MicrobiologyCulture/OrganismFinding/AntibioticSensitivityResult` + migration **47** + `LISCompleteService.Microbiology.cs` (8 method persist thật) + 6 route v2 + FE đổi endpoint `/cultures/v2` |
| G-31+G-32 Key Image + Annotation | ✅ Entity `PacsKeyImage/PacsImageAnnotation` + migration **48** + 4 stub → persist thật (mark/unmark soft-delete, upsert annotation) + nút Key Image trong CornerstoneViewer/DicomViewer. ⏳ Deferred: auto-save annotation từ Cornerstone events + panel thumbnail ảnh key |
| G-30 form KQ CĐHA đầy đủ | ✅ Radiology.tsx: mẫu KQ by-service (đã có) + bung viết tắt local (`useAbbrExpansion` scope RADIOLOGY) + `CallPatientModal` gọi BN (endpoint verify thật) + start/complete ca |

### Phase 3 — Nghiệp vụ tại-chỗ — ✅ HOÀN THÀNH 2026-06-05 (build BE+FE PASS)
| Item | Kết quả |
|---|---|
| G-01 trả KQ XN tại giường | ✅ Endpoint mới `GET /LISComplete/orders/by-admission/{id}` + `BedLabResultSection.tsx` (nhập KQ + duyệt 2 bước + in chỉ sau duyệt) gắn vào TreatmentMonitorSection — tái dùng toàn bộ flow LIS enter/approve/print |
| G-09+G-33 PTTT F6 + sinh thiết CĐHA | ✅ Cột `SurgeryRequests.ExaminationId` (migration **50**) + component dùng chung `shared/SurgeryReportModal.tsx` gắn OpdEditor (nút PTTT F6) + Radiology (nút Tường trình PTTT). ⏳ Tường trình tạm pack `Notes` sentinel `[TUONGTRINH]/[KETLUAN]` — nên thêm cột riêng sau |
| G-10+G-03+G-06 xuất tủ trực ×3 | ✅ `StockIssueType=12` + `CreateCabinetIssueAsync` (reuse chuỗi xuất kho sẵn có) + cột `Warehouse.IsCabinet` (migration **51**) + `shared/CabinetIssueModal.tsx` gắn OpdEditor/TreatmentMonitorSection/Surgery |
| G-04+G-05 phiếu phòng mổ + hình | ✅ Migration **52** (SurgeryConsents, AnesthesiaRecords/Monitors/Drugs/Fluids + ImageUrls) + `shared/SurgeryFormModals.tsx` (3 modal: tiền mê+hồi tỉnh, theo dõi gây mê, cam đoan) + upload hình chính/phụ vào SurgeryReportModal |
| G-02+G-15+G-07+G-08 | ✅ 3 endpoint mới inpatient (list/cancel-bulk service-requests + đổi payment-type) + 3 modal trong TreatmentMonitorSection (Hoàn trả thuốc → flow duyệt type 5 · CLS multi-select hủy + sửa đối tượng · Toa được phát). ⏳ G-07 modal còn stub — cần medicine picker dùng chung (follow-up) |
| G-22+G-23+G-34 danh mục | ✅ Migration **49**: 6 cột test-item (HL7, TK nam/nữ, ServiceId…) + 3 cột modality (số ảnh in/lưu, template mặc định) + bảng `RisIcdTemplateMappings`; tab "Chỉ số XN" (LisCatalogAdmin) + tab "ICD → Mẫu KQ" (RisCatalogAdmin) |

### Phase 4 — Module mới / nâng cao — ✅ HOÀN THÀNH 2026-06-05 mức MVP (build BE+FE PASS)
| Item | Kết quả |
|---|---|
| G-27 dược dự trù | ✅ Reuse `PharmacyApproval` type=1: duyệt → tự sinh phiếu xuất chuyển kho (`LinkedExportReceiptId`, migration **53**) + modal lập phiếu dự trù + in phiếu xuất. ⏳ "Cách 2" (kho tự nhập) chưa làm |
| G-45+G-40 KTM + archive | ✅ BankPayments: auto-refresh 20s + markExpired wire; MedicalRecordArchive: sửa route đúng `/api/archives` + modal "Lưu trữ ngay" |
| G-18 kết nối máy XN | ✅ Skeleton MockMode: bảng `LabRawResults` (migration **54**) + ReceiveResult parse **HL7 ORU^R01 qua HL7Parser sẵn có** + auto-match barcode+testCode + page `AnalyzerInbox.tsx` (chuyển KQ về phiếu) + endpoint mock-receive (Admin) để test. ⏳ Driver socket/ASTM chờ máy thật |
| G-37 audit 47 phiếu | ✅ Audit: 42/47 ĐÃ CÓ từ trước (kể cả 6 phiếu PTTT mắt); bổ sung 5 phiếu: triage cấp cứu LS-04 + 4 giấy cam kết LS-05..08. ⏳ 7 tên phiếu XN phụ + 3 tờ gây mê còn lại cần xác nhận tên/DTO |
| G-38 số hóa HSBA | ✅ Endpoint upload multipart 20MB (JPG/PNG/PDF, chống path-traversal) + tab "Tài liệu đính kèm" trong EmrEditor (Dragger + phân loại 4 nhóm + xóa). ⚠️ Storage = filesystem theo pattern NonDicom — Cloud Run ephemeral, cần chuyển R2/GCS sau |
| G-39 mobile full HSBA | ✅ 3 endpoint portal (visits/visit-detail/export) + tab "HSBA" trong PatientPortalMobile (accordion lượt khám → chi tiết) + in `window.print()` @media print. ⚠️ Portal nhận patientId FromQuery theo pattern hiện hữu — cần siết khi BN tự đăng nhập |
| G-35+G-36 viewer + per-modality | ✅ 4 tool đo mới (EllipticalROI/RectangleROI/Bidirectional/PlanarFreehandROI — verify có trong cornerstone 3.33.5) + AvgMIP; phân quyền theo máy: cột `RadiologyPermission.ModalityId` (migration **55**) + check khi FinalApprove (backward-compat: chưa cấu hình = full quyền) + tab matrix trong RisAdmin. ⏳ In 3D vật lý/đo thể tích: lib không hỗ trợ — bỏ |
| G-41..G-44 4 module quản trị | ✅ MVP: Payroll (migration **56**, kỳ lương + generate + duyệt + CSV) · HrDecisions (**57**, 7 loại QĐ + in) · VppStockCard (reuse warehouse — thẻ kho/tồn) · OfficialDocuments (**58**, công văn đến/đi + KPI quá hạn) — 4 page v2 + route + menu + DI. ⏳ Payroll dùng Users làm proxy NV, hệ số lương nhập tay |

### Tổng kết thực thi 2026-06-05 (toàn bộ 4 phase trong 1 phiên)
- **12 migration mới 47→58** (idempotent, tự apply lúc startup qua `ProductionSchemaRepairRunner`)
- **104 file thay đổi** (~5.000 dòng thêm) · build cuối: BE `dotnet build` **0 errors** · FE `npm run build` **exit 0**
- **CHƯA commit/push** (chờ lệnh) · **CHƯA test runtime** — xem mục "Việc còn lại" dưới

### Việc còn lại sau phiên này (theo thứ tự khuyến nghị)
1. **Test runtime local** (docker DB + backend + FE dev): schema-drift = 0 sau startup; smoke từng luồng mới (danh sách lệnh test trong report từng agent — đặc biệt mock-receive máy XN, cabinet issue, bed lab result, key image)
2. Commit theo nhóm (P1/P2/P3/P4) → push → theo dõi GitHub Actions deploy BE → `GET /health/schema-drift`
3. Follow-up đã ghi: cột riêng cho tường trình PTTT (bỏ sentinel) · medicine picker cho toa được phát · annotation auto-save Cornerstone · storage attachment lên R2/GCS · siết auth portal BN
4. E2E test cho các luồng mới (`his-test-e2e`)

### Phase 3 — Nghiệp vụ tại-chỗ trong luồng khám/điều trị (~3–4 tuần)
| Thứ tự | Items | Ghi chú |
|---|---|---|
| 3.1 | G-01 trả KQ XN tại giường (nhập+duyệt+in) | tài liệu đối thủ nhấn mạnh, BV tuyến huyện hay dùng |
| 3.2 | G-09 PTTT F6 tại OPD + G-33 sinh thiết/PTTT tại CĐHA | chung nền mapping dịch vụ→PTTT |
| 3.3 | G-10 tủ trực F10 OPD + G-03 tủ trực nội trú + G-06 hao phí phòng mổ | chung nền "xuất tủ trực" |
| 3.4 | G-04 4 phiếu phòng mổ + G-05 tường trình PTTT + hình | template in đã có |
| 3.5 | G-02 hoàn thiện phiếu hoàn trả thuốc · G-15 sửa đối tượng thuốc/DV | |
| 3.6 | G-22 danh mục test item + G-23 link giá viện phí + G-34 danh mục RIS bổ sung | nhóm danh mục |

### Phase 4 — Module mới / nâng cao (theo nhu cầu bệnh viện, xếp sau)
| Items | Effort |
|---|---|
| G-27 dược dự trù + duyệt theo kho | L |
| G-18 kết nối máy XN (HL7/ASTM driver thật) | L — cần máy thật để test |
| G-38 số hóa HSBA giấy · G-39 mobile full HSBA + in wifi | L + L |
| G-37 audit + bổ sung ~5 phiếu in còn thiếu | S audit trước, quyết theo kết quả |
| G-35 đo lường viewer nâng cao · G-36 phân quyền per-modality | L + M |
| G-41 payroll · G-42 QĐ nhân sự/BHXH · G-44 công văn · G-43 nhập kho TTB-VPP · G-40 manual archive · G-45 KTM danh sách chờ QR | L·L·L·M·S·M |

### Ước lượng tổng
- Phase 1: **~1–1.5 tuần** (14 item nhỏ, đa số S)
- Phase 2: **~2 tuần** · Phase 3: **~3–4 tuần** · Phase 4: **~2–3 tháng** (chọn lọc theo nhu cầu)

---

## 5. Cross-ref
- Baseline: [`danh-gia-v2-doi-chieu-tailieuchucnang.md`](../danh-gia-v2-doi-chieu-tailieuchucnang.md) (2026-05-29)
  + bảng chi tiết [`danh-gia-v2-chi-tiet-theo-module.md`](../danh-gia-v2-chi-tiet-theo-module.md)
- Tech-debt coding-rule: [`rule-compliance-audit.md`](../rule-compliance-audit.md)
- Text extract nguồn: `TaiLieuDoiThu/**/_extracted/*.txt` (script tạm `TaiLieuDoiThu/extract_pdfs.py`, local-only)
- Skill liên quan: `his-flow-nangcap-package` (playbook đóng gap), `his-fe-page-v2`, `his-be-module-scaffold`, `his-db-migration`
