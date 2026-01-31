# OPD (Outpatient Department) Examination Page

## Overview
The OPD page is a comprehensive examination interface for outpatient clinics in the HIS system. It provides doctors with a complete workflow for examining patients, from selection through diagnosis and treatment planning.

## File Location
`C:\Source\HIS\frontend\src\pages\OPD.tsx`

## Related API Files
- `C:\Source\HIS\frontend\src\api\examination.ts` - Examination-related API endpoints
- `C:\Source\HIS\frontend\src\api\patient.ts` - Patient-related API endpoints

## Features

### 1. Patient Selection & Information
- **Search Patient**: Search by patient code, identity number, phone number, or insurance number
- **Queue Selection**: Select patients from the waiting queue list
- **Patient Information Display**:
  - Patient code, full name, age, gender
  - Phone number, insurance number
  - Full address
  - Access to patient's examination history

### 2. Examination Tabs

#### Tab 1: Vital Signs (Sinh hiệu)
Records patient's vital signs including:
- Weight (kg) and Height (cm)
- BMI calculation
- Blood Pressure (Systolic/Diastolic in mmHg)
- Temperature (°C)
- Pulse rate (beats/min)
- Respiratory rate (breaths/min)
- SpO2 (%)

#### Tab 2: Medical History & Symptoms (Bệnh sử & Triệu chứng)
Captures comprehensive medical history:
- Chief Complaint (Lý do khám)
- History of Present Illness (Bệnh sử)
- Past Medical History (Tiền sử bệnh)
- Family History (Tiền sử gia đình)
- Allergies (Dị ứng)
- Current Medications (Thuốc đang dùng)

#### Tab 3: Physical Examination (Khám lâm sàng)
Detailed physical examination findings:
- General Appearance (Toàn thân)
- Cardiovascular (Tim mạch)
- Respiratory (Hô hấp)
- Gastrointestinal (Tiêu hóa)
- Neurological (Thần kinh)
- Musculoskeletal (Cơ xương khớp)
- Skin (Da)
- Other findings (Khác)

#### Tab 4: Diagnosis (Chẩn đoán)
Diagnosis management with ICD-10 integration:
- **ICD-10 Code Search**: Search and select diagnosis codes
- **Primary Diagnosis**: Main diagnosis (marked in red)
- **Secondary Diagnosis**: Additional diagnoses (marked in blue)
- **Conclusion**: Medical conclusion
- **Recommendations**: Treatment recommendations
- **Follow-up Date**: Schedule for next visit

#### Tab 5: Treatment Orders (Chỉ định)
Create various types of treatment orders:
- **Laboratory Tests** (Xét nghiệm)
- **Imaging Studies** (Chẩn đoán hình ảnh)
- **Procedures** (Thủ thuật)
- **Medications** (Thuốc)
- **Other Services** (Dịch vụ)

Each order includes:
- Service code and name
- Quantity with unit
- Special instructions
- Urgency level

### 3. Workflow Actions

#### Auto-Save
- Automatically saves examination as draft every 30 seconds
- Prevents data loss
- Works silently in the background

#### Save Draft (Lưu nháp)
- Manually save current examination progress
- Status: Draft (0)
- Can be resumed later

#### Complete Examination (Hoàn thành)
- Finalizes the examination
- Requires at least one diagnosis
- Confirmation modal before completion
- Status: Completed (2)

#### Print (In)
- Print examination summary
- Requires saved examination

#### View History (Lịch sử khám bệnh)
- View patient's previous examinations
- Shows examination date, room, doctor, diagnosis, and status
- Accessible from patient info card

## Data Structures

### Examination Interface
```typescript
interface Examination {
  id?: string;
  examinationDate: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  queueId?: string;
  queueNumber?: number;
  departmentId: string;
  roomId: string;
  doctorId: string;
  vitalSigns?: VitalSigns;
  medicalHistory?: MedicalHistory;
  physicalExamination?: PhysicalExamination;
  diagnoses?: Diagnosis[];
  orders?: TreatmentOrder[];
  conclusion?: string;
  recommendations?: string;
  followUpDate?: string;
  status: number;
}
```

### Diagnosis Interface
```typescript
interface Diagnosis {
  id?: string;
  icdCode: string;
  icdName: string;
  diagnosisType: number; // 1: Primary, 2: Secondary
  description?: string;
}
```

### Treatment Order Interface
```typescript
interface TreatmentOrder {
  id?: string;
  orderType: number; // 1: Lab, 2: Imaging, 3: Procedure, 4: Medication, 5: Service
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  quantity: number;
  unit?: string;
  instructions?: string;
  urgency?: number;
}
```

## API Endpoints

### Queue Management
- `GET /api/examinations/queue` - Get waiting patients list
  - Optional query param: `roomId`

### Patient Data
- `GET /api/patients/{id}` - Get patient by ID
- `GET /api/patients/by-code/{code}` - Get patient by code
- `GET /api/patients/by-identity/{identityNumber}` - Get patient by ID number
- `GET /api/patients/by-insurance/{insuranceNumber}` - Get patient by insurance

### Examination Operations
- `POST /api/examinations` - Create new examination
- `PUT /api/examinations/{id}` - Update examination
- `POST /api/examinations/{id}/complete` - Complete examination
- `GET /api/examinations/{id}` - Get examination by ID
- `GET /api/examinations/patient/{patientId}` - Get patient's examination history

### Reference Data
- `GET /api/icd-codes/search?q={query}` - Search ICD-10 codes
- `GET /api/services/search?q={query}&serviceType={type}` - Search services

## State Management

### Main States
- `selectedPatient`: Currently selected patient
- `queueList`: List of waiting patients
- `examination`: Current examination data
- `diagnoses`: Array of diagnoses
- `orders`: Array of treatment orders
- `activeTab`: Current active tab

### Modal States
- `historyModalVisible`: Controls patient history modal
- `patientHistory`: Patient's previous examinations

### Loading States
- `loadingQueue`: Loading queue data
- `saving`: Saving examination
- `searchingICD`: Searching ICD codes
- `searchingService`: Searching services

## UI Components Used

### Ant Design Components
- **Layout**: Card, Row, Col, Space, Divider
- **Forms**: Form, Input, InputNumber, Select, AutoComplete, TextArea, DatePicker
- **Data Display**: Table, Descriptions, Tag, Typography, Spin, Alert
- **Navigation**: Tabs
- **Feedback**: Modal, message, Tooltip
- **General**: Button

### Icons
- SaveOutlined, PrinterOutlined, CheckCircleOutlined
- HistoryOutlined, SearchOutlined, PlusOutlined, DeleteOutlined
- UserOutlined, HeartOutlined, MedicineBoxOutlined
- FileTextOutlined, AimOutlined, OrderedListOutlined

## Vietnamese Labels

All UI labels are in Vietnamese for better user experience:
- Sinh hiệu = Vital Signs
- Bệnh sử & Triệu chứng = Medical History & Symptoms
- Khám lâm sàng = Physical Examination
- Chẩn đoán = Diagnosis
- Chỉ định = Treatment Orders
- Hoàn thành = Complete
- Lưu nháp = Save Draft

## Validation & Error Handling

### Input Validation
- Vital signs have min/max constraints
- Diagnosis required before completion
- Patient selection required

### Error Messages
- Search errors: "Không thể tìm kiếm bệnh nhân"
- Save errors: "Lỗi khi lưu phiếu khám"
- Load errors: "Không thể tải danh sách chờ khám"

### Success Messages
- Save success: "Đã lưu phiếu khám"
- Complete success: "Đã hoàn thành khám bệnh"
- Patient selection: "Đã chọn bệnh nhân: {name}"

## Responsive Design

The layout adapts to different screen sizes:
- **Desktop (lg)**: Sidebar (6 cols) + Main area (18 cols)
- **Mobile (xs)**: Full width (24 cols) for both sections
- Tables have horizontal scroll for small screens
- Form inputs stack vertically on mobile

## Best Practices

1. **Auto-save**: Prevents data loss during long examinations
2. **Draft Status**: Allows resuming incomplete examinations
3. **Confirmation**: Requires confirmation before completing
4. **Search Optimization**: Multiple search methods for patient lookup
5. **History Access**: Quick access to patient's medical history
6. **Real-time Updates**: Queue updates after completion
7. **Type Safety**: Full TypeScript support with proper interfaces

## Future Enhancements

1. **Print Templates**: Custom print layouts for examination reports
2. **Digital Signatures**: E-signature integration for doctors
3. **Voice Input**: Voice-to-text for faster data entry
4. **Templates**: Common examination templates
5. **Clinical Decision Support**: AI-powered suggestions
6. **Multi-language**: Support for English and other languages
7. **Offline Mode**: Work offline and sync when connected
8. **Integration**: Connect with medical devices for auto-fill vital signs

## Notes

- The page uses React hooks for state management
- Form validation uses Ant Design's Form component
- Auto-complete components provide type-ahead search
- All dates use dayjs for consistent formatting
- The page is fully responsive and mobile-friendly
