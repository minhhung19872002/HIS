import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { getIncidents, getQualityIndicators } from '../api/quality';
import type { IncidentReportDto, QualityIndicatorDto } from '../api/quality';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, ActBtn, DrawerShell,
  type ColumnDef, type StatusTab, type TopTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

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
  const { message } = AntdApp.useApp();
  const [tab, setTab] = useState<TopKey>('kpi');
  const [incidents, setIncidents] = useState<IncidentReportDto[]>([]);
  const [indicators, setIndicators] = useState<QualityIndicatorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [stab, setStab] = useState<IncStatusKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<IncidentReportDto | null>(null);
  const PAGE_SIZE = 16;

  const reload = () => {
    setLoading(true);
    Promise.allSettled([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getIncidents({ page: 1, pageSize: 200 } as any),
      getQualityIndicators(),
    ]).then(([i, q]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (i.status === 'fulfilled') setIncidents(((i.value as any).data?.items || []) as IncidentReportDto[]);
      if (q.status === 'fulfilled') setIndicators((q.value.data || []) as QualityIndicatorDto[]);
      setLoading(false);
    });
  };
  useEffect(reload, []);

  const incCounts = useMemo(() => {
    const c: Record<string, number> = { all: incidents.length };
    INC_TABS.forEach((s) => { c[s.v] = incidents.filter((x) => incStatusKey(x.status) === s.v).length; });
    return c;
  }, [incidents]);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cur = (i as any).currentValue || 0;
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
            <button type="button" className="ab-btn ghost" onClick={reload}>
              <TermIcon name="refresh" size={12} /> Làm mới
            </button>
            <button type="button" className="ab-btn primary" onClick={() => message.info('TODO: Báo cáo sự cố')}>
              <TermIcon name="plus" size={12} /> Báo cáo sự cố
            </button>
          </>
        }
      />

      {tab === 'kpi' && <KpiTab indicators={indicators} loading={loading} />}

      {tab === 'incidents' && (
        <>
          <div className="ab-tools">
            <SearchBox value={search} onChange={setSearch} placeholder="Tìm mã / khoa / loại / người báo cáo…" />
            <button type="button" className="ab-btn ghost" onClick={() => { setSearch(''); setStab('all'); }}>
              <TermIcon name="refresh" size={12} /> Bỏ lọc
            </button>
            <span className="spacer" />
            <span style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{incFiltered.length} sự cố</span>
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
                <ActBtn ic="edit" title="Cập nhật" onClick={() => message.info('TODO: Cập nhật điều tra')} />
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
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{detail.incidentCode}</span>
              <span style={{ fontSize: 14 }}>{detail.incidentTypeName || detail.incidentType}</span>
            </span>
          : ''}
        sub={detail ? `${detail.departmentName} · ${fmtDMY(detail.reportedDate)}` : ''}
        size="lg"
      >
        {detail && <IncidentDrawerBody r={detail} />}
      </DrawerShell>
    </div>
  );
};

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

  if (loading) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--t-2)' }}>Đang tải…</div>;
  if (indicators.length === 0) {
    return (
      <div className="ab-empty" style={{ padding: 40 }}>
        <TermIcon name="chart" size={20} />
        <div>Chưa có chỉ số chất lượng</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 18px 16px', overflow: 'auto' }}>
      {groups.map(([groupName, items]) => (
        <div key={groupName} style={{
          marginTop: 14, border: '1px solid var(--line)',
          background: '#fff', borderRadius: 8, overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px', background: 'var(--d-1)',
            fontSize: 11, fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', letterSpacing: '.06em',
            color: 'var(--t-1)', fontWeight: 600,
            borderBottom: '1px solid var(--line)',
          }}>{groupName}</div>
          <div>
            {items.map((ind) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const cur = (ind as any).currentValue || 0;
              const ok = ind.targetType === 'AtMost' ? cur <= ind.targetValue : cur >= ind.targetValue;
              const pct = Math.min(100, (cur / Math.max(ind.targetValue, cur, 1)) * 100);
              return (
                <div key={ind.id} style={{
                  display: 'grid', gridTemplateColumns: '110px 1fr 220px 140px 90px',
                  gap: 14, padding: '12px 14px', borderBottom: '1px solid var(--line-soft)',
                  alignItems: 'center', fontSize: 13,
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-2)' }}>{ind.indicatorCode}</div>
                  <div style={{ fontWeight: 500, color: 'var(--t-0)' }}>{ind.name}</div>
                  <div style={{
                    position: 'relative', height: 8, background: 'var(--d-2, #f1f5f9)',
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
  <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
    {[
      { title: 'Đánh giá CL BV theo BYT', date: 'Q4/2025', score: '4.2/5', status: 'Hoàn tất', tone: 'ok' as const },
      { title: 'Audit kiểm soát NK',       date: 'T11/2025', score: '92%',   status: 'Hoàn tất', tone: 'ok' as const },
      { title: 'Audit an toàn thuốc',      date: 'T11/2025', score: '88%',   status: 'Hoàn tất', tone: 'ok' as const },
      { title: 'Audit hồ sơ BA',           date: 'T12/2025', score: 'Đang thực hiện', status: 'Đang triển khai', tone: 'warn' as const },
    ].map((a, i) => (
      <div key={i} style={{
        border: '1px solid var(--line)', background: '#fff',
        borderRadius: 8, padding: 14,
      }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{a.title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--t-2)' }}>
          <span>Kỳ {a.date}</span>
          <StatusBadge tone={a.tone} dot>{a.status}</StatusBadge>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600,
          color: 'var(--a-cy)', marginTop: 10,
        }}>{a.score}</div>
      </div>
    ))}
  </div>
);

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
          <div style={{ fontSize: 12.5, color: 'var(--t-1)', marginTop: 8, whiteSpace: 'pre-wrap' }}>
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
  </>
);

export default QualityV2;
