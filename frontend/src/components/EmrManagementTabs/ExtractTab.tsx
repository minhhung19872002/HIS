import React, { useState, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, message,
  Popconfirm, DatePicker, Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined, PlusOutlined,
  SearchOutlined, CopyOutlined,
} from '@ant-design/icons';
import * as emrMgmt from '../../api/emrManagement';
import type {
  EmrExtractDto,
} from '../../api/emrManagement';

// ============ Tab 1: Chia se BA (Sharing B.1.2) ============

export const ExtractTab: React.FC = () => {
  const [extracts, setExtracts] = useState<EmrExtractDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [searchExamId, setSearchExamId] = useState('');

  const fetchExtracts = useCallback(async () => {
    if (!searchExamId) return;
    setLoading(true);
    try {
      const res = await emrMgmt.getEmrExtracts(searchExamId);
      setExtracts(res.data || []);
    } catch {
      message.warning('Khong the tai danh sach trich luc');
    } finally {
      setLoading(false);
    }
  }, [searchExamId]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await emrMgmt.createEmrExtract({
        ...values,
        expiresAt: values.expiresAt?.toISOString(),
        maxAccessCount: values.maxAccessCount || 5,
      });
      message.success('Tao trich luc thanh cong');
      setModalOpen(false);
      form.resetFields();
      fetchExtracts();
    } catch {
      message.warning('Khong the tao trich luc');
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await emrMgmt.revokeEmrExtract(id);
      message.success('Da thu hoi trich luc');
      setExtracts(prev => prev.map(e => e.id === id ? { ...e, status: 'Revoked' } : e));
    } catch {
      message.warning('Khong the thu hoi');
    }
  };

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => message.success('Da sao chep ma truy cap'));
  };

  return (
    <div>
      <Space orientation="horizontal" style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Space orientation="horizontal">
          <Input placeholder="Ma kham (Examination ID)" value={searchExamId}
            onChange={e => setSearchExamId(e.target.value)} style={{ width: 280 }}
            onPressEnter={() => fetchExtracts()} />
          <Button icon={<SearchOutlined />} onClick={fetchExtracts}>Tim</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ examinationId: searchExamId }); setModalOpen(true); }}>
          Tao trich luc
        </Button>
      </Space>

      <Table
        size="small" loading={loading} dataSource={extracts} rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        columns={[
          { title: 'Benh nhan', dataIndex: 'patientName', key: 'patient', width: 140, ellipsis: true },
          { title: 'Nguoi trich', dataIndex: 'extractedByName', key: 'extractedBy', width: 120 },
          { title: 'Loai', dataIndex: 'extractType', key: 'type', width: 80,
            render: (v: string) => <Tag color={v === 'Full' ? 'blue' : 'orange'}>{v === 'Full' ? 'Day du' : 'Tung phan'}</Tag> },
          { title: 'Watermark', dataIndex: 'hasWatermark', key: 'wm', width: 80, align: 'center' as const,
            render: (v: boolean) => v ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ccc' }} /> },
          { title: 'Ma truy cap', dataIndex: 'accessCode', key: 'code', width: 120,
            render: (v: string) => v ? (
              <Space orientation="horizontal" size={4}>
                <code style={{ fontSize: 11 }}>{v}</code>
                <Tooltip title="Sao chep"><Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyAccessCode(v)} /></Tooltip>
              </Space>
            ) : '-' },
          { title: 'Truy cap', key: 'accessInfo', width: 80, align: 'center' as const,
            render: (_: unknown, r: EmrExtractDto) => `${r.accessCount}/${r.maxAccessCount}` },
          { title: 'Trang thai', dataIndex: 'status', key: 'status', width: 100,
            render: (v: string) => <Tag color={v === 'Active' ? 'green' : v === 'Revoked' ? 'red' : 'default'}>
              {v === 'Active' ? 'Hoat dong' : v === 'Revoked' ? 'Da thu hoi' : 'Het han'}</Tag> },
          { title: '', key: 'actions', width: 60,
            render: (_: unknown, r: EmrExtractDto) => r.status === 'Active' ? (
              <Popconfirm title="Thu hoi trich luc?" onConfirm={() => handleRevoke(r.id)}>
                <Button size="small" danger icon={<CloseCircleOutlined />} />
              </Popconfirm>
            ) : null },
        ]}
      />

      <Modal title="Tao trich luc benh an" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} okText="Tao" cancelText="Huy" width={480}>
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="examinationId" label="Ma kham" rules={[{ required: true }]}>
            <Input placeholder="ID kham benh" />
          </Form.Item>
          <Form.Item name="extractType" label="Loai trich luc" rules={[{ required: true }]} initialValue="Full">
            <Select>
              <Select.Option value="Full">Day du (toan bo BA)</Select.Option>
              <Select.Option value="Partial">Tung phan (chon bieu mau)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="formTypes" label="Bieu mau (neu chon tung phan)">
            <Select mode="multiple" placeholder="Chon cac bieu mau can trich">
              <Select.Option value="treatment-sheet">Phieu dieu tri</Select.Option>
              <Select.Option value="consultation">Hoi chan</Select.Option>
              <Select.Option value="nursing">Cham soc</Select.Option>
              <Select.Option value="vital-signs">Sinh hieu</Select.Option>
              <Select.Option value="lab-results">Ket qua XN</Select.Option>
              <Select.Option value="radiology">Ket qua CDHA</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="maxAccessCount" label="So lan truy cap toi da" initialValue={5}>
            <Input type="number" min={1} max={100} />
          </Form.Item>
          <Form.Item name="expiresAt" label="Han truy cap">
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder="De trong = 30 ngay" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ============ Tab 3: Gay BA (Spine B.1.5) ============
