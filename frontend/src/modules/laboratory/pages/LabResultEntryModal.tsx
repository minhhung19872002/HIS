import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input, InputNumber } from 'antd';
import { ModalShell, Btn, StatusBadge } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import * as labApi from '../api/laboratory';
import type { LabRequest, TestParameter } from '../api/laboratory';
import { FLAG_COLOR } from './_shared';

/* ────────────────────────────────────────────────────────────
   Nhập kết quả xét nghiệm thủ công (port từ v1 pages/Laboratory.tsx —
   Result Entry Modal). Logic ngưỡng normal/high/low/critical + cảnh báo
   giá trị nguy hiểm giữ VERBATIM; UI dùng _v2kit ModalShell.
   ──────────────────────────────────────────────────────────── */

// v1 verbatim: xác định trạng thái chỉ số theo ngưỡng tham chiếu / nguy hiểm
const getParameterStatus = (param: TestParameter): 'normal' | 'high' | 'low' | 'critical' | null => {
  if (param.value === null || param.value === '') return null;

  const numValue = typeof param.value === 'number' ? param.value : parseFloat(param.value as string);
  if (isNaN(numValue)) return null;

  // != null guard cả null lẫn undefined — đồng nhất với buildParameters (API có thể
  // trả criticalLow: null; thiếu guard null thì 'numValue < null' coerce null→0 → mọi
  // giá trị âm bị flag critical/LL giả, vd Base Excess).
  if (param.criticalLow != null && numValue < param.criticalLow) return 'critical';
  if (param.criticalHigh != null && numValue > param.criticalHigh) return 'critical';
  if (param.normalMin != null && numValue < param.normalMin) return 'low';
  if (param.normalMax != null && numValue > param.normalMax) return 'high';

  return 'normal';
};

// Cờ HH/LL/H/L từ status (semantics như v1 printTemplates: critical trên
// criticalHigh → HH, còn lại → LL; high → H; low → L; normal → N).
const flagLabelFor = (param: TestParameter): '' | 'N' | 'H' | 'L' | 'HH' | 'LL' => {
  const status = getParameterStatus(param);
  if (!status) return '';
  if (status === 'critical') {
    const numValue = typeof param.value === 'number' ? param.value : parseFloat(param.value as string);
    return param.criticalHigh != null && numValue > param.criticalHigh ? 'HH' : 'LL';
  }
  return status === 'high' ? 'H' : status === 'low' ? 'L' : 'N';
};

// Nhãn + tone hiển thị trạng thái (text verbatim v1)
const STATUS_LABEL: Record<string, { text: string; tone: 'ok' | 'warn' | 'info' | 'crit' }> = {
  normal:   { text: 'Bình thường', tone: 'ok' },
  high:     { text: 'Cao',         tone: 'warn' },
  low:      { text: 'Thấp',        tone: 'info' },
  critical: { text: 'Nguy hiểm',   tone: 'crit' },
};

// v1 verbatim (handleEnterResults): build parameters từ tests của phiếu
const buildParameters = (record: LabRequest): TestParameter[] =>
  (record.tests || []).map((test) => {
    let status: 'normal' | 'high' | 'low' | 'critical' | null = null;
    const numValue = test.result ? parseFloat(test.result) : null;

    if (numValue !== null && !isNaN(numValue)) {
      if (test.criticalLow !== undefined && test.criticalLow !== null && numValue < test.criticalLow) {
        status = 'critical';
      } else if (test.criticalHigh !== undefined && test.criticalHigh !== null && numValue > test.criticalHigh) {
        status = 'critical';
      } else if (test.normalMin !== undefined && test.normalMin !== null && numValue < test.normalMin) {
        status = 'low';
      } else if (test.normalMax !== undefined && test.normalMax !== null && numValue > test.normalMax) {
        status = 'high';
      } else {
        status = 'normal';
      }
    }

    return {
      id: test.id,
      name: test.testName,
      value: test.result || null,
      unit: test.unit || '',
      referenceRange: test.referenceRange || '',
      normalMin: test.normalMin,
      normalMax: test.normalMax,
      criticalLow: test.criticalLow,
      criticalHigh: test.criticalHigh,
      status,
      inputType: 'number' as const,
    };
  });

const GRID_COLS = 'minmax(140px, 1.3fr) 130px 60px minmax(90px, 1fr) 96px 52px';

export const LabResultEntryModal: React.FC<{
  open: boolean;
  request: LabRequest | null;
  onClose: () => void;
  /** Gọi sau khi lưu thành công — parent reload danh sách. */
  onSaved: () => void;
}> = ({ open, request, onClose, onSaved }) => {
  const { message, modal } = AntdApp.useApp();
  const [parameters, setParameters] = useState<TestParameter[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && request) {
      setParameters(buildParameters(request));
      setNotes('');
    }
  }, [open, request]);

  // v1 verbatim: nhập giá trị → tính lại status theo ngưỡng
  const updateValue = (index: number, value: string | number | null) => {
    setParameters((prev) => {
      const newParams = [...prev];
      const updated = { ...newParams[index], value };
      updated.status = getParameterStatus(updated);
      newParams[index] = updated;
      return newParams;
    });
  };

  // v1 verbatim (handleSaveResults): lưu KQ + cảnh báo giá trị nguy hiểm
  const handleSave = async () => {
    if (!request) return;
    setSaving(true);
    try {
      await labApi.saveTestResults(request.id, { parameters, notes });

      const criticalParams = parameters.filter((p) => p.status === 'critical');
      if (criticalParams.length > 0) {
        modal.warning({
          title: 'Cảnh báo giá trị nguy hiểm',
          content: (
            <div>
              <p>Phát hiện các giá trị nguy hiểm:</p>
              <ul>
                {criticalParams.map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}</strong>: {p.value} {p.unit}
                  </li>
                ))}
              </ul>
              <p>Vui lòng thông báo ngay cho bác sĩ điều trị!</p>
            </div>
          ),
        });
      }

      message.success('Đã lưu kết quả xét nghiệm');
      onSaved();
    } catch {
      message.warning('Có lỗi xảy ra khi lưu kết quả. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      title="Nhập kết quả xét nghiệm"
      sub={request ? `${request.requestCode} · ${request.patientName}` : ''}
      size="lg"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
          <Btn variant="ghost" size="sm" disabled={saving} onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" size="sm" disabled={saving || parameters.length === 0} onClick={handleSave}>
            <TermIcon name="check" size={11} /> {saving ? 'Đang lưu…' : 'Lưu kết quả'}
          </Btn>
        </div>
      }
    >
      {request && (
        <div style={{ display: 'grid', gap: 'var(--space-10)' }}>
          {/* Thông tin phiếu */}
          <div className="rec-kv">
            <span>Mã phiếu</span><span className="mono ab-u-accent">{request.requestCode}</span>
            <span>Mã BN</span><span className="mono">{request.patientCode}</span>
            <span>Họ tên</span><b>{request.patientName}</b>
            <span>Ngày sinh</span>
            <span>{request.dateOfBirth ? dayjs(request.dateOfBirth).format('DD/MM/YYYY') : '—'}</span>
          </div>

          {/* Bảng nhập kết quả per-test */}
          <div>
            <div style={{
              display: 'grid', gridTemplateColumns: GRID_COLS, gap: 'var(--space-6)',
              fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase', fontWeight: 600,
              padding: '6px 0', borderBottom: '1px solid var(--line-soft)', letterSpacing: 0.4,
              alignItems: 'center',
            }}>
              <span>Chỉ số</span>
              <span>Giá trị</span>
              <span>Đơn vị</span>
              <span>Tham chiếu</span>
              <span>Trạng thái</span>
              <span style={{ textAlign: 'center' }}>Cờ</span>
            </div>
            {parameters.map((p, index) => {
              const flag = flagLabelFor(p);
              const color = FLAG_COLOR[flag];
              const st = p.status ? STATUS_LABEL[p.status] : null;
              return (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: GRID_COLS, gap: 'var(--space-6)',
                  padding: '6px 0', borderBottom: '1px solid var(--line-soft)',
                  fontSize: 12.5, alignItems: 'center',
                }}>
                  <span>{p.name}</span>
                  <span>
                    {p.inputType === 'number' ? (
                      <InputNumber
                        size="small"
                        value={p.value as number}
                        onChange={(value) => updateValue(index, value)}
                        style={{
                          width: '100%',
                          color: color || undefined,
                          fontWeight: p.status === 'critical' ? 'bold' : 'normal',
                        }}
                        placeholder="Nhập giá trị"
                      />
                    ) : (
                      <Input
                        size="small"
                        value={p.value as string}
                        onChange={(e) => updateValue(index, e.target.value)}
                        placeholder="Nhập kết quả"
                      />
                    )}
                  </span>
                  <span style={{ color: 'var(--t-2)' }}>{p.unit || '—'}</span>
                  <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                    {p.referenceRange || '—'}
                  </span>
                  <span>{st ? <StatusBadge tone={st.tone} dot>{st.text}</StatusBadge> : '—'}</span>
                  <span style={{ textAlign: 'center' }}>
                    {flag && flag !== 'N' && (
                      <span style={{
                        padding: '1px 6px', borderRadius: 'var(--r-1)',
                        background: color, color: '#fff', fontSize: 'var(--fs-xxs)', fontWeight: 700,
                      }}>{flag}</span>
                    )}
                  </span>
                </div>
              );
            })}
            {parameters.length === 0 && (
              <div style={{ padding: 'var(--space-10) 0', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
                Phiếu không có chỉ số xét nghiệm để nhập.
              </div>
            )}
          </div>

          {/* Ghi chú */}
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-4)' }}>Ghi chú</label>
            <textarea
              className="hui-inp"
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú về kết quả xét nghiệm (nếu có)"
            />
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--s-warn)', padding: '6px 8px', background: 'var(--d-1)', borderRadius: 4, borderLeft: '3px solid var(--s-warn)' }}>
            Hệ thống sẽ tự động kiểm tra và cảnh báo các giá trị bất thường khi lưu kết quả
          </div>
        </div>
      )}
    </ModalShell>
  );
};
