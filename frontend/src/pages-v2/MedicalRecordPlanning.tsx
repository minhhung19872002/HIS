import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Divider } from 'antd';
import { getRecordCodes, assignRecordCode, bulkAllocate } from '../api/medicalRecordPlanning';
import type { BulkAllocateResult } from '../api/medicalRecordPlanning';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, ModalShell, DrSec, DrField, tk, ti, tw, Ico,
  type ColumnDef,
} from './_v2kit';

interface RecordCode {
  id: string;
  recordCode: string;
  examinationId?: string;
  patientCode?: string;
  patientName?: string;
  departmentName?: string;
  doctorName?: string;
  assignedDate?: string;
  assignedByName?: string;
  status: number;
  statusName: string;
  createdAt: string;
}

type SKey = 'unused' | 'assigned' | 'completed' | 'pending' | 'cancelled';
const STATUS_TABS = [
  { v: 'unused' as SKey,    l: 'Chưa dùng',  tone: 'warn' as const },
  { v: 'assigned' as SKey,  l: 'Đã gán',     tone: 'info' as const },
  { v: 'completed' as SKey, l: 'Hoàn tất',   tone: 'ok' as const },
  { v: 'pending' as SKey,   l: 'Treo',       tone: 'warn' as const },
  { v: 'cancelled' as SKey, l: 'Hủy',        tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'unused' : n === 1 ? 'assigned' : n === 2 ? 'completed' : n === 3 ? 'pending' : 'cancelled';

const PER = 18;

const MedicalRecordPlanningV2: React.FC = () => {
  const [items, setItems] = useState<RecordCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fDept, setFDept] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<RecordCode | null>(null);

  // --- Gán BN modal ---
  const [assignTarget, setAssignTarget] = useState<RecordCode | null>(null);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignForm] = Form.useForm();

  // --- Cấp dải mã modal ---
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkAllocateResult | null>(null);
  const [bulkForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const r = await getRecordCodes({ pageIndex: 0, pageSize: 200, keyword: search || undefined });
      const list = ((r.data as { items?: RecordCode[] })?.items || []) as RecordCode[];
      setItems(list);
    } catch { ti('Không tải được mã BA'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openAssign = (r: RecordCode) => {
    setAssignTarget(r);
    assignForm.resetFields();
    assignForm.setFieldValue('examinationId', '');
  };

  const handleAssign = async () => {
    setAssignSaving(true);
    try {
      const v = await assignForm.validateFields();
      await assignRecordCode({ examinationId: v.examinationId.trim(), recordCode: assignTarget?.recordCode });
      tk(`Đã gán mã BA ${assignTarget?.recordCode}`);
      setAssignTarget(null);
      setSel(null);
      assignForm.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (err?.errorFields) return;
      tw('Gán BN thất bại');
    } finally {
      setAssignSaving(false);
    }
  };

  const openBulk = () => {
    setBulkResult(null);
    bulkForm.resetFields();
    setBulkOpen(true);
  };

  const handleBulkAllocate = async () => {
    setBulkSaving(true);
    try {
      const v = await bulkForm.validateFields();
      const dto = {
        departmentId: v.departmentId?.trim() || '',
        prefix: v.prefix?.trim() || undefined,
        count: v.count ? Number(v.count) : undefined,
        fromCode: v.fromCode?.trim() || undefined,
        toCode: v.toCode?.trim() || undefined,
        skipExisting: true,
      };
      const r = await bulkAllocate(dto);
      const result = r.data as BulkAllocateResult;
      setBulkResult(result);
      tk(`Đã cấp ${result.allocated} mã BA`);
      load();
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (err?.errorFields) return;
      tw('Cấp dải mã thất bại');
    } finally {
      setBulkSaving(false);
    }
  };

  const depts = useMemo(() => {
    const set = new Set(items.map((r) => r.departmentName).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fDept && r.departmentName !== fDept) return false;
      if (!k) return true;
      return [r.recordCode, r.patientName, r.patientCode, r.doctorName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fDept]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<RecordCode>[] = [
    { key: 'code', label: 'Mã BA', code: true, render: (r) => r.recordCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => r.patientName ? (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) : <span style={{ color: 'var(--t-2)' }}>Chưa gán</span> },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'doc', label: 'BS', render: (r) => r.doctorName || '—' },
    { key: 'date', label: 'Ngày gán', mono: true, render: (r) => r.assignedDate ? dayjs(r.assignedDate).format('DD/MM HH:mm') : '—' },
    { key: 'by', label: 'Người gán', render: (r) => r.assignedByName || '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{r.statusName}</StatusBadge>;
    } },
  ];

  const actions = (r: RecordCode) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {r.status === 0 && (
        <ActBtn ic="user" title="Gán BN" onClick={() => openAssign(r)} />
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng mã BA', val: items.length, sub: 'tất cả' },
        { lbl: 'Chưa dùng', val: counts.unused || 0, sub: 'sẵn dùng', tone: 'warn' },
        { lbl: 'Đã gán', val: counts.assigned || 0, sub: 'đang dùng', tone: 'info' },
        { lbl: 'Hoàn tất', val: counts.completed || 0, sub: `${Math.round(((counts.completed || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã BA…" />
        <Filter value={fDept} onChange={setFDept} options={depts} placeholder="▾ Khoa" />
        <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFDept(''); setStab('all'); }}>Bỏ lọc</Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="primary" icon="plus" onClick={openBulk}>Cấp dải mã</Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<RecordCode>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có mã BA'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `Mã BA ${sel.recordCode}` : ''}
        sub={sel ? sel.statusName : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          {sel && sel.status === 0 && (
            <Btn variant="primary" icon="user" onClick={() => { openAssign(sel); setSel(null); }}>Gán BN</Btn>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Mã BA">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.recordCode}</span></DrField>
            <DrField lbl="Tạo lúc">{dayjs(sel.createdAt).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {sel.statusName}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Sử dụng">
            <DrField lbl="Bệnh nhân">{sel.patientName || '—'}</DrField>
            <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.patientCode || '—'}</span></DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="BS">{sel.doctorName || '—'}</DrField>
            {sel.assignedDate && <DrField lbl="Ngày gán">{dayjs(sel.assignedDate).format('DD/MM/YYYY HH:mm')}</DrField>}
            <DrField lbl="Người gán">{sel.assignedByName || '—'}</DrField>
          </DrSec>
        </>}
      </DrawerShell>
      {/* ===== Modal Gán BN ===== */}
      <ModalShell
        open={!!assignTarget}
        onClose={() => { setAssignTarget(null); assignForm.resetFields(); }}
        title={assignTarget ? `Gán BN cho mã BA · ${assignTarget.recordCode}` : 'Gán BN'}
        size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => { setAssignTarget(null); assignForm.resetFields(); }}>Hủy</Btn>
          <Btn variant="primary" onClick={handleAssign} loading={assignSaving}>
            <Ico name="check" size={12} /> Xác nhận gán
          </Btn>
        </>}
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ padding: 'var(--space-10)', marginBottom: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
            Gán bệnh nhân (qua ExaminationId) cho mã BA{' '}
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--t-0)' }}>{assignTarget?.recordCode}</span>.
          </div>
          <Form form={assignForm} layout="vertical">
            <Form.Item name="examinationId" label="ExaminationId (lần khám)" rules={[{ required: true, message: 'Nhập ExaminationId' }]}>
              <Input placeholder="VD: 3fa85f64-5717-4562-b3fc-2c963f66afa6" style={{ fontFamily: 'var(--font-mono)' }} />
            </Form.Item>
          </Form>
        </div>
      </ModalShell>

      {/* ===== Modal Cấp dải mã ===== */}
      <ModalShell
        open={bulkOpen}
        onClose={() => { setBulkOpen(false); setBulkResult(null); bulkForm.resetFields(); }}
        title="Cấp dải mã BA"
        size="lg"
        footer={bulkResult ? (
          <Btn variant="primary" onClick={() => { setBulkOpen(false); setBulkResult(null); bulkForm.resetFields(); }}>Đóng</Btn>
        ) : (
          <>
            <Btn variant="ghost" onClick={() => setBulkOpen(false)}>Hủy</Btn>
            <Btn variant="primary" onClick={handleBulkAllocate} loading={bulkSaving}>
              <Ico name="plus" size={12} /> Cấp mã
            </Btn>
          </>
        )}
      >
        {bulkResult ? (
          <div style={{ padding: '8px 0' }}>
            <div style={{ marginBottom: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4 }}>
              <div style={{ fontWeight: 600, marginBottom: 'var(--space-6)', color: 'var(--t-0)' }}>{bulkResult.message}</div>
              <div style={{ display: 'flex', gap: 'var(--space-16)', fontSize: 'var(--fs-md)' }}>
                <span>Yêu cầu: <b>{bulkResult.requested}</b></span>
                <span style={{ color: 'var(--a-gn-text)' }}>Cấp: <b>{bulkResult.allocated}</b></span>
                <span style={{ color: 'var(--a-or-text)' }}>Bỏ qua: <b>{bulkResult.skipped}</b></span>
                <span style={{ color: 'var(--a-rd-text)' }}>Lỗi: <b>{bulkResult.failed}</b></span>
              </div>
            </div>
            {bulkResult.allocatedCodes.length > 0 && (
              <DrSec title={`Mã đã cấp (${bulkResult.allocatedCodes.length})`}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', lineHeight: '22px', color: 'var(--t-1)' }}>
                  {bulkResult.allocatedCodes.join(' · ')}
                </div>
              </DrSec>
            )}
            {bulkResult.errors.length > 0 && (
              <DrSec title="Lỗi">
                {bulkResult.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: 'var(--fs-sm)', color: 'var(--a-rd-text)', marginBottom: 'var(--space-2)' }}>{e}</div>
                ))}
              </DrSec>
            )}
          </div>
        ) : (
          <Form form={bulkForm} layout="vertical" style={{ padding: '8px 0' }}>
            <Form.Item name="departmentId" label="Department ID">
              <Input placeholder="UUID khoa (để trống nếu không cần)" style={{ fontFamily: 'var(--font-mono)' }} />
            </Form.Item>
            <Divider style={{ margin: '8px 0', borderColor: 'var(--line)' }}>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Chọn 1 trong 2 cách cấp mã</span>
            </Divider>
            <div style={{ marginBottom: 'var(--space-8)', fontSize: 'var(--fs-sm)', color: 'var(--t-2)', fontWeight: 600 }}>Cách 1: Prefix + Số lượng</div>
            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <Form.Item name="prefix" label="Prefix" style={{ flex: 1 }}>
                <Input placeholder="VD: HS" />
              </Form.Item>
              <Form.Item name="count" label="Số lượng" style={{ flex: 1 }}>
                <InputNumber min={1} max={1000} style={{ width: '100%' }} placeholder="VD: 100" />
              </Form.Item>
            </div>
            <div style={{ marginBottom: 'var(--space-8)', fontSize: 'var(--fs-sm)', color: 'var(--t-2)', fontWeight: 600 }}>Cách 2: Dải từ — đến</div>
            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <Form.Item name="fromCode" label="Từ mã" style={{ flex: 1 }}>
                <Input placeholder="VD: HS0001" style={{ fontFamily: 'var(--font-mono)' }} />
              </Form.Item>
              <Form.Item name="toCode" label="Đến mã" style={{ flex: 1 }}>
                <Input placeholder="VD: HS0100" style={{ fontFamily: 'var(--font-mono)' }} />
              </Form.Item>
            </div>
          </Form>
        )}
      </ModalShell>
    </div>
  );
};

export default MedicalRecordPlanningV2;
