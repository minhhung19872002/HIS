import React, { useEffect, useState } from 'react';
import { Input } from 'antd';
import {
  getDataPermissionGroups, saveDataPermissionGroup, deleteDataPermissionGroup,
  DATA_SCOPE_LABEL,
  type DataPermissionGroupDto, type DataPermissionItemDto, type DataScopeType,
} from '../api/dataPermission';
import {
  KpiStrip, DataTable, StatusBadge, Btn, ModalShell, AbSelect, tk, te, tw, cf,
  type ColumnDef,
} from '@/_v2kit';
import { friendlyErrorMessage } from '@/utils/friendlyError';

/* ──────────────────────────────────────────────────────────────────────────
   NangCap26 — I.15 Quyền dữ liệu phòng/kho · I.16 Phân quyền dữ liệu người dùng.

   Đây là ROW-LEVEL scope (thấy dữ liệu nào), KHÁC quyền chức năng (vào được màn
   nào) ở tab "Vai trò & quyền".

   ⚠️ Fail-open: người dùng chưa được gán nhóm nào ⇒ không bị giới hạn, thấy toàn bộ
   như trước. Chỉ khi CSYT chủ động gán nhóm thì phạm vi mới siết lại — tránh chặn
   nhầm dữ liệu lâm sàng ngay khi bật tính năng.
   ────────────────────────────────────────────────────────────────────────── */

const SCOPE_TYPES: DataScopeType[] = ['Department', 'Room', 'Warehouse', 'TreatmentType', 'PatientObject'];

/** Loại nào dùng ScopeId (chọn từ danh mục), loại nào dùng ScopeValue (nhập giá trị). */
const USES_ID: Record<string, boolean> = {
  Department: true, Room: true, Warehouse: true, TreatmentType: false, PatientObject: false,
};

interface Props {
  /** Danh mục khoa/phòng để chọn nhanh — truyền từ SystemAdmin (đã tải sẵn). */
  departments?: { id: string; name: string }[];
}

export const DataPermissionPanel: React.FC<Props> = ({ departments = [] }) => {
  const [groups, setGroups] = useState<DataPermissionGroupDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [form, setForm] = useState<{ id?: string; code: string; name: string; description?: string; isActive: boolean }>(
    { code: '', name: '', isActive: true },
  );
  const [items, setItems] = useState<DataPermissionItemDto[]>([]);

  const load = async () => {
    setLoading(true);
    try { setGroups((await getDataPermissionGroups()).data || []); }
    catch (e) { te(friendlyErrorMessage(e, 'Không tải được nhóm quyền dữ liệu')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const openCreate = () => {
    setForm({ code: '', name: '', isActive: true });
    setItems([]);
    setOpen(true);
  };

  const openEdit = (g: DataPermissionGroupDto) => {
    setForm({ id: g.id, code: g.code, name: g.name, description: g.description, isActive: g.isActive });
    setItems(g.items.map((i) => ({ ...i })));
    setOpen(true);
  };

  const submit = async () => {
    if (busy) return;
    if (!form.code.trim() || !form.name.trim()) { tw('Nhập mã và tên nhóm'); return; }
    setBusy(true);
    try {
      await saveDataPermissionGroup({ ...form, items });
      tk('Đã lưu nhóm quyền dữ liệu');
      setOpen(false);
      await load();
    } catch (e) {
      te(friendlyErrorMessage(e, 'Lưu thất bại'));
    } finally { setBusy(false); }
  };

  const remove = (g: DataPermissionGroupDto) => {
    if (removingId) return;
    cf(
      `Xóa nhóm quyền dữ liệu "${g.name}"? ${g.userCount} người dùng đang gán nhóm này sẽ không còn bị giới hạn phạm vi.`,
      async () => {
        setRemovingId(g.id);
        try { await deleteDataPermissionGroup(g.id); tk('Đã xóa nhóm'); await load(); }
        catch (e) { te(friendlyErrorMessage(e, 'Xóa thất bại')); }
        finally { setRemovingId(null); }
      },
      { tone: 'crit', confirm: 'Xóa' },
    );
  };

  const addItem = () => setItems((prev) => [...prev, { scopeType: 'Department' }]);
  const setItem = (idx: number, patch: Partial<DataPermissionItemDto>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const cols: ColumnDef<DataPermissionGroupDto>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.code },
    { key: 'name', label: 'Tên nhóm', render: (r) => r.name },
    { key: 'scope', label: 'Phạm vi', render: (r) => {
      if (r.items.length === 0) return <span style={{ color: 'var(--t-2)' }}>(chưa khai báo)</span>;
      const byType = SCOPE_TYPES
        .map((t) => ({ t, n: r.items.filter((i) => i.scopeType === t).length }))
        .filter((x) => x.n > 0);
      return byType.map((x) => `${DATA_SCOPE_LABEL[x.t]}: ${x.n}`).join(' · ');
    } },
    { key: 'users', label: 'Người dùng', mono: true, render: (r) => r.userCount },
    { key: 'st', label: 'Trạng thái', render: (r) => r.isActive
      ? <StatusBadge tone="ok">Đang dùng</StatusBadge>
      : <StatusBadge tone="warn">Ngưng</StatusBadge> },
    { key: 'act', label: '', render: (r) => (
      <span style={{ display: 'inline-flex', gap: 'var(--space-6)' }}>
        <Btn variant="ghost" onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); openEdit(r); }}>Sửa</Btn>
        <Btn variant="crit" loading={removingId === r.id} onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); remove(r); }}>Xóa</Btn>
      </span>
    ) },
  ];

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Nhóm quyền dữ liệu', val: groups.length, sub: 'đã khai báo' },
        { lbl: 'Đang dùng', val: groups.filter((g) => g.isActive).length, sub: 'nhóm', tone: 'ok' },
        { lbl: 'Lượt gán user', val: groups.reduce((s, g) => s + g.userCount, 0), sub: 'người dùng', tone: 'info' },
        { lbl: 'Dòng phạm vi', val: groups.reduce((s, g) => s + g.items.length, 0), sub: 'khoa/kho/loại ĐT' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
          Quyền <b>dữ liệu</b> (thấy dữ liệu nào) — khác quyền <b>chức năng</b> ở tab “Vai trò &amp; quyền”.
          Người dùng chưa gán nhóm nào thì <b>không bị giới hạn</b>.
        </span>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Thêm nhóm</Btn>
      </div>

      <DataTable<DataPermissionGroupDto>
        columns={cols} data={groups} rowKey={(r) => r.id}
        empty={loading ? 'Đang tải…' : 'Chưa khai báo nhóm quyền dữ liệu nào'}
      />

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={form.id ? 'Sửa nhóm quyền dữ liệu' : 'Thêm nhóm quyền dữ liệu'}
        footer={<>
          <Btn variant="ghost" onClick={() => setOpen(false)}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>{busy ? 'Đang lưu…' : 'Lưu'}</Btn>
        </>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-12)' }}>
          <label style={{ display: 'grid', gap: 'var(--space-4)', fontSize: 'var(--fs-sm)' }}>
            Mã nhóm *
            <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="VD: KHOA_NOI" />
          </label>
          <label style={{ display: 'grid', gap: 'var(--space-4)', fontSize: 'var(--fs-sm)' }}>
            Tên nhóm *
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="VD: Dữ liệu khoa Nội" />
          </label>
        </div>
        <label style={{ display: 'grid', gap: 'var(--space-4)', fontSize: 'var(--fs-sm)', marginTop: 'var(--space-12)' }}>
          Mô tả
          <Input value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </label>

        <div style={{ marginTop: 'var(--space-16)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
            <b style={{ fontSize: 'var(--fs-sm)' }}>Phạm vi dữ liệu ({items.length})</b>
            <span className="spacer" />
            <Btn variant="ghost" icon="plus" onClick={addItem}>Thêm phạm vi</Btn>
          </div>

          {items.length === 0 && (
            <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
              Chưa có dòng phạm vi — nhóm rỗng sẽ không cho thấy dữ liệu nào khi được gán.
            </div>
          )}

          {items.map((it, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 32px', gap: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
              <AbSelect
                value={it.scopeType}
                onChange={(v) => setItem(idx, { scopeType: v as DataScopeType, scopeId: undefined, scopeValue: undefined, scopeName: undefined })}
                options={SCOPE_TYPES.map((t) => ({ value: t, label: DATA_SCOPE_LABEL[t] }))}
              />
              {USES_ID[it.scopeType] && it.scopeType === 'Department' ? (
                <AbSelect
                  value={it.scopeId || ''}
                  onChange={(v) => setItem(idx, { scopeId: v, scopeName: departments.find((d) => d.id === v)?.name })}
                  options={departments.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder="Chọn khoa/phòng"
                />
              ) : USES_ID[it.scopeType] ? (
                <Input
                  value={it.scopeId || ''}
                  onChange={(e) => setItem(idx, { scopeId: e.target.value })}
                  placeholder={`ID ${DATA_SCOPE_LABEL[it.scopeType as DataScopeType] || it.scopeType}`}
                />
              ) : (
                <Input
                  value={it.scopeValue || ''}
                  onChange={(e) => setItem(idx, { scopeValue: e.target.value })}
                  placeholder={it.scopeType === 'TreatmentType' ? 'VD: 1 (ngoại trú) / 2 (nội trú)' : 'VD: BHYT / Viện phí / Dịch vụ'}
                />
              )}
              <Btn variant="crit" icon="x" onClick={() => removeItem(idx)}>{''}</Btn>
            </div>
          ))}
        </div>
      </ModalShell>
    </>
  );
};

export default DataPermissionPanel;
