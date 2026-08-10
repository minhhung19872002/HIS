// Panel yêu cầu CNTT — port v1 pages/system-admin/ItTicketsTab.tsx sang v2 (_v2kit).
// Behavior-preserve: fetch list+stats theo filter, tạo/ phản hồi/ đóng ticket; double-click detail → drawer.

import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { useDebounce } from '../../../hooks/useDebounce';
import * as itTicketApi from '../api/itTicket';
import {
  KpiStrip, SearchBox, DataTable, DrawerShell, DrSec, DrField, StatusBadge,
  ModalShell, ActBtn, Btn, tk, te, cf, type ColumnDef,
} from '@/_v2kit';
import { friendlyErrorMessage } from '@/utils/friendlyError';
import { toStringValue, toNumberValue, type RawApiItem } from './helpers';

type TicketRow = RawApiItem;

interface ItTicketStats {
  newCount: number; inProgressCount: number; resolvedCount: number;
  closedCount: number; totalCount: number;
}
const EMPTY_STATS: ItTicketStats = { newCount: 0, inProgressCount: 0, resolvedCount: 0, closedCount: 0, totalCount: 0 };

const PRIORITY_LABEL: Record<number, { tone: 'ok' | 'info' | 'warn' | 'crit'; text: string }> = {
  1: { tone: 'ok', text: 'Thấp' },
  2: { tone: 'info', text: 'Trung bình' },
  3: { tone: 'warn', text: 'Cao' },
  4: { tone: 'crit', text: 'Khẩn cấp' },
};
const STATUS_LABEL: Record<number, { tone: 'ok' | 'info' | 'warn' | 'crit'; text: string }> = {
  0: { tone: 'info', text: 'Mới' },
  1: { tone: 'warn', text: 'Đang xử lý' },
  2: { tone: 'ok', text: 'Đã giải quyết' },
  3: { tone: 'ok', text: 'Đã đóng' },
};

const ItTicketsPanel: React.FC = () => {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [stats, setStats] = useState<ItTicketStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<number | undefined>();
  const [filterPriority, setFilterPriority] = useState<number | undefined>();
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 400);
  const [selTicket, setSelTicket] = useState<TicketRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [respondId, setRespondId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createF] = Form.useForm();
  const [respondF] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: { status?: number; priority?: number; keyword?: string } = {};
      if (filterStatus !== undefined) params.status = filterStatus;
      if (filterPriority !== undefined) params.priority = filterPriority;
      if (debouncedKeyword) params.keyword = debouncedKeyword;
      const [ticketsRes, statsRes] = await Promise.allSettled([
        itTicketApi.getItTickets(params),
        itTicketApi.getItTicketStats(),
      ]);
      if (ticketsRes.status === 'fulfilled') {
        const d = ticketsRes.value.data as unknown as TicketRow[] | { data?: TicketRow[]; items?: TicketRow[] };
        setTickets(Array.isArray(d) ? d : d?.data || d?.items || []);
      }
      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data as unknown as ItTicketStats | { data?: ItTicketStats };
        setStats((d as { data?: ItTicketStats })?.data || (d as ItTicketStats) || EMPTY_STATS);
      }
    } catch (e) { te(friendlyErrorMessage(e)); }
    finally { setLoading(false); }
  }, [filterStatus, filterPriority, debouncedKeyword]);
  useEffect(() => { load(); }, [load]);

  const submitCreate = async () => {
    let v: Record<string, unknown>;
    try { v = await createF.validateFields(); } catch { return; }
    setSaving(true);
    try {
      await itTicketApi.createItTicket(v);
      tk('Đã tạo yêu cầu CNTT'); setCreateOpen(false); createF.resetFields(); load();
    } catch { te('Không thể tạo yêu cầu CNTT'); }
    finally { setSaving(false); }
  };

  const submitRespond = async () => {
    if (!respondId) return;
    let v: Record<string, unknown>;
    try { v = await respondF.validateFields(); } catch { return; }
    setSaving(true);
    try {
      await itTicketApi.respondToTicket(respondId, v);
      tk('Đã phản hồi yêu cầu'); setRespondId(null); respondF.resetFields(); load();
    } catch { te('Không thể phản hồi yêu cầu'); }
    finally { setSaving(false); }
  };

  const closeTicket = (t: TicketRow) => cf('Đóng yêu cầu này?', async () => {
    try { await itTicketApi.closeTicket(toStringValue(t.id)); tk('Đã đóng yêu cầu'); load(); }
    catch { te('Không thể đóng yêu cầu'); }
  }, { confirm: 'Đóng' });

  const columns: ColumnDef<TicketRow>[] = [
    { key: 'title', label: 'Tiêu đề', render: (t) => toStringValue(t.title) },
    { key: 'departmentName', label: 'Khoa/Phòng', width: 140, render: (t) => toStringValue(t.departmentName, '—') },
    { key: 'requestedByName', label: 'Người yêu cầu', width: 140, render: (t) => toStringValue(t.requestedByName, '—') },
    { key: 'priority', label: 'Mức độ', width: 100, render: (t) => { const p = PRIORITY_LABEL[toNumberValue(t.priority)]; return p ? <StatusBadge tone={p.tone}>{p.text}</StatusBadge> : '—'; } },
    { key: 'status', label: 'Trạng thái', width: 110, render: (t) => { const s = STATUS_LABEL[toNumberValue(t.status)]; return s ? <StatusBadge tone={s.tone} dot>{s.text}</StatusBadge> : '—'; } },
    { key: 'createdAt', label: 'Ngày tạo', mono: true, width: 130, render: (t) => t.createdAt ? dayjs(toStringValue(t.createdAt)).format('DD/MM/YY HH:mm') : '—' },
    { key: 'response', label: 'Phản hồi', render: (t) => toStringValue(t.response, '—') },
  ];

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Mới', val: stats.newCount, tone: 'info' },
        { lbl: 'Đang xử lý', val: stats.inProgressCount, tone: 'warn' },
        { lbl: 'Đã giải quyết', val: stats.resolvedCount, tone: 'ok' },
        { lbl: 'Đã đóng', val: stats.closedCount },
      ]} />
      <div className="ab-tools">
        <Select placeholder="Mức độ" style={{ width: 140 }} allowClear value={filterPriority} onChange={setFilterPriority}
          options={[{ value: 1, label: 'Thấp' }, { value: 2, label: 'Trung bình' }, { value: 3, label: 'Cao' }, { value: 4, label: 'Khẩn cấp' }]} />
        <Select placeholder="Trạng thái" style={{ width: 140 }} allowClear value={filterStatus} onChange={setFilterStatus}
          options={[{ value: 0, label: 'Mới' }, { value: 1, label: 'Đang xử lý' }, { value: 2, label: 'Đã giải quyết' }, { value: 3, label: 'Đã đóng' }]} />
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm kiếm yêu cầu…" />
        <span className="spacer" />
        <Btn variant="primary" onClick={() => setCreateOpen(true)}>+ Tạo yêu cầu</Btn>
        <Btn variant="ghost" onClick={load}>Làm mới</Btn>
      </div>

      <DataTable<TicketRow> columns={columns} data={tickets} rowKey={(t) => toStringValue(t.id)}
        onRowClick={(t) => setSelTicket(t)}
        actions={(t) => (<>
          {toNumberValue(t.status) < 2 && <ActBtn ic="send" title="Phản hồi" onClick={() => { setRespondId(toStringValue(t.id)); }} />}
          {toNumberValue(t.status) < 3 && <ActBtn ic="x" title="Đóng" tone="crit" onClick={() => closeTicket(t)} />}
        </>)}
        empty={loading ? 'Đang tải…' : 'Không có yêu cầu CNTT'} />

      {/* Drawer chi tiết */}
      <DrawerShell open={!!selTicket} onClose={() => setSelTicket(null)} title={selTicket ? toStringValue(selTicket.title) : ''} sub="Yêu cầu CNTT" size="md">
        {selTicket && (<>
          <DrSec title="Nội dung">
            <DrField lbl="Tiêu đề">{toStringValue(selTicket.title)}</DrField>
            <DrField lbl="Mô tả">{toStringValue(selTicket.description, '—')}</DrField>
            <DrField lbl="Khoa/Phòng">{toStringValue(selTicket.departmentName, '—')}</DrField>
            <DrField lbl="Người yêu cầu">{toStringValue(selTicket.requestedByName, '—')}</DrField>
          </DrSec>
          <DrSec title="Xử lý">
            <DrField lbl="Mức độ">{PRIORITY_LABEL[toNumberValue(selTicket.priority)]?.text || '—'}</DrField>
            <DrField lbl="Trạng thái">{STATUS_LABEL[toNumberValue(selTicket.status)]?.text || '—'}</DrField>
            <DrField lbl="Phản hồi">{toStringValue(selTicket.response, '—')}</DrField>
            <DrField lbl="Người xử lý">{toStringValue(selTicket.assignedToName, '—')}</DrField>
            <DrField lbl="Ngày tạo">{selTicket.createdAt ? dayjs(toStringValue(selTicket.createdAt)).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Ngày xử lý">{selTicket.resolvedAt ? dayjs(toStringValue(selTicket.resolvedAt)).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
          </DrSec>
        </>)}
      </DrawerShell>

      {/* Modal tạo yêu cầu */}
      <ModalShell open={createOpen} onClose={() => { setCreateOpen(false); createF.resetFields(); }} title="Tạo yêu cầu CNTT" size="sm"
        footer={<><Btn onClick={() => { setCreateOpen(false); createF.resetFields(); }}>Huỷ</Btn><Btn variant="primary" disabled={saving} onClick={submitCreate}>{saving ? 'Đang gửi…' : 'Gửi'}</Btn></>}>
        <Form form={createF} layout="vertical" requiredMark>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
            <Input placeholder="VD: Máy in phòng khám 3 bị kẹt giấy" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả chi tiết" rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}>
            <Input.TextArea rows={4} placeholder="Mô tả chi tiết vấn đề gặp phải…" />
          </Form.Item>
          <Form.Item name="priority" label="Mức độ ưu tiên" initialValue={2}>
            <Select options={[
              { value: 1, label: 'Thấp — Không gấp' }, { value: 2, label: 'Trung bình — Cần xử lý' },
              { value: 3, label: 'Cao — Ảnh hưởng công việc' }, { value: 4, label: 'Khẩn cấp — Ngừng hoạt động' },
            ]} />
          </Form.Item>
        </Form>
      </ModalShell>

      {/* Modal phản hồi */}
      <ModalShell open={!!respondId} onClose={() => { setRespondId(null); respondF.resetFields(); }} title="Phản hồi yêu cầu CNTT" size="sm"
        footer={<><Btn onClick={() => { setRespondId(null); respondF.resetFields(); }}>Huỷ</Btn><Btn variant="primary" disabled={saving} onClick={submitRespond}>{saving ? 'Đang gửi…' : 'Gửi phản hồi'}</Btn></>}>
        <Form form={respondF} layout="vertical" requiredMark>
          <Form.Item name="response" label="Nội dung phản hồi" rules={[{ required: true, message: 'Vui lòng nhập nội dung phản hồi' }]}>
            <Input.TextArea rows={4} placeholder="Mô tả cách xử lý, hướng dẫn, hoặc ghi chú…" />
          </Form.Item>
        </Form>
      </ModalShell>
    </>
  );
};

export default ItTicketsPanel;
