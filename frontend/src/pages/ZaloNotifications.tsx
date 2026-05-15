import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Tabs, Table, Button, Space, Input, Select, Tag, Drawer, Modal, Form, Row, Col, Statistic, Switch, message, Typography, Descriptions
} from 'antd';
import { ReloadOutlined, SendOutlined, SaveOutlined, ApiOutlined, ThunderboltOutlined, MessageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  zalo,
  type ZaloNotificationLogDto, type ZaloConfigDto, type ZaloTemplateDto
} from '../api/nangcap23';

const { Text, Title } = Typography;

const STATUS_TAG = (s: number, name: string) => {
  const color = s === 2 ? 'success' : s === 1 ? 'blue' : s === 3 ? 'error' : 'processing';
  return <Tag color={color}>{name}</Tag>;
};

const ZaloNotifications: React.FC = () => (
  <Card title={<><MessageOutlined /> Zalo Official Account — Notification (ZNS)</>}>
    <Tabs items={[
      { key: 'logs', label: 'Lịch sử gửi', children: <LogsTab /> },
      { key: 'cfg', label: 'Cấu hình OA', children: <ConfigTab /> }
    ]} />
  </Card>
);

const LogsTab: React.FC = () => {
  const [rows, setRows] = useState<ZaloNotificationLogDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [detail, setDetail] = useState<ZaloNotificationLogDto | null>(null);
  const [showSend, setShowSend] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await zalo.search({ keyword: keyword.trim() || undefined, status, pageSize: 100 })); }
    catch { message.error('Lỗi tải'); }
    finally { setLoading(false); }
  }, [keyword, status]);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="Tổng tin" value={rows.length} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đã giao" value={rows.filter(r => r.status === 2).length} valueStyle={{ color: '#3f8600' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đang chờ" value={rows.filter(r => r.status === 0).length} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Lỗi" value={rows.filter(r => r.status === 3).length} valueStyle={{ color: '#cf1322' }} /></Card></Col>
      </Row>
      <Space style={{ marginBottom: 12 }}>
        <Input.Search placeholder="Tìm SĐT / BN / mẫu..." value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 320 }} allowClear />
        <Select placeholder="Trạng thái" value={status} onChange={setStatus} allowClear style={{ width: 180 }} options={[
          { value: 0, label: 'Đang chờ' }, { value: 1, label: 'Đã gửi' }, { value: 2, label: 'Đã nhận' }, { value: 3, label: 'Lỗi' }
        ]} />
        <Button type="primary" icon={<SendOutlined />} onClick={() => setShowSend(true)}>Gửi thử</Button>
        <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
      </Space>
      <Table
        rowKey="id" dataSource={rows} loading={loading} size="small"
        columns={[
          { title: 'Thời gian', dataIndex: 'createdAt', width: 140, render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm') },
          { title: 'Mẫu', render: (_, r) => (<><b>{r.templateName}</b><br /><Text type="secondary" code>{r.templateId}</Text></>) },
          { title: 'SĐT', dataIndex: 'targetPhone', width: 120 },
          { title: 'Bệnh nhân', dataIndex: 'patientName', width: 200 },
          { title: 'Gửi lúc', dataIndex: 'sentAt', width: 140, render: (v) => v ? dayjs(v).format('DD/MM HH:mm') : '—' },
          { title: 'Chi phí', dataIndex: 'costVnd', width: 100, render: (v) => v ? `${v.toLocaleString('vi-VN')}đ` : '—' },
          { title: 'Trạng thái', width: 140, render: (_, r) => STATUS_TAG(r.status, r.statusName) },
        ]}
        onRow={(r) => ({ onClick: () => setDetail(r), style: { cursor: 'pointer' } })}
      />
      <SendModal open={showSend} onClose={() => setShowSend(false)} onSent={load} />
      <Drawer open={!!detail} onClose={() => setDetail(null)} width={680} title={`Tin Zalo — ${detail?.templateName || ''}`}>
        {detail && (
          <>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Mẫu">{detail.templateName}</Descriptions.Item>
              <Descriptions.Item label="Template ID"><Text code>{detail.templateId}</Text></Descriptions.Item>
              <Descriptions.Item label="SĐT">{detail.targetPhone}</Descriptions.Item>
              <Descriptions.Item label="BN">{detail.patientName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{STATUS_TAG(detail.status, detail.statusName)}</Descriptions.Item>
              <Descriptions.Item label="Message ID">{detail.messageId || '—'}</Descriptions.Item>
              <Descriptions.Item label="Gửi lúc">{detail.sentAt ? dayjs(detail.sentAt).format('DD/MM/YYYY HH:mm') : '—'}</Descriptions.Item>
              <Descriptions.Item label="Chi phí">{detail.costVnd ? `${detail.costVnd.toLocaleString('vi-VN')}đ` : '—'}</Descriptions.Item>
              {detail.errorMessage && <Descriptions.Item label="Lỗi" span={2}>{detail.errorMessage}</Descriptions.Item>}
            </Descriptions>
            <Title level={5} style={{ marginTop: 12 }}>Payload</Title>
            <pre style={{ fontSize: 11, padding: 12, background: '#f5f5f5', maxHeight: 200, overflow: 'auto' }}>
              {(() => { try { return JSON.stringify(JSON.parse(detail.payloadJson || '{}'), null, 2); } catch { return detail.payloadJson; } })()}
            </pre>
          </>
        )}
      </Drawer>
    </>
  );
};

const SendModal: React.FC<{ open: boolean; onClose: () => void; onSent: () => void }> = ({ open, onClose, onSent }) => {
  const [templates, setTemplates] = useState<ZaloTemplateDto[]>([]);
  const [form] = Form.useForm();
  const [tplId, setTplId] = useState<string>('appointment_reminder');

  useEffect(() => { if (open) zalo.getTemplates().then(setTemplates).catch(() => {}); }, [open]);

  const tpl = templates.find(t => t.id === tplId);

  const submit = async () => {
    const v = await form.validateFields();
    try {
      await zalo.send({ templateId: tplId, targetPhone: v.phone, templateParams: v.params || {} });
      message.success('Đã gửi'); form.resetFields(); onClose(); onSent();
    } catch { message.error('Gửi thất bại'); }
  };

  return (
    <Modal title="Gửi tin Zalo (ZNS)" open={open} onCancel={onClose} onOk={submit} okText="Gửi">
      <Form form={form} layout="vertical" initialValues={{ templateId: 'appointment_reminder' }}>
        <Form.Item label="Mẫu tin" name="templateId">
          <Select value={tplId} onChange={setTplId} options={templates.map(t => ({ value: t.id, label: t.name }))} />
        </Form.Item>
        <Form.Item label="SĐT" name="phone" rules={[{ required: true, message: 'Nhập SĐT' }]}>
          <Input placeholder="0901234567" />
        </Form.Item>
        {tpl?.params_.map((p) => (
          <Form.Item key={p} label={p} name={['params', p]}>
            <Input />
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
};

const ConfigTab: React.FC = () => {
  const [cfg, setCfg] = useState<ZaloConfigDto | null>(null);
  const [tested, setTested] = useState<boolean | null>(null);

  useEffect(() => { zalo.getConfig().then(setCfg).catch(() => message.error('Lỗi tải')); }, []);

  if (!cfg) return <Card loading />;

  const save = async () => {
    try { await zalo.saveConfig(cfg); message.success('Đã lưu cấu hình'); }
    catch { message.error('Lưu thất bại'); }
  };
  const test = async () => {
    try { const r = await zalo.testConnection(); setTested(r.connected); }
    catch { setTested(false); }
  };

  return (
    <Card title={<><ApiOutlined /> Cấu hình Zalo OA</>} extra={
      <Space>
        <Button icon={<ThunderboltOutlined />} onClick={test}>Kiểm tra kết nối</Button>
        {tested !== null && <Tag color={tested ? 'success' : 'error'}>{tested ? 'OK' : 'Mất kết nối'}</Tag>}
        <Button type="primary" icon={<SaveOutlined />} onClick={save}>Lưu</Button>
      </Space>
    }>
      <Form layout="vertical">
        <Row gutter={16}>
          <Col span={24}><Form.Item label="Access Token"><Input.Password value={cfg.accessToken} onChange={e => setCfg({ ...cfg, accessToken: e.target.value })} /></Form.Item></Col>
          <Col span={12}><Form.Item label="OA ID"><Input value={cfg.oaId} onChange={e => setCfg({ ...cfg, oaId: e.target.value })} /></Form.Item></Col>
          <Col span={12}><Form.Item label="Base URL"><Input value={cfg.baseUrl} onChange={e => setCfg({ ...cfg, baseUrl: e.target.value })} /></Form.Item></Col>
          <Col span={6}><Form.Item label="Mock mode"><Switch checked={cfg.mockMode} onChange={v => setCfg({ ...cfg, mockMode: v })} /></Form.Item></Col>
          <Col span={6}><Form.Item label="Kích hoạt"><Switch checked={cfg.isEnabled} onChange={v => setCfg({ ...cfg, isEnabled: v })} /></Form.Item></Col>
        </Row>
      </Form>
    </Card>
  );
};

export default ZaloNotifications;
