# Web quản trị app người bệnh — bản ĐỘC LẬP

Năm màn quản trị (HSMT I.3) đóng gói thành một web **riêng**, không nằm trong SPA của HIS.

## Vì sao tách ra

Bản đầu tiên nhét 5 màn này vào `frontend/` của HIS. Chạy được, nhưng nó **trói sản phẩm vào đúng
một HIS**: mang app đi triển khai cho bệnh viện dùng HIS của hãng khác là không có chỗ đặt màn quản
trị, vì SPA đó không phải của mình.

Bản này chỉ cần **BFF** (`HIS.PatientApp.Api`). Nhân viên đăng nhập qua `POST /api/v1/staff/auth/login`
— BFF chuyển tiếp sang HIS rồi trả token về, nên web này không cần biết HIS nằm ở đâu.

## Không sao chép mã

`vite.config.ts` trỏ alias `@` vào `../frontend/src`, nên 5 màn và bộ `_v2kit` vẫn là **một bản duy
nhất**. Sửa ở `frontend/` thì bản này tự có. Sao chép ra sẽ lệch nhau sau vài tháng, và lúc đó không
ai biết bản nào đúng.

Bundle chỉ chứa những gì 5 màn thật sự dùng tới (Vite tự cắt), không phải cả HIS.

## Chạy

```bash
npm install                       # cài ở thư mục frontend/ (dùng chung node_modules)
npm run dev                       # cần VITE_PATIENT_APP_API_URL
npm run build                     # ra dist/
```

| Biến | Ý nghĩa |
|---|---|
| `VITE_PATIENT_APP_API_URL` | Gốc của BFF, ví dụ `https://patientapp.14-225-83-93.nip.io`. Để trống thì gọi cùng gốc với web. |
