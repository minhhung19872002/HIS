import React, { useState, useCallback } from 'react';
import * as file from '../services/file.service';
import {
  Card, Table, Input, Button, Space, Tag, Form, DatePicker, Select,
  Modal, message, Typography, Row, Col, Divider, Spin, Empty, Tooltip,
  InputNumber, Checkbox, Alert, Descriptions,
} from 'antd';
import {
  SearchOutlined, PrinterOutlined, EditOutlined, PlusOutlined,
  ReloadOutlined, FilePdfOutlined, FileExcelOutlined, DeleteOutlined,
  SaveOutlined, MedicineBoxOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import client from '../services/apiClient';
import { SPECIALTY_TYPES, SPECIALTY_FIELDS, type FieldDef } from '../constants/specialtyEmr';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// ===================== Types =====================

interface SpecialtyRecordDto {
  id: string; patientId: string; patientCode: string; patientName: string;
  gender: string; dateOfBirth: string; specialtyType: string; createdAt: string;
  doctorName: string; departmentName: string; diagnosisIcd: string;
  diagnosisText: string; status: number; specialtyData: Record<string, unknown>;
}

interface SearchParams {
  keyword: string; specialtyType?: string; fromDate?: string; toDate?: string;
  pageIndex: number; pageSize: number;
}

// ===================== API =====================

const specialtyEMRApi = {
  search: (params: SearchParams) =>
    client.get('/specialty-emr/search', { params }).then(r => r.data?.data || []).catch(() => []),
  getById: (id: string) =>
    client.get(`/specialty-emr/${id}`).then(r => r.data?.data).catch(() => null),
  save: (data: Record<string, unknown>) =>
    client.post('/specialty-emr', data).then(r => r.data).catch(() => null),
  delete: (id: string) =>
    client.delete(`/specialty-emr/${id}`).then(r => r.data).catch(() => null),
  exportPdf: (id: string) =>
    client.get(`/specialty-emr/${id}/pdf`, { responseType: 'blob' }).catch(() => null),
  exportXml: (id: string) =>
    client.get(`/specialty-emr/${id}/xml`, { responseType: 'blob' }).catch(() => null),
};

// ===================== Field config for specialties =====================
// SPECIALTY_TYPES / FieldDef / SPECIALTY_FIELDS dùng chung từ ../constants/specialtyEmr
// (nguồn dữ liệu duy nhất, chia sẻ với page v2 pages-v2/SpecialtyEMR.tsx)

// ===================== Render field helper =====================

const renderField = (field: FieldDef): React.ReactNode => {
  const name = ['specialtyData', field.name];
  const common = { placeholder: field.placeholder };
  switch (field.type) {
    case 'text': return <Form.Item name={name} label={field.label}><Input {...common} /></Form.Item>;
    case 'textarea': return <Form.Item name={name} label={field.label}><TextArea rows={field.rows || 2} {...common} /></Form.Item>;
    case 'number': return (
      <Form.Item name={name} label={field.label}>
        <InputNumber min={field.min} max={field.max} step={field.step} style={{ width: '100%' }} addonAfter={field.addonAfter} />
      </Form.Item>
    );
    case 'select': return (
      <Form.Item name={name} label={field.label}>
        <Select placeholder={field.placeholder || 'Chon'} options={field.options} allowClear />
      </Form.Item>
    );
    case 'multiselect': return (
      <Form.Item name={name} label={field.label}>
        <Select mode="multiple" placeholder={field.placeholder || 'Chon'} options={field.options} />
      </Form.Item>
    );
    case 'tags': return (
      <Form.Item name={name} label={field.label}>
        <Select mode="tags" placeholder={field.placeholder || 'Nhap'} options={field.options} />
      </Form.Item>
    );
    case 'checkbox': return (
      <Form.Item name={name} label={field.label}>
        <Checkbox.Group options={field.options} />
      </Form.Item>
    );
    default: return <Form.Item name={name} label={field.label}><Input /></Form.Item>;
  }
};

const renderSpecialtySection = (specialtyKey: string): React.ReactNode => {
  const config = SPECIALTY_FIELDS[specialtyKey];
  if (!config) return <Alert title="Vui long chon chuyên khoa" type="info" showIcon />;
  return (
    <>
      <Divider>{config.title}</Divider>
      <Row gutter={16}>
        {config.fields.map(field => (
          <Col span={field.span || 24} key={field.name}>{renderField(field)}</Col>
        ))}
      </Row>
    </>
  );
};

// ===================== Status maps =====================

const statusColors: Record<number, string> = { 0: 'default', 1: 'processing', 2: 'warning', 3: 'success' };
const statusNames: Record<number, string> = { 0: 'Nhap', 1: 'Dang điều trị', 2: 'Cho duyet', 3: 'Hoan thanh' };

// ===================== Component =====================

const SpecialtyEMR: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([dayjs().subtract(30, 'day'), dayjs()]);
  const [specialtyFilter, setSpecialtyFilter] = useState<string | undefined>(undefined);
  const [records, setRecords] = useState<SpecialtyRecordDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SpecialtyRecordDto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSpecialty, setModalSpecialty] = useState<string>('surgical');
  const [formLoading, setFormLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSearch = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: SearchParams = {
        keyword: searchKeyword, specialtyType: specialtyFilter,
        fromDate: dateRange[0]?.format('YYYY-MM-DD'), toDate: dateRange[1]?.format('YYYY-MM-DD'),
        pageIndex: page - 1, pageSize,
      };
      const result = await specialtyEMRApi.search(params);
      if (Array.isArray(result)) { setRecords(result); setTotalCount(result.length); }
      else if (result?.items) { setRecords(result.items); setTotalCount(result.totalCount || 0); }
      setCurrentPage(page);
    } catch { message.warning('Khong the tai du lieu'); }
    finally { setLoading(false); }
  }, [searchKeyword, specialtyFilter, dateRange, pageSize]);

  const handleCreate = () => { form.resetFields(); setSelectedRecord(null); setModalSpecialty('surgical'); setModalOpen(true); };

  const handleEdit = async (record: SpecialtyRecordDto) => {
    setSelectedRecord(record); setModalSpecialty(record.specialtyType);
    const detail = await specialtyEMRApi.getById(record.id);
    form.setFieldsValue({ ...(detail || record), createdAt: dayjs((detail || record).createdAt || undefined) });
    setModalOpen(true);
  };

  const handleDelete = (record: SpecialtyRecordDto) => {
    Modal.confirm({
      title: 'Xac nhan xoa', content: `Xoa ho so cua ${record.patientName}?`,
      okText: 'Xoa', cancelText: 'Huy', okButtonProps: { danger: true },
      onOk: async () => {
        const r = await specialtyEMRApi.delete(record.id);
        if (r) { message.success('Da xoa'); handleSearch(currentPage); }
        else message.warning('Khong the xoa');
      },
    });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setFormLoading(true);
      const payload = { ...values, specialtyType: modalSpecialty, id: selectedRecord?.id,
        createdAt: values.createdAt?.format?.('YYYY-MM-DDTHH:mm:ss') || dayjs().format('YYYY-MM-DDTHH:mm:ss') };
      const result = await specialtyEMRApi.save(payload);
      if (result) { message.success(selectedRecord ? 'Da cap nhat' : 'Da tao moi'); }
      else { message.warning('API chua san sang'); }
      setModalOpen(false); handleSearch(currentPage);
    } catch { /* validation */ }
    finally { setFormLoading(false); }
  };

  const handleExport = async (id: string, type: 'pdf' | 'xml') => {
    const fn = type === 'pdf' ? specialtyEMRApi.exportPdf : specialtyEMRApi.exportXml;
    const result = await fn(id);
    if (result?.data) {
      file.downloadBlob(new Blob([result.data]), `specialty-emr-${id}.${type}`);
    } else { message.warning(`Xuat ${type.toUpperCase()} chua san sang`); }
  };

  const columns = [
    { title: 'STT', key: 'idx', width: 55, render: (_: unknown, __: unknown, i: number) => (currentPage - 1) * pageSize + i + 1 },
    { title: 'Ma BN', dataIndex: 'patientCode', width: 100 },
    { title: 'Ho ten', dataIndex: 'patientName', width: 150 },
    { title: 'Chuyên khoa', dataIndex: 'specialtyType', width: 130,
      render: (v: string) => { const s = SPECIALTY_TYPES.find(t => t.key === v); return s ? <Tag color="blue">{s.label}</Tag> : v; } },
    { title: 'Ngay tao', dataIndex: 'createdAt', width: 105, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
    { title: 'BS điều trị', dataIndex: 'doctorName', width: 130 },
    { title: 'Trạng thái', dataIndex: 'status', width: 100,
      render: (v: number) => <Tag color={statusColors[v] || 'default'}>{statusNames[v] || 'N/A'}</Tag> },
    { title: 'Thao tac', key: 'actions', width: 180, fixed: 'right' as const,
      render: (_: unknown, rec: SpecialtyRecordDto) => (
        <Space>
          <Tooltip title="Sua"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(rec)} /></Tooltip>
          <Tooltip title="PDF"><Button type="link" size="small" icon={<FilePdfOutlined />} onClick={() => handleExport(rec.id, 'pdf')} /></Tooltip>
          <Tooltip title="XML"><Button type="link" size="small" icon={<FileExcelOutlined />} onClick={() => handleExport(rec.id, 'xml')} /></Tooltip>
          <Tooltip title="Xoa"><Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(rec)} /></Tooltip>
        </Space>
      ) },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Title level={4}><MedicineBoxOutlined /> Ho so bệnh án chuyên khoa</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]} align="bottom">
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Tu khoa</Text>
            <Input placeholder="Ma BN, ho ten, CCCD..." prefix={<SearchOutlined />}
              value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
              onPressEnter={() => handleSearch(1)} allowClear />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Chuyên khoa</Text>
            <Select placeholder="Tat ca chuyên khoa" value={specialtyFilter}
              onChange={v => setSpecialtyFilter(v)} allowClear style={{ width: '100%' }}
              options={SPECIALTY_TYPES.map(s => ({ value: s.key, label: s.label }))} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Khoang thoi gian</Text>
            <RangePicker value={dateRange} onChange={v => setDateRange(v as [Dayjs | null, Dayjs | null])}
              format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => handleSearch(1)}>Tìm kiếm</Button>
              <Button icon={<ReloadOutlined />} onClick={() => handleSearch(currentPage)}>Làm mới</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Tao moi</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card size="small">
        <Spin spinning={loading}>
          {records.length === 0 && !loading
            ? <Empty description="Không có du lieu. Nhan Tìm kiếm hoac Tao moi de bat dau." />
            : <Table dataSource={records} columns={columns} rowKey="id" size="small" scroll={{ x: 1000 }}
                pagination={{ current: currentPage, pageSize, total: totalCount,
                  showTotal: t => `Tong: ${t} ban ghi`, onChange: p => handleSearch(p) }}
                onRow={r => ({ onDoubleClick: () => handleEdit(r), style: { cursor: 'pointer' } })} />}
        </Spin>
      </Card>

      <Modal title={selectedRecord ? 'Chinh sua ho so chuyên khoa' : 'Tao ho so chuyên khoa moi'}
        open={modalOpen} onCancel={() => setModalOpen(false)} width={900} destroyOnHidden
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>Huy</Button>,
          <Button key="print" icon={<PrinterOutlined />} onClick={() => selectedRecord ? handleExport(selectedRecord.id, 'pdf') : message.info('Lưu trữoc khi in')}>In</Button>,
          <Button key="save" type="primary" icon={<SaveOutlined />} loading={formLoading} onClick={handleSave}>Luu</Button>,
        ]}>
        <Form form={form} layout="vertical" size="small">
          <Divider>Thong tin chung</Divider>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="patientCode" label="Ma bệnh nhân" rules={[{ required: true, message: 'Bat buoc' }]}><Input placeholder="Ma BN" /></Form.Item></Col>
            <Col span={8}><Form.Item name="patientName" label="Ho ten" rules={[{ required: true, message: 'Bat buoc' }]}><Input placeholder="Ho ten BN" /></Form.Item></Col>
            <Col span={8}><Form.Item name="createdAt" label="Ngay tao"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="doctorName" label="BS điều trị"><Input placeholder="Ten bác sĩ" /></Form.Item></Col>
            <Col span={8}><Form.Item name="departmentName" label="Khoa/Phong"><Input placeholder="Khoa" /></Form.Item></Col>
            <Col span={8}><Form.Item name="diagnosisIcd" label="ICD-10"><Input placeholder="VD: J18.9" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={16}><Form.Item name="diagnosisText" label="Chẩn đoán"><Input placeholder="Mô tả chẩn đoán" /></Form.Item></Col>
            <Col span={8}>
              <Form.Item label="Chuyên khoa">
                <Select value={modalSpecialty} onChange={v => setModalSpecialty(v)}
                  options={SPECIALTY_TYPES.map(s => ({ value: s.key, label: s.label }))} />
              </Form.Item>
            </Col>
          </Row>
          {renderSpecialtySection(modalSpecialty)}
        </Form>
      </Modal>

      {selectedRecord && !modalOpen && (
        <Card size="small" style={{ marginTop: 16 }} title="Thong tin bệnh nhân">
          <Descriptions size="small" column={4}>
            <Descriptions.Item label="Ma BN">{selectedRecord.patientCode}</Descriptions.Item>
            <Descriptions.Item label="Ho ten">{selectedRecord.patientName}</Descriptions.Item>
            <Descriptions.Item label="Gioi tinh">{selectedRecord.gender}</Descriptions.Item>
            <Descriptions.Item label="Ngay sinh">{selectedRecord.dateOfBirth ? dayjs(selectedRecord.dateOfBirth).format('DD/MM/YYYY') : ''}</Descriptions.Item>
            <Descriptions.Item label="Chuyên khoa">{SPECIALTY_TYPES.find(s => s.key === selectedRecord.specialtyType)?.label}</Descriptions.Item>
            <Descriptions.Item label="BS điều trị">{selectedRecord.doctorName}</Descriptions.Item>
            <Descriptions.Item label="Chẩn đoán">{selectedRecord.diagnosisText}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái"><Tag color={statusColors[selectedRecord.status]}>{statusNames[selectedRecord.status]}</Tag></Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </div>
  );
};

export default SpecialtyEMR;
