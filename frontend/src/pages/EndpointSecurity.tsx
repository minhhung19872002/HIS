import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tabs, Tag, Button, Space, Input, Select, Modal, Form,
  Statistic, Row, Col, Badge, Tooltip, message, Spin, Progress, Descriptions,
} from 'antd';
import {
  DesktopOutlined, SafetyCertificateOutlined, BugOutlined, AppstoreOutlined,
  PlusOutlined, ReloadOutlined, ExclamationCircleOutlined, CheckCircleOutlined,
  WarningOutlined, CloseCircleOutlined, SearchOutlined, EyeOutlined,
} from '@ant-design/icons';
import type {
  EndpointDeviceDto, SecurityIncidentDto, InstalledSoftwareDto,
  EndpointSecurityDashboardDto, RegisterDeviceDto, CreateIncidentDto,
} from '../api/endpointSecurity';
import {
  getDevices, getIncidents, getSoftwareInventory, getSecurityDashboard,
  registerDevice, createIncident, resolveIncident,
  flagUnauthorized,
} from '../api/endpointSecurity';
import { motion } from 'framer-motion';

const severityColors: Record<number, string> = { 1: 'red', 2: 'orange', 3: 'blue', 4: 'green' };
const severityLabels: Record<number, string> = { 1: 'Nghiêm trọng', 2: 'Cao', 3: 'Trung bình', 4: 'Thấp' };
const statusColors: Record<number, string> = { 0: 'default', 1: 'processing', 2: 'warning', 3: 'success', 4: 'default' };
const statusLabels: Record<number, string> = { 0: 'Mở', 1: 'Đang điều tra', 2: 'Đã ngăn chặn', 3: 'Đã xử lý', 4: 'Đã đóng' };
const deviceStatusIcons: Record<number, React.ReactNode> = {
  0: <CloseCircleOutlined style={{ color: '#999' }} />,
  1: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  2: <WarningOutlined style={{ color: '#faad14' }} />,
  3: <ExclamationCircleOutlined style={{ color: '#f5222d' }} />,
};

type IncidentFormValues = CreateIncidentDto;
type DeviceFormValues = RegisterDeviceDto;
type ResolveFormValues = {
  resolution: string;
  rootCause?: string;
};

const EndpointSecurity: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<EndpointDeviceDto[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncidentDto[]>([]);
  const [software, setSoftware] = useState<InstalledSoftwareDto[]>([]);
  const [dashboard, setDashboard] = useState<EndpointSecurityDashboardDto | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deviceModalVisible, setDeviceModalVisible] = useState(false);
  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncidentDto | null>(null);
  const [deviceForm] = Form.useForm();
  const [incidentForm] = Form.useForm();
  const [resolveForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [devs, incs, sw, dash] = await Promise.allSettled([
        getDevices(), getIncidents(), getSoftwareInventory(), getSecurityDashboard(),
      ]);
      if (devs.status === 'fulfilled') setDevices(devs.value);
      if (incs.status === 'fulfilled') setIncidents(incs.value);
      if (sw.status === 'fulfilled') setSoftware(sw.value);
      if (dash.status === 'fulfilled') setDashboard(dash.value);
    } catch {
      message.warning('Không thể tải dữ liệu an toàn thông tin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRegisterDevice = async (values: DeviceFormValues) => {
    try {
      await registerDevice(values);
      message.success('Đã đăng ký thiết bị');
      setDeviceModalVisible(false);
      deviceForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể đăng ký thiết bị');
    }
  };

  const handleCreateIncident = async (values: IncidentFormValues) => {
    try {
      await createIncident(values);
      message.success('Đã tạo sự cố');
      setIncidentModalVisible(false);
      incidentForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể tạo sự cố');
    }
  };

  const handleResolveIncident = async (values: ResolveFormValues) => {
    if (!selectedIncident) return;
    try {
      await resolveIncident(selectedIncident.id, values.resolution, values.rootCause);
      message.success('Đã xử lý sự cố');
      setResolveModalVisible(false);
      resolveForm.resetFields();
      setSelectedIncident(null);
      fetchData();
    } catch {
      message.warning('Không thể xử lý sự cố');
    }
  };

  const deviceColumns = [
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 80, render: (s: number) => deviceStatusIcons[s] || deviceStatusIcons[0] },
    { title: 'Tên máy', dataIndex: 'hostname', key: 'hostname', ellipsis: true },
    { title: 'IP', dataIndex: 'ipAddress', key: 'ip', width: 130 },
    { title: 'Hệ điều hành', key: 'os', width: 150, render: (_: unknown, r: EndpointDeviceDto) => `${r.operatingSystem || ''} ${r.osVersion || ''}`.trim() || '-' },
    { title: 'Antivirus', key: 'av', width: 150, render: (_: unknown, r: EndpointDeviceDto) => (
      <Space orientation="horizontal" size={4}>
        <span>{r.antivirusName || '-'}</span>
        {r.antivirusStatus && <Tag color={r.antivirusStatus === 'Active' ? 'green' : 'red'}>{r.antivirusStatus}</Tag>}
      </Space>
    )},
    { title: 'Khoa/Phòng', dataIndex: 'departmentName', key: 'dept', ellipsis: true },
    { title: 'Người dùng', dataIndex: 'assignedUser', key: 'user', ellipsis: true },
    { title: 'Tuân thủ', dataIndex: 'isCompliant', key: 'compliant', width: 80, render: (v: boolean) => v ? <Tag color="green">OK</Tag> : <Tag color="red">Vi phạm</Tag> },
    { title: 'Lần cuối', dataIndex: 'lastSeenAt', key: 'lastSeen', width: 130, render: (v: string) => v ? new Date(v).toLocaleString('vi-VN') : '-' },
  ];

  const incidentColumns = [
    { title: 'Mã', dataIndex: 'incidentCode', key: 'code', width: 160 },
    { title: 'Tiêu đề', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: 'Mức độ', dataIndex: 'severity', key: 'severity', width: 100, render: (v: number) => <Tag color={severityColors[v]}>{severityLabels[v]}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120, render: (v: number) => <Badge status={statusColors[v] as 'default' | 'processing' | 'success' | 'warning' | 'error'} text={statusLabels[v]} /> },
    { title: 'Phân loại', dataIndex: 'category', key: 'category', width: 120 },
    { title: 'Thiết bị', dataIndex: 'deviceHostname', key: 'device', width: 130, ellipsis: true },
    { title: 'Báo cáo bởi', dataIndex: 'reportedByName', key: 'reporter', width: 120 },
    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'created', width: 130, render: (v: string) => new Date(v).toLocaleString('vi-VN') },
    {
      title: '', key: 'actions', width: 100,
      render: (_: unknown, r: SecurityIncidentDto) => (
        <Space orientation="horizontal" size={4}>
          <Tooltip title="Chi tiết"><Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedIncident(r); }} /></Tooltip>
          {r.status < 3 && <Tooltip title="Xử lý"><Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => { setSelectedIncident(r); setResolveModalVisible(true); }} /></Tooltip>}
        </Space>
      ),
    },
  ];

  const softwareColumns = [
    { title: 'Phần mềm', dataIndex: 'softwareName', key: 'name', ellipsis: true },
    { title: 'Phiên bản', dataIndex: 'version', key: 'version', width: 120 },
    { title: 'Nhà phát triển', dataIndex: 'publisher', key: 'publisher', width: 150, ellipsis: true },
    { title: 'Phân loại', dataIndex: 'category', key: 'category', width: 120 },
    { title: 'Trạng thái', dataIndex: 'isAuthorized', key: 'authorized', width: 120, render: (v: boolean) => v ? <Tag color="green">Được phép</Tag> : <Tag color="red">Không phép</Tag> },
    {
      title: '', key: 'actions', width: 80,
      render: (_: unknown, r: InstalledSoftwareDto) => r.isAuthorized ? (
        <Button type="link" size="small" danger onClick={async () => { await flagUnauthorized(r.id); fetchData(); }}>Cấm</Button>
      ) : null,
    },
  ];

  const filteredDevices = devices.filter(d => !searchKeyword || d.hostname.toLowerCase().includes(searchKeyword.toLowerCase()) || (d.ipAddress || '').includes(searchKeyword) || (d.assignedUser || '').toLowerCase().includes(searchKeyword.toLowerCase()));

  return (
    <Spin spinning={loading}>
      <div style={{ padding: 0, position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, background: 'rgba(168,85,247,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>
        {/* Stats Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6} md={6} lg={3}>
            <Card size="small"><Statistic title="Thiết bị" value={dashboard?.totalDevices ?? 0} prefix={<DesktopOutlined />} /></Card>
          </Col>
          <Col xs={12} sm={6} md={6} lg={3}>
            <Card size="small"><Statistic title="Online" value={dashboard?.onlineDevices ?? 0} styles={{ content: { color: '#52c41a' } }} /></Card>
          </Col>
          <Col xs={12} sm={6} md={6} lg={3}>
            <Card size="small"><Statistic title="Sự cố mở" value={dashboard?.openIncidents ?? 0} styles={{ content: { color: dashboard?.openIncidents ? '#faad14' : undefined } }} /></Card>
          </Col>
          <Col xs={12} sm={6} md={6} lg={3}>
            <Card size="small"><Statistic title="Tuân thủ" value={`${dashboard?.compliancePercent ?? 100}%`} styles={{ content: { color: (dashboard?.compliancePercent ?? 100) >= 90 ? '#52c41a' : '#f5222d' } }} /></Card>
          </Col>
        </Row>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card
          title={<Space orientation="horizontal"><SafetyCertificateOutlined /> An toàn thông tin</Space>}
          extra={<Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>}
        >
          <Tabs defaultActiveKey="devices" items={[
            {
              key: 'devices', label: <span><DesktopOutlined /> Thiết bị ({devices.length})</span>,
              children: (
                <>
                  <Space orientation="horizontal" style={{ marginBottom: 12 }}>
                    <Input.Search placeholder="Tìm thiết bị..." allowClear onSearch={v => setSearchKeyword(v)} style={{ width: 250 }} prefix={<SearchOutlined />} />
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setDeviceModalVisible(true)}>Đăng ký</Button>
                  </Space>
                  <Table dataSource={filteredDevices} columns={deviceColumns} rowKey="id" size="small" scroll={{ x: 1000 }} pagination={{ pageSize: 15, showSizeChanger: true }} />
                </>
              ),
            },
            {
              key: 'software', label: <span><AppstoreOutlined /> Phần mềm ({software.length})</span>,
              children: (
                <Table dataSource={software} columns={softwareColumns} rowKey="id" size="small" scroll={{ x: 700 }} pagination={{ pageSize: 15, showSizeChanger: true }} />
              ),
            },
            {
              key: 'incidents', label: <span><BugOutlined /> Sự cố ({incidents.length})</span>,
              children: (
                <>
                  <Space orientation="horizontal" style={{ marginBottom: 12 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIncidentModalVisible(true)}>Tạo sự cố</Button>
                  </Space>
                  <Table dataSource={incidents} columns={incidentColumns} rowKey="id" size="small" scroll={{ x: 1100 }} pagination={{ pageSize: 15, showSizeChanger: true }} />
                </>
              ),
            },
            {
              key: 'dashboard', label: <span><SafetyCertificateOutlined /> Tổng quan</span>,
              children: dashboard ? (
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card title="Trạng thái thiết bị" size="small">
                      {dashboard.devicesByStatus.map(d => (
                        <div key={d.status} style={{ marginBottom: 8 }}>
                          <span style={{ display: 'inline-block', width: 80 }}>{d.status}</span>
                          <Progress percent={dashboard.totalDevices > 0 ? Math.round(d.count / dashboard.totalDevices * 100) : 0} size="small" status={d.status === 'Critical' ? 'exception' : d.status === 'Warning' ? 'active' : 'normal'} />
                        </div>
                      ))}
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="Sự cố theo phân loại" size="small">
                      {dashboard.incidentsByCategory.length > 0 ? dashboard.incidentsByCategory.map(c => (
                        <div key={c.category} style={{ marginBottom: 8 }}>
                          <span style={{ display: 'inline-block', width: 120 }}>{c.category}</span>
                          <Badge count={c.count} style={{ backgroundColor: '#1890ff' }} />
                        </div>
                      )) : <span style={{ color: '#999' }}>Không có sự cố</span>}
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="Chi tiết" size="small">
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Tổng thiết bị">{dashboard.totalDevices}</Descriptions.Item>
                        <Descriptions.Item label="Tuân thủ">{dashboard.compliantDevices}/{dashboard.totalDevices}</Descriptions.Item>
                        <Descriptions.Item label="Phần mềm">{dashboard.totalSoftware}</Descriptions.Item>
                        <Descriptions.Item label="PM không phép">{dashboard.unauthorizedSoftware}</Descriptions.Item>
                        <Descriptions.Item label="Sự cố nghiêm trọng">{dashboard.criticalIncidents}</Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Col>
                </Row>
              ) : <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Đang tải...</div>,
            },
          ]} />
        </Card>
        </motion.div>

        {/* Register Device Modal */}
        <Modal title="Đăng ký thiết bị" open={deviceModalVisible} onCancel={() => setDeviceModalVisible(false)} onOk={() => deviceForm.submit()} okText="Đăng ký" cancelText="Hủy" width={600}>
          <Form form={deviceForm} layout="vertical" onFinish={handleRegisterDevice}>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="hostname" label="Tên máy" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="ipAddress" label="Địa chỉ IP"><Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="macAddress" label="MAC Address"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="operatingSystem" label="Hệ điều hành"><Select options={[{ value: 'Windows', label: 'Windows' }, { value: 'Linux', label: 'Linux' }, { value: 'macOS', label: 'macOS' }]} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="antivirusName" label="Antivirus"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="departmentName" label="Khoa/Phòng"><Input /></Form.Item></Col>
            </Row>
            <Form.Item name="assignedUser" label="Người sử dụng"><Input /></Form.Item>
          </Form>
        </Modal>

        {/* Create Incident Modal */}
        <Modal title="Tạo sự cố an ninh" open={incidentModalVisible} onCancel={() => setIncidentModalVisible(false)} onOk={() => incidentForm.submit()} okText="Tạo" cancelText="Hủy" width={600}>
          <Form form={incidentForm} layout="vertical" onFinish={handleCreateIncident}>
            <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="severity" label="Mức độ" initialValue={3}>
                  <Select options={[{ value: 1, label: 'Nghiêm trọng' }, { value: 2, label: 'Cao' }, { value: 3, label: 'Trung bình' }, { value: 4, label: 'Thấp' }]} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="category" label="Phân loại">
                  <Select options={[{ value: 'Malware' }, { value: 'Phishing' }, { value: 'Unauthorized' }, { value: 'DataBreach' }, { value: 'DDoS' }, { value: 'Other' }]} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="affectedSystem" label="Hệ thống bị ảnh hưởng"><Input /></Form.Item>
            <Form.Item name="reportedByName" label="Người báo cáo"><Input /></Form.Item>
          </Form>
        </Modal>

        {/* Resolve Incident Modal */}
        <Modal title="Xử lý sự cố" open={resolveModalVisible} onCancel={() => { setResolveModalVisible(false); setSelectedIncident(null); }} onOk={() => resolveForm.submit()} okText="Xử lý xong" cancelText="Hủy" width={500}>
          {selectedIncident && (
            <div style={{ marginBottom: 16 }}>
              <Tag color={severityColors[selectedIncident.severity]}>{severityLabels[selectedIncident.severity]}</Tag>
              <strong>{selectedIncident.incidentCode}</strong>: {selectedIncident.title}
            </div>
          )}
          <Form form={resolveForm} layout="vertical" onFinish={handleResolveIncident}>
            <Form.Item name="resolution" label="Cách xử lý" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
            <Form.Item name="rootCause" label="Nguyên nhân gốc"><Input.TextArea rows={2} /></Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default EndpointSecurity;
