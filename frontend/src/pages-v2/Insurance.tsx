import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchInsuranceClaims } from '../api/insurance';
import type { InsuranceClaimSummaryDto } from '../api/insurance';
import TermIcon from '../layouts/terminal/Icon';

const STATUS_LABEL: Record<number, { text: string; cls: 'warn' | 'cy' | 'ok' | 'ghost' | 'crit' }> = {
  0: { text: 'Nháp', cls: 'ghost' },
  1: { text: 'Chờ gửi', cls: 'warn' },
  2: { text: 'Đã gửi', cls: 'cy' },
  3: { text: 'Duyệt', cls: 'ok' },
  4: { text: 'Từ chối', cls: 'crit' },
};

const fmtVnd = (n: number) => n.toLocaleString('vi-VN');

const InsuranceV2: React.FC = () => {
  const [items, setItems] = useState<InsuranceClaimSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [fromDate, setFromDate] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [selected, setSelected] = useState<InsuranceClaimSummaryDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchInsuranceClaims({
        keyword: keyword || undefined, fromDate, toDate, status: statusFilter,
        pageNumber: 1, pageSize: 200,
      });
      const data = Array.isArray(r.data?.items) ? r.data.items : [];
      setItems(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => ({
    total: items.length,
    draft: items.filter((c) => c.status === 0 || c.status === 1).length,
    submitted: items.filter((c) => c.status === 2).length,
    approved: items.filter((c) => c.status === 3).length,
    rejected: items.filter((c) => c.status === 4).length,
    totalBhytAmount: items.reduce((s, c) => s + (c.insuranceAmount || 0), 0),
  }), [items]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Hồ sơ BHYT · <b>{items.length}</b></span>
          <div className="actions">
            <input type="date" className="input" style={{ width: 130 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input type="date" className="input" style={{ width: 130 }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <select className="select" style={{ width: 110 }} value={statusFilter ?? ''} onChange={(e) => setStatusFilter(e.target.value === '' ? undefined : Number(e.target.value))}>
              <option value="">Tất cả</option>
              <option value="0">Nháp</option>
              <option value="1">Chờ gửi</option>
              <option value="2">Đã gửi</option>
              <option value="3">Duyệt</option>
              <option value="4">Từ chối</option>
            </select>
            <input className="input" style={{ width: 200 }} placeholder="Tìm BN / mã LK..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Chưa có hồ sơ BHYT</div>
            : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mã LK</th>
                  <th>Bệnh nhân</th>
                  <th>Số BHYT</th>
                  <th>Vào viện</th>
                  <th>CĐ chính</th>
                  <th className="num">Tổng (₫)</th>
                  <th className="num">BHYT (₫)</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => {
                  const st = STATUS_LABEL[c.status] || { text: c.statusName, cls: 'ghost' as const };
                  return (
                    <tr key={c.id} className={selected?.id === c.id ? 'sel' : ''} onClick={() => setSelected(c)} style={{ cursor: 'pointer' }}>
                      <td className="mono">{c.maLk}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{c.patientName}</div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{c.patientCode}</div>
                      </td>
                      <td className="mono">{c.insuranceNumber}</td>
                      <td className="mono">{dayjs(c.admissionDate).format('DD/MM HH:mm')}</td>
                      <td className="muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span className="mono" style={{ color: 'var(--a-cy)' }}>{c.diagnosisCode}</span> {c.diagnosisName}
                      </td>
                      <td className="num mono">{fmtVnd(c.totalAmount)}</td>
                      <td className="num mono" style={{ color: 'var(--s-ok)' }}>{fmtVnd(c.insuranceAmount)}</td>
                      <td><span className={`chip ${st.cls}`}>{st.text}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div className="panel">
          <div className="panel-h"><span className="title">Tổng quan</span></div>
          <div className="panel-body pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Stat label="Tổng HS" value={String(stats.total)} />
              <Stat label="Chờ gửi" value={String(stats.draft)} warn />
              <Stat label="Đã gửi" value={String(stats.submitted)} cy />
              <Stat label="Đã duyệt" value={String(stats.approved)} ok />
              <Stat label="Từ chối" value={String(stats.rejected)} crit />
              <Stat label="BHYT (M₫)" value={fmtVnd(Math.round(stats.totalBhytAmount / 1_000_000))} />
            </div>
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết hồ sơ</span>
            <span className="sub">{selected ? selected.patientName : 'Chọn hồ sơ'}</span>
          </div>
          <div className="panel-body pad">
            {!selected ? <div className="ph">Chọn hồ sơ để xem chi tiết</div> : (
              <div className="stack-sm">
                <Field label="Mã LK" value={<span className="mono">{selected.maLk}</span>} />
                <Field label="BN" value={`${selected.patientName} · ${selected.patientCode}`} />
                <Field label="BHYT" value={<span className="mono">{selected.insuranceNumber}</span>} />
                <Field label="Vào viện" value={<span className="mono">{dayjs(selected.admissionDate).format('DD/MM/YYYY HH:mm')}</span>} />
                {selected.dischargeDate && <Field label="Ra viện" value={<span className="mono">{dayjs(selected.dischargeDate).format('DD/MM/YYYY HH:mm')}</span>} />}
                <Field label="CĐ chính" value={<><span className="mono" style={{ color: 'var(--a-cy)' }}>{selected.diagnosisCode}</span> {selected.diagnosisName}</>} />
                <Field label="Tổng" value={<span className="mono">{fmtVnd(selected.totalAmount)} ₫</span>} />
                <Field label="BHYT chi trả" value={<span className="mono" style={{ color: 'var(--s-ok)' }}>{fmtVnd(selected.insuranceAmount)} ₫</span>} />
                <Field label="Cùng chi trả" value={<span className="mono">{fmtVnd(selected.coPayAmount)} ₫</span>} />
                <Field label="BN tự trả" value={<span className="mono">{fmtVnd(selected.patientAmount)} ₫</span>} />
                <Field label="Trạng thái" value={(() => { const st = STATUS_LABEL[selected.status] || { text: selected.statusName, cls: 'ghost' as const }; return <span className={`chip ${st.cls}`}>{st.text}</span>; })()} />
                {selected.submitDate && <Field label="Ngày gửi" value={<span className="mono">{dayjs(selected.submitDate).format('DD/MM/YYYY HH:mm')}</span>} />}
                {selected.rejectReason && <Field label="Lý do từ chối" value={<span style={{ color: 'var(--s-crit)' }}>{selected.rejectReason}</span>} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; warn?: boolean; cy?: boolean; ok?: boolean; crit?: boolean }> = ({ label, value, warn, cy, ok, crit }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, color: warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : crit ? 'var(--s-crit)' : 'var(--t-0)' }}>{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div><div className="label">{label}</div><div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div></div>
);

export default InsuranceV2;
