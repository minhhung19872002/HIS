import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchCases, createCase, updateCase, getOutcomeReport } from '../api/traumaRegistry';
import type { TraumaCase, TraumaOutcomeReport } from '../api/traumaRegistry';
import { normalizeArrayResponse } from '../utils/apiNormalize';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, ti, Ico,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

const TRAUMA_FIELDS: CrudFieldCfg[] = [
  { key: 'caseCode', label: 'Mã ca', required: true, disabledOnEdit: true },
  { key: 'patientName', label: 'Họ tên BN', required: true },
  { key: 'patientCode', label: 'Mã BN' },
  { key: 'injuryDate', label: 'Ngày bị thương', type: 'date' },
  { key: 'admissionDate', label: 'Ngày nhập viện', type: 'date', required: true },
  { key: 'injuryType', label: 'Loại chấn thương', required: true },
  { key: 'injuryMechanism', label: 'Cơ chế' },
  { key: 'triageCategory', label: 'Phân loại Triage', type: 'select', required: true, options: [
    { value: 'red', label: 'ĐỎ · Cấp cứu' }, { value: 'yellow', label: 'VÀNG · Khẩn cấp' },
    { value: 'green', label: 'XANH · Trì hoãn' }, { value: 'black', label: 'ĐEN · Tử vong' }] },
  { key: 'issScore', label: 'ISS', type: 'number' },
  { key: 'rtsScore', label: 'RTS', type: 'number' },
  { key: 'gcsScore', label: 'GCS', type: 'number' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Nhập viện' }, { value: 1, label: 'ICU' }, { value: 2, label: 'Khoa' },
    { value: 3, label: 'Xuất viện' }, { value: 4, label: 'Tử vong' }] },
  { key: 'attendingDoctor', label: 'BS điều trị' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const TRIAGE_LABEL: Record<string, string> = {
  red: 'ĐỎ · Cấp cứu', yellow: 'VÀNG · Khẩn cấp', green: 'XANH · Trì hoãn', black: 'ĐEN · Tử vong',
};
const TRIAGE_TONE: Record<string, 'ok' | 'info' | 'warn' | 'crit'> = {
  red: 'crit', yellow: 'warn', green: 'ok', black: 'info',
};

type SKey = 'admitted' | 'icu' | 'ward' | 'discharged' | 'deceased';
const STATUS_TABS = [
  { v: 'admitted' as SKey,   l: 'Mới nhập',     tone: 'warn' as const },
  { v: 'icu' as SKey,        l: 'ICU',          tone: 'crit' as const },
  { v: 'ward' as SKey,       l: 'Khoa',         tone: 'info' as const },
  { v: 'discharged' as SKey, l: 'Ra viện',      tone: 'ok' as const },
  { v: 'deceased' as SKey,   l: 'Tử vong',      tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'admitted' : n === 1 ? 'icu' : n === 2 ? 'ward' : n === 3 ? 'discharged' : 'deceased';

const PER = 18;

const TraumaRegistryV2: React.FC = () => {
  const [items, setItems] = useState<TraumaCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fTriage, setFTriage] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<TraumaCase | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchCases({ keyword: search });
      setItems(normalizeArrayResponse<TraumaCase>(r));
    } catch { ti('Không tải được ca chấn thương'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fTriage && r.triageCategory !== fTriage) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.caseCode, r.injuryMechanism, r.injuryType]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fTriage]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<TraumaCase>[] = [
    { key: 'code', label: 'Mã ca', code: true, render: (r) => r.caseCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'mech', label: 'Cơ chế', render: (r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.injuryMechanism}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.injuryType}</div>
      </div>
    ) },
    { key: 'triage', label: 'Triage', render: (r) => (
      <StatusBadge tone={TRIAGE_TONE[r.triageCategory] || 'info'} dot>
        {(TRIAGE_LABEL[r.triageCategory] || r.triageCategory).split(' · ')[0]}
      </StatusBadge>
    ) },
    { key: 'iss', label: 'ISS', mono: true, render: (r) => (
      <span style={{ color: r.issScore >= 25 ? 'var(--a-rd-text)' : r.issScore >= 16 ? 'var(--a-or-text)' : undefined, fontWeight: 600 }}>
        {r.issScore}
      </span>
    ) },
    { key: 'gcs', label: 'GCS', mono: true, render: (r) => r.gcsScore },
    { key: 'date', label: 'Bị thương', mono: true, render: (r) => dayjs(r.injuryDate).format('DD/MM HH:mm') },
    { key: 'sx', label: 'PT', render: (r) => r.surgeryRequired
      ? <StatusBadge tone="warn" dot>Cần PT</StatusBadge>
      : <span style={{ color: 'var(--t-2)' }}>—</span>
    },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{t?.l || '—'}</StatusBadge>;
    } },
  ];

  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState<TraumaOutcomeReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const openReport = async () => {
    setReportLoading(true);
    setReportOpen(true);
    try {
      const r = await getOutcomeReport();
      setReportData(r);
    } catch { ti('Không tải được báo cáo kết cục'); setReportOpen(false); }
    finally { setReportLoading(false); }
  };

  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const openCreate = () => { setCrudInit({ status: 0, triageCategory: 'yellow' }); setCrudOpen(true); };
  const openEdit = (r: TraumaCase) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };

  const actions = (r: TraumaCase) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Cập nhật" onClick={() => openEdit(r)} />
    </div>
  );

  const triageOpts = Object.entries(TRIAGE_LABEL).map(([v, l]) => ({ v, l }));

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng ca', val: items.length, sub: 'tất cả' },
        { lbl: 'Triage đỏ', val: items.filter((c) => c.triageCategory === 'red').length, sub: 'cấp cứu', tone: 'crit' },
        { lbl: 'Đang ICU', val: counts.icu || 0, sub: 'hồi sức', tone: 'warn' },
        { lbl: 'Cần phẫu thuật', val: items.filter((c) => c.surgeryRequired).length, sub: 'cần PT', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã ca / cơ chế…" />
        <Filter value={fTriage} onChange={setFTriage} options={triageOpts} placeholder="▾ Triage" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFTriage(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="primary" onClick={openCreate}>
          <Ico name="plus" size={12} /> Đăng ký ca
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<TraumaCase>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có ca chấn thương'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Ca ${sel.caseCode}` : ''}
        sub={sel ? `${sel.patientName} · ${sel.injuryType}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => { setSel(null); openReport(); }}>
            <Ico name="print" size={12} /> In báo cáo
          </Btn>
          <Btn variant="primary" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>
            <Ico name="edit" size={12} /> Cập nhật
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Bệnh nhân">
            <DrField lbl="Mã ca"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.caseCode}</span></DrField>
            <DrField lbl="Họ tên">{sel.patientName} · {sel.patientCode}</DrField>
          </DrSec>
          <DrSec title="Chấn thương">
            <DrField lbl="Bị thương lúc">{dayjs(sel.injuryDate).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Nhập viện lúc">{dayjs(sel.admissionDate).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Cơ chế">{sel.injuryMechanism}</DrField>
            <DrField lbl="Loại">{sel.injuryType}</DrField>
            <DrField lbl="Triage">
              <StatusBadge tone={TRIAGE_TONE[sel.triageCategory] || 'info'} dot>
                {TRIAGE_LABEL[sel.triageCategory] || sel.triageCategory}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Điểm đánh giá">
            <div style={{ padding: 14, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 6 }}>
              <Line label="ISS · Injury Severity" value={sel.issScore} tone={sel.issScore >= 25 ? 'crit' : sel.issScore >= 16 ? 'warn' : 'ok'} />
              <Line label="RTS · Revised Trauma" value={sel.rtsScore} />
              <Line label="GCS · Glasgow Coma" value={sel.gcsScore} tone={sel.gcsScore <= 8 ? 'crit' : sel.gcsScore <= 12 ? 'warn' : 'ok'} />
            </div>
          </DrSec>
          <DrSec title="Điều trị">
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_TABS.find((x) => x.v === sKey(sel.status))?.l || '—'}
              </StatusBadge>
            </DrField>
            <DrField lbl="Cần phẫu thuật">{sel.surgeryRequired ? 'Có' : 'Không'}</DrField>
            {sel.icuDays !== undefined && <DrField lbl="Ngày ICU"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.icuDays}</span></DrField>}
            {sel.ventilatorDays !== undefined && <DrField lbl="Ngày thở máy"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.ventilatorDays}</span></DrField>}
            {sel.lengthOfStay !== undefined && <DrField lbl="Tổng ngày NV"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.lengthOfStay}</span></DrField>}
            <DrField lbl="BS phụ trách">{sel.attendingDoctor}</DrField>
            <DrField lbl="Kết quả">{sel.outcome}</DrField>
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>

      <DrawerShell
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        size="md"
        title="Báo cáo kết cục chấn thương"
        sub="Tổng hợp outcome · triage · loại chấn thương"
        footer={<>
          <Btn variant="ghost" onClick={() => setReportOpen(false)}>Đóng</Btn>
          <Btn variant="primary" onClick={() => window.print()}>
            <Ico name="print" size={12} /> In báo cáo
          </Btn>
        </>}
      >
        {reportLoading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-2)' }}>Đang tải…</div>}
        {!reportLoading && reportData && <>
          <DrSec title="Tổng quan">
            <DrField lbl="Tổng ca"><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{reportData.totalCases}</span></DrField>
          </DrSec>
          <DrSec title="Kết cục điều trị">
            {reportData.outcomeBreakdown.map((o) => (
              <DrField key={o.outcome} lbl={o.outcome}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{o.count} <span style={{ color: 'var(--t-2)' }}>({o.percentage.toFixed(1)}%)</span></span>
              </DrField>
            ))}
          </DrSec>
          <DrSec title="Phân loại Triage">
            {reportData.triageBreakdown.map((t) => (
              <DrField key={t.category} lbl={t.category}>
                <StatusBadge tone={TRIAGE_TONE[t.category] || 'info'}>{t.count}</StatusBadge>
              </DrField>
            ))}
          </DrSec>
          <DrSec title="Loại chấn thương">
            {reportData.injuryTypeBreakdown.map((i) => (
              <DrField key={i.type} lbl={i.type}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{i.count}</span>
              </DrField>
            ))}
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật ca chấn thương' : 'Đăng ký ca chấn thương'}
        fields={TRAUMA_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          if (editing && crudInit?.id) await updateCase(String(crudInit.id), v);
          else await createCase(v);
          tk(editing ? 'Đã cập nhật ca' : 'Đã đăng ký ca');
          load();
        }}
      />
    </div>
  );
};

const Line: React.FC<{ label: string; value: React.ReactNode; tone?: 'ok' | 'crit' | 'info' | 'warn' }> = ({ label, value, tone }) => {
  const color = tone === 'ok' ? 'var(--a-em-text)'
    : tone === 'crit' ? 'var(--a-rd-text)'
    : tone === 'info' ? 'var(--a-cy-text)'
    : tone === 'warn' ? 'var(--a-or-text)'
    : 'var(--t-0)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 'var(--fs-md)', color }}>
      <span>{label}</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{value}</span>
    </div>
  );
};

export default TraumaRegistryV2;
