/**
 * G-41 Payroll Admin — quản lý kỳ lương + dòng lương nhân viên (MVP).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import {
  KpiStrip, StatusTabs, DataTable, StatusBadge, ActBtn, Btn,
  tk, ti, tw, cf, type ColumnDef, type StatusTab,
} from './_v2kit';

// ── Types ──────────────────────────────────────────────────────────────────

interface PayrollPeriod {
  id: string;
  periodCode: string;
  year: number;
  month: number;
  status: number;
  statusName: string;
  approvedBy?: string;
  notes?: string;
  itemCount: number;
  totalNetSalary: number;
  createdAt: string;
}

interface PayrollItem {
  id: string;
  periodId: string;
  staffCode?: string;
  staffName?: string;
  departmentName?: string;
  workDays: number;
  baseSalary: number;
  allowance: number;
  otherIncome: number;
  bhxhDeduction: number;
  otherDeduction: number;
  netSalary: number;
  notes?: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

type SKey = 'draft' | 'approved';
const STATUS_TABS: StatusTab<SKey>[] = [
  { v: 'draft',    l: 'Dự thảo',   tone: 'warn' },
  { v: 'approved', l: 'Đã duyệt',  tone: 'ok' },
];
const sKey = (n: number): SKey => (n === 0 ? 'draft' : 'approved');
const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');

// ── Component ───────────────────────────────────────────────────────────────

const PayrollAdminV2: React.FC = () => {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [stab, setStab] = useState<SKey | 'all'>('all');

  const [periodModal, setPeriodModal] = useState(false);
  const [periodForm] = Form.useForm();

  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null);
  const [itemForm] = Form.useForm();

  // ── Data loading ────────────────────────────────────────────────────────

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<PayrollPeriod[]>('/admin-modules/payroll/periods');
      setPeriods(data || []);
    } catch { ti('Tải danh sách kỳ lương thất bại'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPeriods(); }, [loadPeriods]);

  const loadItems = useCallback(async (periodId: string) => {
    setItemsLoading(true);
    try {
      const { data } = await apiClient.get<PayrollItem[]>(`/admin-modules/payroll/periods/${periodId}/items`);
      setItems(data || []);
    } catch { ti('Tải dòng lương thất bại'); }
    finally { setItemsLoading(false); }
  }, []);

  // ── Period actions ───────────────────────────────────────────────────────

  const openCreatePeriod = () => {
    periodForm.resetFields();
    periodForm.setFieldsValue({ year: dayjs().year(), month: dayjs().month() + 1 });
    setPeriodModal(true);
  };

  const submitPeriod = async () => {
    const v = await periodForm.validateFields();
    try {
      await apiClient.post('/admin-modules/payroll/periods', v);
      tk('Đã tạo kỳ lương'); setPeriodModal(false); loadPeriods();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      tw(err?.response?.data?.message || 'Tạo kỳ lương thất bại');
    }
  };

  const approvePeriod = (p: PayrollPeriod) =>
    cf(`Duyệt kỳ lương ${p.periodCode}?`, async () => {
      try { await apiClient.post(`/admin-modules/payroll/periods/${p.id}/approve`); tk('Đã duyệt'); loadPeriods(); }
      catch { tw('Duyệt thất bại'); }
    }, { confirm: 'Duyệt' });

  const generateItems = async (p: PayrollPeriod) => {
    try {
      await apiClient.post(`/admin-modules/payroll/periods/${p.id}/generate`);
      tk('Đã tạo dòng lương');
      if (selectedPeriod?.id === p.id) loadItems(p.id);
    } catch { tw('Tạo dòng lương thất bại'); }
  };

  const openEditItem = (item: PayrollItem) => {
    setEditingItem(item);
    itemForm.setFieldsValue(item);
    setItemModal(true);
  };

  const submitItem = async () => {
    const v = await itemForm.validateFields();
    try {
      await apiClient.post('/admin-modules/payroll/items', {
        ...v, id: editingItem?.id, periodId: selectedPeriod?.id,
      });
      tk('Đã lưu'); setItemModal(false);
      if (selectedPeriod) loadItems(selectedPeriod.id);
    } catch { tw('Lưu thất bại'); }
  };

  const exportCsv = () => {
    if (!items.length) { tw('Không có dữ liệu'); return; }
    const header = 'Mã NV,Họ tên,Khoa,Ngày công,Lương CB,Phụ cấp,Thu nhập khác,KT BHXH,KT khác,Thực lãnh';
    const rows = items.map((i) =>
      [i.staffCode, i.staffName, i.departmentName, i.workDays,
        i.baseSalary, i.allowance, i.otherIncome, i.bhxhDeduction, i.otherDeduction, i.netSalary].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `luong_${selectedPeriod?.periodCode || 'export'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const filtered = useMemo(
    () => stab === 'all' ? periods : periods.filter((p) => sKey(p.status) === stab),
    [periods, stab],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: periods.length };
    STATUS_TABS.forEach((s) => { c[s.v] = periods.filter((p) => sKey(p.status) === s.v).length; });
    return c;
  }, [periods]);

  // ── Columns ──────────────────────────────────────────────────────────────

  const periodCols: ColumnDef<PayrollPeriod>[] = [
    { key: 'code',   label: 'Kỳ lương',         code: true, render: (r) => r.periodCode },
    { key: 'count',  label: 'Số NV',             mono: true, render: (r) => r.itemCount },
    { key: 'total',  label: 'Tổng thực lãnh',    mono: true, render: (r) => `${fmt(r.totalNetSalary)} đ` },
    { key: 'status', label: 'Trạng thái',        render: (r) => (
      <StatusBadge tone={r.status === 1 ? 'ok' : 'warn'}>{r.statusName}</StatusBadge>
    ) },
    { key: 'notes',  label: 'Ghi chú',           render: (r) => r.notes || '—' },
  ];

  const itemCols: ColumnDef<PayrollItem>[] = [
    { key: 'code',  label: 'Mã NV',      code: true, render: (r) => r.staffCode || '—' },
    { key: 'name',  label: 'Họ tên',               render: (r) => r.staffName || '—' },
    { key: 'dept',  label: 'Khoa',                  render: (r) => r.departmentName || '—' },
    { key: 'days',  label: 'Ngày công',   mono: true, render: (r) => r.workDays },
    { key: 'base',  label: 'Lương CB',    mono: true, render: (r) => fmt(r.baseSalary) },
    { key: 'allow', label: 'Phụ cấp',    mono: true, render: (r) => fmt(r.allowance) },
    { key: 'bhxh',  label: 'KT BHXH',    mono: true, render: (r) => fmt(r.bhxhDeduction) },
    { key: 'net',   label: 'Thực lãnh',   mono: true, render: (r) => (
      <strong style={{ color: 'var(--a-em-text)' }}>{fmt(r.netSalary)}</strong>
    ) },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Kỳ lương',   val: periods.length,                                                              sub: 'tất cả' },
        { lbl: 'Dự thảo',    val: counts.draft || 0,                                                           sub: 'chưa duyệt', tone: 'warn' },
        { lbl: 'Đã duyệt',   val: counts.approved || 0,                                                        sub: 'hoàn thành', tone: 'ok' },
        { lbl: 'Tổng quỹ',   val: `${Math.round(periods.reduce((s, p) => s + p.totalNetSalary, 0) / 1_000_000)}M`, sub: 'tổng thực lãnh' },
      ]} />

      <div className="ab-stab" style={{ marginBottom: 0 }}>
        <StatusTabs<SKey>
          value={stab}
          onChange={setStab}
          tabs={STATUS_TABS}
          counts={counts}
        />
        <Btn icon="plus" onClick={openCreatePeriod} variant="primary">Tạo kỳ lương</Btn>
      </div>

      <DataTable<PayrollPeriod>
        columns={periodCols}
        data={filtered}
        rowKey={(r) => r.id}
        onRowClick={(r) => { setSelectedPeriod(r); loadItems(r.id); }}
        actions={(r) => (
          <div style={{ display: 'flex', gap: 4 }}>
            <ActBtn ic="eye" title="Xem dòng lương" onClick={(e) => { e.stopPropagation(); setSelectedPeriod(r); loadItems(r.id); }} />
            {r.status === 0 && (
              <>
                <ActBtn ic="zap" title="Tạo dòng lương tự động" onClick={() => generateItems(r)} tone="warn" />
                <ActBtn ic="check" title="Duyệt kỳ lương" onClick={() => approvePeriod(r)} />
              </>
            )}
          </div>
        )}
        empty={loading ? 'Đang tải…' : 'Chưa có kỳ lương nào'}
      />

      {selectedPeriod && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--fs-lg)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Dòng lương — Kỳ {selectedPeriod.periodCode}
              <StatusBadge tone={selectedPeriod.status === 1 ? 'ok' : 'warn'}>
                {selectedPeriod.statusName}
              </StatusBadge>
            </span>
            <Btn icon="download" variant="ghost" onClick={exportCsv}>Xuất CSV</Btn>
          </div>
          <DataTable<PayrollItem>
            columns={itemCols}
            data={items}
            rowKey={(r) => r.id}
            actions={(r) => (
              <ActBtn ic="edit" title="Sửa lương" onClick={() => openEditItem(r)} />
            )}
            empty={itemsLoading ? 'Đang tải…' : "Chưa có dòng lương — nhấn 'Tạo dòng' ở kỳ"}
          />
        </div>
      )}

      {/* Create period modal */}
      <Modal
        open={periodModal}
        title="Tạo kỳ lương"
        onOk={submitPeriod}
        onCancel={() => setPeriodModal(false)}
        okText="Tạo"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={periodForm} layout="vertical">
          <Form.Item name="year" label="Năm" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={2020} max={2100} />
          </Form.Item>
          <Form.Item name="month" label="Tháng" rules={[{ required: true }]}>
            <Select options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit item modal */}
      <Modal
        open={itemModal}
        title={`Sửa lương — ${editingItem?.staffName || editingItem?.staffCode}`}
        onOk={submitItem}
        onCancel={() => setItemModal(false)}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnHidden
        width={520}
      >
        <Form form={itemForm} layout="vertical">
          <Form.Item name="workDays" label="Ngày công">
            <InputNumber style={{ width: '100%' }} min={0} max={31} step={0.5} />
          </Form.Item>
          <Form.Item name="baseSalary" label="Lương cơ bản (đ)">
            <InputNumber style={{ width: '100%' }} min={0} step={100000} />
          </Form.Item>
          <Form.Item name="allowance" label="Phụ cấp tổng (đ)">
            <InputNumber style={{ width: '100%' }} min={0} step={100000} />
          </Form.Item>
          <Form.Item name="otherIncome" label="Thu nhập khác (đ)">
            <InputNumber style={{ width: '100%' }} min={0} step={100000} />
          </Form.Item>
          <Form.Item name="otherDeduction" label="Khấu trừ khác (đ)">
            <InputNumber style={{ width: '100%' }} min={0} step={100000} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PayrollAdminV2;
