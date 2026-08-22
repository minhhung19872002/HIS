/**
 * G-44 Official Documents — quản lý công văn đến/đi (MVP).
 */
import React, { useCallback, useMemo, useState } from 'react';
import { DatePicker, Descriptions, Drawer, Form, Input, Modal, Select, Space, Tooltip } from 'antd';
import { fmtDate } from '../../../utils/format';
import dayjs from 'dayjs';
import apiClient from '../../../services/apiClient';
import {
  KpiStrip, StatusTabs, DataTable, StatusBadge, ActBtn, Btn,
  useListData, useTabCounts, tk, tw, cf, type ColumnDef, type StatusTab,
} from '@/_v2kit';
import { RefreshButton } from '../../../components/actions';
import { useTabState } from '../../../hooks/useTabState';

// ── Types ──────────────────────────────────────────────────────────────────

interface OfficialDocument {
  id: string;
  documentNumber: string;
  documentType: number;
  documentTypeName: string;
  documentDate: string;
  sender?: string;
  receiver?: string;
  summary: string;
  handler?: string;
  deadline?: string;
  isOverdue: boolean;
  status: number;
  statusName: string;
  attachmentPath?: string;
  createdAt: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

type SKey = 'new' | 'processing' | 'done' | 'archived';
const STATUS_TABS: StatusTab<SKey>[] = [
  { v: 'new',        l: 'Mới',        tone: 'info' },
  { v: 'processing', l: 'Đang XL',    tone: 'warn' },
  { v: 'done',       l: 'Hoàn thành', tone: 'ok' },
  { v: 'archived',   l: 'Lưu',        tone: 'info' },
];
const sKey = (n: number): SKey =>
  n === 0 ? 'new' : n === 1 ? 'processing' : n === 2 ? 'done' : 'archived';

const STATUS_TONE: Record<number, 'ok' | 'warn' | 'crit' | 'info'> = {
  0: 'info', 1: 'warn', 2: 'ok', 3: 'info',
};

// ── Component ───────────────────────────────────────────────────────────────

const OfficialDocumentsV2: React.FC = () => {
  const { rows, loading, reload } = useListData<OfficialDocument>(
    useCallback(() => apiClient.get<OfficialDocument[]>('/admin-modules/official-documents').then((r) => r.data), []),
    useCallback(() => tw('Tải danh sách thất bại'), []),
  );
  const [stab, setStab] = useTabState<SKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detail / edit drawer
  const [editForm] = Form.useForm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDoc, setDrawerDoc] = useState<OfficialDocument | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────


  // ── Actions ──────────────────────────────────────────────────────────────

  const openAdd = () => {
    form.resetFields();
    form.setFieldsValue({ status: 0, documentType: 0, documentDate: dayjs() });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      await apiClient.post('/admin-modules/official-documents', {
        ...v,
        documentDate: v.documentDate?.toISOString?.() ?? v.documentDate,
        deadline: v.deadline?.toISOString?.() ?? v.deadline,
      });
      tk('Đã lưu'); setModalOpen(false); reload();
    } catch { tw('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  const del = (r: OfficialDocument) =>
    cf(`Xóa công văn ${r.documentNumber}?`, async () => {
      try { await apiClient.delete(`/admin-modules/official-documents/${r.id}`); tk('Đã xóa'); reload(); }
      catch { tw('Xóa thất bại'); }
    }, { tone: 'crit', confirm: 'Xóa' });

  const openDetail = (r: OfficialDocument) => {
    setDrawerDoc(r);
    setEditMode(false);
    setDrawerOpen(true);
  };

  const openEdit = (r: OfficialDocument) => {
    setDrawerDoc(r);
    editForm.setFieldsValue({
      ...r,
      documentDate: r.documentDate ? dayjs(r.documentDate) : undefined,
      deadline: r.deadline ? dayjs(r.deadline) : undefined,
    });
    setEditMode(true);
    setDrawerOpen(true);
  };

  const submitEdit = async () => {
    if (!drawerDoc) return;
    setEditSaving(true);
    try {
      const v = await editForm.validateFields();
      // Backend SaveOfficialDocumentAsync checks dto.Id to determine add vs update
      await apiClient.post('/admin-modules/official-documents', {
        ...v,
        id: drawerDoc.id,
        documentDate: v.documentDate?.toISOString?.() ?? v.documentDate,
        deadline: v.deadline?.toISOString?.() ?? v.deadline,
      });
      tk('Đã cập nhật'); setDrawerOpen(false); reload();
    } catch { tw('Lưu thất bại'); }
    finally { setEditSaving(false); }
  };

  const openAttachment = (path: string) => {
    // attachmentPath có thể là URL tuyệt đối hoặc path tương đối từ backend
    if (path.startsWith('http://') || path.startsWith('https://')) {
      window.open(path, '_blank', 'noopener,noreferrer');
    } else {
      // Assume backend serves at /api/files/...  hoặc path tương đối
      const base = (import.meta.env.VITE_API_URL as string | undefined) || '';
      window.open(`${base}/files/${path}`, '_blank', 'noopener,noreferrer');
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => rows.filter((r) => {
    if (stab !== 'all' && sKey(r.status) !== stab) return false;
    if (filterType && String(r.documentType) !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${r.documentNumber} ${r.summary} ${r.sender || ''} ${r.receiver || ''} ${r.handler || ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rows, stab, filterType, search]);

  const counts = useTabCounts(rows, STATUS_TABS, (r) => sKey(r.status));

  // ── Columns ──────────────────────────────────────────────────────────────

  const columns: ColumnDef<OfficialDocument>[] = [
    { key: 'num',     label: 'Số CV',        code: true, render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.documentNumber}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.documentTypeName}</div>
      </div>
    ) },
    { key: 'date',    label: 'Ngày',         mono: true, render: (r) => fmtDate(r.documentDate) },
    { key: 'party',   label: 'Nơi gửi/nhận',             render: (r) => r.sender || r.receiver || '—' },
    { key: 'sum',     label: 'Trích yếu',               render: (r) => (
      <span style={{ fontSize: 'var(--fs-sm)' }}>{r.summary}</span>
    ) },
    { key: 'handler', label: 'Người XL',                render: (r) => r.handler || '—' },
    { key: 'dead',    label: 'Hạn XL',       mono: true, render: (r) => (
      r.deadline
        ? <span style={{ color: r.isOverdue ? 'var(--a-rd-text)' : undefined, fontWeight: r.isOverdue ? 700 : undefined }}>
            {fmtDate(r.deadline)}
            {r.isOverdue && ' !'}
          </span>
        : <span style={{ color: 'var(--t-3)' }}>—</span>
    ) },
    { key: 'status',  label: 'Trạng thái',              render: (r) => (
      <StatusBadge tone={STATUS_TONE[r.status] || 'info'}>{r.statusName}</StatusBadge>
    ) },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng CV',     val: rows.length,                                     sub: 'tất cả' },
        { lbl: 'Quá hạn',     val: rows.filter((r) => r.isOverdue).length,          sub: 'cần xử lý', tone: 'crit' },
        { lbl: 'Đang xử lý', val: rows.filter((r) => r.status === 1).length,        sub: 'in progress', tone: 'warn' },
        { lbl: 'CV đến',      val: rows.filter((r) => r.documentType === 0).length, sub: 'nhận được' },
      ]} />

      <div className="ab-tools" style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap', alignItems: 'center', padding: '8px 0' }}>
        <input
          className="ab-search-input"
          placeholder="Tìm số CV, trích yếu, nơi gửi…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', minWidth: 180, padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 4 }}
        />
        <Select
          style={{ width: 160 }}
          placeholder="Loại CV"
          allowClear
          value={filterType || undefined}
          onChange={(v) => setFilterType(v || '')}
          options={[
            { value: '0', label: 'Công văn đến' },
            { value: '1', label: 'Công văn đi' },
          ]}
        />
        <div style={{ flex: 1 }} />
        <RefreshButton onRefresh={reload} />
        <Btn variant="primary" icon="plus" onClick={openAdd}>Thêm công văn</Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<OfficialDocument>
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        onRowClick={(r) => openDetail(r)}
        actions={(r) => (
          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <ActBtn ic="edit" title="Sửa" onClick={(e) => { e.stopPropagation(); openEdit(r); }} />
            <ActBtn ic="trash" title="Xóa" tone="crit" onClick={(e) => { e.stopPropagation(); del(r); }} />
          </div>
        )}
        empty="Chưa có công văn nào"
      />

      {/* Detail / Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          drawerDoc
            ? <Space>
                <span style={{ fontWeight: 700 }}>{drawerDoc.documentNumber}</span>
                <StatusBadge tone={STATUS_TONE[drawerDoc.status] || 'info'}>{drawerDoc.statusName}</StatusBadge>
              </Space>
            : ''
        }
        size="large"
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-8)' }}>
            {!editMode && drawerDoc?.attachmentPath && (
              <Tooltip title="Mở file đính kèm">
                <Btn variant="ghost" icon="file-text" onClick={() => openAttachment(drawerDoc.attachmentPath!)}>
                  File đính kèm
                </Btn>
              </Tooltip>
            )}
            {!editMode && (
              <Btn variant="ghost" icon="edit" onClick={() => drawerDoc && openEdit(drawerDoc)}>
                Sửa
              </Btn>
            )}
            {editMode && (
              <>
                <Btn variant="ghost" onClick={() => setEditMode(false)}>Hủy sửa</Btn>
                <Btn variant="primary" icon="check" onClick={submitEdit} disabled={editSaving}>
                  {editSaving ? 'Đang lưu…' : 'Lưu'}
                </Btn>
              </>
            )}
            <Btn variant="ghost" onClick={() => setDrawerOpen(false)}>Đóng</Btn>
          </div>
        }
      >
        {drawerDoc && !editMode && (
          <Descriptions column={1} bordered size="small" labelStyle={{ width: 160 }}>
            <Descriptions.Item label="Số công văn">{drawerDoc.documentNumber}</Descriptions.Item>
            <Descriptions.Item label="Loại">{drawerDoc.documentTypeName}</Descriptions.Item>
            <Descriptions.Item label="Ngày">{fmtDate(drawerDoc.documentDate)}</Descriptions.Item>
            <Descriptions.Item label="Nơi gửi">{drawerDoc.sender || '—'}</Descriptions.Item>
            <Descriptions.Item label="Nơi nhận">{drawerDoc.receiver || '—'}</Descriptions.Item>
            <Descriptions.Item label="Trích yếu">{drawerDoc.summary}</Descriptions.Item>
            <Descriptions.Item label="Người xử lý">{drawerDoc.handler || '—'}</Descriptions.Item>
            <Descriptions.Item label="Hạn xử lý">
              {drawerDoc.deadline
                ? <span style={{ color: drawerDoc.isOverdue ? 'var(--a-rd-text)' : undefined, fontWeight: drawerDoc.isOverdue ? 700 : undefined }}>
                    {fmtDate(drawerDoc.deadline)}
                    {drawerDoc.isOverdue && ' — Quá hạn!'}
                  </span>
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <StatusBadge tone={STATUS_TONE[drawerDoc.status] || 'info'}>{drawerDoc.statusName}</StatusBadge>
            </Descriptions.Item>
            {drawerDoc.attachmentPath && (
              <Descriptions.Item label="File đính kèm">
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); openAttachment(drawerDoc.attachmentPath!); }}
                  style={{ color: 'var(--a-cy)' }}
                >
                  {drawerDoc.attachmentPath}
                </a>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}

        {drawerDoc && editMode && (
          <Form form={editForm} layout="vertical" scrollToFirstError>
            <Form.Item name="documentNumber" label="Số công văn" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="documentType" label="Loại" rules={[{ required: true }]}>
              <Select options={[{ value: 0, label: 'Công văn đến' }, { value: 1, label: 'Công văn đi' }]} />
            </Form.Item>
            <Form.Item name="documentDate" label="Ngày" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="sender" label="Nơi gửi (CV đến)">
              <Input />
            </Form.Item>
            <Form.Item name="receiver" label="Nơi nhận (CV đi)">
              <Input />
            </Form.Item>
            <Form.Item name="summary" label="Trích yếu" rules={[{ required: true }]}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="handler" label="Người xử lý">
              <Input />
            </Form.Item>
            <Form.Item name="deadline" label="Hạn xử lý">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái">
              <Select options={[
                { value: 0, label: 'Mới' }, { value: 1, label: 'Đang xử lý' },
                { value: 2, label: 'Hoàn thành' }, { value: 3, label: 'Lưu' },
              ]} />
            </Form.Item>
            <Form.Item name="attachmentPath" label="Đường dẫn file đính kèm">
              <Input />
            </Form.Item>
          </Form>
        )}
      </Drawer>

      <Modal
        open={modalOpen}
        title="Thêm công văn"
        onOk={submit}
        onCancel={() => setModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saving}
        destroyOnHidden
        width={520}
      >
        <Form form={form} layout="vertical" scrollToFirstError>
          <Form.Item name="documentNumber" label="Số công văn" rules={[{ required: true }]}>
            <Input placeholder="VD: 123/CV-SYT" />
          </Form.Item>
          <Form.Item name="documentType" label="Loại" rules={[{ required: true }]}>
            <Select options={[{ value: 0, label: 'Công văn đến' }, { value: 1, label: 'Công văn đi' }]} />
          </Form.Item>
          <Form.Item name="documentDate" label="Ngày" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="sender" label="Nơi gửi (CV đến)">
            <Input placeholder="Tên cơ quan gửi" />
          </Form.Item>
          <Form.Item name="receiver" label="Nơi nhận (CV đi)">
            <Input placeholder="Tên cơ quan nhận" />
          </Form.Item>
          <Form.Item name="summary" label="Trích yếu" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Nội dung tóm tắt" />
          </Form.Item>
          <Form.Item name="handler" label="Người xử lý">
            <Input placeholder="Họ tên người phụ trách" />
          </Form.Item>
          <Form.Item name="deadline" label="Hạn xử lý">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={[
              { value: 0, label: 'Mới' },
              { value: 1, label: 'Đang xử lý' },
              { value: 2, label: 'Hoàn thành' },
              { value: 3, label: 'Lưu' },
            ]} />
          </Form.Item>
          <Form.Item name="attachmentPath" label="Đường dẫn file đính kèm">
            <Input placeholder="/uploads/cong-van/..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OfficialDocumentsV2;
