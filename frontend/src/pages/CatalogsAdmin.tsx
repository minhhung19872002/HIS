/**
 * Catalogs Admin — CRUD cho Abbreviations + Clinical Templates.
 * Fill gap cho Sprint 3 Item 2.1 + 2.2.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, Tabs, Table, Button, Space, Tag, Modal, Form, Input, Select, InputNumber,
  Checkbox, message, Popconfirm, Typography, Drawer,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  saveAbbreviation, deleteAbbreviation, searchAbbreviations,
  ABBREVIATION_SCOPES, type AbbreviationDto,
} from '../api/abbreviation';
import {
  saveTemplate, deleteTemplate, searchTemplates, getTemplateById,
  TEMPLATE_TYPE_LABELS, type ClinicalTemplateDto,
} from '../api/clinicalTemplate';
import { invalidateAbbreviationCache } from '../hooks/useAbbreviationExpander';

const { Text } = Typography;

export default function CatalogsAdmin() {
  return (
    <Card title="Danh mục chia sẻ">
      <Tabs
        items={[
          { key: 'abbr', label: 'Viết tắt (F2)', children: <AbbreviationTab /> },
          { key: 'templates', label: 'Template lâm sàng', children: <TemplatesTab /> },
        ]}
      />
    </Card>
  );
}

function AbbreviationTab() {
  const [data, setData] = useState<AbbreviationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<number | undefined>();
  const [editing, setEditing] = useState<AbbreviationDto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<{
    code: string;
    expansion: string;
    scope: number;
    scopeKey?: string;
    ownerOnly: boolean;
    sortOrder: number;
  }>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await searchAbbreviations(scope));
    } catch { setData([]); } finally { setLoading(false); }
  }, [scope]);

  useEffect(() => { load(); }, [load]);

  const handleOpenCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ scope: 0, ownerOnly: false, sortOrder: 0 });
    setModalOpen(true);
  };

  const handleOpenEdit = (row: AbbreviationDto) => {
    setEditing(row);
    form.setFieldsValue({
      code: row.code,
      expansion: row.expansion,
      scope: row.scope,
      scopeKey: row.scopeKey,
      ownerOnly: !!row.ownerUserId,
      sortOrder: row.sortOrder,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await saveAbbreviation({ id: editing?.id, ...values });
      message.success('Đã lưu');
      setModalOpen(false);
      invalidateAbbreviationCache();
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Lưu thất bại');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteAbbreviation(id);
    message.success('Đã xóa');
    invalidateAbbreviationCache();
    load();
  };

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Select
          placeholder="Lọc theo scope"
          allowClear
          value={scope}
          onChange={setScope}
          style={{ width: 200 }}
          options={[
            { value: ABBREVIATION_SCOPES.GENERAL, label: 'Chung' },
            { value: ABBREVIATION_SCOPES.PRESCRIPTION, label: 'Ghi chú thuốc' },
            { value: ABBREVIATION_SCOPES.DIAGNOSIS, label: 'Chẩn đoán / Triệu chứng' },
            { value: ABBREVIATION_SCOPES.LAB, label: 'Kết quả XN' },
            { value: ABBREVIATION_SCOPES.RADIOLOGY, label: 'CĐHA' },
            { value: ABBREVIATION_SCOPES.APPOINTMENT, label: 'Hẹn' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
          Thêm viết tắt
        </Button>
        <Text type="secondary">Hướng dẫn: gõ code trong textarea rồi bấm F2 để tự động thay thế.</Text>
      </Space>

      <Table<AbbreviationDto>
        rowKey="id"
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 30 }}
        columns={[
          { title: 'Code', dataIndex: 'code', width: 100, render: (v: string) => <Tag color="blue">{v}</Tag> },
          { title: 'Cụm từ đầy đủ', dataIndex: 'expansion' },
          { title: 'Scope', dataIndex: 'scopeName', width: 180 },
          { title: 'Riêng user', dataIndex: 'ownerUserId', width: 100, render: (v: string) => v ? <Tag>Cá nhân</Tag> : <Tag color="green">Chung</Tag> },
          { title: 'Đã dùng', dataIndex: 'usageCount', width: 80, align: 'right' },
          {
            title: 'Hành động',
            width: 160,
            render: (_, r) => (
              <Space size="small">
                <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(r)}>Sửa</Button>
                <Popconfirm title="Xóa viết tắt?" onConfirm={() => handleDelete(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? 'Sửa viết tắt' : 'Thêm viết tắt'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="Lưu"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Code (ngắn, lowercase, không dấu)" rules={[{ required: true, pattern: /^[a-z0-9]+$/, message: 'Chỉ chữ thường + số' }]}>
            <Input placeholder="VD: ha, nth, kbt" maxLength={20} />
          </Form.Item>
          <Form.Item name="expansion" label="Cụm từ đầy đủ" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="VD: Không bất thường" />
          </Form.Item>
          <Form.Item name="scope" label="Scope" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 0, label: 'Chung' },
                { value: 1, label: 'Ghi chú thuốc' },
                { value: 2, label: 'Chẩn đoán / Triệu chứng' },
                { value: 3, label: 'Kết quả XN' },
                { value: 4, label: 'CĐHA' },
                { value: 5, label: 'Hẹn' },
              ]}
            />
          </Form.Item>
          <Form.Item name="scopeKey" label="Scope key (tùy chọn, cho CĐHA theo kỹ thuật)">
            <Input placeholder="VD: CT, MRI, XQ, nội soi" />
          </Form.Item>
          <Form.Item name="ownerOnly" valuePropName="checked">
            <Checkbox>Chỉ mình tôi dùng được (nếu không tick = chia sẻ cho mọi BS)</Checkbox>
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự sắp xếp">
            <InputNumber min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function TemplatesTab() {
  const [data, setData] = useState<ClinicalTemplateDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateType, setTemplateType] = useState<number | undefined>();
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<ClinicalTemplateDto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm<{
    templateName: string;
    templateType: number;
    icdCode?: string;
    icdName?: string;
    gender: number;
    minAgeYears?: number;
    maxAgeYears?: number;
    content: string;
    isPublic: boolean;
    sortOrder: number;
  }>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await searchTemplates({ templateType, keyword, pageSize: 100, onlyActive: true }));
    } catch { setData([]); } finally { setLoading(false); }
  }, [templateType, keyword]);

  useEffect(() => { load(); }, [load]);

  const handleOpenCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ templateType: 1, gender: 0, isPublic: true, sortOrder: 0 });
    setDrawerOpen(true);
  };

  const handleOpenEdit = async (row: ClinicalTemplateDto) => {
    const full = await getTemplateById(row.id);
    if (!full) return;
    setEditing(full);
    form.setFieldsValue({
      templateName: full.templateName,
      templateType: full.templateType,
      icdCode: full.icdCode,
      icdName: full.icdName,
      gender: full.gender,
      minAgeYears: full.minAgeYears,
      maxAgeYears: full.maxAgeYears,
      content: full.content,
      isPublic: full.isPublic,
      sortOrder: full.sortOrder,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await saveTemplate({ id: editing?.id, ...values });
      message.success('Đã lưu template');
      setDrawerOpen(false);
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Lưu thất bại');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
    message.success('Đã xóa');
    load();
  };

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Select
          placeholder="Loại template"
          allowClear
          value={templateType}
          onChange={setTemplateType}
          style={{ width: 220 }}
          options={Object.entries(TEMPLATE_TYPE_LABELS).map(([k, v]) => ({ value: Number(k), label: v }))}
        />
        <Input.Search
          placeholder="Tìm theo tên / ICD"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={load}
          style={{ width: 280 }}
        />
        <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
          Thêm template
        </Button>
      </Space>

      <Table<ClinicalTemplateDto>
        rowKey="id"
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: 'Tên template', dataIndex: 'templateName' },
          {
            title: 'Loại',
            dataIndex: 'templateTypeName',
            width: 180,
            render: (v: string) => <Tag color="blue">{v}</Tag>,
          },
          {
            title: 'ICD',
            width: 140,
            render: (_, r) => r.icdCode ? <Tag>{r.icdCode}</Tag> : null,
          },
          {
            title: 'Giới / Tuổi',
            width: 140,
            render: (_, r) => (
              <Space size={4} wrap>
                {r.gender === 1 && <Tag color="blue">Nam</Tag>}
                {r.gender === 2 && <Tag color="pink">Nữ</Tag>}
                {r.gender === 0 && <Tag>Tất cả</Tag>}
                {(r.minAgeYears != null || r.maxAgeYears != null) && (
                  <Tag>{r.minAgeYears ?? 0}-{r.maxAgeYears ?? 'Không giới hạn'} tuổi</Tag>
                )}
              </Space>
            ),
          },
          { title: 'Đã dùng', dataIndex: 'usageCount', width: 80, align: 'right' },
          {
            title: 'Hành động',
            width: 160,
            render: (_, r) => (
              <Space size="small">
                <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(r)}>Sửa</Button>
                <Popconfirm title="Xóa template?" onConfirm={() => handleDelete(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        title={editing ? 'Sửa template' : 'Thêm template mới'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={720}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Hủy</Button>
            <Button type="primary" onClick={handleSave}>Lưu</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="templateName" label="Tên template" rules={[{ required: true }]}>
            <Input placeholder="VD: Kết luận X-quang ngực bình thường" />
          </Form.Item>
          <Form.Item name="templateType" label="Loại" rules={[{ required: true }]}>
            <Select options={Object.entries(TEMPLATE_TYPE_LABELS).map(([k, v]) => ({ value: Number(k), label: v }))} />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="icdCode" label="Mã ICD-10" style={{ flex: 1 }}>
              <Input placeholder="VD: J18.9" maxLength={20} />
            </Form.Item>
            <Form.Item name="icdName" label="Tên chẩn đoán" style={{ flex: 2 }}>
              <Input placeholder="Viêm phổi không xác định" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="gender" label="Giới tính">
              <Select
                style={{ width: 140 }}
                options={[
                  { value: 0, label: 'Tất cả' },
                  { value: 1, label: 'Nam' },
                  { value: 2, label: 'Nữ' },
                ]}
              />
            </Form.Item>
            <Form.Item name="minAgeYears" label="Tuổi tối thiểu">
              <InputNumber min={0} max={120} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="maxAgeYears" label="Tuổi tối đa">
              <InputNumber min={0} max={120} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item name="content" label="Nội dung template" rules={[{ required: true }]} tooltip="Có thể dùng placeholder {{field}} — VD: {{patientName}}">
            <Input.TextArea rows={12} placeholder="Nội dung mẫu sẽ hiển thị/chèn vào kết luận, HSBA, PTTT..." />
          </Form.Item>
          <Form.Item name="isPublic" valuePropName="checked">
            <Checkbox>Công khai cho tất cả BS (nếu không tick = template cá nhân)</Checkbox>
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự sắp xếp">
            <InputNumber min={0} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
