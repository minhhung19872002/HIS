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
import { ModalShell, DataTable, ActBtn, Btn, type ColumnDef } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { Field } from '../../../components/form/Field';
import { useModalForm } from '../../../hooks/useModalForm';

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

  const apgarMsg = (label: string) => (v: unknown) =>
    (typeof v === 'number' && (v < 0 || v > 10)) ? `${label} phải từ 0 đến 10` : undefined;

  const nbForm = useModalForm({
    birthDate: { required: true, message: 'Chưa nhập ngày sinh' },
    birthWeight: { validate: (v) => (typeof v === 'number' && v <= 0) ? 'Cân nặng phải lớn hơn 0 gram' : undefined },
    apgarScore1Min: { validate: apgarMsg('APGAR 1 phút') },
    apgarScore5Min: { validate: apgarMsg('APGAR 5 phút') },
    apgarScore10Min: { validate: apgarMsg('APGAR 10 phút') },
  }, modalOpen);

  // Load records
  const load = () => {
    setLoading(true);
    getNewborns(admissionId)
      .then((res) => setRecords(res.data ?? []))
      .catch((e) => { message.warning(friendlyErrorMessage(e, 'Không tải được danh sách trẻ sơ sinh.')); setRecords([]); })
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
    if (saving) return;
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
      message.error(friendlyErrorMessage(e, 'Lưu hồ sơ trẻ sơ sinh thất bại. Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  // Discharge newborn
  const handleDischarge = async () => {
    if (!dcTarget || dcSaving) return;
    setDcSaving(true);
    try {
      await dischargeNewborn(dcTarget.id, dcDate);
      message.success('Xuat tre so sinh thanh cong.');
      setDcTarget(null);
      load();
    } catch (e: unknown) {
      message.error(friendlyErrorMessage(e, 'Xuất trẻ sơ sinh thất bại. Vui lòng thử lại.'));
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
        loading={loading}
        empty={'Chua co ho so tre so sinh'}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="edit" title="Sua" onClick={() => openEdit(r)} />
            {r.status !== 2 && (
              <ActBtn
                ic="logout"
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
            <Btn
              variant="primary"
              loading={saving}
              onClick={() => {
                if (nbForm.validate({
                  birthDate: form.birthDate,
                  birthWeight: form.birthWeight,
                  apgarScore1Min: form.apgarScore1Min,
                  apgarScore5Min: form.apgarScore5Min,
                  apgarScore10Min: form.apgarScore10Min,
                })) void handleSave();
              }}
            >
              Luu
            </Btn>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 18px', padding: '4px 0' }}>
          <Field label="Ngay sinh" required error={nbForm.errors.birthDate}>
            <DatePicker
              style={{ width: '100%' }}
              value={form.birthDate ? dayjs(form.birthDate) : null}
              onChange={(d) => { patchForm('birthDate', d ? d.format('YYYY-MM-DD') : ''); nbForm.clear('birthDate'); }}
              format="DD/MM/YYYY"
            />
          </Field>

          <Field label="Gio sinh (HH:MM)">
            <Input
              value={form.birthTime.slice(0, 5)}
              onChange={(e) => patchForm('birthTime', e.target.value + ':00')}
              placeholder="07:30"
              maxLength={5}
            />
          </Field>

          <Field label="Gioi tinh" required>
            <Select
              style={{ width: '100%' }}
              options={GENDER_OPTS}
              value={form.gender}
              onChange={(v) => patchForm('gender', v)}
            />
          </Field>

          <Field label="Phuong phap de">
            <Select
              style={{ width: '100%' }}
              options={DELIVERY_OPTS}
              value={form.deliveryMethod || undefined}
              onChange={(v) => patchForm('deliveryMethod', v)}
              allowClear
              placeholder="Chon phuong phap..."
            />
          </Field>

          <Field label="Can nang (gram)" required error={nbForm.errors.birthWeight}>
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={9999}
              value={form.birthWeight}
              onChange={(v) => { patchForm('birthWeight', v ?? 0); nbForm.clear('birthWeight'); }}
            />
          </Field>

          <Field label="Chieu dai (cm)">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              value={form.birthLength}
              onChange={(v) => patchForm('birthLength', v ?? 0)}
            />
          </Field>

          <Field label="Vong dau (cm)">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              value={form.headCircumference}
              onChange={(v) => patchForm('headCircumference', v ?? 0)}
            />
          </Field>

          <Field label="APGAR 1 phut (0-10)" required error={nbForm.errors.apgarScore1Min}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={10}
              value={form.apgarScore1Min}
              onChange={(v) => { patchForm('apgarScore1Min', v ?? 0); nbForm.clear('apgarScore1Min'); }}
            />
          </Field>

          <Field label="APGAR 5 phut (0-10)" required error={nbForm.errors.apgarScore5Min}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={10}
              value={form.apgarScore5Min}
              onChange={(v) => { patchForm('apgarScore5Min', v ?? 0); nbForm.clear('apgarScore5Min'); }}
            />
          </Field>

          <Field label="APGAR 10 phut (0-10)" error={nbForm.errors.apgarScore10Min}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={10}
              value={form.apgarScore10Min}
              onChange={(v) => { patchForm('apgarScore10Min', v ?? undefined); nbForm.clear('apgarScore10Min'); }}
            />
          </Field>

          <Field label="Vitamin K" style={{ gridColumn: '1 / -1' }}>
            <Input
              value={form.vitaminKGiven}
              onChange={(e) => patchForm('vitaminKGiven', e.target.value)}
              placeholder="Da tiem / Chua tiem / Lieu luong..."
            />
          </Field>

          <Field label="Vaccine Viem gan B" style={{ gridColumn: '1 / -1' }}>
            <Input
              value={form.hepBVaccine}
              onChange={(e) => patchForm('hepBVaccine', e.target.value)}
              placeholder="Da tiem / Chua tiem / Lot so..."
            />
          </Field>

          <Field label="Bien chung" style={{ gridColumn: '1 / -1' }}>
            <Input.TextArea
              rows={2}
              value={form.complications}
              onChange={(e) => patchForm('complications', e.target.value)}
              placeholder="Bien chung neu co..."
            />
          </Field>

          <Field label="Ket qua kham ban dau" style={{ gridColumn: '1 / -1' }}>
            <Input.TextArea
              rows={3}
              value={form.initialExamFindings}
              onChange={(e) => patchForm('initialExamFindings', e.target.value)}
              placeholder="Ghi nhan kham lan dau..."
            />
          </Field>
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
            <Btn variant="primary" onClick={handleDischarge} disabled={dcSaving}>
              {dcSaving ? 'Dang xuat...' : 'Xac nhan xuat'}
            </Btn>
          </>
        }
      >
        <div style={{ padding: '8px 0' }}>
          <Field label="Ngay xuat" required>
            <DatePicker
              style={{ width: '100%' }}
              value={dcDate ? dayjs(dcDate) : null}
              onChange={(d) => setDcDate(d ? d.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'))}
              format="DD/MM/YYYY"
            />
          </Field>
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
