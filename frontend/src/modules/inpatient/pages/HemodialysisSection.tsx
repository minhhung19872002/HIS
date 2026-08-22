/**
 * Chay than nhan tao noi tru (#148 F1.7) — Phieu theo doi tung buoi loc mau.
 * List buoi loc theo admission + form tao/sua + nut In phieu + Xoa.
 * API: createHemodialysis / getHemodialysisSessions / updateHemodialysis / deleteHemodialysis (inpatient.ts)
 */
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, DatePicker, InputNumber, Input } from 'antd';
import {
  createHemodialysis,
  getHemodialysisSessions,
  updateHemodialysis,
  deleteHemodialysis,
  type HemodialysisSessionDto,
} from '../api/inpatient';
import { ModalShell, DataTable, Btn, type ColumnDef } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { RowActions } from '../../../components/actions';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { printHemodialysisSheet, type HemodialysisPrintHeader } from '../../patient/components/HemodialysisSheetPrint';
import { Field } from '../../../components/form/Field';
import { useModalForm } from '../../../hooks/useModalForm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtDate = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '-');
const fmtTime = (t?: string) => (t ? t.slice(0, 5) : '-');

type FormState = {
  sessionDate: string;
  startTime: string;
  endTime: string;
  sessionNumber: number;
  weightPre: number;
  weightPost: number;
  pulse: number;
  bloodPressureLying: string;
  bloodPressureStanding: string;
  temperature: number;
  respiratoryRate: number;
  bloodFlowRate: number;
  arterialPressure: number | undefined;
  venousPressure: number | undefined;
  tmp: number;
  replacementFluid: number;
  dialyzerType: string;
  medications: string;
  complications: string;
  notes: string;
};

const BLANK_FORM: FormState = {
  sessionDate: dayjs().format('YYYY-MM-DD'),
  startTime: dayjs().format('HH:mm:ss'),
  endTime: '',
  sessionNumber: 1,
  weightPre: 0,
  weightPost: 0,
  pulse: 0,
  bloodPressureLying: '',
  bloodPressureStanding: '',
  temperature: 0,
  respiratoryRate: 0,
  bloodFlowRate: 0,
  arterialPressure: undefined,
  venousPressure: undefined,
  tmp: 0,
  replacementFluid: 0,
  dialyzerType: '',
  medications: '',
  complications: '',
  notes: '',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface HemodialysisSectionProps {
  admissionId: string;
  header?: HemodialysisPrintHeader;
}

const HemodialysisSection: React.FC<HemodialysisSectionProps> = ({ admissionId, header }) => {
  const { message, modal } = AntdApp.useApp();
  const [records, setRecords]     = useState<HemodialysisSessionDto[]>([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<HemodialysisSessionDto | null>(null);
  const [form, setForm]           = useState<FormState>(BLANK_FORM);
  const [saving, setSaving]       = useState(false);

  const nonNegativeMsg = (label: string) => (v: unknown) =>
    (typeof v === 'number' && v < 0) ? `${label} không được âm` : undefined;

  const hdForm = useModalForm({
    sessionDate: { required: true, message: 'Chưa nhập ngày lọc' },
    weightPre: { validate: nonNegativeMsg('Cân nặng') },
    weightPost: { validate: nonNegativeMsg('Cân nặng') },
    pulse: { validate: nonNegativeMsg('Mạch') },
    respiratoryRate: { validate: nonNegativeMsg('Nhịp thở') },
    bloodFlowRate: { validate: nonNegativeMsg('Tốc độ máu') },
  }, modalOpen);

  const load = () => {
    setLoading(true);
    getHemodialysisSessions(admissionId)
      .then((res) => setRecords(res.data ?? []))
      .catch((e) => { message.warning(friendlyErrorMessage(e, 'Không tải được danh sách buổi lọc máu.')); setRecords([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [admissionId]);

  const openCreate = () => {
    setEditing(null);
    // goi y so buoi tiep theo
    const nextNo = records.length > 0 ? Math.max(...records.map((r) => r.sessionNumber || 0)) + 1 : 1;
    setForm({ ...BLANK_FORM, sessionNumber: nextNo });
    setModalOpen(true);
  };

  const openEdit = (r: HemodialysisSessionDto) => {
    setEditing(r);
    setForm({
      sessionDate:           dayjs(r.sessionDate).format('YYYY-MM-DD'),
      startTime:             r.startTime.slice(0, 8),
      endTime:               r.endTime ? r.endTime.slice(0, 8) : '',
      sessionNumber:         r.sessionNumber,
      weightPre:             r.weightPre,
      weightPost:            r.weightPost,
      pulse:                 r.pulse,
      bloodPressureLying:    r.bloodPressureLying ?? '',
      bloodPressureStanding: r.bloodPressureStanding ?? '',
      temperature:           r.temperature,
      respiratoryRate:       r.respiratoryRate,
      bloodFlowRate:         r.bloodFlowRate,
      arterialPressure:      r.arterialPressure,
      venousPressure:        r.venousPressure,
      tmp:                   r.tmp,
      replacementFluid:      r.replacementFluid,
      dialyzerType:          r.dialyzerType ?? '',
      medications:           r.medications ?? '',
      complications:         r.complications ?? '',
      notes:                 r.notes ?? '',
    });
    setModalOpen(true);
  };

  const patchForm = (key: keyof FormState, val: unknown) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (saving) return;
    const payload = {
      ...form,
      endTime: form.endTime || undefined,
      arterialPressure: form.arterialPressure,
      venousPressure: form.venousPressure,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateHemodialysis(editing.id, { ...editing, ...payload } as HemodialysisSessionDto);
        message.success('Cap nhat phieu chay than thanh cong.');
      } else {
        await createHemodialysis(admissionId, payload as Omit<HemodialysisSessionDto, 'id' | 'admissionId'>);
        message.success('Tao phieu chay than thanh cong.');
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      message.error(friendlyErrorMessage(e, 'Lưu phiếu chạy thận thất bại. Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (r: HemodialysisSessionDto) => {
    modal.confirm({
      title: 'Xoa phieu chay than',
      content: `Xoa phieu buoi loc so ${r.sessionNumber} ngay ${fmtDate(r.sessionDate)}?`,
      okText: 'Xoa',
      okType: 'danger',
      cancelText: 'Huy',
      onOk: async () => {
        try {
          await deleteHemodialysis(r.id);
          message.success('Da xoa phieu chay than.');
          load();
        } catch {
          message.error('Xoa that bai.');
        }
      },
    });
  };

  const handlePrint = (r: HemodialysisSessionDto) => {
    const ok = printHemodialysisSheet(r, header ?? {});
    if (!ok) message.warning('Trinh duyet chan popup in. Vui long cho phep popup.');
  };

  const COLS: ColumnDef<HemodialysisSessionDto>[] = [
    { key: 'no',       label: 'Buoi', render: (r) => r.sessionNumber },
    { key: 'date',     label: 'Ngay loc', render: (r) => <>{fmtDate(r.sessionDate)} {fmtTime(r.startTime)}</> },
    { key: 'weight',   label: 'CN truoc/sau (kg)', render: (r) => `${r.weightPre} / ${r.weightPost}` },
    { key: 'pulse',    label: 'Mach', render: (r) => r.pulse || '-' },
    { key: 'bp',       label: 'HA nam', render: (r) => r.bloodPressureLying || '-' },
    { key: 'bfr',      label: 'Toc do mau', render: (r) => r.bloodFlowRate || '-' },
    { key: 'compl',    label: 'Bien chung', render: (r) => r.complications || '-' },
  ];

  return (
    <div style={{ marginTop: 'var(--space-18)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-10)' }}>
        <h5 style={{ margin: 0, fontSize: 'var(--fs-sm)', fontWeight: 700, letterSpacing: 0.5, color: 'var(--t-1)' }}>
          <TermIcon name="activity" size={11} /> CHAY THAN NHAN TAO ({records.length})
        </h5>
        <Btn variant="primary" onClick={openCreate}>
          <TermIcon name="plus" size={11} /> Them buoi loc
        </Btn>
      </div>

      <DataTable<HemodialysisSessionDto>
        columns={COLS}
        data={records}
        rowKey={(r) => r.id}
        onRowClick={openEdit}
        loading={loading}
        empty={'Chua co buoi loc mau'}
        actions={(r) => (
          <div className="ab-actions">
            <RowActions actions={[
              { key: 'edit', icon: 'edit', label: 'Sửa phiếu chạy thận', primary: true, onClick: () => openEdit(r) },
              { key: 'print', icon: 'print', label: 'In phiếu chạy thận', onClick: () => handlePrint(r) },
              // handleDelete đã tự mở modal.confirm riêng → tắt confirm mặc định của RowActions.
              { key: 'del', icon: 'trash', label: 'Xóa phiếu', tone: 'danger', confirm: false,
                onClick: () => handleDelete(r) },
            ]} />
          </div>
        )}
      />

      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Cap nhat phieu chay than' : 'Them buoi chay than'}
        size="lg"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Huy</Btn>
            <Btn
              variant="primary"
              loading={saving}
              onClick={() => {
                if (hdForm.validate({
                  sessionDate: form.sessionDate,
                  weightPre: form.weightPre,
                  weightPost: form.weightPost,
                  pulse: form.pulse,
                  respiratoryRate: form.respiratoryRate,
                  bloodFlowRate: form.bloodFlowRate,
                })) void handleSave();
              }}
            >
              Luu
            </Btn>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 18px', padding: '4px 0' }}>
          <Field label="Ngay loc" required error={hdForm.errors.sessionDate}>
            <DatePicker
              style={{ width: '100%' }}
              value={form.sessionDate ? dayjs(form.sessionDate) : null}
              onChange={(d) => { patchForm('sessionDate', d ? d.format('YYYY-MM-DD') : ''); hdForm.clear('sessionDate'); }}
              format="DD/MM/YYYY"
            />
          </Field>

          <Field label="Buoi loc so">
            <InputNumber style={{ width: '100%' }} min={1} value={form.sessionNumber} onChange={(v) => patchForm('sessionNumber', v ?? 1)} />
          </Field>

          <Field label="Gio bat dau (HH:MM)">
            <Input value={form.startTime.slice(0, 5)} onChange={(e) => patchForm('startTime', e.target.value + ':00')} placeholder="08:00" maxLength={5} />
          </Field>

          <Field label="Gio ket thuc (HH:MM)">
            <Input value={form.endTime.slice(0, 5)} onChange={(e) => patchForm('endTime', e.target.value ? e.target.value + ':00' : '')} placeholder="12:00" maxLength={5} />
          </Field>

          <Field label="Can nang truoc loc (kg)" error={hdForm.errors.weightPre}>
            <InputNumber style={{ width: '100%' }} min={0} max={500} step={0.1} value={form.weightPre} onChange={(v) => { patchForm('weightPre', v ?? 0); hdForm.clear('weightPre'); }} />
          </Field>

          <Field label="Can nang sau loc (kg)" error={hdForm.errors.weightPost}>
            <InputNumber style={{ width: '100%' }} min={0} max={500} step={0.1} value={form.weightPost} onChange={(v) => { patchForm('weightPost', v ?? 0); hdForm.clear('weightPost'); }} />
          </Field>

          <Field label="Mach (lan/phut)" error={hdForm.errors.pulse}>
            <InputNumber style={{ width: '100%' }} min={0} max={300} value={form.pulse} onChange={(v) => { patchForm('pulse', v ?? 0); hdForm.clear('pulse'); }} />
          </Field>

          <Field label="Nhiet do (°C)">
            <InputNumber style={{ width: '100%' }} min={30} max={45} step={0.1} value={form.temperature} onChange={(v) => patchForm('temperature', v ?? 0)} />
          </Field>

          <Field label="Huyet ap nam (mmHg)">
            <Input value={form.bloodPressureLying} onChange={(e) => patchForm('bloodPressureLying', e.target.value)} placeholder="120/80" />
          </Field>

          <Field label="Huyet ap dung (mmHg)">
            <Input value={form.bloodPressureStanding} onChange={(e) => patchForm('bloodPressureStanding', e.target.value)} placeholder="120/80" />
          </Field>

          <Field label="Nhip tho (lan/phut)" error={hdForm.errors.respiratoryRate}>
            <InputNumber style={{ width: '100%' }} min={0} max={100} value={form.respiratoryRate} onChange={(v) => { patchForm('respiratoryRate', v ?? 0); hdForm.clear('respiratoryRate'); }} />
          </Field>

          <Field label="Toc do mau (ml/phut)" error={hdForm.errors.bloodFlowRate}>
            <InputNumber style={{ width: '100%' }} min={0} max={600} value={form.bloodFlowRate} onChange={(v) => { patchForm('bloodFlowRate', v ?? 0); hdForm.clear('bloodFlowRate'); }} />
          </Field>

          <Field label="Ap luc dong mach (mmHg)">
            <InputNumber style={{ width: '100%' }} value={form.arterialPressure} onChange={(v) => patchForm('arterialPressure', v ?? undefined)} />
          </Field>

          <Field label="Ap luc tinh mach (mmHg)">
            <InputNumber style={{ width: '100%' }} value={form.venousPressure} onChange={(v) => patchForm('venousPressure', v ?? undefined)} />
          </Field>

          <Field label="PTM / TMP (mmHg)">
            <InputNumber style={{ width: '100%' }} min={0} step={0.1} value={form.tmp} onChange={(v) => patchForm('tmp', v ?? 0)} />
          </Field>

          <Field label="Tai dich (lit)">
            <InputNumber style={{ width: '100%' }} min={0} step={0.1} value={form.replacementFluid} onChange={(v) => patchForm('replacementFluid', v ?? 0)} />
          </Field>

          <Field label="Loai qua loc" style={{ gridColumn: '1 / -1' }}>
            <Input value={form.dialyzerType} onChange={(e) => patchForm('dialyzerType', e.target.value)} placeholder="VD: Low-flux F6, High-flux..." />
          </Field>

          <Field label="Thuoc su dung" style={{ gridColumn: '1 / -1' }}>
            <Input.TextArea rows={2} value={form.medications} onChange={(e) => patchForm('medications', e.target.value)} placeholder="Heparin, thuoc khac..." />
          </Field>

          <Field label="Bien chung" style={{ gridColumn: '1 / -1' }}>
            <Input.TextArea rows={2} value={form.complications} onChange={(e) => patchForm('complications', e.target.value)} placeholder="Tut HA, chuot rut, buon non..." />
          </Field>

          <Field label="Ghi chu" style={{ gridColumn: '1 / -1' }}>
            <Input.TextArea rows={2} value={form.notes} onChange={(e) => patchForm('notes', e.target.value)} />
          </Field>
        </div>
      </ModalShell>
    </div>
  );
};

export default HemodialysisSection;
