import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input, Select, DatePicker, Checkbox } from 'antd';
import { getIncidents, getQualityIndicators, createIncident } from '../modules/quality/api/quality';
import type { IncidentReportDto, QualityIndicatorDto } from '../modules/quality/api/quality';
import { catalogApi } from '../modules/system/api/system';
import type { DepartmentCatalogDto } from '../modules/system/api/system';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, ModalShell, useTabCounts,
  type ColumnDef, type StatusTab, type TopTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import { openPrintWindow } from '../utils/printWindow';
import { HOSPITAL_NAME } from '../constants/hospital';

/* ────────────────────────────────────────────────────────────
   Chất lượng v2 — port of design-system-v2/his/project/Quality v2.html
   3 tabs: KPI indicators · Sự cố y khoa · Đánh giá định kỳ
   ──────────────────────────────────────────────────────────── */

type TopKey = 'kpi' | 'incidents' | 'audit';
type IncStatusKey = 'reported' | 'investigation' | 'closed';

const TOP_TABS: TopTab<TopKey>[] = [
  { v: 'kpi',       l: 'Bộ chỉ số chất lượng', ic: 'chart' },
  { v: 'incidents', l: 'Sự cố y khoa',         ic: 'alert' },
  { v: 'audit',     l: 'Đánh giá định kỳ',     ic: 'file-text' },
];

const INC_TABS: StatusTab<IncStatusKey>[] = [
  { v: 'reported',      l: 'Mới',      tone: 'info' },
  { v: 'investigation', l: 'Điều tra', tone: 'warn' },
  { v: 'closed',        l: 'Đóng',     tone: 'ok' },
];

const incStatusKey = (s: number): IncStatusKey => {
  if (s === 5) return 'closed';
  if (s >= 2 && s <= 4) return 'investigation';
  return 'reported';
};

const SEVERITY_TONE: Record<number, 'ok' | 'warn' | 'crit'> = {
  1: 'ok', 2: 'ok', 3: 'ok', 4: 'warn', 5: 'crit', 6: 'crit',
};

const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const QualityV2: React.FC = () => {
  const [tab, setTab] = useState<TopKey>('kpi');
  const [incidents, setIncidents] = useState<IncidentReportDto[]>([]);
  const [indicators, setIndicators] = useState<QualityIndicatorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [stab, setStab] = useState<IncStatusKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<IncidentReportDto | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const PAGE_SIZE = 16;

  const reload = () => {
    setLoading(true);
    Promise.allSettled([
      getIncidents({ page: 1, pageSize: 200 }),
      getQualityIndicators(),
    ]).then(([i, q]) => {
      if (i.status === 'fulfilled') setIncidents(i.value.data?.items || []);
      if (q.status === 'fulfilled') setIndicators((q.value.data || []) as QualityIndicatorDto[]);
      setLoading(false);
    });
  };
  useEffect(reload, []);

  const incCounts = useTabCounts(incidents, INC_TABS, (x) => incStatusKey(x.status));

  const incFiltered = useMemo(() => {
    return incidents.filter((r) => {
      if (stab !== 'all' && incStatusKey(r.status) !== stab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.incidentCode, r.description, r.departmentName, r.reportedByName, r.incidentTypeName]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [incidents, stab, search]);

  const totalPages = Math.max(1, Math.ceil(incFiltered.length / PAGE_SIZE));
  const paged = incFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const kpis = useMemo(() => {
    const total = indicators.length;
    const onTarget = indicators.filter((i) => {
      // currentValue do BE bổ sung runtime — chưa khai trong QualityIndicatorDto type. Widen nội bộ.
      const cur = (i as QualityIndicatorDto & { currentValue?: number }).currentValue || 0;
      return i.targetType === 'AtMost' ? cur <= i.targetValue : cur >= i.targetValue;
    }).length;
    const severeIncidents = incidents.filter((x) => x.severity >= 5).length;
    const investigating = incidents.filter((x) => incStatusKey(x.status) === 'investigation').length;
    return {
      onTarget, indicatorTotal: total,
      incTotal: incidents.length,
      severe: severeIncidents,
      investigating,
    };
  }, [indicators, incidents]);

  const incColumns: ColumnDef<IncidentReportDto>[] = [
    { key: 'code', label: 'Mã sự cố', mono: true, width: 130, render: (r) => r.incidentCode },
    {
      key: 'type', label: 'Loại sự cố',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.incidentTypeName || r.incidentType}</b>
          <i>{r.description?.slice(0, 60)}{r.description?.length > 60 ? '…' : ''}</i>
        </div>
      ),
    },
    {
      key: 'severity', label: 'Mức độ', width: 110,
      render: (r) => <span className={`chip ${SEVERITY_TONE[r.severity] || 'info'}`}>{r.severityName}</span>,
    },
    { key: 'dept', label: 'Khoa', width: 160, render: (r) => r.departmentName || '—' },
    { key: 'reporter', label: 'Người báo cáo', width: 180, render: (r) => r.reportedByName || '—' },
    { key: 'date', label: 'Báo cáo', mono: true, width: 110, render: (r) => fmtDMY(r.reportedDate) },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => {
        const sk = incStatusKey(r.status);
        return <StatusBadge tone={INC_TABS.find((t) => t.v === sk)?.tone || 'info'} dot>{r.statusName}</StatusBadge>;
      },
    },
  ];

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Chỉ số đạt', val: kpis.onTarget, sub: `/${kpis.indicatorTotal}`, tone: 'ok' },
          { lbl: 'Sự cố tổng', val: kpis.incTotal, sub: 'tất cả' },
          { lbl: 'Sự cố nặng', val: kpis.severe, sub: 'level ≥5', tone: 'crit' },
          { lbl: 'Đang điều tra', val: kpis.investigating, sub: 'mở', tone: 'warn' },
          { lbl: 'KPI tổng', val: kpis.indicatorTotal, sub: 'chỉ số' },
          { lbl: 'Tỉ lệ đạt', val: kpis.indicatorTotal > 0 ? Math.round(kpis.onTarget / kpis.indicatorTotal * 100) : 0, unit: '%', tone: 'ok' },
        ]}
      />

      <TopTabs<TopKey>
        tab={tab}
        setTab={setTab}
        tabs={TOP_TABS}
        actions={
          <>
            <Btn variant="ghost" onClick={reload}>
              <TermIcon name="refresh" size={12} /> Làm mới
            </Btn>
            <Btn variant="primary" onClick={() => setReportOpen(true)}>
              <TermIcon name="plus" size={12} /> Báo cáo sự cố
            </Btn>
          </>
        }
      />

      {tab === 'kpi' && <KpiTab indicators={indicators} loading={loading} />}

      {tab === 'incidents' && (
        <>
          <div className="ab-tools">
            <SearchBox value={search} onChange={setSearch} placeholder="Tìm mã / khoa / loại / người báo cáo…" />
            <Btn variant="ghost" onClick={() => { setSearch(''); setStab('all'); }}>
              <TermIcon name="refresh" size={12} /> Bỏ lọc
            </Btn>
            <span className="spacer" />
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{incFiltered.length} sự cố</span>
          </div>
          <StatusTabs<IncStatusKey> value={stab} onChange={setStab} tabs={INC_TABS} counts={incCounts} />
          <DataTable<IncidentReportDto>
            columns={incColumns}
            data={paged}
            rowKey={(r) => r.id}
            onRowClick={(r) => setDetail(r)}
            actions={(r) => (
              <div className="ab-actions">
                <ActBtn ic="eye" title="Chi tiết" onClick={() => setDetail(r)} />
                <ActBtn ic="edit" title="Cập nhật" onClick={() => setDetail(r)} />
              </div>
            )}
            empty={loading ? 'Đang tải…' : (
              <div className="ab-empty">
                <TermIcon name="check" size={20} />
                <div>Không có sự cố nào</div>
              </div>
            )}
          />
          <Pager page={page} totalPages={totalPages} setPage={setPage} total={incFiltered.length} perPage={PAGE_SIZE} />
        </>
      )}

      {tab === 'audit' && <AuditTab />}

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{detail.incidentCode}</span>
              <span style={{ fontSize: 14 }}>{detail.incidentTypeName || detail.incidentType}</span>
            </span>
          : ''}
        sub={detail ? `${detail.departmentName} · ${fmtDMY(detail.reportedDate)}` : ''}
        size="lg"
      >
        {detail && <IncidentDrawerBody r={detail} />}
      </DrawerShell>

      <IncidentReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onDone={() => { setReportOpen(false); reload(); }}
      />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   Incident report modal — real createIncident with department lookup.
   ────────────────────────────────────────────────────────── */

const INCIDENT_TYPES = [
  'Té ngã', 'Sai sót dùng thuốc', 'Nhiễm khuẩn bệnh viện', 'Sự cố thiết bị',
  'Sai sót quy trình/thủ thuật', 'Sự cố truyền máu', 'Suýt sai sót (near-miss)', 'Khác',
];
const SEVERITY_OPTS = [
  { value: 1, label: '1 · Không tổn hại' },
  { value: 2, label: '2 · Tổn hại nhẹ' },
  { value: 3, label: '3 · Tổn hại trung bình' },
  { value: 4, label: '4 · Tổn hại nặng' },
  { value: 5, label: '5 · Nghiêm trọng' },
  { value: 6, label: '6 · Tử vong / Sentinel' },
];

const IncidentReportModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [depts, setDepts] = useState<DepartmentCatalogDto[]>([]);
  const [when, setWhen] = useState(() => dayjs());
  const [deptId, setDeptId] = useState<string | undefined>(undefined);
  const [incidentType, setIncidentType] = useState<string | undefined>(undefined);
  const [severity, setSeverity] = useState(2);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [immediate, setImmediate] = useState('');
  const [reportable, setReportable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setWhen(dayjs()); setDeptId(undefined); setIncidentType(undefined); setSeverity(2);
      setLocation(''); setDescription(''); setImmediate(''); setReportable(false);
      catalogApi.getDepartments(undefined, undefined, true)
        .then((r) => setDepts(r.data || []))
        .catch(() => setDepts([]));
    }
  }, [open]);

  const submit = async () => {
    if (!deptId) { message.warning('Chọn khoa/phòng xảy ra sự cố'); return; }
    if (!incidentType) { message.warning('Chọn loại sự cố'); return; }
    if (!description.trim()) { message.warning('Nhập mô tả sự cố'); return; }
    setBusy(true);
    try {
      await createIncident({
        incidentDate: when.format('YYYY-MM-DD'),
        incidentTime: when.format('HH:mm'),
        departmentId: deptId,
        locationDescription: location.trim(),
        incidentType,
        severity,
        description: description.trim(),
        immediateActions: immediate.trim() || undefined,
        isReportable: reportable,
      });
      message.success('Đã ghi nhận báo cáo sự cố');
      onDone();
    } catch {
      message.error('Báo cáo sự cố thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Báo cáo sự cố y khoa"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Ghi nhận'}
          </Btn>
        </>
      )}
    >
      <div style={{ padding: 'var(--space-16)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <Fld label="Thời điểm xảy ra">
          <DatePicker showTime value={when} onChange={(v) => v && setWhen(v)} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
        </Fld>
        <Fld label="Khoa / phòng *">
          <Select
            value={deptId} onChange={setDeptId} showSearch optionFilterProp="label"
            placeholder="Chọn khoa" style={{ width: '100%' }}
            options={depts.map((d) => ({ value: d.id!, label: d.name }))}
          />
        </Fld>
        <Fld label="Loại sự cố *">
          <Select
            value={incidentType} onChange={setIncidentType} placeholder="Chọn loại"
            style={{ width: '100%' }} options={INCIDENT_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </Fld>
        <Fld label="Mức độ">
          <Select value={severity} onChange={setSeverity} options={SEVERITY_OPTS} style={{ width: '100%' }} />
        </Fld>
        <Fld label="Vị trí cụ thể" full>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="VD: buồng bệnh 305, hành lang khoa…" />
        </Fld>
        <Fld label="Mô tả sự cố *" full>
          <Input.TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Diễn biến, hậu quả…" />
        </Fld>
        <Fld label="Xử lý ngay" full>
          <Input.TextArea value={immediate} onChange={(e) => setImmediate(e.target.value)} rows={2} placeholder="Biện pháp đã thực hiện ngay (nếu có)…" />
        </Fld>
        <Fld full>
          <Checkbox checked={reportable} onChange={(e) => setReportable(e.target.checked)}>
            Sự cố bắt buộc báo cáo cấp trên (Sở Y tế / Bộ Y tế)
          </Checkbox>
        </Fld>
      </div>
    </ModalShell>
  );
};

const Fld: React.FC<{ label?: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
    {label && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>{label}</div>}
    {children}
  </div>
);

const KpiTab: React.FC<{ indicators: QualityIndicatorDto[]; loading: boolean }> = ({ indicators, loading }) => {
  const groups = useMemo(() => {
    const map = new Map<string, QualityIndicatorDto[]>();
    indicators.forEach((i) => {
      const k = i.categoryName || i.category || 'Khác';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(i);
    });
    return Array.from(map.entries());
  }, [indicators]);

  if (loading) return <div style={{ padding: 'var(--space-20)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải…</div>;
  if (indicators.length === 0) {
    return (
      <div className="ab-empty" style={{ padding: 'var(--space-40)' }}>
        <TermIcon name="chart" size={20} />
        <div>Chưa có chỉ số chất lượng</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 18px 16px', overflow: 'auto' }}>
      {groups.map(([groupName, items]) => (
        <div key={groupName} style={{
          marginTop: 'var(--space-14)', border: '1px solid var(--line)',
          background: 'var(--d-2)', borderRadius: 'var(--r-3)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px', background: 'var(--d-1)',
            fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', letterSpacing: '.06em',
            color: 'var(--t-1)', fontWeight: 600,
            borderBottom: '1px solid var(--line)',
          }}>{groupName}</div>
          <div>
            {items.map((ind) => {
              const cur = (ind as QualityIndicatorDto & { currentValue?: number }).currentValue || 0;
              const ok = ind.targetType === 'AtMost' ? cur <= ind.targetValue : cur >= ind.targetValue;
              const pct = Math.min(100, (cur / Math.max(ind.targetValue, cur, 1)) * 100);
              return (
                <div key={ind.id} style={{
                  display: 'grid', gridTemplateColumns: '110px 1fr 220px 140px 90px',
                  gap: 'var(--space-14)', padding: '12px 14px', borderBottom: '1px solid var(--line-soft)',
                  alignItems: 'center', fontSize: 'var(--fs-md)',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{ind.indicatorCode}</div>
                  <div style={{ fontWeight: 500, color: 'var(--t-0)' }}>{ind.name}</div>
                  <div style={{
                    position: 'relative', height: 8, background: 'var(--d-2, var(--d-3))',
                    borderRadius: 4, overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${pct}%`,
                      background: ok ? '#15803d' : 'var(--s-crit)',
                    }} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'right' }}>
                    {cur.toLocaleString('vi-VN')}
                    <span style={{ color: 'var(--t-2)', fontWeight: 400 }}> / {ind.targetValue.toLocaleString('vi-VN')}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StatusBadge tone={ok ? 'ok' : 'crit'} dot>{ok ? 'Đạt' : 'Chưa đạt'}</StatusBadge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const AuditTab: React.FC = () => (
  <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-14)' }}>
    {[
      { title: 'Đánh giá CL BV theo BYT', date: 'Q4/2025', score: '4.2/5', status: 'Hoàn tất', tone: 'ok' as const },
      { title: 'Audit kiểm soát NK',       date: 'T11/2025', score: '92%',   status: 'Hoàn tất', tone: 'ok' as const },
      { title: 'Audit an toàn thuốc',      date: 'T11/2025', score: '88%',   status: 'Hoàn tất', tone: 'ok' as const },
      { title: 'Audit hồ sơ BA',           date: 'T12/2025', score: 'Đang thực hiện', status: 'Đang triển khai', tone: 'warn' as const },
    ].map((a, i) => (
      <div key={i} style={{
        border: '1px solid var(--line)', background: 'var(--d-2)',
        borderRadius: 'var(--r-3)', padding: 'var(--space-14)',
      }}>
        <div style={{ fontWeight: 600, fontSize: 'var(--fs-md)', marginBottom: 'var(--space-8)' }}>{a.title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
          <span>Kỳ {a.date}</span>
          <StatusBadge tone={a.tone} dot>{a.status}</StatusBadge>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600,
          color: 'var(--a-cy)', marginTop: 'var(--space-10)',
        }}>{a.score}</div>
      </div>
    ))}
  </div>
);

function buildIncidentReportHtml(r: IncidentReportDto): string {
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
  const row = (label: string, value: string) =>
    `<tr><td style="width:38%;font-weight:600;color:#555;padding:5px 8px;border:1px solid #ccc">${label}</td><td style="padding:5px 8px;border:1px solid #ccc">${value || '—'}</td></tr>`;
  const section = (title: string, body: string) =>
    `<div style="margin-top:14px"><div style="font-weight:700;font-size:13pt;border-bottom:1px solid #aaa;padding-bottom:3px;margin-bottom:6px">${title}</div>${body}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Phiếu báo cáo sự cố</title>
<style>body{font-family:'Times New Roman',serif;margin:18mm 15mm;font-size:13pt}
h2{text-align:center;font-size:15pt;margin:8px 0}h4{text-align:center;font-size:12pt;font-weight:normal;margin:4px 0 16px}
table{width:100%;border-collapse:collapse}.pre{white-space:pre-wrap;font-size:12.5pt;border:1px solid #ccc;padding:6px 8px;min-height:36px}
</style></head><body>
<div style="text-align:center;font-weight:bold;font-size:11pt">${HOSPITAL_NAME}</div>
<h2>PHIẾU BÁO CÁO SỰ CỐ Y KHOA</h2>
<h4>Mã phiếu: ${r.incidentCode || '...'}</h4>
${section('I. THÔNG TIN SỰ CỐ', `<table>
${row('Loại sự cố', r.incidentTypeName || r.incidentType)}
${row('Mức độ nghiêm trọng', r.severityName)}
${row('Khoa/Phòng', r.departmentName)}
${row('Vị trí xảy ra', r.locationDescription || '—')}
${row('Người báo cáo', r.reportedByName)}
${row('Ngày báo cáo', fmtDate(r.reportedDate))}</table>`)}
${section('II. MÔ TẢ SỰ CỐ', `<div class="pre">${r.description || '—'}</div>`)}
${r.immediateActions ? section('III. XỬ LÝ NGAY LẬP TỨC', `<div class="pre">${r.immediateActions}</div>`) : ''}
${r.investigationRequired ? section('IV. ĐIỀU TRA NGUYÊN NHÂN', `<table>
${row('Người điều tra', r.investigatorName || 'Chưa phân công')}
${r.investigationStartDate ? row('Bắt đầu điều tra', fmtDate(r.investigationStartDate)) : ''}
${r.investigationCompletedDate ? row('Kết thúc điều tra', fmtDate(r.investigationCompletedDate)) : ''}
${r.rcaMethod ? row('Phương pháp RCA', r.rcaMethod) : ''}</table>
${r.rootCauseAnalysis ? `<div class="pre" style="margin-top:6px">${r.rootCauseAnalysis}</div>` : ''}`) : ''}
${r.preventiveMeasures ? section('V. BIỆN PHÁP PHÒNG NGỪA', `<div class="pre">${r.preventiveMeasures}</div>`) : ''}
${r.lessonLearned ? section('VI. BÀI HỌC RÚT RA', `<div class="pre">${r.lessonLearned}</div>`) : ''}
<div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:24px;text-align:center;font-size:12pt">
<div><b>Người báo cáo</b><br/><span style="font-size:10pt;color:#888">(Ký và ghi rõ họ tên)</span><div style="height:60px"></div><b>${r.reportedByName || '................'}</b></div>
<div><b>Trưởng khoa/phòng</b><br/><span style="font-size:10pt;color:#888">(Ký và ghi rõ họ tên)</span><div style="height:60px"></div><b>................</b></div>
</div>
</body></html>`;
}

const IncidentDrawerBody: React.FC<{ r: IncidentReportDto }> = ({ r }) => (
  <>
    <div className="rec-section">
      <h5><TermIcon name="alert" size={11} /> THÔNG TIN SỰ CỐ</h5>
      <div className="rec-kv">
        <span>Mã sự cố</span><span className="mono">{r.incidentCode}</span>
        <span>Loại</span><b>{r.incidentTypeName || r.incidentType}</b>
        <span>Mức độ</span>
        <span><span className={`chip ${SEVERITY_TONE[r.severity] || 'info'}`}>{r.severityName}</span></span>
        <span>Khoa</span><span>{r.departmentName}</span>
        <span>Vị trí</span><span>{r.locationDescription || '—'}</span>
        <span>Báo cáo</span><span>{r.reportedByName} · {fmtDMY(r.reportedDate)}</span>
      </div>
    </div>

    <div className="rec-section">
      <h5><TermIcon name="info" size={11} /> MÔ TẢ</h5>
      <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>
        {r.description || '—'}
      </div>
    </div>

    {r.immediateActions && (
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> XỬ LÝ NGAY</h5>
        <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.immediateActions}</div>
      </div>
    )}

    {r.investigationRequired && (
      <div className="rec-section">
        <h5><TermIcon name="search" size={11} /> ĐIỀU TRA</h5>
        <div className="rec-kv">
          <span>Người điều tra</span><span>{r.investigatorName || 'Chưa phân'}</span>
          {r.investigationStartDate && (<><span>Bắt đầu</span><span>{fmtDMY(r.investigationStartDate)}</span></>)}
          {r.investigationCompletedDate && (<><span>Kết thúc</span><span>{fmtDMY(r.investigationCompletedDate)}</span></>)}
          {r.rcaMethod && (<><span>PP RCA</span><span>{r.rcaMethod}</span></>)}
        </div>
        {r.rootCauseAnalysis && (
          <div style={{ fontSize: 12.5, color: 'var(--t-1)', marginTop: 'var(--space-8)', whiteSpace: 'pre-wrap' }}>
            {r.rootCauseAnalysis}
          </div>
        )}
      </div>
    )}

    {r.preventiveMeasures && (
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> PHÒNG NGỪA</h5>
        <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.preventiveMeasures}</div>
      </div>
    )}

    {r.lessonLearned && (
      <div className="rec-section">
        <h5><TermIcon name="info" size={11} /> BÀI HỌC RÚT RA</h5>
        <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.lessonLearned}</div>
      </div>
    )}

    <div style={{ marginTop: 'var(--space-12)', borderTop: '1px solid var(--line-soft)', paddingTop: 'var(--space-10)' }}>
      <Btn variant="ghost" onClick={() => openPrintWindow(buildIncidentReportHtml(r), { focus: true, print: { delayMs: 500 } })}>
        <TermIcon name="printer" size={12} /> In phiếu báo cáo sự cố
      </Btn>
    </div>
  </>
);

export default QualityV2;
