import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getCouples, getIvfDashboard } from '../api/ivfLab';
import type { IvfCouple, IvfDashboard } from '../api/ivfLab';
import {
  KpiStrip, SearchBox, DataTable, Pager, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const PER = 18;

const IvfLabV2: React.FC = () => {
  const [items, setItems] = useState<IvfCouple[]>([]);
  const [dash, setDash] = useState<IvfDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<IvfCouple | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, d] = await Promise.all([
        getCouples({ keyword: search, pageSize: 200 }),
        getIvfDashboard(),
      ]);
      setItems(list);
      setDash(d);
    } catch { ti('Không tải được dữ liệu IVF'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return items;
    return items.filter((r) =>
      [r.wifeName, r.husbandName, r.wifeCode, r.husbandCode]
        .some((v) => (v || '').toLowerCase().includes(k))
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const calcAge = (dob?: string) => dob ? dayjs().diff(dayjs(dob), 'year') : null;

  const cols: ColumnDef<IvfCouple>[] = [
    { key: 'wife', label: 'Vợ', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.wifeName || '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
          {r.wifeCode || '—'}{calcAge(r.wifeDob) !== null && ` · ${calcAge(r.wifeDob)}t`}
        </div>
      </div>
    ) },
    { key: 'hus', label: 'Chồng', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.husbandName || '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
          {r.husbandCode || '—'}{calcAge(r.husbandDob) !== null && ` · ${calcAge(r.husbandDob)}t`}
        </div>
      </div>
    ) },
    { key: 'mar', label: 'Kết hôn', mono: true, render: (r) => r.marriageDate
      ? dayjs(r.marriageDate).format('DD/MM/YYYY')
      : '—'
    },
    { key: 'dur', label: 'Vô sinh', mono: true, render: (r) => {
      const m = r.infertilityDurationMonths || 0;
      return m >= 12 ? `${(m / 12).toFixed(1)} năm` : `${m} tháng`;
    } },
    { key: 'cause', label: 'Nguyên nhân', render: (r) => r.infertilityCause || '—' },
    { key: 'cyc', label: 'Chu kỳ', mono: true, render: (r) => (
      <span style={{ fontWeight: 600, color: r.cycleCount > 0 ? 'var(--a-em-text)' : 'var(--t-2)' }}>
        {r.cycleCount}
      </span>
    ) },
  ];

  const actions = (r: IvfCouple) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="activity" title="Chu kỳ mới" onClick={() => tk(`Mở chu kỳ mới cho ${r.wifeName}`)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Cặp đôi', val: dash?.totalCouples ?? items.length, sub: 'tổng số', tone: 'info' },
        { lbl: 'Chu kỳ đang HĐ', val: dash?.activeCycles ?? 0, sub: 'IVF/IUI', tone: 'warn' },
        { lbl: 'Phôi đông', val: dash?.frozenEmbryos ?? 0, sub: 'tủ đông', tone: 'ok' },
        { lbl: 'Tỷ lệ TC', val: `${(dash?.successRate ?? 0).toFixed(1)}`, unit: '%', sub: 'thai LS', tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm vợ/chồng / mã BN…" />
        <button className="ab-btn ghost" type="button" onClick={() => setSearch('')}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở quản lý phôi đông')}>
          <Ico name="archive" size={12} /> Phôi đông
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Đăng ký cặp đôi mới')}>
          <Ico name="plus" size={12} /> Đăng ký
        </button>
      </div>

      <DataTable<IvfCouple>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có cặp đôi đăng ký IVF'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `${sel.wifeName || '?'} & ${sel.husbandName || '?'}` : ''}
        sub={sel ? `${sel.cycleCount} chu kỳ điều trị` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Mở các chu kỳ')}>
            <Ico name="activity" size={12} /> Chu kỳ
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở chu kỳ mới')}>
            <Ico name="plus" size={12} /> Chu kỳ mới
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Vợ">
            <DrField lbl="Họ tên">{sel.wifeName || '—'}</DrField>
            <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.wifeCode || '—'}</span></DrField>
            {sel.wifeDob && <DrField lbl="Ngày sinh">{dayjs(sel.wifeDob).format('DD/MM/YYYY')} · {calcAge(sel.wifeDob)}t</DrField>}
          </DrSec>
          <DrSec title="Chồng">
            <DrField lbl="Họ tên">{sel.husbandName || '—'}</DrField>
            <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.husbandCode || '—'}</span></DrField>
            {sel.husbandDob && <DrField lbl="Ngày sinh">{dayjs(sel.husbandDob).format('DD/MM/YYYY')} · {calcAge(sel.husbandDob)}t</DrField>}
          </DrSec>
          <DrSec title="Tiền sử">
            {sel.marriageDate && <DrField lbl="Kết hôn">{dayjs(sel.marriageDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Thời gian vô sinh"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.infertilityDurationMonths} tháng</span></DrField>
            <DrField lbl="Nguyên nhân">{sel.infertilityCause || '—'}</DrField>
            <DrField lbl="Số chu kỳ"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.cycleCount}</span></DrField>
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default IvfLabV2;
