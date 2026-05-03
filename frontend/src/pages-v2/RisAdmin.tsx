import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Checkbox } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../api/client';
import {
  KpiStrip, TopTabs, Filter, DataTable, StatusBadge, ActBtn,
  ModalShell, Ico, tk, tw, cf,
  type ColumnDef,
} from './_v2kit';

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

type Tab = 'permissions' | 'areas' | 'folders' | 'icdMap' | 'machines' | 'supplies' | 'hospital' | 'stats';
const TABS = [
  { v: 'permissions' as Tab, l: 'Phân quyền',     ic: 'user' },
  { v: 'areas' as Tab,       l: 'Khu vực / CN',   ic: 'archive' },
  { v: 'folders' as Tab,     l: 'Thư mục',        ic: 'archive' },
  { v: 'icdMap' as Tab,      l: 'ICD ↔ Mẫu',      ic: 'file-text' },
  { v: 'machines' as Tab,    l: 'Máy chụp',       ic: 'qr' },
  { v: 'supplies' as Tab,    l: 'Vật tư',         ic: 'medicine' },
  { v: 'hospital' as Tab,    l: 'Cấu hình BV',    ic: 'edit' },
  { v: 'stats' as Tab,       l: 'Thống kê',       ic: 'activity' },
];

const RisAdminV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('permissions');
  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Đang xem', val: TABS.find((t) => t.v === tab)?.l || '—', sub: 'admin RIS', tone: 'info' },
        { lbl: 'Module', val: 'RIS/PACS', sub: 'admin panel', tone: 'ok' },
        { lbl: 'Quyền', val: '4-eyes', sub: 'role-based', tone: 'warn' },
        { lbl: 'Sub-tabs', val: 8, sub: 'mục cấu hình' },
      ]} />
      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} />
      {tab === 'permissions' && <PermissionsTab />}
      {tab === 'areas' && <AreasTab />}
      {tab === 'folders' && <FoldersTab />}
      {tab === 'icdMap' && <IcdMapTab />}
      {tab === 'machines' && <MachinesTab />}
      {tab === 'supplies' && <SuppliesTab />}
      {tab === 'hospital' && <HospitalConfigTab />}
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
  const [editForm] = Form.useForm<{ roomId?: string; roleTemplate?: string; permissions: number[] }>();
  const [copyForm] = Form.useForm<{ fromUserId: string }>();

  useEffect(() => {
    (async () => {
      try {
        const [u, r] = await Promise.all([
          apiClient.get<{ items?: User[] } | User[]>('/admin/users', { params: { pageSize: 200 } }).catch(() => ({ data: [] })),
          apiClient.get<Array<{ id: string; roomName: string }>>('/RISComplete/rooms', { params: { roomType: 'radiology' } }).catch(() => ({ data: [] })),
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setUsers(Array.isArray(u.data) ? (u.data as User[]) : ((u.data as any)?.items ?? []));
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {PERMISSION_FLAGS.filter((f) => (r.permissions & f.flag) !== 0).map((f) => (
          <StatusBadge key={f.flag} tone="info">{f.label}</StatusBadge>
        ))}
      </div>
    ) },
  ];

  return (
    <>
      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <span style={{ fontSize: 12, color: 'var(--t-2)' }}>Người dùng:</span>
        <Filter value={selectedUserId} onChange={setSelectedUserId}
          options={users.map((u) => ({ v: u.id, l: `${u.fullName} (${u.username})` }))}
          placeholder="▾ Chọn BS / KTV" />
        <button className="ab-btn primary" type="button" disabled={!selectedUserId} onClick={() => {
          editForm.resetFields(); editForm.setFieldsValue({ permissions: [0x0001] }); setEditModal(true);
        }}>
          <Ico name="plus" size={12} /> Thêm quyền
        </button>
        <button className="ab-btn" type="button" disabled={!selectedUserId} onClick={() => { copyForm.resetFields(); setCopyModal(true); }}>
          <Ico name="archive" size={12} /> Copy từ user khác
        </button>
      </div>
      <DataTable<PermissionRow> columns={cols} data={permissions} rowKey={(r) => r.id}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => remove(r)} />
          </div>
        )}
        empty={selectedUserId ? 'User này chưa có quyền' : 'Chọn người dùng để xem quyền'}
      />

      <ModalShell open={editModal} onClose={() => setEditModal(false)} size="lg" title="Phân quyền"
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setEditModal(false)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submit}><Ico name="check" size={12} /> Lưu</button>
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
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }} />
          </Form.Item>
        </Form>
      </ModalShell>

      <ModalShell open={copyModal} onClose={() => setCopyModal(false)} size="md" title="Copy quyền từ user khác"
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setCopyModal(false)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={copy}><Ico name="check" size={12} /> Copy</button>
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
        <button className="ab-btn primary" type="button" onClick={() => { form.resetFields(); setModal(true); }}>
          <Ico name="plus" size={12} /> Thêm khu vực
        </button>
      </div>
      <DataTable<Area> columns={cols} data={data} rowKey={(r) => r.id}
        empty={loading ? 'Đang tải…' : 'Chưa có khu vực'} />

      <ModalShell open={modal} onClose={() => setModal(false)} size="md" title="Thêm khu vực / chi nhánh"
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setModal(false)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submit}><Ico name="check" size={12} /> Lưu</button>
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
      <div style={{ padding: 12, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4, margin: 12, fontSize: 12 }}>
        <Ico name="info" size={12} /> <b>Thư mục cấp 2</b> — Normal (STT bình thường), Share (STT=900), Upload (STT=950)
      </div>
      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <span className="spacer" />
        <button className="ab-btn primary" type="button" onClick={() => { form.resetFields(); setModal(true); }}>
          <Ico name="plus" size={12} /> Thêm thư mục
        </button>
      </div>
      <DataTable<FolderRow> columns={cols} data={data} rowKey={(r) => r.id} empty="Chưa có thư mục" />

      <ModalShell open={modal} onClose={() => setModal(false)} size="md" title="Thêm thư mục"
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setModal(false)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submit}><Ico name="check" size={12} /> Lưu</button>
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
  <div style={{ padding: 24 }}>
    <div className="panel" style={{ padding: 0 }}>
      <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
        <span>ICD ↔ Mẫu kết quả</span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--t-1)', marginBottom: 12 }}>
          Khi BS đọc KQ CĐHA, hệ thống tự tìm mẫu phù hợp với ICD chỉ định.
        </div>
        <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 16 }}>
          Để quản lý mẫu, vào <b>Danh mục → Viết tắt + Template</b> → Tab "Template lâm sàng" → Filter loại "Kết luận khám mẫu"
        </div>
        <button className="ab-btn primary" type="button" onClick={() => window.open('/v2/catalogs-admin', '_blank')}>
          <Ico name="archive" size={12} /> Mở trang quản lý template
        </button>
      </div>
    </div>
    <div className="panel" style={{ padding: 0, marginTop: 16 }}>
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
      <div style={{ padding: 12, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4, margin: 12, fontSize: 12 }}>
        <Ico name="info" size={12} /> <b>Cấu hình máy chụp + gán mẫu kết quả</b> — Mỗi máy chụp có thể gán với 1 hoặc nhiều mẫu kết quả đặc trưng.
      </div>
      <DataTable<Room> columns={cols} data={rooms} rowKey={(r) => r.id}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="edit" title="Cấu hình mẫu" onClick={() => window.open(`/v2/radiology?config=${r.id}`, '_blank')} />
          </div>
        )}
        empty="Chưa có máy chụp" />
    </>
  );
};

const SuppliesTab: React.FC = () => (
  <div style={{ padding: 24 }}>
    <div className="panel" style={{ padding: 0 }}>
      <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
        <span>Vật tư y tế cho CĐHA</span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--t-1)', marginBottom: 12 }}>
          Vật tư chuyên dụng cho CĐHA: thuốc cản quang, gel siêu âm, phim X-quang…
        </div>
        <button className="ab-btn primary" type="button" onClick={() => window.open('/v2/medical-supply?type=radiology', '_blank')}>
          <Ico name="medicine" size={12} /> Mở Medical Supply (filter CĐHA)
        </button>
      </div>
    </div>
  </div>
);

const HospitalConfigTab: React.FC = () => {
  const [form] = Form.useForm();
  useEffect(() => {
    apiClient.get('/admin/hospital-config').then(({ data }) => {
      form.setFieldsValue(data as Record<string, unknown>);
    }).catch(() => {});
  }, [form]);

  const submit = async (values: Record<string, unknown>) => {
    try { await apiClient.post('/admin/hospital-config', values); tk('Đã lưu'); }
    catch { tw('Lưu thất bại'); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <div className="panel" style={{ padding: 0 }}>
        <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
          <span>Cấu hình bệnh viện</span>
        </div>
        <div style={{ padding: 20 }}>
          <Form form={form} layout="vertical" onFinish={submit}>
            <Form.Item name="hospitalName" label="Tên bệnh viện" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="address" label="Địa chỉ"><Input /></Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
              <Form.Item name="email" label="Email"><Input /></Form.Item>
            </div>
            <Form.Item name="website" label="Website"><Input /></Form.Item>
            <Form.Item name="logoUrl" label="Logo URL (header RIS)"><Input /></Form.Item>
            <Form.Item name="reportFooter" label="Footer phiếu KQ">
              <Input.TextArea rows={3} placeholder="Mô tả cuối phiếu in KQ…" />
            </Form.Item>
            <button type="submit" className="ab-btn primary">
              <Ico name="check" size={12} /> Lưu cấu hình
            </button>
          </Form>
        </div>
      </div>
    </div>
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
        <span style={{ fontSize: 12, color: 'var(--t-2)' }}>Khoảng thời gian:</span>
        <RangePicker value={range} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
        <button className="ab-btn ghost" type="button" onClick={() => setRange([dayjs().subtract(7, 'day'), dayjs()])}>
          <Ico name="x" size={12} /> 7 ngày
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={() => window.open('/v2/reports?tab=radiology', '_blank')}>
          <Ico name="archive" size={12} /> Reports đầy đủ
        </button>
      </div>
      <DataTable<Stat> columns={cols} data={data} rowKey={(r) => r.label} />
    </>
  );
};

export default RisAdminV2;
