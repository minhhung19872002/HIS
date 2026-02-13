# LIS Module - HL7Spy Integration Setup

## Overview

Module LIS (Laboratory Information System) hỗ trợ kết nối với các máy xét nghiệm qua giao thức HL7 v2.x. Tài liệu này hướng dẫn cách cấu hình HL7Spy để test tích hợp.

## HL7Spy Configuration

### 1. Download & Install HL7Spy
- Download từ: https://www.hl7spy.com/
- Cài đặt và chạy HL7Spy

### 2. Configure HL7Spy as TCP Server (Receive Worklist from HIS)

1. Mở HL7Spy
2. Vào **File > Preferences**
3. Cấu hình TCP Server:
   - **Mode**: TCP Server
   - **Port**: 2575 (hoặc port khác)
   - **Protocol**: MLLP (Minimal Lower Layer Protocol)
   - **Auto ACK**: Enabled
4. Click **Start Listening**

### 3. Configure HL7Spy as TCP Client (Send Results to HIS)

1. Vào **Connection > New TCP Connection**
2. Cấu hình:
   - **Host**: localhost (hoặc IP của HIS server)
   - **Port**: 2576 (hoặc port khác, khác với server port)
   - **Protocol**: MLLP
3. Click **Connect**

## HIS Configuration

### 1. Tạo Analyzer trong HIS

```json
POST /api/LISComplete/analyzers
{
  "code": "HL7SPY-001",
  "name": "HL7Spy Test Analyzer",
  "manufacturer": "HL7Spy",
  "model": "v3.0",
  "protocol": "HL7",
  "connectionType": "TCP",
  "ipAddress": "localhost",
  "port": 2575,
  "isActive": true
}
```

### 2. Khởi động kết nối

```json
POST /api/LISComplete/analyzers/{analyzerId}/toggle-connection?connect=true
```

## HL7 Message Examples

### ORM^O01 - Order Message (HIS -> Analyzer)

```hl7
MSH|^~\&|HIS|HOSPITAL|LIS|LAB|20260212120000||ORM^O01|MSG001|P|2.5
PID|1||12345^^^MRN||Nguyen^Van^A||19800101|M
PV1|1|O|ER||
ORC|NW|ORD001|FIL001||SC|||
OBR|1|ORD001|FIL001|GLU^Glucose|||20260212120000||||||||Blood|||Dr. Tran||||||||||S
```

### ORU^R01 - Result Message (Analyzer -> HIS)

```hl7
MSH|^~\&|ANALYZER|LAB|HIS|HOSPITAL|20260212120500||ORU^R01|MSG002|P|2.5
PID|1||12345^^^MRN||Nguyen^Van^A||19800101|M
OBR|1|ORD001|FIL001|GLU^Glucose|||20260212120500
OBX|1|NM|GLU^Glucose||95.5|mg/dL|70-100|N|||F
```

### ACK - Acknowledgment

```hl7
MSH|^~\&|HIS|HOSPITAL|ANALYZER|LAB|20260212120501||ACK^R01|ACK001|P|2.5
MSA|AA|MSG002|Message accepted
```

## Testing with Playwright

### Run E2E Tests

```bash
cd frontend
npx playwright test e2e/workflows/07-lis-hl7spy-flow.spec.ts --headed
```

### Run with Debug

```bash
npx playwright test e2e/workflows/07-lis-hl7spy-flow.spec.ts --debug
```

### Run Specific Test

```bash
npx playwright test -g "7.1 - Check HL7Spy availability"
```

## Troubleshooting

### 1. Connection Refused
- Kiểm tra HL7Spy đang chạy
- Kiểm tra port đúng (2575)
- Kiểm tra firewall

### 2. Message Timeout
- Tăng timeout trong cấu hình
- Kiểm tra MLLP framing (0x0B ... 0x1C 0x0D)

### 3. Parse Error
- Kiểm tra HL7 version (2.5)
- Kiểm tra segment separators (CR = 0x0D)
- Kiểm tra field separators (|)

## API Reference

### Analyzer Management
- `GET /api/LISComplete/analyzers` - Danh sách máy
- `POST /api/LISComplete/analyzers` - Thêm máy
- `PUT /api/LISComplete/analyzers/{id}` - Sửa máy
- `DELETE /api/LISComplete/analyzers/{id}` - Xóa máy

### Connection
- `GET /api/LISComplete/analyzers/{id}/connection-status` - Trạng thái kết nối
- `POST /api/LISComplete/analyzers/{id}/toggle-connection` - Bật/tắt kết nối
- `GET /api/LISComplete/analyzers/{id}/connection-logs` - Log kết nối

### Worklist
- `POST /api/LISComplete/worklist/send` - Gửi worklist
- `GET /api/LISComplete/worklist/pending` - Worklist chờ

### Results
- `POST /api/LISComplete/analyzers/{id}/process-result` - Xử lý kết quả
- `GET /api/LISComplete/unmapped-results` - Kết quả chưa map
- `POST /api/LISComplete/unmapped-results/map` - Map thủ công

## Supported Protocols

| Protocol | Code | Description |
|----------|------|-------------|
| HL7 v2.x | 1 | Health Level 7 |
| ASTM 1381 | 2 | ASTM E1381 |
| ASTM 1394 | 3 | ASTM E1394 |
| ASCII | 4 | Plain ASCII |
| Advia | 5 | Siemens Advia |
| Hitachi | 6 | Hitachi Analyzers |
| AU | 7 | Beckman AU Series |
| Rapidbind | 8 | Rapidbind Protocol |
| Custom | 9 | Custom Protocol |

## Connection Methods

| Method | Code | Description |
|--------|------|-------------|
| Serial (RS232) | 1 | COM port connection |
| TCP Server | 2 | HIS listens for connections |
| TCP Client | 3 | HIS connects to analyzer |
| File | 4 | File-based exchange |
