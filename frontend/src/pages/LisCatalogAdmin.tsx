/**
 * LIS admin - 6 danh mục CRUD (N1.10).
 * Sổ XN / Nhóm XN / Đơn vị đo / Vi khuẩn / Kháng sinh / Hóa chất.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Tabs, Table, Button, Modal, Form, Input, InputNumber, Switch, Select, Space, message, Popconfirm, Tag,
} from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, ExperimentOutlined } from '@ant-design/icons';
import apiClient from '../api/client';

type TabKey = 'books' | 'groups' | 'units' | 'organisms' | 'antibiotics' | 'chemicals';

interface TabConfig {
  key: TabKey;
  label: string;
  idField: string;
  loadParams?: Record<string, any>;
  columns: any[];
  formFields: (form: any, options: any) => React.ReactElement;
  emptyRow: any;
}

const GRAM_OPTIONS = [
  { label: 'Gram (+)', value: '+' },
  { label: 'Gram (-)', value: '-' },
  { label: 'Thay đổi', value: 'Variable' },
];
const DRUG_CLASS_OPTIONS = [
  'Beta-lactam', 'Fluoroquinolone', 'Aminoglycoside', 'Macrolide', 'Tetracycline',
  'Glycopeptide', 'Carbapenem', 'Sulfonamide', 'Other',
].map(v => ({ label: v, value: v }));
const ROUTE_OPTIONS = ['PO', 'IV', 'IM', 'Topical', 'Inhaled'].map(v => ({ label: v, value: v }));

export default function LisCatalogAdmin() {
  const [tab, setTab] = useState<TabKey>('books');
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form] = Form.useForm();

  // Option sources loaded once
  const [books, setBooks] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (keyword) params.keyword = keyword;
      const { data } = await apiClient.get(`/lis-catalog/${tab}`, { params });
      setData(Array.isArray(data) ? data : (data?.items ?? []));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tải danh sách thất bại');
    } finally { setLoading(false); }
  }, [tab, keyword]);

  useEffect(() => { load(); }, [load]);

  // Load lookups once
  useEffect(() => {
    (async () => {
      try {
        const { data: b } = await apiClient.get('/lis-catalog/books', { params: { isActive: true } });
        setBooks(Array.isArray(b) ? b : []);
      } catch { /* empty */ }
      try {
        const { data: s } = await apiClient.get('/catalog/services', { params: { serviceType: 'XN', isActive: true } });
        setServices(Array.isArray(s) ? s : (s?.items ?? []));
      } catch { /* empty */ }
      try {
        const { data: sp } = await apiClient.get('/catalog/supplies', { params: { isActive: true } });
        setSupplies(Array.isArray(sp) ? sp : (sp?.items ?? []));
      } catch { /* empty */ }
    })();
  }, []);

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
      await apiClient.post(`/lis-catalog/${tab}`, payload);
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
      await apiClient.delete(`/lis-catalog/${tab}/${row.id}`);
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
    title: 'Hoạt động',
    dataIndex: 'isActive',
    width: 100,
    render: (v: boolean) => v ? <Tag color="green">Có</Tag> : <Tag>Ẩn</Tag>,
  };

  const columnsByTab: Record<TabKey, any[]> = {
    books: [
      { title: 'Mã', dataIndex: 'bookCode', width: 120 },
      { title: 'Tên sổ', dataIndex: 'bookName' },
      { title: 'Prefix', dataIndex: 'barcodePrefix', width: 90 },
      { title: 'STT', dataIndex: 'sortOrder', width: 70 },
      { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
      activeCol, actionCol,
    ],
    groups: [
      { title: 'Sổ', dataIndex: 'labBookId', width: 180,
        render: (id: string) => books.find(b => b.id === id)?.bookName || '-' },
      { title: 'Mã', dataIndex: 'groupCode', width: 120 },
      { title: 'Tên nhóm', dataIndex: 'groupName' },
      { title: 'STT', dataIndex: 'sortOrder', width: 70 },
      activeCol, actionCol,
    ],
    units: [
      { title: 'Mã', dataIndex: 'unitCode', width: 100 },
      { title: 'Tên', dataIndex: 'unitName' },
      { title: 'Ký hiệu', dataIndex: 'unitSymbol', width: 110 },
      { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
      activeCol, actionCol,
    ],
    organisms: [
      { title: 'Mã', dataIndex: 'organismCode', width: 100 },
      { title: 'Tên', dataIndex: 'organismName' },
      { title: 'Tên Latin', dataIndex: 'latinName', ellipsis: true },
      { title: 'Gram', dataIndex: 'gramType', width: 80 },
      { title: 'Hình thái', dataIndex: 'morphologyType', width: 120 },
      { title: 'Loại', dataIndex: 'category', width: 120 },
      activeCol, actionCol,
    ],
    antibiotics: [
      { title: 'Mã', dataIndex: 'antibioticCode', width: 100 },
      { title: 'Tên', dataIndex: 'antibioticName' },
      { title: 'Hoạt chất', dataIndex: 'genericName', ellipsis: true },
      { title: 'ATC', dataIndex: 'atcCode', width: 100 },
      { title: 'Nhóm', dataIndex: 'drugClass', width: 140 },
      { title: 'Đường', dataIndex: 'route', width: 80 },
      { title: 'AMS', dataIndex: 'isRestricted', width: 80,
        render: (v: boolean) => v ? <Tag color="orange">Hạn chế</Tag> : '-' },
      activeCol, actionCol,
    ],
    chemicals: [
      { title: 'Dịch vụ', dataIndex: 'serviceName' },
      { title: 'Vật tư', dataIndex: 'supplyName' },
      { title: 'SL/lần XN', dataIndex: 'quantityPerTest', width: 110, align: 'right' },
      { title: 'ĐV', dataIndex: 'unit', width: 80 },
      { title: 'Đối tượng', dataIndex: 'objectType', width: 110 },
      activeCol, actionCol,
    ],
  };

  const formFieldsByTab: Record<TabKey, React.ReactElement> = {
    books: <>
      <Form.Item label="Mã sổ" name="bookCode" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Tên sổ" name="bookName" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Prefix barcode" name="barcodePrefix"><Input maxLength={10} /></Form.Item>
      <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
      <Form.Item label="Mô tả" name="description"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
    groups: <>
      <Form.Item label="Sổ XN" name="labBookId" rules={[{ required: true }]}>
        <Select options={books.map(b => ({ label: `${b.bookCode} - ${b.bookName}`, value: b.id }))} showSearch optionFilterProp="label" />
      </Form.Item>
      <Form.Item label="Mã nhóm" name="groupCode" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Tên nhóm" name="groupName" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
    units: <>
      <Form.Item label="Mã" name="unitCode" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Tên" name="unitName" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Ký hiệu" name="unitSymbol"><Input placeholder="mmol/L, g/dL..." /></Form.Item>
      <Form.Item label="Mô tả" name="description"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
    organisms: <>
      <Form.Item label="Mã" name="organismCode" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Tên" name="organismName" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Tên Latin" name="latinName"><Input /></Form.Item>
      <Form.Item label="Gram" name="gramType"><Select allowClear options={GRAM_OPTIONS} /></Form.Item>
      <Form.Item label="Hình thái" name="morphologyType"><Input /></Form.Item>
      <Form.Item label="Loại" name="category"><Input placeholder="Gram+, Gram-, Fungi, Virus..." /></Form.Item>
      <Form.Item label="Ghi chú" name="notes"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
    antibiotics: <>
      <Form.Item label="Mã" name="antibioticCode" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Tên" name="antibioticName" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Hoạt chất (generic)" name="genericName"><Input /></Form.Item>
      <Form.Item label="Mã ATC" name="atcCode"><Input /></Form.Item>
      <Form.Item label="Nhóm thuốc" name="drugClass"><Select allowClear options={DRUG_CLASS_OPTIONS} /></Form.Item>
      <Form.Item label="Đường dùng" name="route"><Select allowClear options={ROUTE_OPTIONS} /></Form.Item>
      <Form.Item label="Cần duyệt (AMS)" name="isRestricted" valuePropName="checked"><Switch /></Form.Item>
      <Form.Item label="Ghi chú" name="notes"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
    chemicals: <>
      <Form.Item label="Dịch vụ XN" name="serviceId" rules={[{ required: true }]}>
        <Select showSearch optionFilterProp="label"
          options={services.map(s => ({ label: `${s.serviceCode} - ${s.serviceName}`, value: s.id }))} />
      </Form.Item>
      <Form.Item label="Vật tư" name="medicalSupplyId" rules={[{ required: true }]}>
        <Select showSearch optionFilterProp="label"
          options={supplies.map(s => ({ label: `${s.supplyCode} - ${s.supplyName}`, value: s.id }))} />
      </Form.Item>
      <Form.Item label="SL tiêu hao / lần XN" name="quantityPerTest" rules={[{ required: true }]}>
        <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item label="Đơn vị" name="unit"><Input /></Form.Item>
      <Form.Item label="Đối tượng" name="objectType" initialValue="HaoPhi">
        <Select options={[{ label: 'Hao phí', value: 'HaoPhi' }, { label: 'Thu phí', value: 'ThuPhi' }]} />
      </Form.Item>
      <Form.Item label="Ghi chú" name="note"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
  };

  return (
    <div>
      <Card title={<Space><ExperimentOutlined /> LIS - Quản lý danh mục (N1.10)</Space>}
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
            { key: 'books', label: 'Sổ XN' },
            { key: 'groups', label: 'Nhóm XN' },
            { key: 'units', label: 'Đơn vị đo' },
            { key: 'organisms', label: 'Vi khuẩn' },
            { key: 'antibiotics', label: 'Kháng sinh' },
            { key: 'chemicals', label: 'Hóa chất' },
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
        width={620}
        okText="Lưu"
      >
        <Form form={form} layout="vertical">
          {formFieldsByTab[tab]}
        </Form>
      </Modal>
    </div>
  );
}
