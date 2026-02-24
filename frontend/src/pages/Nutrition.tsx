import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Tabs,
  Statistic,
  Progress,
  Descriptions,
  Timeline,
  Divider,
  message,
  Alert,
  InputNumber,
  Radio,
  Collapse,
} from 'antd';
import {
  AppleOutlined,
  AlertOutlined,
  UserOutlined,
  FileTextOutlined,
  PrinterOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Types
interface NutritionPatient {
  id: string;
  patientId: string;
  patientName: string;
  admissionId: string;
  department: string;
  bedNumber: string;
  admissionDate: string;
  diagnosis: string;
  screeningDate?: string;
  screeningScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  dietType?: string;
  mealPlan?: string;
  bmi?: number;
  weight?: number;
  height?: number;
  albumin?: number;
  status: 'pending_screening' | 'screened' | 'on_plan' | 'discharged';
}

interface NutritionPlan {
  id: string;
  patientId: string;
  startDate: string;
  endDate?: string;
  calorieTarget: number;
  proteinTarget: number;
  dietType: string;
  restrictions: string[];
  supplements?: string;
  feedingRoute: 'oral' | 'enteral' | 'parenteral' | 'mixed';
  notes?: string;
}

interface MealOrder {
  id: string;
  patientId: string;
  patientName: string;
  department: string;
  bedNumber: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dietType: string;
  deliveryTime: string;
  status: 'pending' | 'preparing' | 'delivered' | 'consumed';
  notes?: string;
}

// Mock data
const mockPatients: NutritionPatient[] = [
  {
    id: 'NP001',
    patientId: 'P001',
    patientName: 'Nguyen Van A',
    admissionId: 'ADM001',
    department: 'Noi khoa',
    bedNumber: 'A-101',
    admissionDate: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
    diagnosis: 'Tang huyet ap, Dai thao duong type 2',
    screeningDate: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    screeningScore: 3,
    riskLevel: 'medium',
    dietType: 'Che do an giam duong, giam muoi',
    bmi: 24.5,
    weight: 68,
    height: 167,
    albumin: 3.8,
    status: 'on_plan',
  },
  {
    id: 'NP002',
    patientId: 'P002',
    patientName: 'Tran Thi B',
    admissionId: 'ADM002',
    department: 'Ngoai khoa',
    bedNumber: 'B-205',
    admissionDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    diagnosis: 'Sau mo cat tui mat',
    screeningDate: dayjs().format('YYYY-MM-DD'),
    screeningScore: 5,
    riskLevel: 'high',
    dietType: 'Che do an long, chia nho bua',
    bmi: 18.5,
    weight: 45,
    height: 156,
    albumin: 2.9,
    status: 'on_plan',
  },
  {
    id: 'NP003',
    patientId: 'P003',
    patientName: 'Le Van C',
    admissionId: 'ADM003',
    department: 'Noi khoa',
    bedNumber: 'A-108',
    admissionDate: dayjs().format('YYYY-MM-DD'),
    diagnosis: 'Viem phoi',
    status: 'pending_screening',
  },
];

const mockMealOrders: MealOrder[] = [
  {
    id: 'MO001',
    patientId: 'P001',
    patientName: 'Nguyen Van A',
    department: 'Noi khoa',
    bedNumber: 'A-101',
    mealType: 'breakfast',
    dietType: 'Giam duong',
    deliveryTime: '07:00',
    status: 'delivered',
  },
  {
    id: 'MO002',
    patientId: 'P001',
    patientName: 'Nguyen Van A',
    department: 'Noi khoa',
    bedNumber: 'A-101',
    mealType: 'lunch',
    dietType: 'Giam duong',
    deliveryTime: '11:30',
    status: 'preparing',
  },
  {
    id: 'MO003',
    patientId: 'P002',
    patientName: 'Tran Thi B',
    department: 'Ngoai khoa',
    bedNumber: 'B-205',
    mealType: 'breakfast',
    dietType: 'An long',
    deliveryTime: '07:00',
    status: 'consumed',
    notes: 'An duoc 70%',
  },
];

const DIET_TYPES = [
  { value: 'normal', label: 'Che do an thuong' },
  { value: 'diabetes', label: 'Giam duong (Dai thao duong)' },
  { value: 'low_salt', label: 'Giam muoi (Tang huyet ap)' },
  { value: 'low_protein', label: 'Giam dam (Suy than)' },
  { value: 'liquid', label: 'An long' },
  { value: 'soft', label: 'An mem' },
  { value: 'post_surgery', label: 'Sau phau thuat' },
  { value: 'liver', label: 'Xo gan' },
  { value: 'tpn', label: 'Dinh duong tinh mach (TPN)' },
];

const Nutrition: React.FC = () => {
  const [patients, setPatients] = useState<NutritionPatient[]>(mockPatients);
  const [mealOrders, setMealOrders] = useState<MealOrder[]>(mockMealOrders);
  const [selectedPatient, setSelectedPatient] = useState<NutritionPatient | null>(null);
  const [isScreeningModalOpen, setIsScreeningModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [screeningForm] = Form.useForm();
  const [planForm] = Form.useForm();

  // Statistics
  const pendingScreening = patients.filter((p) => p.status === 'pending_screening').length;
  const highRiskCount = patients.filter((p) => p.riskLevel === 'high').length;
  const onPlanCount = patients.filter((p) => p.status === 'on_plan').length;

  const getRiskTag = (risk?: 'low' | 'medium' | 'high') => {
    if (!risk) return null;
    const config = {
      low: { color: 'green', text: 'Nguy co thap', icon: <CheckCircleOutlined /> },
      medium: { color: 'orange', text: 'Nguy co vua', icon: <ExclamationCircleOutlined /> },
      high: { color: 'red', text: 'Nguy co cao', icon: <WarningOutlined /> },
    };
    const c = config[risk];
    return (
      <Tag color={c.color} icon={c.icon}>
        {c.text}
      </Tag>
    );
  };

  const handleScreening = (values: any) => {
    if (!selectedPatient) return;

    // Calculate NRS-2002 score
    const totalScore =
      (values.bmiScore || 0) +
      (values.weightLossScore || 0) +
      (values.intakeScore || 0) +
      (values.diseaseScore || 0);

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (totalScore >= 3) riskLevel = 'high';
    else if (totalScore >= 2) riskLevel = 'medium';

    setPatients((prev) =>
      prev.map((p) =>
        p.id === selectedPatient.id
          ? {
              ...p,
              screeningDate: dayjs().format('YYYY-MM-DD'),
              screeningScore: totalScore,
              riskLevel,
              bmi: values.bmi,
              weight: values.weight,
              height: values.height,
              albumin: values.albumin,
              status: 'screened',
            }
          : p
      )
    );

    setIsScreeningModalOpen(false);
    screeningForm.resetFields();
    message.success(`Da hoan thanh sang loc - Nguy co: ${riskLevel.toUpperCase()}`);

    if (riskLevel !== 'low') {
      setIsPlanModalOpen(true);
    }
  };

  const handleCreatePlan = (values: any) => {
    if (!selectedPatient) return;

    setPatients((prev) =>
      prev.map((p) =>
        p.id === selectedPatient.id
          ? {
              ...p,
              dietType: DIET_TYPES.find((d) => d.value === values.dietType)?.label,
              status: 'on_plan',
            }
          : p
      )
    );

    setIsPlanModalOpen(false);
    planForm.resetFields();
    message.success('Da tao ke hoach dinh duong');
  };

  const executePrintMealPlan = () => {
    if (!selectedPatient) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phieu dinh duong</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
          .info-table { width: 100%; margin-bottom: 20px; }
          .info-table td { padding: 5px; }
          .meal-table { width: 100%; border-collapse: collapse; }
          .meal-table th, .meal-table td { border: 1px solid #000; padding: 8px; }
          .meal-table th { background: #f0f0f0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <strong>BENH VIEN DA KHOA</strong><br/>
          Khoa Dinh duong
        </div>

        <div class="title">PHIEU KE HOACH DINH DUONG</div>

        <table class="info-table">
          <tr>
            <td><strong>Ho ten:</strong> ${selectedPatient.patientName}</td>
            <td><strong>Giuong:</strong> ${selectedPatient.bedNumber}</td>
          </tr>
          <tr>
            <td><strong>Khoa:</strong> ${selectedPatient.department}</td>
            <td><strong>Nguy co:</strong> ${selectedPatient.riskLevel?.toUpperCase() || 'Chua danh gia'}</td>
          </tr>
          <tr>
            <td><strong>Chan doan:</strong> ${selectedPatient.diagnosis}</td>
            <td><strong>BMI:</strong> ${selectedPatient.bmi || '-'}</td>
          </tr>
          <tr>
            <td colspan="2"><strong>Che do an:</strong> ${selectedPatient.dietType || 'Chua chi dinh'}</td>
          </tr>
        </table>

        <table class="meal-table">
          <thead>
            <tr>
              <th>Bua an</th>
              <th>Gio</th>
              <th>Mon an</th>
              <th>Ghi chu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sang</td>
              <td>07:00</td>
              <td>Chao/Banh mi mem</td>
              <td></td>
            </tr>
            <tr>
              <td>Phu sang</td>
              <td>09:30</td>
              <td>Sua/Trai cay</td>
              <td></td>
            </tr>
            <tr>
              <td>Trua</td>
              <td>11:30</td>
              <td>Com/Chao + Thuc an</td>
              <td></td>
            </tr>
            <tr>
              <td>Phu chieu</td>
              <td>15:00</td>
              <td>Sua/Banh</td>
              <td></td>
            </tr>
            <tr>
              <td>Toi</td>
              <td>17:30</td>
              <td>Com/Chao + Thuc an</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 30px; text-align: right;">
          <p>Ngay ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Chuyen gia dinh duong</strong></p>
          <p style="margin-top: 50px;">___________________</p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const patientColumns: ColumnsType<NutritionPatient> = [
    {
      title: 'Benh nhan',
      key: 'patient',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.patientName}</Text>
          <Text type="secondary">
            {record.department} - {record.bedNumber}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Chan doan',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
      ellipsis: true,
    },
    {
      title: 'BMI',
      key: 'bmi',
      width: 80,
      render: (_, record) => (
        record.bmi ? (
          <Tag color={record.bmi < 18.5 ? 'red' : record.bmi > 25 ? 'orange' : 'green'}>
            {record.bmi.toFixed(1)}
          </Tag>
        ) : '-'
      ),
    },
    {
      title: 'Nguy co DD',
      key: 'risk',
      width: 130,
      render: (_, record) => getRiskTag(record.riskLevel),
    },
    {
      title: 'Che do an',
      dataIndex: 'dietType',
      key: 'dietType',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">Chua chi dinh</Text>,
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => {
        const config: Record<string, { color: string; text: string }> = {
          pending_screening: { color: 'orange', text: 'Cho sang loc' },
          screened: { color: 'blue', text: 'Da sang loc' },
          on_plan: { color: 'green', text: 'Dang theo doi' },
          discharged: { color: 'default', text: 'Da xuat vien' },
        };
        const c = config[status];
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    {
      title: 'Thao tac',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          {record.status === 'pending_screening' && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                setSelectedPatient(record);
                setIsScreeningModalOpen(true);
              }}
            >
              Sang loc
            </Button>
          )}
          {(record.status === 'screened' || record.status === 'on_plan') && (
            <>
              <Button
                size="small"
                onClick={() => {
                  setSelectedPatient(record);
                  setIsProgressModalOpen(true);
                }}
              >
                Chi tiet
              </Button>
              {record.status === 'screened' && (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    setSelectedPatient(record);
                    setIsPlanModalOpen(true);
                  }}
                >
                  Lap KH
                </Button>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  const mealColumns: ColumnsType<MealOrder> = [
    {
      title: 'Benh nhan',
      key: 'patient',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.patientName}</Text>
          <Text type="secondary">{record.bedNumber}</Text>
        </Space>
      ),
    },
    {
      title: 'Khoa',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Bua an',
      dataIndex: 'mealType',
      key: 'mealType',
      render: (type) => {
        const labels: Record<string, string> = {
          breakfast: 'Bua sang',
          lunch: 'Bua trua',
          dinner: 'Bua toi',
          snack: 'Bua phu',
        };
        return labels[type];
      },
    },
    {
      title: 'Che do',
      dataIndex: 'dietType',
      key: 'dietType',
    },
    {
      title: 'Gio giao',
      dataIndex: 'deliveryTime',
      key: 'deliveryTime',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config: Record<string, { color: string; text: string }> = {
          pending: { color: 'default', text: 'Cho' },
          preparing: { color: 'blue', text: 'Dang che bien' },
          delivered: { color: 'orange', text: 'Da giao' },
          consumed: { color: 'green', text: 'Da an' },
        };
        const c = config[status];
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    {
      title: 'Ghi chu',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
    },
  ];

  return (
    <div>
      <Title level={4}>Dinh duong lam sang</Title>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Cho sang loc"
              value={pendingScreening}
              prefix={<AlertOutlined style={{ color: '#faad14' }} />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Nguy co cao"
              value={highRiskCount}
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
              styles={{ content: { color: '#ff4d4f' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Dang theo doi"
              value={onPlanCount}
              prefix={<AppleOutlined style={{ color: '#52c41a' }} />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card>
        <Tabs
          defaultActiveKey="patients"
          items={[
            {
              key: 'patients',
              label: 'Benh nhan noi tru',
              children: (
                <>
                  <Alert
                    title="Quy tac sang loc"
                    description="Moi benh nhan noi tru phai duoc sang loc dinh duong trong 24h nhap vien. Tai sang loc moi 7 ngay."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Table
                    columns={patientColumns}
                    dataSource={patients}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedPatient(record);
                        setIsScreeningModalOpen(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'meals',
              label: 'Quan ly bua an',
              children: (
                <Table
                  columns={mealColumns}
                  dataSource={mealOrders}
                  rowKey="id"
                  onRow={(record) => ({
                    onDoubleClick: () => {
                      Modal.info({
                        title: `Chi tiết đặt bữa ăn`,
                        width: 500,
                        content: (
                          <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                            <Descriptions.Item label="Bệnh nhân">{record.patientName}</Descriptions.Item>
                            <Descriptions.Item label="Khoa">{record.department}</Descriptions.Item>
                            <Descriptions.Item label="Chế độ ăn">{record.dietType}</Descriptions.Item>
                            <Descriptions.Item label="Bữa">{record.mealType}</Descriptions.Item>
                            <Descriptions.Item label="Ghi chú">{record.notes || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">{record.status}</Descriptions.Item>
                          </Descriptions>
                        ),
                      });
                    },
                    style: { cursor: 'pointer' },
                  })}
                />
              ),
            },
            {
              key: 'diet_types',
              label: 'Che do an dac biet',
              children: (
                <Collapse
                  items={DIET_TYPES.map((diet) => ({
                    key: diet.value,
                    label: diet.label,
                    children: <p>Mo ta chi tiet che do an {diet.label}</p>,
                  }))}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Screening Modal (NRS-2002) */}
      <Modal
        title="Sang loc dinh duong (NRS-2002)"
        open={isScreeningModalOpen}
        onCancel={() => setIsScreeningModalOpen(false)}
        onOk={() => screeningForm.submit()}
        width={700}
      >
        <Form form={screeningForm} layout="vertical" onFinish={handleScreening}>
          <Alert
            title="Thang diem NRS-2002"
            description="Tong diem >= 3: Nguy co dinh duong cao, can can thiep"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="weight" label="Can nang (kg)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="height" label="Chieu cao (cm)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bmi" label="BMI">
                <InputNumber style={{ width: '100%' }} disabled />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="albumin" label="Albumin (g/dL)">
            <InputNumber style={{ width: '100%' }} step={0.1} />
          </Form.Item>

          <Divider>Danh gia tinh trang dinh duong</Divider>

          <Form.Item name="bmiScore" label="1. BMI" rules={[{ required: true }]}>
            <Radio.Group>
              <Space orientation="vertical">
                <Radio value={0}>BMI &gt;= 20.5 (0 diem)</Radio>
                <Radio value={1}>BMI 18.5-20.5 (1 diem)</Radio>
                <Radio value={2}>BMI &lt; 18.5 (2 diem)</Radio>
                <Radio value={3}>BMI &lt; 18.5 + Toan trang kem (3 diem)</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="weightLossScore" label="2. Sut can" rules={[{ required: true }]}>
            <Radio.Group>
              <Space orientation="vertical">
                <Radio value={0}>Khong sut can (0 diem)</Radio>
                <Radio value={1}>Sut &gt;5% trong 3 thang (1 diem)</Radio>
                <Radio value={2}>Sut &gt;5% trong 2 thang (2 diem)</Radio>
                <Radio value={3}>Sut &gt;5% trong 1 thang (3 diem)</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="intakeScore" label="3. Luong an" rules={[{ required: true }]}>
            <Radio.Group>
              <Space orientation="vertical">
                <Radio value={0}>An duoc binh thuong (0 diem)</Radio>
                <Radio value={1}>An duoc 50-75% (1 diem)</Radio>
                <Radio value={2}>An duoc 25-50% (2 diem)</Radio>
                <Radio value={3}>An duoc &lt;25% (3 diem)</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="diseaseScore" label="4. Muc do benh" rules={[{ required: true }]}>
            <Radio.Group>
              <Space orientation="vertical">
                <Radio value={0}>Benh nhe, khong stress (0 diem)</Radio>
                <Radio value={1}>Gãy xuong hong, ung thu, benh man (1 diem)</Radio>
                <Radio value={2}>Phau thuat lon, dot quy, viem phoi (2 diem)</Radio>
                <Radio value={3}>Chay nang, ICU, ARDS (3 diem)</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      {/* Nutrition Plan Modal */}
      <Modal
        title="Lap ke hoach dinh duong"
        open={isPlanModalOpen}
        onCancel={() => setIsPlanModalOpen(false)}
        onOk={() => planForm.submit()}
        width={600}
      >
        <Form form={planForm} layout="vertical" onFinish={handleCreatePlan}>
          <Form.Item name="dietType" label="Che do an" rules={[{ required: true }]}>
            <Select>
              {DIET_TYPES.map((d) => (
                <Select.Option key={d.value} value={d.value}>
                  {d.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="calorieTarget" label="Muc tieu Calo/ngay">
                <InputNumber style={{ width: '100%' }} suffix="kcal" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="proteinTarget" label="Muc tieu Protein/ngay">
                <InputNumber style={{ width: '100%' }} suffix="g" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="feedingRoute" label="Duong cap dinh duong">
            <Select>
              <Select.Option value="oral">Duong mieng</Select.Option>
              <Select.Option value="enteral">Ong thong (Enteral)</Select.Option>
              <Select.Option value="parenteral">Tinh mach (TPN)</Select.Option>
              <Select.Option value="mixed">Ket hop</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="restrictions" label="Han che">
            <Select mode="multiple">
              <Select.Option value="salt">Giam muoi</Select.Option>
              <Select.Option value="sugar">Giam duong</Select.Option>
              <Select.Option value="protein">Giam dam</Select.Option>
              <Select.Option value="fat">Giam mo</Select.Option>
              <Select.Option value="fiber">Giam chat xo</Select.Option>
              <Select.Option value="potassium">Giam Kali</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="supplements" label="Bo sung">
            <TextArea placeholder="VD: Ensure, Glucerna, Vitamin D..." />
          </Form.Item>

          <Form.Item name="notes" label="Ghi chu">
            <TextArea />
          </Form.Item>
        </Form>
      </Modal>

      {/* Progress Modal */}
      <Modal
        title="Chi tiet dinh duong benh nhan"
        open={isProgressModalOpen}
        onCancel={() => setIsProgressModalOpen(false)}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={executePrintMealPlan}>
            In phieu
          </Button>,
          <Button key="close" onClick={() => setIsProgressModalOpen(false)}>
            Dong
          </Button>,
        ]}
        width={700}
      >
        {selectedPatient && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Ho ten">{selectedPatient.patientName}</Descriptions.Item>
              <Descriptions.Item label="Giuong">{selectedPatient.bedNumber}</Descriptions.Item>
              <Descriptions.Item label="Khoa">{selectedPatient.department}</Descriptions.Item>
              <Descriptions.Item label="Ngay sang loc">
                {selectedPatient.screeningDate || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="BMI">
                {selectedPatient.bmi?.toFixed(1) || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Can nang">
                {selectedPatient.weight ? `${selectedPatient.weight} kg` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Nguy co" span={2}>
                {getRiskTag(selectedPatient.riskLevel)}
              </Descriptions.Item>
              <Descriptions.Item label="Che do an" span={2}>
                {selectedPatient.dietType || 'Chua chi dinh'}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Lich su theo doi</Divider>

            <Timeline
              items={[
                {
                  color: 'green',
                  content: <>{dayjs().format('DD/MM/YYYY HH:mm')} - An bua sang, duoc 80%</>,
                },
                {
                  color: 'blue',
                  content: <>{dayjs().subtract(1, 'day').format('DD/MM/YYYY')} - Cap nhat ke hoach dinh duong</>,
                },
                {
                  color: 'orange',
                  content: (
                    <>
                      {dayjs().subtract(2, 'day').format('DD/MM/YYYY')} - Sang loc dinh duong: Nguy co{' '}
                      {selectedPatient.riskLevel?.toUpperCase()}
                    </>
                  ),
                },
              ]}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default Nutrition;
