import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input } from 'antd';
import * as receptionApi from '../api/reception';
import { ModalShell } from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
// API trả PatientSearchResultDto (field gối nhau, có index signature) — đủ rộng cho UI lookup.
type LookupRow = receptionApi.PatientSearchResultDto;

export const PatientLookupModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onPick: (p: LookupRow) => void;
}> = ({ open, onClose, onPick }) => {
  const { message } = AntdApp.useApp();
  const [kw, setKw] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<LookupRow[]>([]);
  const [histOf, setHistOf] = useState<string | null>(null);
  const [hist, setHist] = useState<receptionApi.PatientVisitHistoryDto[]>([]);
  const [histBusy, setHistBusy] = useState(false);

  useEffect(() => {
    if (open) { setKw(''); setList([]); setHistOf(null); setHist([]); }
  }, [open]);

  // Lịch sử khám của 1 BN (toggle mở/đóng inline).
  const toggleHistory = async (pid: string) => {
    if (histOf === pid) { setHistOf(null); setHist([]); return; }
    setHistOf(pid); setHist([]); setHistBusy(true);
    try {
      const res = await receptionApi.getPatientVisitHistory(pid, 5);
      setHist(Array.isArray(res.data) ? res.data : []);
    } catch {
      message.error('Không tải được lịch sử khám');
    } finally {
      setHistBusy(false);
    }
  };

  const doSearch = async () => {
    if (!kw.trim()) { message.warning('Nhập tên / mã BN / SĐT / CCCD'); return; }
    setBusy(true);
    try {
      const res = await receptionApi.searchPatient(kw.trim());
      setList(Array.isArray(res.data) ? res.data : []);
    } catch {
      message.error('Tìm kiếm thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title="Tìm bệnh nhân cũ"
      footer={<button type="button" className="ab-btn ghost" onClick={onClose}>Đóng</button>}
    >
      <div style={{ padding: 0 }}>
        <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
          <Input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            onPressEnter={doSearch}
            placeholder="Tên, mã BN, SĐT, CCCD, số BHYT…"
            autoFocus
          />
          <button type="button" className="ab-btn primary" disabled={busy} onClick={doSearch}>
            <TermIcon name="search" size={12} /> {busy ? 'Đang tìm…' : 'Tìm'}
          </button>
        </div>

        <div style={{ marginTop: 'var(--space-14)', maxHeight: 360, overflow: 'auto' }}>
          {list.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
              {busy ? 'Đang tìm…' : 'Nhập từ khóa rồi bấm Tìm'}
            </div>
          ) : (
            list.map((p, i) => {
              const pid = p.patientId || p.id || '';
              const open2 = histOf === pid && !!pid;
              return (
              <React.Fragment key={pid || i}>
              <div
                style={{
                  padding: '10px 12px', borderBottom: open2 ? 'none' : '1px solid var(--line-soft)',
                  display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--space-10)', alignItems: 'center', cursor: 'pointer',
                }}
                onClick={() => onPick(p)}
              >
                <div>
                  <b>{p.fullName || p.patientName || '—'}</b>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                    <span className="mono">{p.patientCode || '—'}</span>
                    {p.phoneNumber ? ` · ${p.phoneNumber}` : ''}
                    {p.dateOfBirth ? ` · ${dayjs(p.dateOfBirth).format('DD/MM/YYYY')}` : (p.yearOfBirth ? ` · ${p.yearOfBirth}` : '')}
                    {p.insuranceNumber ? ` · BHYT ${p.insuranceNumber}` : ''}
                  </div>
                </div>
                <button type="button" className="ab-btn ghost" disabled={!pid}
                  onClick={(e) => { e.stopPropagation(); if (pid) toggleHistory(pid); }}>
                  <TermIcon name="file-text" size={12} /> {open2 ? 'Ẩn' : 'Lịch sử'}
                </button>
                <button type="button" className="ab-btn ghost" onClick={(e) => { e.stopPropagation(); onPick(p); }}>
                  Chọn
                </button>
              </div>
              {open2 && (
                <div style={{ padding: '8px 12px 12px', background: 'var(--d-1)', borderBottom: '1px solid var(--line-soft)' }}>
                  {histBusy ? (
                    <div style={{ fontSize: 11.5, color: 'var(--t-2)' }}>Đang tải lịch sử khám…</div>
                  ) : hist.length === 0 ? (
                    <div style={{ fontSize: 11.5, color: 'var(--t-2)' }}>Chưa có lần khám nào</div>
                  ) : (
                    hist.map((v) => (
                      <div key={v.medicalRecordId} style={{ display: 'grid', gridTemplateColumns: '92px 1fr auto', gap: 'var(--space-8)', padding: '4px 0', fontSize: 'var(--fs-sm)', borderTop: '1px dashed var(--line-soft)' }}>
                        <span className="mono" style={{ color: 'var(--a-cy)' }}>{dayjs(v.visitDate).format('DD/MM/YYYY')}</span>
                        <span>
                          <b>{v.diagnosisName || v.diagnosisCode || '—'}</b>
                          <span style={{ color: 'var(--t-2)' }}> · {v.departmentName || '—'}{v.doctorName ? ` · ${v.doctorName}` : ''}</span>
                        </span>
                        <span className="mono" style={{ color: 'var(--t-2)' }}>{(v.totalAmount || 0).toLocaleString('vi-VN')}₫</span>
                      </div>
                    ))
                  )}
                </div>
              )}
              </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </ModalShell>
  );
};

/* ────────────────────────────────────────────────────────────
   Đổi phòng modal — real changeRoom
   ──────────────────────────────────────────────────────────── */

