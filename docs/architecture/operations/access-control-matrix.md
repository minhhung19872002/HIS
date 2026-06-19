# MA TRAN KIEM SOAT TRUY CAP - HE THONG THONG TIN BENH VIEN

**So van ban:** ACM-2026-001
**Phien ban:** 1.0
**Ngay ban hanh:** 28/02/2026
**Can cu phap ly:** Nghi dinh 85/2016/ND-CP, Thong tu 12/2022/TT-BTTTT, Thong tu 13/2025/TT-BYT

---

## 1. Gioi thieu

### 1.1 Muc dich

Tai lieu nay xac dinh ma tran kiem soat truy cap (Access Control Matrix) cho He thong Thong tin Benh vien (HIS), dam bao tuan thu cac quy dinh ve bao mat thong tin y te theo Nghi dinh 85/2016/ND-CP va Thong tu 13/2025/TT-BYT.

### 1.2 Pham vi ap dung

- Tat ca nguoi dung he thong HIS
- 10 phan he nghiep vu chinh
- 8 vai tro duoc dinh nghia
- Ap dung cho ca truy cap truc tiep va truy cap qua API

### 1.3 Nguyen tac phan quyen

- **Nguyen tac dac quyen toi thieu** (Principle of Least Privilege): Moi nguoi dung chi duoc cap dung quyen can thiet de thuc hien nhiem vu.
- **Phan tach nhiem vu** (Separation of Duties): Nguoi ke don khong duoc tu phat thuoc cho chinh minh.
- **Kiem soat truy cap theo vai tro** (Role-Based Access Control - RBAC): Quyen duoc gan cho vai tro, vai tro duoc gan cho nguoi dung.

---

## 2. Danh sach vai tro

| STT | Ma vai tro   | Ten vai tro                | Mo ta                                              |
| --- | ------------ | -------------------------- | -------------------------------------------------- |
| 1   | ADMIN        | Quan tri vien he thong     | Toan quyen quan tri he thong, phan quyen, cau hinh  |
| 2   | DOCTOR       | Bac si                     | Kham benh, ke don, chi dinh CLS, ky so             |
| 3   | NURSE        | Dieu duong                 | Cham soc benh nhan, thuc hien y lenh, ghi chep DD  |
| 4   | PHARMACIST   | Duoc si                    | Phat thuoc, kiem duyet don, quan ly ton kho         |
| 5   | LAB_TECH     | Ky thuat vien xet nghiem   | Thuc hien XN, nhap ket qua, duyet ket qua          |
| 6   | RECEPTIONIST | Nhan vien tiep don         | Dang ky kham, cap so, quan ly hang doi              |
| 7   | ACCOUNTANT   | Ke toan/Thu ngan            | Thu phi, xuat hoa don, doi chieu bao cao            |
| 8   | MANAGER      | Quan ly/Truong khoa        | Xem bao cao, duyet, giam sat hoat dong             |

---

## 3. Ma tran quyen

### 3.1 Bang tong hop quyen theo vai tro va phan he

Ky hieu: **R** = Doc (Read), **W** = Ghi (Write), **D** = Xoa (Delete), **A** = Quan tri (Admin), **-** = Khong co quyen

| Phan he             | ADMIN | DOCTOR | NURSE | PHARMACIST | LAB_TECH | RECEPTIONIST | ACCOUNTANT | MANAGER |
| ------------------- | ----- | ------ | ----- | ---------- | -------- | ------------ | ---------- | ------- |
| Tiep don            | RWDA  | R      | R     | -          | -        | RW           | R          | R       |
| Kham benh (OPD)     | RWDA  | RW     | RW    | R          | R        | R            | R          | R       |
| Noi tru (IPD)       | RWDA  | RW     | RW    | R          | R        | R            | R          | R       |
| Ke don thuoc        | RWDA  | RW     | R     | RW         | -        | -            | R          | R       |
| Nha thuoc/Kho duoc  | RWDA  | R      | R     | RWD        | -        | -            | R          | R       |
| Thu ngan/Vien phi   | RWDA  | R      | -     | -          | -        | R            | RW         | R       |
| Xet nghiem (LIS)    | RWDA  | RW     | R     | -          | RW       | -            | -          | R       |
| Chan doan hinh anh  | RWDA  | RW     | R     | -          | R        | -            | -          | R       |
| Ho so benh an (EMR) | RWDA  | RW     | RW    | R          | R        | R            | R          | R       |
| Quan tri he thong   | RWDA  | -      | -     | -          | -        | -            | -          | R       |

### 3.2 Chi tiet quyen theo tung phan he

#### 3.2.1 Tiep don (Reception)

| Quyen                     | ADMIN | DOCTOR | NURSE | RECEPTIONIST | ACCOUNTANT | MANAGER |
| ------------------------- | ----- | ------ | ----- | ------------ | ---------- | ------- |
| Xem danh sach benh nhan   | X     | X      | X     | X            | X          | X       |
| Dang ky kham              | X     |        |       | X            |            |         |
| Sua thong tin dang ky     | X     |        |       | X            |            |         |
| Huy dang ky               | X     |        |       | X            |            |         |
| In phieu kham             | X     | X      | X     | X            |            | X       |
| Xac thuc CCCD             | X     |        |       | X            |            |         |
| Quan ly hang doi          | X     |        |       | X            |            |         |

#### 3.2.2 Kham benh (OPD)

| Quyen                     | ADMIN | DOCTOR | NURSE | RECEPTIONIST | MANAGER |
| ------------------------- | ----- | ------ | ----- | ------------ | ------- |
| Xem danh sach benh nhan   | X     | X      | X     | X            | X       |
| Ghi sinh hieu             | X     | X      | X     |              |         |
| Kham va ghi ket luan      | X     | X      |       |              |         |
| Ke don thuoc              | X     | X      |       |              |         |
| Chi dinh xet nghiem       | X     | X      |       |              |         |
| Chi dinh CDHA             | X     | X      |       |              |         |
| Ky so ho so               | X     | X      |       |              |         |
| In phieu kham             | X     | X      | X     |              | X       |

#### 3.2.3 Noi tru (IPD)

| Quyen                     | ADMIN | DOCTOR | NURSE | PHARMACIST | MANAGER |
| ------------------------- | ----- | ------ | ----- | ---------- | ------- |
| Nhap vien                 | X     | X      |       |            |         |
| Chuyen khoa               | X     | X      |       |            |         |
| Xuat vien                 | X     | X      |       |            |         |
| Ghi to dieu tri           | X     | X      | X     |            |         |
| Y lenh hang ngay          | X     | X      |       |            |         |
| Cham soc dieu duong       | X     |        | X     |            |         |
| Quan ly giuong             | X     | X      | X     |            | X       |

---

## 4. Chinh sach mat khau

| Tieu chi                    | Gia tri                            |
| --------------------------- | ---------------------------------- |
| Do dai toi thieu            | 8 ky tu                            |
| Yeu cau ky tu               | Chu hoa, chu thuong, so, ky tu dac biet |
| Thuat toan bam              | BCrypt (cost factor 12)            |
| Xac thuc 2 yeu to (2FA)    | Email OTP (6 so, het han 5 phut)   |
| Khoa tai khoan              | Sau 5 lan dang nhap sai            |
| Thay doi mat khau           | 90 ngay/lan (khuyen nghi)          |

---

## 5. Chinh sach phien

| Tieu chi                    | Gia tri                       |
| --------------------------- | ----------------------------- |
| Access Token                | JWT, het han 15 phut          |
| Luu tru phia client         | localStorage                  |
| Dang xuat                   | Xoa token phia client         |
| Dang nhap dong thoi         | Cho phep (da phien)           |
| Tu dong dang xuat           | Khi token het han             |

---

## 6. Nhat ky truy cap (Audit Trail)

### 6.1 Cac hanh dong duoc ghi nhat ky

- Tao moi (Create) - tat ca doi tuong
- Cap nhat (Update) - tat ca doi tuong
- Xoa (Delete) - tat ca doi tuong
- In (Print) - ho so benh an, don thuoc, hoa don
- Xuat (Export) - bao cao, du lieu
- Dang nhap/Dang xuat (Auth)
- Duyet (Approve) - ket qua XN, phieu xuat kho
- Huy (Cancel) - don thuoc, hoa don

### 6.2 Thong tin duoc luu

- Thoi gian thuc hien (timestamp)
- Nguoi thuc hien (userId, username, fullName)
- Hanh dong (action)
- Doi tuong bi tac dong (entityType, entityId)
- Duong dan request (requestPath, requestMethod)
- Ma trang thai phan hoi (responseStatusCode)
- Dia chi IP (ipAddress)
- Trinh duyet (userAgent)
- Chi tiet thay doi (details)

### 6.3 Thoi gian luu giu

- Nhat ky he thong: 365 ngay
- Nhat ky truy cap du lieu nhay cam: 730 ngay (2 nam)
- Nhat ky dang nhap: 180 ngay

---

## 7. Du lieu nhay cam va bao ve

### 7.1 Phan loai du lieu nhay cam

| Loai du lieu              | Muc do          | Bien phap bao ve          |
| ------------------------- | --------------- | ------------------------- |
| Ma hoa benh an (CCCD)     | Cao             | Ma hoa cot (AES-256)      |
| Ket qua xet nghiem       | Cao             | TDE + kiem soat truy cap  |
| Thong tin BHYT            | Trung binh-Cao  | TDE + ghi nhat ky         |
| Chan doan ICD-10          | Trung binh      | RBAC + ghi nhat ky        |
| Don thuoc                 | Trung binh      | RBAC + ghi nhat ky        |
| Thong tin hanh chinh BN   | Trung binh      | RBAC                      |

### 7.2 Ma hoa du lieu

- **TDE (Transparent Data Encryption):** Ma hoa toan bo co so du lieu tai muc luu tru
- **Column Encryption:** Ma hoa cac cot chua thong tin nhay cam (CCCD, so BHYT)
- **HTTPS/TLS:** Ma hoa truyen tai du lieu giua client va server

---

## 8. Ky duyet

| Chuc vu                  | Ho ten | Chu ky | Ngay     |
| ------------------------ | ------ | ------ | -------- |
| Giam doc benh vien       |        |        | __/__/__ |
| Truong phong CNTT        |        |        | __/__/__ |
| Can bo an toan thong tin |        |        | __/__/__ |
| Truong phong TCKT        |        |        | __/__/__ |

---

**Ghi chu:**
- Tai lieu nay duoc xem xet va cap nhat hang quy hoac khi co thay doi ve chinh sach.
- Moi thay doi phai duoc phe duyet boi Giam doc benh vien va Truong phong CNTT.
- Lien he Phong CNTT de yeu cau cap/thu hoi quyen truy cap.
