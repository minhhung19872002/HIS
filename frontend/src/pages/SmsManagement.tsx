import { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Input, Select, DatePicker, Row, Col, Tag, Tabs, Statistic,
  Form, message, Spin, Typography, Space as AntSpace, Progress, Tooltip, Divider,
} from 'antd';
import {
  MessageOutlined, SearchOutlined, ReloadOutlined, SendOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ExperimentOutlined,
  BarChartOutlined, UnorderedListOutlined, SettingOutlined,
  PhoneOutlined, ApiOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getSmsBalance, testSmsConnection, sendTestSms, getSmsLogs, getSmsStats,
} from '../api/sms';
import type {
  SmsBalanceDto, SmsLogDto, SmsLogSearchDto, SmsLogPagedResult, SmsStatsDto,
} from '../api/sms';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const MESSAGE_TYPES = [
  { value: 'OTP', label: 'Xác thực OTP', color: 'purple' },
  { value: 'Result', label: 'Kết quả CLS', color: 'blue' },
  { value: 'Booking', label: 'Xác nhận đặt lịch', color: 'green' },
  { value: 'Reminder', label: 'Nhắc lịch hẹn', color: 'orange' },
  { value: 'Critical', label: 'Giá trị nguy hiểm', color: 'red' },
  { value: 'Test', label: 'Thử nghiệm', color: 'default' },
  { value: 'Queue', label: 'Thông báo STT', color: 'cyan' },
  { value: 'General', label: 'Chung', color: 'default' },
];

const STATUS_MAP: Record<number, { text: string; color: string }> = {
  0: { text: 'Đã gửi', color: 'success' },
  1: { text: 'Thất bại', color: 'error' },
  2: { text: 'Dev Mode', color: 'warning' },
};

const getTypeColor = (type: string) =>
  MESSAGE_TYPES.find(t => t.value === type)?.color ?? 'default';
const getTypeLabel = (type: string) =>
  MESSAGE_TYPES.find(t => t.value === type)?.label ?? type;

const SmsManagement = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Dashboard state
  const [balance, setBalance] = useState<SmsBalanceDto | null>(null);
  const [stats, setStats] = useState<SmsStatsDto | null>(null);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);

  // Logs state
  const [logs, setLogs] = useState<SmsLogDto[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logPage, setLogPage] = useState(0);
  const [logSearch, setLogSearch] = useState<SmsLogSearchDto>({});

  // Test SMS state
  const [testForm] = Form.useForm();
  const [sendingTest, setSendingTest] = useState(false);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    try {
      const res = await getSmsBalance();
      setBalance(res.data);
    } catch {
      message.warning('Không thể tải thông tin SMS');
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await getSmsStats(
        dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD')
      );
      setStats(res.data);
    } catch {
      // Stats may fail if table is empty
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSmsLogs({ ...logSearch, pageIndex: logPage, pageSize: 20 });
      setLogs(res.data.items);
      setTotalLogs(res.data.totalCount);
    } catch {
      message.warning('Không thể tải nhật ký SMS');
    } finally {
      setLoading(false);
    }
  }, [logSearch, logPage]);

  useEffect(() => {
    fetchBalance();
    fetchStats();
  }, [fetchBalance, fetchStats]);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, fetchLogs]);

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const res = await testSmsConnection();
      setConnectionOk(res.data.success);
      message[res.data.success ? 'success' : 'warning'](
        res.data.success ? 'Kết nối SMS Gateway thành công!' : 'Không thể kết nối SMS Gateway'
      );
    } catch {
      setConnectionOk(false);
      message.warning('Lỗi kết nối SMS Gateway');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async (values: { phoneNumber: string; message?: string }) => {
    setSendingTest(true);
    try {
      const res = await sendTestSms(values.phoneNumber, values.message);
      if (res.data.success) {
        message.success(`Đã gửi SMS thử nghiệm đến ${values.phoneNumber}`);
        testForm.resetFields();
        fetchStats();
        if (activeTab === 'logs') fetchLogs();
      } else {
        message.warning('Gửi SMS thất bại');
      }
    } catch {
      message.warning('Lỗi gửi SMS');
    } finally {
      setSendingTest(false);
    }
  };

  const handleRefresh = () => {
    fetchBalance();
    fetchStats();
    if (activeTab === 'logs') fetchLogs();
  };

  // === Columns ===
  const logColumns: ColumnsType<SmsLogDto> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'SĐT',
      dataIndex: 'phoneNumber',
      width: 130,
    },
    {
      title: 'Loại',
      dataIndex: 'messageType',
      width: 140,
      render: (v: string) => <Tag color={getTypeColor(v)}>{getTypeLabel(v)}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 110,
      render: (v: number) => {
        const s = STATUS_MAP[v] || { text: 'Unknown', color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: 'Bệnh nhân',
      dataIndex: 'patientName',
      width: 150,
      render: (v: string) => v || '-',
    },
    {
      title: 'Nội dung',
      dataIndex: 'message',
      ellipsis: true,
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      width: 100,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Lỗi',
      dataIndex: 'errorMessage',
      width: 150,
      render: (v: string) => v ? <Text type="danger" style={{ fontSize: 12 }}>{v}</Text> : '-',
    },
  ];

  // === Dashboard Tab ===
  const renderDashboard = () => (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="SMS Provider"
              value={balance?.provider || 'Chưa cấu hình'}
              prefix={<ApiOutlined />}
              styles={{ content: { color: balance?.isEnabled ? '#3f8600' : '#999' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Số dư tài khoản"
              value={balance?.balance !== undefined && balance.balance >= 0 ? balance.balance : 'N/A'}
              suffix={balance?.currency || ''}
              prefix={<MessageOutlined />}
              styles={{ content: { color: balance?.balance !== undefined && balance.balance > 0 ? '#3f8600' : '#cf1322' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Trạng thái"
              value={!balance?.isEnabled ? 'Dev Mode' : connectionOk === true ? 'Hoạt động' : connectionOk === false ? 'Lỗi' : 'Chưa kiểm tra'}
              prefix={!balance?.isEnabled ? <ExperimentOutlined /> : connectionOk === true ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              styles={{ content: { color: !balance?.isEnabled ? '#d48806' : connectionOk ? '#3f8600' : '#cf1322' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tỷ lệ thành công (30 ngày)"
              value={stats?.successRate ?? 0}
              suffix="%"
              styles={{ content: { color: (stats?.successRate ?? 0) >= 90 ? '#3f8600' : '#cf1322' } }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Đã gửi" value={stats?.totalSent ?? 0} styles={{ content: { color: '#3f8600' } }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Thất bại" value={stats?.totalFailed ?? 0} styles={{ content: { color: '#cf1322' } }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Dev Mode" value={stats?.totalDevMode ?? 0} styles={{ content: { color: '#d48806' } }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Tổng (30 ngày)" value={(stats?.totalSent ?? 0) + (stats?.totalFailed ?? 0) + (stats?.totalDevMode ?? 0)} />
          </Card>
        </Col>
      </Row>

      {/* Stats by type */}
      {stats && stats.byType.length > 0 && (
        <Card title="Thống kê theo loại tin nhắn" style={{ marginTop: 16 }} size="small">
          {stats.byType.map(item => (
            <div key={item.messageType} style={{ marginBottom: 12 }}>
              <AntSpace orientation="horizontal" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Tag color={getTypeColor(item.messageType)}>{getTypeLabel(item.messageType)}</Tag>
                <Text type="secondary">{item.total} tin</Text>
              </AntSpace>
              <Progress
                percent={item.total > 0 ? Math.round((item.sent + item.devMode) / item.total * 100) : 0}
                success={{ percent: item.total > 0 ? Math.round(item.sent / item.total * 100) : 0 }}
                size="small"
                format={() => `${item.sent} gửi / ${item.failed} lỗi / ${item.devMode} dev`}
              />
            </div>
          ))}
        </Card>
      )}

      {/* Actions */}
      <Card title="Thao tác" style={{ marginTop: 16 }} size="small">
        <AntSpace orientation="horizontal">
          <Button icon={<ApiOutlined />} onClick={handleTestConnection} loading={loading}>
            Kiểm tra kết nối
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            Làm mới
          </Button>
        </AntSpace>
        {connectionOk !== null && (
          <div style={{ marginTop: 8 }}>
            {connectionOk ? (
              <Tag icon={<CheckCircleOutlined />} color="success">Kết nối thành công</Tag>
            ) : (
              <Tag icon={<CloseCircleOutlined />} color="error">Kết nối thất bại</Tag>
            )}
          </div>
        )}
      </Card>
    </div>
  );

  // === Logs Tab ===
  const renderLogs = () => (
    <div>
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8} md={6}>
          <Input
            placeholder="Tìm SĐT, bệnh nhân..."
            prefix={<SearchOutlined />}
            allowClear
            onChange={e => setLogSearch(s => ({ ...s, keyword: e.target.value || undefined }))}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Select
            placeholder="Loại tin"
            allowClear
            style={{ width: '100%' }}
            onChange={v => setLogSearch(s => ({ ...s, messageType: v }))}
            options={MESSAGE_TYPES.map(t => ({ value: t.value, label: t.label }))}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: '100%' }}
            onChange={v => setLogSearch(s => ({ ...s, status: v }))}
            options={[
              { value: 0, label: 'Đã gửi' },
              { value: 1, label: 'Thất bại' },
              { value: 2, label: 'Dev Mode' },
            ]}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <RangePicker
            style={{ width: '100%' }}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setLogSearch(s => ({
                  ...s,
                  fromDate: dates[0]!.format('YYYY-MM-DD'),
                  toDate: dates[1]!.format('YYYY-MM-DD'),
                }));
              } else {
                setLogSearch(s => ({ ...s, fromDate: undefined, toDate: undefined }));
              }
            }}
          />
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={fetchLogs}>Tải lại</Button>
        </Col>
      </Row>
      <Table
        dataSource={logs}
        columns={logColumns}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1200 }}
        pagination={{
          total: totalLogs,
          current: logPage + 1,
          pageSize: 20,
          showSizeChanger: false,
          showTotal: (total) => `Tổng ${total} bản ghi`,
          onChange: (page) => setLogPage(page - 1),
        }}
      />
    </div>
  );

  // === Test Tab ===
  const renderTest = () => (
    <Row gutter={16}>
      <Col xs={24} md={12}>
        <Card title="Gửi SMS thử nghiệm" size="small">
          <Form form={testForm} onFinish={handleSendTest} layout="vertical">
            <Form.Item
              name="phoneNumber"
              label="Số điện thoại"
              rules={[
                { required: true, message: 'Vui lòng nhập số điện thoại' },
                { pattern: /^(0|\+?84)\d{9,10}$/, message: 'Số điện thoại không hợp lệ' },
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="0912345678" />
            </Form.Item>
            <Form.Item name="message" label="Nội dung (tùy chọn)">
              <Input.TextArea rows={3} placeholder="Để trống sẽ gửi tin nhắn mặc định" maxLength={500} showCount />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={sendingTest}>
                Gửi SMS thử
              </Button>
            </Form.Item>
          </Form>
          {!balance?.isEnabled && (
            <Tag icon={<ExperimentOutlined />} color="warning" style={{ marginTop: 8 }}>
              Dev Mode: SMS sẽ được ghi log nhưng không gửi thật
            </Tag>
          )}
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card title="Cấu hình SMS Gateway" size="small">
          <div style={{ marginBottom: 12 }}>
            <Text strong>Provider: </Text>
            <Tag>{balance?.provider || 'Chưa cấu hình'}</Tag>
          </div>
          <div style={{ marginBottom: 12 }}>
            <Text strong>Trạng thái: </Text>
            {balance?.isEnabled ? (
              <Tag color="success">Đã kích hoạt</Tag>
            ) : (
              <Tag color="warning">Dev Mode (SMS không gửi thật)</Tag>
            )}
          </div>
          <div style={{ marginBottom: 12 }}>
            <Text strong>Số dư: </Text>
            <Text>{balance?.balance !== undefined && balance.balance >= 0 ? `${balance.balance.toLocaleString()} ${balance.currency}` : 'N/A'}</Text>
          </div>
          <Divider />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Cấu hình SMS trong <code>appsettings.json</code>:
          </Text>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, marginTop: 8 }}>
{`"Sms": {
  "Provider": "esms",
  "ApiKey": "your_api_key",
  "ApiSecret": "your_secret",
  "BrandName": "HIS",
  "Enabled": true
}`}
          </pre>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Hỗ trợ: eSMS.vn, SpeedSMS.vn
          </Text>
        </Card>
      </Col>
    </Row>
  );

  const tabItems = [
    {
      key: 'dashboard',
      label: <span><BarChartOutlined /> Tổng quan</span>,
      children: renderDashboard(),
    },
    {
      key: 'logs',
      label: <span><UnorderedListOutlined /> Nhật ký SMS</span>,
      children: renderLogs(),
    },
    {
      key: 'test',
      label: <span><SettingOutlined /> Thử nghiệm</span>,
      children: renderTest(),
    },
  ];

  return (
    <Spin spinning={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <MessageOutlined /> Quản lý SMS Gateway
        </Title>
        <Tooltip title="Làm mới">
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
        </Tooltip>
      </div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </Spin>
  );
};

export default SmsManagement;
