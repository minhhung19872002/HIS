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
  Progress,
  Divider,
  Badge,
} from 'antd';
import {
  AlertOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  ExperimentOutlined,
  SafetyOutlined,
  BarChartOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as foodSafetyApi from '../api/foodSafety';
import type {
  FoodSafetyIncident,
  FoodInspection,
  FoodSafetyStats,
  FoodSafetySample,
  InspectionStats,
} from '../api/foodSafety';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const SEVERITY_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Nhẹ', color: 'green' },
  2: { label: 'Trung bình', color: 'gold' },
  3: { label: 'Nặng', color: 'orange' },
  4: { label: 'Nguy kịch', color: 'red' },
};

const STATUS_CONFIG: Record<number, { label: string; color: string }> = {
  0: { label: 'Đã báo cáo', color: 'default' },
  1: { label: 'Đang điều tra', color: 'processing' },
  2: { label: 'Đã xác nhận', color: 'warning' },
  3: { label: 'Đã đóng', color: 'success' },
};

const COMPLIANCE_CONFIG: Record<string, { label: string; color: string }> = {
  A: { label: 'Loại A - Tốt', color: 'green' },
  B: { label: 'Loại B - Khá', color: 'blue' },
  C: { label: 'Loại C - Trung bình', color: 'orange' },
  D: { label: 'Loại D - Kém', color: 'red' },
};

const INSPECTION_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Đã lên lịch', color: 'default' },
  1: { label: 'Hoàn thành', color: 'success' },
  2: { label: 'Cần tái kiểm', color: 'warning' },
  3: { label: 'Đã đóng', color: 'blue' },
};

const FoodSafety: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('incidents');
  const [incidents, setIncidents] = useState<FoodSafetyIncident[]>([]);
  const [inspections, setInspections] = useState<FoodInspection[]>([]);
  const [stats, setStats] = useState<FoodSafetyStats | null>(null);
  const [inspectionStats, setInspectionStats] = useState<InspectionStats | null>(null);
  const [samples, setSamples] = useState<FoodSafetySample[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<FoodSafetyIncident | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<FoodSafetyIncident | null>(null);
  const [editingInspection, setEditingInspection] = useState<FoodInspection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [incidentForm] = Form.useForm();
  const [inspectionForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        foodSafetyApi.searchIncidents(),
        foodSafetyApi.searchInspections(),
        foodSafetyApi.getIncidentStats(),
        foodSafetyApi.getInspectionStats(),
      ]);
      if (results[0].status === 'fulfilled') setIncidents(results[0].value);
      if (results[1].status === 'fulfilled') setInspections(results[1].value);
      if (results[2].status === 'fulfilled') setStats(results[2].value);
      if (results[3].status === 'fulfilled') setInspectionStats(results[3].value);
    } catch {
      message.warning('Không thể tải dữ liệu an toàn thực phẩm');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewIncident = async (record: FoodSafetyIncident) => {
    setSelectedIncident(record);
    setDetailModalOpen(true);
    try {
      const sampleData = await foodSafetyApi.getSamplesByIncident(record.id);
      setSamples(sampleData);
    } catch {
      console.warn('Failed to load samples');
    }
  };

  const handleEditIncident = (record: FoodSafetyIncident) => {
    setEditingIncident(record);
    incidentForm.setFieldsValue({
      ...record,
      incidentDate: record.incidentDate ? dayjs(record.incidentDate) : undefined,
    });
    setIncidentModalOpen(true);
  };

  const handleCreateIncident = () => {
    setEditingIncident(null);
    incidentForm.resetFields();
    setIncidentModalOpen(true);
  };

  const handleSaveIncident = async () => {
    try {
      const values = await incidentForm.validateFields();
      setSubmitting(true);
      const data = {
        ...values,
        incidentDate: values.incidentDate?.format('YYYY-MM-DD'),
      };
      if (editingIncident) {
        await foodSafetyApi.updateIncident(editingIncident.id, data);
        message.success('Cập nhật sự cố thành công');
      } else {
        await foodSafetyApi.createIncident(data);
        message.success('Thêm sự cố thành công');
      }
      setIncidentModalOpen(false);
      fetchData();
    } catch {
      message.warning('Vui lòng kiểm tra lại thông tin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInspection = () => {
    setEditingInspection(null);
    inspectionForm.resetFields();
    setInspectionModalOpen(true);
  };

  const handleEditInspection = (record: FoodInspection) => {
    setEditingInspection(record);
    inspectionForm.setFieldsValue({
      ...record,
      inspectionDate: record.inspectionDate ? dayjs(record.inspectionDate) : undefined,
    });
    setInspectionModalOpen(true);
  };

  const handleSaveInspection = async () => {
    try {
      const values = await inspectionForm.validateFields();
      setSubmitting(true);
      const data = {
        ...values,
        inspectionDate: values.inspectionDate?.format('YYYY-MM-DD'),
      };
      if (editingInspection) {
        await foodSafetyApi.updateInspection(editingInspection.id, data);
        message.success('Cập nhật kiểm tra thành công');
      } else {
        await foodSafetyApi.createInspection(data);
        message.success('Thêm kiểm tra thành công');
      }
      setInspectionModalOpen(false);
      fetchData();
    } catch {
      message.warning('Vui lòng kiểm tra lại thông tin');
    } finally {
      setSubmitting(false);
    }
  };

  const incidentColumns: ColumnsType<FoodSafetyIncident> = [
    {
      title: 'Mã SC',
      dataIndex: 'incidentCode',
      key: 'incidentCode',
      width: 120,
    },
    {
      title: 'Ngày xảy ra',
      dataIndex: 'incidentDate',
      key: 'incidentDate',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Địa điểm',
      dataIndex: 'location',
      key: 'location',
      ellipsis: true,
    },
    {
      title: 'Loại cơ sở',
      dataIndex: 'locationType',
      key: 'locationType',
      width: 120,
    },
    {
      title: 'Mức độ',
      dataIndex: 'severity',
      key: 'severity',
      width: 110,
      render: (s: number) => {
        const cfg = SEVERITY_CONFIG[s];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : '-';
      },
    },
    {
      title: 'Người bị ảnh hưởng',
      dataIndex: 'totalAffected',
      key: 'totalAffected',
      width: 130,
      align: 'center',
      render: (v: number) => <Badge count={v} showZero color={v > 10 ? 'red' : 'blue'} />,
    },
    {
      title: 'Trạng thái điều tra',
      dataIndex: 'investigationStatus',
      key: 'investigationStatus',
      width: 150,
      render: (s: number) => {
        const cfg = STATUS_CONFIG[s];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : '-';
      },
    },
    {
      title: 'Tiến trình',
      key: 'progress',
      width: 120,
      render: (_: unknown, record: FoodSafetyIncident) => {
        const pct = record.investigationStatus === 3 ? 100 : record.investigationStatus === 2 ? 75 : record.investigationStatus === 1 ? 40 : 10;
        return <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} /></div>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      render: (_: unknown, record: FoodSafetyIncident) => (
        <div className="flex items-center gap-1">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewIncident(record)} />
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditIncident(record)} />
        </div>
      ),
    },
  ];

  const inspectionColumns: ColumnsType<FoodInspection> = [
    {
      title: 'Mã KT',
      dataIndex: 'inspectionCode',
      key: 'inspectionCode',
      width: 120,
    },
    {
      title: 'Ngày kiểm tra',
      dataIndex: 'inspectionDate',
      key: 'inspectionDate',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Cơ sở',
      dataIndex: 'facilityName',
      key: 'facilityName',
      ellipsis: true,
    },
    {
      title: 'Loại',
      dataIndex: 'facilityType',
      key: 'facilityType',
      width: 120,
    },
    {
      title: 'Xếp loại',
      dataIndex: 'complianceLevel',
      key: 'complianceLevel',
      width: 130,
      render: (level: string) => {
        const cfg = COMPLIANCE_CONFIG[level];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : '-';
      },
    },
    {
      title: 'Điểm tổng',
      dataIndex: 'overallScore',
      key: 'overallScore',
      width: 100,
      align: 'center',
      render: (v: number) => (
        <Text strong style={{ color: v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f' }}>
          {v ?? '-'}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: number) => {
        const cfg = INSPECTION_STATUS[s];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : '-';
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 80,
      render: (_: unknown, record: FoodInspection) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditInspection(record)} />
      ),
    },
  ];

  const sampleColumns: ColumnsType<FoodSafetySample> = [
    { title: 'Mã mẫu', dataIndex: 'sampleCode', key: 'sampleCode', width: 120 },
    { title: 'Loại mẫu', dataIndex: 'sampleType', key: 'sampleType', width: 100 },
    { title: 'Mô tả', dataIndex: 'sampleDescription', key: 'sampleDescription', ellipsis: true },
    {
      title: 'Ngày thu',
      dataIndex: 'collectedDate',
      key: 'collectedDate',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Kết quả',
      dataIndex: 'result',
      key: 'result',
      width: 110,
      render: (r: string) => (
        <Tag color={r === 'Positive' ? 'red' : r === 'Negative' ? 'green' : 'default'}>
          {r === 'Positive' ? 'Dương tính' : r === 'Negative' ? 'Âm tính' : 'Chờ KQ'}
        </Tag>
      ),
    },
    { title: 'Vi sinh vật', dataIndex: 'organism', key: 'organism', width: 130 },
  ];

  const filteredIncidents = keyword
    ? incidents.filter(i =>
        i.incidentCode?.toLowerCase().includes(keyword.toLowerCase()) ||
        i.location?.toLowerCase().includes(keyword.toLowerCase()) ||
        i.description?.toLowerCase().includes(keyword.toLowerCase())
      )
    : incidents;

  const filteredInspections = keyword
    ? inspections.filter(i =>
        i.inspectionCode?.toLowerCase().includes(keyword.toLowerCase()) ||
        i.facilityName?.toLowerCase().includes(keyword.toLowerCase())
      )
    : inspections;

  const tabItems = [
    {
      key: 'incidents',
      label: (
        <span><AlertOutlined /> Su co ngo doc</span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Search
              placeholder="Tim kiem su co..."
              allowClear
              onSearch={v => setKeyword(v)}
              onChange={e => !e.target.value && setKeyword('')}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateIncident}>
              Them su co
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Lam moi</Button>
          </div>
          <Table
            columns={incidentColumns}
            dataSource={filteredIncidents}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, showTotal: (t) => `Tong ${t} su co` }}
            scroll={{ x: 1100 }}
          />
        </div>
      ),
    },
    {
      key: 'inspections',
      label: (
        <span><SafetyOutlined /> Kiem tra co so</span>
      ),
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Search
              placeholder="Tim kiem co so..."
              allowClear
              onSearch={v => setKeyword(v)}
              onChange={e => !e.target.value && setKeyword('')}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateInspection}>
              Them kiem tra
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Lam moi</Button>
          </div>
          <Table
            columns={inspectionColumns}
            dataSource={filteredInspections}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, showTotal: (t) => `Tong ${t} kiem tra` }}
            scroll={{ x: 950 }}
          />
        </div>
      ),
    },
    {
      key: 'statistics',
      label: (
        <span><BarChartOutlined /> Thong ke</span>
      ),
      children: (
        <div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="text-gray-500 text-sm mb-1">Tong su co</div><div className="text-2xl font-semibold"><AlertOutlined className="mr-1" />{stats?.totalIncidents ?? 0}</div>
              </div>
            </div>
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <Statistic title="Nguoi bi anh huong" value={stats?.totalAffected ?? 0} styles={{ content: { color: '#1890ff' } }} />
              </div>
            </div>
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <Statistic title="Diem tuan thu TB" value={stats?.avgComplianceScore ?? 0} suffix="/100" styles={{ content: { color: '#52c41a' } }} />
              </div>
            </div>
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <Statistic title="CS vi pham" value={stats?.facilitiesViolating ?? 0} styles={{ content: { color: '#ff4d4f' } }} />
              </div>
            </div>
          </div>
          <hr className="border-t border-gray-200 my-4" />
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Card title="Su co theo thang" size="small">
                {stats?.incidentsByMonth?.length ? (
                  stats.incidentsByMonth.map(item => (
                    <div key={item.month} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span>{item.month}</span>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500">Chua co du lieu</span>
                )}
              </div>
            </div>
            <div>
              <Card title="Tuan thu theo loai co so" size="small">
                {stats?.complianceByFacilityType?.length ? (
                  stats.complianceByFacilityType.map(item => (
                    <div key={item.type} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span>{item.type}</span>
                      <div className="flex items-center gap-2">
                        <span>{item.count} CS</span>
                        <Progress percent={Math.round(item.avgScore)} size="small" style={{ width: 100 }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500">Chua co du lieu</span>
                )}
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
        <h4 className="text-lg font-semibold mb-4">An toan ve sinh thuc pham</h4>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Tong su co</div><div className="text-2xl font-semibold" style={{ color: '#ff4d4f' }}><WarningOutlined className="mr-1" />{stats?.totalIncidents ?? 0}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Dang dieu tra</div><div className="text-2xl font-semibold" style={{ color: '#fa8c16' }}><SearchOutlined className="mr-1" />{stats?.activeInvestigations ?? 0}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Nguoi bi anh huong</div><div className="text-2xl font-semibold" style={{ color: '#1890ff' }}><AlertOutlined className="mr-1" />{stats?.totalAffected ?? 0}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Co so vi pham</div><div className="text-2xl font-semibold" style={{ color: '#722ed1' }}><SafetyOutlined className="mr-1" />{stats?.facilitiesViolating ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </div>

        {/* Incident Detail Modal */}
        <Modal
          title="Chi tiet su co ngo doc"
          open={detailModalOpen}
          onCancel={() => setDetailModalOpen(false)}
          footer={null}
          width={800}
          destroyOnHidden
        >
          {selectedIncident && (
            <div>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Ma su co">{selectedIncident.incidentCode}</Descriptions.Item>
                <Descriptions.Item label="Ngay xay ra">{selectedIncident.incidentDate ? dayjs(selectedIncident.incidentDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Dia diem" span={2}>{selectedIncident.location}</Descriptions.Item>
                <Descriptions.Item label="Loai co so">{selectedIncident.locationType}</Descriptions.Item>
                <Descriptions.Item label="Muc do">
                  {SEVERITY_CONFIG[selectedIncident.severity] && (
                    <Tag color={SEVERITY_CONFIG[selectedIncident.severity].color}>
                      {SEVERITY_CONFIG[selectedIncident.severity].label}
                    </Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="So nguoi anh huong">{selectedIncident.totalAffected}</Descriptions.Item>
                <Descriptions.Item label="Nhap vien">{selectedIncident.hospitalized}</Descriptions.Item>
                <Descriptions.Item label="Tu vong">{selectedIncident.deaths}</Descriptions.Item>
                <Descriptions.Item label="Trang thai">
                  {STATUS_CONFIG[selectedIncident.investigationStatus] && (
                    <Tag color={STATUS_CONFIG[selectedIncident.investigationStatus].color}>
                      {STATUS_CONFIG[selectedIncident.investigationStatus].label}
                    </Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Thuc pham nghi ngo" span={2}>{selectedIncident.suspectedFood || '-'}</Descriptions.Item>
                <Descriptions.Item label="Mo ta" span={2}>{selectedIncident.description}</Descriptions.Item>
                <Descriptions.Item label="Ket qua dieu tra" span={2}>{selectedIncident.investigationFindings || '-'}</Descriptions.Item>
              </Descriptions>
              <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Mau xet nghiem</div>
              <Table
                columns={sampleColumns}
                dataSource={samples}
                rowKey="id"
                size="small"
                pagination={false}
                locale={{ emptyText: 'Chua co mau xet nghiem' }}
              />
            </div>
          )}
        </Modal>

        {/* Create/Edit Incident Modal */}
        <Modal
          title={editingIncident ? 'Cap nhat su co' : 'Them su co moi'}
          open={incidentModalOpen}
          onOk={handleSaveIncident}
          onCancel={() => setIncidentModalOpen(false)}
          confirmLoading={submitting}
          width={700}
          destroyOnHidden
        >
          <Form form={incidentForm} layout="vertical">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="incidentDate" label="Ngay xay ra" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="locationType" label="Loai co so" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <Select placeholder="Chon loai">
                    <Select.Option value="Restaurant">Nha hang</Select.Option>
                    <Select.Option value="School">Truong hoc</Select.Option>
                    <Select.Option value="Factory">Nha may</Select.Option>
                    <Select.Option value="Hospital">Benh vien</Select.Option>
                    <Select.Option value="Market">Cho</Select.Option>
                    <Select.Option value="Other">Khac</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <Form.Item name="location" label="Dia diem" rules={[{ required: true, message: 'Bat buoc' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Mo ta su co" rules={[{ required: true, message: 'Bat buoc' }]}>
              <TextArea rows={3} />
            </Form.Item>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="totalAffected" label="So nguoi bi anh huong">
                  <Input type="number" min={0} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="hospitalized" label="Nhap vien">
                  <Input type="number" min={0} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="severity" label="Muc do" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <Select placeholder="Chon">
                    <Select.Option value={1}>Nhe</Select.Option>
                    <Select.Option value={2}>Trung binh</Select.Option>
                    <Select.Option value={3}>Nang</Select.Option>
                    <Select.Option value={4}>Nguy kich</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <Form.Item name="suspectedFood" label="Thuc pham nghi ngo">
              <Input />
            </Form.Item>
            <Form.Item name="notes" label="Ghi chu">
              <TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Create/Edit Inspection Modal */}
        <Modal
          title={editingInspection ? 'Cap nhat kiem tra' : 'Them kiem tra moi'}
          open={inspectionModalOpen}
          onOk={handleSaveInspection}
          onCancel={() => setInspectionModalOpen(false)}
          confirmLoading={submitting}
          width={700}
          destroyOnHidden
        >
          <Form form={inspectionForm} layout="vertical">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="inspectionDate" label="Ngay kiem tra" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="facilityType" label="Loai co so" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <Select placeholder="Chon loai">
                    <Select.Option value="Restaurant">Nha hang</Select.Option>
                    <Select.Option value="Canteen">Can tin</Select.Option>
                    <Select.Option value="FoodProcessing">Che bien TP</Select.Option>
                    <Select.Option value="Market">Cho</Select.Option>
                    <Select.Option value="Hospital">Benh vien</Select.Option>
                    <Select.Option value="School">Truong hoc</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <Form.Item name="facilityName" label="Ten co so" rules={[{ required: true, message: 'Bat buoc' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="facilityAddress" label="Dia chi">
              <Input />
            </Form.Item>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="hygieneScore" label="Diem ve sinh">
                  <Input type="number" min={0} max={100} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="foodStorageScore" label="Bao quan TP">
                  <Input type="number" min={0} max={100} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="staffTrainingScore" label="Dao tao NV">
                  <Input type="number" min={0} max={100} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="complianceLevel" label="Xep loai" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <Select placeholder="Chon">
                    <Select.Option value="A">Loai A</Select.Option>
                    <Select.Option value="B">Loai B</Select.Option>
                    <Select.Option value="C">Loai C</Select.Option>
                    <Select.Option value="D">Loai D</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <Form.Item name="notes" label="Ghi chu / Vi pham">
              <TextArea rows={3} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default FoodSafety;
