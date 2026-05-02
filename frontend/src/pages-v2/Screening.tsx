import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getScreeningRequests } from '../api/screening';
import type { ScreeningRequest } from '../api/screening';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const STATUS_LABEL: Record<number, string> = {
  0: 'Chờ', 1: 'Đã lấy mẫu', 2: 'Đang xử lý', 3: 'Có KQ', 4: 'Hoàn tất',
};

type TypeKey = 'all' | 'newborn' | 'prenatal';
const TYPE_TABS = [
  { v: 'all' as TypeKey, l: 'Tất cả', ic: 'list' },
  { v: 'newborn' as TypeKey, l: 'Sàng lọc sơ sinh', ic: 'heart' },
  { v: 'prenatal' as TypeKey, l: 'Sàng lọc tiền sản', ic: 'user' },
];

type SKey = 'pending' | 'processing' | 'ready' | 'done';
const STATUS_TABS = [
  { v: 'pending' as SKey,    l: 'Chờ',         tone: 'warn' as const },
  { v: 'processing' as SKey, l: 'Đang xử lý',  tone: 'info' as const },
  { v: 'ready' as SKey,      l: 'Có KQ',       tone: 'ok' as const },
  { v: 'done' as SKey,       l: 'Hoàn tất',    tone: 'ok' as const },
];

const sKey = (n: number): SKey => n === 0 ? 'pending' : (n === 1 || n === 2) ? 'processing' : n === 3 ? 'ready' : 'done';

const PER = 18;

const ScreeningV2: React.FC = () => {
  const [items, setItems] = useState<ScreeningRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tType, setTType] = useState<TypeKey>('all');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<ScreeningRequest | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getScreeningRequests({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as ScreeningRequest[];
      setItems(list);
    } catch { setItems([]); ti('Không tải được danh sách sàng lọc'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (tType !== 'all' && r.screeningType !== tType) return false;
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.requestCode, r.babyName, r.motherName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, tType, stab]);

  const counts = useMemo(() => {
    const baseList = tType === 'all' ? items : items.filter((r) => r.screeningType === tType);
    const c: Record<string, number> = { all: baseList.length };
    STATUS_TABS.forEach((s) => { c[s.v] = baseList.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items, tType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<ScreeningRequest>[] = [
    { key: 'code', label: 'Mã YC', code: true, render: (r) => r.requestCode },
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone={r.screeningType === 'newborn' ? 'info' : 'warn'}>
        {r.screeningType === 'newborn' ? 'Sơ sinh' : 'Tiền sản'}
      </StatusBadge>
    ) },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'subj', label: 'Đối tượng', render: (r) => r.screeningType === 'newborn'
      ? (r.babyName || 'Bé chưa đặt tên')
      : `${r.pregnancyWeek || '?'} tuần thai`,
    },
    { key: 'bar', label: 'Barcode', code: true, render: (r) => r.sampleBarcode || '—' },
    { key: 'date', label: 'Ngày YC', mono: true, render: (r) => dayjs(r.requestDate).format('DD/MM HH:mm') },
    { key: 'res', label: 'Số KQ', mono: true, render: (r) => r.results?.length || 0 },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const k = sKey(r.status);
      const t = STATUS_TABS.find((x) => x.v === k);
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: ScreeningRequest) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="print" title="In phiếu" onClick={() => tk(`Đã in ${r.requestCode}`)} />
    </div>
  );

  const newborn = items.filter((r) => r.screeningType === 'newborn').length;
  const prenatal = items.filter((r) => r.screeningType === 'prenatal').length;
  const ready = items.filter((r) => r.status >= 3).length;

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng yêu cầu', val: items.length, sub: 'tất cả' },
        { lbl: 'Sàng lọc sơ sinh', val: newborn, sub: `${Math.round((newborn / Math.max(1, items.length)) * 100)}%`, tone: 'info' },
        { lbl: 'Sàng lọc tiền sản', val: prenatal, sub: `${Math.round((prenatal / Math.max(1, items.length)) * 100)}%`, tone: 'warn' },
        { lbl: 'Có kết quả', val: ready, sub: `${Math.round((ready / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
      ]} />

      <TopTabs<TypeKey> tab={tType} setTab={(v) => { setTType(v); setStab('all'); setPage(0); }} tabs={TYPE_TABS} actions={
        <>
          <button className="ab-btn ghost" type="button" onClick={load}>
            <Ico name="refresh" size={12} /> Làm mới
          </button>
          <button className="ab-btn primary" type="button" onClick={() => tk('Mở form yêu cầu sàng lọc')}>
            <Ico name="plus" size={12} /> Yêu cầu mới
          </button>
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã YC / tên bé…" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setStab('all'); setTType('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={() => tk('Đã xuất Excel')}>
          <Ico name="download" size={12} /> Xuất Excel
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<ScreeningRequest>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có yêu cầu sàng lọc'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Sàng lọc · ${sel.requestCode}` : ''}
        sub={sel ? (sel.screeningType === 'newborn' ? 'Sàng lọc sơ sinh' : 'Sàng lọc tiền sản') : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in phiếu')}>
            <Ico name="print" size={12} /> In KQ
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở nhập kết quả')}>
            <Ico name="edit" size={12} /> Nhập kết quả
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Thông tin chung">
            <DrField lbl="Mã YC"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.requestCode}</span></DrField>
            <DrField lbl="Loại sàng lọc">{sel.screeningType === 'newborn' ? 'Sơ sinh' : 'Tiền sản'}</DrField>
            <DrField lbl="Bệnh nhân">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Ngày yêu cầu">{dayjs(sel.requestDate).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          {sel.screeningType === 'newborn' ? (
            <DrSec title="Thông tin bé">
              <DrField lbl="Tên bé">{sel.babyName || '—'}</DrField>
              <DrField lbl="Ngày sinh">{sel.birthDate ? dayjs(sel.birthDate).format('DD/MM/YYYY') : '—'}</DrField>
              <DrField lbl="Giới tính">{sel.babyGender === 1 ? 'Nam' : sel.babyGender === 2 ? 'Nữ' : '—'}</DrField>
              <DrField lbl="Cân nặng">{sel.birthWeight ? `${sel.birthWeight} g` : '—'}</DrField>
              <DrField lbl="Tuần thai">{sel.gestationalAge || '—'}</DrField>
              <DrField lbl="Mẹ">{sel.motherName || '—'}</DrField>
              <DrField lbl="PP sinh">{sel.deliveryMethod || '—'}</DrField>
              <DrField lbl="APGAR">{sel.apgarScore || '—'}</DrField>
            </DrSec>
          ) : (
            <DrSec title="Thông tin thai phụ">
              <DrField lbl="Tuần thai">{sel.pregnancyWeek ? `${sel.pregnancyWeek} tuần` : '—'}</DrField>
              <DrField lbl="Tuổi mẹ">{sel.maternalAge || '—'}</DrField>
              <DrField lbl="Lần thai (G/P)">{sel.gravida || '—'} / {sel.para || '—'}</DrField>
              <DrField lbl="Kinh cuối">{sel.lastMenstrualDate ? dayjs(sel.lastMenstrualDate).format('DD/MM/YYYY') : '—'}</DrField>
              <DrField lbl="Siêu âm">{sel.ultrasoundDate ? dayjs(sel.ultrasoundDate).format('DD/MM/YYYY') : '—'}</DrField>
              <DrField lbl="Tiền sử">{sel.previousConditions || '—'}</DrField>
              <DrField lbl="Tiền sử GĐ">{sel.familyHistory || '—'}</DrField>
            </DrSec>
          )}
          <DrSec title="Mẫu xét nghiệm">
            <DrField lbl="Barcode"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.sampleBarcode || '—'}</span></DrField>
            <DrField lbl="Lấy mẫu">{sel.collectionDate ? dayjs(sel.collectionDate).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
          </DrSec>
          {sel.results && sel.results.length > 0 && (
            <DrSec title={`Kết quả (${sel.results.length})`}>
              {sel.results.map((res) => {
                const tone = res.interpretation === 'critical' ? 'crit'
                  : res.interpretation === 'abnormal' ? 'warn'
                  : res.interpretation === 'borderline' ? 'info' : 'ok';
                return (
                  <div key={res.id} style={{
                    padding: 10, marginBottom: 8, background: 'var(--d-1)',
                    border: '1px solid var(--line)', borderRadius: 6,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <b style={{ color: 'var(--t-0)' }}>{res.testName}</b>
                      <StatusBadge tone={tone} dot>{res.interpretation}</StatusBadge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t-1)' }}>
                      Giá trị: <b style={{ fontFamily: 'var(--font-mono)' }}>{res.value ?? '—'} {res.unit}</b>
                      {res.cutoff !== undefined && <> · Cutoff: <span style={{ fontFamily: 'var(--font-mono)' }}>{res.cutoff}</span></>}
                    </div>
                  </div>
                );
              })}
            </DrSec>
          )}
        </>}
      </DrawerShell>
    </div>
  );
};

export default ScreeningV2;
