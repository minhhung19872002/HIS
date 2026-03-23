import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Input, Tag, Row, Col, Select, DatePicker,
  Typography, message, Tabs, Statistic, Spin, Modal, Form, Badge,
} from 'antd';
import {
  SafetyCertificateOutlined, SearchOutlined, ReloadOutlined, PlusOutlined,
  EditOutlined, WarningOutlined, CheckCircleOutlined,
  ClockCircleOutlined, StopOutlined, PrinterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as plApi from '../api/practiceLicense';
import type { PracticeLicense as PracticeLicenseType, PracticeLicenseStats } from '../api/practiceLicense';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const LICENSE_TYPE_LABELS: Record<string, string> = {
  doctor: 'Bác sĩ', pharmacist: 'Dược sĩ', nurse: 'Điều dưỡng', midwife: 'Hộ sinh',
  technician: 'Kỹ thuật viên', dentist: 'Nha sĩ', traditional_medicine: 'YHCT',
};
const LICENSE_TYPE_COLORS: Record<string, string> = {
  doctor: 'blue', pharmacist: 'green', nurse: 'cyan', midwife: 'pink',
  technician: 'purple', dentist: 'orange', traditional_medicine: 'gold',
};
const STATUS_LABELS: Record<number, string> = { 0: 'Hoạt động', 1: 'Sắp hết hạn', 2: 'Hết hạn', 3: 'Thu hồi', 4: 'Đình chỉ' };
const STATUS_COLORS: Record<number, string> = { 0: 'success', 1: 'warning', 2: 'error', 3: 'default', 4: 'default' };

const PracticeLicense: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [licenses, setLicenses] = useState<PracticeLicenseType[]>([]);
  const [stats, setStats] = useState<PracticeLicenseStats>({ totalLicenses: 0, activeLicenses: 0, expiringIn30Days: 0, expiredLicenses: 0 });
  const [activeTab, setActiveTab] = useState('active');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<PracticeLicenseType | null>(null);
  const [createForm] = Form.useForm();
  const [renewForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, number | undefined> = {
        active: 0, expiring: 1, expired: 2, all: undefined,
      };
      const params = {
        keyword: keyword || undefined,
        licenseType: typeFilter || undefined,
        status: statusMap[activeTab],
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const results = await Promise.allSettled([
        plApi.searchLicenses(params),
        plApi.getStats(),
      ]);
      if (results[0].status === 'fulfilled') setLicenses(results[0].value);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
    } catch {
      message.warning('Không thể tải dữ liệu chứng chỉ hành nghề');
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, typeFilter, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setSaving(true);
      if (values.issueDate) values.issueDate = values.issueDate.format('YYYY-MM-DD');
      if (values.expiryDate) values.expiryDate = values.expiryDate.format('YYYY-MM-DD');
      await plApi.createLicense(values);
      message.success('Đã tạo chứng chỉ');
      setIsCreateModalOpen(false);
      createForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo chứng chỉ');
    } finally { setSaving(false); }
  };

  const handleRenew = async () => {
    if (!selectedLicense) return;
    try {
      const values = await renewForm.validateFields();
      setSaving(true);
      await plApi.renewLicense(selectedLicense.id, {
        newExpiryDate: values.newExpiryDate.format('YYYY-MM-DD'),
        renewalNotes: values.renewalNotes,
      });
      message.success('Đã gia hạn chứng chỉ');
      setIsRenewModalOpen(false);
      renewForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể gia hạn');
    } finally { setSaving(false); }
  };

  const columns: ColumnsType<PracticeLicenseType> = [
    { title: 'Mã CC', dataIndex: 'licenseCode', width: 100 },
    { title: 'Họ tên', dataIndex: 'staffName', width: 160 },
    { title: 'Mã NV', dataIndex: 'staffCode', width: 90 },
    {
      title: 'Loại', dataIndex: 'licenseType', width: 120,
      render: (t: string) => <Tag color={LICENSE_TYPE_COLORS[t]}>{LICENSE_TYPE_LABELS[t] || t}</Tag>,
    },
    { title: 'Số CCHN', dataIndex: 'licenseNumber', width: 130 },
    { title: 'Chuyên khoa', dataIndex: 'specialty', width: 140, ellipsis: true },
    {
      title: 'Ngày cấp', dataIndex: 'issueDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Ngày hết hạn', dataIndex: 'expiryDate', width: 120,
      render: (d: string) => {
        if (!d) return '-';
        const daysLeft = dayjs(d).diff(dayjs(), 'day');
        const color = daysLeft <= 0 ? '#ff4d4f' : daysLeft <= 30 ? '#faad14' : undefined;
        return (
          <span style={{ color }}>
            {dayjs(d).format('DD/MM/YYYY')}
            {daysLeft <= 30 && daysLeft > 0 && <Badge count={`${daysLeft}d`} style={{ marginLeft: 4, backgroundColor: '#faad14' }} />}
            {daysLeft <= 0 && <Badge count="Hết hạn" style={{ marginLeft: 4, backgroundColor: '#ff4d4f' }} />}
          </span>
        );
      },
    },
    { title: 'Nơi cấp', dataIndex: 'issuingAuthority', width: 150, ellipsis: true },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 120,
      render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 140,
      render: (_: unknown, record: PracticeLicenseType) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
            setSelectedLicense(record);
            renewForm.resetFields();
            setIsRenewModalOpen(true);
          }}>Gia hạn</Button>
        </Space>
      ),
    },
  ];

  const filteredLicenses = licenses.filter((l) => {
    if (activeTab === 'active') return l.status === 0;
    if (activeTab === 'expiring') return l.status === 1;
    if (activeTab === 'expired') return l.status >= 2;
    return true;
  });

  return (
    <Spin spinning={loading}>
      <div>
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col><Title level={4} style={{ margin: 0 }}><SafetyCertificateOutlined style={{ marginRight: 8 }} />Quản lý hành nghề</Title></Col>
            <Col>
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>Tạo chứng chỉ</Button>
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
            <Col xs={12} sm={8} md={4}>
              <Select placeholder="Loại CCHN" allowClear style={{ width: '100%' }} value={typeFilter} onChange={setTypeFilter}
                options={Object.entries(LICENSE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <RangePicker style={{ width: '100%' }} value={dateRange} onChange={(v) => setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} format="DD/MM/YYYY" />
            </Col>
          </Row>
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}><Card><Statistic title="Tổng CCHN" value={stats.totalLicenses} prefix={<SafetyCertificateOutlined />} styles={{ content: { color: '#1890ff' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Đang hoạt động" value={stats.activeLicenses} prefix={<CheckCircleOutlined />} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Sắp hết hạn (30d)" value={stats.expiringIn30Days} prefix={<WarningOutlined />} styles={{ content: { color: '#faad14' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Đã hết hạn" value={stats.expiredLicenses} prefix={<StopOutlined />} styles={{ content: { color: '#ff4d4f' } }} /></Card></Col>
        </Row>

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
            { key: 'active', label: <span><CheckCircleOutlined /> Hoạt động ({licenses.filter(l => l.status === 0).length})</span> },
            { key: 'expiring', label: <span><WarningOutlined /> Sắp hết hạn ({licenses.filter(l => l.status === 1).length})</span> },
            { key: 'expired', label: <span><StopOutlined /> Hết hạn ({licenses.filter(l => l.status >= 2).length})</span> },
            { key: 'all', label: `Tất cả (${licenses.length})` },
          ]} />
          <Table dataSource={filteredLicenses} columns={columns} rowKey="id" size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
            scroll={{ x: 1500 }} />
        </Card>

        <Modal title="Tạo chứng chỉ hành nghề" open={isCreateModalOpen} onCancel={() => setIsCreateModalOpen(false)}
          onOk={handleCreate} okText="Tạo" cancelText="Hủy" confirmLoading={saving} width={600} destroyOnHidden>
          <Form form={createForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="staffName" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập' }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="staffCode" label="Mã NV"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="licenseType" label="Loại CCHN" rules={[{ required: true, message: 'Chọn' }]}>
                <Select options={Object.entries(LICENSE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
              <Col span={12}><Form.Item name="licenseNumber" label="Số CCHN" rules={[{ required: true, message: 'Nhập' }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="issueDate" label="Ngày cấp"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
              <Col span={12}><Form.Item name="expiryDate" label="Ngày hết hạn"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
              <Col span={12}><Form.Item name="issuingAuthority" label="Nơi cấp"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="specialty" label="Chuyên khoa"><Input /></Form.Item></Col>
              <Col span={24}><Form.Item name="practiceScope" label="Phạm vi hành nghề"><TextArea rows={2} /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>

        <Modal title="Gia hạn chứng chỉ" open={isRenewModalOpen} onCancel={() => setIsRenewModalOpen(false)}
          onOk={handleRenew} okText="Gia hạn" cancelText="Hủy" confirmLoading={saving} width={400} destroyOnHidden>
          <Form form={renewForm} layout="vertical">
            <Form.Item name="newExpiryDate" label="Ngày hết hạn mới" rules={[{ required: true, message: 'Chọn ngày' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="renewalNotes" label="Ghi chú gia hạn">
              <TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default PracticeLicense;
