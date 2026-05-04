import React, { useCallback } from 'react';
import dayjs from 'dayjs';
import { getSmsLogs } from '../api/sms';
import type { SmsLogDto } from '../api/sms';
import {
  SimpleV2Page, StatusBadge, DrSec, DrField,
  type ColumnDef, type StatusTab, type KpiItem,
} from './_v2kit';

type SKey = 'sent' | 'failed' | 'dev';
const STATUS_TABS: StatusTab<SKey>[] = [
  { v: 'sent',   l: 'Đã gửi',  tone: 'ok' },
  { v: 'failed', l: 'Lỗi',     tone: 'crit' },
  { v: 'dev',    l: 'Dev',     tone: 'info' },
];
const STATUS_LABEL: Record<number, { label: string; tone: 'ok' | 'crit' | 'info' }> = {
  0: { label: 'Đã gửi',   tone: 'ok' },
  1: { label: 'Lỗi',      tone: 'crit' },
  2: { label: 'Dev mode', tone: 'info' },
};
const statusKey = (l: SmsLogDto): SKey =>
  l.status === 0 ? 'sent' : l.status === 1 ? 'failed' : 'dev';

const SmsManagementV2: React.FC = () => {
  const load = useCallback(async () => {
    const r = await getSmsLogs({
      fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
      toDate: dayjs().format('YYYY-MM-DD'),
      pageIndex: 1, pageSize: 100,
    });
    return ((r.data?.items as SmsLogDto[]) || (Array.isArray(r.data) ? (r.data as SmsLogDto[]) : []));
  }, []);

  const columns: ColumnDef<SmsLogDto>[] = [
    { key: 'createdAt',   label: 'Thời gian', mono: true,
      render: (l) => dayjs(l.createdAt).format('DD/MM HH:mm') },
    { key: 'phoneNumber', label: 'SĐT',       mono: true, code: true,
      render: (l) => l.phoneNumber },
    { key: 'messageType', label: 'Loại',
      render: (l) => l.messageType },
    { key: 'message',     label: 'Nội dung',
      render: (l) => (
        <span style={{ display: 'inline-block', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {l.message}
        </span>
      ) },
    { key: 'provider',    label: 'NCC',
      render: (l) => l.provider },
    { key: 'status',      label: 'Trạng thái',
      render: (l) => {
        const m = STATUS_LABEL[l.status] || { label: '—', tone: 'info' as const };
        return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
      } },
  ];

  const kpis = (rows: SmsLogDto[]): KpiItem[] => [
    { lbl: 'SMS 7d',  val: rows.length },
    { lbl: 'Đã gửi',  val: rows.filter((l) => l.status === 0).length, tone: 'ok' },
    { lbl: 'Lỗi',     val: rows.filter((l) => l.status === 1).length, tone: 'crit' },
    { lbl: 'Dev mode', val: rows.filter((l) => l.status === 2).length, tone: 'info' },
  ];

  return (
    <SimpleV2Page<SmsLogDto>
      title="SMS"
      load={load}
      rowKey={(l) => l.id}
      columns={columns}
      searchPlaceholder="Tìm SĐT / nội dung…"
      searchOf={(l) => `${l.phoneNumber} ${l.message} ${l.messageType}`}
      statusTabs={STATUS_TABS}
      statusOf={statusKey}
      kpis={kpis}
      pageSize={20}
      emptyMessage="Chưa có SMS"
      drawerTitle={(l) => l.phoneNumber}
      drawerSub={(l) => `${l.messageType} · ${dayjs(l.createdAt).format('DD/MM/YYYY HH:mm:ss')}`}
      drawer={(l) => (
        <>
          <DrSec title="Tin nhắn">
            <DrField lbl="SĐT">{l.phoneNumber}</DrField>
            <DrField lbl="Loại">{l.messageType}</DrField>
            <DrField lbl="Nội dung">
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{l.message}</div>
            </DrField>
          </DrSec>
          <DrSec title="Gửi">
            <DrField lbl="NCC">{l.provider}</DrField>
            <DrField lbl="Thời gian">{dayjs(l.createdAt).format('DD/MM/YYYY HH:mm:ss')}</DrField>
            <DrField lbl="Trạng thái">{STATUS_LABEL[l.status]?.label || '—'}</DrField>
            {l.errorMessage && (
              <DrField lbl="Lỗi"><span style={{ color: 'var(--s-crit)' }}>{l.errorMessage}</span></DrField>
            )}
          </DrSec>
          {l.patientName && (
            <DrSec title="Bệnh nhân">
              <DrField lbl="Tên BN">{l.patientName}</DrField>
            </DrSec>
          )}
        </>
      )}
    />
  );
};

export default SmsManagementV2;
