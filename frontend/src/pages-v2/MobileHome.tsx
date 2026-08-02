import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientApi, type Patient } from '../modules/patient/api/patient';
import { useAuth } from '../hooks/useAuth';
import { BarcodeScanner } from '../components/form';
import { SearchBox, Btn, LoadingState, Ico } from './_v2kit';

/* ==========================================================================
   Mobile Home v2 (#457) — dashboard tối ưu cho BS/ĐD dùng điện thoại/tablet.
   Port từ pages/MobileHome.tsx (v1 Antd): quick search BN + quét QR/barcode,
   grid thao tác nhanh (trỏ route /v2/*), BN truy cập gần đây.
   ========================================================================== */

const QUICK_ACTIONS: { key: string; label: string; ic: string; color: string; path: string }[] = [
  { key: 'emr',           label: 'Hồ sơ BA',   ic: 'file-text', color: 'var(--a-cy)',            path: '/v2/emr' },
  { key: 'opd',           label: 'Phòng khám', ic: 'user',      color: 'var(--s-ok, #16a34a)',   path: '/v2/opd' },
  { key: 'ipd',           label: 'Nội trú',    ic: 'bed',       color: 'var(--s-crit)',          path: '/v2/ipd' },
  { key: 'lab',           label: 'KQ XN',      ic: 'flask',     color: 'var(--s-warn)',          path: '/v2/lab' },
  { key: 'radiology',     label: 'KQ CĐHA',    ic: 'scan',      color: 'var(--a-vi, #7c3aed)',   path: '/v2/radiology' },
  { key: 'prescription',  label: 'Kê đơn',     ic: 'pill',      color: 'var(--a-cy)',            path: '/v2/prescription' },
  { key: 'consultation',  label: 'Hội chẩn',   ic: 'users',     color: 'var(--a-bl, #2563eb)',   path: '/v2/telemedicine' },
  { key: 'dashboard',     label: 'Tổng quan',  ic: 'chart',     color: 'var(--t-1)',             path: '/v2/dashboard' },
];
// Lưu ý port: nút "Thông báo" của v1 trỏ /notifications — route không tồn tại (dead link),
// bỏ khi port; thay bằng Tổng quan. (#457)

const PatientRow: React.FC<{ p: Patient; sub?: string; onClick: () => void }> = ({ p, sub, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
      padding: '8px 10px', background: 'none', border: 'none',
      borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left',
    }}
  >
    <Ico name="user" size={16} />
    <span style={{ flex: 1, minWidth: 0 }}>
      <span style={{ color: 'var(--t-0)', fontWeight: 600 }}>{p.fullName}</span>
      <span className="mono" style={{ marginLeft: 8, color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>{p.patientCode}</span>
      <span style={{ display: 'block', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
        {sub ?? [p.gender === 1 ? 'Nam' : p.gender === 2 ? 'Nữ' : '', p.yearOfBirth].filter(Boolean).join(' • ')}
      </span>
    </span>
    <Ico name="chevron-right" size={13} />
  </button>
);

export default function MobileHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Patient[]>([]);
  const [recent, setRecent] = useState<Patient[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);

  const loadRecent = useCallback(async () => {
    try {
      const res = await patientApi.search({ pageSize: 10 });
      setRecent(res.data?.items ?? []);
    } catch { /* panel BN gần đây là phụ — im lặng khi lỗi */ }
  }, []);

  useEffect(() => { void loadRecent(); }, [loadRecent]);

  const runSearch = useCallback(async (v: string) => {
    if (!v || v.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await patientApi.search({ keyword: v.trim(), pageSize: 15 });
      setResults(res.data?.items ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounce tìm kiếm khi gõ (mobile không có nút "Enter" rõ ràng)
  useEffect(() => {
    const t = setTimeout(() => { void runSearch(keyword); }, 350);
    return () => clearTimeout(t);
  }, [keyword, runSearch]);

  const openPatient = (p: Patient) => navigate(`/v2/emr?patientId=${p.id}`);

  return (
    <div style={{ padding: '8px 12px', maxWidth: 720, margin: '0 auto' }}>
      {/* -------- header: chào + thông báo + search + quét mã -------- */}
      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="panel-body pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Xin chào</div>
              <div style={{ fontWeight: 700, color: 'var(--t-0)' }}>{user?.fullName || user?.username}</div>
            </div>
            <Btn icon="grid" onClick={() => navigate('/v2')}>Modules</Btn>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm BN: mã, tên, SĐT..." minWidth="100%" />
            <Btn icon="qr" onClick={() => setScannerOpen(true)}>Quét QR CCCD / barcode BN</Btn>
          </div>
        </div>
      </div>

      {/* -------- kết quả tìm kiếm -------- */}
      {searching && <LoadingState />}
      {!searching && results.length > 0 && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <div className="panel-h"><span className="title">Kết quả tìm kiếm <b>({results.length})</b></span></div>
          <div className="panel-body">
            {results.map((p) => <PatientRow key={p.id} p={p} onClick={() => openPatient(p)} />)}
          </div>
        </div>
      )}

      {/* -------- thao tác nhanh -------- */}
      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="panel-h"><span className="title">Thao tác <b>nhanh</b></span></div>
        <div className="panel-body pad">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => navigate(a.path)}
                style={{
                  background: 'var(--bg-1, transparent)', border: '1px solid var(--line)',
                  borderRadius: 8, padding: '12px 4px', textAlign: 'center', cursor: 'pointer',
                }}
              >
                <div style={{ color: a.color, marginBottom: 4 }}><Ico name={a.ic} size={22} /></div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>{a.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* -------- BN truy cập gần đây -------- */}
      {recent.length > 0 && (
        <div className="panel">
          <div className="panel-h"><span className="title">BN <b>mới truy cập</b></span></div>
          <div className="panel-body">
            {recent.map((p) => <PatientRow key={p.id} p={p} onClick={() => openPatient(p)} />)}
          </div>
        </div>
      )}

      {scannerOpen && (
        <BarcodeScanner
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(text: string) => { setScannerOpen(false); setKeyword(text); }}
        />
      )}
    </div>
  );
}
