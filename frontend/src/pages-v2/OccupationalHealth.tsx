import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchOccExams } from '../api/occupationalHealth';
import type { OccExam } from '../api/occupationalHealth';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const STATUS_LABEL: Record<number, string> = {
  0: 'Chờ', 1: 'Đang khám', 2: 'Xong', 3: 'Đã chứng nhận',
};

type SKey = 'pending' | 'progress' | 'done' | 'certified';
const STATUS_TABS = [
  { v: 'pending' as SKey,   l: 'Chờ',           tone: 'warn' as const },
  { v: 'progress' as SKey,  l: 'Đang khám',     tone: 'info' as const },
  { v: 'done' as SKey,      l: 'Xong',          tone: 'info' as const },
  { v: 'certified' as SKey, l: 'Đã chứng nhận', tone: 'ok' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'pending' : n === 1 ? 'progress' : n === 2 ? 'done' : 'certified';

const classifyTone = (c: string): 'ok' | 'warn' | 'crit' | 'info' => {
  const k = (c || '').toLowerCase();
  if (k === 'pass' || k === '1') return 'ok';
  if (k === 'restricted' || k === '2') return 'warn';
  if (k === 'fail' || k === '3' || k === '4') return 'crit';
  return 'info';
};
const classifyLabel = (c: string): string => {
  const k = (c || '').toLowerCase();
  if (k === 'pass' || k === '1') return 'Đạt';
  if (k === 'restricted' || k === '2') return 'Hạn chế';
  if (k === 'fail' || k === '3') return 'Không đạt';
  return c || '—';
};

const PER = 18;

const OccupationalHealthV2: React.FC = () => {
  const [items, setItems] = useState<OccExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fComp, setFComp] = useState('');
  const [fHaz, setFHaz] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<OccExam | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await searchOccExams({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as OccExam[];
      setItems(list);
    } catch { ti('Không tải được dữ liệu khám SK nghề nghiệp'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const companies = useMemo(() => {
    const set = new Set(items.map((r) => r.companyName).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);
  const hazards = useMemo(() => {
    const set = new Set(items.flatMap((r) => r.hazardTypes || []).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fComp && r.companyName !== fComp) return false;
      if (fHaz && !(r.hazardTypes || []).includes(fHaz)) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.examCode, r.companyName, r.occupation]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fComp, fHaz]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<OccExam>[] = [
    { key: 'code', label: 'Mã KS', code: true, render: (r) => r.examCode },
    { key: 'pt', label: 'Người LĐ', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.gender === 1 ? 'Nam' : 'Nữ'} · {r.patientCode}</div>
      </div>
    ) },
    { key: 'comp', label: 'Công ty', render: (r) => (
      <div>
        <div>{r.companyName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.department}</div>
      </div>
    ) },
    { key: 'occ', label: 'Nghề', render: (r) => r.occupation },
    { key: 'years', label: 'Năm TX', mono: true, render: (r) => r.yearsOfExposure || 0 },
    { key: 'haz', label: 'Yếu tố', render: (r) => r.hazardTypes?.length
      ? <span style={{ fontSize: 11, color: 'var(--a-or-text)' }}>{r.hazardTypes.join(', ')}</span>
      : <span style={{ color: 'var(--t-2)' }}>—</span>
    },
    { key: 'date', label: 'Ngày khám', mono: true, render: (r) => dayjs(r.examDate).format('DD/MM/YYYY') },
    { key: 'cls', label: 'Phân loại', render: (r) => (
      <StatusBadge tone={classifyTone(r.classification)} dot>{classifyLabel(r.classification)}</StatusBadge>
    ) },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: OccExam) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="print" title="In phiếu" onClick={() => tk(`Đã in ${r.examCode}`)} />
    </div>
  );

  const diseaseCount = items.filter((e) => e.occupationalDisease).length;

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng khám', val: items.length, sub: 'tất cả' },
        { lbl: 'Đã chứng nhận', val: counts.certified || 0, sub: `${Math.round(((counts.certified || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Bệnh nghề nghiệp', val: diseaseCount, sub: 'phát hiện', tone: 'crit' },
        { lbl: 'Hạn chế làm việc', val: items.filter((e) => classifyTone(e.classification) === 'warn').length, sub: 'cần điều chuyển', tone: 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm tên / mã / công ty / nghề…" />
        <Filter value={fComp} onChange={setFComp} options={companies} placeholder="▾ Công ty" />
        <Filter value={fHaz} onChange={setFHaz} options={hazards} placeholder="▾ Yếu tố nguy cơ" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFComp(''); setFHaz(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở khám hàng loạt')}>
          <Ico name="plus" size={12} /> Khám hợp đồng
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<OccExam>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có hồ sơ khám'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.patientName : ''}
        sub={sel ? `${sel.examCode} · ${sel.companyName}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in chứng nhận')}>
            <Ico name="print" size={12} /> In chứng nhận
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở chỉnh sửa')}>
            <Ico name="edit" size={12} /> Cập nhật
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Người lao động">
            <DrField lbl="Mã KS"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.examCode}</span></DrField>
            <DrField lbl="Họ tên">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Giới tính">{sel.gender === 1 ? 'Nam' : 'Nữ'}</DrField>
            <DrField lbl="Ngày sinh">{dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}</DrField>
          </DrSec>
          <DrSec title="Công việc">
            <DrField lbl="Công ty">{sel.companyName} ({sel.companyCode})</DrField>
            <DrField lbl="Khoa/Phòng">{sel.department}</DrField>
            <DrField lbl="Nghề/Vị trí">{sel.occupation}</DrField>
            <DrField lbl="Năm tiếp xúc"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.yearsOfExposure}</span></DrField>
            <DrField lbl="Yếu tố nguy cơ">{sel.hazardTypes?.join(', ') || '—'}</DrField>
          </DrSec>
          <DrSec title="Khám">
            <DrField lbl="Loại khám">{sel.examType}</DrField>
            <DrField lbl="Ngày khám">{dayjs(sel.examDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="BS khám">{sel.examDoctor}</DrField>
            {sel.spirometryResult && <DrField lbl="HH ký">{sel.spirometryResult}</DrField>}
            {sel.audiometryResult && <DrField lbl="Thính lực">{sel.audiometryResult}</DrField>}
            {sel.bloodLeadLevel !== undefined && <DrField lbl="Chì máu"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.bloodLeadLevel} µg/dL</span></DrField>}
            {sel.visionResult && <DrField lbl="Thị lực">{sel.visionResult}</DrField>}
            {sel.xrayResult && <DrField lbl="X-quang">{sel.xrayResult}</DrField>}
          </DrSec>
          <DrSec title="Kết luận">
            <DrField lbl="Phân loại">
              <StatusBadge tone={classifyTone(sel.classification)} dot>{classifyLabel(sel.classification)}</StatusBadge>
            </DrField>
            {sel.occupationalDisease && (
              <DrField lbl="Bệnh nghề nghiệp">
                <span style={{ color: 'var(--a-rd-text)', fontWeight: 600 }}>{sel.occupationalDisease}</span>
              </DrField>
            )}
            {sel.conclusion && <DrField lbl="Kết luận">{sel.conclusion}</DrField>}
            {sel.recommendations && <DrField lbl="Khuyến nghị">{sel.recommendations}</DrField>}
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default OccupationalHealthV2;
