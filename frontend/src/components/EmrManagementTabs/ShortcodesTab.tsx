import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, message,
  Popconfirm, Row, Col,
} from 'antd';
import {
  EditOutlined,
  ThunderboltOutlined,
  DeleteOutlined, PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import * as emrMgmt from '../../api/emrManagement';
import type {
  EmrShortcodeDto,
} from '../../api/emrManagement';

const { TextArea } = Input;

// ============ Tab 1: Chia se BA (Sharing B.1.2) ============

export const ShortcodesTab: React.FC = () => {
  const [shortcodes, setShortcodes] = useState<EmrShortcodeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingShortcode, setEditingShortcode] = useState<EmrShortcodeDto | null>(null);
  const [testCode, setTestCode] = useState('');
  const [expandedText, setExpandedText] = useState('');

  const fetchShortcodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emrMgmt.getShortcodes();
      setShortcodes(res.data || []);
    } catch {
      message.warning('Khong the tai danh sach ma tat');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShortcodes(); }, [fetchShortcodes]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await emrMgmt.saveShortcode({ id: editingShortcode?.id, ...values });
      message.success(editingShortcode ? 'Cap nhat thanh cong' : 'Them ma tat thanh cong');
      setModalOpen(false);
      fetchShortcodes();
    } catch {
      message.warning('Khong the luu ma tat');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await emrMgmt.deleteShortcode(id);
      message.success('Da xoa');
      setShortcodes(prev => prev.filter(s => s.id !== id));
    } catch {
      message.warning('Khong the xoa');
    }
  };

  const handleExpand = async () => {
    if (!testCode) return;
    try {
      const res = await emrMgmt.expandShortcode(testCode);
      setExpandedText(res.data?.fullText || res.data || 'Khong tim thay ma tat');
    } catch {
      setExpandedText('Khong tim thay ma tat nay');
    }
  };

  const openModal = (sc?: EmrShortcodeDto) => {
    if (sc) {
      setEditingShortcode(sc);
      form.setFieldsValue(sc);
    } else {
      setEditingShortcode(null);
      form.resetFields();
      form.setFieldsValue({ scope: 'User' });
    }
    setModalOpen(true);
  };

  const scopeColors: Record<string, string> = { Global: 'red', Department: 'orange', User: 'blue' };
  const scopeLabels: Record<string, string> = { Global: 'Toan BV', Department: 'Khoa', User: 'Ca nhan' };

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <Space orientation="horizontal">
          <Input placeholder="Nhap ma tat de thu..." value={testCode} onChange={e => setTestCode(e.target.value)}
            style={{ width: 200 }} onPressEnter={handleExpand} />
          <Button icon={<ThunderboltOutlined />} onClick={handleExpand}>Mo rong</Button>
          {expandedText && <Tag color="green" style={{ maxWidth: 400 }}>{expandedText}</Tag>}
        </Space>
        <Space orientation="horizontal">
          <Button icon={<ReloadOutlined />} onClick={fetchShortcodes}>Tai lai</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Them ma tat</Button>
        </Space>
      </div>

      <Table
        size="small" loading={loading} dataSource={shortcodes} rowKey="id"
        pagination={{ pageSize: 15, showSizeChanger: false }}
        columns={[
          { title: 'Ma tat', dataIndex: 'code', key: 'code', width: 120,
            render: (v: string) => <code style={{ fontWeight: 600, color: '#1677ff' }}>{v}</code> },
          { title: 'Noi dung day du', dataIndex: 'fullText', key: 'text', ellipsis: true },
          { title: 'Danh muc', dataIndex: 'category', key: 'cat', width: 100,
            render: (v: string) => v ? <Tag>{v}</Tag> : '-' },
          { title: 'Pham vi', dataIndex: 'scope', key: 'scope', width: 90,
            render: (v: string) => <Tag color={scopeColors[v] || 'default'}>{scopeLabels[v] || v}</Tag> },
          { title: '', key: 'actions', width: 80,
            render: (_: unknown, r: EmrShortcodeDto) => (
              <Space orientation="horizontal" size={4}>
                <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
                <Popconfirm title="Xoa ma tat?" onConfirm={() => handleDelete(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editingShortcode ? 'Chinh sua ma tat' : 'Them ma tat'} open={modalOpen}
        onOk={handleSave} onCancel={() => setModalOpen(false)} okText="Luu" cancelText="Huy" width={500}>
        <Form form={form} layout="vertical" size="small">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="code" label="Ma tat" rules={[{ required: true, message: 'Nhap ma tat' }]}>
                <Input placeholder="VD: bt, kbt, thb" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scope" label="Pham vi" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="User">Ca nhan</Select.Option>
                  <Select.Option value="Department">Khoa/Phong</Select.Option>
                  <Select.Option value="Global">Toan benh vien</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="category" label="Danh muc">
            <Input placeholder="VD: Kham benh, Chan doan, Dieu tri..." />
          </Form.Item>
          <Form.Item name="fullText" label="Noi dung day du" rules={[{ required: true, message: 'Nhap noi dung' }]}>
            <TextArea rows={4} placeholder="Noi dung se duoc mo rong khi go ma tat..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ============ Tab 6: Kiem tra thieu sot (Auto Check B.1.25) ============
