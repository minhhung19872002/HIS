import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card, Tabs, Table, Button, Space, Input, Select, Tag, Modal, Form,
  Row, Col, Statistic, Typography, message, Drawer, Descriptions, InputNumber,
  Switch, DatePicker
} from 'antd';
import {
  ApiOutlined, CloudUploadOutlined, ReloadOutlined, SendOutlined,
  CloseCircleOutlined, SaveOutlined, ThunderboltOutlined, EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  npGateway, nphGateway,
  type NationalPrescriptionSubmissionDto,
  type NationalPrescriptionSubmissionDetailDto,
  type NationalPharmacyOutboundReportDto,
  type NationalPharmacyOutboundReportDetailDto,
  type NationalGatewayConfigDto
} from '../api/nangcap23';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const STATUS_TAG = (s: number, name: string) => {
  const color = s === 2 ? 'success' : s === 1 ? 'processing' : s === 3 ? 'error' : s === 4 ? 'default' : 'default';
  return <Tag color={color}>{name}</Tag>;
};

const NationalGateways: React.FC = () => {
  return (
    <Card title={<><CloudUploadOutlined /> Cổng quốc gia — Đơn thuốc & Dược</>}>
      <Tabs items={[
        { key: 'rx', label: 'Đơn thuốc Quốc Gia (donthuocquocgia.vn)', children: <PrescriptionTab /> },
        { key: 'pharm', label: 'Dược Quốc Gia (duocquocgia.com.vn)', children: <PharmacyTab /> },
        { key: 'cfg', label: 'Cấu hình', children: <ConfigTab /> },
      ]} />
    </Card>
  );
};

const PrescriptionTab: React.FC = () => {
  const [rows, setRows] = useState<NationalPrescriptionSubmissionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [detail, setDetail] = useState<NationalPrescriptionSubmissionDetailDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await npGateway.search({ keyword: keyword.trim() || undefined, status, pageSize: 100 })) || []); }
    catch { message.error('Không tải được danh sách'); }
    finally { setLoading(false); }
  }, [keyword, status]);
  useEffect(() => { load(); }, [load]);

  const kpis = useMemo(() => ({
    total: rows.length,
    ack: rows.filter(r => r.status === 2).length,
    pending: rows.filter(r => r.status === 1).length,
    failed: rows.filter(r => r.status === 3).length
  }), [rows]);

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="Tổng" value={kpis.total} /></Card></Col>
        <Col span={6}><Card><Statistic title="Cổng xác nhận" value={kpis.ack} valueStyle={{ color: '#3f8600' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đang chờ" value={kpis.pending} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Lỗi/Từ chối" value={kpis.failed} valueStyle={{ color: '#cf1322' }} /></Card></Col>
      </Row>
      <Space style={{ marginBottom: 12 }}>
        <Input.Search placeholder="Tìm mã giao dịch / CCCD BN / BS..." value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 360 }} allowClear />
        <Select placeholder="Trạng thái" value={status} onChange={setStatus} allowClear style={{ width: 200 }} options={[
          { value: 0, label: 'Nháp' }, { value: 1, label: 'Đã gửi' }, { value: 2, label: 'Cổng xác nhận' }, { value: 3, label: 'Bị từ chối' }, { value: 4, label: 'Đã hủy' }
        ]} />
        <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={rows}
        loading={loading}
        size="small"
        columns={[
          { title: 'Mã giao dịch', dataIndex: 'submissionCode', width: 220, render: (v) => <Text code>{v}</Text> },
          { title: 'Đơn thuốc', render: (_, r) => (<><b>{r.prescriptionCode || '—'}</b><br /><Text type="secondary">{r.patientName || '—'}</Text></>) },
          { title: 'BS', dataIndex: 'doctorIdNumber', width: 140 },
          { title: 'CCHN', dataIndex: 'doctorLicenseNumber', width: 140, render: (v) => <Text code>{v}</Text> },
          { title: 'Loại đơn', dataIndex: 'prescriptionType', width: 120 },
          { title: 'Gửi lúc', dataIndex: 'submittedAt', width: 140, render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—' },
          { title: 'Trạng thái', width: 160, render: (_, r) => STATUS_TAG(r.status, r.statusName) },
          {
            title: 'Hành động', width: 160, render: (_, r) => (
              <Space size={4}>
                {r.status !== 2 && r.status !== 4 && (
                  <Button size="small" icon={<ReloadOutlined />} onClick={async () => {
                    try { await npGateway.retry(r.id); message.success('Đã gửi lại'); load(); } catch { message.error('Lỗi'); }
                  }}>Gửi lại</Button>
                )}
                {r.status !== 4 && (
                  <Button size="small" danger icon={<CloseCircleOutlined />} onClick={async () => {
                    try { await npGateway.cancel(r.id); message.success('Đã hủy'); load(); } catch { message.error('Lỗi'); }
                  }}>Hủy</Button>
                )}
              </Space>
            )
          }
        ]}
        onRow={(r) => ({ onClick: async () => { try { setDetail(await npGateway.get(r.id)); } catch { message.error('Lỗi tải chi tiết'); } }, style: { cursor: 'pointer' } })}
      />
      <Drawer open={!!detail} onClose={() => setDetail(null)} width={760} title={`Đơn thuốc QG — ${detail?.submissionCode || ''}`}>
        {detail && (
          <>
            <Descriptions bordered column={2} size="small" title="Thông tin giao dịch">
              <Descriptions.Item label="Mã giao dịch">{detail.submissionCode}</Descriptions.Item>
              <Descriptions.Item label="Mã CSKB">{detail.facilityCode}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{STATUS_TAG(detail.status, detail.statusName)}</Descriptions.Item>
              <Descriptions.Item label="Cổng ack">{detail.gatewayTransactionId || '—'}</Descriptions.Item>
              <Descriptions.Item label="Gửi lúc">{detail.submittedAt ? dayjs(detail.submittedAt).format('DD/MM/YYYY HH:mm') : '—'}</Descriptions.Item>
              <Descriptions.Item label="Ack lúc">{detail.acknowledgedAt ? dayjs(detail.acknowledgedAt).format('DD/MM/YYYY HH:mm') : '—'}</Descriptions.Item>
              {detail.errorMessage && <Descriptions.Item label="Lỗi" span={2}>{detail.errorMessage}</Descriptions.Item>}
            </Descriptions>
            <Title level={5} style={{ marginTop: 16 }}>Đơn thuốc</Title>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Mã đơn">{detail.prescriptionCode || '—'}</Descriptions.Item>
              <Descriptions.Item label="Bệnh nhân">{detail.patientName || '—'}</Descriptions.Item>
              <Descriptions.Item label="CCCD BN">{detail.patientIdNumber}</Descriptions.Item>
              <Descriptions.Item label="BS">{detail.doctorIdNumber}</Descriptions.Item>
              <Descriptions.Item label="CCHN BS">{detail.doctorLicenseNumber}</Descriptions.Item>
              <Descriptions.Item label="Loại đơn">{detail.prescriptionType}</Descriptions.Item>
            </Descriptions>
            <Title level={5} style={{ marginTop: 16 }}>Payload gửi đi</Title>
            <pre style={{ fontSize: 11, padding: 12, background: '#f5f5f5', maxHeight: 300, overflow: 'auto' }}>
              {detail.payloadJson ? (() => { try { return JSON.stringify(JSON.parse(detail.payloadJson), null, 2); } catch { return detail.payloadJson; } })() : '—'}
            </pre>
            {detail.responseJson && (
              <>
                <Title level={5} style={{ marginTop: 16 }}>Phản hồi từ cổng</Title>
                <pre style={{ fontSize: 11, padding: 12, background: '#f5f5f5', maxHeight: 200, overflow: 'auto' }}>
                  {(() => { try { return JSON.stringify(JSON.parse(detail.responseJson || ''), null, 2); } catch { return detail.responseJson; } })()}
                </pre>
              </>
            )}
          </>
        )}
      </Drawer>
    </>
  );
};

const PharmacyTab: React.FC = () => {
  const [rows, setRows] = useState<NationalPharmacyOutboundReportDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<string | undefined>(undefined);
  const [showGen, setShowGen] = useState(false);
  const [genForm] = Form.useForm();
  const [detail, setDetail] = useState<NationalPharmacyOutboundReportDetailDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await nphGateway.search({ reportType, pageSize: 100 })) || []); }
    catch { message.error('Lỗi tải'); }
    finally { setLoading(false); }
  }, [reportType]);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    const v = await genForm.validateFields();
    try {
      await nphGateway.generate({
        reportType: v.reportType, periodFrom: v.range[0].toISOString(), periodTo: v.range[1].toISOString(), notes: v.notes
      });
      message.success('Đã tạo và gửi báo cáo');
      setShowGen(false); genForm.resetFields(); load();
    } catch { message.error('Tạo báo cáo thất bại'); }
  };

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Select placeholder="Loại báo cáo" value={reportType} onChange={setReportType} allowClear style={{ width: 240 }} options={[
          { value: 'DailySale', label: 'Bán hàng ngày' },
          { value: 'MonthlyInventory', label: 'Tồn kho tháng' },
          { value: 'NarcoticReport', label: 'Báo cáo gây nghiện' },
          { value: 'Recall', label: 'Thu hồi' }
        ]} />
        <Button type="primary" icon={<SendOutlined />} onClick={() => setShowGen(true)}>Tạo & gửi</Button>
        <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={rows}
        loading={loading}
        size="small"
        columns={[
          { title: 'Mã báo cáo', dataIndex: 'reportCode', width: 260, render: (v) => <Text code>{v}</Text> },
          { title: 'Loại', dataIndex: 'reportType', width: 180 },
          { title: 'Kỳ', width: 220, render: (_, r) => `${dayjs(r.periodFrom).format('DD/MM')} → ${dayjs(r.periodTo).format('DD/MM/YYYY')}` },
          { title: 'Số mục', dataIndex: 'itemCount', width: 90 },
          { title: 'Gửi lúc', dataIndex: 'submittedAt', width: 140, render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—' },
          { title: 'Trạng thái', width: 160, render: (_, r) => STATUS_TAG(r.status, r.statusName) },
          {
            title: 'Hành động', width: 110, render: (_, r) => r.status !== 2 ? (
              <Button size="small" icon={<ReloadOutlined />} onClick={async () => {
                try { await nphGateway.retry(r.id); message.success('Đã gửi lại'); load(); } catch { message.error('Lỗi'); }
              }}>Gửi lại</Button>
            ) : null
          }
        ]}
        onRow={(r) => ({ onClick: async () => { try { setDetail(await nphGateway.get(r.id)); } catch { message.error('Lỗi'); } }, style: { cursor: 'pointer' } })}
      />

      <Modal title="Tạo báo cáo Dược QG" open={showGen} onCancel={() => setShowGen(false)} onOk={generate} okText="Tạo & gửi">
        <Form form={genForm} layout="vertical" initialValues={{ reportType: 'DailySale', range: [dayjs().subtract(7, 'day'), dayjs()] }}>
          <Form.Item label="Loại báo cáo" name="reportType" rules={[{ required: true }]}>
            <Select options={[
              { value: 'DailySale', label: 'Bán hàng ngày' },
              { value: 'MonthlyInventory', label: 'Tồn kho tháng' },
              { value: 'NarcoticReport', label: 'Báo cáo gây nghiện' },
              { value: 'Recall', label: 'Thu hồi' }
            ]} />
          </Form.Item>
          <Form.Item label="Kỳ báo cáo" name="range" rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Ghi chú" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer open={!!detail} onClose={() => setDetail(null)} width={760} title={`Báo cáo Dược QG — ${detail?.reportCode || ''}`}>
        {detail && (
          <>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Mã">{detail.reportCode}</Descriptions.Item>
              <Descriptions.Item label="Loại">{detail.reportType}</Descriptions.Item>
              <Descriptions.Item label="Số mục">{detail.itemCount}</Descriptions.Item>
              <Descriptions.Item label="Kỳ">{`${dayjs(detail.periodFrom).format('DD/MM/YYYY')} → ${dayjs(detail.periodTo).format('DD/MM/YYYY')}`}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{STATUS_TAG(detail.status, detail.statusName)}</Descriptions.Item>
              <Descriptions.Item label="Ticket cổng">{detail.gatewayTicketNumber || '—'}</Descriptions.Item>
            </Descriptions>
            <Title level={5} style={{ marginTop: 16 }}>Payload XML</Title>
            <pre style={{ fontSize: 11, padding: 12, background: '#f5f5f5', maxHeight: 360, overflow: 'auto' }}>{detail.payloadXml || '—'}</pre>
            {detail.responseXml && (
              <>
                <Title level={5} style={{ marginTop: 16 }}>Phản hồi</Title>
                <pre style={{ fontSize: 11, padding: 12, background: '#f5f5f5' }}>{detail.responseXml}</pre>
              </>
            )}
          </>
        )}
      </Drawer>
    </>
  );
};

const ConfigTab: React.FC = () => {
  const [cfg, setCfg] = useState<NationalGatewayConfigDto | null>(null);
  const [tested, setTested] = useState<boolean | null>(null);

  useEffect(() => { npGateway.getConfig().then(setCfg).catch(() => message.error('Lỗi tải cấu hình')); }, []);

  if (!cfg) return <Card loading />;

  const save = async () => {
    try { await npGateway.saveConfig(cfg); message.success('Đã lưu cấu hình'); }
    catch { message.error('Lỗi lưu'); }
  };
  const test = async () => {
    try { const r = await npGateway.testConnection(); setTested(r.connected); }
    catch { setTested(false); }
  };

  return (
    <Card title={<><ApiOutlined /> Cấu hình cổng quốc gia</>} extra={
      <Space>
        <Button icon={<ThunderboltOutlined />} onClick={test}>Kiểm tra kết nối</Button>
        {tested !== null && <Tag color={tested ? 'success' : 'error'}>{tested ? 'Kết nối OK' : 'Mất kết nối'}</Tag>}
        <Button type="primary" icon={<SaveOutlined />} onClick={save}>Lưu</Button>
      </Space>
    }>
      <Form layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="URL Đơn thuốc QG">
              <Input value={cfg.nationalPrescriptionBaseUrl} onChange={e => setCfg({ ...cfg, nationalPrescriptionBaseUrl: e.target.value })} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="URL Dược QG">
              <Input value={cfg.nationalPharmacyBaseUrl} onChange={e => setCfg({ ...cfg, nationalPharmacyBaseUrl: e.target.value })} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Mã CSKB"><Input value={cfg.facilityCode} onChange={e => setCfg({ ...cfg, facilityCode: e.target.value })} /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Tên CSKB"><Input value={cfg.facilityName} onChange={e => setCfg({ ...cfg, facilityName: e.target.value })} /></Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Mock mode"><Switch checked={cfg.mockMode} onChange={(v) => setCfg({ ...cfg, mockMode: v })} /></Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Tự động gửi"><Switch checked={cfg.autoSubmit} onChange={(v) => setCfg({ ...cfg, autoSubmit: v })} /></Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Số lần thử lại"><InputNumber value={cfg.retryCount} onChange={(v) => setCfg({ ...cfg, retryCount: Number(v) })} /></Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Timeout (giây)"><InputNumber value={cfg.timeoutSeconds} onChange={(v) => setCfg({ ...cfg, timeoutSeconds: Number(v) })} /></Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default NationalGateways;
