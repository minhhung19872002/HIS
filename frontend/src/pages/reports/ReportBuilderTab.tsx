/**
 * Dynamic Report Builder (NangCap4 8.4) — self-contained component.
 *
 * Extracted khỏi pages/Reports.tsx (K17 Batch 3). Logic preserve 100% —
 * localStorage state, 9 handler, modal builder + preview giữ nguyên.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  SaveOutlined,
  PrinterOutlined,
  PlayCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { CustomReportDef, ReportField } from './types';
import { DATA_SOURCES, OPERATORS, FORMATS, STORAGE_KEY } from './constants';

const { Text } = Typography;

const ReportBuilderTab: React.FC = () => {
  const [reports, setReports] = useState<CustomReportDef[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [editing, setEditing] = useState<CustomReportDef | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<CustomReportDef | null>(null);
  const [form] = Form.useForm();
  const [fields, setFields] = useState<ReportField[]>([]);
  const [filters, setFilters] = useState<{ field: string; operator: string; value: string }[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');

  const saveReports = useCallback((updated: CustomReportDef[]) => {
    setReports(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const availableFields = useMemo(() => {
    const src = DATA_SOURCES.find(s => s.value === selectedSource);
    return src?.fields || [];
  }, [selectedSource]);
  const clientIdRef = useRef(0);

  const nextClientId = () => {
    clientIdRef.current += 1;
    return `report-${clientIdRef.current}`;
  };

  const handleNewReport = () => {
    setEditing(null);
    setFields([]);
    setFilters([]);
    setSelectedSource('');
    form.resetFields();
    setModalOpen(true);
  };

  const handleEditReport = (r: CustomReportDef) => {
    setEditing(r);
    setFields(r.fields);
    setFilters(r.filters);
    setSelectedSource(r.dataSource);
    form.setFieldsValue({ name: r.name, description: r.description, dataSource: r.dataSource, groupBy: r.groupBy, sortBy: r.sortBy, sortDir: r.sortDir });
    setModalOpen(true);
  };

  const handleDuplicateReport = (r: CustomReportDef) => {
    const copy: CustomReportDef = {
      ...r, id: nextClientId(), name: `${r.name} (bản sao)`, createdAt: new Date().toISOString()
    };
    saveReports([...reports, copy]);
    message.success('Đã sao chép báo cáo');
  };

  const handleDeleteReport = (id: string) => {
    saveReports(reports.filter(r => r.id !== id));
    message.success('Đã xóa báo cáo');
  };

  const handleSaveReport = () => {
    form.validateFields().then(values => {
      if (fields.length === 0) { message.warning('Vui lòng thêm ít nhất 1 cột'); return; }
      const report: CustomReportDef = {
        id: editing?.id || nextClientId(),
        name: values.name, description: values.description || '',
        dataSource: values.dataSource, fields, filters,
        groupBy: values.groupBy, sortBy: values.sortBy, sortDir: values.sortDir || 'asc',
        createdAt: editing?.createdAt || new Date().toISOString(),
      };
      if (editing) {
        saveReports(reports.map(r => r.id === editing.id ? report : r));
      } else {
        saveReports([...reports, report]);
      }
      message.success(editing ? 'Đã cập nhật báo cáo' : 'Đã tạo báo cáo mới');
      setModalOpen(false);
    });
  };

  const addField = (fieldName: string) => {
    if (fields.find(f => f.source === fieldName)) return;
    setFields([...fields, { id: nextClientId(), name: fieldName, source: fieldName, format: 'text', width: 150 }]);
  };

  const removeField = (id: string) => setFields(fields.filter(f => f.id !== id));

  const moveField = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= fields.length) return;
    const copy = [...fields];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    setFields(copy);
  };

  const updateField = (id: string, key: keyof ReportField, value: string | number) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const addFilter = () => {
    setFilters([...filters, { field: availableFields[0] || '', operator: 'eq', value: '' }]);
  };

  const removeFilter = (idx: number) => setFilters(filters.filter((_, i) => i !== idx));

  const updateFilter = (idx: number, key: string, value: string) => {
    setFilters(filters.map((f, i) => i === idx ? { ...f, [key]: value } : f));
  };

  const handlePreview = (r: CustomReportDef) => {
    setPreviewReport(r);
    setPreviewOpen(true);
  };

  const reportColumns: ColumnsType<CustomReportDef> = [
    { title: 'Tên báo cáo', dataIndex: 'name', width: 200 },
    { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
    { title: 'Nguồn dữ liệu', dataIndex: 'dataSource', width: 130,
      render: (v: string) => <Tag color="blue">{DATA_SOURCES.find(s => s.value === v)?.label || v}</Tag> },
    { title: 'Số cột', width: 80, render: (_: unknown, r: CustomReportDef) => r.fields.length },
    { title: 'Số bộ lọc', width: 90, render: (_: unknown, r: CustomReportDef) => r.filters.length },
    { title: 'Ngày tạo', dataIndex: 'createdAt', width: 130, render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: '', width: 180, render: (_: unknown, r: CustomReportDef) => (
      <Space>
        <Tooltip title="Xem trước"><Button size="small" icon={<PlayCircleOutlined />} onClick={() => handlePreview(r)} /></Tooltip>
        <Tooltip title="Sửa"><Button size="small" icon={<EditOutlined />} onClick={() => handleEditReport(r)} /></Tooltip>
        <Tooltip title="Sao chép"><Button size="small" icon={<CopyOutlined />} onClick={() => handleDuplicateReport(r)} /></Tooltip>
        <Tooltip title="Xóa"><Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteReport(r.id)} /></Tooltip>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNewReport}>Tạo báo cáo mới</Button>
          <Text type="secondary">{reports.length} báo cáo tùy chỉnh</Text>
        </Space>
      </div>

      {reports.length === 0 ? (
        <Alert title="Chưa có báo cáo tùy chỉnh" description="Nhấn 'Tạo báo cáo mới' để bắt đầu thiết kế báo cáo với nguồn dữ liệu, cột hiển thị, bộ lọc và công thức tùy chỉnh." type="info" showIcon />
      ) : (
        <Table columns={reportColumns} dataSource={reports} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
      )}

      {/* Report Builder Modal */}
      <Modal title={editing ? 'Sửa báo cáo' : 'Tạo báo cáo tùy chỉnh'} open={modalOpen}
        onCancel={() => setModalOpen(false)} onOk={handleSaveReport}
        width={900} okText={<><SaveOutlined /> Lưu</>} destroyOnHidden>
        <Form form={form} layout="vertical" size="small">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="name" label="Tên báo cáo" rules={[{ required: true }]}>
                <Input placeholder="VD: Báo cáo khám bệnh theo khoa" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dataSource" label="Nguồn dữ liệu" rules={[{ required: true }]}>
                <Select options={DATA_SOURCES.map(s => ({ value: s.value, label: s.label }))}
                  onChange={(v) => { setSelectedSource(v); setFields([]); setFilters([]); }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="description" label="Mô tả">
                <Input placeholder="Mô tả ngắn gọn" />
              </Form.Item>
            </Col>
          </Row>

          {/* Column Selection - Drag and Drop Style */}
          <Divider style={{ margin: '8px 0' }}>Cột hiển thị ({fields.length})</Divider>

          {selectedSource && (
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Nhấn để thêm cột:</Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {availableFields.map(f => (
                  <Tag key={f} color={fields.find(sf => sf.source === f) ? 'green' : 'default'}
                    style={{ cursor: 'pointer' }} onClick={() => addField(f)}>
                    {fields.find(sf => sf.source === f) ? '✓ ' : '+ '}{f}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {fields.length > 0 && (
            <Table size="small" pagination={false} dataSource={fields} rowKey="id"
              columns={[
                { title: '#', width: 60, render: (_: unknown, __: ReportField, idx: number) => (
                  <Space>
                    <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => moveField(idx, -1)} />
                    <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={idx === fields.length - 1} onClick={() => moveField(idx, 1)} />
                  </Space>
                )},
                { title: 'Trường nguồn', dataIndex: 'source', width: 140 },
                { title: 'Tên hiển thị', width: 140, render: (_: unknown, r: ReportField) => (
                  <Input size="small" value={r.name} onChange={e => updateField(r.id, 'name', e.target.value)} />
                )},
                { title: 'Định dạng', width: 130, render: (_: unknown, r: ReportField) => (
                  <Select size="small" value={r.format} options={FORMATS} style={{ width: '100%' }}
                    onChange={v => updateField(r.id, 'format', v)} />
                )},
                { title: 'Công thức', width: 140, render: (_: unknown, r: ReportField) => (
                  <Input size="small" value={r.formula} placeholder="VD: SUM, COUNT..."
                    onChange={e => updateField(r.id, 'formula', e.target.value)} />
                )},
                { title: 'Độ rộng', width: 80, render: (_: unknown, r: ReportField) => (
                  <Input size="small" type="number" value={r.width}
                    onChange={e => updateField(r.id, 'width', parseInt(e.target.value) || 150)} style={{ width: 70 }} />
                )},
                { title: '', width: 40, render: (_: unknown, r: ReportField) => (
                  <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeField(r.id)} />
                )},
              ]} />
          )}

          {/* Filters */}
          <Divider style={{ margin: '8px 0' }}>Bộ lọc ({filters.length})</Divider>
          {filters.map((f, idx) => (
            <Row key={idx} gutter={8} style={{ marginBottom: 4 }}>
              <Col span={7}>
                <Select size="small" value={f.field} style={{ width: '100%' }}
                  options={availableFields.map(af => ({ value: af, label: af }))}
                  onChange={v => updateFilter(idx, 'field', v)} />
              </Col>
              <Col span={5}>
                <Select size="small" value={f.operator} style={{ width: '100%' }}
                  options={OPERATORS} onChange={v => updateFilter(idx, 'operator', v)} />
              </Col>
              <Col span={9}>
                <Input size="small" value={f.value} placeholder="Giá trị"
                  onChange={e => updateFilter(idx, 'value', e.target.value)} />
              </Col>
              <Col span={3}>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeFilter(idx)} />
              </Col>
            </Row>
          ))}
          {selectedSource && <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addFilter}>Thêm bộ lọc</Button>}

          {/* Group/Sort */}
          <Divider style={{ margin: '8px 0' }}>Nhóm &amp; Sắp xếp</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="groupBy" label="Nhóm theo">
                <Select allowClear options={availableFields.map(f => ({ value: f, label: f }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sortBy" label="Sắp xếp theo">
                <Select allowClear options={availableFields.map(f => ({ value: f, label: f }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sortDir" label="Chiều sắp xếp" initialValue="asc">
                <Select options={[{ value: 'asc', label: 'Tăng dần' }, { value: 'desc', label: 'Giảm dần' }]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Preview Modal */}
      <Modal title={previewReport?.name || 'Xem trước'} open={previewOpen}
        onCancel={() => setPreviewOpen(false)} footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>In</Button>,
          <Button key="close" onClick={() => setPreviewOpen(false)}>Đóng</Button>,
        ]} width={1000}>
        {previewReport && (
          <div>
            <Alert title={`Nguồn: ${DATA_SOURCES.find(s => s.value === previewReport.dataSource)?.label}`}
              description={`${previewReport.fields.length} cột | ${previewReport.filters.length} bộ lọc | ${previewReport.groupBy ? 'Nhóm: ' + previewReport.groupBy : 'Không nhóm'}`}
              type="info" showIcon style={{ marginBottom: 12 }} />
            <Table size="small" pagination={{ pageSize: 20 }} dataSource={[]}
              columns={previewReport.fields.map(f => ({
                title: f.name, dataIndex: f.source, key: f.id, width: f.width || 150,
                render: (v: unknown) => {
                  if (f.format === 'currency') return `${(v as number || 0).toLocaleString('vi-VN')} đ`;
                  if (f.format === 'date') return v ? dayjs(v as string).format('DD/MM/YYYY') : '';
                  if (f.format === 'datetime') return v ? dayjs(v as string).format('DD/MM/YYYY HH:mm') : '';
                  if (f.format === 'percent') return `${v}%`;
                  return String(v ?? '');
                }
              }))}
              locale={{ emptyText: 'Kết nối API để xem dữ liệu thực. Bảng này hiển thị cấu trúc cột đã thiết kế.' }}
            />
            <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Cấu trúc: {previewReport.fields.map(f => f.name).join(' | ')}
                {previewReport.filters.length > 0 && ` | Lọc: ${previewReport.filters.map(f => `${f.field} ${f.operator} ${f.value}`).join(', ')}`}
                {previewReport.sortBy && ` | Sắp xếp: ${previewReport.sortBy} ${previewReport.sortDir}`}
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReportBuilderTab;
