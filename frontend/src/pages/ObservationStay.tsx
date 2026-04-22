/**
 * Phòng lưu / Observation ngắn hạn — N1.07.
 * Tiếp nhận → ghi sinh hiệu → cho về / chuyển nhập viện.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, Tabs, Table, Button, Tag, Modal, Form, Input, Select, Space, InputNumber, message,
  Drawer, Statistic, Row, Col, Timeline, Typography, Divider,
} from 'antd';
import { ReloadOutlined, HomeOutlined, UserAddOutlined, HeartOutlined, LogoutOutlined, SwapOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import systemApi from '../api/system';

const { Text } = Typography;

interface Stay {
  id: string; stayCode: string; patientCode: string; patientName: string;
  gender: number; dateOfBirth?: string;
  departmentName?: string; roomName?: string; bedName?: string; doctorName?: string;
  admittedAt: string; dischargedAt?: string; chiefComplaint?: string;
  initialDiagnosis?: string; finalDiagnosis?: string;
  status: number; dischargeReason?: string; ewsScore?: number;
  hoursInObservation: number;
}

interface Vital {
  id: string; recordedAt: string;
  temperature?: number; heartRate?: number; respirationRate?: number;
  bloodPressure?: string; spO2?: number; consciousness?: number;
  nurseNote?: string; doctorNote?: string;
}

const STATUS_TAGS: Record<number, { color: string; label: string }> = {
  1: { color: 'blue', label: 'Đang lưu' },
  2: { color: 'green', label: 'Cho về' },
  3: { color: 'purple', label: 'Chuyển NV' },
  4: { color: 'gold', label: 'Chuyển viện' },
  5: { color: 'red', label: 'Tử vong' },
};

export default function ObservationStayPage() {
  const [tab, setTab] = useState('1');
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailStay, setDetailStay] = useState<Stay | null>(null);
  const [detailVitals, setDetailVitals] = useState<Vital[]>([]);
  const [vitalOpen, setVitalOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState<'discharge' | 'escalate' | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  const [createForm] = Form.useForm();
  const [vitalForm] = Form.useForm();
  const [dischargeForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<Stay[]>('/observation/list', { params: { status: Number(tab) } });
      setStays(data || []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tải danh sách thất bại');
    } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const d = await systemApi.catalog.getDepartments();
        setDepartments((d as any)?.data?.items || (d as any)?.data || []);
        const r = await apiClient.get('/catalog/rooms');
        setRooms((r as any)?.data?.items || (r as any)?.data || []);
      } catch { /* empty */ }
    })();
  }, []);

  const openDetail = async (stay: Stay) => {
    setDetailStay(stay);
    try {
      const { data } = await apiClient.get(`/observation/${stay.id}/vitals`);
      setDetailVitals(data.vitals || []);
    } catch { /* empty */ }
  };

  const searchPatient = async (kw: string) => {
    if (!kw) return [];
    try {
      const { data } = await apiClient.get('/reception/patients/search', { params: { keyword: kw, pageSize: 10 } });
      return (data.items || []).map((p: any) => ({
        label: `${p.patientCode} - ${p.fullName}`,
        value: p.id,
      }));
    } catch { return []; }
  };

  const [patientOptions, setPatientOptions] = useState<any[]>([]);

  const createStay = async () => {
    const v = await createForm.validateFields();
    try {
      const { data } = await apiClient.post('/observation', v);
      message.success(`Tạo phiên ${data.stayCode} thành công`);
      setCreateOpen(false);
      createForm.resetFields();
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tạo phiên thất bại');
    }
  };

  const submitVital = async () => {
    if (!detailStay) return;
    const v = await vitalForm.validateFields();
    try {
      const { data } = await apiClient.post(`/observation/${detailStay.id}/vitals`, v);
      message.success(`Đã ghi sinh hiệu (MEWS: ${data.ewsScore})`);
      vitalForm.resetFields();
      setVitalOpen(false);
      await openDetail(detailStay);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Ghi sinh hiệu thất bại');
    }
  };

  const submitDischarge = async () => {
    if (!detailStay || !dischargeOpen) return;
    const v = await dischargeForm.validateFields();
    try {
      await apiClient.put(`/observation/${detailStay.id}/${dischargeOpen}`, v);
      message.success(dischargeOpen === 'discharge' ? 'Đã cho về' : 'Đã chuyển nhập viện');
      setDischargeOpen(null);
      setDetailStay(null);
      dischargeForm.resetFields();
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Xử lý thất bại');
    }
  };

  const columns: any[] = [
    { title: 'Mã', dataIndex: 'stayCode', width: 160 },
    { title: 'BN', render: (_: any, r: Stay) => <>
      <Text strong>{r.patientName}</Text> <Text type="secondary">({r.patientCode})</Text>
    </> },
    { title: 'Lý do', dataIndex: 'chiefComplaint', ellipsis: true },
    { title: 'CĐ sơ bộ', dataIndex: 'initialDiagnosis', ellipsis: true },
    { title: 'Khoa/Phòng', render: (_: any, r: Stay) => `${r.departmentName || '-'} / ${r.roomName || '-'}` },
    { title: 'Vào', dataIndex: 'admittedAt', width: 130, render: (v: string) => dayjs(v).format('DD/MM HH:mm') },
    { title: 'Giờ lưu', dataIndex: 'hoursInObservation', width: 90, align: 'right' as const,
      render: (h: number) => <Tag color={h > 12 ? 'red' : h > 6 ? 'orange' : 'blue'}>{h}h</Tag> },
    { title: 'MEWS', dataIndex: 'ewsScore', width: 80, align: 'right' as const,
      render: (s: number) => s == null ? '-' : <Tag color={s >= 5 ? 'red' : s >= 3 ? 'orange' : 'green'}>{s}</Tag> },
    { title: 'TT', dataIndex: 'status', width: 110,
      render: (s: number) => {
        const t = STATUS_TAGS[s] || { color: 'default', label: String(s) };
        return <Tag color={t.color}>{t.label}</Tag>;
      } },
    { title: 'Thao tác', width: 100,
      render: (_: any, r: Stay) => <Button size="small" onClick={() => openDetail(r)}>Chi tiết</Button> },
  ];

  return (
    <div>
      <Card title={<Space><HomeOutlined /> Phòng lưu (N1.07)</Space>}
        extra={<Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setCreateOpen(true)}>
            Tiếp nhận vào phòng lưu
          </Button>
        </Space>}
      >
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: '1', label: 'Đang lưu' },
            { key: '2', label: 'Đã về nhà' },
            { key: '3', label: 'Đã chuyển NV' },
          ]}
        />
        <Table size="small" rowKey="id" dataSource={stays} columns={columns} loading={loading}
          pagination={{ pageSize: 20 }} />
      </Card>

      {/* Create modal */}
      <Modal
        open={createOpen}
        title="Tiếp nhận vào phòng lưu"
        onCancel={() => setCreateOpen(false)}
        onOk={createStay}
        okText="Tạo phiên"
        width={640}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item label="Bệnh nhân" name="patientId" rules={[{ required: true }]}>
            <Select
              showSearch
              filterOption={false}
              placeholder="Tìm theo mã BN, họ tên, CCCD, SĐT..."
              options={patientOptions}
              onSearch={async kw => setPatientOptions(await searchPatient(kw))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Khoa" name="departmentId">
                <Select allowClear showSearch optionFilterProp="label"
                  options={departments.map(d => ({ label: d.departmentName, value: d.id }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Phòng" name="roomId">
                <Select allowClear showSearch optionFilterProp="label"
                  options={rooms.map(r => ({ label: `${r.roomCode} - ${r.roomName}`, value: r.id }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Lý do vào lưu" name="chiefComplaint" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Chẩn đoán sơ bộ" name="initialDiagnosis">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Ghi chú" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail drawer */}
      <Drawer
        open={!!detailStay}
        title={detailStay ? `${detailStay.stayCode} — ${detailStay.patientName}` : ''}
        onClose={() => setDetailStay(null)}
        size="large"
        extra={detailStay?.status === 1 && (
          <Space>
            <Button icon={<HeartOutlined />} onClick={() => setVitalOpen(true)}>Ghi sinh hiệu</Button>
            <Button icon={<LogoutOutlined />} type="primary" onClick={() => setDischargeOpen('discharge')}>
              Cho về
            </Button>
            <Button icon={<SwapOutlined />} danger onClick={() => setDischargeOpen('escalate')}>
              Chuyển NV
            </Button>
          </Space>
        )}
      >
        {detailStay && (
          <>
            <Row gutter={16}>
              <Col span={8}><Statistic title="Giờ lưu" value={detailStay.hoursInObservation} suffix="h" /></Col>
              <Col span={8}><Statistic title="MEWS" value={detailStay.ewsScore ?? '-'}
                valueStyle={{ color: (detailStay.ewsScore ?? 0) >= 5 ? '#cf1322' : undefined }} /></Col>
              <Col span={8}><Statistic title="Số lần ghi" value={detailVitals.length} /></Col>
            </Row>
            <Divider style={{ margin: '16px 0' }} />
            <p><b>Lý do vào lưu:</b> {detailStay.chiefComplaint || '-'}</p>
            <p><b>Chẩn đoán sơ bộ:</b> {detailStay.initialDiagnosis || '-'}</p>
            {detailStay.finalDiagnosis && <p><b>Chẩn đoán kết thúc:</b> {detailStay.finalDiagnosis}</p>}
            <Divider>Timeline sinh hiệu</Divider>
            {detailVitals.length === 0 ? (
              <Text type="secondary">Chưa có bản ghi sinh hiệu</Text>
            ) : (
              <Timeline items={detailVitals.map(v => ({
                color: 'blue',
                children: <>
                  <Text strong>{dayjs(v.recordedAt).format('DD/MM HH:mm')}</Text>
                  <div style={{ marginTop: 4 }}>
                    <Space wrap>
                      {v.temperature != null && <Tag>T° {v.temperature}</Tag>}
                      {v.heartRate != null && <Tag>HR {v.heartRate}</Tag>}
                      {v.respirationRate != null && <Tag>RR {v.respirationRate}</Tag>}
                      {v.bloodPressure && <Tag>BP {v.bloodPressure}</Tag>}
                      {v.spO2 != null && <Tag>SpO₂ {v.spO2}%</Tag>}
                      {v.consciousness != null && <Tag>GCS {v.consciousness}</Tag>}
                    </Space>
                  </div>
                  {v.nurseNote && <div><Text type="secondary">ĐD: {v.nurseNote}</Text></div>}
                  {v.doctorNote && <div><Text type="secondary">BS: {v.doctorNote}</Text></div>}
                </>,
              }))} />
            )}
          </>
        )}
      </Drawer>

      {/* Vital modal */}
      <Modal
        open={vitalOpen}
        title="Ghi sinh hiệu"
        onCancel={() => setVitalOpen(false)}
        onOk={submitVital}
        okText="Lưu"
        width={600}
      >
        <Form form={vitalForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}><Form.Item label="Nhiệt độ (°C)" name="temperature"><InputNumber step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item label="Mạch (l/p)" name="heartRate"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item label="Thở (l/p)" name="respirationRate"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item label="Huyết áp" name="bloodPressure"><Input placeholder="120/80" /></Form.Item></Col>
            <Col span={8}><Form.Item label="SpO₂ (%)" name="spO2"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item label="GCS" name="consciousness"><InputNumber min={3} max={15} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item label="Ghi chú điều dưỡng" name="nurseNote"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label="Ghi chú BS" name="doctorNote"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Discharge/escalate modal */}
      <Modal
        open={!!dischargeOpen}
        title={dischargeOpen === 'discharge' ? 'Cho về' : 'Chuyển nhập viện'}
        onCancel={() => setDischargeOpen(null)}
        onOk={submitDischarge}
        okText="Xác nhận"
      >
        <Form form={dischargeForm} layout="vertical">
          <Form.Item label="Chẩn đoán kết thúc" name="finalDiagnosis" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Lý do" name="dischargeReason">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Ghi chú" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
