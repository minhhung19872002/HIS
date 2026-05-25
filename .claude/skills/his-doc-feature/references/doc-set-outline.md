# Outline 6 file — docs/features/<feature>/

Khung heading chuẩn (lấy từ nangcap23/nangcap24). Copy + điền nội dung thật.

## README.md
```
# <Feature> — <Tên gói/HSMT> (<số gap/feature>)
## Tổng quan        (bảng: # | Gap/Feature | Route/Component | Backend)
## Production-readiness  (bảng cấu phần | trạng thái)
## Architecture     (sơ đồ ASCII: Controller → Service → Infrastructure)
## Cấu hình môi trường   (appsettings / env / Cloud Run)
## Files            (Backend / Frontend / Tests / Docs)
## Known risks      (bảng: điểm | mức | ghi chú)   ← QUAN TRỌNG, trung thực
## Trạng thái deploy prod
## Commit / Release reference
```

## analysis.md
```
# <Feature> — Phân tích Source Code
> Mục đích / Nguồn / Tài liệu liên quan / Last updated
## 1. Phạm vi nâng cấp
## 2. Thay đổi theo lớp kiến trúc   (bảng lớp | file | thay đổi)
## 3. Entity / Schema               (bảng entity | bảng DB | status field)
## 4. DTO / Request / Response
## 5. Service Interface + Implementation
## 6. Controller / API              (bảng endpoint | route | auth)
## 7. Business Logic mới
## 8. Validation Rule
## 9. External Integration
## 11. Frontend — Route + UI
## 12. Chức năng đã triển khai vs chưa
## 17. TODO / FIXME / Nguy cơ tiềm ẩn   (bảng R1..Rn | mức | khuyến nghị)
## 18. Tham chiếu commit
```

## test-plan.md
```
# <Feature> — Test Plan tổng hợp
> Mục đích / Đối tượng / Test runner / Lưu ý đặc thù (vd lỗi 500 vs 400)
## 1. Bảng tổng hợp chức năng ↔ API ↔ Test
## 2. Test plan per-chức-năng
   ### 2.x <Chức năng>
       Module liên quan / Mô tả nghiệp vụ / API liên quan / Điều kiện test /
       Dữ liệu test / Test case (bảng TC-XXX-NNN | Case | Body | Expected) /
       Edge case / Regression impact
## 3. Luồng test theo thứ tự (smoke / regression / integration / E2E)
## 4. Checklist trước release (build / migration / env / security / permission / perf / monitoring / rollback)
## 5. Dữ liệu test cần chuẩn bị
```

## test-guide.md
```
# <Feature> — QA Test Guide
> Prerequisites (backend 5106 / frontend 3001 / tài khoản test / đặc thù)
## 1. Tổng quan
## 2. Danh sách phân hệ liên quan (bảng menu | route)
## 3. Danh sách màn hình cần test (mỗi màn: checklist + "cần verify" + API)
## 4. Business flow cần verify
## 5. Các trường hợp validation (bảng endpoint | field | rule | expected)
## 6. Permission cần test (bảng endpoint | role | test case)
## 7. External gateway / hạ tầng cần verify
## 8. Regression impact — module phụ thuộc
## 9. Màn hình có dependency
## 10. Test commands
## 11. Production checklist
```

## workflow-test.md
```
# <Feature> — HIS Workflow Test, UI Matrix & Dependency
> Mục đích / Phạm vi / Nguồn (đọc source, không suy đoán)
## 1. Phân hệ + URL thực tế
## 2. <Feature> Workflow Test
   ### 2.x <Flow>: bảng Bước | Action | Role | Status trước/sau | API | side effect
## 3. Module Dependency Map (READ / WRITE / CALL / regression area)
## 4. UI Test Matrix
## 5. Critical Medical/Financial/Legal Risk Test
## 6. Integration Test
## 7. Concurrent / Multi-user / Transaction Test
## 8. Mapping UI → Component → API → Service → DB → Integration (bảng mỗi page)
## 9. Role-based Access Test (ma trận endpoint × role)
## 10. Regression Priority (Critical / High / Medium / Low)
```

## summary.md
```
# <Feature> — Tóm tắt tài liệu + Module Impact
## 1. Bộ tài liệu (bảng 6 file | vai trò | đối tượng)
## 2. Mapping chức năng ↔ API ↔ Service ↔ Entity ↔ Test ↔ Page (bảng lớn)
## 3. Module impact ranking (mới / hiện có bị ảnh hưởng / cross-cut / không ảnh hưởng)
## 4. Source file đã thay đổi/thêm (Backend / Frontend / Test)
## 5. So sánh với gói trước (bảng tiêu chí)
## 6. Checklist quick-reference cho QA
## 7. Outstanding items (block / nice-to-have / phụ thuộc ngoài / nguy cơ)
## Liên kết external + Commit reference
```

> Mọi file: thêm block "## Tài liệu liên quan" link 5 file còn lại + "## Commit reference".
