// Dynamic Report Builder v2 — localStorage-based custom report designer
// Port of pages/reports/ReportBuilderTab.tsx using _v2kit primitives.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Input, Select, Form } from 'antd';
import { storage } from '../../../services/storage.service';
import {
  DataTable, ModalShell, Btn, ActBtn, StatusBadge, tk, te, cf,
  type ColumnDef,
} from '@/_v2kit';

interface ReportField {
  id: string; name: string; source: string; formula?: string; format?: string; width?: number;
}
interface CustomReportDef {
  id: string; name: string; description: string; dataSource: string;
  fields: ReportField[];
  filters: { field: string; operator: string; value: string }[];
  groupBy?: string; sortBy?: string; sortDir?: string; createdAt: string;
}

const DATA_SOURCES = [
  { value: 'patients', label: 'Bệnh nhân', fields: ['patientCode', 'fullName', 'dateOfBirth', 'gender', 'phoneNumber', 'address', 'insuranceNumber', 'patientType'] },
  { value: 'examinations', label: 'Khám bệnh', fields: ['examDate', 'patientName', 'doctorName', 'departmentName', 'mainIcdCode', 'status', 'queueNumber'] },
  { value: 'prescriptions', label: 'Đơn thuốc', fields: ['prescriptionDate', 'patientName', 'doctorName', 'medicineName', 'quantity', 'unit', 'totalAmount'] },
  { value: 'labRequests', label: 'Xét nghiệm', fields: ['requestDate', 'patientName', 'testName', 'result', 'unit', 'status'] },
  { value: 'admissions', label: 'Nội trú', fields: ['admissionDate', 'patientName', 'departmentName', 'bedNumber', 'attendingDoctor', 'status', 'dischargeDate'] },
  { value: 'billing', label: 'Thu ngân', fields: ['receiptDate', 'patientName', 'totalAmount', 'insuranceCovered', 'paymentMethod', 'status'] },
  { value: 'pharmacy', label: 'Dược', fields: ['medicineName', 'batchNumber', 'expiryDate', 'stockQuantity', 'unit', 'unitPrice', 'supplier'] },
  { value: 'services', label: 'Dịch vụ', fields: ['serviceCode', 'serviceName', 'departmentName', 'price', 'insurancePrice', 'category', 'isActive'] },
];

const OPERATORS = [
  { value: 'eq', label: '=' }, { value: 'neq', label: '≠' },
  { value: 'gt', label: '>' }, { value: 'lt', label: '<' },
  { value: 'gte', label: '≥' }, { value: 'lte', label: '≤' },
  { value: 'contains', label: 'Chứa' }, { value: 'startsWith', label: 'Bắt đầu' },
];

const FORMATS: { value: string; label: string }[] = [
  { value: 'text', label: 'Văn bản' }, { value: 'number', label: 'Số' },
  { value: 'currency', label: 'Tiền VNĐ' }, { value: 'date', label: 'Ngày' },
  { value: 'datetime', label: 'Ngày giờ' }, { value: 'percent', label: '%' },
];

const STORAGE_KEY = 'his_custom_reports';

const cellStyles: React.CSSProperties = { padding: '3px 6px', verticalAlign: 'middle' };
const hdrStyles: React.CSSProperties = { ...cellStyles, background: 'var(--ab-bg-2)', fontWeight: 600, fontSize: 'var(--fs-xs)', borderBottom: '2px solid var(--ab-border)', whiteSpace: 'nowrap' };
const iconBtn = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: 'none', border: 'none', cursor: 'pointer', padding: '0 3px', lineHeight: 1, ...extra,
});

const ReportBuilderTab: React.FC = () => {
  const [reports, setReports] = useState<CustomReportDef[]>(() => {
    try { return storage.get<CustomReportDef[]>(STORAGE_KEY) ?? []; } catch { return []; }
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomReportDef | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<CustomReportDef | null>(null);
  const [fields, setFields] = useState<ReportField[]>([]);
  const [filters, setFilters] = useState<{ field: string; operator: string; value: string }[]>([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [form] = Form.useForm();
  const idRef = useRef(0);
  const nextId = () => { idRef.current += 1; return `r${idRef.current}`; };

  const saveAll = useCallback((next: CustomReportDef[]) => {
    setReports(next); storage.set(STORAGE_KEY, next);
  }, []);

  const availableFields = useMemo(
    () => DATA_SOURCES.find(s => s.value === selectedSource)?.fields || [],
    [selectedSource],
  );

  const openNew = () => {
    setEditing(null); setFields([]); setFilters([]); setSelectedSource('');
    form.resetFields(); setModalOpen(true);
  };
  const openEdit = (r: CustomReportDef) => {
    setEditing(r); setFields(r.fields); setFilters(r.filters); setSelectedSource(r.dataSource);
    form.setFieldsValue({ name: r.name, description: r.description, dataSource: r.dataSource, groupBy: r.groupBy, sortBy: r.sortBy, sortDir: r.sortDir || 'asc' });
    setModalOpen(true);
  };
  const duplicate = (r: CustomReportDef) => {
    saveAll([...reports, { ...r, id: nextId(), name: `${r.name} (bản sao)`, createdAt: new Date().toISOString() }]);
    tk('Đã sao chép báo cáo');
  };
  const del = (r: CustomReportDef) => cf(`Xóa báo cáo "${r.name}"?`, () => {
    saveAll(reports.filter(x => x.id !== r.id)); tk('Đã xóa báo cáo');
  }, { tone: 'crit', confirm: 'Xóa' });

  const handleSave = () => {
    form.validateFields().then(v => {
      if (fields.length === 0) { te('Vui lòng thêm ít nhất 1 cột hiển thị'); return; }
      const def: CustomReportDef = {
        id: editing?.id || nextId(),
        name: (v as Record<string, string>).name,
        description: (v as Record<string, string>).description || '',
        dataSource: (v as Record<string, string>).dataSource,
        fields, filters,
        groupBy: (v as Record<string, string>).groupBy,
        sortBy: (v as Record<string, string>).sortBy,
        sortDir: (v as Record<string, string>).sortDir || 'asc',
        createdAt: editing?.createdAt || new Date().toISOString(),
      };
      saveAll(editing ? reports.map(r => r.id === editing.id ? def : r) : [...reports, def]);
      tk(editing ? 'Đã cập nhật báo cáo' : 'Đã tạo báo cáo mới');
      setModalOpen(false);
    });
  };

  const addField = (f: string) => {
    if (fields.find(x => x.source === f)) return;
    setFields(prev => [...prev, { id: nextId(), name: f, source: f, format: 'text', width: 150 }]);
  };
  const removeField = (id: string) => setFields(prev => prev.filter(f => f.id !== id));
  const moveField = (idx: number, dir: -1 | 1) => {
    const n = idx + dir;
    if (n < 0 || n >= fields.length) return;
    const c = [...fields]; [c[idx], c[n]] = [c[n], c[idx]]; setFields(c);
  };
  const updateField = (id: string, key: keyof ReportField, val: string | number) =>
    setFields(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
  const addFilter = () =>
    setFilters(prev => [...prev, { field: availableFields[0] || '', operator: 'eq', value: '' }]);
  const removeFilter = (i: number) => setFilters(prev => prev.filter((_, j) => j !== i));
  const updateFilter = (i: number, key: string, val: string) =>
    setFilters(prev => prev.map((f, j) => j === i ? { ...f, [key]: val } : f));

  const columns: ColumnDef<CustomReportDef>[] = [
    { key: 'name', label: 'Tên báo cáo', render: r => r.name },
    { key: 'description', label: 'Mô tả', render: r => r.description || '—' },
    { key: 'dataSource', label: 'Nguồn', width: 130, render: r => (
      <StatusBadge tone="info">{DATA_SOURCES.find(s => s.value === r.dataSource)?.label || r.dataSource}</StatusBadge>
    )},
    { key: 'fieldCount', label: 'Cột', mono: true, width: 60, render: r => r.fields.length },
    { key: 'filterCount', label: 'Lọc', mono: true, width: 60, render: r => r.filters.length },
    { key: 'createdAt', label: 'Ngày tạo', mono: true, width: 120, render: r => dayjs(r.createdAt).format('DD/MM HH:mm') },
  ];

  return (
    <>
      <div className="ab-tools">
        <span style={{ fontWeight: 600 }}>Báo cáo tùy chỉnh ({reports.length})</span>
        <span className="spacer" />
        <Btn variant="primary" onClick={openNew}>+ Tạo mới</Btn>
      </div>

      {reports.length === 0
        ? <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--t-2)' }}>
            Chưa có báo cáo tùy chỉnh.{' '}
            Nhấn <strong>+ Tạo mới</strong> để thiết kế báo cáo với nguồn dữ liệu, cột hiển thị, bộ lọc và sắp xếp tuỳ chỉnh.
          </div>
        : <DataTable<CustomReportDef>
            columns={columns} data={reports} rowKey={r => r.id}
            actions={r => (<>
              <ActBtn ic="play" title="Xem trước" onClick={() => { setPreviewReport(r); setPreviewOpen(true); }} />
              <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
              <ActBtn ic="layers" title="Sao chép" onClick={() => duplicate(r)} />
              <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => del(r)} />
            </>)}
            empty="Không có báo cáo"
          />
      }

      {/* ─── Builder modal ─── */}
      <ModalShell open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa báo cáo' : 'Tạo báo cáo tùy chỉnh'} size="xl"
        footer={<><Btn onClick={() => setModalOpen(false)}>Huỷ</Btn><Btn variant="primary" onClick={handleSave}>Lưu</Btn></>}>
        <Form form={form} layout="vertical" size="small">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Form.Item name="name" label="Tên báo cáo" rules={[{ required: true, message: 'Nhập tên' }]}>
              <Input placeholder="VD: Báo cáo khám bệnh theo khoa" />
            </Form.Item>
            <Form.Item name="dataSource" label="Nguồn dữ liệu" rules={[{ required: true, message: 'Chọn nguồn' }]}>
              <Select options={DATA_SOURCES.map(s => ({ value: s.value, label: s.label }))}
                onChange={v => { setSelectedSource(v as string); setFields([]); setFilters([]); }} />
            </Form.Item>
            <Form.Item name="description" label="Mô tả">
              <Input placeholder="Mô tả ngắn gọn" />
            </Form.Item>
          </div>

          {/* Columns */}
          <div style={{ borderTop: '1px solid var(--ab-border)', paddingTop: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 6 }}>Cột hiển thị ({fields.length})</div>
            {selectedSource && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {availableFields.map(f => {
                  const active = !!fields.find(sf => sf.source === f);
                  return (
                    <button key={f} type="button" onClick={() => addField(f)} style={{
                      padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 'var(--fs-xs)',
                      border: `1px solid ${active ? 'var(--ab-accent)' : 'var(--ab-border)'}`,
                      background: active ? 'var(--ab-accent)' : 'transparent',
                      color: active ? '#fff' : 'inherit',
                    }}>
                      {active ? '✓' : '+'} {f}
                    </button>
                  );
                })}
              </div>
            )}
            {fields.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-xs)' }}>
                  <thead>
                    <tr>
                      <th style={{ ...hdrStyles, width: 60 }}>Thứ tự</th>
                      <th style={hdrStyles}>Trường nguồn</th>
                      <th style={hdrStyles}>Tên hiển thị</th>
                      <th style={{ ...hdrStyles, width: 120 }}>Định dạng</th>
                      <th style={{ ...hdrStyles, width: 120 }}>Công thức</th>
                      <th style={{ ...hdrStyles, width: 70 }}>Độ rộng</th>
                      <th style={{ ...hdrStyles, width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f, idx) => (
                      <tr key={f.id} style={{ borderBottom: '1px solid var(--ab-border)' }}>
                        <td style={cellStyles}>
                          <button type="button" disabled={idx === 0} onClick={() => moveField(idx, -1)} style={iconBtn({ opacity: idx === 0 ? 0.3 : 1 })}>↑</button>
                          <button type="button" disabled={idx === fields.length - 1} onClick={() => moveField(idx, 1)} style={iconBtn({ opacity: idx === fields.length - 1 ? 0.3 : 1 })}>↓</button>
                        </td>
                        <td style={{ ...cellStyles, fontFamily: 'monospace' }}>{f.source}</td>
                        <td style={cellStyles}><Input size="small" value={f.name} onChange={e => updateField(f.id, 'name', e.target.value)} /></td>
                        <td style={cellStyles}><Select size="small" value={f.format} options={FORMATS} style={{ width: '100%' }} onChange={v => updateField(f.id, 'format', v as string)} /></td>
                        <td style={cellStyles}><Input size="small" value={f.formula || ''} placeholder="SUM, COUNT…" onChange={e => updateField(f.id, 'formula', e.target.value)} /></td>
                        <td style={cellStyles}><Input size="small" type="number" value={f.width} style={{ width: 58 }} onChange={e => updateField(f.id, 'width', parseInt(e.target.value) || 150)} /></td>
                        <td style={cellStyles}><button type="button" onClick={() => removeField(f.id)} style={iconBtn({ color: 'var(--s-crit)' })}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Filters */}
          <div style={{ borderTop: '1px solid var(--ab-border)', paddingTop: 8, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>Bộ lọc ({filters.length})</span>
              {selectedSource && <Btn variant="ghost" onClick={addFilter}>+ Thêm bộ lọc</Btn>}
            </div>
            {filters.map((f, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 1fr 28px', gap: 6, marginBottom: 4 }}>
                <Select size="small" value={f.field}
                  options={availableFields.map(af => ({ value: af, label: af }))}
                  onChange={v => updateFilter(i, 'field', v as string)} />
                <Select size="small" value={f.operator} options={OPERATORS}
                  onChange={v => updateFilter(i, 'operator', v as string)} />
                <Input size="small" value={f.value} placeholder="Giá trị"
                  onChange={e => updateFilter(i, 'value', e.target.value)} />
                <button type="button" onClick={() => removeFilter(i)} style={iconBtn({ color: 'var(--s-crit)', fontSize: 14 })}>✕</button>
              </div>
            ))}
          </div>

          {/* Group / Sort */}
          <div style={{ borderTop: '1px solid var(--ab-border)', paddingTop: 8 }}>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 6 }}>Nhóm &amp; Sắp xếp</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <Form.Item name="groupBy" label="Nhóm theo">
                <Select allowClear options={availableFields.map(f => ({ value: f, label: f }))} />
              </Form.Item>
              <Form.Item name="sortBy" label="Sắp xếp theo">
                <Select allowClear options={availableFields.map(f => ({ value: f, label: f }))} />
              </Form.Item>
              <Form.Item name="sortDir" label="Chiều" initialValue="asc">
                <Select options={[{ value: 'asc', label: 'Tăng dần' }, { value: 'desc', label: 'Giảm dần' }]} />
              </Form.Item>
            </div>
          </div>
        </Form>
      </ModalShell>

      {/* ─── Preview modal ─── */}
      <ModalShell open={previewOpen} onClose={() => setPreviewOpen(false)}
        title={previewReport?.name || 'Xem trước cấu trúc báo cáo'} size="xl"
        footer={<><Btn onClick={() => window.print()}>In</Btn><Btn variant="primary" onClick={() => setPreviewOpen(false)}>Đóng</Btn></>}>
        {previewReport && (
          <>
            <div style={{ padding: '8px 12px', background: 'var(--ab-bg-2)', borderRadius: 6, marginBottom: 12, fontSize: 'var(--fs-sm)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>Nguồn: <strong>{DATA_SOURCES.find(s => s.value === previewReport.dataSource)?.label}</strong></span>
              <span>{previewReport.fields.length} cột</span>
              <span>{previewReport.filters.length} bộ lọc</span>
              {previewReport.groupBy && <span>Nhóm: {previewReport.groupBy}</span>}
              {previewReport.sortBy && <span>Sắp xếp: {previewReport.sortBy} {previewReport.sortDir}</span>}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                <thead>
                  <tr>
                    {previewReport.fields.map(f => (
                      <th key={f.id} style={{ padding: '6px 10px', borderBottom: '2px solid var(--ab-border)', background: 'var(--ab-bg-2)', textAlign: 'left', whiteSpace: 'nowrap' }}>{f.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={previewReport.fields.length} style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--t-2)', fontStyle: 'italic', borderBottom: '1px solid var(--ab-border)' }}>
                      Cấu trúc cột đã thiết kế. Kết nối API để xem dữ liệu thực.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 8, color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>
              Cột: {previewReport.fields.map(f => f.name).join(' | ')}
              {previewReport.filters.length > 0 && ` · Lọc: ${previewReport.filters.map(f => `${f.field} ${f.operator} "${f.value}"`).join(', ')}`}
            </div>
          </>
        )}
      </ModalShell>
    </>
  );
};

export default ReportBuilderTab;
