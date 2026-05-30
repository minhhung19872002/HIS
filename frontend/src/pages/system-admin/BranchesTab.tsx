// Tab quản lý chi nhánh — tách từ pages/SystemAdmin.tsx (K1 refactor 2026-05-30).
// Behavior-preserving: state + handlers + JSX y nguyên, chỉ move thành component self-contained.

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Col, Descriptions, Form, Input, Modal, Popconfirm, Row, Space, Switch, Table, Tag, message,
} from 'antd';
import { BankOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { catalogApi } from '../../api/system';
import type { Branch, ApiErrorLike } from './types';

const BranchesTab: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form] = Form.useForm();

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await catalogApi.getBranches();
      setBranches(response.data || []);
    } catch (error: unknown) {
      const apiError = error as ApiErrorLike;
      console.warn('Fetch branches error:', error);
      message.warning(apiError.response?.data?.message || 'Khong the tai danh sach chi nhanh');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const data = editingBranch ? { ...values, id: editingBranch.id } : values;
      await catalogApi.saveBranch(data);
      message.success(editingBranch ? 'Da cap nhat chi nhanh' : 'Da them chi nhanh moi');
      setModalOpen(false);
      setEditingBranch(null);
      form.resetFields();
      fetchBranches();
    } catch (error: unknown) {
      const apiError = error as ApiErrorLike;
      if (apiError.errorFields) return;
      console.warn('Save branch error:', error);
      message.warning(apiError.response?.data?.message || 'Khong the luu chi nhanh');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await catalogApi.deleteBranch(id);
      message.success('Da xoa chi nhanh');
      fetchBranches();
    } catch (error: unknown) {
      const apiError = error as ApiErrorLike;
      console.warn('Delete branch error:', error);
      message.warning(apiError.response?.data?.message || 'Khong the xoa chi nhanh');
    }
  };

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Input.Search
            placeholder="Tim theo ten, ma chi nhanh..."
            allowClear
            enterButton={<SearchOutlined />}
            style={{ maxWidth: 400 }}
            onSearch={() => fetchBranches()}
          />
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingBranch(null);
            form.resetFields();
            form.setFieldsValue({ isActive: true, isHeadquarter: false });
            setModalOpen(true);
          }}>
            Them chi nhanh
          </Button>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={fetchBranches}>
            Lam moi
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={branches}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Tong: ${total} chi nhanh`,
        }}
        columns={[
          { title: 'Ma', dataIndex: 'code', key: 'code', width: 100 },
          { title: 'Ten', dataIndex: 'name', key: 'name', width: 200 },
          { title: 'Dia chi', dataIndex: 'address', key: 'address', ellipsis: true },
          { title: 'SDT', dataIndex: 'phone', key: 'phone', width: 120 },
          {
            title: 'Tru so chinh',
            dataIndex: 'isHeadquarter',
            key: 'isHeadquarter',
            width: 100,
            align: 'center' as const,
            render: (v: boolean) => v ? <Tag color="gold">Tru so</Tag> : null,
          },
          {
            title: 'Trang thai',
            dataIndex: 'isActive',
            key: 'isActive',
            width: 100,
            render: (v: boolean) => <Tag color={v !== false ? 'green' : 'red'}>{v !== false ? 'Hoat dong' : 'Ngung'}</Tag>,
          },
          {
            title: 'Thao tac',
            key: 'action',
            width: 120,
            render: (_: unknown, record: Branch) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => {
                  setEditingBranch(record);
                  form.setFieldsValue(record);
                  setModalOpen(true);
                }} />
                <Popconfirm title="Xoa chi nhanh nay?" onConfirm={() => handleDelete(record.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        onRow={(record) => ({
          onDoubleClick: () => {
            Modal.info({
              title: `Chi tiet chi nhanh - ${record.name}`,
              width: 600,
              content: (
                <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                  <Descriptions.Item label="Ma">{record.code || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Ten">{record.name}</Descriptions.Item>
                  <Descriptions.Item label="Dia chi" span={2}>{record.address || '-'}</Descriptions.Item>
                  <Descriptions.Item label="SDT">{record.phone || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Email">{record.email || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Tru so chinh">
                    <Tag color={record.isHeadquarter ? 'gold' : 'default'}>{record.isHeadquarter ? 'Co' : 'Khong'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Trang thai">
                    <Tag color={record.isActive !== false ? 'green' : 'red'}>{record.isActive !== false ? 'Hoat dong' : 'Ngung'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Ghi chu" span={2}>{record.description || '-'}</Descriptions.Item>
                </Descriptions>
              ),
            });
          },
          style: { cursor: 'pointer' },
        })}
      />

      {/* Branch Create/Edit Modal */}
      <Modal
        title={editingBranch ? 'Sua chi nhanh' : 'Them chi nhanh moi'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => {
          setModalOpen(false);
          setEditingBranch(null);
          form.resetFields();
        }}
        okText="Luu"
        cancelText="Huy"
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label="Ma chi nhanh" rules={[{ required: true, message: 'Vui long nhap ma chi nhanh' }]}>
                <Input placeholder="VD: CN01" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Ten chi nhanh" rules={[{ required: true, message: 'Vui long nhap ten chi nhanh' }]}>
                <Input placeholder="VD: Chi nhanh Hai Duong" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Dia chi">
            <Input placeholder="So nha, duong, phuong/xa, quan/huyen, tinh/TP" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="So dien thoai">
                <Input placeholder="VD: 0220-3xxx-xxx" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="VD: chinhanh@benhvien.vn" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="isHeadquarter" label="Tru so chinh" valuePropName="checked">
                <Switch checkedChildren="Co" unCheckedChildren="Khong" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isActive" label="Trang thai" valuePropName="checked">
                <Switch checkedChildren="Hoat dong" unCheckedChildren="Ngung" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Ghi chu">
            <Input.TextArea rows={2} placeholder="Ghi chu them ve chi nhanh..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// Tab definition cho Tabs items array — re-export icon + label + key để main file gọn
export const BranchesTabIcon = <BankOutlined />;
export const BranchesTabLabel = 'Quan ly chi nhanh';
export const BranchesTabKey = 'branches';

export default BranchesTab;
