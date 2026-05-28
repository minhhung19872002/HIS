import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs, Table, Button, Modal, Form, Input, Select, Tag, Space, message,
  Popconfirm, DatePicker, Switch, Badge, Tooltip, Card, Row, Col,
  Timeline, Empty, Drawer, Spin, Alert,
} from 'antd';
import {
  ShareAltOutlined, LockOutlined, FileProtectOutlined, EditOutlined,
  PictureOutlined, ThunderboltOutlined, CheckCircleOutlined,
  CloseCircleOutlined, WarningOutlined, DeleteOutlined, PlusOutlined,
  ReloadOutlined, SearchOutlined, UnlockOutlined, CopyOutlined,
  OrderedListOutlined, TagOutlined, CodeOutlined, SafetyOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as emrMgmt from '../../api/emrManagement';
import type {
  EmrShareDto, ShareAccessLogDto, EmrExtractDto, EmrSpineDto,
  EmrSpineSectionDto, EmrImageDto, EmrShortcodeDto,
  AutoCheckRuleDto, AutoCheckViolationDto,
} from '../../api/emrManagement';

const { TextArea } = Input;

// ============ Tab 1: Chia se BA (Sharing B.1.2) ============

export const SpineTab: React.FC = () => {
  const [spines, setSpines] = useState<EmrSpineDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingSpine, setEditingSpine] = useState<EmrSpineDto | null>(null);
  const [sections, setSections] = useState<EmrSpineSectionDto[]>([]);

  const fetchSpines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emrMgmt.getEmrSpines();
      setSpines(res.data || []);
    } catch {
      message.warning('Khong the tai danh sach gay BA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSpines(); }, [fetchSpines]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await emrMgmt.saveEmrSpine({
        id: editingSpine?.id,
        name: values.name,
        description: values.description,
        isDefault: values.isDefault || false,
        sections,
      });
      message.success(editingSpine ? 'Cap nhat thanh cong' : 'Tao gay BA thanh cong');
      setModalOpen(false);
      fetchSpines();
    } catch {
      message.warning('Khong the luu gay BA');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await emrMgmt.deleteEmrSpine(id);
      message.success('Da xoa');
      setSpines(prev => prev.filter(s => s.id !== id));
    } catch {
      message.warning('Khong the xoa gay BA');
    }
  };

  const openModal = (spine?: EmrSpineDto) => {
    if (spine) {
      setEditingSpine(spine);
      form.setFieldsValue({ name: spine.name, description: spine.description, isDefault: spine.isDefault });
      setSections(spine.sections || []);
    } else {
      setEditingSpine(null);
      form.resetFields();
      setSections([]);
    }
    setModalOpen(true);
  };

  const addSection = () => {
    setSections(prev => [...prev, { formType: '', formName: '', sortOrder: prev.length + 1, isRequired: false }]);
  };

  const updateSection = (index: number, field: string, value: unknown) => {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeSection = (index: number) => {
    setSections(prev => prev.filter((_, i) => i !== index));
  };

  const formTypeOptions = [
    { value: 'admission-exam', label: 'Kham vao vien' },
    { value: 'treatment-sheet', label: 'Phieu dieu tri' },
    { value: 'consultation', label: 'Hoi chan' },
    { value: 'nursing-care', label: 'Cham soc DD' },
    { value: 'vital-signs', label: 'Sinh hieu' },
    { value: 'prescription', label: 'Don thuoc' },
    { value: 'lab-request', label: 'Xet nghiem' },
    { value: 'radiology-request', label: 'CDHA' },
    { value: 'surgery-record', label: 'Phau thuat' },
    { value: 'discharge', label: 'Ra vien' },
    { value: 'summary', label: 'Tong ket BA' },
    { value: 'consent', label: 'Cam ket' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 500 }}>Danh sach cau truc gay benh an</span>
        <Space orientation="horizontal">
          <Button icon={<ReloadOutlined />} onClick={fetchSpines}>Tai lai</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Them gay BA</Button>
        </Space>
      </div>

      <Table
        size="small" loading={loading} dataSource={spines} rowKey="id"
        pagination={false}
        expandable={{
          expandedRowRender: (record: EmrSpineDto) => (
            <Table
              size="small" dataSource={record.sections || []} rowKey={(_, i) => `section-${i}`}
              pagination={false}
              columns={[
                { title: 'STT', dataIndex: 'sortOrder', key: 'sort', width: 50 },
                { title: 'Loai bieu mau', dataIndex: 'formType', key: 'type', width: 150 },
                { title: 'Ten bieu mau', dataIndex: 'formName', key: 'name' },
                { title: 'Bat buoc', dataIndex: 'isRequired', key: 'req', width: 80,
                  render: (v: boolean) => v ? <Tag color="red">Bat buoc</Tag> : <Tag>Tuy chon</Tag> },
              ]}
            />
          ),
        }}
        columns={[
          { title: 'Ten gay BA', dataIndex: 'name', key: 'name', width: 200 },
          { title: 'Mo ta', dataIndex: 'description', key: 'desc', ellipsis: true },
          { title: 'So bieu mau', key: 'count', width: 100, align: 'center' as const,
            render: (_: unknown, r: EmrSpineDto) => <Badge count={r.sections?.length || 0} showZero style={{ backgroundColor: '#1677ff' }} /> },
          { title: 'Mac dinh', dataIndex: 'isDefault', key: 'default', width: 80,
            render: (v: boolean) => v ? <Tag color="green">Mac dinh</Tag> : null },
          { title: '', key: 'actions', width: 100,
            render: (_: unknown, r: EmrSpineDto) => (
              <Space orientation="horizontal" size={4}>
                <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
                <Popconfirm title="Xoa gay BA nay?" onConfirm={() => handleDelete(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editingSpine ? 'Chinh sua gay BA' : 'Them gay BA moi'} open={modalOpen}
        onOk={handleSave} onCancel={() => setModalOpen(false)} okText="Luu" cancelText="Huy" width={650}>
        <Form form={form} layout="vertical" size="small">
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="name" label="Ten gay BA" rules={[{ required: true, message: 'Nhap ten' }]}>
                <Input placeholder="VD: Gay BA noi khoa, Gay BA ngoai khoa..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isDefault" label="Mac dinh" valuePropName="checked">
                <Switch checkedChildren="Mac dinh" unCheckedChildren="Khong" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Mo ta">
            <TextArea rows={2} placeholder="Mo ta cau truc gay BA..." />
          </Form.Item>
        </Form>

        <div style={{ marginTop: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <strong>Cac phan (bieu mau)</strong>
          <Button size="small" icon={<PlusOutlined />} onClick={addSection}>Them phan</Button>
        </div>
        {sections.map((section, index) => (
          <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <Input size="small" value={section.sortOrder} style={{ width: 50 }}
              onChange={e => updateSection(index, 'sortOrder', Number(e.target.value))} placeholder="STT" />
            <Select size="small" value={section.formType} style={{ width: 160 }}
              onChange={v => { updateSection(index, 'formType', v); const opt = formTypeOptions.find(o => o.value === v); if (opt) updateSection(index, 'formName', opt.label); }}
              placeholder="Loai bieu mau" options={formTypeOptions} />
            <Input size="small" value={section.formName} style={{ flex: 1 }}
              onChange={e => updateSection(index, 'formName', e.target.value)} placeholder="Ten bieu mau" />
            <Switch size="small" checked={section.isRequired}
              onChange={v => updateSection(index, 'isRequired', v)} checkedChildren="BB" unCheckedChildren="TC" />
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeSection(index)} />
          </div>
        ))}
      </Modal>
    </div>
  );
};

// ============ Tab 4: Thu vien hinh anh (Images B.1.20) ============
