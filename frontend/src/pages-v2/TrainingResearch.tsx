import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getTrainingClasses, getTrainingDashboard } from '../api/trainingResearch';
import type { TrainingClassDto, TrainingDashboardDto } from '../api/trainingResearch';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const STATUS_LABEL: Record<number, string> = {
  0: 'Lên kế hoạch', 1: 'Đang mở', 2: 'Hoàn thành', 3: 'Tạm dừng', 4: 'Hủy',
};

type SKey = 'planning' | 'active' | 'completed' | 'paused' | 'cancelled';
const STATUS_TABS = [
  { v: 'planning' as SKey,  l: 'Lên KH',     tone: 'warn' as const },
  { v: 'active' as SKey,    l: 'Đang mở',    tone: 'info' as const },
  { v: 'completed' as SKey, l: 'Hoàn thành', tone: 'ok' as const },
  { v: 'paused' as SKey,    l: 'Tạm dừng',   tone: 'warn' as const },
  { v: 'cancelled' as SKey, l: 'Hủy',        tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'planning' : n === 1 ? 'active' : n === 2 ? 'completed' : n === 3 ? 'paused' : 'cancelled';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');
const PER = 18;

const TrainingResearchV2: React.FC = () => {
  const [items, setItems] = useState<TrainingClassDto[]>([]);
  const [dash, setDash] = useState<TrainingDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<TrainingClassDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, d] = await Promise.all([
        getTrainingClasses({ keyword: search, pageSize: 200 }),
        getTrainingDashboard(),
      ]);
      setItems(list);
      setDash(d);
    } catch { ti('Không tải được lớp đào tạo'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const types = useMemo(() => {
    const set = new Set(items.map((r) => r.trainingTypeName).filter(Boolean) as string[]);
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
      if (fType && r.trainingTypeName !== fType) return false;
      if (!k) return true;
      return [r.classCode, r.className, r.instructorName, r.departmentName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<TrainingClassDto>[] = [
    { key: 'code', label: 'Mã lớp', code: true, render: (r) => r.classCode },
    { key: 'name', label: 'Tên lớp', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.className}</div>
        {r.location && <div style={{ fontSize: 11, color: 'var(--t-2)' }}>📍 {r.location}</div>}
      </div>
    ) },
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone="info">{r.trainingTypeName || `#${r.trainingType}`}</StatusBadge>
    ) },
    { key: 'instr', label: 'GV', render: (r) => r.instructorName || '—' },
    { key: 'date', label: 'Thời gian', mono: true, render: (r) => r.startDate ? (
      <div>
        <div>{dayjs(r.startDate).format('DD/MM/YY')}</div>
        {r.endDate && <div style={{ fontSize: 10, color: 'var(--t-2)' }}>→ {dayjs(r.endDate).format('DD/MM')}</div>}
      </div>
    ) : '—' },
    { key: 'enr', label: 'Học viên', mono: true, render: (r) => {
      const ratio = r.maxStudents ? r.enrolledCount / r.maxStudents : 0;
      const tone = ratio >= 0.9 ? 'var(--a-rd-text)' : ratio >= 0.7 ? 'var(--a-or-text)' : 'var(--t-0)';
      return <span style={{ color: tone }}>{r.enrolledCount}/{r.maxStudents}</span>;
    } },
    { key: 'cred', label: 'Tín chỉ', mono: true, render: (r) => r.creditHours },
    { key: 'fee', label: 'Học phí', mono: true, render: (r) => r.fee ? fmt(r.fee) : 'Miễn phí' },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{r.statusName || STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: TrainingClassDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="user" title="Học viên" onClick={() => tk(`Mở học viên ${r.classCode}`)} />
    </div>
  );

  const totalStudents = dash?.totalStudents ?? items.reduce((s, c) => s + (c.enrolledCount || 0), 0);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Lớp đào tạo', val: dash?.totalClasses ?? items.length, sub: 'tổng số' },
        { lbl: 'Đang mở', val: dash?.activeClasses ?? counts.active, sub: 'có thể đăng ký', tone: 'info' },
        { lbl: 'Tổng học viên', val: totalStudents.toLocaleString('vi-VN'), sub: 'lượt', tone: 'ok' },
        { lbl: 'CME tuân thủ', val: `${(dash?.cmeCompliancePercent ?? 0).toFixed(0)}`, unit: '%', sub: 'tỷ lệ NV', tone: 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm tên / mã lớp / GV…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại đào tạo" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở NCKH')}>
          <Ico name="activity" size={12} /> NCKH
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở mở lớp mới')}>
          <Ico name="plus" size={12} /> Mở lớp
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<TrainingClassDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có lớp đào tạo'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.className : ''}
        sub={sel ? `${sel.classCode} · ${sel.trainingTypeName || ''}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Mở danh sách HV')}>
            <Ico name="user" size={12} /> Học viên
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở chỉnh sửa')}>
            <Ico name="edit" size={12} /> Chỉnh sửa
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Lớp học">
            <DrField lbl="Mã lớp"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.classCode}</span></DrField>
            <DrField lbl="Tên">{sel.className}</DrField>
            <DrField lbl="Loại">{sel.trainingTypeName || `#${sel.trainingType}`}</DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="GV phụ trách">{sel.instructorName || '—'}</DrField>
            <DrField lbl="Địa điểm">{sel.location || '—'}</DrField>
          </DrSec>
          <DrSec title="Lịch trình">
            {sel.startDate && <DrField lbl="Bắt đầu">{dayjs(sel.startDate).format('DD/MM/YYYY')}</DrField>}
            {sel.endDate && <DrField lbl="Kết thúc">{dayjs(sel.endDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Học viên"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.enrolledCount} / {sel.maxStudents}</span></DrField>
            <DrField lbl="Tín chỉ"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.creditHours}</span></DrField>
            <DrField lbl="Học phí"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.fee ? `${fmt(sel.fee)} đ` : 'Miễn phí'}</span></DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {sel.statusName || STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          {sel.description && (
            <DrSec title="Mô tả">
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--t-1)' }}>{sel.description}</div>
            </DrSec>
          )}
        </>}
      </DrawerShell>
    </div>
  );
};

export default TrainingResearchV2;
