import { useState, useEffect, useCallback } from 'react';
import {
  Card, Tabs, Table, Button, Space, Tag, Modal, Form, Input, Select,
  DatePicker, Statistic, Row, Col, message, Spin, InputNumber, Switch,
  Slider, Descriptions, Badge, Typography, Popconfirm, Alert
} from 'antd';
import {
  SafetyCertificateOutlined, FileProtectOutlined, BarChartOutlined,
  SettingOutlined, KeyOutlined, PlusOutlined, ReloadOutlined,
  DeleteOutlined, EditOutlined, CloudServerOutlined, QrcodeOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ExportOutlined,
  ScanOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as centralSigningApi from '../api/centralSigning';

const { Text } = Typography;

interface ManagedCertificate {
  id: string; serialNumber: string; subjectName: string; issuerName: string;
  caProvider: string; validFrom: string; validTo: string; isActive: boolean;
  ownerUserId?: string; ownerFullName?: string; cccd?: string;
  signatureImagePath?: string; storageType: string; createdAt: string;
}

interface SigningTransaction {
  id: string; userId: string; userFullName: string; action: string; dataType: string;
  success: boolean; errorMessage?: string; certificateSerial?: string;
  caProvider?: string; hashAlgorithm?: string; dataSizeBytes: number;
  durationMs: number; ipAddress?: string; timestamp: string;
}

interface SigningStats {
  totalTransactions: number; totalSuccess: number; totalFailed: number;
  activeCertificates: number; expiringSoon: number; expiredCertificates: number;
  activeUsers: number; todayTransactions: number;
  dailyTrend: { date: string; count: number }[];
  byType: { dataType: string; count: number }[];
  topUsers: { userFullName: string; count: number }[];
}

interface AppearanceConfig {
  position: string; page: number; x: number; y: number; width: number; height: number;
  fontFamily: string; fontSize: number; fontColor: string;
  showSignerName: boolean; showDate: boolean; showCertSerial: boolean; showCaLogo: boolean;
}

const CentralSigning: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('certs');
  const [certificates, setCertificates] = useState<ManagedCertificate[]>([]);
  const [transactions, setTransactions] = useState<SigningTransaction[]>([]);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [stats, setStats] = useState<SigningStats | null>(null);
  const [appearance, setAppearance] = useState<AppearanceConfig | null>(null);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<ManagedCertificate | null>(null);
  const [certForm] = Form.useForm();
  const [appearanceForm] = Form.useForm();
  const [txPage, setTxPage] = useState(0);
  const [txFilters, setTxFilters] = useState<{ action?: string; success?: boolean }>({});

  const fetchCertificates = useCallback(async () => {
    try {
      const res = await centralSigningApi.getCertificates();
      setCertificates(res.data || []);
    } catch { message.warning('Không thể tải danh sách chứng thư số'); }
  }, []);

  const fetchTransactions = useCallback(async (page = 0) => {
    try {
      const res = await centralSigningApi.getTransactions({
        pageIndex: page, pageSize: 20, ...txFilters
      });
      setTransactions(res.data?.items || []);
      setTransactionTotal(res.data?.total || 0);
    } catch { message.warning('Không thể tải lịch sử giao dịch'); }
  }, [txFilters]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await centralSigningApi.getStatistics();
      setStats(res.data);
    } catch { message.warning('Không thể tải thống kê'); }
  }, []);

  const fetchAppearance = useCallback(async () => {
    try {
      const res = await centralSigningApi.getAppearanceConfig();
      setAppearance(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      Promise.allSettled([fetchCertificates(), fetchTransactions(), fetchStats(), fetchAppearance()])
        .finally(() => setLoading(false));
    });
  }, [fetchCertificates, fetchTransactions, fetchStats, fetchAppearance]);

  useEffect(() => {
    if (activeTab === 'appearance' && appearance) {
      appearanceForm.setFieldsValue(appearance);
    }
  }, [activeTab, appearance, appearanceForm]);

  const handleSaveCert = async (values: Record<string, unknown>) => {
    try {
      await centralSigningApi.saveCertificate({
        id: editingCert?.id,
        serialNumber: values.serialNumber as string,
        subjectName: values.subjectName as string,
        issuerName: values.issuerName as string,
        caProvider: values.caProvider as string,
        validFrom: dayjs(values.validFrom as string).toISOString(),
        validTo: dayjs(values.validTo as string).toISOString(),
        isActive: values.isActive as boolean ?? true,
        ownerUserId: values.ownerUserId as string,
        cccd: values.cccd as string,
        storageType: values.storageType as string || 'Token',
      });
      message.success(editingCert ? 'Cập nhật thành công' : 'Thêm mới thành công');
      setCertModalOpen(false);
      certForm.resetFields();
      setEditingCert(null);
      fetchCertificates();
    } catch { message.warning('Không thể lưu chứng thư số'); }
  };

  const handleDeleteCert = async (id: string) => {
    try {
      await centralSigningApi.deleteCertificate(id);
      message.success('Đã xóa chứng thư số');
      fetchCertificates();
    } catch { message.warning('Không thể xóa'); }
  };

  const handleSaveAppearance = async (values: Record<string, unknown>) => {
    try {
      await centralSigningApi.saveAppearanceConfig(values as unknown as AppearanceConfig);
      message.success('Đã lưu cấu hình hiển thị');
      fetchAppearance();
    } catch { message.warning('Không thể lưu cấu hình'); }
  };

  const handleExportSerials = async () => {
    try {
      const res = await centralSigningApi.exportSerials();
      const text = (res.data || []).join('\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'certificate_serials.txt'; a.click();
      URL.revokeObjectURL(url);
      message.success('Đã xuất danh sách Serial');
    } catch { message.warning('Không thể xuất'); }
  };

  // Certificate columns
  const certColumns: ColumnsType<ManagedCertificate> = [
    { title: 'Serial', dataIndex: 'serialNumber', width: 150, ellipsis: true },
    { title: 'Chủ thể', dataIndex: 'subjectName', ellipsis: true },
    { title: 'Nhà cung cấp CA', dataIndex: 'caProvider', width: 120,
      render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Chủ sở hữu', dataIndex: 'ownerFullName', width: 150,
      render: (v: string) => v || <Text type="secondary">Chưa gán</Text> },
    { title: 'CCCD', dataIndex: 'cccd', width: 130 },
    { title: 'Loại lưu trữ', dataIndex: 'storageType', width: 100,
      render: (v: string) => <Tag color={v === 'HSM' ? 'gold' : v === 'Server' ? 'green' : 'default'}>{v}</Tag> },
    { title: 'Hết hạn', dataIndex: 'validTo', width: 110,
      render: (v: string) => {
        const d = dayjs(v);
        const isExpired = d.isBefore(dayjs());
        const isSoon = d.isBefore(dayjs().add(30, 'day'));
        return <Text type={isExpired ? 'danger' : isSoon ? 'warning' : undefined}>{d.format('DD/MM/YYYY')}</Text>;
      }
    },
    { title: 'Trạng thái', dataIndex: 'isActive', width: 90,
      render: (v: boolean) => v ? <Badge status="success" text="Active" /> : <Badge status="default" text="Inactive" /> },
    { title: '', width: 80, render: (_: unknown, r: ManagedCertificate) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => {
          setEditingCert(r);
          certForm.setFieldsValue({ ...r, validFrom: dayjs(r.validFrom), validTo: dayjs(r.validTo) });
          setCertModalOpen(true);
        }} />
        <Popconfirm title="Xóa chứng thư số?" onConfirm={() => handleDeleteCert(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )}
  ];

  // Transaction columns
  const txColumns: ColumnsType<SigningTransaction> = [
    { title: 'Thời gian', dataIndex: 'timestamp', width: 150,
      render: (v: string) => dayjs(v).format('DD/MM/YY HH:mm:ss') },
    { title: 'Người dùng', dataIndex: 'userFullName', width: 150 },
    { title: 'Hành động', dataIndex: 'action', width: 130,
      render: (v: string) => {
        const colors: Record<string, string> = {
          SignHash: 'purple', SignRaw: 'blue', SignPdfInvisible: 'cyan',
          SignPdfVisible: 'geekblue', SignXml: 'orange', VerifyRaw: 'green',
          VerifyHash: 'green', VerifyPdf: 'green'
        };
        return <Tag color={colors[v] || 'default'}>{v}</Tag>;
      }
    },
    { title: 'Loại', dataIndex: 'dataType', width: 70,
      render: (v: string) => <Tag>{v.toUpperCase()}</Tag> },
    { title: 'Kết quả', dataIndex: 'success', width: 80,
      render: (v: boolean) => v
        ? <Tag icon={<CheckCircleOutlined />} color="success">OK</Tag>
        : <Tag icon={<CloseCircleOutlined />} color="error">Lỗi</Tag>
    },
    { title: 'Cert Serial', dataIndex: 'certificateSerial', width: 140, ellipsis: true },
    { title: 'Kích thước', dataIndex: 'dataSizeBytes', width: 90,
      render: (v: number) => v > 1024 ? `${(v / 1024).toFixed(1)} KB` : `${v} B` },
    { title: 'Thời gian xử lý', dataIndex: 'durationMs', width: 110,
      render: (v: number) => `${v} ms` },
    { title: 'Lỗi', dataIndex: 'errorMessage', ellipsis: true },
  ];

  const tabItems = [
    {
      key: 'certs',
      label: <span><SafetyCertificateOutlined /> Chứng thư số</span>,
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Button icon={<PlusOutlined />} type="primary" onClick={() => {
                setEditingCert(null); certForm.resetFields(); setCertModalOpen(true);
              }}>Thêm chứng thư</Button>
              <Button icon={<ExportOutlined />} onClick={handleExportSerials}>Xuất Serial</Button>
            </Space>
            <Button icon={<ReloadOutlined />} onClick={fetchCertificates}>Làm mới</Button>
          </div>
          <Table columns={certColumns} dataSource={certificates} rowKey="id" size="small"
            pagination={{ pageSize: 15, responsive: true }} scroll={{ x: 900 }} />
        </div>
      )
    },
    {
      key: 'transactions',
      label: <span><FileProtectOutlined /> Giao dịch</span>,
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Select placeholder="Hành động" allowClear style={{ width: 150 }}
                onChange={(v) => { setTxFilters(f => ({ ...f, action: v })); setTxPage(0); }}
                options={[
                  { value: 'SignHash', label: 'Ký Hash' },
                  { value: 'SignRaw', label: 'Ký Raw' },
                  { value: 'SignPdfInvisible', label: 'Ký PDF ẩn' },
                  { value: 'SignPdfVisible', label: 'Ký PDF hiện' },
                  { value: 'SignXml', label: 'Ký XML' },
                  { value: 'VerifyPdf', label: 'Xác thực PDF' },
                ]} />
              <Select placeholder="Kết quả" allowClear style={{ width: 120 }}
                onChange={(v) => { setTxFilters(f => ({ ...f, success: v })); setTxPage(0); }}
                options={[
                  { value: true, label: 'Thành công' },
                  { value: false, label: 'Thất bại' },
                ]} />
              <Button icon={<ReloadOutlined />} onClick={() => fetchTransactions(txPage)}>Làm mới</Button>
            </Space>
          </div>
          <Table columns={txColumns} dataSource={transactions} rowKey="id" size="small"
            pagination={{
              current: txPage + 1, pageSize: 20, total: transactionTotal, responsive: true,
              onChange: (p) => { setTxPage(p - 1); fetchTransactions(p - 1); }
            }} scroll={{ x: 900 }} />
        </div>
      )
    },
    {
      key: 'stats',
      label: <span><BarChartOutlined /> Thống kê</span>,
      children: stats ? (
        <div>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}><Card><Statistic title="Tổng giao dịch" value={stats.totalTransactions} /></Card></Col>
            <Col xs={12} sm={6}><Card><Statistic title="Thành công" value={stats.totalSuccess} valueStyle={{ color: '#3f8600' }} /></Card></Col>
            <Col xs={12} sm={6}><Card><Statistic title="Thất bại" value={stats.totalFailed} valueStyle={{ color: '#cf1322' }} /></Card></Col>
            <Col xs={12} sm={6}><Card><Statistic title="Hôm nay" value={stats.todayTransactions} /></Card></Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={12} sm={6}><Card><Statistic title="CTS hoạt động" value={stats.activeCertificates} valueStyle={{ color: '#1890ff' }} /></Card></Col>
            <Col xs={12} sm={6}><Card><Statistic title="Sắp hết hạn" value={stats.expiringSoon} valueStyle={{ color: '#faad14' }} /></Card></Col>
            <Col xs={12} sm={6}><Card><Statistic title="Đã hết hạn" value={stats.expiredCertificates} valueStyle={{ color: '#cf1322' }} /></Card></Col>
            <Col xs={12} sm={6}><Card><Statistic title="Người dùng (30d)" value={stats.activeUsers} /></Card></Col>
          </Row>
          {stats.byType.length > 0 && (
            <Card title="Phân loại theo định dạng" style={{ marginTop: 16 }} size="small">
              <Space wrap>
                {stats.byType.map(t => (
                  <Tag key={t.dataType} color="blue">{t.dataType.toUpperCase()}: {t.count}</Tag>
                ))}
              </Space>
            </Card>
          )}
          {stats.topUsers.length > 0 && (
            <Card title="Top người dùng (30 ngày)" style={{ marginTop: 16 }} size="small">
              <Table size="small" pagination={false} dataSource={stats.topUsers} rowKey="userFullName"
                columns={[
                  { title: 'Người dùng', dataIndex: 'userFullName' },
                  { title: 'Số lượt ký', dataIndex: 'count', width: 100 },
                ]} />
            </Card>
          )}
        </div>
      ) : <Spin />
    },
    {
      key: 'appearance',
      label: <span><SettingOutlined /> Cấu hình hiển thị</span>,
      children: (
        <Card title="Cấu hình vị trí và hiển thị chữ ký trên PDF" size="small">
          <Form form={appearanceForm} layout="vertical" onFinish={handleSaveAppearance}
            initialValues={appearance || {
              position: 'bottom-right', page: 0, x: 36, y: 36,
              width: 200, height: 80, fontFamily: 'Times New Roman',
              fontSize: 10, fontColor: '#000080',
              showSignerName: true, showDate: true, showCertSerial: true, showCaLogo: false
            }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="position" label="Vị trí">
                  <Select options={[
                    { value: 'bottom-right', label: 'Dưới phải' },
                    { value: 'bottom-left', label: 'Dưới trái' },
                    { value: 'top-right', label: 'Trên phải' },
                    { value: 'top-left', label: 'Trên trái' },
                    { value: 'custom', label: 'Tùy chỉnh (X, Y)' },
                  ]} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="page" label="Trang hiển thị (0 = trang cuối)">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="fontFamily" label="Font chữ">
                  <Select options={[
                    { value: 'Times New Roman', label: 'Times New Roman' },
                    { value: 'Arial', label: 'Arial' },
                    { value: 'Courier New', label: 'Courier New' },
                  ]} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}><Form.Item name="x" label="Tọa độ X (pt)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="y" label="Tọa độ Y (pt)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="width" label="Chiều rộng (pt)"><InputNumber min={50} max={500} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="height" label="Chiều cao (pt)"><InputNumber min={30} max={200} style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}><Form.Item name="fontSize" label="Cỡ chữ"><Slider min={6} max={20} /></Form.Item></Col>
              <Col span={6}><Form.Item name="fontColor" label="Màu chữ"><Input placeholder="#000080" /></Form.Item></Col>
              <Col span={3}><Form.Item name="showSignerName" label="Hiện tên" valuePropName="checked"><Switch /></Form.Item></Col>
              <Col span={3}><Form.Item name="showDate" label="Hiện ngày" valuePropName="checked"><Switch /></Form.Item></Col>
              <Col span={3}><Form.Item name="showCertSerial" label="Hiện Serial" valuePropName="checked"><Switch /></Form.Item></Col>
              <Col span={3}><Form.Item name="showCaLogo" label="Logo CA" valuePropName="checked"><Switch /></Form.Item></Col>
            </Row>
            <Button type="primary" htmlType="submit">Lưu cấu hình</Button>
          </Form>
        </Card>
      )
    },
    {
      key: 'hsm',
      label: <span><CloudServerOutlined /> HSM</span>,
      children: (
        <div>
          <Alert message="HSM chưa được kết nối" description="Thiết bị HSM cần được cài đặt và cấu hình tại server. Liên hệ quản trị hệ thống." type="info" showIcon style={{ marginBottom: 16 }} />
          <Card title="Thông tin HSM" size="small">
            <Descriptions column={2}>
              <Descriptions.Item label="Trạng thái"><Badge status="default" text="Chưa kết nối" /></Descriptions.Item>
              <Descriptions.Item label="Model">N/A</Descriptions.Item>
              <Descriptions.Item label="Firmware">N/A</Descriptions.Item>
              <Descriptions.Item label="Slots">0/0</Descriptions.Item>
            </Descriptions>
          </Card>
          <Card title="Tạo CSR" size="small" style={{ marginTop: 16 }}>
            <Form layout="inline">
              <Form.Item label="CN"><Input placeholder="Bệnh viện..." /></Form.Item>
              <Form.Item label="O"><Input placeholder="Tổ chức" /></Form.Item>
              <Form.Item label="OU"><Input placeholder="Phòng ban" /></Form.Item>
              <Form.Item><Button type="primary">Tạo CSR</Button></Form.Item>
            </Form>
          </Card>
        </div>
      )
    },
    {
      key: 'totp',
      label: <span><QrcodeOutlined /> OTP Ký số</span>,
      children: (
        <div>
          <Alert message="Xác thực OTP cho ký số" description="Kích hoạt xác thực 2 yếu tố bằng ứng dụng OTP trên điện thoại (Google Authenticator, Microsoft Authenticator). OTP hoạt động cả khi không có Internet." type="info" showIcon style={{ marginBottom: 16 }} />
          <Card title="Thiết lập TOTP" size="small">
            <Space orientation="vertical">
              <Button type="primary" icon={<KeyOutlined />} onClick={async () => {
                try {
                  const res = await centralSigningApi.setupTotp();
                  if (res.data?.enabled) {
                    message.info('TOTP đã được kích hoạt');
                  } else if (res.data?.qrCodeUri) {
                    Modal.info({
                      title: 'Quét mã QR bằng ứng dụng Authenticator',
                      content: (
                        <div>
                          <p>URI: <Text copyable>{res.data.qrCodeUri}</Text></p>
                          <p>Mã thủ công: <Text copyable code>{res.data.manualEntryKey}</Text></p>
                          <p style={{ marginTop: 16 }}>Sau khi quét, nhập mã OTP 6 số để xác nhận.</p>
                        </div>
                      ),
                      width: 500,
                    });
                  }
                } catch { message.warning('Không thể thiết lập TOTP'); }
              }}>Thiết lập TOTP</Button>
              <Button danger onClick={async () => {
                try {
                  await centralSigningApi.disableTotp();
                  message.success('Đã tắt TOTP');
                } catch { message.warning('Không thể tắt TOTP'); }
              }}>Tắt TOTP</Button>
            </Space>
          </Card>
        </div>
      )
    },
    {
      key: 'biometric',
      label: <span><ScanOutlined /> Sinh trắc học</span>,
      children: (
        <div>
          <Alert title="Xác thực sinh trắc học (WebAuthn/FIDO2)" description="Đăng ký vân tay hoặc khuôn mặt để xác thực khi ký số. Hỗ trợ Windows Hello, Touch ID, Face ID và USB security key." type="info" showIcon style={{ marginBottom: 16 }} />
          <Card title="Xác thực sinh trắc học cho ký số" size="small">
            <p style={{ color: '#666', marginBottom: 16 }}>
              Sử dụng WebAuthn/FIDO2 để xác thực bằng vân tay hoặc khuôn mặt khi ký tài liệu.
              Hỗ trợ Windows Hello, Touch ID, Face ID trên thiết bị di động.
            </p>
            <Space orientation="vertical" style={{ width: '100%' }}>
              <Button type="primary" icon={<ScanOutlined />} size="large"
                style={{ width: '100%', maxWidth: 400 }}
                onClick={async () => {
                  if (!window.PublicKeyCredential) {
                    message.warning('Trình duyệt không hỗ trợ WebAuthn');
                    return;
                  }
                  try {
                    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                    if (!available) {
                      message.warning('Thiết bị không hỗ trợ xác thực sinh trắc học');
                      return;
                    }
                    message.info('Vui lòng xác thực bằng vân tay/khuôn mặt trên thiết bị...');
                    // WebAuthn registration flow would be triggered here via API
                  } catch { message.warning('Lỗi kiểm tra WebAuthn'); }
                }}>
                Đăng ký sinh trắc học
              </Button>
              <Descriptions column={1} size="small" style={{ maxWidth: 400 }}>
                <Descriptions.Item label="WebAuthn">
                  {typeof window !== 'undefined' && window.PublicKeyCredential
                    ? <Badge status="success" text="Hỗ trợ" />
                    : <Badge status="error" text="Không hỗ trợ" />}
                </Descriptions.Item>
                <Descriptions.Item label="Thiết bị">
                  <Text type="secondary">Kiểm tra khi nhấn nút đăng ký</Text>
                </Descriptions.Item>
              </Descriptions>
            </Space>
          </Card>
        </div>
      )
    },
  ];

  return (
    <Spin spinning={loading}>
      <Card
        title={<span><SafetyCertificateOutlined /> Quản trị Ký số Tập trung</span>}
        extra={<Button icon={<ReloadOutlined />} onClick={() => {
          fetchCertificates(); fetchTransactions(txPage); fetchStats();
        }}>Làm mới</Button>}
      >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      <Modal title={editingCert ? 'Sửa chứng thư số' : 'Thêm chứng thư số'}
        open={certModalOpen} onCancel={() => { setCertModalOpen(false); setEditingCert(null); }}
        onOk={() => certForm.submit()} width="90vw" style={{ maxWidth: 600 }} destroyOnHidden>
        <Form form={certForm} layout="vertical" onFinish={handleSaveCert}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="serialNumber" label="Serial Number" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="caProvider" label="Nhà cung cấp CA" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'VNPT-CA', label: 'VNPT CA' },
                  { value: 'Viettel-CA', label: 'Viettel CA' },
                  { value: 'BKAV-CA', label: 'BKAV CA' },
                  { value: 'FPT-CA', label: 'FPT CA' },
                  { value: 'NewCA', label: 'NewCA (MISA)' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="subjectName" label="Chủ thể (Subject)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="issuerName" label="Đơn vị cấp (Issuer)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="validFrom" label="Hiệu lực từ" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="validTo" label="Hết hạn" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="storageType" label="Loại lưu trữ">
                <Select options={[
                  { value: 'Token', label: 'USB Token' },
                  { value: 'HSM', label: 'HSM' },
                  { value: 'Server', label: 'Server' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="cccd" label="CCCD chủ sở hữu">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue={true}>
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Spin>
  );
};

export default CentralSigning;
