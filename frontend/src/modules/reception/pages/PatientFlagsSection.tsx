import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Select, Input, DatePicker } from 'antd';
import { ModalShell, tk, te, cf } from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import {
  getPatientFlags, savePatientFlag, deletePatientFlag, PATIENT_FLAG_TYPES,
  type PatientFlagDto,
} from '../../patient/api/patientFlag';

/* ────────────────────────────────────────────────────────────
   Cờ cảnh báo bệnh nhân (PatientFlag) — CRUD ngay trong tiếp đón.
   Nguồn: api/patientFlag.ts (PatientFlagController CRUD đầy đủ).
   Khác PatientWarnings (read-only, suy ra từ nợ phí/dị ứng): đây là cờ
   cảnh báo do nhân viên tự đặt — thêm / sửa / xoá tại quầy tiếp đón.
   ──────────────────────────────────────────────────────────── */

const FLAG_COLOR_OPTIONS = [
  { value: 'red', label: 'Đỏ (nghiêm trọng)' },
  { value: 'volcano', label: 'Cam (cảnh giác)' },
  { value: 'gold', label: 'Vàng (lưu ý)' },
  { value: 'blue', label: 'Xanh (thông tin)' },
  { value: 'purple', label: 'Tím (VIP)' },
];

// Map tên màu antd → hex để tô chip trong giao diện terminal v2.
const FLAG_COLOR_HEX: Record<string, string> = {
  red: 'var(--s-crit)', volcano: '#ea580c', gold: 'var(--s-warn)', blue: 'var(--a-cy)', purple: 'var(--s-mag)',
};

interface FlagFormState {
  id?: string;
  flagType: number;
  color: string;
  note: string;
  expiresAt?: dayjs.Dayjs | null;
}

const EMPTY_FLAG_FORM: FlagFormState = { flagType: 1, color: 'red', note: '', expiresAt: null };

export const PatientFlagsSection: React.FC<{ patientId?: string }> = ({ patientId }) => {
  const [flags, setFlags] = useState<PatientFlagDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FlagFormState>(EMPTY_FLAG_FORM);

  const load = useCallback(async () => {
    if (!patientId) { setFlags([]); return; }
    setLoading(true); setErr(false);
    try {
      const list = await getPatientFlags(patientId);
      setFlags(Array.isArray(list) ? list : []);
    } catch {
      setErr(true); setFlags([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  if (!patientId) return null;

  const openNew = () => { setForm(EMPTY_FLAG_FORM); setModalOpen(true); };
  const openEdit = (f: PatientFlagDto) => {
    setForm({
      id: f.id, flagType: f.flagType, color: f.color || 'red', note: f.note || '',
      expiresAt: f.expiresAt ? dayjs(f.expiresAt) : null,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.note.trim()) { te('Nhập ghi chú cảnh báo'); return; }
    setSaving(true);
    try {
      await savePatientFlag({
        id: form.id,
        patientId,
        flagType: form.flagType,
        color: form.color,
        note: form.note.trim(),
        expiresAt: form.expiresAt ? form.expiresAt.toISOString() : undefined,
      });
      tk(form.id ? 'Đã cập nhật cảnh báo' : 'Đã thêm cảnh báo');
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      te(ax?.response?.data?.message || 'Lưu cảnh báo thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (f: PatientFlagDto) => {
    cf(`Xoá cảnh báo "${f.flagTypeName}"?`, () => {
      void (async () => {
        try {
          await deletePatientFlag(f.id);
          tk('Đã xoá cảnh báo');
          load();
        } catch {
          te('Xoá cảnh báo thất bại');
        }
      })();
    }, { tone: 'crit', confirm: 'Xoá' });
  };

  return (
    <div className="rec-section">
      <h5 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
        <TermIcon name="alert" size={11} /> CỜ CẢNH BÁO BỆNH NHÂN
        {flags.length > 0 && <i>{flags.length}</i>}
        <button
          type="button"
          className="ab-btn ghost sm"
          style={{ marginLeft: 'auto' }}
          onClick={openNew}
        >
          <TermIcon name="plus" size={11} /> Thêm
        </button>
      </h5>

      {loading && <div style={{ fontSize: 11.5, color: 'var(--t-2)' }}>Đang tải cảnh báo…</div>}
      {err && <div style={{ fontSize: 11.5, color: 'var(--s-crit)' }}>Không tải được cảnh báo (lỗi kết nối).</div>}
      {!loading && !err && flags.length === 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--t-2)' }}>Chưa có cờ cảnh báo nào cho bệnh nhân này.</div>
      )}

      {!loading && flags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {flags.map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 'var(--space-8)', padding: '6px 8px',
                border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
                borderLeft: `3px solid ${FLAG_COLOR_HEX[f.color] || 'var(--s-crit)'}`,
              }}
            >
              <span
                style={{
                  fontSize: 'var(--fs-xs)', fontWeight: 700, color: FLAG_COLOR_HEX[f.color] || 'var(--s-crit)',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.flagTypeName}
              </span>
              <span style={{ flex: 1, fontSize: 11.5, color: 'var(--t-1)' }}>
                {f.note}
                {f.expiresAt && (
                  <i style={{ color: 'var(--t-2)', marginLeft: 'var(--space-6)' }}>
                    · đến {dayjs(f.expiresAt).format('DD/MM/YYYY')}
                  </i>
                )}
              </span>
              <button type="button" className="ab-iconbtn" title="Sửa" onClick={() => openEdit(f)}>
                <TermIcon name="edit" size={12} />
              </button>
              <button
                type="button" className="ab-iconbtn" title="Xoá"
                style={{ color: 'var(--s-crit)' }}
                onClick={() => handleDelete(f)}
              >
                <TermIcon name="trash" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="md"
        title={form.id ? 'Sửa cảnh báo bệnh nhân' : 'Thêm cảnh báo bệnh nhân'}
        footer={
          <>
            <button type="button" className="ab-btn" onClick={() => setModalOpen(false)}>Huỷ</button>
            <span style={{ flex: 1 }} />
            <button type="button" className="ab-btn primary" disabled={saving} onClick={handleSave}>
              <TermIcon name="check" size={12} /> {saving ? 'Đang lưu…' : 'Lưu'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Loại cảnh báo</div>
            <Select
              style={{ width: '100%' }}
              value={form.flagType}
              onChange={(val) => setForm((s) => ({ ...s, flagType: val }))}
              options={Object.entries(PATIENT_FLAG_TYPES).map(([k, v]) => ({ value: Number(k), label: v }))}
            />
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Mức độ (màu)</div>
            <Select
              style={{ width: '100%' }}
              value={form.color}
              onChange={(val) => setForm((s) => ({ ...s, color: val }))}
              options={FLAG_COLOR_OPTIONS}
            />
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>
              Ghi chú <span style={{ color: 'var(--s-crit)' }}>*</span>
            </div>
            <Input.TextArea
              rows={3}
              value={form.note}
              onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
              placeholder="Chi tiết cảnh báo…"
            />
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Hết hiệu lực (tùy chọn)</div>
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              value={form.expiresAt ?? null}
              onChange={(d) => setForm((s) => ({ ...s, expiresAt: d }))}
            />
          </div>
        </div>
      </ModalShell>
    </div>
  );
};
