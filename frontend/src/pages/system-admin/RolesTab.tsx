// K1 phiên 5c (2026-05-30): tách tab `roles` khỏi SystemAdmin.tsx god-file.
// Behavior-preserve: copy 1-1 column/handler/modal + props pass từ parent.
// Side-effects: KHÔNG có timer → không cần `active` prop.
import React, { useState } from 'react';
import {
  Button, Col, Descriptions, Form, Input, Modal, Popconfirm, Row, Select, Space, Table, Tag, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, SafetyOutlined } from '@ant-design/icons';
import { adminApi } from '../../modules/system/api/system';
import { isFormValidationError } from './helpers';

const { Option } = Select;
const { TextArea } = Input;

export interface Permission {
  id: string;
  permissionCode: string;
  permissionName: string;
  module?: string;
  description?: string;
}

export interface Role {
  id: string;
  roleCode: string;
  roleName: string;
  description?: string;
  permissions: Permission[];
  userCount: number;
}

interface Props {
  roles: Role[];
  permissions: Permission[];
  loading: boolean;
  onReload: () => void;
}

export const RolesTabLabel: React.FC = () => (
  <span><SafetyOutlined /> Vai trò &amp; Phân quyền</span>
);

const RolesTab: React.FC<Props> = ({ roles, permissions, loading, onReload }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Role | null>(null);
  const [form] = Form.useForm();

  const handleCreate = () => {
    setSelected(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (role: Role) => {
    setSelected(role);
    form.setFieldsValue({
      ...role,
      permissionIds: role.permissions.map((p) => p.id),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await adminApi.saveRole({
        id: selected?.id,
        code: values.roleCode,
        name: values.roleName,
        description: values.description,
        isSystemRole: false,
        isActive: true,
        permissions: values.permissionIds?.map((id: string) => ({ id })),
      });
      message.success(selected ? 'Cập nhật vai trò thành công!' : 'Tạo vai trò thành công!');
      setModalOpen(false);
      form.resetFields();
      onReload();
    } catch (error) {
      if (isFormValidationError(error)) return;
      console.warn('Error saving role:', error);
      message.warning('Lưu vai trò thất bại!');
    }
  };

  const handleDelete = async (roleId: string) => {
    try {
      await adminApi.deleteRole(roleId);
      message.success('Xóa vai trò thành công!');
      onReload();
    } catch (error) {
      console.warn('Error deleting role:', error);
      message.warning('Xóa vai trò thất bại!');
    }
  };

  const columns: ColumnsType<Role> = [
    { title: 'Mã vai trò', dataIndex: 'roleCode', key: 'roleCode', width: 150 },
    { title: 'Tên vai trò', dataIndex: 'roleName', key: 'roleName', width: 200 },
    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
    { title: 'Số người dùng', dataIndex: 'userCount', key: 'userCount', width: 120, align: 'center' },
    {
      title: 'Thao tác', key: 'action', width: 150,
      render: (_: unknown, record: Role) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Sửa</Button>
          <Popconfirm title="Bạn có chắc muốn xóa vai trò này?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto" />
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Thêm vai trò
          </Button>
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={roles}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `Tổng: ${total} vai trò`,
        }}
        onRow={(record) => ({
          onDoubleClick: () => {
            Modal.info({
              title: `Chi tiết vai trò - ${record.roleName}`,
              width: 500,
              content: (
                <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                  <Descriptions.Item label="Tên vai trò">{record.roleName}</Descriptions.Item>
                  <Descriptions.Item label="Mô tả">{record.description || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Số người dùng">{record.userCount || 0}</Descriptions.Item>
                  <Descriptions.Item label="Quyền">
                    {record.permissions?.map((p) => <Tag key={p.id}>{p.permissionName}</Tag>) || '-'}
                  </Descriptions.Item>
                </Descriptions>
              ),
            });
          },
          style: { cursor: 'pointer' },
        })}
      />

      <Modal
        title={selected ? 'Cập nhật vai trò' : 'Thêm vai trò'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={800}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="roleCode"
                label="Mã vai trò"
                rules={[{ required: true, message: 'Vui lòng nhập mã vai trò' }]}
              >
                <Input placeholder="Nhập mã vai trò (VD: ADMIN, DOCTOR)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="roleName"
                label="Tên vai trò"
                rules={[{ required: true, message: 'Vui lòng nhập tên vai trò' }]}
              >
                <Input placeholder="Nhập tên vai trò" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Mô tả">
            <TextArea rows={3} placeholder="Nhập mô tả vai trò" />
          </Form.Item>
          <Form.Item name="permissionIds" label="Phân quyền">
            <Select mode="multiple" placeholder="Chọn quyền">
              {permissions.map((permission) => (
                <Option key={permission.id} value={permission.id}>
                  [{permission.module}] {permission.permissionName}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default RolesTab;
