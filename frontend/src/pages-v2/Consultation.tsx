import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import risApi from '../api/ris';
import type { ConsultationSessionDto } from '../api/ris';
import {
  KpiStrip, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, ActBtn, DrawerShell,
  type ColumnDef, type StatusTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* ────────────────────────────────────────────────────────────
   Hội chẩn v2 — port of design-system-v2/his/project/Consultation v2.html
   ──────────────────────────────────────────────────────────── */

type StatusKey = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'scheduled', l: 'Đã lên lịch', tone: 'info' },
  { v: 'ongoing',   l: 'Đang diễn ra', tone: 'warn' },
  { v: 'completed', l: 'Hoàn tất',     tone: 'ok' },
  { v: 'cancelled', l: 'Đã huỷ',       tone: 'crit' },
];

const statusKey = (s: number): StatusKey => {
  if (s === 0) return 'scheduled';
  if (s === 1) return 'ongoing';
  if (s === 2) return 'completed';
  return 'cancelled';
};
const statusTone = (s: StatusKey) => STATUS_TABS.find((t) => t.v === s)?.tone || 'info';

const fmtHM = (iso?: string) => iso ? dayjs(iso).format('HH:mm') : '—';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY HH:mm') : '—';

const ConsultationV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [rows, setRows] = useState<ConsultationSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<ConsultationSessionDto | null>(null);
  const PAGE_SIZE = 14;

  const reload = () => {
    setLoading(true);
    risApi.searchConsultations({
      fromDate: dayjs().subtract(60, 'day').format('YYYY-MM-DD'),
      toDate:   dayjs().add(30, 'day').format('YYYY-MM-DD'),
      page: 1, pageSize: 200,
    }).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arr = (r as any)?.data?.items || (r as any)?.data || [];
      setRows(Array.isArray(arr) ? arr : []);
    }).catch(() => setRows([])).finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    STATUS_TABS.forEach((s) => {
      c[s.v] = rows.filter((r) => statusKey(r.status) === s.v).length;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.sessionCode, r.title, r.description, r.createdByUserName].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, stab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const today = dayjs().startOf('day');
  const kpis = useMemo(() => ({
    todayCount: rows.filter((r) => dayjs(r.scheduledTime).isSame(today, 'day')).length,
    ongoing:   counts.ongoing || 0,
    scheduled: counts.scheduled || 0,
    completed: counts.completed || 0,
    cases:     rows.reduce((s, r) => s + (r.caseCount || 0), 0),
    total:     rows.length,
  }), [rows, counts, today]);

  const columns: ColumnDef<ConsultationSessionDto>[] = [
    { key: 'code', label: 'Mã', width: 130, mono: true, render: (r) => r.sessionCode },
    {
      key: 'title', label: 'Chủ đề hội chẩn',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.title}</b>
          {r.description && <i>{r.description}</i>}
        </div>
      ),
    },
    { key: 'cases', label: 'Số ca', mono: true, width: 80, render: (r) => r.caseCount || 0 },
    {
      key: 'participants', label: 'Số TV', mono: true, width: 80,
      render: (r) => r.participants?.length || 0,
    },
    { key: 'creator', label: 'Người tạo', width: 180, render: (r) => r.createdByUserName || '—' },
    {
      key: 'when', label: 'Lịch', width: 150, mono: true,
      render: (r) => (
        <div className="cell-2l">
          <b>{fmtDMY(r.scheduledTime)}</b>
          <i>{fmtHM(r.scheduledTime)}{r.endTime ? ` → ${fmtHM(r.endTime)}` : ''}</i>
        </div>
      ),
    },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={statusTone(sk)} dot>{r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Hôm nay', val: kpis.todayCount, sub: 'phiên', tone: 'info' },
          { lbl: 'Đang diễn ra', val: kpis.ongoing, sub: 'live', tone: 'warn' },
          { lbl: 'Đã lên lịch', val: kpis.scheduled, sub: 'sắp diễn ra' },
          { lbl: 'Hoàn tất', val: kpis.completed, sub: '60 ngày', tone: 'ok' },
          { lbl: 'Tổng số ca', val: kpis.cases, sub: 'BN tham gia' },
          { lbl: 'Tổng phiên', val: kpis.total },
        ]}
      />

      <div className="ab-tools">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm mã / chủ đề / người tạo…" />
        <button type="button" className="ab-btn ghost" onClick={() => { setSearch(''); setStab('all'); }}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button type="button" className="ab-btn ghost" onClick={reload}>
          <TermIcon name="refresh" size={12} /> Làm mới
        </button>
        <button type="button" className="ab-btn ghost" onClick={() => message.success(`Đã xuất ${filtered.length} phiên`)}>
          <TermIcon name="download" size={12} /> Xuất Excel
        </button>
        <button type="button" className="ab-btn primary" onClick={() => message.info('TODO: Tạo hội chẩn')}>
          <TermIcon name="plus" size={12} /> Tạo hội chẩn
        </button>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<ConsultationSessionDto>
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetail(r)}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="eye" title="Chi tiết" onClick={() => setDetail(r)} />
            {r.meetingUrl && (
              <ActBtn ic="play" title="Vào phòng họp" onClick={() => window.open(r.meetingUrl!, '_blank')} />
            )}
            <ActBtn ic="print" title="In biên bản" onClick={() => message.success('Đã gửi máy in')} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : (
          <div className="ab-empty">
            <TermIcon name="search" size={20} />
            <div>Không có phiên hội chẩn nào</div>
          </div>
        )}
      />

      <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PAGE_SIZE} />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{detail.sessionCode}</span>
              <span style={{ fontSize: 14 }}>{detail.title}</span>
            </span>
          : ''}
        sub={detail ? `${fmtDT(detail.scheduledTime)} · ${detail.createdByUserName}` : ''}
        size="lg"
        footer={detail ? (
          <>
            <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
            <span style={{ flex: 1 }} />
            <button type="button" className="ab-btn" onClick={() => message.success('Đã in biên bản')}>
              <TermIcon name="print" size={12} /> In biên bản
            </button>
            {detail.meetingUrl && (
              <button type="button" className="ab-btn primary" onClick={() => window.open(detail.meetingUrl!, '_blank')}>
                <TermIcon name="play" size={12} /> Vào phòng họp
              </button>
            )}
          </>
        ) : null}
      >
        {detail && <ConsultationDrawerBody r={detail} />}
      </DrawerShell>
    </div>
  );
};

const ConsultationDrawerBody: React.FC<{ r: ConsultationSessionDto }> = ({ r }) => {
  const sk = statusKey(r.status);
  const tone = statusTone(sk);
  const lbl = r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l || '';

  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> TRẠNG THÁI</h5>
        <div className={`rec-status-banner ${tone}`}>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
          <span style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.caseCount || 0} ca · {r.participants?.length || 0} thành viên</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="info" size={11} /> THÔNG TIN PHIÊN</h5>
        <div className="rec-kv">
          <span>Mã phiên</span><span className="mono">{r.sessionCode}</span>
          <span>Chủ đề</span><b>{r.title}</b>
          {r.description && (<><span>Mô tả</span><span style={{ whiteSpace: 'pre-wrap' }}>{r.description}</span></>)}
          <span>Người tạo</span><span>{r.createdByUserName}</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="clock" size={11} /> THỜI GIAN</h5>
        <div className="rec-kv">
          <span>Lịch hẹn</span><span className="mono">{fmtDT(r.scheduledTime)}</span>
          {r.startTime && (<><span>Bắt đầu</span><span className="mono">{fmtDT(r.startTime)}</span></>)}
          {r.endTime && (<><span>Kết thúc</span><span className="mono">{fmtDT(r.endTime)}</span></>)}
          {r.startTime && r.endTime && (
            <>
              <span>Thời lượng</span>
              <span>{dayjs(r.endTime).diff(dayjs(r.startTime), 'minute')} phút</span>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ConsultationV2;
