import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  searchOccExams, getOccStats, getHazardTypes, createOccExam, updateOccExam,
} from '../api/occupationalHealth';
import type { OccExam, OccStats, HazardType } from '../api/occupationalHealth';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge,
  ActBtn, Btn, DrawerShell, DrSec, DrField, CrudModal, useTabCounts, tk, tw, Ico, fmtDMYg,
  type ColumnDef, type StatusTab, type CrudFieldCfg, type KpiItem,
} from '@/_v2kit';

// ─── Trạng thái phiếu khám (0=Chờ khám, 1=Đang khám, 2=Hoàn thành, 3=Đã cấp GCN) ───
type StatusKey = 'pending' | 'inProgress' | 'completed' | 'certified';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'pending',    l: 'Chờ khám',   tone: 'info' },
  { v: 'inProgress', l: 'Đang khám',  tone: 'warn' },
  { v: 'completed',  l: 'Hoàn thành', tone: 'ok' },
  { v: 'certified',  l: 'Đã cấp GCN', tone: 'ok' },
];
const statusKey = (s: number): StatusKey =>
  s === 1 ? 'inProgress' : s === 2 ? 'completed' : s === 3 ? 'certified' : 'pending';

// ─── Loại khám (backend có thể trả enum viết hoa Periodic/PreEmployment → so khớp lowercase) ───
type TabKey = 'periodic' | 'preEmployment' | 'disease' | 'stats';
const TYPE_LABEL_LC: Record<string, string> = {
  periodic: 'Định kỳ', preemployment: 'Trước tuyển', postexposure: 'Sau phơi nhiễm',
};
const typeLabel = (t?: string): string => TYPE_LABEL_LC[(t || '').toLowerCase()] || t || '—';
const EXAM_TYPE_OPTIONS = [
  { value: 'periodic', label: 'Định kỳ' },
  { value: 'preEmployment', label: 'Trước tuyển' },
  { value: 'postExposure', label: 'Sau phơi nhiễm' },
];

// ─── Phân loại sức khỏe ───
const CLASS_INFO: Record<string, { label: string; tone: 'ok' | 'warn' | 'crit' }> = {
  pass:       { label: 'Đủ SK',       tone: 'ok' },
  restricted: { label: 'Hạn chế',     tone: 'warn' },
  fail:       { label: 'Không đủ SK', tone: 'crit' },
};

// ─── Yếu tố nguy hại (fallback khi danh mục chưa tải) ───
const HAZARD_FALLBACK: Record<string, string> = {
  dust: 'Bụi', chemical: 'Hóa chất', noise: 'Tiếng ồn', vibration: 'Rung',
  heat: 'Nhiệt', radiation: 'Bức xạ', biological: 'Vi sinh',
};

const DEFAULT_STATS: OccStats = { totalExams: 0, diseaseDetected: 0, needsFollowUp: 0, companies: 0 };
const PER = 20;

const cardStyle: React.CSSProperties = {
  padding: '12px 16px', background: 'var(--bg-1)',
  border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
};
const cardTitleStyle: React.CSSProperties = {
  margin: '0 0 10px', fontSize: 11, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--t-2)',
};
const dateInpStyle: React.CSSProperties = {
  height: 26, padding: '0 8px', fontSize: 12, background: 'var(--bg-1)',
  border: '1px solid var(--line)', borderRadius: 'var(--r-2)', color: 'var(--t-0)',
};

const OccupationalHealthV2: React.FC = () => {
  const [rows, setRows] = useState<OccExam[]>([]);
  const [stats, setStats] = useState<OccStats>(DEFAULT_STATS);
  const [hazards, setHazards] = useState<HazardType[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<TabKey>('periodic');
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [hazardFilter, setHazardFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [page, setPage] = useState(0);

  const [sel, setSel] = useState<OccExam | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [ex, st, hz] = await Promise.all([searchOccExams(), getOccStats(), getHazardTypes()]);
      // apiClient tự unwrap envelope {success,data} → phòng thủ cả 2 dạng
      const exArr = Array.isArray(ex) ? ex
        : ((ex as unknown as { items?: OccExam[]; data?: { items?: OccExam[] } })?.items
          ?? (ex as unknown as { data?: { items?: OccExam[] } })?.data?.items ?? []);
      setRows(exArr);
      setStats(st && typeof st === 'object' ? { ...DEFAULT_STATS, ...st } : DEFAULT_STATS);
      setHazards(Array.isArray(hz) ? hz : []);
    } catch { tw('Không thể tải dữ liệu sức khỏe nghề nghiệp'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hazardName = useMemo(() => {
    const m = new Map(hazards.map((h) => [h.code, h.name]));
    return (code: string) => m.get(code) || HAZARD_FALLBACK[code] || code;
  }, [hazards]);

  // ─── Lọc client-side: tab loại khám → từ khóa → công ty → yếu tố NN → khoảng ngày ───
  const baseFiltered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return rows.filter((r) => {
      const t = (r.examType || '').toLowerCase();
      if (tab === 'periodic' && t !== 'periodic') return false;
      if (tab === 'preEmployment' && t !== 'preemployment') return false;
      if (tab === 'disease' && !r.occupationalDisease) return false;
      if (k && ![r.patientName, r.patientCode, r.examCode, r.companyName, r.occupation]
        .some((v) => (v || '').toLowerCase().includes(k))) return false;
      if (companyFilter && r.companyName !== companyFilter) return false;
      if (hazardFilter && !(r.hazardTypes || []).includes(hazardFilter)) return false;
      if (fromDate && (!r.examDate || dayjs(r.examDate).isBefore(dayjs(fromDate), 'day'))) return false;
      if (toDate && (!r.examDate || dayjs(r.examDate).isAfter(dayjs(toDate), 'day'))) return false;
      return true;
    });
  }, [rows, tab, search, companyFilter, hazardFilter, fromDate, toDate]);

  const counts = useTabCounts(baseFiltered, STATUS_TABS, (r) => statusKey(r.status));
  const filtered = useMemo(
    () => stab === 'all' ? baseFiltered : baseFiltered.filter((r) => statusKey(r.status) === stab),
    [baseFiltered, stab],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const diseaseCount = rows.filter((r) => !!r.occupationalDisease).length;
  const companyOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.companyName).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'vi'))
      .map((c) => ({ v: c, l: c })),
    [rows],
  );

  const openCreate = () => { setCrudInit(null); setCrudOpen(true); };
  const openEdit = (r: OccExam) => { setCrudInit({ ...r } as unknown as Record<string, unknown>); setCrudOpen(true); };

  const columns: ColumnDef<OccExam>[] = [
    { key: 'code', label: 'Mã phiếu', mono: true, width: 120, render: (r) => r.examCode },
    { key: 'patient', label: 'Người lao động', render: (r) => (
      <div className="cell-2l">
        <b>{r.patientName}</b>
        <i className="mono">{r.patientCode || '—'} · {r.gender === 1 ? 'Nam' : 'Nữ'}</i>
      </div>
    ) },
    { key: 'company', label: 'Công ty / Nghề nghiệp', render: (r) => (
      <div className="cell-2l">
        <b>{r.companyName}</b>
        <i>{[r.department, r.occupation].filter(Boolean).join(' · ') || '—'}</i>
      </div>
    ) },
    { key: 'years', label: 'Thâm niên', width: 85, mono: true,
      render: (r) => r.yearsOfExposure ? `${r.yearsOfExposure} năm` : '—' },
    { key: 'hazards', label: 'Yếu tố NN', width: 190, render: (r) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {(r.hazardTypes || []).slice(0, 3).map((h) => (
          <span key={h} className="chip warn">{hazardName(h)}</span>
        ))}
        {(r.hazardTypes || []).length > 3 && (
          <span style={{ color: 'var(--t-3)', fontSize: 11 }}>+{r.hazardTypes.length - 3}</span>
        )}
        {(r.hazardTypes || []).length === 0 && <span style={{ color: 'var(--t-3)' }}>—</span>}
      </div>
    ) },
    { key: 'date', label: 'Ngày khám', mono: true, width: 95, render: (r) => fmtDMYg(r.examDate) },
    { key: 'type', label: 'Loại', width: 105,
      render: (r) => <span className="chip info">{typeLabel(r.examType)}</span> },
    { key: 'class', label: 'Phân loại', width: 105, render: (r) => {
      const c = CLASS_INFO[r.classification];
      return c ? <span className={`chip ${c.tone}`}>{c.label}</span>
        : <span style={{ color: 'var(--t-3)' }}>Chưa PL</span>;
    } },
    { key: 'status', label: 'Trạng thái', width: 115, render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === statusKey(r.status));
      return <StatusBadge tone={t?.tone} dot>{t?.l}</StatusBadge>;
    } },
  ];

  const rowActions = (r: OccExam) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Xem chi tiết" onClick={() => setSel(r)} />
      {r.status < 2 && <ActBtn ic="edit" title="Sửa phiếu khám" onClick={() => openEdit(r)} />}
    </div>
  );

  const kpis: KpiItem[] = [
    { lbl: 'Tổng khám', val: stats.totalExams, sub: 'phiếu khám' },
    { lbl: 'Phát hiện BNN', val: stats.diseaseDetected, sub: 'bệnh nghề nghiệp', tone: 'crit' },
    { lbl: 'Cần theo dõi', val: stats.needsFollowUp, tone: 'warn' },
    { lbl: 'Đang khám', val: rows.filter((r) => r.status === 1).length, tone: 'warn' },
    { lbl: 'Đã cấp GCN', val: rows.filter((r) => r.status === 3).length, tone: 'ok' },
    { lbl: 'Công ty', val: stats.companies, sub: 'đơn vị' },
  ];

  // ─── Form tạo/sửa phiếu khám (port đủ trường v1) ───
  const formFields: CrudFieldCfg[] = [
    { key: 'patientName', label: 'Họ tên', required: true, placeholder: 'Họ và tên' },
    { key: 'gender', label: 'Giới tính', type: 'select',
      options: [{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }] },
    { key: 'dateOfBirth', label: 'Ngày sinh', type: 'date' },
    { key: 'examDate', label: 'Ngày khám', type: 'date' },
    { key: 'companyName', label: 'Công ty', required: true, placeholder: 'Tên công ty' },
    { key: 'occupation', label: 'Nghề nghiệp', placeholder: 'Vị trí công việc' },
    { key: 'yearsOfExposure', label: 'Thâm niên (năm)', type: 'number', placeholder: 'Số năm phơi nhiễm' },
    { key: 'examType', label: 'Loại khám', type: 'select', required: true, options: EXAM_TYPE_OPTIONS },
    { key: 'hazardTypes', label: 'Yếu tố nguy hại', type: 'multiselect',
      options: hazards.map((h) => ({ value: h.code, label: `${h.name} — ${h.description}` })) },
    { key: 'spirometryResult', label: 'Hô hấp (Spirometry)', type: 'textarea', placeholder: 'FVC, FEV1, FEV1/FVC…' },
    { key: 'audiometryResult', label: 'Thính lực (Audiometry)', type: 'textarea', placeholder: 'Ngưỡng nghe tần số 500-8000Hz…' },
    { key: 'bloodLeadLevel', label: 'Chì máu (µg/dL)', type: 'number' },
    { key: 'visionResult', label: 'Thị lực', placeholder: 'VD: Mắt phải 10/10, trái 9/10' },
    { key: 'xrayResult', label: 'X-quang', type: 'textarea', placeholder: 'Kết quả X-quang phổi…' },
    { key: 'labResults', label: 'Xét nghiệm', type: 'textarea', placeholder: 'Kết quả xét nghiệm máu, nước tiểu…' },
    { key: 'classification', label: 'Phân loại sức khỏe', type: 'select',
      options: Object.entries(CLASS_INFO).map(([value, c]) => ({ value, label: c.label })) },
    { key: 'occupationalDisease', label: 'Bệnh nghề nghiệp (nếu có)', placeholder: 'Tên bệnh nghề nghiệp…' },
    { key: 'conclusion', label: 'Kết luận', type: 'textarea', placeholder: 'Kết luận khám sức khỏe nghề nghiệp…' },
    { key: 'recommendations', label: 'Khuyến nghị', type: 'textarea', placeholder: 'Lời khuyên, đề xuất chuyển công tác…' },
  ];

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <TopTabs<TabKey>
        tab={tab}
        setTab={(v) => { setTab(v); setPage(0); }}
        tabs={[
          { v: 'periodic', l: 'Khám định kỳ', ic: 'shield' },
          { v: 'preEmployment', l: 'Khám trước tuyển', ic: 'users' },
          { v: 'disease', l: `Bệnh nghề nghiệp (${diseaseCount})`, ic: 'alert' },
          { v: 'stats', l: 'Thống kê', ic: 'chart' },
        ]}
        actions={(
          <>
            <Btn variant="primary" size="sm" onClick={openCreate}>
              <Ico name="plus" size={12} /> Tạo phiếu khám
            </Btn>
            <Btn variant="ghost" size="sm" onClick={load} loading={loading} icon="refresh">Làm mới</Btn>
          </>
        )}
      />

      {tab !== 'stats' ? (
        <>
          <div className="ab-toolbar">
            <SearchBox
              value={search}
              onChange={(v) => { setSearch(v); setPage(0); }}
              placeholder="Tìm họ tên / mã phiếu / công ty…"
            />
            <Filter
              value={companyFilter}
              onChange={(v) => { setCompanyFilter(v); setPage(0); }}
              options={companyOptions}
              placeholder="▾ Công ty"
            />
            <Filter
              value={hazardFilter}
              onChange={(v) => { setHazardFilter(v); setPage(0); }}
              options={hazards.map((h) => ({ v: h.code, l: h.name }))}
              placeholder="▾ Yếu tố NN"
            />
            <span style={{ color: 'var(--t-2)', fontSize: 11 }}>Từ</span>
            <input
              type="date" style={dateInpStyle} value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
              title="Từ ngày khám"
            />
            <span style={{ color: 'var(--t-2)', fontSize: 11 }}>Đến</span>
            <input
              type="date" style={dateInpStyle} value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(0); }}
              title="Đến ngày khám"
            />
            <span className="spacer" />
          </div>

          <StatusTabs<StatusKey>
            value={stab}
            onChange={(v) => { setStab(v); setPage(0); }}
            tabs={STATUS_TABS}
            counts={counts}
          />

          <DataTable<OccExam>
            columns={columns}
            data={paged}
            rowKey={(r) => r.id}
            onRowClick={(r) => setSel(r)}
            actions={rowActions}
            loading={loading}
            empty="Không có phiếu khám sức khỏe nghề nghiệp"
          />
          <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />
        </>
      ) : (
        // ─── Tab thống kê (port từ v1) ───
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          <div style={cardStyle}>
            <h4 style={cardTitleStyle}>Phân loại theo yếu tố nguy hại</h4>
            {hazards.map((h) => {
              const count = rows.filter((r) => (r.hazardTypes || []).includes(h.code)).length;
              return (
                <div key={h.code} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 8, padding: '5px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 12.5,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span className="chip warn">{h.name}</span>
                    <span style={{ color: 'var(--t-3)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.description}
                    </span>
                  </div>
                  <span style={{ color: 'var(--t-0)' }}><b>{count}</b> ca</span>
                </div>
              );
            })}
            {hazards.length === 0 && <div style={{ color: 'var(--t-3)', fontSize: 12.5 }}>Chưa có danh mục yếu tố nguy hại</div>}
          </div>

          <div style={cardStyle}>
            <h4 style={cardTitleStyle}>Kết quả phân loại sức khỏe</h4>
            {Object.entries(CLASS_INFO).map(([key, c]) => {
              const count = rows.filter((r) => r.classification === key).length;
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 12.5,
                }}>
                  <span className={`chip ${c.tone}`}>{c.label}</span>
                  <span style={{ color: 'var(--t-0)' }}><b>{count}</b> người</span>
                </div>
              );
            })}
            <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--t-1)' }}>
              <div style={{ padding: '3px 0' }}>Tổng khám: <b style={{ color: 'var(--t-0)' }}>{rows.length}</b></div>
              <div style={{ padding: '3px 0' }}>Bệnh nghề nghiệp: <b style={{ color: 'var(--s-crit)' }}>{diseaseCount}</b></div>
            </div>
          </div>

          <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
            <h4 style={cardTitleStyle}>Danh sách yếu tố nguy hại nghề nghiệp</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {hazards.map((h) => (
                <div key={h.code} style={{
                  padding: '10px 12px', background: 'var(--bg-1)',
                  border: '1px solid var(--line-soft)', borderRadius: 'var(--r-2)',
                }}>
                  <span className="chip warn" style={{ marginBottom: 6, display: 'inline-block' }}>{h.name}</span>
                  <div style={{ fontSize: 12, color: 'var(--t-2)' }}>{h.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Drawer chi tiết phiếu khám ─── */}
      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span className="mono" style={{ color: 'var(--a-cy)' }}>{sel.examCode}</span>
            <span>{sel.patientName}</span>
          </span>
        ) : ''}
        sub={sel ? `${sel.companyName || '—'} · ${typeLabel(sel.examType)}` : ''}
        footer={(
          <>
            {sel && sel.status < 2 && (
              <Btn variant="primary" onClick={() => { openEdit(sel); setSel(null); }}>
                <Ico name="edit" size={12} /> Sửa phiếu khám
              </Btn>
            )}
            <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          </>
        )}
      >
        {sel && (
          <>
            <DrSec title="Hồ sơ khám">
              <DrField lbl="Mã phiếu"><span className="mono" style={{ color: 'var(--a-cy)' }}>{sel.examCode}</span></DrField>
              <DrField lbl="Loại khám"><span className="chip info">{typeLabel(sel.examType)}</span></DrField>
              <DrField lbl="Ngày khám">{fmtDMYg(sel.examDate)}</DrField>
              <DrField lbl="BS khám">{sel.examDoctor || '—'}</DrField>
              <DrField lbl="Trạng thái">
                <StatusBadge tone={STATUS_TABS.find((t) => t.v === statusKey(sel.status))?.tone} dot>
                  {STATUS_TABS.find((t) => t.v === statusKey(sel.status))?.l}
                </StatusBadge>
              </DrField>
            </DrSec>

            <DrSec title="Người lao động">
              <DrField lbl="Họ tên"><b>{sel.patientName}</b></DrField>
              <DrField lbl="Mã BN"><span className="mono">{sel.patientCode || '—'}</span></DrField>
              <DrField lbl="Giới tính">{sel.gender === 1 ? 'Nam' : 'Nữ'}</DrField>
              <DrField lbl="Ngày sinh">{fmtDMYg(sel.dateOfBirth)}</DrField>
            </DrSec>

            <DrSec title="Đơn vị / nghề nghiệp">
              <DrField lbl="Công ty"><b>{sel.companyName || '—'}</b></DrField>
              <DrField lbl="Mã công ty"><span className="mono">{sel.companyCode || '—'}</span></DrField>
              <DrField lbl="Bộ phận">{sel.department || '—'}</DrField>
              <DrField lbl="Nghề nghiệp">{sel.occupation || '—'}</DrField>
              <DrField lbl="Thâm niên">{sel.yearsOfExposure ? `${sel.yearsOfExposure} năm` : '—'}</DrField>
            </DrSec>

            <DrSec title="Yếu tố nguy hại">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(sel.hazardTypes || []).map((h) => (
                  <span key={h} className="chip warn">{hazardName(h)}</span>
                ))}
                {(sel.hazardTypes || []).length === 0 && <span style={{ color: 'var(--t-3)' }}>Không có</span>}
              </div>
            </DrSec>

            <DrSec title="Kết quả chuyên khoa">
              <DrField lbl="Hô hấp">{sel.spirometryResult || '—'}</DrField>
              <DrField lbl="Thính lực">{sel.audiometryResult || '—'}</DrField>
              <DrField lbl="Chì máu">{sel.bloodLeadLevel ? `${sel.bloodLeadLevel} µg/dL` : '—'}</DrField>
              <DrField lbl="Thị lực">{sel.visionResult || '—'}</DrField>
              <DrField lbl="X-quang">{sel.xrayResult || '—'}</DrField>
              <DrField lbl="Xét nghiệm">{sel.labResults || '—'}</DrField>
            </DrSec>

            <DrSec title="Kết luận">
              <DrField lbl="Phân loại">
                {CLASS_INFO[sel.classification]
                  ? <span className={`chip ${CLASS_INFO[sel.classification].tone}`}>{CLASS_INFO[sel.classification].label}</span>
                  : 'Chưa phân loại'}
              </DrField>
              {sel.occupationalDisease && (
                <DrField lbl="Bệnh NN">
                  <b style={{ color: 'var(--s-crit)' }}>{sel.occupationalDisease}</b>
                </DrField>
              )}
              <DrField lbl="Kết luận">
                <span style={{ whiteSpace: 'pre-wrap' }}>{sel.conclusion || '—'}</span>
              </DrField>
              <DrField lbl="Khuyến nghị">
                <span style={{ whiteSpace: 'pre-wrap' }}>{sel.recommendations || '—'}</span>
              </DrField>
            </DrSec>
          </>
        )}
      </DrawerShell>

      {/* ─── Modal tạo / sửa phiếu khám ─── */}
      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Sửa phiếu khám' : 'Tạo phiếu khám sức khỏe nghề nghiệp'}
        sub={crudInit?.id ? String(crudInit.examCode || '') : undefined}
        fields={formFields}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          if (editing && crudInit?.id) {
            await updateOccExam(String(crudInit.id), v as Partial<OccExam>);
            tk('Đã cập nhật phiếu khám');
          } else {
            await createOccExam(v as Partial<OccExam>);
            tk('Đã tạo phiếu khám');
          }
          load();
        }}
      />
    </div>
  );
};

export default OccupationalHealthV2;
