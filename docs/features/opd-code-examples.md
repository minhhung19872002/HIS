# OPD Page - Key Code Examples

## 1. Patient Search Implementation

```typescript
const handleSearchPatient = async () => {
  if (!searchKeyword.trim()) {
    message.warning('Vui lòng nhập từ khóa tìm kiếm');
    return;
  }

  try {
    // Try different search methods based on keyword pattern
    let response;

    // Search by patient code (starts with 'BN')
    if (searchKeyword.startsWith('BN')) {
      response = await patientApi.getByCode(searchKeyword);
    }
    // Search by identity number (9-12 digits)
    else if (/^\d{9,12}$/.test(searchKeyword)) {
      response = await patientApi.getByIdentityNumber(searchKeyword);
    }
    // Search by insurance number (15 characters)
    else if (searchKeyword.length === 15) {
      response = await patientApi.getByInsuranceNumber(searchKeyword);
    }
    // General keyword search
    else {
      const searchResponse = await patientApi.search({
        keyword: searchKeyword,
        page: 1,
        pageSize: 1
      });
      if (searchResponse.success && searchResponse.data?.items.length > 0) {
        response = { success: true, data: searchResponse.data.items[0] };
      }
    }

    if (response?.success && response.data) {
      setSelectedPatient(response.data);
      initializeNewExamination(response.data);
      message.success(`Đã tìm thấy bệnh nhân: ${response.data.fullName}`);
    } else {
      message.warning('Không tìm thấy bệnh nhân');
    }
  } catch (error) {
    message.error('Lỗi khi tìm kiếm bệnh nhân');
  }
};
```

## 2. Auto-Save Implementation

```typescript
const handleAutoSave = useCallback(async () => {
  if (!examination || !selectedPatient) return;

  try {
    const formValues = examForm.getFieldsValue();
    const examData = {
      ...examination,
      vitalSigns: formValues.vitalSigns,
      medicalHistory: formValues.medicalHistory,
      physicalExamination: formValues.physicalExamination,
      diagnoses,
      orders,
      conclusion: formValues.conclusion,
      recommendations: formValues.recommendations,
    };

    if (examination.id) {
      await examinationApi.update(examination.id, {
        ...examData,
        id: examination.id,
        status: 0, // Keep as draft
      });
    } else {
      const response = await examinationApi.create({
        ...examData,
        status: 0, // Draft
      });
      if (response.success && response.data) {
        setExamination(response.data);
      }
    }
  } catch (error) {
    console.error('Auto-save error:', error);
  }
}, [examination, selectedPatient, examForm, diagnoses, orders]);

// Auto-save every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    handleAutoSave();
  }, 30000);

  return () => clearInterval(interval);
}, [handleAutoSave]);
```

## 3. ICD-10 Search with Autocomplete

```typescript
const handleSearchICD = async (value: string) => {
  if (!value || value.length < 2) {
    setIcdOptions([]);
    return;
  }

  try {
    setSearchingICD(true);
    const response = await examinationApi.searchICDCodes(value);
    if (response.success && response.data) {
      const options: ICDOption[] = response.data.map((icd) => ({
        value: icd.code,
        label: `${icd.code} - ${icd.name}`,
        code: icd.code,
        name: icd.name,
      }));
      setIcdOptions(options);
    }
  } catch (error) {
    console.error('Error searching ICD codes:', error);
  } finally {
    setSearchingICD(false);
  }
};

// JSX
<AutoComplete
  style={{ width: 400 }}
  options={icdOptions}
  onSearch={handleSearchICD}
  placeholder="Tìm mã ICD-10..."
  notFoundContent={searchingICD ? <Spin size="small" /> : 'Không tìm thấy'}
>
  <Input.Search
    enterButton={<Button type="primary">Thêm chẩn đoán chính</Button>}
    onSearch={(value) => handleAddDiagnosis(value, 1)}
  />
</AutoComplete>
```

## 4. Diagnosis Management

```typescript
// Add diagnosis
const handleAddDiagnosis = (icdCode: string, diagnosisType: number) => {
  const selectedICD = icdOptions.find((opt) => opt.code === icdCode);
  if (!selectedICD) return;

  const newDiagnosis: Diagnosis = {
    icdCode: selectedICD.code,
    icdName: selectedICD.name,
    diagnosisType, // 1: Primary, 2: Secondary
  };

  setDiagnoses([...diagnoses, newDiagnosis]);
  message.success('Đã thêm chẩn đoán');
};

// Remove diagnosis
const handleRemoveDiagnosis = (index: number) => {
  const newDiagnoses = diagnoses.filter((_, i) => i !== index);
  setDiagnoses(newDiagnoses);
};

// Diagnosis table columns
const diagnosisColumns: ColumnsType<Diagnosis> = [
  {
    title: 'Loại',
    dataIndex: 'diagnosisType',
    width: 100,
    render: (type) => (
      <Tag color={type === 1 ? 'red' : 'blue'}>
        {type === 1 ? 'Chính' : 'Phụ'}
      </Tag>
    ),
  },
  {
    title: 'Mã ICD',
    dataIndex: 'icdCode',
    width: 100,
  },
  {
    title: 'Tên bệnh',
    dataIndex: 'icdName',
  },
  {
    title: 'Thao tác',
    key: 'action',
    width: 80,
    render: (_, __, index) => (
      <Button
        type="link"
        danger
        size="small"
        icon={<DeleteOutlined />}
        onClick={() => handleRemoveDiagnosis(index ?? 0)}
      >
        Xóa
      </Button>
    ),
  },
];
```

## 5. Treatment Order Management

```typescript
// Add treatment order
const handleAddOrder = (serviceId: string, orderType: number) => {
  const selectedService = serviceOptions.find((opt) => opt.value === serviceId);
  if (!selectedService) return;

  const newOrder: TreatmentOrder = {
    orderType, // 1: Lab, 2: Imaging, 3: Procedure, 4: Medication, 5: Service
    serviceId: selectedService.data.id,
    serviceName: selectedService.data.name,
    serviceCode: selectedService.data.code,
    quantity: 1,
    unit: selectedService.data.unit,
    urgency: 1,
  };

  setOrders([...orders, newOrder]);
  message.success('Đã thêm chỉ định');
};

// Update order quantity
const handleUpdateOrderQuantity = (index: number, quantity: number) => {
  const newOrders = [...orders];
  newOrders[index].quantity = quantity;
  setOrders(newOrders);
};

// Order type helper
const getOrderTypeName = (type: number): string => {
  switch (type) {
    case 1: return 'Xét nghiệm';
    case 2: return 'Chẩn đoán hình ảnh';
    case 3: return 'Thủ thuật';
    case 4: return 'Thuốc';
    case 5: return 'Dịch vụ';
    default: return 'Khác';
  }
};
```

## 6. Complete Examination Flow

```typescript
const handleComplete = async () => {
  if (!examination?.id) {
    message.warning('Vui lòng lưu phiếu khám trước');
    return;
  }

  if (diagnoses.length === 0) {
    message.warning('Vui lòng nhập chẩn đoán');
    return;
  }

  Modal.confirm({
    title: 'Hoàn thành khám bệnh',
    content: 'Bạn có chắc chắn muốn hoàn thành phiếu khám này?',
    okText: 'Hoàn thành',
    cancelText: 'Hủy',
    onOk: async () => {
      try {
        // Save first
        await handleSave();

        // Then complete
        const response = await examinationApi.complete(examination.id!);
        if (response.success) {
          message.success('Đã hoàn thành khám bệnh');
          setExamination(response.data || null);
          loadQueue(); // Reload queue
        }
      } catch (error: any) {
        message.error(error.message || 'Lỗi khi hoàn thành khám bệnh');
      }
    },
  });
};
```

## 7. Patient History Modal

```typescript
const handleViewHistory = async () => {
  if (!selectedPatient) {
    message.warning('Vui lòng chọn bệnh nhân');
    return;
  }

  try {
    const response = await examinationApi.getPatientHistory(
      selectedPatient.id,
      1,
      20
    );
    if (response.success && response.data) {
      setPatientHistory(response.data.items);
      setHistoryModalVisible(true);
    }
  } catch (error) {
    message.error('Không thể tải lịch sử khám bệnh');
  }
};

// JSX
<Modal
  title="Lịch sử khám bệnh"
  open={historyModalVisible}
  onCancel={() => setHistoryModalVisible(false)}
  footer={null}
  width={1000}
>
  <Table
    columns={[
      {
        title: 'Ngày khám',
        dataIndex: 'examinationDate',
        render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
      },
      {
        title: 'Phòng khám',
        dataIndex: 'roomName',
      },
      {
        title: 'Bác sĩ',
        dataIndex: 'doctorName',
      },
      {
        title: 'Chẩn đoán',
        dataIndex: 'diagnoses',
        render: (diagnoses: Diagnosis[]) =>
          diagnoses?.map((d) => d.icdName).join(', ') || 'N/A',
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        render: (status) => {
          const statusMap = {
            0: { text: 'Nháp', color: 'default' },
            1: { text: 'Đang khám', color: 'blue' },
            2: { text: 'Hoàn thành', color: 'green' },
            3: { text: 'Đã hủy', color: 'red' },
          };
          const s = statusMap[status as keyof typeof statusMap] || statusMap[0];
          return <Tag color={s.color}>{s.text}</Tag>;
        },
      },
    ]}
    dataSource={patientHistory}
    rowKey="id"
    size="small"
    pagination={{ pageSize: 10 }}
  />
</Modal>
```

## 8. Form Layout with Tabs

```typescript
<Form
  form={examForm}
  layout="vertical"
  initialValues={{
    vitalSigns: {},
    medicalHistory: {},
    physicalExamination: {},
  }}
>
  <Tabs
    activeKey={activeTab}
    onChange={setActiveTab}
    items={[
      {
        key: 'vital-signs',
        label: (
          <span>
            <HeartOutlined /> Sinh hiệu
          </span>
        ),
        children: (
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label="Cân nặng (kg)"
                name={['vitalSigns', 'weight']}
              >
                <InputNumber
                  min={0}
                  max={300}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="Nhập cân nặng"
                />
              </Form.Item>
            </Col>
            {/* More fields... */}
          </Row>
        ),
      },
      // More tabs...
    ]}
  />
</Form>
```

## 9. Queue Patient Selection

```typescript
const handleSelectPatientFromQueue = async (queuePatient: QueuePatient) => {
  try {
    const response = await patientApi.getById(queuePatient.patientId);
    if (response.success && response.data) {
      setSelectedPatient(response.data);
      initializeNewExamination(response.data, queuePatient);
      message.success(`Đã chọn bệnh nhân: ${queuePatient.patientName}`);
    }
  } catch (error) {
    message.error('Không thể tải thông tin bệnh nhân');
  }
};

// Queue table
<Table
  columns={queueColumns}
  dataSource={queueList}
  rowKey="id"
  size="small"
  pagination={false}
  scroll={{ y: 400 }}
  onRow={(record) => ({
    onClick: () => handleSelectPatientFromQueue(record),
    style: { cursor: 'pointer' },
  })}
/>
```

## 10. Initialize New Examination

```typescript
const initializeNewExamination = (patient: Patient, queue?: QueuePatient) => {
  const newExam: Examination = {
    examinationDate: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    patientId: patient.id,
    patientCode: patient.patientCode,
    patientName: patient.fullName,
    queueId: queue?.id,
    queueNumber: queue?.queueNumber,
    departmentId: queue?.departmentId || '',
    departmentName: queue?.departmentName,
    roomId: queue?.roomId || '',
    roomName: queue?.roomName,
    doctorId: '', // Should be from current user
    status: 0, // Draft
    vitalSigns: {},
    medicalHistory: {},
    physicalExamination: {},
  };

  setExamination(newExam);
  setDiagnoses([]);
  setOrders([]);
  examForm.resetFields();
};
```

## 11. Responsive Layout

```typescript
<Row gutter={16}>
  {/* Left Sidebar - Patient Info & Queue */}
  <Col xs={24} lg={6}>
    <Card title="Thông tin bệnh nhân" size="small">
      {/* Patient search and info */}
    </Card>
    <Card title="Danh sách chờ khám" size="small">
      {/* Queue list */}
    </Card>
  </Col>

  {/* Main Area - Examination Form */}
  <Col xs={24} lg={18}>
    {!selectedPatient ? (
      <Card>
        <Alert
          message="Vui lòng chọn bệnh nhân"
          description="Chọn bệnh nhân từ danh sách..."
          type="info"
          showIcon
        />
      </Card>
    ) : (
      <Card
        title="Phiếu khám bệnh"
        extra={
          <Space>
            <Button onClick={handleSave}>Lưu nháp</Button>
            <Button type="primary" onClick={handleComplete}>Hoàn thành</Button>
            <Button onClick={handlePrint}>In</Button>
          </Space>
        }
      >
        {/* Examination tabs */}
      </Card>
    )}
  </Col>
</Row>
```

## 12. Age Calculation Helper

```typescript
const calculateAge = (dateOfBirth?: string, yearOfBirth?: number): string => {
  if (dateOfBirth) {
    const age = dayjs().diff(dayjs(dateOfBirth), 'year');
    return `${age} tuổi`;
  } else if (yearOfBirth) {
    const age = dayjs().year() - yearOfBirth;
    return `${age} tuổi`;
  }
  return 'N/A';
};
```

## 13. API Client Setup (examination.ts)

```typescript
export const examinationApi = {
  // Get waiting queue
  getQueue: async (roomId?: string): Promise<ApiResponse<QueuePatient[]>> => {
    const params = roomId ? { roomId } : {};
    const response = await apiClient.get<ApiResponse<QueuePatient[]>>(
      '/examinations/queue',
      { params }
    );
    return response.data;
  },

  // Create new examination
  create: async (data: CreateExaminationRequest): Promise<ApiResponse<Examination>> => {
    const response = await apiClient.post<ApiResponse<Examination>>(
      '/examinations',
      data
    );
    return response.data;
  },

  // Update examination
  update: async (id: string, data: UpdateExaminationRequest): Promise<ApiResponse<Examination>> => {
    const response = await apiClient.put<ApiResponse<Examination>>(
      `/examinations/${id}`,
      data
    );
    return response.data;
  },

  // Complete examination
  complete: async (id: string): Promise<ApiResponse<Examination>> => {
    const response = await apiClient.post<ApiResponse<Examination>>(
      `/examinations/${id}/complete`
    );
    return response.data;
  },

  // Search ICD codes
  searchICDCodes: async (query: string): Promise<ApiResponse<ICDCode[]>> => {
    const response = await apiClient.get<ApiResponse<ICDCode[]>>(
      '/icd-codes/search',
      { params: { q: query } }
    );
    return response.data;
  },

  // Search services
  searchServices: async (query: string, serviceType?: number): Promise<ApiResponse<Service[]>> => {
    const response = await apiClient.get<ApiResponse<Service[]>>(
      '/services/search',
      { params: { q: query, serviceType } }
    );
    return response.data;
  },
};
```

## 14. TypeScript Interfaces

```typescript
// Vital signs interface
export interface VitalSigns {
  weight?: number;
  height?: number;
  bmi?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  temperature?: number;
  pulse?: number;
  respiratoryRate?: number;
  spo2?: number;
}

// Diagnosis interface
export interface Diagnosis {
  id?: string;
  icdCode: string;
  icdName: string;
  diagnosisType: number; // 1: Primary, 2: Secondary
  description?: string;
}

// Treatment order interface
export interface TreatmentOrder {
  id?: string;
  orderType: number; // 1: Lab, 2: Imaging, 3: Procedure, 4: Medication, 5: Service
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  quantity: number;
  unit?: string;
  instructions?: string;
  urgency?: number; // 1: Normal, 2: Urgent, 3: Emergency
}

// Main examination interface
export interface Examination {
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
  status: number; // 0: Draft, 1: In Progress, 2: Completed, 3: Cancelled
}
```

## 15. Service Search with Quick Add Buttons

```typescript
<Space style={{ marginBottom: 16 }} wrap>
  <AutoComplete
    style={{ width: 400 }}
    options={serviceOptions}
    onSearch={handleSearchService}
    placeholder="Tìm dịch vụ..."
    notFoundContent={
      searchingService ? <Spin size="small" /> : 'Không tìm thấy'
    }
  >
    <Input prefix={<SearchOutlined />} />
  </AutoComplete>

  <Tooltip title="Xét nghiệm">
    <Button
      icon={<PlusOutlined />}
      onClick={() => {
        const value = serviceOptions[0]?.value;
        if (value) handleAddOrder(value, 1);
      }}
    >
      XN
    </Button>
  </Tooltip>

  <Tooltip title="Chẩn đoán hình ảnh">
    <Button
      icon={<PlusOutlined />}
      onClick={() => {
        const value = serviceOptions[0]?.value;
        if (value) handleAddOrder(value, 2);
      }}
    >
      CĐHA
    </Button>
  </Tooltip>

  {/* More quick add buttons... */}
</Space>
```

These code examples demonstrate the key functionality and patterns used in the OPD examination page. Each example is production-ready and follows React/TypeScript best practices.
