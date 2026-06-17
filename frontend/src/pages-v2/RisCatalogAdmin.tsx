import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input, InputNumber, Switch, Select, Modal } from 'antd';
import apiClient from '../api/client';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, StatusBadge, ActBtn, Btn,
  tk, ti, tw, cf, type ColumnDef,
} from './_v2kit';

type TabKey = 'modalities' | 'body-parts' | 'protocols' | 'report-templates' | 'icd-templates' | 'pttt-service-mappings';
const TABS = [
  { v: 'modalities' as TabKey,              l: 'Modality',           ic: 'qr' },
  { v: 'body-parts' as TabKey,              l: 'Vị trí chụp',       ic: 'user' },
  { v: 'protocols' as TabKey,               l: 'Giao thức',          ic: 'list' },
  { v: 'report-templates' as TabKey,        l: 'Mẫu báo cáo',       ic: 'file-text' },
  { v: 'icd-templates' as TabKey,           l: 'ICD → Mẫu KQ',      ic: 'link' },
  { v: 'pttt-service-mappings' as TabKey,   l: 'DV CĐHA → PTTT',    ic: 'scissors' },
];

const MODALITY_TYPE_OPTIONS = [
  { label: 'X-quang (1)', value: 1 }, { label: 'CT (2)', value: 2 },
  { label: 'MRI (3)', value: 3 }, { label: 'Siêu âm (4)', value: 4 },
  { label: 'Nhũ ảnh (5)', value: 5 }, { label: 'PET (6)', value: 6 },
  { label: 'Khác (7)', value: 7 },
];
const REGION_OPTIONS = ['HEAD', 'NECK', 'CHEST', 'ABDOMEN', 'PELVIS', 'SPINE', 'EXTREMITY', 'WHOLE_BODY'].map((v) => ({ label: v, value: v }));
const POSITION_OPTIONS = ['Standing', 'Supine', 'Prone', 'Decubitus', 'Lateral', 'Sitting'].map((v) => ({ label: v, value: v }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const RisCatalogAdminV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('modalities');
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();
  const [modalities, setModalities] = useState<Row[]>([]);
  const [bodyParts, setBodyParts] = useState<Row[]>([]);
  const [reportTemplates, setReportTemplates] = useState<Row[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = keyword ? { keyword } : {};
      const { data } = await apiClient.get(`/ris-catalog/${tab}`, { params });
      setData(Array.isArray(data) ? (data as Row[]) : []);
    } catch { ti('Tải danh sách thất bại'); }
    finally { setLoading(false); }
  }, [tab, keyword]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try { const { data: m } = await apiClient.get('/ris-catalog/modalities', { params: { isActive: true } }); setModalities(Array.isArray(m) ? (m as Row[]) : []); } catch { /* empty */ }
      try { const { data: b } = await apiClient.get('/ris-catalog/body-parts'); setBodyParts(Array.isArray(b) ? (b as Row[]) : []); } catch { /* empty */ }
      try { const { data: t } = await apiClient.get('/ris-catalog/report-templates', { params: { isActive: true } }); setReportTemplates(Array.isArray(t) ? (t as Row[]) : []); } catch { /* empty */ }
    })();
  }, [tab]);

  const submit = async () => {
    const v = await form.validateFields();
    const payload = { ...(editing ?? {}), ...v };
    try { await apiClient.post(`/ris-catalog/${tab}`, payload); tk(editing ? 'Đã cập nhật' : 'Đã thêm'); setModalOpen(false); load(); }
    catch { tw('Lưu thất bại'); }
  };

  const remove = (row: Row) => cf('Xóa mục này?', async () => {
    try { await apiClient.delete(`/ris-catalog/${tab}/${row.id}`); tk('Đã xóa'); load(); }
    catch { tw('Xóa thất bại'); }
  }, { tone: 'crit', confirm: 'Xóa' });

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (row: Row) => { setEditing(row); form.setFieldsValue({ ...row, isActive: row.isActive ?? true }); setModalOpen(true); };

  // surgeryNarrativeTemplates dùng cho tab PTTT mapping
  const [surgeryTemplates, setSurgeryTemplates] = useState<Row[]>([]);
  useEffect(() => {
    if (tab !== 'pttt-service-mappings') return;
    (async () => {
      try {
        const { data: st } = await apiClient.get('/clinical-narratives/surgery');
        setSurgeryTemplates(Array.isArray(st) ? (st as Row[]) : []);
      } catch { /* không sẵn sàng — không block tab khác */ }
    })();
  }, [tab]);

  const colsByTab: Record<TabKey, ColumnDef<Row>[]> = {
    modalities: [
      { key: 'code', label: 'Mã', code: true, render: (r) => r.modalityCode },
      { key: 'name', label: 'Tên', render: (r) => r.modalityName },
      { key: 'type', label: 'Loại', render: (r) => MODALITY_TYPE_OPTIONS.find((o) => o.value === r.modalityType)?.label || String(r.modalityType) },
      { key: 'maxPrint', label: 'Ảnh in', mono: true, render: (r) => r.maxImagesPerReport ?? '—' },
      { key: 'maxStore', label: 'Ảnh lưu', mono: true, render: (r) => r.maxImagesToStore ?? '—' },
      { key: 'defTpl', label: 'Mẫu mặc định', render: (r) => r.defaultResultTemplateName || '—' },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
    ],
    'icd-templates': [
      { key: 'icd', label: 'Mã ICD', code: true, render: (r) => r.icdCode },
      { key: 'icdName', label: 'Tên bệnh', render: (r) => r.icdName || '—' },
      { key: 'tpl', label: 'Mẫu kết quả', render: (r) => r.templateName || '—' },
      { key: 'mod', label: 'Modality', render: (r) => r.modalityName || 'Tất cả' },
      { key: 'order', label: 'STT', mono: true, render: (r) => r.sortOrder ?? 0 },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
    ],
    'body-parts': [
      { key: 'code', label: 'Mã', code: true, render: (r) => r.bodyPartCode },
      { key: 'name', label: 'Tên', render: (r) => r.bodyPartName },
      { key: 'eng', label: 'Tên TA', render: (r) => r.englishName || '—' },
      { key: 'dicom', label: 'DICOM', code: true, render: (r) => r.dicomCode || '—' },
      { key: 'region', label: 'Khu vực', render: (r) => r.region || '—' },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
    ],
    protocols: [
      { key: 'code', label: 'Mã', code: true, render: (r) => r.protocolCode },
      { key: 'name', label: 'Tên', render: (r) => r.protocolName },
      { key: 'mod', label: 'Modality', render: (r) => r.modalityName || '—' },
      { key: 'bp', label: 'Vị trí', render: (r) => r.bodyPartName || '—' },
      { key: 'contrast', label: 'Cản quang', render: (r) => r.useContrast ? <StatusBadge tone="warn">Có</StatusBadge> : '—' },
      { key: 'kvp', label: 'kVp', mono: true, render: (r) => r.kvp ?? '—' },
      { key: 'mas', label: 'mAs', mono: true, render: (r) => r.mas ?? '—' },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
    ],
    'report-templates': [
      { key: 'code', label: 'Mã', code: true, render: (r) => r.templateCode },
      { key: 'name', label: 'Tên', render: (r) => r.templateName },
      { key: 'mod', label: 'Modality', render: (r) => r.modalityName || '—' },
      { key: 'bp', label: 'Vị trí', render: (r) => r.bodyPartName || '—' },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
    ],
    'pttt-service-mappings': [
      { key: 'svc', label: 'Dịch vụ CĐHA', render: (r) => r.radiologyServiceName },
      { key: 'tpl', label: 'Mẫu tường trình PTTT', render: (r) => r.surgeryNarrativeTemplateName || '—' },
      { key: 'notes', label: 'Ghi chú', render: (r) => r.notes || '—' },
      { key: 'order', label: 'STT', mono: true, render: (r) => r.sortOrder ?? 0 },
      { key: 'active', label: 'Hoạt động', render: (r) => r.isActive ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Ẩn</StatusBadge> },
    ],
  };

  const formFieldsByTab: Record<TabKey, React.ReactElement> = {
    modalities: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <Form.Item label="Mã modality" name="modalityCode" rules={[{ required: true }]}><Input placeholder="XR, CT, MR, US…" /></Form.Item>
        <Form.Item label="Loại" name="modalityType" rules={[{ required: true }]}><Select options={MODALITY_TYPE_OPTIONS} /></Form.Item>
      </div>
      <Form.Item label="Tên modality" name="modalityName" rules={[{ required: true }]}><Input /></Form.Item>
      <div style={{ marginBottom: 'var(--space-8)', fontWeight: 500, color: '#595959' }}>Cấu hình ảnh (G-34a)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <Form.Item label="Số ảnh tối đa in report" name="maxImagesPerReport" initialValue={4}><InputNumber min={1} max={50} style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="Số ảnh tối đa lưu trữ" name="maxImagesToStore" initialValue={100}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
      </div>
      <Form.Item label="Mẫu kết quả mặc định (G-34b)" name="defaultResultTemplateId">
        <Select allowClear showSearch optionFilterProp="label"
          options={reportTemplates.map((t) => ({ label: `${t.templateCode} — ${t.templateName}`, value: t.id }))} />
      </Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
    'icd-templates': <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <Form.Item label="Mã ICD-10" name="icdCode" rules={[{ required: true }]}><Input placeholder="vd A00, J18.9" /></Form.Item>
        <Form.Item label="Tên bệnh" name="icdName"><Input placeholder="Cache tên bệnh để hiển thị" /></Form.Item>
      </div>
      <Form.Item label="Mẫu kết quả" name="templateId" rules={[{ required: true }]}>
        <Select showSearch optionFilterProp="label"
          options={reportTemplates.map((t) => ({ label: `${t.templateCode} — ${t.templateName}`, value: t.id }))} />
      </Form.Item>
      <Form.Item label="Lọc theo Modality (không bắt buộc)" name="modalityId">
        <Select allowClear showSearch optionFilterProp="label"
          options={modalities.map((m) => ({ label: `${m.modalityCode} — ${m.modalityName}`, value: m.id }))} />
      </Form.Item>
      <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
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
          options={modalities.map((m) => ({ label: `${m.modalityCode} — ${m.modalityName}`, value: m.id }))} />
      </Form.Item>
      <Form.Item label="Vị trí" name="bodyPartId">
        <Select allowClear showSearch optionFilterProp="label"
          options={bodyParts.map((b) => ({ label: `${b.bodyPartCode} — ${b.bodyPartName}`, value: b.id }))} />
      </Form.Item>
      <Form.Item label="Có thuốc cản quang" name="useContrast" valuePropName="checked"><Switch /></Form.Item>
      <Form.Item label="Chất cản quang" name="contrastAgent"><Input /></Form.Item>
      <Form.Item label="Liều cản quang" name="contrastDose"><Input /></Form.Item>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-12)' }}>
        <Form.Item label="kVp" name="kvp"><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="mAs" name="mas"><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="Slice (mm)" name="sliceThickness"><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
      </div>
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
          options={modalities.map((m) => ({ label: `${m.modalityCode} — ${m.modalityName}`, value: m.id }))} />
      </Form.Item>
      <Form.Item label="Vị trí" name="bodyPartId">
        <Select allowClear showSearch optionFilterProp="label"
          options={bodyParts.map((b) => ({ label: `${b.bodyPartCode} — ${b.bodyPartName}`, value: b.id }))} />
      </Form.Item>
      <Form.Item label="Kỹ thuật" name="techniqueText"><Input.TextArea rows={3} /></Form.Item>
      <Form.Item label="Findings mẫu" name="findingsTemplate"><Input.TextArea rows={4} /></Form.Item>
      <Form.Item label="Kết luận mẫu" name="impressionTemplate"><Input.TextArea rows={3} /></Form.Item>
      <Form.Item label="Ghi chú" name="note"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
    'pttt-service-mappings': <>
      <Form.Item
        label="Tên dịch vụ CĐHA"
        name="radiologyServiceName"
        rules={[{ required: true, message: 'Nhập tên dịch vụ CĐHA' }]}
        extra="Nhập tên dịch vụ CĐHA có thể kết hợp nhập tường trình PTTT (ví dụ: Sinh thiết dưới hướng dẫn siêu âm)"
      >
        <Input placeholder="Ví dụ: Sinh thiết dưới hướng dẫn siêu âm" />
      </Form.Item>
      <Form.Item
        label="Mã dịch vụ CĐHA (radiologyServiceId)"
        name="radiologyServiceId"
        rules={[{ required: true, message: 'Nhập mã UUID dịch vụ' }]}
        extra="UUID của Service trong danh mục (lấy từ /api/services hoặc tra cứu admin)"
      >
        <Input placeholder="UUID dịch vụ" />
      </Form.Item>
      <Form.Item label="Mẫu tường trình PTTT (không bắt buộc)" name="surgeryNarrativeTemplateId">
        <Select allowClear showSearch optionFilterProp="label"
          placeholder="Chọn mẫu PTTT mặc định (nếu có)"
          options={surgeryTemplates.map((t) => ({
            label: `${t.templateCode || ''} — ${t.templateName}`,
            value: t.id,
          }))}
          onChange={(val: string | null) => {
            const found = surgeryTemplates.find((t) => t.id === val);
            if (found) {
              form.setFieldValue('surgeryNarrativeTemplateName', found.templateName as string);
            }
          }}
        />
      </Form.Item>
      {/* Hidden field để capture surgeryNarrativeTemplateName khi submit */}
      <Form.Item name="surgeryNarrativeTemplateName" hidden><Input /></Form.Item>
      <Form.Item label="Ghi chú" name="notes"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item label="STT" name="sortOrder"><InputNumber min={0} /></Form.Item>
      <Form.Item label="Hoạt động" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
    </>,
  };

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Đang xem', val: TABS.find((t) => t.v === tab)?.l || '—', sub: data.length + ' mục', tone: 'info' },
        { lbl: 'Modality', val: modalities.length, sub: 'tổng', tone: 'ok' },
        { lbl: 'Vị trí chụp', val: bodyParts.length, sub: 'tổng' },
        { lbl: 'Hoạt động', val: data.filter((r) => r.isActive).length, sub: 'đang dùng', tone: 'ok' },
      ]} />

      <TopTabs<TabKey> tab={tab} setTab={(v) => { setTab(v); setKeyword(''); }} tabs={TABS} actions={
        <>
          <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
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
        empty={loading ? 'Đang tải…' : 'Không có dữ liệu'}
      />

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={editing ? 'Sửa' : 'Thêm mới'}
        onOk={submit}
        okText="Lưu"
        cancelText="Hủy"
        width={640}
      >
        <Form form={form} layout="vertical">
          {formFieldsByTab[tab]}
        </Form>
      </Modal>
    </div>
  );
};

export default RisCatalogAdminV2;
