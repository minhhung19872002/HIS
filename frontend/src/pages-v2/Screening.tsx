import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getScreeningRequests, createScreeningRequest } from '../modules/laboratory/api/screening';
import type { ScreeningRequest } from '../modules/laboratory/api/screening';
import { normalizeArrayResponse } from '../utils/apiNormalize';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, useTabCounts, tk, ti, Ico,
  type ColumnDef, type StatusTab, type CrudFieldCfg,
} from './_v2kit';

type Tab = 'newborn' | 'prenatal';
const TOP_TABS = [
  { v: 'newborn' as Tab, l: 'Sơ sinh', ic: 'user' },
  { v: 'prenatal' as Tab, l: 'Trước sinh', ic: 'heart' },
];

type StatusKey = 'pending' | 'collected' | 'processing' | 'ready' | 'completed';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'pending',    l: 'Chờ lấy mẫu',  tone: 'info' },
  { v: 'collected',  l: 'Đã lấy mẫu',   tone: 'warn' },
  { v: 'processing', l: 'Đang chạy',    tone: 'warn' },
  { v: 'ready',      l: 'Có kết quả',   tone: 'ok' },
  { v: 'completed',  l: 'Hoàn tất',     tone: 'ok' },
];
const statusKey = (s: number): StatusKey =>
  s === 1 ? 'collected' : s === 2 ? 'processing' : s === 3 ? 'ready' : s === 4 ? 'completed' : 'pending';

const INTERP_TONE: Record<string, 'ok' | 'warn' | 'crit' | 'info'> = {
  normal: 'ok', borderline: 'warn', abnormal: 'crit', critical: 'crit',
};
const INTERP_LABEL: Record<string, string> = {
  normal: 'Bình thường', borderline: 'Ranh giới', abnormal: 'Bất thường', critical: 'Nguy hiểm',
};
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const NEWBORN_FIELDS: CrudFieldCfg[] = [
  { key: 'babyName', label: 'Tên trẻ', required: true },
  { key: 'babyGender', label: 'Giới tính', type: 'select', required: true,
    options: [{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }] },
  { key: 'birthDate', label: 'Ngày sinh', type: 'date', required: true },
  { key: 'birthWeight', label: 'Cân nặng (g)', type: 'number', required: true },
  { key: 'gestationalAge', label: 'Tuổi thai (tuần)', type: 'number', required: true },
  { key: 'apgarScore', label: 'Điểm Apgar' },
  { key: 'motherName', label: 'Tên mẹ', required: true },
  { key: 'motherAge', label: 'Tuổi mẹ', type: 'number' },
  { key: 'deliveryMethod', label: 'Phương pháp sinh', type: 'select',
    options: [
      { value: 'vaginal', label: 'Thường' },
      { value: 'csection', label: 'Mổ lấy thai' },
      { value: 'vacuum', label: 'Hút' },
      { value: 'forceps', label: 'Forceps' },
    ] },
  { key: 'feedingType', label: 'Nuôi dưỡng', type: 'select',
    options: [
      { value: 'breastfed', label: 'Bú mẹ' },
      { value: 'formula', label: 'Sữa công thức' },
      { value: 'mixed', label: 'Hỗn hợp' },
    ] },
  { key: 'birthCondition', label: 'Tình trạng lúc sinh' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const PRENATAL_FIELDS: CrudFieldCfg[] = [
  { key: 'patientName', label: 'Họ tên thai phụ', required: true },
  { key: 'patientCode', label: 'Mã BN' },
  { key: 'maternalAge', label: 'Tuổi mẹ', type: 'number', required: true },
  { key: 'pregnancyWeek', label: 'Thai kỳ (tuần)', type: 'number', required: true },
  { key: 'lastMenstrualDate', label: 'Ngày kinh cuối (KKC)', type: 'date' },
  { key: 'ultrasoundDate', label: 'Ngày siêu âm', type: 'date' },
  { key: 'gravida', label: 'Số lần có thai (G)', type: 'number' },
  { key: 'para', label: 'Số lần sinh (P)', type: 'number' },
  { key: 'previousConditions', label: 'Tiền sử thai kỳ', type: 'textarea' },
  { key: 'familyHistory', label: 'Tiền sử gia đình', type: 'textarea' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const PER = 20;

const ScreeningV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('newborn');
  const [rows, setRows] = useState<ScreeningRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [page, setPage] = useState(0);

  const [sel, setSel] = useState<ScreeningRequest | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getScreeningRequests();
      setRows(normalizeArrayResponse<ScreeningRequest>(data));
    } catch { ti('Không tải được danh sách sàng lọc'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useTabCounts(rows, STATUS_TABS, (r) => statusKey(r.status));

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.screeningType !== tab) return false;
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (!k) return true;
      return [r.patientName, r.babyName, r.motherName, r.requestCode, r.sampleBarcode, r.patientCode]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [rows, search, stab, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const newbornCols: ColumnDef<ScreeningRequest>[] = [
    { key: 'code', label: 'Mã SL', mono: true, width: 120, render: (r) => r.requestCode },
    { key: 'baby', label: 'Trẻ', render: (r) => (
      <div className="cell-2l">
        <b>{r.babyName || '—'}</b>
        <i>{r.babyGender === 1 ? 'Nam' : r.babyGender === 2 ? 'Nữ' : '—'} · {r.birthWeight ? `${r.birthWeight}g` : '—'} · {r.gestationalAge ? `${r.gestationalAge}t` : '—'}</i>
      </div>
    ) },
    { key: 'mother', label: 'Mẹ', width: 160, render: (r) => r.motherName || '—' },
    { key: 'birthDate', label: 'Ngày sinh', mono: true, width: 100, render: (r) => fmtDMY(r.birthDate) },
    { key: 'apgar', label: 'Apgar', mono: true, width: 70, render: (r) => r.apgarScore || '—' },
    { key: 'barcode', label: 'Barcode', mono: true, width: 130, render: (r) => r.sampleBarcode || '—' },
    { key: 'results', label: 'KQ', width: 80, render: (r) => {
      const cnt = r.results?.length || 0;
      if (!cnt) return <span style={{ color: 'var(--t-2)' }}>—</span>;
      const abnormal = r.results.filter((res) => res.interpretation !== 'normal').length;
      return abnormal > 0
        ? <span className="chip crit">{abnormal} BT</span>
        : <span className="chip ok">{cnt} OK</span>;
    } },
    { key: 'status', label: 'TT', width: 120, render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === statusKey(r.status));
      return <StatusBadge tone={t?.tone} dot>{t?.l}</StatusBadge>;
    } },
  ];

  const prenatalCols: ColumnDef<ScreeningRequest>[] = [
    { key: 'code', label: 'Mã SL', mono: true, width: 120, render: (r) => r.requestCode },
    { key: 'patient', label: 'Thai phụ', render: (r) => (
      <div className="cell-2l">
        <b>{r.patientName}</b>
        <i className="mono">{r.patientCode}</i>
      </div>
    ) },
    { key: 'age', label: 'Tuổi mẹ', mono: true, width: 80, render: (r) => r.maternalAge ?? '—' },
    { key: 'week', label: 'Thai kỳ', mono: true, width: 90, render: (r) => r.pregnancyWeek ? `${r.pregnancyWeek} tuần` : '—' },
    { key: 'para', label: 'PARA', mono: true, width: 90, render: (r) => `G${r.gravida || 0}P${r.para || 0}` },
    { key: 'lmp', label: 'KKC', mono: true, width: 100, render: (r) => fmtDMY(r.lastMenstrualDate) },
    { key: 'barcode', label: 'Barcode', mono: true, width: 130, render: (r) => r.sampleBarcode || '—' },
    { key: 'results', label: 'KQ', width: 80, render: (r) => {
      const cnt = r.results?.length || 0;
      if (!cnt) return <span style={{ color: 'var(--t-2)' }}>—</span>;
      const abnormal = r.results.filter((res) => res.interpretation !== 'normal').length;
      return abnormal > 0
        ? <span className="chip crit">{abnormal} nguy cơ</span>
        : <span className="chip ok">Thấp</span>;
    } },
    { key: 'status', label: 'TT', width: 120, render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === statusKey(r.status));
      return <StatusBadge tone={t?.tone} dot>{t?.l}</StatusBadge>;
    } },
  ];

  const columns = tab === 'newborn' ? newbornCols : prenatalCols;

  const rowActions = (r: ScreeningRequest) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Xem chi tiết" onClick={() => setSel(r)} />
    </div>
  );

  const allRows = rows;
  const newborn = allRows.filter((r) => r.screeningType === 'newborn').length;
  const prenatal = allRows.filter((r) => r.screeningType === 'prenatal').length;
  const abnormal = allRows.filter((r) => r.results?.some((res) => res.interpretation !== 'normal')).length;
  const hasResult = allRows.filter((r) => r.status >= 3).length;

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng', val: allRows.length },
        { lbl: 'Sơ sinh', val: newborn, tone: 'info' },
        { lbl: 'Trước sinh', val: prenatal, tone: 'warn' },
        { lbl: 'Bất thường', val: abnormal, sub: 'nguy cơ', tone: 'crit' },
        { lbl: 'Có kết quả', val: hasResult, tone: 'ok' },
        { lbl: 'Hoàn tất', val: allRows.filter((r) => r.status === 4).length, tone: 'ok' },
      ]} />

      <TopTabs<Tab>
        tab={tab}
        setTab={(v) => { setTab(v); setStab('all'); setPage(0); }}
        tabs={TOP_TABS}
        actions={
          <>
            <Btn variant="ghost" onClick={load}>
              <Ico name="refresh" size={12} /> Làm mới
            </Btn>
            <Btn variant="primary" onClick={() => setCreateOpen(true)}>
              <Ico name="plus" size={12} /> {tab === 'newborn' ? 'SL sơ sinh' : 'SL trước sinh'}
            </Btn>
          </>
        }
      />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <SearchBox
          value={search}
          onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder={tab === 'newborn' ? 'Tìm tên trẻ / mẹ / mã / barcode…' : 'Tìm thai phụ / mã BN / mã SL…'}
        />
      </div>

      <StatusTabs<StatusKey>
        value={stab}
        onChange={(v) => { setStab(v); setPage(0); }}
        tabs={STATUS_TABS}
        counts={counts}
      />

      <DataTable<ScreeningRequest>
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={setSel}
        actions={rowActions}
        empty={loading ? 'Đang tải…' : `Không có yêu cầu sàng lọc ${tab === 'newborn' ? 'sơ sinh' : 'trước sinh'}`}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      {/* Chi tiết sàng lọc */}
      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel?.requestCode || ''}
        sub={sel ? `${sel.screeningType === 'newborn' ? 'Sơ sinh' : 'Trước sinh'} · ${fmtDMY(sel.requestDate)}` : ''}
        footer={
          <>
            <Btn variant="ghost" onClick={() => window.print()}>
              <Ico name="print" size={12} /> In phiếu
            </Btn>
            <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          </>
        }
      >
        {sel && (
          <>
            <DrSec title="Thông tin sàng lọc">
              <DrField lbl="Mã SL">
                <span className="mono" style={{ color: 'var(--a-cy)' }}>{sel.requestCode}</span>
              </DrField>
              <DrField lbl="Loại">{sel.screeningType === 'newborn' ? 'Sơ sinh' : 'Trước sinh'}</DrField>
              <DrField lbl="Ngày yêu cầu">{fmtDMY(sel.requestDate)}</DrField>
              <DrField lbl="Barcode mẫu"><span className="mono">{sel.sampleBarcode || '—'}</span></DrField>
              <DrField lbl="Ngày lấy mẫu">{fmtDMY(sel.collectionDate)}</DrField>
              <DrField lbl="Trạng thái">
                {(() => {
                  const t = STATUS_TABS.find((x) => x.v === statusKey(sel.status));
                  return <StatusBadge tone={t?.tone} dot>{t?.l}</StatusBadge>;
                })()}
              </DrField>
            </DrSec>

            {sel.screeningType === 'newborn' && (
              <DrSec title="Thông tin trẻ">
                <DrField lbl="Tên trẻ"><b>{sel.babyName || '—'}</b></DrField>
                <DrField lbl="Giới tính">{sel.babyGender === 1 ? 'Nam' : sel.babyGender === 2 ? 'Nữ' : '—'}</DrField>
                <DrField lbl="Ngày sinh">{fmtDMY(sel.birthDate)}</DrField>
                <DrField lbl="Cân nặng">{sel.birthWeight ? `${sel.birthWeight} g` : '—'}</DrField>
                <DrField lbl="Tuổi thai">{sel.gestationalAge ? `${sel.gestationalAge} tuần` : '—'}</DrField>
                <DrField lbl="Apgar">{sel.apgarScore || '—'}</DrField>
                <DrField lbl="Phương pháp sinh">{sel.deliveryMethod || '—'}</DrField>
                <DrField lbl="Nuôi dưỡng">{sel.feedingType || '—'}</DrField>
                <DrField lbl="Tên mẹ">{sel.motherName || '—'}</DrField>
                {sel.motherAge && <DrField lbl="Tuổi mẹ">{sel.motherAge}</DrField>}
              </DrSec>
            )}

            {sel.screeningType === 'prenatal' && (
              <DrSec title="Thông tin thai phụ">
                <DrField lbl="Họ tên"><b>{sel.patientName}</b></DrField>
                <DrField lbl="Mã BN"><span className="mono">{sel.patientCode}</span></DrField>
                <DrField lbl="Tuổi">{sel.maternalAge ?? '—'}</DrField>
                <DrField lbl="Thai kỳ">{sel.pregnancyWeek ? `${sel.pregnancyWeek} tuần` : '—'}</DrField>
                <DrField lbl="PARA">G{sel.gravida || 0}P{sel.para || 0}</DrField>
                <DrField lbl="Ngày KKC">{fmtDMY(sel.lastMenstrualDate)}</DrField>
                <DrField lbl="Siêu âm gần nhất">{fmtDMY(sel.ultrasoundDate)}</DrField>
                {sel.previousConditions && <DrField lbl="Tiền sử thai kỳ">{sel.previousConditions}</DrField>}
                {sel.familyHistory && <DrField lbl="Tiền sử gia đình">{sel.familyHistory}</DrField>}
              </DrSec>
            )}

            <DrSec title={`Kết quả sàng lọc${sel.results?.length ? ` (${sel.results.length})` : ''}`}>
              {!sel.results?.length ? (
                <div style={{ color: 'var(--t-2)', padding: '8px 0', fontSize: 13 }}>Chưa có kết quả</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sel.results.map((res) => (
                    <div key={res.id} style={{ background: 'var(--bg-1)', borderRadius: 6, padding: '7px 12px', fontSize: 13 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ flex: 1, fontWeight: 500, color: 'var(--t-0)' }}>{res.testName}</span>
                        {res.value !== undefined && (
                          <span className="mono" style={{ color: 'var(--t-1)' }}>
                            {res.value} {res.unit}
                            {res.referenceRange ? ` [${res.referenceRange}]` : ''}
                          </span>
                        )}
                        <span className={`chip ${INTERP_TONE[res.interpretation] || 'info'}`}>
                          {INTERP_LABEL[res.interpretation] || res.interpretation}
                        </span>
                      </div>
                      {res.riskLevel && (
                        <div style={{ color: 'var(--t-2)', fontSize: 12, marginTop: 2 }}>
                          Mức nguy cơ: {res.riskLevel}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </DrSec>

            {sel.notes && (
              <DrSec title="Ghi chú">
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{sel.notes}</div>
              </DrSec>
            )}
          </>
        )}
      </DrawerShell>

      {/* Tạo yêu cầu sàng lọc */}
      <CrudModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={tab === 'newborn' ? 'Sàng lọc sơ sinh' : 'Sàng lọc trước sinh'}
        fields={tab === 'newborn' ? NEWBORN_FIELDS : PRENATAL_FIELDS}
        initial={tab === 'newborn' ? { babyGender: 1, deliveryMethod: 'vaginal', feedingType: 'breastfed' } : { gravida: 1, para: 0 }}
        size="lg"
        onSubmit={async (v) => {
          await createScreeningRequest({ ...v as Partial<ScreeningRequest>, screeningType: tab });
          tk(`Đã tạo yêu cầu sàng lọc ${tab === 'newborn' ? 'sơ sinh' : 'trước sinh'}`);
          load();
        }}
      />
    </div>
  );
};

export default ScreeningV2;
