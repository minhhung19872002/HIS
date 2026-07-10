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
} from '../../api/inpatient';
import { ModalShell, DataTable, ActBtn, Btn, type ColumnDef } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
import { printHemodialysisSheet, type HemodialysisPrintHeader } from '../../modules/patient/components/HemodialysisSheetPrint';

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

function validateForm(f: FormState): string | null {
  if (!f.sessionDate) return 'Chua nhap ngay loc.';
  if (f.weightPre < 0 || f.weightPost < 0) return 'Can nang khong duoc am.';
  if (f.pulse < 0 || f.respiratoryRate < 0) return 'Mach / nhip tho khong duoc am.';
  if (f.bloodFlowRate < 0) return 'Toc do mau khong duoc am.';
  return null;
}

const IpFld: React.FC<{ label: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>{label}</div>
    {children}
  </div>
);

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

  const load = () => {
    setLoading(true);
    getHemodialysisSessions(admissionId)
      .then((res) => setRecords(res.data ?? []))
      .catch(() => setRecords([]))
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
    const err = validateForm(form);
    if (err) { message.error(err); return; }

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
      const msg = (e as { response?: { data?: string } })?.response?.data ?? 'Loi khong xac dinh.';
      message.error(msg);
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
        empty={loading ? 'Dang tai...' : 'Chua co buoi loc mau'}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="edit" title="Sua" onClick={() => openEdit(r)} />
            <ActBtn ic="print" title="In phieu" onClick={() => handlePrint(r)} />
            <ActBtn ic="trash" title="Xoa" onClick={() => handleDelete(r)} />
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
            <Btn variant="primary" onClick={handleSave}>
              {saving ? 'Dang luu...' : 'Luu'}
            </Btn>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px', padding: '4px 0' }}>
          <IpFld label="Ngay loc *">
            <DatePicker
              style={{ width: '100%' }}
              value={form.sessionDate ? dayjs(form.sessionDate) : null}
              onChange={(d) => patchForm('sessionDate', d ? d.format('YYYY-MM-DD') : '')}
              format="DD/MM/YYYY"
            />
          </IpFld>

          <IpFld label="Buoi loc so">
            <InputNumber style={{ width: '100%' }} min={1} value={form.sessionNumber} onChange={(v) => patchForm('sessionNumber', v ?? 1)} />
          </IpFld>

          <IpFld label="Gio bat dau (HH:MM)">
            <Input value={form.startTime.slice(0, 5)} onChange={(e) => patchForm('startTime', e.target.value + ':00')} placeholder="08:00" maxLength={5} />
          </IpFld>

          <IpFld label="Gio ket thuc (HH:MM)">
            <Input value={form.endTime.slice(0, 5)} onChange={(e) => patchForm('endTime', e.target.value ? e.target.value + ':00' : '')} placeholder="12:00" maxLength={5} />
          </IpFld>

          <IpFld label="Can nang truoc loc (kg)">
            <InputNumber style={{ width: '100%' }} min={0} max={500} step={0.1} value={form.weightPre} onChange={(v) => patchForm('weightPre', v ?? 0)} />
          </IpFld>

          <IpFld label="Can nang sau loc (kg)">
            <InputNumber style={{ width: '100%' }} min={0} max={500} step={0.1} value={form.weightPost} onChange={(v) => patchForm('weightPost', v ?? 0)} />
          </IpFld>

          <IpFld label="Mach (lan/phut)">
            <InputNumber style={{ width: '100%' }} min={0} max={300} value={form.pulse} onChange={(v) => patchForm('pulse', v ?? 0)} />
          </IpFld>

          <IpFld label="Nhiet do (°C)">
            <InputNumber style={{ width: '100%' }} min={30} max={45} step={0.1} value={form.temperature} onChange={(v) => patchForm('temperature', v ?? 0)} />
          </IpFld>

          <IpFld label="Huyet ap nam (mmHg)">
            <Input value={form.bloodPressureLying} onChange={(e) => patchForm('bloodPressureLying', e.target.value)} placeholder="120/80" />
          </IpFld>

          <IpFld label="Huyet ap dung (mmHg)">
            <Input value={form.bloodPressureStanding} onChange={(e) => patchForm('bloodPressureStanding', e.target.value)} placeholder="120/80" />
          </IpFld>

          <IpFld label="Nhip tho (lan/phut)">
            <InputNumber style={{ width: '100%' }} min={0} max={100} value={form.respiratoryRate} onChange={(v) => patchForm('respiratoryRate', v ?? 0)} />
          </IpFld>

          <IpFld label="Toc do mau (ml/phut)">
            <InputNumber style={{ width: '100%' }} min={0} max={600} value={form.bloodFlowRate} onChange={(v) => patchForm('bloodFlowRate', v ?? 0)} />
          </IpFld>

          <IpFld label="Ap luc dong mach (mmHg)">
            <InputNumber style={{ width: '100%' }} value={form.arterialPressure} onChange={(v) => patchForm('arterialPressure', v ?? undefined)} />
          </IpFld>

          <IpFld label="Ap luc tinh mach (mmHg)">
            <InputNumber style={{ width: '100%' }} value={form.venousPressure} onChange={(v) => patchForm('venousPressure', v ?? undefined)} />
          </IpFld>

          <IpFld label="PTM / TMP (mmHg)">
            <InputNumber style={{ width: '100%' }} min={0} step={0.1} value={form.tmp} onChange={(v) => patchForm('tmp', v ?? 0)} />
          </IpFld>

          <IpFld label="Tai dich (lit)">
            <InputNumber style={{ width: '100%' }} min={0} step={0.1} value={form.replacementFluid} onChange={(v) => patchForm('replacementFluid', v ?? 0)} />
          </IpFld>

          <IpFld label="Loai qua loc" full>
            <Input value={form.dialyzerType} onChange={(e) => patchForm('dialyzerType', e.target.value)} placeholder="VD: Low-flux F6, High-flux..." />
          </IpFld>

          <IpFld label="Thuoc su dung" full>
            <Input.TextArea rows={2} value={form.medications} onChange={(e) => patchForm('medications', e.target.value)} placeholder="Heparin, thuoc khac..." />
          </IpFld>

          <IpFld label="Bien chung" full>
            <Input.TextArea rows={2} value={form.complications} onChange={(e) => patchForm('complications', e.target.value)} placeholder="Tut HA, chuot rut, buon non..." />
          </IpFld>

          <IpFld label="Ghi chu" full>
            <Input.TextArea rows={2} value={form.notes} onChange={(e) => patchForm('notes', e.target.value)} />
          </IpFld>
        </div>
      </ModalShell>
    </div>
  );
};

export default HemodialysisSection;
