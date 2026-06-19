# HIS — Bộ test-task & Trình xem Evidence (PROTOCOL · mọi phiên / mọi máy)

> **File này là NGUỒN-SỰ-THẬT (single source) của quy tắc evidence + viewer.** Vì nó nằm trong repo
> (commit được) nên áp dụng **mọi phiên / mọi máy** (memory cá nhân chỉ local 1 máy → không tính).
> Repo `CLAUDE.md` (mục test) chỉ trỏ tới đây, KHÔNG copy nội dung.

## 0. Phạm vi & nguyên tắc thứ tự (đọc trước)
- Bộ này phủ coverage theo **roadmap kiến trúc**: `docs/architecture/his-roadmap/` + `docs/architecture/his-data-structure.{html,js}`
  — **5 lớp · 38 phân hệ · 485 bảng · 12 luồng hành trình BN · 9+ vai trò**.
- **LẬP KẾ HOẠCH ≠ CHẠY TEST.** Bộ task + viewer này là *kế hoạch + công cụ*. Việc **chạy test thực tế +
  chụp evidence LÀM CUỐI CÙNG**, chỉ sau khi đã đóng hết task fix/feature/tech-debt (rule cứng repo `CLAUDE.md`).
- **DEDUP GitHub (bắt buộc):** TRƯỚC khi tạo task test mới → `gh issue list --label test`. Board đã có **74 test
  issue #216–289**. Mỗi phân hệ ở đây **map vào issue cha** (xem cột "GitHub" trong viewer), KHÔNG tạo issue trùng.
  Chỉ phân hệ THỰC SỰ chưa phủ → đánh dấu **"đề xuất issue mới"** (mục candidate), hỏi user duyệt, **không tự tạo**.

## 1. Cấu trúc thư mục
```
evidence/
├─ index.html              # Trình xem evidence (mở trực tiếp bằng trình duyệt — file://)
├─ assets/viewer.css       # giao diện
├─ assets/viewer.js        # logic (data-driven, không phụ thuộc thư viện ngoài)
├─ data/                   # DỮ LIỆU test-plan (sinh bởi workflow his-testplan-evidence)
│  ├─ 00-bootstrap.js      #   window.TP = { meta, layers, roles, candidateIssues, modules:[], flows:[], cross:[] }
│  ├─ 10-found.js … 14-spec.js   #   push modules theo lớp
│  ├─ 20-flows.js          #   push 12 luồng
│  └─ 30-cross.js          #   push cross-cutting (permission/ui-state/integration/bù-coverage)
├─ manifest.js             # window.TP_IMAGES = [...]  danh sách ảnh thật (tái sinh bằng generator)
├─ gen-manifest.ps1        # Windows: tái sinh manifest.js
├─ gen-manifest.mjs        # Node:    tái sinh manifest.js
└─ <layer>-<modid>/        # 38 thư mục chứa ảnh evidence (clin-reception, fin-billing, …) + flows/ + cross/
```

## 2. QUY ƯỚC ĐẶT TÊN EVIDENCE (bắt buộc — để viewer trace ngược task)
```
<layer>-<modid>/TC-<CODE>-<NNN>__s<NN>__<state>.png
```
- `<layer>-<modid>` = thư mục phân hệ (vd `clin-reception`, `fin-billing`, `flows`, `cross`).
- `TC-<CODE>-<NNN>` = **mã task** (CODE = mã ngắn phân hệ trong viewer, vd RCP/BIL/LIS/OPD…); 1 ảnh thuộc đúng 1 task.
- `s<NN>` = số bước (s01, s02…). `<state>` = trạng thái UI của ảnh.
- **state hợp lệ:** `list · detail · form · modal · drawer · tab · filter · dropdown · validation · empty · loading · error · confirm · success · toast · permission`
- Ví dụ: `clin-reception/TC-RCP-001__s02__form.png` · `fin-billing/TC-BIL-007__s03__validation.png`

> Viewer khớp ảnh ↔ task qua phần tên trước `.png`. Ảnh đúng prefix `TC-RCP-001__` nhưng không khớp slot khai báo
> sẽ hiện dưới task dạng **"evidence bổ sung"**. Slot khai báo mà thiếu ảnh sẽ hiện **"chưa chụp"**.

## 3. EVIDENCE phải chụp những gì (mọi task có UI)
Mỗi task có giao diện **bắt buộc** có ≥1 ảnh, và phải phủ **mọi trạng thái UI liên quan** của luồng:
form/popup/modal/drawer · bảng dữ liệu (list) · tab · filter · dropdown · **validation message** · **empty state** ·
**loading/skeleton** · **error state (API 500/timeout)** · **confirm dialog** (trước thao tác nguy hiểm) · **success toast** ·
permission-deny (vai trò không đủ quyền). Đặt tên theo §2.

## 4. Bố cục Trình xem Evidence (yêu cầu cố định)
`index.html` mở trực tiếp (không cần server), gồm:
- **Header + KPI**: phân hệ · luồng · tổng task · evidence (đã chụp / tổng) · số đề xuất issue mới. Nút đổi **sáng/tối**.
- **Sidebar điều hướng** (trái): ô tìm kiếm + lọc (loại test / ưu tiên / có-ảnh|chưa-chụp); cây **lớp → phân hệ** (kèm
  badge số task + thanh tiến độ evidence), nhóm **luồng**, nhóm **cross-cutting**, mục **đề xuất issue mới**.
- **Khu nội dung chính** (phải):
  - **Tổng quan coverage** (mặc định): thẻ từng phân hệ + thanh % evidence; danh sách luồng; danh sách đề xuất issue.
  - **Trang phân hệ**: header (icon/tên/lớp/issue-cha/% evidence) → danh sách **màn hình** → **checklist trạng thái UI**
    → **test-task gom theo loại** (mỗi task: mã, loại, ưu tiên, vai trò, issue tham chiếu, tiền điều kiện, các bước,
    kết quả mong đợi, ghi chú, chọn **trạng thái pass/fail/blocked/skip**) → **dải evidence** (thumbnail) → **gap**.
- **Thumbnail → bấm xem lớn**: lightbox riêng, **next/prev** giữa các ảnh **cùng task** (phím ←/→, Esc đóng),
  hiển thị tiêu đề task + trạng thái + caption + tên file.
- Trạng thái pass/fail/blocked/skip lưu **localStorage** (review nội bộ, không cần backend).

## 5. Quy trình chụp & cập nhật evidence (khi tới phiên CHẠY test)
1. Mở viewer → chọn phân hệ → đọc task (đủ rõ để test theo).
2. Thực hiện, chụp ảnh từng bước/trạng thái, **đặt tên theo §2**, bỏ vào `evidence/<layer>-<modid>/`.
3. Tái sinh manifest: `powershell -ExecutionPolicy Bypass -File gen-manifest.ps1` **hoặc** `node gen-manifest.mjs`.
4. Refresh viewer → ảnh tự khớp vào task; đặt trạng thái pass/fail.
5. **Phát hiện bug → tạo NGAY task `fix`** (rõ lỗi + màn + evidence), **liên kết 2 chiều** với task test
   (rule repo `CLAUDE.md`). Task test chỉ **DONE** khi mọi bug nó tìm ra đã có fix-task đầy đủ + UI có evidence.

## 6. Sinh lại dữ liệu test-plan
Dữ liệu trong `data/*.js` sinh bằng workflow **`his-testplan-evidence`** (đọc `his-roadmap/assets/data.js`, fan-out
mỗi phân hệ/luồng 1 agent, map issue cha #216–289, completeness-critic bù coverage). Sửa nguồn roadmap → chạy lại workflow.
