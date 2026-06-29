/**
 * G-42 HR Decisions — quản lý quyết định nhân sự + in QĐ đơn giản (MVP).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DatePicker, Form, Input, Modal, Select } from 'antd';
import type { RangePickerProps } from 'antd/es/date-picker';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../api/client';
import { openPrintWindow } from '../utils/printWindow';
import {
  KpiStrip, StatusTabs, DataTable, StatusBadge, ActBtn, Btn,
  tk, ti, tw, cf, useTabCounts, type ColumnDef, type StatusTab,
} from './_v2kit';

// ── Types ──────────────────────────────────────────────────────────────────

interface HrDecision {
  id: string;
  decisionNumber: string;
  decisionType: number;
  decisionTypeName: string;
  staffCode?: string;
  staffName?: string;
  effectiveDate: string;
  summary: string;
  content?: string;
  status: number;
  statusName: string;
  department?: string;
  position?: string;
  signerName?: string;
  notes?: string;
  createdAt: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const DECISION_TYPES = [
  { value: 0, label: 'Bổ nhiệm' }, { value: 1, label: 'Điều động' },
  { value: 2, label: 'Nâng lương' }, { value: 3, label: 'Khen thưởng' },
  { value: 4, label: 'Kỷ luật' }, { value: 5, label: 'Thôi việc' },
  { value: 6, label: 'Đi học' },
];

type SKey = 'draft' | 'active' | 'cancelled';
const STATUS_TABS: StatusTab<SKey>[] = [
  { v: 'draft',     l: 'Dự thảo',  tone: 'warn' },
  { v: 'active',    l: 'Hiệu lực', tone: 'ok' },
  { v: 'cancelled', l: 'Hủy',      tone: 'crit' },
];
const sKey = (n: number): SKey => (n === 0 ? 'draft' : n === 1 ? 'active' : 'cancelled');
const STATUS_TONE: Record<number, 'ok' | 'warn' | 'crit'> = { 0: 'warn', 1: 'ok', 2: 'crit' };

// ── Print ─────────────────────────────────────────────────────────────────

function printDecision(d: HrDecision) {
  const html = `<html><head><title>QĐ ${d.decisionNumber}</title>
    <style>body{font-family:serif;padding:'var(--space-40)'px}h2,h3{text-align:center}.meta{margin:'var(--space-12)'px 0}
    .content{margin-top:24px;white-space:pre-wrap}@media print{button{display:none}}</style></head>
    <body><h2>QUYẾT ĐỊNH NHÂN SỰ</h2><h3>Số: ${d.decisionNumber}</h3>
    <div class="meta"><b>Loại:</b> ${d.decisionTypeName} &nbsp;|&nbsp; <b>Ngày hiệu lực:</b> ${new Date(d.effectiveDate).toLocaleDateString('vi-VN')}</div>
    <div class="meta"><b>Nhân viên:</b> ${d.staffName || ''} (${d.staffCode || ''})</div>
    <div class="meta"><b>Trích yếu:</b> ${d.summary}</div>
    <div class="content">${d.content || ''}</div>
    <div style="margin-top:60px;text-align:right"><p>............, ngày ${new Date().toLocaleDateString('vi-VN')}</p><p><b>GIÁM ĐỐC</b></p></div>
    <button onclick="window.print()" style="margin-top:20px;padding:'var(--space-8)'px 20px">In</button>
    </body></html>`;
  openPrintWindow(html, { features: 'width=800,height=600' });
}

// ── Component ───────────────────────────────────────────────────────────────

const HrDecisionsV2: React.FC = () => {
  const [rows, setRows] = useState<HrDecision[]>([]);
  const [loading, setLoading] = useState(false);
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HrDecision | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateRange[0]) params['from'] = dateRange[0].startOf('day').toISOString();
      if (dateRange[1]) params['to'] = dateRange[1].endOf('day').toISOString();
      if (search.trim()) params['keyword'] = search.trim();
      const { data } = await apiClient.get<HrDecision[]>('/admin-modules/hr-decisions', { params });
      setRows(data || []);
    } catch { ti('Tải danh sách thất bại'); }
    finally { setLoading(false); }
  }, [dateRange, search]);

  // Reload khi dateRange thay đổi; search debounce-free (load() phụ thuộc search qua useCallback)
  useEffect(() => { load(); }, [load]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 0, effectiveDate: dayjs() });
    setModalOpen(true);
  };

  const openEdit = (r: HrDecision) => {
    setEditing(r);
    form.setFieldsValue({
      decisionNumber: r.decisionNumber,
      decisionType:   r.decisionType,
      staffCode:      r.staffCode,
      staffName:      r.staffName,
      effectiveDate:  r.effectiveDate ? dayjs(r.effectiveDate) : dayjs(),
      summary:        r.summary,
      content:        r.content,
      status:         r.status,
      department:     r.department,
      position:       r.position,
      signerName:     r.signerName,
      notes:          r.notes,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      await apiClient.post('/admin-modules/hr-decisions', {
        ...v, id: editing?.id,
        effectiveDate: v.effectiveDate?.toISOString?.() ?? v.effectiveDate,
      });
      tk(editing ? 'Đã cập nhật' : 'Đã thêm'); setModalOpen(false); load();
    } catch { tw('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  const del = (r: HrDecision) =>
    cf(`Xóa QĐ ${r.decisionNumber}?`, async () => {
      try { await apiClient.delete(`/admin-modules/hr-decisions/${r.id}`); tk('Đã xóa'); load(); }
      catch { tw('Xóa thất bại'); }
    }, { tone: 'crit', confirm: 'Xóa' });

  // ── Derived ──────────────────────────────────────────────────────────────

  // keyword + dateRange đã filter server-side qua load(); chỉ filter tab status + loại QĐ ở client
  const filtered = useMemo(() => rows.filter((r) => {
    if (stab !== 'all' && sKey(r.status) !== stab) return false;
    if (filterType && String(r.decisionType) !== filterType) return false;
    return true;
  }), [rows, stab, filterType]);

  const counts = useTabCounts(rows, STATUS_TABS, (r) => sKey(r.status));

  // ── Columns ──────────────────────────────────────────────────────────────

  const columns: ColumnDef<HrDecision>[] = [
    { key: 'num',    label: 'Số QĐ',          code: true, render: (r) => r.decisionNumber },
    { key: 'type',   label: 'Loại',                       render: (r) => r.decisionTypeName },
    { key: 'staff',  label: 'Nhân viên',                  render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.staffName || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.staffCode}</div>
      </div>
    ) },
    { key: 'date',   label: 'Ngày hiệu lực',  mono: true, render: (r) => new Date(r.effectiveDate).toLocaleDateString('vi-VN') },
    { key: 'sum',    label: 'Trích yếu',                  render: (r) => (
      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>{r.summary}</span>
    ) },
    { key: 'status', label: 'Trạng thái',                render: (r) => (
      <StatusBadge tone={STATUS_TONE[r.status] || 'info'}>{r.statusName}</StatusBadge>
    ) },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng QĐ',   val: rows.length,                               sub: 'tất cả' },
        { lbl: 'Hiệu lực',  val: rows.filter((r) => r.status === 1).length, sub: 'đang áp dụng', tone: 'ok' },
        { lbl: 'Dự thảo',   val: rows.filter((r) => r.status === 0).length, sub: 'chưa duyệt',   tone: 'warn' },
        { lbl: 'Kỷ luật',   val: rows.filter((r) => r.decisionType === 4).length, sub: 'kỷ luật', tone: 'crit' },
      ]} />

      <div className="ab-tools" style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap', alignItems: 'center', padding: '8px 0' }}>
        <input
          className="ab-search-input"
          placeholder="Tìm số QĐ, tên nhân viên…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
          style={{ flex: '1 1 200px', minWidth: 180, padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 4 }}
        />
        <DatePicker.RangePicker
          style={{ minWidth: 240 }}
          format="DD/MM/YYYY"
          value={dateRange as RangePickerProps['value']}
          onChange={(v) => setDateRange(v ? [v[0] ?? null, v[1] ?? null] : [null, null])}
          placeholder={['Từ ngày', 'Đến ngày']}
          allowClear
        />
        <Select
          style={{ width: 160 }}
          placeholder="Loại QĐ"
          allowClear
          value={filterType || undefined}
          onChange={(v) => setFilterType(v || '')}
          options={DECISION_TYPES.map((d) => ({ value: String(d.value), label: d.label }))}
        />
        <div style={{ flex: 1 }} />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="primary" icon="plus" onClick={openAdd}>Thêm QĐ</Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<HrDecision>
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        onRowClick={(r) => openEdit(r)}
        actions={(r) => (
          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <ActBtn ic="printer" title="In quyết định" onClick={(e) => { e.stopPropagation(); printDecision(r); }} />
            <ActBtn ic="trash" title="Xóa" tone="crit" onClick={(e) => { e.stopPropagation(); del(r); }} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : 'Chưa có quyết định nào'}
      />

      <Modal
        open={modalOpen}
        title={editing ? 'Sửa quyết định' : 'Thêm quyết định nhân sự'}
        onOk={submit}
        onCancel={() => setModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saving}
        destroyOnHidden
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="decisionNumber" label="Số QĐ" rules={[{ required: true }]}>
            <Input placeholder="VD: 01/QĐ-BV" />
          </Form.Item>
          <Form.Item name="decisionType" label="Loại" rules={[{ required: true }]}>
            <Select options={DECISION_TYPES.map((d) => ({ value: d.value, label: d.label }))} />
          </Form.Item>
          <Form.Item name="staffId" label="ID nhân viên" rules={[{ required: true }]}>
            <Input placeholder="staff-id hoặc mã nội bộ" />
          </Form.Item>
          <Form.Item name="staffCode" label="Mã nhân viên">
            <Input />
          </Form.Item>
          <Form.Item name="staffName" label="Họ tên nhân viên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="effectiveDate" label="Ngày hiệu lực" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="summary" label="Trích yếu" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="content" label="Nội dung đầy đủ">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="department" label="Đơn vị / Phòng ban">
            <Input placeholder="VD: Phòng Hành chính" />
          </Form.Item>
          <Form.Item name="position" label="Chức vụ">
            <Input placeholder="VD: Trưởng phòng" />
          </Form.Item>
          <Form.Item name="signerName" label="Người ký">
            <Input placeholder="Họ tên người ký quyết định" />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú bổ sung (nếu có)" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={[
              { value: 0, label: 'Dự thảo' }, { value: 1, label: 'Hiệu lực' }, { value: 2, label: 'Hủy' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HrDecisionsV2;
