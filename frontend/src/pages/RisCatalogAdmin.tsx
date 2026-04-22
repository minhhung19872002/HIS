/**
 * RIS admin — danh mục CĐHA (N1.11).
 * Modality / BodyPart / Protocol / ReportTemplate.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Tabs, Table, Button, Modal, Form, Input, InputNumber, Switch, Select, Space, message, Popconfirm, Tag,
} from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, ScanOutlined } from '@ant-design/icons';
import apiClient from '../api/client';

type TabKey = 'modalities' | 'body-parts' | 'protocols' | 'report-templates';

const MODALITY_TYPE_OPTIONS = [
  { label: 'X-quang (1)', value: 1 },
  { label: 'CT (2)', value: 2 },
  { label: 'MRI (3)', value: 3 },
  { label: 'Siêu âm (4)', value: 4 },
  { label: 'Nhũ ảnh (5)', value: 5 },
  { label: 'PET (6)', value: 6 },
  { label: 'Khác (7)', value: 7 },
];
const REGION_OPTIONS = ['HEAD', 'NECK', 'CHEST', 'ABDOMEN', 'PELVIS', 'SPINE', 'EXTREMITY', 'WHOLE_BODY']
  .map(v => ({ label: v, value: v }));
const POSITION_OPTIONS = ['Standing', 'Supine', 'Prone', 'Decubitus', 'Lateral', 'Sitting']
  .map(v => ({ label: v, value: v }));

export default function RisCatalogAdmin() {
  const [tab, setTab] = useState<TabKey>('modalities');
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form] = Form.useForm();

  const [modalities, setModalities] = useState<any[]>([]);
  const [bodyParts, setBodyParts] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (keyword) params.keyword = keyword;
      const { data } = await apiClient.get(`/ris-catalog/${tab}`, { params });
      setData(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tải danh sách thất bại');
    } finally { setLoading(false); }
  }, [tab, keyword]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const { data: m } = await apiClient.get('/ris-catalog/modalities', { params: { isActive: true } });
        setModalities(Array.isArray(m) ? m : []);
      } catch { /* empty */ }
      try {
        const { data: b } = await apiClient.get('/ris-catalog/body-parts');
        setBodyParts(Array.isArray(b) ? b : []);
      } catch { /* empty */ }
    })();
  }, [tab]);

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (row: any) => {
    setEditing(row);
    form.setFieldsValue({ ...row, isActive: row.isActive ?? true });
    setModalOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    const payload = { ...(editing ?? {}), ...v };
    try {
      await apiClient.post(`/ris-catalog/${tab}`, payload);
      message.success(editing ? 'Đã cập nhật' : 'Đã thêm');
      setModalOpen(false);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Lưu thất bại');
    }
  };

  const remove = async (row: any) => {
    try {
      await apiClient.delete(`/ris-catalog/${tab}/${row.id}`);
      message.success('Đã xóa');
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Xóa thất bại');
    }
  };

  const actionCol: any = {
    title: 'Thao tác',
    width: 140,
    render: (_: any, r: any) => (
      <Space size="small">
        <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
        <Popconfirm title="Xóa?" onConfirm={() => remove(r)}>
          <Button icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      </Space>
    ),
  };
  const activeCol: any = {
    title: 'Hoạt động', dataIndex: 'isActive', width: 100,
    render: (v: boolean) => v ? <Tag color="green">Có</Tag> : <Tag>Ẩn</Tag>,
  };

  const columnsByTab: Record<TabKey, any[]> = {
    modalities: [
      { title: 'Mã', dataIndex: 'modalityCode', width: 100 },
      { title: 'Tên', dataIndex: 'modalityName' },
      { title: 'Loại', dataIndex: 'modalityType', width: 130,
        render: (v: number) => MODALITY_TYPE_OPTIONS.find(o => o.value === v)?.label || String(v) },
      activeCol, actionCol,
    ],
    'body-parts': [
      { title: 'Mã', dataIndex: 'bodyPartCode', width: 100 },
      { title: 'Tên', dataIndex: 'bodyPartName' },
      { title: 'Tên TA', dataIndex: 'englishName', width: 160 },
      { title: 'DICOM', dataIndex: 'dicomCode', width: 100 },
      { title: 'Khu vực', dataIndex: 'region', width: 120 },
      activeCol, actionCol,
    ],
    protocols: [
      { title: 'Mã', dataIndex: 'protocolCode', width: 100 },
      { title: 'Tên', dataIndex: 'protocolName' },
      { title: 'Modality', dataIndex: 'modalityName', width: 140 },
      { title: 'Vị trí', dataIndex: 'bodyPartName', width: 140 },
      { title: 'Có thuốc cản quang', dataIndex: 'useContrast', width: 140,
        render: (v: boolean) => v ? <Tag color="orange">Có</Tag> : '-' },
      { title: 'kVp', dataIndex: 'kvp', width: 70 },
      { title: 'mAs', dataIndex: 'mas', width: 70 },
      activeCol, actionCol,
    ],
    'report-templates': [
      { title: 'Mã', dataIndex: 'templateCode', width: 120 },
      { title: 'Tên', dataIndex: 'templateName' },
      { title: 'Modality', dataIndex: 'modalityName', width: 140 },
      { title: 'Vị trí', dataIndex: 'bodyPartName', width: 140 },
      activeCol, actionCol,
    ],
  };

  const formFieldsByTab: Record<TabKey, React.ReactElement> = {
    modalities: <>
      <Form.Item label="Mã modality" name="modalityCode" rules={[{ required: true }]}>
        <Input placeholder="XR, CT, MR, US..." />
      </Form.Item>
      <Form.Item label="Tên modality" name="modalityName" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Loại" name="modalityType" rules={[{ required: true }]}>
        <Select options={MODALITY_TYPE_OPTIONS} />
      </Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
    'body-parts': <>
      <Form.Item label="Mã" name="bodyPartCode" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Tên (VN)" name="bodyPartName" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Tên (EN)" name="englishName"><Input /></Form.Item>
      <Form.Item label="Mã DICOM" name="dicomCode"><Input /></Form.Item>
      <Form.Item label="Khu vực" name="region"><Select allowClear options={REGION_OPTIONS} /></Form.Item>
      <Form.Item label="Mô tả" name="description"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
    protocols: <>
      <Form.Item label="Mã" name="protocolCode" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Tên" name="protocolName" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Modality" name="modalityId">
        <Select allowClear showSearch optionFilterProp="label"
          options={modalities.map(m => ({ label: `${m.modalityCode} - ${m.modalityName}`, value: m.id }))} />
      </Form.Item>
      <Form.Item label="Vị trí" name="bodyPartId">
        <Select allowClear showSearch optionFilterProp="label"
          options={bodyParts.map(b => ({ label: `${b.bodyPartCode} - ${b.bodyPartName}`, value: b.id }))} />
      </Form.Item>
      <Form.Item label="Có thuốc cản quang" name="useContrast" valuePropName="checked"><Switch /></Form.Item>
      <Form.Item label="Chất cản quang" name="contrastAgent"><Input /></Form.Item>
      <Form.Item label="Liều cản quang" name="contrastDose"><Input /></Form.Item>
      <Form.Item label="kVp" name="kvp"><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
      <Form.Item label="mAs" name="mas"><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
      <Form.Item label="Slice thickness (mm)" name="sliceThickness"><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
      <Form.Item label="Tư thế" name="position"><Select allowClear options={POSITION_OPTIONS} /></Form.Item>
      <Form.Item label="Hướng dẫn" name="instructions"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item label="Ghi chú" name="notes"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
    'report-templates': <>
      <Form.Item label="Mã" name="templateCode" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Tên" name="templateName" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Modality" name="modalityId">
        <Select allowClear showSearch optionFilterProp="label"
          options={modalities.map(m => ({ label: `${m.modalityCode} - ${m.modalityName}`, value: m.id }))} />
      </Form.Item>
      <Form.Item label="Vị trí" name="bodyPartId">
        <Select allowClear showSearch optionFilterProp="label"
          options={bodyParts.map(b => ({ label: `${b.bodyPartCode} - ${b.bodyPartName}`, value: b.id }))} />
      </Form.Item>
      <Form.Item label="Kỹ thuật" name="techniqueText"><Input.TextArea rows={3} /></Form.Item>
      <Form.Item label="Findings mẫu" name="findingsTemplate"><Input.TextArea rows={4} /></Form.Item>
      <Form.Item label="Kết luận mẫu" name="impressionTemplate"><Input.TextArea rows={3} /></Form.Item>
      <Form.Item label="Ghi chú" name="note"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
  };

  return (
    <div>
      <Card title={<Space><ScanOutlined /> CĐHA - Quản lý danh mục (N1.11)</Space>}
        extra={<Space>
          <Input.Search placeholder="Tìm kiếm..." value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load}
            style={{ width: 240 }} allowClear />
          <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Thêm mới</Button>
        </Space>}
      >
        <Tabs
          activeKey={tab}
          onChange={k => { setTab(k as TabKey); setKeyword(''); }}
          items={[
            { key: 'modalities', label: 'Modality' },
            { key: 'body-parts', label: 'Vị trí chụp' },
            { key: 'protocols', label: 'Giao thức' },
            { key: 'report-templates', label: 'Mẫu báo cáo' },
          ]}
        />
        <Table
          size="small"
          rowKey="id"
          dataSource={data}
          columns={columnsByTab[tab]}
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? 'Sửa' : 'Thêm mới'}
        onCancel={() => setModalOpen(false)}
        onOk={submit}
        width={640}
        okText="Lưu"
      >
        <Form form={form} layout="vertical">
          {formFieldsByTab[tab]}
        </Form>
      </Modal>
    </div>
  );
}
