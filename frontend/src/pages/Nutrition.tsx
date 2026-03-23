import React, { useState, useCallback, useEffect } from 'react';
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
  Spin,
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
  PrinterOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getPendingScreenings,
  getDietOrders,
  getMealPlan,
  getDashboard,
  createScreening,
  createDietOrder,
  getDietTypes,
  getHighRiskPatients,
  getScreenings,
} from '../api/nutrition';
import type {
  NutritionScreeningDto,
  DietOrderDto,
  MealPlanDto,
  PlannedMealDto,
  NutritionDashboardDto,
  DietTypeDto,
} from '../api/nutrition';
import { HOSPITAL_NAME } from '../constants/hospital';

const { Title, Text } = Typography;
const { TextArea } = Input;

const DIET_TYPES_FALLBACK = [
  { value: 'normal', label: 'Chế độ ăn thường' },
  { value: 'diabetes', label: 'Giảm đường (Đái tháo đường)' },
  { value: 'low_salt', label: 'Giảm muối (Tăng huyết áp)' },
  { value: 'low_protein', label: 'Giảm đạm (Suy thận)' },
  { value: 'liquid', label: 'Ăn lỏng' },
  { value: 'soft', label: 'Ăn mềm' },
  { value: 'post_surgery', label: 'Sau phẫu thuật' },
  { value: 'liver', label: 'Xơ gan' },
  { value: 'tpn', label: 'Dinh dưỡng tĩnh mạch (TPN)' },
];

type ScreeningFormValues = {
  bmiScore?: number;
  weightLossScore?: number;
  intakeScore?: number;
  diseaseScore?: number;
  notes?: string;
};

type PlanFormValues = {
  dietType?: string;
  texture?: string;
  calorieTarget?: number;
  proteinTarget?: number;
  fluidMl?: number;
  sodiumMg?: number;
  potassiumMg?: number;
  phosphorusMg?: number;
  restrictions?: string;
  feedingRoute?: string;
  mealFrequency?: number;
  snacksIncluded?: boolean;
  notes?: string;
  startDate?: string;
  endDate?: string;
  instructions?: string;
};

const Nutrition: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [pendingScreeningList, setPendingScreeningList] = useState<NutritionScreeningDto[]>([]);
  const [activeDietOrders, setActiveDietOrders] = useState<DietOrderDto[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanDto | null>(null);
  const [dashboard, setDashboard] = useState<NutritionDashboardDto | null>(null);
  const [dietTypeOptions, setDietTypeOptions] = useState<DietTypeDto[]>([]);
  const [allScreenings, setAllScreenings] = useState<NutritionScreeningDto[]>([]);

  const [selectedScreening, setSelectedScreening] = useState<NutritionScreeningDto | null>(null);
  const [selectedDietOrder, setSelectedDietOrder] = useState<DietOrderDto | null>(null);
  const [isScreeningModalOpen, setIsScreeningModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [screeningForm] = Form.useForm();
  const [planForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = dayjs().format('YYYY-MM-DD');

    const results = await Promise.allSettled([
      getPendingScreenings(),
      getDietOrders({ page: 1, pageSize: 100 }),
      getMealPlan(today),
      getDashboard(today),
      getDietTypes(),
      getScreenings({ page: 1, pageSize: 200 }),
      getHighRiskPatients(),
    ]);

    // Pending screenings
    if (results[0].status === 'fulfilled') {
      setPendingScreeningList(results[0].value?.data || []);
    } else {
      console.warn('Failed to fetch pending screenings:', results[0].reason);
    }

    // Active diet orders
    if (results[1].status === 'fulfilled') {
      const data = results[1].value?.data;
      setActiveDietOrders(data?.items || (Array.isArray(data) ? data : []));
    } else {
      console.warn('Failed to fetch diet orders:', results[1].reason);
    }

    // Meal plan
    if (results[2].status === 'fulfilled') {
      setMealPlan(results[2].value?.data || null);
    } else {
      console.warn('Failed to fetch meal plan:', results[2].reason);
    }

    // Dashboard
    if (results[3].status === 'fulfilled') {
      setDashboard(results[3].value?.data || null);
    } else {
      console.warn('Failed to fetch dashboard:', results[3].reason);
    }

    // Diet types
    if (results[4].status === 'fulfilled') {
      setDietTypeOptions(results[4].value?.data || []);
    } else {
      console.warn('Failed to fetch diet types:', results[4].reason);
    }

    // All screenings (for the patient list tab)
    if (results[5].status === 'fulfilled') {
      const data = results[5].value?.data;
      setAllScreenings(data?.items || (Array.isArray(data) ? data : []));
    } else {
      console.warn('Failed to fetch all screenings:', results[5].reason);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData();
    });
  }, [fetchData]);

  // Statistics from dashboard or local data
  const pendingScreeningCount = dashboard?.pendingScreening ?? pendingScreeningList.length;
  const highRiskCount = dashboard?.highRiskPatients ?? 0;
  const onPlanCount = dashboard?.activeDietOrders ?? activeDietOrders.length;

  const getRiskTag = (risk?: string) => {
    if (!risk) return null;
    const normalizedRisk = risk.toLowerCase();
    const config: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      low: { color: 'green', text: 'Nguy cơ thấp', icon: <CheckCircleOutlined /> },
      medium: { color: 'orange', text: 'Nguy cơ vừa', icon: <ExclamationCircleOutlined /> },
      high: { color: 'red', text: 'Nguy cơ cao', icon: <WarningOutlined /> },
    };
    const c = config[normalizedRisk];
    if (!c) return <Tag>{risk}</Tag>;
    return (
      <Tag color={c.color} icon={c.icon}>
        {c.text}
      </Tag>
    );
  };

  const handleScreening = async (values: ScreeningFormValues) => {
    if (!selectedScreening) return;

    const totalScore =
      (values.bmiScore || 0) +
      (values.weightLossScore || 0) +
      (values.intakeScore || 0) +
      (values.diseaseScore || 0);

    try {
      await createScreening({
        admissionId: selectedScreening.admissionId,
        screeningTool: 'NRS-2002',
        nrsNutritionalScore: (values.bmiScore || 0) + (values.weightLossScore || 0) + (values.intakeScore || 0),
        nrsSeverityScore: values.diseaseScore || 0,
        mustBMIScore: values.bmiScore,
        mustWeightLossScore: values.weightLossScore,
        mustAcuteIllnessScore: values.diseaseScore,
        notes: values.notes,
      });

      let riskLabel = 'thấp';
      if (totalScore >= 3) riskLabel = 'cao';
      else if (totalScore >= 2) riskLabel = 'vừa';

      setIsScreeningModalOpen(false);
      screeningForm.resetFields();
      message.success(`Đã hoàn thành sàng lọc - Nguy cơ: ${riskLabel.toUpperCase()}`);

      if (totalScore >= 2) {
        setIsPlanModalOpen(true);
      }

      fetchData();
    } catch (err) {
      console.warn('Failed to create screening:', err);
      message.warning('Không thể lưu kết quả sàng lọc. Vui lòng thử lại.');
    }
  };

  const handleCreatePlan = async (values: PlanFormValues) => {
    if (!selectedScreening) return;

    try {
      await createDietOrder({
        admissionId: selectedScreening.admissionId,
        dietType: values.dietType || 'normal',
        texture: values.texture || 'Regular',
        energyKcal: values.calorieTarget || 2000,
        proteinGrams: values.proteinTarget || 60,
        fluidMl: values.fluidMl,
        sodiumMg: values.sodiumMg,
        potassiumMg: values.potassiumMg,
        phosphorusMg: values.phosphorusMg,
        restrictions: values.restrictions ? [values.restrictions] : undefined,
        feedingRoute: values.feedingRoute || 'oral',
        mealFrequency: values.mealFrequency || 3,
        snacksIncluded: values.snacksIncluded || false,
        specialInstructions: values.notes,
        startDate: dayjs().format('YYYY-MM-DD'),
        endDate: values.endDate,
      });

      setIsPlanModalOpen(false);
      planForm.resetFields();
      message.success('Đã tạo kế hoạch dinh dưỡng');
      fetchData();
    } catch (err) {
      console.warn('Failed to create diet order:', err);
      message.warning('Không thể tạo kế hoạch dinh dưỡng. Vui lòng thử lại.');
    }
  };

  const executePrintMealPlan = () => {
    const patient = selectedDietOrder;
    if (!patient) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu dinh dưỡng</title>
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
          <strong>${HOSPITAL_NAME}</strong><br/>
          Khoa Dinh dưỡng
        </div>

        <div class="title">PHIẾU KẾ HOẠCH DINH DƯỠNG</div>

        <table class="info-table">
          <tr>
            <td><strong>Họ tên:</strong> ${patient.patientName}</td>
            <td><strong>Giường:</strong> ${patient.bedNumber || '-'}</td>
          </tr>
          <tr>
            <td><strong>Khoa:</strong> ${patient.departmentName}</td>
            <td><strong>Chế độ:</strong> ${patient.dietTypeName || patient.dietType}</td>
          </tr>
          <tr>
            <td><strong>Năng lượng:</strong> ${patient.energyKcal} kcal/ngày</td>
            <td><strong>Protein:</strong> ${patient.proteinGrams} g/ngày</td>
          </tr>
          <tr>
            <td colspan="2"><strong>Đường cấp DD:</strong> ${patient.feedingRoute}</td>
          </tr>
        </table>

        <table class="meal-table">
          <thead>
            <tr>
              <th>Bữa ăn</th>
              <th>Giờ</th>
              <th>Món ăn</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Sáng</td><td>07:00</td><td>Cháo/Bánh mì mềm</td><td></td></tr>
            <tr><td>Phụ sáng</td><td>09:30</td><td>Sữa/Trái cây</td><td></td></tr>
            <tr><td>Trưa</td><td>11:30</td><td>Cơm/Cháo + Thức ăn</td><td></td></tr>
            <tr><td>Phụ chiều</td><td>15:00</td><td>Sữa/Bánh</td><td></td></tr>
            <tr><td>Tối</td><td>17:30</td><td>Cơm/Cháo + Thức ăn</td><td></td></tr>
          </tbody>
        </table>

        <div style="margin-top: 30px; text-align: right;">
          <p>Ngày ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Chuyên gia dinh dưỡng</strong></p>
          <p style="margin-top: 50px;">___________________</p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Compute diet type options for selects
  const dietSelectOptions = dietTypeOptions.length > 0
    ? dietTypeOptions.map((d) => ({ value: d.code, label: d.name }))
    : DIET_TYPES_FALLBACK;

  // Combine pending screenings + all screenings into patient list
  const combinedPatientList: NutritionScreeningDto[] = (() => {
    const seen = new Set<string>();
    const result: NutritionScreeningDto[] = [];
    for (const s of pendingScreeningList) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        result.push(s);
      }
    }
    for (const s of allScreenings) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        result.push(s);
      }
    }
    return result;
  })();

  const patientColumns: ColumnsType<NutritionScreeningDto> = [
    {
      title: 'Bệnh nhân',
      key: 'patient',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.patientName}</Text>
          <Text type="secondary">
            {record.departmentName} - {record.bedNumber || 'N/A'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Mã BA',
      dataIndex: 'medicalRecordCode',
      key: 'medicalRecordCode',
      width: 120,
    },
    {
      title: 'Công cụ',
      dataIndex: 'screeningTool',
      key: 'screeningTool',
      width: 100,
    },
    {
      title: 'Tổng điểm',
      key: 'score',
      width: 90,
      render: (_, record) => {
        const score = record.nrsTotalScore ?? record.mustTotalScore;
        return score != null ? <Tag color={score >= 3 ? 'red' : score >= 2 ? 'orange' : 'green'}>{score}</Tag> : '-';
      },
    },
    {
      title: 'Nguy cơ DD',
      key: 'risk',
      width: 130,
      render: (_, record) => getRiskTag(record.riskLevel),
    },
    {
      title: 'Ngày sàng lọc',
      dataIndex: 'screeningDate',
      key: 'screeningDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_, record) => {
        if (record.statusName) {
          const colorMap: Record<string, { color: string; text: string }> = {
            'Pending': { color: 'orange', text: 'Chờ xử lý' },
            'Completed': { color: 'green', text: 'Hoàn thành' },
            'InProgress': { color: 'blue', text: 'Đang thực hiện' },
          };
          const mapped = colorMap[record.statusName] || { color: 'default', text: record.statusName };
          return <Tag color={mapped.color}>{mapped.text}</Tag>;
        }
        const statusConfig: Record<number, { color: string; text: string }> = {
          0: { color: 'orange', text: 'Chờ sàng lọc' },
          1: { color: 'blue', text: 'Đã sàng lọc' },
          2: { color: 'green', text: 'Đang theo dõi' },
          3: { color: 'default', text: 'Đã xuất viện' },
        };
        const c = statusConfig[record.status] || { color: 'default', text: `Status ${record.status}` };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          {record.status === 0 && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                setSelectedScreening(record);
                setIsScreeningModalOpen(true);
              }}
            >
              Sàng lọc
            </Button>
          )}
          {record.status >= 1 && (
            <Button
              size="small"
              onClick={() => {
                setSelectedScreening(record);
                setIsProgressModalOpen(true);
              }}
            >
              Chi tiết
            </Button>
          )}
          {record.status === 1 && record.requiresAssessment && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                setSelectedScreening(record);
                setIsPlanModalOpen(true);
              }}
            >
              Lập KH
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const dietOrderColumns: ColumnsType<DietOrderDto> = [
    {
      title: 'Bệnh nhân',
      key: 'patient',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.patientName}</Text>
          <Text type="secondary">{record.bedNumber || 'N/A'}</Text>
        </Space>
      ),
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: 'Chế độ ăn',
      key: 'dietType',
      render: (_, record) => record.dietTypeName || record.dietType,
    },
    {
      title: 'Năng lượng',
      key: 'energy',
      width: 100,
      render: (_, record) => `${record.energyKcal} kcal`,
    },
    {
      title: 'Protein',
      key: 'protein',
      width: 90,
      render: (_, record) => `${record.proteinGrams} g`,
    },
    {
      title: 'Đường cấp',
      dataIndex: 'feedingRoute',
      key: 'feedingRoute',
      width: 100,
      render: (route: string) => {
        const labels: Record<string, string> = {
          oral: 'Đường miệng',
          enteral: 'Ống thông',
          parenteral: 'Tĩnh mạch',
          mixed: 'Kết hợp',
        };
        return labels[route?.toLowerCase()] || route;
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, record) => {
        if (record.statusName) return <Tag color="green">{record.statusName}</Tag>;
        return <Tag>Status {record.status}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          size="small"
          icon={<PrinterOutlined />}
          onClick={() => {
            setSelectedDietOrder(record);
            setTimeout(() => executePrintMealPlan(), 100);
          }}
        >
          In phiếu
        </Button>
      ),
    },
  ];

  // Meal plan data: flatten from mealPlan.meals
  const mealList: PlannedMealDto[] = mealPlan?.meals || [];

  const mealColumns: ColumnsType<PlannedMealDto> = [
    {
      title: 'Bệnh nhân',
      key: 'patient',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.patientName}</Text>
          <Text type="secondary">{record.bedNumber || 'N/A'}</Text>
        </Space>
      ),
    },
    {
      title: 'Bữa ăn',
      dataIndex: 'mealType',
      key: 'mealType',
      render: (type: string) => {
        const labels: Record<string, string> = {
          Breakfast: 'Bữa sáng',
          Lunch: 'Bữa trưa',
          Dinner: 'Bữa tối',
          Snack: 'Bữa phụ',
          breakfast: 'Bữa sáng',
          lunch: 'Bữa trưa',
          dinner: 'Bữa tối',
          snack: 'Bữa phụ',
        };
        return labels[type] || type;
      },
    },
    {
      title: 'Giờ giao',
      dataIndex: 'mealTime',
      key: 'mealTime',
    },
    {
      title: 'Năng lượng',
      key: 'energy',
      width: 100,
      render: (_, record) => `${record.energyKcal} kcal`,
    },
    {
      title: 'Protein',
      key: 'protein',
      width: 80,
      render: (_, record) => `${record.proteinGrams} g`,
    },
    {
      title: 'Tiêu thụ',
      key: 'consumption',
      width: 100,
      render: (_, record) =>
        record.consumptionPct != null ? (
          <Tag color={record.consumptionPct >= 75 ? 'green' : record.consumptionPct >= 50 ? 'orange' : 'red'}>
            {record.consumptionPct}%
          </Tag>
        ) : (
          '-'
        ),
    },
    {
      title: 'Giao hàng',
      key: 'delivery',
      width: 120,
      render: (_, record) => {
        const deliveryLabels: Record<number, { color: string; text: string }> = {
          0: { color: 'default', text: 'Chờ' },
          1: { color: 'blue', text: 'Đang chế biến' },
          2: { color: 'orange', text: 'Đã giao' },
          3: { color: 'green', text: 'Đã ăn' },
        };
        const c = deliveryLabels[record.deliveryStatus] || { color: 'default', text: `${record.deliveryStatus}` };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Dinh dưỡng lâm sàng</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Làm mới
          </Button>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Chờ sàng lọc"
                value={pendingScreeningCount}
                prefix={<AlertOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Nguy cơ cao"
                value={highRiskCount}
                prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                styles={{ content: { color: '#ff4d4f' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Đang theo dõi"
                value={onPlanCount}
                prefix={<AppleOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Tổng bệnh nhân"
                value={dashboard?.totalPatients ?? combinedPatientList.length}
                prefix={<CheckCircleOutlined style={{ color: '#1890ff' }} />}
                styles={{ content: { color: '#1890ff' } }}
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
                label: 'Bệnh nhân nội trú',
                children: (
                  <>
                    <Alert
                      title="Quy tắc sàng lọc"
                      description="Mọi bệnh nhân nội trú phải được sàng lọc dinh dưỡng trong 24h nhập viện. Tái sàng lọc mỗi 7 ngày."
                      type="info"
                      showIcon
                      closable
                      style={{ marginBottom: 16 }}
                    />
                    <Table
                      columns={patientColumns}
                      dataSource={combinedPatientList}
                      rowKey="id"
                      loading={loading}
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          setSelectedScreening(record);
                          if (record.status === 0) {
                            setIsScreeningModalOpen(true);
                          } else {
                            setIsProgressModalOpen(true);
                          }
                        },
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </>
                ),
              },
              {
                key: 'diet_orders',
                label: 'Chế độ ăn chỉ định',
                children: (
                  <Table
                    columns={dietOrderColumns}
                    dataSource={activeDietOrders}
                    rowKey="id"
                    loading={loading}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedDietOrder(record);
                        Modal.info({
                          title: 'Chi tiết chế độ ăn',
                          width: 600,
                          content: (
                            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Bệnh nhân">{record.patientName}</Descriptions.Item>
                              <Descriptions.Item label="Giường">{record.bedNumber || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
                              <Descriptions.Item label="Chế độ">{record.dietTypeName || record.dietType}</Descriptions.Item>
                              <Descriptions.Item label="Năng lượng">{record.energyKcal} kcal/ngày</Descriptions.Item>
                              <Descriptions.Item label="Protein">{record.proteinGrams} g/ngày</Descriptions.Item>
                              <Descriptions.Item label="Đường cấp">{record.feedingRoute}</Descriptions.Item>
                              <Descriptions.Item label="Số bữa/ngày">{record.mealFrequency}</Descriptions.Item>
                              <Descriptions.Item label="Bắt đầu">{dayjs(record.startDate).format('DD/MM/YYYY')}</Descriptions.Item>
                              <Descriptions.Item label="Kết thúc">{record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                              <Descriptions.Item label="Ghi chú" span={2}>{record.specialInstructions || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Hạn chế" span={2}>{record.restrictions?.join(', ') || '-'}</Descriptions.Item>
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
                key: 'meals',
                label: 'Quản lý bữa ăn',
                children: (
                  <>
                    {mealPlan && (
                      <Alert
                        title={`Kế hoạch bữa ăn ngày ${dayjs(mealPlan.planDate).format('DD/MM/YYYY')}`}
                        description={`Tổng: ${mealPlan.totalPatients} bệnh nhân | Trạng thái: ${mealPlan.statusName || 'N/A'}`}
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    )}
                    <Table
                      columns={mealColumns}
                      dataSource={mealList}
                      rowKey="id"
                      loading={loading}
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          Modal.info({
                            title: 'Chi tiết bữa ăn',
                            width: 500,
                            content: (
                              <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Bệnh nhân">{record.patientName}</Descriptions.Item>
                                <Descriptions.Item label="Bữa">{record.mealType}</Descriptions.Item>
                                <Descriptions.Item label="Giờ">{record.mealTime}</Descriptions.Item>
                                <Descriptions.Item label="Năng lượng">{record.energyKcal} kcal</Descriptions.Item>
                                <Descriptions.Item label="Protein">{record.proteinGrams} g</Descriptions.Item>
                                <Descriptions.Item label="Carb">{record.carbGrams} g</Descriptions.Item>
                                <Descriptions.Item label="Fat">{record.fatGrams} g</Descriptions.Item>
                                <Descriptions.Item label="Tiêu thụ">{record.consumptionPct != null ? `${record.consumptionPct}%` : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Ghi chú">{record.specialInstructions || '-'}</Descriptions.Item>
                              </Descriptions>
                            ),
                          });
                        },
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </>
                ),
              },
              {
                key: 'diet_types',
                label: 'Chế độ ăn đặc biệt',
                children: (
                  <Collapse
                    items={dietSelectOptions.map((diet) => ({
                      key: diet.value,
                      label: diet.label,
                      children: <p>Mô tả chi tiết chế độ ăn {diet.label}</p>,
                    }))}
                  />
                ),
              },
            ]}
          />
        </Card>

        {/* Screening Modal (NRS-2002) */}
        <Modal
          title="Sàng lọc dinh dưỡng (NRS-2002)"
          open={isScreeningModalOpen}
          onCancel={() => setIsScreeningModalOpen(false)}
          onOk={() => screeningForm.submit()}
          width={700}
        >
          <Form form={screeningForm} layout="vertical" onFinish={handleScreening}>
            <Alert
              title="Thang điểm NRS-2002"
              description="Tổng điểm >= 3: Nguy cơ dinh dưỡng cao, cần can thiệp"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="weight" label="Cân nặng (kg)" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="height" label="Chiều cao (cm)" rules={[{ required: true }]}>
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

            <Divider>Đánh giá tình trạng dinh dưỡng</Divider>

            <Form.Item name="bmiScore" label="1. BMI" rules={[{ required: true }]}>
              <Radio.Group>
                <Space orientation="vertical">
                  <Radio value={0}>BMI &gt;= 20.5 (0 điểm)</Radio>
                  <Radio value={1}>BMI 18.5-20.5 (1 điểm)</Radio>
                  <Radio value={2}>BMI &lt; 18.5 (2 điểm)</Radio>
                  <Radio value={3}>BMI &lt; 18.5 + Toàn trạng kém (3 điểm)</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            <Form.Item name="weightLossScore" label="2. Sụt cân" rules={[{ required: true }]}>
              <Radio.Group>
                <Space orientation="vertical">
                  <Radio value={0}>Không sụt cân (0 điểm)</Radio>
                  <Radio value={1}>Sụt &gt;5% trong 3 tháng (1 điểm)</Radio>
                  <Radio value={2}>Sụt &gt;5% trong 2 tháng (2 điểm)</Radio>
                  <Radio value={3}>Sụt &gt;5% trong 1 tháng (3 điểm)</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            <Form.Item name="intakeScore" label="3. Lượng ăn" rules={[{ required: true }]}>
              <Radio.Group>
                <Space orientation="vertical">
                  <Radio value={0}>Ăn được bình thường (0 điểm)</Radio>
                  <Radio value={1}>Ăn được 50-75% (1 điểm)</Radio>
                  <Radio value={2}>Ăn được 25-50% (2 điểm)</Radio>
                  <Radio value={3}>Ăn được &lt;25% (3 điểm)</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            <Form.Item name="diseaseScore" label="4. Mức độ bệnh" rules={[{ required: true }]}>
              <Radio.Group>
                <Space orientation="vertical">
                  <Radio value={0}>Bệnh nhẹ, không stress (0 điểm)</Radio>
                  <Radio value={1}>Gãy xương hông, ung thư, bệnh mạn (1 điểm)</Radio>
                  <Radio value={2}>Phẫu thuật lớn, đột quỵ, viêm phổi (2 điểm)</Radio>
                  <Radio value={3}>Cháy nặng, ICU, ARDS (3 điểm)</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            <Form.Item name="notes" label="Ghi chú">
              <TextArea />
            </Form.Item>
          </Form>
        </Modal>

        {/* Nutrition Plan Modal */}
        <Modal
          title="Lập kế hoạch dinh dưỡng"
          open={isPlanModalOpen}
          onCancel={() => setIsPlanModalOpen(false)}
          onOk={() => planForm.submit()}
          width={600}
        >
          <Form form={planForm} layout="vertical" onFinish={handleCreatePlan}>
            <Form.Item name="dietType" label="Chế độ ăn" rules={[{ required: true }]}>
              <Select>
                {dietSelectOptions.map((d) => (
                  <Select.Option key={d.value} value={d.value}>
                    {d.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="calorieTarget" label="Mục tiêu Calo/ngày">
                  <InputNumber style={{ width: '100%' }} suffix="kcal" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="proteinTarget" label="Mục tiêu Protein/ngày">
                  <InputNumber style={{ width: '100%' }} suffix="g" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="feedingRoute" label="Đường cấp dinh dưỡng">
              <Select>
                <Select.Option value="oral">Đường miệng</Select.Option>
                <Select.Option value="enteral">Ống thông (Enteral)</Select.Option>
                <Select.Option value="parenteral">Tĩnh mạch (TPN)</Select.Option>
                <Select.Option value="mixed">Kết hợp</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="restrictions" label="Hạn chế">
              <Select mode="multiple">
                <Select.Option value="salt">Giảm muối</Select.Option>
                <Select.Option value="sugar">Giảm đường</Select.Option>
                <Select.Option value="protein">Giảm đạm</Select.Option>
                <Select.Option value="fat">Giảm mỡ</Select.Option>
                <Select.Option value="fiber">Giảm chất xơ</Select.Option>
                <Select.Option value="potassium">Giảm Kali</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="supplements" label="Bổ sung">
              <TextArea placeholder="VD: Ensure, Glucerna, Vitamin D..." />
            </Form.Item>

            <Form.Item name="notes" label="Ghi chú">
              <TextArea />
            </Form.Item>
          </Form>
        </Modal>

        {/* Progress Modal */}
        <Modal
          title="Chi tiết dinh dưỡng bệnh nhân"
          open={isProgressModalOpen}
          onCancel={() => setIsProgressModalOpen(false)}
          footer={[
            <Button key="print" icon={<PrinterOutlined />} onClick={() => {
              // Find diet order for this patient to print
              if (selectedScreening) {
                const order = activeDietOrders.find((o) => o.admissionId === selectedScreening.admissionId);
                if (order) {
                  setSelectedDietOrder(order);
                  setTimeout(() => executePrintMealPlan(), 100);
                } else {
                  message.warning('Chưa có chế độ ăn chỉ định cho bệnh nhân này.');
                }
              }
            }}>
              In phiếu
            </Button>,
            <Button key="close" onClick={() => setIsProgressModalOpen(false)}>
              Đóng
            </Button>,
          ]}
          width={700}
        >
          {selectedScreening && (
            <>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Họ tên">{selectedScreening.patientName}</Descriptions.Item>
                <Descriptions.Item label="Giường">{selectedScreening.bedNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Khoa">{selectedScreening.departmentName}</Descriptions.Item>
                <Descriptions.Item label="Ngày sàng lọc">
                  {selectedScreening.screeningDate ? dayjs(selectedScreening.screeningDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Công cụ">{selectedScreening.screeningTool || '-'}</Descriptions.Item>
                <Descriptions.Item label="Tổng điểm">
                  {selectedScreening.nrsTotalScore ?? selectedScreening.mustTotalScore ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Nguy cơ" span={2}>
                  {getRiskTag(selectedScreening.riskLevel)}
                </Descriptions.Item>
                <Descriptions.Item label="Người sàng lọc" span={2}>
                  {selectedScreening.screenedByName || '-'}
                </Descriptions.Item>
                {selectedScreening.notes && (
                  <Descriptions.Item label="Ghi chú" span={2}>
                    {selectedScreening.notes}
                  </Descriptions.Item>
                )}
              </Descriptions>

              <Divider>Lịch sử theo dõi</Divider>

              <Timeline
                items={[
                  ...(selectedScreening.screeningDate
                    ? [
                        {
                          color: 'orange',
                          content: (
                            <>
                              {dayjs(selectedScreening.screeningDate).format('DD/MM/YYYY')} - Sàng lọc dinh dưỡng:{' '}
                              {selectedScreening.riskLevel ? `Nguy cơ ${selectedScreening.riskLevel.toUpperCase()}` : 'N/A'}
                            </>
                          ),
                        },
                      ]
                    : []),
                  ...(selectedScreening.requiresAssessment
                    ? [
                        {
                          color: 'blue',
                          content: <>Cần đánh giá dinh dưỡng chi tiết</>,
                        },
                      ]
                    : []),
                ]}
              />
            </>
          )}
        </Modal>
      </div>
    </Spin>
  );
};

export default Nutrition;
