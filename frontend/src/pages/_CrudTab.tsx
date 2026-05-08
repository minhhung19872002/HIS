/**
 * Reusable CRUD tab for NangCap22 master-catalog pages.
 * Used by PharmacyCatalogs, FinanceCatalogs, ParaclinicalCatalogs,
 * ClinicalCatalogs, ReportCatalogs.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Row,
  Col,
  Modal,
  Form,
  Switch,
  InputNumber,
  DatePicker,
  Popconfirm,
  Select,
  message,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as api from '../api/masterCatalog';

const { Title } = Typography;

export interface FieldDef<T> {
  key: keyof T & string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'date';
  required?: boolean;
  width?: number;
  render?: (value: unknown, row: T) => React.ReactNode;
  options?: { label: string; value: string | number }[];
  placeholder?: string;
  inForm?: boolean;
}

export interface CrudTabProps<T> {
  title: string;
  fields: FieldDef<T>[];
  searchable?: boolean;
  load: (keyword?: string) => Promise<T[]>;
  save: (dto: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<unknown>;
  defaults?: Partial<T>;
}

export function CrudTab<T extends { id: string }>({
  title,
  fields,
  searchable = true,
  load,
  save,
  remove,
  defaults = {},
}: CrudTabProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form] = Form.useForm();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await load(keyword || undefined);
      setData(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.warn(`load ${title} error:`, err);
      message.error(`Không tải được danh mục ${title.toLowerCase()}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [load, keyword, title]);

  useEffect(() => { reload(); }, [reload]);

  const onAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue(defaults);
    setOpen(true);
  };

  const onEdit = (row: T) => {
    setEditing(row);
    const v = { ...row } as Record<string, unknown>;
    fields.forEach((f) => {
      if (f.type === 'date' && v[f.key]) v[f.key] = dayjs(v[f.key] as string);
    });
    form.setFieldsValue(v);
    setOpen(true);
  };

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      Object.keys(values).forEach((k) => {
        if (values[k] && typeof values[k] === 'object' && 'toISOString' in values[k]) {
          values[k] = (values[k] as dayjs.Dayjs).toISOString();
        }
      });
      const payload = { ...defaults, ...values, id: editing?.id ?? undefined };
      await save(payload);
      message.success('Đã lưu');
      setOpen(false);
      reload();
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string; title?: string } } };
      const detail = apiError?.response?.data?.message || apiError?.response?.data?.title;
      if (detail) message.error(detail);
      else if (err && typeof err === 'object' && 'errorFields' in err) return;
      else { console.warn('save error:', err); message.error('Lưu không thành công'); }
    }
  };

  const onDelete = async (id: string) => {
    try {
      await remove(id);
      message.success('Đã xóa');
      reload();
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } } };
      message.error(apiError?.response?.data?.message || 'Không xóa được');
    }
  };

  const tableColumns: ColumnsType<T> = [
    ...fields.filter((f) => f.inForm !== false).map<ColumnsType<T>[number]>((f) => ({
      title: f.label,
      dataIndex: f.key,
      width: f.width,
      render: f.render
        ? (val: unknown, row: T) => f.render!(val, row)
        : f.type === 'switch'
          ? (val: unknown) => (val ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>)
          : f.type === 'date'
            ? (val: unknown) => (val ? dayjs(val as string).format('DD/MM/YYYY') : '-')
            : f.type === 'number'
              ? (val: unknown) => (typeof val === 'number' ? val.toLocaleString('vi-VN') : '-')
              : undefined,
    })),
    {
      title: '',
      key: 'actions',
      width: 110,
      fixed: 'right',
      render: (_: unknown, row: T) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(row)}>Sửa</Button>
          <Popconfirm title="Xóa bản ghi này?" onConfirm={() => onDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={title}
      extra={
        <Space>
          {searchable && (
            <Input.Search
              placeholder="Tìm kiếm..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={reload}
              allowClear
              style={{ width: 240 }}
              prefix={<SearchOutlined />}
            />
          )}
          <Button icon={<ReloadOutlined />} onClick={reload}>Làm mới</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>Thêm mới</Button>
        </Space>
      }
    >
      <Table<T>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={data}
        columns={tableColumns}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={`${editing ? 'Sửa' : 'Thêm'} ${title.toLowerCase()}`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSave}
        okText="Lưu"
        cancelText="Hủy"
        width={700}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          {fields.filter((f) => f.inForm !== false).map((f) => (
            <Form.Item
              key={f.key as string}
              name={f.key as string}
              label={f.label}
              rules={f.required ? [{ required: true, message: `${f.label} là bắt buộc` }] : undefined}
              valuePropName={f.type === 'switch' ? 'checked' : 'value'}
            >
              {f.type === 'textarea' ? (
                <Input.TextArea rows={3} placeholder={f.placeholder} />
              ) : f.type === 'number' ? (
                <InputNumber style={{ width: '100%' }} placeholder={f.placeholder} />
              ) : f.type === 'switch' ? (
                <Switch />
              ) : f.type === 'select' && f.options ? (
                <Select options={f.options} placeholder={f.placeholder} />
              ) : f.type === 'date' ? (
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              ) : (
                <Input placeholder={f.placeholder} />
              )}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Special — InspectionCommittee with nested members table
// ──────────────────────────────────────────────────────────────────────────
export const InspectionCommitteeTab: React.FC = () => {
  const [data, setData] = useState<api.InspectionCommitteeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<api.InspectionCommitteeDto | null>(null);
  const [form] = Form.useForm();
  const [members, setMembers] = useState<api.InspectionCommitteeMemberDto[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.getInspectionCommittees(keyword || undefined);
      setData(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.warn('load committees error:', err);
      message.error('Không tải được danh sách hội đồng');
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => { reload(); }, [reload]);

  const onAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true });
    setMembers([]);
    setOpen(true);
  };

  const onEdit = (row: api.InspectionCommitteeDto) => {
    setEditing(row);
    form.setFieldsValue({
      ...row,
      effectiveFrom: row.effectiveFrom ? dayjs(row.effectiveFrom) : undefined,
      effectiveTo: row.effectiveTo ? dayjs(row.effectiveTo) : undefined,
    });
    setMembers(row.members || []);
    setOpen(true);
  };

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      const payload: Partial<api.InspectionCommitteeDto> = {
        ...values,
        id: editing?.id ?? undefined,
        effectiveFrom: values.effectiveFrom?.toISOString?.(),
        effectiveTo: values.effectiveTo?.toISOString?.(),
        members,
      };
      await api.saveInspectionCommittee(payload);
      message.success('Đã lưu');
      setOpen(false);
      reload();
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      console.warn('save committee error:', err);
      message.error('Lưu không thành công');
    }
  };

  const addMember = () => {
    setMembers([...members, {
      id: `tmp-${Date.now()}`,
      committeeId: editing?.id || '',
      fullName: '',
      role: 'Ủy viên',
      sortOrder: members.length + 1,
    }]);
  };

  const updateMember = (idx: number, key: keyof api.InspectionCommitteeMemberDto, value: unknown) => {
    const next = [...members];
    (next[idx] as unknown as Record<string, unknown>)[key] = value;
    setMembers(next);
  };

  const removeMember = (idx: number) => setMembers(members.filter((_, i) => i !== idx));

  return (
    <Card
      title="Hội đồng kiểm nhập"
      extra={
        <Space>
          <Input.Search
            placeholder="Tìm kiếm..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={reload}
            allowClear
            style={{ width: 240 }}
          />
          <Button icon={<ReloadOutlined />} onClick={reload}>Làm mới</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>Thêm</Button>
        </Space>
      }
    >
      <Table<api.InspectionCommitteeDto>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={data}
        columns={[
          { title: 'Mã', dataIndex: 'code', width: 130 },
          { title: 'Tên hội đồng', dataIndex: 'name' },
          { title: 'Số thành viên', width: 130, render: (_, r) => r.members?.length ?? 0 },
          {
            title: 'Hiệu lực',
            width: 200,
            render: (_, r) =>
              [r.effectiveFrom, r.effectiveTo].map((d) => d ? dayjs(d).format('DD/MM/YYYY') : '–').join(' → '),
          },
          {
            title: 'Trạng thái',
            width: 110,
            dataIndex: 'isActive',
            render: (v) => v ? <Tag color="green">Hoạt động</Tag> : <Tag>Tạm dừng</Tag>,
          },
          {
            title: '',
            width: 120,
            fixed: 'right',
            render: (_, row) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(row)}>Sửa</Button>
                <Popconfirm
                  title="Xóa hội đồng?"
                  onConfirm={() => api.deleteInspectionCommittee(row.id).then(() => { message.success('Đã xóa'); reload(); })}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        pagination={{ pageSize: 20 }}
      />
      <Modal
        title={`${editing ? 'Sửa' : 'Thêm'} hội đồng kiểm nhập`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSave}
        okText="Lưu"
        cancelText="Hủy"
        width={900}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label="Mã" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Tên hội đồng" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={2} /></Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="effectiveFrom" label="Hiệu lực từ"><DatePicker style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="effectiveTo" label="Đến"><DatePicker style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isActive" label="Hoạt động" valuePropName="checked"><Switch /></Form.Item>
            </Col>
          </Row>

          <Title level={5} style={{ marginTop: 16 }}>Thành viên hội đồng</Title>
          <Button onClick={addMember} icon={<PlusOutlined />} size="small" style={{ marginBottom: 8 }}>
            Thêm thành viên
          </Button>
          <Table<api.InspectionCommitteeMemberDto>
            dataSource={members}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'STT', width: 60, render: (_, __, i) => i + 1 },
              {
                title: 'Họ tên',
                render: (_, r, i) => (
                  <Input value={r.fullName} onChange={(e) => updateMember(i, 'fullName', e.target.value)} />
                ),
              },
              {
                title: 'Chức danh',
                width: 180,
                render: (_, r, i) => (
                  <Input value={r.title} onChange={(e) => updateMember(i, 'title', e.target.value)} />
                ),
              },
              {
                title: 'Vai trò',
                width: 150,
                render: (_, r, i) => (
                  <Select
                    style={{ width: '100%' }}
                    value={r.role}
                    onChange={(v) => updateMember(i, 'role', v)}
                    options={[
                      { label: 'Chủ tịch', value: 'Chủ tịch' },
                      { label: 'Phó chủ tịch', value: 'Phó chủ tịch' },
                      { label: 'Thư ký', value: 'Thư ký' },
                      { label: 'Ủy viên', value: 'Ủy viên' },
                    ]}
                  />
                ),
              },
              {
                title: '',
                width: 50,
                render: (_, __, i) => (
                  <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeMember(i)} />
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </Card>
  );
};
