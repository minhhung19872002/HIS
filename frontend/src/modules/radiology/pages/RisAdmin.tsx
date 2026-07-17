import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, Switch, DatePicker, Checkbox } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../../../services/apiClient';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import {
  KpiStrip, TopTabs, Filter, SearchBox, DataTable, StatusBadge, ActBtn, Btn,
  ModalShell, DrawerShell, DrSec, DrField, Ico, tk, tw, cf,
  type ColumnDef,
} from '../../../pages-v2/_v2kit';
import { getRemoteServers, saveRemoteServer, deleteRemoteServer } from '../api/ris/pacs';
import { getTags, saveTag, type RadiologyTagDto } from '../api/ris/label-tag-qr';

const { RangePicker } = DatePicker;

const PERMISSION_FLAGS: Array<{ flag: number; label: string }> = [
  { flag: 0x0001, label: 'Chỉ xem' }, { flag: 0x0002, label: 'Xóa ca chụp' },
  { flag: 0x0004, label: 'Đọc & trả KQ' }, { flag: 0x0008, label: 'Cập nhật từ HIS' },
  { flag: 0x0010, label: 'Duyệt KQ' }, { flag: 0x0020, label: 'Chia sẻ' },
  { flag: 0x0040, label: 'Hội chẩn' }, { flag: 0x0080, label: 'Thống kê' },
  { flag: 0x0100, label: 'Hủy hội chẩn' }, { flag: 0x0200, label: 'Hủy duyệt' },
  { flag: 0x0400, label: 'Chỉnh sửa KQ đã duyệt' },
];
const ROLE_TEMPLATES: Record<string, number> = {
  chup: 0x0001,
  doc: 0x0001 | 0x0004 | 0x0010 | 0x0040,
  truongkhoa: 0x0001 | 0x0004 | 0x0010 | 0x0040 | 0x0080 | 0x0200,
  admin: 0x07FF,
};

interface PermissionRow { id: string; roomId?: string; roomName: string; modalityType?: string; permissions: number; roleTemplate?: string }
interface User { id: string; fullName: string; username: string }
interface Area { id: string; areaCode: string; areaName: string; address?: string; isActive: boolean }
interface FolderRow { id: string; folderName: string; folderType: number; areaName?: string; sortOrder: number }
interface Room { id: string; roomName: string; modalityType?: string; departmentName?: string }
interface Stat { label: string; value: number }

type Tab = 'permissions' | 'areas' | 'folders' | 'icdMap' | 'machines' | 'supplies' | 'hospital' | 'stats' | 'modalityPerm' | 'remotePacs' | 'tags';
const TABS = [
  { v: 'permissions' as Tab,  l: 'Phân quyền',        ic: 'user' },
  { v: 'modalityPerm' as Tab, l: 'Quyền theo máy',    ic: 'user' },
  { v: 'areas' as Tab,        l: 'Khu vực / CN',      ic: 'archive' },
  { v: 'folders' as Tab,      l: 'Thư mục',           ic: 'archive' },
  { v: 'icdMap' as Tab,       l: 'ICD ↔ Mẫu',         ic: 'file-text' },
  { v: 'machines' as Tab,     l: 'Máy chụp',          ic: 'qr' },
  { v: 'supplies' as Tab,     l: 'Vật tư',            ic: 'medicine' },
  { v: 'hospital' as Tab,     l: 'Cấu hình BV',       ic: 'edit' },
  { v: 'remotePacs' as Tab,   l: 'Remote PACS',       ic: 'cloud' },
  { v: 'tags' as Tab,         l: 'Quản lý Tag',       ic: 'star' },
  { v: 'stats' as Tab,        l: 'Thống kê',          ic: 'activity' },
];

const RisAdminV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('permissions');
  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Đang xem', val: TABS.find((t) => t.v === tab)?.l || '—', sub: 'admin RIS', tone: 'info' },
        { lbl: 'Module', val: 'RIS/PACS', sub: 'admin panel', tone: 'ok' },
        { lbl: 'Quyền', val: '4-eyes', sub: 'role-based', tone: 'warn' },
        { lbl: 'Sub-tabs', val: TABS.length, sub: 'mục cấu hình' },
      ]} />
      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} />
      {tab === 'permissions' && <PermissionsTab />}
      {tab === 'modalityPerm' && <ModalityPermTab />}
      {tab === 'areas' && <AreasTab />}
      {tab === 'folders' && <FoldersTab />}
      {tab === 'icdMap' && <IcdMapTab />}
      {tab === 'machines' && <MachinesTab />}
      {tab === 'supplies' && <SuppliesTab />}
      {tab === 'hospital' && <HospitalConfigTab />}
      {tab === 'remotePacs' && <RemotePacsTab />}
      {tab === 'tags' && <TagsTab />}
      {tab === 'stats' && <StatsTab />}
    </div>
  );
};

const PermissionsTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; roomName: string }>>([]);
  const [editModal, setEditModal] = useState(false);
  const [copyModal, setCopyModal] = useState(false);
  const [sel, setSel] = useState<PermissionRow | null>(null);
  const [editForm] = Form.useForm<{ roomId?: string; roleTemplate?: string; permissions: number[] }>();
  const [copyForm] = Form.useForm<{ fromUserId: string }>();

  useEffect(() => {
    (async () => {
      try {
        const [u, r] = await Promise.all([
          apiClient.get<{ items?: User[] } | User[]>('/admin/users', { params: { pageSize: 200 } }).catch(() => ({ data: [] })),
          apiClient.get<Array<{ id: string; roomName: string }>>('/RISComplete/rooms', { params: { roomType: 'radiology' } }).catch(() => ({ data: [] })),
        ]);
        setUsers(normalizeArrayResponse<User>(u.data));
        setRooms(r.data);
      } catch { /* empty */ }
    })();
  }, []);

  const loadPerms = useCallback(async (uid: string) => {
    try { const res = await apiClient.get<PermissionRow[]>(`/radiology-dispatch/permissions/user/${uid}`); setPermissions(res.data); }
    catch { setPermissions([]); }
  }, []);

  useEffect(() => { if (selectedUserId) loadPerms(selectedUserId); }, [selectedUserId, loadPerms]);

  const submit = async () => {
    try {
      const v = await editForm.validateFields();
      const permInt = v.permissions?.reduce((acc, f) => acc | f, 0) ?? 0;
      await apiClient.post('/radiology-dispatch/permissions', {
        userId: selectedUserId, roomId: v.roomId || null, roleTemplate: v.roleTemplate, permissions: permInt,
      });
      tk('Đã lưu quyền'); setEditModal(false); editForm.resetFields();
      if (selectedUserId) loadPerms(selectedUserId);
    } catch { tw('Lưu thất bại'); }
  };

  const copy = async () => {
    const v = await copyForm.validateFields();
    if (!selectedUserId) return;
    try {
      await apiClient.post('/radiology-dispatch/permissions/copy', null, {
        params: { fromUserId: v.fromUserId, toUserId: selectedUserId },
      });
      tk('Đã copy quyền'); setCopyModal(false); copyForm.resetFields(); loadPerms(selectedUserId);
    } catch { tw('Copy thất bại'); }
  };

  const remove = (r: PermissionRow) => cf('Xóa quyền này?', async () => {
    await apiClient.delete(`/radiology-dispatch/permissions/${r.id}`); tk('Đã xóa');
    if (selectedUserId) loadPerms(selectedUserId);
  }, { tone: 'crit', confirm: 'Xóa' });

  const cols: ColumnDef<PermissionRow>[] = [
    { key: 'room', label: 'Máy chụp', render: (r) => r.roomName },
    { key: 'mod', label: 'Loại', render: (r) => r.modalityType || '—' },
    { key: 'role', label: 'Role', render: (r) => r.roleTemplate ? <StatusBadge tone="info">{r.roleTemplate}</StatusBadge> : '—' },
    { key: 'flags', label: 'Quyền', render: (r) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        {PERMISSION_FLAGS.filter((f) => (r.permissions & f.flag) !== 0).map((f) => (
          <StatusBadge key={f.flag} tone="info">{f.label}</StatusBadge>
        ))}
      </div>
    ) },
  ];

  return (
    <>
      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Người dùng:</span>
        <Filter value={selectedUserId} onChange={setSelectedUserId}
          options={users.map((u) => ({ v: u.id, l: `${u.fullName} (${u.username})` }))}
          placeholder="▾ Chọn BS / KTV" />
        <Btn variant="primary" disabled={!selectedUserId} onClick={() => {
          editForm.resetFields(); editForm.setFieldsValue({ permissions: [0x0001] }); setEditModal(true);
        }}>
          <Ico name="plus" size={12} /> Thêm quyền
        </Btn>
        <Btn disabled={!selectedUserId} onClick={() => { copyForm.resetFields(); setCopyModal(true); }}>
          <Ico name="archive" size={12} /> Copy từ user khác
        </Btn>
      </div>
      <DataTable<PermissionRow> columns={cols} data={permissions} rowKey={(r) => r.id}
        onRowClick={setSel}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => remove(r)} />
          </div>
        )}
        empty={selectedUserId ? 'User này chưa có quyền' : 'Chọn người dùng để xem quyền'}
      />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `Quyền · ${sel.roomName}` : ''}
        sub={sel ? (sel.modalityType || '—') : ''}
      >
        {sel && <>
          <DrSec title="Phạm vi">
            <DrField lbl="Máy chụp">{sel.roomName}</DrField>
            <DrField lbl="Loại máy">{sel.modalityType || '—'}</DrField>
            <DrField lbl="Role">{sel.roleTemplate ? <StatusBadge tone="info">{sel.roleTemplate}</StatusBadge> : '—'}</DrField>
          </DrSec>
          <DrSec title="Quyền chi tiết">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
              {PERMISSION_FLAGS.filter((f) => (sel.permissions & f.flag) !== 0).map((f) => (
                <StatusBadge key={f.flag} tone="info">{f.label}</StatusBadge>
              ))}
              {PERMISSION_FLAGS.filter((f) => (sel.permissions & f.flag) !== 0).length === 0 && '—'}
            </div>
          </DrSec>
        </>}
      </DrawerShell>

      <ModalShell open={editModal} onClose={() => setEditModal(false)} size="lg" title="Phân quyền"
        footer={<>
          <Btn variant="ghost" onClick={() => setEditModal(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={submit}><Ico name="check" size={12} /> Lưu</Btn>
        </>}>
        <Form form={editForm} layout="vertical">
          <Form.Item name="roomId" label="Máy chụp (bỏ trống = áp dụng mọi máy)">
            <Select allowClear options={rooms.map((r) => ({ value: r.id, label: r.roomName }))} />
          </Form.Item>
          <Form.Item name="roleTemplate" label="Template role (apply preset)">
            <Select allowClear onChange={(val: string) => {
              if (val && ROLE_TEMPLATES[val]) {
                const flags = PERMISSION_FLAGS.filter((f) => (ROLE_TEMPLATES[val] & f.flag) !== 0).map((f) => f.flag);
                editForm.setFieldValue('permissions', flags);
              }
            }} options={[
              { value: 'chup', label: 'KTV Chụp (chỉ xem)' },
              { value: 'doc', label: 'BS Đọc (xem + đọc + duyệt + hội chẩn)' },
              { value: 'truongkhoa', label: 'Trưởng khoa (+ thống kê + hủy duyệt)' },
              { value: 'admin', label: 'Admin RIS (tất cả)' },
            ]} />
          </Form.Item>
          <Form.Item name="permissions" label="Quyền chi tiết">
            <Checkbox.Group options={PERMISSION_FLAGS.map((f) => ({ value: f.flag, label: f.label }))}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }} />
          </Form.Item>
        </Form>
      </ModalShell>

      <ModalShell open={copyModal} onClose={() => setCopyModal(false)} size="md" title="Copy quyền từ user khác"
        footer={<>
          <Btn variant="ghost" onClick={() => setCopyModal(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={copy}><Ico name="check" size={12} /> Copy</Btn>
        </>}>
        <Form form={copyForm} layout="vertical">
          <Form.Item name="fromUserId" label="Copy từ user" rules={[{ required: true }]}>
            <Select showSearch placeholder="Chọn user mẫu" optionFilterProp="label"
              options={users.map((u) => ({ value: u.id, label: `${u.fullName} (${u.username})` }))} />
          </Form.Item>
        </Form>
      </ModalShell>
    </>
  );
};

const AreasTab: React.FC = () => {
  const [data, setData] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [sel, setSel] = useState<Area | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await apiClient.get<Area[]>('/ris-catalog/areas'); setData(res.data || []); }
    catch { setData([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    try {
      const v = await form.validateFields();
      await apiClient.post('/ris-catalog/areas', v); tk('Đã lưu'); setModal(false); load();
    } catch { tw('Lưu thất bại'); }
  };

  const cols: ColumnDef<Area>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.areaCode },
    { key: 'name', label: 'Tên khu vực', render: (r) => r.areaName },
    { key: 'addr', label: 'Địa chỉ', render: (r) => r.address || '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => r.isActive ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge> : <StatusBadge tone="warn" dot>Dừng</StatusBadge> },
  ];

  return (
    <>
      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <span className="spacer" />
        <Btn variant="primary" onClick={() => { form.resetFields(); setModal(true); }}>
          <Ico name="plus" size={12} /> Thêm khu vực
        </Btn>
      </div>
      <DataTable<Area> columns={cols} data={data} rowKey={(r) => r.id}
        onRowClick={setSel}
        empty={loading ? 'Đang tải…' : 'Chưa có khu vực'} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `Khu vực · ${sel.areaName}` : ''}
        sub={sel ? sel.areaCode : ''}
      >
        {sel && <>
          <DrSec title="Thông tin">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.areaCode}</span></DrField>
            <DrField lbl="Tên">{sel.areaName}</DrField>
            <DrField lbl="Địa chỉ">{sel.address || '—'}</DrField>
            <DrField lbl="Trạng thái">
              {sel.isActive ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge> : <StatusBadge tone="warn" dot>Dừng</StatusBadge>}
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>

      <ModalShell open={modal} onClose={() => setModal(false)} size="md" title="Thêm khu vực / chi nhánh"
        footer={<>
          <Btn variant="ghost" onClick={() => setModal(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={submit}><Ico name="check" size={12} /> Lưu</Btn>
        </>}>
        <Form form={form} layout="vertical">
          <Form.Item name="areaCode" label="Mã" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="areaName" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="address" label="Địa chỉ"><Input /></Form.Item>
        </Form>
      </ModalShell>
    </>
  );
};

const FOLDER_TYPES: Record<number, string> = { 1: 'Normal', 2: 'Share', 3: 'Upload' };
const FoldersTab: React.FC = () => {
  const [data, setData] = useState<FolderRow[]>([]);
  const [modal, setModal] = useState(false);
  const [sel, setSel] = useState<FolderRow | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try { const res = await apiClient.get<FolderRow[]>('/ris-catalog/folders'); setData(res.data || []); }
    catch { setData([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    try {
      const v = await form.validateFields();
      await apiClient.post('/ris-catalog/folders', v); tk('Đã lưu'); setModal(false); load();
    } catch { tw('Lưu thất bại'); }
  };

  const cols: ColumnDef<FolderRow>[] = [
    { key: 'name', label: 'Tên thư mục', render: (r) => r.folderName },
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone={r.folderType === 1 ? 'info' : r.folderType === 2 ? 'warn' : 'crit'}>
        {FOLDER_TYPES[r.folderType] || '—'}
      </StatusBadge>
    ) },
    { key: 'area', label: 'Khu vực', render: (r) => r.areaName || '—' },
    { key: 'sort', label: 'STT', mono: true, render: (r) => r.sortOrder },
  ];

  return (
    <>
      <div style={{ padding: 'var(--space-12)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4, margin: 'var(--space-12)', fontSize: 'var(--fs-sm)' }}>
        <Ico name="info" size={12} /> <b>Thư mục cấp 2</b> — Normal (STT bình thường), Share (STT=900), Upload (STT=950)
      </div>
      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <span className="spacer" />
        <Btn variant="primary" onClick={() => { form.resetFields(); setModal(true); }}>
          <Ico name="plus" size={12} /> Thêm thư mục
        </Btn>
      </div>
      <DataTable<FolderRow> columns={cols} data={data} rowKey={(r) => r.id} onRowClick={setSel} empty="Chưa có thư mục" />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `Thư mục · ${sel.folderName}` : ''}
        sub={sel ? (FOLDER_TYPES[sel.folderType] || '—') : ''}
      >
        {sel && <>
          <DrSec title="Thông tin">
            <DrField lbl="Tên">{sel.folderName}</DrField>
            <DrField lbl="Loại">
              <StatusBadge tone={sel.folderType === 1 ? 'info' : sel.folderType === 2 ? 'warn' : 'crit'}>
                {FOLDER_TYPES[sel.folderType] || '—'}
              </StatusBadge>
            </DrField>
            <DrField lbl="Khu vực">{sel.areaName || '—'}</DrField>
            <DrField lbl="STT"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.sortOrder}</span></DrField>
          </DrSec>
        </>}
      </DrawerShell>

      <ModalShell open={modal} onClose={() => setModal(false)} size="md" title="Thêm thư mục"
        footer={<>
          <Btn variant="ghost" onClick={() => setModal(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={submit}><Ico name="check" size={12} /> Lưu</Btn>
        </>}>
        <Form form={form} layout="vertical">
          <Form.Item name="folderName" label="Tên thư mục" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="folderType" label="Loại" rules={[{ required: true }]}>
            <Select options={[
              { value: 1, label: 'Normal (STT bình thường)' },
              { value: 2, label: 'Share (STT=900)' },
              { value: 3, label: 'Upload (STT=950)' },
            ]} />
          </Form.Item>
          <Form.Item name="sortOrder" label="STT"><InputNumber /></Form.Item>
        </Form>
      </ModalShell>
    </>
  );
};

const IcdMapTab: React.FC = () => (
  <div style={{ padding: 'var(--space-24)' }}>
    <div className="panel" style={{ padding: 0 }}>
      <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
        <span>ICD ↔ Mẫu kết quả</span>
      </div>
      <div style={{ padding: 'var(--space-16)' }}>
        <div style={{ fontSize: 'var(--fs-md)', color: 'var(--t-1)', marginBottom: 'var(--space-12)' }}>
          Khi BS đọc KQ CĐHA, hệ thống tự tìm mẫu phù hợp với ICD chỉ định.
        </div>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)', marginBottom: 'var(--space-16)' }}>
          Để quản lý mẫu, vào <b>Danh mục → Viết tắt + Template</b> → Tab "Template lâm sàng" → Filter loại "Kết luận khám mẫu"
        </div>
        <Btn variant="primary" onClick={() => window.open('/v2/catalogs-admin', '_blank')}>
          <Ico name="archive" size={12} /> Mở trang quản lý template
        </Btn>
      </div>
    </div>
    <div className="panel" style={{ padding: 0, marginTop: 'var(--space-16)' }}>
      <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
        <span>Mapping mẫu (demo)</span>
      </div>
      <table className="ab-tbl">
        <thead><tr><th>ICD</th><th>Tên bệnh</th><th>Số mẫu</th></tr></thead>
        <tbody>
          <tr><td className="mono">J18.9</td><td>Viêm phổi</td><td className="mono">2</td></tr>
          <tr><td className="mono">I10</td><td>THA vô căn</td><td className="mono">1</td></tr>
          <tr><td className="mono">E11</td><td>ĐTĐ type 2</td><td className="mono">3</td></tr>
        </tbody>
      </table>
    </div>
  </div>
);

const MachinesTab: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sel, setSel] = useState<Room | null>(null);
  useEffect(() => {
    apiClient.get<Room[]>('/RISComplete/rooms', { params: { roomType: 'radiology' } })
      .then((r) => setRooms(r.data)).catch(() => setRooms([]));
  }, []);

  const cols: ColumnDef<Room>[] = [
    { key: 'name', label: 'Phòng / Máy', render: (r) => <b>{r.roomName}</b> },
    { key: 'mod', label: 'Loại', render: (r) => r.modalityType ? <StatusBadge tone="info">{r.modalityType}</StatusBadge> : '—' },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
  ];

  return (
    <>
      <div style={{ padding: 'var(--space-12)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4, margin: 'var(--space-12)', fontSize: 'var(--fs-sm)' }}>
        <Ico name="info" size={12} /> <b>Cấu hình máy chụp + gán mẫu kết quả</b> — Mỗi máy chụp có thể gán với 1 hoặc nhiều mẫu kết quả đặc trưng.
      </div>
      <DataTable<Room> columns={cols} data={rooms} rowKey={(r) => r.id}
        onRowClick={setSel}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="edit" title="Cấu hình mẫu" onClick={() => window.open(`/v2/radiology?config=${r.id}`, '_blank')} />
          </div>
        )}
        empty="Chưa có máy chụp" />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `Máy chụp · ${sel.roomName}` : ''}
        sub={sel ? (sel.modalityType || '—') : ''}
      >
        {sel && <>
          <DrSec title="Thông tin">
            <DrField lbl="Phòng / Máy">{sel.roomName}</DrField>
            <DrField lbl="Loại">{sel.modalityType ? <StatusBadge tone="info">{sel.modalityType}</StatusBadge> : '—'}</DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
          </DrSec>
          <DrSec title="Thao tác">
            <Btn variant="primary" onClick={() => window.open(`/v2/radiology?config=${sel.id}`, '_blank')}>
              <Ico name="edit" size={12} /> Cấu hình mẫu kết quả
            </Btn>
          </DrSec>
        </>}
      </DrawerShell>
    </>
  );
};

const SuppliesTab: React.FC = () => (
  <div style={{ padding: 'var(--space-24)' }}>
    <div className="panel" style={{ padding: 0 }}>
      <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
        <span>Vật tư y tế cho CĐHA</span>
      </div>
      <div style={{ padding: 'var(--space-16)' }}>
        <div style={{ fontSize: 'var(--fs-md)', color: 'var(--t-1)', marginBottom: 'var(--space-12)' }}>
          Vật tư chuyên dụng cho CĐHA: thuốc cản quang, gel siêu âm, phim X-quang…
        </div>
        <Btn variant="primary" onClick={() => window.open('/v2/medical-supply?type=radiology', '_blank')}>
          <Ico name="medicine" size={12} /> Mở Medical Supply (filter CĐHA)
        </Btn>
      </div>
    </div>
  </div>
);

const HospitalConfigTab: React.FC = () => {
  const [form] = Form.useForm();
  useEffect(() => {
    apiClient.get('/admin/hospital-config').then(({ data }) => {
      form.setFieldsValue(data as Record<string, unknown>);
    }).catch((e) => { console.warn('[async] tải dữ liệu phụ thất bại:', e); });
  }, [form]);

  const submit = async (values: Record<string, unknown>) => {
    try { await apiClient.post('/admin/hospital-config', values); tk('Đã lưu'); }
    catch { tw('Lưu thất bại'); }
  };

  return (
    <div style={{ padding: 'var(--space-24)', maxWidth: 720 }}>
      <div className="panel" style={{ padding: 0 }}>
        <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
          <span>Cấu hình bệnh viện</span>
        </div>
        <div style={{ padding: 'var(--space-20)' }}>
          <Form form={form} layout="vertical" onFinish={submit}>
            <Form.Item name="hospitalName" label="Tên bệnh viện" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="address" label="Địa chỉ"><Input /></Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
              <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
              <Form.Item name="email" label="Email"><Input /></Form.Item>
            </div>
            <Form.Item name="website" label="Website"><Input /></Form.Item>
            <Form.Item name="logoUrl" label="Logo URL (header RIS)"><Input /></Form.Item>
            <Form.Item name="reportFooter" label="Footer phiếu KQ">
              <Input.TextArea rows={3} placeholder="Mô tả cuối phiếu in KQ…" />
            </Form.Item>
            <Btn type="submit" variant="primary">
              <Ico name="check" size={12} /> Lưu cấu hình
            </Btn>
          </Form>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// #409 batch — Remote PACS (remote-DICOM config, port verbatim từ pages/Radiology.tsx
// RemoteServerRow/drawer+modal, chỉ đổi UI shell sang DataTable+ModalShell/_v2kit)
// ─────────────────────────────────────────────────────────────────────────────
interface RemoteServerRow {
  id: string;
  name: string;
  aeTitle: string;
  host: string;
  port: number;
  description?: string;
  isActive?: boolean;
}

const RemotePacsTab: React.FC = () => {
  const [servers, setServers] = useState<RemoteServerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<RemoteServerRow | null>(null);
  const [sel, setSel] = useState<RemoteServerRow | null>(null);
  const [form] = Form.useForm<RemoteServerRow>();

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await getRemoteServers(); setServers((res.data as RemoteServerRow[]) || []); }
    catch { setServers([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null); form.resetFields();
    form.setFieldsValue({ port: 4242, isActive: true } as RemoteServerRow);
    setModal(true);
  };
  const openEdit = (r: RemoteServerRow) => { setEditing(r); form.setFieldsValue(r); setModal(true); };

  const submit = async () => {
    try {
      const v = await form.validateFields();
      await saveRemoteServer({ ...v, id: editing?.id });
      tk(editing ? 'Đã cập nhật server' : 'Đã thêm server'); setModal(false); load();
    } catch { tw('Lưu thất bại'); }
  };

  const remove = (r: RemoteServerRow) => cf(`Xóa server "${r.name}"?`, async () => {
    await deleteRemoteServer(r.id); tk('Đã xóa'); load();
  }, { tone: 'crit', confirm: 'Xóa' });

  const cols: ColumnDef<RemoteServerRow>[] = [
    { key: 'name', label: 'Tên server', render: (r) => <b>{r.name}</b> },
    { key: 'ae', label: 'AE Title', code: true, render: (r) => r.aeTitle },
    { key: 'host', label: 'Host / IP', mono: true, render: (r) => r.host },
    { key: 'port', label: 'Port', mono: true, render: (r) => r.port },
    { key: 'active', label: 'Trạng thái', render: (r) => r.isActive !== false ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge> : <StatusBadge tone="warn" dot>Tắt</StatusBadge> },
  ];

  return (
    <>
      <div style={{ padding: 'var(--space-12)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4, margin: 'var(--space-12)', fontSize: 'var(--fs-sm)' }}>
        <Ico name="info" size={12} /> Quản lý các PACS server từ xa để gửi ảnh DICOM (C-STORE). Cấu hình AE Title, host, port cho từng server.
      </div>
      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <span className="spacer" />
        <Btn variant="primary" onClick={openAdd}>
          <Ico name="plus" size={12} /> Thêm server
        </Btn>
      </div>
      <DataTable<RemoteServerRow> columns={cols} data={servers} rowKey={(r) => r.id}
        onRowClick={setSel}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
            <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => remove(r)} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : 'Chưa có Remote PACS server'} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `Remote PACS · ${sel.name}` : ''}
        sub={sel ? sel.aeTitle : ''}
      >
        {sel && <>
          <DrSec title="Thông tin kết nối">
            <DrField lbl="Tên server">{sel.name}</DrField>
            <DrField lbl="AE Title"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.aeTitle}</span></DrField>
            <DrField lbl="Host / IP">{sel.host}</DrField>
            <DrField lbl="Port">{sel.port}</DrField>
            <DrField lbl="Mô tả">{sel.description || '—'}</DrField>
            <DrField lbl="Trạng thái">
              {sel.isActive !== false ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge> : <StatusBadge tone="warn" dot>Tắt</StatusBadge>}
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>

      <ModalShell open={modal} onClose={() => setModal(false)} size="md"
        title={editing ? `Sửa Remote PACS Server` : 'Thêm Remote PACS Server'}
        footer={<>
          <Btn variant="ghost" onClick={() => setModal(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={submit}><Ico name="check" size={12} /> Lưu</Btn>
        </>}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên server" rules={[{ required: true, message: 'Vui lòng nhập tên server' }]}>
            <Input placeholder="VD: PACS Bệnh viện tỉnh" />
          </Form.Item>
          <Form.Item name="aeTitle" label="AE Title" rules={[{ required: true, message: 'Vui lòng nhập AE Title' }]}>
            <Input placeholder="VD: REMOTE_PACS" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-12)' }}>
            <Form.Item name="host" label="Host / IP" rules={[{ required: true, message: 'Vui lòng nhập host' }]}>
              <Input placeholder="VD: 192.168.1.100" />
            </Form.Item>
            <Form.Item name="port" label="Port" rules={[{ required: true, message: 'Vui lòng nhập port' }]}>
              <InputNumber min={1} max={65535} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Ghi chú thêm về server này…" />
          </Form.Item>
          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue={true}>
            <Checkbox>Hoạt động</Checkbox>
          </Form.Item>
        </Form>
      </ModalShell>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// #409 batch — Quản lý Tag (case-tag CRUD, port verbatim từ pages/Radiology.tsx
// tab "tags": search + list badge màu + modal "Thêm Tag mới". v1 KHÔNG có
// sửa/xóa định nghĩa tag → giữ nguyên phạm vi, không thêm logic mới.
// ─────────────────────────────────────────────────────────────────────────────
const TAG_COLOR_OPTIONS = [
  { value: 'red', label: 'Đỏ' }, { value: 'orange', label: 'Cam' },
  { value: 'blue', label: 'Xanh dương' }, { value: 'green', label: 'Xanh lá' },
  { value: 'purple', label: 'Tím' }, { value: 'cyan', label: 'Cyan' },
];

const TagsTab: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [tags, setTags] = useState<RadiologyTagDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await getTags(keyword || undefined); setTags(res.data || []); }
    catch { setTags([]); }
    finally { setLoading(false); }
  }, [keyword]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    try {
      const v = await form.validateFields();
      await saveTag({ code: v.code, name: v.name, color: v.color || 'blue', description: v.description, isActive: v.isActive !== false });
      tk('Đã tạo tag mới'); setModal(false); form.resetFields(); load();
    } catch { tw('Tạo tag thất bại'); }
  };

  return (
    <>
      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm tag…" />
        <span className="spacer" />
        <Btn variant="primary" onClick={() => { form.resetFields(); setModal(true); }}>
          <Ico name="plus" size={12} /> Thêm Tag mới
        </Btn>
      </div>
      <div style={{ padding: 'var(--space-16)' }}>
        <div style={{ padding: 'var(--space-12)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4, marginBottom: 'var(--space-16)', fontSize: 'var(--fs-sm)' }}>
          <Ico name="info" size={12} /> Tạo và quản lý các tag để phân loại, đánh dấu ca chụp. Hỗ trợ gắn nhiều tag cho một ca.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-8)' }}>
          {loading && <span style={{ color: 'var(--t-3)' }}>Đang tải…</span>}
          {!loading && tags.length === 0 && <span style={{ color: 'var(--t-3)' }}>Chưa có tag nào</span>}
          {!loading && tags.map((t) => (
            <StatusBadge key={t.id} tone="info">{t.name}</StatusBadge>
          ))}
        </div>
      </div>

      <ModalShell open={modal} onClose={() => setModal(false)} size="sm" title="Thêm Tag mới"
        footer={<>
          <Btn variant="ghost" onClick={() => setModal(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={submit}><Ico name="check" size={12} /> Lưu</Btn>
        </>}>
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Mã tag" rules={[{ required: true, message: 'Vui lòng nhập mã tag' }]}>
            <Input placeholder="Nhập mã tag" />
          </Form.Item>
          <Form.Item name="name" label="Tên tag" rules={[{ required: true, message: 'Vui lòng nhập tên tag' }]}>
            <Input placeholder="Nhập tên tag" />
          </Form.Item>
          <Form.Item name="color" label="Màu sắc">
            <Select placeholder="Chọn màu" options={TAG_COLOR_OPTIONS} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Nhập mô tả (không bắt buộc)" />
          </Form.Item>
          <Form.Item name="isActive" label="Kích hoạt" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </ModalShell>
    </>
  );
};

const StatsTab: React.FC = () => {
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>([dayjs().subtract(7, 'day'), dayjs()]);
  const [stats, setStats] = useState<Stat[]>([]);

  const load = useCallback(async () => {
    try {
      const params = range ? { fromDate: range[0].toISOString(), toDate: range[1].toISOString() } : {};
      const res = await apiClient.get<Stat[]>('/radiology-dispatch/stats', { params });
      setStats(res.data);
    } catch { setStats([]); }
  }, [range]);
  useEffect(() => { load(); }, [load]);

  const cols: ColumnDef<Stat>[] = [
    { key: 'lbl', label: 'Chỉ số', render: (r) => <b>{r.label}</b> },
    { key: 'val', label: 'Số lượng', mono: true, render: (r) => r.value.toLocaleString('vi-VN') },
  ];

  const data = stats.length > 0 ? stats : [
    { label: 'Tổng ca chụp', value: 0 },
    { label: 'Đã trả KQ', value: 0 },
    { label: 'Chờ đọc', value: 0 },
    { label: 'Hội chẩn', value: 0 },
  ];

  return (
    <>
      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Khoảng thời gian:</span>
        <RangePicker value={range} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
        <Btn variant="ghost" onClick={() => setRange([dayjs().subtract(7, 'day'), dayjs()])}>
          <Ico name="x" size={12} /> 7 ngày
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={() => window.open('/v2/reports?tab=radiology', '_blank')}>
          <Ico name="archive" size={12} /> Reports đầy đủ
        </Btn>
      </div>
      <DataTable<Stat> columns={cols} data={data} rowKey={(r) => r.label} />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// G-36 — Tab "Quyền theo máy": matrix user × modality × Đọc KQ / Duyệt KQ
// ─────────────────────────────────────────────────────────────────────────────
interface ModalityRow { id: string; modalityCode: string; modalityName: string }
interface ModalityPermRow {
  id: string;
  modalityId: string | null;
  modalityCode: string | null;
  modalityName: string | null;
  permissions: number;
}

const FLAG_DOC = 0x0004;   // DocKQ
const FLAG_DUYET = 0x0010; // DuyetKQ

const ModalityPermTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [modalities, setModalities] = useState<ModalityRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [perms, setPerms] = useState<ModalityPermRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [u, m] = await Promise.all([
          apiClient.get<{ items?: User[] } | User[]>('/admin/users', { params: { pageSize: 200 } }).catch(() => ({ data: [] })),
          apiClient.get<ModalityRow[]>('/ris-catalog/modalities', { params: { isActive: true } }).catch(() => ({ data: [] })),
        ]);
        setUsers(normalizeArrayResponse<User>(u.data));
        setModalities(Array.isArray(m.data) ? m.data : []);
      } catch { /* empty */ }
    })();
  }, []);

  const loadPerms = useCallback(async (uid: string) => {
    try {
      const res = await apiClient.get<ModalityPermRow[]>(`/radiology-dispatch/permissions/user/${uid}`);
      setPerms(Array.isArray(res.data) ? res.data : []);
    } catch { setPerms([]); }
  }, []);

  useEffect(() => { if (selectedUserId) loadPerms(selectedUserId); }, [selectedUserId, loadPerms]);

  /** Lấy permission hiện tại cho 1 modality (null modalityId = row áp dụng mọi máy) */
  const getFlags = (modalityId: string): number => {
    const row = perms.find((p) => p.modalityId === modalityId);
    return row?.permissions ?? 0;
  };

  const hasFlag = (modalityId: string, flag: number) => (getFlags(modalityId) & flag) !== 0;

  const toggleFlag = async (modality: ModalityRow, flag: number) => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      const current = getFlags(modality.id);
      const next = (current & flag) !== 0 ? current & ~flag : current | flag;
      await apiClient.post('/radiology-dispatch/permissions', {
        userId: selectedUserId,
        modalityId: modality.id,
        modalityType: modality.modalityCode,
        permissions: next,
        roleTemplate: null,
        roomId: null,
      });
      await loadPerms(selectedUserId);
    } catch { tw('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  const cols: ColumnDef<ModalityRow>[] = [
    { key: 'code', label: 'Mã máy', code: true, render: (r) => r.modalityCode },
    { key: 'name', label: 'Tên máy', render: (r) => r.modalityName },
    {
      key: 'doc', label: 'Đọc KQ',
      render: (r) => (
        <Checkbox
          checked={hasFlag(r.id, FLAG_DOC)}
          disabled={saving || !selectedUserId}
          onChange={() => toggleFlag(r, FLAG_DOC)}
        />
      ),
    },
    {
      key: 'duyet', label: 'Duyệt KQ',
      render: (r) => (
        <Checkbox
          checked={hasFlag(r.id, FLAG_DUYET)}
          disabled={saving || !selectedUserId}
          onChange={() => toggleFlag(r, FLAG_DUYET)}
        />
      ),
    },
  ];

  return (
    <>
      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Người dùng:</span>
        <Filter
          value={selectedUserId}
          onChange={setSelectedUserId}
          options={users.map((u) => ({ v: u.id, l: `${u.fullName} (${u.username})` }))}
          placeholder="▾ Chọn BS / KTV"
        />
        {selectedUserId && (
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)', marginLeft: 'var(--space-8)' }}>
            Tick checkbox để bật/tắt quyền — lưu tức thì. Không tick = không hạn chế (quyền mặc định đầy đủ).
          </span>
        )}
      </div>
      <DataTable<ModalityRow>
        columns={cols}
        data={modalities}
        rowKey={(r) => r.id}
        empty={selectedUserId ? 'Chưa có máy chụp' : 'Chọn người dùng để cấu hình quyền theo máy'}
      />
    </>
  );
};

export default RisAdminV2;
