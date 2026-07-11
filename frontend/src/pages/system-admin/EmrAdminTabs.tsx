// K1 phiên 4 (2026-05-30): tách 6 EMR admin tab khỏi SystemAdmin.tsx god-file.
// Behavior-preserve: copy y nguyên fetch/save/delete + modal switch case.
// Generic `EmrCrudPanel<T>` rút common pattern (Spin + Add button + Table + Actions col).
// Pure CRUD, KHÔNG timer/side-effect → không cần `active` prop pattern như HealthTab.
import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Spin,
  Switch, Table, Tag, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TabsProps } from 'antd';
import {
  AuditOutlined, DeleteOutlined, EditOutlined, FileTextOutlined,
  FolderOutlined, PlusOutlined, ReloadOutlined, SafetyOutlined, UserOutlined,
} from '@ant-design/icons';
import {
  getCoverTypes, saveCoverType, deleteCoverType,
  getSigners, saveSigner, deleteSigner,
  getSigningRoles, saveSigningRole, deleteSigningRole,
  getSigningOperations, saveSigningOperation, deleteSigningOperation,
  getDocumentGroups, saveDocumentGroup, deleteDocumentGroup,
  getDocumentTypes, saveDocumentType, deleteDocumentType,
  type EmrCoverTypeDto, type EmrSignerCatalogDto, type EmrSigningRoleDto,
  type EmrSigningOperationDto, type EmrDocumentGroupDto, type EmrDocumentTypeDto,
} from '../../modules/emr/api/emrAdmin';

// Generic CRUD panel — rút common pattern khỏi 6 tab.
interface EmrCrudPanelProps<T extends { id: string }> {
  loading: boolean;
  data: T[];
  addLabel: string;
  onAdd: () => void;
  onEdit: (record: T) => void;
  onDelete: (id: string) => void;
  onReload?: () => void;
  columns: ColumnsType<T>;
  pagination?: false | { pageSize: number };
}

function EmrCrudPanel<T extends { id: string }>(props: EmrCrudPanelProps<T>) {
  const { loading, data, addLabel, onAdd, onEdit, onDelete, onReload, columns, pagination } = props;
  const actionCol: ColumnsType<T>[number] = {
    title: '',
    key: 'actions',
    width: 110,
    render: (_: unknown, r: T) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(r)} />
        <Popconfirm title="Xoa?" onConfirm={() => onDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    ),
  };
  return (
    <Spin spinning={loading}>
      <div style={{ marginBottom: 8 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>{addLabel}</Button>
        {onReload && (
          <Button icon={<ReloadOutlined />} onClick={onReload} style={{ marginLeft: 8 }} />
        )}
      </div>
      <Table
        size="small"
        dataSource={data}
        rowKey="id"
        pagination={pagination ?? false}
        columns={[...columns, actionCol]}
      />
    </Spin>
  );
}

type EmrModalType = 'cover' | 'signer' | 'role' | 'operation' | 'group' | 'doctype' | '';

const MODAL_TITLES: Record<Exclude<EmrModalType, ''>, string> = {
  cover: 'Vo benh an',
  signer: 'Nguoi ky',
  role: 'Vai tro ky',
  operation: 'Nghiep vu ky',
  group: 'Nhom van ban',
  doctype: 'Loai van ban',
};

/**
 * 6 tab EMR admin gộp 1 component. Trả `items` để parent inject vào outer `<Tabs>`.
 * Lý do gộp: shared state (6 array + loading + modal) + shared modal Form switch theo type.
 */
export function useEmrAdminTabs(): { items: NonNullable<TabsProps['items']> } {
  const [coverTypes, setCoverTypes] = useState<EmrCoverTypeDto[]>([]);
  const [signers, setSigners] = useState<EmrSignerCatalogDto[]>([]);
  const [signingRoles, setSigningRoles] = useState<EmrSigningRoleDto[]>([]);
  const [signingOps, setSigningOps] = useState<EmrSigningOperationDto[]>([]);
  const [docGroups, setDocGroups] = useState<EmrDocumentGroupDto[]>([]);
  const [docTypes, setDocTypes] = useState<EmrDocumentTypeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<EmrModalType>('');
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ct, sg, sr, so, dg, dt] = await Promise.allSettled([
        getCoverTypes(), getSigners(), getSigningRoles(),
        getSigningOperations(), getDocumentGroups(), getDocumentTypes(),
      ]);
      if (ct.status === 'fulfilled') setCoverTypes(ct.value);
      if (sg.status === 'fulfilled') setSigners(sg.value);
      if (sr.status === 'fulfilled') setSigningRoles(sr.value);
      if (so.status === 'fulfilled') setSigningOps(so.value);
      if (dg.status === 'fulfilled') setDocGroups(dg.value);
      if (dt.status === 'fulfilled') setDocTypes(dt.value);
    } catch { /* swallow per existing behavior */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openModal = (type: Exclude<EmrModalType, ''>, item?: Record<string, unknown>) => {
    setModalType(type);
    setEditingItem(item || null);
    form.resetFields();
    if (item) form.setFieldsValue(item);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const data = { ...editingItem, ...values };
      let ok = false;
      switch (modalType) {
        case 'cover': ok = !!(await saveCoverType(data)); break;
        case 'signer': ok = !!(await saveSigner(data)); break;
        case 'role': ok = !!(await saveSigningRole(data)); break;
        case 'operation': ok = !!(await saveSigningOperation(data)); break;
        case 'group': ok = !!(await saveDocumentGroup(data)); break;
        case 'doctype': ok = !!(await saveDocumentType(data)); break;
      }
      if (ok) { message.success('Da luu'); setModalOpen(false); fetchAll(); }
    } catch { /* validation error */ }
  };

  const handleDelete = async (type: Exclude<EmrModalType, ''>, id: string) => {
    let ok = false;
    switch (type) {
      case 'cover': ok = await deleteCoverType(id); break;
      case 'signer': ok = await deleteSigner(id); break;
      case 'role': ok = await deleteSigningRole(id); break;
      case 'operation': ok = await deleteSigningOperation(id); break;
      case 'group': ok = await deleteDocumentGroup(id); break;
      case 'doctype': ok = await deleteDocumentType(id); break;
    }
    if (ok) { message.success('Da xoa'); fetchAll(); }
  };

  const coverColumns: ColumnsType<EmrCoverTypeDto> = [
    { title: 'Ma', dataIndex: 'code', key: 'code', width: 80 },
    { title: 'Ten', dataIndex: 'name', key: 'name' },
    { title: 'Phan loai', dataIndex: 'category', key: 'cat', width: 120, render: (v: string) => (
      <Tag color={v === 'NoiTru' ? 'blue' : v === 'NgoaiTru' ? 'green' : 'purple'}>{v}</Tag>
    )},
    { title: 'Thu tu', dataIndex: 'sortOrder', key: 'sort', width: 70 },
    { title: 'Trang thai', dataIndex: 'isActive', key: 'active', width: 90, render: (v: boolean) => (
      <Tag color={v ? 'green' : 'red'}>{v ? 'Hoat dong' : 'Khoa'}</Tag>
    )},
  ];

  const signerColumns: ColumnsType<EmrSignerCatalogDto> = [
    { title: 'Ho ten', dataIndex: 'fullName', key: 'name' },
    { title: 'Chuc danh', dataIndex: 'title', key: 'title', width: 80 },
    { title: 'Username', dataIndex: 'userName', key: 'user', width: 120 },
    { title: 'Khoa', dataIndex: 'departmentName', key: 'dept', width: 150 },
    { title: 'Chung thu', dataIndex: 'certificateInfo', key: 'cert', width: 150, ellipsis: true },
    { title: 'Trang thai', dataIndex: 'isActive', key: 'active', width: 90, render: (v: boolean) => (
      <Tag color={v ? 'green' : 'red'}>{v ? 'Hoat dong' : 'Khoa'}</Tag>
    )},
  ];

  const roleColumns: ColumnsType<EmrSigningRoleDto> = [
    { title: 'Ma', dataIndex: 'code', key: 'code', width: 80 },
    { title: 'Ten', dataIndex: 'name', key: 'name' },
    { title: 'Mo ta', dataIndex: 'description', key: 'desc', ellipsis: true },
    { title: 'Thu tu', dataIndex: 'sortOrder', key: 'sort', width: 70 },
  ];

  const operationColumns: ColumnsType<EmrSigningOperationDto> = [
    { title: 'Ma', dataIndex: 'code', key: 'code', width: 100 },
    { title: 'Ten', dataIndex: 'name', key: 'name' },
    { title: 'Vai tro', dataIndex: 'roleName', key: 'role', width: 120 },
    { title: 'Loai VB', dataIndex: 'documentType', key: 'doc', width: 120 },
    { title: 'Bat buoc', dataIndex: 'isRequired', key: 'req', width: 80, render: (v: boolean) => (
      <Tag color={v ? 'red' : 'default'}>{v ? 'Co' : 'Khong'}</Tag>
    )},
  ];

  const groupColumns: ColumnsType<EmrDocumentGroupDto> = [
    { title: 'Ma', dataIndex: 'code', key: 'code', width: 80 },
    { title: 'Ten', dataIndex: 'name', key: 'name' },
    { title: 'Phan loai', dataIndex: 'category', key: 'cat', width: 120 },
    { title: 'Thu tu', dataIndex: 'sortOrder', key: 'sort', width: 70 },
  ];

  const docTypeColumns: ColumnsType<EmrDocumentTypeDto> = [
    { title: 'Ma', dataIndex: 'code', key: 'code', width: 80 },
    { title: 'Ten', dataIndex: 'name', key: 'name' },
    { title: 'Nhom', dataIndex: 'groupName', key: 'group', width: 120 },
    { title: 'Template', dataIndex: 'formTemplateKey', key: 'tmpl', width: 120 },
    { title: 'Bat buoc', dataIndex: 'isRequired', key: 'req', width: 80, render: (v: boolean) => (
      <Tag color={v ? 'red' : 'default'}>{v ? 'Co' : 'Khong'}</Tag>
    )},
  ];

  const modal = (
    <Modal
      title={modalType ? MODAL_TITLES[modalType] : 'EMR Admin'}
      open={modalOpen}
      onOk={handleSave}
      onCancel={() => setModalOpen(false)}
      width={500}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="code" label="Ma" rules={[{ required: true, message: 'Nhap ma' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="name" label="Ten" rules={[{ required: true, message: 'Nhap ten' }]}>
          <Input />
        </Form.Item>
        {modalType === 'cover' && (
          <Form.Item name="category" label="Phan loai" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="NoiTru">Noi tru</Select.Option>
              <Select.Option value="NgoaiTru">Ngoai tru</Select.Option>
              <Select.Option value="ChuyenKhoa">Chuyen khoa</Select.Option>
            </Select>
          </Form.Item>
        )}
        {modalType === 'signer' && (
          <>
            <Form.Item name="fullName" label="Ho ten" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="title" label="Chuc danh">
              <Select allowClear>
                <Select.Option value="BS">BS</Select.Option>
                <Select.Option value="BSCKI">BSCKI</Select.Option>
                <Select.Option value="BSCKII">BSCKII</Select.Option>
                <Select.Option value="ThS">ThS</Select.Option>
                <Select.Option value="TS">TS</Select.Option>
                <Select.Option value="PGS">PGS</Select.Option>
                <Select.Option value="GS">GS</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="departmentName" label="Khoa">
              <Input />
            </Form.Item>
          </>
        )}
        {modalType === 'operation' && (
          <>
            <Form.Item name="roleName" label="Vai tro">
              <Input />
            </Form.Item>
            <Form.Item name="documentType" label="Loai tai lieu">
              <Input />
            </Form.Item>
            <Form.Item name="isRequired" label="Bat buoc" valuePropName="checked">
              <Switch />
            </Form.Item>
          </>
        )}
        {modalType === 'group' && (
          <Form.Item name="category" label="Phan loai">
            <Select allowClear>
              <Select.Option value="BenhAn">Benh an</Select.Option>
              <Select.Option value="DieuTri">Dieu tri</Select.Option>
              <Select.Option value="ChamSoc">Cham soc</Select.Option>
              <Select.Option value="XetNghiem">Xet nghiem</Select.Option>
              <Select.Option value="ChanDoan">Chan doan</Select.Option>
              <Select.Option value="Khac">Khac</Select.Option>
            </Select>
          </Form.Item>
        )}
        {modalType === 'doctype' && (
          <>
            <Form.Item name="groupName" label="Nhom">
              <Input />
            </Form.Item>
            <Form.Item name="formTemplateKey" label="Template key">
              <Input />
            </Form.Item>
            <Form.Item name="isRequired" label="Bat buoc" valuePropName="checked">
              <Switch />
            </Form.Item>
          </>
        )}
        <Form.Item name="sortOrder" label="Thu tu">
          <InputNumber min={0} />
        </Form.Item>
        <Form.Item name="description" label="Mo ta">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );

  const items: NonNullable<TabsProps['items']> = [
    {
      key: 'emr-covers',
      label: (<span><FileTextOutlined /> Vo benh an</span>),
      children: (
        <>
          <EmrCrudPanel<EmrCoverTypeDto>
            loading={loading}
            data={coverTypes}
            addLabel="Them vo BA"
            onAdd={() => openModal('cover')}
            onEdit={(r) => openModal('cover', r as unknown as Record<string, unknown>)}
            onDelete={(id) => handleDelete('cover', id)}
            onReload={fetchAll}
            columns={coverColumns}
            pagination={{ pageSize: 15 }}
          />
          {modal}
        </>
      ),
    },
    {
      key: 'emr-signers',
      label: (<span><UserOutlined /> Nguoi ky</span>),
      children: (
        <EmrCrudPanel<EmrSignerCatalogDto>
          loading={loading}
          data={signers}
          addLabel="Them nguoi ky"
          onAdd={() => openModal('signer')}
          onEdit={(r) => openModal('signer', r as unknown as Record<string, unknown>)}
          onDelete={(id) => handleDelete('signer', id)}
          columns={signerColumns}
          pagination={{ pageSize: 15 }}
        />
      ),
    },
    {
      key: 'emr-signing-roles',
      label: (<span><SafetyOutlined /> Vai tro ky</span>),
      children: (
        <EmrCrudPanel<EmrSigningRoleDto>
          loading={loading}
          data={signingRoles}
          addLabel="Them vai tro"
          onAdd={() => openModal('role')}
          onEdit={(r) => openModal('role', r as unknown as Record<string, unknown>)}
          onDelete={(id) => handleDelete('role', id)}
          columns={roleColumns}
        />
      ),
    },
    {
      key: 'emr-signing-ops',
      label: (<span><AuditOutlined /> Nghiep vu ky</span>),
      children: (
        <EmrCrudPanel<EmrSigningOperationDto>
          loading={loading}
          data={signingOps}
          addLabel="Them nghiep vu"
          onAdd={() => openModal('operation')}
          onEdit={(r) => openModal('operation', r as unknown as Record<string, unknown>)}
          onDelete={(id) => handleDelete('operation', id)}
          columns={operationColumns}
        />
      ),
    },
    {
      key: 'emr-doc-groups',
      label: (<span><FolderOutlined /> Nhom VB</span>),
      children: (
        <EmrCrudPanel<EmrDocumentGroupDto>
          loading={loading}
          data={docGroups}
          addLabel="Them nhom"
          onAdd={() => openModal('group')}
          onEdit={(r) => openModal('group', r as unknown as Record<string, unknown>)}
          onDelete={(id) => handleDelete('group', id)}
          columns={groupColumns}
        />
      ),
    },
    {
      key: 'emr-doc-types',
      label: (<span><FileTextOutlined /> Loai VB</span>),
      children: (
        <EmrCrudPanel<EmrDocumentTypeDto>
          loading={loading}
          data={docTypes}
          addLabel="Them loai VB"
          onAdd={() => openModal('doctype')}
          onEdit={(r) => openModal('doctype', r as unknown as Record<string, unknown>)}
          onDelete={(id) => handleDelete('doctype', id)}
          columns={docTypeColumns}
          pagination={{ pageSize: 15 }}
        />
      ),
    },
  ];

  return { items };
}
