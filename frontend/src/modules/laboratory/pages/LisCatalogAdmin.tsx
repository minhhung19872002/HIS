import React, { useCallback, useEffect, useState } from 'react';
import { useTabState } from '../../../hooks/useTabState';
import { Form, Input, InputNumber, Switch, Select, Modal } from 'antd';
import apiClient from '../../../services/apiClient';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import { searchAbbreviations, saveAbbreviation, deleteAbbreviation, ABBREVIATION_SCOPES } from '../../../api/abbreviation';
import { getSendingUnits, saveSendingUnit, deleteSendingUnit } from '../api/labQC';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, StatusBadge, ActBtn, Btn,
  tk, ti, tw, cf, type ColumnDef,
} from '@/_v2kit';
import { RefreshButton } from '../../../components/actions/RefreshButton/RefreshButton';

type TabKey = 'books' | 'groups' | 'units' | 'organisms' | 'antibiotics' | 'chemicals' | 'abbr' | 'tests' | 'sendingunits';
const TABS = [
  { v: 'books' as TabKey,       l: 'Sổ XN',       ic: 'archive' },
  { v: 'groups' as TabKey,      l: 'Nhóm XN',     ic: 'list' },
  { v: 'tests' as TabKey,       l: 'Chỉ số XN',   ic: 'bar-chart' },
  { v: 'units' as TabKey,       l: 'Đơn vị đo',   ic: 'activity' },
  { v: 'organisms' as TabKey,   l: 'Vi khuẩn',    ic: 'heart' },
  { v: 'antibiotics' as TabKey, l: 'Kháng sinh',  ic: 'medicine' },
  { v: 'chemicals' as TabKey,   l: 'Hóa chất',    ic: 'package' },
  { v: 'abbr' as TabKey,        l: 'Viết tắt KQ', ic: 'file-text' },
  // NangCap26 LIS #15 — CSYT/phòng khám gửi mẫu về labo
  { v: 'sendingunits' as TabKey, l: 'Đơn vị gửi mẫu', ic: 'send' },
];

const GRAM_OPTIONS = [{ label: 'Gram (+)', value: '+' }, { label: 'Gram (-)', value: '-' }, { label: 'Thay đổi', value: 'Variable' }];
const DRUG_CLASS_OPTIONS = ['Beta-lactam', 'Fluoroquinolone', 'Aminoglycoside', 'Macrolide', 'Tetracycline', 'Glycopeptide', 'Carbapenem', 'Sulfonamide', 'Other'].map((v) => ({ label: v, value: v }));
const ROUTE_OPTIONS = ['PO', 'IV', 'IM', 'Topical', 'Inhaled'].map((v) => ({ label: v, value: v }));
const DATA_TYPE_OPTIONS = ['Number', 'Text', 'Enum'].map((v) => ({ label: v, value: v }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const LisCatalogAdminV2: React.FC = () => {
  const [tab, setTab] = useTabState<TabKey>('books');
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();
  const [books, setBooks] = useState<Row[]>([]);
  const [services, setServices] = useState<Row[]>([]);
  const [supplies, setSupplies] = useState<Row[]>([]);
  const [testGroups, setTestGroups] = useState<Row[]>([]);
  const [sampleTypes, setSampleTypes] = useState<Row[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'abbr') {
        // Viết tắt KQ XN — nguồn AbbreviationController (scope LAB), filter keyword client-side
        const list = await searchAbbreviations(ABBREVIATION_SCOPES.LAB) || [];
        const kw = keyword.trim().toLowerCase();
        setData((kw ? list.filter((a) => a.code.toLowerCase().includes(kw) || a.expansion.toLowerCase().includes(kw)) : list) as unknown as Row[]);
      } else if (tab === 'sendingunits') {
        // NangCap26 LIS #15 — route riêng /LISComplete/sending-units, lọc keyword client-side
        const list = (await getSendingUnits(false)).data || [];
        const kw = keyword.trim().toLowerCase();
        setData((kw ? list.filter((u) => u.code.toLowerCase().includes(kw) || u.name.toLowerCase().includes(kw)) : list) as unknown as Row[]);
      } else {
        const params = keyword ? { keyword } : {};
        const { data } = await apiClient.get(`/lis-catalog/${tab}`, { params });
        setData(normalizeArrayResponse<Row>(data));
      }
    } catch { ti('Tải danh sách thất bại'); }
    finally { setLoading(false); }
  }, [tab, keyword]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      // #467: các danh mục phụ trợ nạp nền — lỗi lẻ không chặn nghiệp vụ, gom 1 toast tổng hợp.
      let failed = 0;
      try { const { data: b } = await apiClient.get('/lis-catalog/books', { params: { isActive: true } }); setBooks(Array.isArray(b) ? (b as Row[]) : []); } catch (e) { failed++; console.warn('[lis-catalog] books:', e); }
      try { const { data: s } = await apiClient.get('/catalog/paraclinical-services', { params: { serviceType: 2, isActive: true } });
        setServices(normalizeArrayResponse<Row>(s)); } catch (e) { failed++; console.warn('[lis-catalog] services:', e); }
      try { const { data: sp } = await apiClient.get('/catalog/medical-supplies', { params: { isActive: true } });
        setSupplies(normalizeArrayResponse<Row>(sp)); } catch (e) { failed++; console.warn('[lis-catalog] supplies:', e); }
      try { const { data: tg } = await apiClient.get('/lis-catalog/groups', { params: { isActive: true } });
        setTestGroups(normalizeArrayResponse<Row>(tg)); } catch (e) { failed++; console.warn('[lis-catalog] groups:', e); }
      try { const { data: st } = await apiClient.get('/lis-catalog/sample-types', { params: { isActive: true } });
        setSampleTypes(normalizeArrayResponse<Row>(st)); } catch (e) { failed++; console.warn('[lis-catalog] sample-types:', e); }
      if (failed > 0) tw(`Không tải được ${failed}/5 danh mục phụ trợ — một số ô chọn có thể trống. Hãy tải lại trang.`);
    })();
  }, []);

  const submit = async () => {
    if (saving) return;
    const v = await form.validateFields();
    const payload = { ...(editing ?? {}), ...v };
    setSaving(true);
    try {
      if (tab === 'abbr') {
        await saveAbbreviation({
          id: editing?.id, code: payload.code, expansion: payload.expansion,
          scope: ABBREVIATION_SCOPES.LAB, ownerOnly: false, sortOrder: payload.sortOrder ?? 0,
        });
      } else if (tab === 'sendingunits') {
        await saveSendingUnit(payload);
      } else {
        await apiClient.post(`/lis-catalog/${tab}`, payload);
      }
      tk(editing ? 'Đã cập nhật' : 'Đã thêm'); setModalOpen(false); load();
    }
    catch { tw('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  const remove = (row: Row) => cf('Xóa mục này?', async () => {
    try {
      if (tab === 'abbr') await deleteAbbreviation(row.id);
      else if (tab === 'sendingunits') await deleteSendingUnit(row.id);
      else await apiClient.delete(`/lis-catalog/${tab}/${row.id}`);
      tk('Đã xóa'); load();
    }
    catch { tw('Xóa thất bại'); }
  }, { tone: 'crit', confirm: 'Xóa' });

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (row: Row) => { setEditing(row); form.setFieldsValue({ ...row, isActive: row.isActive ?? true }); setModalOpen(true); };

  const colsByTab: Record<TabKey, ColumnDef<Row>[]> = {
    tests: [
      { key: 'code', label: 'Mã', code: true, render: (r) => r.code },
      { key: 'name', label: 'Tên chỉ số', render: (r) => r.name },
      { key: 'unit', label: 'Đơn vị', mono: true, render: (r) => r.unit || '—' },
      { key: 'hl7', label: 'HL7', code: true, render: (r) => r.hl7Code || '—' },
      { key: 'group', label: 'Nhóm', render: (r) => r.groupName || '—' },
      { key: 'sample', label: 'Bệnh phẩm', render: (r) => r.sampleTypeName || '—' },
      { key: 'svc', label: 'Dịch vụ giá', render: (r) => r.serviceName || '—' },
      { key: 'refM', label: 'TK Nam', mono: true, render: (r) => r.normalMinMale != null ? `${r.normalMinMale}–${r.normalMaxMale}` : '—' },
      { key: 'refF', label: 'TK Nữ', mono: true, render: (r) => r.normalMinFemale != null ? `${r.normalMinFemale}–${r.normalMaxFemale}` : '—' },
      { key: 'crit', label: 'Cảnh báo', mono: true, render: (r) => r.criticalLow != null ? `${r.criticalLow}–${r.criticalHigh}` : '—' },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
    ],
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
    abbr: [
      { key: 'code', label: 'Từ tắt', code: true, render: (r) => r.code },
      { key: 'expansion', label: 'Bung thành', render: (r) => r.expansion },
      { key: 'order', label: 'STT', mono: true, render: (r) => r.sortOrder ?? 0 },
      { key: 'usage', label: 'Đã dùng', mono: true, render: (r) => r.usageCount ?? 0 },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive !== false ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
    ],
    sendingunits: [
      { key: 'code', label: 'Mã đơn vị', code: true, render: (r) => r.code },
      { key: 'name', label: 'Tên đơn vị gửi mẫu', render: (r) => r.name },
      { key: 'facility', label: 'Mã CSYT', code: true, render: (r) => r.facilityCode || '—' },
      { key: 'contact', label: 'Người liên hệ', render: (r) => r.contactPerson || '—' },
      { key: 'phone', label: 'Điện thoại', mono: true, render: (r) => r.phoneNumber || '—' },
      { key: 'addr', label: 'Địa chỉ', render: (r) => r.address || '—' },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive !== false ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
    ],
  };

  const formFieldsByTab: Record<TabKey, React.ReactElement> = {
    tests: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <Form.Item label="Mã chỉ số" name="code" rules={[{ required: true }]}><Input placeholder="vd: Hb, WBC…" /></Form.Item>
        <Form.Item label="Mã HL7" name="hl7Code"><Input placeholder="Mã trao đổi HL7" /></Form.Item>
      </div>
      <Form.Item label="Tên chỉ số" name="name" rules={[{ required: true }]}><Input /></Form.Item>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <Form.Item label="Kiểu kết quả" name="dataType" initialValue="Number"><Select options={DATA_TYPE_OPTIONS} /></Form.Item>
        <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
      </div>
      <Form.Item label="Nhóm XN" name="groupId">
        <Select allowClear showSearch optionFilterProp="label"
          options={testGroups.map((g) => ({ label: `${g.groupCode} — ${g.groupName}`, value: g.id }))} />
      </Form.Item>
      <Form.Item label="Dịch vụ viện phí (G-23)" name="serviceId">
        <Select allowClear showSearch optionFilterProp="label"
          options={services.map((s) => ({ label: `${s.serviceCode} — ${s.serviceName}`, value: s.id }))} />
      </Form.Item>
      <Form.Item label="Loại bệnh phẩm" name="sampleTypeId">
        <Select allowClear showSearch optionFilterProp="label"
          options={sampleTypes.map((st) => ({ label: `${st.code} — ${st.name}`, value: st.id }))} />
      </Form.Item>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <Form.Item label="Đơn vị tính" name="unit"><Input placeholder="g/dL, mmol/L…" /></Form.Item>
        <Form.Item label="Đơn vị in phiếu" name="printUnit"><Input placeholder="Để trống = dùng đơn vị tính" /></Form.Item>
      </div>
      <Form.Item label="Mô tả / Ghi chú KTV" name="description"><Input.TextArea rows={2} placeholder="Ghi chú dành cho kỹ thuật viên…" /></Form.Item>
      <div style={{ marginBottom: 'var(--space-8)', fontWeight: 500, color: '#595959' }}>Dải tham chiếu theo giới</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-12)' }}>
        <Form.Item label="Nam Min" name="normalMinMale"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="Nam Max" name="normalMaxMale"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="Nữ Min" name="normalMinFemale"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="Nữ Max" name="normalMaxFemale"><InputNumber style={{ width: '100%' }} /></Form.Item>
      </div>
      <div style={{ marginBottom: 'var(--space-8)', fontWeight: 500, color: '#d4380d' }}>Ngưỡng cảnh báo nguy hiểm</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <Form.Item label="Critical Low" name="criticalLow"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="Critical High" name="criticalHigh"><InputNumber style={{ width: '100%' }} /></Form.Item>
      </div>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
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
    abbr: <>
      <Form.Item label="Từ viết tắt" name="code" rules={[{ required: true }]}><Input placeholder="vd: hc, bc, tc…" /></Form.Item>
      <Form.Item label="Bung thành" name="expansion" rules={[{ required: true }]}><Input.TextArea rows={2} placeholder="vd: Hồng cầu trong giới hạn bình thường" /></Form.Item>
      <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
    </>,
    sendingunits: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <Form.Item label="Mã đơn vị" name="code" rules={[{ required: true }]}><Input placeholder="vd: PKDK-AN" /></Form.Item>
        <Form.Item label="Mã CSYT (BHYT)" name="facilityCode"><Input placeholder="5 số, vd: 89001" /></Form.Item>
      </div>
      <Form.Item label="Tên đơn vị gửi mẫu" name="name" rules={[{ required: true }]}><Input placeholder="Phòng khám / TYT / CSYT gửi mẫu về labo" /></Form.Item>
      <Form.Item label="Địa chỉ" name="address"><Input /></Form.Item>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <Form.Item label="Người liên hệ" name="contactPerson"><Input /></Form.Item>
        <Form.Item label="Điện thoại" name="phoneNumber"><Input /></Form.Item>
      </div>
      <Form.Item label="Email" name="email"><Input type="email" /></Form.Item>
      <Form.Item label="Ghi chú" name="notes"><Input.TextArea rows={2} /></Form.Item>
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
          <RefreshButton onRefresh={load} loading={loading} />
          <Btn variant="primary" icon="plus" onClick={openAdd}>Thêm mới</Btn>
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm kiếm…" />
        <Btn variant="ghost" icon="x" onClick={() => { setKeyword(''); load(); }}>Bỏ lọc</Btn>
      </div>

      <DataTable<Row>
        columns={colsByTab[tab]} data={data} rowKey={(r) => r.id}
        onRowClick={openEdit}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
            <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => remove(r)} />
          </div>
        )}
        loading={loading}
        empty={'Không có dữ liệu'}
      />

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={editing ? 'Sửa' : 'Thêm mới'}
        onOk={submit}
        confirmLoading={saving}
        okText={saving ? 'Đang lưu…' : 'Lưu'}
        cancelText="Hủy"
        maskClosable={!saving}
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
