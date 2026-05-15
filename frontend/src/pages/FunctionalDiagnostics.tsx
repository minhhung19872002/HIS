import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Input, Select, Tag, Drawer, Descriptions, Row, Col, Statistic, message, Typography
} from 'antd';
import { ReloadOutlined, CheckOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  fdt,
  type FunctionalDiagnosticTestDto
} from '../api/nangcap23';

const { Text, Title } = Typography;

const STATUS_TAG = (s: number, name: string) => {
  const color = s === 3 ? 'success' : s === 2 ? 'blue' : s === 4 ? 'default' : 'processing';
  return <Tag color={color}>{name}</Tag>;
};

const FunctionalDiagnostics: React.FC = () => {
  const [rows, setRows] = useState<FunctionalDiagnosticTestDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [testType, setTestType] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [detail, setDetail] = useState<FunctionalDiagnosticTestDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fdt.search({
        keyword: keyword.trim() || undefined, testType, status, pageSize: 100
      }));
    } catch { message.error('Lỗi tải'); }
    finally { setLoading(false); }
  }, [keyword, testType, status]);
  useEffect(() => { load(); }, [load]);

  const complete = async (r: FunctionalDiagnosticTestDto) => {
    try { await fdt.complete(r.id); message.success('Đã hoàn thành'); load(); }
    catch { message.error('Lỗi'); }
  };
  const verify = async (r: FunctionalDiagnosticTestDto) => {
    try { await fdt.verify(r.id); message.success('Đã duyệt'); load(); }
    catch { message.error('Lỗi'); }
  };

  return (
    <Card title="Thăm dò chức năng (8 loại)">
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="Tổng" value={rows.length} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đã duyệt" value={rows.filter(r => r.status === 3).length} valueStyle={{ color: '#3f8600' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Hoàn thành" value={rows.filter(r => r.status === 2).length} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đang chờ" value={rows.filter(r => r.status < 2).length} valueStyle={{ color: '#faad14' }} /></Card></Col>
      </Row>
      <Space style={{ marginBottom: 12 }}>
        <Input.Search placeholder="Tìm mã / BN..." value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 320 }} allowClear />
        <Select placeholder="Loại TDCN" value={testType} onChange={setTestType} allowClear style={{ width: 220 }} options={[
          { value: 'ECG', label: 'Điện tim thường quy' },
          { value: 'ECGStress', label: 'Điện tim gắng sức' },
          { value: 'Endoscopy', label: 'Nội soi' },
          { value: 'BoneDensity', label: 'Đo loãng xương' },
          { value: 'EEG', label: 'Điện não' },
          { value: 'EMG', label: 'Điện cơ' },
          { value: 'Spirometry', label: 'Đo CN hô hấp' },
          { value: 'Audiometry', label: 'Đo thính lực' },
        ]} />
        <Select placeholder="Trạng thái" value={status} onChange={setStatus} allowClear style={{ width: 180 }} options={[
          { value: 0, label: 'Đã chỉ định' }, { value: 1, label: 'Đang TH' }, { value: 2, label: 'Hoàn thành' }, { value: 3, label: 'Đã duyệt' }, { value: 4, label: 'Hủy' }
        ]} />
        <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
      </Space>
      <Table
        rowKey="id" dataSource={rows} loading={loading} size="small"
        columns={[
          { title: 'Mã', dataIndex: 'testCode', width: 180, render: (v) => <Text code>{v}</Text> },
          { title: 'Bệnh nhân', render: (_, r) => (<><b>{r.patientName || '—'}</b><br /><Text type="secondary">{r.patientCode}</Text></>) },
          { title: 'Loại TDCN', dataIndex: 'testTypeName', width: 200 },
          { title: 'BS thực hiện', dataIndex: 'performingDoctorName', width: 180 },
          { title: 'Thực hiện lúc', dataIndex: 'performedAt', width: 140, render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—' },
          { title: 'Trạng thái', width: 140, render: (_, r) => STATUS_TAG(r.status, r.statusName) },
          {
            title: 'Hành động', width: 180, render: (_, r) => (
              <Space size={4}>
                {r.status === 1 && <Button size="small" icon={<CheckOutlined />} onClick={() => complete(r)}>Hoàn thành</Button>}
                {r.status === 2 && <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => verify(r)}>Duyệt</Button>}
              </Space>
            )
          }
        ]}
        onRow={(r) => ({ onClick: () => setDetail(r), style: { cursor: 'pointer' } })}
      />
      <Drawer open={!!detail} onClose={() => setDetail(null)} width={720} title={`${detail?.testTypeName || ''} — ${detail?.testCode || ''}`}>
        {detail && (
          <>
            <Descriptions bordered column={2} size="small" title="Bệnh nhân">
              <Descriptions.Item label="Họ tên">{detail.patientName}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{detail.patientCode}</Descriptions.Item>
            </Descriptions>
            <Descriptions bordered column={2} size="small" title="Khám" style={{ marginTop: 12 }}>
              <Descriptions.Item label="Loại">{detail.testTypeName}</Descriptions.Item>
              <Descriptions.Item label="BS thực hiện">{detail.performingDoctorName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Thực hiện lúc">{detail.performedAt ? dayjs(detail.performedAt).format('DD/MM/YYYY HH:mm') : '—'}</Descriptions.Item>
              <Descriptions.Item label="Thiết bị">{detail.deviceName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Số seri">{detail.deviceSerialNumber || '—'}</Descriptions.Item>
            </Descriptions>
            <Title level={5} style={{ marginTop: 12 }}>Chỉ định</Title>
            <div style={{ whiteSpace: 'pre-wrap', padding: 12, background: '#fafafa' }}>{detail.clinicalIndication || '—'}</div>
            <Title level={5} style={{ marginTop: 12 }}>Mô tả kết quả</Title>
            <div style={{ whiteSpace: 'pre-wrap', padding: 12, background: '#fafafa' }}>{detail.findings || '—'}</div>
            <Title level={5} style={{ marginTop: 12 }}>Kết luận</Title>
            <div style={{ whiteSpace: 'pre-wrap', padding: 12, background: '#fafafa' }}>{detail.conclusion || '—'}</div>
            <Title level={5} style={{ marginTop: 12 }}>Khuyến nghị</Title>
            <div style={{ whiteSpace: 'pre-wrap', padding: 12, background: '#fafafa' }}>{detail.recommendation || '—'}</div>
            {detail.measurementsJson && detail.measurementsJson !== '{}' && (
              <>
                <Title level={5} style={{ marginTop: 12 }}>Thông số đo</Title>
                <pre style={{ fontSize: 11, padding: 12, background: '#f5f5f5' }}>
                  {(() => { try { return JSON.stringify(JSON.parse(detail.measurementsJson), null, 2); } catch { return detail.measurementsJson; } })()}
                </pre>
              </>
            )}
          </>
        )}
      </Drawer>
    </Card>
  );
};

export default FunctionalDiagnostics;
