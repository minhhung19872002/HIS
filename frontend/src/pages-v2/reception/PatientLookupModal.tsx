import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input } from 'antd';
import * as receptionApi from '../../api/reception';
import { ModalShell } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
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

  useEffect(() => {
    if (open) { setKw(''); setList([]); }
  }, [open]);

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
        <div style={{ display: 'flex', gap: 8 }}>
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

        <div style={{ marginTop: 14, maxHeight: 360, overflow: 'auto' }}>
          {list.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--t-2)', fontSize: 12 }}>
              {busy ? 'Đang tìm…' : 'Nhập từ khóa rồi bấm Tìm'}
            </div>
          ) : (
            list.map((p, i) => (
              <div
                key={p.id || p.patientId || i}
                style={{
                  padding: '10px 12px', borderBottom: '1px solid var(--line-soft)',
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', cursor: 'pointer',
                }}
                onClick={() => onPick(p)}
              >
                <div>
                  <b>{p.fullName || p.patientName || '—'}</b>
                  <div style={{ fontSize: 11, color: 'var(--t-2)' }}>
                    <span className="mono">{p.patientCode || '—'}</span>
                    {p.phoneNumber ? ` · ${p.phoneNumber}` : ''}
                    {p.dateOfBirth ? ` · ${dayjs(p.dateOfBirth).format('DD/MM/YYYY')}` : (p.yearOfBirth ? ` · ${p.yearOfBirth}` : '')}
                    {p.insuranceNumber ? ` · BHYT ${p.insuranceNumber}` : ''}
                  </div>
                </div>
                <button type="button" className="ab-btn ghost" onClick={(e) => { e.stopPropagation(); onPick(p); }}>
                  Chọn
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </ModalShell>
  );
};

/* ────────────────────────────────────────────────────────────
   Đổi phòng modal — real changeRoom
   ──────────────────────────────────────────────────────────── */

