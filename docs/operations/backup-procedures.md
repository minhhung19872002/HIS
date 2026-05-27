# QUY TRINH SAO LUU VA KHOI PHUC DU LIEU

**So van ban:** BKP-2026-001
**Phien ban:** 1.0
**Ngay ban hanh:** 28/02/2026
**Can cu phap ly:** Nghi dinh 85/2016/ND-CP, Thong tu 13/2025/TT-BYT (Dieu 6)

---

## 1. Muc dich

Tai lieu nay huong dan quy trinh sao luu va khoi phuc du lieu cho He thong Thong tin Benh vien (HIS), dam bao:
- Du lieu duoc bao ve khoi mat mat do su co phan cung, phan mem hoac thien tai
- Thoi gian khoi phuc (RTO) khong qua 4 gio
- Diem khoi phuc (RPO) khong qua 30 phut
- Tuan thu quy dinh bao mat thong tin y te tai Nghi dinh 85/2016/ND-CP

---

## 2. Pham vi

### 2.1 Du lieu can sao luu

| Thanh phan              | Vi tri                           | Kich thuoc uoc tinh | Tan suat        |
| ----------------------- | -------------------------------- | -------------------- | --------------- |
| Co so du lieu SQL Server| Docker container his-sqlserver    | 2-50 GB              | Hang ngay       |
| File upload (ho so, anh)| /uploads/                        | 1-10 GB              | Hang ngay       |
| Data Protection Keys    | /data-protection-keys/           | < 1 MB               | Hang tuan       |
| Cau hinh he thong       | appsettings.json, .env           | < 1 MB               | Khi thay doi    |
| TDE Certificate         | SQL Server master key            | < 1 MB               | Khi tao/doi     |

---

## 3. Loai sao luu

### 3.1 Sao luu day du (Full Backup)

- **Tan suat:** Hang ngay luc 23:00
- **Noi dung:** Toan bo co so du lieu
- **Luu giu:** 30 ngay
- **Lenh T-SQL:**

```sql
BACKUP DATABASE [HIS]
TO DISK = N'/var/opt/mssql/backup/HIS_Full_$(date +%Y%m%d).bak'
WITH FORMAT, INIT, COMPRESSION,
     NAME = N'HIS Full Backup',
     STATS = 10;
```

### 3.2 Sao luu chenh lech (Differential Backup)

- **Tan suat:** Moi 6 gio (06:00, 12:00, 18:00)
- **Noi dung:** Thay doi tu lan Full backup gan nhat
- **Luu giu:** 7 ngay
- **Lenh T-SQL:**

```sql
BACKUP DATABASE [HIS]
TO DISK = N'/var/opt/mssql/backup/HIS_Diff_$(date +%Y%m%d_%H%M).bak'
WITH DIFFERENTIAL, COMPRESSION,
     NAME = N'HIS Differential Backup',
     STATS = 10;
```

### 3.3 Sao luu nhat ky giao dich (Transaction Log Backup)

- **Tan suat:** Moi 30 phut
- **Noi dung:** Nhat ky giao dich chua sao luu
- **Luu giu:** 3 ngay
- **Lenh T-SQL:**

```sql
BACKUP LOG [HIS]
TO DISK = N'/var/opt/mssql/backup/HIS_Log_$(date +%Y%m%d_%H%M).trn'
WITH COMPRESSION,
     NAME = N'HIS Transaction Log Backup',
     STATS = 10;
```

---

## 4. Quy trinh sao luu

### 4.1 Sao luu tu dong (Khuyen nghi)

1. Cau hinh SQL Server Agent Job hoac cron job thuc hien sao luu theo lich (Muc 3)
2. Sao luu duoc nen (COMPRESSION) de giam dung luong
3. Kiem tra trang thai sao luu qua HIS UI: **Quan tri he thong > Sao luu**

### 4.2 Sao luu thu cong qua HIS UI

1. Dang nhap HIS voi tai khoan ADMIN
2. Vao **Quan tri he thong** > Tab **Sao luu**
3. Click **Tao sao luu**
4. Nhap ten sao luu va chon loai (Full/Differential)
5. Click **Xac nhan** va doi quy trinh hoan tat
6. Kiem tra ket qua trong danh sach sao luu

### 4.3 Sao luu thu cong qua API

```bash
curl -X POST http://localhost:5106/api/system/backup \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"backupName": "Manual_20260228", "backupType": "Full"}'
```

---

## 5. Quy trinh khoi phuc

### 5.1 Khoi phuc toan bo (Full Restore)

**CANH BAO:** Quy trinh nay se ghi de toan bo du lieu hien tai. Chi thuc hien khi that su can thiet.

1. Dung ung dung HIS (frontend va backend)
2. Chuyen co so du lieu sang che do SINGLE_USER:

```sql
ALTER DATABASE [HIS] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
```

3. Khoi phuc tu ban sao luu day du:

```sql
RESTORE DATABASE [HIS]
FROM DISK = N'/var/opt/mssql/backup/HIS_Full_20260228.bak'
WITH REPLACE, RECOVERY,
     STATS = 10;
```

4. Chuyen lai che do MULTI_USER:

```sql
ALTER DATABASE [HIS] SET MULTI_USER;
```

5. Khoi dong lai ung dung HIS va kiem tra

### 5.2 Khoi phuc den thoi diem cu the (Point-in-Time Recovery)

1. Khoi phuc Full backup voi NORECOVERY:

```sql
RESTORE DATABASE [HIS]
FROM DISK = N'HIS_Full_20260228.bak'
WITH NORECOVERY, REPLACE;
```

2. Khoi phuc Differential backup voi NORECOVERY:

```sql
RESTORE DATABASE [HIS]
FROM DISK = N'HIS_Diff_20260228_1200.bak'
WITH NORECOVERY;
```

3. Khoi phuc Transaction Log den thoi diem mong muon:

```sql
RESTORE LOG [HIS]
FROM DISK = N'HIS_Log_20260228_1430.trn'
WITH RECOVERY, STOPAT = '2026-02-28T14:30:00';
```

---

## 6. Quan ly chung chi TDE

### 6.1 TDE la gi

Transparent Data Encryption (TDE) ma hoa du lieu tai muc file (.mdf, .ldf), bao ve chong truy cap trai phep vao file vat ly.

### 6.2 Sao luu chung chi TDE

**BAT BUOC thuc hien ngay sau khi bat TDE:**

```sql
-- Sao luu Service Master Key
BACKUP SERVICE MASTER KEY
TO FILE = N'/var/opt/mssql/backup/ServiceMasterKey.bak'
ENCRYPTION BY PASSWORD = '<MAT_KHAU_MANH>';

-- Sao luu Database Master Key
USE master;
BACKUP MASTER KEY
TO FILE = N'/var/opt/mssql/backup/DatabaseMasterKey.bak'
ENCRYPTION BY PASSWORD = '<MAT_KHAU_MANH>';

-- Sao luu Certificate
BACKUP CERTIFICATE HIS_TDE_Cert
TO FILE = N'/var/opt/mssql/backup/HIS_TDE_Cert.cer'
WITH PRIVATE KEY (
    FILE = N'/var/opt/mssql/backup/HIS_TDE_Cert.pvk',
    ENCRYPTION BY PASSWORD = '<MAT_KHAU_MANH>'
);
```

### 6.3 Khoi phuc TDE tren may chu moi

```sql
-- Tao Database Master Key
USE master;
CREATE MASTER KEY ENCRYPTION BY PASSWORD = '<MAT_KHAU_MOI>';

-- Khoi phuc Certificate
CREATE CERTIFICATE HIS_TDE_Cert
FROM FILE = N'/path/to/HIS_TDE_Cert.cer'
WITH PRIVATE KEY (
    FILE = N'/path/to/HIS_TDE_Cert.pvk',
    DECRYPTION BY PASSWORD = '<MAT_KHAU_CU>'
);

-- Khoi phuc database (TDE se tu dong duoc ap dung)
RESTORE DATABASE [HIS]
FROM DISK = N'/path/to/HIS_Full.bak'
WITH RECOVERY;
```

### 6.4 Luu tru chung chi

- Chung chi TDE va Private Key luu tai **vi tri rieng biet** voi file backup database
- Su dung USB ma hoa hoac safe de luu tru offline
- Mat khau bao ve chung chi luu trong password manager (KeePass/1Password)
- **KHONG** luu chung chi cung thu muc voi file backup

---

## 7. Kiem tra sao luu

### 7.1 Kiem tra hang thang

1. Chon 1 ban sao luu bat ky trong thang
2. Khoi phuc len moi truong test (KHONG phai production)
3. Kiem tra tinh toan ven du lieu:

```sql
DBCC CHECKDB ('HIS_Test') WITH NO_INFOMSGS;
```

4. Chay kiem tra co ban: dang nhap, xem benh nhan, xem don thuoc
5. Ghi nhan ket qua vao bien ban kiem tra

### 7.2 Kiem tra RESTORE VERIFYONLY (hang tuan)

```sql
RESTORE VERIFYONLY
FROM DISK = N'/var/opt/mssql/backup/HIS_Full_Latest.bak';
```

---

## 8. Luu tru va xoa bai

| Loai sao luu       | Thoi gian luu giu | Vi tri luu tru        |
| ------------------- | ------------------ | --------------------- |
| Full Backup         | 30 ngay            | NAS + Cloud (S3/Azure)|
| Differential Backup | 7 ngay             | NAS                   |
| Transaction Log     | 3 ngay             | O dia local           |
| TDE Certificate     | Vinh vien          | USB ma hoa + Safe     |
| Sao luu hang thang  | 12 thang           | Cloud + Offline       |

Sao luu cu hon thoi gian luu giu se duoc tu dong xoa boi cron job.

---

## 9. Lich sao luu

| Thoi gian | Loai               | Tu dong | Ghi chu                      |
| --------- | ------------------- | ------- | ---------------------------- |
| 00:30     | Transaction Log     | Co      | Moi 30 phut                  |
| 06:00     | Differential        | Co      |                              |
| 12:00     | Differential        | Co      |                              |
| 18:00     | Differential        | Co      |                              |
| 23:00     | Full                | Co      | Nen COMPRESSION              |
| Chu Nhat  | Full + Verify       | Co      | Kiem tra VERIFYONLY           |
| Ngay 1    | Full → Offsite      | Co      | Copy len cloud               |

---

## 10. Trach nhiem

| Vai tro                  | Trach nhiem                                     |
| ------------------------ | ------------------------------------------------ |
| Quan tri vien CSDL (DBA) | Cau hinh va giam sat sao luu tu dong             |
| Truong phong CNTT        | Phe duyet quy trinh, kiem tra hang thang          |
| Can bo ATTT              | Quan ly chung chi TDE, kiem tra bao mat           |
| Nhan vien CNTT truc      | Xu ly su co, thuc hien khoi phuc khi can          |
| Giam doc benh vien       | Phe duyet quy trinh va ngan sach                  |

---

## 11. Ky duyet

| Chuc vu                  | Ho ten | Chu ky | Ngay     |
| ------------------------ | ------ | ------ | -------- |
| Giam doc benh vien       |        |        | __/__/__ |
| Truong phong CNTT        |        |        | __/__/__ |
| Quan tri vien CSDL       |        |        | __/__/__ |

---

**Ghi chu:**
- Tai lieu nay duoc xem xet va cap nhat hang quy hoac khi co thay doi ve ha tang.
- Kiem tra khoi phuc phai duoc thuc hien it nhat 1 lan/thang.
- Lien he Phong CNTT khi can ho tro sao luu/khoi phuc khan cap.
