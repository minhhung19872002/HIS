import React, { useEffect, useState } from 'react';
import { Button, DatePicker, Tag, Empty, Timeline } from 'antd';
import dayjs from 'dayjs';
import {
  KpiStrip, DataTable, SearchBox, DrawerShell, Filter, tk, te, fmtDTg
} from './_v2kit';
import type { ColumnDef } from './_v2kit';
import { dicomStudyLogApi } from '../api/nangcap24';
import type { DicomStudyActivityLogDto } from '../api/nangcap24';

const ACTION_FILTERS = [
  { v: '', l: 'Tất cả hành động' },
  { v: 'created_from_his', l: 'Tạo từ HIS' },
  { v: 'received_from_modality', l: 'Nhận từ máy chụp' },
  { v: 'viewed', l: 'Xem ảnh' },
  { v: 'result_drafted', l: 'Soạn KQ' },
  { v: 'result_modified', l: 'Sửa KQ' },
  { v: 'result_approved', l: 'Duyệt KQ' },
  { v: 'result_printed', l: 'In KQ' },
  { v: 'matched_to_request', l: 'Match' },
  { v: 'unmatched', l: 'Unmatch' },
  { v: 'sent_to_remote', l: 'Gửi server khác' },
];

const DicomStudyAuditLog: React.FC = () => {
  const [rows, setRows] = useState<DicomStudyActivityLogDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState(dayjs().subtract(7, 'day'));
  const [toDate, setToDate] = useState(dayjs());
  const [studyDetail, setStudyDetail] = useState<{ uid: string; timeline: DicomStudyActivityLogDto[] } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await dicomStudyLogApi.search({
        studyInstanceUid: search || undefined,
        action: action || undefined,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        pageIndex: 1,
        pageSize: 200,
      });
      setRows(r.items);
      setTotal(r.totalCount);
    } catch {
      te('Không tải được log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openStudyTimeline = async (uid: string) => {
    try {
      const tl = await dicomStudyLogApi.getStudyTimeline(uid);
      setStudyDetail({ uid, timeline: tl });
    } catch {
      te('Không tải được lịch sử ca chụp');
    }
  };

  const seedDemoData = async () => {
    try {
      const demoUid = `1.2.3.4.5.6.7.8.demo.${Date.now()}`;
      const actions = ['created_from_his', 'received_from_modality', 'viewed', 'result_drafted', 'result_approved', 'result_printed'];
      for (const a of actions) {
        await dicomStudyLogApi.logActivity({
          studyInstanceUid: demoUid,
          action: a,
          actionDetails: `Demo seed for ${a}`,
          machineName: 'TEST-PC',
        });
      }
      tk(`Đã seed 6 log cho study ${demoUid.slice(-15)}`);
      load();
    } catch {
      te('Seed thất bại');
    }
  };

  const uniqueStudies = new Set(rows.map(r => r.studyInstanceUid)).size;
  const uniqueUsers = new Set(rows.filter(r => r.performedByName).map(r => r.performedByName)).size;

  const kpis = [
    { lbl: 'Tổng log (filter)', val: total },
    { lbl: 'Số ca chụp khác nhau', val: uniqueStudies },
    { lbl: 'Số người tác động', val: uniqueUsers },
    { lbl: 'Khoảng', val: `${fromDate.format('DD/MM')} → ${toDate.format('DD/MM')}` },
  ];

  const actionColors: Record<string, string> = {
    created_from_his: 'blue',
    received_from_modality: 'cyan',
    viewed: 'default',
    result_drafted: 'gold',
    result_modified: 'orange',
    result_approved: 'green',
    result_rejected: 'red',
    result_printed: 'purple',
    sent_to_remote: 'magenta',
  };

  const columns: ColumnDef<DicomStudyActivityLogDto>[] = [
    {
      key: 'study', label: 'Study UID', code: true, render: r => (
        <a onClick={() => openStudyTimeline(r.studyInstanceUid)} style={{ color: '#2563eb', cursor: 'pointer' }}>
          ...{r.studyInstanceUid.slice(-25)}
        </a>
      )
    },
    {
      key: 'action', label: 'Hành động', render: r => (
        <Tag color={actionColors[r.action] ?? 'default'}>{r.actionLabel}</Tag>
      )
    },
    { key: 'user', label: 'Người thực hiện', render: r => r.performedByName ?? '(System)' },
    { key: 'machine', label: 'Máy', render: r => r.machineName ?? '-' },
    { key: 'ip', label: 'IP', mono: true, render: r => r.ipAddress ?? '-' },
    { key: 'details', label: 'Chi tiết', render: r => <span style={{ fontSize: 11, color: '#64748b' }}>{r.actionDetails ?? '-'}</span> },
    { key: 'time', label: 'Thời gian', render: r => fmtDTg(r.performedAt) },
  ];

  return (
    <div className="ab-stack">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <SearchBox value={search} onChange={setSearch} placeholder="Lọc theo Study UID..." minWidth={320} />
        <Filter value={action} onChange={setAction} options={ACTION_FILTERS} />
        <DatePicker value={fromDate} onChange={d => setFromDate(d!)} format="DD/MM/YYYY" />
        <DatePicker value={toDate} onChange={d => setToDate(d!)} format="DD/MM/YYYY" />
        <Button type="primary" onClick={load} loading={loading} data-testid="filter-btn">Lọc</Button>
        <Button onClick={seedDemoData} data-testid="seed-demo-btn">Seed demo</Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={r => r.id}
        onRowClick={r => openStudyTimeline(r.studyInstanceUid)}
      />

      <DrawerShell
        open={!!studyDetail}
        onClose={() => setStudyDetail(null)}
        title={studyDetail ? `Timeline ca chụp ...${studyDetail.uid.slice(-20)}` : ''}
        sub={`${studyDetail?.timeline.length ?? 0} log activities`}
      >
        {studyDetail && (
          <Timeline mode="left">
            {studyDetail.timeline.map(t => (
              <Timeline.Item key={t.id} color={
                t.action.includes('approved') ? 'green' :
                t.action.includes('rejected') ? 'red' :
                t.action.includes('modified') ? 'orange' : 'blue'
              }>
                <div style={{ fontWeight: 600 }}>{t.actionLabel}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {fmtDTg(t.performedAt)} • {t.performedByName ?? 'System'} • {t.machineName ?? '-'}
                </div>
                {t.actionDetails && (
                  <div style={{ fontSize: 11, marginTop: 4, fontFamily: 'var(--font-mono)' }}>{t.actionDetails}</div>
                )}
              </Timeline.Item>
            ))}
            {studyDetail.timeline.length === 0 && <Empty description="Chưa có log nào" />}
          </Timeline>
        )}
      </DrawerShell>
    </div>
  );
};

export default DicomStudyAuditLog;
