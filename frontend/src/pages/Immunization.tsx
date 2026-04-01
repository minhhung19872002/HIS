import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Row,
  Col,
  Select,
  DatePicker,
  Typography,
  message,
  Tabs,
  Statistic,
  Spin,
  Modal,
  Form,
  Progress,
  Badge,
  Alert,
} from 'antd';
import {
  ExperimentOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  TeamOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as immunizationApi from '../api/immunization';
import type { Vaccination, Campaign, AefiReport, CampaignStats } from '../api/immunization';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;

const VACCINE_STATUS_LABELS: Record<number, string> = {
  0: 'Lên lịch',
  1: 'Đã tiêm',
  2: 'Quá hạn',
  3: 'Hoãn',
};

const VACCINE_STATUS_COLORS: Record<number, string> = {
  0: 'default',
  1: 'success',
  2: 'error',
  3: 'warning',
};

const CAMPAIGN_STATUS_LABELS: Record<number, string> = {
  0: 'Kế hoạch',
  1: 'Đang triển khai',
  2: 'Hoàn thành',
  3: 'Đã hủy',
};

const CAMPAIGN_STATUS_COLORS: Record<number, string> = {
  0: 'default',
  1: 'processing',
  2: 'success',
  3: 'error',
};

const AEFI_SEVERITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Nhẹ', color: 'green' },
  2: { label: 'Trung bình', color: 'gold' },
  3: { label: 'Nặng', color: 'orange' },
  4: { label: 'Nghiêm trọng', color: 'red' },
};

const EPI_SCHEDULE = [
  { vaccine: 'BCG', age: 'Sơ sinh', disease: 'Lao' },
  { vaccine: 'HepB', age: 'Sơ sinh (24h)', disease: 'Viêm gan B' },
  { vaccine: 'DPT-VGB-Hib 1', age: '2 tháng', disease: 'Bạch hầu, Ho gà, UV, VGB, Hib' },
  { vaccine: 'OPV 1', age: '2 tháng', disease: 'Bại liệt (uống)' },
  { vaccine: 'DPT-VGB-Hib 2', age: '3 tháng', disease: 'Bạch hầu, Ho gà, UV, VGB, Hib' },
  { vaccine: 'OPV 2', age: '3 tháng', disease: 'Bại liệt (uống)' },
  { vaccine: 'DPT-VGB-Hib 3', age: '4 tháng', disease: 'Bạch hầu, Ho gà, UV, VGB, Hib' },
  { vaccine: 'OPV 3', age: '4 tháng', disease: 'Bại liệt (uống)' },
  { vaccine: 'IPV', age: '5 tháng', disease: 'Bại liệt (tiêm)' },
  { vaccine: 'MR 1', age: '9 tháng', disease: 'Sởi - Rubella' },
  { vaccine: 'JE 1', age: '12 tháng', disease: 'Viêm não Nhật Bản' },
  { vaccine: 'JE 2', age: '13 tháng', disease: 'Viêm não Nhật Bản' },
  { vaccine: 'MR 2', age: '18 tháng', disease: 'Sởi - Rubella' },
  { vaccine: 'DPT 4', age: '18 tháng', disease: 'Bạch hầu, Ho gà, UV' },
];

const Immunization: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [aefiReports, setAefiReports] = useState<AefiReport[]>([]);
  const [campaignStats, setCampaignStats] = useState<CampaignStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalVaccinated: 0,
    coveragePercent: 0,
  });
  const [keyword, setKeyword] = useState('');

  const [isVaccineModalOpen, setIsVaccineModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [vaccineForm] = Form.useForm();
  const [campaignForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        immunizationApi.searchVaccinations({ keyword: keyword || undefined }),
        immunizationApi.searchCampaigns({ keyword: keyword || undefined }),
        immunizationApi.getAefiReports({ keyword: keyword || undefined }),
        immunizationApi.getCampaignStats(),
      ]);
      if (results[0].status === 'fulfilled') setVaccinations(results[0].value);
      if (results[1].status === 'fulfilled') setCampaigns(results[1].value);
      if (results[2].status === 'fulfilled') setAefiReports(results[2].value);
      if (results[3].status === 'fulfilled') setCampaignStats(results[3].value);
    } catch {
      message.warning('Không thể tải dữ liệu tiêm chủng');
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRecordVaccination = async () => {
    try {
      const values = await vaccineForm.validateFields();
      setSaving(true);
      await immunizationApi.recordVaccination({
        ...values,
        vaccinationDate: values.vaccinationDate?.format('YYYY-MM-DD'),
        nextDueDate: values.nextDueDate?.format('YYYY-MM-DD'),
      });
      message.success('Đã ghi nhận tiêm chủng');
      setIsVaccineModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể ghi nhận tiêm chủng');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const values = await campaignForm.validateFields();
      setSaving(true);
      await immunizationApi.createCampaign({
        ...values,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        endDate: values.endDate?.format('YYYY-MM-DD'),
      });
      message.success('Đã tạo chiến dịch tiêm chủng');
      setIsCampaignModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo chiến dịch');
    } finally {
      setSaving(false);
    }
  };

  const vaccinationColumns: ColumnsType<Vaccination> = [
    { title: 'Họ tên', dataIndex: 'patientName', key: 'patientName', width: 150 },
    { title: 'Mã BN', dataIndex: 'patientCode', key: 'patientCode', width: 100 },
    { title: 'Ngày sinh', dataIndex: 'dateOfBirth', key: 'dateOfBirth', width: 100, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Vắc xin', dataIndex: 'vaccineName', key: 'vaccineName', width: 160 },
    { title: 'Liều', key: 'dose', width: 80, render: (_: unknown, r: Vaccination) => `${r.doseNumber}/${r.totalDoses}` },
    { title: 'Lô', dataIndex: 'lotNumber', key: 'lotNumber', width: 100 },
    { title: 'Vị trí tiêm', dataIndex: 'site', key: 'site', width: 100 },
    { title: 'Đường tiêm', dataIndex: 'route', key: 'route', width: 80 },
    { title: 'Ngày tiêm', dataIndex: 'vaccinationDate', key: 'vaccinationDate', width: 110, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Ngày tiêm tiếp', dataIndex: 'nextDueDate', key: 'nextDueDate', width: 110, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 100,
      render: (s: number) => <Tag color={VACCINE_STATUS_COLORS[s]}>{VACCINE_STATUS_LABELS[s]}</Tag>,
    },
  ];

  const campaignColumns: ColumnsType<Campaign> = [
    { title: 'Tên chiến dịch', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Vắc xin', dataIndex: 'vaccineName', key: 'vaccineName', width: 150 },
    { title: 'Khu vực', dataIndex: 'area', key: 'area', width: 120 },
    {
      title: 'Thời gian', key: 'period', width: 200,
      render: (_: unknown, r: Campaign) => `${dayjs(r.startDate).format('DD/MM/YYYY')} - ${r.endDate ? dayjs(r.endDate).format('DD/MM/YYYY') : '...'}`,
    },
    {
      title: 'Tiến độ', key: 'progress', width: 200,
      render: (_: unknown, r: Campaign) => {
        const percent = r.targetPopulation > 0 ? Math.round((r.completedCount / r.targetPopulation) * 100) : 0;
        return (
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Progress percent={percent} size="small" status={percent >= 100 ? 'success' : 'active'} />
            <span style={{ fontSize: 12 }}>{r.completedCount} / {r.targetPopulation}</span>
          </Space>
        );
      },
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120,
      render: (s: number) => <Tag color={CAMPAIGN_STATUS_COLORS[s]}>{CAMPAIGN_STATUS_LABELS[s]}</Tag>,
    },
  ];

  const aefiColumns: ColumnsType<AefiReport> = [
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 150 },
    { title: 'Vắc xin', dataIndex: 'vaccineName', key: 'vaccineName', width: 150 },
    { title: 'Ngày tiêm', dataIndex: 'vaccinationDate', key: 'vaccinationDate', width: 110, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Ngày phản ứng', dataIndex: 'reactionDate', key: 'reactionDate', width: 110, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    {
      title: 'Mức độ', dataIndex: 'severity', key: 'severity', width: 120,
      render: (s: number) => {
        const info = AEFI_SEVERITY_LABELS[s];
        return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>-</Tag>;
      },
    },
    { title: 'Triệu chứng', dataIndex: 'symptoms', key: 'symptoms', width: 200, ellipsis: true },
    { title: 'Kết quả', dataIndex: 'outcome', key: 'outcome', width: 120 },
    { title: 'Người báo cáo', dataIndex: 'reportedBy', key: 'reportedBy', width: 130 },
    {
      title: 'Tình trạng', dataIndex: 'status', key: 'status', width: 120,
      render: (s: number) => {
        const labels: Record<number, string> = { 0: 'Đã báo cáo', 1: 'Đang điều tra', 2: 'Đã đóng' };
        const colors: Record<number, string> = { 0: 'orange', 1: 'processing', 2: 'default' };
        return <Tag color={colors[s]}>{labels[s]}</Tag>;
      },
    },
  ];

  const epiScheduleColumns: ColumnsType<typeof EPI_SCHEDULE[0]> = [
    { title: 'Vắc xin', dataIndex: 'vaccine', key: 'vaccine', width: 150 },
    { title: 'Tuổi tiêm', dataIndex: 'age', key: 'age', width: 120 },
    { title: 'Phòng bệnh', dataIndex: 'disease', key: 'disease' },
  ];

  const overdueCount = vaccinations.filter(v => v.status === 2).length;

  const tabItems = [
    {
      key: 'schedule',
      label: (
        <span>
          <CalendarOutlined /> Lịch tiêm chủng ({vaccinations.length})
        </span>
      ),
      children: (
        <>
          <Row justify="space-between" style={{ marginBottom: 16 }}>
            <Col>
              <Search
                placeholder="Tìm bệnh nhân, vắc xin..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={fetchData}
                allowClear
                style={{ width: 300 }}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { vaccineForm.resetFields(); setIsVaccineModalOpen(true); }}>
                Ghi nhận tiêm chủng
              </Button>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} lg={17}>
              <Table dataSource={vaccinations} columns={vaccinationColumns} rowKey="id" size="small" scroll={{ x: 1200 }}
                pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }} />
            </Col>
            <Col xs={24} lg={7}>
              <Card title="Lịch tiêm chủng TCMR tham chiếu" size="small">
                <Table dataSource={EPI_SCHEDULE} columns={epiScheduleColumns} rowKey="vaccine" size="small" pagination={false} />
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'campaigns',
      label: (
        <span>
          <TeamOutlined /> Chiến dịch ({campaigns.length})
        </span>
      ),
      children: (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={6}>
              <Card><Statistic title="Tổng chiến dịch" value={campaignStats.totalCampaigns} styles={{ content: { color: '#1890ff' } }} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card><Statistic title="Đang triển khai" value={campaignStats.activeCampaigns} styles={{ content: { color: '#52c41a' } }} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card><Statistic title="Đã tiêm" value={campaignStats.totalVaccinated} styles={{ content: { color: '#722ed1' } }} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card><Statistic title="Tỷ lệ bao phủ" value={campaignStats.coveragePercent} suffix="%" styles={{ content: { color: '#13c2c2' } }} /></Card>
            </Col>
          </Row>
          <Row justify="end" style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { campaignForm.resetFields(); setIsCampaignModalOpen(true); }}>
              Tạo chiến dịch
            </Button>
          </Row>
          <Table dataSource={campaigns} columns={campaignColumns} rowKey="id" size="small" scroll={{ x: 1000 }}
            pagination={{ pageSize: 10, showTotal: (t) => `Tổng ${t} chiến dịch` }} />
        </>
      ),
    },
    {
      key: 'aefi',
      label: (
        <span>
          <WarningOutlined /> Phản ứng sau tiêm ({aefiReports.length})
        </span>
      ),
      children: (
        <>
          {aefiReports.some(r => r.severity >= 3) && (
            <Alert
              title="Có phản ứng nặng/nghiêm trọng sau tiêm cần theo dõi"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Table dataSource={aefiReports} columns={aefiColumns} rowKey="id" size="small" scroll={{ x: 1200 }}
            pagination={{ pageSize: 15, showTotal: (t) => `Tổng ${t} báo cáo` }} />
        </>
      ),
    },
    {
      key: 'stats',
      label: (
        <span>
          <ExperimentOutlined /> Thống kê
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Tỷ lệ bao phủ vắc xin">
              <Progress percent={campaignStats.coveragePercent} strokeColor="#52c41a" />
              <p style={{ marginTop: 8 }}>Tổng đã tiêm: <strong>{campaignStats.totalVaccinated}</strong></p>
              <p>Chiến dịch hoàn thành: <strong>{campaigns.filter(c => c.status === 2).length}</strong></p>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Tiêm chủng quá hạn">
              <Statistic
                title="Số lượt quá hạn"
                value={overdueCount}
                prefix={<ClockCircleOutlined />}
                styles={{ content: { color: overdueCount > 0 ? '#ff4d4f' : '#52c41a' } }}
              />
              <p style={{ marginTop: 8 }}>Đã tiêm: <strong>{vaccinations.filter(v => v.status === 1).length}</strong></p>
              <p>Đang chờ: <strong>{vaccinations.filter(v => v.status === 0).length}</strong></p>
              <p>Hoãn: <strong>{vaccinations.filter(v => v.status === 3).length}</strong></p>
            </Card>
          </Col>
          <Col xs={24}>
            <Card title="Phản ứng sau tiêm (AEFI) theo mức độ">
              <Row gutter={16}>
                {[1, 2, 3, 4].map(severity => {
                  const info = AEFI_SEVERITY_LABELS[severity];
                  const count = aefiReports.filter(r => r.severity === severity).length;
                  return (
                    <Col xs={12} sm={6} key={severity}>
                      <Badge color={info.color} text={`${info.label}: ${count}`} />
                    </Col>
                  );
                })}
              </Row>
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                <ExperimentOutlined style={{ marginRight: 8 }} />
                Tiêm chủng mở rộng (EPI)
              </Title>
            </Col>
            <Col>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
            </Col>
          </Row>
        </Card>

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </Card>

        {/* Record Vaccination Modal */}
        <Modal
          title="Ghi nhận tiêm chủng"
          open={isVaccineModalOpen}
          onCancel={() => setIsVaccineModalOpen(false)}
          onOk={handleRecordVaccination}
          okText="Lưu"
          cancelText="Hủy"
          confirmLoading={saving}
          width={700}
          destroyOnHidden
        >
          <Form form={vaccineForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="patientName" label="Họ tên bệnh nhân" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                  <Input placeholder="Họ và tên" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="patientCode" label="Mã bệnh nhân">
                  <Input placeholder="Mã BN" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="vaccineName" label="Tên vắc xin" rules={[{ required: true, message: 'Vui lòng nhập tên vắc xin' }]}>
                  <Input placeholder="VD: DPT-VGB-Hib" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="lotNumber" label="Số lô" rules={[{ required: true, message: 'Nhập số lô' }]}>
                  <Input placeholder="Số lô" />
                </Form.Item>
              </Col>
              <Col span={3}>
                <Form.Item name="doseNumber" label="Liều thứ">
                  <Input type="number" placeholder="1" />
                </Form.Item>
              </Col>
              <Col span={3}>
                <Form.Item name="totalDoses" label="Tổng liều">
                  <Input type="number" placeholder="3" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="site" label="Vị trí tiêm" rules={[{ required: true, message: 'Chọn vị trí' }]}>
                  <Select placeholder="Vị trí" options={[
                    { value: 'Đùi trái', label: 'Đùi trái' },
                    { value: 'Đùi phải', label: 'Đùi phải' },
                    { value: 'Cánh tay trái', label: 'Cánh tay trái' },
                    { value: 'Cánh tay phải', label: 'Cánh tay phải' },
                  ]} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="route" label="Đường tiêm" rules={[{ required: true, message: 'Chọn đường tiêm' }]}>
                  <Select placeholder="Đường tiêm" options={[
                    { value: 'IM', label: 'Tiêm bắp (IM)' },
                    { value: 'SC', label: 'Tiêm dưới da (SC)' },
                    { value: 'ID', label: 'Tiêm trong da (ID)' },
                    { value: 'Oral', label: 'Uống' },
                  ]} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="vaccinationDate" label="Ngày tiêm" rules={[{ required: true, message: 'Chọn ngày' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="nextDueDate" label="Ngày tiêm tiếp">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Ghi chú">
              <TextArea rows={2} placeholder="Ghi chú thêm..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Create Campaign Modal */}
        <Modal
          title="Tạo chiến dịch tiêm chủng"
          open={isCampaignModalOpen}
          onCancel={() => setIsCampaignModalOpen(false)}
          onOk={handleCreateCampaign}
          okText="Tạo"
          cancelText="Hủy"
          confirmLoading={saving}
          width={600}
          destroyOnHidden
        >
          <Form form={campaignForm} layout="vertical">
            <Form.Item name="name" label="Tên chiến dịch" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
              <Input placeholder="VD: Chiến dịch tiêm Sởi-Rubella 2026" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="vaccineName" label="Vắc xin" rules={[{ required: true, message: 'Nhập vắc xin' }]}>
                  <Input placeholder="Tên vắc xin" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="area" label="Khu vực">
                  <Input placeholder="Khu vực triển khai" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="startDate" label="Ngày bắt đầu" rules={[{ required: true, message: 'Chọn ngày' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="endDate" label="Ngày kết thúc">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="targetPopulation" label="Dân số mục tiêu" rules={[{ required: true, message: 'Nhập số' }]}>
                  <Input type="number" placeholder="0" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="description" label="Mô tả">
              <TextArea rows={3} placeholder="Mô tả chiến dịch..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default Immunization;
