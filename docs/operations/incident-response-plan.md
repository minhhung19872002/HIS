# KE HOACH UNG PHO SU CO AN TOAN THONG TIN

**So van ban:** IRP-2026-001
**Phien ban:** 1.0
**Ngay ban hanh:** 28/02/2026
**Can cu phap ly:** Nghi dinh 85/2016/ND-CP, Thong tu 20/2017/TT-BTTTT, Luat An toan thong tin mang 2015

---

## 1. Muc dich va pham vi

### 1.1 Muc dich

Tai lieu nay thiet lap ke hoach ung pho su co an toan thong tin cho He thong Thong tin Benh vien (HIS), nham:
- Dam bao phan ung nhanh chong va co he thong khi xay ra su co bao mat
- Giam thieu thiet hai va thoi gian gian doan dich vu
- Bao ve du lieu benh nhan va thong tin y te nhay cam
- Tuan thu nghia vu bao cao su co theo quy dinh phap luat

### 1.2 Pham vi ap dung

- Tat ca he thong CNTT cua benh vien: HIS, LIS, RIS/PACS, EMR
- Ha tang mang noi bo va ket noi Internet
- Thiet bi dau cuoi (may tinh, may in, thiet bi y te ket noi mang)
- Du lieu benh nhan, du lieu tai chinh, du lieu nhan su
- Tat ca nhan vien, bac si, dieu duong, nhan vien CNTT

---

## 2. Phan loai su co

### 2.1 Muc 1 - Nghiem trong (Critical)

| Loai su co                    | Vi du                                    | Thoi gian phan hoi |
| ----------------------------- | ---------------------------------------- | ------------------- |
| Ro ri du lieu benh nhan       | Du lieu BN bi xuat ra ngoai trai phep    | 15 phut             |
| Tan cong ma doc (Ransomware)  | He thong bi ma hoa, yeu cau tien chuoc   | 15 phut             |
| Xam nhap he thong             | Hacker chiem quyen kiem soat server       | 15 phut             |
| Mat mat du lieu lon           | Xoa CSDL, hong o cung khong khoi phuc    | 15 phut             |

**Bao cao bat buoc:** Bao cao len Co quan chuyen trach ATTT (theo TT 20/2017)

### 2.2 Muc 2 - Lon (Major)

| Loai su co                    | Vi du                                    | Thoi gian phan hoi |
| ----------------------------- | ---------------------------------------- | ------------------- |
| Truy cap trai phep            | Tai khoan bi danh cap, truy cap du lieu  | 30 phut             |
| Sai lech du lieu              | Du lieu benh nhan bi sua doi trai phep   | 30 phut             |
| Gian doan dich vu keo dai     | He thong HIS ngung hoat dong > 2 gio    | 30 phut             |
| Tan cong DDoS                 | He thong bi lam ngap, khong truy cap duoc| 30 phut             |

### 2.3 Muc 3 - Nhe (Minor)

| Loai su co                    | Vi du                                    | Thoi gian phan hoi |
| ----------------------------- | ---------------------------------------- | ------------------- |
| Dang nhap sai nhieu lan       | Tai khoan bi khoa do nhap sai mat khau   | 2 gio               |
| Vi pham chinh sach            | Chia se mat khau, cai PM trai phep       | 4 gio               |
| Loi he thong don le           | 1 module bi loi, phan con lai binh thuong| 4 gio               |
| Phat hien malware don le      | 1 may tinh nhiem virus, da cach ly       | 4 gio               |

### 2.4 Muc 4 - Thong tin (Informational)

| Loai su co                    | Vi du                                    | Thoi gian phan hoi |
| ----------------------------- | ---------------------------------------- | ------------------- |
| Ket qua quet lo hong          | Phat hien lo hong muc trung binh/thap    | 1 ngay lam viec     |
| Sai lech cau hinh             | Cau hinh khong dung chuan nhung chua bi khai thac | 2 ngay lam viec |
| Canh bao giam sat             | Canh bao CPU/RAM/disk cao bat thuong     | 4 gio               |
| Yeu cau cap nhat phan mem     | Ban va bao mat moi duoc phat hanh        | 1 tuan              |

---

## 3. Doi ung pho su co

### 3.1 Thanh phan doi ung pho

| Vai tro                    | Trach nhiem                                     | Lien he         |
| -------------------------- | ------------------------------------------------ | --------------- |
| Truong doi ung pho (Lead)  | Chi huy, quyet dinh, bao cao len lanh dao        | (ghi so DT)     |
| Truong phong CNTT          | Dieu phoi ky thuat, phan bo nguon luc             | (ghi so DT)     |
| Chuyen vien ATTT           | Phan tich su co, ngan chan, khac phuc              | (ghi so DT)     |
| Quan tri vien he thong     | Thuc hien cac buoc ky thuat, khoi phuc            | (ghi so DT)     |
| Quan tri vien CSDL (DBA)   | Bao ve du lieu, khoi phuc CSDL                    | (ghi so DT)     |
| Quan tri vien mang         | Kiem soat truy cap mang, cach ly                  | (ghi so DT)     |
| Dai dien phap che           | Tu van phap ly, bao cao co quan chuc nang          | (ghi so DT)     |
| Dai dien Ban giam doc       | Phe duyet quyet dinh lon, truyen thong              | (ghi so DT)     |

### 3.2 Phan cap quyet dinh

| Muc su co  | Nguoi quyet dinh                | Thong bao cho              |
| ---------- | ------------------------------- | -------------------------- |
| Muc 1      | Giam doc BV + Truong doi        | So Y te, Co quan ATTT      |
| Muc 2      | Truong phong CNTT + Truong doi  | Ban giam doc               |
| Muc 3      | Chuyen vien ATTT                | Truong phong CNTT          |
| Muc 4      | Quan tri vien he thong          | Chuyen vien ATTT           |

---

## 4. Quy trinh xu ly su co (7 buoc)

### Buoc 1: Phat hien (Detection)

**Nguon phat hien:**
1. **He thong giam sat tu dong:**
   - Canh bao CPU/RAM/Disk qua nguong (> 90%)
   - Canh bao dang nhap sai > 5 lan trong 10 phut
   - Canh bao truy cap du lieu nhay cam bat thuong
   - AuditLogMiddleware ghi nhat ky tat ca hoat dong CUD
2. **Bao cao tu nguoi dung:**
   - Phat hien hanh vi la tren he thong
   - Khong truy cap duoc he thong
   - Du lieu bi thay doi khong giai thich duoc
3. **Quet lo hong dinh ky:**
   - Quet hang tuan bang cong cu bao mat
   - Kiem tra cap nhat phan mem
4. **Giam sat nhat ky (Audit Logs):**
   - Xem xet nhat ky tai SystemAdmin > Nhat ky he thong
   - Loc theo hanh dong, phan he, thoi gian

**Hanh dong:**
- Ghi nhan thoi gian phat hien chinh xac
- Thu thap thong tin ban dau (ai bao, trieu chung gi, he thong nao)
- Mo phieu su co (Incident Ticket)

### Buoc 2: Phan loai (Classification)

**Tieu chi phan loai:**
1. Anh huong den tinh bao mat (Confidentiality): Du lieu co bi lo ra ngoai?
2. Anh huong den tinh toan ven (Integrity): Du lieu co bi sua doi?
3. Anh huong den tinh san sang (Availability): Dich vu co bi gian doan?
4. So luong benh nhan/nguoi dung bi anh huong
5. Du lieu nhay cam co bi lien quan? (ho so benh an, thong tin tai chinh)

**Hanh dong:**
- Xac dinh muc su co (1-4)
- Thong bao cho nguoi phu trach theo phan cap
- Ghi nhan vao phieu su co

### Buoc 3: Ngan chan (Containment)

**Ngan chan ngan han (trong vong 1 gio):**
- Cach ly he thong bi anh huong khoi mang (disconnect network)
- Khoa tai khoan bi xam nhap
- Chan dia chi IP tan cong tren firewall
- Tat dich vu bi khai thac (neu can)

**Ngan chan dai han (trong vong 24 gio):**
- Chuyen he thong sang moi truong sach
- Thay doi tat ca mat khau lien quan
- Cap nhat firewall rules
- Bat che do giam sat tang cuong

**Bao toan bang chung:**
- Luu snapshot/image cua he thong bi anh huong
- Sao chep nhat ky he thong, nhat ky truy cap
- Khong xoa hoac sua doi bat ky file nao tren he thong bi xam nhap
- Ghi chep moi hanh dong da thuc hien

### Buoc 4: Xu ly (Eradication)

**Loai bo moi de doa:**
1. Xoa phan mem doc hai (malware, backdoor, rootkit)
2. Va cac lo hong bao mat da bi khai thac
3. Cap nhat he dieu hanh va phan mem len phien ban moi nhat
4. Kiem tra va lam sach tat ca he thong lien quan
5. Xem xet va cap nhat cau hinh bao mat

**Kiem tra:**
- Quet toan bo he thong bang cong cu diet virus
- Kiem tra tinh toan ven cua file he thong
- Xac nhan khong con back door

### Buoc 5: Khoi phuc (Recovery)

**Khoi phuc he thong:**
1. Khoi phuc du lieu tu ban sao luu (xem Quy trinh Sao luu - BKP-2026-001)
2. Xac nhan du lieu toan ven: `DBCC CHECKDB ('HIS')`
3. Khoi dong lai dich vu HIS (backend, frontend, Redis)
4. Kiem tra chuc nang co ban:
   - Dang nhap thanh cong
   - Xem du lieu benh nhan
   - Ke don thuoc
   - Thu phi
5. Mo truy cap cho nguoi dung theo tung nhom
6. Giam sat tang cuong trong 48 gio dau

**Kiem tra sau khoi phuc:**
- Chay Cypress E2E tests (507+ tests)
- Chay Playwright workflow tests (255 tests)
- Chay API workflow tests (41 tests)
- Xac nhan tat ca dich vu hoat dong binh thuong

### Buoc 6: Bao cao (Reporting)

**Bao cao noi bo:**
- Bao cao tom tat su co cho Ban giam doc (trong vong 24 gio)
- Bao cao chi tiet cho Phong CNTT (trong vong 48 gio)
- Bao cao cho tat ca phong ban bi anh huong

**Bao cao ra ngoai (neu Muc 1-2):**
- Bao cao len So Y te (trong vong 24 gio)
- Bao cao len Co quan chuyen trach ATTT tai dia phuong (theo TT 20/2017)
- Thong bao cho benh nhan bi anh huong (neu ro ri du lieu ca nhan)

**Noi dung bao cao:**
1. Thoi gian phat hien va thoi gian xay ra su co
2. Mo ta su co va pham vi anh huong
3. Cac buoc da thuc hien de xu ly
4. Ket qua va trang thai hien tai
5. Bai hoc rut ra va bien phap phong ngua

### Buoc 7: Rut kinh nghiem (Lessons Learned)

**Hop rut kinh nghiem** (trong vong 1 tuan sau su co):
1. Tai lieu hoa toan bo su co tu A den Z
2. Phan tich nguyen nhan goc (Root Cause Analysis)
3. Xac dinh cac diem yeu trong quy trinh hien tai
4. De xuat bien phap cai tien:
   - Cap nhat chinh sach bao mat
   - Bo sung cong cu giam sat
   - Dao tao nhan vien
   - Nang cap ha tang
5. Cap nhat ke hoach ung pho su co (tai lieu nay)
6. Luu tru hoa so su co

---

## 5. Mau bao cao su co

### PHIEU BAO CAO SU CO AN TOAN THONG TIN

| Hang muc                  | Noi dung                                |
| ------------------------- | --------------------------------------- |
| So phieu                  | INC-____-____                           |
| Ngay bao cao              | __/__/____                              |
| Nguoi bao cao             |                                         |
| Chuc vu                   |                                         |
| Muc su co                 | [ ] Muc 1  [ ] Muc 2  [ ] Muc 3  [ ] Muc 4 |
| Thoi gian phat hien       | __:__ ngay __/__/____                   |
| Thoi gian uoc tinh xay ra | __:__ ngay __/__/____                   |
| He thong bi anh huong     |                                         |
| Mo ta su co               |                                         |
| Pham vi anh huong         |                                         |
| So luong BN bi anh huong  |                                         |
| Du lieu nhay cam lien quan| [ ] Co  [ ] Khong                       |
| Hanh dong da thuc hien    |                                         |
| Trang thai hien tai       | [ ] Dang xu ly  [ ] Da ngan chan  [ ] Da khac phuc |
| De xuat xu ly tiep        |                                         |

**Nguoi bao cao:**         ____________    **Nguoi phu trach:**    ____________

---

## 6. Lien he khan cap

| STT | Vai tro                    | Ho ten | So dien thoai | Email |
| --- | -------------------------- | ------ | ------------- | ----- |
| 1   | Truong doi ung pho su co   |        |               |       |
| 2   | Truong phong CNTT          |        |               |       |
| 3   | Chuyen vien ATTT           |        |               |       |
| 4   | Quan tri vien he thong     |        |               |       |
| 5   | Quan tri vien CSDL         |        |               |       |
| 6   | Giam doc benh vien         |        |               |       |
| 7   | Duong day nong So Y te     |        |               |       |
| 8   | Co quan ATTT dia phuong    |        |               |       |
| 9   | Don vi cung cap PM (HIS)   |        |               |       |
| 10  | Don vi ATTT hop dong       |        |               |       |

---

## 7. Kiem tra va cap nhat

### 7.1 Lich kiem tra

| Hoat dong                            | Tan suat      | Nguoi chiu trach nhiem |
| ------------------------------------ | ------------- | ---------------------- |
| Kiem tra ke hoach ung pho (doc review)| Hang quy      | Truong phong CNTT      |
| Dien tap su co (tabletop exercise)   | 6 thang/lan   | Doi ung pho su co      |
| Dien tap thuc te (simulation)        | Hang nam      | Toan benh vien         |
| Cap nhat danh sach lien he           | Hang thang    | Chuyen vien ATTT       |
| Cap nhat tai lieu                    | Khi co su co  | Truong doi ung pho     |

### 7.2 Chi so danh gia (KPI)

| Chi so                               | Muc tieu       |
| ------------------------------------ | -------------- |
| Thoi gian phat hien trung binh (MTTD)| < 1 gio        |
| Thoi gian phan hoi trung binh (MTTR) | < 4 gio        |
| Thoi gian khoi phuc (RTO)            | < 4 gio        |
| Ty le su co duoc xu ly dung quy trinh| > 95%          |
| Ty le nhan vien da dao tao ATTT      | 100%           |

---

## 8. Phu luc

### Phu luc A: Checklist ung pho su co

- [ ] Phat hien va ghi nhan su co
- [ ] Phan loai muc do su co (1-4)
- [ ] Thong bao cho nguoi phu trach theo phan cap
- [ ] Ngan chan su co (cach ly he thong, khoa tai khoan)
- [ ] Bao toan bang chung (snapshot, log, screenshot)
- [ ] Loai bo moi de doa (malware, backdoor, patch)
- [ ] Khoi phuc he thong tu ban sao luu
- [ ] Kiem tra chuc nang sau khoi phuc
- [ ] Viet bao cao su co
- [ ] Bao cao ra ngoai (neu Muc 1-2)
- [ ] Thong bao benh nhan bi anh huong (neu ro ri du lieu)
- [ ] Hop rut kinh nghiem
- [ ] Cap nhat tai lieu va quy trinh
- [ ] Luu tru ho so su co

### Phu luc B: Mau thong bao su co cho benh nhan

---

**THONG BAO VE SU CO AN TOAN THONG TIN**

Kinh gui: [Ho ten benh nhan]

Benh vien chung toi xin thong bao rang da xay ra su co an toan thong tin vao ngay [ngay/thang/nam] co the anh huong den thong tin ca nhan cua quy vi.

**Thong tin co the bi anh huong:** [Liet ke cac loai thong tin]

**Bien phap da thuc hien:** [Mo ta ngan gon]

**Khuyen nghi cho benh nhan:**
1. Doi mat khau tai khoan Cong benh nhan (neu co)
2. Theo doi cac hoat dong bat thuong lien quan den thong tin ca nhan
3. Lien he Phong CNTT benh vien neu phat hien bat thuong

**Lien he:** Phong CNTT - SĐT: [so dien thoai] - Email: [email]

Tran trong,
[Giam doc benh vien]

---

## 9. Ky duyet

| Chuc vu                  | Ho ten | Chu ky | Ngay     |
| ------------------------ | ------ | ------ | -------- |
| Giam doc benh vien       |        |        | __/__/__ |
| Truong phong CNTT        |        |        | __/__/__ |
| Can bo an toan thong tin |        |        | __/__/__ |
| Truong doi ung pho su co |        |        | __/__/__ |

---

**Ghi chu:**
- Tai lieu nay duoc xem xet va cap nhat hang quy hoac ngay sau moi su co.
- Moi nhan vien benh vien co trach nhiem nam bat quy trinh bao cao su co.
- Dien tap su co duoc to chuc dinh ky de dam bao san sang ung pho.
- Lien he Phong CNTT de duoc huong dan them.
