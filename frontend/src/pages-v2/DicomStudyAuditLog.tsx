/**
 * NangCap24 — DICOM Study Audit Log v2 (port từ mod-dicom-study-audit.jsx)
 *
 * Log audit per-study DICOM với Timeline drawer.
 * 16 loại action với màu sắc + filter + date range.
 */
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Button } from 'antd';
import {
  KpiStrip, DataTable, SearchBox, DrawerShell, Filter, Pager, StatusBadge,
  te, fmtDTg,
} from './_v2kit';
import type { ColumnDef } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import { dicomStudyLogApi } from '../api/nangcap24';
import type { DicomStudyActivityLogDto } from '../api/nangcap24';

type Tone = 'ok' | 'info' | 'warn' | 'crit';

const DSL_ACTIONS: Record<string, { label: string; color: Tone }> = {
  created_from_his:        { label: 'Tạo từ HIS',          color: 'info' },
  received_from_modality:  { label: 'Nhận từ máy chụp',    color: 'info' },
  matched_to_request:      { label: 'Match y/c HIS',       color: 'ok' },
  unmatched:               { label: 'Bỏ match',            color: 'warn' },
  viewed:                  { label: 'Xem ảnh',             color: 'info' },
  downloaded:              { label: 'Tải về',              color: 'info' },
  result_drafted:          { label: 'Soạn kết quả',        color: 'warn' },
  result_modified:         { label: 'Sửa kết quả',         color: 'warn' },
  result_approved:         { label: 'Duyệt kết quả',       color: 'ok' },
  result_rejected:         { label: 'Từ chối duyệt',       color: 'crit' },
  result_printed:          { label: 'In kết quả',          color: 'info' },
  sent_to_remote:          { label: 'Gửi server khác',     color: 'info' },
  received_from_remote:    { label: 'Nhận từ server khác', color: 'info' },
  copied_to_external:      { label: 'Copy ra USB/CD',      color: 'warn' },
  deleted:                 { label: 'Xoá',                 color: 'crit' },
  archived:                { label: 'Lưu trữ',             color: 'ok' },
};

const PER = 18;

const DicomStudyAuditLog: React.FC = () => {
  const [rows, setRows] = useState<DicomStudyActivityLogDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fAct, setFAct] = useState('');
  const [fromDate, setFromDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [page, setPage] = useState(0);
  const [studyDetail, setStudyDetail] = useState<{ uid: string; timeline: DicomStudyActivityLogDto[] } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await dicomStudyLogApi.search({
        studyInstanceUid: search || undefined,
        action: fAct || undefined,
        fromDate: dayjs(fromDate).toISOString(),
        toDate: dayjs(toDate).toISOString(),
        pageIndex: 1, pageSize: 300,
      });
      setRows(r.items); setTotal(r.totalCount);
    } catch { te('Không tải được log'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openTimeline = async (uid: string) => {
    try {
      const tl = await dicomStudyLogApi.getStudyTimeline(uid);
      setStudyDetail({ uid, timeline: tl.sort((a, b) => dayjs(a.performedAt).diff(dayjs(b.performedAt))) });
    } catch { te('Không lấy được timeline'); }
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / PER));
  const paged = rows.slice(page * PER, (page + 1) * PER);

  const uniqueStudies = new Set(rows.map(r => r.studyInstanceUid)).size;
  const uniqueUsers = new Set(rows.filter(r => r.performedByName && !r.performedByName.includes('auto') && !r.performedByName.includes('System')).map(r => r.performedByName)).size;
  const approved = rows.filter(r => r.action === 'result_approved').length;
  const risky = rows.filter(r => r.action === 'result_modified' || r.action === 'result_rejected').length;
  const danger = rows.filter(r => r.action === 'deleted' || r.action === 'copied_to_external').length;

  const kpis = [
    { lbl: 'Tổng log', val: total, sub: 'tất cả hành động' },
    { lbl: 'Số ca chụp', val: uniqueStudies, sub: 'study unique' },
    { lbl: 'Người tác động', val: uniqueUsers, sub: 'BS/KTV' },
    { lbl: 'Đã duyệt KQ', val: approved, tone: 'ok' as const },
    { lbl: 'Sửa/Từ chối', val: risky, tone: 'warn' as const },
    { lbl: 'Sự kiện nguy hiểm', val: danger, tone: 'crit' as const, sub: 'xoá · copy ra ngoài' },
  ];

  const cols: ColumnDef<DicomStudyActivityLogDto>[] = [
    {
      key: 'study', label: 'Study UID', mono: true, code: true,
      render: r => (
        <a
          onClick={(e) => { e.stopPropagation(); openTimeline(r.studyInstanceUid); }}
          style={{ color: 'var(--c-pri, #2563eb)', cursor: 'pointer', fontSize: 11 }}
        >…{r.studyInstanceUid.slice(-30)}</a>
      )
    },
    {
      key: 'action', label: 'Hành động', width: 180, render: r => {
        const a = DSL_ACTIONS[r.action];
        return <StatusBadge tone={a?.color ?? 'info'} dot>{a?.label ?? r.actionLabel ?? r.action}</StatusBadge>;
      }
    },
    {
      key: 'user', label: 'Người thực hiện', render: r => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.performedByName ?? '(System)'}</div>
          <div style={{ fontSize: 10.5, color: 'var(--t-2)' }}>{r.machineName ?? '—'}</div>
        </div>
      )
    },
    { key: 'ip', label: 'IP', mono: true, width: 110, render: r => r.ipAddress ?? '—' },
    {
      key: 'details', label: 'Chi tiết',
      render: r => <span style={{ fontSize: 11.5, color: 'var(--t-1)' }}>{r.actionDetails || <span style={{ color: 'var(--t-3)' }}>—</span>}</span>
    },
    { key: 'time', label: 'Thời gian', mono: true, width: 150, render: r => fmtDTg(r.performedAt) },
  ];

  return (
    <div className="ab" data-testid="dicom-study-log-page">
      <KpiStrip items={kpis} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Lọc theo Study UID…" minWidth={320} />
        <Filter
          value={fAct}
          onChange={(v) => { setFAct(v); setPage(0); }}
          options={Object.entries(DSL_ACTIONS).map(([v, a]) => ({ v, l: a.label }))}
          placeholder="▾ Hành động"
        />
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          style={{ height: 30, padding: '0 8px', border: '1px solid var(--line)', borderRadius: 4, fontSize: 12 }} />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          style={{ height: 30, padding: '0 8px', border: '1px solid var(--line)', borderRadius: 4, fontSize: 12 }} />
        <Button type="primary" size="small" onClick={load} loading={loading} data-testid="dsl-filter-btn">
          <TermIcon name="search" size={12} /> Lọc
        </Button>
        <span className="spacer" style={{ flex: 1 }} />
        <Button size="small"><TermIcon name="download" size={12} /> Xuất CSV</Button>
      </div>

      <DataTable
        columns={cols}
        data={paged}
        rowKey={r => r.id}
        onRowClick={(r) => openTimeline(r.studyInstanceUid)}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={rows.length} perPage={PER} />

      {/* Timeline drawer */}
      <DrawerShell
        open={!!studyDetail}
        onClose={() => setStudyDetail(null)}
        title={studyDetail ? `Timeline ca chụp · …${studyDetail.uid.slice(-20)}` : ''}
        sub={studyDetail ? `${studyDetail.timeline.length} hoạt động` : undefined}
        size="xl"
      >
        {studyDetail && (
          <div style={{ padding: 20 }}>
            <div style={{
              padding: 12, background: 'var(--d-1, #f8fafc)', borderRadius: 6,
              marginBottom: 16, fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-all',
            }}>
              <span style={{ color: 'var(--t-2)' }}>Study UID:</span> {studyDetail.uid}
            </div>

            {/* Custom timeline (mirror mock) */}
            <div style={{ position: 'relative', paddingLeft: 30 }}>
              <div style={{
                position: 'absolute', left: 9, top: 6, bottom: 6, width: 2,
                background: 'var(--line, #e5e7eb)',
              }} />
              {studyDetail.timeline.map((t, i) => {
                const a = DSL_ACTIONS[t.action];
                const tone: Tone = a?.color ?? 'info';
                const dotColor = tone === 'ok' ? '#16a34a' : tone === 'warn' ? '#d97706' : tone === 'crit' ? '#dc2626' : '#0284c7';
                return (
                  <div key={t.id} style={{ position: 'relative', paddingBottom: i === studyDetail.timeline.length - 1 ? 0 : 18 }}>
                    <div style={{
                      position: 'absolute', left: -25, top: 4, width: 12, height: 12, borderRadius: 6,
                      background: dotColor, border: '2px solid var(--d-0, #fff)',
                      boxShadow: `0 0 0 3px ${dotColor}33`,
                    }} />
                    <div style={{
                      background: 'var(--d-0, #fff)', border: '1px solid var(--line, #e5e7eb)',
                      borderRadius: 6, padding: '10px 14px', borderLeft: `3px solid ${dotColor}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <StatusBadge tone={tone} dot>{a?.label ?? t.actionLabel ?? t.action}</StatusBadge>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-2)' }}>{fmtDTg(t.performedAt)}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--t-1)' }}>
                        <b>{t.performedByName ?? '(System)'}</b>
                        {t.machineName && <> · {t.machineName}</>}
                        {t.ipAddress && <> · <span className="mono">{t.ipAddress}</span></>}
                      </div>
                      {t.actionDetails && (
                        <div style={{
                          fontSize: 11, color: 'var(--t-2)', marginTop: 4, padding: 6,
                          background: 'var(--d-1, #f8fafc)', borderRadius: 4, fontFamily: 'var(--font-mono)',
                        }}>
                          {t.actionDetails}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {studyDetail.timeline.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-2)' }}>Chưa có log nào</div>
              )}
            </div>
          </div>
        )}
      </DrawerShell>
    </div>
  );
};

export default DicomStudyAuditLog;
