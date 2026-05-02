import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Input, InputNumber, Select, Modal } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import systemApi from '../api/system';
import {
  KpiStrip, StatusTabs, DataTable, StatusBadge, ActBtn, DrawerShell, ModalShell, DrSec, DrField,
  Ico, tk, ti, tw, type ColumnDef,
} from './_v2kit';

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

type SKey = 'observing' | 'discharged' | 'escalated';
const STATUS_TABS = [
  { v: 'observing' as SKey,  l: 'Đang lưu',  tone: 'warn' as const },
  { v: 'discharged' as SKey, l: 'Đã về',     tone: 'ok' as const },
  { v: 'escalated' as SKey,  l: 'Chuyển NV', tone: 'info' as const },
];
const tabToStatus = (s: SKey | 'all') => s === 'observing' ? 1 : s === 'discharged' ? 2 : s === 'escalated' ? 3 : 1;

const STATUS_LABEL: Record<number, string> = { 1: 'Đang lưu', 2: 'Cho về', 3: 'Chuyển NV', 4: 'Chuyển viện', 5: 'Tử vong' };

const ObservationStayV2: React.FC = () => {
  const [stab, setStab] = useState<SKey | 'all'>('observing');
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Stay | null>(null);
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [vitalOpen, setVitalOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState<'discharge' | 'escalate' | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [departments, setDepartments] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rooms, setRooms] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [patientOptions, setPatientOptions] = useState<any[]>([]);
  const [createForm] = Form.useForm();
  const [vitalForm] = Form.useForm();
  const [dischargeForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<Stay[]>('/observation/list', { params: { status: tabToStatus(stab) } });
      setStays(data || []);
    } catch { ti('Tải danh sách thất bại'); }
    finally { setLoading(false); }
  }, [stab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const d = await systemApi.catalog.getDepartments();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setDepartments(((d as any)?.data?.items || (d as any)?.data || []) as any[]);
        const r = await apiClient.get('/catalog/rooms');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRooms(((r as any)?.data?.items || (r as any)?.data || []) as any[]);
      } catch { /* empty */ }
    })();
  }, []);

  const openDetail = async (s: Stay) => {
    setDetail(s);
    try {
      const { data } = await apiClient.get<{ vitals?: Vital[] }>(`/observation/${s.id}/vitals`);
      setVitals(data.vitals || []);
    } catch { setVitals([]); }
  };

  const searchPatient = async (kw: string) => {
    if (!kw) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await apiClient.get<{ items?: any[] }>('/reception/patients/search', { params: { keyword: kw, pageSize: 10 } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPatientOptions((data.items || []).map((p: any) => ({ label: `${p.patientCode} — ${p.fullName}`, value: p.id })));
    } catch { setPatientOptions([]); }
  };

  const createStay = async () => {
    const v = await createForm.validateFields();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data }: { data: any } = await apiClient.post('/observation', v);
      tk(`Tạo phiên ${data.stayCode} thành công`);
      setCreateOpen(false); createForm.resetFields(); load();
    } catch { tw('Tạo phiên thất bại'); }
  };

  const submitVital = async () => {
    if (!detail) return;
    const v = await vitalForm.validateFields();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data }: { data: any } = await apiClient.post(`/observation/${detail.id}/vitals`, v);
      tk(`Đã ghi sinh hiệu (MEWS: ${data.ewsScore})`);
      vitalForm.resetFields(); setVitalOpen(false);
      openDetail(detail); load();
    } catch { tw('Ghi sinh hiệu thất bại'); }
  };

  const submitDischarge = async () => {
    if (!detail || !dischargeOpen) return;
    const v = await dischargeForm.validateFields();
    try {
      await apiClient.put(`/observation/${detail.id}/${dischargeOpen}`, v);
      tk(dischargeOpen === 'discharge' ? 'Đã cho về' : 'Đã chuyển nhập viện');
      setDischargeOpen(null); setDetail(null); dischargeForm.resetFields(); load();
    } catch { tw('Xử lý thất bại'); }
  };

  const counts = useMemo(() => ({ all: stays.length }) as Record<string, number>, [stays]);

  const cols: ColumnDef<Stay>[] = [
    { key: 'code', label: 'Mã phiên', code: true, render: (r) => r.stayCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'reason', label: 'Lý do', render: (r) => r.chiefComplaint || '—' },
    { key: 'dx', label: 'CĐ sơ bộ', render: (r) => r.initialDiagnosis || '—' },
    { key: 'loc', label: 'Khoa/Phòng', render: (r) => `${r.departmentName || '—'} / ${r.roomName || '—'}` },
    { key: 'in', label: 'Vào', mono: true, render: (r) => dayjs(r.admittedAt).format('DD/MM HH:mm') },
    { key: 'hours', label: 'Giờ lưu', mono: true, render: (r) => {
      const h = r.hoursInObservation;
      const tone = h > 12 ? 'crit' : h > 6 ? 'warn' : 'info';
      return <StatusBadge tone={tone}>{h}h</StatusBadge>;
    } },
    { key: 'mews', label: 'MEWS', mono: true, render: (r) => r.ewsScore == null ? '—'
      : <StatusBadge tone={r.ewsScore >= 5 ? 'crit' : r.ewsScore >= 3 ? 'warn' : 'ok'}>{r.ewsScore}</StatusBadge>
    },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = r.status === 1 ? 'warn' : r.status === 2 ? 'ok' : r.status === 3 ? 'info' : 'crit';
      return <StatusBadge tone={t} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Đang lưu', val: stays.filter((s) => s.status === 1).length, sub: 'phòng lưu', tone: 'warn' },
        { lbl: 'MEWS cao', val: stays.filter((s) => (s.ewsScore || 0) >= 5).length, sub: '≥ 5', tone: 'crit' },
        { lbl: 'Lưu > 6h', val: stays.filter((s) => s.hoursInObservation > 6).length, sub: 'cần đánh giá', tone: 'warn' },
        { lbl: 'Hôm nay', val: stays.length, sub: STATUS_TABS.find((t) => t.v === stab)?.l || 'tất cả' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <span style={{ fontSize: 12, color: 'var(--t-2)' }}>Phòng lưu / Observation ngắn hạn (≤24h)</span>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={() => setCreateOpen(true)}>
          <Ico name="plus" size={12} /> Tiếp nhận
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<Stay>
        columns={cols} data={stays} rowKey={(r) => r.id}
        onRowClick={openDetail}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="eye" title="Chi tiết" onClick={() => openDetail(r)} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : 'Không có phiên lưu'}
      />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        size="xl"
        title={detail ? `${detail.stayCode} — ${detail.patientName}` : ''}
        sub={detail ? `${detail.hoursInObservation}h · MEWS ${detail.ewsScore ?? '—'}` : ''}
        footer={detail?.status === 1 ? <>
          <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => setVitalOpen(true)}>
            <Ico name="heart" size={12} /> Ghi sinh hiệu
          </button>
          <button type="button" className="ab-btn primary" onClick={() => setDischargeOpen('discharge')}>
            <Ico name="check" size={12} /> Cho về
          </button>
          <button type="button" className="ab-btn" onClick={() => setDischargeOpen('escalate')}>
            <Ico name="send" size={12} /> Chuyển NV
          </button>
        </> : <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>}
      >
        {detail && <>
          <DrSec title="Phiên lưu">
            <DrField lbl="Mã phiên"><span style={{ fontFamily: 'var(--font-mono)' }}>{detail.stayCode}</span></DrField>
            <DrField lbl="Bệnh nhân">{detail.patientName} · {detail.patientCode}</DrField>
            <DrField lbl="Khoa">{detail.departmentName || '—'}</DrField>
            <DrField lbl="Phòng">{detail.roomName || '—'}</DrField>
            <DrField lbl="Vào lúc">{dayjs(detail.admittedAt).format('DD/MM/YYYY HH:mm')}</DrField>
            {detail.dischargedAt && <DrField lbl="Ra lúc">{dayjs(detail.dischargedAt).format('DD/MM/YYYY HH:mm')}</DrField>}
            <DrField lbl="Trạng thái">
              <StatusBadge tone={detail.status === 1 ? 'warn' : 'ok'} dot>{STATUS_LABEL[detail.status]}</StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Lâm sàng">
            <DrField lbl="Lý do vào lưu">{detail.chiefComplaint || '—'}</DrField>
            <DrField lbl="Chẩn đoán sơ bộ">{detail.initialDiagnosis || '—'}</DrField>
            {detail.finalDiagnosis && <DrField lbl="Chẩn đoán kết thúc">{detail.finalDiagnosis}</DrField>}
          </DrSec>
          <DrSec title={`Sinh hiệu (${vitals.length} lần)`}>
            {vitals.length === 0 ? (
              <div style={{ color: 'var(--t-2)', fontSize: 12 }}>Chưa có bản ghi sinh hiệu</div>
            ) : vitals.map((v) => (
              <div key={v.id} style={{ marginBottom: 8, padding: 10, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12 }}>
                  {dayjs(v.recordedAt).format('DD/MM HH:mm')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {v.temperature != null && <StatusBadge tone="info">T° {v.temperature}</StatusBadge>}
                  {v.heartRate != null && <StatusBadge tone="info">HR {v.heartRate}</StatusBadge>}
                  {v.respirationRate != null && <StatusBadge tone="info">RR {v.respirationRate}</StatusBadge>}
                  {v.bloodPressure && <StatusBadge tone="info">BP {v.bloodPressure}</StatusBadge>}
                  {v.spO2 != null && <StatusBadge tone="info">SpO₂ {v.spO2}%</StatusBadge>}
                  {v.consciousness != null && <StatusBadge tone="info">GCS {v.consciousness}</StatusBadge>}
                </div>
                {v.nurseNote && <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 4 }}>ĐD: {v.nurseNote}</div>}
                {v.doctorNote && <div style={{ fontSize: 11, color: 'var(--t-2)' }}>BS: {v.doctorNote}</div>}
              </div>
            ))}
          </DrSec>
        </>}
      </DrawerShell>

      <Modal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        title="Tiếp nhận vào phòng lưu"
        onOk={createStay}
        okText="Tạo phiên"
        cancelText="Hủy"
        width={640}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item label="Bệnh nhân" name="patientId" rules={[{ required: true }]}>
            <Select showSearch filterOption={false} placeholder="Tìm theo mã BN, họ tên, CCCD, SĐT…"
              options={patientOptions} onSearch={searchPatient} />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item label="Khoa" name="departmentId">
              <Select allowClear showSearch optionFilterProp="label"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                options={departments.map((d: any) => ({ label: d.departmentName, value: d.id }))} />
            </Form.Item>
            <Form.Item label="Phòng" name="roomId">
              <Select allowClear showSearch optionFilterProp="label"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                options={rooms.map((r: any) => ({ label: `${r.roomCode} — ${r.roomName}`, value: r.id }))} />
            </Form.Item>
          </div>
          <Form.Item label="Lý do vào lưu" name="chiefComplaint" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Chẩn đoán sơ bộ" name="initialDiagnosis"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label="Ghi chú" name="notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <ModalShell
        open={vitalOpen}
        onClose={() => setVitalOpen(false)}
        size="md"
        title="Ghi sinh hiệu"
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setVitalOpen(false)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submitVital}>
            <Ico name="check" size={12} /> Lưu
          </button>
        </>}
      >
        <Form form={vitalForm} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item label="Nhiệt độ (°C)" name="temperature"><InputNumber step={0.1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="Mạch (l/p)" name="heartRate"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="Thở (l/p)" name="respirationRate"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="Huyết áp" name="bloodPressure"><Input placeholder="120/80" /></Form.Item>
            <Form.Item label="SpO₂ (%)" name="spO2"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="GCS" name="consciousness"><InputNumber min={3} max={15} style={{ width: '100%' }} /></Form.Item>
          </div>
          <Form.Item label="Ghi chú điều dưỡng" name="nurseNote"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label="Ghi chú BS" name="doctorNote"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </ModalShell>

      <ModalShell
        open={!!dischargeOpen}
        onClose={() => setDischargeOpen(null)}
        size="md"
        title={dischargeOpen === 'discharge' ? 'Cho về' : 'Chuyển nhập viện'}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setDischargeOpen(null)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submitDischarge}>
            <Ico name="check" size={12} /> Xác nhận
          </button>
        </>}
      >
        <Form form={dischargeForm} layout="vertical">
          <Form.Item label="Chẩn đoán kết thúc" name="finalDiagnosis" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Lý do" name="dischargeReason"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label="Ghi chú" name="notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default ObservationStayV2;
