import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTabState } from '../../../hooks/useTabState';
import * as file from '../../../services/file.service';
import dayjs from 'dayjs';
import { App as AntdApp, Input } from 'antd';
import risApi from '../../radiology/api/ris';
import type { ConsultationSessionDto, ConsultationDiscussionDto, ConsultationMinutesDto } from '../../radiology/api/ris';
import {
  KpiStrip, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, Btn, DrawerShell, DrSec, ModalShell, CrudModal,
  type CrudFieldCfg, useListData, useTabCounts,
  type ColumnDef, type StatusTab,
  tk, tw, te,
} from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { RowActions, RefreshButton } from '../../../components/actions';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { Field } from '../../../components/form/Field';

/** Tải CSV với BOM UTF-8 để Excel mở đúng tiếng Việt */
function downloadCsv(filename: string, lines: string[]): void {
  const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  file.downloadBlob(blob, filename);
}

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

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

const CRUD_FIELDS: CrudFieldCfg[] = [
  { key: 'title', label: 'Chủ đề hội chẩn', required: true },
  { key: 'description', label: 'Mô tả', type: 'textarea' },
  { key: 'scheduledTime', label: 'Thời gian lên lịch', type: 'date', required: true },
  { key: 'meetingUrl', label: 'Đường dẫn họp' },
];

const ConsultationV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const { rows, loading, error, reload } = useListData<ConsultationSessionDto>(
    useCallback(() => risApi.searchConsultations({
      fromDate: dayjs().subtract(60, 'day').format('YYYY-MM-DD'),
      toDate:   dayjs().add(30, 'day').format('YYYY-MM-DD'),
      page: 1, pageSize: 200,
    }).then((r) => r.data?.items || []), []),
    useCallback(() => te('Không tải được danh sách phiên hội chẩn. Vui lòng thử lại.'), []),
  );
  const [stab, setStab] = useTabState<StatusKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<ConsultationSessionDto | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null); // chống double-click "Bắt đầu"
  const PAGE_SIZE = 14;

  const counts = useTabCounts(rows, STATUS_TABS, (r) => statusKey(r.status));

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
        <Btn variant="ghost" onClick={() => { setSearch(''); setStab('all'); }}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <RefreshButton onRefresh={reload} />
        <Btn variant="ghost" onClick={() => {
          const header = ['Ma phien', 'Chu de', 'Lich hop', 'Nguoi tao', 'So ca', 'Trang thai'];
          const rows2 = filtered.map((r) => [
            r.sessionCode, r.title,
            r.scheduledTime ? dayjs(r.scheduledTime).format('DD/MM/YYYY HH:mm') : '',
            r.createdByUserName, r.caseCount, r.statusName,
          ]);
          downloadCsv(
            `hoi-chan-${dayjs().format('YYYYMMDD-HHmm')}.csv`,
            [header, ...rows2].map((row) => row.map(escapeCsvCell).join(',')),
          );
          message.success(`Đã xuất ${filtered.length} phiên hội chẩn`);
        }}>
          <TermIcon name="download" size={12} /> Xuất CSV
        </Btn>
        <Btn variant="primary" onClick={() => setCreateOpen(true)}>
          <TermIcon name="plus" size={12} /> Tạo hội chẩn
        </Btn>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<ConsultationSessionDto>
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetail(r)}
        actions={(r) => (
          <RowActions actions={[
            { key: 'view', icon: 'eye', label: 'Chi tiết', primary: true, onClick: () => setDetail(r) },
            {
              key: 'joinUrl', icon: 'external', label: 'Vào phòng họp', primary: true, hidden: !r.meetingUrl,
              onClick: () => window.open(r.meetingUrl!, '_blank'),
            },
            {
              key: 'print', icon: 'printer', label: 'In biên bản',
              onClick: () => { setDetail(r); setTimeout(() => window.print(), 300); },
            },
            {
              // guard bên dưới là TOÀN MÀN (`if (startingId) return`) nên `disabled` cũng phải
              // toàn màn — nếu chỉ disable đúng dòng đang chạy thì bấm dòng khác sẽ im lặng
              // không phản hồi (click chết, người dùng tưởng hệ thống treo).
              key: 'start', icon: 'play', label: 'Bắt đầu', primary: true, hidden: r.status !== 0,
              disabled: !!startingId,
              onClick: () => {
                if (startingId) return;
                setStartingId(r.id);
                risApi.startConsultation(r.id).then(() => { tk('Đã bắt đầu phiên hội chẩn'); reload(); })
                  .catch((e) => te(friendlyErrorMessage(e, 'Không thể bắt đầu phiên hội chẩn.')))
                  .finally(() => setStartingId(null));
              },
            },
            {
              key: 'join', icon: 'phone', label: 'Vào phòng', primary: true, hidden: r.status !== 1,
              onClick: () => {
                risApi.joinConsultation(r.id)
                  .then(() => { if (r.meetingUrl) window.open(r.meetingUrl, '_blank'); })
                  .catch((e) => te(friendlyErrorMessage(e, 'Không thể vào phòng hội chẩn.')));
              },
            },
            {
              key: 'end', icon: 'x', label: 'Kết thúc', tone: 'danger', hidden: r.status !== 1,
              confirm: 'Xác nhận kết thúc phiên hội chẩn?',
              onClick: () => {
                risApi.endConsultation(r.id).then(() => { tk('Đã kết thúc'); reload(); })
                  .catch((e) => te(friendlyErrorMessage(e, 'Không thể kết thúc phiên hội chẩn.')));
              },
            },
          ]} />
        )}
        empty={loading ? 'Đang tải…' : (
          <div className="ab-empty">
            <TermIcon name={error ? 'alert' : 'search'} size={20} />
            <div>{error ? 'Không tải được danh sách hội chẩn. Vui lòng thử lại.' : 'Không có phiên hội chẩn nào'}</div>
          </div>
        )}
      />

      <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PAGE_SIZE} />

      <CrudModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo phiên hội chẩn"
        fields={CRUD_FIELDS}
        onSubmit={async (values) => {
          await risApi.saveConsultationSession({
            title: values.title as string,
            description: values.description as string | undefined,
            scheduledTime: values.scheduledTime as string,
            meetingUrl: values.meetingUrl as string | undefined,
          });
          tk('Tạo phiên hội chẩn thành công');
          reload();
        }}
      />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{detail.sessionCode}</span>
              <span style={{ fontSize: 14 }}>{detail.title}</span>
            </span>
          : ''}
        sub={detail ? `${fmtDT(detail.scheduledTime)} · ${detail.createdByUserName}` : ''}
        size="lg"
        footer={detail ? (
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <span style={{ flex: 1 }} />
            <Btn onClick={() => window.print()}>
              <TermIcon name="print" size={12} /> In biên bản
            </Btn>
            {detail.meetingUrl && (
              <Btn variant="primary" onClick={() => window.open(detail.meetingUrl!, '_blank')}>
                <TermIcon name="play" size={12} /> Vào phòng họp
              </Btn>
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
  const [disc, setDisc] = useState<ConsultationDiscussionDto[]>([]);
  const [mins, setMins] = useState<ConsultationMinutesDto | null>(null);
  const [dtext, setDtext] = useState('');
  const [minsOpen, setMinsOpen] = useState(false);
  const [mContent, setMContent] = useState('');
  const [mConclusion, setMConclusion] = useState('');
  const [mRec, setMRec] = useState('');
  const [sending, setSending] = useState(false);
  const [savingMins, setSavingMins] = useState(false);

  useEffect(() => {
    // Backend CHƯA expose route GET /RISComplete/consultations/cases/{id}/discussions
    // (RISCompleteController.Capture.cs chỉ có POST + DELETE discussions) → request này LUÔN 404.
    // 404 ở đây nghĩa là "chưa hỗ trợ", không phải sự cố của người dùng: nếu bắn toast thì mỗi
    // lần mở drawer hội chẩn đều hiện cảnh báo giả. Lỗi thật (5xx / mất mạng) vẫn báo bình thường.
    risApi.getConsultationDiscussions?.(r.id).then((res) => setDisc(res.data || []))
      .catch((e) => {
        if ((e as { response?: { status?: number } })?.response?.status === 404) return;
        tw(friendlyErrorMessage(e, 'Không tải được nội dung thảo luận của phiên hội chẩn.'));
      });
    risApi.getConsultationMinutes?.(r.id).then((res) => setMins(res.data || null))
      .catch((e) => tw(friendlyErrorMessage(e, 'Không tải được biên bản của phiên hội chẩn.')));
  }, [r.id]);

  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> TRẠNG THÁI</h5>
        <div className={`rec-status-banner ${tone}`}>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.caseCount || 0} ca · {r.participants?.length || 0} thành viên</span>
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

      <DrSec title="Thảo luận">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {disc.map((d) => (
            <div key={d.id} style={{ padding: '6px 8px', background: 'var(--bg-2)', borderRadius: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 2 }}>
                <b>{d.userName}</b> · {fmtDT(d.createdAt)}
              </div>
              <div style={{ fontSize: 12.5 }}>{d.content}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <Input.TextArea
              rows={2}
              value={dtext}
              onChange={(e) => setDtext(e.target.value)}
              placeholder="Nhập bình luận…"
              style={{ flex: 1 }}
            />
            <Btn disabled={sending} onClick={() => {
              if (!dtext.trim() || sending) return;
              setSending(true);
              risApi.addConsultationDiscussion({ consultationCaseId: r.id, content: dtext })
                .then(() => {
                  setDtext('');
                  risApi.getConsultationDiscussions?.(r.id).then((res) => setDisc(res.data || [])).catch(() => {});
                })
                .catch((e) => te(friendlyErrorMessage(e, 'Gửi bình luận thất bại. Vui lòng thử lại.')))
                .finally(() => setSending(false));
            }}>{sending ? 'Đang gửi…' : 'Gửi'}</Btn>
          </div>
        </div>
      </DrSec>

      <DrSec
        title="Biên bản"
        action={<Btn variant="ghost" onClick={() => {
          setMContent(mins?.content || '');
          setMConclusion(mins?.conclusion || '');
          setMRec(mins?.recommendations || '');
          setMinsOpen(true);
        }}>Sửa biên bản</Btn>}
      >
        {mins && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
            {mins.content && <div><b>Nội dung:</b> {mins.content}</div>}
            {mins.conclusion && <div><b>Kết luận:</b> {mins.conclusion}</div>}
            {mins.recommendations && <div><b>Khuyến nghị:</b> {mins.recommendations}</div>}
          </div>
        )}
      </DrSec>

      <ModalShell
        open={minsOpen}
        onClose={() => setMinsOpen(false)}
        title="Biên bản hội chẩn"
        size="md"
        footer={
          <>
            <button type="button" className="ab-btn" onClick={() => setMinsOpen(false)} disabled={savingMins}>Huỷ</button>
            <button type="button" className="ab-btn primary" disabled={savingMins} onClick={() => {
              if (savingMins) return;
              setSavingMins(true);
              risApi.saveConsultationMinutes({ consultationSessionId: r.id, content: mContent, conclusion: mConclusion, recommendations: mRec })
                .then((res) => { setMins(res.data || null); setMinsOpen(false); tk('Đã lưu biên bản'); })
                .catch((e) => te(friendlyErrorMessage(e, 'Lưu biên bản thất bại. Vui lòng thử lại.')))
                .finally(() => setSavingMins(false));
            }}>{savingMins ? 'Đang lưu…' : 'Lưu'}</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Nội dung">
            <Input.TextArea rows={3} value={mContent} onChange={(e) => setMContent(e.target.value)} placeholder="Nội dung biên bản…" />
          </Field>
          <Field label="Kết luận">
            <Input.TextArea rows={3} value={mConclusion} onChange={(e) => setMConclusion(e.target.value)} placeholder="Kết luận…" />
          </Field>
          <Field label="Khuyến nghị">
            <Input.TextArea rows={3} value={mRec} onChange={(e) => setMRec(e.target.value)} placeholder="Khuyến nghị…" />
          </Field>
        </div>
      </ModalShell>
    </>
  );
};

export default ConsultationV2;
