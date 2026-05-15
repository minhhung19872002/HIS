import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { KpiStrip, TopTabs, type TopTab, type KpiItem } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import { qualityDash, type QualityDashboardDto } from '../api/nangcap23';

type TabKey = 'clinic' | 'inpatient' | 'paraclinical' | 'lab' | 'revenue';
const TOP_TABS: TopTab<TabKey>[] = [
  { v: 'clinic',       l: 'Phòng khám',         ic: 'stethoscope' },
  { v: 'inpatient',    l: 'Nội trú',            ic: 'bed' },
  { v: 'paraclinical', l: 'Cận lâm sàng',       ic: 'activity' },
  { v: 'lab',          l: 'Xét nghiệm',         ic: 'flask' },
  { v: 'revenue',      l: 'Doanh thu trong ngày', ic: 'dollar' },
];

const fmtVnd = (n: number) => `${(n || 0).toLocaleString('vi-VN')}đ`;

const QualityDashboardLiveV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('clinic');
  const [data, setData] = useState<QualityDashboardDto | null>(null);
  const [refreshAt, setRefreshAt] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const d = await qualityDash.getFull();
      setData(d);
      setRefreshAt(dayjs().format('HH:mm:ss'));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); const id = setInterval(load, 60000); return () => clearInterval(id); }, [load]);

  return (
    <div className="ab-stack" data-testid="quality-dashboard-page">
      <TopTabs tab={tab} setTab={setTab} tabs={TOP_TABS}
        actions={<button type="button" className="ab-btn" onClick={load}>
          <TermIcon name="rotate-cw" size={12}/> Làm mới {refreshAt && <span style={{ marginLeft: 6, color: 'var(--t-2)' }}>· {refreshAt}</span>}
        </button>}
      />
      {tab === 'clinic' && <ClinicView d={data} />}
      {tab === 'inpatient' && <InpatientView d={data} />}
      {tab === 'paraclinical' && <ParaclinicalView d={data} />}
      {tab === 'lab' && <LabView d={data} />}
      {tab === 'revenue' && <RevenueView d={data} />}
    </div>
  );
};

const ClinicView: React.FC<{ d: QualityDashboardDto | null }> = ({ d }) => {
  const rows = d?.clinicQueues || [];
  const totalWait = rows.reduce((s, r) => s + r.waiting, 0);
  const totalInProg = rows.reduce((s, r) => s + r.inProgress, 0);
  const totalDone = rows.reduce((s, r) => s + r.completed, 0);
  const kpis: KpiItem[] = [
    { lbl: 'Phòng khám', val: rows.length },
    { lbl: 'Chờ khám', val: totalWait, tone: 'warn' },
    { lbl: 'Đang thực hiện y lệnh', val: totalInProg, tone: 'info' },
    { lbl: 'Đã khám', val: totalDone, tone: 'ok' },
  ];
  return (
    <>
      <KpiStrip items={kpis} />
      <div className="ab-tbl-wrap">
        <table className="ab-tbl">
          <thead><tr>
            <th>Phòng khám</th>
            <th style={{ width: 110 }}>Chờ khám</th>
            <th style={{ width: 160 }}>Đang thực hiện y lệnh</th>
            <th style={{ width: 110 }}>Đã khám</th>
            <th style={{ width: 110 }}>Tổng BN</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--t-2)' }}>Chưa có dữ liệu</td></tr>}
            {rows.map(r => (
              <tr key={r.roomId}>
                <td><b>{r.roomName}</b></td>
                <td className="mono" style={{ color: r.waiting > 5 ? 'var(--s-warn)' : 'var(--t-1)' }}>{r.waiting}</td>
                <td className="mono">{r.inProgress}</td>
                <td className="mono" style={{ color: 'var(--s-ok)' }}>{r.completed}</td>
                <td className="mono">{r.waiting + r.inProgress + r.completed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const InpatientView: React.FC<{ d: QualityDashboardDto | null }> = ({ d }) => {
  const rows = d?.inpatientByDepartment || [];
  const totalPresent = rows.reduce((s, r) => s + r.present, 0);
  const totalAdm = rows.reduce((s, r) => s + r.admitted, 0);
  const totalDis = rows.reduce((s, r) => s + r.discharged, 0);
  const totalCost = rows.reduce((s, r) => s + r.totalCost, 0);
  const kpis: KpiItem[] = [
    { lbl: 'Khoa nội trú', val: rows.length },
    { lbl: 'Hiện diện', val: totalPresent, tone: 'info' },
    { lbl: 'Nhập viện hôm nay', val: totalAdm, tone: 'ok' },
    { lbl: 'Xuất viện hôm nay', val: totalDis, tone: 'warn' },
    { lbl: 'Tổng chi phí', val: fmtVnd(totalCost) },
  ];
  return (
    <>
      <KpiStrip items={kpis} />
      <div className="ab-tbl-wrap">
        <table className="ab-tbl">
          <thead><tr>
            <th>Khoa</th>
            <th style={{ width: 100 }}>Hiện diện</th>
            <th style={{ width: 110 }}>Nhập viện</th>
            <th style={{ width: 110 }}>Xuất viện</th>
            <th style={{ width: 160 }}>Chi phí phát sinh</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--t-2)' }}>Chưa có dữ liệu</td></tr>}
            {rows.map(r => (
              <tr key={r.departmentId}>
                <td><b>{r.departmentName}</b></td>
                <td className="mono">{r.present}</td>
                <td className="mono" style={{ color: 'var(--s-ok)' }}>{r.admitted}</td>
                <td className="mono" style={{ color: 'var(--s-warn)' }}>{r.discharged}</td>
                <td className="mono">{fmtVnd(r.totalCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const ParaclinicalView: React.FC<{ d: QualityDashboardDto | null }> = ({ d }) => {
  const items = d?.paraclinical?.items || [];
  const totalPending = items.reduce((s, r) => s + r.pending, 0);
  const totalDone = items.reduce((s, r) => s + r.completed, 0);
  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng loại CLS', val: items.length },
        { lbl: 'Chưa có KQ', val: totalPending, tone: 'warn' },
        { lbl: 'Đã có KQ', val: totalDone, tone: 'ok' },
      ]} />
      <div className="ab-tbl-wrap">
        <table className="ab-tbl">
          <thead><tr>
            <th>Loại CLS</th>
            <th style={{ width: 140 }}>Chưa có KQ</th>
            <th style={{ width: 140 }}>Đã có KQ</th>
            <th style={{ width: 100 }}>Tỷ lệ</th>
          </tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--t-2)' }}>Chưa có dữ liệu</td></tr>}
            {items.map(it => {
              const total = it.pending + it.completed;
              const pct = total > 0 ? Math.round((it.completed * 100) / total) : 0;
              return (
                <tr key={it.typeName}>
                  <td><b>{it.typeName}</b></td>
                  <td className="mono" style={{ color: 'var(--s-warn)' }}>{it.pending}</td>
                  <td className="mono" style={{ color: 'var(--s-ok)' }}>{it.completed}</td>
                  <td className="mono">{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

const LabView: React.FC<{ d: QualityDashboardDto | null }> = ({ d }) => {
  const cats = d?.lab?.categories || [];
  const totalPending = cats.reduce((s, r) => s + r.pending, 0);
  const totalDone = cats.reduce((s, r) => s + r.completed, 0);
  return (
    <>
      <KpiStrip items={[
        { lbl: 'Nhóm XN', val: cats.length },
        { lbl: 'Chưa có KQ', val: totalPending, tone: 'warn' },
        { lbl: 'Đã có KQ', val: totalDone, tone: 'ok' },
      ]} />
      <div className="ab-tbl-wrap">
        <table className="ab-tbl">
          <thead><tr>
            <th>Nhóm XN (Huyết học, Sinh hóa, Vi sinh, Miễn dịch…)</th>
            <th style={{ width: 140 }}>Chưa có KQ</th>
            <th style={{ width: 140 }}>Đã có KQ</th>
            <th style={{ width: 100 }}>Tỷ lệ</th>
          </tr></thead>
          <tbody>
            {cats.length === 0 && <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--t-2)' }}>Chưa có dữ liệu</td></tr>}
            {cats.map(c => {
              const total = c.pending + c.completed;
              const pct = total > 0 ? Math.round((c.completed * 100) / total) : 0;
              return (
                <tr key={c.categoryName}>
                  <td><b>{c.categoryName}</b></td>
                  <td className="mono" style={{ color: 'var(--s-warn)' }}>{c.pending}</td>
                  <td className="mono" style={{ color: 'var(--s-ok)' }}>{c.completed}</td>
                  <td className="mono">{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

const RevenueView: React.FC<{ d: QualityDashboardDto | null }> = ({ d }) => {
  const rev = d?.revenue || { outpatientTotal: 0, inpatientTotal: 0, grandTotal: 0, byCashier: [] };
  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng doanh thu', val: fmtVnd(rev.grandTotal), tone: 'ok' },
        { lbl: 'Ngoại trú', val: fmtVnd(rev.outpatientTotal), tone: 'info' },
        { lbl: 'Nội trú', val: fmtVnd(rev.inpatientTotal), tone: 'warn' },
        { lbl: 'Số bàn thu ngân', val: rev.byCashier.length },
      ]} />
      <div className="ab-tbl-wrap">
        <table className="ab-tbl">
          <thead><tr>
            <th>Bàn thu ngân</th>
            <th style={{ width: 160 }}>Doanh thu Ngoại trú</th>
            <th style={{ width: 160 }}>Doanh thu Nội trú</th>
            <th style={{ width: 160 }}>Tổng</th>
            <th style={{ width: 110 }}>Số biên lai</th>
          </tr></thead>
          <tbody>
            {rev.byCashier.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--t-2)' }}>Chưa có dữ liệu</td></tr>}
            {rev.byCashier.map(c => (
              <tr key={c.cashierId}>
                <td><b>{c.cashierName}</b></td>
                <td className="mono">{fmtVnd(c.outpatientRevenue)}</td>
                <td className="mono">{fmtVnd(c.inpatientRevenue)}</td>
                <td className="mono" style={{ color: 'var(--a-cy-text)' }}>{fmtVnd(c.total)}</td>
                <td className="mono">{c.receiptCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default QualityDashboardLiveV2;
