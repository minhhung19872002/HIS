import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { DatePicker, Form, Input, Select } from 'antd';
import {
  DataTable, DrawerShell, DrSec, DrField, ModalShell,
  Btn, ActBtn, tk, te,
  type ColumnDef,
} from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import {
  getNursingCareSheets, createNursingCareSheet,
  type NursingCareSheetDto, type CreateNursingCareSheetDto,
  type InpatientListDto,
} from '../api/inpatient';

/* ── Ghi chép điều dưỡng per-admission: list + create (theo hội chẩn pattern) ── */

const SHIFT_OPTS = [
  { value: 0, label: 'Sáng' },
  { value: 1, label: 'Chiều' },
  { value: 2, label: 'Tối' },
  { value: 3, label: 'Đêm' },
];

const COLS: ColumnDef<NursingCareSheetDto>[] = [
  { key: 'careDate',         label: 'Ngày chăm sóc', render: (r) => dayjs(r.careDate).format('DD/MM/YYYY') },
  { key: 'shiftName',        label: 'Ca',             render: (r) => r.shiftName || SHIFT_OPTS.find((s) => s.value === r.shift)?.label || `Ca ${r.shift}` },
  { key: 'nurseName',        label: 'Điều dưỡng',     render: (r) => r.nurseName },
  { key: 'patientCondition', label: 'Tình trạng BN',  render: (r) => r.patientCondition ? r.patientCondition.slice(0, 60) + (r.patientCondition.length > 60 ? '…' : '') : '—' },
  { key: 'issuesAndActions', label: 'Vấn đề / xử trí', render: (r) => r.issuesAndActions ? r.issuesAndActions.slice(0, 80) + (r.issuesAndActions.length > 80 ? '…' : '') : '—' },
  { key: 'createdAt',        label: 'Lúc ghi',        render: (r) => dayjs(r.createdAt).format('DD/MM/YYYY HH:mm'), mono: true },
];

const NursingSection: React.FC<{ inpatients: InpatientListDto[]; active: boolean }> = ({ inpatients, active }) => {
  const [selPatientId, setSelPatientId]   = useState<string>('');
  const [sheets, setSheets]               = useState<NursingCareSheetDto[]>([]);
  const [loading, setLoading]             = useState(false);
  const [dateRange, setDateRange]         = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [sel, setSel]                     = useState<NursingCareSheetDto | null>(null);
  const [createOpen, setCreateOpen]       = useState(false);
  const [saving, setSaving]               = useState(false);
  const [form]                            = Form.useForm();

  const selPatient = useMemo(
    () => inpatients.find((p) => p.admissionId === selPatientId) ?? null,
    [inpatients, selPatientId],
  );

  const patientOpts = useMemo(
    () => inpatients.map((p) => ({ value: p.admissionId, label: `${p.patientName} — ${p.bedName || p.roomName || p.patientCode}` })),
    [inpatients],
  );

  const load = useCallback(async (admId: string) => {
    if (!admId) { setSheets([]); return; }
    setLoading(true);
    try {
      const from = dateRange[0]?.startOf('day').toISOString();
      const to   = dateRange[1]?.endOf('day').toISOString();
      const r = await getNursingCareSheets(admId, from, to);
      setSheets(Array.isArray(r.data) ? r.data : []);
    } catch {
      setSheets([]);
      te('Không tải được phiếu điều dưỡng');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (active && selPatientId) void load(selPatientId);
    if (!active) setSheets([]);
  }, [active, selPatientId, load]);

  const handleCreate = async () => {
    if (!selPatientId) return;
    const vals = await form.validateFields();
    setSaving(true);
    try {
      const dto: CreateNursingCareSheetDto = {
        admissionId:        selPatientId,
        careDate:           (vals.careDate as dayjs.Dayjs).toISOString(),
        shift:              vals.shift as number,
        patientCondition:   vals.patientCondition || undefined,
        consciousness:      vals.consciousness || undefined,
        hygieneActivities:  vals.hygieneActivities || undefined,
        medicationActivities: vals.medicationActivities || undefined,
        nutritionActivities:  vals.nutritionActivities || undefined,
        movementActivities:   vals.movementActivities || undefined,
        specialMonitoring:    vals.specialMonitoring || undefined,
        issuesAndActions:     vals.issuesAndActions || undefined,
        notes:                vals.notes || undefined,
      };
      await createNursingCareSheet(dto);
      tk('Đã lưu phiếu điều dưỡng');
      setCreateOpen(false);
      form.resetFields();
      void load(selPatientId);
    } catch {
      te('Lưu phiếu thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Toolbar ── */}
      <div className="ab-tools">
        <Select
          showSearch
          allowClear
          placeholder="Chọn bệnh nhân…"
          style={{ minWidth: 280 }}
          value={selPatientId || undefined}
          onChange={(v) => { setSelPatientId(v ?? ''); setSheets([]); }}
          options={patientOpts}
          filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
          notFoundContent={<span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>Không có bệnh nhân nội trú</span>}
        />
        <DatePicker.RangePicker
          value={dateRange}
          onChange={(r) => setDateRange(r as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
          format="DD/MM/YYYY"
          placeholder={['Từ ngày', 'Đến ngày']}
          allowClear
        />
        <Btn variant="ghost" onClick={() => { if (selPatientId) void load(selPatientId); }}>
          <TermIcon name="refresh" size={12} /> Tải lại
        </Btn>
        <span className="spacer" />
        {selPatientId && (
          <Btn icon="plus" onClick={() => { form.resetFields(); form.setFieldValue('careDate', dayjs()); setCreateOpen(true); }}
            disabled={!selPatientId}>
            Ghi chép mới
          </Btn>
        )}
      </div>

      {/* ── Placeholder khi chưa chọn BN ── */}
      {!selPatientId && (
        <div className="ab-empty" style={{ flex: 1 }}>
          <TermIcon name="heart" size={24} />
          <div>Chọn bệnh nhân để xem phiếu điều dưỡng</div>
        </div>
      )}

      {/* ── Danh sách phiếu ── */}
      {selPatientId && (
        <div className="ab-stack" style={{ flex: 1 }}>
          <DataTable<NursingCareSheetDto>
            columns={COLS}
            data={sheets}
            rowKey={(r) => r.id}
            onRowClick={setSel}
            actions={(r) => <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />}
            empty={
              loading
                ? 'Đang tải…'
                : <div className="ab-empty">
                    <TermIcon name="file-text" size={20} />
                    <div>Chưa có phiếu điều dưỡng{selPatient ? ` cho ${selPatient.patientName}` : ''}</div>
                  </div>
            }
          />
        </div>
      )}

      {/* ── Detail DrawerShell ── */}
      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        title={sel ? `Phiếu điều dưỡng — ${dayjs(sel.careDate).format('DD/MM/YYYY')} (${sel.shiftName || SHIFT_OPTS.find((s) => s.value === sel.shift)?.label})` : ''}
        sub={sel?.nurseName}
        size="md"
      >
        {sel && (
          <>
            <DrSec title="Thông tin ca trực">
              <DrField lbl="Ngày chăm sóc">{dayjs(sel.careDate).format('DD/MM/YYYY')}</DrField>
              <DrField lbl="Ca trực">{sel.shiftName || SHIFT_OPTS.find((s) => s.value === sel.shift)?.label}</DrField>
              <DrField lbl="Điều dưỡng">{sel.nurseName}</DrField>
              <DrField lbl="Thời điểm ghi">{dayjs(sel.createdAt).format('DD/MM/YYYY HH:mm')}</DrField>
            </DrSec>
            <DrSec title="Đánh giá tình trạng bệnh nhân">
              <DrField lbl="Tình trạng chung">{sel.patientCondition || '—'}</DrField>
              <DrField lbl="Ý thức">{sel.consciousness || '—'}</DrField>
            </DrSec>
            <DrSec title="Hoạt động chăm sóc">
              <DrField lbl="Vệ sinh">{sel.hygieneActivities || '—'}</DrField>
              <DrField lbl="Dùng thuốc">{sel.medicationActivities || '—'}</DrField>
              <DrField lbl="Dinh dưỡng">{sel.nutritionActivities || '—'}</DrField>
              <DrField lbl="Vận động">{sel.movementActivities || '—'}</DrField>
            </DrSec>
            {(sel.specialMonitoring || sel.issuesAndActions || sel.notes) && (
              <DrSec title="Theo dõi & xử trí">
                {sel.specialMonitoring && <DrField lbl="Theo dõi đặc biệt">{sel.specialMonitoring}</DrField>}
                {sel.issuesAndActions && <DrField lbl="Vấn đề & xử trí">{sel.issuesAndActions}</DrField>}
                {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
              </DrSec>
            )}
          </>
        )}
      </DrawerShell>

      {/* ── Create ModalShell ── */}
      <ModalShell
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Ghi chép điều dưỡng mới"
        size="lg"
        footer={
          <>
            <Btn onClick={() => setCreateOpen(false)}>Hủy</Btn>
            <Btn icon="check" loading={saving} onClick={handleCreate}>Lưu phiếu</Btn>
          </>
        }
      >
        {selPatient && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--d-1)', borderRadius: 'var(--r-2)', fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>
            Bệnh nhân: <strong>{selPatient.patientName}</strong> — {selPatient.bedName || selPatient.roomName}
          </div>
        )}
        <Form form={form} layout="vertical" size="small">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="careDate" label="Ngày chăm sóc" rules={[{ required: true, message: 'Chọn ngày' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="shift" label="Ca trực" rules={[{ required: true, message: 'Chọn ca' }]}>
              <Select options={SHIFT_OPTS} placeholder="Chọn ca…" />
            </Form.Item>
          </div>
          <Form.Item name="patientCondition" label="Tình trạng chung bệnh nhân">
            <Input.TextArea rows={2} placeholder="Mô tả tình trạng chung…" />
          </Form.Item>
          <Form.Item name="consciousness" label="Ý thức">
            <Input placeholder="Tỉnh / lơ mơ / hôn mê…" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="hygieneActivities" label="Vệ sinh">
              <Input.TextArea rows={2} placeholder="Hoạt động vệ sinh…" />
            </Form.Item>
            <Form.Item name="medicationActivities" label="Dùng thuốc">
              <Input.TextArea rows={2} placeholder="Thuốc đã thực hiện…" />
            </Form.Item>
            <Form.Item name="nutritionActivities" label="Dinh dưỡng">
              <Input.TextArea rows={2} placeholder="Chế độ ăn, truyền dịch…" />
            </Form.Item>
            <Form.Item name="movementActivities" label="Vận động">
              <Input.TextArea rows={2} placeholder="Thay đổi tư thế, vật lý trị liệu…" />
            </Form.Item>
          </div>
          <Form.Item name="specialMonitoring" label="Theo dõi đặc biệt">
            <Input.TextArea rows={2} placeholder="Sinh hiệu, đường huyết, SpO2…" />
          </Form.Item>
          <Form.Item name="issuesAndActions" label="Vấn đề phát sinh & xử trí">
            <Input.TextArea rows={3} placeholder="Mô tả vấn đề và cách xử lý…" />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú thêm">
            <Input.TextArea rows={2} placeholder="Ghi chú cho ca sau…" />
          </Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default NursingSection;
