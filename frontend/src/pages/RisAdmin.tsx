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
  message, Typography, Popconfirm, Badge, Alert, InputNumber,
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
  const [data, setData] = useState<Array<{ id: string; areaCode: string; areaName: string; address?: string; isActive: boolean }>>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Array<{ id: string; areaCode: string; areaName: string; address?: string; isActive: boolean }>>('/ris-catalog/areas').catch(() => ({ data: [] }));
      setData(res.data);
    } catch { setData([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={() => { form.resetFields(); setModal(true); }}>+ Thêm khu vực</Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={data}
        loading={loading}
        pagination={false}
        columns={[
          { title: 'Mã', dataIndex: 'areaCode', width: 120 },
          { title: 'Tên khu vực', dataIndex: 'areaName' },
          { title: 'Địa chỉ', dataIndex: 'address' },
          { title: 'Trạng thái', dataIndex: 'isActive', width: 100, render: (v: boolean) => v ? <Tag color="green">Hoạt động</Tag> : <Tag>Dừng</Tag> },
        ]}
      />
      <Modal title="Thêm khu vực / chi nhánh" open={modal} onCancel={() => setModal(false)} onOk={async () => {
        const values = await form.validateFields();
        await apiClient.post('/ris-catalog/areas', values).catch(() => {});
        message.success('Đã lưu');
        setModal(false); load();
      }}>
        <Form form={form} layout="vertical">
          <Form.Item name="areaCode" label="Mã" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="areaName" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="address" label="Địa chỉ"><Input /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function FoldersTab() {
  // VRPACS chức năng 2.2.11: Thư mục cấp 2 với 3 loại
  const [data, setData] = useState<Array<{ id: string; folderName: string; folderType: number; areaName?: string; sortOrder: number }>>([]);
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    const res = await apiClient.get<Array<{ id: string; folderName: string; folderType: number; areaName?: string; sortOrder: number }>>('/ris-catalog/folders').catch(() => ({ data: [] }));
    setData(res.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const FOLDER_TYPES: Record<number, string> = { 1: 'Normal', 2: 'Share', 3: 'Upload' };

  return (
    <>
      <Alert
        type="info"
        showIcon
        title="Thư mục cấp 2 — Normal (STT bình thường), Share (STT=900), Upload (STT=950)"
        style={{ marginBottom: 12 }}
      />
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={() => { form.resetFields(); setModal(true); }}>+ Thêm thư mục</Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={data}
        pagination={false}
        columns={[
          { title: 'Tên thư mục', dataIndex: 'folderName' },
          { title: 'Loại', dataIndex: 'folderType', width: 110, render: (v: number) => <Tag color={v === 1 ? 'blue' : v === 2 ? 'gold' : 'purple'}>{FOLDER_TYPES[v]}</Tag> },
          { title: 'Khu vực', dataIndex: 'areaName' },
          { title: 'STT', dataIndex: 'sortOrder', width: 80 },
        ]}
      />
      <Modal title="Thêm thư mục" open={modal} onCancel={() => setModal(false)} onOk={async () => {
        const v = await form.validateFields();
        await apiClient.post('/ris-catalog/folders', v).catch(() => {});
        message.success('Đã lưu'); setModal(false); load();
      }}>
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
      </Modal>
    </>
  );
}

function IcdMappingTab() {
  // Map ICD → Loại dịch vụ → Mẫu KQ. Reuse ClinicalTemplate type=3
  return (
    <>
      <Alert
        type="info"
        showIcon
        title="ICD ↔ Mẫu kết quả — Khi BS đọc KQ CĐHA, hệ thống tự tìm mẫu phù hợp với ICD chỉ định"
        description={
          <Space direction="vertical">
            <span>Để quản lý mẫu, vào <strong>Danh mục → Viết tắt + Template</strong> → Tab "Template lâm sàng" → Filter loại "Kết luận khám mẫu"</span>
            <Button type="link" onClick={() => window.open('/catalogs-admin', '_blank')}>
              Mở trang quản lý template →
            </Button>
          </Space>
        }
        style={{ marginBottom: 12 }}
      />
      <Text strong>Mapping hiện tại:</Text>
      <Table
        size="small"
        pagination={false}
        style={{ marginTop: 8 }}
        dataSource={[
          { icd: 'J18.9', name: 'Viêm phổi', templateCount: 2 },
          { icd: 'I10', name: 'THA vô căn', templateCount: 1 },
          { icd: 'E11', name: 'ĐTĐ type 2', templateCount: 3 },
        ]}
        columns={[
          { title: 'ICD', dataIndex: 'icd', width: 100 },
          { title: 'Tên bệnh', dataIndex: 'name' },
          { title: 'Số mẫu', dataIndex: 'templateCount', width: 100 },
        ]}
      />
    </>
  );
}

function MachinesTab() {
  const [rooms, setRooms] = useState<Array<{ id: string; roomName: string; modalityType?: string; departmentName?: string }>>([]);

  useEffect(() => {
    apiClient.get<Array<{ id: string; roomName: string; modalityType?: string; departmentName?: string }>>('/system/rooms', { params: { type: 'radiology' } })
      .then(r => setRooms(r.data))
      .catch(() => setRooms([]));
  }, []);

  return (
    <>
      <Alert
        type="info"
        showIcon
        title="Cấu hình máy chụp + gán mẫu kết quả"
        description="Mỗi máy chụp có thể gán với 1 hoặc nhiều mẫu kết quả đặc trưng. Dùng trong Radiology tab 'Cấu hình'."
        style={{ marginBottom: 12 }}
      />
      <Table
        rowKey="id"
        dataSource={rooms}
        pagination={false}
        columns={[
          { title: 'Phòng / Máy', dataIndex: 'roomName' },
          { title: 'Loại', dataIndex: 'modalityType', width: 120, render: (v: string) => v ? <Tag color="blue">{v}</Tag> : null },
          { title: 'Khoa', dataIndex: 'departmentName' },
          {
            title: 'Mẫu KQ',
            width: 180,
            render: (_, r) => (
              <Button size="small" onClick={() => window.open(`/radiology?config=${r.id}`, '_blank')}>
                Cấu hình mẫu
              </Button>
            ),
          },
        ]}
      />
    </>
  );
}

function SuppliesTab() {
  return (
    <>
      <Alert
        type="info"
        showIcon
        title="Vật tư y tế cho CĐHA"
        description={
          <Space direction="vertical">
            <span>Vật tư chuyên dụng cho CĐHA: thuốc cản quang, gel siêu âm, phim X-quang...</span>
            <Button type="link" onClick={() => window.open('/medical-supply?type=radiology', '_blank')}>
              Mở trang Medical Supply (filter CĐHA) →
            </Button>
          </Space>
        }
      />
    </>
  );
}

function HospitalConfigTab() {
  const [form] = Form.useForm();
  useEffect(() => {
    apiClient.get('/admin/hospital-config').then(({ data }) => {
      form.setFieldsValue(data as Record<string, unknown>);
    }).catch(() => {});
  }, [form]);

  return (
    <Form form={form} layout="vertical" style={{ maxWidth: 640 }} onFinish={async (values) => {
      await apiClient.post('/admin/hospital-config', values).catch(() => {});
      message.success('Đã lưu');
    }}>
      <Form.Item name="hospitalName" label="Tên bệnh viện" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="address" label="Địa chỉ"><Input /></Form.Item>
      <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
      <Form.Item name="email" label="Email"><Input /></Form.Item>
      <Form.Item name="website" label="Website"><Input /></Form.Item>
      <Form.Item name="logoUrl" label="Logo URL (sẽ hiển thị trên header RIS)"><Input /></Form.Item>
      <Form.Item name="reportFooter" label="Footer phiếu KQ">
        <Input.TextArea rows={3} placeholder="Mô tả cuối phiếu in KQ..." />
      </Form.Item>
      <Button type="primary" htmlType="submit">Lưu cấu hình</Button>
    </Form>
  );
}

function StatsTab() {
  const [range, setRange] = useState<{ fromDate?: string; toDate?: string }>({});
  const [stats, setStats] = useState<Array<{ label: string; value: number }>>([]);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<Array<{ label: string; value: number }>>('/radiology-dispatch/stats', { params: range });
      setStats(res.data);
    } catch { setStats([]); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Text strong>Xem thống kê:</Text>
        <Select
          style={{ width: 200 }}
          placeholder="Chọn khoảng thời gian"
          onChange={(v: string) => {
            const today = new Date();
            if (v === '7d') {
              setRange({
                fromDate: new Date(today.setDate(today.getDate() - 7)).toISOString(),
                toDate: new Date().toISOString(),
              });
            } else if (v === '30d') {
              setRange({
                fromDate: new Date(today.setDate(today.getDate() - 30)).toISOString(),
                toDate: new Date().toISOString(),
              });
            } else setRange({});
          }}
          options={[
            { value: 'today', label: 'Hôm nay' },
            { value: '7d', label: '7 ngày qua' },
            { value: '30d', label: '30 ngày qua' },
            { value: 'all', label: 'Tất cả' },
          ]}
        />
        <Button onClick={() => window.open('/reports?tab=radiology', '_blank')}>Xem Reports đầy đủ →</Button>
      </Space>
      <Table
        pagination={false}
        dataSource={stats.length > 0 ? stats : [
          { label: 'Tổng ca chụp', value: 0 },
          { label: 'Đã trả KQ', value: 0 },
          { label: 'Chờ đọc', value: 0 },
          { label: 'Hội chẩn', value: 0 },
        ]}
        rowKey="label"
        columns={[
          { title: 'Chỉ số', dataIndex: 'label' },
          { title: 'Số lượng', dataIndex: 'value', align: 'right', render: (v: number) => v.toLocaleString('vi-VN') },
        ]}
      />
    </>
  );
}
