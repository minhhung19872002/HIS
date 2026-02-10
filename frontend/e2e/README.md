# HIS E2E Testing Guide

## Huong dan Test Tuong tac Tren Trinh Duyet

### 1. Cai dat

```bash
# Cai Playwright (da thuc hien)
npm install -D @playwright/test

# Cai trinh duyet
npx playwright install chromium
```

### 2. Cac lenh test

| Lenh | Mo ta |
|------|-------|
| `npm run test` | Chay tat ca test (headless) |
| `npm run test:ui` | **Mo giao dien Playwright UI** - xem test chay truc quan |
| `npm run test:headed` | Chay test co hien trinh duyet |
| `npm run test:debug` | Chay debug mode, dung tung buoc |
| `npm run test:codegen` | **GHI LAI THAO TAC** - quan trong nhat! |
| `npm run test:report` | Xem bao cao HTML sau khi test |

---

## 3. GHI LAI THAO TAC NGUOI DUNG (Codegen)

Day la tinh nang quan trong nhat de tao test tu dong!

### Buoc 1: Khoi dong ung dung

```bash
# Terminal 1: Chay backend
cd backend
dotnet run --project src/HIS.API

# Terminal 2: Chay frontend
cd frontend
npm run dev
```

### Buoc 2: Bat dau ghi thao tac

```bash
npm run test:codegen
```

Lenh nay se:
- Mo trinh duyet Chrome
- Mo Playwright Inspector (cua so ghi code)
- Bat dau ghi lai moi thao tac cua ban

### Buoc 3: Thuc hien thao tac

1. **Dang nhap** vao he thong
2. **Thuc hien quy trinh** ban muon test (VD: Tiep don benh nhan)
3. Moi click, nhap lieu se duoc ghi lai thanh code

### Buoc 4: Luu test

1. Copy code tu Playwright Inspector
2. Tao file moi trong `e2e/workflows/`
3. Paste va chinh sua

### Vi du code duoc tao tu Codegen:

```typescript
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  // Dang nhap
  await page.goto('http://localhost:3000/login');
  await page.getByRole('textbox', { name: 'username' }).fill('admin');
  await page.getByRole('textbox', { name: 'password' }).fill('admin123');
  await page.getByRole('button', { name: 'Dang nhap' }).click();

  // Tiep don
  await page.getByRole('link', { name: 'Tiep don' }).click();
  await page.getByRole('button', { name: 'Dang ky moi' }).click();
  // ...
});
```

---

## 4. Chay Test Voi Giao Dien (UI Mode)

```bash
npm run test:ui
```

Tinh nang:
- Xem danh sach tat ca tests
- Chay tung test rieng le
- Xem video va screenshot
- Debug truc tiep

---

## 5. Cau truc thu muc

```
e2e/
├── README.md           # File nay
├── auth.setup.ts       # Setup dang nhap
├── helpers/
│   └── test-utils.ts   # Cac ham tien ich
└── workflows/
    ├── 01-reception.spec.ts    # Test Tiep don
    ├── 02-opd-examination.spec.ts  # Test Kham benh
    ├── 03-ipd-inpatient.spec.ts    # Test Noi tru
    └── 04-billing.spec.ts      # Test Thu ngan
```

---

## 6. Cac Luong Da Co San Test

### 6.1 Tiep Don (01-reception.spec.ts)
- Hien thi danh sach phong kham
- Dang ky benh nhan moi
- Tim kiem benh nhan
- Chon phong kham

### 6.2 Kham Benh OPD (02-opd-examination.spec.ts)
- Goi benh nhan vao kham
- Nhap sinh hieu (Vital Signs)
- Nhap tien su benh
- Kham va chan doan ICD-10
- Chi dinh can lam sang
- Ke don thuoc
- Ket thuc kham

### 6.3 Noi Tru IPD (03-ipd-inpatient.spec.ts)
- Nhap vien benh nhan
- Lap to dieu tri
- Cham soc dieu duong
- Chuyen khoa/giuong
- Xuat vien

### 6.4 Thanh Toan (04-billing.spec.ts)
- Thu tien mat/chuyen khoan
- Tam ung vien phi
- Hoan ung
- In hoa don
- Xuat bao cao

---

## 7. Meo Su Dung

### 7.1 Debug khi test fail

```bash
# Chay debug mode
npm run test:debug

# Hoac xem trace
npx playwright show-trace trace.zip
```

### 7.2 Chay chi 1 file test

```bash
npx playwright test e2e/workflows/01-reception.spec.ts
```

### 7.3 Chay chi 1 test cu the

```bash
npx playwright test -g "Dang ky benh nhan moi"
```

### 7.4 Chup anh man hinh khi fail

Da duoc cau hinh san trong `playwright.config.ts`

### 7.5 Thay doi toc do chay

```typescript
// Trong test file
test.use({ actionTimeout: 10000 }); // 10 giay cho moi action
```

---

## 8. Tao Test Moi Tu Codegen

1. Chay `npm run test:codegen`
2. Thuc hien quy trinh tren trinh duyet
3. Copy code tu Inspector
4. Tao file `e2e/workflows/XX-ten-luong.spec.ts`
5. Paste va chinh sua:
   - Them assertions (`expect`)
   - Xu ly loading
   - Them mo ta ro rang

---

## 9. Lien he

Neu gap van de, xem:
- Playwright docs: https://playwright.dev/docs/intro
- HIS_DataFlow_Architecture.md - Mo ta cac luong nghiep vu
