/**
 * RIS Admin Panel — Sprint 4 Item 2.20.
 * Quản trị chi tiết cho module CĐHA:
 * - Khu vực/Chi nhánh + Thư mục (cấp 2)
 * - Mẫu kết quả + Mẫu in
 * - ICD ↔ Template mapping
 * - Vật tư + Máy chụp + Cấu hình BV
 * - Phân quyền BS/KTV (matrix × máy)
 * - Thống kê báo cáo
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card, Tabs, Table, Button, Space, Tag, Modal, Form, Input, Select, Checkbox,
  message, Typography, Popconfirm, Badge,
} from 'antd';
import {
  AppstoreOutlined, FolderOutlined, FileTextOutlined, UserSwitchOutlined,
  BarChartOutlined, MedicineBoxOutlined, EnvironmentOutlined, BankOutlined,
} from '@ant-design/icons';
import apiClient from '../api/client';

const { Text } = Typography;

const PERMISSION_FLAGS: Array<{ flag: number; label: string }> = [
  { flag: 0x0001, label: 'Chỉ xem' },
  { flag: 0x0002, label: 'Xóa ca chụp' },
  { flag: 0x0004, label: 'Đọc & trả KQ' },
  { flag: 0x0008, label: 'Cập nhật từ HIS' },
  { flag: 0x0010, label: 'Duyệt KQ' },
  { flag: 0x0020, label: 'Chia sẻ' },
  { flag: 0x0040, label: 'Hội chẩn' },
  { flag: 0x0080, label: 'Thống kê' },
  { flag: 0x0100, label: 'Hủy hội chẩn' },
  { flag: 0x0200, label: 'Hủy duyệt' },
  { flag: 0x0400, label: 'Chỉnh sửa KQ đã duyệt' },
];

const ROLE_TEMPLATES: Record<string, number> = {
  chup: 0x0001, // KTV: chỉ xem
  doc: 0x0001 | 0x0004 | 0x0010 | 0x0040, // BS đọc: Xem + Đọc + Duyệt + Hội chẩn
  truongkhoa: 0x0001 | 0x0004 | 0x0010 | 0x0040 | 0x0080 | 0x0200, // Trưởng khoa: đầy đủ trừ xóa/sửa
  admin: 0x07FF, // Tất cả
};

interface PermissionRow {
  id: string;
  roomId?: string;
  roomName: string;
  modalityType?: string;
  permissions: number;
  roleTemplate?: string;
}

interface User { id: string; fullName: string; username: string }

export default function RisAdmin() {
  return (
    <Card title="Quản trị RIS/PACS" bodyStyle={{ padding: 0 }}>
      <Tabs
        style={{ margin: 16 }}
        items={[
          { key: 'permissions', label: <><UserSwitchOutlined /> Phân quyền BS/KTV</>, children: <PermissionMatrixTab /> },
          { key: 'areas', label: <><EnvironmentOutlined /> Khu vực / Chi nhánh</>, children: <AreasTab /> },
          { key: 'folders', label: <><FolderOutlined /> Thư mục</>, children: <FoldersTab /> },
          { key: 'icdMap', label: <><FileTextOutlined /> ICD ↔ Mẫu KQ</>, children: <IcdMappingTab /> },
          { key: 'machines', label: <><AppstoreOutlined /> Máy chụp + Mẫu in</>, children: <MachinesTab /> },
          { key: 'supplies', label: <><MedicineBoxOutlined /> Vật tư CĐHA</>, children: <SuppliesTab /> },
          { key: 'hospital', label: <><BankOutlined /> Cấu hình BV</>, children: <HospitalConfigTab /> },
          { key: 'stats', label: <><BarChartOutlined /> Thống kê</>, children: <StatsTab /> },
        ]}
      />
    </Card>
  );
}

function PermissionMatrixTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; roomName: string }>>([]);
  const [editModal, setEditModal] = useState(false);
  const [editForm] = Form.useForm<{ roomId?: string; roleTemplate?: string; permissions: number[] }>();
  const [copyModal, setCopyModal] = useState(false);
  const [copyForm] = Form.useForm<{ fromUserId: string }>();

  const load = useCallback(async () => {
    try {
      const [usersRes, roomsRes] = await Promise.all([
        apiClient.get<{ items?: User[] } | User[]>('/admin/users', { params: { pageSize: 200 } }).catch(() => ({ data: [] })),
        apiClient.get<Array<{ id: string; roomName: string }>>('/system/rooms', { params: { type: 'radiology' } }).catch(() => ({ data: [] })),
      ]);
      const usersData = Array.isArray(usersRes.data)
        ? usersRes.data
        : (usersRes.data?.items ?? []);
      setUsers(usersData);
      setRooms(roomsRes.data);
    } catch (e) { console.warn(e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadPerms = useCallback(async (uid: string) => {
    try {
      const res = await apiClient.get<PermissionRow[]>(`/radiology-dispatch/permissions/user/${uid}`);
      setPermissions(res.data);
    } catch { setPermissions([]); }
  }, []);

  useEffect(() => {
    if (selectedUserId) loadPerms(selectedUserId);
  }, [selectedUserId, loadPerms]);

  const handleSave = async () => {
    try {
      const values = await editForm.validateFields();
      const permInt = values.permissions?.reduce((acc, f) => acc | f, 0) ?? 0;
      await apiClient.post('/radiology-dispatch/permissions', {
        userId: selectedUserId,
        roomId: values.roomId || null,
        roleTemplate: values.roleTemplate,
        permissions: permInt,
      });
      message.success('Đã lưu quyền');
      setEditModal(false);
      editForm.resetFields();
      if (selectedUserId) loadPerms(selectedUserId);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Lưu thất bại');
    }
  };

  const handleCopy = async () => {
    const values = await copyForm.validateFields();
    if (!selectedUserId) return;
    await apiClient.post(`/radiology-dispatch/permissions/copy`, null, {
      params: { fromUserId: values.fromUserId, toUserId: selectedUserId },
    });
    message.success('Đã copy quyền');
    setCopyModal(false);
    copyForm.resetFields();
    loadPerms(selectedUserId);
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/radiology-dispatch/permissions/${id}`);
    message.success('Đã xóa quyền');
    if (selectedUserId) loadPerms(selectedUserId);
  };

  const renderPermFlags = (perm: number) => (
    <Space size={[4, 4]} wrap>
      {PERMISSION_FLAGS.filter(f => (perm & f.flag) !== 0).map(f => (
        <Tag key={f.flag} color="blue">{f.label}</Tag>
      ))}
    </Space>
  );

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Text strong>Người dùng:</Text>
        <Select
          showSearch
          style={{ width: 320 }}
          placeholder="Chọn BS / KTV"
          value={selectedUserId}
          onChange={setSelectedUserId}
          optionFilterProp="label"
          options={users.map(u => ({ value: u.id, label: `${u.fullName} (${u.username})` }))}
        />
        <Button
          type="primary"
          disabled={!selectedUserId}
          onClick={() => {
            editForm.resetFields();
            editForm.setFieldsValue({ permissions: [0x0001] });
            setEditModal(true);
          }}
        >
          + Thêm quyền
        </Button>
        <Button
          disabled={!selectedUserId}
          onClick={() => { copyForm.resetFields(); setCopyModal(true); }}
        >
          Copy quyền từ user khác
        </Button>
      </Space>

      <Table<PermissionRow>
        rowKey="id"
        dataSource={permissions}
        pagination={false}
        columns={[
          { title: 'Máy chụp', dataIndex: 'roomName' },
          { title: 'Loại', dataIndex: 'modalityType', width: 100 },
          { title: 'Role', dataIndex: 'roleTemplate', width: 110, render: (r: string) => r ? <Tag>{r}</Tag> : null },
          { title: 'Quyền', render: (_, r) => renderPermFlags(r.permissions) },
          {
            title: 'Hành động',
            width: 100,
            render: (_, r) => (
              <Popconfirm title="Xóa quyền này?" onConfirm={() => handleDelete(r.id)}>
                <Button size="small" danger>Xóa</Button>
              </Popconfirm>
            ),
          },
        ]}
      />

      <Modal
        title="Phân quyền"
        open={editModal}
        onOk={handleSave}
        onCancel={() => setEditModal(false)}
        okText="Lưu"
        width={640}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="roomId" label="Máy chụp (bỏ trống = áp dụng mọi máy)">
            <Select
              allowClear
              options={rooms.map(r => ({ value: r.id, label: r.roomName }))}
            />
          </Form.Item>
          <Form.Item name="roleTemplate" label="Template role (tùy chọn - apply preset)">
            <Select
              allowClear
              onChange={(val: string) => {
                if (val && ROLE_TEMPLATES[val]) {
                  const flags = PERMISSION_FLAGS.filter(f => (ROLE_TEMPLATES[val] & f.flag) !== 0).map(f => f.flag);
                  editForm.setFieldValue('permissions', flags);
                }
              }}
              options={[
                { value: 'chup', label: 'KTV Chụp (chỉ xem)' },
                { value: 'doc', label: 'BS Đọc (xem + đọc + duyệt + hội chẩn)' },
                { value: 'truongkhoa', label: 'Trưởng khoa (+ thống kê + hủy duyệt)' },
                { value: 'admin', label: 'Admin RIS (tất cả)' },
              ]}
            />
          </Form.Item>
          <Form.Item name="permissions" label="Quyền chi tiết">
            <Checkbox.Group
              options={PERMISSION_FLAGS.map(f => ({ value: f.flag, label: f.label }))}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Copy quyền từ user khác"
        open={copyModal}
        onOk={handleCopy}
        onCancel={() => setCopyModal(false)}
        okText="Copy quyền"
        destroyOnHidden
      >
        <Form form={copyForm} layout="vertical">
          <Form.Item name="fromUserId" label="Copy từ user" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Chọn user mẫu"
              optionFilterProp="label"
              options={users.map(u => ({ value: u.id, label: `${u.fullName} (${u.username})` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function AreasTab() {
  return <PlaceholderTab title="Khu vực / Chi nhánh" hint="Quản lý các chi nhánh/cơ sở. Hiện dùng System Admin → Chi nhánh." />;
}

function FoldersTab() {
  return <PlaceholderTab title="Thư mục (cấp 2)" hint="Normal / Share (STT=900) / Upload (STT=950) — VRPACS Admin chức năng 2.2.11" />;
}

function IcdMappingTab() {
  return <PlaceholderTab title="ICD ↔ Mẫu kết quả" hint="Map ICD code → loại dịch vụ → mẫu KQ (tự áp dụng khi BS đọc KQ). Dùng Clinical Template với type=3 (Kết luận khám)" />;
}

function MachinesTab() {
  return <PlaceholderTab title="Máy chụp + Mẫu in" hint="Gán máy chụp với mẫu in kết quả. Dùng Radiology tab 'Cấu hình'" />;
}

function SuppliesTab() {
  return <PlaceholderTab title="Vật tư CĐHA" hint="Quản lý vật tư y tế cho CĐHA. Dùng Medical Supply module + filter theo type=Radiology" />;
}

function HospitalConfigTab() {
  return <PlaceholderTab title="Cấu hình BV" hint="Tên BV, logo, địa chỉ, SĐT hiển thị trên RIS. Dùng System Admin → Cấu hình" />;
}

function StatsTab() {
  return <PlaceholderTab title="Thống kê báo cáo RIS" hint="Dùng Reports → Tab Chẩn đoán hình ảnh, filter BS/KTV/thời gian/chẩn đoán" />;
}

function PlaceholderTab({ title, hint }: { title: string; hint: string }) {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <Badge count="Redirect" offset={[8, 0]} color="blue">
        <Text strong style={{ fontSize: 16 }}>{title}</Text>
      </Badge>
      <div style={{ marginTop: 12, color: '#666' }}>{hint}</div>
    </div>
  );
}
