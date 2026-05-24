import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Modal, Descriptions, Table, DatePicker, Select, Tag, Empty } from 'antd';
import dayjs from 'dayjs';
import { inspectorApi } from '../api/nangcap24';
import type { InspectorRecordListItemDto, InspectorRecordDetailDto } from '../api/nangcap24';

const INSPECTOR_TOKEN_KEY = 'inspector_token';
const INSPECTOR_INFO_KEY = 'inspector_info';

interface InspectorInfo {
  id: string;
  username: string;
  fullName: string;
  bhxhCode?: string;
  province?: string;
}

const InspectorPortal: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(INSPECTOR_TOKEN_KEY));
  const [info, setInfo] = useState<InspectorInfo | null>(() => {
    const raw = localStorage.getItem(INSPECTOR_INFO_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  if (!token || !info) {
    return <InspectorLogin onLogin={(t, i) => { setToken(t); setInfo(i); }} />;
  }

  return <InspectorWorkspace info={info} onLogout={() => {
    localStorage.removeItem(INSPECTOR_TOKEN_KEY);
    localStorage.removeItem(INSPECTOR_INFO_KEY);
    setToken(null);
    setInfo(null);
  }} />;
};

// ─────────── Login ───────────
const InspectorLogin: React.FC<{ onLogin: (token: string, info: InspectorInfo) => void }> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleLogin = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const result = await inspectorApi.login({ username: values.username, password: values.password });
      if (!result.success || !result.token || !result.inspector) {
        message.error(result.message || 'Đăng nhập thất bại');
        return;
      }
      localStorage.setItem(INSPECTOR_TOKEN_KEY, result.token);
      localStorage.setItem(INSPECTOR_INFO_KEY, JSON.stringify(result.inspector));
      // Apply token to apiClient for subsequent calls
      localStorage.setItem('token', result.token);
      onLogin(result.token, result.inspector);
      message.success('Đăng nhập cổng giám định thành công');
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
      padding: 24,
    }}>
      <Card style={{ width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} data-testid="inspector-login-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
          <h2 style={{ margin: 0, color: '#1e3a8a' }}>CỔNG GIÁM ĐỊNH BHXH</h2>
          <div style={{ color: '#64748b', marginTop: 4 }}>Tra cứu hồ sơ bệnh án điện tử</div>
        </div>

        <Form form={form} layout="vertical" onFinish={handleLogin}>
          <Form.Item name="username" label="Tài khoản giám định viên" rules={[{ required: true, message: 'Nhập tài khoản' }]}>
            <Input size="large" placeholder="VD: inspector" data-testid="inspector-username" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password size="large" placeholder="Mật khẩu" data-testid="inspector-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" size="large" htmlType="submit" loading={loading} block data-testid="inspector-login-btn">
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
          Demo: inspector / Inspector@123
        </div>
      </Card>
    </div>
  );
};

// ─────────── Workspace ───────────
const InspectorWorkspace: React.FC<{ info: InspectorInfo; onLogout: () => void }> = ({ info, onLogout }) => {
  const [rows, setRows] = useState<InspectorRecordListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [treatmentType, setTreatmentType] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<InspectorRecordDetailDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await inspectorApi.searchRecords({
        keyword, fromDate, toDate, treatmentType, pageIndex: page, pageSize: 20
      });
      setRows(result.items);
      setTotal(result.totalCount);
    } catch (e: any) {
      message.warning(e?.response?.data?.message || 'Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const openDetail = async (id: string) => {
    try {
      const d = await inspectorApi.getRecord(id);
      setDetail(d);
    } catch (e: any) {
      message.error('Không lấy được chi tiết hồ sơ');
    }
  };

  const downloadXml = async (id: string, code: string) => {
    try {
      const blob = await inspectorApi.downloadXml(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HSBA_${code}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('Đã tải file XML');
    } catch {
      message.error('Tải XML thất bại');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
        color: '#fff',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 22 }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>CỔNG GIÁM ĐỊNH BHXH</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{info.fullName} • {info.bhxhCode} • {info.province}</div>
          </div>
        </div>
        <Button onClick={onLogout} ghost>Đăng xuất</Button>
      </div>

      <div style={{ padding: 24 }}>
        <Card title="Tìm kiếm HSBA" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Input
              placeholder="Mã HSBA, tên BN, mã BHYT..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              style={{ width: 280 }}
              data-testid="inspector-search-keyword"
            />
            <DatePicker
              placeholder="Từ ngày"
              onChange={d => setFromDate(d?.toISOString())}
              style={{ width: 160 }}
            />
            <DatePicker
              placeholder="Đến ngày"
              onChange={d => setToDate(d?.toISOString())}
              style={{ width: 160 }}
            />
            <Select
              placeholder="Loại"
              allowClear
              value={treatmentType}
              onChange={setTreatmentType}
              style={{ width: 160 }}
              options={[
                { value: 1, label: 'BHYT' },
                { value: 2, label: 'Viện phí' },
                { value: 3, label: 'Dịch vụ' },
                { value: 4, label: 'Khám SK' },
              ]}
            />
            <Button type="primary" onClick={() => { setPage(1); load(); }} loading={loading} data-testid="inspector-search-btn">Tìm</Button>
          </div>
        </Card>

        <Card title={`Danh sách HSBA (${total})`}>
          <Table
            dataSource={rows}
            rowKey="medicalRecordId"
            loading={loading}
            pagination={{
              current: page,
              total,
              pageSize: 20,
              onChange: setPage,
            }}
            columns={[
              { title: 'Mã HSBA', dataIndex: 'medicalRecordCode', width: 120 },
              { title: 'Tên BN', dataIndex: 'patientName', width: 180 },
              { title: 'BHYT', dataIndex: 'insuranceNumber', width: 130, render: (v) => v || <Tag>Không BHYT</Tag> },
              { title: 'Khoa', dataIndex: 'departmentName', width: 140 },
              { title: 'Ngày vào', dataIndex: 'admissionDate', width: 110, render: (v) => dayjs(v).format('DD/MM/YYYY') },
              { title: 'Ngày ra', dataIndex: 'dischargeDate', width: 110, render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
              { title: 'Chẩn đoán', dataIndex: 'diagnosis', ellipsis: true },
              {
                title: 'Loại', dataIndex: 'treatmentTypeName', width: 100,
                render: (v) => <Tag color="blue">{v}</Tag>
              },
              {
                title: 'Hành động', width: 200, render: (_, r) => (
                  <>
                    <Button size="small" type="link" onClick={() => openDetail(r.medicalRecordId)}>Xem</Button>
                    <Button size="small" type="link" onClick={() => downloadXml(r.medicalRecordId, r.medicalRecordCode)}>Tải XML</Button>
                  </>
                )
              },
            ]}
            locale={{ emptyText: <Empty description="Chưa có HSBA nào" /> }}
          />
        </Card>
      </div>

      <Modal
        open={!!detail}
        onCancel={() => setDetail(null)}
        title={detail ? `Chi tiết HSBA ${detail.medicalRecordCode}` : ''}
        width={900}
        footer={null}
      >
        {detail && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Tên BN">{detail.patientName}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{dayjs(detail.patientDob).format('DD/MM/YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Giới tính">{detail.patientGender}</Descriptions.Item>
              <Descriptions.Item label="BHYT">{detail.insuranceNumber || 'Không'}</Descriptions.Item>
              <Descriptions.Item label="Khoa">{detail.departmentName}</Descriptions.Item>
              <Descriptions.Item label="Ngày vào">{dayjs(detail.admissionDate).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Ngày ra">{detail.dischargeDate ? dayjs(detail.dischargeDate).format('DD/MM/YYYY HH:mm') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Tổng tiền">{detail.totalAmount.toLocaleString('vi-VN')} đ</Descriptions.Item>
              <Descriptions.Item label="BHYT thanh toán">{detail.bhytAmount.toLocaleString('vi-VN')} đ</Descriptions.Item>
              <Descriptions.Item label="Đồng chi trả">{detail.coPayAmount.toLocaleString('vi-VN')} đ</Descriptions.Item>
              <Descriptions.Item label="Chẩn đoán vào" span={2}>{detail.admissionDiagnosis}</Descriptions.Item>
              <Descriptions.Item label="Chẩn đoán ra" span={2}>{detail.finalDiagnosis}</Descriptions.Item>
            </Descriptions>

            <h4 style={{ marginTop: 16 }}>Dịch vụ ({detail.services.length})</h4>
            <Table
              dataSource={detail.services}
              rowKey={(_r, idx) => `svc-${idx}`}
              pagination={false}
              size="small"
              columns={[
                { title: 'Mã', dataIndex: 'serviceCode', width: 120 },
                { title: 'Tên dịch vụ', dataIndex: 'serviceName' },
                { title: 'SL', dataIndex: 'quantity', width: 60 },
                { title: 'Đơn giá', dataIndex: 'unitPrice', width: 110, render: (v) => v.toLocaleString('vi-VN') },
                { title: 'Tổng', dataIndex: 'totalAmount', width: 120, render: (v) => v.toLocaleString('vi-VN') },
              ]}
            />

            <h4 style={{ marginTop: 16 }}>Thuốc ({detail.medicines.length})</h4>
            <Table
              dataSource={detail.medicines}
              rowKey={(_r, idx) => `med-${idx}`}
              pagination={false}
              size="small"
              columns={[
                { title: 'Mã', dataIndex: 'medicineCode', width: 120 },
                { title: 'Tên thuốc', dataIndex: 'medicineName' },
                { title: 'Hàm lượng', dataIndex: 'concentration', width: 120 },
                { title: 'SL', dataIndex: 'quantity', width: 60 },
                { title: 'Đơn giá', dataIndex: 'unitPrice', width: 110, render: (v) => v.toLocaleString('vi-VN') },
                { title: 'Tổng', dataIndex: 'totalAmount', width: 120, render: (v) => v.toLocaleString('vi-VN') },
              ]}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default InspectorPortal;
