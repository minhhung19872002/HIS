import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input, Select, DatePicker, Checkbox, Rate, Progress } from 'antd';
import {
  getIncidents, getQualityIndicators, createIncident, investigateIncident,
  getAudits, createAudit, getDashboard, getCAPAs, getSatisfactionStatistics,
} from '../api/quality';
import type {
  IncidentReportDto, QualityIndicatorDto, InternalAuditDto, QualityDashboardDto,
  CAPADto, SatisfactionStatisticsDto, DepartmentSatisfactionDto, CorrectiveActionDto,
} from '../api/quality';
import { catalogApi } from '../../system/api/system';
import type { DepartmentCatalogDto } from '../../system/api/system';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, ModalShell, useTabCounts, tk, tw,
  type ColumnDef, type StatusTab, type TopTab, type StatusTone,
} from '../../../pages-v2/_v2kit';
import TermIcon from '../../../layouts/terminal/Icon';
import { openPrintWindow } from '../../../utils/printWindow';
import { HOSPITAL_NAME } from '../../../constants/hospital';

/* ────────────────────────────────────────────────────────────
   Chất lượng v2 — port of design-system-v2/his/project/Quality v2.html
   + full parity port từ v1 pages/Quality.tsx (#409 batch-4):
   6 tabs: KPI indicators · Sự cố y khoa · Audit (đánh giá định kỳ,
   dữ liệu thật + lên lịch) · CAPA · Tiêu chuẩn (JCI/ISO/83 BYT) ·
   Hài lòng BN. Thêm: dashboard stats, form điều tra RCA trong drawer,
   in báo cáo chất lượng tháng.
   ──────────────────────────────────────────────────────────── */

type TopKey = 'kpi' | 'incidents' | 'audit' | 'capa' | 'standards' | 'satisfaction';
type IncStatusKey = 'reported' | 'investigation' | 'closed';

const TOP_TABS: TopTab<TopKey>[] = [
  { v: 'kpi',          l: 'Bộ chỉ số chất lượng', ic: 'chart' },
  { v: 'incidents',    l: 'Sự cố y khoa',         ic: 'alert' },
  { v: 'audit',        l: 'Đánh giá định kỳ',     ic: 'file-text' },
  { v: 'capa',         l: 'CAPA',                 ic: 'check' },
  { v: 'standards',    l: 'Tiêu chuẩn',           ic: 'shield' },
  { v: 'satisfaction', l: 'Hài lòng BN',          ic: 'star' },
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

/* v1 status-mapping (port verbatim từ pages/Quality.tsx) */
const INC_STATUS_TEXT: Record<number, { tone: StatusTone; text: string }> = {
  1: { tone: 'info', text: 'Đã báo cáo' },
  2: { tone: 'warn', text: 'Đang điều tra' },
  3: { tone: 'info', text: 'Đã điều tra' },
  4: { tone: 'warn', text: 'Chờ xử lý' },
  5: { tone: 'ok',   text: 'Đã đóng' },
};

const AUDIT_TYPE_LABELS: Record<string, string> = {
  Scheduled: 'Định kỳ',
  Unscheduled: 'Đột xuất',
  FollowUp: 'Theo dõi',
  Surveillance: 'Giám sát',
};

const AUDIT_STATUS: Record<number, { tone: StatusTone; text: string }> = {
  1: { tone: 'info', text: 'Đã lên lịch' },
  2: { tone: 'warn', text: 'Đang thực hiện' },
  3: { tone: 'ok',   text: 'Hoàn thành' },
  4: { tone: 'info', text: 'Theo dõi' },
  5: { tone: 'info', text: 'Đã đóng' },
};

/* CAPA priority 1-Low 2-Medium 3-High 4-Critical (v1: default/blue/orange/red) */
const CAPA_PRIORITY_TONE: Record<number, StatusTone> = { 1: 'info', 2: 'info', 3: 'warn', 4: 'crit' };
/* CAPA status 1-Open 2-InProgress 3-PendingVerification 4-Verified 5-Closed (v1: blue/orange/gold/green/default) */
const CAPA_STATUS_TONE: Record<number, StatusTone> = { 1: 'info', 2: 'warn', 3: 'warn', 4: 'ok', 5: 'info' };

const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
const fmtDMYHM = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY HH:mm') : '—';

const PRE_STYLE: React.CSSProperties = { fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' };
const CARD_STYLE: React.CSSProperties = {
  border: '1px solid var(--line)', background: 'var(--d-2)',
  borderRadius: 'var(--r-3)', padding: 'var(--space-14)',
};
const CARD_TITLE_STYLE: React.CSSProperties = { fontWeight: 600, fontSize: 'var(--fs-md)', marginBottom: 'var(--space-10)' };

const QualityV2: React.FC = () => {
  const [tab, setTab] = useState<TopKey>('kpi');
  const [incidents, setIncidents] = useState<IncidentReportDto[]>([]);
  const [indicators, setIndicators] = useState<QualityIndicatorDto[]>([]);
  const [audits, setAudits] = useState<InternalAuditDto[]>([]);
  const [dashboard, setDashboard] = useState<QualityDashboardDto | null>(null);
  const [capas, setCapas] = useState<CAPADto[]>([]);
  const [satisfactionStats, setSatisfactionStats] = useState<SatisfactionStatisticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [stab, setStab] = useState<IncStatusKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<IncidentReportDto | null>(null);
  const [auditDetail, setAuditDetail] = useState<InternalAuditDto | null>(null);
  const [capaDetail, setCapaDetail] = useState<CAPADto | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const PAGE_SIZE = 16;

  const reload = () => {
    setLoading(true);
    const today = dayjs().format('YYYY-MM-DD');
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    Promise.allSettled([
      getIncidents({ page: 1, pageSize: 200 }),
      getQualityIndicators(),
      getAudits(),
      getDashboard(today),
      getCAPAs(),
      getSatisfactionStatistics(monthStart, today),
    ]).then(([i, q, a, d, c, s]) => {
      if (i.status === 'fulfilled') setIncidents(i.value.data?.items || []);
      else tw('Không thể tải danh sách sự cố');
      if (q.status === 'fulfilled') setIndicators((q.value.data || []) as QualityIndicatorDto[]);
      else tw('Không thể tải chỉ số chất lượng');
      if (a.status === 'fulfilled') setAudits(a.value.data || []);
      else tw('Không thể tải danh sách audit');
      // Dashboard / CAPA / satisfaction là dữ liệu bổ trợ — lỗi thì im lặng (như v1)
      if (d.status === 'fulfilled') setDashboard(d.value.data ?? null);
      if (c.status === 'fulfilled') setCapas(c.value.data || []);
      if (s.status === 'fulfilled') setSatisfactionStats(s.value.data ?? null);
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

  // Statistics from dashboard or computed from local data (v1 verbatim)
  const openIncidents = dashboard?.openIncidents ?? incidents.filter(
    (i) => i.status !== 5 // Not Closed
  ).length;
  const criticalKPIs = dashboard?.indicatorsCritical ?? indicators.filter(
    (i) => i.criticalThreshold != null && i.criticalThreshold > 0
  ).length;
  const upcomingAudits = dashboard?.auditsPlanned ?? audits.filter(
    (a) => a.status === 1 // Planned
  ).length;

  /* In báo cáo chất lượng tháng — port verbatim từ v1 executePrintReport */
  const executePrintReport = () => {
    openPrintWindow(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Báo cáo chất lượng</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background: #f0f0f0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <strong>${HOSPITAL_NAME}</strong><br/>
          Phòng Quản lý chất lượng
        </div>

        <div class="title">BÁO CÁO CHẤT LƯỢNG THÁNG ${dayjs().format('MM/YYYY')}</div>

        <h3>1. Chỉ số chất lượng</h3>
        <table>
          <tr>
            <th>Chỉ số</th>
            <th>Mục tiêu</th>
            <th>Đánh giá</th>
          </tr>
          ${indicators.map((ind) => `
            <tr>
              <td>${ind.name}</td>
              <td>${ind.targetValue}</td>
              <td>${ind.isActive ? 'Đang theo dõi' : 'Tạm ngưng'}</td>
            </tr>
          `).join('')}
        </table>

        <h3>2. Sự cố y khoa</h3>
        <table>
          <tr>
            <th>Loại</th>
            <th>Số lượng</th>
          </tr>
          <tr>
            <td>Tổng sự cố</td>
            <td>${incidents.length}</td>
          </tr>
          <tr>
            <td>Đã đóng</td>
            <td>${incidents.filter((i) => i.status === 5).length}</td>
          </tr>
          <tr>
            <td>Chưa xử lý</td>
            <td>${incidents.filter((i) => i.status !== 5).length}</td>
          </tr>
        </table>

        <h3>3. Audit</h3>
        <table>
          <tr>
            <th>Tên audit</th>
            <th>Khoa/Phòng</th>
            <th>Ngày</th>
            <th>Trạng thái</th>
          </tr>
          ${audits.map((a) => `
            <tr>
              <td>${a.title}</td>
              <td>${a.departmentName}</td>
              <td>${a.scheduledDate}</td>
              <td>${a.statusName}</td>
            </tr>
          `).join('')}
        </table>

        <div style="margin-top: 50px; text-align: right;">
          <p>Ngày ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Trưởng phòng QLCL</strong></p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
  };

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
      {/* Hàng stats v1: 3 chỉ số chính + dashboard bổ trợ (port từ v1 Statistic rows) */}
      <KpiStrip
        items={[
          { lbl: 'Sự cố chưa xử lý', val: openIncidents, sub: 'chưa đóng', tone: 'crit' },
          { lbl: 'KPI cảnh báo', val: criticalKPIs, sub: 'ngưỡng critical', tone: 'warn' },
          { lbl: 'Audit sắp tới', val: upcomingAudits, sub: dashboard ? `${dashboard.auditsCompleted} hoàn thành` : 'đã lên lịch', tone: 'info' },
          { lbl: 'Sự cố tháng này', val: dashboard?.incidentsThisMonth ?? '—', sub: 'trong tháng' },
          {
            lbl: 'Hài lòng BN', val: dashboard?.overallSatisfaction ?? '—',
            unit: dashboard ? '%' : undefined,
            tone: dashboard ? (dashboard.overallSatisfaction >= 80 ? 'ok' : 'warn') : undefined,
          },
          {
            lbl: 'CAPA quá hạn', val: dashboard?.overdueCAPAs ?? '—', sub: `${capas.length} CAPA`,
            tone: dashboard ? (dashboard.overdueCAPAs > 0 ? 'crit' : 'ok') : undefined,
          },
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
            <Btn variant="ghost" onClick={executePrintReport}>
              <TermIcon name="printer" size={12} /> In báo cáo
            </Btn>
            <Btn variant="primary" onClick={() => setReportOpen(true)}>
              <TermIcon name="plus" size={12} /> Báo cáo sự cố
            </Btn>
          </>
        }
      />

      {tab === 'kpi' && <KpiTab indicators={indicators} loading={loading} dashboard={dashboard} />}

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

      {tab === 'audit' && (
        <>
          <div className="ab-tools">
            <Btn variant="primary" onClick={() => setAuditModalOpen(true)}>
              <TermIcon name="plus" size={12} /> Lên lịch audit
            </Btn>
            <span className="spacer" />
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{audits.length} audit</span>
          </div>
          <DataTable<InternalAuditDto>
            columns={AUDIT_COLUMNS}
            data={audits}
            rowKey={(r) => r.id}
            onRowClick={(r) => setAuditDetail(r)}
            actions={(r) => (
              <div className="ab-actions">
                <ActBtn ic="eye" title="Chi tiết" onClick={() => setAuditDetail(r)} />
              </div>
            )}
            empty={loading ? 'Đang tải…' : (
              <div className="ab-empty">
                <TermIcon name="file-text" size={20} />
                <div>Chưa có audit nào</div>
              </div>
            )}
          />
        </>
      )}

      {tab === 'capa' && (
        <>
          <div className="ab-tools">
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
              CAPA — hành động khắc phục / phòng ngừa
            </span>
            <span className="spacer" />
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{capas.length} CAPA</span>
          </div>
          <DataTable<CAPADto>
            columns={CAPA_COLUMNS}
            data={capas}
            rowKey={(r) => r.id}
            onRowClick={(r) => setCapaDetail(r)}
            actions={(r) => (
              <div className="ab-actions">
                <ActBtn ic="eye" title="Chi tiết" onClick={() => setCapaDetail(r)} />
              </div>
            )}
            empty={loading ? 'Đang tải…' : (
              <div className="ab-empty">
                <TermIcon name="check" size={20} />
                <div>Chưa có CAPA nào</div>
              </div>
            )}
          />
        </>
      )}

      {tab === 'standards' && <StandardsTab />}

      {tab === 'satisfaction' && <SatisfactionTab stats={satisfactionStats} dashboard={dashboard} />}

      {/* Drawer chi tiết sự cố + form điều tra RCA */}
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
        {detail && (
          <IncidentDrawerBody
            key={detail.id}
            r={detail}
            onDone={() => { setDetail(null); reload(); }}
          />
        )}
      </DrawerShell>

      {/* Drawer chi tiết audit */}
      <DrawerShell
        open={!!auditDetail}
        onClose={() => setAuditDetail(null)}
        title={auditDetail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{auditDetail.auditCode}</span>
              <span style={{ fontSize: 14 }}>{auditDetail.title}</span>
            </span>
          : ''}
        sub={auditDetail ? `${auditDetail.departmentName || ''} · ${fmtDMY(auditDetail.scheduledDate)}` : ''}
        size="md"
      >
        {auditDetail && <AuditDrawerBody a={auditDetail} />}
      </DrawerShell>

      {/* Drawer chi tiết CAPA */}
      <DrawerShell
        open={!!capaDetail}
        onClose={() => setCapaDetail(null)}
        title={capaDetail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{capaDetail.capaCode}</span>
              <span style={{ fontSize: 14 }}>{capaDetail.title}</span>
            </span>
          : ''}
        sub={capaDetail ? `${capaDetail.departmentName || ''} · hạn ${fmtDMY(capaDetail.dueDate)}` : ''}
        size="md"
      >
        {capaDetail && <CapaDrawerBody c={capaDetail} />}
      </DrawerShell>

      <IncidentReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onDone={() => { setReportOpen(false); reload(); }}
      />

      <AuditCreateModal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        onDone={() => { setAuditModalOpen(false); reload(); }}
      />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   Audit table columns (port verbatim từ v1 auditColumns)
   ────────────────────────────────────────────────────────── */

const AUDIT_COLUMNS: ColumnDef<InternalAuditDto>[] = [
  { key: 'code', label: 'Mã', mono: true, width: 110, render: (r) => r.auditCode },
  { key: 'title', label: 'Tên audit', render: (r) => <b>{r.title}</b> },
  {
    key: 'type', label: 'Loại', width: 110,
    render: (r) => r.auditTypeName || AUDIT_TYPE_LABELS[r.auditType] || r.auditType,
  },
  { key: 'dept', label: 'Khoa/Phòng', width: 150, render: (r) => r.departmentName || '—' },
  { key: 'date', label: 'Ngày', mono: true, width: 105, render: (r) => fmtDMY(r.scheduledDate) },
  { key: 'lead', label: 'Trưởng đoàn', width: 150, render: (r) => r.leadAuditorName || '—' },
  { key: 'findings', label: 'Phát hiện', mono: true, width: 85, render: (r) => r.totalFindings ?? '—' },
  {
    key: 'status', label: 'Trạng thái', width: 135,
    render: (r) => {
      const c = AUDIT_STATUS[r.status];
      return <StatusBadge tone={c?.tone || 'info'} dot>{r.statusName || c?.text || `Trạng thái ${r.status}`}</StatusBadge>;
    },
  },
];

/* ──────────────────────────────────────────────────────────
   CAPA table columns (port verbatim từ v1 capaColumns)
   ────────────────────────────────────────────────────────── */

const CAPA_COLUMNS: ColumnDef<CAPADto>[] = [
  { key: 'code', label: 'Mã', mono: true, width: 110, render: (r) => r.capaCode },
  { key: 'title', label: 'Tiêu đề', render: (r) => <b>{r.title}</b> },
  { key: 'source', label: 'Nguồn', width: 110, render: (r) => r.sourceTypeName || r.sourceType },
  { key: 'dept', label: 'Khoa', width: 140, render: (r) => r.departmentName || '—' },
  {
    key: 'priority', label: 'Ưu tiên', width: 90,
    render: (r) => <span className={`chip ${CAPA_PRIORITY_TONE[r.priority] || 'info'}`}>{r.priorityName || `P${r.priority}`}</span>,
  },
  { key: 'resp', label: 'Người chịu trách nhiệm', width: 165, render: (r) => r.responsiblePersonName || '—' },
  { key: 'due', label: 'Hạn', mono: true, width: 100, render: (r) => fmtDMY(r.dueDate) },
  {
    key: 'status', label: 'Trạng thái', width: 135,
    render: (r) => <StatusBadge tone={CAPA_STATUS_TONE[r.status] || 'info'} dot>{r.statusName || `Trạng thái ${r.status}`}</StatusBadge>,
  },
];

/* Hành động khắc phục trong drawer sự cố (port từ v1 investigation modal) */
const CA_COLUMNS: ColumnDef<CorrectiveActionDto>[] = [
  { key: 'action', label: 'Hành động', render: (a) => a.actionDescription },
  { key: 'type', label: 'Loại', width: 100, render: (a) => a.actionType },
  { key: 'resp', label: 'Người thực hiện', width: 140, render: (a) => a.responsiblePersonName },
  { key: 'due', label: 'Hạn', mono: true, width: 100, render: (a) => fmtDMY(a.dueDate) },
  { key: 'status', label: 'Trạng thái', width: 110, render: (a) => a.statusName },
];

/* ──────────────────────────────────────────────────────────
   Incident report modal — real createIncident with department lookup.
   ────────────────────────────────────────────────────────── */

/* v1 constants (pages/quality/constants.ts) — port verbatim; value khớp enum BE
   (PatientSafety, MedicationError, Fall, HAI, Equipment, Other) */
const INCIDENT_TYPES = [
  { value: 'MedicationError', label: 'Sai sót thuốc' },
  { value: 'Fall', label: 'Té ngã' },
  { value: 'HAI', label: 'Nhiễm khuẩn' },
  { value: 'PatientSafety', label: 'Sai định danh' },
  { value: 'Equipment', label: 'Thiết bị hỏng' },
  { value: 'Other', label: 'Khác' },
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
  const [patientId, setPatientId] = useState('');
  const [notes, setNotes] = useState('');
  const [reportable, setReportable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setWhen(dayjs()); setDeptId(undefined); setIncidentType(undefined); setSeverity(2);
      setLocation(''); setDescription(''); setImmediate(''); setPatientId(''); setNotes(''); setReportable(false);
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
        patientId: patientId.trim() || undefined,
        description: description.trim(),
        immediateActions: immediate.trim() || undefined,
        isReportable: reportable,
        notes: notes.trim() || undefined,
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
            style={{ width: '100%' }} options={INCIDENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
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
        <Fld label="Mã bệnh nhân (nếu có)">
          <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="BN-XXXX" />
        </Fld>
        <Fld label=" ">
          <Checkbox checked={reportable} onChange={(e) => setReportable(e.target.checked)}>
            Bắt buộc báo cáo cấp trên (Sở Y tế / Bộ Y tế)
          </Checkbox>
        </Fld>
        <Fld label="Ghi chú thêm" full>
          <Input.TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Fld>
      </div>
    </ModalShell>
  );
};

/* ──────────────────────────────────────────────────────────
   Audit create modal — createAudit (payload port verbatim từ v1 handleAddAudit)
   ────────────────────────────────────────────────────────── */

const AuditCreateModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, onClose, onDone }) => {
  const [depts, setDepts] = useState<DepartmentCatalogDto[]>([]);
  const [title, setTitle] = useState('');
  const [auditType, setAuditType] = useState<string | undefined>(undefined);
  const [deptId, setDeptId] = useState<string | undefined>(undefined);
  const [scheduledDate, setScheduledDate] = useState(() => dayjs());
  const [leadAuditorId, setLeadAuditorId] = useState('');
  const [scope, setScope] = useState('');
  const [objective, setObjective] = useState('');
  const [criteria, setCriteria] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(''); setAuditType(undefined); setDeptId(undefined); setScheduledDate(dayjs());
      setLeadAuditorId(''); setScope(''); setObjective(''); setCriteria(''); setNotes('');
      catalogApi.getDepartments(undefined, undefined, true)
        .then((r) => setDepts(r.data || []))
        .catch(() => setDepts([]));
    }
  }, [open]);

  const submit = async () => {
    if (!title.trim()) { tw('Nhập tên audit'); return; }
    if (!auditType) { tw('Chọn loại audit'); return; }
    if (!deptId) { tw('Chọn khoa/phòng'); return; }
    setBusy(true);
    try {
      await createAudit({
        auditType,
        title: title.trim(),
        scope: scope.trim(),
        objective: objective.trim(),
        criteria: criteria.trim(),
        departmentId: deptId,
        scheduledDate: scheduledDate.format('YYYY-MM-DD'),
        leadAuditorId: leadAuditorId.trim(),
        auditTeam: [],
        notes: notes.trim() || undefined,
      });
      tk('Đã lên lịch audit');
      onDone();
    } catch {
      tw('Không thể tạo audit');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Lên lịch audit"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Lên lịch'}
          </Btn>
        </>
      )}
    >
      <div style={{ padding: 'var(--space-16)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <Fld label="Tên audit *" full>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Fld>
        <Fld label="Loại *">
          <Select
            value={auditType} onChange={setAuditType} placeholder="Chọn loại audit"
            style={{ width: '100%' }}
            options={Object.entries(AUDIT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </Fld>
        <Fld label="Khoa / Phòng *">
          <Select
            value={deptId} onChange={setDeptId} showSearch optionFilterProp="label"
            placeholder="Chọn khoa/phòng" style={{ width: '100%' }}
            options={depts.map((d) => ({ value: d.id!, label: d.name }))}
          />
        </Fld>
        <Fld label="Ngày *">
          <DatePicker value={scheduledDate} onChange={(v) => v && setScheduledDate(v)} format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Fld>
        <Fld label="Trưởng đoàn audit">
          <Input value={leadAuditorId} onChange={(e) => setLeadAuditorId(e.target.value)} placeholder="ID người thực hiện" />
        </Fld>
        <Fld label="Phạm vi" full>
          <Input.TextArea value={scope} onChange={(e) => setScope(e.target.value)} rows={2} placeholder="Phạm vi audit…" />
        </Fld>
        <Fld label="Mục tiêu" full>
          <Input.TextArea value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} placeholder="Mục tiêu audit…" />
        </Fld>
        <Fld label="Tiêu chí" full>
          <Input value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder="VD: ISO 9001:2015, JCI…" />
        </Fld>
        <Fld label="Ghi chú" full>
          <Input.TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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

const KpiTab: React.FC<{
  indicators: QualityIndicatorDto[];
  loading: boolean;
  dashboard: QualityDashboardDto | null;
}> = ({ indicators, loading, dashboard }) => {
  const groups = useMemo(() => {
    const map = new Map<string, QualityIndicatorDto[]>();
    indicators.forEach((i) => {
      const k = i.categoryName || i.category || 'Khác';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(i);
    });
    return Array.from(map.entries());
  }, [indicators]);

  // v1 helpers (port verbatim): current value + trend từ dashboard.qiTrends
  const trendOf = (ind: QualityIndicatorDto) =>
    dashboard?.qiTrends?.find((t) => t.indicatorId === ind.id);

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
              const cur = ((ind as QualityIndicatorDto & { currentValue?: number }).currentValue
                ?? trendOf(ind)?.currentValue) || 0;
              const trend = trendOf(ind)?.trend || 'Stable';
              const ok = ind.targetType === 'AtMost' ? cur <= ind.targetValue : cur >= ind.targetValue;
              const pct = Math.min(100, (cur / Math.max(ind.targetValue, cur, 1)) * 100);
              return (
                <div key={ind.id} style={{
                  display: 'grid', gridTemplateColumns: '110px 1fr 220px 140px 90px',
                  gap: 'var(--space-14)', padding: '12px 14px', borderBottom: '1px solid var(--line-soft)',
                  alignItems: 'center', fontSize: 'var(--fs-md)',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{ind.indicatorCode}</div>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--t-0)' }}>{ind.name}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                      {ind.collectionFrequency} | {ind.domainName || ind.domain} · {trend}
                    </div>
                  </div>
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

/* ──────────────────────────────────────────────────────────
   Tiêu chuẩn — JCI / ISO 9001:2015 / 83 Tiêu chí BYT
   (port verbatim nội dung từ v1 tab "standards")
   ────────────────────────────────────────────────────────── */

const STANDARDS: { title: string; items: string[] }[] = [
  {
    title: 'JCI (Joint Commission International)',
    items: [
      'IPSG - Mục tiêu an toàn quốc tế',
      'ACC - Tiếp nhận và liên tục',
      'PFR - Quyền bệnh nhân',
      'AOP - Đánh giá bệnh nhân',
      'COP - Chăm sóc bệnh nhân',
    ],
  },
  {
    title: 'ISO 9001:2015',
    items: [
      'Bối cảnh tổ chức',
      'Lãnh đạo',
      'Hoạch định',
      'Hỗ trợ',
      'Vận hành',
      'Đánh giá kết quả',
      'Cải tiến',
    ],
  },
  {
    title: '83 Tiêu chí Bộ Y tế',
    items: [
      'Nhóm A: An toàn người bệnh',
      'Nhóm B: Tổ chức quản lý',
      'Nhóm C: Năng lực NVYT',
      'Nhóm D: Cơ sở hạ tầng',
      'Nhóm E: Chăm sóc người bệnh',
    ],
  },
];

const StandardsTab: React.FC = () => (
  <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-14)' }}>
    {STANDARDS.map((s) => (
      <div key={s.title} style={{ border: '1px solid var(--line)', background: 'var(--d-2)', borderRadius: 'var(--r-3)', overflow: 'hidden' }}>
        <div style={{
          padding: '10px 14px', background: 'var(--d-1)', fontWeight: 600,
          fontSize: 'var(--fs-md)', borderBottom: '1px solid var(--line)',
        }}>{s.title}</div>
        <div style={{ padding: '4px 14px 10px' }}>
          {s.items.map((item) => (
            <div key={item} style={{ padding: '6px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>
              {item}
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

/* ──────────────────────────────────────────────────────────
   Hài lòng BN — điểm trung bình + NPS + tỷ lệ phản hồi + theo khoa
   (logic/công thức port verbatim từ v1 tab "satisfaction")
   ────────────────────────────────────────────────────────── */

const DEPT_SAT_COLUMNS: ColumnDef<DepartmentSatisfactionDto>[] = [
  { key: 'dept', label: 'Khoa/Phòng', render: (r) => r.departmentName },
  { key: 'count', label: 'Số phiếu', mono: true, width: 90, render: (r) => r.surveyCount },
  {
    key: 'score', label: 'Điểm hài lòng', width: 130,
    render: (r) => (
      <span className={`chip ${r.satisfactionScore >= 80 ? 'ok' : r.satisfactionScore >= 60 ? 'warn' : 'crit'}`}>
        {r.satisfactionScore}%
      </span>
    ),
  },
  { key: 'nps', label: 'NPS', mono: true, width: 80, render: (r) => r.npsScore },
];

const SatisfactionTab: React.FC<{
  stats: SatisfactionStatisticsDto | null;
  dashboard: QualityDashboardDto | null;
}> = ({ stats, dashboard }) => {
  const rateValue = stats
    ? Math.round(stats.averageSatisfaction / 20)
    : (dashboard ? Math.round(dashboard.overallSatisfaction / 20) : 4);
  const avg = stats?.averageSatisfaction ?? dashboard?.overallSatisfaction ?? 0;

  return (
    <div style={{ padding: '14px 18px', overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-14)' }}>
        <div style={CARD_STYLE}>
          <div style={CARD_TITLE_STYLE}>Điểm hài lòng trung bình</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-14)' }}>
            <Rate disabled value={rateValue} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600, color: 'var(--a-cy)' }}>{avg}%</span>
          </div>
          {stats && (
            <div style={{ marginTop: 'var(--space-10)' }}>
              <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>NPS Score: </span>
              <span className={`chip ${stats.npsScore >= 50 ? 'ok' : stats.npsScore >= 0 ? 'warn' : 'crit'}`}>
                {stats.npsScore}
              </span>
            </div>
          )}
        </div>
        <div style={CARD_STYLE}>
          <div style={CARD_TITLE_STYLE}>Tỷ lệ phản hồi</div>
          <Progress percent={stats?.responseRate ?? 0} />
          <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)', marginTop: 'var(--space-8)' }}>
            {stats
              ? `${stats.completedSurveys}/${stats.totalSurveys} phiếu thu thập`
              : dashboard
              ? `${dashboard.surveysCompleted} phiếu hoàn thành`
              : 'Chưa có dữ liệu'}
          </div>
        </div>
      </div>
      {stats?.byDepartment && stats.byDepartment.length > 0 && (
        <div style={{ marginTop: 'var(--space-14)' }}>
          <div style={CARD_TITLE_STYLE}>Theo khoa/phòng</div>
          <DataTable<DepartmentSatisfactionDto>
            columns={DEPT_SAT_COLUMNS}
            data={stats.byDepartment}
            rowKey={(r) => r.departmentId}
          />
        </div>
      )}
    </div>
  );
};

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

/* ──────────────────────────────────────────────────────────
   Drawer chi tiết sự cố + form cập nhật điều tra RCA
   (form + payload investigateIncident port verbatim từ v1 handleInvestigation;
   v1 prefill 4 field: investigationFindings/rootCauseAnalysis/preventiveMeasures/lessonLearned)
   ────────────────────────────────────────────────────────── */

const RCA_METHOD_OPTS = [
  { value: '5Whys', label: '5 Whys' },
  { value: 'Fishbone', label: 'Fishbone' },
  { value: 'FMEA', label: 'FMEA' },
];

const IncidentDrawerBody: React.FC<{ r: IncidentReportDto; onDone: () => void }> = ({ r, onDone }) => {
  const [findings, setFindings] = useState(r.investigationFindings || '');
  const [rca, setRca] = useState(r.rootCauseAnalysis || '');
  const [rcaMethod, setRcaMethod] = useState<string | undefined>(undefined);
  const [preventive, setPreventive] = useState(r.preventiveMeasures || '');
  const [lesson, setLesson] = useState(r.lessonLearned || '');
  const [busy, setBusy] = useState(false);

  const submitInvestigation = async () => {
    setBusy(true);
    try {
      await investigateIncident({
        incidentId: r.id,
        investigationFindings: findings.trim(),
        rootCauseAnalysis: rca.trim() || undefined,
        rcaMethod,
        correctiveActions: [],
        preventiveMeasures: preventive.trim() || undefined,
        lessonLearned: lesson.trim() || undefined,
      });
      tk('Đã cập nhật kết quả điều tra');
      onDone();
    } catch {
      tw('Không thể cập nhật điều tra');
    } finally {
      setBusy(false);
    }
  };

  const incStatus = INC_STATUS_TEXT[r.status];

  return (
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
          <span>Xảy ra</span><span>{fmtDMYHM(r.incidentDate)}</span>
          <span>Báo cáo</span><span>{r.reportedByName} · {fmtDMY(r.reportedDate)}</span>
          {r.patientName && (<><span>Bệnh nhân</span><span>{r.patientCode} - {r.patientName}</span></>)}
          <span>Trạng thái</span>
          <span>
            <StatusBadge tone={incStatus?.tone || 'info'} dot>
              {r.statusName || incStatus?.text || `Trạng thái ${r.status}`}
            </StatusBadge>
          </span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="info" size={11} /> MÔ TẢ</h5>
        <div style={PRE_STYLE}>
          {r.description || '—'}
        </div>
      </div>

      {r.immediateActions && (
        <div className="rec-section">
          <h5><TermIcon name="check" size={11} /> XỬ LÝ NGAY</h5>
          <div style={PRE_STYLE}>{r.immediateActions}</div>
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
            <div style={{ ...PRE_STYLE, marginTop: 'var(--space-8)' }}>
              {r.rootCauseAnalysis}
            </div>
          )}
        </div>
      )}

      {r.preventiveMeasures && (
        <div className="rec-section">
          <h5><TermIcon name="check" size={11} /> PHÒNG NGỪA</h5>
          <div style={PRE_STYLE}>{r.preventiveMeasures}</div>
        </div>
      )}

      {r.lessonLearned && (
        <div className="rec-section">
          <h5><TermIcon name="info" size={11} /> BÀI HỌC RÚT RA</h5>
          <div style={PRE_STYLE}>{r.lessonLearned}</div>
        </div>
      )}

      {/* Form cập nhật điều tra RCA — port từ v1 investigation modal */}
      <div className="rec-section">
        <h5><TermIcon name="edit" size={11} /> CẬP NHẬT ĐIỀU TRA (RCA)</h5>
        <div style={{ display: 'grid', gap: 'var(--space-8)' }}>
          <Fld label="Kết quả điều tra">
            <Input.TextArea rows={3} value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="Kết quả điều tra chi tiết…" />
          </Fld>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-8)' }}>
            <Fld label="Nguyên nhân gốc">
              <Input.TextArea rows={3} value={rca} onChange={(e) => setRca(e.target.value)} placeholder="Sử dụng phương pháp 5 Whys, Fishbone…" />
            </Fld>
            <Fld label="Phương pháp RCA">
              <Select
                value={rcaMethod} onChange={setRcaMethod} placeholder="Chọn" allowClear
                style={{ width: '100%' }} options={RCA_METHOD_OPTS}
              />
            </Fld>
          </div>
          <Fld label="Biện pháp phòng ngừa">
            <Input.TextArea rows={2} value={preventive} onChange={(e) => setPreventive(e.target.value)} />
          </Fld>
          <Fld label="Bài học kinh nghiệm">
            <Input.TextArea rows={2} value={lesson} onChange={(e) => setLesson(e.target.value)} />
          </Fld>
          <div>
            <Btn variant="primary" disabled={busy} onClick={submitInvestigation}>
              <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Lưu kết quả điều tra'}
            </Btn>
          </div>
        </div>
      </div>

      {/* Hành động khắc phục hiện có (v1: bảng trong investigation modal) */}
      {r.correctiveActions && r.correctiveActions.length > 0 && (
        <div className="rec-section">
          <h5><TermIcon name="check" size={11} /> HÀNH ĐỘNG KHẮC PHỤC</h5>
          <DataTable<CorrectiveActionDto>
            columns={CA_COLUMNS}
            data={r.correctiveActions}
            rowKey={(a) => a.id}
          />
        </div>
      )}

      <div style={{ marginTop: 'var(--space-12)', borderTop: '1px solid var(--line-soft)', paddingTop: 'var(--space-10)' }}>
        <Btn variant="ghost" onClick={() => openPrintWindow(buildIncidentReportHtml(r), { focus: true, print: { delayMs: 500 } })}>
          <TermIcon name="printer" size={12} /> In phiếu báo cáo sự cố
        </Btn>
      </div>
    </>
  );
};

/* ──────────────────────────────────────────────────────────
   Drawer chi tiết audit (field-set port từ v1 Modal.info Descriptions)
   ────────────────────────────────────────────────────────── */

const AuditDrawerBody: React.FC<{ a: InternalAuditDto }> = ({ a }) => {
  const st = AUDIT_STATUS[a.status];
  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="file-text" size={11} /> THÔNG TIN AUDIT</h5>
        <div className="rec-kv">
          <span>Mã</span><span className="mono">{a.auditCode}</span>
          <span>Tiêu đề</span><b>{a.title}</b>
          <span>Loại</span><span>{a.auditTypeName || AUDIT_TYPE_LABELS[a.auditType] || a.auditType}</span>
          <span>Khoa/Phòng</span><span>{a.departmentName || '—'}</span>
          <span>Ngày dự kiến</span><span>{fmtDMY(a.scheduledDate)}</span>
          <span>Ngày thực tế</span><span>{fmtDMY(a.actualDate)}</span>
          <span>Trưởng đoàn</span><span>{a.leadAuditorName || '—'}</span>
          <span>Trạng thái</span>
          <span>
            <StatusBadge tone={st?.tone || 'info'} dot>
              {a.statusName || st?.text || `Trạng thái ${a.status}`}
            </StatusBadge>
          </span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="search" size={11} /> PHẠM VI & MỤC TIÊU</h5>
        <div className="rec-kv">
          <span>Phạm vi</span><span>{a.scope || '—'}</span>
          <span>Mục tiêu</span><span>{a.objective || '—'}</span>
          <span>Tiêu chí</span><span>{a.criteria || '—'}</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="alert" size={11} /> PHÁT HIỆN</h5>
        <div className="rec-kv">
          <span>Tổng phát hiện</span><span className="mono">{a.totalFindings ?? '—'}</span>
          <span>Nghiêm trọng</span><span className="mono">{a.criticalFindings ?? '—'}</span>
        </div>
      </div>

      {a.overallConclusion && (
        <div className="rec-section">
          <h5><TermIcon name="info" size={11} /> KẾT LUẬN</h5>
          <div style={PRE_STYLE}>{a.overallConclusion}</div>
        </div>
      )}

      {a.notes && (
        <div className="rec-section">
          <h5><TermIcon name="info" size={11} /> GHI CHÚ</h5>
          <div style={PRE_STYLE}>{a.notes}</div>
        </div>
      )}
    </>
  );
};

/* ──────────────────────────────────────────────────────────
   Drawer chi tiết CAPA (field-set port từ v1 Modal.info Descriptions)
   ────────────────────────────────────────────────────────── */

const CapaDrawerBody: React.FC<{ c: CAPADto }> = ({ c }) => (
  <>
    <div className="rec-section">
      <h5><TermIcon name="check" size={11} /> THÔNG TIN CAPA</h5>
      <div className="rec-kv">
        <span>Mã</span><span className="mono">{c.capaCode}</span>
        <span>Tiêu đề</span><b>{c.title}</b>
        <span>Nguồn</span><span>{c.sourceTypeName || c.sourceType}</span>
        <span>Khoa</span><span>{c.departmentName || '—'}</span>
        <span>Ưu tiên</span>
        <span><span className={`chip ${CAPA_PRIORITY_TONE[c.priority] || 'info'}`}>{c.priorityName || `P${c.priority}`}</span></span>
        <span>Người chịu TN</span><span>{c.responsiblePersonName || '—'}</span>
        <span>Hạn</span><span>{fmtDMY(c.dueDate)}</span>
        <span>Trạng thái</span>
        <span>
          <StatusBadge tone={CAPA_STATUS_TONE[c.status] || 'info'} dot>
            {c.statusName || `Trạng thái ${c.status}`}
          </StatusBadge>
        </span>
      </div>
    </div>

    <div className="rec-section">
      <h5><TermIcon name="info" size={11} /> MÔ TẢ</h5>
      <div style={PRE_STYLE}>{c.description || '—'}</div>
    </div>

    <div className="rec-section">
      <h5><TermIcon name="alert" size={11} /> VẤN ĐỀ</h5>
      <div style={PRE_STYLE}>{c.problemStatement || '—'}</div>
    </div>

    {c.rootCauseAnalysis && (
      <div className="rec-section">
        <h5><TermIcon name="search" size={11} /> NGUYÊN NHÂN GỐC</h5>
        <div style={PRE_STYLE}>{c.rootCauseAnalysis}</div>
      </div>
    )}

    <div className="rec-section">
      <h5><TermIcon name="check" size={11} /> HÀNH ĐỘNG KHẮC PHỤC</h5>
      <div style={PRE_STYLE}>
        {c.correctiveActions?.length > 0
          ? c.correctiveActions.map((a) => a.actionDescription).join('; ')
          : '—'}
      </div>
    </div>

    <div className="rec-section">
      <h5><TermIcon name="shield" size={11} /> HÀNH ĐỘNG PHÒNG NGỪA</h5>
      <div style={PRE_STYLE}>
        {c.preventiveActions?.length > 0
          ? c.preventiveActions.map((a) => a.actionDescription).join('; ')
          : '—'}
      </div>
    </div>

    {c.notes && (
      <div className="rec-section">
        <h5><TermIcon name="info" size={11} /> GHI CHÚ</h5>
        <div style={PRE_STYLE}>{c.notes}</div>
      </div>
    )}
  </>
);

export default QualityV2;
