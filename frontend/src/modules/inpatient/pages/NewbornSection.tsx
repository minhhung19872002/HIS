/**
 * So sinh noi tru (#52/#53) — B1.6 Newborn tab
 * List tre so sinh theo admission me + form tao/sua + nut Xuat.
 * Validate APGAR 0-10 (ca 3 moc), can nang > 0 tren FE.
 * API: createNewborn / getNewborns / updateNewborn / dischargeNewborn (inpatient.ts)
 */
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, DatePicker, InputNumber, Select, Input } from 'antd';
import {
  createNewborn,
  getNewborns,
  updateNewborn,
  dischargeNewborn,
  type NewbornRecordDto,
} from '../api/inpatient';
import { ModalShell, DataTable, ActBtn, Btn, type ColumnDef } from '../../../pages-v2/_v2kit';
import TermIcon from '../../../layouts/terminal/Icon';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GENDER_OPTS = [
  { value: 1, label: 'Nam' },
  { value: 2, label: 'Nu' },
];

const DELIVERY_OPTS = [
  { value: 'Tu nhien', label: 'De thuong (tu nhien)' },
  { value: 'Mo', label: 'Mo lay thai (Caesarean)' },
  { value: 'Forceps', label: 'Forceps' },
  { value: 'Giac hut', label: 'Giac hut' },
];

const statusChip  = (s: number) => (s === 2 ? <span className="chip ok">Da xuat</span> : <span className="chip">Dang theo doi</span>);
const fmtDate     = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '-');
const fmtTime     = (t?: string)   => (t ? t.slice(0, 5) : '-');

// ---------------------------------------------------------------------------
// Blank form state
// ---------------------------------------------------------------------------

type FormState = {
  birthDate: string;
  birthTime: string;
  gender: number;
  birthWeight: number;
  birthLength: number;
  headCircumference: number;
  apgarScore1Min: number;
  apgarScore5Min: number;
  apgarScore10Min: number | undefined;
  deliveryMethod: string;
  complications: string;
  initialExamFindings: string;
  vitaminKGiven: string;
  hepBVaccine: string;
};

const BLANK_FORM: FormState = {
  birthDate: dayjs().format('YYYY-MM-DD'),
  birthTime: dayjs().format('HH:mm:ss'),
  gender: 1,
  birthWeight: 0,
  birthLength: 0,
  headCircumference: 0,
  apgarScore1Min: 0,
  apgarScore5Min: 0,
  apgarScore10Min: undefined,
  deliveryMethod: '',
  complications: '',
  initialExamFindings: '',
  vitaminKGiven: '',
  hepBVaccine: '',
};

function validateForm(f: FormState): string | null {
  if (!f.birthDate) return 'Chua nhap ngay sinh.';
  if (f.birthWeight <= 0) return 'Can nang phai lon hon 0 gram.';
  if (f.apgarScore1Min < 0 || f.apgarScore1Min > 10) return 'APGAR 1 phut phai tu 0 den 10.';
  if (f.apgarScore5Min < 0 || f.apgarScore5Min > 10) return 'APGAR 5 phut phai tu 0 den 10.';
  if (f.apgarScore10Min !== undefined && (f.apgarScore10Min < 0 || f.apgarScore10Min > 10))
    return 'APGAR 10 phut phai tu 0 den 10.';
  return null;
}

// ---------------------------------------------------------------------------
// IpFld helper (nhat quan voi TreatmentMonitorSection)
// ---------------------------------------------------------------------------

const IpFld: React.FC<{ label: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>{label}</div>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface NewbornSectionProps {
  admissionId: string; // MotherAdmissionId
}

const NewbornSection: React.FC<NewbornSectionProps> = ({ admissionId }) => {
  const { message } = AntdApp.useApp();
  const [records, setRecords]       = useState<NewbornRecordDto[]>([]);
  const [loading, setLoading]       = useState(false);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<NewbornRecordDto | null>(null);
  const [form, setForm]             = useState<FormState>(BLANK_FORM);
  const [saving, setSaving]         = useState(false);
  const [dcTarget, setDcTarget]     = useState<NewbornRecordDto | null>(null);
  const [dcDate, setDcDate]         = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [dcSaving, setDcSaving]     = useState(false);

  // Load records
  const load = () => {
    setLoading(true);
    getNewborns(admissionId)
      .then((res) => setRecords(res.data ?? []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [admissionId]);

  // Open create
  const openCreate = () => {
    setEditing(null);
    setForm(BLANK_FORM);
    setModalOpen(true);
  };

  // Open edit
  const openEdit = (r: NewbornRecordDto) => {
    setEditing(r);
    setForm({
      birthDate:           dayjs(r.birthDate).format('YYYY-MM-DD'),
      birthTime:           r.birthTime.slice(0, 8),
      gender:              r.gender,
      birthWeight:         r.birthWeight,
      birthLength:         r.birthLength,
      headCircumference:   r.headCircumference,
      apgarScore1Min:      r.apgarScore1Min,
      apgarScore5Min:      r.apgarScore5Min,
      apgarScore10Min:     r.apgarScore10Min,
      deliveryMethod:      r.deliveryMethod ?? '',
      complications:       r.complications ?? '',
      initialExamFindings: r.initialExamFindings ?? '',
      vitaminKGiven:       r.vitaminKGiven ?? '',
      hepBVaccine:         r.hepBVaccine ?? '',
    });
    setModalOpen(true);
  };

  const patchForm = (key: keyof FormState, val: unknown) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // Save
  const handleSave = async () => {
    const err = validateForm(form);
    if (err) { message.error(err); return; }

    setSaving(true);
    try {
      if (editing) {
        await updateNewborn(editing.id, {
          ...editing,
          ...form,
        } as NewbornRecordDto);
        message.success('Cap nhat ho so tre so sinh thanh cong.');
      } else {
        await createNewborn(admissionId, {
          ...form,
          newbornAdmissionId: undefined,
        } as Omit<NewbornRecordDto, 'id' | 'motherAdmissionId' | 'status' | 'dischargeDate'>);
        message.success('Tao ho so tre so sinh thanh cong.');
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

  // Discharge newborn
  const handleDischarge = async () => {
    if (!dcTarget) return;
    setDcSaving(true);
    try {
      await dischargeNewborn(dcTarget.id, dcDate);
      message.success('Xuat tre so sinh thanh cong.');
      setDcTarget(null);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: string } })?.response?.data ?? 'Loi khong xac dinh.';
      message.error(msg);
    } finally {
      setDcSaving(false);
    }
  };

  // Table columns
  const COLS: ColumnDef<NewbornRecordDto>[] = [
    { key: 'birthDate', label: 'Ngay sinh', render: (r) => <>{fmtDate(r.birthDate)} {fmtTime(r.birthTime)}</> },
    { key: 'gender',    label: 'Gioi tinh', render: (r) => r.gender === 1 ? 'Nam' : r.gender === 2 ? 'Nu' : '-' },
    { key: 'birthWeight', label: 'Can nang (g)', render: (r) => r.birthWeight?.toLocaleString('vi-VN') },
    { key: 'apgar',     label: 'APGAR 1\'/5\'', render: (r) => `${r.apgarScore1Min} / ${r.apgarScore5Min}` },
    { key: 'delivery',  label: 'Phuong phap', render: (r) => r.deliveryMethod || '-' },
    { key: 'status',    label: 'Trang thai', render: (r) => statusChip(r.status) },
    { key: 'dc',        label: 'Ngay xuat', render: (r) => r.dischargeDate ? fmtDate(r.dischargeDate) : '-' },
  ];

  return (
    <div style={{ marginTop: 'var(--space-18)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-10)' }}>
        <h5 style={{ margin: 0, fontSize: 'var(--fs-sm)', fontWeight: 700, letterSpacing: 0.5, color: 'var(--t-1)' }}>
          <TermIcon name="user" size={11} /> TRE SO SINH ({records.length})
        </h5>
        <Btn variant="primary" onClick={openCreate}>
          <TermIcon name="plus" size={11} /> Them tre so sinh
        </Btn>
      </div>

      {/* Table */}
      <DataTable<NewbornRecordDto>
        columns={COLS}
        data={records}
        rowKey={(r) => r.id}
        onRowClick={openEdit}
        empty={loading ? 'Dang tai...' : 'Chua co ho so tre so sinh'}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="edit" title="Sua" onClick={() => openEdit(r)} />
            {r.status !== 2 && (
              <ActBtn
                ic="log-out"
                title="Xuat"
                onClick={() => { setDcTarget(r); setDcDate(dayjs().format('YYYY-MM-DD')); }}
              />
            )}
          </div>
        )}
      />

      {/* Create / Edit modal */}
      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Cap nhat ho so tre so sinh' : 'Them tre so sinh'}
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
          <IpFld label="Ngay sinh *">
            <DatePicker
              style={{ width: '100%' }}
              value={form.birthDate ? dayjs(form.birthDate) : null}
              onChange={(d) => patchForm('birthDate', d ? d.format('YYYY-MM-DD') : '')}
              format="DD/MM/YYYY"
            />
          </IpFld>

          <IpFld label="Gio sinh (HH:MM)">
            <Input
              value={form.birthTime.slice(0, 5)}
              onChange={(e) => patchForm('birthTime', e.target.value + ':00')}
              placeholder="07:30"
              maxLength={5}
            />
          </IpFld>

          <IpFld label="Gioi tinh *">
            <Select
              style={{ width: '100%' }}
              options={GENDER_OPTS}
              value={form.gender}
              onChange={(v) => patchForm('gender', v)}
            />
          </IpFld>

          <IpFld label="Phuong phap de">
            <Select
              style={{ width: '100%' }}
              options={DELIVERY_OPTS}
              value={form.deliveryMethod || undefined}
              onChange={(v) => patchForm('deliveryMethod', v)}
              allowClear
              placeholder="Chon phuong phap..."
            />
          </IpFld>

          <IpFld label="Can nang (gram) *">
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={9999}
              value={form.birthWeight}
              onChange={(v) => patchForm('birthWeight', v ?? 0)}
            />
          </IpFld>

          <IpFld label="Chieu dai (cm)">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              value={form.birthLength}
              onChange={(v) => patchForm('birthLength', v ?? 0)}
            />
          </IpFld>

          <IpFld label="Vong dau (cm)">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              value={form.headCircumference}
              onChange={(v) => patchForm('headCircumference', v ?? 0)}
            />
          </IpFld>

          <IpFld label="APGAR 1 phut * (0-10)">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={10}
              value={form.apgarScore1Min}
              onChange={(v) => patchForm('apgarScore1Min', v ?? 0)}
            />
          </IpFld>

          <IpFld label="APGAR 5 phut * (0-10)">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={10}
              value={form.apgarScore5Min}
              onChange={(v) => patchForm('apgarScore5Min', v ?? 0)}
            />
          </IpFld>

          <IpFld label="APGAR 10 phut (0-10)">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={10}
              value={form.apgarScore10Min}
              onChange={(v) => patchForm('apgarScore10Min', v ?? undefined)}
            />
          </IpFld>

          <IpFld label="Vitamin K" full>
            <Input
              value={form.vitaminKGiven}
              onChange={(e) => patchForm('vitaminKGiven', e.target.value)}
              placeholder="Da tiem / Chua tiem / Lieu luong..."
            />
          </IpFld>

          <IpFld label="Vaccine Viem gan B" full>
            <Input
              value={form.hepBVaccine}
              onChange={(e) => patchForm('hepBVaccine', e.target.value)}
              placeholder="Da tiem / Chua tiem / Lot so..."
            />
          </IpFld>

          <IpFld label="Bien chung" full>
            <Input.TextArea
              rows={2}
              value={form.complications}
              onChange={(e) => patchForm('complications', e.target.value)}
              placeholder="Bien chung neu co..."
            />
          </IpFld>

          <IpFld label="Ket qua kham ban dau" full>
            <Input.TextArea
              rows={3}
              value={form.initialExamFindings}
              onChange={(e) => patchForm('initialExamFindings', e.target.value)}
              placeholder="Ghi nhan kham lan dau..."
            />
          </IpFld>
        </div>
      </ModalShell>

      {/* Discharge confirmation modal */}
      <ModalShell
        open={!!dcTarget}
        onClose={() => setDcTarget(null)}
        title="Xuat tre so sinh"
        size="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDcTarget(null)}>Huy</Btn>
            <Btn variant="primary" onClick={handleDischarge}>
              {dcSaving ? 'Dang xuat...' : 'Xac nhan xuat'}
            </Btn>
          </>
        }
      >
        <div style={{ padding: '8px 0' }}>
          <IpFld label="Ngay xuat *">
            <DatePicker
              style={{ width: '100%' }}
              value={dcDate ? dayjs(dcDate) : null}
              onChange={(d) => setDcDate(d ? d.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'))}
              format="DD/MM/YYYY"
            />
          </IpFld>
          {dcTarget && (
            <div style={{ marginTop: 'var(--space-12)', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
              Tre sinh ngay: {fmtDate(dcTarget.birthDate)} &bull; Can nang: {dcTarget.birthWeight}g
            </div>
          )}
        </div>
      </ModalShell>
    </div>
  );
};

export default NewbornSection;
