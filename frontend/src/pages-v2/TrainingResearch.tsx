import React, { useEffect, useMemo, useState } from 'react';
import { fmtNum as fmt } from '../utils/format';
import dayjs from 'dayjs';
import { getTrainingClasses, getTrainingDashboard, saveTrainingClass, getClassStudents } from '../modules/training/api/trainingResearch';
import type { TrainingClassDto, TrainingDashboardDto, TrainingStudentDto } from '../modules/training/api/trainingResearch';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn, CrudModal,
  DrawerShell, DrSec, DrField, tk, ti,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

const CLASS_FIELDS: CrudFieldCfg[] = [
  { key: 'classCode', label: 'Mã lớp', required: true, disabledOnEdit: true, placeholder: 'VD: ĐT-2026-...' },
  { key: 'className', label: 'Tên lớp', required: true },
  { key: 'trainingType', label: 'Loại đào tạo', type: 'select', required: true, options: [
    { value: 1, label: 'Nội bộ' }, { value: 2, label: 'Bên ngoài' }, { value: 3, label: 'CME' }, { value: 4, label: 'Chỉ đạo tuyến' }] },
  { key: 'location', label: 'Địa điểm' },
  { key: 'startDate', label: 'Ngày bắt đầu', type: 'date' },
  { key: 'endDate', label: 'Ngày kết thúc', type: 'date' },
  { key: 'maxStudents', label: 'Sĩ số tối đa', type: 'number' },
  { key: 'creditHours', label: 'Số tín chỉ', type: 'number' },
  { key: 'fee', label: 'Học phí (đ)', type: 'number' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 1, label: 'Kế hoạch' }, { value: 2, label: 'Đang diễn ra' }, { value: 3, label: 'Hoàn thành' }, { value: 4, label: 'Hủy' }] },
  { key: 'description', label: 'Mô tả', type: 'textarea' },
];

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
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);

  const openCreate = () => { setCrudInit({ trainingType: 1, status: 1, maxStudents: 30, creditHours: 0, fee: 0 }); setCrudOpen(true); };
  const openEdit = (r: TrainingClassDto) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  // Students drawer
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [students, setStudents] = useState<TrainingStudentDto[]>([]);
  const [studentsClass, setStudentsClass] = useState<TrainingClassDto | null>(null);

  const openStudents = async (r: TrainingClassDto) => {
    setStudentsClass(r);
    setStudentsOpen(true);
    setStudentsLoading(true);
    setStudents([]);
    try {
      const data = await getClassStudents(r.id);
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      ti('Không tải được danh sách học viên');
      setStudentsOpen(false);
    } finally {
      setStudentsLoading(false);
    }
  };

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
        {r.location && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>📍 {r.location}</div>}
      </div>
    ) },
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone="info">{r.trainingTypeName || `#${r.trainingType}`}</StatusBadge>
    ) },
    { key: 'instr', label: 'GV', render: (r) => r.instructorName || '—' },
    { key: 'date', label: 'Thời gian', mono: true, render: (r) => r.startDate ? (
      <div>
        <div>{dayjs(r.startDate).format('DD/MM/YY')}</div>
        {r.endDate && <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>→ {dayjs(r.endDate).format('DD/MM')}</div>}
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
      <ActBtn ic="user" title="Học viên" onClick={() => openStudents(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
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
        <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>Bỏ lọc</Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        {/* NCKH button hidden: không có route /v2/research riêng — defer khi route được tạo */}
        <Btn variant="primary" icon="plus" onClick={openCreate}>Mở lớp</Btn>
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
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn icon="user" onClick={() => { if (sel) { setSel(null); openStudents(sel); } }}>Học viên</Btn>
          <Btn variant="primary" icon="edit" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>Chỉnh sửa</Btn>
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
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--fs-md)', color: 'var(--t-1)' }}>{sel.description}</div>
            </DrSec>
          )}
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật lớp đào tạo' : 'Mở lớp đào tạo mới'}
        fields={CLASS_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          await saveTrainingClass(v as Partial<TrainingClassDto>, editing ? (crudInit?.id as string) : undefined);
          tk(editing ? 'Đã cập nhật lớp đào tạo' : 'Đã mở lớp đào tạo');
          load();
        }}
      />

      {/* Drawer danh sách học viên */}
      <DrawerShell
        open={studentsOpen}
        onClose={() => setStudentsOpen(false)}
        size="lg"
        title={studentsClass ? `Học viên: ${studentsClass.className}` : 'Học viên'}
        sub={studentsClass ? `${studentsClass.classCode} · ${studentsLoading ? 'Đang tải…' : `${students.length} học viên`}` : ''}
        footer={<Btn variant="ghost" onClick={() => setStudentsOpen(false)}>Đóng</Btn>}
      >
        {studentsLoading && <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải danh sách học viên…</div>}
        {!studentsLoading && students.length === 0 && (
          <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Chưa có học viên đăng ký</div>
        )}
        {!studentsLoading && students.length > 0 && (
          <table className="ab-tbl" style={{ width: '100%', fontSize: 'var(--fs-sm)' }}>
            <thead>
              <tr>
                <th>#</th><th>Tên học viên</th><th>Loại</th>
                <th>Điểm</th><th>Trạng thái</th><th>Chứng chỉ</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id}>
                  <td className="mono">{i + 1}</td>
                  <td>{s.displayName || '—'}</td>
                  <td>{s.studentTypeName || `#${s.studentType}`}</td>
                  <td className="mono">{s.score != null ? s.score : '—'}</td>
                  <td>
                    <StatusBadge tone={s.attendanceStatus === 2 ? 'ok' : s.attendanceStatus === 3 ? 'crit' : 'info'} dot>
                      {s.attendanceStatusName || `#${s.attendanceStatus}`}
                    </StatusBadge>
                  </td>
                  <td>{s.certificateNumber || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrawerShell>
    </div>
  );
};

export default TrainingResearchV2;
