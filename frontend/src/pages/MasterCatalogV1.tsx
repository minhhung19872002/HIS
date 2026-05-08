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
  Typography,
  message,
  Tabs,
  Switch,
  InputNumber,
  DatePicker,
  Popconfirm,
  Select,
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

// ──────────────────────────────────────────────────────────────────────────
// Generic CRUD helper used by every tab
// ──────────────────────────────────────────────────────────────────────────
interface FieldDef<T> {
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

interface CrudTabProps<T> {
  title: string;
  fields: FieldDef<T>[];
  searchable?: boolean;
  load: (keyword?: string) => Promise<T[]>;
  save: (dto: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<unknown>;
  defaults?: Partial<T>;
}

function CrudTab<T extends { id: string }>({
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
      if (f.type === 'date' && v[f.key]) {
        v[f.key] = dayjs(v[f.key] as string);
      }
    });
    form.setFieldsValue(v);
    setOpen(true);
  };

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      // Convert dayjs back to ISO
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
      const detail = apiError?.response?.data?.message
        || apiError?.response?.data?.title;
      if (detail) message.error(detail);
      else if (err && typeof err === 'object' && 'errorFields' in err) {
        // antd validation
      } else {
        console.warn('save error:', err);
        message.error('Lưu không thành công');
      }
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

  // Build columns + an action column
  const tableColumns: ColumnsType<T> = [
    ...fields
      .filter((f) => f.inForm !== false)
      .map<ColumnsType<T>[number]>((f) => ({
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
              key={f.key}
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
// 13 tab definitions — one per NangCap22 catalog
// ──────────────────────────────────────────────────────────────────────────
const ManufacturerTab = () => (
  <CrudTab<api.ManufacturerDto>
    title="Hãng sản xuất"
    load={api.getManufacturers}
    save={api.saveManufacturer}
    remove={api.deleteManufacturer}
    defaults={{ sortOrder: 0, isActive: true }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 120 },
      { key: 'name', label: 'Tên hãng', required: true },
      { key: 'country', label: 'Quốc gia', width: 140 },
      { key: 'address', label: 'Địa chỉ', type: 'textarea' },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const MedicationRouteTab = () => (
  <CrudTab<api.MedicationRouteDto>
    title="Đường dùng thuốc"
    load={api.getMedicationRoutes}
    save={api.saveMedicationRoute}
    remove={api.deleteMedicationRoute}
    defaults={{ sortOrder: 0, isActive: true }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 100 },
      { key: 'name', label: 'Tên đường dùng', required: true },
      { key: 'bhxhCode', label: 'Mã BHXH (XML 4210)', width: 150 },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const AdditionalChargeTab = () => (
  <CrudTab<api.AdditionalChargeDto>
    title="Phụ thu"
    load={api.getAdditionalCharges}
    save={api.saveAdditionalCharge}
    remove={api.deleteAdditionalCharge}
    defaults={{ sortOrder: 0, isActive: true, price: 0 }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 120 },
      { key: 'name', label: 'Tên phụ thu', required: true },
      { key: 'price', label: 'Đơn giá (VND)', type: 'number', required: true, width: 130 },
      { key: 'unit', label: 'Đơn vị', width: 100 },
      { key: 'effectiveFrom', label: 'Áp dụng từ', type: 'date', width: 130 },
      { key: 'effectiveTo', label: 'Đến', type: 'date', width: 130 },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const OtherIncomeTab = () => (
  <CrudTab<api.OtherIncomeDto>
    title="Thu khác"
    load={api.getOtherIncomes}
    save={api.saveOtherIncome}
    remove={api.deleteOtherIncome}
    defaults={{ sortOrder: 0, isActive: true, price: 0 }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 120 },
      { key: 'name', label: 'Tên khoản thu', required: true },
      { key: 'price', label: 'Đơn giá (VND)', type: 'number', required: true, width: 130 },
      { key: 'unit', label: 'Đơn vị', width: 100 },
      { key: 'effectiveFrom', label: 'Áp dụng từ', type: 'date', width: 130 },
      { key: 'effectiveTo', label: 'Đến', type: 'date', width: 130 },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const TransportServiceTab = () => (
  <CrudTab<api.TransportServiceDto>
    title="Dịch vụ vận chuyển"
    load={api.getTransportServices}
    save={api.saveTransportService}
    remove={api.deleteTransportService}
    defaults={{ sortOrder: 0, isActive: true, calculationType: 1, unitPrice: 0 }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 120 },
      { key: 'name', label: 'Tên dịch vụ', required: true },
      {
        key: 'calculationType',
        label: 'Cách tính',
        type: 'select',
        required: true,
        width: 130,
        options: [{ label: 'Theo km', value: 1 }, { label: 'Theo lượt', value: 2 }],
        render: (v) => (v === 2 ? 'Theo lượt' : 'Theo km'),
      },
      { key: 'unitPrice', label: 'Đơn giá', type: 'number', required: true, width: 130 },
      { key: 'gasolineFactor', label: 'Hệ số xăng', type: 'number', width: 110 },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const GasolinePriceTab = () => (
  <CrudTab<api.GasolinePriceDto>
    title="Giá xăng dầu"
    load={(_kw) => api.getGasolinePrices()}
    save={api.saveGasolinePrice}
    remove={api.deleteGasolinePrice}
    searchable={false}
    defaults={{ pricePerLitre: 0, effectiveFrom: new Date().toISOString() }}
    fields={[
      {
        key: 'fuelType',
        label: 'Loại nhiên liệu',
        required: true,
        type: 'select',
        width: 180,
        options: [
          { label: 'RON 95-III', value: 'RON 95-III' },
          { label: 'E5 RON 92-II', value: 'E5 RON 92-II' },
          { label: 'Diesel 0.05S-II', value: 'Diesel 0.05S-II' },
          { label: 'Dầu hỏa', value: 'Dầu hỏa' },
        ],
      },
      { key: 'pricePerLitre', label: 'Giá/lít (VND)', type: 'number', required: true, width: 140 },
      { key: 'effectiveFrom', label: 'Hiệu lực từ', type: 'date', required: true, width: 140 },
      { key: 'issuedBy', label: 'Đơn vị ban hành' },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
    ]}
  />
);

const MachineCodeTab = () => (
  <CrudTab<api.MachineCodeDto>
    title="Mã máy CDHA / Xét nghiệm"
    load={api.getMachineCodes}
    save={api.saveMachineCode}
    remove={api.deleteMachineCode}
    defaults={{ isActive: true, isLocked: false }}
    fields={[
      { key: 'code', label: 'Mã máy', required: true, width: 120 },
      { key: 'name', label: 'Tên máy', required: true },
      { key: 'manufacturer', label: 'Hãng SX', width: 140 },
      { key: 'model', label: 'Model', width: 120 },
      { key: 'serialNumber', label: 'Serial', width: 120 },
      { key: 'bhxhCode', label: 'Mã BHXH', width: 110 },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'isLocked', label: 'Khóa', type: 'switch', width: 80 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const NursingCareLevelTab = () => (
  <CrudTab<api.NursingCareLevelDto>
    title="Chế độ chăm sóc"
    load={() => api.getNursingCareLevels()}
    save={api.saveNursingCareLevel}
    remove={api.deleteNursingCareLevel}
    searchable={false}
    defaults={{ sortOrder: 0, isActive: true, level: 1 }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 100 },
      { key: 'name', label: 'Tên chế độ', required: true },
      { key: 'level', label: 'Cấp', type: 'number', required: true, width: 80 },
      { key: 'description', label: 'Mô tả', type: 'textarea' },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const MedicalRecordTypeTab = () => (
  <CrudTab<api.MedicalRecordTypeDto>
    title="Loại bệnh án"
    load={() => api.getMedicalRecordTypes()}
    save={api.saveMedicalRecordType}
    remove={api.deleteMedicalRecordType}
    searchable={false}
    defaults={{ sortOrder: 0, isActive: true, isLocked: false, category: 1 }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 110 },
      { key: 'name', label: 'Tên loại BA', required: true },
      {
        key: 'category',
        label: 'Phân loại',
        type: 'select',
        required: true,
        width: 130,
        options: [
          { label: 'Ngoại trú', value: 1 },
          { label: 'Nội trú', value: 2 },
          { label: 'Cấp cứu', value: 3 },
          { label: 'Khám SK', value: 4 },
          { label: 'Khác', value: 5 },
        ],
        render: (v) => {
          const map: Record<number, string> = { 1: 'Ngoại trú', 2: 'Nội trú', 3: 'Cấp cứu', 4: 'Khám SK', 5: 'Khác' };
          return map[v as number] || '-';
        },
      },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isLocked', label: 'Khóa', type: 'switch', width: 80 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const ReportGroupTypeTab = () => (
  <CrudTab<api.ReportServiceGroupTypeDto>
    title="Loại nhóm dịch vụ báo cáo"
    load={() => api.getReportServiceGroupTypes()}
    save={api.saveReportServiceGroupType}
    remove={api.deleteReportServiceGroupType}
    searchable={false}
    defaults={{ sortOrder: 0, isActive: true }}
    fields={[
      { key: 'code', label: 'Mã', required: true, width: 130 },
      { key: 'name', label: 'Tên loại nhóm', required: true },
      { key: 'reportLabel', label: 'Nhãn báo cáo', width: 200 },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
      { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
      { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
    ]}
  />
);

const ReportGroupTab = () => {
  const [types, setTypes] = useState<api.ReportServiceGroupTypeDto[]>([]);
  useEffect(() => { api.getReportServiceGroupTypes().then(setTypes).catch(() => {}); }, []);
  return (
    <CrudTab<api.ReportServiceGroupDto>
      title="Nhóm dịch vụ báo cáo"
      load={(_kw) => api.getReportServiceGroups()}
      save={api.saveReportServiceGroup}
      remove={api.deleteReportServiceGroup}
      searchable={false}
      defaults={{ sortOrder: 0, isActive: true }}
      fields={[
        {
          key: 'groupTypeId',
          label: 'Loại nhóm',
          type: 'select',
          required: true,
          width: 220,
          options: types.map((t) => ({ label: t.name, value: t.id })),
          render: (_v, r) => r.groupTypeName || '-',
        },
        { key: 'code', label: 'Mã', required: true, width: 130 },
        { key: 'name', label: 'Tên nhóm', required: true },
        { key: 'note', label: 'Ghi chú', type: 'textarea' },
        { key: 'sortOrder', label: 'Thứ tự', type: 'number', width: 90 },
        { key: 'isActive', label: 'Hoạt động', type: 'switch', width: 100 },
      ]}
    />
  );
};

// ──────────────────────────────────────────────────────────────────────────
// Inspection Committee — special: nested members
// ──────────────────────────────────────────────────────────────────────────
const InspectionCommitteeTab = () => {
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

  const removeMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

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
                <Popconfirm title="Xóa hội đồng?" onConfirm={() => api.deleteInspectionCommittee(row.id).then(() => { message.success('Đã xóa'); reload(); })}>
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
          <Button onClick={addMember} icon={<PlusOutlined />} size="small" style={{ marginBottom: 8 }}>Thêm thành viên</Button>
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

// ──────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────
const MasterCatalogV1: React.FC = () => {
  return (
    <div style={{ padding: 16 }}>
      <Title level={3} style={{ marginBottom: 16 }}>Danh mục bổ sung (NangCap22)</Title>
      <Tabs
        type="card"
        defaultActiveKey="manufacturer"
        items={[
          { key: 'manufacturer', label: 'Hãng sản xuất', children: <ManufacturerTab /> },
          { key: 'route', label: 'Đường dùng', children: <MedicationRouteTab /> },
          { key: 'additional-charge', label: 'Phụ thu', children: <AdditionalChargeTab /> },
          { key: 'other-income', label: 'Thu khác', children: <OtherIncomeTab /> },
          { key: 'transport', label: 'Vận chuyển', children: <TransportServiceTab /> },
          { key: 'gasoline', label: 'Giá xăng', children: <GasolinePriceTab /> },
          { key: 'machine', label: 'Mã máy', children: <MachineCodeTab /> },
          { key: 'inspection', label: 'Hội đồng kiểm nhập', children: <InspectionCommitteeTab /> },
          { key: 'nursing', label: 'Chế độ chăm sóc', children: <NursingCareLevelTab /> },
          { key: 'mr-type', label: 'Loại bệnh án', children: <MedicalRecordTypeTab /> },
          { key: 'report-group-type', label: 'Loại nhóm BC', children: <ReportGroupTypeTab /> },
          { key: 'report-group', label: 'Nhóm BC', children: <ReportGroupTab /> },
        ]}
      />
    </div>
  );
};

export default MasterCatalogV1;
