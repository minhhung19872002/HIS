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
  Descriptions,
  Alert,
  Badge,
  Timeline,
  Divider,
} from 'antd';
import {
  AlertOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  WarningOutlined,
  FireOutlined,
  EyeOutlined,
  EditOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as epidemiologyApi from '../api/epidemiology';
import type { DiseaseReport, Outbreak, EpiStats, NotifiableDisease } from '../api/epidemiology';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const DISEASE_GROUP_COLORS: Record<string, string> = {
  A: 'red',
  B: 'orange',
  C: 'blue',
};

const DISEASE_GROUP_LABELS: Record<string, string> = {
  A: 'Nhóm A - Đặc biệt nguy hiểm',
  B: 'Nhóm B - Nguy hiểm',
  C: 'Nhóm C - Ít nguy hiểm',
};

const REPORT_STATUS_LABELS: Record<number, string> = {
  0: 'Bản nháp',
  1: 'Đã gửi',
  2: 'Xác nhận',
  3: 'Đã đóng',
};

const REPORT_STATUS_COLORS: Record<number, string> = {
  0: 'default',
  1: 'processing',
  2: 'success',
  3: 'blue',
};

const OUTBREAK_STATUS_LABELS: Record<number, string> = {
  0: 'Nghi ngờ',
  1: 'Xác nhận',
  2: 'Đã khống chế',
  3: 'Đã kết thúc',
};

const OUTBREAK_STATUS_COLORS: Record<number, string> = {
  0: 'warning',
  1: 'error',
  2: 'processing',
  3: 'success',
};

const RISK_LEVEL_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Thấp', color: 'green' },
  2: { label: 'Trung bình', color: 'gold' },
  3: { label: 'Cao', color: 'orange' },
  4: { label: 'Rất cao', color: 'red' },
};

const Epidemiology: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState<DiseaseReport[]>([]);
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [epiStats, setEpiStats] = useState<EpiStats>({
    totalReports: 0,
    confirmedCases: 0,
    activeOutbreaks: 0,
    deathCount: 0,
    monthlyTrend: [],
    diseaseDistribution: [],
  });
  const [notifiableDiseases, setNotifiableDiseases] = useState<NotifiableDisease[]>([]);
  const [keyword, setKeyword] = useState('');
  const [diseaseGroupFilter, setDiseaseGroupFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [selectedReport, setSelectedReport] = useState<DiseaseReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isOutbreakModalOpen, setIsOutbreakModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [reportForm] = Form.useForm();
  const [outbreakForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        epidemiologyApi.searchDiseaseReports({
          keyword: keyword || undefined,
          diseaseGroup: diseaseGroupFilter,
          fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
          toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
        }),
        epidemiologyApi.searchOutbreaks({ keyword: keyword || undefined }),
        epidemiologyApi.getEpiStats(),
        epidemiologyApi.getNotifiableDiseases(),
      ]);
      if (results[0].status === 'fulfilled') setReports(results[0].value);
      if (results[1].status === 'fulfilled') setOutbreaks(results[1].value);
      if (results[2].status === 'fulfilled') setEpiStats(results[2].value);
      if (results[3].status === 'fulfilled') setNotifiableDiseases(results[3].value);
    } catch {
      message.warning('Không thể tải dữ liệu dịch tễ');
    } finally {
      setLoading(false);
    }
  }, [keyword, diseaseGroupFilter, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewReport = (record: DiseaseReport) => {
    setSelectedReport(record);
    setIsDetailModalOpen(true);
  };

  const handleCreateReport = async () => {
    try {
      const values = await reportForm.validateFields();
      setSaving(true);
      await epidemiologyApi.reportDisease({
        ...values,
        reportDate: values.reportDate?.format('YYYY-MM-DD'),
        onsetDate: values.onsetDate?.format('YYYY-MM-DD'),
        diagnosisDate: values.diagnosisDate?.format('YYYY-MM-DD'),
      });
      message.success('Đã báo cáo ca bệnh');
      setIsReportModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể báo cáo ca bệnh');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOutbreak = async () => {
    try {
      const values = await outbreakForm.validateFields();
      setSaving(true);
      await epidemiologyApi.createOutbreak({
        ...values,
        startDate: values.startDate?.format('YYYY-MM-DD'),
      });
      message.success('Đã tạo báo cáo ổ dịch');
      setIsOutbreakModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo báo cáo ổ dịch');
    } finally {
      setSaving(false);
    }
  };

  const activeOutbreaks = outbreaks.filter(o => o.status <= 1);

  const reportColumns: ColumnsType<DiseaseReport> = [
    { title: 'Mã BC', dataIndex: 'reportCode', key: 'reportCode', width: 100 },
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 140 },
    { title: 'Tuổi', dataIndex: 'age', key: 'age', width: 60 },
    { title: 'Giới', dataIndex: 'gender', key: 'gender', width: 60, render: (g: number) => g === 1 ? 'Nam' : 'Nữ' },
    { title: 'Bệnh', dataIndex: 'diseaseName', key: 'diseaseName', width: 160 },
    {
      title: 'Nhóm', dataIndex: 'diseaseGroup', key: 'diseaseGroup', width: 80,
      render: (g: string) => <Tag color={DISEASE_GROUP_COLORS[g]}>{g}</Tag>,
    },
    { title: 'Ngày khởi phát', dataIndex: 'onsetDate', key: 'onsetDate', width: 110, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Ngày báo cáo', dataIndex: 'reportDate', key: 'reportDate', width: 110, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    {
      title: 'XN xác nhận', dataIndex: 'labConfirmed', key: 'labConfirmed', width: 100,
      render: (v: boolean) => v ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 100,
      render: (s: number) => <Tag color={REPORT_STATUS_COLORS[s]}>{REPORT_STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 100,
      render: (_: unknown, record: DiseaseReport) => (
        <div className="flex items-center gap-2">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewReport(record)}>Xem</Button>
        </div>
      ),
    },
  ];

  const outbreakColumns: ColumnsType<Outbreak> = [
    { title: 'Tên ổ dịch', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Bệnh', dataIndex: 'diseaseName', key: 'diseaseName', width: 150 },
    { title: 'Vị trí', dataIndex: 'location', key: 'location', width: 150 },
    { title: 'Ngày phát hiện', dataIndex: 'startDate', key: 'startDate', width: 110, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Số ca', dataIndex: 'caseCount', key: 'caseCount', width: 80 },
    { title: 'Tử vong', dataIndex: 'deathCount', key: 'deathCount', width: 80 },
    {
      title: 'Mức nguy cơ', dataIndex: 'riskLevel', key: 'riskLevel', width: 120,
      render: (r: number) => {
        const info = RISK_LEVEL_LABELS[r];
        return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>-</Tag>;
      },
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120,
      render: (s: number) => <Tag color={OUTBREAK_STATUS_COLORS[s]}>{OUTBREAK_STATUS_LABELS[s]}</Tag>,
    },
  ];

  const tabItems = [
    {
      key: 'reports',
      label: (
        <span>
          <AlertOutlined /> Báo cáo ca bệnh ({reports.length})
        </span>
      ),
      children: (
        <>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <Search
                placeholder="Tìm bệnh nhân, mã BC..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={fetchData}
                allowClear
                prefix={<SearchOutlined />}
              />
            </div>
            <div>
              <Select
                placeholder="Nhóm bệnh"
                allowClear
                style={{ width: '100%' }}
                value={diseaseGroupFilter}
                onChange={setDiseaseGroupFilter}
                options={[
                  { value: 'A', label: 'Nhóm A' },
                  { value: 'B', label: 'Nhóm B' },
                  { value: 'C', label: 'Nhóm C' },
                ]}
              />
            </div>
            <div>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(val) => setDateRange(val as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                format="DD/MM/YYYY"
              />
            </div>
            <div className="flex-1">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { reportForm.resetFields(); setIsReportModalOpen(true); }}>
                Báo cáo ca bệnh
              </Button>
            </div>
          </div>
          <Table dataSource={reports} columns={reportColumns} rowKey="id" size="small" scroll={{ x: 1300 }}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
            onRow={(record) => ({ onDoubleClick: () => handleViewReport(record), style: { cursor: 'pointer' } })}
          />
        </>
      ),
    },
    {
      key: 'outbreaks',
      label: (
        <span>
          <FireOutlined /> Ổ dịch ({outbreaks.length})
        </span>
      ),
      children: (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { outbreakForm.resetFields(); setIsOutbreakModalOpen(true); }}>
              Tạo báo cáo ổ dịch
            </Button>
          </div>
          <Table dataSource={outbreaks} columns={outbreakColumns} rowKey="id" size="small" scroll={{ x: 1100 }}
            pagination={{ pageSize: 10, showTotal: (t) => `Tổng ${t} ổ dịch` }} />
        </>
      ),
    },
    {
      key: 'contact-tracing',
      label: (
        <span>
          <ClockCircleOutlined /> Truy vết tiếp xúc
        </span>
      ),
      children: (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <Alert
            title="Chức năng truy vết tiếp xúc liên kết với báo cáo ca bệnh. Chọn một ca bệnh để bắt đầu truy vết."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Typography.Paragraph>
            Để truy vết tiếp xúc, chuyển sang tab &quot;Báo cáo ca bệnh&quot;, chọn một ca bệnh cụ thể, sau đó thêm danh sách người tiếp xúc.
          </Typography.Paragraph>
          {reports.filter(r => r.status === 2 && r.diseaseGroup === 'A').length > 0 && (
            <Alert
              title={`Có ${reports.filter(r => r.status === 2 && r.diseaseGroup === 'A').length} ca bệnh nhóm A cần truy vết khẩn cấp`}
              type="error"
              showIcon
            />
          )}
        </div>
      ),
    },
    {
      key: 'stats',
      label: (
        <span>
          <BarChartOutlined /> Thống kê
        </span>
      ),
      children: (
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Card title="Phân bố theo bệnh">
              {epiStats.diseaseDistribution.length > 0 ? (
                epiStats.diseaseDistribution.map(item => (
                  <div key={item.disease} style={{ marginBottom: 8 }}>
                    <div className="grid grid-cols-4 gap-4">
                      <div>{item.disease}</div>
                      <div><strong>{item.count}</strong> ca</div>
                    </div>
                  </div>
                ))
              ) : (
                <Typography.Text type="secondary">Chưa có dữ liệu</Typography.Text>
              )}
            </div>
          </div>
          <div>
            <Card title="Xu hướng theo tháng">
              {epiStats.monthlyTrend.length > 0 ? (
                epiStats.monthlyTrend.map(item => (
                  <div key={item.month} style={{ marginBottom: 8 }}>
                    <div className="grid grid-cols-4 gap-4">
                      <div>{item.month}</div>
                      <div><strong>{item.count}</strong> ca</div>
                    </div>
                  </div>
                ))
              ) : (
                <Typography.Text type="secondary">Chưa có dữ liệu</Typography.Text>
              )}
            </div>
          </div>
          <div>
            <Card title="Danh mục 28 bệnh truyền nhiễm phải báo cáo">
              <div className="grid grid-cols-4 gap-4">
                {notifiableDiseases.map(d => (
                  <div>
                    <Tag color={DISEASE_GROUP_COLORS[d.group]}>{d.group}</Tag> {d.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-lg font-semibold m-0">
                <AlertOutlined style={{ marginRight: 8 }} />
                Giám sát dịch tễ &amp; Bệnh truyền nhiễm
              </h4>
            </div>
            <div>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
            </div>
          </div>
        </div>

        {/* Active outbreak alert */}
        {activeOutbreaks.length > 0 && (
          <Alert
            title={`Cảnh báo: Đang có ${activeOutbreaks.length} ổ dịch hoạt động cần theo dõi`}
            type="error"
            showIcon
            icon={<WarningOutlined />}
            style={{ marginBottom: 16 }}
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {activeOutbreaks.map(o => (
                  <li key={o.id}>
                    <strong>{o.name}</strong> - {o.diseaseName} tại {o.location}
                    ({o.caseCount} ca, {o.deathCount} tử vong)
                    <Tag color={RISK_LEVEL_LABELS[o.riskLevel]?.color} style={{ marginLeft: 8 }}>
                      {RISK_LEVEL_LABELS[o.riskLevel]?.label}
                    </Tag>
                  </li>
                ))}
              </ul>
            }
          />
        )}

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="text-gray-500 text-sm mb-1">Tổng ca báo cáo</div><div className="text-2xl font-semibold" style={{ color: '#1890ff' }}><AlertOutlined className="mr-1" />{epiStats.totalReports}</div></div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><Statistic title="Đã xác nhận" value={epiStats.confirmedCases} styles={{ content: { color: '#faad14' } }} /></div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="text-gray-500 text-sm mb-1">Ổ dịch hoạt động</div><div className="text-2xl font-semibold" style={{ color: '#ff4d4f' }}><FireOutlined className="mr-1" />{epiStats.activeOutbreaks}</div></div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><Statistic title="Tử vong" value={epiStats.deathCount} styles={{ content: { color: '#ff4d4f' } }} /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </div>

        {/* Report Disease Modal */}
        <Modal
          title="Báo cáo ca bệnh truyền nhiễm"
          open={isReportModalOpen}
          onCancel={() => setIsReportModalOpen(false)}
          onOk={handleCreateReport}
          okText="Gửi báo cáo"
          cancelText="Hủy"
          confirmLoading={saving}
          width={700}
          destroyOnHidden
        >
          <Form form={reportForm} layout="vertical">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="patientName" label="Họ tên bệnh nhân" rules={[{ required: true, message: 'Nhập họ tên' }]}>
                  <Input placeholder="Họ và tên" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="gender" label="Giới">
                  <Select options={[{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }]} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="age" label="Tuổi">
                  <Input type="number" placeholder="0" />
                </Form.Item>
              </div>
            </div>
            <Form.Item name="address" label="Địa chỉ">
              <Input placeholder="Địa chỉ bệnh nhân" />
            </Form.Item>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="diseaseCode" label="Bệnh" rules={[{ required: true, message: 'Chọn bệnh' }]}>
                  <Select
                    placeholder="Chọn bệnh truyền nhiễm"
                    showSearch
                    optionFilterProp="label"
                    options={notifiableDiseases.map(d => ({
                      value: d.code,
                      label: `[${d.group}] ${d.name}`,
                    }))}
                  />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="diseaseGroup" label="Nhóm bệnh" rules={[{ required: true, message: 'Chọn nhóm' }]}>
                  <Select options={[
                    { value: 'A', label: 'Nhóm A - Đặc biệt nguy hiểm' },
                    { value: 'B', label: 'Nhóm B - Nguy hiểm' },
                    { value: 'C', label: 'Nhóm C - Ít nguy hiểm' },
                  ]} />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="onsetDate" label="Ngày khởi phát" rules={[{ required: true, message: 'Chọn ngày' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="diagnosisDate" label="Ngày chẩn đoán">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="reportDate" label="Ngày báo cáo" rules={[{ required: true, message: 'Chọn ngày' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
            </div>
            <Form.Item name="labConfirmed" label="Xét nghiệm xác nhận">
              <Select options={[{ value: true, label: 'Có' }, { value: false, label: 'Không' }]} />
            </Form.Item>
            <Form.Item name="notes" label="Ghi chú">
              <TextArea rows={3} placeholder="Mô tả triệu chứng, diễn biến..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Outbreak Modal */}
        <Modal
          title="Tạo báo cáo ổ dịch"
          open={isOutbreakModalOpen}
          onCancel={() => setIsOutbreakModalOpen(false)}
          onOk={handleCreateOutbreak}
          okText="Tạo"
          cancelText="Hủy"
          confirmLoading={saving}
          width={600}
          destroyOnHidden
        >
          <Form form={outbreakForm} layout="vertical">
            <Form.Item name="name" label="Tên ổ dịch" rules={[{ required: true, message: 'Nhập tên' }]}>
              <Input placeholder="VD: Ổ dịch SXH phường A" />
            </Form.Item>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="diseaseName" label="Bệnh" rules={[{ required: true, message: 'Nhập tên bệnh' }]}>
                  <Input placeholder="Tên bệnh" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="location" label="Vị trí" rules={[{ required: true, message: 'Nhập vị trí' }]}>
                  <Input placeholder="Địa điểm ổ dịch" />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="startDate" label="Ngày phát hiện" rules={[{ required: true, message: 'Chọn ngày' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="riskLevel" label="Mức nguy cơ" rules={[{ required: true, message: 'Chọn mức' }]}>
                  <Select options={[
                    { value: 1, label: 'Thấp' },
                    { value: 2, label: 'Trung bình' },
                    { value: 3, label: 'Cao' },
                    { value: 4, label: 'Rất cao' },
                  ]} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="caseCount" label="Số ca ban đầu">
                  <Input type="number" placeholder="0" />
                </Form.Item>
              </div>
            </div>
            <Form.Item name="description" label="Mô tả">
              <TextArea rows={3} placeholder="Mô tả tình hình ổ dịch..." />
            </Form.Item>
            <Form.Item name="responseActions" label="Biện pháp đáp ứng">
              <TextArea rows={3} placeholder="Các biện pháp phòng chống đã thực hiện..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Detail Modal */}
        <Modal
          title="Chi tiết ca bệnh truyền nhiễm"
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={<Button onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>}
          width={700}
        >
          {selectedReport && (
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Mã báo cáo">{selectedReport.reportCode}</Descriptions.Item>
              <Descriptions.Item label="Ngày báo cáo">{selectedReport.reportDate ? dayjs(selectedReport.reportDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Bệnh nhân">{selectedReport.patientName}</Descriptions.Item>
              <Descriptions.Item label="Tuổi / Giới">{selectedReport.age} / {selectedReport.gender === 1 ? 'Nam' : 'Nữ'}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>{selectedReport.address || '-'}</Descriptions.Item>
              <Descriptions.Item label="Bệnh">{selectedReport.diseaseName}</Descriptions.Item>
              <Descriptions.Item label="Nhóm">
                <Tag color={DISEASE_GROUP_COLORS[selectedReport.diseaseGroup]}>{DISEASE_GROUP_LABELS[selectedReport.diseaseGroup]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày khởi phát">{selectedReport.onsetDate ? dayjs(selectedReport.onsetDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày chẩn đoán">{selectedReport.diagnosisDate ? dayjs(selectedReport.diagnosisDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="XN xác nhận">{selectedReport.labConfirmed ? 'Có' : 'Không'}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={REPORT_STATUS_COLORS[selectedReport.status]}>{REPORT_STATUS_LABELS[selectedReport.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="BS báo cáo">{selectedReport.reportingDoctor || '-'}</Descriptions.Item>
              <Descriptions.Item label="Kết quả">{selectedReport.outcome || '-'}</Descriptions.Item>
              <Descriptions.Item label="Ghi chú" span={2}>{selectedReport.notes || '-'}</Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </div>
    </Spin>
  );
};

export default Epidemiology;
