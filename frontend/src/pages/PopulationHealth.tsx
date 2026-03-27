import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Input, Tag, Row, Col, Select, DatePicker,
  Typography, message, Tabs, Statistic, Spin, Modal, Form,
} from 'antd';
import {
  TeamOutlined, SearchOutlined, ReloadOutlined, PlusOutlined,
  EditOutlined, CalendarOutlined, UserOutlined,
  HeartOutlined, HomeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as popApi from '../api/populationHealth';
import type { PopulationRecord, PopulationStats, ElderlyStats } from '../api/populationHealth';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const RECORD_TYPE_LABELS: Record<string, string> = {
  birth: 'Khai sinh', family_planning: 'KHHGĐ', elderly_care: 'Chăm sóc NCT',
  prenatal: 'Thai sản', child_health: 'Sức khỏe trẻ em', other: 'Khác',
};
const RECORD_TYPE_COLORS: Record<string, string> = {
  birth: 'blue', family_planning: 'green', elderly_care: 'purple',
  prenatal: 'pink', child_health: 'cyan', other: 'default',
};
const STATUS_LABELS: Record<number, string> = { 0: 'Đang quản lý', 1: 'Đã đóng', 2: 'Chuyển tuyến' };
const STATUS_COLORS: Record<number, string> = { 0: 'processing', 1: 'default', 2: 'gold' };

const PopulationHealth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<PopulationRecord[]>([]);
  const [stats, setStats] = useState<PopulationStats>({ totalRecords: 0, familyPlanningActive: 0, elderlyCareCount: 0, birthReportsThisMonth: 0 });
  const [elderlyStats, setElderlyStats] = useState<ElderlyStats>({ total: 0, chronicDisease: 0, livingAlone: 0, needingCare: 0 });
  const [activeTab, setActiveTab] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PopulationRecord | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        keyword: keyword || undefined,
        recordType: activeTab !== 'all' ? activeTab : typeFilter,
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const results = await Promise.allSettled([
        popApi.searchRecords(params),
        popApi.getStats(),
        popApi.getElderlyStats(),
      ]);
      if (results[0].status === 'fulfilled') setRecords(results[0].value);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
      if (results[2].status === 'fulfilled') setElderlyStats(results[2].value);
    } catch {
      message.warning('Không thể tải dữ liệu dân số');
    } finally {
      setLoading(false);
    }
  }, [keyword, typeFilter, dateRange, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setSaving(true);
      await popApi.createRecord(values);
      message.success('Đã tạo hồ sơ');
      setIsCreateModalOpen(false);
      createForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo hồ sơ');
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!selectedRecord) return;
    try {
      const values = await editForm.validateFields();
      setSaving(true);
      await popApi.updateRecord(selectedRecord.id, values);
      message.success('Đã cập nhật hồ sơ');
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể cập nhật');
    } finally { setSaving(false); }
  };

  const columns: ColumnsType<PopulationRecord> = [
    { title: 'Mã HS', dataIndex: 'recordCode', width: 110 },
    { title: 'Họ tên', dataIndex: 'fullName', width: 160 },
    {
      title: 'Ngày sinh', dataIndex: 'dateOfBirth', width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    { title: 'Giới', dataIndex: 'gender', width: 60, render: (g: number) => g === 1 ? 'Nam' : g === 2 ? 'Nữ' : '-' },
    {
      title: 'Loại HS', dataIndex: 'recordType', width: 130,
      render: (t: string) => <Tag color={RECORD_TYPE_COLORS[t]}>{RECORD_TYPE_LABELS[t] || t}</Tag>,
    },
    { title: 'Địa chỉ', dataIndex: 'address', width: 200, ellipsis: true },
    { title: 'Đơn vị QL', dataIndex: 'managingUnit', width: 150, ellipsis: true },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 120,
      render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 100,
      render: (_: unknown, record: PopulationRecord) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
          setSelectedRecord(record);
          editForm.setFieldsValue(record);
          setIsEditModalOpen(true);
        }}>Sửa</Button>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col><Title level={4} style={{ margin: 0 }}><TeamOutlined style={{ marginRight: 8 }} />Dân số - KHHGĐ</Title></Col>
            <Col>
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>Tạo hồ sơ</Button>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={8} md={6}>
              <Search placeholder="Tìm kiếm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onSearch={fetchData} allowClear prefix={<SearchOutlined />} />
            </Col>
            {activeTab === 'all' && (
              <Col xs={12} sm={8} md={4}>
                <Select placeholder="Loại hồ sơ" allowClear style={{ width: '100%' }} value={typeFilter} onChange={setTypeFilter}
                  options={Object.entries(RECORD_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
              </Col>
            )}
            <Col xs={24} sm={8} md={6}>
              <RangePicker style={{ width: '100%' }} value={dateRange} onChange={(v) => setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} format="DD/MM/YYYY" />
            </Col>
          </Row>
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}><Card><Statistic title="Tổng hồ sơ" value={stats.totalRecords} prefix={<TeamOutlined />} styles={{ content: { color: '#1890ff' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="KHHGĐ đang dùng" value={stats.familyPlanningActive} prefix={<HeartOutlined />} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Chăm sóc NCT" value={stats.elderlyCareCount} prefix={<HomeOutlined />} styles={{ content: { color: '#722ed1' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Khai sinh tháng" value={stats.birthReportsThisMonth} prefix={<CalendarOutlined />} styles={{ content: { color: '#fa8c16' } }} /></Card></Col>
        </Row>

        {elderlyStats.total > 0 && (
          <Card style={{ marginBottom: 16 }} title="Thống kê người cao tuổi" size="small">
            <Row gutter={16}>
              <Col span={6}><Text>Tổng: <strong>{elderlyStats.total}</strong></Text></Col>
              <Col span={6}><Text>Bệnh mãn tính: <strong>{elderlyStats.chronicDisease}</strong></Text></Col>
              <Col span={6}><Text>Sống một mình: <strong>{elderlyStats.livingAlone}</strong></Text></Col>
              <Col span={6}><Text>Cần chăm sóc: <strong>{elderlyStats.needingCare}</strong></Text></Col>
            </Row>
          </Card>
        )}

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
            { key: 'all', label: `Tất cả (${records.length})` },
            ...Object.entries(RECORD_TYPE_LABELS).map(([k, l]) => ({
              key: k,
              label: l,
            })),
          ]} />
          <Table dataSource={records} columns={columns} rowKey="id" size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
            scroll={{ x: 1100 }} />
        </Card>

        <Modal title="Tạo hồ sơ dân số" open={isCreateModalOpen} onCancel={() => setIsCreateModalOpen(false)}
          onOk={handleCreate} okText="Tạo" cancelText="Hủy" confirmLoading={saving} width={600} destroyOnHidden>
          <Form form={createForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập' }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="recordType" label="Loại hồ sơ" rules={[{ required: true, message: 'Chọn' }]}>
                <Select options={Object.entries(RECORD_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
              <Col span={12}><Form.Item name="gender" label="Giới tính">
                <Select options={[{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }]} /></Form.Item></Col>
              <Col span={12}><Form.Item name="managingUnit" label="Đơn vị quản lý"><Input /></Form.Item></Col>
              <Col span={24}><Form.Item name="address" label="Địa chỉ"><Input /></Form.Item></Col>
              <Col span={24}><Form.Item name="notes" label="Ghi chú"><TextArea rows={2} /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>

        <Modal title="Cập nhật hồ sơ" open={isEditModalOpen} onCancel={() => setIsEditModalOpen(false)}
          onOk={handleEdit} okText="Cập nhật" cancelText="Hủy" confirmLoading={saving} width={600} destroyOnHidden>
          <Form form={editForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập' }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="recordType" label="Loại hồ sơ">
                <Select options={Object.entries(RECORD_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
              <Col span={12}><Form.Item name="status" label="Trạng thái">
                <Select options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: Number(v), label: l }))} /></Form.Item></Col>
              <Col span={12}><Form.Item name="managingUnit" label="Đơn vị quản lý"><Input /></Form.Item></Col>
              <Col span={24}><Form.Item name="address" label="Địa chỉ"><Input /></Form.Item></Col>
              <Col span={24}><Form.Item name="notes" label="Ghi chú"><TextArea rows={2} /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default PopulationHealth;
