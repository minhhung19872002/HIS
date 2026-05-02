import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input, InputNumber, Switch, Select, Modal } from 'antd';
import apiClient from '../api/client';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, StatusBadge, ActBtn,
  Ico, tk, ti, tw, cf, type ColumnDef,
} from './_v2kit';

type TabKey = 'books' | 'groups' | 'units' | 'organisms' | 'antibiotics' | 'chemicals';
const TABS = [
  { v: 'books' as TabKey,       l: 'Sổ XN',      ic: 'archive' },
  { v: 'groups' as TabKey,      l: 'Nhóm XN',    ic: 'list' },
  { v: 'units' as TabKey,       l: 'Đơn vị đo',  ic: 'activity' },
  { v: 'organisms' as TabKey,   l: 'Vi khuẩn',   ic: 'heart' },
  { v: 'antibiotics' as TabKey, l: 'Kháng sinh', ic: 'medicine' },
  { v: 'chemicals' as TabKey,   l: 'Hóa chất',   ic: 'package' },
];

const GRAM_OPTIONS = [{ label: 'Gram (+)', value: '+' }, { label: 'Gram (-)', value: '-' }, { label: 'Thay đổi', value: 'Variable' }];
const DRUG_CLASS_OPTIONS = ['Beta-lactam', 'Fluoroquinolone', 'Aminoglycoside', 'Macrolide', 'Tetracycline', 'Glycopeptide', 'Carbapenem', 'Sulfonamide', 'Other'].map((v) => ({ label: v, value: v }));
const ROUTE_OPTIONS = ['PO', 'IV', 'IM', 'Topical', 'Inhaled'].map((v) => ({ label: v, value: v }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const LisCatalogAdminV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('books');
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();
  const [books, setBooks] = useState<Row[]>([]);
  const [services, setServices] = useState<Row[]>([]);
  const [supplies, setSupplies] = useState<Row[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = keyword ? { keyword } : {};
      const { data } = await apiClient.get(`/lis-catalog/${tab}`, { params });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setData(Array.isArray(data) ? (data as Row[]) : ((data as any)?.items ?? []));
    } catch { ti('Tải danh sách thất bại'); }
    finally { setLoading(false); }
  }, [tab, keyword]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try { const { data: b } = await apiClient.get('/lis-catalog/books', { params: { isActive: true } }); setBooks(Array.isArray(b) ? (b as Row[]) : []); } catch { /* empty */ }
      try { const { data: s } = await apiClient.get('/catalog/services', { params: { serviceType: 'XN', isActive: true } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setServices(Array.isArray(s) ? (s as Row[]) : ((s as any)?.items ?? [])); } catch { /* empty */ }
      try { const { data: sp } = await apiClient.get('/catalog/supplies', { params: { isActive: true } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSupplies(Array.isArray(sp) ? (sp as Row[]) : ((sp as any)?.items ?? [])); } catch { /* empty */ }
    })();
  }, []);

  const submit = async () => {
    const v = await form.validateFields();
    const payload = { ...(editing ?? {}), ...v };
    try { await apiClient.post(`/lis-catalog/${tab}`, payload); tk(editing ? 'Đã cập nhật' : 'Đã thêm'); setModalOpen(false); load(); }
    catch { tw('Lưu thất bại'); }
  };

  const remove = (row: Row) => cf('Xóa mục này?', async () => {
    try { await apiClient.delete(`/lis-catalog/${tab}/${row.id}`); tk('Đã xóa'); load(); }
    catch { tw('Xóa thất bại'); }
  }, { tone: 'crit', confirm: 'Xóa' });

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (row: Row) => { setEditing(row); form.setFieldsValue({ ...row, isActive: row.isActive ?? true }); setModalOpen(true); };

  const colsByTab: Record<TabKey, ColumnDef<Row>[]> = {
    books: [
      { key: 'code', label: 'Mã', code: true, render: (r) => r.bookCode },
      { key: 'name', label: 'Tên sổ', render: (r) => r.bookName },
      { key: 'prefix', label: 'Prefix', code: true, render: (r) => r.barcodePrefix || '—' },
      { key: 'order', label: 'STT', mono: true, render: (r) => r.sortOrder ?? 0 },
      { key: 'desc', label: 'Mô tả', render: (r) => r.description || '—' },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
    ],
    groups: [
      { key: 'book', label: 'Sổ', render: (r) => books.find((b) => b.id === r.labBookId)?.bookName || '—' },
      { key: 'code', label: 'Mã', code: true, render: (r) => r.groupCode },
      { key: 'name', label: 'Tên nhóm', render: (r) => r.groupName },
      { key: 'order', label: 'STT', mono: true, render: (r) => r.sortOrder ?? 0 },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
    ],
    units: [
      { key: 'code', label: 'Mã', code: true, render: (r) => r.unitCode },
      { key: 'name', label: 'Tên', render: (r) => r.unitName },
      { key: 'symbol', label: 'Ký hiệu', mono: true, render: (r) => r.unitSymbol || '—' },
      { key: 'desc', label: 'Mô tả', render: (r) => r.description || '—' },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
    ],
    organisms: [
      { key: 'code', label: 'Mã', code: true, render: (r) => r.organismCode },
      { key: 'name', label: 'Tên', render: (r) => r.organismName },
      { key: 'latin', label: 'Tên Latin', render: (r) => r.latinName || '—' },
      { key: 'gram', label: 'Gram', render: (r) => r.gramType || '—' },
      { key: 'morph', label: 'Hình thái', render: (r) => r.morphologyType || '—' },
      { key: 'cat', label: 'Loại', render: (r) => r.category || '—' },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
    ],
    antibiotics: [
      { key: 'code', label: 'Mã', code: true, render: (r) => r.antibioticCode },
      { key: 'name', label: 'Tên', render: (r) => r.antibioticName },
      { key: 'gen', label: 'Hoạt chất', render: (r) => r.genericName || '—' },
      { key: 'atc', label: 'ATC', code: true, render: (r) => r.atcCode || '—' },
      { key: 'class', label: 'Nhóm', render: (r) => r.drugClass || '—' },
      { key: 'route', label: 'Đường', render: (r) => r.route || '—' },
      { key: 'ams', label: 'AMS', render: (r) => r.isRestricted ? <StatusBadge tone="warn">Hạn chế</StatusBadge> : '—' },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
    ],
    chemicals: [
      { key: 'svc', label: 'Dịch vụ', render: (r) => r.serviceName },
      { key: 'sup', label: 'Vật tư', render: (r) => r.supplyName },
      { key: 'qty', label: 'SL/lần XN', mono: true, render: (r) => r.quantityPerTest },
      { key: 'unit', label: 'ĐV', render: (r) => r.unit || '—' },
      { key: 'obj', label: 'Đối tượng', render: (r) => r.objectType },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
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
        <Select options={books.map((b) => ({ label: `${b.bookCode} — ${b.bookName}`, value: b.id }))} showSearch optionFilterProp="label" />
      </Form.Item>
      <Form.Item label="Mã nhóm" name="groupCode" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Tên nhóm" name="groupName" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
    units: <>
      <Form.Item label="Mã" name="unitCode" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Tên" name="unitName" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Ký hiệu" name="unitSymbol"><Input placeholder="mmol/L, g/dL…" /></Form.Item>
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
      <Form.Item label="Loại" name="category"><Input placeholder="Gram+, Gram-, Fungi, Virus…" /></Form.Item>
      <Form.Item label="Ghi chú" name="notes"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
    antibiotics: <>
      <Form.Item label="Mã" name="antibioticCode" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Tên" name="antibioticName" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="Hoạt chất" name="genericName"><Input /></Form.Item>
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
          options={services.map((s) => ({ label: `${s.serviceCode} — ${s.serviceName}`, value: s.id }))} />
      </Form.Item>
      <Form.Item label="Vật tư" name="medicalSupplyId" rules={[{ required: true }]}>
        <Select showSearch optionFilterProp="label"
          options={supplies.map((s) => ({ label: `${s.supplyCode} — ${s.supplyName}`, value: s.id }))} />
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
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Sổ XN', val: tab === 'books' ? data.length : books.length, sub: tab === 'books' ? 'tab này' : 'tổng', tone: 'info' },
        { lbl: 'Đang sửa', val: TABS.find((t) => t.v === tab)?.l || '—', sub: data.length + ' mục', tone: 'ok' },
        { lbl: 'Hoạt động', val: data.filter((r) => r.isActive).length, sub: 'đang dùng', tone: 'ok' },
        { lbl: 'Tổng mục', val: data.length, sub: 'trong tab' },
      ]} />

      <TopTabs<TabKey> tab={tab} setTab={(v) => { setTab(v); setKeyword(''); }} tabs={TABS} actions={
        <>
          <button className="ab-btn ghost" type="button" onClick={load}>
            <Ico name="refresh" size={12} /> Làm mới
          </button>
          <button className="ab-btn primary" type="button" onClick={openAdd}>
            <Ico name="plus" size={12} /> Thêm mới
          </button>
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm kiếm…" />
        <button className="ab-btn ghost" type="button" onClick={() => { setKeyword(''); load(); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
      </div>

      <DataTable<Row>
        columns={colsByTab[tab]} data={data} rowKey={(r) => r.id}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
            <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => remove(r)} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : 'Không có dữ liệu'}
      />

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={editing ? 'Sửa' : 'Thêm mới'}
        onOk={submit}
        okText="Lưu"
        cancelText="Hủy"
        width={620}
      >
        <Form form={form} layout="vertical">
          {formFieldsByTab[tab]}
        </Form>
      </Modal>
    </div>
  );
};

export default LisCatalogAdminV2;
