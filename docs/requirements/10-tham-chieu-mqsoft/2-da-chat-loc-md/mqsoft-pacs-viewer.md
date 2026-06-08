# VRPACS — DICOM Viewer
> Source: HDSD_VIEWER.pdf (21 pages)
> Extracted: 2026-06-01
> Vendor: Công ty Cổ phần Công nghệ C+ | contact@vrpacs.com | http://www.vrpacs.com

---

## Mục lục (Table of Contents)

### I. Các chức năng trong thể Viewer
1. Thay đổi kiểu bố trí thanh công cụ
2. Chỉnh độ sáng trên hình ảnh chụp (Window/Level)
3. Zoom hình ảnh đã chụp
4. Di chuyển ảnh chụp sang vị trí khác (Pan)
5. Cuộn ảnh (Scroll)
6. Đo khoảng cách trong ảnh đã chụp
7. Chức năng Đo MPR
   - 7.1 Commands Tools
   - 7.2 Syncs Tools
   - 7.3 Mesuares Tools
   - 7.4 HUs Tools
   - 7.5 Annotations Tools
   - 7.6 MIPs Tools
   - 7.7 Clips Tools
   - 7.8 Other tools
   - 7.9 Chức năng khác
8. Chức năng dựng 3D
   - 8.1 Rotate Tool
   - 8.2 Clip Tool
9. Annotation Tools và đánh dấu tổn thương
10. (missing in TOC — see section 11)
11. Chia sẻ ca chụp
12. Tạo phòng và tham dự phòng Hội chẩn
    - 12.1 Tạo phòng hội chẩn
13. Xem lịch sử hình ảnh

### II. Cấu hình cá nhân trong Pacs View & Phím tắt
14. Cấu hình cá nhân hóa
15. Tạo ảnh Key
16. Cấu hình thông tin hiển thị trên View

### III. Các tool công cụ hỗ trợ đọc ảnh trong phần Viewer
17. Các tool chính
    - 17.1 Layout
    - 17.2 Measurement Tool
    - 17.3 Advance Tools
    - 17.4 Image Tools
    - 17.5 Sync Tools
    - 17.6 MPR Tools
    - 17.7 Annotation Tools
    - 17.8 Capture Tools
    - 17.9 More Tools

---

## I. Các chức năng trong thể Viewer

### 1. Thay đổi kiểu bố trí thanh công cụ

- Khi mở ảnh bất kỳ 1 ca chụp nào lên thì hệ thống mặc định các thanh công cụ được xếp đọc ở bên trái để hỗ trợ cho bác sĩ, tuy nhiên người dùng có thể điều chỉnh lên trên theo ý thích của người dùng bằng cách thay đổi như sau:
  - Tích chọn dấu **v** vào mục trên để thay đổi kiểu bố trí thanh công cụ
- Các công cụ được chuyển lên phía trên của hệ thống (thanh toolbar ngang ở đầu viewer)

**Ghi chú:** Hệ thống hỗ trợ 2 layout thanh công cụ:
- Layout dọc (bên trái màn hình) — mặc định
- Layout ngang (phía trên) — sau khi tick chọn

---

### 2. Chỉnh độ sáng trên hình ảnh chụp (Window/Level — WW/WL)

- Chọn công cụ chỉnh độ sáng, sau đó giữ trái chuột đưa từ phía dưới lên trên để **tăng độ sáng** cho hình ảnh chụp
- Đưa từ trên xuống dưới (ngược lại) để **giảm độ sáng** hình ảnh chụp
- Hướng kéo:
  - Trái → phải: thay đổi Window Width (WW)
  - Trên → dưới: thay đổi Window Level (WC/WL)

**Mặc định chuột:**
- Chuột trái: xoay và di chuyển khung hình
- Chuột phải: chỉnh Window/Level (WW/WL)
- Con lăn (scroll): di chuyển ảnh (scroll qua các slice)

---

### 3. Zoom hình ảnh đã chụp

- Chọn công cụ Zoom hình ảnh (kính lúp)
- Sau đó giữ trái chuột:
  - Đưa từ phía dưới lên trên: **phóng to** hình ảnh chụp
  - Đưa từ trên xuống dưới (ngược lại): **thu nhỏ** hình ảnh chụp

---

### 4. Di chuyển ảnh chụp sang vị trí khác (Pan)

- Chọn công cụ di chuyển ảnh (Pan)
- Sau đó giữ trái chuột vào hình ảnh chụp
- Di chuyển đến vị trí tùy ý

---

### 5. Cuộn ảnh (Scroll)

- Chọn công cụ cuộn ảnh
- Sau đó giữ trái chuột vào hình ảnh đã chụp
- Kéo lên trên để **cuộn ảnh lên trên** (next slice)
- Kéo xuống dưới để **cuộn ảnh xuống dưới** (previous slice)

**Lưu ý:** Áp dụng với những ảnh chụp có nhiều ảnh (multiframe / multi-slice series)

---

### 6. Đo khoảng cách trong ảnh đã chụp (Distance Measurement)

- Chọn công cụ thước đo
- Sau đó giữ trái chuột vào vị trí cần đo
- Kéo thả để đo được khoảng cách cần đo
- Kết quả đo hiển thị trực tiếp trên ảnh (đơn vị: mm)

---

### 7. Chức năng Đo MPR (Multi-Planar Reconstruction)

**Yêu cầu:** Để dựng được MPR thì tập ảnh phải có tối thiểu **20 ảnh trở lên**

- Chọn ảnh cần dựng MPR
- Lưu ý: tập ảnh phải có tối thiểu 20 ảnh trở lên
- Sau đó chọn công cụ Đo MPR

**Cơ chế hoạt động của các công cụ là:**
- `click + drag chuột` (mặc định: Chuột trái là xoay và di chuyển khung hình)
- Chuột phải là chỉnh Window/Level
- Con lăn là di chuyển ảnh (scroll)

**Ghi chú bổ sung:** Các công cụ, chức năng đo MPR có thể thay đổi các series ảnh trong phần thanh series bên trái

#### 7.1 Commands Tools

| Icon | Chức năng |
|------|-----------|
| — | Chọn chuột (Select/Default tool) |
| — | Chỉnh độ sáng tối (WW/WL) |
| — | Cuộn ảnh (Scroll) |
| — | Zoom ảnh |
| — | Di chuyển ảnh (Pan) |
| — | Chế độ ảnh 3D |
| — | Chụp ảnh (Capture/Screenshot) |

#### 7.2 Syncs Tools

| Icon | Chức năng |
|------|-----------|
| — | Lật ngược sáng (Invert) |
| — | Đồng bộ sáng tối (Sync WW/WL) |
| — | Đồng bộ Zoom |
| — | Đồng bộ Mip |

#### 7.3 Mesuares Tools (Measurement Tools)

| Icon | Chức năng |
|------|-----------|
| — | Thước đo (Distance) |
| — | Thước đo vùng tùy chọn (Free ROI measurement) |

#### 7.4 HUs Tools (Hounsfield Unit Tools)

| Icon | Chức năng |
|------|-----------|
| — | Thước đo tỉ trọng điểm (Point HU measurement) |
| — | Thước đo vùng theo hình nhất định (ROI HU — preset shape) |
| — | Thước đo vùng theo hình nhất định (ROI HU — preset shape, variant) |
| — | Thước đo vùng tùy chọn (Free ROI HU) |

#### 7.5 Annotations Tools

| Icon | Chức năng |
|------|-----------|
| — | Arrow tool (mũi tên) |
| — | Arrow text tool (mũi tên + văn bản) |
| — | Elipse text tool (ellipse + văn bản) |
| — | Rectangle text (hình chữ nhật + văn bản) |

#### 7.6 MIPs Tools (Maximum Intensity Projection)

| Icon | Chức năng |
|------|-----------|
| MAX | MaxMip Tools (Maximum Intensity Projection) |
| MIN | MinMip Tools (Minimum Intensity Projection) |
| AVG | AvgMip Tools (Average Intensity Projection) |
| — | Reset Mip (đặt lại MIP) |

#### 7.7 Clips Tools

| Icon | Chức năng |
|------|-----------|
| — | Cut tool (công cụ cắt) |
| — | Reset cut tool (đặt lại cắt) |

**2 loại Cut tool:**
1. Cắt tự do (Free cut)
2. Cắt theo hình (Shape cut)

**2 kiểu cắt trong:**
1. Cắt trong — cắt ngoài
2. Xoá vùng đã khoánh (erase ROI)

#### 7.8 Other tools

| Icon | Chức năng |
|------|-----------|
| — | Tạo series ảnh (Create series) |
| — | Tool setting (Cài đặt công cụ) |
| — | Reset camera (Đặt lại camera) |
| — | Reset org camera (Đặt lại camera gốc) |
| — | Reset all (Đặt lại tất cả) |

#### 7.9 Chức năng khác

| Icon | Chức năng |
|------|-----------|
| — | Reset tool (slider/thanh trượt reset) |

---

### 8. Chức năng dựng 3D (3D Volume Rendering)

**Yêu cầu:** Để dựng được 3D thì tập ảnh phải có tối thiểu **20 ảnh trở lên**

- Chọn ảnh cần dựng 3D
- Sau đó chọn công cụ dựng 3D

**Cơ chế hoạt động của các công cụ là:**
- `click + drag chuột` (mặc định: Chuột trái là xoay, Chuột phải là WW/WC, con lăn là di chuyển)

**Ghi chú:** Các công cụ, chức năng trong dựng 3D:
- Toolbar 3D riêng biệt với các công cụ chuyên biệt

#### 8.1 Rotate Tool (Công cụ xoay — 6 mặt)

| Phím | Mặt |
|------|-----|
| 1 | Mặt trên (Superior/Top) |
| 2 | Mặt trước (Anterior/Front) |
| 3 | Mặt phải (Right) |
| 4 | Mặt trái (Left) |
| 5 | Mặt sau (Posterior/Back) |
| 6 | Mặt dưới (Inferior/Bottom) |

Bố cục nút trong **Rotate Tool** panel:
```
A   P
R   L
F   H
```
- A = Anterior (Trước)
- P = Posterior (Sau)
- R = Right (Phải)
- L = Left (Trái)
- F = Front (Mặt trước)
- H = Head (Đầu / Superior)

#### 8.2 Clip Tool (Công cụ cắt 3D)

| Số | Chức năng |
|----|-----------|
| 1 | Cắt hình elip (Ellipse clip) |
| 2 | Cắt hình chữ nhật (Rectangle clip) |
| 3 | Cắt hình đa giác (Polygon clip) |
| 5 | Reset cut tool (Đặt lại cắt) |

#### 8.3 Advance Tool (Công cụ nâng cao 3D)

| Số | Chức năng |
|----|-----------|
| 1 | Thước đo (Distance measurement) |
| 2 | Manifer 3D (3D Manifold/surface rendering) |
| 3 | In 3D (Print 3D) |

#### 8.4 Các tool khác trong 3D

| Icon | Tên công cụ |
|------|-------------|
| — | Default tool |
| — | WWC tool (Window/Width/Center) |
| — | Zoom tool |
| — | Rotate tool |
| — | Pan tool |
| — | Endoscopy tool (Tool nội soi ảo — Virtual Endoscopy) |
| — | Elipse annotation tool |
| — | Rectangle annotation tool |
| — | Arrow annotation tool |
| — | Arrow text annotation tool |
| — | Reset WWC tool |
| — | Clear annotation (Xóa annotation) |
| — | Reset all tool |

---

### 9. Annotation Tools và đánh dấu tổn thương

- Chọn ảnh cần đánh dấu
- Chọn công cụ chỉ dẫn, sau đó chọn vị trí cần chỉ dẫn
- Kéo thả vào trong ảnh để chọn vị trí, chọn phải chuột để quay lại thao tác trước đó
- Có thể xoay hướng tùy ý bằng cách kéo thả

**Annotation types:**

| Icon | Tên |
|------|-----|
| — | Text Annotation (Chú thích văn bản) |
| — | Arrow (Mũi tên) |
| — | Text Maker Imager (Văn bản có marker) |
| — | AI labeling (Nhãn AI) |

---

### 11. Chia sẻ ca chụp

#### Chia sẻ ca chụp trong cùng hệ thống mạng hoặc ngoại mạng

- Chọn chức năng chia sẻ ca chụp
- Có thể đặt mật khẩu hoặc không có mật khẩu
- Thời gian khi chia sẻ sẽ ngay tức thì hoặc có thể chọn thời gian tùy chọn
- Có thể ẩn hiện thông tin bệnh nhân cần chia sẻ

**Tùy chọn chia sẻ:**

| Tùy chọn | Giá trị |
|----------|---------|
| Time out (day) | 1 (có thể thay đổi) |
| Encode patient | Checkbox — ẩn thông tin bệnh nhân |
| Password | Tùy chọn bảo vệ bằng mật khẩu |
| Thời hạn | 30m / 1h / 1 day / 1 week |

**Nút Share:** Xác nhận chia sẻ

- Có thể chia sẻ bằng cách **gửi mã QR** hoặc **sao chép đường link** gửi cho người được chia sẻ
- Link chia sẻ dạng: `https://telerad.vrc555/...`
- Có nút **Copy** để sao chép link

---

### 12. Tạo phòng và tham dự phòng Hội chẩn (Teleconference / MDT Room)

#### 12.1 Tạo phòng hội chẩn

1. Chọn bệnh nhân cần hội chẩn
2. Sau đó mở ảnh của bệnh nhân (BN)
3. Chọn chức năng tạo phòng hội chẩn như là chủ phòng cần mời mọi người tham gia hội chẩn
4. **Kiểm tra kết nối của camera và micro** trước khi tạo phòng
5. Nhấn nút xác nhận để tạo phòng hội chẩn

**Giao diện hội chẩn:**
- Panel hiển thị ảnh DICOM đầy đủ bên trái
- Panel video conferencing bên phải (webcam, avatar người tham gia)
- Có thể chia sẻ ảnh DICOM realtime với người tham gia

---

### 13. Xem lịch sử hình ảnh (Image History)

**Mục History:**

- Chọn mục "All" sẽ hiển thị tất cả ảnh của các máy đã được chọn xem, các series ảnh của chỉ định sẽ đổ ra danh sách series

**Bố cục panel History:**
- Dropdown chọn loại: All / specific modality
- Hiển thị: danh sách ca chụp theo thời gian (VD: `07:40:29`)
- Layout buttons: `1x1` | `1x2` | `2x1`

**Các nút chức năng trong History:**

| Icon | Chức năng |
|------|-----------|
| — (refresh) | Làm mới danh sách lịch sử ca chụp của bệnh nhân |
| — (sync) | Gửi lại Server |
| — (add) | Thêm bệnh nhân để có thể so sánh 2 bệnh án với nhau |

---

## II. Cấu hình cá nhân trong Pacs View & Phím tắt

### 14. Cấu hình cá nhân hóa

- Chọn **More** (menu mở rộng)
- Chọn **User config**

**Keyboard Shortcuts (Phím tắt):**
- Có thể tùy chỉnh các phím tắt mong muốn theo cá nhân
- Sau đó Save để lưu, Reset để trở về cài đặt mặc định, Cancel để thoát

**Window/Level Presets:**
- Có thể tùy chỉnh các phím tắt từ `F1 → F10`
- Sau đó Save để lưu, Reset để trở về cài đặt mặc định, Cancel để thoát

**Layout:**
- Tùy chỉnh hiển thị layout với các dịch vụ khác nhau

**Tools:**
- Tùy chỉnh ẩn/hiện các tool công cụ trong phần viewer

---

### 15. Tạo ảnh Key (Key Image)

- Chọn vào ảnh muốn chọn làm ảnh Key
- Sau đó chọn biểu tượng **Key Image** để tạo ảnh key
- Chọn nút **Crop** để chụp ảnh
- Quy trình: Chọn ảnh Key → Chọn tỷ lệ crop → Click nút chụp ảnh

**Lưu ảnh Key:**
- Ảnh sẽ được lưu vào mục **Capture Images**
- Có thể chọn: **All** hoặc **Server image** hoặc **Local Image**
- Có thể chọn: **Xoá ảnh**, **Save vào local**, hoặc **save all key images to hard drive**

---

### 16. Cấu hình thông tin hiển thị trên View (Overlay Configuration)

**Bước 1:** Chọn vào ảnh của bệnh nhân

**Bước 2:** Chọn vào biểu tượng **Settings** (bánh răng) để tùy chỉnh thông tin

**Giao diện cấu hình Overlay:**
- Hiển thị 6 vùng thông tin trên ảnh DICOM (các góc và cạnh):
  - Mục 1, 2, 3, 4: Các thông tin đã được đặt mặc định sẽ hiển thị trên ảnh của bệnh nhân
  - Mục 5: Các thông tin khác (Bổ sung nếu cần). BS có thể tùy chỉnh bằng cách giữ trái chuột kéo thả vào màn hình
  - Mục 6 — nút **Reset Overlay**: Để trở về cài đặt mặc định
  - Nút **Save**: Để lưu lại các thông tin đã thay đổi tùy chỉnh
  - Nút **Close**: Để đóng

**Thông tin overlay tiêu biểu hiển thị:**
- Thông tin bệnh nhân (Patient Name, ID, DOB, Sex)
- Thông tin ca chụp (Study Date, Modality, Series, Instance)
- Window/Level hiện tại (WW/WL values)
- Tọa độ voxel, giá trị HU tại con trỏ
- Institution name
- Manufacturer, Model

---

## III. Các tool công cụ hỗ trợ đọc ảnh trong phần Viewer

### 17. Các tool chính (Main Toolbar)

Toolbar dọc bên trái gồm các nhóm tool xếp theo section:

```
Layout
Measurement Tools
Advance Tools
Image Tools
Sync Tools
MPR Tools
Annotation Tools
Capture Tools
More Tools
```

---

### 17.1 Layout

| Icon | Bố cục |
|------|--------|
| `1x1` | 1 viewport × 1 (single view) |
| `1x2` | 1 hàng × 2 cột |
| `2x1` | 2 hàng × 1 cột |
| Grid icon | Tùy chỉnh layout (Custom layout) |

---

### 17.2 Measurement Tool (Công cụ đo lường)

| Icon | Chức năng |
|------|-----------|
| Thước thẳng | Thước đo (Distance — mm) |
| Caliper | Thước caliper dành cho ảnh không có giá trị (Distance without calibration) |
| Tâm điểm | Thước đo tỉ trọng điểm (Point HU value) |
| Góc | Thước đo góc (Angle measurement) |
| Góc 2 vector | Thước đo góc ở dạng góc giữa 2 vector (Cobb angle / 2-vector angle) |
| ROI hình nhất định | Thước đo vùng theo hình nhất định (Preset shape ROI) |
| ROI hình nhất định 2 | Thước đo vùng theo hình nhất định (variant) |
| ROI tùy chọn | Thước đo vùng tùy chọn (Free-hand ROI) |
| Sao chép | Sao chép thước đo (Copy measurement) |

---

### 17.3 Advance Tools (Công cụ nâng cao)

| Icon | Chức năng |
|------|-----------|
| Tool đo mạch | Tool đo mạch (Vessel measurement) |
| Tool so sánh | Tool đo so sánh thể tích 2 bản cầu (Bi-hemispheric volume comparison) |
| Tool hình trụ | Tool đo thể tích hình trụ (Cylindrical volume) |
| Tool vùng động mạch | Tool đo so vùng vận động mạch (Arterial motion analysis) |
| Tool thể tích | Tool đo thể tích (Volume measurement) |
| Tool tỷ lệ | Tool đo tỷ lệ tim/lồng ngực (Cardiothoracic ratio — CTR) |
| Tool Mammo | Tool Mamography (Mammography specialized tools) |
| Tool HU tự động | Tool tự động phân ngưỡng theo HU (Auto HU threshold segmentation) |

---

### 17.4 Image Tools (Công cụ hình ảnh)

| Icon | Chức năng |
|------|-----------|
| Xoay trái | Xoay trái 90 độ |
| Xoay phải | Xoay phải 90 độ |
| Lật trên/dưới | Lật trên / dưới (Flip Vertical) |
| Lật trái/phải | Lật trái / phải (Flip Horizontal) |
| Xoay tự do | Xoay tự do (Free rotate) |
| Lật ngược sáng | Lật ngược sáng (Invert grayscale) |
| Tool phóng đại | Tool phóng đại (Magnifier/Lens) |
| Tool HU filter | Tool HU filter (HU value filtering) |

**Mammo-specific tools:**
- Đồng bộ Zoom (Zoom synchronization)
- Đồng bộ sáng tối (WW/WL synchronization)
- Dựng ảnh CC (CC view — Craniocaudal)
- Dựng ảnh MLO (MLO view — Mediolateral Oblique)
- Dựng ảnh CC/MLO (Combined CC/MLO)
- Chỉnh độ sáng tối (Manual WW/WL)
- Zoom ảnh
- Phóng to ảnh (Enlarge)
- Lật ngược sáng (Invert)

**Lưu ý:** Ảnh được dùng tool mamo vú (Mammography tools applied)

---

### 17.5 Sync Tools (Công cụ đồng bộ)

| Icon | Chức năng |
|------|-----------|
| Auto Sync | Auto Synchronize Scrolling (Tự động đồng bộ cuộn) |
| Reference Line | Reference line (Đường tham chiếu giữa các viewport) |
| Crosshair 3D | Crosshair 3D (Con trỏ chéo 3D giữa các mặt phẳng MPR) |
| Zoom/Pan Sync | Zoom/Pan Synchronize (Đồng bộ zoom và pan) |
| WW/WL Sync | WW/WL Synchronize (Đồng bộ window/level) |
| Manual Sync | Manually Synchronize Scrolling (Đồng bộ cuộn thủ công) |

---

### 17.6 MPR Tools (Multi-Planar Reconstruction Tools)

| Icon | Chức năng |
|------|-----------|
| Axial (A) | Dựng Axial (Mặt phẳng ngang — Transverse) |
| Coronal (C) | Dựng Coronal (Mặt phẳng trán) |
| Sagittal (S) | Dựng Sagittal (Mặt phẳng dọc) |
| Mip | Mip (Maximum Intensity Projection) |
| 3D MPR | Dựng 3D MPR view (Full 3D MPR view) |
| Compare patients | Compare patients on MPR (So sánh bệnh nhân trên MPR) |
| MRP curved | MRP curved (Curved MPR — cắt cong) |
| Fusion on MPR | Fusion on MPR (Kết hợp/hợp nhất ảnh trên MPR) |

---

### 17.7 Annotation Tools (Công cụ chú thích)

| Icon | Chức năng |
|------|-----------|
| Text chú thích | Text Annotation (Chú thích) — Thêm văn bản vào ảnh |
| Mũi tên | Text Arrow (Mũi tên chú thích) |
| Text marker | Text marker images (Marker văn bản trên ảnh) |
| AI Labeling | AI Labeling (Nhãn tự động bằng AI) |

---

### 17.8 Capture Tools (Công cụ chụp / lưu ảnh)

| Icon | Chức năng |
|------|-----------|
| Crop | Crop images tool — Cắt 1 đoạn ảnh (Crop and save image section) |
| Save | Save Image Tool (Lưu ảnh) |
| Thư viện ảnh | Thư viện ảnh (Image library / Gallery) |

---

### 17.9 More Tools (Công cụ bổ sung)

| Icon | Chức năng |
|------|-----------|
| Lịch sử | Action history — Lịch sử làm việc (Undo/action log) |
| Mã hoá | Mã hoá thông tin (Encode/Anonymize patient info) |
| Ẩn/hiện DICOM tags | Hide/show Dicom tags — Ẩn/hiện thông tin DICOM overlay |
| Chat | Chat (Nhắn tin nội bộ) |
| Download | Download — Tài xuống (Download DICOM files) |
| Folder | Mở Folder (Open local folder) |
| Config máy in | Config máy in và chuyển Pacs (Configure printer and forward to PACS) |
| Print | Print Tools (In ảnh) |
| User config | User config (Cấu hình người dùng cá nhân) |
| Thông tin | Thông tin phiên bản (Version information / About) |

---

## Tóm tắt tất cả công cụ (Complete Tool Reference)

### Mouse Interactions (Mặc định)

| Hành động | Kết quả |
|-----------|---------|
| Left click + drag | Xoay / di chuyển khung hình (Rotate/Move frame) |
| Right click + drag | Chỉnh Window/Level (WW/WL) |
| Scroll wheel | Di chuyển qua các slice (Scroll through slices) |
| Left click (annotation) | Đặt điểm bắt đầu annotation |
| Right click (annotation) | Quay lại thao tác trước (cancel/undo step) |

### Keyboard Shortcuts (Tùy chỉnh được — F1→F10 cho Window Presets)

| Phím | Chức năng |
|------|-----------|
| F1–F10 | Window/Level presets (tùy chỉnh) |
| Tùy chỉnh | Các phím tắt khác theo cấu hình cá nhân |

### Viewer Interface Layout

```
┌──────────────────────────────────────────────────────────┐
│  [Toolbar ngang — nếu bật layout ngang]                  │
├──────┬───────────────────────────────────────────────────┤
│      │                                                   │
│ Tool │         VIEWPORT AREA                             │
│ bar  │     (1x1 / 1x2 / 2x1 / Custom grid)              │
│ dọc  │                                                   │
│ (L)  │   [Overlay thông tin bệnh nhân — 4 góc + 2 cạnh] │
│      │                                                   │
├──────┴───────────────────────────────────────────────────┤
│  [Series panel bên trái — thumbnails]                    │
│  [History panel — lịch sử ca chụp]                       │
└──────────────────────────────────────────────────────────┘
```

### Series Panel (Thanh series bên trái)

- Hiển thị thumbnails của tất cả series trong study
- Click để load series vào viewport
- Có thể thay đổi series ảnh khi đang dùng các công cụ MPR/3D

### History Panel

- Mục "All" hiển thị tất cả ảnh của bệnh nhân từ các ca chụp trước
- Layout quick selector: `1x1` | `1x2` | `2x1`
- Nút refresh, sync server, add patient (so sánh)

### Overlay Information (Thông tin trên ảnh)

- 6 vùng thông tin configurable (4 góc + 2 cạnh)
- Có thể drag-drop các trường thông tin vào vị trí mong muốn
- Reset Overlay: về mặc định
- Save: lưu cấu hình

---

## MPR — Chi tiết kỹ thuật

### Yêu cầu tối thiểu
- Tối thiểu **20 ảnh** trong series để kích hoạt MPR và 3D

### Các mặt phẳng MPR
- **Axial** (Ngang — Transverse): Cắt ngang cơ thể
- **Coronal** (Trán): Cắt từ trước ra sau
- **Sagittal** (Dọc): Cắt từ trái sang phải
- **Curved MPR**: Cắt theo đường cong tùy ý (mạch máu, cột sống)
- **Oblique MPR**: Cắt nghiêng theo góc tùy chỉnh

### MIP Variants
- **MaxMIP** (Maximum Intensity Projection): Hiển thị điểm sáng nhất — dùng cho mạch máu
- **MinMIP** (Minimum Intensity Projection): Hiển thị điểm tối nhất — dùng cho đường thở
- **AvgMIP** (Average Intensity Projection): Trung bình cộng

### 3D Rendering
- Volume rendering 3D với 6 góc nhìn chuẩn (A/P/R/L/F/H)
- Xoay tự do bằng click+drag
- Clip tool: cắt để xem cấu trúc bên trong
- Virtual Endoscopy: chế độ nội soi ảo

---

## Chia sẻ & Cộng tác

### Chia sẻ ca chụp (Image Sharing)
- Hỗ trợ chia sẻ nội bộ và ngoại mạng
- Tùy chọn: mật khẩu / không mật khẩu
- Tùy chọn ẩn thông tin bệnh nhân (Encode patient)
- Thời hạn: 30 phút / 1 giờ / 1 ngày / 1 tuần
- Chia sẻ qua: QR code hoặc link URL
- URL mẫu: `https://telerad.vrc555/...`

### Hội chẩn từ xa (Teleconference / MDT Room)
- Tạo phòng hội chẩn từ ảnh DICOM của bệnh nhân
- Hỗ trợ camera và micro (kiểm tra kết nối trước khi tạo phòng)
- Chia sẻ ảnh DICOM realtime với người tham gia
- Nhấn nút xác nhận để tạo phòng
- Giao diện: DICOM viewer (trái) + Video conference panel (phải)

---

## Mammography (Chụp vú) — Chức năng chuyên biệt

### Các view chuẩn
- **CC** (Craniocaudal — Đầu đuôi): Chụp từ trên xuống
- **MLO** (Mediolateral Oblique — Nghiêng): Chụp nghiêng
- **CC/MLO**: Hiển thị kết hợp cả 2 view

### Tools chuyên biệt Mammo
- Đồng bộ Zoom (cả 2 view)
- Đồng bộ WW/WL (cả 2 view)
- Lật ngược sáng (Invert)
- Phóng đại vùng (Magnifier)
- Crop tạo ảnh Key từ vùng quan tâm

---

## In ảnh (Print)

- Print Tools: In ảnh DICOM trực tiếp
- Config máy in và chuyển Pacs: Cấu hình máy in và forward study sang PACS khác
- Tạo ảnh Key trước khi in (crop → chọn tỷ lệ → chụp)
- Lưu: All / Server image / Local Image

---

## Download & Export

- Download (Tải xuống): Tải file DICOM về máy local
- Save Image Tool: Lưu ảnh viewport hiện tại
- Crop images tool: Cắt và lưu 1 vùng ảnh
- Thư viện ảnh: Xem và quản lý ảnh đã capture/key

---

## AI Labeling

- Công cụ AI Labeling tích hợp trong Annotation Tools
- Tự động đánh nhãn tổn thương bằng AI
- Kết quả hiển thị overlay trên ảnh DICOM

---

## Thông tin phiên bản

- **Tên sản phẩm:** VRPACS V.2 — Phân hệ Viewer
- **Nhà phát triển:** Công ty Cổ phần Công nghệ C+
- **Địa chỉ:** Số 1, ngõ 31, đường 18M, Phường Mộ Lao, Quận Hà Đông, Thành phố Hà Nội
- **Điện thoại:** (+84) 982.603.805
- **Email:** contact@vrpacs.com
- **Website:** http://www.vrpacs.com
