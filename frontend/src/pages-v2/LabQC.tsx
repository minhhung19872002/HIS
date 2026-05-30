import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getQCLots, getQCResults, createQCLot, updateQCLot, deleteQCLot } from '../api/labQC';
import type { QCLot, QCResult } from '../api/labQC';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, ti, te, cf, Ico,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

const LOT_FIELDS: CrudFieldCfg[] = [
  { key: 'lotNumber', label: 'Số lô', required: true, disabledOnEdit: true },
  { key: 'testCode', label: 'Mã xét nghiệm', required: true },
  { key: 'testName', label: 'Tên xét nghiệm', required: true },
  { key: 'level', label: 'Mức QC', type: 'select', required: true, options: [
    { value: 1, label: 'Low' }, { value: 2, label: 'Normal' }, { value: 3, label: 'High' }] },
  { key: 'manufacturer', label: 'Nhà sản xuất' },
  { key: 'targetMean', label: 'Target Mean', type: 'number', required: true },
  { key: 'targetSD', label: 'Target SD', type: 'number', required: true },
  { key: 'unit', label: 'Đơn vị' },
  { key: 'expiryDate', label: 'Hạn dùng', type: 'date', required: true },
  { key: 'isActive', label: 'Đang dùng', type: 'switch' },
];

const LEVEL_LABEL: Record<number, string> = { 1: 'Low', 2: 'Normal', 3: 'High' };

type Tab = 'lots' | 'results';
const TABS = [
  { v: 'lots' as Tab, l: 'Lô QC', ic: 'package' },
  { v: 'results' as Tab, l: 'Kết quả QC', ic: 'activity' },
];

const PER = 18;

const LabQCV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('lots');
  const [lots, setLots] = useState<QCLot[]>([]);
  const [results, setResults] = useState<QCResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selLot, setSelLot] = useState<QCLot | null>(null);
  const [selRes, setSelRes] = useState<QCResult | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const openCreateLot = () => { setCrudInit({ level: 2, isActive: true }); setCrudOpen(true); };
  const openEditLot = (r: QCLot) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const delLot = (r: QCLot) => cf(`Xoá lô QC "${r.lotNumber}"?`, async () => {
    try { await deleteQCLot(r.id); tk('Đã xoá'); load(); } catch { te('Xoá thất bại'); }
  }, { tone: 'crit', confirm: 'Xoá' });

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'lots') {
        const r = await getQCLots({ testCode: search || undefined });
        const list = (r?.items || (Array.isArray(r) ? r : [])) as QCLot[];
        setLots(list);
      } else {
        const r = await getQCResults({
          testCode: search || undefined,
          fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
          toDate: dayjs().format('YYYY-MM-DD'),
        });
        const list = (r?.items || (Array.isArray(r) ? r : [])) as QCResult[];
        setResults(list);
      }
    } catch { ti('Không tải được dữ liệu QC'); }
    finally { setLoading(false); }
  };
  useEffect(() => { setPage(0); load(); /* eslint-disable-next-line */ }, [tab]);

  const filteredLots = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return lots;
    return lots.filter((l) =>
      (l.testCode || '').toLowerCase().includes(k)
      || (l.testName || '').toLowerCase().includes(k)
      || (l.lotNumber || '').toLowerCase().includes(k));
  }, [lots, search]);
  const filteredResults = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return results;
    return results.filter((r) =>
      (r.testCode || '').toLowerCase().includes(k)
      || (r.testName || '').toLowerCase().includes(k)
      || (r.lotNumber || '').toLowerCase().includes(k));
  }, [results, search]);

  const totalPages = Math.max(1, Math.ceil((tab === 'lots' ? filteredLots.length : filteredResults.length) / PER));
  const pagedLots = filteredLots.slice(page * PER, (page + 1) * PER);
  const pagedRes = filteredResults.slice(page * PER, (page + 1) * PER);

  const lotKpis = useMemo(() => {
    const today = dayjs();
    const expired = lots.filter((l) => dayjs(l.expiryDate).isBefore(today)).length;
    const soon = lots.filter((l) => {
      const d = dayjs(l.expiryDate);
      return d.isAfter(today) && d.diff(today, 'day') < 30;
    }).length;
    const active = lots.filter((l) => l.isActive).length;
    return [
      { lbl: 'Tổng lô', val: lots.length, sub: 'tất cả' },
      { lbl: 'Đang dùng', val: active, sub: `${Math.round((active / Math.max(1, lots.length)) * 100)}%`, tone: 'ok' as const },
      { lbl: 'Sắp hết hạn', val: soon, sub: '< 30 ngày', tone: 'warn' as const },
      { lbl: 'Hết hạn', val: expired, sub: 'cần thay', tone: 'crit' as const },
    ];
  }, [lots]);

  const resKpis = useMemo(() => {
    const violations = results.filter((r) => r.isViolation).length;
    const avgZ = results.length ? (results.reduce((s, r) => s + Math.abs(r.zScore), 0) / results.length) : 0;
    const tests = new Set(results.map((r) => r.testCode));
    return [
      { lbl: 'Tổng KQ', val: results.length, sub: '30 ngày qua' },
      { lbl: 'Trong giới hạn', val: results.length - violations, sub: 'OK', tone: 'ok' as const },
      { lbl: 'Vi phạm Westgard', val: violations, sub: `${Math.round((violations / Math.max(1, results.length)) * 100)}%`, tone: 'crit' as const },
      { lbl: 'TB |Z-score|', val: avgZ.toFixed(2), sub: tests.size + ' xét nghiệm' },
    ];
  }, [results]);

  const lotCols: ColumnDef<QCLot>[] = [
    { key: 'lot', label: 'Lô', code: true, render: (r) => r.lotNumber },
    { key: 'test', label: 'Xét nghiệm', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.testName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.testCode}</div>
      </div>
    ) },
    { key: 'level', label: 'Mức', render: (r) => <StatusBadge tone="info">{LEVEL_LABEL[r.level] || '—'}</StatusBadge> },
    { key: 'mfg', label: 'NSX', render: (r) => r.manufacturer || '—' },
    { key: 'mean', label: 'Mean ± SD', mono: true, render: (r) => `${r.targetMean} ± ${r.targetSD}` },
    { key: 'unit', label: 'Đơn vị', mono: true, render: (r) => r.unit || '—' },
    { key: 'exp', label: 'HSD', mono: true, render: (r) => {
      const d = dayjs(r.expiryDate);
      const expired = d.isBefore(dayjs());
      const soon = !expired && d.diff(dayjs(), 'day') < 30;
      return <span style={{ color: expired ? 'var(--a-rd-text)' : soon ? 'var(--a-or-text)' : undefined }}>
        {d.format('DD/MM/YYYY')}
      </span>;
    } },
    { key: 'st', label: 'TT', render: (r) => (
      <StatusBadge tone={r.isActive ? 'ok' : 'warn'} dot>{r.isActive ? 'Active' : 'Inactive'}</StatusBadge>
    ) },
  ];

  const resCols: ColumnDef<QCResult>[] = [
    { key: 'date', label: 'Thời gian', mono: true, render: (r) => dayjs(r.runDate).format('DD/MM HH:mm') },
    { key: 'test', label: 'Xét nghiệm', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.testName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.testCode} · Lô {r.lotNumber}</div>
      </div>
    ) },
    { key: 'level', label: 'Mức', render: (r) => LEVEL_LABEL[r.level] || '—' },
    { key: 'val', label: 'Giá trị', mono: true, render: (r) => <b>{r.value}</b> },
    { key: 'mean', label: 'Mean ± SD', mono: true, render: (r) => `${r.mean} ± ${r.sd}` },
    { key: 'z', label: 'Z-score', mono: true, render: (r) => {
      const abs = Math.abs(r.zScore);
      const tone = abs >= 3 ? 'var(--a-rd-text)' : abs >= 2 ? 'var(--a-or-text)' : 'var(--t-0)';
      return <span style={{ color: tone, fontWeight: 600 }}>{r.zScore.toFixed(2)}</span>;
    } },
    { key: 'rule', label: 'Westgard', render: (r) => r.isViolation
      ? <StatusBadge tone="crit" dot>{r.westgardRule || 'Vi phạm'}</StatusBadge>
      : <StatusBadge tone="ok" dot>OK</StatusBadge>
    },
    { key: 'ana', label: 'Máy XN', render: (r) => r.analyzerName || '—' },
  ];

  const lotActions = (r: QCLot) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSelLot(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEditLot(r)} />
      <ActBtn ic="activity" title="Chạy QC" onClick={() => tk(`Đã mở chạy QC cho lô ${r.lotNumber}`)} />
      <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => delLot(r)} />
    </div>
  );
  const resActions = (r: QCResult) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSelRes(r)} />
      <ActBtn ic="activity" title="Levey-Jennings" onClick={() => tk(`Mở chart cho ${r.testName}`)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={tab === 'lots' ? lotKpis : resKpis} />

      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} actions={
        <>
          <Btn variant="ghost" onClick={load}>
            <Ico name="refresh" size={12} /> Làm mới
          </Btn>
          {tab === 'lots' && <Btn variant="primary" onClick={openCreateLot}>
            <Ico name="plus" size={12} /> Thêm lô
          </Btn>}
          {tab === 'results' && <Btn variant="primary" onClick={() => tk('Mở form chạy QC')}>
            <Ico name="activity" size={12} /> Chạy QC
          </Btn>}
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder={tab === 'lots' ? 'Tìm mã/tên XN, số lô…' : 'Tìm mã/tên XN…'} />
        <Btn variant="ghost" onClick={() => setSearch('')}>
          <Ico name="x" size={12} /> Xóa lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={() => tk('Đã xuất Excel')}>
          <Ico name="download" size={12} /> Xuất Excel
        </Btn>
      </div>

      {tab === 'lots' ? (
        <>
          <DataTable<QCLot>
            columns={lotCols} data={pagedLots} rowKey={(r) => r.id}
            onRowClick={setSelLot} actions={lotActions}
            empty={loading ? 'Đang tải…' : 'Chưa có lô QC'}
          />
          <Pager page={page} setPage={setPage} totalPages={totalPages} total={filteredLots.length} perPage={PER} />
        </>
      ) : (
        <>
          <DataTable<QCResult>
            columns={resCols} data={pagedRes} rowKey={(r) => r.id}
            onRowClick={setSelRes} actions={resActions}
            empty={loading ? 'Đang tải…' : 'Chưa có kết quả QC'}
          />
          <Pager page={page} setPage={setPage} totalPages={totalPages} total={filteredResults.length} perPage={PER} />
        </>
      )}

      <DrawerShell
        open={!!selLot}
        onClose={() => setSelLot(null)}
        size="lg"
        title={selLot ? `Lô QC · ${selLot.lotNumber}` : ''}
        sub={selLot ? `${selLot.testCode} · ${selLot.testName}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSelLot(null)}>Đóng</Btn>
          <Btn onClick={() => { if (selLot) openEditLot(selLot); setSelLot(null); }}>
            <Ico name="edit" size={12} /> Sửa lô
          </Btn>
          <Btn variant="primary" onClick={() => tk(`Đã mở chạy QC ${selLot?.lotNumber}`)}>
            <Ico name="activity" size={12} /> Chạy QC
          </Btn>
        </>}
      >
        {selLot && <>
          <DrSec title="Thông tin lô">
            <DrField lbl="Số lô"><span style={{ fontFamily: 'var(--font-mono)' }}>{selLot.lotNumber}</span></DrField>
            <DrField lbl="Xét nghiệm">{selLot.testCode} · {selLot.testName}</DrField>
            <DrField lbl="Mức QC">{LEVEL_LABEL[selLot.level] || '—'}</DrField>
            <DrField lbl="Nhà sản xuất">{selLot.manufacturer || '—'}</DrField>
            <DrField lbl="Hạn dùng">{dayjs(selLot.expiryDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Hoạt động">
              <StatusBadge tone={selLot.isActive ? 'ok' : 'warn'} dot>
                {selLot.isActive ? 'Đang dùng' : 'Tạm ngưng'}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Mục tiêu (target)">
            <DrField lbl="Mean"><span style={{ fontFamily: 'var(--font-mono)' }}>{selLot.targetMean} {selLot.unit}</span></DrField>
            <DrField lbl="SD"><span style={{ fontFamily: 'var(--font-mono)' }}>{selLot.targetSD}</span></DrField>
            <DrField lbl="±2 SD"><span style={{ fontFamily: 'var(--font-mono)' }}>
              {(selLot.targetMean - 2 * selLot.targetSD).toFixed(2)} – {(selLot.targetMean + 2 * selLot.targetSD).toFixed(2)}
            </span></DrField>
            <DrField lbl="±3 SD"><span style={{ fontFamily: 'var(--font-mono)' }}>
              {(selLot.targetMean - 3 * selLot.targetSD).toFixed(2)} – {(selLot.targetMean + 3 * selLot.targetSD).toFixed(2)}
            </span></DrField>
          </DrSec>
        </>}
      </DrawerShell>

      <DrawerShell
        open={!!selRes}
        onClose={() => setSelRes(null)}
        size="lg"
        title={selRes ? `KQ QC · ${selRes.testName}` : ''}
        sub={selRes ? `Lô ${selRes.lotNumber} · ${dayjs(selRes.runDate).format('DD/MM HH:mm')}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSelRes(null)}>Đóng</Btn>
          <Btn variant="primary" onClick={() => tk('Mở Levey-Jennings')}>
            <Ico name="activity" size={12} /> L-J Chart
          </Btn>
        </>}
      >
        {selRes && <>
          <DrSec title="Kết quả">
            <DrField lbl="Thời gian">{dayjs(selRes.runDate).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Xét nghiệm">{selRes.testCode} · {selRes.testName}</DrField>
            <DrField lbl="Lô">{selRes.lotNumber} · {LEVEL_LABEL[selRes.level]}</DrField>
            <DrField lbl="Giá trị"><b style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{selRes.value}</b></DrField>
          </DrSec>
          <DrSec title="Đánh giá thống kê">
            <DrField lbl="Mean ± SD"><span style={{ fontFamily: 'var(--font-mono)' }}>{selRes.mean} ± {selRes.sd}</span></DrField>
            <DrField lbl="Z-score">
              <span style={{
                fontFamily: 'var(--font-mono)', fontWeight: 600,
                color: Math.abs(selRes.zScore) >= 3 ? 'var(--a-rd-text)' : Math.abs(selRes.zScore) >= 2 ? 'var(--a-or-text)' : 'var(--a-em-text)',
              }}>{selRes.zScore.toFixed(3)}</span>
            </DrField>
            <DrField lbl="Westgard">
              {selRes.isViolation
                ? <StatusBadge tone="crit" dot>{selRes.westgardRule || 'Vi phạm'}</StatusBadge>
                : <StatusBadge tone="ok" dot>OK</StatusBadge>}
            </DrField>
          </DrSec>
          <DrSec title="Quá trình">
            <DrField lbl="Máy XN">{selRes.analyzerName || '—'}</DrField>
            <DrField lbl="KTV">{selRes.operatorName || '—'}</DrField>
            <DrField lbl="Ghi chú">{selRes.notes || '—'}</DrField>
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật lô QC' : 'Thêm lô QC'}
        fields={LOT_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          if (editing && crudInit?.id) await updateQCLot(String(crudInit.id), v);
          else await createQCLot(v);
          tk(editing ? 'Đã cập nhật lô QC' : 'Đã thêm lô QC');
          load();
        }}
      />
    </div>
  );
};

export default LabQCV2;
