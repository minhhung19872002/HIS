import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import * as billingApi from '../api/billing';
import type { PatientBillingStatusDto } from '../api/billing';
import TermIcon from '../layouts/terminal/Icon';

const paymentChip = (s: number, name: string) => {
  const cls = s === 0 ? 'warn' : s === 1 ? 'info' : s === 2 ? 'ok' : 'ghost';
  return <span className={`chip ${cls}`}>{name}</span>;
};

const BillingV2: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PatientBillingStatusDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<number | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await billingApi.searchPatients({
          keyword: '',
          page: 1,
          pageSize: 200,
          fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
          toDate: dayjs().format('YYYY-MM-DD'),
        });
        setRows(res.data?.items || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (paymentFilter !== undefined) r = r.filter((x) => x.paymentStatus === paymentFilter);
    const kw = keyword.trim().toLowerCase();
    if (kw) r = r.filter((x) => x.patientName?.toLowerCase().includes(kw) || x.patientCode?.toLowerCase().includes(kw) || x.medicalRecordCode?.toLowerCase().includes(kw));
    return r;
  }, [rows, keyword, paymentFilter]);

  const stats = useMemo(() => {
    const totalAmount = rows.reduce((a, b) => a + (b.totalAmount || 0), 0);
    const paidAmount = rows.reduce((a, b) => a + (b.paidAmount || 0), 0);
    const remainAmount = rows.reduce((a, b) => a + (b.remainingAmount || 0), 0);
    return {
      total: rows.length,
      unpaid: rows.filter((r) => r.paymentStatus === 0).length,
      partial: rows.filter((r) => r.paymentStatus === 1).length,
      paid: rows.filter((r) => r.paymentStatus === 2).length,
      totalAmount, paidAmount, remainAmount,
    };
  }, [rows]);

  const selected = rows.find((r) => r.medicalRecordId === selectedId);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Hồ sơ thanh toán · <b>{filtered.length}</b></span>
          <div className="actions">
            <select className="select" style={{ width: 160 }} value={paymentFilter ?? ''} onChange={(e) => setPaymentFilter(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Tất cả thanh toán</option>
              <option value="0">Chưa thanh toán</option>
              <option value="1">Thanh toán một phần</option>
              <option value="2">Đã thanh toán</option>
            </select>
            <input className="input" style={{ width: 240 }} placeholder="Tìm BN / mã HS…" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : filtered.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có hồ sơ</div>
            : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mã HS</th>
                  <th>Bệnh nhân</th>
                  <th className="num">Tổng tiền</th>
                  <th className="num">BHYT</th>
                  <th className="num">Đã thu</th>
                  <th className="num">Còn lại</th>
                  <th>Kế toán</th>
                  <th>Thanh toán</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.medicalRecordId} className={r.medicalRecordId === selectedId ? 'sel' : ''} onClick={() => setSelectedId(r.medicalRecordId)} style={{ cursor: 'pointer' }}>
                    <td className="mono">{r.medicalRecordCode}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.patientName}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div>
                    </td>
                    <td className="num">{(r.totalAmount || 0).toLocaleString('vi-VN')}</td>
                    <td className="num muted">{(r.insuranceAmount || 0).toLocaleString('vi-VN')}</td>
                    <td className="num" style={{ color: 'var(--s-ok)' }}>{(r.paidAmount || 0).toLocaleString('vi-VN')}</td>
                    <td className="num" style={{ color: r.remainingAmount > 0 ? 'var(--s-crit)' : 'var(--t-2)' }}>{(r.remainingAmount || 0).toLocaleString('vi-VN')}</td>
                    <td className="muted">{r.accountingStatusName}</td>
                    <td>{paymentChip(r.paymentStatus, r.paymentStatusName)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div className="panel">
          <div className="panel-h"><span className="title">Tổng quan tài chính</span></div>
          <div className="panel-body pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCell label="Hồ sơ" value={stats.total.toString()} />
              <StatCell label="Chưa thu" value={stats.unpaid.toString()} warn />
              <StatCell label="Một phần" value={stats.partial.toString()} cy />
              <StatCell label="Đã thu" value={stats.paid.toString()} ok />
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Row label="Tổng tiền" value={stats.totalAmount.toLocaleString('vi-VN') + ' đ'} />
              <Row label="Đã thu" value={stats.paidAmount.toLocaleString('vi-VN') + ' đ'} color="var(--s-ok)" />
              <Row label="Còn lại" value={stats.remainAmount.toLocaleString('vi-VN') + ' đ'} color="var(--s-crit)" />
            </div>
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết hồ sơ</span>
            <span className="sub">{selected ? selected.medicalRecordCode : 'Chọn một dòng'}</span>
          </div>
          <div className="panel-body pad">
            {!selected ? <div className="ph">Chọn hồ sơ để xem chi tiết</div> : (
              <div className="stack-sm">
                <Field label="Bệnh nhân" value={`${selected.patientName} · ${selected.patientCode}`} />
                <Field label="Hồ sơ" value={<span className="mono">{selected.medicalRecordCode}</span>} />
                <Field label="Trạng thái HS" value={selected.recordStatusName} />
                <Field label="Trạng thái kế toán" value={selected.accountingStatusName} />
                <Field label="Thanh toán" value={paymentChip(selected.paymentStatus, selected.paymentStatusName)} />
                <Row label="Tổng tiền" value={(selected.totalAmount || 0).toLocaleString('vi-VN') + ' đ'} strong />
                <Row label="BHYT chi trả" value={(selected.insuranceAmount || 0).toLocaleString('vi-VN') + ' đ'} />
                <Row label="Tạm ứng" value={(selected.depositBalance || 0).toLocaleString('vi-VN') + ' đ'} />
                <Row label="Đã thu" value={(selected.paidAmount || 0).toLocaleString('vi-VN') + ' đ'} color="var(--s-ok)" />
                <Row label="Còn lại" value={(selected.remainingAmount || 0).toLocaleString('vi-VN') + ' đ'} color="var(--s-crit)" strong />
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  <button className="btn primary sm" type="button" onClick={() => navigate('/billing')}>
                    <TermIcon name="receipt" size={12} />Thu tiền
                  </button>
                  <button className="btn sm" type="button" onClick={() => navigate('/billing')}>In hoá đơn</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCell: React.FC<{ label: string; value: string; warn?: boolean; cy?: boolean; ok?: boolean }> = ({ label, value, warn, cy, ok }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : 'var(--t-0)' }}>{value}</div>
  </div>
);

const Row: React.FC<{ label: string; value: string; color?: string; strong?: boolean }> = ({ label, value, color, strong }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
    <span style={{ color: 'var(--t-2)' }}>{label}</span>
    <span className="mono" style={{ color: color || 'var(--t-0)', fontWeight: strong ? 600 : 400 }}>{value}</span>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div><div className="label">{label}</div><div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div></div>
);

export default BillingV2;
