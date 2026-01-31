import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Table,
  Space,
  Typography,
  Divider,
  Tag,
  Alert,
  Modal,
  AutoComplete,
  Popconfirm,
  Badge,
  List,
  message,
  Descriptions,
  Drawer,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  PrinterOutlined,
  SendOutlined,
  WarningOutlined,
  SearchOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// ==================== INTERFACES ====================

interface Patient {
  id: string;
  patientCode: string;
  fullName: string;
  dateOfBirth?: string;
  gender: number;
  phoneNumber?: string;
  address?: string;
  allergies?: string[];
  currentMedications?: string[];
  insuranceNumber?: string;
}

interface Medicine {
  id: string;
  code: string;
  name: string;
  activeIngredient: string;
  dosageForm: string;
  strength: string;
  unit: string;
  unitPrice: number;
  stock: number;
  manufacturer?: string;
  insuranceCovered: boolean;
}

interface DosageInstruction {
  morning: number;
  noon: number;
  evening: number;
  night: number;
  beforeMeal: boolean;
  afterMeal: boolean;
}

interface PrescriptionItem {
  id: string;
  medicine: Medicine;
  dosageForm: string;
  strength: string;
  quantity: number;
  dosage: DosageInstruction;
  duration: number;
  route: string;
  notes?: string;
  totalDose: number;
  totalCost: number;
  insuranceCoverage: number;
}

interface DrugInteraction {
  medicine1: string;
  medicine2: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation?: string;
}

interface PrescriptionTemplate {
  id: string;
  name: string;
  diagnosis: string;
  items: Omit<PrescriptionItem, 'id'>[];
}

interface Prescription {
  id?: string;
  patientId: string;
  examinationId?: string;
  prescriptionDate: string;
  diagnosis?: string;
  items: PrescriptionItem[];
  interactions: DrugInteraction[];
  totalCost: number;
  insuranceCoverage: number;
  finalCost: number;
  notes?: string;
  status: 'draft' | 'completed' | 'sent';
  overrideReason?: string;
}

// ==================== MOCK DATA ====================

const mockPatient: Patient = {
  id: '1',
  patientCode: 'BN26000001',
  fullName: 'Nguyễn Văn A',
  dateOfBirth: '1985-05-15',
  gender: 1,
  phoneNumber: '0912345678',
  address: 'Số 10, Phường Tân Định, Quận 1, TP.HCM',
  allergies: ['Penicillin', 'Aspirin'],
  currentMedications: ['Metformin 500mg - 2 viên/ngày'],
  insuranceNumber: 'DN1234567890',
};

const mockMedicines: Medicine[] = [
  {
    id: '1',
    code: 'PARA500',
    name: 'Paracetamol',
    activeIngredient: 'Paracetamol',
    dosageForm: 'Viên nén',
    strength: '500mg',
    unit: 'Viên',
    unitPrice: 500,
    stock: 1000,
    manufacturer: 'DHG Pharma',
    insuranceCovered: true,
  },
  {
    id: '2',
    code: 'AMOX500',
    name: 'Amoxicillin',
    activeIngredient: 'Amoxicillin',
    dosageForm: 'Viên nang',
    strength: '500mg',
    unit: 'Viên',
    unitPrice: 1200,
    stock: 500,
    manufacturer: 'Domesco',
    insuranceCovered: true,
  },
  {
    id: '3',
    code: 'OMEP20',
    name: 'Omeprazole',
    activeIngredient: 'Omeprazole',
    dosageForm: 'Viên nang',
    strength: '20mg',
    unit: 'Viên',
    unitPrice: 2500,
    stock: 300,
    manufacturer: 'Teva',
    insuranceCovered: true,
  },
  {
    id: '4',
    code: 'IBUPR400',
    name: 'Ibuprofen',
    activeIngredient: 'Ibuprofen',
    dosageForm: 'Viên nén',
    strength: '400mg',
    unit: 'Viên',
    unitPrice: 800,
    stock: 800,
    manufacturer: 'Sanofi',
    insuranceCovered: true,
  },
  {
    id: '5',
    code: 'VITA-C',
    name: 'Vitamin C',
    activeIngredient: 'Acid ascorbic',
    dosageForm: 'Viên sủi',
    strength: '1000mg',
    unit: 'Viên',
    unitPrice: 3000,
    stock: 200,
    manufacturer: 'Roche',
    insuranceCovered: false,
  },
];

const mockTemplates: PrescriptionTemplate[] = [
  {
    id: '1',
    name: 'Cảm cúm thông thường',
    diagnosis: 'Nhiễm khuẩn đường hô hấp trên',
    items: [],
  },
  {
    id: '2',
    name: 'Viêm họng cấp',
    diagnosis: 'Viêm họng do vi khuẩn',
    items: [],
  },
  {
    id: '3',
    name: 'Đau dạ dày',
    diagnosis: 'Viêm loét dạ dày',
    items: [],
  },
];

// ==================== HELPER FUNCTIONS ====================

const calculateTotalDose = (dosage: DosageInstruction, duration: number): number => {
  const dailyDose = dosage.morning + dosage.noon + dosage.evening + dosage.night;
  return dailyDose * duration;
};

const calculateCost = (
  quantity: number,
  unitPrice: number,
  insuranceCovered: boolean,
  insuranceRate: number = 0.8
): { total: number; insurance: number; final: number } => {
  const total = quantity * unitPrice;
  const insurance = insuranceCovered ? total * insuranceRate : 0;
  const final = total - insurance;
  return { total, insurance, final };
};

const formatDosage = (dosage: DosageInstruction): string => {
  const parts: string[] = [];
  if (dosage.morning > 0) parts.push(`Sáng: ${dosage.morning}`);
  if (dosage.noon > 0) parts.push(`Trưa: ${dosage.noon}`);
  if (dosage.evening > 0) parts.push(`Chiều: ${dosage.evening}`);
  if (dosage.night > 0) parts.push(`Tối: ${dosage.night}`);

  let result = parts.join(', ');
  if (dosage.beforeMeal) result += ' (Trước ăn)';
  else if (dosage.afterMeal) result += ' (Sau ăn)';

  return result;
};

const checkDrugInteractions = (medicines: Medicine[]): DrugInteraction[] => {
  // Mock interaction check - in real app, this would call the API
  const interactions: DrugInteraction[] = [];

  // Example: Check for specific interactions
  const hasAspirin = medicines.some(m => m.activeIngredient.toLowerCase().includes('aspirin'));
  const hasIbuprofen = medicines.some(m => m.activeIngredient.toLowerCase().includes('ibuprofen'));

  if (hasAspirin && hasIbuprofen) {
    interactions.push({
      medicine1: 'Aspirin',
      medicine2: 'Ibuprofen',
      severity: 'medium',
      description: 'Tương tác giữa Aspirin và Ibuprofen có thể làm giảm hiệu quả của Aspirin trong việc bảo vệ tim mạch.',
      recommendation: 'Nên cách nhau ít nhất 2 giờ khi dùng hai thuốc này.',
    });
  }

  return interactions;
};

// ==================== MAIN COMPONENT ====================

const Prescription: React.FC = () => {
  const [form] = Form.useForm();
  const [medicineForm] = Form.useForm();

  // State
  const [patient, _setPatient] = useState<Patient | null>(mockPatient);
  void _setPatient;
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<PrescriptionItem | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [medicineSearchResults, setMedicineSearchResults] = useState<Medicine[]>([]);
  const [isInteractionDrawerOpen, setIsInteractionDrawerOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Calculate totals
  const totalCost = prescriptionItems.reduce((sum, item) => sum + item.totalCost, 0);
  const totalInsurance = prescriptionItems.reduce((sum, item) => sum + item.insuranceCoverage, 0);
  const finalCost = totalCost - totalInsurance;

  // Check interactions when items change
  useEffect(() => {
    if (prescriptionItems.length > 0) {
      const medicines = prescriptionItems.map(item => item.medicine);
      const foundInteractions = checkDrugInteractions(medicines);
      setInteractions(foundInteractions);
    } else {
      setInteractions([]);
    }
  }, [prescriptionItems]);

  // ==================== HANDLERS ====================

  const handleSearchMedicine = (value: string) => {
    if (!value) {
      setMedicineSearchResults([]);
      return;
    }

    // Mock search - filter medicines by name or code
    const results = mockMedicines.filter(
      m =>
        m.name.toLowerCase().includes(value.toLowerCase()) ||
        m.code.toLowerCase().includes(value.toLowerCase()) ||
        m.activeIngredient.toLowerCase().includes(value.toLowerCase())
    );
    setMedicineSearchResults(results);
  };

  const handleSelectMedicine = (medicineId: string) => {
    const medicine = mockMedicines.find(m => m.id === medicineId);
    if (medicine) {
      setSelectedMedicine(medicine);
      medicineForm.setFieldsValue({
        medicine: medicine.name,
        dosageForm: medicine.dosageForm,
        strength: medicine.strength,
        route: 'Uống',
      });
    }
  };

  const handleAddMedicine = () => {
    medicineForm.validateFields().then((values) => {
      if (!selectedMedicine) {
        message.error('Vui lòng chọn thuốc');
        return;
      }

      const dosage: DosageInstruction = {
        morning: values.morning || 0,
        noon: values.noon || 0,
        evening: values.evening || 0,
        night: values.night || 0,
        beforeMeal: values.mealTiming === 'before',
        afterMeal: values.mealTiming === 'after',
      };

      const totalDose = calculateTotalDose(dosage, values.duration);
      const costs = calculateCost(
        values.quantity,
        selectedMedicine.unitPrice,
        selectedMedicine.insuranceCovered && !!patient?.insuranceNumber
      );

      const newItem: PrescriptionItem = {
        id: Date.now().toString(),
        medicine: selectedMedicine,
        dosageForm: values.dosageForm,
        strength: values.strength,
        quantity: values.quantity,
        dosage,
        duration: values.duration,
        route: values.route,
        notes: values.notes,
        totalDose,
        totalCost: costs.total,
        insuranceCoverage: costs.insurance,
      };

      if (isEditMode && editingItem) {
        setPrescriptionItems(prev =>
          prev.map(item => (item.id === editingItem.id ? newItem : item))
        );
        message.success('Cập nhật thuốc thành công');
      } else {
        setPrescriptionItems(prev => [...prev, newItem]);
        message.success('Thêm thuốc thành công');
      }

      handleCloseAddMedicineModal();
    });
  };

  const handleEditItem = (item: PrescriptionItem) => {
    setEditingItem(item);
    setIsEditMode(true);
    setSelectedMedicine(item.medicine);
    medicineForm.setFieldsValue({
      medicine: item.medicine.name,
      dosageForm: item.dosageForm,
      strength: item.strength,
      quantity: item.quantity,
      morning: item.dosage.morning,
      noon: item.dosage.noon,
      evening: item.dosage.evening,
      night: item.dosage.night,
      mealTiming: item.dosage.beforeMeal ? 'before' : item.dosage.afterMeal ? 'after' : undefined,
      duration: item.duration,
      route: item.route,
      notes: item.notes,
    });
    setIsAddMedicineModalOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    setPrescriptionItems(prev => prev.filter(item => item.id !== id));
    message.success('Xóa thuốc thành công');
  };

  const handleCloseAddMedicineModal = () => {
    setIsAddMedicineModalOpen(false);
    setIsEditMode(false);
    setEditingItem(null);
    setSelectedMedicine(null);
    medicineForm.resetFields();
    setMedicineSearchResults([]);
  };

  const handleLoadTemplate = (template: PrescriptionTemplate) => {
    // In real app, load template items
    message.success(`Đã tải mẫu đơn: ${template.name}`);
    form.setFieldsValue({ diagnosis: template.diagnosis });
    setIsTemplateModalOpen(false);
  };

  const handleSaveTemplate = () => {
    if (prescriptionItems.length === 0) {
      message.error('Đơn thuốc chưa có thuốc nào');
      return;
    }
    setIsSaveTemplateModalOpen(true);
  };

  const handleSaveDraft = () => {
    message.success('Đã lưu đơn thuốc nháp');
  };

  const handleCompletePrescription = () => {
    if (prescriptionItems.length === 0) {
      message.error('Đơn thuốc chưa có thuốc nào');
      return;
    }

    if (interactions.some(i => i.severity === 'high') && !overrideReason) {
      Modal.confirm({
        title: 'Cảnh báo tương tác thuốc nghiêm trọng',
        content: 'Có tương tác thuốc nghiêm trọng. Vui lòng nhập lý do ghi đè.',
        okText: 'Nhập lý do',
        cancelText: 'Hủy',
        onOk: () => {
          setIsInteractionDrawerOpen(true);
        },
      });
      return;
    }

    message.success('Hoàn thành đơn thuốc thành công');
  };

  const handlePrintPrescription = () => {
    if (prescriptionItems.length === 0) {
      message.error('Đơn thuốc chưa có thuốc nào');
      return;
    }
    message.info('Chức năng in đơn thuốc');
  };

  const handleSendToPharmacy = () => {
    if (prescriptionItems.length === 0) {
      message.error('Đơn thuốc chưa có thuốc nào');
      return;
    }
    Modal.confirm({
      title: 'Gửi đơn thuốc đến nhà thuốc',
      content: 'Bạn có chắc chắn muốn gửi đơn thuốc này đến nhà thuốc?',
      okText: 'Gửi',
      cancelText: 'Hủy',
      onOk: () => {
        message.success('Đã gửi đơn thuốc đến nhà thuốc');
      },
    });
  };

  // ==================== TABLE COLUMNS ====================

  const columns: ColumnsType<PrescriptionItem> = [
    {
      title: 'STT',
      width: 50,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Tên thuốc',
      dataIndex: ['medicine', 'name'],
      key: 'name',
      width: 200,
      render: (name, record) => (
        <div>
          <div><strong>{name}</strong></div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.medicine.activeIngredient}
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Mã: {record.medicine.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Dạng bào chế / Hàm lượng',
      key: 'form',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.dosageForm}</div>
          <Text type="secondary">{record.strength}</Text>
        </div>
      ),
    },
    {
      title: 'Liều dùng',
      dataIndex: 'dosage',
      key: 'dosage',
      width: 200,
      render: (dosage: DosageInstruction) => (
        <div style={{ fontSize: 12 }}>
          {formatDosage(dosage)}
        </div>
      ),
    },
    {
      title: 'Số ngày',
      dataIndex: 'duration',
      key: 'duration',
      width: 70,
      align: 'center',
      render: (duration) => `${duration} ngày`,
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
      render: (quantity, record) => `${quantity} ${record.medicine.unit}`,
    },
    {
      title: 'Đường dùng',
      dataIndex: 'route',
      key: 'route',
      width: 80,
    },
    {
      title: 'Thành tiền',
      key: 'cost',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <div>
          <div>{record.totalCost.toLocaleString('vi-VN')} đ</div>
          {record.insuranceCoverage > 0 && (
            <Text type="success" style={{ fontSize: 12 }}>
              BHYT: -{record.insuranceCoverage.toLocaleString('vi-VN')} đ
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditItem(record)}
          />
          <Popconfirm
            title="Xóa thuốc này?"
            onConfirm={() => handleDeleteItem(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ==================== RENDER ====================

  return (
    <div>
      <Title level={4}>Kê đơn thuốc</Title>

      <Row gutter={16}>
        {/* LEFT PANEL - Patient Info */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <InfoCircleOutlined />
                <span>Thông tin bệnh nhân</span>
              </Space>
            }
            size="small"
            style={{ marginBottom: 16 }}
          >
            {patient ? (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Mã BN">
                  <strong>{patient.patientCode}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Họ tên">
                  <strong>{patient.fullName}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày sinh">
                  {patient.dateOfBirth && dayjs(patient.dateOfBirth).format('DD/MM/YYYY')}
                  {' - '}
                  {patient.gender === 1 ? 'Nam' : 'Nữ'}
                </Descriptions.Item>
                <Descriptions.Item label="SĐT">{patient.phoneNumber}</Descriptions.Item>
                <Descriptions.Item label="Địa chỉ">{patient.address}</Descriptions.Item>
                {patient.insuranceNumber && (
                  <Descriptions.Item label="Số thẻ BHYT">
                    <Tag color="green">{patient.insuranceNumber}</Tag>
                  </Descriptions.Item>
                )}
              </Descriptions>
            ) : (
              <Button block icon={<SearchOutlined />}>
                Tìm bệnh nhân
              </Button>
            )}
          </Card>

          {patient && (
            <>
              {/* Allergies */}
              {patient.allergies && patient.allergies.length > 0 && (
                <Card
                  title={<span style={{ color: '#ff4d4f' }}>⚠ Dị ứng</span>}
                  size="small"
                  style={{ marginBottom: 16 }}
                >
                  <Space wrap>
                    {patient.allergies.map((allergy, index) => (
                      <Tag color="red" key={index}>
                        {allergy}
                      </Tag>
                    ))}
                  </Space>
                </Card>
              )}

              {/* Current Medications */}
              {patient.currentMedications && patient.currentMedications.length > 0 && (
                <Card
                  title={<span style={{ color: '#1890ff' }}>Thuốc đang dùng</span>}
                  size="small"
                  style={{ marginBottom: 16 }}
                >
                  <List
                    size="small"
                    dataSource={patient.currentMedications}
                    renderItem={(item) => <List.Item>{item}</List.Item>}
                  />
                </Card>
              )}
            </>
          )}

          {/* Summary */}
          <Card
            title="Tổng kết đơn thuốc"
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Tổng số thuốc">
                <strong>{prescriptionItems.length}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền">
                <strong>{totalCost.toLocaleString('vi-VN')} đ</strong>
              </Descriptions.Item>
              {patient?.insuranceNumber && (
                <Descriptions.Item label="BHYT chi trả">
                  <Text type="success">
                    <strong>{totalInsurance.toLocaleString('vi-VN')} đ</strong>
                  </Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Bệnh nhân trả">
                <Text strong style={{ color: '#1890ff', fontSize: 16 }}>
                  {finalCost.toLocaleString('vi-VN')} đ
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Drug Interactions Warning */}
          {interactions.length > 0 && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Alert
                message={
                  <Space>
                    <span>Cảnh báo tương tác thuốc</span>
                    <Badge count={interactions.length} />
                  </Space>
                }
                description={
                  <div>
                    {interactions.map((interaction, index) => (
                      <div key={index} style={{ marginTop: 8 }}>
                        <Tag
                          color={
                            interaction.severity === 'high'
                              ? 'red'
                              : interaction.severity === 'medium'
                              ? 'orange'
                              : 'blue'
                          }
                        >
                          {interaction.severity === 'high'
                            ? 'Nghiêm trọng'
                            : interaction.severity === 'medium'
                            ? 'Trung bình'
                            : 'Nhẹ'}
                        </Tag>
                        <Text strong>
                          {interaction.medicine1} ↔ {interaction.medicine2}
                        </Text>
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          {interaction.description}
                        </div>
                      </div>
                    ))}
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setIsInteractionDrawerOpen(true)}
                      style={{ marginTop: 8, padding: 0 }}
                    >
                      Xem chi tiết
                    </Button>
                  </div>
                }
                type="warning"
                showIcon
                icon={<WarningOutlined />}
              />
            </Card>
          )}
        </Col>

        {/* RIGHT PANEL - Prescription Form */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <MedicineBoxOutlined />
                <span>Đơn thuốc</span>
              </Space>
            }
            extra={
              <Space>
                <Button
                  icon={<FileTextOutlined />}
                  onClick={() => setIsTemplateModalOpen(true)}
                >
                  Mẫu đơn
                </Button>
                <Button icon={<SaveOutlined />} onClick={handleSaveTemplate}>
                  Lưu mẫu
                </Button>
              </Space>
            }
          >
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item label="Chẩn đoán" name="diagnosis">
                    <Input placeholder="Nhập chẩn đoán" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>

            <Divider>Danh sách thuốc</Divider>

            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => setIsAddMedicineModalOpen(true)}
              style={{ marginBottom: 16 }}
            >
              Thêm thuốc
            </Button>

            <Table
              columns={columns}
              dataSource={prescriptionItems}
              rowKey="id"
              size="small"
              scroll={{ x: 1200 }}
              pagination={false}
              locale={{ emptyText: 'Chưa có thuốc nào trong đơn' }}
            />

            <Divider />

            <Form.Item label="Ghi chú thêm">
              <TextArea
                rows={3}
                placeholder="Lời dặn cho bệnh nhân..."
                maxLength={500}
              />
            </Form.Item>

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button icon={<SaveOutlined />} onClick={handleSaveDraft}>
                Lưu nháp
              </Button>
              <Button icon={<PrinterOutlined />} onClick={handlePrintPrescription}>
                In đơn
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleCompletePrescription}
              >
                Hoàn thành
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendToPharmacy}
                style={{ background: '#52c41a' }}
              >
                Gửi nhà thuốc
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Medicine Modal */}
      <Modal
        title={isEditMode ? 'Sửa thuốc' : 'Thêm thuốc'}
        open={isAddMedicineModalOpen}
        onOk={handleAddMedicine}
        onCancel={handleCloseAddMedicineModal}
        width={800}
        okText={isEditMode ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
      >
        <Form form={medicineForm} layout="vertical">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Tìm thuốc"
                name="medicine"
                rules={[{ required: true, message: 'Vui lòng chọn thuốc' }]}
              >
                <AutoComplete
                  options={medicineSearchResults.map(m => ({
                    value: m.id,
                    label: (
                      <div>
                        <div>
                          <strong>{m.name}</strong> - {m.strength}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {m.activeIngredient} | Mã: {m.code} | Tồn: {m.stock} {m.unit}
                        </Text>
                      </div>
                    ),
                  }))}
                  onSearch={handleSearchMedicine}
                  onSelect={handleSelectMedicine}
                  placeholder="Tìm theo tên thuốc, mã thuốc, hoạt chất..."
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          {selectedMedicine && (
            <>
              <Alert
                message={
                  <div>
                    <div>
                      <strong>{selectedMedicine.name}</strong> - {selectedMedicine.strength}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      Đơn giá: {selectedMedicine.unitPrice.toLocaleString('vi-VN')} đ/{selectedMedicine.unit}
                      {' | '}
                      Tồn kho: {selectedMedicine.stock} {selectedMedicine.unit}
                      {' | '}
                      {selectedMedicine.insuranceCovered ? (
                        <Tag color="green">BHYT</Tag>
                      ) : (
                        <Tag>Tự túc</Tag>
                      )}
                    </div>
                  </div>
                }
                type="info"
                style={{ marginBottom: 16 }}
              />

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Dạng bào chế"
                    name="dosageForm"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Chọn dạng bào chế">
                      <Option value="Viên nén">Viên nén</Option>
                      <Option value="Viên nang">Viên nang</Option>
                      <Option value="Viên sủi">Viên sủi</Option>
                      <Option value="Siro">Siro</Option>
                      <Option value="Ống tiêm">Ống tiêm</Option>
                      <Option value="Chai">Chai</Option>
                      <Option value="Ống">Ống</Option>
                      <Option value="Gói">Gói</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Hàm lượng" name="strength" rules={[{ required: true }]}>
                    <Input placeholder="VD: 500mg" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider>Liều dùng (số viên mỗi lần)</Divider>

              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item label="Sáng" name="morning" initialValue={0}>
                    <InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Trưa" name="noon" initialValue={0}>
                    <InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Chiều" name="evening" initialValue={0}>
                    <InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Tối" name="night" initialValue={0}>
                    <InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Thời điểm dùng" name="mealTiming">
                    <Select placeholder="Chọn" allowClear>
                      <Option value="before">Trước ăn</Option>
                      <Option value="after">Sau ăn</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Số ngày uống"
                    name="duration"
                    rules={[{ required: true }]}
                    initialValue={7}
                  >
                    <InputNumber min={1} max={90} style={{ width: '100%' }} addonAfter="ngày" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Số lượng"
                    name="quantity"
                    rules={[{ required: true }]}
                  >
                    <InputNumber
                      min={1}
                      max={selectedMedicine.stock}
                      style={{ width: '100%' }}
                      addonAfter={selectedMedicine.unit}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Đường dùng"
                    name="route"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Chọn đường dùng">
                      <Option value="Uống">Uống</Option>
                      <Option value="Tiêm tĩnh mạch">Tiêm tĩnh mạch</Option>
                      <Option value="Tiêm bắp">Tiêm bắp</Option>
                      <Option value="Bôi">Bôi ngoài da</Option>
                      <Option value="Nhỏ mắt">Nhỏ mắt</Option>
                      <Option value="Nhỏ tai">Nhỏ tai</Option>
                      <Option value="Xịt mũi">Xịt mũi</Option>
                      <Option value="Đặt">Đặt</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Ghi chú / Hướng dẫn" name="notes">
                <TextArea
                  rows={2}
                  placeholder="VD: Uống khi đói, Uống nhiều nước, Không dùng cho phụ nữ có thai..."
                  maxLength={200}
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* Template Modal */}
      <Modal
        title="Chọn mẫu đơn thuốc"
        open={isTemplateModalOpen}
        onCancel={() => setIsTemplateModalOpen(false)}
        footer={null}
        width={600}
      >
        <List
          dataSource={mockTemplates}
          renderItem={(template) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  onClick={() => handleLoadTemplate(template)}
                  key="load"
                >
                  Tải mẫu
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={template.name}
                description={`Chẩn đoán: ${template.diagnosis}`}
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* Save Template Modal */}
      <Modal
        title="Lưu mẫu đơn thuốc"
        open={isSaveTemplateModalOpen}
        onCancel={() => setIsSaveTemplateModalOpen(false)}
        onOk={() => {
          message.success('Đã lưu mẫu đơn thuốc');
          setIsSaveTemplateModalOpen(false);
        }}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form layout="vertical">
          <Form.Item label="Tên mẫu" required>
            <Input placeholder="VD: Cảm cúm thông thường" />
          </Form.Item>
          <Form.Item label="Chẩn đoán" required>
            <Input placeholder="VD: Nhiễm khuẩn đường hô hấp trên" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Interaction Detail Drawer */}
      <Drawer
        title="Chi tiết tương tác thuốc"
        placement="right"
        onClose={() => setIsInteractionDrawerOpen(false)}
        open={isInteractionDrawerOpen}
        width={500}
      >
        {interactions.map((interaction, index) => (
          <Card key={index} style={{ marginBottom: 16 }} size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Tag
                  color={
                    interaction.severity === 'high'
                      ? 'red'
                      : interaction.severity === 'medium'
                      ? 'orange'
                      : 'blue'
                  }
                >
                  {interaction.severity === 'high'
                    ? 'Nghiêm trọng'
                    : interaction.severity === 'medium'
                    ? 'Trung bình'
                    : 'Nhẹ'}
                </Tag>
              </div>
              <Text strong>
                {interaction.medicine1} ↔ {interaction.medicine2}
              </Text>
              <div>
                <Text strong>Mô tả:</Text>
                <div>{interaction.description}</div>
              </div>
              {interaction.recommendation && (
                <div>
                  <Text strong>Khuyến nghị:</Text>
                  <div style={{ color: '#1890ff' }}>{interaction.recommendation}</div>
                </div>
              )}
            </Space>
          </Card>
        ))}

        {interactions.some(i => i.severity === 'high') && (
          <Card size="small" style={{ marginTop: 16 }}>
            <Text strong>Lý do ghi đè:</Text>
            <TextArea
              rows={3}
              placeholder="Nhập lý do cho việc tiếp tục kê đơn mặc dù có tương tác nghiêm trọng..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              style={{ marginTop: 8 }}
            />
            <Button
              type="primary"
              block
              style={{ marginTop: 8 }}
              disabled={!overrideReason}
              onClick={() => {
                message.success('Đã ghi nhận lý do ghi đè');
                setIsInteractionDrawerOpen(false);
              }}
            >
              Xác nhận ghi đè
            </Button>
          </Card>
        )}
      </Drawer>
    </div>
  );
};

export default Prescription;
