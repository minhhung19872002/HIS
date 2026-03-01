import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, Tag, Tabs, message, Spin,
  Statistic, Row, Col, Badge, Tooltip, Alert, Progress, Descriptions, Result
} from 'antd';
import {
  SafetyCertificateOutlined, UsbOutlined, KeyOutlined, ReloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined, LockOutlined, UnlockOutlined,
  FileProtectOutlined, HistoryOutlined, WarningOutlined, DisconnectOutlined,
  LinkOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as dsApi from '../api/digitalSignature';
import type {
  TokenInfoDto, DocumentSignatureDto, SessionStatusResponse,
  BatchSignResponse
} from '../api/digitalSignature';
import { apiClient } from '../api/client';

interface CertificateInfo {
  thumbprint: string;
  subject: string;
  subjectName: string;
  issuer: string;
  issuerName: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  isValid: boolean;
  hasPrivateKey: boolean;
  keyUsage: string;
  signatureAlgorithm: string;
  providerName: string;
}

const DigitalSignature: React.FC = () => {
  const [activeTab, setActiveTab] = useState('status');
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<TokenInfoDto[]>([]);
  const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
  const [sessionStatus, setSessionStatus] = useState<SessionStatusResponse | null>(null);
  const [signatures, setSignatures] = useState<DocumentSignatureDto[]>([]);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchSignResponse | null>(null);
  const [loginForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tokensRes, certsRes, statusRes] = await Promise.allSettled([
        dsApi.getTokens(),
        apiClient.get<CertificateInfo[]>('/RISComplete/usb-token/certificates'),
        dsApi.getSessionStatus(),
      ]);
      if (tokensRes.status === 'fulfilled') setTokens(Array.isArray(tokensRes.value?.data) ? tokensRes.value.data : []);
      if (certsRes.status === 'fulfilled') setCertificates(Array.isArray(certsRes.value?.data) ? certsRes.value.data : []);
      if (statusRes.status === 'fulfilled') setSessionStatus(statusRes.value?.data || null);
    } catch {
      message.warning('Không thể tải thông tin chữ ký số');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenSession = async () => {
    try {
      const values = await loginForm.validateFields();
      setLoading(true);
      const res = await dsApi.openSession({ pin: values.pin });
      if (res.data?.success) {
        message.success('Mở phiên ký số thành công');
        setLoginModalOpen(false);
        loginForm.resetFields();
        fetchData();
      } else {
        message.error(res.data?.message || 'Không thể mở phiên ký số');
      }
    } catch {
      message.warning('Vui lòng nhập mã PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async () => {
    try {
      await dsApi.closeSession();
      message.success('Đã đóng phiên ký số');
      setSessionStatus(null);
      fetchData();
    } catch {
      message.warning('Không thể đóng phiên');
    }
  };

  const handleRegisterToken = async (serial: string) => {
    try {
      await dsApi.registerToken(serial);
      message.success('Đăng ký token thành công');
      fetchData();
    } catch {
      message.warning('Không thể đăng ký token');
    }
  };

  // Signing status
  const isSessionActive = sessionStatus?.active === true;
  const tokenCount = tokens.length;
  const certCount = certificates.length;
  const validCerts = certificates.filter(c => c.isValid);

  const tokenColumns = [
    { title: 'Serial', dataIndex: 'tokenSerial', key: 'serial', width: 180 },
    { title: 'Tên', dataIndex: 'tokenLabel', key: 'label' },
    { title: 'Nhà cung cấp CA', dataIndex: 'caProvider', key: 'ca',
      render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Người dùng', dataIndex: 'mappedUserName', key: 'user',
      render: (v: string) => v || <Tag color="default">Chưa đăng ký</Tag> },
    { title: 'Sử dụng cuối', dataIndex: 'lastUsedAt', key: 'last',
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-' },
    { title: 'Trạng thái', dataIndex: 'isActive', key: 'status',
      render: (v: boolean) => v ? <Badge status="success" text="Hoạt động" /> : <Badge status="default" text="Không hoạt động" /> },
    { title: 'Thao tác', key: 'action', width: 120,
      render: (_: unknown, record: TokenInfoDto) => (
        <Button size="small" type="link" onClick={() => handleRegisterToken(record.tokenSerial)}
          icon={<LinkOutlined />}>Đăng ký</Button>
      )
    },
  ];

  const certColumns = [
    { title: 'Chủ thể', dataIndex: 'subjectName', key: 'subject',
      render: (v: string, r: CertificateInfo) => (
        <Tooltip title={r.subject}><span style={{ fontWeight: 500 }}>{v}</span></Tooltip>
      )
    },
    { title: 'Nhà phát hành', dataIndex: 'issuerName', key: 'issuer' },
    { title: 'Số serial', dataIndex: 'serialNumber', key: 'serial', width: 160,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</span> },
    { title: 'Hiệu lực từ', dataIndex: 'validFrom', key: 'from',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Hết hạn', dataIndex: 'validTo', key: 'to',
      render: (v: string) => {
        const d = dayjs(v);
        const expired = d.isBefore(dayjs());
        const soon = d.diff(dayjs(), 'day') < 30;
        return <Tag color={expired ? 'red' : soon ? 'orange' : 'green'}>{d.format('DD/MM/YYYY')}</Tag>;
      }
    },
    { title: 'Hợp lệ', dataIndex: 'isValid', key: 'valid',
      render: (v: boolean) => v
        ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        : <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
    },
    { title: 'Private Key', dataIndex: 'hasPrivateKey', key: 'pk',
      render: (v: boolean) => v ? <KeyOutlined style={{ color: '#1890ff' }} /> : '-'
    },
    { title: 'Thuật toán', dataIndex: 'signatureAlgorithm', key: 'algo', width: 100 },
  ];

  const signatureColumns = [
    { title: 'Tài liệu', dataIndex: 'documentCode', key: 'doc' },
    { title: 'Loại', dataIndex: 'documentType', key: 'type',
      render: (v: string) => {
        const colors: Record<string, string> = { EMR: 'blue', Prescription: 'green', LabResult: 'orange', Radiology: 'purple', Discharge: 'cyan' };
        return <Tag color={colors[v] || 'default'}>{v}</Tag>;
      }
    },
    { title: 'Người ký', dataIndex: 'signerName', key: 'signer' },
    { title: 'Thời gian ký', dataIndex: 'signedAt', key: 'at' },
    { title: 'CA', dataIndex: 'caProvider', key: 'ca', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Serial chứng thư', dataIndex: 'certificateSerial', key: 'serial',
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v?.substring(0, 20)}...</span> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status',
      render: (v: number) => v === 0
        ? <Tag color="green" icon={<CheckCircleOutlined />}>Hợp lệ</Tag>
        : <Tag color="red" icon={<CloseCircleOutlined />}>Đã thu hồi</Tag>
    },
  ];

  const tabItems = [
    {
      key: 'status',
      label: <span><SafetyCertificateOutlined /> Trạng thái</span>,
      children: (
        <div>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Statistic title="USB Token" value={tokenCount} prefix={<UsbOutlined />}
                styles={{ content: { color: tokenCount > 0 ? '#3f8600' : '#cf1322' } }} />
            </Col>
            <Col span={6}>
              <Statistic title="Chứng thư số" value={certCount} prefix={<SafetyCertificateOutlined />} />
            </Col>
            <Col span={6}>
              <Statistic title="Chứng thư hợp lệ" value={validCerts.length} prefix={<CheckCircleOutlined />}
                styles={{ content: { color: validCerts.length > 0 ? '#3f8600' : '#cf1322' } }} />
            </Col>
            <Col span={6}>
              <Statistic title="Phiên ký số" value={isSessionActive ? 'Đang mở' : 'Đã đóng'}
                prefix={isSessionActive ? <LockOutlined /> : <UnlockOutlined />}
                styles={{ content: { color: isSessionActive ? '#3f8600' : '#8c8c8c' } }} />
            </Col>
          </Row>

          {isSessionActive && sessionStatus && (
            <Alert type="success" showIcon
              title="Phiên ký số đang hoạt động"
              description={
                <Descriptions size="small" column={2} style={{ marginTop: 8 }}>
                  <Descriptions.Item label="Token">{sessionStatus.tokenSerial}</Descriptions.Item>
                  <Descriptions.Item label="CA">{sessionStatus.caProvider}</Descriptions.Item>
                  <Descriptions.Item label="Chứng thư">{sessionStatus.certificateSubject}</Descriptions.Item>
                  <Descriptions.Item label="Hết phiên">{sessionStatus.expiresAt ? dayjs(sessionStatus.expiresAt).format('HH:mm:ss DD/MM/YYYY') : '-'}</Descriptions.Item>
                  {sessionStatus.expiryWarningDays != null && (
                    <Descriptions.Item label="Cảnh báo">
                      <Tag color="orange">Chứng thư hết hạn trong {sessionStatus.expiryWarningDays} ngày</Tag>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              }
              action={<Button danger onClick={handleCloseSession} icon={<DisconnectOutlined />}>Đóng phiên</Button>}
              style={{ marginBottom: 16 }}
            />
          )}

          {!isSessionActive && tokenCount > 0 && (
            <Alert type="info" showIcon
              title="Chưa mở phiên ký số"
              description="Cắm USB Token và nhập PIN để bắt đầu ký số tài liệu."
              action={<Button type="primary" onClick={() => setLoginModalOpen(true)} icon={<KeyOutlined />}>Mở phiên ký</Button>}
              style={{ marginBottom: 16 }}
            />
          )}

          {tokenCount === 0 && (
            <Alert type="warning" showIcon
              title="Không tìm thấy USB Token"
              description="Vui lòng kiểm tra đã cắm USB Token vào máy tính và cài đặt driver."
              style={{ marginBottom: 16 }}
            />
          )}

          {batchResult && (
            <Card title="Kết quả ký hàng loạt" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}><Statistic title="Tổng" value={batchResult.total} /></Col>
                <Col span={8}><Statistic title="Thành công" value={batchResult.succeeded} styles={{ content: { color: '#3f8600' } }} /></Col>
                <Col span={8}><Statistic title="Thất bại" value={batchResult.failed} styles={{ content: { color: batchResult.failed > 0 ? '#cf1322' : '#3f8600' } }} /></Col>
              </Row>
              {batchResult.total > 0 && (
                <Progress percent={Math.round(batchResult.succeeded / batchResult.total * 100)}
                  status={batchResult.failed > 0 ? 'exception' : 'success'} style={{ marginTop: 12 }} />
              )}
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'tokens',
      label: <span><UsbOutlined /> USB Token ({tokenCount})</span>,
      children: (
        <Table dataSource={tokens} columns={tokenColumns} rowKey="tokenSerial"
          pagination={false} size="small"
          locale={{ emptyText: 'Không tìm thấy USB Token. Vui lòng cắm USB Token.' }} />
      ),
    },
    {
      key: 'certificates',
      label: <span><SafetyCertificateOutlined /> Chứng thư số ({certCount})</span>,
      children: (
        <Table dataSource={certificates} columns={certColumns} rowKey="thumbprint"
          pagination={false} size="small"
          expandable={{
            expandedRowRender: (record: CertificateInfo) => (
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="Thumbprint">
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{record.thumbprint}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Subject">{record.subject}</Descriptions.Item>
                <Descriptions.Item label="Issuer">{record.issuer}</Descriptions.Item>
                <Descriptions.Item label="Provider">{record.providerName}</Descriptions.Item>
                <Descriptions.Item label="Key Usage">{record.keyUsage}</Descriptions.Item>
                <Descriptions.Item label="Algorithm">{record.signatureAlgorithm}</Descriptions.Item>
              </Descriptions>
            ),
          }}
          locale={{ emptyText: 'Không tìm thấy chứng thư số trên USB Token.' }} />
      ),
    },
    {
      key: 'history',
      label: <span><HistoryOutlined /> Lịch sử ký</span>,
      children: (
        <Table dataSource={signatures} columns={signatureColumns} rowKey="id"
          pagination={{ pageSize: 20 }} size="small"
          locale={{ emptyText: 'Chưa có lịch sử ký số.' }} />
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <Card
        title={<span><SafetyCertificateOutlined /> Chữ ký số (Digital Signature)</span>}
        extra={
          <Space>
            {isSessionActive ? (
              <Button danger onClick={handleCloseSession} icon={<DisconnectOutlined />}>Đóng phiên</Button>
            ) : (
              <Button type="primary" onClick={() => setLoginModalOpen(true)} icon={<KeyOutlined />}
                disabled={tokenCount === 0}>Mở phiên ký</Button>
            )}
            <Button onClick={fetchData} icon={<ReloadOutlined />}>Làm mới</Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      <Modal
        title={<span><KeyOutlined /> Nhập PIN USB Token</span>}
        open={loginModalOpen}
        onOk={handleOpenSession}
        onCancel={() => { setLoginModalOpen(false); loginForm.resetFields(); }}
        okText="Mở phiên"
        cancelText="Hủy"
        confirmLoading={loading}
        destroyOnHidden
      >
        <Alert type="info" showIcon title="Nhập mã PIN của USB Token để mở phiên ký số."
          description="Phiên ký sẽ tự động hết hạn sau 30 phút không sử dụng." style={{ marginBottom: 16 }} />
        <Form form={loginForm} layout="vertical">
          <Form.Item name="pin" label="Mã PIN" rules={[{ required: true, message: 'Vui lòng nhập mã PIN' }]}>
            <Input.Password placeholder="Nhập mã PIN" size="large" autoFocus
              prefix={<LockOutlined />} onPressEnter={handleOpenSession} />
          </Form.Item>
        </Form>
        {tokens.length > 0 && (
          <Descriptions size="small" column={1} bordered style={{ marginTop: 8 }}>
            <Descriptions.Item label="USB Token">{tokens[0].tokenLabel} ({tokens[0].tokenSerial})</Descriptions.Item>
            <Descriptions.Item label="CA">{tokens[0].caProvider}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Spin>
  );
};

export default DigitalSignature;
