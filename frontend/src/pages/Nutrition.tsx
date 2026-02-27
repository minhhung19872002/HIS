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
    fetchData();
  }, [fetchData]);

  // Statistics from dashboard or local data
  const pendingScreeningCount = dashboard?.pendingScreening ?? pendingScreeningList.length;
  const highRiskCount = dashboard?.highRiskPatients ?? 0;
  const onPlanCount = dashboard?.activeDietOrders ?? activeDietOrders.length;

  const getRiskTag = (risk?: string) => {
    if (!risk) return null;
    const normalizedRisk = risk.toLowerCase();
    const config: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      low: { color: 'green', text: 'Nguy co thap', icon: <CheckCircleOutlined /> },
      medium: { color: 'orange', text: 'Nguy co vua', icon: <ExclamationCircleOutlined /> },
      high: { color: 'red', text: 'Nguy co cao', icon: <WarningOutlined /> },
    };
    const c = config[normalizedRisk];
    if (!c) return <Tag>{risk}</Tag>;
    return (
      <Tag color={c.color} icon={c.icon}>
        {c.text}
      </Tag>
    );
  };

  const handleScreening = async (values: any) => {
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
        nrsAgeAdjustment: undefined,
        mustBMIScore: values.bmiScore,
        mustWeightLossScore: values.weightLossScore,
        mustAcuteIllnessScore: values.diseaseScore,
        notes: values.notes,
      });

      let riskLabel = 'thap';
      if (totalScore >= 3) riskLabel = 'cao';
      else if (totalScore >= 2) riskLabel = 'vua';

      setIsScreeningModalOpen(false);
      screeningForm.resetFields();
      message.success(`Da hoan thanh sang loc - Nguy co: ${riskLabel.toUpperCase()}`);

      if (totalScore >= 2) {
        setIsPlanModalOpen(true);
      }

      fetchData();
    } catch (err) {
      console.warn('Failed to create screening:', err);
      message.warning('Khong the luu ket qua sang loc. Vui long thu lai.');
    }
  };

  const handleCreatePlan = async (values: any) => {
    if (!selectedScreening) return;

    try {
      await createDietOrder({
        admissionId: selectedScreening.admissionId,
        dietType: values.dietType,
        texture: values.texture || 'Regular',
        energyKcal: values.calorieTarget || 2000,
        proteinGrams: values.proteinTarget || 60,
        fluidMl: values.fluidMl,
        sodiumMg: values.sodiumMg,
        potassiumMg: values.potassiumMg,
        phosphorusMg: values.phosphorusMg,
        restrictions: values.restrictions,
        feedingRoute: values.feedingRoute || 'oral',
        mealFrequency: values.mealFrequency || 3,
        snacksIncluded: values.snacksIncluded || false,
        specialInstructions: values.notes,
        startDate: dayjs().format('YYYY-MM-DD'),
        endDate: values.endDate,
      });

      setIsPlanModalOpen(false);
      planForm.resetFields();
      message.success('Da tao ke hoach dinh duong');
      fetchData();
    } catch (err) {
      console.warn('Failed to create diet order:', err);
      message.warning('Khong the tao ke hoach dinh duong. Vui long thu lai.');
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
          <strong>${HOSPITAL_NAME}</strong><br/>
          Khoa Dinh duong
        </div>

        <div class="title">PHIEU KE HOACH DINH DUONG</div>

        <table class="info-table">
          <tr>
            <td><strong>Ho ten:</strong> ${patient.patientName}</td>
            <td><strong>Giuong:</strong> ${patient.bedNumber || '-'}</td>
          </tr>
          <tr>
            <td><strong>Khoa:</strong> ${patient.departmentName}</td>
            <td><strong>Che do:</strong> ${patient.dietTypeName || patient.dietType}</td>
          </tr>
          <tr>
            <td><strong>Nang luong:</strong> ${patient.energyKcal} kcal/ngay</td>
            <td><strong>Protein:</strong> ${patient.proteinGrams} g/ngay</td>
          </tr>
          <tr>
            <td colspan="2"><strong>Duong cap DD:</strong> ${patient.feedingRoute}</td>
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
            <tr><td>Sang</td><td>07:00</td><td>Chao/Banh mi mem</td><td></td></tr>
            <tr><td>Phu sang</td><td>09:30</td><td>Sua/Trai cay</td><td></td></tr>
            <tr><td>Trua</td><td>11:30</td><td>Com/Chao + Thuc an</td><td></td></tr>
            <tr><td>Phu chieu</td><td>15:00</td><td>Sua/Banh</td><td></td></tr>
            <tr><td>Toi</td><td>17:30</td><td>Com/Chao + Thuc an</td><td></td></tr>
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
      title: 'Benh nhan',
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
      title: 'Ma BA',
      dataIndex: 'medicalRecordCode',
      key: 'medicalRecordCode',
      width: 120,
    },
    {
      title: 'Cong cu',
      dataIndex: 'screeningTool',
      key: 'screeningTool',
      width: 100,
    },
    {
      title: 'Tong diem',
      key: 'score',
      width: 90,
      render: (_, record) => {
        const score = record.nrsTotalScore ?? record.mustTotalScore;
        return score != null ? <Tag color={score >= 3 ? 'red' : score >= 2 ? 'orange' : 'green'}>{score}</Tag> : '-';
      },
    },
    {
      title: 'Nguy co DD',
      key: 'risk',
      width: 130,
      render: (_, record) => getRiskTag(record.riskLevel),
    },
    {
      title: 'Ngay sang loc',
      dataIndex: 'screeningDate',
      key: 'screeningDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trang thai',
      key: 'status',
      width: 140,
      render: (_, record) => {
        if (record.statusName) {
          const colorMap: Record<string, string> = {
            'Pending': 'orange',
            'Completed': 'green',
            'InProgress': 'blue',
          };
          return <Tag color={colorMap[record.statusName] || 'default'}>{record.statusName}</Tag>;
        }
        const statusConfig: Record<number, { color: string; text: string }> = {
          0: { color: 'orange', text: 'Cho sang loc' },
          1: { color: 'blue', text: 'Da sang loc' },
          2: { color: 'green', text: 'Dang theo doi' },
          3: { color: 'default', text: 'Da xuat vien' },
        };
        const c = statusConfig[record.status] || { color: 'default', text: `Status ${record.status}` };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    {
      title: 'Thao tac',
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
              Sang loc
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
              Chi tiet
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
              Lap KH
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const dietOrderColumns: ColumnsType<DietOrderDto> = [
    {
      title: 'Benh nhan',
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
      title: 'Che do an',
      key: 'dietType',
      render: (_, record) => record.dietTypeName || record.dietType,
    },
    {
      title: 'Nang luong',
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
      title: 'Duong cap',
      dataIndex: 'feedingRoute',
      key: 'feedingRoute',
      width: 100,
      render: (route: string) => {
        const labels: Record<string, string> = {
          oral: 'Duong mieng',
          enteral: 'Ong thong',
          parenteral: 'Tinh mach',
          mixed: 'Ket hop',
        };
        return labels[route?.toLowerCase()] || route;
      },
    },
    {
      title: 'Trang thai',
      key: 'status',
      width: 120,
      render: (_, record) => {
        if (record.statusName) return <Tag color="green">{record.statusName}</Tag>;
        return <Tag>Status {record.status}</Tag>;
      },
    },
    {
      title: 'Thao tac',
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
          In phieu
        </Button>
      ),
    },
  ];

  // Meal plan data: flatten from mealPlan.meals
  const mealList: PlannedMealDto[] = mealPlan?.meals || [];

  const mealColumns: ColumnsType<PlannedMealDto> = [
    {
      title: 'Benh nhan',
      key: 'patient',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.patientName}</Text>
          <Text type="secondary">{record.bedNumber || 'N/A'}</Text>
        </Space>
      ),
    },
    {
      title: 'Bua an',
      dataIndex: 'mealType',
      key: 'mealType',
      render: (type: string) => {
        const labels: Record<string, string> = {
          Breakfast: 'Bua sang',
          Lunch: 'Bua trua',
          Dinner: 'Bua toi',
          Snack: 'Bua phu',
          breakfast: 'Bua sang',
          lunch: 'Bua trua',
          dinner: 'Bua toi',
          snack: 'Bua phu',
        };
        return labels[type] || type;
      },
    },
    {
      title: 'Gio giao',
      dataIndex: 'mealTime',
      key: 'mealTime',
    },
    {
      title: 'Nang luong',
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
      title: 'Tieu thu',
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
      title: 'Giao hang',
      key: 'delivery',
      width: 120,
      render: (_, record) => {
        const deliveryLabels: Record<number, { color: string; text: string }> = {
          0: { color: 'default', text: 'Cho' },
          1: { color: 'blue', text: 'Dang che bien' },
          2: { color: 'orange', text: 'Da giao' },
          3: { color: 'green', text: 'Da an' },
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
          <Title level={4} style={{ margin: 0 }}>Dinh duong lam sang</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Lam moi
          </Button>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Cho sang loc"
                value={pendingScreeningCount}
                prefix={<AlertOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Nguy co cao"
                value={highRiskCount}
                prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                styles={{ content: { color: '#ff4d4f' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Dang theo doi"
                value={onPlanCount}
                prefix={<AppleOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Tong benh nhan"
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
                label: 'Che do an chi dinh',
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
                          title: 'Chi tiet che do an',
                          width: 600,
                          content: (
                            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Benh nhan">{record.patientName}</Descriptions.Item>
                              <Descriptions.Item label="Giuong">{record.bedNumber || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
                              <Descriptions.Item label="Che do">{record.dietTypeName || record.dietType}</Descriptions.Item>
                              <Descriptions.Item label="Nang luong">{record.energyKcal} kcal/ngay</Descriptions.Item>
                              <Descriptions.Item label="Protein">{record.proteinGrams} g/ngay</Descriptions.Item>
                              <Descriptions.Item label="Duong cap">{record.feedingRoute}</Descriptions.Item>
                              <Descriptions.Item label="So bua/ngay">{record.mealFrequency}</Descriptions.Item>
                              <Descriptions.Item label="Bat dau">{dayjs(record.startDate).format('DD/MM/YYYY')}</Descriptions.Item>
                              <Descriptions.Item label="Ket thuc">{record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                              <Descriptions.Item label="Ghi chu" span={2}>{record.specialInstructions || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Han che" span={2}>{record.restrictions?.join(', ') || '-'}</Descriptions.Item>
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
                label: 'Quan ly bua an',
                children: (
                  <>
                    {mealPlan && (
                      <Alert
                        title={`Ke hoach bua an ngay ${dayjs(mealPlan.planDate).format('DD/MM/YYYY')}`}
                        description={`Tong: ${mealPlan.totalPatients} benh nhan | Trang thai: ${mealPlan.statusName || 'N/A'}`}
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
                            title: 'Chi tiet bua an',
                            width: 500,
                            content: (
                              <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Benh nhan">{record.patientName}</Descriptions.Item>
                                <Descriptions.Item label="Bua">{record.mealType}</Descriptions.Item>
                                <Descriptions.Item label="Gio">{record.mealTime}</Descriptions.Item>
                                <Descriptions.Item label="Nang luong">{record.energyKcal} kcal</Descriptions.Item>
                                <Descriptions.Item label="Protein">{record.proteinGrams} g</Descriptions.Item>
                                <Descriptions.Item label="Carb">{record.carbGrams} g</Descriptions.Item>
                                <Descriptions.Item label="Fat">{record.fatGrams} g</Descriptions.Item>
                                <Descriptions.Item label="Tieu thu">{record.consumptionPct != null ? `${record.consumptionPct}%` : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Ghi chu">{record.specialInstructions || '-'}</Descriptions.Item>
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
                label: 'Che do an dac biet',
                children: (
                  <Collapse
                    items={dietSelectOptions.map((diet) => ({
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

            <Form.Item name="notes" label="Ghi chu">
              <TextArea />
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
                {dietSelectOptions.map((d) => (
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
            <Button key="print" icon={<PrinterOutlined />} onClick={() => {
              // Find diet order for this patient to print
              if (selectedScreening) {
                const order = activeDietOrders.find((o) => o.admissionId === selectedScreening.admissionId);
                if (order) {
                  setSelectedDietOrder(order);
                  setTimeout(() => executePrintMealPlan(), 100);
                } else {
                  message.warning('Chua co che do an chi dinh cho benh nhan nay.');
                }
              }
            }}>
              In phieu
            </Button>,
            <Button key="close" onClick={() => setIsProgressModalOpen(false)}>
              Dong
            </Button>,
          ]}
          width={700}
        >
          {selectedScreening && (
            <>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Ho ten">{selectedScreening.patientName}</Descriptions.Item>
                <Descriptions.Item label="Giuong">{selectedScreening.bedNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Khoa">{selectedScreening.departmentName}</Descriptions.Item>
                <Descriptions.Item label="Ngay sang loc">
                  {selectedScreening.screeningDate ? dayjs(selectedScreening.screeningDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Cong cu">{selectedScreening.screeningTool || '-'}</Descriptions.Item>
                <Descriptions.Item label="Tong diem">
                  {selectedScreening.nrsTotalScore ?? selectedScreening.mustTotalScore ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Nguy co" span={2}>
                  {getRiskTag(selectedScreening.riskLevel)}
                </Descriptions.Item>
                <Descriptions.Item label="Nguoi sang loc" span={2}>
                  {selectedScreening.screenedByName || '-'}
                </Descriptions.Item>
                {selectedScreening.notes && (
                  <Descriptions.Item label="Ghi chu" span={2}>
                    {selectedScreening.notes}
                  </Descriptions.Item>
                )}
              </Descriptions>

              <Divider>Lich su theo doi</Divider>

              <Timeline
                items={[
                  ...(selectedScreening.screeningDate
                    ? [
                        {
                          color: 'orange',
                          content: (
                            <>
                              {dayjs(selectedScreening.screeningDate).format('DD/MM/YYYY')} - Sang loc dinh duong:{' '}
                              {selectedScreening.riskLevel ? `Nguy co ${selectedScreening.riskLevel.toUpperCase()}` : 'N/A'}
                            </>
                          ),
                        },
                      ]
                    : []),
                  ...(selectedScreening.requiresAssessment
                    ? [
                        {
                          color: 'blue',
                          content: <>Can danh gia dinh duong chi tiet</>,
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
