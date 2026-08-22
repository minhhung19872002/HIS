import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTabState } from '../../../hooks/useTabState';
import {
  KpiStrip, TopTabs, DataTable, Btn,
  type ColumnDef, type TopTab, type KpiItem,
  fmtVNDg, fmtHMg, ti, tw as toastWarn
} from '@/_v2kit';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { RefreshButton } from '../../../components/actions';
import TermIcon from '../../../components/layout/terminal/Icon';
import { useInterval } from '../../../hooks/useInterval';
import {
  qualityDash,
  type QualityDashboardDto,
  type ClinicQueueViewDto,
  type InpatientDepartmentViewDto,
  type ParaclinicalTypeStatusDto,
  type LabCategoryStatusDto,
  type CashierRevenueDto
} from '../../../api/nangcap23';

const fmtMny = (n: number | null | undefined): string => n === 0 ? '0đ' : fmtVNDg(n);

type TabKey = 'clinic' | 'inpatient' | 'paraclinical' | 'lab' | 'revenue';
const TOP_TABS: TopTab<TabKey>[] = [
  { v: 'clinic',       l: 'Phòng khám',           ic: 'stethoscope' },
  { v: 'inpatient',    l: 'Nội trú',              ic: 'bed' },
  { v: 'paraclinical', l: 'Cận lâm sàng',         ic: 'activity' },
  { v: 'lab',          l: 'Xét nghiệm',           ic: 'flask' },
  { v: 'revenue',      l: 'Doanh thu trong ngày', ic: 'dollar' },
];

const QualityDashboardLiveV2: React.FC = () => {
  const [tab, setTab] = useTabState<TabKey>('clinic');
  const [data, setData] = useState<QualityDashboardDto | null>(null);
  const [refreshAt, setRefreshAt] = useState<Date>(new Date());
  // loading CHỈ cho lần tải đầu — vòng poll 60s không bật lại để bảng không nháy
  const [firstLoading, setFirstLoading] = useState(true);
  const loadedRef = useRef(false);
  const warnedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const d = await qualityDash.getFull();
      setData(d);
      loadedRef.current = true;
      setRefreshAt(new Date());
    } catch (e) {
      // vòng poll nền khi đã có dữ liệu → vẫn im lặng (tolerant) như trước;
      // chỉ cảnh báo 1 lần khi màn hình chưa có dữ liệu nào để hiển thị
      if (!loadedRef.current && !warnedRef.current) {
        warnedRef.current = true;
        toastWarn(friendlyErrorMessage(e, 'Không tải được dữ liệu dashboard chất lượng.'));
      }
    } finally {
      setFirstLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useInterval(load, 60000);

  const refresh = () => { load(); ti('Đã làm mới · realtime'); };

  return (
    <div className="ab" data-testid="quality-dashboard-page">
      <TopTabs<TabKey> tab={tab} setTab={setTab} tabs={TOP_TABS}
        actions={
          <RefreshButton onRefresh={async () => { await refresh(); }} />
        }
      />
      {tab === 'clinic'       && <ClinicView rows={data?.clinicQueues || []} loading={firstLoading} />}
      {tab === 'inpatient'    && <InpatientView rows={data?.inpatientByDepartment || []} loading={firstLoading} />}
      {tab === 'paraclinical' && <ParaclinicalView rows={data?.paraclinical?.items || []} loading={firstLoading} />}
      {tab === 'lab'          && <LabView rows={data?.lab?.categories || []} loading={firstLoading} />}
      {tab === 'revenue'      && <RevenueView byCashier={data?.revenue?.byCashier || []}
                                              loading={firstLoading}
                                              outpatientTotal={data?.revenue?.outpatientTotal || 0}
                                              inpatientTotal={data?.revenue?.inpatientTotal || 0}
                                              grandTotal={data?.revenue?.grandTotal || 0} />}
    </div>
  );
};

const ClinicView: React.FC<{ rows: ClinicQueueViewDto[]; loading?: boolean }> = ({ rows, loading }) => {
  const tw = rows.reduce((s, r) => s + r.waiting, 0);
  const ti2 = rows.reduce((s, r) => s + r.inProgress, 0);
  const td = rows.reduce((s, r) => s + r.completed, 0);
  const kpis: KpiItem[] = [
    { lbl: 'Phòng khám',           val: rows.length },
    { lbl: 'Chờ khám',             val: tw, tone: 'warn' },
    { lbl: 'Đang khám/y lệnh',     val: ti2, tone: 'info' },
    { lbl: 'Đã khám',              val: td, tone: 'ok' },
  ];
  const columns: ColumnDef<ClinicQueueViewDto>[] = [
    { key: 'roomName',   label: 'Phòng khám', render: (r) => <b>{r.roomName}</b> },
    { key: 'waiting',    label: 'Chờ khám', mono: true, width: 110,
      render: (r) => <span style={{ color: r.waiting > 5 ? 'var(--s-warn)' : 'var(--t-1)' }}>{r.waiting}</span> },
    { key: 'inProgress', label: 'Đang thực hiện y lệnh', mono: true, width: 170 },
    { key: 'completed',  label: 'Đã khám', mono: true, width: 110,
      render: (r) => <span style={{ color: 'var(--s-ok)' }}>{r.completed}</span> },
    { key: 'total',      label: 'Tổng BN', mono: true, width: 110,
      render: (r) => <b>{r.waiting + r.inProgress + r.completed}</b> },
  ];
  return (
    <>
      <KpiStrip items={kpis} />
      <DataTable<ClinicQueueViewDto> rowKey={(r) => r.roomId} data={rows} columns={columns} loading={loading} />
    </>
  );
};

const InpatientView: React.FC<{ rows: InpatientDepartmentViewDto[]; loading?: boolean }> = ({ rows, loading }) => {
  const kpis: KpiItem[] = [
    { lbl: 'Khoa nội trú',     val: rows.length },
    { lbl: 'Hiện diện',        val: rows.reduce((s, r) => s + r.present, 0), tone: 'info' },
    { lbl: 'Nhập viện hôm nay',val: rows.reduce((s, r) => s + r.admitted, 0), tone: 'ok' },
    { lbl: 'Xuất viện hôm nay',val: rows.reduce((s, r) => s + r.discharged, 0), tone: 'warn' },
    { lbl: 'Tổng chi phí',     val: fmtMny(rows.reduce((s, r) => s + r.totalCost, 0)) },
  ];
  const columns: ColumnDef<InpatientDepartmentViewDto>[] = [
    { key: 'departmentName', label: 'Khoa', render: (r) => <b>{r.departmentName}</b> },
    { key: 'present',        label: 'Hiện diện', mono: true, width: 100 },
    { key: 'admitted',       label: 'Nhập viện', mono: true, width: 110,
      render: (r) => <span style={{ color: 'var(--s-ok)' }}>{r.admitted}</span> },
    { key: 'discharged',     label: 'Xuất viện', mono: true, width: 110,
      render: (r) => <span style={{ color: 'var(--s-warn)' }}>{r.discharged}</span> },
    { key: 'totalCost',      label: 'Chi phí phát sinh', mono: true, width: 170,
      render: (r) => fmtMny(r.totalCost) },
  ];
  return (
    <>
      <KpiStrip items={kpis} />
      <DataTable<InpatientDepartmentViewDto> rowKey={(r) => r.departmentId} data={rows} columns={columns} loading={loading} />
    </>
  );
};

const ParaclinicalView: React.FC<{ rows: ParaclinicalTypeStatusDto[]; loading?: boolean }> = ({ rows, loading }) => {
  const kpis: KpiItem[] = [
    { lbl: 'Tổng loại CLS', val: rows.length },
    { lbl: 'Chưa có KQ',    val: rows.reduce((s, r) => s + r.pending, 0), tone: 'warn' },
    { lbl: 'Đã có KQ',      val: rows.reduce((s, r) => s + r.completed, 0), tone: 'ok' },
  ];
  const columns: ColumnDef<ParaclinicalTypeStatusDto>[] = [
    { key: 'typeName',  label: 'Loại CLS', render: (r) => <b>{r.typeName}</b> },
    { key: 'pending',   label: 'Chưa có KQ', mono: true, width: 140,
      render: (r) => <span style={{ color: 'var(--s-warn)' }}>{r.pending}</span> },
    { key: 'completed', label: 'Đã có KQ', mono: true, width: 140,
      render: (r) => <span style={{ color: 'var(--s-ok)' }}>{r.completed}</span> },
    { key: 'pct', label: 'Tỷ lệ', mono: true, width: 100,
      render: (r) => {
        const t = r.pending + r.completed;
        return t > 0 ? `${Math.round((r.completed * 100) / t)}%` : '—';
      } },
  ];
  return (
    <>
      <KpiStrip items={kpis} />
      <DataTable<ParaclinicalTypeStatusDto> rowKey={(r) => r.typeName} data={rows} columns={columns} loading={loading} />
    </>
  );
};

const LabView: React.FC<{ rows: LabCategoryStatusDto[]; loading?: boolean }> = ({ rows, loading }) => {
  const kpis: KpiItem[] = [
    { lbl: 'Nhóm XN',    val: rows.length },
    { lbl: 'Chưa có KQ', val: rows.reduce((s, r) => s + r.pending, 0), tone: 'warn' },
    { lbl: 'Đã có KQ',   val: rows.reduce((s, r) => s + r.completed, 0), tone: 'ok' },
  ];
  const columns: ColumnDef<LabCategoryStatusDto>[] = [
    { key: 'categoryName', label: 'Nhóm XN', render: (r) => <b>{r.categoryName}</b> },
    { key: 'pending',      label: 'Chưa có KQ', mono: true, width: 140,
      render: (r) => <span style={{ color: 'var(--s-warn)' }}>{r.pending}</span> },
    { key: 'completed',    label: 'Đã có KQ', mono: true, width: 140,
      render: (r) => <span style={{ color: 'var(--s-ok)' }}>{r.completed}</span> },
    { key: 'pct', label: 'Tỷ lệ', mono: true, width: 100,
      render: (r) => {
        const t = r.pending + r.completed;
        return t > 0 ? `${Math.round((r.completed * 100) / t)}%` : '—';
      } },
  ];
  return (
    <>
      <KpiStrip items={kpis} />
      <DataTable<LabCategoryStatusDto> rowKey={(r) => r.categoryName} data={rows} columns={columns} loading={loading} />
    </>
  );
};

const RevenueView: React.FC<{
  byCashier: CashierRevenueDto[];
  outpatientTotal: number;
  inpatientTotal: number;
  grandTotal: number;
  loading?: boolean;
}> = ({ byCashier, outpatientTotal, inpatientTotal, grandTotal, loading }) => {
  const kpis: KpiItem[] = [
    { lbl: 'Tổng doanh thu',  val: fmtMny(grandTotal),     tone: 'ok' },
    { lbl: 'Ngoại trú',       val: fmtMny(outpatientTotal), tone: 'info' },
    { lbl: 'Nội trú',         val: fmtMny(inpatientTotal),  tone: 'warn' },
    { lbl: 'Số bàn thu ngân', val: byCashier.length },
  ];
  const columns: ColumnDef<CashierRevenueDto>[] = [
    { key: 'cashierName',       label: 'Bàn thu ngân', render: (r) => <b>{r.cashierName}</b> },
    { key: 'outpatientRevenue', label: 'Ngoại trú', mono: true, width: 170,
      render: (r) => fmtMny(r.outpatientRevenue) },
    { key: 'inpatientRevenue',  label: 'Nội trú',   mono: true, width: 170,
      render: (r) => fmtMny(r.inpatientRevenue) },
    { key: 'total',             label: 'Tổng', mono: true, width: 170,
      render: (r) => <span style={{ color: 'var(--a-cy)' }}><b>{fmtMny(r.total)}</b></span> },
    { key: 'receiptCount',      label: 'Số biên lai', mono: true, width: 120 },
  ];
  return (
    <>
      <KpiStrip items={kpis} />
      <DataTable<CashierRevenueDto> rowKey={(r) => r.cashierId} data={byCashier} columns={columns} loading={loading} />
    </>
  );
};

export default QualityDashboardLiveV2;
